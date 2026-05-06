import { useState, useRef, useCallback, useEffect } from 'react';

interface UseSpeechOptions {
  onTranscript: (text: string) => void;
}

interface UseSpeechReturn {
  isRecording: boolean;
  isSpeaking: boolean;
  isVoiceActive: boolean;
  isSpeechSupported: boolean;
  toggleRecording: () => void;
  speak: (text: string) => void;
  cancelSpeech: () => void;
}

// Resolve the vendor-prefixed constructor once at module load time.
const SpeechRecognitionCtor: (new () => SpeechRecognition) | null =
  typeof window !== 'undefined'
    ? (window.SpeechRecognition ??
        (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognition })
          .webkitSpeechRecognition ??
        null)
    : null;

export function useSpeech({ onTranscript }: UseSpeechOptions): UseSpeechReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);

  // Keep a stable ref so recognition callbacks always call the latest handler
  // without needing to be recreated.
  const onTranscriptRef = useRef(onTranscript);
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    setIsRecording(false);
    setIsVoiceActive(false);
  }, []);

  const startRecording = useCallback(() => {
    if (!SpeechRecognitionCtor) return;

    // Always create a fresh instance; the previous one is torn down on .stop()
    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsRecording(true);
      setIsVoiceActive(true);
    };

    recognition.onsoundstart = () => setIsVoiceActive(true);
    recognition.onsoundend = () => setIsVoiceActive(false);

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript.trim();
      if (transcript) onTranscriptRef.current(transcript);
    };

    recognition.onerror = () => {
      setIsRecording(false);
      setIsVoiceActive(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
      setIsVoiceActive(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
    }
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.02;
    utterance.pitch = 1;
    utterance.lang = 'en-US';
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, []);

  const cancelSpeech = useCallback(() => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  return {
    isRecording,
    isSpeaking,
    isVoiceActive,
    isSpeechSupported: SpeechRecognitionCtor !== null,
    toggleRecording,
    speak,
    cancelSpeech,
  };
}
