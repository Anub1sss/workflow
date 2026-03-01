import React from "react";
import {
  X, Users, Eye, MessageCircle, Hash, ExternalLink, AlertTriangle,
  Megaphone, Globe, MapPin, Clock, TrendingUp, TrendingDown, BarChart3,
  Activity, Calendar, MessageSquare, Share2, Zap, Heart, Camera,
} from "lucide-react";

function formatNum(n) {
  if (!n) return "0";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function formatDate(ts) {
  if (!ts) return "";
  return new Date(ts * 1000).toLocaleDateString("ru-RU", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function stripHtml(html) {
  if (!html) return "";
  return html.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'")
    .replace(/\n{3,}/g, "\n\n").trim();
}

function erColor(er) {
  if (er >= 1) return "var(--green)";
  if (er >= 0.3) return "var(--orange)";
  return "var(--text-secondary)";
}

function stabilityColor(s) {
  if (s >= 70) return "var(--green)";
  if (s >= 40) return "var(--orange)";
  return "var(--red)";
}

export default function ChannelModal({ channel, onClose }) {
  if (!channel) return null;

  const ch = channel;
  const hasAvatar = ch.image640 && ch.image640.startsWith("http");
  const postText = stripHtml(ch.last_post_text);
  const hasLastPost = postText.length > 0 || ch.last_post_date > 0 || ch.last_post_views > 0 || ch.last_post_link;

  const subs = ch.tg_participants || ch.subscribers || 0;
  const views = ch.avg_views_30d || ch.avg_views || 0;
  const er = ch.er_pct || 0;
  const err = ch.err_pct || 0;
  const vis = ch.visibility_pct || 0;
  const freq = ch.publish_frequency || 0;
  const stability = ch.publish_stability || 0;
  const age = ch.channel_age_days || 0;
  const posts30 = ch.posts_30d || 0;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <button style={styles.close} onClick={onClose}><X size={20} /></button>

        {/* Header */}
        <div style={styles.header}>
          {hasAvatar ? (
            <img src={ch.image640} alt="" style={styles.avatarImg} />
          ) : (
            <div style={styles.avatar}>
              {(ch.title || ch.username || "?").charAt(0).toUpperCase()}
            </div>
          )}
          <div style={{ flex: 1 }}>
            <h2 style={styles.title}>{ch.title || ch.username}</h2>
            <div style={styles.usernameRow}>
              <span style={styles.usernameText}>@{ch.username}</span>
              {ch.url && (
                <a href={ch.url} target="_blank" rel="noopener noreferrer" style={styles.link}>
                  <ExternalLink size={13} /> Открыть
                </a>
              )}
            </div>
            <div style={styles.metaTags}>
              {ch.channel_type_detected && (
                <span style={styles.metaTag}>{ch.channel_type_detected}</span>
              )}
              {ch.has_linked_chat === 1 && (
                <span style={{ ...styles.metaTag, background: "var(--green-muted)", color: "var(--green)" }}>💬 Привязанный чат</span>
              )}
              {ch.country && <span style={styles.metaTag}><MapPin size={10} /> {ch.country}</span>}
              {ch.language && <span style={styles.metaTag}><Globe size={10} /> {ch.language}</span>}
              {ch.primary_niche && <span style={styles.metaTag}>{ch.primary_niche}</span>}
            </div>
          </div>
        </div>

        {(ch.about || ch.description) && (
          <p style={styles.desc}>{ch.about || ch.description}</p>
        )}

        {/* Аудитория и охват */}
        {(subs > 0 || views > 0 || vis > 0) && (
          <Section title="Аудитория и охват" icon={<Users size={14} />}>
            <div style={styles.gridAuto}>
              {subs > 0 && <StatBox icon={<Users size={16} />} label="Подписчики" value={formatNum(subs)} color="var(--blue)" />}
              {views > 0 && <StatBox icon={<Eye size={16} />} label="Ср. просмотры" value={formatNum(views)} color="var(--accent)" />}
              {vis > 0 && <StatBox icon={<BarChart3 size={16} />} label="Видимость" value={vis.toFixed(1) + "%"} color="var(--green)" />}
              {ch.ci_index > 0 && <StatBox icon={<Hash size={16} />} label="CI Index" value={ch.ci_index.toFixed(1)} color="var(--orange)" />}
            </div>
          </Section>
        )}

        {/* Активность */}
        {(posts30 > 0 || freq > 0 || age > 0) && (
          <Section title="Активность" icon={<Activity size={14} />}>
            <div style={styles.gridAuto}>
              {posts30 > 0 && <StatBox icon={<MessageCircle size={16} />} label="Постов/мес" value={posts30} color="var(--blue)" />}
              {freq > 0 && <StatBox icon={<Zap size={16} />} label="Пост./день" value={freq.toFixed(1)} color="var(--accent)" />}
              {stability > 0 && <StatBox icon={<BarChart3 size={16} />} label="Стабильность"
                value={stability.toFixed(0) + "%"} color={stabilityColor(stability)} />}
              {age > 0 && <StatBox icon={<Calendar size={16} />} label="Возраст"
                value={age > 365 ? Math.floor(age / 365) + "г " + Math.floor((age % 365) / 30) + "м" : age + "дн"} color="var(--text-secondary)" />}
            </div>
          </Section>
        )}

        {/* Вовлечённость */}
        {(er > 0 || err > 0 || (ch.avg_reactions_30d || 0) > 0 || (ch.avg_forwards_30d || 0) > 0) && (
          <Section title="Вовлечённость" icon={<TrendingUp size={14} />}>
            <div style={styles.gridAuto}>
              {er > 0 && <StatBox icon={<TrendingUp size={16} />} label="ER" value={er.toFixed(3) + "%"} color={erColor(er)} />}
              {err > 0 && <StatBox icon={<TrendingUp size={16} />} label="ERR" value={err.toFixed(3) + "%"} color={erColor(err)} />}
              {(ch.avg_reactions_30d || 0) > 0 && <StatBox icon={<MessageSquare size={16} />} label="Ср. реакции" value={(ch.avg_reactions_30d).toFixed(1)} color="var(--orange)" />}
              {(ch.avg_forwards_30d || 0) > 0 && <StatBox icon={<Share2 size={16} />} label="Ср. репосты" value={(ch.avg_forwards_30d).toFixed(1)} color="var(--accent)" />}
            </div>
          </Section>
        )}

        {/* Монетизация */}
        {(ch.ad_posts_30d > 0 || ch.gambling_pct_30d > 0) && (
          <Section title="Монетизация и риски" icon={<Megaphone size={14} />}>
            <div style={styles.risksGrid}>
              {ch.ad_posts_30d > 0 && (
                <div style={{ ...styles.riskCard, borderColor: "rgba(245,158,11,0.3)" }}>
                  <Megaphone size={16} color="var(--orange)" />
                  <div>
                    <div style={styles.riskValue}>{ch.ad_posts_30d} постов · {(ch.ad_pct_30d || 0).toFixed(1)}%</div>
                    <div style={styles.riskLabel}>Рекламные посты за 30 дней</div>
                  </div>
                </div>
              )}
              {ch.gambling_pct_30d > 0 && (
                <div style={{ ...styles.riskCard, borderColor: "rgba(239,68,68,0.3)" }}>
                  <AlertTriangle size={16} color="var(--red)" />
                  <div>
                    <div style={styles.riskValue}>{ch.gambling_posts_30d} постов · {ch.gambling_pct_30d.toFixed(1)}%</div>
                    <div style={styles.riskLabel}>Гемблинг-контент</div>
                  </div>
                </div>
              )}
            </div>
            {ch.top_advertisers && (
              <div style={styles.advertisers}>
                <span style={styles.advLabel}>Рекламодатели:</span>
                <span style={styles.advValue}>{ch.top_advertisers}</span>
              </div>
            )}
          </Section>
        )}

        {/* Контент */}
        {ch.content_summary && (
          <Section title="Ключевые темы" icon={<Hash size={14} />}>
            <div style={styles.contentTags}>
              {ch.content_summary.split(",").map((w, i) => (
                <span key={i} style={styles.contentTag}>{w.trim()}</span>
              ))}
            </div>
          </Section>
        )}

        {ch.characteristics && (
          <div style={styles.tags}>
            {ch.characteristics.split(/\s+/).map((tag, i) => (
              <span key={i} style={styles.charTag}>{tag}</span>
            ))}
          </div>
        )}

        {/* Последний пост */}
        {hasLastPost && (
          <Section title="Последний пост" icon={<Clock size={14} />}>
            <div style={styles.lastPostBox}>
              {ch.last_post_has_photo === 1 && (
                <div style={styles.lastPostPhoto}><Camera size={14} /> С фото</div>
              )}
              {postText.length > 0 && (
                <p style={styles.lastPostText}>
                  {postText.length > 600 ? postText.slice(0, 600) + "…" : postText}
                </p>
              )}
              <div style={styles.lastPostMeta}>
                {ch.last_post_date > 0 && <span>{formatDate(ch.last_post_date)}</span>}
                {ch.last_post_views > 0 && (
                  <span style={styles.lastPostViews}><Eye size={12} /> {formatNum(ch.last_post_views)}</span>
                )}
                {ch.last_post_reactions > 0 && (
                  <span style={styles.lastPostViews}><Heart size={12} /> {formatNum(ch.last_post_reactions)}</span>
                )}
                {ch.last_post_comments > 0 && (
                  <span style={styles.lastPostViews}><MessageSquare size={12} /> {formatNum(ch.last_post_comments)}</span>
                )}
                {ch.last_post_forwards > 0 && (
                  <span style={styles.lastPostViews}><Share2 size={12} /> {formatNum(ch.last_post_forwards)}</span>
                )}
                {ch.last_post_link && (
                  <a
                    href={ch.last_post_link.startsWith("http") ? ch.last_post_link : `https://${ch.last_post_link}`}
                    target="_blank" rel="noopener noreferrer" style={styles.postLink}
                  >
                    <ExternalLink size={12} /> Читать в Telegram
                  </a>
                )}
              </div>
              {!!(ch.last_post_views_dev || ch.last_post_reactions_dev || ch.last_post_comments_dev || ch.last_post_forwards_dev) && (
                <div style={styles.devSection}>
                  <span style={styles.devTitle}>Отклонение от среднего по каналу:</span>
                  <div style={styles.devRow}>
                    <DevChip value={ch.last_post_views_dev} label="Просм." />
                    <DevChip value={ch.last_post_reactions_dev} label="Реакц." />
                    <DevChip value={ch.last_post_comments_dev} label="Комм." />
                    <DevChip value={ch.last_post_forwards_dev} label="Реп." />
                  </div>
                </div>
              )}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({ title, icon, children }) {
  return (
    <div style={styles.section}>
      <h4 style={styles.sectionTitle}>{icon} {title}</h4>
      {children}
    </div>
  );
}

function StatBox({ icon, label, value, color }) {
  return (
    <div style={styles.statBox}>
      <div style={{ color }}>{icon}</div>
      <div style={{ ...styles.statValue, color }}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

function DevChip({ value, label }) {
  if (!value || value === 0) return null;
  const positive = value > 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  const color = positive ? "var(--green)" : "var(--red)";
  const bg = positive ? "var(--green-muted)" : "var(--red-muted)";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 8px", borderRadius: 5, fontSize: 11, fontWeight: 600, color, background: bg }}>
      <Icon size={11} /> {label} {positive ? "+" : ""}{value.toFixed(0)}%
    </span>
  );
}

const styles = {
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 200, padding: 20, backdropFilter: "blur(4px)",
  },
  modal: {
    background: "var(--tg-bg-secondary)", border: "1px solid var(--tg-border)",
    borderRadius: 12, padding: 24, width: "100%", maxWidth: 640,
    maxHeight: "90vh", overflowY: "auto", position: "relative",
    display: "flex", flexDirection: "column", gap: 16,
  },
  close: {
    position: "absolute", top: 12, right: 12,
    background: "var(--tg-bg-panel)", border: "1px solid var(--tg-border)",
    borderRadius: 8, width: 32, height: 32,
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "var(--tg-text-muted)", cursor: "pointer",
  },
  header: { display: "flex", gap: 14, alignItems: "flex-start" },
  avatarImg: { width: 52, height: 52, borderRadius: "50%", objectFit: "cover", flexShrink: 0 },
  avatar: {
    width: 52, height: 52, borderRadius: "50%",
    background: "linear-gradient(135deg, #5ea5e5, #9b7cd5)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontWeight: 700, fontSize: 20, color: "#fff", flexShrink: 0,
  },
  title: { fontSize: 19, fontWeight: 700 },
  usernameRow: { display: "flex", alignItems: "center", gap: 12, marginTop: 2 },
  usernameText: { fontSize: 13, color: "var(--text-secondary)" },
  link: {
    display: "flex", alignItems: "center", gap: 4,
    fontSize: 12, color: "var(--accent)", fontWeight: 500,
  },
  metaTags: { display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" },
  metaTag: {
    display: "inline-flex", alignItems: "center", gap: 4,
    fontSize: 10, color: "var(--text-secondary)",
    background: "var(--bg-card)", padding: "2px 8px", borderRadius: 5,
    border: "1px solid var(--border)",
  },
  desc: { fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 },
  section: {},
  sectionTitle: {
    fontSize: 13, fontWeight: 600, marginBottom: 10,
    color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6,
  },
  grid4: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 },
  gridAuto: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 8 },
  statBox: {
    background: "var(--bg-card)", border: "1px solid var(--border)",
    borderRadius: 10, padding: "12px 8px", textAlign: "center",
    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
  },
  statValue: { fontSize: 18, fontWeight: 700 },
  statLabel: { fontSize: 10, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 0.3 },
  risksGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  riskCard: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "12px 14px", background: "var(--bg-card)",
    border: "1px solid var(--border)", borderRadius: 10,
  },
  riskValue: { fontSize: 14, fontWeight: 600 },
  riskLabel: { fontSize: 11, color: "var(--text-secondary)", marginTop: 2 },
  advertisers: {
    marginTop: 8, padding: "10px 14px", background: "var(--bg-card)",
    borderRadius: 8, border: "1px solid var(--border)",
    display: "flex", gap: 8, flexWrap: "wrap", alignItems: "baseline",
  },
  advLabel: { fontSize: 11, color: "var(--text-secondary)", fontWeight: 500 },
  advValue: { fontSize: 12, color: "var(--text-primary)", wordBreak: "break-all" },
  contentTags: { display: "flex", gap: 6, flexWrap: "wrap" },
  contentTag: {
    padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 500,
    background: "var(--accent-muted)", color: "var(--accent)",
  },
  tags: { display: "flex", gap: 5, flexWrap: "wrap" },
  charTag: {
    padding: "3px 9px", borderRadius: 5, fontSize: 11,
    background: "var(--bg-card)", color: "var(--text-secondary)",
    border: "1px solid var(--border)",
  },
  lastPostBox: {
    background: "var(--bg-card)", border: "1px solid var(--border)",
    borderRadius: 10, padding: 16,
  },
  lastPostText: {
    fontSize: 13, color: "var(--text-primary)", lineHeight: 1.7,
    whiteSpace: "pre-wrap", wordBreak: "break-word",
  },
  lastPostMeta: {
    display: "flex", alignItems: "center", gap: 14, marginTop: 10,
    paddingTop: 10, borderTop: "1px solid var(--border)",
    fontSize: 12, color: "var(--text-secondary)", flexWrap: "wrap",
  },
  lastPostViews: { display: "flex", alignItems: "center", gap: 4 },
  postLink: {
    display: "flex", alignItems: "center", gap: 4,
    color: "var(--accent)", fontWeight: 500, marginLeft: "auto",
  },
  lastPostPhoto: {
    display: "inline-flex", alignItems: "center", gap: 5,
    padding: "3px 10px", borderRadius: 5, fontSize: 11, fontWeight: 600,
    background: "var(--accent-muted)", color: "var(--accent)", marginBottom: 8,
  },
  devSection: {
    marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)",
  },
  devTitle: { fontSize: 11, color: "var(--text-secondary)", fontWeight: 600, display: "block", marginBottom: 6 },
  devRow: { display: "flex", gap: 6, flexWrap: "wrap" },
};
