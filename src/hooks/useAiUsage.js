import { doc, runTransaction, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { isDemoMode } from '../config';

const HOURLY_LIMIT = 3;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

/**
 * Returns { allowed: true } or { allowed: false, resetInMinutes: N }.
 * In non-demo mode always returns { allowed: true } without touching Firestore.
 */
export async function checkAiUsage(uid) {
  if (!isDemoMode) return { allowed: true };

  const ref = doc(db, 'aiUsage', uid);

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const now = Date.now();

    if (!snap.exists()) {
      tx.set(ref, { count: 1, windowStart: Timestamp.fromMillis(now) });
      return { allowed: true };
    }

    const { count, windowStart } = snap.data();
    const windowAge = now - windowStart.toMillis();

    if (windowAge > WINDOW_MS) {
      // Hour window has passed — reset
      tx.set(ref, { count: 1, windowStart: Timestamp.fromMillis(now) });
      return { allowed: true };
    }

    if (count >= HOURLY_LIMIT) {
      const resetInMinutes = Math.ceil((WINDOW_MS - windowAge) / 60000);
      return { allowed: false, resetInMinutes };
    }

    tx.update(ref, { count: count + 1 });
    return { allowed: true };
  });
}
