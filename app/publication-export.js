// app/publication-export.js — generates Nature Reviews-style publication SVG.
//
// Inputs the network state (layers, connections, figure, groups, annotations)
// and returns a self-contained SVG string. The same string is used for:
//   - the live preview inside Export Studio
//   - the .svg download
//   - the basis for the PNG export at 1x/2x/4x

(function () {
  const NEURON_RADIUS    = 18;
  const NEURON_SPACING   = 60;
  const MAX_VISIBLE      = 3;
  const LAYER_WIDTH      = 80;
  const LAYER_PADDING    = 20;
  const GROUP_PADDING    = 22;     // dashed group outline padding around layers
  const GROUP_LABEL_GAP  = 10;
  const LEGEND_GAP       = 28;
  const FIGURE_MARGIN_X  = 56;
  const FIGURE_MARGIN_Y  = 40;
  const TITLE_BLOCK_H    = 56;
  const CAPTION_BLOCK_W  = 760;
  const SUBLINE_GAP      = 4;

  const ESCAPE = (s) => String(s ?? "").replace(/[<>&"']/g, (c) =>
    ({ "<":"&lt;", ">":"&gt;", "&":"&amp;", '"':"&quot;", "'":"&apos;" })[c]);

  // ------------------------------------------------------------------------
  // Geometry helpers
  // ------------------------------------------------------------------------
  function layerHeight(layer) {
    const visible = window.getVisibleNeuronCount
      ? window.getVisibleNeuronCount(layer)
      : Math.min(layer.units, MAX_VISIBLE + 1);
    return visible * NEURON_SPACING + LAYER_PADDING * 2;
  }

  function layerBox(layer) {
    return {
      x: layer.position.x,
      y: layer.position.y,
      w: LAYER_WIDTH,
      h: layerHeight(layer),
    };
  }

  function neuronVis(neuronType) {
    return (window.NEURON_VIS && window.NEURON_VIS[neuronType]) || { color: "#6b7280", symbol: "", glyphFont: "ui" };
  }

  function paletteFor(id) {
    return (window.GROUP_PALETTE.find((p) => p.id === id)) || window.GROUP_PALETTE[2];
  }

  // ------------------------------------------------------------------------
  // Caption building — what shows under each layer box
  // ------------------------------------------------------------------------
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

  // ------------------------------------------------------------------------
  // Bounding-box scan — figure out canvas size & translation
  // ------------------------------------------------------------------------
  function computeBounds(layers, connections, groups, annotations, figure) {
    if (!layers.length) return null;
    let minX =  Infinity, maxX = -Infinity, minY =  Infinity, maxY = -Infinity;
    for (const l of layers) {
      const b = layerBox(l);
      minX = Math.min(minX, b.x);
      maxX = Math.max(maxX, b.x + b.w);
      minY = Math.min(minY, b.y - 24);                     // label above
      const captionLines = layerCaptionLines(l, figure).length;
      maxY = Math.max(maxY, b.y + b.h + 18 + captionLines * 14 + 6);
    }
    // Group outlines grow the box
    if (figure.showGroupOutline) {
      for (const g of groups) {
        const ls = g.layerIds.map((id) => layers.find((x) => x.id === id)).filter(Boolean);
        if (!ls.length) continue;
        const labelOff = g.labelOffset || { dx: 0, dy: 0 };
        let hasRecurrent = false;
        for (const l of ls) {
          if (window.layerHasRecurrentLoop(l, connections)) hasRecurrent = true;
        }
        const topBump = hasRecurrent ? window.RECURRENT_ARC_HEIGHT : 0;
        for (const l of ls) {
          const b = layerBox(l);
          const footH = window.getLayerFooterHeight(l, figure);
          minX = Math.min(minX, b.x - GROUP_PADDING);
          maxX = Math.max(maxX, b.x + b.w + GROUP_PADDING);
          minY = Math.min(minY, b.y - GROUP_PADDING - 18 - topBump + Math.min(0, labelOff.dy));
          maxY = Math.max(maxY, b.y + b.h + GROUP_PADDING + footH + Math.max(0, labelOff.dy));
        }
      }
    }
    for (const a of annotations) {
      if (a.kind === "text") { minX = Math.min(minX, a.x - 40); maxX = Math.max(maxX, a.x + 80); minY = Math.min(minY, a.y - 10); maxY = Math.max(maxY, a.y + 10); }
      else { minX = Math.min(minX, a.x1, a.x2); maxX = Math.max(maxX, a.x1, a.x2); minY = Math.min(minY, a.y1, a.y2); maxY = Math.max(maxY, a.y1, a.y2); }
    }
    return { minX, maxX, minY, maxY };
  }

  // ------------------------------------------------------------------------
  // Legend block: scans which neuron types are actually used
  // ------------------------------------------------------------------------
  function buildLegendEntries(layers) {
    const seen = new Map();
    for (const l of layers) {
      const v = neuronVis(l.neuronType);
      const label = labelForNeuron(l.neuronType, l.activation);
      const key = l.neuronType;
      if (!seen.has(key)) seen.set(key, { color: v.color, symbol: v.symbol, font: v.glyphFont, label });
    }
    return [...seen.values()];
  }

  function labelForNeuron(type, activation) {
    const t = window.NEURON_TYPES && window.NEURON_TYPES.find((x) => x.value === type);
    return t ? t.label : (activation || type);
  }

  // ------------------------------------------------------------------------
  // Connection rendering
  // ------------------------------------------------------------------------
  function renderConnections(layers, connections, ox, oy, figure) {
    let svg = "";
    for (const c of connections) {
      const from = layers.find((l) => l.id === c.fromLayerId);
      const to   = layers.find((l) => l.id === c.toLayerId);
      if (!from || !to) continue;
      const color = c.type === "recurrent" ? "#ef4444" : "#374151";
      const dash  = c.type === "skip" ? "6 5" : "";
      const stroke = c.type === "recurrent" ? 1.75 : 1.5;
      if (from.id === to.id) {
        const cx = ox(from.position.x + LAYER_WIDTH / 2);
        const top = oy(from.position.y - 8);
        const r = LAYER_WIDTH / 2 + 14;
        const left = cx - r, right = cx + r;
        svg += `  <path d="M ${left} ${top} C ${left} ${top - r}, ${right} ${top - r}, ${right} ${top}" stroke="${color}" stroke-width="${stroke}" fill="none"${dash ? ` stroke-dasharray="${dash}"` : ""}/>\n`;
        svg += `  <polygon points="${right},${top} ${right - 7},${top - 5} ${right + 2},${top - 8}" fill="${color}"/>\n`;
        if (figure.variableNames) {
          svg += `  <text x="${cx}" y="${top - r - 4}" text-anchor="middle" class="varname">h\u209C\u208B\u2081</text>\n`;
        }
        continue;
      }
      const fromX = ox(from.position.x + LAYER_WIDTH);
      const fromY = oy(from.position.y + layerHeight(from) / 2);
      const toX   = ox(to.position.x);
      const toY   = oy(to.position.y + layerHeight(to) / 2);
      // Curve forward connections, straight horizontal if perfectly aligned
      const dx = toX - fromX, dy = toY - fromY;
      const horizontal = Math.abs(dy) < 1;
      if (horizontal) {
        // straight line, arrowhead anchored at edge minus small inset
        const tipX = toX - 1;
        svg += `  <line x1="${fromX}" y1="${fromY}" x2="${tipX}" y2="${toY}" stroke="${color}" stroke-width="${stroke}"${dash ? ` stroke-dasharray="${dash}"` : ""}/>\n`;
        svg += arrowHead(tipX, toY, 0, color);
      } else {
        // bezier with horizontal tangents — looks tidy when layers stagger vertically
        const cx1 = fromX + Math.max(40, dx / 2);
        const cx2 = toX   - Math.max(40, dx / 2);
        const path = `M ${fromX} ${fromY} C ${cx1} ${fromY}, ${cx2} ${toY}, ${toX} ${toY}`;
        svg += `  <path d="${path}" stroke="${color}" stroke-width="${stroke}" fill="none"${dash ? ` stroke-dasharray="${dash}"` : ""}/>\n`;
        // approximate arrow angle from horizontal — bezier ends near horizontal
        svg += arrowHead(toX, toY, 0, color);
      }
      // Optional edge label
      const mx = (fromX + toX) / 2;
      const my = (fromY + toY) / 2;
      if (figure.showEdgeLabels && (c.transform && c.transform !== "none")) {
        const t = (window.TRANSFORMS || []).find((x) => x.value === c.transform);
        const lbl = t ? t.label.replace(/ \(.*$/, "") : c.transform;
        svg += `  <rect x="${mx - lbl.length * 3.4}" y="${my - 10}" width="${lbl.length * 6.8}" height="14" fill="#ffffff" stroke="${color}" stroke-width="0.75" rx="3"/>\n`;
        svg += `  <text x="${mx}" y="${my + 0.5}" text-anchor="middle" class="edgelabel">${ESCAPE(lbl)}</text>\n`;
      } else if (c.annotation) {
        svg += `  <text x="${mx}" y="${my - 6}" text-anchor="middle" class="edgelabel">${ESCAPE(c.annotation)}</text>\n`;
      }
    }
    return svg;
  }

  function arrowHead(tipX, tipY, angle, color) {
    const ah = 8;
    const a = angle || 0;
    const x1 = tipX - ah * Math.cos(a - Math.PI / 6);
    const y1 = tipY - ah * Math.sin(a - Math.PI / 6);
    const x2 = tipX - ah * Math.cos(a + Math.PI / 6);
    const y2 = tipY - ah * Math.sin(a + Math.PI / 6);
    return `  <polygon points="${tipX},${tipY} ${x1.toFixed(2)},${y1.toFixed(2)} ${x2.toFixed(2)},${y2.toFixed(2)}" fill="${color}"/>\n`;
  }

  // ------------------------------------------------------------------------
  // Group outlines (dashed rounded rect with a label tab)
  // ------------------------------------------------------------------------
  function renderGroups(layers, groups, connections, ox, oy, figure) {
    let svg = "";
    for (const g of groups) {
      const ls = g.layerIds.map((id) => layers.find((x) => x.id === id)).filter(Boolean);
      if (!ls.length) continue;
      const pal = paletteFor(g.paletteId);
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      let hasRecurrent = false;
      for (const l of ls) {
        const b = layerBox(l);
        const footH = window.getLayerFooterHeight(l, figure);
        minX = Math.min(minX, l.position.x); maxX = Math.max(maxX, l.position.x + LAYER_WIDTH);
        minY = Math.min(minY, b.y - 18);
        maxY = Math.max(maxY, b.y + b.h + footH);
        if (window.layerHasRecurrentLoop(l, connections)) hasRecurrent = true;
      }
      const topBump = hasRecurrent ? window.RECURRENT_ARC_HEIGHT : 0;
      const x = ox(minX - GROUP_PADDING);
      const y = oy(minY - GROUP_PADDING + 4 - topBump);
      const w = maxX - minX + GROUP_PADDING * 2;
      const h = maxY - minY + GROUP_PADDING * 2 - 4 + topBump;
      svg += `  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" ry="10" fill="${pal.fill}" stroke="${pal.stroke}" stroke-width="1.25" stroke-dasharray="6 4" />\n`;
      // Label tab: positioned at top-left of the dashed rect (+ user offset)
      const labelText = ESCAPE(g.label || "Group");
      const labelOff = g.labelOffset || { dx: 0, dy: 0 };
      const lblY = y - 4 + labelOff.dy;
      const lblX = x + 12 + labelOff.dx;
      const w2 = Math.max(48, labelText.length * 6.8 + 12);
      svg += `  <rect x="${lblX}" y="${lblY - 12}" width="${w2}" height="18" fill="#ffffff" stroke="${pal.stroke}" stroke-width="1" rx="3"/>\n`;
      svg += `  <text x="${lblX + w2/2}" y="${lblY + 2}" text-anchor="middle" class="grouplabel" fill="${pal.stroke}">${labelText}</text>\n`;
    }
    return svg;
  }

  // ------------------------------------------------------------------------
  // Layer rendering (publication style: square box, neuron stack, caption)
  // ------------------------------------------------------------------------
  function renderLayers(layers, ox, oy, figure) {
    let svg = "";
    for (const layer of layers) {
      const x = ox(layer.position.x);
      const y = oy(layer.position.y);
      const lh = layerHeight(layer);
      const cx = x + LAYER_WIDTH / 2;
      // Layer outer box (square — publication style)
      svg += `  <rect x="${x - 5}" y="${y - 5}" width="${LAYER_WIDTH + 10}" height="${lh + 10}" fill="#ffffff" stroke="#111827" stroke-width="1.25"/>\n`;
      // Layer name above
      svg += `  <text x="${cx}" y="${y - 12}" text-anchor="middle" class="layername">${ESCAPE(layer.name)}</text>\n`;
      // Neurons
      const v = neuronVis(layer.neuronType);
      const visible = window.getVisibleNeuronCount
        ? window.getVisibleNeuronCount(layer)
        : Math.min(layer.units, MAX_VISIBLE + 1);
      for (let i = 0; i < visible; i++) {
        const ny = y + LAYER_PADDING + i * NEURON_SPACING;
        if (i === MAX_VISIBLE && layer.units > MAX_VISIBLE + 1) {
          svg += `  <text x="${cx}" y="${ny + 6}" text-anchor="middle" class="ellipsis">\u22ee</text>\n`;
          continue;
        }
        svg += `  <circle cx="${cx}" cy="${ny}" r="${NEURON_RADIUS}" fill="${v.color}" stroke="#111827" stroke-width="1.5"/>\n`;
        if (v.symbol) {
          const cls = v.glyphFont === "math" ? "glyph glyph-math" : "glyph";
          svg += `  <text x="${cx}" y="${ny + 1}" text-anchor="middle" dominant-baseline="middle" class="${cls}">${ESCAPE(v.symbol)}</text>\n`;
        }
      }
      // Caption lines below
      if (figure.showLayerCaptions) {
        const lines = layerCaptionLines(layer, figure);
        const baseY = y + lh + 16;
        lines.forEach((ln, i) => {
          const cls = "caption" + (ln.muted ? " caption-muted" : "") + (ln.mono ? " caption-mono" : "") + (ln.italic ? " caption-italic" : "");
          svg += `  <text x="${cx}" y="${baseY + i * 14}" text-anchor="middle" class="${cls}">${ESCAPE(ln.text)}</text>\n`;
        });
      }
    }
    return svg;
  }

  // ------------------------------------------------------------------------
  // Annotations (text, arrow, bracket)
  // ------------------------------------------------------------------------
  function renderAnnotations(annotations, ox, oy) {
    let svg = "";
    for (const a of annotations) {
      if (a.kind === "text") {
        const cls = a.italic ? "annot-text annot-italic" : "annot-text";
        svg += `  <text x="${ox(a.x)}" y="${oy(a.y)}" text-anchor="middle" class="${cls}">${ESCAPE(a.text)}</text>\n`;
      } else if (a.kind === "arrow") {
        const x1 = ox(a.x1), y1 = oy(a.y1), x2 = ox(a.x2), y2 = oy(a.y2);
        const angle = Math.atan2(y2 - y1, x2 - x1);
        svg += `  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#374151" stroke-width="1.25"/>\n`;
        svg += arrowHead(x2, y2, angle, "#374151");
        if (a.label) {
          svg += `  <text x="${(x1 + x2)/2}" y="${(y1 + y2)/2 - 6}" text-anchor="middle" class="annot-text">${ESCAPE(a.label)}</text>\n`;
        }
      } else if (a.kind === "bracket") {
        const x1 = ox(a.x1), x2 = ox(a.x2);
        const y = oy(a.y1);
        const dir = a.flip ? -1 : 1;
        const lift = 10 * dir;
        svg += `  <path d="M ${x1} ${y} L ${x1} ${y + lift} L ${x2} ${y + lift} L ${x2} ${y}" stroke="#374151" stroke-width="1.25" fill="none"/>\n`;
        const midX = (x1 + x2) / 2;
        svg += `  <text x="${midX}" y="${y + lift + (a.flip ? -6 : 16)}" text-anchor="middle" class="annot-text">${ESCAPE(a.label || "")}</text>\n`;
      }
    }
    return svg;
  }

  // ------------------------------------------------------------------------
  // Legend (neuron color/glyph key) — bottom of figure
  // ------------------------------------------------------------------------
  function renderLegend(entries, x, y, maxWidth) {
    if (!entries.length) return { svg: "", h: 0 };
    let svg = "";
    const itemW = 168;
    const cols = Math.max(1, Math.floor(maxWidth / itemW));
    const rows = Math.ceil(entries.length / cols);
    const lineH = 28;
    // Title strip
    svg += `  <text x="${x}" y="${y}" class="legend-title">Legend</text>\n`;
    const headerLine = y + 6;
    svg += `  <line x1="${x}" y1="${headerLine}" x2="${x + maxWidth}" y2="${headerLine}" stroke="#e5e7eb" stroke-width="1"/>\n`;
    entries.forEach((e, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const cx = x + col * itemW + 14;
      const cy = headerLine + 22 + row * lineH;
      svg += `  <circle cx="${cx}" cy="${cy}" r="10" fill="${e.color}" stroke="#111827" stroke-width="1.25"/>\n`;
      if (e.symbol) {
        const cls = e.font === "math" ? "glyph glyph-small glyph-math" : "glyph glyph-small";
        svg += `  <text x="${cx}" y="${cy + 0.5}" text-anchor="middle" dominant-baseline="middle" class="${cls}">${ESCAPE(e.symbol)}</text>\n`;
      }
      svg += `  <text x="${cx + 18}" y="${cy + 4}" class="legend-text">${ESCAPE(e.label)}</text>\n`;
    });
    return { svg, h: 14 + rows * lineH };
  }

  // ------------------------------------------------------------------------
  // Master assembler
  // ------------------------------------------------------------------------
  function generatePublicationSVG(state) {
    const layers      = state.layers || [];
    const connections = state.connections || [];
    const groups      = state.groups || [];
    const annotations = state.annotations || [];
    const figure      = Object.assign({}, window.DEFAULT_FIGURE, state.figure || {});

    if (!layers.length) {
      // Empty-state SVG: a single white card with placeholder text. Still valid SVG.
      return emptyStateSVG(figure);
    }

    const bounds = computeBounds(layers, connections, groups, annotations, figure);
    const diagW = bounds.maxX - bounds.minX;
    const diagH = bounds.maxY - bounds.minY;

    // Build legend ahead-of-time so we can size the canvas
    const legendEntries = figure.showLegend ? buildLegendEntries(layers) : [];
    const legendMaxW = Math.max(diagW, 360);
    const legendCols = Math.max(1, Math.floor(legendMaxW / 168));
    const legendRows = Math.ceil(legendEntries.length / legendCols);
    const legendH    = legendEntries.length ? 14 + legendRows * 28 : 0;

    // Title block (only if title present)
    const titleH = figure.title ? TITLE_BLOCK_H : 0;
    // Caption block (only if caption present) — measure roughly by chars per line
    const captionLines = figure.caption ? wrap(figure.caption, 88) : [];
    const captionH = captionLines.length ? 16 + captionLines.length * 16 : 0;

    const innerW = Math.max(diagW, CAPTION_BLOCK_W * 0.6);
    const W = innerW + FIGURE_MARGIN_X * 2;
    const H = titleH + diagH + (legendH ? LEGEND_GAP + legendH : 0) + (captionH ? LEGEND_GAP + captionH : 0) + FIGURE_MARGIN_Y * 2;

    const offX = FIGURE_MARGIN_X + (innerW - diagW) / 2 - bounds.minX;
    const offY = FIGURE_MARGIN_Y + titleH - bounds.minY;
    const ox = (x) => x + offX;
    const oy = (y) => y + offY;

    let svg = "";
    svg += `<?xml version="1.0" encoding="UTF-8"?>\n`;
    svg += `<svg xmlns="http://www.w3.org/2000/svg" width="${W.toFixed(0)}" height="${H.toFixed(0)}" viewBox="0 0 ${W.toFixed(0)} ${H.toFixed(0)}">\n`;
    svg += defs();
    svg += `  <rect width="${W.toFixed(0)}" height="${H.toFixed(0)}" fill="#ffffff"/>\n`;

    // Title
    if (figure.title) {
      svg += `  <text x="${(W / 2).toFixed(0)}" y="${FIGURE_MARGIN_Y + 24}" text-anchor="middle" class="figtitle">${ESCAPE(figure.title)}</text>\n`;
    }

    // Order: groups (background) → connections → layers → annotations
    if (figure.showGroupOutline) svg += renderGroups(layers, groups, connections, ox, oy, figure);
    svg += renderConnections(layers, connections, ox, oy, figure);
    svg += renderLayers(layers, ox, oy, figure);
    svg += renderAnnotations(annotations, ox, oy);

    // Legend
    let cursorY = FIGURE_MARGIN_Y + titleH + diagH;
    if (legendEntries.length) {
      const lx = FIGURE_MARGIN_X + (innerW - legendMaxW) / 2;
      const ly = cursorY + LEGEND_GAP;
      const r = renderLegend(legendEntries, lx, ly, legendMaxW);
      svg += r.svg;
      cursorY = ly + r.h;
    }

    // Caption
    if (captionLines.length) {
      const y0 = cursorY + LEGEND_GAP;
      const cx = W / 2;
      captionLines.forEach((line, i) => {
        svg += `  <text x="${cx}" y="${y0 + i * 16}" text-anchor="middle" class="figcaption">${ESCAPE(line)}</text>\n`;
      });
    }

    svg += `</svg>\n`;
    return svg;
  }

  // ------------------------------------------------------------------------
  // Empty-state SVG (when user opens export with no layers)
  // ------------------------------------------------------------------------
  function emptyStateSVG(figure) {
    const W = 640, H = 320;
    let s = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">\n`;
    s += defs();
    s += `  <rect width="${W}" height="${H}" fill="#ffffff" stroke="#e5e7eb" stroke-dasharray="5 5"/>\n`;
    s += `  <text x="${W/2}" y="${H/2}" text-anchor="middle" class="empty-msg">No layers yet — drop a layer onto the canvas to begin.</text>\n`;
    s += `</svg>\n`;
    return s;
  }

  // ------------------------------------------------------------------------
  // <defs> block — embedded fonts and styles so the SVG renders standalone
  // ------------------------------------------------------------------------
  function defs() {
    return `  <defs>
    <style><![CDATA[
      .figtitle    { font-family: "Untitled Sans","Inter",sans-serif; font-size: 18px; font-weight: 500; fill: #111827; letter-spacing: 0.005em; }
      .figcaption  { font-family: "Untitled Sans","Inter",sans-serif; font-size: 12px; font-weight: 300; fill: #4b5563; }
      .layername   { font-family: "Untitled Sans","Inter",sans-serif; font-size: 12.5px; font-weight: 500; fill: #111827; letter-spacing: 0.01em; }
      .caption     { font-family: "Untitled Sans","Inter",sans-serif; font-size: 11px; fill: #111827; }
      .caption-muted { fill: #6b7280; }
      .caption-italic{ font-family: "STIX Two Math","Cambria Math",serif; font-style: italic; }
      .caption-mono  { font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace; font-size: 10.5px; fill: #4b5563; }
      .grouplabel  { font-family: "Untitled Sans","Inter",sans-serif; font-size: 11px; font-weight: 500; letter-spacing: 0.04em; text-transform: uppercase; }
      .legend-title{ font-family: "Untitled Sans","Inter",sans-serif; font-size: 10.5px; fill: #6b7280; text-transform: uppercase; letter-spacing: 0.08em; }
      .legend-text { font-family: "Untitled Sans","Inter",sans-serif; font-size: 11.5px; fill: #111827; }
      .glyph       { font-family: "Untitled Sans","Inter",sans-serif; font-size: 14px; font-weight: 600; fill: #fff; }
      .glyph-small { font-size: 11px; }
      .glyph-math  { font-family: "STIX Two Math","Cambria Math",serif; font-style: italic; font-weight: 400; }
      .ellipsis    { font-family: serif; font-size: 22px; fill: #6b7280; }
      .annot-text  { font-family: "Untitled Sans","Inter",sans-serif; font-size: 12px; fill: #111827; }
      .annot-italic{ font-family: "STIX Two Math","Cambria Math",serif; font-style: italic; }
      .varname     { font-family: "STIX Two Math","Cambria Math",serif; font-style: italic; font-size: 11px; fill: #6b7280; }
      .edgelabel   { font-family: "Untitled Sans","Inter",sans-serif; font-size: 10px; fill: #4b5563; }
      .empty-msg   { font-family: "Untitled Sans","Inter",sans-serif; font-size: 14px; fill: #9ca3af; }
    ]]></style>
  </defs>
`;
  }

  function wrap(text, maxChars) {
    const words = text.split(/\s+/);
    const lines = [];
    let current = "";
    for (const w of words) {
      if ((current + " " + w).trim().length > maxChars && current) { lines.push(current); current = w; }
      else { current = (current ? current + " " : "") + w; }
    }
    if (current) lines.push(current);
    return lines;
  }

  // ------------------------------------------------------------------------
  // Exports
  // ------------------------------------------------------------------------
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    a.rel = "noopener";
    a.target = "_blank";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  function openBlobInNewTab(blob) {
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return !!w;
  }

  async function exportSVG(state) {
    const svg = generatePublicationSVG(state);
    downloadBlob(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), filenameFrom(state.figure) + ".svg");
    return true;
  }

  async function openSVGInNewTab(state) {
    const svg = generatePublicationSVG(state);
    return openBlobInNewTab(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  }

  async function exportPNG(state, scale) {
    const blob = await renderPNG(state, scale);
    if (!blob) return false;
    downloadBlob(blob, filenameFrom(state.figure) + `@${scale}x.png`);
    return true;
  }

  async function openPNGInNewTab(state, scale) {
    const blob = await renderPNG(state, scale);
    if (!blob) return false;
    return openBlobInNewTab(blob);
  }

  function renderPNG(state, scale) {
    const svg = generatePublicationSVG(state);
    return new Promise((resolve) => {
      const img = new Image();
      const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width  = img.width  * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        ctx.scale(scale, scale);
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, img.width, img.height);
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((b) => { URL.revokeObjectURL(url); resolve(b); }, "image/png");
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
      img.src = url;
    });
  }

  function filenameFrom(figure) {
    const t = (figure && figure.title) ? figure.title : "neural-network";
    return t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "neural-network";
  }

  window.publicationExport = {
    svg: exportSVG,
    png: exportPNG,
    openSVG: openSVGInNewTab,
    openPNG: openPNGInNewTab,
    generate: generatePublicationSVG,
    filenameFrom,
  };

  // Backwards-compat shim — existing AppBar still calls window.exportNetwork
  window.exportNetwork = {
    svg: (layers, connections) => exportSVG({ layers, connections, figure: window.DEFAULT_FIGURE }),
    png: (layers, connections, scale) => exportPNG({ layers, connections, figure: window.DEFAULT_FIGURE }, scale || 2),
    generate: (layers, connections) => generatePublicationSVG({ layers, connections, figure: window.DEFAULT_FIGURE }),
  };
})();
