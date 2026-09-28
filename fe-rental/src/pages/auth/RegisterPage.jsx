import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Eye, EyeOff, Wrench, Mail, Lock, User, Phone, MapPin, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const { register, loading } = useAuth();
  const navigate = useNavigate();
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({ nama: '', email: '', password: '', no_hp: '', alamat: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return toast.error('Password minimal 6 karakter');
    const result = await register(form);
    if (result.success) {
      toast.success('Akun berhasil dibuat! Silakan login.');
      navigate('/login');
    } else {
      toast.error(result.message);
    }
  };
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-600 rounded-2xl mb-4">
            <Wrench className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Buat Akun Baru</h1>
          <p className="text-gray-500 mt-2 text-sm">Daftar untuk mulai menyewa alat</p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Nama Lengkap" icon={<User />} required>
              <input type="text" className="input-field pl-10 h-11" placeholder="Masukkan nama lengkap" value={form.nama} onChange={set('nama')} required />
            </Field>
            <Field label="Email" icon={<Mail />} required>
              <input type="email" className="input-field pl-10 h-11" placeholder="email@contoh.com" value={form.email} onChange={set('email')} required />
            </Field>
            <Field label="Password" icon={<Lock />} required>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type={showPass ? 'text' : 'password'} className="input-field pl-10 pr-11 h-11" placeholder="Min. 6 karakter" value={form.password} onChange={set('password')} required />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>
            <Field label="No. HP" icon={<Phone />} optional>
              <input type="text" className="input-field pl-10 h-11" placeholder="08xxxxxxxxxx" value={form.no_hp} onChange={set('no_hp')} />
            </Field>
            <Field label="Alamat" icon={<MapPin />} optional>
              <textarea className="input-field pl-10 resize-none pt-2.5" rows="2" placeholder="Alamat lengkap..." value={form.alamat} onChange={set('alamat')} />
            </Field>

            <button type="submit" disabled={loading} className="btn-primary w-full h-11 mt-2">
              {loading
                ? <><span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Mendaftar...</>
                : <>Buat Akun<ArrowRight className="h-4 w-4" /></>
              }
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-gray-500">
          Sudah punya akun?{' '}
          <Link to="/login" className="text-indigo-600 font-semibold hover:underline">Masuk</Link>
        </p>
      </div>
    </div>
  );
}

function Field({ label, icon, children, required, optional }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
        {label} {optional && <span className="text-gray-400 font-normal">(opsional)</span>}
      </label>
      <div className="relative">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none">
          {icon}
        </div>
        {children}
      </div>
    </div>
  );
}
