import { useEffect, useRef, useState } from 'react';
import { askAnalyst } from '../../lib/api.js';

const SUGGESTIONS = [
  'What’s attacking me right now?',
  'Did anything get past the WAF?',
  'What changed since yesterday?',
  'Write a short incident summary',
];

// Three bouncing dots shown while the analyst is thinking.
function Dots() {
  return (
    <span className="inline-flex items-center gap-1 py-1" aria-label="Analyzing">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-mute"
          style={{ animationDelay: `${i * 160}ms`, animationDuration: '1s' }}
        />
      ))}
    </span>
  );
}

function Answer({ msg }) {
  const full = msg.text || '';
  const [shown, setShown] = useState(msg.animate ? '' : full);

  // Typewriter reveal for a freshly arrived answer.
  useEffect(() => {
    if (!msg.animate) {
      setShown(full);
      return undefined;
    }
    let i = 0;
    setShown('');
    const id = setInterval(() => {
      i += 2;
      setShown(full.slice(0, i));
      if (i >= full.length) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [full, msg.animate]);

  const done = shown.length >= full.length;

  return (
    <div>
      <p className="whitespace-pre-line text-[15px] leading-[1.7] text-fg">{shown}</p>
      {done && msg.stats?.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-9">
          {msg.stats.map((s, i) => (
            <div key={i}>
              <div className="font-mono text-[18px] font-semibold tabular-nums">{s.n}</div>
              <div className="mt-0.5 text-[11.5px] text-mute">{s.label}</div>
            </div>
          ))}
        </div>
      )}
      {done && msg.source && (
        <>
          <div className="my-4 h-px bg-line" />
          <div className="font-mono text-[11px] text-mute">{msg.source}</div>
        </>
      )}
    </div>
  );
}

export default function Analyst() {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Ask me about your live traffic — who’s attacking, what got through, what changed in the last day.' },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, busy]);

  async function send(text) {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    // Conversation so far (before this question) becomes the model's memory.
    const history = messages.filter((m) => m.text).slice(-8).map((m) => ({ role: m.role, content: m.text }));
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: q }]);
    setBusy(true);
    try {
      const r = await askAnalyst(q, history);
      setMessages((m) => [...m, { role: 'assistant', text: r.answer, stats: r.stats, source: r.source, animate: true }]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', text: 'I couldn’t reach the live data just now.\n\nCheck that the backend is running and try again.', animate: true }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex justify-center">
      <div className="flex min-h-[74vh] w-full max-w-[640px] flex-col justify-between">
        <div className="flex items-center gap-3.5 pb-2">
          <span className="text-[15px] font-semibold tracking-[-0.01em]">SOC Analyst</span>
          <span className="font-mono text-[10.5px] tracking-[0.14em] text-mute">LIVE</span>
        </div>

        <div className="flex flex-1 flex-col gap-6 py-6">
          {messages.map((m, i) =>
            m.role === 'user' ? (
              <div key={i} className="max-w-[78%] self-end text-[14.5px] leading-[1.5] text-fg2">
                {m.text}
              </div>
            ) : (
              <Answer key={i} msg={m} />
            ),
          )}
          {busy && <Dots />}
          <div ref={endRef} />
        </div>

        <div className="flex flex-col gap-3 pt-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex items-center gap-3 rounded-xl border border-line py-1 pl-4 pr-2"
          >
            <input
              id="analyst-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your traffic…"
              className="h-11 flex-1 bg-transparent text-[14px] text-fg outline-none placeholder:text-mute"
            />
            <button
              type="submit"
              aria-label="Send"
              disabled={busy || !input.trim()}
              className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-fg text-[15px] text-bg disabled:opacity-40"
            >
              ↑
            </button>
          </form>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                disabled={busy}
                className="rounded-full border border-line2 px-3 py-1.5 text-[12.5px] text-fg2 hover:bg-chip disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
