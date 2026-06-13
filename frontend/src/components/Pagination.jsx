import { useTranslation } from 'react-i18next';

function getPageNumbers(current, total) {
  const delta = 2;
  const range = [];
  for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) range.push(i);
  if (current - delta > 2) range.unshift('...');
  if (current + delta < total - 1) range.push('...');
  range.unshift(1);
  if (total > 1) range.push(total);
  return range;
}

export default function Pagination({ count, page, pageSize, onPageChange }) {
  const { t } = useTranslation();
  const totalPages = Math.ceil(count / pageSize);
  if (totalPages <= 1) return null;
  const pages = getPageNumbers(page, totalPages);
  return (
    <div className="pagination">
      <button className="btn btn-sm btn-ghost" disabled={page <= 1} onClick={() => onPageChange(page - 1)} title={t('pagination.prev')}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
      </button>
      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} className="page-ellipsis">...</span>
        ) : (
          <button key={p} className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-ghost'}`} onClick={() => onPageChange(p)}>{p}</button>
        )
      )}
      <button className="btn btn-sm btn-ghost" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} title={t('pagination.next')}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
      </button>
    </div>
  );
}
