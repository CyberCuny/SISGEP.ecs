import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTranslation } from 'react-i18next';
import { Save, Lock } from 'lucide-react';

export default function Profile() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const { t } = useTranslation();
  const [form, setForm] = useState({ display_name: '', email: '', position: '' });
  const [passForm, setPassForm] = useState({ old_password: '', new_password: '', confirm: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({ display_name: user.display_name || '', email: user.email || '', position: user.position || '' });
    }
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.patch('/users/me_update/', form);
      setUser(res.data);
      toast.success(t('toast.profile_updated'));
    } catch { toast.error(t('toast.profile_update_error')); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passForm.new_password !== passForm.confirm) {
      toast.error(t('toast.passwords_mismatch'));
      return;
    }
    try {
      await api.post(`/users/${user.id}/change_password/`, {
        old_password: passForm.old_password, new_password: passForm.new_password
      });
      toast.success(t('toast.password_changed'));
      setPassForm({ old_password: '', new_password: '', confirm: '' });
    } catch { toast.error(t('toast.password_change_error')); }
  };

  if (!user) return null;

  return (
    <div>
      <div className="page-header"><h1>{t('page.profile.title')}</h1></div>
      <div className="card-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="card">
          <div className="card-header"><h3>{t('page.profile.personal_data')}</h3></div>
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label>{t('page.profile.username')}</label>
              <input value={user.username} disabled style={{ opacity: 0.6 }} />
            </div>
            <div className="form-group">
              <label>{t('page.profile.display_name')}</label>
              <input value={form.display_name} onChange={(e) => setForm({...form, display_name: e.target.value})} required />
            </div>
            <div className="form-group">
              <label>{t('page.profile.email')}</label>
              <input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} />
            </div>
            <div className="form-group">
              <label>{t('page.profile.position')}</label>
              <input value={form.position} onChange={(e) => setForm({...form, position: e.target.value})} />
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" type="submit" disabled={saving}>
                <Save size={16} /> {saving ? t('page.profile.saving') : t('page.profile.save')}
              </button>
            </div>
          </form>
        </div>
        <div className="card">
          <div className="card-header"><h3>{t('page.profile.change_password_section')}</h3></div>
          <form onSubmit={handleChangePassword}>
            <div className="form-group">
              <label>{t('page.profile.current_password')}</label>
              <input type="password" value={passForm.old_password} onChange={(e) => setPassForm({...passForm, old_password: e.target.value})} required />
            </div>
            <div className="form-group">
              <label>{t('page.profile.new_password')}</label>
              <input type="password" value={passForm.new_password} onChange={(e) => setPassForm({...passForm, new_password: e.target.value})} required />
            </div>
            <div className="form-group">
              <label>{t('page.profile.confirm_password')}</label>
              <input type="password" value={passForm.confirm} onChange={(e) => setPassForm({...passForm, confirm: e.target.value})} required />
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" type="submit"><Lock size={16} /> {t('page.profile.change_password')}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
