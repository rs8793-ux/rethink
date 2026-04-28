/*
  B-Side — server.js
  Express backend that proxies chat requests to Replicate.
  Keeps API credentials server-side. Serves the frontend.
*/

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const PORT = process.env.PORT || 3000;
const AUTH_TOKEN = process.env.REPLICATE_AUTH_TOKEN || '';
const MODEL = process.env.REPLICATE_MODEL || 'meta/meta-llama-3-70b-instruct';
const PROXY_URL = 'https://itp-ima-replicate-proxy.web.app/api/create_n_get';

const SYSTEM_PROMPT = `You are the quiet voice behind B-Side, a private reflective storytelling space.

Your role is to help someone narrate something that happened to them. You are not a therapist, not a life coach, not a cheerful assistant. You are a calm, attentive presence — like a trusted person sitting across from them in a quiet room.

How to respond:
- Be warm, calm, and non-judgmental.
- Keep responses concise — usually 1 to 3 sentences.
- Ask one gentle follow-up question at a time.
- Help the user describe what happened, what they felt, and what choices they faced.
- Notice turning points and decisions naturally, without labeling them clinically.
- Never use exclamation marks or overly cheerful language.
- Never give unsolicited advice.
- Avoid therapy jargon and self-help clichés.
- Do not summarize what the user said back to them unless it adds something new.
- You are helping gather raw material that will later become a third-person literary story.

Your tone should sound like:
- "I'm here. Keep going."
- "That sounds like a moment that stayed with you."
- "What happened just before that?"
- "If you want, we can stay with that detail a little longer."
- "There's a turning point somewhere in there. Do you feel it too?"

Stay in character. Do not break the fourth wall. Do not mention that you are an AI or a language model. Simply be present.`;

function formatPrompt(messages) {
  let prompt = '';
  for (const msg of messages) {
    if (msg.role === 'user') {
      prompt += `User: ${msg.content}\n`;
    } else if (msg.role === 'assistant') {
      prompt += `Assistant: ${msg.content}\n`;
    }
  }
  prompt += 'Assistant:';
  return prompt;
}

app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ reply: 'No messages provided.' });
  }

  const recent = messages.slice(-10);
  const prompt = formatPrompt(recent);

  const body = {
    model: MODEL,
    input: {
      prompt: prompt,
      system_prompt: SYSTEM_PROMPT,
      max_new_tokens: 250,
      temperature: 0.75,
      top_p: 0.9,
      repetition_penalty: 1.1
    }
  };

  const headers = {
    'Content-Type': 'application/json'
  };
  if (AUTH_TOKEN) {
    headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
  }

  try {
    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Replicate proxy error:', response.status, errText);
      return res.json({
        reply: 'Something went quiet for a moment. Try again when you\u2019re ready.'
      });
    }

    const prediction = await response.json();

    let reply = '';
    if (prediction.output) {
      reply = Array.isArray(prediction.output)
        ? prediction.output.join('')
        : String(prediction.output);
    }

    reply = reply.replace(/^Assistant:\s*/i, '').trim();

    if (!reply) {
      reply = 'Take your time. I\u2019m not going anywhere.';
    }

    res.json({ reply });

  } catch (err) {
    console.error('Chat endpoint error:', err.message);
    res.json({
      reply: 'Something went quiet for a moment. Try again when you\u2019re ready.'
    });
  }
});

app.listen(PORT, () => {
  console.log(`B-Side server running at http://localhost:${PORT}`);
  if (!AUTH_TOKEN) {
    console.log('Note: No REPLICATE_AUTH_TOKEN set. Unauthenticated requests have limited quota.');
  }
});
