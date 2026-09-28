import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import api, { IMAGE_BASE } from '../../lib/api';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Search, Filter, ShoppingCart, Plus, Minus, Wrench, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AlatPage() {
  const navigate = useNavigate();
  const [alat, setAlat]             = useState([]);
  const [kategori, setKategori]     = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [selKat, setSelKat]         = useState('');
  const [page, setPage]             = useState(1);
  const [cart, setCart]             = useState({});

  useEffect(() => { api.get('/kategori-alat?size=100').then(r => setKategori(r.data.data)).catch(() => {}); }, []);
  useEffect(() => { fetchAlat(); }, [search, selKat, page]);

  const fetchAlat = async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, size: 12, status: 'tersedia' });
      if (search) p.set('search', search);
      if (selKat) p.set('kategori_id', selKat);
      const res = await api.get(`/alat?${p}`);
      setAlat(res.data.data);
      setPagination(res.data.pagination);
    } catch {}
    setLoading(false);
  };

  const updateCart = (id, delta, max) => {
    setCart(prev => {
      const cur  = prev[id] || 0;
      const next = Math.max(0, Math.min(max, cur + delta));
      if (next === 0) { const u = { ...prev }; delete u[id]; return u; }
      return { ...prev, [id]: next };
    });
  };

  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);
  const goToBooking = () => {
    if (totalItems === 0) return toast.error('Pilih alat terlebih dahulu');
    navigate('/bookings/baru', { state: { items: Object.entries(cart).map(([id, qty]) => ({ alat_id: parseInt(id), qty })), alat } });
  };

  const resetFilters = () => { setSearch(''); setSelKat(''); setPage(1); };

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        <div className="page-header">
          <div>
            <h1 className="page-title">Katalog Alat Sewa</h1>
            <p className="page-subtitle">Pilih alat yang ingin kamu sewa, tambahkan ke keranjang</p>
          </div>
          {totalItems > 0 && (
            <button onClick={goToBooking} className="btn-primary relative">
              <ShoppingCart className="h-4 w-4" />
              Booking Sekarang
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {totalItems}
              </span>
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input className="input-field pl-10" placeholder="Cari nama alat, merek, kode..." value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <div className="relative sm:w-52">
            <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select className="input-field pl-10" value={selKat} onChange={e => { setSelKat(e.target.value); setPage(1); }}>
              <option value="">Semua Kategori</option>
              {kategori.map(k => <option key={k.id} value={k.id}>{k.nama_kategori}</option>)}
            </select>
          </div>
          {(search || selKat) && (
            <button onClick={resetFilters} className="btn-ghost flex-shrink-0"><X className="h-4 w-4" /> Reset</button>
          )}
        </div>

        {/* Cart Summary Bar */}
        {totalItems > 0 && (
          <div className="bg-indigo-600 rounded-2xl p-4 flex items-center justify-between text-white animate-slide-up">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <ShoppingCart className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">{totalItems} item dipilih</p>
                <p className="text-indigo-200 text-xs">{Object.keys(cart).length} jenis alat</p>
              </div>
            </div>
            <button onClick={goToBooking} className="bg-white text-indigo-700 font-semibold text-sm px-4 py-2 rounded-xl hover:bg-indigo-50 transition-colors">
              Lanjut Booking →
            </button>
          </div>
        )}

        {/* Grid */}
        {loading ? <LoadingSpinner className="py-16" /> : alat.length === 0 ? (
          <div className="text-center py-16 card">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Wrench className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-gray-600 font-medium">Tidak ada alat ditemukan</p>
            <p className="text-gray-400 text-sm mt-1">Coba ubah filter atau kata pencarian</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {alat.map(item => {
              const sisaStok = item.stok_tersedia !== undefined ? item.stok_tersedia : item.stok;
              return (
                <AlatCard key={item.id} alat={item} qty={cart[item.id] || 0} sisaStok={sisaStok}
                  onAdd={() => updateCart(item.id, 1, sisaStok)}
                  onRemove={() => updateCart(item.id, -1, sisaStok)} />
              );
            })}
          </div>
        )}
        <Pagination pagination={pagination} onPageChange={setPage} />
      </div>
    </AppLayout>
  );
}

function AlatCard({ alat, qty, sisaStok, onAdd, onRemove }) {
  const selected = qty > 0;
  const isOutOfStock = sisaStok <= 0;

  return (
    <div className={`bg-white rounded-2xl border overflow-hidden hover:shadow-lg transition-all duration-200 group ${selected ? 'border-indigo-300 shadow-md shadow-indigo-100' : 'border-gray-100 shadow-sm'}`}>
      <div className="relative h-44 bg-gradient-to-br from-gray-100 to-gray-50 overflow-hidden">
        {alat.gambar ? (
          <img src={`${IMAGE_BASE}/${alat.gambar}`} alt={alat.nama_alat}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={e => { e.target.style.display = 'none'; }} />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <Wrench className="h-10 w-10 text-gray-300" />
            <span className="text-xs text-gray-400">No Image</span>
          </div>
        )}
        <div className="absolute top-3 left-3">
          <span className="bg-white/90 backdrop-blur-sm text-xs font-semibold text-gray-700 px-2.5 py-1 rounded-full shadow-sm">
            {alat.kategori?.nama_kategori}
          </span>
        </div>
        {sisaStok > 0 && sisaStok <= 3 && (
          <div className="absolute top-3 right-3">
            <span className="bg-amber-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow">
              Sisa {sisaStok}
            </span>
          </div>
        )}
        {isOutOfStock && (
          <div className="absolute top-3 right-3">
            <span className="bg-rose-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow">
              Habis Tersewa
            </span>
          </div>
        )}
        {selected && (
          <div className="absolute inset-0 bg-indigo-600/10 flex items-center justify-center">
            <div className="bg-indigo-600 text-white text-lg font-bold w-10 h-10 rounded-full flex items-center justify-center shadow-lg">
              {qty}
            </div>
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-gray-900 text-sm line-clamp-1">{alat.nama_alat}</h3>
        <p className="text-xs text-gray-400 mt-0.5">{alat.merek || alat.kode_alat}</p>
        <div className="flex items-center justify-between mt-3">
          <div>
            {alat.harga_sewa != null && !isNaN(Number(alat.harga_sewa)) && Number(alat.harga_sewa) > 0 && (
              <p className="text-base font-bold text-indigo-600">Rp {Number(alat.harga_sewa).toLocaleString('id-ID')}</p>
            )}
            <p className="text-xs text-gray-400">
              {alat.harga_sewa != null && !isNaN(Number(alat.harga_sewa)) && Number(alat.harga_sewa) > 0 ? '/hari · ' : ''}
              <strong className={sisaStok > 0 ? "text-emerald-700 font-bold" : "text-rose-600 font-bold"}>{sisaStok} tersedia</strong> (Total: {alat.stok || 0})
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {qty > 0 ? (
              <>
                <button onClick={onRemove} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors cursor-pointer">
                  <Minus className="h-3.5 w-3.5 text-gray-600" />
                </button>
                <span className="w-6 text-center text-sm font-bold text-gray-900">{qty}</span>
                <button onClick={onAdd} disabled={qty >= sisaStok} className="w-8 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center transition-colors disabled:opacity-40 cursor-pointer">
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <button onClick={onAdd} disabled={isOutOfStock} className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed cursor-pointer">
                <Plus className="h-3.5 w-3.5" /> {isOutOfStock ? 'Habis' : 'Pilih'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
