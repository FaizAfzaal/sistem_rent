import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import {
  ShoppingCart, Users, Wrench, TrendingUp, Clock, CreditCard, ArrowRight, CheckCircle2,
  AlertTriangle, Truck, RotateCcw, Calendar, Activity, ChevronRight, Plus, PackageCheck,
  ShieldAlert, Award, FileText, AlertCircle
} from 'lucide-react';

export default function AdminDashboard() {
  const { isKeuangan } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/dashboard/operational');
      setData(res.data.data);
    } catch (err) {
      console.error('Error loading Admin Booking Dashboard data:', err);
      setError(err.response?.data?.message || 'Gagal mengambil data dashboard operasional.');
    } finally {
      setLoading(false);
    }
  };

  let todayFormatted = 'Hari ini';
  try {
    todayFormatted = new Date().toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  } catch (err) {
    console.error('Error formatting today date:', err);
  }

  const stats = data?.stats || {};
  const pipeline = data?.pipeline || {};
  const alerts = data?.alerts || {};
  const scheduleList = data?.scheduleList || [];
  const topEquipment = data?.topEquipment || [];
  const activityLog = data?.activityLog || [];
  const recentBookings = data?.recentBookings || [];

  return (
    <AppLayout title="Dashboard Admin Booking">
      <div className="animate-fade-in space-y-6">

        {/* TOP BAR / HERO BANNER */}
        <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-indigo-900/30 relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-xs font-semibold border border-indigo-500/30 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> {todayFormatted}
                </span>
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-semibold border border-emerald-500/30">
                  ● Sistem Operational Active
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Dashboard Admin Booking 👋
              </h1>
              <p className="text-sm text-slate-300 mt-1 max-w-xl">
                Ringkasan statistik booking hari ini, monitoring transaksi aktif, dan kelola pemesanan alat berat.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/alat"
                className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98] transition flex items-center gap-2 cursor-pointer"
              >
                <Plus className="h-4 w-4" /> + Buat Booking Baru
              </Link>
            </div>
          </div>
        </div>

        {/* ERROR NOTIFICATION BANNER */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={fetchDashboardData}
              className="px-3 py-1 bg-rose-600 text-white font-bold rounded-lg text-xs hover:bg-rose-700 transition cursor-pointer"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {loading ? (
          <LoadingSpinner className="py-24" />
        ) : (
          <>
            {/* 1. STATISTIK UTAMA (4 Metric Cards Grid) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Card 1: Total Booking */}
              <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Booking</span>
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    <ShoppingCart className="h-5 w-5" />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900">{stats.totalBooking || 0} <span className="text-sm font-bold text-gray-500">Booking</span></h3>
                  <p className="text-xs font-semibold text-emerald-600 mt-1 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> +{stats.monthBookingCount || 0} booking bulan ini
                  </p>
                </div>
              </div>

              {/* Card 2: Barang Sedang Disewa (Booking Aktif) */}
              <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Booking Aktif</span>
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <Truck className="h-5 w-5" />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900">{stats.barangSedangDisewaCount || 0} <span className="text-sm font-bold text-gray-500">Unit Aktif</span></h3>
                  <p className="text-xs font-medium text-gray-500 mt-1">Alat sedang digunakan</p>
                </div>
              </div>

              {/* Card 3: Menunggu Konfirmasi / Pengeluaran */}
              <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Menunggu Konfirmasi</span>
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                    <PackageCheck className="h-5 w-5" />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900">{stats.waitingPickupCount || 0} <span className="text-sm font-bold text-gray-500">Menunggu</span></h3>
                  <p className="text-xs font-medium text-amber-700 mt-1">Perlu proses konfirmasi</p>
                </div>
              </div>

              {/* Card 4: Pengembalian Hari Ini */}
              <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Kembali Hari Ini</span>
                  <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                    <RotateCcw className="h-5 w-5" />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900">{stats.pengembalianHariIniCount || 0} <span className="text-sm font-bold text-gray-500">Unit Kembali</span></h3>
                  <p className="text-xs font-medium text-purple-700 mt-1">Jatuh tempo hari ini</p>
                </div>
              </div>

            </div>

            {/* 2. ALERT SYSTEM (Operational Warnings) */}
            {(alerts.jatuhTempoHariIni > 0 || alerts.invoiceBelumDibayar > 0 || alerts.terlambatKembali > 0) && (
              <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-rose-500/10 border border-amber-200/80 rounded-3xl p-5 shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-amber-600 flex-shrink-0" />
                  <h2 className="font-extrabold text-amber-900 text-sm uppercase tracking-wider">Perhatian & Peringatan Booking</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {alerts.jatuhTempoHariIni > 0 && (
                    <div className="bg-white/80 p-3.5 rounded-2xl border border-amber-200 text-xs flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 font-black flex items-center justify-center flex-shrink-0 text-sm">
                        {alerts.jatuhTempoHariIni}
                      </span>
                      <div>
                        <p className="font-bold text-amber-900">Alat Jatuh Tempo Hari Ini</p>
                        <p className="text-gray-500 text-[11px]">Siapkan proses penerimaan pengembalian</p>
                      </div>
                    </div>
                  )}

                  {alerts.invoiceBelumDibayar > 0 && (
                    <div className="bg-white/80 p-3.5 rounded-2xl border border-blue-200 text-xs flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 font-black flex items-center justify-center flex-shrink-0 text-sm">
                        {alerts.invoiceBelumDibayar}
                      </span>
                      <div>
                        <p className="font-bold text-blue-900">Invoice Belum Dibayar</p>
                        <p className="text-gray-500 text-[11px]">Memerlukan konfirmasi pembayaran finance</p>
                      </div>
                    </div>
                  )}

                  {alerts.terlambatKembali > 0 && (
                    <div className="bg-white/80 p-3.5 rounded-2xl border border-rose-200 text-xs flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl bg-rose-100 text-rose-800 font-black flex items-center justify-center flex-shrink-0 text-sm">
                        {alerts.terlambatKembali}
                      </span>
                      <div>
                        <p className="font-bold text-rose-900">Alat Terlambat Kembali</p>
                        <p className="text-gray-500 text-[11px]">Hubungi customer via WhatsApp</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}





            {/* 5. ALAT PALING SERING DISEWA & AKTIVITAS TERBARU */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* ALAT PALING SERING DISEWA */}
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-amber-500" />
                    <div>
                      <h2 className="font-extrabold text-gray-900 text-base">Alat Paling Sering Disewa</h2>
                      <p className="text-xs text-gray-500">Peringkat unit berdasarkan frekuensi rental</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {topEquipment.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-6">Belum ada data unit alat berat.</p>
                  ) : (
                    topEquipment.map((eq, idx) => (
                      <div key={eq.alat_id} className="p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200/60 flex items-center justify-between transition">
                        <div className="flex items-center gap-3">
                          <span className={`w-7 h-7 rounded-xl font-extrabold text-xs flex items-center justify-center ${
                            idx === 0 ? 'bg-amber-100 text-amber-800' : idx === 1 ? 'bg-slate-200 text-slate-700' : 'bg-orange-100 text-orange-800'
                          }`}>
                            #{idx + 1}
                          </span>
                          <div>
                            <p className="text-xs font-bold text-gray-900">{eq.nama_alat}</p>
                            <p className="text-[11px] font-mono text-gray-500">{eq.kode_alat}</p>
                          </div>
                        </div>

                        <span className="px-3 py-1 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-full">
                          {eq.total_tx} Transaksi
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* LOG AKTIVITAS ADMIN TERBARU */}
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-indigo-600" />
                    <div>
                      <h2 className="font-extrabold text-gray-900 text-base">Aktivitas Terbaru Admin</h2>
                      <p className="text-xs text-gray-500">Log operasional tim secara real-time</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {activityLog.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-6">Belum ada aktivitas terbaru.</p>
                  ) : (
                    activityLog.map(act => (
                      <div key={act.id} className="flex items-start gap-3 text-xs">
                        <span className="px-2 py-1 bg-slate-100 text-gray-600 font-mono font-bold rounded-lg text-[10px] flex-shrink-0">
                          {act.time}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900">{act.actor}</p>
                          <p className="text-gray-600 truncate">{act.action}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* 6. BOOKING TERBARU (TABLE WITH BADGES & FALLBACK EMPTY STATE) */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden space-y-4 p-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <h2 className="font-extrabold text-gray-900 text-base">Booking Terbaru</h2>
                  <p className="text-xs text-gray-500">Daftar transaksi booking rental terkini</p>
                </div>
                <Link to="/admin/bookings" className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">
                  Lihat Semua Booking <ChevronRight className="h-4 w-4" />
                </Link>
              </div>

              {recentBookings.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-gray-400">
                    <ShoppingCart className="h-6 w-6" />
                  </div>
                  <p className="text-xs font-bold text-gray-700">Belum ada data booking</p>
                  <p className="text-[11px] text-gray-400">Transaksi booking baru akan muncul di sini.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Kode Booking</th>
                        <th className="px-4 py-3">Customer</th>
                        <th className="px-4 py-3">Alat</th>
                        <th className="px-4 py-3">Tanggal Rental</th>
                        <th className="px-4 py-3">Status</th>
                        {isKeuangan && <th className="px-4 py-3 text-right">Total</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      {recentBookings.map(b => {
                        const custName = b.customer?.full_name || b.user?.nama || 'Customer';
                        const alatNames = b.details?.map(d => d.alat?.nama_alat).filter(Boolean).join(', ') || 'Alat Heavy';

                        return (
                          <tr key={b.id} className="hover:bg-slate-50/60 transition">
                            <td className="px-4 py-3 font-mono font-bold text-indigo-600">
                              {b.kode_booking}
                            </td>
                            <td className="px-4 py-3 font-extrabold text-gray-900">
                              {custName}
                            </td>
                            <td className="px-4 py-3 text-gray-700 max-w-xs truncate">
                              {alatNames}
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {b.tanggal_mulai} s/d {b.tanggal_selesai}
                            </td>
                            <td className="px-4 py-3">
                              {b.status === 'SELESAI_DISEWA' || b.status === 'selesai' ? (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                                  ✓ SELESAI
                                </span>
                              ) : b.status === 'BARANG_SEDANG_DISEWA' || b.status === 'disewa' ? (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800">
                                  🚜 SEDANG DISEWA
                                </span>
                              ) : b.status === 'WAITING_PICKUP' || b.status === 'dikonfirmasi' ? (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800">
                                  ⏳ MENUNGGU
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800">
                                  {b.status}
                                </span>
                              )}
                            </td>
                            {isKeuangan && (
                              <td className="px-4 py-3 text-right font-bold text-gray-900">
                                {b.total_harga ? `Rp ${Number(b.total_harga).toLocaleString('id-ID')}` : '-'}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </>
        )}

      </div>
    </AppLayout>
  );
}
