import * as THREE from "https://unpkg.com/three@0.161.0/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.161.0/examples/jsm/controls/OrbitControls.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-analytics.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDq9J1FHvKapMrudjGme9vCWsOskJBgiT8",
  authDomain: "sharemind-29201.firebaseapp.com",
  projectId: "sharemind-29201",
  storageBucket: "sharemind-29201.firebasestorage.app",
  messagingSenderId: "1013206091666",
  appId: "1:1013206091666:web:cd23b62488b7828cda634b",
  measurementId: "G-P53BLKFZK8",
};

const MAX_RECORD_MS = 20_000;
const MAX_SCULPTURES = 40;
const BOARD_BOUNDS = 20;

/** Filled in bootstrap() after DOM is ready (avoids null refs + missed listeners). */
const ui = {};

function cacheDomRefs() {
  Object.assign(ui, {
    loginBtn: document.getElementById("loginBtn"),
    logoutBtn: document.getElementById("logoutBtn"),
    userInfo: document.getElementById("userInfo"),
    userPhoto: document.getElementById("userPhoto"),
    userName: document.getElementById("userName"),
    userEmail: document.getElementById("userEmail"),
    startBtn: document.getElementById("startBtn"),
    stopBtn: document.getElementById("stopBtn"),
    generateBtn: document.getElementById("generateBtn"),
    publishBtn: document.getElementById("publishBtn"),
    resetBtn: document.getElementById("resetBtn"),
    statusText: document.getElementById("statusText"),
    avgVolume: document.getElementById("avgVolume"),
    domFreq: document.getElementById("domFreq"),
    dynRange: document.getElementById("dynRange"),
    frameCount: document.getElementById("frameCount"),
    canvasContainer: document.getElementById("canvasContainer"),
    tooltip: document.getElementById("tooltip"),
  });
}

const app = initializeApp(firebaseConfig);
// Analytics when the browser supports it (avoids hard failures in restricted environments).
isSupported()
  .then((ok) => {
    if (ok) getAnalytics(app);
  })
  .catch(() => {});
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });
provider.addScope("profile");
provider.addScope("email");
const sculpturesCol = collection(db, "voice_sculptures");

const state = {
  user: null,
  micReady: false,
  audioStarting: false,
  recording: false,
  frames: [],
  draft: null,
  lastPublishedId: null,
  publishInFlight: false,
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
  raycaster: new THREE.Raycaster(),
  mouse: new THREE.Vector2(999, 999),
  hovered: null,
  clock: new THREE.Clock(),
  intro: 0,
  driftPhase: Math.random() * Math.PI * 2,
  sculptures: new Map(),
};

function bootstrap() {
  cacheDomRefs();

  const missing = ["loginBtn", "logoutBtn", "startBtn", "canvasContainer", "statusText"].filter((k) => !ui[k]);
  if (missing.length) {
    console.error("[bootstrap] Missing DOM nodes:", missing.join(", "));
  }

  bindUI();
  attachAuthListener();
  try {
    initThree();
  } catch (err) {
    console.error("[Three.js] init failed:", err);
    setStatus("3D view failed to start. You can still try signing in—check the console.");
  }
  listenToSculptures();
  updateButtons();
  animate();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
} else {
  bootstrap();
}

function bindUI() {
  if (!ui.loginBtn || !ui.logoutBtn) {
    console.error("[bindUI] Missing #loginBtn or #logoutBtn; Google sign-in will not work.");
  }
  if (!ui.canvasContainer) {
    console.error("[bindUI] Missing #canvasContainer.");
  }

  if (ui.loginBtn) ui.loginBtn.addEventListener("click", handleLogin);
  if (ui.logoutBtn) ui.logoutBtn.addEventListener("click", handleLogout);
  if (ui.startBtn) ui.startBtn.addEventListener("click", () => void startRecording());
  if (ui.stopBtn) ui.stopBtn.addEventListener("click", stopRecording);
  if (ui.generateBtn) ui.generateBtn.addEventListener("click", generateDraftSculpture);
  if (ui.publishBtn) ui.publishBtn.addEventListener("click", () => void publishDraft());
  if (ui.resetBtn) ui.resetBtn.addEventListener("click", resetDraft);

  if (ui.canvasContainer) {
    ui.canvasContainer.addEventListener("pointermove", onPointerMove);
    ui.canvasContainer.addEventListener("pointerleave", onPointerLeave);
    ui.canvasContainer.addEventListener("click", onCanvasClick);
  }
}

function statusLoggedIn() {
  setStatus("Signed in. You can publish your sculpture to the shared space.");
}

function statusLoggedOut() {
  setStatus(
    "You can explore and generate your sculpture without signing in. Sign in to publish it to the shared space."
  );
}

function attachAuthListener() {
  onAuthStateChanged(auth, (user) => {
    state.user = user || null;
    if (state.user) {
      ui.userPhoto.src = state.user.photoURL || "";
      ui.userName.textContent = state.user.displayName || "Unknown";
      ui.userEmail.textContent = state.user.email || "-";
      ui.userInfo.classList.remove("hidden");
      statusLoggedIn();
    } else {
      ui.userInfo.classList.add("hidden");
      statusLoggedOut();
    }
    updateButtons();
  });
}

async function handleLogin(event) {
  event?.preventDefault?.();
  console.log("[Firebase Auth] Sign in clicked.");

  if (!ui.loginBtn) {
    console.error("[Firebase Auth] loginBtn missing from DOM.");
    return;
  }
  if (ui.loginBtn.disabled) {
    console.warn("[Firebase Auth] Login button is disabled (already signed in?).");
    return;
  }

  try {
    console.log("[Firebase Auth] Calling signInWithPopup(auth, provider)…");
    const credential = await signInWithPopup(auth, provider);
    console.log("[Firebase Auth] signInWithPopup resolved.", {
      uid: credential?.user?.uid,
      email: credential?.user?.email,
    });
  } catch (err) {
    console.error("[Firebase Auth] signInWithPopup failed:", {
      code: err?.code,
      message: err?.message,
      customData: err?.customData,
      name: err?.name,
      stack: err?.stack,
      fullError: err,
    });
    if (err?.code === "auth/popup-blocked") {
      setStatus("Pop-up was blocked. Allow pop-ups for this site and try again.");
    } else if (err?.code === "auth/popup-closed-by-user") {
      setStatus("Sign-in window was closed before finishing.");
    } else if (err?.code === "auth/unauthorized-domain") {
      setStatus("This domain is not authorized for Firebase Auth. Add it in Firebase Console → Authentication → Settings.");
    } else {
      setStatus(`Google sign-in failed${err?.code ? ` (${err.code})` : ""}. See console for details.`);
    }
  }
}

async function handleLogout() {
  try {
    await signOut(auth);
    statusLoggedOut();
    updateButtons();
  } catch (err) {
    console.error("[Firebase Auth] signOut failed:", {
      code: err?.code,
      message: err?.message,
      fullError: err,
    });
    setStatus("Sign out failed. Please try again.");
  }
}

// Microphone + AnalyserNode: called automatically the first time user clicks Record.
async function ensureMicrophoneAndAnalyser() {
  if (state.micReady && audio.analyser && audio.ctx) {
    if (audio.ctx.state === "suspended") await audio.ctx.resume();
    return;
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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

async function startRecording() {
  if (state.recording || state.audioStarting) return;

  if (!state.micReady) {
    state.audioStarting = true;
    updateButtons();
    setStatus("Requesting microphone…");
    try {
      await ensureMicrophoneAndAnalyser();
    } catch (err) {
      console.error(err);
      setStatus("Microphone permission denied. Please allow access and try again.");
      state.audioStarting = false;
      updateButtons();
      return;
    }
    state.audioStarting = false;
    updateButtons();
  }

  if (state.recording) return;

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
  setStatus("Recording...");
  updateButtons();

  audio.timer = window.setTimeout(() => {
    if (state.recording) stopRecording();
  }, MAX_RECORD_MS);
  collectFrame();
}

// Data collection loop: stores frequency bins + time-domain waveform over time.
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
  ui.frameCount.textContent = String(state.frames.length);
  audio.raf = requestAnimationFrame(collectFrame);
}

function stopRecording() {
  if (!state.recording) return;
  state.recording = false;
  cancelAnimationFrame(audio.raf);
  clearTimeout(audio.timer);
  if (state.frames.length < 3) {
    setStatus("No meaningful audio captured. Try recording again.");
  } else {
    setStatus("Recording finished. Generate your sculpture.");
  }
  updateButtons();
}

function summarizeFrames(frames) {
  const count = frames.length || 1;
  let avgVolume = 0;
  let maxVolume = 0;
  let centroid = 0;
  const bands = [0, 0, 0, 0];
  const volumes = [];

  for (const f of frames) {
    avgVolume += f.volume;
    maxVolume = Math.max(maxVolume, f.volume);
    centroid += f.centroidNorm;
    volumes.push(f.volume);
    for (let b = 0; b < 4; b += 1) {
      const s = Math.floor((b * f.freq.length) / 4);
      const e = Math.floor(((b + 1) * f.freq.length) / 4);
      let local = 0;
      for (let i = s; i < e; i += 1) local += f.freq[i];
      bands[b] += local / (e - s);
    }
  }

  avgVolume /= count;
  centroid /= count;
  for (let i = 0; i < bands.length; i += 1) bands[i] /= count;
  const dynamicRange = maxVolume - Math.min(...volumes);
  const dominantFreq = bands.indexOf(Math.max(...bands));
  const energy = Math.min(1, avgVolume * 0.8 + dynamicRange * 1.2);
  const hue = 0.58 + (0.06 - 0.58) * energy;
  const brightness = 0.45 + energy * 0.26;
  const height = 4 + avgVolume * 8 + dynamicRange * 5;
  const roughness = 0.2 + bands[3] * 0.5;

  const radiusProfile = sampleProfile(frames, 32, (f, idx) => {
    const fi = Math.floor((idx / 31) * (f.freq.length - 1));
    return Math.min(1.9, 0.3 + f.volume * 1.4 + f.freq[fi] * 0.7);
  });

  const waveformProfile = sampleProfile(frames, 64, (f, idx) => {
    const wi = Math.floor((idx / 63) * (f.wave.length - 1));
    return f.wave[wi];
  });

  return {
    avgVolume,
    maxVolume,
    dominantFreq,
    spectralCentroid: centroid,
    dynamicRange,
    radiusProfile,
    waveformProfile,
    height,
    roughness,
    hue,
    brightness,
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
  const features = summarizeFrames(state.frames);
  state.draft = {
    ...features,
    position: { x: 0, y: 0, z: 0 },
  };
  ui.avgVolume.textContent = features.avgVolume.toFixed(3);
  ui.domFreq.textContent = String(features.dominantFreq);
  ui.dynRange.textContent = features.dynamicRange.toFixed(3);

  clearDraftMesh();
  const mesh = makeSculptureMesh(features, true);
  mesh.position.set(0, 0, 0);
  mesh.userData.isDraft = true;
  sceneState.boardGroup.add(mesh);
  sceneState.draftMesh = mesh;
  setStatus("Draft sculpture generated. Publish it to the shared board.");
  updateButtons();
}

function makeCurveFromData(data) {
  const points = [];
  const n = Math.max(40, data.radiusProfile.length * 4);
  const turns = 2.4 + data.dynamicRange * 3.2;
  const baseR = 0.9 + data.avgVolume * 2;
  for (let i = 0; i < n; i += 1) {
    const t = i / (n - 1);
    const a = t * Math.PI * 2 * turns;
    const rIdx = Math.floor(t * (data.radiusProfile.length - 1));
    const wIdx = Math.floor(t * (data.waveformProfile.length - 1));
    const radial = baseR + data.radiusProfile[rIdx];
    const wobble = data.waveformProfile[wIdx] * (0.2 + data.roughness * 0.35);
    const detail = Math.sin(a * 3.3) * (data.roughness * 0.35);
    const radius = radial + wobble + detail;

    const x = Math.cos(a) * radius;
    const y = (t - 0.5) * data.height + Math.sin(a * 0.5) * data.dynamicRange * 1.6;
    const z = Math.sin(a) * radius;
    points.push(new THREE.Vector3(x, y, z));
  }
  return new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.2);
}

// Geometry generation for poetic helical voice sculptures.
function makeSculptureMesh(data, isOwn) {
  const curve = makeCurveFromData(data);
  const radius = 0.12 + data.avgVolume * 0.55 + (1 - data.dominantFreq / 4) * 0.15;
  const geometry = new THREE.TubeGeometry(curve, 260, radius, 18, false);
  if (!geometry.attributes.position) throw new Error("Invalid geometry data");

  const pos = geometry.attributes.position;
  const normal = geometry.attributes.normal;
  for (let i = 0; i < pos.count; i += 1) {
    const nx = normal.getX(i);
    const ny = normal.getY(i);
    const nz = normal.getZ(i);
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const noise = (Math.sin(x * 1.8) + Math.cos(y * 2.1) + Math.sin(z * 2.4)) / 3;
    const d = noise * data.roughness * 0.28;
    pos.setXYZ(i, x + nx * d, y + ny * d, z + nz * d);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();

  const color = new THREE.Color().setHSL(data.hue, 0.62, data.brightness);
  const material = new THREE.MeshPhysicalMaterial({
    color,
    emissive: color.clone().multiplyScalar(isOwn ? 0.2 : 0.08),
    roughness: 0.22 + data.roughness * 0.4,
    metalness: 0.07,
    clearcoat: 0.7,
    clearcoatRoughness: 0.25,
    transmission: 0.12,
    opacity: 0.97,
    transparent: true,
  });

  const mesh = new THREE.Mesh(geometry, material);
  const baseScale = isOwn ? 1.1 : 1.0;
  mesh.scale.setScalar(0.001);
  mesh.userData = {
    id: null,
    isOwn,
    targetScale: baseScale,
    pulse: 1.0,
    hover: 0,
    bornAt: performance.now(),
    driftPhase: Math.random() * Math.PI * 2,
  };
  return mesh;
}

function clearDraftMesh() {
  if (!sceneState.draftMesh) return;
  sceneState.boardGroup.remove(sceneState.draftMesh);
  sceneState.draftMesh.geometry.dispose();
  sceneState.draftMesh.material.dispose();
  sceneState.draftMesh = null;
}

async function publishDraft() {
  if (state.publishInFlight || state.recording) return;
  if (!state.draft) {
    setStatus("Generate a sculpture first.");
    return;
  }

  state.publishInFlight = true;
  updateButtons();

  try {
    let user = state.user || auth.currentUser;

    if (!user) {
      setStatus("Please sign in to publish your sculpture.");
      try {
        console.log("[Firebase Auth] Publish requested while signed out; opening Google sign-in…");
        const credential = await signInWithPopup(auth, provider);
        user = credential?.user;
        console.log("[Firebase Auth] Sign-in finished; continuing publish.", { uid: user?.uid });
      } catch (err) {
        console.error("[Firebase Auth] signInWithPopup failed (publish flow):", {
          code: err?.code,
          message: err?.message,
          customData: err?.customData,
          fullError: err,
        });
        if (err?.code === "auth/popup-blocked") {
          setStatus("Pop-up was blocked. Allow pop-ups for this site, then try Publish again.");
        } else if (err?.code === "auth/popup-closed-by-user") {
          setStatus("Sign-in was cancelled. Sign in when you’re ready to publish.");
        } else if (err?.code === "auth/unauthorized-domain") {
          setStatus("This domain is not authorized for Firebase Auth. Add it in Firebase Console → Authentication → Settings.");
        } else {
          setStatus(`Sign-in failed${err?.code ? ` (${err.code})` : ""}. See console for details.`);
        }
        return;
      }
    }

    if (!user) {
      setStatus("Sign-in did not complete. Try Publish again after signing in.");
      return;
    }

    await writePublishedSculpture(user);
  } finally {
    state.publishInFlight = false;
    updateButtons();
  }
}

async function writePublishedSculpture(user) {
  setStatus("Publishing to the shared space…");
  const position = findOpenPosition();
  const docData = {
    userId: user.uid,
    userName: user.displayName || "Unknown",
    userPhoto: user.photoURL || "",
    createdAt: serverTimestamp(),
    avgVolume: state.draft.avgVolume,
    maxVolume: state.draft.maxVolume,
    dominantFreq: state.draft.dominantFreq,
    spectralCentroid: state.draft.spectralCentroid,
    dynamicRange: state.draft.dynamicRange,
    radiusProfile: state.draft.radiusProfile,
    waveformProfile: state.draft.waveformProfile,
    height: state.draft.height,
    roughness: state.draft.roughness,
    hue: state.draft.hue,
    brightness: state.draft.brightness,
    position,
  };

  try {
    const ref = await addDoc(sculpturesCol, docData);
    state.lastPublishedId = ref.id;
    setStatus("Published. Your frozen voice joined the shared constellation.");
    clearDraftMesh();
    state.draft = null;
    updateButtons();
  } catch (err) {
    console.error("[Firestore] publish failed:", err);
    setStatus("Publish failed. Please try again.");
  }
}

function findOpenPosition() {
  const taken = [];
  for (const item of sceneState.sculptures.values()) {
    taken.push(item.mesh.position.clone());
  }

  for (let attempt = 0; attempt < 70; attempt += 1) {
    const p = new THREE.Vector3(
      THREE.MathUtils.randFloatSpread(BOARD_BOUNDS),
      THREE.MathUtils.randFloat(-7, 7),
      THREE.MathUtils.randFloatSpread(BOARD_BOUNDS)
    );
    let ok = true;
    for (const t of taken) {
      if (p.distanceTo(t) < 4.2) {
        ok = false;
        break;
      }
    }
    if (ok) return { x: Number(p.x.toFixed(3)), y: Number(p.y.toFixed(3)), z: Number(p.z.toFixed(3)) };
  }
  return { x: 0, y: 0, z: 0 };
}

function listenToSculptures() {
  const q = query(sculpturesCol, orderBy("createdAt", "desc"), limit(MAX_SCULPTURES));
  onSnapshot(
    q,
    (snap) => {
      const incoming = new Set();
      snap.forEach((docSnap) => {
        incoming.add(docSnap.id);
        if (!sceneState.sculptures.has(docSnap.id)) {
          const data = docSnap.data();
          if (!isDocValid(data)) return;
          addBoardSculpture(docSnap.id, data);
        }
      });

      for (const [id, item] of sceneState.sculptures.entries()) {
        if (!incoming.has(id)) {
          sceneState.boardGroup.remove(item.mesh);
          item.mesh.geometry.dispose();
          item.mesh.material.dispose();
          sceneState.sculptures.delete(id);
        }
      }
    },
    (err) => {
      console.error(err);
      setStatus("Live board sync failed. Check Firebase permissions.");
    }
  );
}

function isDocValid(d) {
  return (
    d &&
    Array.isArray(d.radiusProfile) &&
    Array.isArray(d.waveformProfile) &&
    d.radiusProfile.length > 2 &&
    d.waveformProfile.length > 2 &&
    typeof d.position?.x === "number" &&
    typeof d.position?.y === "number" &&
    typeof d.position?.z === "number"
  );
}

function addBoardSculpture(id, data) {
  try {
    const isOwn = state.user && data.userId === state.user.uid;
    const mesh = makeSculptureMesh(data, isOwn);
    mesh.userData.id = id;
    mesh.position.set(data.position.x, data.position.y, data.position.z);
    mesh.userData.meta = {
      userName: data.userName || "Unknown",
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : null,
      isOwn,
    };

    if (id === state.lastPublishedId) mesh.userData.pulse = 1.7;

    sceneState.boardGroup.add(mesh);
    sceneState.sculptures.set(id, { mesh, data });
  } catch (err) {
    console.error("Invalid sculpture entry:", err);
  }
}

function updateButtons() {
  const currentUser = auth.currentUser;
  const logged = !!state.user;

  const micReady = state.micReady;
  const isRecording = state.recording;
  const audioStarting = state.audioStarting;
  const hasRecording = state.frames.length >= 3;
  const hasGeneratedSculpture = !!state.draft;

  // --- Auth-only (never use this for record / generate / reset) ---
  if (ui.loginBtn) ui.loginBtn.disabled = logged;
  if (ui.logoutBtn) ui.logoutBtn.disabled = !logged;

  // --- Voice pipeline: Record requests mic on first use; NOT gated on login ---
  const startDisabled = isRecording || audioStarting;
  const stopDisabled = !isRecording;
  const generateDisabled = isRecording || !hasRecording;
  const publishDisabled = !hasGeneratedSculpture || isRecording || state.publishInFlight;
  const resetDisabled = (!state.frames.length && !state.draft) || isRecording;

  if (ui.startBtn) ui.startBtn.disabled = startDisabled;
  if (ui.stopBtn) ui.stopBtn.disabled = stopDisabled;
  if (ui.generateBtn) ui.generateBtn.disabled = generateDisabled;
  if (ui.publishBtn) ui.publishBtn.disabled = publishDisabled;
  if (ui.resetBtn) ui.resetBtn.disabled = resetDisabled;

  if (typeof window !== "undefined" && window.__DEBUG_BUTTONS__) {
    console.log("[updateButtons]", {
      currentUser: currentUser ? { uid: currentUser.uid, email: currentUser.email } : null,
      stateUser: state.user ? { uid: state.user.uid } : null,
      micReady,
      audioStarting,
      isRecording,
      hasRecording,
      hasGeneratedSculpture,
      framesCount: state.frames.length,
      publishInFlight: state.publishInFlight,
      buttonsDisabled: {
        login: ui.loginBtn?.disabled,
        logout: ui.logoutBtn?.disabled,
        start: ui.startBtn?.disabled,
        stop: ui.stopBtn?.disabled,
        generate: ui.generateBtn?.disabled,
        publish: ui.publishBtn?.disabled,
        reset: ui.resetBtn?.disabled,
      },
    });
  }
}

function resetDraft() {
  stopRecording();
  clearDraftMesh();
  state.frames = [];
  state.draft = null;
  ui.frameCount.textContent = "0";
  ui.avgVolume.textContent = "-";
  ui.domFreq.textContent = "-";
  ui.dynRange.textContent = "-";
  if (state.user) {
    setStatus("Ready for a new voice.");
  } else {
    statusLoggedOut();
  }
  updateButtons();
}

function setStatus(text) {
  ui.statusText.textContent = text;
}

function initThree() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x04060d, 0.038);

  const camera = new THREE.PerspectiveCamera(
    50,
    ui.canvasContainer.clientWidth / ui.canvasContainer.clientHeight,
    0.1,
    200
  );
  camera.position.set(0, 12, 36);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(ui.canvasContainer.clientWidth, ui.canvasContainer.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  ui.canvasContainer.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.target.set(0, 0, 0);
  controls.minDistance = 7;
  controls.maxDistance = 80;

  const ambient = new THREE.AmbientLight(0x8f9dd7, 0.42);
  const directional = new THREE.DirectionalLight(0xbfd2ff, 0.82);
  directional.position.set(7, 8, 4);
  const point = new THREE.PointLight(0x7fa8ff, 0.95, 110, 2);
  point.position.set(-7, 5, -9);
  const memoryLight = new THREE.PointLight(0xb07fff, 0.52, 120, 2);
  memoryLight.position.set(9, 2, 8);
  scene.add(ambient, directional, point, memoryLight);

  const boardGroup = new THREE.Group();
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
  const count = 1400;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const r = 18 + Math.random() * 58;
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
  const r = ui.canvasContainer.getBoundingClientRect();
  sceneState.mouse.x = ((evt.clientX - r.left) / r.width) * 2 - 1;
  sceneState.mouse.y = -((evt.clientY - r.top) / r.height) * 2 + 1;
}

function onPointerLeave() {
  sceneState.mouse.set(999, 999);
  ui.tooltip.classList.add("hidden");
  sceneState.hovered = null;
}

function onCanvasClick() {
  if (!sceneState.hovered) return;
  const target = sceneState.hovered.mesh.position.clone();
  sceneState.controls.target.lerp(target, 0.35);
  sceneState.camera.position.lerp(target.clone().add(new THREE.Vector3(0, 2.8, 6.5)), 0.35);
}

function updateHover() {
  const meshes = [...sceneState.sculptures.values()].map((x) => x.mesh);
  if (!meshes.length) return;
  sceneState.raycaster.setFromCamera(sceneState.mouse, sceneState.camera);
  const hit = sceneState.raycaster.intersectObjects(meshes)[0];

  if (hit) {
    sceneState.hovered = { mesh: hit.object };
    const m = hit.object.userData.meta || {};
    const ts = m.createdAt ? m.createdAt.toLocaleString() : "recent";
    ui.tooltip.innerHTML = `<strong>${m.userName || "Unknown"}</strong><br/>Voice Sculpture Memory<br/>${ts}`;
    ui.tooltip.style.left = `${((sceneState.mouse.x + 1) * 0.5 * window.innerWidth + 14).toFixed(0)}px`;
    ui.tooltip.style.top = `${((1 - (sceneState.mouse.y + 1) * 0.5) * window.innerHeight + 14).toFixed(0)}px`;
    ui.tooltip.classList.remove("hidden");
  } else {
    sceneState.hovered = null;
    ui.tooltip.classList.add("hidden");
  }
}

// Animation loop for drift, rotation, pulse, intro camera, and hover effects.
function animate() {
  requestAnimationFrame(animate);
  if (!sceneState.renderer || !sceneState.scene || !sceneState.camera) {
    return;
  }
  const t = sceneState.clock.getElapsedTime();

  if (sceneState.intro < 1) {
    sceneState.intro = Math.min(1, sceneState.intro + 0.004);
    sceneState.camera.position.lerp(new THREE.Vector3(0, 7, 23), sceneState.intro * 0.03);
    sceneState.controls.target.lerp(new THREE.Vector3(0, 0, 0), sceneState.intro * 0.03);
  }

  sceneState.controls.update();
  updateHover();

  for (const { mesh } of sceneState.sculptures.values()) {
    const ud = mesh.userData;
    const age = (performance.now() - ud.bornAt) / 1000;
    const scaleTarget = ud.targetScale + (sceneState.hovered?.mesh === mesh ? 0.06 : 0);
    const current = mesh.scale.x;
    mesh.scale.setScalar(current + (scaleTarget - current) * 0.08);

    mesh.rotation.y += 0.0011;
    mesh.rotation.x = Math.sin(t * 0.16 + ud.driftPhase) * 0.05;
    mesh.rotation.z = Math.cos(t * 0.13 + ud.driftPhase * 0.7) * 0.04;
    mesh.position.y += Math.sin(t * 0.2 + ud.driftPhase + mesh.position.x * 0.08) * 0.0018;
    mesh.position.x += Math.cos(t * 0.12 + ud.driftPhase + mesh.position.z * 0.04) * 0.0007;

    const pulse = ud.pulse > 1 ? ud.pulse - 0.007 : 1;
    ud.pulse = pulse;
    mesh.material.emissiveIntensity = (ud.isOwn ? 0.8 : 0.32) * pulse + Math.sin(t * 0.8 + age) * 0.035;
  }

  if (sceneState.draftMesh) {
    const target = 1.08;
    const s = sceneState.draftMesh.scale.x + (target - sceneState.draftMesh.scale.x) * 0.08;
    sceneState.draftMesh.scale.setScalar(s);
    sceneState.draftMesh.rotation.y += 0.0018;
    sceneState.draftMesh.position.y = Math.sin(t * 0.55) * 0.22;
    sceneState.draftMesh.material.emissiveIntensity = 1.05 + Math.sin(t * 1.35) * 0.1;
  }

  if (sceneState.particles) {
    sceneState.particles.rotation.y = t * 0.006;
    sceneState.particles.rotation.x = Math.sin(t * 0.06) * 0.045;
  }

  sceneState.boardGroup.position.y = Math.sin(t * 0.08 + sceneState.driftPhase) * 0.35;
  sceneState.boardGroup.rotation.y = Math.sin(t * 0.04 + sceneState.driftPhase) * 0.08;

  sceneState.renderer.render(sceneState.scene, sceneState.camera);
}

function onResize() {
  if (!sceneState.renderer || !sceneState.camera || !ui.canvasContainer) return;
  const w = ui.canvasContainer.clientWidth;
  const h = ui.canvasContainer.clientHeight;
  sceneState.camera.aspect = w / h;
  sceneState.camera.updateProjectionMatrix();
  sceneState.renderer.setSize(w, h);
}
