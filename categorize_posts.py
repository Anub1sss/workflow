"""
Категоризация постов через GLM-4.5-flash (бесплатная модель ZhipuAI).

Читает посты без категории из ai_channels.db, отправляет текст в GLM,
записывает категорию обратно.

Запуск:
    python categorize_posts.py
"""

import os
import sqlite3
import json
import time

from zhipuai import ZhipuAI
from dotenv import load_dotenv

load_dotenv()

DB_PATH = os.path.join(os.path.dirname(__file__), "ai_channels.db")
API_KEY = os.getenv("ZHIPU_API_KEY", "")

CATEGORIES = [
    "Кейс применения",
    "Научная публикация",
    "Обзор инструмента",
    "Туториал / Гайд",
    "Новость индустрии",
    "Промпт-инжиниринг",
    "Датасеты и бенчмарки",
    "Мнение / Аналитика",
    "Open Source",
    "Вакансии и карьера",
]

SYSTEM_PROMPT = f"""Ты — классификатор постов из Telegram-каналов об AI.
Тебе дан текст поста. Определи одну категорию из списка ниже.
Ответь ТОЛЬКО названием категории, без пояснений.

Категории:
{chr(10).join(f"- {c}" for c in CATEGORIES)}

Если пост не подходит ни к одной — ответь "Новость индустрии"."""


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def categorize_batch(client, posts):
    results = []
    for post in posts:
        text = (post["text"] or "").strip()
        if not text or len(text) < 20:
            results.append((post["id"], "Новость индустрии"))
            continue

        truncated = text[:1500]
        try:
            response = client.chat.completions.create(
                model="glm-4.5-flash",
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": truncated},
                ],
                max_tokens=50,
                temperature=0.1,
            )
            answer = response.choices[0].message.content.strip()
            category = answer if answer in CATEGORIES else "Новость индустрии"
            results.append((post["id"], category))
            print(f"  #{post['id']}: {category}")
        except Exception as e:
            print(f"  #{post['id']}: ERROR — {e}")
            results.append((post["id"], ""))
            time.sleep(2)

        time.sleep(0.5)

    return results


def main():
    if not API_KEY:
        print("Ошибка: ZHIPU_API_KEY не найден в .env")
        return

    client = ZhipuAI(
        api_key=API_KEY,
        base_url="https://open.bigmodel.cn/api/paas/v4",
    )

    db = get_db()
    uncategorized = db.execute(
        "SELECT id, text FROM posts WHERE category = '' OR category IS NULL LIMIT 100"
    ).fetchall()

    if not uncategorized:
        print("Все посты уже категоризированы.")
        db.close()
        return

    print(f"Найдено {len(uncategorized)} постов без категории. Запуск GLM-4.5-flash...\n")

    results = categorize_batch(client, uncategorized)

    updated = 0
    for post_id, category in results:
        if category:
            db.execute("UPDATE posts SET category = ? WHERE id = ?", (category, post_id))
            updated += 1

    db.commit()
    db.close()
    print(f"\nГотово: {updated}/{len(uncategorized)} постов категоризированы.")


if __name__ == "__main__":
    main()
