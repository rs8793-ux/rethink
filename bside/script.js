/*
  B-Side — script.js
  Navigation · Real AI chat via backend · Tabs · Modals · Draft actions
*/

/* ════════════════════════════════════
   NAVIGATION
   ════════════════════════════════════ */

function go(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');

  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.go === id);
  });
}

document.addEventListener('click', e => {
  const trigger = e.target.closest('[data-go]');
  if (trigger) {
    e.preventDefault();
    go(trigger.dataset.go);
  }
});

/* ════════════════════════════════════
   CHAT — Real AI via ITP Replicate Proxy
   ════════════════════════════════════ */

const PROXY_URL = 'https://itp-ima-replicate-proxy.web.app/api/create_n_get';
const AUTH_TOKEN = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjNiMDk1NzQ3YmY4MzMxZWE0YWQ1M2YzNzBjNjMyNjAxNzliMGQyM2EiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiSmVzc2ljYSBTdW4iLCJwaWN0dXJlIjoiaHR0cHM6Ly9saDMuZ29vZ2xldXNlcmNvbnRlbnQuY29tL2EvQUNnOG9jS2ttNUtMMGJsb2o3QzgxMlJXRjRzT3hrWVlkMFotTDZQdEdkWkYyalFjY3BfbzdHWT1zOTYtYyIsImlzcyI6Imh0dHBzOi8vc2VjdXJldG9rZW4uZ29vZ2xlLmNvbS9pdHAtaW1hLXJlcGxpY2F0ZS1wcm94eSIsImF1ZCI6Iml0cC1pbWEtcmVwbGljYXRlLXByb3h5IiwiYXV0aF90aW1lIjoxNzcxOTg2OTM2LCJ1c2VyX2lkIjoiNWgydjJEWkRMSFFzTjJ3MDY2RU96SkE1M3d3MSIsInN1YiI6IjVoMnYyRFpETEhRc04ydzA2NkVPekpBNTN3dzEiLCJpYXQiOjE3NzY5MDM5MDYsImV4cCI6MTc3NjkwNzUwNiwiZW1haWwiOiJyczg3OTNAbnl1LmVkdSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJmaXJlYmFzZSI6eyJpZGVudGl0aWVzIjp7Imdvb2dsZS5jb20iOlsiMTAzMTM2Mjk2NTgxMjkzOTgwOTM1Il0sImVtYWlsIjpbInJzODc5M0BueXUuZWR1Il19LCJzaWduX2luX3Byb3ZpZGVyIjoiZ29vZ2xlLmNvbSJ9fQ.h5oR3TaEdXfatf75hkE_FnpMxVQU6W-l4VG814xqU45zVlJqyXUSJWV1aFNOvsUbEemaCtWmNeivDeurCrIDXzt3RMQdwzO4yra819UFhbzuXK5-Bs9v_xyAquBsOeUbklWweZux5OpQcKBMfVIm2zVZWQhd9x5JWWV7VCZulGlF4_gQKnWBSzTL5Sue1IMCGcdG6C3hB-jyjeFS1h9KPZdUmsILAY4TGRXiBzstgyx11Jq9HFOvn2cgonhgM-rjSBI6JckEEizAxZ-37uDjQwo0maZIWrTYJypw4QxKNmd0g6I51xH9GpMrA4GUzDglAJhkkkVXAps_NMr6VU8K0g';
const MODEL = 'meta/meta-llama-3-70b-instruct';

const SYSTEM_PROMPT = `You are the quiet voice behind B-Side, a private reflective storytelling space. Your role is to help someone narrate something that happened to them. You are not a therapist, not a life coach, not a cheerful assistant. You are a calm, attentive presence.

Rules:
- Be warm, calm, and non-judgmental.
- Keep responses concise — usually 1 to 3 sentences.
- Ask one gentle follow-up question at a time.
- Help the user describe what happened, what they felt, and what choices they faced.
- Notice turning points and decisions naturally.
- Never use exclamation marks or overly cheerful language.
- Never give unsolicited advice.
- Avoid therapy jargon and self-help clichés.
- You are preparing material that will later become a third-person literary story.
- Do not mention that you are an AI. Simply be present.`;

const INITIAL_AI_MSG = 'Tell me what happened.\n\nYou can start wherever feels right.\nThere\'s no wrong way to begin.';

let chatHistory = [
  { role: 'assistant', content: INITIAL_AI_MSG }
];
let userTurnCount = 0;
let chatBusy = false;

function formatPrompt(messages) {
  let prompt = '';
  for (const msg of messages) {
    if (msg.role === 'user') prompt += 'User: ' + msg.content + '\n';
    else if (msg.role === 'assistant') prompt += 'Assistant: ' + msg.content + '\n';
  }
  return prompt + 'Assistant:';
}

function initChat() {
  const input   = document.getElementById('chat-input');
  const btn     = document.getElementById('chat-send');
  const scroll  = document.getElementById('chat-scroll');
  const prompt  = document.getElementById('chat-prompt');

  btn.addEventListener('click', () => sendUserMessage(input, scroll, prompt));
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendUserMessage(input, scroll, prompt);
    }
  });
}

async function sendUserMessage(input, scroll, prompt) {
  const text = input.value.trim();
  if (!text || chatBusy) return;

  appendMsg('user', text);
  chatHistory.push({ role: 'user', content: text });
  input.value = '';
  userTurnCount++;
  chatBusy = true;
  setSendState(true);
  showTyping();

  try {
    const recent = chatHistory.slice(-10);
    const body = {
      model: MODEL,
      input: {
        prompt: formatPrompt(recent),
        system_prompt: SYSTEM_PROMPT,
        max_new_tokens: 250,
        temperature: 0.75,
        top_p: 0.9
      }
    };

    const res = await fetch(PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + AUTH_TOKEN
      },
      body: JSON.stringify(body)
    });

    const prediction = await res.json();
    removeTyping();

    let reply = '';
    if (prediction.output) {
      reply = Array.isArray(prediction.output)
        ? prediction.output.join('')
        : String(prediction.output);
    }
    reply = reply.replace(/^Assistant:\s*/i, '').trim();

    if (!reply) reply = 'Take your time. I\u2019m not going anywhere.';

    appendMsg('ai', reply);
    chatHistory.push({ role: 'assistant', content: reply });

  } catch (err) {
    removeTyping();
    console.error('Chat error:', err);
    appendMsg('ai', 'Something went quiet for a moment. Try again when you\u2019re ready.');
  }

  chatBusy = false;
  setSendState(false);

  if (userTurnCount >= 3 && prompt && !prompt.hasChildNodes()) {
    const a = document.createElement('button');
    a.className = 'btn-link';
    a.textContent = 'View draft \u2192';
    a.setAttribute('data-go', 's-draft');
    prompt.appendChild(a);
  }
}

function appendMsg(role, text) {
  const scroll = document.getElementById('chat-scroll');
  const div = document.createElement('div');
  div.className = 'msg msg-' + role;
  const p = document.createElement('p');
  p.textContent = text;
  div.appendChild(p);
  scroll.appendChild(div);
  scroll.scrollTop = scroll.scrollHeight;
}

function showTyping() {
  const scroll = document.getElementById('chat-scroll');
  const div = document.createElement('div');
  div.className = 'typing';
  div.id = 'typing';
  div.innerHTML = '<span></span><span></span><span></span>';
  scroll.appendChild(div);
  scroll.scrollTop = scroll.scrollHeight;
}

function removeTyping() {
  const el = document.getElementById('typing');
  if (el) el.remove();
}

function setSendState(busy) {
  const btn = document.getElementById('chat-send');
  btn.classList.toggle('disabled', busy);
}

/* ════════════════════════════════════
   DRAFT PREVIEW
   ════════════════════════════════════ */

function initDraft() {
  const toggle  = document.getElementById('decisions-toggle');
  const list    = document.getElementById('decisions-list');
  const bar     = document.getElementById('draft-bar');
  const confirm = document.getElementById('draft-confirm');
  const msg     = document.getElementById('draft-confirm-msg');
  const prose   = document.getElementById('draft-prose');

  toggle.addEventListener('click', () => {
    const open = !list.hidden;
    list.hidden = open;
    toggle.textContent = open
      ? '3 decision points identified \u2192'
      : '3 decision points identified \u2193';
  });

  document.getElementById('act-edit').addEventListener('click', () => {
    const editing = prose.contentEditable === 'true';
    prose.contentEditable = editing ? 'false' : 'true';
    if (!editing) prose.focus();
  });

  document.getElementById('act-anon').addEventListener('click', () => openModal('modal-anon'));
  document.getElementById('act-publish').addEventListener('click', () => showDraftConfirm('Your track is out there.'));
  document.getElementById('act-private').addEventListener('click', () => showDraftConfirm('Kept in your record.', 's-record'));

  document.getElementById('anon-confirm').addEventListener('click', () => {
    closeModal();
    showDraftConfirm('Identifying details were softened.');
  });

  function showDraftConfirm(text, thenGo) {
    bar.hidden = true;
    confirm.hidden = false;
    msg.textContent = text;
    if (thenGo) {
      setTimeout(() => { go(thenGo); resetDraft(); }, 1800);
    }
  }

  function resetDraft() {
    bar.hidden = false;
    confirm.hidden = true;
    prose.contentEditable = 'false';
  }
}

/* ════════════════════════════════════
   COMMENT TABS (Story Reading)
   ════════════════════════════════════ */

let activeTab = null;

function initComments() {
  const tabs    = document.getElementById('comment-tabs');
  const compose = document.getElementById('comment-compose');
  const list    = document.getElementById('comment-list');
  const input   = document.getElementById('comment-input');
  const sendBtn = document.getElementById('comment-send');

  tabs.addEventListener('click', e => {
    const pill = e.target.closest('.pill');
    if (!pill) return;
    const tab = pill.dataset.ctab;

    tabs.querySelectorAll('.pill').forEach(p => p.classList.toggle('active', p === pill));
    activeTab = tab;
    compose.hidden = false;

    list.querySelectorAll('.comment').forEach(c => {
      c.hidden = c.dataset.ctab !== tab;
    });
  });

  function post() {
    const text = input.value.trim();
    if (!text || !activeTab) return;
    const el = document.createElement('div');
    el.className = 'comment';
    el.dataset.ctab = activeTab;
    el.innerHTML =
      '<span class="comment-who">You</span>' +
      '<p>' + esc(text) + '</p>' +
      '<span class="comment-when">Just now</span>';
    list.prepend(el);
    input.value = '';
  }

  sendBtn.addEventListener('click', post);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); post(); }
  });
}

/* ════════════════════════════════════
   RECORD TABS (My Record)
   ════════════════════════════════════ */

function initRecordTabs() {
  document.querySelectorAll('[data-rtab]').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('[data-rtab]').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const t = pill.dataset.rtab;
      document.getElementById('rtab-pub').hidden  = t !== 'pub';
      document.getElementById('rtab-priv').hidden = t !== 'priv';
    });
  });
}

/* ════════════════════════════════════
   MODALS
   ════════════════════════════════════ */

function openModal(id) {
  document.getElementById('overlay').classList.add('open');
  document.getElementById(id).classList.add('open');
}

function closeModal() {
  document.getElementById('overlay').classList.remove('open');
  document.querySelectorAll('.modal').forEach(m => m.classList.remove('open'));
}

function initModals() {
  document.getElementById('overlay').addEventListener('click', closeModal);

  document.addEventListener('click', e => {
    if (e.target.closest('[data-close-modal]')) closeModal();
    const moreBtn = e.target.closest('[data-modal]');
    if (moreBtn) openModal(moreBtn.dataset.modal);
  });
}

/* ════════════════════════════════════
   UTILITIES
   ════════════════════════════════════ */

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

/* ════════════════════════════════════
   INIT
   ════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  initChat();
  initDraft();
  initComments();
  initRecordTabs();
  initModals();
});
