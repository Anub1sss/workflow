import React, { useState, useEffect } from "react";
import { X, Newspaper, Users, Zap, TrendingUp, Star, Filter } from "lucide-react";
import { fetchChannelsList, fetchCategories } from "../api";

const PRESETS = [
  {
    icon: <Newspaper size={20} />,
    title: "Лента постов",
    desc: "Все посты по дате",
    type: "posts",
    filters: { sort: "date", order: "desc" },
  },
  {
    icon: <Zap size={20} />,
    title: "Вирусные посты",
    desc: "Посты с макс. отклонением",
    type: "posts",
    filters: { sort: "views_dev", order: "desc" },
  },
  {
    icon: <Users size={20} />,
    title: "Топ каналы",
    desc: "По подписчикам",
    type: "feed",
    filters: { sort: "subscribers", order: "desc" },
  },
  {
    icon: <TrendingUp size={20} />,
    title: "Лучший ER",
    desc: "Каналы с макс. вовлечённостью",
    type: "feed",
    filters: { sort: "er_pct", order: "desc" },
  },
  {
    icon: <Star size={20} />,
    title: "Свежие посты",
    desc: "Последние обновления",
    type: "feed",
    filters: { sort: "last_post_date", order: "desc" },
  },
  {
    icon: <Filter size={20} />,
    title: "Своя колонка",
    desc: "Настрой сам",
    type: "custom",
    filters: {},
  },
];

export default function AddColumnPanel({ onAdd, onCancel }) {
  const [step, setStep] = useState("presets");
  const [customType, setCustomType] = useState("posts");
  const [customTitle, setCustomTitle] = useState("");
  const [channels, setChannels] = useState([]);
  const [selectedChannels, setSelectedChannels] = useState([]);
  const [chSearch, setChSearch] = useState("");
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");

  useEffect(() => {
    fetchChannelsList().then(setChannels).catch(() => {});
    fetchCategories().then(setCategories).catch(() => {});
  }, []);

  const handlePreset = (preset) => {
    if (preset.type === "custom") {
      setStep("custom");
      return;
    }
    onAdd({
      title: preset.title,
      type: preset.type,
      filters: preset.filters,
    });
  };

  const handleCustomAdd = () => {
    const filters = {};
    if (selectedChannels.length > 0) filters.channels = selectedChannels.join(",");
    if (selectedCategory) filters.category = selectedCategory;
    onAdd({
      title: customTitle || (customType === "posts" ? "Посты" : "Каналы"),
      type: customType,
      filters,
    });
  };

  const filtered = chSearch
    ? channels.filter(ch =>
        ch.username.toLowerCase().includes(chSearch.toLowerCase()) ||
        (ch.title && ch.title.toLowerCase().includes(chSearch.toLowerCase()))
      )
    : channels;

  return (
    <div style={styles.column}>
      <div style={styles.header}>
        <span style={styles.headerTitle}>
          {step === "presets" ? "Добавить колонку" : "Своя колонка"}
        </span>
        <button style={styles.closeBtn} onClick={onCancel}>
          <X size={16} />
        </button>
      </div>

      {step === "presets" && (
        <div style={styles.presetsList}>
          {PRESETS.map((p, i) => (
            <button key={i} style={styles.presetBtn} onClick={() => handlePreset(p)}>
              <div style={styles.presetIcon}>{p.icon}</div>
              <div style={styles.presetInfo}>
                <span style={styles.presetTitle}>{p.title}</span>
                <span style={styles.presetDesc}>{p.desc}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {step === "custom" && (
        <div style={styles.customForm}>
          <div style={styles.field}>
            <label style={styles.label}>Название</label>
            <input style={styles.input} value={customTitle}
              onChange={e => setCustomTitle(e.target.value)}
              placeholder="Моя колонка" />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Тип</label>
            <div style={styles.typeRow}>
              <button style={{ ...styles.typeBtn, ...(customType === "posts" ? styles.typeBtnActive : {}) }}
                onClick={() => setCustomType("posts")}>Посты</button>
              <button style={{ ...styles.typeBtn, ...(customType === "feed" ? styles.typeBtnActive : {}) }}
                onClick={() => setCustomType("feed")}>Каналы</button>
            </div>
          </div>

          {customType === "posts" && categories.length > 0 && (
            <div style={styles.field}>
              <label style={styles.label}>Категория</label>
              <select style={styles.select} value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}>
                <option value="">Все</option>
                {categories.map(c => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {customType === "posts" && (
            <div style={styles.field}>
              <label style={styles.label}>
                Каналы {selectedChannels.length > 0 && `(${selectedChannels.length})`}
              </label>
              <input style={styles.input} placeholder="Поиск..."
                value={chSearch} onChange={e => setChSearch(e.target.value)} />
              <div style={styles.chList}>
                {filtered.slice(0, 50).map(ch => {
                  const active = selectedChannels.includes(ch.username);
                  return (
                    <button key={ch.username}
                      style={{ ...styles.chItem, ...(active ? styles.chItemActive : {}) }}
                      onClick={() => setSelectedChannels(prev =>
                        active ? prev.filter(u => u !== ch.username) : [...prev, ch.username]
                      )}>
                      {active ? "✓ " : ""}@{ch.username}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <button style={styles.addBtn} onClick={handleCustomAdd}>
            Добавить колонку
          </button>
          <button style={styles.backBtn} onClick={() => setStep("presets")}>
            ← Назад к шаблонам
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  column: {
    width: 380,
    minWidth: 380,
    height: "100%",
    display: "flex",
    flexDirection: "column",
    borderRight: "1px solid var(--tg-border)",
    background: "var(--tg-bg-secondary)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 14px",
    borderBottom: "1px solid var(--tg-border)",
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: "var(--tg-text)",
  },
  closeBtn: {
    width: 30,
    height: 30,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "none",
    borderRadius: 8,
    background: "transparent",
    color: "var(--tg-text-muted)",
    cursor: "pointer",
  },
  presetsList: {
    flex: 1,
    overflowY: "auto",
    padding: 8,
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  presetBtn: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "14px 12px",
    border: "1px solid var(--tg-border)",
    borderRadius: 12,
    background: "var(--tg-bg-panel)",
    cursor: "pointer",
    textAlign: "left",
    transition: "border-color 0.15s",
    width: "100%",
    color: "var(--tg-text)",
  },
  presetIcon: {
    width: 40,
    height: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    background: "var(--tg-accent-muted)",
    color: "var(--tg-accent)",
    flexShrink: 0,
  },
  presetInfo: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  presetTitle: {
    fontSize: 14,
    fontWeight: 600,
  },
  presetDesc: {
    fontSize: 12,
    color: "var(--tg-text-muted)",
  },
  customForm: {
    flex: 1,
    overflowY: "auto",
    padding: 14,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: 600,
    color: "var(--tg-text-muted)",
    textTransform: "uppercase",
  },
  input: {
    background: "var(--tg-bg-input)",
    color: "var(--tg-text)",
    border: "1px solid var(--tg-border)",
    borderRadius: 8,
    padding: "8px 10px",
    fontSize: 13,
    outline: "none",
  },
  select: {
    background: "var(--tg-bg-input)",
    color: "var(--tg-text)",
    border: "1px solid var(--tg-border)",
    borderRadius: 8,
    padding: "8px 10px",
    fontSize: 13,
    outline: "none",
    cursor: "pointer",
  },
  typeRow: {
    display: "flex",
    gap: 6,
  },
  typeBtn: {
    flex: 1,
    padding: "8px 0",
    border: "1px solid var(--tg-border)",
    borderRadius: 8,
    background: "var(--tg-bg-panel)",
    color: "var(--tg-text-secondary)",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  },
  typeBtnActive: {
    background: "var(--tg-accent-muted)",
    color: "var(--tg-accent)",
    borderColor: "var(--tg-accent)",
  },
  chList: {
    maxHeight: 200,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 2,
    border: "1px solid var(--tg-border)",
    borderRadius: 8,
    padding: 4,
  },
  chItem: {
    display: "block",
    padding: "5px 8px",
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
  addBtn: {
    padding: "10px 0",
    borderRadius: 10,
    border: "none",
    background: "var(--tg-accent)",
    color: "#fff",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    marginTop: 8,
  },
  backBtn: {
    padding: "8px 0",
    border: "none",
    background: "transparent",
    color: "var(--tg-text-muted)",
    fontSize: 13,
    cursor: "pointer",
  },
};
