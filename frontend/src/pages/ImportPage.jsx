import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { Upload } from 'lucide-react';

export default function ImportPage() {
  const { t } = useTranslation();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const toast = useToast();

  const handleImport = async (e) => {
    e.preventDefault();
    if (!file) { toast.warning(t('toast.select_file')); return; }
    setLoading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/activities/import_activities/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data);
      toast.success(t('toast.import_success', { n: res.data.created }));
    } catch { toast.error(t('toast.import_error')); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div className="page-header">
        <h1>{t('page.import.title')}</h1>
      </div>
      <div className="card">
        <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          {t('page.import.description')}
        </p>
        <form onSubmit={handleImport}>
          <div className="form-group">
            <label>{t('page.import.file')}</label>
            <input type="file" accept=".xlsx,.xls" onChange={(e) => setFile(e.target.files[0])} required />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            <Upload size={16} /> {loading ? t('page.import.loading') : t('page.import.button')}
          </button>
        </form>
        {result && (
          <div style={{ marginTop: '1rem' }}>
            <div className="alert alert-success">
              {t('page.import.success', { n: result.created })}
            </div>
            {result.errors && result.errors.length > 0 && (
              <div style={{ marginTop: '0.5rem' }}>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--danger)' }}>{t('page.import.errors')}</h4>
                <ul style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {result.errors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
