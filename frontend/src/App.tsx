
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';

import AppLayout from './components/AppLayout';
import Dashboard from './pages/Dashboard';
import WeeklyAnalysis from './pages/WeeklyAnalysis';
import DailyAnalysis from './pages/DailyAnalysis';
import PlaceholderPage from './pages/PlaceholderPage';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AIChat from './pages/AIChat';
import Journaling from './pages/Journaling';
import Meditation from './pages/Meditation';
import Tasks from './pages/Tasks';
import AdminPortal from './pages/AdminPortal';
import Counsellor from './pages/Counsellor';
import CounsellorInbox from './pages/CounsellorInbox';
import Settings from './pages/Settings';
import History from './pages/History';

const placeholderRoutes = ['face-scan'];

type StoredUser = {
  role?: 'student' | 'admin';
  username?: string;
} | null;

function getStoredUser(): StoredUser {
  try {
    return JSON.parse(
      localStorage.getItem('mindease_user') ?? 'null'
    ) as StoredUser;
  } catch {
    return null;
  }
}

// Protect pages that require a stored login.
function RequireAuth() {
  const token = localStorage.getItem('mindease_token');
  const user = getStoredUser();

  if (!token || !user?.role) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

// Protect student and admin pages by role.
function RequireRole({ role }: { role: 'student' | 'admin' }) {
  const token = localStorage.getItem('mindease_token');
  const user = getStoredUser();

  if (!token || !user?.role) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== role) {
    return (
      <Navigate
        to={user.role === 'admin' ? '/admin' : '/dashboard'}
        replace
      />
    );
  }

  return <Outlet />;
}

export default function App() {
  return (
    <Routes>
      {/* Always allow the Login page to open. */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          {/* Admin pages */}
          <Route element={<RequireRole role="admin" />}>
            <Route path="/admin" element={<AdminPortal />} />
            <Route
              path="/admin/counsellor-inbox"
              element={<CounsellorInbox />}
            />
          </Route>

          {/* Student pages */}
          <Route element={<RequireRole role="student" />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/history" element={<History />} />
            <Route path="/profile" element={<Settings />} />
            <Route path="/counsellor" element={<Counsellor />} />
            <Route path="/daily-analysis" element={<DailyAnalysis />} />
            <Route path="/weekly-analysis" element={<WeeklyAnalysis />} />
            <Route path="/ai-chat" element={<AIChat />} />
            <Route path="/journaling" element={<Journaling />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/meditation" element={<Meditation />} />

            {placeholderRoutes.map((path) => (
              <Route
                key={path}
                path={`/${path}`}
                element={<PlaceholderPage />}
              />
            ))}
          </Route>
        </Route>
      </Route>

      {/* Unknown URLs go to Login, not Dashboard. */}
      <Route
        path="*"
        element={<Navigate to="/login" replace />}
      />
    </Routes>
  );
}
