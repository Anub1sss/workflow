import React, { useState, useEffect, useCallback, useRef } from "react";
import { Search, ChevronDown, ChevronUp, Settings, ArrowUpDown, RotateCcw, Star } from "lucide-react";
import { fetchChannels } from "../api";
import { useFavorites } from "../hooks/useFavorites";

const COLUMNS = [
  { key: "title", label: "Канал", fixed: true },
  { key: "subscribers", label: "Подписчики", numeric: true },
  { key: "avg_views_30d", label: "Ср. просмотры", numeric: true },
  { key: "er_pct", label: "ER%", numeric: true, decimal: 2 },
  { key: "err_pct", label: "ERR%", numeric: true, decimal: 2 },
  { key: "visibility_pct", label: "Видимость%", numeric: true, decimal: 1 },
  { key: "posts_30d", label: "Постов/мес", numeric: true },
  { key: "publish_frequency", label: "Частота", numeric: true, decimal: 1 },
  { key: "publish_stability", label: "Стабильн.%", numeric: true },
  { key: "channel_age_days", label: "Возраст", numeric: true },
  { key: "ad_pct_30d", label: "Реклама%", numeric: true, decimal: 1 },
  { key: "gambling_pct_30d", label: "Гемблинг%", numeric: true, decimal: 1 },
  { key: "channel_type_detected", label: "Тип" },
  { key: "has_linked_chat", label: "Чат" },
  { key: "last_post_date", label: "Последний пост" },
];

const DEFAULT_VISIBLE = ["title", "subscribers", "avg_views_30d", "er_pct", "err_pct", "visibility_pct", "posts_30d", "channel_type_detected", "last_post_date"];

function formatNum(n) {
  if (!n && n !== 0) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function timeAgo(ts) {
  if (!ts) return "—";
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 3600) return Math.floor(diff / 60) + " мин";
  if (diff < 86400) return Math.floor(diff / 3600) + " ч";
  if (diff < 2592000) return Math.floor(diff / 86400) + " дн";
  return new Date(ts * 1000).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function erColor(val) {
  if (val >= 1) return "var(--tg-green)";
  if (val >= 0.3) return "var(--tg-orange)";
  return "var(--tg-text-secondary)";
}

function renderCell(ch, col) {
  switch (col.key) {
    case "title":
      return (
        <div style={cellStyles.channelCell}>
          <div style={cellStyles.chAvatar}>
            {ch.image100 && ch.image100.startsWith("http") ? (
              <img src={ch.image100} alt="" style={cellStyles.chAvatarImg}
                onError={e => { e.target.style.display = "none"; }} />
            ) : (
              <span>{(ch.title || "?").charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div style={cellStyles.chInfo}>
            <span style={cellStyles.chName}>{ch.title || ch.username}</span>
            <span style={cellStyles.chUsername}>@{ch.username}</span>
          </div>
        </div>
      );
    case "subscribers":
      return <span style={cellStyles.numVal}>{formatNum(ch.tg_participants || ch.subscribers)}</span>;
    case "avg_views_30d":
      return <span style={cellStyles.numVal}>{formatNum(ch.avg_views_30d || ch.avg_views)}</span>;
    case "er_pct":
      return <span style={{ ...cellStyles.numVal, color: erColor(ch.er_pct || 0) }}>{(ch.er_pct || 0).toFixed(2)}%</span>;
    case "err_pct":
      return <span style={{ ...cellStyles.numVal, color: erColor(ch.err_pct || 0) }}>{(ch.err_pct || 0).toFixed(2)}%</span>;
    case "visibility_pct":
      return <span style={cellStyles.numVal}>{(ch.visibility_pct || 0).toFixed(1)}%</span>;
    case "has_linked_chat":
      return ch.has_linked_chat === 1 ? <span style={cellStyles.chatYes}>✓</span> : <span style={cellStyles.chatNo}>—</span>;
    case "channel_type_detected":
      return <span style={cellStyles.typeTag}>{ch.channel_type_detected || ch.channel_type || "—"}</span>;
    case "last_post_date":
      return <span style={cellStyles.timeVal}>{timeAgo(ch.last_post_date)}</span>;
    case "channel_age_days":
      if (!ch.channel_age_days) return "—";
      return ch.channel_age_days > 365
        ? `${Math.floor(ch.channel_age_days / 365)}г ${Math.floor((ch.channel_age_days % 365) / 30)}м`
        : `${ch.channel_age_days}д`;
    default:
      const val = ch[col.key];
      if (val === null || val === undefined) return "—";
      if (col.decimal !== undefined) return Number(val).toFixed(col.decimal);
      if (col.numeric) return formatNum(val);
      return String(val);
  }
}

function FavStar({ channel }) {
  const { isFavorite, toggle } = useFavorites();
  const fav = isFavorite(channel.username);
  return (
    <button
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: 28, height: 28, border: "none", borderRadius: 6,
        background: "transparent", cursor: "pointer", padding: 0,
        color: fav ? "var(--tg-orange)" : "var(--tg-text-muted)",
        transition: "color 0.15s",
      }}
      onClick={(e) => { e.stopPropagation(); toggle(channel); }}
      title={fav ? "Убрать из избранного" : "В избранное"}
    >
      <Star size={15} fill={fav ? "var(--tg-orange)" : "none"} />
    </button>
  );
}

export default function CatalogView({ onSelectChannel }) {
  const [channels, setChannels] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("subscribers");
  const [order, setOrder] = useState("desc");
  const [visibleCols, setVisibleCols] = useState(() => {
    try {
      const saved = localStorage.getItem("tg_catalog_cols");
      return saved ? JSON.parse(saved) : DEFAULT_VISIBLE;
    } catch { return DEFAULT_VISIBLE; }
  });
  const [colSettingsOpen, setColSettingsOpen] = useState(false);
  const [filterPanel, setFilterPanel] = useState(false);
  const [filters, setFilters] = useState({});

  const sentinelRef = useRef(null);
  const scrollRef = useRef(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    localStorage.setItem("tg_catalog_cols", JSON.stringify(visibleCols));
  }, [visibleCols]);

  const reset = useCallback(() => {
    setChannels([]);
    setPage(1);
    setHasMore(true);
  }, []);

  useEffect(() => { reset(); }, [sort, order, search, filters, reset]);

  const loadPage = useCallback(async (p) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const params = { page: p, sort, order, search: search || undefined, per_page: 50 };
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params[k] = v;
      });
      const result = await fetchChannels(params);
      setChannels(prev => p === 1 ? result.channels : [...prev, ...result.channels]);
      setTotal(result.total);
      setHasMore(p < result.pages);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [sort, order, search, filters]);

  useEffect(() => { loadPage(page); }, [page, loadPage]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loadingRef.current) {
          setPage(prev => prev + 1);
        }
      },
      { root: scrollRef.current, rootMargin: "300px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore]);

  const handleSort = (key) => {
    if (key === "title") return;
    if (sort === key) {
      setOrder(prev => prev === "desc" ? "asc" : "desc");
    } else {
      setSort(key);
      setOrder("desc");
    }
  };

  const toggleCol = (key) => {
    setVisibleCols(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const activeCols = COLUMNS.filter(c => visibleCols.includes(c.key));

  return (
    <div style={styles.container}>
      {/* Top bar */}
      <div style={styles.topBar}>
        <div style={styles.topLeft}>
          <h2 style={styles.heading}>Каталог AI-каналов</h2>
          <span style={styles.totalBadge}>{total}</span>
        </div>

        <div style={styles.topRight}>
          <div style={styles.searchWrap}>
            <Search size={14} color="var(--tg-text-muted)" />
            <input style={styles.searchInput} placeholder="Поиск каналов..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <button style={{ ...styles.toolBtn, ...(filterPanel ? styles.toolBtnActive : {}) }}
            onClick={() => setFilterPanel(p => !p)}>
            <Settings size={15} /> Фильтры
          </button>

          <button style={{ ...styles.toolBtn, ...(colSettingsOpen ? styles.toolBtnActive : {}) }}
            onClick={() => setColSettingsOpen(p => !p)}>
            <ArrowUpDown size={15} /> Колонки
          </button>
        </div>
      </div>

      {/* Filter panel */}
      {filterPanel && (
        <div style={styles.filterRow}>
          <FilterInput label="Мин. подписчиков" value={filters.min_subs}
            onChange={v => setFilters(p => ({ ...p, min_subs: v }))} />
          <FilterInput label="Макс. подписчиков" value={filters.max_subs}
            onChange={v => setFilters(p => ({ ...p, max_subs: v }))} />
          <FilterInput label="Мин. ER%" value={filters.min_er} step="0.01"
            onChange={v => setFilters(p => ({ ...p, min_er: v }))} />
          <FilterInput label="Мин. просмотры" value={filters.min_views}
            onChange={v => setFilters(p => ({ ...p, min_views: v }))} />
          <FilterInput label="Мин. видимость%" value={filters.min_visibility}
            onChange={v => setFilters(p => ({ ...p, min_visibility: v }))} />
          <select style={styles.filterSelect} value={filters.type || ""}
            onChange={e => setFilters(p => ({ ...p, type: e.target.value }))}>
            <option value="">Все типы</option>
            <option value="личный блог">Личный блог</option>
            <option value="гибрид">Гибрид</option>
            <option value="обезличенный">Обезличенный</option>
          </select>
          <label style={styles.filterCheck}>
            <input type="checkbox" checked={filters.has_chat === "1"}
              onChange={e => setFilters(p => ({ ...p, has_chat: e.target.checked ? "1" : "" }))} />
            С чатом
          </label>
          <label style={styles.filterCheck}>
            <input type="checkbox" checked={filters.hide_gambling === "1"}
              onChange={e => setFilters(p => ({ ...p, hide_gambling: e.target.checked ? "1" : "" }))} />
            Без гемблинга
          </label>
          <button style={styles.resetFiltersBtn}
            onClick={() => setFilters({})}>
            <RotateCcw size={12} /> Сбросить
          </button>
        </div>
      )}

      {/* Column settings */}
      {colSettingsOpen && (
        <div style={styles.colSettings}>
          <span style={styles.colSettingsLabel}>Отображаемые колонки:</span>
          {COLUMNS.filter(c => !c.fixed).map(c => (
            <label key={c.key} style={styles.colToggle}>
              <input type="checkbox" checked={visibleCols.includes(c.key)}
                onChange={() => toggleCol(c.key)} />
              {c.label}
            </label>
          ))}
        </div>
      )}

      {/* Table */}
      <div style={styles.tableWrap} ref={scrollRef}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.thNum}>#</th>
              <th style={styles.thStar}><Star size={13} color="var(--tg-orange)" /></th>
              {activeCols.map(col => (
                <th key={col.key}
                  style={{ ...styles.th, ...(col.key === "title" ? styles.thChannel : {}), cursor: col.key !== "title" ? "pointer" : "default" }}
                  onClick={() => handleSort(col.key)}>
                  <span style={styles.thContent}>
                    {col.label}
                    {sort === col.key && (
                      order === "desc" ? <ChevronDown size={12} /> : <ChevronUp size={12} />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {channels.map((ch, idx) => (
              <tr key={ch.username} style={styles.tr}
                onClick={() => onSelectChannel(ch)}
                onMouseEnter={e => e.currentTarget.style.background = "var(--tg-bg-hover)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <td style={styles.tdNum}>{idx + 1}</td>
                <td style={styles.tdStar}><FavStar channel={ch} /></td>
                {activeCols.map(col => (
                  <td key={col.key} style={{ ...styles.td, ...(col.key === "title" ? styles.tdChannel : {}) }}>
                    {renderCell(ch, col)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {loading && (
          <div style={styles.loading}>
            <div style={styles.spinner} />
          </div>
        )}

        <div ref={sentinelRef} style={{ height: 1 }} />
      </div>
    </div>
  );
}

function FilterInput({ label, value, onChange, step }) {
  return (
    <div style={styles.filterField}>
      <label style={styles.filterLabel}>{label}</label>
      <input style={styles.filterInput} type="number" step={step || "1"}
        value={value || ""} onChange={e => onChange(e.target.value)} />
    </div>
  );
}

const cellStyles = {
  channelCell: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  chAvatar: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #5ea5e5, #9b7cd5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: 13,
    color: "#fff",
    flexShrink: 0,
    overflow: "hidden",
  },
  chAvatarImg: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    objectFit: "cover",
  },
  chInfo: {
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  chName: {
    fontSize: 13,
    fontWeight: 600,
    color: "var(--tg-text)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  chUsername: {
    fontSize: 11,
    color: "var(--tg-text-muted)",
  },
  numVal: {
    fontSize: 13,
    fontWeight: 500,
    color: "var(--tg-text)",
  },
  chatYes: {
    color: "var(--tg-green)",
    fontWeight: 700,
  },
  chatNo: {
    color: "var(--tg-text-muted)",
  },
  typeTag: {
    fontSize: 11,
    color: "var(--tg-text-secondary)",
    padding: "2px 6px",
    borderRadius: 4,
    background: "var(--tg-bg-input)",
  },
  timeVal: {
    fontSize: 12,
    color: "var(--tg-text-muted)",
  },
};

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    overflow: "hidden",
  },
  topBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 20px",
    borderBottom: "1px solid var(--tg-border)",
    background: "var(--tg-bg-secondary)",
    flexShrink: 0,
    flexWrap: "wrap",
    gap: 10,
  },
  topLeft: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  heading: {
    fontSize: 16,
    fontWeight: 700,
    color: "var(--tg-text)",
  },
  totalBadge: {
    fontSize: 12,
    color: "var(--tg-text-muted)",
    background: "var(--tg-bg-panel)",
    padding: "2px 8px",
    borderRadius: 10,
    fontWeight: 600,
  },
  topRight: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  searchWrap: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "var(--tg-bg-input)",
    border: "1px solid var(--tg-border)",
    borderRadius: 10,
    padding: "6px 12px",
    minWidth: 200,
  },
  searchInput: {
    flex: 1,
    background: "transparent",
    border: "none",
    color: "var(--tg-text)",
    fontSize: 13,
    outline: "none",
  },
  toolBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 12px",
    border: "1px solid var(--tg-border)",
    borderRadius: 8,
    background: "var(--tg-bg-panel)",
    color: "var(--tg-text-secondary)",
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
  },
  toolBtnActive: {
    background: "var(--tg-accent-muted)",
    color: "var(--tg-accent)",
    borderColor: "var(--tg-accent)",
  },
  filterRow: {
    display: "flex",
    alignItems: "flex-end",
    gap: 10,
    padding: "10px 20px",
    borderBottom: "1px solid var(--tg-border)",
    background: "var(--tg-bg-secondary)",
    flexWrap: "wrap",
    flexShrink: 0,
  },
  filterField: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  filterLabel: {
    fontSize: 10,
    fontWeight: 600,
    color: "var(--tg-text-muted)",
    textTransform: "uppercase",
  },
  filterInput: {
    background: "var(--tg-bg-input)",
    color: "var(--tg-text)",
    border: "1px solid var(--tg-border)",
    borderRadius: 6,
    padding: "5px 8px",
    fontSize: 12,
    outline: "none",
    width: 100,
  },
  filterSelect: {
    background: "var(--tg-bg-input)",
    color: "var(--tg-text)",
    border: "1px solid var(--tg-border)",
    borderRadius: 6,
    padding: "5px 8px",
    fontSize: 12,
    outline: "none",
    cursor: "pointer",
    alignSelf: "flex-end",
  },
  filterCheck: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontSize: 12,
    color: "var(--tg-text-secondary)",
    cursor: "pointer",
    alignSelf: "flex-end",
    padding: "4px 0",
  },
  resetFiltersBtn: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: "5px 10px",
    border: "none",
    borderRadius: 6,
    background: "var(--tg-red-muted)",
    color: "var(--tg-red)",
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
    alignSelf: "flex-end",
  },
  colSettings: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 20px",
    borderBottom: "1px solid var(--tg-border)",
    background: "var(--tg-bg-secondary)",
    flexWrap: "wrap",
    flexShrink: 0,
  },
  colSettingsLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: "var(--tg-text-secondary)",
    marginRight: 4,
  },
  colToggle: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontSize: 12,
    color: "var(--tg-text-secondary)",
    cursor: "pointer",
  },
  tableWrap: {
    flex: 1,
    overflowY: "auto",
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13,
  },
  thNum: {
    width: 36,
    textAlign: "center",
    padding: "10px 4px",
    fontSize: 11,
    fontWeight: 600,
    color: "var(--tg-text-muted)",
    borderBottom: "1px solid var(--tg-border)",
    position: "sticky",
    top: 0,
    background: "var(--tg-bg-secondary)",
    zIndex: 1,
  },
  thStar: {
    width: 36,
    textAlign: "center",
    padding: "10px 4px",
    borderBottom: "1px solid var(--tg-border)",
    position: "sticky",
    top: 0,
    background: "var(--tg-bg-secondary)",
    zIndex: 1,
  },
  tdStar: {
    textAlign: "center",
    padding: "4px",
    verticalAlign: "middle",
  },
  th: {
    padding: "10px 12px",
    textAlign: "left",
    fontSize: 11,
    fontWeight: 600,
    color: "var(--tg-text-muted)",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    borderBottom: "1px solid var(--tg-border)",
    whiteSpace: "nowrap",
    position: "sticky",
    top: 0,
    background: "var(--tg-bg-secondary)",
    zIndex: 1,
  },
  thChannel: {
    minWidth: 200,
  },
  thContent: {
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  tr: {
    cursor: "pointer",
    transition: "background 0.1s",
    borderBottom: "1px solid rgba(255,255,255,0.03)",
  },
  tdNum: {
    textAlign: "center",
    padding: "8px 4px",
    fontSize: 12,
    color: "var(--tg-text-muted)",
  },
  td: {
    padding: "8px 12px",
    verticalAlign: "middle",
  },
  tdChannel: {
    minWidth: 200,
  },
  loading: {
    display: "flex",
    justifyContent: "center",
    padding: 20,
  },
  spinner: {
    width: 20,
    height: 20,
    border: "2px solid var(--tg-border)",
    borderTopColor: "var(--tg-accent)",
    borderRadius: "50%",
    animation: "spin 0.7s linear infinite",
  },
};
