import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import api, { IMAGE_BASE } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  Calendar, FileText, CheckCircle, ArrowLeft, Search, Users, User,
  Package, Calculator, AlertTriangle, XCircle, RefreshCw, UserCheck,
  CreditCard, Clock, ShieldCheck, FileCheck, Phone, Mail, MapPin, RotateCcw,
  Sparkles, UserPlus
} from 'lucide-react';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import toast from 'react-hot-toast';
import { getTodayWIB, addOneDayStr, getWIBDateTime, getCurrentTimeWIB } from '../../lib/dateUtils';

const today = getTodayWIB();
const tomorrow = addOneDayStr(today);
const toLocal = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };

export default function CreateBookingPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { isAdmin, isKeuangan, user: currentUser } = useAuth();

  const nowWIBInit = getWIBDateTime();
  const itemsInit = (state?.items || []).map(item => {
    const itemMulai = item.tanggal_mulai || today;
    const defaultJam = itemMulai === nowWIBInit.date ? nowWIBInit.time : '08:00';
    return {
      ...item,
      tanggal_mulai: itemMulai,
      tanggal_selesai: item.tanggal_selesai || tomorrow,
      jam_mulai: item.jam_mulai || defaultJam,
      jam_selesai: item.jam_selesai || '17:00',
      kelengkapan: 'Unit utama, tas & kabel charger',
    };
  });
  const alatData = state?.alat || [];

  const [items, setItems] = useState(itemsInit);
  const [catatan, setCatatan] = useState('');

  // Customer Selection States
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [opsiPembayaran, setOpsiPembayaran] = useState('dp'); // 'dp', 'bayar_setelah_selesai', 'lunas_awal'
  const [persenDp, setPersenDp] = useState(30);

  const initWIB = getWIBDateTime();
  const defaultJamMulai = initWIB.time > '09:00' ? initWIB.time : '09:00';
  const [jamMulai, setJamMulai] = useState(defaultJamMulai);
  const [jamSelesai, setJamSelesai] = useState('17:00');
  const [uangJaminan, setUangJaminan] = useState(100000);
  const [jenisJaminan, setJenisJaminan] = useState('KTP Asli');

  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [konflik, setKonflik] = useState({});

  const getAlat = (id) => alatData.find(a => a.id === id);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAlat, setConfirmAlat] = useState(null);

  const handleDeleteClick = (alatId) => {
    setConfirmAlat(alatId);
    setConfirmOpen(true);
  };

  const removeItem = (alatId) => {
    setItems(prev => prev.filter(i => i.alat_id !== alatId));
  };

  const handleConfirmDelete = useCallback(() => {
    if (!confirmAlat) { setConfirmOpen(false); return; }
    setConfirmOpen(false);
    removeItem(confirmAlat);
    toast.success('Alat dihapus dari daftar');
    setConfirmAlat(null);
  }, [confirmAlat]);

  // Proteksi keyboard event (Tombol Delete / Backspace)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const target = e.target;
        const isInputTarget = Boolean(
          target && (
            ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(target.tagName?.toUpperCase()) ||
            target.isContentEditable ||
            target.closest?.('input, select, textarea, [contenteditable="true"]')
          )
        );

        // Jika user sedang mengetik di input, textarea, atau form, letakkan kontrol pada browser (jangan trigger shortcut)
        if (isInputTarget) {
          return;
        }

        if (e.key === 'Delete' && confirmOpen && confirmAlat) {
          try {
            e.preventDefault();
            handleConfirmDelete();
          } catch (err) {
            console.error('Error handling Delete shortcut:', err);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmOpen, confirmAlat, handleConfirmDelete]);

  // Fetch Customers List for Admin / Staff or Current User
  // Fetch Customers List for Admin / Staff
  useEffect(() => {
    setLoadingCustomers(true);
    api.get('/customers?size=500')
      .then(res => {
        const rawList = res.data.data || [];
        const normalized = rawList.map(c => ({
          ...c,
          nama: c.full_name || c.nama,
          no_hp: c.phone || c.no_hp,
          nik: c.identity_number || c.nik,
          alamat: c.address || c.alamat,
        }));
        normalized.sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));
        setCustomers(normalized);

        if (!isAdmin && currentUser) {
          const selfCust = normalized.find(c => String(c.id) === String(currentUser.id)) || {
            id: currentUser.id,
            nama: currentUser.nama,
            no_hp: currentUser.no_hp,
            nik: currentUser.nik || '-',
            email: currentUser.email,
            alamat: currentUser.alamat || '-',
          };
          setSelectedCustomerId(String(selfCust.id));
          setSelectedCustomer(selfCust);
        }
      })
      .catch(() => {
        setCustomers([]);
      })
      .finally(() => {
        setLoadingCustomers(false);
      });
  }, [isAdmin, currentUser]);

  // Filtered customer list for search
  const filteredCustomers = useMemo(() => {
    if (!customerSearchTerm.trim()) return customers.slice(0, 50);
    const term = customerSearchTerm.toLowerCase();
    return customers.filter(c =>
      (c.nama && c.nama.toLowerCase().includes(term)) ||
      (c.full_name && c.full_name.toLowerCase().includes(term)) ||
      (c.no_hp && c.no_hp.toLowerCase().includes(term)) ||
      (c.phone && c.phone.toLowerCase().includes(term)) ||
      (c.nik && c.nik.toLowerCase().includes(term)) ||
      (c.identity_number && c.identity_number.toLowerCase().includes(term)) ||
      (c.customer_code && c.customer_code.toLowerCase().includes(term)) ||
      (c.company_name && c.company_name.toLowerCase().includes(term)) ||
      (c.email && c.email.toLowerCase().includes(term))
    ).slice(0, 50);
  }, [customers, customerSearchTerm]);

  const handleSelectCustomer = (cust) => {
    setSelectedCustomerId(String(cust.id));
    setSelectedCustomer(cust);
    setIsDropdownOpen(false);
    setCustomerSearchTerm('');
    toast.success(`Customer "${cust.nama}" dipilih`);
  };

  const handleClearCustomer = () => {
    setSelectedCustomerId('');
    setSelectedCustomer(null);
    setCustomerSearchTerm('');
  };

  /* ── Hitung durasi & subtotal per item ── */
  const getItemDurasi = (item) => {
    if (!item.tanggal_mulai || !item.tanggal_selesai) return 0;
    const d = (new Date(item.tanggal_selesai) - new Date(item.tanggal_mulai)) / 86400000 + 1;
    return d > 0 ? d : 0;
  };

  const getItemDurasiHours = (item) => {
    if (!item.tanggal_mulai || !item.tanggal_selesai) return 0;
    const jMulai = item.jam_mulai || '08:00';
    const jSelesai = item.jam_selesai || '17:00';
    const startMs = new Date(`${item.tanggal_mulai}T${jMulai}:00`).getTime();
    const endMs = new Date(`${item.tanggal_selesai}T${jSelesai}:00`).getTime();
    const diffHours = Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60)));
    return diffHours;
  };

  const getItemSubtotal = (item) => {
    const alat = getAlat(item.alat_id);
    const d = getItemDurasi(item);
    return alat && d > 0 ? Number(alat.harga_sewa) * item.qty * d : 0;
  };

  const getTotalHarga = () => {
    return items.reduce((sum, item) => sum + getItemSubtotal(item), 0);
  };

  const getJumlahDp = () => {
    const total = getTotalHarga();
    if (opsiPembayaran === 'bayar_setelah_selesai' || opsiPembayaran === 'batal_booking') return 0;
    if (opsiPembayaran === 'lunas_awal') return total;
    return Math.round((total * persenDp) / 100);
  };

  const getSisaPembayaran = () => {
    if (opsiPembayaran === 'batal_booking') return 0;
    return Math.max(0, getTotalHarga() - getJumlahDp());
  };

  /* ── Cek ketersediaan alat ── */
  const cekKetersediaan = useCallback(async () => {
    if (items.length === 0) { setKonflik({}); return; }

    setChecking(true);
    try {
      const newKonflik = {};

      for (const item of items) {
        if (!item.tanggal_mulai || !item.tanggal_selesai || item.tanggal_mulai.length !== 10 || item.tanggal_selesai.length !== 10 || getItemDurasi(item) <= 0) continue;
        const alat = getAlat(item.alat_id);
        if (!alat) continue;

        try {
          const res = await api.get(
            `/alat/${item.alat_id}/availability?tanggal_mulai=${item.tanggal_mulai}&tanggal_selesai=${item.tanggal_selesai}&qty=${item.qty}`
          );
          const stockInfo = res.data?.data;
          if (stockInfo && !stockInfo.is_available) {
            newKonflik[item.alat_id] = { minSisa: stockInfo.sisa_stok, terpakai: stockInfo.qty_terpakai, total: stockInfo.stok_total };
          }
        } catch {
          // Fallback if individual endpoint fails
          const res = await api.get(
            `/bookings/kalender?tanggal_mulai=${item.tanggal_mulai}&tanggal_selesai=${item.tanggal_selesai}`
          );
          const bookings = res.data.data || [];
          const overlap = bookings.filter(b =>
            b.details?.some(d => d.alat_id === item.alat_id)
          );
          let sumRented = 0;
          overlap.forEach(b => {
            (b.details || []).forEach(d => {
              if (d.alat_id === item.alat_id) sumRented += (d.qty || 1);
            });
          });
          const minSisa = Math.max(0, alat.stok - sumRented);
          if (minSisa < item.qty) {
            newKonflik[item.alat_id] = { minSisa, terpakai: sumRented, total: alat.stok };
          }
        }
      }
      setKonflik(newKonflik);
    } catch {
      setKonflik({});
    }
    setChecking(false);
  }, [items, alatData]);

  useEffect(() => {
    const t = setTimeout(() => {
      cekKetersediaan();
    }, 400);
    return () => clearTimeout(t);
  }, [items, cekKetersediaan]);

  useEffect(() => {
    if (items.length === 0) {
      navigate('/alat');
    }
  }, [items, navigate]);

  const updateItem = (alatId, field, val) => {
    const nowWIB = getWIBDateTime();
    setItems(prev => prev.map(item => {
      if (item.alat_id === alatId) {
        let newVal = val;

        if (field === 'tanggal_mulai') {
          let currentJam = item.jam_mulai || nowWIB.time;
          if (newVal === nowWIB.date && currentJam < nowWIB.time) {
            currentJam = nowWIB.time;
          }
          const updated = { ...item, tanggal_mulai: newVal, jam_mulai: currentJam };
          if (newVal && newVal.length === 10 && updated.tanggal_selesai && updated.tanggal_selesai < newVal) {
            updated.tanggal_selesai = newVal;
          }
          return updated;
        }

        if (field === 'jam_mulai') {
          setJamMulai(newVal);
          if (val === '00:00' && item.tanggal_mulai === nowWIB.date) {
            const nextDate = addOneDayStr(item.tanggal_mulai);
            return { ...item, tanggal_mulai: nextDate, jam_mulai: '00:00' };
          }
        }

        if (field === 'jam_selesai') {
          setJamSelesai(newVal);
        }

        const updated = { ...item, [field]: newVal };
        if (field === 'tanggal_mulai' && newVal && newVal.length === 10 && updated.tanggal_selesai && updated.tanggal_selesai < newVal) {
          updated.tanggal_selesai = newVal;
        }
        return updated;
      }
      return item;
    }));
  };

  const adaKonflik = Object.keys(konflik).length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedCustomerId || !selectedCustomer) {
      return toast.error('Silakan cari dan pilih Customer terlebih dahulu!');
    }

    const nowWIB = getWIBDateTime();
    for (const item of items) {
      const itemJamMulai = item.jam_mulai || jamMulai || '08:00';
      const itemJamSelesai = item.jam_selesai || jamSelesai || '17:00';

      if (item.tanggal_mulai < nowWIB.date) {
        const alat = getAlat(item.alat_id);
        updateItem(item.alat_id, 'tanggal_mulai', nowWIB.date);
        return toast.error(`Tanggal mulai sewa untuk ${alat?.nama_alat || 'alat'} tidak boleh tanggal yang sudah lewat! Minimal hari ini WIB (${nowWIB.date}).`);
      }
      if (item.tanggal_selesai === item.tanggal_mulai && itemJamSelesai <= itemJamMulai) {
        return toast.error(`Jam pengembalian tidak valid. Jam kembali harus setelah jam pengambilan.`);
      }
      if (getItemDurasi(item) <= 0) {
        const alat = getAlat(item.alat_id);
        return toast.error(`Tanggal sewa untuk ${alat?.nama_alat || 'alat'} tidak valid`);
      }
    }
    if (adaKonflik) {
      return toast.error('Ada alat yang tidak tersedia di tanggal yang dipilih.');
    }

    setLoading(true);
    try {
      const primaryJamMulai = items[0]?.jam_mulai || jamMulai || '08:00';
      const primaryJamSelesai = items[0]?.jam_selesai || jamSelesai || '17:00';

      const payload = {
        user_id: selectedCustomerId,
        customer_id: selectedCustomerId,
        nama: selectedCustomer.nama,
        email: selectedCustomer.email,
        nik: selectedCustomer.nik,
        no_hp: selectedCustomer.no_hp,
        alamat: selectedCustomer.alamat,
        pengambil_nama: null,
        pengambil_no_hp: null,
        pengambil_hubungan: null,
        tanggal_mulai: items[0]?.tanggal_mulai || today,
        tanggal_selesai: items[0]?.tanggal_selesai || tomorrow,
        opsi_pembayaran: opsiPembayaran,
        jumlah_dp: getJumlahDp(),
        jam_mulai: primaryJamMulai,
        jam_selesai: primaryJamSelesai,
        uang_jaminan: uangJaminan,
        jenis_jaminan: jenisJaminan,
        catatan,
        items: items.map(i => ({
          alat_id: i.alat_id,
          qty: i.qty,
          tanggal_mulai: i.tanggal_mulai,
          tanggal_selesai: i.tanggal_selesai,
          jam_mulai: i.jam_mulai || primaryJamMulai,
          jam_selesai: i.jam_selesai || primaryJamSelesai,
          kelengkapan: i.kelengkapan,
        })),
      };

      const res = await api.post('/bookings', payload);
      toast.success('Formulir sewa berhasil dibuat!');
      navigate(`/bookings/${res.data.data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal membuat booking');
    }
    setLoading(false);
  };

  return (
    <AppLayout title="Formulir Penyewaan Alat">
      <div className="animate-fade-in max-w-4xl mx-auto space-y-6">
        <button onClick={() => navigate('/alat')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm font-medium transition-colors">
          <ArrowLeft className="h-4 w-4" /> Kembali ke katalog
        </button>

        {/* Form Title Banner */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-600 text-white shadow-xl">
          <div className="flex items-center gap-3 mb-2">
            <FileCheck className="h-8 w-8 text-indigo-200" />
            <h1 className="text-2xl font-extrabold text-white">Formulir Penyewaan Alat Resmi</h1>
          </div>
          <p className="text-indigo-100 text-sm">
            Pilih customer terdaftar, lengkapi data pengambil barang, rincian alat, waktu sewa, dan opsi pembayaran.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* STEP 1: SECTION A - Pilih Customer */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-600" /> A. Pilih Customer
              </h2>
              {loadingCustomers && (
                <span className="text-xs text-indigo-600 flex items-center gap-1">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Memuat data customer...
                </span>
              )}
            </div>

            {!selectedCustomer ? (
              <div className="relative">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Cari Customer Terdaftar (Berdasarkan Nama, NIK, No. HP, atau Email) *
                </label>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={customerSearchTerm}
                    onFocus={() => setIsDropdownOpen(true)}
                    onChange={(e) => {
                      setCustomerSearchTerm(e.target.value);
                      setIsDropdownOpen(true);
                    }}
                    placeholder="Ketik Nama Customer / NIK / No. HP..."
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                  />
                </div>

                {/* Dropdown Customer Options */}
                {isDropdownOpen && (
                  <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-2xl shadow-2xl max-h-64 overflow-y-auto divide-y divide-gray-100">
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.map(c => {
                        const initial = (c.nama || c.full_name || 'C').trim().charAt(0).toUpperCase();
                        return (
                          <div
                            key={c.id}
                            onClick={() => handleSelectCustomer(c)}
                            className="p-3 hover:bg-indigo-50/70 cursor-pointer transition flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-extrabold text-sm flex-shrink-0">
                                {initial}
                              </div>
                              <div>
                                <p className="font-bold text-gray-900 text-sm">{c.nama || c.full_name}</p>
                                <p className="text-xs text-gray-500 font-mono">
                                  NIK: {c.nik || c.identity_number || '-'} | HP: {c.no_hp || c.phone || '-'}
                                </p>
                              </div>
                            </div>
                            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                              Pilih
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-4 text-center text-xs text-gray-500">
                        Tidak ada customer yang cocok dengan "{customerSearchTerm}".
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Customer Read-Only Preview Card with Smooth Reveal */
              <div className="p-5 bg-gradient-to-r from-indigo-50/90 via-purple-50/60 to-white rounded-2xl border border-indigo-100 shadow-sm space-y-4 animate-fade-in transition-all">
                <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                      ✓
                    </span>
                    <div>
                      <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider bg-emerald-100 px-2 py-0.5 rounded-md">
                        Customer Terpilih
                      </span>
                      <h3 className="text-lg font-extrabold text-gray-900 mt-0.5">{selectedCustomer.nama}</h3>
                    </div>
                  </div>

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={handleClearCustomer}
                      className="px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                    >
                      <RotateCcw className="h-3.5 w-3.5 text-indigo-600" /> Ganti Customer
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 bg-white/80 rounded-xl border border-indigo-100/60">
                    <span className="text-gray-400 font-semibold block mb-0.5">NIK / No. Identitas</span>
                    <span className="font-bold text-gray-800 font-mono">{selectedCustomer.nik || '-'}</span>
                  </div>

                  <div className="p-2.5 bg-white/80 rounded-xl border border-indigo-100/60">
                    <span className="text-gray-400 font-semibold block mb-0.5">Nomor HP / WhatsApp</span>
                    <span className="font-bold text-gray-800">{selectedCustomer.no_hp || '-'}</span>
                  </div>

                  <div className="p-2.5 bg-white/80 rounded-xl border border-indigo-100/60">
                    <span className="text-gray-400 font-semibold block mb-0.5">Alamat Email</span>
                    <span className="font-bold text-gray-800">{selectedCustomer.email || '-'}</span>
                  </div>

                  <div className="p-2.5 bg-white/80 rounded-xl border border-indigo-100/60">
                    <span className="text-gray-400 font-semibold block mb-0.5">Alamat Domisili</span>
                    <span className="font-bold text-gray-800">{selectedCustomer.alamat || '-'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>


          {/* STEP 2: SECTION B - Detail Alat Rental */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Package className="h-5 w-5 text-indigo-600" /> B. Detail Alat Rental
              </h2>
              {checking && (
                <span className="text-xs text-indigo-600 flex items-center gap-1">
                  <RefreshCw className="h-3 w-3 animate-spin" /> Memeriksa ketersediaan...
                </span>
              )}
            </div>

            <div className="space-y-4">
              {items.map(item => {
                const alat = getAlat(item.alat_id);
                const d = getItemDurasi(item);
                const subtotal = getItemSubtotal(item);
                const ada = konflik[item.alat_id];

                return (
                  <div key={item.alat_id} className={`p-4 rounded-2xl border transition-all ${
                    ada ? 'border-red-200 bg-red-50/50' : 'border-gray-100 bg-gray-50/50 hover:bg-white'
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200/60 pb-3">
                      <div className="flex items-center gap-3.5">
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-white flex-shrink-0 flex items-center justify-center border border-gray-200">
                          {alat?.gambar
                            ? <img src={`${IMAGE_BASE}/${alat.gambar}`} alt={alat.nama_alat} className="w-full h-full object-cover" />
                            : <Package className="h-6 w-6 text-gray-400" />
                          }
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{alat?.nama_alat || `Alat #${item.alat_id}`}</p>
                          <p className="text-xs text-gray-500 font-mono">Kode Alat: {alat?.kode_alat || '-'}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Jumlah: <strong className="text-gray-900">{item.qty} Unit</strong>
                            {isKeuangan && alat?.harga_sewa != null && !isNaN(Number(alat.harga_sewa)) && Number(alat.harga_sewa) > 0 && (
                              ` × Rp ${Number(alat.harga_sewa).toLocaleString('id-ID')} / hari`
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3">
                        <div className="text-right">
                          {isKeuangan && !isNaN(Number(subtotal)) && Number(subtotal) > 0 && (
                            <p className="font-extrabold text-indigo-600 text-sm">Rp {subtotal.toLocaleString('id-ID')}</p>
                          )}
                          <p className="text-[11px] text-gray-500 font-semibold">{d} hari sewa ({getItemDurasiHours(item)} jam)</p>
                        </div>
                        <button type="button" onClick={() => handleDeleteClick(item.alat_id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition" title="Hapus alat">
                          <XCircle className="h-5 w-5" />
                        </button>
                      </div>
                    </div>

                    {/* Tanggal & Jam Sewa Per-Alat */}
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Tanggal Mulai Sewa</label>
                        <input
                          type="date"
                          min={today}
                          value={item.tanggal_mulai}
                          onChange={e => updateItem(item.alat_id, 'tanggal_mulai', e.target.value)}
                          onBlur={(e) => {
                            const val = e.target.value;
                            const nowWIB = getWIBDateTime();
                            if (val && val.length === 10) {
                              const year = parseInt(val.split('-')[0], 10);
                              if (year >= 2024 && val < nowWIB.date) {
                                toast.error(`Tanggal mulai sewa tidak boleh tanggal yang sudah lewat! Minimal hari ini WIB (${nowWIB.date}).`);
                                updateItem(item.alat_id, 'tanggal_mulai', nowWIB.date);
                              }
                            }
                          }}
                          className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Jam Ambil Barang (WIB) *</label>
                        <input
                          type="time"
                          required
                          value={item.jam_mulai || (item.tanggal_mulai === getTodayWIB() ? getCurrentTimeWIB() : '08:00')}
                          onChange={e => updateItem(item.alat_id, 'jam_mulai', e.target.value)}
                          onBlur={(e) => {
                            const val = e.target.value;
                            const nowWIB = getWIBDateTime();
                            if (item.tanggal_mulai === nowWIB.date && val && val.length === 5 && val < nowWIB.time) {
                              toast.error(`Waktu pengambilan sudah lewat. Waktu sekarang ${nowWIB.time} WIB. Silahkan pilih waktu setelah waktu sekarang.`);
                              updateItem(item.alat_id, 'jam_mulai', nowWIB.time);
                            }
                          }}
                          className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Tanggal Selesai Sewa</label>
                        <input
                          type="date"
                          min={item.tanggal_mulai || today}
                          value={item.tanggal_selesai}
                          onChange={e => updateItem(item.alat_id, 'tanggal_selesai', e.target.value)}
                          onBlur={(e) => {
                            const val = e.target.value;
                            const minMulai = item.tanggal_mulai || today;
                            if (val && val.length === 10) {
                              const year = parseInt(val.split('-')[0], 10);
                              if (year >= 2024 && val < minMulai) {
                                toast.error(`Tanggal selesai sewa tidak boleh lebih awal dari tanggal mulai!`);
                                updateItem(item.alat_id, 'tanggal_selesai', minMulai);
                              }
                            }
                          }}
                          className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Jam Pengembalian Barang (WIB) *</label>
                        <input
                          type="time"
                          required
                          value={item.jam_selesai || '17:00'}
                          onChange={e => updateItem(item.alat_id, 'jam_selesai', e.target.value)}
                          onBlur={(e) => {
                            const val = e.target.value;
                            if (item.tanggal_selesai === item.tanggal_mulai && val && val <= (item.jam_mulai || '08:00')) {
                              toast.error(`Jam pengembalian tidak valid. Jam kembali harus setelah jam pengambilan.`);
                              updateItem(item.alat_id, 'jam_selesai', '17:00');
                            }
                          }}
                          className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    {ada && (
                      <div className="mt-3 p-2 bg-red-100 text-red-700 rounded-xl text-xs flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                        <span>Stok bentrok pada tanggal ini! Tersisa {ada.minSisa} unit.</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <ConfirmDialog
            isOpen={confirmOpen}
            onClose={() => setConfirmOpen(false)}
            onConfirm={handleConfirmDelete}
            title="Hapus alat dari daftar?"
            message="Alat akan dihapus dari daftar booking."
          />


          {/* STEP 3: SECTION C - Ringkasan Booking & Opsi Pembayaran */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
              <ShieldCheck className="h-5 w-5 text-indigo-600" /> C. Ringkasan Booking & Opsi Pembayaran
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Uang Jaminan / Deposit (Rp)</label>
                <input
                  type="number"
                  value={uangJaminan}
                  onChange={e => setUangJaminan(Number(e.target.value))}
                  placeholder="100000"
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Jenis Jaminan yang Dititipkan *</label>
                <select
                  value={jenisJaminan}
                  onChange={e => setJenisJaminan(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="KTP Asli">KTP Asli</option>
                  <option value="SIM Asli">SIM A/C Asli</option>
                  <option value="STNK Asli">STNK Motor/Mobil Asli</option>
                  <option value="Paspor Asli">Paspor / KITAS Asli</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>
            </div>

            {/* Opsi Pembayaran */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-gray-800 mb-2">Pilih Sistem Pembayaran (3 Opsi):</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div
                  onClick={() => setOpsiPembayaran('dp')}
                  className={`cursor-pointer p-4 rounded-2xl border-2 transition-all ${
                    opsiPembayaran === 'dp' ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="font-bold text-xs text-gray-900 block mb-1">1. DP (Down Payment)</span>
                  <p className="text-[11px] text-gray-500">Bayar DP di awal, sisa tagihan pelunasan nanti.</p>
                </div>

                <div
                  onClick={() => setOpsiPembayaran('bayar_setelah_selesai')}
                  className={`cursor-pointer p-4 rounded-2xl border-2 transition-all ${
                    opsiPembayaran === 'bayar_setelah_selesai' ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="font-bold text-xs text-gray-900 block mb-1">2. Bayar Setelah Selesai</span>
                  <p className="text-[11px] text-gray-500">Bayar penuh saat pengembalian barang selesai.</p>
                </div>

                <div
                  onClick={() => setOpsiPembayaran('batal_booking')}
                  className={`cursor-pointer p-4 rounded-2xl border-2 transition-all ${
                    opsiPembayaran === 'batal_booking' ? 'border-red-600 bg-red-50/60 shadow-sm' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="font-bold text-xs text-red-700 block mb-1">3. Batal Booking</span>
                  <p className="text-[11px] text-gray-500">Batalkan transaksi sewa ini secara langsung.</p>
                </div>
              </div>
            </div>

            {/* Total Summary Box (Only visible for Admin Finance) */}
            {isKeuangan && (
              <div className="bg-indigo-50/80 p-4 rounded-2xl space-y-2 border border-indigo-100 text-xs text-gray-700">
                <div className="flex justify-between">
                  <span>Total Sewa Alat:</span>
                  <span className="font-bold text-gray-900">Rp {getTotalHarga().toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Uang Jaminan (Deposit):</span>
                  <span className="font-bold text-gray-900">Rp {Number(uangJaminan).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Wajib Dibayar di Awal:</span>
                  <span className="font-extrabold text-indigo-700 text-sm">Rp {getJumlahDp().toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between border-t border-indigo-200/80 pt-2">
                  <span>Sisa Tagihan (Pelunasan):</span>
                  <span className="font-extrabold text-amber-700 text-sm">Rp {getSisaPembayaran().toLocaleString('id-ID')}</span>
                </div>
              </div>
            )}
          </div>


          {/* Catatan Tambahan */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Catatan Tambahan (Opsional)</label>
            <textarea
              rows={2}
              value={catatan}
              onChange={e => setCatatan(e.target.value)}
              placeholder="Contoh: Pengambilan unit utama dengan tas kamera merah..."
              className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* STEP 6: Simpan Booking */}
          <button
            type="submit"
            disabled={loading || adaKonflik}
            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-2xl text-base font-extrabold shadow-xl shadow-indigo-200 transition disabled:opacity-50"
          >
            {loading ? 'Menyimpan Formulir & Booking...' : 'Simpan Formulir & Buat Booking Resmi'}
          </button>
        </form>
      </div>
    </AppLayout>
  );
}
