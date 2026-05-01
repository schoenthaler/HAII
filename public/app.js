const recordButton = document.getElementById('recordButton');
const clearButton = document.getElementById('clearButton');
const transcriptField = document.getElementById('transcript');
const assistantReply = document.getElementById('assistantReply');
const statusBadge = document.getElementById('statusBadge');

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let isListening = false;
let speakingUtterance = null;

function setStatus(text, mode = 'idle') {
  statusBadge.textContent = text;
  statusBadge.className = `badge ${mode}`;
}

function speak(text) {
  if (!window.speechSynthesis) {
    return;
  }

  window.speechSynthesis.cancel();
  speakingUtterance = new SpeechSynthesisUtterance(text);
  speakingUtterance.rate = 1.02;
  speakingUtterance.pitch = 1;
  speakingUtterance.lang = 'en-US';
  window.speechSynthesis.speak(speakingUtterance);
}

async function askAssistant(text) {
  setStatus('Thinking', 'thinking');
  recordButton.disabled = true;
  clearButton.disabled = true;

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || 'Request failed.');
    }

    assistantReply.textContent = data.reply;
    speak(data.reply);
    setStatus('Ready', 'idle');
  } catch (error) {
    assistantReply.textContent = error instanceof Error ? error.message : String(error);
    setStatus('Error', 'idle');
  } finally {
    recordButton.disabled = false;
    clearButton.disabled = false;
    recordButton.textContent = 'Start listening';
    isListening = false;
  }
}

function startRecognition() {
  if (!SpeechRecognition) {
    assistantReply.textContent = 'Speech recognition is not supported in this browser. Try Chrome or Edge.';
    setStatus('Unavailable', 'idle');
    return;
  }

  if (!recognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      isListening = true;
      setStatus('Listening', 'listening');
      recordButton.textContent = 'Stop listening';
    };

    recognition.onresult = async (event) => {
      const spokenText = event.results[0][0].transcript.trim();
      transcriptField.value = spokenText;
      await askAssistant(spokenText);
    };

    recognition.onerror = (event) => {
      assistantReply.textContent = `Speech recognition error: ${event.error}`;
      setStatus('Error', 'idle');
      isListening = false;
      recordButton.textContent = 'Start listening';
      recordButton.disabled = false;
      clearButton.disabled = false;
    };

    recognition.onend = () => {
      if (isListening) {
        return;
      }
      recordButton.textContent = 'Start listening';
      setStatus('Ready', 'idle');
    };
  }

  if (isListening) {
    recognition.stop();
    isListening = false;
    recordButton.textContent = 'Start listening';
    setStatus('Ready', 'idle');
    return;
  }

  recognition.start();
}

recordButton.addEventListener('click', startRecognition);
clearButton.addEventListener('click', () => {
  transcriptField.value = '';
  assistantReply.textContent = 'The response will appear here and be spoken aloud.';
  window.speechSynthesis?.cancel();
  setStatus('Ready', 'idle');
});

transcriptField.addEventListener('keydown', async (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    const text = transcriptField.value.trim();
    if (text) {
      await askAssistant(text);
    }
  }
});

setStatus(SpeechRecognition ? 'Ready' : 'No speech support', 'idle');
