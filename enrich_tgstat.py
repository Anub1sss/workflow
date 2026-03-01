"""Enrich channels DB with TGStat API data: channel info + last post."""

import os
import re
import html
import time
import sqlite3
import urllib.request
import urllib.parse
import json
from dotenv import load_dotenv

load_dotenv()

DB_PATH = os.path.join(os.path.dirname(__file__), "ai_channels.db")
TOKEN = os.getenv("TGSTAT_TOKEN", "")
BASE = "https://api.tgstat.ru"
DELAY = 2.5  # seconds between requests to respect rate limits


def api_get(method, params=None):
    params = params or {}
    params["token"] = TOKEN
    qs = urllib.parse.urlencode(params)
    url = f"{BASE}/{method}?{qs}"
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode())
            if data.get("status") == "ok":
                return data.get("response")
            print(f"  API error: {data}")
            return None
    except Exception as e:
        print(f"  Request failed: {e}")
        return None


def ensure_columns(db):
    existing = {row[1] for row in db.execute("PRAGMA table_info(channels)").fetchall()}
    new_cols = {
        "tgstat_id": "INTEGER DEFAULT 0",
        "image100": "TEXT DEFAULT ''",
        "image640": "TEXT DEFAULT ''",
        "category_tgstat": "TEXT DEFAULT ''",
        "country": "TEXT DEFAULT ''",
        "language": "TEXT DEFAULT ''",
        "about": "TEXT DEFAULT ''",
        "ci_index": "REAL DEFAULT 0",
        "last_post_text": "TEXT DEFAULT ''",
        "last_post_date": "INTEGER DEFAULT 0",
        "last_post_views": "INTEGER DEFAULT 0",
        "last_post_link": "TEXT DEFAULT ''",
        "tgstat_updated": "TIMESTAMP DEFAULT NULL",
    }
    for col, typedef in new_cols.items():
        if col not in existing:
            db.execute(f"ALTER TABLE channels ADD COLUMN {col} {typedef}")
            print(f"  Added column: {col}")
    db.commit()


def enrich_channel(db, username):
    info = api_get("channels/get", {"channelId": f"@{username}"})
    if not info:
        return False

    img100 = info.get("image100", "") or ""
    img640 = info.get("image640", "") or ""
    if img100 and not img100.startswith("http"):
        img100 = "https:" + img100
    if img640 and not img640.startswith("http"):
        img640 = "https:" + img640

    db.execute("""
        UPDATE channels SET
            tgstat_id = ?,
            title = CASE WHEN title = '' OR title IS NULL THEN ? ELSE title END,
            description = CASE WHEN description = '' OR description IS NULL THEN ? ELSE description END,
            image100 = ?,
            image640 = ?,
            category_tgstat = ?,
            country = ?,
            language = ?,
            about = ?,
            subscribers = ?,
            ci_index = ?
        WHERE username = ?
    """, (
        info.get("id", 0),
        info.get("title", ""),
        info.get("about", ""),
        img100,
        img640,
        info.get("category", ""),
        info.get("country", ""),
        info.get("language", ""),
        info.get("about", ""),
        info.get("participants_count", 0),
        info.get("ci_index", 0),
        username,
    ))

    time.sleep(DELAY)

    posts = api_get("channels/posts", {"channelId": f"@{username}", "limit": 1})
    if posts and posts.get("items"):
        post = posts["items"][0]
        raw_text = post.get("text") or ""
        clean_text = re.sub(r"<br\s*/?>", "\n", raw_text)
        clean_text = re.sub(r"<[^>]+>", "", clean_text)
        clean_text = html.unescape(clean_text)
        clean_text = re.sub(r"\n{3,}", "\n\n", clean_text).strip()
        db.execute("""
            UPDATE channels SET
                last_post_text = ?,
                last_post_date = ?,
                last_post_views = ?,
                last_post_link = ?,
                tgstat_updated = CURRENT_TIMESTAMP
            WHERE username = ?
        """, (
            clean_text[:2000],
            post.get("date", 0),
            post.get("views", 0),
            post.get("link", ""),
            username,
        ))
    else:
        db.execute(
            "UPDATE channels SET tgstat_updated = CURRENT_TIMESTAMP WHERE username = ?",
            (username,),
        )

    db.commit()
    return True


def main():
    if not TOKEN:
        print("Error: TGSTAT_TOKEN not set in .env")
        return

    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    ensure_columns(db)

    rows = db.execute(
        "SELECT username FROM channels WHERE tgstat_updated IS NULL ORDER BY subscribers DESC"
    ).fetchall()
    total = len(rows)
    print(f"Channels to enrich: {total}")

    for i, row in enumerate(rows, 1):
        uname = row["username"]
        print(f"[{i}/{total}] @{uname} ...", end=" ", flush=True)
        ok = enrich_channel(db, uname)
        print("OK" if ok else "SKIP")
        time.sleep(DELAY)

    db.close()
    print("Done!")


if __name__ == "__main__":
    main()
