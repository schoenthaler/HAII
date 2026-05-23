import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Code2, Sparkles, Mic, Zap, BookOpen, ArrowRight, X } from 'lucide-react';

interface WelcomePageProps {
  onEnter: () => void;
}

// Floating code snippets
const CODE_SNIPPETS = [
  { text: 'def find_duplicates(nums):', x: '8%',  y: '18%', delay: 0 },
  { text: 'for i in range(len(nums)):', x: '72%', y: '12%', delay: 0.4 },
  { text: 'result = list(set(result))', x: '78%', y: '72%', delay: 0.8 },
  { text: 'from collections import Counter', x: '4%',  y: '74%', delay: 0.3 },
  { text: 'word_count[word] += 1',      x: '60%', y: '88%', delay: 0.6 },
  { text: 'return Counter(words)',       x: '14%', y: '88%', delay: 1.0 },
];

const FEATURES = [
  {
    icon: <BookOpen className="w-5 h-5" />,
    title: 'Learn, Don\'t Copy',
    desc: 'AI explains grammar, syntax & algorithms — you write the code.',
    color: '#ffa94d',
    bg: 'rgba(255,169,77,0.08)',
    border: 'rgba(255,169,77,0.2)',
  },
  {
    icon: <Mic className="w-5 h-5" />,
    title: 'Voice-Controlled',
    desc: 'Say "stop" to pause AI, speak naturally to redirect in real-time.',
    color: '#22d3ee',
    bg: 'rgba(34,211,238,0.08)',
    border: 'rgba(34,211,238,0.2)',
  },
  {
    icon: <Zap className="w-5 h-5" />,
    title: 'Live Pair Programming',
    desc: 'Inline annotations, line-jump links and real-time feedback as you type.',
    color: '#4ade80',
    bg: 'rgba(74,222,128,0.08)',
    border: 'rgba(74,222,128,0.2)',
  },
];

export function WelcomePage({ onEnter }: WelcomePageProps) {
  const [hovered, setHovered] = useState(false);
  const [typedText, setTypedText] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [shakeDisclaimer, setShakeDisclaimer] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const fullText = 'AI Pair Programming';

  // Typewriter for the heading
  useEffect(() => {
    let i = 0;
    const t = setInterval(() => {
      setTypedText(fullText.slice(0, i + 1));
      i++;
      if (i >= fullText.length) clearInterval(t);
    }, 60);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      style={{ position: 'fixed', inset: 0 }}
      className="bg-gradient-to-br from-[#0a0e1a] via-[#0f141f] to-[#1a1028] overflow-hidden flex flex-col items-center justify-center"
    >
      {/* ── Grid background ── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(34,211,238,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.04) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse 80% 70% at 50% 50%, black 40%, transparent 100%)',
        }}
      />

      {/* ── Floating code snippets ── */}
      {CODE_SNIPPETS.map((s, i) => (
        <motion.div
          key={i}
          style={{ position: 'absolute', left: s.x, top: s.y, color: '#22d3ee' }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: [0, 0.22, 0.22, 0], y: [8, 0, 0, -8] }}
          transition={{
            duration: 6,
            delay: s.delay + 1.2,
            repeat: Infinity,
            repeatDelay: 3,
            ease: 'easeInOut',
          }}
          className="font-['Space_Mono'] text-xs select-none pointer-events-none whitespace-nowrap"
        >
          {s.text}
        </motion.div>
      ))}

      {/* ── Glow blobs ── */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[120px] pointer-events-none"
           style={{ background: 'rgba(255,157,61,0.08)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-[120px] pointer-events-none"
           style={{ background: 'rgba(34,211,238,0.08)' }} />

      {/* ── Central content ── */}
      <div className="relative z-10 flex flex-col items-center text-center px-8 max-w-2xl w-full">

        {/* Icon */}
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.1 }}
          className="w-20 h-20 rounded-2xl flex items-center justify-center mb-8 shadow-2xl"
          style={{
            background: 'linear-gradient(135deg, #ff9d3d, #ffa94d)',
            boxShadow: '0 0 60px rgba(255,157,61,0.35)',
          }}
        >
          <Code2 className="w-10 h-10 text-[#0f141f]" />
        </motion.div>

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-2 px-4 py-1.5 rounded-full mb-6"
          style={{
            background: 'rgba(34,211,238,0.08)',
            border: '1px solid rgba(34,211,238,0.25)',
          }}
        >
          <Sparkles className="w-3.5 h-3.5 text-[#22d3ee]" />
          <span className="text-[#22d3ee] text-xs font-['DM_Sans'] font-medium tracking-widest uppercase">
            IDE AI Plugin — Demo
          </span>
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="text-6xl text-[#e2e8f0] font-['DM_Sans'] font-semibold leading-tight mb-4"
        >
          {typedText}
          <motion.span
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 0.9, repeat: Infinity }}
            style={{ color: '#ff9d3d' }}
          >
            {typedText.length < fullText.length ? '|' : ''}
          </motion.span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="text-[#8b9bb4] font-['DM_Sans'] mb-12 leading-relaxed"
          style={{ fontSize: 17 }}
        >
          Your AI pilot teaches you to code — not by writing it for you, but by
          guiding every line with real-time explanations, error detection and
          voice interaction.
        </motion.p>

        {/* Feature cards */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85 }}
          className="grid grid-cols-3 gap-4 w-full mb-12"
        >
          {FEATURES.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 + i * 0.1 }}
              className="rounded-xl p-4 text-left"
              style={{ background: f.bg, border: `1px solid ${f.border}` }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                style={{ background: `${f.color}18`, color: f.color }}
              >
                {f.icon}
              </div>
              <p className="text-[#e2e8f0] font-['DM_Sans'] font-medium text-sm mb-1">{f.title}</p>
              <p className="text-[#6b7a8d] font-['DM_Sans'] text-xs leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA Button */}
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.15 }}
          onClick={() => {
            if (!agreed) {
              setShakeDisclaimer(true);
              setTimeout(() => setShakeDisclaimer(false), 600);
              return;
            }
            onEnter();
          }}
          onMouseEnter={() => agreed && setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          whileHover={agreed ? { scale: 1.04 } : {}}
          whileTap={agreed ? { scale: 0.97 } : {}}
          className="relative flex items-center gap-3 px-10 py-4 rounded-2xl font-['DM_Sans'] font-semibold overflow-hidden"
          style={{
            background: agreed
              ? 'linear-gradient(135deg, #ff9d3d, #ffa94d)'
              : 'linear-gradient(135deg, #7a5a2e, #6b5025)',
            color: agreed ? '#0f141f' : '#4a3a1e',
            fontSize: 17,
            boxShadow: agreed && hovered
              ? '0 0 48px rgba(255,157,61,0.55), 0 8px 32px rgba(255,157,61,0.3)'
              : agreed
                ? '0 0 24px rgba(255,157,61,0.3)'
                : 'none',
            cursor: agreed ? 'pointer' : 'not-allowed',
            transition: 'background 0.3s ease, box-shadow 0.25s ease, color 0.3s ease',
          }}
        >
          {/* Shimmer overlay — only when active */}
          {agreed && (
            <motion.div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.18) 50%, transparent 65%)',
                backgroundSize: '200% 100%',
              }}
              animate={{ backgroundPositionX: hovered ? '0%' : '200%' }}
              transition={{ duration: 0.5 }}
            />
          )}
          <span className="relative z-10">Start Session</span>
          <motion.div
            className="relative z-10"
            animate={{ x: hovered && agreed ? 4 : 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <ArrowRight className="w-5 h-5" />
          </motion.div>
        </motion.button>

        {/* Disclaimer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3 }}
          className="mt-5 flex items-start gap-3 max-w-lg"
          style={{ cursor: 'pointer' }}
          onClick={() => setAgreed(a => !a)}
        >
          {/* Custom checkbox */}
          <div
            className="flex-shrink-0 mt-0.5 w-5 h-5 rounded flex items-center justify-center transition-all"
            style={{
              background: agreed ? 'rgba(34,211,238,0.2)' : 'transparent',
              border: `2px solid ${shakeDisclaimer ? '#ef4444' : agreed ? '#22d3ee' : '#3d5280'}`,
              transition: 'border-color 0.2s ease, background 0.2s ease',
            }}
          >
            <AnimatePresence>
              {agreed && (
                <motion.svg
                  key="check"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  width="11" height="8" viewBox="0 0 11 8" fill="none"
                >
                  <path d="M1 4L4 7L10 1" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </motion.svg>
              )}
            </AnimatePresence>
          </div>

          {/* Disclaimer text */}
          <motion.p
            animate={shakeDisclaimer ? { x: [0, -8, 8, -6, 6, -3, 3, 0] } : { x: 0 }}
            transition={{ duration: 0.5 }}
            className="text-xs font-['DM_Sans'] leading-relaxed select-none text-left"
            style={{
              color: shakeDisclaimer ? '#ef4444' : '#3d5280',
              transition: 'color 0.2s ease',
            }}
          >
            I acknowledge that my information may be shared with others at the University of Melbourne.{' '}
            <span
              className="underline underline-offset-2 hover:opacity-80 transition-opacity"
              style={{ color: '#22d3ee', cursor: 'pointer' }}
              onClick={e => { e.stopPropagation(); setShowConsentModal(true); }}
            >
              View full consent statement
            </span>
          </motion.p>
        </motion.div>

        {/* Footer hint — removed */}
      </div>

      {/* ── Consent modal ── */}
      <AnimatePresence>
        {showConsentModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-6"
            style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}
            onClick={() => setShowConsentModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              className="relative rounded-2xl max-w-lg w-full overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #111827 0%, #0f141f 100%)',
                border: '1px solid rgba(34,211,238,0.2)',
                boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-6 py-4"
                style={{ borderBottom: '1px solid rgba(34,211,238,0.12)' }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: 'rgba(34,211,238,0.1)' }}
                  >
                    <BookOpen className="w-3.5 h-3.5 text-[#22d3ee]" />
                  </div>
                  <span className="text-[#e2e8f0] font-['DM_Sans'] font-semibold text-sm tracking-wide">
                    Participant Consent Statement
                  </span>
                </div>
                <button
                  onClick={() => setShowConsentModal(false)}
                  className="text-[#4a5a7a] hover:text-[#8b9bb4] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
                <p className="text-[13px] font-['DM_Sans'] leading-relaxed" style={{ color: '#c8d3e8' }}>
                  I agree to participate in this research project, where I'll use an AI coding tool to
                  complete short Python tasks and answer questions about my experience. AI responses are
                  processed via{' '}
                  <a
                    href="https://groq.com/terms-of-use/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:opacity-80 transition-opacity"
                    style={{ color: '#22d3ee' }}
                    onClick={e => e.stopPropagation()}
                  >
                    Groq
                  </a>
                  {' '}using the Llama 3 language model.
                </p>

                <p className="text-[13px] font-['DM_Sans'] leading-relaxed" style={{ color: '#c8d3e8' }}>
                  I agree to the student researchers collecting personal information about me (including
                  demographic information, survey responses and a recording of my session) for research
                  purposes, and in order to evaluate the tool and my experience.
                </p>

                <p className="text-[13px] font-['DM_Sans'] leading-relaxed" style={{ color: '#c8d3e8' }}>
                  I acknowledge that my information may be shared with others at the University of
                  Melbourne, and that while steps will be taken to ensure this occurs on a de-identified
                  basis, it may not be possible to guarantee my anonymity given the small number of
                  participants involved in the study.
                </p>
              </div>

              {/* Footer */}
              <div
                className="px-6 py-4 flex justify-end"
                style={{ borderTop: '1px solid rgba(34,211,238,0.1)' }}
              >
                <button
                  onClick={() => setShowConsentModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-['DM_Sans'] font-semibold hover:opacity-80 transition-opacity"
                  style={{ background: 'rgba(34,211,238,0.1)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.25)' }}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}