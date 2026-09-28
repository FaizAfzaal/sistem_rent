import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard, Wrench, Tag, ShoppingCart, CreditCard, RotateCcw,
  Users, LogOut, User, ChevronRight, X, ShoppingBag, Table,
  Inbox, FileText, History, BarChart3, Receipt, Truck, Bell, Camera, ClipboardCheck
} from 'lucide-react';

const adminMenu = [
  { to: '/admin',              icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/alat',               icon: ShoppingBag,     label: 'Form Booking Alat' },
  { to: '/admin/checklist',    icon: ClipboardCheck,  label: 'Checklist Harian' },
  { to: '/admin/bookings',     icon: ShoppingCart,    label: 'Data Booking' },
  { to: '/admin/logbook',      icon: Table,           label: 'Log Book Rental' },
];

const pickupMenu = [
  { to: '/pickup/ready', icon: ShoppingCart, label: 'Daftar Siap Keluar' },
  { to: '/pickup/rented', icon: Truck, label: 'Barang Sedang Disewa' },
  { to: '/pickup/history', icon: History, label: 'Riwayat Pengeluaran' },
];

const returnMenu = [
  { to: '/return/rented', icon: RotateCcw, label: 'Barang Sedang Disewa' },
  { to: '/return/ready', icon: Bell, label: 'Siap Dikembalikan' },
  { to: '/return/history', icon: History, label: 'Riwayat Pengembalian' },
  { to: '/return/docs', icon: Camera, label: 'Dokumentasi Barang' },
];

const keuanganMenu = [
  { to: '/finance',                 icon: LayoutDashboard, label: 'Dashboard Finance' },
  { to: '/admin/customers',         icon: Users,           label: 'Data Customer' },
  { to: '/admin/alat',              icon: Wrench,          label: 'Data Alat' },
  { to: '/admin/kategori',          icon: Tag,             label: 'Kategori Alat' },
  { to: '/finance/booking-masuk',   icon: Inbox,           label: 'Selesai Sewa' },
  { to: '/finance/pembayaran',      icon: CreditCard,      label: 'Pembayaran' },
  { to: '/finance/invoice',         icon: FileText,        label: 'Invoice' },
  { to: '/finance/riwayat-transaksi', icon: History,       label: 'Riwayat Transaksi' },
  { to: '/finance/laporan-keuangan',  icon: BarChart3,     label: 'Laporan Keuangan' },
];

const customerMenu = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/alat',       icon: Wrench,          label: 'Sewa Alat' },
  { to: '/bookings',   icon: ShoppingCart,    label: 'Booking Saya' },
  { to: '/pembayaran', icon: CreditCard,      label: 'Pembayaran' },
];

export default function Sidebar({ mobileOpen, onClose }) {
  const { user, logout, activeModule, clearModule, isAdmin1, isAdminBooking, isAdminPickup, isAdminReturn, isKeuangan } = useAuth();
  const navigate = useNavigate();

  let menu = customerMenu;
  if (isKeuangan) {
    menu = keuanganMenu;
  } else if (isAdmin1) {
    if (activeModule === 'PICKUP') menu = pickupMenu;
    else if (activeModule === 'RETURN') menu = returnMenu;
    else menu = adminMenu;
  } else if (isAdminBooking) menu = adminMenu;
  else if (isAdminPickup) menu = pickupMenu;
  else if (isAdminReturn) menu = returnMenu;

  const handleLogout = () => { logout(); navigate('/login'); };

  const handleSwitchModule = () => {
    clearModule();
    onClose && onClose();
    navigate('/admin/select-module');
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={onClose} />
      )}

      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-slate-900 text-slate-300 border-r border-slate-800/80 z-50 flex flex-col
        transition-transform duration-300 ease-in-out shadow-2xl
        md:translate-x-0 md:sticky md:top-0 md:h-screen
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo (Clickable -> redirect to /admin/select-module) */}
        <div className="flex items-center justify-between px-6 h-20 border-b border-slate-800/80 flex-shrink-0">
          <div 
            onClick={handleSwitchModule}
            className="flex items-center gap-3 cursor-pointer group transition-all"
            title="Kembali ke Portal Pilihan Modul Admin"
          >
            <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform">
              <Wrench className="h-5 w-5 text-white stroke-[2.5]" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-white group-hover:text-indigo-200 transition-colors">Rental<span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">Hub</span></span>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest -mt-0.5">Heavy Equipment</span>
            </div>
          </div>
          <button onClick={onClose} className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User Info Card */}
        <div className="px-4 py-4 border-b border-slate-800/80 flex-shrink-0">
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-slate-800/90 to-indigo-950/40 border border-slate-700/50 shadow-inner">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-extrabold text-sm shadow-md shadow-indigo-500/20 flex-shrink-0">
              {user?.nama?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{user?.nama}</p>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-md uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                {isAdmin1 ? `Admin 1 (${activeModule || 'Pemesanan'})` : (typeof user?.role === 'object' ? user?.role?.nama_role : (user?.role || ''))}
              </span>
            </div>
          </div>
        </div>

        {/* Nav Menu */}
        <nav className="flex-1 overflow-y-auto px-3.5 py-4 space-y-1">
          {menu.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/admin' || to === '/dashboard'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-bold transition-all duration-200 group relative ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'text-slate-400 hover:bg-slate-800/70 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`h-4.5 w-4.5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400'}`} />
                  <span className="flex-1 truncate">{label}</span>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white shadow-sm shadow-white" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="px-3.5 py-4 border-t border-slate-800/80 space-y-1 flex-shrink-0">
          {isAdmin1 && (
            <button
              onClick={handleSwitchModule}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-indigo-300 hover:bg-indigo-600/20 transition-all cursor-pointer mb-1 border border-indigo-500/30"
            >
              <ChevronRight className="h-4 w-4 text-indigo-400" />
              Pilih Modul Portal
            </button>
          )}

          <NavLink
            to="/profile"
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                isActive ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800/70 hover:text-white'
              }`
            }
          >
            <User className="h-4 w-4 text-slate-400" />
            Profil Saya
          </NavLink>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            Keluar Sistem
          </button>
        </div>
      </aside>
    </>
  );
}
