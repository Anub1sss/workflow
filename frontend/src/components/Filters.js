import React, { useEffect, useState, useRef } from "react";
import { Settings, ShieldOff, X, MessageSquare } from "lucide-react";
import { fetchTags } from "../api";

const TYPES = [
  { value: "", label: "Все типы" },
  { value: "личный блог", label: "Личный блог" },
  { value: "гибрид", label: "Гибрид" },
  { value: "обезличенный", label: "Обезличенный" },
];

const SORTS = [
  { value: "subscribers", label: "Подписчики" },
  { value: "avg_views_30d", label: "Ср. просмотры" },
  { value: "er_pct", label: "ER (%)" },
  { value: "err_pct", label: "ERR (%)" },
  { value: "visibility_pct", label: "Видимость (%)" },
  { value: "posts_30d", label: "Постов/мес" },
  { value: "publish_frequency", label: "Частота" },
  { value: "publish_stability", label: "Стабильность" },
  { value: "channel_age_days", label: "Возраст" },
  { value: "ad_pct_30d", label: "Доля рекламы" },
  { value: "gambling_pct_30d", label: "Доля гемблинга" },
  { value: "avg_reactions_30d", label: "Ср. реакции" },
  { value: "avg_comments_30d", label: "Ср. комменты" },
  { value: "ci_index", label: "CI Index" },
  { value: "last_post_date", label: "Последний пост" },
  { value: "last_post_views_dev", label: "Откл. просм. посл. поста" },
  { value: "last_post_reactions_dev", label: "Откл. реакций посл. поста" },
  { value: "created_at", label: "Дата добавления" },
];

const RANGE_FIELDS = [
  { key: "subs", label: "Подписчики", min: "min_subs", max: "max_subs" },
  { key: "views", label: "Ср. просмотры", min: "min_views", max: "max_views" },
  { key: "er", label: "ER (%)", min: "min_er", max: "max_er", step: "0.01" },
  { key: "err", label: "ERR (%)", min: "min_err", max: "max_err", step: "0.01" },
  { key: "visibility", label: "Видимость (%)", min: "min_visibility", max: "max_visibility", step: "0.1" },
  { key: "posts", label: "Постов за 30 дн.", min: "min_posts", max: "max_posts" },
  { key: "frequency", label: "Частота (пост./день)", min: "min_frequency", max: "max_frequency", step: "0.1" },
  { key: "stability", label: "Стабильность (%)", min: "min_stability", max: "max_stability" },
  { key: "age", label: "Возраст (дни)", min: "min_age", max: "max_age" },
  { key: "reactions", label: "Ср. реакции", min: "min_reactions", max: "max_reactions", step: "0.1" },
  { key: "comments", label: "Ср. комменты", min: "min_comments", max: "max_comments", step: "0.1" },
  { key: "forwards", label: "Ср. репосты", min: "min_forwards", max: "max_forwards", step: "0.1" },
  { key: "ad", label: "Доля рекламы (%)", min: "min_ad_pct", max: "max_ad_pct", step: "0.1" },
  { key: "gambl", label: "Доля гемблинга (%)", min: "min_gambling_pct", max: "max_gambling_pct", step: "0.1" },
  { key: "lp_vd", label: "Откл. просм. посл. поста (%)", min: "min_lp_views_dev", max: "max_lp_views_dev" },
  { key: "lp_rd", label: "Откл. реакций посл. поста (%)", min: "min_lp_reactions_dev", max: "max_lp_reactions_dev" },
  { key: "lp_cd", label: "Откл. комментов посл. поста (%)", min: "min_lp_comments_dev", max: "max_lp_comments_dev" },
  { key: "lp_fd", label: "Откл. репостов посл. поста (%)", min: "min_lp_forwards_dev", max: "max_lp_forwards_dev" },
];

export default function Filters({ filters, setFilters }) {
  const [tags, setTags] = useState([]);
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => { fetchTags().then(setTags).catch(() => {}); }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const update = (key, val) => setFilters(prev => ({ ...prev, [key]: val }));

  const activeCount = Object.entries(filters).filter(
    ([k, v]) => v && k !== "sort" && k !== "order"
  ).length;

  const reset = () => {
    const clean = {};
    Object.keys(filters).forEach(k => { clean[k] = k === "sort" ? "subscribers" : k === "order" ? "desc" : ""; });
    setFilters(clean);
  };

  const LABEL_MAP = {};
  RANGE_FIELDS.forEach(f => {
    LABEL_MAP[f.min] = f.label + " от";
    LABEL_MAP[f.max] = f.label + " до";
  });
  LABEL_MAP.hide_gambling = "Без гемблинга";
  LABEL_MAP.has_chat = "С чатом";
  LABEL_MAP.type = "Тип";
  LABEL_MAP.tag = "Тег";

  const activeTags = Object.entries(filters)
    .filter(([k, v]) => v && k !== "sort" && k !== "order")
    .slice(0, 8)
    .map(([k, v]) => {
      const base = LABEL_MAP[k];
      if (base && (k === "hide_gambling" || k === "has_chat")) return { key: k, label: base };
      if (base) return { key: k, label: `${base} ${v}` };
      return { key: k, label: `${k}: ${v}` };
    });

  return (
    <div style={s.wrapper} ref={panelRef}>
      <div style={s.topBar}>
        <button style={{ ...s.gearBtn, ...(open ? s.gearActive : {}) }}
          onClick={() => setOpen(p => !p)}>
          <Settings size={18} />
          {activeCount > 0 && <span style={s.badge}>{activeCount}</span>}
        </button>

        <select style={s.sortSel} value={filters.sort} onChange={e => update("sort", e.target.value)}>
          {SORTS.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}
        </select>

        <button style={s.orderBtn} onClick={() => update("order", filters.order === "desc" ? "asc" : "desc")}>
          {filters.order === "desc" ? "↓" : "↑"}
        </button>

        {activeTags.map(t => (
          <span key={t.key} style={s.chip}>
            {t.label}
            <button style={s.chipX} onClick={() => update(t.key, "")}><X size={9} /></button>
          </span>
        ))}
        {activeCount > 8 && <span style={s.moreChip}>+{activeCount - 8}</span>}
      </div>

      {open && (
        <div style={s.panel}>
          <div style={s.panelHead}>
            <span style={s.panelTitle}>Расширенные фильтры</span>
            {activeCount > 0 && <button style={s.resetBtn} onClick={reset}>Сбросить</button>}
          </div>

          <Field label="Сортировка">
            <select style={s.sel} value={filters.sort} onChange={e => update("sort", e.target.value)}>
              {SORTS.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}
            </select>
          </Field>

          <Field label="Тип канала">
            <select style={s.sel} value={filters.type} onChange={e => update("type", e.target.value)}>
              {TYPES.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}
            </select>
          </Field>

          {tags.length > 0 && (
            <Field label="Тег">
              <select style={s.sel} value={filters.tag || ""} onChange={e => update("tag", e.target.value)}>
                <option value="">Все теги</option>
                {tags.map(t => <option key={t.tag} value={t.tag}>{t.tag} ({t.count})</option>)}
              </select>
            </Field>
          )}

          <div style={s.divider} />

          {RANGE_FIELDS.map(f => (
            <Field key={f.key} label={f.label}>
              <div style={s.range}>
                <input style={s.inp} type="number" step={f.step || "1"} placeholder="от"
                  value={filters[f.min] || ""} onChange={e => update(f.min, e.target.value)} />
                <span style={s.dash}>—</span>
                <input style={s.inp} type="number" step={f.step || "1"} placeholder="до"
                  value={filters[f.max] || ""} onChange={e => update(f.max, e.target.value)} />
              </div>
            </Field>
          ))}

          <div style={s.divider} />

          <div style={s.toggles}>
            <Toggle active={filters.hide_gambling === "1"}
              onClick={() => update("hide_gambling", filters.hide_gambling === "1" ? "" : "1")}
              icon={<ShieldOff size={14} />} label="Скрыть гемблинг и рекламу"
              color="green" />
            <Toggle active={filters.has_chat === "1"}
              onClick={() => update("has_chat", filters.has_chat === "1" ? "" : "1")}
              icon={<MessageSquare size={14} />} label="Только с привязанным чатом"
              color="blue" />
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return <div style={s.field}><label style={s.label}>{label}</label>{children}</div>;
}

function Toggle({ active, onClick, icon, label, color }) {
  const colors = {
    green: { bg: "var(--green-muted)", c: "var(--green)", bc: "rgba(34,197,94,0.4)" },
    blue: { bg: "var(--accent-muted)", c: "var(--accent)", bc: "rgba(99,102,241,0.4)" },
  };
  const ac = colors[color] || colors.blue;
  return (
    <button style={{ ...s.toggle, ...(active ? { background: ac.bg, color: ac.c, borderColor: ac.bc } : {}) }}
      onClick={onClick}>{icon} <span>{label}</span></button>
  );
}

const s = {
  wrapper: { padding: "12px 0", position: "relative" },
  topBar: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  gearBtn: {
    width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center",
    background: "var(--bg-card)", border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)", color: "var(--text-secondary)",
    cursor: "pointer", position: "relative",
  },
  gearActive: { background: "var(--accent-muted)", color: "var(--accent)", borderColor: "rgba(99,102,241,0.4)" },
  badge: {
    position: "absolute", top: -4, right: -4, width: 18, height: 18, borderRadius: "50%",
    background: "var(--accent)", color: "#fff", fontSize: 10, fontWeight: 700,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  sortSel: {
    background: "var(--bg-card)", color: "var(--text-primary)",
    border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
    padding: "7px 12px", fontSize: 13, cursor: "pointer", outline: "none",
  },
  orderBtn: {
    width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
    background: "var(--bg-card)", border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)", color: "var(--text-primary)", fontSize: 15, cursor: "pointer",
  },
  chip: {
    display: "flex", alignItems: "center", gap: 4, padding: "2px 7px", borderRadius: 5,
    fontSize: 10, fontWeight: 600, background: "var(--accent-muted)", color: "var(--accent)",
    border: "1px solid rgba(99,102,241,0.3)",
  },
  chipX: {
    display: "flex", alignItems: "center", justifyContent: "center", width: 12, height: 12,
    borderRadius: "50%", background: "rgba(99,102,241,0.2)", border: "none",
    color: "var(--accent)", cursor: "pointer",
  },
  moreChip: { fontSize: 10, color: "var(--text-secondary)" },
  panel: {
    position: "absolute", top: "100%", left: 0, zIndex: 50,
    background: "var(--bg-secondary)", border: "1px solid var(--border)",
    borderRadius: 12, padding: 20, marginTop: 8,
    width: 380, maxHeight: "80vh", overflowY: "auto",
    boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
    display: "flex", flexDirection: "column", gap: 10,
  },
  panelHead: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  panelTitle: { fontSize: 15, fontWeight: 700 },
  resetBtn: { background: "none", border: "none", color: "var(--red)", fontSize: 12, fontWeight: 500, cursor: "pointer" },
  field: { display: "flex", flexDirection: "column", gap: 3 },
  label: { fontSize: 10, color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.3 },
  sel: {
    background: "var(--bg-card)", color: "var(--text-primary)",
    border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
    padding: "6px 10px", fontSize: 12, cursor: "pointer", outline: "none", width: "100%",
  },
  range: { display: "flex", alignItems: "center", gap: 6 },
  inp: {
    flex: 1, background: "var(--bg-card)", color: "var(--text-primary)",
    border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
    padding: "6px 8px", fontSize: 12, outline: "none", boxSizing: "border-box",
  },
  dash: { color: "var(--text-secondary)", fontSize: 13, flexShrink: 0 },
  divider: { height: 1, background: "var(--border)", margin: "4px 0" },
  toggles: { display: "flex", flexDirection: "column", gap: 6 },
  toggle: {
    display: "flex", alignItems: "center", gap: 6, padding: "7px 12px",
    background: "var(--bg-card)", border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)", color: "var(--text-secondary)",
    fontSize: 12, fontWeight: 500, cursor: "pointer", width: "100%",
  },
};
