import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const key = JSON.parse(readFileSync('./service-account.json', 'utf8'));
initializeApp({ credential: cert(key), projectId: 'huferry-china-trip' });
const db = getFirestore();

function mapsUrl(lat, lng) {
  return `https://maps.google.com/?q=${lat},${lng}`;
}

// Google Maps links via verified coordinates (≥80% confidence)
const mapsLinks = {
  // Shenzhen
  'sz-001': mapsUrl(22.5367, 114.0503),
  'sz-002': mapsUrl(22.5467, 114.0544),
  'sz-003': mapsUrl(22.5169, 113.9417),
  'sz-004': mapsUrl(22.5486, 114.0520),
  'sz-005': mapsUrl(22.5435, 114.3612),
  'sz-006': mapsUrl(22.5403, 113.9885),
  'sz-007': mapsUrl(22.5465, 114.0568),
  'sz-008': mapsUrl(22.5429, 113.9209),
  'sz-009': mapsUrl(22.7277, 114.2661),
  // sz-010: Dawan Tulou — not found with sufficient confidence
  'sz-011': mapsUrl(22.5219, 113.9580),
  'sz-012': mapsUrl(22.5490, 114.0531),
  'sz-013': mapsUrl(22.5754, 114.1294),
  'sz-014': mapsUrl(22.5765, 114.1748),
  'sz-015': mapsUrl(22.5823, 114.2146),
  'sz-016': mapsUrl(22.5969, 114.5088),
  'sz-017': mapsUrl(22.5944, 114.3026),
  'sz-018': mapsUrl(22.5712, 113.9938),
  'sz-019': mapsUrl(22.5483, 114.0928),
  'sz-020': mapsUrl(22.5178, 113.9387),
  'sz-021': mapsUrl(22.6098, 114.1365),
  'sz-022': mapsUrl(22.5398, 114.1114),
  'sz-023': mapsUrl(22.5390, 114.0574),
  'sz-024': mapsUrl(22.5354, 114.1147),
  'sz-025': mapsUrl(22.4861, 113.9118),
  'sz-026': mapsUrl(22.5596, 114.0667),
  'sz-027': mapsUrl(22.5200, 113.9900),
  // sz-028: One Avenue — conflicting sources
  'sz-029': mapsUrl(22.5328, 114.1133),
  'sz-030': mapsUrl(22.5596, 114.0667),
  'sz-031': mapsUrl(22.5088, 113.9374),
  'sz-032': mapsUrl(22.5404, 114.1055),
  'sz-033': mapsUrl(22.5357, 114.0504),
  'sz-045': mapsUrl(22.2638, 113.5870),
  'sz-046': mapsUrl(22.2842, 113.5890),
  'sz-047': mapsUrl(22.2656, 113.5783),
  'sz-048': mapsUrl(22.1174, 113.3566),

  // Guangzhou
  'gz-001': mapsUrl(23.1089, 113.3189),
  'gz-002': mapsUrl(23.1174, 113.2659),
  'gz-003': mapsUrl(23.1262, 113.3193),
  'gz-004': mapsUrl(23.1179, 113.3167),
  'gz-005': mapsUrl(23.1172, 113.2547),
  'gz-006': mapsUrl(23.1116, 113.3248),
  'gz-007': mapsUrl(23.1298, 113.2405),
  'gz-008': mapsUrl(23.1094, 113.2394),
  'gz-009': mapsUrl(23.1173, 113.3214),
  'gz-010': mapsUrl(23.1403, 113.2556),
  'gz-011': mapsUrl(23.1180, 113.2326),
  'gz-012': mapsUrl(23.1282, 113.2606),
  'gz-013': mapsUrl(23.1579, 113.2933),
  'gz-014': mapsUrl(23.1428, 113.2603),
  'gz-015': mapsUrl(23.0641, 113.3353),
  'gz-016': mapsUrl(23.1222, 113.2299),
  'gz-017': mapsUrl(23.1819, 113.3897),
  'gz-018': mapsUrl(23.1228, 113.2676),
  'gz-019': mapsUrl(23.1029, 113.2348),
  'gz-020': mapsUrl(23.1147, 113.2483),
  'gz-021': mapsUrl(23.1151, 113.2482),
  'gz-022': mapsUrl(23.1364, 113.3269),
  'gz-023': mapsUrl(23.1130, 113.2572),
  'gz-024': mapsUrl(23.1353, 113.3193),
  'gz-025': mapsUrl(23.1166, 113.3218),
  'gz-026': mapsUrl(23.1271, 113.2909),
  'gz-027': mapsUrl(23.1322, 113.3283),
  'gz-028': mapsUrl(23.1179, 113.3235),
  'gz-029': mapsUrl(23.1315, 113.3319),
  'gz-030': mapsUrl(23.1149, 113.3283),
  'gz-031': mapsUrl(23.1166, 113.3218),
  'gz-032': mapsUrl(23.1050, 113.2650),
  'gz-033': mapsUrl(23.1179, 113.3235),
  'gz-034': mapsUrl(23.1060, 113.2425),
  'gz-035': mapsUrl(23.1139, 113.2458),
  'gz-036': mapsUrl(23.1165, 113.2363),
  'gz-037': mapsUrl(23.1211, 113.2358),
  'gz-038': mapsUrl(23.1165, 113.3218),
  'gz-039': mapsUrl(23.1191, 113.2676),
  'gz-040': mapsUrl(23.1080, 113.3150),
  'gz-041': mapsUrl(23.1238, 113.2444),
  'gz-042': mapsUrl(23.1135, 113.2429),
  'gz-043': mapsUrl(22.2856, 112.5658),

  // Foshan
  'fs-001': mapsUrl(23.035151, 113.116307),
  // fs-002: Wong Fei-hung Hall — inside Ancestral Temple complex, coords not independently verified
  'fs-003': mapsUrl(22.722423, 113.131138),
  'fs-004': mapsUrl(23.029928, 113.116285),
  // fs-005: Nanfeng Ancient Kiln — coords not verified with sufficient confidence
  'fs-006': mapsUrl(22.8379, 113.2501),
  'fs-007': mapsUrl(22.812778, 113.155000),
  'fs-008': mapsUrl(22.933101, 112.971725),
  'fs-009': mapsUrl(22.836900, 113.248200),
};

let updated = 0;
for (const [id, url] of Object.entries(mapsLinks)) {
  await db.collection('places').doc(id).update({ 'links.maps': url });
  console.log(`✓ ${id}`);
  updated++;
}

console.log(`\nDone. Updated ${updated} places with Google Maps links.`);
