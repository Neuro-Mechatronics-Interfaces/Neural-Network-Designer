// ui_kits/designer/AppBar.jsx
function AppBar({ canExport, onExport, currentPreset, onLoadPreset, onClear, layerCount }) {
  const [presetOpen, setPresetOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setPresetOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <header className="appbar">
      <div className="appbar__title">
        <img src="design-system/assets/logo-mark.svg" alt="" />
        <span>Neural Network Architecture Designer</span>
      </div>
      <div className="appbar__meta">
        {layerCount > 0 && (
          <span className="appbar__count">
            {layerCount} layer{layerCount === 1 ? "" : "s"}
          </span>
        )}
      </div>
      <div ref={ref} className="appbar__menu">
        <button
          className="appbar__action"
          onClick={() => setPresetOpen(!presetOpen)}
          title="Load a preset architecture"
        >
          Presets
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 2 }}>
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </button>
        {presetOpen && (
          <div className="dropdown" role="menu">
            {window.PRESETS.map((p) => (
              <button key={p.id} className={"dropdown__item" + (currentPreset === p.id ? " active" : "")}
                onClick={() => { onLoadPreset(p.id); setPresetOpen(false); }}>
                <div className="dropdown__item-label">{p.label}</div>
                <div className="dropdown__item-desc">{p.description}</div>
              </button>
            ))}
            <div className="dropdown__divider"></div>
            <button className="dropdown__item dropdown__item--danger" onClick={() => { onClear(); setPresetOpen(false); }}>
              <div className="dropdown__item-label">Clear canvas</div>
              <div className="dropdown__item-desc">Remove all layers and connections</div>
            </button>
          </div>
        )}
      </div>
      <button
        className="appbar__action appbar__action--primary"
        onClick={onExport}
        disabled={!canExport}
        title={canExport ? "Export schematic" : "Add a layer to enable export"}
      >
        <img src="design-system/assets/icons/lucide/download.svg" alt="" />
        Export
      </button>
    </header>
  );
}

window.AppBar = AppBar;
