import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import Anthropic from '@anthropic-ai/sdk';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { usePlan } from '../hooks/usePlan';
import { useInWindow } from '../contexts/InWindowContext';
import StoryDialog from './StoryDialog';

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

const client = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
});

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
  const [displayMessages, setDisplayMessages] = useState([
    { role: 'assistant', content: 'I can create or refine the trip plan. Tell me what you need — for example: "Create the plan" or "Adjust day 3 to include more time at Canton Tower".' },
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
    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 8096,
      system: buildSystemPrompt(places, votersByPlace, hotels),
      tools: [SAVE_PLAN_TOOL],
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
    if (toolUse && toolUse.name === 'save_plan') {
      let toolResult;
      try {
        await onPlanSaved(toolUse.input.content);
        toolResult = { type: 'tool_result', tool_use_id: toolUse.id, content: 'Plan saved successfully.' };
      } catch (err) {
        toolResult = { type: 'tool_result', tool_use_id: toolUse.id, content: `Error: ${err.message}`, is_error: true };
      }

      const nextMessages = [
        ...messages,
        { role: 'assistant', content: response.content },
        { role: 'user', content: [toolResult] },
      ];
      setApiMessages(nextMessages);
      await runTurn(nextMessages);
    } else {
      setApiMessages(prev => [...prev, { role: 'assistant', content: response.content }]);
    }
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

function makePlanComponents(placeMap, onOpenStory) {
  return {
    h2: HeadingWithId,
    tr: ({ children, ...props }) => {
      const cells = Array.isArray(children) ? children : [children];
      const realCells = cells.filter(c => c?.props);
      if (realCells.length < 2) return <tr {...props}>{children}</tr>;

      const placeText = extractText(realCells[1]?.props?.children);
      const place = findPlaceByText(placeText, placeMap);

      if (!place) return <tr {...props}>{children}</tr>;

      const hasLinks = [place.links?.source, place.links?.tripcom, place.links?.maps, place.links?.amap].some(Boolean);
      const hasAddr = !!place.address_zh;
      const hasStory = place.story?.length > 0;
      const hasExtras = hasLinks || hasAddr;

      if (!hasExtras && !hasStory) return <tr {...props}>{children}</tr>;

      // Inject story icon into the Place cell (2nd cell)
      const enhanced = hasStory
        ? cells.map((cell, i) => {
            if (i !== 1 || !cell?.props) return cell;
            return (
              <td key="place-cell" {...(cell.props.style ? { style: cell.props.style } : {})}>
                {cell.props.children}
                <StoryIcon onClick={() => onOpenStory(place)} />
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

export default function PlanTab({ places, votersByPlace, isAdmin }) {
  const { plan, loading, savePlan } = usePlan();
  const days = plan?.content ? parseDays(plan.content) : [];
  const [storyPlace, setStoryPlace] = useState(null);

  const placeMap = useMemo(() => {
    const map = new Map();
    places.forEach(p => map.set(p.id, p));
    return map;
  }, [places]);

  const openStory = useCallback((place) => setStoryPlace(place), []);
  const mdComponents = useMemo(() => makePlanComponents(placeMap, openStory), [placeMap, openStory]);

  return (
    <div className="plan-tab">
      <DayNav days={days} />
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
        <AdminChat places={places} votersByPlace={votersByPlace} onPlanSaved={savePlan} />
      )}
      {storyPlace && (
        <StoryDialog
          stories={storyPlace.story}
          placeName={storyPlace.name}
          onClose={() => setStoryPlace(null)}
        />
      )}
    </div>
  );
}
