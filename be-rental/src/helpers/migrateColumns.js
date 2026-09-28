const sequelize = require('../config/database');

const runMigration = async () => {
  console.log('Running schema migration for booking_detail_id...');
  try {
    await sequelize.query('ALTER TABLE `pickup_transactions` ADD COLUMN `booking_detail_id` BIGINT NULL AFTER `booking_id`');
    console.log('✅ Added booking_detail_id to pickup_transactions');
  } catch (e) {
    console.log('ℹ️ pickup_transactions:', e.message);
  }

  try {
    await sequelize.query('ALTER TABLE `return_transactions` ADD COLUMN `booking_detail_id` BIGINT NULL AFTER `booking_id`');
    console.log('✅ Added booking_detail_id to return_transactions');
  } catch (e) {
    console.log('ℹ️ return_transactions:', e.message);
  }

  try {
    await sequelize.query('ALTER TABLE `invoice_detail` ADD COLUMN `booking_detail_id` BIGINT NULL AFTER `invoice_id`');
    console.log('✅ Added booking_detail_id to invoice_detail');
  } catch (e) {
    console.log('ℹ️ invoice_detail:', e.message);
  }

  try {
    await sequelize.query(`
      UPDATE booking_detail d
      JOIN booking b ON d.booking_id = b.id
      SET d.status = 'BARANG_SEDANG_DISEWA'
      WHERE b.status IN ('BARANG_SEDANG_DISEWA', 'SEDANG_DISEWA', 'RENTED', 'disewa', 'SIAP_DIKEMBALIKAN', 'WAITING_RETURN')
      AND (d.status IN ('WAITING_PICKUP', 'pending', 'dikonfirmasi', 'MENUNGGU_BARANG_KELUAR') OR d.status IS NULL)
    `);
    console.log('✅ Self-healed BookingDetail statuses for active bookings');
  } catch (e) {
    console.log('ℹ️ self-healing status:', e.message);
  }

  console.log('Migration finished.');
  process.exit(0);
};

runMigration();
