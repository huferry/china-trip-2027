import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc, getDoc, getDocs, collection, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

export function usePlan(ready = true) {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    const unsub = onSnapshot(
      doc(db, 'plans', 'current'),
      snap => {
        setPlan(snap.exists() ? snap.data() : null);
        setLoading(false);
      },
      () => setLoading(false), // permission error or offline — stop spinning
    );
    return () => unsub();
  }, [ready]);

  async function savePlan(content, name) {
    const now = Timestamp.now();
    // Auto-snapshot the new plan to planVersions for history
    const versionId = `auto-${now.seconds}`;
    const versionName = name || `Auto-saved ${new Date(now.seconds * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    await setDoc(doc(db, 'planVersions', versionId), {
      content,
      name: versionName,
      createdAt: now,
    });
    await setDoc(doc(db, 'plans', 'current'), {
      content,
      name: name || null,
      updatedAt: now,
    });
  }

  async function listVersions() {
    const snap = await getDocs(collection(db, 'planVersions'));
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
  }

  async function recallVersion(versionId) {
    const snap = await getDoc(doc(db, 'planVersions', versionId));
    if (!snap.exists()) throw new Error('Version not found');
    const { content, name } = snap.data();
    await setDoc(doc(db, 'plans', 'current'), {
      content,
      name: name || null,
      updatedAt: Timestamp.now(),
    });
  }

  return { plan, loading, savePlan, listVersions, recallVersion };
}
