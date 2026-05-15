// app/NetworkCanvas.jsx — live SVG canvas with layers, connections, groups,
// and free annotations (text / arrow / bracket).

const { LAYER_WIDTH, LAYER_PADDING, NEURON_SPACING, MAX_VISIBLE_NEURONS } = window.SCHEMATIC;

function Neuron({ x, y, layer, isSelected }) {
  const vis = window.NEURON_VIS[layer.neuronType] || window.NEURON_VIS.linear;
  const r = window.SCHEMATIC.NEURON_RADIUS;
  return (
    <g>
      <circle
        cx={x} cy={y} r={r}
        fill={vis.color}
        stroke={isSelected ? "#1d4ed8" : "#111827"}
        strokeWidth={isSelected ? 2.5 : 1.5}
      />
      {vis.symbol && (
        <text
          x={x} y={y + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily={vis.glyphFont === "math" ? "STIX Two Math, serif" : "Untitled Sans, Inter, sans-serif"}
          fontStyle={vis.glyphFont === "math" ? "italic" : "normal"}
          fontWeight={vis.glyphFont === "math" ? 400 : 700}
          fontSize={16}
          fill="#fff"
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          {vis.symbol}
        </text>
      )}
    </g>
  );
}

function LayerNode({ layer, isSelected, isConnectFrom, onMouseDown, connectMode, figure }) {
  const h = window.getLayerHeight(layer);
  const cx = layer.position.x + LAYER_WIDTH / 2;
  const visible = window.getVisibleNeuronCount(layer);
  const captionLines = layerCaptionLines(layer, figure);

  return (
    <g
      style={{ cursor: connectMode ? "crosshair" : "grab" }}
      onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e, layer.id); }}
    >
      <rect
        x={layer.position.x - 5}
        y={layer.position.y - 5}
        width={LAYER_WIDTH + 10}
        height={h + 10}
        fill={isConnectFrom ? "rgba(59,130,246,0.04)" : "#ffffff"}
        stroke={isSelected ? "#3b82f6" : (isConnectFrom ? "#3b82f6" : "#111827")}
        strokeWidth={isSelected || isConnectFrom ? 2.5 : 1.25}
        strokeDasharray={isConnectFrom ? "5 5" : undefined}
        rx={0}
      />
      <text
        x={cx} y={layer.position.y - 12}
        textAnchor="middle"
        fontFamily="Untitled Sans, Inter, sans-serif" fontWeight={500} fontSize={12.5}
        fill="#111827"
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        {layer.name}
      </text>
      {Array.from({ length: visible }).map((_, i) => {
        if (i === MAX_VISIBLE_NEURONS && layer.units > MAX_VISIBLE_NEURONS + 1) {
          const y = layer.position.y + LAYER_PADDING + i * NEURON_SPACING;
          return (
            <text key={i} x={cx} y={y + 6} textAnchor="middle"
              fontSize={22} fill="#6b7280" fontFamily="serif"
              style={{ pointerEvents: "none", userSelect: "none" }}
            >⋮</text>
          );
        }
        const y = layer.position.y + LAYER_PADDING + i * NEURON_SPACING;
        return <Neuron key={i} x={cx} y={y} layer={layer} isSelected={isSelected} />;
      })}
      {figure.showLayerCaptions && captionLines.map((ln, i) => (
        <text key={i}
          x={cx}
          y={layer.position.y + h + 16 + i * 14}
          textAnchor="middle"
          fontFamily={ln.mono
            ? "ui-monospace, SF Mono, Menlo, monospace"
            : (ln.italic ? "STIX Two Math, serif" : "Untitled Sans, Inter, sans-serif")}
          fontStyle={ln.italic ? "italic" : "normal"}
          fontSize={ln.mono ? 10.5 : 11}
          fill={ln.muted ? "#6b7280" : "#111827"}
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          {ln.text}
        </text>
      ))}
    </g>
  );
}

function layerCaptionLines(layer, figure) {
  const lines = [];
  if (layer.type !== "concat") {
    lines.push({ text: layer.units + " units", muted: false });
  } else {
    lines.push({ text: layer.units + "-dim", muted: false, mono: true });
  }
  if (layer.activation && layer.activation !== "Linear" && layer.type !== "concat") {
    const drop = (layer.dropout && layer.dropout > 0) ? "  ·  p=" + Number(layer.dropout).toFixed(2) : "";
    lines.push({ text: layer.activation + drop, muted: true });
  } else if (layer.dropout && layer.dropout > 0) {
    lines.push({ text: "p=" + Number(layer.dropout).toFixed(2), muted: true });
  }
  if (figure.showShapes) {
    const shape = window.layerShapeSummary(layer);
    if (shape) lines.push({ text: shape, muted: true, mono: true });
  }
  if (layer.annotation && String(layer.annotation).trim().length > 0) {
    lines.push({ text: layer.annotation, muted: true, italic: true });
  }
  return lines;
}

// --------------------------------------------------------------------------
// Group outlines on the live canvas
// --------------------------------------------------------------------------
function GroupOutline({ group, layers, connections, figure, onMoveGroup, onMoveLabel, zoom }) {
  const ls = group.layerIds.map((id) => layers.find((l) => l.id === id)).filter(Boolean);
  if (!ls.length) return null;
  const pal = (window.GROUP_PALETTE.find((p) => p.id === group.paletteId)) || window.GROUP_PALETTE[2];
  const PAD = 22;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  let hasRecurrent = false;
  for (const l of ls) {
    const h = window.getLayerHeight(l);
    const footH = window.getLayerFooterHeight(l, figure);
    minX = Math.min(minX, l.position.x);
    maxX = Math.max(maxX, l.position.x + LAYER_WIDTH);
    minY = Math.min(minY, l.position.y - 18);                  // layer name above box
    maxY = Math.max(maxY, l.position.y + h + footH);           // include caption block
    if (window.layerHasRecurrentLoop(l, connections)) hasRecurrent = true;
  }
  // Auto-bump the top by the arc height so a recurrent self-loop on any
  // member clears the group label.
  const topBump = hasRecurrent ? window.RECURRENT_ARC_HEIGHT : 0;
  const x = minX - PAD, y = minY - PAD + 4 - topBump;
  const w = maxX - minX + PAD * 2, h = maxY - minY + PAD * 2 - 4 + topBump;
  const labelW = Math.max(48, (group.label || "Group").length * 6.8 + 12);
  const labelOff = group.labelOffset || { dx: 0, dy: 0 };
  const labelX = x + 12 + labelOff.dx;
  const labelY = y - 16 + labelOff.dy;

  const startGroupDrag = (e) => {
    if (e.button !== 0) return;
    e.stopPropagation(); e.preventDefault();
    const startX = e.clientX, startY = e.clientY;
    const initial = ls.map((l) => ({ id: l.id, x: l.position.x, y: l.position.y }));
    const onMoveDoc = (ev) => {
      const z = zoom || 1;
      const dx = (ev.clientX - startX) / z, dy = (ev.clientY - startY) / z;
      onMoveGroup(initial.map(({ id, x, y }) => ({ id, position: { x: x + dx, y: y + dy } })));
    };
    const onUpDoc = () => {
      window.removeEventListener("mousemove", onMoveDoc);
      window.removeEventListener("mouseup", onUpDoc);
    };
    window.addEventListener("mousemove", onMoveDoc);
    window.addEventListener("mouseup", onUpDoc);
  };

  const startLabelDrag = (e) => {
    if (e.button !== 0) return;
    e.stopPropagation(); e.preventDefault();
    const startX = e.clientX, startY = e.clientY;
    const initial = { dx: labelOff.dx, dy: labelOff.dy };
    const onMoveDoc = (ev) => {
      const z = zoom || 1;
      onMoveLabel(group.id, { dx: initial.dx + (ev.clientX - startX) / z, dy: initial.dy + (ev.clientY - startY) / z });
    };
    const onUpDoc = () => {
      window.removeEventListener("mousemove", onMoveDoc);
      window.removeEventListener("mouseup", onUpDoc);
    };
    window.addEventListener("mousemove", onMoveDoc);
    window.addEventListener("mouseup", onUpDoc);
  };

  return (
    <g>
      {/* Dashed border — grab the stroke to drag the whole group */}
      <rect x={x} y={y} width={w} height={h} rx={10} ry={10}
        fill={pal.fill} stroke={pal.stroke} strokeWidth={1.25} strokeDasharray="6 4"
        pointerEvents="visibleStroke"
        style={{ cursor: "move" }}
        onMouseDown={startGroupDrag} />
      {/* Wider invisible stroke for easier grabbing */}
      <rect x={x} y={y} width={w} height={h} rx={10} ry={10}
        fill="none" stroke="transparent" strokeWidth={10}
        pointerEvents="stroke"
        style={{ cursor: "move" }}
        onMouseDown={startGroupDrag} />
      {/* Label tab — drag independently */}
      <g onMouseDown={startLabelDrag} style={{ cursor: "move" }}>
        <rect x={labelX} y={labelY} width={labelW} height={18}
          fill="#ffffff" stroke={pal.stroke} strokeWidth={1} rx={3} />
        <text x={labelX + labelW / 2} y={labelY + 14}
          textAnchor="middle"
          fontFamily="Untitled Sans, Inter, sans-serif"
          fontSize={11} fontWeight={500} fill={pal.stroke}
          style={{ letterSpacing: "0.04em", textTransform: "uppercase", userSelect: "none" }}>
          {group.label || "Group"}
        </text>
      </g>
    </g>
  );
}

// --------------------------------------------------------------------------
// Annotations: text, arrow, bracket — each is draggable
// --------------------------------------------------------------------------
function AnnotationLayer({ annotations, selectedId, onSelect, onMove, zoom }) {
  return (
    <g>
      {annotations.map((a) => (
        <AnnotationItem key={a.id} a={a}
          isSelected={a.id === selectedId}
          onSelect={onSelect} onMove={onMove} zoom={zoom} />
      ))}
    </g>
  );
}

function AnnotationItem({ a, isSelected, onSelect, onMove, zoom }) {
  const isPrimary = (e) => e.button === 0;
  const startDrag = (handle) => (e) => {
    if (!isPrimary(e)) return;
    e.stopPropagation(); e.preventDefault();
    onSelect(a.id);
    const startX = e.clientX, startY = e.clientY;
    const initial = { ...a };
    const onMoveDoc = (ev) => {
      const z = zoom || 1;
      const dx = (ev.clientX - startX) / z, dy = (ev.clientY - startY) / z;
      if (a.kind === "text") {
        onMove(a.id, { x: initial.x + dx, y: initial.y + dy });
      } else if (handle === "all") {
        onMove(a.id, {
          x1: initial.x1 + dx, y1: initial.y1 + dy,
          x2: initial.x2 + dx, y2: initial.y2 + dy,
        });
      } else if (handle === "1") {
        onMove(a.id, { x1: initial.x1 + dx, y1: initial.y1 + dy });
      } else if (handle === "2") {
        onMove(a.id, { x2: initial.x2 + dx, y2: initial.y2 + dy });
      }
    };
    const onUpDoc = () => {
      window.removeEventListener("mousemove", onMoveDoc);
      window.removeEventListener("mouseup", onUpDoc);
    };
    window.addEventListener("mousemove", onMoveDoc);
    window.addEventListener("mouseup", onUpDoc);
  };

  if (a.kind === "text") {
    return (
      <g onMouseDown={startDrag("all")} style={{ cursor: "move" }}>
        {isSelected && (
          <rect
            x={a.x - 36} y={a.y - 14} width={72} height={20}
            fill="rgba(59,130,246,0.08)" stroke="#3b82f6" strokeDasharray="3 3" rx={3}
          />
        )}
        <text
          x={a.x} y={a.y}
          textAnchor="middle"
          fontFamily={a.italic ? "STIX Two Math, serif" : "Untitled Sans, Inter, sans-serif"}
          fontStyle={a.italic ? "italic" : "normal"}
          fontSize={13} fill="#111827"
          style={{ userSelect: "none" }}
        >
          {a.text || "label"}
        </text>
      </g>
    );
  }
  if (a.kind === "arrow") {
    const angle = Math.atan2(a.y2 - a.y1, a.x2 - a.x1);
    const ah = 8;
    const x1a = a.x2 - ah * Math.cos(angle - Math.PI / 6);
    const y1a = a.y2 - ah * Math.sin(angle - Math.PI / 6);
    const x2a = a.x2 - ah * Math.cos(angle + Math.PI / 6);
    const y2a = a.y2 - ah * Math.sin(angle + Math.PI / 6);
    const stroke = isSelected ? "#3b82f6" : "#374151";
    return (
      <g>
        <line x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2}
          stroke={stroke} strokeWidth={1.25}
          onMouseDown={startDrag("all")} style={{ cursor: "move" }} />
        <polygon points={`${a.x2},${a.y2} ${x1a.toFixed(2)},${y1a.toFixed(2)} ${x2a.toFixed(2)},${y2a.toFixed(2)}`}
          fill={stroke} onMouseDown={startDrag("all")} style={{ cursor: "move" }} />
        {a.label && (
          <text x={(a.x1 + a.x2) / 2} y={(a.y1 + a.y2) / 2 - 6} textAnchor="middle"
            fontFamily="Untitled Sans, Inter, sans-serif" fontSize={12} fill="#111827"
            style={{ pointerEvents: "none", userSelect: "none" }}>
            {a.label}
          </text>
        )}
        {isSelected && (
          <>
            <DragDot cx={a.x1} cy={a.y1} onMouseDown={startDrag("1")} />
            <DragDot cx={a.x2} cy={a.y2} onMouseDown={startDrag("2")} />
          </>
        )}
      </g>
    );
  }
  if (a.kind === "bracket") {
    const dir = a.flip ? -1 : 1;
    const lift = 10 * dir;
    const path = `M ${a.x1} ${a.y1} L ${a.x1} ${a.y1 + lift} L ${a.x2} ${a.y1 + lift} L ${a.x2} ${a.y1}`;
    const stroke = isSelected ? "#3b82f6" : "#374151";
    return (
      <g>
        <path d={path} stroke={stroke} strokeWidth={1.25} fill="none"
          onMouseDown={startDrag("all")} style={{ cursor: "move" }} />
        <text x={(a.x1 + a.x2) / 2} y={a.y1 + lift + (a.flip ? -6 : 16)} textAnchor="middle"
          fontFamily="Untitled Sans, Inter, sans-serif" fontSize={12} fill="#111827"
          style={{ pointerEvents: "none", userSelect: "none" }}>
          {a.label || ""}
        </text>
        {isSelected && (
          <>
            <DragDot cx={a.x1} cy={a.y1} onMouseDown={startDrag("1")} />
            <DragDot cx={a.x2} cy={a.y2} onMouseDown={startDrag("2")} />
          </>
        )}
      </g>
    );
  }
  return null;
}

function DragDot({ cx, cy, onMouseDown }) {
  return (
    <circle cx={cx} cy={cy} r={5}
      fill="#ffffff" stroke="#3b82f6" strokeWidth={2}
      onMouseDown={onMouseDown}
      style={{ cursor: "move" }} />
  );
}

// --------------------------------------------------------------------------
// Connections: same as before but with publication-grade styling
// --------------------------------------------------------------------------
function ConnectionArrow({ conn, layers, isSelected, onSelect }) {
  const from = layers.find((l) => l.id === conn.fromLayerId);
  const to = layers.find((l) => l.id === conn.toLayerId);
  if (!from || !to) return null;
  const fromH = window.getLayerHeight(from);
  const toH = window.getLayerHeight(to);
  const baseColor = conn.type === "recurrent" ? "#ef4444" : "#374151";
  const color = isSelected ? "#1d4ed8" : baseColor;
  const dash = conn.type === "skip" ? "6 5" : undefined;
  const strokeWidth = isSelected ? 2.5 : (conn.type === "recurrent" ? 1.75 : 1.5);

  const handleClick = (e) => { e.stopPropagation(); onSelect(conn.id); };

  if (from.id === to.id) {
    const cx = from.position.x + LAYER_WIDTH / 2;
    const top = from.position.y - 8;
    const r = LAYER_WIDTH / 2 + 14;
    const left = cx - r;
    const right = cx + r;
    const path = `M ${left} ${top} C ${left} ${top - r}, ${right} ${top - r}, ${right} ${top}`;
    return (
      <g style={{ cursor: "pointer" }} onClick={handleClick}>
        <path d={path} stroke="transparent" strokeWidth={18} fill="none" />
        <path d={path} stroke={color} strokeWidth={strokeWidth} fill="none" strokeDasharray={dash} />
        <polygon points={`${right},${top} ${right - 7},${top - 5} ${right + 2},${top - 8}`} fill={color}/>
      </g>
    );
  }

  const fromX = from.position.x + LAYER_WIDTH;
  const fromY = from.position.y + fromH / 2;
  const toX = to.position.x;
  const toY = to.position.y + toH / 2;
  const dx = toX - fromX, dy = toY - fromY;
  const horizontal = Math.abs(dy) < 1;
  const path = horizontal
    ? null
    : `M ${fromX} ${fromY} C ${fromX + Math.max(40, dx / 2)} ${fromY}, ${toX - Math.max(40, dx / 2)} ${toY}, ${toX} ${toY}`;

  const angle = horizontal ? 0 : 0; // arrow exits ~horizontal
  const ah = 8;
  const ax1 = toX - ah * Math.cos(angle - Math.PI / 6);
  const ay1 = toY - ah * Math.sin(angle - Math.PI / 6);
  const ax2 = toX - ah * Math.cos(angle + Math.PI / 6);
  const ay2 = toY - ah * Math.sin(angle + Math.PI / 6);

  return (
    <g style={{ cursor: "pointer" }} onClick={handleClick}>
      {horizontal ? (
        <>
          <line x1={fromX} y1={fromY} x2={toX} y2={toY} stroke="transparent" strokeWidth={14} />
          <line x1={fromX} y1={fromY} x2={toX} y2={toY} stroke={color} strokeWidth={strokeWidth} strokeDasharray={dash} />
        </>
      ) : (
        <>
          <path d={path} stroke="transparent" strokeWidth={14} fill="none" />
          <path d={path} stroke={color} strokeWidth={strokeWidth} strokeDasharray={dash} fill="none" />
        </>
      )}
      <polygon points={`${toX},${toY} ${ax1},${ay1} ${ax2},${ay2}`} fill={color} />
    </g>
  );
}

// --------------------------------------------------------------------------
// Main canvas
// --------------------------------------------------------------------------
function NetworkCanvas({
  layers, connections, groups, annotations, figure,
  selectedLayerId, selectedConnectionId, selectedAnnotationId,
  onSelectLayer, onSelectConnection, onSelectAnnotation,
  onAddLayer, onAddConnection, onMoveLayer, onMoveAnnotation,
  onMoveGroup, onMoveLabel,
  connectMode, setConnectMode,
  connectFromLayer, setConnectFromLayer,
  onOpenExport,
}) {
  const [isDropHover, setDropHover] = React.useState(false);
  const wrapRef = React.useRef(null);
  const dragRef = React.useRef(null);

  // ---- Pan / Zoom view state ---------------------------------------------
  const [zoom, setZoom] = React.useState(1);
  const [pan,  setPan]  = React.useState({ x: 0, y: 0 });
  const viewRef = React.useRef({ zoom: 1, pan: { x: 0, y: 0 } });
  React.useEffect(() => { viewRef.current = { zoom, pan }; }, [zoom, pan]);
  const isSpaceDownRef = React.useRef(false);
  const [spaceHeld, setSpaceHeld] = React.useState(false);

  // Space toggles "hand tool" pan mode (mirrors Figma / Sketch)
  React.useEffect(() => {
    const isTyping = () => {
      const a = document.activeElement;
      return a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || a.isContentEditable);
    };
    const onKD = (e) => {
      if (e.code === "Space" && !e.repeat && !isTyping()) {
        isSpaceDownRef.current = true;
        setSpaceHeld(true);
        e.preventDefault();
      }
    };
    const onKU = (e) => {
      if (e.code === "Space") {
        isSpaceDownRef.current = false;
        setSpaceHeld(false);
      }
    };
    window.addEventListener("keydown", onKD);
    window.addEventListener("keyup", onKU);
    return () => {
      window.removeEventListener("keydown", onKD);
      window.removeEventListener("keyup", onKU);
    };
  }, []);

  // Convert screen coordinates → canvas (user) coordinates.
  const toCanvas = (clientX, clientY) => {
    const rect = wrapRef.current.getBoundingClientRect();
    const { zoom: z, pan: p } = viewRef.current;
    return { x: (clientX - rect.left - p.x) / z, y: (clientY - rect.top - p.y) / z };
  };

  // Cursor-anchored wheel zoom
  const onWheel = (e) => {
    if (!wrapRef.current.contains(e.target) && e.target !== wrapRef.current) return;
    e.preventDefault();
    const rect = wrapRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const cx = (mx - pan.x) / zoom;
    const cy = (my - pan.y) / zoom;
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    const newZoom = Math.max(0.2, Math.min(4, zoom * factor));
    setZoom(newZoom);
    setPan({ x: mx - cx * newZoom, y: my - cy * newZoom });
  };

  // Pan by middle-click drag or Space+left-drag
  const startPan = (e) => {
    const startX = e.clientX, startY = e.clientY;
    const initial = { ...pan };
    const onMove = (ev) => setPan({ x: initial.x + (ev.clientX - startX), y: initial.y + (ev.clientY - startY) });
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // Fit everything in view
  const fitToContent = () => {
    if (!wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    if (!layers.length) { setZoom(1); setPan({ x: 0, y: 0 }); return; }
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const l of layers) {
      const h = window.getLayerHeight(l);
      minX = Math.min(minX, l.position.x - 20);
      maxX = Math.max(maxX, l.position.x + LAYER_WIDTH + 20);
      minY = Math.min(minY, l.position.y - 50);
      maxY = Math.max(maxY, l.position.y + h + 60);
    }
    for (const a of annotations) {
      if (a.kind === "text") {
        minX = Math.min(minX, a.x - 40); maxX = Math.max(maxX, a.x + 80);
        minY = Math.min(minY, a.y - 14); maxY = Math.max(maxY, a.y + 14);
      } else {
        minX = Math.min(minX, a.x1, a.x2); maxX = Math.max(maxX, a.x1, a.x2);
        minY = Math.min(minY, a.y1, a.y2); maxY = Math.max(maxY, a.y1, a.y2);
      }
    }
    const w = maxX - minX, h = maxY - minY;
    if (!isFinite(w) || !isFinite(h) || w <= 0 || h <= 0) return;
    const margin = 40;
    const fit = Math.min((rect.width - margin * 2) / w, (rect.height - margin * 2) / h, 2);
    const z = Math.max(0.2, fit);
    setZoom(z);
    setPan({
      x: (rect.width - w * z) / 2 - minX * z,
      y: (rect.height - h * z) / 2 - minY * z,
    });
  };
  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };
  const zoomBy = (factor) => {
    if (!wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const mx = rect.width / 2, my = rect.height / 2;
    const cx = (mx - pan.x) / zoom;
    const cy = (my - pan.y) / zoom;
    const newZoom = Math.max(0.2, Math.min(4, zoom * factor));
    setZoom(newZoom);
    setPan({ x: mx - cx * newZoom, y: my - cy * newZoom });
  };

  const onDragOver = (e) => { e.preventDefault(); setDropHover(true); };
  const onDragLeave = () => setDropHover(false);
  const onDrop = (e) => {
    e.preventDefault(); setDropHover(false);
    const type = e.dataTransfer.getData("application/x-layer-template");
    if (!type) return;
    const tmpl = window.LAYER_TEMPLATES.find((t) => t.type === type);
    if (!tmpl) return;
    const c = toCanvas(e.clientX, e.clientY);
    onAddLayer(tmpl, { x: Math.max(20, c.x - LAYER_WIDTH / 2), y: Math.max(40, c.y - 50) });
  };

  const handleLayerMouseDown = (e, id) => {
    if (isSpaceDownRef.current) { startPan(e); return; }
    if (connectMode) { handleConnectClick(id); return; }
    const layer = layers.find((l) => l.id === id);
    if (!layer) return;
    const c = toCanvas(e.clientX, e.clientY);
    dragRef.current = {
      id,
      offsetX: c.x - layer.position.x,
      offsetY: c.y - layer.position.y,
      moved: false, startX: e.clientX, startY: e.clientY,
    };
  };

  const handleConnectClick = (id) => {
    if (!connectFromLayer) setConnectFromLayer(id);
    else if (connectFromLayer !== id) {
      onAddConnection(connectFromLayer, id);
      setConnectFromLayer(null); setConnectMode(false);
    } else setConnectFromLayer(null);
  };

  React.useEffect(() => {
    const onMove = (e) => {
      const d = dragRef.current;
      if (!d) return;
      const c = toCanvas(e.clientX, e.clientY);
      const dx = Math.abs(e.clientX - d.startX);
      const dy = Math.abs(e.clientY - d.startY);
      if (dx > 3 || dy > 3) d.moved = true;
      onMoveLayer(d.id, { x: Math.max(20, c.x - d.offsetX), y: Math.max(40, c.y - d.offsetY) });
    };
    const onUp = () => {
      const d = dragRef.current;
      if (!d) return;
      if (!d.moved) onSelectLayer(d.id);
      dragRef.current = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [onMoveLayer, onSelectLayer]);

  // Background mousedown handles three cases:
  //   - middle-click anywhere or Space+left-click → pan
  //   - svg surface click (no connect mode) → deselect
  //   - otherwise: hand-off to children
  const onBackgroundMouseDown = (e) => {
    if (e.button === 1 || (e.button === 0 && isSpaceDownRef.current)) {
      e.preventDefault();
      e.stopPropagation();
      startPan(e);
      return;
    }
    if (!connectMode && e.target.tagName === "svg") {
      onSelectLayer(null); onSelectConnection(null); onSelectAnnotation(null);
    }
  };

  return (
    <div
      ref={wrapRef}
      className={"canvas-wrap" + (isDropHover ? " drop-hover" : "") + (spaceHeld ? " panning" : "")}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onWheel={onWheel}
    >
      <div className="canvas-toolbar">
        <button
          className={"icon-btn" + (connectMode ? " active" : "")}
          onClick={() => { setConnectMode(!connectMode); setConnectFromLayer(null); }}
          title={connectMode ? "Cancel connection mode" : "Add connection between layers"}
        >
          <img src="design-system/assets/icons/lucide/link.svg" alt="" />
        </button>
        {connectMode && (
          <div className="canvas-hint">
            {connectFromLayer ? "Click destination layer" : "Click source layer"}
          </div>
        )}
      </div>

      {/* Zoom toolbar (top-right) */}
      <div className="canvas-zoom">
        <button className="zoom-btn" onClick={() => zoomBy(1 / 1.2)} title="Zoom out">{"\u2212"}</button>
        <span className="zoom-readout">{Math.round(zoom * 100)}%</span>
        <button className="zoom-btn" onClick={() => zoomBy(1.2)}      title="Zoom in">+</button>
        <button className="zoom-btn zoom-btn--word" onClick={fitToContent} title="Fit network in view">Fit</button>
        <button className="zoom-btn zoom-btn--word" onClick={resetView}    title="Reset to 100%">1:1</button>
      </div>
      <div className="canvas-pan-hint">Scroll = zoom · Space + drag = pan</div>

      {/* Bottom-right preview pill: opens Export Studio */}
      {layers.length > 0 && (
        <button className="preview-pill" onClick={onOpenExport} title="Open Export Studio">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          Preview export
        </button>
      )}

      <svg
        width="100%" height="100%"
        style={{ position: "absolute", inset: 0 }}
        onMouseDown={onBackgroundMouseDown}
      >
        <defs>
          <pattern id="dotgrid" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.7" fill="#e5e7eb" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dotgrid)" />

        {/* All draggable / inspectable content lives inside a single transform
            group so pan/zoom updates only need to mutate this transform. */}
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {figure.showGroupOutline && groups.map((g) => (
            <GroupOutline key={g.id} group={g} layers={layers}
              connections={connections}
              figure={figure}
              onMoveGroup={onMoveGroup}
              onMoveLabel={onMoveLabel}
              zoom={zoom}
            />
          ))}

          {connections.map((c) => (
            <ConnectionArrow
              key={c.id}
              conn={c}
              layers={layers}
              isSelected={c.id === selectedConnectionId && !connectMode}
              onSelect={onSelectConnection}
            />
          ))}
          {layers.map((layer) => (
            <LayerNode
              key={layer.id}
              layer={layer}
              isSelected={layer.id === selectedLayerId && !connectMode}
              isConnectFrom={connectMode && layer.id === connectFromLayer}
              onMouseDown={handleLayerMouseDown}
              connectMode={connectMode}
              figure={figure}
            />
          ))}

          <AnnotationLayer
            annotations={annotations}
            selectedId={selectedAnnotationId}
            onSelect={onSelectAnnotation}
            onMove={onMoveAnnotation}
            zoom={zoom}
          />
        </g>
      </svg>

      {isDropHover && (
        <div className="drop-overlay">
          <div className="drop-overlay__pill">Drop layer here</div>
        </div>
      )}

      {layers.length === 0 && !isDropHover && (
        <div className="canvas-empty">
          <div>
            <div style={{ marginBottom: 6, color: "#111827", fontSize: 15 }}>Empty canvas</div>
            <div>Drag a layer from the sidebar, or choose a preset above.</div>
          </div>
        </div>
      )}
    </div>
  );
}

window.NetworkCanvas = NetworkCanvas;
