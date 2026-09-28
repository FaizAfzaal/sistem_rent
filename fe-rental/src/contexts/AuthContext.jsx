import { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  const [activeModule, setActiveModuleState] = useState(() => {
    try {
      return localStorage.getItem('activeModule') || null;
    } catch {
      return null;
    }
  });

  const selectModule = (moduleKey) => {
    setActiveModuleState(moduleKey);
    if (moduleKey) {
      localStorage.setItem('activeModule', moduleKey);
    } else {
      localStorage.removeItem('activeModule');
    }
  };

  const clearModule = () => {
    setActiveModuleState(null);
    localStorage.removeItem('activeModule');
  };

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      const { token, user: userData } = res.data.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      
      const roleRaw = typeof userData?.role === 'object' ? (userData?.role?.nama_role || '') : String(userData?.role || '');
      const roleLower = roleRaw.toLowerCase().trim();
      const isFin = ['keuangan', 'finance', 'admin_finance', 'admin finance'].includes(roleLower) || roleLower.includes('finance') || roleLower.includes('keuangan');
      if (isFin) {
        clearModule();
      }
      
      return { success: true, role: userData.role };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Login gagal' };
    } finally {
      setLoading(false);
    }
  };

  const register = async (data) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/register', data);
      return { success: true, data: res.data };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Registrasi gagal' };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('activeModule');
    setUser(null);
    setActiveModuleState(null);
  };

  const refreshProfile = async () => {
    try {
      const res = await api.get('/auth/profile');
      const updated = {
        id: res.data.data.id,
        nama: res.data.data.nama,
        email: res.data.data.email,
        no_hp: res.data.data.no_hp,
        alamat: res.data.data.alamat,
        foto: res.data.data.foto,
        status: res.data.data.status,
        role: res.data.data.role?.nama_role,
      };
      localStorage.setItem('user', JSON.stringify(updated));
      setUser(updated);
    } catch {}
  };

  const roleRaw = typeof user?.role === 'object' ? (user?.role?.nama_role || '') : String(user?.role || '');
  const roleLower = roleRaw.toLowerCase().trim();
  const isKeuangan = ['keuangan', 'finance', 'admin_finance', 'admin finance'].includes(roleLower) || roleLower.includes('finance') || roleLower.includes('keuangan');
  const isAdminFinance = isKeuangan;
  const isCustomer = roleLower === 'customer';

  // Admin 1 (Pemesanan + Pengeluaran + Penerimaan) single account role
  const isAdmin1 = Boolean(user) && !isKeuangan && !isCustomer;

  // Active module checks
  const isAdminBooking = isKeuangan ? false : (isAdmin1 ? (activeModule ? activeModule === 'BOOKING' : true) : true);
  const isAdminPickup = isKeuangan ? false : (isAdmin1 ? (activeModule === 'PICKUP') : false);
  const isAdminReturn = isKeuangan ? false : (isAdmin1 ? (activeModule === 'RETURN') : false);

  const isAdmin = isAdmin1; // Admin alias
  const isStaff = isAdmin1 || isKeuangan;

  return (
    <AuthContext.Provider value={{
      user, loading, login, register, logout, refreshProfile,
      activeModule, selectModule, clearModule,
      isAdmin1, isAdmin, isAdminBooking, isAdminPickup, isAdminReturn, isKeuangan, isAdminFinance, isStaff
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
