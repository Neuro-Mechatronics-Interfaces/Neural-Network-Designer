// ui_kits/designer/LayerTemplatesSidebar.jsx
function TemplateCard({ template, onDragStart, onDragEnd, isDragging }) {
  return (
    <div
      className={"template-card" + (isDragging ? " dragging" : "")}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("application/x-layer-template", template.type);
        e.dataTransfer.effectAllowed = "copy";
        onDragStart(template);
      }}
      onDragEnd={onDragEnd}
    >
      <div className="template-card__icon">
        <img src={template.icon} alt="" />
      </div>
      <div className="template-card__label">{template.label}</div>
      <div className="template-card__desc">{template.description}</div>
    </div>
  );
}

function LayerTemplatesSidebar({ onDragStart, onDragEnd, draggingType }) {
  return (
    <aside className="sidebar-left">
      <h2 className="sidebar-left__title">Layer Types</h2>
      <div className="template-list">
        {window.LAYER_TEMPLATES.map((t) => (
          <TemplateCard
            key={t.type}
            template={t}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            isDragging={draggingType === t.type}
          />
        ))}
      </div>
    </aside>
  );
}

window.LayerTemplatesSidebar = LayerTemplatesSidebar;
