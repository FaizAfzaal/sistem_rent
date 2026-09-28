import { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import api from '../../lib/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import {
  ClipboardCheck, CheckCircle2, XCircle, AlertTriangle, Clock,
  Search, Filter, Calendar, History, RefreshCw, Play, Layers,
  ChevronRight, Wrench, ShieldAlert, CheckSquare, SquareX
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function DailyChecklistPage() {
  const getTodayStr = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const [activeTab, setActiveTab] = useState('checklist'); // 'checklist' | 'history'
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [manualLoading, setManualLoading] = useState(false);

  // Filters
  const [tanggal, setTanggal] = useState(getTodayStr());
  const [search, setSearch] = useState('');
  const [filterKategori, setFilterKategori] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Data
  const [summary, setSummary] = useState({
    tanggal_pemeriksaan: getTodayStr(),
    terakhir_diperiksa: '-',
    total_aktif: 0,
    total_tersedia: 0,
    total_tidak_tersedia: 0,
    total_stok_menipis: 0,
  });
  const [items, setItems] = useState([]);
  const [kategoriList, setKategoriList] = useState([]);
  const [historyList, setHistoryList] = useState([]);

  // Fetch Kategori for Filter
  useEffect(() => {
    api.get('/kategori-alat?size=100')
      .then(res => setKategoriList(res.data.data || []))
      .catch(() => {});
  }, []);

  // Fetch Checklist Data
  useEffect(() => {
    fetchChecklist();
  }, [tanggal, search, filterKategori, filterStatus]);

  // Fetch History Data when Tab changes
  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab]);

  const fetchChecklist = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tanggal) params.append('tanggal', tanggal);
      if (search) params.append('search', search);
      if (filterKategori) params.append('kategori_id', filterKategori);
      if (filterStatus) params.append('status', filterStatus);

      const res = await api.get(`/daily-checklist?${params.toString()}`);
      if (res.data.success) {
        setSummary(res.data.data.summary || {});
        setItems(res.data.data.items || []);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mengambil data checklist harian');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await api.get('/daily-checklist/history');
      if (res.data.success) {
        setHistoryList(res.data.data || []);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mengambil riwayat pemeriksaan');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleManualCheck = async () => {
    setManualLoading(true);
    try {
      const res = await api.post('/daily-checklist/manual-check', { tanggal });
      if (res.data.success) {
        toast.success(`Pemeriksaan manual ketersediaan alat untuk tanggal ${tanggal} berhasil!`);
        fetchChecklist();
        if (activeTab === 'history') fetchHistory();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menjalankan pemeriksaan manual');
    } finally {
      setManualLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'TERSEDIA':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Tersedia
          </span>
        );
      case 'TIDAK_TERSEDIA':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <XCircle className="w-3.5 h-3.5 text-rose-500" />
            Tidak Tersedia
          </span>
        );
      case 'STOK_MENIPIS':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            Stok Menipis
          </span>
        );
      case 'TIDAK_AKTIF':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-500/10 text-slate-500 border border-slate-500/20">
            <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
            Tidak Aktif
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  const getChecklistBadge = (isChecked) => {
    if (isChecked) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-emerald-600 text-white shadow-sm shadow-emerald-500/30">
          <CheckSquare className="w-4 h-4 text-white" />
          ✓ Checked
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">
        <SquareX className="w-4 h-4 text-rose-600" />
        ✗ Unchecked
      </span>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6 pb-12">
        {/* Page Title & Top Actions */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900 text-white p-6 rounded-3xl shadow-xl border border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <ClipboardCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-white">Checklist Harian Alat Heavy Equipment</h1>
                <p className="text-xs text-slate-400">Verifikasi otomatis ketersediaan seluruh alat rental setiap hari pukul <strong className="text-indigo-300">07.00 WIB (Asia/Jakarta)</strong></p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={fetchChecklist}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            <button
              onClick={handleManualCheck}
              disabled={manualLoading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
            >
              <Play className={`w-4 h-4 fill-white ${manualLoading ? 'animate-spin' : ''}`} />
              {manualLoading ? 'Memeriksa...' : 'Jalankan Pemeriksaan Manual'}
            </button>
          </div>
        </div>

        {/* Dashboard Summary Cards (Requirement 7) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Aktif */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Alat Aktif</p>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1">{summary.total_aktif || 0}</h3>
                <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-indigo-500" />
                  Diperiksa: <span className="font-semibold text-slate-600 dark:text-slate-300">{summary.terakhir_diperiksa || '-'}</span>
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                <Wrench className="w-6 h-6" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-violet-500" />
          </div>

          {/* Card 2: Alat Tersedia */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Alat Tersedia</p>
                <h3 className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{summary.total_tersedia || 0}</h3>
                <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-2 font-medium">Stok ready disewa customer</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500" />
          </div>

          {/* Card 3: Alat Tidak Tersedia */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Alat Tidak Tersedia</p>
                <h3 className="text-3xl font-black text-rose-600 dark:text-rose-400 mt-1">{summary.total_tidak_tersedia || 0}</h3>
                <p className="text-[11px] text-rose-600/80 dark:text-rose-400/80 mt-2 font-medium">Stok 0 atau penuh disewa</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform">
                <XCircle className="w-6 h-6" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-rose-500" />
          </div>

          {/* Card 4: Stok Menipis */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Stok Menipis</p>
                <h3 className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-1">{summary.total_stok_menipis || 0}</h3>
                <p className="text-[11px] text-amber-600/80 dark:text-amber-400/80 mt-2 font-medium">Berada di bawah minimum stok</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500" />
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('checklist')}
            className={`flex items-center gap-2 px-6 py-3.5 font-bold text-sm border-b-2 transition-all cursor-pointer ${
              activeTab === 'checklist'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            Checklist Harian ({tanggal === getTodayStr() ? 'Hari Ini' : tanggal})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-6 py-3.5 font-bold text-sm border-b-2 transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            Riwayat Pemeriksaan Permanen
          </button>
        </div>

        {/* TAB 1: CHECKLIST TABLE */}
        {activeTab === 'checklist' && (
          <div className="space-y-4">
            {/* Filter & Search Bar (Requirement 3) */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shadow-sm">
              <div className="flex-1 flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari nama alat / kode alat..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                {/* Filter Kategori */}
                <div className="w-full sm:w-48">
                  <select
                    value={filterKategori}
                    onChange={(e) => setFilterKategori(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">Semua Kategori</option>
                    {kategoriList.map((k) => (
                      <option key={k.id} value={k.id}>{k.nama_kategori}</option>
                    ))}
                  </select>
                </div>

                {/* Filter Status */}
                <div className="w-full sm:w-44">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">Semua Status</option>
                    <option value="TERSEDIA">Tersedia</option>
                    <option value="TIDAK_TERSEDIA">Tidak Tersedia</option>
                    <option value="STOK_MENIPIS">Stok Menipis</option>
                    <option value="TIDAK_AKTIF">Tidak Aktif</option>
                  </select>
                </div>
              </div>

              {/* Date Filter & Quick Today */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    value={tanggal}
                    onChange={(e) => setTanggal(e.target.value)}
                    className="pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                {tanggal !== getTodayStr() && (
                  <button
                    onClick={() => setTanggal(getTodayStr())}
                    className="px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:bg-indigo-100 transition-colors"
                  >
                    Hari Ini
                  </button>
                )}
              </div>
            </div>

            {/* Table (Requirement 3) */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              {loading ? (
                <div className="p-12 flex justify-center">
                  <LoadingSpinner />
                </div>
              ) : items.length === 0 ? (
                <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                  <ClipboardCheck className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                  <p className="font-bold text-sm">Tidak ada data checklist harian untuk kriteria ini.</p>
                  <p className="text-xs mt-1 text-slate-400">Coba ubah filter pencarian atau tanggal pemeriksaan.</p>
                </div>
              ) : (
                <>
                  {/* MOBILE CARDS VIEW (< md) */}
                  <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                    {items.map((row, index) => (
                      <div key={row.id} className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">#{index + 1}</span>
                            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">
                              {row.alat?.nama_alat || '-'}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded">
                                {row.alat?.kode_alat || '-'}
                              </span>
                              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                {row.alat?.kategori?.nama_kategori || 'Heavy Equipment'}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            {getChecklistBadge(row.is_checked)}
                            <div className="mt-1">{getStatusBadge(row.status_ketersediaan)}</div>
                          </div>
                        </div>

                        {/* Stock breakdown grid */}
                        <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-2xl text-center text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-medium">Total Stok</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{row.total_stok} Unit</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-medium">Tersedia</span>
                            <span className={`font-black text-sm ${row.stok_tersedia > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                              {row.stok_tersedia}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-medium">Disewa</span>
                            <span className="font-bold text-slate-600 dark:text-slate-400">{row.stok_sedang_disewa} Unit</span>
                          </div>
                        </div>

                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                          <span className="font-mono text-[11px] text-slate-400">⏰ {row.waktu_pemeriksaan} WIB ({row.tipe_pemeriksaan})</span>
                          <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium truncate max-w-[180px]">
                            {row.keterangan || '-'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* DESKTOP TABLE VIEW (>= md) */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="py-3.5 px-4 text-center w-12">No.</th>
                          <th className="py-3.5 px-4">Nama Alat</th>
                          <th className="py-3.5 px-4">Kategori</th>
                          <th className="py-3.5 px-4">Kode Alat</th>
                          <th className="py-3.5 px-4 text-center">Total Stok</th>
                          <th className="py-3.5 px-4 text-center">Stok Tersedia</th>
                          <th className="py-3.5 px-4 text-center">Stok Disewa</th>
                          <th className="py-3.5 px-4 text-center">Status Ketersediaan</th>
                          <th className="py-3.5 px-4 text-center">Checklist Harian</th>
                          <th className="py-3.5 px-4">Waktu Pemeriksaan</th>
                          <th className="py-3.5 px-4">Keterangan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {items.map((row, index) => (
                          <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="py-3.5 px-4 text-center font-medium text-slate-400">{index + 1}</td>
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-slate-900 dark:text-white">
                                {row.alat?.nama_alat || '-'}
                              </div>
                              {row.alat?.merek && (
                                <div className="text-[10px] text-slate-400">Merek: {row.alat.merek}</div>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="inline-flex px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {row.alat?.kategori?.nama_kategori || 'Heavy Equipment'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                              {row.alat?.kode_alat || '-'}
                            </td>
                            <td className="py-3.5 px-4 text-center font-bold text-slate-800 dark:text-slate-200">
                              {row.total_stok} unit
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className={`font-black text-sm ${row.stok_tersedia > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                {row.stok_tersedia}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center font-medium text-slate-600 dark:text-slate-400">
                              {row.stok_sedang_disewa} unit
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {getStatusBadge(row.status_ketersediaan)}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {getChecklistBadge(row.is_checked)}
                            </td>
                            <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                              <span className="font-mono text-[11px]">{row.waktu_pemeriksaan} WIB</span>
                              <span className="block text-[10px] text-slate-400">{row.tipe_pemeriksaan}</span>
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 text-xs max-w-xs leading-relaxed">
                              {row.keterangan || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: PERMANENT HISTORY (Requirement 6) */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="bg-slate-900 text-white p-5 rounded-2xl flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Riwayat Pemeriksaan Harian Permanen</h3>
                <p className="text-xs text-slate-400 mt-0.5">Catatan historis pemeriksaan ketersediaan alat tersimpan secara permanen per tanggal.</p>
              </div>
              <button
                onClick={fetchHistory}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${historyLoading ? 'animate-spin' : ''}`} />
                Segarkan Riwayat
              </button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              {historyLoading ? (
                <div className="p-12 flex justify-center">
                  <LoadingSpinner />
                </div>
              ) : historyList.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <History className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <p className="font-bold text-sm">Belum ada riwayat pemeriksaan harian yang tersimpan.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-3.5 px-5">Tanggal Pemeriksaan</th>
                        <th className="py-3.5 px-5">Jam Pemeriksaan</th>
                        <th className="py-3.5 px-5">Mekanisme</th>
                        <th className="py-3.5 px-5 text-center">Total Alat</th>
                        <th className="py-3.5 px-5 text-center">Tersedia</th>
                        <th className="py-3.5 px-5 text-center">Tidak Tersedia</th>
                        <th className="py-3.5 px-5 text-center">Stok Menipis</th>
                        <th className="py-3.5 px-5 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {historyList.map((h) => (
                        <tr key={h.tanggal_pemeriksaan} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="py-4 px-5 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-indigo-500" />
                            {h.tanggal_pemeriksaan}
                          </td>
                          <td className="py-4 px-5 font-mono text-slate-600 dark:text-slate-300">
                            {h.waktu_pemeriksaan} WIB
                          </td>
                          <td className="py-4 px-5">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              h.tipe_pemeriksaan === 'MANUAL'
                                ? 'bg-purple-500/10 text-purple-600 border border-purple-500/20'
                                : 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                            }`}>
                              {h.tipe_pemeriksaan === 'MANUAL' ? 'Manual Admin' : 'Otomatis 07.00 WIB'}
                            </span>
                          </td>
                          <td className="py-4 px-5 text-center font-bold text-slate-800 dark:text-slate-200">
                            {h.total_alat}
                          </td>
                          <td className="py-4 px-5 text-center">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg">
                              {h.total_tersedia}
                            </span>
                          </td>
                          <td className="py-4 px-5 text-center">
                            <span className="font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-lg">
                              {h.total_tidak_tersedia}
                            </span>
                          </td>
                          <td className="py-4 px-5 text-center">
                            <span className="font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-lg">
                              {h.total_stok_menipis}
                            </span>
                          </td>
                          <td className="py-4 px-5 text-right">
                            <button
                              onClick={() => {
                                setTanggal(h.tanggal_pemeriksaan);
                                setActiveTab('checklist');
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                            >
                              Lihat Detail
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
