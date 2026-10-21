import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Menu, Bell, CheckCheck, Clock, ExternalLink, X, ShoppingBag, CreditCard, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef(null);
  const { user, isAdmin, isKeuangan } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const getIconComponent = (iconName) => {
    switch (iconName) {
      case 'ShoppingBag': return ShoppingBag;
      case 'Truck': return Truck;
      case 'Clock': return Clock;
      case 'AlertTriangle': return AlertTriangle;
      case 'XCircle': return XCircle;
      case 'CreditCard': return CreditCard;
      case 'FileText': return FileText;
      case 'CheckCircle2':
      default: return CheckCircle2;
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      const items = (res.data.data || []).map(n => ({
        ...n,
        iconComponent: getIconComponent(n.icon),
      }));
      setNotifications(items);
    } catch {
      // Fallback if network issue
    }
  };

  const unreadCount = notifications.filter(n => n.unread).length;

  // Handle click outside notification dropdown to close
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  };

  const handleNotificationClick = (link, id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));
    setShowNotifications(false);
    if (link) navigate(link);
  };

  return (
    <div className="flex h-screen bg-slate-900/5 overflow-hidden">
      <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Glassmorphic Top Navbar */}
        <header className="h-20 bg-white/80 backdrop-blur-xl border-b border-gray-200/60 flex items-center justify-between px-4 sm:px-8 flex-shrink-0 z-30 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs font-extrabold text-slate-500 bg-slate-100/80 border border-slate-200/60 px-3.5 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              PT SCAL TECHNIC SERVICES
            </div>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            {/* INTERACTIVE NOTIFICATION BELL & DROPDOWN */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={`relative p-2.5 rounded-2xl transition-all cursor-pointer border border-slate-200/60 ${
                  showNotifications
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20'
                    : 'bg-slate-100/80 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600'
                }`}
                title="Pemberitahuan Sistem"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white ring-2 ring-white animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* NOTIFICATIONS DROPDOWN MENU */}
              {showNotifications && (
                <div className="absolute right-[-0.5rem] sm:right-0 mt-3 w-[calc(100vw-2rem)] sm:w-96 max-w-sm rounded-3xl bg-white border border-gray-100 shadow-2xl z-50 animate-scale-in overflow-hidden">
                  {/* Dropdown Header */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-slate-900">Notifikasi System</h3>
                      {unreadCount > 0 && (
                        <span className="bg-indigo-100 text-indigo-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                          {unreadCount} Baru
                        </span>
                      )}
                    </div>

                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <CheckCheck className="h-3.5 w-3.5" /> Tandai Dibaca
                      </button>
                    )}
                  </div>

                  {/* Notification Items List */}
                  <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                    {notifications.length > 0 ? (
                      notifications.map(n => {
                        const Icon = n.iconComponent || CheckCircle2;
                        return (
                          <div
                            key={n.id}
                            onClick={() => handleNotificationClick(n.link, n.id)}
                            className={`p-4 hover:bg-indigo-50/50 transition-all cursor-pointer flex gap-3 items-start group ${
                              n.unread ? 'bg-indigo-50/20' : ''
                            }`}
                          >
                            <div className={`p-2.5 rounded-2xl ${n.color} flex-shrink-0 group-hover:scale-110 transition-transform`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <p className={`text-xs font-bold text-slate-900 truncate ${n.unread ? 'font-black text-indigo-950' : ''}`}>
                                  {n.title}
                                </p>
                                {n.unread && (
                                  <span className="w-2 h-2 rounded-full bg-indigo-600 flex-shrink-0"></span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed line-clamp-2">
                                {n.desc}
                              </p>
                              <div className="flex items-center gap-1 mt-1.5 text-[10px] font-medium text-slate-400">
                                <Clock className="h-3 w-3 text-slate-400" />
                                <span>{n.time}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-8 text-center text-slate-400 text-xs">
                        Tidak ada pemberitahuan baru saat ini.
                      </div>
                    )}
                  </div>

                  {/* Dropdown Footer */}
                  <div className="p-3 bg-slate-50 border-t border-gray-100 text-center">
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors"
                    >
                      Tutup Notifikasi
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Badge */}
            <div 
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2 sm:gap-3 p-1.5 pr-2.5 sm:pr-3 rounded-2xl bg-white border border-gray-200/80 shadow-sm hover:shadow-md transition-all cursor-pointer"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white font-extrabold text-xs sm:text-sm shadow-md shadow-indigo-500/20">
                {user?.nama?.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-extrabold text-slate-900 leading-tight">{user?.nama}</p>
                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                  {typeof user?.role === 'object' ? user?.role?.nama_role : (user?.role || '')}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content Container */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
