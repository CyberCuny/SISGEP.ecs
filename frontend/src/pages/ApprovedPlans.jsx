import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, X, Check, Edit3, Trash2 } from 'lucide-react';
import Modal from '../components/Modal';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { hasAnyRole, ROLES } from '../utils/roles';
import Pagination from '../components/Pagination';
import ConfirmDialog from '../components/ConfirmDialog';
import Breadcrumbs from '../components/Breadcrumbs';

export default function ApprovedPlans() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const canManage = user?.is_staff || hasAnyRole(user, [ROLES.PLANNER, ROLES.DIRECTOR]);
  const [plans, setPlans] = useState([]);
  const [units, setUnits] = useState([]);
  const [activities, setActivities] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ organizational_unit: '', activity: '', start_date: '', end_date: '', observations: '' });
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const pageSize = 50;
  const [confirmDelete, setConfirmDelete] = useState(null);
  const toast = useToast();

  const fetchData = () => {
    api.get(`/schedule/approved-plans/?page=${page}`).then(r => {
      setPlans(r.data.results || r.data || []);
      setCount(r.data.count || 0);
    });
    api.get('/organizational-units/').then(r => setUnits(r.data.results || r.data || []));
    api.get('/activities/').then(r => setActivities(r.data.results || r.data || []));
  };

  useEffect(() => { fetchData(); }, [page]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.activity || !form.start_date || !form.end_date) { return; }
    setSaving(true);
    try {
      if (editingId) {
        await api.patch(`/schedule/approved-plans/${editingId}/`, form);
        toast.success(t('toast.updated'));
      } else {
        await api.post('/schedule/approved-plans/', form);
        toast.success(t('toast.created'));
      }
      setShowForm(false); setEditingId(null);
      setForm({ organizational_unit: '', activity: '', start_date: '', end_date: '', observations: '' });
      fetchData();
    } catch { toast.error(t('toast.save_error')); }
    finally { setSaving(false); }
  };

  const handleEdit = (plan) => {
    setEditingId(plan.id);
    setForm({
      organizational_unit: plan.organizational_unit || '',
      activity: plan.activity || '',
      start_date: plan.start_date || '',
      end_date: plan.end_date || '',
      observations: plan.observations || '',
    });
    setShowForm(true);
  };

  const handleDelete = (id) => {
    setConfirmDelete({ id });
  };

  const confirmDeleteAction = async () => {
    if (!confirmDelete) return;
    try {
      await api.delete(`/schedule/approved-plans/${confirmDelete.id}/`);
      toast.success(t('toast.deleted'));
      fetchData();
    } catch { toast.error(t('toast.delete_error')); }
    finally { setConfirmDelete(null); }
  };

  return (
    <div>
      <Breadcrumbs items={[{ to: '/', label: t('nav.dashboard') }, { label: t('page.approved_plans.title') }]} />
      <div className="page-header">
        <h1>{t('page.approved_plans.title')}</h1>
        {canManage && <button className="btn btn-icon btn-primary" onClick={() => { setEditingId(null); setForm({ organizational_unit: '', activity: '', start_date: '', end_date: '', observations: '' }); setShowForm(true); }} title={t('page.approved_plans.new')}>
          <Plus size={16} />
        </button>}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} width="500px">
        <h2>{editingId ? t('page.approved_plans.edit_title') : t('page.approved_plans.create_title')}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('page.approved_plans.org_unit')}</label>
            <select value={form.organizational_unit} onChange={(e) => setForm({...form, organizational_unit: e.target.value})}>
              <option value="">{t('form.select')}</option>
              {units.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>{t('page.approved_plans.activity')}</label>
            <select value={form.activity} onChange={(e) => setForm({...form, activity: e.target.value})} required>
              <option value="">{t('form.select')}</option>
              {activities.map(a => (
                <option key={a.id} value={a.id}>{a.description || a.id}</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>{t('form.start_date')}</label>
              <input type="date" value={form.start_date} onChange={(e) => setForm({...form, start_date: e.target.value})} required />
            </div>
            <div className="form-group">
              <label>{t('form.end_date')}</label>
              <input type="date" value={form.end_date} onChange={(e) => setForm({...form, end_date: e.target.value})} required />
            </div>
          </div>
          <div className="form-group">
            <label>{t('form.observation')}</label>
            <textarea value={form.observations} onChange={(e) => setForm({...form, observations: e.target.value})} rows={3} />
          </div>
          <div className="form-actions">
            <button className="btn btn-icon btn-secondary" type="button" onClick={() => setShowForm(false)} title={t('common.cancel')}><X size={16} /></button>
            <button className="btn btn-icon btn-primary" type="submit" disabled={saving} title={saving ? t('common.saving') : (editingId ? t('common.update') : t('common.create'))}>
              <Check size={16} />
            </button>
          </div>
        </form>
      </Modal>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>{t('page.approved_plans.table.org_unit')}</th>
                <th>{t('page.approved_plans.table.activity')}</th>
                <th>{t('page.approved_plans.table.start_date')}</th>
                <th>{t('page.approved_plans.table.end_date')}</th>
                <th>{t('page.approved_plans.table.approved_by')}</th>
                <th>{t('page.approved_plans.table.observations')}</th>
                <th>{t('page.approved_plans.table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p.id}>
                  <td>{p.org_unit_name || p.organizational_unit || '-'}</td>
                  <td>{p.activity_name || p.activity || '-'}</td>
                  <td>{p.start_date || '-'}</td>
                  <td>{p.end_date || '-'}</td>
                  <td>{p.approved_by_name || p.approved_by || '-'}</td>
                  <td>{p.observations || '-'}</td>
                  <td>
                    {canManage && <button className="btn btn-icon btn-sm btn-primary" onClick={() => handleEdit(p)} title={t('common.edit')}><Edit3 size={14} /></button>}
                    {canManage && <button className="btn btn-icon btn-sm btn-danger" onClick={() => handleDelete(p.id)} title={t('common.delete')}><Trash2 size={14} /></button>}
                  </td>
                </tr>
              ))}
              {plans.length === 0 && (
                <tr><td colSpan={7} className="empty-state">{t('page.approved_plans.empty')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination count={count} page={page} pageSize={pageSize} onPageChange={setPage} />
      </div>
      <ConfirmDialog
        open={!!confirmDelete}
        title={t('common.confirm')}
        message={t('confirm.delete_approved_plan')}
        onConfirm={confirmDeleteAction}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
