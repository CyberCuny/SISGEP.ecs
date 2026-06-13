import { useTranslation } from 'react-i18next';

export default function ConfirmDialog({ open, title, message, onConfirm, onCancel }) {
  const { t } = useTranslation();
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" style={{ width: '400px', maxWidth: '90%' }} onClick={(e) => e.stopPropagation()}>
        <h2>{title || t('common.confirm')}</h2>
        <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>{message}</p>
        <div className="form-actions">
          <button className="btn btn-secondary" onClick={onCancel}>{t('common.cancel')}</button>
          <button className="btn btn-primary" onClick={onConfirm}>{t('common.confirm')}</button>
        </div>
      </div>
    </div>
  );
}
