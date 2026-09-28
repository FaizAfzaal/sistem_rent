import { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import api, { IMAGE_BASE } from '../../lib/api';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Camera, Search, Truck, RotateCcw, Image as ImageIcon, Eye, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminReturnDocsPage() {
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  useEffect(() => {
    fetchDocs();
  }, [page, search]);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, size: 10 });
      if (search) p.set('search', search);
      const res = await api.get(`/return/docs?${p}`);
      setData(res.data.data || []);
      setPagination(res.data.pagination);
    } catch {
      toast.error('Gagal mengambil dokumentasi foto barang');
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
    <AppLayout title="Dokumentasi Kondisi Barang (Foto Audit)">
      <div className="animate-fade-in space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center font-bold">
              <Camera className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-gray-900">Dokumentasi Fisik Kondisi Barang</h1>
              <p className="text-xs text-gray-500">Arsip galeri foto kondisi fisik alat saat serah terima pengeluaran dan saat penerimaan pengembalian</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari kode booking..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>
        </div>

        {/* Docs Cards Grid */}
        {loading ? (
          <LoadingSpinner className="py-16" />
        ) : data.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center text-gray-500 text-xs shadow-sm">
            Belum ada foto dokumentasi barang ter-record.
          </div>
        ) : (
          <div className="space-y-6">
            {data.map((b) => {
              const custName = b.customer?.full_name || b.user?.nama || 'Customer';
              const alatNames = b.details?.map(d => d.alat?.nama_alat).filter(Boolean).join(', ') || 'Alat Rental';

              const pickupPhotos = parsePhotos(b.pickup?.pickup_photos);
              const returnPhotos = parsePhotos(b.return?.return_photos);

              return (
                <div key={b.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                    <div>
                      <span className="text-indigo-600 font-mono font-bold text-xs">#{b.kode_booking}</span>
                      <h3 className="font-extrabold text-gray-900 text-sm">{custName} — <span className="text-gray-600 font-normal">{alatNames}</span></h3>
                    </div>
                    <span className="px-3 py-1 bg-slate-100 text-slate-800 rounded-full text-[11px] font-bold">
                      Status: {b.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {/* FOTO SEBELUM KELUAR */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                      <h4 className="font-bold text-indigo-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                        <Truck className="h-4 w-4 text-indigo-600" /> Foto Kondisi Sebelum Keluar (Pickup)
                      </h4>
                      {pickupPhotos.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {pickupPhotos.map((url, idx) => (
                            <div
                              key={idx}
                              onClick={() => setSelectedPhoto(`${IMAGE_BASE}/${url}`)}
                              className="w-20 h-20 rounded-xl overflow-hidden border border-gray-300 bg-white cursor-pointer hover:opacity-90 transition relative group"
                            >
                              <img src={`${IMAGE_BASE}/${url}`} alt="Pickup" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition">
                                <Eye className="h-4 w-4" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-400 italic">Belum ada foto sebelum keluar.</p>
                      )}
                      {b.pickup?.pickup_notes && (
                        <p className="text-[11px] text-amber-900 bg-amber-50 p-2.5 rounded-xl border border-amber-200 italic">
                          Catatan Minus Awal: {b.pickup.pickup_notes}
                        </p>
                      )}
                    </div>

                    {/* FOTO SAAT KEMBALI */}
                    <div className="p-4 bg-white rounded-2xl border border-gray-200 space-y-3">
                      <h4 className="font-bold text-indigo-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                        <RotateCcw className="h-4 w-4 text-indigo-600" /> Foto Kondisi Saat Kembali (Return)
                      </h4>
                      {returnPhotos.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {returnPhotos.map((url, idx) => (
                            <div
                              key={idx}
                              onClick={() => setSelectedPhoto(`${IMAGE_BASE}/${url}`)}
                              className="w-20 h-20 rounded-xl overflow-hidden border border-gray-300 bg-white cursor-pointer hover:opacity-90 transition relative group"
                            >
                              <img src={`${IMAGE_BASE}/${url}`} alt="Return" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition">
                                <Eye className="h-4 w-4" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-400 italic">Belum ada foto pengembalian.</p>
                      )}
                      {b.return?.damage_notes && (
                        <p className="text-[11px] text-rose-900 bg-rose-50 p-2.5 rounded-xl border border-rose-200 font-semibold italic">
                          Catatan Kerusakan: {b.return.damage_notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {pagination && pagination.totalPages > 1 && (
              <div className="p-4 bg-white rounded-2xl border border-gray-100">
                <Pagination page={page} totalPages={pagination.totalPages} onPageChange={setPage} />
              </div>
            )}
          </div>
        )}

        {/* PHOTO PREVIEW MODAL */}
        <Modal
          isOpen={!!selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
          title="PRATINJAU FOTO AUDIT DOKUMENTASI"
          size="md"
        >
          {selectedPhoto && (
            <div className="space-y-4">
              <div className="rounded-2xl overflow-hidden bg-black max-h-[500px] flex items-center justify-center">
                <img src={selectedPhoto} alt="Full Preview" className="max-h-[480px] w-auto object-contain mx-auto" />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => setSelectedPhoto(null)}
                  className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs transition"
                >
                  Tutup Pratinjau
                </button>
              </div>
            </div>
          )}
        </Modal>

      </div>
    </AppLayout>
  );
}
