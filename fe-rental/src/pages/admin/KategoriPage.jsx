import { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Plus, Edit2, Trash2, Tag } from 'lucide-react';
import toast from 'react-hot-toast';

export default function KategoriPage() {
  const { isKeuangan } = useAuth();
  const [data, setData]             = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [page, setPage]             = useState(1);
  const [modal, setModal]           = useState({ open: false, item: null });
  const [delConfirm, setDelConfirm] = useState({ open: false, id: null });
  const [form, setForm]             = useState({ nama_kategori: '', deskripsi: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchData(); }, [page]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/kategori-alat?page=${page}&size=10`);
      setData(res.data.data);
      setPagination(res.data.pagination);
    } catch {}
    setLoading(false);
  };

  const openCreate = () => { setForm({ nama_kategori: '', deskripsi: '' }); setModal({ open: true, item: null }); };
  const openEdit   = (item) => { setForm({ nama_kategori: item.nama_kategori, deskripsi: item.deskripsi || '' }); setModal({ open: true, item }); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      modal.item
        ? await api.put(`/kategori-alat/${modal.item.id}`, form)
        : await api.post('/kategori-alat', form);
      toast.success(modal.item ? 'Kategori diperbarui' : 'Kategori ditambahkan');
      setModal({ open: false, item: null });
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal'); }
    setSubmitting(false);
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/kategori-alat/${delConfirm.id}`);
      toast.success('Kategori dihapus');
      setDelConfirm({ open: false, id: null });
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal menghapus'); }
  };

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        <div className="page-header">
          <div>
            <h1 className="page-title">Kategori Alat</h1>
            <p className="page-subtitle">Daftar kategori pengelompokan alat</p>
          </div>
          {isKeuangan && (
            <button onClick={openCreate} className="btn-primary"><Plus className="h-4 w-4" /> Tambah Kategori</button>
          )}
        </div>

        <div className="card p-0 overflow-hidden">
          {loading ? <LoadingSpinner className="py-12" /> : data.length === 0 ? (
            <div className="text-center py-14">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Tag className="h-7 w-7 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">Belum ada kategori</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-slate-50">
                    <th className="table-header">#</th>
                    <th className="table-header">Nama Kategori</th>
                    <th className="table-header">Deskripsi</th>
                    <th className="table-header">Dibuat</th>
                    {isKeuangan && <th className="table-header text-right">Aksi</th>}
                  </tr>
                </thead>
                <tbody>
                  {data.map((item, idx) => (
                    <tr key={item.id} className="table-row">
                      <td className="table-cell text-gray-400 text-xs">{(page - 1) * 10 + idx + 1}</td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Tag className="h-3.5 w-3.5 text-indigo-600" />
                          </div>
                          <span className="font-semibold text-gray-900">{item.nama_kategori}</span>
                        </div>
                      </td>
                      <td className="table-cell text-gray-500 max-w-xs truncate">{item.deskripsi || <span className="text-gray-300">–</span>}</td>
                      <td className="table-cell text-gray-400 text-xs">{new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
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

        <Modal isOpen={modal.open} onClose={() => setModal({ open: false, item: null })} title={modal.item ? 'Edit Kategori' : 'Tambah Kategori'} size="sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nama Kategori</label>
              <input className="input-field" placeholder="contoh: Alat Berkemah" value={form.nama_kategori}
                onChange={e => setForm(f => ({ ...f, nama_kategori: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Deskripsi <span className="font-normal text-gray-400">(opsional)</span></label>
              <textarea className="input-field resize-none" rows="3" placeholder="Deskripsi singkat kategori ini..."
                value={form.deskripsi} onChange={e => setForm(f => ({ ...f, deskripsi: e.target.value }))} />
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
          onConfirm={handleDelete} title="Hapus Kategori"
          message="Kategori ini akan dihapus permanen. Pastikan tidak ada alat yang menggunakan kategori ini." />
      </div>
    </AppLayout>
  );
}
