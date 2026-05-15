// ui_kits/designer/data.js — layer templates + helpers + seed network

window.LAYER_TEMPLATES = [
  {
    type: "input",
    icon: "design-system/assets/icons/layer-types/input.svg",
    label: "Input",
    description: "Data input layer",
    defaultConfig: {
      units: 1,
      activation: "Linear",
      neuronType: "linear",
      inputConfig: {
        sampleRate: 1000,
        windowWidth: 100,
        stride: 50,
        dataStructure: "Channels x Features",
        channels: 1,
        features: 64,
      },
    },
  },
  {
    type: "mlp",
    icon: "design-system/assets/icons/layer-types/mlp.svg",
    label: "MLP",
    description: "Multi-layer perceptron",
    defaultConfig: { units: 128, activation: "ReLU", neuronType: "relu", dropout: 0.2 },
  },
  {
    type: "rnn",
    icon: "design-system/assets/icons/layer-types/rnn.svg",
    label: "RNN",
    description: "Recurrent neural network",
    defaultConfig: {
      units: 64, activation: "Tanh", neuronType: "tanh", returnSequences: true, bidirectional: false,
      predictionHorizon: 1, contextWindows: 64, forecastMode: "direct",
    },
  },
  {
    type: "lstm",
    icon: "design-system/assets/icons/layer-types/lstm.svg",
    label: "LSTM",
    description: "Long short-term memory",
    defaultConfig: {
      units: 128, activation: "Tanh", neuronType: "lstm-cell", returnSequences: true, bidirectional: false,
      predictionHorizon: 1, contextWindows: 64, forecastMode: "direct",
    },
  },
  {
    type: "gru",
    icon: "design-system/assets/icons/layer-types/gru.svg",
    label: "GRU",
    description: "Gated recurrent unit",
    defaultConfig: {
      units: 128, activation: "Tanh", neuronType: "gru-cell", returnSequences: true, bidirectional: false,
      predictionHorizon: 1, contextWindows: 64, forecastMode: "direct",
    },
  },
  {
    type: "cnn",
    icon: "design-system/assets/icons/layer-types/cnn.svg",
    label: "CNN",
    description: "Convolutional layer",
    defaultConfig: {
      numFilters: 32, kernelSize: 3, stride: 1, units: 32, activation: "ReLU", neuronType: "relu",
    },
  },
  {
    type: "transformer",
    icon: "design-system/assets/icons/layer-types/transformer.svg",
    label: "Transformer",
    description: "Self-attention layer",
    defaultConfig: {
      numHeads: 8, embeddingDim: 512, units: 512, activation: "GELU", neuronType: "gated",
    },
  },
  {
    type: "concat",
    icon: "design-system/assets/icons/layer-types/concat.svg",
    label: "Concat",
    description: "Tensor concatenation",
    defaultConfig: {
      units: 64, activation: "Linear", neuronType: "concat",
    },
  },
  {
    type: "output",
    icon: "design-system/assets/icons/layer-types/output.svg",
    label: "Output",
    description: "Network output",
    defaultConfig: {
      units: 10, activation: "Softmax", neuronType: "sigmoid",
      outputConfig: {
        outputType: "probabilities", channels: 1, numClasses: 10, outputStructure: "Channels x Features",
      },
    },
  },
];

window.NEURON_VIS = {
  sigmoid:    { color: "#fbbf24", symbol: "σ", glyphFont: "math" },
  tanh:       { color: "#f59e0b", symbol: "φ", glyphFont: "math" },
  relu:       { color: "#3b82f6", symbol: "R", glyphFont: "ui" },
  gated:      { color: "#8b5cf6", symbol: "⊗", glyphFont: "math" },
  "lstm-cell":{ color: "#ec4899", symbol: "L", glyphFont: "ui" },
  "gru-cell": { color: "#06b6d4", symbol: "G", glyphFont: "ui" },
  linear:     { color: "#6b7280", symbol: "",  glyphFont: "ui" },
  concat:     { color: "#4b5563", symbol: "⊕", glyphFont: "math" },
};

window.ACTIVATIONS = ["ReLU","Sigmoid","Tanh","Softmax","Linear","LeakyReLU","ELU","GELU","Swish"];
window.NEURON_TYPES = [
  { value: "linear",    label: "Linear",         description: "No activation" },
  { value: "sigmoid",   label: "Sigmoid (σ)",    description: "Logistic activation" },
  { value: "tanh",      label: "Tanh (φ)",       description: "Hyperbolic tangent" },
  { value: "relu",      label: "ReLU (R)",       description: "Rectified linear unit" },
  { value: "gated",     label: "Gated (⊗)",      description: "Multiplicative gate" },
  { value: "lstm-cell", label: "LSTM Cell (L)",  description: "LSTM memory cell" },
  { value: "gru-cell",  label: "GRU Cell (G)",   description: "GRU update cell" },
  { value: "concat",    label: "Concat (⊕)",     description: "Tensor concatenation" },
];
window.DATA_STRUCTURES = [
  "Channels x Features",
  "Features x Channels",
  "Channels x Features x Window",
  "Features x Channels x Window",
  "Channels*Features x 1",
  "Batch x Channels x Features",
];
window.OUTPUT_TYPES = [
  { value: "probabilities",      label: "Probabilities (Softmax)" },
  { value: "logits",             label: "Logits (Pre-activation)" },
  { value: "categories",         label: "Categories (Classification)" },
  { value: "regression",         label: "Regression (Continuous)" },
  { value: "future-predictions", label: "Future Predictions (Temporal)" },
];

// ---- Connection-level configuration options ----
window.CONNECTIVITIES = [
  { value: "full",   label: "Fully connected",  description: "Every source neuron connects to every target neuron" },
  { value: "sparse", label: "Sparse",           description: "Random subset of connections kept" },
  { value: "dense",  label: "Dense (local)",    description: "Local receptive field; dense within window" },
];

window.TRANSFORMS = [
  { value: "none",    label: "None (pass-through)",      description: "No learnable parameters on this edge" },
  { value: "linear",  label: "Linear (Wx)",              description: "Multiply by a learnable matrix" },
  { value: "affine",  label: "Affine (Wx + b)",          description: "Linear plus bias" },
  { value: "conv1d",  label: "1D Convolution",           description: "Temporal kernel applied along the edge" },
  { value: "maxpool", label: "Max pooling",              description: "Downsample by taking the maximum" },
  { value: "avgpool", label: "Average pooling",          description: "Downsample by averaging" },
  { value: "norm",    label: "Layer normalization",      description: "Normalize the activations" },
];

window.WEIGHT_INITS = [
  { value: "xavier",  label: "Xavier / Glorot" },
  { value: "he",      label: "He (Kaiming)" },
  { value: "normal",  label: "Normal (\u03bc=0, \u03c3=0.02)" },
  { value: "uniform", label: "Uniform" },
  { value: "zeros",   label: "Zeros" },
];

window.defaultConnection = (fromLayerId, toLayerId, type) => ({
  id: window.uid(),
  fromLayerId,
  toLayerId,
  type: type || (fromLayerId === toLayerId ? "recurrent" : "forward"),
  connectivity: "full",
  sparsity: 0.5,
  dropout: 0,
  transform: "none",
  transformDim: 0,
  weightInit: "xavier",
  annotation: "",
});

// Seed network: an Input → LSTM → MLP → Output stack so the kit looks alive.
window.SEED_NETWORK = {
  layers: [
    {
      id: "l1", name: "Input", type: "input", units: 64, activation: "Linear", neuronType: "linear",
      position: { x: 80, y: 110 }, dropout: 0,
      inputConfig: { sampleRate: 1000, windowWidth: 100, stride: 50, dataStructure: "Channels x Features", channels: 1, features: 64 },
    },
    {
      id: "l2", name: "LSTM 1", type: "lstm", units: 128, activation: "Tanh", neuronType: "lstm-cell",
      position: { x: 260, y: 110 }, dropout: 0.1,
      returnSequences: true, bidirectional: false,
    },
    {
      id: "l3", name: "Dense", type: "mlp", units: 64, activation: "ReLU", neuronType: "relu",
      position: { x: 440, y: 110 }, dropout: 0.2,
    },
    {
      id: "l4", name: "Output", type: "output", units: 10, activation: "Softmax", neuronType: "sigmoid",
      position: { x: 620, y: 110 }, dropout: 0,
      outputConfig: { outputType: "probabilities", channels: 1, numClasses: 10, outputStructure: "Channels x Features" },
    },
  ],
  connections: [
    { id: "c1", fromLayerId: "l1", toLayerId: "l2", type: "forward" },
    { id: "c2", fromLayerId: "l2", toLayerId: "l3", type: "forward" },
    { id: "c3", fromLayerId: "l3", toLayerId: "l4", type: "forward" },
    { id: "c4", fromLayerId: "l2", toLayerId: "l2", type: "recurrent" },
  ],
};

window.uid = () => Math.random().toString(36).slice(2, 9);

// ---- Schematic geometry (matches NetworkCanvas.tsx constants)
window.SCHEMATIC = {
  NEURON_RADIUS: 18,
  NEURON_SPACING: 60,
  MAX_VISIBLE_NEURONS: 3,
  LAYER_WIDTH: 80,
  LAYER_PADDING: 20,
};

// Helpers: compute how many caption lines and how much vertical space sits
// *below* a layer's box.  Both the live canvas and the SVG export need the
// same numbers so the group's dashed outline tightly hugs the captions and
// any inline sub-label.
window.getLayerCaptionCount = (layer, figure) => {
  if (!figure || !figure.showLayerCaptions) return 0;
  let n = 1;  // primary line: "N units" / "N-dim"
  const isConcat = layer.type === "concat";
  if (layer.activation && layer.activation !== "Linear" && !isConcat) n++;
  else if (layer.dropout && layer.dropout > 0) n++;
  if (figure.showShapes && window.layerShapeSummary) {
    const s = window.layerShapeSummary(layer);
    if (s) n++;
  }
  if (layer.annotation && String(layer.annotation).trim().length > 0) n++;
  return n;
};

window.getLayerFooterHeight = (layer, figure) => {
  const n = window.getLayerCaptionCount(layer, figure);
  if (n === 0) return 0;
  return 16 + n * 14 + 6;     // 16 = gap below box, 14 per line, 6 = padding
};

// Vertical clearance a recurrent self-loop needs above its layer.
// Matches the arc geometry in renderConnections / ConnectionArrow.
window.RECURRENT_ARC_HEIGHT = 64;

window.layerHasRecurrentLoop = (layer, connections) =>
  !!(connections || []).find((c) => c.fromLayerId === layer.id && c.toLayerId === layer.id && c.type === "recurrent");

window.getLayerHeight = (layer) => {
  const { NEURON_SPACING, MAX_VISIBLE_NEURONS, LAYER_PADDING } = window.SCHEMATIC;
  const visible = window.getVisibleNeuronCount(layer);
  return visible * NEURON_SPACING + LAYER_PADDING * 2;
};

// Concat-style merge nodes render as a single neuron regardless of width.
window.getVisibleNeuronCount = (layer) => {
  if (layer.type === "concat") return 1;
  return Math.min(layer.units, window.SCHEMATIC.MAX_VISIBLE_NEURONS + 1);
};
