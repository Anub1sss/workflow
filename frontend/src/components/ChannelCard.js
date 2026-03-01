import React from "react";
import {
  Users, Eye, MessageCircle, ExternalLink, Clock, TrendingUp, TrendingDown,
  BarChart3, Megaphone, AlertTriangle, Heart, MessageSquare, Share2, Camera,
} from "lucide-react";

function formatNum(n) {
  if (!n) return "0";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function timeAgo(ts) {
  if (!ts) return "";
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 0) return "сейчас";
  if (diff < 3600) return Math.floor(diff / 60) + " мин назад";
  if (diff < 86400) return Math.floor(diff / 3600) + " ч назад";
  if (diff < 2592000) return Math.floor(diff / 86400) + " дн назад";
  return new Date(ts * 1000).toLocaleDateString("ru-RU");
}

function stripHtml(html) {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function channelTypeBadge(type) {
  const map = {
    "авторский": { bg: "var(--blue-muted)", color: "var(--blue)", label: "Авторский" },
    "новостной": { bg: "var(--green-muted)", color: "var(--green)", label: "Новостной" },
    "агрегатор": { bg: "var(--orange-muted)", color: "var(--orange)", label: "Агрегатор" },
    "сетка": { bg: "var(--red-muted)", color: "var(--red)", label: "Сетка" },
    "личный блог": { bg: "var(--blue-muted)", color: "var(--blue)", label: "Личный блог" },
    "гибрид": { bg: "var(--orange-muted)", color: "var(--orange)", label: "Гибрид" },
    "обезличенный": { bg: "var(--accent-muted)", color: "var(--accent)", label: "Обезличенный" },
  };
  return map[type] || null;
}

function erColor(er) {
  if (er >= 1) return "var(--green)";
  if (er >= 0.3) return "var(--orange)";
  return "var(--text-secondary)";
}

function DevChip({ value, label }) {
  if (!value || value === 0) return null;
  const positive = value > 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  const c = positive ? "var(--green)" : "var(--red)";
  const bg = positive ? "var(--green-muted)" : "var(--red-muted)";
  return (
    <span style={{ ...styles.devChip, color: c, background: bg }}>
      <Icon size={9} /> {label} {positive ? "+" : ""}{value.toFixed(0)}%
    </span>
  );
}

export default function ChannelCard({ channel, onClick }) {
  const detectedBadge = channelTypeBadge(channel.channel_type_detected);
  const typeBadge = !detectedBadge ? channelTypeBadge(channel.channel_type) : detectedBadge;
  const hasAvatar = channel.image100 && channel.image100.startsWith("http");
  const postText = stripHtml(channel.last_post_text);
  const hasLastPost = postText.length > 0 || channel.last_post_date > 0 || channel.last_post_views > 0 || channel.last_post_link;

  const er = channel.er_pct || 0;
  const errVal = channel.err_pct || 0;
  const vis = channel.visibility_pct || 0;
  const freq = channel.publish_frequency || 0;
  const subs = channel.tg_participants || channel.subscribers || 0;
  const views = channel.avg_views_30d || channel.avg_views || 0;
  const posts30 = channel.posts_30d || 0;

  const hasDeviation = !!(channel.last_post_views_dev || channel.last_post_reactions_dev
    || channel.last_post_comments_dev || channel.last_post_forwards_dev);

  return (
    <div style={styles.card} onClick={onClick} role="button" tabIndex={0}>
      <div style={styles.topRow}>
        {hasAvatar ? (
          <img
            src={channel.image100}
            alt=""
            style={styles.avatarImg}
            onError={e => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
          />
        ) : null}
        <div style={{ ...styles.avatar, display: hasAvatar ? "none" : "flex" }}>
          {(channel.title || channel.username || "?").charAt(0).toUpperCase()}
        </div>
        <div style={styles.nameBlock}>
          <h3 style={styles.name}>{channel.title || channel.username}</h3>
          <span style={styles.username}>@{channel.username}</span>
        </div>
        {channel.url && (
          <a href={channel.url} target="_blank" rel="noopener noreferrer"
            style={styles.extLink} onClick={e => e.stopPropagation()}>
            <ExternalLink size={14} />
          </a>
        )}
      </div>

      {channel.description && (
        <p style={styles.desc}>
          {channel.description.length > 100 ? channel.description.slice(0, 100) + "…" : channel.description}
        </p>
      )}

      <div style={styles.badgeRow}>
        {typeBadge && (
          <span style={{ ...styles.badge, background: typeBadge.bg, color: typeBadge.color }}>
            {typeBadge.label}
          </span>
        )}
        {channel.has_linked_chat === 1 && (
          <span style={{ ...styles.badge, background: "var(--accent-muted)", color: "var(--accent)" }}>💬 Чат</span>
        )}
        {channel.ad_pct_30d > 10 && (
          <span style={{ ...styles.badge, background: "var(--orange-muted)", color: "var(--orange)" }}>
            <Megaphone size={10} /> {channel.ad_pct_30d}% рекл.
          </span>
        )}
        {channel.gambling_pct_30d > 0 && (
          <span style={{ ...styles.badge, background: "var(--red-muted)", color: "var(--red)" }}>
            <AlertTriangle size={10} /> гемблинг
          </span>
        )}
      </div>

      {(subs > 0 || views > 0 || er > 0 || errVal > 0) && (
        <div style={styles.metricsGrid}>
          {subs > 0 && (
            <div style={styles.metricBox}>
              <Users size={13} color="var(--blue)" />
              <span style={styles.metricVal}>{formatNum(subs)}</span>
              <span style={styles.metricLabel}>подп.</span>
            </div>
          )}
          {views > 0 && (
            <div style={styles.metricBox}>
              <Eye size={13} color="var(--accent)" />
              <span style={styles.metricVal}>{formatNum(views)}</span>
              <span style={styles.metricLabel}>просм.</span>
            </div>
          )}
          {er > 0 && (
            <div style={styles.metricBox}>
              <TrendingUp size={13} color={erColor(er)} />
              <span style={{ ...styles.metricVal, color: erColor(er) }}>{er.toFixed(2)}%</span>
              <span style={styles.metricLabel}>ER</span>
            </div>
          )}
          {errVal > 0 && (
            <div style={styles.metricBox}>
              <TrendingUp size={13} color={erColor(errVal)} />
              <span style={{ ...styles.metricVal, color: erColor(errVal) }}>{errVal.toFixed(2)}%</span>
              <span style={styles.metricLabel}>ERR</span>
            </div>
          )}
        </div>
      )}

      <div style={styles.statsRow}>
        {posts30 > 0 && (
          <span style={styles.miniStat}>
            <MessageCircle size={12} /> {posts30}/мес · {freq.toFixed(1)}/день
          </span>
        )}
        {vis > 0 && (
          <span style={styles.miniStat}>
            <BarChart3 size={12} /> {vis.toFixed(0)}% охват
          </span>
        )}
        {channel.channel_age_days > 0 && (
          <span style={styles.miniStat}>
            {Math.floor(channel.channel_age_days / 365)}г {Math.floor((channel.channel_age_days % 365) / 30)}м
          </span>
        )}
      </div>

      {channel.characteristics && (
        <div style={styles.tags}>
          {channel.characteristics.split(/\s+/).slice(0, 4).map((tag, i) => (
            <span key={i} style={styles.tag}>{tag}</span>
          ))}
        </div>
      )}

      {hasLastPost && (
        <div style={styles.lastPost}>
          <div style={styles.lastPostHeader}>
            <Clock size={12} />
            <span>Последний пост</span>
            {channel.last_post_has_photo === 1 && (
              <span style={styles.photoBadge}><Camera size={10} /></span>
            )}
            {channel.last_post_date > 0 && (
              <span style={styles.lastPostTime}>{timeAgo(channel.last_post_date)}</span>
            )}
          </div>
          <div style={styles.lastPostMetrics}>
            {channel.last_post_views > 0 && (
              <span style={styles.lpMetric}><Eye size={11} /> {formatNum(channel.last_post_views)}</span>
            )}
            {channel.last_post_reactions > 0 && (
              <span style={styles.lpMetric}><Heart size={11} color="var(--red)" /> {formatNum(channel.last_post_reactions)}</span>
            )}
            {channel.last_post_comments > 0 && (
              <span style={styles.lpMetric}><MessageSquare size={11} color="var(--blue)" /> {formatNum(channel.last_post_comments)}</span>
            )}
            {channel.last_post_forwards > 0 && (
              <span style={styles.lpMetric}><Share2 size={11} /> {formatNum(channel.last_post_forwards)}</span>
            )}
          </div>
          {postText.length > 0 && (
            <p style={styles.lastPostText}>
              {postText.length > 150 ? postText.slice(0, 150) + "…" : postText}
            </p>
          )}
          {hasDeviation && (
            <div style={styles.devRow}>
              <DevChip value={channel.last_post_views_dev} label="Просм." />
              <DevChip value={channel.last_post_reactions_dev} label="Реакц." />
              <DevChip value={channel.last_post_comments_dev} label="Комм." />
              <DevChip value={channel.last_post_forwards_dev} label="Реп." />
            </div>
          )}
          {channel.last_post_link && (
            <a
              href={channel.last_post_link.startsWith("http") ? channel.last_post_link : `https://${channel.last_post_link}`}
              target="_blank" rel="noopener noreferrer"
              style={styles.postLink} onClick={e => e.stopPropagation()}
            >
              Читать →
            </a>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  card: {
    background: "var(--bg-card)", border: "1px solid var(--border)",
    borderRadius: "var(--radius)", padding: 18, cursor: "pointer",
    transition: "all 0.2s", display: "flex", flexDirection: "column", gap: 10,
  },
  topRow: { display: "flex", alignItems: "center", gap: 12 },
  avatarImg: { width: 42, height: 42, borderRadius: 11, objectFit: "cover", flexShrink: 0 },
  avatar: {
    width: 42, height: 42, borderRadius: 11,
    background: "linear-gradient(135deg, #6366f1, #a855f7)",
    alignItems: "center", justifyContent: "center",
    fontWeight: 700, fontSize: 17, color: "#fff", flexShrink: 0,
  },
  nameBlock: { flex: 1, overflow: "hidden" },
  name: { fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  username: { fontSize: 11, color: "var(--text-secondary)" },
  extLink: {
    width: 28, height: 28, display: "flex", alignItems: "center",
    justifyContent: "center", borderRadius: 6, color: "var(--text-secondary)", flexShrink: 0,
  },
  desc: { fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 },
  badgeRow: { display: "flex", gap: 6, flexWrap: "wrap" },
  badge: {
    display: "inline-flex", alignItems: "center", gap: 4,
    padding: "2px 8px", borderRadius: 5, fontSize: 10, fontWeight: 600,
  },
  metricsGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(60px, 1fr))", gap: 6,
  },
  metricBox: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
    background: "var(--bg-secondary)", borderRadius: 8, padding: "8px 4px",
    border: "1px solid var(--border)",
  },
  metricVal: { fontSize: 13, fontWeight: 700, color: "var(--text-primary)" },
  metricLabel: { fontSize: 9, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 0.5 },
  statsRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
  },
  miniStat: {
    display: "flex", alignItems: "center", gap: 4,
    fontSize: 11, color: "var(--text-secondary)",
  },
  tags: { display: "flex", gap: 5, flexWrap: "wrap" },
  tag: {
    padding: "2px 7px", borderRadius: 4, fontSize: 10,
    background: "var(--bg-secondary)", color: "var(--text-secondary)",
    border: "1px solid var(--border)",
  },
  lastPost: {
    background: "var(--bg-secondary)", border: "1px solid var(--border)",
    borderRadius: 8, padding: "10px 12px", display: "flex",
    flexDirection: "column", gap: 5,
  },
  lastPostHeader: {
    display: "flex", alignItems: "center", gap: 6,
    fontSize: 11, color: "var(--text-secondary)", fontWeight: 500,
  },
  photoBadge: {
    display: "inline-flex", alignItems: "center",
    padding: "1px 4px", borderRadius: 3, fontSize: 10,
    background: "var(--accent-muted)", color: "var(--accent)",
  },
  lastPostTime: { marginLeft: "auto", fontSize: 10, color: "var(--text-secondary)", opacity: 0.7 },
  lastPostMetrics: {
    display: "flex", gap: 10, alignItems: "center",
  },
  lpMetric: {
    display: "flex", alignItems: "center", gap: 3,
    fontSize: 10, color: "var(--text-secondary)",
  },
  lastPostText: {
    fontSize: 11, color: "var(--text-primary)", lineHeight: 1.5,
    opacity: 0.85, whiteSpace: "pre-wrap", wordBreak: "break-word",
  },
  devRow: { display: "flex", gap: 4, flexWrap: "wrap" },
  devChip: {
    display: "inline-flex", alignItems: "center", gap: 2,
    padding: "1px 6px", borderRadius: 4, fontSize: 9, fontWeight: 600,
  },
  postLink: { fontSize: 11, color: "var(--accent)", fontWeight: 500, alignSelf: "flex-end" },
};
