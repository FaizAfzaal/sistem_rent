const { Op } = require('sequelize');
const { Alat, KategoriAlat, DailyChecklist, BookingDetail, Booking, Maintenance } = require('../models');
const { getWIBDateString, getWIBTimeString } = require('./stockHelper');

/**
 * Perform daily equipment availability inspection process.
 * Used by automated daily cron (07:00 WIB) and manual inspection API trigger.
 *
 * @param {string|null} targetDate Format 'YYYY-MM-DD' (defaults to current WIB date)
 * @param {string} tipePemeriksaan 'OTOMATIS' or 'MANUAL'
 */
const runDailyChecklistProcess = async (targetDate = null, tipePemeriksaan = 'OTOMATIS') => {
  const tanggal = targetDate || getWIBDateString();
  const waktu = targetDate && targetDate !== getWIBDateString()
    ? '07:00:00'
    : (tipePemeriksaan === 'MANUAL' ? getWIBTimeString().split(' ')[0] : '07:00:00');

  // 1. Fetch all tools from database
  // Requirement 4 step 8: "Jika alat dinonaktifkan, jangan masukkan alat tersebut ke checklist pemeriksaan rutin."
  const tools = await Alat.findAll({
    include: [{ model: KategoriAlat, as: 'kategori' }],
    order: [['id', 'ASC']],
  });

  const results = [];

  // Filter tools: include tools that are active (status !== 'tidak_tersedia')
  const activeTools = tools.filter(t => t.status !== 'tidak_tersedia');

  const activeRentedStatuses = [
    'BARANG_SEDANG_DISEWA',
    'RENTED',
    'disewa',
    'SEDANG_DISEWA',
    'BARANG_KELUAR',
    'PEMERIKSAAN_BARANG',
    'TERLAMBAT_KEMBALI',
    'SIAP_DIKEMBALIKAN',
    'WAITING_RETURN',
    'WAITING_PICKUP',
    'MENUNGGU_BARANG_KELUAR',
    'pending',
    'dikonfirmasi',
    'BOOKING_DIBUAT',
    'MENUNGGU_KETERSEDIAAN'
  ];

  for (const alat of activeTools) {
    const totalStok = Number(alat.stok || 0);

    // Calculate occupied units for `tanggal`
    const rentedDetails = await BookingDetail.findAll({
      where: {
        alat_id: alat.id,
        [Op.or]: [
          {
            tanggal_mulai: { [Op.lte]: tanggal },
            tanggal_selesai: { [Op.gte]: tanggal },
          },
          {
            tanggal_mulai: null,
          },
        ],
      },
      include: [
        {
          model: Booking,
          as: 'booking',
          where: { status: { [Op.in]: activeRentedStatuses } },
          required: true,
        },
      ],
    });

    const sedangDisewa = rentedDetails.reduce((sum, d) => sum + (Number(d.qty) || 1), 0);

    // Active maintenance check
    const activeMaintenance = await Maintenance.count({
      where: { alat_id: alat.id, status: 'Perbaikan' }
    }).catch(() => 0);

    let unitMaintenance = activeMaintenance;
    if (unitMaintenance === 0 && (alat.kondisi === 'rusak_ringan' || alat.kondisi === 'rusak_berat' || alat.status === 'MAINTENANCE')) {
      unitMaintenance = 1;
    }

    const stokTersedia = Math.max(0, totalStok - sedangDisewa - unitMaintenance);
    const minStok = Number(alat.min_stok || 2);

    let statusKetersediaan = 'TERSEDIA';
    let isChecked = true;
    let keterangan = '';

    if (stokTersedia === 0) {
      statusKetersediaan = 'TIDAK_TERSEDIA';
      isChecked = false;
      if (sedangDisewa > 0) {
        keterangan = `Stok tidak tersedia (${sedangDisewa} unit sedang disewa oleh customer).`;
      } else if (unitMaintenance > 0) {
        keterangan = `Stok tidak tersedia (${unitMaintenance} unit sedang perbaikan/maintenance).`;
      } else {
        keterangan = `Stok tidak tersedia (0 unit).`;
      }
    } else if (stokTersedia < minStok) {
      statusKetersediaan = 'STOK_MENIPIS';
      isChecked = true;
      keterangan = `Stok menipis (${stokTersedia} unit tersedia, di bawah batas minimum ${minStok} unit).`;
      if (sedangDisewa > 0) {
        keterangan += ` ${sedangDisewa} unit sedang disewa.`;
      }
    } else {
      statusKetersediaan = 'TERSEDIA';
      isChecked = true;
      keterangan = `Stok terverifikasi tersedia (${stokTersedia} unit dari total ${totalStok} unit).`;
    }

    // Upsert record for (tanggal_pemeriksaan, alat_id) to avoid duplicates
    const existing = await DailyChecklist.findOne({
      where: {
        tanggal_pemeriksaan: tanggal,
        alat_id: alat.id,
      },
    });

    let record;
    if (existing) {
      await existing.update({
        waktu_pemeriksaan: waktu,
        total_stok: totalStok,
        stok_tersedia: stokTersedia,
        stok_sedang_disewa: sedangDisewa,
        status_ketersediaan: statusKetersediaan,
        is_checked: isChecked,
        keterangan: keterangan,
        tipe_pemeriksaan: tipePemeriksaan,
      });
      record = existing;
    } else {
      record = await DailyChecklist.create({
        alat_id: alat.id,
        tanggal_pemeriksaan: tanggal,
        waktu_pemeriksaan: waktu,
        total_stok: totalStok,
        stok_tersedia: stokTersedia,
        stok_sedang_disewa: sedangDisewa,
        status_ketersediaan: statusKetersediaan,
        is_checked: isChecked,
        keterangan: keterangan,
        tipe_pemeriksaan: tipePemeriksaan,
      });
    }

    results.push(record);
  }

  return {
    tanggal_pemeriksaan: tanggal,
    waktu_pemeriksaan: waktu,
    total_alat_diperiksa: results.length,
    total_tersedia: results.filter(r => r.status_ketersediaan === 'TERSEDIA').length,
    total_tidak_tersedia: results.filter(r => r.status_ketersediaan === 'TIDAK_TERSEDIA').length,
    total_stok_menipis: results.filter(r => r.status_ketersediaan === 'STOK_MENIPIS').length,
    items: results,
  };
};

module.exports = {
  runDailyChecklistProcess,
};
