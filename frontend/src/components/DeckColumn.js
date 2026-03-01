import React, { useState, useEffect, useCallback, useRef } from "react";
import { X, Settings, Search, Columns3 } from "lucide-react";
import { fetchChannels, fetchPosts } from "../api";
import PostCard from "./PostCard";
import ChannelRow from "./ChannelRow";
import ColumnFilters from "./ColumnFilters";

export default function DeckColumn({ column, onRemove, onUpdate, onSelectChannel }) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchVal, setSearchVal] = useState("");

  const scrollRef = useRef(null);
  const loadingRef = useRef(false);
  const sentinelRef = useRef(null);

  const isPostColumn = column.type === "posts";

  const resetAndLoad = useCallback(() => {
    setItems([]);
    setPage(1);
    setHasMore(true);
  }, []);

  useEffect(() => {
    resetAndLoad();
  }, [column.filters, searchVal, resetAndLoad]);

  const loadPage = useCallback(async (p) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const params = { page: p, search: searchVal || undefined };
      const f = column.filters || {};
      Object.entries(f).forEach(([k, v]) => {
        if (v) params[k] = v;
      });

      if (isPostColumn) {
        if (!params.sort) params.sort = "date";
        if (!params.order) params.order = "desc";
        const result = await fetchPosts(params);
        setItems(prev => p === 1 ? result.posts : [...prev, ...result.posts]);
        setTotal(result.total);
        setHasMore(p < result.pages);
      } else {
        if (!params.sort) params.sort = "subscribers";
        if (!params.order) params.order = "desc";
        const result = await fetchChannels(params);
        setItems(prev => p === 1 ? result.channels : [...prev, ...result.channels]);
        setTotal(result.total);
        setHasMore(p < result.pages);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [column.filters, searchVal, isPostColumn]);

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

  const updateFilters = (updates) => {
    onUpdate({ filters: { ...(column.filters || {}), ...updates } });
  };

  return (
    <div style={styles.column}>
      {/* Column header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <Columns3 size={14} color="var(--tg-accent)" />
          <span style={styles.title}>{column.title}</span>
          <span style={styles.count}>{total}</span>
        </div>
        <div style={styles.headerActions}>
          <button style={styles.hdrBtn} onClick={() => setSearchOpen(p => !p)} title="Поиск">
            <Search size={14} />
          </button>
          <button style={styles.hdrBtn} onClick={() => setFiltersOpen(p => !p)} title="Фильтры">
            <Settings size={14} />
          </button>
          {!column.pinned && (
            <button style={styles.hdrBtn} onClick={onRemove} title="Убрать колонку">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Search bar */}
      {searchOpen && (
        <div style={styles.searchBar}>
          <Search size={14} color="var(--tg-text-muted)" />
          <input
            style={styles.searchInput}
            placeholder="Поиск..."
            value={searchVal}
            onChange={e => setSearchVal(e.target.value)}
            autoFocus
          />
          {searchVal && (
            <button style={styles.clearBtn} onClick={() => setSearchVal("")}>
              <X size={12} />
            </button>
          )}
        </div>
      )}

      {/* Filters panel */}
      {filtersOpen && (
        <ColumnFilters
          column={column}
          onChange={updateFilters}
          onClose={() => setFiltersOpen(false)}
          isPostColumn={isPostColumn}
        />
      )}

      {/* Scrollable content */}
      <div style={styles.scrollArea} ref={scrollRef}>
        {items.length === 0 && !loading && (
          <div style={styles.empty}>Ничего не найдено</div>
        )}

        {isPostColumn ? (
          <div style={styles.postsList}>
            {items.map(p => <PostCard key={p.id} post={p} />)}
          </div>
        ) : (
          <div style={styles.channelsList}>
            {items.map(ch => (
              <ChannelRow key={ch.username} channel={ch} onClick={() => onSelectChannel(ch)} />
            ))}
          </div>
        )}

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

const styles = {
  column: {
    width: 380,
    minWidth: 380,
    maxWidth: 380,
    height: "100%",
    display: "flex",
    flexDirection: "column",
    borderRight: "1px solid var(--tg-border)",
    background: "var(--tg-bg)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 12px",
    background: "var(--tg-bg-secondary)",
    borderBottom: "1px solid var(--tg-border)",
    flexShrink: 0,
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    overflow: "hidden",
  },
  title: {
    fontSize: 13,
    fontWeight: 600,
    color: "var(--tg-text)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  count: {
    fontSize: 11,
    color: "var(--tg-text-muted)",
    background: "var(--tg-bg-panel)",
    padding: "1px 6px",
    borderRadius: 10,
  },
  headerActions: {
    display: "flex",
    gap: 2,
    flexShrink: 0,
  },
  hdrBtn: {
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
    transition: "background 0.15s",
  },
  searchBar: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 12px",
    background: "var(--tg-bg-secondary)",
    borderBottom: "1px solid var(--tg-border)",
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    background: "transparent",
    border: "none",
    color: "var(--tg-text)",
    fontSize: 13,
    outline: "none",
  },
  clearBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 20,
    height: 20,
    borderRadius: "50%",
    background: "var(--tg-bg-panel)",
    border: "none",
    color: "var(--tg-text-muted)",
    cursor: "pointer",
  },
  scrollArea: {
    flex: 1,
    overflowY: "auto",
    overflowX: "hidden",
  },
  postsList: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    padding: "8px 0",
  },
  channelsList: {
    display: "flex",
    flexDirection: "column",
  },
  empty: {
    textAlign: "center",
    padding: 40,
    color: "var(--tg-text-muted)",
    fontSize: 13,
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
