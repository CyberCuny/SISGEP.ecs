import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { LogIn } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err.response?.data?.error || t('page.login.error'));
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return <div className="loading">{t('common.loading')}</div>;
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <h1>{t('page.login.title')}</h1>
        </div>
        <p className="subtitle">{t('page.login.subtitle')}</p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('page.login.username')}</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder={t('page.login.username_placeholder')} required />
          </div>
          <div className="form-group">
            <label>{t('page.login.password')}</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('page.login.password_placeholder')} required />
          </div>
          <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
            <LogIn size={16} /> {loading ? t('page.login.loading') : t('page.login.button')}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 16 }}>
          <Link to="/register">Registrarse</Link> &middot; <Link to="/forgot-password">¿Olvidó su contraseña?</Link>
        </p>
      </div>
    </div>
  );
}
