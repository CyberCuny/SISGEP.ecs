import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import ConfirmDialog from './ConfirmDialog';

export default function AttachmentsSection({ activityId, readOnly }) {
  const { t } = useTranslation();
  const [attachments, setAttachments] = useState([]);
  const [file, setFile] = useState(null);
  const [desc, setDesc] = useState('');
  const toast = useToast();
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetch = (p = 1, append = false) => {
    if (!activityId) return;
    setLoading(true);
    api.get(`/activity-attachments/?activity=${activityId}&page=${p}&page_size=20`)
      .then(r => {
        const results = r.data.results || r.data || [];
        setAttachments(prev => append ? [...prev, ...results] : results);
        setHasMore(results.length >= 20);
        setPage(p);
      })
      .catch(() => console.warn('Failed to load attachments'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { setAttachments([]); fetch(1); }, [activityId]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('activity', activityId);
    if (desc) fd.append('description', desc);
    try {
      await api.post('/activity-attachments/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(t('toast.file_uploaded'));
      setFile(null);
      setDesc('');
      fetch(1);
    } catch { toast.error(t('toast.file_upload_error')); }
  };

  const handleDelete = async (id) => {
    setConfirmDelete({ id });
  };

  const confirmDeleteAction = async () => {
    if (!confirmDelete) return;
    try {
      await api.delete(`/activity-attachments/${confirmDelete.id}/`);
      toast.success(t('toast.file_deleted'));
      fetch(1);
    } catch { toast.error(t('toast.delete_error')); }
    finally { setConfirmDelete(null); }
  };

  return (
    <div className="card" style={{ marginTop: '1rem' }}>
      <div className="card-header"><h3>{t('attachments.title')}</h3></div>
      {!readOnly && (
        <form onSubmit={handleUpload} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', marginBottom: '0.75rem' }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label>{t('attachments.new_file')}</label>
            <input type="file" onChange={(e) => setFile(e.target.files[0])} required />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>{t('attachments.description')}</label>
            <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={t('attachments.description_placeholder')} />
          </div>
          <button className="btn btn-primary btn-sm" type="submit" disabled={!file}>{t('attachments.upload')}</button>
        </form>
      )}
      {attachments.length === 0 ? (
        <div className="empty-state">{t('attachments.empty')}</div>
      ) : (
        <div className="table-container">
          <table>
            <thead><tr><th>{t('attachments.table.file')}</th><th>{t('attachments.table.description')}</th><th>{t('attachments.table.uploaded_by')}</th><th>{t('attachments.table.date')}</th><th>{t('attachments.table.actions')}</th></tr></thead>
            <tbody>
              {attachments.map(a => (
                <tr key={a.id}>
                  <td><a href={a.file_url} target="_blank" rel="noreferrer">{a.file?.split('/').pop() || t('common.download')}</a></td>
                  <td>{a.description || '-'}</td>
                  <td>{a.uploaded_by_name || '-'}</td>
                  <td>{new Date(a.uploaded_at).toLocaleDateString()}</td>
                  <td>{!readOnly && <button className="btn btn-sm btn-danger" onClick={() => handleDelete(a.id)}>{t('common.delete')}</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {hasMore && (
            <div style={{ textAlign: 'center', padding: '0.5rem' }}>
              <button className="btn btn-secondary btn-sm" disabled={loading} onClick={() => fetch(page + 1, true)}>
                {loading ? t('common.loading') : t('common.view_all')}
              </button>
            </div>
          )}
        </div>
      )}
      <ConfirmDialog
        open={!!confirmDelete}
        title={t('common.confirm')}
        message={t('confirm.delete_file')}
        onConfirm={confirmDeleteAction}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
