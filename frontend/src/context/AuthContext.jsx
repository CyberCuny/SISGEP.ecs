import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
      api.get('/users/me/').then((res) => {
        setUser(res.data);
      }).catch(() => {
        setUser(null);
      }).finally(() => setLoading(false));
    } else {
      api.get('/users/me/').then((res) => {
        setUser(res.data);
      }).catch(() => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setUser(null);
      }).finally(() => setLoading(false));
    }
  }, []);

  const login = async (username, password) => {
    const res = await api.post('/users/login/', { username, password });
    if (res.status === 200) {
      try {
        const tokenRes = await api.post('/token/', { username, password });
        localStorage.setItem('access_token', tokenRes.data.access);
        localStorage.setItem('refresh_token', tokenRes.data.refresh);
      } catch {
        // JWT optional; session auth works without it
      }
    }
    setUser(res.data.user);
    return res.data;
  };

  const logout = async () => {
    await api.post('/users/logout/');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
