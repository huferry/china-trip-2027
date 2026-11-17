/**
 * Backup the demo database to a Firestore snapshot document.
 * If the demo database is empty, it first seeds it from the main project.
 * Run: node scripts/backup-database.mjs
 * Requires: service-account.demo.json (demo project) and service-account.json (main project)
 */
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { readFile } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));

async function loadJson(path) {
  const raw = await readFile(path, 'utf-8');
  return JSON.parse(raw);
}

const demoSaPath = resolve(__dir, '../service-account.demo.json');
const mainSaPath = resolve(__dir, '../service-account.json');

const demoSa = await loadJson(demoSaPath);
const demoApp = initializeApp({ credential: cert(demoSa) }, 'demo');
const demoDB = getFirestore(demoApp);

async function main() {
  // Check if demo DB has data
  const existingPlaces = await demoDB.collection('places').limit(1).get();

  if (existingPlaces.empty) {
    // Seed demo from main project
    console.log('Demo database is empty — seeding from main project…');

    let mainSa;
    try {
      mainSa = await loadJson(mainSaPath);
    } catch {
      throw new Error('service-account.json (main project) not found. Cannot seed demo database.');
    }

    const mainApp = initializeApp({ credential: cert(mainSa) }, 'main');
    const mainDB = getFirestore(mainApp);

    const [placesSnap, hotelsSnap, planSnap] = await Promise.all([
      mainDB.collection('places').get(),
      mainDB.collection('hotels').get(),
      mainDB.doc('plans/current').get(),
    ]);

    const places = placesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const hotels = hotelsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const plan = planSnap.exists ? planSnap.data() : null;

    console.log(`  Copying ${places.length} places, ${hotels.length} hotels, plan: ${plan ? 'yes' : 'none'}`);

    // Write places in batches of 400
    const CHUNK = 400;
    for (let i = 0; i < places.length; i += CHUNK) {
      const batch = demoDB.batch();
      places.slice(i, i + CHUNK).forEach(({ id, ...data }) => {
        batch.set(demoDB.collection('places').doc(id), data);
      });
      await batch.commit();
    }

    // Write hotels
    if (hotels.length > 0) {
      const batch = demoDB.batch();
      hotels.forEach(({ id, ...data }) => {
        batch.set(demoDB.collection('hotels').doc(id), data);
      });
      await batch.commit();
    }

    // Write plan
    if (plan) {
      await demoDB.doc('plans/current').set(plan);
    }

    console.log('  ✓ Demo database seeded.');
  }

  // Now snapshot the demo database
  console.log('Creating snapshot…');

  const [placesSnap, hotelsSnap, planSnap] = await Promise.all([
    demoDB.collection('places').get(),
    demoDB.collection('hotels').get(),
    demoDB.doc('plans/current').get(),
  ]);

  const places = placesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const hotels = hotelsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const plan = planSnap.exists ? planSnap.data() : null;

  console.log(`  ${places.length} places, ${hotels.length} hotels, plan: ${plan ? 'yes' : 'none'}`);

  const snapshotId = `snapshot-${Date.now()}`;
  const payload = {
    createdAt: Timestamp.now(),
    places,
    hotels,
    plan,
  };

  await demoDB.doc(`snapshots/${snapshotId}`).set(payload);
  await demoDB.doc('snapshots/latest').set(payload);

  console.log(`✓ Snapshot saved as "${snapshotId}" and "latest".`);
}

main().catch(err => {
  console.error('Backup failed:', err.message);
  process.exit(1);
});
