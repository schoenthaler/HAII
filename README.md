# HAII — Human-AI Interaction Demo

A research demo of an AI pair programming tool for novice Python learners, built at the University of Melbourne.

---

## What's in this repo

| Folder / File | What it is |
|---|---|
| `AI Pair Programming Plugin Demo V2/` | The interactive web demo (Scenario 1) |
| `scenario2_quiz_game.ipynb` | Jupyter notebook take-home task (Scenario 2) |

---

## Scenario 1 — AI Pair Programming Demo (Web App)

### What you need before starting

You need to install two programs and get two free API keys. This is a one-time setup.

#### Step 1 — Install Node.js

Node.js lets your computer run the web app locally.

1. Go to **https://nodejs.org**
2. Download the **LTS** version (the one labelled "Recommended for most users")
3. Open the downloaded file and follow the installer — click Next through everything
4. When it finishes, open Terminal (on Mac: press `Cmd + Space`, type `Terminal`, press Enter)
5. Type this and press Enter to confirm it worked:
   ```
   node --version
   ```
   You should see something like `v20.11.0`. If you see a version number, you're good.

#### Step 2 — Install pnpm

pnpm is the package manager this project uses to download its dependencies.

In Terminal, type this and press Enter:
```
npm install -g pnpm
```

When it finishes, confirm it worked:
```
pnpm --version
```
You should see a version number like `8.15.0`.

#### Step 3 — Get a Groq API key (for the AI chat)

The AI responses are powered by Groq — it's free, no credit card needed.

1. Go to **https://console.groq.com**
2. Sign up with your Google or GitHub account
3. Click **API Keys** in the left sidebar
4. Click **Create API Key**, give it any name, click **Submit**
5. Copy the key — it starts with `gsk_`. **Save it somewhere — you won't be able to see it again.**

#### Step 4 — Get a Gemini API key (for the AI voice)

The text-to-speech voice is powered by Google Gemini — also free.

1. Go to **https://aistudio.google.com**
2. Sign in with your Google account
3. Click **Get API key** in the top left
4. Click **Create API key** — it generates one instantly
5. Copy the key — it starts with `AIzaSy`. Save it.

---

### Cloning and running the demo

#### Step 5 — Clone the repository

In Terminal:
```
git clone https://github.com/schoenthaler/HAII.git
cd HAII
```

If you don't have git installed, you'll see an error. Fix it by downloading git from **https://git-scm.com** and re-running the command.

Alternatively, you can download the repo as a ZIP: on the GitHub page click **Code → Download ZIP**, then unzip it and open Terminal inside that folder.

#### Step 6 — Install dependencies

```
cd "AI Pair Programming Plugin Demo V2"
pnpm install
```

This downloads all the code libraries the project needs. It may take a minute or two. You only need to do this once.

#### Step 7 — Create your `.env` file

The API keys need to be stored in a file called `.env` inside the `AI Pair Programming Plugin Demo V2` folder. This file is never uploaded to GitHub — it stays on your computer only.

1. In Terminal, make sure you're inside the `AI Pair Programming Plugin Demo V2` folder (you should be from Step 6)
2. Create the file by running:
   ```
   cp .env.example .env
   ```
3. Open the file in a text editor. On Mac you can run:
   ```
   open -e .env
   ```
4. Replace `your_key_here` with your actual keys. The file should look like this:
   ```
   VITE_GROQ_API_KEY=gsk_yourgroqkeyhere
   VITE_GEMINI_API_KEY=AIzaSyyourgooglekeyhere
   ```
5. Save and close the file.

> **Important:** `.env` files are plain text. Do not open them in Word or Pages — use TextEdit (set to plain text mode), VS Code, or any code editor.

#### Step 8 — Start the app

```
pnpm dev
```

Open **http://localhost:5173** in **Chrome or Edge**.

> Voice input requires Chrome or Edge. Safari does not support the Web Speech API used for microphone input.

To stop the server, press `Ctrl + C` in Terminal.

---

### Using the demo

1. **Click Start Session** on the welcome screen (tick the consent checkbox first)
2. **Demo mode** — code types itself automatically on the left; the AI panel on the right comments in real time
3. **Skeleton mode** — click the **Skeleton** button (top right) to switch to a coding challenge. The AI knows which challenge you're on and can answer questions about it
4. **Ask the AI a question** — click **Speak to AI**, ask your question out loud, then click **✕** to send. The AI will respond in text and read the answer aloud
5. **Mute the voice** — click the speaker icon in the AI panel header to toggle audio on/off
6. **Quit** — click **← Quit** to return to the welcome screen

---

### Troubleshooting

**"pnpm: command not found"**
Close Terminal, reopen it, and try again. If it still fails, run `npm install -g pnpm` again.

**App opens but AI doesn't respond**
Open the browser DevTools (right-click anywhere → Inspect → Console tab). If you see an error mentioning `401` or `API key`, your Groq key in `.env` is wrong or missing.

**No voice / AI doesn't speak**
Open DevTools Console. If you see `[GoogleTTS] API error 403`, the Gemini API is not enabled for your key — go to https://aistudio.google.com and create a fresh key there instead.

**"Port 5173 is already in use"**
Vite will automatically try port 5174. Check the Terminal output for the exact URL to open.

**Microphone not working**
Make sure you're using Chrome or Edge (not Safari). When prompted, allow microphone access. If Chrome asks once and you clicked Deny, go to Chrome Settings → Privacy → Site Settings → Microphone and re-allow localhost.

---

## Scenario 2 — Participant Quiz Game (Jupyter Notebook)

The file `scenario2_quiz_game.ipynb` is the take-home coding task. Participants complete it in a standard Python environment with Claude Chat open on the side.

### Running the notebook

You need Python and Jupyter installed. If you already use Anaconda or VS Code with the Jupyter extension, open it directly from there.

Otherwise, in Terminal:
```
pip install notebook
jupyter notebook scenario2_quiz_game.ipynb
```
