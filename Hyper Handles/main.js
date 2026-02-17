let canvas;
let ctx;

let panel;
let inspectPanel;

let dateInput;
let timeInput;
let statusDiv;
let aboutInput;

let me = null;
let users = [];
let points = [];

let highlightedUserId = null;
let hoveredPointId = null;
let similarityMode = "similar"; // "similar" | "different"

let UMAP = null;

const STORAGE_KEY = "astro_handles_users_v1";

const CONTENT_LEFT = 400;
const CONTENT_RIGHT_OFFSET = 320;
const CONTENT_TOP = 100;
const CONTENT_BOTTOM = 60;

async function loadUMAP() {
  if (UMAP != null) return;
  try {
    const m = await import("https://cdn.jsdelivr.net/npm/umap-js@1.4.0/+esm");
    UMAP = m.UMAP ?? m.default?.UMAP ?? m.default;
  } catch (_) {
    UMAP = null;
  }
}

function init() {
  initInterface();
  loadData();
  syncMeToInputs();
  runUMAPIfNeeded().then(() => {
    rebuildPoints();
    draw();
    renderSimilarityList();
  });
}

function syncMeToInputs() {
  if (!me) return;
  if (dateInput) dateInput.value = me.dateStr || "";
  if (timeInput) timeInput.value = me.timeStr || "12:00";
  if (aboutInput) aboutInput.value = me.about || "";
}

// Run after layout so canvas gets correct dimensions
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => loadUMAP().then(init));
} else {
  loadUMAP().then(init);
}

function initInterface() {
  // Canvas
  canvas = document.createElement("canvas");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  ctx = canvas.getContext("2d");

  // Controls panel
  panel = document.createElement("div");
  panel.className = "panel";
  panel.innerHTML = `
    <h1>Astro Handles (Sun + Rising)</h1>

    <div class="row">
      <label>Birthday (Sun)</label>
      <input id="birthDate" type="date" />
    </div>

    <div class="row">
      <label>Birth Time (Rising)</label>
      <input id="birthTime" type="time" value="12:00" />
    </div>

    <div class="row">
      <label>About me (optional personality text)</label>
      <textarea id="aboutMe" rows="3" placeholder="e.g. I love hiking and indie music"></textarea>
    </div>

    <div class="buttons">
      <button id="btnMe">Update Me</button>
      <button id="btnGod">God +10</button>
      <button id="btnClear">Clear</button>
    </div>

    <div class="small" id="status">Ready.</div>
    <div class="small">Virtual users only. Generated for exploration.</div>
  `;
  document.body.appendChild(panel);

  // Inspect panel (left part: inspect; we'll add similarity section below it in same panel or separate)
  inspectPanel = document.createElement("div");
  inspectPanel.className = "inspect";
  inspectPanel.innerHTML = `
    <div class="inspect-details" id="inspectDetails"><div class="small">Click a dot to view details.</div></div>
    <div class="similarity-section" id="similaritySection">
      <div class="small" style="margin-bottom:6px;"><b>Closest users in embedding space</b></div>
      <div class="similarity-toggle">
        <button type="button" id="btnSimilar" class="toggle-active">Most similar</button>
        <button type="button" id="btnDifferent">Most different</button>
      </div>
      <ul class="similarity-list" id="similarityList"></ul>
    </div>
  `;
  document.body.appendChild(inspectPanel);

  dateInput = document.getElementById("birthDate");
  timeInput = document.getElementById("birthTime");
  aboutInput = document.getElementById("aboutMe");
  statusDiv = document.getElementById("status");

  document.getElementById("btnMe").addEventListener("click", updateMe);
  document.getElementById("btnGod").addEventListener("click", () => addGodUsers(10));
  document.getElementById("btnClear").addEventListener("click", clearAll);
  document.getElementById("btnSimilar").addEventListener("click", () => { similarityMode = "similar"; renderSimilarityList(); });
  document.getElementById("btnDifferent").addEventListener("click", () => { similarityMode = "different"; renderSimilarityList(); });

  window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    rebuildPoints();
    draw();
  });

  canvas.addEventListener("mousedown", onCanvasClick);
  canvas.addEventListener("mousemove", onCanvasMouseMove);
  canvas.addEventListener("mouseleave", () => { hoveredPointId = null; draw(); });
}

function setStatus(msg) {
  statusDiv.textContent = msg;
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ me, users }));
}

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    me = parsed.me || null;
    users = parsed.users || [];
  } catch (e) {
    me = null;
    users = [];
  }
}

async function runUMAPIfNeeded() {
  const all = [];
  if (me && me.embedding) all.push(me);
  users.forEach(u => { if (u.embedding) all.push(u); });
  if (all.length < 2) {
    if (me && me.embedding) me.umap = { x: 0.5, y: 0.5 };
    users.forEach(u => { if (u.embedding) u.umap = { x: 0.5, y: 0.5 }; });
    return;
  }

  const embeddings = all.map(u => u.embedding);
  let coords2d;

  if (UMAP && typeof UMAP === "function") {
    setStatus("Computing UMAP...");
    const umap = new UMAP({ nComponents: 2, nNeighbors: Math.min(15, all.length - 1), minDist: 0.1 });
    coords2d = await umap.fitAsync(embeddings, () => { });
  } else {
    const xs = embeddings.map(e => e[0] ?? 0);
    const ys = embeddings.map(e => e[1] ?? 0);
    const minX = Math.min(...xs), maxX = Math.max(...xs) || 1;
    const minY = Math.min(...ys), maxY = Math.max(...ys) || 1;
    coords2d = embeddings.map((e, i) => [
      (xs[i] - minX) / (maxX - minX),
      (ys[i] - minY) / (maxY - minY)
    ]);
  }

  all.forEach((u, i) => { u.umap = { x: coords2d[i][0], y: coords2d[i][1] }; });
}

function clearAll() {
  me = null;
  users = [];
  points = [];
  highlightedUserId = null;
  hoveredPointId = null;
  localStorage.removeItem(STORAGE_KEY);
  const detailsEl = document.getElementById("inspectDetails");
  if (detailsEl) detailsEl.innerHTML = "<div class=\"small\">Click a dot to view details.</div>";
  renderSimilarityList();
  setStatus("Cleared.");
  draw();
}

// ---------- Core idea: Sun + Rising + About -> profile text -> embedding ----------
async function updateMe() {
  const dateStr = dateInput.value;
  const timeStr = timeInput.value || "12:00";
  if (!dateStr) {
    setStatus("Pick a birthday first.");
    return;
  }

  const { sun, rising } = computeSunRising(dateStr, timeStr);
  const about = (aboutInput && aboutInput.value && aboutInput.value.trim()) ? aboutInput.value.trim() : "";
  const profileText = about ? `Sun: ${sun}. Rising: ${rising}. About: ${about}.` : `Sun: ${sun}. Rising: ${rising}.`;

  setStatus("Embedding you...");
  document.body.style.cursor = "progress";

  try {
    const embedding = await askEmbedding(profileText);
    me = {
      id: "me",
      kind: "me",
      dateStr,
      timeStr,
      sun,
      rising,
      about: about || undefined,
      text: profileText,
      embedding
    };
    saveData();
    await runUMAPIfNeeded();
    rebuildPoints();
    draw();
    renderSimilarityList();
    setStatus(`Me updated: Sun ${sun}, Rising ${rising}.`);
  } catch (e) {
    setStatus("Embedding failed. Check token / model input.");
  } finally {
    document.body.style.cursor = "auto";
  }
}

async function addGodUsers(count) {
  if (!me) {
    setStatus("Update Me first.");
    return;
  }

  setStatus(`Generating ${count} virtual users...`);
  document.body.style.cursor = "progress";

  try {
    for (let i = 0; i < count; i++) {
      const u = makeVirtualUser();
      const embedding = await askEmbedding(u.text);
      u.embedding = embedding;
      users.push(u);
      setStatus(`Generated ${i + 1}/${count}...`);
    }
    saveData();
    await runUMAPIfNeeded();
    rebuildPoints();
    draw();
    renderSimilarityList();
    setStatus(`Added ${count} virtual users.`);
  } catch (e) {
    setStatus("God generation failed. Check token / model input.");
  } finally {
    document.body.style.cursor = "auto";
  }
}

// ---------- Teacher-style fetch (same proxy, same data shape) ----------
async function askEmbedding(text) {
  const url = "https://itp-ima-replicate-proxy.web.app/api/create_n_get";
  // Get token from: https://itp-ima-replicate-proxy.web.app/
  let authToken = ""; // Get token from https://itp-ima-replicate-proxy.web.app/ — do not commit

  const data = {
    model: "beautyyuyanli/multilingual-e5-large:a06276a89f1a902d5fc225a9ca32b6e8e6292b7f3b136518878da97c458e2bad",
    input: {
      // many embedding models accept one of these fields; we try "text" first (most common)
      text: text
    }
  };

  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${authToken}`
    },
    body: JSON.stringify(data)
  };

  const raw = await fetch(url, options);
  const json = await raw.json();

  // Parse embedding from common output shapes
  let out = json.output;
  if (out == null && json.out != null) out = json.out;
  if (out == null && Array.isArray(json)) out = json;

  if (Array.isArray(out) && out.length > 0) {
    if (typeof out[0] === "number") return out;
    if (Array.isArray(out[0]) && typeof out[0][0] === "number") return out[0];
  }
  if (out && typeof out === "object" && Array.isArray(out.embedding)) return out.embedding;
  if (out && typeof out === "object" && Array.isArray(out.embeddings)) return out.embeddings[0];

  throw new Error("Could not parse embedding output. Got: " + JSON.stringify(Object.keys(json)).slice(0, 80));
}

// ---------- Drawing / visualization (UMAP 2D space) ----------
function rebuildPoints() {
  points = [];
  const all = [];
  if (me) all.push(me);
  all.push(...users);

  if (all.length === 0) return;

  const contentLeft = CONTENT_LEFT;
  const contentRight = canvas.width - CONTENT_RIGHT_OFFSET;
  const contentTop = CONTENT_TOP;
  const contentBottom = canvas.height - CONTENT_BOTTOM;
  const contentW = Math.max(100, contentRight - contentLeft);
  const contentH = Math.max(100, contentBottom - contentTop);

  const withUmap = all.every(u => u.umap != null);
  if (!withUmap) return;

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  all.forEach(u => {
    const ux = u.umap.x, uy = u.umap.y;
    if (Number.isFinite(ux)) { minX = Math.min(minX, ux); maxX = Math.max(maxX, ux); }
    if (Number.isFinite(uy)) { minY = Math.min(minY, uy); maxY = Math.max(maxY, uy); }
  });
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const singlePoint = all.length === 1;

  for (let i = 0; i < all.length; i++) {
    const u = all[i];
    const ux = u.umap.x != null ? u.umap.x : 0.5;
    const uy = u.umap.y != null ? u.umap.y : 0.5;
    const nx = singlePoint ? 0.5 : (Number.isFinite(ux) ? (ux - minX) / rangeX : 0.5);
    const ny = singlePoint ? 0.5 : (Number.isFinite(uy) ? (uy - minY) / rangeY : 0.5);
    const x = contentLeft + nx * contentW;
    const y = contentTop + ny * contentH;

    let sim = null;
    if (me && u.id !== "me" && me.embedding && u.embedding) {
      sim = cosineSimilarity(me.embedding, u.embedding);
    }

    points.push({
      id: u.id,
      x,
      y,
      r: u.id === "me" ? 10 : 6,
      isMe: u.id === "me",
      sim
    });
  }

  points.sort((a, b) => {
    if (a.isMe && !b.isMe) return 1;
    if (!a.isMe && b.isMe) return -1;
    return (a.sim ?? -999) - (b.sim ?? -999);
  });
}

function draw() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
    rebuildPoints();
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.font = "14px Arial";
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.fillText("Embedding space (Sun + Rising). Click dots to inspect.", 20, 70);

  for (const p of points) {
    const x = Number(p.x);
    const y = Number(p.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;

    const isHighlight = p.id === highlightedUserId || p.id === hoveredPointId;
    const r = p.r + (isHighlight ? 4 : 0);

    if (p.isMe || (p.sim != null && p.sim > 0.5)) {
      ctx.beginPath();
      ctx.arc(x, y, r + 8, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    if (p.isMe) {
      ctx.fillStyle = "rgba(255,255,255,0.95)";
    } else {
      const t = p.sim == null ? 0.5 : clamp01((p.sim + 1) / 2);
      ctx.fillStyle = `rgba(255,255,255,${0.25 + 0.65 * t})`;
    }
    ctx.fill();

    if (isHighlight) {
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, r + 4, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

function onCanvasClick(e) {
  const mx = e.clientX;
  const my = e.clientY;
  for (let i = points.length - 1; i >= 0; i--) {
    const p = points[i];
    const d = Math.hypot(mx - p.x, my - p.y);
    if (d <= p.r + 4) {
      const u = getById(p.id);
      highlightedUserId = u && u.id !== "me" ? u.id : null;
      showInspect(u);
      draw();
      break;
    }
  }
}

function onCanvasMouseMove(e) {
  const mx = e.clientX;
  const my = e.clientY;
  let found = null;
  for (let i = points.length - 1; i >= 0; i--) {
    const p = points[i];
    if (Math.hypot(mx - p.x, my - p.y) <= p.r + 4) {
      found = p.id;
      break;
    }
  }
  if (found !== hoveredPointId) {
    hoveredPointId = found;
    draw();
  }
}

function getTopUsersBySimilarity(count = 5, mostSimilar = true) {
  if (!me || !me.embedding || users.length === 0) return [];
  const withSim = users
    .filter(u => u.embedding)
    .map(u => ({ u, sim: cosineSimilarity(me.embedding, u.embedding) }));
  withSim.sort((a, b) => mostSimilar ? b.sim - a.sim : a.sim - b.sim);
  return withSim.slice(0, count).map(x => ({ id: x.u.id, sim: x.sim, user: x.u }));
}

function renderSimilarityList() {
  const listEl = document.getElementById("similarityList");
  const detailsEl = document.getElementById("inspectDetails");
  if (!listEl) return;

  const top = getTopUsersBySimilarity(5, similarityMode === "similar");
  listEl.innerHTML = "";
  if (!me || top.length === 0) {
    listEl.innerHTML = "<li class=\"small\">Update Me and add users to see closest.</li>";
    return;
  }

  const label = similarityMode === "similar" ? "Most similar" : "Most different";
  top.forEach(({ id, sim, user }) => {
    const li = document.createElement("li");
    li.className = "similarity-item small";
    li.textContent = `${user.sun} / ${user.rising} (${sim.toFixed(3)})`;
    li.dataset.userId = id;
    li.addEventListener("click", () => {
      highlightedUserId = id;
      showInspect(user);
      draw();
    });
    listEl.appendChild(li);
  });

  const btnSimilar = document.getElementById("btnSimilar");
  const btnDifferent = document.getElementById("btnDifferent");
  if (btnSimilar) btnSimilar.classList.toggle("toggle-active", similarityMode === "similar");
  if (btnDifferent) btnDifferent.classList.toggle("toggle-active", similarityMode === "different");
}

function showInspect(u) {
  const detailsEl = document.getElementById("inspectDetails");
  if (!detailsEl) return;
  if (!u) {
    detailsEl.innerHTML = "<div class=\"small\">Click a dot to view details.</div>";
    return;
  }

  let simText = "";
  if (me && u.id !== "me" && me.embedding && u.embedding) {
    simText = `Embedding similarity: ${cosineSimilarity(me.embedding, u.embedding).toFixed(3)}`;
  }

  let matchText = "";
  if (me && u.id !== "me" && u.sun) {
    const level = getZodiacMatchLevel(u, me);
    matchText = level === 0 ? "Same Sun sign (closest)" : level === 1 ? `Same element — ${escapeHtml(getElement(u.sun) || "")} (second)` : "Different element (farthest)";
  }

  detailsEl.innerHTML = `
    <div class="small"><b>Type:</b> ${escapeHtml(u.kind)}</div>
    <div class="small"><b>Sun:</b> ${escapeHtml(u.sun)} &nbsp; <b>Rising:</b> ${escapeHtml(u.rising)}</div>
    <div class="small"><b>Birth:</b> ${escapeHtml(u.dateStr)} ${escapeHtml(u.timeStr)}</div>
    ${matchText ? `<div class="small"><b>Match:</b> ${matchText}</div>` : ""}
    <div class="small" style="margin-top:8px;"><b>Text:</b></div>
    <div class="small" style="opacity:0.75; line-height:1.35;">${escapeHtml(u.text)}</div>
    ${simText ? `<div class="small" style="margin-top:10px;"><b>${escapeHtml(simText)}</b></div>` : ""}
  `;
}

function getById(id) {
  if (me && me.id === id) return me;
  return users.find(u => u.id === id) || null;
}

// ---------- Sun + Rising rules ----------
function computeSunRising(dateStr, timeStr) {
  const [yyyy, mm, dd] = dateStr.split("-").map(Number);
  const [hh] = timeStr.split(":").map(Number);

  const sun = getSunSign(mm, dd);
  const rising = getRisingSign(sun, hh);
  return { sun, rising };
}

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

// Zodiac elements: same sign = closest, same element = second closest
const ELEMENT_BY_SIGN = {
  Aries: "Fire", Taurus: "Earth", Gemini: "Air", Cancer: "Water",
  Leo: "Fire", Virgo: "Earth", Libra: "Air", Scorpio: "Water",
  Sagittarius: "Fire", Capricorn: "Earth", Aquarius: "Air", Pisces: "Water"
};

function getElement(sign) {
  return ELEMENT_BY_SIGN[sign] || null;
}

// Match level vs "me": 0 = same Sun (closest), 1 = same element (second), 2 = different element (farthest)
function getZodiacMatchLevel(user, meUser) {
  if (!meUser || !user.sun) return 2;
  if (user.sun === meUser.sun) return 0;
  if (getElement(user.sun) === getElement(meUser.sun)) return 1;
  return 2;
}

function getTimeSlotIndex(hour) {
  const h = ((hour - 1) % 12 + 12) % 12; // 0..11
  return Math.floor(h / 2); // 0..5
}

const ASC_TABLE = {
  Aries: ["Sagittarius", "Capricorn", "Aquarius", "Pisces", "Aries", "Taurus"],
  Taurus: ["Capricorn", "Aquarius", "Pisces", "Aries", "Taurus", "Gemini"],
  Gemini: ["Aquarius", "Pisces", "Aries", "Taurus", "Gemini", "Cancer"],
  Cancer: ["Pisces", "Aries", "Taurus", "Gemini", "Cancer", "Leo"],
  Leo: ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo"],
  Virgo: ["Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra"],
  Libra: ["Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio"],
  Scorpio: ["Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius"],
  Sagittarius: ["Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn"],
  Capricorn: ["Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius"],
  Aquarius: ["Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"],
  Pisces: ["Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces", "Aries"]
};

function getRisingSign(sunSign, hour) {
  return ASC_TABLE[sunSign][getTimeSlotIndex(hour)];
}

// ---------- Virtual user generation ----------
function makeVirtualUser() {
  const dateStr = randomDateBetween(1990, 2007);
  const timeStr = randomTime();

  const { sun, rising } = computeSunRising(dateStr, timeStr);

  const vibe = pick([
    "quiet and reflective",
    "high-energy and playful",
    "calm and focused",
    "curious and social",
    "art-driven and sensitive",
    "ambitious and organized"
  ]);

  const interest = pick([
    "design", "music", "film", "gaming", "fashion", "drawing", "coding", "photography"
  ]);

  const text = `Sun: ${sun}. Rising: ${rising}. I am ${vibe}. I like ${interest}.`;

  return {
    id: "u_" + Date.now().toString(36) + "_" + Math.random().toString(16).slice(2),
    kind: "virtual",
    dateStr,
    timeStr,
    sun,
    rising,
    text,
    embedding: null
  };
}

function randomDateBetween(yMin, yMax) {
  const year = randInt(yMin, yMax);
  const month = randInt(1, 12);
  const day = randInt(1, new Date(year, month, 0).getDate());
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function randomTime() {
  const hh = randInt(0, 23);
  const mm = pick([0, 15, 30, 45]);
  return `${pad2(hh)}:${pad2(mm)}`;
}

// ---------- Math / utils ----------
function cosineSimilarity(a, b) {
  let dot = 0, magA = 0, magB = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  magA = Math.sqrt(magA);
  magB = Math.sqrt(magB);
  return dot / (magA * magB || 1);
}

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
