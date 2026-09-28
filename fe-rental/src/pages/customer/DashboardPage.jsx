import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import AppLayout from '../../components/layout/AppLayout';
import StatsCard from '../../components/common/StatsCard';
import api from '../../lib/api';
import { ShoppingCart, CreditCard, CheckCircle, Clock, Wrench, ArrowRight, ChevronRight } from 'lucide-react';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats]   = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/bookings?size=100');
        const all = res.data.data || [];
        setRecent(all.slice(0, 5));
        setStats({
          total:  all.length,
          pending: all.filter(b => b.status === 'pending').length,
          aktif:   all.filter(b => ['dikonfirmasi', 'disewa'].includes(b.status)).length,
          selesai: all.filter(b => b.status === 'selesai').length,
        });
      } catch {}
      setLoading(false);
    })();
  }, []);

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        {/* Welcome hero */}
        <div className="relative bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 rounded-2xl p-6 sm:p-8 text-white overflow-hidden">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute bottom-0 left-1/3 w-32 h-32 bg-violet-400/20 rounded-full blur-2xl" />
          </div>
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-indigo-200 text-sm font-medium">Selamat datang kembali 👋</p>
              <h1 className="text-2xl sm:text-3xl font-bold mt-1">{user?.nama}</h1>
              <p className="text-indigo-200 text-sm mt-1">Kelola penyewaan alat Anda dengan mudah</p>
            </div>
            <Link
              to="/alat"
              className="inline-flex items-center gap-2 bg-white text-indigo-700 font-semibold text-sm px-5 py-3 rounded-xl hover:bg-indigo-50 transition-colors shadow-lg flex-shrink-0"
            >
              <Wrench className="h-4 w-4" />
              Sewa Alat Sekarang
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {loading ? <LoadingSpinner className="py-12" /> : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard label="Total Booking" value={stats?.total}   icon={<ShoppingCart />} color="indigo" />
              <StatsCard label="Menunggu"       value={stats?.pending} icon={<Clock />}        color="amber" />
              <StatsCard label="Sedang Aktif"   value={stats?.aktif}   icon={<CreditCard />}   color="violet" />
              <StatsCard label="Selesai"        value={stats?.selesai} icon={<CheckCircle />}  color="emerald" />
            </div>

            {/* Recent bookings */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-gray-900">Booking Terbaru</h2>
                <Link to="/bookings" className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1">
                  Lihat semua <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              {recent.length === 0 ? (
                <div className="text-center py-10">
                  <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <ShoppingCart className="h-7 w-7 text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-medium mb-1">Belum ada booking</p>
                  <p className="text-gray-400 text-sm mb-4">Mulai sewa alat sekarang</p>
                  <Link to="/alat" className="btn-primary text-sm py-2 px-4">
                    <Wrench className="h-4 w-4" /> Mulai Sewa
                  </Link>
                </div>
              ) : (
                <div className="space-y-1">
                  {recent.map(b => (
                    <Link
                      key={b.id}
                      to={`/bookings/${b.id}`}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                        <ShoppingCart className="h-4 w-4 text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{b.kode_booking}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(b.tanggal_mulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} —{' '}
                          {new Date(b.tanggal_selesai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="text-right hidden sm:block">
                          <p className="text-sm font-bold text-gray-900">Rp {Number(b.total_harga).toLocaleString('id-ID')}</p>
                          <span className={`badge-${b.status}`}>{b.status}</span>
                        </div>
                        <span className={`badge-${b.status} sm:hidden`}>{b.status}</span>
                        <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-indigo-400 transition-colors" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
