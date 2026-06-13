import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { scheduleService } from '../services';
import Spinner from '../components/Spinner';
import Breadcrumbs from '../components/Breadcrumbs';
import { SkeletonTable } from '../components/Skeleton';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function CalendarIndividual() {
  const { t } = useTranslation();
  useDocumentTitle(t('page.calendar_individual.title'));
  const { user } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    scheduleService.individualCalendar({ year, month, user_id: user?.id })
      .then((res) => setPeriods(res.data || []))
      .catch(() => setPeriods([]))
      .finally(() => setLoading(false));
  }, [year, month, user]);

  const byDate = {};
  periods.forEach((p) => {
    const key = p.start_date;
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(p);
  });

  return (
    <div>
      <Breadcrumbs items={[{ to: '/', label: t('nav.dashboard') }, { to: '/calendar', label: t('nav.calendar') }, { label: t('page.calendar_individual.title') }]} />
      <div className="page-header">
        <h1>{t('page.calendar_individual.title')}</h1>
      </div>
      <div className="card">
        <div className="calendar-nav">
          <button className="btn btn-icon btn-secondary btn-sm" onClick={() => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); }} title={t('page.calendar.prev')}>
            <ChevronLeft size={14} />
          </button>
          <h2>{t('page.calendar.months')[month - 1]} {year}</h2>
          <button className="btn btn-icon btn-secondary btn-sm" onClick={() => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); }} title={t('page.calendar.next')}>
            <ChevronRight size={14} />
          </button>
        </div>

        {loading ? <SkeletonTable rows={6} cols={2} /> : Object.keys(byDate).length === 0 ? (
          <div className="empty-state">{t('page.calendar_individual.empty')}</div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>{t('page.calendar_individual.table.date')}</th><th>{t('page.calendar_individual.table.activity')}</th><th>{t('page.calendar_individual.table.time')}</th><th>{t('page.calendar_individual.table.status')}</th><th>{t('page.calendar_individual.table.observation')}</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(byDate).sort().map(([date, items]) =>
                  items.map((p, idx) => (
                    <tr key={`${date}-${idx}`}>
                      {idx === 0 && <td rowSpan={items.length} style={{ fontWeight: 600 }}>{date}</td>}
                      <td>{p.activity_description || '-'}</td>
                      <td>{p.start_time} - {p.end_time}</td>
                      <td><span className={`badge ${p.status === 'CUMPLIDO' ? 'badge-success' : p.status === 'INCUMPLIDO' ? 'badge-danger' : 'badge-neutral'}`}>{t(p.status === 'CUMPLIDO' ? 'badge.cumplido' : p.status === 'INCUMPLIDO' ? 'badge.incumplido' : 'badge.pending')}</span></td>
                      <td>{p.observation || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
