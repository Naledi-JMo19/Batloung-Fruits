import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api.js';

const AuthContext = createContext(null);
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));

  const logout = () => { localStorage.removeItem('token'); localStorage.removeItem('user'); setUser(null); };
  useEffect(() => { window.addEventListener('auth:logout', logout); return () => window.removeEventListener('auth:logout', logout); }, []);

  const login = async (username, password) => {
    const data = await api('/auth/login', { method: 'POST', body: { username, password } });
    localStorage.setItem('token', data.token); localStorage.setItem('user', JSON.stringify(data.user)); setUser(data.user);
  };

  return <AuthContext.Provider value={{ user, isAdmin: user?.role === 'Administrator', login, logout }}>{children}</AuthContext.Provider>;
}
