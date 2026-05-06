import { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface VoiceVisualizerProps {
  isSpeaking: boolean;    // AI is outputting speech → orange animated bars
  isListening: boolean;   // mic is open → show cyan bars (standby or active)
  isVoiceActive: boolean; // voice is actually being heard → full ripple wave
}

const N = 24;

// ── Pre-computed specs for speaking bars ──────────────────────────────────────
function buildSpeakSpecs() {
  return Array.from({ length: N }, () => ({
    maxH: 14 + Math.random() * 34,
    dur:  0.30 + Math.random() * 0.38,
  }));
}

// ── 1. AI Speaking: erratic orange bars ──────────────────────────────────────
function SpeakingBars({ isSpeaking }: { isSpeaking: boolean }) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const specs = useMemo(() => buildSpeakSpecs(), []);

  return (
    <motion.div
      key="speaking"
      className="flex items-center justify-center gap-[3px] h-16 w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {specs.map((s, i) => (
        <motion.div
          key={i}
          className="rounded-full"
          style={{ width: 3, background: 'linear-gradient(to top, #ff9d3d, #ffa94d)' }}
          animate={{ height: isSpeaking ? [4, s.maxH, 4] : [4, 5, 4] }}
          transition={{
            duration: isSpeaking ? s.dur : 2.8,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: isSpeaking ? i * 0.022 : i * 0.1,
          }}
        />
      ))}
    </motion.div>
  );
}

// ── 2. Standby: mic is open, no voice detected — calm cyan flatline ────────────
//
// Very low bars (3–8 px), slow gentle breathing (3–4 s period),
// subtle arch shape so it visually connects to the active wave.
// Conveys "I'm ready and listening, but it's quiet."
//
function StandbyBars() {
  const center = (N - 1) / 2;

  return (
    <motion.div
      key="standby"
      className="flex items-center justify-center gap-[3px] h-16 w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {Array.from({ length: N }, (_, i) => {
        const x     = (i - center) / center;   // –1 … +1
        // Gentle arch: 3 px at edges → 7 px at centre
        const baseH = 3 + 4 * (1 - x * x);
        // Slow stagger — each bar breathes slightly out-of-phase
        const delay = (i % 6) * 0.28;
        // Vary duration slightly so it feels organic, not mechanical
        const dur   = 3.2 + (i % 4) * 0.35;

        return (
          <motion.div
            key={i}
            className="rounded-full"
            style={{
              width: 3,
              background: 'linear-gradient(to top, rgba(34,211,238,0.45), rgba(52,211,153,0.35))',
            }}
            animate={{ height: [baseH * 0.65, baseH, baseH * 0.65] }}
            transition={{ duration: dur, repeat: Infinity, ease: 'easeInOut', delay }}
          />
        );
      })}
    </motion.div>
  );
}

// ── 3. Voice Active: full ripple wave — cyan converging arch ──────────────────
//
// Same arch shape as StandbyBars but with large amplitude and
// the inward-converging stagger — unmistakably "voice detected".
//
function ActiveListeningBars() {
  const center = (N - 1) / 2;

  return (
    <motion.div
      key="listening"
      className="flex items-center justify-center gap-[3px] h-16 w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {Array.from({ length: N }, (_, i) => {
        const x        = (i - center) / center;
        const dist     = Math.abs(x);
        const archH    = 8 + 30 * (1 - x * x);   // 8 px edge → 38 px centre
        const delay    = (1 - dist) * 0.44;        // edges first, centre last
        const isCentre = dist < 0.15;

        return (
          <motion.div
            key={i}
            className="rounded-full"
            style={{
              width: 3,
              background: 'linear-gradient(to top, #22d3ee, #34d399)',
              boxShadow: isCentre ? '0 0 7px #22d3ee99' : undefined,
            }}
            animate={{
              height: [
                archH * 0.22,
                archH,
                archH * 0.28,
                archH * 0.88,
                archH * 0.22,
              ],
            }}
            transition={{
              duration: 1.75,
              repeat: Infinity,
              ease: 'easeInOut',
              delay,
              times: [0, 0.27, 0.50, 0.73, 1],
            }}
          />
        );
      })}

      {/* Centre glow pulse */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 40, height: 40,
          background: 'radial-gradient(circle, rgba(34,211,238,0.22) 0%, transparent 70%)',
        }}
        animate={{ scale: [0.8, 1.4, 0.8], opacity: [0.4, 0.85, 0.4] }}
        transition={{ duration: 1.75, repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function VoiceVisualizer({ isSpeaking, isListening, isVoiceActive }: VoiceVisualizerProps) {
  return (
    <div className="relative flex items-center justify-center h-16">
      <AnimatePresence mode="wait">
        {isVoiceActive ? (
          // Highest priority: user voice is being heard → full ripple
          <ActiveListeningBars key="active" />
        ) : isSpeaking ? (
          // AI is speaking → orange bars
          <SpeakingBars key="speak" isSpeaking={isSpeaking} />
        ) : isListening ? (
          // Mic is open but silent → calm cyan standby
          <StandbyBars key="standby" />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
