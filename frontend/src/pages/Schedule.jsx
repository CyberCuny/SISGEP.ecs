import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import Pagination from '../components/Pagination';
import Spinner from '../components/Spinner';
import CommentsSection from '../components/CommentsSection';
import HistorySection from '../components/HistorySection';
import ConfirmDialog from '../components/ConfirmDialog';
import Breadcrumbs from '../components/Breadcrumbs';
import { SkeletonTable } from '../components/Skeleton';
import useScrollShadow from '../hooks/useScrollShadow';
import useAutoResize from '../hooks/useAutoResize';
import useKeyboardShortcut from '../hooks/useKeyboardShortcut';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { Plus, X, Check, Edit3, Trash2 } from 'lucide-react';

export default function Schedule() {
  const { t } = useTranslation();
  useDocumentTitle(t('page.schedule.title'));
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const pageSize = 50;
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ activity: '', start_date: '', end_date: '', start_time: '', end_time: '', description: '', observation: '', status: '', is_extraplan: false, has_incidence: false, color: '#1a237e' });
  const [activities, setActivities] = useState([]);
  const [editingStatus, setEditingStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const confirmDlg = useConfirm();
  const descRef = useAutoResize(form.description);
  const obsRef = useAutoResize(form.observation);
  const formSnapshot = useRef(null);
  const isDirty = useCallback(() => {
    if (!formSnapshot.current) return false;
    return Object.keys(formSnapshot.current).some(k => form[k] !== formSnapshot.current[k]);
  }, [form]);
  const closeForm = async (force) => {
    if (!force && isDirty() && !(await confirmDlg(t('form.confirm_unsaved')))) return;
    setShowForm(false);
    setEditing(null);
    setFormErrors({});
    formSnapshot.current = null;
  };
  const { ref: tableRef, scrolledLeft, scrolledRight } = useScrollShadow();
  const toast = useToast();

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/schedule/periods/?page=${page}`),
      api.get('/activities/?page_size=200')
    ]).then(([res, actRes]) => {
      setPeriods(res.data.results || res.data);
      setCount(res.data.count || res.data.length || 0);
      setActivities(actRes.data.results || actRes.data);
    }).catch(() => toast.error(t('toast.load_periods_error')))
    .finally(() => setLoading(false));
  }, [page]);

  useKeyboardShortcut('Escape', () => { if (showForm) closeForm(); });
  useKeyboardShortcut('Escape', () => { if (confirmDelete) setConfirmDelete(null); });
  useKeyboardShortcut('n', () => { if (!showForm) { const defaults = { activity: '', start_date: '', end_date: '', start_time: '', end_time: '', description: '', observation: '', status: '', is_extraplan: false, has_incidence: false, color: '#1a237e' }; setForm(defaults); formSnapshot.current = { ...defaults }; setShowForm(true); }}, { ctrl: true });

  const handleDelete = async (id) => {
    setConfirmDelete({ id });
  };

  const confirmDeleteAction = async () => {
    if (!confirmDelete) return;
    try {
      await api.delete(`/schedule/periods/${confirmDelete.id}/`);
      setPeriods(periods.filter(p => p.id !== confirmDelete.id));
      toast.success(t('toast.schedule_period_deleted'));
    } catch { toast.error(t('toast.delete_error')); }
    finally { setConfirmDelete(null); }
  };

  const openEdit = (p) => {
    setEditing(p.id);
    const vals = {
      activity: p.activity || '',
      start_date: p.start_date || '', end_date: p.end_date || '',
      start_time: p.start_time || '', end_time: p.end_time || '',
      description: p.description || '', observation: p.observation || '',
      status: p.status || '', is_extraplan: p.is_extraplan || false,
      has_incidence: p.has_incidence || false, color: p.color || '#1a237e',
    };
    setForm(vals);
    formSnapshot.current = { ...vals };
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});
    setSaving(true);
    try {
      if (editing) {
        const res = await api.patch(`/schedule/periods/${editing}/`, form);
        setPeriods(periods.map(p => p.id === editing ? { ...p, ...res.data } : p));
        toast.success(t('toast.schedule_period_updated'));
      } else {
        const res = await api.post('/schedule/periods/', form);
        setPeriods([res.data, ...periods]);
        toast.success(t('toast.schedule_period_created'));
      }
      formSnapshot.current = null;
      closeForm(true);
      setForm({ activity: '', start_date: '', end_date: '', start_time: '', end_time: '', description: '', observation: '', status: '', is_extraplan: false, has_incidence: false, color: '#1a237e' });
    } catch (err) {
      if (err.response?.data) {
        setFormErrors(err.response.data);
        const first = Object.values(err.response.data).flat().find(Boolean);
        if (first) toast.error(first);
      } else {
        toast.error(t('toast.save_error'));
      }
    }
    finally { setSaving(false); }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const res = await api.patch(`/schedule/periods/${id}/`, { status: newStatus });
      setPeriods(periods.map(p => p.id === id ? { ...p, ...res.data } : p));
      toast.success(t('toast.schedule_period_updated'));
    } catch { toast.error(t('toast.save_error')); }
    finally { setEditingStatus(null); }
  };

  return (
    <div>
      <Breadcrumbs items={[
        { to: '/', label: t('nav.dashboard') },
        { label: t('page.schedule.title') },
      ]} />
      <div className="page-header">
        <h1>{t('page.schedule.title')}</h1>
        <button className="btn btn-icon btn-primary" onClick={() => { const defaults = { activity: '', start_date: '', end_date: '', start_time: '', end_time: '', description: '', observation: '', status: '', is_extraplan: false, has_incidence: false, color: '#1a237e' }; setForm(defaults); formSnapshot.current = { ...defaults }; setShowForm(true); }} title={t('page.schedule.new')}>
          <Plus size={16} />
        </button>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={closeForm} role="dialog" aria-modal="true" aria-label={editing ? t('page.schedule.edit_title') : t('page.schedule.create_title')}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editing ? t('page.schedule.edit_title') : t('page.schedule.create_title')}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>{t('page.schedule.activity')}</label>
                <select value={form.activity} onChange={(e) => setForm({...form, activity: e.target.value})} required className={formErrors.activity ? 'input-error' : ''}>
                  <option value="">{t('form.select')}</option>
                  {activities.map(a => <option key={a.id} value={a.id}>{a.description}</option>)}
                </select>
                {formErrors.activity && <span className="field-error">{formErrors.activity}</span>}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>{t('page.schedule.start_date')}</label>
                  <input type="date" value={form.start_date} onChange={(e) => setForm({...form, start_date: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>{t('page.schedule.end_date')}</label>
                  <input type="date" value={form.end_date} onChange={(e) => setForm({...form, end_date: e.target.value})} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>{t('page.schedule.start_time')}</label>
                  <input type="time" value={form.start_time} onChange={(e) => setForm({...form, start_time: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>{t('page.schedule.end_time')}</label>
                  <input type="time" value={form.end_time} onChange={(e) => setForm({...form, end_time: e.target.value})} required />
                </div>
              </div>
              <div className="form-group">
                <label>{t('page.schedule.description')}</label>
                <textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} placeholder={t('page.schedule.description')} ref={descRef} maxLength={500} />
                <span className="char-count">{form.description.length}/500</span>
              </div>
              <div className="form-group">
                <label>{t('page.schedule.observation')}</label>
                <textarea value={form.observation} onChange={(e) => setForm({...form, observation: e.target.value})} placeholder={t('page.schedule.observation')} ref={obsRef} maxLength={500} />
                <span className="char-count">{form.observation.length}/500</span>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>{t('page.schedule.status')}</label>
                  <select value={form.status} onChange={(e) => setForm({...form, status: e.target.value})}>
                    <option value="">--</option>
                    <option value="PENDIENTE">{t('badge.pending')}</option>
                    <option value="CUMPLIDO">{t('badge.cumplido')}</option>
                    <option value="INCUMPLIDO">{t('badge.incumplido')}</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>{t('page.schedule.color')}</label>
                  <input type="color" value={form.color} onChange={(e) => setForm({...form, color: e.target.value})} />
                </div>
              </div>
              <div className="form-row" style={{ marginBottom: '1rem' }}>
                <label className="form-check">
                  <input type="checkbox" checked={form.is_extraplan} onChange={(e) => setForm({...form, is_extraplan: e.target.checked})} />
                  <span>{t('page.schedule.extraplan')}</span>
                </label>
                <label className="form-check">
                  <input type="checkbox" checked={form.has_incidence} onChange={(e) => setForm({...form, has_incidence: e.target.checked})} />
                  <span>{t('page.schedule.incidence')}</span>
                </label>
              </div>
              <div className="form-actions">
                  <button className="btn btn-icon btn-secondary" type="button" onClick={closeForm} title={t('page.schedule.cancel')}><X size={16} /></button>
                <button className="btn btn-icon btn-primary" type="submit" disabled={saving} title={saving ? (editing ? t('page.schedule.updating') : t('page.schedule.creating')) : (editing ? t('page.schedule.update') : t('page.schedule.create'))}><Check size={16} /></button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editing && (
        <CommentsSection endpoint="schedule/comments" filterKey="schedule_period" filterValue={editing} />
      )}
      {editing && (
        <HistorySection modelo="PeriodoCronograma" objectId={editing} />
      )}

      <div className="card">
        {loading ? <SkeletonTable rows={8} cols={8} /> : periods.length === 0 ? (
          <div className="empty-state">{t('page.schedule.empty')}</div>
        ) : (
          <div ref={tableRef} className={`table-container table-scroll-shadow ${scrolledLeft ? 'scroll-left' : ''} ${scrolledRight ? 'scroll-right' : ''}`}>
            <table className="striped">
              <thead>
                <tr>
                  <th>{t('page.schedule.table.activity')}</th><th>{t('page.schedule.table.start')}</th><th>{t('page.schedule.table.end')}</th><th>{t('page.schedule.table.time')}</th>
                  <th>{t('page.schedule.table.status')}</th><th>{t('page.schedule.table.extraplan')}</th><th>{t('page.schedule.table.incidence')}</th><th>{t('page.schedule.table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {periods.map((p) => (
                  <tr key={p.id}>
                    <td>{p.activity_description || '-'}</td>
                    <td>{p.start_date}</td><td>{p.end_date}</td>
                    <td>{p.start_time} - {p.end_time}</td>
                    <td>
                      {editingStatus === p.id ? (
                        <select className="inline-edit-select" value={p.status || 'PENDIENTE'} autoFocus
                          onChange={(e) => handleStatusChange(p.id, e.target.value)}
                          onBlur={() => setEditingStatus(null)}>
                          <option value="PENDIENTE">{t('badge.pending')}</option>
                          <option value="CUMPLIDO">{t('badge.cumplido')}</option>
                          <option value="INCUMPLIDO">{t('badge.incumplido')}</option>
                        </select>
                      ) : (
                        <span className={`badge ${p.status === 'CUMPLIDO' ? 'badge-success' : p.status === 'INCUMPLIDO' ? 'badge-danger' : 'badge-neutral'} inline-edit-trigger`}
                          onClick={() => setEditingStatus(p.id)}>
                          {p.status || 'PENDIENTE'}
                        </span>
                      )}
                    </td>
                    <td>{p.is_extraplan ? <span className="badge badge-warning">{t('badge.yes')}</span> : t('badge.no')}</td>
                    <td>{p.has_incidence ? <span className="badge badge-danger">{t('badge.yes')}</span> : t('badge.no')}</td>
                    <td>
                      <button className="btn btn-icon btn-sm btn-primary" onClick={() => openEdit(p)} title={t('common.edit')}><Edit3 size={14} /></button>
                      <button className="btn btn-icon btn-sm btn-danger" onClick={() => handleDelete(p.id)} title={t('common.delete')}><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination count={count} page={page} pageSize={pageSize} onPageChange={setPage} />
      </div>
      <ConfirmDialog
        open={!!confirmDelete}
        title={t('common.confirm')}
        message={t('confirm.delete_schedule_period')}
        onConfirm={confirmDeleteAction}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
