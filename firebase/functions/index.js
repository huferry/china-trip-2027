import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import Anthropic from '@anthropic-ai/sdk';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase-admin/app';

initializeApp();
setGlobalOptions({ region: 'us-central1' });

// Set AI_RATE_LIMIT=3 for demo project, leave unset (0) for no limit.
// Set AI_MODEL=claude-haiku-4-5-20251001 for demo, leave unset for opus.
const RATE_LIMIT = parseInt(process.env.AI_RATE_LIMIT || '0');
const AI_MODEL = process.env.AI_MODEL || 'claude-opus-4-6';

export const callClaude = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Must be signed in.');

  if (RATE_LIMIT > 0) {
    const db = getFirestore();
    const usageRef = db.collection('aiUsage').doc(uid);
    const now = Date.now();
    const WINDOW_MS = 60 * 60 * 1000;

    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(usageRef);
      if (!snap.exists()) {
        tx.set(usageRef, { count: 1, windowStart: Timestamp.fromMillis(now) });
        return { allowed: true };
      }
      const { count, windowStart } = snap.data();
      const windowAge = now - windowStart.toMillis();
      if (windowAge > WINDOW_MS) {
        tx.set(usageRef, { count: 1, windowStart: Timestamp.fromMillis(now) });
        return { allowed: true };
      }
      if (count >= RATE_LIMIT) {
        const resetInMinutes = Math.ceil((WINDOW_MS - windowAge) / 60000);
        return { allowed: false, resetInMinutes };
      }
      tx.update(usageRef, { count: FieldValue.increment(1) });
      return { allowed: true };
    });

    if (!result.allowed) {
      throw new HttpsError(
        'resource-exhausted',
        `Rate limit reached. Try again in ${result.resetInMinutes} minute${result.resetInMinutes !== 1 ? 's' : ''}.`
      );
    }
  }

  const { system, messages, tools, max_tokens, model: requestedModel } = request.data;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Allow admin to request a specific model; otherwise use env-configured default.
  const ALLOWED_MODELS = [
    'claude-haiku-4-5-20251001',
    'claude-sonnet-4-6',
    'claude-opus-4-6',
  ];
  const model = (requestedModel && ALLOWED_MODELS.includes(requestedModel))
    ? requestedModel
    : AI_MODEL;

  const response = await client.messages.create({
    model,
    max_tokens: max_tokens || 1024,
    system,
    ...(tools?.length ? { tools } : {}),
    messages,
  });

  return JSON.parse(JSON.stringify(response));
});
