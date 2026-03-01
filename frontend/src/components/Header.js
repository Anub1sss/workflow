import React from "react";
import { Search, BarChart3, LayoutGrid, Newspaper } from "lucide-react";

export default function Header({ view, setView, search, setSearch, onSearch }) {
  const tabs = [
    { id: "feed", icon: <LayoutGrid size={18} />, label: "Каналы" },
    { id: "posts", icon: <Newspaper size={18} />, label: "Посты" },
    { id: "stats", icon: <BarChart3 size={18} />, label: "Статистика" },
  ];

  return (
    <header style={styles.header}>
      <div style={styles.inner}>
        <div style={styles.brand}>
          <div style={styles.logo}>TG</div>
          <div>
            <h1 style={styles.title}>TG AI Channels</h1>
            <p style={styles.subtitle}>Агрегатор AI-каналов из Telegram</p>
          </div>
        </div>

        <form style={styles.searchWrap} onSubmit={e => { e.preventDefault(); onSearch(); }}>
          <Search size={18} color="var(--text-muted)" style={{ flexShrink: 0 }} />
          <input
            style={styles.searchInput}
            placeholder="Поиск каналов..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </form>

        <div style={styles.nav}>
          {tabs.map(t => (
            <button
              key={t.id}
              style={{ ...styles.navBtn, ...(view === t.id ? styles.navActive : {}) }}
              onClick={() => setView(t.id)}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}

const styles = {
  header: {
    background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)",
    position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(12px)",
  },
  inner: {
    maxWidth: 1400, margin: "0 auto", padding: "14px 24px",
    display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap",
  },
  brand: { display: "flex", alignItems: "center", gap: 12, flexShrink: 0 },
  logo: {
    width: 40, height: 40, borderRadius: 10,
    background: "linear-gradient(135deg, var(--accent), #a855f7)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontWeight: 800, fontSize: 16, color: "#fff",
  },
  title: { fontSize: 18, fontWeight: 700, lineHeight: 1.2 },
  subtitle: { fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.2 },
  searchWrap: {
    flex: 1, minWidth: 200, maxWidth: 480, display: "flex", alignItems: "center", gap: 10,
    background: "var(--bg-input)", border: "1px solid var(--border)",
    borderRadius: "var(--radius)", padding: "8px 14px",
  },
  searchInput: {
    flex: 1, border: "none", background: "transparent",
    color: "var(--text-primary)", fontSize: 14, outline: "none",
  },
  nav: { display: "flex", gap: 4, flexShrink: 0 },
  navBtn: {
    display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
    border: "1px solid transparent", borderRadius: "var(--radius-sm)",
    background: "transparent", color: "var(--text-secondary)",
    cursor: "pointer", fontSize: 13, fontWeight: 500, transition: "all 0.15s",
  },
  navActive: {
    background: "var(--accent-muted)", color: "var(--accent)",
    borderColor: "rgba(99,102,241,0.3)",
  },
};
