import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import ColumnManager from "./components/ColumnManager";
import CatalogView from "./components/CatalogView";
import ChannelModal from "./components/ChannelModal";

const DEFAULT_COLUMNS = [
  { id: "all", title: "Все каналы", type: "feed", filters: {}, pinned: true },
  { id: "posts-all", title: "Лента постов", type: "posts", filters: {}, pinned: true },
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
};
