import { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import api, { IMAGE_BASE } from '../../lib/api';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import SignaturePad from '../../components/common/SignaturePad';
import RentalTimeline from '../../components/common/RentalTimeline';
import {
  RotateCcw, Search, Package, CheckCircle2, XCircle, CheckSquare, Clock, Upload,
  Image as ImageIcon, FileText, UserCheck, AlertTriangle, ShieldAlert
} from 'lucide-react';
import toast from 'react-hot-toast';
import { compressMultipleImages } from '../../lib/imageCompressor';

export default function AdminReturnPage() {
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [returnChecklistsState, setReturnChecklistsState] = useState({});

  // Return Modal State
  const [returnModal, setReturnModal] = useState({ open: false, booking: null });

  // Form State
  const [returnForm, setReturnForm] = useState({
    return_name: '',
    return_phone: '',
    return_date: new Date().toISOString().split('T')[0],
    return_time: '17:00',
    return_signature: '',
    damage_status: 'sesuai_awal', // 'sesuai_awal' | 'ada_kerusakan'
    damage_notes: '',
    return_notes: '',
  });

  const [returnPhotos, setReturnPhotos] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    fetchData();
  }, [page, search]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, size: 10 });
      if (search) p.set('search', search);
      const res = await api.get(`/return/rented?${p}`);
      setData(res.data.data || []);
      setPagination(res.data.pagination);
    } catch {
      toast.error('Gagal mengambil daftar barang yang sedang disewa');
    }
    setLoading(false);
  };

  const openReturnModal = (booking, targetDetail = null) => {
    const custName = booking.customer?.full_name || booking.user?.nama || booking.pengambil_nama || '';
    const custPhone = booking.customer?.phone || booking.user?.no_hp || booking.pengambil_no_hp || '';

    const activeRentedDetails = targetDetail
      ? [targetDetail]
      : (booking.details || []).filter(d => ['BARANG_SEDANG_DISEWA', 'RENTED', 'SEDANG_DISEWA'].includes(d.status));

    // Populate checklist items for return
    const initChecklists = {};
    activeRentedDetails.forEach(d => {
      const itemChecklists = d.checklists || booking.checklists || [];
      itemChecklists.forEach(c => {
        if (!c.booking_detail_id || c.booking_detail_id === d.id) {
          initChecklists[c.id] = {
            id: c.id,
            nama_kelengkapan: c.nama_kelengkapan,
            status_keluar: c.status_keluar || 'ADA',
            keterangan_keluar: c.keterangan_keluar || '',
            status_kembali: c.status_kembali || 'ADA',
            keterangan_kembali: c.keterangan_kembali || '',
          };
        }
      });
    });
    setReturnChecklistsState(initChecklists);

    setReturnForm({
      return_name: custName,
      return_phone: custPhone,
      return_date: new Date().toISOString().split('T')[0],
      return_time: '17:00',
      return_signature: '',
      damage_status: 'sesuai_awal',
      damage_notes: '',
      return_notes: '',
    });
    setReturnPhotos([]);
    setPhotoPreviews([]);
    setReturnModal({ open: true, booking, targetDetail, activeRentedDetails });
  };

  const handlePhotoSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    if (returnPhotos.length + files.length > 5) {
      toast.error('Maksimal 5 foto kondisi pengembalian barang');
      return;
    }

    const toastId = toast.loading('Mengompresi & mengoptimalkan foto (<2MB)...');
    try {
      const compressedFiles = await compressMultipleImages(files, 2.0);
      toast.success('Foto pengembalian berhasil dioptimalkan!', { id: toastId });

      setReturnPhotos(prev => [...prev, ...compressedFiles]);
      const newPreviews = compressedFiles.map(file => URL.createObjectURL(file));
      setPhotoPreviews(prev => [...prev, ...newPreviews]);
    } catch (err) {
      toast.error('Gagal mengompresi foto: ' + (err.message || 'Format tidak didukung'), { id: toastId });
    }
  };

  const removePhoto = (index) => {
    setReturnPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    if (!returnForm.return_name || !returnForm.return_phone || !returnForm.return_signature) {
      return toast.error('Nama Pengembali, No. HP, dan Tanda Tangan wajib diisi!');
    }

    const targetDetails = returnModal.activeRentedDetails || [];
    if (targetDetails.length === 0) {
      return toast.error('Tidak ada detail barang aktif yang sedang disewa untuk dikembalikan!');
    }

    setSubmitting(true);
    setUploadProgress(0);
    try {
      const fd = new FormData();
      fd.append('booking_id', returnModal.booking.id);
      
      targetDetails.forEach(d => {
        fd.append('booking_detail_ids[]', d.id);
      });

      fd.append('return_name', returnForm.return_name);
      fd.append('return_phone', returnForm.return_phone);
      fd.append('return_date', returnForm.return_date);
      fd.append('return_time', returnForm.return_time);
      fd.append('return_signature', returnForm.return_signature);
      fd.append('damage_status', returnForm.damage_status);
      if (returnForm.damage_notes) fd.append('damage_notes', returnForm.damage_notes);
      if (returnForm.return_notes) fd.append('return_notes', returnForm.return_notes);
      fd.append('checklists', JSON.stringify(Object.values(returnChecklistsState)));

      returnPhotos.forEach(file => {
        fd.append('photos', file);
      });

      await api.post('/return/process', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percent);
          }
        },
      });
      toast.success('Penerimaan barang pengembalian berhasil! Data otomatis masuk ke Admin Finance');
      setReturnModal({ open: false, booking: null, targetDetail: null, activeRentedDetails: [] });
      fetchData();
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Gagal memproses penerimaan pengembalian. Silakan periksa koneksi internet Anda.';
      toast.error(`Gagal Upload: ${errMsg}`);
    }
    setSubmitting(false);
  };

  return (
    <AppLayout title="Penerimaan Barang (Warehouse In)">
      <div className="animate-fade-in space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center font-bold">
              <RotateCcw className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-gray-900">Dashboard Penerimaan Barang</h1>
              <p className="text-xs text-gray-500">Daftar alat berat yang sedang disewa customer dan siap dikembalikan</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nama customer atau kode booking..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>
        </div>

        {/* Rented Bookings Table */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <LoadingSpinner className="py-16" />
          ) : (() => {
            const flattenedRentedItems = [];
            data.forEach((b) => {
              const custName = b.customer?.full_name || b.user?.nama || b.pengambil_nama || 'Customer';
              const rentedDetails = (b.details || []).filter(d =>
                ['BARANG_SEDANG_DISEWA', 'RENTED', 'SEDANG_DISEWA', 'SIAP_DIKEMBALIKAN'].includes(d.status) &&
                (d.pickup || d.pickups?.[0]) != null
              );
              
              rentedDetails.forEach(d => {
                const pTx = d.pickup || d.pickups?.[0];
                const pDate = pTx?.pickup_date || d.tanggal_mulai;
                const pTime = pTx?.pickup_time || b.jam_mulai || '08:00';
                const adminName = pTx?.approved_by || 'Admin Warehouse';
                const dDays = calculateDays(d.tanggal_mulai, d.tanggal_selesai);

                flattenedRentedItems.push({
                  booking: b,
                  detail: d,
                  custName,
                  pDate,
                  pTime,
                  adminName,
                  dDays,
                });
              });
            });

            if (flattenedRentedItems.length === 0) {
              return (
                <div className="p-12 text-center text-gray-500 text-xs">
                  Tidak ada barang yang sedang disewa saat ini.
                </div>
              );
            }

            return (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-4">Nomor Booking</th>
                      <th className="px-5 py-4">Nama Customer</th>
                      <th className="px-5 py-4">Nama Alat & Qty</th>
                      <th className="px-5 py-4">Tanggal Keluar</th>
                      <th className="px-5 py-4">Estimasi Kembali</th>
                      <th className="px-5 py-4">Durasi</th>
                      <th className="px-5 py-4 text-center">Aksi Penerimaan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {flattenedRentedItems.map(({ booking, detail, custName, pDate, pTime, adminName, dDays }) => (
                      <tr key={detail.id} className="hover:bg-slate-50/60 transition">
                        <td className="px-5 py-4 font-mono font-bold text-indigo-600">
                          {booking.kode_booking}
                        </td>
                        <td className="px-5 py-4 font-extrabold text-gray-900">
                          {custName}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-gray-900">{detail.alat?.nama_alat || 'Alat Rental'}</span>
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-extrabold rounded-md text-[11px]">
                              {detail.qty} Unit
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-gray-700 font-semibold">
                          <div>📅 {pDate} <span className="text-gray-500 font-normal">({pTime} WIB)</span></div>
                          <div className="text-[10px] text-indigo-700 font-bold mt-0.5">🛡️ {adminName}</div>
                        </td>
                        <td className="px-5 py-4 text-indigo-700 font-extrabold">
                          🏁 {detail.tanggal_selesai}
                        </td>
                        <td className="px-5 py-4">
                          <span className="px-2.5 py-1 bg-amber-100 text-amber-900 font-black rounded-lg text-xs">
                            {dDays} Hari
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => openReturnModal(booking, detail)}
                            className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl font-extrabold transition text-xs shadow-md flex items-center gap-1.5 mx-auto cursor-pointer"
                          >
                            <RotateCcw className="h-3.5 w-3.5" /> Terima Barang Kembali
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}

          {pagination && pagination.totalPages > 1 && (
            <div className="p-4 border-t border-gray-100">
              <Pagination page={page} totalPages={pagination.totalPages} onPageChange={setPage} />
            </div>
          )}
        </div>

        {/* MODAL FORM PENERIMAAN BARANG KEMBALI */}
        <Modal
          isOpen={returnModal.open}
          onClose={() => setReturnModal({ open: false, booking: null, targetDetail: null, activeRentedDetails: [] })}
          title={`DATA PENGEMBALIAN BARANG (#${returnModal.booking?.kode_booking}${returnModal.targetDetail ? ` - ${returnModal.targetDetail.alat?.nama_alat}` : ''})`}
          size="lg"
        >
          <form onSubmit={handleReturnSubmit} className="space-y-5">
            {returnModal.booking && (
              <RentalTimeline status={returnModal.booking.status} />
            )}

            {/* List Alat Yang Diterima Kembali */}
            {returnModal.activeRentedDetails && returnModal.activeRentedDetails.length > 0 && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <label className="block font-bold text-gray-800 uppercase tracking-wider text-[11px]">
                  Daftar Alat Yang Diterima Kembali ({returnModal.activeRentedDetails.length} Unit):
                </label>
                <div className="space-y-2">
                  {returnModal.activeRentedDetails.map((d, idx) => {
                    const itemSubtotal = Number(d.subtotal || 0);
                    return (
                      <div key={d.id || idx} className="p-3 bg-white rounded-xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-gray-900">{idx + 1}. {d.alat?.nama_alat}</span>
                            <span className="font-mono text-indigo-600 font-bold">({d.alat?.kode_alat || 'ALT'})</span>
                          </div>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            Tanggal Rental: <strong className="text-gray-800">{d.tanggal_mulai || '-'} s/d {d.tanggal_selesai || '-'}</strong>
                          </p>
                        </div>
                        <div className="flex items-center gap-4 text-gray-600">
                          <span>Qty: <strong className="text-indigo-600">{d.qty || 1}</strong></span>
                          <span>Subtotal: <strong className="text-emerald-700 font-bold">Rp {itemSubtotal.toLocaleString('id-ID')}</strong></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Nama Orang Yang Mengembalikan *</label>
                <input
                  type="text"
                  required
                  value={returnForm.return_name}
                  onChange={e => setReturnForm({ ...returnForm, return_name: e.target.value })}
                  placeholder="Budi Santoso"
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Nomor HP Pengembali *</label>
                <input
                  type="text"
                  required
                  value={returnForm.return_phone}
                  onChange={e => setReturnForm({ ...returnForm, return_phone: e.target.value })}
                  placeholder="081234567890"
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Tanggal Pengembalian *</label>
                <input
                  type="date"
                  required
                  value={returnForm.return_date}
                  onChange={e => setReturnForm({ ...returnForm, return_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Jam Pengembalian *</label>
                <input
                  type="time"
                  required
                  value={returnForm.return_time}
                  onChange={e => setReturnForm({ ...returnForm, return_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Upload Foto Barang Saat Kembali */}
              <div className="sm:col-span-2 p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <label className="block font-bold text-gray-800 uppercase tracking-wider text-[11px]">
                  Foto Barang Saat Kembali (Dokumentasi Kondisi)
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  {photoPreviews.map((src, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-300 bg-white">
                      <img src={src} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-red-600 text-white rounded-full text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  {photoPreviews.length < 5 && (
                    <label className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 hover:border-indigo-500 bg-white flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:text-indigo-600 transition">
                      <Upload className="h-5 w-5" />
                      <span className="text-[10px] font-bold mt-1">Upload</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handlePhotoSelect}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* SECTION PERBANDINGAN KELENGKAPAN ALAT (SAAT KELUAR vs SAAT KEMBALI) */}
              {Object.keys(returnChecklistsState).length > 0 && (() => {
                const missingReturnItems = Object.values(returnChecklistsState).filter(
                  item => item.status_keluar === 'ADA' && item.status_kembali === 'TIDAK_ADA'
                );

                return (
                  <div className="sm:col-span-2 space-y-3">
                    {/* AUTOMATIC WARNING ALERT BANNER */}
                    {missingReturnItems.length > 0 && (
                      <div className="p-3.5 bg-red-50 rounded-2xl border-2 border-red-400 flex items-start gap-3 shadow-sm">
                        <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="space-y-1 text-xs">
                          <strong className="text-red-900 font-extrabold text-xs block">
                            ⚠️ PERINGATAN: KEKURANGAN SAAT PENGEMBALIAN DETEKSI OTOMATIS!
                          </strong>
                          <p className="text-red-700 font-medium">
                            Terdapat {missingReturnItems.length} item kelengkapan yang tercatat <strong>ADA saat pengeluaran</strong> namun <strong>TIDAK ADA saat dikembalikan</strong>:
                          </p>
                          <ul className="list-disc list-inside text-red-900 font-bold space-y-0.5">
                            {missingReturnItems.map(item => (
                              <li key={item.id}>
                                {item.nama_kelengkapan} {item.keterangan_kembali ? `— "${item.keterangan_kembali}"` : ''}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="block font-extrabold text-slate-900 uppercase tracking-wider text-xs flex items-center gap-2">
                          <CheckSquare className="h-4 w-4 text-indigo-600" /> Perbandingan Kelengkapan Alat
                        </label>
                        <span className="text-[10px] font-bold text-slate-700 bg-slate-200 px-2.5 py-0.5 rounded-full">
                          Keluar vs Kembali
                        </span>
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-100 border-b border-gray-200 text-gray-700 font-extrabold">
                            <tr>
                              <th className="p-3">KELENGKAPAN</th>
                              <th className="p-3">SAAT KELUAR</th>
                              <th className="p-3">SAAT KEMBALI</th>
                              <th className="p-3">KETERANGAN PENGEMBALIAN</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 font-medium">
                            {Object.values(returnChecklistsState).map(item => {
                              const isKeluarAda = item.status_keluar === 'ADA';
                              const isKembaliAda = item.status_kembali === 'ADA';
                              const isKekurangan = isKeluarAda && !isKembaliAda;

                              return (
                                <tr key={item.id} className={isKekurangan ? 'bg-red-50/80' : ''}>
                                  <td className="p-3 font-bold text-gray-900">
                                    {item.nama_kelengkapan}
                                    {isKekurangan && (
                                      <span className="block text-[10px] text-red-600 font-extrabold mt-0.5">
                                        ⚠️ KEKURANGAN SAAT PENGEMBALIAN
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-3">
                                    {isKeluarAda ? (
                                      <span className="inline-flex items-center gap-1 font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> ✓ Ada
                                      </span>
                                    ) : (
                                      <div className="flex flex-col">
                                        <span className="inline-flex items-center gap-1 font-extrabold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                                          <XCircle className="h-3.5 w-3.5 text-red-600" /> ✕ Tidak Ada
                                        </span>
                                        {item.keterangan_keluar && (
                                          <span className="text-[10px] text-gray-500 italic mt-0.5">({item.keterangan_keluar})</span>
                                        )}
                                      </div>
                                    )}
                                  </td>
                                  <td className="p-3">
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => setReturnChecklistsState(prev => ({
                                          ...prev,
                                          [item.id]: { ...prev[item.id], status_kembali: 'ADA', keterangan_kembali: '' }
                                        }))}
                                        className={`px-2.5 py-1 rounded text-[11px] font-extrabold flex items-center gap-1 transition-all ${
                                          isKembaliAda
                                            ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500'
                                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                        }`}
                                      >
                                        <CheckCircle2 className="h-3 w-3" /> ADA
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setReturnChecklistsState(prev => ({
                                          ...prev,
                                          [item.id]: { ...prev[item.id], status_kembali: 'TIDAK_ADA' }
                                        }))}
                                        className={`px-2.5 py-1 rounded text-[11px] font-extrabold flex items-center gap-1 transition-all ${
                                          !isKembaliAda
                                            ? 'bg-red-600 text-white shadow-sm ring-2 ring-red-500'
                                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                        }`}
                                      >
                                        <XCircle className="h-3 w-3" /> TIDAK ADA
                                      </button>
                                    </div>
                                  </td>
                                  <td className="p-3">
                                    {!isKembaliAda ? (
                                      <input
                                        type="text"
                                        placeholder="Keterangan kekurangan..."
                                        value={item.keterangan_kembali || ''}
                                        onChange={e => setReturnChecklistsState(prev => ({
                                          ...prev,
                                          [item.id]: { ...prev[item.id], keterangan_kembali: e.target.value }
                                        }))}
                                        className="w-full px-2.5 py-1 text-xs border border-red-300 bg-white rounded text-red-900 focus:ring-1 focus:ring-red-500 font-medium"
                                      />
                                    ) : (
                                      <span className="text-gray-400 font-normal">-</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Pemeriksaan Kondisi Barang */}
              <div className="sm:col-span-2 p-4 bg-white rounded-2xl border border-gray-200 space-y-3">
                <label className="block font-bold text-gray-800">Pemeriksaan Kondisi Barang *</label>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-xs">
                    <input
                      type="radio"
                      name="damage_status"
                      value="sesuai_awal"
                      checked={returnForm.damage_status === 'sesuai_awal'}
                      onChange={e => setReturnForm({ ...returnForm, damage_status: e.target.value })}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-emerald-700">✓ Sesuai Kondisi Awal (Normal)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-bold text-xs">
                    <input
                      type="radio"
                      name="damage_status"
                      value="ada_kerusakan"
                      checked={returnForm.damage_status === 'ada_kerusakan'}
                      onChange={e => setReturnForm({ ...returnForm, damage_status: e.target.value })}
                      className="text-rose-600 focus:ring-indigo-500"
                    />
                    <span className="text-rose-700">⚠️ Ada Kerusakan Baru / Part Hilang</span>
                  </label>
                </div>

                {returnForm.damage_status === 'ada_kerusakan' && (
                  <div className="pt-2 animate-fade-in">
                    <label className="block font-semibold text-gray-700 mb-1">Catatan Kerusakan *</label>
                    <textarea
                      rows={2}
                      value={returnForm.damage_notes}
                      onChange={e => setReturnForm({ ...returnForm, damage_notes: e.target.value })}
                      placeholder="Contoh: Mesin mengalami kebocoran oli, body penyok, remote hilang..."
                      className="w-full px-3.5 py-2 border border-rose-300 bg-rose-50/50 rounded-xl focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                )}
              </div>

              {/* Catatan Tambahan */}
              <div className="sm:col-span-2">
                <label className="block font-semibold text-gray-700 mb-1">Catatan Tambahan (Opsional)</label>
                <textarea
                  rows={2}
                  value={returnForm.return_notes}
                  onChange={e => setReturnForm({ ...returnForm, return_notes: e.target.value })}
                  placeholder="Catatan tambahan saat barang diterima kembali di gudang..."
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Tanda Tangan Canvas */}
              <div className="sm:col-span-2">
                <SignaturePad
                  label="Tanda Tangan Pengembali Barang *"
                  value={returnForm.return_signature}
                  onChange={sig => setReturnForm({ ...returnForm, return_signature: sig })}
                />
              </div>
            </div>

            {submitting && (
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-[11px] font-bold text-amber-700">
                  <span>Mengunggah Foto Kondisi Pengembalian...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-amber-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setReturnModal({ open: false, booking: null })}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold transition shadow-md disabled:opacity-50"
              >
                {submitting ? 'Memproses Pengembalian...' : 'Konfirmasi Penerimaan Barang (Kirim ke Finance)'}
              </button>
            </div>
          </form>
        </Modal>

      </div>
    </AppLayout>
  );
}
