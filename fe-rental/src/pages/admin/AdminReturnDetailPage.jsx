import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import api, { IMAGE_BASE } from '../../lib/api';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import SignaturePad from '../../components/common/SignaturePad';
import RentalTimeline from '../../components/common/RentalTimeline';
import OutgoingDocModal from '../../components/documents/OutgoingDocModal';
import ReturnDocModal from '../../components/documents/ReturnDocModal';
import { useAuth } from '../../contexts/AuthContext';
import {
  ArrowLeft, MessageSquare, Truck, RotateCcw, AlertTriangle, Calendar, User, Phone, MapPin, Wrench, CreditCard, Clock, CheckCircle2, XCircle, CheckSquare, Package, Upload, FileText, Download, FileCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getWIBDateTime, getTodayWIB, addOneDayStr } from '../../lib/dateUtils';

export default function AdminReturnDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isKeuangan, isAdminReturn, isAdminBooking } = useAuth();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  // Early Return Confirmation Modal
  const [earlyModalOpen, setEarlyModalOpen] = useState(false);

  // Return Checklists State
  const [returnChecklistsState, setReturnChecklistsState] = useState({});

  // Return Form State Modal
  const [returnModalOpen, setReturnModalOpen] = useState(false);
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

  const [docs, setDocs] = useState({ outgoing: null, return: null });
  const [outgoingDocModalOpen, setOutgoingDocModalOpen] = useState(false);
  const [returnDocModalOpen, setReturnDocModalOpen] = useState(false);

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const [res, docRes] = await Promise.all([
        api.get(`/return/detail/${id}`),
        api.get(`/rental/document/booking/${id}`).catch(() => ({ data: { data: { outgoing: null, return: null } } })),
      ]);
      setBooking(res.data.data);
      setDocs(docRes.data?.data || { outgoing: null, return: null });
    } catch {
      toast.error('Gagal mengambil detail data rental');
    }
    setLoading(false);
  };

  const handleDirectDownloadOutgoing = async () => {
    if (docs.outgoing?.id) {
      const downloadUrl = `${IMAGE_BASE.replace('/uploads', '')}/api/rental/document/${docs.outgoing.id}/download`;
      window.open(downloadUrl, '_blank');
      return;
    }
    try {
      const custSig = booking?.pickup?.pickup_signature || booking?.pickups?.[0]?.pickup_signature || '';
      if (!custSig) {
        setOutgoingDocModalOpen(true);
        return;
      }
      toast.loading('Menyiapkan file PDF Serah Terima...', { id: 'pdf' });
      const payload = {
        rental_id: booking.id,
        booking_id: booking.id,
        customer_signature: custSig,
        admin_signature: custSig,
        catatan_kondisi: booking.pickup?.pickup_notes || '',
        condition_data: { kondisi_baik: true },
      };
      const res = await api.post('/rental/document/outgoing/sign', payload);
      toast.dismiss('pdf');
      if (res.data?.data?.id) {
        const downloadUrl = `${IMAGE_BASE.replace('/uploads', '')}/api/rental/document/${res.data.data.id}/download`;
        window.open(downloadUrl, '_blank');
        fetchDetail();
      }
    } catch (err) {
      toast.dismiss('pdf');
      setOutgoingDocModalOpen(true);
    }
  };

  const handleDirectDownloadReturn = async () => {
    if (docs.return?.id) {
      const downloadUrl = `${IMAGE_BASE.replace('/uploads', '')}/api/rental/document/${docs.return.id}/download`;
      window.open(downloadUrl, '_blank');
      return;
    }
    try {
      const custSig = booking?.return?.return_signature || booking?.returns?.[0]?.return_signature || booking?.pickup?.pickup_signature || '';
      if (!custSig) {
        setReturnDocModalOpen(true);
        return;
      }
      toast.loading('Menyiapkan file PDF Pengembalian...', { id: 'pdf' });
      const fd = new FormData();
      fd.append('rental_id', booking.id);
      fd.append('booking_id', booking.id);
      fd.append('customer_signature', custSig);
      fd.append('admin_signature', custSig);
      fd.append('catatan_admin', booking.return?.return_notes || booking.return?.damage_notes || '');
      fd.append('checklists', JSON.stringify({ alat_sesuai: true }));
      const res = await api.post('/rental/document/return/sign', fd);
      toast.dismiss('pdf');
      if (res.data?.data?.id) {
        const downloadUrl = `${IMAGE_BASE.replace('/uploads', '')}/api/rental/document/${res.data.data.id}/download`;
        window.open(downloadUrl, '_blank');
        fetchDetail();
      }
    } catch (err) {
      toast.dismiss('pdf');
      setReturnDocModalOpen(true);
    }
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

  const openReturnModal = (isEarly = false) => {
    const custName = booking?.customer?.full_name || booking?.user?.nama || booking?.pengambil_nama || '';
    const custPhone = booking?.customer?.phone || booking?.user?.no_hp || booking?.pengambil_no_hp || '';
    const nowWIB = getWIBDateTime();

    // Populate checklist items for return per alat
    const initChecklists = {};
    (booking?.details || []).forEach(d => {
      let itemChecklists = [];
      if (d.checklists && d.checklists.length > 0) {
        itemChecklists = d.checklists;
      } else if (booking?.checklists && booking.checklists.length > 0) {
        itemChecklists = booking.checklists.filter(c => c.booking_detail_id === d.id || (!c.booking_detail_id && c.alat_id === d.alat_id));
      }

      if (itemChecklists.length === 0 && (booking?.details || []).length === 1 && booking?.checklists) {
        itemChecklists = booking.checklists;
      }

      itemChecklists.forEach(c => {
        initChecklists[c.id] = {
          id: c.id,
          booking_detail_id: d.id,
          alat_id: d.alat_id,
          nama_alat: d.alat?.nama_alat || 'Alat',
          kode_alat: d.alat?.kode_alat || '',
          qty: d.qty || 1,
          nama_kelengkapan: c.nama_kelengkapan,
          status_keluar: c.status_keluar || 'ADA',
          keterangan_keluar: c.keterangan_keluar || '',
          status_kembali: c.status_kembali || 'ADA',
          keterangan_kembali: c.keterangan_kembali || '',
        };
      });
    });
    setReturnChecklistsState(initChecklists);

    setReturnForm({
      return_name: custName,
      return_phone: custPhone,
      return_date: nowWIB.date,
      return_time: nowWIB.time,
      return_signature: '',
      damage_status: 'sesuai_awal',
      damage_notes: '',
      return_notes: isEarly ? 'Pengembalian alat lebih cepat dari jadwal kontrak' : '',
      return_type: isEarly ? 'EARLY_RETURN' : 'NORMAL',
      early_return_reason: isEarly ? 'Pengembalian alat lebih cepat dari jadwal kontrak' : '',
    });
    setReturnPhotos([]);
    setPhotoPreviews([]);
    setReturnModalOpen(true);
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

    const nowWIB = getWIBDateTime();
    if (returnForm.return_date < nowWIB.date) {
      return toast.error(`Tanggal pengembalian tidak boleh tanggal yang sudah lewat! Minimal ${nowWIB.date}.`);
    }
    if (returnForm.return_date === nowWIB.date && returnForm.return_time < nowWIB.time) {
      return toast.error(`Jam pengembalian tidak boleh jam yang sudah lewat! Minimal jam saat ini WIB (${nowWIB.time}).`);
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('booking_id', booking.id);
      fd.append('return_name', returnForm.return_name);
      fd.append('return_phone', returnForm.return_phone);
      fd.append('return_date', returnForm.return_date);
      fd.append('return_time', returnForm.return_time);
      fd.append('return_signature', returnForm.return_signature);
      fd.append('damage_status', returnForm.damage_status);
      fd.append('return_type', returnForm.return_type || 'NORMAL');
      if (returnForm.early_return_reason) fd.append('early_return_reason', returnForm.early_return_reason);
      if (returnForm.damage_notes) fd.append('damage_notes', returnForm.damage_notes);
      if (returnForm.return_notes) fd.append('return_notes', returnForm.return_notes);
      fd.append('checklists', JSON.stringify(Object.values(returnChecklistsState)));

      returnPhotos.forEach(file => {
        fd.append('photos', file);
      });

      await api.post('/return/process', fd);
      toast.success('Pengembalian berhasil, booking telah selesai');
      setReturnModalOpen(false);
      fetchDetail();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal memproses penerimaan pengembalian');
    }
    setSubmitting(false);
  };

  const parsePhotos = (photoStr) => {
    if (!photoStr) return [];
    try {
      const parsed = typeof photoStr === 'string' ? JSON.parse(photoStr) : photoStr;
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
      if (typeof parsed === 'string' && parsed.trim()) return [parsed];
      return [];
    } catch {
      return typeof photoStr === 'string' && photoStr.trim() ? [photoStr] : [];
    }
  };

  if (loading) {
    return (
      <AppLayout title="Detail Rental Alat">
        <LoadingSpinner className="py-20" />
      </AppLayout>
    );
  }

  if (!booking) {
    return (
      <AppLayout title="Detail Rental Alat">
        <div className="p-12 text-center text-gray-500 text-xs">
          Data rental tidak ditemukan.
        </div>
      </AppLayout>
    );
  }

  const custName = booking.customer?.full_name || booking.user?.nama || '-';
  const custPhone = booking.customer?.phone || booking.user?.no_hp || '';
  const custAddress = booking.customer?.address || booking.user?.alamat || '-';
  const hasReturnProcessed = booking.return != null ||
    booking.status === 'SELESAI_DISEWA' ||
    booking.status === 'BARANG_DIKEMBALIKAN' ||
    booking.status === 'PEMERIKSAAN_BARANG';

  const isEarlyReturn = booking.return?.return_type === 'EARLY_RETURN' ||
    (booking.actual_return_date && booking.tanggal_selesai && booking.actual_return_date < booking.tanggal_selesai) ||
    (booking.return?.return_date && booking.tanggal_selesai && booking.return.return_date < booking.tanggal_selesai);

  const calculateEarlyDiff = () => {
    const contractEnd = booking?.tanggal_selesai;
    const actualDate = booking?.return?.return_date || booking?.actual_return_date;

    if (!contractEnd || !actualDate) return '1 Hari Lebih Cepat';

    try {
      const cEnd = new Date(contractEnd);
      const aRet = new Date(actualDate);
      const diffMs = cEnd.getTime() - aRet.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (isNaN(diffDays) || diffDays <= 0) return 'Tepat Waktu';
      return `${diffDays} Hari Lebih Cepat`;
    } catch {
      return '1 Hari Lebih Cepat';
    }
  };

  return (
    <AppLayout title={`Detail Rental #${booking.kode_booking}`}>
      <div className="animate-fade-in space-y-6">

        {/* Back Button & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/return/rented')}
              className="w-10 h-10 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition cursor-pointer"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
                Detail Transaksi Rental
                {isEarlyReturn && (
                  <span className="px-2.5 py-0.5 bg-amber-500 text-white rounded-full text-[10px] font-extrabold uppercase tracking-wider">
                    PENGEMBALIAN LEBIH AWAL
                  </span>
                )}
              </h1>
              <p className="text-xs text-gray-500">Kode Booking: <span className="font-mono font-bold text-indigo-600">#{booking.kode_booking}</span></p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => openWhatsApp(custPhone, custName, booking.kode_booking)}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-extrabold transition shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <MessageSquare className="h-4 w-4" /> Hubungi Customer (WA)
            </button>

            {/* TOMBOL PDF PENYERAHAN / SERAH TERIMA */}
            {window.location.pathname.includes('/pickup') ? (
              <button
                onClick={handleDirectDownloadOutgoing}
                className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                title="Download PDF Penyerahan Barang Keluar"
              >
                <Download className="h-4 w-4 text-slate-700" /> PDF Penyerahan
              </button>
            ) : (
              <button
                onClick={handleDirectDownloadReturn}
                className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                title="Download PDF Penyerahan / Pengembalian Barang"
              >
                <Download className="h-4 w-4 text-slate-700" /> PDF Penyerahan
              </button>
            )}

            {hasReturnProcessed ? (
              <span className="px-4 py-2.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-xs cursor-default">
                <CheckCircle2 className="h-4 w-4 text-amber-600" /> Pengembalian Awal Sudah Diproses
              </span>
            ) : (
              (isAdminReturn || isAdminBooking) && (
                <button
                  onClick={() => openReturnModal(true)}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-extrabold transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="h-4 w-4" /> Ajukan Pengembalian Lebih Awal
                </button>
              )
            )}
          </div>
        </div>

        {/* RENTAL TIMELINE */}
        <RentalTimeline booking={booking} />

        {/* INFORMASI PENGEMBALIAN LEBIH AWAL */}
        {isEarlyReturn && (
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-3xl border border-amber-200 shadow-sm space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-amber-200/80 pb-3">
              <h3 className="font-extrabold text-amber-900 uppercase tracking-wider text-xs flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-amber-600" /> Detail Informasi Pengembalian Lebih Awal
              </h3>
              <span className="px-3 py-1 bg-amber-500 text-white font-extrabold text-[10px] rounded-full uppercase tracking-wider shadow-xs">
                PENGEMBALIAN LEBIH AWAL
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-2.5 font-medium text-amber-950">
                <p>
                  <span className="text-amber-700 font-semibold block text-[10px] uppercase">Jenis Pengembalian:</span>
                  <strong className="text-sm font-bold text-amber-900">Pengembalian Lebih Awal</strong>
                </p>
                <p>
                  <span className="text-amber-700 font-semibold block text-[10px] uppercase">Jadwal Kembali Awal (Kontrak):</span>
                  <strong className="text-amber-900 font-mono text-xs">{booking.tanggal_selesai} ({booking.jam_selesai || '17:00'} WIB)</strong>
                </p>
                <p>
                  <span className="text-amber-700 font-semibold block text-[10px] uppercase">Diterima Aktual (Pengembalian Awal):</span>
                  <strong className="text-amber-900 font-mono text-xs">{booking.return?.return_date || booking.actual_return_date || '-'} ({booking.return?.return_time || '17:00'} WIB)</strong>
                </p>
              </div>

              <div className="space-y-2.5 font-medium text-amber-950">
                <p>
                  <span className="text-amber-700 font-semibold block text-[10px] uppercase">Selisih Waktu Pengembalian:</span>
                  <span className="inline-block px-3 py-1 bg-amber-200/80 text-amber-900 font-extrabold rounded-lg text-xs mt-0.5 border border-amber-300">
                    ⏱️ {calculateEarlyDiff()}
                  </span>
                </p>
                <p>
                  <span className="text-amber-700 font-semibold block text-[10px] uppercase">Admin Penerima (Approved By):</span>
                  <strong className="text-amber-900 text-xs block font-bold">{booking.return?.approved_by || 'Admin Penerimaan'}</strong>
                </p>
                <p>
                  <span className="text-amber-700 font-semibold block text-[10px] uppercase">Alasan / Catatan Pengembalian Awal:</span>
                  <strong className="text-amber-900 italic block">{booking.return?.early_return_reason || booking.return?.return_notes || 'Dikembalikan lebih cepat dari jadwal kontrak'}</strong>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* CONTENT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">

          {/* DATA CUSTOMER */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <h3 className="font-extrabold text-indigo-900 uppercase tracking-wider text-xs border-b border-gray-100 pb-2 flex items-center gap-2">
              <User className="h-4 w-4 text-indigo-600" /> Data Customer (Penyewa)
            </h3>
            <div className="space-y-2.5 text-gray-700 font-medium">
              <p><span className="text-gray-400 font-normal">Nama Lengkap:</span> <strong className="text-gray-900 text-sm font-bold block">{custName}</strong></p>
              <p><span className="text-gray-400 font-normal">Nomor HP / WhatsApp:</span> <strong className="font-mono text-gray-800 block">{custPhone || '-'}</strong></p>
              <p><span className="text-gray-400 font-normal">Alamat Customer:</span> <strong className="text-gray-800 block">{custAddress}</strong></p>
            </div>
          </div>

          {/* DATA ALAT */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <h3 className="font-extrabold text-indigo-900 uppercase tracking-wider text-xs border-b border-gray-100 pb-2 flex items-center gap-2">
              <Wrench className="h-4 w-4 text-indigo-600" /> Data Alat Berat Yang Disewa (Itemized)
            </h3>
            <div className="space-y-3">
              {booking.details?.filter(Boolean).map((d, idx) => {
                const itemStart = typeof d.tanggal_mulai === 'string' ? d.tanggal_mulai : booking.tanggal_mulai;
                const itemEnd = typeof d.tanggal_selesai === 'string' ? d.tanggal_selesai : booking.tanggal_selesai;
                const dDays = Math.max(1, Math.ceil((new Date(itemEnd) - new Date(itemStart)) / (1000 * 60 * 60 * 24)) + 1);
                const itemPrice = Number(d.harga || d.alat?.harga_sewa || d.alat?.harga_sewa_per_hari || 0);
                const itemSubtotal = Number(d.subtotal || 0);

                return (
                  <div key={d.id || idx} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                          {idx + 1}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-gray-900 text-xs">{d.alat?.nama_alat}</h4>
                          <p className="text-[11px] text-gray-500 font-mono">Kode: <span className="font-bold text-indigo-600">{d.alat?.kode_alat || 'ALT'}</span></p>
                        </div>
                      </div>
                      {isKeuangan && itemSubtotal > 0 && (
                        <span className="text-emerald-700 font-extrabold text-xs">
                          Rp {itemSubtotal.toLocaleString('id-ID')}
                        </span>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-2 text-[11px]">
                      <p><span className="text-gray-400 block">Periode Rental Item:</span> <strong className="text-indigo-900 font-bold">{itemStart} s/d {itemEnd}</strong></p>
                      <p><span className="text-gray-400 block">Durasi & Qty:</span> <strong className="text-amber-900 font-bold">{dDays} Hari ({d.qty || 1} Unit)</strong></p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* DATA RENTAL */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <h3 className="font-extrabold text-indigo-900 uppercase tracking-wider text-xs border-b border-gray-100 pb-2 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-indigo-600" /> {isKeuangan ? 'Ringkasan Periode Global & Harga' : 'Ringkasan Periode Global'}
            </h3>
            <div className="grid grid-cols-2 gap-3 text-gray-700">
              <p><span className="text-gray-400 font-normal block">Nomor Booking:</span> <strong className="font-mono text-indigo-600 text-sm font-bold">{booking.kode_booking}</strong></p>
              {isKeuangan && booking.total_harga ? (
                <p><span className="text-gray-400 font-normal block">Total Harga Rental:</span> <strong className="text-emerald-600 text-sm font-bold">Rp {Number(booking.total_harga || 0).toLocaleString('id-ID')}</strong></p>
              ) : (
                <p><span className="text-gray-400 font-normal block">Status Operasional:</span> <strong className="text-indigo-700 text-sm font-bold">{booking.status}</strong></p>
              )}
              <p><span className="text-gray-400 font-normal block">Tanggal Keluar Terawal:</span> <strong>{booking.tanggal_mulai}</strong></p>
              <p><span className="text-gray-400 font-normal block">Estimasi Kembali Terakhir:</span> <strong>{booking.tanggal_selesai}</strong></p>
            </div>
          </div>

          {/* DATA PENGELUARAN BARANG */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <h3 className="font-extrabold text-indigo-900 uppercase tracking-wider text-xs border-b border-gray-100 pb-2 flex items-center gap-2">
              <Truck className="h-4 w-4 text-indigo-600" /> Dokumen Serah Terima Pengeluaran Barang
            </h3>
            {booking.pickup ? (
              <div className="space-y-3 text-gray-700">
                <div className="grid grid-cols-2 gap-2">
                  <p><span className="text-gray-400 font-normal block">Nama Pengambil:</span> <strong>{booking.pickup.pickup_name}</strong></p>
                  <p><span className="text-gray-400 font-normal block">No. HP Pengambil:</span> <strong>{booking.pickup.pickup_phone}</strong></p>
                  <p><span className="text-gray-400 font-normal block">Hubungan Customer:</span> <strong>{booking.pickup.pickup_relation}</strong></p>
                  <p><span className="text-gray-400 font-normal block">Tgl & Jam Keluar:</span> <strong>{booking.pickup.pickup_date} ({booking.pickup.pickup_time})</strong></p>
                </div>

                {/* Tanda Tangan Canvas */}
                <div className="pt-2 border-t border-gray-100">
                  <span className="block font-bold text-gray-800 mb-1">Tanda Tangan Pengambil:</span>
                  <div className="p-2 bg-slate-50 rounded-xl border border-gray-200 inline-block max-w-xs">
                    <img src={booking.pickup.pickup_signature} alt="TTD Pengambil" className="max-h-20 object-contain mx-auto" />
                  </div>
                </div>

                {/* Foto Barang Sebelum Keluar */}
                <div className="pt-2 border-t border-gray-100">
                  <span className="block font-bold text-gray-800 mb-1">Foto Barang Sebelum Keluar:</span>
                  <div className="flex flex-wrap gap-2">
                    {parsePhotos(booking.pickup.pickup_photos).map((p, i) => (
                      <a key={i} href={`${IMAGE_BASE}/${p}`} target="_blank" rel="noreferrer" className="w-16 h-16 rounded-xl overflow-hidden border border-gray-300">
                        <img src={`${IMAGE_BASE}/${p}`} alt="Pickup" className="w-full h-full object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-400 italic">Belum ada dokumen pengeluaran ter-record.</p>
            )}
          </div>

        </div>

        {/* MODAL KONFIRMASI PENGEMBALIAN LEBIH AWAL */}
        <Modal
          isOpen={earlyModalOpen}
          onClose={() => setEarlyModalOpen(false)}
          title="PENGEMBALIAN LEBIH AWAL"
          size="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-950 space-y-2">
              <p><span className="font-semibold text-gray-600">Tanggal Selesai Rental:</span> <strong className="font-bold text-amber-950">{booking.tanggal_selesai}</strong></p>
              <p><span className="font-semibold text-gray-600">Tanggal Hari Ini (WIB):</span> <strong className="font-bold text-amber-950">{getTodayWIB()}</strong></p>

              <div className="pt-2 flex items-start gap-2 text-rose-800 font-extrabold">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Customer mengembalikan barang sebelum jadwal rental berakhir.</span>
              </div>
              <p className="text-gray-700 font-medium">Apakah Anda yakin ingin memproses penerimaan pengembalian barang ini?</p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEarlyModalOpen(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition cursor-pointer"
              >
                Batalkan
              </button>
              <button
                type="button"
                onClick={() => {
                  setEarlyModalOpen(false);
                  openReturnModal(true);
                }}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-extrabold transition shadow-md cursor-pointer"
              >
                Proses Pengembalian
              </button>
            </div>
          </div>
        </Modal>

        {/* MODAL FORM PENERIMAAN BARANG KEMBALI */}
        <Modal
          isOpen={returnModalOpen}
          onClose={() => setReturnModalOpen(false)}
          title={`FORM PENERIMAAN BARANG KEMBALI (#${booking.kode_booking})`}
          size="lg"
        >
          <form onSubmit={handleReturnSubmit} className="space-y-5">
            <RentalTimeline status={booking.status} />

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

                      <div className="space-y-4">
                        {(booking?.details || []).map(detail => {
                          const detailItems = Object.values(returnChecklistsState).filter(
                            c => c.booking_detail_id === detail.id || (!c.booking_detail_id && (booking?.details || []).length === 1)
                          );

                          if (detailItems.length === 0) return null;

                          return (
                            <div key={detail.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-xs">
                              {/* Header Alat */}
                              <div className="bg-slate-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-2">
                                  <Package className="h-4 w-4 text-indigo-600" />
                                  <span className="font-extrabold text-xs text-slate-900">{detail.alat?.nama_alat || 'Alat'}</span>
                                  {detail.alat?.kode_alat && (
                                    <span className="font-mono text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded font-semibold">
                                      {detail.alat.kode_alat}
                                    </span>
                                  )}
                                  <span className="text-[10px] text-gray-500 font-medium">({detail.qty || 1} Unit)</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setReturnChecklistsState(prev => {
                                        const next = { ...prev };
                                        detailItems.forEach(item => {
                                          next[item.id] = { ...next[item.id], status_kembali: 'ADA', keterangan_kembali: '' };
                                        });
                                        return next;
                                      });
                                    }}
                                    className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded transition cursor-pointer"
                                  >
                                    ✓ Semua Ada
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setReturnChecklistsState(prev => {
                                        const next = { ...prev };
                                        detailItems.forEach(item => {
                                          next[item.id] = { ...next[item.id], status_kembali: 'TIDAK_ADA' };
                                        });
                                        return next;
                                      });
                                    }}
                                    className="text-[10px] font-extrabold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-2 py-0.5 rounded transition cursor-pointer"
                                  >
                                    ✕ Semua Tidak Ada
                                  </button>
                                </div>
                              </div>

                              <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                  <thead className="bg-slate-50/50 border-b border-gray-200 text-gray-600 font-extrabold text-[11px]">
                                    <tr>
                                      <th className="p-2.5">KELENGKAPAN</th>
                                      <th className="p-2.5">SAAT KELUAR</th>
                                      <th className="p-2.5">SAAT KEMBALI</th>
                                      <th className="p-2.5">KETERANGAN PENGEMBALIAN</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100 font-medium">
                                    {detailItems.map(item => {
                                      const isKeluarAda = item.status_keluar === 'ADA';
                                      const isKembaliAda = item.status_kembali === 'ADA';
                                      const isKekurangan = isKeluarAda && !isKembaliAda;

                                      return (
                                        <tr key={item.id} className={isKekurangan ? 'bg-red-50/80' : ''}>
                                          <td className="p-2.5 font-bold text-gray-900">
                                            {item.nama_kelengkapan}
                                            {isKekurangan && (
                                              <span className="block text-[10px] text-red-600 font-extrabold mt-0.5">
                                                ⚠️ KEKURANGAN SAAT PENGEMBALIAN
                                              </span>
                                            )}
                                          </td>
                                          <td className="p-2.5">
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
                                          <td className="p-2.5">
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
                                          <td className="p-2.5">
                                            {!isKembaliAda ? (
                                              <input
                                                type="text"
                                                placeholder="Keterangan kekurangan saat kembali..."
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
                          );
                        })}
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
                onClick={() => setReturnModalOpen(false)}
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

        {/* MODALS DOKUMEN DIGITAL */}
        <OutgoingDocModal
          isOpen={outgoingDocModalOpen}
          onClose={() => setOutgoingDocModalOpen(false)}
          booking={booking}
          existingDoc={docs.outgoing}
          onSuccess={() => fetchDetail()}
        />

        <ReturnDocModal
          isOpen={returnDocModalOpen}
          onClose={() => setReturnDocModalOpen(false)}
          booking={booking}
          existingDoc={docs.return}
          onSuccess={() => fetchDetail()}
        />

      </div>
    </AppLayout>
  );
}
