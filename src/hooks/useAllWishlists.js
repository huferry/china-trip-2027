import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

// Returns Map<placeId, string[]> — first names of all users who voted for each place.
// Only fetches when enabled (admin only).
export function useAllWishlists(enabled) {
  const [votersByPlace, setVotersByPlace] = useState(new Map());

  useEffect(() => {
    if (!enabled) return;
    async function fetch() {
      const [wishlistSnap, usersSnap] = await Promise.all([
        getDocs(collection(db, 'wishlists')),
        getDocs(collection(db, 'allowedUsers')),
      ]);

      const nameByEmail = new Map();
      for (const userDoc of usersSnap.docs) {
        const { displayName } = userDoc.data();
        const firstName = displayName
          ? displayName.split(' ')[0]
          : userDoc.id.split('@')[0];
        nameByEmail.set(userDoc.id, firstName);
      }

      const map = new Map();
      for (const wishDoc of wishlistSnap.docs) {
        const email = wishDoc.id;
        const items = wishDoc.data().items ?? [];
        const firstName = nameByEmail.get(email) ?? email.split('@')[0];
        for (const placeId of items) {
          if (!map.has(placeId)) map.set(placeId, []);
          map.get(placeId).push(firstName);
        }
      }
      setVotersByPlace(map);
    }
    fetch();
  }, [enabled]);

  return votersByPlace;
}
