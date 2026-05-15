// ui_kits/designer/ExportDialog.jsx
function ExportDialog({ open, onClose, onExport, layerCount, connectionCount }) {
  const [format, setFormat] = React.useState("svg");
  const [scale, setScale] = React.useState(2);
  if (!open) return null;

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog__title">Export Network Architecture</div>
        <div className="dialog__content">
          <Select label="Format" value={format}
            onChange={setFormat}
            options={[
              { value: "svg", label: "SVG (Vector, Publication Quality)" },
              { value: "png", label: "PNG (Raster)" },
            ]} />
          {format === "png" && (
            <TextInput type="number" label="Scale Factor" value={scale} onChange={setScale} />
          )}
          <div className="dialog__note">
            The export will include all layers with their configurations, connections, and labels.
            SVG format is recommended for publication-quality diagrams.
            <br/><br/>
            <strong>{layerCount}</strong> layer{layerCount === 1 ? "" : "s"} · <strong>{connectionCount}</strong> connection{connectionCount === 1 ? "" : "s"}.
          </div>
        </div>
        <div className="dialog__actions">
          <button className="btn btn--text" onClick={onClose}>Cancel</button>
          <button className="btn btn--contained" onClick={() => onExport(format, scale)}>
            <img src="design-system/assets/icons/lucide/download.svg" alt="" />
            Export
          </button>
        </div>
      </div>
    </div>
  );
}

window.ExportDialog = ExportDialog;
