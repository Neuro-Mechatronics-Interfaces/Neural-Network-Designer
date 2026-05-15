// ui_kits/designer/ConnectionsList.jsx
function ConnectionsList({ connections, layers, selectedConnectionId, onSelectConnection, onDeleteConnection }) {
  const name = (id) => (layers.find((l) => l.id === id) || {}).name || "Unknown";

  if (connections.length === 0) {
    return (
      <div className="inspector__empty">
        No connections yet. Click the link icon to connect layers.
      </div>
    );
  }

  return (
    <div className="inspector__body" style={{ gap: 0 }}>
      <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 500 }}>Connections</h2>
      <div className="caption" style={{ marginBottom: 8 }}>Click an edge to edit its properties</div>
      <div className="conn-list">
        {connections.map((c) => {
          const isSel = c.id === selectedConnectionId;
          const meta = [];
          if ((c.connectivity || "full") !== "full") {
            meta.push(c.connectivity === "sparse"
              ? `sparse · ${Math.round((c.sparsity ?? 0.5) * 100)}%`
              : c.connectivity);
          }
          if (c.transform && c.transform !== "none") {
            meta.push(c.transform);
          }
          if ((c.dropout || 0) > 0) {
            meta.push(`dropout ${Number(c.dropout).toFixed(2)}`);
          }
          return (
            <button
              key={c.id}
              className={"conn-list-item" + (isSel ? " selected" : "")}
              onClick={() => onSelectConnection(c.id)}
            >
              <div className="conn-list-item__row">
                <span className={"conn-list-item__type type-" + (c.type || "forward")}>{c.type || "forward"}</span>
                <span className="conn-list-item__name">{name(c.fromLayerId)} → {name(c.toLayerId)}</span>
                <button
                  className="conn-item__icon-btn"
                  onClick={(e) => { e.stopPropagation(); onDeleteConnection(c.id); }}
                  title="Delete connection"
                >
                  <img src="design-system/assets/icons/lucide/trash-2.svg" alt="" width="14" height="14" />
                </button>
              </div>
              {meta.length > 0 && (
                <div className="conn-list-item__meta">{meta.join(" · ")}</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

window.ConnectionsList = ConnectionsList;
