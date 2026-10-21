import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Activity, BarChart3, BookOpen, Camera, CheckSquare, Heart, History, Leaf, LogOut, Menu, MessageCircle, Moon, Settings, Sun, UserRound, Wind, X } from 'lucide-react';
import { useEffect, useState } from 'react';
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
  const storedUser = (() => { try { return JSON.parse(localStorage.getItem('mindease_user') ?? 'null') as { role?: string; user_id?: number | string; userId?: number | string; id?: number | string } | null; } catch { return null; } })();
  const studentId = storedUser?.user_id ?? storedUser?.userId ?? storedUser?.id;
  const [profileImage, setProfileImage] = useState<string | null>(null);

  useEffect(() => {
    const readProfileImage = () => {
      let currentUser: { user_id?: number | string; userId?: number | string; id?: number | string } | null = null;
      try { currentUser = JSON.parse(localStorage.getItem('mindease_user') ?? 'null'); } catch { currentUser = null; }
      const id = currentUser?.user_id ?? currentUser?.userId ?? currentUser?.id;
      const keys = id == null
        ? ['mindease_profile_picture', 'mindease_profile_image']
        : [`mindEaseProfileImage_${id}`, `mindease_profile_image_${id}`, `mindease_profile_picture_${id}`, 'mindease_profile_picture', 'mindease_profile_image'];
      let image: string | null = null;
      for (const key of keys) {
        const value = localStorage.getItem(key);
        if (value && (value.startsWith('data:image/') || value.startsWith('https://') || value.startsWith('http://'))) { image = value; break; }
      }
      setProfileImage(image);
    };
    readProfileImage();
    window.addEventListener('storage', readProfileImage);
    window.addEventListener('mindEaseProfileUpdated', readProfileImage);
    // Also refresh after a Settings page update in the same tab, even if it doesn't dispatch an event.
    const refresh = window.setInterval(readProfileImage, 1000);
    return () => {
      window.removeEventListener('storage', readProfileImage);
      window.removeEventListener('mindEaseProfileUpdated', readProfileImage);
      window.clearInterval(refresh);
    };
  }, [studentId]);

  const pageName = location.pathname === '/admin/counsellor-inbox' ? 'Counsellor Inbox' : (navItems.find(item => item.to === location.pathname)?.label ?? 'Dashboard');

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
          {storedUser?.role === 'admin' && <NavLink to="/admin/counsellor-inbox" onClick={() => setMenuOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><Heart size={17} /><span>Counsellor Inbox</span></NavLink>}
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
            <NavLink className="top-icon-link" to="/profile" aria-label="Profile" title="Profile">{profileImage ? <img src={profileImage} alt="Profile" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} /> : <UserRound size={18} />}<span>Profile</span></NavLink>
            <NavLink className="top-icon-link" to="/settings" aria-label="Settings" title="Settings"><Settings size={18} /><span>Settings</span></NavLink>
          </div>
        </header>
        <Outlet />
        <footer className="page-footer"><Heart size={14} /> Your wellbeing, your pace. Mood estimates are not medical diagnoses.</footer>
      </main>
    </div>
  );
}
