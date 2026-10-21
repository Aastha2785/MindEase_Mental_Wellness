import { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Camera,
  CheckCircle2,
  CheckSquare,
  Heart,
  Lightbulb,
  Plus,
  Sparkles,
  Wind,
  BookOpen,
  Brain,
  LoaderCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../lib/api';

type EmotionKey = 'happy' | 'sad' | 'stressed' | 'angry';
type EmotionScores = Record<EmotionKey, number>;

type DailyAnalysisData = {
  date: string;
  analysisCount: number;
  emotions: EmotionScores;
  dominantEmotion: string | null;
  stressPercentage: number | null;
  anxietyPercentage: number | null;
  insight: string | null;
};

type DailyResponse = { analysis: DailyAnalysisData | null; message?: string };

type TrendDay = {
  label: string;
  date: string;
  score: number | null;
  dominantEmotion: string | null;
};

type ApiTask = {
  task_id: number;
  task: string;
  deadline: string;
  is_completed: boolean;
  created_at: string;
};

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

const emotionLabels: Record<string, string> = {
  happy: 'Happy',
  sad: 'Sad',
  stressed: 'Stressed',
  angry: 'Angry',
  unclear: 'Not enough information',
};

const emotionTips: Record<string, string> = {
  happy: 'Make a little space for what has been going well, and notice what helped.',
  sad: 'Be gentle with yourself today. A small comforting activity or talking to someone you trust may help.',
  stressed: 'Try breaking one demanding task into a small next step, then take a short breathing break.',
  angry: 'Give yourself a pause before responding, and consider what boundary or need matters to you.',
};

function localDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateLabel(date: Date) {
  return date.toLocaleDateString('en-IN', { weekday: 'short' }).slice(0, 1);
}

function getToken() {
  return localStorage.getItem('mindease_token');
}

function getStrongestEmotionScore(data: DailyAnalysisData | null): number | null {
  if (!data) return null;
  const values = Object.values(data.emotions ?? {}).map(Number).filter(Number.isFinite);
  return values.length ? Math.max(...values) : null;
}

function clampPercentage(value: number | null | undefined) {
  if (value == null || !Number.isFinite(Number(value))) return null;
  return Math.max(0, Math.min(100, Number(value)));
}

function cleanInsight(value: string | null | undefined) {
  // Remove internal source markers such as [journal:9] before showing text to students.
  return (value ?? '')
    .replace(/\s*\[(?:journal|chatbot):\d+\]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getGreeting(date: Date) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const emotionPresentation: Record<string, { emoji: string; line: string }> = {
  happy: { emoji: '😊', line: 'You seem to be feeling positive today. Notice what is going well and give yourself time to enjoy it.' },
  sad: { emoji: '😔', line: 'You may be feeling low today. Be gentle with yourself and consider one small comforting step.' },
  stressed: { emoji: '😟', line: 'You may be feeling under pressure. Pause, take a few slow breaths, and focus on one manageable next step.' },
  angry: { emoji: '😠', line: 'You may be feeling frustrated. Give yourself a moment before responding and notice what you need right now.' },
  unclear: { emoji: '💚', line: 'Your mood is not clear from the available entries yet. Check in with yourself and add a journal entry or chat when ready.' },
};

export default function Dashboard() {
  const [todayData, setTodayData] = useState<DailyAnalysisData | null>(null);
  const [trend, setTrend] = useState<TrendDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [pendingTasks, setPendingTasks] = useState<ApiTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState('');
  const [clockNow, setClockNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setClockNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadPendingTasks() {
      const token = getToken();
      if (!token) {
        if (active) {
          setPendingTasks([]);
          setTasksError('Please log in again to view your tasks.');
          setTasksLoading(false);
        }
        return;
      }

      try {
        const result = await apiRequest<{ tasks: ApiTask[] }>('/api/tasks', 'GET', { token });
        if (active) {
          setPendingTasks(
            (result.tasks ?? [])
              .filter((task) => !task.is_completed)
              .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()),
          );
          setTasksError('');
        }
      } catch (error) {
        if (active) {
          setTasksError(error instanceof Error ? error.message : 'Unable to load your pending tasks.');
        }
      } finally {
        if (active) setTasksLoading(false);
      }
    }

    void loadPendingTasks();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadMoodData() {
      setLoading(true);
      setLoadError('');
      const token = getToken();

      if (!token) {
        if (active) {
          setTodayData(null);
          setTrend([]);
          setLoadError('Please log in again to view your mood summary.');
          setLoading(false);
        }
        return;
      }

      try {
        const today = new Date();
        const dates = Array.from({ length: 7 }, (_, index) => {
          const date = new Date(today);
          date.setDate(today.getDate() - (6 - index));
          return date;
        });

        const results = await Promise.all(
          dates.map(async (date) => {
            const dateString = localDateString(date);
            const response = await apiRequest<DailyResponse>(
              `/api/mood-analysis/daily?date=${encodeURIComponent(dateString)}`,
              'GET',
              { token },
            );
            return { date, dateString, analysis: response.analysis };
          }),
        );

        if (!active) return;

        const todayString = localDateString(today);
        const todayResult = results.find((item) => item.dateString === todayString);
        setTodayData(todayResult?.analysis ?? null);

        setTrend(
          results.map(({ date, dateString, analysis }) => ({
            label: dateLabel(date),
            date: dateString,
            score: getStrongestEmotionScore(analysis),
            dominantEmotion: analysis?.dominantEmotion ?? null,
          })),
        );
      } catch (error) {
        if (active) {
          setLoadError(error instanceof Error ? error.message : 'Unable to load your mood summary.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadMoodData();
    return () => {
      active = false;
    };
  }, []);

  const stress = clampPercentage(todayData?.stressPercentage);
  const anxiety = clampPercentage(todayData?.anxietyPercentage);
  const dominant = todayData?.dominantEmotion?.toLowerCase() ?? null;
  const insight = cleanInsight(todayData?.insight);
  const hasTodayData = Boolean(todayData && todayData.analysisCount > 0);

  const chartMax = useMemo(
    () => Math.max(100, ...trend.map((day) => day.score ?? 0)),
    [trend],
  );

  return (
    <>
      <section className="welcome-row">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" /> YOUR DAILY CHECK-IN
          </div>
          <h1>
            {getGreeting(new Date(clockNow))}! <span className="wave">✦</span>
          </h1>
          <p>
            How are you feeling today? Write in your journal or talk to your AI
            companion.
          </p>
        </div>

        <div className="welcome-art" aria-hidden="true">
          <div className="art-sun" />
          <div className="art-leaf leaf-one" />
          <div className="art-leaf leaf-two" />
          <div className="art-face">☺</div>
        </div>
      </section>

      {loadError && (
        <p className="fine-print" role="alert">
          {loadError}
        </p>
      )}

      <section className="metric-grid">
        <article className="card mood-card">
          <div className="card-heading">
            <div>
              <span className="icon-tile purple">
                <BarChart3 size={18} />
              </span>
              <h2>Overall Mood Trend</h2>
            </div>
            <span className="small-select">Last 7 days</span>
          </div>

          <p className="muted">Strongest emotion score from each day's combined analysis</p>

          <div className="bar-chart dashboard-bars" aria-label="Mood trend for the last seven days">
            {trend.map((day, index) => {
              // Keep the bars visually restrained; a missing day is shown as a dash.
              const height = day.score == null ? 0 : Math.max(12, (day.score / chartMax) * 42);
              return (
                <div className="bar-wrap" key={day.date} title={`${day.date}: ${day.dominantEmotion ? emotionLabels[day.dominantEmotion] ?? day.dominantEmotion : 'No analysis'}`}>
                  <div
                    className={`bar bar-${index}`}
                    style={{
                      height: `${height}%`,
                      minHeight: day.score == null ? 3 : 8,
                      opacity: day.score == null ? 0.14 : 0.9,
                    }}
                  />
                  <span>{day.label}</span>
                </div>
              );
            })}
          </div>

          <div className="chart-legend">
            {loading
              ? <><LoaderCircle size={13} className="animate-spin" /> Loading saved mood data…</>
              : trend.some((day) => day.score != null)
                ? 'Based on available journal and chatbot analyses'
                : 'No eligible mood analyses saved in the last 7 days yet'}
          </div>
        </article>

        <article className="card stress-card">
          <div className="card-heading">
            <div>
              <span className="icon-tile coral">
                <Heart size={18} />
              </span>
              <h2>Stress &amp; Anxiety</h2>
            </div>
          </div>

          <p className="muted">From today’s combined mood analysis</p>

          <div style={{ display: 'grid', gap: 16, marginTop: 22 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 7, fontSize: 13 }}>
                <span>Stress</span>
                <strong>{stress == null ? '—' : `${stress}%`}</strong>
              </div>
              <div
                role="progressbar"
                aria-label="Estimated stress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={stress ?? 0}
                style={{ height: 10, borderRadius: 999, background: 'var(--surface-secondary, #f3f0f7)', overflow: 'hidden' }}
              >
                <div style={{ width: `${stress ?? 0}%`, height: '100%', borderRadius: 999, background: 'linear-gradient(90deg, #f7a2a0, #ef777e)', transition: 'width 250ms ease' }} />
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 7, fontSize: 13 }}>
                <span>Anxiety</span>
                <strong>{anxiety == null ? '—' : `${anxiety}%`}</strong>
              </div>
              <div
                role="progressbar"
                aria-label="Estimated anxiety"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={anxiety ?? 0}
                style={{ height: 10, borderRadius: 999, background: 'var(--surface-secondary, #f3f0f7)', overflow: 'hidden' }}
              >
                <div style={{ width: `${anxiety ?? 0}%`, height: '100%', borderRadius: 999, background: 'linear-gradient(90deg, #b9a5ff, #8056e8)', transition: 'width 250ms ease' }} />
              </div>
            </div>
          </div>

          <p className="fine-print">
            {!hasTodayData ? 'Results appear when eligible journal or chatbot mood data is available.' : 'Estimates from your available mood entries.'}
          </p>
        </article>

        <article className="card insight-card">
          <div className="card-heading">
            <div>
              <span className="icon-tile mint">
                <Sparkles size={18} />
              </span>
              <h2>Daily Insight</h2>
            </div>
          </div>

          {loading ? (
            <p className="insight-copy">Loading your combined mood insight…</p>
          ) : hasTodayData && dominant ? (
            <div style={{ display: 'grid', gridTemplateColumns: '72px minmax(0, 1fr)', alignItems: 'center', gap: 16, margin: '12px 0 18px' }}>
              <div aria-label={`Mood: ${emotionLabels[dominant] ?? dominant}`} style={{ width: 72, height: 72, borderRadius: 22, display: 'grid', placeItems: 'center', background: 'var(--surface-secondary, #f1faf5)', fontSize: 46, lineHeight: 1 }}>
                {emotionPresentation[dominant]?.emoji ?? '💚'}
              </div>
              <div>
                <p style={{ fontWeight: 750, fontSize: 18, margin: '0 0 6px' }}>
                  Feeling {emotionLabels[dominant] ?? dominant}
                </p>
                <p className="insight-copy" style={{ margin: 0 }}>
                  {emotionPresentation[dominant]?.line ?? 'Take a moment to notice how you feel and what might help you today.'}
                </p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '12px 0 18px' }}>
              <span aria-hidden="true" style={{ fontSize: 42 }}>💚</span>
              <p className="insight-copy" style={{ margin: 0 }}>
                Your mood insight will appear after a journal entry or emotional AI-chat analysis is saved.
              </p>
            </div>
          )}

          <Link className="text-link" to="/daily-analysis">
            View daily analysis <ArrowUpRight size={15} />
          </Link>
        </article>
      </section>

      <section className="card tasks-card">
        <div className="tasks-header">
          <div className="task-title">
            <span className="icon-tile mint">
              <CheckSquare size={20} />
            </span>
            <div>
              <h2>My Tasks</h2>
              <p className="muted">
                Small steps count. Keep moving at your pace.
              </p>
            </div>
          </div>

          <Link className="primary-button" to="/tasks">
            <Plus size={16} /> Manage tasks
          </Link>
        </div>

        {tasksLoading ? (
          <div className="task-preview">
            <LoaderCircle size={17} className="animate-spin" />
            <span>Loading your pending tasks…</span>
          </div>
        ) : tasksError ? (
          <div className="task-preview" role="status">
            <CheckCircle2 size={17} />
            <span>{tasksError}</span>
          </div>
        ) : pendingTasks.length === 0 ? (
          <div className="task-preview">
            <CheckCircle2 size={17} />
            <span>You’re all caught up! Add a task whenever you’re ready. 🌱</span>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              {pendingTasks.length} pending {pendingTasks.length === 1 ? 'task' : 'tasks'} · nearest deadline first
            </p>
            {pendingTasks.slice(0, 4).map((task) => {
              const deadlineMs = new Date(task.deadline).getTime();
              const createdMs = new Date(task.created_at).getTime();
              const remainingMs = deadlineMs - clockNow;
              const totalMs = Math.max(1, deadlineMs - (Number.isFinite(createdMs) ? createdMs : clockNow));
              const timeLeftPercent = Math.max(0, Math.min(100, (remainingMs / totalMs) * 100));
              const overdue = remainingMs <= 0;
              const barColor = overdue || timeLeftPercent <= 10
                ? '#ef4444'
                : timeLeftPercent <= 25
                  ? '#f97316'
                  : timeLeftPercent <= 50
                    ? '#eab308'
                    : '#22c55e';
              const moodEmoji = overdue || timeLeftPercent <= 10
                ? '😰'
                : timeLeftPercent <= 25
                  ? '😟'
                  : timeLeftPercent <= 50
                    ? '😬'
                    : '😊';
              const timeLabel = overdue
                ? 'Overdue — take a breath and choose your next step'
                : remainingMs < 60 * 60 * 1000
                  ? `${Math.max(1, Math.ceil(remainingMs / 60000))} min left`
                  : remainingMs < 24 * 60 * 60 * 1000
                    ? `${Math.floor(remainingMs / 3600000)}h ${Math.floor((remainingMs % 3600000) / 60000)}m left`
                    : `${Math.floor(remainingMs / 86400000)}d ${Math.floor((remainingMs % 86400000) / 3600000)}h left`;

              return (
                <article
                  key={task.task_id}
                  style={{
                    padding: 14,
                    borderRadius: 16,
                    border: '1px solid var(--border-color, #d1d5db)',
                    background: 'var(--surface-secondary, rgba(128,128,128,0.06))',
                    color: 'var(--text-primary, inherit)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <strong style={{ display: 'block', overflowWrap: 'anywhere', fontSize: 14 }}>{task.task}</strong>
                      <span className="muted" style={{ display: 'block', marginTop: 5, fontSize: 12 }}>
                        Due {new Date(task.deadline).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <span aria-label={overdue ? 'Overdue' : 'Time remaining'} style={{ fontSize: 23, lineHeight: 1 }}>{moodEmoji}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginTop: 12, marginBottom: 6, fontSize: 12 }}>
                    <strong style={{ color: barColor }}>{timeLabel}</strong>
                    <span className="muted">{Math.round(timeLeftPercent)}% time left</span>
                  </div>
                  <div role="progressbar" aria-label={`Time remaining for ${task.task}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(timeLeftPercent)} style={{ height: 8, borderRadius: 999, overflow: 'hidden', background: 'var(--border-color, #d1d5db)' }}>
                    <div style={{ width: `${timeLeftPercent}%`, height: '100%', borderRadius: 999, background: barColor, transition: 'width 400ms ease, background 400ms ease' }} />
                  </div>
                </article>
              );
            })}
            {pendingTasks.length > 4 && (
              <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                +{pendingTasks.length - 4} more pending {pendingTasks.length - 4 === 1 ? 'task' : 'tasks'} — <Link className="text-link" to="/tasks">view all</Link>
              </p>
            )}
          </div>
        )}
      </section>

      <section className="feature-grid">
        {featureCards.map(
          ({ title, description, to, icon: Icon, color, badge }) => (
            <Link className="feature-card" to={to} key={title}>
              <span className={`feature-icon ${color}`}>
                <Icon size={20} />
              </span>

              <strong>
                {title} {badge && <em>{badge}</em>}
              </strong>

              <small>{description}</small>

              <ArrowUpRight className="feature-arrow" size={15} />
            </Link>
          ),
        )}
      </section>

      <section className="recommendations card">
        <div className="recommendation-heading">
          <span className="icon-tile amber">
            <Lightbulb size={19} />
          </span>
          <div>
            <h2>Suggestions for you</h2>
            <p className="muted">
              Based on your latest combined mood analysis
            </p>
          </div>
        </div>

        {hasTodayData && dominant && emotionTips[dominant] ? (
          <div className="suggestion-empty">
            <Sparkles size={17} />
            <span>{emotionTips[dominant]}</span>
          </div>
        ) : (
          <div className="suggestion-empty">
            <Sparkles size={17} />
            <span>
              Your personalized suggestion will appear when an eligible journal
              entry or emotional chatbot disclosure is available.
            </span>
          </div>
        )}
      </section>
    </>
  );
}
