import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Pagination from '../components/Pagination';
import Spinner from '../components/Spinner';

export default function AuditLog() {
  const { t } = useTranslation();
  const { user } = useAuth();
  if (!user?.is_staff) {
    return <div className="page-header"><h1>{t('page.audit.title')}</h1><p style={{ padding: '1rem', color: 'var(--text-muted)' }}>{t('page.audit.no_access')}</p></div>;
  }
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const pageSize = 50;

  useEffect(() => {
    setLoading(true);
    api.get(`/log-entries/?page=${page}`)
      .then((res) => {
        setEntries(res.data.results || res.data || []);
        setCount(res.data.count || 0);
      })
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div>
      <div className="page-header">
        <h1>{t('page.audit.title')}</h1>
      </div>
      <div className="card">
        {loading ? <Spinner /> : entries.length === 0 ? (
          <div className="empty-state">{t('page.audit.empty')}</div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>{t('page.audit.table.date')}</th><th>{t('page.audit.table.time')}</th><th>{t('page.audit.table.user')}</th><th>{t('page.audit.table.model')}</th><th>{t('page.audit.table.action')}</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td>{e.fecha}</td>
                    <td>{e.hora}</td>
                    <td>{e.username}</td>
                    <td><span className="badge badge-info">{e.modelo}</span></td>
                    <td>{e.accion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination count={count} page={page} pageSize={pageSize} onPageChange={setPage} />
      </div>
    </div>
  );
}
