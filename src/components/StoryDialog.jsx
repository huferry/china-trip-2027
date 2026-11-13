import { useState, useEffect, useCallback } from 'react';

/**
 * Pick the best English voice available on the device.
 * Preference order:
 *  1. Premium / Enhanced / Neural voices (iOS/macOS — sound natural)
 *  2. Known good quality voices (Ava, Zoe, Samantha, Karen, Daniel)
 *  3. Any real voice (skip macOS novelty voices like Boing, Bells, etc.)
 *  4. Default fallback
 */
const NOVELTY = /\b(albert|bad news|bahh|bells|boing|bubbles|cellos|good news|hysterical|jester|organ|superstar|trinoids|whisper|wobble|zarvox|ralph|fred)\b/i;
const PREFERRED = /\b(ava|zoe|samantha|karen|daniel|moira|tessa|serena|kate)\b/i;

function getBestVoice() {
  const voices = speechSynthesis.getVoices();
  const english = voices.filter(v => v.lang.startsWith('en'));
  if (!english.length) return null;

  // 1. Premium/Enhanced/Neural voices (best quality on Apple devices)
  const premium = english.find(v =>
    /premium|enhanced|natural|neural/i.test(v.name)
  );
  if (premium) return premium;

  // 2. Known good-quality voice names
  const real = english.filter(v => !NOVELTY.test(v.name));
  const preferred = real.find(v => PREFERRED.test(v.name));
  if (preferred) return preferred;

  // 3. Any non-novelty voice
  if (real.length) return real[0];

  return english[0];
}

export default function StoryDialog({ stories, placeName, onClose }) {
  const [idx, setIdx] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [voice, setVoice] = useState(null);

  const story = stories[idx];
  const hasPrev = idx > 0;
  const hasNext = idx < stories.length - 1;

  const stopSpeech = useCallback(() => {
    speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  useEffect(() => {
    // Voices may load asynchronously (especially on Chrome)
    function loadVoice() {
      setVoice(getBestVoice());
    }
    loadVoice();
    speechSynthesis.addEventListener('voiceschanged', loadVoice);
    return () => {
      speechSynthesis.cancel();
      speechSynthesis.removeEventListener('voiceschanged', loadVoice);
    };
  }, []);

  function toggleSpeak() {
    if (speaking) {
      stopSpeech();
      return;
    }
    const utter = new SpeechSynthesisUtterance(story.text);
    utter.lang = 'en-US';
    utter.rate = 0.95;
    if (voice) utter.voice = voice;
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    speechSynthesis.speak(utter);
    setSpeaking(true);
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
