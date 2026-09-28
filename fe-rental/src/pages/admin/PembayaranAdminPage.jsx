import { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import api, { IMAGE_BASE } from '../../lib/api';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { CreditCard, Eye, CheckCircle, XCircle, Search, Download } from 'lucide-react';
import toast from 'react-hot-toast';

const METODE = { transfer: 'Transfer Bank', tunai: 'Tunai', qris: 'QRIS', kartu_kredit: 'Kartu Kredit' };

export default function PembayaranAdminPage() {
  const [data, setData]             = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [page, setPage]             = useState(1);
  const [filterStatus, setFilter]   = useState('');
  const [detail, setDetail]         = useState({ open: false, item: null });
  const [konfirm, setKonfirm]       = useState({ open: false, id: null, status: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchData(); }, [page, filterStatus]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, size: 10 });
      if (filterStatus) p.set('status', filterStatus);
      const res = await api.get(`/pembayaran?${p}`);
      setData(res.data.data);
      setPagination(res.data.pagination);
    } catch {}
    setLoading(false);
  };

  const handleKonfirmasi = async () => {
    if (konfirm.status === 'gagal' && !konfirm.reason.trim()) {
      toast.error('Alasan penolakan wajib diisi');
      return;
    }
    setSubmitting(true);
    try {
      await api.patch(`/pembayaran/${konfirm.id}/konfirmasi`, {
        status: konfirm.status,
        alasan_penolakan: konfirm.status === 'gagal' ? konfirm.reason : undefined,
      });
      toast.success('Pembayaran berhasil diselesaikan');
      setKonfirm({ open: false, id: null, status: '', reason: '' });
      setDetail({ open: false, item: null });
      await fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Terdapat masalah saat memperbarui pembayaran');
    }
    setSubmitting(false);
  };

  const openDetail = async (id) => {
    try { const r = await api.get(`/pembayaran/${id}`); setDetail({ open: true, item: r.data.data }); } catch {}
  };

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
    } catch (err) { toast.error('Gagal download'); }
  };

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        <div className="flex items-start gap-4">
          <div>
            <h1 className="page-title">Manajemen Pembayaran</h1>
            <p className="page-subtitle">Verifikasi dan konfirmasi pembayaran pelanggan</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => downloadExport('/pembayaran/export/excel', `pembayaran_${Date.now()}.xlsx`)} className="btn-ghost"><Download className="h-4 w-4" /> XLSX</button>
            <button onClick={() => downloadExport('/pembayaran/export/pdf', `pembayaran_${Date.now()}.pdf`)} className="btn-ghost"><Download className="h-4 w-4" /> PDF</button>
          </div>
        </div>

        <div className="card p-0 overflow-hidden">
          <div className="flex items-center gap-3 p-4 border-b border-gray-100">
            <select className="input-field w-44" value={filterStatus} onChange={e => { setFilter(e.target.value); setPage(1); }}>
              <option value="">Semua Status</option>
              <option value="menunggu">Menunggu</option>
              <option value="lunas">Lunas</option>
              <option value="gagal">Gagal</option>
            </select>
            <p className="text-sm text-gray-500 ml-auto">
              {data.filter(d => d.status === 'menunggu').length > 0 && (
                <span className="text-amber-600 font-semibold">{data.filter(d => d.status === 'menunggu').length} menunggu konfirmasi</span>
              )}
            </p>
          </div>

          {loading ? <LoadingSpinner className="py-12" /> : data.length === 0 ? (
            <div className="text-center py-14">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <CreditCard className="h-7 w-7 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">Tidak ada data pembayaran</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-slate-50">
                    <th className="table-header">Booking</th>
                    <th className="table-header">Customer</th>
                    <th className="table-header">Metode</th>
                    <th className="table-header">Jumlah</th>
                    <th className="table-header">Tanggal</th>
                    <th className="table-header">Status</th>
                    <th className="table-header text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map(item => (
                    <tr key={item.id} className="table-row">
                      <td className="table-cell font-semibold text-gray-900">{item.booking?.kode_booking}</td>
                      <td className="table-cell text-gray-600">{item.booking?.user?.nama}</td>
                      <td className="table-cell">
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-lg font-medium">{METODE[item.metode] || item.metode}</span>
                      </td>
                      <td className="table-cell font-semibold text-gray-900">Rp {Number(item.jumlah).toLocaleString('id-ID')}</td>
                      <td className="table-cell text-gray-500 text-xs">{item.tanggal_bayar ? new Date(item.tanggal_bayar).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '–'}</td>
                      <td className="table-cell"><span className={`badge-${item.status}`}>{item.status}</span></td>
                      <td className="table-cell text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openDetail(item.id)} className="btn-ghost p-2 text-gray-500"><Eye className="h-4 w-4" /></button>
                          {item.status === 'menunggu' && (
                            <>
                              <button onClick={() => setKonfirm({ open: true, id: item.id, status: 'lunas', reason: '' })} className="btn-ghost p-2 text-emerald-600" title="Konfirmasi Lunas"><CheckCircle className="h-4 w-4" /></button>
                              <button onClick={() => setKonfirm({ open: true, id: item.id, status: 'gagal', reason: '' })} className="btn-ghost p-2 text-red-500" title="Tolak"><XCircle className="h-4 w-4" /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="px-4 pb-4"><Pagination pagination={pagination} onPageChange={setPage} /></div>
        </div>

        {/* Detail Modal */}
        <Modal isOpen={detail.open} onClose={() => setDetail({ open: false, item: null })} title="Detail Pembayaran" size="md">
          {detail.item && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['Booking',    detail.item.booking?.kode_booking, true],
                  ['Status',     <span className={`badge-${detail.item.status}`}>{detail.item.status}</span>],
                  ['Customer',   detail.item.booking?.user?.nama],
                  ['Metode',     METODE[detail.item.metode] || detail.item.metode],
                  ['Jumlah',     <span className="font-bold text-indigo-600">Rp {Number(detail.item.jumlah).toLocaleString('id-ID')}</span>],
                  ['Tanggal',    detail.item.tanggal_bayar ? new Date(detail.item.tanggal_bayar).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '–'],
                  detail.item.alasan_penolakan ? ['Alasan Tolak', detail.item.alasan_penolakan] : null,
                ].filter(Boolean).map(([l, v, bold]) => (
                  <div key={l}>
                    <p className="text-xs text-gray-500 mb-0.5">{l}</p>
                    <p className={bold ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}>{v}</p>
                  </div>
                ))}
              </div>

              {detail.item.bukti_bayar ? (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Bukti Pembayaran</p>
                  <a href={`${IMAGE_BASE}/${detail.item.bukti_bayar}`} target="_blank" rel="noreferrer">
                    <img src={`${IMAGE_BASE}/${detail.item.bukti_bayar}`} alt="bukti" className="w-full rounded-xl border border-gray-100 hover:opacity-95 transition-opacity" />
                  </a>
                  <p className="text-xs text-gray-400 mt-1 text-center">Klik untuk perbesar</p>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">
                  <p className="text-sm text-amber-700">Pelanggan belum mengupload bukti pembayaran</p>
                </div>
              )}

              {detail.item.status === 'menunggu' && (
                <div className="flex gap-3 pt-2 border-t border-gray-100">
                  <button onClick={() => setKonfirm({ open: true, id: detail.item.id, status: 'gagal', reason: '' })} className="btn-danger flex-1">
                    <XCircle className="h-4 w-4" /> Tolak
                  </button>
                  <button onClick={() => setKonfirm({ open: true, id: detail.item.id, status: 'lunas', reason: '' })} className="btn-success flex-1">
                    <CheckCircle className="h-4 w-4" /> Konfirmasi Lunas
                  </button>
                </div>
              )}
            </div>
          )}
        </Modal>

        {/* Konfirmasi */}
        <Modal isOpen={konfirm.open} onClose={() => setKonfirm({ open: false, id: null, status: '' })} title="Konfirmasi Pembayaran" size="sm">
          <div className="text-center py-2">
            <div className={`w-16 h-16 ${konfirm.status === 'lunas' ? 'bg-emerald-100' : 'bg-red-100'} rounded-full flex items-center justify-center mx-auto mb-4`}>
              {konfirm.status === 'lunas'
                ? <CheckCircle className="h-8 w-8 text-emerald-600" />
                : <XCircle className="h-8 w-8 text-red-600" />
              }
            </div>
            <p className="text-gray-700 text-sm mb-1">Konfirmasi pembayaran sebagai</p>
            <span className={`badge-${konfirm.status} text-sm px-4 py-1.5`}>{konfirm.status}</span>
            {konfirm.status === 'lunas' && (
              <p className="text-xs text-emerald-600 mt-2">Status booking akan otomatis diubah menjadi "dikonfirmasi"</p>
            )}
            {konfirm.status === 'gagal' && (
              <div className="mt-4 text-left">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Alasan Penolakan</label>
                <textarea
                  value={konfirm.reason}
                  onChange={e => setKonfirm(k => ({ ...k, reason: e.target.value }))}
                  className="input-field w-full resize-none"
                  rows={3}
                  placeholder="Jelaskan alasan pembayaran ditolak"
                />
              </div>
            )}
            <div className="flex gap-3 mt-6">
              <button onClick={() => setKonfirm({ open: false, id: null, status: '', reason: '' })} className="btn-secondary flex-1">Batal</button>
              <button onClick={handleKonfirmasi} disabled={submitting} className={`flex-1 ${konfirm.status === 'lunas' ? 'btn-success' : 'btn-danger'}`}>
                {submitting ? 'Memproses...' : 'Konfirmasi'}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}
