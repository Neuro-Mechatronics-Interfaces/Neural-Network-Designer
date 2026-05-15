// app/App.jsx — top-level designer with figure metadata, groups, annotations,
// and the upgraded Export Studio.

const STORAGE_KEY = "nnd:network-v2";

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.layers || !parsed.connections) return null;
    return parsed;
  } catch (e) { return null; }
}

function saveToStorage(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
}

function App() {
  const stored = loadFromStorage();
  const rawSeed = stored || {
    layers: window.SEED_NETWORK.layers,
    connections: window.SEED_NETWORK.connections,
    figure: { ...window.DEFAULT_FIGURE, title: "LSTM classifier (seed)", caption: "Figure 1. Worked example showing an input window flowing through a recurrent LSTM, a dense projection, and a softmax classifier." },
    groups: [],
    annotations: [],
  };
  const seed = {
    layers: rawSeed.layers,
    connections: rawSeed.connections.map((c) => ({
      ...window.defaultConnection(c.fromLayerId, c.toLayerId, c.type),
      ...c,
    })),
    figure: { ...window.DEFAULT_FIGURE, ...(rawSeed.figure || {}) },
    groups: rawSeed.groups || [],
    annotations: rawSeed.annotations || [],
  };

  const [layers, setLayers]                       = React.useState(seed.layers);
  const [connections, setConnections]             = React.useState(seed.connections);
  const [figure, setFigure]                       = React.useState(seed.figure);
  const [groups, setGroups]                       = React.useState(seed.groups);
  const [annotations, setAnnotations]             = React.useState(seed.annotations);
  const [selectedLayerId, setSelectedLayerId]     = React.useState(seed.layers[0] ? seed.layers[Math.min(1, seed.layers.length - 1)].id : null);
  const [selectedConnectionId, setSelectedConnectionId] = React.useState(null);
  const [selectedAnnotationId, setSelectedAnnotationId] = React.useState(null);
  const [rightTab, setRightTab]                   = React.useState(0);
  const [exportOpen, setExportOpen]               = React.useState(false);
  const [draggingType, setDraggingType]           = React.useState(null);
  const [toast, setToast]                         = React.useState(null);
  const [currentPreset, setCurrentPreset]         = React.useState(null);
  const [connectMode, setConnectMode]             = React.useState(false);
  const [connectFromLayer, setConnectFromLayer]   = React.useState(null);

  // Mutually-exclusive selection helpers
  const selectLayer = (id) => {
    setSelectedLayerId(id);
    if (id !== null) { setSelectedConnectionId(null); setSelectedAnnotationId(null); setRightTab(0); }
  };
  const selectConnection = (id) => {
    setSelectedConnectionId(id);
    if (id !== null) { setSelectedLayerId(null); setSelectedAnnotationId(null); setRightTab(0); }
  };
  const selectAnnotation = (id) => {
    setSelectedAnnotationId(id);
    if (id !== null) { setSelectedLayerId(null); setSelectedConnectionId(null); setRightTab(2); }
  };

  // Persist on every change
  React.useEffect(() => {
    saveToStorage({ layers, connections, figure, groups, annotations });
  }, [layers, connections, figure, groups, annotations]);

  const showToast = (msg) => {
    setToast(msg);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), 2200);
  };

  // -------- layer ops --------
  const addLayer = (template, position) => {
    const id = window.uid();
    const def = template.defaultConfig || {};
    const sameTypeCount = layers.filter((l) => l.type === template.type).length;
    const layer = {
      id, name: template.label + (sameTypeCount === 0 ? "" : " " + (sameTypeCount + 1)),
      type: template.type,
      units: def.units || 64,
      activation: def.activation || "ReLU",
      neuronType: def.neuronType || "linear",
      dropout: def.dropout || 0,
      position, ...def,
    };
    setLayers([...layers, layer]);
    setSelectedLayerId(id); setSelectedConnectionId(null);
    setCurrentPreset(null);
  };
  const updateLayer = (id, updates) =>
    setLayers((ls) => ls.map((l) => l.id === id ? { ...l, ...updates } : l));
  const moveLayer = (id, position) =>
    setLayers((ls) => ls.map((l) => l.id === id ? { ...l, position } : l));
  const deleteLayer = (id) => {
    setLayers(layers.filter((l) => l.id !== id));
    setConnections(connections.filter((c) => c.fromLayerId !== id && c.toLayerId !== id));
    setGroups(groups.map((g) => ({ ...g, layerIds: g.layerIds.filter((x) => x !== id) })));
    if (selectedLayerId === id) setSelectedLayerId(null);
    showToast("Layer deleted");
  };

  // -------- connection ops --------
  const addConnection = (fromId, toId) => {
    if (connections.find((c) => c.fromLayerId === fromId && c.toLayerId === toId)) {
      showToast("Connection already exists"); return;
    }
    const c = window.defaultConnection(fromId, toId);
    setConnections([...connections, c]);
    selectConnection(c.id);
    showToast("Connection added");
  };
  const deleteConnection = (id) => {
    setConnections(connections.filter((c) => c.id !== id));
    if (selectedConnectionId === id) setSelectedConnectionId(null);
  };
  const updateConnection = (id, updates) =>
    setConnections(connections.map((c) => c.id === id ? { ...c, ...updates } : c));

  // -------- figure / groups / annotations ops --------
  const updateFigure = (u) => setFigure((f) => ({ ...f, ...u }));

  const addGroup = () => {
    const g = window.makeGroup("New group", selectedLayerId ? [selectedLayerId] : [], paletteByIndex(groups.length));
    setGroups([...groups, g]);
  };
  const updateGroup = (id, u) => setGroups(groups.map((g) => g.id === id ? { ...g, ...u } : g));
  const deleteGroup = (id) => setGroups(groups.filter((g) => g.id !== id));

  // Move every layer that belongs to a group by the same delta (members:
  // [{ id, position: {x, y} }, ...]).  Layers not in the update keep their
  // current position untouched.
  const moveGroupMembers = (members) => {
    const map = new Map(members.map((m) => [m.id, m.position]));
    setLayers((ls) => ls.map((l) => map.has(l.id) ? { ...l, position: map.get(l.id) } : l));
  };
  const moveGroupLabel = (id, labelOffset) => updateGroup(id, { labelOffset });
  const autoGroup = () => {
    const g = window.autoGroup(layers);
    setGroups(g);
    showToast(g.length ? `Detected ${g.length} group${g.length === 1 ? "" : "s"}` : "No obvious groups found");
  };

  const wrapRows = (nRows) => {
    if (!layers.length) return;
    const updates = window.wrapLayersIntoRows(layers, nRows);
    const map = new Map(updates.map((u) => [u.id, u.position]));
    setLayers((ls) => ls.map((l) => map.has(l.id) ? { ...l, position: map.get(l.id) } : l));
    showToast(`Snapped to ${nRows} row${nRows === 1 ? "" : "s"}`);
  };

  const addAnnotation = (kind) => {
    // Drop near top-center of the current canvas viewport
    const a = window.makeAnnotation(kind, defaultAnnotationPos(kind, layers));
    setAnnotations([...annotations, a]);
    selectAnnotation(a.id);
  };
  const updateAnnotation = (id, u) => setAnnotations(annotations.map((a) => a.id === id ? { ...a, ...u } : a));
  const deleteAnnotation = (id) => {
    setAnnotations(annotations.filter((a) => a.id !== id));
    if (selectedAnnotationId === id) setSelectedAnnotationId(null);
  };

  // -------- presets --------
  const loadPreset = (id) => {
    const p = window.PRESETS.find((x) => x.id === id);
    if (!p) return;
    const conns = p.connections.map((c) => ({
      ...window.defaultConnection(c.fromLayerId, c.toLayerId, c.type),
      ...c,
    }));
    setLayers(JSON.parse(JSON.stringify(p.layers)));
    setConnections(JSON.parse(JSON.stringify(conns)));
    setGroups(p.groups ? JSON.parse(JSON.stringify(p.groups)) : []);
    setAnnotations(p.annotations ? JSON.parse(JSON.stringify(p.annotations)) : []);
    setFigure({
      ...window.DEFAULT_FIGURE,
      title: p.label,
      caption: p.figureCaption || "",
      ...(p.figure || {}),
    });
    setSelectedLayerId(p.layers[0] ? p.layers[0].id : null);
    setSelectedConnectionId(null); setSelectedAnnotationId(null);
    setCurrentPreset(id);
    showToast(`Loaded preset: ${p.label}`);
  };
  const clearCanvas = () => {
    setLayers([]); setConnections([]); setGroups([]); setAnnotations([]);
    setSelectedLayerId(null); setSelectedConnectionId(null); setSelectedAnnotationId(null);
    setCurrentPreset(null);
    showToast("Canvas cleared");
  };

  const selectedLayer = layers.find((l) => l.id === selectedLayerId) || null;
  const selectedConnection = connections.find((c) => c.id === selectedConnectionId) || null;

  const studioState = { layers, connections, figure, groups, annotations };

  return (
    <div className="app">
      <AppBar
        canExport={layers.length > 0}
        onExport={() => setExportOpen(true)}
        currentPreset={currentPreset}
        onLoadPreset={loadPreset}
        onClear={clearCanvas}
        layerCount={layers.length}
      />
      <div className="workspace">
        <LayerTemplatesSidebar
          onDragStart={(t) => setDraggingType(t.type)}
          onDragEnd={() => setDraggingType(null)}
          draggingType={draggingType}
        />
        <NetworkCanvas
          layers={layers}
          connections={connections}
          groups={groups}
          annotations={annotations}
          figure={figure}
          selectedLayerId={selectedLayerId}
          selectedConnectionId={selectedConnectionId}
          selectedAnnotationId={selectedAnnotationId}
          onSelectLayer={selectLayer}
          onSelectConnection={selectConnection}
          onSelectAnnotation={selectAnnotation}
          onAddLayer={addLayer}
          onAddConnection={addConnection}
          onMoveLayer={moveLayer}
          onMoveAnnotation={(id, u) => updateAnnotation(id, u)}
          onMoveGroup={moveGroupMembers}
          onMoveLabel={moveGroupLabel}
          connectMode={connectMode}
          setConnectMode={setConnectMode}
          connectFromLayer={connectFromLayer}
          setConnectFromLayer={setConnectFromLayer}
          onOpenExport={() => setExportOpen(true)}
        />
        <aside className="inspector">
          <div className="tabs">
            <button className={"tabs__tab" + (rightTab === 0 ? " active" : "")} onClick={() => setRightTab(0)}>
              {selectedConnection ? "Connection" : "Layer"}
            </button>
            <button className={"tabs__tab" + (rightTab === 1 ? " active" : "")} onClick={() => setRightTab(1)}>
              Connections{connections.length > 0 ? <span className="tab-badge">{connections.length}</span> : null}
            </button>
            <button className={"tabs__tab" + (rightTab === 2 ? " active" : "")} onClick={() => setRightTab(2)}>
              Figure{(groups.length + annotations.length) > 0 ? <span className="tab-badge">{groups.length + annotations.length}</span> : null}
            </button>
          </div>
          {rightTab === 0 && (
            selectedConnection ? (
              <ConnectionInspector connection={selectedConnection} layers={layers}
                onUpdate={(u) => updateConnection(selectedConnection.id, u)}
                onDelete={() => deleteConnection(selectedConnection.id)} />
            ) : (
              <LayerInspector layer={selectedLayer}
                onUpdate={(u) => selectedLayer && updateLayer(selectedLayer.id, u)}
                onDelete={() => selectedLayer && deleteLayer(selectedLayer.id)} />
            )
          )}
          {rightTab === 1 && (
            <ConnectionsList
              connections={connections} layers={layers}
              selectedConnectionId={selectedConnectionId}
              onSelectConnection={selectConnection}
              onUpdateConnection={updateConnection}
              onDeleteConnection={deleteConnection}
            />
          )}
          {rightTab === 2 && (
            <FigurePanel
              figure={figure} onUpdateFigure={updateFigure}
              groups={groups}
              onAddGroup={addGroup} onUpdateGroup={updateGroup} onDeleteGroup={deleteGroup}
              annotations={annotations}
              onAddAnnotation={addAnnotation} onUpdateAnnotation={updateAnnotation} onDeleteAnnotation={deleteAnnotation}
              layers={layers}
              onAutoGroup={autoGroup}
              onWrapRows={wrapRows}
            />
          )}
        </aside>
      </div>
      <ExportStudio
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        state={studioState}
        onUpdateFigure={updateFigure}
        onToast={showToast}
      />
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function paletteByIndex(i) {
  const ps = window.GROUP_PALETTE;
  return ps[i % ps.length].id;
}

function defaultAnnotationPos(kind, layers) {
  // Drop the new annotation near the centroid of existing layers,
  // offset upward so it doesn't overlap the boxes.
  if (!layers.length) return {};
  let sx = 0, sy = 0;
  layers.forEach((l) => { sx += l.position.x; sy += l.position.y; });
  const cx = sx / layers.length + 40;
  const cy = sy / layers.length - 40;
  if (kind === "text")    return { x: cx, y: cy };
  if (kind === "arrow")   return { x1: cx - 60, y1: cy, x2: cx + 60, y2: cy };
  if (kind === "bracket") return { x1: cx - 100, y1: cy + 220, x2: cx + 100, y2: cy + 220 };
  return {};
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
