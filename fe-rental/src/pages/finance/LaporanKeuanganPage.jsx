import { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import html2pdf from 'html2pdf.js';
import { BarChart3, TrendingUp, Download, Calendar, DollarSign, PieChart, ArrowUpRight, FileSpreadsheet, FileText } from 'lucide-react';

export default function LaporanKeuanganPage() {
  const [period, setPeriod] = useState('Juli 2026');
  const [summaryData, setSummaryData] = useState({
    pendapatanKotor: 0,
    potonganDiskon: 0,
    pendapatanBersih: 0,
    piutangMenunggu: 0,
    totalBookingSelesai: 0,
    categoryBreakdown: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReportData();
  }, [period]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/bookings');
      if (res.data?.data && Array.isArray(res.data.data)) {
        // 1. Filter out cancelled bookings
        const activeBookings = res.data.data.filter(r => r.status !== 'dibatalkan');

        // Helper to extract month and year e.g. "Juli 2026"
        const getMonthYearStr = (dateStr) => {
          if (!dateStr) return '';
          const d = new Date(dateStr);
          if (isNaN(d.getTime())) return '';
          return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
        };

        // 2. Filter strictly by selected month using ONLY rental start date (tanggal_mulai)
        const filteredRows = activeBookings.filter(r => {
          const bookingMonth = getMonthYearStr(r.tanggal_mulai);
          if (!bookingMonth) return false;
          return period.toLowerCase().includes(bookingMonth.toLowerCase());
        });

        // 3. Compute Summary Cards strictly from filteredRows for that specific month
        const totalKotor = filteredRows.reduce((acc, r) => acc + Number(r.total_harga || 0), 0);
        const lunasRows = filteredRows.filter(r => r.status === 'lunas' || r.status === 'dikonfirmasi' || r.status_pembayaran === 'lunas');
        const totalBersih = lunasRows.reduce((acc, r) => acc + Number(r.total_harga || 0), 0);
        const piutang = Math.max(0, totalKotor - totalBersih);

        // 4. Compute Category Breakdown strictly from filteredRows for that specific month
        const catMap = new Map();
        filteredRows.forEach(r => {
          const itemVal = Number(r.total_harga || 0);
          if (r.details && r.details.length > 0) {
            r.details.forEach(d => {
              let catName = d.alat?.kategori?.nama_kategori || 'Peralatan Ukur & Deteksi';
              if (catName === '1') catName = 'Peralatan Konstruksi';
              if (catName === '2') catName = 'Peralatan Ukur & Deteksi';

              const prev = catMap.get(catName) || { count: 0, total: 0 };
              catMap.set(catName, {
                count: prev.count + 1,
                total: prev.total + Number(d.subtotal || itemVal)
              });
            });
          } else {
            const catName = 'Peralatan Ukur & Deteksi';
            const prev = catMap.get(catName) || { count: 0, total: 0 };
            catMap.set(catName, {
              count: prev.count + 1,
              total: prev.total + itemVal
            });
          }
        });

        const breakdown = Array.from(catMap.entries()).map(([kategori, data]) => ({
          kategori,
          count: data.count,
          total: data.total,
          percent: totalKotor > 0 ? ((data.total / totalKotor) * 100).toFixed(1) : '0'
        }));

        setSummaryData({
          pendapatanKotor: totalKotor,
          potonganDiskon: 0,
          pendapatanBersih: totalBersih,
          piutangMenunggu: piutang,
          totalBookingSelesai: lunasRows.length,
          categoryBreakdown: breakdown
        });
      }
    } catch {
      setSummaryData({
        pendapatanKotor: 0,
        potonganDiskon: 0,
        pendapatanBersih: 0,
        piutangMenunggu: 0,
        totalBookingSelesai: 0,
        categoryBreakdown: []
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    const element = document.getElementById('report-paper');
    if (!element) {
      toast.error('Elemen laporan tidak ditemukan');
      return;
    }
    toast.success(`Mendownload Laporan_Keuangan_${period.replace(/\s+/g, '_')}.pdf...`);
    const opt = {
      margin: 0.4,
      filename: `Laporan_Keuangan_${period.replace(/\s+/g, '_')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  };

  const handleDownloadExcel = () => {
    toast.success(`Mendownload Laporan_Keuangan_${period.replace(/\s+/g, '_')}.xls...`);

    let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; }
  th { background-color: #1E293B; color: #FFFFFF; font-weight: bold; padding: 10px; text-align: left; }
  td { padding: 8px 12px; border: 1px solid #E2E8F0; }
</style>
</head>
<body>
<table border="1" style="border-collapse: collapse;">
  <tr>
    <td colspan="4" style="height: 45px; background-color: #4F46E5; color: #FFFFFF; font-size: 16px; font-weight: bold; text-align: center; vertical-align: middle;">
      LAPORAN KEUANGAN RENTAL - ${period.toUpperCase()}
    </td>
  </tr>
  <tr style="height: 12px;"></tr>
  <tr style="height: 32px;">
    <th style="width: 280px; background-color: #1E293B; color: #FFFFFF; font-weight: bold; text-align: left; padding: 10px; border: 1px solid #0F172A;">Kategori Alat</th>
    <th style="width: 140px; background-color: #1E293B; color: #FFFFFF; font-weight: bold; text-align: center; padding: 10px; border: 1px solid #0F172A;">Jumlah Sewa</th>
    <th style="width: 200px; background-color: #1E293B; color: #FFFFFF; font-weight: bold; text-align: right; padding: 10px; border: 1px solid #0F172A;">Pendapatan Kotor</th>
    <th style="width: 140px; background-color: #1E293B; color: #FFFFFF; font-weight: bold; text-align: right; padding: 10px; border: 1px solid #0F172A;">Kontribusi (%)</th>
  </tr>`;

    if (summaryData.categoryBreakdown.length > 0) {
      summaryData.categoryBreakdown.forEach(row => {
        const formattedTotal = `Rp ${Number(row.total).toLocaleString('id-ID')}`;
        html += `
  <tr style="height: 28px;">
    <td style="padding: 8px 12px; border: 1px solid #E2E8F0; text-align: left; font-size: 12px;">${row.kategori}</td>
    <td style="padding: 8px 12px; border: 1px solid #E2E8F0; text-align: center; font-size: 12px;">${row.count} Sewa</td>
    <td style="padding: 8px 12px; border: 1px solid #E2E8F0; text-align: right; font-size: 12px; font-weight: bold; color: #0F172A;">${formattedTotal}</td>
    <td style="padding: 8px 12px; border: 1px solid #E2E8F0; text-align: right; font-size: 12px; font-weight: bold; color: #4F46E5;">${row.percent}%</td>
  </tr>`;
      });
    } else {
      html += `
  <tr style="height: 28px;">
    <td style="padding: 8px 12px; border: 1px solid #E2E8F0; text-align: left; font-size: 12px;">Belum ada data transaksi</td>
    <td style="padding: 8px 12px; border: 1px solid #E2E8F0; text-align: center; font-size: 12px;">0 Sewa</td>
    <td style="padding: 8px 12px; border: 1px solid #E2E8F0; text-align: right; font-size: 12px;">Rp 0</td>
    <td style="padding: 8px 12px; border: 1px solid #E2E8F0; text-align: right; font-size: 12px;">0%</td>
  </tr>`;
    }

    html += `
</table>
</body>
</html>`;

    const blob = new Blob(['\uFEFF' + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Laporan_Keuangan_${period.replace(/\s+/g, '_')}.xls`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Laporan Keuangan Rental</h1>
            <p className="text-sm text-gray-500">Ringkasan kinerja keuangan bulanan dan rincian kategori alat sewa.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadExcel}
              className="px-3.5 py-2.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Excel (.xls)
            </button>
            <button
              onClick={handleDownloadPDF}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <FileText className="h-4 w-4 text-white" /> Unduh Laporan PDF
            </button>
          </div>
        </div>

        {/* Month Selection (Strictly Single Month) */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pilih Bulan Laporan:</span>
          <select
            value={period}
            onChange={e => setPeriod(e.target.value)}
            className="px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:bg-white cursor-pointer"
          >
            <option value="Juli 2026">Bulan Juli 2026</option>
            <option value="Agustus 2026">Bulan Agustus 2026</option>
            <option value="September 2026">Bulan September 2026</option>
            <option value="Oktober 2026">Bulan Oktober 2026</option>
            <option value="November 2026">Bulan November 2026</option>
            <option value="Desember 2026">Bulan Desember 2026</option>
          </select>
        </div>



        {/* Financial Breakdown Table */}
        <div id="report-paper" className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-gray-900">Rincian Laporan Kategori Alat Rental</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase">
                  <th className="px-5 py-3.5">Kategori Alat</th>
                  <th className="px-5 py-3.5 text-center">Jumlah Sewa</th>
                  <th className="px-5 py-3.5 text-right">Pendapatan Kotor</th>
                  <th className="px-5 py-3.5 text-right">Kontribusi (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-gray-400 font-medium">
                      Memuat data laporan...
                    </td>
                  </tr>
                ) : summaryData.categoryBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-gray-400 font-medium">
                      Belum ada data transaksi sewa untuk kategori alat.
                    </td>
                  </tr>
                ) : (
                  summaryData.categoryBreakdown.map(item => (
                    <tr key={item.kategori}>
                      <td className="px-5 py-4 font-bold text-gray-900">{item.kategori}</td>
                      <td className="px-5 py-4 text-center font-semibold">{item.count} Sewa</td>
                      <td className="px-5 py-4 text-right font-extrabold text-gray-900">Rp {item.total.toLocaleString('id-ID')}</td>
                      <td className="px-5 py-4 text-right font-bold text-indigo-600">{item.percent}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
