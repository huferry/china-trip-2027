/**
 * Create plan v2 (5 days Shenzhen, 9 days Guangzhou).
 *
 * What it does:
 *  1. Reads the current plans/current document and saves it as planVersions/v1
 *  2. Builds v2 plan content:
 *       - Jan 5: strip GZ travel; add evening back in Shenzhen
 *       - Jan 6: new SZ Natural History Museum + afternoon travel to GZ
 *       - Jan 7–14: shift old Jan 6–13 by +1 day (update date & day-of-week)
 *       - Jan 14: old "Easy Final Day" dropped
 *       - Jan 15: departure unchanged
 *  3. Saves v2 to planVersions/v2 and sets it as plans/current
 *
 * Run once: node scripts/create-plan-v2.mjs
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { readFile } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const sa = JSON.parse(await readFile(resolve(__dir, '../service-account.json'), 'utf-8'));
const app = initializeApp({ credential: cert(sa) });
const db = getFirestore(app);

// ── helpers ────────────────────────────────────────────────────────────────

const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function dayName(janDay) {
  // The existing plan treats Jan 1 2027 as Thursday (index 4)
  // dayName(1)=Thursday, dayName(2)=Friday, dayName(7)=Wednesday, etc.
  return DAY_NAMES[(4 + janDay - 1) % 7];
}

/** Split plan content into a map of { 'Jan N' → section_text } keeping order */
function splitSections(content) {
  const re = /(?=^## Jan \d+)/gm;
  const parts = content.split(re).filter(Boolean);
  const sections = new Map();
  for (const part of parts) {
    const m = part.match(/^## Jan (\d+)/);
    if (m) sections.set(parseInt(m[1], 10), part);
  }
  return sections;
}

/** Update the ## Jan N (DayName) header of a section to a new day number */
function reheaderSection(sectionText, newDayNum) {
  const newDayNameStr = dayName(newDayNum);
  return sectionText.replace(
    /^## Jan \d+ \(\w+\)/m,
    `## Jan ${newDayNum} (${newDayNameStr})`,
  );
}

// ── new Jan 5 (SZ only, no travel to GZ) ──────────────────────────────────

function buildJan5(originalJan5) {
  // Trim at "| 14:45" (checkout row) and replace with evening rows
  const cutMarker = '| 14:45';
  const cutIdx = originalJan5.indexOf(cutMarker);
  if (cutIdx === -1) throw new Error('Could not find | 14:45 cut marker in Jan 5');

  const header = originalJan5
    .split('\n')[0]
    .replace('→ Travel to Guangzhou', '')
    .trim();

  const before = originalJan5.substring(0, cutIdx);
  const eveningRows = `| 15:00–15:30 | Return to hotel | Head back to Atour Hotel for a rest before dinner. | ① Metro: Hi-Tech Park area (Line 1) to Civic Center (transfer Line 4). ~¥18 (6×¥3). ~25 min. ② Didi: ~¥35–40, ~20 min |
| 15:30–18:00 | Rest at hotel | Free afternoon — recharge before tomorrow's departure. | On site |
| 18:00–19:30 | Farewell dinner in Shenzhen | Last dinner in Shenzhen. 1. Fan Lou – handmade dim sum – ~¥85/person 2. Runyuan Four Seasons Coconut Chicken – chicken in coconut water – ~¥100/person 3. Jin Yue Xuan – polished dim sum – ~¥113/person 4. Da Ge Fan (大鸽饭) – crispy pigeon, Cantonese – ~¥100/person 5. Chun Man Yuan – reliable Cantonese dim sum – ~¥65/person | Walk (~5–10 min from hotel) |
| 19:30–20:00 | Return to hotel | — | Walk (~5 min) |

---

`;

  // Replace first line with updated header
  const lines = before.split('\n');
  lines[0] = header;
  return lines.join('\n') + eveningRows;
}

// ── new Jan 6 (SZ Natural History Museum + travel to GZ) ──────────────────

const NEW_JAN6 = `## Jan 6 (Wednesday) — Shenzhen: Natural History Museum → Travel to Guangzhou

| Time | Place | Note | How to Get There |
|------|-------|------|-----------------|
| 09:00–10:00 | Travel to Shenzhen Natural History Museum | Far east in Pingshan — allow ~1 hr from hotel. | ① Metro: Civic Center Stn (Line 4) to Futian Stn, transfer Line 16 to Shaba Stn, Exit D. ~¥36 (6×¥6). ~60 min. ② Didi: ~¥80–100, ~45 min |
| 10:00–13:00 | Shenzhen Natural History Museum / 深圳自然博物馆 | World-class museum opened 2024 with enormous permanent galleries: minerals, dinosaurs, marine life and biodiversity. Paid ticket ~¥80/person (¥480 for 6). Book via WeChat Mini Program in advance — time slots required. Allow 2.5–3 hrs. | Walk from Shaba Stn Exit D (~10 min) |
| 13:00–13:45 | Lunch near Shaba station | Grab lunch before heading back. 1. Noodle shops near Shaba metro – ~¥30–40/person 2. Mall food court near museum exit – ~¥50–70/person 3. Convenience store picnic – ~¥20/person 4. Fast-casual restaurant near Pingshan – ~¥50–80/person 5. Skip and eat near Futian station – ~¥60–100/person | Walk (~10 min from museum) |
| 13:45–14:50 | Return to hotel, check out | Reverse metro route. Collect luggage from Atour Hotel Futian. | ① Metro: Shaba Stn (Line 16) back to Civic Center. ~¥36 (6×¥6). ~60 min. ② Didi: ~¥80–100, ~45 min |
| 14:50–15:05 | Travel to Futian Railway Station | — | Walk from hotel (~10 min) or metro 1 stop |
| 15:05–15:50 | High-speed train Futian → Guangzhou South | ~35–40 min. 2nd class ~¥82/person (¥492 for 6). Book on 12306 app or Trip.com in advance. | Walk to Futian Railway Station (~10 min from hotel) |
| 15:50–16:50 | Travel from Guangzhou South to Canton Hotel | — | ① Metro: Guangzhou South Stn (Line 2) to Gongyuanqian Stn, transfer Line 6 to Beijing Road Stn. ~¥30 (6×¥5). ~50 min. ② Didi: ~¥80–100, ~40 min |
| 16:50–17:20 | Check into Canton Hotel Guangzhou | On Beijing Road. Settle in. | On site |
| 17:20–18:30 | Beijing Road / 北京路 | The city's oldest shopping street with glass panels showing 1,000 years of road layers underfoot. Liveliest after 18:00. Free. Slow-pace stroll. | Walk from hotel (~2 min) |
| 18:30–19:45 | Dinner on/near Beijing Road | First dinner in Guangzhou. 1. Tao Tao Ju – century-old teahouse, har gow, char siu bao – ~¥120/person 2. Guangzhou Restaurant – most famous Cantonese since 1935 – ~¥200/person 3. Yin Ji Rice Rolls – silky rice rolls, congee – ~¥30/person 4. Dian Dou De – all-day dim sum – ~¥80/person 5. Nanxin Milk Desserts – double-skin milk, ginger curd (dessert stop) – ~¥20/person | Walk (~5–10 min within Beijing Road area) |
| 19:45–20:00 | Return to hotel | — | Walk (~2 min) |

---

`;

// ── main ──────────────────────────────────────────────────────────────────

const currentSnap = await db.collection('plans').doc('current').get();
if (!currentSnap.exists) throw new Error('plans/current not found');

const currentData = currentSnap.data();
const v1Name = 'v1 - 4 days Shenzhen - 10 days Guangzhou';

// 1. Save/update v1 — use planVersions/v1 if already saved, else use current
let originalContent;
const v1Snap = await db.collection('planVersions').doc('v1').get();
if (v1Snap.exists) {
  console.log('planVersions/v1 already exists — using it as source');
  originalContent = v1Snap.data().content;
} else {
  originalContent = currentData.content;
  await db.collection('planVersions').doc('v1').set({
    content: originalContent,
    name: v1Name,
    version: 'v1',
    createdAt: currentData.updatedAt ?? Timestamp.now(),
  });
  console.log('✓ Saved current plan as planVersions/v1');
}

// 2. Build v2 content
const sections = splitSections(originalContent);

const intro = originalContent.substring(0, originalContent.indexOf('## Jan 1'));

const jan1  = sections.get(1);
const jan2  = sections.get(2);
const jan3  = sections.get(3);
const jan4  = sections.get(4);
const jan5  = buildJan5(sections.get(5));
const jan6  = NEW_JAN6;
// Old Jan 6–13 → new Jan 7–14
const jan7  = reheaderSection(sections.get(6),  7);
const jan8  = reheaderSection(sections.get(7),  8);
const jan9  = reheaderSection(sections.get(8),  9);
const jan10 = reheaderSection(sections.get(9),  10);
const jan11 = reheaderSection(sections.get(10), 11);
const jan12 = reheaderSection(sections.get(11), 12);
const jan13 = reheaderSection(sections.get(12), 13);
const jan14 = reheaderSection(sections.get(13), 14);
// Old Jan 14 (Easy Final Day) dropped
const jan15 = sections.get(15);

// Update the title line
const v2Intro = intro.replace(
  'January 1–15, 2027',
  'January 1–15, 2027',  // dates unchanged — same range, different split
);

// Update the Summary table (replace Jan N references for shifted days)
let v2Content = [
  v2Intro, jan1, jan2, jan3, jan4, jan5, jan6,
  jan7, jan8, jan9, jan10, jan11, jan12, jan13, jan14, jan15,
].join('');

// Fix the Summary section: shift day references
v2Content = v2Content
  .replace(/\| Jan 6 \|/g,  '| Jan 7 |')
  .replace(/\| Jan 7 \|/g,  '| Jan 8 |')
  .replace(/\| Jan 8 \|/g,  '| Jan 9 |')
  .replace(/\| Jan 9 \|/g,  '| Jan 10 |')
  .replace(/\| Jan 10 \|/g, '| Jan 11 |')
  .replace(/\| Jan 11 \|/g, '| Jan 12 |')
  .replace(/\| Jan 12 \|/g, '| Jan 13 |')
  .replace(/\| Jan 13 \|/g, '| Jan 14 |');

// Fix header intro line to reflect new split
v2Content = v2Content.replace(
  /^# China Trip Itinerary:.*$/m,
  '# China Trip Itinerary: January 1–15, 2027',
);

const v2Name = 'v2 - 5 days Shenzhen - 9 days Guangzhou';

// 3. Save v2 to planVersions
await db.collection('planVersions').doc('v2').set({
  content: v2Content,
  name: v2Name,
  version: 'v2',
  createdAt: Timestamp.now(),
});
console.log('✓ Saved new plan as planVersions/v2');

// 4. Set v2 as the current plan
await db.collection('plans').doc('current').set({
  content: v2Content,
  name: v2Name,
  updatedAt: Timestamp.now(),
});
console.log('✓ Set v2 as plans/current');

// Also update v1 in plans/current (add name) — already done by step 4 replacing with v2
// But update v1's name on the old current snapshot isn't needed since we stored it in planVersions already.

console.log('\nDone! Current plan is now:', v2Name);
console.log('v1 is stored in planVersions/v1 and can be restored from the app.');

process.exit(0);
