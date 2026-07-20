import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Trash2, Star, Minus, UserCheck, X, Eye, Edit3 } from 'lucide-react';
import Modal from '../components/Modal';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import Pagination from '../components/Pagination';
import Spinner from '../components/Spinner';
import ConfirmDialog from '../components/ConfirmDialog';
import Breadcrumbs from '../components/Breadcrumbs';
import { SkeletonTable } from '../components/Skeleton';
import useDebounce from '../hooks/useDebounce';
import useScrollShadow from '../hooks/useScrollShadow';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { hasAnyRole, ROLES } from '../utils/roles';

export default function Activities() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const canManage = user?.is_staff || hasAnyRole(user, [ROLES.PLANNER, ROLES.DIRECTOR]);
  useDocumentTitle(t('page.activities.title'));
  const [activities, setActivities] = useState([]);
  const today = new Date();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [importantFilter, setImportantFilter] = useState('');
  const [fechaDesde, setFechaDesde] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`);
  const [fechaHasta, setFechaHasta] = useState(() => {
    const y = today.getFullYear();
    const m = today.getMonth() + 2;
    if (m > 12) return `${y + 1}-01-01`;
    return `${y}-${String(m).padStart(2, '0')}-01`;
  });
  const [useDateFilter, setUseDateFilter] = useState(false);
  const [categories, setCategories] = useState([]);
  const [types, setTypes] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const pageSize = 50;
  const [selected, setSelected] = useState(new Set());
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [batchConfirm, setBatchConfirm] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();
  const debouncedSearch = useDebounce(search, 350);
  const { ref: tableRef, scrolledLeft, scrolledRight } = useScrollShadow();

  useEffect(() => {
    if (debouncedSearch !== undefined) { setPage(1); fetchActivities(1); }
  }, [debouncedSearch]);

  const fetchActivities = (p = page) => {
    setLoading(true);
    const params = { page: p };
    if (search) params.search = search;
    if (categoryFilter) params.category = categoryFilter;
    if (typeFilter) params.activity_type = typeFilter;
    if (importantFilter) params.is_important = importantFilter;
    if (useDateFilter) {
      if (fechaDesde) params.FechaDesde = fechaDesde;
      if (fechaHasta) params.FechaHasta = fechaHasta;
    }
    api.get('/activities/', { params })
      .then((res) => {
        setActivities(res.data.results || res.data || []);
        setCount(res.data.count || 0);
      })
      .catch(() => setActivities([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const ac = new AbortController();
    fetchActivities(1);
    api.get('/categories/', { signal: ac.signal }).then(r => setCategories(r.data.results || r.data || [])).catch(() => console.warn('Failed to load categories'));
    api.get('/activity-types/', { signal: ac.signal }).then(r => setTypes(r.data.results || r.data || [])).catch(() => console.warn('Failed to load types'));
    api.get('/organizational-units/', { signal: ac.signal }).then(r => setUnits(r.data.results || r.data || [])).catch(() => console.warn('Failed to load units'));
    return () => ac.abort();
  }, []);

  useEffect(() => { fetchActivities(); }, [page]);

  const handleDelete = async (id) => {
    try {
      await api.delete(`/activities/${id}/`);
      toast.success(t('toast.activity_deleted'));
      fetchActivities();
    } catch { toast.error(t('toast.delete_error')); }
    setConfirmDelete(null);
  };

  const handleSearch = () => { setPage(1); fetchActivities(1); };

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === activities.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(activities.map(a => a.id)));
    }
  };

  const clearSelection = () => setSelected(new Set());

  const doBatchDelete = async () => {
    setBatchLoading(true);
    try {
      await api.post('/activities/batch_delete/', { ids: [...selected] });
      toast.success(t('toast.batch_deleted', { count: selected.size }));
      clearSelection();
      fetchActivities();
    } catch { toast.error(t('toast.batch_error')); }
    setBatchLoading(false);
    setBatchConfirm(null);
  };

  const doBatchUpdate = async (updates) => {
    setBatchLoading(true);
    try {
      await api.post('/activities/batch_update/', { ids: [...selected], updates });
      toast.success(t('toast.batch_updated', { count: selected.size }));
      clearSelection();
      fetchActivities();
    } catch { toast.error(t('toast.batch_error')); }
    setBatchLoading(false);
  };

  const doBatchAssign = async (unitId) => {
    setBatchLoading(true);
    try {
      await api.post('/activities/batch_assign_unit/', { ids: [...selected], organizational_unit: unitId });
      toast.success(t('toast.batch_assigned', { count: selected.size }));
      clearSelection();
      setShowAssignModal(false);
    } catch { toast.error(t('toast.batch_error')); }
    setBatchLoading(false);
  };

  return (
    <div>
      <Breadcrumbs items={[
        { to: '/', label: t('nav.dashboard') },
        { label: t('page.activities.title') },
      ]} />
      <div className="page-header">
        <h1>{t('page.activities.title')}</h1>
        {canManage && <button className="btn btn-icon btn-primary" onClick={() => navigate('/activities/new')} title={t('page.activities.new')}>
          <Plus size={16} />
        </button>}
      </div>
      <div className="card">
        <div className="toolbar">
          <input placeholder={t('page.activities.search')} value={search} onChange={(e) => setSearch(e.target.value)} className="w-auto" style={{ minWidth: '180px' }} />
          <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); fetchActivities(1); }}>
            <option value="">{t('form.all_categories')}</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); fetchActivities(1); }}>
            <option value="">{t('form.all_types')}</option>
            {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select value={importantFilter} onChange={(e) => { setImportantFilter(e.target.value); setPage(1); fetchActivities(1); }}>
            <option value="">{t('common.all')}</option>
            <option value="true">{t('page.activities.filter_important')}</option>
            <option value="false">{t('page.activities.filter_not_important')}</option>
          </select>
          <label className="form-check" style={{ margin: 0 }}>
            <input type="checkbox" checked={useDateFilter} onChange={(e) => setUseDateFilter(e.target.checked)} />
            <span>{t('form.dates')}</span>
          </label>
          {useDateFilter && (
            <>
              <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} style={{ width: '150px' }} />
              <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} style={{ width: '150px' }} />
            </>
          )}
          <button className="btn btn-icon btn-secondary btn-sm" onClick={handleSearch} title={t('common.search')}>
            <Search size={14} />
          </button>
        </div>

        {selected.size > 0 && canManage && (
          <div className="batch-toolbar">
            <span className="batch-count">{t('page.activities.selected', { count: selected.size })}</span>
            <button className="btn btn-icon btn-sm btn-danger" disabled={batchLoading} onClick={() => setBatchConfirm('delete')} title={t('page.activities.batch_delete')}><Trash2 size={14} /></button>
            <button className="btn btn-icon btn-sm btn-outline" disabled={batchLoading} onClick={() => doBatchUpdate({ is_important: true })} title={t('page.activities.batch_important')}><Star size={14} /></button>
            <button className="btn btn-icon btn-sm btn-outline" disabled={batchLoading} onClick={() => doBatchUpdate({ is_important: false })} title={t('page.activities.batch_not_important')}><Minus size={14} /></button>
            <button className="btn btn-icon btn-sm btn-outline" disabled={batchLoading} onClick={() => setShowAssignModal(true)} title={t('page.activities.batch_assign')}><UserCheck size={14} /></button>
            <button className="btn btn-icon btn-sm btn-secondary" disabled={batchLoading} onClick={clearSelection} title={t('page.activities.clear_selection')}><X size={14} /></button>
          </div>
        )}

        {loading ? <SkeletonTable rows={8} cols={8} /> : activities.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <span className="empty-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
              </span>
              <h4>{t('page.activities.empty')}</h4>
              <p>{t('page.activities.empty_hint')}</p>
              {canManage && <button className="btn btn-icon btn-primary btn-sm mt-4" onClick={() => navigate('/activities/new')} title={t('page.activities.new')}>
                <Plus size={14} />
              </button>}
            </div>
          </div>
        ) : (
          <div ref={tableRef} className={`table-container table-scroll-shadow ${scrolledLeft ? 'scroll-left' : ''} ${scrolledRight ? 'scroll-right' : ''}`}>
            <table className="striped">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>
                    <input type="checkbox" checked={activities.length > 0 && selected.size === activities.length} onChange={toggleSelectAll} />
                  </th>
                  <th>{t('page.activities.table.description')}</th><th>{t('page.activities.table.place')}</th><th>{t('page.activities.table.responsibles')}</th>
                  <th>{t('page.activities.table.category')}</th><th>{t('page.activities.table.ou')}</th><th>{t('page.activities.table.arc')}</th>
                  <th>{t('page.activities.table.important')}</th><th>{t('page.activities.table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((act) => (
                  <tr key={act.id} className={selected.has(act.id) ? 'row-selected' : ''}>
                    <td><input type="checkbox" checked={selected.has(act.id)} onChange={() => toggleSelect(act.id)} /></td>
                    <td><a href={`/activities/${act.id}`} onClick={(e) => { e.preventDefault(); navigate(`/activities/${act.id}`); }} style={{ color: 'var(--link-color, #1976d2)', cursor: 'pointer', fontWeight: 500 }}>{act.description || '-'}</a></td>
                    <td>{act.place || '-'}</td>
                    <td>{act.responsible || '-'}</td>
                    <td>{act.category_name || '-'}</td>
                    <td>{act.organizational_unit_name || '-'}</td>
                    <td>{act.arc_name || '-'}</td>
                    <td>
                      {act.is_important ? <span className="badge badge-warning">{t('badge.important')}</span> :
                       act.is_general ? <span className="badge badge-info">{t('badge.general')}</span> : '-'}
                    </td>
                    <td>
                      <button className="btn btn-icon btn-sm btn-secondary" onClick={() => navigate(`/activities/${act.id}`)} title={t('page.activities.view')}><Eye size={14} /></button>
                      {canManage && <button className="btn btn-icon btn-sm btn-primary" onClick={() => navigate(`/activities/${act.id}/edit`)} title={t('page.activities.edit')}><Edit3 size={14} /></button>}
                      {canManage && <button className="btn btn-icon btn-sm btn-danger" onClick={() => setConfirmDelete(act)} title={t('page.activities.delete')}><Trash2 size={14} /></button>}
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
        title={t('page.activities.delete_title')}
        message={t('confirm.delete_activity', { name: confirmDelete?.description?.substring(0, 100) })}
        onConfirm={() => handleDelete(confirmDelete.id)}
        onCancel={() => setConfirmDelete(null)}
      />

      <ConfirmDialog
        open={batchConfirm === 'delete'}
        title={t('page.activities.batch_delete_title')}
        message={t('confirm.batch_delete_activities', { count: selected.size })}
        onConfirm={doBatchDelete}
        onCancel={() => setBatchConfirm(null)}
      />

      <Modal open={showAssignModal} onClose={() => setShowAssignModal(false)} width="400px">
        <h2>{t('page.activities.batch_assign_title')}</h2>
        <p>{t('page.activities.batch_assign_desc', { count: selected.size })}</p>
        <div className="form-group">
          <select id="batch-unit-select" value="" onChange={(e) => { if (e.target.value) doBatchAssign(e.target.value); }}>
            <option value="">{t('form.select')}</option>
            {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div className="form-actions">
          <button className="btn btn-icon btn-secondary" onClick={() => setShowAssignModal(false)} disabled={batchLoading} title={t('common.cancel')}><X size={16} /></button>
        </div>
      </Modal>
    </div>
  );
}
