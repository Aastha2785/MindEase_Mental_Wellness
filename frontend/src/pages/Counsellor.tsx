import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, HeartHandshake, LoaderCircle, Send, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../lib/api';

type Message = { id: number; senderRole: 'student' | 'admin'; message: string; createdAt: string };
type Thread = { session: { sessionId: number; consentGiven: boolean; createdAt: string } | null; messages: Message[] };
const stamp = (date: string) => new Date(date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

export default function Counsellor() {
  const token = localStorage.getItem('mindease_token') ?? '';
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState('');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!token) { setError('Please log in to use counsellor chat.'); setLoading(false); return; }
    apiRequest<Thread>('/api/counselling/me', 'GET', { token })
      .then((data) => { setMessages(data.messages); setConsent(Boolean(data.session?.consentGiven)); })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not load conversation.'))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!consent) { setError('Please read and accept the privacy notice before sending.'); return; }
    if (!message.trim() || sending) return;
    setSending(true); setError('');
    try {
      const result = await apiRequest<{ message: Message }>('/api/counselling/messages', 'POST', { token, body: { message: message.trim(), consent: true } });
      setMessages((old) => [...old, result.message]); setMessage('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not send your message.'); }
    finally { setSending(false); }
  }
  return <section className="page-section">
    <Link className="back-link" to="/"><ArrowLeft size={15} /> Back to dashboard</Link>
    <div className="card" style={{ maxWidth: 900, margin: '0 auto', padding: 0, overflow: 'hidden' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 13, padding: 20, borderBottom: '1px solid var(--border-color, #e5e7eb)' }}>
        <div className="icon-tile mint"><HeartHandshake size={24} /></div><div style={{ flex: 1 }}><h1 style={{ margin: 0, fontSize: 22 }}>Talk to a Counsellor</h1><p className="muted" style={{ margin: '5px 0 0', fontSize: 13 }}>Private in-app conversation · Replies may not be immediate</p></div><ShieldCheck color="#059669" size={22} />
      </header>
      <div style={{ margin: 16, padding: 14, borderRadius: 12, background: 'var(--surface-secondary, #ecfdf5)', color: '#12352B', fontSize: 13, lineHeight: 1.65 }}>
        <strong style={{ color: '#12352B' }}>Privacy notice</strong><p style={{ margin: '6px 0', color: '#244A3B' }}>Messages you send are stored in MindEase V3 and can be read by an authorized admin account in the counsellor inbox. The inbox shows a session number instead of your username, but identifying details you write in a message may reveal who you are. These messages are not automatically added to your journals or mood reports. This is not an emergency service.</p>
        <label style={{ display: 'flex', gap: 9, alignItems: 'flex-start', cursor: 'pointer' }}><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 4 }} /><span style={{ color: '#244A3B' }}>I understand and consent to sharing messages I send with the authorized admin counsellor.</span></label>
      </div>
      <div aria-live="polite" style={{ height: 'min(48vh, 480px)', minHeight: 250, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading && <p className="muted"><LoaderCircle size={16} style={{ display: 'inline' }} /> Loading conversation…</p>}
        {!loading && messages.length === 0 && <div style={{ margin: 'auto', textAlign: 'center', maxWidth: 380, padding: 24 }}><HeartHandshake size={30} color="#059669" style={{ margin: '0 auto 10px' }} /><h2 style={{ fontSize: 17 }}>Start whenever you're ready</h2><p className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>Share only what feels comfortable. A human response may take time.</p></div>}
        {messages.map((m) => { const mine = m.senderRole === 'student'; return <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}><div style={{ maxWidth: '82%', padding: 12, borderRadius: 14, background: mine ? 'var(--chat-user-bg, #ccfbf1)' : 'var(--chat-ai-bg, #f3f4f6)', color: 'var(--text-primary, #1f2937)', overflowWrap: 'anywhere' }}><strong style={{ display: 'block', fontSize: 11, marginBottom: 5 }}>{mine ? 'You' : 'Counsellor'}</strong><p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: 14 }}>{m.message}</p><span className="muted" style={{ display: 'block', fontSize: 10, marginTop: 6 }}>{stamp(m.createdAt)}</span></div></div>; })}
        <div ref={bottom} />
      </div>
      {error && <p role="alert" style={{ color: '#dc2626', fontSize: 13, margin: '0 16px 12px' }}>{error}</p>}
      <form onSubmit={submit} style={{ display: 'flex', gap: 10, padding: 16, borderTop: '1px solid var(--border-color, #e5e7eb)' }}><textarea aria-label="Message to counsellor" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={4000} rows={2} placeholder="Write a message…" disabled={sending} style={{ flex: 1, minWidth: 0, resize: 'vertical', border: '1px solid var(--border-color, #d1d5db)', borderRadius: 12, padding: 12, background: 'var(--surface-color, transparent)', color: 'var(--text-primary, inherit)' }} /><button type="submit" aria-label="Send message" disabled={sending || !message.trim()} style={{ border: 0, borderRadius: 12, padding: '0 16px', background: '#059669', color: 'white', opacity: sending || !message.trim() ? .6 : 1 }}>{sending ? <LoaderCircle size={18} /> : <Send size={18} />}</button></form>
    </div>
  </section>;
}
