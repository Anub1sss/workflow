# Аналитический план: TG AI Parser

> Сгенерировано автоматически агентом analytics-architect
> Дата: 2026-02-28
> Стек: Python + Flask, React, SQLite (sqlite3) | БД: SQLite

---

## 1. Исследование проекта

### Стек и инфраструктура

| Компонент | Технология |
|-----------|------------|
| Backend | Python 3, Flask, Flask-CORS |
| Frontend | React, Recharts, Lucide React |
| БД | SQLite (`ai_channels.db`) |
| Парсинг Telegram | Telethon (сессии в `sessions/`) |
| Внешние API | TGStat API, ZhipuAI (GLM-4.5-flash) |
| Деплой | Flask static serve + ngrok |

### Таблицы / модели

| Таблица | Ключевые поля | Связи |
|---------|---------------|-------|
| `channels` | `username` (PK), `title`, `subscribers`, `avg_views`, `avg_views_30d`, `er_pct`, `err_pct`, `visibility_pct`, `posts_30d`, `publish_frequency`, `publish_stability`, `channel_age_days`, `ad_pct_30d`, `gambling_pct_30d`, `has_linked_chat`, `channel_type`, `channel_type_detected`, `primary_niche`, `last_post_text`, `last_post_date`, `last_post_views`, `last_post_reactions`, `last_post_comments`, `last_post_forwards`, `last_post_has_photo`, `last_post_views_dev`, `last_post_reactions_dev`, `last_post_comments_dev`, `last_post_forwards_dev` | → `posts.channel_username` |
| `posts` | `id` (PK), `channel_username`, `tg_message_id`, `text`, `date`, `views`, `forwards`, `reactions`, `comments`, `is_ad`, `is_gambling`, `has_photo`, `category`, `tags`, `views_dev`, `reactions_dev`, `comments_dev`, `forwards_dev` | FK → `channels.username` |
| `categories` | `id` (PK), `name` (UNIQUE), `icon`, `color` | справочник для `posts.category` |

### API Endpoints

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/channels` | Список каналов (пагинация, фильтрация 30+ параметров, сортировка) |
| GET | `/api/channels/<username>` | Детали канала |
| GET | `/api/channels/list` | Все каналы (username, title) для фильтров |
| GET | `/api/stats` | Агрегированная статистика (средние KPI, топы, типы) |
| GET | `/api/tags` | Теги из characteristics с частотами |
| GET | `/api/categories` | Категории постов с количеством |
| GET | `/api/posts` | Посты (пагинация, фильтрация, сортировка по отклонениям) |

### Парсеры / скрипты

| Скрипт | Что делает | Выходные данные |
|--------|-----------|-----------------|
| `enrich_telethon.py` | Сбор метрик каналов через Telegram API: подписчики, просмотры, ER/ERR, реклама, гемблинг, последний пост, отклонения | `channels` + `posts` |
| `enrich_tgstat.py` | Обогащение через TGStat API: категории, страна, язык, CI Index | `channels` |
| `categorize_posts.py` | AI-категоризация постов через GLM-4.5-flash (10 категорий) | `posts.category` |

---

## 2. Карта фич

### 2.1. Роли пользователей

| Роль | Описание | Основной путь |
|------|----------|---------------|
| Аналитик/Менеджер | Просматривает каналы, фильтрует, ищет подходящие площадки | Каналы → Фильтры → Детали → Посты |
| Маркетолог/Байер | Ищет каналы для размещения рекламы, оценивает качество аудитории | Каналы → ER/ERR/Видимость → Реклама/Гемблинг → Решение |
| Редактор/Контент-менеджер | Мониторит контент в нише AI, следит за трендами | Посты → Категории → Trending → Вдохновение |

### 2.2. Фичи

| # | Фича | Домен | Роль | North Star метрика | Есть данные? |
|---|------|-------|------|--------------------|-------------|
| 1 | Каталог каналов | Discovery | Аналитик | Кол-во каналов с заполненными метриками | Да |
| 2 | Фильтрация и поиск каналов | Discovery | Аналитик | Кол-во уникальных комбинаций фильтров за сессию | Нет (нет event tracking) |
| 3 | Аналитика аудитории и охвата | Audience | Маркетолог | Средняя видимость (views/subs) | Да |
| 4 | Вовлечённость (ER/ERR) | Engagement | Маркетолог | Средний ER по платформе | Да |
| 5 | Мониторинг рекламы и гемблинга | Quality | Маркетолог | Доля каналов с >10% рекламы | Да |
| 6 | Лента постов | Content | Редактор | Кол-во категоризированных постов | Да |
| 7 | AI-категоризация контента | Content | Редактор | % постов с категориями | Да |
| 8 | Отклонения от среднего (deviation) | Content | Все | Кол-во постов с deviation >50% | Да |
| 9 | Сбор данных (парсинг) | Data Pipeline | Системная | % каналов с telethon_updated за последние 7 дней | Да |

---

## 3. Матрица приоритизации

| # | Фича | Б | Р | Д | Ч | З | Score | P |
|---|------|---|---|---|---|---|-------|---|
| 1 | Каталог каналов | 5 | 4 | 5 | 5 | 5 | 4.85 | **P1** |
| 3 | Аналитика аудитории и охвата | 5 | 4 | 5 | 4 | 4 | 4.55 | **P1** |
| 4 | Вовлечённость (ER/ERR) | 5 | 5 | 5 | 4 | 4 | 4.75 | **P1** |
| 5 | Мониторинг рекламы и гемблинга | 4 | 5 | 4 | 3 | 4 | 4.10 | **P1** |
| 6 | Лента постов | 4 | 3 | 5 | 4 | 3 | 3.85 | **P2** |
| 7 | AI-категоризация контента | 4 | 3 | 4 | 3 | 3 | 3.50 | **P2** |
| 8 | Отклонения от среднего | 3 | 3 | 5 | 3 | 3 | 3.30 | **P2** |
| 9 | Сбор данных (парсинг) | 5 | 5 | 4 | 2 | 3 | 4.15 | **P1** |
| 2 | Фильтрация и поиск каналов | 3 | 2 | 1 | 4 | 2 | 2.50 | **P3** |

---

## 4. План дэшбордов

---

### Дэшборд 1: [Data] — Каталог AI-каналов — Обзор

- **Фичи:** Каталог каналов, Аналитика аудитории, Вовлечённость
- **Аудитория:** Аналитик, Маркетолог
- **Связь с North Star:** Полнота и качество данных по каналам → качество принятия решений по размещению

#### Фильтры

| Фильтр | Тип | Дефолт |
|--------|-----|--------|
| Период обновления | date/all-options | past30days~ |
| Тип канала | string/= | Все |
| Есть привязанный чат | boolean | Все |
| Мин. подписчики | number | — |

#### Панели

| # | Панель | Уровень | Визуализация | Метрика | Вкладка |
|---|--------|---------|-------------|---------|---------|
| 1 | Всего каналов | L1 | Scalar | `COUNT(*)` | 1 — Обзор |
| 2 | Средние подписчики | L2 | Smartscalar | `AVG(subscribers)`, тренд по telethon_updated | 1 — Обзор |
| 3 | Средние просмотры | L2 | Smartscalar | `AVG(avg_views_30d)` | 1 — Обзор |
| 4 | Средний ER% | L2 | Smartscalar | `AVG(er_pct)` | 1 — Обзор |
| 5 | Покрытие данных | L3 | Gauge | `% каналов с telethon_updated IS NOT NULL` — зоны: 0-60 🔴, 60-80 🟡, 80-95 🟢, 95-100 🟢🟢 | 1 — Обзор |
| 6 | Распределение по типам | L4 | Bar (grouped) | `COUNT GROUP BY channel_type` | 1 — Обзор |
| 7 | Распределение подписчиков | L4 | Bar (stacked) | Бакеты: <1K, 1-5K, 5-20K, 20-100K, 100K+ | 1 — Обзор |
| 8 | Динамика обновлений | L5 | Area | `COUNT(*) по дням telethon_updated` | 1 — Обзор |
| 9 | Все каналы (таблица) | L6 | Table | username, title, subscribers, avg_views_30d, er_pct, err_pct, visibility_pct, channel_type | 1 — Обзор |

#### SQL-запросы

```sql
-- Панель #1: Всего каналов
-- Уровень: L1 | Визуализация: Scalar
SELECT COUNT(*) AS total_channels
FROM channels
WHERE 1=1
  [[AND channel_type = {{channel_type}}]]
  [[AND has_linked_chat = {{has_chat}}]]
  [[AND subscribers >= {{min_subs}}]]
```

```sql
-- Панель #2: Средние подписчики
-- Уровень: L2 | Визуализация: Smartscalar
SELECT AVG(subscribers) AS avg_subscribers
FROM channels
WHERE 1=1
  [[AND channel_type = {{channel_type}}]]
  [[AND subscribers >= {{min_subs}}]]
```

```sql
-- Панель #3: Средние просмотры
-- Уровень: L2 | Визуализация: Smartscalar
SELECT AVG(avg_views_30d) AS avg_views
FROM channels
WHERE avg_views_30d > 0
  [[AND channel_type = {{channel_type}}]]
  [[AND subscribers >= {{min_subs}}]]
```

```sql
-- Панель #4: Средний ER%
-- Уровень: L2 | Визуализация: Smartscalar
SELECT ROUND(AVG(er_pct), 3) AS avg_er
FROM channels
WHERE er_pct > 0
  [[AND channel_type = {{channel_type}}]]
  [[AND subscribers >= {{min_subs}}]]
```

```sql
-- Панель #5: Покрытие данных
-- Уровень: L3 | Визуализация: Gauge
SELECT
  ROUND(
    CAST(SUM(CASE WHEN telethon_updated IS NOT NULL THEN 1 ELSE 0 END) AS FLOAT)
    / COALESCE(NULLIF(COUNT(*), 0), 1) * 100, 1
  ) AS coverage_pct
FROM channels
WHERE 1=1
  [[AND channel_type = {{channel_type}}]]
```

```sql
-- Панель #6: Распределение по типам каналов
-- Уровень: L4 | Визуализация: Bar (grouped)
SELECT
  COALESCE(channel_type, 'не указан') AS channel_type,
  COUNT(*) AS cnt
FROM channels
WHERE 1=1
  [[AND subscribers >= {{min_subs}}]]
GROUP BY channel_type
ORDER BY cnt DESC
```

```sql
-- Панель #7: Распределение подписчиков по бакетам
-- Уровень: L4 | Визуализация: Bar (stacked)
SELECT
  CASE
    WHEN subscribers < 1000 THEN '< 1K'
    WHEN subscribers < 5000 THEN '1K–5K'
    WHEN subscribers < 20000 THEN '5K–20K'
    WHEN subscribers < 100000 THEN '20K–100K'
    ELSE '100K+'
  END AS bucket,
  CASE
    WHEN subscribers < 1000 THEN 1
    WHEN subscribers < 5000 THEN 2
    WHEN subscribers < 20000 THEN 3
    WHEN subscribers < 100000 THEN 4
    ELSE 5
  END AS bucket_order,
  COUNT(*) AS cnt
FROM channels
WHERE 1=1
  [[AND channel_type = {{channel_type}}]]
GROUP BY bucket, bucket_order
ORDER BY bucket_order
```

```sql
-- Панель #8: Динамика обновлений (парсинг)
-- Уровень: L5 | Визуализация: Area
SELECT
  DATE(telethon_updated) AS day,
  COUNT(*) AS channels_updated
FROM channels
WHERE telethon_updated IS NOT NULL
GROUP BY DATE(telethon_updated)
ORDER BY day
```

```sql
-- Панель #9: Все каналы (таблица)
-- Уровень: L6 | Визуализация: Table
SELECT
  username,
  title,
  subscribers,
  avg_views_30d,
  ROUND(er_pct, 3) AS er_pct,
  ROUND(err_pct, 3) AS err_pct,
  ROUND(visibility_pct, 1) AS visibility_pct,
  posts_30d,
  ROUND(publish_frequency, 2) AS publish_frequency,
  COALESCE(channel_type, 'не указан') AS channel_type,
  CASE WHEN has_linked_chat = 1 THEN 'Да' ELSE 'Нет' END AS has_chat,
  channel_age_days
FROM channels
WHERE 1=1
  [[AND channel_type = {{channel_type}}]]
  [[AND subscribers >= {{min_subs}}]]
ORDER BY subscribers DESC
```

---

### Дэшборд 2: [Data] — Вовлечённость и качество каналов — Глубокий анализ

- **Фичи:** Вовлечённость (ER/ERR), Мониторинг рекламы и гемблинга
- **Аудитория:** Маркетолог, Байер
- **Связь с North Star:** ER/ERR → качество аудитории → ROI рекламного размещения

#### Фильтры

| Фильтр | Тип | Дефолт |
|--------|-----|--------|
| Тип канала | string/= | Все |
| Мин. подписчики | number | 500 |
| Мин. ER% | number | — |
| Скрыть гемблинг/рекламу | boolean | Нет |

#### Панели

| # | Панель | Уровень | Визуализация | Метрика | Вкладка |
|---|--------|---------|-------------|---------|---------|
| 1 | Средний ER% | L2 | Smartscalar | `AVG(er_pct)` | 1 — Вовлечённость |
| 2 | Средний ERR% | L2 | Smartscalar | `AVG(err_pct)` | 1 — Вовлечённость |
| 3 | Средняя видимость% | L2 | Smartscalar | `AVG(visibility_pct)` | 1 — Вовлечённость |
| 4 | Доля с рекламой >10% | L3 | Gauge | `% каналов с ad_pct_30d > 10` | 1 — Вовлечённость |
| 5 | ER vs Подписчики (scatter) | L4 | Bar (grouped) | ER по бакетам подписчиков | 1 — Вовлечённость |
| 6 | Топ-20 по ER | L6 | Table | username, title, subs, er_pct, err_pct, views | 1 — Вовлечённость |
| 7 | Каналы с рекламой | L4 | Bar | `COUNT WHERE ad_pct_30d > 0 GROUP BY bucket` | 2 — Качество |
| 8 | Каналы с гемблингом | L4 | Bar | `COUNT WHERE gambling_pct_30d > 0 GROUP BY bucket` | 2 — Качество |
| 9 | Доля рекламы по типам каналов | L4 | Bar (stacked) | `AVG(ad_pct_30d) GROUP BY channel_type` | 2 — Качество |
| 10 | Рекламодатели (топ упоминаний) | L6 | Table | бренд, кол-во каналов | 2 — Качество |
| 11 | Все каналы — качество | L6 | Table | username, subs, ad_pct, gambling_pct, top_advertisers | 2 — Качество |

#### SQL-запросы

```sql
-- Панель #1: Средний ER%
-- Уровень: L2 | Визуализация: Smartscalar
SELECT ROUND(AVG(er_pct), 3) AS avg_er
FROM channels
WHERE er_pct > 0
  [[AND channel_type = {{channel_type}}]]
  [[AND subscribers >= {{min_subs}}]]
```

```sql
-- Панель #2: Средний ERR%
-- Уровень: L2 | Визуализация: Smartscalar
SELECT ROUND(AVG(err_pct), 3) AS avg_err
FROM channels
WHERE err_pct > 0
  [[AND channel_type = {{channel_type}}]]
  [[AND subscribers >= {{min_subs}}]]
```

```sql
-- Панель #3: Средняя видимость%
-- Уровень: L2 | Визуализация: Smartscalar
SELECT ROUND(AVG(visibility_pct), 1) AS avg_visibility
FROM channels
WHERE visibility_pct > 0
  [[AND channel_type = {{channel_type}}]]
  [[AND subscribers >= {{min_subs}}]]
```

```sql
-- Панель #4: Доля каналов с высокой рекламой (>10%)
-- Уровень: L3 | Визуализация: Gauge
SELECT
  ROUND(
    CAST(SUM(CASE WHEN ad_pct_30d > 10 THEN 1 ELSE 0 END) AS FLOAT)
    / COALESCE(NULLIF(COUNT(*), 0), 1) * 100, 1
  ) AS high_ad_pct
FROM channels
WHERE 1=1
  [[AND channel_type = {{channel_type}}]]
  [[AND subscribers >= {{min_subs}}]]
```

```sql
-- Панель #5: ER по бакетам подписчиков
-- Уровень: L4 | Визуализация: Bar (grouped)
SELECT
  CASE
    WHEN subscribers < 1000 THEN '< 1K'
    WHEN subscribers < 5000 THEN '1K–5K'
    WHEN subscribers < 20000 THEN '5K–20K'
    WHEN subscribers < 100000 THEN '20K–100K'
    ELSE '100K+'
  END AS bucket,
  CASE
    WHEN subscribers < 1000 THEN 1
    WHEN subscribers < 5000 THEN 2
    WHEN subscribers < 20000 THEN 3
    WHEN subscribers < 100000 THEN 4
    ELSE 5
  END AS bucket_order,
  ROUND(AVG(er_pct), 3) AS avg_er,
  ROUND(AVG(err_pct), 3) AS avg_err,
  COUNT(*) AS channels_count
FROM channels
WHERE er_pct > 0
  [[AND channel_type = {{channel_type}}]]
GROUP BY bucket, bucket_order
ORDER BY bucket_order
```

```sql
-- Панель #6: Топ-20 каналов по ER
-- Уровень: L6 | Визуализация: Table
SELECT
  username,
  title,
  subscribers,
  ROUND(er_pct, 3) AS er_pct,
  ROUND(err_pct, 3) AS err_pct,
  avg_views_30d,
  ROUND(visibility_pct, 1) AS visibility_pct,
  COALESCE(channel_type, 'не указан') AS channel_type
FROM channels
WHERE er_pct > 0
  [[AND channel_type = {{channel_type}}]]
  [[AND subscribers >= {{min_subs}}]]
ORDER BY er_pct DESC
LIMIT 20
```

```sql
-- Панель #7: Распределение рекламных каналов по бакетам доли рекламы
-- Уровень: L4 | Визуализация: Bar
SELECT
  CASE
    WHEN ad_pct_30d = 0 THEN '0%'
    WHEN ad_pct_30d <= 5 THEN '1–5%'
    WHEN ad_pct_30d <= 10 THEN '5–10%'
    WHEN ad_pct_30d <= 20 THEN '10–20%'
    ELSE '> 20%'
  END AS ad_bucket,
  CASE
    WHEN ad_pct_30d = 0 THEN 1
    WHEN ad_pct_30d <= 5 THEN 2
    WHEN ad_pct_30d <= 10 THEN 3
    WHEN ad_pct_30d <= 20 THEN 4
    ELSE 5
  END AS bucket_order,
  COUNT(*) AS cnt
FROM channels
WHERE 1=1
  [[AND channel_type = {{channel_type}}]]
  [[AND subscribers >= {{min_subs}}]]
GROUP BY ad_bucket, bucket_order
ORDER BY bucket_order
```

```sql
-- Панель #8: Распределение каналов с гемблингом
-- Уровень: L4 | Визуализация: Bar
SELECT
  CASE
    WHEN gambling_pct_30d = 0 THEN '0%'
    WHEN gambling_pct_30d <= 5 THEN '1–5%'
    WHEN gambling_pct_30d <= 15 THEN '5–15%'
    ELSE '> 15%'
  END AS gambling_bucket,
  CASE
    WHEN gambling_pct_30d = 0 THEN 1
    WHEN gambling_pct_30d <= 5 THEN 2
    WHEN gambling_pct_30d <= 15 THEN 3
    ELSE 4
  END AS bucket_order,
  COUNT(*) AS cnt
FROM channels
WHERE 1=1
  [[AND channel_type = {{channel_type}}]]
  [[AND subscribers >= {{min_subs}}]]
GROUP BY gambling_bucket, bucket_order
ORDER BY bucket_order
```

```sql
-- Панель #9: Средняя доля рекламы по типам каналов
-- Уровень: L4 | Визуализация: Bar (stacked)
SELECT
  COALESCE(channel_type, 'не указан') AS channel_type,
  ROUND(AVG(ad_pct_30d), 1) AS avg_ad_pct,
  ROUND(AVG(gambling_pct_30d), 1) AS avg_gambling_pct,
  COUNT(*) AS cnt
FROM channels
WHERE 1=1
  [[AND subscribers >= {{min_subs}}]]
GROUP BY channel_type
HAVING cnt >= 2
ORDER BY avg_ad_pct DESC
```

```sql
-- Панель #10: Топ рекламодателей/брендов
-- Уровень: L6 | Визуализация: Table
-- Примечание: top_advertisers хранится как текстовая строка, разбирается в Metabase через кастомный столбец или в коде
SELECT
  username,
  title,
  subscribers,
  ROUND(ad_pct_30d, 1) AS ad_pct,
  top_advertisers
FROM channels
WHERE top_advertisers IS NOT NULL AND top_advertisers != ''
  [[AND channel_type = {{channel_type}}]]
  [[AND subscribers >= {{min_subs}}]]
ORDER BY ad_pct_30d DESC
```

```sql
-- Панель #11: Все каналы — качество
-- Уровень: L6 | Визуализация: Table
SELECT
  username,
  title,
  subscribers,
  ROUND(ad_pct_30d, 1) AS ad_pct,
  ROUND(gambling_pct_30d, 1) AS gambling_pct,
  ad_posts_30d,
  gambling_posts_30d,
  top_advertisers
FROM channels
WHERE 1=1
  [[AND channel_type = {{channel_type}}]]
  [[AND subscribers >= {{min_subs}}]]
ORDER BY ad_pct_30d DESC
```

---

### Дэшборд 3: [Data] — Контент и посты — AI-категоризация

- **Фичи:** Лента постов, AI-категоризация, Отклонения от среднего
- **Аудитория:** Редактор, Контент-менеджер
- **Связь с North Star:** Категоризированные посты → понимание трендов → контент-стратегия

#### Фильтры

| Фильтр | Тип | Дефолт |
|--------|-----|--------|
| Период | date/all-options | past30days~ |
| Категория | string/= | Все |
| Канал | string/= | Все |
| Скрыть гемблинг | boolean | Нет |
| Только с фото | boolean | Нет |

#### Панели

| # | Панель | Уровень | Визуализация | Метрика | Вкладка |
|---|--------|---------|-------------|---------|---------|
| 1 | Всего постов | L1 | Scalar | `COUNT(*)` | 1 — Обзор контента |
| 2 | Категоризировано | L3 | Gauge | `% постов с category != ''` | 1 — Обзор контента |
| 3 | Средние просмотры поста | L2 | Smartscalar | `AVG(views)` | 1 — Обзор контента |
| 4 | Посты по категориям | L4 | Bar (grouped) | `COUNT GROUP BY category` | 1 — Обзор контента |
| 5 | Просмотры по категориям | L4 | Bar (grouped) | `AVG(views) GROUP BY category` | 1 — Обзор контента |
| 6 | Динамика постов по дням | L5 | Area | `COUNT(*) GROUP BY DATE(date)` | 1 — Обзор контента |
| 7 | Топ постов по отклонению просмотров | L6 | Table | text, channel, views, views_dev | 2 — Аномалии |
| 8 | Топ постов по отклонению реакций | L6 | Table | text, channel, reactions, reactions_dev | 2 — Аномалии |
| 9 | Доля рекламных постов | L3 | Gauge | `% постов с is_ad = 1` | 2 — Аномалии |
| 10 | Доля гемблинг-постов | L3 | Gauge | `% постов с is_gambling = 1` | 2 — Аномалии |
| 11 | Все посты (таблица) | L6 | Table | channel, date, category, views, reactions, comments, forwards, text (preview) | 1 — Обзор контента |

#### SQL-запросы

```sql
-- Панель #1: Всего постов
-- Уровень: L1 | Визуализация: Scalar
SELECT COUNT(*) AS total_posts
FROM posts p
WHERE p.text IS NOT NULL AND p.text != ''
  [[AND p.category = {{category}}]]
  [[AND p.channel_username = {{channel}}]]
  [[AND p.date >= {{start_date}}]]
  [[AND p.date <= {{end_date}}]]
```

```sql
-- Панель #2: Покрытие категоризации
-- Уровень: L3 | Визуализация: Gauge
SELECT
  ROUND(
    CAST(SUM(CASE WHEN category != '' AND category IS NOT NULL THEN 1 ELSE 0 END) AS FLOAT)
    / COALESCE(NULLIF(COUNT(*), 0), 1) * 100, 1
  ) AS categorized_pct
FROM posts
WHERE text IS NOT NULL AND text != ''
  [[AND date >= {{start_date}}]]
  [[AND date <= {{end_date}}]]
```

```sql
-- Панель #3: Средние просмотры поста
-- Уровень: L2 | Визуализация: Smartscalar
SELECT ROUND(AVG(views), 0) AS avg_views
FROM posts
WHERE views > 0
  AND text IS NOT NULL AND text != ''
  [[AND category = {{category}}]]
  [[AND channel_username = {{channel}}]]
  [[AND date >= {{start_date}}]]
  [[AND date <= {{end_date}}]]
```

```sql
-- Панель #4: Посты по категориям
-- Уровень: L4 | Визуализация: Bar (grouped)
SELECT
  COALESCE(NULLIF(category, ''), 'Без категории') AS category,
  COUNT(*) AS cnt
FROM posts
WHERE text IS NOT NULL AND text != ''
  [[AND channel_username = {{channel}}]]
  [[AND date >= {{start_date}}]]
  [[AND date <= {{end_date}}]]
GROUP BY category
ORDER BY cnt DESC
```

```sql
-- Панель #5: Средние просмотры по категориям
-- Уровень: L4 | Визуализация: Bar (grouped)
SELECT
  COALESCE(NULLIF(category, ''), 'Без категории') AS category,
  ROUND(AVG(views), 0) AS avg_views,
  ROUND(AVG(reactions), 0) AS avg_reactions,
  COUNT(*) AS posts_count
FROM posts
WHERE text IS NOT NULL AND text != ''
  AND views > 0
  [[AND channel_username = {{channel}}]]
  [[AND date >= {{start_date}}]]
  [[AND date <= {{end_date}}]]
GROUP BY category
HAVING posts_count >= 3
ORDER BY avg_views DESC
```

```sql
-- Панель #6: Динамика постов по дням
-- Уровень: L5 | Визуализация: Area
SELECT
  DATE(date) AS day,
  COUNT(*) AS posts_count,
  ROUND(AVG(views), 0) AS avg_views
FROM posts
WHERE text IS NOT NULL AND text != ''
  [[AND category = {{category}}]]
  [[AND channel_username = {{channel}}]]
  [[AND date >= {{start_date}}]]
  [[AND date <= {{end_date}}]]
GROUP BY DATE(date)
ORDER BY day
```

```sql
-- Панель #7: Топ постов по отклонению просмотров
-- Уровень: L6 | Визуализация: Table
SELECT
  p.channel_username,
  c.title AS channel_title,
  SUBSTR(p.text, 1, 120) AS preview,
  p.views,
  ROUND(p.views_dev, 1) AS views_dev_pct,
  p.reactions,
  p.comments,
  p.date,
  p.category
FROM posts p
LEFT JOIN channels c ON c.username = p.channel_username
WHERE p.views_dev IS NOT NULL AND p.views_dev > 0
  AND p.text IS NOT NULL AND p.text != ''
  [[AND p.category = {{category}}]]
  [[AND p.channel_username = {{channel}}]]
  [[AND p.date >= {{start_date}}]]
  [[AND p.date <= {{end_date}}]]
ORDER BY p.views_dev DESC
LIMIT 50
```

```sql
-- Панель #8: Топ постов по отклонению реакций
-- Уровень: L6 | Визуализация: Table
SELECT
  p.channel_username,
  c.title AS channel_title,
  SUBSTR(p.text, 1, 120) AS preview,
  p.reactions,
  ROUND(p.reactions_dev, 1) AS reactions_dev_pct,
  p.views,
  p.comments,
  p.date,
  p.category
FROM posts p
LEFT JOIN channels c ON c.username = p.channel_username
WHERE p.reactions_dev IS NOT NULL AND p.reactions_dev > 0
  AND p.text IS NOT NULL AND p.text != ''
  [[AND p.category = {{category}}]]
  [[AND p.channel_username = {{channel}}]]
  [[AND p.date >= {{start_date}}]]
  [[AND p.date <= {{end_date}}]]
ORDER BY p.reactions_dev DESC
LIMIT 50
```

```sql
-- Панель #9: Доля рекламных постов
-- Уровень: L3 | Визуализация: Gauge
SELECT
  ROUND(
    CAST(SUM(CASE WHEN is_ad = 1 THEN 1 ELSE 0 END) AS FLOAT)
    / COALESCE(NULLIF(COUNT(*), 0), 1) * 100, 1
  ) AS ad_pct
FROM posts
WHERE text IS NOT NULL AND text != ''
  [[AND channel_username = {{channel}}]]
  [[AND date >= {{start_date}}]]
  [[AND date <= {{end_date}}]]
```

```sql
-- Панель #10: Доля гемблинг-постов
-- Уровень: L3 | Визуализация: Gauge
SELECT
  ROUND(
    CAST(SUM(CASE WHEN is_gambling = 1 THEN 1 ELSE 0 END) AS FLOAT)
    / COALESCE(NULLIF(COUNT(*), 0), 1) * 100, 1
  ) AS gambling_pct
FROM posts
WHERE text IS NOT NULL AND text != ''
  [[AND channel_username = {{channel}}]]
  [[AND date >= {{start_date}}]]
  [[AND date <= {{end_date}}]]
```

```sql
-- Панель #11: Все посты (таблица)
-- Уровень: L6 | Визуализация: Table
SELECT
  p.channel_username,
  c.title AS channel_title,
  p.date,
  p.category,
  p.views,
  p.reactions,
  p.comments,
  p.forwards,
  CASE WHEN p.is_ad = 1 THEN 'Да' ELSE '' END AS is_ad,
  CASE WHEN p.is_gambling = 1 THEN 'Да' ELSE '' END AS is_gambling,
  CASE WHEN p.has_photo = 1 THEN 'Да' ELSE '' END AS has_photo,
  SUBSTR(p.text, 1, 200) AS preview
FROM posts p
LEFT JOIN channels c ON c.username = p.channel_username
WHERE p.text IS NOT NULL AND p.text != ''
  [[AND p.category = {{category}}]]
  [[AND p.channel_username = {{channel}}]]
  [[AND p.date >= {{start_date}}]]
  [[AND p.date <= {{end_date}}]]
ORDER BY p.date DESC
```

---

### Дэшборд 4: [Data] — Здоровье парсинга — Мониторинг

- **Фичи:** Сбор данных (парсинг)
- **Аудитория:** Разработчик, DevOps
- **Связь с North Star:** Свежесть и полнота данных → надёжность всех остальных дэшбордов

#### Фильтры

| Фильтр | Тип | Дефолт |
|--------|-----|--------|
| Период | date/all-options | past7days~ |

#### Панели

| # | Панель | Уровень | Визуализация | Метрика | Вкладка |
|---|--------|---------|-------------|---------|---------|
| 1 | Каналов в базе | L1 | Scalar | `COUNT(*)` | — |
| 2 | Обновлено за 7 дней | L1 | Scalar | `COUNT WHERE telethon_updated >= 7d ago` | — |
| 3 | Покрытие Telethon | L3 | Gauge | `% с telethon_updated NOT NULL` | — |
| 4 | Покрытие TGStat | L3 | Gauge | `% с tgstat_updated NOT NULL` | — |
| 5 | Покрытие категоризации постов | L3 | Gauge | `% постов с category != ''` | — |
| 6 | Каналы без данных | L6 | Table | username, title, telethon_updated, tgstat_updated | — |
| 7 | Обновления по дням | L5 | Area (stacked) | telethon и tgstat обновления по дням | — |
| 8 | Средний возраст данных (дней) | L2 | Smartscalar | `AVG(julianday('now') - julianday(telethon_updated))` | — |

#### SQL-запросы

```sql
-- Панель #1: Каналов в базе
-- Уровень: L1 | Визуализация: Scalar
SELECT COUNT(*) AS total_channels FROM channels
```

```sql
-- Панель #2: Обновлено за последние 7 дней (Telethon)
-- Уровень: L1 | Визуализация: Scalar
SELECT COUNT(*) AS updated_7d
FROM channels
WHERE telethon_updated >= DATE('now', '-7 days')
```

```sql
-- Панель #3: Покрытие Telethon
-- Уровень: L3 | Визуализация: Gauge
SELECT
  ROUND(
    CAST(SUM(CASE WHEN telethon_updated IS NOT NULL THEN 1 ELSE 0 END) AS FLOAT)
    / COALESCE(NULLIF(COUNT(*), 0), 1) * 100, 1
  ) AS telethon_coverage_pct
FROM channels
```

```sql
-- Панель #4: Покрытие TGStat
-- Уровень: L3 | Визуализация: Gauge
SELECT
  ROUND(
    CAST(SUM(CASE WHEN tgstat_updated IS NOT NULL THEN 1 ELSE 0 END) AS FLOAT)
    / COALESCE(NULLIF(COUNT(*), 0), 1) * 100, 1
  ) AS tgstat_coverage_pct
FROM channels
```

```sql
-- Панель #5: Покрытие категоризации постов
-- Уровень: L3 | Визуализация: Gauge
SELECT
  ROUND(
    CAST(SUM(CASE WHEN category != '' AND category IS NOT NULL THEN 1 ELSE 0 END) AS FLOAT)
    / COALESCE(NULLIF(COUNT(*), 0), 1) * 100, 1
  ) AS categorized_pct
FROM posts
WHERE text IS NOT NULL AND text != ''
```

```sql
-- Панель #6: Каналы без данных Telethon
-- Уровень: L6 | Визуализация: Table
SELECT
  username,
  title,
  subscribers,
  telethon_updated,
  tgstat_updated,
  (SELECT COUNT(*) FROM posts WHERE channel_username = channels.username) AS posts_count
FROM channels
WHERE telethon_updated IS NULL
ORDER BY subscribers DESC
```

```sql
-- Панель #7: Обновления по дням
-- Уровень: L5 | Визуализация: Area (stacked)
SELECT
  DATE(telethon_updated) AS day,
  COUNT(*) AS telethon_updates
FROM channels
WHERE telethon_updated IS NOT NULL
  [[AND telethon_updated >= {{start_date}}]]
GROUP BY DATE(telethon_updated)
ORDER BY day
```

```sql
-- Панель #8: Средний возраст данных
-- Уровень: L2 | Визуализация: Smartscalar
SELECT
  ROUND(AVG(JULIANDAY('now') - JULIANDAY(telethon_updated)), 1) AS avg_data_age_days
FROM channels
WHERE telethon_updated IS NOT NULL
```

---

## 5. Иерархия метрик

```
North Star: Полнота и качество каталога AI-каналов
│
├── Домен: Discovery (Каталог)
│   ├── Кол-во каналов (total)
│   ├── Покрытие данных (% с telethon_updated)
│   └── Средний возраст данных (дни)
│
├── Домен: Audience (Аудитория)
│   ├── Средние подписчики
│   ├── Средние просмотры (avg_views_30d)
│   └── Средняя видимость (visibility_pct)
│
├── Домен: Engagement (Вовлечённость)
│   ├── Средний ER%
│   ├── Средний ERR%
│   └── Стабильность публикаций
│
├── Домен: Quality (Качество)
│   ├── Доля рекламных каналов (>10% рекламы)
│   ├── Доля гемблинг-каналов
│   └── Топ рекламодателей
│
├── Домен: Content (Контент)
│   ├── Всего постов
│   ├── % категоризированных
│   ├── Распределение по категориям
│   └── Аномалии (посты с deviation >50%)
│
└── Домен: Data Pipeline (Парсинг)
    ├── Покрытие Telethon
    ├── Покрытие TGStat
    ├── Покрытие категоризации
    └── Обновлено за 7 дней
```

---

## 6. Следующие шаги

- [ ] Подключить `ai_channels.db` к Metabase как SQLite-источник
- [ ] Создать дэшборд P1: «Каталог AI-каналов — Обзор» (9 панелей)
- [ ] Создать дэшборд P1: «Вовлечённость и качество» (11 панелей)
- [ ] Создать дэшборд P2: «Контент и посты» (11 панелей)
- [ ] Создать дэшборд P1: «Здоровье парсинга» (8 панелей)
- [ ] Настроить алерты для Smartscalar-панелей (порог ±20%)
- [ ] Через 2 недели: ревью метрик, удалить vanity-метрики
- [ ] Добавить event tracking на фронтенде для фичи «Фильтрация и поиск» (P3)
