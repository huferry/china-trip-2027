import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase';

let _functions;
function getFns() {
  if (!_functions) _functions = getFunctions(app);
  return _functions;
}

/**
 * Proxy for Anthropic messages.create that runs server-side.
 * The API key never leaves the Cloud Function; rate limiting is enforced server-side.
 */
export async function callClaude({ system, messages, tools, max_tokens, model }) {
  const fn = httpsCallable(getFns(), 'callClaude', { timeout: 180000 });
  const result = await fn({ system, messages, tools, max_tokens, model });
  return result.data;
}
