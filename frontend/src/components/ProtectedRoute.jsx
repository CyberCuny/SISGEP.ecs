import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

export default function ProtectedRoute({ children }) {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="loading">{t('common.loading')}</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
