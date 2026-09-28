import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import api, { IMAGE_BASE } from '../../lib/api';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import RentalTimeline from '../../components/common/RentalTimeline';
import {
  History, Search, Truck, RotateCcw, CheckCircle2, AlertTriangle, Eye, Image as ImageIcon, Package
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminHistoryPage() {
  const location = useLocation();
  const isReturnHistory = location.pathname.includes('/return/history');

  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [detailModal, setDetailModal] = useState({ open: false, booking: null });

  useEffect(() => {
    fetchData();
  }, [page, search, location.pathname]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, size: 10 });
      if (search) p.set('search', search);

      const endpoint = isReturnHistory ? `/return/history?${p}` : `/pickup/history?${p}`;
      const res = await api.get(endpoint);
      setData(res.data.data || []);
      setPagination(res.data.pagination);
    } catch {
      toast.error('Gagal mengambil riwayat transaksi');
    }
    setLoading(false);
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

  return (
    <AppLayout title={isReturnHistory ? 'Riwayat Pengembalian Barang' : 'Riwayat Pengeluaran Barang'}>
      <div className="animate-fade-in space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center font-bold">
              <History className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-gray-900">
                {isReturnHistory ? 'Riwayat Pengembalian Barang' : 'Riwayat Pengeluaran Barang'}
              </h1>
              <p className="text-xs text-gray-500">
                {isReturnHistory ? 'Log arsip penerimaan pengembalian alat dari customer' : 'Log arsip pengeluaran alat berat ke customer'}
              </p>
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

        {/* History Table */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <LoadingSpinner className="py-16" />
          ) : data.length === 0 ? (
            <div className="p-12 text-center text-gray-500 text-xs">
              Belum ada riwayat transaksi.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-4">Nomor Booking</th>
                    <th className="px-5 py-4">Customer</th>
                    <th className="px-5 py-4">Alat</th>
                    <th className="px-5 py-4">Tgl Pengeluaran</th>
                    <th className="px-5 py-4">Tgl Pengembalian</th>
                    <th className="px-5 py-4">Status Workflow</th>
                    <th className="px-5 py-4 text-center">Audit Log</th>
                  </tr>
                </thead>
                <tbody className="font-medium">
                  {data.map((b, bIdx) => {
                    const custName = b.customer?.full_name || b.user?.nama || b.pengambil_nama || 'Customer';
                    const isLastCustomer = bIdx === data.length - 1;

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
                        <td className="px-5 py-6 font-extrabold text-gray-900 align-top">
                          <div className="space-y-0.5">
                            <div className="text-sm text-gray-900 font-extrabold">{custName}</div>
                            <div className="text-[11px] text-gray-500 font-normal">{b.customer?.phone || b.user?.no_hp || '-'}</div>
                          </div>
                        </td>
                        <td className="px-5 py-6 text-gray-700 font-medium align-top">
                          <div className="space-y-2 pl-3 border-l-2 border-indigo-200">
                            {b.details?.map((d, idx) => {
                              const pTx = d.pickup || d.pickups?.[0];
                              const rTx = d.return || d.returns?.[0];

                              let itemStatusBadge = <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded font-bold text-[10px]">WAITING_PICKUP</span>;
                              if (['BARANG_SEDANG_DISEWA', 'RENTED', 'SEDANG_DISEWA'].includes(d.status)) {
                                itemStatusBadge = <span className="px-2 py-0.5 bg-indigo-600 text-white rounded font-bold text-[10px]">BARANG_SEDANG_DISEWA</span>;
                              } else if (['SELESAI_DISEWA', 'COMPLETED', 'selesai'].includes(d.status)) {
                                itemStatusBadge = <span className="px-2 py-0.5 bg-emerald-600 text-white rounded font-bold text-[10px]">SELESAI_DISEWA</span>;
                              }

                              return (
                                <div key={d.id || idx} className="p-3 bg-slate-50/90 rounded-2xl border border-slate-200 text-xs space-y-1.5 shadow-2xs">
                                  <div className="flex items-center justify-between font-extrabold text-gray-900 gap-2">
                                    <span>{idx + 1}. {d.alat?.nama_alat || 'Alat'} ({d.qty} Unit)</span>
                                    {itemStatusBadge}
                                  </div>
                                  <div className="text-[11px] text-gray-600 space-y-0.5 font-normal">
                                    <div>📅 Tgl Rental: <strong className="text-gray-900">{d.tanggal_mulai} s/d {d.tanggal_selesai}</strong></div>
                                    {pTx ? (
                                      <div>🚚 Keluar: <strong className="text-indigo-800 font-bold">{pTx.pickup_date} {pTx.pickup_time} WIB</strong> <span className="text-gray-500">({pTx.approved_by || 'Admin'})</span></div>
                                    ) : (
                                      <div>🚚 Keluar: <span className="text-gray-400 italic">Belum keluar</span></div>
                                    )}
                                    {rTx ? (
                                      <div>🏁 Kembali: <strong className="text-emerald-700 font-bold">{rTx.return_date} {rTx.return_time} WIB</strong> <span className="text-gray-500">({rTx.approved_by || 'Admin'})</span></div>
                                    ) : (
                                      <div>🏁 Kembali: <span className="text-gray-400 italic">Belum kembali</span></div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-5 py-6 text-gray-600 align-top">
                          {b.pickup?.pickup_date || b.tanggal_mulai}
                        </td>
                        <td className="px-5 py-6 text-gray-600 align-top">
                          {b.return?.return_date || b.tanggal_selesai}
                        </td>
                        <td className="px-5 py-6 align-top">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                            b.status === 'SELESAI_DISEWA' || b.status === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800'
                              : b.status === 'PARTIAL_PICKUP' || b.status === 'PARTIAL_RETURN'
                              ? 'bg-blue-100 text-blue-800 font-black'
                              : 'bg-indigo-100 text-indigo-800'
                          }`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="px-5 py-6 text-center align-top">
                          <button
                            onClick={() => setDetailModal({ open: true, booking: b })}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold transition text-xs flex items-center gap-1 mx-auto cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5 text-indigo-600" /> Audit Log
                          </button>
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

        {/* AUDIT LOG MODAL */}
        <Modal
          isOpen={detailModal.open}
          onClose={() => setDetailModal({ open: false, booking: null })}
          title={`RIWAYAT AUDIT LOG (#${detailModal.booking?.kode_booking})`}
          size="lg"
        >
          {detailModal.booking && (
            <div className="space-y-6 text-xs">
              <RentalTimeline status={detailModal.booking.status} />

              {/* DAFTAR ALAT YANG DISEWA */}
              {detailModal.booking.details?.length > 0 && (
                <div className="bg-indigo-50/70 p-4 rounded-2xl border border-indigo-100 space-y-2.5">
                  <h4 className="font-extrabold text-indigo-950 uppercase tracking-wider text-xs border-b border-indigo-200 pb-2 flex items-center gap-2">
                    <Package className="h-4 w-4 text-indigo-600" /> Daftar Alat Yang Disewa ({detailModal.booking.details.length} Item)
                  </h4>
                  <div className="space-y-2">
                    {detailModal.booking.details.map((d, idx) => (
                      <div key={d.id || idx} className="p-3 bg-white rounded-xl border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-gray-900">{idx + 1}. {d.alat?.nama_alat}</span>
                            <span className="font-mono text-indigo-600 font-bold">({d.alat?.kode_alat || 'ALT'})</span>
                          </div>
                          <p className="text-[11px] text-gray-600 mt-0.5">
                            Tanggal Rental: <strong className="text-gray-900">{d.tanggal_mulai || detailModal.booking.tanggal_mulai} s/d {d.tanggal_selesai || detailModal.booking.tanggal_selesai}</strong>
                          </p>
                          <p className="text-[11px] text-indigo-700 font-semibold mt-0.5">
                            Waktu: <strong className="text-indigo-900">{d.jam_mulai || '08:00'} WIB</strong> – <strong className="text-indigo-900">{d.jam_selesai || '17:00'} WIB</strong>
                          </p>
                          {d.kelengkapan && (
                            <p className="text-[11px] text-slate-500 italic mt-0.5">
                              Kelengkapan: {d.kelengkapan}
                            </p>
                          )}
                        </div>
                        <div className="text-right flex sm:flex-col justify-between sm:justify-end items-end gap-1">
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-md font-bold text-[11px]">
                            {d.qty || 1} Unit
                          </span>
                          <span className="font-black text-emerald-700">
                            Rp {Number(d.subtotal || 0).toLocaleString('id-ID')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SERAH TERIMA PENGELUARAN */}
              {detailModal.booking.pickup && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <h4 className="font-extrabold text-indigo-900 uppercase tracking-wider text-xs border-b border-slate-200 pb-2 flex items-center gap-2">
                    <Truck className="h-4 w-4" /> Log Pengeluaran Barang
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-gray-700">
                    <p><span className="text-gray-500">Pengambil:</span> <strong>{detailModal.booking.pickup.pickup_name} ({detailModal.booking.pickup.pickup_phone})</strong></p>
                    <p><span className="text-gray-500">Tanggal/Jam:</span> <strong>{detailModal.booking.pickup.pickup_date} {detailModal.booking.pickup.pickup_time}</strong></p>
                    <p><span className="text-gray-500">Kondisi:</span> <strong className={detailModal.booking.pickup.condition_status === 'baik' ? 'text-emerald-600' : 'text-amber-600'}>{detailModal.booking.pickup.condition_status}</strong></p>
                  </div>
                  {detailModal.booking.pickup.pickup_notes && (
                    <p className="p-2 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 italic">Catatan: {detailModal.booking.pickup.pickup_notes}</p>
                  )}
                  <div className="flex gap-2">
                    {parsePhotos(detailModal.booking.pickup.pickup_photos).map((p, i) => (
                      <a key={i} href={`${IMAGE_BASE}/${p}`} target="_blank" rel="noreferrer" className="w-16 h-16 rounded-lg overflow-hidden border border-gray-300">
                        <img src={`${IMAGE_BASE}/${p}`} alt="Pickup" className="w-full h-full object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* SERAH TERIMA PENGEMBALIAN */}
              {detailModal.booking.return && (
                <div className="bg-white p-4 rounded-2xl border border-gray-200 space-y-3">
                  <h4 className="font-extrabold text-indigo-900 uppercase tracking-wider text-xs border-b border-gray-200 pb-2 flex items-center gap-2">
                    <RotateCcw className="h-4 w-4" /> Log Penerimaan Pengembalian
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-gray-700">
                    <p><span className="text-gray-500">Pengembali:</span> <strong>{detailModal.booking.return.return_name} ({detailModal.booking.return.return_phone})</strong></p>
                    <p><span className="text-gray-500">Tanggal/Jam:</span> <strong>{detailModal.booking.return.return_date} {detailModal.booking.return.return_time}</strong></p>
                    <p><span className="text-gray-500">Pemeriksaan Kerusakan:</span> <strong className={detailModal.booking.return.damage_status === 'sesuai_awal' ? 'text-emerald-600' : 'text-rose-600'}>{detailModal.booking.return.damage_status}</strong></p>
                  </div>
                  {detailModal.booking.return.damage_notes && (
                    <p className="p-2 bg-rose-50 rounded-lg border border-rose-200 text-rose-900 italic font-semibold">Catatan Kerusakan: {detailModal.booking.return.damage_notes}</p>
                  )}
                  <div className="flex gap-2">
                    {parsePhotos(detailModal.booking.return.return_photos).map((p, i) => (
                      <a key={i} href={`${IMAGE_BASE}/${p}`} target="_blank" rel="noreferrer" className="w-16 h-16 rounded-lg overflow-hidden border border-gray-300">
                        <img src={`${IMAGE_BASE}/${p}`} alt="Return" className="w-full h-full object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setDetailModal({ open: false, booking: null })}
                  className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition"
                >
                  Tutup Audit Log
                </button>
              </div>
            </div>
          )}
        </Modal>

      </div>
    </AppLayout>
  );
}
