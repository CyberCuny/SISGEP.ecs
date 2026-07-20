import { useState, useEffect } from 'react';
import { systemConfigService } from '../services';
import { useToast } from '../context/ToastContext';
import { useTranslation } from 'react-i18next';
import ConfirmDialog from '../components/ConfirmDialog';
import { Plus, Edit3, Trash2, Check, X } from 'lucide-react';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';

export default function SystemConfig() {
  const toast = useToast();
  const { t } = useTranslation();
  const { user } = useAuth();
  if (!user?.is_staff) {
    return <div className="page-header"><h1>{t('page.system_config.title')}</h1><p style={{ padding: '1rem', color: 'var(--text-muted)' }}>{t('page.system_config.no_access')}</p></div>;
  }
  const [configs, setConfigs] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ key: '', value: '' });
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const res = await systemConfigService.list();
      setConfigs(res.data.results || res.data);
    } catch { toast.error(t('toast.load_config_error')); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await systemConfigService.update(editing, form);
        toast.success(t('toast.config_updated'));
      } else {
        await systemConfigService.create(form);
        toast.success(t('toast.config_created'));
      }
      setShowModal(false);
      setEditing(null);
      setForm({ key: '', value: '' });
      load();
    } catch { toast.error(t('toast.save_error')); }
  };

  const handleEdit = (c) => {
    setEditing(c.id);
    setForm({ key: c.key, value: c.value });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    setConfirmDelete({ id });
  };

  const confirmDeleteAction = async () => {
    if (!confirmDelete) return;
    try {
      await systemConfigService.delete(confirmDelete.id);
      toast.success(t('toast.config_deleted'));
      load();
    } catch { toast.error(t('toast.delete_error')); }
    finally { setConfirmDelete(null); }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>{t('page.system_config.title')}</h2>
        <button className="btn btn-icon btn-primary" onClick={() => { setEditing(null); setForm({ key: '', value: '' }); setShowModal(true); }} title={t('page.system_config.new')}><Plus size={16} /></button>
      </div>
      <div className="card">
        <div className="table-container">
          <table>
            <thead><tr><th>{t('page.system_config.table.key')}</th><th>{t('page.system_config.table.value')}</th><th>{t('page.system_config.table.actions')}</th></tr></thead>
            <tbody>
              {configs.length === 0 && <tr><td colSpan={3} className="empty-state">{t('page.system_config.empty')}</td></tr>}
              {configs.map((c) => (
                <tr key={c.id}>
                  <td><code>{c.key}</code></td>
                  <td>{c.value}</td>
                  <td>
                    <button className="btn btn-icon btn-sm btn-primary" onClick={() => handleEdit(c)} title={t('page.system_config.edit')}><Edit3 size={14} /></button>
                    <button className="btn btn-icon btn-sm btn-danger" onClick={() => handleDelete(c.id)} title={t('page.system_config.delete')}><Trash2 size={14} /></button>
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
        message={t('confirm.delete_config')}
        onConfirm={confirmDeleteAction}
        onCancel={() => setConfirmDelete(null)}
      />
      <Modal open={showModal} onClose={() => setShowModal(false)}>
        <h2>{editing ? t('page.system_config.modal_edit') : t('page.system_config.modal_new')}</h2>
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label>{t('page.system_config.key')}</label>
            <input value={form.key} onChange={e => setForm({...form, key: e.target.value})} required disabled={!!editing} />
          </div>
          <div className="form-group">
            <label>{t('page.system_config.value')}</label>
            <textarea value={form.value} onChange={e => setForm({...form, value: e.target.value})} rows={3} />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-icon btn-primary" title={t('page.system_config.save')}><Check size={16} /></button>
            <button type="button" className="btn btn-icon btn-secondary" onClick={() => setShowModal(false)} title={t('page.system_config.cancel')}><X size={16} /></button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
