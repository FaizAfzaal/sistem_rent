const { BookingDetail, AlatKelengkapan, BookingChecklist } = require('../models');

/**
 * Ensures that all BookingDetail items for a given booking have snapshot records in BookingChecklist.
 * If not, populates them from Master Data (AlatKelengkapan).
 */
const ensureBookingChecklists = async (bookingId, transaction = null) => {
  const options = transaction ? { transaction } : {};

  const details = await BookingDetail.findAll({
    where: { booking_id: bookingId },
    ...options,
  });

  const allChecklists = [];

  for (const detail of details) {
    const existing = await BookingChecklist.findAll({
      where: { booking_detail_id: detail.id },
      ...options,
    });

    if (existing && existing.length > 0) {
      allChecklists.push(...existing);
      continue;
    }

    // Populate from Master Data AlatKelengkapan
    const masterItems = await AlatKelengkapan.findAll({
      where: { alat_id: detail.alat_id },
      order: [['id', 'ASC']],
      ...options,
    });

    let itemsToCreate = [];

    if (masterItems && masterItems.length > 0) {
      itemsToCreate = masterItems.map(m => m.nama_kelengkapan);
    } else {
      // Fallback if master data is empty: parse legacy kelengkapan text or default items
      if (detail.kelengkapan && detail.kelengkapan.trim()) {
        itemsToCreate = detail.kelengkapan
          .split(/[,&]/)
          .map(s => s.trim())
          .filter(Boolean);
      }
      if (itemsToCreate.length === 0) {
        itemsToCreate = ['Unit Utama', 'Tas / Case', 'Kabel Charger / Aksesoris'];
      }
    }

    const created = [];
    for (const name of itemsToCreate) {
      const item = await BookingChecklist.create(
        {
          booking_id: bookingId,
          booking_detail_id: detail.id,
          alat_id: detail.alat_id,
          nama_kelengkapan: name,
          status_keluar: 'ADA',
          status_kembali: null,
        },
        options
      );
      created.push(item);
    }

    allChecklists.push(...created);
  }

  return allChecklists;
};

module.exports = {
  ensureBookingChecklists,
};
