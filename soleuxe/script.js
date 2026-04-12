const video = document.getElementById("camera");
const canvas = document.getElementById("overlay");
const ctx = canvas.getContext("2d");
const productList = document.getElementById("productList");
const statusText = document.getElementById("statusText");
const scanButton = document.getElementById("scanButton");
const cameraStage = document.querySelector(".camera-stage");

const offCanvas = document.createElement("canvas");
const offCtx = offCanvas.getContext("2d", { willReadFrequently: true });

let cw = 0;
let ch = 0;
let animationId = null;
let frameCount = 0;

/* ── Accessories catalogue ── */

const accessories = [
  { id: "smile-charm",   name: "SMILE CHARM",   file: "assets/smile-charm.png",   scale: 0.16, rotation: -0.10 },
  { id: "cream-bow",     name: "CREAM BOW",     file: "assets/cream-bow.png",     scale: 0.24, rotation: 0 },
  { id: "silver-bow",    name: "SILVER BOW",    file: "assets/silver-bow.png",    scale: 0.22, rotation: 0 },
  { id: "silver-flower", name: "SILVER FLOWER", file: "assets/silver-flower.png", scale: 0.13, rotation: 0 },
  { id: "metal-bow",     name: "METAL BOW",     file: "assets/metal-bow.png",     scale: 0.16, rotation: 0 },
  { id: "pearl-bar",     name: "PEARL CHARM",   file: "assets/pearl-bar.png",     scale: 0.22, rotation: 0.05 },
  { id: "white-flower",  name: "WHITE FLOWER",  file: "assets/white-flower.png",  scale: 0.14, rotation: 0 }
];

const anchorDefs = {
  upperLace:  { x: 0.50, y: 0.28, label: "Lace Top" },
  laceCenter: { x: 0.50, y: 0.38, label: "Lace Mid" },
  lowerLace:  { x: 0.50, y: 0.48, label: "Lace Low" },
  sidePanel:  { x: 0.73, y: 0.48, label: "Side" },
  toeBox:     { x: 0.42, y: 0.67, label: "Toe" },
  heelSide:   { x: 0.84, y: 0.42, label: "Heel" }
};

const loadedImages = new Map();

/* ── Placed items state ── */

let placedItems = [];
let nextUid = 1;

/* ── Drag state ── */

let drag = null;
let ghostEl = null;
let nearestAnchorKey = null;
const DRAG_THRESHOLD = 10;
const SNAP_RADIUS = 55;

/* ── Tracking state (shoe detection) ── */

let shoeBox     = { x: 0, y: 0, width: 0, height: 0 };
let smoothedBox = { x: 0, y: 0, width: 0, height: 0 };
let velBox      = { x: 0, y: 0, width: 0, height: 0 };

let confidence = 0;
const CONFIDENCE_UP = 3;
const CONFIDENCE_THRESHOLD = 2;

let overlayOpacity = 0;
let manualBoost = false;
let hasEverDetected = false;
let lastStatusKey = "";

/* ══════════════════════════════════
   Preload
   ══════════════════════════════════ */

function preloadImages() {
  accessories.forEach(item => {
    const img = new Image();
    img.src = item.file;
    loadedImages.set(item.id, img);
  });
}

/* ══════════════════════════════════
   Product list (right panel)
   ══════════════════════════════════ */

function renderProductList() {
  productList.innerHTML = "";
  accessories.forEach(acc => {
    const isPlaced = placedItems.some(p => p.accessory.id === acc.id);

    const card = document.createElement("button");
    card.className = "product-card" + (isPlaced ? " placed" : "");
    card.setAttribute("data-id", acc.id);

    card.innerHTML =
      '<div class="thumb-wrap">' +
        '<img src="' + acc.file + '" alt="' + acc.name + '" draggable="false" />' +
        (isPlaced ? '<span class="placed-badge"></span>' : '') +
      '</div>' +
      '<div class="product-name">' + acc.name + '</div>';

    attachCardDrag(card, acc);
    productList.appendChild(card);
  });
}

/* ══════════════════════════════════
   Drag: panel → shoe
   ══════════════════════════════════ */

function attachCardDrag(card, acc) {
  let startX, startY, started;

  function onPointerDown(px, py, e) {
    startX = px;
    startY = py;
    started = false;
    e.preventDefault();
    document.addEventListener("touchmove",  onTouchMoveDoc, { passive: false });
    document.addEventListener("touchend",   onTouchEndDoc);
    document.addEventListener("mousemove",  onMouseMoveDoc);
    document.addEventListener("mouseup",    onMouseUpDoc);
  }

  function onPointerMove(px, py) {
    if (!started && Math.hypot(px - startX, py - startY) > DRAG_THRESHOLD) {
      started = true;
      beginDrag("panel", acc, null, px, py);
    }
    if (started) updateDrag(px, py);
  }

  function onPointerUp(px, py) {
    if (started) endDrag(px, py);
    cleanup();
  }

  function onTouchMoveDoc(e) {
    e.preventDefault();
    const t = e.touches[0];
    onPointerMove(t.clientX, t.clientY);
  }
  function onTouchEndDoc(e) {
    const t = e.changedTouches[0];
    onPointerUp(t.clientX, t.clientY);
  }
  function onMouseMoveDoc(e) { onPointerMove(e.clientX, e.clientY); }
  function onMouseUpDoc(e)   { onPointerUp(e.clientX, e.clientY); }

  function cleanup() {
    document.removeEventListener("touchmove",  onTouchMoveDoc);
    document.removeEventListener("touchend",   onTouchEndDoc);
    document.removeEventListener("mousemove",  onMouseMoveDoc);
    document.removeEventListener("mouseup",    onMouseUpDoc);
  }

  card.addEventListener("touchstart", e => {
    const t = e.touches[0];
    onPointerDown(t.clientX, t.clientY, e);
  }, { passive: false });

  card.addEventListener("mousedown", e => {
    onPointerDown(e.clientX, e.clientY, e);
  });
}

/* ══════════════════════════════════
   Drag: reposition placed item on shoe
   ══════════════════════════════════ */

function initCanvasDrag() {
  let startX, startY, started, hitItem;

  function onPointerDown(px, py, e) {
    hitItem = hitTestPlaced(px, py);
    if (!hitItem) return;
    e.preventDefault();
    e.stopPropagation();
    startX = px;
    startY = py;
    started = false;
    document.addEventListener("touchmove",  onTouchMove, { passive: false });
    document.addEventListener("touchend",   onTouchEnd);
    document.addEventListener("mousemove",  onMouseMove);
    document.addEventListener("mouseup",    onMouseUp);
  }

  function onPointerMove(px, py) {
    if (!started && Math.hypot(px - startX, py - startY) > DRAG_THRESHOLD) {
      started = true;
      beginDrag("shoe", hitItem.accessory, hitItem.uid, px, py);
    }
    if (started) updateDrag(px, py);
  }

  function onPointerUp(px, py) {
    if (started) endDrag(px, py);
    else if (hitItem) removePlaced(hitItem.uid);
    cleanup();
  }

  function onTouchMove(e)  { e.preventDefault(); const t = e.touches[0]; onPointerMove(t.clientX, t.clientY); }
  function onTouchEnd(e)   { const t = e.changedTouches[0]; onPointerUp(t.clientX, t.clientY); }
  function onMouseMove(e)  { onPointerMove(e.clientX, e.clientY); }
  function onMouseUp(e)    { onPointerUp(e.clientX, e.clientY); }

  function cleanup() {
    document.removeEventListener("touchmove",  onTouchMove);
    document.removeEventListener("touchend",   onTouchEnd);
    document.removeEventListener("mousemove",  onMouseMove);
    document.removeEventListener("mouseup",    onMouseUp);
  }

  cameraStage.addEventListener("touchstart", e => {
    const t = e.touches[0];
    onPointerDown(t.clientX, t.clientY, e);
  }, { passive: false });

  cameraStage.addEventListener("mousedown", e => {
    onPointerDown(e.clientX, e.clientY, e);
  });
}

/* ══════════════════════════════════
   Shared drag logic
   ══════════════════════════════════ */

function beginDrag(source, accessory, uid, px, py) {
  if (source === "shoe" && uid != null) {
    placedItems = placedItems.filter(p => p.uid !== uid);
  }

  drag = { source, accessory, uid };
  nearestAnchorKey = null;

  ghostEl = document.createElement("div");
  ghostEl.className = "drag-ghost";
  ghostEl.innerHTML = '<img src="' + accessory.file + '" draggable="false" />';
  document.body.appendChild(ghostEl);
  positionGhost(px, py);
  requestAnimationFrame(() => ghostEl.classList.add("visible"));
}

function updateDrag(px, py) {
  if (!drag) return;
  positionGhost(px, py);

  const cp = pageToCanvas(px, py);
  nearestAnchorKey = findNearestAnchor(cp.x, cp.y);
}

function endDrag(px, py) {
  if (!drag) return;

  const cp = pageToCanvas(px, py);
  const anchor = findNearestAnchor(cp.x, cp.y);

  if (anchor && isInsideStage(px, py)) {
    placedItems.push({
      uid: nextUid++,
      accessory: drag.accessory,
      anchorKey: anchor
    });
  }

  destroyGhost();
  drag = null;
  nearestAnchorKey = null;
  renderProductList();
}

function positionGhost(px, py) {
  if (!ghostEl) return;
  ghostEl.style.left = px + "px";
  ghostEl.style.top  = py + "px";
}

function destroyGhost() {
  if (ghostEl) {
    ghostEl.remove();
    ghostEl = null;
  }
}

/* ══════════════════════════════════
   Hit testing & coordinate helpers
   ══════════════════════════════════ */

function pageToCanvas(px, py) {
  const rect = cameraStage.getBoundingClientRect();
  return { x: px - rect.left, y: py - rect.top };
}

function isInsideStage(px, py) {
  const rect = cameraStage.getBoundingClientRect();
  return px >= rect.left && px <= rect.right && py >= rect.top && py <= rect.bottom;
}

function anchorScreenPos(key) {
  const a = anchorDefs[key];
  return {
    x: smoothedBox.x + smoothedBox.width  * a.x,
    y: smoothedBox.y + smoothedBox.height * a.y
  };
}

function findNearestAnchor(cx, cy) {
  let best = null;
  let bestDist = SNAP_RADIUS;
  for (const key of Object.keys(anchorDefs)) {
    const pos = anchorScreenPos(key);
    const d = Math.hypot(cx - pos.x, cy - pos.y);
    if (d < bestDist) { bestDist = d; best = key; }
  }
  return best;
}

function hitTestPlaced(px, py) {
  const cp = pageToCanvas(px, py);
  let best = null;
  let bestDist = 40;
  for (const item of placedItems) {
    const pos = anchorScreenPos(item.anchorKey);
    const d = Math.hypot(cp.x - pos.x, cp.y - pos.y);
    if (d < bestDist) { bestDist = d; best = item; }
  }
  return best;
}

function removePlaced(uid) {
  placedItems = placedItems.filter(p => p.uid !== uid);
  renderProductList();
}

/* ══════════════════════════════════
   Camera
   ══════════════════════════════════ */

async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: "environment" },
        width:  { ideal: 1080 },
        height: { ideal: 1920 }
      }
    });
    video.srcObject = stream;
    await new Promise(r => { video.onloadedmetadata = r; });
    resizeCanvas();
    initBox();
    run();
  } catch (err) {
    console.error(err);
    statusText.textContent = "Camera access blocked — please allow permission.";
  }
}

function resizeCanvas() {
  const rect = video.getBoundingClientRect();
  cw = Math.round(rect.width)  || 320;
  ch = Math.round(rect.height) || 560;
  canvas.width  = cw;
  canvas.height = ch;
}

function initBox() {
  shoeBox = { x: cw * 0.2, y: ch * 0.3, width: cw * 0.44, height: ch * 0.32 };
  smoothedBox = { ...shoeBox };
  velBox = { x: 0, y: 0, width: 0, height: 0 };
}

/* ══════════════════════════════════
   Math helpers
   ══════════════════════════════════ */

function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

const SMOOTH_POS  = 0.10;
const SMOOTH_SIZE = 0.07;
const DAMP = 0.70;

function smoothBoxUpdate(target) {
  ["x", "y", "width", "height"].forEach(k => {
    const rate = (k === "width" || k === "height") ? SMOOTH_SIZE : SMOOTH_POS;
    velBox[k] = velBox[k] * DAMP + (target[k] - smoothedBox[k]) * rate;
    smoothedBox[k] += velBox[k];
  });
}

/* ══════════════════════════════════
   White sneaker detector
   ══════════════════════════════════ */

const SAMPLE_W = 160;
let sampleH = 240;

function detectWhiteSneaker() {
  if (!video.videoWidth || !video.videoHeight) return null;

  sampleH = Math.round(SAMPLE_W * (video.videoHeight / video.videoWidth));
  offCanvas.width  = SAMPLE_W;
  offCanvas.height = sampleH;

  offCtx.save();
  offCtx.clearRect(0, 0, SAMPLE_W, sampleH);
  offCtx.translate(SAMPLE_W, 0);
  offCtx.scale(-1, 1);
  offCtx.drawImage(video, 0, 0, SAMPLE_W, sampleH);
  offCtx.restore();

  const data = offCtx.getImageData(0, 0, SAMPLE_W, sampleH).data;
  const roiX0 = Math.floor(SAMPLE_W * 0.06);
  const roiX1 = Math.floor(SAMPLE_W * 0.88);
  const roiY0 = Math.floor(sampleH * 0.14);
  const roiY1 = Math.floor(sampleH * 0.94);

  let sumX = 0, sumY = 0, count = 0;
  let minX = SAMPLE_W, minY = sampleH, maxX = 0, maxY = 0;

  for (let y = roiY0; y < roiY1; y++) {
    for (let x = roiX0; x < roiX1; x++) {
      const i = (y * SAMPLE_W + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const mx = Math.max(r, g, b);
      const mn = Math.min(r, g, b);
      const brightness = (r + g + b) / 3;
      const saturation = mx === 0 ? 0 : (mx - mn) / mx;

      if (brightness > 158 && saturation < 0.20 && r > 142 && g > 142 && b > 136) {
        count++;
        sumX += x; sumY += y;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (count < 600) return null;

  const cx = sumX / count, cy = sumY / count;
  const blobW = maxX - minX, blobH = maxY - minY;
  if (blobW < 25 || blobH < 25) return null;
  if (count / (blobW * blobH) < 0.18) return null;

  const bMinX = lerp(minX, cx - blobW * 0.48, 0.3);
  const bMaxX = lerp(maxX, cx + blobW * 0.48, 0.3);
  const bMinY = lerp(minY, cy - blobH * 0.46, 0.3);
  const bMaxY = lerp(maxY, cy + blobH * 0.46, 0.3);

  const pad = 6;
  const fx0 = clamp(bMinX - pad, 0, SAMPLE_W);
  const fy0 = clamp(bMinY - pad, 0, sampleH);
  const fx1 = clamp(bMaxX + pad, 0, SAMPLE_W);
  const fy1 = clamp(bMaxY + pad, 0, sampleH);

  return {
    x:      (fx0 / SAMPLE_W) * cw,
    y:      (fy0 / sampleH)  * ch,
    width:  ((fx1 - fx0) / SAMPLE_W) * cw,
    height: ((fy1 - fy0) / sampleH)  * ch
  };
}

function normalizeShoeBox(box) {
  const a = { ...box };
  a.x -= a.width * 0.04;   a.y -= a.height * 0.06;
  a.width *= 1.04;          a.height *= 1.04;
  a.x      = clamp(a.x, 0, cw - 50);
  a.y      = clamp(a.y, 0, ch - 50);
  a.width  = clamp(a.width,  60, cw * 0.84);
  a.height = clamp(a.height, 50, ch * 0.78);
  return a;
}

/* ══════════════════════════════════
   Drawing
   ══════════════════════════════════ */

function drawAnchorPoints(isDragging) {
  const alpha = isDragging ? 0.7 : overlayOpacity * 0.35;
  if (alpha < 0.01) return;

  const pulse = 0.5 + 0.5 * Math.sin(frameCount * 0.06);

  for (const [key, def] of Object.entries(anchorDefs)) {
    const pos = anchorScreenPos(key);
    const isNearest = isDragging && key === nearestAnchorKey;
    const isOccupied = placedItems.some(p => p.anchorKey === key);

    ctx.save();

    if (isNearest) {
      const r = 14 + pulse * 4;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.beginPath();
    const dotR = isNearest ? 5 : (isOccupied ? 3.5 : 3);
    ctx.arc(pos.x, pos.y, dotR, 0, Math.PI * 2);
    ctx.fillStyle = isNearest
      ? "rgba(255,255,255,0.9)"
      : isOccupied
        ? "rgba(255,255,255,0.35)"
        : "rgba(255,255,255," + (alpha * 0.6) + ")";
    ctx.fill();

    if (isDragging && !isOccupied) {
      ctx.font = "500 9px -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255,255,255," + (isNearest ? 0.85 : 0.4) + ")";
      ctx.fillText(def.label, pos.x, pos.y - 12);
    }

    ctx.restore();
  }
}

function drawPlacedAccessory(item) {
  const img = loadedImages.get(item.accessory.id);
  if (!img || !img.complete || !img.naturalWidth) return;

  const pos = anchorScreenPos(item.anchorKey);
  const acc = item.accessory;
  const drawW = smoothedBox.width * acc.scale;
  const drawH = drawW * (img.naturalHeight / img.naturalWidth);

  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(acc.rotation);
  ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();
}

function drawGuideBox(alpha) {
  if (alpha < 0.01) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  ctx.strokeRect(smoothedBox.x, smoothedBox.y, smoothedBox.width, smoothedBox.height);
  ctx.restore();
}

function drawScene() {
  ctx.clearRect(0, 0, cw, ch);

  const isDragging = drag !== null;
  drawGuideBox(overlayOpacity * 0.4);
  drawAnchorPoints(isDragging);

  for (const item of placedItems) {
    drawPlacedAccessory(item);
  }
}

/* ══════════════════════════════════
   Status
   ══════════════════════════════════ */

function setStatus(key, text) {
  if (key === lastStatusKey) return;
  lastStatusKey = key;
  statusText.textContent = text;
}

function updateStatus(detected) {
  if (drag) {
    if (nearestAnchorKey) {
      setStatus("snap", "Release to place on " + anchorDefs[nearestAnchorKey].label);
    } else {
      setStatus("dragging", "Drag onto a point on the shoe");
    }
  } else if (detected) {
    const count = placedItems.length;
    if (count > 0) {
      setStatus("placed", count + " accessory placed \u2014 drag to move, tap to remove");
    } else {
      setStatus("ready", "Sneaker detected \u2014 drag an accessory onto the shoe");
    }
  } else if (manualBoost) {
    setStatus("boost", "Re-scanning \u2014 keep shoe in frame.");
  } else if (hasEverDetected) {
    setStatus("lost", "Sneaker lost \u2014 move back into frame.");
  } else {
    setStatus("search", "Point camera at a white sneaker\u2026");
  }
}

/* ══════════════════════════════════
   Main loop
   ══════════════════════════════════ */

function run() {
  frameCount++;

  const detected = detectWhiteSneaker();
  if (detected) {
    confidence = Math.min(confidence + CONFIDENCE_UP, 30);
    if (confidence >= CONFIDENCE_THRESHOLD) {
      shoeBox = normalizeShoeBox(detected);
      hasEverDetected = true;
    }
  } else {
    confidence = Math.max(confidence - 1, 0);
    if (confidence <= 0 && manualBoost) manualBoost = false;
  }

  smoothBoxUpdate(shoeBox);

  const target = confidence >= CONFIDENCE_THRESHOLD ? 1 : 0;
  overlayOpacity = lerp(overlayOpacity, target, 0.07);

  updateStatus(confidence >= CONFIDENCE_THRESHOLD);
  drawScene();
  animationId = requestAnimationFrame(run);
}

/* ══════════════════════════════════
   UI events
   ══════════════════════════════════ */

scanButton.addEventListener("click", () => {
  manualBoost = true;
  confidence = 0;
  scanButton.classList.add("scanning");
  setTimeout(() => scanButton.classList.remove("scanning"), 1200);
  shoeBox = { x: cw * 0.18, y: ch * 0.28, width: cw * 0.46, height: ch * 0.34 };
  velBox  = { x: 0, y: 0, width: 0, height: 0 };
});

document.querySelectorAll(".mode-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  });
});

document.querySelectorAll(".nav-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  });
});

let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { resizeCanvas(); initBox(); }, 120);
});

/* ══════════════════════════════════
   Boot
   ══════════════════════════════════ */

preloadImages();
renderProductList();
initCanvasDrag();
startCamera();
