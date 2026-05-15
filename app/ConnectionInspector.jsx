// ui_kits/designer/ConnectionInspector.jsx
// Right-pane inspector when a single connection is selected.

function ConnectionGeneralTab({ conn, fromLayer, toLayer, onUpdate }) {
  const typeOptions = [
    { value: "forward",   label: "Forward — feed-forward edge" },
    { value: "recurrent", label: "Recurrent — feeds back through time" },
    { value: "skip",      label: "Skip — bypasses one or more layers" },
  ];
  return (
    <>
      <div className="conn-summary">
        <div className="conn-summary__row">
          <span className="conn-summary__chip">{fromLayer ? fromLayer.name : "?"}</span>
          <span className="conn-summary__arrow">→</span>
          <span className="conn-summary__chip">{toLayer ? toLayer.name : "?"}</span>
        </div>
        <div className="conn-summary__meta">
          {fromLayer ? fromLayer.units : "?"} → {toLayer ? toLayer.units : "?"} units
        </div>
      </div>
      <Select label="Connection Type" value={conn.type} options={typeOptions}
        onChange={(v) => onUpdate({ type: v })} />
      <Slider label="Dropout" value={conn.dropout || 0} min={0} max={0.9} step={0.05}
        onChange={(v) => onUpdate({ dropout: v })} decimals={2} />
      <div className="divider"></div>
      <Textarea label="Annotation / Notes" placeholder="What does this edge do?"
        value={conn.annotation} onChange={(v) => onUpdate({ annotation: v })} />
    </>
  );
}

function ConnectionTopologyTab({ conn, fromLayer, toLayer, onUpdate }) {
  const fromU = fromLayer ? fromLayer.units : 0;
  const toU = toLayer ? toLayer.units : 0;
  const totalEdges = fromU * toU;
  const keptEdges = conn.connectivity === "sparse"
    ? Math.round(totalEdges * (conn.sparsity ?? 0.5))
    : totalEdges;
  return (
    <>
      <Select label="Connectivity" value={conn.connectivity || "full"} options={window.CONNECTIVITIES}
        onChange={(v) => onUpdate({ connectivity: v })} />
      {(conn.connectivity || "full") === "sparse" && (
        <Slider label="Sparsity (fraction kept)" value={conn.sparsity ?? 0.5}
          min={0.05} max={1} step={0.05} decimals={2}
          onChange={(v) => onUpdate({ sparsity: v })} />
      )}
      <div className="summary-card">
        <div className="summary-card__title">Edge Count:</div>
        <div className="summary-card__row">• Source units: {fromU}</div>
        <div className="summary-card__row">• Target units: {toU}</div>
        <div className="summary-card__row">• Fully connected: {totalEdges.toLocaleString()}</div>
        {(conn.connectivity || "full") === "sparse" && (
          <div className="summary-card__row">• Kept: {keptEdges.toLocaleString()} ({Math.round((conn.sparsity ?? 0.5) * 100)}%)</div>
        )}
      </div>
    </>
  );
}

function ConnectionTransformTab({ conn, fromLayer, toLayer, onUpdate }) {
  const t = conn.transform || "none";
  const needsDim = t === "linear" || t === "affine";
  const needsKernel = t === "conv1d" || t === "maxpool" || t === "avgpool";
  return (
    <>
      <Select label="Transformation" value={t} options={window.TRANSFORMS}
        onChange={(v) => onUpdate({ transform: v })} />
      {needsDim && (
        <TextInput type="number" label="Output Dimension" value={conn.transformDim || 0}
          onChange={(v) => onUpdate({ transformDim: v })}
          helper={conn.transformDim ? `Maps ${(fromLayer || {}).units || "?"} → ${conn.transformDim}` : `0 = match target units (${(toLayer || {}).units || "?"})`} />
      )}
      {needsKernel && (
        <TextInput type="number" label="Kernel Size" value={conn.transformDim || 3}
          onChange={(v) => onUpdate({ transformDim: v })}
          helper="Window size of the pooling / convolution kernel" />
      )}
      {(t === "linear" || t === "affine") && (
        <Select label="Weight Init" value={conn.weightInit || "xavier"} options={window.WEIGHT_INITS}
          onChange={(v) => onUpdate({ weightInit: v })} />
      )}
      <div className="summary-card">
        <div className="summary-card__title">Transform Summary:</div>
        <div className="summary-card__row">• {(window.TRANSFORMS.find(x => x.value === t) || {}).label}</div>
        {needsDim && <div className="summary-card__row">• Dim: {conn.transformDim || (toLayer || {}).units || "—"}</div>}
        {needsKernel && <div className="summary-card__row">• Kernel: {conn.transformDim || 3}</div>}
        {(t === "linear" || t === "affine") && <div className="summary-card__row">• Init: {((window.WEIGHT_INITS.find(x => x.value === (conn.weightInit || "xavier"))) || {}).label}</div>}
      </div>
    </>
  );
}

function ConnectionInspector({ connection, layers, onUpdate, onDelete }) {
  const [tab, setTab] = React.useState(0);
  React.useEffect(() => { setTab(0); }, [connection && connection.id]);

  if (!connection) return null;
  const fromLayer = layers.find((l) => l.id === connection.fromLayerId);
  const toLayer = layers.find((l) => l.id === connection.toLayerId);

  const heading = fromLayer && toLayer
    ? `${fromLayer.name} → ${toLayer.name}`
    : "Connection";

  return (
    <>
      <div className="inspector__header">
        <h2>{heading}</h2>
        <span className="overline">{(connection.type || "forward").toUpperCase()} CONNECTION</span>
        <div className="tabs">
          <button className={"tabs__tab" + (tab === 0 ? " active" : "")} onClick={() => setTab(0)}>General</button>
          <button className={"tabs__tab" + (tab === 1 ? " active" : "")} onClick={() => setTab(1)}>Topology</button>
          <button className={"tabs__tab" + (tab === 2 ? " active" : "")} onClick={() => setTab(2)}>Transform</button>
        </div>
      </div>
      <div className="inspector__body">
        {tab === 0 && <ConnectionGeneralTab conn={connection} fromLayer={fromLayer} toLayer={toLayer} onUpdate={onUpdate} />}
        {tab === 1 && <ConnectionTopologyTab conn={connection} fromLayer={fromLayer} toLayer={toLayer} onUpdate={onUpdate} />}
        {tab === 2 && <ConnectionTransformTab conn={connection} fromLayer={fromLayer} toLayer={toLayer} onUpdate={onUpdate} />}
      </div>
      <div className="inspector__footer">
        <button className="btn btn--danger btn--full" onClick={onDelete}>Delete Connection</button>
      </div>
    </>
  );
}

window.ConnectionInspector = ConnectionInspector;
