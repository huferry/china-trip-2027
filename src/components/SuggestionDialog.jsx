import { useState, useEffect, useRef } from 'react';
import Anthropic from '@anthropic-ai/sdk';
import Markdown from 'react-markdown';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../auth';

const INITIAL_MESSAGE = "Name the place you want to suggest. Describe it as clearly as possible — mention the name, location, and a small description if you can.";

const ADD_PLACE_TOOL = {
  name: 'add_place',
  description: 'Add a confirmed place to the trip database. Only call this after the user has explicitly confirmed the place is correct.',
  input_schema: {
    type: 'object',
    properties: {
      name:        { type: 'string', description: 'English name of the place' },
      name_zh:     { type: 'string', description: 'Chinese name of the place' },
      city:        { type: 'string', description: 'City (Shenzhen, Guangzhou, or Foshan)' },
      category:    { type: 'string', description: 'Category as shown in the app' },
      type:        { type: 'string', description: 'Always "place"' },
      area:        { type: ['string', 'null'], description: 'District or area, or null' },
      rating:      { type: 'number', description: 'Rating from 1 to 5' },
      description: { type: 'string', description: 'What makes this place worth visiting' },
      practical:   { type: 'string', description: 'Opening hours and useful tips' },
      links: {
        type: 'object',
        properties: {
          source: { type: 'string', description: 'Source URL' },
          photos: { type: 'string', description: 'Wikimedia Commons search URL for photos' },
        },
        required: ['source', 'photos'],
      },
    },
    required: ['name', 'name_zh', 'city', 'category', 'type', 'rating', 'description', 'practical', 'links'],
  },
};

function buildSystemPrompt(city, category, existingPlaces) {
  const existing = existingPlaces.map(p => p.name).join(', ') || 'none yet';
  return `You are a travel assistant helping plan a China trip to ${city}. \
The user wants to suggest a new place for the "${category}" category.

Already on the list in this category: ${existing}

Your task:
1. Listen to the user's description of a place.
2. Using your knowledge of ${city}, China, identify the specific place they mean.
3. Present it clearly: English name, Chinese name, a short description, practical info (opening hours / tips), and a rating out of 5.
4. Ask the user: "Is this the place you meant?"
5. If yes — call the add_place tool to save it. If no — ask them to clarify and try again.
6. Refuse to add a place already on the list above.
7. Keep replies concise and friendly.
8. For the photos link, construct a Wikimedia Commons URL: https://commons.wikimedia.org/w/index.php?search=Place+Name+City&title=Special:MediaSearch&type=image`;
}

function Message({ msg }) {
  if (typeof msg.content !== 'string') return null;
  const text = msg.content.trim();
  if (!text) return null;
  return (
    <div className={`chat-msg chat-msg--${msg.role}`}>
      <div className="chat-bubble">
        <Markdown>{text}</Markdown>
      </div>
    </div>
  );
}

const client = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
});

export default function SuggestionDialog({ city, category, existingPlaces, onClose, onPlaceAdded }) {
  const { user } = useAuth();
  // displayMessages: what we show in the UI
  const [displayMessages, setDisplayMessages] = useState([
    { role: 'assistant', content: INITIAL_MESSAGE },
  ]);
  // apiMessages: what we send to the API (excludes the initial greeting)
  const [apiMessages, setApiMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);
  const [addError, setAddError] = useState(null);
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
    if (!text || loading || added) return;

    const newApiMessages = [...apiMessages, { role: 'user', content: text }];
    setDisplayMessages(prev => [...prev, { role: 'user', content: text }]);
    setApiMessages(newApiMessages);
    setInput('');
    setLoading(true);
    setAddError(null);

    try {
      await runTurn(newApiMessages);
    } catch (err) {
      setAddError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function runTurn(messages) {
    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      system: buildSystemPrompt(city, category, existingPlaces),
      tools: [ADD_PLACE_TOOL],
      messages,
    });

    // Extract text blocks for display
    const textContent = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n')
      .trim();

    if (textContent) {
      setDisplayMessages(prev => [...prev, { role: 'assistant', content: textContent }]);
    }

    // Handle tool use
    const toolUse = response.content.find(b => b.type === 'tool_use');
    if (toolUse && toolUse.name === 'add_place') {
      const placeData = toolUse.input;
      let toolResult;

      try {
        const ref = await addDoc(collection(db, 'places'), {
          ...placeData,
          suggestedBy: user.email,
          suggestedAt: Timestamp.now(),
        });
        onPlaceAdded({ id: ref.id, ...placeData });
        setAdded(true);
        toolResult = { type: 'tool_result', tool_use_id: toolUse.id, content: 'Place added successfully.' };
      } catch (err) {
        toolResult = { type: 'tool_result', tool_use_id: toolUse.id, content: `Error: ${err.message}`, is_error: true };
        setAddError(err.message);
      }

      // Let Claude respond after tool execution
      const nextMessages = [
        ...messages,
        { role: 'assistant', content: response.content },
        { role: 'user', content: [toolResult] },
      ];
      setApiMessages(nextMessages);

      if (!addError) {
        await runTurn(nextMessages);
      }
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
    <div className="dialog-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="dialog">
        <div className="dialog-header">
          <span>Suggest a place — <em>{category}</em></span>
          <button className="dialog-close" onClick={onClose}>✕</button>
        </div>

        <div className="chat-area">
          {displayMessages.map((msg, i) => <Message key={i} msg={msg} />)}
          {loading && (
            <div className="chat-msg chat-msg--assistant">
              <div className="chat-bubble"><p className="chat-thinking">Thinking…</p></div>
            </div>
          )}
          {added && (
            <div className="chat-msg chat-msg--system">
              <p>✓ Place added successfully!</p>
            </div>
          )}
          {addError && (
            <div className="chat-msg chat-msg--system chat-msg--error">
              <p>Failed to save: {addError}</p>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="dialog-footer">
          {added ? (
            <button className="dialog-btn-primary" onClick={onClose}>Close</button>
          ) : (
            <>
              <textarea
                ref={inputRef}
                className="chat-input"
                rows={2}
                placeholder="Describe the place…"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                disabled={loading}
              />
              <div className="dialog-actions">
                <button className="dialog-btn-cancel" onClick={onClose}>Cancel</button>
                <button className="dialog-btn-primary" onClick={send} disabled={loading || !input.trim()}>
                  Send
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
