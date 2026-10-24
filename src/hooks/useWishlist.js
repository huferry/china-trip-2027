import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase';

export function useWishlist(userEmail) {
  const [items, setItems] = useState(new Set());

  useEffect(() => {
    if (!userEmail) return;
    getDoc(doc(db, 'wishlists', userEmail)).then(snap => {
      if (snap.exists()) setItems(new Set(snap.data().items ?? []));
    });
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
