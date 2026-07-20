import { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useTranslation } from 'react-i18next';
import { Upload, Download, RotateCcw } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import { useAuth } from '../context/AuthContext';

export default function Backup() {
  const toast = useToast();
  const { t } = useTranslation();
  const { user } = useAuth();
  if (!user?.is_staff) {
    return <div className="page-header"><h1>{t('page.backup.title')}</h1><p style={{ padding: '1rem', color: 'var(--text-muted)' }}>{t('page.backup.no_access')}</p></div>;
  }
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(null);
  const [confirmRestore, setConfirmRestore] = useState(null);

  useEffect(() => { loadBackups(); }, []);

  const loadBackups = async () => {
    setLoading(true);
    try {
      const res = await api.get('/backups/');
      setBackups(res.data);
    } catch { toast.error(t('toast.load_backups_error')); }
    finally { setLoading(false); }
  };

  const handleCreate = async () => {
    setLoading(true);
    try {
      await api.post('/backups/');
      toast.success(t('toast.backup_created'));
      loadBackups();
    } catch { toast.error(t('toast.backup_create_error')); }
    finally { setLoading(false); }
  };

  const handleDownload = (name) => {
    const a = document.createElement('a');
    a.href = `/api/v1/backups/download/?name=${encodeURIComponent(name)}`;
    a.download = name;
    a.click();
  };

  const handleRestore = async (name) => {
    setConfirmRestore({ name });
  };

  const confirmRestoreAction = async () => {
    if (!confirmRestore) return;
    setRestoring(confirmRestore.name);
    try {
      await api.post('/backups/restore/', { name: confirmRestore.name });
      toast.success(t('toast.backup_restored'));
    } catch { toast.error(t('toast.backup_restore_error')); }
    finally { setRestoring(null); setConfirmRestore(null); }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>{t('page.backup.title')}</h2>
        <button className="btn btn-icon btn-primary" onClick={handleCreate} disabled={loading} title={loading ? t('page.backup.creating') : t('page.backup.create')}>
          <Upload size={16} />
        </button>
      </div>
      <div className="card">
        <div className="table-container">
          <table>
            <thead><tr><th>{t('page.backup.table.file')}</th><th>{t('page.backup.table.size')}</th><th>{t('page.backup.table.date')}</th><th>{t('page.backup.table.actions')}</th></tr></thead>
            <tbody>
              {backups.length === 0 && <tr><td colSpan={4} className="empty-state">{t('page.backup.empty')}</td></tr>}
              {backups.map((b) => (
                <tr key={b.name}>
                  <td>{b.name}</td>
                  <td>{formatSize(b.size)}</td>
                  <td>{new Date(b.created).toLocaleString()}</td>
                  <td>
                    <button className="btn btn-icon btn-sm btn-secondary" onClick={() => handleDownload(b.name)} title={t('common.download')}><Download size={14} /></button>
                    <button className="btn btn-icon btn-sm btn-warning" onClick={() => handleRestore(b.name)} disabled={restoring === b.name} title={restoring === b.name ? t('page.backup.restoring') : t('page.backup.restore')}>
                      <RotateCcw size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <ConfirmDialog
        open={!!confirmRestore}
        title={t('common.confirm')}
        message={confirmRestore ? t('confirm.restore_backup', { name: confirmRestore.name }) : ''}
        onConfirm={confirmRestoreAction}
        onCancel={() => setConfirmRestore(null)}
      />
    </div>
  );
}
