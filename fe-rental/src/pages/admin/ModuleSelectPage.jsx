import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import ScLogoIcon from '../../components/common/ScLogoIcon';
import { UserCheck, Truck, RotateCcw, Wrench, ShieldCheck, LogOut, Activity, Calendar, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function ModuleSelectPage() {
  const { user, activeModule, selectModule, logout } = useAuth();
  const navigate = useNavigate();
  const [pipeline, setPipeline] = useState({});
  const [todaySchedule, setTodaySchedule] = useState([]);
  const [overdueList, setOverdueList] = useState([]);
  const [completedList, setCompletedList] = useState([]);
  const [loadingPipeline, setLoadingPipeline] = useState(true);

  useEffect(() => {
    fetchPipelineData();
  }, []);

  const fetchPipelineData = async () => {
    setLoadingPipeline(true);
    try {
      const res = await api.get('/dashboard/operational');
      const data = res.data?.data || {};
      setPipeline(data.pipeline || {});
      setTodaySchedule(data.todaySchedule || data.scheduleList?.filter(s => s.type !== 'terlambat') || []);
      setOverdueList(data.overdueList || data.scheduleList?.filter(s => s.type === 'terlambat') || []);
      setCompletedList(data.completedList || []);
    } catch (err) {
      console.error('Error fetching pipeline data:', err);
    } finally {
      setLoadingPipeline(false);
    }
  };

  const handleSelectModule = (moduleKey, targetRoute) => {
    selectModule(moduleKey);
    navigate(targetRoute);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  let todayFormatted = 'Hari Ini';
  try {
    todayFormatted = new Date().toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  } catch (err) {
    console.error('Error formatting date:', err);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 font-['Plus_Jakarta_Sans',sans-serif] text-slate-100 flex flex-col justify-between p-4 sm:p-8 relative overflow-hidden">
      {/* Ambient Glowing Orbs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar Header */}
      <header className="relative z-10 max-w-6xl mx-auto w-full flex items-center justify-between py-4 border-b border-slate-800/80">
        <div 
          onClick={() => navigate('/admin/select-module')} 
          className="flex items-center gap-3 cursor-pointer group transition-all"
          title="Portal Admin 1"
        >
          <ScLogoIcon className="w-10 h-10 group-hover:scale-105 transition-transform" innerTextSize="text-base" />
          <div>
            <span className="text-xl font-black tracking-tight text-white group-hover:text-indigo-200 transition-colors">Rental<span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">Hub</span></span>
            <span className="block text-[10px] font-bold text-indigo-300 uppercase tracking-widest -mt-0.5">Rental Sampling Equipment</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-3 bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-full text-xs font-semibold">
            <div className="w-6 h-6 rounded-full bg-indigo-500/30 text-indigo-300 flex items-center justify-center font-bold text-xs">
              {user?.nama?.charAt(0).toUpperCase() || 'A'}
            </div>
            <span>{user?.nama}</span>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-xs font-bold text-red-300 transition-all cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Keluar</span>
          </button>
        </div>
      </header>

      {/* Navigation & Status Section */}
      <main className="relative z-10 max-w-6xl mx-auto w-full flex-1 pt-4 pb-8 space-y-6">
        {/* Top Module Navigation Pill Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 max-w-3xl mx-auto">
          {/* Admin Pemesanan Button */}
          <button
            onClick={() => handleSelectModule('BOOKING', '/admin')}
            className={`flex items-center gap-2.5 px-4 py-2 rounded-full border text-xs sm:text-sm font-bold transition-all duration-300 cursor-pointer shadow-md ${
              activeModule === 'BOOKING' || !activeModule
                ? 'bg-indigo-950/80 border-indigo-500 text-indigo-200 shadow-indigo-500/25 ring-2 ring-indigo-500/40 scale-105'
                : 'bg-slate-900/60 border-indigo-500/30 text-indigo-300/80 hover:text-indigo-100 hover:bg-indigo-950/60 hover:border-indigo-400 hover:scale-105'
            }`}
          >
            <UserCheck className="h-4 w-4 text-indigo-400" />
            <span>Admin Pemesanan</span>
          </button>

          {/* Admin Pengeluaran Button */}
          <button
            onClick={() => handleSelectModule('PICKUP', '/pickup/ready')}
            className={`flex items-center gap-2.5 px-4 py-2 rounded-full border text-xs sm:text-sm font-bold transition-all duration-300 cursor-pointer shadow-md ${
              activeModule === 'PICKUP'
                ? 'bg-amber-950/80 border-amber-500 text-amber-200 shadow-amber-500/25 ring-2 ring-amber-500/40 scale-105'
                : 'bg-slate-900/60 border-amber-500/30 text-amber-300/80 hover:text-amber-100 hover:bg-amber-950/60 hover:border-amber-400 hover:scale-105'
            }`}
          >
            <Truck className="h-4 w-4 text-amber-400" />
            <span>Admin Pengeluaran</span>
          </button>

          {/* Admin Penerimaan Button */}
          <button
            onClick={() => handleSelectModule('RETURN', '/return/rented')}
            className={`flex items-center gap-2.5 px-4 py-2 rounded-full border text-xs sm:text-sm font-bold transition-all duration-300 cursor-pointer shadow-md ${
              activeModule === 'RETURN'
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200 shadow-emerald-500/25 ring-2 ring-emerald-500/40 scale-105'
                : 'bg-slate-900/60 border-emerald-500/30 text-emerald-300/80 hover:text-emerald-100 hover:bg-emerald-950/60 hover:border-emerald-400 hover:scale-105'
            }`}
          >
            <RotateCcw className="h-4 w-4 text-emerald-400" />
            <span>Admin Penerimaan</span>
          </button>
        </div>

        {/* Status Operasional Rental (Pipeline Workflow) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4 max-w-5xl mx-auto backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-800/80 pb-3">
            <div>
              <h2 className="font-extrabold text-white text-base sm:text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-indigo-400" />
                Status Operasional Rental
              </h2>
              <p className="text-xs text-slate-400">Pipeline dan tahapan aktivitas penyewaan alat sampling laboratorium</p>
            </div>
            <span className="text-[11px] font-semibold text-slate-400 bg-slate-800/60 px-3 py-1 rounded-full w-fit border border-slate-700/50">
              Live Real-time System
            </span>
          </div>

          {loadingPipeline ? (
            <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
              Memuat status operasional rental...
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Stage 1: Booking Baru */}
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-indigo-500/20 text-center space-y-1 hover:border-indigo-500/40 transition">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Booking Baru</p>
                <p className="text-2xl font-black text-indigo-400">{pipeline.bookingBaru || 0}</p>
                <span className="inline-block px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-[10px] font-bold">
                  Menunggu
                </span>
              </div>

              {/* Stage 2: Dikonfirmasi */}
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-blue-500/20 text-center space-y-1 hover:border-blue-500/40 transition">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Dikonfirmasi</p>
                <p className="text-2xl font-black text-blue-400">{pipeline.dikonfirmasi || 0}</p>
                <span className="inline-block px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full text-[10px] font-bold">
                  Disetujui
                </span>
              </div>

              {/* Stage 3: Menunggu Keluar */}
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-amber-500/20 text-center space-y-1 hover:border-amber-500/40 transition">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Menunggu Keluar</p>
                <p className="text-2xl font-black text-amber-400">{pipeline.menungguKeluar || 0}</p>
                <span className="inline-block px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-[10px] font-bold">
                  Ready
                </span>
              </div>

              {/* Stage 4: Sedang Disewa */}
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-cyan-500/20 text-center space-y-1 hover:border-cyan-500/40 transition">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sedang Disewa</p>
                <p className="text-2xl font-black text-cyan-400">{pipeline.sedangDisewa || 0}</p>
                <span className="inline-block px-2 py-0.5 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-full text-[10px] font-bold">
                  Aktif Rented
                </span>
              </div>

              {/* Stage 5: Pengembalian */}
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-purple-500/20 text-center space-y-1 hover:border-purple-500/40 transition">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pengembalian</p>
                <p className="text-2xl font-black text-purple-400">{pipeline.pengembalian || 0}</p>
                <span className="inline-block px-2 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full text-[10px] font-bold">
                  Inspeksi
                </span>
              </div>

              {/* Stage 6: Selesai */}
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-emerald-500/20 text-center space-y-1 hover:border-emerald-500/40 transition">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Selesai</p>
                <p className="text-2xl font-black text-emerald-400">{pipeline.selesai || 0}</p>
                <span className="inline-block px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[10px] font-bold">
                  Completed
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 2 Columns: Left = Jadwal Rental Hari Ini, Right = Alat Terlambat Kembali */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
          {/* Left Column: Jadwal Rental Hari Ini */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4 backdrop-blur-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-white text-base">Jadwal Rental Hari Ini</h3>
                    <p className="text-[11px] text-slate-400 font-medium">{todayFormatted}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {todaySchedule.length} Kegiatan
                </span>
              </div>

              {loadingPipeline ? (
                <div className="py-6 text-center text-xs text-slate-400 animate-pulse">
                  Memuat jadwal...
                </div>
              ) : todaySchedule.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-2xl">
                  Belum ada data jadwal pengeluaran/pengembalian untuk hari ini.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                  {todaySchedule.map(item => {
                    const isKeluar = item.type === 'keluar';
                    const targetRoute = isKeluar ? `/pickup/ready?search=${item.kode_booking}` : `/return/ready?search=${item.kode_booking}`;
                    const targetModule = isKeluar ? 'PICKUP' : 'RETURN';

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleSelectModule(targetModule, targetRoute)}
                        className="p-3 bg-slate-950/60 hover:bg-slate-950 border border-slate-800 hover:border-indigo-500/50 rounded-2xl flex items-center justify-between transition gap-3 cursor-pointer group"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-extrabold text-xs text-indigo-400 group-hover:text-indigo-300">#{item.kode_booking}</span>
                            <span className="text-xs font-bold text-white truncate">{item.customer}</span>
                          </div>
                          <p className="text-xs text-slate-400 font-medium truncate mt-0.5">{item.alat}</p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectModule(targetModule, targetRoute);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold whitespace-nowrap border transition-all cursor-pointer shadow-sm ${
                            isKeluar
                              ? 'bg-blue-600/30 hover:bg-blue-600 text-blue-200 border-blue-500/50 hover:border-blue-400'
                              : 'bg-amber-600/30 hover:bg-amber-600 text-amber-200 border-amber-500/50 hover:border-amber-400'
                          }`}
                        >
                          {item.status_label || (isKeluar ? 'Keluar Hari Ini' : 'Kembali Hari Ini')}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Alat Terlambat Kembali */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4 backdrop-blur-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-white text-base">Alat Terlambat Kembali</h3>
                    <p className="text-[11px] text-rose-300/80 font-medium">Customer telat mengembalikan</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {overdueList.length} Terlambat
                </span>
              </div>

              {loadingPipeline ? (
                <div className="py-6 text-center text-xs text-slate-400 animate-pulse">
                  Memuat data keterlambatan...
                </div>
              ) : overdueList.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-2xl">
                  Tidak ada unit rental yang terlambat mengembalikan saat ini.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                  {overdueList.map(item => (
                    <div
                      key={item.id}
                      onClick={() => handleSelectModule('RETURN', `/return/rented?search=${item.kode_booking}`)}
                      className="p-3 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-500/30 hover:border-rose-500/60 rounded-2xl flex items-center justify-between transition gap-3 cursor-pointer group"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-extrabold text-xs text-rose-400 group-hover:text-rose-300">#{item.kode_booking}</span>
                          <span className="text-xs font-bold text-white truncate">{item.customer}</span>
                        </div>
                        <p className="text-xs text-slate-300 font-medium truncate mt-0.5">{item.alat}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold text-rose-300 bg-rose-500/20 border border-rose-500/40 whitespace-nowrap">
                        {item.status_label || `TERLAMBAT ${item.daysOverdue || 1} HARI`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-6xl mx-auto w-full flex items-center justify-between text-xs text-slate-400 pt-6 border-t border-slate-800/80">
        <p>© 2026 PT Scal Technic Services.</p>
        <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
          <ShieldCheck className="h-3.5 w-3.5" /> Single Authentication Active
        </span>
      </footer>
    </div>
  );
}
