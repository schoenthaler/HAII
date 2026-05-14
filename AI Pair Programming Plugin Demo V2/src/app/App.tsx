import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CodeEditor, CodeLine } from './components/CodeEditor';
import { AITeachingPanel } from './components/AITeachingPanel';
import { WelcomePage } from './components/WelcomePage';
import { useAIChat } from './components/useAIChat';
import { useGoogleTTS } from './components/useGoogleTTS';
import { Code2, Sparkles, Layers } from 'lucide-react';

interface Message {
  type: 'ai' | 'user';
  content: string;
  timestamp: string;
  badge?: 'error' | 'optimize' | 'warning' | 'teach';
  lineNumbers?: number[];
}

// ─── Code script ──────────────────────────────────────────────────────────────

// ─── Scenario 1: Playlist Duration Analyzer ───────────────────────────────────
// Optimize: total = total + ... → += (L4)
// Teach:    list-of-dicts pattern (L1), list comprehension (L12), lambda (L15)
// Bug:      sorted(playlist) → TypeError, needs key=lambda (L15)
// Bug:      seconds / 60 → float, needs // floor division (L18)
// Bug:      f"{minutes}:{secs}" → missing :02d zero-padding (L20)

const codeLines: CodeLine[] = [
  {
    number: 1, content: 'def total_duration(playlist):',
    annotationType: 'teach',
    annotation: "The parameter `playlist` is a list of dicts — each dict is one song: {'title': 'Blinding Lights', 'duration': 200}. This list-of-dicts pattern is how Python represents a table of records. The function name tells you exactly what shape of data to pass in.",
  },
  { number: 2, content: '    total = 0' },
  { number: 3, content: '    for song in playlist:' },
  {
    number: 4, content: "        total = total + song['duration']",
    annotationType: 'optimize',
    annotation: "`total += song['duration']` means exactly the same thing, shorter. The bracket notation — `song['duration']` — looks up the 'duration' key inside each song dict. You'll write this any time you're looping over a list of records.",
  },
  { number: 5, content: '    return total' },
  { number: 6, content: '' },
  {
    number: 7, content: 'def find_by_artist(playlist, artist):',
    annotationType: 'teach',
    annotation: "Second function — search songs by artist. Notice the pattern coming: empty list, loop, condition, append. This is so common in Python that there's a one-liner for it. Watch the return line.",
  },
  { number: 8, content: '    result = []' },
  { number: 9, content: '    for song in playlist:' },
  { number: 10, content: "        if song['artist'] == artist:" },
  { number: 11, content: "            result.append(song['title'])" },
  {
    number: 12, content: '    return result',
    annotationType: 'teach',
    annotation: "Those four lines — empty list, loop, condition, append — collapse into one: `[s['title'] for s in playlist if s['artist'] == artist]`. That's a list comprehension. Same output, less code, and once the pattern clicks it reads like plain English.",
  },
  { number: 13, content: '' },
  {
    number: 14, content: 'def sort_by_duration(playlist):',
    annotationType: 'teach',
    annotation: "Third function — sort songs from shortest to longest. Before reading the next line, think: can Python compare two dicts directly? What would `sorted(playlist)` actually do with a list of dicts?",
  },
  {
    number: 15, content: '    return sorted(playlist)',
    annotationType: 'error',
    annotation: "🐛 This raises a TypeError at runtime — Python can't compare two dicts directly, so it doesn't know what order to put them in. Fix: `sorted(playlist, key=lambda s: s['duration'])`. The lambda tells Python which field to use for ordering.",
  },
  { number: 16, content: '' },
  { number: 17, content: 'def format_duration(seconds):' },
  {
    number: 18, content: '    minutes = seconds / 60',
    annotationType: 'error',
    annotation: "🐛 `/` in Python 3 always returns a float — 637 / 60 gives 10.616..., not 10. For whole minutes use `//` (floor division): 637 // 60 is 10. This is one of Python 3's most common surprises for people coming from other languages.",
  },
  { number: 19, content: '    secs = seconds % 60' },
  {
    number: 20, content: '    return f"{minutes}:{secs}"',
    annotationType: 'error',
    annotation: '🐛 Two issues: `minutes` is still a float (from line 18), and single-digit seconds display as "3:5" not "3:05". Fix both: `//` on line 18, then `f"{minutes:02d}:{secs:02d}"`. The `:02d` means "integer, minimum 2 digits, zero-padded".',
  },
  { number: 21, content: '' },
  { number: 22, content: 'songs = [' },
  { number: 23, content: "    {'title': 'Blinding Lights', 'artist': 'The Weeknd', 'duration': 200}," },
  { number: 24, content: "    {'title': 'Shape of You', 'artist': 'Ed Sheeran', 'duration': 234}," },
  { number: 25, content: "    {'title': 'Levitating', 'artist': 'Dua Lipa', 'duration': 203}," },
  { number: 26, content: ']' },
  {
    number: 27, content: 'total = total_duration(songs)',
    annotationType: 'teach',
    annotation: "Calling the function with real data — `total` is now 637, the sum of all three durations in seconds. That's what format_duration will turn into a readable time string. Try working out in your head what it should give back.",
  },
  { number: 28, content: 'print(f"Playlist: {len(songs)} songs, {format_duration(total)}")' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function now() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [started, setStarted] = useState(false);
  const [isSpeaking, setIsSpeaking]     = useState(false);
  const [isThinking, setIsThinking]     = useState(false);
  const [isTyping, setIsTyping]         = useState(true);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [highlightedLine, setHighlightedLine] = useState<number | null>(null);
  const [showSkeleton, setShowSkeleton] = useState(false);

  const { sendMessage: sendToAI, resetHistory } = useAIChat();
  const { isSpeaking: ttsIsSpeaking, isMuted, speak, stop: stopSpeaking, toggleMute } = useGoogleTTS();

  // Tracks which codeLines index has been reached so we can give the AI code context
  const currentLineIdxRef = useRef(-1);

  // Skeleton mode context — updated as the user types and navigates challenges
  const skeletonCodeRef      = useRef('');
  const skeletonChallengeRef = useRef({ title: '', description: '' });

  // Auto-clear the highlight after 3.5 s
  useEffect(() => {
    if (!highlightedLine) return;
    const t = setTimeout(() => setHighlightedLine(null), 3500);
    return () => clearTimeout(t);
  }, [highlightedLine]);

  const [messages, setMessages] = useState<Message[]>([
    {
      type: 'ai',
      content:
        "Hey! I'm your AI pair programming partner. We're building a Playlist Duration Analyzer — Python functions that work with a list of song dicts. I'll call out bugs, suggest improvements, and explain the why. Ask me anything.",
      timestamp: '10:30 AM',
    },
  ]);

  // ── Skeleton mode has its own independent chat history ───────────────────────
  const [skeletonMessages, setSkeletonMessages] = useState<Message[]>([]);

  function addAI(content: string, badge?: Message['badge'], lineNumbers?: number[]) {
    setMessages((m) => [...m, { type: 'ai', content, timestamp: now(), badge, lineNumbers }]);
  }

  // ── Line-complete callback from CodeEditor ────────────────────────────────────
  const handleLineComplete = useCallback((lineIdx: number) => {
    currentLineIdxRef.current = lineIdx;
    setIsSpeaking(true);
    setTimeout(() => setIsSpeaking(false), 1100);

    const triggers: Record<number, () => void> = {

      // L1 — def total_duration
      0: () => setTimeout(() => addAI(
        "Each song is a dict with fields like title, artist, and duration. This list-of-dicts pattern is how Python stores a table of records.",
        'teach', [1]), 500),

      // L4 — total = total + song['duration']
      3: () => setTimeout(() => addAI(
        "This works, but total plus-equals does the same thing shorter. The bracket notation looks up the duration key inside each song dict.",
        'optimize', [4]), 500),

      // L7 — def find_by_artist
      6: () => setTimeout(() => addAI(
        "Second function — find songs by artist. Watch the return line for a one-liner version of this whole loop.",
        'teach', [7]), 500),

      // L12 — return result (end of find_by_artist loop)
      11: () => setTimeout(() => addAI(
        "That whole loop is one line as a list comprehension. Once the pattern clicks, writing it the long way starts to feel slow.",
        'teach', [8, 9, 10, 11, 12]), 500),

      // L14 — def sort_by_duration
      13: () => setTimeout(() => addAI(
        "Third function — sort by duration. Before reading the next line: can Python compare two dicts directly?",
        'teach', [14]), 500),

      // L15 — return sorted(playlist)  →  bug + voice demo
      14: () => {
        setTimeout(() => addAI(
          "sorted(playlist) raises a TypeError — Python can't compare dicts directly. The fix is sorted(playlist, key=lambda s: s duration), which tells Python to sort by the duration field.",
          'error', [15]), 500);

        setTimeout(() => {
          setIsVoiceActive(true);
          setIsTyping(false);
          setMessages(msgs => [...msgs, {
            type: 'user',
            content: "Hold on — what even is a lambda? I've seen it before but never really got it.",
            timestamp: now(),
          }]);
          setIsThinking(true);
          setTimeout(() => {
            setIsThinking(false);
            addAI(
              "A lambda is just a function with no name — lambda s: s duration does exactly the same thing as writing a regular def function that returns the duration field. It's shorthand for when you only need the function in one place.",
              undefined, [15]);
            setTimeout(() => { setIsVoiceActive(false); setIsTyping(true); }, 2000);
          }, 1700);
        }, 1200);
      },

      // L18 — minutes = seconds / 60
      17: () => setTimeout(() => addAI(
        "In Python 3, a single slash always returns a float — 637 divided by 60 gives 10.6, not 10. Use double slash for whole minutes.",
        'error', [18]), 500),

      // L20 — return f"{minutes}:{secs}"
      19: () => setTimeout(() => addAI(
        'Single-digit seconds will print as "3:5" instead of "3:05". Adding colon-zero-2-d inside the curly braces tells Python to zero-pad to at least 2 digits.',
        'error', [18, 20]), 500),

      // L27 — total = total_duration(songs)
      26: () => setTimeout(() => addAI(
        "total is now 637 seconds — the sum of all three song durations. That's what format_duration needs to turn into a readable time string.",
        'teach', [27]), 500),

      // L28 — final print
      27: () => setTimeout(() => addAI(
        "Three bugs to fix: sorted needs key equals lambda, the single slash needs double slash, and the f-string needs colon-zero-2-d on both values.",
        'teach', [15, 18, 20]), 500),
    };

    triggers[lineIdx]?.();
  }, []);

  // ── User message → real AI response ──────────────────────────────────────────
  const handleSendMessage = useCallback(async (message: string) => {
    stopSpeaking();
    setMessages((m) => [...m, { type: 'user', content: message, timestamp: now() }]);
    setIsThinking(true);

    // Enrich with the code currently visible on screen
    const visibleCode = codeLines
      .slice(0, currentLineIdxRef.current + 1)
      .map(l => l.content)
      .join('\n');
    const contextualMessage = visibleCode
      ? `[Code currently visible on screen:\n\`\`\`python\n${visibleCode}\n\`\`\`]\n\nJane's question: ${message}`
      : message;

    const reply = await sendToAI(contextualMessage);
    setIsThinking(false);
    setMessages((m) => [...m, { type: 'ai', content: reply, timestamp: now(), badge: 'teach' }]);
    speak(reply);
  }, [sendToAI, speak, stopSpeaking]);

  // ── Skeleton mode — real AI with challenge context ───────────────────────────
  const handleSkeletonSendMessage = useCallback(async (message: string) => {
    stopSpeaking();
    setSkeletonMessages((m) => [...m, { type: 'user', content: message, timestamp: now() }]);
    setIsThinking(true);

    const { title, description } = skeletonChallengeRef.current;
    const code = skeletonCodeRef.current;
    const contextualMessage = title
      ? `[Student is working on challenge: "${title}" — ${description}]\n[Their current code:\n\`\`\`python\n${code || '(empty)'}\n\`\`\`]\n\nJane's question: ${message}`
      : message;

    const reply = await sendToAI(contextualMessage);
    setIsThinking(false);
    setSkeletonMessages((m) => [
      ...m,
      { type: 'ai', content: reply, timestamp: now(), badge: 'teach' },
    ]);
    speak(reply);
  }, [sendToAI, speak, stopSpeaking]);

  // Reset AI history when returning to welcome screen
  const handleQuit = () => {
    stopSpeaking();
    setStarted(false);
    resetHistory();
  };

  return (
    <AnimatePresence mode="wait">
      {!started ? (
        <motion.div
          key="welcome"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.45, ease: 'easeInOut' }}
          style={{ position: 'fixed', inset: 0 }}
        >
          <WelcomePage onEnter={() => setStarted(true)} />
        </motion.div>
      ) : (
        <motion.div
          key="app"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          style={{ position: 'fixed', inset: 0 }}
          className="bg-gradient-to-br from-[#0a0e1a] via-[#0f141f] to-[#1a1028] overflow-hidden flex flex-col"
        >
          {/* ── Header ── */}
          <motion.header
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="px-8 py-5 border-b border-[#2a3f5f]/30 backdrop-blur-sm flex-shrink-0"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <motion.div
                  className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#ff9d3d] to-[#ffa94d] flex items-center justify-center shadow-lg shadow-[#ff9d3d]/20"
                  animate={{ rotate: [0, 5, 0, -5, 0] }}
                  transition={{ duration: 6, repeat: Infinity }}
                >
                  <Code2 className="w-6 h-6 text-[#0f141f]" />
                </motion.div>
                <div>
                  <h1 className="text-2xl text-[#e2e8f0] font-['DM_Sans'] font-medium flex items-center gap-2">
                    AI Pair Programming
                    <Sparkles className="w-5 h-5 text-[#ffa94d]" />
                  </h1>
                  <p className="text-[#8b9bb4] text-sm font-['DM_Sans']">
                    Learn by doing • Voice-controlled teaching • Real-time collaboration
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Skeleton view toggle */}
                <motion.button
                  onClick={() => { stopSpeaking(); setShowSkeleton(s => !s); }}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className="px-3 py-2 rounded-full flex items-center gap-2 transition-all"
                  style={{
                    background: showSkeleton ? 'rgba(255,169,77,0.15)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${showSkeleton ? 'rgba(255,169,77,0.5)' : 'rgba(255,255,255,0.12)'}`,
                  }}
                >
                  <Layers className="w-3.5 h-3.5" style={{ color: showSkeleton ? '#ffa94d' : '#8b9bb4' }} />
                  <span className="text-xs font-['DM_Sans']" style={{ color: showSkeleton ? '#ffa94d' : '#8b9bb4' }}>
                    {showSkeleton ? 'Skeleton ON' : 'Skeleton'}
                  </span>
                </motion.button>

                {/* Quit button */}
                <motion.button
                  onClick={handleQuit}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className="px-4 py-2 bg-[#22d3ee]/10 border border-[#22d3ee]/30 rounded-full transition-all hover:bg-[#22d3ee]/20 hover:border-[#22d3ee]/60"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                >
                  <span className="text-[#22d3ee] text-sm font-['DM_Sans'] font-medium">
                    ← Quit
                  </span>
                </motion.button>
              </div>
            </div>
          </motion.header>

          {/* ── Main columns ── */}
          <div className="flex-1 overflow-hidden p-6 grid grid-cols-2 gap-6">

            {/* Left: Code Editor */}
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="relative overflow-hidden"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-[#ff9d3d]/20 to-[#ffa94d]/20 rounded-lg blur-xl pointer-events-none" />
              <div className="relative h-full">
                <CodeEditor
                  lines={showSkeleton ? [] : codeLines}
                  isTyping={showSkeleton ? false : isTyping}
                  editable={showSkeleton}
                  onLineComplete={handleLineComplete}
                  highlightedLine={highlightedLine}
                  onCodeChange={(code) => { skeletonCodeRef.current = code; }}
                  onChallengeChange={(title, description) => { skeletonChallengeRef.current = { title, description }; }}
                />
              </div>
            </motion.div>

            {/* Right: AI Teaching Panel */}
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="relative overflow-hidden"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-[#22d3ee]/20 to-[#4ade80]/20 rounded-lg blur-xl pointer-events-none" />
              <div className="relative h-full">
                <AITeachingPanel
                  messages={showSkeleton ? skeletonMessages : messages}
                  isVoiceActive={isVoiceActive}
                  isSpeaking={isSpeaking || ttsIsSpeaking}
                  isThinking={isThinking}
                  isMuted={isMuted}
                  onToggleMute={toggleMute}
                  onSendMessage={showSkeleton ? handleSkeletonSendMessage : handleSendMessage}
                  onLineClick={setHighlightedLine}
                />
              </div>
            </motion.div>

          </div>

          {/* Decorative blobs */}
          <div className="fixed top-20 left-20 w-64 h-64 bg-[#ff9d3d]/5 rounded-full blur-3xl pointer-events-none" />
          <div className="fixed bottom-20 right-20 w-96 h-96 bg-[#22d3ee]/5 rounded-full blur-3xl pointer-events-none" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
