import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { unitService } from '../services';
import { useToast } from '../context/ToastContext';
import Spinner from '../components/Spinner';
import ConfirmDialog from '../components/ConfirmDialog';
import { Plus, Edit3, Trash2, X, Check, List, GitBranch, Users } from 'lucide-react';

function TreeNode({ node, level = 0, onEdit, onDelete, onShowUsers, onDrop, onDragStart, draggedId }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(node.expanded || false);
  const [dropZone, setDropZone] = useState(null);
  const rowRef = useRef(null);
  const hasChildren = node.children && node.children.length > 0;
  const isAccessible = node.expanded || node.has_accessible_descendants;
  const isDragging = draggedId === node.id;

  const handleDragOver = (e) => {
    e.preventDefault();
    if (isDragging) return;
    const rect = rowRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const h = rect.height;
    if (y < h * 0.25) setDropZone('before');
    else if (y > h * 0.75) setDropZone('after');
    else setDropZone('inside');
  };

  const handleDragLeave = () => setDropZone(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDropZone(null);
    if (isDragging) return;
    if (dropZone === 'inside') {
      onDrop(draggedId, node.id, 0);
    } else if (dropZone === 'before') {
      onDrop(draggedId, node.parent_id, node.sort_order);
    } else if (dropZone === 'after') {
      onDrop(draggedId, node.parent_id, node.sort_order + 1);
    }
  };

  const dropIndicator = dropZone === 'before' ? '2px solid var(--primary)' : dropZone === 'after' ? '2px solid var(--primary)' : null;

  return (
    <div
      ref={rowRef}
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart(node.id); }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        opacity: isDragging ? 0.4 : 1,
        borderTop: dropZone === 'before' ? dropIndicator : undefined,
        borderBottom: dropZone === 'after' ? dropIndicator : undefined,
        background: dropZone === 'inside' ? 'var(--primary-bg)' : undefined,
        borderRadius: dropZone === 'inside' ? '4px' : undefined,
        transition: 'background 0.15s, opacity 0.15s',
        cursor: 'grab',
      }}
    >
      <div style={{ paddingLeft: `${level * 1.5}rem`, display: 'flex', alignItems: 'center', gap: '0.3rem', paddingTop: '0.2rem', paddingBottom: '0.2rem', flexWrap: 'wrap' }}>
        {hasChildren ? (
          <span onClick={(e) => { e.stopPropagation(); setOpen(!open); }} style={{ cursor: 'pointer', width: '1rem', userSelect: 'none' }}>
            {open ? '▼' : '▶'}
          </span>
        ) : <span style={{ width: '1rem' }} />}
        <span style={{ fontWeight: isAccessible ? 600 : 400, color: isAccessible ? 'var(--text)' : 'var(--text-muted)' }}>
          {node.name}
        </span>
        {isAccessible && <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>{t('badge.access')}</span>}
        <div style={{ display: 'flex', gap: '0.2rem', marginLeft: '0.5rem' }}>
          <button className="btn btn-icon btn-sm btn-primary" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }} onClick={() => onEdit(node)} title={t('common.edit')}><Edit3 size={12} /></button>
          <button className="btn btn-icon btn-sm btn-secondary" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }} onClick={() => onShowUsers(node)} title={t('nav.users')}><Users size={12} /></button>
          <button className="btn btn-icon btn-sm btn-danger" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }} onClick={() => onDelete(node.id)} title={t('common.delete')}><Trash2 size={12} /></button>
        </div>
      </div>
      {open && hasChildren && node.children.map((child, i) => (
        <TreeNode key={child.id || i} node={child} level={level + 1} onEdit={onEdit} onDelete={onDelete} onShowUsers={onShowUsers} onDrop={onDrop} onDragStart={onDragStart} draggedId={draggedId} />
      ))}
    </div>
  );
}

export default function Units() {
  const { t } = useTranslation();
  const [units, setUnits] = useState([]);
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', parent: '', responsible: '' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [treeData, setTreeData] = useState([]);
  const [viewMode, setViewMode] = useState('table');
  const [subUsers, setSubUsers] = useState([]);
  const [showSubUsers, setShowSubUsers] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [draggedId, setDraggedId] = useState(null);
  const [moving, setMoving] = useState(false);
  const toast = useToast();

  const fetchData = () => {
    api.get('/organizational-units/').then(r => setUnits(r.data.results || r.data || [])).catch(() => console.warn('Failed to load units'));
    api.get('/users/').then(r => setUsers(r.data.results || r.data || [])).catch(() => console.warn('Failed to load users'));
    api.get('/organizational-units/tree/').then(r => setTreeData(r.data || [])).catch(() => console.warn('Failed to load tree'));
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setFormError(t('form.required')); return; }
    setSaving(true); setFormError('');
    try {
      if (editingId) {
        await api.patch(`/organizational-units/${editingId}/`, form);
        toast.success(t('toast.uo_updated'));
      } else {
        await api.post('/organizational-units/', form);
        toast.success(t('toast.uo_created'));
      }
      setShowForm(false); setEditingId(null);
      setForm({ name: '', parent: '', responsible: '' });
      fetchData();
    } catch (err) {
      setFormError(err.response?.data
        ? (typeof err.response.data === 'string' ? err.response.data
          : Object.values(err.response.data).flat().filter(Boolean).join('. '))
        : t('toast.save_error'));
    } finally { setSaving(false); }
  };

  const handleEdit = (node) => {
    setEditingId(node.id);
    setForm({ name: node.name, parent: node.parent_id || '', responsible: node.responsible_id || '' });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    setConfirmDelete({ id });
  };

  const confirmDeleteAction = async () => {
    if (!confirmDelete) return;
    try {
      await api.delete(`/organizational-units/${confirmDelete.id}/`);
      toast.success(t('toast.uo_deleted'));
      fetchData();
    } catch { toast.error(t('toast.delete_error')); }
    finally { setConfirmDelete(null); }
  };

  const handleShowUsers = async (node) => {
    try {
      const res = await api.get('/organizational-units/subordinate_users/', { params: { user_id: node.responsible_id || '' } });
      setSubUsers(res.data || []);
      setShowSubUsers(node);
    } catch { toast.error(t('toast.load_users_error')); }
  };

  const handleDrop = async (id, parentId, position) => {
    setMoving(true);
    try {
      await unitService.move(id, parentId, position);
      toast.success(t('toast.uo_moved'));
      fetchData();
    } catch (err) {
      const msg = err.response?.data?.error || t('toast.save_error');
      toast.error(msg);
    } finally {
      setMoving(false);
      setDraggedId(null);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>{t('page.units.title')}</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setViewMode('table')}><List size={14} /> {t('page.units.view_table')}</button>
          <button className={`btn btn-sm ${viewMode === 'tree' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setViewMode('tree')}><GitBranch size={14} /> {t('page.units.view_tree')}</button>
          <button className="btn btn-icon btn-primary" onClick={() => { setEditingId(null); setForm({ name: '', parent: '', responsible: '' }); setShowForm(true); }} title={t('page.units.new')}>
            <Plus size={16} />
          </button>
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" style={{ width: '450px' }} onClick={(e) => e.stopPropagation()}>
            <h2>{editingId ? t('page.units.edit_title') : t('page.units.create_title')}</h2>
            {formError && <div className="alert alert-error">{formError}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>{t('page.units.name')}</label>
                <input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required placeholder={t('common.name')} />
              </div>
              <div className="form-group">
                <label>{t('page.units.parent_unit')}</label>
                <select value={form.parent} onChange={(e) => setForm({...form, parent: e.target.value})}>
                  <option value="">{t('page.units.none_root')}</option>
                  {units.filter(u => u.id !== editingId).map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>{t('page.units.responsible')}</label>
                <select value={form.responsible} onChange={(e) => setForm({...form, responsible: e.target.value})}>
                  <option value="">{t('page.units.select')}</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.display_name || u.username}</option>
                  ))}
                </select>
              </div>
              <div className="form-actions">
                <button className="btn btn-icon btn-secondary" type="button" onClick={() => setShowForm(false)} title={t('page.units.cancel')}><X size={16} /></button>
                <button className="btn btn-icon btn-primary" type="submit" disabled={saving} title={saving ? t('common.saving') : (editingId ? t('page.units.update') : t('page.units.create'))}>
                  <Check size={16} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSubUsers && (
        <div className="modal-overlay" onClick={() => setShowSubUsers(null)}>
          <div className="modal-content" style={{ width: '500px' }} onClick={(e) => e.stopPropagation()}>
            <h2>{t('page.units.users_title', { name: showSubUsers.name })}</h2>
            {subUsers.length === 0 ? (
              <div className="empty-state">{t('page.units.empty_users')}</div>
            ) : (
              <div className="table-container">
                <table>
                  <thead><tr><th>{t('page.units.table.user')}</th><th>{t('page.units.table.name')}</th><th>{t('page.units.table.email')}</th></tr></thead>
                  <tbody>
                    {subUsers.map((u) => (
                      <tr key={u.id}>
                        <td>{u.username}</td>
                        <td>{u.display_name}</td>
                        <td>{u.email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="form-actions">
              <button className="btn btn-icon btn-secondary" onClick={() => setShowSubUsers(null)} title={t('page.units.close')}><X size={16} /></button>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'table' ? (
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr><th>{t('page.units.table_name')}</th><th>{t('page.units.table_parent')}</th><th>{t('page.units.table_responsible')}</th><th>{t('page.units.table_actions')}</th></tr>
              </thead>
              <tbody>
                {units.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.parent_name || '-'}</td>
                    <td>{u.responsible_name || '-'}</td>
                    <td>
                      <button className="btn btn-icon btn-sm btn-primary" onClick={() => handleEdit(u)} title={t('common.edit')}><Edit3 size={14} /></button>
                      <button className="btn btn-icon btn-sm btn-danger" onClick={() => handleDelete(u.id)} title={t('common.delete')}><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
                {units.length === 0 && (
                  <tr><td colSpan={4} className="empty-state">{t('page.units.empty')}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card">
          <h3 style={{ marginBottom: '0.75rem' }}>{t('page.units.tree_title')} {moving && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}> moviendo...</span>}</h3>
          {treeData.length === 0 ? <div className="empty-state">{t('page.units.empty')}</div> : (
            treeData.map((node, i) => (
              <TreeNode key={node.id || i} node={node} onEdit={handleEdit} onDelete={handleDelete} onShowUsers={handleShowUsers} onDrop={handleDrop} onDragStart={setDraggedId} draggedId={draggedId} />
            ))
          )}
        </div>
      )}
      <ConfirmDialog
        open={!!confirmDelete}
        title={t('common.confirm')}
        message={t('confirm.delete_unit')}
        onConfirm={confirmDeleteAction}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
