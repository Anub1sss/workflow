import React from "react";
import { Eye, Share2, Heart, MessageSquare, TrendingUp, TrendingDown, Camera, ExternalLink } from "lucide-react";

const CATEGORY_COLORS = {
  "Кейс применения": "#4fae4e",
  "Научная публикация": "#5ea5e5",
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
    <span style={{ ...styles.devBadge, color }}>
      <Icon size={10} /> {label} {positive ? "+" : ""}{value.toFixed(0)}%
    </span>
  );
}

export default function PostCard({ post }) {
  const catColor = CATEGORY_COLORS[post.category] || "var(--tg-accent)";
  const text = (post.text || "").trim();
  const preview = text.length > 400 ? text.slice(0, 400) + "…" : text;

  const hasDeviation = !!(post.views_dev || post.reactions_dev || post.comments_dev || post.forwards_dev);
  const channelInitial = (post.channel_title || post.channel_username || "?").charAt(0).toUpperCase();
  const postLink = post.channel_username && post.tg_message_id
    ? `https://t.me/${post.channel_username}/${post.tg_message_id}`
    : null;

  return (
    <div style={styles.message}>
      {/* Channel avatar */}
      <div style={styles.avatarCol}>
        <div style={styles.avatar}>{channelInitial}</div>
      </div>

      {/* Bubble */}
      <div style={styles.bubble}>
        {/* Channel name + time */}
        <div style={styles.bubbleHeader}>
          <span style={styles.channelName}>{post.channel_title || post.channel_username}</span>
          <span style={styles.time}>{formatTime(post.date)}</span>
        </div>

        {/* Category tag (like a colored label in TG) */}
        {post.category && (
          <span style={{ ...styles.categoryTag, background: catColor + "20", color: catColor, borderColor: catColor + "40" }}>
            {post.category}
          </span>
        )}

        {/* Ad / Gambling badges */}
        {(post.is_ad === 1 || post.is_gambling === 1) && (
          <div style={styles.warningRow}>
            {post.is_ad === 1 && <span style={styles.adLabel}>Реклама</span>}
            {post.is_gambling === 1 && <span style={styles.gamblingLabel}>Гемблинг</span>}
          </div>
        )}

        {/* Photo indicator */}
        {post.has_photo === 1 && (
          <div style={styles.photoPlaceholder}>
            <Camera size={20} color="var(--tg-text-muted)" />
            <span style={styles.photoText}>Фото</span>
          </div>
        )}

        {/* Message text */}
        {preview ? (
          <p style={styles.text}>{preview}</p>
        ) : (
          <p style={styles.mediaText}>Медиа-пост</p>
        )}

        {/* Reactions row — Telegram style */}
        {(post.reactions > 0 || post.comments > 0 || post.forwards > 0) && (
          <div style={styles.reactionsRow}>
            {post.reactions > 0 && (
              <span style={styles.reaction}>
                <Heart size={13} /> {formatNum(post.reactions)}
              </span>
            )}
            {post.comments > 0 && (
              <span style={styles.reaction}>
                <MessageSquare size={13} /> {formatNum(post.comments)}
              </span>
            )}
            {post.forwards > 0 && (
              <span style={styles.reaction}>
                <Share2 size={13} /> {formatNum(post.forwards)}
              </span>
            )}
          </div>
        )}

        {/* Deviation row */}
        {hasDeviation && (
          <div style={styles.devRow}>
            <DevBadge value={post.views_dev} label="Просм." />
            <DevBadge value={post.reactions_dev} label="Реакц." />
            <DevBadge value={post.comments_dev} label="Комм." />
            <DevBadge value={post.forwards_dev} label="Реп." />
          </div>
        )}

        {/* Bottom meta: views + time — exactly like Telegram */}
        <div style={styles.bubbleFooter}>
          {post.views > 0 && (
            <span style={styles.viewsCounter}>
              <Eye size={12} /> {formatNum(post.views)}
            </span>
          )}
          <span style={styles.footerTime}>{formatTime(post.date)}</span>
          {postLink && (
            <a href={postLink} target="_blank" rel="noopener noreferrer"
              style={styles.openLink} onClick={e => e.stopPropagation()}>
              <ExternalLink size={11} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  message: {
    display: "flex",
    gap: 8,
    padding: "4px 12px",
    animation: "fadeIn 0.2s ease",
  },
  avatarCol: {
    flexShrink: 0,
    paddingTop: 2,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #5ea5e5, #9b7cd5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: 14,
    color: "#fff",
  },
  bubble: {
    background: "var(--tg-bg-bubble)",
    borderRadius: "4px 18px 18px 18px",
    padding: "8px 12px 6px",
    maxWidth: 480,
    minWidth: 200,
    position: "relative",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  bubbleHeader: {
    display: "flex",
    alignItems: "baseline",
    gap: 8,
    marginBottom: 2,
  },
  channelName: {
    fontSize: 13,
    fontWeight: 600,
    color: "var(--tg-accent)",
    cursor: "pointer",
  },
  time: {
    fontSize: 11,
    color: "var(--tg-text-muted)",
    marginLeft: "auto",
    flexShrink: 0,
  },
  categoryTag: {
    alignSelf: "flex-start",
    padding: "2px 8px",
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600,
    border: "1px solid",
  },
  warningRow: {
    display: "flex",
    gap: 4,
  },
  adLabel: {
    padding: "1px 6px",
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 600,
    background: "var(--tg-orange-muted)",
    color: "var(--tg-orange)",
  },
  gamblingLabel: {
    padding: "1px 6px",
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 600,
    background: "var(--tg-red-muted)",
    color: "var(--tg-red)",
  },
  photoPlaceholder: {
    background: "rgba(255,255,255,0.04)",
    borderRadius: 10,
    padding: "20px 0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  photoText: {
    fontSize: 12,
    color: "var(--tg-text-muted)",
  },
  text: {
    fontSize: 14,
    color: "var(--tg-text)",
    lineHeight: 1.55,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  mediaText: {
    fontSize: 13,
    color: "var(--tg-text-muted)",
    fontStyle: "italic",
  },
  reactionsRow: {
    display: "flex",
    gap: 4,
    flexWrap: "wrap",
    marginTop: 4,
  },
  reaction: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "3px 10px",
    borderRadius: 20,
    background: "var(--tg-reaction-bg)",
    color: "var(--tg-accent)",
    fontSize: 12,
    fontWeight: 500,
    cursor: "default",
    transition: "background 0.15s",
  },
  devRow: {
    display: "flex",
    gap: 4,
    flexWrap: "wrap",
    marginTop: 2,
  },
  devBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 3,
    padding: "2px 7px",
    borderRadius: 10,
    fontSize: 10,
    fontWeight: 600,
    background: "rgba(255,255,255,0.04)",
  },
  bubbleFooter: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    justifyContent: "flex-end",
    marginTop: 2,
  },
  viewsCounter: {
    display: "flex",
    alignItems: "center",
    gap: 3,
    fontSize: 11,
    color: "var(--tg-text-muted)",
  },
  footerTime: {
    fontSize: 11,
    color: "var(--tg-text-muted)",
  },
  openLink: {
    display: "flex",
    alignItems: "center",
    color: "var(--tg-text-muted)",
    opacity: 0.7,
  },
};
