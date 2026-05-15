import { useState, useCallback, useRef } from 'react';

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

function prepareForSpeech(text: string): string {
  return text
    .replace(/[\u{1F300}-\u{1FAD6}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}]/gu, '')
    .replace(/\*{1,3}([^*\n]+)\*{1,3}/g, '$1')
    .replace(/`([^`\n]+)`/g, (_, code) => speakableCode(code))
    .replace(/`/g, '')
    .replace(/\b[a-z][a-z0-9]*(?:_[a-z][a-z0-9]*)+\b/g, m => m.replace(/_/g, ' '))
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ', ')
    .replace(/,\s*\./g, '.')
    .replace(/\.\s*,/g, '.')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

const STYLE_PROMPT =
  'Read the following in a warm, natural, conversational tone — like a friendly colleague casually explaining something. Clear but not slow:';

// Gemini TTS returns raw 16-bit PCM at 24 kHz. Wrap it in a WAV header so the browser can play it.
function pcmBase64ToWav(base64: string): Blob {
  const binary = atob(base64);
  const pcm = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) pcm[i] = binary.charCodeAt(i);

  const sampleRate = 24000;
  const channels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;

  const buf = new ArrayBuffer(44 + pcm.length);
  const dv = new DataView(buf);
  const str = (off: number, s: string) =>
    [...s].forEach((c, i) => dv.setUint8(off + i, c.charCodeAt(0)));

  str(0, 'RIFF'); dv.setUint32(4, 36 + pcm.length, true);
  str(8, 'WAVE'); str(12, 'fmt ');
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true);
  dv.setUint16(22, channels, true); dv.setUint32(24, sampleRate, true);
  dv.setUint32(28, byteRate, true); dv.setUint16(32, blockAlign, true);
  dv.setUint16(34, bitsPerSample, true);
  str(36, 'data'); dv.setUint32(40, pcm.length, true);
  new Uint8Array(buf).set(pcm, 44);

  return new Blob([buf], { type: 'audio/wav' });
}

async function fetchTTSBlob(rawText: string, signal: AbortSignal, apiKey: string): Promise<Blob | null> {
  const text = prepareForSpeech(rawText);
  const styledText = `${STYLE_PROMPT}\n\n${text}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: styledText }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Achernar' } },
          },
        },
      }),
    }
  );

  if (signal.aborted || !res.ok) return null;

  const json = await res.json();
  const b64 = json?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!b64 || signal.aborted) return null;

  return pcmBase64ToWav(b64);
}

export function useGoogleTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const isMutedRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const urlRef = useRef<string | null>(null);
  // Cache blobs keyed by raw text so prefetched audio plays instantly
  const cacheRef = useRef<Map<string, Blob>>(new Map());

  const cleanup = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    cleanup();
    setIsSpeaking(false);
  }, [cleanup]);

  const speak = useCallback(async (rawText: string) => {
    if (isMutedRef.current) return;
    cleanup();

    const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
    if (!apiKey) return;

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setIsSpeaking(true);

    try {
      let blob = cacheRef.current.get(rawText) ?? null;
      if (!blob) {
        blob = await fetchTTSBlob(rawText, ctrl.signal, apiKey);
      }

      if (!blob || ctrl.signal.aborted || isMutedRef.current) { setIsSpeaking(false); return; }

      const url = URL.createObjectURL(blob);
      urlRef.current = url;

      const audio = new Audio(url);
      audio.playbackRate = 1.15;
      audioRef.current = audio;
      audio.onended = () => { URL.revokeObjectURL(url); urlRef.current = null; setIsSpeaking(false); };
      audio.onerror = () => setIsSpeaking(false);
      await audio.play();
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('[GoogleTTS] fetch error', err);
        setIsSpeaking(false);
      }
    }
  }, [cleanup]);

  // Pre-fetch and cache audio for a text string without playing it.
  // Call this when a challenge loads so audio is ready when the user passes.
  const prefetch = useCallback(async (rawText: string) => {
    if (cacheRef.current.has(rawText)) return;
    const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
    if (!apiKey) return;
    const ctrl = new AbortController();
    try {
      const blob = await fetchTTSBlob(rawText, ctrl.signal, apiKey);
      if (blob) cacheRef.current.set(rawText, blob);
    } catch {
      // prefetch failures are silent — speak() will fetch on demand if needed
    }
  }, []);

  const toggleMute = useCallback(() => {
    const next = !isMutedRef.current;
    isMutedRef.current = next;
    setIsMuted(next);
    if (next) { cleanup(); setIsSpeaking(false); }
  }, [cleanup]);

  return { isSpeaking, isMuted, speak, stop, toggleMute, prefetch };
}
