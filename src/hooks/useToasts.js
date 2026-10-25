import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

const TOAST_DURATION = 60_000; // 1 minute

function seenKey(email) {
  return `china-trip-seen:${email}`;
}

function getSeen(email) {
  return new Set(JSON.parse(localStorage.getItem(seenKey(email)) || '[]'));
}

function markSeen(email, id) {
  const seen = getSeen(email);
  seen.add(id);
  localStorage.setItem(seenKey(email), JSON.stringify([...seen]));
}

export function useToasts(userEmail) {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    if (!userEmail) return;

    let isInitialLoad = true;

    const unsub = onSnapshot(collection(db, 'places'), snapshot => {
      snapshot.docChanges().forEach(change => {
        if (change.type !== 'added') return;
        const data = change.doc.data();
        if (!data.suggestedAt) return; // not a user suggestion

        const id = change.doc.id;
        const place = { id, ...data };

        if (isInitialLoad) {
          // App just opened — show toast only for suggestions user hasn't seen
          if (!getSeen(userEmail).has(id)) {
            scheduleToast(place, userEmail);
          }
        } else {
          // Real-time new addition — show only if not already seen/dismissed
          if (!getSeen(userEmail).has(id)) {
            scheduleToast(place, userEmail);
          }
        }
      });
      isInitialLoad = false;
    });

    return () => unsub();
  }, [userEmail]);

  function scheduleToast(place) {
    markSeen(userEmail, place.id);
    setToasts(prev => [...prev, place]);
    setTimeout(() => dismiss(place.id), TOAST_DURATION);
  }

  function dismiss(id) {
    setToasts(prev => prev.filter(t => t.id !== id));
  }

  return { toasts, dismiss };
}
