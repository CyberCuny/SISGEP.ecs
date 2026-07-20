import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, X, Check, Search } from 'lucide-react';
import api from '../services/api';
import AttachmentsSection from '../components/AttachmentsSection';
import CommentsSection from '../components/CommentsSection';
import HistorySection from '../components/HistorySection';
import { useAuth } from '../context/AuthContext';
import { hasAnyRole, ROLES } from '../utils/roles';

function UserMultiSelect({ users, selectedIds, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);
  const inputRef = useRef(null);

  const filtered = search
    ? users.filter(u => (u.display_name || u.username || '').toLowerCase().includes(search.toLowerCase()))
    : users;

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = useCallback((uid) => {
    onChange(selectedIds.includes(uid) ? selectedIds.filter(x => x !== uid) : [...selectedIds, uid]);
  }, [selectedIds, onChange]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBottom: '0.25rem' }}>
        {selectedIds.map(id => {
          const u = users.find(x => x.id === id);
          return u ? (
            <span key={id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', background: 'var(--bg-hover)', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.8rem' }}>
              {u.display_name || u.username}
              <button type="button" onClick={() => onChange(selectedIds.filter(x => x !== id))} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, color: '#d32f2f' }}><X size={12} /></button>
            </span>
          ) : null;
        })}
      </div>
      <div style={{ position: 'relative' }}>
        <input ref={inputRef} type="text" placeholder="Buscar..." value={search}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
          style={{ width: '100%', padding: '0.35rem 0.5rem', fontSize: '0.85rem', boxSizing: 'border-box', background: 'var(--bg-card)', color: 'var(--text)' }} />
        {open && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)', background: 'var(--bg-card)', zIndex: 20, borderRadius: '0 0 4px 4px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Sin resultados</div>
            ) : (
              filtered.map(u => (
                <div key={u.id} onMouseDown={(e) => { e.preventDefault(); toggle(u.id); }}
                  style={{ padding: '0.35rem 0.5rem', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem', background: selectedIds.includes(u.id) ? 'var(--bg-hover)' : 'transparent', color: 'var(--text)' }}
                  onMouseEnter={(e) => { if (!selectedIds.includes(u.id)) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={(e) => { if (!selectedIds.includes(u.id)) e.currentTarget.style.background = 'transparent'; }}>
                  <span style={{ width: '1em', color: selectedIds.includes(u.id) ? 'var(--accent)' : 'transparent' }}>{selectedIds.includes(u.id) ? '✓' : '○'}</span>
                  {u.display_name || u.username}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ActivityForm() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEditing = Boolean(id);
  const canManage = user?.is_staff || hasAnyRole(user, [ROLES.PLANNER, ROLES.DIRECTOR]);
  if (!canManage) {
    return <div className="page-header"><h1>{isEditing ? t('page.activity_form.edit_title') : t('page.activity_form.create_title')}</h1><p style={{ padding: '1rem', color: 'var(--text-muted)' }}>{t('page.activity_form.no_access')}</p></div>;
  }
  const [loading, setLoading] = useState(false);
  const [catalogs, setCatalogs] = useState({
    categories: [], types: [], arcs: [], objectives: [],
    criteria: [], guidelines: [], units: [], users: [],
  });
  const [form, setForm] = useState({
    description: '', place: '',
    category: '', activity_type: '', arc: '', associated_objective: '',
    measurement_criterion: '', organizational_unit: '',
    is_important: false, is_general: false, color: '#1976d2',
    guideline_ids: [],
  });
  const [responsibleIds, setResponsibleIds] = useState([]);
  const [participantIds, setParticipantIds] = useState([]);
  const [error, setError] = useState('');
  const [schedulePeriods, setSchedulePeriods] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.title = isEditing ? t('page.activity_form.edit_title') : t('page.activity_form.create_title');
    const promises = [
      api.get('/categories/').then(r => r.data.results || r.data || []),
      api.get('/activity-types/').then(r => r.data.results || r.data || []),
      api.get('/arcs/').then(r => r.data.results || r.data || []),
      api.get('/objectives/').then(r => r.data.results || r.data || []),
      api.get('/criteria/').then(r => r.data.results || r.data || []),
      api.get('/guidelines/').then(r => r.data.results || r.data || []),
      api.get('/organizational-units/').then(r => r.data.results || r.data || []),
      api.get('/users/?page_size=500').then(r => r.data.results || r.data || []),
    ];
    Promise.all(promises).then(([cat, typ, arc, obj, cri, gui, uos, usrs]) => {
      setCatalogs({ categories: cat, types: typ, arcs: arc, objectives: obj, criteria: cri, guidelines: gui, units: uos, users: usrs });
    });
    if (isEditing) {
      api.get(`/activities/${id}/`).then((res) => {
        const d = res.data;
        setForm({
          description: d.description || '', place: d.place || '',
          category: d.category || '', activity_type: d.activity_type || '',
          arc: d.arc || '', associated_objective: d.associated_objective || '',
          measurement_criterion: d.measurement_criterion || '',
          organizational_unit: d.organizational_unit || '',
          is_important: d.is_important || false, is_general: d.is_general || false,
          color: d.color || '#1976d2', guideline_ids: d.guideline_ids || [],
        });
        setResponsibleIds(d.responsible_user_id_list || []);
        setParticipantIds(d.participant_user_id_list || []);
      });
      api.get(`/schedule/periods/?activity_id=${id}&page_size=500`).then((res) => {
        const periods = (res.data.results || res.data || []).map(p => ({
          _localId: p.id,
          id: p.id,
          start_date: p.start_date || '',
          end_date: p.end_date || '',
          start_time: p.start_time || '',
          end_time: p.end_time || '',
        }));
        setSchedulePeriods(periods);
      });
    }
  }, [id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleGuidelineToggle = (gid) => {
    setForm((prev) => ({
      ...prev,
      guideline_ids: prev.guideline_ids.includes(gid)
        ? prev.guideline_ids.filter((x) => x !== gid)
        : [...prev.guideline_ids, gid],
    }));
  };

  const addSchedulePeriod = () => {
    const newId = Date.now() + Math.random();
    setSchedulePeriods(prev => [...prev, { _localId: newId, start_date: '', end_date: '', start_time: '', end_time: '' }]);
  };

  const removeSchedulePeriod = (localId) => {
    setSchedulePeriods(prev => prev.filter(p => p._localId !== localId));
  };

  const handlePeriodChange = (localId, field, value) => {
    setSchedulePeriods(prev => prev.map(p => p._localId === localId ? { ...p, [field]: value } : p));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        ...form,
        guideline_ids: form.guideline_ids,
        responsible_user_ids: responsibleIds,
        participant_user_ids: participantIds,
        schedule_periods: schedulePeriods.map(p => ({
          id: p.id || undefined,
          start_date: p.start_date,
          end_date: p.end_date,
          start_time: p.start_time,
          end_time: p.end_time,
        })),
      };
      if (isEditing) {
        await api.patch(`/activities/${id}/`, payload);
      } else {
        await api.post('/activities/', payload);
      }
      navigate('/activities');
    } catch (err) {
      setError(err.response?.data
        ? (typeof err.response.data === 'string' ? err.response.data
          : Object.values(err.response.data).flat().filter(Boolean).join('. '))
        : t('page.activity_form.error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>{isEditing ? t('page.activity_form.edit_title') : t('page.activity_form.create_title')}</h1>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('page.activity_form.description')}</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows={3} required placeholder={t('form.description_placeholder')} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>{t('form.place')}</label>
              <input name="place" value={form.place} onChange={handleChange} placeholder={t('form.place')} />
            </div>
            <div className="form-group">
              <label>{t('common.color')}</label>
              <input type="color" name="color" value={form.color} onChange={handleChange} />
            </div>
          </div>
          <div className="form-group">
            <label>{t('form.organizational_unit')}</label>
            <select name="organizational_unit" value={form.organizational_unit} onChange={handleChange}>
              <option value="">{t('form.select')}</option>
              {catalogs.units.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Responsables</label>
            <UserMultiSelect users={catalogs.users} selectedIds={responsibleIds} onChange={setResponsibleIds} />
          </div>
          <div className="form-group">
            <label>Participantes</label>
            <UserMultiSelect users={catalogs.users} selectedIds={participantIds} onChange={setParticipantIds} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>{t('form.category')}</label>
              <select name="category" value={form.category} onChange={handleChange}>
                <option value="">{t('form.select')}</option>
                {catalogs.categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>{t('form.activity_type')}</label>
              <select name="activity_type" value={form.activity_type} onChange={handleChange}>
                <option value="">{t('form.select')}</option>
                {catalogs.types.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>{t('form.arc')}</label>
              <select name="arc" value={form.arc} onChange={handleChange}>
                <option value="">{t('form.select')}</option>
                {catalogs.arcs.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>{t('form.associated_objective')}</label>
              <select name="associated_objective" value={form.associated_objective} onChange={handleChange}>
                <option value="">{t('form.select')}</option>
                {catalogs.objectives.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>{t('form.measurement_criterion')}</label>
              <select name="measurement_criterion" value={form.measurement_criterion} onChange={handleChange}>
                <option value="">{t('form.select')}</option>
                {catalogs.criteria.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-row" style={{ marginBottom: '1rem' }}>
            <div className="form-group">
              <label>
                <input type="checkbox" name="is_important" checked={form.is_important} onChange={handleChange} />
                {' '}{t('form.important_activity')}
              </label>
            </div>
            <div className="form-group">
              <label>
                <input type="checkbox" name="is_general" checked={form.is_general} onChange={handleChange} />
                {' '}{t('form.general_activity')}
              </label>
            </div>
          </div>
          <div className="form-group">
            <label>{t('form.guidelines')}</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {catalogs.guidelines.map((g) => (
                <label key={g.id} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.guideline_ids.includes(g.id)} onChange={() => handleGuidelineToggle(g.id)} />
                  {g.name}
                </label>
              ))}
            </div>
          </div>
          <div className="form-group" style={{ marginTop: '1.5rem' }}>
            <label style={{ fontWeight: 600, fontSize: '1.1rem' }}>{t('page.activity_form.schedule_periods')}</label>
            {schedulePeriods.map((period) => (
              <div key={period._localId} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                <div>
                  <label style={{ fontSize: '0.8rem' }}>{t('form.start_date')}</label>
                  <input type="date" value={period.start_date} onChange={(e) => handlePeriodChange(period._localId, 'start_date', e.target.value)} className="form-control" style={{ width: 'auto' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem' }}>{t('form.end_date')}</label>
                  <input type="date" value={period.end_date} onChange={(e) => handlePeriodChange(period._localId, 'end_date', e.target.value)} className="form-control" style={{ width: 'auto' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem' }}>{t('form.start_time')}</label>
                  <input type="time" value={period.start_time} onChange={(e) => handlePeriodChange(period._localId, 'start_time', e.target.value)} className="form-control" style={{ width: 'auto' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem' }}>{t('form.end_time')}</label>
                  <input type="time" value={period.end_time} onChange={(e) => handlePeriodChange(period._localId, 'end_time', e.target.value)} className="form-control" style={{ width: 'auto' }} />
                </div>
                <button type="button" className="btn btn-icon btn-sm" onClick={() => removeSchedulePeriod(period._localId)} title={t('common.delete')} style={{ color: '#d32f2f', background: 'transparent', border: 'none' }}><X size={16} /></button>
              </div>
            ))}
            <button type="button" className="btn btn-secondary" onClick={addSchedulePeriod} style={{ marginTop: '0.5rem' }}>
              <Plus size={16} /> {t('page.activity_form.add_period')}
            </button>
          </div>
          <div className="form-actions">
            <button className="btn btn-icon btn-secondary" type="button" onClick={() => navigate('/activities')} title={t('common.cancel')}><X size={16} /></button>
            <button className="btn btn-icon btn-primary" type="submit" disabled={saving} title={saving ? t('common.saving') : (isEditing ? t('common.update') : t('page.activity_form.create'))}>
              <Check size={16} />
            </button>
          </div>
        </form>
      </div>
      {isEditing && (
        <>
        <AttachmentsSection activityId={id} readOnly={!canManage} />
        <CommentsSection endpoint="activity-comments" filterKey="activity" filterValue={id} readOnly={!canManage} />
        <HistorySection modelo="Actividad" objectId={id} />
        </>
      )}
    </div>
  );
}
