/* =====================================================
   LITTLE BLOOM · app.js
   SPA Routing + Step Wizards + AI Integration
   ===================================================== */

// ── API Config ──────────────────────────────────────────
const OPENAI_API_KEY = 'YOUR_OPENAI_API_KEY';
const REPLICATE_PROXY_URL = 'https://itp-ima-replicate-proxy.web.app/api/create_n_get';
const REPLICATE_AUTH_TOKEN = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjJiMzZhYjQxYTczOTJlMTRlNjM1ZmRlM2M2YWYwOWZlYmFhM2YyZDYiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiSmVzc2ljYSBTdW4iLCJwaWN0dXJlIjoiaHR0cHM6Ly9saDMuZ29vZ2xldXNlcmNvbnRlbnQuY29tL2EvQUNnOG9jS2ttNUtMMGJsb2o3QzgxMlJXRjRzT3hrWVlkMFotTDZQdEdkWkYyalFjY3BfbzdHWT1zOTYtYyIsImlzcyI6Imh0dHBzOi8vc2VjdXJldG9rZW4uZ29vZ2xlLmNvbS9pdHAtaW1hLXJlcGxpY2F0ZS1wcm94eSIsImF1ZCI6Iml0cC1pbWEtcmVwbGljYXRlLXByb3h5IiwiYXV0aF90aW1lIjoxNzc3MjUzOTg4LCJ1c2VyX2lkIjoiNWgydjJEWkRMSFFzTjJ3MDY2RU96SkE1M3d3MSIsInN1YiI6IjVoMnYyRFpETEhRc04ydzA2NkVPekpBNTN3dzEiLCJpYXQiOjE3NzcyNTM5ODgsImV4cCI6MTc3NzI1NzU4OCwiZW1haWwiOiJyczg3OTNAbnl1LmVkdSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJmaXJlYmFzZSI6eyJpZGVudGl0aWVzIjp7Imdvb2dsZS5jb20iOlsiMTAzMTM2Mjk2NTgxMjkzOTgwOTM1Il0sImVtYWlsIjpbInJzODc5M0BueXUuZWR1Il19LCJzaWduX2luX3Byb3ZpZGVyIjoiZ29vZ2xlLmNvbSJ9fQ.TAHRXQny50pzcVn4ranvrcluURXQEhokZG9tcIZtbifukK6yul4ds1Z_MZWeDlxt-hldPdjHIFd75kF75Kj6o-Cd7koVzGyl4SxztjXD9Bk17UK_qUQcB8EYiLrgigVZbIpwawH_xxDGRwSPn9eRw9TLt_ctd2_gvwJsVSy2W8Hou2SBOmf_92hb7Aev1YU8vcLqZsQv6Iw89M1ARO2kWQapgZIvKXskNmCevXfuqk-ng1xCAUtNg2y3SY54NpoWD1EqoPrFDoeS5ffRdLJunSadnkIpsTlCzqueo2bEy1C0HWD3t8IzlBkXtSlE277jua57wkTjHot2_k8c6mcnkQ.eyJuYW1lIjoiSmVzc2ljYSBTdW4iLCJwaWN0dXJlIjoiaHR0cHM6Ly9saDMuZ29vZ2xldXNlcmNvbnRlbnQuY29tL2EvQUNnOG9jS2ttNUtMMGJsb2o3QzgxMlJXRjRzT3hrWVlkMFotTDZQdEdkWkYyalFjY3BfbzdHWT1zOTYtYyIsImlzcyI6Imh0dHBzOi8vc2VjdXJldG9rZW4uZ29vZ2xlLmNvbS9pdHAtaW1hLXJlcGxpY2F0ZS1wcm94eSIsImF1ZCI6Iml0cC1pbWEtcmVwbGljYXRlLXByb3h5IiwiYXV0aF90aW1lIjoxNzcxOTg2OTM2LCJ1c2VyX2lkIjoiNWgydjJEWkRMSFFzTjJ3MDY2RU96SkE1M3d3MSIsInN1YiI6IjVoMnYyRFpETEhRc04ydzA2NkVPekpBNTN3dzEiLCJpYXQiOjE3NzYyMDE4NDMsImV4cCI6MTc3NjIwNTQ0MywiZW1haWwiOiJyczg3OTNAbnl1LmVkdSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJmaXJlYmFzZSI6eyJpZGVudGl0aWVzIjp7Imdvb2dsZS5jb20iOlsiMTAzMTM2Mjk2NTgxMjkzOTgwOTM1Il0sImVtYWlsIjpbInJzODc5M0BueXUuZWR1Il19LCJzaWduX2luX3Byb3ZpZGVyIjoiZ29vZ2xlLmNvbSJ9fQ.zNSEsz2zyirPvaoZYjnMCd__tOAdOeT8wP-PzA-uWLRXgClHGkiA6wqsB4S9zMjP3tnKamPSXScmKgKVpjlWKjmWnwfJfqqfgkaZF1IK-Z5JHQXyGOzn8CLNw3BGHNmd0DU-2BwQP-U1nMXvCYPhp68OKfZmg3NJeRtvOrREx5zpiN7fjBYicdy9gEb8rukXPq922V-cygSzKUeimnfF8lp6nHpPDenzRbxHTn_J67WRNzRozISZLk8RJmvCPllocBtODXbdBYri4cp1n9gFZ1ywmS7RsayFZ_4Cu-Ed0GRuRDuFxezmMpoSqaehQvOHxgzX0ho7Q3lowhAu8XFGBA';

const FALLBACK_DRAWING_IMG = 'exampleimages/rainbow.png';

/** Safe <img src> for local paths (encode spaces / unicode); leaves http(s), data:, blob: as-is. */
function publicImgSrc(urlOrPath) {
  const u = String(urlOrPath || FALLBACK_DRAWING_IMG).trim();
  if (/^(?:https?:|data:|blob:)/i.test(u)) return u;
  return u.split('/').filter(Boolean).map(encodeURIComponent).join('/');
}

async function askForPicture(prompt) {
  const data = {
    model: 'black-forest-labs/flux-schnell',
    input: { prompt },
  };
  const response = await fetch(REPLICATE_PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${REPLICATE_AUTH_TOKEN}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Replicate API error: ' + response.status);
  const prediction = await response.json();
  const output = prediction.output;
  if (Array.isArray(output)) return output[0];
  return output;
}

async function askForImageEdit(prompt, referenceImageDataUrl) {
  const input = { prompt };
  if (referenceImageDataUrl) {
    input.image = referenceImageDataUrl;
  }
  const data = {
    model: 'qwen/qwen-image-edit',
    input,
  };
  const response = await fetch(REPLICATE_PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${REPLICATE_AUTH_TOKEN}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Replicate API error: ' + response.status);
  const prediction = await response.json();
  const output = prediction.output;
  if (Array.isArray(output)) return output[0];
  return output;
}

/**
 * Official Replicate TTS — same `{ model, input }` as Flux / Llama.
 * minimax/speech-2.8-turbo: low-latency line; voices: https://replicate.com/minimax/speech-2.8-turbo/readme
 */
const REPLICATE_TTS_MODEL = 'minimax/speech-2.8-turbo';
/** Warm, upbeat female (avoid Abbess / slow+neutral — can sound tearful). Alternatives: Lively_Girl, Exuberant_Girl */
const REPLICATE_TTS_VOICE_ID = 'Inspirational_girl';

/** Pull a playable HTTPS URL from Replicate prediction.output (string, array, or { url } / FileOutput JSON). */
function normalizeReplicateAudioUrl(output) {
  if (output == null) return null;
  if (typeof output === 'string') {
    const s = output.trim();
    if (s.startsWith('http://') || s.startsWith('https://')) return s;
    return null;
  }
  if (Array.isArray(output)) {
    for (const item of output) {
      const u = normalizeReplicateAudioUrl(item);
      if (u) return u;
    }
    return null;
  }
  if (typeof output === 'object') {
    const u = output.url || output.uri || output.href;
    if (typeof u === 'string' && (u.startsWith('http://') || u.startsWith('https://'))) return u.trim();
  }
  return null;
}

/**
 * @returns {Promise<string>} Temporary HTTPS URL to generated audio (wav/mp3).
 */
async function askForReplicateSpeechUrl(cleanText) {
  const t = String(cleanText || '').trim().slice(0, 2500);
  if (!t) throw new Error('Replicate TTS: empty text');
  const data = {
    model: REPLICATE_TTS_MODEL,
    input: {
      text: t,
      voice_id: REPLICATE_TTS_VOICE_ID,
      speed: 1,
      emotion: 'happy',
      pitch: 1,
    },
  };
  const response = await fetch(REPLICATE_PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${REPLICATE_AUTH_TOKEN}`,
    },
    body: JSON.stringify(data),
  });
  const rawText = await response.text().catch(() => '');
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        'Replicate 授权失败 (' + response.status + ')。请更新 app.js 里的 REPLICATE_AUTH_TOKEN（Firebase 登录后重新导出 JWT）。',
      );
    }
    throw new Error('Replicate TTS HTTP ' + response.status + ': ' + rawText.slice(0, 200));
  }
  let prediction;
  try {
    prediction = JSON.parse(rawText || '{}');
  } catch {
    throw new Error('Replicate TTS: invalid JSON from proxy');
  }
  if (prediction.status === 'failed') {
    const errDetail = prediction.error || prediction.detail || JSON.stringify(prediction).slice(0, 300);
    throw new Error('Replicate TTS 运行失败: ' + errDetail);
  }
  const url = normalizeReplicateAudioUrl(prediction.output);
  if (!url) {
    console.warn('Replicate TTS: unexpected prediction shape', prediction);
    throw new Error('Replicate TTS: response had no audio URL');
  }
  return url;
}

// ══════════════════════════════════════════════════════════
// CUSTOM CURSOR
// ══════════════════════════════════════════════════════════

const cursor = document.getElementById('cursor');
const cursorTrail = document.getElementById('cursorTrail');

if (cursor && cursorTrail) {
  document.addEventListener('mousemove', (e) => {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';
    setTimeout(() => {
      cursorTrail.style.left = e.clientX + 'px';
      cursorTrail.style.top = e.clientY + 'px';
    }, 80);
  });

  function bindCursorHover() {
    document.querySelectorAll('button, a, input, textarea, label, select, .gallery-item, .quick-action-card, .create-hub-card').forEach(el => {
      if (el.dataset.cursorBound) return;
      el.dataset.cursorBound = 'true';
      el.addEventListener('mouseenter', () => cursor.style.transform = 'translate(-50%,-50%) scale(2)');
      el.addEventListener('mouseleave', () => cursor.style.transform = 'translate(-50%,-50%) scale(1)');
    });
  }
  bindCursorHover();
}


// ══════════════════════════════════════════════════════════
// FLOATING DECO ELEMENTS
// ══════════════════════════════════════════════════════════

const DECO_SVGS = [
  '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="12" cy="12" r="3.5"/></svg>',
  '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M12 3v18M3 12h18"/></svg>',
  '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M12 2l2.2 5.5L20 10l-5.5 2.2L12 18l-2.2-5.5L4 10l5.5-2.2L12 2z"/></svg>',
  '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="7" y="7" width="10" height="10" rx="1.5"/></svg>',
  '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M12 5c-2 3-4 4-4 7a4 4 0 0 0 8 0c0-3-2-4-4-7z"/></svg>',
];
const floatDeco = document.getElementById('floatDeco');
if (floatDeco) {
  for (let i = 0; i < 10; i++) {
    const el = document.createElement('div');
    el.className = 'deco-el';
    el.innerHTML = DECO_SVGS[i % DECO_SVGS.length];
    el.style.left = (5 + Math.random() * 90) + 'vw';
    el.style.top = (10 + Math.random() * 80) + 'vh';
    el.style.animationDelay = (i * 1.4) + 's';
    el.style.animationDuration = (18 + Math.random() * 8) + 's';
    floatDeco.appendChild(el);
  }
}


// ══════════════════════════════════════════════════════════
// AUTH STATE
// ══════════════════════════════════════════════════════════

let _isLoggedIn = false;
let _childProfiles = [];

function isLoggedIn() { return _isLoggedIn; }

function showLanding() {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-landing').classList.add('active');
  document.getElementById('navLanding').style.display = '';
  document.getElementById('navApp').style.display = 'none';
  document.getElementById('mobileNav').style.display = 'none';
  const fab = document.getElementById('floatingChatBtn');
  if (fab) fab.style.display = 'none';
  const landingDeco = document.getElementById('landingFloatDeco');
  if (landingDeco) landingDeco.classList.add('landing-float-deco--on');
  window.scrollTo({ top: 0 });
}

function enterApp(startPage) {
  const landingDeco = document.getElementById('landingFloatDeco');
  if (landingDeco) landingDeco.classList.remove('landing-float-deco--on');
  document.getElementById('navLanding').style.display = 'none';
  document.getElementById('navApp').style.display = '';
  document.getElementById('mobileNav').style.display = '';
  const fab = document.getElementById('floatingChatBtn');
  if (fab) fab.style.display = '';
  navigateTo(startPage || 'dashboard');
}

function openLoginModal() {
  document.getElementById('loginOverlay').style.display = 'flex';
}

function closeLoginModal() {
  document.getElementById('loginOverlay').style.display = 'none';
}

function addLoginChild() {
  const container = document.getElementById('loginChildren');
  const row = document.createElement('div');
  row.className = 'login-child-row';
  row.innerHTML = `
    <input type="text" class="login-input" placeholder="Child's name" maxlength="30" data-field="name" />
    <input type="date" class="login-input" data-field="birthday" />`;
  container.appendChild(row);
}

function appLogin() {
  _isLoggedIn = true;
  _childProfiles = [];

  document.querySelectorAll('#loginChildren .login-child-row').forEach(row => {
    const name = row.querySelector('[data-field="name"]')?.value.trim();
    const birthday = row.querySelector('[data-field="birthday"]')?.value;
    if (name) _childProfiles.push({ name, birthday: birthday || '' });
  });

  if (_childProfiles.length > 0) {
    const names = _childProfiles.map(c => c.name).join(' & ');
    const greeting = document.getElementById('dashboardGreeting');
    if (greeting) greeting.textContent = `Welcome, ${names}'s family!`;
  }

  closeLoginModal();
  enterApp('dashboard');
}

function appLogout() {
  _isLoggedIn = false;
  _childProfiles = [];
  showLanding();
  history.replaceState(null, '', '#');
}

function scrollToLandingSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}


// ══════════════════════════════════════════════════════════
// SPA NAVIGATION / ROUTING
// ══════════════════════════════════════════════════════════

const VALID_PAGES = ['landing', 'dashboard', 'polish', 'story-chat', 'gallery', 'memories', 'community', 'profile', 'settings'];
let currentPageId = 'landing';

function navigateTo(pageId) {
  if (!VALID_PAGES.includes(pageId)) return;

  if (pageId !== 'landing' && !_isLoggedIn) {
    openLoginModal();
    return;
  }

  if (currentPageId === 'story-chat' && pageId !== 'story-chat') {
    stopVoiceChat();
  }

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

  const targetPage = document.getElementById('page-' + pageId);
  if (targetPage) {
    targetPage.classList.add('active');
    targetPage.style.animation = 'none';
    targetPage.offsetHeight;
    targetPage.style.animation = '';
  }

  currentPageId = pageId;
  updateNavActive(pageId);
  closeMobileMenu();
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (pageId === 'gallery') renderGallery();
  if (pageId === 'memories') renderTimeline();
  if (pageId === 'community') renderCommunity();
  if (pageId === 'story-chat') initStoryChat();
  if (pageId === 'dashboard') renderRecentCreations();
  if (pageId === 'profile') updateProfileStats();

  const fab = document.getElementById('floatingChatBtn');
  if (fab) {
    const hideFab = pageId === 'story-chat' || pageId === 'landing' || pageId === 'community';
    fab.style.display = hideFab ? 'none' : '';
  }

  history.pushState({ page: pageId }, '', '#' + pageId);
  bindCursorHover();
}

function updateNavActive(pageId) {
  const mySpacePages = ['dashboard', 'polish', 'story-chat', 'gallery', 'memories', 'profile', 'settings'];
  const navPage = mySpacePages.includes(pageId) ? 'dashboard' : pageId;

  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.dataset.page === navPage);
  });

  document.querySelectorAll('.mobile-nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === navPage || item.dataset.page === pageId);
  });
}

window.addEventListener('popstate', (e) => {
  const page = e.state?.page || 'landing';
  if (page === 'landing' || !_isLoggedIn) {
    showLanding();
  } else {
    navigateTo(page);
  }
});

window.addEventListener('DOMContentLoaded', () => {
  const hash = window.location.hash.replace('#', '');
  if (!hash || hash === 'landing' || hash === 'home') {
    showLanding();
  } else {
    showLanding();
  }
});


// ══════════════════════════════════════════════════════════
// NAV SCROLL BEHAVIOR
// ══════════════════════════════════════════════════════════

window.addEventListener('scroll', () => {
  const nav = document.getElementById('nav');
  if (nav) nav.classList.toggle('scrolled', window.scrollY > 30);
}, { passive: true });


// ══════════════════════════════════════════════════════════
// MOBILE MENU
// ══════════════════════════════════════════════════════════

const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');

if (hamburger && mobileMenu) {
  hamburger.addEventListener('click', () => {
    const isOpen = mobileMenu.classList.toggle('open');
    hamburger.classList.toggle('open', isOpen);
    hamburger.setAttribute('aria-expanded', isOpen);
  });
}

function closeMobileMenu() {
  if (mobileMenu) mobileMenu.classList.remove('open');
  if (hamburger) {
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
  }
}


// ══════════════════════════════════════════════════════════
// NAV LINK CLICKS
// ══════════════════════════════════════════════════════════

document.querySelectorAll('.nav-link, .nav-submenu a').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const page = link.dataset.page;
    if (page) navigateTo(page);
  });
});


// ══════════════════════════════════════════════════════════
// CHIP SINGLE SELECT
// ══════════════════════════════════════════════════════════

function initChipGroups() {
  document.querySelectorAll('.chip-group').forEach(group => {
    group.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        group.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
      });
    });
  });
}
initChipGroups();


// (Storybook wizard removed — app focuses on Polish Drawing)


// ══════════════════════════════════════════════════════════
// POLISH DRAWING WIZARD
// ══════════════════════════════════════════════════════════

let polishFile = null;
let polishFileDataUrl = null;
let polishAutoTitle = '';

function polishGoStep(step) {
  if (step !== 3) hidePolishGallerySuccess();
  for (let i = 1; i <= 3; i++) {
    const el = document.getElementById('polish-step-' + i);
    if (el) el.classList.toggle('active', i === step);
  }
  updateStepIndicator('page-polish', step);

  if (step === 1 && polishFileDataUrl) {
    const preview = document.getElementById('polishPreview');
    const uploadInner = document.getElementById('polishUploadInner');
    const nextBtn = document.getElementById('polishNextStep1');
    if (preview && !preview.querySelector('img')) {
      preview.innerHTML = '';
      const img = document.createElement('img');
      img.src = polishFileDataUrl;
      img.className = 'preview-thumb';
      img.alt = 'Uploaded drawing';
      img.style.width = '120px';
      img.style.height = '120px';
      preview.appendChild(img);
    }
    if (uploadInner) uploadInner.style.display = 'none';
    if (nextBtn) nextBtn.disabled = false;
  }

  if (step === 3) {
    const preGenerate = document.getElementById('polishPreGenerate');
    const progress = document.getElementById('polishProgress');
    const result = document.getElementById('polishResult');
    if (preGenerate) preGenerate.style.display = '';
    if (progress) progress.style.display = 'none';
    if (result) result.style.display = 'none';
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function reGeneratePolish() {
  hidePolishGallerySuccess();
  polishGoStep(3);
  generatePolish();
}

function polishNewDrawing() {
  hidePolishGallerySuccess();
  polishFile = null;
  polishFileDataUrl = null;
  const preview = document.getElementById('polishPreview');
  const uploadInner = document.getElementById('polishUploadInner');
  const nextBtn = document.getElementById('polishNextStep1');
  if (preview) preview.innerHTML = '';
  if (uploadInner) uploadInner.style.display = '';
  if (nextBtn) nextBtn.disabled = true;
  polishGoStep(1);
}

function initPolishUpload() {
  const dropzone = document.getElementById('polishDropzone');
  const fileInput = document.getElementById('polishFileInput');
  const preview = document.getElementById('polishPreview');
  const uploadInner = document.getElementById('polishUploadInner');
  const nextBtn = document.getElementById('polishNextStep1');

  if (!dropzone || !fileInput) return;

  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
  });

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    handlePolishFile(e.dataTransfer.files);
  });

  fileInput.addEventListener('change', () => handlePolishFile(fileInput.files));

  function handlePolishFile(files) {
    const file = files[0];
    if (!file || !file.type.startsWith('image/')) return;
    polishFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      polishFileDataUrl = e.target.result;
      preview.innerHTML = '';
      const img = document.createElement('img');
      img.src = e.target.result;
      img.className = 'preview-thumb';
      img.alt = 'Uploaded drawing';
      img.style.width = '120px';
      img.style.height = '120px';
      preview.appendChild(img);
      uploadInner.style.display = 'none';
      nextBtn.disabled = false;
    };
    reader.readAsDataURL(file);
  }
}
initPolishUpload();


// ══════════════════════════════════════════════════════════
// STEP INDICATOR UPDATER
// ══════════════════════════════════════════════════════════

function updateStepIndicator(pageId, activeStep) {
  const page = document.getElementById(pageId);
  if (!page) return;

  const dots = page.querySelectorAll('.step-dot');
  const linePrefix = 'polishStepLine';

  dots.forEach((dot, i) => {
    const stepNum = i + 1;
    dot.classList.remove('active', 'completed');
    if (stepNum === activeStep) {
      dot.classList.add('active');
    } else if (stepNum < activeStep) {
      dot.classList.add('completed');
    }
  });

  for (let i = 1; i <= 2; i++) {
    const line = document.getElementById(linePrefix + i);
    if (line) {
      line.style.width = i < activeStep ? '100%' : '0';
    }
  }
}


// ══════════════════════════════════════════════════════════
// FORM STATE
// ══════════════════════════════════════════════════════════

function getActiveChip(groupId) {
  const group = document.getElementById(groupId);
  if (!group) return '';
  const active = group.querySelector('.chip.active');
  return active ? (active.dataset.value || active.textContent.trim()) : '';
}

function getFormState() {
  return {
    polishMode: document.querySelector('input[name="polishMode"]:checked')?.value || 'clean',
  };
}


// ══════════════════════════════════════════════════════════
// POLISH DRAWING
// ══════════════════════════════════════════════════════════

async function generatePolish() {
  const mode = document.querySelector('input[name="polishMode"]:checked')?.value || 'clean';
  const modeConfig = getPolishMode(mode);
  const btn = document.getElementById('polishGenerateBtn');
  const preGenerate = document.getElementById('polishPreGenerate');
  const progress = document.getElementById('polishProgress');
  const result = document.getElementById('polishResult');

  if (!polishFile) {
    showToast('Please upload a drawing first.');
    return;
  }

  hidePolishGallerySuccess();
  preGenerate.style.display = 'none';
  progress.style.display = 'block';
  result.style.display = 'none';

  const progressTitle = progress.querySelector('.progress-title');
  if (progressTitle) progressTitle.textContent = `Creating ${modeConfig.resultLabel}...`;

  simulateProgress('polishProgressBar', 'polishProgressStatus', modeConfig.progressSteps);

  if (!modeConfig.usesAI) {
    polishAutoTitle = polishAutoTitle || 'My Drawing';
    const text = 'Your child\'s original artwork, beautifully framed — not a single pixel changed.';
    showPolishResult(text);
    showToast(`${modeConfig.resultLabel} ready.`);
    generatePolishedImage(text, mode, false);
    return;
  }

  try {
    const base64 = await fileToBase64(polishFile);
    const prompt = buildPolishPrompt(mode) + `\nAlso give this drawing a short creative title (2-4 words, like "Ocean Adventure" or "Rainbow House"). Put the title on a separate last line starting with "TITLE: ".`;
    const apiResult = await callGPTWithImage(prompt, base64, polishFile.type);

    const titleMatch = apiResult.match(/TITLE:\s*(.+)/i);
    polishAutoTitle = titleMatch ? titleMatch[1].trim() : 'My Drawing';
    const cleanText = apiResult.replace(/TITLE:\s*.+/i, '').trim();

    showPolishResult(cleanText);
    showToast(`${modeConfig.resultLabel} ready.`);

    generatePolishedImage(cleanText, mode, false);
  } catch (err) {
    console.error(err);
    const fallbackText = 'A beautiful piece full of imagination and childlike wonder.';
    polishAutoTitle = 'My Drawing';
    showPolishResult(fallbackText);
    showToast(`${modeConfig.resultLabel} ready (demo mode — connect vision API for best text; image still uses strip prompt).`);

    generatePolishedImage(fallbackText, mode, true);
  }

  function showPolishResult(text) {
    finishProgress('polishProgressBar');
    setTimeout(() => {
      progress.style.display = 'none';
      result.style.display = 'block';

      const badge = result.querySelector('.result-badge');
      if (badge) badge.textContent = modeConfig.resultLabel;
      const h2 = result.querySelector('h2');
      if (h2) h2.textContent = `Original → ${modeConfig.resultLabel}`;

      const polishedLabel = document.querySelector('#polishResultImg')?.closest('.comparison-side')?.querySelector('.comparison-label');
      if (polishedLabel) polishedLabel.textContent = modeConfig.resultLabel;

      if (polishFileDataUrl) {
        const origImg = document.getElementById('polishOriginalImg');
        origImg.innerHTML = `<img src="${polishFileDataUrl}" alt="Original drawing" style="width:100%;object-fit:contain;display:block;" />`;
      }

      document.getElementById('polishResultText').textContent = text;
      hidePolishGallerySuccess();
    }, 600);
  }
}

function buildPolishPrompt(mode) {
  return buildPolishTextPrompt(mode);
}

async function callGPTWithImage(prompt, base64, mediaType) {
  const response = await fetch('/api/openai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${mediaType};base64,${base64}` } },
          { type: 'text', text: prompt }
        ]
      }]
    })
  });
  if (!response.ok) throw new Error('API error');
  const data = await response.json();
  return data.choices[0].message.content;
}

async function callGPT(prompt, maxTokens) {
  const response = await fetch('/api/openai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: maxTokens || 1000,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  if (!response.ok) throw new Error('API error: ' + response.status);
  const data = await response.json();
  return data.choices[0].message.content;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function hidePolishGallerySuccess() {
  const el = document.getElementById('polishGallerySuccess');
  if (el) el.style.display = 'none';
}

function showPolishGallerySuccess() {
  const el = document.getElementById('polishGallerySuccess');
  if (el) {
    el.style.display = 'block';
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function goToMyGalleryFromPolish() {
  hidePolishGallerySuccess();
  navigateTo('gallery');
}

function savePolishToGallery() {
  hidePolishGallerySuccess();
  const modal = document.getElementById('saveGalleryModal');
  const titleInput = document.getElementById('saveGalleryTitle');
  const ageSelect = document.getElementById('saveGalleryAge');
  titleInput.value = polishAutoTitle || 'My Drawing';
  ageSelect.value = '';
  const surfaceSelect = document.getElementById('saveGallerySurface');
  if (surfaceSelect) surfaceSelect.value = '';
  modal.style.display = 'flex';
}

function confirmSaveToGallery() {
  const text = document.getElementById('polishResultText')?.textContent || '';
  const resultImgEl = document.querySelector('#polishResultImg img');
  const imageUrl = resultImgEl ? resultImgEl.src : null;
  const title = document.getElementById('saveGalleryTitle').value.trim() || polishAutoTitle || 'My Drawing';
  const age = document.getElementById('saveGalleryAge').value;
  const surface = document.getElementById('saveGallerySurface').value;

  const tags = ['polished', 'drawing'];
  if (age) tags.push(`Age ${age}`);
  if (surface) tags.push(surface);

  addDemoGalleryItem({
    imageUrl: imageUrl || FALLBACK_DRAWING_IMG,
    originalUrl: polishFileDataUrl || null,
    title: title,
    childAge: age || '',
    surface: surface || '',
    date: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    story: text,
    tags: tags
  });
  closeSaveGalleryModal();
  showToast('Added to your personal gallery');
  showPolishGallerySuccess();
}

function closeSaveGalleryModal() {
  document.getElementById('saveGalleryModal').style.display = 'none';
}

async function generatePolishedImage(description, mode, visionAnalysisFailed) {
  const resultImg = document.getElementById('polishResultImg');
  const modeConfig = getPolishMode(mode);

  if (!modeConfig.usesAI) {
    renderFramedArtwork(resultImg);
    return;
  }

  resultImg.innerHTML = '<div class="comparison-placeholder comparison-placeholder--text">Generating…</div>';

  const imgPrompt = visionAnalysisFailed && typeof buildPolishImagePromptForFailedVision === 'function'
    ? buildPolishImagePromptForFailedVision(mode)
    : buildPolishImagePrompt(mode, description);

  try {
    let imageUrl;
    if (polishFileDataUrl) {
      imageUrl = await askForImageEdit(imgPrompt, polishFileDataUrl);
    } else {
      imageUrl = await askForPicture(imgPrompt);
    }

    if (imageUrl) {
      resultImg.innerHTML =
        `<img src="${imageUrl}" alt="AI-polished drawing" ` +
        `style="width:100%;object-fit:contain;border-radius:var(--radius-sm);display:block;" />`;
    } else {
      console.warn('Polish image API returned empty output');
      showToast('Image model returned no image. Check Replicate / qwen-image-edit setup.');
      resultImg.innerHTML =
        `<div class="comparison-placeholder comparison-placeholder--text">No image returned. Try again or verify API.</div>`;
    }
  } catch (err) {
    console.warn('Failed to generate polished image:', err);
    showToast('Could not reach image edit API. Check network and Replicate credentials.');
    resultImg.innerHTML =
      `<div class="comparison-placeholder"><img src="${publicImgSrc(FALLBACK_DRAWING_IMG)}" alt="" class="comparison-placeholder-img" /></div>`;
  }
}

function renderFramedArtwork(container) {
  if (!polishFileDataUrl) {
    container.innerHTML =
      `<div class="comparison-placeholder"><img src="${publicImgSrc(FALLBACK_DRAWING_IMG)}" alt="" class="comparison-placeholder-img" /></div>`;
    return;
  }
  container.innerHTML = `
    <div class="artwork-frame">
      <div class="artwork-frame-border">
        <div class="artwork-mat">
          <img src="${polishFileDataUrl}" alt="Framed artwork" class="artwork-img" />
        </div>
      </div>
      <div class="artwork-nameplate">
        <span class="artwork-nameplate-text caveat">Little Artist</span>
      </div>
    </div>`;
}




// ══════════════════════════════════════════════════════════
// PROGRESS SIMULATION
// ══════════════════════════════════════════════════════════

const progressIntervals = {};

function simulateProgress(barId, statusId, milestones) {
  const bar = document.getElementById(barId);
  const status = document.getElementById(statusId);
  if (!bar || !status) return;

  const fill = bar.querySelector('.progress-bar-fill');
  let current = 0;
  let milestoneIdx = 0;

  if (progressIntervals[barId]) clearInterval(progressIntervals[barId]);

  progressIntervals[barId] = setInterval(() => {
    current += Math.random() * 3 + 0.5;
    if (current > 92) current = 92;

    fill.style.width = current + '%';
    bar.setAttribute('aria-valuenow', Math.round(current));

    if (milestoneIdx < milestones.length && current >= milestones[milestoneIdx].at) {
      status.textContent = milestones[milestoneIdx].text;
      milestoneIdx++;
    }
  }, 200);
}

function finishProgress(barId) {
  if (progressIntervals[barId]) clearInterval(progressIntervals[barId]);
  const bar = document.getElementById(barId);
  if (!bar) return;
  const fill = bar.querySelector('.progress-bar-fill');
  fill.style.width = '100%';
  bar.setAttribute('aria-valuenow', 100);
}


// ══════════════════════════════════════════════════════════
// GALLERY DATA & RENDER
// ══════════════════════════════════════════════════════════

const galleryData = [
  { imageUrl: 'exampleimages/t-rex-and-friends.png', title: "Leo's Dinosaur Kingdom", date: 'March 2024', story: "Leo spent an entire afternoon creating this prehistoric world. The careful arrangement of each dinosaur shows just how much he's learned about their habitats.", tags: ['drawing', 'art', 'polished'] },
  { imageUrl: 'exampleimages/sunflower.png', title: 'Spring Picnic at the Park', date: 'April 2024', story: 'She ran ahead on the path and stopped to touch every flower she found. The whole afternoon smelled like grass and sunscreen.', tags: ['trip', 'family', 'polished'] },
  { imageUrl: 'exampleimages/rainbow.png', title: 'First Day of School', date: 'September 2024', story: 'She waved goodbye at the gate without looking back — braver than any of us expected. That tiny backpack, that big world.', tags: ['first', 'school', 'polished'] },
  { imageUrl: 'exampleimages/birthday.png', title: '5th Birthday Party', date: 'July 2024', story: 'Five candles, one big breath. She asked for her wish to come true — she wanted a dog, a little brother, and a unicorn.', tags: ['birthday', 'milestone', 'polished'] },
  { imageUrl: 'exampleimages/under-the-sea.png', title: 'Under the Sea', date: 'August 2024', story: 'The wave knocked her down and she came up laughing. She demanded to go back in immediately.', tags: ['first', 'trip', 'polished'] },
  { imageUrl: 'exampleimages/cat.png', title: 'Afternoon with Our Cat', date: 'June 2024', story: 'She mixed every color together until it turned brown, then decided brown was "the color of sunshine underground."', tags: ['drawing', 'art', 'polished'] },
  { imageUrl: 'exampleimages/lion.png', title: 'King of the Jungle', date: 'May 2024', story: 'He roared the whole time he drew the mane. Full commitment.', tags: ['drawing', 'adventure', 'polished'] },
  { imageUrl: 'exampleimages/myfamily.png', title: 'My Family Portrait', date: 'February 2024', story: 'First time drawing all of us together — the little one on the right is the dog.', tags: ['family', 'milestone', 'polished'] },
  { imageUrl: 'exampleimages/rocket.png', title: 'Rocket to the Moon', date: 'January 2024', story: 'Apparently there are cats on the moon. He was very sure.', tags: ['drawing', 'adventure', 'polished'] },
];

let currentView = 'grid';
let currentFilter = 'all';

function renderGallery() {
  const grid = document.getElementById('galleryGrid');
  const empty = document.getElementById('galleryEmpty');
  if (!grid) return;

  const filtered = currentFilter === 'all'
    ? galleryData
    : galleryData.filter(item => item.tags.some(t => t.includes(currentFilter)));

  if (filtered.length === 0) {
    grid.style.display = 'none';
    if (empty) empty.style.display = 'block';
    return;
  }

  grid.style.display = '';
  if (empty) empty.style.display = 'none';
  grid.innerHTML = '';

  const floatPositions = [
    { top: '40px', left: '5%' },
    { top: '20px', left: '32%' },
    { top: '100px', left: '58%' },
    { top: '300px', left: '15%' },
    { top: '280px', left: '48%' },
    { top: '500px', left: '68%' },
  ];

  filtered.forEach((item, i) => {
    const el = document.createElement('div');
    el.className = 'gallery-item' + (currentView === 'float' ? ' float-item' : '');
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-label', item.title);

    if (currentView === 'float' && floatPositions[i]) {
      el.style.top = floatPositions[i].top;
      el.style.left = floatPositions[i].left;
    }

    el.style.animationDelay = (i * 0.06) + 's';
    const src = publicImgSrc(item.imageUrl || FALLBACK_DRAWING_IMG);
    const imgContent =
      `<img src="${src}" alt="${item.title}" style="width:100%;height:100%;object-fit:cover;" />`;
    el.innerHTML = `
      <div class="gallery-img">${imgContent}</div>
      <div class="gallery-info">
        <div class="gallery-title">${item.title}</div>
        <div class="gallery-date">${item.date}</div>
        <div class="gallery-tags">
          ${item.tags.map(t => `<span class="gallery-tag-pill">${t}</span>`).join('')}
        </div>
      </div>`;

    el.addEventListener('click', () => openLightbox(item));
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter') openLightbox(item); });
    grid.appendChild(el);
  });

  bindCursorHover();
}

function addDemoGalleryItem(item) {
  galleryData.unshift(item);
  renderGallery();
}

function filterGallery(filter) {
  currentFilter = filter;
  document.querySelectorAll('.gallery-filters .chip').forEach(c => {
    c.classList.toggle('active', c.dataset.filter === filter);
  });
  renderGallery();
}

function setView(mode) {
  currentView = mode;
  const grid = document.getElementById('galleryGrid');
  if (grid) grid.classList.toggle('float-mode', mode === 'float');
  document.getElementById('viewGrid')?.classList.toggle('active', mode === 'grid');
  document.getElementById('viewFloat')?.classList.toggle('active', mode === 'float');
  renderGallery();
}

let currentLightboxItem = null;

function openLightbox(item) {
  currentLightboxItem = item;
  const lightboxImgWrap = document.getElementById('lightboxImg');
  const lbSrc = publicImgSrc(item.imageUrl || FALLBACK_DRAWING_IMG);
  lightboxImgWrap.innerHTML =
    `<img src="${lbSrc}" alt="${item.title}" style="max-width:100%;max-height:60vh;object-fit:contain;border-radius:var(--radius-md);" />`;
  document.getElementById('lightboxTitle').textContent = item.title;
  document.getElementById('lightboxStory').textContent = item.story;
  document.getElementById('lightboxMeta').innerHTML =
    item.tags.map(t => `<span class="gallery-tag-pill">${t}</span>`).join('');
  document.getElementById('lightbox').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function shareFromLightbox() {
  if (!currentLightboxItem) return;
  closeLightbox();
  shareSelectedItem = currentLightboxItem;
  const modal = document.getElementById('shareModal');
  document.getElementById('shareStep1').style.display = 'none';
  document.getElementById('shareStep2').style.display = 'block';
  const preview = document.getElementById('sharePreviewImg');
  const shSrc = publicImgSrc(shareSelectedItem.imageUrl || FALLBACK_DRAWING_IMG);
  preview.innerHTML = `<img src="${shSrc}" alt="${shareSelectedItem.title}" />`;
  document.getElementById('shareChildAge').value = '';
  document.getElementById('shareCaption').value = '';
  modal.style.display = 'flex';
}

function closeLightbox() {
  document.getElementById('lightbox').classList.remove('open');
  document.body.style.overflow = '';
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeLightbox();
});


// ══════════════════════════════════════════════════════════
// MEMORY NOTEBOOK (Two-Panel Book)
// ══════════════════════════════════════════════════════════

let memoryIdCounter = 100;
const memoryData = [
  {
    id: 'm1', title: 'First Day at Sunflower Kindergarten',
    date: 'Sep 15, 2024', summary: 'She walked in without tears — braver than anyone could have imagined.',
    full_text: 'She walked in without tears — braver than anyone could have imagined. She found her cubby, hung up her little backpack, and waved at us through the window. We were the ones crying in the car afterward. She came home singing a song about frogs.',
    tags: ['first', 'school'], image: null, source: 'manual', child_name: '', theme: 'emotional'
  },
  {
    id: 'm2', title: '\u201CMore Cookies, Please\u201D',
    date: 'Jan 8, 2024', summary: 'Her first complete English sentence, spoken at breakfast with absolute confidence.',
    full_text: '\u201CMore cookies, please\u201D \u2014 her first complete English sentence. She looked right at us across the breakfast table, so matter-of-fact, so sure of what she wanted. We laughed until our coffee went cold. She said it three more times before we ran out of cookies.',
    tags: ['first', 'funny', 'language'], image: null, source: 'manual', child_name: '', theme: 'playful'
  },
  {
    id: 'm3', title: 'Fifteen Minutes with the Lions',
    date: 'Mar 22, 2024', summary: 'She stood in front of the lion exhibit in complete silence — fifteen full minutes of awe.',
    full_text: 'At the zoo, she ran past the monkeys, the giraffes, even the ice cream stand. But when she saw the lions, she stopped. Completely still. Fifteen minutes of silence, which for her is an eternity. When we finally asked if she wanted to move on, she whispered: \u201CThey\u2019re thinking about something important.\u201D We still talk about it.',
    tags: ['milestone', 'adventure'], image: null, source: 'manual', child_name: '', theme: 'outdoor'
  },
  {
    id: 'm4', title: 'The Dog, The Brother, and The Unicorn',
    date: 'Jul 12, 2024', summary: 'Five candles, one big breath, and three impossible wishes.',
    full_text: 'She blew out all five candles in one breath and told everyone her wish: a dog, a little brother, and a unicorn. \u201CBut the unicorn can be small,\u201D she added, like she was being reasonable. She got none of those things, but she got a bicycle, and honestly, the joy on her face was close enough to magic.',
    tags: ['birthday', 'funny', 'heartwarming'], image: null, source: 'manual', child_name: '', theme: 'playful'
  },
  {
    id: 'm5', title: 'Drawing a Cat for the First Time',
    date: 'Apr 3, 2024', summary: 'Simple lines, but she already noticed the ears and the curve of the tail.',
    full_text: 'She sat at the kitchen table with a single brown crayon and drew a cat. It was mostly a circle with two triangles on top, but she added a curved line for the tail and two dots for eyes. \u201CThis is Mr. Whiskers,\u201D she announced. She taped it to the fridge herself and checked on it every morning for a week.',
    tags: ['first', 'creative', 'daily life'], image: null, source: 'manual', child_name: '', theme: 'daily'
  },
];

let currentMemoryId = null;
let memoryListPage = 0;
const MEMORIES_PER_PAGE = 6;

function inferMemoryTheme(text) {
  const t = (text || '').toLowerCase();
  const funny = /laugh|funny|giggle|joke|silly|hilarious|cookie|unicorn/;
  const emotional = /cry|tear|love|hug|heart|brave|proud|miss|tender/;
  const outdoor = /zoo|park|beach|garden|trip|walk|outside|sun|tree|lion|nature/;
  if (funny.test(t)) return 'playful';
  if (emotional.test(t)) return 'emotional';
  if (outdoor.test(t)) return 'outdoor';
  return 'daily';
}

function renderTimeline() {
  const book = document.getElementById('nbBook');
  const empty = document.getElementById('memoriesEmpty');
  if (!book) return;

  if (memoryData.length === 0) {
    book.style.display = 'none';
    if (empty) empty.style.display = 'flex';
    return;
  }

  book.style.display = '';
  if (empty) empty.style.display = 'none';

  renderMemoryListPage();

  if (currentMemoryId) {
    showMemoryDetail(currentMemoryId);
  } else if (memoryData.length > 0) {
    showMemoryDetail(memoryData[0].id);
  }
}

function renderMemoryListPage() {
  const container = document.getElementById('nbListPage');
  if (!container) return;

  const totalPages = Math.max(1, Math.ceil(memoryData.length / MEMORIES_PER_PAGE));
  if (memoryListPage >= totalPages) memoryListPage = totalPages - 1;
  if (memoryListPage < 0) memoryListPage = 0;

  const start = memoryListPage * MEMORIES_PER_PAGE;
  const slice = memoryData.slice(start, start + MEMORIES_PER_PAGE);

  container.innerHTML = '';
  slice.forEach((entry) => {
    const el = document.createElement('div');
    el.className = 'nb-list-card' + (currentMemoryId === entry.id ? ' active' : '');
    el.onclick = () => showMemoryDetail(entry.id);

    const thumbHtml = entry.image
      ? `<img class="nb-list-card-thumb" src="${publicImgSrc(entry.image)}" alt="" />`
      : getThemeThumbMarkup(entry.theme);

    el.innerHTML = `
      ${thumbHtml}
      <div class="nb-list-card-info">
        <div class="nb-list-card-date">${entry.date}</div>
        <div class="nb-list-card-title">${entry.title}</div>
        <div class="nb-list-card-preview">${entry.summary || entry.full_text}</div>
      </div>`;
    container.appendChild(el);
  });

  document.getElementById('nbPageNum').textContent =
    `Page ${memoryListPage + 1} of ${totalPages}`;
  document.getElementById('nbPrevBtn').disabled = memoryListPage <= 0;
  document.getElementById('nbNextBtn').disabled = memoryListPage >= totalPages - 1;
}

function getThemeThumbMarkup(theme) {
  const stroke = 'stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" fill="none"';
  const svgs = {
    playful: `<svg width="28" height="28" viewBox="0 0 24 24" ${stroke}><circle cx="12" cy="12" r="9" opacity="0.35"/><path d="M12 3v18M3 12h18"/></svg>`,
    emotional: `<svg width="28" height="28" viewBox="0 0 24 24" ${stroke}><path d="M12 21s-7-4.5-7-10a7 7 0 0 1 14 0c0 5.5-7 10-7 10z"/></svg>`,
    outdoor: `<svg width="28" height="28" viewBox="0 0 24 24" ${stroke}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83"/><circle cx="12" cy="12" r="4"/></svg>`,
    daily: `<svg width="28" height="28" viewBox="0 0 24 24" ${stroke}><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 3v4M16 3v4M4 11h16"/></svg>`,
  };
  const inner = svgs[theme] || svgs.daily;
  return `<div class="nb-list-card-thumb-placeholder">${inner}</div>`;
}

function flipMemoryPage(dir) {
  const container = document.getElementById('nbListPage');
  if (!container) return;

  container.classList.add('nb-flipping-out');
  setTimeout(() => {
    memoryListPage += dir;
    renderMemoryListPage();
    container.classList.remove('nb-flipping-out');
    container.classList.add('nb-flipping-in');
    setTimeout(() => container.classList.remove('nb-flipping-in'), 300);
  }, 280);
}

function showMemoryDetail(id) {
  const entry = memoryData.find(m => m.id === id);
  if (!entry) return;
  currentMemoryId = id;

  const rightPage = document.getElementById('nbPageRight');
  rightPage.className = 'nb-page nb-page-right';
  if (entry.theme) rightPage.classList.add('nb-theme-' + entry.theme);

  document.getElementById('nbDetailEmpty').style.display = 'none';
  const content = document.getElementById('nbDetailContent');
  content.style.display = '';
  content.classList.remove('nb-slide-in');
  void content.offsetWidth;
  content.classList.add('nb-slide-in');

  document.getElementById('nbDate').textContent = entry.date;
  document.getElementById('nbTitle').textContent = entry.title;
  document.getElementById('nbTags').innerHTML =
    (entry.tags || []).map(t => `<span class="nb-tag">${t}</span>`).join('');

  const photoWrap = document.getElementById('nbPhoto');
  if (entry.image) {
    photoWrap.innerHTML = `
      <div class="nb-photo-frame">
        <div class="nb-tape nb-tape-tl"></div>
        <img src="${publicImgSrc(entry.image)}" alt="${entry.title}" />
        <div class="nb-tape nb-tape-br"></div>
      </div>`;
  } else {
    photoWrap.innerHTML = '';
  }

  document.getElementById('nbBody').innerHTML = entry.full_text.replace(/\n/g, '<br><br>');

  const sourceText =
    entry.source === 'chatbot' ? 'Created from a conversation with Bloom'
      : entry.source === 'voice' ? 'Saved from a gentle voice chat with Bloom'
        : entry.source === 'manual' ? 'Written by hand with love'
          : 'Written by hand with love';
  document.getElementById('nbSource').textContent = sourceText;

  updateDoodles(entry.theme);
  highlightActiveListCard();
}

function updateDoodles(theme) {
  const mk = (d) => `<span class="nb-doodle-svg" aria-hidden="true">${d}</span>`;
  const dot = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="12" cy="12" r="3"/></svg>';
  const star = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"><path d="M12 2l2.2 6.8h7l-5.6 4.2 2.1 6.8L12 15.8 6.3 19.8l2.1-6.8L2.8 8.8h7L12 2z"/></svg>';
  const leaf = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"><path d="M8 18c6-4 10-10 12-16-6 2-12 6-16 12"/></svg>';
  const sets = {
    playful: [mk(star), mk(dot), mk(leaf)],
    emotional: [mk(dot), mk(star), mk(leaf)],
    outdoor: [mk(leaf), mk(dot), mk(star)],
    daily: [mk(dot), mk(star), mk(leaf)],
  };
  const set = sets[theme] || sets.daily;
  const els = document.querySelectorAll('#nbPageRight .nb-doodle');
  els.forEach((el, i) => { el.innerHTML = set[i] || ''; });
}

function highlightActiveListCard() {
  document.querySelectorAll('.nb-list-card').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nb-list-card').forEach(el => {
    if (el.onclick && el.querySelector('.nb-list-card-title')?.textContent ===
      memoryData.find(m => m.id === currentMemoryId)?.title) {
      el.classList.add('active');
    }
  });
}

function addImageToMemory() {
  const input = document.getElementById('memoryImageInput');
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file || !currentMemoryId) return;
    const reader = new FileReader();
    reader.onload = () => {
      const entry = memoryData.find(m => m.id === currentMemoryId);
      if (entry) {
        entry.image = reader.result;
        showMemoryDetail(currentMemoryId);
        renderMemoryListPage();
        showToast('Photo added.');
      }
    };
    reader.readAsDataURL(file);
  };
  input.click();
}

function deleteCurrentMemory() {
  if (!currentMemoryId) return;
  const idx = memoryData.findIndex(m => m.id === currentMemoryId);
  if (idx === -1) return;
  memoryData.splice(idx, 1);
  currentMemoryId = null;

  if (memoryData.length === 0) {
    renderTimeline();
    return;
  }

  const nextEntry = memoryData[Math.min(idx, memoryData.length - 1)];
  currentMemoryId = nextEntry.id;
  renderTimeline();
  showToast('Entry removed');
}

function turnMemoryToStory() {
  if (!currentMemoryId) return;
  navigateTo('story-chat');
  showToast('Start chatting to turn this into a story.');
}

function openNewMemoryModal() {
  document.getElementById('newMemoryTitle').value = '';
  document.getElementById('newMemoryText').value = '';
  document.getElementById('newMemoryTags').value = '';
  document.getElementById('newMemoryPhoto').value = '';
  document.getElementById('memoryNewOverlay').style.display = 'flex';
}

function closeNewMemoryModal() {
  document.getElementById('memoryNewOverlay').style.display = 'none';
}

function saveNewMemory() {
  const title = document.getElementById('newMemoryTitle').value.trim();
  const text = document.getElementById('newMemoryText').value.trim();
  if (!title || !text) {
    showToast('Please add a title and memory text');
    return;
  }

  const tagsStr = document.getElementById('newMemoryTags').value.trim();
  const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : ['daily life'];
  const photoFile = document.getElementById('newMemoryPhoto').files[0];

  const finishSave = (imageData) => {
    const theme = inferMemoryTheme(text);
    memoryData.unshift({
      id: 'm' + (++memoryIdCounter),
      title, theme,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      summary: text.substring(0, 120) + (text.length > 120 ? '...' : ''),
      full_text: text,
      tags, image: imageData, source: 'manual', child_name: ''
    });
    closeNewMemoryModal();
    memoryListPage = 0;
    currentMemoryId = memoryData[0].id;
    renderTimeline();
    showToast('Memory saved.');
  };

  if (photoFile) {
    const reader = new FileReader();
    reader.onload = () => finishSave(reader.result);
    reader.readAsDataURL(photoFile);
  } else {
    finishSave(null);
  }
}

function addMemoryFromChat(storyData) {
  const theme = inferMemoryTheme((storyData.story || '') + ' ' + (storyData.title || ''));
  const source = storyData.source || 'chatbot';
  memoryData.unshift({
    id: 'm' + (++memoryIdCounter),
    title: storyData.title, theme,
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    summary: storyData.summary,
    full_text: storyData.story,
    tags: storyData.tags || ['story'],
    image: null, source, child_name: ''
  });
  memoryListPage = 0;
  currentMemoryId = memoryData[0].id;
  renderTimeline();
}

function addTimelineItem(item) {
  const text = item.note || item.text || '';
  const theme = inferMemoryTheme(text);
  memoryData.unshift({
    id: 'm' + (++memoryIdCounter),
    title: item.title, theme,
    date: item.date,
    summary: text.substring(0, 120) + (text.length > 120 ? '...' : ''),
    full_text: text,
    tags: item.tags || ['milestone'],
    image: item.photo || null,
    source: 'manual', child_name: ''
  });
  memoryListPage = 0;
  currentMemoryId = memoryData[0].id;
  renderTimeline();
}

// Swipe support for the memory book
(function initMemorySwipe() {
  let touchStartX = 0;
  document.addEventListener('touchstart', (e) => {
    const book = document.getElementById('nbBook');
    if (!book || !book.contains(e.target)) return;
    touchStartX = e.touches[0].clientX;
  }, { passive: true });
  document.addEventListener('touchend', (e) => {
    const book = document.getElementById('nbBook');
    if (!book || !book.contains(e.target) || !touchStartX) return;
    const diff = e.changedTouches[0].clientX - touchStartX;
    touchStartX = 0;
    if (Math.abs(diff) < 50) return;
    const totalPages = Math.ceil(memoryData.length / MEMORIES_PER_PAGE);
    if (diff < 0 && memoryListPage < totalPages - 1) flipMemoryPage(1);
    else if (diff > 0 && memoryListPage > 0) flipMemoryPage(-1);
  }, { passive: true });
})();


// ══════════════════════════════════════════════════════════
// RECENT CREATIONS (HOME)
// ══════════════════════════════════════════════════════════

function renderRecentCreations() {
  renderDashMemories();
  renderDashGallery();
  bindCursorHover();
}

function renderDashMemories() {
  const container = document.getElementById('dashMemories');
  if (!container) return;

  const recent = memoryData.slice(0, 3);
  if (recent.length === 0) return;

  container.innerHTML = '';
  recent.forEach(m => {
    const el = document.createElement('div');
    el.className = 'dash-memory-item';
    el.onclick = () => { navigateTo('memories'); };
    el.innerHTML = `
      <span class="dash-memory-icon dash-memory-icon-svg" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M8 7h8M8 11h6"/></svg></span>
      <div class="dash-memory-text">
        <h4>${m.title}</h4>
        <p>${m.summary ? m.summary.slice(0, 60) + '…' : m.date}</p>
      </div>`;
    container.appendChild(el);
  });
}

function renderDashGallery() {
  const container = document.getElementById('dashGallery');
  if (!container) return;

  const recent = galleryData.slice(0, 4);
  if (recent.length === 0) return;

  container.innerHTML = '';
  recent.forEach(item => {
    const el = document.createElement('div');
    el.className = 'dash-gallery-thumb';
    const src = publicImgSrc(item.imageUrl || FALLBACK_DRAWING_IMG);
    el.innerHTML = `<img src="${src}" alt="${item.title}" />`;
    el.onclick = () => { navigateTo('gallery'); openLightbox(item); };
    container.appendChild(el);
  });
}


// ══════════════════════════════════════════════════════════
// PROFILE STATS
// ══════════════════════════════════════════════════════════

function updateProfileStats() {
  const stories = galleryData.filter(i => i.tags.includes('polished')).length;
  const drawings = galleryData.filter(i => i.tags.includes('drawing')).length;
  const memories = memoryData.length;

  const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
  el('statStories', stories);
  el('statDrawings', drawings);
  el('statMemories', memories);
}


// ══════════════════════════════════════════════════════════
// EXPORT / SHARE (DEMO)
// ══════════════════════════════════════════════════════════

function exportPDF() {
  showToast('PDF export coming soon — upgrade to Bloom plan.');
}

function orderPhotoBook() {
  const photosCount = memoryData.filter(m => m.image).length;
  if (photosCount === 0) {
    showToast('Add photos to your memories first to create a photo book.');
    return;
  }
  showToast(`Journal with ${memoryData.length} memories ready to print — upgrade to Bloom plan.`);
}

function saveToGallery() {
  showToast('Saved to Gallery.');
}

function shareFamily() {
  showToast('Family sharing link copied.');
}


// ══════════════════════════════════════════════════════════
// TOAST
// ══════════════════════════════════════════════════════════

let toastTimeout;
function showToast(msg) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 3000);
}


// ══════════════════════════════════════════════════════════
// INTERSECTION OBSERVER (SCROLL ANIMATIONS)
// ══════════════════════════════════════════════════════════

function observeAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, { threshold: 0.08 });

  document.querySelectorAll('.step-card, .pricing-card, .tl-item, .quick-action-card, .create-hub-card').forEach(el => {
    if (el.dataset.observed) return;
    el.dataset.observed = 'true';
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    observer.observe(el);
  });
}


// ══════════════════════════════════════════════════════════
// BLOOM CHAT (Llama-powered companion)
// ══════════════════════════════════════════════════════════

const STORY_GEN_PROMPT = `Based on the conversation below between a parent and Bloom, create a polished memory story.

Return ONLY valid JSON, no markdown, no code fences:
{"title":"Short title (2-5 words)","summary":"One sentence.","story":"A polished 2-3 paragraph diary-style story in warm prose. Sensory details, emotions, child's personality. Past tense. Feels like a page from a memory book.","tags":["tag1","tag2"]}

Tag options: funny, heartwarming, milestone, daily life, family moment, adventure, first time, bedtime, mealtime, outdoors, creative, friendship, emotional, parenting

CONVERSATION:
`;

let chatHistory = [];
let chatMessageCount = 0;
let lastStoryJSON = null;
let _memorySaveTimer = null;
let _lastMemoryCheckIndex = 0;
let _confirmationShownThisSession = false;
let _memoriesSavedThisSession = 0;

let voiceCallActive = false;
let voiceCallPaused = false;
let voiceRecognition = null;
let voiceReplyChain = Promise.resolve();
let voiceTtsPlaying = false;
let bloomVoiceAudio = null;
let _bloomTtsFallbackToastShown = false;

function cleanupBloomPlayback() {
  if (bloomVoiceAudio) {
    bloomVoiceAudio.pause();
    const prev = bloomVoiceAudio.src;
    bloomVoiceAudio.removeAttribute('src');
    if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
    bloomVoiceAudio = null;
  }
  try {
    if (window.speechSynthesis) speechSynthesis.cancel();
  } catch (_) { /* ignore */ }
}

function textForSpeech(text) {
  return String(text || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function speechLangForText(text) {
  if (/[\u4e00-\u9fff\u3400-\u4dbf]/.test(text)) return 'zh-CN';
  const l = (document.documentElement.lang || 'en-US').trim();
  return l || 'en-US';
}

function pickSpeechVoice(utter, lang) {
  const voices = speechSynthesis.getVoices();
  if (!voices.length) return;
  const primary = lang.split('-')[0];
  const inLang = voices.filter(v => (v.lang || '').toLowerCase().startsWith(primary.toLowerCase()));
  const pool = inLang.length ? inLang : voices;

  if (primary === 'zh') {
    const v = pool.find(vo => /Ting|Yaoyao|Mei|Yu-shu|Sinji|Chinese|国语|普通话/i.test(vo.name)) || pool[0];
    if (v) utter.voice = v;
    return;
  }
  const v =
    pool.find(vo => /Samantha|Karen|Victoria|Moira|Fiona|Google UK English Female/i.test(vo.name)) ||
    pool.find(vo => /Female/i.test(vo.name)) ||
    pool[0];
  if (v) utter.voice = v;
}

/**
 * Reads Bloom aloud via Replicate MiniMax TTS (REPLICATE_PROXY_URL + token), then browser speech if that fails.
 */
async function playBloomVoice(text) {
  const t = textForSpeech(text);
  if (!t) return;

  cleanupBloomPlayback();

  const pauseMic = !!(voiceCallActive && voiceRecognition);
  if (pauseMic) {
    voiceTtsPlaying = true;
    try {
      voiceRecognition.stop();
    } catch (_) { /* ignore */ }
  } else {
    voiceTtsPlaying = false;
  }

  const resumeMicIfNeeded = () => {
    voiceTtsPlaying = false;
    if (pauseMic && voiceCallActive && !voiceCallPaused && voiceRecognition) {
      try {
        voiceRecognition.start();
      } catch (e) {
        console.warn('Mic restart after Bloom spoke:', e);
      }
    }
  };

  let replicateRequestError = null;
  let audioUrl = null;
  try {
    audioUrl = await askForReplicateSpeechUrl(t);
  } catch (e) {
    replicateRequestError = e;
    console.warn('Replicate TTS request failed:', e);
  }

  if (audioUrl) {
    const tryPlayUrl = async (src, revokeWhenDone) => {
      const audio = new Audio();
      bloomVoiceAudio = audio;
      audio.preload = 'auto';
      audio.src = src;
      try {
        audio.load();
      } catch (_) { /* ignore */ }
      const teardown = () => {
        if (revokeWhenDone) URL.revokeObjectURL(src);
        bloomVoiceAudio = null;
        resumeMicIfNeeded();
      };
      audio.onended = teardown;
      audio.onerror = teardown;
      await audio.play();
    };

    try {
      await tryPlayUrl(audioUrl, false);
      return;
    } catch (e) {
      bloomVoiceAudio = null;
      if (e && e.name === 'NotAllowedError') {
        try {
          const r = await fetch(audioUrl);
          if (r.ok) {
            const blob = await r.blob();
            if (blob && blob.size > 0) {
              const objectUrl = URL.createObjectURL(blob);
              try {
                await tryPlayUrl(objectUrl, true);
                return;
              } catch (e2) {
                URL.revokeObjectURL(objectUrl);
                bloomVoiceAudio = null;
                if (!(e2 && e2.name === 'NotAllowedError')) console.warn('Replicate TTS blob play failed:', e2);
              }
            }
          }
        } catch (fetchErr) {
          console.warn('Replicate TTS audio fetch failed:', fetchErr);
        }
      } else {
        console.warn('Replicate TTS play failed:', e);
      }
    }
  }

  if (replicateRequestError && !_bloomTtsFallbackToastShown) {
    _bloomTtsFallbackToastShown = true;
    const msg = replicateRequestError.message || String(replicateRequestError);
    showToast(msg.length < 220 ? msg : msg.slice(0, 217) + '…');
  }

  playBloomVoiceBrowser(t, resumeMicIfNeeded);
}

function playBloomVoiceBrowser(t, resumeMicIfNeeded) {
  if (!('speechSynthesis' in window)) {
    resumeMicIfNeeded();
    return;
  }

  const utter = new SpeechSynthesisUtterance(t);
  const lang = speechLangForText(t);
  utter.lang = lang;
  utter.rate = 0.9;
  utter.pitch = 1.02;
  utter.volume = 1;

  pickSpeechVoice(utter, lang);
  if (!speechSynthesis.getVoices().length) {
    const once = () => {
      pickSpeechVoice(utter, lang);
      speechSynthesis.removeEventListener('voiceschanged', once);
    };
    speechSynthesis.addEventListener('voiceschanged', once);
  }

  utter.onend = resumeMicIfNeeded;
  utter.onerror = resumeMicIfNeeded;

  speechSynthesis.speak(utter);
}

function stopBloomVoice() {
  voiceTtsPlaying = false;
  cleanupBloomPlayback();
}

/**
 * Browser prototype: returns a SpeechRecognition instance, or null if unsupported.
 * Replace with a cloud STT pipeline and call sendVoiceMessageToBloom(transcript) from your service.
 */
function transcribeVoice() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return null;
  return new SpeechRecognition();
}

function setVoiceStatus(msg) {
  const el = document.getElementById('voiceChatStatus');
  if (el) el.textContent = msg;
}

function updateVoicePanelUI() {
  const start = document.getElementById('voiceStartBtn');
  const pause = document.getElementById('voicePauseBtn');
  const end = document.getElementById('voiceEndBtn');
  if (!start || !pause || !end) return;

  const active = voiceCallActive;
  const paused = voiceCallPaused;

  start.disabled = active;
  pause.disabled = !active;
  end.disabled = !active;

  const pauseLabel = pause.querySelector('.voice-pause-label');
  const pauseIcon = pause.querySelector('.voice-pause-icon');
  const resumeIcon = pause.querySelector('.voice-resume-icon');
  if (paused) {
    if (pauseLabel) pauseLabel.textContent = 'Resume';
    if (pauseIcon) pauseIcon.style.display = 'none';
    if (resumeIcon) resumeIcon.style.display = 'flex';
  } else {
    if (pauseLabel) pauseLabel.textContent = 'Pause';
    if (pauseIcon) pauseIcon.style.display = 'flex';
    if (resumeIcon) resumeIcon.style.display = 'none';
  }
}

function enqueueVoiceUserUtterance(text) {
  const t = String(text || '').trim();
  if (!t) return;
  voiceReplyChain = voiceReplyChain
    .then(() => sendVoiceMessageToBloom(t))
    .catch((err) => console.error('Voice message pipeline:', err));
}

function startVoiceChat() {
  if (voiceCallActive) return;

  const rec = transcribeVoice();
  if (!rec) {
    showToast('Speech recognition is not available in this browser. You can connect speech-to-text later.');
    return;
  }

  voiceRecognition = rec;
  voiceCallActive = true;
  voiceCallPaused = false;

  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = document.documentElement.lang || 'en-US';

  rec.onresult = (event) => {
    if (!voiceCallActive || voiceCallPaused) return;
    let interim = '';
    let finalText = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const r = event.results[i][0].transcript;
      if (event.results[i].isFinal) finalText += r;
      else interim += r;
    }
    const trimmedInterim = interim.trim();
    if (trimmedInterim) setVoiceStatus('Listening… ' + trimmedInterim);
    else setVoiceStatus('Listening quietly. Pause anytime you need a breath.');

    if (finalText.trim()) enqueueVoiceUserUtterance(finalText.trim());
  };

  rec.onerror = (e) => {
    if (e.error === 'aborted' || e.error === 'no-speech') return;
    console.warn('Voice recognition:', e.error);
    if (e.error === 'not-allowed') {
      setVoiceStatus('Microphone permission is needed for voice chat.');
      stopVoiceChat();
    }
  };

  rec.onend = () => {
    if (voiceTtsPlaying) return;
    if (voiceCallActive && !voiceCallPaused && voiceRecognition === rec) {
      try {
        rec.start();
      } catch (err) {
        console.warn('Recognition restart:', err);
      }
    }
  };

  updateVoicePanelUI();
  setVoiceStatus('Listening quietly. Pause anytime you need a breath.');
  const sug = document.getElementById('chatSuggestions');
  if (sug) sug.style.display = 'none';

  try {
    rec.start();
  } catch (e) {
    console.error(e);
    showToast('Could not start listening. Try again in a moment.');
    stopVoiceChat();
  }
}

function pauseVoiceChat() {
  if (!voiceCallActive || voiceCallPaused) return;
  voiceCallPaused = true;
  stopBloomVoice();
  try {
    if (voiceRecognition) voiceRecognition.stop();
  } catch (_) { /* ignore */ }
  setVoiceStatus('Paused. Resume when you would like to keep talking.');
  updateVoicePanelUI();
}

function resumeVoiceChat() {
  if (!voiceCallActive || !voiceCallPaused) return;
  voiceCallPaused = false;
  updateVoicePanelUI();
  setVoiceStatus('Listening quietly. Pause anytime you need a breath.');
  try {
    if (voiceRecognition) voiceRecognition.start();
  } catch (e) {
    console.warn(e);
  }
}

function toggleVoicePause() {
  if (!voiceCallActive) return;
  if (voiceCallPaused) resumeVoiceChat();
  else pauseVoiceChat();
}

function stopVoiceChat() {
  stopBloomVoice();
  voiceCallActive = false;
  voiceCallPaused = false;
  voiceReplyChain = Promise.resolve();
  try {
    if (voiceRecognition) {
      voiceRecognition.onend = null;
      voiceRecognition.stop();
    }
  } catch (_) { /* ignore */ }
  voiceRecognition = null;
  setVoiceStatus('When you are ready, start a gentle voice visit. Your words still appear in this chat.');
  updateVoicePanelUI();
}

async function sendVoiceMessageToBloom(text) {
  const sug = document.getElementById('chatSuggestions');
  if (sug) sug.style.display = 'none';
  await postUserMessageToBloom(text, { viaVoice: true });
}

/**
 * Summarize recent messages and save to Memory Book with source "voice".
 * Pass an optional slice of chatHistory-shaped messages; defaults to last several turns.
 */
async function saveVoiceMemoryEntry(messageSlice) {
  const slice = messageSlice && messageSlice.length
    ? messageSlice
    : chatHistory.slice(Math.max(0, chatHistory.length - 8));
  if (!slice.length) return;
  try {
    const entry = await summarizeMemoryEntry(slice);
    saveMemoryEntry({ ...entry, source: 'voice' });
    showToast('Saved to your Memory Book');
  } catch (e) {
    console.error('saveVoiceMemoryEntry:', e);
    showToast('Could not save that memory yet.');
  }
}

function initStoryChat() {
  const msgs = document.getElementById('chatMessages');
  if (!msgs) return;
  if (chatHistory.length === 0) {
    chatHistory = [{ role: 'assistant', content: 'Hey. How are you doing today?' }];
    renderChatMessages();
  }
  updateVoicePanelUI();
}

function renderChatMessages() {
  const container = document.getElementById('chatMessages');
  if (!container) return;
  container.innerHTML = '';

  chatHistory.forEach((msg, i) => {
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble ' + (msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-bot');
    bubble.style.animationDelay = (i * 0.05) + 's';
    if (msg.role === 'assistant') {
      bubble.innerHTML = `<div class="chat-bubble-name">Bloom</div>${formatChatText(msg.content)}`;
    } else {
      bubble.textContent = msg.content;
    }
    container.appendChild(bubble);
  });

  container.scrollTop = container.scrollHeight;
}

function formatChatText(text) {
  return text.replace(/\n/g, '<br>');
}

function showTypingIndicator() {
  const container = document.getElementById('chatMessages');
  const typing = document.createElement('div');
  typing.className = 'chat-typing';
  typing.id = 'chatTyping';
  typing.innerHTML = '<div class="chat-typing-dot"></div><div class="chat-typing-dot"></div><div class="chat-typing-dot"></div>';
  container.appendChild(typing);
  container.scrollTop = container.scrollHeight;
}

function removeTypingIndicator() {
  const el = document.getElementById('chatTyping');
  if (el) el.remove();
}

function sendSuggestion(btn) {
  const text = btn.textContent;
  document.getElementById('chatInput').value = text;
  document.getElementById('chatSuggestions').style.display = 'none';
  sendChatMessage();
}

async function postUserMessageToBloom(text, { viaVoice = false } = {}) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return;

  chatHistory.push({
    role: 'user',
    content: trimmed,
    ...(viaVoice ? { viaVoice: true } : {}),
  });
  chatMessageCount++;
  renderChatMessages();

  showTypingIndicator();
  const sendBtn = document.getElementById('chatSendBtn');
  if (sendBtn) sendBtn.disabled = true;

  const messages = [
    { role: 'system', content: buildSystemPrompt() },
    ...chatHistory.map(m => ({ role: m.role, content: m.content })),
  ];

  try {
    const reply = await sendToLlama(messages);
    const cleaned = reply.trim();

    removeTypingIndicator();
    chatHistory.push({ role: 'assistant', content: cleaned });
    renderChatMessages();

    scheduleBackgroundMemoryCheck();
    const speakReply = viaVoice || voiceCallActive;
    if (speakReply) playBloomVoice(cleaned);
  } catch (err) {
    console.error('Llama chat error:', err);
    removeTypingIndicator();
    const fallbacks = [
      'That sounds like a lot. Take your time.',
      'I hear you. What else is on your mind?',
      'Mm. That\'s real. Do you want to keep going, or just sit with it for a second?',
      'I can imagine. Days like that are hard.',
      'That\'s such a specific detail — I love that you remember it like that.',
    ];
    const fallback = fallbacks[chatMessageCount % fallbacks.length];
    chatHistory.push({ role: 'assistant', content: fallback });
    renderChatMessages();
    const speakReply = viaVoice || voiceCallActive;
    if (speakReply) playBloomVoice(fallback);
  }

  if (sendBtn) sendBtn.disabled = false;
}

async function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text) return;

  input.value = '';
  input.style.height = 'auto';
  document.getElementById('chatSuggestions').style.display = 'none';

  await postUserMessageToBloom(text, { viaVoice: false });
}

function scheduleBackgroundMemoryCheck() {
  if (_memorySaveTimer) clearTimeout(_memorySaveTimer);

  _memorySaveTimer = setTimeout(async () => {
    if (chatMessageCount < 2) return;

    const windowStart = Math.max(_lastMemoryCheckIndex, 0);
    const recentMessages = chatHistory.slice(windowStart);
    const userMsgs = recentMessages.filter(m => m.role === 'user');
    if (userMsgs.length < 2) return;

    try {
      const detection = await detectMemoryCandidate(recentMessages);
      if (!detection.memorable) return;

      const entry = await summarizeMemoryEntry(recentMessages);
      const hasVoice = recentMessages.some(m => m.viaVoice);
      saveMemoryEntry({ ...entry, source: hasVoice ? 'voice' : 'chatbot' });
      _lastMemoryCheckIndex = chatHistory.length;
      _memoriesSavedThisSession++;

      if (shouldShowSaveConfirmation(detection.intensity)) {
        showMemorySavedHint();
        _confirmationShownThisSession = true;
      }
    } catch (e) {
      console.error('Background memory save error:', e);
    }
  }, 3000);
}

function shouldShowSaveConfirmation(intensity) {
  if (_confirmationShownThisSession) return false;
  if (intensity === 'high') return true;
  if (intensity === 'medium' && _memoriesSavedThisSession <= 1) return true;
  return false;
}

const _softConfirmationMessages = [
  'I\u2019ve added this little moment to your child\u2019s diary.',
  'I saved this story in your diary for today.',
  'This felt worth keeping \u2014 I\u2019ve saved it in your diary.',
  'That one\u2019s in the memory book now.',
  'I kept this one for you.',
];

function showMemorySavedHint() {
  const container = document.getElementById('chatMessages');
  if (!container) return;

  const existing = container.querySelector('.chat-memory-hint');
  if (existing) existing.remove();

  const msg = _softConfirmationMessages[
    Math.floor(Math.random() * _softConfirmationMessages.length)
  ];

  const hint = document.createElement('div');
  hint.className = 'chat-memory-hint';
  hint.textContent = msg;
  container.appendChild(hint);
  container.scrollTop = container.scrollHeight;

  setTimeout(() => {
    hint.classList.add('chat-memory-hint-fade');
    setTimeout(() => hint.remove(), 800);
  }, 5000);
}

function maybeShowGenerateBtn() {
  if (chatMessageCount < 3) return;
  const container = document.getElementById('chatMessages');
  if (document.getElementById('chatGenerateBtn')) return;
  const wrap = document.createElement('div');
  wrap.style.cssText = 'align-self:center;margin:0.5rem 0;';
  wrap.innerHTML = `<button class="btn-primary btn-sm" id="chatGenerateBtn" onclick="generateChatStory()" style="border-radius:20px;padding:8px 20px;display:inline-flex;align-items:center;gap:0.4rem;">
    <span class="btn-inline-icon" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M12 3v4M12 17v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/></svg></span> Turn this into a story
  </button>`;
  container.appendChild(wrap);
  container.scrollTop = container.scrollHeight;
}

async function generateChatStory() {
  const chatContainer = document.getElementById('chatContainer');
  const storyResult = document.getElementById('chatStoryResult');

  const conversationText = chatHistory
    .map(m => `${m.role === 'user' ? 'Parent' : 'Bloom'}: ${m.content}`)
    .join('\n');

  chatContainer.style.display = 'none';
  storyResult.style.display = 'block';

  document.getElementById('chatStoryTitle').textContent = 'Writing your story\u2026';
  document.getElementById('chatStorySummary').textContent = '';
  document.getElementById('chatStoryBody').textContent = '';
  document.getElementById('chatStoryTags').innerHTML = '';

  try {
    const raw = await sendToLlama([
      { role: 'system', content: 'You are a story writer. Return ONLY valid JSON, no markdown.' },
      { role: 'user', content: STORY_GEN_PROMPT + conversationText }
    ]);

    const cleaned = raw.trim().replace(/```json\s*/g, '').replace(/```\s*/g, '');
    lastStoryJSON = JSON.parse(cleaned);
    displayChatStory(lastStoryJSON);
  } catch (err) {
    console.error('Story generation error:', err);
    lastStoryJSON = {
      title: 'A Quiet Moment',
      summary: 'Something worth holding onto.',
      story: chatHistory.filter(m => m.role === 'user').map(m => m.content).join(' '),
      tags: ['heartwarming']
    };
    displayChatStory(lastStoryJSON);
  }
}

function displayChatStory(story) {
  document.getElementById('chatStoryTitle').textContent = story.title;
  document.getElementById('chatStorySummary').textContent = story.summary;
  document.getElementById('chatStoryBody').innerHTML = story.story.replace(/\n/g, '<br><br>');
  document.getElementById('chatStoryTags').innerHTML =
    (story.tags || []).map(t => `<span class="chat-story-tag">${t}</span>`).join('');
}

function closeChatStory() {
  document.getElementById('chatStoryResult').style.display = 'none';
  document.getElementById('chatContainer').style.display = 'flex';
}

async function regenerateChatStory() {
  await generateChatStory();
}

function saveChatToGallery() {
  if (!lastStoryJSON) return;
  addDemoGalleryItem({
    imageUrl: FALLBACK_DRAWING_IMG,
    title: lastStoryJSON.title,
    date: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    story: lastStoryJSON.story,
    tags: [...(lastStoryJSON.tags || []), 'story', 'polished']
  });
  showToast('Story saved to Gallery.');
}

function saveChatToMemory() {
  if (!lastStoryJSON) return;
  addMemoryFromChat(lastStoryJSON);
  showToast('Saved to your Memory Book');
  setTimeout(() => navigateTo('memories'), 600);
}

function resetStoryChat() {
  stopVoiceChat();
  chatHistory = [];
  chatMessageCount = 0;
  lastStoryJSON = null;
  _lastMemoryCheckIndex = 0;
  _confirmationShownThisSession = false;
  _memoriesSavedThisSession = 0;
  if (_memorySaveTimer) clearTimeout(_memorySaveTimer);
  document.getElementById('chatStoryResult').style.display = 'none';
  document.getElementById('chatContainer').style.display = 'flex';
  document.getElementById('chatSuggestions').style.display = 'block';
  initStoryChat();
}


// ══════════════════════════════════════════════════════════
// COMMUNITY
// ══════════════════════════════════════════════════════════

const demoNames = ['Luna\'s Mom', 'Oliver\'s Dad', 'Mia\'s Family', 'Noah\'s Papa', 'Chloe\'s Mama', 'Liam\'s Parents', 'Sophia\'s Mom', 'Ethan\'s Dad'];

function communityAvatarLetter(name) {
  const m = (name || '').match(/[A-Za-z]/);
  return (m ? m[0] : '?').toUpperCase();
}

function communityAvatarHtml(name, variant) {
  const letter = communityAvatarLetter(name);
  const v = variant != null ? variant % 4 : 0;
  return `<span class="community-avatar-letter community-avatar-letter--${v}" aria-hidden="true">${letter}</span>`;
}

const communityData = [
  {
    id: 'c1', imageUrl: 'exampleimages/rainbow.png', title: 'Rainbow Over Our House',
    username: demoNames[0], avatarVariant: 0,
    age: '4', caption: 'She said every house needs a rainbow on top.',
    likes: 24, liked: false, time: '2 hours ago',
    comments: [
      { user: demoNames[2], text: 'This is so adorable! My daughter draws rainbows everywhere too!' },
      { user: demoNames[4], text: 'The colors are wonderful' },
    ]
  },
  {
    id: 'c2', imageUrl: 'exampleimages/t-rex-and-friends.png', title: 'T-Rex and Friends',
    username: demoNames[1], avatarVariant: 1,
    age: '5', caption: 'He says the big one is the daddy dinosaur protecting the babies.',
    likes: 41, liked: false, time: '5 hours ago',
    comments: [
      { user: demoNames[3], text: 'My son is also obsessed with dinosaurs! They should have a playdate' },
    ]
  },
  {
    id: 'c3', imageUrl: 'exampleimages/myfamily.png', title: 'My Family',
    username: demoNames[2], avatarVariant: 2,
    age: '3', caption: 'First time drawing all four of us. The tiny one on the right is our dog.',
    likes: 67, liked: false, time: '1 day ago',
    comments: [
      { user: demoNames[0], text: 'The dog! so sweet' },
      { user: demoNames[5], text: 'Frame this immediately!' },
      { user: demoNames[1], text: 'This made my day' },
    ]
  },
  {
    id: 'c4', imageUrl: 'exampleimages/sunflower.png', title: 'Garden of Sunshine',
    username: demoNames[3], avatarVariant: 3,
    age: '6', caption: 'After visiting grandma\'s garden. He wanted to "bring the flowers home."',
    likes: 33, liked: false, time: '2 days ago',
    comments: [
      { user: demoNames[6], text: 'These sunflowers are taller than grandma! Love it.' },
    ]
  },
  {
    id: 'c5', imageUrl: 'exampleimages/rocket.png', title: 'Space Adventure',
    username: demoNames[5], avatarVariant: 1,
    age: '7', caption: 'Apparently there are cats on the moon. He was very sure about this.',
    likes: 52, liked: false, time: '3 days ago',
    comments: [
      { user: demoNames[7], text: 'Moon cats are the best kind of cats' },
      { user: demoNames[0], text: 'The rocket details are impressive for 7!' },
    ]
  },
  {
    id: 'c6', imageUrl: 'exampleimages/under-the-sea.png', title: 'Under the Sea',
    username: demoNames[6], avatarVariant: 2,
    age: '4', caption: 'She insisted the orange fish is Nemo and the purple one is his mom.',
    likes: 19, liked: false, time: '4 days ago',
    comments: []
  },
  {
    id: 'c7', imageUrl: 'exampleimages/lion.png', title: 'King of the Jungle',
    username: demoNames[4], avatarVariant: 0,
    age: '5', caption: 'He roared the entire time he was drawing this. Full commitment.',
    likes: 38, liked: false, time: '5 days ago',
    comments: [
      { user: demoNames[1], text: 'That mane is majestic! True king energy.' },
    ]
  },
  {
    id: 'c8', imageUrl: 'exampleimages/cat.png', title: 'Princess Whiskers',
    username: demoNames[7], avatarVariant: 3,
    age: '4', caption: 'Our cat sat on her lap the whole time. She kept saying "hold still, Princess!"',
    likes: 45, liked: false, time: '6 days ago',
    comments: [
      { user: demoNames[2], text: 'The little crown! My heart!' },
      { user: demoNames[5], text: 'Princess Whiskers deserves a gallery show.' },
    ]
  },
  {
    id: 'c9', imageUrl: 'exampleimages/birthday.png', title: 'Birthday Cake for Mama',
    username: demoNames[3], avatarVariant: 3,
    age: '3', caption: 'She drew this as my birthday present. Best gift I ever got.',
    likes: 72, liked: false, time: '1 week ago',
    comments: [
      { user: demoNames[0], text: 'I am not crying, you are crying' },
      { user: demoNames[6], text: 'Happy birthday! This is the sweetest thing.' },
      { user: demoNames[4], text: 'The candles! She even counted them.' },
    ]
  },
];

let commSort = 'recent';
let shareSelectedItem = null;

function renderCommunity() {
  const feed = document.getElementById('communityFeed');
  if (!feed) return;

  const sorted = [...communityData];
  if (commSort === 'popular') sorted.sort((a, b) => b.likes - a.likes);

  feed.innerHTML = '';
  sorted.forEach((post, i) => {
    const card = document.createElement('div');
    card.className = 'community-card';
    card.style.animationDelay = (i * 0.06) + 's';

    const commentsHTML = post.comments.map((c, j) =>
      `<div class="community-comment">
        <div class="community-comment-avatar">${communityAvatarHtml(c.user, j)}</div>
        <div class="community-comment-text"><strong>${c.user}</strong> ${c.text}</div>
      </div>`
    ).join('');

    const imgSrc = publicImgSrc(post.imageUrl || FALLBACK_DRAWING_IMG);
    const postImgContent = `<img src="${imgSrc}" alt="${post.title}" />`;
    const heartIcon = post.liked
      ? '<svg class="comm-action-svg comm-action-svg--heart comm-action-svg--filled" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" stroke="currentColor" stroke-width="1.2" d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>'
      : '<svg class="comm-action-svg comm-action-svg--heart" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
    const chatIcon = '<svg class="comm-action-svg" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
    card.innerHTML = `
      <div class="community-card-img">${postImgContent}</div>
      <div class="community-card-body">
        <div class="community-card-header">
          <div class="community-avatar">${communityAvatarHtml(post.username, post.avatarVariant || 0)}</div>
          <span class="community-username">${post.username}</span>
          ${post.age ? `<span class="community-age-badge">Age ${post.age}</span>` : ''}
        </div>
        <div class="community-card-title">${post.title}</div>
        ${post.caption ? `<div class="community-card-caption">${post.caption}</div>` : ''}
        <div class="community-card-actions">
          <button class="community-action-btn ${post.liked ? 'liked' : ''}" onclick="toggleLike('${post.id}')">
            <span class="action-icon">${heartIcon}</span>
            <span class="like-count">${post.likes}</span>
          </button>
          <button class="community-action-btn" onclick="toggleComments('${post.id}')">
            <span class="action-icon">${chatIcon}</span> ${post.comments.length}
          </button>
          <span style="margin-left:auto;font-size:0.75rem;color:var(--text-light)">${post.time}</span>
        </div>
      </div>
      <div class="community-comments" id="comments-${post.id}" style="display:none">
        ${commentsHTML}
        <div class="community-comment-input-wrap">
          <input class="community-comment-input" id="commentInput-${post.id}" placeholder="Add a comment..." onkeydown="if(event.key==='Enter')addComment('${post.id}')" />
          <button class="community-comment-send" onclick="addComment('${post.id}')">→</button>
        </div>
      </div>`;

    feed.appendChild(card);
  });
}

function sortCommunity(sort) {
  commSort = sort;
  document.querySelectorAll('.community-sort .chip').forEach(c => {
    c.classList.toggle('active', c.dataset.sort === sort);
  });
  renderCommunity();
}

function toggleLike(postId) {
  const post = communityData.find(p => p.id === postId);
  if (!post) return;
  post.liked = !post.liked;
  post.likes += post.liked ? 1 : -1;
  renderCommunity();
}

function toggleComments(postId) {
  const el = document.getElementById('comments-' + postId);
  if (!el) return;
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function addComment(postId) {
  const input = document.getElementById('commentInput-' + postId);
  if (!input || !input.value.trim()) return;
  const post = communityData.find(p => p.id === postId);
  if (!post) return;
  post.comments.push({
    user: 'You',
    text: input.value.trim()
  });
  input.value = '';
  renderCommunity();
  const el = document.getElementById('comments-' + postId);
  if (el) el.style.display = 'block';
}

function openShareModal() {
  const modal = document.getElementById('shareModal');
  const picker = document.getElementById('shareGalleryPicker');
  const step1 = document.getElementById('shareStep1');
  const step2 = document.getElementById('shareStep2');

  shareSelectedItem = null;
  step1.style.display = 'block';
  step2.style.display = 'none';

  picker.innerHTML = '';
  if (galleryData.length === 0) {
    picker.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--text-light);font-size:0.9rem;padding:2rem 0;">Your gallery is empty. Polish a drawing first!</p>';
  } else {
    galleryData.forEach((item, i) => {
      const el = document.createElement('div');
      el.className = 'share-picker-item';
      el.innerHTML = `<img src="${publicImgSrc(item.imageUrl || FALLBACK_DRAWING_IMG)}" alt="${item.title}" />`;
      el.addEventListener('click', () => {
        document.querySelectorAll('.share-picker-item').forEach(p => p.classList.remove('selected'));
        el.classList.add('selected');
        shareSelectedItem = item;
        setTimeout(() => shareGoToStep2(), 200);
      });
      picker.appendChild(el);
    });
  }

  modal.style.display = 'flex';
}

function closeShareModal() {
  document.getElementById('shareModal').style.display = 'none';
}

function shareGoToStep2() {
  if (!shareSelectedItem) return;
  document.getElementById('shareStep1').style.display = 'none';
  document.getElementById('shareStep2').style.display = 'block';

  const preview = document.getElementById('sharePreviewImg');
  const shSrc = publicImgSrc(shareSelectedItem.imageUrl || FALLBACK_DRAWING_IMG);
  preview.innerHTML = `<img src="${shSrc}" alt="${shareSelectedItem.title}" />`;

  document.getElementById('shareChildAge').value = '';
  document.getElementById('shareCaption').value = '';
}

function shareGoBack() {
  document.getElementById('shareStep1').style.display = 'block';
  document.getElementById('shareStep2').style.display = 'none';
}

function publishToComm() {
  if (!shareSelectedItem) return;

  const age = document.getElementById('shareChildAge').value;
  const caption = document.getElementById('shareCaption').value.trim();

  const newPost = {
    id: 'c' + Date.now(),
    imageUrl: shareSelectedItem.imageUrl || FALLBACK_DRAWING_IMG,
    title: shareSelectedItem.title,
    username: 'You',
    avatarVariant: 0,
    age: age || '',
    caption: caption || shareSelectedItem.story || '',
    likes: 0,
    liked: false,
    time: 'Just now',
    comments: []
  };

  communityData.unshift(newPost);
  closeShareModal();
  renderCommunity();
  showToast('Shared to Community.');
}


// ══════════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════════

observeAnimations();


/* ══════════════════════════════════════════════════════════
   BACKEND PROXY SETUP NOTE
   ══════════════════════════════════════════════════════════

   This app uses the following AI APIs:

   1. OPENAI GPT-4o API
      Purpose: Storybook text generation, character profiling,
               drawing descriptions, timeline captions.
      Model: gpt-4o
      Endpoint: https://api.openai.com/v1/chat/completions
      Docs: https://platform.openai.com/docs/api-reference/chat

      NEVER expose API key in frontend. Use a backend proxy:

      Node.js/Express example:
      app.post('/api/openai', async (req, res) => {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
          },
          body: JSON.stringify(req.body)
        });
        const data = await response.json();
        res.json(data);
      });

   2. IMAGE GENERATION API (for "Polish Drawing" feature)
      Recommended: Google Gemini Imagen, Stability AI, or DALL-E 3

   3. VOICE NARRATION (Bloom/Family plan)
      In-app: Replicate minimax/speech-2.8-turbo (official) via same proxy as images; fallback: browser speechSynthesis

   4. IMAGE STORAGE
      Recommended: Cloudinary or AWS S3

   5. AUTHENTICATION
      Recommended: Supabase Auth or Firebase Auth

   ══════════════════════════════════════════════════════════ */
