# HAII

Human-AI Interaction project.

Coding assistant as peer programmer for novice programmers, as a pedagogical tool.

---

## Running the Demo (Scenario 1 — AI Pair Programming V2)

### Prerequisites
- [Node.js](https://nodejs.org) (v18 or later)
- [pnpm](https://pnpm.io) — install with `npm install -g pnpm`
- A free Groq API key — get one at [console.groq.com](https://console.groq.com) (no credit card required)
- Chrome or Edge (required for voice input — Safari does not support the Web Speech API)

### First-time setup

1. Navigate to the V2 folder:
   ```bash
   cd "AI Pair Programming Plugin Demo V2"
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Create a `.env` file in `AI Pair Programming Plugin Demo V2/`:
   ```
   VITE_GROQ_API_KEY=your_key_here
   ```
   Replace `your_key_here` with your Groq API key.

### Start the dev server

```bash
cd "AI Pair Programming Plugin Demo V2"
pnpm dev
```

Open **[http://localhost:5173](http://localhost:5173)** in Chrome or Edge.  
If port 5173 is already in use, Vite will try 5174 — check the terminal output for the exact URL.

### Using the demo

1. Click **Start Session** on the welcome screen (you must accept the consent checkbox first)
2. Watch the code auto-type on the left — the AI panel on the right will flag bugs, optimisations, and teaching moments in real time
3. To ask the AI a question, either:
   - Click **Speak to AI** and talk — the live transcript appears as you speak, then sends automatically when you click the stop button (✕)
   - Type in the text input at the bottom of the AI panel and press Enter
4. Click **← Quit** to return to the welcome screen

---

## Scenario 2 — Participant Quiz Game (Jupyter Notebook)

The notebook `scenario2_quiz_game.ipynb` in this folder is the take-home coding task.  
Participants complete it in a standard Python environment with Claude Chat open on the side.

### Running the notebook

```bash
jupyter notebook scenario2_quiz_game.ipynb
```

Or open it directly in VS Code using the **Jupyter** extension.