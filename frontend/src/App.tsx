
import { Navigate, Route, Routes } from 'react-router-dom';

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

const placeholderRoutes = [
  'profile',
  'settings',
  'tasks',
  'counsellor',
  'face-scan',
  'history',
];

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />

        <Route
          path="/daily-analysis"
          element={<DailyAnalysis />}
        />

        <Route
          path="/weekly-analysis"
          element={<WeeklyAnalysis />}
        />

        <Route path="/ai-chat" element={<AIChat />} />
        <Route path="/journaling" element={<Journaling />} />

        <Route
          path="/meditation"
          element={<Meditation />}
        />

        {placeholderRoutes.map((path) => (
          <Route
            key={path}
            path={`/${path}`}
            element={<PlaceholderPage />}
          />
        ))}

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Route>
    </Routes>
  );
}
