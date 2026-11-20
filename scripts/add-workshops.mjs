/**
 * Add Shenzhen workshop places (sz-049 to sz-054) to Firestore.
 * Usage: node scripts/add-workshops.mjs
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sa = JSON.parse(readFileSync('./service-account.json', 'utf8'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const dataPath = join(__dirname, '..', 'temp', 'china-trip-places.json');
const raw = readFileSync(dataPath, 'utf-8');
const data = JSON.parse(raw);

const workshopIds = ['sz-049', 'sz-050', 'sz-051', 'sz-052', 'sz-053', 'sz-054'];
const workshops = data.places.filter(p => workshopIds.includes(p.id));

async function run() {
  console.log(`Adding ${workshops.length} workshop places to Firestore...`);
  for (const place of workshops) {
    await db.collection('places').doc(place.id).set(place);
    console.log(`  ✓ ${place.id}: ${place.name}`);
  }
  console.log('Done!');
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
