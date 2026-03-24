(function () {
  'use strict';

  const BG = '#1a2e1a';
  const canvas = document.getElementById('forest');
  const ctx = canvas.getContext('2d');

  const leftMushroom = { x: 0.22, y: 0.55, capColor: '#8AE068', glow: 0.35 };
  const rightMushroom = { x: 0.78, y: 0.52, capColor: '#4A7C3F', glow: 0.2 };
  const stemHeight = 0.06;

  let width = 0;
  let height = 0;
  let grainCanvas = null;
  let leftMushroomImageUrl = null;
  let leftMushroomImage = null;
  let leftMushroomLoading = false;
  let loadingPulseRaf = null;

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    grainCanvas = null;
    draw();
  }

  function px(normalized) {
    return { x: normalized.x * width, y: normalized.y * height };
  }

  function drawBackground() {
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, width, height);

    // Slightly lighter ground in center (where mushrooms sit)
    const centerGradient = ctx.createRadialGradient(
      width * 0.5, height * 0.55, 0,
      width * 0.5, height * 0.55, width * 0.6
    );
    centerGradient.addColorStop(0, 'rgba(45, 74, 45, 0.35)');
    centerGradient.addColorStop(0.5, 'rgba(45, 74, 45, 0.12)');
    centerGradient.addColorStop(1, 'transparent');
    ctx.fillStyle = centerGradient;
    ctx.fillRect(0, 0, width, height);
  }

  function drawTrees() {
    const colors = ['#2d4a2d', '#3d5c3d', '#2d4a2d', '#3d5c3d', '#2d4a2d'];
    // Rounded blob silhouettes at edges — isometric / from above
    const trees = [
      { x: 0.02, y: 0.08, w: 0.22, h: 0.2 },
      { x: 0.78, y: 0.05, w: 0.2, h: 0.18 },
      { x: 0.04, y: 0.82, w: 0.18, h: 0.16 },
      { x: 0.82, y: 0.78, w: 0.2, h: 0.2 },
      { x: 0.5, y: 0.02, w: 0.15, h: 0.14 }
    ];
    trees.forEach((t, i) => {
      const x = t.x * width;
      const y = t.y * height;
      const w = t.w * width;
      const h = t.h * height;
      ctx.fillStyle = colors[i];
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawGrain() {
    const size = 256;
    if (!grainCanvas) {
      grainCanvas = document.createElement('canvas');
      grainCanvas.width = size;
      grainCanvas.height = size;
      const gctx = grainCanvas.getContext('2d');
      const id = gctx.getImageData(0, 0, size, size);
      const d = id.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = Math.random() > 0.5 ? 42 : 0;
        d[i] = d[i + 1] = d[i + 2] = 255;
        d[i + 3] = v;
      }
      gctx.putImageData(id, 0, 0);
    }
    ctx.save();
    ctx.globalAlpha = 0.04;
    const pattern = ctx.createPattern(grainCanvas, 'repeat');
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  function drawMushroom(norm, capColor, glowIntensity) {
    const p = px(norm);
    const capW = width * 0.06;
    const capH = height * 0.04;
    const stemW = width * 0.018;
    const stemH = height * stemHeight;

    const capCenterY = p.y - stemH - capH * 0.5;
    const stemTop = capCenterY - capH * 0.5;
    const stemBottom = p.y;

    const hex = capColor.slice(1);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const gradient = ctx.createRadialGradient(
      p.x, capCenterY, 0,
      p.x, capCenterY, capW * 2.5
    );
    gradient.addColorStop(0, `rgba(${r},${g},${b},${glowIntensity})`);
    gradient.addColorStop(0.4, `rgba(${r},${g},${b},${glowIntensity * 0.5})`);
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(p.x, capCenterY, capW * 2, capH * 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(220, 210, 190, 0.9)';
    const sr = stemW * 0.5;
    ctx.beginPath();
    ctx.roundRect(p.x - stemW / 2, stemTop, stemW, stemBottom - stemTop, sr);
    ctx.fill();

    ctx.fillStyle = capColor;
    ctx.beginPath();
    ctx.ellipse(p.x, capCenterY, capW, capH, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawLeftMushroom() {
    const p = px(leftMushroom);
    const capW = width * 0.06;
    const capH = height * 0.04;
    const stemW = width * 0.018;
    const stemH = height * stemHeight;
    const capCenterY = p.y - stemH - capH * 0.5;
    const stemTop = capCenterY - capH * 0.5;
    const stemBottom = p.y;

    if (leftMushroomLoading) {
      const pulse = 0.25 + 0.18 * Math.sin(Date.now() / 420);
      drawMushroom(leftMushroom, leftMushroom.capColor, pulse);
      return;
    }

    if (leftMushroomImage && leftMushroomImage.complete && leftMushroomImage.naturalWidth > 0) {
      ctx.save();
      ctx.shadowColor = 'rgba(138, 224, 104, 0.5)';
      ctx.shadowBlur = 20;
      const imgW = capW * 2;
      const imgH = capH * 2;
      ctx.drawImage(leftMushroomImage, p.x - imgW / 2, capCenterY - imgH / 2, imgW, imgH);
      ctx.restore();
      ctx.fillStyle = 'rgba(220, 210, 190, 0.9)';
      const sr = stemW * 0.5;
      ctx.beginPath();
      ctx.roundRect(p.x - stemW / 2, stemTop, stemW, stemBottom - stemTop, sr);
      ctx.fill();
      return;
    }

    drawMushroom(leftMushroom, leftMushroom.capColor, leftMushroom.glow);
  }

  function drawMycelium() {
    const left = px(leftMushroom);
    const right = px(rightMushroom);
    const stemH = height * stemHeight;
    const w = width;

    // Organic main path: bezier with slight unevenness (deterministic wobble)
    const c1x = left.x + w * 0.14 + w * 0.012;
    const c1y = left.y + stemH * 2 + height * 0.008;
    const c2x = right.x - w * 0.13 - w * 0.01;
    const c2y = right.y + stemH * 2 + height * 0.006;

    ctx.strokeStyle = 'rgba(232, 245, 224, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(232, 245, 224, 0.4)';
    ctx.shadowBlur = 8;

    ctx.beginPath();
    ctx.moveTo(left.x, left.y);
    ctx.bezierCurveTo(c1x, c1y, c2x, c2y, right.x, right.y);
    ctx.stroke();

    // Branch-offs: 3–4 tendrils with tiny node dots
    const branchT = [0.22, 0.45, 0.62, 0.82];
    const branchOffsets = [
      { dx: -0.04, dy: 0.02 },
      { dx: 0.03, dy: -0.01 },
      { dx: -0.02, dy: 0.015 },
      { dx: 0.035, dy: 0.01 }
    ];
    branchT.forEach((t, i) => {
      const x = (1 - t) ** 3 * left.x + 3 * (1 - t) ** 2 * t * c1x + 3 * (1 - t) * t ** 2 * c2x + t ** 3 * right.x;
      const y = (1 - t) ** 3 * left.y + 3 * (1 - t) ** 2 * t * c1y + 3 * (1 - t) * t ** 2 * c2y + t ** 3 * right.y;
      const endX = x + branchOffsets[i].dx * w;
      const endY = y + branchOffsets[i].dy * height;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + (endX - x) * 0.4 + w * 0.008, y + (endY - y) * 0.3, endX, endY);
      ctx.stroke();
      ctx.shadowBlur = 4;
      ctx.fillStyle = 'rgba(232, 245, 224, 0.5)';
      ctx.beginPath();
      ctx.arc(endX, endY, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 8;
    });

    ctx.shadowBlur = 0;
  }

  function drawSpores() {
    const positions = [
      [0.12, 0.3], [0.35, 0.25], [0.5, 0.7], [0.62, 0.35], [0.88, 0.6],
      [0.25, 0.75], [0.72, 0.2], [0.45, 0.5], [0.15, 0.55], [0.92, 0.4]
    ];
    ctx.fillStyle = 'rgba(138, 224, 104, 0.5)';
    positions.forEach(([nx, ny]) => {
      ctx.beginPath();
      ctx.arc(nx * width, ny * height, 2, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function draw() {
    drawBackground();
    drawTrees();
    drawMycelium();
    drawSpores();
    drawLeftMushroom();
    drawMushroom(rightMushroom, rightMushroom.capColor, rightMushroom.glow);
    drawGrain();
  }

  function setLeftMushroomLoading(loading) {
    leftMushroomLoading = loading;
    if (loading) {
      function pulseLoop() {
        if (!leftMushroomLoading) return;
        draw();
        loadingPulseRaf = requestAnimationFrame(pulseLoop);
      }
      loadingPulseRaf = requestAnimationFrame(pulseLoop);
    } else if (loadingPulseRaf != null) {
      cancelAnimationFrame(loadingPulseRaf);
      loadingPulseRaf = null;
    }
  }

  function setLeftMushroomImageUrl(url) {
    leftMushroomImageUrl = url || null;
    if (!url) {
      leftMushroomImage = null;
      draw();
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      leftMushroomImage = img;
      draw();
    };
    img.onerror = () => {
      leftMushroomImage = null;
      draw();
    };
    img.src = url;
  }

  function getLeftCapCenter() {
    const p = px(leftMushroom);
    const stemH = height * stemHeight;
    const capH = height * 0.04;
    const capCenterY = p.y - stemH - capH * 0.5;
    return { x: p.x, y: capCenterY };
  }

  function getRightCapCenter() {
    const p = px(rightMushroom);
    const stemH = height * stemHeight;
    const capH = height * 0.04;
    const capCenterY = p.y - stemH - capH * 0.5;
    return { x: p.x, y: capCenterY };
  }

  function getCanvas() { return canvas; }
  function getCtx() { return ctx; }
  function getDimensions() { return { width, height }; }
  function redraw() { draw(); }

  window.MYCO = window.MYCO || {};
  window.MYCO.forest = {
    getLeftCapCenter,
    getRightCapCenter,
    getCanvas,
    getCtx,
    getDimensions,
    redraw,
    setLeftMushroomLoading,
    setLeftMushroomImageUrl
  };

  window.addEventListener('resize', resize);
  resize();
})();
