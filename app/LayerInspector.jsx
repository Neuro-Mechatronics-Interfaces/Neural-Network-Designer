// ui_kits/designer/LayerInspector.jsx
function durationLabel(samples, hz) {
  const ms = (samples / hz) * 1000;
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${ms.toFixed(2)} ms`;
}

function InputConfigTab({ layer, onUpdate }) {
  const c = layer.inputConfig || {};
  const set = (u) => onUpdate({ inputConfig: { ...c, ...u } });
  return (
    <>
      <div className="overline" style={{ color: "var(--fg-1)", fontWeight: 500, letterSpacing: 0 }}>Input Configuration</div>
      <TextInput type="number" label="Sample Rate (Hz)" value={c.sampleRate}
        onChange={(v) => set({ sampleRate: v })}
        helper="Sampling frequency of input data" />
      <TextInput type="number" label="Window Width (samples)" value={c.windowWidth}
        onChange={(v) => set({ windowWidth: v })}
        helper={"Duration: " + durationLabel(c.windowWidth, c.sampleRate)} />
      <TextInput type="number" label="Stride (samples)" value={c.stride}
        onChange={(v) => set({ stride: v })}
        helper={"Step size: " + durationLabel(c.stride, c.sampleRate)} />
      <div className="divider"></div>
      <TextInput type="number" label="Channels" value={c.channels} onChange={(v) => set({ channels: v })} />
      <TextInput type="number" label="Features" value={c.features} onChange={(v) => set({ features: v })} />
      <Select label="Data Structure" value={c.dataStructure} options={window.DATA_STRUCTURES}
        onChange={(v) => set({ dataStructure: v })} />
      <div className="summary-card">
        <div className="summary-card__title">Input Shape Summary:</div>
        <div className="summary-card__row">• Channels: {c.channels}</div>
        <div className="summary-card__row">• Features: {c.features}</div>
        <div className="summary-card__row">• Window: {c.windowWidth} samples ({durationLabel(c.windowWidth, c.sampleRate)})</div>
        <div className="summary-card__row">• Structure: {c.dataStructure}</div>
      </div>
    </>
  );
}

function OutputConfigTab({ layer, onUpdate }) {
  const c = layer.outputConfig || {};
  const set = (u) => onUpdate({ outputConfig: { ...c, ...u } });
  return (
    <>
      <div className="overline" style={{ color: "var(--fg-1)", fontWeight: 500, letterSpacing: 0 }}>Output Configuration</div>
      <Select label="Output Type" value={c.outputType}
        options={window.OUTPUT_TYPES}
        onChange={(v) => set({ outputType: v })} />
      <TextInput type="number" label="Output Channels" value={c.channels} onChange={(v) => set({ channels: v })}
        helper="Number of output channels/streams" />
      {(c.outputType === "probabilities" || c.outputType === "logits" || c.outputType === "categories") && (
        <TextInput type="number" label="Number of Classes" value={c.numClasses}
          onChange={(v) => set({ numClasses: v })} helper="Number of classification categories" />
      )}
      {c.outputType === "future-predictions" && (
        <TextInput type="number" label="Future Samples" value={c.futureSamples || 10}
          onChange={(v) => set({ futureSamples: v })} helper="Number of time steps to predict ahead" />
      )}
      <div className="divider"></div>
      <Select label="Output Structure" value={c.outputStructure} options={window.DATA_STRUCTURES}
        onChange={(v) => set({ outputStructure: v })} />
      <div className="summary-card">
        <div className="summary-card__title">Output Shape Summary:</div>
        <div className="summary-card__row">• Type: {(window.OUTPUT_TYPES.find(t => t.value === c.outputType) || {}).label}</div>
        <div className="summary-card__row">• Channels: {c.channels}</div>
        {c.numClasses ? <div className="summary-card__row">• Classes: {c.numClasses}</div> : null}
        <div className="summary-card__row">• Structure: {c.outputStructure}</div>
      </div>
    </>
  );
}

function RecurrentTab({ layer, onUpdate }) {
  return (
    <>
      <Select
        label="Return Sequences"
        value={layer.returnSequences ? "true" : "false"}
        onChange={(v) => onUpdate({ returnSequences: v === "true" })}
        options={[
          { value: "true",  label: "Yes — Return full sequence" },
          { value: "false", label: "No — Return last output only" },
        ]}
      />
      <Select
        label="Bidirectional"
        value={layer.bidirectional ? "true" : "false"}
        onChange={(v) => onUpdate({ bidirectional: v === "true" })}
        options={[
          { value: "true",  label: "Yes — Forward and backward" },
          { value: "false", label: "No — Forward only" },
        ]}
      />
      <div className="divider"></div>
      <div className="overline" style={{ color: "var(--fg-1)", fontWeight: 500, letterSpacing: 0 }}>Forecast horizon</div>
      <Select
        label="Forecast Mode"
        value={layer.forecastMode || "direct"}
        onChange={(v) => onUpdate({ forecastMode: v })}
        options={[
          { value: "direct",    label: "Direct — single H-step output" },
          { value: "recursive", label: "Recursive — 1-step trained, rolled out" },
        ]}
        helper="How the network produces multi-step predictions"
      />
      <TextInput type="number" label="Prediction Horizon (windows)" value={layer.predictionHorizon || 1}
        onChange={(v) => onUpdate({ predictionHorizon: v })}
        helper={"H steps ahead" + (layer.predictionHorizon ? "  ·  rollout produces (H+1) windows" : "")} />
      <TextInput type="number" label="Recursive Context (windows)" value={layer.contextWindows || 64}
        onChange={(v) => onUpdate({ contextWindows: v })}
        helper="Past windows kept in the rolling buffer" />
    </>
  );
}

function ConvolutionTab({ layer, onUpdate }) {
  return (
    <>
      <TextInput type="number" label="Number of Filters" value={layer.numFilters || 32} onChange={(v) => onUpdate({ numFilters: v, units: v })} />
      <TextInput type="number" label="Kernel Size" value={layer.kernelSize || 3} onChange={(v) => onUpdate({ kernelSize: v })} />
      <TextInput type="number" label="Stride" value={layer.stride || 1} onChange={(v) => onUpdate({ stride: v })} />
    </>
  );
}

function AttentionTab({ layer, onUpdate }) {
  return (
    <>
      <TextInput type="number" label="Number of Attention Heads" value={layer.numHeads || 8} onChange={(v) => onUpdate({ numHeads: v })} />
      <TextInput type="number" label="Embedding Dimension" value={layer.embeddingDim || 512} onChange={(v) => onUpdate({ embeddingDim: v, units: v })} />
    </>
  );
}

function GeneralTab({ layer, onUpdate }) {
  return (
    <>
      <TextInput label="Layer Name" value={layer.name} onChange={(v) => onUpdate({ name: v })} />
      <Slider label="Units" value={layer.units} min={1} max={2048} step={1} onChange={(v) => onUpdate({ units: v })} />
      <Select label="Neuron Type" value={layer.neuronType}
        options={window.NEURON_TYPES}
        onChange={(v) => onUpdate({ neuronType: v })} />
      {layer.type !== "input" && layer.type !== "output" && layer.type !== "concat" && (
        <>
          <Select label="Activation Function" value={layer.activation}
            options={window.ACTIVATIONS}
            onChange={(v) => onUpdate({ activation: v })} />
          <Slider label="Dropout" value={layer.dropout || 0} min={0} max={0.9} step={0.05}
            onChange={(v) => onUpdate({ dropout: v })}
            format={(v) => v.toFixed(2)} />
        </>
      )}
      <div className="divider"></div>
      <TextInput label="Sub-label" value={layer.annotation}
        onChange={(v) => onUpdate({ annotation: v })}
        helper="Short text shown under the layer in the figure (e.g. H = 10, ctx = 64)" />
    </>
  );
}

function LayerInspector({ layer, onUpdate, onDelete }) {
  const [tab, setTab] = React.useState(0);
  React.useEffect(() => { setTab(0); }, [layer && layer.id]);

  if (!layer) {
    return (
      <div className="inspector__empty">
        Drag a layer type from the sidebar to start building
      </div>
    );
  }

  const showInput  = layer.type === "input";
  const showOutput = layer.type === "output";
  const showRec    = layer.type === "rnn" || layer.type === "lstm" || layer.type === "gru";
  const showConv   = layer.type === "cnn";
  const showAttn   = layer.type === "transformer";

  return (
    <>
      <div className="inspector__header">
        <h2>{layer.name}</h2>
        <span className="overline">{layer.type.toUpperCase()} LAYER</span>
        <div className="tabs">
          <button className={"tabs__tab" + (tab === 0 ? " active" : "")} onClick={() => setTab(0)}>General</button>
          {showInput  && <button className={"tabs__tab" + (tab === 1 ? " active" : "")} onClick={() => setTab(1)}>Input Config</button>}
          {showOutput && <button className={"tabs__tab" + (tab === 1 ? " active" : "")} onClick={() => setTab(1)}>Output Config</button>}
          {showRec    && <button className={"tabs__tab" + (tab === 1 ? " active" : "")} onClick={() => setTab(1)}>Recurrent</button>}
          {showConv   && <button className={"tabs__tab" + (tab === 1 ? " active" : "")} onClick={() => setTab(1)}>Convolution</button>}
          {showAttn   && <button className={"tabs__tab" + (tab === 1 ? " active" : "")} onClick={() => setTab(1)}>Attention</button>}
        </div>
      </div>
      <div className="inspector__body">
        {tab === 0 && <GeneralTab layer={layer} onUpdate={onUpdate} />}
        {tab === 1 && showInput  && <InputConfigTab layer={layer} onUpdate={onUpdate} />}
        {tab === 1 && showOutput && <OutputConfigTab layer={layer} onUpdate={onUpdate} />}
        {tab === 1 && showRec    && <RecurrentTab layer={layer} onUpdate={onUpdate} />}
        {tab === 1 && showConv   && <ConvolutionTab layer={layer} onUpdate={onUpdate} />}
        {tab === 1 && showAttn   && <AttentionTab layer={layer} onUpdate={onUpdate} />}
      </div>
      <div className="inspector__footer">
        <button className="btn btn--danger btn--full" onClick={onDelete}>Delete Layer</button>
      </div>
    </>
  );
}

window.LayerInspector = LayerInspector;
