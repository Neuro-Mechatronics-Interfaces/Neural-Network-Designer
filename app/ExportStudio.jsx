// app/ExportStudio.jsx — modal with live SVG preview + multi-format export.

function ExportStudio({ open, onClose, state, onUpdateFigure, onToast }) {
  const [tab, setTab] = React.useState("svg");
  const [scale, setScale] = React.useState(2);
  const [zoom, setZoom] = React.useState(1);
  const [zoomMode, setZoomMode] = React.useState("fit"); // "fit" | "manual"
  const [copied, setCopied] = React.useState(false);
  const previewRef = React.useRef(null);
  const hostRef = React.useRef(null);

  // Live preview SVG — regenerated on every state change
  const svgString = React.useMemo(() => {
    return window.publicationExport.generate(state);
  }, [state]);

  const tikzString = React.useMemo(() => {
    return window.tikzExport.generate(state);
  }, [state]);

  // Read intrinsic SVG width/height from the generated markup.
  const svgDims = React.useMemo(() => {
    const w = parseFloat((svgString.match(/<svg[^>]*\swidth="(\d+(?:\.\d+)?)"/) || [])[1] || "0");
    const h = parseFloat((svgString.match(/<svg[^>]*\sheight="(\d+(?:\.\d+)?)"/) || [])[1] || "0");
    return { w, h };
  }, [svgString]);

  // Auto-fit when zoomMode is "fit" — measure the preview viewport and
  // pick a zoom that makes the SVG fit inside it with a small margin.
  React.useLayoutEffect(() => {
    if (!open || tab === "tikz" || zoomMode !== "fit") return;
    const el = previewRef.current;
    if (!el || !svgDims.w || !svgDims.h) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      const padX = 56, padY = 56;
      const availW = Math.max(40, rect.width - padX);
      const availH = Math.max(40, rect.height - padY);
      const fit = Math.min(availW / svgDims.w, availH / svgDims.h, 1);
      setZoom(Math.max(0.1, fit));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open, tab, svgDims.w, svgDims.h, zoomMode]);

  React.useEffect(() => { setCopied(false); }, [tab, state]);

  if (!open) return null;

  const layerCount = state.layers.length;
  const connectionCount = state.connections.length;
  const groupCount = state.groups.length;
  const figure = state.figure;
  const t = (k, v) => onUpdateFigure({ [k]: v });

  const fit = () => setZoomMode("fit");
  const zoomIn = () => { setZoomMode("manual"); setZoom((z) => Math.min(3, +(z + 0.1).toFixed(2))); };
  const zoomOut = () => { setZoomMode("manual"); setZoom((z) => Math.max(0.1, +(z - 0.1).toFixed(2))); };

  const onExport = async () => {
    if (tab === "svg") {
      await window.publicationExport.svg(state);
      onToast && onToast("Downloaded SVG (check Downloads folder)");
    } else if (tab === "png") {
      await window.publicationExport.png(state, scale);
      onToast && onToast(`Downloaded PNG @ ${scale}\u00d7 (check Downloads folder)`);
    } else if (tab === "tikz") {
      window.tikzExport.download(state);
      onToast && onToast("Downloaded .tex (check Downloads folder)");
    }
  };

  const onOpenNewTab = async () => {
    let ok = false;
    if (tab === "svg") {
      ok = await window.publicationExport.openSVG(state);
    } else if (tab === "png") {
      ok = await window.publicationExport.openPNG(state, scale);
    }
    if (!ok) onToast && onToast("Browser blocked the popup — try Download or Copy instead");
  };

  const copyToClipboard = async (text, label) => {
    // Sandboxed iframes often reject async clipboard. Try modern API first,
    // then fall back to a temporary textarea + execCommand("copy").
    let ok = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        ok = true;
      }
    } catch (e) { /* fall through to legacy path */ }
    if (!ok) {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.top = "0";
        ta.style.left = "0";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        ta.setSelectionRange(0, text.length);
        ok = document.execCommand && document.execCommand("copy");
        document.body.removeChild(ta);
      } catch (e) { ok = false; }
    }
    if (ok) {
      setCopied(true);
      onToast && onToast(`Copied ${label} to clipboard`);
    } else {
      onToast && onToast("Copy blocked by browser \u2014 try Download or Open in tab");
    }
  };

  return (
    <div className="studio-backdrop" onClick={onClose}>
      <div className="studio" onClick={(e) => e.stopPropagation()}>
        <header className="studio__header">
          <div className="studio__title">
            <span>Export Network Architecture</span>
            <span className="studio__meta">
              {layerCount} layer{layerCount === 1 ? "" : "s"} · {connectionCount} connection{connectionCount === 1 ? "" : "s"}
              {groupCount ? `  ·  ${groupCount} group${groupCount === 1 ? "" : "s"}` : ""}
            </span>
          </div>
          <button className="studio__close" onClick={onClose} title="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </header>

        <div className="studio__body">
          {/* ---------- Preview pane ---------- */}
          <div className="studio__preview">
            <div className="studio__preview-toolbar">
              <span className="studio__preview-label">PREVIEW</span>
              <span style={{ flex: 1 }} />
              {tab !== "tikz" && (
                <>
                  <button className="zoom-btn" onClick={zoomOut} title="Zoom out">{"\u2212"}</button>
                  <span className="zoom-readout">{Math.round(zoom * 100)}%</span>
                  <button className="zoom-btn" onClick={zoomIn} title="Zoom in">+</button>
                  <button className={"zoom-btn zoom-btn--word" + (zoomMode === "fit" ? " active" : "")} onClick={fit} title="Fit to view">Fit</button>
                </>
              )}
              {tab === "tikz" && (
                <span className="studio__preview-hint">{tikzString.split("\n").length} lines · scroll to read</span>
              )}
            </div>
            <div className="studio__preview-canvas" ref={previewRef}>
              <div className="studio__preview-frame">
                {tab === "tikz" ? (
                  <pre className="tikz-block" style={{ minWidth: 0 }}>
                    <code>{tikzString}</code>
                  </pre>
                ) : (
                  <div className="svg-host"
                    ref={hostRef}
                    style={{
                      transform: `scale(${zoom})`,
                      transformOrigin: "top center",
                      width: svgDims.w ? svgDims.w + "px" : undefined,
                      height: svgDims.h ? svgDims.h + "px" : undefined,
                    }}
                    dangerouslySetInnerHTML={{ __html: svgString }} />
                )}
              </div>
            </div>
          </div>

          {/* ---------- Side panel ---------- */}
          <aside className="studio__side">
            <div className="studio-tabs">
              {["svg", "png", "tikz"].map((id) => (
                <button key={id}
                  className={"studio-tab" + (tab === id ? " active" : "")}
                  onClick={() => setTab(id)}>
                  {id === "svg" ? "SVG" : id === "png" ? "PNG" : "TikZ"}
                </button>
              ))}
            </div>

            <div className="studio__side-body">
              {tab === "svg" && <SVGOptions figure={figure} onChange={t} />}
              {tab === "png" && <PNGOptions figure={figure} onChange={t} scale={scale} setScale={setScale} />}
              {tab === "tikz" && <TikZOptions figure={figure} onChange={t} />}
            </div>

            <div className="studio__side-footer">
              {tab === "svg" && (
                <div className="studio-actions">
                  <button className="btn btn--outlined studio-actions__half"
                    onClick={() => copyToClipboard(svgString, "SVG markup")}>
                    {copied ? "\u2713 Copied" : "Copy SVG"}
                  </button>
                  <button className="btn btn--outlined studio-actions__half"
                    onClick={onOpenNewTab}>
                    Open in tab
                  </button>
                </div>
              )}
              {tab === "png" && (
                <button className="btn btn--outlined btn--full" onClick={onOpenNewTab}>
                  Open in new tab
                </button>
              )}
              {tab === "tikz" && (
                <button className="btn btn--outlined btn--full"
                  onClick={() => copyToClipboard(tikzString, "TikZ code")}>
                  {copied ? "\u2713 Copied TikZ code" : "Copy TikZ code"}
                </button>
              )}
              <button className="btn btn--contained btn--full" onClick={onExport}>
                <img src="design-system/assets/icons/lucide/download.svg" alt="" />
                Download {tab === "svg" ? ".svg" : tab === "png" ? `.png @ ${scale}\u00d7` : ".tex"}
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function SVGOptions({ figure, onChange }) {
  return (
    <div className="studio-pane">
      <PaneHeading title="Vector publication SVG"
        copy="Self-contained, scalable, ready for Nature / Distill / arXiv figures. Embeds fonts and styles so it renders standalone." />
      <TextInput label="Figure title" value={figure.title} onChange={(v) => onChange("title", v)} />
      <Textarea label="Caption" value={figure.caption} onChange={(v) => onChange("caption", v)}
        placeholder="Figure 1. ..." />
      <DisplayToggles figure={figure} onChange={onChange} />
    </div>
  );
}

function PNGOptions({ figure, onChange, scale, setScale }) {
  return (
    <div className="studio-pane">
      <PaneHeading title="Rasterized PNG"
        copy="Same diagram as the SVG export, rendered to a pixel grid for use in slide decks, posters, and emails." />
      <div className="scale-row">
        <span className="slider-row__label">Resolution</span>
        <div className="scale-pills">
          {[1, 2, 4].map((s) => (
            <button key={s}
              className={"scale-pill" + (s === scale ? " active" : "")}
              onClick={() => setScale(s)}>{s}{"\u00d7"}</button>
          ))}
        </div>
      </div>
      <div className="field__helper" style={{ paddingLeft: 0 }}>
        {scale === 1 && "Screen-ready (1x device pixels)."}
        {scale === 2 && "Retina / Hi-DPI displays. Recommended for slides."}
        {scale === 4 && "Print-quality. Use for posters and journals at \u2265 300 DPI."}
      </div>
      <div className="divider" />
      <TextInput label="Figure title" value={figure.title} onChange={(v) => onChange("title", v)} />
      <DisplayToggles figure={figure} onChange={onChange} />
    </div>
  );
}

function TikZOptions({ figure, onChange }) {
  return (
    <div className="studio-pane">
      <PaneHeading title="LaTeX / TikZ code"
        copy="Paste-ready TikZ picture. Requires \\usetikzlibrary{positioning,arrows.meta,shapes.geometric,fit,backgrounds}." />
      <div className="dialog__note" style={{ marginTop: 0 }}>
        <strong>Tip.</strong> The preview shows the exact code. Hit{" "}
        <em>Copy code</em> to send it straight to your editor, or{" "}
        <em>Download</em> for a <code>.tex</code> snippet.
      </div>
      <TextInput label="Figure title" value={figure.title} onChange={(v) => onChange("title", v)} />
      <DisplayToggles figure={figure} onChange={onChange} compact />
    </div>
  );
}

function PaneHeading({ title, copy }) {
  return (
    <div className="studio-pane-heading">
      <div className="studio-pane-heading__title">{title}</div>
      <div className="studio-pane-heading__copy">{copy}</div>
    </div>
  );
}

function DisplayToggles({ figure, onChange, compact }) {
  return (
    <div className={"toggle-stack" + (compact ? " compact" : "")}>
      <Toggle2 label="Neuron legend"      value={figure.showLegend}        onChange={(v) => onChange("showLegend", v)} />
      <Toggle2 label="Group outlines"     value={figure.showGroupOutline}  onChange={(v) => onChange("showGroupOutline", v)} />
      <Toggle2 label="Per-layer captions" value={figure.showLayerCaptions} onChange={(v) => onChange("showLayerCaptions", v)} />
      <Toggle2 label="Tensor shapes"      value={figure.showShapes}        onChange={(v) => onChange("showShapes", v)} />
      <Toggle2 label="Edge labels"        value={figure.showEdgeLabels}    onChange={(v) => onChange("showEdgeLabels", v)} />
    </div>
  );
}

function Toggle2({ label, value, onChange }) {
  return (
    <div className="toggle2" onClick={() => onChange(!value)}>
      <span className={"switch" + (value ? " on" : "")}>
        <span className="switch__knob" />
      </span>
      <span className="toggle2__label">{label}</span>
    </div>
  );
}

window.ExportStudio = ExportStudio;
