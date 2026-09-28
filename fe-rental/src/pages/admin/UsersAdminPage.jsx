import { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import api, { IMAGE_BASE } from '../../lib/api';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Plus, Edit2, Trash2, Search, Users, ToggleLeft, ToggleRight, Upload, Download } from 'lucide-react';
import toast from 'react-hot-toast';

export default function UsersAdminPage() {
  const [data, setData]             = useState([]);
  const [roles, setRoles]           = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [page, setPage]             = useState(1);
  const [search, setSearch]         = useState('');
  const [filterStatus, setFilter]   = useState('');
  const [modal, setModal]           = useState({ open: false, item: null });
  const [delConfirm, setDelConfirm] = useState({ open: false, id: null });
  const [form, setForm]             = useState({ nama: '', email: '', password: '', no_hp: '', alamat: '', role_id: '', status: 'aktif' });
  const [fotoFile, setFotoFile]     = useState(null);
  const [fotoPreview, setPreview]   = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { api.get('/roles').then(r => setRoles(r.data.data || [])).catch(() => {}); }, []);
  useEffect(() => { fetchData(); }, [page, search, filterStatus]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, size: 10 });
      if (search)       p.set('search', search);
      if (filterStatus) p.set('status', filterStatus);
      const res = await api.get(`/users?${p}`);
      setData(res.data.data);
      setPagination(res.data.pagination);
    } catch {}
    setLoading(false);
  };

  const openCreate = () => {
    setForm({ nama: '', email: '', password: '', no_hp: '', alamat: '', role_id: roles[1]?.id || roles[0]?.id || '', status: 'aktif' });
    setFotoFile(null); setPreview(null);
    setModal({ open: true, item: null });
  };
  const openEdit = (item) => {
    setForm({ nama: item.nama, email: item.email, password: '', no_hp: item.no_hp || '', alamat: item.alamat || '', role_id: item.role_id, status: item.status });
    setFotoFile(null); setPreview(item.foto ? `${IMAGE_BASE}/${item.foto}` : null);
    setModal({ open: true, item });
  };

  const handleFoto = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFotoFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('nama', form.nama);
      fd.append('email', form.email);
      if (form.password) fd.append('password', form.password);
      fd.append('no_hp', form.no_hp);
      fd.append('alamat', form.alamat);
      fd.append('role_id', form.role_id);
      fd.append('status', form.status);
      if (fotoFile) fd.append('foto', fotoFile);
      modal.item
        ? await api.put(`/users/${modal.item.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        : await api.post('/users', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(modal.item ? 'User diperbarui' : 'User ditambahkan');
      setModal({ open: false, item: null });
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal'); }
    setSubmitting(false);
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/users/${delConfirm.id}`);
      toast.success('User dihapus');
      setDelConfirm({ open: false, id: null });
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal menghapus'); }
  };

  const toggleStatus = async (id) => {
    try {
      await api.patch(`/users/${id}/status`);
      toast.success('Status user diubah');
      fetchData();
    } catch { toast.error('Gagal'); }
  };

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

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
        <div className="page-header">
          <div>
            <h1 className="page-title">Manajemen User</h1>
            <p className="page-subtitle">Kelola akun admin dan pelanggan sistem</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => downloadExport('/users/export/excel', `users_${Date.now()}.xlsx`)} className="btn-ghost"><Download className="h-4 w-4" /> XLSX</button>
            <button onClick={() => downloadExport('/users/export/pdf', `users_${Date.now()}.pdf`)} className="btn-ghost"><Download className="h-4 w-4" /> PDF</button>
            <button onClick={openCreate} className="btn-primary"><Plus className="h-4 w-4" /> Tambah User</button>
          </div>
        </div>

        <div className="card p-0 overflow-hidden">
          <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-gray-100">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input className="input-field pl-10" placeholder="Cari nama, email..." value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <select className="input-field sm:w-40" value={filterStatus} onChange={e => { setFilter(e.target.value); setPage(1); }}>
              <option value="">Semua Status</option>
              <option value="aktif">Aktif</option>
              <option value="nonaktif">Nonaktif</option>
            </select>
          </div>

          {loading ? <LoadingSpinner className="py-12" /> : data.length === 0 ? (
            <div className="text-center py-14">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Users className="h-7 w-7 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">Belum ada user</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-slate-50">
                    <th className="table-header">User</th>
                    <th className="table-header">Role</th>
                    <th className="table-header">No. HP</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Bergabung</th>
                    <th className="table-header text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map(item => (
                    <tr key={item.id} className="table-row">
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full overflow-hidden bg-indigo-100 flex-shrink-0 flex items-center justify-center">
                            {item.foto
                              ? <img src={`${IMAGE_BASE}/${item.foto}`} alt={item.nama} className="w-full h-full object-cover" />
                              : <span className="text-indigo-700 font-bold text-sm">{item.nama?.charAt(0).toUpperCase()}</span>
                            }
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{item.nama}</p>
                            <p className="text-xs text-gray-400">{item.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className={item.role?.nama_role === 'admin' ? 'badge-admin' : 'badge-customer'}>
                          {item.role?.nama_role}
                        </span>
                      </td>
                      <td className="table-cell text-gray-500">{item.no_hp || '–'}</td>
                      <td className="table-cell">
                        <button onClick={() => toggleStatus(item.id)}
                          className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full transition-all ${item.status === 'aktif' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                          {item.status === 'aktif' ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                          {item.status}
                        </button>
                      </td>
                      <td className="table-cell text-gray-400 text-xs">{new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      <td className="table-cell text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(item)} className="btn-ghost p-2 text-indigo-600"><Edit2 className="h-4 w-4" /></button>
                          <button onClick={() => setDelConfirm({ open: true, id: item.id })} className="btn-ghost p-2 text-red-500"><Trash2 className="h-4 w-4" /></button>
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

        {/* Form Modal */}
        <Modal isOpen={modal.open} onClose={() => setModal({ open: false, item: null })} title={modal.item ? 'Edit User' : 'Tambah User'} size="lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl overflow-hidden bg-indigo-100 flex items-center justify-center flex-shrink-0">
                {fotoPreview
                  ? <img src={fotoPreview} alt="preview" className="w-full h-full object-cover" />
                  : <span className="text-2xl font-bold text-indigo-500">{form.nama?.charAt(0)?.toUpperCase() || 'U'}</span>
                }
              </div>
              <label className="cursor-pointer flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-semibold">
                <Upload className="h-4 w-4" />
                {fotoPreview ? 'Ganti foto' : 'Upload foto'}
                <input type="file" accept="image/*" className="hidden" onChange={handleFoto} />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nama Lengkap</label>
                <input className="input-field" value={form.nama} onChange={set('nama')} required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
                <input type="email" className="input-field" value={form.email} onChange={set('email')} required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Password {modal.item && <span className="text-gray-400 font-normal">(kosongkan jika tidak diubah)</span>}
                </label>
                <input type="password" className="input-field" placeholder="Min. 6 karakter"
                  value={form.password} onChange={set('password')} required={!modal.item} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">No. HP</label>
                <input className="input-field" value={form.no_hp} onChange={set('no_hp')} placeholder="Opsional" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Role</label>
                <select className="input-field" value={form.role_id} onChange={set('role_id')} required>
                  <option value="">Pilih role...</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.nama_role}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Status</label>
                <select className="input-field" value={form.status} onChange={set('status')}>
                  <option value="aktif">Aktif</option>
                  <option value="nonaktif">Nonaktif</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Alamat <span className="font-normal text-gray-400">(opsional)</span></label>
              <textarea className="input-field resize-none" rows="2" value={form.alamat} onChange={set('alamat')} />
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
          onConfirm={handleDelete} title="Hapus User"
          message="User ini akan dihapus permanen. Semua data terkait akan ikut terhapus." />
      </div>
    </AppLayout>
  );
}
