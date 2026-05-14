import { useState, useCallback, useRef } from 'react';

// Expand code operators/symbols into speakable words so TTS doesn't read punctuation literally.
function speakableCode(code: string): string {
  return code
    .replace(/\+=/g, ' plus-equals ')
    .replace(/-=/g, ' minus-equals ')
    .replace(/\*=/g, ' times-equals ')
    .replace(/\/=/g, ' divide-equals ')
    .replace(/>=/g, ' greater-than-or-equal-to ')
    .replace(/<=/g, ' less-than-or-equal-to ')
    .replace(/==/g, ' double-equals ')
    .replace(/!=/g, ' not-equals ')
    .replace(/\[\]/g, ' empty list ')
    .replace(/\(\)/g, '')
    .replace(/['"]/g, '')
    .replace(/_/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// Strip markdown/emoji/code syntax so the TTS reads clean prose.
function prepareForSpeech(text: string): string {
  return text
    // Emoji (common ranges)
    .replace(/[\u{1F300}-\u{1FAD6}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}]/gu, '')
    // Markdown bold / italic
    .replace(/\*{1,3}([^*\n]+)\*{1,3}/g, '$1')
    // Inline code — expand operators then strip backticks
    .replace(/`([^`\n]+)`/g, (_, code) => speakableCode(code))
    // Any leftover backticks
    .replace(/`/g, '')
    // snake_case identifiers in plain prose → spoken words ("total_duration" → "total duration")
    .replace(/\b[a-z][a-z0-9]*(?:_[a-z][a-z0-9]*)+\b/g, m => m.replace(/_/g, ' '))
    // Paragraph breaks → natural sentence pause
    .replace(/\n{2,}/g, '. ')
    // Single line breaks → brief pause
    .replace(/\n/g, ', ')
    // Tidy up leftover punctuation artifacts
    .replace(/,\s*\./g, '.')
    .replace(/\.\s*,/g, '.')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// Split text into sentence-sized chunks to avoid Chrome's ~15s TTS cutout bug.
function toChunks(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

function getBestVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  const enUS = voices.filter(v => v.lang === 'en-US' || v.lang === 'en_US');
  const enAny = voices.filter(v => v.lang.startsWith('en'));
  return (
    // Chrome's built-in neural voice — best option when available
    voices.find(v => v.name === 'Google US English') ??
    voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) ??
    // macOS Premium (neural) and Enhanced voices
    enUS.find(v => v.name.includes('Premium')) ??
    enAny.find(v => v.name.includes('Premium')) ??
    enUS.find(v => v.name.includes('Enhanced')) ??
    enAny.find(v => v.name.includes('Enhanced')) ??
    // Known good macOS local voices
    voices.find(v => v.name === 'Ava' && v.localService) ??
    voices.find(v => v.name === 'Allison' && v.localService) ??
    voices.find(v => v.name === 'Samantha' && v.localService) ??
    // Fallbacks
    enUS.find(v => v.localService) ??
    enAny.find(v => v.localService) ??
    enUS[0] ??
    enAny[0] ??
    null
  );
}

export function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const isMutedRef = useRef(false);

  const speakChain = useCallback((chunks: string[], index: number) => {
    // Guard here too — Chrome sometimes fires onend instead of onerror on cancel()
    if (isMutedRef.current) { setIsSpeaking(false); return; }
    if (index >= chunks.length) {
      setIsSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(chunks[index]);
    const voice = getBestVoice();
    if (voice) utterance.voice = voice;
    utterance.rate = 1.25;
    utterance.pitch = 1.0;
    utterance.onend = () => speakChain(chunks, index + 1);
    utterance.onerror = (e) => {
      // 'canceled'/'interrupted' means we called cancel() — not a real error
      if ((e as SpeechSynthesisErrorEvent).error !== 'canceled' &&
          (e as SpeechSynthesisErrorEvent).error !== 'interrupted') {
        setIsSpeaking(false);
      }
    };
    window.speechSynthesis.speak(utterance);
  }, []);

  const speak = useCallback((text: string) => {
    if (isMutedRef.current || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    // Voices may not be loaded yet on first call — retry once they are
    const doSpeak = () => {
      const chunks = toChunks(prepareForSpeech(text));
      setIsSpeaking(true);
      speakChain(chunks, 0);
    };

    if (window.speechSynthesis.getVoices().length > 0) {
      doSpeak();
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null;
        doSpeak();
      };
    }
  }, [speakChain]);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const toggleMute = useCallback(() => {
    const next = !isMutedRef.current;
    isMutedRef.current = next;
    setIsMuted(next);
    if (next) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  return { isSpeaking, isMuted, speak, stop, toggleMute };
}
