import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';

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

// ─── Main component ───────────────────────────────────────────────────────────

type TypingPhase = 'typing' | 'line_done' | 'all_done';

export function CodeEditor({ lines, isTyping, onLineComplete, highlightedLine }: CodeEditorProps) {
  // ── Typing engine state ──────────────────────────────────────────────────────
  const [lineIdx,  setLineIdx]  = useState(0);
  const [charIdx,  setCharIdx]  = useState(0);
  const [phase,    setPhase]    = useState<TypingPhase>('typing');
  // Lines whose annotations are now visible (set slightly after line completes)
  const [annotationVisible, setAnnotationVisible] = useState(new Set<number>());

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

  // ── Derived display data ─────────────────────────────────────────────────────
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

      {/* ── Code scroll area ── */}
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