import { useState, useEffect, useCallback, useRef } from 'react';

const TTS_KEY = import.meta.env.VITE_GOOGLE_TTS_KEY;
const TTS_VOICE = 'en-US-Wavenet-H';

/**
 * Speak text using Google Cloud TTS (WaveNet).
 * Returns an Audio element that can be paused/stopped.
 * Falls back to Web Speech API if the Cloud call fails or no key is set.
 */
async function speakWithCloudTTS(text, onEnd) {
  if (!TTS_KEY) return null;

  const res = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${TTS_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: 'en-US', name: TTS_VOICE },
        audioConfig: { audioEncoding: 'MP3', speakingRate: 0.95 },
      }),
    }
  );

  if (!res.ok) return null;

  const { audioContent } = await res.json();
  const audio = new Audio(`data:audio/mp3;base64,${audioContent}`);
  audio.onended = onEnd;
  audio.onerror = onEnd;
  audio.play();
  return audio;
}

// --- Web Speech API fallback ---

const NOVELTY = /\b(albert|bad news|bahh|bells|boing|bubbles|cellos|good news|hysterical|jester|organ|superstar|trinoids|whisper|wobble|zarvox|ralph|fred)\b/i;
const PREFERRED = /\b(ava|zoe|samantha|karen|daniel|moira|tessa|serena|kate)\b/i;

function getBestVoice() {
  const voices = speechSynthesis.getVoices();
  const english = voices.filter(v => v.lang.startsWith('en'));
  if (!english.length) return null;

  const premium = english.find(v =>
    /premium|enhanced|natural|neural/i.test(v.name)
  );
  if (premium) return premium;

  const real = english.filter(v => !NOVELTY.test(v.name));
  const preferred = real.find(v => PREFERRED.test(v.name));
  if (preferred) return preferred;

  if (real.length) return real[0];
  return english[0];
}

export default function StoryDialog({ stories, placeName, onClose }) {
  const [idx, setIdx] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [voice, setVoice] = useState(null);
  const audioRef = useRef(null);

  const story = stories[idx];
  const hasPrev = idx > 0;
  const hasNext = idx < stories.length - 1;

  const stopSpeech = useCallback(() => {
    // Stop Cloud TTS audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    // Stop Web Speech API
    speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  useEffect(() => {
    function loadVoice() {
      setVoice(getBestVoice());
    }
    loadVoice();
    speechSynthesis.addEventListener('voiceschanged', loadVoice);
    return () => {
      speechSynthesis.cancel();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      speechSynthesis.removeEventListener('voiceschanged', loadVoice);
    };
  }, []);

  async function toggleSpeak() {
    if (speaking) {
      stopSpeech();
      return;
    }

    setSpeaking(true);
    const onEnd = () => {
      audioRef.current = null;
      setSpeaking(false);
    };

    // Try Google Cloud TTS first
    const audio = await speakWithCloudTTS(story.text, onEnd).catch(() => null);
    if (audio) {
      audioRef.current = audio;
      return;
    }

    // Fallback to Web Speech API
    const utter = new SpeechSynthesisUtterance(story.text);
    utter.lang = 'en-US';
    utter.rate = 0.95;
    if (voice) utter.voice = voice;
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    speechSynthesis.speak(utter);
  }

  function handleKey(e) {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowLeft' && hasPrev) { stopSpeech(); setIdx(i => i - 1); }
    if (e.key === 'ArrowRight' && hasNext) { stopSpeech(); setIdx(i => i + 1); }
  }

  return (
    <div className="story-overlay" onClick={onClose} onKeyDown={handleKey}>
      <div className="story-dialog" onClick={e => e.stopPropagation()}>
        <div className="story-header">
          <h3 className="story-place-name">{placeName}</h3>
          <button className="story-close-btn" onClick={onClose} title="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <h4 className="story-title">{story.title}</h4>
        <div className="story-body">{story.text}</div>
        <div className="story-footer">
          <div className="story-nav">
            <button className="story-nav-btn" disabled={!hasPrev} onClick={() => { stopSpeech(); setIdx(i => i - 1); }} title="Previous story">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <span className="story-counter">{idx + 1} / {stories.length}</span>
            <button className="story-nav-btn" disabled={!hasNext} onClick={() => { stopSpeech(); setIdx(i => i + 1); }} title="Next story">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </div>
          <button className={`story-speak-btn${speaking ? ' speaking' : ''}`} onClick={toggleSpeak} title={speaking ? 'Stop reading' : 'Read aloud'}>
            {speaking
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></svg>
            }
          </button>
        </div>
      </div>
    </div>
  );
}
