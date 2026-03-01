import React, { useState, useEffect, useCallback, useRef } from "react";
import { fetchPosts, fetchCategories, fetchChannelsList } from "../api";
import PostCard from "./PostCard";
import { Settings, Inbox, ShieldOff, X, Megaphone, AlertTriangle, Camera, TrendingUp } from "lucide-react";

const POST_SORTS = [
  { value: "date", label: "По дате" },
  { value: "views", label: "По просмотрам" },
  { value: "reactions", label: "По реакциям" },
  { value: "comments", label: "По комментариям" },
  { value: "forwards", label: "По репостам" },
  { value: "views_dev", label: "По откл. просмотров" },
  { value: "reactions_dev", label: "По откл. реакций" },
  { value: "comments_dev", label: "По откл. комментов" },
  { value: "forwards_dev", label: "По откл. репостов" },
];

const POST_RANGE_FIELDS = [
  { key: "pv", label: "Просмотры", min: "min_p_views", max: "max_p_views" },
  { key: "pr", label: "Реакции", min: "min_p_reactions", max: "max_p_reactions" },
  { key: "pc", label: "Комментарии", min: "min_p_comments", max: "max_p_comments" },
  { key: "pf", label: "Репосты", min: "min_p_forwards", max: "max_p_forwards" },
  { key: "pvd", label: "Откл. просмотров (%)", min: "min_p_views_dev", max: "max_p_views_dev" },
  { key: "prd", label: "Откл. реакций (%)", min: "min_p_reactions_dev", max: "max_p_reactions_dev" },
  { key: "pcd", label: "Откл. комментов (%)", min: "min_p_comments_dev", max: "max_p_comments_dev" },
  { key: "pfd", label: "Откл. репостов (%)", min: "min_p_forwards_dev", max: "max_p_forwards_dev" },
];

export default function PostsFeed() {
  const [posts, setPosts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const [categories, setCategories] = useState([]);
  const [channelOptions, setChannelOptions] = useState([]);

  const [filterCategory, setFilterCategory] = useState("");
  const [filterChannels, setFilterChannels] = useState([]);
  const [filterSearch, setFilterSearch] = useState("");
  const [hideGambling, setHideGambling] = useState(false);
  const [onlyAd, setOnlyAd] = useState(false);
  const [onlyGambling, setOnlyGambling] = useState(false);
  const [onlyPhoto, setOnlyPhoto] = useState(false);
  const [sort, setSort] = useState("date");
  const [order, setOrder] = useState("desc");

  const [numFilters, setNumFilters] = useState({});

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [channelSearch, setChannelSearch] = useState("");

  const sentinelRef = useRef(null);
  const loadingRef = useRef(false);
  const panelRef = useRef(null);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
    fetchChannelsList().then(setChannelOptions).catch(() => {});
  }, []);

  useEffect(() => {
    if (!filtersOpen) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setFiltersOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [filtersOpen]);

  const resetFeed = useCallback(() => {
    setPosts([]);
    setPage(1);
    setHasMore(true);
  }, []);

  useEffect(() => {
    resetFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCategory, filterChannels, filterSearch, hideGambling, onlyAd, onlyGambling, onlyPhoto, sort, order, numFilters, resetFeed]);

  const loadPage = useCallback(async (p) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const extra = {};
      for (const [k, v] of Object.entries(numFilters)) {
        if (v) extra[k] = v;
      }
      const result = await fetchPosts({
        page: p,
        sort,
        order,
        category: filterCategory || undefined,
        channels: filterChannels.length ? filterChannels.join(",") : undefined,
        search: filterSearch || undefined,
        hide_gambling: hideGambling ? "1" : undefined,
        only_ad: onlyAd ? "1" : undefined,
        only_gambling: onlyGambling ? "1" : undefined,
        only_photo: onlyPhoto ? "1" : undefined,
        ...extra,
      });
      setPosts(prev => p === 1 ? result.posts : [...prev, ...result.posts]);
      setTotal(result.total);
      setHasMore(p < result.pages);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [filterCategory, filterChannels, filterSearch, hideGambling, onlyAd, onlyGambling, onlyPhoto, sort, order, numFilters]);

  useEffect(() => { loadPage(page); }, [page, loadPage]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loadingRef.current) {
          setPage(prev => prev + 1);
        }
      },
      { rootMargin: "400px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore]);

  const toggleChannel = (username) => {
    setFilterChannels(prev =>
      prev.includes(username) ? prev.filter(c => c !== username) : [...prev, username]
    );
  };

  const numActive = Object.values(numFilters).filter(Boolean).length;
  const activeCount = [filterCategory, filterSearch, hideGambling, onlyAd, onlyGambling, onlyPhoto].filter(Boolean).length
    + filterChannels.length + numActive;

  const filteredChannelOptions = channelSearch
    ? channelOptions.filter(ch =>
        ch.username.toLowerCase().includes(channelSearch.toLowerCase()) ||
        (ch.title && ch.title.toLowerCase().includes(channelSearch.toLowerCase()))
      )
    : channelOptions;

  const updateNum = (key, val) => setNumFilters(prev => ({ ...prev, [key]: val }));

  return (
    <div style={styles.container}>
      <div style={styles.topBar} ref={panelRef}>
        <button
          style={{ ...styles.gearBtn, ...(filtersOpen ? styles.gearActive : {}) }}
          onClick={() => setFiltersOpen(p => !p)}
        >
          <Settings size={18} />
          {activeCount > 0 && <span style={styles.countBadge}>{activeCount}</span>}
        </button>

        <select style={styles.sortSelect} value={sort} onChange={e => setSort(e.target.value)}>
          {POST_SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>

        <button style={styles.orderBtn} onClick={() => setOrder(o => o === "desc" ? "asc" : "desc")}>
          {order === "desc" ? "↓" : "↑"}
        </button>

        <input
          style={styles.searchInput}
          placeholder="Поиск по тексту…"
          value={filterSearch}
          onChange={e => setFilterSearch(e.target.value)}
        />

        {filterCategory && (
          <span style={styles.activeTag}>
            {filterCategory}
            <button style={styles.removeTag} onClick={() => setFilterCategory("")}><X size={10} /></button>
          </span>
        )}
        {filterChannels.length > 0 && (
          <span style={styles.activeTag}>
            {filterChannels.length} канал(ов)
            <button style={styles.removeTag} onClick={() => setFilterChannels([])}><X size={10} /></button>
          </span>
        )}
        {hideGambling && (
          <span style={styles.activeTag}>
            <ShieldOff size={10} /> Без гемб.
            <button style={styles.removeTag} onClick={() => setHideGambling(false)}><X size={10} /></button>
          </span>
        )}
        {onlyAd && (
          <span style={styles.activeTag}>
            <Megaphone size={10} /> Реклама
            <button style={styles.removeTag} onClick={() => setOnlyAd(false)}><X size={10} /></button>
          </span>
        )}
        {onlyGambling && (
          <span style={styles.activeTag}>
            <AlertTriangle size={10} /> Гемблинг
            <button style={styles.removeTag} onClick={() => setOnlyGambling(false)}><X size={10} /></button>
          </span>
        )}
        {onlyPhoto && (
          <span style={styles.activeTag}>
            <Camera size={10} /> С фото
            <button style={styles.removeTag} onClick={() => setOnlyPhoto(false)}><X size={10} /></button>
          </span>
        )}
        {numActive > 0 && (
          <span style={styles.activeTag}>
            <TrendingUp size={10} /> {numActive} числ. фильтр(ов)
            <button style={styles.removeTag} onClick={() => setNumFilters({})}><X size={10} /></button>
          </span>
        )}

        {filtersOpen && (
          <div style={styles.panel}>
            <div style={styles.panelHeader}>
              <span style={styles.panelTitle}>Фильтры постов</span>
              {activeCount > 0 && (
                <button style={styles.resetBtn} onClick={() => {
                  setFilterCategory("");
                  setFilterChannels([]);
                  setHideGambling(false);
                  setOnlyAd(false);
                  setOnlyGambling(false);
                  setOnlyPhoto(false);
                  setNumFilters({});
                }}>Сбросить</button>
              )}
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Категория</label>
              <select style={styles.select} value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}>
                <option value="">Все категории</option>
                {categories.map(c => (
                  <option key={c.name} value={c.name}>{c.name} ({c.posts_count})</option>
                ))}
              </select>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Каналы ({filterChannels.length} выбрано)</label>
              <input
                style={styles.channelSearchInput}
                placeholder="Поиск каналов…"
                value={channelSearch}
                onChange={e => setChannelSearch(e.target.value)}
              />
              <div style={styles.channelList}>
                {filteredChannelOptions.slice(0, 50).map(ch => {
                  const active = filterChannels.includes(ch.username);
                  return (
                    <button key={ch.username}
                      style={{ ...styles.channelItem, ...(active ? styles.channelItemActive : {}) }}
                      onClick={() => toggleChannel(ch.username)}>
                      <span style={styles.channelCheck}>{active ? "✓" : ""}</span>
                      <span>@{ch.username}</span>
                      <span style={styles.channelTitle}>{ch.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={styles.divider} />

            <label style={styles.sectionTitle}>Числовые фильтры</label>
            {POST_RANGE_FIELDS.map(f => (
              <div key={f.key} style={styles.field}>
                <label style={styles.label}>{f.label}</label>
                <div style={styles.range}>
                  <input style={styles.inp} type="number" placeholder="от"
                    value={numFilters[f.min] || ""}
                    onChange={e => updateNum(f.min, e.target.value)} />
                  <span style={styles.dash}>—</span>
                  <input style={styles.inp} type="number" placeholder="до"
                    value={numFilters[f.max] || ""}
                    onChange={e => updateNum(f.max, e.target.value)} />
                </div>
              </div>
            ))}

            <div style={styles.divider} />

            <div style={styles.toggleGroup}>
              <button
                style={{ ...styles.toggleBtn, ...(hideGambling ? styles.toggleActiveGreen : {}) }}
                onClick={() => setHideGambling(p => !p)}
              >
                <ShieldOff size={14} /> Скрыть гемблинг
              </button>
              <button
                style={{ ...styles.toggleBtn, ...(onlyAd ? styles.toggleActiveOrange : {}) }}
                onClick={() => setOnlyAd(p => !p)}
              >
                <Megaphone size={14} /> Только рекламные
              </button>
              <button
                style={{ ...styles.toggleBtn, ...(onlyGambling ? styles.toggleActiveRed : {}) }}
                onClick={() => setOnlyGambling(p => !p)}
              >
                <AlertTriangle size={14} /> Только гемблинг
              </button>
              <button
                style={{ ...styles.toggleBtn, ...(onlyPhoto ? styles.toggleActiveBlue : {}) }}
                onClick={() => setOnlyPhoto(p => !p)}
              >
                <Camera size={14} /> Только с фото
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={styles.totalBadge}>{total} постов</div>

      {posts.length === 0 && !loading ? (
        <div style={styles.empty}>
          <Inbox size={40} color="var(--border)" />
          <p>Постов не найдено.</p>
        </div>
      ) : (
        <div style={styles.grid}>
          {posts.map(p => <PostCard key={p.id} post={p} />)}
        </div>
      )}

      {loading && (
        <div style={styles.loading}>
          <div style={styles.spinner} />
          <span>Загрузка…</span>
        </div>
      )}

      {!hasMore && posts.length > 0 && (
        <div style={styles.endMsg}>Все посты загружены</div>
      )}

      <div ref={sentinelRef} style={{ height: 1 }} />
    </div>
  );
}

const styles = {
  container: { paddingTop: 12 },
  topBar: { display: "flex", alignItems: "center", gap: 8, padding: "12px 0", flexWrap: "wrap", position: "relative" },
  gearBtn: {
    width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center",
    background: "var(--bg-card)", border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)", color: "var(--text-secondary)",
    cursor: "pointer", position: "relative",
  },
  gearActive: {
    background: "var(--accent-muted)", color: "var(--accent)",
    borderColor: "rgba(99,102,241,0.4)",
  },
  countBadge: {
    position: "absolute", top: -4, right: -4,
    width: 18, height: 18, borderRadius: "50%",
    background: "var(--accent)", color: "#fff",
    fontSize: 10, fontWeight: 700,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  sortSelect: {
    background: "var(--bg-card)", color: "var(--text-primary)",
    border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
    padding: "7px 12px", fontSize: 13, cursor: "pointer", outline: "none",
  },
  orderBtn: {
    width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
    background: "var(--bg-card)", border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)", color: "var(--text-primary)", fontSize: 15, cursor: "pointer",
  },
  searchInput: {
    flex: 1, minWidth: 180, background: "var(--bg-card)", color: "var(--text-primary)",
    border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
    padding: "7px 12px", fontSize: 13, outline: "none",
  },
  activeTag: {
    display: "flex", alignItems: "center", gap: 4,
    padding: "3px 8px", borderRadius: 5, fontSize: 10, fontWeight: 600,
    background: "var(--accent-muted)", color: "var(--accent)",
    border: "1px solid rgba(99,102,241,0.3)",
  },
  removeTag: {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: 14, height: 14, borderRadius: "50%",
    background: "rgba(99,102,241,0.2)", border: "none",
    color: "var(--accent)", cursor: "pointer",
  },
  panel: {
    position: "absolute", top: "100%", left: 0, zIndex: 50,
    background: "var(--bg-secondary)", border: "1px solid var(--border)",
    borderRadius: 12, padding: 20, marginTop: 8,
    width: 380, maxHeight: "80vh", overflowY: "auto",
    boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
    display: "flex", flexDirection: "column", gap: 10,
  },
  panelHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  panelTitle: { fontSize: 15, fontWeight: 700 },
  resetBtn: { background: "none", border: "none", color: "var(--red)", fontSize: 12, fontWeight: 500, cursor: "pointer" },
  field: { display: "flex", flexDirection: "column", gap: 3 },
  label: { fontSize: 10, color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.3 },
  sectionTitle: { fontSize: 12, fontWeight: 700, color: "var(--text-primary)", margin: "2px 0" },
  select: {
    background: "var(--bg-card)", color: "var(--text-primary)",
    border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
    padding: "7px 10px", fontSize: 13, cursor: "pointer", outline: "none", width: "100%",
  },
  channelSearchInput: {
    background: "var(--bg-card)", color: "var(--text-primary)",
    border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
    padding: "6px 10px", fontSize: 12, outline: "none", width: "100%", boxSizing: "border-box",
  },
  channelList: {
    maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2,
    border: "1px solid var(--border)", borderRadius: 8, padding: 4,
  },
  channelItem: {
    display: "flex", alignItems: "center", gap: 6, padding: "5px 8px",
    background: "transparent", border: "none", borderRadius: 6,
    color: "var(--text-secondary)", fontSize: 12, cursor: "pointer",
    textAlign: "left", width: "100%",
  },
  channelItemActive: {
    background: "var(--accent-muted)", color: "var(--accent)",
  },
  channelCheck: { width: 14, fontSize: 11, color: "var(--accent)", fontWeight: 700 },
  channelTitle: { flex: 1, fontSize: 11, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  divider: { height: 1, background: "var(--border)", margin: "4px 0" },
  range: { display: "flex", alignItems: "center", gap: 6 },
  inp: {
    flex: 1, background: "var(--bg-card)", color: "var(--text-primary)",
    border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
    padding: "6px 8px", fontSize: 12, outline: "none", boxSizing: "border-box",
  },
  dash: { color: "var(--text-secondary)", fontSize: 13, flexShrink: 0 },
  toggleGroup: { display: "flex", flexDirection: "column", gap: 6 },
  toggleBtn: {
    display: "flex", alignItems: "center", gap: 6, padding: "8px 12px",
    background: "var(--bg-card)", border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)", color: "var(--text-secondary)",
    fontSize: 12, fontWeight: 500, cursor: "pointer", width: "100%",
  },
  toggleActiveGreen: { background: "var(--green-muted)", color: "var(--green)", borderColor: "rgba(34,197,94,0.4)" },
  toggleActiveOrange: { background: "var(--orange-muted)", color: "var(--orange)", borderColor: "rgba(245,158,11,0.4)" },
  toggleActiveRed: { background: "var(--red-muted)", color: "var(--red)", borderColor: "rgba(239,68,68,0.4)" },
  toggleActiveBlue: { background: "var(--accent-muted)", color: "var(--accent)", borderColor: "rgba(99,102,241,0.4)" },
  totalBadge: { fontSize: 13, color: "var(--text-secondary)", padding: "0 0 12px" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))", gap: 16 },
  empty: {
    textAlign: "center", padding: "60px 20px", color: "var(--text-secondary)",
    display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
  },
  loading: {
    display: "flex", alignItems: "center", justifyContent: "center",
    gap: 12, padding: 40, color: "var(--text-secondary)", fontSize: 14,
  },
  spinner: {
    width: 24, height: 24, border: "3px solid var(--border)",
    borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite",
  },
  endMsg: { textAlign: "center", padding: 32, color: "var(--text-secondary)", fontSize: 13 },
};
