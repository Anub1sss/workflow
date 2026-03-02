import React, { useState } from "react";
import {
  Columns3, Table2, Plus, Sparkles, BarChart3, Star,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { useFavorites } from "../hooks/useFavorites";

export default function Sidebar({ view, setView, onAddColumn, columnCount }) {
  const [expanded, setExpanded] = useState(false);
  const { favorites } = useFavorites();

  const w = expanded ? 220 : 68;

  return (
    <div style={{ ...styles.sidebar, width: w }}>
      {/* Logo */}
      <div style={styles.logoRow}>
        <div style={styles.logo}>
          <Sparkles size={22} color="var(--tg-accent)" />
        </div>
        {expanded && <span style={styles.logoText}>TG Parser</span>}
      </div>

      {/* Nav */}
      <div style={styles.nav}>
        <SidebarBtn
          icon={<Columns3 size={20} />}
          label="Лента"
          active={view === "deck"}
          onClick={() => setView("deck")}
          expanded={expanded}
          badge={columnCount}
        />
        <SidebarBtn
          icon={<Table2 size={20} />}
          label="Каталог"
          active={view === "catalog"}
          onClick={() => setView("catalog")}
          expanded={expanded}
        />
        <SidebarBtn
          icon={<BarChart3 size={20} />}
          label="Аналитика"
          active={view === "analytics"}
          onClick={() => setView("analytics")}
          expanded={expanded}
        />
      </div>

      {/* Add column button */}
      {view === "deck" && (
        <button
          style={styles.addBtn}
          onClick={onAddColumn}
          title="Добавить колонку"
        >
          <Plus size={18} />
          {expanded && <span style={styles.addLabel}>Колонка</span>}
        </button>
      )}

      {/* Favorites */}
      {favorites.length > 0 && (
        <div style={styles.favSection}>
          <div style={styles.favHeader}>
            <Star size={12} color="var(--tg-accent)" />
            {expanded && <span style={styles.favTitle}>Мои каналы</span>}
          </div>
          <div style={styles.favList}>
            {favorites.slice(0, expanded ? 12 : 5).map((f) => {
              const hasImg = f.image100 && f.image100.startsWith("http");
              const initial = (f.title || f.username || "?").charAt(0).toUpperCase();
              return (
                <div key={f.username} style={styles.favItem} title={f.title || f.username}>
                  {hasImg ? (
                    <img src={f.image100} alt="" style={styles.favAvatar}
                      onError={(e) => { e.target.style.display = "none"; }} />
                  ) : (
                    <div style={styles.favAvatarFallback}>{initial}</div>
                  )}
                  {expanded && (
                    <span style={styles.favName}>
                      {f.title || `@${f.username}`}
                    </span>
                  )}
                </div>
              );
            })}
            {favorites.length > (expanded ? 12 : 5) && (
              <div style={styles.favMore}>
                +{favorites.length - (expanded ? 12 : 5)}
              </div>
            )}
          </div>
        </div>
      )}

      <div style={styles.spacer} />

      {/* Expand toggle */}
      <button
        style={styles.expandBtn}
        onClick={() => setExpanded((p) => !p)}
        title={expanded ? "Свернуть" : "Развернуть"}
      >
        {expanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>
    </div>
  );
}

function SidebarBtn({ icon, label, active, onClick, expanded, badge }) {
  return (
    <button
      style={{ ...styles.navBtn, ...(active ? styles.navActive : {}) }}
      onClick={onClick}
      title={!expanded ? label : undefined}
    >
      <div style={styles.navIconWrap}>
        {icon}
        {badge > 0 && !expanded && (
          <span style={styles.badge}>{badge}</span>
        )}
      </div>
      {expanded ? (
        <span style={styles.navLabelExpanded}>{label}</span>
      ) : (
        <span style={styles.navLabel}>{label}</span>
      )}
      {badge > 0 && expanded && (
        <span style={styles.badgeExpanded}>{badge}</span>
      )}
    </button>
  );
}

const styles = {
  sidebar: {
    background: "var(--tg-bg-secondary)",
    borderRight: "1px solid var(--tg-border)",
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    padding: "12px 0",
    gap: 4,
    flexShrink: 0,
    transition: "width 0.2s ease",
    overflow: "hidden",
  },
  logoRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "0 12px",
    marginBottom: 12,
    minHeight: 44,
  },
  logo: {
    width: 44,
    height: 44,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  logoText: {
    fontSize: 16,
    fontWeight: 800,
    color: "var(--tg-text)",
    whiteSpace: "nowrap",
    letterSpacing: -0.3,
  },
  nav: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    padding: "0 6px",
  },
  navBtn: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 8px",
    border: "none",
    borderRadius: 10,
    background: "transparent",
    color: "var(--tg-text-muted)",
    cursor: "pointer",
    transition: "all 0.15s",
    width: "100%",
    textAlign: "left",
  },
  navActive: {
    background: "var(--tg-accent-muted)",
    color: "var(--tg-accent)",
  },
  navIconWrap: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 24,
    height: 24,
    flexShrink: 0,
    marginLeft: 8,
  },
  navLabel: {
    fontSize: 9,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    display: "none",
  },
  navLabelExpanded: {
    fontSize: 13,
    fontWeight: 500,
    whiteSpace: "nowrap",
    flex: 1,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -6,
    background: "var(--tg-accent)",
    color: "#fff",
    fontSize: 9,
    fontWeight: 700,
    padding: "1px 4px",
    borderRadius: 6,
    minWidth: 14,
    textAlign: "center",
    lineHeight: "12px",
  },
  badgeExpanded: {
    background: "var(--tg-accent-muted)",
    color: "var(--tg-accent)",
    fontSize: 11,
    fontWeight: 700,
    padding: "2px 7px",
    borderRadius: 8,
    flexShrink: 0,
  },
  addBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    margin: "8px 10px",
    padding: "10px 0",
    borderRadius: 10,
    background: "var(--tg-accent)",
    border: "none",
    color: "#fff",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    transition: "transform 0.15s, opacity 0.15s",
  },
  addLabel: {
    whiteSpace: "nowrap",
  },
  favSection: {
    padding: "8px 10px 0",
  },
  favHeader: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
    padding: "0 4px",
  },
  favTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: "var(--tg-text-muted)",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    whiteSpace: "nowrap",
  },
  favList: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    alignItems: "stretch",
  },
  favItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "4px 6px",
    borderRadius: 8,
    cursor: "pointer",
    transition: "background 0.1s",
  },
  favAvatar: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    objectFit: "cover",
    flexShrink: 0,
  },
  favAvatarFallback: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #5ea5e5, #9b7cd5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: 11,
    color: "#fff",
    flexShrink: 0,
  },
  favName: {
    fontSize: 12,
    color: "var(--tg-text-secondary)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    flex: 1,
  },
  favMore: {
    fontSize: 11,
    color: "var(--tg-text-muted)",
    padding: "2px 6px",
    textAlign: "center",
  },
  spacer: { flex: 1 },
  expandBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 10px",
    padding: 8,
    borderRadius: 8,
    border: "none",
    background: "var(--tg-bg-panel)",
    color: "var(--tg-text-muted)",
    cursor: "pointer",
    transition: "background 0.15s",
  },
};
