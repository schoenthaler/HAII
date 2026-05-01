# HAII

Human-AI Interaction project.

Coding assistant as peer programmer for novice programmers, as a pedagogical tool.

## Speech mode

This repo now includes a small browser app that:

- records speech from a button click
- sends the transcript to an LLM API through a local server
- uses a pedagogical system prompt so the assistant focuses on hints, reasoning, and learning
- speaks the assistant reply aloud in the browser

## Run it

1. Copy `.env.example` to `.env` and set your API key.
2. Start the server with `npm start`.
3. Open `http://localhost:3000` in a browser that supports speech recognition, such as Chrome or Edge.

## Config

The server expects an OpenAI-compatible chat-completions endpoint by default. You can override it with `LLM_API_URL` if you want to point at another LLM provider.