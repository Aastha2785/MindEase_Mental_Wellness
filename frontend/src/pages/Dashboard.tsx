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
  return (value ?? '')
    .replace(/\\s*\\[(?:journal|chatbot):\\d+\\]/gi, '')
    .replace(/\\s+/g, ' ')
    .trim();
}

export default function Dashboard() {
  const [todayData, setTodayData] = useState<DailyAnalysisData | null>(null);
  const [trend, setTrend] = useState<TrendDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

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
            Good morning! <span className="wave">✦</span>
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
          ) : insight && hasTodayData ? (
            <>
              <p className="muted" style={{ marginBottom: 8 }}>
                Today’s mood: {emotionLabels[dominant ?? ''] ?? dominant ?? 'Your feelings matter'}
              </p>
              <p className="insight-copy">{insight}</p>
            </>
          ) : (
            <p className="insight-copy">
              Your insight will appear here when an eligible journal entry or
              emotional chatbot disclosure is available.
            </p>
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

        <div className="task-preview">
          <CheckCircle2 size={17} />
          <span>
            Your pending tasks will appear here when task management is
            connected.
          </span>
        </div>
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
