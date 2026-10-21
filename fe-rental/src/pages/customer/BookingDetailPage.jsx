import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import AppLayout from '../../components/layout/AppLayout';
import api, { IMAGE_BASE } from '../../lib/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import toast from 'react-hot-toast';
import { ArrowLeft, Calendar, User, Package, CreditCard, FileText, Clock, Printer, Download, ShieldCheck, CheckCircle, FileCheck } from 'lucide-react';
import OutgoingDocModal from '../../components/documents/OutgoingDocModal';
import ReturnDocModal from '../../components/documents/ReturnDocModal';

export default function BookingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isKeuangan } = useAuth();
  const [booking, setBooking]       = useState(null);
  const [pembayaran, setPembayaran] = useState([]);
  const [docs, setDocs]             = useState({ outgoing: null, return: null });
  const [loading, setLoading]       = useState(true);

  const [outgoingDocModalOpen, setOutgoingDocModalOpen] = useState(false);
  const [returnDocModalOpen, setReturnDocModalOpen] = useState(false);

  useEffect(() => { fetchBooking(); }, [id]);

  useEffect(() => {
    if (!loading && booking && searchParams.get('print') === 'true') {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [loading, booking, searchParams]);

  const fetchBooking = async () => {
    try {
      const [bRes, pRes, docRes] = await Promise.all([
        api.get(`/bookings/${id}`),
        api.get(`/pembayaran?booking_id=${id}`).catch(() => ({ data: { data: [] } })),
        api.get(`/rental/document/booking/${id}`).catch(() => ({ data: { data: { outgoing: null, return: null } } })),
      ]);
      setBooking(bRes.data.data);
      setPembayaran(pRes.data.data || []);
      setDocs(docRes.data?.data || { outgoing: null, return: null });
      setLoading(false);
    } catch {
      navigate('/admin/bookings');
    }
  };

  const [cancelModal, setCancelModal] = useState({ open: false, reason: '', type: '' });
  const [submittingCancel, setSubmittingCancel] = useState(false);

  if (loading) return <AppLayout><LoadingSpinner className="py-16" /></AppLayout>;
  if (!booking) return null;

  const durasi     = Math.max(1, (new Date(booking.tanggal_selesai) - new Date(booking.tanggal_mulai)) / 86400000 + 1);
  const sudahBayar = pembayaran.some(p => ['menunggu', 'lunas'].includes(p.status));
  const bisaBayar  = booking.status === 'pending' && !sudahBayar;

  const formatVal = (val) => {
    if (val === undefined || val === null || isNaN(Number(val))) return null;
    return `Rp ${Number(val).toLocaleString('id-ID')}`;
  };

  const hasPrices = isKeuangan && booking.total_harga !== undefined && !isNaN(Number(booking.total_harga));

  const handleDirectDownloadOutgoing = async () => {
    if (docs.outgoing?.id) {
      const downloadUrl = `${IMAGE_BASE.replace('/uploads', '')}/api/rental/document/${docs.outgoing.id}/download`;
      window.open(downloadUrl, '_blank');
      return;
    }
    try {
      const custSig = booking?.pickup?.pickup_signature || booking?.pickups?.[0]?.pickup_signature || '';
      if (!custSig) {
        setOutgoingDocModalOpen(true);
        return;
      }
      toast.loading('Menyiapkan file PDF Serah Terima...', { id: 'pdf' });
      const payload = {
        rental_id: booking.id,
        booking_id: booking.id,
        customer_signature: custSig,
        admin_signature: custSig,
        catatan_kondisi: booking.pickup?.pickup_notes || '',
        condition_data: { kondisi_baik: true },
      };
      const res = await api.post('/rental/document/outgoing/sign', payload);
      toast.dismiss('pdf');
      if (res.data?.data?.id) {
        const downloadUrl = `${IMAGE_BASE.replace('/uploads', '')}/api/rental/document/${res.data.data.id}/download`;
        window.open(downloadUrl, '_blank');
        fetchBooking();
      }
    } catch (err) {
      toast.dismiss('pdf');
      setOutgoingDocModalOpen(true);
    }
  };

  const handleDirectDownloadReturn = async () => {
    if (docs.return?.id) {
      const downloadUrl = `${IMAGE_BASE.replace('/uploads', '')}/api/rental/document/${docs.return.id}/download`;
      window.open(downloadUrl, '_blank');
      return;
    }
    try {
      const custSig = booking?.return?.return_signature || booking?.returns?.[0]?.return_signature || booking?.pickup?.pickup_signature || '';
      if (!custSig) {
        setReturnDocModalOpen(true);
        return;
      }
      toast.loading('Menyiapkan file PDF Pengembalian...', { id: 'pdf' });
      const fd = new FormData();
      fd.append('rental_id', booking.id);
      fd.append('booking_id', booking.id);
      fd.append('customer_signature', custSig);
      fd.append('admin_signature', custSig);
      fd.append('catatan_admin', booking.return?.return_notes || booking.return?.damage_notes || '');
      fd.append('checklists', JSON.stringify({ alat_sesuai: true }));
      const res = await api.post('/rental/document/return/sign', fd);
      toast.dismiss('pdf');
      if (res.data?.data?.id) {
        const downloadUrl = `${IMAGE_BASE.replace('/uploads', '')}/api/rental/document/${res.data.data.id}/download`;
        window.open(downloadUrl, '_blank');
        fetchBooking();
      }
    } catch (err) {
      toast.dismiss('pdf');
      setReturnDocModalOpen(true);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <AppLayout title={`Formulir Penyewaan Alat #${booking.kode_booking}`}>
      <div className="animate-fade-in max-w-4xl mx-auto space-y-6">
        {/* Navigation & Print Actions */}
        <div className="flex items-center justify-between print:hidden">
          <button onClick={() => navigate('/admin/bookings')}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm font-bold transition-colors cursor-pointer">
            <ArrowLeft className="h-4 w-4" /> Kembali ke Data Booking
          </button>

          <div className="flex items-center gap-2">
            {/* TOMBOL PDF PENYERAHAN */}
            {(docs.return || ['SELESAI', 'SELESAI_DISEWA', 'BARANG_KEMBALI', 'PEMERIKSAAN', 'selesai'].includes(booking.status)) ? (
              <button
                onClick={handleDirectDownloadReturn}
                className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                title="Download PDF Penyerahan / Pengembalian"
              >
                <Download className="h-4 w-4 text-slate-700" /> PDF Penyerahan
              </button>
            ) : (
              <button
                onClick={handleDirectDownloadOutgoing}
                className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                title="Download PDF Penyerahan"
              >
                <Download className="h-4 w-4 text-slate-700" /> PDF Penyerahan
              </button>
            )}
          </div>
        </div>

        {/* PRINTABLE FORMULIR PENYEWAAN ALAT */}
        <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-xl print:shadow-none print:border-none print:p-0 space-y-6">

          {/* Header Document */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b-2 border-slate-900 pb-5 gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white print:hidden">
                  <FileCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">PT SCAL TECHNIC SERVICES</p>
                  <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">Formulir Penyewaan Alat Resmi</h1>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1 font-mono">Kode Transaksi: <span className="font-bold text-gray-900">{booking.kode_booking}</span></p>
            </div>

            <div className="text-right sm:text-right">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                ['SELESAI_DISEWA', 'selesai', 'PAID'].includes(booking.status) ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'
              }`}>
                Status: {booking.status}
              </span>
              <p className="text-xs text-gray-500 mt-1">Tanggal: {new Date(booking.tanggal_booking).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
          </div>


          {/* SECTION A: Data Identitas Penyewa (Customer) */}
          <div className="space-y-3">
            <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide border-b border-gray-200 pb-1.5 flex items-center gap-2">
              <User className="h-4 w-4 text-indigo-600 print:hidden" /> A. Data Identitas Penyewa (Customer)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 text-xs text-slate-800">
              <div><span className="text-gray-500 font-medium">Nama Lengkap (KTP/KITAS):</span> <strong className="block text-sm text-slate-900">{booking.customer?.full_name || booking.user?.nama || '-'}</strong></div>
              <div><span className="text-gray-500 font-medium">NIK / No. Identitas:</span> <strong className="block text-sm text-slate-900 font-mono">{booking.customer?.identity_number || booking.user?.nik || '-'}</strong></div>
              <div><span className="text-gray-500 font-medium">Nomor HP / WhatsApp:</span> <span className="block font-semibold">{booking.customer?.phone || booking.user?.no_hp || '-'}</span></div>
              <div><span className="text-gray-500 font-medium">Alamat Email:</span> <span className="block font-semibold">{booking.customer?.email || booking.user?.email || '-'}</span></div>
              <div className="sm:col-span-2"><span className="text-gray-500 font-medium">Alamat Domisili/Tinggal:</span> <span className="block font-medium">{booking.customer?.address || booking.user?.alamat || '-'}</span></div>
              {booking.pengambil_nama && (
                <div className="sm:col-span-2 p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1 text-xs">
                  <div>
                    <span className="text-gray-500 font-medium block">Nama Pengambil Barang:</span>
                    <strong className="text-indigo-900 font-bold">{booking.pengambil_nama}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 font-medium block">No. HP Pengambil:</span>
                    <strong className="text-indigo-900 font-bold">{booking.pengambil_no_hp || '-'}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 font-medium block">Hubungan:</span>
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 font-bold rounded-md uppercase text-[10px]">
                      {booking.pengambil_hubungan || 'Karyawan'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>


          {/* SECTION B: Detail Alat yang Disewa */}
          <div className="space-y-3">
            <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide border-b border-gray-200 pb-1.5 flex items-center gap-2">
              <Package className="h-4 w-4 text-indigo-600 print:hidden" /> B. Detail Alat yang Disewa
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-gray-200 rounded-xl overflow-hidden">
                <thead className="bg-slate-100 text-slate-900 font-bold border-b border-gray-200">
                  <tr>
                    <th className="p-2.5">Jenis / Nama Alat</th>
                    <th className="p-2.5">Kode Alat</th>
                    <th className="p-2.5">Tanggal Sewa</th>
                    <th className="p-2.5 text-center">Jumlah</th>
                    <th className="p-2.5">Kelengkapan</th>
                    {hasPrices && <th className="p-2.5 text-right">Subtotal</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {booking.details?.map(d => {
                    const itemMulai = d.tanggal_mulai ? new Date(d.tanggal_mulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-';
                    const itemSelesai = d.tanggal_selesai ? new Date(d.tanggal_selesai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
                    return (
                      <tr key={d.id} className="hover:bg-slate-50/50">
                        <td className="p-2.5 font-bold text-slate-900">{d.alat?.nama_alat}</td>
                        <td className="p-2.5 font-mono text-gray-600">{d.alat?.kode_alat || '-'}</td>
                        <td className="p-2.5 font-medium">{itemMulai} – {itemSelesai}</td>
                        <td className="p-2.5 text-center font-bold">{d.qty} Unit</td>
                        <td className="p-2.5 text-gray-600">{d.kelengkapan || 'Unit utama & aksesoris'}</td>
                        {hasPrices && (
                          <td className="p-2.5 text-right font-bold text-slate-900">
                            {formatVal(d.subtotal) || '-'}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>


          {/* SECTION C: Waktu dan Durasi Sewa */}
          <div className="space-y-3">
            <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide border-b border-gray-200 pb-1.5 flex items-center gap-2">
              <Clock className="h-4 w-4 text-indigo-600 print:hidden" /> C. Waktu dan Durasi Sewa
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-gray-200">
              <div>
                <span className="text-gray-500 font-medium">Tanggal & Jam Mulai:</span>
                <p className="font-bold text-slate-900 text-sm mt-0.5">
                  {new Date(booking.tanggal_mulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} — Pukul {booking.jam_mulai || '09:00'} WIB
                </p>
              </div>
              <div>
                <span className="text-gray-500 font-medium">Tanggal & Jam Selesai:</span>
                <p className="font-bold text-slate-900 text-sm mt-0.5">
                  {new Date(booking.tanggal_selesai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} — Pukul {booking.jam_selesai || '17:00'} WIB
                </p>
              </div>
              <div>
                <span className="text-gray-500 font-medium">Total Rentang Sewa:</span>
                <p className="font-bold text-indigo-700 text-sm mt-0.5">{durasi} Hari</p>
              </div>
            </div>
          </div>




        </div>

        <Modal isOpen={cancelModal.open} onClose={() => setCancelModal({ open: false, reason: '', type: '' })} title="Konfirmasi Batalkan Booking">
          <div className="space-y-4 text-center py-2">
            <p className="text-sm text-gray-700">Apakah Anda yakin ingin membatalkan transaksi booking <strong>{booking.kode_booking}</strong>?</p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setCancelModal({ open: false, reason: '', type: '' })} className="btn-secondary flex-1">Tidak, Kembali</button>
              <button
                onClick={async () => {
                  setSubmittingCancel(true);
                  try {
                    await api.patch(`/bookings/${booking.id}/status`, { status: 'dibatalkan' });
                    toast.success('Booking berhasil dibatalkan');
                    setCancelModal({ open: false, reason: '', type: '' });
                    fetchBooking();
                  } catch (err) {
                    toast.error(err.response?.data?.message || 'Gagal membatalkan');
                  }
                  setSubmittingCancel(false);
                }}
                className="btn-danger flex-1"
                disabled={submittingCancel}
              >
                {submittingCancel ? 'Memproses...' : 'Ya, Batalkan'}
              </button>
            </div>
          </div>
        </Modal>

        {/* MODALS DOKUMEN DIGITAL */}
        <OutgoingDocModal
          isOpen={outgoingDocModalOpen}
          onClose={() => setOutgoingDocModalOpen(false)}
          booking={booking}
          existingDoc={docs.outgoing}
          onSuccess={() => fetchBooking()}
        />

        <ReturnDocModal
          isOpen={returnDocModalOpen}
          onClose={() => setReturnDocModalOpen(false)}
          booking={booking}
          existingDoc={docs.return}
          onSuccess={() => fetchBooking()}
        />
      </div>
    </AppLayout>
  );
}
