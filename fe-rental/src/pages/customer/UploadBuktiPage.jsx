import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import api, { IMAGE_BASE } from '../../lib/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { ArrowLeft, Upload, CheckCircle, ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';

export default function UploadBuktiPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pembayaran, setPembayaran] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [file, setFile]             = useState(null);
  const [preview, setPreview]       = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get(`/pembayaran/${id}`)
      .then(r => setPembayaran(r.data.data))
      .catch(() => navigate('/pembayaran'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return toast.error('Pilih file bukti pembayaran terlebih dahulu');
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('bukti_bayar', file);
      await api.patch(`/pembayaran/${id}/upload-bukti`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Bukti pembayaran berhasil diupload!');
      navigate('/pembayaran');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal upload bukti');
    }
    setSubmitting(false);
  };

  if (loading) return <AppLayout><LoadingSpinner className="py-16" /></AppLayout>;

  return (
    <AppLayout>
      <div className="animate-fade-in max-w-md mx-auto space-y-5">
        <button onClick={() => navigate('/pembayaran')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm font-medium transition-colors">
          <ArrowLeft className="h-4 w-4" /> Kembali
        </button>

        <div>
          <h1 className="page-title">Upload Bukti Bayar</h1>
          <p className="page-subtitle">Upload foto bukti transfer untuk diverifikasi admin</p>
        </div>

        {/* Info pembayaran */}
        <div className="bg-indigo-600 rounded-2xl p-5 text-white">
          <p className="text-indigo-200 text-sm">{pembayaran?.booking?.kode_booking}</p>
          <p className="text-2xl font-bold mt-1">Rp {Number(pembayaran?.jumlah).toLocaleString('id-ID')}</p>
          <p className="text-indigo-200 text-sm mt-1 capitalize">{pembayaran?.metode?.replace('_', ' ')}</p>
        </div>

        {/* Bukti sebelumnya */}
        {pembayaran?.bukti_bayar && !preview && (
          <div className="card">
            <p className="text-sm font-semibold text-gray-700 mb-2">Bukti sebelumnya:</p>
            <img src={`${IMAGE_BASE}/${pembayaran.bukti_bayar}`} alt="bukti lama" className="w-full rounded-xl" />
          </div>
        )}

        <form onSubmit={handleSubmit} className="card space-y-4">
          <label className="block cursor-pointer">
            {preview ? (
              <div className="relative group">
                <img src={preview} alt="preview" className="w-full h-56 object-cover rounded-xl" />
                <div className="absolute inset-0 bg-black/50 rounded-xl flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-2">
                  <Upload className="h-6 w-6 text-white" />
                  <span className="text-white text-sm font-medium">Ganti Foto</span>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center hover:border-indigo-400 hover:bg-indigo-50/50 transition-all">
                <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <ImageIcon className="h-7 w-7 text-gray-400" />
                </div>
                <p className="text-gray-600 font-medium">Klik untuk pilih foto bukti</p>
                <p className="text-xs text-gray-400 mt-1">JPG, PNG • Maks 5MB</p>
              </div>
            )}
            <input type="file" className="hidden" accept="image/*" onChange={handleFile} />
          </label>

          <button type="submit" disabled={submitting || !file} className="btn-primary w-full justify-center py-3">
            {submitting
              ? <><span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Mengupload...</>
              : <><CheckCircle className="h-4 w-4" /> Upload Bukti</>
            }
          </button>
        </form>
      </div>
    </AppLayout>
  );
}
