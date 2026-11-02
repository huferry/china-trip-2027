#!/usr/bin/env node
/**
 * Generates a trip plan using Claude and saves it to Firestore.
 * Usage: node scripts/create-plan.mjs "your instruction"
 */
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');

// Load env vars from .env
const env = readFileSync(join(root, '.env'), 'utf8');
const getEnv = key => env.match(new RegExp(`^${key}=(.+)$`, 'm'))?.[1];

const serviceAccount = JSON.parse(readFileSync(join(root, 'service-account.json'), 'utf8'));
initializeApp({ credential: cert(serviceAccount), projectId: 'huferry-china-trip' });
const db = getFirestore();

const client = new Anthropic({ apiKey: getEnv('VITE_ANTHROPIC_API_KEY') });

const userInstruction = process.argv[2] || 'Create the full trip plan.';

// ── Fetch data ────────────────────────────────────────────
console.log('Fetching data from Firestore…');
const [placesSnap, wishlistsSnap, usersSnap, hotelsSnap] = await Promise.all([
  db.collection('places').get(),
  db.collection('wishlists').get(),
  db.collection('allowedUsers').get(),
  db.collection('hotels').get(),
]);

const places = placesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
const hotels = hotelsSnap.docs.map(d => d.data()).sort((a, b) => a.checkIn.localeCompare(b.checkIn));

const nameByEmail = new Map();
for (const d of usersSnap.docs) {
  const { displayName } = d.data();
  const firstName = displayName ? displayName.split(' ')[0] : d.id.split('@')[0];
  nameByEmail.set(d.id, firstName);
}

const votersByPlace = new Map();
for (const d of wishlistsSnap.docs) {
  const firstName = nameByEmail.get(d.id) ?? d.id.split('@')[0];
  for (const pid of (d.data().items ?? [])) {
    if (!votersByPlace.has(pid)) votersByPlace.set(pid, []);
    votersByPlace.get(pid).push(firstName);
  }
}

// ── Build system prompt ───────────────────────────────────
const votedPlaces = places
  .filter(p => votersByPlace.has(p.id) && p.type !== 'restaurant')
  .sort((a, b) => (votersByPlace.get(b.id)?.length || 0) - (votersByPlace.get(a.id)?.length || 0))
  .map(p => {
    const votes = votersByPlace.get(p.id)?.length || 0;
    const voters = votersByPlace.get(p.id)?.join(', ') || '';
    return `- ${p.name} / ${p.name_zh || ''} (${p.city}, ${votes} vote${votes !== 1 ? 's' : ''} by ${voters}): ${p.description || ''} | Practical: ${p.practical || 'n/a'}`;
  });

const restaurants = places
  .filter(p => p.type === 'restaurant')
  .map(p => `- ${p.name} (${p.city}): ${p.description || ''} | Price/person: ${p.price_per_person || 'unknown'}`);

const hotelLines = hotels.map(h => `- ${h.checkIn} to ${h.checkOut}: ${h.name} (${h.city}) — ${h.currency} ${h.cost}`);

const systemPrompt = `You are a travel planner creating a detailed day-by-day itinerary for a group China trip (Shenzhen, Guangzhou, Foshan) in January 2027. Group size: 6 people.

TRIP DATES: Arrived 1 January 2027. Departure 15 January 2027 (no sightseeing that day). Plan sightseeing for Jan 2–14 (13 full days).

HOTEL BOOKINGS (plan activities near each hotel's city/area):
${hotelLines.join('\n')}
Start and end each day at the hotel where you're sleeping that night.

VOTED PLACES TO VISIT (sorted by votes, prioritize these):
${votedPlaces.join('\n') || 'None yet'}

SUGGESTED RESTAURANTS (prioritize for meal suggestions):
${restaurants.join('\n') || 'None yet'}

PLANNING RULES:
- Start each day at 09:00
- Format the itinerary using markdown tables with columns: Time | Place | Note | How to Get There
- Note column: brief description + entrance ticket price if any + reservation required if any
- How to Get There: give 2 alternatives: (1) Metro route with price for 6 people, (2) Didi (taxi) with price for 6 people
  EXCEPTION: For Foshan days, the group rents a car — state "Rental car" instead of metro/Didi for Foshan activities
- Walking to/from metro station: add 10 extra minutes to compensate for navigation
- Walking through food/market/shopping areas: slow pace (1.5 km/h ≈ 40 min/km)
- Lunch (~12:00) and dinner (~18:30): suggest 5 nearby restaurants; prioritize the list above; at most 2 above $30/person
- Group Foshan day(s) together since a car is rented for that
- Be realistic — don't over-schedule

When the user asks you to create the plan, call the save_plan tool with the complete markdown.`;

// ── Call Claude (streaming, no tool use — capture full text) ──
console.log('Calling Claude…\n');

async function generate(messages) {
  let fullText = '';
  const stream = client.messages.stream({
    model: 'claude-opus-4-6',
    max_tokens: 16000,
    system: systemPrompt,
    messages,
  });

  stream.on('text', chunk => {
    process.stdout.write(chunk);
    fullText += chunk;
  });

  await stream.finalMessage();
  console.log('\n');
  return fullText.trim();
}

// Step 1: get outline
const outline = await generate([{ role: 'user', content: userInstruction + '\n\nFirst, give a brief outline of your plan (which places on which days). Do NOT write the full plan yet.' }]);

// Step 2: auto-confirm and generate full plan
console.log('\n[Outline received — asking for full plan…]\n');
const plan = await generate([
  { role: 'user', content: userInstruction + '\n\nFirst, give a brief outline of your plan (which places on which days). Do NOT write the full plan yet.' },
  { role: 'assistant', content: outline },
  { role: 'user', content: 'Looks great, go ahead and write the complete detailed plan now.' },
]);

// Step 3: save to Firestore
await db.collection('plans').doc('current').set({ content: plan, updatedAt: Timestamp.now() });
console.log('✓ Plan saved to Firestore.\nDone.');
