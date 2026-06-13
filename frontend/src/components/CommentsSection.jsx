import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ConfirmDialog from './ConfirmDialog';

export default function CommentsSection({ endpoint, filterKey, filterValue, readOnly }) {
  const { t } = useTranslation();
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const { user } = useAuth();
  const toast = useToast();
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetch = (p = 1, append = false) => {
    if (!filterValue) return;
    setLoading(true);
    api.get(`/${endpoint}/?${filterKey}=${filterValue}&page=${p}&page_size=20`)
      .then(r => {
        const results = r.data.results || r.data || [];
        setComments(prev => append ? [...prev, ...results] : results);
        setHasMore(results.length >= 20);
        setPage(p);
      })
      .catch(() => console.warn('Failed to load comments'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { setComments([]); fetch(1); }, [filterValue]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      await api.post(`/${endpoint}/`, { [filterKey]: filterValue, comment: text });
      toast.success(t('toast.comment_added'));
      setText('');
      fetch(1);
    } catch { toast.error(t('toast.comment_error')); }
  };

  const handleDelete = async (id) => {
    setConfirmDelete({ id });
  };

  const confirmDeleteAction = async () => {
    if (!confirmDelete) return;
    try {
      await api.delete(`/${endpoint}/${confirmDelete.id}/`);
      toast.success(t('toast.comment_deleted'));
      fetch(1);
    } catch { toast.error(t('toast.delete_error')); }
    finally { setConfirmDelete(null); }
  };

  return (
    <div className="card" style={{ marginTop: '1rem' }}>
      <div className="card-header"><h3>{t('comments.title')}</h3></div>
      {!readOnly && (
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <div className="form-group" style={{ flex: 1 }}>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2}
              placeholder={t('comments.placeholder')} required />
          </div>
          <button className="btn btn-primary btn-sm" type="submit" disabled={!text.trim()}
            style={{ alignSelf: 'flex-end' }}>{t('comments.button')}</button>
        </form>
      )}
      {comments.length === 0 ? (
        <div className="empty-state">{t('comments.empty')}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {comments.map(c => (
            <div key={c.id} style={{ padding: '0.5rem 0.75rem', background: 'var(--bg-tertiary)', borderRadius: '8px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <strong>{c.user_name || t('common.username')}</strong>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <small style={{ color: 'var(--text-secondary)' }}>{new Date(c.created_at).toLocaleString()}</small>
                  {!readOnly && c.user === user?.id && (
                    <button className="btn btn-sm btn-danger" style={{ padding: '0.1rem 0.3rem', fontSize: '0.7rem' }}
                      onClick={() => handleDelete(c.id)}>X</button>
                  )}
                </div>
              </div>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{c.comment}</p>
            </div>
          ))}
        </div>
      )}
      {hasMore && (
        <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
          <button className="btn btn-secondary btn-sm" disabled={loading} onClick={() => fetch(page + 1, true)}>
            {loading ? t('common.loading') : t('common.view_all')}
          </button>
        </div>
      )}
      <ConfirmDialog
        open={!!confirmDelete}
        title={t('common.confirm')}
        message={t('confirm.delete_comment')}
        onConfirm={confirmDeleteAction}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
