import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import Dashboard from './pages/Dashboard';
import WeeklyAnalysis from './pages/WeeklyAnalysis';
import PlaceholderPage from './pages/PlaceholderPage';

const placeholderRoutes = [
  'profile', 'settings', 'daily-analysis', 'tasks', 'journaling',
  'meditation', 'counsellor', 'ai-chat', 'face-scan', 'history',
];

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/weekly-analysis" element={<WeeklyAnalysis />} />
        {placeholderRoutes.map(path => <Route key={path} path={`/${path}`} element={<PlaceholderPage />} />)}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
