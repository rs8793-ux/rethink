/**
 * Three.js is loaded dynamically so UI + microphone still run if CDN is slow/blocked.
 * Static `import` at the top would prevent the whole module (and bootstrap) from running.
 */
let THREE = null;
let OrbitControls = null;

const THREE_URLS = [
  "https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js",
  "https://unpkg.com/three@0.161.0/build/three.module.js",
];
const ORBIT_URLS = [
  "https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/controls/OrbitControls.js",
  "https://unpkg.com/three@0.161.0/examples/jsm/controls/OrbitControls.js",
];

async function loadThreeFrom(urls, label) {
  let lastErr;
  for (const url of urls) {
    try {
      return await import(/* @vite-ignore */ url);
    } catch (e) {
      lastErr = e;
      console.warn(`[Three] ${label} failed from ${url}`, e);
    }
  }
  throw lastErr || new Error(`All ${label} URLs failed`);
}

async function loadThreeModules() {
  if (THREE && OrbitControls) return;
  THREE = await loadThreeFrom(THREE_URLS, "core");
  try {
    const orbitMod = await loadThreeFrom(ORBIT_URLS, "OrbitControls");
    OrbitControls = orbitMod.OrbitControls;
  } catch (e1) {
    console.warn("[Three] OrbitControls failed (often missing import map for 'three'). Trying esm.sh…", e1);
    const orbitMod = await import("https://esm.sh/three@0.161.0/examples/jsm/controls/OrbitControls.js");
    OrbitControls = orbitMod.OrbitControls;
  }
}

const MAX_RECORD_MS = 20_000;

/** Filled in bootstrap() after DOM is ready. */
const ui = {};

const RECORDING_PROMPTS = [
  "Introduce yourself in 10 seconds",
  "What are you feeling right now?",
  "What is something that has been stressing you lately?",
  "Describe your day in one sentence",
  "Say something you normally would not say out loud",
  "Name one thing you are grateful for today",
  "What sound does your mood make?",
  "Whisper a secret to the microphone",
  "Finish the sentence: “Right now I need…”",
];

const FORM_LABELS = {
  tube: "Smooth flow",
  spiky: "Spiky resonance",
  hollow: "Glass shell",
  boxy: "Stacked blocks",
  ribbon: "Ribbon wave",
};

function escapeHtml(text) {
  const d = document.createElement("div");
  d.textContent = text;
  return d.innerHTML;
}

function renderRecordingPrompts() {
  const el = ui.recordingPrompts;
  if (!el) return;
  const pool = [...RECORDING_PROMPTS];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const pick = pool.slice(0, 3);
  el.innerHTML = pick.map((p) => `<div class="prompt-card">${escapeHtml(p)}</div>`).join("");
}

function cacheDomRefs() {
  Object.assign(ui, {
    recordingPrompts: document.getElementById("recordingPrompts"),
    controlsRoot: document.getElementById("controlsRoot"),
    enableMicBtn: document.getElementById("enableMicBtn"),
    startBtn: document.getElementById("startBtn"),
    stopBtn: document.getElementById("stopBtn"),
    generateBtn: document.getElementById("generateBtn"),
    resetBtn: document.getElementById("resetBtn"),
    statusText: document.getElementById("statusText"),
    avgVolume: document.getElementById("avgVolume"),
    domFreq: document.getElementById("domFreq"),
    dynRange: document.getElementById("dynRange"),
    frameCount: document.getElementById("frameCount"),
    canvasContainer: document.getElementById("canvasContainer"),
    tooltip: document.getElementById("tooltip"),
    resetModal: document.getElementById("resetModal"),
    resetNameInput: document.getElementById("resetNameInput"),
    resetModalCancel: document.getElementById("resetModalCancel"),
    resetModalConfirm: document.getElementById("resetModalConfirm"),
  });
}

const state = {
  micReady: false,
  audioStarting: false,
  recording: false,
  frames: [],
  draft: null,
};

const audio = {
  ctx: null,
  analyser: null,
  freqData: null,
  timeData: null,
  stream: null,
  raf: 0,
  timer: 0,
};

const sceneState = {
  scene: null,
  camera: null,
  renderer: null,
  controls: null,
  boardGroup: null,
  draftMesh: null,
  particles: null,
  raycaster: null,
  mouse: null,
  hovered: null,
  clock: null,
  intro: 0,
  driftPhase: Math.random() * Math.PI * 2,
  /** Archived voice sculptures floating on the share board */
  sharedBoard: new Map(),
};

/** Persisted gallery entries (localStorage). */
const GALLERY_STORAGE_KEY = "soundWaveFrozen_gallery_v1";

function cloneFeaturesForStorage(features) {
  return JSON.parse(JSON.stringify(features));
}

async function bootstrap() {
  cacheDomRefs();

  const missing = ["startBtn", "canvasContainer", "statusText", "controlsRoot"].filter((k) => !ui[k]);
  if (!ui.enableMicBtn) {
    console.warn("[bootstrap] No #enableMicBtn — use Start Recording to request mic in one step.");
  }
  if (missing.length) {
    console.error("[bootstrap] Missing DOM nodes:", missing.join(", "));
  }

  bindUI();
  renderRecordingPrompts();
  setStatus("Tap “Enable Microphone”, allow access, then Start Recording.");
  updateButtons();

  try {
    await loadThreeModules();
    initThree();
    loadSharedBoardFromStorage();
  } catch (err) {
    console.error("[Three.js] load/init failed:", err);
    setStatus(
      "3D library could not load (network / ad blocker). Microphone buttons below should still work — try again or allow cdn.jsdelivr.net."
    );
  }

  animate();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => void bootstrap(), { once: true });
} else {
  void bootstrap();
}

// One delegated listener on the control bar — works even if individual bindings fail.
function bindUI() {
  const root = ui.controlsRoot;
  if (root) {
    root.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn || btn.disabled) return;
      const { id } = btn;
      if (id === "enableMicBtn") void enableMicrophoneOnly();
      else if (id === "startBtn") void startRecording();
      else if (id === "stopBtn") stopRecording();
      else if (id === "generateBtn") generateDraftSculpture();
      else if (id === "resetBtn") openResetModal();
    });
  }

  ui.resetModalCancel?.addEventListener("click", closeResetModal);
  ui.resetModalConfirm?.addEventListener("click", () => confirmResetModal());
  ui.resetModal?.querySelector(".modal-backdrop")?.addEventListener("click", closeResetModal);
  ui.resetNameInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      confirmResetModal();
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && ui.resetModal && !ui.resetModal.classList.contains("hidden")) closeResetModal();
  });

  if (ui.canvasContainer) {
    ui.canvasContainer.addEventListener("pointermove", onPointerMove);
    ui.canvasContainer.addEventListener("pointerleave", onPointerLeave);
    ui.canvasContainer.addEventListener("click", onCanvasClick);
  }
}

// Microphone + AnalyserNode (call from a direct click/tap — required for permission + AudioContext).
async function ensureMicrophoneAndAnalyser() {
  if (state.micReady && audio.analyser && audio.ctx) {
    if (audio.ctx.state === "suspended") await audio.ctx.resume();
    return;
  }

  if (!window.isSecureContext) {
    throw new Error("INSECURE_CONTEXT");
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("NO_GET_USER_MEDIA");
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
    },
  });
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  analyser.smoothingTimeConstant = 0.72;
  source.connect(analyser);

  audio.ctx = ctx;
  audio.analyser = analyser;
  audio.stream = stream;
  audio.freqData = new Uint8Array(analyser.frequencyBinCount);
  audio.timeData = new Uint8Array(analyser.fftSize);

  if (ctx.state === "suspended") await ctx.resume();

  state.micReady = true;
}

/** Step 1: wired to #enableMicBtn — must run in direct response to user gesture. */
async function enableMicrophoneOnly() {
  if (state.micReady) {
    setStatus("Microphone is already enabled. Tap Start Recording.");
    return;
  }
  if (state.audioStarting) return;

  if (!window.isSecureContext) {
    setStatus("Microphone needs HTTPS or http://localhost. Do not open this page as file://.");
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    setStatus("This browser does not expose the microphone API here.");
    return;
  }

  state.audioStarting = true;
  updateButtons();
  setStatus("Requesting microphone permission…");
  try {
    await ensureMicrophoneAndAnalyser();
    setStatus("Microphone ready. Tap Start Recording.");
  } catch (err) {
    console.error("[mic]", err);
    if (err?.message === "INSECURE_CONTEXT") {
      setStatus("Use HTTPS or localhost — not file:// — for microphone access.");
    } else if (err?.message === "NO_GET_USER_MEDIA") {
      setStatus("getUserMedia is not available (try another browser or update).");
    } else if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
      setStatus("Microphone blocked. Click the lock icon in the address bar and allow microphone.");
    } else if (err?.name === "NotFoundError") {
      setStatus("No microphone found. Connect a mic and try again.");
    } else {
      setStatus(`Could not open microphone: ${err?.message || err?.name || "unknown error"}`);
    }
  } finally {
    state.audioStarting = false;
    updateButtons();
  }
}

async function startRecording() {
  if (state.recording || state.audioStarting) return;

  if (!state.micReady) {
    setStatus('Tap “Enable Microphone” first and allow access, then Start Recording.');
    return;
  }

  if (audio.ctx?.state === "suspended") {
    try {
      await audio.ctx.resume();
    } catch (e) {
      console.error(e);
    }
  }

  state.recording = true;
  state.frames = [];
  state.draft = null;
  clearDraftMesh();
  ui.recordingPrompts?.classList.add("is-recording");
  setStatus("Recording…");
  updateButtons();

  audio.timer = window.setTimeout(() => {
    if (state.recording) stopRecording();
  }, MAX_RECORD_MS);
  collectFrame();
}

function collectFrame() {
  if (!state.recording) return;
  audio.analyser.getByteFrequencyData(audio.freqData);
  audio.analyser.getByteTimeDomainData(audio.timeData);

  let sum = 0;
  let maxAmp = 0;
  let maxBin = 0;
  let wSum = 0;
  for (let i = 0; i < audio.freqData.length; i += 1) {
    const v = audio.freqData[i] / 255;
    sum += v;
    if (v > maxAmp) {
      maxAmp = v;
      maxBin = i;
    }
    wSum += i * v;
  }

  const wave = new Float32Array(audio.timeData.length);
  let waveVar = 0;
  for (let i = 0; i < audio.timeData.length; i += 1) {
    const n = (audio.timeData[i] - 128) / 128;
    wave[i] = n;
    waveVar += Math.abs(n);
  }
  waveVar /= audio.timeData.length;

  const frame = {
    volume: sum / audio.freqData.length,
    dominantBin: maxBin,
    centroidNorm: sum > 0 ? (wSum / sum) / audio.freqData.length : 0,
    waveVar,
    freq: Float32Array.from(audio.freqData, (v) => v / 255),
    wave,
  };
  state.frames.push(frame);
  if (ui.frameCount) ui.frameCount.textContent = String(state.frames.length);
  audio.raf = requestAnimationFrame(collectFrame);
}

function stopRecording() {
  if (!state.recording) return;
  state.recording = false;
  cancelAnimationFrame(audio.raf);
  clearTimeout(audio.timer);
  ui.recordingPrompts?.classList.remove("is-recording");
  renderRecordingPrompts();
  if (state.frames.length < 3) {
    setStatus("No meaningful audio captured. Try recording again.");
  } else {
    setStatus("Recording finished. Tap Generate Sculpture.");
  }
  updateButtons();
}

/** Deterministic RNG from a voice fingerprint — same recording → same shape; different voice → very different path. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function computeVoiceSeed(frames, m) {
  let h = 2166136261 >>> 0;
  const mix = (v) => {
    h ^= v >>> 0;
    h = Math.imul(h, 16777619) >>> 0;
  };
  mix(frames.length);
  mix((m.spectralCentroid * 1e6) | 0);
  mix((m.dynamicRange * 1e6) | 0);
  mix((m.avgVolume * 1e6) | 0);
  mix(m.dominantFreq | 0);
  mix((m.spectralSpread * 1e6) | 0);
  mix((m.temporalVolatility * 1e6) | 0);
  mix((m.bandTilt * 1e6) | 0);
  mix((m.zeroCrossRate * 1e6) | 0);
  mix((m.peakiness * 1e6) | 0);
  const step = Math.max(1, Math.floor(frames.length / 56));
  for (let i = 0; i < frames.length; i += step) {
    const f = frames[i];
    mix((f.volume * 1e5) | 0);
    mix((f.centroidNorm * 1e5) | 0);
    mix(f.dominantBin | 0);
  }
  return h >>> 0 || 1;
}

function pickPoeticLine(energyLevel, emotionalTone, voiceSeed) {
  const r = mulberry32(voiceSeed + 4444);
  const pools = {
    calm: {
      low: [
        "Still water holding a whisper.",
        "Soft light through thin curtains.",
        "Footsteps fading on quiet stone.",
      ],
      medium: [
        "A measured breath between thoughts.",
        "Gentle waves against a distant shore.",
        "The pause where color gathers.",
      ],
      high: [
        "Warm thunder held in glass.",
        "Many quiet things said at once.",
        "A choir under a single lid.",
      ],
    },
    tense: {
      low: ["Wire drawn tight, barely humming.", "A held note before the drop.", "The hinge before the door opens."],
      medium: [
        "Edges sharpen where the voice rises.",
        "Static skipping before rain.",
        "Heat along a narrow wire.",
      ],
      high: [
        "Lightning braided in a narrow room.",
        "The air before something breaks.",
        "Teeth of glass in soft fog.",
      ],
    },
    chaotic: {
      low: ["Moths against a single bulb.", "Scatter of notes, still finding a key.", "A jar of coins mid-pour."],
      medium: [
        "Glass dust in a sunbeam, every piece turning.",
        "A storm threaded through commas.",
        "Stars arguing over one microphone.",
      ],
      high: [
        "Every frequency waving a small flag.",
        "Galaxies in a teaspoon, still spinning.",
        "Confetti made of wavelengths.",
      ],
    },
  };
  const toneKey = emotionalTone in pools ? emotionalTone : "calm";
  const energyKey = energyLevel === "high" || energyLevel === "low" ? energyLevel : "medium";
  const arr = pools[toneKey][energyKey] || pools.calm.medium;
  return arr[Math.floor(r() * arr.length)];
}

function deriveEmotionalMeta(f) {
  const eScore = f.avgVolume * 0.5 + f.dynamicRange * 1.1 + f.temporalVolatility * 1.25 + f.spectralSpread * 0.38;
  let energyLevel = "low";
  if (eScore > 0.3) energyLevel = "medium";
  if (eScore > 0.5) energyLevel = "high";

  const tension = f.zeroCrossRate * 1.85 + f.temporalVolatility * 2.4;
  const chaos = f.spectralSpread * 1.45 + Math.max(0, f.peakiness - 1) * 0.12;

  let emotionalTone = "calm";
  if (chaos > 0.32 && eScore > 0.26) emotionalTone = "chaotic";
  else if (tension > 0.2 || f.dynamicRange > 0.32) emotionalTone = "tense";

  const poeticLine = pickPoeticLine(energyLevel, emotionalTone, f.voiceSeed);
  return { energyLevel, emotionalTone, poeticLine };
}

function pickSculptureForm(bandNormalized, voiceSeed, o) {
  const r = mulberry32(voiceSeed + 901);
  const treble = bandNormalized[2] + bandNormalized[3];
  const bass = bandNormalized[0] + bandNormalized[1];
  const volN = Math.min(1, o.avgVolume * 4);
  const { dynamicRange: dr, spectralSpread: sp, zeroCrossRate: zc, peakiness: pk, temporalVolatility: tv } = o;

  const scores = {
    spiky: treble * 2.35 + dr * 1.9 + tv * 0.6 + r() * 0.22,
    tube: bass * 2.05 + (1 - Math.min(1, dr * 2.8)) * 0.7 + (1 - treble) * 0.25 + r() * 0.16,
    hollow: sp * 1.85 + (1 - volN) * 0.75 + treble * 0.45 + r() * 0.2,
    boxy: pk * 0.32 + zc * 1.45 + dr * 1.05 + r() * 0.17,
    ribbon: (1 - volN) * 1.85 + dr * 0.6 + bass * 0.4 + (1 - sp) * 0.15 + r() * 0.18,
  };

  let best = "tube";
  let bestS = -1;
  for (const [k, v] of Object.entries(scores)) {
    if (v > bestS) {
      bestS = v;
      best = k;
    }
  }
  return best;
}

/** Spread hues across the wheel from voiceSeed so sculptures read as clearly different colors. */
function hueFromVoiceSeed(voiceSeed, bandTint = 0) {
  const s = voiceSeed >>> 0;
  const u = (s * 2654435761) >>> 0;
  const v = (Math.imul(s, 1597334677) >>> 0) / 4294967296;
  const w = u / 4294967296;
  let h = (v * 0.5 + w * 0.5 + (s % 17) * 0.011 + bandTint * 0.09) % 1;
  h = (h + 1) % 1;
  return h;
}

function summarizeFrames(frames) {
  const count = frames.length || 1;
  let avgVolume = 0;
  let maxVolume = 0;
  let minVolume = 1;
  let centroid = 0;
  let centroidSq = 0;
  const bands = [0, 0, 0, 0];
  const volumes = [];
  let zeroCrosses = 0;
  let zcSamples = 0;

  for (const f of frames) {
    avgVolume += f.volume;
    maxVolume = Math.max(maxVolume, f.volume);
    minVolume = Math.min(minVolume, f.volume);
    centroid += f.centroidNorm;
    centroidSq += f.centroidNorm * f.centroidNorm;
    volumes.push(f.volume);
    for (let b = 0; b < 4; b += 1) {
      const s = Math.floor((b * f.freq.length) / 4);
      const e = Math.floor(((b + 1) * f.freq.length) / 4);
      let local = 0;
      for (let i = s; i < e; i += 1) local += f.freq[i];
      bands[b] += local / (e - s);
    }
    for (let j = 1; j < f.wave.length; j += 1) {
      zcSamples += 1;
      if (f.wave[j - 1] * f.wave[j] < 0) zeroCrosses += 1;
    }
  }

  avgVolume /= count;
  centroid /= count;
  const spectralSpread = Math.sqrt(Math.max(0, centroidSq / count - centroid * centroid));
  for (let i = 0; i < bands.length; i += 1) bands[i] /= count;
  const bandSum = bands.reduce((a, b) => a + b, 0) + 1e-6;
  const bandNormalized = bands.map((b) => b / bandSum);
  const dynamicRange = maxVolume - minVolume;
  const dominantFreq = bands.indexOf(Math.max(...bands));
  const bandTilt = bands[3] + bands[2] - (bands[0] + bands[1]);

  let vMean = 0;
  let vSq = 0;
  for (const v of volumes) {
    vMean += v;
    vSq += v * v;
  }
  vMean /= count;
  const temporalVolatility = Math.sqrt(Math.max(0, vSq / count - vMean * vMean));
  const peakiness = maxVolume / (avgVolume + 0.03);
  const zeroCrossRate = zcSamples > 0 ? zeroCrosses / zcSamples : 0;

  const metricsForSeed = {
    spectralCentroid: centroid,
    dynamicRange,
    avgVolume,
    dominantFreq,
    spectralSpread,
    temporalVolatility,
    bandTilt,
    zeroCrossRate,
    peakiness,
  };
  const voiceSeed = computeVoiceSeed(frames, metricsForSeed);
  const formKind = pickSculptureForm(bandNormalized, voiceSeed, {
    avgVolume,
    dynamicRange,
    spectralSpread,
    zeroCrossRate,
    peakiness,
    temporalVolatility,
  });
  const { energyLevel, emotionalTone, poeticLine } = deriveEmotionalMeta({
    avgVolume,
    dynamicRange,
    temporalVolatility,
    spectralSpread,
    zeroCrossRate,
    peakiness,
    voiceSeed,
  });

  const energy = Math.min(1, avgVolume * 0.75 + dynamicRange * 1.1 + spectralSpread * 0.9);
  const bandTint = bandNormalized[3] - bandNormalized[0];
  const hue = hueFromVoiceSeed(voiceSeed, bandTint);
  const brightness = 0.38 + energy * 0.28 + temporalVolatility * 0.35;
  const height = 2.2 + avgVolume * 11 + dynamicRange * 7 + spectralSpread * 9 + peakiness * 0.4;
  const roughness = 0.12 + bandNormalized[3] * 0.55 + zeroCrossRate * 0.8 + temporalVolatility * 0.6;

  const radiusProfile = sampleProfile(frames, 40, (f, idx) => {
    const fi = Math.floor((idx / 39) * (f.freq.length - 1));
    return Math.min(2.4, 0.15 + f.volume * 2.2 + f.freq[fi] * 1.1 + Math.abs(f.wave[idx % f.wave.length]) * 0.4);
  });

  const waveformProfile = sampleProfile(frames, 72, (f, idx) => {
    const wi = Math.floor((idx / 71) * (f.wave.length - 1));
    return f.wave[wi];
  });

  return {
    avgVolume,
    maxVolume,
    dominantFreq,
    spectralCentroid: centroid,
    dynamicRange,
    spectralSpread,
    temporalVolatility,
    bandTilt,
    peakiness,
    zeroCrossRate,
    bandNormalized,
    voiceSeed,
    radiusProfile,
    waveformProfile,
    height,
    roughness,
    hue: ((hue % 1) + 1) % 1,
    brightness: Math.min(0.82, Math.max(0.28, brightness)),
    formKind,
    energyLevel,
    emotionalTone,
    poeticLine,
  };
}

function sampleProfile(frames, samples, getter) {
  const out = [];
  for (let i = 0; i < samples; i += 1) {
    const fi = Math.min(frames.length - 1, Math.floor((i / (samples - 1)) * frames.length));
    out.push(Number(getter(frames[fi], i).toFixed(4)));
  }
  return out;
}

function generateDraftSculpture() {
  if (!state.frames.length) {
    setStatus("Record audio first.");
    return;
  }
  if (!THREE || !sceneState.boardGroup) {
    setStatus("3D is not ready (library still loading or failed). Check console / network, then refresh.");
    return;
  }
  const features = summarizeFrames(state.frames);
  state.draft = {
    ...features,
    position: { x: 0, y: 0, z: 0 },
  };
  if (ui.avgVolume) ui.avgVolume.textContent = features.avgVolume.toFixed(3);
  if (ui.domFreq) ui.domFreq.textContent = String(features.dominantFreq);
  if (ui.dynRange) ui.dynRange.textContent = features.dynamicRange.toFixed(3);

  clearDraftMesh();
  const mesh = makeSculptureGroup(features, true);
  mesh.position.set(0, 0, 0);
  mesh.userData.meta = {
    userName: "Your voice (draft)",
    createdAt: new Date(),
    formKind: features.formKind,
    formLabel: FORM_LABELS[features.formKind] || features.formKind,
    energyLevel: features.energyLevel,
    emotionalTone: features.emotionalTone,
    poeticLine: features.poeticLine,
  };
  sceneState.boardGroup.add(mesh);
  sceneState.draftMesh = mesh;
  mesh.userData.savedFeatures = cloneFeaturesForStorage(features);
  setStatus("Sculpture ready. Drag the 3D view to look around.");
  updateButtons();
}

function makeCurveFromData(data) {
  const rand = mulberry32(data.voiceSeed);
  const n = Math.max(56, data.radiusProfile.length * 5);
  const bn = data.bandNormalized || [0.25, 0.25, 0.25, 0.25];

  const turns = 1.15 + rand() * 4.8 + data.dynamicRange * 5.2 + data.spectralSpread * 6.5;
  const chirality = rand() > 0.5 ? 1 : -1;
  const baseR = 0.28 + data.avgVolume * 2.9 + bn[2] * 2.1 + bn[3] * 0.9;
  const radialMod = 0.2 + data.spectralSpread * 1.35 + rand() * 0.55;
  const wobbleAmp = 0.1 + data.dynamicRange * 0.62 + rand() * 0.38 + data.temporalVolatility * 0.45;
  const detailFreq = 2.1 + rand() * 5.5 + data.peakiness * 0.75;
  const lissX = 0.85 + rand() * 2.4 + data.temporalVolatility * 3.2;
  const lissY = 0.85 + rand() * 2.4 + data.avgVolume * 1.8;
  const lissZ = 0.85 + rand() * 2.4 + data.zeroCrossRate * 2.2;
  const phaseXY = rand() * Math.PI * 2;
  const phaseYZ = rand() * Math.PI * 2;
  const verticalWarp = data.roughness * (0.35 + rand() * 0.85);
  const lift = data.height;
  const squash = 0.62 + rand() * 0.58;
  const bend = data.bandTilt * 0.55 + (rand() - 0.5) * data.spectralSpread * 1.2;

  const freqA = 1.65 + (data.voiceSeed % 31) * 0.072;
  const freqB = 2.85 + ((data.voiceSeed >>> 8) % 29) * 0.081;
  const tension = 0.1 + ((data.voiceSeed >>> 16) % 9) * 0.018;

  const points = [];
  for (let i = 0; i < n; i += 1) {
    const t = i / (n - 1);
    const a = t * Math.PI * 2 * turns * chirality;
    const rIdx = Math.min(data.radiusProfile.length - 1, Math.floor(t * (data.radiusProfile.length - 1)));
    const wIdx = Math.min(data.waveformProfile.length - 1, Math.floor(t * (data.waveformProfile.length - 1)));
    const rp = data.radiusProfile[rIdx];
    const wf = data.waveformProfile[wIdx];
    let radial = baseR + rp * radialMod + wf * wobbleAmp;
    radial += Math.sin(a * detailFreq) * data.roughness * 0.48;
    radial += Math.cos(a * freqA + phaseXY) * data.spectralSpread * 0.72;

    let x = Math.cos(a) * radial;
    let z = Math.sin(a) * radial;
    let y = (t - 0.5) * lift * squash;

    x += Math.sin(a * lissX + phaseXY) * (0.28 + bn[0] * 0.35);
    y += Math.cos(a * lissY + phaseYZ) * (0.22 + data.avgVolume * 0.55) + Math.sin(a * freqB) * verticalWarp;
    z += Math.sin(a * lissZ) * (0.24 + data.zeroCrossRate * 0.45);

    x += bend * Math.sin(t * Math.PI * 2);
    z += bend * Math.cos(t * Math.PI * 2.3) * 0.85;

    points.push(new THREE.Vector3(x, y, z));
  }
  return new THREE.CatmullRomCurve3(points, false, "catmullrom", tension);
}

function disposeSculptureResources(root) {
  const geos = new Set();
  const mats = new Set();
  root.traverse((o) => {
    if (o.geometry) geos.add(o.geometry);
    if (o.material) {
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      ms.forEach((m) => m && mats.add(m));
    }
  });
  geos.forEach((g) => g.dispose());
  mats.forEach((m) => {
    if (m.map) m.map.dispose();
    m.dispose?.();
  });
}

function volScaleFactor(data) {
  return 0.36 + Math.min(1, data.avgVolume * 3.9) * 0.82;
}

function baseColor(data, formKind) {
  const hueShift = { tube: 0, spiky: 0.028, hollow: 0.05, boxy: -0.032, ribbon: 0.065 }[formKind] || 0;
  let h = data.hue + hueShift;
  h = ((h % 1) + 1) % 1;
  const sat = 0.58 + ((data.voiceSeed >>> 2) % 19) * 0.012;
  const light = Math.min(
    0.8,
    Math.max(0.32, data.brightness + ((((data.voiceSeed >>> 9) % 9) - 4) * 0.022))
  );
  return new THREE.Color().setHSL(h, sat, light);
}

function emissiveAccent(color, voiceSeed, isOwn) {
  const e = color.clone();
  const dh = (((voiceSeed >>> 6) % 25) - 12) * 0.004;
  e.offsetHSL(dh, 0.14, 0.06);
  e.multiplyScalar(isOwn ? 0.26 : 0.11);
  return e;
}

function applyDisplacementToTubeGeometry(geometry, data, mode) {
  const disp = mulberry32(data.voiceSeed + 1337);
  const f1 = 0.75 + disp() * 3.4;
  const f2 = 0.75 + disp() * 3.4;
  const f3 = 0.75 + disp() * 3.4;
  const f4 = 0.75 + disp() * 3.4;
  let dispAmp = data.roughness * (0.14 + disp() * 0.44) + data.spectralSpread * 0.14;
  dispAmp *= 1 + data.dynamicRange * 2.3;

  const pos = geometry.attributes.position;
  const normal = geometry.attributes.normal;
  for (let i = 0; i < pos.count; i += 1) {
    const nx = normal.getX(i);
    const ny = normal.getY(i);
    const nz = normal.getZ(i);
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    let noise =
      Math.sin(x * f1 + y * f2) * Math.cos(z * f3) * 0.55 +
      Math.sin(x * f4 + z * f2) * 0.35 +
      Math.cos(y * f3 - x * f1) * 0.25;
    if (mode === "spiky") {
      const spike = Math.sign(noise) * Math.pow(Math.min(1, Math.abs(noise) + 0.1), 0.32);
      noise = spike * 1.72 + noise * 0.28;
    }
    const d = noise * dispAmp * (mode === "spiky" ? 1.35 : 1);
    pos.setXYZ(i, x + nx * d, y + ny * d, z + nz * d);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
}

function alignInstanceToCurve(dummy, curve, u, tangentRef, pt, scaleVec) {
  curve.getPointAt(u, pt);
  curve.getTangentAt(u, tangentRef).normalize();
  dummy.position.copy(pt);
  dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangentRef);
  dummy.scale.copy(scaleVec);
  dummy.updateMatrix();
}

function buildTubeSculpture(data, curve, isOwn, mode) {
  const r = mulberry32(data.voiceSeed + 777);
  const vs = volScaleFactor(data);
  const tubeR =
    (0.042 +
      data.avgVolume * 0.64 +
      data.temporalVolatility * 0.5 +
      r() * 0.24 +
      (1 - data.dominantFreq / 3.5) * 0.08) *
    vs;
  const tubularSeg = 118 + Math.floor(r() * 175);
  const radialSeg =
    mode === "spiky" ? 8 + Math.floor(r() * 11) : 6 + Math.floor(r() * 13);
  const geo = new THREE.TubeGeometry(curve, tubularSeg, tubeR, radialSeg, false);
  applyDisplacementToTubeGeometry(geo, data, mode);

  const fk = mode === "spiky" ? "spiky" : "tube";
  const col = baseColor(data, fk);
  const mat = new THREE.MeshPhysicalMaterial({
    color: col,
    emissive: emissiveAccent(col, data.voiceSeed, isOwn),
    roughness: mode === "spiky" ? 0.32 + data.roughness * 0.52 : 0.14 + data.roughness * 0.42,
    metalness: mode === "spiky" ? 0.12 + ((data.voiceSeed >>> 10) % 8) * 0.018 : 0.05 + ((data.voiceSeed >>> 12) % 10) * 0.006,
    clearcoat: mode === "spiky" ? 0.28 : 0.66,
    clearcoatRoughness: mode === "spiky" ? 0.52 : 0.22 + ((data.voiceSeed >>> 20) % 8) * 0.02,
    transmission: mode === "spiky" ? 0.05 : 0.1 + ((data.voiceSeed >>> 4) % 6) * 0.02,
    opacity: 0.96,
    transparent: true,
    flatShading: mode === "spiky",
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  return new THREE.Mesh(geo, mat);
}

function buildHollowSculpture(data, curve, isOwn) {
  const r = mulberry32(data.voiceSeed + 2020);
  const vs = volScaleFactor(data);
  const tubeR = (0.055 + data.avgVolume * 0.52) * vs;
  const geo = new THREE.TubeGeometry(curve, 105 + Math.floor(r() * 95), tubeR, 10, false);
  applyDisplacementToTubeGeometry(geo, data, "smooth");

  const col = baseColor(data, "hollow");
  const shellEm = emissiveAccent(col, data.voiceSeed, isOwn);
  if (!isOwn) shellEm.multiplyScalar(0.62);
  const shell = new THREE.MeshPhysicalMaterial({
    color: col,
    emissive: shellEm,
    metalness: 0.03,
    roughness: 0.1,
    transmission: 0.74,
    thickness: 1,
    transparent: true,
    opacity: 0.36,
    depthWrite: false,
    clearcoat: 0.45,
    clearcoatRoughness: 0.32,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  const mesh = new THREE.Mesh(geo, shell);
  const edgeGeo = new THREE.EdgesGeometry(geo, 26);
  const edgeHex = col.clone().offsetHSL(0.07, 0.38, 0.26).getHex();
  const lines = new THREE.LineSegments(
    edgeGeo,
    new THREE.LineBasicMaterial({ color: edgeHex, transparent: true, opacity: 0.55 })
  );
  return [mesh, lines];
}

function buildBoxySculpture(data, curve, isOwn) {
  const r = mulberry32(data.voiceSeed + 3030);
  const count = 34 + Math.floor(r() * 34);
  const vs = volScaleFactor(data);
  const dr = 1 + data.dynamicRange * 2.5;
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const col = baseColor(data, "boxy");
  const mat = new THREE.MeshStandardMaterial({
    color: col,
    emissive: emissiveAccent(col, data.voiceSeed, isOwn),
    roughness: 0.4 + r() * 0.28,
    metalness: 0.16 + r() * 0.22,
    flatShading: true,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  const inst = new THREE.InstancedMesh(boxGeo, mat, count);
  const dummy = new THREE.Object3D();
  const pt = new THREE.Vector3();
  const tan = new THREE.Vector3();
  const sc = new THREE.Vector3();
  for (let i = 0; i < count; i += 1) {
    const u = count > 1 ? i / (count - 1) : 0;
    const s = (0.13 + data.avgVolume * 0.52) * vs * dr * (0.52 + r() * 0.58);
    sc.set(s * (0.82 + r() * 0.38), s * (1.08 + r() * 0.42), s * (0.78 + r() * 0.4));
    alignInstanceToCurve(dummy, curve, u, tan, pt, sc);
    inst.setMatrixAt(i, dummy.matrix);
  }
  inst.instanceMatrix.needsUpdate = true;
  return inst;
}

function buildRibbonSculpture(data, curve, isOwn) {
  const r = mulberry32(data.voiceSeed + 4141);
  const count = 92 + Math.floor(r() * 52);
  const vs = volScaleFactor(data);
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const col = baseColor(data, "ribbon");
  const mat = new THREE.MeshPhysicalMaterial({
    color: col,
    emissive: emissiveAccent(col, data.voiceSeed, isOwn),
    roughness: 0.06 + r() * 0.14,
    metalness: 0.04,
    clearcoat: 0.82,
    clearcoatRoughness: 0.11,
    transmission: 0.1,
    transparent: true,
    opacity: 0.93,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  const inst = new THREE.InstancedMesh(boxGeo, mat, count);
  const dummy = new THREE.Object3D();
  const pt = new THREE.Vector3();
  const tan = new THREE.Vector3();
  const sc = new THREE.Vector3();
  const wid = (0.62 + data.dynamicRange * 1.25) * vs * (0.58 + r() * 0.48);
  const th = (0.035 + data.avgVolume * 0.14 + 0.05) * vs;
  const dep = (0.1 + r() * 0.12) * vs;
  for (let i = 0; i < count; i += 1) {
    const u = count > 1 ? i / (count - 1) : 0;
    sc.set(wid, Math.max(0.06, th) * 2.4, dep);
    alignInstanceToCurve(dummy, curve, u, tan, pt, sc);
    inst.setMatrixAt(i, dummy.matrix);
  }
  inst.instanceMatrix.needsUpdate = true;
  return inst;
}

function makeSculptureGroup(data, isOwn) {
  const curve = makeCurveFromData(data);
  const group = new THREE.Group();
  group.userData.isSculptureRoot = true;
  const kind = data.formKind || "tube";
  const rEnd = mulberry32(data.voiceSeed + 8888);

  if (kind === "hollow") {
    buildHollowSculpture(data, curve, isOwn).forEach((p) => group.add(p));
  } else if (kind === "boxy") {
    group.add(buildBoxySculpture(data, curve, isOwn));
  } else if (kind === "ribbon") {
    group.add(buildRibbonSculpture(data, curve, isOwn));
  } else if (kind === "spiky") {
    group.add(buildTubeSculpture(data, curve, isOwn, "spiky"));
  } else {
    group.add(buildTubeSculpture(data, curve, isOwn, "smooth"));
  }

  const baseScale = isOwn ? 1.1 : 0.74 + rEnd() * 0.18;
  group.scale.setScalar(0.001);
  group.userData.id = null;
  group.userData.isOwn = isOwn;
  group.userData.isDraft = isOwn;
  group.userData.targetScale = baseScale;
  group.userData.pulse = 1;
  group.userData.hover = 0;
  group.userData.bornAt = performance.now();
  group.userData.driftPhase = (data.voiceSeed % 6283) * 0.001;
  return group;
}

function persistSharedBoardToStorage() {
  try {
    const items = [];
    for (const [id, { mesh }] of sceneState.sharedBoard) {
      const sf = mesh.userData.savedFeatures;
      if (!sf) continue;
      const meta = mesh.userData.meta || {};
      items.push({
        id,
        features: sf,
        meta: {
          ...meta,
          createdAt: meta.createdAt instanceof Date ? meta.createdAt.toISOString() : meta.createdAt,
        },
        position: mesh.position.toArray(),
        targetScale: mesh.userData.targetScale ?? 0.9,
        driftPhase: mesh.userData.driftPhase ?? 0,
      });
    }
    localStorage.setItem(GALLERY_STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn("[gallery] persist failed", e);
  }
}

function loadSharedBoardFromStorage() {
  if (!THREE || !sceneState.boardGroup) return;
  let raw;
  try {
    raw = localStorage.getItem(GALLERY_STORAGE_KEY);
  } catch (e) {
    return;
  }
  if (!raw) return;
  let items;
  try {
    items = JSON.parse(raw);
  } catch (e) {
    console.warn("[gallery] bad JSON", e);
    return;
  }
  if (!Array.isArray(items)) return;
  for (const item of items) {
    if (!item?.features || !item.id) continue;
    try {
      const features = item.features;
      const group = makeSculptureGroup(features, false);
      group.position.fromArray(
        Array.isArray(item.position) && item.position.length === 3 ? item.position : [0, 0, 0]
      );
      const ts = typeof item.targetScale === "number" ? item.targetScale : 0.9;
      group.userData.targetScale = ts;
      group.scale.setScalar(ts);
      group.userData.driftPhase =
        typeof item.driftPhase === "number" ? item.driftPhase : Math.random() * Math.PI * 2;
      group.userData.savedFeatures = cloneFeaturesForStorage(features);
      const m = item.meta || {};
      group.userData.meta = {
        ...m,
        formLabel: m.formLabel || FORM_LABELS[m.formKind] || m.formKind,
        createdAt: m.createdAt ? new Date(m.createdAt) : new Date(),
      };
      group.userData.isDraft = false;
      group.userData.isOwn = false;
      group.userData.isSculptureRoot = true;
      group.userData.bornAt = performance.now();
      group.traverse((o) => {
        if (o.material && o.material.emissive) {
          o.material.emissive.multiplyScalar(0.58);
        }
      });
      sceneState.boardGroup.add(group);
      sceneState.sharedBoard.set(item.id, { mesh: group });
    } catch (err) {
      console.warn("[gallery] skip entry", item.id, err);
    }
  }
}

function clearDraftMesh() {
  if (!sceneState.draftMesh || !sceneState.boardGroup) return;
  sceneState.boardGroup.remove(sceneState.draftMesh);
  disposeSculptureResources(sceneState.draftMesh);
  sceneState.draftMesh = null;
}

function updateButtons() {
  const isRecording = state.recording;
  const audioStarting = state.audioStarting;
  const micReady = state.micReady;
  const hasRecording = state.frames.length >= 3;

  const enableMicDisabled = micReady || isRecording || audioStarting;
  const startDisabled = !micReady || isRecording || audioStarting;
  const stopDisabled = !isRecording;
  const generateDisabled = isRecording || !hasRecording;
  const resetDisabled =
    (!state.frames.length && !state.draft && !sceneState.draftMesh) || isRecording;

  if (ui.enableMicBtn) ui.enableMicBtn.disabled = enableMicDisabled;
  if (ui.startBtn) ui.startBtn.disabled = startDisabled;
  if (ui.stopBtn) ui.stopBtn.disabled = stopDisabled;
  if (ui.generateBtn) ui.generateBtn.disabled = generateDisabled;
  if (ui.resetBtn) ui.resetBtn.disabled = resetDisabled;
}

function findSharePosition() {
  const taken = [];
  for (const { mesh } of sceneState.sharedBoard.values()) {
    taken.push(mesh.position);
  }
  const n = taken.length;
  const spread = 44;
  const minR = 4;
  const minDist = 6.5;
  for (let k = 0; k < 180; k += 1) {
    const p = new THREE.Vector3(
      (Math.random() - 0.5) * spread * 2,
      (Math.random() - 0.5) * 16,
      (Math.random() - 0.5) * spread * 2
    );
    if (p.length() < minR) continue;
    p.y += Math.sin((n + k) * 2.17) * 5.8 + ((n * 3 + k) % 5) * 1.15;
    let ok = true;
    for (const t of taken) {
      const dy = Math.abs(p.y - t.y);
      const horiz = Math.hypot(p.x - t.x, p.z - t.z);
      const effective = horiz + dy * 0.35;
      if (effective < minDist && p.distanceTo(t) < minDist + 1.2) {
        ok = false;
        break;
      }
    }
    if (ok) return p;
  }
  return new THREE.Vector3(
    (Math.random() - 0.5) * 40,
    Math.sin(n * 1.9) * 8 + (Math.random() - 0.5) * 6,
    (Math.random() - 0.5) * 40
  );
}

function archiveDraftToShareBoard(displayName) {
  const mesh = sceneState.draftMesh;
  if (!mesh || !sceneState.boardGroup) return;
  const name = (displayName || "").trim() || "Anonymous";
  mesh.position.copy(findSharePosition());
  mesh.userData.isDraft = false;
  mesh.userData.isOwn = false;
  /** Draft animates scale from ~0.001 — if user saves early, the piece stays microscopic. Snap to full gallery size. */
  const targetScale = 0.82 + Math.random() * 0.14;
  mesh.userData.targetScale = targetScale;
  mesh.scale.setScalar(targetScale);
  mesh.visible = true;
  mesh.updateMatrixWorld(true);
  const prev = mesh.userData.meta || {};
  mesh.userData.meta = {
    ...prev,
    userName: name,
    createdAt: new Date(),
  };
  mesh.traverse((o) => {
    if (o.material && o.material.emissive) {
      o.material.emissive.multiplyScalar(0.58);
    }
  });
  const id = `share-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  sceneState.sharedBoard.set(id, { mesh });
  sceneState.draftMesh = null;
  state.draft = null;
  persistSharedBoardToStorage();
}

function clearRecordingStateOnly() {
  stopRecording();
  state.frames = [];
  state.draft = null;
  if (ui.frameCount) ui.frameCount.textContent = "0";
  if (ui.avgVolume) ui.avgVolume.textContent = "-";
  if (ui.domFreq) ui.domFreq.textContent = "-";
  if (ui.dynRange) ui.dynRange.textContent = "-";
  setStatus("Tap Enable Microphone, then Start Recording.");
  updateButtons();
}

function openResetModal() {
  if (!THREE || !sceneState.boardGroup) {
    clearRecordingStateOnly();
    return;
  }
  if (sceneState.draftMesh) {
    if (ui.resetNameInput) ui.resetNameInput.value = "";
    ui.resetModal?.classList.remove("hidden");
    ui.resetModal?.setAttribute("aria-hidden", "false");
    ui.resetNameInput?.focus();
    return;
  }
  clearRecordingStateOnly();
}

function closeResetModal() {
  ui.resetModal?.classList.add("hidden");
  ui.resetModal?.setAttribute("aria-hidden", "true");
}

function confirmResetModal() {
  if (!THREE || !sceneState.boardGroup) return;
  const name = ui.resetNameInput?.value ?? "";
  if (sceneState.draftMesh) archiveDraftToShareBoard(name);
  clearRecordingStateOnly();
  closeResetModal();
}

function setStatus(text) {
  if (ui.statusText) ui.statusText.textContent = text;
}

function initThree() {
  sceneState.raycaster = new THREE.Raycaster();
  sceneState.mouse = new THREE.Vector2(999, 999);
  sceneState.clock = new THREE.Clock();
  sceneState.intro = 0;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x070a14, 0.026);

  const camera = new THREE.PerspectiveCamera(
    48,
    ui.canvasContainer.clientWidth / Math.max(1, ui.canvasContainer.clientHeight),
    0.1,
    260
  );
  camera.position.set(0, 16, 52);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(ui.canvasContainer.clientWidth, ui.canvasContainer.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  ui.canvasContainer.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.target.set(0, 0, 0);
  controls.minDistance = 10;
  controls.maxDistance = 130;

  const ambient = new THREE.AmbientLight(0x9aa8d8, 0.36);
  const directional = new THREE.DirectionalLight(0xc8d8ff, 0.72);
  directional.position.set(12, 18, 8);
  const fill = new THREE.DirectionalLight(0x8899cc, 0.28);
  fill.position.set(-14, 6, -10);
  const point = new THREE.PointLight(0x8fa8ff, 0.75, 180, 2);
  point.position.set(-18, 10, -14);
  const memoryLight = new THREE.PointLight(0xc4a8ff, 0.42, 200, 2);
  memoryLight.position.set(16, 4, 12);
  scene.add(ambient, directional, fill, point, memoryLight);

  const boardGroup = new THREE.Group();
  const galleryGrid = new THREE.GridHelper(140, 56, 0x2a3558, 0x141a2e);
  galleryGrid.position.y = -18;
  const gm = galleryGrid.material;
  const gMats = Array.isArray(gm) ? gm : gm ? [gm] : [];
  for (const m of gMats) {
    m.transparent = true;
    m.opacity = 0.12;
    m.depthWrite = false;
  }
  boardGroup.add(galleryGrid);
  scene.add(boardGroup);
  scene.add(makeParticles());

  sceneState.scene = scene;
  sceneState.camera = camera;
  sceneState.renderer = renderer;
  sceneState.controls = controls;
  sceneState.boardGroup = boardGroup;
  window.addEventListener("resize", onResize);
}

function makeParticles() {
  const count = 2200;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const r = 22 + Math.random() * 72;
    const t = Math.random() * Math.PI * 2;
    const p = Math.acos(2 * Math.random() - 1);
    const x = r * Math.sin(p) * Math.cos(t);
    const y = r * Math.cos(p) * 0.6;
    const z = r * Math.sin(p) * Math.sin(t);
    positions.set([x, y, z], i * 3);

    const c = new THREE.Color().setHSL(0.57 + Math.random() * 0.12, 0.44, 0.58 + Math.random() * 0.2);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const m = new THREE.PointsMaterial({
    size: 0.07,
    transparent: true,
    opacity: 0.52,
    vertexColors: true,
    depthWrite: false,
  });
  sceneState.particles = new THREE.Points(g, m);
  return sceneState.particles;
}

function onPointerMove(evt) {
  if (!sceneState.mouse || !ui.canvasContainer) return;
  const r = ui.canvasContainer.getBoundingClientRect();
  sceneState.mouse.x = ((evt.clientX - r.left) / r.width) * 2 - 1;
  sceneState.mouse.y = -((evt.clientY - r.top) / r.height) * 2 + 1;
}

function onPointerLeave() {
  if (sceneState.mouse) sceneState.mouse.set(999, 999);
  if (ui.tooltip) ui.tooltip.classList.add("hidden");
  sceneState.hovered = null;
}

function onCanvasClick() {
  if (!sceneState.hovered || !THREE || !sceneState.controls || !sceneState.camera) return;
  const target = new THREE.Vector3();
  sceneState.hovered.mesh.getWorldPosition(target);
  sceneState.controls.target.lerp(target, 0.35);
  sceneState.camera.position.lerp(target.clone().add(new THREE.Vector3(0, 3.2, 8)), 0.35);
}

function findSculptureRoot(obj) {
  let o = obj;
  while (o && !o.userData?.isSculptureRoot) o = o.parent;
  return o;
}

function updateHover() {
  if (!sceneState.raycaster || !sceneState.mouse || !sceneState.camera) return;
  const roots = [
    sceneState.draftMesh,
    ...[...sceneState.sharedBoard.values()].map((x) => x.mesh),
  ].filter(Boolean);
  if (!roots.length) {
    sceneState.hovered = null;
    if (ui.tooltip) ui.tooltip.classList.add("hidden");
    return;
  }
  sceneState.raycaster.setFromCamera(sceneState.mouse, sceneState.camera);
  const hit = sceneState.raycaster.intersectObjects(roots, true)[0];

  if (hit && ui.tooltip) {
    const root = findSculptureRoot(hit.object);
    if (!root) {
      sceneState.hovered = null;
      ui.tooltip.classList.add("hidden");
      return;
    }
    sceneState.hovered = { mesh: root };
    const m = root.userData.meta || {};
    const ts = m.createdAt instanceof Date ? m.createdAt.toLocaleString() : "recent";
    const form = m.formLabel || FORM_LABELS[m.formKind] || "Voice form";
    const energy = m.energyLevel || "—";
    const tone = m.emotionalTone || "—";
    const poem = m.poeticLine
      ? `<div class="tooltip-poem">${escapeHtml(m.poeticLine)}</div>`
      : "";
    ui.tooltip.innerHTML = `<strong>${escapeHtml(m.userName || "Unknown")}</strong><div class="tooltip-meta">${escapeHtml(form)} · Energy: ${escapeHtml(energy)} · ${escapeHtml(tone)}</div>${poem}<div class="tooltip-ts">${escapeHtml(ts)}</div>`;
    ui.tooltip.style.left = `${((sceneState.mouse.x + 1) * 0.5 * window.innerWidth + 14).toFixed(0)}px`;
    ui.tooltip.style.top = `${((1 - (sceneState.mouse.y + 1) * 0.5) * window.innerHeight + 14).toFixed(0)}px`;
    ui.tooltip.classList.remove("hidden");
  } else {
    sceneState.hovered = null;
    if (ui.tooltip) ui.tooltip.classList.add("hidden");
  }
}

function animate() {
  requestAnimationFrame(animate);
  if (!sceneState.renderer || !sceneState.scene || !sceneState.camera || !sceneState.clock || !sceneState.boardGroup) {
    return;
  }
  const t = sceneState.clock.getElapsedTime();

  if (sceneState.intro < 1) {
    sceneState.intro = Math.min(1, sceneState.intro + 0.004);
    sceneState.camera.position.lerp(new THREE.Vector3(0, 11, 30), sceneState.intro * 0.03);
    sceneState.controls.target.lerp(new THREE.Vector3(0, 0, 0), sceneState.intro * 0.03);
  }

  sceneState.controls.update();
  updateHover();

  for (const { mesh } of sceneState.sharedBoard.values()) {
    const ud = mesh.userData;
    const age = (performance.now() - ud.bornAt) / 1000;
    const scaleTarget = ud.targetScale + (sceneState.hovered?.mesh === mesh ? 0.07 : 0);
    const current = mesh.scale.x;
    mesh.scale.setScalar(current + (scaleTarget - current) * 0.08);

    mesh.rotation.y += 0.00095;
    mesh.rotation.x = Math.sin(t * 0.14 + ud.driftPhase) * 0.055;
    mesh.rotation.z = Math.cos(t * 0.11 + ud.driftPhase * 0.73) * 0.042;
    mesh.position.y += Math.sin(t * 0.18 + ud.driftPhase + mesh.position.x * 0.07) * 0.0021;
    mesh.position.x += Math.cos(t * 0.1 + ud.driftPhase + mesh.position.z * 0.038) * 0.00085;
    mesh.position.z += Math.sin(t * 0.09 + ud.driftPhase * 1.1) * 0.00055;

    const pulse = ud.pulse > 1 ? ud.pulse - 0.007 : 1;
    ud.pulse = pulse;
    const emBase = 0.34 * pulse + Math.sin(t * 0.75 + age) * 0.04;
    mesh.traverse((o) => {
      if (o.material && "emissiveIntensity" in o.material) {
        o.material.emissiveIntensity = emBase;
      }
    });
  }

  if (sceneState.draftMesh) {
    const dm = sceneState.draftMesh;
    const target = dm.userData.targetScale ?? 1.08;
    const s = dm.scale.x + (target - dm.scale.x) * 0.08;
    dm.scale.setScalar(s);
    dm.rotation.y += 0.0018;
    dm.position.y = Math.sin(t * 0.55) * 0.22;
    const em = 1.02 + Math.sin(t * 1.35) * 0.1;
    dm.traverse((o) => {
      if (o.material && "emissiveIntensity" in o.material) {
        o.material.emissiveIntensity = em;
      }
    });
  }

  if (sceneState.particles) {
    sceneState.particles.rotation.y = t * 0.006;
    sceneState.particles.rotation.x = Math.sin(t * 0.06) * 0.045;
  }

  sceneState.boardGroup.position.y = Math.sin(t * 0.06 + sceneState.driftPhase) * 0.28;
  sceneState.boardGroup.rotation.y = Math.sin(t * 0.028 + sceneState.driftPhase) * 0.045;

  sceneState.renderer.render(sceneState.scene, sceneState.camera);
}

function onResize() {
  if (!sceneState.renderer || !sceneState.camera || !ui.canvasContainer) return;
  const w = ui.canvasContainer.clientWidth;
  const h = ui.canvasContainer.clientHeight;
  sceneState.camera.aspect = w / Math.max(1, h);
  sceneState.camera.updateProjectionMatrix();
  sceneState.renderer.setSize(w, h);
}
