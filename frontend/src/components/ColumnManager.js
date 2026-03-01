import React from "react";
import DeckColumn from "./DeckColumn";
import AddColumnPanel from "./AddColumnPanel";

export default function ColumnManager({
  columns, onRemove, onUpdate, onSelectChannel,
  addingColumn, onAddColumn, onCancelAdd
}) {
  return (
    <div style={styles.container}>
      <div style={styles.columnsRow}>
        {columns.map(col => (
          <DeckColumn
            key={col.id}
            column={col}
            onRemove={() => onRemove(col.id)}
            onUpdate={(updates) => onUpdate(col.id, updates)}
            onSelectChannel={onSelectChannel}
          />
        ))}

        {addingColumn && (
          <AddColumnPanel onAdd={onAddColumn} onCancel={onCancelAdd} />
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    flex: 1,
    overflow: "hidden",
  },
  columnsRow: {
    display: "flex",
    height: "100%",
    overflowX: "auto",
    overflowY: "hidden",
    gap: 0,
  },
};
