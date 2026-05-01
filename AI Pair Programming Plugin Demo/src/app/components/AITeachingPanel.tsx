import { motion } from 'motion/react';
import { VoiceVisualizer } from './VoiceVisualizer';
import { Mic, MicOff, Brain, Volume2, Send } from 'lucide-react';
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
  const [isRecording, setIsRecording] = useState(false);
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
            {/* Record button */}
            <motion.button
              onClick={() => setIsRecording((r) => !r)}
              whileHover={{ scale: 1.07 }}
              whileTap={{ scale: 0.92 }}
              title={isRecording ? 'Stop recording' : 'Start recording'}
              className="relative w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
              style={{
                background: isRecording ? 'rgba(239,68,68,0.18)' : 'rgba(239,68,68,0.08)',
                border: `1.5px solid ${isRecording ? '#ef4444' : 'rgba(239,68,68,0.35)'}`,
              }}
            >
              {/* Outer pulse ring — only while recording */}
              {isRecording && (
                <motion.span
                  className="absolute inset-0 rounded-full"
                  style={{ border: '1.5px solid #ef4444' }}
                  animate={{ scale: [1, 1.55], opacity: [0.7, 0] }}
                  transition={{ duration: 1.1, repeat: Infinity, ease: 'easeOut' }}
                />
              )}
              {/* Inner dot — square when recording (stop icon), circle when idle */}
              <motion.span
                animate={{ borderRadius: isRecording ? '3px' : '50%' }}
                transition={{ duration: 0.2 }}
                style={{
                  display: 'block',
                  width: isRecording ? 10 : 12,
                  height: isRecording ? 10 : 12,
                  background: '#ef4444',
                }}
              />
            </motion.button>

            {/* Listening / Voice Control toggle */}
            <motion.button
              onClick={onToggleListening}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                isListening
                  ? 'bg-[#22d3ee] text-[#0f141f]'
                  : 'bg-[#2a3f5f] text-[#8b9bb4] hover:bg-[#3a4f6f]'
              }`}
              whileTap={{ scale: 0.95 }}
            >
              {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              <span className="text-sm font-['DM_Sans']">
                {isListening ? 'Listening...' : 'Voice Control'}
              </span>
            </motion.button>
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
        style={{ minHeight: 0 }}          /* force flex child to honour overflow */
      >
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