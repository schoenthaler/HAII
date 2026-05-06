import { useState, useCallback, useEffect } from 'react';
import { motion } from 'motion/react';
import { CodeEditor, CodeLine } from './components/CodeEditor';
import { AITeachingPanel } from './components/AITeachingPanel';
import { Code2, Sparkles } from 'lucide-react';

interface Message {
  type: 'ai' | 'user';
  content: string;
  timestamp: string;
  badge?: 'error' | 'optimize' | 'warning' | 'teach';
  lineNumbers?: number[]; // clickable line refs shown in the chat bubble
}

// ─── Code script ──────────────────────────────────────────────────────────────

const codeLines: CodeLine[] = [
  {
    number: 1,
    content: 'def find_duplicates(nums):',
    annotationType: 'teach',
    annotation: 'Define a function that finds all duplicate values in a list.',
  },
  {
    number: 2,
    content: '    result = []',
    annotationType: 'optimize',
    annotation: 'List membership check is O(n). A set() would give O(1) lookups.',
  },
  {
    number: 3,
    content: '    for i in range(len(nums)):',
    annotationType: 'optimize',
    annotation: '"for num in nums" is more Pythonic — avoids range(len()) boilerplate.',
  },
  {
    number: 4,
    content: '        for j in range(len(nums)):',
    annotationType: 'error',
    annotation: 'Bug: j starts at 0, so when i == j the element compares with itself!',
  },
  {
    number: 5,
    content: '            if nums[i] == nums[j]:',
    annotationType: 'error',
    annotation: 'When i == j this is always True — every element "matches" itself.',
  },
  {
    number: 6,
    content: '                result.append(nums[i])',
  },
  {
    number: 7,
    content: '    return list(set(result))',
    annotationType: 'teach',
    annotation: 'set() removes duplicates from the result, then list() converts it back.',
  },
  { number: 8, content: '' },
  {
    number: 9,
    content: 'def count_words(text):',
    annotationType: 'teach',
    annotation: 'A new function — counts how often each word appears in a string.',
  },
  {
    number: 10,
    content: '    words = text.split(" ")',
    annotationType: 'warning',
    annotation: 'split(" ") breaks on single spaces only. Use split() to handle tabs & runs.',
  },
  {
    number: 11,
    content: '    word_count = {}',
    annotationType: 'optimize',
    annotation: 'collections.Counter(words) does all of the below in one line.',
  },
  { number: 12, content: '    for word in words:' },
  { number: 13, content: '        if word in word_count:' },
  {
    number: 14,
    content: '            word_count[word] = word_count[word] + 1',
    annotationType: 'optimize',
    annotation: 'Simplify: word_count[word] += 1  (or use word_count.get(word, 0) + 1)',
  },
  { number: 15, content: '        else:' },
  { number: 16, content: '            word_count[word] = 1' },
  {
    number: 17,
    content: '    return word_count',
    annotationType: 'teach',
    annotation: 'Returns a dict mapping every unique word to its frequency.',
  },
  { number: 18, content: '' },
  { number: 19, content: 'text = "hello world hello python"' },
  { number: 20, content: 'result = count_words(text)' },
  { number: 21, content: 'print(result)' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function now() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [isListening, setIsListening] = useState(true);  // button always ON
  const [isSpeaking, setIsSpeaking]   = useState(false);
  const [isThinking, setIsThinking]   = useState(false);
  const [isTyping, setIsTyping]       = useState(true);
  const [isVoiceActive, setIsVoiceActive] = useState(false); // true only while voice is being heard
  const [highlightedLine, setHighlightedLine] = useState<number | null>(null);

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
        "Hi! I'm your AI Pilot. We're writing two Python utility functions today — I'll flag errors 🐛, performance tips ⚡, and potential warnings ⚠️ as we go. Let's dive in!",
      timestamp: '10:30 AM',
    },
  ]);

  function addAI(content: string, badge?: Message['badge'], lineNumbers?: number[]) {
    setMessages((m) => [...m, { type: 'ai', content, timestamp: now(), badge, lineNumbers }]);
  }

  // ── Line-complete callback from CodeEditor ────────────────────────────────
  const handleLineComplete = useCallback((lineIdx: number) => {
    // Simulate AI "speaking" briefly as it processes each completed line
    setIsSpeaking(true);
    setTimeout(() => setIsSpeaking(false), 1100);

    // Teaching messages keyed by line index (0-based array index)
    const triggers: Record<number, () => void> = {
      0: () => setTimeout(() => addAI('We start with `def` — Python\'s keyword for defining a function. The name `find_duplicates` describes exactly what it does. Always name functions by what they return or do.', 'teach', [1]), 500),
      1: () => setTimeout(() => addAI('⚡ Optimization spotted: using a plain list for `result` means every `in` check scans the whole list — that\'s O(n) per check. A `set()` would cut that to O(1).', 'optimize', [2]), 500),
      2: () => setTimeout(() => addAI('⚡ Another tip: `for i in range(len(nums))` is C-style thinking in Python. The Pythonic way is `for num in nums` — cleaner and marginally faster.', 'optimize', [3]), 500),
      3: () => setTimeout(() => addAI('🐛 ERROR detected! The inner loop starts `j` at 0 — the same index as `i`. That means when `i == j`, we\'re comparing an element with itself, which always matches!', 'error', [4]), 500),
      4: () => {
        setTimeout(() => addAI('🐛 This condition makes it worse — `nums[i] == nums[j]` is trivially True whenever `i == j`. Fix: change the inner loop to `range(i + 1, len(nums))`.', 'error', [4, 5]), 500);
        // Voice demo: triggers ~1s after this line finishes typing
        setTimeout(() => {
          setIsVoiceActive(true);   // activate wave animation
          setIsTyping(false);
          setMessages(msgs => [...msgs, { type: 'user', content: 'Wait — so j needs to start at i + 1 to avoid comparing the element to itself?', timestamp: now() }]);
          setIsThinking(true);
          setTimeout(() => {
            setIsThinking(false);
            addAI('Exactly right! Starting j at i+1 solves two problems at once:\n\n1. No self-comparison (i ≠ j always)\n2. Each pair [i, j] is checked once instead of twice\n\nThis changes the complexity from O(n²) full scans to O(n²/2) — still quadratic, but half the work. Combined with using a set for `result`, you\'re thinking like a performance-aware engineer 🚀', undefined, [4, 5]);
            setTimeout(() => { setIsVoiceActive(false); setIsTyping(true); }, 2000);
          }, 1600);
        }, 1200);
      },
      6:  () => setTimeout(() => addAI('`set(result)` removes duplicates before converting back to a list. It\'s a clean trick, though collecting into a set from the start is even better.', 'teach', [7]), 500),
      8:  () => setTimeout(() => addAI('Now we\'re writing `count_words` — a word-frequency counter. This is a very common interview pattern. Watch how we\'ll spot a few issues as we type.', 'teach', [9]), 500),
      9:  () => setTimeout(() => addAI('⚠️ Warning: `text.split(" ")` only splits on a single space. Double spaces, tabs, or newlines will produce empty-string tokens. Use `text.split()` (no argument) instead.', 'warning', [10]), 500),
      10: () => setTimeout(() => addAI('⚡ The whole dictionary loop below can be replaced with one import: `from collections import Counter` then `return Counter(words)`. Same result, zero boilerplate.', 'optimize', [11]), 500),
      13: () => setTimeout(() => addAI('⚡ Small but worth knowing: `word_count[word] = word_count[word] + 1` should be `word_count[word] += 1`. Even better — use `.get(word, 0) + 1` to avoid the `else` branch entirely.', 'optimize', [14]), 500),
      16: () => setTimeout(() => addAI('Function done ✅. It returns a `dict` mapping each word → its count. We\'ll call it with a test string on the next two lines.', 'teach', [17]), 500),
    };

    triggers[lineIdx]?.();
  }, []);

  // ── User text input ──────────────────────────────────────────────────────────
  const handleSendMessage = (message: string) => {
    setMessages((m) => [...m, { type: 'user', content: message, timestamp: now() }]);
    setIsThinking(true);
    setTimeout(() => {
      setIsThinking(false);
      addAI(
        "Great question! In Python, readability and performance often go hand in hand. The Pythonic way is usually also the more efficient one — using built-ins, comprehensions, and the standard library rather than reimplementing logic from scratch.",
        'teach'
      );
    }, 1400);
  };

  return (
    <div
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
          <motion.div
            className="px-4 py-2 bg-[#22d3ee]/10 border border-[#22d3ee]/30 rounded-full"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <span className="text-[#22d3ee] text-sm font-['DM_Sans'] font-medium">
              ✨ Demo Mode
            </span>
          </motion.div>
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
              lines={codeLines}
              isTyping={isTyping}
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
              messages={messages}
              isListening={isListening}
              isVoiceActive={isVoiceActive}
              isSpeaking={isSpeaking}
              isThinking={isThinking}
              onToggleListening={() => setIsListening(!isListening)}
              onSendMessage={handleSendMessage}
              onLineClick={setHighlightedLine}
            />
          </div>
        </motion.div>

      </div>

      {/* Decorative blobs */}
      <div className="fixed top-20 left-20 w-64 h-64 bg-[#ff9d3d]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-20 right-20 w-96 h-96 bg-[#22d3ee]/5 rounded-full blur-3xl pointer-events-none" />
    </div>
  );
}