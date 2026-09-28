import { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import { useAuth } from '../../contexts/AuthContext';
import api, { IMAGE_BASE } from '../../lib/api';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import {
  Edit2, Search, Users, UserPlus, Phone, MapPin, Mail, Eye,
  Building2, FileText, Trash2, RotateCcw, ShieldAlert, CheckCircle2,
  Upload, Image as ImageIcon, X, ShoppingCart, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function CustomerAdminPage() {
  const { isKeuangan } = useAuth();
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [modal, setModal] = useState({ open: false, item: null });
  const [detailModal, setDetailModal] = useState({ open: false, item: null, loading: false });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null });

  // Form State
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    company_name: '',
    identity_type: 'KTP',
    identity_number: '',
    address: '',
    city: '',
    province: '',
    postal_code: '',
    status: 'active',
    notes: '',
  });

  const [identityPhotoFile, setIdentityPhotoFile] = useState(null);
  const [identityPhotoPreview, setIdentityPhotoPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [page, search, statusFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, size: 10 });
      if (search) p.set('search', search);
      if (statusFilter) p.set('status', statusFilter);
      const res = await api.get(`/customers?${p}`);
      setData(res.data.data || []);
      setPagination(res.data.pagination);
    } catch {
      toast.error('Gagal mengambil data customer');
    }
    setLoading(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ukuran foto maksimal 2 MB');
      return;
    }

    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Format gambar harus JPG, JPEG, PNG, atau WEBP');
      return;
    }

    setIdentityPhotoFile(file);
    setIdentityPhotoPreview(URL.createObjectURL(file));
  };

  const openCreate = () => {
    setForm({
      full_name: '',
      phone: '',
      email: '',
      company_name: '',
      identity_type: 'KTP',
      identity_number: '',
      address: '',
      city: '',
      province: '',
      postal_code: '',
      status: 'active',
      notes: '',
    });
    setIdentityPhotoFile(null);
    setIdentityPhotoPreview(null);
    setModal({ open: true, item: null });
  };

  const openEdit = (item) => {
    setForm({
      full_name: item.full_name || '',
      phone: item.phone || '',
      email: item.email || '',
      company_name: item.company_name || '',
      identity_type: item.identity_type || 'KTP',
      identity_number: item.identity_number || '',
      address: item.address || '',
      city: item.city || '',
      province: item.province || '',
      postal_code: item.postal_code || '',
      status: item.status || 'active',
      notes: item.notes || '',
    });
    setIdentityPhotoFile(null);
    setIdentityPhotoPreview(item.identity_photo ? `${IMAGE_BASE}/${item.identity_photo}` : null);
    setModal({ open: true, item });
  };

  const openDetail = async (id) => {
    setDetailModal({ open: true, item: null, loading: true });
    try {
      const res = await api.get(`/customers/${id}`);
      setDetailModal({ open: true, item: res.data.data, loading: false });
    } catch {
      toast.error('Gagal memuat detail customer');
      setDetailModal({ open: false, item: null, loading: false });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name || !form.phone || !form.identity_number || !form.address) {
      return toast.error('Nama lengkap, Nomor HP, Nomor Identitas, dan Alamat wajib diisi');
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('full_name', form.full_name);
      fd.append('phone', form.phone);
      if (form.email) fd.append('email', form.email);
      if (form.company_name) fd.append('company_name', form.company_name);
      fd.append('identity_type', form.identity_type);
      fd.append('identity_number', form.identity_number);
      fd.append('address', form.address);
      if (form.city) fd.append('city', form.city);
      if (form.province) fd.append('province', form.province);
      if (form.postal_code) fd.append('postal_code', form.postal_code);
      fd.append('status', form.status);
      if (form.notes) fd.append('notes', form.notes);

      if (identityPhotoFile) {
        fd.append('identity_photo', identityPhotoFile);
      }

      if (modal.item) {
        await api.put(`/customers/${modal.item.id}`, fd);
        toast.success('Data customer berhasil diperbarui');
      } else {
        await api.post('/customers', fd);
        toast.success('Customer baru berhasil ditambahkan');
      }

      setModal({ open: false, item: null });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan data customer');
    }
    setSubmitting(false);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.item) return;
    try {
      await api.delete(`/customers/${deleteDialog.item.id}`);
      toast.success('Customer berhasil dihapus (soft delete)');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus customer');
    }
    setDeleteDialog({ open: false, item: null });
  };

  const getStatusBadge = (st) => {
    switch (st) {
      case 'active':
        return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold uppercase tracking-wider">Active</span>;
      case 'inactive':
        return <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-bold uppercase tracking-wider">Inactive</span>;
      case 'blacklist':
        return <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-full text-xs font-bold uppercase tracking-wider">Blacklist</span>;
      default:
        return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold uppercase tracking-wider">Active</span>;
    }
  };

  return (
    <AppLayout title="Data Customer">
      <div className="animate-fade-in space-y-6">

        {/* Action Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center font-bold">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-gray-900">Modul Data Customer</h1>
              <p className="text-xs text-gray-500">Kelola identitas customer terdaftar (non-login)</p>
            </div>
          </div>

          {isKeuangan && (
            <button
              onClick={openCreate}
              className="px-5 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-2xl text-xs font-extrabold shadow-lg shadow-indigo-200 transition flex items-center gap-2"
            >
              <UserPlus className="h-4 w-4" /> Tambah Customer Baru
            </button>
          )}
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nama lengkap, kode customer, No. HP, perusahaan, NIK..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Filter Status (Semua)</option>
              <option value="active">Active (Aktif)</option>
              <option value="inactive">Inactive (Nonaktif)</option>
              <option value="blacklist">Blacklist</option>
            </select>
          </div>
        </div>

        {/* Customer Table */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <LoadingSpinner className="py-16" />
          ) : data.length === 0 ? (
            <div className="p-12 text-center text-gray-500 text-xs">
              Tidak ada data customer yang ditemukan.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-4">Kode Customer</th>
                    <th className="px-5 py-4">Nama Lengkap</th>
                    <th className="px-5 py-4">No. HP</th>
                    <th className="px-5 py-4">Email</th>
                    <th className="px-5 py-4">Perusahaan</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {data.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-5 py-4 font-mono font-bold text-indigo-600">
                        {c.customer_code}
                      </td>
                      <td className="px-5 py-4 font-extrabold text-gray-900">
                        {c.full_name}
                      </td>
                      <td className="px-5 py-4 text-gray-700 font-semibold">
                        {c.phone}
                      </td>
                      <td className="px-5 py-4 text-gray-500">
                        {c.email || '-'}
                      </td>
                      <td className="px-5 py-4 text-gray-700 font-medium">
                        {c.company_name || '-'}
                      </td>
                      <td className="px-5 py-4">
                        {getStatusBadge(c.status)}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openDetail(c.id)}
                            className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition"
                            title="Detail Customer"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {isKeuangan && (
                            <>
                              <button
                                onClick={() => openEdit(c)}
                                className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition"
                                title="Edit Customer"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setDeleteDialog({ open: true, item: c })}
                                className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
                                title="Hapus Customer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
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

          {pagination && pagination.totalPages > 1 && (
            <div className="p-4 border-t border-gray-100">
              <Pagination
                page={page}
                totalPages={pagination.totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>

        {/* MODAL TAMBAH / EDIT CUSTOMER */}
        <Modal
          isOpen={modal.open}
          onClose={() => setModal({ open: false, item: null })}
          title={modal.item ? `Edit Customer (${modal.item.customer_code})` : 'Tambah Customer Baru'}
          size="lg"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* Upload Foto Identitas & Preview */}
              <div className="sm:col-span-2 p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
                  Foto Identitas Customer (KTP / SIM / Passport)
                </label>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-24 h-24 rounded-2xl bg-white border border-gray-200 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-inner">
                    {identityPhotoPreview ? (
                      <img src={identityPhotoPreview} alt="Preview Identitas" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-gray-300" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2 text-xs">
                    <input
                      type="file"
                      id="identity-photo-input"
                      accept="image/jpeg,image/png,image/jpg,image/webp"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <label
                      htmlFor="identity-photo-input"
                      className="inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer transition shadow-sm"
                    >
                      <Upload className="h-3.5 w-3.5" /> Pilih File Foto (Maks 2 MB)
                    </label>
                    <p className="text-[11px] text-gray-400">Format diizinkan: JPG, JPEG, PNG, WEBP.</p>
                  </div>
                </div>
              </div>

              {/* Nama Lengkap * */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* No. HP * */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">No. HP / WhatsApp *</label>
                <input
                  type="text"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="Contoh: 081234567890"
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Alamat Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="budi@example.com"
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Nama Perusahaan */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nama Perusahaan (PT/CV)</label>
                <input
                  type="text"
                  value={form.company_name}
                  onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                  placeholder="PT Konstruksi Jaya"
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Jenis Identitas * */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Jenis Identitas *</label>
                <select
                  value={form.identity_type}
                  onChange={(e) => setForm({ ...form, identity_type: e.target.value })}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="KTP">KTP (Kartu Tanda Penduduk)</option>
                  <option value="SIM">SIM (A/C)</option>
                  <option value="PASSPORT">PASSPORT / KITAS</option>
                </select>
              </div>

              {/* Nomor Identitas * */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nomor Identitas *</label>
                <input
                  type="text"
                  required
                  value={form.identity_number}
                  onChange={(e) => setForm({ ...form, identity_number: e.target.value })}
                  placeholder="3171012345670001"
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              {/* Alamat * */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Alamat Lengkap *</label>
                <textarea
                  rows={2}
                  required
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Jl. Merdeka No. 123..."
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Kota */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Kota / Kabupaten</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="Jakarta Selatan"
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Provinsi */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Provinsi</label>
                <input
                  type="text"
                  value={form.province}
                  onChange={(e) => setForm({ ...form, province: e.target.value })}
                  placeholder="DKI Jakarta"
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Kode Pos */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Kode Pos</label>
                <input
                  type="text"
                  value={form.postal_code}
                  onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
                  placeholder="12340"
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Status Customer *</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="active">Active (Aktif)</option>
                  <option value="inactive">Inactive (Nonaktif)</option>
                  <option value="blacklist">Blacklist</option>
                </select>
              </div>

              {/* Catatan */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Catatan Tambahan (Opsional)</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Catatan khusus customer..."
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setModal({ open: false, item: null })}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold transition shadow-md disabled:opacity-50"
              >
                {submitting ? 'Menyimpan...' : 'Simpan Customer'}
              </button>
            </div>
          </form>
        </Modal>

        {/* MODAL DETAIL CUSTOMER */}
        <Modal
          isOpen={detailModal.open}
          onClose={() => setDetailModal({ open: false, item: null, loading: false })}
          title="Profil & Riwayat Customer"
          size="lg"
        >
          {detailModal.loading || !detailModal.item ? (
            <LoadingSpinner className="py-12" />
          ) : (
            <div className="space-y-6 text-xs text-gray-800">
              <div className="flex items-start justify-between border-b border-gray-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-700 font-black text-xl flex items-center justify-center overflow-hidden border border-indigo-200">
                    {detailModal.item.identity_photo ? (
                      <img src={`${IMAGE_BASE}/${detailModal.item.identity_photo}`} alt="Foto Identitas" className="w-full h-full object-cover" />
                    ) : (
                      detailModal.item.full_name?.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <span className="font-mono font-bold text-indigo-600">{detailModal.item.customer_code}</span>
                    <h2 className="text-base font-extrabold text-gray-900">{detailModal.item.full_name}</h2>
                    <p className="text-gray-500 font-semibold">{detailModal.item.company_name || 'Personal Customer'}</p>
                  </div>
                </div>

                <div>{getStatusBadge(detailModal.item.status)}</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-2xl space-y-1">
                  <span className="text-gray-400 font-semibold block">Jenis & No. Identitas</span>
                  <span className="font-bold text-gray-900 font-mono">
                    {detailModal.item.identity_type}: {detailModal.item.identity_number}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl space-y-1">
                  <span className="text-gray-400 font-semibold block">No. HP / WhatsApp</span>
                  <span className="font-bold text-gray-900">{detailModal.item.phone}</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl space-y-1">
                  <span className="text-gray-400 font-semibold block">Alamat Email</span>
                  <span className="font-bold text-gray-900">{detailModal.item.email || '-'}</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl space-y-1">
                  <span className="text-gray-400 font-semibold block">Kota & Provinsi</span>
                  <span className="font-bold text-gray-900">
                    {detailModal.item.city || '-'}, {detailModal.item.province || '-'} {detailModal.item.postal_code || ''}
                  </span>
                </div>

                <div className="sm:col-span-2 p-3 bg-slate-50 rounded-2xl space-y-1">
                  <span className="text-gray-400 font-semibold block">Alamat Lengkap</span>
                  <span className="font-medium text-gray-900">{detailModal.item.address}</span>
                </div>

                {detailModal.item.notes && (
                  <div className="sm:col-span-2 p-3 bg-amber-50 rounded-2xl space-y-1 border border-amber-100 text-amber-900">
                    <span className="font-bold block">Catatan:</span>
                    <span>{detailModal.item.notes}</span>
                  </div>
                )}
              </div>

              {/* Riwayat Booking */}
              <div className="space-y-2 border-t border-gray-100 pt-4">
                <h3 className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                  <ShoppingCart className="h-4 w-4 text-indigo-600" /> Riwayat Booking Customer ({detailModal.item.bookings?.length || 0})
                </h3>
                {detailModal.item.bookings && detailModal.item.bookings.length > 0 ? (
                  <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                    {detailModal.item.bookings.map((b) => (
                      <div key={b.id} className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
                        <div>
                          <span className="font-bold font-mono text-indigo-600">{b.kode_booking}</span>
                          <span className="text-gray-400 ml-2 text-[11px]">
                            {b.tanggal_mulai} s/d {b.tanggal_selesai}
                          </span>
                        </div>
                        {isKeuangan && b.total_harga && (
                          <span className="font-extrabold text-gray-900">
                            Rp {Number(b.total_harga || 0).toLocaleString('id-ID')}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">Belum ada riwayat booking.</p>
                )}
              </div>
            </div>
          )}
        </Modal>

        {/* DELETE CONFIRM DIALOG */}
        <ConfirmDialog
          isOpen={deleteDialog.open}
          onClose={() => setDeleteDialog({ open: false, item: null })}
          onConfirm={handleDeleteConfirm}
          title="Konfirmasi Hapus Customer"
          message={`Apakah Anda yakin ingin menghapus data customer "${deleteDialog.item?.full_name}" (${deleteDialog.item?.customer_code})? Data akan dihapus secara soft-delete.`}
        />

      </div>
    </AppLayout>
  );
}
