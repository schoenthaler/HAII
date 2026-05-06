
  # AI Pair Programming Plugin Demo

This is a code bundle for AI Pair Programming Plugin Demo. The original project is available at https://www.figma.com/design/HD6yuVTisXSE2XIyRwit3V/AI-Pair-Programming-Plugin-Demo.

## Features

- React/Vite UI with animated code editor and AI teaching panel
- **Real speech recognition** via the Web Speech API (Chrome/Edge) — click the 🔴 record button to speak to the AI
- **Text-to-speech** responses — AI replies are read aloud via the browser's speech synthesis
- **Live AI backend** via a Node.js server proxying to any OpenAI-compatible API

## Setup

1. Copy `.env.example` to `.env` and fill in your `LLM_API_KEY`.
2. Install dependencies: `npm install`

## Running

### Development (UI hot-reload + API backend)

Start the API server (reads from `.env`):
```
node server.js
```

Start the Vite dev server in another terminal — `/api/chat` is automatically proxied to the Node server:
```
npm run dev
```

Or launch both together (Unix/macOS):
```
npm run dev:full
```

### Production

Build the UI then serve everything from the Node server:
```
npm run build
npm start
```

The server serves files from `dist/` and exposes `/api/chat` on port 3000 (configurable via `PORT`).

## Environment variables

| Variable      | Default                                        | Description                     |
|---------------|------------------------------------------------|---------------------------------|
| `PORT`        | `3000`                                         | Port the server listens on      |
| `LLM_API_URL` | `https://api.openai.com/v1/chat/completions`   | OpenAI-compatible chat endpoint |
| `LLM_API_KEY` | *(required)*                                   | API key                         |
| `LLM_MODEL`   | `gpt-4.1-mini`                                 | Model to use                    |

## Speech support

Speech recognition (`SpeechRecognition`) and synthesis (`speechSynthesis`) are browser APIs. They work best in **Chrome** or **Edge**. Firefox does not support `SpeechRecognition`.

Click the 🔴 record button in the AI panel header to start/stop voice input. The AI's text reply is spoken aloud automatically.
  