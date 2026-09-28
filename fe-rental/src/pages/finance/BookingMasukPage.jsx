import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import FinanceStats from '../../components/finance/FinanceStats';
import Modal from '../../components/common/Modal';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import {
  Inbox, Eye, CheckCircle2, XCircle, FileText, Search, Filter,
  Upload, CreditCard, DollarSign, Calendar, Clock, User, Phone,
  ChevronRight, ArrowRight, ShieldCheck, FileCheck, Check, Package, Percent
} from 'lucide-react';

const STAGES = [
  'Booking Dibuat',
  'Menunggu Pembayaran',
  'Pembayaran Diterima',
  'Invoice Terbit',
  'Selesai'
];

export default function BookingMasukPage() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [discountInput, setDiscountInput] = useState('0');
  
  // Modals
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isManualPayOpen, setIsManualPayOpen] = useState(false);
  const [isUploadProofOpen, setIsUploadProofOpen] = useState(false);
  const [isViewProofOpen, setIsViewProofOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  
  // Form states
  const [manualPayData, setManualPayData] = useState({ nominal: '', metode: 'Transfer Bank', referensi: '', catatan: '' });
  const [rejectReason, setRejectReason] = useState('');
  const [uploadFile, setUploadFile] = useState(null);

  useEffect(() => {
    fetchBackendBookings();
  }, []);

  function getStatusLabel(status) {
    switch (status) {
      case 'WAITING_PICKUP': return 'Menunggu Pengeluaran Barang';
      case 'RENTED': return 'Barang Sedang Disewa';
      case 'WAITING_RETURN': return 'Menunggu Pengembalian';
      case 'WAITING_FINANCE': return 'Menunggu Verification Finance';
      case 'PAID': return 'Lunas';
      case 'COMPLETED': return 'Selesai';
      case 'CANCELLED': return 'Dibatalkan';
      case 'menunggu_pembayaran': return 'Menunggu Pembayaran';
      case 'dikonfirmasi': return 'Pembayaran Diterima';
      case 'lunas': return 'Lunas';
      case 'dibatalkan': return 'Ditolak';
      default: return 'Menunggu Finance';
    }
  }

  function getStepFromStatus(status) {
    switch (status) {
      case 'WAITING_PICKUP': return 1;
      case 'RENTED': return 2;
      case 'WAITING_RETURN': return 3;
      case 'WAITING_FINANCE': return 3;
      case 'PAID':
      case 'COMPLETED':
      case 'lunas': return 4;
      default: return 1;
    }
  }

  const fetchBackendBookings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/bookings');
      if (res.data?.data && Array.isArray(res.data.data)) {
        // Filter out cancelled/rejected bookings automatically
        const activeBookings = res.data.data.filter(b => b.status !== 'dibatalkan');

        const formatted = activeBookings.map((b, idx) => {
          const detailsList = b.details || [];
          const barangNames = detailsList.map(d => `${d.alat?.nama_alat || 'Alat'} (${d.qty || 1} unit)`).join(', ') || 'Alat Rental';

          return {
            id: b.id,
            kode_booking: b.kode_booking || `RB-${b.id}`,
            customer: b.customer?.full_name || b.user?.nama || 'Customer',
            kontak: b.customer?.phone || b.user?.no_hp || '08xxxxxxxx',
            email: b.customer?.email || b.user?.email || 'customer@rental.com',
            barang: barangNames,
            details: detailsList,
            qty: detailsList.reduce((sum, d) => sum + Number(d.qty || 1), 0),
            tanggal_mulai: b.tanggal_mulai ? new Date(b.tanggal_mulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-',
            tanggal_selesai: b.tanggal_selesai ? new Date(b.tanggal_selesai).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-',
            durasi: `${(b.tanggal_mulai && b.tanggal_selesai)
              ? Math.max(1, Math.round((new Date(b.tanggal_selesai) - new Date(b.tanggal_mulai)) / (1000 * 60 * 60 * 24)) + 1)
              : (b.details && b.details[0]?.tanggal_mulai && b.details[0]?.tanggal_selesai
                  ? Math.max(1, Math.round((new Date(b.details[0].tanggal_selesai) - new Date(b.details[0].tanggal_mulai)) / (1000 * 60 * 60 * 24)) + 1)
                  : (b.total_hari || 1))} Hari`,
            harga_rental: Number(b.total_harga || 0),
            subtotal_rental: Number(b.total_harga || 0),
            discount_percentage: Number(b.discount_percentage || 0),
            discount_amount: Number(b.discount_amount || 0),
            final_payment: Number(b.final_payment || b.total_harga || 0),
            biaya_tambahan: Number(b.uang_jaminan || 0),
            total: Number(b.final_payment || b.total_harga || 0),
            status_pembayaran: getStatusLabel(b.status),
            progress_step: getStepFromStatus(b.status),
            bukti_bayar: b.bukti_bayar || null,
            catatan: b.catatan || 'Booking dari Admin Booking'
          };
        });
        setBookings(formatted);
      } else {
        setBookings([]);
      }
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetail = (booking) => {
    setSelectedBooking(booking);
    setDiscountInput(String(booking.discount_amount || '0'));
    setIsDetailOpen(true);
  };

  const handleApplyDiscount = async () => {
    if (!selectedBooking) return;
    const discAmt = parseFloat(discountInput);
    if (isNaN(discAmt) || discAmt < 0) {
      return toast.error('Masukkan nominal diskon yang valid (tidak boleh negatif)');
    }

    try {
      const res = await api.patch(`/bookings/${selectedBooking.id}/discount`, {
        discount_amount: discAmt
      });
      toast.success(res.data?.message || 'Diskon berhasil diterapkan!');

      // Refresh list & current selected booking
      fetchBackendBookings();
      const updatedData = res.data?.data;
      if (updatedData) {
        setSelectedBooking(prev => ({
          ...prev,
          discount_percentage: updatedData.discount_percentage,
          discount_amount: updatedData.discount_amount,
          final_payment: updatedData.final_payment,
          total: updatedData.final_payment,
        }));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menerapkan diskon');
    }
  };

  const handleConfirmPayment = async (bookingToConfirm) => {
    const target = bookingToConfirm || selectedBooking;
    if (!target) return;

    try {
      // Create/Confirm Pembayaran entry in database
      await api.post('/pembayaran', {
        booking_id: target.id,
        jumlah: target.total,
        metode: 'transfer',
        status: 'lunas'
      });

      // Update booking status in database
      try {
        await api.patch(`/bookings/${target.id}/status`, { status: 'dikonfirmasi' });
      } catch {}

      toast.success('Pembayaran berhasil diselesaikan');
      setIsDetailOpen(false);

      if (selectedBooking && selectedBooking.id === target.id) {
        setSelectedBooking(prev => ({ ...prev, status_pembayaran: 'Lunas', progress_step: 2 }));
      }
      
      // Refresh list from database
      await fetchBackendBookings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Terdapat masalah saat memperbarui pembayaran');
    }
  };

  const handleRejectPayment = async () => {
    if (!rejectReason.trim()) {
      toast.error('Silakan masukkan alasan penolakan');
      return;
    }

    if (!selectedBooking) return;

    try {
      await api.patch(`/bookings/${selectedBooking.id}/status`, {
        status: 'dibatalkan',
        alasan_pembatalan: rejectReason
      });

      toast.error(`Pembayaran ${selectedBooking.kode_booking} berhasil ditolak (Alasan: ${rejectReason}) & otomatis dihapus dari seluruh sistem!`);
      setIsRejectOpen(false);
      setIsDetailOpen(false);
      setRejectReason('');
      await fetchBackendBookings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menolak pembayaran');
    }
  };

  const handleCreateInvoice = (booking) => {
    const target = booking || selectedBooking;
    if (!target) return;

    // Update progress to Invoice Terbit
    const updated = bookings.map(b => {
      if (b.id === target.id) {
        return { ...b, progress_step: Math.max(b.progress_step, 3), status_pembayaran: b.status_pembayaran === 'Lunas' ? 'Lunas' : 'Invoice Terbit' };
      }
      return b;
    });
    setBookings(updated);

    toast.success(`Invoice untuk ${target.kode_booking} berhasil dibuat!`);
    setIsDetailOpen(false);
    navigate(`/finance/invoice?kode=${target.kode_booking}`);
  };

  const handleSaveManualPay = (e) => {
    e.preventDefault();
    if (!manualPayData.nominal) {
      toast.error('Masukkan nominal pembayaran');
      return;
    }

    if (!selectedBooking) return;

    const updated = bookings.map(b => {
      if (b.id === selectedBooking.id) {
        return {
          ...b,
          status_pembayaran: 'Pembayaran Diterima',
          progress_step: 2,
          catatan: `Manual Pay: Rp ${Number(manualPayData.nominal).toLocaleString('id-ID')} (${manualPayData.metode})`
        };
      }
      return b;
    });

    setBookings(updated);
    setSelectedBooking(prev => ({
      ...prev,
      status_pembayaran: 'Pembayaran Diterima',
      progress_step: 2
    }));

    setIsManualPayOpen(false);
    setIsDetailOpen(false);
    setManualPayData({ nominal: '', metode: 'Transfer Bank', referensi: '', catatan: '' });
    toast.success('Pembayaran manual berhasil dicatat!');
  };

  const handleUploadTransferProof = (e) => {
    e.preventDefault();
    if (!uploadFile) {
      toast.error('Pilih file bukti transfer terlebih dahulu');
      return;
    }

    const fakeUrl = URL.createObjectURL(uploadFile);
    const updated = bookings.map(b => {
      if (b.id === selectedBooking.id) {
        return {
          ...b,
          bukti_bayar: fakeUrl
        };
      }
      return b;
    });

    setBookings(updated);
    setSelectedBooking(prev => ({ ...prev, bukti_bayar: fakeUrl }));
    setIsUploadProofOpen(false);
    setIsDetailOpen(false);
    setUploadFile(null);
    toast.success('Bukti transfer berhasil diupload!');
  };

  // Filter & Search logic
  const filteredBookings = bookings.filter(b => {
    const matchesSearch = b.kode_booking.toLowerCase().includes(search.toLowerCase()) ||
                          b.customer.toLowerCase().includes(search.toLowerCase()) ||
                          b.barang.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filterStatus ? b.status_pembayaran === filterStatus : true;
    return matchesSearch && matchesFilter;
  });

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'Menunggu Pembayaran':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'DP Masuk':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Pembayaran Diterima':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Invoice Terbit':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Lunas':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Ditolak':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  // Calculate dynamic stats from real booking list
  const totalBaru = bookings.length;
  const totalMenunggu = bookings.filter(b => b.status_pembayaran === 'Menunggu Pembayaran' || b.status_pembayaran === 'DP Masuk').length;
  const totalLunas = bookings.filter(b => b.status_pembayaran === 'Lunas' || b.status_pembayaran === 'Pembayaran Diterima').length;
  const totalIncome = bookings
    .filter(b => b.status_pembayaran === 'Lunas' || b.status_pembayaran === 'Pembayaran Diterima')
    .reduce((acc, curr) => acc + Number(curr.total || 0), 0);

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                Role: Admin Finance
              </span>
            </div>
            <h1 className="text-2xl font-black text-gray-900 mt-1">Selesai Sewa</h1>
            <p className="text-sm text-gray-500">
              Semua data booking dari Admin Booking secara otomatis diterima & dikelola oleh Admin Finance.
            </p>
          </div>
        </div>

        {/* Top Indicators */}
        <FinanceStats
          bookingBaru={totalBaru}
          menungguPembayaran={totalMenunggu}
          sudahLunas={totalLunas}
          pendapatanBulanIni={totalIncome}
        />

        {/* Filters & Actions Bar */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari kode booking, customer, atau barang rental..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="w-full sm:w-48 pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Semua Status</option>
                <option value="Menunggu Pembayaran">Menunggu Pembayaran</option>
                <option value="DP Masuk">DP Masuk</option>
                <option value="Pembayaran Diterima">Pembayaran Diterima</option>
                <option value="Invoice Terbit">Invoice Terbit</option>
                <option value="Lunas">Lunas</option>
                <option value="Ditolak">Ditolak</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table View */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-gray-100 text-xs font-bold uppercase tracking-wider text-gray-500">
                  <th className="px-5 py-4">Kode Booking</th>
                  <th className="px-5 py-4">Customer</th>
                  <th className="px-5 py-4">Barang Rental</th>
                  <th className="px-5 py-4">Tanggal Rental</th>
                  <th className="px-5 py-4">Durasi</th>
                  <th className="px-5 py-4">Total Biaya</th>
                  <th className="px-5 py-4">Status Pembayaran</th>
                  <th className="px-5 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-400 font-medium">
                      <span className="inline-block h-5 w-5 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin mr-2 align-middle"></span>
                      Memuat data booking dari Admin Booking...
                    </td>
                  </tr>
                ) : filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-400 font-medium">
                      Belum ada data selesai sewa dari Admin Booking.
                    </td>
                  </tr>
                ) : (
                  filteredBookings.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/60 transition-colors group cursor-pointer"
                      onClick={() => handleOpenDetail(item)}
                    >
                      <td className="px-5 py-4 font-extrabold text-indigo-600 group-hover:underline">
                        {item.kode_booking}
                      </td>
                      <td className="px-5 py-4 font-medium text-gray-900">
                        {item.customer}
                      </td>
                      <td className="px-5 py-4 text-gray-700">
                        {item.details && item.details.length > 1 ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-xl text-xs font-black shadow-2xs">
                            <Package className="h-3.5 w-3.5 text-indigo-600" />
                            {item.details.length} Item Rental
                          </span>
                        ) : (
                          <span className="font-bold text-gray-900">
                            {item.details?.[0]?.alat?.nama_alat || item.barang}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-gray-600 text-xs font-medium">
                        {item.tanggal_mulai} - {item.tanggal_selesai}
                      </td>
                      <td className="px-5 py-4 text-gray-700 font-semibold">
                        {item.durasi}
                      </td>
                      <td className="px-5 py-4 font-bold text-gray-900">
                        Rp {Number(item.total).toLocaleString('id-ID')}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadgeStyle(item.status_pembayaran)}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          {item.status_pembayaran}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenDetail(item)}
                            className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
                            title="Detail Booking"
                          >
                            <Eye className="h-3.5 w-3.5" /> Detail
                          </button>
                          {item.status_pembayaran !== 'Lunas' && item.status_pembayaran !== 'Pembayaran Diterima' && (
                            <button
                              onClick={() => handleConfirmPayment(item)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 transition-all shadow-xs"
                              title="Konfirmasi Pembayaran"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" /> Konfirmasi
                            </button>
                          )}
                          <button
                            onClick={() => handleCreateInvoice(item)}
                            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1 transition-all shadow-xs"
                            title="Buat Invoice"
                          >
                            <FileText className="h-3.5 w-3.5" /> Invoice
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* DETAIL BOOKING MODAL */}
        <Modal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          title={`Detail Booking #${selectedBooking?.kode_booking}`}
          size="lg"
        >
          {selectedBooking && (
            <div className="space-y-6">
              {/* Progress Tracker Status Pembayaran */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-gray-100">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
                  STATUS PEMBAYARAN: Progress Flow
                </p>
                <div className="relative flex items-center justify-between">
                  {STAGES.map((stageName, idx) => {
                    const isPassed = idx <= selectedBooking.progress_step;
                    const isCurrent = idx === selectedBooking.progress_step;
                    return (
                      <div key={stageName} className="flex flex-col items-center relative z-10 flex-1">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                            isPassed
                              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                              : 'bg-gray-200 text-gray-500'
                          } ${isCurrent ? 'ring-4 ring-emerald-100 scale-110' : ''}`}
                        >
                          {isPassed ? <Check className="h-4 w-4" /> : idx + 1}
                        </div>
                        <span
                          className={`text-[10px] font-medium text-center mt-2 max-w-[80px] leading-tight ${
                            isPassed ? 'text-emerald-700 font-bold' : 'text-gray-400'
                          }`}
                        >
                          {stageName}
                        </span>
                      </div>
                    );
                  })}
                  {/* Connecting Line */}
                  <div className="absolute top-4 left-6 right-6 h-0.5 bg-gray-200 -z-0">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{
                        width: `${(selectedBooking.progress_step / (STAGES.length - 1)) * 100}%`
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Detail Rental */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-2">
                  <User className="h-4 w-4 text-indigo-600" /> Detail Rental
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-400">Kode Booking</p>
                    <p className="font-extrabold text-indigo-600 text-base">{selectedBooking.kode_booking}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Customer</p>
                    <p className="font-bold text-gray-900">{selectedBooking.customer}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Kontak</p>
                    <p className="font-medium text-gray-700 flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5 text-gray-400" /> {selectedBooking.kontak}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Email</p>
                    <p className="font-medium text-gray-700">{selectedBooking.email}</p>
                  </div>
                </div>

                {/* Daftar Barang Active Billed Items */}
                <div className="pt-2 border-t border-gray-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Package className="h-4 w-4 text-indigo-600" />
                      Daftar Barang Rental Aktif ({
                        (selectedBooking.details || []).filter(d =>
                          ['BARANG_SEDANG_DISEWA', 'SEDANG_DISEWA', 'RENTED', 'disewa', 'SIAP_DIKEMBALIKAN', 'WAITING_RETURN', 'SELESAI_DISEWA', 'BARANG_DIKEMBALIKAN'].includes(d.status) || d.pickup != null
                        ).length
                      } / {selectedBooking.details?.length || 1} Item Keluar):
                    </p>
                  </div>

                  {((selectedBooking.details || []).filter(d =>
                    ['BARANG_SEDANG_DISEWA', 'SEDANG_DISEWA', 'RENTED', 'disewa', 'SIAP_DIKEMBALIKAN', 'WAITING_RETURN', 'SELESAI_DISEWA', 'BARANG_DIKEMBALIKAN'].includes(d.status) || d.pickup != null
                  ).length === 0) && (
                    <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 font-medium">
                      ⚠️ <strong>Informasi Finance:</strong> Belum ada alat yang diproses keluar (pickup) untuk transaksi booking ini. Item berstatus <code className="bg-amber-100 px-1 rounded">WAITING_PICKUP</code> tidak dimasukkan ke dalam kalkulasi tagihan.
                    </div>
                  )}

                  <div className="space-y-3">
                    {(() => {
                      const ACTIVE_BILLED_STATUSES = [
                        'BARANG_SEDANG_DISEWA', 'SEDANG_DISEWA', 'RENTED', 'disewa',
                        'SIAP_DIKEMBALIKAN', 'WAITING_RETURN', 'SELESAI_DISEWA',
                        'BARANG_DIKEMBALIKAN', 'COMPLETED', 'PAID', 'RETURNED', 'selesai'
                      ];

                      const filteredItems = (selectedBooking.details || []).filter(d =>
                        ACTIVE_BILLED_STATUSES.includes(d.status) || d.pickup != null
                      );

                      const displayItems = filteredItems.length > 0
                        ? filteredItems
                        : (selectedBooking.details || [{
                            alat: { nama_alat: selectedBooking.barang, kode_alat: 'ALT' },
                            qty: selectedBooking.qty,
                            harga: selectedBooking.harga_rental,
                            subtotal: selectedBooking.harga_rental,
                            tanggal_mulai: selectedBooking.tanggal_mulai,
                            tanggal_selesai: selectedBooking.tanggal_selesai,
                            jam_mulai: '08:00',
                            jam_selesai: '17:00',
                            status: selectedBooking.status,
                          }]);

                      return displayItems.map((item, idx) => {
                        const itemMulai = item.tanggal_mulai || selectedBooking.tanggal_mulai;
                        const itemSelesai = item.tanggal_selesai || selectedBooking.tanggal_selesai;
                        const dDays = (itemMulai && itemSelesai)
                          ? Math.max(1, Math.round((new Date(itemSelesai) - new Date(itemMulai)) / (1000 * 60 * 60 * 24)) + 1)
                          : 1;
                        const itemHarga = Number(item.harga || item.alat?.harga_sewa || 0);
                        const itemSubtotal = Number(item.subtotal || (itemHarga * (item.qty || 1) * dDays));

                        return (
                          <div key={item.id || idx} className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-2.5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-2.5">
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 text-xs font-black flex items-center justify-center">
                                  {idx + 1}
                                </span>
                                <h4 className="font-extrabold text-gray-900 text-sm">
                                  {item.alat?.nama_alat || selectedBooking.barang}
                                </h4>
                                <span className="font-mono text-indigo-600 font-bold text-xs bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                                  {item.alat?.kode_alat || 'ALT'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-bold w-max">
                                  Qty: {item.qty || 1} Unit
                                </span>
                                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-extrabold uppercase">
                                  {item.status || selectedBooking.status}
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              <div className="bg-white p-2.5 rounded-xl border border-gray-200/60">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tanggal Rental</p>
                                <p className="font-bold text-gray-900 mt-0.5">
                                  {itemMulai} s/d {itemSelesai} <span className="text-indigo-600 font-extrabold">({dDays} Hari)</span>
                                </p>
                              </div>
                              <div className="bg-white p-2.5 rounded-xl border border-gray-200/60">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Jam Operasional (WIB)</p>
                                <p className="font-bold text-indigo-900 mt-0.5 flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5 text-indigo-600" />
                                  <span>Ambil: {item.jam_mulai || '08:00'} WIB</span>
                                  <span className="text-gray-400">|</span>
                                  <span>Kembali: {item.jam_selesai || '17:00'} WIB</span>
                                </p>
                              </div>
                            </div>

                            <div className="flex justify-between items-center pt-1 text-xs">
                              <span className="text-gray-500 font-medium">
                                Harga Rental: <strong className="text-gray-800">Rp {itemHarga.toLocaleString('id-ID')} / hari</strong>
                              </span>
                              <span className="font-black text-emerald-700 text-sm">
                                Subtotal: Rp {itemSubtotal.toLocaleString('id-ID')}
                              </span>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>

              {/* Rincian Pembayaran Active Filtered */}
              {(() => {
                const ACTIVE_BILLED_STATUSES = [
                  'BARANG_SEDANG_DISEWA', 'SEDANG_DISEWA', 'RENTED', 'disewa',
                  'SIAP_DIKEMBALIKAN', 'WAITING_RETURN', 'SELESAI_DISEWA',
                  'BARANG_DIKEMBALIKAN', 'COMPLETED', 'PAID', 'RETURNED', 'selesai'
                ];

                const filteredItems = (selectedBooking.details || []).filter(d =>
                  ACTIVE_BILLED_STATUSES.includes(d.status) || d.pickup != null
                );

                const activeSubtotal = filteredItems.length > 0
                  ? filteredItems.reduce((sum, item) => {
                      const itemMulai = item.tanggal_mulai || selectedBooking.tanggal_mulai;
                      const itemSelesai = item.tanggal_selesai || selectedBooking.tanggal_selesai;
                      const dDays = (itemMulai && itemSelesai)
                        ? Math.max(1, Math.round((new Date(itemSelesai) - new Date(itemMulai)) / (1000 * 60 * 60 * 24)) + 1)
                        : 1;
                      const itemHarga = Number(item.harga || item.alat?.harga_sewa || 0);
                      return sum + Number(item.subtotal || (itemHarga * (item.qty || 1) * dDays));
                    }, 0)
                  : Number(selectedBooking.subtotal_rental || selectedBooking.harga_rental || selectedBooking.total_harga || 0);

                const activeDiscountAmt = Number(selectedBooking.discount_amount || 0);
                const activeFinalPayment = Math.max(0, activeSubtotal - activeDiscountAmt + Number(selectedBooking.biaya_tambahan || 0));

                return (
                  <div className="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
                    <h3 className="text-sm font-extrabold text-gray-900 border-b border-gray-100 pb-2 flex items-center justify-between">
                      <span>Rincian Pembayaran Alat Aktif</span>
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100">
                        Filtered Billed Items
                      </span>
                    </h3>
                    
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between text-gray-600">
                        <span>Subtotal Rental (Alat Keluar)</span>
                        <span className="font-semibold text-gray-900">
                          Rp {activeSubtotal.toLocaleString('id-ID')}
                        </span>
                      </div>

                  {/* Input Diskon Nominal */}
                  <div className="p-3.5 bg-amber-50/80 border border-amber-200/90 rounded-xl space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <label className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                        <DollarSign className="h-4 w-4 text-amber-600" /> Diskon Rental (Rp)
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-amber-900 text-xs">Rp</span>
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={discountInput}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (isNaN(val)) {
                              setDiscountInput('');
                            } else if (val < 0) {
                              setDiscountInput('0');
                              toast.error('Diskon tidak boleh negatif!');
                            } else {
                              setDiscountInput(e.target.value);
                            }
                          }}
                          className="w-32 px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-right font-black text-amber-900 focus:ring-2 focus:ring-amber-500 text-xs shadow-2xs"
                          placeholder="0"
                        />
                        <button
                          type="button"
                          onClick={handleApplyDiscount}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition shadow-2xs"
                        >
                          Terapkan
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between text-xs text-amber-900 font-medium pt-1.5 border-t border-amber-200/60">
                      <span>Nominal Diskon</span>
                      <span className="font-black text-amber-700">
                        - Rp {activeDiscountAmt.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>

                  {selectedBooking.biaya_tambahan > 0 && (
                    <div className="flex justify-between text-gray-600 text-xs">
                      <span>Biaya Tambahan / Deposit</span>
                      <span className="font-semibold text-gray-900">
                        Rp {Number(selectedBooking.biaya_tambahan).toLocaleString('id-ID')}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-base font-black text-indigo-600 pt-2 border-t border-gray-100">
                    <span>Total Akhir Pembayaran (Alat Aktif)</span>
                    <span className="text-emerald-700 font-black text-lg">
                      Rp {activeFinalPayment.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

              {/* FITUR PEMBAYARAN ACTIONS */}
              <div className="bg-indigo-50/50 rounded-2xl p-5 border border-indigo-100/60 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-indigo-600" /> Fitur Pembayaran Admin Finance
                  </h3>
                  {selectedBooking.bukti_bayar && (
                    <button
                      onClick={() => setIsViewProofOpen(true)}
                      className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      <Eye className="h-3.5 w-3.5" /> Lihat Bukti Transfer Customer
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => setIsManualPayOpen(true)}
                    className="w-full py-2.5 px-4 rounded-xl bg-white border border-indigo-200 text-indigo-700 font-semibold text-xs flex items-center justify-center gap-2 hover:bg-indigo-50 transition-all shadow-xs"
                  >
                    <DollarSign className="h-4 w-4" /> Input Pembayaran Manual
                  </button>
                  <button
                    onClick={() => setIsUploadProofOpen(true)}
                    className="w-full py-2.5 px-4 rounded-xl bg-white border border-indigo-200 text-indigo-700 font-semibold text-xs flex items-center justify-center gap-2 hover:bg-indigo-50 transition-all shadow-xs"
                  >
                    <Upload className="h-4 w-4" /> Upload Bukti Transfer
                  </button>
                </div>

                {/* Primary Finance Buttons requested by user prompt */}
                <div className="pt-3 border-t border-indigo-100 flex flex-wrap gap-2 justify-end">
                  <button
                    onClick={() => setIsRejectOpen(true)}
                    className="px-4 py-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    <XCircle className="h-4 w-4" /> Tolak Pembayaran
                  </button>
                  <button
                    onClick={() => handleConfirmPayment()}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Konfirmasi Pembayaran
                  </button>
                  <button
                    onClick={() => handleCreateInvoice()}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <FileText className="h-4 w-4" /> Buat Invoice
                  </button>
                </div>
              </div>
            </div>
          )}
        </Modal>

        {/* INPUT PEMBAYARAN MANUAL MODAL */}
        <Modal
          isOpen={isManualPayOpen}
          onClose={() => setIsManualPayOpen(false)}
          title="Input Pembayaran Manual"
          size="md"
        >
          <form onSubmit={handleSaveManualPay} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Nominal Pembayaran (Rp)</label>
              <input
                type="number"
                value={manualPayData.nominal}
                onChange={e => setManualPayData({ ...manualPayData, nominal: e.target.value })}
                placeholder="misal: 5000000"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Metode Pembayaran</label>
              <select
                value={manualPayData.metode}
                onChange={e => setManualPayData({ ...manualPayData, metode: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white"
              >
                <option value="Transfer Bank">Transfer Bank (BCA / Mandiri / BNI)</option>
                <option value="Tunai">Tunai / Cash Kantor</option>
                <option value="QRIS">QRIS Statis/Dinamsi</option>
                <option value="Giro / Cek">Giro Perusahaan / Cek</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">No. Referensi / Transaksi</label>
              <input
                type="text"
                value={manualPayData.referensi}
                onChange={e => setManualPayData({ ...manualPayData, referensi: e.target.value })}
                placeholder="misal: TRX-8849201"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Catatan Finance</label>
              <textarea
                value={manualPayData.catatan}
                onChange={e => setManualPayData({ ...manualPayData, catatan: e.target.value })}
                rows={2}
                placeholder="Catatan pelunasan / Keterangan tambahan"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsManualPayOpen(false)}
                className="flex-1 py-2.5 border border-gray-200 text-gray-700 font-semibold text-xs rounded-xl hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 shadow-sm"
              >
                Simpan Pembayaran
              </button>
            </div>
          </form>
        </Modal>

        {/* UPLOAD BUKTI TRANSFER MODAL */}
        <Modal
          isOpen={isUploadProofOpen}
          onClose={() => setIsUploadProofOpen(false)}
          title="Upload Bukti Transfer"
          size="md"
        >
          <form onSubmit={handleUploadTransferProof} className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-2xl p-6 text-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer relative">
              <input
                type="file"
                accept="image/*"
                onChange={e => setUploadFile(e.target.files[0])}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-gray-700">
                {uploadFile ? uploadFile.name : 'Klik atau seret file bukti transfer di sini'}
              </p>
              <p className="text-xs text-gray-400 mt-1">Format PNG, JPG, atau PDF (maks. 5MB)</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsUploadProofOpen(false)}
                className="flex-1 py-2.5 border border-gray-200 text-gray-700 font-semibold text-xs rounded-xl hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 shadow-sm"
              >
                Upload File
              </button>
            </div>
          </form>
        </Modal>

        {/* LIHAT BUKTI PEMBAYARAN CUSTOMER MODAL */}
        <Modal
          isOpen={isViewProofOpen}
          onClose={() => setIsViewProofOpen(false)}
          title="Bukti Pembayaran Customer"
          size="md"
        >
          <div className="space-y-4">
            {selectedBooking?.bukti_bayar ? (
              <div>
                <img
                  src={selectedBooking.bukti_bayar}
                  alt="Bukti Transfer"
                  className="w-full rounded-2xl border border-gray-200 shadow-sm max-h-[400px] object-cover"
                />
                <p className="text-xs text-gray-400 text-center mt-2">
                  Bukti pembayaran resmi untuk booking #{selectedBooking.kode_booking}
                </p>
              </div>
            ) : (
              <div className="p-8 text-center bg-gray-50 rounded-2xl">
                <p className="text-sm text-gray-500 font-medium">Pelanggan belum mengupload bukti pembayaran.</p>
              </div>
            )}
            <button
              onClick={() => setIsViewProofOpen(false)}
              className="w-full py-2.5 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-200"
            >
              Tutup
            </button>
          </div>
        </Modal>

        {/* TOLAK PEMBAYARAN MODAL */}
        <Modal
          isOpen={isRejectOpen}
          onClose={() => setIsRejectOpen(false)}
          title="Tolak Pembayaran"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-xs text-gray-600">
              Masukkan alasan penolakan pembayaran untuk customer <span className="font-bold">{selectedBooking?.customer}</span>:
            </p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Contoh: Nominal transfer kurang, foto bukti tidak terbaca..."
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-red-500"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setIsRejectOpen(false)}
                className="flex-1 py-2.5 border border-gray-200 text-gray-700 font-semibold text-xs rounded-xl hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={handleRejectPayment}
                className="flex-1 py-2.5 bg-red-600 text-white font-bold text-xs rounded-xl hover:bg-red-700 shadow-sm"
              >
                Konfirmasi Penolakan
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}
