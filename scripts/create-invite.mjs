#!/usr/bin/env node
/**
 * Creates a one-time invite link (valid 20 days) and saves a QR code PNG.
 *
 * One-time setup:
 *   1. Firebase Console → Project Settings → Service Accounts → Generate new private key
 *   2. Save the downloaded file as: ./service-account.json  (it is git-ignored)
 *
 * Usage:
 *   npm run create-invite-url
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { randomBytes } from 'crypto';
import { mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import QRCode from 'qrcode';

const SERVICE_ACCOUNT_PATH = './service-account.json';
const PROJECT_ID = 'huferry-china-trip';
const HOSTING_URL = 'https://huferry-china-trip.web.app';

if (!existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error(`
ERROR: ${SERVICE_ACCOUNT_PATH} not found.

One-time setup:
  1. Go to Firebase Console → Project Settings → Service Accounts
  2. Click "Generate new private key"
  3. Save the file as ./service-account.json
`);
  process.exit(1);
}

const serviceAccount = JSON.parse(await readFile(SERVICE_ACCOUNT_PATH, 'utf8'));
initializeApp({ credential: cert(serviceAccount), projectId: PROJECT_ID });

const db = getFirestore();
const inviteToken = randomBytes(16).toString('hex');
const now = new Date();
const expiresAt = new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000);

await db.collection('invites').doc(inviteToken).set({
  createdAt: Timestamp.fromDate(now),
  expiresAt: Timestamp.fromDate(expiresAt),
  usedBy: null,
});

const inviteUrl = `${HOSTING_URL}/?invite=${inviteToken}`;
const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');

await mkdir('./invitations', { recursive: true });
const filename = `./invitations/chinatrip-${dateStr}.png`;
await QRCode.toFile(filename, inviteUrl, { width: 400, margin: 2 });

console.log(`\nInvite URL (valid until ${expiresAt.toDateString()}):\n${inviteUrl}\n`);
console.log(`QR code saved to: ${filename}`);
