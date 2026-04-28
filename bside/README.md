# B-Side

A reflective storytelling app where you talk through what happened, and AI helps shape it into a third-person story.

## Setup

### 1. Install dependencies

```bash
cd bside
npm install
```

### 2. Add your Replicate token

Copy the example env file and add your auth token:

```bash
cp .env.example .env
```

Open `.env` and replace `your_token_here` with your ITP Replicate proxy auth token.

The token comes from the ITP/IMA Replicate proxy authentication page. Authenticate with your `.nyu.edu` email. Note: tokens may expire every hour — refresh as needed.

### 3. Run the server

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## How it works

### Architecture

```
Browser (index.html / script.js)
    ↓  POST /api/chat
Express server (server.js)
    ↓  POST with auth token
ITP Replicate proxy
    ↓
Meta Llama on Replicate
```

The Express server keeps your auth token private and proxies requests to the Replicate API through the ITP proxy.

### Chat flow

1. User opens the **Dialogue** screen and types a message.
2. The frontend sends the full conversation history to `POST /api/chat`.
3. The backend formats the conversation, attaches B-Side's system prompt, and sends it to the Replicate proxy.
4. The AI response comes back and is displayed as calm, serif text.
5. After 3 exchanges, a "View draft →" button appears, leading to the draft preview.

### AI behavior

The AI acts as a gentle reflective companion — not a therapist, not a chatbot. It asks one follow-up at a time, notices turning points, and helps the user narrate their experience. The system prompt is defined in `server.js`.

### Model

Default: `meta/meta-llama-3-70b-instruct`

You can change this in `.env` by setting `REPLICATE_MODEL` to any text model available on Replicate (e.g., `meta/llama-4-maverick-instruct`).

## File structure

```
bside/
├── index.html       Frontend — all 8 screens
├── style.css        Design system — dark theme, purple glow
├── script.js        Navigation, chat, tabs, modals
├── server.js        Express backend — Replicate proxy
├── package.json     Node dependencies
├── .env.example     Environment variable template
├── .gitignore       Ignores node_modules and .env
└── README.md        This file
```

## Screens

1. **Splash** — Rotating vinyl, brand intro
2. **Sign Up** — Anonymous display name, email, password
3. **Home** — Stats, new track button, matched stories
4. **New Track Chat** — Real AI conversation
5. **Draft Preview** — Generated story, decision points, publish/private
6. **Story Reading** — Full story with non-performative responses
7. **My Record** — Published and private tracks
8. **Settings** — Account, privacy, data controls

## Usage limits (ITP proxy)

- Unauthenticated: a few requests on cheaper models
- Authenticated: up to 500/day on standard models
- Expensive models (video): 10/day
