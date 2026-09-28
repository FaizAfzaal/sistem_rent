import { Inbox, Clock, CheckCircle2, TrendingUp, AlertCircle, ArrowUpRight } from 'lucide-react';

export default function FinanceStats({
  bookingBaru = 12,
  menungguPembayaran = 8,
  sudahLunas = 45,
  pendapatanBulanIni = 85000000
}) {
  const stats = [
    {
      title: 'Booking Baru',
      value: bookingBaru,
      badge: '+3 Hari Ini',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200/60',
      icon: Inbox,
      iconBg: 'bg-blue-50 text-blue-600',
      description: 'Otomatis masuk dari Admin Booking',
    },
    {
      title: 'Menunggu Pembayaran',
      value: menungguPembayaran,
      badge: 'Perlu Konfirmasi',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200/60',
      icon: Clock,
      iconBg: 'bg-amber-50 text-amber-600',
      description: 'Menunggu verifikasi bukti/bayar',
    },
    {
      title: 'Sudah Lunas',
      value: sudahLunas,
      badge: 'Verified',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
      icon: CheckCircle2,
      iconBg: 'bg-emerald-50 text-emerald-600',
      description: 'Pembayaran selesai & terverifikasi',
    },
    {
      title: 'Pendapatan Bulan Ini',
      value: `Rp ${Number(pendapatanBulanIni).toLocaleString('id-ID')}`,
      badge: '+18% vs Bln Lalu',
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200/60',
      icon: TrendingUp,
      iconBg: 'bg-indigo-50 text-indigo-600',
      description: 'Total pemasukan rental terkonfirmasi',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <div
            key={idx}
            className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between"
          >
            <div> 
              <div className="flex items-center justify-between mb-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${stat.iconBg}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${stat.badgeColor}`}>
                  {stat.badge}
                </span>
              </div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{stat.title}</p>
              <h3 className="text-2xl font-extrabold text-gray-900 mt-1 tracking-tight">{stat.value}</h3>
            </div>
            <p className="text-xs text-gray-400 mt-3 pt-3 border-t border-gray-50 flex items-center gap-1">
              <span>{stat.description}</span>
            </p>
          </div>
        );
      })}
    </div>
  );
}
