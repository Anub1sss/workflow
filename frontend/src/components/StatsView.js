import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import {
  Users, Search, X, SlidersHorizontal, Columns3,
  ChevronDown, ChevronUp, Star, RotateCcw, Clock, GitCompare, Download,
} from "lucide-react";
import {
  fetchChannels, fetchPostingHours, fetchCompareChannels, fetchChannelsList,
} from "../api";
import { useFavorites } from "../hooks/useFavorites";

const COLORS = ["#5ea5e5", "#9b7cd5", "#4fae4e", "#e8a447", "#e05353", "#5bcbcf", "#d75fa0", "#e88a47"];

const ALL_COLUMNS = [
  { key: "title", label: "Название", fixed: true, defaultVisible: true },
  { key: "subscribers", label: "Подписчики", numeric: true, defaultVisible: true },
  { key: "ci_index", label: "Ads Index", numeric: true, defaultVisible: true },
  { key: "avg_views_30d", label: "Просмотры", numeric: true, defaultVisible: true },
  { key: "er_pct", label: "ER", numeric: true, decimal: 2, defaultVisible: true },
  { key: "category_tgstat", label: "Категория", defaultVisible: true },
  { key: "publish_frequency", label: "Частота", numeric: true, decimal: 1, defaultVisible: true },
  { key: "err_pct", label: "ERR%", numeric: true, decimal: 2, defaultVisible: false },
  { key: "visibility_pct", label: "Видимость%", numeric: true, decimal: 1, defaultVisible: false },
  { key: "posts_30d", label: "Постов/мес", numeric: true, defaultVisible: false },
  { key: "publish_stability", label: "Стабильн.%", numeric: true, defaultVisible: false },
  { key: "channel_age_days", label: "Возраст", numeric: true, defaultVisible: false },
  { key: "ad_pct_30d", label: "Реклама%", numeric: true, decimal: 1, defaultVisible: false },
  { key: "gambling_pct_30d", label: "Гемблинг%", numeric: true, decimal: 1, defaultVisible: false },
  { key: "channel_type_detected", label: "Тип", defaultVisible: false },
  { key: "has_linked_chat", label: "Чат", defaultVisible: false },
  { key: "country", label: "Страна", defaultVisible: false },
  { key: "language", label: "Язык", defaultVisible: false },
  { key: "last_post_date", label: "Последний пост", defaultVisible: false },
];

const DEFAULT_VISIBLE = ALL_COLUMNS.filter(c => c.defaultVisible).map(c => c.key);

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
  if (val >= 5) return "var(--tg-green)";
  if (val >= 1) return "#7bc67b";
  if (val >= 0.3) return "var(--tg-orange)";
  return "var(--tg-text-secondary)";
}

function renderCell(ch, col) {
  switch (col.key) {
    case "title":
      return (
        <div style={cellS.channelCell}>
          <div style={cellS.avatar}>
            {ch.image100 && ch.image100.startsWith("http") ? (
              <img src={ch.image100} alt="" style={cellS.avatarImg}
                onError={e => { e.target.style.display = "none"; }} />
            ) : (
              <span>{(ch.title || "?").charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div style={cellS.info}>
            <span style={cellS.name}>{ch.title || ch.username}</span>
            <span style={cellS.username}>
              {ch.channel_type_detected === "закрытый" ? "Закрытый канал" : "Публичный канал"}
            </span>
          </div>
        </div>
      );
    case "subscribers":
      return <span style={cellS.numVal}>{formatNum(ch.tg_participants || ch.subscribers)}</span>;
    case "ci_index":
      return <span style={cellS.numVal}>{ch.ci_index ? formatNum(ch.ci_index) : "—"}</span>;
    case "avg_views_30d":
      return <span style={cellS.numVal}>{formatNum(ch.avg_views_30d || ch.avg_views)}</span>;
    case "er_pct": {
      const v = ch.er_pct || 0;
      return <span style={{ ...cellS.numVal, color: erColor(v) }}>{v.toFixed(2)}%</span>;
    }
    case "err_pct": {
      const v = ch.err_pct || 0;
      return <span style={{ ...cellS.numVal, color: erColor(v) }}>{v.toFixed(2)}%</span>;
    }
    case "category_tgstat":
      return ch.category_tgstat
        ? <span style={cellS.categoryTag}>{ch.category_tgstat}</span>
        : <span style={cellS.muted}>{ch.primary_niche || "—"}</span>;
    case "visibility_pct":
      return <span style={cellS.numVal}>{(ch.visibility_pct || 0).toFixed(1)}%</span>;
    case "has_linked_chat":
      return ch.has_linked_chat === 1 ? <span style={cellS.chatYes}>✓</span> : <span style={cellS.muted}>—</span>;
    case "channel_type_detected":
      return <span style={cellS.typeTag}>{ch.channel_type_detected || ch.channel_type || "—"}</span>;
    case "last_post_date":
      return <span style={cellS.muted}>{timeAgo(ch.last_post_date)}</span>;
    case "channel_age_days":
      if (!ch.channel_age_days) return "—";
      return ch.channel_age_days > 365
        ? `${Math.floor(ch.channel_age_days / 365)}г ${Math.floor((ch.channel_age_days % 365) / 30)}м`
        : `${ch.channel_age_days}д`;
    case "country":
      return <span style={cellS.muted}>{ch.country || "—"}</span>;
    case "language":
      return <span style={cellS.muted}>{ch.language || "—"}</span>;
    default: {
      const val = ch[col.key];
      if (val === null || val === undefined) return "—";
      if (col.decimal !== undefined) return Number(val).toFixed(col.decimal);
      if (col.numeric) return formatNum(val);
      return String(val);
    }
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

export default function StatsView({ onSelectChannel }) {
  const [tab, setTab] = useState("catalog");

  return (
    <div style={s.container}>
      <div style={s.tabBar}>
        {[
          { id: "catalog", label: "Каналы", icon: <Users size={14} /> },
          { id: "hours", label: "Время публикаций", icon: <Clock size={14} /> },
          { id: "compare", label: "Сравнение каналов", icon: <GitCompare size={14} /> },
        ].map(t => (
          <button
            key={t.id}
            style={{ ...s.tab, ...(tab === t.id ? s.tabActive : {}) }}
            onClick={() => setTab(t.id)}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === "catalog" && <CatalogTab onSelectChannel={onSelectChannel} />}
      {tab === "hours" && <HoursTab />}
      {tab === "compare" && <CompareTab />}
    </div>
  );
}

/* ==================== CATALOG TAB ==================== */
function CatalogTab({ onSelectChannel }) {
  const [channels, setChannels] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("subscribers");
  const [order, setOrder] = useState("desc");
  const [filterOpen, setFilterOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [filters, setFilters] = useState({});
  const [visibleCols, setVisibleCols] = useState(() => {
    try {
      const saved = localStorage.getItem("tg_catalog_cols_v2");
      return saved ? JSON.parse(saved) : DEFAULT_VISIBLE;
    } catch { return DEFAULT_VISIBLE; }
  });

  const sentinelRef = useRef(null);
  const scrollRef = useRef(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    localStorage.setItem("tg_catalog_cols_v2", JSON.stringify(visibleCols));
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

  const activeCols = ALL_COLUMNS.filter(c => visibleCols.includes(c.key));
  const activeFilterCount = Object.values(filters).filter(v => v).length;

  return (
    <div style={s.catalogContainer}>
      {/* Top toolbar */}
      <div style={s.toolbar}>
        <div style={s.toolbarLeft}>
          <h2 style={s.heading}>Telegram каналы</h2>
          <span style={s.totalBadge}>{formatNum(total)}</span>
        </div>
        <div style={s.toolbarRight}>
          <div style={s.searchWrap}>
            <Search size={14} color="var(--tg-text-muted)" />
            <input style={s.searchInput} placeholder="Войдите, чтобы искать"
              value={search} onChange={e => setSearch(e.target.value)} />
            {search && (
              <button style={s.searchClear} onClick={() => setSearch("")}>
                <X size={12} />
              </button>
            )}
          </div>

          <button
            style={{ ...s.toolBtn, ...(customizeOpen ? s.toolBtnActive : {}) }}
            onClick={() => { setCustomizeOpen(p => !p); setFilterOpen(false); }}
          >
            <Columns3 size={14} /> Кастомизация
          </button>

          <button style={s.toolBtn} title="Экспорт (скоро)">
            <Download size={14} /> Экспорт
          </button>

          <button
            style={{
              ...s.toolBtn,
              ...(filterOpen ? s.toolBtnActive : {}),
              ...(activeFilterCount > 0 ? { borderColor: "var(--tg-accent)", color: "var(--tg-accent)" } : {}),
            }}
            onClick={() => { setFilterOpen(p => !p); setCustomizeOpen(false); }}
          >
            <SlidersHorizontal size={14} /> Фильтр
            {activeFilterCount > 0 && <span style={s.filterBadge}>{activeFilterCount}</span>}
          </button>
        </div>
      </div>

      {/* Customization panel */}
      {customizeOpen && (
        <div style={s.panelRow}>
          <span style={s.panelLabel}>Колонки таблицы:</span>
          <div style={s.panelChips}>
            {ALL_COLUMNS.filter(c => !c.fixed).map(c => (
              <label key={c.key} style={{
                ...s.panelChip,
                ...(visibleCols.includes(c.key) ? s.panelChipActive : {}),
              }}>
                <input type="checkbox" checked={visibleCols.includes(c.key)}
                  onChange={() => toggleCol(c.key)} style={{ display: "none" }} />
                {c.label}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Filter panel */}
      {filterOpen && (
        <div style={s.filterPanel}>
          <div style={s.filterGrid}>
            <FilterInput label="Мин. подписчиков" value={filters.min_subs}
              onChange={v => setFilters(p => ({ ...p, min_subs: v }))} />
            <FilterInput label="Макс. подписчиков" value={filters.max_subs}
              onChange={v => setFilters(p => ({ ...p, max_subs: v }))} />
            <FilterInput label="Мин. ER%" value={filters.min_er} step="0.01"
              onChange={v => setFilters(p => ({ ...p, min_er: v }))} />
            <FilterInput label="Макс. ER%" value={filters.max_er} step="0.01"
              onChange={v => setFilters(p => ({ ...p, max_er: v }))} />
            <FilterInput label="Мин. просмотры" value={filters.min_views}
              onChange={v => setFilters(p => ({ ...p, min_views: v }))} />
            <FilterInput label="Макс. просмотры" value={filters.max_views}
              onChange={v => setFilters(p => ({ ...p, max_views: v }))} />
            <FilterInput label="Мин. видимость%" value={filters.min_visibility}
              onChange={v => setFilters(p => ({ ...p, min_visibility: v }))} />
            <FilterInput label="Мин. постов/мес" value={filters.min_posts}
              onChange={v => setFilters(p => ({ ...p, min_posts: v }))} />
            <FilterInput label="Мин. частота" value={filters.min_frequency} step="0.1"
              onChange={v => setFilters(p => ({ ...p, min_frequency: v }))} />
            <FilterInput label="Мин. стабильность%" value={filters.min_stability}
              onChange={v => setFilters(p => ({ ...p, min_stability: v }))} />
            <FilterInput label="Макс. реклама%" value={filters.max_ad_pct} step="0.1"
              onChange={v => setFilters(p => ({ ...p, max_ad_pct: v }))} />
            <FilterInput label="Макс. гемблинг%" value={filters.max_gambling_pct} step="0.1"
              onChange={v => setFilters(p => ({ ...p, max_gambling_pct: v }))} />
          </div>
          <div style={s.filterBottom}>
            <select style={s.filterSelect} value={filters.type || ""}
              onChange={e => setFilters(p => ({ ...p, type: e.target.value }))}>
              <option value="">Все типы</option>
              <option value="личный блог">Личный блог</option>
              <option value="гибрид">Гибрид</option>
              <option value="обезличенный">Обезличенный</option>
            </select>
            <label style={s.filterCheckLabel}>
              <input type="checkbox" checked={filters.has_chat === "1"}
                onChange={e => setFilters(p => ({ ...p, has_chat: e.target.checked ? "1" : "" }))} />
              С чатом
            </label>
            <label style={s.filterCheckLabel}>
              <input type="checkbox" checked={filters.hide_gambling === "1"}
                onChange={e => setFilters(p => ({ ...p, hide_gambling: e.target.checked ? "1" : "" }))} />
              Без гемблинга
            </label>
            <button style={s.resetBtn} onClick={() => setFilters({})}>
              <RotateCcw size={12} /> Сбросить
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={s.tableWrap} ref={scrollRef}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.thNum}>#</th>
              <th style={s.thStar}></th>
              {activeCols.map(col => (
                <th
                  key={col.key}
                  style={{
                    ...s.th,
                    ...(col.key === "title" ? s.thTitle : {}),
                    cursor: col.key !== "title" ? "pointer" : "default",
                  }}
                  onClick={() => handleSort(col.key)}
                >
                  <span style={s.thContent}>
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
              <tr
                key={ch.username}
                style={s.tr}
                onClick={() => onSelectChannel && onSelectChannel(ch)}
                onMouseEnter={e => e.currentTarget.style.background = "var(--tg-bg-hover)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <td style={s.tdNum}>{idx + 1}</td>
                <td style={s.tdStar}><FavStar channel={ch} /></td>
                {activeCols.map(col => (
                  <td key={col.key} style={{ ...s.td, ...(col.key === "title" ? s.tdTitle : {}) }}>
                    {renderCell(ch, col)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {loading && (
          <div style={s.loadingRow}>
            <div style={s.spinner} />
          </div>
        )}

        <div ref={sentinelRef} style={{ height: 1 }} />
      </div>
    </div>
  );
}

/* ==================== HOURS TAB ==================== */
function HoursTab() {
  const [hours, setHours] = useState([]);
  const [loading, setLoading] = useState(false);
  const { favorites } = useFavorites();

  useEffect(() => {
    setLoading(true);
    const params = favorites.length > 0
      ? { channels: favorites.map(f => f.username).join(",") }
      : {};
    fetchPostingHours(params)
      .then(setHours)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [favorites]);

  if (loading) return <div style={s.emptyState}>Загрузка...</div>;

  const best = hours.length > 0
    ? [...hours].sort((a, b) => b.count - a.count).slice(0, 3)
    : [];

  return (
    <div style={s.tabContent}>
      <div style={s.card}>
        <h3 style={s.cardTitle}>
          <Clock size={16} /> Лучшее время публикации
        </h3>
        <p style={s.cardSubtitle}>
          {favorites.length > 0
            ? `По избранным каналам (${favorites.length})`
            : "По всем каналам"}
        </p>
        {hours.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={hours} margin={{ left: 0, right: 10 }}>
                <XAxis dataKey="hour" tick={{ fill: "var(--tg-text-secondary)", fontSize: 11 }}
                  tickFormatter={h => `${h}:00`} />
                <YAxis tick={{ fill: "var(--tg-text-muted)", fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle}
                  formatter={(val) => [val, "Постов"]}
                  labelFormatter={(h) => `${h}:00 — ${h}:59`} />
                <Bar dataKey="count" fill="var(--tg-accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            {best.length > 0 && (
              <div style={s.bestHours}>
                <span style={s.bestLabel}>Пиковые часы:</span>
                {best.map(h => (
                  <span key={h.hour} style={s.bestChip}>{h.hour}:00 ({h.count})</span>
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={s.emptyState}>Нет данных</div>
        )}
      </div>
    </div>
  );
}

/* ==================== COMPARE TAB ==================== */
function CompareTab() {
  const [searchVal, setSearchVal] = useState("");
  const [channelsList, setChannelsList] = useState([]);
  const [selected, setSelected] = useState([]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchChannelsList().then(setChannelsList).catch(() => {});
  }, []);

  const toggle = (username) => {
    setSelected(prev =>
      prev.includes(username) ? prev.filter(u => u !== username) : [...prev, username]
    );
  };

  useEffect(() => {
    if (selected.length < 2) { setData([]); return; }
    setLoading(true);
    fetchCompareChannels({ channels: selected.join(",") })
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selected]);

  const filtered = searchVal
    ? channelsList.filter(ch =>
        ch.username.toLowerCase().includes(searchVal.toLowerCase()) ||
        (ch.title && ch.title.toLowerCase().includes(searchVal.toLowerCase()))
      )
    : channelsList;

  const radarData = data.length > 0 ? (() => {
    const mx = {
      subs: Math.max(...data.map(c => c.tg_participants || c.subscribers || 1)),
      views: Math.max(...data.map(c => c.avg_views_30d || c.avg_views || 1)),
      er: Math.max(...data.map(c => c.er_pct || 0.01)),
      freq: Math.max(...data.map(c => c.publish_frequency || 0.01)),
      react: Math.max(...data.map(c => c.avg_reactions_30d || 0.01)),
    };
    return ["Подписчики", "Просмотры", "ER", "Частота", "Реакции"].map((name, i) => {
      const point = { metric: name };
      data.forEach(ch => {
        const vals = [
          ((ch.tg_participants || ch.subscribers || 0) / mx.subs) * 100,
          ((ch.avg_views_30d || ch.avg_views || 0) / mx.views) * 100,
          ((ch.er_pct || 0) / mx.er) * 100,
          ((ch.publish_frequency || 0) / mx.freq) * 100,
          ((ch.avg_reactions_30d || 0) / mx.react) * 100,
        ];
        point[ch.username] = Math.round(vals[i]);
      });
      return point;
    });
  })() : [];

  return (
    <div style={s.tabContent}>
      {/* Selector */}
      <div style={s.card}>
        <h3 style={s.cardTitle}><GitCompare size={16} /> Сравнение каналов</h3>
        <div style={s.compareSearch}>
          <Search size={14} color="var(--tg-text-muted)" />
          <input style={s.compareInput} placeholder="Найти канал..."
            value={searchVal} onChange={e => setSearchVal(e.target.value)} />
          {searchVal && (
            <button style={s.compareClear} onClick={() => setSearchVal("")}>
              <X size={12} />
            </button>
          )}
        </div>
        {selected.length > 0 && (
          <div style={s.chipRow}>
            {selected.map(u => (
              <span key={u} style={s.chip}>
                @{u}
                <button style={s.chipX} onClick={() => toggle(u)}><X size={10} /></button>
              </span>
            ))}
          </div>
        )}
        <div style={s.compareList}>
          {filtered.slice(0, 30).map(ch => {
            const active = selected.includes(ch.username);
            return (
              <button key={ch.username}
                style={{ ...s.compareItem, ...(active ? s.compareItemActive : {}) }}
                onClick={() => toggle(ch.username)}>
                <span style={s.compareCheck}>{active ? "✓" : ""}</span>
                @{ch.username}
                {ch.title && <span style={s.compareItemTitle}>{ch.title}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {loading && <div style={s.emptyState}>Загрузка...</div>}

      {data.length >= 2 && (
        <>
          <div style={s.card}>
            <h3 style={s.cardTitle}>Радар-сравнение</h3>
            <ResponsiveContainer width="100%" height={350}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--tg-border)" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: "var(--tg-text-secondary)", fontSize: 12 }} />
                <PolarRadiusAxis tick={false} axisLine={false} />
                {data.map((ch, i) => (
                  <Radar key={ch.username} name={ch.title || ch.username}
                    dataKey={ch.username} stroke={COLORS[i % COLORS.length]}
                    fill={COLORS[i % COLORS.length]} fillOpacity={0.15} strokeWidth={2} />
                ))}
                <Tooltip contentStyle={tooltipStyle} />
              </RadarChart>
            </ResponsiveContainer>
            <div style={s.radarLegend}>
              {data.map((ch, i) => (
                <span key={ch.username} style={{ ...s.radarLegendItem, color: COLORS[i % COLORS.length] }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: COLORS[i % COLORS.length] }} />
                  {ch.title || ch.username}
                </span>
              ))}
            </div>
          </div>

          <div style={s.card}>
            <h3 style={s.cardTitle}>Детальное сравнение</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={s.compareTable}>
                <thead>
                  <tr>
                    <th style={s.cmpTh}>Метрика</th>
                    {data.map(ch => <th key={ch.username} style={s.cmpTh}>{ch.title || ch.username}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "Подписчики", key: "tg_participants", alt: "subscribers", fmt: formatNum },
                    { label: "Ср. просмотры", key: "avg_views_30d", alt: "avg_views", fmt: formatNum },
                    { label: "ER %", key: "er_pct", fmt: v => (v || 0).toFixed(3) + "%" },
                    { label: "ERR %", key: "err_pct", fmt: v => (v || 0).toFixed(3) + "%" },
                    { label: "Видимость %", key: "visibility_pct", fmt: v => (v || 0).toFixed(1) + "%" },
                    { label: "Постов/мес", key: "posts_30d", fmt: v => v || 0 },
                    { label: "Частота/день", key: "publish_frequency", fmt: v => (v || 0).toFixed(1) },
                    { label: "Стабильность %", key: "publish_stability", fmt: v => (v || 0).toFixed(0) + "%" },
                    { label: "Ср. реакции", key: "avg_reactions_30d", fmt: v => (v || 0).toFixed(1) },
                    { label: "Ср. репосты", key: "avg_forwards_30d", fmt: v => (v || 0).toFixed(1) },
                    { label: "Возраст (дней)", key: "channel_age_days", fmt: v => v || 0 },
                    { label: "Реклама %", key: "ad_pct_30d", fmt: v => (v || 0).toFixed(1) + "%" },
                  ].map(row => (
                    <tr key={row.label}>
                      <td style={s.cmpTdLabel}>{row.label}</td>
                      {data.map(ch => (
                        <td key={ch.username} style={s.cmpTd}>
                          {row.fmt(ch[row.key] || (row.alt ? ch[row.alt] : 0))}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ==================== SUB-COMPONENTS ==================== */
function FilterInput({ label, value, onChange, step }) {
  return (
    <div style={s.filterField}>
      <label style={s.filterLabel}>{label}</label>
      <input style={s.filterInput} type="number" step={step || "1"}
        value={value || ""} onChange={e => onChange(e.target.value)} />
    </div>
  );
}

const tooltipStyle = {
  background: "var(--tg-bg-panel)", border: "1px solid var(--tg-border)",
  borderRadius: 8, fontSize: 12, color: "var(--tg-text)",
};

const cellS = {
  channelCell: { display: "flex", alignItems: "center", gap: 10 },
  avatar: {
    width: 36, height: 36, borderRadius: "50%",
    background: "linear-gradient(135deg, #5ea5e5, #9b7cd5)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontWeight: 700, fontSize: 14, color: "#fff", flexShrink: 0, overflow: "hidden",
  },
  avatarImg: { width: 36, height: 36, borderRadius: "50%", objectFit: "cover" },
  info: { display: "flex", flexDirection: "column", overflow: "hidden" },
  name: {
    fontSize: 13, fontWeight: 600, color: "var(--tg-text)",
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
  },
  username: { fontSize: 11, color: "var(--tg-text-muted)" },
  numVal: { fontSize: 13, fontWeight: 500, color: "var(--tg-text)" },
  categoryTag: {
    fontSize: 11, color: "var(--tg-text-secondary)", padding: "2px 8px",
    borderRadius: 4, background: "var(--tg-bg-input)", whiteSpace: "nowrap",
  },
  typeTag: {
    fontSize: 11, color: "var(--tg-text-secondary)", padding: "2px 6px",
    borderRadius: 4, background: "var(--tg-bg-input)",
  },
  muted: { fontSize: 12, color: "var(--tg-text-muted)" },
  chatYes: { color: "var(--tg-green)", fontWeight: 700 },
};

const s = {
  container: { display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" },

  tabBar: {
    display: "flex", gap: 4, padding: "8px 16px",
    background: "var(--tg-bg-secondary)", borderBottom: "1px solid var(--tg-border)", flexShrink: 0,
  },
  tab: {
    display: "flex", alignItems: "center", gap: 6, padding: "8px 16px",
    border: "none", borderRadius: 10, background: "transparent",
    color: "var(--tg-text-muted)", fontSize: 13, fontWeight: 500, cursor: "pointer",
  },
  tabActive: {
    background: "var(--tg-accent-muted)", color: "var(--tg-accent)", fontWeight: 600,
  },

  catalogContainer: { display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" },

  toolbar: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "10px 16px", borderBottom: "1px solid var(--tg-border)",
    background: "var(--tg-bg-secondary)", flexShrink: 0, flexWrap: "wrap", gap: 8,
  },
  toolbarLeft: { display: "flex", alignItems: "center", gap: 10 },
  heading: { fontSize: 16, fontWeight: 700, color: "var(--tg-text)" },
  totalBadge: {
    fontSize: 12, color: "var(--tg-text-muted)", background: "var(--tg-bg-panel)",
    padding: "2px 8px", borderRadius: 10, fontWeight: 600,
  },
  toolbarRight: { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" },
  searchWrap: {
    display: "flex", alignItems: "center", gap: 8,
    background: "var(--tg-bg-input)", border: "1px solid var(--tg-border)",
    borderRadius: 10, padding: "6px 12px", minWidth: 200,
  },
  searchInput: {
    flex: 1, background: "transparent", border: "none",
    color: "var(--tg-text)", fontSize: 13, outline: "none",
  },
  searchClear: {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: 18, height: 18, borderRadius: "50%", border: "none",
    background: "var(--tg-bg-panel)", color: "var(--tg-text-muted)", cursor: "pointer",
  },
  toolBtn: {
    display: "flex", alignItems: "center", gap: 6, padding: "7px 12px",
    border: "1px solid var(--tg-border)", borderRadius: 8,
    background: "var(--tg-bg-panel)", color: "var(--tg-text-secondary)",
    fontSize: 12, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap",
  },
  toolBtnActive: {
    background: "var(--tg-accent-muted)", color: "var(--tg-accent)", borderColor: "var(--tg-accent)",
  },
  filterBadge: {
    background: "var(--tg-accent)", color: "#fff", fontSize: 10, fontWeight: 700,
    padding: "1px 5px", borderRadius: 6, marginLeft: 2,
  },

  panelRow: {
    display: "flex", alignItems: "center", gap: 10, padding: "8px 16px",
    borderBottom: "1px solid var(--tg-border)", background: "var(--tg-bg-secondary)",
    flexShrink: 0, flexWrap: "wrap",
  },
  panelLabel: { fontSize: 12, fontWeight: 600, color: "var(--tg-text-secondary)" },
  panelChips: { display: "flex", gap: 4, flexWrap: "wrap" },
  panelChip: {
    padding: "4px 10px", borderRadius: 6, border: "1px solid var(--tg-border)",
    background: "var(--tg-bg-panel)", color: "var(--tg-text-muted)",
    fontSize: 11, fontWeight: 500, cursor: "pointer", transition: "all 0.15s",
  },
  panelChipActive: {
    background: "var(--tg-accent-muted)", color: "var(--tg-accent)",
    borderColor: "rgba(42,171,238,0.3)",
  },

  filterPanel: {
    padding: "10px 16px", borderBottom: "1px solid var(--tg-border)",
    background: "var(--tg-bg-secondary)", flexShrink: 0,
  },
  filterGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
    gap: 8, marginBottom: 8,
  },
  filterField: { display: "flex", flexDirection: "column", gap: 2 },
  filterLabel: {
    fontSize: 10, fontWeight: 600, color: "var(--tg-text-muted)", textTransform: "uppercase",
  },
  filterInput: {
    background: "var(--tg-bg-input)", color: "var(--tg-text)",
    border: "1px solid var(--tg-border)", borderRadius: 6,
    padding: "5px 8px", fontSize: 12, outline: "none",
  },
  filterBottom: {
    display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
  },
  filterSelect: {
    background: "var(--tg-bg-input)", color: "var(--tg-text)",
    border: "1px solid var(--tg-border)", borderRadius: 6,
    padding: "5px 8px", fontSize: 12, outline: "none", cursor: "pointer",
  },
  filterCheckLabel: {
    display: "flex", alignItems: "center", gap: 4,
    fontSize: 12, color: "var(--tg-text-secondary)", cursor: "pointer",
  },
  resetBtn: {
    display: "flex", alignItems: "center", gap: 4, padding: "5px 10px",
    border: "none", borderRadius: 6, background: "var(--tg-red-muted)",
    color: "var(--tg-red)", fontSize: 12, fontWeight: 500, cursor: "pointer",
    marginLeft: "auto",
  },

  tableWrap: { flex: 1, overflowY: "auto", overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  thNum: {
    width: 40, textAlign: "center", padding: "10px 4px", fontSize: 11, fontWeight: 600,
    color: "var(--tg-text-muted)", borderBottom: "1px solid var(--tg-border)",
    position: "sticky", top: 0, background: "var(--tg-bg-secondary)", zIndex: 1,
  },
  thStar: {
    width: 36, textAlign: "center", padding: "10px 4px",
    borderBottom: "1px solid var(--tg-border)",
    position: "sticky", top: 0, background: "var(--tg-bg-secondary)", zIndex: 1,
  },
  th: {
    padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 600,
    color: "var(--tg-text-muted)", textTransform: "uppercase", letterSpacing: 0.3,
    borderBottom: "1px solid var(--tg-border)", whiteSpace: "nowrap",
    position: "sticky", top: 0, background: "var(--tg-bg-secondary)", zIndex: 1,
  },
  thTitle: { minWidth: 220 },
  thContent: { display: "flex", alignItems: "center", gap: 4 },
  tr: {
    cursor: "pointer", transition: "background 0.1s",
    borderBottom: "1px solid rgba(255,255,255,0.03)",
  },
  tdNum: { textAlign: "center", padding: "8px 4px", fontSize: 12, color: "var(--tg-text-muted)" },
  tdStar: { textAlign: "center", padding: "4px", verticalAlign: "middle" },
  td: { padding: "8px 12px", verticalAlign: "middle" },
  tdTitle: { minWidth: 220 },
  loadingRow: { display: "flex", justifyContent: "center", padding: 20 },
  spinner: {
    width: 20, height: 20, border: "2px solid var(--tg-border)",
    borderTopColor: "var(--tg-accent)", borderRadius: "50%", animation: "spin 0.7s linear infinite",
  },

  tabContent: { flex: 1, overflow: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 20 },
  card: {
    background: "var(--tg-bg-panel)", border: "1px solid var(--tg-border)",
    borderRadius: 12, padding: 24,
  },
  cardTitle: { fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 },
  cardSubtitle: { fontSize: 12, color: "var(--tg-text-muted)", marginTop: 4, marginBottom: 16 },
  emptyState: { textAlign: "center", padding: 60, color: "var(--tg-text-secondary)" },

  bestHours: { display: "flex", alignItems: "center", gap: 8, marginTop: 16, flexWrap: "wrap" },
  bestLabel: { fontSize: 12, fontWeight: 600, color: "var(--tg-text-secondary)" },
  bestChip: {
    padding: "4px 10px", borderRadius: 8, fontSize: 12, fontWeight: 500,
    background: "var(--tg-accent-muted)", color: "var(--tg-accent)",
  },

  compareSearch: {
    display: "flex", alignItems: "center", gap: 8, marginTop: 12,
    background: "var(--tg-bg-input)", border: "1px solid var(--tg-border)",
    borderRadius: 10, padding: "6px 12px",
  },
  compareInput: {
    flex: 1, background: "transparent", border: "none",
    color: "var(--tg-text)", fontSize: 13, outline: "none",
  },
  compareClear: {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: 18, height: 18, borderRadius: "50%", border: "none",
    background: "var(--tg-bg-panel)", color: "var(--tg-text-muted)", cursor: "pointer",
  },
  chipRow: { display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 },
  chip: {
    display: "inline-flex", alignItems: "center", gap: 4,
    padding: "3px 8px", borderRadius: 6, fontSize: 12, fontWeight: 500,
    background: "var(--tg-accent-muted)", color: "var(--tg-accent)",
  },
  chipX: {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: 14, height: 14, border: "none", background: "transparent",
    color: "var(--tg-accent)", cursor: "pointer",
  },
  compareList: {
    maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: 1,
    border: "1px solid var(--tg-border)", borderRadius: 8, padding: 3, marginTop: 8,
  },
  compareItem: {
    display: "flex", alignItems: "center", gap: 8, padding: "5px 8px",
    background: "transparent", border: "none", borderRadius: 6,
    color: "var(--tg-text-secondary)", fontSize: 12, cursor: "pointer",
    textAlign: "left", width: "100%",
  },
  compareItemActive: { background: "var(--tg-accent-muted)", color: "var(--tg-accent)" },
  compareCheck: { width: 14, fontSize: 11, color: "var(--tg-accent)", fontWeight: 700 },
  compareItemTitle: {
    fontSize: 11, color: "var(--tg-text-muted)", marginLeft: 4,
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
  },
  radarLegend: { display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" },
  radarLegendItem: { display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 500 },
  compareTable: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  cmpTh: {
    padding: "10px 12px", textAlign: "left", fontSize: 12, fontWeight: 600,
    color: "var(--tg-text-muted)", textTransform: "uppercase",
    borderBottom: "1px solid var(--tg-border)", whiteSpace: "nowrap",
  },
  cmpTdLabel: {
    padding: "8px 12px", fontSize: 13, fontWeight: 500, color: "var(--tg-text-secondary)",
    borderBottom: "1px solid rgba(255,255,255,0.03)",
  },
  cmpTd: {
    padding: "8px 12px", fontSize: 14, fontWeight: 600, color: "var(--tg-text)",
    borderBottom: "1px solid rgba(255,255,255,0.03)",
  },
};
