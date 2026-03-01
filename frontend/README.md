# TG AI Channels — Web Interface

Веб-интерфейс для просмотра ленты Telegram AI-каналов.

## Структура

```
frontend/
├── api_server.py       ← Flask API (бэкенд, читает SQLite)
├── ai_channels.db      ← база данных каналов
├── src/                ← исходники React
│   ├── App.js
│   ├── api.js
│   ├── index.js
│   ├── index.css
│   └── components/
│       ├── Header.js
│       ├── Filters.js
│       ├── ChannelCard.js
│       ├── ChannelModal.js
│       ├── Pagination.js
│       └── StatsView.js
├── public/
├── package.json
└── README.md
```

## Установка и запуск

### 1. Установить зависимости

```bash
# Python (бэкенд)
pip install flask flask-cors

# Node.js (фронтенд)
npm install
```

### 2. Запустить бэкенд (Flask API)

```bash
python api_server.py
```

Сервер запустится на http://localhost:5001

### 3. Запустить фронтенд (React)

```bash
npm start
```

Откроется http://localhost:3000 (или 3001)

### Требования

- Python 3.10+
- Node.js 18+
- npm
