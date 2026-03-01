import React from "react";
import { Columns3, Table2, Plus, Sparkles } from "lucide-react";

export default function Sidebar({ view, setView, onAddColumn, columnCount }) {
  return (
    <div style={styles.sidebar}>
      <div style={styles.logo}>
        <Sparkles size={22} color="var(--tg-accent)" />
      </div>

      <div style={styles.nav}>
        <SidebarBtn
          icon={<Columns3 size={22} />}
          label="Deck"
          active={view === "deck"}
          onClick={() => setView("deck")}
        />
        <SidebarBtn
          icon={<Table2 size={22} />}
          label="Каталог"
          active={view === "catalog"}
          onClick={() => setView("catalog")}
        />
      </div>

      <div style={styles.spacer} />

      {view === "deck" && (
        <button style={styles.addBtn} onClick={onAddColumn} title="Добавить колонку">
          <Plus size={20} />
        </button>
      )}

      <div style={styles.colCount}>{columnCount}</div>
    </div>
  );
}

function SidebarBtn({ icon, label, active, onClick }) {
  return (
    <button
      style={{ ...styles.navBtn, ...(active ? styles.navActive : {}) }}
      onClick={onClick}
      title={label}
    >
      {icon}
      <span style={styles.navLabel}>{label}</span>
    </button>
  );
}

const styles = {
  sidebar: {
    width: 68,
    background: "var(--tg-bg-secondary)",
    borderRight: "1px solid var(--tg-border)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "12px 0",
    gap: 4,
    flexShrink: 0,
  },
  logo: {
    width: 44,
    height: 44,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  nav: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    width: "100%",
    padding: "0 6px",
  },
  navBtn: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 3,
    padding: "10px 4px",
    border: "none",
    borderRadius: 10,
    background: "transparent",
    color: "var(--tg-text-muted)",
    cursor: "pointer",
    transition: "all 0.15s",
    width: "100%",
  },
  navActive: {
    background: "var(--tg-accent-muted)",
    color: "var(--tg-accent)",
  },
  navLabel: {
    fontSize: 9,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  spacer: { flex: 1 },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    background: "var(--tg-accent)",
    border: "none",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    marginBottom: 8,
    transition: "transform 0.15s",
  },
  colCount: {
    fontSize: 10,
    color: "var(--tg-text-muted)",
    fontWeight: 600,
  },
};
