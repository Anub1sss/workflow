"""
Сбор метрик Telegram-каналов через Telethon.

Метрики:
  - Активность: посты за 30 дней, частота, стабильность, возраст канала
  - Аудитория: подписчики, средние просмотры, видимость (%)
  - Вовлечённость: ER, ERR
  - Монетизация: рекламные посты, доля рекламы, упоминания брендов
  - Тематика: доля гемблинг-контента, основная ниша
  - Комьюнити: привязанный чат
  - Позиционирование: тип канала, характеристика контента

Использует несколько Telethon-сессий из sessions.json с ротацией
и задержками для защиты от блокировки аккаунтов.

Запуск:
    python enrich_telethon.py [--limit N] [--force]
"""

import argparse
import asyncio
import json
import logging
import os
import random
import re
import sqlite3
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path
from statistics import stdev

from dotenv import load_dotenv
from telethon import TelegramClient
from telethon.errors import (
    ChannelInvalidError,
    ChannelPrivateError,
    ChatAdminRequiredError,
    FloodWaitError,
    UsernameInvalidError,
    UsernameNotOccupiedError,
)
from telethon.tl.functions.channels import GetFullChannelRequest
from telethon.tl.types import Channel

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "ai_channels.db"
SESSIONS_DIR = BASE_DIR / "sessions"
SESSIONS_CONFIG = BASE_DIR / "sessions.json"

DELAY_MIN = 2.0
DELAY_MAX = 4.0
DELAY_BETWEEN_CHANNELS = 5.0
FLOOD_EXTRA_WAIT = 10
POSTS_LOOKBACK_DAYS = 30

GAMBLING_KEYWORDS = re.compile(
    r"казино|casino|слот|slot|ставк|bet[ts]?ing|1xbet|1win|pin-?up|mostbet|"
    r"melbet|fonbet|leon\s?bet|бонус.*фриспин|фриспин|jackpot|джекпот|"
    r"рулетк|букмекер|bookmaker|gambling|гемблинг|игровой автомат|"
    r"deposit|депозит.*бонус|промокод.*казино|выигр.*казино|crypto\s?casino",
    re.IGNORECASE,
)

AD_KEYWORDS = re.compile(
    r"реклам[аыу]|#ad\b|#реклама|#промо|#promo|партнёр|партнер|sponsored|"
    r"по вопросам рекламы|рекламное размещение|рекламная интеграция|"
    r"реклама/сотрудничество|рекламодател|размещение рекламы|"
    r"при поддержке|erid\s*:|erid:",
    re.IGNORECASE,
)

BRAND_PATTERN = re.compile(
    r"@\w{3,}|(?:https?://)?(?:t\.me|telegram\.me)/\w{3,}",
    re.IGNORECASE,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)


# ── Sessions ────────────────────────────────────────────────────────

API_ID = int(os.environ["TG_API_ID"])
API_HASH = os.environ["TG_API_HASH"]


def load_sessions() -> list[str]:
    if not SESSIONS_CONFIG.exists():
        raise FileNotFoundError(f"Sessions config not found: {SESSIONS_CONFIG}")
    with open(SESSIONS_CONFIG) as f:
        return json.load(f)


class SessionPool:
    """Round-robin pool of Telethon clients with per-session cooldowns."""

    def __init__(self):
        self.clients: list[TelegramClient] = []
        self._index = 0

    async def connect_all(self, session_names: list[str]):
        for name in session_names:
            session_path = SESSIONS_DIR / name
            client = TelegramClient(str(session_path), API_ID, API_HASH)
            await client.connect()
            if not await client.is_user_authorized():
                log.warning("Session %s is not authorized, skipping", name)
                await client.disconnect()
                continue
            me = await client.get_me()
            log.info("Session ready: %s (id=%d)", me.first_name, me.id)
            self.clients.append(client)
        if not self.clients:
            raise RuntimeError("No authorized sessions available")

    async def disconnect_all(self):
        for c in self.clients:
            await c.disconnect()

    def get_next(self) -> TelegramClient:
        client = self.clients[self._index % len(self.clients)]
        self._index += 1
        return client

    async def wait_cooldown(self):
        delay = random.uniform(DELAY_MIN, DELAY_MAX)
        await asyncio.sleep(delay)


# ── DB helpers ──────────────────────────────────────────────────────

NEW_COLUMNS = {
    "tg_participants": "INTEGER DEFAULT 0",
    "posts_30d": "INTEGER DEFAULT 0",
    "avg_views_30d": "REAL DEFAULT 0",
    "avg_reactions_30d": "REAL DEFAULT 0",
    "avg_comments_30d": "REAL DEFAULT 0",
    "avg_forwards_30d": "REAL DEFAULT 0",
    "publish_frequency": "REAL DEFAULT 0",
    "publish_stability": "REAL DEFAULT 0",
    "channel_age_days": "INTEGER DEFAULT 0",
    "visibility_pct": "REAL DEFAULT 0",
    "er_pct": "REAL DEFAULT 0",
    "err_pct": "REAL DEFAULT 0",
    "ad_posts_30d": "INTEGER DEFAULT 0",
    "ad_pct_30d": "REAL DEFAULT 0",
    "top_advertisers": "TEXT DEFAULT ''",
    "gambling_posts_30d": "INTEGER DEFAULT 0",
    "gambling_pct_30d": "REAL DEFAULT 0",
    "primary_niche": "TEXT DEFAULT ''",
    "has_linked_chat": "INTEGER DEFAULT 0",
    "linked_chat_id": "INTEGER DEFAULT 0",
    "channel_type_detected": "TEXT DEFAULT ''",
    "content_summary": "TEXT DEFAULT ''",
    "last_post_reactions": "INTEGER DEFAULT 0",
    "last_post_comments": "INTEGER DEFAULT 0",
    "last_post_forwards": "INTEGER DEFAULT 0",
    "last_post_has_photo": "INTEGER DEFAULT 0",
    "last_post_views_dev": "REAL DEFAULT 0",
    "last_post_reactions_dev": "REAL DEFAULT 0",
    "last_post_comments_dev": "REAL DEFAULT 0",
    "last_post_forwards_dev": "REAL DEFAULT 0",
    "telethon_updated": "TIMESTAMP DEFAULT NULL",
}


def ensure_columns(db: sqlite3.Connection):
    existing = {row[1] for row in db.execute("PRAGMA table_info(channels)").fetchall()}
    for col, typedef in NEW_COLUMNS.items():
        if col not in existing:
            db.execute(f"ALTER TABLE channels ADD COLUMN {col} {typedef}")
            log.info("Added column: %s", col)
    db.commit()


def ensure_posts_columns(db: sqlite3.Connection):
    existing = {row[1] for row in db.execute("PRAGMA table_info(posts)").fetchall()}
    extra = {
        "reactions": "INTEGER DEFAULT 0",
        "comments": "INTEGER DEFAULT 0",
        "is_ad": "INTEGER DEFAULT 0",
        "is_gambling": "INTEGER DEFAULT 0",
        "has_photo": "INTEGER DEFAULT 0",
        "views_dev": "REAL DEFAULT 0",
        "reactions_dev": "REAL DEFAULT 0",
        "comments_dev": "REAL DEFAULT 0",
        "forwards_dev": "REAL DEFAULT 0",
    }
    for col, typedef in extra.items():
        if col not in existing:
            db.execute(f"ALTER TABLE posts ADD COLUMN {col} {typedef}")
            log.info("Added posts column: %s", col)
    db.commit()


# ── Analysis ────────────────────────────────────────────────────────

def count_reactions(message) -> int:
    if not message.reactions or not message.reactions.results:
        return 0
    return sum(r.count for r in message.reactions.results)


def detect_ad(text: str) -> bool:
    if not text:
        return False
    return bool(AD_KEYWORDS.search(text))


def detect_gambling(text: str) -> bool:
    if not text:
        return False
    return bool(GAMBLING_KEYWORDS.search(text))


def extract_brands(text: str) -> list[str]:
    if not text:
        return []
    return BRAND_PATTERN.findall(text)


def compute_stability(daily_counts: list[int]) -> float:
    """0..100 stability score. 100 = perfectly even posting."""
    if len(daily_counts) < 2:
        return 100.0
    non_zero = [c for c in daily_counts if c > 0]
    if not non_zero:
        return 0.0
    mean = sum(daily_counts) / len(daily_counts)
    if mean == 0:
        return 0.0
    sd = stdev(daily_counts)
    cv = sd / mean
    return max(0.0, round(100.0 * (1 - min(cv, 1.0)), 1))


def detect_channel_type(
    posts_30d: int,
    avg_len: float,
    has_forwards_ratio: float,
    unique_sources: int,
) -> str:
    if has_forwards_ratio > 0.6 and unique_sources > 5:
        return "агрегатор"
    if has_forwards_ratio > 0.8:
        return "сетка"
    if posts_30d > 90 and avg_len < 300:
        return "новостной"
    return "авторский"


def summarize_content(top_words: list[tuple[str, int]]) -> str:
    if not top_words:
        return ""
    return ", ".join(w for w, _ in top_words[:10])


# ── Main collection ────────────────────────────────────────────────

async def collect_channel_metrics(
    client: TelegramClient,
    username: str,
) -> dict | None:
    try:
        entity = await client.get_entity(f"@{username}")
    except (
        UsernameInvalidError,
        UsernameNotOccupiedError,
        ChannelPrivateError,
        ChannelInvalidError,
        ValueError,
    ) as e:
        log.warning("@%s — cannot resolve: %s", username, e)
        return None

    if not isinstance(entity, Channel):
        log.warning("@%s — not a channel (type=%s)", username, type(entity).__name__)
        return None

    try:
        full = await client(GetFullChannelRequest(entity))
    except (ChatAdminRequiredError, ChannelPrivateError) as e:
        log.warning("@%s — cannot get full info: %s", username, e)
        return None

    full_chat = full.full_chat
    participants = full_chat.participants_count or 0
    has_linked = 1 if full_chat.linked_chat_id else 0
    linked_id = full_chat.linked_chat_id or 0

    channel_date = entity.date
    if channel_date:
        age_days = (datetime.now(timezone.utc) - channel_date).days
    else:
        age_days = 0

    cutoff = datetime.now(timezone.utc) - timedelta(days=POSTS_LOOKBACK_DAYS)

    messages = []
    try:
        async for msg in client.iter_messages(entity, limit=500, offset_date=None):
            if msg.date and msg.date < cutoff:
                break
            messages.append(msg)
    except FloodWaitError as e:
        log.warning("@%s — FloodWait %ds, waiting...", username, e.seconds)
        await asyncio.sleep(e.seconds + FLOOD_EXTRA_WAIT)
        return None

    EXTENDED_DAYS = 180
    if not messages:
        log.info("@%s — 0 posts in %dd, extending to %dd", username, POSTS_LOOKBACK_DAYS, EXTENDED_DAYS)
        cutoff_ext = datetime.now(timezone.utc) - timedelta(days=EXTENDED_DAYS)
        try:
            async for msg in client.iter_messages(entity, limit=500, offset_date=None):
                if msg.date and msg.date < cutoff_ext:
                    break
                messages.append(msg)
        except FloodWaitError as e:
            log.warning("@%s — FloodWait %ds on extended search", username, e.seconds)
            await asyncio.sleep(e.seconds + FLOOD_EXTRA_WAIT)
            return None
        if messages:
            log.info("@%s — found %d posts in extended %dd window", username, len(messages), EXTENDED_DAYS)

    posts_30d = len(messages)

    total_views = 0
    total_reactions = 0
    total_comments = 0
    total_forwards = 0
    ad_posts = 0
    gambling_posts = 0
    text_lengths = []
    all_brands: list[str] = []
    daily_counts: dict[str, int] = {}
    word_counter: Counter = Counter()
    forwarded_count = 0
    forward_sources: set[str] = set()

    for msg in messages:
        text = msg.message or ""
        views = msg.views or 0
        reactions = count_reactions(msg)
        comments = 0
        if msg.replies:
            comments = msg.replies.replies or 0
        fwd = msg.forwards or 0

        total_views += views
        total_reactions += reactions
        total_comments += comments
        total_forwards += fwd

        is_ad = detect_ad(text)
        is_gambling = detect_gambling(text)
        if is_ad:
            ad_posts += 1
            brands = extract_brands(text)
            all_brands.extend(brands)
        if is_gambling:
            gambling_posts += 1

        if text:
            text_lengths.append(len(text))
            words = re.findall(r"[а-яёa-z]{4,}", text.lower())
            word_counter.update(words)

        if msg.fwd_from:
            forwarded_count += 1
            if msg.fwd_from.from_name:
                forward_sources.add(msg.fwd_from.from_name)

        day_key = msg.date.strftime("%Y-%m-%d") if msg.date else "unknown"
        daily_counts[day_key] = daily_counts.get(day_key, 0) + 1

    avg_views = total_views / posts_30d if posts_30d else 0
    avg_reactions = total_reactions / posts_30d if posts_30d else 0
    avg_comments = total_comments / posts_30d if posts_30d else 0
    avg_forwards = total_forwards / posts_30d if posts_30d else 0
    avg_len = sum(text_lengths) / len(text_lengths) if text_lengths else 0

    frequency = round(posts_30d / POSTS_LOOKBACK_DAYS, 2) if posts_30d else 0

    all_days = []
    for d in range(POSTS_LOOKBACK_DAYS):
        day = (datetime.now(timezone.utc) - timedelta(days=d)).strftime("%Y-%m-%d")
        all_days.append(daily_counts.get(day, 0))
    stability = compute_stability(all_days)

    visibility = round((avg_views / participants) * 100, 2) if participants else 0
    er = round(((avg_reactions + avg_comments) / participants) * 100, 4) if participants else 0
    err = round(((avg_reactions + avg_comments) / avg_views) * 100, 4) if avg_views else 0

    ad_pct = round((ad_posts / posts_30d) * 100, 1) if posts_30d else 0
    gambling_pct = round((gambling_posts / posts_30d) * 100, 1) if posts_30d else 0

    brand_counter = Counter(all_brands)
    top_advertisers = ", ".join(b for b, _ in brand_counter.most_common(10)) if brand_counter else ""

    fwd_ratio = forwarded_count / posts_30d if posts_30d else 0
    ch_type = detect_channel_type(posts_30d, avg_len, fwd_ratio, len(forward_sources))

    stop_words = {
        "это", "для", "что", "как", "при", "или", "если", "более", "всех", "будет",
        "также", "можно", "через", "после", "свой", "этот", "того", "быть", "было",
        "есть", "были", "была", "один", "даже", "себя", "наши", "очень", "этом",
        "нашей", "нашего", "каждый", "другой", "только", "может", "этой",
        "the", "and", "for", "with", "that", "this", "from", "your", "have", "are",
        "not", "but", "will", "can", "all", "about", "more", "has",
    }
    filtered_words = [(w, c) for w, c in word_counter.most_common(30) if w not in stop_words]
    content_keywords = summarize_content(filtered_words)

    primary_niche = "AI"
    if gambling_pct > 50:
        primary_niche = "Gambling"
    elif filtered_words:
        primary_niche = f"AI / {filtered_words[0][0]}" if filtered_words else "AI"

    last_post_text = ""
    last_post_date = 0
    last_post_views = 0
    last_post_link = ""
    last_post_reactions = 0
    last_post_comments = 0
    last_post_forwards = 0
    last_post_has_photo = 0
    lp_views_dev = 0.0
    lp_reactions_dev = 0.0
    lp_comments_dev = 0.0
    lp_forwards_dev = 0.0

    if messages:
        lp = messages[0]
        lp_text = (lp.message or "").strip()
        if not lp_text:
            for candidate in messages[1:]:
                candidate_text = (candidate.message or "").strip()
                if candidate_text:
                    lp_text = candidate_text
                    log.info("@%s — last post has no text, took text from post #%d", username, candidate.id)
                    break
        last_post_text = lp_text[:2000]
        last_post_date = int(lp.date.timestamp()) if lp.date else 0
        last_post_views = lp.views or 0
        last_post_reactions = count_reactions(lp)
        last_post_comments = lp.replies.replies if lp.replies else 0
        last_post_forwards = lp.forwards or 0
        last_post_has_photo = 1 if lp.photo else 0
        last_post_link = f"https://t.me/{username}/{lp.id}"

        def deviation(val, avg):
            if not avg:
                return 0.0
            return round(((val - avg) / avg) * 100, 1)

        lp_views_dev = deviation(last_post_views, avg_views)
        lp_reactions_dev = deviation(last_post_reactions, avg_reactions)
        lp_comments_dev = deviation(last_post_comments or 0, avg_comments)
        lp_forwards_dev = deviation(last_post_forwards, avg_forwards)

    return {
        "tg_participants": participants,
        "posts_30d": posts_30d,
        "avg_views_30d": round(avg_views, 1),
        "avg_reactions_30d": round(avg_reactions, 2),
        "avg_comments_30d": round(avg_comments, 2),
        "avg_forwards_30d": round(avg_forwards, 2),
        "publish_frequency": frequency,
        "publish_stability": stability,
        "channel_age_days": age_days,
        "visibility_pct": visibility,
        "er_pct": er,
        "err_pct": err,
        "ad_posts_30d": ad_posts,
        "ad_pct_30d": ad_pct,
        "top_advertisers": top_advertisers,
        "gambling_posts_30d": gambling_posts,
        "gambling_pct_30d": gambling_pct,
        "primary_niche": primary_niche,
        "has_linked_chat": has_linked,
        "linked_chat_id": linked_id,
        "channel_type_detected": ch_type,
        "content_summary": content_keywords,
        "last_post_text": last_post_text,
        "last_post_date": last_post_date,
        "last_post_views": last_post_views,
        "last_post_reactions": last_post_reactions,
        "last_post_comments": last_post_comments or 0,
        "last_post_forwards": last_post_forwards,
        "last_post_has_photo": last_post_has_photo,
        "last_post_views_dev": lp_views_dev,
        "last_post_reactions_dev": lp_reactions_dev,
        "last_post_comments_dev": lp_comments_dev,
        "last_post_forwards_dev": lp_forwards_dev,
        "last_post_link": last_post_link,
        "_messages": messages,
    }


def save_channel_metrics(db: sqlite3.Connection, username: str, metrics: dict):
    cols_to_save = {k: v for k, v in metrics.items() if not k.startswith("_")}
    cols_to_save["telethon_updated"] = datetime.now(timezone.utc).isoformat()

    set_clause = ", ".join(f"{col} = ?" for col in cols_to_save)
    values = list(cols_to_save.values()) + [username]
    db.execute(
        f"UPDATE channels SET {set_clause} WHERE username = ?",
        values,
    )
    db.commit()


def save_posts(db: sqlite3.Connection, username: str, messages: list):
    if not messages:
        return
    all_views = [m.views or 0 for m in messages]
    all_reactions = [count_reactions(m) for m in messages]
    all_comments = [(m.replies.replies if m.replies else 0) or 0 for m in messages]
    all_forwards = [m.forwards or 0 for m in messages]
    n = len(messages)
    avg_v = sum(all_views) / n if n else 0
    avg_r = sum(all_reactions) / n if n else 0
    avg_c = sum(all_comments) / n if n else 0
    avg_f = sum(all_forwards) / n if n else 0

    def dev(val, avg):
        if not avg:
            return 0.0
        return round(((val - avg) / avg) * 100, 1)

    for i, msg in enumerate(messages):
        text = msg.message or ""
        views = all_views[i]
        reactions = all_reactions[i]
        comments = all_comments[i]
        fwd = all_forwards[i]
        is_ad = 1 if detect_ad(text) else 0
        is_gambling = 1 if detect_gambling(text) else 0
        has_photo = 1 if msg.photo else 0
        date = msg.date.isoformat() if msg.date else None

        db.execute("""
            INSERT OR REPLACE INTO posts
                (channel_username, tg_message_id, text, date, views, forwards,
                 reactions, comments, is_ad, is_gambling, has_photo,
                 views_dev, reactions_dev, comments_dev, forwards_dev)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            username, msg.id, text[:4000], date, views, fwd,
            reactions, comments, is_ad, is_gambling, has_photo,
            dev(views, avg_v), dev(reactions, avg_r),
            dev(comments, avg_c), dev(fwd, avg_f),
        ))
    db.commit()


# ── Main ────────────────────────────────────────────────────────────

async def main(limit: int | None = None, force: bool = False, missing_posts: bool = False):
    session_names = load_sessions()
    log.info("Loaded %d session(s)", len(session_names))

    pool = SessionPool()
    await pool.connect_all(session_names)
    log.info("Connected %d client(s)", len(pool.clients))

    db = sqlite3.connect(str(DB_PATH))
    db.row_factory = sqlite3.Row
    ensure_columns(db)
    ensure_posts_columns(db)

    if missing_posts:
        query = """
            SELECT c.username FROM channels c
            LEFT JOIN posts p ON p.channel_username = c.username
            WHERE p.id IS NULL
            ORDER BY c.subscribers DESC
        """
    elif force:
        query = "SELECT username FROM channels ORDER BY subscribers DESC"
    else:
        query = "SELECT username FROM channels WHERE telethon_updated IS NULL ORDER BY subscribers DESC"

    if limit:
        query += f" LIMIT {limit}"

    rows = db.execute(query).fetchall()
    total = len(rows)
    log.info("Channels to process: %d", total)

    success = 0
    errors = 0

    for i, row in enumerate(rows, 1):
        username = row["username"]
        log.info("[%d/%d] @%s ...", i, total, username)

        client = pool.get_next()

        try:
            metrics = await collect_channel_metrics(client, username)
        except FloodWaitError as e:
            log.error("FloodWait %ds on @%s — pausing all", e.seconds, username)
            await asyncio.sleep(e.seconds + FLOOD_EXTRA_WAIT)
            metrics = None
        except Exception as e:
            log.error("@%s — unexpected error: %s", username, e)
            metrics = None

        if metrics:
            msgs = metrics.pop("_messages", [])
            save_channel_metrics(db, username, metrics)
            save_posts(db, username, msgs)
            success += 1
            log.info(
                "  OK: %d posts, %d subs, ER=%.3f%%, vis=%.1f%%",
                metrics["posts_30d"],
                metrics["tg_participants"],
                metrics["er_pct"],
                metrics["visibility_pct"],
            )
        else:
            db.execute(
                "UPDATE channels SET telethon_updated = ? WHERE username = ?",
                (datetime.now(timezone.utc).isoformat(), username),
            )
            db.commit()
            errors += 1

        delay = random.uniform(DELAY_BETWEEN_CHANNELS, DELAY_BETWEEN_CHANNELS + 3)
        await asyncio.sleep(delay)

    db.close()
    await pool.disconnect_all()
    log.info("Done! Success: %d, Errors: %d, Total: %d", success, errors, total)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Enrich TG channels via Telethon")
    parser.add_argument("--limit", type=int, default=None, help="Max channels to process")
    parser.add_argument("--force", action="store_true", help="Re-process already enriched channels")
    parser.add_argument("--missing-posts", action="store_true", help="Only process channels that have no posts in DB")
    args = parser.parse_args()

    asyncio.run(main(limit=args.limit, force=args.force, missing_posts=args.missing_posts))
