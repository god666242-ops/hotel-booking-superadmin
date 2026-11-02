'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api, { clearToken, getToken, setToken } from '@/lib/api';

const AuthContext = createContext(null);

export function SuperAdminAuthProvider({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) { setLoading(false); return; }
    api.me().then((d) => setUser(d.user || d)).catch(() => clearToken()).finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await api.login(email, password);
    setToken(data.token);
    setUser(data.user);
    router.push('/');
  }, [router]);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    router.push('/login');
  }, [router]);

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export const useSuperAdminAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useSuperAdminAuth must be used inside SuperAdminAuthProvider');
  return ctx;
};
