import { useTranslation } from 'react-i18next';
import Modal from './Modal';

export default function ConfirmDialog({ open, title, message, onConfirm, onCancel }) {
  const { t } = useTranslation();
  return (
    <Modal open={open} onClose={onCancel} width="400px">
      <h2>{title || t('common.confirm')}</h2>
      <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>{message}</p>
      <div className="form-actions">
        <button className="btn btn-secondary" onClick={onCancel}>{t('common.cancel')}</button>
        <button className="btn btn-primary" onClick={onConfirm}>{t('common.confirm')}</button>
      </div>
    </Modal>
  );
}
