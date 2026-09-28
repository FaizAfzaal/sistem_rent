import { useState, useEffect } from 'react';
import api, { IMAGE_BASE } from '../../lib/api';
import toast from 'react-hot-toast';
import { FileText, Download, CheckCircle, Clock, ShieldCheck, PlusCircle, FileCheck, Eye } from 'lucide-react';
import OutgoingDocModal from './OutgoingDocModal';
import ReturnDocModal from './ReturnDocModal';

export default function DigitalDocsCard({ booking, onRefresh }) {
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState({ outgoing: null, return: null });

  // Modals state
  const [outgoingModalOpen, setOutgoingModalOpen] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);

  useEffect(() => {
    if (booking?.id) {
      fetchDocuments();
    }
  }, [booking?.id]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/rental/document/booking/${booking.id}`);
      setDocs(res.data.data);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    }
    setLoading(false);
  };

  if (!booking) return null;

  const handleDownload = (doc) => {
    if (!doc || !doc.pdf_path) {
      return toast.error('File PDF belum tersedia!');
    }
    
    let pdfUrl = '';
    if (doc.pdf_path.startsWith('http')) {
      pdfUrl = doc.pdf_path;
    } else {
      // Stream/Download API
      pdfUrl = `${IMAGE_BASE.replace('/uploads', '')}/api/rental/document/${doc.id}/download`;
    }
    
    window.open(pdfUrl, '_blank');
  };

  const isReturnReadyOrDone = ['BARANG_KEMBALI', 'PEMERIKSAAN', 'SELESAI', 'SELESAI_DISEWA', 'selesai', 'RETURN_ACCEPTED', 'SIAP_KEMBALI'].includes(booking.status) || !!booking.return;

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xl space-y-5 print:hidden">
      
      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600/10 rounded-2xl flex items-center justify-center text-indigo-600">
            <FileCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-tight">Dokumen Digital Resmi</h3>
            <p className="text-xs text-slate-500">Tanda Tangan Elektronik & Generate PDF Otomatis</p>
          </div>
        </div>

        <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-100">
          Workflow Digital
        </span>
      </div>

      {loading ? (
        <div className="py-6 text-center text-xs text-slate-400 font-medium">Memuat data dokumen digital...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* DOKUMEN 1: SERAH TERIMA BARANG KELUAR */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase text-indigo-600 tracking-wider">FITUR 1</span>
                {docs.outgoing ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-600" /> Sudah Ditandatangani
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold">
                    <Clock className="h-3.5 w-3.5 text-slate-500" /> Belum dibuat
                  </span>
                )}
              </div>

              <h4 className="font-extrabold text-slate-900 text-sm">Dokumen Serah Terima Keluar</h4>
              <p className="text-xs text-slate-500 mt-1">
                Berita Acara Serah Terima Barang ketika unit alat berat diserahkan kepada penyewa.
              </p>

              {docs.outgoing && (
                <div className="mt-3 p-2.5 bg-white rounded-xl border border-slate-200 text-[11px] text-slate-600 font-mono">
                  No: <strong className="text-slate-900">{docs.outgoing.document_number}</strong>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200/80 flex items-center gap-2">
              {docs.outgoing ? (
                <>
                  <button
                    onClick={() => handleDownload(docs.outgoing)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" /> Download PDF
                  </button>
                  <button
                    onClick={() => setOutgoingModalOpen(true)}
                    className="flex items-center justify-center p-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
                    title="Lihat / Edit Dokumen"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setOutgoingModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer"
                >
                  <PlusCircle className="h-4 w-4" /> Buat Dokumen Serah Terima
                </button>
              )}
            </div>
          </div>

          {/* DOKUMEN 2: PENGEMBALIAN BARANG */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase text-indigo-600 tracking-wider">FITUR 2</span>
                {docs.return ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-600" /> Sudah Ditandatangani
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg text-xs font-bold">
                    <Clock className="h-3.5 w-3.5 text-amber-600" />
                    {isReturnReadyOrDone ? 'Siap Dibuat' : 'Menunggu pengembalian'}
                  </span>
                )}
              </div>

              <h4 className="font-extrabold text-slate-900 text-sm">Dokumen Pengembalian</h4>
              <p className="text-xs text-slate-500 mt-1">
                Berita Acara Pengembalian Barang saat unit alat berat dikembalikan dan diperiksa admin.
              </p>

              {docs.return && (
                <div className="mt-3 p-2.5 bg-white rounded-xl border border-slate-200 text-[11px] text-slate-600 font-mono">
                  No: <strong className="text-slate-900">{docs.return.document_number}</strong>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200/80 flex items-center gap-2">
              {docs.return ? (
                <>
                  <button
                    onClick={() => handleDownload(docs.return)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" /> Download PDF
                  </button>
                  <button
                    onClick={() => setReturnModalOpen(true)}
                    className="flex items-center justify-center p-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
                    title="Lihat / Edit Dokumen"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setReturnModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer"
                >
                  <PlusCircle className="h-4 w-4" /> Buat Dokumen Pengembalian
                </button>
              )}
            </div>
          </div>

        </div>
      )}

      {/* Modals */}
      <OutgoingDocModal
        isOpen={outgoingModalOpen}
        onClose={() => setOutgoingModalOpen(false)}
        booking={booking}
        existingDoc={docs.outgoing}
        onSuccess={() => {
          fetchDocuments();
          if (onRefresh) onRefresh();
        }}
      />

      <ReturnDocModal
        isOpen={returnModalOpen}
        onClose={() => setReturnModalOpen(false)}
        booking={booking}
        existingDoc={docs.return}
        onSuccess={() => {
          fetchDocuments();
          if (onRefresh) onRefresh();
        }}
      />

    </div>
  );
}
