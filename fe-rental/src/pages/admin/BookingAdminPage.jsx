import { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import RentalTimeline from '../../components/common/RentalTimeline';
import { useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, Eye, Download, Plus, Clock, CheckCircle2, AlertCircle, FileText, Printer, XCircle, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

const ALL_STATUS = ['', 'MENUNGGU_PENGELUARAN', 'SEDANG_DISEWA', 'MENUNGGU_PENGEMBALIAN', 'PEMERIKSAAN_BARANG', 'SELESAI_DISEWA', 'DIBATALKAN'];

export default function BookingAdminPage() {
  const { isKeuangan } = useAuth();
  const navigate = useNavigate();
  const [data, setData]             = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [page, setPage]             = useState(1);
  const [search, setSearch]         = useState('');
  const [filterStatus, setFilter]   = useState('');
  const [detail, setDetail]         = useState({ open: false, item: null });
  const [confirm, setConfirm]       = useState({ open: false, item: null, status: '', reason: '' });
  const [editDatesModal, setEditDatesModal] = useState({ open: false, item: null, tanggal_mulai: '', tanggal_selesai: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchData(); }, [page, search, filterStatus]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, size: 10 });
      if (search) p.set('search', search);
      if (filterStatus) p.set('status', filterStatus);
      const res = await api.get(`/bookings?${p}`);
      setData(res.data.data);
      setPagination(res.data.pagination);
    } catch {}
    setLoading(false);
  };

  const handleCancelBooking = async () => {
    setSubmitting(true);
    try {
      await api.patch(`/bookings/${confirm.item.id}/status`, {
        status: 'dibatalkan',
        alasan_pembatalan: confirm.reason || 'Dibatalkan oleh Admin Booking',
      });
      toast.success(`Booking ${confirm.item?.kode_booking} berhasil dibatalkan.`);
      setConfirm({ open: false, item: null, status: '', reason: '' });
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal membatalkan booking'); }
    setSubmitting(false);
  };

  const handleSaveDates = async (e) => {
    e.preventDefault();
    if (!editDatesModal.tanggal_mulai || !editDatesModal.tanggal_selesai) {
      toast.error('Tanggal mulai dan tanggal selesai wajib diisi');
      return;
    }
    if (new Date(editDatesModal.tanggal_selesai) < new Date(editDatesModal.tanggal_mulai)) {
      toast.error('Tanggal selesai tidak boleh lebih awal dari tanggal mulai');
      return;
    }

    setSubmitting(true);
    try {
      await api.patch(`/bookings/${editDatesModal.item.id}/dates`, {
        tanggal_mulai: editDatesModal.tanggal_mulai,
        tanggal_selesai: editDatesModal.tanggal_selesai,
      });
      toast.success(`Tanggal booking ${editDatesModal.item.kode_booking} berhasil diperbarui!`);
      setEditDatesModal({ open: false, item: null, tanggal_mulai: '', tanggal_selesai: '' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mengubah tanggal booking');
    } finally {
      setSubmitting(false);
    }
  };

  const openDetail = async (id) => {
    try { const r = await api.get(`/bookings/${id}`); setDetail({ open: true, item: r.data.data }); } catch {}
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'SELESAI_DISEWA':
      case 'selesai':
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-black uppercase">
            ✓ SELESAI DISEWA
          </span>
        );
      case 'SEDANG_DISEWA':
      case 'BARANG_KELUAR':
      case 'BARANG_SEDANG_DISEWA':
      case 'RENTED':
      case 'disewa':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-black uppercase">
            🚚 SEDANG DISEWA
          </span>
        );
      case 'TERLAMBAT_KEMBALI':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-xs font-black uppercase animate-pulse">
            ⚠️ TERLAMBAT KEMBALI
          </span>
        );
      case 'BARANG_DIKEMBALIKAN':
      case 'MENUNGGU_PENGEMBALIAN':
      case 'SIAP_DIKEMBALIKAN':
      case 'WAITING_RETURN':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-full text-xs font-black uppercase">
            ⏱️ BARANG DIKEMBALIKAN
          </span>
        );
      case 'PEMERIKSAAN_BARANG':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-cyan-50 text-cyan-700 border border-cyan-200 rounded-full text-xs font-black uppercase">
            🔍 PEMERIKSAAN BARANG
          </span>
        );
      case 'MENUNGGU_KETERSEDIAAN':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-50 text-orange-700 border border-orange-200 rounded-full text-xs font-black uppercase">
            🔄 MENUNGGU KETERSEDIAAN
          </span>
        );
      case 'DIBATALKAN':
      case 'dibatalkan':
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full text-xs font-black uppercase">
            ✕ DIBATALKAN
          </span>
        );
      case 'MENUNGGU_BARANG_KELUAR':
      case 'MENUNGGU_PENGELUARAN':
      case 'WAITING_PICKUP':
      case 'pending':
      case 'dikonfirmasi':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-black uppercase">
            ⏳ MENUNGGU BARANG KELUAR
          </span>
        );
    }
  };

  return (
    <AppLayout title="Data Booking">
      <div className="animate-fade-in space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="page-title">Manajemen Booking</h1>
            <p className="page-subtitle">Monitor dan kelola semua transaksi booking rental (Status terintegrasi otomatis)</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/alat')} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-sm transition">
              <Plus className="h-4 w-4" /> Buat Booking Baru
            </button>
            <button onClick={() => downloadExport('/bookings/export/excel', `bookings_${Date.now()}.xlsx`)} className="btn-ghost"><Download className="h-4 w-4" /> XLSX</button>
            <button onClick={() => downloadExport('/bookings/export/pdf', `bookings_${Date.now()}.pdf`)} className="btn-ghost"><Download className="h-4 w-4" /> PDF</button>
          </div>
        </div>

        <div className="card p-0 overflow-hidden">
          <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-gray-100">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input className="input-field pl-10" placeholder="Cari nama customer / kode booking..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <select className="input-field sm:w-56 font-bold text-xs" value={filterStatus} onChange={e => { setFilter(e.target.value); setPage(1); }}>
              <option value="">Semua Status</option>
              <option value="MENUNGGU_BARANG_KELUAR">⏳ Menunggu Barang Keluar</option>
              <option value="SEDANG_DISEWA">🚚 Sedang Disewa</option>
              <option value="TERLAMBAT_KEMBALI">⚠️ Terlambat Kembali</option>
              <option value="BARANG_DIKEMBALIKAN">⏱️ Pengembalian</option>
              <option value="SELESAI_DISEWA">✓ Selesai</option>
              <option value="DIBATALKAN">✕ Dibatalkan</option>
              <option value="MENUNGGU_KETERSEDIAAN">🔄 Menunggu Ketersediaan</option>
            </select>
          </div>

          {loading ? <LoadingSpinner className="py-12" /> : (
            data.length === 0
              ? <EmptyState icon={<ShoppingCart />} text="Belum ada data booking" />
              : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100 bg-slate-50">
                        <th className="table-header">Kode</th>
                        <th className="table-header">Customer</th>
                        <th className="table-header">Periode</th>
                        {isKeuangan && <th className="table-header">Total</th>}
                        <th className="table-header">Status Otomatis</th>
                        <th className="table-header text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map(item => (
                        <tr key={item.id} className="table-row">
                          <td className="table-cell font-bold text-indigo-900">{item.kode_booking}</td>
                          <td className="table-cell text-gray-700 font-semibold">{item.customer?.full_name || item.user?.nama || 'Customer'}</td>
                          <td className="table-cell text-gray-500 text-xs">
                            {new Date(item.tanggal_mulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} –{' '}
                            {new Date(item.tanggal_selesai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          {isKeuangan && (
                            <td className="table-cell font-extrabold text-gray-900">
                              {item.total_harga ? `Rp ${Number(item.total_harga).toLocaleString('id-ID')}` : '-'}
                            </td>
                          )}
                          <td className="table-cell">
                            {renderStatusBadge(item.status)}
                          </td>
                          <td className="table-cell text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button onClick={() => openDetail(item.id)} className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold transition text-xs flex items-center gap-1 cursor-pointer" title="Detail & Timeline">
                                <Eye className="h-3.5 w-3.5" /> Detail
                              </button>
                              <button
                                onClick={() => setEditDatesModal({
                                  open: true,
                                  item,
                                  tanggal_mulai: item.tanggal_mulai ? String(item.tanggal_mulai).substring(0, 10) : '',
                                  tanggal_selesai: item.tanggal_selesai ? String(item.tanggal_selesai).substring(0, 10) : ''
                                })}
                                className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 rounded-xl font-bold transition text-xs flex items-center gap-1 cursor-pointer"
                                title="Edit Tanggal Rental"
                              >
                                <Calendar className="h-3.5 w-3.5" /> Edit Tanggal
                              </button>
                              <button onClick={() => navigate(`/admin/bookings/${item.id}/form`)} className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl font-bold transition text-xs flex items-center gap-1 cursor-pointer" title="Buka Formulir Penyewaan Alat">
                                <FileText className="h-3.5 w-3.5" /> Formulir
                              </button>
                              {['MENUNGGU_PENGELUARAN', 'WAITING_PICKUP', 'pending', 'dikonfirmasi'].includes(item.status) && (
                                <button
                                  onClick={() => setConfirm({ open: true, item, status: 'dibatalkan', reason: '' })}
                                  className="px-2.5 py-1.5 text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl transition cursor-pointer border border-rose-200 flex items-center gap-1"
                                  title="Batalkan Booking"
                                >
                                  <XCircle className="h-3.5 w-3.5" /> Batalkan
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
          )}
          <div className="px-4 pb-4"><Pagination pagination={pagination} onPageChange={setPage} /></div>
        </div>

        {/* Detail Modal */}
        <Modal isOpen={detail.open} onClose={() => setDetail({ open: false, item: null })} title={`Detail Booking #${detail.item?.kode_booking}`} size="lg">
          {detail.item && <BookingDetailView booking={detail.item} navigate={navigate} />}
        </Modal>

        {/* Modal Edit Tanggal Rental */}
        <Modal
          isOpen={editDatesModal.open}
          onClose={() => setEditDatesModal({ open: false, item: null, tanggal_mulai: '', tanggal_selesai: '' })}
          title={`Edit Tanggal Rental #${editDatesModal.item?.kode_booking}`}
          size="sm"
        >
          <form onSubmit={handleSaveDates} className="space-y-4 py-1">
            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-900 font-medium">
              Ubah periode penyewaan alat untuk customer <strong className="font-bold">{editDatesModal.item?.customer?.full_name || editDatesModal.item?.user?.nama || 'Customer'}</strong>.
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Tanggal Mulai Rental</label>
                <input
                  type="date"
                  required
                  value={editDatesModal.tanggal_mulai}
                  onChange={e => setEditDatesModal(prev => ({ ...prev, tanggal_mulai: e.target.value }))}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Tanggal Selesai Rental</label>
                <input
                  type="date"
                  required
                  value={editDatesModal.tanggal_selesai}
                  onChange={e => setEditDatesModal(prev => ({ ...prev, tanggal_selesai: e.target.value }))}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditDatesModal({ open: false, item: null, tanggal_mulai: '', tanggal_selesai: '' })}
                className="btn-secondary flex-1"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary bg-indigo-600 hover:bg-indigo-700 flex-1"
              >
                {submitting ? 'Menyimpan...' : 'Simpan Tanggal'}
              </button>
            </div>
          </form>
        </Modal>

        {/* Confirm Cancellation Modal */}
        <Modal isOpen={confirm.open} onClose={() => setConfirm({ open: false, item: null, status: '' })} title="Konfirmasi Pembatalan Booking" size="sm">
          <div className="space-y-4 py-1">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs font-medium">
              Apakah Anda yakin ingin membatalkan booking <strong className="font-bold">{confirm.item?.kode_booking}</strong>?
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Alasan Pembatalan</label>
              <textarea
                value={confirm.reason}
                onChange={e => setConfirm(prev => ({ ...prev, reason: e.target.value }))}
                rows={2}
                placeholder="Contoh: Permintaan pembatalan dari customer..."
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setConfirm({ open: false, item: null, status: '', reason: '' })} className="btn-secondary flex-1">Batal</button>
              <button onClick={handleCancelBooking} disabled={submitting} className="btn-primary bg-rose-600 hover:bg-rose-700 flex-1">
                {submitting ? 'Memproses...' : 'Ya, Batalkan'}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}

const downloadExport = async (path, filename) => {
  try {
    const res = await api.get(path, { responseType: 'blob' });
    const blob = new Blob([res.data], { type: res.headers['content-type'] });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
  } catch (err) { /* ignore */ }
};

function BookingDetailView({ booking, navigate }) {
  const { isKeuangan } = useAuth();
  const durasi = Math.max(1, (new Date(booking.tanggal_selesai) - new Date(booking.tanggal_mulai)) / (1000 * 60 * 60 * 24) + 1);

  const detailFields = [
    ['Kode Booking', booking.kode_booking, true],
    ['Status Booking (Otomatis ERP)', booking.status],
    ['Customer', booking.customer?.full_name || booking.user?.nama || 'Customer'],
    ['No HP / Email', `${booking.customer?.phone || booking.user?.no_hp || '-'} • ${booking.customer?.email || booking.user?.email || '-'}`],
  ];

  if (isKeuangan) {
    detailFields.push(
      ['Opsi Pembayaran', (booking.opsi_pembayaran || 'dp').toUpperCase().replace('_', ' ')],
      ['Status Pembayaran', (booking.status_pembayaran || 'belum_bayar').toUpperCase().replace('_', ' ')],
      ['DP Dibayar', booking.jumlah_dp ? `Rp ${Number(booking.jumlah_dp).toLocaleString('id-ID')}` : '-'],
      ['Sisa Tagihan', booking.sisa_pembayaran ? `Rp ${Number(booking.sisa_pembayaran).toLocaleString('id-ID')}` : '-']
    );
  }

  return (
    <div className="space-y-6">
      {/* ACTION BAR IN DETAIL MODAL */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-gradient-to-r from-indigo-50 via-purple-50 to-slate-50 border border-indigo-100 rounded-2xl">
        <button
          onClick={() => navigate(`/admin/bookings/${booking.id}/form`)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition cursor-pointer"
        >
          <FileText className="h-4 w-4" /> Buka Formulir Penyewaan Alat
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/admin/bookings/${booking.id}/form`)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-sm"
          >
            <Download className="h-3.5 w-3.5 text-indigo-400" /> Download Formulir PDF
          </button>
        </div>
      </div>

      {/* TIMELINE COMPONENT */}
      <RentalTimeline booking={booking} />

      <div className="grid grid-cols-2 gap-3 text-sm">
        {detailFields.map(([l, v, bold]) => (
          <div key={l} className="bg-slate-50/80 p-3 rounded-2xl border border-gray-100">
            <p className="text-[11px] text-gray-500 font-bold mb-0.5">{l}</p>
            <div className={bold ? 'font-black text-indigo-900' : 'font-semibold text-gray-800'}>{v}</div>
          </div>
        ))}
      </div>

      {booking.details?.length > 0 && (
        <div>
          <p className="text-xs font-extrabold text-gray-500 uppercase tracking-wider mb-2">Item Alat & Jadwal Per-Alat</p>
          <div className="space-y-2">
            {booking.details.map(d => {
              const itemDurasi = d.tanggal_mulai && d.tanggal_selesai ? Math.max(1, (new Date(d.tanggal_selesai) - new Date(d.tanggal_mulai)) / 86400000 + 1) : durasi;

              return (
                <div key={d.id} className="p-3 bg-slate-50 rounded-2xl border border-gray-100 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-gray-900">{d.alat?.nama_alat}</p>
                    {isKeuangan && d.subtotal && (
                      <p className="font-extrabold text-indigo-600 text-sm">Rp {Number(d.subtotal).toLocaleString('id-ID')}</p>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-gray-700">
                    Tanggal Rental: <strong className="text-gray-900">{d.tanggal_mulai || booking.tanggal_mulai} s/d {d.tanggal_selesai || booking.tanggal_selesai}</strong> ({itemDurasi} Hari)
                  </p>
                  <p className="text-xs font-semibold text-indigo-700">
                    Waktu: <strong className="text-indigo-900">{d.jam_mulai || '08:00'} WIB - {d.jam_selesai || '17:00'} WIB</strong>
                  </p>
                  <p className="text-xs text-gray-500 font-medium">
                    Jumlah: <strong className="text-gray-900">{d.qty} Unit</strong>
                    {isKeuangan && d.harga && ` × Rp ${Number(d.harga).toLocaleString('id-ID')}/hari × ${itemDurasi} hari`}
                  </p>
                </div>
              );
            })}
          </div>
          {isKeuangan && booking.total_harga && (
            <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
              <p className="font-bold text-gray-700 text-sm">Total Keseluruhan</p>
              <p className="text-lg font-black text-indigo-600">Rp {Number(booking.total_harga).toLocaleString('id-ID')}</p>
            </div>
          )}
        </div>
      )}
      {booking.catatan && (
        <div className="bg-amber-50/60 rounded-2xl p-3.5 border border-amber-100">
          <p className="text-xs text-amber-800 font-bold mb-1">Catatan Customer</p>
          <p className="text-xs text-gray-700 italic">{booking.catatan}</p>
        </div>
      )}
      {booking.alasan_pembatalan && (
        <div className="bg-rose-50 rounded-2xl p-3.5 border border-rose-100">
          <p className="text-xs text-rose-800 font-bold mb-1">Alasan Pembatalan</p>
          <p className="text-xs text-gray-700">{booking.alasan_pembatalan}</p>
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon, text }) {
  return (
    <div className="text-center py-14">
      <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
        <div className="h-7 w-7 text-gray-400">{icon}</div>
      </div>
      <p className="text-gray-500 font-medium">{text}</p>
    </div>
  );
}
