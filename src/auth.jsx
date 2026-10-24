import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';

// status: 'loading' | 'unauthenticated' | 'allowed' | 'denied' | 'invalid-invite'
const AuthContext = createContext(null);

function getInviteToken() {
  return new URLSearchParams(window.location.search).get('invite');
}

async function tryRedeemInvite(email, inviteToken) {
  const inviteSnap = await getDoc(doc(db, 'invites', inviteToken));
  if (!inviteSnap.exists()) return 'invalid';
  const data = inviteSnap.data();
  if (data.usedBy || data.expiresAt.toDate() <= new Date()) return 'expired';

  await setDoc(doc(db, 'allowedUsers', email), {
    addedAt: Timestamp.now(),
    inviteToken,
  });
  await setDoc(doc(db, 'invites', inviteToken), {
    ...data,
    usedBy: email,
    usedAt: Timestamp.now(),
  });
  window.history.replaceState({}, '', window.location.pathname);
  return 'ok';
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined);
  const [status, setStatus] = useState('loading');
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setStatus(prev => (prev === 'denied' || prev === 'invalid-invite') ? prev : 'unauthenticated');
        return;
      }
      setUser(firebaseUser);

      try {
        const userSnap = await getDoc(doc(db, 'allowedUsers', firebaseUser.email));
        if (userSnap.exists()) {
          setStatus('allowed');
          return;
        }
      } catch {
        // Firestore rules may block the read — treat as unauthenticated
        setStatus('unauthenticated');
        return;
      }

      // Already authenticated but not yet in allowedUsers — try auto-redeem if invite in URL
      const inviteToken = getInviteToken();
      if (inviteToken) {
        const result = await tryRedeemInvite(firebaseUser.email, inviteToken);
        if (result === 'ok') {
          setStatus('allowed');
          return;
        }
        await firebaseSignOut(auth);
        setUser(null);
        setStatus('invalid-invite');
        return;
      }

      setStatus('unauthenticated');
    });
  }, []);

  async function signIn() {
    setAuthError(null);
    const inviteToken = getInviteToken();
    let result;
    try {
      result = await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthError(err.message);
      return;
    }
    const { email } = result.user;

    const userSnap = await getDoc(doc(db, 'allowedUsers', email));
    if (userSnap.exists()) {
      setStatus('allowed');
      return;
    }

    if (inviteToken) {
      const redeemResult = await tryRedeemInvite(email, inviteToken);
      if (redeemResult === 'ok') {
        setStatus('allowed');
        return;
      }
      await firebaseSignOut(auth);
      setUser(null);
      setStatus('invalid-invite');
      return;
    }

    await firebaseSignOut(auth);
    setUser(null);
    setStatus('denied');
  }

  async function signOut() {
    await firebaseSignOut(auth);
    setUser(null);
    setStatus('unauthenticated');
  }

  return (
    <AuthContext.Provider value={{ user, status, authError, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
