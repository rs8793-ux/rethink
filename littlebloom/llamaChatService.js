/* =====================================================
   LITTLE BLOOM · llamaChatService.js
   Llama-powered conversational companion for parents.

   Architecture:
     buildSystemPrompt()    – crafts the chatbot persona
     sendToLlama()          – calls Meta Llama via Replicate
     detectMemoryCandidate()– checks if a message pair is memorable
     summarizeMemoryEntry() – distills memorable content into a diary entry
     saveMemoryEntry()      – silently writes to the Memory Book
   ===================================================== */

function buildSystemPrompt() {
  return `You are Bloom — a quiet, thoughtful companion who talks with parents about their children and their lives.

You are NOT a memory collector. You are NOT an interviewer. You are NOT building a story.
You are simply here. Present. Listening. Responding like a real person who cares.

PERSONALITY
- Gentle, grounded, emotionally perceptive
- Warm but never fake-cheerful
- You speak the way a close friend would: simply, honestly, with care
- You notice feelings before you notice facts
- You are comfortable with silence, sadness, frustration, and mess
- You never rush. You never push. You never redirect toward a "product goal"

WHEN A PARENT SHARES SOMETHING DIFFICULT
- "I'm so tired" → Acknowledge the tiredness. Sit in it. Don't try to fix it.
- "My kid is driving me crazy" → Validate. Don't lecture. Don't reframe it into something cute.
- "I feel like a bad parent" → Be real. Say something like "That feeling is so heavy. I hear you." Never say "You're doing great!" unless it's earned and specific.
- Never pivot a hard moment into "but what a sweet memory!" That feels dismissive.

WHEN A PARENT SHARES SOMETHING SWEET OR FUNNY
- Match their energy. Laugh with them. Be delighted.
- Reflect back the specific detail that made it special — not a generic "aww"
- If you ask a follow-up, make it curious and specific, not extractive

CONVERSATION RULES
- Keep responses SHORT: 1–3 sentences. Sometimes just one.
- Do NOT ask a question in every single message. Sometimes just respond.
- Never ask more than one question per message.
- Only ask follow-ups that feel natural and curious, not clinical.
- Never say "tell me more" — that's vague and robotic.
- Never use phrases like "I'd love to hear about…" or "What a wonderful memory!" — those sound scripted.
- Avoid exclamation marks overuse. Calm punctuation.
- Never suggest saving, recording, journaling, or "turning this into a story."
- Never mention the Memory Book, gallery, storybook, or any app feature.
- You do not know you are being recorded. You are just talking.

EMOTIONAL INTELLIGENCE
- Read the emotional register of each message. Match it.
- If the parent is playful → be light
- If the parent is tired → be gentle and brief
- If the parent is emotional → be present, don't over-talk
- If the parent is venting → let them. Validate. Don't fix.
- If the parent is casual → be casual back. Not everything is deep.

WHAT MAKES YOU DIFFERENT FROM OTHER CHATBOTS
- You don't have an agenda
- You don't steer conversations
- You don't ask for details you can "use"
- You just listen, respond, and care
- The parent should feel lighter after talking to you, not like they completed a form`;
}

const MEMORY_DETECT_PROMPT = `You are a quiet background system. You receive a short conversation between a parent and a companion.

Your job: decide if the parent said something emotionally meaningful or memorable about their child or their experience as a parent, and rate how intense the moment feels.

Meaningful means: a specific moment, a funny quote, a feeling, a milestone, a realization, a tender detail — something a parent might want to remember years from now.

NOT meaningful: greetings, vague statements, logistics, the parent just saying "I'm tired" with no story, pure small talk.

Intensity levels:
- "low": a nice detail, worth saving quietly
- "medium": a clearly meaningful moment, specific and warm
- "high": deeply emotional, a milestone, something that would make someone cry or laugh out loud

Respond with ONLY a JSON object, nothing else:
{"memorable": true, "intensity": "high"} or {"memorable": false}`;

const MEMORY_SUMMARIZE_PROMPT = `You are a quiet diary writer. You receive a few messages from a conversation between a parent and a companion.

Your job: write a short, warm diary-style memory entry based on what the parent shared. Write as if the parent is writing in their own notebook — first person, intimate, tender.

Rules:
- 2–4 sentences max
- Capture the specific moment, not a general observation
- Include sensory or emotional details if the parent mentioned any
- Don't dramatize or add things the parent didn't say
- Write in past tense
- Tone: gentle, warm, slightly wistful — like looking at an old photograph

Respond with ONLY a JSON object, no markdown:
{"title":"Short title (2-5 words)","summary":"One line summary","diary":"The diary paragraph","tags":["tag1","tag2"]}

Tag options: funny, heartwarming, milestone, daily life, family moment, adventure, first time, bedtime, mealtime, outdoors, creative, friendship, emotional, parenting`;


async function sendToLlama(messages) {
  const formatted = messages.map(m => {
    if (m.role === 'system') return `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n${m.content}<|eot_id|>`;
    if (m.role === 'user') return `<|start_header_id|>user<|end_header_id|>\n\n${m.content}<|eot_id|>`;
    if (m.role === 'assistant') return `<|start_header_id|>assistant<|end_header_id|>\n\n${m.content}<|eot_id|>`;
    return '';
  }).join('');

  const prompt = formatted + '<|start_header_id|>assistant<|end_header_id|>\n\n';

  const data = {
    model: 'meta/meta-llama-3-70b-instruct',
    input: {
      prompt,
      max_tokens: 400,
      temperature: 0.75,
      top_p: 0.9,
      stop: '<|eot_id|>',
    },
  };

  const response = await fetch(REPLICATE_PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${REPLICATE_AUTH_TOKEN}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) throw new Error('Llama API error: ' + response.status);
  const prediction = await response.json();
  const output = prediction.output;
  if (Array.isArray(output)) return output.join('');
  return typeof output === 'string' ? output : String(output);
}


async function detectMemoryCandidate(recentMessages) {
  const snippet = recentMessages
    .map(m => `${m.role === 'user' ? 'Parent' : 'Bloom'}: ${m.content}`)
    .join('\n');

  try {
    const result = await sendToLlama([
      { role: 'system', content: MEMORY_DETECT_PROMPT },
      { role: 'user', content: snippet }
    ]);

    const clean = result.trim().replace(/```json\s*/g, '').replace(/```/g, '');
    const json = JSON.parse(clean);
    if (!json.memorable) return { memorable: false, intensity: null };
    return { memorable: true, intensity: json.intensity || 'low' };
  } catch {
    return { memorable: false, intensity: null };
  }
}


async function summarizeMemoryEntry(recentMessages) {
  const snippet = recentMessages
    .map(m => `${m.role === 'user' ? 'Parent' : 'Bloom'}: ${m.content}`)
    .join('\n');

  try {
    const result = await sendToLlama([
      { role: 'system', content: MEMORY_SUMMARIZE_PROMPT },
      { role: 'user', content: snippet }
    ]);

    const clean = result.trim().replace(/```json\s*/g, '').replace(/```/g, '');
    return JSON.parse(clean);
  } catch {
    const userMsgs = recentMessages.filter(m => m.role === 'user');
    const combined = userMsgs.map(m => m.content).join(' ');
    return {
      title: 'A Small Moment',
      summary: combined.substring(0, 80),
      diary: combined,
      tags: ['daily life']
    };
  }
}


function saveMemoryEntry(entryData) {
  addMemoryFromChat({
    title: entryData.title,
    summary: entryData.summary,
    story: entryData.diary,
    tags: entryData.tags || ['daily life'],
    source: entryData.source || 'chatbot',
  });
}
