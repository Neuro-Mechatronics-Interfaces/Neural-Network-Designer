// ui_kits/designer/Fields.jsx — small form primitives used in the inspector

function Field({ label, helper, children }) {
  return (
    <div>
      <div className="field">
        {children}
        <label>{label}</label>
      </div>
      {helper && <div className="field__helper">{helper}</div>}
    </div>
  );
}

function TextInput({ value, onChange, label, helper, type = "text" }) {
  return (
    <Field label={label} helper={helper}>
      <input type={type} value={value ?? ""} onChange={(e) => onChange(type === "number" ? parseFloat(e.target.value) : e.target.value)} />
    </Field>
  );
}

function Select({ value, onChange, options, label, helper }) {
  return (
    <Field label={label} helper={helper}>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          typeof o === "string"
            ? <option key={o} value={o}>{o}</option>
            : <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </Field>
  );
}

function Slider({ value, onChange, min, max, step, label, format, decimals }) {
  // Coupled slider + number input: drag the handle OR type a value.
  // Editing the number live-clamps; blurring re-formats.
  const dec = typeof decimals === "number"
    ? decimals
    : (step && step < 1 ? 2 : 0);

  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(String(value));
  React.useEffect(() => { if (!editing) setDraft(Number(value).toFixed(dec)); }, [value, editing, dec]);

  const clamp = (v) => Math.min(max, Math.max(min, v));

  const commitDraft = () => {
    const v = parseFloat(draft);
    if (Number.isFinite(v)) onChange(clamp(v));
    else setDraft(Number(value).toFixed(dec));
    setEditing(false);
  };

  return (
    <div className="slider-row">
      <div className="slider-row__top">
        <span className="slider-row__label">{label}</span>
        <input
          className="slider-row__num"
          type="number"
          min={min} max={max} step={step}
          value={editing ? draft : Number(value).toFixed(dec)}
          onFocus={() => setEditing(true)}
          onChange={(e) => {
            setDraft(e.target.value);
            const v = parseFloat(e.target.value);
            if (Number.isFinite(v)) onChange(clamp(v));
          }}
          onBlur={commitDraft}
          onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
        />
      </div>
      <input
        className="slider"
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
      {format && <div className="slider-row__hint">{format(value)}</div>}
    </div>
  );
}

function Textarea({ value, onChange, label, placeholder }) {
  return (
    <div>
      <div className="field">
        <textarea value={value ?? ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
        <label>{label}</label>
      </div>
    </div>
  );
}

Object.assign(window, { Field, TextInput, Select, Slider, Textarea });
