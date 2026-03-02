import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  X, Settings, Search, Columns3, Zap, Star, Eye,
  Megaphone, Activity,
} from "lucide-react";
import { fetchChannels, fetchPosts, fetchChannel } from "../api";
import { useFavorites } from "../hooks/useFavorites";
import PostCard from "./PostCard";
import ChannelRow from "./ChannelRow";
import ColumnFilters from "./ColumnFilters";

const COLUMN_ICONS = {
  feed: <Columns3 size={14} color="var(--tg-accent)" />,
  posts: <Columns3 size={14} color="var(--tg-accent)" />,
  my_feed: <Star size={14} color="var(--tg-orange)" />,
  my_channels: <Star size={14} color="var(--tg-orange)" />,
  viral: <Zap size={14} color="var(--tg-red)" />,
  ad_posts: <Megaphone size={14} color="var(--tg-orange)" />,
  post_search: <Search size={14} color="var(--tg-accent)" />,
  tracking: <Activity size={14} color="var(--tg-green)" />,
};

const VIRAL_THRESHOLD = 50;

const POST_COLUMN_TYPES = [
  "posts", "my_feed", "viral", "ad_posts", "post_search", "tracking",
];

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

  const { favorites } = useFavorites();

  const colType = column.type || "posts";
  const isPostColumn = POST_COLUMN_TYPES.includes(colType);
  const isMyChannelsColumn = colType === "my_channels";

  const resetAndLoad = useCallback(() => {
    setItems([]);
    setPage(1);
    setHasMore(true);
  }, []);

  useEffect(() => {
    resetAndLoad();
  }, [column.filters, searchVal, resetAndLoad, favorites]);

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

      if (isMyChannelsColumn) {
        const isSearching = !!(searchVal && searchVal.trim());
        if (!isSearching && favorites.length === 0) {
          setItems([]);
          setTotal(0);
          setHasMore(false);
          return;
        }
        const chParams = {
          page: p, per_page: 50,
          search: searchVal || undefined,
          sort: f.sort || "subscribers",
          order: f.order || "desc",
        };
        if (!isSearching) {
          chParams.usernames = favorites.map(fv => fv.username).join(",");
        }
        const result = await fetchChannels(chParams);
        setItems(prev => p === 1 ? result.channels : [...prev, ...result.channels]);
        setTotal(result.total);
        setHasMore(p < result.pages);
        return;
      }

      if (isPostColumn) {
        if (!params.sort) params.sort = "date";
        if (!params.order) params.order = "desc";

        if (colType === "my_feed") {
          if (favorites.length === 0) {
            setItems([]);
            setTotal(0);
            setHasMore(false);
            return;
          }
          params.channels = favorites.map(f => f.username).join(",");
        }

        if (colType === "post_search" && column.keywords) {
          params.search = column.keywords;
        }

        if (colType === "tracking") {
          if (column.keywords) params.search = column.keywords;
          if (column.competitorChannels) params.channels = column.competitorChannels;
        }

        if (colType === "viral") {
          params.min_p_views_dev = params.min_p_views_dev || String(VIRAL_THRESHOLD);
          params.sort = params.sort || "views_dev";
          params.order = params.order || "desc";
        }

        if (colType === "ad_posts") {
          params.only_ad = "1";
        }

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
  }, [column.filters, column.keywords, column.competitorChannels, column.trackingConfig, searchVal, colType, favorites]);

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

  const handlePostChannelClick = async (username) => {
    try {
      const ch = await fetchChannel(username);
      onSelectChannel(ch);
    } catch (e) {
      console.error(e);
    }
  };

  const icon = COLUMN_ICONS[colType] || COLUMN_ICONS.posts;

  const emptyMessages = {
    my_channels: "Нажмите на лупу и найдите каналы",
    my_feed: "Добавьте каналы в избранное через колонку «Мои каналы»",
    ad_posts: "Рекламных постов не найдено",
    post_search: "Введите поисковый запрос в настройках колонки",
    tracking: "Настройте отслеживание — данные появятся автоматически",
  };
  const emptyMsg = emptyMessages[colType] || "Ничего не найдено";

  return (
    <div style={styles.column}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          {icon}
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

      {searchOpen && (
        <div style={styles.searchBar}>
          <Search size={14} color="var(--tg-text-muted)" />
          <input
            style={styles.searchInput}
            placeholder={isMyChannelsColumn ? "Найти канал для добавления..." : "Поиск..."}
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

      {filtersOpen && (
        <ColumnFilters
          column={column}
          onChange={updateFilters}
          onClose={() => setFiltersOpen(false)}
          isPostColumn={isPostColumn}
        />
      )}

      <div style={styles.scrollArea} ref={scrollRef}>
        {items.length === 0 && !loading && (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>
              {(colType === "my_feed" || colType === "my_channels")
                ? <Star size={32} color="var(--tg-text-muted)" />
                : colType === "ad_posts"
                ? <Megaphone size={32} color="var(--tg-text-muted)" />
                : colType === "tracking"
                ? <Activity size={32} color="var(--tg-text-muted)" />
                : <Eye size={32} color="var(--tg-text-muted)" />}
            </div>
            {emptyMsg}
          </div>
        )}

        {isPostColumn ? (
          <div style={styles.postsList}>
            {items.map(p => (
              <PostCard key={p.id} post={p} onClickChannel={handlePostChannelClick} />
            ))}
          </div>
        ) : (
          <div style={styles.channelsList}>
            {items.map(ch => (
              <ChannelRow
                key={ch.username}
                channel={ch}
                onClick={() => onSelectChannel(ch)}
                showFavStar
              />
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
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
  },
  emptyIcon: {
    opacity: 0.5,
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
