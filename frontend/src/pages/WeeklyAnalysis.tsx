import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, BarChart3, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Info, LoaderCircle, RefreshCw, Sparkles, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../lib/api';

type Day = { date: string; mood: string | null; moodEmoji: string | null; moodEntries: number; moods: { emotion: string; count: number }[]; tasksAdded: number; tasksCompleted: number };
type Emotion = { emotion: string; count: number; percentage: number };
type Analysis = { weekStart: string; weekEnd: string; days: Day[]; totalMoodEntries: number; dominantEmotion: string | null; dominantEmoji: string | null; emotionBreakdown: Emotion[]; tasksAdded: number; tasksCompleted: number; savedAt: string };
type ApiResult = { analysis: Analysis; weeks: string[] };
const EMOJIS: Record<string, string> = { happy: '😊', happiness: '😊', sad: '😢', sadness: '😢', stressed: '😰', stress: '😰', angry: '😠', anger: '😠', calm: '😌', neutral: '😐', anxious: '😟', anxiety: '😟', excited: '🤩', excitement: '🤩', fatigued: '😴', fatigue: '😴', fear: '😨' };
const niceEmotion = (value: string) => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
const monday = (date: Date) => { const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())); const day = d.getUTCDay(); d.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1 - day)); return d.toISOString().slice(0, 10); };
const shiftWeek = (value: string, amount: number) => { const d = new Date(`${value}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + amount * 7); return d.toISOString().slice(0, 10); };
const weekSunday = (value: string) => { const d = new Date(`${value}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 6); return d.toISOString().slice(0, 10); };
const displayDate = (value: string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) => new Date(`${value}T12:00:00`).toLocaleDateString('en-IN', options);

export default function WeeklyAnalysis() {
  const [weekStart, setWeekStart] = useState(() => monday(new Date()));
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [weeks, setWeeks] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const currentWeek = monday(new Date());

  const loadWeek = useCallback(async (target: string) => {
    const token = localStorage.getItem('mindease_token');
    if (!token) { setError('Please log in again to view your saved weekly analysis.'); setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const result = await apiRequest<ApiResult>(`/api/weekly-analysis?weekStart=${encodeURIComponent(target)}`, 'GET', { token });
      setAnalysis(result.analysis); setWeeks(result.weeks); setWeekStart(result.analysis.weekStart); setSelectedDay(null);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load your weekly analysis.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadWeek(weekStart); }, [loadWeek]);
  const goWeek = (value: string) => { setWeekStart(value); void loadWeek(value); };
  const isCurrentWeek = weekStart >= currentWeek;
  const selected = analysis?.days.find(day => day.date === selectedDay);

  return (
    <section className="page-section weekly-history-page">
      <div className="page-title-row">
        <div>
          <Link className="back-link" to="/"><ArrowLeft size={15} /> Back to dashboard</Link>
          <div className="eyebrow"><span className="eyebrow-dot" /> YOUR MOOD JOURNEY</div>
          <h1>Weekly Analysis</h1>
          <p>Your moods and habits, saved week by week. Come back anytime to reflect on your progress.</p>
        </div>
        <span className="icon-tile purple page-title-icon"><BarChart3 size={24} /></span>
      </div>

      <article className="card weekly-history-picker">
        <button className="weekly-week-arrow" aria-label="Previous week" onClick={() => goWeek(shiftWeek(weekStart, -1))}><ChevronLeft size={18} /></button>
        <div className="weekly-week-label"><CalendarDays size={17} /><div><strong>{displayDate(weekStart)} – {displayDate(weekSunday(weekStart), { day: 'numeric', month: 'short', year: 'numeric' })}</strong><span>{isCurrentWeek ? 'Current week · updates as you use MindEase' : 'Saved weekly snapshot'}</span></div></div>
        <select aria-label="Choose a saved week" className="weekly-week-select" value={weekStart} onChange={e => goWeek(e.target.value)}>
          {[...new Set([weekStart, ...weeks])].sort((a, b) => b.localeCompare(a)).map(week => <option value={week} key={week}>{displayDate(week, { day: 'numeric', month: 'short', year: 'numeric' })} week</option>)}
        </select>
        <button className="weekly-week-arrow" aria-label="Next week" disabled={isCurrentWeek} onClick={() => goWeek(shiftWeek(weekStart, 1))}><ChevronRight size={18} /></button>
      </article>

      {loading && <article className="card weekly-loading"><LoaderCircle className="weekly-spin" size={22} /> Loading your saved week…</article>}
      {!loading && error && <article className="card weekly-empty"><Info size={22} /><h2>Couldn't load this week</h2><p>{error}</p><button className="weekly-primary-button" onClick={() => void loadWeek(weekStart)}><RefreshCw size={15} /> Try again</button></article>}
      {!loading && !error && analysis && <>
        <div className="weekly-summary-grid weekly-summary-grid-live">
          <article className="card weekly-summary-card"><span className="muted">Most recorded mood</span><strong className="summary-value">{analysis.dominantEmotion ? `${analysis.dominantEmoji || '💭'} ${niceEmotion(analysis.dominantEmotion)}` : 'No mood yet'}</strong><p>{analysis.totalMoodEntries ? `${analysis.totalMoodEntries} saved mood ${analysis.totalMoodEntries === 1 ? 'entry' : 'entries'} this week` : 'Save a journal or mood check-in to start building your history.'}</p></article>
          <article className="card weekly-summary-card"><span className="muted">Tasks completed this week</span><strong className="summary-value">{analysis.tasksCompleted} <small>/ {analysis.tasksAdded} added</small></strong><p>Completion counts use the day the task was actually marked complete, including tasks created in earlier weeks.</p></article>
        </div>

        <article className="card weekly-day-card-section">
          <div className="card-heading"><div><span className="icon-tile mint"><CalendarDays size={18} /></span><h2>Your seven days</h2></div><span className="small-select">Tap a day for details</span></div>
          <div className="weekly-days-grid">
            {analysis.days.map(day => {
              const weekday = displayDate(day.date, { weekday: 'short' }).toUpperCase();
              const mood = day.mood ? niceEmotion(day.mood) : 'No mood';
              const taskRatio = day.tasksAdded ? Math.min(100, Math.round(day.tasksCompleted / day.tasksAdded * 100)) : (day.tasksCompleted ? 100 : 0);
              return <button type="button" className={`weekly-day-mini ${selectedDay === day.date ? 'is-selected' : ''}`} key={day.date} onClick={() => setSelectedDay(selectedDay === day.date ? null : day.date)} aria-pressed={selectedDay === day.date}>
                <span className="weekly-day-name">{weekday}</span><span className="weekly-day-date">{displayDate(day.date, { day: 'numeric', month: 'short' })}</span><span className="weekly-day-emoji">{day.moodEmoji || '—'}</span><strong className="weekly-day-mood">{mood}</strong><span className="weekly-day-task-label">Tasks done {day.tasksCompleted}</span><span className="weekly-mini-track"><span style={{ width: `${taskRatio}%` }} /></span><span className="weekly-day-task-label">{day.tasksAdded} added</span></button>;
            })}
          </div>
          {selected && <div className="weekly-day-detail"><div><span className="muted">Selected day</span><h3>{displayDate(selected.date, { weekday: 'long', day: 'numeric', month: 'long' })} {selected.moodEmoji || '💭'}</h3></div><div className="weekly-detail-stats"><span><strong>{selected.moodEntries}</strong> mood entries</span><span><strong>{selected.tasksAdded}</strong> tasks added</span><span><strong>{selected.tasksCompleted}</strong> tasks completed</span></div>{selected.moods.length > 0 && <div className="weekly-mood-tags">{selected.moods.map(item => <span key={item.emotion}>{EMOJIS[item.emotion.toLowerCase()] || '💭'} {niceEmotion(item.emotion)} · {item.count}</span>)}</div>}</div>}
        </article>

        <article className="card emotion-card weekly-emotion-card">
          <div className="card-heading"><div><span className="icon-tile mint"><BarChart3 size={18} /></span><h2>Mood breakdown</h2></div><span className="small-select">From saved analyses</span></div>
          {analysis.emotionBreakdown.length ? <div className="emotion-chart">{analysis.emotionBreakdown.slice().sort((a, b) => b.count - a.count).map(item => <div className="emotion-row" key={item.emotion}><div className="emotion-label-line"><span>{EMOJIS[item.emotion.toLowerCase()] || '💭'} {niceEmotion(item.emotion)}</span><strong>{item.percentage}%</strong></div><div className="emotion-track"><div className={`emotion-fill ${['emotion-happy','emotion-sad','emotion-stressed','emotion-angry'][analysis.emotionBreakdown.indexOf(item) % 4]}`} style={{ width: `${item.percentage}%` }} /></div><span className="emotion-note">Recorded {item.count} {item.count === 1 ? 'time' : 'times'} this week</span></div>)}</div> : <div className="weekly-no-data"><span>🌱</span><strong>Your mood story starts here</strong><p>No saved mood analyses were found for this week. Add a journal entry or mood check-in, and your weekly history will build from your real records.</p></div>}
          <div className="chart-note"><Info size={16} /><span>Moods are estimates from your saved analyses, not clinical measurements. Private journal text is not shown in this weekly report.</span></div>
        </article>

        <article className="card weekly-insight-card"><span className="icon-tile purple"><Sparkles size={18} /></span><div><h2>A gentle weekly reflection</h2><p>{analysis.totalMoodEntries === 0 ? 'You do not need to feel a certain way to use MindEase. When you are ready, record how you feel and your history will help you notice patterns over time.' : `You recorded ${analysis.totalMoodEntries} mood ${analysis.totalMoodEntries === 1 ? 'entry' : 'entries'} this week. Take a moment to notice what helped you feel better, and choose one small, kind step for the week ahead.`}</p></div><Target size={20} className="weekly-reflection-icon" /></article>
        <p className="weekly-saved-note"><CheckCircle2 size={15} /> This week's summary is saved to your MindEase V3 account and refreshes when you open it again.</p>
      </>}
    </section>
  );
}
