import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import ConfirmDialog from '../components/ConfirmDialog';
import { Plus, Edit3, Trash2, X, Check } from 'lucide-react';
import Modal from '../components/Modal';


export default function Roles() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const canAdmin = user?.is_staff;
  const [roles, setRoles] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '' });
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const toast = useToast();

  const fetchData = () => {
    api.get('/roles/').then(r => setRoles(r.data.results || r.data || [])).catch(() => {});
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await api.patch(`/roles/${editingId}/`, form);
      } else {
        await api.post('/roles/', form);
      }
      setShowForm(false); setEditingId(null);
      setForm({ name: '' });
      fetchData();
    } catch { toast.error(t('toast.save_error')); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    setConfirmDelete({ id });
  };

  const confirmDeleteAction = async () => {
    if (!confirmDelete) return;
    try {
      await api.delete(`/roles/${confirmDelete.id}/`);
      fetchData();
    } catch { toast.error(t('toast.delete_error')); }
    finally { setConfirmDelete(null); }
  };

  return (
    <div>
      <div className="page-header">
        <h1>{t('page.roles.title')}</h1>
        {canAdmin && <button className="btn btn-icon btn-primary" onClick={() => { setEditingId(null); setForm({ name: '' }); setShowForm(true); }} title={t('page.roles.new')}>
          <Plus size={16} />
        </button>}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} width="400px">
        <h2>{editingId ? t('page.roles.edit_title') : t('page.roles.create_title')}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('page.roles.name')}</label>
            <input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required placeholder={t('common.name')} />
          </div>
          <div className="form-actions">
            <button className="btn btn-icon btn-secondary" type="button" onClick={() => setShowForm(false)} title={t('page.roles.cancel')}><X size={16} /></button>
            <button className="btn btn-icon btn-primary" type="submit" disabled={saving} title={saving ? t('common.saving') : (editingId ? t('page.roles.update') : t('page.roles.create'))}>
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
                <th>{t('page.roles.table.name')}</th>
                {canAdmin && <th>{t('page.roles.table.actions')}</th>}
              </tr>
            </thead>
            <tbody>
              {roles.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  {canAdmin && <td>
                    <button className="btn btn-icon btn-sm btn-primary" onClick={() => { setEditingId(r.id); setForm({ name: r.name }); setShowForm(true); }} title={t('common.edit')}><Edit3 size={14} /></button>
                    <button className="btn btn-icon btn-sm btn-danger" onClick={() => handleDelete(r.id)} title={t('common.delete')}><Trash2 size={14} /></button>
                  </td>}
                </tr>
              ))}
              {roles.length === 0 && (
                <tr><td colSpan={canAdmin ? 2 : 1} className="empty-state">{t('common.empty')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <ConfirmDialog
        open={!!confirmDelete}
        title={t('common.confirm')}
        message={t('confirm.delete_role')}
        onConfirm={confirmDeleteAction}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
