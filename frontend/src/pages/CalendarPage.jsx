import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Download, X, Check, ChevronLeft, ChevronRight, Trash2, RotateCcw } from 'lucide-react';
import Modal from '../components/Modal';
import api from '../services/api';
import { scheduleService, activityService, reportService } from '../services';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { useAuth } from '../context/AuthContext';
import CommentsSection from '../components/CommentsSection';
import HistorySection from '../components/HistorySection';
import ConfirmDialog from '../components/ConfirmDialog';
import { hasAnyRole, ROLES } from '../utils/roles';
import Spinner from '../components/Spinner';
import { SkeletonFilters, SkeletonText, SkeletonCard } from '../components/Skeleton';
import Breadcrumbs from '../components/Breadcrumbs';
import useKeyboardShortcut from '../hooks/useKeyboardShortcut';
import useAutoResize from '../hooks/useAutoResize';
import useDocumentTitle from '../hooks/useDocumentTitle';

const VIEWS = ['month', 'week', 'day'];
const TODAY_STR = new Date().toISOString().split('T')[0];

function isPastEvent(ev) {
  return ev.end_date < TODAY_STR;
}

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
function minutesToTime(m) {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}
const HOUR_HEIGHT = 60;
const CONTAINER_HEIGHT = 24 * HOUR_HEIGHT;

export default function CalendarPage() {
  const { t } = useTranslation();
  useDocumentTitle(t('page.calendar.title'));
  const { user } = useAuth();
  const canManage = user?.is_staff || hasAnyRole(user, [ROLES.PLANNER, ROLES.DIRECTOR]);
  const canComment = user?.is_staff || hasAnyRole(user, [ROLES.PLANNER, ROLES.APPROVER, ROLES.DIRECTOR, ROLES.EXECUTOR]);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [viewDate, setViewDate] = useState(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
  const [viewMode, setViewMode] = useState('month');
  const [events, setEvents] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dropTarget, setDropTarget] = useState(null);
  const draggedRef = useRef(null);
  const resizingRef = useRef(null);
  const [resizingId, setResizingId] = useState(null);
  const toast = useToast();
  const [filterActivity, setFilterActivity] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterOrgUnit, setFilterOrgUnit] = useState('');
  const [filterUserId, setFilterUserId] = useState('');
  const [orgUnits, setOrgUnits] = useState([]);
  const [users, setUsers] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ activity: '', start_date: '', end_date: '', start_time: '', end_time: '', description: '', observation: '', status: '', is_extraplan: false, has_incidence: false, color: '#3b82f6' });
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showNewActivity, setShowNewActivity] = useState(false);
  const [newActivityDesc, setNewActivityDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const confirmDlg = useConfirm();
  const obsRef = useAutoResize(form.observation);
  const formSnapshot = useRef(null);
  const isDirty = useCallback(() => {
    if (!formSnapshot.current) return false;
    return Object.keys(formSnapshot.current).some(k => form[k] !== formSnapshot.current[k]);
  }, [form]);

  const buildParams = useCallback(() => {
    const params = { year, month };
    if (filterActivity) params.activity_id = filterActivity;
    if (filterStatus) params.status = filterStatus;
    if (filterOrgUnit) params.org_unit_id = filterOrgUnit;
    if (filterUserId) params.user_id = filterUserId;
    return params;
  }, [year, month, filterActivity, filterStatus, filterOrgUnit, filterUserId]);

  const loadEvents = useCallback(() => {
    setLoading(true);
    return scheduleService.calendar(buildParams())
      .then((res) => setEvents(res.data || []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [buildParams]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      scheduleService.calendar(buildParams()),
      activityService.list({ page_size: 500 }),
      api.get('/organizational-units/?page_size=200'),
      api.get('/users/?page_size=500'),
    ]).then(([evRes, actRes, uoRes, usrRes]) => {
      setEvents(evRes.data || []);
      setActivities(actRes.data.results || actRes.data || []);
      setOrgUnits(uoRes.data.results || uoRes.data || []);
      setUsers(usrRes.data.results || usrRes.data || []);
    }).catch(() => console.warn('Failed to load calendar data'))
    .finally(() => setLoading(false));
  }, [year, month]);

  useEffect(() => {
    if (filterActivity || filterStatus || filterOrgUnit || filterUserId) {
      loadEvents();
    }
  }, [filterActivity, filterStatus, filterOrgUnit, filterUserId]);

  const navigate = (dir) => {
    const d = new Date(viewDate);
    if (viewMode === 'month') {
      d.setMonth(d.getMonth() + dir);
      setYear(d.getFullYear());
      setMonth(d.getMonth() + 1);
    } else if (viewMode === 'week') {
      d.setDate(d.getDate() + dir * 7);
    } else {
      d.setDate(d.getDate() + dir);
    }
    setViewDate(d);
    if (viewMode !== 'month') {
      setYear(d.getFullYear());
      setMonth(d.getMonth() + 1);
    }
  };

  const goToToday = () => {
    const t = new Date();
    setViewDate(t);
    setYear(t.getFullYear());
    setMonth(t.getMonth() + 1);
  };

  useKeyboardShortcut('n', () => { if (!modalOpen) openCreate(toDateStr(viewDate)); }, { ctrl: true });
  useKeyboardShortcut('Escape', () => { if (modalOpen) closeModal(); });
  useKeyboardShortcut('Escape', () => { if (confirmDelete) setConfirmDelete(null); });

  const switchView = (mode) => {
    setViewMode(mode);
    const d = new Date(viewDate);
    if (mode !== 'month') {
      setYear(d.getFullYear());
      setMonth(d.getMonth() + 1);
    }
  };

  const openCreate = (dateStr) => {
    setEditingId(null);
    const defaults = { activity: '', start_date: dateStr || toDateStr(new Date()), end_date: dateStr || toDateStr(new Date()), start_time: '08:00', end_time: '17:00', description: '', observation: '', status: 'PENDIENTE', is_extraplan: false, has_incidence: false, color: '#3b82f6' };
    setForm(defaults);
    formSnapshot.current = { ...defaults };
    setModalOpen(true);
  };

  const openEdit = (ev) => {
    setEditingId(ev.id);
    const vals = {
      activity: ev.activity_id || '',
      start_date: ev.start_date || '',
      end_date: ev.end_date || '',
      start_time: ev.start_time || '',
      end_time: ev.end_time || '',
      description: ev.description || '',
      observation: ev.observation || '',
      status: ev.status || '',
      is_extraplan: ev.is_extraplan || false,
      has_incidence: ev.has_incidence || false,
      color: ev.color || '#3b82f6',
    };
    setForm(vals);
    formSnapshot.current = { ...vals };
    setModalOpen(true);
  };

  const closeModal = async (force) => {
    if (!force && isDirty() && !(await confirmDlg(t('form.confirm_unsaved')))) return;
    setModalOpen(false);
    setEditingId(null);
    setFormErrors({});
    formSnapshot.current = null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});
    setSaving(true);
    try {
      if (editingId) {
        if (canManage) {
          await scheduleService.update(editingId, form);
        } else {
          await scheduleService.updateStatus(editingId, { status: form.status, observation: form.observation });
        }
        toast.success(t('toast.calendar_event_updated'));
      } else {
        await scheduleService.create(form);
        toast.success(t('toast.schedule_period_created'));
      }
      formSnapshot.current = null;
      await closeModal(true);
      await loadEvents();
    } catch (err) {
      if (err.response?.data) {
        setFormErrors(err.response.data);
        const first = Object.values(err.response.data).flat().find(Boolean);
        if (first) toast.error(first);
      } else {
        toast.error(editingId ? t('toast.calendar_event_update_error') : t('toast.save_error'));
      }
    }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await scheduleService.delete(confirmDelete);
      toast.success(t('toast.schedule_period_deleted'));
      loadEvents();
    } catch { toast.error(t('toast.delete_error')); }
    finally { setConfirmDelete(null); }
  };

  const handleCreateActivity = async () => {
    if (!newActivityDesc.trim()) return;
    try {
      const res = await activityService.create({ description: newActivityDesc.trim(), is_general: false });
      const newAct = res.data;
      setActivities(prev => [...prev, newAct]);
      setForm(prev => ({ ...prev, activity: newAct.id }));
      setNewActivityDesc('');
      setShowNewActivity(false);
      toast.success('Actividad personal creada');
    } catch { toast.error('Error al crear actividad'); }
  };

  const handleDragStart = (ev, e) => {
    draggedRef.current = { id: ev.id, start: ev.start_date, end: ev.end_date };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(ev.id));
  };

  const handleDragOver = (e, d) => {
    e.preventDefault();
    if (draggedRef.current && d) setDropTarget(d);
  };

  const handleDragLeave = () => setDropTarget(null);

  const handleDrop = async (day) => {
    if (!canManage) return;
    setDropTarget(null);
    const dragData = draggedRef.current;
    if (!dragData) return;
    const newDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const duration = (new Date(dragData.end) - new Date(dragData.start)) / (1000 * 60 * 60 * 24);
    const newEnd = new Date(newDate);
    newEnd.setDate(newEnd.getDate() + Math.max(0, Math.round(duration)));
    const endStr = `${newEnd.getFullYear()}-${String(newEnd.getMonth() + 1).padStart(2, '0')}-${String(newEnd.getDate()).padStart(2, '0')}`;
    try {
      await scheduleService.dragDrop(dragData.id, { start_date: newDate, end_date: endStr });
      toast.success(t('toast.event_rescheduled'));
      loadEvents();
    } catch (err) {
      const msg = err.response?.data?.error || err.message || t('toast.event_reschedule_error');
      toast.error(msg);
    } finally { draggedRef.current = null; }
  };

  const handleResizeStart = (ev, e) => {
    if (!canManage) return;
    e.preventDefault();
    e.stopPropagation();
    const container = e.currentTarget.closest('.day-events-container');
    const containerRect = container.getBoundingClientRect();
    resizingRef.current = {
      id: ev.id,
      startY: e.clientY,
      origEndMinutes: timeToMinutes(ev.end_time),
      startMinutes: timeToMinutes(ev.start_time),
      containerTop: containerRect.top,
      containerHeight: containerRect.height,
      currentEndMinutes: timeToMinutes(ev.end_time),
    };
    setResizingId(ev.id);
    const onMove = (me) => {
      if (!resizingRef.current) return;
      const deltaY = me.clientY - resizingRef.current.startY;
      const deltaMin = (deltaY / resizingRef.current.containerHeight) * (24 * 60);
      let newEnd = resizingRef.current.origEndMinutes + deltaMin;
      newEnd = Math.round(newEnd / 30) * 30;
      newEnd = Math.max(resizingRef.current.startMinutes + 30, Math.min(newEnd, 24 * 60));
      resizingRef.current.currentEndMinutes = newEnd;
      document.getElementById(`resize-guide-${resizingRef.current.id}`)?.style.setProperty('top', `${(newEnd / (24 * 60)) * 100}%`);
    };
    const onUp = async () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      if (!resizingRef.current) return;
      const newEndTime = minutesToTime(Math.max(resizingRef.current.startMinutes + 30, Math.min(resizingRef.current.currentEndMinutes, 24 * 60)));
      const id = resizingRef.current.id;
      resizingRef.current = null;
      setResizingId(null);
      try {
        await scheduleService.update(id, { end_time: newEndTime });
        toast.success(t('toast.calendar_event_updated'));
        loadEvents();
      } catch { toast.error(t('toast.calendar_event_update_error')); }
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const getEventsForDay = (day) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter((e) => e.start_date <= dateStr && e.end_date >= dateStr);
  };

  const getEventsForDateObj = (d) => {
    const dateStr = toDateStr(d);
    return events.filter((e) => e.start_date <= dateStr && e.end_date >= dateStr);
  };

  const isToday = (d) => {
    const t = new Date();
    return d === t.getDate() && month === t.getMonth() + 1 && year === t.getFullYear();
  };

  const isTodayDate = (d) => {
    const t = new Date();
    return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
  };

  const exportIcs = () => {
    const first = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const last = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    reportService.exportIcs({ desde: first, hasta: last })
      .then((res) => {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const a = document.createElement('a');
        a.href = url;
        a.download = `calendar-${year}-${month}.ics`;
        a.click();
        window.URL.revokeObjectURL(url);
      })
      .catch(() => toast.error('Error al descargar el archivo'));
  };

  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;

  const calendarDays = [];
  for (let i = 0; i < startOffset; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

  const getWeekDays = () => {
    const d = new Date(viewDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(d);
      dayDate.setDate(d.getDate() + i);
      days.push(dayDate);
    }
    return days;
  };

  const weekDays = getWeekDays();
  const weekLabel = `${t('page.calendar.months')[weekDays[0].getMonth()]} ${weekDays[0].getDate()} - ${t('page.calendar.months')[weekDays[6].getMonth()]} ${weekDays[6].getDate()}, ${weekDays[0].getFullYear()}`;

  return (
    <div>
      <Breadcrumbs items={[
        { to: '/', label: t('nav.dashboard') },
        { label: t('page.calendar.title') },
      ]} />
      <div className="page-header">
        <h1>{t('page.calendar.title')}</h1>
        <div className="toolbar">
          <div className="btn-group" style={{ marginRight: '0.5rem' }}>
            {VIEWS.map(v => (
              <button key={v} className={`btn btn-sm ${viewMode === v ? 'btn-primary' : 'btn-secondary'}`} onClick={() => switchView(v)}>
                {v === 'month' ? 'Mes' : v === 'week' ? 'Semana' : 'Día'}
              </button>
            ))}
          </div>
          <button className="btn btn-icon btn-secondary btn-sm" onClick={exportIcs} title="Exportar ICS">
            <Download size={16} />
          </button>
          {canManage && <button className="btn btn-icon btn-primary btn-sm" onClick={() => openCreate(toDateStr(new Date()))} title={t('common.create')}>
            <Plus size={16} />
          </button>}
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
          <div className="form-group">
            <label>{t('form.organizational_unit')}</label>
            <select value={filterOrgUnit} onChange={(e) => setFilterOrgUnit(e.target.value)}>
              <option value="">{t('common.all')}</option>
              {orgUnits.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>{t('common.username')}</label>
            <select value={filterUserId} onChange={(e) => setFilterUserId(e.target.value)}>
              <option value="">{t('common.all')}</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.display_name || u.username}</option>)}
            </select>
          </div>
          <button className="btn btn-icon btn-secondary btn-sm" onClick={() => { setFilterActivity(''); setFilterStatus(''); setFilterOrgUnit(''); setFilterUserId(''); }} title={t('action.clear')}>
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      <div className="card">
        <div className="calendar-nav">
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-icon btn-secondary btn-sm" onClick={() => navigate(-1)} title={t('page.calendar.prev')}>
              <ChevronLeft size={14} />
            </button>
            <button className="btn btn-secondary btn-sm" onClick={goToToday}>Hoy</button>
            <button className="btn btn-icon btn-secondary btn-sm" onClick={() => navigate(1)} title={t('page.calendar.next')}>
              <ChevronRight size={14} />
            </button>
          </div>
          {viewMode === 'month' && <h2>{t('page.calendar.months')[month - 1]} {year}</h2>}
          {viewMode === 'week' && <h2>{weekLabel}</h2>}
          {viewMode === 'day' && <h2>{t('page.calendar.months')[viewDate.getMonth()]} {viewDate.getDate()}, {viewDate.getFullYear()}</h2>}
        </div>

        {loading ? (
          <>
            <SkeletonFilters />
            <SkeletonCard height="500px" />
          </>
        ) : (
          <>
            {viewMode === 'month' && (
              <div className="calendar-grid">
                {t('page.calendar.days').map((d) => (
                  <div key={d} className="calendar-header">{d}</div>
                ))}
                {calendarDays.map((d, i) => (
                  <div key={i}
                    className={`calendar-day ${d === null ? 'other-month' : ''} ${d && isToday(d) ? 'today' : ''} ${dropTarget === d ? 'drop-target' : ''}`}
                    onDragOver={d && canManage ? (e) => handleDragOver(e, d) : undefined}
                    onDragLeave={d && canManage ? () => handleDragLeave() : undefined}
                    onDrop={d && canManage ? () => handleDrop(d) : undefined}
                    onDoubleClick={d && canManage ? () => openCreate(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`) : undefined}
                    style={d ? { cursor: 'pointer' } : {}}>
                    {d && <div className="day-number">{d}</div>}
                    {d && getEventsForDay(d).map((ev) => {
                      const past = isPastEvent(ev);
                      return (
                      <div key={ev.id} className={`calendar-event ${past ? 'past' : ''}`} style={{
                        background: ev.color || '#3b82f6',
                        opacity: past ? 0.55 : 1,
                        cursor: past || !canManage ? 'default' : 'grab',
                      }}
                        title={`${ev.title}\n${ev.start_time || ''} - ${ev.end_time || ''}\n${t('common.status')}: ${ev.status || 'PENDIENTE'}${past ? '\n(Vencido)' : ''}`}
                        draggable={!past && canManage}
                        onDragStart={past || !canManage ? undefined : (e) => handleDragStart(ev, e)}
                        onClick={(e) => { e.stopPropagation(); past && e.preventDefault(); if (!past) openEdit(ev); }}>
                        {ev.status === 'CUMPLIDO' && <span style={{ marginRight: 2 }}>✓</span>}
                        {ev.status === 'INCUMPLIDO' && <span style={{ marginRight: 2 }}>✗</span>}
                        {ev.title}
                      </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}

            {viewMode === 'week' && (
              <div className="calendar-grid" style={{ gridTemplateRows: 'auto 1fr' }}>
                {weekDays.map((d, i) => (
                  <div key={i} className="calendar-header" style={{ fontSize: '0.75rem' }}>
                    {t('page.calendar.days')[i]} {d.getDate()}
                  </div>
                ))}
                {weekDays.map((d, i) => {
                  const dayStr = toDateStr(d);
                  const dayEvents = getEventsForDateObj(d);
                  const isDayToday = isTodayDate(d);
                  return (
                    <div key={i}
                      className={`calendar-day ${isDayToday ? 'today' : ''}`}
                      onDragOver={canManage ? (e) => { e.preventDefault(); setDropTarget(d.getDate()); } : undefined}
                      onDragLeave={canManage ? handleDragLeave : undefined}
                      onDrop={canManage ? () => {
                        const dragData = draggedRef.current;
                        if (!dragData) return;
                        const newDate = toDateStr(d);
                        const duration = (new Date(dragData.end) - new Date(dragData.start)) / (1000 * 60 * 60 * 24);
                        const newEnd = new Date(newDate);
                        newEnd.setDate(newEnd.getDate() + Math.max(0, Math.round(duration)));
                        const endStr = toDateStr(newEnd);
                        scheduleService.dragDrop(dragData.id, { start_date: newDate, end_date: endStr })
                          .then(() => { toast.success(t('toast.event_rescheduled')); loadEvents(); })
                          .catch((err) => { toast.error(err.response?.data?.error || err.message); })
                          .finally(() => { draggedRef.current = null; setDropTarget(null); });
                      } : undefined}
                      onDoubleClick={() => openCreate(dayStr)}
                      style={{ cursor: 'pointer', minHeight: '120px' }}>
                      <div className="day-number" style={{ fontSize: '0.7rem' }}>{d.getDate()}</div>
                      {dayEvents.slice(0, 4).map((ev) => {
                        const past = isPastEvent(ev);
                        return (
                        <div key={ev.id} className={`calendar-event ${past ? 'past' : ''}`} style={{
                          background: ev.color || '#3b82f6', cursor: past || !canManage ? 'default' : 'grab',
                          fontSize: '0.65rem', padding: '1px 2px', opacity: past ? 0.55 : 1,
                        }}
                          title={`${ev.title}\n${ev.start_time || ''} - ${ev.end_time || ''}\n${t('common.status')}: ${ev.status || 'PENDIENTE'}${past ? '\n(Vencido)' : ''}`}
                          draggable={!past && canManage}
                          onDragStart={past || !canManage ? undefined : (e) => handleDragStart(ev, e)}
                          onClick={(e) => { e.stopPropagation(); if (!past) openEdit(ev); }}>
                          {ev.status === 'CUMPLIDO' && <span>✓ </span>}
                          {ev.status === 'INCUMPLIDO' && <span>✗ </span>}
                          {ev.title}
                        </div>
                        );
                      })}
                      {dayEvents.length > 4 && <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textAlign: 'center' }}>+{dayEvents.length - 4}</div>}
                    </div>
                  );
                })}
              </div>
            )}

            {viewMode === 'day' && (
              <div style={{ display: 'flex', gap: '0.5rem', position: 'relative' }}>
                <div style={{ width: '60px', flexShrink: 0 }}>
                  {Array.from({ length: 24 }, (_, h) => (
                    <div key={h} style={{ height: `${HOUR_HEIGHT}px`, borderBottom: '1px solid var(--border)', fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'right', paddingRight: '4px', boxSizing: 'border-box' }}>
                      {String(h).padStart(2, '0')}:00
                    </div>
                  ))}
                </div>
                <div className="day-events-container" style={{ flex: 1, position: 'relative', height: `${CONTAINER_HEIGHT}px`, borderLeft: '2px solid var(--border)' }}
                  onDoubleClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const y = e.clientY - rect.top;
                    const hour = Math.floor((y / CONTAINER_HEIGHT) * 24);
                    const dateStr = toDateStr(viewDate);
                    setEditingId(null);
                    setForm({ activity: '', start_date: dateStr, end_date: dateStr, start_time: `${String(hour).padStart(2, '0')}:00`, end_time: `${String(hour + 1).padStart(2, '0')}:00`, description: '', observation: '', status: 'PENDIENTE', is_extraplan: false, has_incidence: false, color: '#3b82f6' });
                    setModalOpen(true);
                  }}>
                  {Array.from({ length: 24 }, (_, h) => (
                    <div key={h} style={{ position: 'absolute', top: `${(h / 24) * 100}%`, left: 0, right: 0, height: `${(1 / 24) * 100}%`, borderBottom: '1px solid var(--border)', pointerEvents: 'none' }} />
                  ))}
                  {getEventsForDateObj(viewDate).map((ev) => {
                    const past = isPastEvent(ev);
                    const startMin = timeToMinutes(ev.start_time || '00:00');
                    const endMin = timeToMinutes(ev.end_time || '23:59');
                    const durationMin = Math.max(endMin - startMin, 30);
                    const topPct = (startMin / (24 * 60)) * 100;
                    const heightPct = (durationMin / (24 * 60)) * 100;
                    return (
                      <div key={ev.id} className={`calendar-event ${past ? 'past' : ''}`} style={{
                        position: 'absolute', top: `${topPct}%`, left: '2px', right: '2px',
                        height: `${heightPct}%`, background: ev.color || '#3b82f6',
                        cursor: past ? 'default' : 'pointer', fontSize: '0.7rem',
                        overflow: 'hidden', borderRadius: '4px',
                        zIndex: resizingId === ev.id ? 10 : 1, minHeight: '20px',
                        opacity: past ? 0.55 : 1,
                      }}
                        onClick={() => { if (!past) openEdit(ev); }}
                        title={`${ev.title}\n${ev.start_time || ''} - ${ev.end_time || ''}\n${t('common.status')}: ${ev.status || 'PENDIENTE'}${past ? '\n(Vencido)' : ''}`}>
                        <div style={{ padding: '2px 4px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {ev.start_time} {ev.status === 'CUMPLIDO' && '✓ '}{ev.status === 'INCUMPLIDO' && '✗ '}{ev.title}
                        </div>
                        {!past && canManage && <div onMouseDown={(e) => handleResizeStart(ev, e)}
                          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '6px', cursor: 'ns-resize', background: 'rgba(0,0,0,0.15)' }} />}
                        {resizingId === ev.id && <div id={`resize-guide-${ev.id}`} style={{ position: 'absolute', left: 0, right: 0, height: '2px', background: '#fff', borderTop: '1px dashed #000', zIndex: 20, pointerEvents: 'none' }} />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Modal open={modalOpen} onClose={closeModal} aria-label={editingId ? t('page.calendar.edit_event') : t('page.calendar.new_event')}>
        <h2>{editingId ? t('page.calendar.edit_title') : t('page.schedule.create_title')}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('page.schedule.activity')}</label>
            <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
              <select value={form.activity} onChange={(e) => setForm({...form, activity: e.target.value})} required style={{ flex: 1 }} className={formErrors.activity ? 'input-error' : ''} disabled={!canManage && !!editingId}>
                <option value="">{t('form.select')}</option>
                {activities.map(a => <option key={a.id} value={a.id}>{a.description}</option>)}
              </select>
              {formErrors.activity && <span className="field-error">{formErrors.activity}</span>}
              {canManage && <button type="button" className="btn btn-icon btn-sm btn-secondary" onClick={() => setShowNewActivity(true)} title="Nueva actividad personal">
                <Plus size={14} />
              </button>}
            </div>
            {showNewActivity && (
              <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.25rem' }}>
                <input value={newActivityDesc} onChange={(e) => setNewActivityDesc(e.target.value)} placeholder="Nombre de la actividad" style={{ flex: 1, fontSize: '0.8rem' }} autoFocus />
                <button type="button" className="btn btn-icon btn-sm btn-primary" onClick={handleCreateActivity} disabled={!newActivityDesc.trim()} title="Ok">
                  <Check size={14} />
                </button>
                <button type="button" className="btn btn-icon btn-sm btn-secondary" onClick={() => { setShowNewActivity(false); setNewActivityDesc(''); }} title="Cancelar">
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>{t('form.start_date')}</label>
              <input type="date" value={form.start_date} onChange={(e) => setForm({...form, start_date: e.target.value})} required disabled={!canManage && !!editingId} />
            </div>
            <div className="form-group">
              <label>{t('form.end_date')}</label>
              <input type="date" value={form.end_date} onChange={(e) => setForm({...form, end_date: e.target.value})} required disabled={!canManage && !!editingId} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>{t('form.start_time')}</label>
              <input type="time" value={form.start_time} onChange={(e) => setForm({...form, start_time: e.target.value})} disabled={!canManage && !!editingId} />
            </div>
            <div className="form-group">
              <label>{t('form.end_time')}</label>
              <input type="time" value={form.end_time} onChange={(e) => setForm({...form, end_time: e.target.value})} disabled={!canManage && !!editingId} />
            </div>
          </div>
          <div className="form-group">
            <label>{t('form.status')}</label>
            <select value={form.status} onChange={(e) => setForm({...form, status: e.target.value})}>
              <option value="">--</option>
              <option value="PENDIENTE">{t('badge.pending')}</option>
              <option value="CUMPLIDO">{t('badge.cumplido')}</option>
              <option value="INCUMPLIDO">{t('badge.incumplido')}</option>
            </select>
          </div>
          <div className="form-group">
            <label>{t('page.schedule.description')}</label>
              <input value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} disabled={!canManage && !!editingId} />
          </div>
          <div className="form-group">
            <label>{t('form.observation')}</label>
            <textarea value={form.observation} onChange={(e) => setForm({...form, observation: e.target.value})} ref={obsRef} maxLength={500} />
            <span className="char-count">{form.observation.length}/500</span>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>{t('common.color')}</label>
              <input type="color" value={form.color} onChange={(e) => setForm({...form, color: e.target.value})} disabled={!canManage && !!editingId} />
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', paddingBottom: '0.35rem' }}>
              <label className="form-check">
                <input type="checkbox" checked={form.is_extraplan} onChange={(e) => setForm({...form, is_extraplan: e.target.checked})} disabled={!canManage && !!editingId} />
                <span>{t('form.extraplan')}</span>
              </label>
              <label className="form-check">
                <input type="checkbox" checked={form.has_incidence} onChange={(e) => setForm({...form, has_incidence: e.target.checked})} disabled={!canManage && !!editingId} />
                <span>{t('form.incidence')}</span>
              </label>
            </div>
          </div>
          <div className="form-actions">
            <div>
              {editingId && canManage && (
                <button className="btn btn-icon btn-danger" type="button" onClick={() => { closeModal(); setConfirmDelete(editingId); }} title={t('common.delete')}>
                  <Trash2 size={16} />
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-icon btn-secondary" type="button" onClick={closeModal} title={t('common.cancel')}>
                <X size={16} />
              </button>
              <button className="btn btn-icon btn-primary" type="submit" disabled={saving} title={editingId ? t('common.update') : t('common.create')}>
                <Check size={16} />
              </button>
            </div>
          </div>
        </form>
        {editingId && <CommentsSection endpoint="schedule/comments" filterKey="schedule_period" filterValue={editingId} readOnly={!canComment} />}
        {editingId && <HistorySection modelo="PeriodoCronograma" objectId={editingId} />}
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        title={t('common.confirm')}
        message={t('confirm.delete_schedule_period')}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
