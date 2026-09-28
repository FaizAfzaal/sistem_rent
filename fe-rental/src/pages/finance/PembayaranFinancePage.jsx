import { useState } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import Modal from '../../components/common/Modal';
import toast from 'react-hot-toast';
import {
  CreditCard, Search, Filter, Eye, CheckCircle2, XCircle,
  Plus, Upload, DollarSign, Download, Clock, Trash2
} from 'lucide-react';

import { useEffect } from 'react';
import api from '../../lib/api';

export default function PembayaranFinancePage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPay, setSelectedPay] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const [manualForm, setManualForm] = useState({ kode_booking: '', customer: '', jumlah: '', metode: 'Transfer Bank', referensi: '' });

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const [resPay, resBook] = await Promise.allSettled([
        api.get('/pembayaran'),
        api.get('/bookings')
      ]);

      const payData = resPay.status === 'fulfilled' && resPay.value.data?.data ? resPay.value.data.data : [];
      const bookData = resBook.status === 'fulfilled' && resBook.value.data?.data ? resBook.value.data.data : [];

      // Filter out cancelled bookings/payments
      const payDataFiltered = payData.filter(p => p.status !== 'dibatalkan' && p.booking?.status !== 'dibatalkan');
      const bookDataFiltered = bookData.filter(b => b.status !== 'dibatalkan');

      const listMap = new Map();

      // Add payments from pembayaran table
      payDataFiltered.forEach(p => {
        const kode = p.booking?.kode_booking || `RB-${p.booking_id}`;
        listMap.set(p.booking_id, {
          id: p.id,
          pembayaran_id: p.id,
          booking_id: p.booking_id,
          kode_booking: kode,
          customer: p.booking?.user?.nama || 'Customer',
          metode: p.metode ? `Transfer (${p.metode})` : 'Transfer Bank',
          jumlah: Number(p.jumlah || p.booking?.total_harga || 0),
          tanggal: p.tanggal_bayar ? new Date(p.tanggal_bayar).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-',
          status: p.status === 'lunas' ? 'Lunas / Diterima' : p.status === 'gagal' ? 'Ditolak' : 'Menunggu Konfirmasi',
          bukti: p.bukti_bayar ? `${api.defaults.baseURL.replace('/api', '')}/${p.bukti_bayar}` : null,
          referensi: `TRX-${p.id}`
        });
      });

      // Include all active bookings from Admin Booking
      bookDataFiltered.forEach(b => {
        if (!listMap.has(b.id)) {
          const isPaid = b.status === 'dikonfirmasi' || b.status === 'lunas';
          listMap.set(b.id, {
            id: `book-${b.id}`,
            pembayaran_id: null,
            booking_id: b.id,
            kode_booking: b.kode_booking || `RB-${b.id}`,
            customer: b.user?.nama || 'Customer',
            metode: 'Transfer Bank',
            jumlah: Number(b.total_harga || 0),
            tanggal: b.created_at ? new Date(b.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-',
            status: isPaid ? 'Lunas / Diterima' : 'Menunggu Konfirmasi',
            bukti: b.bukti_bayar || null,
            referensi: `BOOK-${b.id}`
          });
        }
      });

      setPayments(Array.from(listMap.values()));
    } catch {
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePayment = async (item) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus / membatalkan data pembayaran ${item.kode_booking}?`)) return;
    try {
      if (item.pembayaran_id) {
        try {
          await api.delete(`/pembayaran/${item.pembayaran_id}`);
        } catch {}
      }
      if (item.booking_id) {
        try {
          await api.patch(`/bookings/${item.booking_id}/status`, { status: 'dibatalkan' });
        } catch {}
      }
      toast.success(`Data pembayaran ${item.kode_booking} berhasil dihapus & dibatalkan!`);
      setIsDetailOpen(false);
      fetchPayments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus data pembayaran');
    }
  };

  const handleConfirm = async (pay) => {
    try {
      if (pay.pembayaran_id) {
        await api.patch(`/pembayaran/${pay.pembayaran_id}/konfirmasi`, { status: 'lunas' });
      } else {
        await api.post('/pembayaran', {
          booking_id: pay.booking_id,
          jumlah: pay.jumlah,
          metode: 'transfer',
          status: 'lunas'
        });
        try {
          await api.patch(`/bookings/${pay.booking_id}/status`, { status: 'dikonfirmasi' });
        } catch {}
      }

      toast.success('Pembayaran berhasil diselesaikan');
      setPayments(prev => prev.map(p => (p.booking_id === pay.booking_id || p.id === pay.id ? { ...p, status: 'Lunas / Diterima' } : p)));
      if (selectedPay?.booking_id === pay.booking_id) {
        setSelectedPay(prev => ({ ...prev, status: 'Lunas / Diterima' }));
      }
      await fetchPayments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Terdapat masalah saat memperbarui pembayaran');
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('Isi alasan penolakan terlebih dahulu');
      return;
    }
    if (!selectedPay) return;

    try {
      if (selectedPay.pembayaran_id) {
        try {
          await api.patch(`/pembayaran/${selectedPay.pembayaran_id}/konfirmasi`, {
            status: 'gagal',
            alasan: rejectReason
          });
        } catch {}
      }
      if (selectedPay.booking_id) {
        try {
          await api.patch(`/bookings/${selectedPay.booking_id}/status`, {
            status: 'dibatalkan',
            alasan_pembatalan: rejectReason
          });
        } catch {}
      }

      toast.error(`Pembayaran ${selectedPay.kode_booking} berhasil ditolak (Alasan: ${rejectReason}) & otomatis dihapus dari daftar!`);
      setIsRejectModalOpen(false);
      setIsDetailOpen(false);
      setRejectReason('');
      await fetchPayments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menolak pembayaran');
    }
  };

  const handleAddManual = (e) => {
    e.preventDefault();
    if (!manualForm.kode_booking || !manualForm.jumlah) {
      toast.error('Lengkapi kode booking dan jumlah pembayaran');
      return;
    }
    const newPay = {
      id: Date.now(),
      kode_booking: manualForm.kode_booking,
      customer: manualForm.customer || 'Customer Direct',
      metode: manualForm.metode,
      jumlah: Number(manualForm.jumlah),
      tanggal: '29 Juli 2026',
      status: 'Lunas / Diterima',
      bukti: null,
      referensi: manualForm.referensi || `MANUAL-${Date.now()}`
    };
    setPayments([newPay, ...payments]);
    setIsManualModalOpen(false);
    setManualForm({ kode_booking: '', customer: '', jumlah: '', metode: 'Transfer Bank', referensi: '' });
    toast.success('Pembayaran manual berhasil diinput!');
  };

  const filtered = payments.filter(p =>
    p.kode_booking.toLowerCase().includes(search.toLowerCase()) ||
    p.customer.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Mengelola Pembayaran</h1>
            <p className="text-sm text-gray-500">Verifikasi bukti transfer, konfirmasi pembayaran, dan input manual.</p>
          </div>
          <button
            onClick={() => setIsManualModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
          >
            <Plus className="h-4 w-4" /> Input Pembayaran Manual
          </button>
        </div>

        {/* Filter bar */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari kode booking atau nama customer..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Payments Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-100 text-xs font-bold uppercase text-gray-500">
                <th className="px-5 py-4">Kode Booking</th>
                <th className="px-5 py-4">Customer</th>
                <th className="px-5 py-4">Metode</th>
                <th className="px-5 py-4">Jumlah Pembayaran</th>
                <th className="px-5 py-4">Tanggal</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400 font-medium">
                    <span className="inline-block h-5 w-5 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin mr-2 align-middle"></span>
                    Memuat data pembayaran...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400 font-medium">
                    Belum ada data pembayaran.
                  </td>
                </tr>
              ) : (
                filtered.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-4 font-extrabold text-indigo-600">{item.kode_booking}</td>
                    <td className="px-5 py-4 font-bold text-gray-900">{item.customer}</td>
                    <td className="px-5 py-4 text-xs font-medium text-gray-600">{item.metode}</td>
                    <td className="px-5 py-4 font-bold text-gray-900">Rp {Number(item.jumlah).toLocaleString('id-ID')}</td>
                    <td className="px-5 py-4 text-xs text-gray-500">{item.tanggal}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${
                        item.status === 'Lunas / Diterima' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        item.status === 'Ditolak' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => { setSelectedPay(item); setIsDetailOpen(true); }}
                          className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600"
                          title="Lihat Bukti"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {item.status === 'Menunggu Konfirmasi' && (
                          <button
                            onClick={() => handleConfirm(item)}
                            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Konfirmasi
                          </button>
                        )}
                        <button
                          onClick={() => handleDeletePayment(item)}
                          className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
                          title="Hapus / Batalkan Pembayaran"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* DETAIL MODAL */}
        <Modal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title={`Pembayaran #${selectedPay?.kode_booking}`} size="md">
          {selectedPay && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs bg-gray-50 p-4 rounded-xl">
                <div><p className="text-gray-400">Customer</p><p className="font-bold text-gray-900">{selectedPay.customer}</p></div>
                <div><p className="text-gray-400">Jumlah</p><p className="font-extrabold text-indigo-600 text-sm">Rp {Number(selectedPay.jumlah).toLocaleString('id-ID')}</p></div>
                <div><p className="text-gray-400">Metode</p><p className="font-medium text-gray-700">{selectedPay.metode}</p></div>
                <div><p className="text-gray-400">No Ref</p><p className="font-medium text-gray-700">{selectedPay.referensi}</p></div>
              </div>
              {selectedPay.bukti ? (
                <div>
                  <p className="text-xs font-bold text-gray-700 mb-1">Bukti Transfer:</p>
                  <img src={selectedPay.bukti} alt="Bukti" className="w-full rounded-xl border border-gray-200 max-h-72 object-cover" />
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">Tidak ada lampiran foto (Pembayaran Manual/Direct)</p>
              )}
              <div className="flex gap-2 pt-2">
                {selectedPay.status === 'Menunggu Konfirmasi' && (
                  <>
                    <button onClick={() => setIsRejectModalOpen(true)} className="flex-1 py-2 rounded-xl bg-red-50 text-red-600 font-bold text-xs hover:bg-red-100">
                      Tolak
                    </button>
                    <button onClick={() => { handleConfirm(selectedPay); setIsDetailOpen(false); }} className="flex-1 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700">
                      Konfirmasi Lunas
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </Modal>

        {/* INPUT MANUAL MODAL */}
        <Modal isOpen={isManualModalOpen} onClose={() => setIsManualModalOpen(false)} title="Input Pembayaran Manual" size="md">
          <form onSubmit={handleAddManual} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Kode Booking</label>
              <input type="text" value={manualForm.kode_booking} onChange={e => setManualForm({ ...manualForm, kode_booking: e.target.value })} placeholder="misal: RB-001" className="w-full px-3 py-2 bg-gray-50 border rounded-xl text-sm" required />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Nama Customer</label>
              <input type="text" value={manualForm.customer} onChange={e => setManualForm({ ...manualForm, customer: e.target.value })} placeholder="misal: PT ABC" className="w-full px-3 py-2 bg-gray-50 border rounded-xl text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Jumlah Pembayaran (Rp)</label>
              <input type="number" value={manualForm.jumlah} onChange={e => setManualForm({ ...manualForm, jumlah: e.target.value })} placeholder="5000000" className="w-full px-3 py-2 bg-gray-50 border rounded-xl text-sm" required />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setIsManualModalOpen(false)} className="flex-1 py-2 border text-xs font-bold rounded-xl">Batal</button>
              <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-xs">Simpan</button>
            </div>
          </form>
        </Modal>

        {/* REJECT MODAL */}
        <Modal isOpen={isRejectModalOpen} onClose={() => setIsRejectModalOpen(false)} title="Alasan Penolakan" size="sm">
          <div className="space-y-3">
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} placeholder="Alasan penolakan..." className="w-full p-2.5 border rounded-xl text-sm" />
            <button onClick={handleReject} className="w-full py-2 bg-red-600 text-white font-bold text-xs rounded-xl">Konfirmasi Tolak</button>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}
