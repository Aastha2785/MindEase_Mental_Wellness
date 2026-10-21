import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock3,
  ListTodo,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../lib/api';
type Task = {
  id: number;
  title: string;
  deadline: string;
  completed: boolean;
  createdAt: number;
};
type ApiTask = {
  task_id: number;
  task: string;
  deadline: string;
  is_completed: boolean;
  created_at: string;
};
function getTimeLeft(deadline: string, now: number) {
  const difference = new Date(deadline).getTime() - now;
  if (difference <= 0) return 'Deadline passed';
  const days = Math.floor(difference / 86400000);
  const hours = Math.floor((difference % 86400000) / 3600000);
  const minutes = Math.floor((difference % 3600000) / 60000);
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}

function getUrgency(task: Task, now: number) {
  if (task.completed) {
    return { emoji: '🎉', label: 'All done!', color: '#10b981' };
  }

  const deadline = new Date(task.deadline).getTime();
  const remaining = deadline - now;
  const total = deadline - task.createdAt;
  const remainingRatio = total > 0 ? remaining / total : 0;

  if (remaining <= 0) {
    return { emoji: '😵', label: 'Overdue', color: '#ef4444' };
  }
  if (remaining <= 60 * 60 * 1000 || remainingRatio <= 0.1) {
    return { emoji: '😰', label: 'Urgent', color: '#ef4444' };
  }
  if (remaining <= 6 * 60 * 60 * 1000 || remainingRatio <= 0.25) {
    return { emoji: '😟', label: 'Time is running out', color: '#f97316' };
  }
  if (remaining <= 24 * 60 * 60 * 1000 || remainingRatio <= 0.5) {
    return { emoji: '😬', label: 'Getting closer', color: '#eab308' };
  }
  return { emoji: '😊', label: 'Plenty of time', color: '#22c55e' };
}
export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('');
  const [notice, setNotice] = useState('');
  const [now, setNow] = useState(Date.now());
  const [isDark, setIsDark] = useState(() => detectDarkTheme());

  function detectDarkTheme() {
    if (typeof document === 'undefined') return false;
    const root = document.documentElement;
    const body = document.body;
    const storedTheme = localStorage.getItem('theme') || localStorage.getItem('mindease-theme') || localStorage.getItem('color-theme');
    const themeValue = `${root.getAttribute('data-theme') || ''} ${root.getAttribute('data-mode') || ''} ${body?.getAttribute('data-theme') || ''} ${body?.getAttribute('data-mode') || ''} ${root.className} ${body?.className || ''} ${storedTheme || ''}`.toLowerCase();
    if (/dark/.test(themeValue)) return true;
    if (/light/.test(themeValue)) return false;
    const bg = getComputedStyle(root).backgroundColor;
    const match = bg.match(/\d+(?:\.\d+)?/g);
    if (match && match.length >= 3) {
      const [r, g, b] = match.slice(0, 3).map(Number);
      return (r * 299 + g * 587 + b * 114) / 1000 < 100;
    }
    return false;
  }

  useEffect(() => {
    const refreshTheme = () => setIsDark(detectDarkTheme());
    refreshTheme();
    const observer = new MutationObserver(refreshTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme', 'data-mode', 'style'] });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class', 'data-theme', 'data-mode', 'style'] });
    window.addEventListener('storage', refreshTheme);
    return () => {
      observer.disconnect();
      window.removeEventListener('storage', refreshTheme);
    };
  }, []);
  async function loadTasks() {
    const token = localStorage.getItem('mindease_token');

    if (!token) {
      setNotice('Please log in again to load your tasks.');
      return;
    }

    try {
      const result = await apiRequest<{ tasks: ApiTask[] }>(
        '/api/tasks',
        'GET',
        { token },
      );

      setTasks(
        result.tasks.map((item) => ({
          id: item.task_id,
          title: item.task,
          deadline: item.deadline,
          completed: item.is_completed,
          createdAt: new Date(item.created_at).getTime(),
        })),
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : 'Unable to load your saved tasks.',
      );
    }
  }

  useEffect(() => {
    void loadTasks();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  async function addTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice('');

    if (!title.trim()) {
      setNotice('Please enter a task name first. 🌱');
      return;
    }

    if (!deadlineDate || !deadlineTime) {
      setNotice('Please add both the deadline date and time. ⏰');
      return;
    }

    const deadlineTimestamp = new Date(
      `${deadlineDate}T${deadlineTime}`,
    ).getTime();

    if (!Number.isFinite(deadlineTimestamp) || deadlineTimestamp <= Date.now()) {
      setNotice('Choose a future deadline so you have time to complete it. 💚');
      return;
    }

    const token = localStorage.getItem('mindease_token');

    if (!token) {
      setNotice('Please log in again to save your task.');
      return;
    }

    try {
      const result = await apiRequest<{ task: ApiTask }>(
        '/api/tasks',
        'POST',
        {
          token,
          body: {
            task: title.trim(),
            deadline: `${deadlineDate}T${deadlineTime}:00`,
          },
        },
      );

      const savedTask = result.task;

      setTasks((current) => [
        ...current,
        {
          id: savedTask.task_id,
          title: savedTask.task,
          deadline: savedTask.deadline,
          completed: savedTask.is_completed,
          createdAt: new Date(savedTask.created_at).getTime(),
        },
      ]);

      setTitle('');
      setDeadlineDate('');
      setDeadlineTime('');
      setNotice('Your task has been saved! You’ve got this! ✨');
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : 'Unable to save your task. Please try again.',
      );
    }
  }

  async function toggleTask(id: number) {
    const taskToUpdate = tasks.find((task) => task.id === id);
    const token = localStorage.getItem('mindease_token');

    if (!taskToUpdate) return;

    if (!token) {
      setNotice('Please log in again to update your task.');
      return;
    }

    try {
      const result = await apiRequest<{ task: ApiTask }>(
        `/api/tasks/${id}`,
        'PATCH',
        {
          token,
          body: { is_completed: !taskToUpdate.completed },
        },
      );

      const updatedTask = result.task;
      setTasks((current) =>
        current.map((task) =>
          task.id === id
            ? { ...task, completed: updatedTask.is_completed }
            : task,
        ),
      );
      setNotice('');
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : 'Unable to update the task. Please try again.',
      );
    }
  }

  async function deleteTask(id: number) {
    const token = localStorage.getItem('mindease_token');

    if (!token) {
      setNotice('Please log in again to delete your task.');
      return;
    }

    try {
      await apiRequest<{ message: string }>(
        `/api/tasks/${id}`,
        'DELETE',
        { token },
      );

      setTasks((current) => current.filter((task) => task.id !== id));
      setNotice('Task deleted successfully.');
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : 'Unable to delete the task. Please try again.',
      );
    }
  }

  const completedCount = tasks.filter((task) => task.completed).length;
  const pendingTasks = tasks.filter((task) => !task.completed);
  const progress = tasks.length
    ? Math.round((completedCount / tasks.length) * 100)
    : 0;
  function getDeadlineProgress(task: Task) {
    if (task.completed) return 100;

    const deadline = new Date(task.deadline).getTime();
    const total = deadline - task.createdAt;
    const remaining = deadline - now;

    if (!Number.isFinite(deadline) || remaining <= 0) return 0;
    if (!Number.isFinite(total) || total <= 0) return 100;

    // The bar represents the percentage of time still available, so it shrinks as the deadline approaches.
    return Math.min(100, Math.max(0, Math.round((remaining / total) * 100)));
  }
  return (
    <section className={`page-section tasks-page ${isDark ? 'tasks-dark' : 'tasks-light'}`}>
      <style>{`
        .tasks-page { color: var(--text-primary); transition: background-color 180ms ease, color 180ms ease; }
        .tasks-page.tasks-dark {
          --text-primary: #e5f7ec;
          --card-bg: #102a21;
          --surface-secondary: #17382b;
          --border-color: #285541;
          --input-bg: #0d241b;
          color: #e5f7ec;
          color-scheme: dark;
        }
        .tasks-page.tasks-light {
          --text-primary: #17352a;
          --card-bg: #ffffff;
          --surface-secondary: #eaf8f0;
          --border-color: #d0e8da;
          --input-bg: #ffffff;
          color: #17352a;
          color-scheme: light;
        }
        .tasks-page.tasks-dark .back-link { color: #a7f3d0; }
        .tasks-page.tasks-light .back-link { color: #087f5b; }
        .tasks-page input { accent-color: #10b981; }
        .tasks-page input::placeholder { color: var(--text-primary); opacity: .55; }
        .tasks-page.tasks-dark input { background-color: var(--input-bg); border-color: var(--border-color); color: var(--text-primary); }
        .tasks-page.tasks-light input { background-color: var(--input-bg); border-color: var(--border-color); color: var(--text-primary); }
      `}</style>
      <Link className="back-link" to="/">
        <ArrowLeft size={15} /> Back to dashboard
      </Link>
      <div
        style={{
          maxWidth: 1050,
          margin: '0 auto',
          display: 'grid',
          gap: 24,
          color: 'var(--text-primary)',
        }}
      >
        <header
          style={{
            padding: '30px',
            borderRadius: 28,
            background:
              isDark
                ? 'radial-gradient(circle at 85% 15%, rgba(16,185,129,0.22), transparent 38%), linear-gradient(125deg, #102a21, #0b1f18)'
                : 'linear-gradient(125deg, var(--surface-secondary, #e7f8ef), var(--card-bg, #ffffff))',
            border: '1px solid var(--border-color, #d8eee2)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 20,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ maxWidth: 570 }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  color: isDark ? '#6ee7b7' : '#0d9870',
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: 1.5,
                }}
              >
                <Sparkles size={16} /> YOUR LITTLE STEPS MATTER
              </span>
              <h1
                style={{
                  fontSize: 'clamp(28px, 4vw, 42px)',
                  lineHeight: 1.15,
                  margin: '14px 0 10px',
                }}
              >
                Your daily task garden 🌱
              </h1>
              <p style={{ lineHeight: 1.7, margin: 0, opacity: 0.8 }}>
                Make space for what matters. One small step at a time.
              </p>
            </div>
            <div
              style={{
                width: 105,
                height: 105,
                borderRadius: 32,
                background: 'rgba(16,185,129,0.13)',
                display: 'grid',
                placeItems: 'center',
                color: isDark ? '#6ee7b7' : '#059669',
                transform: 'rotate(5deg)',
              }}
            >
              <ListTodo size={49} />
            </div>
          </div>
          <div
            style={{
              marginTop: 25,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
              gap: 12,
            }}
          >
            {[
              { label: 'Total tasks', value: tasks.length, icon: <ListTodo size={19} /> },
              { label: 'Still to do', value: pendingTasks.length, icon: <Clock3 size={19} /> },
              { label: 'Completed', value: completedCount, icon: <CheckCircle2 size={19} /> },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  padding: 16,
                  borderRadius: 19,
                  background: 'var(--card-bg, rgba(255,255,255,0.8))',
                  border: '1px solid var(--border-color, #d8eee2)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    alignItems: 'center',
                    opacity: 0.75,
                    fontSize: 12,
                  }}
                >
                  {item.icon} {item.label}
                </div>
                <strong style={{ display: 'block', fontSize: 27, marginTop: 7 }}>
                  {item.value}
                </strong>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 20 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 13,
                marginBottom: 8,
              }}
            >
              <span>Your completion progress</span>
              <strong>{progress}%</strong>
            </div>
            <div
              style={{
                height: 10,
                borderRadius: 99,
                background: 'var(--border-color, #d1fae5)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  borderRadius: 99,
                  background: 'linear-gradient(90deg, #34d399, #059669)',
                  transition: 'width 250ms ease',
                }}
              />
            </div>
          </div>
        </header>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 310px), 1fr))',
            gap: 22,
            alignItems: 'start',
          }}
        >
          <form
            onSubmit={addTask}
            style={{
              padding: 23,
              borderRadius: 24,
              background: 'var(--card-bg, #ffffff)',
              border: '1px solid var(--border-color, #e5e7eb)',
              display: 'grid',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 15,
                  background: 'rgba(16,185,129,0.14)',
                  color: isDark ? '#6ee7b7' : '#059669',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <Plus size={24} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 19 }}>Plant a new task</h2>
                <p style={{ margin: '4px 0 0', fontSize: 12, opacity: 0.7 }}>
                  Give it a name and a deadline.
                </p>
              </div>
            </div>
            <label style={{ display: 'grid', gap: 7, fontSize: 13, fontWeight: 650 }}>
              What do you want to do?
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Study DBMS for 30 minutes"
                maxLength={160}
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'grid', gap: 7, fontSize: 13, fontWeight: 650 }}>
              <span style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                <CalendarClock size={16} /> Deadline date
              </span>
              <input
                type="date"
                value={deadlineDate}
                min={new Date().toLocaleDateString('en-CA')}
                onChange={(event) => setDeadlineDate(event.target.value)}
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'grid', gap: 7, fontSize: 13, fontWeight: 650 }}>
              <span style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                <Clock3 size={16} /> Deadline time
              </span>
              <input
                type="time"
                value={deadlineTime}
                onChange={(event) => setDeadlineTime(event.target.value)}
                style={inputStyle}
              />
            </label>
            {notice && (
              <div
                role="status"
                style={{
                  padding: '12px 14px',
                  borderRadius: 13,
                  background: 'var(--surface-secondary, #ecfdf5)',
                  border: '1px solid var(--border-color, #d1fae5)',
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
              >
                {notice}
              </div>
            )}
            <button
              type="submit"
              style={{
                border: 0,
                borderRadius: 15,
                padding: '14px 18px',
                background: 'linear-gradient(110deg, #10b981, #047857)',
                color: '#ffffff',
                fontWeight: 750,
                fontSize: 14,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 9,
                cursor: 'pointer',
                boxShadow: '0 8px 20px rgba(5,150,105,0.2)',
              }}
            >
              <Plus size={18} /> Add my task
            </button>
            <p style={{ fontSize: 11, opacity: 0.7, lineHeight: 1.6, margin: 0 }}>
              ⏰ Adding a deadline helps you see how much time you have left.
            </p>
          </form>
          <section
            style={{
              padding: 23,
              borderRadius: 24,
              background: 'var(--card-bg, #ffffff)',
              border: '1px solid var(--border-color, #e5e7eb)',
              minWidth: 0,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                marginBottom: 18,
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: 19 }}>Your tasks</h2>
                <p style={{ margin: '5px 0 0', fontSize: 12, opacity: 0.7 }}>
                  Every small win counts.
                </p>
              </div>
              <span
                style={{
                  borderRadius: 99,
                  padding: '7px 11px',
                  background: 'rgba(16,185,129,0.12)',
                  color: isDark ? '#6ee7b7' : '#059669',
                  fontSize: 12,
                  fontWeight: 750,
                }}
              >
                {pendingTasks.length} left
              </span>
            </div>
            {tasks.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '35px 12px',
                  border: '1px dashed var(--border-color, #d1d5db)',
                  borderRadius: 18,
                }}
              >
                <div style={{ fontSize: 40, marginBottom: 10 }}>🪴</div>
                <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>Your task garden is ready</h3>
                <p style={{ fontSize: 13, lineHeight: 1.7, opacity: 0.7, margin: 0 }}>
                  Add your first task and give it a deadline to get started.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 13 }}>
                {[...tasks].sort((a, b) => {
                  if (a.completed !== b.completed) return a.completed ? 1 : -1;
                  return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
                }).map((task) => {
                  const remaining = new Date(task.deadline).getTime() - now;
                  const overdue = remaining <= 0 && !task.completed;
                  const barProgress = getDeadlineProgress(task);
                  const urgency = getUrgency(task, now);
                  return (
                    <article
                      key={task.id}
                      style={{
                        padding: 16,
                        borderRadius: 18,
                        border: '1px solid var(--border-color, #e5e7eb)',
                        background: 'var(--surface-secondary, #f8fafc)',
                        opacity: task.completed ? 0.72 : 1,
                      }}
                    >
                      <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                        <button
                          type="button"
                          onClick={() => toggleTask(task.id)}
                          aria-label={task.completed ? 'Mark task incomplete' : 'Mark task complete'}
                          title={task.completed ? 'Mark incomplete' : 'Mark complete'}
                          style={{
                            width: 25,
                            height: 25,
                            flexShrink: 0,
                            borderRadius: 9,
                            border: task.completed ? '1px solid #059669' : '1px solid var(--border-color, #9ca3af)',
                            background: task.completed ? '#059669' : 'transparent',
                            color: '#ffffff',
                            display: 'grid',
                            placeItems: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          {task.completed && <Check size={16} />}
                        </button>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h3
                            style={{
                              margin: '2px 0 7px',
                              fontSize: 14,
                              overflowWrap: 'anywhere',
                              textDecoration: task.completed ? 'line-through' : 'none',
                            }}
                          >
                            {task.title}
                          </h3>
                          <div
                            style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              alignItems: 'center',
                              gap: 6,
                              fontSize: 11,
                              opacity: 0.78,
                            }}
                          >
                            <CalendarClock size={13} />
                            {new Date(task.deadline).toLocaleString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteTask(task.id)}
                          aria-label={`Delete ${task.title}`}
                          title="Delete task"
                          style={{
                            border: 0,
                            background: 'transparent',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: 4,
                          }}
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                      <div style={{ marginTop: 15 }}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 8,
                            fontSize: 11,
                            marginBottom: 7,
                          }}
                        >
                          <strong
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              color: urgency.color,
                            }}
                            title={urgency.label}
                          >
                            <span aria-hidden="true" style={{ fontSize: 17 }}>{urgency.emoji}</span>
                            {task.completed ? 'Completed ✓' : overdue ? 'Overdue' : getTimeLeft(task.deadline, now)}
                          </strong>
                          <span style={{ color: urgency.color, fontWeight: 700 }}>
                            {task.completed ? '100% complete' : `${barProgress}% time left`}
                          </span>
                        </div>
                        <div
                          role="progressbar"
                          aria-label={`Time remaining for ${task.title}`}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={task.completed ? 100 : barProgress}
                          style={{
                            height: 8,
                            borderRadius: 99,
                            overflow: 'hidden',
                            background: 'var(--border-color, #e5e7eb)',
                          }}
                        >
                          <div
                            style={{
                              width: `${barProgress}%`,
                              height: '100%',
                              borderRadius: 99,
                              background: urgency.color,
                              boxShadow: `0 0 8px ${urgency.color}55`,
                              transition: 'width 500ms ease, background-color 500ms ease',
                            }}
                          />
                        </div>
                        {overdue && (
                          <p style={{ color: '#ef4444', fontSize: 11, margin: '8px 0 0' }}>
                            This task is overdue 😵. You can still complete it or choose a new deadline.
                          </p>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </section>
  );
}
const inputStyle: React.CSSProperties = {
  width: '100%',
  minWidth: 0,
  boxSizing: 'border-box',
  padding: '12px 13px',
  borderRadius: 12,
  border: '1px solid var(--border-color, #d1d5db)',
  background: 'var(--input-bg, transparent)',
  color: 'var(--text-primary, inherit)',
  font: 'inherit',
  fontSize: 13,
  outlineOffset: 2,
};
