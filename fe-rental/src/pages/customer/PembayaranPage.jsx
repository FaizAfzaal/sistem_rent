import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import api from '../../lib/api';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { CreditCard, Upload } from 'lucide-react';

const METODE = { transfer: 'Transfer Bank', tunai: 'Tunai', qris: 'QRIS', kartu_kredit: 'Kartu Kredit' };

export default function PembayaranPage() {
  const [pembayaran, setPembayaran] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [status, setStatus]         = useState('');
  const [page, setPage]             = useState(1);

  useEffect(() => { fetchData(); }, [status, page]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, size: 10 });
      if (status) p.set('status', status);
      const res = await api.get(`/pembayaran?${p}`);
      setPembayaran(res.data.data);
      setPagination(res.data.pagination);
    } catch {}
    setLoading(false);
  };

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        <div className="page-header">
          <div>
            <h1 className="page-title">Riwayat Pembayaran</h1>
            <p className="page-subtitle">Semua transaksi pembayaran Anda</p>
          </div>
          <select className="input-field w-40" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
            <option value="">Semua Status</option>
            <option value="menunggu">Menunggu</option>
            <option value="lunas">Lunas</option>
            <option value="gagal">Gagal</option>
          </select>
        </div>

        {loading ? <LoadingSpinner className="py-16" /> : (
          <>
            {pembayaran.length === 0 ? (
              <div className="card text-center py-14">
                <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="h-7 w-7 text-gray-400" />
                </div>
                <p className="text-gray-600 font-semibold">Belum ada pembayaran</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pembayaran.map(p => (
                  <div key={p.id} className="card">
                    <div className="flex items-center gap-4">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${p.status === 'lunas' ? 'bg-emerald-50' : p.status === 'gagal' ? 'bg-red-50' : 'bg-amber-50'}`}>
                        <CreditCard className={`h-5 w-5 ${p.status === 'lunas' ? 'text-emerald-600' : p.status === 'gagal' ? 'text-red-500' : 'text-amber-500'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900">{p.booking?.kode_booking}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {METODE[p.metode] || p.metode}
                          {p.tanggal_bayar && ' · ' + new Date(p.tanggal_bayar).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-gray-900">Rp {Number(p.jumlah).toLocaleString('id-ID')}</p>
                        <span className={`badge-${p.status} mt-1`}>{p.status}</span>
                        {p.alasan_penolakan && (
                          <p className="text-xs text-red-600 mt-1">Alasan tolak: {p.alasan_penolakan}</p>
                        )}
                      </div>
                    </div>
                    {p.status === 'menunggu' && !p.bukti_bayar && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <Link to={`/pembayaran/upload/${p.id}`}
                          className="inline-flex items-center gap-2 text-sm text-indigo-600 font-semibold hover:text-indigo-700">
                          <Upload className="h-3.5 w-3.5" /> Upload Bukti Pembayaran
                        </Link>
                      </div>
                    )}
                    {p.bukti_bayar && p.status === 'menunggu' && (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2.5 py-1 rounded-full">⏳ Menunggu verifikasi admin</span>
                      </div>
                    )}
                  </div>
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
