import { ArrowUpRight, BarChart3, CalendarDays, Camera, CheckCircle2, CheckSquare, Heart, Lightbulb, MessageCircle, Plus, Sparkles, Wind, BookOpen, Brain } from 'lucide-react';
import { Link } from 'react-router-dom';

const featureCards = [
  { title: 'Journaling', description: 'Write your thoughts', to: '/journaling', icon: BookOpen, color: 'blue' },
  { title: 'Daily Mood Analysis', description: 'View today’s insight', to: '/daily-analysis', icon: Heart, color: 'purple' },
  { title: 'Face Scan', description: 'Just for fun', to: '/face-scan', icon: Camera, color: 'pink', badge: 'FUN' },
  { title: 'Talk to a Counsellor', description: 'Anonymous support', to: '/counsellor', icon: Heart, color: 'coral' },
  { title: 'Personal AI Agent', description: 'Chat about your mood', to: '/ai-chat', icon: Brain, color: 'mint' },
  { title: 'Weekly Analysis', description: 'Explore 4 emotions', to: '/weekly-analysis', icon: BarChart3, color: 'purple' },
  { title: 'History', description: 'Past activities', to: '/history', icon: CalendarDays, color: 'amber' },
  { title: 'Meditation & Breathing', description: 'Relax and refocus', to: '/meditation', icon: Wind, color: 'green' },
];

export default function Dashboard() {
  return (
    <>
      <section className="welcome-row">
        <div>
          <div className="eyebrow"><span className="eyebrow-dot" /> YOUR DAILY CHECK-IN</div>
          <h1>Good morning! <span className="wave">✦</span></h1>
          <p>How are you feeling today? Write in your journal or talk to your AI companion.</p>
        </div>
        <div className="welcome-art" aria-hidden="true"><div className="art-sun" /><div className="art-leaf leaf-one" /><div className="art-leaf leaf-two" /><div className="art-face">☺</div></div>
      </section>

      <section className="metric-grid">
        <article className="card mood-card">
          <div className="card-heading"><div><span className="icon-tile purple"><BarChart3 size={18} /></span><h2>Overall Mood Trend</h2></div><span className="small-select">Last 7 days</span></div>
          <p className="muted">Your mood over the last 7 days</p>
          <div className="bar-chart dashboard-bars" aria-label="Mood trend placeholder chart">
            {[35, 55, 40, 70, 86, 68, 50].map((height, i) => <div className="bar-wrap" key={i}><div className={`bar bar-${i}`} style={{ height: `${height}%` }} /><span>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</span></div>)}
          </div>
          <div className="chart-legend">Illustrative preview · real data will appear after analysis</div>
        </article>

        <article className="card stress-card">
          <div className="card-heading"><div><span className="icon-tile coral"><Heart size={18} /></span><h2>Stress & Anxiety</h2></div></div>
          <p className="muted">From eligible AI mood analysis</p>
          <div className="gauge"><div className="gauge-track" /><div className="gauge-label"><strong>—</strong><span>Awaiting check-in</span></div></div>
          <p className="fine-print">Your result appears after a mood check-in.</p>
        </article>

        <article className="card insight-card">
          <div className="card-heading"><div><span className="icon-tile mint"><Sparkles size={18} /></span><h2>Daily Insight</h2></div></div>
          <p className="insight-copy">Your daily insight will appear here after your mood check-in. It will summarize how you seem to be feeling in 2–3 short lines.</p>
          <Link className="text-link" to="/daily-analysis">View daily analysis <ArrowUpRight size={15} /></Link>
        </article>
      </section>

      <section className="card tasks-card">
        <div className="tasks-header">
          <div className="task-title"><span className="icon-tile mint"><CheckSquare size={20} /></span><div><h2>My Tasks</h2><p className="muted">Small steps count. Keep moving at your pace.</p></div></div>
          <Link className="primary-button" to="/tasks"><Plus size={16} /> Manage tasks</Link>
        </div>
        <div className="task-preview"><CheckCircle2 size={17} /><span>Your pending tasks will appear here when task management is connected.</span></div>
      </section>

      <section className="feature-grid">
        {featureCards.map(({ title, description, to, icon: Icon, color, badge }) => (
          <Link className="feature-card" to={to} key={title}>
            <span className={`feature-icon ${color}`}><Icon size={20} /></span>
            <strong>{title} {badge && <em>{badge}</em>}</strong>
            <small>{description}</small>
            <ArrowUpRight className="feature-arrow" size={15} />
          </Link>
        ))}
      </section>

      <section className="recommendations card">
        <div className="recommendation-heading"><span className="icon-tile amber"><Lightbulb size={19} /></span><div><h2>Suggestions for you</h2><p className="muted">Personalized from your latest mood analysis</p></div></div>
        <div className="suggestion-empty"><Sparkles size={17} /><span>Complete a mood check-in to receive only suggestions relevant to your mood.</span></div>
      </section>
    </>
  );
}
