import { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import api, { IMAGE_BASE } from '../../lib/api';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import SignaturePad from '../../components/common/SignaturePad';
import RentalTimeline from '../../components/common/RentalTimeline';
import { useAuth } from '../../contexts/AuthContext';
import {
  Bell, Search, RotateCcw, Upload, Image as ImageIcon, FileText, CheckCircle2, AlertTriangle, Eye, Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getWIBDateTime, getTodayWIB, addOneDayStr } from '../../lib/dateUtils';
import { compressMultipleImages } from '../../lib/imageCompressor';

export default function AdminReturnReadyPage() {
  const { isAdminReturn, isAdminBooking } = useAuth();
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  // Return Form State Modal
  const [returnModal, setReturnModal] = useState({ open: false, booking: null });
  const [returnForm, setReturnForm] = useState({
    return_name: '',
    return_phone: '',
    return_date: new Date().toISOString().split('T')[0],
    return_time: '17:00',
    return_signature: '',
    damage_status: 'sesuai_awal',
    damage_notes: '',
    return_notes: '',
  });

  const [returnPhotos, setReturnPhotos] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isCompressing, setIsCompressing] = useState(false);

  useEffect(() => {
    fetchData();
  }, [page, search]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, size: 10 });
      if (search) p.set('search', search);
      const res = await api.get(`/return/ready?${p}`);
      setData(res.data.data || []);
      setPagination(res.data.pagination);
    } catch {
      toast.error('Gagal mengambil daftar barang siap dikembalikan');
    }
    setLoading(false);
  };

  const openReturnModal = (booking) => {
    const custName = booking.customer?.full_name || booking.user?.nama || booking.pengambil_nama || '';
    const custPhone = booking.customer?.phone || booking.user?.no_hp || booking.pengambil_no_hp || '';
    const nowWIB = getWIBDateTime();

    setReturnForm({
      return_name: custName,
      return_phone: custPhone,
      return_date: nowWIB.date,
      return_time: nowWIB.time,
      return_signature: '',
      damage_status: 'sesuai_awal',
      damage_notes: '',
      return_notes: '',
    });
    setReturnPhotos([]);
    setPhotoPreviews([]);
    setReturnModal({ open: true, booking });
  };

  const handlePhotoSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    if (returnPhotos.length + files.length > 5) {
      toast.error('Maksimal 5 foto kondisi pengembalian barang');
      return;
    }

    setIsCompressing(true);
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
    setIsCompressing(false);
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

    const nowWIB = getWIBDateTime();
    if (returnForm.return_date < nowWIB.date) {
      return toast.error(`Tanggal pengembalian tidak boleh tanggal yang sudah lewat! Minimal ${nowWIB.date}.`);
    }
    if (returnForm.return_date === nowWIB.date && returnForm.return_time < nowWIB.time) {
      return toast.error(`Jam pengembalian tidak boleh jam yang sudah lewat! Minimal jam saat ini WIB (${nowWIB.time}).`);
    }

    setSubmitting(true);
    setUploadProgress(0);
    try {
      const fd = new FormData();
      fd.append('booking_id', returnModal.booking.id);
      fd.append('return_name', returnForm.return_name);
      fd.append('return_phone', returnForm.return_phone);
      fd.append('return_date', returnForm.return_date);
      fd.append('return_time', returnForm.return_time);
      fd.append('return_signature', returnForm.return_signature);
      fd.append('damage_status', returnForm.damage_status);
      if (returnForm.damage_notes) fd.append('damage_notes', returnForm.damage_notes);
      if (returnForm.return_notes) fd.append('return_notes', returnForm.return_notes);

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
      toast.success('Penerimaan barang pengembalian berhasil! Data dikirim ke Admin Finance');
      setReturnModal({ open: false, booking: null });
      fetchData();
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Gagal memproses penerimaan pengembalian. Silakan periksa koneksi internet Anda.';
      toast.error(`Gagal Upload: ${errMsg}`);
    }
    setSubmitting(false);
  };

  return (
    <AppLayout title="Barang Siap Dikembalikan">
      <div className="animate-fade-in space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <Bell className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-gray-900">Barang Siap Dikembalikan</h1>
              <p className="text-xs text-gray-500">Daftar alat berat yang telah jatuh tempo atau siap diterima kembali oleh Admin Penerimaan</p>
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

        {/* Ready Return Table */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <LoadingSpinner className="py-16" />
          ) : data.length === 0 ? (
            <div className="p-12 text-center text-gray-500 text-xs">
              Belum ada barang yang jatuh tempo untuk dikembalikan saat ini.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-4">Nomor Booking</th>
                    <th className="px-5 py-4">Customer</th>
                    <th className="px-5 py-4">Alat</th>
                    <th className="px-5 py-4">Tanggal Keluar</th>
                    <th className="px-5 py-4">Tanggal Kembali</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {data.map((b) => {
                    const custName = b.customer?.full_name || b.user?.nama || b.pengambil_nama || 'Customer';
                    const alatNames = b.details?.map(d => d.alat?.nama_alat).filter(Boolean).join(', ') || 'Alat Rental';
                    const pickupDate = b.pickup?.pickup_date || b.tanggal_mulai;

                    return (
                      <tr key={b.id} className="hover:bg-slate-50/60 transition">
                        <td className="px-5 py-4 font-mono font-bold text-indigo-600">
                          {b.kode_booking}
                        </td>
                        <td className="px-5 py-4 font-extrabold text-gray-900">
                          {custName}
                        </td>
                        <td className="px-5 py-4 text-gray-700">
                          <div className="space-y-1">
                            {b.details?.map((d, idx) => (
                              <div key={d.id || idx} className="flex items-center gap-1.5 text-xs font-bold text-gray-900">
                                <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-800 text-[10px] flex items-center justify-center font-extrabold">{idx + 1}</span>
                                <span>{d.alat?.nama_alat || 'Alat Rental'} ({d.qty} Unit)</span>
                              </div>
                            )) || <span className="text-gray-500 font-normal">Alat Rental</span>}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-gray-600">
                          {pickupDate}
                        </td>
                        <td className="px-5 py-4 text-amber-700 font-bold">
                          {b.tanggal_selesai}
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-[11px] font-extrabold uppercase tracking-wider">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                            🟠 SIAP DIKEMBALIKAN
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <button
                            onClick={() => openReturnModal(b)}
                            className="px-4 py-1.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl font-extrabold transition text-xs flex items-center gap-1 shadow-md mx-auto cursor-pointer"
                          >
                            <RotateCcw className="h-3.5 w-3.5" /> Terima Barang
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {pagination && pagination.totalPages > 1 && (
            <div className="p-4 border-t border-gray-100">
              <Pagination page={page} totalPages={pagination.totalPages} onPageChange={setPage} />
            </div>
          )}
        </div>

        {/* MODAL FORM PENERIMAAN BARANG KEMBALI */}
        <Modal
          isOpen={returnModal.open}
          onClose={() => setReturnModal({ open: false, booking: null })}
          title={`FORM PENERIMAAN BARANG KEMBALI (#${returnModal.booking?.kode_booking})`}
          size="lg"
        >
          <form onSubmit={handleReturnSubmit} className="space-y-5">
            {returnModal.booking && (
              <div className="space-y-4">
                <RentalTimeline status={returnModal.booking.status} />

                {returnModal.booking.details?.length > 0 && (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                    <div className="flex justify-between items-center font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">
                      <span>Daftar Alat Berat Yang Disewa (Itemized):</span>
                      <span className="text-indigo-600 font-mono">Total: {returnModal.booking.details.length} Jenis Alat</span>
                    </div>
                    <div className="space-y-2 pt-1">
                      {returnModal.booking.details.map((d, idx) => (
                        <div key={d.id || idx} className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-lg bg-indigo-100 text-indigo-700 text-[10px] font-black flex items-center justify-center">{idx + 1}</span>
                            <div>
                              <p className="font-bold text-gray-900">{d.alat?.nama_alat || 'Alat Rental'}</p>
                              <p className="text-[10px] text-gray-500 font-medium">Periode: {d.tanggal_mulai || returnModal.booking.tanggal_mulai} s/d {d.tanggal_selesai || returnModal.booking.tanggal_selesai}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md font-bold text-[11px] block">{d.qty} Unit</span>
                            <span className="text-[10px] font-extrabold text-emerald-700">Rp {Number(d.subtotal || 0).toLocaleString('id-ID')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
                  min={getTodayWIB()}
                  value={returnForm.return_date}
                  onChange={(e) => {
                    const val = e.target.value;
                    setReturnForm((prev) => ({ ...prev, return_date: val }));
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Jam Pengembalian *</label>
                <input
                  type="time"
                  required
                  value={returnForm.return_time}
                  onChange={(e) => {
                    const val = e.target.value;
                    setReturnForm((prev) => {
                      if (val === '00:00' && prev.return_date === getTodayWIB()) {
                        return {
                          ...prev,
                          return_date: addOneDayStr(prev.return_date),
                          return_time: '00:00',
                        };
                      }
                      return { ...prev, return_time: val };
                    });
                  }}
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

              {/* Pemeriksaan Kondisi Barang */}
              <div className="sm:col-span-2 p-4 bg-white rounded-2xl border border-gray-200 space-y-3">
                <label className="block font-bold text-gray-800 text-xs uppercase tracking-wider">Pemeriksaan Kondisi Barang *</label>
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-xs">
                    <input
                      type="radio"
                      name="damage_status"
                      value="sesuai_awal"
                      checked={returnForm.damage_status === 'sesuai_awal' || returnForm.damage_status === 'baik'}
                      onChange={e => setReturnForm({ ...returnForm, damage_status: 'sesuai_awal' })}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">✓ Baik (Normal / Sesuai Awal)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-bold text-xs">
                    <input
                      type="radio"
                      name="damage_status"
                      value="rusak_ringan"
                      checked={returnForm.damage_status === 'rusak_ringan'}
                      onChange={e => setReturnForm({ ...returnForm, damage_status: 'rusak_ringan' })}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">⚠️ Rusak Ringan (Maintenance)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-bold text-xs">
                    <input
                      type="radio"
                      name="damage_status"
                      value="rusak_berat"
                      checked={returnForm.damage_status === 'rusak_berat' || returnForm.damage_status === 'ada_kerusakan'}
                      onChange={e => setReturnForm({ ...returnForm, damage_status: 'rusak_berat' })}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    <span className="text-rose-800 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">✕ Rusak Berat (Perbaikan Total)</span>
                  </label>
                </div>
              </div>

              {(returnForm.damage_status === 'ada_kerusakan' || returnForm.damage_status === 'rusak_ringan' || returnForm.damage_status === 'rusak_berat') && (
                <div className="pt-2 animate-fade-in sm:col-span-2">
                  <label className="block font-semibold text-gray-700 mb-1">Detail Kerusakan *</label>
                  <textarea
                    rows={2}
                    value={returnForm.damage_notes}
                    onChange={e => setReturnForm({ ...returnForm, damage_notes: e.target.value })}
                    placeholder="Contoh: Mesin mengalami kebocoran oli, body penyok, remote hilang..."
                    className="w-full px-3.5 py-2 border border-rose-300 bg-rose-50/50 rounded-xl focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              )}

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
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-extrabold transition shadow-md disabled:opacity-50 cursor-pointer"
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
