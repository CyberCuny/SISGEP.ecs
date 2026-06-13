import { useState } from 'react';
import { Link } from 'react-router-dom';
import { userService } from '../services';
import { UserPlus } from 'lucide-react';

export default function Register() {
  const [form, setForm] = useState({ username: '', display_name: '', email: '', password: '', confirm_password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (form.password !== form.confirm_password) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setLoading(true);
    try {
      await userService.register({
        username: form.username,
        display_name: form.display_name || form.username,
        email: form.email,
        password: form.password,
      });
      setSuccess('Registro exitoso. Revise su correo para confirmar la cuenta.');
    } catch (err) {
      setError(err.response?.data ? Object.values(err.response.data).flat().join(', ') : 'Error al registrarse.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="8.5" cy="7" r="4" /><path d="M20 8v6m-3-3h6" />
          </svg>
          <h1>Registrarse</h1>
        </div>
        <p className="subtitle">Cree una cuenta nueva</p>
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Usuario</label>
            <input type="text" name="username" value={form.username} onChange={handleChange} placeholder="Nombre de usuario" required />
          </div>
          <div className="form-group">
            <label>Nombre completo</label>
            <input type="text" name="display_name" value={form.display_name} onChange={handleChange} placeholder="Nombre y apellidos" required />
          </div>
          <div className="form-group">
            <label>Correo electrónico</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="correo@ejemplo.com" required />
          </div>
          <div className="form-group">
            <label>Contraseña</label>
            <input type="password" name="password" value={form.password} onChange={handleChange} placeholder="Contraseña" required />
          </div>
          <div className="form-group">
            <label>Confirmar contraseña</label>
            <input type="password" name="confirm_password" value={form.confirm_password} onChange={handleChange} placeholder="Repita la contraseña" required />
          </div>
          <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
            <UserPlus size={16} /> {loading ? 'Registrando...' : 'Registrarse'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 16 }}>
          ¿Ya tiene cuenta? <Link to="/login">Iniciar sesión</Link>
        </p>
      </div>
    </div>
  );
}
