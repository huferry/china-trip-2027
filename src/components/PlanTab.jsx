import { useState, useRef, useEffect } from 'react';
import Anthropic from '@anthropic-ai/sdk';
import Markdown from 'react-markdown';
import { usePlan } from '../hooks/usePlan';

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

function buildSystemPrompt(places, votersByPlace) {
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

  return `You are a travel planner creating a detailed day-by-day itinerary for a group China trip (Shenzhen, Guangzhou, Foshan) in January 2027. Group size: 6 people.

VOTED PLACES TO VISIT (sorted by votes, prioritize these):
${votedPlaces.join('\n') || 'None yet'}

SUGGESTED RESTAURANTS IN THE LIST (prioritize for meal suggestions):
${restaurants.join('\n') || 'None yet'}

PLANNING RULES:
- Start each day at 09:00
- Format the itinerary using markdown tables with columns: Time | Place | Note | How to Get There
- Note column: brief description of the place + entrance ticket price if any + whether reservation is required
- How to Get There column: give 2 alternatives: (1) Metro route with estimated price for 6 people, (2) Didi (taxi/rideshare) with estimated price for 6 people
- Walking to/from a metro station: always add 10 extra minutes to compensate for navigation
- Walking through food/market/shopping areas: use slow walk pace (1.5 km/h ≈ ~40 min/km)
- For lunch (around 12:00) and dinner (around 18:30): suggest 5 nearby restaurants. Prioritize restaurants from the suggested list above. Keep price mix — at most 2 options above $30/person.
- When creating or updating the plan, always call the save_plan tool with the full updated plan markdown.
- Group days by city when possible to minimize travel between cities.
- Be realistic about timing — don't over-schedule.`;
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
        <Markdown>{msg.content.trim()}</Markdown>
      </div>
    </div>
  );
}

function AdminChat({ places, votersByPlace, onPlanSaved }) {
  const [displayMessages, setDisplayMessages] = useState([
    { role: 'assistant', content: 'I can create or refine the trip plan. Tell me what you need — for example: "Create a 7-day plan" or "Adjust day 3 to include more time at Canton Tower".' },
  ]);
  const [apiMessages, setApiMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

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
      system: buildSystemPrompt(places, votersByPlace),
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

export default function PlanTab({ places, votersByPlace, isAdmin }) {
  const { plan, loading, savePlan } = usePlan();

  if (loading) return <p className="loading">Loading plan…</p>;

  return (
    <div className="plan-tab">
      <div className="plan-display">
        {plan?.content
          ? <Markdown>{plan.content}</Markdown>
          : <p className="plan-empty">No plan has been created yet.{isAdmin ? ' Use the assistant below to create one.' : ' Check back later.'}</p>
        }
      </div>
      {isAdmin && (
        <AdminChat places={places} votersByPlace={votersByPlace} onPlanSaved={savePlan} />
      )}
    </div>
  );
}
