
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Clock3,
  Heart,
  Infinity as InfinityIcon,
  Lightbulb,
  Pause,
  Play,
  RotateCcw,
  Timer,
  Wind,
  X,
  Leaf,
  Activity,
} from 'lucide-react';

import { Link } from 'react-router-dom';
import { useTheme } from '../theme/ThemeProvider';
import { apiRequest } from '../lib/api';
import './Meditation.css';

type Session = {
  sessionId: number;
  meditationType: string;
  plannedDurationSeconds: number;
  actualDurationSeconds: number;
  status: string;
  startedAt: string;
  completedAt: string | null;
};

type SessionResponse = {
  sessions: Session[];
};

type SaveResponse = {
  session: Session;
};

type Tab = 'breathing' | 'progress' | 'tips';
type Mode = 'timed' | 'free';

const DURATIONS = [1, 2, 5, 10];

const PHASES = [
  {
    name: 'Breathe in',
    seconds: 4,
    instruction: 'Breathe in gently through your nose.',
  },
  {
    name: 'Breathe out',
    seconds: 6,
    instruction: 'Let the breath leave slowly and comfortably.',
  },
];

const TIPS = [
  {
    title: 'Keep it comfortable',
    text: 'Let your breath stay gentle and natural. You do not need to take the deepest breath possible.',
  },
  {
    title: 'Relax your shoulders',
    text: 'Allow your shoulders, jaw, and hands to soften. Sit or lie in a position that feels supported.',
  },
  {
    title: 'There is no perfect rhythm',
    text: 'Follow the animation only if it feels comfortable. Return to your normal breathing whenever you need to.',
  },
  {
    title: 'Stop if you feel unwell',
    text: 'If you feel dizzy, breathless, or uncomfortable, stop the exercise and breathe normally. Seek medical advice if symptoms persist.',
  },
];

function formatTime(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));

  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(
    seconds % 60,
  ).padStart(2, '0')}`;
}

function localDay(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(date.getDate()).padStart(2, '0')}`;
}

function getToken() {
  return localStorage.getItem('mindease_token');
}

export default function Meditation() {
  const { theme } = useTheme();

  const [tab, setTab] = useState<Tab>('breathing');
  const [mode, setMode] = useState<Mode>('timed');
  const [minutes, setMinutes] = useState(2);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(
    null,
  );
  const [phaseElapsed, setPhaseElapsed] = useState(0);

  const lastTick = useRef<number | null>(null);
  const elapsedRef = useRef(0);
  const savedRef = useRef(false);
  const finishSessionRef = useRef<(completed: boolean) => void>(() => {});

  const targetSeconds = minutes * 60;

  useEffect(() => {
    elapsedRef.current = elapsed;
  }, [elapsed]);

  const loadSessions = useCallback(async () => {
    const token = getToken();

    if (!token) {
      setLoadingSessions(false);
      setNotice('Please log in to save your breathing progress.');
      return;
    }

    try {
      const result = await apiRequest<SessionResponse>(
        '/api/breathing/sessions?days=7',
        'GET',
        { token },
      );

      setSessions(result.sessions ?? []);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : 'Could not load your breathing progress.',
      );
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const finishSession = useCallback(
    async (completed: boolean) => {
      if (!running || savedRef.current) return;

      savedRef.current = true;
      setRunning(false);
      setPaused(false);
      setSaving(true);
      lastTick.current = null;

      const durationSeconds = Math.max(
        0,
        Math.floor(elapsedRef.current),
      );

      if (durationSeconds < 5) {
        setSaving(false);
        setNotice(
          'Try at least a few comfortable breaths before saving a session.',
        );
        setElapsed(0);
        elapsedRef.current = 0;
        setSessionStartedAt(null);
        savedRef.current = false;
        return;
      }

      const token = getToken();

      if (!token) {
        setSaving(false);
        setNotice('Please log in again to save your breathing progress.');
        setSessionStartedAt(null);
        savedRef.current = false;
        return;
      }

      try {
        const plannedDurationSeconds =
  mode === 'timed' ? targetSeconds : Math.max(1, durationSeconds);

        const result = await apiRequest<SaveResponse>(
          '/api/breathing/sessions',
          'POST',
          {
            token,
            body: {
              plannedDurationSeconds,
              actualDurationSeconds: durationSeconds,
              status: completed ? 'completed' : 'started',
            },
          },
        );

        setSessions((previous) => [
          result.session,
          ...previous.filter(
            (session) => session.sessionId !== result.session.sessionId,
          ),
        ]);

        setNotice(
          completed
            ? 'Lovely work. Your breathing session is saved.'
            : 'Session saved. Every mindful moment counts.',
        );
      } catch (error) {
        setNotice(
          error instanceof Error
            ? error.message
            : 'Your session could not be saved. Please try again.',
        );
        savedRef.current = false;
      } finally {
        setSaving(false);
        setSessionStartedAt(null);
      }
    },
    [running, mode, targetSeconds],
  );

  useEffect(() => {
    finishSessionRef.current = (completed) => {
      void finishSession(completed);
    };
  }, [finishSession]);

  useEffect(() => {
    if (!running || paused) return;

    const tick = () => {
      const now = Date.now();

      if (lastTick.current === null) {
        lastTick.current = now;
        return;
      }

      const delta = Math.min((now - lastTick.current) / 1000, 1);
      lastTick.current = now;

      const next = elapsedRef.current + delta;

      if (mode === 'timed' && next >= targetSeconds) {
        elapsedRef.current = targetSeconds;
        setElapsed(targetSeconds);
        setPhaseElapsed((previous) => (previous + delta) % 10);

        window.setTimeout(() => {
          finishSessionRef.current(true);
        }, 0);

        return;
      }

      elapsedRef.current = next;
      setElapsed(next);
      setPhaseElapsed((previous) => (previous + delta) % 10);
    };

    lastTick.current = Date.now();

    const interval = window.setInterval(tick, 200);

    return () => {
      window.clearInterval(interval);
      lastTick.current = null;
    };
  }, [running, paused, mode, targetSeconds]);

  const phase = phaseElapsed < 4 ? PHASES[0] : PHASES[1];

  const phaseRemaining =
    phaseElapsed < 4 ? 4 - phaseElapsed : 10 - phaseElapsed;

  const progressPercent =
    mode === 'timed'
      ? Math.min(100, (elapsed / targetSeconds) * 100)
      : Math.min(100, ((elapsed % 60) / 60) * 100);

  const startSession = () => {
    if (running || saving) return;

    setElapsed(0);
    elapsedRef.current = 0;
    setPhaseElapsed(0);
    setPaused(false);
    setRunning(true);
    setSessionStartedAt(Date.now());
    savedRef.current = false;
    setNotice('');
    lastTick.current = Date.now();
  };

  const pauseSession = () => {
    setPaused(true);
    lastTick.current = null;
  };

  const resumeSession = () => {
    setPaused(false);
    lastTick.current = Date.now();
  };

  const stopSession = () => {
    void finishSession(false);
  };

  const resetSession = () => {
    if (saving) return;

    setRunning(false);
    setPaused(false);
    setElapsed(0);
    elapsedRef.current = 0;
    setPhaseElapsed(0);
    setSessionStartedAt(null);
    savedRef.current = false;
    lastTick.current = null;
    setNotice('Session reset. Start again whenever you are ready.');
  };

  const todaySessions = useMemo(
    () =>
      sessions.filter(
        (session) =>
          localDay(new Date(session.startedAt)) === localDay(new Date()),
      ),
    [sessions],
  );

  const todaySeconds = todaySessions.reduce(
    (sum, session) => sum + session.actualDurationSeconds,
    0,
  );

  const weekSeconds = sessions.reduce(
    (sum, session) => sum + session.actualDurationSeconds,
    0,
  );

  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));

        const key = localDay(date);

        const seconds = sessions
          .filter(
            (session) =>
              localDay(new Date(session.startedAt)) === key,
          )
          .reduce(
            (sum, session) => sum + session.actualDurationSeconds,
            0,
          );

        return {
          key,
          label: date
            .toLocaleDateString('en-IN', { weekday: 'short' })
            .slice(0, 1),
          seconds,
        };
      }),
    [sessions],
  );

  const maxDaySeconds = Math.max(60, ...weekDays.map((day) => day.seconds));
  const sessionClock = formatTime(elapsed);

  const remaining =
    mode === 'timed'
      ? Math.max(0, Math.ceil(targetSeconds - elapsed))
      : null;

  return (
    <section className={`breathing-page theme-${theme}`}>
      <Link className="breathing-back" to="/">
        <ArrowLeft size={15} /> Back to dashboard
      </Link>

      <header className="breathing-hero">
        <div className="breathing-hero-copy">
          <span className="breathing-eyebrow">
            <span /> MINDEASE · BREATHING STUDIO
          </span>
          <h1>Breathe. Relax. Be present.</h1>
          <p>Take a few mindful breaths. A calmer moment can start right here.</p>
        </div>

        <div className="breathing-hero-art" aria-hidden="true">
          <div className="hero-orbit" />
          <Leaf className="hero-leaf leaf-one" />
          <Leaf className="hero-leaf leaf-two" />
          <Heart className="hero-heart" />
          <span className="hero-spark">✦</span>
        </div>
      </header>

      <div
        className="breathing-tabs"
        role="tablist"
        aria-label="Breathing studio sections"
      >
        <button
          className={tab === 'breathing' ? 'active' : ''}
          onClick={() => setTab('breathing')}
          role="tab"
          aria-selected={tab === 'breathing'}
        >
          <Wind size={17} /> Breathing
        </button>

        <button
          className={tab === 'progress' ? 'active' : ''}
          onClick={() => setTab('progress')}
          role="tab"
          aria-selected={tab === 'progress'}
        >
          <BarChart3 size={17} /> My Progress
        </button>

        <button
          className={tab === 'tips' ? 'active' : ''}
          onClick={() => setTab('tips')}
          role="tab"
          aria-selected={tab === 'tips'}
        >
          <Lightbulb size={17} /> Tips
        </button>
      </div>

      {tab === 'breathing' && (
        <>
          <div className="breathing-mode-grid">
            <button
              className={`breathing-mode-card ${
                mode === 'timed' ? 'selected' : ''
              }`}
              onClick={() => !running && setMode('timed')}
              disabled={running || saving}
            >
              <span className="mode-icon">
                <Timer size={22} />
              </span>
              <span>
                <strong>Timed session</strong>
                <small>1, 2, 5 or 10 minutes</small>
              </span>
              <span className="mode-check">
                {mode === 'timed' && <CheckCircle2 size={17} />}
              </span>
            </button>

            <button
              className={`breathing-mode-card ${
                mode === 'free' ? 'selected' : ''
              }`}
              onClick={() => !running && setMode('free')}
              disabled={running || saving}
            >
              <span className="mode-icon">
                <InfinityIcon size={23} />
              </span>
              <span>
                <strong>Free breathing</strong>
                <small>No timer · Stop anytime</small>
              </span>
              <span className="mode-check">
                {mode === 'free' && <CheckCircle2 size={17} />}
              </span>
            </button>
          </div>

          {mode === 'timed' && (
            <div className="duration-picker">
              <span className="section-label">Choose your duration</span>
              <div className="duration-options">
                {DURATIONS.map((value) => (
                  <button
                    key={value}
                    className={minutes === value ? 'active' : ''}
                    disabled={running || saving}
                    onClick={() => setMinutes(value)}
                  >
                    {value} min
                  </button>
                ))}
              </div>
            </div>
          )}

          <div
            className={`breathing-exercise-card ${
              running ? 'is-running' : ''
            }`}
          >
            <div className="breathing-orb-column">
              <div
                className={`breathing-orb ${
                  running && !paused
                    ? phase.name === 'Breathe in'
                      ? 'orb-in'
                      : 'orb-out'
                    : ''
                } ${paused ? 'orb-paused' : ''}`}
              >
                <div className="breathing-orb-inner">
                  <span>
                    {running
                      ? paused
                        ? 'Take a pause'
                        : phase.name
                      : 'Find your rhythm'}
                  </span>
                  <strong>
                    {running
                      ? paused
                        ? 'Whenever you are ready'
                        : `${Math.max(1, Math.ceil(phaseRemaining))} seconds`
                      : 'Breathe gently'}
                  </strong>
                </div>
              </div>

              <p className="breathing-instruction">
                {running
                  ? paused
                    ? 'Your session is paused.'
                    : phase.instruction
                  : 'Sit comfortably and let your breath feel natural.'}
              </p>

              {!running ? (
                <button
                  className="primary-breathing-button"
                  onClick={startSession}
                  disabled={saving}
                >
                  <Play size={17} fill="currentColor" /> Start breathing
                </button>
              ) : (
                <div className="session-controls">
                  {paused ? (
                    <button
                      className="primary-breathing-button"
                      onClick={resumeSession}
                    >
                      <Play size={17} fill="currentColor" /> Resume
                    </button>
                  ) : (
                    <button
                      className="primary-breathing-button"
                      onClick={pauseSession}
                    >
                      <Pause size={17} fill="currentColor" /> Pause
                    </button>
                  )}

                  <button
                    className="secondary-breathing-button"
                    onClick={stopSession}
                    disabled={saving}
                  >
                    <X size={16} /> Stop
                  </button>

                  <button
                    className="round-control"
                    onClick={resetSession}
                    aria-label="Reset session"
                    title="Reset"
                    disabled={saving}
                  >
                    <RotateCcw size={16} />
                  </button>
                </div>
              )}
            </div>

            <aside className="breathing-session-side">
              <div className="session-live-label">
                <span
                  className={
                    running && !paused ? 'live-dot on' : 'live-dot'
                  }
                />
                {running
                  ? paused
                    ? 'PAUSED SESSION'
                    : 'SESSION IN PROGRESS'
                  : 'YOUR BREATHING SPACE'}
              </div>

              <div className="session-timer-label">
                {mode === 'timed' ? 'Time remaining' : 'Time practiced'}
              </div>

              <div className="session-timer-value">
                {mode === 'timed'
                  ? formatTime(remaining ?? targetSeconds)
                  : sessionClock}
              </div>

              {mode === 'timed' && (
                <div className="session-progress-track">
                  <span style={{ width: `${progressPercent}%` }} />
                </div>
              )}

              <div className="session-divider" />

              <span className="section-label">Breathing rhythm</span>

              <div
                className={`phase-row ${
                  running && !paused && phase.name === 'Breathe in'
                    ? 'current'
                    : ''
                }`}
              >
                <span className="phase-dot" />
                <span>
                  <strong>Breathe in</strong>
                  <small>4 seconds · gently</small>
                </span>
              </div>

              <div
                className={`phase-row ${
                  running && !paused && phase.name === 'Breathe out'
                    ? 'current'
                    : ''
                }`}
              >
                <span className="phase-dot" />
                <span>
                  <strong>Breathe out</strong>
                  <small>6 seconds · comfortably</small>
                </span>
              </div>

              <p className="rhythm-note">
                No need to hold your breath. Follow the rhythm only if it
                feels comfortable.
              </p>
            </aside>
          </div>

          <div className="breathing-stat-grid">
            <div className="breathing-stat-card">
              <span className="stat-icon">
                <Clock3 size={19} />
              </span>
              <div>
                <small>Current session</small>
                <strong>{sessionClock}</strong>
                <span>
                  {mode === 'timed'
                    ? `/ ${formatTime(targetSeconds)}`
                    : 'No time limit'}
                </span>
              </div>
            </div>

            <div className="breathing-stat-card">
              <span className="stat-icon">
                <Activity size={19} />
              </span>
              <div>
                <small>Current phase</small>
                <strong>
                  {running && !paused ? phase.name : 'Ready when you are'}
                </strong>
                <span>
                  {running && !paused
                    ? `${Math.max(1, Math.ceil(phaseRemaining))} seconds left`
                    : 'Easy does it'}
                </span>
              </div>
            </div>

            <div className="breathing-stat-card">
              <span className="stat-icon">
                <Wind size={19} />
              </span>
              <div>
                <small>Today's practice</small>
                <strong>
                  {todaySessions.length}{' '}
                  {todaySessions.length === 1 ? 'session' : 'sessions'}
                </strong>
                <span>{Math.round(todaySeconds / 60)} min practiced</span>
              </div>
            </div>
          </div>

          <div className="breathing-gentle-reminder">
            <span className="reminder-icon">
              <Leaf size={22} />
            </span>
            <div>
              <strong>A gentle reminder</strong>
              <p>
                Breathe comfortably. Don't force deep breaths. If you feel
                dizzy or uncomfortable, stop and breathe normally.
              </p>
            </div>
          </div>
        </>
      )}

      {tab === 'progress' && (
        <div className="progress-view">
          <div className="progress-heading">
            <div>
              <h2>Your breathing journey</h2>
              <p>Small moments of care add up over time.</p>
            </div>
            <span className="progress-week-pill">Last 7 days</span>
          </div>

          <div className="progress-metric-grid">
            <div className="progress-metric">
              <span className="stat-icon">
                <Clock3 size={19} />
              </span>
              <small>Total practice this week</small>
              <strong>
                {Math.round(weekSeconds / 60)} <em>min</em>
              </strong>
            </div>

            <div className="progress-metric">
              <span className="stat-icon">
                <Wind size={19} />
              </span>
              <small>Sessions this week</small>
              <strong>{sessions.length}</strong>
            </div>

            <div className="progress-metric">
              <span className="stat-icon">
                <Heart size={19} />
              </span>
              <small>Today's practice</small>
              <strong>
                {Math.round(todaySeconds / 60)} <em>min</em>
              </strong>
            </div>
          </div>

          <div className="progress-chart-card">
            <div className="progress-card-heading">
              <div>
                <h3>Practice by day</h3>
                <p>Minutes of active breathing</p>
              </div>
              <span>{Math.round(weekSeconds / 60)} min total</span>
            </div>

            <div className="weekly-bars">
              {weekDays.map((day) => (
                <div className="weekly-bar-column" key={day.key}>
                  <strong>
                    {day.seconds ? Math.round(day.seconds / 60) : ''}
                  </strong>
                  <div className="weekly-bar-track">
                    <span
                      style={{
                        height: `${
                          day.seconds
                            ? Math.max(
                                7,
                                (day.seconds / maxDaySeconds) * 100,
                              )
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                  <small>{day.label}</small>
                </div>
              ))}
            </div>
          </div>

          <div className="progress-history-card">
            <div className="progress-card-heading">
              <div>
                <h3>Recent sessions</h3>
                <p>Your saved breathing practice</p>
              </div>
            </div>

            {loadingSessions ? (
              <p className="empty-progress">Loading your progress…</p>
            ) : sessions.length === 0 ? (
              <div className="empty-progress">
                <span className="mode-icon">
                  <Wind size={22} />
                </span>
                <strong>Your journey starts with one breath.</strong>
                <p>Complete a short breathing session and it will appear here.</p>
                <button
                  className="text-action"
                  onClick={() => setTab('breathing')}
                >
                  Start a session
                </button>
              </div>
            ) : (
              <div className="session-history-list">
                {sessions.slice(0, 10).map((session) => (
                  <div
                    className="session-history-item"
                    key={session.sessionId}
                  >
                    <span className="history-session-icon">
                      <Wind size={17} />
                    </span>

                    <span className="history-session-copy">
                      <strong>
                        {session.meditationType === 'breathing'
                          ? 'Breathing exercise'
                          : session.meditationType}
                      </strong>
                      <small>
                        {new Date(session.startedAt).toLocaleString('en-IN', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </small>
                    </span>

                    <span className="history-duration">
                      {Math.floor(session.actualDurationSeconds / 60)}m{' '}
                      {session.actualDurationSeconds % 60}s
                    </span>

                    {session.status === 'completed' && (
                      <CheckCircle2
                        className="history-complete"
                        size={17}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'tips' && (
        <div className="tips-view">
          <div className="tips-heading">
            <span className="tips-heading-icon">
              <Lightbulb size={23} />
            </span>
            <div>
              <h2>Gentle guidance for breathing</h2>
              <p>Practical reminders to help you practice comfortably.</p>
            </div>
          </div>

          <div className="tips-grid">
            {TIPS.map((tip, index) => (
              <article className="breathing-tip-card" key={tip.title}>
                <span className="tip-number">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3>{tip.title}</h3>
                <p>{tip.text}</p>
              </article>
            ))}
          </div>

          <div className="breathing-gentle-reminder">
            <span className="reminder-icon">
              <Heart size={22} />
            </span>
            <div>
              <strong>Listen to your body</strong>
              <p>
                Breathing exercises may help some people feel calmer, but they
                are not a guaranteed treatment for stress or anxiety. You can
                stop at any time.
              </p>
            </div>
          </div>
        </div>
      )}

      {notice && (
        <div
          className={`breathing-notice ${
            notice.toLowerCase().includes('could not') ||
            notice.toLowerCase().includes('please log') ||
            notice.toLowerCase().includes('unauthorized') ||
            notice.toLowerCase().includes('authentication')
              ? 'warning'
              : ''
          }`}
          role="status"
        >
          {notice}
          <button
            onClick={() => setNotice('')}
            aria-label="Dismiss message"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {saving && (
        <div className="saving-status" role="status">
          Saving your session…
        </div>
      )}

      {sessionStartedAt && running && (
        <span className="sr-only">
          Session started at{' '}
          {new Date(sessionStartedAt).toLocaleTimeString()}
        </span>
      )}
    </section>
  );
}
