import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Check, CheckCircle2, Clipboard, ImagePlus, LoaderCircle, Moon, ShieldCheck, Sun, UserRound, X } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { useTheme } from '../theme/ThemeProvider';

type UserInfo = { userId: number | string; username: string; role: 'student' | 'admin'; consentShare?: boolean; consent_share?: boolean };
type MeResponse = { user: UserInfo };
const USER_KEY = 'mindease_user';
const PHOTO_PREFIX = 'mindease_profile_picture_';
function storedUser(): Partial<UserInfo> { try { return JSON.parse(localStorage.getItem(USER_KEY) ?? '{}') as Partial<UserInfo>; } catch { return {}; } }

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const cached = storedUser();
  const token = localStorage.getItem('mindease_token');
  const [user, setUser] = useState<Partial<UserInfo>>(cached);
  const [consent, setConsent] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [photo, setPhoto] = useState(() => { try { return cached.userId != null ? localStorage.getItem(`${PHOTO_PREFIX}${cached.userId}`) ?? '' : ''; } catch { return ''; } });
  const [photoMessage, setPhotoMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!token) { if (active) { setNotice({ type: 'error', text: 'Your session is missing. Please log in again.' }); setLoaded(true); } return; }
      try {
        const data = await apiRequest<MeResponse>('/api/auth/me', 'GET', { token });
        if (!active) return;
        setUser(data.user);
        setConsent(Boolean(data.user.consentShare ?? data.user.consent_share));
        try { localStorage.setItem(USER_KEY, JSON.stringify({ userId: data.user.userId, username: data.user.username, role: data.user.role })); } catch { /* optional cache */ }
      } catch (e) { if (active) setNotice({ type: 'error', text: e instanceof Error ? e.message : 'Could not load your settings.' }); }
      finally { if (active) setLoaded(true); }
    }
    void load(); return () => { active = false; };
  }, [token]);

  async function changeConsent(next: boolean) {
    if (!token || saving || !loaded) return;
    const previous = consent; setConsent(next); setSaving(true); setNotice(null);
    try {
      const data = await apiRequest<{ consent_share: boolean }>('/api/auth/consent', 'PATCH', { token, body: { consent_share: next } });
      setConsent(Boolean(data.consent_share));
      setNotice({ type: 'success', text: data.consent_share ? 'Permission saved. Your Student ID and stress score may appear in admin Stress Alerts when your saved score is above 50%.' : 'Permission turned off. Your individual stress alerts will no longer be shared.' });
    } catch (e) { setConsent(previous); setNotice({ type: 'error', text: e instanceof Error ? e.message : 'Could not save your permission. Please try again.' }); }
    finally { setSaving(false); }
  }

  function changePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { setPhotoMessage('Choose an image file.'); return; }
    if (file.size > 1.5 * 1024 * 1024) { setPhotoMessage('Choose an image smaller than 1.5 MB.'); return; }
    if (user.userId == null) { setPhotoMessage('Student ID is not loaded yet. Refresh and try again.'); return; }
    const reader = new FileReader();
    reader.onload = () => { const value = typeof reader.result === 'string' ? reader.result : ''; try { localStorage.setItem(`${PHOTO_PREFIX}${user.userId}`, value); setPhoto(value); window.dispatchEvent(new Event('mindeaseProfileUpdated')); setPhotoMessage('Picture saved in this browser.'); } catch { setPhotoMessage('Could not save the picture in browser storage. Try a smaller image.'); } };
    reader.onerror = () => setPhotoMessage('Could not read this image. Try another.'); reader.readAsDataURL(file);
  }
  function removePhoto() { if (user.userId == null) return; try { localStorage.removeItem(`${PHOTO_PREFIX}${user.userId}`); } catch { /* ignore */ } setPhoto(''); window.dispatchEvent(new Event('mindeaseProfileUpdated')); setPhotoMessage('Picture removed from this browser.'); }
  async function copyId() { if (user.userId == null) return; try { await navigator.clipboard.writeText(`Student ${user.userId}`); setCopied(true); window.setTimeout(() => setCopied(false), 1600); } catch { setNotice({ type: 'error', text: 'Automatic copy is unavailable. Select the Student ID text and copy it.' }); } }

  return <section className="page-section settings-page">
    <div className="welcome-row settings-welcome"><div><div className="eyebrow"><span className="eyebrow-dot" /> YOUR ACCOUNT</div><h1>Settings &amp; Privacy</h1><p>Manage your profile, appearance, and what wellness information you choose to share.</p></div><div className="welcome-art" aria-hidden="true"><span className="art-sun"/><span className="art-face">☺</span><span className="art-leaf leaf-one"/><span className="art-leaf leaf-two"/></div></div>
    {notice && <div className={`settings-notice ${notice.type}`} role="status"><span>{notice.type === 'success' ? <CheckCircle2 size={17}/> : <ShieldCheck size={17}/>}</span><p>{notice.text}</p><button aria-label="Dismiss message" onClick={() => setNotice(null)}><X size={16}/></button></div>}
    <div className="settings-grid">
      <article className="card settings-card"><div className="settings-card-heading"><span className="icon-tile mint"><UserRound size={19}/></span><div><h2>Student profile</h2><p className="muted">Your account identity</p></div></div>
        <div className="settings-avatar-row"><div className="settings-avatar">{photo ? <img src={photo} alt="Your profile"/> : <UserRound size={34}/>}</div><div className="settings-avatar-actions"><strong>{user.username ?? 'Student'}</strong><span className="muted">Profile picture</span><div className="settings-button-row"><button className="settings-secondary-button" onClick={() => fileInput.current?.click()}><ImagePlus size={15}/> Update photo</button>{photo && <button className="settings-text-button" onClick={removePhoto}>Remove</button>}</div><input ref={fileInput} className="visually-hidden-input" type="file" accept="image/*" onChange={changePhoto}/></div></div>
        {photoMessage && <p className={`settings-inline-message ${photoMessage.includes('saved') || photoMessage.includes('removed') ? 'success-text' : 'error-text'}`}>{photoMessage}</p>}
        <div className="settings-field"><label htmlFor="student-id">Student ID</label><div className="settings-id-control"><input id="student-id" readOnly value={user.userId != null ? `Student ${user.userId}` : 'Loading…'}/><button className="settings-secondary-button" onClick={() => void copyId()} disabled={user.userId == null}>{copied ? <Check size={15}/> : <Clipboard size={15}/>} {copied ? 'Copied' : 'Copy ID'}</button></div><p className="muted">This ID identifies your account. Your journal text and private AI conversations are not shown in admin Stress Alerts.</p></div>
      </article>
      <article className="card settings-card"><div className="settings-card-heading"><span className="icon-tile purple"><Sun size={19}/></span><div><h2>Appearance</h2><p className="muted">Choose the look that feels comfortable</p></div></div>
        <div className="theme-choice-grid"><button className={`theme-choice light-choice ${theme === 'light' ? 'selected' : ''}`} onClick={() => setTheme('light')} aria-pressed={theme === 'light'}><span className="theme-preview light-preview"><span/><span/><span/></span><span className="theme-choice-copy"><strong><Sun size={15}/> Colourful light</strong><small>Warm cream and mint</small></span>{theme === 'light' && <CheckCircle2 className="theme-check" size={18}/>}</button><button className={`theme-choice dark-choice ${theme === 'dark' ? 'selected' : ''}`} onClick={() => setTheme('dark')} aria-pressed={theme === 'dark'}><span className="theme-preview dark-preview"><span/><span/><span/></span><span className="theme-choice-copy"><strong><Moon size={15}/> Emerald dark</strong><small>Forest green and emerald</small></span>{theme === 'dark' && <CheckCircle2 className="theme-check" size={18}/>}</button></div><p className="muted">Your theme is saved in this browser and applied throughout MindEase.</p>
      </article>
      <article className="card settings-card settings-privacy-card"><div className="settings-card-heading"><span className="icon-tile coral"><ShieldCheck size={19}/></span><div><h2>Privacy &amp; sharing permission</h2><p className="muted">You are in control of your individual stress information</p></div></div>
        <div className="consent-setting-row"><div className="consent-copy"><strong>Share stress score with admin</strong><p>The admin may see your Student ID, stress percentage, date, and alert status when your saved stress score is above 50%. This permission does not share journal text, photos, or private AI conversations.</p></div><button className={`consent-switch ${consent ? 'on' : ''}`} role="switch" aria-checked={consent} aria-label="Share stress score with admin" disabled={!loaded || saving || !token} onClick={() => void changeConsent(!consent)}><span/></button></div>
        <div className="consent-status-row"><span className={`consent-status-dot ${consent ? 'on' : ''}`}/>{!loaded ? 'Loading saved permission…' : saving ? 'Saving your choice…' : consent ? 'Permission is ON' : 'Permission is OFF'}{saving && <LoaderCircle className="spin" size={14}/>}</div>
        <div className="settings-privacy-note"><ShieldCheck size={16}/><p>You can turn this off at any time. Turning it off prevents individual stress alerts from being shared. It does not automatically erase previously saved analysis records.</p></div>
      </article>
    </div>
  </section>;
}
