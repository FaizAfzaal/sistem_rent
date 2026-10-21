import { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import api, { IMAGE_BASE } from '../../lib/api';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Plus, Edit2, Trash2, Search, Users, ToggleLeft, ToggleRight, Upload, Download, UserCheck, KeyRound, Truck, RotateCcw, ShieldCheck } from 'lucide-react';
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

  const fallbackRoles = [
    { id: 1, nama_role: 'admin' },
    { id: 3, nama_role: 'keuangan' }
  ];

  const allowedRoleNames = ['admin', 'keuangan', 'finance', 'admin_finance', 'admin 1'];

  const activeRoles = (roles.length > 0 ? roles : fallbackRoles).filter(r => 
    allowedRoleNames.includes((r.nama_role || '').toLowerCase())
  );

  useEffect(() => {
    api.get('/roles')
      .then(r => {
        if (r.data?.data && r.data.data.length > 0) {
          setRoles(r.data.data);
        }
      })
      .catch(() => {});
  }, []);
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
    setForm({ nama: '', email: '', password: '', no_hp: '', alamat: '', role_id: activeRoles[0]?.id || 1, status: 'aktif' });
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

  const renderRoleBadge = (roleName) => {
    const r = (roleName || '').toLowerCase();
    if (['keuangan', 'finance', 'admin_finance', 'admin finance'].includes(r)) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs">
          <KeyRound className="w-3.5 h-3.5" />
          User Invoice (Finance)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-xs">
        <UserCheck className="w-3.5 h-3.5" />
        Admin 1 (Operasional)
      </span>
    );
  };

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        <div className="page-header">
          <div>
            <h1 className="page-title">User Management</h1>
            <p className="page-subtitle">Kelola dan buat akun untuk Admin Operasional dan User Invoice (Admin Finance)</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => downloadExport('/users/export/excel', `users_${Date.now()}.xlsx`)} className="btn-ghost"><Download className="h-4 w-4" /> XLSX</button>
            <button onClick={() => downloadExport('/users/export/pdf', `users_${Date.now()}.pdf`)} className="btn-ghost"><Download className="h-4 w-4" /> PDF</button>
            <button onClick={openCreate} className="btn-primary"><Plus className="h-4 w-4" /> Tambah User Baru</button>
          </div>
        </div>

        <div className="card p-0 overflow-hidden">
          <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-gray-100">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input className="input-field pl-10" placeholder="Cari nama, email user..." value={search}
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
              <p className="text-gray-500 font-medium">Belum ada user terdaftar</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-slate-50">
                    <th className="table-header">Informasi User</th>
                    <th className="table-header">Role / Hak Akses</th>
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
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-indigo-100 flex-shrink-0 flex items-center justify-center shadow-xs">
                            {item.foto
                              ? <img src={`${IMAGE_BASE}/${item.foto}`} alt={item.nama} className="w-full h-full object-cover" />
                              : <span className="text-indigo-700 font-black text-sm">{item.nama?.charAt(0).toUpperCase()}</span>
                            }
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{item.nama}</p>
                            <p className="text-xs text-slate-500 font-medium">{item.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        {renderRoleBadge(item.role?.nama_role)}
                      </td>
                      <td className="table-cell text-slate-600 font-medium">{item.no_hp || '–'}</td>
                      <td className="table-cell">
                        <button onClick={() => toggleStatus(item.id)}
                          className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full transition-all cursor-pointer ${item.status === 'aktif' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                          {item.status === 'aktif' ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                          {item.status}
                        </button>
                      </td>
                      <td className="table-cell text-slate-400 text-xs font-medium">{new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      <td className="table-cell text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(item)} className="btn-ghost p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl" title="Edit User"><Edit2 className="h-4 w-4" /></button>
                          <button onClick={() => setDelConfirm({ open: true, id: item.id })} className="btn-ghost p-2 text-rose-500 hover:bg-rose-50 rounded-xl" title="Hapus User"><Trash2 className="h-4 w-4" /></button>
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
        <Modal isOpen={modal.open} onClose={() => setModal({ open: false, item: null })} title={modal.item ? 'Edit Akun User' : 'Tambah Akun User Baru'} size="lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
              <div className="w-14 h-14 rounded-2xl overflow-hidden bg-indigo-100 flex items-center justify-center flex-shrink-0 shadow-xs border border-indigo-200">
                {fotoPreview
                  ? <img src={fotoPreview} alt="preview" className="w-full h-full object-cover" />
                  : <span className="text-xl font-black text-indigo-600">{form.nama?.charAt(0)?.toUpperCase() || 'U'}</span>
                }
              </div>
              <div>
                <label className="cursor-pointer inline-flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-white px-3 py-1.5 rounded-xl border border-indigo-200 shadow-xs transition-colors">
                  <Upload className="h-3.5 w-3.5" />
                  {fotoPreview ? 'Ganti foto profil' : 'Upload foto profil'}
                  <input type="file" accept="image/*" className="hidden" onChange={handleFoto} />
                </label>
                <p className="text-[11px] text-slate-400 mt-1 font-medium">Format: JPG, PNG, WEBP (Maks 2MB)</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Nama Lengkap</label>
                <input className="input-field" value={form.nama} onChange={set('nama')} placeholder="Contoh: Budi Santoso" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Email Registered</label>
                <input type="email" className="input-field" value={form.email} onChange={set('email')} placeholder="nama@email.com" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Kata Sandi {modal.item && <span className="text-slate-400 font-normal lowercase">(kosongkan jika tak diubah)</span>}
                </label>
                <input type="password" className="input-field" placeholder="Minimal 6 karakter"
                  value={form.password} onChange={set('password')} required={!modal.item} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">No. Handphone / WA</label>
                <input className="input-field" value={form.no_hp} onChange={set('no_hp')} placeholder="08xxxxxxxxxx" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Pilih Role Akses</label>
                <select className="input-field font-semibold text-slate-800" value={form.role_id} onChange={set('role_id')} required>
                  <option value="">-- Pilih Hak Akses --</option>
                  {activeRoles.map(r => {
                    let label = r.nama_role;
                    const nameLower = (r.nama_role || '').toLowerCase();
                    if (['keuangan', 'finance', 'admin_finance'].includes(nameLower)) {
                      label = '💼 User Invoice (Admin Finance / Keuangan)';
                    } else {
                      label = '🔑 Admin 1 (Pemesanan, Pengeluaran & Penerimaan)';
                    }

                    return <option key={r.id} value={r.id}>{label}</option>;
                  })}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Status Akun</label>
                <select className="input-field font-semibold text-slate-800" value={form.status} onChange={set('status')}>
                  <option value="aktif">Aktif (Dapat Login)</option>
                  <option value="nonaktif">Nonaktif (Akses Diblokir)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Alamat Lengkap <span className="font-normal text-slate-400 lowercase">(opsional)</span></label>
              <textarea className="input-field resize-none" rows="2" value={form.alamat} onChange={set('alamat')} placeholder="Alamat tinggal atau kantor..." />
            </div>
            <div className="flex gap-3 pt-3">
              <button type="button" onClick={() => setModal({ open: false, item: null })} className="btn-secondary flex-1">Batal</button>
              <button type="submit" disabled={submitting} className="btn-primary flex-1">
                {submitting ? 'Menyimpan...' : modal.item ? 'Perbarui Akun' : 'Simpan Akun Baru'}
              </button>
            </div>
          </form>
        </Modal>

        <ConfirmDialog isOpen={delConfirm.open} onClose={() => setDelConfirm({ open: false, id: null })}
          onConfirm={handleDelete} title="Hapus User"
          message="User ini akan dihapus permanen. Apakah Anda yakin?" />
      </div>
    </AppLayout>
  );
}

