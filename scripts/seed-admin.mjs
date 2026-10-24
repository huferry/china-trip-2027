import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize with application default credentials (uses gcloud auth)
initializeApp({
  credential: applicationDefault(),
  projectId: 'huferry-china-trip',
});

const db = getFirestore();

const dataPath = join(__dirname, '..', 'temp', 'china-trip-places.json');
const raw = readFileSync(dataPath, 'utf-8');
const data = JSON.parse(raw);

async function seed() {
  console.log(`Seeding ${data.places.length} places to Firestore...`);

  // Batch writes for efficiency
  let batch = db.batch();
  let batchCount = 0;
  let total = 0;

  for (const place of data.places) {
    const ref = db.collection('places').doc(place.id);
    batch.set(ref, place);
    batchCount++;
    total++;

    if (batchCount >= 20) {
      await batch.commit();
      console.log(`  ${total}/${data.places.length} done`);
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
    console.log(`  ${total}/${data.places.length} done`);
  }

  console.log('Done! All places uploaded.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
