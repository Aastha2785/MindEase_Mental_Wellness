import { ArrowLeft, Sparkles } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const descriptions: Record<string, string> = {
  '/profile': 'Your profile details and profile picture will be managed here.',
  '/settings': 'Manage your theme, privacy, consent and reminder preferences here.',
  '/daily-analysis': 'Your daily mood summary and relevant recommendations will appear here after eligible chatbot analysis.',
  '/tasks': 'Create and manage tasks. We will require a due date and time before a task can be added.',
  '/journaling': 'Write private reflections and review your journal history.',
  '/meditation': 'Choose a breathing session, set a duration and optionally finish with a gentle bell.',
  '/counsellor': 'Start a private in-app counselling conversation with an anonymous session ID.',
  '/ai-chat': 'Talk with your AI companion. Eligible mood-analysis results will update your daily and weekly reports.',
  '/face-scan': 'Take an optional selfie for a just-for-fun expression estimate. It will not affect mood reports.',
  '/history': 'Review your past eligible mood reports and wellness activities.',
};

export default function PlaceholderPage() {
  const location = useLocation();
  const title = location.pathname.split('/').filter(Boolean).map(s => s.replace(/-/g, ' ')).map(s => s.replace(/\b\w/g, c => c.toUpperCase())).join(' ') || 'Dashboard';
  return <section className="page-section placeholder-page">
    <Link className="back-link" to="/"><ArrowLeft size={15} /> Back to dashboard</Link>
    <div className="placeholder-card card">
      <span className="icon-tile mint"><Sparkles size={22} /></span>
      <h1>{title}</h1>
      <p>{descriptions[location.pathname] ?? 'This feature will be implemented and tested in a later phase.'}</p>
      <span className="muted">Page route is ready. Feature logic is not implemented yet.</span>
    </div>
  </section>;
}
