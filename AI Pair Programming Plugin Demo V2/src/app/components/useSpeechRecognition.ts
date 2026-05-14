import { useState, useRef, useCallback } from 'react';

export function useSpeechRecognition(onStop?: (finalText: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const recognitionRef = useRef<any>(null);
  const accumulatedRef = useRef('');
  const interimRef = useRef('');
  const onStopRef = useRef(onStop);
  onStopRef.current = onStop;

  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert('Speech recognition is not supported. Please use Chrome or Edge.');
      return;
    }

    accumulatedRef.current = '';
    interimRef.current = '';

    const recognition = new SR();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          accumulatedRef.current += text + ' ';
        } else {
          interim += text;
        }
      }
      interimRef.current = interim;
      setLiveTranscript(accumulatedRef.current + interim);
    };

    recognition.onend = () => {
      setIsListening(false);
      const final = (accumulatedRef.current + interimRef.current).trim();
      setLiveTranscript('');
      onStopRef.current?.(final);
    };

    recognition.onerror = () => {
      setIsListening(false);
      setLiveTranscript('');
    };

    recognitionRef.current = recognition;
    setIsListening(true);
    setLiveTranscript('');
    recognition.start();
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  return { isListening, liveTranscript, startListening, stopListening };
}
