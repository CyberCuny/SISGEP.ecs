import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { catalogService } from '../services';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { hasAnyRole, ROLES } from '../utils/roles';
import ConfirmDialog from '../components/ConfirmDialog';
import { Plus, X, Check, Edit3, Trash2 } from 'lucide-react';
import Modal from '../components/Modal';

const catalogTypes = [
  { key: 'categories' },
  { key: 'activityTypes' },
  { key: 'arcs' },
  { key: 'objectives' },
  { key: 'criteria' },
  { key: 'guidelines' },
];

export default function Catalog() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const canManage = user?.is_staff || hasAnyRole(user, [ROLES.PLANNER, ROLES.DIRECTOR]);
  const [activeTab, setActiveTab] = useState('categories');
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', number: '', arc: '', objective: '' });
  const [confirmDelete, setConfirmDelete] = useState(null);
  const toast = useToast();

  const current = catalogTypes.find(c => c.key === activeTab);

  const tabLabelKey = (key) => `page.catalog.tabs.${key.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^-/, '')}`;

  const fetchItems = () => {
    if (!current) return;
    catalogService[current.key].list().then(r => setItems(r.data.results || r.data || []));
  };

  useEffect(() => { fetchItems(); }, [activeTab]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { name: form.name };
      if (activeTab === 'arcs') payload.number = parseInt(form.number) || null;
      if (activeTab === 'objectives') payload.arc = form.arc || null;
      if (activeTab === 'criteria') payload.objective = form.objective || null;
      if (editing) {
        await catalogService[current.key].update(editing, payload);
        toast.success(t('toast.catalog_updated'));
      } else {
        await catalogService[current.key].create(payload);
        toast.success(t('toast.catalog_created'));
      }
      setShowForm(false); setEditing(null);
      setForm({ name: '', number: '', arc: '', objective: '' });
      fetchItems();
    } catch { toast.error(t('toast.catalog_save_error')); }
  };

  const handleDelete = async (id) => {
    setConfirmDelete({ id });
  };

  const confirmDeleteAction = async () => {
    if (!confirmDelete) return;
    try {
      await catalogService[current.key].delete(confirmDelete.id);
      toast.success(t('toast.catalog_deleted'));
      fetchItems();
    } catch { toast.error(t('toast.delete_error')); }
    finally { setConfirmDelete(null); }
  };

  const openEdit = (item) => {
    setEditing(item.id);
    setForm({ name: item.name || '', number: item.number || '', arc: item.arc || '', objective: item.objective || '' });
    setShowForm(true);
  };

  const [arcs, setArcs] = useState([]);
  const [objectives, setObjectives] = useState([]);

  useEffect(() => {
    if (activeTab === 'objectives' || activeTab === 'criteria') {
      catalogService.arcs.list().then(r => setArcs(r.data.results || r.data || []));
    }
    if (activeTab === 'criteria') {
      catalogService.objectives.list().then(r => setObjectives(r.data.results || r.data || []));
    }
  }, [activeTab]);

  const extraFields = () => {
    if (activeTab === 'arcs') {
      return (
        <div className="form-group">
          <label>{t('page.catalog.number')}</label>
          <input type="number" value={form.number} onChange={(e) => setForm({...form, number: e.target.value})} />
        </div>
      );
    }
    if (activeTab === 'objectives') {
      return (
        <div className="form-group">
          <label>{t('page.catalog.arc')}</label>
          <select value={form.arc} onChange={(e) => setForm({...form, arc: e.target.value})}>
            <option value="">{t('form.select')}</option>
            {arcs.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      );
    }
    if (activeTab === 'criteria') {
      return (
        <div className="form-group">
          <label>{t('page.catalog.objective')}</label>
          <select value={form.objective} onChange={(e) => setForm({...form, objective: e.target.value})}>
            <option value="">{t('form.select')}</option>
            {objectives.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
      );
    }
    return null;
  };

  const extraColumns = () => {
    if (activeTab === 'arcs') return <th>{t('page.catalog.number')}</th>;
    if (activeTab === 'objectives') return <th>{t('page.catalog.arc')}</th>;
    if (activeTab === 'criteria') return <th>{t('page.catalog.objective')}</th>;
    return null;
  };

  const extraCell = (item) => {
    if (activeTab === 'arcs') return <td>{item.number || '-'}</td>;
    if (activeTab === 'objectives') return <td>{item.arc_name || '-'}</td>;
    if (activeTab === 'criteria') return <td>{item.objective_name || '-'}</td>;
    return null;
  };

  return (
    <div>
      <div className="page-header">
        <h1>{t('page.catalog.title')}</h1>
        {canManage && <button className="btn btn-icon btn-primary" onClick={() => { setEditing(null); setForm({ name: '', number: '', arc: '', objective: '' }); setShowForm(true); }} title={t('page.catalog.new')}>
          <Plus size={16} />
        </button>}
      </div>

      <div className="tabs">
        {catalogTypes.map((c) => (
          <button key={c.key} className={`tab ${activeTab === c.key ? 'active' : ''}`} onClick={() => setActiveTab(c.key)}>
            {t(tabLabelKey(c.key))}
          </button>
        ))}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} width="450px">
        <h2>{editing ? t('page.catalog.edit_title') : t('page.catalog.create_title')} {t(tabLabelKey(current.key))}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('page.catalog.name')}</label>
            <input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required />
          </div>
          {extraFields()}
          <div className="form-actions">
            <button className="btn btn-icon btn-secondary" type="button" onClick={() => setShowForm(false)} title={t('page.catalog.cancel')}><X size={16} /></button>
            <button className="btn btn-icon btn-primary" type="submit" title={editing ? t('page.catalog.update') : t('page.catalog.create')}><Check size={16} /></button>
          </div>
        </form>
      </Modal>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>{t('page.catalog.table.name')}</th>
                {extraColumns()}
                <th>{t('page.catalog.table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  {extraCell(item)}
                    <td>
                    {canManage && <button className="btn btn-icon btn-sm btn-primary" onClick={() => openEdit(item)} title={t('common.edit')}><Edit3 size={14} /></button>}
                    {canManage && <button className="btn btn-icon btn-sm btn-danger" onClick={() => handleDelete(item.id)} title={t('common.delete')}><Trash2 size={14} /></button>}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={3} className="empty-state">{t('page.catalog.empty')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <ConfirmDialog
        open={!!confirmDelete}
        title={t('common.confirm')}
        message={t('confirm.delete_catalog_item')}
        onConfirm={confirmDeleteAction}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
