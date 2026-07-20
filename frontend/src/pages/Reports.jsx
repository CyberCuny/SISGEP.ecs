import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { Download, Eye, FileText, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { hasAnyRole, ROLES } from '../utils/roles';

export default function Reports() {
  const { t } = useTranslation();
  const { user } = useAuth();
  if (!user?.is_staff && !hasAnyRole(user, [ROLES.PLANNER, ROLES.APPROVER, ROLES.DIRECTOR])) {
    return <div className="page-header"><h1>{t('page.reports.title')}</h1><p style={{ padding: '1rem', color: 'var(--text-muted)' }}>{t('page.reports.no_access')}</p></div>;
  }
  const [users, setUsers] = useState([]);
  const [reportType, setReportType] = useState('individual');
  const [userId, setUserId] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [activeTab, setActiveTab] = useState('download');
  const [preview, setPreview] = useState(null);
  const toast = useToast();

  useEffect(() => {
    api.get('/users/').then(r => setUsers(r.data.results || r.data || []));
  }, []);

  const handleGenerate = async () => {
    try {
      let url = '';
      const params = {};
      if (reportType === 'individual') {
        url = '/schedule/reports/individual/';
        if (userId) params.user_id = userId;
      } else if (reportType === 'ics') {
        url = '/schedule/reports/export_ics/';
        if (desde) params.desde = desde;
        if (hasta) params.hasta = hasta;
      } else if (reportType === 'template') {
        url = '/schedule/reports/import_template/';
      } else if (reportType === 'compliance') {
        url = '/schedule/reports/compliance_pdf/';
        if (desde) params.desde = desde;
        if (hasta) params.hasta = hasta;
      } else if (reportType === 'by_uo') {
        url = '/schedule/reports/by_uo/';
      } else if (reportType === 'comparative') {
        url = '/schedule/reports/comparative/';
        params.year = year;
      }
      const res = await api.get(url, { params, responseType: 'blob' });
      const blob = new Blob([res.data]);
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      const ext = reportType === 'ics' ? 'ics' : reportType === 'compliance' ? 'pdf' : 'xlsx';
      link.download = `reporte.${ext}`;
      link.click();
      toast.success(t('toast.report_generated'));
    } catch { toast.error(t('toast.report_error')); }
  };

  const loadPreview = async () => {
    try {
      if (reportType === 'compliance') {
        const params = {};
        if (desde) params.desde = desde;
        if (hasta) params.hasta = hasta;
        const res = await api.get('/schedule/periods/compliance_stats/', { params });
        setPreview({ type: 'compliance', data: res.data });
      } else if (reportType === 'by_uo') {
        const res = await api.get('/schedule/periods/compliance_stats/', { params: { group_by: 'uo', year } });
        setPreview({ type: 'by_uo', data: res.data?.by_uo || [] });
      } else if (reportType === 'comparative') {
        const res = await api.get('/schedule/periods/compliance_stats/', { params: { group_by: 'month', year: year || new Date().getFullYear() } });
        setPreview({ type: 'comparative', data: res.data?.by_month || [] });
      } else {
        toast.info(t('toast.preview_unavailable'));
      }
    } catch { toast.error(t('toast.preview_error')); }
  };

  useEffect(() => { if (activeTab === 'preview') loadPreview(); }, [activeTab]);

  return (
    <div>
      <div className="page-header"><h1>{t('page.reports.title')}</h1></div>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <button className={`btn ${activeTab === 'download' ? 'btn-primary' : ''}`} onClick={() => setActiveTab('download')}><Download size={16} /> {t('page.reports.download')}</button>
        <button className={`btn ${activeTab === 'preview' ? 'btn-primary' : ''}`} onClick={() => setActiveTab('preview')}><Eye size={16} /> {t('page.reports.preview')}</button>
      </div>
      {activeTab === 'download' && (
        <div className="card">
          <div className="form-group">
            <label>{t('page.reports.report_type')}</label>
            <select value={reportType} onChange={(e) => setReportType(e.target.value)}>
              <option value="individual">{t('page.reports.individual')}</option>
              <option value="ics">{t('page.reports.ics')}</option>
              <option value="template">{t('page.reports.template')}</option>
              <option value="compliance">{t('page.reports.compliance')}</option>
              <option value="by_uo">{t('page.reports.by_uo')}</option>
              <option value="comparative">{t('page.reports.comparative')}</option>
            </select>
          </div>
          {reportType === 'individual' && (
            <div className="form-group">
              <label>{t('page.reports.user')}</label>
              <select value={userId} onChange={(e) => setUserId(e.target.value)}>
                <option value="">{t('common.all')}</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.display_name || u.username}</option>)}
              </select>
            </div>
          )}
          {reportType === 'comparative' && (
            <div className="form-group">
              <label>{t('page.reports.year')}</label>
              <input type="number" value={year} onChange={(e) => setYear(e.target.value)} min={2020} max={2030} />
            </div>
          )}
          {(reportType === 'ics' || reportType === 'compliance') && (
            <div className="form-row">
              <div className="form-group"><label>{t('page.reports.from')}</label><input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} /></div>
              <div className="form-group"><label>{t('page.reports.to')}</label><input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} /></div>
            </div>
          )}
          <div className="form-actions">
            <button className="btn btn-primary" onClick={handleGenerate}><FileText size={16} /> {t('page.reports.generate')}</button>
          </div>
        </div>
      )}
      {activeTab === 'preview' && (
        <div className="card">
          <div className="form-group">
            <label>{t('page.reports.type')}</label>
            <select value={reportType} onChange={(e) => setReportType(e.target.value)}>
              <option value="compliance">{t('page.reports.compliance')}</option>
              <option value="by_uo">{t('page.reports.by_uo')}</option>
              <option value="comparative">{t('page.reports.comparative')}</option>
            </select>
          </div>
          {(reportType === 'comparative') && (
            <div className="form-group"><label>{t('page.reports.year')}</label><input type="number" value={year} onChange={(e) => setYear(e.target.value)} min={2020} max={2030} /></div>
          )}
          {reportType === 'compliance' && (
            <div className="form-row">
              <div className="form-group"><label>{t('page.reports.from')}</label><input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} /></div>
              <div className="form-group"><label>{t('page.reports.to')}</label><input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} /></div>
            </div>
          )}
          <div className="form-actions">
            <button className="btn btn-primary" onClick={loadPreview}><RefreshCw size={16} /> {t('page.reports.refresh')}</button>
          </div>
          {preview?.type === 'compliance' && (
            <div className="dashboard-cards" style={{ marginTop: '1rem' }}>
              <div className="stat-card stat-card-accent-blue"><div className="stat-value">{preview.data.total || 0}</div><div className="stat-label">{t('page.reports.total')}</div></div>
              <div className="stat-card stat-card-accent-green"><div className="stat-value">{preview.data.cumplidas || 0}</div><div className="stat-label">{t('page.reports.cumplidas')}</div></div>
              <div className="stat-card stat-card-accent-orange"><div className="stat-value">{preview.data.incumplidas || 0}</div><div className="stat-label">{t('page.reports.incumplidas')}</div></div>
              <div className="stat-card stat-card-accent-purple"><div className="stat-value">{preview.data.pendientes || 0}</div><div className="stat-label">{t('page.reports.pendientes')}</div></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
