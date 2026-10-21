import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import api, { IMAGE_BASE } from '../../lib/api';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import SignaturePad from '../../components/common/SignaturePad';
import RentalTimeline from '../../components/common/RentalTimeline';
import { useAuth } from '../../contexts/AuthContext';
import {
  Truck, Search, Package, CheckCircle2, Clock, Upload,
  Image as ImageIcon, FileText, UserCheck, AlertTriangle, RotateCcw, Eye, Phone, MapPin, Calendar, CreditCard, AlertCircle, MessageSquare, DollarSign, Filter, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminRentedPage() {
  const navigate = useNavigate();
  const { isAdminReturn, isAdminBooking } = useAuth();
  const [data, setData] = useState([]);
  const [metrics, setMetrics] = useState({
    totalDisewa: 0,
    jatuhTempoHariIni: 0,
    terlambatKembali: 0,
    totalNilaiAktif: 0,
  });
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusWaktuFilter, setStatusWaktuFilter] = useState('semua');

  // Return Form State Modal
  const [returnModal, setReturnModal] = useState({ open: false, booking: null });
  const [selectedDetailIds, setSelectedDetailIds] = useState([]);
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

  useEffect(() => {
    fetchData();
  }, [page, search, statusWaktuFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, size: 10 });
      if (search) p.set('search', search);
      if (statusWaktuFilter !== 'semua') p.set('status_waktu', statusWaktuFilter);

      const res = await api.get(`/return/rented?${p}`);
      setData(res.data.data || []);
      setPagination(res.data.pagination);
      if (res.data.metrics) setMetrics(res.data.metrics);
    } catch {
      toast.error('Gagal mengambil daftar barang sedang disewa');
    }
    setLoading(false);
  };

  const openReturnModal = (booking) => {
    const custName = booking.customer?.full_name || booking.user?.nama || booking.pengambil_nama || '';
    const custPhone = booking.customer?.phone || booking.user?.no_hp || booking.pengambil_no_hp || '';

    const activeDetails = (booking.details || []).filter(d =>
      ['BARANG_SEDANG_DISEWA', 'RENTED', 'disewa', 'SEDANG_DISEWA', 'SIAP_DIKEMBALIKAN', 'WAITING_RETURN', 'PEMERIKSAAN_BARANG'].includes(d.status)
    );
    setSelectedDetailIds(activeDetails.map(d => d.id));

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
    setReturnModal({ open: true, booking });
  };

  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    if (returnPhotos.length + files.length > 5) {
      toast.error('Maksimal 5 foto kondisi pengembalian barang');
      return;
    }

    const newPhotos = [...returnPhotos, ...files];
    setReturnPhotos(newPhotos);

    const newPreviews = files.map(file => URL.createObjectURL(file));
    setPhotoPreviews(prev => [...prev, ...newPreviews]);
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

    if (selectedDetailIds.length === 0) {
      return toast.error('Pilih minimal 1 barang yang akan dikembalikan!');
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('booking_id', returnModal.booking.id);
      selectedDetailIds.forEach(id => {
        fd.append('booking_detail_ids[]', id);
      });
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

      await api.post('/return/process', fd);
      toast.success('Pengembalian berhasil, booking telah selesai');
      setReturnModal({ open: false, booking: null });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal memproses penerimaan pengembalian');
    }
    setSubmitting(false);
  };

  const openWhatsApp = (phone, custName, bookingCode) => {
    if (!phone) return toast.error('Nomor telepon customer tidak tersedia');
    let cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    }
    const message = encodeURIComponent(`Halo ${custName}, kami dari Admin RentalHub mengenai pemesanan alat berat #${bookingCode}. Mohon konfirmasi jadwal pengembalian alat berat Anda. Terima kasih.`);
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  const calculateStatus = (endDateStr) => {
    if (!endDateStr) return { diffDays: 0, statusWaktu: 'aman', statusRental: 'sedang_disewa' };
    const endDate = new Date(endDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    const diffTime = endDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let statusWaktu = 'aman'; // 'aman', 'segera_kembali', 'terlambat'
    let statusRental = 'sedang_disewa'; // 'sedang_disewa', 'siap_dikembalikan', 'terlambat'

    if (diffDays < 0) {
      statusWaktu = 'terlambat';
      statusRental = 'terlambat';
    } else if (diffDays === 0) {
      statusWaktu = 'segera_kembali';
      statusRental = 'siap_dikembalikan';
    } else if (diffDays <= 3) {
      statusWaktu = 'segera_kembali';
      statusRental = 'sedang_disewa';
    }

    return { diffDays, statusWaktu, statusRental };
  };

  return (
    <AppLayout title="Barang Sedang Disewa (Monitoring Rental)">
      <div className="animate-fade-in space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center font-bold">
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-gray-900">Barang Sedang Disewa</h1>
              <p className="text-xs text-gray-500">Monitoring seluruh unit alat berat yang aktif disewa customer secara real-time</p>
            </div>
          </div>
        </div>

        {/* SUMMARY CARDS METRICS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-extrabold">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Barang Disewa</p>
              <h3 className="text-2xl font-black text-gray-900">{metrics.totalDisewa} <span className="text-xs font-bold text-gray-400">Unit</span></h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-extrabold">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Jatuh Tempo Hari Ini</p>
              <h3 className="text-2xl font-black text-amber-600">{metrics.jatuhTempoHariIni} <span className="text-xs font-bold text-gray-400">Unit</span></h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-extrabold">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Terlambat Kembali</p>
              <h3 className="text-2xl font-black text-rose-600">{metrics.terlambatKembali} <span className="text-xs font-bold text-gray-400">Unit</span></h3>
            </div>
          </div>
        </div>

        {/* SEARCH & FILTER PILLS */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari kode booking, nama customer, atau alat..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
            <button
              onClick={() => setStatusWaktuFilter('semua')}
              className={`px-3 py-1.5 rounded-xl font-extrabold transition cursor-pointer ${
                statusWaktuFilter === 'semua' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setStatusWaktuFilter('aman')}
              className={`px-3 py-1.5 rounded-xl font-extrabold transition cursor-pointer flex items-center gap-1 ${
                statusWaktuFilter === 'aman' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              🟢 Normal (Aman)
            </button>
            <button
              onClick={() => setStatusWaktuFilter('segera_kembali')}
              className={`px-3 py-1.5 rounded-xl font-extrabold transition cursor-pointer flex items-center gap-1 ${
                statusWaktuFilter === 'segera_kembali' ? 'bg-amber-600 text-white shadow-sm' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              🟡 Segera Kembali
            </button>
            <button
              onClick={() => setStatusWaktuFilter('terlambat')}
              className={`px-3 py-1.5 rounded-xl font-extrabold transition cursor-pointer flex items-center gap-1 ${
                statusWaktuFilter === 'terlambat' ? 'bg-rose-600 text-white shadow-sm' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              🔴 Terlambat
            </button>
          </div>
        </div>

        {/* Rented Bookings Table */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <LoadingSpinner className="py-16" />
          ) : data.length === 0 ? (
            <div className="p-12 text-center text-gray-500 text-xs">
              Tidak ada data alat sedang disewa yang sesuai kriteria filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-4">Nomor Booking</th>
                    <th className="px-5 py-4">Customer</th>
                    <th className="px-5 py-4">Alat Yang Disewa</th>
                    <th className="px-5 py-4">Tanggal Keluar</th>
                    <th className="px-5 py-4">Estimasi Kembali</th>
                    <th className="px-5 py-4">Sisa Hari</th>
                    <th className="px-5 py-4">Status Waktu</th>
                    <th className="px-5 py-4">Status Rental</th>
                    <th className="px-5 py-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {data.map((b) => {
                    const custName = b.customer?.full_name || b.user?.nama || b.pengambil_nama || 'Customer';
                    const custPhone = b.customer?.phone || b.user?.no_hp || b.pengambil_no_hp || '';
                    const alatNames = b.details?.map(d => d.alat?.nama_alat).filter(Boolean).join(', ') || 'Alat Rental';
                    const pickupDate = b.pickup?.pickup_date || b.tanggal_mulai;

                    const { diffDays, statusWaktu, statusRental } = calculateStatus(b.tanggal_selesai);

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
                        <td className="px-5 py-4 text-indigo-700 font-bold">
                          {b.tanggal_selesai}
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-bold text-gray-800">
                            {diffDays > 0 ? `${diffDays} Hari` : diffDays === 0 ? 'Hari Ini' : `Lewat ${Math.abs(diffDays)} Hari`}
                          </span>
                        </td>
                        {/* Status Waktu Indicator */}
                        <td className="px-5 py-4">
                          {statusWaktu === 'aman' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-extrabold">
                              🟢 Aman
                            </span>
                          )}
                          {statusWaktu === 'segera_kembali' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-[11px] font-extrabold">
                              🟡 Segera Kembali
                            </span>
                          )}
                          {statusWaktu === 'terlambat' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-extrabold">
                              🔴 Terlambat
                            </span>
                          )}
                        </td>
                        {/* Status Rental Badge */}
                        <td className="px-5 py-4">
                          {statusRental === 'sedang_disewa' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[11px] font-extrabold uppercase tracking-wider">
                              🟢 SEDANG DISEWA
                            </span>
                          )}
                          {statusRental === 'siap_dikembalikan' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-[11px] font-extrabold uppercase tracking-wider">
                              🟡 SIAP DIKEMBALIKAN
                            </span>
                          )}
                          {statusRental === 'terlambat' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-100 text-rose-800 rounded-full text-[11px] font-extrabold uppercase tracking-wider">
                              🔴 TERLAMBAT
                            </span>
                          )}
                        </td>
                        {/* Actions */}
                        <td className="px-5 py-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Detail Button */}
                            <button
                              onClick={() => navigate(`/return/detail/${b.id}`)}
                              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold transition text-xs flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="h-3.5 w-3.5" /> Detail
                            </button>

                            {/* Hubungi WhatsApp Button if Terlambat */}
                            {statusRental === 'terlambat' && (
                              <button
                                onClick={() => openWhatsApp(custPhone, custName, b.kode_booking)}
                                className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-extrabold transition text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                                title="Hubungi via WhatsApp"
                              >
                                <MessageSquare className="h-3.5 w-3.5" /> WA
                              </button>
                            )}

                            {/* Terima Barang Button if Siap / Terlambat */}
                            {(statusRental === 'siap_dikembalikan' || statusRental === 'terlambat') && (isAdminReturn || isAdminBooking) && (
                              <button
                                onClick={() => openReturnModal(b)}
                                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-extrabold transition text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                              >
                                <RotateCcw className="h-3.5 w-3.5" /> Terima Barang
                              </button>
                            )}
                          </div>
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
          title={`DATA PENGEMBALIAN BARANG (#${returnModal.booking?.kode_booking})`}
          size="lg"
        >
          <form onSubmit={handleReturnSubmit} className="space-y-5">
            {returnModal.booking && (
              <RentalTimeline status={returnModal.booking.status} />
            )}

            {/* Pilihan Barang yang Dikembalikan (Support Pengembalian Parsial) */}
            {returnModal.booking?.details && (
              <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <label className="block font-extrabold text-indigo-950 text-xs">
                    Pilih Barang Yang Dikembalikan (Bisa Parsial atau Semua) *
                  </label>
                  <span className="text-[11px] font-bold text-indigo-600 bg-indigo-100/80 px-2 py-0.5 rounded-md">
                    {selectedDetailIds.length} dari {(returnModal.booking.details || []).filter(d => ['BARANG_SEDANG_DISEWA', 'RENTED', 'disewa', 'SEDANG_DISEWA', 'SIAP_DIKEMBALIKAN', 'WAITING_RETURN', 'PEMERIKSAAN_BARANG'].includes(d.status)).length} barang dipilih
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {(returnModal.booking.details || [])
                    .filter(d => ['BARANG_SEDANG_DISEWA', 'RENTED', 'disewa', 'SEDANG_DISEWA', 'SIAP_DIKEMBALIKAN', 'WAITING_RETURN', 'PEMERIKSAAN_BARANG'].includes(d.status))
                    .map(item => (
                      <label
                        key={item.id}
                        className={`flex items-center gap-2.5 p-3 rounded-xl border transition cursor-pointer ${
                          selectedDetailIds.includes(item.id)
                            ? 'bg-white border-indigo-500 text-indigo-950 font-bold shadow-xs'
                            : 'bg-gray-50 border-gray-200 text-gray-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedDetailIds.includes(item.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDetailIds([...selectedDetailIds, item.id]);
                            } else {
                              if (selectedDetailIds.length === 1) {
                                toast.error('Minimal 1 barang harus dipilih untuk dikembalikan!');
                                return;
                              }
                              setSelectedDetailIds(selectedDetailIds.filter(id => id !== item.id));
                            }
                          }}
                          className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                        />
                        <div className="min-w-0 flex-1 text-xs">
                          <div className="font-extrabold truncate">{item.alat?.nama_alat || item.nama_alat || 'Unit Alat'}</div>
                          <div className="text-[11px] font-normal text-gray-500">Qty: {item.qty || 1} Unit • Merk: {item.alat?.merk || '-'}</div>
                        </div>
                      </label>
                    ))}
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
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold transition shadow-md disabled:opacity-50 cursor-pointer"
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
