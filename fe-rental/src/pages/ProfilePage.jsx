import { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../contexts/AuthContext';
import api, { IMAGE_BASE } from '../lib/api';
import { User, Camera, Lock, Phone, MapPin, Mail, Eye, EyeOff, CheckCircle, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, refreshProfile } = useAuth();
  const [profile, setProfile]   = useState(null);
  const [editForm, setEditForm] = useState({ nama: '', no_hp: '', alamat: '' });
  const [passForm, setPassForm] = useState({ password_lama: '', password_baru: '', konfirmasi: '' });
  const [fotoFile, setFotoFile] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [loadingProfile, setLP] = useState(false);
  const [loadingPass, setLPass] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [showOld, setShowOld]   = useState(false);
  const [showNew, setShowNew]   = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    api.get('/auth/profile').then(res => {
      const d = res.data.data;
      setProfile(d);
      setEditForm({ nama: d.nama || '', no_hp: d.no_hp || '', alamat: d.alamat || '' });
    }).catch(() => {});
  }, []);

  const handleFoto = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFotoFile(f);
    setFotoPreview(URL.createObjectURL(f));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLP(true);
    try {
      const fd = new FormData();
      fd.append('nama', editForm.nama);
      fd.append('no_hp', editForm.no_hp);
      fd.append('alamat', editForm.alamat);
      if (fotoFile) fd.append('foto', fotoFile);
      await api.put('/auth/profile', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await refreshProfile();
      toast.success('Profil berhasil diperbarui!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal memperbarui profil');
    }
    setLP(false);
  };

  const handlePassSubmit = async (e) => {
    e.preventDefault();
    if (passForm.password_baru !== passForm.konfirmasi) return toast.error('Konfirmasi password tidak cocok');
    if (passForm.password_baru.length < 6) return toast.error('Password baru minimal 6 karakter');
    setLPass(true);
    try {
      await api.put('/auth/change-password', {
        password_lama: passForm.password_lama,
        password_baru: passForm.password_baru,
      });
      toast.success('Password berhasil diubah!');
      setPassForm({ password_lama: '', password_baru: '', konfirmasi: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mengubah password');
    }
    setLPass(false);
  };

  const fotoSrc = fotoPreview || (profile?.foto ? `${IMAGE_BASE}/${profile.foto}` : null);

  return (
    <AppLayout>
      <div className="animate-fade-in max-w-2xl mx-auto space-y-5">
        <div>
          <h1 className="page-title">Profil Saya</h1>
          <p className="page-subtitle">Kelola informasi akun dan keamanan Anda</p>
        </div>

        {/* Profile card */}
        <div className="card">
          <div className="flex items-center gap-5">
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-indigo-100 flex items-center justify-center shadow-sm">
                {fotoSrc
                  ? <img src={fotoSrc} alt="avatar" className="w-full h-full object-cover" />
                  : <span className="text-3xl font-bold text-indigo-600">{user?.nama?.charAt(0).toUpperCase()}</span>
                }
              </div>
              <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center cursor-pointer shadow-md hover:bg-indigo-700 transition-colors">
                <Camera className="h-3.5 w-3.5 text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={handleFoto} />
              </label>
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{user?.nama}</p>
              <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-1">
                <Mail className="h-3.5 w-3.5" /> {user?.email}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="badge-customer capitalize">
                  {typeof user?.role === 'object' ? user?.role?.nama_role : (user?.role || '')}
                </span>
                <span className="badge-aktif">Aktif</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {[
            { key: 'profile', label: 'Edit Profil', icon: <User className="h-4 w-4" /> },
            { key: 'password', label: 'Ubah Password', icon: <Shield className="h-4 w-4" /> },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === t.key ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Edit Profile */}
        {activeTab === 'profile' && (
          <form onSubmit={handleProfileSubmit} className="card space-y-4 animate-fade-in">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nama Lengkap</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="text" className="input-field pl-10" value={editForm.nama}
                  onChange={e => setEditForm(f => ({ ...f, nama: e.target.value }))} required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nomor HP <span className="font-normal text-gray-400">(opsional)</span></label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="text" className="input-field pl-10" placeholder="08xxxxxxxxxx" value={editForm.no_hp}
                  onChange={e => setEditForm(f => ({ ...f, no_hp: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Alamat <span className="font-normal text-gray-400">(opsional)</span></label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
                <textarea className="input-field pl-10 resize-none" rows="3" placeholder="Alamat lengkap..."
                  value={editForm.alamat} onChange={e => setEditForm(f => ({ ...f, alamat: e.target.value }))} />
              </div>
            </div>
            <button type="submit" disabled={loadingProfile} className="btn-primary w-full justify-center">
              {loadingProfile
                ? <><span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Menyimpan...</>
                : <><CheckCircle className="h-4 w-4" /> Simpan Perubahan</>
              }
            </button>
          </form>
        )}

        {/* Change Password */}
        {activeTab === 'password' && (
          <form onSubmit={handlePassSubmit} className="card space-y-4 animate-fade-in">
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-sm text-amber-700">
              <p className="font-semibold mb-0.5">Tips keamanan</p>
              <p className="text-xs">Gunakan password yang kuat dengan kombinasi huruf, angka, dan simbol. Minimal 6 karakter.</p>
            </div>
            {[
              { key: 'password_lama', label: 'Password Lama', show: showOld, toggle: setShowOld },
              { key: 'password_baru', label: 'Password Baru', show: showNew, toggle: setShowNew },
              { key: 'konfirmasi', label: 'Konfirmasi Password Baru', show: showConfirm, toggle: setShowConfirm },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{f.label}</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input type={f.show ? 'text' : 'password'} className="input-field pl-10 pr-11"
                    placeholder="••••••••" value={passForm[f.key]}
                    onChange={e => setPassForm(p => ({ ...p, [f.key]: e.target.value }))} required />
                  <button type="button" onClick={() => f.toggle(!f.show)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {f.show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            ))}
            <button type="submit" disabled={loadingPass} className="btn-primary w-full justify-center">
              {loadingPass
                ? <><span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Menyimpan...</>
                : <><Shield className="h-4 w-4" /> Ubah Password</>
              }
            </button>
          </form>
        )}
      </div>
    </AppLayout>
  );
}
