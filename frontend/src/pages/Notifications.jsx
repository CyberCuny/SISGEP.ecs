import { useState, useEffect } from 'react';
import { notificationService } from '../services';
import Pagination from '../components/Pagination';
import Spinner from '../components/Spinner';
import { useTranslation } from 'react-i18next';
import { CheckCheck } from 'lucide-react';
import { getNotificationMessage } from '../utils/notifications';

const typeColors = {
  approval: 'badge badge-success',
  rejection: 'badge badge-danger',
  message: 'badge badge-primary',
  system: 'badge badge-neutral',
};

export default function Notifications() {
  const { t } = useTranslation();
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const pageSize = 30;

  const fetchData = () => {
    setLoading(true);
    notificationService.list({ page }).then(r => {
      setNotifs(r.data.results || r.data || []);
      setCount(r.data.count || 0);
    }).catch(() => console.warn('Failed to fetch notifications')).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [page]);

  const handleMarkRead = async (id) => {
    try {
      await notificationService.markRead(id);
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllRead();
      setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch {}
  };

  return (
    <div>
      <div className="page-header">
        <h1>{t('page.notifications.title')}</h1>
        <button className="btn btn-icon btn-secondary" onClick={handleMarkAllRead} title={t('action.mark_all_read')}>
          <CheckCheck size={16} />
        </button>
      </div>
      <div className="card">
        {loading ? <Spinner /> : notifs.length === 0 ? (
          <div className="empty-state">{t('page.notifications.empty')}</div>
        ) : (
          <div className="notification-list">
            {notifs.map(n => (
              <div key={n.id} className={`notification-item ${!n.is_read ? 'unread' : ''}`}
                onClick={() => !n.is_read && handleMarkRead(n.id)}>
                <div className="notification-dot" />
                <div className="notification-body">
                  <div className="notification-header">
                    <span className={typeColors[n.notification_type] || 'badge badge-neutral'}>
                      {n.notification_type}
                    </span>
                    <small>{new Date(n.created_at).toLocaleString()}</small>
                  </div>
                  <p>{getNotificationMessage(n, t)}</p>
                </div>
                {!n.is_read && <div className="notification-dot" />}
              </div>
            ))}
          </div>
        )}
        <Pagination count={count} page={page} pageSize={pageSize} onPageChange={setPage} />
      </div>
    </div>
  );
}
