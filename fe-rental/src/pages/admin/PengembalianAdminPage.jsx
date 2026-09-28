import { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import api from '../../lib/api';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { RotateCcw, Plus, Eye, Search } from 'lucide-react';
import toast from 'react-hot-toast';

const KONDISI_COLOR = {
  baik:         'badge-baik',
  rusak_ringan: 'badge-rusak_ringan',
  rusak_berat:  'badge-rusak_berat',
};

export default function PengembalianAdminPage() {
  const [data, setData]       = useState([]);
  const [eligibleBookings, setEligible] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const [modal, setModal]     = useState({ open: false });
  const [detail, setDetail]   = useState({ open: false, item: null });
  const [form, setForm]       = useState({ booking_id: '', tanggal_pengembalian: today(), kondisi_alat: 'baik', denda: '0', catatan: '' });
  const [submitting, setSubmitting] = useState(false);
  const [bookingSearch, setBookingSearch] = useState('');

  useEffect(() => { fetchData(); }, [page]);

  useEffect(() => {
    // fetch bookings that can be returned (status disewa or dikonfirmasi)
    api.get('/bookings?size=100&status=disewa').then(r => {
      const a = r.data.data || [];
      api.get('/bookings?size=100&status=dikonfirmasi').then(r2 => {
        setEligible([...a, ...(r2.data.data || [])]);
      });
    }).catch(() => {});
  }, []);

  function today() { return new Date().toISOString().split('T')[0]; }

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/pengembalian?page=${page}&size=10`);
      setData(res.data.data);
      setPagination(res.data.pagination);
    } catch {}
    setLoading(false);
  };

  const openCreate = () => {
    setForm({ booking_id: '', tanggal_pengembalian: today(), kondisi_alat: 'baik', denda: '0', catatan: '' });
    setBookingSearch('');
    setModal({ open: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.booking_id) return toast.error('Pilih booking terlebih dahulu');
    setSubmitting(true);
    try {
      await api.post('/pengembalian', { ...form, denda: Number(form.denda) });
      toast.success('Pengembalian berhasil dicatat');
      setModal({ open: false });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mencatat pengembalian');
    }
    setSubmitting(false);
  };

  const openDetail = async (id) => {
    try {
      const res = await api.get(`/pengembalian/${id}`);
      setDetail({ open: true, item: res.data.data });
    } catch {}
  };

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const filteredBookings = eligibleBookings.filter(b =>
    b.kode_booking.toLowerCase().includes(bookingSearch.toLowerCase()) ||
    (b.user?.nama || '').toLowerCase().includes(bookingSearch.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        <div className="page-header">
          <div>
            <h1 className="page-title">Pengembalian Alat</h1>
            <p className="page-subtitle">Catat dan kelola pengembalian alat sewa</p>
          </div>
          <button onClick={openCreate} className="btn-primary">
            <Plus className="h-4 w-4" /> Catat Pengembalian
          </button>
        </div>

        <div className="card p-0 overflow-hidden">
          {loading ? <LoadingSpinner className="py-12" /> : (
            data.length === 0 ? (
              <div className="text-center py-14">
                <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <RotateCcw className="h-7 w-7 text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium">Belum ada pengembalian</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="table-header">Booking</th>
                      <th className="table-header">Customer</th>
                      <th className="table-header">Tgl Kembali</th>
                      <th className="table-header">Kondisi</th>
                      <th className="table-header">Denda</th>
                      <th className="table-header text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map(item => (
                      <tr key={item.id} className="table-row">
                        <td className="table-cell font-semibold text-gray-900">{item.booking?.kode_booking}</td>
                        <td className="table-cell text-gray-600">{item.booking?.user?.nama}</td>
                        <td className="table-cell text-gray-500">{new Date(item.tanggal_pengembalian).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                        <td className="table-cell"><span className={KONDISI_COLOR[item.kondisi_alat] || 'badge-baik'}>{item.kondisi_alat?.replace('_', ' ')}</span></td>
                        <td className="table-cell">
                          {Number(item.denda) > 0
                            ? <span className="text-red-600 font-semibold">Rp {Number(item.denda).toLocaleString('id-ID')}</span>
                            : <span className="text-gray-400">–</span>
                          }
                        </td>
                        <td className="table-cell text-right">
                          <button onClick={() => openDetail(item.id)} className="btn-ghost p-2"><Eye className="h-4 w-4" /></button>
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

        {/* Create Modal */}
        <Modal isOpen={modal.open} onClose={() => setModal({ open: false })} title="Catat Pengembalian" size="md">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Booking picker */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Pilih Booking</label>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  className="input-field pl-9"
                  placeholder="Cari kode booking atau nama pelanggan..."
                  value={bookingSearch}
                  onChange={e => setBookingSearch(e.target.value)}
                />
              </div>
              <div className="border border-gray-200 rounded-xl max-h-40 overflow-y-auto">
                {filteredBookings.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">Tidak ada booking yang bisa dikembalikan</p>
                ) : filteredBookings.map(b => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => { setForm(f => ({ ...f, booking_id: b.id })); setBookingSearch(''); }}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-indigo-50 transition-colors text-left ${form.booking_id == b.id ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-700'}`}
                  >
                    <span>{b.kode_booking}</span>
                    <span className="text-xs text-gray-500">{b.user?.nama}</span>
                  </button>
                ))}
              </div>
              {form.booking_id && (
                <p className="text-xs text-indigo-600 mt-1 font-medium">
                  Terpilih: {eligibleBookings.find(b => b.id == form.booking_id)?.kode_booking}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tanggal Pengembalian</label>
              <input type="date" className="input-field" value={form.tanggal_pengembalian} onChange={set('tanggal_pengembalian')} required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Kondisi Alat</label>
              <select className="input-field" value={form.kondisi_alat} onChange={set('kondisi_alat')}>
                <option value="baik">Baik</option>
                <option value="rusak_ringan">Rusak Ringan</option>
                <option value="rusak_berat">Rusak Berat</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Denda (Rp)</label>
              <input type="number" className="input-field" value={form.denda} onChange={set('denda')} min="0" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Catatan</label>
              <textarea className="input-field resize-none" rows="2" value={form.catatan} onChange={set('catatan')} placeholder="Kondisi tambahan, kerusakan, dll..." />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setModal({ open: false })} className="btn-secondary flex-1">Batal</button>
              <button type="submit" disabled={submitting} className="btn-primary flex-1">
                {submitting ? <><span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Menyimpan...</> : 'Simpan'}
              </button>
            </div>
          </form>
        </Modal>

        {/* Detail Modal */}
        <Modal isOpen={detail.open} onClose={() => setDetail({ open: false, item: null })} title="Detail Pengembalian" size="lg">
          {detail.item && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <Info label="Booking"     value={detail.item.booking?.kode_booking} bold />
                <Info label="Tgl Kembali" value={new Date(detail.item.tanggal_pengembalian).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} />
                <Info label="Customer"    value={detail.item.booking?.user?.nama} />
                <Info label="Kondisi"     value={<span className={KONDISI_COLOR[detail.item.kondisi_alat]}>{detail.item.kondisi_alat?.replace('_', ' ')}</span>} />
                <Info label="Denda"       value={<span className="text-red-600 font-bold">Rp {Number(detail.item.denda).toLocaleString('id-ID')}</span>} />
              </div>
              {detail.item.catatan && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1 font-medium">Catatan</p>
                  <p className="text-sm text-gray-700">{detail.item.catatan}</p>
                </div>
              )}
              {detail.item.booking?.details?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Alat Dikembalikan</p>
                  <div className="space-y-1.5">
                    {detail.item.booking.details.map(d => (
                      <div key={d.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                        <p className="text-sm font-medium text-gray-900">{d.alat?.nama_alat}</p>
                        <span className="text-xs text-gray-500 bg-white rounded-lg px-2 py-1 border border-gray-200">{d.qty} unit</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal>
      </div>
    </AppLayout>
  );
}

function Info({ label, value, bold }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className={`text-sm ${bold ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>{value}</p>
    </div>
  );
}
