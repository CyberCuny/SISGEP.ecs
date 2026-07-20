import { useState, useEffect } from 'react';
import { emailConfigService } from '../services';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { Save, Send } from 'lucide-react';

export default function EmailConfig() {
  const toast = useToast();
  const { t } = useTranslation();
  const { user } = useAuth();
  if (!user?.is_staff) {
    return <div className="page-header"><h1>{t('page.email_config.title')}</h1><p style={{ padding: '1rem', color: 'var(--text-muted)' }}>{t('page.email_config.no_access')}</p></div>;
  }
  const [configs, setConfigs] = useState([]);
  const [form, setForm] = useState({ host: 'localhost', port: 25, use_tls: false, use_ssl: false, username: '', password: '', default_from: '' });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    emailConfigService.list().then(r => {
      const data = r.data.results || r.data;
      setConfigs(data);
      if (data.length > 0) setForm(data[0]);
    }).catch(() => console.warn('Failed to load email config'));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (configs.length > 0) {
        await emailConfigService.update(configs[0].id, form);
        toast.success(t('toast.email_config_updated'));
      } else {
        await emailConfigService.create(form);
        toast.success(t('toast.email_config_saved'));
      }
    } catch { toast.error(t('toast.save_error')); }
    finally { setSaving(false); }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      await emailConfigService.test(user?.email);
      toast.success(t('toast.email_test_sent'));
    } catch { toast.error(t('toast.email_test_error')); }
    finally { setTesting(false); }
  };

  return (
    <div className="page-container">
      <h2>{t('page.email_config.title')}</h2>
      <div className="card">
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label>{t('page.email_config.smtp_server')}</label>
            <input value={form.host} onChange={e => setForm({...form, host: e.target.value})} required />
          </div>
          <div className="form-group">
            <label>{t('page.email_config.port')}</label>
            <input type="number" value={form.port} onChange={e => setForm({...form, port: parseInt(e.target.value)})} required />
          </div>
          <div className="form-group" style={{display:'flex', gap: 24}}>
            <label><input type="checkbox" checked={form.use_tls} onChange={e => setForm({...form, use_tls: e.target.checked, use_ssl: e.target.checked ? false : form.use_ssl})} /> {t('page.email_config.use_tls')}</label>
            <label><input type="checkbox" checked={form.use_ssl} onChange={e => setForm({...form, use_ssl: e.target.checked, use_tls: e.target.checked ? false : form.use_tls})} /> {t('page.email_config.use_ssl')}</label>
          </div>
          <div className="form-group">
            <label>{t('page.email_config.username')}</label>
            <input value={form.username} onChange={e => setForm({...form, username: e.target.value})} />
          </div>
          <div className="form-group">
            <label>{t('page.email_config.password')}</label>
            <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
          </div>
          <div className="form-group">
            <label>{t('page.email_config.from_address')}</label>
            <input type="email" value={form.default_from} onChange={e => setForm({...form, default_from: e.target.value})} required />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}><Save size={16} /> {saving ? t('page.email_config.saving') : t('page.email_config.save')}</button>
            <button type="button" className="btn btn-secondary" disabled={testing || configs.length === 0} onClick={handleTest}><Send size={16} /> {testing ? t('page.email_config.testing') : t('page.email_config.test_email')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
