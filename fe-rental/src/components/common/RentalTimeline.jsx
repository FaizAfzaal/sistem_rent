import { Check, Clock, XCircle } from 'lucide-react';

export default function RentalTimeline({ booking, status: propStatus }) {
  const currentBooking = typeof booking === 'object' && booking !== null ? booking : null;
  const status = currentBooking ? currentBooking.status : (propStatus || '');

  // Map status to active step (0..5)
  // Step 0: Booking Dibuat
  // Step 1: Barang Keluar
  // Step 2: Sedang Disewa
  // Step 3: Barang Kembali
  // Step 4: Pemeriksaan
  // Step 5: Selesai
  const getStepIndex = (st) => {
    switch (st) {
      case 'BOOKING_DIBUAT':
      case 'MENUNGGU_KETERSEDIAAN':
      case 'MENUNGGU_BARANG_KELUAR':
      case 'WAITING_PICKUP':
      case 'pending':
      case 'dikonfirmasi':
        return 0;
      case 'BARANG_KELUAR':
        return 1;
      case 'SEDANG_DISEWA':
      case 'BARANG_SEDANG_DISEWA':
      case 'RENTED':
      case 'disewa':
      case 'TERLAMBAT_KEMBALI':
        return 2;
      case 'BARANG_DIKEMBALIKAN':
      case 'MENUNGGU_PENGEMBALIAN':
      case 'SIAP_DIKEMBALIKAN':
      case 'WAITING_RETURN':
        return 3;
      case 'PEMERIKSAAN_BARANG':
        return 4;
      case 'SELESAI_DISEWA':
      case 'COMPLETED':
      case 'selesai':
      case 'PAID':
        return 5;
      case 'CANCELLED':
      case 'dibatalkan':
      case 'DIBATALKAN':
        return -1;
      default:
        return 0;
    }
  };

  const currentStep = getStepIndex(status);

  const formatDate = (dateStr) => {
    if (!dateStr || typeof dateStr === 'object') return null;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return typeof dateStr === 'string' ? dateStr : null;
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return null;
    }
  };

  const bookingDate = formatDate(currentBooking?.created_at || currentBooking?.tanggal_booking);
  const pickupDate = formatDate(currentBooking?.pickup?.pickup_date || currentBooking?.pickup_date);
  const returnDate = formatDate(currentBooking?.return?.return_date || currentBooking?.actual_return_date);

  const isEarlyReturn = currentBooking?.return?.return_type === 'EARLY_RETURN' ||
    (currentBooking?.actual_return_date && currentBooking?.tanggal_selesai && currentBooking.actual_return_date < currentBooking.tanggal_selesai);

  const steps = [
    { label: 'Booking Dibuat', date: bookingDate || 'Terbuat' },
    { label: 'Barang Keluar', date: pickupDate || (currentStep >= 1 ? 'Selesai' : 'Menunggu') },
    { label: 'Sedang Disewa', date: currentStep >= 2 ? 'Aktif' : '-' },
    { label: isEarlyReturn ? 'Barang Kembali (Pengembalian Lebih Awal)' : 'Barang Kembali', date: returnDate || (currentStep >= 3 ? (isEarlyReturn ? 'Pengembalian Awal' : 'Diterima') : 'Menunggu') },
    { label: 'Pemeriksaan', date: currentStep >= 4 ? 'Terverifikasi' : '-' },
    { label: 'Selesai', date: currentStep >= 5 ? 'Lunas & Selesai' : '-' },
  ];

  if (status === 'CANCELLED' || status === 'dibatalkan' || status === 'DIBATALKAN') {
    return (
      <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-xs text-rose-800 font-bold">
        <div className="flex items-center gap-2">
          <XCircle className="h-4 w-4 text-rose-600" />
          <span>Status Transaksi: Booking Dibatalkan</span>
        </div>
        <span className="px-2.5 py-1 bg-rose-200 text-rose-900 rounded-full uppercase text-[10px]">Cancelled</span>
      </div>
    );
  }

  if (status === 'MENUNGGU_KETERSEDIAAN') {
    return (
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-xs text-amber-900 font-bold">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-600 animate-spin" />
          <span>Status Transaksi: Menunggu Ketersediaan Stok (Antrian FIFO)</span>
        </div>
        <span className="px-2.5 py-1 bg-amber-200 text-amber-900 rounded-full uppercase text-[10px]">Queue</span>
      </div>
    );
  }

  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-indigo-600" /> Timeline Workflow Rental (Otomatis Database)
        </h4>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
          Step {Math.max(1, currentStep + 1)} dari 6
        </span>
      </div>

      <div className="grid grid-cols-6 gap-1 relative pt-2">
        {/* Connecting line */}
        <div className="absolute top-6 left-[8%] right-[8%] h-1 bg-gray-100 z-0 rounded-full" />
        <div
          className="absolute top-6 left-[8%] h-1 bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-600 z-0 transition-all duration-500 rounded-full"
          style={{ width: `${(Math.max(0, currentStep) / 5) * 84}%` }}
        />

        {steps.map((s, idx) => {
          const isDone = idx <= currentStep;
          const isCurrent = idx === currentStep;

          return (
            <div key={idx} className="relative z-10 flex flex-col items-center text-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 shadow-sm ${
                  isDone
                    ? 'bg-gradient-to-tr from-indigo-600 to-purple-600 text-white ring-4 ring-indigo-50'
                    : 'bg-white border-2 border-gray-200 text-gray-400'
                }`}
              >
                {isDone ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : idx + 1}
              </div>
              <span className={`text-[10px] font-extrabold mt-2 leading-tight ${isCurrent ? 'text-indigo-600' : isDone ? 'text-gray-900' : 'text-gray-400'}`}>
                {s.label}
              </span>
              <span className="text-[8px] text-gray-400 font-semibold mt-0.5 block truncate max-w-full">
                {s.date}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
