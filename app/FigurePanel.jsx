// app/FigurePanel.jsx — the "Figure" inspector tab: metadata, groups, annotations.

function FigurePanel({
  figure, onUpdateFigure,
  groups, onAddGroup, onUpdateGroup, onDeleteGroup,
  annotations, onAddAnnotation, onUpdateAnnotation, onDeleteAnnotation,
  layers,
  onAutoGroup,
  onWrapRows,
}) {
  const [collapsed, setCollapsed] = React.useState({ meta: false, opts: false, layout: false, groups: false, annot: true });
  const t = (k, v) => onUpdateFigure({ [k]: v });

  return (
    <>
      <div className="inspector__header">
        <h2>Figure</h2>
        <span className="overline">Title · Legend · Groups · Annotations</span>
      </div>
      <div className="inspector__body">

        {/* ---- Figure metadata ---- */}
        <Section label="Figure metadata" open={!collapsed.meta} onToggle={() => setCollapsed({ ...collapsed, meta: !collapsed.meta })}>
          <TextInput label="Title" value={figure.title}
            onChange={(v) => t("title", v)}
            helper="Bold title above the figure (optional)" />
          <Textarea label="Caption" value={figure.caption}
            placeholder="Figure 1. Caption text describing the architecture..."
            onChange={(v) => t("caption", v)} />
        </Section>

        {/* ---- Display options ---- */}
        <Section label="Display options" open={!collapsed.opts} onToggle={() => setCollapsed({ ...collapsed, opts: !collapsed.opts })}>
          <Toggle label="Show neuron legend"      value={figure.showLegend}         onChange={(v) => t("showLegend", v)}
            helper="Color/glyph key under the diagram" />
          <Toggle label="Show group outlines"     value={figure.showGroupOutline}   onChange={(v) => t("showGroupOutline", v)}
            helper="Dashed rounded rect around layer groups" />
          <Toggle label="Show per-layer captions" value={figure.showLayerCaptions}  onChange={(v) => t("showLayerCaptions", v)}
            helper="Units · activation · dropout under each box" />
          <Toggle label="Show tensor shapes"      value={figure.showShapes}         onChange={(v) => t("showShapes", v)}
            helper="Print channels × features under each layer" />
          <Toggle label="Show edge labels"        value={figure.showEdgeLabels}     onChange={(v) => t("showEdgeLabels", v)}
            helper="Tag each connection with its transform (Wx, conv1d, ...)" />
          <Toggle label="Show variable names"     value={figure.variableNames}      onChange={(v) => t("variableNames", v)}
            helper={"Label recurrent loops with h\u209C\u208B\u2081 etc."} />
        </Section>

        {/* ---- Layout (auto-arrange) ---- */}
        <Section
          label="Layout"
          open={!collapsed.layout}
          onToggle={() => setCollapsed({ ...collapsed, layout: !collapsed.layout })}
        >
          <div className="inspector__hint">
            Auto-arrange the current layers into a grid. Useful when a
            single-row diagram is too wide for the page.
          </div>
          <div className="layout-row">
            {[1, 2, 3].map((n) => (
              <button key={n} className="btn btn--outlined layout-row__btn"
                onClick={() => onWrapRows && onWrapRows(n)}
                disabled={layers.length === 0}
                title={`Snap layout to ${n} row${n === 1 ? "" : "s"}`}>
                {n} row{n === 1 ? "" : "s"}
              </button>
            ))}
          </div>
        </Section>

        {/* ---- Groups ---- */}
        <Section
          label={"Groups" + (groups.length ? "  ·  " + groups.length : "")}
          open={!collapsed.groups}
          onToggle={() => setCollapsed({ ...collapsed, groups: !collapsed.groups })}
          action={
            <button className="btn btn--text figpanel__small-btn"
              onClick={(e) => { e.stopPropagation(); onAutoGroup(); }}
              title="Detect groups by layer type">Auto</button>
          }
        >
          {groups.length === 0 && <div className="inspector__hint">No groups. Add one to wrap layers with a dashed outline.</div>}
          {groups.map((g) => (
            <GroupCard key={g.id} group={g} layers={layers} onUpdate={(u) => onUpdateGroup(g.id, u)} onDelete={() => onDeleteGroup(g.id)} />
          ))}
          <button className="btn btn--outlined btn--full" onClick={() => onAddGroup()}>
            <span style={{ fontSize: 18, lineHeight: 1, marginRight: 2 }}>+</span> Add group
          </button>
        </Section>

        {/* ---- Annotations ---- */}
        <Section
          label={"Annotations" + (annotations.length ? "  ·  " + annotations.length : "")}
          open={!collapsed.annot}
          onToggle={() => setCollapsed({ ...collapsed, annot: !collapsed.annot })}
        >
          {annotations.length === 0 && <div className="inspector__hint">Click a kind below to drop one near the top of the canvas.</div>}
          {annotations.map((a) => (
            <AnnotationCard key={a.id} annot={a} onUpdate={(u) => onUpdateAnnotation(a.id, u)} onDelete={() => onDeleteAnnotation(a.id)} />
          ))}
          <div className="annot-add">
            {window.ANNOTATION_KINDS.map((k) => (
              <button key={k.value} className="btn btn--outlined annot-add__btn"
                onClick={() => onAddAnnotation(k.value)}
                title={k.hint}>
                {k.label}
              </button>
            ))}
          </div>
        </Section>

      </div>
    </>
  );
}

// ---- small collapsible section --------------------------------------------
function Section({ label, open, onToggle, children, action }) {
  return (
    <div className="figpanel-section">
      <div className="figpanel-section__head" onClick={onToggle}>
        <span className={"figpanel-chevron" + (open ? " open" : "")}>›</span>
        <span className="figpanel-section__label">{label}</span>
        <span style={{ flex: 1 }} />
        {action}
      </div>
      {open && <div className="figpanel-section__body">{children}</div>}
    </div>
  );
}

// ---- toggle (checkbox row) ------------------------------------------------
function Toggle({ label, value, onChange, helper }) {
  return (
    <div className="toggle-row" onClick={() => onChange(!value)}>
      <span className="toggle-row__copy">
        <span className="toggle-row__label">{label}</span>
        {helper && <span className="toggle-row__helper">{helper}</span>}
      </span>
      <span className={"switch" + (value ? " on" : "")}>
        <span className="switch__knob" />
      </span>
    </div>
  );
}

// ---- group card -----------------------------------------------------------
function GroupCard({ group, layers, onUpdate, onDelete }) {
  const [open, setOpen] = React.useState(false);
  const palette = window.GROUP_PALETTE;
  const memberCount = group.layerIds.length;
  return (
    <div className="group-card" style={{ borderLeftColor: paletteStroke(group.paletteId) }}>
      <div className="group-card__row">
        <input
          className="group-card__name"
          value={group.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
        />
        <span className="group-card__count">{memberCount} layer{memberCount === 1 ? "" : "s"}</span>
        <button className="conn-item__icon-btn" onClick={() => setOpen(!open)} title="Edit members">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={open ? "m6 9 6 6 6-6" : "m9 18 6-6-6-6"}/></svg>
        </button>
        <button className="conn-item__icon-btn" onClick={onDelete} title="Delete group">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
      {open && (
        <div className="group-card__body">
          <div className="palette-row">
            {palette.map((p) => (
              <button key={p.id}
                className={"palette-chip" + (p.id === group.paletteId ? " selected" : "")}
                style={{ background: p.fill, borderColor: p.stroke, color: p.stroke }}
                onClick={() => onUpdate({ paletteId: p.id })}
                title={p.id}
              >
                <span style={{ background: p.stroke }} />
              </button>
            ))}
          </div>
          <div className="group-card__members-title">Members</div>
          <div className="group-card__members">
            {layers.map((l) => {
              const checked = group.layerIds.includes(l.id);
              return (
                <label key={l.id} className={"member-row" + (checked ? " checked" : "")}>
                  <input type="checkbox" checked={checked}
                    onChange={(e) => {
                      const ids = e.target.checked
                        ? [...group.layerIds, l.id]
                        : group.layerIds.filter((x) => x !== l.id);
                      onUpdate({ layerIds: ids });
                    }} />
                  <span>{l.name}</span>
                  <span className="member-row__type">{l.type}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function paletteStroke(id) {
  const p = window.GROUP_PALETTE.find((x) => x.id === id);
  return p ? p.stroke : "#1d4ed8";
}

// ---- annotation card ------------------------------------------------------
function AnnotationCard({ annot, onUpdate, onDelete }) {
  const kindLabel = (window.ANNOTATION_KINDS.find((k) => k.value === annot.kind) || {}).label || annot.kind;
  return (
    <div className="annot-card">
      <div className="annot-card__row">
        <span className="annot-card__kind">{kindLabel}</span>
        <input
          className="annot-card__text"
          value={annot.text ?? annot.label ?? ""}
          placeholder={annot.kind === "text" ? "x\u209C" : annot.kind === "bracket" ? "Encoder" : "label"}
          onChange={(e) => {
            const key = annot.kind === "text" ? "text" : "label";
            onUpdate({ [key]: e.target.value });
          }}
        />
        <button className="conn-item__icon-btn" onClick={onDelete} title="Delete">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
      <div className="annot-card__hint">
        {annot.kind === "text" && "Drag the label on the canvas to position it."}
        {annot.kind === "arrow" && "Drag either endpoint on the canvas."}
        {annot.kind === "bracket" && (
          <span>
            Drag endpoints on the canvas.{" "}
            <button className="annot-card__flip" onClick={() => onUpdate({ flip: !annot.flip })}>
              {annot.flip ? "Flip up" : "Flip down"}
            </button>
          </span>
        )}
      </div>
    </div>
  );
}

window.FigurePanel = FigurePanel;
