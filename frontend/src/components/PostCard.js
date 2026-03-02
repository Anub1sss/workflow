import React, { useState } from "react";
import { Eye, Share2, Heart, MessageSquare, TrendingUp, TrendingDown, Camera, ExternalLink, Star, ChevronDown, ChevronUp } from "lucide-react";
import { useFavorites } from "../hooks/useFavorites";

const CATEGORY_COLORS = {
  "Кейс применения": "#4fae4e",
  "Научная публикация": "#2aabee",
  "Обзор инструмента": "#e8a447",
  "Туториал / Гайд": "#9b7cd5",
  "Новость индустрии": "#e05353",
  "Промпт-инжиниринг": "#5bcbcf",
  "Датасеты и бенчмарки": "#d75fa0",
  "Мнение / Аналитика": "#e88a47",
  "Open Source": "#b07cd5",
  "Вакансии и карьера": "#4ecba0",
};

function formatTime(d) {
  if (!d) return "";
  const dt = new Date(d);
  const now = new Date();
  const diff = Math.floor((now - dt) / 1000);
  if (diff < 60) return "только что";
  if (diff < 3600) return Math.floor(diff / 60) + " мин";
  if (diff < 86400) return Math.floor(diff / 3600) + " ч";
  const sameYear = dt.getFullYear() === now.getFullYear();
  if (sameYear) {
    return dt.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  }
  return dt.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
}

function formatFullTime(d) {
  if (!d) return "";
  const dt = new Date(d);
  return dt.toLocaleString("ru-RU", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function formatNum(n) {
  if (!n) return "0";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function DevBadge({ value, label }) {
  if (!value || value === 0) return null;
  const positive = value > 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  const color = positive ? "var(--tg-green)" : "var(--tg-red)";
  return (
    <span style={{ ...styles.devBadge, color, background: positive ? "var(--tg-green-muted)" : "var(--tg-red-muted)" }}>
      <Icon size={10} /> {label} {positive ? "+" : ""}{value.toFixed(0)}%
    </span>
  );
}

export default function PostCard({ post, onClickChannel }) {
  const { isFavorite, toggle } = useFavorites();
  const [showStats, setShowStats] = useState(false);
  const catColor = CATEGORY_COLORS[post.category] || "var(--tg-accent)";
  const text = (post.text || "").trim();
  const preview = text.length > 400 ? text.slice(0, 400) + "..." : text;
  const isFav = isFavorite(post.channel_username);

  const handleToggleFav = (e) => {
    e.stopPropagation();
    toggle({
      username: post.channel_username,
      title: post.channel_title || post.channel_username,
      image100: "",
    });
  };

  const hasDeviation = !!(post.views_dev || post.reactions_dev || post.comments_dev || post.forwards_dev);
  const channelInitial = (post.channel_title || post.channel_username || "?").charAt(0).toUpperCase();
  const postLink = post.channel_username && post.tg_message_id
    ? `https://t.me/${post.channel_username}/${post.tg_message_id}`
    : null;

  const handleChannelClick = (e) => {
    e.stopPropagation();
    if (onClickChannel) onClickChannel(post.channel_username);
  };

  return (
    <div style={styles.card} className="post-card">
      {/* Channel header - TG style */}
      <div style={styles.channelHeader}>
        <div style={styles.channelLeft} onClick={handleChannelClick}>
          <div style={styles.avatar}>{channelInitial}</div>
          <div style={styles.channelInfo}>
            <span style={styles.channelName}>
              {post.channel_title || post.channel_username}
            </span>
            <span style={styles.channelDate}>{formatFullTime(post.date)}</span>
          </div>
        </div>
        <div style={styles.channelActions}>
          <button
            style={{ ...styles.favBtn, color: isFav ? "var(--tg-orange)" : "var(--tg-text-muted)" }}
            onClick={handleToggleFav}
            title={isFav ? "Убрать из избранного" : "В избранное"}
          >
            <Star size={14} fill={isFav ? "var(--tg-orange)" : "none"} />
          </button>
          {postLink && (
            <a href={postLink} target="_blank" rel="noopener noreferrer"
              style={styles.externalLink} onClick={e => e.stopPropagation()}>
              <ExternalLink size={13} />
            </a>
          )}
        </div>
      </div>

      {/* Labels row */}
      {(post.category || post.is_ad === 1 || post.is_gambling === 1) && (
        <div style={styles.labelsRow}>
          {post.category && (
            <span style={{ ...styles.categoryTag, background: catColor + "18", color: catColor }}>
              {post.category}
            </span>
          )}
          {post.is_ad === 1 && <span style={styles.adLabel}>Реклама</span>}
          {post.is_gambling === 1 && <span style={styles.gamblingLabel}>Гемблинг</span>}
        </div>
      )}

      {/* Photo area - full width like TG */}
      {post.has_photo === 1 && (
        <div style={styles.photoArea}>
          <Camera size={24} color="var(--tg-text-muted)" />
          <span style={styles.photoText}>Фото</span>
        </div>
      )}

      {/* Text body */}
      {preview ? (
        <div style={styles.textBody}>{preview}</div>
      ) : (
        <div style={styles.mediaBody}>Медиа-пост</div>
      )}

      {/* Reactions row - TG pill style */}
      {(post.reactions > 0 || post.comments > 0 || post.forwards > 0) && (
        <div style={styles.reactionsRow}>
          {post.reactions > 0 && (
            <span style={styles.reactionPill}>
              <Heart size={14} color="#e05353" /> {formatNum(post.reactions)}
            </span>
          )}
          {post.comments > 0 && (
            <span style={styles.reactionPill}>
              <MessageSquare size={14} /> {formatNum(post.comments)}
            </span>
          )}
          {post.forwards > 0 && (
            <span style={styles.reactionPill}>
              <Share2 size={14} /> {formatNum(post.forwards)}
            </span>
          )}
        </div>
      )}

      {/* Footer - views & time like TG bottom-right */}
      <div style={styles.footer}>
        <div style={styles.footerLeft}>
          {post.views > 0 && (
            <span style={styles.viewsCount}>
              <Eye size={14} /> {formatNum(post.views)}
            </span>
          )}
          {hasDeviation && (
            <button
              style={styles.statsToggle}
              onClick={(e) => { e.stopPropagation(); setShowStats(p => !p); }}
              title="Отклонения от среднего"
            >
              {showStats ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              <TrendingUp size={11} />
            </button>
          )}
        </div>
        <span style={styles.footerTime}>{formatTime(post.date)}</span>
      </div>

      {/* Expandable stats */}
      {showStats && hasDeviation && (
        <div style={styles.statsExpanded}>
          <DevBadge value={post.views_dev} label="Просм." />
          <DevBadge value={post.reactions_dev} label="Реакц." />
          <DevBadge value={post.comments_dev} label="Комм." />
          <DevBadge value={post.forwards_dev} label="Реп." />
        </div>
      )}
    </div>
  );
}

const styles = {
  card: {
    background: "var(--tg-bg-panel)",
    borderBottom: "1px solid var(--tg-border)",
    padding: 0,
    animation: "fadeIn 0.2s ease",
    transition: "background 0.1s",
  },
  channelHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 14px 6px",
  },
  channelLeft: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    cursor: "pointer",
    flex: 1,
    minWidth: 0,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #2aabee, #9b7cd5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: 16,
    color: "#fff",
    flexShrink: 0,
  },
  channelInfo: {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },
  channelName: {
    fontSize: 14,
    fontWeight: 600,
    color: "var(--tg-text)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  channelDate: {
    fontSize: 12,
    color: "var(--tg-text-muted)",
  },
  channelActions: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    flexShrink: 0,
  },
  favBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 30,
    height: 30,
    border: "none",
    borderRadius: 8,
    background: "transparent",
    cursor: "pointer",
    padding: 0,
    transition: "color 0.15s",
  },
  externalLink: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 30,
    height: 30,
    borderRadius: 8,
    color: "var(--tg-text-muted)",
    transition: "color 0.15s",
  },
  labelsRow: {
    display: "flex",
    gap: 6,
    padding: "0 14px 4px",
    flexWrap: "wrap",
  },
  categoryTag: {
    padding: "2px 8px",
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
  },
  adLabel: {
    padding: "2px 8px",
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
    background: "var(--tg-orange-muted)",
    color: "var(--tg-orange)",
  },
  gamblingLabel: {
    padding: "2px 8px",
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
    background: "var(--tg-red-muted)",
    color: "var(--tg-red)",
  },
  photoArea: {
    margin: "4px 0",
    background: "rgba(255,255,255,0.03)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "32px 0",
  },
  photoText: {
    fontSize: 13,
    color: "var(--tg-text-muted)",
  },
  textBody: {
    fontSize: 14,
    color: "var(--tg-text)",
    lineHeight: 1.55,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    padding: "4px 14px 8px",
  },
  mediaBody: {
    fontSize: 13,
    color: "var(--tg-text-muted)",
    fontStyle: "italic",
    padding: "4px 14px 8px",
  },
  reactionsRow: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
    padding: "0 14px 8px",
  },
  reactionPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "5px 12px",
    borderRadius: 20,
    background: "var(--tg-reaction-bg)",
    color: "var(--tg-text)",
    fontSize: 13,
    fontWeight: 500,
    cursor: "default",
    transition: "background 0.15s",
  },
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 14px 10px",
  },
  footerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  viewsCount: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontSize: 13,
    color: "var(--tg-text-muted)",
  },
  statsToggle: {
    display: "flex",
    alignItems: "center",
    gap: 2,
    padding: "2px 6px",
    border: "none",
    borderRadius: 6,
    background: "rgba(255,255,255,0.05)",
    color: "var(--tg-text-muted)",
    cursor: "pointer",
    fontSize: 10,
  },
  footerTime: {
    fontSize: 12,
    color: "var(--tg-text-muted)",
  },
  statsExpanded: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
    padding: "0 14px 10px",
    animation: "fadeIn 0.15s ease",
  },
  devBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 3,
    padding: "3px 8px",
    borderRadius: 10,
    fontSize: 11,
    fontWeight: 600,
  },
};
