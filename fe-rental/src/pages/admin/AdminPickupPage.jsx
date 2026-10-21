import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import { useAuth } from '../../contexts/AuthContext';
import api, { IMAGE_BASE } from '../../lib/api';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import SignaturePad from '../../components/common/SignaturePad';
import RentalTimeline from '../../components/common/RentalTimeline';
import {
  Truck, Search, Package, CheckCircle2, XCircle, Clock,
  Upload, Image as ImageIcon, FileText, UserCheck, AlertTriangle, Plus, PlusCircle, CheckSquare, Square, Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getWIBDateTime, getTodayWIB, addOneDayStr } from '../../lib/dateUtils';
import { compressMultipleImages } from '../../lib/imageCompressor';

export default function AdminPickupPage() {
  const { isKeuangan } = useAuth();
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(initialSearch);

  // Modals
  const [processModal, setProcessModal] = useState({ open: false, booking: null });
  const [cancelModal, setCancelModal] = useState({ open: false, booking: null });
  const [addEquipmentModal, setAddEquipmentModal] = useState({ open: false, booking: null });

  // Add Equipment Form State
  const [equipmentList, setEquipmentList] = useState([]);
  const [loadingEquipment, setLoadingEquipment] = useState(false);
  const [searchEquipment, setSearchEquipment] = useState('');
  const [selectedItems, setSelectedItems] = useState({});
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Process Pickup Form State
  const [pickupForm, setPickupForm] = useState({
    pickup_name: '',
    pickup_phone: '',
    pickup_relation: 'Customer',
    pickup_date: new Date().toISOString().split('T')[0],
    pickup_time: '09:00',
    pickup_signature: '',
    condition_status: 'baik',
    pickup_notes: '',
  });

  const [pickupPhotos, setPickupPhotos] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isCompressing, setIsCompressing] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [checklistsState, setChecklistsState] = useState({});

  useEffect(() => {
    fetchData();
  }, [page, search]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, size: 10 });
      if (search) p.set('search', search);
      const res = await api.get(`/pickup/ready?${p}`);
      setData(res.data.data || []);
      setPagination(res.data.pagination);
    } catch {
      toast.error('Gagal mengambil daftar booking siap keluar');
    }
    setLoading(false);
  };

  const openProcessModal = (booking, targetDetail = null) => {
    const custName = booking.pengambil_nama || booking.customer?.full_name || booking.user?.nama || '';
    const custPhone = booking.pengambil_no_hp || booking.customer?.phone || booking.user?.no_hp || '';
    const custRelation = booking.pengambil_hubungan || 'Customer';
    const nowWIB = getWIBDateTime();
    const todayStr = nowWIB.date;

    const activeDetails = targetDetail 
      ? [targetDetail] 
      : (booking.details || []).filter(d => ['WAITING_PICKUP', 'MENUNGGU_BARANG_KELUAR', 'pending', 'dikonfirmasi', 'MENUNGGU_KETERSEDIAAN'].includes(d.status));

    const targetDate = targetDetail?.tanggal_mulai || booking.tanggal_mulai || nowWIB.date;
    const initialPickupDate = targetDate < nowWIB.date ? nowWIB.date : targetDate;

    // Populate checklist snapshot items for pickup modal per alat
    const initChecklists = {};
    activeDetails.forEach(d => {
      let itemChecklists = [];
      if (d.checklists && d.checklists.length > 0) {
        itemChecklists = d.checklists;
      } else if (booking.checklists && booking.checklists.length > 0) {
        itemChecklists = booking.checklists.filter(c => c.booking_detail_id === d.id || (!c.booking_detail_id && c.alat_id === d.alat_id));
      }

      if (itemChecklists.length === 0 && activeDetails.length === 1 && booking.checklists) {
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
        };
      });
    });
    setChecklistsState(initChecklists);

    setPickupForm({
      pickup_name: custName,
      pickup_phone: custPhone,
      pickup_relation: custRelation,
      pickup_date: initialPickupDate,
      pickup_time: targetDetail?.jam_mulai || booking.jam_mulai || nowWIB.time,
      alasan_perubahan_tanggal: '',
      pickup_signature: '',
      condition_status: 'baik',
      pickup_notes: '',
    });
    setPickupPhotos([]);
    setPhotoPreviews([]);
    setProcessModal({ open: true, booking, targetDetail, activeDetails });
  };

  const openCancelModal = (booking) => {
    setCancelReason('');
    setCancelModal({ open: true, booking });
  };

  const openAddEquipmentModal = async (booking) => {
    setSelectedItems({});
    setSearchEquipment('');
    setAddEquipmentModal({ open: true, booking });
    fetchAvailableEquipment('', booking.tanggal_mulai, booking.tanggal_selesai, booking.id);
  };

  const fetchAvailableEquipment = async (searchQuery, startDate, endDate, bookingId) => {
    setLoadingEquipment(true);
    try {
      const bMulai = startDate || addEquipmentModal.booking?.tanggal_mulai;
      const bSelesai = endDate || addEquipmentModal.booking?.tanggal_selesai;
      const bId = bookingId || addEquipmentModal.booking?.id;

      const p = new URLSearchParams();
      if (searchQuery) p.set('search', searchQuery);
      if (bMulai) p.set('tanggal_mulai', bMulai);
      if (bSelesai) p.set('tanggal_selesai', bSelesai);
      if (bId) p.set('booking_id', bId);

      const res = await api.get(`/pickup/available-equipment?${p.toString()}`);
      setEquipmentList(res.data.data || []);
    } catch {
      toast.error('Gagal mengambil daftar alat tersedia');
    }
    setLoadingEquipment(false);
  };

  const getTodayWIB = () => {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const wib = new Date(utc + (3600000 * 7));
    const yyyy = wib.getFullYear();
    const mm = String(wib.getMonth() + 1).padStart(2, '0');
    const dd = String(wib.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const calculateDays = (startStr, endStr) => {
    if (!startStr || !endStr) return 1;
    const start = new Date(startStr);
    const end = new Date(endStr);
    const diffTime = end - start;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diffDays);
  };

  const toggleItemSelection = (item) => {
    if (!item.is_available) {
      toast.error(item.availability_reason || 'Alat sedang digunakan customer lain');
      return;
    }

    const nowWIB = getWIBDateTime();
    const bStart = addEquipmentModal.booking?.tanggal_mulai;
    const defaultStart = (bStart && bStart >= nowWIB.date) ? bStart : nowWIB.date;
    const bEnd = addEquipmentModal.booking?.tanggal_selesai;
    const defaultEnd = (bEnd && bEnd >= defaultStart) ? bEnd : defaultStart;
    const defaultJamMulai = (defaultStart === nowWIB.date) ? nowWIB.time : '08:00';
    const defaultJamSelesai = '17:00';

    setSelectedItems(prev => {
      const current = prev[item.id];
      if (current && current.selected) {
        const copy = { ...prev };
        delete copy[item.id];
        return copy;
      } else {
        return {
          ...prev,
          [item.id]: {
            selected: true,
            qty: 1,
            harga: Number(item.harga_sewa || item.harga_sewa_per_hari || 0),
            nama: item.nama_alat,
            kode: item.kode_alat || 'ALT',
            tanggal_mulai: defaultStart,
            tanggal_selesai: defaultEnd,
            jam_mulai: defaultJamMulai,
            jam_selesai: defaultJamSelesai,
          }
        };
      }
    });
  };

  const isValidCompleteDate = (val) => {
    if (!val || typeof val !== 'string' || val.length !== 10) return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) return false;
    const year = parseInt(val.split('-')[0], 10);
    if (isNaN(year) || year < 2020 || year > 2100) return false;
    return true;
  };

  const updateItemField = (alatId, field, value) => {
    setSelectedItems(prev => {
      const current = prev[alatId];
      if (!current) return prev;

      let updated = { ...current, [field]: value };

      if (field === 'tanggal_mulai') {
        if (isValidCompleteDate(updated.tanggal_mulai) && isValidCompleteDate(updated.tanggal_selesai)) {
          if (updated.tanggal_selesai < updated.tanggal_mulai) {
            updated.tanggal_selesai = updated.tanggal_mulai;
          }
        }
      }

      return {
        ...prev,
        [alatId]: updated
      };
    });
  };

  const updateItemQty = (alatId, delta) => {
    setSelectedItems(prev => {
      const current = prev[alatId];
      if (!current) return prev;
      const newQty = Math.max(1, current.qty + delta);
      return {
        ...prev,
        [alatId]: {
          ...current,
          qty: newQty
        }
      };
    });
  };

  const handleAddEquipmentSubmit = async (e) => {
    e.preventDefault();
    const itemsToSubmit = Object.keys(selectedItems).map(alatId => ({
      alat_id: Number(alatId),
      nama: selectedItems[alatId].nama,
      qty: selectedItems[alatId].qty,
      harga: selectedItems[alatId].harga,
      tanggal_mulai: selectedItems[alatId].tanggal_mulai,
      tanggal_selesai: selectedItems[alatId].tanggal_selesai,
      jam_mulai: selectedItems[alatId].jam_mulai || '08:00',
      jam_selesai: selectedItems[alatId].jam_selesai || '17:00',
    }));

    if (itemsToSubmit.length === 0) {
      return toast.error('Pilih minimal 1 alat tambahan!');
    }

    const nowWIB = getWIBDateTime();
    for (const it of itemsToSubmit) {
      if (!isValidCompleteDate(it.tanggal_mulai)) {
        return toast.error(`Format tanggal mulai rental untuk alat '${it.nama}' belum lengkap (DD/MM/YYYY)!`);
      }
      if (it.tanggal_mulai < nowWIB.date) {
        return toast.error(`Tanggal mulai rental untuk alat '${it.nama}' (${it.tanggal_mulai}) tidak boleh tanggal yang sudah lewat! Minimal hari ini WIB (${nowWIB.date}).`);
      }
      if (!isValidCompleteDate(it.tanggal_selesai)) {
        return toast.error(`Format tanggal selesai rental untuk alat '${it.nama}' belum lengkap (DD/MM/YYYY)!`);
      }
      if (it.tanggal_selesai < it.tanggal_mulai) {
        return toast.error(`Tanggal selesai rental untuk alat '${it.nama}' tidak boleh sebelum tanggal mulai!`);
      }
      if (it.tanggal_selesai === it.tanggal_mulai && it.jam_selesai <= it.jam_mulai) {
        return toast.error(`Jam pengembalian tidak valid. Jam kembali harus setelah jam pengambilan.`);
      }
    }

    setSubmittingAdd(true);
    try {
      await api.post('/pickup/add-items', {
        booking_id: addEquipmentModal.booking.id,
        items: itemsToSubmit,
      });
      toast.success('Alat tambahan dengan periode rental per-item berhasil dimasukkan ke booking!');
      setAddEquipmentModal({ open: false, booking: null });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menambahkan alat ke booking');
    }
    setSubmittingAdd(false);
  };

  const handlePhotoSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    if (pickupPhotos.length + files.length > 5) {
      toast.error('Maksimal 5 foto kondisi barang sebelum keluar');
      return;
    }

    setIsCompressing(true);
    const toastId = toast.loading('Mengompresi & mengoptimalkan foto (<2MB)...');
    try {
      const compressedFiles = await compressMultipleImages(files, 2.0);
      toast.success('Foto berhasil dioptimalkan!', { id: toastId });

      setPickupPhotos(prev => [...prev, ...compressedFiles]);
      const newPreviews = compressedFiles.map(file => URL.createObjectURL(file));
      setPhotoPreviews(prev => [...prev, ...newPreviews]);
    } catch (err) {
      toast.error('Gagal mengompresi foto: ' + (err.message || 'Format tidak didukung'), { id: toastId });
    }
    setIsCompressing(false);
  };

  const removePhoto = (index) => {
    setPickupPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleProcessSubmit = async (e) => {
    e.preventDefault();
    if (!pickupForm.pickup_name || !pickupForm.pickup_phone || !pickupForm.pickup_signature) {
      return toast.error('Nama Pengambil, No. HP, dan Tanda Tangan wajib diisi!');
    }
    if (pickupPhotos.length === 0) {
      return toast.error('Upload minimal 1 foto kondisi barang sebelum keluar!');
    }

    const nowWIB = getWIBDateTime();
    const bMulai = processModal.booking.tanggal_mulai;

    if (bMulai >= nowWIB.date && pickupForm.pickup_date < bMulai) {
      return toast.error(`Tanggal pengeluaran tidak boleh lebih awal dari tanggal mulai booking (${bMulai})!`);
    }

    if (bMulai >= nowWIB.date && pickupForm.pickup_date !== bMulai && (!pickupForm.alasan_perubahan_tanggal || !pickupForm.alasan_perubahan_tanggal.trim())) {
      return toast.error(`Alasan perubahan tanggal pickup wajib diisi jika tanggal berbeda dari jadwal booking (${bMulai})!`);
    }

    if (pickupForm.pickup_date < nowWIB.date) {
      return toast.error(`Tanggal pengeluaran tidak boleh tanggal yang sudah lewat! Minimal ${nowWIB.date}.`);
    }

    setSubmitting(true);
    setUploadProgress(0);
    try {
      const fd = new FormData();
      const todayWIBStr = getTodayWIB();
      const targetDetails = (processModal.activeDetails && processModal.activeDetails.length > 0)
        ? processModal.activeDetails
        : (processModal.booking.details || []).filter(d =>
            d.tanggal_mulai <= todayWIBStr && ['WAITING_PICKUP', 'MENUNGGU_BARANG_KELUAR', 'pending', 'dikonfirmasi'].includes(d.status)
          );

      if (targetDetails.length === 0) {
        setSubmitting(false);
        return toast.error('Tidak ada detail alat yang siap dikeluarkannya pada hari ini!');
      }

      fd.append('booking_id', processModal.booking.id);
      targetDetails.forEach(d => {
        fd.append('booking_detail_ids[]', d.id);
      });
      fd.append('pickup_name', pickupForm.pickup_name);
      fd.append('pickup_phone', pickupForm.pickup_phone);
      fd.append('pickup_relation', pickupForm.pickup_relation);
      fd.append('pickup_date', pickupForm.pickup_date);
      fd.append('pickup_time', pickupForm.pickup_time);
      fd.append('pickup_signature', pickupForm.pickup_signature);
      fd.append('condition_status', pickupForm.condition_status);
      if (pickupForm.alasan_perubahan_tanggal) fd.append('alasan_perubahan_tanggal', pickupForm.alasan_perubahan_tanggal);
      if (pickupForm.pickup_notes) fd.append('pickup_notes', pickupForm.pickup_notes);
      fd.append('checklists', JSON.stringify(Object.values(checklistsState)));

      pickupPhotos.forEach(file => {
        fd.append('photos', file);
      });

      await api.post('/pickup/process', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percent);
          }
        },
      });
      toast.success('Pengeluaran barang per-detail berhasil diproses!');
      setProcessModal({ open: false, booking: null });
      fetchData();
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Gagal memproses pengeluaran barang. Silakan periksa koneksi internet Anda.';
      toast.error(`Gagal Upload: ${errMsg}`);
    }
    setSubmitting(false);
  };

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    if (!cancelReason.trim()) {
      return toast.error('Alasan pembatalan wajib diisi!');
    }

    setSubmitting(true);
    try {
      await api.post(`/pickup/cancel/${cancelModal.booking.id}`, {
        alasan_pembatalan: cancelReason,
      });
      toast.success('Pengeluaran barang telah dibatalkan');
      setCancelModal({ open: false, booking: null });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal membatalkan pengeluaran barang');
    }
    setSubmitting(false);
  };

  return (
    <AppLayout title="Pengeluaran Barang (Warehouse Out)">
      <div className="animate-fade-in space-y-6">

        {/* Banner Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center font-bold">
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-gray-900">Dashboard Pengeluaran Barang</h1>
              <p className="text-xs text-gray-500">Daftar booking terkonfirmasi yang siap diserah-terimakan ke customer</p>
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

        {/* Ready Pickups Table */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <LoadingSpinner className="py-16" />
          ) : data.length === 0 ? (
            <div className="p-12 text-center text-gray-500 text-xs">
              Tidak ada booking yang menunggu pengeluaran barang saat ini.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-4">Nomor Booking</th>
                    <th className="px-5 py-4">Nama Customer</th>
                    <th className="px-5 py-4">Alat yang Sewa</th>
                    <th className="px-5 py-4">Periode Rental Global</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4 text-center">Aksi Pengeluaran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {data.filter(b => {
                    const todayStr = getTodayWIB();
                    return (b.details || []).some(d => d.tanggal_mulai <= todayStr && ['WAITING_PICKUP', 'MENUNGGU_BARANG_KELUAR', 'pending', 'dikonfirmasi'].includes(d.status));
                  }).map((b, bIdx) => {
                    const custName = b.customer?.full_name || b.user?.nama || b.pengambil_nama || 'Customer';
                    const totalCount = b.details?.length || 0;
                    const issuedCount = (b.details || []).filter(d => ['BARANG_SEDANG_DISEWA', 'SEDANG_DISEWA', 'RENTED', 'SELESAI_DISEWA', 'COMPLETED'].includes(d.status)).length;
                    const todayStr = getTodayWIB();
                    const isLastCustomer = bIdx === data.length - 1;
                    const hasReadyItems = (b.details || []).some(d =>
                      d.tanggal_mulai <= todayStr && ['WAITING_PICKUP', 'MENUNGGU_BARANG_KELUAR', 'pending', 'dikonfirmasi'].includes(d.status)
                    );

                    let statusBadge = (
                      <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold uppercase tracking-wider">
                        Menunggu Pengeluaran
                      </span>
                    );

                    if (b.status === 'PARTIAL_PICKUP') {
                      statusBadge = (
                        <span className="px-2.5 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full text-xs font-black uppercase tracking-wider shadow-sm flex items-center gap-1 w-max">
                          <Clock className="w-3 h-3" /> Sebagian Keluar (Partial)
                        </span>
                      );
                    } else if (b.status === 'BARANG_SEDANG_DISEWA' || b.status === 'SEDANG_DISEWA') {
                      statusBadge = (
                        <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold uppercase tracking-wider">
                          Barang Sedang Disewa
                        </span>
                      );
                    } else if (b.status === 'PARTIAL_RETURN') {
                      statusBadge = (
                        <span className="px-2.5 py-1 bg-teal-100 text-teal-800 rounded-full text-xs font-bold uppercase tracking-wider">
                          Sebagian Kembali
                        </span>
                      );
                    } else if (b.status === 'SELESAI_DISEWA') {
                      statusBadge = (
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold uppercase tracking-wider">
                          Selesai Disewa
                        </span>
                      );
                    }

                    return (
                      <tr
                        key={b.id}
                        className={`hover:bg-slate-50/80 transition align-top ${
                          !isLastCustomer ? 'border-b-4 border-slate-300' : ''
                        }`}
                      >
                        <td className="px-5 py-6 font-mono font-bold text-indigo-600 align-top">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" />
                            <span>{b.kode_booking}</span>
                          </div>
                        </td>
                        <td className="px-5 py-6 align-top">
                          <div className="font-extrabold text-gray-900 text-sm">{custName}</div>
                          <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-[11px] font-bold">
                            <Package className="w-3 h-3" /> Progress: {issuedCount} dari {totalCount} alat keluar
                          </div>
                        </td>
                        <td className="px-5 py-6 text-gray-700 align-top">
                          <div className="space-y-2 pl-3 border-l-2 border-indigo-200">
                            {b.details?.filter(d => d.tanggal_mulai <= todayStr && ['WAITING_PICKUP', 'MENUNGGU_BARANG_KELUAR', 'pending', 'dikonfirmasi'].includes(d.status)).map((d, idx) => {
                              const isRented = ['BARANG_SEDANG_DISEWA', 'SEDANG_DISEWA', 'RENTED'].includes(d.status);
                              const isSelesai = ['SELESAI_DISEWA', 'COMPLETED', 'selesai'].includes(d.status);
                              const isReady = d.tanggal_mulai <= todayStr && ['WAITING_PICKUP', 'MENUNGGU_BARANG_KELUAR', 'pending', 'dikonfirmasi'].includes(d.status);
                              const isFuture = d.tanggal_mulai > todayStr && ['WAITING_PICKUP', 'MENUNGGU_BARANG_KELUAR', 'pending', 'dikonfirmasi'].includes(d.status);

                              const pickupTx = d.pickup || d.pickups?.[0] || b.pickup;
                              const pickupDate = pickupTx?.pickup_date || b.tanggal_mulai;
                              const pickupTime = pickupTx?.pickup_time || b.jam_mulai || '09:00';
                              const pickupName = pickupTx?.pickup_name || b.pengambil_nama || custName;
                              const approvedBy = pickupTx?.approved_by || 'Admin Warehouse';

                              const returnTx = d.return || d.returns?.[0] || b.return;
                              const returnDate = returnTx?.return_date || b.actual_return_date || d.tanggal_selesai;
                              const returnTime = returnTx?.return_time || b.jam_selesai || '17:00';

                              return (
                                <div key={d.id || idx} className="p-3 bg-slate-50/90 rounded-2xl border border-slate-200 text-xs space-y-1.5 shadow-2xs">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                      <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-extrabold ${
                                        isRented || isSelesai ? 'bg-indigo-600 text-white' : isReady ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600'
                                      }`}>{idx + 1}</span>
                                      <span className="font-extrabold text-gray-900">{d.alat?.nama_alat || 'Alat Rental'} ({d.qty} Unit)</span>
                                    </div>
                                  </div>
                                  
                                  <div className="pl-5 text-[11px] flex flex-wrap items-center gap-2 mt-0.5 font-normal">
                                    <span className="text-gray-600 font-semibold">Tgl: {d.tanggal_mulai} s/d {d.tanggal_selesai}</span>
                                    {isRented && (
                                      <span className="px-2 py-0.5 bg-indigo-600 text-white rounded-md font-black shadow-xs">✅ SUDAH KELUAR</span>
                                    )}
                                    {isSelesai && (
                                      <span className="px-2 py-0.5 bg-emerald-600 text-white rounded-md font-black shadow-xs">✅ SUDAH SELESAI DISEWA</span>
                                    )}
                                    {isReady && (
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="px-2 py-0.5 bg-emerald-600 text-white rounded-md font-black shadow-xs animate-pulse">🟢 SIAP KELUAR HARI INI</span>
                                        <button
                                          type="button"
                                          onClick={() => openProcessModal(b, d)}
                                          className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-extrabold text-[10px] shadow-2xs flex items-center gap-1 cursor-pointer"
                                        >
                                          <Truck className="h-3 w-3" /> Proses Item Ini
                                        </button>
                                      </div>
                                    )}
                                    {isFuture && (
                                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md font-bold">⏳ BELUM WAKTUNYA KELUAR</span>
                                    )}
                                  </div>

                                  {/* INFO DETAIL SUDAH KELUAR */}
                                  {isRented && (
                                    <div className="ml-5 mt-1 bg-white p-2 rounded-lg border border-indigo-100 text-[11px] text-gray-700 space-y-0.5 font-normal">
                                      <div>📅 Keluar: <strong className="text-gray-900">{pickupDate} {pickupTime} WIB</strong></div>
                                      <div>👤 Pengambil: <strong className="text-gray-900">{pickupName}</strong></div>
                                      <div>🛡️ Admin: <strong className="text-indigo-700 font-bold">{approvedBy}</strong></div>
                                    </div>
                                  )}

                                  {/* INFO DETAIL SUDAH SELESAI DISEWA */}
                                  {isSelesai && (
                                    <div className="ml-5 mt-1 bg-white p-2 rounded-lg border border-emerald-100 text-[11px] text-gray-700 space-y-0.5 font-normal">
                                      <div>🏁 Kembali: <strong className="text-gray-900">{returnDate} {returnTime} WIB</strong></div>
                                    </div>
                                  )}
                                </div>
                              );
                            }) || <span className="text-gray-500 font-normal">Alat Rental</span>}
                          </div>
                        </td>
                        <td className="px-5 py-6 text-gray-600 font-medium align-top">
                          {b.tanggal_mulai} s/d {b.tanggal_selesai}
                        </td>
                        <td className="px-5 py-6 align-top">
                          {statusBadge}
                        </td>
                        <td className="px-5 py-6 text-center align-top">
                          <div className="flex flex-col items-center justify-center gap-1.5">
                            {hasReadyItems ? (
                              <button
                                onClick={() => openProcessModal(b)}
                                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-extrabold transition text-xs shadow-md flex items-center gap-1 cursor-pointer"
                              >
                                <Truck className="h-3.5 w-3.5" /> Proses Pengeluaran
                              </button>
                            ) : (
                              <span className="px-2.5 py-1 bg-gray-100 text-gray-500 rounded-lg text-[11px] font-bold italic">
                                Belum Waktunya Keluar
                              </span>
                            )}

                            {/* BUTTON TAMBAH ALAT */}
                            <button
                              onClick={() => openAddEquipmentModal(b)}
                              className="px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl font-bold transition text-[11px] shadow-sm flex items-center gap-1 cursor-pointer"
                            >
                              <PlusCircle className="h-3.5 w-3.5" /> Tambah Alat Rental
                            </button>

                            <button
                              onClick={() => openCancelModal(b)}
                              className="px-2.5 py-1 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl font-bold transition text-[11px] cursor-pointer"
                              title="Batalkan Pengeluaran"
                            >
                              Batalkan
                            </button>
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

        {/* MODAL TAMBAH ALAT RENTAL (PER-ITEM PERIODE RENTAL) */}
        <Modal
          isOpen={addEquipmentModal.open}
          onClose={() => setAddEquipmentModal({ open: false, booking: null })}
          title={`TAMBAH ALAT RENTAL (#${addEquipmentModal.booking?.kode_booking})`}
          size="lg"
        >
          {addEquipmentModal.booking && (
            <form onSubmit={handleAddEquipmentSubmit} className="space-y-5 text-xs">
              {/* Header Info */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 font-medium text-gray-700">
                <p><span className="text-gray-400 font-normal block">Nomor Booking:</span> <strong className="font-mono text-indigo-600 text-sm">{addEquipmentModal.booking.kode_booking}</strong></p>
                <p><span className="text-gray-400 font-normal block">Nama Customer:</span> <strong>{addEquipmentModal.booking.customer?.full_name || addEquipmentModal.booking.user?.nama || '-'}</strong></p>
                <p><span className="text-gray-400 font-normal block">Periode Booking Utama:</span> <strong>{addEquipmentModal.booking.tanggal_mulai} s/d {addEquipmentModal.booking.tanggal_selesai}</strong></p>
              </div>

              {/* Search Alat */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari nama alat, kode alat, atau kategori..."
                  value={searchEquipment}
                  onChange={(e) => {
                    setSearchEquipment(e.target.value);
                    fetchAvailableEquipment(e.target.value);
                  }}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              {/* Equipment Grid List */}
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                <label className="block font-bold text-gray-800 uppercase tracking-wider text-[11px]">
                  Pilih Alat Tambahan (Centang & Atur Periode Rental Masing-Masing):
                </label>

                {loadingEquipment ? (
                  <LoadingSpinner className="py-8" />
                ) : equipmentList.length === 0 ? (
                  <div className="p-6 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl">
                    Tidak ada alat yang ditemukan.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {equipmentList.map((item) => {
                      const isSelected = !!selectedItems[item.id]?.selected;
                      const currentItem = selectedItems[item.id];
                      const days = currentItem ? calculateDays(currentItem.tanggal_mulai, currentItem.tanggal_selesai) : 1;
                      const itemPrice = Number(item.harga_sewa || item.harga_sewa_per_hari || 0);
                      const subtotalVal = currentItem ? (currentItem.qty * itemPrice * days) : 0;

                      return (
                        <div
                          key={item.id}
                          onClick={() => toggleItemSelection(item)}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col gap-3 ${
                            isSelected
                              ? 'bg-indigo-50/90 border-indigo-500 ring-2 ring-indigo-200 shadow-sm'
                              : item.is_available
                              ? 'bg-white border-gray-200 hover:border-indigo-300'
                              : 'bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="pt-0.5">
                              {isSelected ? (
                                <CheckSquare className="h-5 w-5 text-indigo-600" />
                              ) : (
                                <Square className="h-5 w-5 text-gray-400" />
                              )}
                            </div>

                            <div className="flex-1 space-y-1">
                              <div className="flex items-center justify-between">
                                <h4 className="font-extrabold text-gray-900 text-sm">{item.nama_alat}</h4>
                                <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                                  {item.kode_alat}
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-gray-500">
                                  Kategori: <strong className="text-gray-700">{item.kategori?.nama_kategori || 'Alat'}</strong>
                                </span>
                                <span className="font-extrabold text-emerald-700">
                                  Rp {itemPrice.toLocaleString('id-ID')} / Hari
                                </span>
                              </div>

                              <div className="mt-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[11px] grid grid-cols-3 gap-2 text-center">
                                <div className="bg-white p-1.5 rounded-lg border border-slate-200 shadow-2xs">
                                  <span className="text-gray-400 block text-[10px] font-bold uppercase tracking-wider">Total Unit</span>
                                  <strong className="text-gray-900 font-extrabold text-xs">{item.stok_total ?? item.stok} Unit</strong>
                                </div>
                                <div className="bg-white p-1.5 rounded-lg border border-slate-200 shadow-2xs">
                                  <span className="text-gray-400 block text-[10px] font-bold uppercase tracking-wider">Sedang Rental</span>
                                  <strong className="text-indigo-700 font-extrabold text-xs">
                                    {item.sedang_rental ?? Math.max(0, (item.stok_total ?? item.stok) - (item.stok_tersedia ?? item.stok))} Unit
                                  </strong>
                                </div>
                                <div className="bg-white p-1.5 rounded-lg border border-slate-200 shadow-2xs">
                                  <span className="text-gray-400 block text-[10px] font-bold uppercase tracking-wider">Tersedia</span>
                                  <strong className={(item.stok_tersedia ?? item.stok) > 0 ? "text-emerald-700 font-extrabold text-xs" : "text-rose-600 font-extrabold text-xs"}>
                                    {item.stok_tersedia ?? item.stok} Unit
                                  </strong>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* PER-ITEM DATE & QTY SETTINGS WHEN SELECTED */}
                          {isSelected && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="pt-3 border-t border-indigo-200 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fade-in bg-white p-3 rounded-xl border border-indigo-100"
                            >
                              <div>
                                <label className="block font-bold text-gray-700 text-[10px] mb-1">TGL MULAI RENTAL *</label>
                                <input
                                  type="date"
                                  required
                                  min={getTodayWIB()}
                                  value={currentItem.tanggal_mulai}
                                  onChange={(e) => updateItemField(item.id, 'tanggal_mulai', e.target.value)}
                                  onBlur={(e) => {
                                    const val = e.target.value;
                                    const todayWIB = getTodayWIB();
                                    if (isValidCompleteDate(val) && val < todayWIB) {
                                      toast.error(`Tanggal mulai tidak boleh tanggal yang sudah lewat! Minimal hari ini WIB (${todayWIB}).`);
                                      updateItemField(item.id, 'tanggal_mulai', todayWIB);
                                    }
                                  }}
                                  className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-indigo-500"
                                />
                              </div>

                              <div>
                                <label className="block font-bold text-gray-700 text-[10px] mb-1">JAM AMBIL (WIB) *</label>
                                <input
                                  type="time"
                                  required
                                  value={currentItem.jam_mulai || '08:00'}
                                  onChange={(e) => updateItemField(item.id, 'jam_mulai', e.target.value)}
                                  className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-indigo-500"
                                />
                              </div>

                              <div>
                                <label className="block font-bold text-gray-700 text-[10px] mb-1">TGL SELESAI RENTAL *</label>
                                <input
                                  type="date"
                                  required
                                  min={currentItem.tanggal_mulai || getTodayWIB()}
                                  value={currentItem.tanggal_selesai}
                                  onChange={(e) => updateItemField(item.id, 'tanggal_selesai', e.target.value)}
                                  onBlur={(e) => {
                                    const val = e.target.value;
                                    const minAllowed = currentItem.tanggal_mulai || getTodayWIB();
                                    if (isValidCompleteDate(val) && val < minAllowed) {
                                      toast.error(`Tanggal selesai tidak boleh sebelum tanggal mulai!`);
                                      updateItemField(item.id, 'tanggal_selesai', minAllowed);
                                    }
                                  }}
                                  className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-indigo-500"
                                />
                              </div>

                              <div>
                                <label className="block font-bold text-gray-700 text-[10px] mb-1">JAM KEMBALI (WIB) *</label>
                                <input
                                  type="time"
                                  required
                                  value={currentItem.jam_selesai || '17:00'}
                                  onChange={(e) => updateItemField(item.id, 'jam_selesai', e.target.value)}
                                  onBlur={(e) => {
                                    const val = e.target.value;
                                    if (currentItem.tanggal_selesai === currentItem.tanggal_mulai && val && val.length === 5 && val <= (currentItem.jam_mulai || '08:00')) {
                                      toast.error(`Jam pengembalian tidak valid. Jam kembali harus setelah jam pengambilan.`);
                                      updateItemField(item.id, 'jam_selesai', '17:00');
                                    }
                                  }}
                                  className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-indigo-500"
                                />
                              </div>

                              <div className="flex items-center justify-between sm:justify-start gap-3">
                                <div>
                                  <label className="block font-bold text-gray-700 text-[10px] mb-1">DURASI</label>
                                  <span className="px-2.5 py-1 bg-amber-100 text-amber-900 font-extrabold rounded-lg text-xs block text-center">
                                    {days} Hari
                                  </span>
                                </div>

                                <div>
                                  <label className="block font-bold text-gray-700 text-[10px] mb-1">QTY</label>
                                  <div className="flex items-center bg-gray-50 rounded-lg border border-gray-300 overflow-hidden">
                                    <button
                                      type="button"
                                      onClick={() => updateItemQty(item.id, -1)}
                                      className="px-2 py-0.5 bg-indigo-100 text-indigo-800 font-bold hover:bg-indigo-200"
                                    >
                                      -
                                    </button>
                                    <span className="px-2 font-bold text-xs">{currentItem.qty}</span>
                                    <button
                                      type="button"
                                      onClick={() => updateItemQty(item.id, 1)}
                                      className="px-2 py-0.5 bg-indigo-100 text-indigo-800 font-bold hover:bg-indigo-200"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              </div>

                              <div className="sm:col-span-3 pt-2 border-t border-gray-100 flex justify-between items-center text-xs font-extrabold">
                                <span className="text-indigo-900">SUBTOTAL ITEM:</span>
                                <span className="text-emerald-700 text-sm">Rp {subtotalVal.toLocaleString('id-ID')}</span>
                              </div>
                            </div>
                          )}

                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Realtime Subtotal & Recalculation Summary */}
              {Object.keys(selectedItems).length > 0 && (
                <div className="p-4 bg-emerald-50/80 rounded-2xl border border-emerald-200 space-y-2.5 font-medium">
                  <h4 className="font-extrabold text-emerald-950 uppercase tracking-wider text-[11px] border-b border-emerald-200 pb-1">
                    Ringkasan Item Tambahan & Total Booking
                  </h4>
                  <div className="space-y-1.5">
                    {Object.keys(selectedItems).map((key) => {
                      const it = selectedItems[key];
                      const dDays = calculateDays(it.tanggal_mulai, it.tanggal_selesai);
                      const sub = it.qty * it.harga * dDays;
                      return (
                        <div key={key} className="p-2 bg-white rounded-xl border border-emerald-100 flex items-center justify-between text-xs">
                          <div>
                            <strong className="text-gray-900">{it.nama} ({it.kode})</strong>
                            <p className="text-[11px] text-gray-500">
                              Rental: <span className="font-bold text-indigo-700">{it.tanggal_mulai} s/d {it.tanggal_selesai}</span> ({dDays} Hari)
                            </p>
                          </div>
                          <span className="font-extrabold text-emerald-700">Rp {sub.toLocaleString('id-ID')}</span>
                        </div>
                      );
                    })}
                  </div>

                  {(() => {
                    const subtotalAlatLama = Number(addEquipmentModal.booking.total_harga || 0);
                    const subtotalAlatBaru = Object.keys(selectedItems).reduce((sum, key) => {
                      const it = selectedItems[key];
                      const dDays = calculateDays(it.tanggal_mulai, it.tanggal_selesai);
                      return sum + (it.qty * it.harga * dDays);
                    }, 0);

                    const totalHargaBaru = subtotalAlatLama + subtotalAlatBaru;

                    return (
                      <div className="space-y-1 text-emerald-900 border-t border-emerald-200 pt-2">
                        <div className="flex justify-between">
                          <span>Subtotal Alat Lama ({addEquipmentModal.booking.details?.length || 1} Item):</span>
                          <span className="font-bold">Rp {subtotalAlatLama.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between text-indigo-900 font-bold">
                          <span>Subtotal Alat Tambahan Baru:</span>
                          <span>+ Rp {subtotalAlatBaru.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between border-t border-emerald-300 pt-1 text-sm font-black text-emerald-950">
                          <span>TOTAL BOOKING BARU:</span>
                          <span className="text-emerald-700 font-extrabold">Rp {totalHargaBaru.toLocaleString('id-ID')}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setAddEquipmentModal({ open: false, booking: null })}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingAdd || Object.keys(selectedItems).length === 0}
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl font-extrabold transition shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {submittingAdd ? 'Menambahkan Alat...' : 'Tambahkan Alat ke Booking'}
                </button>
              </div>
            </form>
          )}
        </Modal>

        {/* MODAL FORM PROSES PENGELUARAN BARANG */}
        <Modal
          isOpen={processModal.open}
          onClose={() => setProcessModal({ open: false, booking: null, targetDetail: null, activeDetails: [] })}
          title={`FORM SERAH TERIMA BARANG KELUAR (#${processModal.booking?.kode_booking}${processModal.targetDetail ? ` - ${processModal.targetDetail.alat?.nama_alat}` : ''})`}
          size="lg"
        >
          <form onSubmit={handleProcessSubmit} className="space-y-5">
            {processModal.booking && (
              <RentalTimeline status={processModal.booking.status} />
            )}

            {/* List Alat Yang Keluar */}
            {processModal.activeDetails && processModal.activeDetails.length > 0 && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <label className="block font-bold text-gray-800 uppercase tracking-wider text-[11px]">
                  Daftar Alat Yang Diserah-Terimakan ({processModal.activeDetails.length} Unit Siap Keluar):
                </label>
                <div className="space-y-2">
                  {processModal.activeDetails.map((d, idx) => {
                    const itemHarga = Number(d.harga || d.alat?.harga_sewa || d.alat?.harga_sewa_per_hari || 0);
                    const itemSubtotal = Number(d.subtotal || 0);
                    const dDays = calculateDays(d.tanggal_mulai, d.tanggal_selesai);

                    return (
                      <div key={d.id || idx} className="p-3 bg-white rounded-xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-gray-900">{idx + 1}. {d.alat?.nama_alat}</span>
                            <span className="font-mono text-indigo-600 font-bold">({d.alat?.kode_alat || 'ALT'})</span>
                          </div>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            Tanggal Rental: <strong className="text-gray-800">{d.tanggal_mulai || '-'} s/d {d.tanggal_selesai || '-'}</strong> ({dDays} Hari)
                          </p>
                          <p className="text-[11px] text-indigo-700 font-semibold mt-0.5">
                            Waktu: <strong className="text-indigo-900">{d.jam_mulai || '08:00'} WIB</strong> - <strong className="text-indigo-900">{d.jam_selesai || '17:00'} WIB</strong>
                          </p>
                        </div>
                        <div className="flex items-center gap-4 text-gray-600">
                          <span>Qty: <strong className="text-indigo-600">{d.qty || 1} Unit</strong></span>
                          {isKeuangan && itemHarga > 0 && (
                            <>
                              <span>Harga: <strong className="text-gray-900">Rp {itemHarga.toLocaleString('id-ID')} / hari</strong></span>
                              <span>Subtotal: <strong className="text-emerald-700 font-bold">Rp {itemSubtotal.toLocaleString('id-ID')}</strong></span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* TOTAL RENTAL SUM */}
                {isKeuangan && (
                  <div className="pt-2.5 border-t border-slate-300 flex justify-between items-center text-xs font-black text-slate-900">
                    <span>TOTAL RENTAL (ITEM SIAP KELUAR):</span>
                    <span className="text-emerald-700 text-sm font-extrabold">
                      Rp {processModal.activeDetails.reduce((sum, d) => sum + Number(d.subtotal || 0), 0).toLocaleString('id-ID')}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Nama Pengambil Barang *</label>
                <input
                  type="text"
                  required
                  value={pickupForm.pickup_name}
                  onChange={e => setPickupForm({ ...pickupForm, pickup_name: e.target.value })}
                  placeholder="Ketik Nama Pengambil Barang..."
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Nomor HP Pengambil *</label>
                <input
                  type="text"
                  required
                  value={pickupForm.pickup_phone}
                  onChange={e => setPickupForm({ ...pickupForm, pickup_phone: e.target.value })}
                  placeholder="Ketik No. HP Pengambil..."
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Hubungan Dengan Customer *</label>
                <select
                  value={pickupForm.pickup_relation}
                  onChange={e => setPickupForm({ ...pickupForm, pickup_relation: e.target.value })}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Customer">Customer Langsung</option>
                  <option value="Karyawan">Karyawan / Tim Lapangan</option>
                  <option value="Supir">Supir / Operator</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Tanggal Pengambilan *</label>
                  <input
                    type="date"
                    required
                    min={processModal.booking?.tanggal_mulai || getTodayWIB()}
                    value={pickupForm.pickup_date}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPickupForm((prev) => ({ ...prev, pickup_date: val }));
                    }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Jam Pengambilan *</label>
                  <input
                    type="time"
                    required
                    value={pickupForm.pickup_time}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPickupForm((prev) => {
                        if (val === '00:00' && prev.pickup_date === getTodayWIB()) {
                          return {
                            ...prev,
                            pickup_date: addOneDayStr(prev.pickup_date),
                            pickup_time: '00:00',
                          };
                        }
                        return { ...prev, pickup_time: val };
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {pickupForm.pickup_date !== processModal.booking?.tanggal_mulai && (
                <div className="sm:col-span-2 p-3 bg-amber-50 rounded-2xl border border-amber-200 space-y-1.5">
                  <label className="block font-bold text-amber-900 text-xs">
                    Alasan Perubahan Tanggal Pickup * (Jadwal Kontrak Booking: {processModal.booking?.tanggal_mulai})
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={pickupForm.alasan_perubahan_tanggal || ''}
                    onChange={e => setPickupForm({ ...pickupForm, alasan_perubahan_tanggal: e.target.value })}
                    placeholder="Contoh: Customer meminta penundaan pengeluaran alat karena persiapan area proyek..."
                    className="w-full px-3 py-2 text-xs border border-amber-300 rounded-xl bg-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              )}

              {/* Upload Foto Barang Sebelum Keluar */}
              <div className="sm:col-span-2 p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <label className="block font-bold text-gray-800 uppercase tracking-wider text-[11px]">
                  Foto Barang Sebelum Keluar (Min 1 Foto) *
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
                <p className="text-[11px] text-gray-400">Dokumentasikan seluruh fisik dan kelengkapan alat sebelum dibawa customer.</p>
              </div>

              {/* SECTION PEMERIKSAAN KELENGKAPAN BARANG PER ALAT */}
              <div className="sm:col-span-2 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-200 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block font-extrabold text-indigo-950 uppercase tracking-wider text-xs flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-indigo-600" /> Pemeriksaan Kelengkapan Barang Per Alat
                  </label>
                  <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded-full">
                    Master Data Alat
                  </span>
                </div>

                {Object.keys(checklistsState).length === 0 ? (
                  <p className="text-xs text-gray-500 italic">Tidak ada checklist kelengkapan khusus tercatat untuk alat ini.</p>
                ) : (
                  <div className="space-y-4 pt-1">
                    {(processModal.activeDetails || processModal.booking?.details || []).map(detail => {
                      const detailItems = Object.values(checklistsState).filter(
                        c => c.booking_detail_id === detail.id || (!c.booking_detail_id && (processModal.activeDetails || []).length === 1)
                      );

                      if (detailItems.length === 0) return null;

                      return (
                        <div key={detail.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                          {/* Header Alat */}
                          <div className="bg-slate-50 px-4 py-2.5 border-b border-gray-200/80 flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                                <Package className="h-4 w-4" />
                              </div>
                              <div>
                                <h4 className="font-extrabold text-xs text-slate-900 flex items-center gap-2">
                                  {detail.alat?.nama_alat || 'Alat'}
                                  {detail.alat?.kode_alat && (
                                    <span className="font-mono text-[10px] text-gray-600 font-bold bg-gray-200/80 px-1.5 py-0.5 rounded">
                                      {detail.alat.kode_alat}
                                    </span>
                                  )}
                                </h4>
                                <p className="text-[10px] text-gray-500 font-medium">
                                  Jumlah Disewa: <strong className="text-slate-800">{detail.qty || 1} Unit</strong>
                                </p>
                              </div>
                            </div>

                            {/* Batch Action per Alat */}
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setChecklistsState(prev => {
                                    const next = { ...prev };
                                    detailItems.forEach(item => {
                                      next[item.id] = { ...next[item.id], status_keluar: 'ADA', keterangan_keluar: '' };
                                    });
                                    return next;
                                  });
                                }}
                                className="text-[11px] font-extrabold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition cursor-pointer"
                                title="Tandai semua kelengkapan alat ini ADA"
                              >
                                ✓ Semua Ada
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setChecklistsState(prev => {
                                    const next = { ...prev };
                                    detailItems.forEach(item => {
                                      next[item.id] = { ...next[item.id], status_keluar: 'TIDAK_ADA' };
                                    });
                                    return next;
                                  });
                                }}
                                className="text-[11px] font-extrabold text-red-700 hover:text-red-800 bg-red-50 hover:bg-red-100 border border-red-200 px-2.5 py-1 rounded-lg transition cursor-pointer"
                                title="Tandai semua kelengkapan alat ini TIDAK ADA"
                              >
                                ✕ Semua Tidak Ada
                              </button>
                            </div>
                          </div>

                          {/* List Kelengkapan Khusus Alat Ini */}
                          <div className="p-3 space-y-2 divide-y divide-gray-100">
                            {detailItems.map(item => {
                              const isAda = item.status_keluar === 'ADA';
                              return (
                                <div key={item.id} className="pt-2 first:pt-0 flex flex-col gap-2">
                                  <div className="flex items-center justify-between flex-wrap gap-2">
                                    <span className="font-bold text-xs text-gray-900 flex items-center gap-1.5">
                                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></span>
                                      {item.nama_kelengkapan}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => setChecklistsState(prev => ({
                                          ...prev,
                                          [item.id]: { ...prev[item.id], status_keluar: 'ADA', keterangan_keluar: '' }
                                        }))}
                                        className={`px-3 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1 transition-all ${
                                          isAda
                                            ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500'
                                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                        }`}
                                      >
                                        <CheckCircle2 className="h-3.5 w-3.5" /> ADA
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setChecklistsState(prev => ({
                                          ...prev,
                                          [item.id]: { ...prev[item.id], status_keluar: 'TIDAK_ADA' }
                                        }))}
                                        className={`px-3 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1 transition-all ${
                                          !isAda
                                            ? 'bg-red-600 text-white shadow-sm ring-2 ring-red-500'
                                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                        }`}
                                      >
                                        <XCircle className="h-3.5 w-3.5" /> TIDAK ADA
                                      </button>
                                    </div>
                                  </div>

                                  {!isAda && (
                                    <div className="pt-0.5">
                                      <input
                                        type="text"
                                        placeholder={`Keterangan kekurangan untuk ${item.nama_kelengkapan}...`}
                                        value={item.keterangan_keluar || ''}
                                        onChange={e => setChecklistsState(prev => ({
                                          ...prev,
                                          [item.id]: { ...prev[item.id], keterangan_keluar: e.target.value }
                                        }))}
                                        className="w-full px-3 py-1.5 text-xs bg-red-50 border border-red-200 rounded-lg text-red-900 focus:ring-2 focus:ring-red-500 font-medium"
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    {/* Fallback item kelengkapan yang belum terasosiasi detail tertentu jika ada */}
                    {(() => {
                      const activeDetailIds = new Set((processModal.activeDetails || processModal.booking?.details || []).map(d => d.id));
                      const unmapped = Object.values(checklistsState).filter(
                        c => c.booking_detail_id && !activeDetailIds.has(c.booking_detail_id)
                      );
                      if (unmapped.length === 0) return null;
                      return (
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                          <div className="bg-slate-50 px-4 py-2 border-b border-gray-200">
                            <h4 className="font-bold text-xs text-slate-700">Kelengkapan Lainnya</h4>
                          </div>
                          <div className="p-3 space-y-2">
                            {unmapped.map(item => {
                              const isAda = item.status_keluar === 'ADA';
                              return (
                                <div key={item.id} className="flex items-center justify-between flex-wrap gap-2">
                                  <span className="font-bold text-xs text-gray-900">{item.nama_kelengkapan}</span>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setChecklistsState(prev => ({
                                        ...prev,
                                        [item.id]: { ...prev[item.id], status_keluar: 'ADA', keterangan_keluar: '' }
                                      }))}
                                      className={`px-3 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1 ${
                                        isAda ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                                      }`}
                                    >
                                      ADA
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setChecklistsState(prev => ({
                                        ...prev,
                                        [item.id]: { ...prev[item.id], status_keluar: 'TIDAK_ADA' }
                                      }))}
                                      className={`px-3 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1 ${
                                        !isAda ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-500'
                                      }`}
                                    >
                                      TIDAK ADA
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Checkbox Kondisi Barang Keluar */}
              <div className="sm:col-span-2 p-4 bg-white rounded-2xl border border-gray-200 space-y-3">
                <label className="block font-bold text-gray-800">Kondisi Barang Keluar *</label>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-xs">
                    <input
                      type="radio"
                      name="condition_status"
                      value="baik"
                      checked={pickupForm.condition_status === 'baik'}
                      onChange={e => setPickupForm({ ...pickupForm, condition_status: e.target.value })}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-emerald-700">✓ Kondisi Baik & Siap Operasi</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-bold text-xs">
                    <input
                      type="radio"
                      name="condition_status"
                      value="ada_minus"
                      checked={pickupForm.condition_status === 'ada_minus'}
                      onChange={e => setPickupForm({ ...pickupForm, condition_status: e.target.value })}
                      className="text-amber-600 focus:ring-indigo-500"
                    />
                    <span className="text-amber-700">⚠️ Ada Minus Fizik / Aksesoris</span>
                  </label>
                </div>

                {pickupForm.condition_status === 'ada_minus' && (
                  <div className="pt-2 animate-fade-in">
                    <label className="block font-semibold text-gray-700 mb-1">Catatan Minus Barang *</label>
                    <textarea
                      rows={2}
                      value={pickupForm.pickup_notes}
                      onChange={e => setPickupForm({ ...pickupForm, pickup_notes: e.target.value })}
                      placeholder="Contoh: Ban kiri aus, body lecet, lampu sein kanan mati..."
                      className="w-full px-3.5 py-2 border border-amber-300 bg-amber-50/50 rounded-xl focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                )}
              </div>

              {/* Tanda Tangan Canvas */}
              <div className="sm:col-span-2">
                <SignaturePad
                  label="Tanda Tangan Pengambil Barang *"
                  value={pickupForm.pickup_signature}
                  onChange={sig => setPickupForm({ ...pickupForm, pickup_signature: sig })}
                />
              </div>
            </div>

            {submitting && (
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-[11px] font-bold text-indigo-700">
                  <span>Mengunggah Foto Kondisi Barang...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setProcessModal({ open: false, booking: null })}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold transition shadow-md disabled:opacity-50 cursor-pointer"
              >
                {submitting ? 'Memproses Pengeluaran...' : 'Konfirmasi Pengeluaran Barang'}
              </button>
            </div>
          </form>
        </Modal>

        {/* MODAL BATALKAN PENGELUARAN */}
        <Modal
          isOpen={cancelModal.open}
          onClose={() => setCancelModal({ open: false, booking: null })}
          title="Batalkan Pengeluaran Barang"
          size="md"
        >
          <form onSubmit={handleCancelSubmit} className="space-y-4 text-xs">
            <p className="text-gray-600">
              Apakah Anda yakin ingin membatalkan pengeluaran alat untuk booking <strong className="text-gray-900 font-mono">#{cancelModal.booking?.kode_booking}</strong>?
            </p>

            <div>
              <label className="block font-bold text-gray-800 mb-1">Alasan Pembatalan *</label>
              <textarea
                rows={3}
                required
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="Masukkan alasan customer batal mengambil barang..."
                className="w-full px-3.5 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setCancelModal({ open: false, booking: null })}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition cursor-pointer"
              >
                Kembali
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-extrabold transition shadow-md disabled:opacity-50 cursor-pointer"
              >
                {submitting ? 'Membatalkan...' : 'Batalkan Pengeluaran'}
              </button>
            </div>
          </form>
        </Modal>

      </div>
    </AppLayout>
  );
}
