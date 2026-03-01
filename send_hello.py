#!/usr/bin/env python3
"""Отправка сообщения в Telegram через существующую сессию Telethon."""
import asyncio
import os
from pathlib import Path

from dotenv import load_dotenv
from telethon import TelegramClient

load_dotenv()

API_ID = int(os.environ["TG_API_ID"])
API_HASH = os.environ["TG_API_HASH"]
SESSION_PATH = Path(__file__).resolve().parent / "sessions" / "219107587_telethon"


async def main():
    async with TelegramClient(str(SESSION_PATH), API_ID, API_HASH) as client:
        await client.send_message("@recreed", "как дела")
        print("Сообщение «как дела» отправлено на @recreed")


if __name__ == "__main__":
    asyncio.run(main())
