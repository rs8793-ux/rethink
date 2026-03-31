
//  Face Theremin — main.js
//  依赖: p5.js, ml5.js (FaceMesh), Tone.js
// 


// 
//  音符 & 频率表
//  想改音阶？在这里增删音符即可

const NOTES_FREQ = {
  'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61,
  'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
  'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23,
  'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
  'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46,
  'G5': 783.99, 'A5': 880.00, 'B5': 987.77,
};
const ALL_NOTES = Object.keys(NOTES_FREQ);


// 
//  FaceMesh 关键点索引
//  想调整哪个脸部区域控制什么？改这里
// 
const LM = {
  noseTip:    1,
  leftBrow:   70,
  rightBrow:  300,
  leftEyeTop: 159,
  rightEyeTop:386,
  leftEyeBot: 145,
  rightEyeBot:374,
  mouthLeft:  61,
  mouthRight: 291,
  mouthTop:   13,
  mouthBot:   14,
  leftEar:    234,
  rightEar:   454,
};

// 高亮显示的关键点及其颜色 [R, G, B]
const KEY_POINT_COLORS = {
  [LM.leftBrow]:    [167, 139, 250],  // 紫 — 眉毛（控制音调）
  [LM.rightBrow]:   [167, 139, 250],
  [LM.leftEyeTop]:  [167, 139, 250],
  [LM.rightEyeTop]: [167, 139, 250],
  [LM.leftEyeBot]:  [167, 139, 250],
  [LM.rightEyeBot]: [167, 139, 250],
  [LM.mouthLeft]:   [56,  189, 248],  // 蓝 — 嘴角（控制混响）
  [LM.mouthRight]:  [56,  189, 248],
  [LM.mouthTop]:    [56,  189, 248],
  [LM.mouthBot]:    [56,  189, 248],
  [LM.leftEar]:     [251, 146,  60],  // 橙 — 耳朵（控制 BPM）
  [LM.rightEar]:    [251, 146,  60],
  [LM.noseTip]:     [163, 230,  53],  // 绿 — 鼻尖（参考点）
};


// 
//  音频参数调节范围
//  想调整灵敏度？改这里的数值
// 
const AUDIO_CONFIG = {
  brow: {
    min: 30,        // 眉毛最低位置（像素，相对鼻尖）
    range: 80,      // 变化范围
  },
  smile: {
    offset: 5,      // 嘴角曲率零点偏移
    range: 25,      // 变化范围
  },
  tilt: {
    center: 30,     // 头部倾斜零点（像素差）
    range: 60,      // 变化范围
  },
  eye: {
    min: 2,         // 眼睛最小开合（像素）
    range: 18,      // 变化范围
  },
  reverb: {
    maxWet: 0.85,   // 混响最大湿度
    decay: 3,       // 混响衰减时间（秒）
  },
  volume: {
    min: -40,       // 最小音量（dB）
    range: 35,      // 音量变化范围（dB）
  },
  bpm: {
    min: 60,        // 最低 BPM
    range: 140,     // BPM 变化范围
  },
  smoothing: 0.15,  // 参数平滑系数（0=不平滑, 1=完全平滑）
};


// 
//  状态变量（一般不需要改）
// 
let synth, reverb, vol;
let facemesh, predictions = [];
let running = false;
let isStarting = false;
let recording = false;
let recData = [];
let playbackInterval = null;
let lastUiUpdateMs = 0;

let currentParams = { pitch: 0, reverbWet: 0, bpm: 0, volume: 0 };
let smoothed      = { pitch: 0, reverbWet: 0, bpm: 0, volume: 0 };


// 
//  DOM 引用
// 
const dot          = document.getElementById('dot');
const statusText   = document.getElementById('status-text');
const btnStart     = document.getElementById('btn-start');
const btnRecord    = document.getElementById('btn-record');
const btnPlay      = document.getElementById('btn-play');
const msg          = document.getElementById('msg');
const recIndicator = document.getElementById('rec-indicator');
const wvContainer  = document.getElementById('waveform-bar');

// 生成波形条
const wvBars = [];
for (let i = 0; i < 60; i++) {
  const b = document.createElement('div');
  b.className = 'wv-bar';
  wvContainer.appendChild(b);
  wvBars.push(b);
}


// 
//  工具函数
// 

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function pointXY(pt) {
  if (!pt) return null;
  if (Array.isArray(pt)) {
    return { x: pt[0], y: pt[1] };
  }
  if (typeof pt.x === 'number' && typeof pt.y === 'number') {
    return { x: pt.x, y: pt.y };
  }
  return null;
}

// 将 0~1 的音调值映射到最近的音符
function noteFromPitch(pitchNorm) {
  if (!Number.isFinite(pitchNorm)) return 'C4';
  const idx = Math.floor(pitchNorm * (ALL_NOTES.length - 1));
  const safeIdx = Math.max(0, Math.min(ALL_NOTES.length - 1, idx));
  return ALL_NOTES[safeIdx] || 'C4';
}

// 更新某个参数的 UI 显示和进度条
function updateParamUI(valueId, fillId, norm, displayText) {
  document.getElementById(valueId).textContent = displayText;
  document.getElementById(fillId).style.width = (norm * 100) + '%';
}


// 
//  音频初始化（Tone.js）
// 
async function initAudio() {
  await Tone.start();

  reverb = new Tone.Reverb({
    decay: AUDIO_CONFIG.reverb.decay,
    wet: 0,
  }).toDestination();

  vol = new Tone.Volume(-12).connect(reverb);

  synth = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: { attack: 0.05, decay: 0.1, sustain: 0.9, release: 0.3 },
  }).connect(vol);

  synth.triggerAttack('C4');
}


// ══════════════════════════════════════════════
//  从 FaceMesh 关键点提取控制参数
// ══════════════════════════════════════════════
function extractParams(lm) {
  if (!lm || lm.length < 468) return;

  const nose      = pointXY(lm[LM.noseTip]);
  const leftBrow  = pointXY(lm[LM.leftBrow]);
  const rightBrow = pointXY(lm[LM.rightBrow]);
  const lEyeTop   = pointXY(lm[LM.leftEyeTop]);
  const rEyeTop   = pointXY(lm[LM.rightEyeTop]);
  const lEyeBot   = pointXY(lm[LM.leftEyeBot]);
  const rEyeBot   = pointXY(lm[LM.rightEyeBot]);
  const mLeft     = pointXY(lm[LM.mouthLeft]);
  const mRight    = pointXY(lm[LM.mouthRight]);
  const mTop      = pointXY(lm[LM.mouthTop]);
  const mBot      = pointXY(lm[LM.mouthBot]);
  const lEar      = pointXY(lm[LM.leftEar]);
  const rEar      = pointXY(lm[LM.rightEar]);

  if (!nose || !leftBrow || !rightBrow || !lEyeTop || !rEyeTop || !lEyeBot || !rEyeBot || !mLeft || !mRight || !mTop || !mBot || !lEar || !rEar) {
    return;
  }

  // 1. 眉毛高度 → 音调
  //    眉毛距鼻尖越远（y差越大）= 抬眉 = 高音
  const browAvgDist = ((nose.y - leftBrow.y) + (nose.y - rightBrow.y)) / 2;
  currentParams.pitch = clamp01(
    (browAvgDist - AUDIO_CONFIG.brow.min) / AUDIO_CONFIG.brow.range
  );

  // 2. 嘴角弧度 → 混响
  //    嘴角 y 相对嘴中心 y 越高 = 微笑 = 混响越深
  const mouthCenterY = (mTop.y + mBot.y) / 2;
  const smileAvg = ((mouthCenterY - mLeft.y) + (mouthCenterY - mRight.y)) / 2;
  currentParams.reverbWet = clamp01(
    (smileAvg + AUDIO_CONFIG.smile.offset) / AUDIO_CONFIG.smile.range
  );

  // 3. 头部左右倾斜 → BPM
  //    右耳比左耳低（y 更大）= 头右倾 = BPM 更快
  const tilt = rEar.y - lEar.y;
  currentParams.bpm = clamp01(
    (tilt + AUDIO_CONFIG.tilt.center) / AUDIO_CONFIG.tilt.range
  );

  // 4. 眼睛开合 → 音量
  //    眼睛睁开程度越大 = 音量越高
  const eyeOpenL = Math.abs(lEyeTop.y - lEyeBot.y);
  const eyeOpenR = Math.abs(rEyeTop.y - rEyeBot.y);
  const eyeAvg   = (eyeOpenL + eyeOpenR) / 2;
  currentParams.volume = clamp01(
    (eyeAvg - AUDIO_CONFIG.eye.min) / AUDIO_CONFIG.eye.range
  );
}


// 
//  每帧更新音频 + UI
// ══════════════════════════════════════════════
function updateAudio() {
  const s = AUDIO_CONFIG.smoothing;
  smoothed.pitch     = lerp(smoothed.pitch,     currentParams.pitch,     s);
  smoothed.reverbWet = lerp(smoothed.reverbWet, currentParams.reverbWet, s);
  smoothed.bpm       = lerp(smoothed.bpm,       currentParams.bpm,       s);
  smoothed.volume    = lerp(smoothed.volume,     currentParams.volume,    s);

  if (!synth) return;

  // 音调
  const note = noteFromPitch(smoothed.pitch);
  const freq = NOTES_FREQ[note];
  if (freq) synth.frequency.rampTo(freq, 0.05);

  // 混响
  reverb.wet.rampTo(smoothed.reverbWet * AUDIO_CONFIG.reverb.maxWet, 0.1);

  // 音量
  const dbVol = AUDIO_CONFIG.volume.min + smoothed.volume * AUDIO_CONFIG.volume.range;
  vol.volume.rampTo(dbVol, 0.05);

  // BPM 值（显示用）
  const bpmVal = AUDIO_CONFIG.bpm.min + smoothed.bpm * AUDIO_CONFIG.bpm.range;

  // ── UI 更新限频，避免每帧 DOM 读写造成卡顿 ──
  const now = Date.now();
  if (now - lastUiUpdateMs > 50) {
    const safeNote = typeof note === 'string' ? note : 'C4';
    const noteName = safeNote.replace(/\d/, '');
    const octave   = safeNote.match(/\d/)?.[0] || '4';
    document.getElementById('current-note').textContent  = noteName;
    document.getElementById('octave-display').textContent = 'OCT ' + octave;

    updateParamUI('v-pitch',  'f-pitch',  smoothed.pitch,     Math.round(smoothed.pitch * 100) + '%');
    updateParamUI('v-reverb', 'f-reverb', smoothed.reverbWet, Math.round(smoothed.reverbWet * 100) + '%');
    updateParamUI('v-bpm',    'f-bpm',    smoothed.bpm,       Math.round(bpmVal) + ' bpm');
    updateParamUI('v-vol',    'f-vol',    smoothed.volume,    Math.round(smoothed.volume * 100) + '%');

    // 波形动画
    wvBars.forEach((bar, i) => {
      const phase = (now / 120 + i * 0.4) % (Math.PI * 2);
      const h = Math.max(2, smoothed.volume * 55 * (0.5 + 0.5 * Math.sin(phase + smoothed.pitch * 8)));
      bar.style.height = h + 'px';
    });
    lastUiUpdateMs = now;
  }

  // 录制帧
  if (recording) {
    recData.push({
      freq,
      reverbWet: smoothed.reverbWet * AUDIO_CONFIG.reverb.maxWet,
      vol: dbVol,
      note,
    });
  }
}


// ══════════════════════════════════════════════
//  p5.js sketch — 摄像头 + 脸部网格可视化
// ══════════════════════════════════════════════
new p5(function (p) {
  let capture;

  p.setup = function () {
    const canvas = p.createCanvas(p.windowWidth, p.windowHeight);
    canvas.parent('canvas-container');
    p.colorMode(p.RGB);
    p.noStroke();
    p.frameRate(30);
  };

  p.draw = function () {
    p.background(8, 8, 16);

    if (capture && running) {
      drawCamera(p, capture);

      if (predictions.length > 0) {
        const lm = predictions[0].scaledMesh || predictions[0].keypoints;
        if (lm && lm.length > 0) {
          extractParams(lm);
          drawFaceMesh(p, capture, lm);
        }
      }
    } else {
      drawIdleAnimation(p);
    }

    updateAudio();
  };

  p.windowResized = function () {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
  };

  // 启动摄像头 + FaceMesh（从按钮调用）
  window.startFaceMesh = function () {
    if (running || isStarting) return;
    isStarting = true;

    capture = p.createCapture({
      video: {
        facingMode: 'user',
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 24, max: 30 },
      },
      audio: false,
    });
    capture.elt.setAttribute('playsinline', '');
    capture.elt.muted = true;
    capture.hide();

    statusText.textContent = 'Loading model...';
    dot.className = '';
    msg.textContent = 'Initializing camera and face model...';

    capture.elt.onloadedmetadata = () => {
      running = true;
    };

    facemesh = ml5.facemesh(capture.elt, { maxFaces: 1 }, () => {
      statusText.textContent = 'Ready';
      dot.className = 'ready';
      msg.textContent = 'Raise brows for pitch · Smile for reverb · Tilt for BPM · Blink for volume';
      btnStart.classList.add('active');
      btnStart.textContent = 'Running';
      isStarting = false;
    });

    facemesh.on('predict', results => {
      predictions = results;
    });
  };
});


// ── 绘制：镜像摄像头画面（半透明）──
function drawCamera(p, capture) {
  const vw = capture.width, vh = capture.height;
  if (!vw || !vh) return;
  const scale = Math.min(p.width / vw, p.height / vh) * 0.85;
  if (!Number.isFinite(scale) || scale <= 0) return;
  const dw = vw * scale, dh = vh * scale;

  p.push();
  p.translate(p.width / 2, p.height / 2);
  p.scale(-1, 1);
  p.tint(255, 55);
  p.image(capture, -dw / 2, -dh / 2, dw, dh);
  p.noTint();
  p.pop();
}


// ── 绘制：脸部网格点 + 高亮关键点 ──
function drawFaceMesh(p, capture, lm) {
  const vw = capture.width, vh = capture.height;
  if (!vw || !vh) return;
  const scale = Math.min(p.width / vw, p.height / vh) * 0.85;
  if (!Number.isFinite(scale) || scale <= 0) return;
  const dw = vw * scale, dh = vh * scale;

  // 将地标坐标转换为屏幕坐标（镜像）
  function toScreen(pt) {
    const pxy = pointXY(pt);
    if (!pxy) return null;
    return {
      x: p.width  / 2 + (0.5 - pxy.x / vw) * dw,
      y: p.height / 2 + (pxy.y / vh - 0.5) * dh,
    };
  }

  // 全部网格点（稀疏）
  lm.forEach((pt, i) => {
    if (i % 3 !== 0) return;
    const s = toScreen(pt);
    if (!s) return;
    p.stroke(167, 139, 250, 18 + smoothed.volume * 25);
    p.strokeWeight(0.5);
    p.noFill();
    p.point(s.x, s.y);
  });

  // 高亮关键点
  const keyIdxs = Object.keys(KEY_POINT_COLORS).map(Number);
  keyIdxs.forEach(idx => {
    if (!lm[idx]) return;
    const s = toScreen(lm[idx]);
    if (!s) return;
    const c = KEY_POINT_COLORS[idx];
    p.noStroke();
    p.fill(c[0], c[1], c[2], 200);
    p.circle(s.x, s.y, 5);
  });
}


// ── 绘制：空闲时的同心圆动画 ──
function drawIdleAnimation(p) {
  for (let i = 0; i < 6; i++) {
    const r = 80 + i * 22;
    p.stroke(167, 139, 250, 8 + i * 3);
    p.strokeWeight(0.5);
    p.noFill();
    p.ellipse(p.width / 2, p.height / 2, r * 2, r * 2);
  }
}


// ══════════════════════════════════════════════
//  按钮事件
// ══════════════════════════════════════════════

// 启动
btnStart.addEventListener('click', async () => {
  if (running || isStarting) return;
  try {
    await initAudio();
    window.startFaceMesh();
  } catch (err) {
    isStarting = false;
    running = false;
    dot.className = '';
    statusText.textContent = 'Start failed';
    msg.textContent = 'Cannot access camera or audio. Check browser permissions and try again.';
    console.error(err);
  }
});

// 录制 / 停止录制
btnRecord.addEventListener('click', () => {
  if (!running) return;

  if (!recording) {
    recData = [];
    recording = true;
    btnRecord.textContent = '■ Stop Recording';
    btnRecord.classList.add('recording');
    recIndicator.classList.add('show');
    dot.className = 'recording';
    statusText.textContent = 'Recording';
    btnPlay.style.display = 'none';
  } else {
    recording = false;
    btnRecord.textContent = '● Start Recording';
    btnRecord.classList.remove('recording');
    recIndicator.classList.remove('show');
    dot.className = 'ready';
    statusText.textContent = 'Ready';
    if (recData.length > 0) {
      btnPlay.style.display = 'inline-block';
      msg.textContent = 'Recording complete: ' + recData.length + ' frames · Click play';
    }
  }
});

// 播放录制
btnPlay.addEventListener('click', () => {
  if (recData.length === 0) return;

  if (playbackInterval) {
    clearInterval(playbackInterval);
    playbackInterval = null;
    btnPlay.textContent = '▶ Play Recording';
    return;
  }

  btnPlay.textContent = '■ Stop';
  let i = 0;

  playbackInterval = setInterval(() => {
    if (i >= recData.length) {
      clearInterval(playbackInterval);
      playbackInterval = null;
      btnPlay.textContent = '▶ Play Recording';
      return;
    }
    const d = recData[i];
    if (synth && d.freq)  synth.frequency.rampTo(d.freq, 0.04);
    if (reverb)            reverb.wet.rampTo(d.reverbWet, 0.05);
    if (vol)               vol.volume.rampTo(d.vol, 0.04);
    i++;
  }, 33); // ~30fps 回放
});
