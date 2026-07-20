import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { hasAnyRole, ROLES } from '../utils/roles';
import useDocumentTitle from '../hooks/useDocumentTitle';
import Breadcrumbs from '../components/Breadcrumbs';
import { SkeletonCard } from '../components/Skeleton';
import { Plus, CheckCircle, Calendar, MessageSquare } from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const icons = {
  activities: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  pending: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  units: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  users: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  compliance: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  calendar: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
};

function StatCard({ icon, label, value, accent }) {
  return (
    <div className={`stat-card stat-card-accent-${accent}`}>
      <div className="stat-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d={icon} />
        </svg>
      </div>
      <h3>{label}</h3>
      <div className="value">{value}</div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState({ activities: 0, users: 0, units: 0, pending: 0, cumplido: 0, incumplido: 0, pendiente: 0 });
  const [upcoming, setUpcoming] = useState([]);
  const [chartData, setChartData] = useState({ labels: [], datasets: [] });
  const [barData, setBarData] = useState({ labels: [], datasets: [] });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  useDocumentTitle(t('nav.dashboard'));

  useEffect(() => {
    const abortController = new AbortController();
    const { signal } = abortController;
    setLoading(true);

    const canViewAll = user?.is_staff || hasAnyRole(user, [ROLES.DIRECTOR]);
    const pendPromise = canViewAll
      ? api.get('/activity-org-units/', { signal }).catch(() => ({ data: { count: 0 } }))
      : Promise.resolve({ data: { count: 0 } });

    const today = new Date();
    const year = today.getFullYear();
    const desde = `${year}-01-01`;
    const hasta = `${year}-12-31`;

    Promise.all([
      api.get('/activities/', { signal }).catch(() => ({ data: { count: 0 } })),
      (canViewAll ? api.get('/users/?page_size=1', { signal }) : Promise.resolve({ data: { count: 0 } })),
      api.get('/organizational-units/', { signal }).catch(() => ({ data: { count: 0 } })),
      pendPromise,
      api.get('/schedule/periods/compliance_stats/', { signal, params: { desde, hasta } }).catch(() => ({ data: {} })),
      api.get('/schedule/periods/', { signal, params: { page_size: 5 } }).catch(() => ({ data: { results: [] } })),
    ]).then(([act, usr, uos, pend, comp, upcomingRes]) => {
      if (signal.aborted) return;
      const up = upcomingRes.data.results || upcomingRes.data || [];
      setUpcoming(up.slice(0, 7));

      const compData = comp.data || {};
      const cumplido = compData.cumplido || 0;
      const incumplido = compData.incumplido || 0;
      const pendiente = compData.pendiente || 0;

      setStats({
        activities: act.data.count || act.data.length || 0,
        users: usr.data.count || usr.data.length || 0,
        units: uos.data.count || uos.data.length || 0,
        pending: pend.data.count || pend.data.length || 0,
        cumplido, incumplido, pendiente,
      });

      setChartData({
        labels: [t('badge.cumplido'), t('badge.incumplido'), t('badge.pending')],
        datasets: [{
          data: [cumplido, incumplido, pendiente],
          backgroundColor: ['#10b981', '#ef4444', '#f59e0b'],
          borderWidth: 0,
        }],
      });

      const monthlyLabels = t('page.calendar.months', { returnObjects: true });
      const monthlyData = Array.isArray(monthlyLabels) ? monthlyLabels.map((_, idx) => {
        return compData[`month_${idx + 1}`] || 0;
      }) : [];
      setBarData({
        labels: monthlyLabels,
        datasets: [{
          label: t('page.dashboard.activities'),
          data: monthlyData.length ? monthlyData : (() => {
            const months = [];
            for (let m = 1; m <= 12; m++) {
              const monthKey = String(m).padStart(2, '0');
              months.push(compData[`month_${monthKey}`] || 0);
            }
            return months;
          })(),
          backgroundColor: 'var(--accent)',
          borderRadius: 4,
        }],
      });
    }).finally(() => { if (!signal.aborted) setLoading(false); });

    return () => abortController.abort();
  }, []);

  return (
    <div>
      <Breadcrumbs items={[{ label: t('nav.dashboard') }]} />
      <div className="page-header">
        <h1>{t('page.dashboard.title')}</h1>
      </div>
      <div className="card-grid">
        {loading ? (
          <>
            <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
          </>
        ) : (
          <>
            <StatCard icon={icons.activities} label={t('page.dashboard.activities')} value={stats.activities} accent="blue" />
            {(user?.is_staff || hasAnyRole(user, [ROLES.DIRECTOR])) && <StatCard icon={icons.pending} label={t('page.dashboard.pending_approval')} value={stats.pending} accent="orange" />}
            <StatCard icon={icons.compliance} label={t('page.dashboard.completed')} value={stats.cumplido} accent="green" />
            {(user?.is_staff || hasAnyRole(user, [ROLES.DIRECTOR])) && <StatCard icon={icons.units} label={t('page.dashboard.units')} value={stats.units} accent="cyan" />}
          </>
        )}
      </div>

      <div className="card-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="card">
          <div className="card-header"><h3>{t('page.dashboard.compliance_chart')}</h3></div>
          <div style={{ maxWidth: '280px', margin: '1rem auto' }}>
            <Doughnut data={chartData} options={{ cutout: '65%', plugins: { legend: { position: 'bottom' } } }} />
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h3>{t('page.dashboard.monthly_chart')}</h3></div>
          <Bar data={barData} options={{ responsive: true, plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }} />
        </div>
      </div>

      <div className="card-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="card">
          <div className="card-header"><h3>{t('page.dashboard.upcoming')}</h3></div>
          {upcoming.length === 0 ? <div className="empty-state">{t('page.dashboard.no_upcoming')}</div> : (
            <div className="table-container">
              <table>
                <thead><tr><th>{t('page.dashboard.activity')}</th><th>{t('page.dashboard.end_date')}</th><th>{t('page.dashboard.status')}</th></tr></thead>
                <tbody>
                  {upcoming.map(p => (
                    <tr key={p.id}>
                      <td>{p.activity_description || t('page.dashboard.without_desc')}</td>
                      <td>{p.end_date}</td>
                      <td><span className={`badge ${p.status === 'CUMPLIDO' ? 'badge-success' : p.status === 'INCUMPLIDO' ? 'badge-danger' : 'badge-neutral'}`}>{p.status || t('badge.pending')}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="card">
          <div className="card-header"><h3>{t('page.dashboard.quick_actions')}</h3></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {hasAnyRole(user, [ROLES.PLANNER, ROLES.DIRECTOR]) && (
              <button className="btn btn-primary" onClick={() => navigate('/activities/new')}>
                <Plus size={16} /> {t('page.dashboard.new_activity')}
              </button>
            )}
            {hasAnyRole(user, [ROLES.APPROVER, ROLES.DIRECTOR]) && (
              <button className="btn btn-secondary" onClick={() => navigate('/approvals')}>
                <CheckCircle size={16} /> {t('page.dashboard.view_approvals')}
              </button>
            )}
            <button className="btn btn-secondary" onClick={() => navigate('/calendar')}>
              <Calendar size={16} /> {t('page.dashboard.view_calendar')}
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/messages')}>
              <MessageSquare size={16} /> {t('page.dashboard.messages')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
