
import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  BookHeart,
  Brain,
  CalendarDays,
  CheckCircle2,
  Clock,
  Heart,
  LoaderCircle,
  NotebookPen,
  RefreshCw,
  Save,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../lib/api';

type EmotionScores = {
  happy: number;
  sad: number;
  stressed: number;
  angry: number;
};

type MoodAnalysis = {
  eligible: boolean;
  emotions: EmotionScores;
  dominantEmotion: string;
  stressPercentage: number;
  anxietyPercentage: number;
  insight: string;
};

type Journal = {
  journal_id: number;
  journal_text: string;
  overall_mood: string | null;
  created_at: string;
};

type JournalListResponse = {
  journals: Journal[];
};

type SaveResponse = {
  journal: {
    journal_id: number;
    created_at: string;
  };
  analysis: MoodAnalysis | null;
  message: string;
};

type AnalyzeResponse = {
  analysis: MoodAnalysis | null;
  message?: string;
};

const emotionDetails = [
  {
    key: 'happy',
    label: 'Happy',
    emoji: '😊',
    className: 'emotion-happy',
    note: 'Positive feelings and uplifting moments',
  },
  {
    key: 'sad',
    label: 'Sad',
    emoji: '😢',
    className: 'emotion-sad',
    note: 'Sadness or emotionally difficult moments',
  },
  {
    key: 'stressed',
    label: 'Stressed',
    emoji: '😰',
    className: 'emotion-stressed',
    note: 'Pressure, worry or feeling overwhelmed',
  },
  {
    key: 'angry',
    label: 'Angry',
    emoji: '😠',
    className: 'emotion-angry',
    note: 'Frustration or anger expressed in your writing',
  },
] as const;

const prompts = [
  '🌻 What made you smile today?',
  '🌧️ What has been weighing on your mind?',
  '✨ What is one thing you are proud of?',
];

function getToken() {
  return localStorage.getItem('mindease_token');
}

function formatDate(value: string) {
  return new Date(value).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function Journaling() {
  const [text, setText] = useState('');
  const [journals, setJournals] = useState<Journal[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [analysis, setAnalysis] = useState<MoodAnalysis | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const token = getToken();
  const wordCount = text.trim()
    ? text.trim().split(/\s+/).length
    : 0;

  async function loadJournals() {
    if (!token) {
      setError('Please log in to access your private journal.');
      setLoadingHistory(false);
      return;
    }

    try {
      const result = await apiRequest<JournalListResponse>(
        '/api/journals',
        'GET',
        { token },
      );

      setJournals(result.journals);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load your journal history.',
      );
    } finally {
      setLoadingHistory(false);
    }
  }

  useEffect(() => {
    void loadJournals();
    // Load once when this page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startNewEntry() {
    setText('');
    setSelectedId(null);
    setAnalysis(null);
    setError('');
    setNotice('');
  }

  async function saveJournal() {
    setError('');
    setNotice('');
    setAnalysis(null);

    if (!token) {
      setError('Your session is missing. Please log in again.');
      return;
    }

    if (text.trim().length < 10) {
      setError('Write at least 10 characters before saving your journal.');
      return;
    }

    if (text.trim().length > 10000) {
      setError('Your journal must be 10,000 characters or fewer.');
      return;
    }

    setSaving(true);

    try {
      const result = await apiRequest<SaveResponse>(
        '/api/journals',
        'POST',
        {
          token,
          body: { journal_text: text.trim() },
        },
      );

      setSelectedId(result.journal.journal_id);
      setAnalysis(result.analysis);
      setNotice(result.message || 'Your journal has been saved! 💚');

      await loadJournals();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not save your journal. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  }

  
async function analyzeSelectedJournal() {
  setError('');
  setNotice('');
  setAnalysis(null);

  if (!token) {
    setError('Please log in again to analyze your journal.');
    return;
  }

  if (text.trim().length < 10) {
    setError('Write at least 10 characters before analyzing your mood.');
    return;
  }

  setAnalyzing(true);

  try {
    const result = await apiRequest<AnalyzeResponse>(
      '/api/journals/analyze-text',
      'POST',
      {
        token,
        body: { journal_text: text.trim() },
      },
    );

    setAnalysis(result.analysis);

    setNotice(
      result.analysis?.eligible
        ? 'Your mood reflection is ready! ✨'
        : result.message ||
            'There is not enough emotional information to estimate a mood.',
    );
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : 'Mood analysis failed. Please try again.',
    );
  } finally {
    setAnalyzing(false);
  }
}

  async function openJournal(journal: Journal) {
    setError('');
    setNotice('');
    setAnalysis(null);

    if (!token) {
      setError('Please log in again to view your journal.');
      return;
    }

    try {
      const result = await apiRequest<{ journal: Journal }>(
        `/api/journals/${journal.journal_id}`,
        'GET',
        { token },
      );

      setSelectedId(result.journal.journal_id);
      setText(result.journal.journal_text);

      setNotice(`Opened your journal from ${formatDate(journal.created_at)}.`);

      // The history endpoint doesn't return the analysis. The user can
      // request a fresh analysis with the button below.
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to open this journal entry.',
      );
    }
  }

  return (
    <section className="page-section journal-page">
      <div className="page-title-row">
        <div>
          <Link className="back-link" to="/">
            <ArrowLeft size={15} /> Back to dashboard
          </Link>

          <div className="eyebrow">
            <span className="eyebrow-dot" />
            YOUR PRIVATE LITTLE CORNER
          </div>

          <h1>My Journaling Space 🌿</h1>
          <p>
            Let your thoughts flow. Reflect without judgement, and
            discover the emotions expressed in your writing.
          </p>
        </div>

        <span className="icon-tile mint page-title-icon">
          <BookHeart size={25} />
        </span>
      </div>

      <div className="journal-welcome card">
        <div className="journal-welcome-art" aria-hidden="true">
          <span>🌱</span>
          <span>☁️</span>
          <span>💚</span>
        </div>

        <div className="journal-welcome-copy">
          <span className="journal-mini-label">
            A MOMENT JUST FOR YOU ✨
          </span>
          <h2>How is your heart feeling today?</h2>
          <p>
            You don't need perfect words. Just start wherever you are.
          </p>
        </div>
      </div>

      <div className="journal-layout">
        <div className="journal-main-column">
          <article className="card journal-editor-card">
            <div className="card-heading">
              <div>
                <span className="icon-tile purple">
                  <NotebookPen size={18} />
                </span>
                <h2>{selectedId ? 'Your journal entry' : 'Dear diary…'}</h2>
              </div>

              <span className="journal-private-pill">
                <Heart size={12} /> Private
              </span>
            </div>

            <p className="muted">
              Write about your day, your worries, your wins, or anything
              you need to let out.
            </p>

            <div className="journal-prompts">
              {prompts.map((prompt) => (
                <button
                  type="button"
                  className="journal-prompt"
                  key={prompt}
                  onClick={() =>
                    setText((previous) =>
                      previous
                        ? `${previous}\n\n${prompt.slice(3)}\n`
                        : `${prompt.slice(3)}\n`,
                    )
                  }
                  disabled={text.trim().length < 10 || saving || analyzing}
                >
                  {prompt}
                </button>
              ))}
            </div>

            <label className="journal-label" htmlFor="journal-text">
              Your thoughts today 💭
            </label>

            <textarea
              id="journal-text"
              className="journal-textarea"
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                setError('');
                setNotice('');
              }}
              placeholder="Today was a day full of..."
              rows={10}
              maxLength={10000}
              disabled={saving || analyzing}
            />

            <div className="journal-editor-footer">
              <span>
                ✍️ {wordCount} words · {text.length}/10,000 characters
              </span>
              <span>Your words matter 💚</span>
            </div>

            {error && (
              <div className="journal-message journal-error" role="alert">
                <span>🌧️</span>
                <p>{error}</p>
              </div>
            )}

            {notice && (
              <div className="journal-message journal-success" role="status">
                <CheckCircle2 size={17} />
                <p>{notice}</p>
              </div>
            )}

            <div className="journal-actions">
              <button
                type="button"
                className="journal-secondary-button"
                onClick={startNewEntry}
                disabled={saving || analyzing}
              >
                <RefreshCw size={16} /> New entry
              </button>

              <button
                type="button"
                className="primary-button journal-save-button"
                onClick={saveJournal}
                disabled={saving || analyzing}
              >
                {saving ? (
                  <LoaderCircle className="journal-spinner" size={16} />
                ) : (
                  <Save size={16} />
                )}
                {saving ? 'Saving & analysing…' : '💚 Save journal'}
              </button>
            </div>
          </article>

          <article className="card journal-analysis-card">
            <div className="card-heading">
              <div>
                <span className="icon-tile mint">
                  <Brain size={18} />
                </span>
                <h2>Let's understand your emotions 🧠</h2>
              </div>
              <Sparkles size={19} className="journal-sparkle" />
            </div>

            <p className="muted">
              Your journal text is analyzed for emotional signals. You
              can request an analysis again whenever you want.
            </p>

            <button
              type="button"
              className="journal-analyze-button"
              onClick={analyzeSelectedJournal}
              disabled={!selectedId || saving || analyzing}
            >
              {analyzing ? (
                <LoaderCircle className="journal-spinner" size={18} />
              ) : (
                <Brain size={18} />
              )}
              {analyzing ? 'Understanding your words…' : '✨ Analyse My Mood'}
            </button>

            {!selectedId && (
              <p className="journal-button-hint">
                💡 Save your journal first to enable mood analysis.
              </p>
            )}

            {analysis && (
              <div className="journal-results">
                <div className="journal-results-heading">
                  <div>
                    <span className="journal-mini-label">
                      YOUR EMOTIONAL SNAPSHOT 🌈
                    </span>
                    <h3>Mood breakdown</h3>
                  </div>

                  <span className="journal-result-badge">
                    {analysis.dominantEmotion === 'unclear'
                      ? '💭 Still exploring'
                      : `💚 ${analysis.dominantEmotion}`}
                  </span>
                </div>

                <div className="emotion-chart journal-emotion-chart">
                  {emotionDetails.map((emotion) => {
                    const score = Math.max(
                      0,
                      Math.min(100, analysis.emotions[emotion.key] ?? 0),
                    );

                    return (
                      <div className="emotion-row" key={emotion.key}>
                        <div className="emotion-label-line">
                          <span>
                            {emotion.emoji} {emotion.label}
                          </span>
                          <strong>{score}%</strong>
                        </div>

                        <div
                          className="emotion-track journal-emotion-track"
                          role="img"
                          aria-label={`${emotion.label}: ${score}%`}
                        >
                          <div
                            className={`emotion-fill ${emotion.className} journal-animated-fill`}
                            style={{ width: `${score}%` }}
                          />
                        </div>

                        <span className="emotion-note">
                          {emotion.note}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="journal-stats-grid">
                  <div className="journal-stat stress-stat">
                    <span>😰 Stress estimate</span>
                    <strong>{analysis.stressPercentage}%</strong>
                  </div>

                  <div className="journal-stat anxiety-stat">
                    <span>🌊 Anxiety estimate</span>
                    <strong>{analysis.anxietyPercentage}%</strong>
                  </div>
                </div>

                <div className="journal-insight">
                  <span className="journal-insight-icon">🌷</span>
                  <div>
                    <h4>A gentle reflection</h4>
                    <p>{analysis.insight}</p>
                  </div>
                </div>

                <p className="journal-disclaimer">
                  These are estimates based on emotional language, not
                  a diagnosis or a definitive measure of how you feel.
                </p>
              </div>
            )}

            {!analysis && !analyzing && (
              <div className="journal-analysis-empty">
                <span>🌈</span>
                <p>
                  Your mood chart and personal insight will appear here
                  after an eligible analysis.
                </p>
              </div>
            )}
          </article>
        </div>

        <aside className="journal-sidebar-column">
          <article className="card journal-history-card">
            <div className="card-heading">
              <div>
                <span className="icon-tile amber">
                  <Clock size={18} />
                </span>
                <h2>Past reflections 📚</h2>
              </div>

              <button
                type="button"
                className="journal-refresh-button"
                onClick={() => void loadJournals()}
                title="Refresh journal history"
                aria-label="Refresh journal history"
                disabled={loadingHistory}
              >
                <RefreshCw
                  size={15}
                  className={loadingHistory ? 'journal-spinner' : ''}
                />
              </button>
            </div>

            {loadingHistory ? (
              <div className="journal-history-empty">
                <LoaderCircle className="journal-spinner" size={20} />
                <p>Loading your reflections…</p>
              </div>
            ) : journals.length === 0 ? (
              <div className="journal-history-empty">
                <span>📖</span>
                <p>Your story starts here. Save your first journal!</p>
              </div>
            ) : (
              <div className="journal-history-list">
                {journals.map((journal) => (
                  <button
                    type="button"
                    key={journal.journal_id}
                    className={`journal-history-item ${
                      selectedId === journal.journal_id
                        ? 'journal-history-selected'
                        : ''
                    }`}
                    onClick={() => void openJournal(journal)}
                  >
                    <span className="journal-history-icon">📝</span>

                    <span className="journal-history-copy">
                      <strong>
                        {journal.journal_text.slice(0, 65)}
                        {journal.journal_text.length > 65 ? '…' : ''}
                      </strong>
                      <small>
                        <CalendarDays size={12} />
                        {formatDate(journal.created_at)}
                      </small>
                      {journal.overall_mood && (
                        <span className="journal-history-mood">
                          🌿 {journal.overall_mood}
                        </span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <p className="journal-history-privacy">
              🔒 Only you can access your journal entries.
            </p>
          </article>

          <article className="card journal-kindness-card">
            <span className="journal-kindness-emoji">🪴</span>
            <h2>A reminder for you</h2>
            <p>
              You don't have to figure everything out today. One small
              step, one deep breath, one honest moment at a time.
            </p>
            <span>Be kind to yourself. 💚</span>
          </article>

          <article className="card journal-privacy-card">
            <span className="icon-tile mint">
              <Heart size={17} />
            </span>
            <h2>Your thoughts are personal</h2>
            <p>
              Journal text is intended for your private reflection and
              mood analysis. It should not be exposed in the admin
              portal.
            </p>
          </article>
        </aside>
      </div>
    </section>
  );
}
