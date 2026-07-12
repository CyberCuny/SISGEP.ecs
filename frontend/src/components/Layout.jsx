import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import api from '../services/api';
import { useTranslation } from 'react-i18next';
import { Users } from 'lucide-react';
import { hasAnyRole, ROLES } from '../utils/roles';

const icons = {
  dashboard: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  activities: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
  schedule: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  calendar: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7',
  individual: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  annual: 'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z',
  compliance: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  approvals: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  units: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  users: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  catalog: 'M4 6h16M4 10h16M4 14h16M4 18h16',
  reports: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  import: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12',
  workdays: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  audit: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  messages: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z',
  notifications: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  profile: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
};

function NavIcon({ name }) {
  if (name === 'users') {
    return (
      <span className="nav-icon">
        <Users size={20} />
      </span>
    );
  }
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={icons[name] || icons.dashboard} />
    </svg>
  );
}

const getEnv = () => {
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) return 'desarrollo';
  const env = import.meta.env.VITE_APP_ENV || '';
  if (env) return env;
  if (typeof window !== 'undefined' && window.location.hostname.includes('staging')) return 'staging';
  return 'producción';
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const { t } = useTranslation();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const [showBackTop, setShowBackTop] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchTimerRef = useRef(null);
  useEffect(() => {
    const onScroll = () => setShowBackTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [location.pathname]);

  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest('.header-user-menu, .sidebar-footer')) {
        setUserMenuOpen(false);
        setNotifOpen(false);
      }
      if (!e.target.closest('.header-search')) setSearchOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); setSearchOpen(false); return; }
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      api.get('/search/', { params: { q: searchQuery } })
        .then(r => setSearchResults(r.data.results || []))
        .catch(() => console.warn('Search failed'));
      setSearchOpen(true);
    }, 350);
    return () => clearTimeout(searchTimerRef.current);
  }, [searchQuery]);

  const toggleTheme = useCallback(() => setDarkMode(prev => !prev), []);

  const navGroups = useMemo(() => {
    const canAdmin = user?.is_staff || hasAnyRole(user, [ROLES.DIRECTOR]);
    const canManage = canAdmin || hasAnyRole(user, [ROLES.APPROVER, ROLES.PLANNER]);
    const groups = [
      { label: t('nav.group.principal'), items: [{ path: '/', label: t('nav.dashboard'), icon: 'dashboard' }] },
      { label: t('nav.group.gestion'), items: [{ path: '/activities', label: t('nav.activities'), icon: 'activities' }, { path: '/schedule', label: t('nav.schedule'), icon: 'schedule' }, { path: '/guidelines', label: t('nav.guidelines'), icon: 'catalog' }] },
      { label: t('nav.group.calendarios'), items: [{ path: '/calendar', label: t('nav.calendar'), icon: 'calendar' }, { path: '/calendar-individual', label: t('nav.calendar_individual'), icon: 'individual' }, { path: '/calendar-annual', label: t('nav.calendar_annual'), icon: 'annual' }] },
      { label: t('nav.group.monitoreo'), items: [{ path: '/compliance', label: t('nav.compliance'), icon: 'compliance' }, { path: '/approvals', label: t('nav.approvals'), icon: 'approvals' }, { path: '/approved-plans', label: t('nav.approved_plans'), icon: 'approvals' }] },
      { label: t('nav.group.comunicacion'), items: [{ path: '/messages', label: t('nav.messages'), icon: 'messages' }, { path: '/notifications', label: t('nav.notifications'), icon: 'notifications' }] },
      ...(canAdmin ? [{ label: t('nav.group.administracion'), items: [{ path: '/units', label: t('nav.units'), icon: 'units' }, { path: '/users', label: t('nav.users'), icon: 'users' }, { path: '/roles', label: t('nav.roles'), icon: 'users' }, { path: '/catalog', label: t('nav.catalog'), icon: 'catalog' }, { path: '/email-config', label: t('nav.email_config'), icon: 'messages' }, { path: '/system-config', label: t('nav.system_config'), icon: 'catalog' }] }] : []),
      ...(canManage ? [{ label: t('nav.group.datos'), items: [{ path: '/reports', label: t('nav.reports'), icon: 'reports' }, { path: '/import', label: t('nav.import'), icon: 'import' }, { path: '/work-days', label: t('nav.work_days'), icon: 'workdays' }, { path: '/audit-log', label: t('nav.audit_log'), icon: 'audit' }, ...(canAdmin ? [{ path: '/backups', label: t('nav.backups'), icon: 'schedule' }] : [])] }] : []),
    ];
    return groups;
  }, [t, user]);

  const fetchNotif = useCallback(() => {
    api.get('/notifications/unread_count/').then(r => setNotifCount(r.data.count || 0)).catch(() => console.warn('Failed to fetch notification count'));
    api.get('/notifications/?page_size=5').then(r => setNotifications(r.data.results || r.data || [])).catch(() => console.warn('Failed to fetch notifications'));
  }, []);

  useEffect(() => { fetchNotif(); }, [fetchNotif]);

  useWebSocket(user, useCallback(() => fetchNotif(), [fetchNotif]));

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getCurrentPageName = () => {
    for (const group of navGroups) {
      for (const item of group.items) {
        if (item.path === '/') { if (location.pathname === '/') return item.label; }
        else if (location.pathname.startsWith(item.path)) return item.label;
      }
    }
    return '';
  };

  const initials = (user?.display_name || user?.username || 'U').charAt(0).toUpperCase();

  return (
    <div className="app-layout">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="brand-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div className="brand-text">{t('nav.brand')}</div>
          <span className={`env-badge env-${getEnv()}`}>{getEnv()}</span>
        </div>
        <nav className="sidebar-nav">
          {navGroups.map((group) => (
            <div key={group.label}>
              <div className="nav-label">{group.label}</div>
              {group.items.map((item) => (
                <NavLink key={item.path} to={item.path} end={item.path === '/'}
                  className={({ isActive }) => isActive ? 'active' : ''}
                  onClick={() => setSidebarOpen(false)}>
                  <NavIcon name={item.icon} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-info" onClick={() => setUserMenuOpen(!userMenuOpen)} style={{ cursor: 'pointer', position: 'relative' }}>
            <div className="avatar">{initials}</div>
            <div className="user-detail">
              <div className="user-name">{user?.display_name || user?.username}</div>
              <div className="user-role">{user?.position || t('common.username')}</div>
            </div>
          </div>
        </div>
      </aside>

      <div className="main-content">
        <header className="header">
          <div className="header-left">
            <button className="btn btn-ghost btn-sm sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{ padding: '0.3rem', marginRight: '0.25rem' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d={sidebarOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
              </svg>
            </button>
            <div className="page-title">{getCurrentPageName()}</div>
          </div>
          <div className="header-right">
            <button className="theme-toggle-btn" onClick={toggleTheme} title={darkMode ? 'Modo claro' : 'Modo oscuro'} aria-label={darkMode ? 'Modo claro' : 'Modo oscuro'}>
              {darkMode ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
              )}
            </button>
            <div className="header-search">
              <svg className="header-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              <input type="text" className="header-search-input" placeholder={t('common.search') + '...'}
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => { if (searchQuery.trim()) setSearchOpen(true); }} />
              {searchOpen && (
                <div className="search-dropdown">
                  {searchResults.length === 0 ? (
                    <div className="search-dropdown-empty">{t('common.no_results')}</div>
                  ) : (
                    searchResults.map(r => (
                      <button key={`${r.type}-${r.id}`} className="search-dropdown-item" onClick={() => { navigate(r.type === 'activity' ? `/activities/${r.id}/edit` : `/calendar?id=${r.id}`); setSearchOpen(false); setSearchQuery(''); }}>
                        <div className="search-dropdown-title"><span className={`badge ${r.type === 'activity' ? 'badge-primary' : 'badge-neutral'} badge-sm`} style={{ marginRight: 4 }}>{r.type === 'activity' ? 'Act' : 'Cron'}</span>{r.title || '#' + r.id}</div>
                        <div className="search-dropdown-meta">{r.start_date && `${r.start_date} — ${r.end_date}`}{r.status && <span className={`badge badge-dot ${r.status === 'CUMPLIDO' ? 'badge-success' : r.status === 'INCUMPLIDO' ? 'badge-danger' : 'badge-neutral'}`}>{r.status}</span>}</div>
                      </button>
                    ))
                  )}
                  <button className="search-dropdown-footer" onClick={() => { navigate(`/schedule?search=${encodeURIComponent(searchQuery)}`); setSearchOpen(false); }}>
                    {t('common.view_all')} &rarr;
                  </button>
                </div>
              )}
            </div>
            <div className="header-user-menu" style={{ position: 'relative' }}>
              <button className="header-btn" title={t('nav.notifications_title')} aria-label={t('nav.notifications_title')} onClick={() => { setNotifOpen(!notifOpen); if (!notifOpen) { api.post('/notifications/mark_all_read/').catch(() => console.warn('Mark all read failed')); fetchNotif(); } }} style={{ border: 'none', cursor: 'pointer' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={icons.notifications} />
                </svg>
                {notifCount > 0 && <span className="notification-badge">{notifCount > 99 ? '99+' : notifCount}</span>}
              </button>
              {notifOpen && (
                <div className="dropdown-menu" style={{ width: '320px' }}>
                  <div style={{ padding: '0.5rem 0.75rem', fontWeight: 600, fontSize: 'var(--font-sm)', borderBottom: '1px solid var(--border)', marginBottom: '0.25rem' }}>
                    {t('nav.notifications')}
                  </div>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--font-sm)' }}>
                      {t('page.notifications.empty')}
                    </div>
                  ) : (
                    notifications.slice(0, 5).map((n) => (
                      <button key={n.id} onClick={() => { if (!n.is_read) { api.post(`/notifications/${n.id}/mark_read/`).catch(() => console.warn('Mark read failed')); fetchNotif(); } navigate('/notifications'); setNotifOpen(false); }}
                        style={{ textAlign: 'left', padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border-light)', fontSize: 'var(--font-sm)' }}>
                        <div style={{ fontWeight: n.is_read ? 400 : 600, color: 'var(--text)', marginBottom: '0.15rem' }}>{n.title || n.message}</div>
                        <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>{n.created_at ? new Date(n.created_at).toLocaleString() : ''}</div>
                      </button>
                    ))
                  )}
                  <div style={{ borderTop: '1px solid var(--border)', padding: '0.25rem 0' }}>
                    <button onClick={() => { navigate('/notifications'); setNotifOpen(false); }}
                      style={{ textAlign: 'center', fontWeight: 500, color: 'var(--accent)', fontSize: 'var(--font-sm)' }}>
                      {t('page.notifications.view_all')}
                    </button>
                  </div>
                </div>
              )}
            </div>
            <NavLink to="/messages" className="header-btn" title={t('nav.messages_title')} aria-label={t('nav.messages_title')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={icons.messages} />
              </svg>
            </NavLink>
            <div className="header-user-menu" style={{ position: 'relative' }}>
              <span className="header-user" onClick={() => setUserMenuOpen(!userMenuOpen)}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <div className="avatar avatar-sm">{initials}</div>
                {user?.display_name || user?.username}
              </span>
              {userMenuOpen && (
                <div className="dropdown-menu">
                  <button onClick={() => { navigate('/profile'); setUserMenuOpen(false); }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                    {t('nav.profile')}
                  </button>
                  <button onClick={() => { navigate('/profile?tab=password'); setUserMenuOpen(false); }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                    {t('nav.change_password')}
                  </button>
                  <div className="dropdown-divider" />
                  <button onClick={handleLogout}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4m7-1l5 5-5 5M16 3v10"/></svg>
                    {t('nav.logout')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <div className="page-content"><div className="page-enter"><Outlet /></div></div>
      </div>
      {sidebarOpen && (
        <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(2px)', zIndex: 99 }}
          onClick={() => setSidebarOpen(false)} />
      )}
      <button className={`btn-back-top ${showBackTop ? 'visible' : ''}`} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} title={t('common.back_to_top')}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 15l-6-6-6 6"/></svg>
      </button>
    </div>
  );
}
