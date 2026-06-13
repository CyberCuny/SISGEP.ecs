import { useState } from 'react';
import { Link } from 'react-router-dom';
import { userService } from '../services';
import { Send } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await userService.forgotPassword({ email });
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 7l-10 7L2 7" />
          </svg>
          <h1>Recuperar contraseña</h1>
        </div>
        <p className="subtitle">Ingrese su correo para recibir instrucciones</p>
        {sent ? (
          <div className="alert alert-success">Si el correo existe, recibirá instrucciones.</div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Correo electrónico</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@ejemplo.com" required />
            </div>
            <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
              <Send size={16} /> {loading ? 'Enviando...' : 'Enviar'}
            </button>
          </form>
        )}
        <p style={{ textAlign: 'center', marginTop: 16 }}>
          <Link to="/login">Volver al inicio de sesión</Link>
        </p>
      </div>
    </div>
  );
}
