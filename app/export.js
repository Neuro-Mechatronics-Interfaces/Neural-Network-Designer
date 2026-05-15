// ui_kits/designer/export.js — turns network state into a downloadable SVG / PNG

(function () {
  const NEURON_RADIUS = 18;
  const NEURON_SPACING = 60;
  const MAX_VISIBLE_NEURONS = 3;
  const LAYER_WIDTH = 80;
  const LAYER_PADDING = 20;

  const NEURON_VIS = window.NEURON_VIS;

  function getLayerHeight(layer) {
    const visible = Math.min(layer.units, MAX_VISIBLE_NEURONS + 1);
    return visible * NEURON_SPACING + LAYER_PADDING * 2;
  }

  function escapeXml(s) {
    return String(s).replace(/[<>&"']/g, (c) =>
      ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]
    );
  }

  function generateSVG(layers, connections) {
    if (layers.length === 0) return "";
    const padding = 60;
    const minX = Math.min(...layers.map((l) => l.position.x));
    const maxX = Math.max(...layers.map((l) => l.position.x + LAYER_WIDTH));
    const minY = Math.min(...layers.map((l) => l.position.y - 24));
    const maxY = Math.max(...layers.map((l) => l.position.y + getLayerHeight(l) + 24));
    const w = maxX - minX + padding * 2;
    const h = maxY - minY + padding * 2;
    const ox = (x) => x - minX + padding;
    const oy = (y) => y - minY + padding;

    let svg = "";
    svg += `<?xml version="1.0" encoding="UTF-8"?>\n`;
    svg += `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">\n`;
    svg += `  <defs>\n`;
    svg += `    <style>\n`;
    svg += `      text { font-family: "Untitled Sans", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }\n`;
    svg += `      .label { font-size: 14px; font-weight: 500; fill: #1f2937; }\n`;
    svg += `      .info { font-size: 11px; fill: #6b7280; }\n`;
    svg += `      .glyph { font-size: 16px; font-weight: 700; fill: #fff; }\n`;
    svg += `      .glyph-math { font-family: "STIX Two Math", "Cambria Math", serif; font-style: italic; }\n`;
    svg += `    </style>\n`;
    svg += `  </defs>\n`;
    svg += `  <rect width="${w}" height="${h}" fill="white"/>\n`;

    // connections
    for (const c of connections) {
      const from = layers.find((l) => l.id === c.fromLayerId);
      const to = layers.find((l) => l.id === c.toLayerId);
      if (!from || !to) continue;
      const color = c.type === "recurrent" ? "#ef4444" : "#9ca3af";
      const dash = c.type === "skip" ? "6 5" : "";
      if (from.id === to.id) {
        // self-loop arc
        const cx = ox(from.position.x + LAYER_WIDTH / 2);
        const top = oy(from.position.y - 8);
        const r = LAYER_WIDTH / 2 + 14;
        const left = cx - r;
        const right = cx + r;
        svg += `  <path d="M ${left} ${top} C ${left} ${top - r}, ${right} ${top - r}, ${right} ${top}" stroke="${color}" stroke-width="2" fill="none"${dash ? ` stroke-dasharray="${dash}"` : ""}/>\n`;
        svg += `  <polygon points="${right},${top} ${right - 8},${top - 6} ${right + 2},${top - 8}" fill="${color}"/>\n`;
        continue;
      }
      const fromX = ox(from.position.x + LAYER_WIDTH);
      const fromY = oy(from.position.y + getLayerHeight(from) / 2);
      const toX = ox(to.position.x);
      const toY = oy(to.position.y + getLayerHeight(to) / 2);
      svg += `  <line x1="${fromX}" y1="${fromY}" x2="${toX}" y2="${toY}" stroke="${color}" stroke-width="2"${dash ? ` stroke-dasharray="${dash}"` : ""}/>\n`;
      const angle = Math.atan2(toY - fromY, toX - fromX);
      const ah = 10;
      const ax1 = toX - ah * Math.cos(angle - Math.PI / 6);
      const ay1 = toY - ah * Math.sin(angle - Math.PI / 6);
      const ax2 = toX - ah * Math.cos(angle + Math.PI / 6);
      const ay2 = toY - ah * Math.sin(angle + Math.PI / 6);
      svg += `  <polygon points="${toX},${toY} ${ax1},${ay1} ${ax2},${ay2}" fill="${color}"/>\n`;
    }

    // layers
    for (const layer of layers) {
      const x = ox(layer.position.x);
      const y = oy(layer.position.y);
      const lh = getLayerHeight(layer);
      const cx = x + LAYER_WIDTH / 2;
      svg += `  <rect x="${x - 5}" y="${y - 5}" width="${LAYER_WIDTH + 10}" height="${lh + 10}" fill="white" stroke="#d1d5db" stroke-width="2"/>\n`;
      svg += `  <text x="${cx}" y="${y - 14}" text-anchor="middle" class="label">${escapeXml(layer.name)}</text>\n`;
      const vis = NEURON_VIS[layer.neuronType] || NEURON_VIS.linear;
      const visible = Math.min(layer.units, MAX_VISIBLE_NEURONS + 1);
      for (let i = 0; i < visible; i++) {
        if (i === MAX_VISIBLE_NEURONS && layer.units > MAX_VISIBLE_NEURONS + 1) {
          const ny = y + LAYER_PADDING + i * NEURON_SPACING;
          svg += `  <text x="${cx}" y="${ny + 6}" text-anchor="middle" font-size="24" fill="#6b7280">⋮</text>\n`;
          continue;
        }
        const ny = y + LAYER_PADDING + i * NEURON_SPACING;
        svg += `  <circle cx="${cx}" cy="${ny}" r="${NEURON_RADIUS}" fill="${vis.color}" stroke="#1f2937" stroke-width="2"/>\n`;
        if (vis.symbol) {
          const cls = vis.glyphFont === "math" ? "glyph glyph-math" : "glyph";
          svg += `  <text x="${cx}" y="${ny + 1}" text-anchor="middle" dominant-baseline="middle" class="${cls}">${escapeXml(vis.symbol)}</text>\n`;
        }
      }
      svg += `  <text x="${cx}" y="${y + lh + 18}" text-anchor="middle" class="info">${layer.units} units</text>\n`;
    }
    svg += `</svg>\n`;
    return svg;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function exportSVG(layers, connections) {
    const svg = generateSVG(layers, connections);
    if (!svg) return false;
    downloadBlob(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), "neural-network-architecture.svg");
    return true;
  }

  async function exportPNG(layers, connections, scale = 2) {
    const svg = generateSVG(layers, connections);
    if (!svg) return false;
    return new Promise((resolve) => {
      const img = new Image();
      const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        ctx.scale(scale, scale);
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, img.width, img.height);
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((b) => {
          if (b) downloadBlob(b, "neural-network-architecture.png");
          URL.revokeObjectURL(url);
          resolve(true);
        }, "image/png");
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(false); };
      img.src = url;
    });
  }

  window.exportNetwork = { svg: exportSVG, png: exportPNG, generate: generateSVG };
})();
