import { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import { useAuth } from '../../contexts/AuthContext';
import api, { IMAGE_BASE } from '../../lib/api';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Plus, Edit2, Trash2, Search, Upload, Wrench, Filter, Download, Package, X } from 'lucide-react';
import toast from 'react-hot-toast';

const KONDISI_OPTS = ['baik', 'rusak_ringan', 'rusak_berat'];
const STATUS_OPTS  = ['tersedia', 'disewa', 'tidak_tersedia'];

export default function AlatAdminPage() {
  const { isKeuangan } = useAuth();
  const [data, setData]             = useState([]);
  const [kategori, setKategori]     = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [page, setPage]             = useState(1);
  const [search, setSearch]         = useState('');
  const [filterKat, setFilterKat]   = useState('');
  const [modal, setModal]           = useState({ open: false, item: null });
  const [delConfirm, setDelConfirm] = useState({ open: false, id: null });
  const [form, setForm]             = useState({ kategori_id: '', nama_alat: '', merek: '', deskripsi: '', harga_sewa: '', stok: '1', kondisi: 'baik', status: 'tersedia' });
  const [kelengkapanList, setKelengkapanList] = useState([]);
  const [newKelengkapanInput, setNewKelengkapanInput] = useState('');
  const [gambarFile, setGambarFile] = useState(null);
  const [preview, setPreview]       = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { api.get('/kategori-alat?size=100').then(r => setKategori(r.data.data)).catch(() => {}); }, []);
  useEffect(() => { fetchData(); }, [page, search, filterKat]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, size: 10 });
      if (search)    p.set('search', search);
      if (filterKat) p.set('kategori_id', filterKat);
      const res = await api.get(`/alat?${p}`);
      setData(res.data.data);
      setPagination(res.data.pagination);
    } catch {}
    setLoading(false);
  };

  const openCreate = () => {
    setForm({ kategori_id: kategori[0]?.id || '', nama_alat: '', merek: '', deskripsi: '', harga_sewa: '', stok: '1', kondisi: 'baik', status: 'tersedia' });
    setKelengkapanList(['Charger', 'Tas', 'Kabel Charger']);
    setNewKelengkapanInput('');
    setGambarFile(null); setPreview(null);
    setModal({ open: true, item: null });
  };
  const openEdit = (item) => {
    setForm({ kategori_id: item.kategori_id, nama_alat: item.nama_alat, merek: item.merek || '', deskripsi: item.deskripsi || '', harga_sewa: item.harga_sewa, stok: item.stok, kondisi: item.kondisi, status: item.status });
    const existingKel = (item.kelengkapan_list || []).map(k => typeof k === 'string' ? k : k.nama_kelengkapan);
    setKelengkapanList(existingKel);
    setNewKelengkapanInput('');
    setGambarFile(null); setPreview(item.gambar ? `${IMAGE_BASE}/${item.gambar}` : null);
    setModal({ open: true, item });
  };

  const handleAddKelengkapan = () => {
    if (!newKelengkapanInput.trim()) return;
    if (kelengkapanList.includes(newKelengkapanInput.trim())) {
      toast.error('Kelengkapan sudah ada dalam daftar');
      return;
    }
    setKelengkapanList(prev => [...prev, newKelengkapanInput.trim()]);
    setNewKelengkapanInput('');
  };

  const handleRemoveKelengkapan = (idx) => {
    setKelengkapanList(prev => prev.filter((_, i) => i !== idx));
  };

  const handleGambar = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setGambarFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v !== '') fd.append(k, v); });
      fd.append('kelengkapan_list', JSON.stringify(kelengkapanList));
      if (gambarFile) fd.append('gambar', gambarFile);
      modal.item
        ? await api.put(`/alat/${modal.item.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        : await api.post('/alat', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(modal.item ? 'Alat diperbarui' : 'Alat ditambahkan');
      setModal({ open: false, item: null });
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal'); }
    setSubmitting(false);
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/alat/${delConfirm.id}`);
      toast.success('Alat dihapus');
      setDelConfirm({ open: false, id: null });
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal menghapus'); }
  };

  const set = k => e => {
    const val = e.target.value;
    setForm(f => {
      const next = { ...f, [k]: val };
      if (k === 'status' && val === 'tersedia') {
        next.kondisi = 'baik';
      } else if (k === 'kondisi' && val === 'baik' && (f.status === 'tidak_tersedia' || f.status === 'MAINTENANCE')) {
        next.status = 'tersedia';
      } else if (k === 'kondisi' && (val === 'rusak_ringan' || val === 'rusak_berat') && f.status === 'tersedia') {
        next.status = 'tidak_tersedia';
      } else if (k === 'status' && val === 'tidak_tersedia' && f.kondisi === 'baik') {
        next.kondisi = 'rusak_ringan';
      }
      return next;
    });
  };

  const kondisiClass = { baik: 'badge-baik', rusak_ringan: 'badge-rusak_ringan', rusak_berat: 'badge-rusak_berat' };
  const statusClass  = { tersedia: 'badge-tersedia', TERSEDIA: 'badge-tersedia', TERSEDIA_KEMBALI: 'badge-tersedia', disewa: 'badge-disewa-alat', tidak_tersedia: 'badge-tidak_tersedia', MAINTENANCE: 'badge-tidak_tersedia' };

  const downloadExport = async (endpoint, filename) => {
    try {
      const res = await api.get(endpoint, { responseType: 'blob' });
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
        <div className="page-header">
          <div>
            <h1 className="page-title">Data Alat</h1>
            <p className="page-subtitle">Kelola inventaris alat yang tersedia untuk disewa</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => downloadExport('/alat/export/excel', `alat_${Date.now()}.xlsx`)} className="btn-ghost"><Download className="h-4 w-4" /> XLSX</button>
            <button onClick={() => downloadExport('/alat/export/pdf', `alat_${Date.now()}.pdf`)} className="btn-ghost"><Download className="h-4 w-4" /> PDF</button>
            {isKeuangan && (
              <button onClick={openCreate} className="btn-primary"><Plus className="h-4 w-4" /> Tambah Alat</button>
            )}
          </div>
        </div>

        <div className="card p-0 overflow-hidden">
          <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-gray-100">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input className="input-field pl-10" placeholder="Cari nama, merek, kode..." value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <div className="relative sm:w-48">
              <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select className="input-field pl-10" value={filterKat} onChange={e => { setFilterKat(e.target.value); setPage(1); }}>
                <option value="">Semua Kategori</option>
                {kategori.map(k => <option key={k.id} value={k.id}>{k.nama_kategori}</option>)}
              </select>
            </div>
          </div>

          {loading ? <LoadingSpinner className="py-12" /> : data.length === 0 ? (
            <div className="text-center py-14">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Wrench className="h-7 w-7 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">Belum ada alat</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-slate-50">
                    <th className="table-header">Alat</th>
                    <th className="table-header">Merek</th>
                    <th className="table-header">Kategori</th>
                    {isKeuangan && <th className="table-header">Harga/Hari</th>}
                    <th className="table-header">Stok</th>
                    <th className="table-header">Kondisi</th>
                    <th className="table-header">Status</th>
                    {isKeuangan && <th className="table-header text-right">Aksi</th>}
                  </tr>
                </thead>
                <tbody>
                  {data.map(item => (
                    <tr key={item.id} className="table-row">
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center">
                            {item.gambar
                              ? <img src={`${IMAGE_BASE}/${item.gambar}`} alt={item.nama_alat} className="w-full h-full object-cover" />
                              : <Wrench className="h-4 w-4 text-gray-400" />
                            }
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{item.nama_alat}</p>
                            <p className="text-xs text-gray-400">{item.kode_alat}</p>
                            {item.kelengkapan_list && item.kelengkapan_list.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {item.kelengkapan_list.map((k, i) => (
                                  <span key={k.id || i} className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-medium border border-indigo-100">
                                    {typeof k === 'string' ? k : k.nama_kelengkapan}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="table-cell text-sm text-gray-700">{item.merek || '-'}</td>
                      <td className="table-cell">
                        <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg font-medium">{item.kategori?.nama_kategori}</span>
                      </td>
                      {isKeuangan && (
                        <td className="table-cell font-semibold text-gray-900">
                          {item.harga_sewa ? `Rp ${Number(item.harga_sewa).toLocaleString('id-ID')}` : '-'}
                        </td>
                      )}
                      <td className="table-cell">
                        <div className="flex flex-col">
                          <span className={`font-extrabold text-sm ${item.stok_tersedia === 0 ? 'text-red-500' : (item.stok_tersedia ?? item.stok) <= 2 ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {item.stok_tersedia !== undefined ? `${item.stok_tersedia} Tersedia` : `${item.stok} Unit`}
                          </span>
                          <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">
                            Total: {item.stok_total ?? item.stok} Unit {item.sedang_rental > 0 ? `(${item.sedang_rental} Disewa)` : ''} {item.unit_maintenance > 0 ? `(${item.unit_maintenance} Maint.)` : ''}
                          </span>
                        </div>
                      </td>
                      <td className="table-cell"><span className={kondisiClass[item.kondisi] || 'badge-baik'}>{item.kondisi?.replace('_', ' ')}</span></td>
                      <td className="table-cell"><span className={statusClass[item.status] || 'badge-tersedia'}>{item.status?.replace('_', ' ')}</span></td>
                      {isKeuangan && (
                        <td className="table-cell text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => openEdit(item)} className="btn-ghost p-2 text-indigo-600"><Edit2 className="h-4 w-4" /></button>
                            <button onClick={() => setDelConfirm({ open: true, id: item.id })} className="btn-ghost p-2 text-red-500"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="px-4 pb-4"><Pagination pagination={pagination} onPageChange={setPage} /></div>
        </div>

        {/* Form Modal */}
        <Modal isOpen={modal.open} onClose={() => setModal({ open: false, item: null })} title={modal.item ? 'Edit Alat' : 'Tambah Alat'} size="lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Gambar */}
            <label className="block cursor-pointer">
              {preview ? (
                <div className="relative group">
                  <img src={preview} alt="preview" className="w-full h-40 object-cover rounded-xl" />
                  <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white text-sm font-medium flex items-center gap-2"><Upload className="h-4 w-4" /> Ganti Gambar</span>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors">
                  <Upload className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 font-medium">Klik untuk upload gambar alat</p>
                  <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP • Maks 5MB</p>
                </div>
              )}
              <input type="file" className="hidden" accept="image/*" onChange={handleGambar} />
            </label>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Kategori</label>
                <select className="input-field" value={form.kategori_id} onChange={set('kategori_id')} required>
                  <option value="">Pilih kategori...</option>
                  {kategori.map(k => <option key={k.id} value={k.id}>{k.nama_kategori}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nama Alat</label>
                <input className="input-field" placeholder="Nama alat..." value={form.nama_alat} onChange={set('nama_alat')} required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Merek <span className="font-normal text-gray-400">(opsional)</span></label>
                <input className="input-field" placeholder="contoh: Bosch, Eiger..." value={form.merek} onChange={set('merek')} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Harga Sewa/Hari (Rp)</label>
                <input type="number" className="input-field" placeholder="0" value={form.harga_sewa} onChange={set('harga_sewa')} required min="0" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Stok</label>
                <input type="number" className="input-field" value={form.stok} onChange={set('stok')} min="0" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Kondisi</label>
                <select className="input-field" value={form.kondisi} onChange={set('kondisi')}>
                  {KONDISI_OPTS.map(o => <option key={o} value={o}>{o.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Status</label>
                <select className="input-field" value={form.status} onChange={set('status')}>
                  {STATUS_OPTS.map(o => <option key={o} value={o}>{o.replace('_', ' ')}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Deskripsi <span className="font-normal text-gray-400">(opsional)</span></label>
              <textarea className="input-field resize-none" rows="2" placeholder="Deskripsi singkat alat ini..." value={form.deskripsi} onChange={set('deskripsi')} />
            </div>

            {/* Section Kelengkapan Alat */}
            <div className="border border-indigo-100 rounded-xl p-4 bg-indigo-50/40 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <Package className="h-4 w-4 text-indigo-600" /> Kelengkapan Alat <span className="text-xs font-medium text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">Master Data</span>
                </label>
                <span className="text-xs text-gray-500 font-medium">{kelengkapanList.length} Items</span>
              </div>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input-field py-1.5 text-xs flex-1 bg-white"
                  placeholder="Tambah item kelengkapan... (Contoh: Charger, Tas, Baterai Cadangan)"
                  value={newKelengkapanInput}
                  onChange={e => setNewKelengkapanInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddKelengkapan(); } }}
                />
                <button type="button" onClick={handleAddKelengkapan} className="btn-primary py-1.5 px-3 text-xs whitespace-nowrap">
                  <Plus className="h-3.5 w-3.5" /> Tambah
                </button>
              </div>

              {kelengkapanList.length === 0 ? (
                <p className="text-xs text-gray-400 italic">Belum ada data kelengkapan untuk alat ini.</p>
              ) : (
                <div className="flex flex-wrap gap-2 pt-1">
                  {kelengkapanList.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 bg-white border border-indigo-200 px-3 py-1 rounded-lg text-xs font-semibold text-indigo-900 shadow-sm">
                      <span>{item}</span>
                      <button type="button" onClick={() => handleRemoveKelengkapan(idx)} className="text-gray-400 hover:text-red-500 transition-colors">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setModal({ open: false, item: null })} className="btn-secondary flex-1">Batal</button>
              <button type="submit" disabled={submitting} className="btn-primary flex-1">
                {submitting ? 'Menyimpan...' : modal.item ? 'Perbarui' : 'Simpan'}
              </button>
            </div>
          </form>
        </Modal>

        <ConfirmDialog isOpen={delConfirm.open} onClose={() => setDelConfirm({ open: false, id: null })}
          onConfirm={handleDelete} title="Hapus Alat"
          message="Alat ini akan dihapus permanen dari sistem. Tindakan ini tidak bisa dibatalkan." />
      </div>
    </AppLayout>
  );
}
