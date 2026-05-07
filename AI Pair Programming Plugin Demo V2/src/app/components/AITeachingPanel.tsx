import { motion, AnimatePresence } from 'motion/react';
import { VoiceVisualizer } from './VoiceVisualizer';
import { Mic, MicOff, Brain, Volume2, Send, X } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

interface Message {
  type: 'ai' | 'user';
  content: string;
  timestamp: string;
  badge?: 'error' | 'optimize' | 'warning' | 'teach';
  lineNumbers?: number[];
}

interface AITeachingPanelProps {
  messages: Message[];
  isListening: boolean;
  isVoiceActive: boolean;  // true only while voice is actually being heard
  isSpeaking: boolean;
  isThinking: boolean;
  onToggleListening: () => void;
  onSendMessage?: (message: string) => void;
  onLineClick?: (lineNumber: number) => void;
}

export function AITeachingPanel({
  messages,
  isListening,
  isVoiceActive,
  isSpeaking,
  isThinking,
  onToggleListening,
  onSendMessage,
  onLineClick,
}: AITeachingPanelProps) {
  const [inputText, setInputText] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // "Active" = voice detected OR user is typing — drives status text & wave activation
  const isUserActive = isVoiceActive || inputText.length > 0 || isInputFocused;

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = () => {
    if (inputText.trim() && onSendMessage) {
      onSendMessage(inputText);
      setInputText('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const BADGE_CONFIG = {
    error:    { label: '🐛 ERROR',    color: '#f87171', bg: 'rgba(248,113,113,0.15)' },
    optimize: { label: '⚡ OPTIMIZE', color: '#22d3ee', bg: 'rgba(34,211,238,0.15)' },
    warning:  { label: '⚠️ WARNING',  color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' },
    teach:    { label: '💡 HINT',     color: '#ffa94d', bg: 'rgba(255,169,77,0.15)' },
  };

  return (
    /*
     * The outer div uses position:absolute + inset:0 so it is ALWAYS
     * exactly as tall as its positioned parent — never stretched by content.
     * The flex column then divides that fixed space between the fixed
     * sections (header / visualizer / input / tips) and the scrollable
     * messages area (flex-1 overflow-y-auto).
     */
    <div
      style={{ position: 'absolute', inset: 0 }}
      className="bg-[#0f141f] rounded-lg border border-[#2a3f5f] flex flex-col overflow-hidden"
    >
      {/* ── Panel Header ── */}
      <div className="bg-[#1a1f2e] px-6 py-4 border-b border-[#2a3f5f] flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ff9d3d] to-[#ffa94d] flex items-center justify-center"
              animate={isThinking ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Brain className="w-5 h-5 text-[#0f141f]" />
            </motion.div>
            <div>
              <h2 className="text-[#e2e8f0] font-['DM_Sans'] font-medium">AI Pilot</h2>
              <p className="text-[#8b9bb4] text-sm">
                {isUserActive ? '👂 Listening...' : isThinking ? 'Thinking...' : isSpeaking ? 'Speaking' : 'Ready to teach'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Recording pill — appears & always active while isListening */}
            <AnimatePresence>
              {isListening && (
                <motion.div
                  key="recording-pill"
                  initial={{ opacity: 0, width: 36, scale: 0.85 }}
                  animate={{ opacity: 1, width: 148, scale: 1 }}
                  exit={{ opacity: 0, width: 36, scale: 0.85 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                  style={{
                    height: 36,
                    borderRadius: 999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingLeft: 14,
                    paddingRight: 14,
                    gap: 9,
                    background: 'rgba(239,68,68,0.15)',
                    border: '1.5px solid #ef4444',
                    position: 'relative',
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}
                >
                  <motion.span
                    style={{ position: 'absolute', inset: -3, borderRadius: 999, pointerEvents: 'none' }}
                    animate={{ boxShadow: [
                      '0 0 5px 1px rgba(239,68,68,0.20)',
                      '0 0 18px 6px rgba(239,68,68,0.52)',
                      '0 0 5px 1px rgba(239,68,68,0.20)',
                    ]}}
                    transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  {/* Sound wave bars */}
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        style={{
                          display: 'block',
                          width: 3,
                          borderRadius: 99,
                          background: '#ef4444',
                          flexShrink: 0,
                        }}
                        animate={{ height: [6, 14, 5, 16, 7, 12, 5] }}
                        transition={{
                          duration: 2.0,
                          repeat: Infinity,
                          ease: 'easeInOut',
                          delay: i * 0.38,
                        }}
                      />
                    ))}
                  </span>
                  {/* Listening label */}
                  <span style={{
                    whiteSpace: 'nowrap',
                    color: '#ef4444',
                    fontSize: 13,
                    fontFamily: 'DM Sans, sans-serif',
                    fontWeight: 500,
                    letterSpacing: '0.01em',
                  }}>
                    Listening...
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Voice Control — always lit cyan; morphs to X-circle when active */}
            <motion.button
              onClick={onToggleListening}
              whileTap={{ scale: 0.94 }}
              title={isListening ? 'Stop Voice Control' : 'Start Voice Control'}
              initial={{ width: 144, borderRadius: 8, paddingLeft: 16, paddingRight: 16 }}
              animate={{
                width: isListening ? 36 : 144,
                borderRadius: isListening ? 999 : 8,
                paddingLeft: isListening ? 0 : 16,
                paddingRight: isListening ? 0 : 16,
              }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              style={{
                height: 36,
                background: '#22d3ee',
                color: '#0f141f',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              <AnimatePresence mode="wait" initial={false}>
                {isListening ? (
                  <motion.span
                    key="x-icon"
                    initial={{ opacity: 0, scale: 0.4, rotate: -45 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0.4, rotate: 45 }}
                    transition={{ duration: 0.15 }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <X className="w-4 h-4" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="vc-content"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}
                  >
                    <Mic className="w-4 h-4" />
                    <span className="text-sm font-['DM_Sans']">Speak to AI</span>
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            {/* ── old recording pill removed from here ── */}
          </div>
        </div>
      </div>

      {/* ── Voice Visualizer ── */}
      <div className="bg-[#1a1f2e] py-3 border-b border-[#2a3f5f] flex-shrink-0">
        <VoiceVisualizer isSpeaking={isSpeaking} isListening={isListening} isVoiceActive={isUserActive} />
      </div>

      {/* ── Messages — this is the ONLY section that scrolls ── */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden p-5 font-['DM_Sans']"
        style={{ minHeight: 0 }}
      >
        {messages.length === 0 ? (
          /* ── Empty skeleton placeholder ── */
          <div className="h-full flex flex-col items-center justify-center gap-5 select-none">
            {/* Pulsing brain icon */}
            <motion.div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,169,77,0.08)', border: '1px solid rgba(255,169,77,0.18)' }}
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Brain className="w-7 h-7" style={{ color: 'rgba(255,169,77,0.35)' }} />
            </motion.div>

            {/* Ghost message bubbles */}
            <div className="w-full space-y-3 px-1">
              {[
                { side: 'ai',   w: '78%' },
                { side: 'ai',   w: '55%' },
                { side: 'user', w: '45%' },
                { side: 'ai',   w: '82%' },
                { side: 'ai',   w: '60%' },
              ].map(({ side, w }, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.3 }}
                  className={`flex gap-2 ${side === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  {/* Avatar ghost */}
                  <div
                    className="flex-shrink-0 w-7 h-7 rounded-full"
                    style={{
                      background: side === 'ai'
                        ? 'rgba(255,169,77,0.12)'
                        : 'rgba(34,211,238,0.12)',
                    }}
                  />
                  {/* Bubble ghost */}
                  <motion.div
                    className="h-9 rounded-lg"
                    style={{
                      width: w,
                      background: side === 'ai'
                        ? 'rgba(255,255,255,0.03)'
                        : 'rgba(34,211,238,0.05)',
                      border: side === 'ai'
                        ? '1px solid rgba(255,255,255,0.06)'
                        : '1px solid rgba(34,211,238,0.1)',
                    }}
                    animate={{ opacity: [0.5, 0.8, 0.5] }}
                    transition={{ duration: 2.5 + i * 0.3, repeat: Infinity, ease: 'easeInOut', delay: i * 0.15 }}
                  />
                </motion.div>
              ))}
            </div>

            <p className="text-[#3d5280] text-xs font-['DM_Sans'] text-center">
              Messages will appear here
            </p>
          </div>
        ) : (
        <div className="space-y-4">
          {messages.map((message, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={`flex gap-3 ${message.type === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  message.type === 'ai'
                    ? 'bg-gradient-to-br from-[#ff9d3d] to-[#ffa94d]'
                    : 'bg-[#22d3ee]'
                }`}
              >
                {message.type === 'ai' ? (
                  <Brain className="w-4 h-4 text-[#0f141f]" />
                ) : (
                  <Volume2 className="w-4 h-4 text-[#0f141f]" />
                )}
              </div>
              <div
                className={`flex-1 rounded-lg p-4 ${
                  message.type === 'ai'
                    ? 'bg-[#1a1f2e] border border-[#2a3f5f]'
                    : 'bg-[#22d3ee]/10 border border-[#22d3ee]/30'
                }`}
              >
                {message.badge && message.type === 'ai' && (() => {
                  const b = BADGE_CONFIG[message.badge];
                  return (
                    <span
                      className="inline-block text-[10px] font-['DM_Sans'] font-semibold px-1.5 py-0.5 rounded mb-2"
                      style={{ color: b.color, background: b.bg }}
                    >
                      {b.label}
                    </span>
                  );
                })()}
                <p className="text-[#e2e8f0] text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>

                {/* ── Line number jump chips (AI messages only) ── */}
                {message.type === 'ai' && message.lineNumbers && message.lineNumbers.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-[#2a3f5f]/60 flex-wrap">
                    <span className="text-[10px] text-[#8b9bb4] font-['DM_Sans'] mr-0.5 select-none">Jump to:</span>
                    {message.lineNumbers.map((ln) => (
                      <motion.button
                        key={ln}
                        onClick={() => onLineClick?.(ln)}
                        whileHover={{ scale: 1.06 }}
                        whileTap={{ scale: 0.94 }}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded cursor-pointer font-['Space_Mono'] select-none transition-colors"
                        style={{
                          background: 'rgba(34,211,238,0.10)',
                          border: '1px solid rgba(34,211,238,0.30)',
                          color: '#22d3ee',
                          fontSize: 10,
                        }}
                      >
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" style={{ flexShrink: 0 }}>
                          <path d="M1 4h5M4 1.5l2.5 2.5L4 6.5" stroke="#22d3ee" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        L{ln}
                      </motion.button>
                    ))}
                  </div>
                )}

                <span className="text-[#8b9bb4] text-xs mt-2 block">{message.timestamp}</span>
              </div>
            </motion.div>
          ))}

          {/* Thinking indicator */}
          {isThinking && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3"
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[#ff9d3d] to-[#ffa94d] flex items-center justify-center">
                <Brain className="w-4 h-4 text-[#0f141f]" />
              </div>
              <div className="rounded-lg p-4 bg-[#1a1f2e] border border-[#2a3f5f] flex items-center gap-2">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-[#ff9d3d]"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
        )}
      </div>

      {/* ── Text Input ── */}
      <div className="bg-[#1a1f2e] px-4 py-3 border-t border-[#2a3f5f] flex-shrink-0">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyPress}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            placeholder="Type your question or use voice..."
            className="flex-1 bg-[#0f141f] text-[#e2e8f0] placeholder:text-[#8b9bb4] px-3 py-2 rounded-lg border border-[#2a3f5f] focus:border-[#ff9d3d] focus:outline-none text-sm font-['DM_Sans'] transition-colors"
          />
          <motion.button
            onClick={handleSend}
            disabled={!inputText.trim()}
            className="px-3 py-2 bg-[#ff9d3d] text-[#0f141f] rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#ffa94d] transition-colors"
            whileTap={{ scale: 0.95 }}
          >
            <Send className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      {/* ── Teaching Tips ── */}
      <div className="bg-[#1a1f2e] px-6 py-3 border-t border-[#2a3f5f] flex-shrink-0">
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-[#ff9d3d]/20 flex items-center justify-center flex-shrink-0">
            <span className="text-[#ff9d3d] text-sm">💡</span>
          </div>
          <div>
            <h3 className="text-[#ffa94d] text-xs font-medium mb-0.5 font-['DM_Sans']">
              Voice Commands
            </h3>
            <p className="text-[#8b9bb4] text-xs leading-relaxed">
              Say <span className="text-[#22d3ee] font-mono">"stop"</span> to pause •{' '}
              <span className="text-[#22d3ee] font-mono">"continue"</span> to resume •{' '}
              <span className="text-[#22d3ee] font-mono">"explain"</span> for details
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}