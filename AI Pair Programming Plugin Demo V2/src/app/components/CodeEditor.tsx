import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ChevronUp, BookOpen, CheckCircle2, XCircle, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AnnotationType = 'teach' | 'error' | 'optimize' | 'warning';

export interface CodeLine {
  number: number;
  content: string;
  annotation?: string;
  annotationType?: AnnotationType;
}

interface CodeEditorProps {
  lines: CodeLine[];
  isTyping: boolean;           // false = pause typing (e.g. during AI voice demo)
  onLineComplete?: (lineIndex: number) => void;
  highlightedLine?: number | null; // line number to scroll to + highlight
  editable?: boolean;          // true = let user type freely
}

// ─── Annotation config ────────────────────────────────────────────────────────

const ANNOTATION_CONFIG: Record<
  AnnotationType,
  { icon: string; label: string; color: string; lineBg: string; badgeBg: string; border: string }
> = {
  teach:    { icon: '💡', label: 'HINT',     color: '#ffa94d', lineBg: 'rgba(255,169,77,0.05)',  badgeBg: 'rgba(255,169,77,0.12)',  border: 'rgba(255,169,77,0.35)'  },
  error:    { icon: '🐛', label: 'ERROR',    color: '#f87171', lineBg: 'rgba(248,113,113,0.07)', badgeBg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.40)' },
  optimize: { icon: '⚡', label: 'OPTIMIZE', color: '#22d3ee', lineBg: 'rgba(34,211,238,0.05)',  badgeBg: 'rgba(34,211,238,0.12)',  border: 'rgba(34,211,238,0.35)'  },
  warning:  { icon: '⚠️', label: 'WARNING',  color: '#fbbf24', lineBg: 'rgba(251,191,36,0.06)',  badgeBg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.35)'  },
};

// ─── Python syntax tokenizer ──────────────────────────────────────────────────

type Token = { text: string; color: string };
const KEYWORDS = new Set(['def','for','if','else','elif','return','in','not','and','or','import','from','class','pass','break','continue','while','True','False','None','with','as','try','except','finally','raise','yield','lambda','global','nonlocal']);
const BUILTINS = new Set(['list','set','dict','tuple','str','int','float','bool','len','range','print','enumerate','zip','map','filter','sorted','sum','min','max','type','isinstance','Counter','collections']);
const C = { keyword:'#c792ea', builtin:'#89ddff', string:'#c3e88d', number:'#f78c6c', comment:'#546e7a', fn:'#82aaff', op:'#89ddff', punct:'#8b9bb4', default:'#e2e8f0' };

function tokenize(code: string): Token[] {
  if (!code) return [{ text: '', color: C.default }];
  const out: Token[] = [];
  let i = 0;
  function push(text: string, color: string) {
    const last = out[out.length - 1];
    if (last && last.color === color && color === C.default) last.text += text;
    else out.push({ text, color });
  }
  while (i < code.length) {
    if (code[i] === '#') { out.push({ text: code.slice(i), color: C.comment }); break; }
    if ((code[i]==='f'||code[i]==='F') && i+1<code.length && (code[i+1]==='"'||code[i+1]==="'")) {
      const q=code[i+1]; let j=i+2;
      while (j<code.length&&code[j]!==q){if(code[j]==='\\')j++;j++;}
      out.push({text:code.slice(i,Math.min(j+1,code.length)),color:C.string}); i=Math.min(j+1,code.length); continue;
    }
    if (code[i]==='"'||code[i]==="'") {
      const q=code[i]; let j=i+1;
      while(j<code.length&&code[j]!==q){if(code[j]==='\\')j++;j++;}
      out.push({text:code.slice(i,Math.min(j+1,code.length)),color:C.string}); i=Math.min(j+1,code.length); continue;
    }
    if (/\d/.test(code[i])) {
      let j=i; while(j<code.length&&/[\d.]/.test(code[j]))j++;
      out.push({text:code.slice(i,j),color:C.number}); i=j; continue;
    }
    if (/[a-zA-Z_]/.test(code[i])) {
      let j=i; while(j<code.length&&/[a-zA-Z0-9_]/.test(code[j]))j++;
      const word=code.slice(i,j); let k=j; while(k<code.length&&code[k]===' ')k++;
      const color=KEYWORDS.has(word)?C.keyword:BUILTINS.has(word)?C.builtin:code[k]==='('?C.fn:C.default;
      out.push({text:word,color}); i=j; continue;
    }
    if (/[+\-*/%=<>!&|^~]/.test(code[i])) {
      let j=i; while(j<code.length&&/[+\-*/%=<>!&|^~]/.test(code[j]))j++;
      out.push({text:code.slice(i,j),color:C.op}); i=j; continue;
    }
    if (/[()[\]{},.:;]/.test(code[i])) { out.push({text:code[i],color:C.punct}); i++; continue; }
    push(code[i], C.default); i++;
  }
  return out;
}

// ─── Tooltip portal ───────────────────────────────────────────────────────────

interface TooltipState { lineNumber: number; rect: DOMRect }

function AnnotationTooltip({ state, line, onMouseEnter, onMouseLeave }: {
  state: TooltipState; line: CodeLine;
  onMouseEnter: () => void; onMouseLeave: () => void;
}) {
  const aType = line.annotationType ?? 'teach';
  const cfg   = ANNOTATION_CONFIG[aType];
  const TOOLTIP_W = 288;
  const spaceRight = window.innerWidth - state.rect.right;
  const placeLeft  = spaceRight < TOOLTIP_W + 26;
  const tooltipLeft = placeLeft ? state.rect.left - TOOLTIP_W - 10 : state.rect.right + 10;
  const tooltipTop  = state.rect.top + state.rect.height / 2;

  return createPortal(
    <motion.div
      key={state.lineNumber}
      initial={{ opacity:0, x: placeLeft ? 6 : -6, scale:0.97 }}
      animate={{ opacity:1, x:0, scale:1 }}
      exit={{   opacity:0, x: placeLeft ? 6 : -6, scale:0.97 }}
      transition={{ duration:0.14, ease:'easeOut' }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ position:'fixed', top:tooltipTop, left:tooltipLeft, transform:'translateY(-50%)', width:TOOLTIP_W, zIndex:99999, pointerEvents:'auto' }}
    >
      {/* Arrow */}
      <div style={{ position:'absolute', top:'50%', [placeLeft?'right':'left']:-8, transform:'translateY(-50%)', width:0, height:0, borderTop:'7px solid transparent', borderBottom:'7px solid transparent', ...(placeLeft ? {borderLeft:`8px solid ${cfg.border}`} : {borderRight:`8px solid ${cfg.border}`}) }} />
      {/* Card */}
      <div className="rounded-lg overflow-hidden shadow-2xl" style={{ background:'linear-gradient(135deg,#1a1f2e 0%,#151a28 100%)', border:`1px solid ${cfg.border}`, boxShadow:`0 8px 32px rgba(0,0,0,0.5),0 0 0 1px ${cfg.border}` }}>
        <div className="flex items-center gap-2 px-3 py-2" style={{ background:cfg.badgeBg, borderBottom:`1px solid ${cfg.border}` }}>
          <span className="text-sm">{cfg.icon}</span>
          <span className="text-[11px] font-['DM_Sans'] font-bold tracking-wider" style={{ color:cfg.color }}>{cfg.label}</span>
          <span className="ml-auto text-[10px] font-['DM_Sans'] opacity-60" style={{ color:cfg.color }}>Line {line.number}</span>
        </div>
        <div className="px-3 py-2.5">
          <p className="text-[12px] font-['DM_Sans'] leading-relaxed" style={{ color:'#c8d3e8' }}>{line.annotation}</p>
        </div>
      </div>
    </motion.div>,
    document.body
  );
}

// ─── Coding challenge data ─────────────────────────────────────────────────────

type ChallengeCategory = 'function' | 'list' | 'string' | 'loop' | 'dict';

interface CodingChallenge {
  id: number;
  category: ChallengeCategory;
  title: string;
  description: string;
  example?: string;
  hint: string;
  starter: string;
  check: (code: string) => { pass: boolean; feedback: string };
}

const CODING_CHALLENGES: CodingChallenge[] = [
  {
    id: 1,
    category: 'function',
    title: 'Say Hello',
    description: 'Write a function greet(name) that returns the string "Hello, {name}!".',
    example: 'greet("Alice")  →  "Hello, Alice!"',
    hint: 'Use an f-string: return f"Hello, {name}!"',
    starter: 'def greet(name):\n    # write your code here\n    pass',
    check: (code) => {
      if (!/def\s+greet\s*\(/.test(code))
        return { pass: false, feedback: 'Define a function called greet(name).' };
      if (!/return/.test(code))
        return { pass: false, feedback: 'Use return to send back the greeting.' };
      if (!(/f['"]/.test(code) || /['"]Hello/.test(code)))
        return { pass: false, feedback: 'The return value should be a string containing the name.' };
      return { pass: true, feedback: 'f-strings (f"...{var}...") are the modern Pythonic way to embed values in strings.' };
    },
  },
  {
    id: 2,
    category: 'list',
    title: 'Even Numbers',
    description: 'Use a list comprehension to build a list of all even numbers from 1 to 20. Store it in a variable called evens.',
    example: 'evens  →  [2, 4, 6, 8, ..., 20]',
    hint: '[x for x in range(1, 21) if x % 2 == 0]',
    starter: '# build the list in one line\nevens = ',
    check: (code) => {
      if (!/evens\s*=/.test(code))
        return { pass: false, feedback: 'Store your result in a variable called evens.' };
      if (!/\[.*for.*in.*\]/.test(code))
        return { pass: false, feedback: 'Use a list comprehension: [x for x in range(...) if ...]' };
      if (!/%\s*2/.test(code))
        return { pass: false, feedback: 'Filter even numbers with: if x % 2 == 0' };
      return { pass: true, feedback: 'List comprehensions are faster than a plain for-loop and read like plain English.' };
    },
  },
  {
    id: 3,
    category: 'string',
    title: 'Reverse a String',
    description: 'Write a function reverse_str(s) that returns the string in reverse order.',
    example: 'reverse_str("hello")  →  "olleh"',
    hint: 'Python slicing trick: s[::-1] walks the string backwards.',
    starter: 'def reverse_str(s):\n    # write your code here\n    pass',
    check: (code) => {
      if (!/def\s+reverse_str\s*\(/.test(code))
        return { pass: false, feedback: 'Define a function called reverse_str(s).' };
      if (!/return/.test(code))
        return { pass: false, feedback: 'Return the reversed string!' };
      if (!(/\[::-1\]/.test(code) || /reversed\(/.test(code)))
        return { pass: false, feedback: 'Try slicing: return s[::-1]' };
      return { pass: true, feedback: 's[::-1] means "slice from start to end, step −1" — the most Pythonic reversal trick.' };
    },
  },
  {
    id: 4,
    category: 'loop',
    title: 'FizzBuzz',
    description: 'Print numbers 1–15. For multiples of 3 print "Fizz", multiples of 5 print "Buzz", multiples of both print "FizzBuzz".',
    example: '1, 2, Fizz, 4, Buzz, Fizz ...',
    hint: 'Check FizzBuzz first (% 15 == 0), then Fizz, then Buzz.',
    starter: 'for i in range(1, 16):\n    # add your conditions\n    pass',
    check: (code) => {
      if (!/for\s+\w+\s+in\s+range/.test(code))
        return { pass: false, feedback: 'Use a for loop: for i in range(1, 16).' };
      if (!/%\s*3/.test(code) || !/%\s*5/.test(code))
        return { pass: false, feedback: 'Use % 3 and % 5 to check divisibility.' };
      if (!/Fizz/.test(code) || !/Buzz/.test(code))
        return { pass: false, feedback: 'Make sure to print both "Fizz" and "Buzz".' };
      return { pass: true, feedback: 'Order matters! Always check FizzBuzz before Fizz/Buzz, or multiples of 15 get the wrong label.' };
    },
  },
  {
    id: 5,
    category: 'dict',
    title: 'Count Characters',
    description: 'Write a function char_count(s) that returns a dict with the frequency of each character.',
    example: 'char_count("hello")\n→ {"h":1,"e":1,"l":2,"o":1}',
    hint: 'Use counts.get(ch, 0) + 1 to safely increment without a KeyError.',
    starter: 'def char_count(s):\n    counts = {}\n    for ch in s:\n        # update counts here\n        pass\n    return counts',
    check: (code) => {
      if (!/def\s+char_count\s*\(/.test(code))
        return { pass: false, feedback: 'Define a function called char_count(s).' };
      if (!/for\s+\w+\s+in/.test(code) && !/Counter/.test(code))
        return { pass: false, feedback: 'Loop over each character with: for ch in s.' };
      if (!(/\+=/.test(code) || /Counter/.test(code) || /\.get\(/.test(code)))
        return { pass: false, feedback: 'Increment the count: counts[ch] = counts.get(ch, 0) + 1' };
      if (!/return/.test(code))
        return { pass: false, feedback: 'Return the counts dict at the end.' };
      return { pass: true, feedback: 'dict.get(key, 0) avoids KeyError. For even cleaner code, try: from collections import Counter.' };
    },
  },
];

const CHALLENGE_CATEGORY_CFG: Record<ChallengeCategory, { label: string; color: string; bg: string }> = {
  function: { label: 'FUNCTION', color: '#82aaff', bg: 'rgba(130,170,255,0.1)' },
  list:     { label: 'LIST',     color: '#22d3ee', bg: 'rgba(34,211,238,0.1)'  },
  string:   { label: 'STRING',   color: '#c3e88d', bg: 'rgba(195,232,141,0.1)' },
  loop:     { label: 'LOOP',     color: '#ffa94d', bg: 'rgba(255,169,77,0.1)'  },
  dict:     { label: 'DICT',     color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
};

// ─── Quiz panel ───────────────────────────────────────────────────────────────

function QuizPanel({ currentCode, onLoadStarter }: { currentCode: string; onLoadStarter: (code: string) => void }) {
  const [open,      setOpen]      = useState(false);
  const [current,   setCurrent]   = useState(0);
  const [direction, setDirection] = useState(1);   // +1 = forward, -1 = backward
  const [result,    setResult]    = useState<{ pass: boolean; feedback: string } | null>(null);
  const [done,      setDone]      = useState(false);
  const [passed,    setPassed]    = useState(0);

  // Measure pill width once on mount, then auto-open
  const pillRef = useRef<HTMLDivElement>(null);
  const [pillW, setPillW] = useState(108);
  useEffect(() => {
    const measure = () => { if (pillRef.current) setPillW(pillRef.current.offsetWidth); };
    measure();
    document.fonts?.ready.then(measure);
    // Auto-open after the collapsed pill has been measured
    const t = setTimeout(() => setOpen(true), 60);
    return () => clearTimeout(t);
  }, []);

  // Load starter code whenever open state turns on (first challenge)
  useEffect(() => {
    if (open) onLoadStarter(CODING_CHALLENGES[current].starter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const challenge = CODING_CHALLENGES[current];
  const cfg       = CHALLENGE_CATEGORY_CFG[challenge.category];

  function checkCode() {
    const res = challenge.check(currentCode);
    setResult(res);
    if (res.pass) setPassed(p => p + 1);
  }

  function prev() {
    if (current > 0) {
      const newIdx = current - 1;
      setDirection(-1);
      setCurrent(newIdx);
      setResult(null);
      onLoadStarter(CODING_CHALLENGES[newIdx].starter);
    }
  }

  function next() {
    if (current < CODING_CHALLENGES.length - 1) {
      const newIdx = current + 1;
      setDirection(1);
      setCurrent(newIdx);
      setResult(null);
      onLoadStarter(CODING_CHALLENGES[newIdx].starter);
    } else {
      setDone(true);
    }
  }

  function reset() {
    setCurrent(0); setResult(null); setDone(false); setPassed(0);
    onLoadStarter(CODING_CHALLENGES[0].starter);
  }

  return (
    <div className="absolute z-20" style={{ top: 8, right: 8 }}>
      <motion.div
        animate={{ width: open ? 340 : pillW }}
        transition={{ type: 'spring', stiffness: 320, damping: 26, mass: 0.9 }}
        style={{
          overflow: 'hidden',
          borderRadius: 6,
          border: '1px solid rgba(167,139,250,0.4)',
          background: open ? 'rgba(12,16,26,0.97)' : 'transparent',
          backdropFilter: open ? 'blur(12px)' : 'none',
          boxShadow: open ? '0 8px 32px rgba(0,0,0,0.5)' : 'none',
          cursor: open ? 'default' : 'pointer',
          transformOrigin: 'right center',
        }}
        onClick={() => !open && setOpen(true)}
      >
        {/* ── Pill header ── */}
        <div ref={pillRef} className="flex items-center justify-between px-2.5 py-1"
          style={{ whiteSpace: 'nowrap', width: open ? '100%' : 'fit-content' }}>
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-3 h-3 text-[#a78bfa] flex-shrink-0" />
            <span className="text-[10px] font-['DM_Sans'] font-semibold text-[#a78bfa] tracking-wider">CODE QUIZ</span>
            {open && (
              <span className="px-1 py-0.5 rounded text-[8px] font-['DM_Sans'] font-bold"
                style={{ background: 'rgba(167,139,250,0.15)', color: '#a78bfa' }}>
                {current + 1}/{CODING_CHALLENGES.length}
              </span>
            )}
            {open && passed > 0 && (
              <span className="px-1 py-0.5 rounded text-[8px] font-['DM_Sans'] font-bold"
                style={{ background: 'rgba(34,211,238,0.12)', color: '#22d3ee' }}>
                ✓{passed}
              </span>
            )}
          </div>
          {open && (
            <button onClick={e => { e.stopPropagation(); setOpen(false); }}
              className="ml-2 flex-shrink-0 text-[#4a5a7a] hover:text-[#8b9bb4] transition-colors"
              style={{ lineHeight: 1, fontSize: 14 }}>×</button>
          )}
        </div>

        {/* ── Body ── */}
        <AnimatePresence>
          {open && (
            <motion.div key="body"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.16, delay: 0.1 } }}
              exit={{ opacity: 0, transition: { duration: 0 } }}
              className="px-2.5 pb-2.5"
              style={{ borderTop: '1px solid rgba(167,139,250,0.2)' }}
            >
              {done ? (
                /* ── Completion screen ── */
                <div className="flex flex-col items-center gap-2 py-3">
                  <div className="text-2xl">{passed >= 4 ? '🏆' : passed >= 2 ? '🎯' : '📚'}</div>
                  <p className="text-[#e2e8f0] text-[12px] font-['DM_Sans'] font-semibold">
                    {passed} / {CODING_CHALLENGES.length} passed
                  </p>
                  <p className="text-[#8b9bb4] text-[11px] font-['DM_Sans'] text-center leading-relaxed">
                    {passed >= 4 ? 'Excellent Python skills!' : passed >= 2 ? 'Good work — keep practicing.' : 'Review the hints and try again!'}
                  </p>
                  <button onClick={reset}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-['DM_Sans'] font-semibold hover:opacity-80 transition-opacity"
                    style={{ background: 'rgba(167,139,250,0.15)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.3)' }}>
                    <RotateCcw className="w-2.5 h-2.5" /> Start Over
                  </button>
                </div>
              ) : (
                /* ── Challenge screen ── */
                <>
                  {/* Sliding content area */}
                  <div style={{ overflow: 'hidden' }}>
                    <AnimatePresence mode="wait" custom={direction}>
                      <motion.div
                        key={current}
                        custom={direction}
                        variants={{
                          enter:  (d: number) => ({ x: d * 28, opacity: 0 }),
                          center: { x: 0, opacity: 1 },
                          exit:   (d: number) => ({ x: d * -28, opacity: 0 }),
                        }}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
                      >
                        {/* Category badge + title */}
                        <div className="mt-2 mb-2 flex items-center gap-1.5 flex-wrap">
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-['DM_Sans'] font-bold tracking-wider"
                            style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}44` }}>
                            {cfg.label}
                          </span>
                          <span className="text-[10px] font-['DM_Sans'] font-semibold" style={{ color: '#e2e8f0' }}>
                            {challenge.title}
                          </span>
                        </div>

                        {/* Description */}
                        <p className="text-[11px] font-['DM_Sans'] leading-relaxed mb-2" style={{ color: '#c8d3e8' }}>
                          {challenge.description}
                        </p>

                        {/* Example output */}
                        {challenge.example && (
                          <pre className="text-[10px] font-['Space_Mono'] rounded px-2.5 py-2 mb-2.5"
                            style={{ background: 'rgba(255,255,255,0.04)', color: '#89ddff', border: '1px solid rgba(255,255,255,0.07)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                            {challenge.example}
                          </pre>
                        )}

                        {/* Check button */}
                        {!result && (
                          <button onClick={checkCode}
                            className="w-full py-2 rounded text-[11px] font-['DM_Sans'] font-semibold hover:opacity-85 transition-opacity"
                            style={{ background: 'rgba(167,139,250,0.18)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.35)' }}>
                            ▶ Check My Code
                          </button>
                        )}

                        {/* Result feedback */}
                        <AnimatePresence>
                          {result && (
                            <motion.div key="result"
                              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                              transition={{ duration: 0.18 }}>
                              <div className="flex items-start gap-1.5 px-2 py-1.5 rounded mb-1.5"
                                style={{
                                  background: result.pass ? 'rgba(34,211,238,0.07)' : 'rgba(248,113,113,0.07)',
                                  border: `1px solid ${result.pass ? 'rgba(34,211,238,0.3)' : 'rgba(248,113,113,0.3)'}`,
                                }}>
                                {result.pass
                                  ? <CheckCircle2 className="w-3 h-3 flex-shrink-0 mt-px" style={{ color: '#22d3ee' }} />
                                  : <XCircle      className="w-3 h-3 flex-shrink-0 mt-px" style={{ color: '#f87171' }} />}
                                <p className="text-[9px] font-['DM_Sans'] leading-relaxed"
                                  style={{ color: result.pass ? '#22d3ee' : '#f87171' }}>
                                  {result.feedback}
                                </p>
                              </div>
                              {!result.pass && (
                                <button onClick={() => setResult(null)}
                                  className="w-full py-1 rounded text-[9px] font-['DM_Sans'] font-semibold hover:opacity-80 transition-opacity mb-1.5"
                                  style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.25)' }}>
                                  Try Again
                                </button>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* ── Prev / Next navigation — static, outside slide area ── */}
                  <div className="flex items-center gap-1.5 mt-2 pt-2" style={{ borderTop: '1px solid rgba(167,139,250,0.15)' }}>
                    <button
                      onClick={prev}
                      disabled={current === 0}
                      className="flex items-center gap-0.5 px-2 py-1 rounded text-[9px] font-['DM_Sans'] font-semibold transition-opacity hover:opacity-80 disabled:opacity-25 disabled:cursor-not-allowed"
                      style={{ background: 'rgba(167,139,250,0.1)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.25)' }}
                    >
                      <ChevronLeft className="w-3 h-3" /> Prev
                    </button>
                    <div className="flex-1 flex justify-center">
                      <span className="text-[9px] font-['DM_Sans']" style={{ color: '#4a5a7a' }}>
                        {current + 1} / {CODING_CHALLENGES.length}
                      </span>
                    </div>
                    <button
                      onClick={next}
                      disabled={current === CODING_CHALLENGES.length - 1 && !result?.pass}
                      className="flex items-center gap-0.5 px-2 py-1 rounded text-[9px] font-['DM_Sans'] font-semibold transition-opacity hover:opacity-80 disabled:opacity-25 disabled:cursor-not-allowed"
                      style={{ background: 'rgba(167,139,250,0.1)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.25)' }}
                    >
                      Next <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type TypingPhase = 'typing' | 'line_done' | 'all_done';

export function CodeEditor({ lines, isTyping, onLineComplete, highlightedLine, editable }: CodeEditorProps) {
  // ── Typing engine state ──────────────────────────────────────────────────────
  const [lineIdx,  setLineIdx]  = useState(0);
  const [charIdx,  setCharIdx]  = useState(0);
  const [phase,    setPhase]    = useState<TypingPhase>('typing');
  // Lines whose annotations are now visible (set slightly after line completes)
  const [annotationVisible, setAnnotationVisible] = useState(new Set<number>());

  // Editable mode state
  const [editableCode, setEditableCode] = useState('');

  // Stable ref for callback — avoids stale closures without adding it to dep arrays
  const onLineCompleteRef = useRef(onLineComplete);
  useEffect(() => { onLineCompleteRef.current = onLineComplete; }, [onLineComplete]);

  // Guard: only notify parent once per line
  const notifiedRef = useRef(new Set<number>());

  // ── Scroll ───────────────────────────────────────────────────────────────────
  const scrollRef   = useRef<HTMLDivElement>(null);
  const lastLineRef = useRef<HTMLDivElement>(null);
  // Map of line.number → DOM element, used for jump-to-line from chat
  const lineElRefs  = useRef<Map<number, HTMLDivElement>>(new Map());

  useEffect(() => {
    lastLineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [lineIdx]);

  // Scroll to highlighted line when it changes
  useEffect(() => {
    if (!highlightedLine) return;
    const el = lineElRefs.current.get(highlightedLine);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightedLine]);

  // ── Filter toggles ───────────────────────────────────────────────────────────
  const [activeFilters, setActiveFilters] = useState<Set<AnnotationType>>(
    new Set(['teach', 'error', 'optimize', 'warning'])
  );
  function toggleFilter(type: AnnotationType) {
    setActiveFilters(prev => {
      const next = new Set(prev);
      next.has(type) ? next.delete(type) : next.add(type);
      return next;
    });
  }

  // ── Tooltip ──────────────────────────────────────────────────────────────────
  const [tooltip,   setTooltip]   = useState<TooltipState | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showTooltip  = useCallback((lineNumber: number, el: HTMLElement) => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    setTooltip({ lineNumber, rect: el.getBoundingClientRect() });
  }, []);
  const scheduleHide = useCallback(() => {
    hideTimerRef.current = setTimeout(() => setTooltip(null), 120);
  }, []);
  const cancelHide = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  }, []);

  // Hide tooltip when its filter is toggled off
  useEffect(() => {
    if (!tooltip) return;
    const line = lines.find(l => l.number === tooltip.lineNumber);
    if (line?.annotation && !activeFilters.has(line.annotationType ?? 'teach')) setTooltip(null);
  }, [activeFilters, tooltip, lines]);

  // ── Core typing engine ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!isTyping || phase === 'all_done') return;

    const currentLine = lines[lineIdx];
    if (!currentLine) { setPhase('all_done'); return; }

    // ── TYPING phase: advance one character per tick ─────────────────────────
    if (phase === 'typing') {
      if (charIdx >= currentLine.content.length) {
        // Whole line typed out → transition to line_done
        setPhase('line_done');
        return;
      }
      // Variable delay for natural feel; slower on punctuation
      const char  = currentLine.content[charIdx] ?? '';
      const extra = ':()[]'.includes(char) ? 30 : 0;
      const delay = 38 + Math.random() * 22 + extra;

      const t = setTimeout(() => setCharIdx(c => c + 1), delay);
      return () => clearTimeout(t);
    }

    // ── LINE_DONE phase: notify parent, show annotation, then start next line ─
    if (phase === 'line_done') {
      // Notify parent exactly once
      if (!notifiedRef.current.has(lineIdx)) {
        notifiedRef.current.add(lineIdx);
        onLineCompleteRef.current?.(lineIdx);
      }

      // Show annotation with a short delay for visual polish
      const ta = setTimeout(() => {
        setAnnotationVisible(prev => new Set([...prev, lineIdx]));
      }, 180);

      // Advance to the next line after a brief pause
      const tNext = setTimeout(() => {
        if (lineIdx < lines.length - 1) {
          setLineIdx(l => l + 1);
          setCharIdx(0);
          setPhase('typing');
        } else {
          setPhase('all_done');
        }
      }, 480);

      return () => { clearTimeout(ta); clearTimeout(tNext); };
    }
  }, [isTyping, phase, lineIdx, charIdx, lines]);

  // ── Derived display data ──────��──────────────────────────────────────────────
  // Show all lines up to and including the current one.
  // Only the current line is partially rendered; completed ones show fully.
  const visibleLines = lines.slice(0, lineIdx + 1).map((line, idx) => {
    const isCurrent        = idx === lineIdx;
    const displayContent   = isCurrent ? line.content.slice(0, charIdx) : line.content;
    const hasAnnotation    = !!line.annotation && activeFilters.has(line.annotationType ?? 'teach');
    const showAnnotationDot = hasAnnotation && annotationVisible.has(idx); // dot + colour only after line fully typed
    const showTooltipable   = showAnnotationDot;
    return { line, displayContent, isCurrent, showAnnotationDot, showTooltipable };
  });

  const isCursorVisible = phase === 'typing' && isTyping;

  // Tooltip line data
  const tooltipLine = tooltip ? lines.find(l => l.number === tooltip.lineNumber) : null;
  const tooltipVisible =
    !!tooltip &&
    !!tooltipLine?.annotation &&
    annotationVisible.has(lines.indexOf(tooltipLine)) &&
    activeFilters.has(tooltipLine.annotationType ?? 'teach');

  // ── Render ───────────────────────────────────────────────────────────────────

  // ── EDITABLE MODE ────────────────────────────────────────────────────────────
  if (editable) {
    const rows = editableCode.split('\n');
    const lineCount = Math.max(rows.length, 20);

    return (
      <div
        style={{ position: 'absolute', inset: 0 }}
        className="bg-[#1a1f2e] rounded-lg border border-[#2a3f5f] overflow-hidden flex flex-col font-['Space_Mono']"
      >
        {/* Title bar */}
        <div className="bg-[#0f141f] px-4 py-2 border-b border-[#2a3f5f] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
            <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
            <span className="ml-3 text-[#8b9bb4] text-sm">main.py</span>
            {/* "editable" badge */}
            <span
              className="ml-2 px-2 py-0.5 rounded text-[10px] font-['DM_Sans'] font-semibold"
              style={{ background: 'rgba(255,169,77,0.12)', color: '#ffa94d', border: '1px solid rgba(255,169,77,0.3)' }}
            >
              ✏️ EDITABLE
            </span>
          </div>
          {/* dimmed filter badges */}
          <div className="flex items-center gap-2 opacity-25 pointer-events-none select-none">
            {(Object.entries(ANNOTATION_CONFIG) as [AnnotationType, typeof ANNOTATION_CONFIG[AnnotationType]][]).map(([type, cfg]) => (
              <div
                key={type}
                className="flex items-center gap-1.5 px-2 py-1 rounded"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <span className="text-[10px] font-['DM_Sans'] font-semibold" style={{ color: '#6b7a8d' }}>
                  {cfg.icon} {cfg.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quiz floating panel */}
        <div className="relative flex-1 overflow-hidden" style={{ minHeight: 0 }}>
          <QuizPanel currentCode={editableCode} onLoadStarter={setEditableCode} />

          {/* Editable area — padded top so quiz doesn't overlap first lines */}
          <div className="absolute inset-0 overflow-auto" style={{ paddingTop: 0 }}>
            <div className="flex" style={{ paddingTop: 16, paddingBottom: 80 }}>
              {/* Line numbers */}
              <div
                className="flex-shrink-0 select-none text-right"
                style={{ width: 52, paddingRight: 16, paddingLeft: 8 }}
              >
                {Array.from({ length: lineCount }, (_, i) => (
                  <div
                    key={i}
                    style={{
                      height: 24,
                      lineHeight: '24px',
                      fontSize: 13,
                      color: i < rows.length ? '#3d5280' : '#242e44',
                    }}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>

              {/* Textarea */}
              <textarea
                value={editableCode}
                onChange={e => setEditableCode(e.target.value)}
                spellCheck={false}
                autoFocus
                placeholder={'# Start coding here...\n'}
                style={{
                  flex: 1,
                  background: 'transparent',
                  color: '#e2e8f0',
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 13,
                  lineHeight: '24px',
                  caretColor: '#ff9d3d',
                  resize: 'none',
                  border: 'none',
                  outline: 'none',
                  height: `${lineCount * 24}px`,
                  paddingRight: 24,
                  tabSize: 4,
                }}
                onKeyDown={e => {
                  if (e.key === 'Tab') {
                    e.preventDefault();
                    const el = e.currentTarget;
                    const start = el.selectionStart;
                    const end   = el.selectionEnd;
                    const next  = editableCode.slice(0, start) + '    ' + editableCode.slice(end);
                    setEditableCode(next);
                    requestAnimationFrame(() => {
                      el.selectionStart = el.selectionEnd = start + 4;
                    });
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{ position:'absolute', inset:0 }}
      className="bg-[#1a1f2e] rounded-lg border border-[#2a3f5f] overflow-hidden flex flex-col font-['Space_Mono']"
    >
      {/* ── Title bar ── */}
      <div className="bg-[#0f141f] px-4 py-2 border-b border-[#2a3f5f] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
          <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
          <span className="ml-3 text-[#8b9bb4] text-sm">main.py</span>
        </div>
        {/* Filter toggles */}
        <div className="flex items-center gap-2">
          {(Object.entries(ANNOTATION_CONFIG) as [AnnotationType, typeof ANNOTATION_CONFIG[AnnotationType]][]).map(([type, cfg]) => {
            const active = activeFilters.has(type);
            return (
              <button
                key={type}
                onClick={() => toggleFilter(type)}
                className="flex items-center gap-1.5 px-2 py-1 rounded transition-all duration-150 cursor-pointer select-none"
                style={{ background: active ? cfg.badgeBg : 'rgba(255,255,255,0.03)', border:`1px solid ${active ? cfg.color+'55' : 'rgba(255,255,255,0.07)'}`, opacity: active ? 1 : 0.4 }}
              >
                <span className="flex items-center justify-center w-3.5 h-3.5 rounded-sm flex-shrink-0 transition-all duration-150"
                  style={{ background: active ? cfg.color : 'transparent', border:`1.5px solid ${active ? cfg.color : '#4a5568'}` }}>
                  {active && <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 4l2 2 4-4" stroke="#0f141f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </span>
                <span className="text-[10px] font-['DM_Sans'] font-semibold" style={{ color: active ? cfg.color : '#6b7a8d' }}>
                  {cfg.icon} {cfg.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Empty skeleton state ── */}
      {lines.length === 0 ? (
        <div className="flex-1 overflow-hidden py-4" style={{ minHeight: 0 }}>
          {/* Ghost lines — varying widths suggest real code structure */}
          {[
            { w: 0,   cursor: true  },
            { w: 52,  cursor: false },
            { w: 38,  cursor: false },
            { w: 68,  cursor: false },
            { w: 60,  cursor: false },
            { w: 28,  cursor: false },
            { w: 72,  cursor: false },
            { w: 0,   cursor: false },
            { w: 44,  cursor: false },
            { w: 58,  cursor: false },
            { w: 65,  cursor: false },
            { w: 35,  cursor: false },
            { w: 50,  cursor: false },
            { w: 42,  cursor: false },
            { w: 30,  cursor: false },
          ].map(({ w, cursor }, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04, duration: 0.25 }}
              className="flex items-center px-4 py-[4px]"
            >
              {/* gutter dot placeholder */}
              <div className="w-4 mr-1" />
              {/* line number */}
              <span className="select-none w-7 text-right flex-shrink-0 mr-4 text-sm" style={{ color: '#2d3f58' }}>
                {i + 1}
              </span>
              {cursor ? (
                /* blinking cursor on line 1 */
                <code className="text-sm leading-6">
                  <motion.span
                    className="inline-block w-[7px] h-[14px] bg-[#ff9d3d] align-text-bottom"
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.65, repeat: Infinity }}
                  />
                </code>
              ) : w > 0 ? (
                /* ghost bar */
                <motion.div
                  className="h-[10px] rounded-sm"
                  style={{
                    width: `${w}%`,
                    background: i % 3 === 0
                      ? 'rgba(255,255,255,0.045)'
                      : i % 3 === 1
                        ? 'rgba(255,255,255,0.03)'
                        : 'rgba(255,255,255,0.038)',
                  }}
                  animate={{ opacity: [0.6, 0.9, 0.6] }}
                  transition={{ duration: 3 + (i % 4) * 0.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.2 }}
                />
              ) : (
                /* empty line */
                <div className="h-[10px]" />
              )}
            </motion.div>
          ))}
        </div>
      ) : (
      /* ── Code scroll area ── */
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overflow-x-hidden"
        style={{ minHeight: 0 }}
      >
        <div className="py-4">
          {visibleLines.map(({ line, displayContent, isCurrent, showAnnotationDot, showTooltipable }, idx) => {
            const aType = line.annotationType ?? 'teach';
            const cfg   = ANNOTATION_CONFIG[aType];
            const isLastVisible = idx === visibleLines.length - 1;
            const isHighlighted = line.number === highlightedLine;

            return (
              <motion.div
                key={line.number}
                ref={(el) => {
                  if (isLastVisible && el) lastLineRef.current = el;
                  if (el) lineElRefs.current.set(line.number, el);
                  else lineElRefs.current.delete(line.number);
                }}
                initial={{ opacity:0, x:-6 }}
                animate={{ opacity:1, x:0 }}
                transition={{ duration:0.18 }}
                className="relative"
                style={{ background: showAnnotationDot ? cfg.lineBg : 'transparent' }}
                onMouseEnter={ showTooltipable ? (e) => showTooltip(line.number, e.currentTarget) : undefined }
                onMouseLeave={ showTooltipable ? scheduleHide : undefined }
              >
                {/* ── Highlight overlay (jump-to from chat) ── */}
                <AnimatePresence>
                  {isHighlighted && (
                    <motion.div
                      key="hl"
                      initial={{ opacity: 0, scaleX: 0.85 }}
                      animate={{ opacity: [0, 1, 0.85], scaleX: 1 }}
                      exit={{ opacity: 0, transition: { duration: 0.6 } }}
                      transition={{ duration: 0.25, times: [0, 0.3, 1] }}
                      style={{
                        position: 'absolute', inset: 0,
                        background: 'rgba(34,211,238,0.13)',
                        pointerEvents: 'none',
                        transformOrigin: 'left center',
                        zIndex: 2,
                      }}
                    />
                  )}
                </AnimatePresence>

                {/* Left gutter bar */}
                {(showAnnotationDot || isHighlighted) && (
                  <div
                    style={{
                      position: 'absolute', left: 0, top: 0, bottom: 0, width: isHighlighted ? 3 : 2,
                      background: isHighlighted ? '#22d3ee' : cfg.color,
                      opacity: isHighlighted ? 1 : 0.55,
                      borderRadius: '0 1px 1px 0',
                      boxShadow: isHighlighted ? '2px 0 10px rgba(34,211,238,0.55)' : undefined,
                      zIndex: 3,
                    }}
                  />
                )}

                <div className="flex items-center px-4 py-[3px]" style={{ position: 'relative', zIndex: 4 }}>
                  {/* Gutter: arrow indicator when highlighted, dot when annotated */}
                  <div className="w-4 flex items-center justify-center flex-shrink-0 mr-1">
                    <AnimatePresence mode="wait">
                      {isHighlighted ? (
                        <motion.span
                          key="arrow"
                          initial={{ opacity: 0, x: -4 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0 }}
                          className="text-[#22d3ee]"
                          style={{ fontSize: 10, lineHeight: 1 }}
                        >
                          ▶
                        </motion.span>
                      ) : showAnnotationDot ? (
                        <motion.div
                          key="dot"
                          initial={{ scale: 0 }} animate={{ scale: 1 }}
                          className="w-[7px] h-[7px] rounded-full"
                          style={{ background: cfg.color, boxShadow: `0 0 5px ${cfg.color}88` }}
                        />
                      ) : null}
                    </AnimatePresence>
                  </div>

                  {/* Line number */}
                  <span
                    className="select-none w-7 text-right flex-shrink-0 mr-4 text-sm"
                    style={{
                      color: isHighlighted ? '#22d3ee' : showAnnotationDot ? cfg.color : '#3d5280',
                      opacity: (isHighlighted || showAnnotationDot) ? 0.9 : 1,
                    }}
                  >
                    {line.number}
                  </span>

                  {/* Code */}
                  <code className="flex-1 text-sm leading-6 whitespace-pre">
                    {tokenize(displayContent).map((tok, ti) => (
                      <span key={ti} style={{ color:tok.color }}>{tok.text}</span>
                    ))}
                    {/* Blinking cursor — only on the line currently being typed */}
                    {isCurrent && isCursorVisible && (
                      <motion.span
                        className="inline-block w-[7px] h-[14px] bg-[#ff9d3d] ml-0.5 align-text-bottom"
                        animate={{ opacity:[1,0] }}
                        transition={{ duration:0.65, repeat:Infinity }}
                      />
                    )}
                  </code>

                  {/* Right-side type hint icon (shown once annotation is available) */}
                  {showTooltipable && (
                    <span className="ml-3 text-[11px] flex-shrink-0 opacity-40 hover:opacity-75 transition-opacity" title={cfg.label}>
                      {cfg.icon}
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
          <div className="h-24" />
        </div>
      </div>
      )}

      {/* ── Floating annotation tooltip (portal) ── */}
      <AnimatePresence>
        {tooltipVisible && tooltip && tooltipLine && (
          <AnnotationTooltip
            state={tooltip}
            line={tooltipLine}
            onMouseEnter={cancelHide}
            onMouseLeave={scheduleHide}
          />
        )}
      </AnimatePresence>
    </div>
  );
}