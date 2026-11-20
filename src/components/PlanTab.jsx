import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { collection, getDocs, doc, getDoc, setDoc, addDoc, deleteDoc, writeBatch, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { usePlan } from '../hooks/usePlan';
import { useAuth } from '../auth';
import { useInWindow } from '../contexts/InWindowContext';
import StoryDialog from './StoryDialog';
import DayMapDialog from './DayMapDialog';
import { isDemoMode } from '../config';
import { callClaude } from '../services/claudeApi';

const SAVE_PLAN_TOOL = {
  name: 'save_plan',
  description: 'Save the generated trip itinerary to the database so all users can see it.',
  input_schema: {
    type: 'object',
    properties: {
      content: { type: 'string', description: 'Complete trip itinerary as markdown' },
    },
    required: ['content'],
  },
};

const BACKUP_DATABASE_TOOL = {
  name: 'backup_database',
  description: 'Save a snapshot of the current database (places, plan, hotels) to Firestore for later restoration.',
  input_schema: { type: 'object', properties: {} },
};

const RESTORE_DATABASE_TOOL = {
  name: 'restore_database',
  description: 'Restore the database from the latest snapshot. Replaces all current places, the plan, and hotels.',
  input_schema: { type: 'object', properties: {} },
};

function buildSystemPrompt(places, votersByPlace, hotels) {
  const votedPlaces = places
    .filter(p => votersByPlace.has(p.id) && p.type !== 'restaurant')
    .sort((a, b) => (votersByPlace.get(b.id)?.length || 0) - (votersByPlace.get(a.id)?.length || 0))
    .map(p => {
      const votes = votersByPlace.get(p.id)?.length || 0;
      return `- ${p.name} / ${p.name_zh || ''} (${p.city}, ${votes} vote${votes !== 1 ? 's' : ''}): ${p.description || ''} | Practical: ${p.practical || 'n/a'}`;
    });

  const restaurants = places
    .filter(p => p.type === 'restaurant')
    .map(p => `- ${p.name} (${p.city}): ${p.description || ''} | Price/person: ${p.price_per_person || 'unknown'}`);

  const hotelLines = hotels
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn))
    .map(h => `- ${h.checkIn} to ${h.checkOut}: ${h.name} (${h.city}) — ${h.currency} ${h.cost}`);

  return `You are a travel planner creating a detailed day-by-day itinerary for a group China trip (Shenzhen, Guangzhou, Foshan) in January 2027. Group size: 6 people.

TRIP DATES: Arrived 1 January 2027. Departure 15 January 2027 (no sightseeing that day). Plan sightseeing for Jan 2–14 (13 full days).

HOTEL BOOKINGS (plan activities near each hotel's city/area each day):
${hotelLines.join('\n') || 'No hotels saved yet'}
Note: the hotel location constrains which places are practical on which days. Start and end each day at the hotel where you're sleeping that night.

VOTED PLACES TO VISIT (sorted by votes, prioritize these):
${votedPlaces.join('\n') || 'None yet'}

SUGGESTED RESTAURANTS IN THE LIST (prioritize for meal suggestions):
${restaurants.join('\n') || 'None yet'}

PLANNING RULES:
- Jan 1 is arrival only — no sightseeing or planned activities on that day
- Start each sightseeing day at 09:00
- Format each day as ONE continuous markdown table with columns: Time | Place | Note | How to Get There
  CRITICAL: Do NOT break the table mid-day. The entire day's schedule must be ONE unbroken table. Do not insert headings, sub-tables, or any other block elements inside a day's table.
- Note column: brief description of the place + entrance ticket price if any + whether reservation is required
- How to Get There column: give 2 alternatives: (1) Metro route with estimated price for 6 people, (2) Didi with estimated price for 6 people
- Walking to/from a metro station: always add 10 extra minutes to compensate for navigation
- Walking through food/market/shopping areas: use slow walk pace (1.5 km/h ≈ ~40 min/km)
- Lunch (~12:00) and dinner (~18:30): in the Note cell for that time slot, list 5 nearby restaurant options as plain text (1. Name – style – price. 2. ...). Do NOT create a sub-table for restaurants.
- Group days by city when possible to minimize travel between cities.
- Be realistic about timing — don't over-schedule.

WORKFLOW — follow this strictly:
1. When asked to create or update the plan, first describe your intended approach in a short summary: which places on which days, rough day structure, any trade-offs you are making. Ask: "Does this look good? Should I proceed?"
2. Only call save_plan AFTER the user explicitly confirms (e.g. "yes", "go ahead", "looks good").
3. For refinements to an existing plan, briefly state what you will change and confirm before saving.`;
}

async function backupDatabase() {
  const [placesSnap, hotelsSnap, planSnap] = await Promise.all([
    getDocs(collection(db, 'places')),
    getDocs(collection(db, 'hotels')),
    getDoc(doc(db, 'plans', 'current')),
  ]);

  const places = placesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const hotels = hotelsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const plan = planSnap.exists() ? planSnap.data() : null;

  const snapshotId = `snapshot-${Date.now()}`;
  await setDoc(doc(db, 'snapshots', snapshotId), {
    createdAt: Timestamp.now(),
    places,
    hotels,
    plan,
  });
  // Also update "latest" pointer
  await setDoc(doc(db, 'snapshots', 'latest'), {
    createdAt: Timestamp.now(),
    places,
    hotels,
    plan,
  });
  return { snapshotId, placesCount: places.length };
}

async function restoreDatabase() {
  const latestSnap = await getDoc(doc(db, 'snapshots', 'latest'));
  if (!latestSnap.exists()) throw new Error('No snapshot found. Run a backup first.');

  const { places, hotels, plan } = latestSnap.data();

  // Delete all existing places
  const currentPlaces = await getDocs(collection(db, 'places'));
  const CHUNK = 400;
  for (let i = 0; i < currentPlaces.docs.length; i += CHUNK) {
    const batch = writeBatch(db);
    currentPlaces.docs.slice(i, i + CHUNK).forEach(d => batch.delete(d.ref));
    await batch.commit();
  }

  // Restore places from snapshot
  for (let i = 0; i < places.length; i += CHUNK) {
    const batch = writeBatch(db);
    places.slice(i, i + CHUNK).forEach(({ id, ...data }) => {
      batch.set(doc(db, 'places', id), data);
    });
    await batch.commit();
  }

  // Restore hotels
  const currentHotels = await getDocs(collection(db, 'hotels'));
  if (currentHotels.docs.length > 0) {
    const batch = writeBatch(db);
    currentHotels.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
  if (hotels.length > 0) {
    const batch = writeBatch(db);
    hotels.forEach(({ id, ...data }) => batch.set(doc(db, 'hotels', id), data));
    await batch.commit();
  }

  // Restore plan
  if (plan) {
    await setDoc(doc(db, 'plans', 'current'), plan);
  }

  return { placesRestored: places.length };
}

function ChatMessage({ msg }) {
  if (typeof msg.content !== 'string' || !msg.content.trim()) return null;
  return (
    <div className={`chat-msg chat-msg--${msg.role}`}>
      <div className="chat-bubble">
        <Markdown remarkPlugins={[remarkGfm]}>{msg.content.trim()}</Markdown>
      </div>
    </div>
  );
}

function AdminChat({ places, votersByPlace, onPlanSaved }) {
  const { user } = useAuth();
  const [displayMessages, setDisplayMessages] = useState([
    { role: 'assistant', content: isDemoMode
      ? 'I can create or refine the trip plan, and backup/restore the database. Try: "Create the plan", "backup database", or "restore-database".'
      : 'I can create or refine the trip plan. Tell me what you need — for example: "Create the plan" or "Adjust day 3 to include more time at Canton Tower".' },
  ]);
  const [apiMessages, setApiMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hotels, setHotels] = useState([]);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    getDocs(collection(db, 'hotels'))
      .then(snap => setHotels(snap.docs.map(d => d.data())))
      .catch(err => console.warn('Could not load hotels:', err.message));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayMessages, loading]);

  useEffect(() => {
    if (!loading) inputRef.current?.focus();
  }, [loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const newApiMessages = [...apiMessages, { role: 'user', content: text }];
    setDisplayMessages(prev => [...prev, { role: 'user', content: text }]);
    setApiMessages(newApiMessages);
    setInput('');
    setLoading(true);
    setError(null);
    try {
      await runTurn(newApiMessages);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function runTurn(messages) {
    const tools = isDemoMode
      ? [SAVE_PLAN_TOOL, BACKUP_DATABASE_TOOL, RESTORE_DATABASE_TOOL]
      : [SAVE_PLAN_TOOL];

    const response = await callClaude({
      max_tokens: 8096,
      system: buildSystemPrompt(places, votersByPlace, hotels),
      tools,
      messages,
    });

    const textContent = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n')
      .trim();

    if (textContent) {
      setDisplayMessages(prev => [...prev, { role: 'assistant', content: textContent }]);
    }

    const toolUse = response.content.find(b => b.type === 'tool_use');
    if (!toolUse) {
      setApiMessages(prev => [...prev, { role: 'assistant', content: response.content }]);
      return;
    }

    let toolResult;
    if (toolUse.name === 'save_plan') {
      try {
        await onPlanSaved(toolUse.input.content);
        toolResult = { type: 'tool_result', tool_use_id: toolUse.id, content: 'Plan saved successfully.' };
      } catch (err) {
        toolResult = { type: 'tool_result', tool_use_id: toolUse.id, content: `Error: ${err.message}`, is_error: true };
      }
    } else if (toolUse.name === 'backup_database') {
      try {
        const { snapshotId, placesCount } = await backupDatabase();
        toolResult = { type: 'tool_result', tool_use_id: toolUse.id, content: `Backup saved as "${snapshotId}" (${placesCount} places).` };
      } catch (err) {
        toolResult = { type: 'tool_result', tool_use_id: toolUse.id, content: `Error: ${err.message}`, is_error: true };
      }
    } else if (toolUse.name === 'restore_database') {
      try {
        const { placesRestored } = await restoreDatabase();
        toolResult = { type: 'tool_result', tool_use_id: toolUse.id, content: `Database restored from latest snapshot (${placesRestored} places).` };
      } catch (err) {
        toolResult = { type: 'tool_result', tool_use_id: toolUse.id, content: `Error: ${err.message}`, is_error: true };
      }
    } else {
      setApiMessages(prev => [...prev, { role: 'assistant', content: response.content }]);
      return;
    }

    const nextMessages = [
      ...messages,
      { role: 'assistant', content: response.content },
      { role: 'user', content: [toolResult] },
    ];
    setApiMessages(nextMessages);
    await runTurn(nextMessages);
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="plan-chat">
      <h4 className="plan-chat-heading">Plan assistant</h4>
      <div className="plan-chat-area">
        {displayMessages.map((msg, i) => <ChatMessage key={i} msg={msg} />)}
        {loading && (
          <div className="chat-msg chat-msg--assistant">
            <div className="chat-bubble"><p className="chat-thinking">Thinking…</p></div>
          </div>
        )}
        {error && (
          <div className="chat-msg chat-msg--system chat-msg--error">
            <p>Error: {error}</p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="plan-chat-input-row">
        <textarea
          ref={inputRef}
          className="chat-input"
          rows={2}
          placeholder="Give instructions to create or refine the plan…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          disabled={loading}
        />
        <button className="dialog-btn-primary" onClick={send} disabled={loading || !input.trim()}>
          Send
        </button>
      </div>
    </div>
  );
}

function parseDays(content) {
  if (!content) return [];
  const re = /^## (Jan \d+) \((\w+)\) — (.+)$/gm;
  const days = [];
  let m;
  while ((m = re.exec(content))) {
    const slug = m[1].toLowerCase().replace(' ', '-');
    days.push({ label: m[1], day: m[2].slice(0, 3), slug, title: m[3] });
  }
  return days;
}

function DayNav({ days }) {
  const [visible, setVisible] = useState(false);
  const [activeSlug, setActiveSlug] = useState(null);

  useEffect(() => {
    if (!days.length) return;

    function onScroll() {
      const sentinel = document.getElementById('plan-day-nav-sentinel');
      if (sentinel) {
        setVisible(sentinel.getBoundingClientRect().bottom < 0);
      }

      // find active day: last heading whose top is above 80px from viewport top
      let current = null;
      for (const d of days) {
        const el = document.getElementById(d.slug);
        if (el && el.getBoundingClientRect().top < 80) current = d.slug;
      }
      setActiveSlug(current);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // check immediately
    return () => window.removeEventListener('scroll', onScroll);
  }, [days]);

  if (!days.length) return null;

  return (
    <nav className={`plan-day-nav${visible ? ' plan-day-nav--visible' : ''}`}>
      {days.map(d => (
        <button
          key={d.slug}
          className={`plan-day-nav-btn${activeSlug === d.slug ? ' active' : ''}`}
          title={`${d.label} — ${d.title}`}
          onClick={() => {
            const el = document.getElementById(d.slug);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
        >
          {d.label.replace('Jan ', '')}
        </button>
      ))}
    </nav>
  );
}

function HeadingWithId({ children, ...props }) {
  const text = String(children);
  const m = text.match(/^(Jan \d+)/);
  const id = m ? m[1].toLowerCase().replace(' ', '-') : undefined;
  return <h2 id={id} {...props}>{children}</h2>;
}

function extractText(node) {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (node?.props?.children) return extractText(node.props.children);
  return '';
}

function findPlaceByText(text, placeMap) {
  if (!text) return null;
  const t = text.trim();
  if (!t || t.length < 2) return null;
  // Try exact Chinese name match
  for (const p of placeMap.values()) {
    if (p.name_zh && t.includes(p.name_zh)) return p;
  }
  // Try English name match (case-insensitive, partial)
  const lower = t.toLowerCase();
  for (const p of placeMap.values()) {
    if (lower.includes(p.name.toLowerCase())) return p;
  }
  return null;
}

const SKIP_PLACE = /^(Travel|Lunch|Dinner|Return|Check|Free|Final|Breakfast|Coffee|Rest|Pack|Morning|Optional)/i;

function extractDayLabels(planContent) {
  if (!planContent) return [];
  const matches = [...planContent.matchAll(/^## ((?:Jan|Feb|Mar) \d+) /mg)];
  return matches.map(m => m[1]);
}

function dayLabelToDate(dayLabel) {
  // "Jan 5" → "2027-01-05"
  const parts = dayLabel.trim().split(' ');
  const months = { Jan: '01', Feb: '02', Mar: '03' };
  const mon = months[parts[0]] || '01';
  const day = String(parseInt(parts[1], 10)).padStart(2, '0');
  return `2027-${mon}-${day}`;
}

function findHotelsForDay(hotels, dayLabel) {
  const date = dayLabelToDate(dayLabel);
  // Start hotel: where you slept the night before this day
  //   → checkIn <= date AND checkOut >= date (still at hotel at start of this day)
  //   If two hotels match (transit day), prefer the one checking OUT today
  const candidates = hotels.filter(h => h.checkIn <= date && h.checkOut >= date && h.lat && h.lng);
  const startHotel = candidates.find(h => h.checkOut === date) ?? candidates[0] ?? null;
  // End hotel: where you sleep tonight
  //   → checkIn <= date AND checkOut > date
  const endHotel = hotels.find(h => h.checkIn <= date && h.checkOut > date && h.lat && h.lng) ?? null;
  return { startHotel, endHotel };
}

function extractDayPois(planContent, dayLabel, placeMap, hotels = []) {
  if (!planContent || !dayLabel) return [];
  const startMatch = planContent.match(new RegExp(`^## ${dayLabel} `, 'm'));
  if (!startMatch) return [];
  const start = startMatch.index;
  const rest = planContent.slice(start + 1);
  const nextMatch = rest.match(/^## Jan /m);
  const section = planContent.slice(start, start + 1 + (nextMatch ? nextMatch.index : rest.length));

  const pois = [];
  const seen = new Set();
  for (const line of section.split('\n')) {
    if (!line.startsWith('|') || line.includes('---')) continue;
    const cells = line.split('|').map(c => c.trim()).filter(Boolean);
    if (cells.length < 2 || cells[0] === 'Time' || cells[1] === 'Place') continue;
    const rawName = cells[1].replace(/\*\*/g, '').replace(/\[([^\]]+)\]\([^)]+\)/, '$1').trim();
    if (rawName.length < 3 || SKIP_PLACE.test(rawName)) continue;
    const place = findPlaceByText(rawName, placeMap);
    if (!place || seen.has(place.id)) continue;
    const mapsUrl = place.links?.maps;
    if (!mapsUrl) continue;
    const m = mapsUrl.match(/[?&]q=([-\d.]+),([-\d.]+)/);
    if (!m) continue;
    seen.add(place.id);
    pois.push({ name: place.name, lat: parseFloat(m[1]), lng: parseFloat(m[2]), type: 'place' });
  }

  // Prepend start hotel, append end hotel
  if (hotels.length > 0) {
    const { startHotel, endHotel } = findHotelsForDay(hotels, dayLabel);
    if (startHotel) {
      pois.unshift({ name: startHotel.name, lat: startHotel.lat, lng: startHotel.lng, type: 'hotel' });
    }
    if (endHotel) {
      const isSameAsStart = startHotel && endHotel.name === startHotel.name;
      pois.push({ name: isSameAsStart ? `${endHotel.name} (return)` : endHotel.name, lat: endHotel.lat, lng: endHotel.lng, type: 'hotel' });
    }
  }

  return pois;
}

const LINK_LABELS = {
  'tripadvisor.com': 'TripAdvisor',
  'en.wikipedia.org': 'Wikipedia',
  'trip.com': 'Trip.com',
  'guide.michelin.com': 'Michelin',
  'maps.google.com': 'Google Maps',
  'amap.com': 'Amap',
};

function PlanLinkIcon({ url }) {
  const { openUrl } = useInWindow();
  if (!url) return null;
  let domain;
  try { domain = new URL(url).hostname.replace(/^www\./, ''); } catch { return null; }
  const label = LINK_LABELS[domain] ?? domain;
  return (
    <a className="place-icon-link" href={url} title={label} onClick={e => { e.preventDefault(); openUrl(url); }}>
      <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=16`} alt={label} width="14" height="14" />
    </a>
  );
}

function PlanPlaceLinks({ place }) {
  const urls = [place.links?.source, place.links?.tripcom, place.links?.maps, place.links?.amap].filter(Boolean);
  if (!urls.length) return null;
  return (
    <div className="place-icons plan-place-icons">
      {urls.map(url => <PlanLinkIcon key={url} url={url} />)}
    </div>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button className="copy-addr-btn" onClick={handleCopy} title="Copy address for Didi">
      {copied
        ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
      }
    </button>
  );
}

function StoryIcon({ onClick }) {
  return (
    <button className="story-icon-btn" onClick={onClick} title="Read story">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    </button>
  );
}

function PaymentIcon() {
  return (
    <span className="payment-icon" title="Paid entry">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="1" />
        <path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m5.08 0l4.24-4.24M1 12h6m6 0h6m-1.78 7.78l-4.24-4.24m-5.08 0l-4.24 4.24" />
      </svg>
    </span>
  );
}

function ReservationIcon() {
  return (
    <span className="reservation-icon" title="Reservation required">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    </span>
  );
}

function DayMapButton({ onClick }) {
  return (
    <button className="day-map-btn" onClick={onClick} title="View day map">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
        <line x1="8" y1="2" x2="8" y2="18" />
        <line x1="16" y1="6" x2="16" y2="22" />
      </svg>
    </button>
  );
}

function AddStoryButton({ onClick }) {
  return (
    <button className="add-story-btn" onClick={onClick} title="Add story">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    </button>
  );
}

function StorySpinner() {
  return (
    <div className="story-spinner-wrap">
      <svg className="story-spinner" viewBox="0 0 50 50" width="48" height="48">
        <circle className="story-spinner-track" cx="25" cy="25" r="20" fill="none" strokeWidth="4" />
        <circle className="story-spinner-arc" cx="25" cy="25" r="20" fill="none" strokeWidth="4" strokeLinecap="round" />
      </svg>
      <span className="story-spinner-label">Conjuring stories…</span>
    </div>
  );
}

function ConfirmAddStoryDialog({ place, generating, error, onConfirm, onCancel }) {
  return (
    <div className="confirm-story-overlay" onClick={generating ? undefined : onCancel}>
      <div className="confirm-story-dialog" onClick={e => e.stopPropagation()}>
        {generating ? (
          <StorySpinner />
        ) : (
          <>
            <p className="confirm-story-title">Generate stories for <strong>{place.name}</strong>?</p>
            <p className="confirm-story-sub">Claude Sonnet will research and write 1–2 stories about this place.</p>
            {error && <p className="confirm-story-error">{error}</p>}
            <div className="confirm-story-actions">
              <button className="dialog-btn-secondary" onClick={onCancel}>Cancel</button>
              <button className="dialog-btn-primary" onClick={onConfirm}>Yes, generate</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function makePlanComponents(placeMap, onOpenStory, isAdmin, onAddStory, onOpenDayMap) {
  return {
    h2: ({ children, ...props }) => {
      const text = String(children);
      const m = text.match(/^(Jan \d+)/);
      const id = m ? m[1].toLowerCase().replace(' ', '-') : undefined;
      return (
        <h2 id={id} className="plan-day-heading" {...props}>
          <span>{children}</span>
          {m && <DayMapButton onClick={() => onOpenDayMap(m[1])} />}
        </h2>
      );
    },
    tr: ({ children, ...props }) => {
      const cells = Array.isArray(children) ? children : [children];
      const realCells = cells.filter(c => c?.props);
      if (realCells.length < 2) return <tr {...props}>{children}</tr>;

      const placeText = extractText(realCells[1]?.props?.children);
      const place = findPlaceByText(placeText, placeMap);

      if (!place) return <tr {...props}>{children}</tr>;

      const hasLinks = [place.links?.source, place.links?.tripcom, place.links?.maps, place.links?.amap].some(Boolean);
      const hasAddr = !!place.address_zh;
      const hasStory = place.stories?.length > 0;
      const hasPayment = place.needs_payment;
      const hasReservation = place.needs_reservation;
      const showAddStory = isAdmin && !hasStory;
      const hasExtras = hasLinks || hasAddr;

      if (!hasExtras && !hasStory && !hasPayment && !hasReservation && !showAddStory) return <tr {...props}>{children}</tr>;

      // Inject icons into the Place cell (2nd cell)
      const enhanced = (hasStory || hasPayment || hasReservation || showAddStory)
        ? cells.map((cell, i) => {
            if (i !== 1 || !cell?.props) return cell;
            return (
              <td key="place-cell" {...(cell.props.style ? { style: cell.props.style } : {})}>
                <span className="place-title-with-badges">
                  {cell.props.children}
                  {hasPayment && <PaymentIcon />}
                  {hasReservation && <ReservationIcon />}
                  {hasStory && <StoryIcon onClick={() => onOpenStory(place)} />}
                  {showAddStory && <AddStoryButton onClick={() => onAddStory(place)} />}
                </span>
              </td>
            );
          })
        : children;

      return (
        <tr {...props} className={hasExtras ? 'plan-card--has-extras' : undefined}>
          {enhanced}
          {hasExtras && (
            <td className="plan-card-extras">
              {hasLinks && <PlanPlaceLinks place={place} />}
              {hasAddr && (
                <span className="plan-card-address">
                  {place.address_zh}
                  <CopyButton text={place.address_zh} />
                </span>
              )}
            </td>
          )}
        </tr>
      );
    },
  };
}

function PlanHistory({ listVersions, recallVersion }) {
  const [versions, setVersions] = useState(null);
  const [open, setOpen] = useState(false);
  const [recalling, setRecalling] = useState(null);
  const [error, setError] = useState(null);

  async function load() {
    setError(null);
    try {
      const vs = await listVersions();
      setVersions(vs);
      setOpen(true);
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleRecall(v) {
    if (!window.confirm(`Restore "${v.name}"? This will replace the current plan.`)) return;
    setRecalling(v.id);
    setError(null);
    try {
      await recallVersion(v.id);
      setOpen(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setRecalling(null);
    }
  }

  return (
    <div className="plan-history">
      <button className="plan-history-toggle" onClick={open ? () => setOpen(false) : load}>
        {open ? 'Hide history' : 'Plan history'}
      </button>
      {error && <p className="plan-history-error">{error}</p>}
      {open && versions && (
        <ul className="plan-history-list">
          {versions.length === 0 && <li className="plan-history-empty">No saved versions yet.</li>}
          {versions.map(v => (
            <li key={v.id} className="plan-history-item">
              <span className="plan-history-name">{v.name || v.id}</span>
              <span className="plan-history-date">
                {v.createdAt ? new Date(v.createdAt.seconds * 1000).toLocaleDateString() : ''}
              </span>
              <button
                className="plan-history-recall"
                onClick={() => handleRecall(v)}
                disabled={recalling === v.id}
              >
                {recalling === v.id ? 'Restoring…' : 'Restore'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function PlanTab({ places, votersByPlace, isAdmin, isGuest }) {
  const { status } = useAuth();
  const { plan, loading, savePlan, listVersions, recallVersion } = usePlan(status === 'allowed');
  const days = plan?.content ? parseDays(plan.content) : [];
  const [storyPlace, setStoryPlace] = useState(null);
  const [pendingStoryPlace, setPendingStoryPlace] = useState(null);
  const [generatingStory, setGeneratingStory] = useState(false);
  const [storyGenError, setStoryGenError] = useState(null);
  const [addedStories, setAddedStories] = useState({});
  const [dayMapInfo, setDayMapInfo] = useState(null); // { dayLabel, pois }
  const [hotels, setHotels] = useState([]);

  useEffect(() => {
    if (status !== 'allowed') return;
    getDocs(collection(db, 'hotels'))
      .then(snap => setHotels(snap.docs.map(d => d.data())))
      .catch(() => {});
  }, [status]);

  const placeMap = useMemo(() => {
    const map = new Map();
    places.forEach(p => {
      const override = addedStories[p.id];
      map.set(p.id, override ? { ...p, stories: override } : p);
    });
    return map;
  }, [places, addedStories]);

  const openStory = useCallback((place) => setStoryPlace(place), []);
  const openAddStory = useCallback((place) => {
    setStoryGenError(null);
    setPendingStoryPlace(place);
  }, []);
  const openDayMap = useCallback((dayLabel) => {
    const pois = extractDayPois(plan?.content, dayLabel, placeMap, hotels);
    const allDayLabels = extractDayLabels(plan?.content);
    const dayIndex = allDayLabels.indexOf(dayLabel);
    setDayMapInfo({ dayLabel, pois, allDayLabels, dayIndex });
  }, [plan?.content, placeMap, hotels]);
  const mdComponents = useMemo(
    () => makePlanComponents(placeMap, openStory, isAdmin, openAddStory, openDayMap),
    [placeMap, openStory, isAdmin, openAddStory, openDayMap],
  );

  async function generateAndSaveStory() {
    if (!pendingStoryPlace) return;
    const place = pendingStoryPlace;
    setGeneratingStory(true);
    setStoryGenError(null);
    try {
      const response = await callClaude({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        system: `You are a travel writer creating engaging stories for a China travel app.
Write vivid, informative stories (each 150–250 words) about places in Shenzhen, Guangzhou, and Foshan.
Focus on history, legends, cultural significance, or interesting facts that bring the place to life.
Return ONLY a valid JSON array with this structure — no other text, no markdown code fences:
[{"title":"...", "text":"..."}, ...]
Write 1–2 stories per place. Use plain paragraphs in the text field (no markdown).`,
        messages: [{
          role: 'user',
          content: `Write stories for this place:
Name: ${place.name}
Chinese name: ${place.name_zh || '(none)'}
City: ${place.city}
Description: ${place.description || '(none)'}
Practical info: ${place.practical || '(none)'}`,
        }],
      });

      const textContent = response.content?.find(b => b.type === 'text')?.text?.trim() || '';
      const jsonMatch = textContent.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('Could not parse stories from Claude response.');
      const stories = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(stories) || stories.length === 0) throw new Error('No stories returned.');

      await updateDoc(doc(db, 'places', place.id), { stories });
      setAddedStories(prev => ({ ...prev, [place.id]: stories }));
      setPendingStoryPlace(null);
      setStoryPlace({ ...place, stories });
    } catch (err) {
      setStoryGenError(err.message);
    } finally {
      setGeneratingStory(false);
    }
  }

  return (
    <div className="plan-tab">
      <DayNav days={days} />
      {plan?.name && (
        <div className="plan-version-bar">
          <span className="plan-version-name">{plan.name}</span>
        </div>
      )}
      <div className="plan-display">
        {loading
          ? <p className="loading">Loading plan…</p>
          : plan?.content
            ? <>
                <div id="plan-day-nav-sentinel" style={{ height: 1 }} />
                <Markdown remarkPlugins={[remarkGfm]} components={mdComponents}>{plan.content}</Markdown>
              </>
            : <p className="plan-empty">No plan has been created yet.{isAdmin ? ' Use the assistant below to create one.' : ' Check back later.'}</p>
        }
      </div>
      {isAdmin && (
        <>
          <PlanHistory listVersions={listVersions} recallVersion={recallVersion} />
          <AdminChat places={places} votersByPlace={votersByPlace} onPlanSaved={savePlan} />
        </>
      )}
      {storyPlace && (
        <StoryDialog
          stories={storyPlace.stories}
          placeName={storyPlace.name}
          isGuest={isGuest}
          onClose={() => setStoryPlace(null)}
        />
      )}
      {dayMapInfo && (
        <DayMapDialog
          pois={dayMapInfo.pois}
          dayTitle={dayMapInfo.dayLabel}
          onClose={() => setDayMapInfo(null)}
          hasPrev={dayMapInfo.dayIndex > 0}
          hasNext={dayMapInfo.dayIndex < dayMapInfo.allDayLabels.length - 1}
          onPrev={() => openDayMap(dayMapInfo.allDayLabels[dayMapInfo.dayIndex - 1])}
          onNext={() => openDayMap(dayMapInfo.allDayLabels[dayMapInfo.dayIndex + 1])}
        />
      )}
      {pendingStoryPlace && (
        <ConfirmAddStoryDialog
          place={pendingStoryPlace}
          generating={generatingStory}
          error={storyGenError}
          onConfirm={generateAndSaveStory}
          onCancel={() => { if (!generatingStory) { setPendingStoryPlace(null); setStoryGenError(null); } }}
        />
      )}
    </div>
  );
}
