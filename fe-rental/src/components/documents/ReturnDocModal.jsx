import { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import SignaturePad from '../common/SignaturePad';
import api, { IMAGE_BASE } from '../../lib/api';
import toast from 'react-hot-toast';
import { FileCheck, CheckSquare, ShieldCheck, User, Package, Calendar, Clock, Upload, ImageIcon, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function ReturnDocModal({ isOpen, onClose, booking, existingDoc, onSuccess }) {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [custSig, setCustSig] = useState('');
  const [adminSig, setAdminSig] = useState('');
  const [catatanAdmin, setCatatanAdmin] = useState('');
  const [waktuKembaliAktual, setWaktuKembaliAktual] = useState(new Date().toLocaleString('id-ID'));
  const [photos, setPhotos] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);

  const [checklists, setChecklists] = useState({
    alat_sesuai: true,
    mesin_normal: true,
    tidak_rusak: true,
    kelengkapan_lengkap: true,
    kondisi_sesuai: true,
  });

  useEffect(() => {
    const existingCustSig = existingDoc?.customer_signature || booking?.return?.return_signature || booking?.returns?.[0]?.return_signature || booking?.pickup?.pickup_signature || '';
    const existingAdminSig = existingDoc?.admin_signature || existingCustSig || '';

    setCustSig(existingCustSig);
    setAdminSig(existingAdminSig);

    if (existingDoc && existingDoc.condition_data) {
      const cd = existingDoc.condition_data;
      setCatatanAdmin(cd.catatan_admin || '');
      if (cd.waktu_kembali_aktual) setWaktuKembaliAktual(cd.waktu_kembali_aktual);
      if (cd.checklists) {
        setChecklists({
          alat_sesuai: cd.checklists.alat_sesuai !== false,
          mesin_normal: cd.checklists.mesin_normal !== false,
          tidak_rusak: cd.checklists.tidak_rusak !== false,
          kelengkapan_lengkap: cd.checklists.kelengkapan_lengkap !== false,
          kondisi_sesuai: cd.checklists.kondisi_sesuai !== false,
        });
      }
    } else {
      setCatatanAdmin(booking?.return?.return_notes || booking?.return?.damage_notes || '');
      setWaktuKembaliAktual(new Date().toLocaleString('id-ID'));
      setPhotos([]);
      setPhotoPreviews([]);
      setChecklists({
        alat_sesuai: true,
        mesin_normal: true,
        tidak_rusak: true,
        kelengkapan_lengkap: true,
        kondisi_sesuai: true,
      });
    }
  }, [existingDoc, isOpen, booking]);

  if (!booking) return null;

  const firstDetail = (booking.details && booking.details[0]) || {};
  const alatObj = firstDetail.alat || {};

  const custName = booking.customer?.full_name || booking.user?.nama || booking.pengambil_nama || '-';
  const custPhone = booking.customer?.phone || booking.user?.no_hp || booking.pengambil_no_hp || '-';

  // Calculate day difference
  const contractDate = new Date(booking.tanggal_selesai);
  const today = new Date();
  const diffTime = today - contractDate;
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  let selisihHariText = 'Sesuai Jadwal Kontrak';
  if (diffDays > 0) {
    selisihHariText = `Terlambat ${diffDays} Hari`;
  } else if (diffDays < 0) {
    selisihHariText = `${Math.abs(diffDays)} Hari Lebih Cepat`;
  }

  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    if (photos.length + files.length > 5) {
      return toast.error('Maksimal 5 foto pengembalian');
    }
    const newPhotos = [...photos, ...files];
    setPhotos(newPhotos);
    const newPreviews = files.map(f => URL.createObjectURL(f));
    setPhotoPreviews(prev => [...prev, ...newPreviews]);
  };

  const removePhoto = (idx) => {
    setPhotos(prev => prev.filter((_, i) => i !== idx));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!custSig || custSig.trim() === '') {
      return toast.error('Tanda tangan penyewa wajib diisi!');
    }
    if (!adminSig || adminSig.trim() === '') {
      return toast.error('Tanda tangan admin penerima wajib diisi!');
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('rental_id', booking.id);
      fd.append('booking_id', booking.id);
      fd.append('customer_signature', custSig);
      fd.append('admin_signature', adminSig);
      fd.append('checklists', JSON.stringify(checklists));
      fd.append('catatan_admin', catatanAdmin);
      fd.append('waktu_kembali_aktual', waktuKembaliAktual);
      fd.append('selisih_hari', selisihHariText);

      photos.forEach(f => {
        fd.append('photos', f);
      });

      const res = await api.post('/rental/document/return/sign', fd);
      toast.success('Berita Acara Pengembalian Barang berhasil disimpan & PDF dibuat!');
      
      // Auto Download PDF
      if (res.data?.data?.id) {
        const downloadUrl = `${IMAGE_BASE.replace('/uploads', '')}/api/rental/document/${res.data.data.id}/download`;
        window.open(downloadUrl, '_blank');
      }

      if (onSuccess) onSuccess(res.data.data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan dokumen pengembalian');
    }
    setSubmitting(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Form Berita Acara Pengembalian Alat Berat (Barang Kembali)">
      <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto pr-1">
        
        {/* Header Branding */}
        <div className="p-4 bg-indigo-950 text-white rounded-2xl flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center font-bold text-white">
              <FileCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black tracking-widest text-indigo-300 uppercase">BERITA ACARA PENGEMBALIAN</p>
              <h3 className="font-extrabold text-base tracking-tight">Dokumen Barang Kembali</h3>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-mono bg-indigo-900 px-3 py-1 rounded-lg border border-indigo-700 text-indigo-200 font-bold block">
              #{booking.kode_booking}
            </span>
          </div>
        </div>

        {/* Section 1: Data Auto Populated */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
          <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2">
            <User className="h-4 w-4 text-indigo-600" /> Data Transaksi & Customer
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-500 font-medium block">Nama Penyewa:</span>
              <strong className="text-slate-900 text-sm">{custName}</strong>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">Nomor HP / WA:</span>
              <strong className="text-slate-900 font-mono">{custPhone}</strong>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">Nama & Kode Alat:</span>
              <strong className="text-slate-900">{alatObj.nama_alat || 'Alat Berat'} ({alatObj.kode_alat || '-'})</strong>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">Tanggal Keluar:</span>
              <span className="text-slate-800 font-semibold">{booking.tanggal_mulai}</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">Jadwal Kembali Kontrak:</span>
              <span className="text-slate-800 font-semibold">{booking.tanggal_selesai}</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">Waktu Kembali Aktual:</span>
              <span className="text-slate-900 font-bold">{waktuKembaliAktual}</span>
            </div>
            <div className="sm:col-span-2 p-2.5 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between">
              <span className="text-amber-800 font-bold text-xs">Status Selisih Waktu:</span>
              <span className={`text-xs font-black px-2.5 py-1 rounded-lg ${diffDays > 0 ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>
                {selisihHariText}
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Checklist Pemeriksaan Barang */}
        <div className="space-y-3">
          <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2">
            <CheckSquare className="h-4 w-4 text-indigo-600" /> Checklist Pemeriksaan Barang saat Kembali
          </h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {[
              { id: 'alat_sesuai', label: 'Alat kembali sesuai transaksi' },
              { id: 'mesin_normal', label: 'Mesin normal & beroperasi' },
              { id: 'tidak_rusak', label: 'Tidak ada kerusakan fisik' },
              { id: 'kelengkapan_lengkap', label: 'Kelengkapan alat lengkap' },
              { id: 'kondisi_sesuai', label: 'Kondisi sesuai saat keluar' },
            ].map(item => (
              <label key={item.id} className="flex items-center gap-2.5 p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={checklists[item.id]}
                  onChange={e => setChecklists({ ...checklists, [item.id]: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <span className="font-semibold text-slate-800">{item.label}</span>
              </label>
            ))}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">Catatan Pemeriksaan Admin Penerima:</label>
            <textarea
              rows={2}
              value={catatanAdmin}
              onChange={e => setCatatanAdmin(e.target.value)}
              placeholder="Tuliskan hasil pengecekan kondisi akhir alat..."
              className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Upload Foto */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">Upload Foto Kondisi Barang (Opsional, max 5):</label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer border border-slate-300 transition">
                <Upload className="h-4 w-4 text-indigo-600" /> Choose Photos
                <input type="file" accept="image/*" multiple onChange={handlePhotoChange} className="hidden" />
              </label>
              <span className="text-[11px] text-slate-500">{photos.length} foto dipilih</span>
            </div>

            {photoPreviews.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {photoPreviews.map((src, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200">
                    <img src={src} alt="preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute top-0.5 right-0.5 bg-red-600 text-white rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Digital Signatures */}
        <div className="space-y-4 pt-2 border-t border-slate-200">
          <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-indigo-600" /> Tanda Tangan Digital Penerimaan (Wajib)
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
              <SignaturePad
                label={`1. Tanda Tangan Penyewa (${custName})`}
                value={custSig}
                onChange={setCustSig}
              />
              {!custSig && <p className="text-[11px] text-red-500 font-medium">* Tanda tangan penyewa wajib diisi</p>}
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
              <SignaturePad
                label={`2. Tanda Tangan Admin Penerima (${user?.nama || 'Admin'})`}
                value={adminSig}
                onChange={setAdminSig}
              />
              {!adminSig && <p className="text-[11px] text-red-500 font-medium">* Tanda tangan admin wajib diisi</p>}
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex gap-3 pt-4 border-t border-slate-200">
          <button type="button" onClick={onClose} className="btn-secondary flex-1 py-3 text-xs font-bold">
            Batal
          </button>
          <button
            type="submit"
            disabled={submitting || !custSig || !adminSig}
            className="btn-primary flex-1 py-3 text-xs font-bold justify-center disabled:opacity-50 disabled:cursor-not-allowed bg-indigo-600 hover:bg-indigo-700"
          >
            {submitting ? 'Memproses PDF...' : 'Simpan & Generate PDF Pengembalian'}
          </button>
        </div>

      </form>
    </Modal>
  );
}
