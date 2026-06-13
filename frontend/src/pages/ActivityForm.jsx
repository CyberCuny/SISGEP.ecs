import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, X, Check, Save } from 'lucide-react';
import api from '../services/api';
import { scheduleService } from '../services';
import AttachmentsSection from '../components/AttachmentsSection';
import CommentsSection from '../components/CommentsSection';
import HistorySection from '../components/HistorySection';

export default function ActivityForm() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const [loading, setLoading] = useState(false);
  const [catalogs, setCatalogs] = useState({
    categories: [], types: [], arcs: [], objectives: [],
    criteria: [], guidelines: [], units: [],
  });
  const [form, setForm] = useState({
    description: '', place: '', responsible: '', participants: '',
    category: '', activity_type: '', arc: '', associated_objective: '',
    measurement_criterion: '', organizational_unit: '',
    is_important: false, is_general: false, color: '#1976d2',
    guideline_ids: [],
  });
  const [error, setError] = useState('');
  const [schedulePeriods, setSchedulePeriods] = useState([]);
  const [existingPeriodIds, setExistingPeriodIds] = useState(new Set());

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
    ];
    Promise.all(promises).then(([cat, typ, arc, obj, cri, gui, uos]) => {
      setCatalogs({ categories: cat, types: typ, arcs: arc, objectives: obj, criteria: cri, guidelines: gui, units: uos });
    });
    if (isEditing) {
      api.get(`/activities/${id}/`).then((res) => {
        const d = res.data;
        setForm({
          description: d.description || '', place: d.place || '',
          responsible: d.responsible || '', participants: d.participants || '',
          category: d.category || '', activity_type: d.activity_type || '',
          arc: d.arc || '', associated_objective: d.associated_objective || '',
          measurement_criterion: d.measurement_criterion || '',
          organizational_unit: d.organizational_unit || '',
          is_important: d.is_important || false, is_general: d.is_general || false,
          color: d.color || '#1976d2', guideline_ids: d.guideline_ids || [],
        });
      });
      scheduleService.list({ activity_id: id }).then((res) => {
        const periods = (res.data.results || res.data || []).map(p => ({
          _localId: p.id,
          id: p.id,
          start_date: p.start_date || '',
          end_date: p.end_date || '',
          start_time: p.start_time || '',
          end_time: p.end_time || '',
        }));
        setSchedulePeriods(periods);
        setExistingPeriodIds(new Set(periods.map(p => p.id)));
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
    setLoading(true);
    try {
      if (isEditing) {
        await api.patch(`/activities/${id}/`, form);
        const currentIds = new Set(schedulePeriods.map(p => p.id).filter(Boolean));
        const toDelete = [...existingPeriodIds].filter(pid => !currentIds.has(pid));
        const toCreate = schedulePeriods.filter(p => !p.id);
        await Promise.all(toDelete.map(pid => scheduleService.delete(pid)));
        await Promise.all(toCreate.map(p => scheduleService.create({ ...p, activity: id, _localId: undefined, id: undefined })));
      } else {
        const res = await api.post('/activities/', form);
        const newId = res.data.id;
        await Promise.all(schedulePeriods.map(p => scheduleService.create({ start_date: p.start_date, end_date: p.end_date, start_time: p.start_time, end_time: p.end_time, activity: newId })));
      }
      navigate('/activities');
    } catch (err) {
      setError(err.response?.data
        ? (typeof err.response.data === 'string' ? err.response.data
          : Object.values(err.response.data).flat().filter(Boolean).join('. '))
        : t('page.activity_form.error'));
    } finally {
      setLoading(false);
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
          <div className="form-row">
            <div className="form-group">
              <label>{t('form.responsibles')}</label>
              <input name="responsible" value={form.responsible} onChange={handleChange} placeholder={t('form.responsibles')} />
            </div>
            <div className="form-group">
              <label>{t('form.participants')}</label>
              <input name="participants" value={form.participants} onChange={handleChange} placeholder={t('form.participants')} />
            </div>
          </div>
          <div className="form-row">
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
              <label>{t('form.category')}</label>
              <select name="category" value={form.category} onChange={handleChange}>
                <option value="">{t('form.select')}</option>
                {catalogs.categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>{t('form.activity_type')}</label>
              <select name="activity_type" value={form.activity_type} onChange={handleChange}>
                <option value="">{t('form.select')}</option>
                {catalogs.types.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>{t('form.arc')}</label>
              <select name="arc" value={form.arc} onChange={handleChange}>
                <option value="">{t('form.select')}</option>
                {catalogs.arcs.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>{t('form.associated_objective')}</label>
              <select name="associated_objective" value={form.associated_objective} onChange={handleChange}>
                <option value="">{t('form.select')}</option>
                {catalogs.objectives.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
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
            <button className="btn btn-icon btn-primary" type="submit" disabled={loading} title={loading ? t('common.saving') : (isEditing ? t('common.update') : t('page.activity_form.create'))}>
              <Check size={16} />
            </button>
          </div>
        </form>
      </div>
      {isEditing && (
        <>
        <AttachmentsSection activityId={id} />
        <CommentsSection endpoint="activity-comments" filterKey="activity" filterValue={id} />
        <HistorySection modelo="Actividad" objectId={id} />
        </>
      )}
    </div>
  );
}
