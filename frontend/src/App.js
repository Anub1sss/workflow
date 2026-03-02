import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import ColumnManager from "./components/ColumnManager";
import CatalogView from "./components/CatalogView";
import ChannelModal from "./components/ChannelModal";
import StatsView from "./components/StatsView";

const DEFAULT_COLUMNS = [
  { id: "posts-all", title: "Лента постов", type: "posts", filters: { sort: "date", order: "desc" }, pinned: true },
  { id: "all-channels", title: "Все каналы", type: "feed", filters: { sort: "subscribers", order: "desc" }, pinned: true },
  { id: "viral", title: "Вирусные", type: "viral", filters: {}, pinned: false },
];

export default function App() {
  const [view, setView] = useState("deck");
  const [columns, setColumns] = useState(() => {
    try {
      const saved = localStorage.getItem("tg_deck_columns");
      return saved ? JSON.parse(saved) : DEFAULT_COLUMNS;
    } catch { return DEFAULT_COLUMNS; }
  });
  const [selected, setSelected] = useState(null);
  const [addingColumn, setAddingColumn] = useState(false);

  useEffect(() => {
    localStorage.setItem("tg_deck_columns", JSON.stringify(columns));
  }, [columns]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setSelected(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const addColumn = (col) => {
    setColumns(prev => [...prev, { ...col, id: Date.now().toString() }]);
    setAddingColumn(false);
  };

  const removeColumn = (id) => {
    setColumns(prev => prev.filter(c => c.id !== id));
  };

  const updateColumn = (id, updates) => {
    setColumns(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  return (
    <div style={styles.root}>
      <Sidebar
        view={view}
        setView={setView}
        onAddColumn={() => setAddingColumn(true)}
        columnCount={columns.length}
      />

      <div style={styles.content}>
        {view === "deck" && (
          <ColumnManager
            columns={columns}
            onRemove={removeColumn}
            onUpdate={updateColumn}
            onSelectChannel={setSelected}
            addingColumn={addingColumn}
            onAddColumn={addColumn}
            onCancelAdd={() => setAddingColumn(false)}
          />
        )}

        {view === "catalog" && (
          <CatalogView onSelectChannel={setSelected} />
        )}

        {view === "analytics" && (
          <div style={styles.analyticsWrap}>
            <StatsView />
          </div>
        )}
      </div>

      <ChannelModal channel={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

const styles = {
  root: {
    display: "flex",
    height: "100vh",
    overflow: "hidden",
  },
  content: {
    flex: 1,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  analyticsWrap: {
    flex: 1,
    overflow: "auto",
    padding: 20,
  },
};
