import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('loading'); // loading | success | error
  const { t } = useTranslation();

  useEffect(() => {
    if (!token) { setStatus('error'); return; }
    api.post('/users/verify_email/', { token })
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <div className="login-page">
      <div className="login-card">
        {status === 'loading' && <p>{t('common.loading')}...</p>}
        {status === 'success' && (
          <>
            <div className="alert alert-success">{t('page.verify_email.success')}</div>
            <p style={{ textAlign: 'center' }}><Link to="/login">{t('nav.login')}</Link></p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="alert alert-error">{t('page.verify_email.error')}</div>
            <p style={{ textAlign: 'center' }}><Link to="/login">{t('nav.login')}</Link></p>
          </>
        )}
      </div>
    </div>
  );
}
