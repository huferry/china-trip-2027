import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

export function usePlan() {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'plans', 'current'),
      snap => {
        setPlan(snap.exists() ? snap.data() : null);
        setLoading(false);
      },
      () => setLoading(false), // permission error or offline — stop spinning
    );
    return () => unsub();
  }, []);

  async function savePlan(content) {
    await setDoc(doc(db, 'plans', 'current'), { content, updatedAt: Timestamp.now() });
  }

  return { plan, loading, savePlan };
}
