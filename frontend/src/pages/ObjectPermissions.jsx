import { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useTranslation } from 'react-i18next';
import ConfirmDialog from '../components/ConfirmDialog';
import { Plus, Trash2, Check, X } from 'lucide-react';

export default function ObjectPermissions() {
  const toast = useToast();
  const { t } = useTranslation();
  const [perms, setPerms] = useState([]);
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ user: '', permission_type: 'view', object_type: 'Activity', object_id: '' });
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    load();
    api.get('/users/').then(r => setUsers(r.data.results || r.data));
  }, []);

  const load = async () => {
    try {
      const res = await api.get('/object-permissions/');
      setPerms(res.data.results || res.data);
    } catch { toast.error(t('toast.load_permissions_error')); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/object-permissions/', form);
      toast.success(t('toast.permission_created'));
      setShowModal(false);
      setForm({ user: '', permission_type: 'view', object_type: 'Activity', object_id: '' });
      load();
    } catch { toast.error(t('toast.permission_create_error')); }
  };

  const handleDelete = async (id) => {
    setConfirmDelete({ id });
  };

  const confirmDeleteAction = async () => {
    if (!confirmDelete) return;
    try {
      await api.delete(`/object-permissions/${confirmDelete.id}/`);
      toast.success(t('toast.permission_deleted'));
      load();
    } catch { toast.error(t('toast.permission_delete_error')); }
    finally { setConfirmDelete(null); }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>{t('page.permissions.title')}</h2>
        <button className="btn btn-icon btn-primary" onClick={() => setShowModal(true)} title={t('page.permissions.new')}><Plus size={16} /></button>
      </div>
      <div className="card">
        <div className="table-container">
          <table>
            <thead><tr><th>{t('page.permissions.table.user')}</th><th>{t('page.permissions.table.type')}</th><th>{t('page.permissions.table.object')}</th><th>{t('page.permissions.table.id')}</th><th>{t('page.permissions.table.actions')}</th></tr></thead>
            <tbody>
              {perms.length === 0 && <tr><td colSpan={5} className="empty-state">{t('page.permissions.empty')}</td></tr>}
              {perms.map((p) => (
                <tr key={p.id}>
                  <td>{p.user_name || p.user}</td>
                  <td><span className="badge badge-info">{p.permission_type}</span></td>
                  <td>{p.object_type}</td>
                  <td>{p.object_id}</td>
                  <td>
                    <button className="btn btn-icon btn-sm btn-danger" onClick={() => handleDelete(p.id)} title={t('page.permissions.delete')}><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmDelete}
        title={t('common.confirm')}
        message={t('confirm.delete_permission')}
        onConfirm={confirmDeleteAction}
        onCancel={() => setConfirmDelete(null)}
      />
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>{t('page.permissions.modal_title')}</h2>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>{t('page.permissions.user')}</label>
                <select value={form.user} onChange={e => setForm({...form, user: e.target.value})} required>
                  <option value="">{t('page.permissions.select_user')}</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.display_name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>{t('page.permissions.permission_type')}</label>
                <select value={form.permission_type} onChange={e => setForm({...form, permission_type: e.target.value})}>
                  <option value="view">{t('page.permissions.view')}</option>
                  <option value="edit">{t('page.permissions.edit')}</option>
                  <option value="approve">{t('page.permissions.approve')}</option>
                </select>
              </div>
              <div className="form-group">
                <label>{t('page.permissions.object_type')}</label>
                <select value={form.object_type} onChange={e => setForm({...form, object_type: e.target.value})}>
                  <option value="Activity">{t('page.permissions.activity')}</option>
                  <option value="SchedulePeriod">{t('page.permissions.schedule')}</option>
                </select>
              </div>
              <div className="form-group">
                <label>{t('page.permissions.object_id')}</label>
                <input type="number" value={form.object_id} onChange={e => setForm({...form, object_id: e.target.value})} required />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-icon btn-primary" title={t('page.permissions.create')}><Check size={16} /></button>
                <button type="button" className="btn btn-icon btn-secondary" onClick={() => setShowModal(false)} title={t('page.permissions.cancel')}><X size={16} /></button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
