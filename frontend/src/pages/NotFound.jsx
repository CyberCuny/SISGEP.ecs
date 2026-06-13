import { useTranslation } from 'react-i18next';
import Breadcrumbs from '../components/Breadcrumbs';
import useDocumentTitle from '../hooks/useDocumentTitle';

export default function NotFound() {
  const { t } = useTranslation();
  useDocumentTitle('404');
  return (
    <div>
      <Breadcrumbs items={[{ to: '/', label: t('nav.dashboard') }, { label: '404' }]} />
      <div className="empty-state" style={{ marginTop: '3rem' }}>
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2M9 9h.01M15 9h.01"/></svg>
        <h2 style={{ marginTop: '1rem', color: 'var(--text)' }}>404 — P&aacute;gina no encontrada</h2>
        <p>{t('common.no_results')}</p>
        <a href="/" className="btn btn-primary" style={{ marginTop: '1rem' }}>{t('nav.dashboard')}</a>
      </div>
    </div>
  );
}