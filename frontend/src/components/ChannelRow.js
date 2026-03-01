import React from "react";
import { Users, Eye, TrendingUp, MessageCircle } from "lucide-react";

function formatNum(n) {
  if (!n) return "0";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function erColor(er) {
  if (er >= 1) return "var(--tg-green)";
  if (er >= 0.3) return "var(--tg-orange)";
  return "var(--tg-text-muted)";
}

function timeAgo(ts) {
  if (!ts) return "";
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 3600) return Math.floor(diff / 60) + "м";
  if (diff < 86400) return Math.floor(diff / 3600) + "ч";
  if (diff < 2592000) return Math.floor(diff / 86400) + "д";
  return new Date(ts * 1000).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

export default function ChannelRow({ channel, onClick }) {
  const hasAvatar = channel.image100 && channel.image100.startsWith("http");
  const initial = (channel.title || channel.username || "?").charAt(0).toUpperCase();
  const subs = channel.tg_participants || channel.subscribers || 0;
  const views = channel.avg_views_30d || channel.avg_views || 0;
  const er = channel.er_pct || 0;
  const lastPostText = (channel.last_post_text || "").replace(/<[^>]+>/g, "").trim();
  const preview = lastPostText.length > 60 ? lastPostText.slice(0, 60) + "…" : lastPostText;

  return (
    <div style={styles.row} onClick={onClick}>
      {/* Avatar */}
      {hasAvatar ? (
        <img src={channel.image100} alt="" style={styles.avatar}
          onError={e => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }} />
      ) : null}
      <div style={{ ...styles.avatarFallback, display: hasAvatar ? "none" : "flex" }}>
        {initial}
      </div>

      {/* Info */}
      <div style={styles.info}>
        <div style={styles.topLine}>
          <span style={styles.name}>{channel.title || channel.username}</span>
          {channel.last_post_date > 0 && (
            <span style={styles.time}>{timeAgo(channel.last_post_date)}</span>
          )}
        </div>
        {preview && (
          <p style={styles.preview}>{preview}</p>
        )}
        <div style={styles.metrics}>
          <span style={styles.metric}>
            <Users size={11} /> {formatNum(subs)}
          </span>
          {views > 0 && (
            <span style={styles.metric}>
              <Eye size={11} /> {formatNum(views)}
            </span>
          )}
          {er > 0 && (
            <span style={{ ...styles.metric, color: erColor(er) }}>
              <TrendingUp size={11} /> {er.toFixed(2)}%
            </span>
          )}
          {channel.posts_30d > 0 && (
            <span style={styles.metric}>
              <MessageCircle size={11} /> {channel.posts_30d}/мес
            </span>
          )}
        </div>
      </div>

      {/* Type badge */}
      {channel.channel_type_detected && (
        <div style={styles.typeDot} title={channel.channel_type_detected} />
      )}
    </div>
  );
}

const styles = {
  row: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    padding: "10px 14px",
    cursor: "pointer",
    transition: "background 0.1s",
    borderBottom: "1px solid rgba(255,255,255,0.03)",
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: "50%",
    objectFit: "cover",
    flexShrink: 0,
  },
  avatarFallback: {
    width: 42,
    height: 42,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #5ea5e5, #9b7cd5)",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: 16,
    color: "#fff",
    flexShrink: 0,
  },
  info: {
    flex: 1,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    gap: 3,
  },
  topLine: {
    display: "flex",
    alignItems: "baseline",
    gap: 6,
  },
  name: {
    fontSize: 14,
    fontWeight: 600,
    color: "var(--tg-text)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    flex: 1,
  },
  time: {
    fontSize: 11,
    color: "var(--tg-text-muted)",
    flexShrink: 0,
  },
  preview: {
    fontSize: 13,
    color: "var(--tg-text-secondary)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    lineHeight: 1.4,
  },
  metrics: {
    display: "flex",
    gap: 10,
    marginTop: 2,
  },
  metric: {
    display: "flex",
    alignItems: "center",
    gap: 3,
    fontSize: 11,
    color: "var(--tg-text-muted)",
  },
  typeDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "var(--tg-accent)",
    flexShrink: 0,
    marginTop: 6,
  },
};
