// app/data-figure.js — figure metadata + groups + annotations defaults

window.DEFAULT_FIGURE = {
  title: "",
  caption: "",
  showLegend: true,
  showGroupOutline: true,
  showLayerCaptions: true,
  showShapes: false,           // print tensor shape strings under each layer
  showEdgeLabels: false,       // print transform/connectivity tag on each edge
  variableNames: false,        // print x_t / h_{t-1} etc on edges (LSTM-style)
  caseStyle: "title",
};

window.GROUP_PALETTE = [
  { id: "amber",   stroke: "#b45309", fill: "rgba(251, 191, 36, 0.06)" },
  { id: "violet",  stroke: "#6d28d9", fill: "rgba(139, 92, 246, 0.06)" },
  { id: "blue",    stroke: "#1d4ed8", fill: "rgba(59, 130, 246, 0.06)" },
  { id: "rose",    stroke: "#9f1239", fill: "rgba(236, 72, 153, 0.06)" },
  { id: "teal",    stroke: "#0e7490", fill: "rgba(6, 182, 212, 0.06)" },
  { id: "slate",   stroke: "#334155", fill: "rgba(100, 116, 139, 0.06)" },
];

window.ANNOTATION_KINDS = [
  { value: "text",    label: "Text label",      hint: "Plain caption — handy for x_t, h_{t-1}, loss" },
  { value: "arrow",   label: "Arrow",           hint: "Pointer between two screen positions" },
  { value: "bracket", label: "Dimension brace", hint: "Label a span between two layers" },
];

// Auto-arrange a linear chain into N rows.  Used by the Figure panel
// "Wrap into rows" button to repack a too-wide architecture onto multiple
// rows.  Returns an array of { id, position: {x, y} } updates suitable for
// passing to onMoveLayer.
//
//   layers     — current layers (must have .position.x set)
//   nRows      — target row count (>= 1)
//   colWidth   — horizontal spacing between columns in px (default 160)
//   rowHeight  — vertical spacing between rows in px (default 240)
//   originX/Y  — top-left of the new grid (default = current min)
//
// The chain order is the layer array order (which matches the way the user
// laid them out left-to-right on the canvas).  Layers are split across rows
// so the row counts differ by at most 1.  Within a row, layers are evenly
// spaced.
window.wrapLayersIntoRows = (layers, nRows, opts) => {
  opts = opts || {};
  const N = layers.length;
  if (N === 0 || nRows < 1) return [];
  const rows = Math.max(1, Math.min(nRows, N));
  const perRow = Math.ceil(N / rows);
  // Keep current top-left anchor by default so the network doesn't jump.
  const originX = opts.originX !== undefined ? opts.originX :
    Math.min(...layers.map((l) => l.position.x));
  const originY = opts.originY !== undefined ? opts.originY :
    Math.min(...layers.map((l) => l.position.y));
  const colWidth  = opts.colWidth  || 160;
  const rowHeight = opts.rowHeight || 260;
  const updates = [];
  for (let r = 0; r < rows; r++) {
    const start = r * perRow;
    const end   = Math.min(N, start + perRow);
    for (let i = start; i < end; i++) {
      const colInRow = (r % 2 === 0) ? (i - start) : (end - 1 - i);
      // Even rows go L→R, odd rows R→L so connections curve back tidily.
      updates.push({
        id: layers[i].id,
        position: {
          x: originX + colInRow * colWidth,
          y: originY + r * rowHeight,
        },
      });
    }
  }
  return updates;
};
window.makeGroup = (label, layerIds, paletteId) => ({
  id: window.uid(),
  label: label || "Group",
  layerIds: layerIds || [],
  paletteId: paletteId || "blue",
  labelOffset: { dx: 0, dy: 0 },
});

window.makeAnnotation = (kind, opts = {}) => {
  const base = { id: window.uid(), kind };
  if (kind === "text") {
    return { ...base, x: opts.x ?? 200, y: opts.y ?? 60, text: opts.text || "x_t", italic: true };
  }
  if (kind === "arrow") {
    return { ...base, x1: opts.x1 ?? 80, y1: opts.y1 ?? 60, x2: opts.x2 ?? 220, y2: opts.y2 ?? 60, label: opts.label || "" };
  }
  if (kind === "bracket") {
    return { ...base, x1: opts.x1 ?? 100, y1: opts.y1 ?? 280, x2: opts.x2 ?? 320, y2: opts.y2 ?? 280, label: opts.label || "Encoder", flip: false };
  }
  return base;
};

// Layer-equation helpers — used in the export when "showEquations" is true.
// Returns LaTeX-ish strings with unicode glyphs (works in SVG and on screen).
window.layerEquation = (layer) => {
  switch (layer.type) {
    case "mlp":         return "h = " + activationGlyph(layer.activation) + "(Wx + b)";
    case "rnn":         return "h\u209C = " + activationGlyph(layer.activation) + "(W\u2095h\u209C\u208B\u2081 + W\u2093x\u209C + b)";
    case "lstm":        return "h\u209C, c\u209C = LSTM(x\u209C, h\u209C\u208B\u2081, c\u209C\u208B\u2081)";
    case "gru":         return "h\u209C = GRU(x\u209C, h\u209C\u208B\u2081)";
    case "cnn":         return "y = " + activationGlyph(layer.activation) + "(W * x + b)";
    case "transformer": return "y = MultiHead(Q, K, V)";
    case "input":       return "x \u2208 \u211D" + supDim(layer);
    case "output":      return "\u0177 = softmax(Wh + b)";
    default:            return "";
  }
};

function activationGlyph(a) {
  switch ((a || "").toLowerCase()) {
    case "sigmoid": return "\u03c3";
    case "tanh":    return "\u03c6";
    case "relu":    return "max(0, \u00b7)";
    case "softmax": return "softmax";
    case "linear":  return "";
    case "gelu":    return "GELU";
    case "leakyrelu": return "LeakyReLU";
    default:        return a || "";
  }
}

function supDim(layer) {
  const c = (layer.inputConfig || layer.outputConfig || {});
  const parts = [c.channels, c.features].filter((n) => Number.isFinite(n) && n > 0);
  if (!parts.length) return "";
  return "^{" + parts.join("\u00d7") + "}";
}
window.layerActivationGlyph = activationGlyph;
window.layerShapeSummary = (layer) => {
  // Returns short shape string for under-layer captions
  if (layer.type === "input" && layer.inputConfig) {
    const c = layer.inputConfig;
    return [c.channels, c.features].filter((x) => x).join(" \u00d7 ");
  }
  if (layer.type === "output" && layer.outputConfig) {
    const c = layer.outputConfig;
    if (c.numClasses) return c.numClasses + " classes";
    return [c.channels, layer.units].filter((x) => x).join(" \u00d7 ");
  }
  if (layer.type === "cnn") {
    return (layer.numFilters || layer.units) + "\u00d7" + (layer.kernelSize || 3) + "\u00d7" + (layer.kernelSize || 3);
  }
  if (layer.type === "transformer") {
    return (layer.numHeads || 8) + " heads, d=" + (layer.embeddingDim || layer.units);
  }
  // No extra shape line for generic MLP / RNN / LSTM / GRU — their "N units"
  // already appears as the first caption line; duplicating it adds clutter.
  return "";
};

// Auto-build sensible groups from layer types when the user hasn't drawn any.
// Useful as a "first export" default that already looks publication-ish.
window.autoGroup = (layers) => {
  const groups = [];
  // Group consecutive layers by major family
  const family = (t) => {
    if (t === "input")  return "input";
    if (t === "output") return "output";
    if (t === "lstm" || t === "gru" || t === "rnn") return "recurrent";
    if (t === "cnn")    return "conv";
    if (t === "transformer") return "attention";
    return "dense";
  };
  const FAMILY_LABEL = {
    input: "Input", output: "Output", recurrent: "Recurrent block",
    conv: "Conv block", attention: "Attention block", dense: "Dense block",
  };
  const FAMILY_PALETTE = {
    input: "blue", output: "rose", recurrent: "rose",
    conv: "violet", attention: "violet", dense: "teal",
  };
  // Only emit a group if a family covers 2+ layers
  let current = null;
  for (const l of layers) {
    const f = family(l.type);
    if (current && current.family === f) {
      current.layerIds.push(l.id);
    } else {
      if (current && current.layerIds.length >= 2) groups.push(current);
      current = { family: f, layerIds: [l.id] };
    }
  }
  if (current && current.layerIds.length >= 2) groups.push(current);
  return groups.map((g) => window.makeGroup(FAMILY_LABEL[g.family], g.layerIds, FAMILY_PALETTE[g.family]));
};
