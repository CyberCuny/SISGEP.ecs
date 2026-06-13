import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';

export default function HistorySection({ modelo, objectId }) {
  const { t } = useTranslation();
  const [entries, setEntries] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetch = (p = 1, append = false) => {
    if (!objectId) return;
    setLoading(true);
    api.get(`/log-entries/?modelo=${modelo}&object_id=${objectId}&page=${p}&page_size=20`)
      .then(r => {
        const results = r.data.results || r.data || [];
        setEntries(prev => append ? [...prev, ...results] : results);
        setHasMore(results.length >= 20);
        setPage(p);
      })
      .catch(() => console.warn('Failed to load history'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { setEntries([]); fetch(1); }, [objectId, modelo]);

  if (entries.length === 0) return null;

  return (
    <div className="card" style={{ marginTop: '1rem' }}>
      <div className="card-header"><h3>{t('history.title')}</h3></div>
      <div className="table-container">
        <table>
          <thead><tr><th>{t('history.table.date')}</th><th>{t('history.table.time')}</th><th>{t('history.table.user')}</th><th>{t('history.table.action')}</th><th>{t('history.table.ip')}</th></tr></thead>
          <tbody>
            {entries.map(e => (
              <tr key={e.id}>
                <td>{e.fecha}</td>
                <td>{e.hora}</td>
                <td>{e.username}</td>
                <td>{e.accion}</td>
                <td style={{ fontSize: '0.75rem' }}>{e.ip_address || '-'}</td>
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
    </div>
  );
}
