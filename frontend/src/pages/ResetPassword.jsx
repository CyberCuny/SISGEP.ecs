import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { userService } from '../services';
import { Lock } from 'lucide-react';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setLoading(true);
    try {
      await userService.resetPasswordConfirm({ token, password });
      setDone(true);
      setTimeout(() => navigate('/login', { replace: true }), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al restablecer la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="alert alert-error">Token inválido o faltante.</div>
          <p style={{ textAlign: 'center' }}><Link to="/login">Volver al inicio de sesión</Link></p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
          <h1>Nueva contraseña</h1>
        </div>
        {done ? (
          <div className="alert alert-success">Contraseña actualizada. Redirigiendo al inicio de sesión...</div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && <div className="alert alert-error">{error}</div>}
            <div className="form-group">
              <label>Nueva contraseña</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Nueva contraseña" required />
            </div>
            <div className="form-group">
              <label>Confirmar contraseña</label>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repita la contraseña" required />
            </div>
            <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
              <Lock size={16} /> {loading ? 'Guardando...' : 'Restablecer contraseña'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
