import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const firebaseConfig = {
  projectId: "huferry-china-trip",
  appId: "1:157681395253:web:886c4c6a779ca2b3c8f37c",
  storageBucket: "huferry-china-trip.firebasestorage.app",
  apiKey: "AIzaSyD5wdDDzCVt9ttTMd3nD7PieNMvCPCPSSQ",
  authDomain: "huferry-china-trip.firebaseapp.com",
  messagingSenderId: "157681395253",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const dataPath = join(__dirname, '..', 'temp', 'china-trip-places.json');
const raw = readFileSync(dataPath, 'utf-8');
const data = JSON.parse(raw);

async function seed() {
  console.log(`Seeding ${data.places.length} places to Firestore...`);
  let count = 0;
  for (const place of data.places) {
    await setDoc(doc(db, 'places', place.id), place);
    count++;
    if (count % 10 === 0) {
      console.log(`  ${count}/${data.places.length} done`);
    }
  }
  console.log(`Done! Uploaded ${count} places.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
