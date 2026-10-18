import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CalendarDays,
  Heart,
  Leaf,
  LoaderCircle,
  RefreshCw,
  Sparkles,
  Wind,
  Music2,
  Footprints,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import './DailyAnalysis.css';

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

const emotionMeta: {
  key: EmotionKey;
  label: string;
  emoji: string;
  note: string;
  color: string;
}[] = [
  { key: 'happy', label: 'Happy', emoji: '😊', note: 'Little moments of joy', color: '#F6C85F' },
  { key: 'sad', label: 'Sad', emoji: '🥹', note: 'Space for softer feelings', color: '#76BDEB' },
  { key: 'stressed', label: 'Stressed', emoji: '😮‍💨', note: 'Moments of pressure', color: '#F5A05A' },
  { key: 'angry', label: 'Angry', emoji: '😤', note: 'Frustration you expressed', color: '#F18483' },
];

function localDateString(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getToken() {
  return localStorage.getItem('mindease_token');
}

function formatSelectedDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function friendlyMood(value?: string | null) {
  if (!value) return 'Your feelings matter';
  const names: Record<string, string> = {
    happy: 'A little sunshine',
    sad: 'A gentle day',
    stressed: 'A lot on your plate',
    angry: 'A fiery moment',
  };
  return names[value.toLowerCase()] || `${value.charAt(0).toUpperCase()}${value.slice(1)} feelings`;
}

export default function DailyAnalysis() {
  const [selectedDate, setSelectedDate] = useState(() => localDateString(new Date()));
  const [data, setData] = useState<DailyAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError('');
      const token = getToken();

      if (!token) {
        if (active) {
          setData(null);
          setError('Your session has expired. Please log in again.');
          setLoading(false);
        }
        return;
      }

      try {
        const result = await apiRequest<DailyResponse>(
          `/api/mood-analysis/daily?date=${encodeURIComponent(selectedDate)}`,
          'GET',
          { token },
        );
        if (active) setData(result.analysis);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Could not load your daily analysis.');
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [selectedDate, refreshKey]);

  const isToday = selectedDate === localDateString(new Date());
  const emotionTotal = useMemo(
    () => data
      ? emotionMeta.reduce((sum, item) => sum + (Number(data.emotions?.[item.key]) || 0), 0)
      : 0,
    [data],
  );
  const dominant = data?.dominantEmotion?.toLowerCase();
  const safeStress = data?.stressPercentage == null
    ? null
    : Math.max(0, Math.min(100, Number(data.stressPercentage)));
  const safeAnxiety = data?.anxietyPercentage == null
    ? null
    : Math.max(0, Math.min(100, Number(data.anxietyPercentage)));

  function shiftDate(amount: number) {
    const next = new Date(`${selectedDate}T12:00:00`);
    next.setDate(next.getDate() + amount);
    if (next <= new Date(`${localDateString(new Date())}T23:59:59`)) {
      setSelectedDate(localDateString(next));
    }
  }

  return (
    <main className="daily-page">
      <header className="daily-topbar">
        <Link to="/" className="daily-brand">
          <span className="brand-leaf"><Leaf size={23} /></span>
          <span><b>MindEase</b><small>Your wellness buddy</small></span>
        </Link>
        <div className="daily-top-message">
          <span className="sun-mascot">☀️</span>
          <span>A little progress each day<br />leads to big changes.</span>
        </div>
        <div className="daily-breath-pill"><Wind size={16} /> Take a deep breath</div>
      </header>

      <section className="daily-hero">
        <div className="daily-hero-copy">
          <p className="daily-eyebrow"><span /> YOUR WELLNESS JOURNEY</p>
          <h1><span className="title-leaf">🌿</span> Daily Analysis</h1>
          <p>Understand your emotions and see how your day feels.</p>
          <div className="daily-date-picker">
            <CalendarDays size={18} />
            <button type="button" aria-label="Previous day" onClick={() => shiftDate(-1)}>
              <ArrowLeft size={16} />
            </button>
            <strong>{formatSelectedDate(selectedDate)}</strong>
            <button type="button" aria-label="Next day" onClick={() => shiftDate(1)} disabled={isToday}>
              <ArrowRight size={16} />
            </button>
            <input
              aria-label="Choose analysis date"
              type="date"
              value={selectedDate}
              max={localDateString(new Date())}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        </div>
        <div className="daily-hero-art" aria-label="Cartoon girl resting with a cat and plants" role="img">
          <div className="hero-sun">☀️</div>
          <div className="hero-plant plant-one">🌿</div>
          <div className="hero-plant plant-two">🪴</div>
          <div className="hero-girl">👧🏻</div>
          <div className="hero-cat">🐱</div>
          <div className="hero-note">It’s okay<br />to feel<br />everything <span>♥</span></div>
          <span className="floating-heart heart-one">♥</span>
          <span className="floating-heart heart-two">✦</span>
        </div>
      </section>

      {error && (
        <div className="daily-alert" role="alert">
          <span>🌱</span>
          <div><b>We couldn’t load your reflection</b><p>{error}</p></div>
          <button type="button" onClick={() => setRefreshKey((v) => v + 1)}>
            <RefreshCw size={16} /> Retry
          </button>
        </div>
      )}

      <section className="daily-grid">
        <article className="daily-card mood-card">
          <div className="card-heading">
            <span className="heading-icon chart-icon"><BarChart3 size={22} /></span>
            <div><h2>Today’s Mood Garden</h2><p>Your emotions, gently understood.</p></div>
            <span className="tiny-flower">🌼</span>
          </div>

          {loading ? (
            <div className="daily-loading"><LoaderCircle className="spin" size={26} /><span>Gathering your mood garden…</span></div>
          ) : data ? (
            <>
              <div className="emotion-bars emoji-chart emoji-vertical-chart">
                {emotionMeta.map((emotion) => {
                  const value = Math.max(0, Math.min(100, Number(data.emotions?.[emotion.key]) || 0));
                  return (
                    <div className="emotion-column emoji-chart-item" key={emotion.key}>
                      <div className="vertical-bar-value">{Math.round(value)}%</div>
                      <div
                        className="vertical-emoji-track"
                        role="img"
                        aria-label={`${emotion.label}: ${Math.round(value)} percent`}
                      >
                        <div
                          className="vertical-emoji-fill"
                          style={{ height: `${value}%`, backgroundColor: emotion.color }}
                        />
                        <span
                          className="vertical-emoji-face"
                          style={{ backgroundColor: `${emotion.color}30`, borderColor: `${emotion.color}90` }}
                          aria-hidden="true"
                        >
                          {emotion.emoji}
                        </span>
                      </div>
                      <b>{emotion.label}</b>
                      <small>{emotion.note}</small>
                    </div>
                  );
                })}
              </div>
              {emotionTotal > 0 && Math.abs(emotionTotal - 100) > 2 && (
                <p className="daily-data-note">Emotion scores are shown as saved by your analysis service.</p>
              )}
              <div className="analysis-source-note"><span>🔒</span> Private to you · Based on saved mood analyses</div>
            </>
          ) : (
            <div className="daily-empty">
              <div className="empty-mascots"><span>🌱</span><span>🐣</span><span>🌱</span></div>
              <h3>Your mood garden is waiting to bloom</h3>
              <p>There’s no eligible mood analysis saved for this date yet. Try journaling or sharing how you feel with MindEase AI.</p>
              <Link to="/journaling" className="daily-primary-button">Write a journal <ArrowRight size={16} /></Link>
            </div>
          )}
        </article>

        <article className="daily-card overall-card">
          <div className="card-heading">
            <span className="heading-icon leaf-icon"><Leaf size={21} /></span>
            <div><h2>Overall Mood</h2><p>A gentle snapshot of your day</p></div>
          </div>
          {loading ? (
            <div className="daily-loading compact"><LoaderCircle className="spin" size={23} /></div>
          ) : data ? (
            <div className="overall-content">
              <div className="happy-mascot">
                {dominant === 'sad' ? '🥹' : dominant === 'stressed' ? '😮‍💨' : dominant === 'angry' ? '😤' : '🌞'}
                <span>✦</span><i>✿</i>
              </div>
              <div>
                <span className="mood-tag">{dominant ? friendlyMood(dominant) : 'A mixed emotional day'}</span>
                <h3>{friendlyMood(dominant)}</h3>
                <p>{data.analysisCount} saved {data.analysisCount === 1 ? 'analysis' : 'analyses'} included for this day.</p>
              </div>
            </div>
          ) : (
            <div className="mini-empty"><span>🪴</span><p>Your little mood summary will appear here when analysis is available.</p></div>
          )}
          <div className="metric-row">
            <div className="metric-card stress-metric">
              <span className="metric-mascot">☁️</span>
              <div>
                <small><Activity size={13} /> Stress level</small>
                <strong>{loading || safeStress == null || !data ? '—' : `${Math.round(safeStress)}%`}</strong>
                {safeStress != null && <div className="metric-track"><span style={{ width: `${safeStress}%` }} /></div>}
              </div>
            </div>
            <div className="metric-card anxiety-metric">
              <span className="metric-mascot">💧</span>
              <div>
                <small><Heart size={13} /> Anxiety level</small>
                <strong>{loading || safeAnxiety == null || !data ? '—' : `${Math.round(safeAnxiety)}%`}</strong>
                {safeAnxiety != null && <div className="metric-track"><span style={{ width: `${safeAnxiety}%` }} /></div>}
              </div>
            </div>
          </div>
        </article>

        <article className="daily-card insight-card">
          <div className="card-heading">
            <span className="heading-icon sparkle-icon"><Sparkles size={22} /></span>
            <div><h2>Your Personal Insight</h2><p>A little kindness, just for you.</p></div>
          </div>
          {loading ? (
            <div className="daily-loading"><LoaderCircle className="spin" size={24} /><span>Preparing your insight…</span></div>
          ) : data?.insight ? (
            <div className="insight-body">
              <span className="insight-quote">“</span><p>{data.insight}</p>
              <div className="insight-girl">🧸<span>💚</span></div>
            </div>
          ) : (
            <div className="insight-empty"><span className="hug-mascot">🫂</span><p>Every feeling deserves care. When a saved analysis includes an insight, you’ll find it here.</p></div>
          )}
          <div className="affirmation-strip">“Every emotion you feel is valid, and every small step counts.” <span>💗</span></div>
        </article>

        <article className="daily-card suggestions-card">
          <div className="card-heading">
            <span className="heading-icon bulb-icon">💡</span>
            <div><h2>Gentle Wellness Ideas</h2><p>Small things that may help you reset.</p></div>
          </div>
          <div className="suggestion-list">
            <Link to="/meditation" className="suggestion-item">
              <span className="suggestion-art yellow-art">🌞</span>
              <span><b>Try a 5-minute breathing break</b><small>Pause and make room for a calmer moment.</small></span>
              <ArrowRight size={17} />
            </Link>
            <div className="suggestion-item">
              <span className="suggestion-art green-art">🌱</span>
              <span><b>Take a little walk</b><small>A change of scenery can feel refreshing.</small></span>
              <Footprints size={17} />
            </div>
            <div className="suggestion-item">
              <span className="suggestion-art purple-art"><Music2 size={20} /></span>
              <span><b>Listen to a calming playlist</b><small>Give yourself a few quiet minutes.</small></span>
              <Heart size={17} />
            </div>
          </div>
          <p className="suggestion-disclaimer">These are general wellbeing ideas, not a diagnosis.</p>
        </article>
      </section>

      <footer className="daily-footer"><span>🌿</span> Grow at your own pace. You’re doing better than you think. <span>💚</span></footer>
    </main>
  );
}
