import { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import SignaturePad from '../common/SignaturePad';
import api, { IMAGE_BASE } from '../../lib/api';
import toast from 'react-hot-toast';
import { FileCheck, CheckSquare, ShieldCheck, User, Package, Calendar, Clock, AlertTriangle, Download } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function OutgoingDocModal({ isOpen, onClose, booking, existingDoc, onSuccess }) {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [custSig, setCustSig] = useState('');
  const [adminSig, setAdminSig] = useState('');
  const [catatan, setCatatan] = useState('');
  const [conditions, setConditions] = useState({
    kondisi_baik: true,
    mesin_normal: true,
    kelengkapan_sesuai: true,
    dokumen_lengkap: true,
    foto_tersedia: true,
  });

  useEffect(() => {
    const existingCustSig = existingDoc?.customer_signature || booking?.pickup?.pickup_signature || booking?.pickups?.[0]?.pickup_signature || '';
    const existingAdminSig = existingDoc?.admin_signature || existingCustSig || '';

    setCustSig(existingCustSig);
    setAdminSig(existingAdminSig);

    if (existingDoc && existingDoc.condition_data) {
      const cd = existingDoc.condition_data;
      setCatatan(cd.catatan || existingDoc.catatan || '');
      setConditions({
        kondisi_baik: cd.kondisi_baik !== false,
        mesin_normal: cd.mesin_normal !== false,
        kelengkapan_sesuai: cd.kelengkapan_sesuai !== false,
        dokumen_lengkap: cd.dokumen_lengkap !== false,
        foto_tersedia: cd.foto_tersedia !== false,
      });
    } else {
      setCatatan(booking?.pickup?.pickup_notes || '');
      setConditions({
        kondisi_baik: true,
        mesin_normal: true,
        kelengkapan_sesuai: true,
        dokumen_lengkap: true,
        foto_tersedia: true,
      });
    }
  }, [existingDoc, isOpen, booking]);

  if (!booking) return null;

  const firstDetail = (booking.details && booking.details[0]) || {};
  const alatObj = firstDetail.alat || {};

  const custName = booking.customer?.full_name || booking.user?.nama || booking.pengambil_nama || '-';
  const custPhone = booking.customer?.phone || booking.user?.no_hp || booking.pengambil_no_hp || '-';
  const custEmail = booking.customer?.email || booking.user?.email || '-';
  const custAddress = booking.customer?.address || booking.user?.alamat || '-';

  const durasi = Math.max(1, Math.ceil((new Date(booking.tanggal_selesai) - new Date(booking.tanggal_mulai)) / 86400000) + 1);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!custSig || custSig.trim() === '') {
      return toast.error('Tanda tangan penyewa wajib diisi!');
    }
    if (!adminSig || adminSig.trim() === '') {
      return toast.error('Tanda tangan admin rental wajib diisi!');
    }

    setSubmitting(true);
    try {
      const payload = {
        rental_id: booking.id,
        booking_id: booking.id,
        customer_signature: custSig,
        admin_signature: adminSig,
        catatan_kondisi: catatan,
        condition_data: {
          ...conditions,
          catatan,
        },
      };

      const res = await api.post('/rental/document/outgoing/sign', payload);
      toast.success('Berita Acara Serah Terima berhasil disimpan & PDF dibuat!');
      
      // Auto Download PDF
      if (res.data?.data?.id) {
        const downloadUrl = `${IMAGE_BASE.replace('/uploads', '')}/api/rental/document/${res.data.data.id}/download`;
        window.open(downloadUrl, '_blank');
      }

      if (onSuccess) onSuccess(res.data.data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan dokumen serah terima');
    }
    setSubmitting(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Form Berita Acara Serah Terima Alat Berat (Barang Keluar)">
      <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto pr-1">
        
        {/* Header Branding */}
        <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-white">
              <FileCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black tracking-widest text-indigo-400 uppercase">BERITA ACARA SERAH TERIMA</p>
              <h3 className="font-extrabold text-base tracking-tight">Dokumen Barang Keluar</h3>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-mono bg-slate-800 px-3 py-1 rounded-lg border border-slate-700 text-indigo-300 font-bold block">
              #{booking.kode_booking}
            </span>
          </div>
        </div>

        {/* Section 1: Data Rental & Penyewa (Auto Populated) */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
          <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2">
            <User className="h-4 w-4 text-indigo-600" /> Data Transaksi & Penyewa
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
              <span className="text-slate-500 font-medium block">Email:</span>
              <span className="text-slate-800 font-medium">{custEmail}</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">Alamat Penyewa:</span>
              <span className="text-slate-800 font-medium">{custAddress}</span>
            </div>
          </div>
        </div>

        {/* Section 2: Detail Alat Berat & Periode Rental */}
        <div className="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-100 space-y-3">
          <h4 className="text-xs font-black uppercase text-indigo-900 tracking-wider flex items-center gap-2 border-b border-indigo-100 pb-2">
            <Package className="h-4 w-4 text-indigo-600" /> Detail Alat Berat & Jadwal Sewa
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-indigo-700 font-medium block">Nama Alat Berat:</span>
              <strong className="text-slate-900 text-sm">{alatObj.nama_alat || 'Unit Alat Heavy Equipment'}</strong>
            </div>
            <div>
              <span className="text-indigo-700 font-medium block">Kode & Merk Alat:</span>
              <strong className="text-slate-900 font-mono">{alatObj.kode_alat || '-'} ({alatObj.merk || '-'})</strong>
            </div>
            <div>
              <span className="text-indigo-700 font-medium block">Tanggal & Jam Keluar:</span>
              <strong className="text-slate-900">{booking.tanggal_mulai} ({firstDetail.jam_mulai || booking.jam_mulai || '08:00'} WIB)</strong>
            </div>
            <div>
              <span className="text-indigo-700 font-medium block">Lama Sewa & Jadwal Kembali:</span>
              <strong className="text-slate-900">{durasi} Hari — S/d {booking.tanggal_selesai}</strong>
            </div>
          </div>
        </div>

        {/* Section 3: Checklist Kondisi Barang */}
        <div className="space-y-3">
          <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2">
            <CheckSquare className="h-4 w-4 text-indigo-600" /> Condition Check (Kondisi Barang Sebelum Digunakan)
          </h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {[
              { id: 'kondisi_baik', label: 'Kondisi alat baik' },
              { id: 'mesin_normal', label: 'Mesin berfungsi normal' },
              { id: 'kelengkapan_sesuai', label: 'Kelengkapan alat sesuai' },
              { id: 'dokumen_lengkap', label: 'Dokumen alat lengkap' },
              { id: 'foto_tersedia', label: 'Foto dokumentasi tersedia' },
            ].map(item => (
              <label key={item.id} className="flex items-center gap-2.5 p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={conditions[item.id]}
                  onChange={e => setConditions({ ...conditions, [item.id]: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <span className="font-semibold text-slate-800">{item.label}</span>
              </label>
            ))}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">Catatan Kondisi Barang Sebelum Digunakan:</label>
            <textarea
              rows={2}
              value={catatan}
              onChange={e => setCatatan(e.target.value)}
              placeholder="Masukkan catatan spesifik mengenai kondisi unit alat sebelum dibawa penyewa..."
              className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Section 4: Digital Signatures */}
        <div className="space-y-4 pt-2 border-t border-slate-200">
          <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-indigo-600" /> Tanda Tangan Digital Resmi (Wajib)
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
              <SignaturePad
                label={`1. Tanda Tangan Penyewa (${custName})`}
                value={custSig}
                onChange={setCustSig}
              />
              {!custSig && <p className="text-[11px] text-red-500 font-medium">* Tanda tangan penyewa belum diisi</p>}
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
              <SignaturePad
                label={`2. Tanda Tangan Admin Rental (${user?.nama || 'Admin'})`}
                value={adminSig}
                onChange={setAdminSig}
              />
              {!adminSig && <p className="text-[11px] text-red-500 font-medium">* Tanda tangan admin belum diisi</p>}
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
            className="btn-primary flex-1 py-3 text-xs font-bold justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Memproses PDF...' : 'Simpan & Generate PDF'}
          </button>
        </div>

      </form>
    </Modal>
  );
}
