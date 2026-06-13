import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { scheduleService } from '../services';
import { useToast } from '../context/ToastContext';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { CheckCheck, CalendarDays, RotateCcw, Save } from 'lucide-react';

export default function WorkDays() {
  const { t } = useTranslation();
  useDocumentTitle(t('page.work_days.title'));
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    api.get('/users/').then(r => setUsers(r.data.results || r.data || []));
  }, []);

  const fetchDays = () => {
    if (!selectedUser) return;
    setLoading(true);
    scheduleService.list({ user: selectedUser })
      .then((res) => {
        const data = res.data.results || res.data || [];
        setDays(data.map(d => d.day));
      })
      .catch(() => setDays([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchDays(); }, [selectedUser]);

  const toggleDay = (d) => {
    setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  };

  const handleSave = async () => {
    try {
      await scheduleService.saveBatch({ user_id: parseInt(selectedUser), days });
      toast.success(t('toast.workdays_saved'));
    } catch { toast.error(t('toast.save_error')); }
  };

  const selectAll = () => setDays([0, 1, 2, 3, 4, 5, 6]);
  const selectWeekdays = () => setDays([1, 2, 3, 4, 5]);
  const clearAll = () => setDays([]);

  return (
    <div>
      <div className="page-header">
        <h1>{t('page.work_days.title')}</h1>
      </div>
      <div className="card">
        <div className="form-group">
          <label>{t('page.work_days.user')}</label>
          <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
            <option value="">{t('page.work_days.select')}</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.display_name || u.username}</option>)}
          </select>
        </div>
        {selectedUser && (
          <>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <button className="btn btn-sm btn-secondary" onClick={selectAll}><CheckCheck size={14} /> {t('page.work_days.select_all')}</button>
              <button className="btn btn-sm btn-secondary" onClick={selectWeekdays}><CalendarDays size={14} /> {t('page.work_days.select_weekdays')}</button>
              <button className="btn btn-icon btn-sm btn-secondary" onClick={clearAll} title={t('page.work_days.clear')}><RotateCcw size={14} /></button>
            </div>
            <div className="work-day-grid">
              {t('page.work_days.days').map((label, i) => (
                <div key={i} className={`work-day-item ${days.includes(i) ? 'selected' : ''}`} onClick={() => toggleDay(i)}>
                  {label[0]}
                  <div style={{ fontSize: '0.7rem', marginTop: '0.2rem', opacity: 0.7 }}>{label}</div>
                </div>
              ))}
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" onClick={handleSave}><Save size={16} /> {t('page.work_days.save')}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
