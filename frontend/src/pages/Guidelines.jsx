import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { catalogService } from '../services';
import { useToast } from '../context/ToastContext';
import ConfirmDialog from '../components/ConfirmDialog';
import { Plus, X, Check, Edit3, Trash2 } from 'lucide-react';

export default function Guidelines() {
  const { t } = useTranslation();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const res = await catalogService.guidelines.list();
      setItems(res.data.results || res.data);
    } catch { toast.error(t('toast.load_guidelines_error')); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await catalogService.guidelines.update(editing, form);
        toast.success(t('toast.guideline_updated'));
      } else {
        await catalogService.guidelines.create(form);
        toast.success(t('toast.guideline_created'));
      }
      setShowModal(false);
      setEditing(null);
      setForm({ name: '', description: '' });
      load();
    } catch { toast.error(t('toast.save_error')); }
  };

  const handleEdit = (item) => {
    setEditing(item.id);
    setForm({ name: item.name, description: item.description || '' });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    setConfirmDelete({ id });
  };

  const confirmDeleteAction = async () => {
    if (!confirmDelete) return;
    try {
      await catalogService.guidelines.delete(confirmDelete.id);
      toast.success(t('toast.guideline_deleted'));
      load();
    } catch { toast.error(t('toast.delete_error')); }
    finally { setConfirmDelete(null); }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>{t('page.guidelines.title')}</h2>
        <button className="btn btn-icon btn-primary" onClick={() => { setEditing(null); setForm({ name: '', description: '' }); setShowModal(true); }} title={t('page.guidelines.new')}><Plus size={16} /></button>
      </div>
      <div className="card">
        <div className="table-container">
          <table>
            <thead><tr><th>{t('page.guidelines.table.name')}</th><th>{t('page.guidelines.table.description')}</th><th>{t('page.guidelines.table.actions')}</th></tr></thead>
            <tbody>
              {items.length === 0 && <tr><td colSpan={3} className="empty-state">{t('page.guidelines.empty')}</td></tr>}
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.description}</td>
                  <td>
                    <button className="btn btn-icon btn-sm btn-primary" onClick={() => handleEdit(item)} title={t('page.guidelines.edit')}><Edit3 size={14} /></button>
                    <button className="btn btn-icon btn-sm btn-danger" onClick={() => handleDelete(item.id)} title={t('page.guidelines.delete')}><Trash2 size={14} /></button>
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
        message={t('confirm.delete_guideline')}
        onConfirm={confirmDeleteAction}
        onCancel={() => setConfirmDelete(null)}
      />
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>{editing ? t('page.guidelines.modal_edit') : t('page.guidelines.modal_new')}</h2>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label>{t('page.guidelines.name')}</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>{t('page.guidelines.description')}</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3} />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-icon btn-primary" title={t('page.guidelines.save')}><Check size={16} /></button>
                <button type="button" className="btn btn-icon btn-secondary" onClick={() => setShowModal(false)} title={t('page.guidelines.cancel')}><X size={16} /></button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
