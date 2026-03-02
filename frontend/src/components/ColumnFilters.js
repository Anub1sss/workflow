import React, { useState, useEffect } from "react";
import { X, RotateCcw, Sparkles } from "lucide-react";
import { fetchCategories, fetchChannelsList } from "../api";

const CHANNEL_SORTS = [
  { value: "subscribers", label: "Подписчики" },
  { value: "avg_views_30d", label: "Ср. просмотры" },
  { value: "er_pct", label: "ER (%)" },
  { value: "err_pct", label: "ERR (%)" },
  { value: "visibility_pct", label: "Видимость" },
  { value: "posts_30d", label: "Постов/мес" },
  { value: "publish_frequency", label: "Частота" },
  { value: "last_post_date", label: "Последний пост" },
  { value: "channel_age_days", label: "Возраст" },
];

const POST_SORTS = [
  { value: "date", label: "По дате" },
  { value: "views", label: "По просмотрам" },
  { value: "reactions", label: "По реакциям" },
  { value: "comments", label: "По комментариям" },
  { value: "views_dev", label: "Откл. просмотров" },
  { value: "reactions_dev", label: "Откл. реакций" },
];

const TYPES = [
  { value: "", label: "Все типы" },
  { value: "личный блог", label: "Личный блог" },
  { value: "гибрид", label: "Гибрид" },
  { value: "обезличенный", label: "Обезличенный" },
];

const CHANNEL_RANGES = [
  { label: "Подписчики", min: "min_subs", max: "max_subs" },
  { label: "Ср. просмотры", min: "min_views", max: "max_views" },
  { label: "ER (%)", min: "min_er", max: "max_er", step: "0.01" },
  { label: "ERR (%)", min: "min_err", max: "max_err", step: "0.01" },
  { label: "Видимость (%)", min: "min_visibility", max: "max_visibility" },
  { label: "Постов/мес", min: "min_posts", max: "max_posts" },
];

const POST_RANGES = [
  { label: "Просмотры", min: "min_p_views", max: "max_p_views" },
  { label: "Реакции", min: "min_p_reactions", max: "max_p_reactions" },
  { label: "Комментарии", min: "min_p_comments", max: "max_p_comments" },
  { label: "Откл. просм. (%)", min: "min_p_views_dev", max: "max_p_views_dev" },
];

const QUALITY_PRESETS = [
  { label: "Всё", filters: {} },
  {
    label: "Топ контент",
    filters: { min_p_views: "1000", min_p_reactions: "10" },
  },
  {
    label: "Вирусные",
    filters: { min_p_views_dev: "50", sort: "views_dev", order: "desc" },
  },
  {
    label: "Без рекламы",
    filters: { hide_gambling: "1" },
  },
];

export default function ColumnFilters({ column, onChange, onClose, isPostColumn }) {
  const [categories, setCategories] = useState([]);
  const [channelsList, setChannelsList] = useState([]);
  const [chSearch, setChSearch] = useState("");

  useEffect(() => {
    if (isPostColumn) {
      fetchCategories().then(setCategories).catch(() => {});
      fetchChannelsList().then(setChannelsList).catch(() => {});
    }
  }, [isPostColumn]);

  const f = column.filters || {};
  const sorts = isPostColumn ? POST_SORTS : CHANNEL_SORTS;
  const ranges = isPostColumn ? POST_RANGES : CHANNEL_RANGES;

  const set = (key, val) => onChange({ [key]: val });

  const applyMultiple = (updates) => onChange(updates);

  const reset = () => {
    const clean = {};
    Object.keys(f).forEach(k => { clean[k] = ""; });
    onChange(clean);
  };

  const selectedChannels = f.channels ? f.channels.split(",") : [];
  const filteredChannels = chSearch
    ? channelsList.filter(ch =>
        ch.username.toLowerCase().includes(chSearch.toLowerCase()) ||
        (ch.title && ch.title.toLowerCase().includes(chSearch.toLowerCase()))
      )
    : channelsList;

  const toggleChannel = (username) => {
    const current = selectedChannels.includes(username)
      ? selectedChannels.filter(u => u !== username)
      : [...selectedChannels, username];
    set("channels", current.join(","));
  };

  return (
    <div style={styles.panel}>
      <div style={styles.panelHeader}>
        <span style={styles.panelTitle}>Настройки колонки</span>
        <div style={styles.panelActions}>
          <button style={styles.iconBtn} onClick={reset} title="Сбросить">
            <RotateCcw size={13} />
          </button>
          <button style={styles.iconBtn} onClick={onClose}>
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Quality presets (posts only) */}
      {isPostColumn && (
        <div style={styles.field}>
          <label style={styles.label}>
            <Sparkles size={10} /> Пресеты качества
          </label>
          <div style={styles.presetsRow}>
            {QUALITY_PRESETS.map((p) => (
              <button
                key={p.label}
                style={styles.presetChip}
                onClick={() => applyMultiple(p.filters)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sort */}
      <div style={styles.field}>
        <label style={styles.label}>Сортировка</label>
        <div style={styles.sortRow}>
          <select style={styles.select} value={f.sort || sorts[0].value}
            onChange={e => set("sort", e.target.value)}>
            {sorts.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <button style={styles.orderBtn}
            onClick={() => set("order", f.order === "asc" ? "desc" : "asc")}>
            {f.order === "asc" ? "↑" : "↓"}
          </button>
        </div>
      </div>

      {/* Date range (posts only) */}
      {isPostColumn && (
        <div style={styles.field}>
          <label style={styles.label}>Дата</label>
          <div style={styles.rangeRow}>
            <input
              style={styles.dateInput}
              type="date"
              value={f.date_from || ""}
              onChange={e => set("date_from", e.target.value)}
            />
            <span style={styles.dash}>—</span>
            <input
              style={styles.dateInput}
              type="date"
              value={f.date_to || ""}
              onChange={e => set("date_to", e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Format (posts only) */}
      {isPostColumn && (
        <div style={styles.field}>
          <label style={styles.label}>Формат</label>
          <div style={styles.formatRow}>
            <label style={styles.formatChip}>
              <input type="checkbox" checked={f.only_photo === "1"}
                onChange={e => set("only_photo", e.target.checked ? "1" : "")} />
              С фото
            </label>
            <label style={styles.formatChip}>
              <input type="checkbox" checked={f.only_ad === "1"}
                onChange={e => set("only_ad", e.target.checked ? "1" : "")} />
              Реклама
            </label>
            <label style={styles.formatChip}>
              <input type="checkbox" checked={f.show_empty === "1"}
                onChange={e => set("show_empty", e.target.checked ? "1" : "")} />
              Медиа
            </label>
          </div>
        </div>
      )}

      {/* Type (channels only) */}
      {!isPostColumn && (
        <div style={styles.field}>
          <label style={styles.label}>Тип канала</label>
          <select style={styles.select} value={f.type || ""}
            onChange={e => set("type", e.target.value)}>
            {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      )}

      {/* Category (posts only) */}
      {isPostColumn && categories.length > 0 && (
        <div style={styles.field}>
          <label style={styles.label}>Категория</label>
          <select style={styles.select} value={f.category || ""}
            onChange={e => set("category", e.target.value)}>
            <option value="">Все</option>
            {categories.map(c => (
              <option key={c.name} value={c.name}>{c.name} ({c.posts_count})</option>
            ))}
          </select>
        </div>
      )}

      {/* Channels selector (posts only) */}
      {isPostColumn && (
        <div style={styles.field}>
          <label style={styles.label}>Каналы {selectedChannels.length > 0 && `(${selectedChannels.length})`}</label>
          <input style={styles.input} placeholder="Поиск каналов..."
            value={chSearch} onChange={e => setChSearch(e.target.value)} />
          <div style={styles.channelList}>
            {filteredChannels.slice(0, 40).map(ch => {
              const active = selectedChannels.includes(ch.username);
              return (
                <button key={ch.username}
                  style={{ ...styles.chItem, ...(active ? styles.chItemActive : {}) }}
                  onClick={() => toggleChannel(ch.username)}>
                  <span style={styles.chCheck}>{active ? "✓" : ""}</span>
                  @{ch.username}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Ranges */}
      <div style={styles.divider} />
      <label style={styles.sectionLabel}>Диапазоны</label>
      {ranges.map(r => (
        <div key={r.min} style={styles.field}>
          <label style={styles.label}>{r.label}</label>
          <div style={styles.rangeRow}>
            <input style={styles.numInput} type="number" step={r.step || "1"} placeholder="от"
              value={f[r.min] || ""} onChange={e => set(r.min, e.target.value)} />
            <span style={styles.dash}>—</span>
            <input style={styles.numInput} type="number" step={r.step || "1"} placeholder="до"
              value={f[r.max] || ""} onChange={e => set(r.max, e.target.value)} />
          </div>
        </div>
      ))}

      {/* Quality thresholds (posts) */}
      {isPostColumn && (
        <>
          <div style={styles.divider} />
          <label style={styles.sectionLabel}>Фильтр качества</label>
          <div style={styles.field}>
            <label style={styles.label}>Мин. ER канала (%)</label>
            <input style={styles.numInput} type="number" step="0.01" placeholder="напр. 0.3"
              value={f.min_channel_er || ""} onChange={e => set("min_channel_er", e.target.value)} />
          </div>
        </>
      )}

      {/* Toggles */}
      <div style={styles.divider} />
      <label style={styles.toggleRow}>
        <input type="checkbox" checked={f.hide_gambling === "1"}
          onChange={e => set("hide_gambling", e.target.checked ? "1" : "")} />
        <span>Скрыть гемблинг и рекламу</span>
      </label>
      {!isPostColumn && (
        <label style={styles.toggleRow}>
          <input type="checkbox" checked={f.has_chat === "1"}
            onChange={e => set("has_chat", e.target.checked ? "1" : "")} />
          <span>Только с чатом</span>
        </label>
      )}
    </div>
  );
}

const styles = {
  panel: {
    padding: "10px 12px",
    background: "var(--tg-bg-secondary)",
    borderBottom: "1px solid var(--tg-border)",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    maxHeight: 500,
    overflowY: "auto",
    flexShrink: 0,
  },
  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  panelTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: "var(--tg-text)",
  },
  panelActions: {
    display: "flex",
    gap: 4,
  },
  iconBtn: {
    width: 24,
    height: 24,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "none",
    borderRadius: 6,
    background: "transparent",
    color: "var(--tg-text-muted)",
    cursor: "pointer",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
  },
  label: {
    fontSize: 10,
    fontWeight: 600,
    color: "var(--tg-text-muted)",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: "var(--tg-text-secondary)",
  },
  presetsRow: {
    display: "flex",
    gap: 4,
    flexWrap: "wrap",
  },
  presetChip: {
    padding: "4px 10px",
    borderRadius: 8,
    border: "1px solid var(--tg-border)",
    background: "var(--tg-bg-panel)",
    color: "var(--tg-text-secondary)",
    fontSize: 11,
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.15s",
  },
  select: {
    background: "var(--tg-bg-input)",
    color: "var(--tg-text)",
    border: "1px solid var(--tg-border)",
    borderRadius: 8,
    padding: "6px 8px",
    fontSize: 12,
    outline: "none",
    width: "100%",
    cursor: "pointer",
  },
  input: {
    background: "var(--tg-bg-input)",
    color: "var(--tg-text)",
    border: "1px solid var(--tg-border)",
    borderRadius: 8,
    padding: "6px 8px",
    fontSize: 12,
    outline: "none",
    width: "100%",
  },
  dateInput: {
    flex: 1,
    background: "var(--tg-bg-input)",
    color: "var(--tg-text)",
    border: "1px solid var(--tg-border)",
    borderRadius: 8,
    padding: "5px 6px",
    fontSize: 12,
    outline: "none",
    colorScheme: "dark",
  },
  sortRow: {
    display: "flex",
    gap: 4,
  },
  orderBtn: {
    width: 30,
    height: 30,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--tg-bg-input)",
    border: "1px solid var(--tg-border)",
    borderRadius: 8,
    color: "var(--tg-text)",
    fontSize: 14,
    cursor: "pointer",
    flexShrink: 0,
  },
  formatRow: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
  },
  formatChip: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: "4px 8px",
    borderRadius: 6,
    border: "1px solid var(--tg-border)",
    background: "var(--tg-bg-panel)",
    fontSize: 11,
    color: "var(--tg-text-secondary)",
    cursor: "pointer",
  },
  rangeRow: {
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  numInput: {
    flex: 1,
    background: "var(--tg-bg-input)",
    color: "var(--tg-text)",
    border: "1px solid var(--tg-border)",
    borderRadius: 8,
    padding: "5px 6px",
    fontSize: 12,
    outline: "none",
  },
  dash: {
    color: "var(--tg-text-muted)",
    fontSize: 12,
    flexShrink: 0,
  },
  channelList: {
    maxHeight: 150,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 1,
    border: "1px solid var(--tg-border)",
    borderRadius: 8,
    padding: 3,
  },
  chItem: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 8px",
    background: "transparent",
    border: "none",
    borderRadius: 6,
    color: "var(--tg-text-secondary)",
    fontSize: 12,
    cursor: "pointer",
    textAlign: "left",
    width: "100%",
  },
  chItemActive: {
    background: "var(--tg-accent-muted)",
    color: "var(--tg-accent)",
  },
  chCheck: {
    width: 14,
    fontSize: 11,
    color: "var(--tg-accent)",
    fontWeight: 700,
  },
  divider: {
    height: 1,
    background: "var(--tg-border)",
    margin: "2px 0",
  },
  toggleRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    color: "var(--tg-text-secondary)",
    cursor: "pointer",
    padding: "3px 0",
  },
};
