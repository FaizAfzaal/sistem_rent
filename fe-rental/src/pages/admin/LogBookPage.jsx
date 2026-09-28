import { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import api from '../../lib/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import {
  Calendar, ChevronLeft, ChevronRight, Search, Plus, Filter,
  Wrench, Camera, Cpu, Zap, HardHat, ShieldCheck, AlertTriangle,
  XCircle, Clock, User, CheckCircle2, ArrowRight, ExternalLink, RefreshCw, AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export default function LogBookPage() {
  const navigate = useNavigate();
  const now = new Date();

  const [bulan, setBulan]       = useState(now.getMonth() + 1);
  const [tahun, setTahun]       = useState(now.getFullYear());
  const [search, setSearch]     = useState('');
  const [selKat, setSelKat]     = useState('');
  const [selStatus, setSelStatus] = useState(''); // '', 'tersedia', 'disewa', 'overbooking', 'maintenance', 'rusak'

  const [loading, setLoading]       = useState(true);
  const [logbook, setLogbook]       = useState(null);
  const [kategoriList, setKategoriList] = useState([]);

  // Detail Modals
  const [toolDetailModal, setToolDetailModal] = useState({ open: false, item: null });
  const [bookingDetailModal, setBookingDetailModal] = useState({ open: false, item: null });

  useEffect(() => {
    api.get('/kategori-alat?size=100').then(r => setKategoriList(r.data.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    fetchLogbook();
  }, [bulan, tahun]);

  const fetchLogbook = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/bookings/logbook?bulan=${bulan}&tahun=${tahun}`);
      setLogbook(res.data.data);
    } catch {
      toast.error('Gagal mengambil data Gantt chart logbook');
    }
    setLoading(false);
  };

  const handleCurrentMonth = () => {
    setBulan(now.getMonth() + 1);
    setTahun(now.getFullYear());
  };

  const prevMonth = () => {
    if (bulan === 1) { setBulan(12); setTahun(t => t - 1); }
    else setBulan(b => b - 1);
  };

  const nextMonth = () => {
    if (bulan === 12) { setBulan(1); setTahun(t => t + 1); }
    else setBulan(b => b + 1);
  };

  const currentMonthName = NAMA_BULAN[bulan - 1];

  // Helper icon for category/name
  const getItemIcon = (name = '', cat = '') => {
    const s = (name + ' ' + cat).toLowerCase();
    if (s.includes('kamera') || s.includes('camera') || s.includes('dslr')) return <Camera className="h-4 w-4 text-indigo-500" />;
    if (s.includes('elektronik') || s.includes('proyektor') || s.includes('drone')) return <Cpu className="h-4 w-4 text-blue-500" />;
    if (s.includes('bor') || s.includes('listrik') || s.includes('genset') || s.includes('vibration')) return <Zap className="h-4 w-4 text-amber-500" />;
    if (s.includes('kemah') || s.includes('tenda') || s.includes('outdoor')) return <HardHat className="h-4 w-4 text-emerald-500" />;
    return <Wrench className="h-4 w-4 text-slate-500" />;
  };

  // Filter matrix items
  const filteredMatrix = (logbook?.matrix || []).filter(item => {
    const matchSearch = !search ||
      item.nama_alat.toLowerCase().includes(search.toLowerCase()) ||
      item.kode_alat.toLowerCase().includes(search.toLowerCase()) ||
      item.merek.toLowerCase().includes(search.toLowerCase());

    const matchKat = !selKat || String(item.kategori) === String(selKat);

    let matchStatus = true;
    const isAvailable = item.status === 'tersedia' || item.status === 'TERSEDIA' || item.status === 'TERSEDIA_KEMBALI';
    if (selStatus === 'overbooking') matchStatus = item.is_overbooked;
    else if (selStatus === 'tersedia') matchStatus = !item.is_overbooked && isAvailable;
    else if (selStatus === 'disewa') matchStatus = item.lanes && item.lanes.length > 0;
    else if (selStatus === 'maintenance') matchStatus = !isAvailable && (item.kondisi === 'rusak_ringan' || item.status === 'MAINTENANCE');
    else if (selStatus === 'rusak') matchStatus = !isAvailable && item.kondisi === 'rusak_berat';

    return matchSearch && matchKat && matchStatus;
  });

  return (
    <AppLayout title="Multi-Unit Rental Gantt Chart">
      <div className="space-y-6 animate-fade-in font-sans">

        {/* Month Selector Bar Only */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Calendar className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Log Book Rental</h1>
              <p className="text-xs text-gray-500 font-medium">{currentMonthName} {tahun}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Selector [ ◀ ] 📅 Agustus 2026 [ ▶ ] */}
            <div className="flex items-center bg-slate-900 text-white rounded-2xl p-1 shadow-md">
              <button
                onClick={prevMonth}
                className="p-2 hover:bg-slate-800 rounded-xl transition text-slate-300 hover:text-white cursor-pointer"
                title="Bulan Sebelumnya"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="px-3 text-xs font-black tracking-wide flex items-center gap-1.5 cursor-pointer">
                <span>📅 {currentMonthName} {tahun}</span>
              </div>

              <button
                onClick={nextMonth}
                className="p-2 hover:bg-slate-800 rounded-xl transition text-slate-300 hover:text-white cursor-pointer"
                title="Bulan Berikutnya"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Month Picker Dropdown */}
            <select
              value={bulan}
              onChange={e => setBulan(Number(e.target.value))}
              className="px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {NAMA_BULAN.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>

            {/* Tombol Hari Ini */}
            <button
              onClick={handleCurrentMonth}
              className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5 text-indigo-600" /> Hari Ini
            </button>
          </div>
        </div>

        {/* CONTAINER TABLE MULTI-LANE GANTT CHART */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden">
          {loading ? (
            <div className="py-16"><LoadingSpinner /></div>
          ) : !logbook ? (
            <div className="py-12 text-center text-gray-500">Gagal memuat timeline Gantt Chart</div>
          ) : (
            <div className="overflow-x-auto max-h-[750px] relative scrollbar-thin scrollbar-thumb-gray-300">
              <table className="w-full text-left text-xs border-collapse border-spacing-0">
                
                {/* STICKY HEADER */}
                <thead className="sticky top-0 z-30 bg-slate-900 text-white shadow-md">
                  
                  {/* Row 1: Day Names (SENIN s/d MINGGU) */}
                  <tr>
                    {/* 1. BAGIAN KIRI: STICKY COLUMNS HEADER */}
                    <th className="sticky left-0 z-40 bg-slate-900 p-3 border-b border-r border-slate-700 font-extrabold min-w-[210px] shadow-[4px_0_10px_-2px_rgba(0,0,0,0.15)]">
                      Nama Barang & Kode
                    </th>
                    <th className="sticky left-[210px] z-40 bg-slate-900 p-3 border-b border-r border-slate-700 font-extrabold min-w-[110px] shadow-[4px_0_10px_-2px_rgba(0,0,0,0.15)]">
                      Kategori
                    </th>
                    <th className="sticky left-[320px] z-40 bg-slate-900 p-3 border-b border-r border-slate-700 font-extrabold min-w-[90px] shadow-[4px_0_10px_-2px_rgba(0,0,0,0.15)] text-center">
                      Stok
                    </th>
                    <th className="sticky left-[410px] z-40 bg-slate-900 p-3 border-b border-r border-slate-700 font-extrabold min-w-[165px] shadow-[6px_0_12px_-2px_rgba(0,0,0,0.2)]">
                      Status
                    </th>

                    {/* 2. BAGIAN TENGAH: RENTAL TIMELINE DYNAMIC DATES HEADER */}
                    {logbook.days?.map(d => {
                      const isSenin = d.dayName === 'SENIN';
                      const isMinggu = d.dayName === 'MINGGU';
                      const isWeekend = ['SABTU', 'MINGGU'].includes(d.dayName);

                      return (
                        <th
                          key={d.day}
                          className={`p-2 border-b border-r border-slate-700 text-center font-extrabold min-w-[85px] uppercase text-[10px] tracking-wider ${
                            isSenin ? 'border-l-2 border-l-emerald-400 bg-slate-900 text-emerald-300' :
                            isMinggu ? 'border-r-2 border-r-rose-400 bg-indigo-950 text-rose-300' :
                            isWeekend ? 'bg-indigo-950 text-indigo-200' : 'bg-slate-900 text-slate-200'
                          }`}
                        >
                          {d.dayName}
                        </th>
                      );
                    })}
                  </tr>

                  {/* Row 2: Date Numbers (22 | 23 | 24 | 25 | 26 | 27 | 28...) */}
                  <tr className="bg-slate-800 text-slate-100">
                    <th className="sticky left-0 z-40 bg-slate-800 border-b border-r border-slate-700 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.15)]"></th>
                    <th className="sticky left-[210px] z-40 bg-slate-800 border-b border-r border-slate-700 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.15)]"></th>
                    <th className="sticky left-[320px] z-40 bg-slate-800 border-b border-r border-slate-700 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.15)]"></th>
                    <th className="sticky left-[410px] z-40 bg-slate-800 border-b border-r border-slate-700 shadow-[6px_0_12px_-2px_rgba(0,0,0,0.2)]"></th>

                    {logbook.days?.map(d => {
                      const isSenin = d.dayName === 'SENIN';
                      const isMinggu = d.dayName === 'MINGGU';
                      const isWeekend = ['SABTU', 'MINGGU'].includes(d.dayName);

                      return (
                        <th
                          key={d.day}
                          className={`p-1.5 border-b border-r border-slate-700 text-center font-black text-xs ${
                            isSenin ? 'border-l-2 border-l-emerald-400 bg-emerald-700 text-white' :
                            isMinggu ? 'border-r-2 border-r-rose-400 bg-rose-600 text-white' :
                            isWeekend ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-100'
                          }`}
                        >
                          {d.day}
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                {/* TABLE BODY: MULTI-LANE GANTT CHART MATRIX */}
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredMatrix.length === 0 ? (
                    <tr>
                      <td colSpan={4 + (logbook.days?.length || 0)} className="py-12 text-center text-gray-400 italic">
                        Tidak ada barang yang sesuai filter pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredMatrix.map(row => {
                      const isTersedia = row.status === 'tersedia' || row.status === 'TERSEDIA' || row.status === 'TERSEDIA_KEMBALI';
                      const isRusakBerat = !isTersedia && row.kondisi === 'rusak_berat';
                      const isRusakRingan = !isTersedia && (row.kondisi === 'rusak_ringan' || row.status === 'MAINTENANCE');
                      const isTidakTersedia = !isTersedia && row.status === 'tidak_tersedia';
                      const isOverbooked = row.is_overbooked;
                      const hasLanes = row.lanes && row.lanes.length > 0;
                      const uniqueCustomers = new Set((row.lanes || []).map(l => l.customer_nama)).size;
                      const totalRentedQty = (row.lanes || []).reduce((sum, l) => sum + Number(l.qty || 1), 0);

                      return (
                        <tr key={row.id} className="hover:bg-slate-50/80 transition group font-sans">
                          
                          {/* 1. BAGIAN KIRI: FIXED SIDEBAR COLUMNS */}
                          
                          {/* Nama Barang */}
                          <td
                            onClick={() => setToolDetailModal({ open: true, item: row })}
                            className="sticky left-0 z-20 bg-white group-hover:bg-slate-50 border-b border-r border-gray-200 p-3 font-bold text-slate-900 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.08)] cursor-pointer hover:text-indigo-600 transition"
                            title="Klik untuk melihat detail rental barang ini"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                                {getItemIcon(row.nama_alat, row.kategori)}
                              </div>
                              <div className="min-w-0">
                                <p className="font-extrabold text-slate-900 text-xs truncate underline hover:text-indigo-600">
                                  {row.nama_alat}
                                </p>
                                <p className="text-[10px] text-gray-400 font-mono truncate">{row.kode_alat} • {row.merek}</p>
                              </div>
                            </div>
                          </td>

                          {/* Kategori */}
                          <td className="sticky left-[210px] z-20 bg-white group-hover:bg-slate-50 border-b border-r border-gray-200 p-3 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.08)]">
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[11px] font-semibold border border-slate-200/60 block text-center truncate">
                              {row.kategori}
                            </span>
                          </td>

                          {/* Jumlah Stok */}
                          <td className="sticky left-[320px] z-20 bg-white group-hover:bg-slate-50 border-b border-r border-gray-200 p-3 text-center shadow-[4px_0_10px_-2px_rgba(0,0,0,0.08)]">
                            <span className="font-extrabold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                              {row.stok} Unit
                            </span>
                          </td>

                          {/* Status Badge - Menampilkan Jumlah Orang & Total Unit Sewa */}
                          <td className="sticky left-[410px] z-20 bg-white group-hover:bg-slate-50 border-b border-r border-gray-200 p-3 shadow-[6px_0_12px_-2px_rgba(0,0,0,0.12)] min-w-[160px]">
                            {isOverbooked ? (
                              <span
                                onClick={() => setToolDetailModal({ open: true, item: row })}
                                className="px-2.5 py-1.5 bg-red-100 text-red-800 rounded-xl text-[11px] font-black block text-center border border-red-300 animate-pulse flex items-center justify-center gap-1 cursor-pointer hover:bg-red-200 transition"
                                title="Klik untuk lihat detail overbooking"
                              >
                                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 text-red-600" /> Over ({uniqueCustomers} Orang)
                              </span>
                            ) : isRusakBerat ? (
                              <span className="px-2.5 py-1.5 bg-rose-100 text-rose-700 rounded-xl text-[11px] font-extrabold block text-center border border-rose-200">
                                Merah (Rusak)
                              </span>
                            ) : isRusakRingan ? (
                              <span className="px-2.5 py-1.5 bg-amber-100 text-amber-800 rounded-xl text-[11px] font-extrabold block text-center border border-amber-200">
                                Maintenance
                              </span>
                            ) : isTidakTersedia ? (
                              <span className="px-2.5 py-1.5 bg-gray-100 text-gray-700 rounded-xl text-[11px] font-bold block text-center border border-gray-200">
                                Tidak tersedia
                              </span>
                            ) : hasLanes ? (
                              <span
                                onClick={() => setToolDetailModal({ open: true, item: row })}
                                className="px-2.5 py-1.5 bg-blue-100 text-blue-900 rounded-xl text-[11px] font-black block text-center border border-blue-300 cursor-pointer hover:bg-blue-200 transition shadow-2xs"
                                title={`Disewa oleh ${uniqueCustomers} Customer (${totalRentedQty} Unit)`}
                              >
                                Disewa: {uniqueCustomers} Orang ({totalRentedQty} Unit)
                              </span>
                            ) : (
                              <span className="px-2.5 py-1.5 bg-emerald-100 text-emerald-800 rounded-xl text-[11px] font-extrabold block text-center border border-emerald-200">
                                Tersedia ({row.stok} Unit)
                              </span>
                            )}
                          </td>


                          {/* 2. BAGIAN TENGAH: MULTI-LANE GANTT CHART TIMELINE BARS */}
                          {logbook.days?.map(d => {
                            const isSenin = d.dayName === 'SENIN';
                            const isMinggu = d.dayName === 'MINGGU';
                            const isDayOverbooked = row.overbooked_days?.includes(d.day);
                            const bookedList = row.bookings?.[d.day] || [];
                            const hasBooking = bookedList.length > 0;

                            return (
                              <td
                                key={d.day}
                                className={`p-1 border-b border-r border-gray-200 align-top transition-all ${
                                  isSenin ? 'border-l-2 border-l-emerald-400' : ''
                                } ${isMinggu ? 'border-r-2 border-r-rose-400' : ''} ${
                                  isDayOverbooked ? 'bg-red-100/70 border-red-300' :
                                  isRusakBerat ? 'bg-rose-50/70' :
                                  isRusakRingan ? 'bg-amber-50/70' :
                                  isTidakTersedia ? 'bg-gray-100/70' :
                                  hasBooking ? 'bg-blue-50/40' : 'bg-emerald-50/30 hover:bg-emerald-100/50'
                                }`}
                              >
                                {isDayOverbooked && (
                                  <div className="mb-1 bg-red-600 text-white text-[9px] font-extrabold py-0.5 px-1 rounded text-center animate-pulse">
                                    ⚠️ Over
                                  </div>
                                )}

                                {/* RENDER MULTIPLE LANES IF MULTIPLE CUSTOMERS RENT ON THIS DAY */}
                                {hasBooking ? (
                                  <div className="space-y-1">
                                    {bookedList.map((b, bIdx) => {
                                      let barStyle = 'bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-sm';
                                      if (b.status === 'selesai') {
                                        barStyle = 'bg-amber-400 text-slate-950 font-bold hover:bg-amber-500 shadow-sm';
                                      }

                                      return (
                                        <div
                                          key={b.booking_id || bIdx}
                                          onClick={() => setBookingDetailModal({ open: true, item: b })}
                                          className={`py-1 px-1.5 rounded-lg text-[10px] font-extrabold tracking-tight transition-transform hover:scale-105 cursor-pointer truncate ${barStyle}`}
                                          title={`Customer: ${b.customer_nama} (${b.qty} Unit) • ${b.tanggal_mulai} - ${b.tanggal_selesai}`}
                                        >
                                          {b.customer_nama}
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : isRusakBerat ? (
                                  <div className="py-1 px-1 rounded-lg text-[10px] font-extrabold bg-rose-600 text-white text-center">
                                    Rusak
                                  </div>
                                ) : isRusakRingan ? (
                                  <div className="py-1 px-1 rounded-lg text-[10px] font-extrabold bg-amber-500 text-slate-950 text-center">
                                    Maintenance
                                  </div>
                                ) : (
                                  /* Free / Available Day Cell (Hijau) */
                                  <div className="h-6 w-full rounded flex items-center justify-center text-[10px] text-emerald-700/60 font-semibold opacity-0 hover:opacity-100 transition">
                                    ✓ Free
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* MODAL DETAIL BARANG (Saat Klik Baris/Nama Barang) */}
      <Modal
        isOpen={toolDetailModal.open}
        onClose={() => setToolDetailModal({ open: false, item: null })}
        title="Detail Barang & Daftar Rental Aktif"
        size="lg"
      >
        {toolDetailModal.item && (
          <div className="space-y-5">
            <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 rounded-3xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-white">{toolDetailModal.item.nama_alat}</h3>
                <p className="text-xs text-indigo-200 font-mono mt-0.5">Kode: {toolDetailModal.item.kode_alat} • Merek: {toolDetailModal.item.merek}</p>
                <p className="text-xs text-indigo-300 mt-1">Kategori: {toolDetailModal.item.kategori} • Pemilik: {toolDetailModal.item.pemilik}</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-indigo-200 block">Total Stok</span>
                <span className="text-2xl font-black text-white">{toolDetailModal.item.stok} Unit</span>
              </div>
            </div>

            {/* Overbooking Alert in Modal */}
            {toolDetailModal.item.is_overbooked && (
              <div className="p-4 bg-red-50 border-2 border-red-200 rounded-2xl flex items-center gap-3 text-red-800 text-xs font-bold">
                <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 animate-bounce" />
                <div>
                  <p className="font-extrabold text-sm">⚠️ PERHATIAN: Over Booking!</p>
                  <p className="text-red-700 font-normal">
                    Jumlah unit disewa melebihi stok ({toolDetailModal.item.stok} Unit) pada tanggal: {toolDetailModal.item.overbooked_days?.join(', ')} {currentMonthName}.
                  </p>
                </div>
              </div>
            )}

            {/* Daftar Rental Aktif / Sewa */}
            <div className="space-y-3">
              <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2 border-b border-gray-200 pb-2">
                <User className="h-4 w-4 text-indigo-600" /> Daftar Penyewa / Rental Aktif ({toolDetailModal.item.lanes?.length || 0})
              </h4>

              {!toolDetailModal.item.lanes || toolDetailModal.item.lanes.length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-500 bg-gray-50 rounded-2xl border border-gray-100">
                  Tidak ada penyewa aktif untuk barang ini pada bulan {currentMonthName} {tahun}.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {toolDetailModal.item.lanes.map((lane, lIdx) => (
                    <div
                      key={lane.booking_id || lIdx}
                      className="p-4 bg-slate-50 hover:bg-indigo-50/50 rounded-2xl border border-gray-200 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs">{lIdx + 1}. {lane.customer_nama}</span>
                          <span className={`badge-${lane.status} text-[10px]`}>{lane.status}</span>
                        </div>
                        <p className="text-xs text-gray-500 font-medium">
                          📅 {lane.tanggal_mulai} s/d {lane.tanggal_selesai} • <strong className="text-slate-800">{lane.qty} Unit</strong>
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          setToolDetailModal({ open: false, item: null });
                          navigate(`/bookings/${lane.booking_id}`);
                        }}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center gap-1 transition"
                      >
                        <ExternalLink className="h-3 w-3" /> Formulir
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL DETAIL BOOKING CELL / GANTT BAR TOOLTIP */}
      <Modal
        isOpen={bookingDetailModal.open}
        onClose={() => setBookingDetailModal({ open: false, item: null })}
        title="Detail Tooltip Rental Bar"
        size="md"
      >
        {bookingDetailModal.item && (
          <div className="space-y-4">
            <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 rounded-3xl text-white space-y-3 shadow-lg">
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <div>
                  <span className="text-[10px] text-indigo-300 font-mono">KODE BOOKING</span>
                  <p className="font-mono font-black text-lg text-white">{bookingDetailModal.item.kode_booking}</p>
                </div>
                <span className={`badge-${bookingDetailModal.item.status} uppercase font-extrabold text-xs`}>
                  {bookingDetailModal.item.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-indigo-300 block">Nama Customer / Penyewa</span>
                  <strong className="text-white text-sm block mt-0.5">{bookingDetailModal.item.customer_nama}</strong>
                </div>
                <div>
                  <span className="text-indigo-300 block">Jumlah Unit Disewa</span>
                  <strong className="text-amber-300 text-sm block mt-0.5">{bookingDetailModal.item.qty || 1} Unit</strong>
                </div>
              </div>

              <div className="p-3 bg-white/10 rounded-2xl text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-300">Tanggal Mulai Sewa:</span>
                  <span className="font-bold text-white">{bookingDetailModal.item.tanggal_mulai}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Tanggal Selesai Sewa:</span>
                  <span className="font-bold text-white">{bookingDetailModal.item.tanggal_selesai}</span>
                </div>
                <div className="flex justify-between border-t border-white/10 pt-1 mt-1">
                  <span className="text-indigo-200">Status Pembayaran:</span>
                  <span className="font-extrabold text-emerald-300 uppercase font-mono">
                    {bookingDetailModal.item.opsi_pembayaran || 'DP'} ({bookingDetailModal.item.status_pembayaran || 'Belum Bayar'})
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => {
                  setBookingDetailModal({ open: false, item: null });
                  navigate(`/bookings/${bookingDetailModal.item.booking_id}`);
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition"
              >
                <ExternalLink className="h-4 w-4" /> Buka Formulir Lengkap
              </button>
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}
