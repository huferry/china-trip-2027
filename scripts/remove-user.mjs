#!/usr/bin/env node
/**
 * Removes a user from the application.
 * Deletes their allowedUsers record and wishlist.
 *
 * Usage:
 *   node scripts/remove-user.mjs user@example.com
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';

const SERVICE_ACCOUNT_PATH = './service-account.json';

if (!existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error(`ERROR: ${SERVICE_ACCOUNT_PATH} not found.`);
  process.exit(1);
}

const email = process.argv[2];
if (!email) {
  console.error('Usage: node scripts/remove-user.mjs user@example.com');
  process.exit(1);
}

const key = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));
initializeApp({ credential: cert(key), projectId: 'huferry-china-trip' });
const db = getFirestore();

// Check if user exists
const userDoc = await db.collection('allowedUsers').doc(email).get();
if (!userDoc.exists) {
  console.error(`User not found: ${email}`);
  process.exit(1);
}

const userData = userDoc.data();
console.log(`Removing user: ${email} (${userData.displayName ?? 'no display name'})`);

// Delete allowedUsers record and wishlist in parallel
await Promise.all([
  db.collection('allowedUsers').doc(email).delete(),
  db.collection('wishlists').doc(email).delete(),
]);

console.log(`✓ Removed ${email} from allowedUsers and wishlists.`);
