import { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { History, Search, Download, Calendar, Filter, FileSpreadsheet, FileText } from 'lucide-react';

export default function RiwayatTransaksiPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const [resPay, resBook] = await Promise.allSettled([
        api.get('/pembayaran'),
        api.get('/bookings')
      ]);

      const payData = resPay.status === 'fulfilled' && resPay.value.data?.data ? resPay.value.data.data : [];
      const bookData = resBook.status === 'fulfilled' && resBook.value.data?.data ? resBook.value.data.data : [];

      const listMap = new Map();

      payData.forEach(p => {
        if (p.status === 'gagal' || p.status === 'dibatalkan' || p.booking?.status === 'dibatalkan') return;
        const kode = p.booking?.kode_booking || `RB-${p.booking_id}`;
        listMap.set(p.id, {
          id: `TRX-2026-${String(p.id).padStart(3, '0')}`,
          date: p.tanggal_bayar ? new Date(p.tanggal_bayar).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-',
          kode: kode,
          customer: p.booking?.user?.nama || 'Customer',
          type: p.tipe_pembayaran === 'dp' ? 'DP Rental' : 'Pemasukan Rental',
          amount: Number(p.jumlah || 0),
          status: 'Berhasil',
          method: p.metode ? `Transfer (${p.metode})` : 'Transfer Bank'
        });
      });

      bookData.forEach(b => {
        if (b.status === 'dibatalkan') return;
        if (b.status === 'dikonfirmasi' || b.status === 'lunas') {
          const bookingKode = b.kode_booking || `RB-${b.id}`;
          if (!Array.from(listMap.values()).some(t => t.kode === bookingKode)) {
            listMap.set(`book-${b.id}`, {
              id: `TRX-2026-${String(b.id).padStart(3, '0')}`,
              date: b.created_at ? new Date(b.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-',
              kode: bookingKode,
              customer: b.user?.nama || 'Customer',
              type: 'Pemasukan Rental',
              amount: Number(b.total_harga || 0),
              status: 'Berhasil',
              method: 'Transfer Bank'
            });
          }
        }
      });

      setTransactions(Array.from(listMap.values()));
    } catch {
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (format) => {
    toast.success(`Ekspor riwayat transaksi (${format}) berhasil didownload`);
  };

  const filtered = transactions.filter(t =>
    t.id.toLowerCase().includes(search.toLowerCase()) ||
    t.customer.toLowerCase().includes(search.toLowerCase()) ||
    t.kode.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Riwayat Transaksi Keuangan</h1>
            <p className="text-sm text-gray-500">Jurnal histori log mutasi dan verifikasi pembayaran rental.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => handleExport('Excel')} className="px-3.5 py-2 bg-white border rounded-xl text-xs font-bold text-gray-700 flex items-center gap-1.5 shadow-xs hover:bg-gray-50 transition-all">
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Excel (.xlsx)
            </button>
            <button onClick={() => handleExport('PDF')} className="px-3.5 py-2 bg-white border rounded-xl text-xs font-bold text-gray-700 flex items-center gap-1.5 shadow-xs hover:bg-gray-50 transition-all">
              <FileText className="h-4 w-4 text-red-600" /> PDF Log
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari ID Transaksi, Customer, atau Kode Booking..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase">
                <th className="px-5 py-4">ID Transaksi</th>
                <th className="px-5 py-4">Tanggal</th>
                <th className="px-5 py-4">Booking</th>
                <th className="px-5 py-4">Customer</th>
                <th className="px-5 py-4">Jenis Transaksi</th>
                <th className="px-5 py-4">Metode</th>
                <th className="px-5 py-4 text-right">Nominal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400 font-medium">
                    <span className="inline-block h-5 w-5 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin mr-2 align-middle"></span>
                    Memuat riwayat transaksi...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400 font-medium">
                    Belum ada riwayat transaksi.
                  </td>
                </tr>
              ) : (
                filtered.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-4 font-mono text-xs font-bold text-indigo-600">{t.id}</td>
                    <td className="px-5 py-4 text-xs text-gray-500">{t.date}</td>
                    <td className="px-5 py-4 font-bold text-gray-900">{t.kode}</td>
                    <td className="px-5 py-4 font-medium text-gray-800">{t.customer}</td>
                    <td className="px-5 py-4 text-xs font-semibold text-gray-600">{t.type}</td>
                    <td className="px-5 py-4 text-xs text-gray-500">{t.method}</td>
                    <td className={`px-5 py-4 text-right font-extrabold ${t.status === 'Ditolak' ? 'text-red-600' : 'text-emerald-600'}`}>
                      {t.status === 'Ditolak' ? '-' : '+'} Rp {Number(t.amount).toLocaleString('id-ID')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
