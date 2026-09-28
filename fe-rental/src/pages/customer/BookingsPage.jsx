import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import api from '../../lib/api';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Search, ShoppingCart, ChevronRight, Plus } from 'lucide-react';

const STATUS_LIST = ['', 'pending', 'dikonfirmasi', 'permohonan_pembatalan', 'disewa', 'selesai', 'dibatalkan'];

export default function BookingsPage() {
  const [bookings, setBookings]     = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [status, setStatus]         = useState('');
  const [page, setPage]             = useState(1);

  useEffect(() => { fetchBookings(); }, [search, status, page]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, size: 10 });
      if (search) p.set('search', search);
      if (status) p.set('status', status);
      const res = await api.get(`/bookings?${p}`);
      setBookings(res.data.data);
      setPagination(res.data.pagination);
    } catch {}
    setLoading(false);
  };

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        <div className="page-header">
          <div>
            <h1 className="page-title">Booking Saya</h1>
            <p className="page-subtitle">Kelola semua transaksi penyewaan alat</p>
          </div>
          <Link to="/alat" className="btn-primary"><Plus className="h-4 w-4" /> Booking Baru</Link>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input className="input-field pl-10" placeholder="Cari kode booking..." value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <select className="input-field sm:w-44" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
            {STATUS_LIST.map(s => <option key={s} value={s}>{s || 'Semua Status'}</option>)}
          </select>
        </div>

        {loading ? <LoadingSpinner className="py-16" /> : (
          <>
            {bookings.length === 0 ? (
              <div className="card text-center py-14">
                <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <ShoppingCart className="h-7 w-7 text-gray-400" />
                </div>
                <p className="text-gray-600 font-semibold">Belum ada booking</p>
                <p className="text-gray-400 text-sm mt-1 mb-4">Mulai sewa alat untuk melihat riwayat di sini</p>
                <Link to="/alat" className="btn-primary inline-flex">
                  <ShoppingCart className="h-4 w-4" /> Sewa Sekarang
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {bookings.map(b => (
                  <Link key={b.id} to={`/bookings/${b.id}`}
                    className="card-hover flex items-center gap-4 block">
                    <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                      <ShoppingCart className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-gray-900">{b.kode_booking}</p>
                        <span className={`badge-${b.status}`}>{b.status}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(b.tanggal_mulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} —{' '}
                        {new Date(b.tanggal_selesai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {' · '}{b.details?.length || 0} item
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right hidden sm:block">
                        <p className="font-bold text-gray-900 text-sm">Rp {Number(b.total_harga).toLocaleString('id-ID')}</p>
                        <p className="text-xs text-gray-400">{new Date(b.tanggal_booking).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-300" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
            <Pagination pagination={pagination} onPageChange={setPage} />
          </>
        )}
      </div>
    </AppLayout>
  );
}
