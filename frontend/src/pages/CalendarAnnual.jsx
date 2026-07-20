import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { scheduleService, activityService } from '../services';
import Spinner from '../components/Spinner';
import Breadcrumbs from '../components/Breadcrumbs';
import { SkeletonTable } from '../components/Skeleton';
import useDocumentTitle from '../hooks/useDocumentTitle';
import useScrollShadow from '../hooks/useScrollShadow';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

export default function CalendarAnnual() {
  const { t } = useTranslation();
  useDocumentTitle(t('page.calendar_annual.title'));
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [activities, setActivities] = useState([]);
  const [filterActivity, setFilterActivity] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const { ref: scrollRef, scrolledLeft, scrolledRight } = useScrollShadow();

  useEffect(() => {
    setLoading(true);
    const params = { year };
    if (filterActivity) params.activity_id = filterActivity;
    if (filterStatus) params.status = filterStatus;
    Promise.all([
      scheduleService.annualCalendar(params),
      activityService.list({ page_size: 500 }),
    ]).then(([res, actRes]) => {
      setData(res.data);
      setActivities(actRes.data.results || actRes.data || []);
    }).catch(() => setData(null))
    .finally(() => setLoading(false));
  }, [year, filterActivity, filterStatus]);

  return (
    <div>
      <Breadcrumbs items={[{ to: '/', label: t('nav.dashboard') }, { label: t('page.calendar_annual.title') }]} />
      <div className="page-header">
        <h1>{t('page.calendar_annual.title')}</h1>
        <div className="toolbar">
          <button className="btn btn-icon btn-secondary btn-sm" onClick={() => setYear(y => y - 1)} title={year - 1}>
            <ChevronLeft size={14} />
          </button>
          <span style={{ fontWeight: 600, padding: '0 1rem', fontSize: '1.1rem' }}>{year}</span>
          <button className="btn btn-icon btn-secondary btn-sm" onClick={() => setYear(y => y + 1)} title={year + 1}>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="card card-bordered" style={{ marginBottom: '0.75rem' }}>
        <div className="filter-bar">
          <div className="form-group wide">
            <label>{t('page.schedule.activity')}</label>
            <select value={filterActivity} onChange={(e) => setFilterActivity(e.target.value)}>
              <option value="">{t('common.all')}</option>
              {activities.map(a => <option key={a.id} value={a.id}>{a.description}</option>)}
            </select>
          </div>
          <div className="form-group narrow">
            <label>{t('common.status')}</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">{t('common.all')}</option>
              <option value="PENDIENTE">{t('badge.pending')}</option>
              <option value="CUMPLIDO">{t('badge.cumplido')}</option>
              <option value="INCUMPLIDO">{t('badge.incumplido')}</option>
            </select>
          </div>
          <button className="btn btn-icon btn-secondary btn-sm" onClick={() => { setFilterActivity(''); setFilterStatus(''); }} title={t('action.clear')}>
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {loading ? <SkeletonTable rows={6} cols={3} /> : !data ? (
        <div className="empty-state">{t('page.calendar_annual.empty')}</div>
      ) : (
        <div>
          <div className={`table-scroll-shadow ${scrolledLeft ? 'scroll-left' : ''} ${scrolledRight ? 'scroll-right' : ''}`}>
            <div className="annual-months-nav" ref={scrollRef}>
              {t('page.calendar.months', { returnObjects: true }).map((m, i) => (
                <button key={i} className="btn btn-sm btn-ghost" onClick={() => document.getElementById(`month-${i + 1}`)?.scrollIntoView({ behavior: 'smooth' })}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          {Object.entries(data.categories || {}).map(([catName, months]) => (
            <div className="card" key={catName}>
              <div className="card-header" style={{ cursor: 'pointer' }} onClick={() => setExpandedCategory(expandedCategory === catName ? null : catName)}>
                <h3>{catName}</h3>
                <span style={{ color: 'var(--text-muted)' }}>{expandedCategory === catName ? '▲' : '▼'}</span>
              </div>
              {expandedCategory === catName && (
                <div>
                  {Object.entries(months).sort((a, b) => a[0] - b[0]).map(([m, items]) => (
                    <div key={m} id={`month-${m}`} className="annual-month">
                      <h3>{t('page.calendar.months')[parseInt(m) - 1]}</h3>
                      {items.map((item) => (
                        <div key={item.id} className="annual-item" style={{ background: item.color || '#3b82f6' }}
                          title={`${item.activity}\n${item.start_date} - ${item.end_date}\n${t('common.status')}: ${item.status || 'PENDIENTE'}`}>
                          <span>{item.activity}</span>
                          <span style={{ marginLeft: 'auto', fontSize: '0.7rem', opacity: 0.8 }}>{item.start_date} - {item.end_date}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
