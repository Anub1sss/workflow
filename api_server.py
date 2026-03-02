"""REST API server for Telegram AI channels database."""

import os
import sqlite3
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

FRONTEND_BUILD = os.path.join(os.path.dirname(__file__), "frontend", "build")

app = Flask(__name__, static_folder=FRONTEND_BUILD, static_url_path="")
CORS(app)

DB_PATH = os.path.join(os.path.dirname(__file__), "ai_channels.db")

DEFAULT_CATEGORIES = [
    ("Кейс применения", "briefcase", "#22c55e"),
    ("Научная публикация", "flask-conical", "#3b82f6"),
    ("Обзор инструмента", "wrench", "#f59e0b"),
    ("Туториал / Гайд", "book-open", "#8b5cf6"),
    ("Новость индустрии", "zap", "#ef4444"),
    ("Промпт-инжиниринг", "terminal", "#06b6d4"),
    ("Датасеты и бенчмарки", "bar-chart-3", "#ec4899"),
    ("Мнение / Аналитика", "message-circle", "#f97316"),
    ("Open Source", "github", "#a855f7"),
    ("Вакансии и карьера", "user-check", "#14b8a6"),
]


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    db = get_db()
    db.executescript("""
        CREATE TABLE IF NOT EXISTS posts (
            id                INTEGER PRIMARY KEY AUTOINCREMENT,
            channel_username  TEXT NOT NULL,
            tg_message_id     INTEGER,
            text              TEXT DEFAULT '',
            date              TIMESTAMP,
            views             INTEGER DEFAULT 0,
            forwards          INTEGER DEFAULT 0,
            category          TEXT DEFAULT '',
            tags              TEXT DEFAULT '',
            created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(channel_username, tg_message_id)
        );

        CREATE TABLE IF NOT EXISTS categories (
            id    INTEGER PRIMARY KEY AUTOINCREMENT,
            name  TEXT UNIQUE NOT NULL,
            icon  TEXT DEFAULT '',
            color TEXT DEFAULT ''
        );

        CREATE INDEX IF NOT EXISTS idx_posts_channel ON posts(channel_username);
        CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
        CREATE INDEX IF NOT EXISTS idx_posts_date ON posts(date DESC);
    """)
    for name, icon, color in DEFAULT_CATEGORIES:
        db.execute(
            "INSERT OR IGNORE INTO categories (name, icon, color) VALUES (?, ?, ?)",
            (name, icon, color),
        )
    db.commit()
    db.close()


init_db()


# ── Helpers ──────────────────────────────────────────────────────────

NUMERIC_FILTERS = {
    "min_subs": ("subscribers", ">="),
    "max_subs": ("subscribers", "<="),
    "min_views": ("avg_views_30d", ">="),
    "max_views": ("avg_views_30d", "<="),
    "min_er": ("er_pct", ">="),
    "max_er": ("er_pct", "<="),
    "min_err": ("err_pct", ">="),
    "max_err": ("err_pct", "<="),
    "min_visibility": ("visibility_pct", ">="),
    "max_visibility": ("visibility_pct", "<="),
    "min_posts": ("posts_30d", ">="),
    "max_posts": ("posts_30d", "<="),
    "min_frequency": ("publish_frequency", ">="),
    "max_frequency": ("publish_frequency", "<="),
    "min_stability": ("publish_stability", ">="),
    "max_stability": ("publish_stability", "<="),
    "min_age": ("channel_age_days", ">="),
    "max_age": ("channel_age_days", "<="),
    "min_ad_pct": ("ad_pct_30d", ">="),
    "max_ad_pct": ("ad_pct_30d", "<="),
    "min_gambling_pct": ("gambling_pct_30d", ">="),
    "max_gambling_pct": ("gambling_pct_30d", "<="),
    "min_reactions": ("avg_reactions_30d", ">="),
    "max_reactions": ("avg_reactions_30d", "<="),
    "min_comments": ("avg_comments_30d", ">="),
    "max_comments": ("avg_comments_30d", "<="),
    "min_forwards": ("avg_forwards_30d", ">="),
    "max_forwards": ("avg_forwards_30d", "<="),
    "min_lp_views_dev": ("last_post_views_dev", ">="),
    "max_lp_views_dev": ("last_post_views_dev", "<="),
    "min_lp_reactions_dev": ("last_post_reactions_dev", ">="),
    "max_lp_reactions_dev": ("last_post_reactions_dev", "<="),
    "min_lp_comments_dev": ("last_post_comments_dev", ">="),
    "max_lp_comments_dev": ("last_post_comments_dev", "<="),
    "min_lp_forwards_dev": ("last_post_forwards_dev", ">="),
    "max_lp_forwards_dev": ("last_post_forwards_dev", "<="),
}


def _channel_conditions(args):
    conditions, params = [], []
    search = args.get("search", "").strip()
    channel_type = args.get("type", "").strip()
    tag = args.get("tag", "").strip()
    hide_gambling = args.get("hide_gambling", "").strip()
    has_chat = args.get("has_chat", "").strip()

    if search:
        conditions.append(
            "(username LIKE ? OR title LIKE ? OR description LIKE ? OR characteristics LIKE ?)"
        )
        like = f"%{search}%"
        params.extend([like, like, like, like])
    if channel_type:
        conditions.append("channel_type = ?")
        params.append(channel_type)
    if tag:
        conditions.append("characteristics LIKE ?")
        params.append(f"%{tag}%")
    if hide_gambling == "1":
        conditions.append("(gambling_pct_30d = 0 OR gambling_pct_30d IS NULL)")
        conditions.append("(ad_pct_30d = 0 OR ad_pct_30d IS NULL)")
    if has_chat == "1":
        conditions.append("has_linked_chat = 1")

    usernames = args.get("usernames", "").strip()
    if usernames:
        u_list = [u.strip() for u in usernames.split(",") if u.strip()]
        if u_list:
            placeholders = ",".join("?" * len(u_list))
            conditions.append(f"username IN ({placeholders})")
            params.extend(u_list)

    for param_name, (col, op) in NUMERIC_FILTERS.items():
        val = args.get(param_name, "").strip()
        if val:
            try:
                num = float(val)
                conditions.append(f"{col} {op} ?")
                params.append(num)
            except ValueError:
                pass

    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    return where, params


# ── Channels ─────────────────────────────────────────────────────────

@app.route("/api/channels")
def list_channels():
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 24, type=int), 100)
    sort = request.args.get("sort", "subscribers")
    order = request.args.get("order", "desc").lower()

    allowed_sorts = {
        "subscribers", "avg_views", "score", "ai_confidence", "posts_30d",
        "created_at", "title", "username", "ci_index", "last_post_date",
        "tg_participants", "avg_views_30d", "avg_reactions_30d", "avg_comments_30d",
        "avg_forwards_30d", "publish_frequency", "publish_stability", "channel_age_days",
        "visibility_pct", "er_pct", "err_pct", "ad_pct_30d", "gambling_pct_30d",
        "last_post_views_dev", "last_post_reactions_dev",
        "last_post_comments_dev", "last_post_forwards_dev",
    }
    if sort not in allowed_sorts:
        sort = "subscribers"
    if order not in ("asc", "desc"):
        order = "desc"

    where, params = _channel_conditions(request.args)
    db = get_db()
    total = db.execute(f"SELECT COUNT(*) FROM channels {where}", params).fetchone()[0]
    offset = (page - 1) * per_page
    rows = db.execute(
        f"SELECT * FROM channels {where} ORDER BY {sort} {order} LIMIT ? OFFSET ?",
        params + [per_page, offset],
    ).fetchall()
    db.close()

    return jsonify({
        "channels": [dict(r) for r in rows],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page,
    })


@app.route("/api/channels/<username>")
def get_channel(username):
    db = get_db()
    row = db.execute("SELECT * FROM channels WHERE username = ?", (username,)).fetchone()
    db.close()
    if not row:
        return jsonify({"error": "Channel not found"}), 404
    return jsonify(dict(row))


@app.route("/api/channels/list")
def channels_list():
    db = get_db()
    rows = db.execute(
        "SELECT username, title FROM channels ORDER BY subscribers DESC"
    ).fetchall()
    db.close()
    return jsonify([{"username": r["username"], "title": r["title"]} for r in rows])


# ── Stats ────────────────────────────────────────────────────────────

@app.route("/api/stats")
def get_stats():
    where, params = _channel_conditions(request.args)
    db = get_db()

    total = db.execute(f"SELECT COUNT(*) FROM channels {where}", params).fetchone()[0]
    types = db.execute(
        f"SELECT channel_type, COUNT(*) as cnt FROM channels {where} GROUP BY channel_type ORDER BY cnt DESC",
        params,
    ).fetchall()
    top_by_subs = db.execute(
        f"SELECT username, title, subscribers, avg_views FROM channels {where} ORDER BY subscribers DESC",
        params,
    ).fetchall()
    top_by_views = db.execute(
        f"SELECT username, title, subscribers, avg_views FROM channels {where} ORDER BY avg_views DESC",
        params,
    ).fetchall()
    avg_subs = db.execute(f"SELECT AVG(subscribers) FROM channels {where}", params).fetchone()[0] or 0
    avg_views = db.execute(f"SELECT AVG(avg_views) FROM channels {where}", params).fetchone()[0] or 0

    engagement = db.execute(f"""
        SELECT
            AVG(er_pct) as avg_er,
            AVG(err_pct) as avg_err,
            AVG(visibility_pct) as avg_visibility,
            AVG(publish_frequency) as avg_frequency,
            AVG(publish_stability) as avg_stability,
            AVG(ad_pct_30d) as avg_ad_pct,
            AVG(gambling_pct_30d) as avg_gambling_pct,
            SUM(CASE WHEN has_linked_chat = 1 THEN 1 ELSE 0 END) as with_chat,
            AVG(channel_age_days) as avg_age
        FROM channels {where}
    """, params).fetchone()

    er_where = f"{where} AND er_pct > 0" if where else "WHERE er_pct > 0"
    top_by_er = db.execute(
        f"SELECT username, title, subscribers, er_pct, err_pct, avg_views_30d FROM channels {er_where} ORDER BY er_pct DESC LIMIT 20",
        params,
    ).fetchall()

    db.close()

    return jsonify({
        "total_channels": total,
        "avg_subscribers": round(avg_subs),
        "avg_views": round(avg_views),
        "avg_er": round(engagement["avg_er"] or 0, 3),
        "avg_err": round(engagement["avg_err"] or 0, 3),
        "avg_visibility": round(engagement["avg_visibility"] or 0, 1),
        "avg_frequency": round(engagement["avg_frequency"] or 0, 2),
        "avg_stability": round(engagement["avg_stability"] or 0, 1),
        "avg_ad_pct": round(engagement["avg_ad_pct"] or 0, 1),
        "avg_gambling_pct": round(engagement["avg_gambling_pct"] or 0, 1),
        "channels_with_chat": engagement["with_chat"] or 0,
        "avg_channel_age_days": round(engagement["avg_age"] or 0),
        "types": [{"type": r["channel_type"] or "не указан", "count": r["cnt"]} for r in types],
        "top_by_subscribers": [dict(r) for r in top_by_subs],
        "top_by_views": [dict(r) for r in top_by_views],
        "top_by_er": [dict(r) for r in top_by_er],
    })


# ── Tags ─────────────────────────────────────────────────────────────

@app.route("/api/tags")
def list_tags():
    db = get_db()
    rows = db.execute("SELECT characteristics FROM channels WHERE characteristics != ''").fetchall()
    db.close()
    tag_counts = {}
    for r in rows:
        for t in r["characteristics"].split():
            t = t.strip()
            if t and len(t) > 1:
                tag_counts[t] = tag_counts.get(t, 0) + 1
    sorted_tags = sorted(tag_counts.items(), key=lambda x: -x[1])
    return jsonify([{"tag": t, "count": c} for t, c in sorted_tags[:50]])


# ── Categories ───────────────────────────────────────────────────────

@app.route("/api/categories")
def list_categories():
    db = get_db()
    cats = db.execute("SELECT * FROM categories ORDER BY id").fetchall()
    counts = db.execute(
        "SELECT category, COUNT(*) as cnt FROM posts WHERE category != '' GROUP BY category"
    ).fetchall()
    db.close()

    count_map = {r["category"]: r["cnt"] for r in counts}
    return jsonify([
        {**dict(c), "posts_count": count_map.get(c["name"], 0)}
        for c in cats
    ])


# ── Posts ────────────────────────────────────────────────────────────

POST_NUMERIC_FILTERS = {
    "min_p_views": ("p.views", ">="),
    "max_p_views": ("p.views", "<="),
    "min_p_reactions": ("p.reactions", ">="),
    "max_p_reactions": ("p.reactions", "<="),
    "min_p_comments": ("p.comments", ">="),
    "max_p_comments": ("p.comments", "<="),
    "min_p_forwards": ("p.forwards", ">="),
    "max_p_forwards": ("p.forwards", "<="),
    "min_p_views_dev": ("p.views_dev", ">="),
    "max_p_views_dev": ("p.views_dev", "<="),
    "min_p_reactions_dev": ("p.reactions_dev", ">="),
    "max_p_reactions_dev": ("p.reactions_dev", "<="),
    "min_p_comments_dev": ("p.comments_dev", ">="),
    "max_p_comments_dev": ("p.comments_dev", "<="),
    "min_p_forwards_dev": ("p.forwards_dev", ">="),
    "max_p_forwards_dev": ("p.forwards_dev", "<="),
}


@app.route("/api/posts")
def list_posts():
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)
    sort = request.args.get("sort", "date")
    order = request.args.get("order", "desc").lower()
    search = request.args.get("search", "").strip()
    category = request.args.get("category", "").strip()
    channels_param = request.args.get("channels", "").strip()
    hide_gambling = request.args.get("hide_gambling", "").strip()
    only_ad = request.args.get("only_ad", "").strip()
    only_gambling = request.args.get("only_gambling", "").strip()
    only_photo = request.args.get("only_photo", "").strip()

    allowed_sorts = {
        "date", "views", "forwards", "created_at", "reactions", "comments",
        "views_dev", "reactions_dev", "comments_dev", "forwards_dev",
    }
    if sort not in allowed_sorts:
        sort = "date"
    if order not in ("asc", "desc"):
        order = "desc"

    conditions, params = [], []
    show_empty = request.args.get("show_empty", "").strip()
    if show_empty != "1":
        conditions.append("(p.text IS NOT NULL AND p.text != '')")
    if search:
        conditions.append("p.text LIKE ?")
        params.append(f"%{search}%")
    if category:
        conditions.append("p.category = ?")
        params.append(category)
    if channels_param:
        ch_list = [c.strip() for c in channels_param.split(",") if c.strip()]
        if ch_list:
            placeholders = ",".join("?" * len(ch_list))
            conditions.append(f"p.channel_username IN ({placeholders})")
            params.extend(ch_list)
    if hide_gambling == "1":
        conditions.append("(c.gambling_pct_30d = 0 OR c.gambling_pct_30d IS NULL)")
    if only_ad == "1":
        conditions.append("p.is_ad = 1")
    if only_gambling == "1":
        conditions.append("p.is_gambling = 1")
    if only_photo == "1":
        conditions.append("p.has_photo = 1")

    date_from = request.args.get("date_from", "").strip()
    date_to = request.args.get("date_to", "").strip()
    if date_from:
        conditions.append("p.date >= ?")
        params.append(date_from)
    if date_to:
        conditions.append("p.date <= ?")
        params.append(date_to + " 23:59:59")

    min_er = request.args.get("min_channel_er", "").strip()
    if min_er:
        try:
            conditions.append("c.er_pct >= ?")
            params.append(float(min_er))
        except ValueError:
            pass

    for param_name, (col, op) in POST_NUMERIC_FILTERS.items():
        val = request.args.get(param_name, "").strip()
        if val:
            try:
                num = float(val)
                conditions.append(f"{col} {op} ?")
                params.append(num)
            except ValueError:
                pass

    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    db = get_db()

    total = db.execute(f"""
        SELECT COUNT(*) FROM posts p
        LEFT JOIN channels c ON c.username = p.channel_username
        {where}
    """, params).fetchone()[0]

    offset = (page - 1) * per_page
    rows = db.execute(f"""
        SELECT p.*, c.title as channel_title, c.url as channel_url
        FROM posts p
        LEFT JOIN channels c ON c.username = p.channel_username
        {where}
        ORDER BY p.{sort} {order}
        LIMIT ? OFFSET ?
    """, params + [per_page, offset]).fetchall()
    db.close()

    return jsonify({
        "posts": [dict(r) for r in rows],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": max(1, (total + per_page - 1) // per_page),
    })


# ── Analytics ─────────────────────────────────────────────────────

@app.route("/api/stats/posting-hours")
def posting_hours():
    channels_param = request.args.get("channels", "").strip()
    conditions, params = [], []
    if channels_param:
        ch_list = [c.strip() for c in channels_param.split(",") if c.strip()]
        if ch_list:
            placeholders = ",".join("?" * len(ch_list))
            conditions.append(f"channel_username IN ({placeholders})")
            params.extend(ch_list)

    where = f"WHERE date IS NOT NULL AND {' AND '.join(conditions)}" if conditions else "WHERE date IS NOT NULL"
    db = get_db()
    rows = db.execute(f"""
        SELECT CAST(strftime('%H', date) AS INTEGER) as hour, COUNT(*) as cnt
        FROM posts {where}
        GROUP BY hour ORDER BY hour
    """, params).fetchall()
    db.close()

    hours = {i: 0 for i in range(24)}
    for r in rows:
        if r["hour"] is not None:
            hours[r["hour"]] = r["cnt"]

    return jsonify([{"hour": h, "count": c} for h, c in sorted(hours.items())])


@app.route("/api/stats/compare")
def compare_channels():
    channels_param = request.args.get("channels", "").strip()
    if not channels_param:
        return jsonify({"error": "channels parameter required"}), 400

    ch_list = [c.strip() for c in channels_param.split(",") if c.strip()]
    if not ch_list:
        return jsonify({"error": "No channels specified"}), 400

    placeholders = ",".join("?" * len(ch_list))
    db = get_db()
    rows = db.execute(
        f"SELECT * FROM channels WHERE username IN ({placeholders})", ch_list
    ).fetchall()
    db.close()

    return jsonify([dict(r) for r in rows])


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_react(path):
    """Serve React SPA – fall back to index.html for client-side routing."""
    full = os.path.join(app.static_folder, path)
    if path and os.path.isfile(full):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, "index.html")


if __name__ == "__main__":
    app.run(debug=True, port=5001)
