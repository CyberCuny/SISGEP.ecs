import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Edit3, Trash2, Share2, UserPlus, Building2, X, Check } from 'lucide-react';
import api from '../services/api';
import { scheduleService, activityService, unitService } from '../services';
import Breadcrumbs from '../components/Breadcrumbs';
import HistorySection from '../components/HistorySection';
import AttachmentsSection from '../components/AttachmentsSection';
import CommentsSection from '../components/CommentsSection';
import ConfirmDialog from '../components/ConfirmDialog';
import Spinner from '../components/Spinner';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { hasAnyRole, ROLES } from '../utils/roles';
import Modal from '../components/Modal';

export default function ActivityDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const canManage = user?.is_staff || hasAnyRole(user, [ROLES.PLANNER, ROLES.DIRECTOR]);
  const canComment = user?.is_staff || hasAnyRole(user, [ROLES.PLANNER, ROLES.APPROVER, ROLES.DIRECTOR, ROLES.EXECUTOR]);
  const [activity, setActivity] = useState(null);
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [distributing, setDistributing] = useState(false);
  const [showMapUser, setShowMapUser] = useState(false);
  const [mapUserId, setMapUserId] = useState('');
  const [mapUsers, setMapUsers] = useState([]);
  const [showAssignUnits, setShowAssignUnits] = useState(false);
  const [allUnits, setAllUnits] = useState([]);
  const [selectedUnitIds, setSelectedUnitIds] = useState([]);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    document.title = t('page.activity_detail.title');
    setLoading(true);
    Promise.all([
      api.get(`/activities/${id}/`),
      scheduleService.list({ activity_id: id }),
      api.get('/users/?page_size=500'),
      unitService.list({ page_size: 500 }),
    ]).then(([actRes, perRes, usrRes, untRes]) => {
      setActivity(actRes.data);
      setPeriods(perRes.data.results || perRes.data || []);
      setMapUsers(usrRes.data.results || usrRes.data || []);
      setAllUnits(untRes.data.results || untRes.data || []);
    }).finally(() => setLoading(false));
  }, [id]);

  const handleDistribute = async () => {
    setDistributing(true);
    try {
      await activityService.distribute({ activity_id: Number(id) });
      toast.success(t('toast.distributed'));
    } catch (err) {
      const detail = err.response?.data?.error || err.message || t('toast.distribute_error');
      toast.error(detail);
    }
    finally { setDistributing(false); }
  };

  const handleMapUser = async (e) => {
    e.preventDefault();
    if (!mapUserId) return;
    try {
      await activityService.mapToUser({ activity_id: Number(id), user_id: Number(mapUserId) });
      toast.success(t('toast.mapped_user'));
      setShowMapUser(false);
      setMapUserId('');
    } catch (err) {
      const detail = err.response?.data?.error || err.message || t('toast.map_user_error');
      toast.error(detail);
    }
  };

  const openMapUserModal = () => {
    setMapUserId('');
    setShowMapUser(true);
  };

  const openAssignUnitsModal = () => {
    setSelectedUnitIds([]);
    setShowAssignUnits(true);
  };

  const toggleUnit = (uid) => {
    setSelectedUnitIds(prev => prev.includes(uid) ? prev.filter(x => x !== uid) : [...prev, uid]);
  };

  const handleAssignUnits = async (e) => {
    e.preventDefault();
    if (selectedUnitIds.length === 0) return;
    setAssigning(true);
    try {
      await activityService.assignToUnits({ activity_id: Number(id), unit_ids: selectedUnitIds });
      toast.success(t('toast.assigned_units'));
      setShowAssignUnits(false);
    } catch (err) {
      const detail = err.response?.data?.error || err.message || t('toast.assign_units_error');
      toast.error(detail);
    } finally { setAssigning(false); }
  };

  if (loading) return <div className="card"><Spinner /></div>;
  if (!activity) return <div className="card"><div className="empty-state">{t('page.activity_detail.not_found')}</div></div>;

  const fields = [
    { label: t('page.activity_detail.field.description'), value: activity.description },
    { label: t('page.activity_detail.field.place'), value: activity.place },
    { label: t('page.activity_detail.field.responsible'), value: activity.responsible },
    { label: t('page.activity_detail.field.participants'), value: activity.participants },
    { label: t('page.activity_detail.field.category'), value: activity.category_name },
    { label: t('page.activity_detail.field.organizational_unit'), value: activity.organizational_unit_name },
    { label: t('page.activity_detail.field.activity_type'), value: activity.activity_type_name },
    { label: t('page.activity_detail.field.arc'), value: activity.arc_name },
    { label: t('page.activity_detail.field.associated_objective'), value: activity.associated_objective_name },
    { label: t('page.activity_detail.field.measurement_criterion'), value: activity.measurement_criterion_name },
  ];

  return (
    <div>
      <Breadcrumbs items={[
        { to: '/', label: t('nav.dashboard') },
        { to: '/activities', label: t('nav.activities') },
        { label: activity.description || `#${activity.id}` },
      ]} />
      <div className="page-header">
        <h1>{activity.description || `#${activity.id}`}</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {activity.is_important && <span className="badge badge-warning">{t('badge.important')}</span>}
          {activity.is_general && <span className="badge badge-info">{t('badge.general')}</span>}
          {canManage && <button className="btn btn-icon btn-primary" onClick={() => navigate(`/activities/${id}/edit`)} title={t('page.activity_detail.edit')}>
            <Edit3 size={16} />
          </button>}
          {canManage && <button className="btn btn-icon btn-secondary" onClick={handleDistribute} disabled={distributing} title={distributing ? t('page.activity_detail.distributing') : t('page.activity_detail.distribute')}>
            <Share2 size={16} />
          </button>}
          {canManage && <button className="btn btn-icon btn-secondary" onClick={openAssignUnitsModal} title={t('page.activity_detail.assign_units')}>
            <Building2 size={16} />
          </button>}
          {canManage && <button className="btn btn-icon btn-secondary" onClick={openMapUserModal} title={t('page.activity_detail.map_user')}>
            <UserPlus size={16} />
          </button>}
          {canManage && <button className="btn btn-icon btn-danger" onClick={() => setConfirmDelete(true)} title={t('page.activities.delete')}>
            <Trash2 size={16} />
          </button>}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title={t('page.activities.delete_title')}
        message={t('confirm.delete_activity', { name: activity?.description?.substring(0, 100) })}
        onConfirm={async () => {
          try {
            await api.delete(`/activities/${id}/`);
            toast.success(t('toast.activity_deleted'));
            navigate('/activities');
          } catch { toast.error(t('toast.delete_error')); }
          setConfirmDelete(false);
        }}
        onCancel={() => setConfirmDelete(false)}
      />

      <div className="card">
        <div className="card-header"><h3>{t('page.activity_detail.general_info')}</h3></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem', padding: '1rem' }}>
          {fields.map((f, i) => (
            <div key={i}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #666)', marginBottom: '0.15rem' }}>{f.label}</div>
              <div style={{ fontWeight: 500 }}>{f.value || '-'}</div>
            </div>
          ))}
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #666)', marginBottom: '0.15rem' }}>{t('page.activity_detail.field.color')}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: 20, height: 20, borderRadius: 4, backgroundColor: activity.color || '#ccc', display: 'inline-block' }} />
              <span>{activity.color || '-'}</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #666)', marginBottom: '0.15rem' }}>{t('page.activity_detail.field.created_by')}</div>
            <div style={{ fontWeight: 500 }}>{activity.created_by_name || activity.created_by || '-'}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #666)', marginBottom: '0.15rem' }}>{t('page.activity_detail.field.created_at')}</div>
            <div style={{ fontWeight: 500 }}>{activity.created_at ? new Date(activity.created_at).toLocaleDateString() : '-'}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #666)', marginBottom: '0.15rem' }}>{t('page.activity_detail.field.updated_at')}</div>
            <div style={{ fontWeight: 500 }}>{activity.updated_at ? new Date(activity.updated_at).toLocaleDateString() : '-'}</div>
          </div>
        </div>
      </div>

      {periods.length > 0 && (
        <div className="card">
          <div className="card-header"><h3>{t('page.activity_detail.schedule_periods')}</h3></div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>{t('page.activity_detail.period.start')}</th>
                  <th>{t('page.activity_detail.period.end')}</th>
                  <th>{t('page.activity_detail.period.start_time')}</th>
                  <th>{t('page.activity_detail.period.end_time')}</th>
                  <th>{t('page.activity_detail.period.status')}</th>
                  <th>{t('page.activity_detail.period.observation')}</th>
                </tr>
              </thead>
              <tbody>
                {periods.map(p => (
                  <tr key={p.id}>
                    <td>{p.start_date || '-'}</td>
                    <td>{p.end_date || '-'}</td>
                    <td>{p.start_time || '-'}</td>
                    <td>{p.end_time || '-'}</td>
                    <td>{p.status ? <span className="badge badge-info">{p.status}</span> : '-'}</td>
                    <td>{p.observation || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={showMapUser} onClose={() => setShowMapUser(false)} width="400px">
        <h2>{t('page.activity_detail.map_user')}</h2>
        <form onSubmit={handleMapUser}>
          <div className="form-group">
            <label>{t('page.activity_detail.select_user')}</label>
            <select value={mapUserId} onChange={(e) => setMapUserId(e.target.value)} required>
              <option value="">{t('form.select')}</option>
              {mapUsers.map(u => (
                <option key={u.id} value={u.id}>{u.display_name || u.username}</option>
              ))}
            </select>
          </div>
          <div className="form-actions">
            <button className="btn btn-icon btn-secondary" type="button" onClick={() => setShowMapUser(false)} title={t('common.cancel')}><X size={16} /></button>
            <button className="btn btn-icon btn-primary" type="submit" title={t('common.save')}><Check size={16} /></button>
          </div>
        </form>
      </Modal>

      <Modal open={showAssignUnits} onClose={() => setShowAssignUnits(false)} width="450px">
        <h2>{t('page.activity_detail.assign_units_title')}</h2>
        <form onSubmit={handleAssignUnits}>
          <div className="form-group">
            <label>{t('page.activity_detail.select_units')}</label>
            <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid var(--border-color, #ddd)', borderRadius: 6, padding: '0.25rem 0' }}>
              {allUnits.length === 0 && <div style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>{t('common.empty')}</div>}
              {allUnits.map(u => (
                <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.75rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={selectedUnitIds.includes(u.id)} onChange={() => toggleUnit(u.id)} />
                  {u.name}
                </label>
              ))}
            </div>
          </div>
          <div className="form-actions">
            <button className="btn btn-icon btn-secondary" type="button" onClick={() => setShowAssignUnits(false)} title={t('common.cancel')} disabled={assigning}><X size={16} /></button>
            <button className="btn btn-icon btn-primary" type="submit" title={t('common.save')} disabled={assigning || selectedUnitIds.length === 0}>
              {assigning ? t('common.saving') : <Check size={16} />}
            </button>
          </div>
        </form>
      </Modal>

      <AttachmentsSection activityId={id} readOnly={!canComment} />
      <CommentsSection endpoint="activity-comments" filterKey="activity" filterValue={id} readOnly={!canComment} />
      <HistorySection modelo="Actividad" objectId={id} />
    </div>
  );
}
