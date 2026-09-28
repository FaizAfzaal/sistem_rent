import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import FinanceStats from '../../components/finance/FinanceStats';
import api from '../../lib/api';
import {
  Inbox, CreditCard, FileText, BarChart3, TrendingUp, ArrowRight,
  CheckCircle2, Clock, DollarSign, Calendar, ShieldCheck
} from 'lucide-react';

export default function FinanceDashboardPage() {
  const navigate = useNavigate();
  const [recentBookings, setRecentBookings] = useState([]);
  const [stats, setStats] = useState({ baru: 0, menunggu: 0, lunas: 0, totalIncome: 0 });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const res = await api.get('/bookings');
      if (res.data?.data && Array.isArray(res.data.data)) {
        const rows = res.data.data;
        const formatted = rows.slice(0, 5).map(b => {
          const detail = b.details?.[0];
          return {
            kode: b.kode_booking || `RB-${b.id}`,
            customer: b.user?.nama || 'Customer',
            barang: detail?.alat?.nama_alat || 'Alat Rental',
            total: `Rp ${Number(b.total_harga || 0).toLocaleString('id-ID')}`,
            status: b.status === 'lunas' ? 'Lunas' : b.status === 'dikonfirmasi' ? 'Dikonfirmasi' : 'Menunggu Pembayaran',
            badge: b.status === 'lunas' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
          };
        });

        const baru = rows.length;
        const menunggu = rows.filter(r => r.status === 'menunggu_pembayaran').length;
        const lunas = rows.filter(r => r.status === 'lunas' || r.status === 'dikonfirmasi').length;
        const totalIncome = rows
          .filter(r => r.status === 'lunas' || r.status === 'dikonfirmasi')
          .reduce((acc, curr) => acc + Number(curr.total_harga || 0), 0);

        setRecentBookings(formatted);
        setStats({ baru, menunggu, lunas, totalIncome });
      }
    } catch {}
  };

  const quickShortcuts = [
    { title: 'Selesai Sewa', desc: 'Lihat semua data booking dari Admin Booking', icon: Inbox, path: '/finance/booking-masuk', color: 'bg-indigo-600 text-white' },
    { title: 'Kelola Pembayaran', desc: 'Konfirmasi atau tolak bukti transfer customer', icon: CreditCard, path: '/finance/pembayaran', color: 'bg-emerald-600 text-white' },
    { title: 'Invoice Center', desc: 'Cetak & kirim invoice resmi INV-2026-xxx', icon: FileText, path: '/finance/invoice', color: 'bg-purple-600 text-white' },
    { title: 'Laporan Keuangan', desc: 'Rekapitulasi pendapatan & arus kas bulanan', icon: BarChart3, path: '/finance/laporan-keuangan', color: 'bg-blue-600 text-white' },
  ];

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in pb-12">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
              Role: Admin Finance
            </span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 mt-1">Dashboard Finance</h1>
          <p className="text-sm text-gray-500">
            Pusat kendali keuangan, verifikasi pembayaran, dan pembuatan invoice rental.
          </p>
        </div>

        {/* Stats Indicators */}
        <FinanceStats
          bookingBaru={stats.baru}
          menungguPembayaran={stats.menunggu}
          sudahLunas={stats.lunas}
          pendapatanBulanIni={stats.totalIncome}
        />

        {/* Quick Shortcuts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickShortcuts.map((sc, idx) => {
            const Icon = sc.icon;
            return (
              <div
                key={idx}
                onClick={() => navigate(sc.path)}
                className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${sc.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                    {sc.title}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{sc.desc}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-50 flex items-center text-xs font-bold text-indigo-600 group-hover:translate-x-1 transition-transform">
                  Akses Menu <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Incoming Bookings Quick Widget */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-gray-900">Selesai Sewa Terkini</h3>
              <p className="text-xs text-gray-400">Daftar booking terbaru yang memerlukan pemrosesan invoice & pembayaran</p>
            </div>
            <button
              onClick={() => navigate('/finance/booking-masuk')}
              className="text-xs font-bold text-indigo-600 hover:underline"
            >
              Lihat Semua
            </button>
          </div>
          <div className="space-y-3">
            {recentBookings.map((b) => (
              <div
                key={b.kode}
                onClick={() => navigate('/finance/booking-masuk')}
                className="p-3 bg-gray-50 rounded-xl hover:bg-indigo-50/50 transition-colors cursor-pointer border border-gray-100 flex items-center justify-between"
              >
                <div>
                  <p className="text-xs font-extrabold text-indigo-600">{b.kode}</p>
                  <p className="text-xs font-bold text-gray-900">{b.customer}</p>
                  <p className="text-[11px] text-gray-500">{b.barang}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-gray-900">{b.total}</p>
                  <span className={`inline-block text-[10px] px-2 py-0.5 rounded-md font-bold ${b.badge}`}>
                    {b.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => navigate('/finance/booking-masuk')}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            Buka Halaman Selesai Sewa
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
