import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Activity, BarChart3, BookOpen, Camera, CheckSquare, Heart, History, Leaf, LogOut, Menu, MessageCircle, Moon, Settings, Sun, UserRound, Wind, X } from 'lucide-react';
import { useState } from 'react';
import { useTheme } from '../theme/ThemeProvider';

const navItems = [
  { to: '/', label: 'Dashboard', icon: Activity, end: true },
  { to: '/journaling', label: 'Journaling', icon: BookOpen },
  { to: '/daily-analysis', label: 'Daily Mood Analysis', icon: Heart },
  { to: '/weekly-analysis', label: 'Weekly Analysis', icon: BarChart3 },
  { to: '/tasks', label: 'Daily Tasks', icon: CheckSquare },
  { to: '/meditation', label: 'Meditation & Breathing', icon: Wind },
  { to: '/counsellor', label: 'Talk to a Counsellor', icon: Heart },
  { to: '/ai-chat', label: 'Personal AI Agent', icon: MessageCircle },
  { to: '/face-scan', label: 'Face Scan (Fun)', icon: Camera },
  { to: '/history', label: 'History', icon: History },
];

export default function AppLayout() {
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const pageName = navItems.find(item => item.to === location.pathname)?.label ?? 'Dashboard';

  return (
    <div className={`app-shell theme-${theme}`}>
      {menuOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <span className="brand-mark"><Leaf size={23} /></span>
          <span>MindEase <b>V2</b><small>Your wellness space</small></span>
          <button className="sidebar-close" aria-label="Close navigation" onClick={() => setMenuOpen(false)}><X size={18} /></button>
        </div>
        <nav>
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setMenuOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Icon size={17} /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <NavLink className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} to="/settings" onClick={() => setMenuOpen(false)}><Settings size={17} /><span>Settings & Privacy</span></NavLink>
          <button className="nav-item logout" onClick={() => alert('Authentication will be connected in the authentication phase.')}><LogOut size={17} /><span>Log out</span></button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMenuOpen(true)} aria-label="Open navigation"><Menu size={19} /></button>
          <div className="breadcrumb">Your space <span>/</span> {pageName}</div>
          <div className="top-actions">
            <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
              <span>{theme === 'light' ? 'Emerald dark' : 'Colourful light'}</span>
            </button>
            <NavLink className="top-icon-link" to="/profile" aria-label="Profile" title="Profile"><UserRound size={18} /><span>Profile</span></NavLink>
            <NavLink className="top-icon-link" to="/settings" aria-label="Settings" title="Settings"><Settings size={18} /><span>Settings</span></NavLink>
          </div>
        </header>
        <Outlet />
        <footer className="page-footer"><Heart size={14} /> Your wellbeing, your pace. Mood estimates are not medical diagnoses.</footer>
      </main>
    </div>
  );
}
