
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Brain,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Clock3,
  LoaderCircle,
  RefreshCw,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { apiRequest } from '../lib/api';
import {
  formatMindEaseTimestamp,
  formatMindEaseDate,
} from '../lib/dateUtils';

type Emotion = 'happy' | 'sad' | 'stressed' | 'angry';

type Journal = {
  journal_id: number;
  journal_text: string;
  overall_mood: string | null;
  created_at: string;
};

type Analysis = {
  analysis_id: number;
  source: 'journal' | 'chatbot' | 'daily_checkin';
  dominant_emotion: string | null;
  stress_percentage: number | null;
  anxiety_percentage: number | null;
  insight: string | null;
  created_at: string;
  emotions: Partial<Record<Emotion, number>>;
};

type Task = {
  task_id: number;
  task: string;
  deadline: string;
  is_completed: boolean;
  created_at: string;
};

type HistoryResponse = {
  journals: Journal[];
  analyses: Analysis[];
  tasks: Task[];
};

type Filter = 'all' | 'journals' | 'moods' | 'tasks';

type HistoryItem = {
  id: string;
  kind: Exclude<Filter, 'all'>;
  title: string;
  subtitle: string;
  date: string;
  emoji: string;
  color: string;
  detail: string;
  meta?: string;
};

const emotionInfo: Record<
  string,
  { label: string; emoji: string; color: string }
> = {
  happy: { label: 'Happy', emoji: '😊', color: '#18a875' },
  sad: { label: 'Sad', emoji: '😢', color: '#6388ed' },
  stressed: { label: 'Stressed', emoji: '😰', color: '#f07878' },
  angry: { label: 'Angry', emoji: '😠', color: '#e58a38' },
  anxious: { label: 'Anxious', emoji: '😰', color: '#a78bfa' },
  calm: { label: 'Calm', emoji: '😌', color: '#18a875' },
  neutral: { label: 'Neutral', emoji: '😐', color: '#8b8ba7' },
  anxiety: { label: 'Anxious', emoji: '😰', color: '#a78bfa' },
  happiness: { label: 'Happy', emoji: '😊', color: '#18a875' },
  sadness: { label: 'Sad', emoji: '😢', color: '#6388ed' },
  stress: { label: 'Stressed', emoji: '😰', color: '#f07878' },
  anger: { label: 'Angry', emoji: '😠', color: '#e58a38' },
  unclear: { label: 'Unclear', emoji: '💭', color: '#8b8ba7' },
};

function getToken(): string | null {
  return localStorage.getItem('mindease_token');
}

/**
 * Interpret timezone-less PostgreSQL timestamps as UTC.
 * Timestamps with an explicit timezone retain their original meaning.
 */
function getTimestampMilliseconds(value: string | null | undefined): number {
  if (!value) return 0;

  const trimmed = value.trim();
  if (!trimmed) return 0;

  const normalized = trimmed.includes('T')
    ? trimmed
    : trimmed.replace(' ', 'T');

  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized);

  const date = new Date(
    hasTimezone ? normalized : `${normalized}Z`
  );

  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function getEmotionInfo(value: string | null | undefined) {
  if (!value) return emotionInfo.unclear;

  const key = value.trim().toLowerCase();
  return emotionInfo[key] ?? emotionInfo.unclear;
}

export default function History() {
  const [data, setData] = useState<HistoryResponse>({
    journals: [],
    analyses: [],
    tasks: [],
  });

  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const loadHistory = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');

    try {
      const token = getToken();

      if (!token) {
        throw new Error('Your session has expired. Please log in again.');
      }

      const result = await apiRequest<HistoryResponse>(
        '/api/history',
        'GET',
        { token }
      );

      setData({
        journals: result.journals ?? [],
        analyses: result.analyses ?? [],
        tasks: result.tasks ?? [],
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not load your history.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const items = useMemo<HistoryItem[]>(() => {
    const list: HistoryItem[] = [];

    if (filter === 'all' || filter === 'journals') {
      for (const journal of data.journals) {
        const mood = journal.overall_mood;
        const emotion = getEmotionInfo(mood);

        list.push({
          id: `journal-${journal.journal_id}`,
          kind: 'journals',
          title: 'Journal entry',
          subtitle: mood
            ? `${emotion.emoji} ${emotion.label}`
            : 'Saved reflection',
          date: journal.created_at,
          emoji: '📔',
          color: '#8b5cf6',
          detail: journal.journal_text,
        });
      }
    }

    if (filter === 'all' || filter === 'moods') {
      for (const analysis of data.analyses) {
        const emotion = getEmotionInfo(analysis.dominant_emotion);

        const sourceLabel =
          analysis.source === 'chatbot'
            ? 'From AI companion conversation'
            : analysis.source === 'journal'
              ? 'From journal entry'
              : 'Daily check-in';

        list.push({
          id: `mood-${analysis.analysis_id}`,
          kind: 'moods',
          title: `${emotion.emoji} ${emotion.label} mood analysis`,
          subtitle: sourceLabel,
          date: analysis.created_at,
          emoji: emotion.emoji,
          color: emotion.color,
          detail:
            analysis.insight ||
            'A saved mood analysis is available for this entry.',
          meta: `Stress ${
            analysis.stress_percentage == null
              ? '—'
              : `${Math.round(analysis.stress_percentage)}%`
          } · Anxiety ${
            analysis.anxiety_percentage == null
              ? '—'
              : `${Math.round(analysis.anxiety_percentage)}%`
          }`,
        });
      }
    }

    if (filter === 'all' || filter === 'tasks') {
      for (const task of data.tasks) {
        list.push({
          id: `task-${task.task_id}`,
          kind: 'tasks',
          title: task.task,
          subtitle: task.is_completed
            ? 'Completed task'
            : 'Task not marked complete',
          date: task.created_at,
          emoji: task.is_completed ? '✅' : '📌',
          color: task.is_completed ? '#18a875' : '#d99a36',
          detail: `Due ${formatMindEaseDate(task.deadline)}. ${
            task.is_completed
              ? 'Well done completing this task.'
              : 'This task is still marked as pending.'
          }`,
        });
      }
    }

    return list.sort(
      (a, b) =>
        getTimestampMilliseconds(b.date) -
        getTimestampMilliseconds(a.date)
    );
  }, [data, filter]);

  const filters: Array<{ id: Filter; label: string; count: number }> = [
    {
      id: 'all',
      label: 'All activity',
      count:
        data.journals.length +
        data.analyses.length +
        data.tasks.length,
    },
    {
      id: 'journals',
      label: 'Journals',
      count: data.journals.length,
    },
    {
      id: 'moods',
      label: 'Mood analysis',
      count: data.analyses.length,
    },
    {
      id: 'tasks',
      label: 'Tasks',
      count: data.tasks.length,
    },
  ];

  return (
    <section
      className="page-section"
      style={{ display: 'grid', gap: 22 }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <Link className="back-link" to="/dashboard">
            <ArrowLeft size={15} /> Back to dashboard
          </Link>

          <div className="eyebrow" style={{ marginTop: 16 }}>
            <span className="eyebrow-dot" /> YOUR WELLNESS TIMELINE
          </div>

          <h1 style={{ margin: '8px 0' }}>
            History <span aria-hidden="true">🗓️</span>
          </h1>

          <p className="muted" style={{ margin: 0 }}>
            Your saved journals, eligible mood analyses, and tasks — newest
            first.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={() => void loadHistory(true)}
          disabled={refreshing}
        >
          {refreshing ? (
            <LoaderCircle size={16} className="animate-spin" />
          ) : (
            <RefreshCw size={16} />
          )}
          Refresh history
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: 12,
        }}
      >
        {[
          {
            label: 'Journal entries',
            value: data.journals.length,
            icon: BookOpen,
            color: '#8b5cf6',
          },
          {
            label: 'Mood analyses',
            value: data.analyses.length,
            icon: Brain,
            color: '#18a875',
          },
          {
            label: 'Tasks tracked',
            value: data.tasks.length,
            icon: CheckCircle2,
            color: '#e58a38',
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <article
            className="card"
            key={label}
            style={{ padding: 18 }}
          >
            <span
              style={{
                display: 'inline-flex',
                padding: 10,
                borderRadius: 13,
                background: `${color}18`,
                color,
              }}
            >
              <Icon size={19} />
            </span>

            <div
              style={{
                fontSize: 27,
                fontWeight: 750,
                marginTop: 10,
              }}
            >
              {value}
            </div>

            <div className="muted" style={{ fontSize: 13 }}>
              {label}
            </div>
          </article>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {filters.map((item) => (
          <button
            key={item.id}
            onClick={() => setFilter(item.id)}
            className={
              filter === item.id ? 'primary-button' : 'small-select'
            }
            style={{
              cursor: 'pointer',
              border:
                filter === item.id
                  ? undefined
                  : '1px solid var(--border-color, #e5e7eb)',
            }}
          >
            {item.label} ({item.count})
          </button>
        ))}
      </div>

      {error && (
        <div
          className="card"
          role="alert"
          style={{ padding: 16, color: '#c24141' }}
        >
          {error}
          <button
            className="small-select"
            style={{ marginLeft: 12 }}
            onClick={() => void loadHistory(true)}
          >
            Try again
          </button>
        </div>
      )}

      {loading ? (
        <div
          className="card"
          style={{
            padding: 28,
            display: 'flex',
            gap: 12,
            alignItems: 'center',
          }}
        >
          <LoaderCircle className="animate-spin" size={20} />
          Loading your saved history…
        </div>
      ) : items.length === 0 ? (
        <div
          className="card"
          style={{ textAlign: 'center', padding: '42px 20px' }}
        >
          <span style={{ fontSize: 42 }}>🌱</span>
          <h2 style={{ marginBottom: 8 }}>Your timeline starts here</h2>
          <p className="muted">
            No saved{' '}
            {filter === 'all'
              ? 'activity'
              : filter === 'moods'
                ? 'mood analyses'
                : filter}{' '}
            found yet. Save a journal, record an eligible mood analysis, or
            add a task to see it here.
          </p>
          <Link
            className="primary-button"
            to="/journaling"
            style={{ display: 'inline-flex', marginTop: 8 }}
          >
            Write a journal
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {items.map((item) => (
            <article
              className="card"
              key={item.id}
              style={{ padding: 0, overflow: 'hidden' }}
            >
              <button
                onClick={() =>
                  setExpanded(expanded === item.id ? null : item.id)
                }
                aria-expanded={expanded === item.id}
                style={{
                  display: 'flex',
                  width: '100%',
                  alignItems: 'center',
                  gap: 14,
                  padding: 18,
                  border: 0,
                  background: 'transparent',
                  color: 'inherit',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <span
                  style={{
                    display: 'grid',
                    placeItems: 'center',
                    width: 48,
                    height: 48,
                    flexShrink: 0,
                    borderRadius: 15,
                    background: `${item.color}18`,
                    fontSize: 25,
                  }}
                >
                  {item.emoji}
                </span>

                <span style={{ flex: 1, minWidth: 0 }}>
                  <strong
                    style={{
                      display: 'block',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {item.title}
                  </strong>

                  <span
                    className="muted"
                    style={{
                      display: 'block',
                      fontSize: 13,
                      marginTop: 4,
                    }}
                  >
                    {item.subtitle}
                  </span>

                  <span
                    className="muted"
                    style={{
                      display: 'flex',
                      gap: 6,
                      alignItems: 'center',
                      fontSize: 12,
                      marginTop: 7,
                    }}
                  >
                    <Clock3 size={13} />
                    {formatMindEaseTimestamp(item.date)}
                  </span>
                </span>

                <ChevronDown
                  size={18}
                  style={{
                    transform:
                      expanded === item.id ? 'rotate(180deg)' : undefined,
                    transition: 'transform 180ms ease',
                    flexShrink: 0,
                  }}
                />
              </button>

              {expanded === item.id && (
                <div
                  style={{
                    borderTop: '1px solid var(--border-color, #e5e7eb)',
                    padding: '16px 20px 20px 80px',
                    display: 'grid',
                    gap: 10,
                  }}
                >
                  {item.meta && (
                    <strong style={{ fontSize: 13 }}>{item.meta}</strong>
                  )}

                  <p
                    style={{
                      margin: 0,
                      whiteSpace: 'pre-wrap',
                      overflowWrap: 'anywhere',
                      lineHeight: 1.7,
                    }}
                  >
                    {item.detail}
                  </p>

                  {item.kind === 'journals' && (
                    <span className="muted" style={{ fontSize: 12 }}>
                      This is your private journal entry. It is visible only
                      in your own account history.
                    </span>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      <p
        className="muted"
        style={{
          display: 'flex',
          gap: 7,
          alignItems: 'center',
          fontSize: 12,
        }}
      >
        <CalendarClock size={14} />
        History is loaded from your saved V3 database records. Face-scan
        results are excluded from mood reports.
      </p>
    </section>
  );
}
