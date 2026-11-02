import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase';

export function useWishlist(userEmail) {
  const [items, setItems] = useState(new Set());

  useEffect(() => {
    if (!userEmail) return;
    const unsub = onSnapshot(doc(db, 'wishlists', userEmail), snap => {
      setItems(new Set(snap.exists() ? (snap.data().items ?? []) : []));
    });
    return () => unsub();
  }, [userEmail]);

  async function toggle(placeId) {
    const ref = doc(db, 'wishlists', userEmail);
    if (items.has(placeId)) {
      setItems(prev => { const s = new Set(prev); s.delete(placeId); return s; });
      await setDoc(ref, { items: arrayRemove(placeId) }, { merge: true });
    } else {
      setItems(prev => new Set(prev).add(placeId));
      await setDoc(ref, { items: arrayUnion(placeId) }, { merge: true });
    }
  }

  return { items, toggle };
}
