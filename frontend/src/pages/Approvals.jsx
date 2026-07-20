import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, Check, X, RefreshCw } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import Spinner from '../components/Spinner';
import ConfirmDialog from '../components/ConfirmDialog';
import { useAuth } from '../context/AuthContext';
import { hasAnyRole, ROLES } from '../utils/roles';

export default function Approvals() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const canApprove = user?.is_staff || hasAnyRole(user, [ROLES.APPROVER, ROLES.DIRECTOR]);
  const [pendingActs, setPendingActs] = useState([]);
  const [pendingCronos, setPendingCronos] = useState([]);
  const [tab, setTab] = useState('activities');
  const [loading, setLoading] = useState(false);
  const [confirmAll, setConfirmAll] = useState(false);
  const toast = useToast();

  const fetchPending = () => {
    setLoading(true);
    Promise.all([
      api.get('/activities/pending_approval/').catch(() => ({ data: [] })),
      api.get('/schedule/periods/pending_cronograms_approval/').catch(() => ({ data: [] })),
    ]).then(([actRes, cronRes]) => {
      setPendingActs(actRes.data || []);
      setPendingCronos(cronRes.data || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchPending(); }, []);

  const handleApprove = async (id) => {
    try {
      await api.post('/activities/approve/', { ids: [id] });
      toast.success(t('toast.approved'));
      fetchPending();
    } catch { toast.error(t('toast.approve_error')); }
  };

  const handleReject = async (id) => {
    try {
      await api.post('/activities/reject/', { ids: [id] });
      toast.success(t('toast.rejected'));
      fetchPending();
    } catch { toast.error(t('toast.reject_error')); }
  };

  const handleApproveCron = async (id) => {
    try {
      await api.post('/schedule/periods/approve_cronogram_org_unit/', { ids: [id] });
      toast.success(t('toast.cronogram_approved'));
      fetchPending();
    } catch { toast.error(t('toast.approve_error')); }
  };

  const handleRejectCron = async (id) => {
    try {
      await api.post('/schedule/periods/reject_cronogram_org_unit/', { ids: [id] });
      toast.success(t('toast.cronogram_rejected'));
      fetchPending();
    } catch { toast.error(t('toast.reject_error')); }
  };

  const handleReSend = async (id, type) => {
    try {
      const ep = type === 'activity' ? '/activity-org-units' : '/schedule/org-units';
      await api.post(`${ep}/${id}/re_send/`);
      toast.success(t('toast.resend_success'));
      fetchPending();
    } catch { toast.error(t('toast.resend_error')); }
  };

  const handleApproveAll = async () => {
    const ids = pendingActs.map((a) => a.id);
    if (ids.length === 0) return;
    try {
      await api.post('/activities/approve/', { ids });
      toast.success(t('toast.approved'));
      setConfirmAll(false);
      fetchPending();
    } catch { toast.error(t('toast.approve_error')); }
  };

  if (!canApprove) {
    return <div className="page-header"><h1>{t('page.approvals.title')}</h1><p style={{ padding: '1rem', color: 'var(--text-muted)' }}>{t('page.approvals.no_access')}</p></div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>{t('page.approvals.title')}</h1>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'activities' ? 'active' : ''}`} onClick={() => setTab('activities')}>
          {t('page.approvals.tab_activities')} ({pendingActs.length})
        </button>
        <button className={`tab ${tab === 'cronograms' ? 'active' : ''}`} onClick={() => setTab('cronograms')}>
          {t('page.approvals.tab_cronograms')} ({pendingCronos.length})
        </button>
      </div>

      {tab === 'activities' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
            {pendingActs.length > 0 && (
              <button className="btn btn-success btn-sm" onClick={() => setConfirmAll(true)}>
                <CheckCircle size={14} /> {t('page.approvals.approve_all')} ({pendingActs.length})
              </button>
            )}
          </div>
          {loading ? <Spinner /> : pendingActs.length === 0 ? (
            <div className="empty-state">{t('page.approvals.empty_activities')}</div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>{t('page.approvals.table.activity')}</th><th>{t('page.approvals.table.ou')}</th><th>{t('page.approvals.table.status')}</th><th>{t('page.approvals.table.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingActs.map((a) => (
                    <tr key={a.id}>
                      <td>{a.activity_description || '-'}</td>
                      <td>{a.organizational_unit_name || '-'}</td>
                      <td>
                        <span className={`badge ${a.status === 'Re-Enviado' ? 'badge-warning' : 'badge-info'}`}>
                          {a.status || t('badge.pending')}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-icon btn-success btn-sm" onClick={() => handleApprove(a.id)} title={t('action.approve')}><Check size={14} /></button>
                        <button className="btn btn-icon btn-danger btn-sm" onClick={() => handleReject(a.id)} title={t('action.reject')}><X size={14} /></button>
                        {a.status && a.status !== 'Aprobado' && (
                          <button className="btn btn-icon btn-secondary btn-sm" onClick={() => handleReSend(a.id, 'activity')} title={t('action.resend')}><RefreshCw size={14} /></button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'cronograms' && (
        <div className="card">
          {loading ? <Spinner /> : pendingCronos.length === 0 ? (
            <div className="empty-state">{t('page.approvals.empty_cronograms')}</div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>{t('page.approvals.table.activity')}</th><th>{t('page.approvals.table.ou')}</th><th>{t('page.approvals.table.period')}</th><th>{t('page.approvals.table.status')}</th><th>{t('page.approvals.table.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingCronos.map((c) => (
                    <tr key={c.id}>
                      <td>{c.activity_description || '-'}</td>
                      <td>{c.organizational_unit_name || '-'}</td>
                      <td>{c.start_date} - {c.end_date}</td>
                      <td>
                        <span className={`badge ${c.status === 'Re-Enviado' ? 'badge-warning' : 'badge-info'}`}>
                          {c.status || t('badge.pending')}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-icon btn-success btn-sm" onClick={() => handleApproveCron(c.id)} title={t('action.approve')}><Check size={14} /></button>
                        <button className="btn btn-icon btn-danger btn-sm" onClick={() => handleRejectCron(c.id)} title={t('action.reject')}><X size={14} /></button>
                        {c.status && c.status !== 'Aprobado' && (
                          <button className="btn btn-icon btn-secondary btn-sm" onClick={() => handleReSend(c.id, 'cronogram')} title={t('action.resend')}><RefreshCw size={14} /></button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmAll}
        title={t('page.approvals.approve_all_title')}
        message={t('confirm.approve_all', { count: pendingActs.length })}
        onConfirm={handleApproveAll}
        onCancel={() => setConfirmAll(false)}
      />
    </div>
  );
}
