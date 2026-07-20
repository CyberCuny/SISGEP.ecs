import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import Spinner from '../components/Spinner';
import Breadcrumbs from '../components/Breadcrumbs';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { hasAnyRole, ROLES } from '../utils/roles';
import useDocumentTitle from '../hooks/useDocumentTitle';
import Modal from '../components/Modal';
import { Search, Eye, X, AlertTriangle, FileText } from 'lucide-react';

export default function Compliance() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const canRegisterIncident = user?.is_staff || hasAnyRole(user, [ROLES.PLANNER, ROLES.DIRECTOR, ROLES.EXECUTOR]);
  useDocumentTitle(t('page.compliance.title'));
  const today = new Date();
  const [desde, setDesde] = useState(`${today.getFullYear()}-01-01`);
  const [hasta, setHasta] = useState(`${today.getFullYear()}-12-31`);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showIncumplimiento, setShowIncumplimiento] = useState(false);
  const [incPeriod, setIncPeriod] = useState(null);
  const [incDesc, setIncDesc] = useState('');
  const toast = useToast();

  const fetchStats = () => {
    setLoading(true);
    api.get('/schedule/periods/compliance_stats/', { params: { desde, hasta } })
      .then((res) => setStats(res.data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchStats(); }, []);

  return (
    <div>
      <Breadcrumbs items={[{ to: '/', label: t('nav.dashboard') }, { label: t('nav.compliance') }]} />
      <div className="page-header">
        <h1>{t('page.compliance.title')}</h1>
        <button className="btn btn-icon btn-secondary btn-sm" onClick={() => setShowDetail(!showDetail)} title={showDetail ? t('page.compliance.view_summary') : t('page.compliance.view_detail')}>
          <Eye size={14} />
        </button>
      </div>

      <div className="card">
        <div className="toolbar">
          <label style={{ fontSize: '0.85rem' }}>{t('page.compliance.from')}</label>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} style={{ width: '140px' }} />
          <label style={{ fontSize: '0.85rem' }}>{t('page.compliance.to')}</label>
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} style={{ width: '140px' }} />
          <button className="btn btn-icon btn-primary btn-sm" onClick={fetchStats} title={t('page.compliance.query')}>
            <Search size={14} />
          </button>
        </div>
      </div>

      {loading ? <Spinner /> : !stats ? (
        <div className="empty-state">{t('page.compliance.empty')}</div>
      ) : showDetail ? (
        <div className="card">
          <div className="card-header"><h3>{t('page.compliance.detail_title')}</h3></div>
          <Modal open={showIncumplimiento} onClose={() => setShowIncumplimiento(false)} width="450px">
            <h2>{t('page.compliance.register_incident_title')}</h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                await api.post('/unfulfilled-activities/', {
                  activity: incPeriod?.activity_id, schedule_period: incPeriod?.id, description: incDesc
                });
                toast.success(t('toast.incident_registered'));
                setShowIncumplimiento(false);
                setIncDesc('');
              } catch { toast.error(t('toast.incident_register_error')); }
            }}>
              <div className="form-group">
                <label>{t('page.compliance.activity')}</label>
                <input value={incPeriod?.activity || ''} disabled style={{ opacity: 0.6 }} />
              </div>
              <div className="form-group">
                <label>{t('page.compliance.period')}</label>
                <input value={`${incPeriod?.start_date || ''} - ${incPeriod?.end_date || ''}`} disabled style={{ opacity: 0.6 }} />
              </div>
              <div className="form-group">
                <label>{t('page.compliance.description')}</label>
                <textarea value={incDesc} onChange={(e) => setIncDesc(e.target.value)} rows={4} required placeholder={t('form.description_incident_placeholder')} />
              </div>
              <div className="form-actions">
                <button className="btn btn-icon btn-secondary" type="button" onClick={() => setShowIncumplimiento(false)} title={t('page.compliance.cancel')}><X size={16} /></button>
                <button className="btn btn-icon btn-danger" type="submit" title={t('page.compliance.register')}><AlertTriangle size={16} /></button>
              </div>
            </form>
          </Modal>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>{t('page.compliance.table.activity')}</th><th>{t('page.compliance.table.plan_type')}</th><th>{t('page.compliance.table.date')}</th>
                  <th>{t('page.compliance.table.status')}</th><th>{t('page.compliance.table.observation')}</th><th>{t('page.compliance.table.incidence')}</th><th>{t('page.compliance.table.extraplan')}</th><th>{t('page.compliance.table.modified')}</th><th>{t('page.compliance.table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {(stats.detalle || []).map((d) => (
                  <tr key={d.id}>
                    <td>{d.activity || '-'}</td>
                    <td><span className={`badge ${d.plan_type === 'Extraplan' ? 'badge-warning' : 'badge-info'}`}>{d.plan_type}</span></td>
                    <td>{d.start_date}</td>
                    <td>
                      <span className={`badge ${d.status === 'CUMPLIDO' ? 'badge-success' : d.status === 'INCUMPLIDO' ? 'badge-danger' : 'badge-neutral'}`}>
                        {d.status}
                      </span>
                    </td>
                    <td>{d.observation || '-'}</td>
                    <td>{d.has_incidence ? <span className="badge badge-danger">{t('badge.yes')}</span> : t('badge.no')}</td>
                    <td>{d.is_extraplan ? <span className="badge badge-warning">{t('badge.yes')}</span> : t('badge.no')}</td>
                    <td>{d.is_modified ? <span className="badge badge-info">{t('badge.yes')}</span> : t('badge.no')}</td>
                    <td>
                      {d.status === 'INCUMPLIDO' && canRegisterIncident && (
                        <button className="btn btn-icon btn-sm btn-danger" onClick={() => { setIncPeriod(d); setShowIncumplimiento(true); }} title={t('action.register_incident')}>
                          <AlertTriangle size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card-grid">
          <div className="stat-card stat-card-accent-green">
            <h3>{t('page.compliance.cumplidas')}</h3>
            <div className="value">{stats.cumplidas}</div>
            <div className="trend">{stats.pct_cumplidas}% del total</div>
          </div>
          <div className="stat-card stat-card-accent-orange">
            <h3>{t('page.compliance.extraplan')}</h3>
            <div className="value">{stats.extraplan}</div>
            <div className="trend">{stats.pct_extraplan}% de cumplidas</div>
          </div>
          <div className="stat-card stat-card-accent-purple">
            <h3>{t('page.compliance.modificadas')}</h3>
            <div className="value">{stats.modificadas}</div>
          </div>
          <div className="stat-card stat-card-accent-blue">
            <h3>{t('page.compliance.pendientes')}</h3>
            <div className="value">{stats.pendientes}</div>
            <div className="trend">{stats.pct_pendientes}% del total</div>
          </div>
          <div className="stat-card stat-card-accent-cyan">
            <h3>{t('page.compliance.total')}</h3>
            <div className="value">{stats.total}</div>
          </div>
          <div className="stat-card stat-card-accent-orange">
            <h3>{t('page.compliance.incumplidas')}</h3>
            <div className="value">{stats.incumplidas}</div>
            <div className="trend">{stats.pct_incumplidas}% del total</div>
          </div>
        </div>
      )}
    </div>
  );
}
