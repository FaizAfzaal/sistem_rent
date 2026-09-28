import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import api from '../../lib/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { ArrowLeft, Upload, CreditCard, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const METODE = [
  { value: 'transfer',     label: 'Transfer Bank',  icon: '🏦' },
  { value: 'qris',         label: 'QRIS',           icon: '📱' },
  { value: 'tunai',        label: 'Tunai',          icon: '💵' },
  { value: 'kartu_kredit', label: 'Kartu Kredit',   icon: '💳' },
];

export default function CreatePembayaranPage() {
  const { bookingId } = useParams();
  const navigate      = useNavigate();
  const [booking, setBooking]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [submitting, setSubm]   = useState(false);
  const [form, setForm]         = useState({ metode: 'transfer', jumlah: '' });
  const [buktiFile, setBukti]   = useState(null);
  const [preview, setPreview]   = useState(null);

  useEffect(() => {
    api.get(`/bookings/${bookingId}`)
      .then(r => { setBooking(r.data.data); setForm(f => ({ ...f, jumlah: r.data.data.total_harga })); })
      .catch(() => navigate('/bookings'))
      .finally(() => setLoading(false));
  }, [bookingId]);

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setBukti(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (Number(form.jumlah) <= 0) return toast.error('Jumlah bayar tidak valid');
    setSubm(true);
    try {
      const fd = new FormData();
      fd.append('booking_id', bookingId);
      fd.append('metode', form.metode);
      fd.append('jumlah', form.jumlah);
      if (buktiFile) fd.append('bukti_bayar', buktiFile);
      await api.post('/pembayaran', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Pembayaran berhasil dikirim!');
      navigate('/pembayaran');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal membuat pembayaran');
    }
    setSubm(false);
  };

  if (loading) return <AppLayout><LoadingSpinner className="py-16" /></AppLayout>;

  return (
    <AppLayout>
      <div className="animate-fade-in max-w-lg mx-auto space-y-5">
        <button onClick={() => navigate(`/bookings/${bookingId}`)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm font-medium transition-colors">
          <ArrowLeft className="h-4 w-4" /> Kembali ke detail booking
        </button>

        <div>
          <h1 className="page-title">Buat Pembayaran</h1>
          <p className="page-subtitle">Pilih metode pembayaran dan upload bukti transfer</p>
        </div>

        {/* Tagihan */}
        <div className="bg-indigo-600 rounded-2xl p-5 text-white">
          <p className="text-indigo-200 text-sm font-medium">{booking?.kode_booking}</p>
          <p className="text-3xl font-bold mt-1">Rp {Number(booking?.total_harga).toLocaleString('id-ID')}</p>
          <p className="text-indigo-200 text-xs mt-1">
            {new Date(booking?.tanggal_mulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} –{' '}
            {new Date(booking?.tanggal_selesai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Metode */}
          <div className="card">
            <h2 className="font-bold text-gray-900 mb-3">Metode Pembayaran</h2>
            <div className="grid grid-cols-2 gap-2.5">
              {METODE.map(m => (
                <button key={m.value} type="button" onClick={() => setForm(f => ({ ...f, metode: m.value }))}
                  className={`p-3 rounded-xl border-2 text-sm font-semibold transition-all text-left flex items-center gap-2.5 ${form.metode === m.value ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-100 hover:border-gray-200 text-gray-700 bg-white'}`}>
                  <span className="text-lg">{m.icon}</span>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Jumlah */}
          <div className="card">
            <label className="block font-bold text-gray-900 mb-3">Jumlah Pembayaran</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-semibold text-sm">Rp</span>
              <input type="number" className="input-field pl-10" min="1"
                value={form.jumlah}
                onChange={e => setForm(f => ({ ...f, jumlah: e.target.value }))} required />
            </div>
            {Number(form.jumlah) > 0 && Number(form.jumlah) < Number(booking?.total_harga) && (
              <p className="text-xs text-amber-600 mt-1.5">⚠ Jumlah lebih kecil dari total tagihan (Rp {Number(booking?.total_harga).toLocaleString('id-ID')})</p>
            )}
          </div>

          {/* Upload bukti */}
          <div className="card">
            <h2 className="font-bold text-gray-900 mb-3">Bukti Pembayaran <span className="font-normal text-gray-400 text-sm">(opsional tapi disarankan)</span></h2>
            <label className="block cursor-pointer">
              {preview ? (
                <div className="relative group">
                  <img src={preview} alt="preview" className="w-full h-48 object-cover rounded-xl" />
                  <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white font-medium flex items-center gap-2"><Upload className="h-4 w-4" /> Ganti Foto</span>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-indigo-400 hover:bg-indigo-50/50 transition-all">
                  <Upload className="h-7 w-7 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-600">Klik untuk upload bukti transfer</p>
                  <p className="text-xs text-gray-400 mt-1">JPG, PNG • Maks 5MB</p>
                </div>
              )}
              <input type="file" className="hidden" accept="image/*" onChange={handleFile} />
            </label>
          </div>

          <button type="submit" disabled={submitting} className="btn-primary w-full justify-center py-3.5 text-base">
            {submitting
              ? <><span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Memproses...</>
              : <><CheckCircle className="h-5 w-5" /> Kirim Pembayaran</>
            }
          </button>
        </form>
      </div>
    </AppLayout>
  );
}
