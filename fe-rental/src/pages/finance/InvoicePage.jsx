import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import Modal from '../../components/common/Modal';
import SignaturePad from '../../components/common/SignaturePad';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import html2pdf from 'html2pdf.js';
import { useAuth } from '../../contexts/AuthContext';
import {
  FileText, Download, Printer, Send, Wrench, CheckCircle2,
  Calendar, User, CreditCard, Mail, Phone, MapPin, ArrowLeft, Search,
  Clock, AlertCircle, DollarSign, XCircle, Bell, History, ShieldCheck, Check, Edit3,
  MoreVertical, Filter, ChevronLeft, ChevronRight, Copy, RotateCcw
} from 'lucide-react';

function formatPeriode(startDateStr, endDateStr) {
  if (!startDateStr) return '-';

  const start = new Date(startDateStr);
  const end = endDateStr ? new Date(endDateStr) : start;

  const startFormatted = !isNaN(start.getTime())
    ? start.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : startDateStr;

  const endFormatted = !isNaN(end.getTime())
    ? end.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : (endDateStr || startFormatted);

  return `${startFormatted} - ${endFormatted}`;
}

export default function InvoicePage() {
  const { user: currentUser } = useAuth();
  const isFinanceAdmin = currentUser && (
    ['admin', 'keuangan', 'finance', 'admin_finance'].includes((currentUser.role?.nama_role || '').toLowerCase()) ||
    [1, 3].includes(Number(currentUser.role_id))
  );

  const [searchParams] = useSearchParams();
  const requestedKode = searchParams.get('kode');

  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sendChannel, setSendChannel] = useState('email');

  // Custom Admin Finance Signature State
  const [customFinanceSign, setCustomFinanceSign] = useState(localStorage.getItem('finance_admin_signature') || null);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [tempSignature, setTempSignature] = useState('');

  // Modals
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [isConfirmPayOpen, setIsConfirmPayOpen] = useState(false);
  const [isRecordPayOpen, setIsRecordPayOpen] = useState(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  // Form states
  const [recordAmount, setRecordAmount] = useState('');
  const [recordMethod, setRecordMethod] = useState('Transfer Bank');
  const [recordDate, setRecordDate] = useState(new Date().toISOString().split('T')[0]);
  const [recordFile, setRecordFile] = useState(null);
  const [recordNotes, setRecordNotes] = useState('');
  const [cancelReason, setCancelReason] = useState('');

  // Payment histories & loading state
  const [paymentHistories, setPaymentHistories] = useState([]);
  const [isSubmittingPay, setIsSubmittingPay] = useState(false);

  // Filter & Pagination States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      // Search filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchNo = (inv.invoice_no || '').toLowerCase().includes(term);
        const matchCust = (inv.customer_name || '').toLowerCase().includes(term);
        const matchBk = (inv.kode_booking || '').toLowerCase().includes(term);
        const matchComp = (inv.customer_company || '').toLowerCase().includes(term);
        if (!matchNo && !matchCust && !matchBk && !matchComp) return false;
      }

      // Status filter
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'BELUM_BAYAR' && inv.status !== 'WAITING PAYMENT') return false;
        if (statusFilter === 'SEBAGIAN' && inv.status !== 'DP PAID') return false;
        if (statusFilter === 'LUNAS' && inv.status !== 'PAID') return false;
      }

      // Date filter
      if (dateFilter !== 'ALL' && inv.raw_date) {
        const invDate = new Date(inv.raw_date);
        const now = new Date();
        if (dateFilter === 'TODAY') {
          if (invDate.toDateString() !== now.toDateString()) return false;
        } else if (dateFilter === 'THIS_WEEK') {
          const diffDays = (now - invDate) / (1000 * 3600 * 24);
          if (diffDays > 7 || diffDays < 0) return false;
        } else if (dateFilter === 'THIS_MONTH') {
          if (invDate.getMonth() !== now.getMonth() || invDate.getFullYear() !== now.getFullYear()) return false;
        }
      }

      return true;
    });
  }, [invoices, searchTerm, statusFilter, dateFilter]);

  const itemsPerPage = 8;
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage) || 1;
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredInvoices.slice(start, start + itemsPerPage);
  }, [filteredInvoices, currentPage]);

  const activeInvoice = useMemo(() => {
    if (selectedInvoice && filteredInvoices.some(i => (i.id ? i.id === selectedInvoice.id : i.invoice_no === selectedInvoice.invoice_no))) {
      return selectedInvoice;
    }
    return filteredInvoices.length > 0 ? filteredInvoices[0] : selectedInvoice;
  }, [filteredInvoices, selectedInvoice]);

  useEffect(() => {
    fetchInvoices();
  }, [requestedKode]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await api.get('/bookings');
      if (res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
        // Filter out cancelled bookings automatically
        const activeBookings = res.data.data.filter(b => b.status !== 'dibatalkan');

        // Fetch invoice DB IDs to pair with bookings
        let dbInvoiceMap = {};
        try {
          const invListRes = await api.get('/invoices?size=200');
          if (invListRes.data?.data) {
            invListRes.data.data.forEach(inv => {
              dbInvoiceMap[inv.booking_id] = inv.id_invoice;
            });
          }
        } catch (e) {
          console.error('Invoice DB map fetch error:', e);
        }

        const liveInvoices = activeBookings.map((b) => {
          const dbInvoiceId = dbInvoiceMap[b.id] || b.invoice?.id_invoice || b.id;
          const durasiHari = (b.tanggal_mulai && b.tanggal_selesai)
            ? Math.max(1, Math.round((new Date(b.tanggal_selesai) - new Date(b.tanggal_mulai)) / (1000 * 60 * 60 * 24)) + 1)
            : (b.details && b.details[0]?.tanggal_mulai && b.details[0]?.tanggal_selesai
                ? Math.max(1, Math.round((new Date(b.details[0].tanggal_selesai) - new Date(b.details[0].tanggal_mulai)) / (1000 * 60 * 60 * 24)) + 1)
                : (b.total_hari || 1));
          const totalHargaFromDb = Number(b.total_harga || 0);

          let items = [];
          if (b.details && b.details.length > 0) {
            items = b.details.map((d, i) => {
              const namaAlat = d.alat?.nama_alat || 'Alat Rental';
              const qtyVal = Number(d.qty || 1);
              const itemDurasi = d.tanggal_mulai && d.tanggal_selesai
                ? Math.max(1, Math.round((new Date(d.tanggal_selesai) - new Date(d.tanggal_mulai)) / (1000 * 60 * 60 * 24)) + 1)
                : durasiHari;

              const subtotalItem = Number(d.subtotal || 0) > 0
                ? Number(d.subtotal)
                : (b.details.length === 1 ? totalHargaFromDb : 0);

              const hargaSatuan = Number(d.harga || d.harga_per_hari || d.harga_sewa || d.alat?.harga_sewa || 0) > 0
                ? Number(d.harga || d.harga_per_hari || d.harga_sewa || d.alat?.harga_sewa)
                : (itemDurasi > 0 && qtyVal > 0 ? Math.round(subtotalItem / (qtyVal * itemDurasi)) : subtotalItem);

              const finalItemTotal = subtotalItem > 0 ? subtotalItem : (hargaSatuan * qtyVal * itemDurasi);

              return {
                no: i + 1,
                desc: `${namaAlat} ${d.alat?.kode_alat ? `(${d.alat.kode_alat})` : ''}`,
                unit_qty: qtyVal,
                periode: formatPeriode(d.tanggal_mulai || b.tanggal_mulai, d.tanggal_selesai || b.tanggal_selesai),
                durasi_hari: itemDurasi,
                qty: `${qtyVal} Unit (${itemDurasi} Hari)`,
                harga: hargaSatuan,
                total: finalItemTotal
              };
            });

            if (items.length === 1 && totalHargaFromDb > 0) {
              items[0].total = totalHargaFromDb;
              if (items[0].harga <= 0) {
                items[0].harga = Math.round(totalHargaFromDb / (items[0].unit_qty * durasiHari || 1));
              }
            }
          } else {
            items = [
              {
                no: 1,
                desc: 'Alat Rental Heavy Equipment',
                unit_qty: 1,
                periode: formatPeriode(b.tanggal_mulai, b.tanggal_selesai),
                durasi_hari: durasiHari,
                qty: `1 Unit (${durasiHari} Hari)`,
                harga: Math.round(totalHargaFromDb / durasiHari),
                total: totalHargaFromDb
              }
            ];
          }

          const finalTotalTagihan = totalHargaFromDb > 0 ? totalHargaFromDb : items.reduce((acc, it) => acc + Number(it.total || 0), 0);
          const subtotalVal = finalTotalTagihan;
          const ppnVal = 0;

          const isLunas = b.status_pembayaran === 'lunas' || b.status === 'selesai' || b.invoice?.status_pembayaran === 'LUNAS';
          const isDpLunas = b.status_pembayaran === 'dp_lunas' || b.invoice?.status_pembayaran === 'DP_DITERIMA';

          const sisaDb = b.sisa_pembayaran !== undefined && b.sisa_pembayaran !== null
            ? Number(b.sisa_pembayaran)
            : (b.invoice?.dp ? Math.max(0, finalTotalTagihan - Number(b.invoice.dp)) : finalTotalTagihan);

          let sudahBayar = 0;
          if (isLunas) {
            sudahBayar = finalTotalTagihan;
          } else if (b.invoice && Number(b.invoice.dp) > 0) {
            sudahBayar = Number(b.invoice.dp);
          } else if (sisaDb < finalTotalTagihan) {
            sudahBayar = Math.max(0, finalTotalTagihan - sisaDb);
          } else if (b.jumlah_dp && isDpLunas) {
            sudahBayar = Number(b.jumlah_dp);
          }

          const sisaTagihan = isLunas ? 0 : Math.max(0, finalTotalTagihan - sudahBayar);

          let displayStatus = 'WAITING PAYMENT';
          if (isLunas || sisaTagihan <= 0) {
            displayStatus = 'PAID';
          } else if (isDpLunas || sudahBayar > 0) {
            displayStatus = 'DP PAID';
          }

          const alatNamesCombined = (b.details && b.details.length > 0)
            ? b.details.map(d => d.alat?.nama_alat).filter(Boolean).join(', ')
            : 'Alat Rental Heavy Equipment';

          return {
            id: b.id,
            raw_date: b.created_at || b.tanggal_booking || new Date(),
            db_id: dbInvoiceId,
            invoice_no: b.invoice?.nomor_invoice || `INV-2026-${String(b.id).padStart(3, '0')}`,
            kode_booking: b.kode_booking || `BK2607285660`,
            customer_name: b.customer?.full_name || b.user?.nama || 'Customer Rental',
            customer_company: b.customer?.company_name || (b.user?.alamat ? `PT ${b.user.nama}` : 'Customer Enterprise'),
            customer_email: b.customer?.email || b.user?.email || 'customer@rentalhub.id',
            customer_phone: b.customer?.phone || b.user?.no_hp || '081234567890',
            customer_address: b.customer?.address || b.user?.alamat || 'Alamat Customer',
            alat_name: alatNamesCombined,
            periode_sewa: formatPeriode(b.tanggal_mulai, b.tanggal_selesai),
            durasi_hari: durasiHari,
            tanggal_invoice: b.created_at ? new Date(b.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-',
            jatuh_tempo: '5 Agustus 2026',
            status: displayStatus,
            items: items,
            subtotal: subtotalVal,
            ppn: ppnVal,
            total_tagihan: finalTotalTagihan,
            sudah_bayar: sudahBayar,
            sisa_tagihan: sisaTagihan,
            booking_admin_name: 'Administrator',
            booking_admin_id: 'ADM-BKG-001',
            finance_admin_name: 'Admin Finance',
            finance_admin_id: 'FIN-ADM-008',
            return_name: b.return?.return_name || b.customer?.full_name || b.user?.nama || 'Customer',
            return_phone: b.return?.return_phone || b.customer?.phone || b.user?.no_hp || '-',
            return_date: b.return?.return_date || b.tanggal_selesai || '-',
            tanda_tangan_return: b.return?.return_signature || b.pickup?.pickup_signature || null,
            tanda_tangan_customer: b.return?.return_signature || b.pickup?.pickup_signature || null,
            tanda_tangan_admin: null,
            payment_history: sudahBayar > 0 ? [
              {
                date: b.created_at ? new Date(b.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-',
                title: isLunas ? 'Pelunasan Diterima' : 'DP Diterima',
                amount: sudahBayar,
                method: 'Transfer Bank'
              }
            ] : []
          };
        });

        setInvoices(liveInvoices);
        const match = requestedKode ? liveInvoices.find(i => i.kode_booking === requestedKode || i.invoice_no === requestedKode) : liveInvoices[0];
        setSelectedInvoice(match || liveInvoices[0] || null);
      } else {
        setInvoices([]);
        setSelectedInvoice(null);
      }
    } catch {
      setInvoices([]);
      setSelectedInvoice(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeInvoice && activeInvoice.db_id) {
      fetchPaymentHistories(activeInvoice.db_id);
    }
  }, [activeInvoice?.db_id]);

  const fetchPaymentHistories = async (invoiceId) => {
    try {
      const res = await api.get(`/invoices/${invoiceId}/history`);
      if (res.data?.data && Array.isArray(res.data.data)) {
        setPaymentHistories(res.data.data);
      }
    } catch (err) {
      console.error('Gagal mengambil history pembayaran:', err);
    }
  };

  // Direct PDF Download using html2pdf.js
  const handleDownloadPDF = () => {
    if (!activeInvoice) return;
    const element = document.getElementById('invoice-paper');
    if (!element) {
      toast.error('Elemen invoice tidak ditemukan');
      return;
    }

    toast.success(`Mendownload berkas ${activeInvoice.invoice_no}.pdf...`);

    const opt = {
      margin:       0.3,
      filename:     `${activeInvoice.invoice_no}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, logging: false },
      jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
  };

  const handlePrint = () => {
    window.print();
  };

  const handleConfirmMarkAsPaid = async () => {
    if (!activeInvoice) return;
    setIsSubmittingPay(true);
    try {
      let invId = activeInvoice.db_id;
      if (!invId) {
        const invRes = await api.get(`/invoices/booking/${activeInvoice.id}`);
        invId = invRes.data?.data?.id_invoice;
      }

      await api.post(`/invoices/${invId}/pay-full`, {
        metode_pembayaran: recordMethod || 'Transfer Bank',
        catatan: 'Pelunasan dikonfirmasi oleh Admin Finance',
      });

      toast.success('Pembayaran berhasil diselesaikan');
      setIsConfirmPayOpen(false);

      // Update active invoice state locally for immediate UI update
      setActiveInvoice(prev => prev ? ({ ...prev, status_pembayaran: 'LUNAS', status: 'PAID' }) : null);

      await fetchInvoices();
      if (invId) await fetchPaymentHistories(invId);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Terdapat masalah saat memperbarui pembayaran');
    } finally {
      setIsSubmittingPay(false);
    }
  };

  const handleRecordPaymentSubmit = async (e) => {
    e.preventDefault();
    if (!activeInvoice) return;
    if (!recordAmount || Number(recordAmount) <= 0) {
      toast.error('Masukkan nominal pembayaran yang valid');
      return;
    }

    setIsSubmittingPay(true);
    try {
      let invId = activeInvoice.db_id;
      if (!invId) {
        const invRes = await api.get(`/invoices/booking/${activeInvoice.id}`);
        invId = invRes.data?.data?.id_invoice;
      }

      const formData = new FormData();
      formData.append('nominal', recordAmount);
      formData.append('metode_pembayaran', recordMethod);
      formData.append('tanggal_pembayaran', recordDate);
      formData.append('catatan', recordNotes);
      if (recordFile) {
        formData.append('bukti_pembayaran', recordFile);
      }

      await api.post(`/invoices/${invId}/record-payment`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success(`✓ Pembayaran Rp ${Number(recordAmount).toLocaleString('id-ID')} berhasil dicatat!`);
      setIsRecordPayOpen(false);
      setRecordAmount('');
      setRecordNotes('');
      setRecordFile(null);
      await fetchInvoices();
      if (invId) await fetchPaymentHistories(invId);
    } catch (err) {
      toast.error(err.response?.data?.message || '✕ Terjadi kesalahan saat memperbarui pembayaran.');
    } finally {
      setIsSubmittingPay(false);
    }
  };

  const handleSendReminder = () => {
    if (!activeInvoice) return;
    toast.success(`Pengingat pembayaran invoice ${activeInvoice.invoice_no} dikirim ke ${activeInvoice.customer_email}`);
    setIsReminderModalOpen(false);
  };

  const handleCancelInvoice = async () => {
    if (!activeInvoice) return;
    try {
      await api.patch(`/bookings/${activeInvoice.id}/status`, {
        status: 'dibatalkan',
        alasan_pembatalan: cancelReason || 'Faktur dibatalkan oleh Finance Admin'
      });
      toast.success(`Faktur #${activeInvoice.invoice_no} berhasil dibatalkan & otomatis dihapus dari daftar faktur.`);
      setIsCancelModalOpen(false);
      setCancelReason('');
      fetchInvoices();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal membatalkan faktur');
    }
  };

  const handleSendInvoiceSubmit = (e) => {
    e.preventDefault();
    if (!activeInvoice) return;
    const dest = sendChannel === 'email' ? activeInvoice.customer_email : activeInvoice.customer_phone;
    toast.success(`Invoice ${activeInvoice.invoice_no} berhasil dikirim ke ${dest}!`);
    setIsSendModalOpen(false);
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'PAID':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'WAITING PAYMENT':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'OVERDUE':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-700 border-gray-300';
      default:
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="p-12 text-center bg-white rounded-2xl border border-gray-100 shadow-sm space-y-4 max-w-md mx-auto my-16 animate-pulse">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
            <Clock className="h-6 w-6 animate-spin" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-800">Memuat Data Invoice...</h3>
            <p className="text-xs text-gray-400 mt-1">Harap tunggu sebentar, sistem sedang menyinkronkan data invoice.</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!loading && (invoices.length === 0 || !activeInvoice)) {
    return (
      <AppLayout>
        <div className="p-12 text-center bg-white rounded-2xl border border-gray-100 shadow-sm space-y-3 max-w-md mx-auto my-16">
          <FileText className="h-12 w-12 text-gray-300 mx-auto" />
          <h3 className="text-lg font-bold text-gray-700">Belum ada invoice tersedia</h3>
          <p className="text-xs text-gray-400">Invoice akan otomatis terbuat saat Admin Booking membuat booking sewa alat.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in pb-16">
        {/* Top Header Navigation Area */}
        <div className="print:hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Kelola Invoice Keuangan</h1>
            <p className="text-sm text-gray-500">
              Generate & cetak invoice resmi otomatis untuk customer rental.
            </p>
          </div>
        </div>

        {/* MAIN 2-PANEL LAYOUT (LEFT LIST SIDEBAR & RIGHT DETAIL DOCUMENT) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT PANEL: DAFTAR INVOICE SIDEBAR (4 Cols) */}
          <div className="print:hidden lg:col-span-4 bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-base font-black text-gray-900 tracking-tight">Daftar Invoice</h2>
                <p className="text-[11px] text-gray-500">Kelola tagihan sewa customer</p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-extrabold border border-indigo-100">
                {filteredInvoices.length} Invoice
              </span>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Cari invoice / customer / booking..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>

            {/* Filters Row (Status & Tanggal) */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={e => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 focus:bg-white"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="BELUM_BAYAR">Belum Bayar</option>
                  <option value="SEBAGIAN">Sebagian Bayar</option>
                  <option value="LUNAS">Lunas</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Tanggal</label>
                <select
                  value={dateFilter}
                  onChange={e => {
                    setDateFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 focus:bg-white"
                >
                  <option value="ALL">Semua Tanggal</option>
                  <option value="TODAY">Hari Ini</option>
                  <option value="THIS_WEEK">Minggu Ini</option>
                  <option value="THIS_MONTH">Bulan Ini</option>
                </select>
              </div>
            </div>

            {/* Invoice List Cards */}
            <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
              {loading ? (
                /* Skeleton Loading */
                Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-50 rounded-2xl border border-gray-100 animate-pulse space-y-2">
                    <div className="flex justify-between">
                      <div className="h-4 bg-gray-200 rounded w-24"></div>
                      <div className="h-4 bg-gray-200 rounded w-16"></div>
                    </div>
                    <div className="h-3 bg-gray-200 rounded w-32"></div>
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                  </div>
                ))
              ) : paginatedInvoices.length > 0 ? (
                paginatedInvoices.map((inv) => {
                  const isSelected = selectedInvoice && (selectedInvoice.id ? selectedInvoice.id === inv.id : selectedInvoice.invoice_no === inv.invoice_no);
                  return (
                    <div
                      key={inv.id || inv.invoice_no}
                      onClick={() => setSelectedInvoice(inv)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-1.5 ${
                        isSelected
                          ? 'bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-white border-indigo-500 shadow-sm ring-2 ring-indigo-500/20'
                          : 'bg-white border-gray-100 hover:border-indigo-200 hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-extrabold text-xs ${isSelected ? 'text-indigo-900' : 'text-gray-900'}`}>
                          #{inv.invoice_no}
                        </span>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${getStatusBadgeStyle(inv.status)}`}>
                          {inv.status}
                        </span>
                      </div>

                      <div>
                        <p className="font-bold text-gray-900 text-xs truncate">{inv.customer_name}</p>
                        <p className="text-[11px] text-gray-500 truncate">{inv.customer_company || inv.kode_booking}</p>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-xs">
                        <span className="font-mono font-black text-gray-900">
                          Rp {Number(inv.total_tagihan).toLocaleString('id-ID')}
                        </span>
                        <span className={`text-[10px] font-semibold ${inv.sisa_tagihan > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {inv.sisa_tagihan > 0 ? `Sisa: Rp ${Number(inv.sisa_tagihan).toLocaleString('id-ID')}` : '✓ Lunas'}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                /* Empty State */
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-gray-100 space-y-2">
                  <AlertCircle className="h-8 w-8 text-gray-300 mx-auto" />
                  <p className="text-xs font-bold text-gray-700">Belum ada invoice ditemukan</p>
                  <p className="text-[11px] text-gray-400">Coba ubah kata kunci pencarian atau filter status.</p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs font-semibold text-gray-600">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <span>Halaman {currentPage} dari {totalPages}</span>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* RIGHT PANEL: DETAIL INVOICE DOCUMENT & TOP ACTION BAR (8 Cols) */}
          <div className="lg:col-span-8 space-y-4">
            {/* TOP ACTION BAR ABOVE INVOICE PAPER */}
            {selectedInvoice && (
              <div className="print:hidden bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleDownloadPDF}
                    className="px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5 text-indigo-600" /> PDF
                  </button>

                  <button
                    onClick={handlePrint}
                    className="px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                  >
                    <Printer className="h-3.5 w-3.5 text-emerald-600" /> Print
                  </button>

                  <button
                    onClick={() => setIsSendModalOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5 text-indigo-600" /> Kirim
                  </button>

                  <button
                    onClick={() => setIsReminderModalOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                  >
                    <Bell className="h-3.5 w-3.5 text-amber-600" /> Pengingat
                  </button>

                  {/* More Menu Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setShowMoreMenu(!showMoreMenu)}
                      className="p-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <MoreVertical className="h-4 w-4 text-gray-600" />
                    </button>

                    {showMoreMenu && (
                      <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-30 py-1 text-xs">
                        <button
                          onClick={() => {
                            setShowMoreMenu(false);
                            toast.success(`Audit log invoice #${selectedInvoice.invoice_no} dapat dilihat di menu Log Book.`);
                          }}
                          className="w-full text-left px-3.5 py-2 hover:bg-indigo-50 text-gray-700 flex items-center gap-2 font-medium cursor-pointer"
                        >
                          <History className="h-3.5 w-3.5 text-indigo-600" /> Lihat Histori Log
                        </button>
                        <button
                          onClick={() => {
                            setShowMoreMenu(false);
                            toast.success(`Invoice #${selectedInvoice.invoice_no} diduplikasi.`);
                          }}
                          className="w-full text-left px-3.5 py-2 hover:bg-indigo-50 text-gray-700 flex items-center gap-2 font-medium cursor-pointer"
                        >
                          <Copy className="h-3.5 w-3.5 text-blue-600" /> Duplikat Invoice
                        </button>
                        <button
                          onClick={() => {
                            setShowMoreMenu(false);
                            setIsCancelModalOpen(true);
                          }}
                          className="w-full text-left px-3.5 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2 font-bold border-t border-gray-100 cursor-pointer"
                        >
                          <XCircle className="h-3.5 w-3.5 text-red-500" /> Batalkan Invoice
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* PAYMENT BUTTONS IN TOP ACTION BAR */}
                <div className="flex items-center gap-2">
                  {selectedInvoice.status === 'PAID' || selectedInvoice.status === 'LUNAS' ? (
                    <button
                      disabled={true}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1.5 border border-emerald-300 cursor-not-allowed opacity-90"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> ✓ Pembayaran Lunas
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => setIsConfirmPayOpen(true)}
                        disabled={!isFinanceAdmin}
                        className={`px-3.5 py-1.5 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs ${
                          isFinanceAdmin ? 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer' : 'bg-gray-300 cursor-not-allowed'
                        }`}
                        title={!isFinanceAdmin ? 'Hanya Admin Finance yang berhak mengubah pembayaran' : ''}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Tandai Lunas
                      </button>

                      <button
                        onClick={() => setIsRecordPayOpen(true)}
                        disabled={!isFinanceAdmin}
                        className={`px-3.5 py-1.5 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs ${
                          isFinanceAdmin ? 'bg-indigo-600 hover:bg-indigo-700 cursor-pointer' : 'bg-gray-300 cursor-not-allowed'
                        }`}
                        title={!isFinanceAdmin ? 'Hanya Admin Finance yang berhak mencatat pembayaran' : ''}
                      >
                        <DollarSign className="h-3.5 w-3.5" /> Catat Pembayaran
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* INVOICE PAPER DOCUMENT */}
            {activeInvoice ? (
              <div
                id="invoice-paper"
                key={activeInvoice?.id || activeInvoice?.invoice_no}
                className="bg-white rounded-3xl p-8 sm:p-12 border border-gray-100 shadow-lg print:shadow-none print:border-none print:p-0 print:m-0 space-y-8"
              >
              {/* Header Invoice */}
              <div className="flex flex-col sm:flex-row justify-between items-start border-b-2 border-gray-100 pb-8 gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md">
                      <Wrench className="h-5 w-5" />
                    </div>
                    <span className="text-2xl font-black tracking-tight text-gray-900">
                      Rental<span className="text-indigo-600">Hub</span>
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-gray-800">PT Rental Heavy Equipment Services</h4>
                  <p className="text-xs text-gray-500 leading-relaxed mt-0.5">
                    Jl. Metro Industri No. 88, Jakarta Selatan 12340<br />
                    Telp: (021) 555-8899 | Email: billing@rentalhub.id
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <h2 className="text-2xl font-black text-indigo-900 tracking-tight">
                    INVOICE #{activeInvoice?.invoice_no}
                  </h2>
                  <div className="mt-2 text-xs space-y-1 text-gray-600">
                    <p><span className="font-semibold text-gray-400">Ref Booking:</span> <span className="font-extrabold text-indigo-600">{activeInvoice?.kode_booking}</span></p>
                    <p><span className="font-semibold text-gray-400">Tanggal:</span> {activeInvoice?.tanggal_invoice}</p>
                    <p><span className="font-semibold text-gray-400">Jatuh Tempo:</span> {activeInvoice?.jatuh_tempo}</p>
                  </div>
                </div>
              </div>

              {/* Customer and Booking Information Section (Two-Column Cards) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                {/* Customer Card */}
                <div className="bg-slate-50/70 rounded-2xl p-5 border border-gray-100 space-y-2">
                  <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider border-b border-gray-200/60 pb-1.5 mb-2">
                    Informasi Customer
                  </p>
                  <p className="text-xs text-gray-400">Nama Customer:</p>
                  <p className="font-extrabold text-gray-900 text-base">{activeInvoice?.customer_name}</p>
                  <p className="text-xs text-gray-500 font-semibold">{activeInvoice?.customer_company}</p>
                  <div className="pt-2 text-xs space-y-1 text-gray-600">
                    <p className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-gray-400" /> {activeInvoice?.customer_email}</p>
                    <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-gray-400" /> {activeInvoice?.customer_phone}</p>
                  </div>
                </div>

                {/* Detail Booking Card */}
                <div className="bg-slate-50/70 rounded-2xl p-5 border border-gray-100 space-y-2">
                  <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider border-b border-gray-200/60 pb-1.5 mb-2">
                    Detail Booking
                  </p>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Nomor Booking:</span>
                    <span className="font-bold text-gray-900">{activeInvoice?.kode_booking}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Alat Rental:</span>
                    <span className="font-bold text-indigo-600">{activeInvoice?.alat_name}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Periode Sewa:</span>
                    <span className="font-medium text-gray-700">{activeInvoice?.periode_sewa}</span>
                  </div>
                  <div className="flex justify-between text-xs pt-1 border-t border-gray-200/50">
                    <span className="text-gray-400">Durasi Rental:</span>
                    <span className="font-extrabold text-gray-900">{activeInvoice?.durasi_hari} Hari</span>
                  </div>
                </div>
              </div>

              {/* Rental Detail Table */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-gray-200 text-xs font-bold text-gray-600 uppercase tracking-wider">
                      <th className="px-4 py-3.5 w-10 text-center">No</th>
                      <th className="px-5 py-3.5">Nama Alat / Equipment</th>
                      <th className="px-4 py-3.5 text-center">Qty</th>
                      <th className="px-5 py-3.5">Periode Sewa</th>
                      <th className="px-4 py-3.5 text-center">Durasi</th>
                      <th className="px-5 py-3.5 text-right">Harga / Hari</th>
                      <th className="px-5 py-3.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(activeInvoice?.items || []).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors text-xs">
                        <td className="px-4 py-4 text-center font-semibold text-gray-400">{row.no || idx + 1}</td>
                        <td className="px-5 py-4 font-extrabold text-gray-900">{row.desc}</td>
                        <td className="px-4 py-4 text-center font-bold text-indigo-600">{row.unit_qty || 1} Unit</td>
                        <td className="px-5 py-4 font-medium text-gray-600">{row.periode || activeInvoice?.periode_sewa}</td>
                        <td className="px-4 py-4 text-center font-bold text-gray-800">{row.durasi_hari || activeInvoice?.durasi_hari} Hari</td>
                        <td className="px-5 py-4 text-right text-gray-700 font-semibold">
                          Rp {Number(row.harga).toLocaleString('id-ID')}
                        </td>
                        <td className="px-5 py-4 text-right font-extrabold text-gray-900 text-sm">
                          Rp {Number(row.total).toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Right Side Invoice Calculation Card */}
              <div className="flex justify-end">
                <div className="w-full sm:w-80 bg-slate-50 rounded-2xl p-5 border border-gray-100 space-y-2.5 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal Rental (Alat Keluar)</span>
                    <span className="font-semibold text-gray-900">
                      Rp {Number(activeInvoice?.subtotal || 0).toLocaleString('id-ID')}
                    </span>
                  </div>

                  {Number(activeInvoice?.booking?.discount_percentage || activeInvoice?.discount_percentage || 0) > 0 && (
                    <div className="flex justify-between text-amber-900 font-medium text-xs bg-amber-50 p-2 rounded-lg border border-amber-200/60">
                      <span>Diskon ({Number(activeInvoice?.booking?.discount_percentage || activeInvoice?.discount_percentage || 0)}%)</span>
                      <span className="font-black text-amber-700">
                        - Rp {Number(activeInvoice?.diskon || activeInvoice?.discount_amount || activeInvoice?.booking?.discount_amount || 0).toLocaleString('id-ID')}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-gray-600">
                    <span>PPN 11%</span>
                    <span className="font-semibold text-gray-900">
                      Rp {Number(activeInvoice?.ppn || 0).toLocaleString('id-ID')}
                    </span>
                  </div>

                  <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-200">
                    <span>Total Tagihan Alat Aktif</span>
                    <span className="font-extrabold text-indigo-900">
                      Rp {Number(activeInvoice?.total || activeInvoice?.total_tagihan || 0).toLocaleString('id-ID')}
                    </span>
                  </div>

                  <div className="flex justify-between text-emerald-600 font-semibold text-xs">
                    <span>DP / Uang Muka</span>
                    <span>Rp {Number(activeInvoice?.sudah_bayar || 0).toLocaleString('id-ID')}</span>
                  </div>

                  <div className="flex justify-between text-base font-black text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-100 mt-2">
                    <span>SISA TAGIHAN</span>
                    <span>Rp {Number(activeInvoice?.sisa_tagihan || 0).toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>

              {/* Bottom Section: Payment Info, Payment History Timeline, Signature & Notes */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-gray-100 text-xs">
                {/* Left: Informasi Pembayaran (Transfer Bank) */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-gray-100 space-y-2">
                  <p className="font-bold text-indigo-900 uppercase tracking-wider border-b border-gray-200 pb-1.5">
                    Informasi Pembayaran (Transfer Bank)
                  </p>
                  <div className="space-y-1 text-gray-700">
                    <p><span className="text-gray-400">Bank Tujuan:</span> <span className="font-bold text-gray-900">Bank Central Asia (BCA)</span></p>
                    <p><span className="text-gray-400">Nomor Rekening:</span> <span className="font-bold text-indigo-600">884-019-2831</span></p>
                    <p><span className="text-gray-400">Atas Nama:</span> <span className="font-bold text-gray-900">PT Rental Heavy Equipment</span></p>
                  </div>
                </div>

                {/* Middle: Riwayat Pembayaran Timeline */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-gray-100 space-y-2">
                  <p className="font-bold text-indigo-900 uppercase tracking-wider border-b border-gray-200 pb-1.5 flex items-center justify-between">
                    <span>Riwayat Pembayaran</span>
                    <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-bold">
                      {paymentHistories.length || (activeInvoice?.payment_history?.length || 0)} Transaksi
                    </span>
                  </p>
                  {paymentHistories.length > 0 ? (
                    <div className="space-y-2 pt-1 max-h-48 overflow-y-auto">
                      {paymentHistories.map((hist, idx) => (
                        <div key={idx} className="flex justify-between items-start text-[11px] bg-white p-2.5 rounded-xl border border-gray-100 shadow-2xs">
                          <div>
                            <p className="font-bold text-gray-900 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              {hist.status === 'LUNAS' ? 'Pelunasan Diterima' : 'Pembayaran Sebagian'}
                            </p>
                            <p className="text-gray-400 text-[10px] mt-0.5">
                              {new Date(hist.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} • {hist.metode_pembayaran}
                            </p>
                            {hist.admin && (
                              <p className="text-[10px] text-indigo-600 font-semibold mt-0.5">
                                Admin: {hist.admin.nama}
                              </p>
                            )}
                            {hist.catatan && (
                              <p className="text-[10px] text-gray-500 italic mt-0.5">{hist.catatan}</p>
                            )}
                          </div>
                          <span className="font-extrabold text-emerald-600">
                            Rp {Number(hist.jumlah).toLocaleString('id-ID')}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : activeInvoice?.payment_history && activeInvoice?.payment_history?.length > 0 ? (
                    <div className="space-y-2 pt-1">
                      {(activeInvoice?.payment_history || []).map((hist, idx) => (
                        <div key={idx} className="flex justify-between items-center text-[11px] bg-white p-2 rounded-lg border border-gray-100">
                          <div>
                            <p className="font-bold text-gray-900">{hist.title}</p>
                            <p className="text-gray-400">{hist.date} • {hist.method}</p>
                          </div>
                          <span className="font-extrabold text-emerald-600">
                            Rp {Number(hist.amount).toLocaleString('id-ID')}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 italic pt-2">Belum ada riwayat pembayaran.</p>
                  )}
                </div>

                {/* Right: Catatan Invoice */}
                <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-100/80 space-y-1 md:col-span-3">
                  <p className="font-bold text-amber-900 uppercase text-[10px] tracking-wider">Catatan Invoice & Ketentuan Pembayaran:</p>
                  <p className="text-amber-800 text-[11px] leading-relaxed italic">
                    "Harap cantumkan nomor invoice <strong>{activeInvoice?.invoice_no}</strong> pada berita transfer. Invoice ini merupakan bukti tagihan sewa resmi dari PT Rental Heavy Equipment Services."
                  </p>
                </div>
              </div>

              {/* DIGITAL SIGNATURE & APPROVAL SECTION (EXCLUSIVELY 2 SIGNATURES: CUSTOMER & ADMIN FINANCE) */}
              <div className="pt-6 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* COLUMN 1: Yang Mengembalikan Barang */}
                <div className="bg-slate-50/80 rounded-2xl p-4 border border-gray-200/70 space-y-3 relative overflow-hidden">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Yang Mengembalikan Barang</span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                      <CheckCircle2 className="h-3 w-3" /> Returned & Signed
                    </span>
                  </div>

                  {/* Digital Signature Image / SVG Seal */}
                  <div className="h-24 flex items-center justify-center relative my-1 bg-white rounded-xl border border-dashed border-gray-200 p-2 shadow-xs">
                    {activeInvoice?.tanda_tangan_return ? (
                      <img src={activeInvoice?.tanda_tangan_return} alt="Tanda Tangan Pengembali Barang" className="max-h-20 object-contain mx-auto" />
                    ) : (
                      <>
                        <svg className="w-36 h-12 text-blue-800" viewBox="0 0 200 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M15 35 C 30 15, 45 45, 60 20 C 75 5, 90 50, 110 25 C 130 10, 145 40, 170 20" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                          <path d="M20 42 L180 42" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
                        </svg>
                        <div className="absolute right-2 bottom-1.5 opacity-85 pointer-events-none">
                          <div className="text-[8px] font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 font-bold">
                            SIGNED ON RETURN
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="space-y-0.5 text-xs">
                    <p className="font-extrabold text-gray-900 text-sm">{activeInvoice?.return_name}</p>
                    <p className="text-gray-500 font-medium">Role: <span className="font-semibold text-gray-800">Yang Mengembalikan Barang</span></p>
                    <p className="text-gray-500 font-medium">No. HP: <span className="font-mono text-gray-600 text-[11px]">{activeInvoice?.return_phone}</span></p>
                    <div className="pt-1.5 text-[11px] text-gray-400 border-t border-gray-200/60 mt-1 flex justify-between">
                      <span>Tanggal Pengembalian:</span>
                      <span className="font-semibold text-gray-700">{activeInvoice?.return_date}</span>
                    </div>
                  </div>
                </div>

                {/* COLUMN 2: Disetujui Oleh (Admin Finance) */}
                <div className="bg-slate-50/80 rounded-2xl p-4 border border-gray-200/70 space-y-3 relative overflow-hidden">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Disetujui Oleh (Admin Finance)</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setShowSignatureModal(true)}
                        className="inline-flex items-center gap-1 text-[10px] font-extrabold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-full border border-indigo-200 transition-all cursor-pointer"
                        title="Klik untuk membuat / menggambar tanda tangan Anda sendiri"
                      >
                        <Edit3 className="h-3 w-3" /> Buat TTD
                      </button>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                        activeInvoice?.status === 'PAID'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        <CheckCircle2 className="h-3 w-3" /> {activeInvoice?.status === 'PAID' ? '✓ Verified' : 'Waiting'}
                      </span>
                    </div>
                  </div>

                  {/* Digital Signature Image / Custom Drawn Signature / SVG Seal */}
                  <div className="h-24 flex items-center justify-center relative my-1 bg-white rounded-xl border border-dashed border-gray-200 p-2 shadow-xs">
                    {customFinanceSign ? (
                      <div className="relative w-full h-full flex items-center justify-center">
                        <img src={customFinanceSign} alt="Tanda Tangan Admin Finance" className="max-h-20 object-contain mx-auto" />
                        <div className="absolute right-1 bottom-1 opacity-85 pointer-events-none">
                          <div className="text-[7px] font-mono text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200 font-bold">
                            CUSTOM SIGNATURE • ADMIN FINANCE
                          </div>
                        </div>
                      </div>
                    ) : activeInvoice?.status === 'PAID' ? (
                      <>
                        <svg className="w-36 h-12 text-emerald-800" viewBox="0 0 200 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M15 30 Q 35 5, 55 35 T 95 25 T 135 35 T 175 15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                          <path d="M25 45 C 55 40, 120 50, 165 40" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        </svg>
                        <div className="absolute right-2 bottom-1.5 opacity-85 pointer-events-none">
                          <div className="text-[8px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-bold">
                            VERIFIED & APPROVED • FIN-ADM-008
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center space-y-1">
                        <p className="text-xs text-amber-600 font-semibold italic">Waiting Payment Verification</p>
                        <button
                          onClick={() => setShowSignatureModal(true)}
                          className="text-[10px] text-indigo-600 underline font-bold hover:text-indigo-800 cursor-pointer"
                        >
                          Klik di sini untuk TTD Sendiri
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-0.5 text-xs">
                    <p className="font-extrabold text-gray-900 text-sm">{activeInvoice?.finance_admin_name || 'Admin Finance'}</p>
                    <p className="text-gray-500 font-medium">Role: <span className="font-semibold text-gray-800">Finance Administrator</span></p>
                    <p className="text-gray-500 font-medium">ID Finance: <span className="font-mono font-bold text-indigo-600">{activeInvoice?.finance_admin_id || 'FIN-ADM-008'}</span></p>
                    <div className="pt-1.5 text-[11px] text-gray-400 border-t border-gray-200/60 mt-1 flex justify-between">
                      <span>Tanggal Verifikasi:</span>
                      <span className="font-semibold text-gray-700">{activeInvoice?.status === 'PAID' ? '29 Juli 2026' : '-'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center text-xs text-gray-400 pt-6 border-t border-gray-100 italic">
                "Terima kasih atas kepercayaan Anda kepada RentalHub."
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-gray-100 shadow-sm text-center">
              <AlertCircle className="h-12 w-12 text-gray-300 mb-3" />
              <h3 className="text-base font-bold text-gray-800">Belum ada invoice dipilih</h3>
              <p className="text-xs text-gray-500 mt-1">Pilih invoice dari daftar di sebelah kiri untuk melihat rincian.</p>
            </div>
          )}
        </div>
      </div>

        {/* MODAL KONFIRMASI TANDAI LUNAS */}
        {activeInvoice && (
          <Modal
            isOpen={isConfirmPayOpen}
            onClose={() => setIsConfirmPayOpen(false)}
            title="Konfirmasi Pembayaran"
            size="md"
          >
            <div className="space-y-4">
              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs font-semibold flex items-start gap-2.5">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-extrabold text-amber-950 text-sm">Konfirmasi Pelunasan</p>
                  <p className="mt-0.5 text-amber-800">Apakah Anda yakin ingin menandai invoice ini sebagai <strong>LUNAS</strong>?</p>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between border-b border-slate-200/70 pb-2">
                  <span className="text-gray-500">Nomor Invoice:</span>
                  <span className="font-bold text-gray-900">{activeInvoice?.invoice_no}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/70 pb-2">
                  <span className="text-gray-500">Customer:</span>
                  <span className="font-bold text-gray-900">{activeInvoice?.customer_name}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/70 pb-2">
                  <span className="text-gray-500">Nomor Booking:</span>
                  <span className="font-bold text-indigo-600">{activeInvoice?.kode_booking}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/70 pb-2">
                  <span className="text-gray-500">Total Tagihan:</span>
                  <span className="font-extrabold text-gray-900">Rp {Number(activeInvoice?.total_tagihan || 0).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status Sekarang:</span>
                  <span className="font-extrabold text-amber-600">{activeInvoice?.status}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsConfirmPayOpen(false)}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-50 transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmMarkAsPaid}
                  disabled={isSubmittingPay}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isSubmittingPay ? 'Memproses...' : 'Konfirmasi Lunas'}
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* MODAL CATAT PEMBAYARAN MANUAL & SEBAGIAN */}
        {activeInvoice && (
          <Modal
            isOpen={isRecordPayOpen}
            onClose={() => setIsRecordPayOpen(false)}
            title={`Catat Pembayaran #${activeInvoice?.invoice_no}`}
            size="md"
          >
            <form onSubmit={handleRecordPaymentSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Metode Pembayaran *</label>
                <select
                  value={recordMethod}
                  onChange={e => setRecordMethod(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Transfer Bank">Transfer Bank (BCA / Mandiri / BNI)</option>
                  <option value="Cash">Cash / Tunai Kantor</option>
                  <option value="QRIS">QRIS Dinamis</option>
                  <option value="Kartu Kredit/Debit">Kartu Kredit / Debit EDC</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nominal Pembayaran (Rp) *</label>
                <input
                  type="number"
                  value={recordAmount}
                  onChange={e => setRecordAmount(e.target.value)}
                  placeholder={`Sisa tagihan: Rp ${Number(activeInvoice?.sisa_tagihan || 0).toLocaleString('id-ID')}`}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  required
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Sisa Tagihan Saat Ini: <strong className="text-rose-600">Rp {Number(activeInvoice?.sisa_tagihan || 0).toLocaleString('id-ID')}</strong>
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Tanggal Pembayaran *</label>
                <input
                  type="date"
                  value={recordDate}
                  onChange={e => setRecordDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Upload Bukti Pembayaran (Opsional)</label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={e => setRecordFile(e.target.files[0] || null)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-600 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Catatan Pembayaran</label>
                <textarea
                  rows={2}
                  value={recordNotes}
                  onChange={e => setRecordNotes(e.target.value)}
                  placeholder="Contoh: Pembayaran DP 50% via Bank BCA..."
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRecordPayOpen(false)}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-700 font-semibold text-xs rounded-xl hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPay}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isSubmittingPay ? 'Menyimpan...' : 'Simpan Pembayaran'}
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* MODAL KIRIM INVOICE */}
        {activeInvoice && (
          <Modal
            isOpen={isSendModalOpen}
            onClose={() => setIsSendModalOpen(false)}
            title={`Kirim Invoice #${activeInvoice?.invoice_no}`}
            size="md"
          >
            <form onSubmit={handleSendInvoiceSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Metode Pengiriman</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSendChannel('email')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${
                      sendChannel === 'email'
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-gray-50 text-gray-700 border-gray-200'
                    }`}
                  >
                    <Mail className="h-4 w-4" /> Email Customer
                  </button>
                  <button
                    type="button"
                    onClick={() => setSendChannel('whatsapp')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${
                      sendChannel === 'whatsapp'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-gray-50 text-gray-700 border-gray-200'
                    }`}
                  >
                    <Phone className="h-4 w-4" /> WhatsApp / SMS
                  </button>
                </div>
              </div>

              {sendChannel === 'email' ? (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Email Tujuan</label>
                  <input
                    type="email"
                    defaultValue={activeInvoice?.customer_email}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white"
                    required
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">No WhatsApp / HP</label>
                  <input
                    type="text"
                    defaultValue={activeInvoice?.customer_phone}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Pesan Pengantar</label>
                <textarea
                  rows={3}
                  defaultValue={`Halo ${activeInvoice?.customer_name}, berikut kami lampirkan Invoice #${activeInvoice?.invoice_no} untuk rental ${activeInvoice?.alat_name}. Terima kasih!`}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSendModalOpen(false)}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-700 font-semibold text-xs rounded-xl hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 shadow-sm"
                >
                  Kirim Invoice Sekarang
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* MODAL KIRIM PENGINGAT */}
        {activeInvoice && (
          <Modal
            isOpen={isReminderModalOpen}
            onClose={() => setIsReminderModalOpen(false)}
            title="Kirim Pengingat Pembayaran"
            size="sm"
          >
            <div className="space-y-4">
              <p className="text-xs text-gray-600">
                Kirimkan pengingat pembayaran jatuh tempo ({activeInvoice?.jatuh_tempo}) untuk customer <span className="font-bold text-gray-900">{activeInvoice?.customer_name}</span>?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsReminderModalOpen(false)}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-700 font-semibold text-xs rounded-xl hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleSendReminder}
                  className="flex-1 py-2.5 bg-amber-500 text-white font-bold text-xs rounded-xl hover:bg-amber-600 shadow-xs"
                >
                  Kirim Pengingat
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* MODAL BATALKAN INVOICE */}
        {activeInvoice && (
          <Modal
            isOpen={isCancelModalOpen}
            onClose={() => setIsCancelModalOpen(false)}
            title="Batalkan Invoice"
            size="sm"
          >
            <div className="space-y-4">
              <p className="text-xs text-gray-600">
                Apakah Anda yakin ingin membatalkan <span className="font-bold text-red-600">Invoice #{activeInvoice?.invoice_no}</span>?
              </p>
              <textarea
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                rows={2}
                placeholder="Alasan pembatalan invoice..."
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setIsCancelModalOpen(false)}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-700 font-semibold text-xs rounded-xl hover:bg-gray-50"
                >
                  Tidak
                </button>
                <button
                  onClick={handleCancelInvoice}
                  className="flex-1 py-2.5 bg-red-600 text-white font-bold text-xs rounded-xl hover:bg-red-700 shadow-xs"
                >
                  Ya, Batalkan Invoice
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* ADMIN FINANCE SIGNATURE DRAWER MODAL */}
        {showSignatureModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-scale-in border border-gray-100">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <div>
                  <h3 className="text-base font-black text-gray-900">Buat Tanda Tangan Admin Finance</h3>
                  <p className="text-xs text-gray-500">Tanda tangan resmi Administrator Keuangan</p>
                </div>
                <button
                  onClick={() => setShowSignatureModal(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-gray-600 leading-relaxed">
                Gunakan mouse atau layar sentuh untuk menggambar tanda tangan Anda pada kanvas di bawah ini. Tanda tangan ini akan langsung terpasang pada faktur invoice.
              </p>

              <SignaturePad
                label="Tanda Tangan Digital Finance"
                value={customFinanceSign || ''}
                onChange={(dataUrl) => setTempSignature(dataUrl)}
              />

              <div className="flex gap-3 justify-end pt-3 border-t border-gray-100">
                <button
                  onClick={() => setShowSignatureModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    const val = tempSignature || customFinanceSign;
                    if (val) {
                      setCustomFinanceSign(val);
                      localStorage.setItem('finance_admin_signature', val);
                      toast.success('Tanda tangan Admin Finance berhasil disimpan!');
                    } else {
                      toast.error('Harap gambar tanda tangan terlebih dahulu!');
                      return;
                    }
                    setShowSignatureModal(false);
                  }}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Simpan Tanda Tangan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
