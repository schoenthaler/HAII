import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CodeEditor, CodeLine } from './components/CodeEditor';
import { AITeachingPanel } from './components/AITeachingPanel';
import { WelcomePage } from './components/WelcomePage';
import { useAIChat } from './components/useAIChat';
import { Code2, Sparkles, Layers } from 'lucide-react';

interface Message {
  type: 'ai' | 'user';
  content: string;
  timestamp: string;
  badge?: 'error' | 'optimize' | 'warning' | 'teach';
  lineNumbers?: number[];
}

// ─── Code script ──────────────────────────────────────────────────────────────

// ─── Scenario 1: Student Grade Analyzer ──────────────────────────────────────
// Bugs: division-by-zero on empty list (L5), IndexError on empty list (L6),
//       off-by-one in grade boundaries (L13, L15, L17, L19)
// Optimizations: augmented assignment (L4), built-in max() (L9)
// Teaching: tuple return (L10), early-return pattern (L21), unpacking (L24)

const codeLines: CodeLine[] = [
  {
    number: 1, content: 'def get_class_stats(scores):',
    annotationType: 'teach',
    annotation: 'We\'re defining a function — a reusable block of code. `scores` is the input it expects. The name is descriptive (`scores`, not `x`) — that matters when you\'re reading your own code weeks later.',
  },
  { number: 2, content: '    total = 0' },
  { number: 3, content: '    for score in scores:' },
  {
    number: 4, content: '        total = total + score',
    annotationType: 'optimize',
    annotation: 'This works, but there\'s a shorter form that means exactly the same thing: `total += score`. You\'ll see `+=` everywhere in Python — it just means "add this to the existing value and save it."',
  },
  {
    number: 5, content: '    average = total / len(scores)',
    annotationType: 'error',
    annotation: '🐛 This will crash if `scores` is empty. `len([])` is 0, and dividing by zero raises a ZeroDivisionError. The fix: add a guard at the top — `if not scores: return 0, 0`. Always ask: what\'s the smallest possible input?',
  },
  {
    number: 6, content: '    highest = scores[0]',
    annotationType: 'error',
    annotation: '🐛 Same empty-list problem — `scores[0]` crashes with IndexError if the list has nothing in it. Also: Python already has `max(scores)` built-in. That entire loop below? One word replaces it.',
  },
  { number: 7, content: '    for score in scores:' },
  { number: 8, content: '        if score > highest:' },
  {
    number: 9, content: '            highest = score',
    annotationType: 'optimize',
    annotation: 'These three lines are just `max(scores)` written out by hand. Python has built-ins for the most common loops — max, min, sum. If you find yourself writing a loop to find "the biggest thing," there\'s almost always a one-liner.',
  },
  {
    number: 10, content: '    return average, highest',
    annotationType: 'teach',
    annotation: 'A function can return two values at once. Python wraps them as a pair (a "tuple"). The caller then unpacks them: `avg, top = get_class_stats(scores)`. This is cleaner than returning a list and then doing `result[0]`, `result[1]`.',
  },
  { number: 11, content: '' },
  {
    number: 12, content: 'def assign_grade(score):',
    annotationType: 'teach',
    annotation: 'Second function: takes a number, returns a letter. As you read each condition, ask yourself: what happens when the score is exactly 90? Exactly 80? The boundary values are where this code breaks.',
  },
  {
    number: 13, content: '    if score > 90:',
    annotationType: 'error',
    annotation: '🐛 `> 90` means "strictly greater than 90." A score of exactly 90 fails this check and falls to the next branch — earning a B instead of an A. The fix is `>= 90`. This is one of the most common bugs in any code that handles ranges or boundaries.',
  },
  { number: 14, content: '        return "A"' },
  {
    number: 15, content: '    elif score > 80:',
    annotationType: 'error',
    annotation: '🐛 Same issue: exactly 80 gets "C" not "B". This repeats in every branch below. Good habit: after writing grade logic like this, always test the exact boundaries — 90, 80, 70, 60 — not just obvious values like 85.',
  },
  { number: 16, content: '        return "B"' },
  { number: 17, content: '    elif score > 70:' },
  { number: 18, content: '        return "C"' },
  { number: 19, content: '    elif score > 60:' },
  { number: 20, content: '        return "D"' },
  {
    number: 21, content: '    return "F"',
    annotationType: 'teach',
    annotation: 'No `else` needed. Every branch above already exits the function immediately with `return`, so if code reaches this line, it must be below 60. Returning early in each branch keeps things flat — less nesting, easier to follow.',
  },
  { number: 22, content: '' },
  { number: 23, content: 'scores = [85, 92, 78, 90, 65]' },
  {
    number: 24, content: 'avg, top = get_class_stats(scores)',
    annotationType: 'teach',
    annotation: 'Unpacking in action — both return values land in named variables in one line. The alternative is `result = get_class_stats(scores)` then `result[0]` and `result[1]`, which is harder to read and easier to get wrong.',
  },
  { number: 25, content: 'print(f"Class average: {avg:.1f}")' },
  { number: 26, content: 'print(f"Top score: {top}  Grade: {assign_grade(top)}")' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function now() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [started, setStarted] = useState(false);
  const [isSpeaking, setIsSpeaking]   = useState(false);
  const [isThinking, setIsThinking]   = useState(false);
  const [isTyping, setIsTyping]       = useState(true);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [highlightedLine, setHighlightedLine] = useState<number | null>(null);
  const [showSkeleton, setShowSkeleton] = useState(false);

  const { sendMessage: sendToAI, resetHistory } = useAIChat();

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
        "Hey! I'm your AI coding partner. We're building a Student Grade Analyzer — two Python functions that compute class stats and assign letter grades. As we type, I'll point out bugs 🐛, suggest cleaner approaches ⚡, and explain the why behind each pattern 💡. Ask me anything as we go.",
      timestamp: '10:30 AM',
    },
  ]);

  // ── Skeleton mode has its own independent chat history ────────────────────
  const [skeletonMessages, setSkeletonMessages] = useState<Message[]>([]);

  function addAI(content: string, badge?: Message['badge'], lineNumbers?: number[]) {
    setMessages((m) => [...m, { type: 'ai', content, timestamp: now(), badge, lineNumbers }]);
  }

  // ── Line-complete callback from CodeEditor ────────────────────────────────
  const handleLineComplete = useCallback((lineIdx: number) => {
    setIsSpeaking(true);
    setTimeout(() => setIsSpeaking(false), 1100);

    // Triggers keyed by 0-based line index in codeLines
    const triggers: Record<number, () => void> = {
      // L1 — def get_class_stats
      0: () => setTimeout(() => addAI(
        '`def` is Python\'s keyword for defining a reusable function. The parameter `scores` is a placeholder — the function doesn\'t care what list it receives until it\'s called. That\'s what makes functions powerful.',
        'teach', [1]), 500),

      // L4 — total = total + score
      3: () => setTimeout(() => addAI(
        '`total = total + score` works, but there\'s a shorter form that means the same thing: `total += score`. You\'ll see `+=` constantly in Python — it just means "add to the existing value and save it."',
        'optimize', [4]), 500),

      // L5 — average = total / len(scores)
      4: () => setTimeout(() => addAI(
        '🐛 This line crashes if `scores` is an empty list. `len([])` is 0, and dividing by 0 raises a ZeroDivisionError. The function has no guard against that. Think: what\'s the smallest valid input to this function?',
        'error', [5]), 500),

      // L6 — highest = scores[0]
      5: () => setTimeout(() => addAI(
        '🐛 Same empty-list issue — `scores[0]` raises IndexError if the list is empty. But also: Python already has `max(scores)` built-in. That entire loop below? One word replaces it. Worth knowing before writing a loop: is there already a function for this?',
        'error', [6]), 500),

      // L9 — highest = score (end of manual loop)
      8: () => setTimeout(() => addAI(
        'Those three lines are `max(scores)` written by hand. `max()` is a built-in that does exactly this. Same goes for `min()` and `sum()`. If you\'re writing a loop to find "the biggest thing," there\'s almost always a one-liner — worth checking before writing the loop.',
        'optimize', [7, 8, 9]), 500),

      // L10 — return average, highest
      9: () => setTimeout(() => addAI(
        'A function can return two values at once — Python wraps them as a pair. The caller unpacks them: `avg, top = get_class_stats(scores)`. That\'s cleaner than storing the result and then accessing `result[0]` and `result[1]`.',
        'teach', [10]), 500),

      // L12 — def assign_grade
      11: () => setTimeout(() => addAI(
        'Second function — maps a number to a letter grade. Before reading the conditions, ask yourself: what should happen when someone passes in exactly 90? If you can answer that, you\'ll spot the bug as it appears.',
        'teach', [12]), 500),

      // L13 — if score > 90  →  voice interaction
      12: () => {
        setTimeout(() => addAI(
          '🐛 `> 90` means strictly greater-than — a score of exactly 90 fails this check and falls to the next branch, getting a "B" instead of an "A." This repeats on every boundary. The fix is `>=` (greater-than-or-equal). Does that make sense?',
          'error', [13]), 500);

        setTimeout(() => {
          setIsVoiceActive(true);
          setIsTyping(false);
          setMessages(msgs => [...msgs, {
            type: 'user',
            content: 'Hang on — so if my score was exactly 90, this code gives me a B? Why does > vs >= even make a difference?',
            timestamp: now(),
          }]);
          setIsThinking(true);
          setTimeout(() => {
            setIsThinking(false);
            addAI(
              'Right — `>` is "strictly greater than," so 90 doesn\'t qualify. Changing to `>=` includes the boundary itself.\n\nThis kind of bug shows up everywhere: grade cutoffs, age checks, price tiers, date ranges. The habit that catches it is testing the exact boundary value — not just 85 or 95, but 90 itself. If the boundary gives the wrong result, you\'ve got an off-by-one.',
              undefined, [13, 15, 17, 19]);
            setTimeout(() => { setIsVoiceActive(false); setIsTyping(true); }, 2000);
          }, 1700);
        }, 1200);
      },

      // L15 — elif score > 80
      14: () => setTimeout(() => addAI(
        '🐛 Same issue here — exactly 80 gets "C" instead of "B." This repeats in every branch. The key takeaway: always test the boundary values specifically, not just a score you know is clearly inside the range.',
        'error', [15]), 500),

      // L21 — return "F"
      20: () => setTimeout(() => addAI(
        'No `else` needed. Every branch above already exits the function immediately, so if Python reaches this line, the score must be below 60. This keeps the structure flat — one level of indentation instead of nested else blocks.',
        'teach', [21]), 500),

      // L24 — avg, top = get_class_stats(scores)
      23: () => setTimeout(() => addAI(
        'Unpacking — both return values land in named variables in one line. The alternative is storing the result and using `result[0]`, `result[1]` — which is harder to read and easy to get wrong if the order changes.',
        'teach', [24]), 500),

      // L26 — final print
      25: () => setTimeout(() => addAI(
        'That\'s the full program. Two categories of bug — empty-list crashes on lines 5 and 6, and off-by-one on every grade boundary. Try calling `get_class_stats([])` and see what error comes back. That\'s a useful thing to know how to read.',
        'teach', [5, 6]), 500),
    };

    triggers[lineIdx]?.();
  }, []);

  // ── User message → real AI response ─────────────────────────────────────────
  const handleSendMessage = useCallback(async (message: string) => {
    setMessages((m) => [...m, { type: 'user', content: message, timestamp: now() }]);
    setIsThinking(true);
    const reply = await sendToAI(message);
    setIsThinking(false);
    setMessages((m) => [...m, { type: 'ai', content: reply, timestamp: now(), badge: 'teach' }]);
  }, [sendToAI]);

  // ── Skeleton mode — also uses real AI ────────────────────────────────────────
  const handleSkeletonSendMessage = useCallback(async (message: string) => {
    setSkeletonMessages((m) => [...m, { type: 'user', content: message, timestamp: now() }]);
    setIsThinking(true);
    const reply = await sendToAI(message);
    setIsThinking(false);
    setSkeletonMessages((m) => [
      ...m,
      { type: 'ai', content: reply, timestamp: now(), badge: 'teach' },
    ]);
  }, [sendToAI]);

  // Reset AI history when returning to welcome screen
  const handleQuit = () => {
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
                  onClick={() => setShowSkeleton(s => !s)}
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
                  isSpeaking={isSpeaking}
                  isThinking={isThinking}
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
