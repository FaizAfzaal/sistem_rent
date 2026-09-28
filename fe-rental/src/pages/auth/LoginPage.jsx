import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Eye, EyeOff, Wrench, Mail, Lock, ArrowRight, ShieldCheck, Sparkles, UserCheck, KeyRound, Truck, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [selectedPortal, setSelectedPortal] = useState('admin1');
  const [form, setForm] = useState({ email: 'admin@rental.com', password: 'admin123' });
  const [showPass, setShowPass] = useState(false);

  const selectPortal = (portal) => {
    setSelectedPortal(portal);
    if (portal === 'admin1') {
      setForm({ email: 'admin@rental.com', password: 'admin123' });
    } else {
      setForm({ email: 'finance@rental.com', password: 'admin123' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(form.email, form.password);
    if (result.success) {
      if (result.role === 'customer') {
        toast.error('Customer tidak dapat login ke sistem ini. Akses khusus Petugas Admin & Keuangan.');
        return;
      }
      toast.success('Selamat datang kembali!');
      const roleLower = result.role?.toLowerCase() || '';
      if (['keuangan', 'finance', 'admin_finance', 'admin finance'].includes(roleLower)) {
        navigate('/finance/booking-masuk');
      } else {
        navigate('/admin/select-module');
      }
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-900/5 selection:bg-indigo-500 selection:text-white font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Left Panel — Dark Slate Mesh Gradient & Glassmorphic Highlights */}
      <div className="hidden lg:flex lg:w-[52%] bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex-col justify-between p-12 relative overflow-hidden text-white border-r border-slate-800/80">
        {/* Ambient Glowing Glass Orbs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-600/30 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-violet-600/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/15 shadow-xl">
            <div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 via-indigo-600 to-violet-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Wrench className="h-5 w-5 text-white stroke-[2.5]" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight">Rental<span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">Hub</span></span>
              <span className="block text-[10px] font-bold text-indigo-300 uppercase tracking-widest -mt-0.5">Heavy Equipment Portal</span>
            </div>
          </div>
        </div>

        {/* Center Main Content */}
        <div className="relative z-10 my-auto py-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold mb-6">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            Platform Penyewaan Alat Berat Terintegrasi
          </div>

          <h2 className="text-4xl xl:text-5xl font-black leading-tight tracking-tight text-white mb-5">
            Kelola Rental Alat<br />
            <span className="bg-gradient-to-r from-indigo-400 via-violet-300 to-emerald-400 bg-clip-text text-transparent">
              Cepat, Aman & Efisien
            </span>
          </h2>
          <p className="text-slate-300 text-base leading-relaxed max-w-lg mb-8 font-medium">
            Sistem manajemen penyewaan alat berat terpadu untuk efisiensi operasional booking, pengelolaan faktur invoice resmi, serta verifikasi keuangan secara akurat.
          </p>

          {/* Feature Badges */}
          <div className="space-y-3 mb-10">
            {[
              'Otomatisasi Penerbitan Invoice & Faktur Resmi',
              'Verifikasi Pembayaran & Riwayat Keuangan Lunas',
              'Manajemen Unit Alat & Logbook Pengembalian'
            ].map((text, idx) => (
              <div key={idx} className="flex items-center gap-3 text-xs font-semibold text-slate-200 bg-white/5 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 w-fit">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">✓</div>
                <span>{text}</span>
              </div>
            ))}
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-3 gap-4">
            {[
              ['500+', 'Unit Alat Berat', 'bg-indigo-500/20 border-indigo-400/30'],
              ['1.2K', 'Transaksi Lunas', 'bg-emerald-500/20 border-emerald-400/30'],
              ['98%', 'Kepuasan Partner', 'bg-violet-500/20 border-violet-400/30']
            ].map(([val, lbl, style]) => (
              <div key={lbl} className={`backdrop-blur-xl rounded-2xl p-4 text-center border ${style} hover:bg-white/10 transition-all duration-300 shadow-lg`}>
                <p className="text-2xl font-black text-white">{val}</p>
                <p className="text-[11px] font-bold text-slate-300 mt-1 uppercase tracking-wider">{lbl}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex justify-between items-center text-xs text-slate-400 border-t border-slate-800/80 pt-6">
          <p>© 2026 PT Rental Heavy Equipment Services.</p>
          <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            <ShieldCheck className="h-3.5 w-3.5" /> System Active & Verified
          </span>
        </div>
      </div>

      {/* Right Panel — Glassmorphic Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-gradient-to-br from-slate-50 via-indigo-50/20 to-slate-100 relative">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center text-white shadow-md">
              <Wrench className="h-5 w-5" />
            </div>
            <span className="text-xl font-black text-slate-900">Rental<span className="text-indigo-600">Hub</span></span>
          </div>

          {/* Login Card */}
          <div className="bg-white/90 backdrop-blur-2xl p-8 sm:p-10 rounded-3xl border border-gray-200/80 shadow-2xl shadow-slate-200/80 space-y-6">
            <div>
              <span className="text-xs font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 inline-block mb-3">
                Portal Login Petugas
              </span>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Selamat Datang 👋</h1>
              <p className="text-slate-500 text-xs font-medium mt-1">Pilih portal dan masukkan kredensial akun administrator Anda.</p>
            </div>

            {/* Portal Choices (2 Main Options) */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => selectPortal('admin1')}
                className={`p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
                  selectedPortal === 'admin1'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/30 scale-[1.02]'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`p-1.5 rounded-lg ${selectedPortal === 'admin1' ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-600'}`}>
                    <UserCheck className="h-4 w-4" />
                  </div>
                  <span className="font-extrabold text-sm">Admin 1</span>
                </div>
                <p className={`text-[10px] font-semibold leading-tight ${selectedPortal === 'admin1' ? 'text-indigo-100' : 'text-slate-500'}`}>
                  Pemesanan, Pengeluaran, Penerimaan
                </p>
              </button>

              <button
                type="button"
                onClick={() => selectPortal('finance')}
                className={`p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
                  selectedPortal === 'finance'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-500/30 scale-[1.02]'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`p-1.5 rounded-lg ${selectedPortal === 'finance' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-600'}`}>
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <span className="font-extrabold text-sm">Admin Finance</span>
                </div>
                <p className={`text-[10px] font-semibold leading-tight ${selectedPortal === 'finance' ? 'text-emerald-100' : 'text-slate-500'}`}>
                  Keuangan & Invoice
                </p>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Alamat Email Registered</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    className="w-full pl-11 pr-4 py-3 bg-slate-50/80 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all shadow-xs"
                    placeholder="nama@email.com"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Kata Sandi / Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    className="w-full pl-11 pr-11 py-3 bg-slate-50/80 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all shadow-xs"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3.5 px-6 rounded-2xl text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer group mt-2 ${
                  selectedPortal === 'admin1'
                    ? 'bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-indigo-500/30'
                    : 'bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/30'
                }`}
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Memproses Login...
                  </>
                ) : (
                  <>
                    Masuk Portal {selectedPortal === 'admin1' ? 'Admin 1' : 'Admin Finance'}
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-[11px] text-slate-400 font-medium pt-1">
              Akses khusus untuk Staff Administrator & Petugas Keuangan resmi.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
