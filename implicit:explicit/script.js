
let canvas;
let ctx;

let inputBox;
let statusText = "";

let items = [];
let selectedId = null;

/** Offscreen canvas for mosaic effect (reused per frame). */
let mosaicCanvas = null;
let mosaicCtx = null;

/** Frame styling (Y2K pastel window). */
const FRAME_MARGIN = 14;
const FRAME_RADIUS = 16;
const FRAME_BORDER = 3;
const FRAME_COLORS = ["#d5c4ff", "#ffe88a", "#ffd6f5"]; // lavender, yellow, pink
const IDLE_MS = 10000;       // wait 10s before transition
const TRANSITION_MS = 6000;  // mosaic + fade duration

let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

init();

function init() {
    initInterface();
    animate();
}

function initInterface() {
    // Full-screen canvas as animated background
    canvas = document.createElement("canvas");
    ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.position = "fixed";
    canvas.style.left = "0";
    canvas.style.top = "0";
    canvas.style.zIndex = "0";
    document.body.appendChild(canvas);

    // Hook into existing retro-styled prompt input and button
    inputBox = document.getElementById("prompt-input");
    const generateBtn = document.getElementById("generate-btn");

    if (inputBox) {
        inputBox.placeholder = "Type a prompt, press Enter (text → image)";
        inputBox.setAttribute("autocomplete", "off");

        inputBox.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                const prompt = inputBox.value.trim();
                if (prompt.length === 0) return;
                askImage(prompt);
            }
        });
    }

    if (generateBtn && inputBox) {
        generateBtn.addEventListener("click", () => {
            const prompt = inputBox.value.trim();
            if (prompt.length === 0) return;
            askImage(prompt);
        });
    }

    canvas.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    window.addEventListener("resize", () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
}

function onMouseDown(e) {
    const mx = e.clientX;
    const my = e.clientY;

    const hit = hitTestTopItem(mx, my);
    if (hit) {
        selectedId = hit.id;
        isDragging = true;
        dragOffsetX = mx - hit.x;
        dragOffsetY = my - hit.y;
        bringToFront(hit.id);
    } else {
        selectedId = null;
    }
}

function onMouseMove(e) {
    if (!isDragging || selectedId === null) return;

    const item = items.find((it) => it.id === selectedId);
    if (!item) return;

    item.x = e.clientX - dragOffsetX;
    item.y = e.clientY - dragOffsetY;
}

function onMouseUp() {
    isDragging = false;
}

function hitTestTopItem(mx, my) {
    const now = Date.now();
    for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];
        if (it.fadeState <= 0) continue;
        if ((now - it.placedAt) >= IDLE_MS) continue; // no drag during/after transition
        const fx = it.x - FRAME_MARGIN;
        const fy = it.y - FRAME_MARGIN;
        const fw = it.w + FRAME_MARGIN * 2;
        const fh = it.h + FRAME_MARGIN * 2;
        if (mx >= fx && mx <= fx + fw && my >= fy && my <= fy + fh) return it;
    }
    return null;
}

function bringToFront(id) {
    const idx = items.findIndex((it) => it.id === id);
    if (idx === -1) return;
    const [it] = items.splice(idx, 1);
    items.push(it);
}

function drawFrame(ctx, it) {
    const fx = it.x - FRAME_MARGIN;
    const fy = it.y - FRAME_MARGIN;
    const fw = it.w + FRAME_MARGIN * 2;
    const fh = it.h + FRAME_MARGIN * 2;
    const color = FRAME_COLORS[it.frameColorIndex != null ? it.frameColorIndex : 0];

    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(fx, fy, fw, fh, FRAME_RADIUS);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = "#000";
    ctx.lineWidth = FRAME_BORDER;
    ctx.stroke();
    ctx.restore();
}

function drawImageWithMosaic(ctx, it) {
    if (!it.img || !it.img.complete) return;
    const { x, y, w, h, img, mosaicLevel } = it;

    if (mosaicLevel <= 0) {
        ctx.drawImage(img, x, y, w, h);
        return;
    }

    const pixelSize = 1 + mosaicLevel * 28;
    const sw = Math.max(2, Math.floor(w / pixelSize));
    const sh = Math.max(2, Math.floor(h / pixelSize));

    if (!mosaicCanvas || mosaicCanvas.width < sw || mosaicCanvas.height < sh) {
        mosaicCanvas = document.createElement("canvas");
        mosaicCtx = mosaicCanvas.getContext("2d");
    }
    mosaicCanvas.width = sw;
    mosaicCanvas.height = sh;
    mosaicCtx.drawImage(img, 0, 0, sw, sh);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(mosaicCanvas, 0, 0, sw, sh, x, y, w, h);
    ctx.imageSmoothingEnabled = true;
}

function addImageItem(imageUrl, prompt) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
        const w = 260;
        const h = 260;

        const item = {
            id: Date.now().toString() + Math.random().toString(16).slice(2),
            type: "image",
            prompt,
            url: imageUrl,
            img,
            x: Math.max(20, (canvas.width - w) * 0.5 + (Math.random() * 120 - 60)),
            y: Math.max(80, (canvas.height - h) * 0.5 + (Math.random() * 120 - 60)),
            w,
            h,
            vx: (Math.random() * 0.8 - 0.4),
            vy: (Math.random() * 0.8 - 0.4),
            placedAt: Date.now(),
            mosaicLevel: 0,
            fadeState: 1,
            frameColorIndex: items.length % FRAME_COLORS.length
        };

        items.push(item);
        selectedId = item.id;
        statusText = "Added image.";
    };

    img.onerror = () => {
        statusText = "Image failed to load.";
    };

    img.src = imageUrl;
}

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const now = Date.now();
    const topPadding = 70;

    for (const it of items) {
        if (it.placedAt == null) it.placedAt = now;
        if (it.mosaicLevel == null) it.mosaicLevel = 0;
        if (it.fadeState == null) it.fadeState = 1;
        if (it.frameColorIndex == null) it.frameColorIndex = 0;

        const age = now - it.placedAt;

        if (age >= IDLE_MS) {
            const elapsed = age - IDLE_MS;
            const t = Math.min(1, elapsed / TRANSITION_MS);
            it.mosaicLevel = t;
            it.fadeState = 1 - t;
        }

        if (it.fadeState <= 0) continue;

        if (age < IDLE_MS) {
            if (!isDragging || it.id !== selectedId) {
                it.x += it.vx;
                it.y += it.vy;
                if (it.x < 0) { it.x = 0; it.vx *= -1; }
                if (it.y < topPadding) { it.y = topPadding; it.vy *= -1; }
                if (it.x + it.w > canvas.width) { it.x = canvas.width - it.w; it.vx *= -1; }
                if (it.y + it.h > canvas.height) { it.y = canvas.height - it.h; it.vy *= -1; }
            }
        }

        ctx.save();
        ctx.globalAlpha = it.fadeState;

        drawFrame(ctx, it);

        if (it.img && it.img.complete) {
            drawImageWithMosaic(ctx, it);
        } else {
            ctx.fillStyle = "#eee";
            ctx.fillRect(it.x, it.y, it.w, it.h);
        }

        ctx.restore();

        if (it.id === selectedId && age < IDLE_MS) {
            ctx.strokeStyle = "black";
            ctx.lineWidth = 2;
            const fx = it.x - FRAME_MARGIN;
            const fy = it.y - FRAME_MARGIN;
            const fw = it.w + FRAME_MARGIN * 2;
            const fh = it.h + FRAME_MARGIN * 2;
            ctx.strokeRect(fx - 2, fy - 2, fw + 4, fh + 4);
        }
    }

    items = items.filter((it) => it.fadeState > 0);

    if (statusText) {
        ctx.font = "14px Arial";
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillText(statusText, 16, canvas.height - 16);
    }

    requestAnimationFrame(animate);
}

async function askImage(prompt) {
    const url = "https://itp-ima-replicate-proxy.web.app/api/create_n_get";

    const ITP_IMA_TOKEN =
        "eyJhbGciOiJSUzI1NiIsImtpZCI6IjRiMTFjYjdhYjVmY2JlNDFlOTQ4MDk0ZTlkZjRjNWI1ZWNhMDAwOWUiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiSmVzc2ljYSBTdW4iLCJwaWN0dXJlIjoiaHR0cHM6Ly9saDMuZ29vZ2xldXNlcmNvbnRlbnQuY29tL2EvQUNnOG9jS2ttNUtMMGJsb2o3QzgxMlJXRjRzT3hrWVlkMFotTDZQdEdkWkYyalFjY3BfbzdHWT1zOTYtYyIsImlzcyI6Imh0dHBzOi8vc2VjdXJldG9rZW4uZ29vZ2xlLmNvbS9pdHAtaW1hLXJlcGxpY2F0ZS1wcm94eSIsImF1ZCI6Iml0cC1pbWEtcmVwbGljYXRlLXByb3h5IiwiYXV0aF90aW1lIjoxNzcwNzQxNzA5LCJ1c2VyX2lkIjoiNWgydjJEWkRMSFFzTjJ3MDY2RU96SkE1M3d3MSIsInN1YiI6IjVoMnYyRFpETEhRc04ydzA2NkVPekpBNTN3dzEiLCJpYXQiOjE3NzA3NDE3MDksImV4cCI6MTc3MDc0NTMwOSwiZW1haWwiOiJyczg3OTNAbnl1LmVkdSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJmaXJlYmFzZSI6eyJpZGVudGl0aWVzIjp7Imdvb2dsZS5jb20iOlsiMTAzMTM2Mjk2NTgxMjkzOTgwOTM1Il0sImVtYWlsIjpbInJzODc5M0BueXUuZWR1Il19LCJzaWduX2luX3Byb3ZpZGVyIjoiZ29vZ2xlLmNvbSJ9fQ.BrWKU0jXPfpD6XvaqN3GTkuDHv96Lumkz6PFAV-jOSZNy7y7TUsklIxy-FtWQYSS_EsmefjwUrh01JiT-M2zMiYSCLBkyHurduO5ifUKUUoG-w9P1S8aK4kuV8QjstEPsvBpsY7OVVHsWmx3j6Vud_Wtjz6FW7jekZuO5jGESLccmE0jDcLOcGXR5DCbQrGKWMTVwsESRd8XID-0vISmuqO2qB47cFM1glM7DDc65_MO4PZqgPLMeZLT2alnwtw8WJd7H1FlebMLQcvt-9GR-YyB7Ad3-KPLMGuL8IdZmmf2vk6qPsXtEdotV5NghQs0rLRL50sQO_K5gGEg3YmT0A";
    const authToken = window.localStorage.getItem("ITP_IMA_TOKEN") || ITP_IMA_TOKEN;
    if (!authToken) {
        statusText = 'Missing token. Set localStorage key "ITP_IMA_TOKEN" and try again.';
        return;
    }

    statusText = "Generating image...";
    document.body.style.cursor = "progress";

    const cartoonPrompt = `${prompt}, cartoon style, illustrated, vibrant colors, 2D animation aesthetic`;
    const data = {
        model: "prunaai/z-image-turbo",
        input: {
            prompt: cartoonPrompt
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

    try {
        const raw = await fetch(url, options);
        const json = await raw.json();

        document.body.style.cursor = "auto";

        const out = json.output;

        let imageUrl = null;
        if (typeof out === "string") imageUrl = out;
        if (Array.isArray(out) && out.length > 0) imageUrl = out[0];

        if (!imageUrl) {
            statusText = "No image returned. Try a different prompt.";
            return;
        }

        addImageItem(imageUrl, prompt);
    } catch (err) {
        document.body.style.cursor = "auto";
        statusText = "Request failed (token expired or network error).";
    }
}