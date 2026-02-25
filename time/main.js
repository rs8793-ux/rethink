/**
 * Zodiac Share Board — main entry
 * Flow: name + birth date → camera selfie → Replicate img2img → Firestore → shared board
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
  onSnapshot,
  doc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

// ─── Config (paste your Firebase config here) ───────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyDq9J1FHvKapMrudjGme9vCWsOskJBgiT8",
  authDomain: "sharemind-29201.firebaseapp.com",
  projectId: "sharemind-29201",
  storageBucket: "sharemind-29201.appspot.com",
  messagingSenderId: "1013206091666",
  appId: "1:1013206091666:web:dc20a4dd215d406fda634b",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ─── Constants ──────────────────────────────────────────────────────────────
const TOKEN_KEY = "replicate_proxy_token_v1";
const POSTS_COL = "posts";

/** Preferred video size for capture (Replicate often expects reasonable resolution) */
const VIDEO_CONSTRAINTS = {
  video: {
    facingMode: "user",
    width: { ideal: 640 },
    height: { ideal: 480 },
  },
  audio: false,
};

// ─── DOM refs ──────────────────────────────────────────────────────────────
const openBtn = document.getElementById("openBtn");
const closeBtn = document.getElementById("closeBtn");
const snapBtn = document.getElementById("snapBtn");
const retakeBtn = document.getElementById("retakeBtn");
const postBtn = document.getElementById("postBtn");
const saveTokenBtn = document.getElementById("saveTokenBtn");
const tokenInput = document.getElementById("tokenInput");
const modelSelect = document.getElementById("modelSelect");
const styleSelect = document.getElementById("styleSelect");
const nameInput = document.getElementById("nameInput");
const dateInput = document.getElementById("dateInput");
const video = document.getElementById("video");
const previewImg = document.getElementById("previewImg");
const previewLabel = document.getElementById("previewLabel");
const previewBox = document.querySelector(".previewBox");
const statusEl = document.getElementById("status");
const cap = document.getElementById("cap");
const grid = document.getElementById("grid");
const countPill = document.getElementById("countPill");

const ctx = cap ? cap.getContext("2d") : null;

// ─── State ─────────────────────────────────────────────────────────────────
let mediaStream = null;
let selfieBase64 = null;

// ─── Helpers ──────────────────────────────────────────────────────────────
function setStatus(msg) {
  if (statusEl) statusEl.textContent = msg;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/** Show camera live state: video visible, photo hidden (CSS drives visibility via .is-live) */
function showCameraLive() {
  if (previewBox) {
    previewBox.classList.remove("has-photo");
    previewBox.classList.add("is-live");
  }
  if (previewLabel) previewLabel.textContent = "Camera preview";
}

/** Show captured photo state: photo visible, video hidden (CSS via .has-photo) */
function showPhotoCaptured() {
  if (previewBox) {
    previewBox.classList.remove("is-live");
    previewBox.classList.add("has-photo");
  }
  if (previewLabel) previewLabel.textContent = "Selfie captured";
}

// ─── Token (local only) ────────────────────────────────────────────────────
/** Remove common paste artifacts (semicolons, commas, newlines) so the JWT is valid */
function sanitizeToken(raw) {
  if (typeof raw !== "string") return "";
  return raw
    .trim()
    .replace(/[;,]\s*$/, "")   // trailing semicolon or comma
    .replace(/\s+/g, "")       // any stray spaces/newlines in the middle
    .trim();
}

function loadToken() {
  const t = localStorage.getItem(TOKEN_KEY);
  if (tokenInput && t) tokenInput.value = t;
}

function saveToken() {
  const t = sanitizeToken(tokenInput?.value ?? "");
  if (!t) {
    setStatus("Paste your token in the box first (get it from itp-ima-replicate-proxy.web.app).");
    return;
  }
  localStorage.setItem(TOKEN_KEY, t);
  if (tokenInput) tokenInput.value = t;
  setStatus("Token saved. You can now Open Camera → Take Photo → Generate + Post.");
}

if (saveTokenBtn) saveTokenBtn.addEventListener("click", saveToken);
loadToken();

// ─── Camera ───────────────────────────────────────────────────────────────

/**
 * Map getUserMedia errors to user-friendly messages.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia#exceptions
 */
function getCameraErrorMessage(err) {
  if (!err || !err.name) return "Camera error. Please try again.";
  switch (err.name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      return "Camera permission denied. Allow camera access in your browser and try again.";
    case "NotFoundError":
      return "No camera found. Connect a camera and refresh.";
    case "NotReadableError":
      return "Camera is in use by another app. Close other apps using the camera and try again.";
    case "OverconstrainedError":
      return "Camera doesn't support requested settings. Try again or use another device.";
    case "TypeError":
      return "Invalid camera constraints. Please refresh the page.";
    case "SecurityError":
      return "Camera only works on HTTPS (or localhost).";
    default:
      return `Camera error: ${err.message || err.name}. Try again.`;
  }
}

/** Stop all tracks of the current stream and clear video. */
function stopCameraStream() {
  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop());
    mediaStream = null;
  }
  if (video) {
    video.srcObject = null;
  }
}

/**
 * Open camera and attach stream to <video>.
 * Ensures stream is playing before enabling "Take Photo".
 */
async function openCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    setStatus("Camera not supported. Use HTTPS and a modern browser.");
    return;
  }

  setStatus("Opening camera…");
  openBtn.disabled = true;

  // Stop any existing stream so the same device can be acquired again
  stopCameraStream();

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia(VIDEO_CONSTRAINTS);
  } catch (err) {
    console.error("getUserMedia error:", err);
    setStatus(getCameraErrorMessage(err));
    openBtn.disabled = false;
    return;
  }

  if (!video) {
    stopCameraStream();
    setStatus("Video element not found.");
    openBtn.disabled = false;
    return;
  }

  video.srcObject = mediaStream;
  video.muted = true; // required for autoplay in most browsers
  video.playsInline = true;

  try {
    await video.play();
  } catch (playErr) {
    console.error("video.play error:", playErr);
    stopCameraStream();
    setStatus("Could not start video. Try again.");
    openBtn.disabled = false;
    return;
  }

  // Wait until we have valid dimensions (video is really ready)
  const waitForVideoReady = () =>
    new Promise((resolve) => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        resolve();
        return;
      }
      const onLoaded = () => {
        video.removeEventListener("loadeddata", onLoaded);
        video.removeEventListener("loadedmetadata", onLoaded);
        resolve();
      };
      video.addEventListener("loadeddata", onLoaded);
      video.addEventListener("loadedmetadata", onLoaded);
      // Fallback: resolve after short delay in case events already fired
      setTimeout(resolve, 500);
    });

  await waitForVideoReady();

  showCameraLive();
  if (snapBtn) snapBtn.disabled = false;
  if (closeBtn) closeBtn.disabled = false;
  if (retakeBtn) retakeBtn.disabled = true;
  if (postBtn) postBtn.disabled = true;
  openBtn.disabled = false;
  setStatus("Camera on. Click “Take Photo”.");
}

function closeCamera() {
  stopCameraStream();
  if (snapBtn) snapBtn.disabled = true;
  if (closeBtn) closeBtn.disabled = true;

  if (selfieBase64) {
    if (previewImg) previewImg.src = selfieBase64;
    showPhotoCaptured();
    if (retakeBtn) retakeBtn.disabled = false;
    if (postBtn) postBtn.disabled = false;
    setStatus("Camera closed. Photo kept. You can still Generate + Post.");
  } else {
    previewBox?.classList.remove("is-live", "has-photo");
    if (previewImg) previewImg.removeAttribute("src");
    if (retakeBtn) retakeBtn.disabled = true;
    if (postBtn) postBtn.disabled = true;
    if (previewLabel) previewLabel.textContent = "Camera preview";
    setStatus("Camera closed.");
  }
}

/**
 * Capture current video frame to canvas and return as base64 data URL (JPEG).
 * Call only when video has valid dimensions.
 */
function captureFrameToBase64() {
  if (!cap || !ctx || !video) return null;
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) return null;

  cap.width = w;
  cap.height = h;
  ctx.drawImage(video, 0, 0, w, h);
  return cap.toDataURL("image/jpeg", 0.92);
}

function takePhoto() {
  if (!video.videoWidth || !video.videoHeight) {
    setStatus("Camera not ready yet. Wait a moment and try again.");
    return;
  }

  const dataUrl = captureFrameToBase64();
  if (!dataUrl) {
    setStatus("Capture failed. Try again.");
    return;
  }

  selfieBase64 = dataUrl;
  previewImg.src = dataUrl;
  showPhotoCaptured();

  if (retakeBtn) retakeBtn.disabled = false;
  if (postBtn) postBtn.disabled = false;
  setStatus("Photo captured. Click “Generate + Post”.");
}

function retake() {
  selfieBase64 = null;
  previewImg.src = "";
  previewImg.removeAttribute("src");
  showCameraLive();
  if (postBtn) postBtn.disabled = true;
  setStatus("Retake. Click “Take Photo”.");
}

if (openBtn) openBtn.addEventListener("click", openCamera);
if (closeBtn) closeBtn.addEventListener("click", closeCamera);
if (snapBtn) snapBtn.addEventListener("click", takePhoto);
if (retakeBtn) retakeBtn.addEventListener("click", retake);
window.addEventListener("beforeunload", stopCameraStream);

// ─── Zodiac ───────────────────────────────────────────────────────────────
function getSunSign(month, day) {
  const md = month * 100 + day;
  if (md >= 321 && md <= 419) return "Aries";
  if (md >= 420 && md <= 520) return "Taurus";
  if (md >= 521 && md <= 620) return "Gemini";
  if (md >= 621 && md <= 722) return "Cancer";
  if (md >= 723 && md <= 822) return "Leo";
  if (md >= 823 && md <= 922) return "Virgo";
  if (md >= 923 && md <= 1022) return "Libra";
  if (md >= 1023 && md <= 1121) return "Scorpio";
  if (md >= 1122 && md <= 1221) return "Sagittarius";
  if (md >= 1222 || md <= 119) return "Capricorn";
  if (md >= 120 && md <= 218) return "Aquarius";
  return "Pisces";
}

const ELEMENT_BY_SIGN = {
  Aries: "Fire", Leo: "Fire", Sagittarius: "Fire",
  Taurus: "Earth", Virgo: "Earth", Capricorn: "Earth",
  Gemini: "Air", Libra: "Air", Aquarius: "Air",
  Cancer: "Water", Scorpio: "Water", Pisces: "Water",
};

function computeZodiac(dateStr) {
  const parts = dateStr.split("-").map(Number);
  const mm = parts[1];
  const dd = parts[2];
  const sun = getSunSign(mm, dd);
  const element = ELEMENT_BY_SIGN[sun] || "Unknown";
  return { sun, element };
}

// ─── Replicate proxy (img2img) ─────────────────────────────────────────────
/** Max size for data URL (Replicate recommends ≤256KB). Resize image to stay under. */
const MAX_IMAGE_PX = 512;
const JPEG_QUALITY_FOR_API = 0.82;

/**
 * Resize a data URL to max MAX_IMAGE_PX on the long edge and re-encode as JPEG.
 * Keeps request under Replicate's recommended size and avoids "Internal server error".
 */
function resizeDataUrlToDataUrl(dataUrl, maxPx = MAX_IMAGE_PX, quality = JPEG_QUALITY_FOR_API) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const w = img.width;
      const h = img.height;
      const scale = Math.min(1, maxPx / Math.max(w, h));
      const outW = Math.round(w * scale);
      const outH = Math.round(h * scale);
      if (outW < 1 || outH < 1) {
        resolve(dataUrl);
        return;
      }
      const c = document.createElement("canvas");
      c.width = outW;
      c.height = outH;
      const cx = c.getContext("2d");
      cx.drawImage(img, 0, 0, outW, outH);
      resolve(c.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => reject(new Error("Could not load image for resize"));
    img.src = dataUrl;
  });
}

/**
 * Build Replicate input by model.
 * - Gemini 2.5 Flash Image: prompt + image_input (array)
 * - PhotoMaker: input_image + num_steps
 * - SDXL / generic: image + strength + num_inference_steps
 */
function buildReplicateInput(model, prompt, imageDataUrl) {
  const m = String(model);
  if (m.includes("gemini-2.5-flash-image")) {
    return {
      prompt,
      image_input: [imageDataUrl],
      aspect_ratio: "match_input_image",
      output_format: "jpg",
    };
  }
  if (m.includes("photomaker")) {
    return {
      prompt,
      input_image: imageDataUrl,
      num_steps: 50,
    };
  }
  return {
    prompt,
    image: imageDataUrl,
    strength: 0.65,
    num_inference_steps: 28,
    guidance_scale: 7,
    width: 768,
    height: 1024,
  };
}

async function replicateImageToImage({ token, model, prompt, imageBase64 }) {
  const url = "https://itp-ima-replicate-proxy.web.app/api/create_n_get";

  const cleanToken = sanitizeToken(token);
  if (!cleanToken) throw new Error("Token is empty. Paste a valid token and click Save Token.");

  const resizedImage = await resizeDataUrlToDataUrl(imageBase64);
  const input = buildReplicateInput(model, prompt, resizedImage);
  const payload = { model, input };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${cleanToken}`,
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.error || json?.message || json?.detail || res.statusText || "Request failed";
    console.error("Replicate proxy error:", res.status, "Response:", json);
    if (res.status === 401) throw new Error("Token invalid or expired. Get a new token at itp-ima-replicate-proxy.web.app and Save Token.");
    throw new Error(msg);
  }

  let out = json.output;
  if (typeof out === "string") return out;
  if (Array.isArray(out) && out.length > 0) {
    const first = out[0];
    if (typeof first === "string") return first;
    if (first && typeof first.url === "string") return first.url;
  }

  console.error("Replicate raw response:", json);
  throw new Error("Could not parse image URL from model output.");
}

async function imageUrlToBase64(url) {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ─── Firestore ────────────────────────────────────────────────────────────
async function savePostToFirestore(post) {
  const colRef = collection(db, POSTS_COL);
  const docRef = await addDoc(colRef, {
    ...post,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

function subscribeBoard() {
  const q = query(
    collection(db, POSTS_COL),
    orderBy("createdAt", "desc"),
    limit(60)
  );
  onSnapshot(
    q,
    (snap) => {
      const items = [];
      snap.forEach((doc) => items.push({ id: doc.id, ...doc.data() }));
      renderBoard(items);
    },
    (err) => {
      console.error("Firestore subscribe error:", err);
      setStatus("Board load failed. Check Firebase config and rules.");
    }
  );
}

/** Simple hash of string to number for consistent floating style per post id */
function hashId(id) {
  let h = 0;
  const s = String(id);
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

async function deletePost(postId) {
  try {
    await deleteDoc(doc(db, POSTS_COL, postId));
    setStatus("Post removed.");
  } catch (err) {
    console.error("Delete failed:", err);
    setStatus("Could not delete. Check Firestore rules.");
  }
}

function renderBoard(items) {
  if (!grid) return;
  countPill.textContent = `${items.length} posts`;
  grid.innerHTML = "";

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const imgSrc = it.cartoonBase64 || "";
    const name = it.name || "Anonymous";
    const date = it.birthday || "";
    const sun = it.sun || "";
    const element = it.element || "";
    const postId = it.id || "";

    const h = hashId(postId);
    const rot = (h % 7) - 3;
    const dx = (h % 11) - 5;
    const dy = (h % 13) - 6;

    const el = document.createElement("div");
    el.className = "card card--float";
    el.dataset.postId = postId;
    el.style.setProperty("--rot", `${rot}deg`);
    el.style.setProperty("--dx", `${dx}px`);
    el.style.setProperty("--dy", `${dy}px`);
    el.style.setProperty("--z", String(h % 10));
    el.innerHTML = `
      <button type="button" class="card-delete" title="Delete post" aria-label="Delete post">×</button>
      <img src="${imgSrc}" alt="cartoon" loading="lazy" />
      <div class="meta">
        <div class="name">${escapeHtml(name)}</div>
        <div class="small">${escapeHtml(date)} • ${escapeHtml(sun)} (${escapeHtml(element)})</div>
      </div>
    `;
    const btn = el.querySelector(".card-delete");
    if (btn) btn.addEventListener("click", (e) => { e.stopPropagation(); deletePost(postId); });
    grid.appendChild(el);
  }
}

subscribeBoard();

// ─── Generate + Post ────────────────────────────────────────────────────
function buildPrompt({ sun, element, style }) {
  return [
    "Turn the input selfie into a clean cartoon portrait card.",
    "Keep face recognizable and friendly.",
    "Black background, minimal stars, white clean typography.",
    `Zodiac theme: ${sun} (${element}).`,
    `Style: ${style}.`,
    "No watermark. High quality. Centered portrait.",
  ].join(" ");
}

async function generateAndPost() {
  const name = nameInput?.value?.trim() || "Anonymous";
  const birthday = dateInput?.value;
  const token = sanitizeToken(tokenInput?.value || localStorage.getItem(TOKEN_KEY) || "");

  if (!token) {
    setStatus("Missing token. Get one at itp-ima-replicate-proxy.web.app → paste above → click Save Token.");
    tokenInput?.focus();
    return;
  }
  if (!birthday) {
    setStatus("Pick your birthday first.");
    return;
  }
  if (!selfieBase64) {
    setStatus("Take a selfie first: Open Camera → Take Photo.");
    return;
  }

  const { sun, element } = computeZodiac(birthday);
  const model = modelSelect?.value;
  const style = styleSelect?.value;
  const prompt = buildPrompt({ sun, element, style });

  try {
    postBtn.disabled = true;
    setStatus("Generating cartoon…");

    const imageUrl = await replicateImageToImage({
      token,
      model,
      prompt,
      imageBase64: selfieBase64,
    });

    setStatus("Saving to board…");
    const cartoonBase64 = await imageUrlToBase64(imageUrl);

    await savePostToFirestore({
      name,
      birthday,
      sun,
      element,
      prompt,
      cartoonBase64,
    });

    setStatus(`Posted: ${name} • ${sun} (${element})`);
  } catch (err) {
    console.error("Generate/Post error:", err);
    const msg = err?.message || String(err);
    if (msg.startsWith("Token")) setStatus(msg);
    else setStatus(`Failed: ${msg}`);
  } finally {
    if (postBtn) postBtn.disabled = false;
  }
}

if (postBtn) postBtn.addEventListener("click", generateAndPost);

// ─── Initial status ────────────────────────────────────────────────────────
setStatus("1) Save token  2) Open Camera  3) Take Photo  4) Generate + Post");
