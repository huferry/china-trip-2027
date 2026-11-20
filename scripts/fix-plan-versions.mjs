/**
 * Fix plan v1/v2 day names and ensure correct content in Firestore.
 *
 * Run once: node scripts/fix-plan-versions.mjs
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

// Correct day-of-week mapping for the original plan's convention (Jan 1 = Thursday)
const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
function dayName(janDay) {
  return DAY_NAMES[(4 + janDay - 1) % 7];
}

// ── Fix v2 (current) ───────────────────────────────────────────────────────
// The day names for Jan 6-14 are off because the original script used JS Date
// (Jan 1 2027 = Friday) instead of the plan's convention (Jan 1 = Thursday).
//
// Wrong → Correct:
//  Jan 6 (Tuesday) → Jan 6 (Wednesday)   [hardcoded NEW_JAN6 bug]
//  Jan 7 (Thursday) → Jan 7 (Wednesday)
//  Jan 8 (Friday)   → Jan 8 (Thursday)
//  Jan 9 (Saturday) → Jan 9 (Friday)
//  Jan 10 (Sunday)  → Jan 10 (Saturday)
//  Jan 11 (Monday)  → Jan 11 (Sunday)
//  Jan 12 (Tuesday) → Jan 12 (Monday)
//  Jan 13 (Wednesday) → Jan 13 (Tuesday)
//  Jan 14 (Thursday) → Jan 14 (Wednesday)

const currentSnap = await db.collection('plans').doc('current').get();
let v2Content = currentSnap.data().content;

// Fix all day headers by rebuilding them with correct day names
v2Content = v2Content.replace(/^(## Jan (\d+)) \(\w+\)/gm, (_, prefix, num) => {
  return `${prefix} (${dayName(parseInt(num, 10))})`;
});

await db.collection('plans').doc('current').set({
  ...currentSnap.data(),
  content: v2Content,
  updatedAt: Timestamp.now(),
});
console.log('✓ Fixed day names in plans/current (v2)');

// ── Rebuild v1 (original plan) ─────────────────────────────────────────────
// The original plan had:
//  - Jan 1–4: same as v2
//  - Jan 5: Red Bridge Park + MixC World → Travel to Guangzhou (with GZ arrival)
//  - Jan 6–13: Guangzhou days (now stored as Jan 7–14 in v2)
//  - Jan 14: Easy Final Day
//  - Jan 15: Departure

// Get the fixed v2 sections
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

function reheaderSection(sectionText, newDayNum) {
  return sectionText.replace(
    /^## Jan \d+ \(\w+\)/m,
    `## Jan ${newDayNum} (${dayName(newDayNum)})`,
  );
}

const v2Sections = splitSections(v2Content);
const intro = v2Content.substring(0, v2Content.indexOf('## Jan 1'));

// Original Jan 5 content (restored from memory — was split as day + GZ arrival)
const ORIGINAL_JAN5 = `## Jan 5 (Monday) — Shenzhen: Red Bridge Park + MixC World → Travel to Guangzhou

| Time | Place | Note | How to Get There |
|------|-------|------|-----------------|
| 09:00–10:15 | Travel to Hongqiao (Red Bridge) Park | Guangming District — roughly 1 hr from hotel. Monday = weekday, less crowded ✓. | ① Metro: Civic Center Stn (Line 4) to Fenghuang Town Stn (凤凰城站, Line 6, transfer at Shangmeilin). Exit B. ~¥36 (6×¥6). ~65 min. ② Didi: ~¥80–100, ~45 min |
| 10:15–12:00 | Hongqiao (Red Bridge) Park / 光明红桥公园 | 4 km red elevated walkway (5 m wide, ~8 m high) curving over lakes and forest. Award-winning design, very photogenic. Free. Open 06:00–22:00. Walk the full loop ~1.5 hrs. | Walk from metro Exit B (~10 min) |
| 12:00–13:00 | Travel to MixC World, Nanshan | — | ① Metro: Fenghuang Town Stn (Line 6) toward Songgang, transfer to Line 1 at Qianhai Bay, to Hi-Tech Park area. ~¥36 (6×¥6). ~55 min. ② Didi: ~¥70–90, ~40 min |
| 13:00–14:00 | Lunch at MixC World / 万象天地 | Open-air design-led lifestyle mall with trendy food. 1. Da Ge Fan (大鸽饭) – crispy pigeon – ~¥100/person 2. Dimlar – steamed dim sum, char siu pastry – ~¥55/person 3. Fan Lou – handmade dim sum – ~¥85/person 4. Various trendy restaurants within MixC World – ~¥80–120/person 5. Chun Man Yuan – Cantonese dim sum – ~¥65/person | Walk from metro (~10 min) |
| 14:00–14:45 | Browse MixC World | Stroll the open-air lanes, design shops, art installations. Free. | On site |
| 14:45–15:15 | Return to hotel, check out | Collect luggage from Atour Hotel Futian. | ① Metro: Hi-Tech Park area (Line 1) to Civic Center (transfer Line 4). ~¥18 (6×¥3). ~25 min. ② Didi: ~¥35–40, ~20 min |
| 15:15–15:30 | Travel to Futian Railway Station | — | Walk from hotel (~10 min) or metro 1 stop |
| 15:30–16:15 | High-speed train Futian → Guangzhou South | ~35–40 min. 2nd class ~¥82/person (¥492 for 6). Book on 12306 app or Trip.com in advance. | Walk to Futian Railway Station (~10 min from hotel) |
| 16:15–17:15 | Travel from Guangzhou South to Canton Hotel | — | ① Metro: Guangzhou South Stn (Line 2) to Gongyuanqian Stn, transfer Line 6 to Beijing Road Stn. ~¥30 (6×¥5). ~50 min. ② Didi: ~¥80–100, ~40 min |
| 17:15–17:45 | Check into Canton Hotel Guangzhou | On Beijing Road. Settle in. | On site |
| 17:45–19:00 | Beijing Road / 北京路 | The city's oldest shopping street with glass panels showing 1,000 years of road layers underfoot. Hotel is right on it. Liveliest after 18:00. Free. Slow-pace stroll. | Walk from hotel (~2 min) |
| 19:00–20:00 | Dinner on/near Beijing Road | Heart of old Guangzhou, many classic options. 1. Tao Tao Ju – century-old teahouse, har gow, char siu bao – ~¥120/person 2. Guangzhou Restaurant – most famous Cantonese since 1935 – ~¥200/person 3. Yin Ji Rice Rolls – silky rice rolls, congee – ~¥30/person 4. Dian Dou De – all-day dim sum – ~¥80/person 5. Nanxin Milk Desserts – double-skin milk, ginger curd (dessert stop) – ~¥20/person | Walk (~5–10 min within Beijing Road area) |
| 20:00–20:15 | Return to hotel | — | Walk (~2 min) |

---

`;

// Original Jan 14: Easy Final Day (restored from earlier read)
const ORIGINAL_JAN14 = `## Jan 14 (Wednesday) — Guangzhou: Easy Final Day

| Time | Place | Note | How to Get There |
|------|-------|------|-----------------|
| 09:00–10:30 | Final morning dim sum | Relaxed last yum cha in Guangzhou. 1. Lei Garden (Taikoo Hui) – Michelin 1★ – ~¥550/person 2. Dian Dou De – reliable dim sum – ~¥80/person 3. Tao Tao Ju – classic teahouse – ~¥120/person 4. Fa Sing Garden – Bib Gourmand – ~¥125/person 5. Yin Ji Rice Rolls – silky rolls, congee – ~¥30/person | Walk (~5–10 min from hotel) |
| 10:30–12:00 | Last-minute shopping at Taikoo Hui | Pick up any final gifts, souvenirs, or treats. Visit Fangsuo Commune bookstore one last time. | Walk (~2 min from hotel) |
| 12:00–13:00 | Lunch near hotel | Light, easy lunch before packing. 1. Dian Dou De – dim sum – ~¥80/person 2. Yin Ji Rice Rolls – quick and light – ~¥30/person 3. Nanxin Milk Desserts – sweet finish – ~¥20/person 4. Taikoo Hui food court – various options – ~¥60–100/person 5. BingSheng Mansion – one last roast goose – ~¥400/person | Walk (~2–5 min) |
| 13:00–16:00 | ☕ Free afternoon / rest / pack | Final packing, rest before departure day tomorrow. Organize luggage, charge devices. | Hotel |
| 16:00–17:30 | Optional: sunset walk to Huacheng Square | One last look at the Guangzhou skyline as the lights come on. | Walk (~10 min) |
| 17:30–18:00 | Return to hotel | — | Walk (~10 min) |
| 18:00–19:30 | Final dinner near hotel | Casual, comforting last meal. 1. Lei Garden – Michelin 1★ claypot rice – ~¥550/person 2. Wisca – sizzling claypot – ~¥275/person 3. Fa Sing Garden – Bib Gourmand – ~¥125/person 4. Dian Dou De – dim sum – ~¥80/person 5. E Qian Ya Hou – white-cut goose – ~¥70/person | Walk (~5–10 min) |
| 19:30–20:00 | Return to hotel — early night | Rest up for departure day. | Walk (~2 min) |

---

`;

// Build v1: Jan 1–4 (from v2, unchanged) + original Jan 5 + old Jan 6–13 (from v2 Jan 7–14) + original Jan 14 + Jan 15
const v1Content = [
  intro,
  v2Sections.get(1),  // Jan 1
  v2Sections.get(2),  // Jan 2
  v2Sections.get(3),  // Jan 3
  v2Sections.get(4),  // Jan 4
  ORIGINAL_JAN5,
  reheaderSection(v2Sections.get(7),  6),   // old Jan 7 → Jan 6
  reheaderSection(v2Sections.get(8),  7),   // old Jan 8 → Jan 7
  reheaderSection(v2Sections.get(9),  8),   // old Jan 9 → Jan 8
  reheaderSection(v2Sections.get(10), 9),   // old Jan 10 → Jan 9
  reheaderSection(v2Sections.get(11), 10),  // old Jan 11 → Jan 10
  reheaderSection(v2Sections.get(12), 11),  // old Jan 12 → Jan 11
  reheaderSection(v2Sections.get(13), 12),  // old Jan 13 → Jan 12
  reheaderSection(v2Sections.get(14), 13),  // old Jan 14 → Jan 13
  ORIGINAL_JAN14,
  v2Sections.get(15), // Jan 15 Departure
].join('');

const v1Name = 'v1 - 4 days Shenzhen - 10 days Guangzhou';
await db.collection('planVersions').doc('v1').set({
  content: v1Content,
  name: v1Name,
  version: 'v1',
  createdAt: Timestamp.fromDate(new Date('2026-10-24')), // approximate original date
});
console.log('✓ Rebuilt planVersions/v1 with original plan content');

// Also save a corrected v2 to planVersions
const v2Name = 'v2 - 5 days Shenzhen - 9 days Guangzhou';
await db.collection('planVersions').doc('v2').set({
  content: v2Content,
  name: v2Name,
  version: 'v2',
  createdAt: Timestamp.now(),
});
console.log('✓ Updated planVersions/v2 with corrected day names');

console.log('\nVerify day headers:');
const re = /^## Jan \d+ .+$/gm;
let m;
while ((m = re.exec(v2Content)) !== null) console.log(' ', m[0]);

process.exit(0);
