const app = require('./src/app');
const { sequelize } = require('./src/models');
const { initCronScheduler } = require('./src/helpers/cronScheduler');
require('dotenv').config();

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Koneksi database berhasil');

    await sequelize.sync();
    const safeAlter = async (query) => {
      try {
        await sequelize.query(query);
      } catch (e) {
        // Silently handle column already exists or alter errors
      }
    };

    await safeAlter('ALTER TABLE `booking` MODIFY COLUMN `status` VARCHAR(50) DEFAULT "WAITING_PICKUP"');
    await safeAlter('ALTER TABLE `booking` ADD COLUMN `actual_return_date` DATE NULL AFTER `tanggal_selesai`');
    await safeAlter('ALTER TABLE `return_transactions` ADD COLUMN `return_type` VARCHAR(30) DEFAULT "NORMAL"');
    await safeAlter('ALTER TABLE `return_transactions` ADD COLUMN `early_return_date` DATE NULL');
    await safeAlter('ALTER TABLE `return_transactions` ADD COLUMN `early_return_time` VARCHAR(10) NULL');
    await safeAlter('ALTER TABLE `return_transactions` ADD COLUMN `early_return_reason` TEXT NULL');
    await safeAlter('ALTER TABLE `return_transactions` ADD COLUMN `approved_by` VARCHAR(100) NULL');
    await safeAlter('ALTER TABLE `booking_detail` ADD COLUMN `jam_mulai` VARCHAR(10) DEFAULT "08:00"');
    await safeAlter('ALTER TABLE `booking_detail` ADD COLUMN `jam_selesai` VARCHAR(10) DEFAULT "17:00"');
    await safeAlter('ALTER TABLE `booking_detail` ADD COLUMN `status` VARCHAR(50) DEFAULT "WAITING_PICKUP"');
    await safeAlter('ALTER TABLE `booking_detail` ADD COLUMN `durasi_jam` INT NULL');
    await safeAlter('ALTER TABLE `booking` ADD COLUMN `discount_percentage` DECIMAL(5,2) DEFAULT 0.00');
    await safeAlter('ALTER TABLE `booking` ADD COLUMN `discount_amount` DECIMAL(12,2) DEFAULT 0.00');
    await safeAlter('ALTER TABLE `booking` ADD COLUMN `final_payment` DECIMAL(12,2) NULL');
    await safeAlter('ALTER TABLE `pickup_transactions` ADD COLUMN `booking_detail_id` BIGINT NULL AFTER `booking_id`');
    await safeAlter('ALTER TABLE `return_transactions` ADD COLUMN `booking_detail_id` BIGINT NULL AFTER `booking_id`');
    await safeAlter('ALTER TABLE `invoice_detail` ADD COLUMN `booking_detail_id` BIGINT NULL AFTER `invoice_id`');
    await safeAlter('ALTER TABLE `alat` ADD COLUMN `min_stok` INT DEFAULT 2 AFTER `stok`');
    await safeAlter(`
      CREATE TABLE IF NOT EXISTS \`rental_documents\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`rental_id\` BIGINT NOT NULL,
        \`document_type\` ENUM('OUTGOING', 'RETURN') NOT NULL,
        \`document_number\` VARCHAR(100) NOT NULL,
        \`customer_signature\` LONGTEXT NULL,
        \`admin_signature\` LONGTEXT NULL,
        \`pdf_path\` VARCHAR(255) NULL,
        \`condition_data\` LONGTEXT NULL,
        \`created_by\` BIGINT NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    await safeAlter(`
      CREATE TABLE IF NOT EXISTS \`daily_checklists\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`alat_id\` BIGINT NOT NULL,
        \`tanggal_pemeriksaan\` DATE NOT NULL,
        \`waktu_pemeriksaan\` VARCHAR(10) NOT NULL DEFAULT '07:00:00',
        \`total_stok\` INT NOT NULL DEFAULT 0,
        \`stok_tersedia\` INT NOT NULL DEFAULT 0,
        \`stok_sedang_disewa\` INT NOT NULL DEFAULT 0,
        \`status_ketersediaan\` ENUM('TERSEDIA', 'TIDAK_TERSEDIA', 'STOK_MENIPIS', 'TIDAK_AKTIF') NOT NULL DEFAULT 'TERSEDIA',
        \`is_checked\` TINYINT(1) NOT NULL DEFAULT 1,
        \`keterangan\` TEXT NULL,
        \`tipe_pemeriksaan\` ENUM('OTOMATIS', 'MANUAL') NOT NULL DEFAULT 'OTOMATIS',
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY \`unique_daily_checklist_per_alat\` (\`tanggal_pemeriksaan\`, \`alat_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    console.log('✅ Tabel database & kolom berhasil disinkronisasi');

    // Initialize daily 07:00 WIB cron scheduler
    initCronScheduler();

    app.listen(PORT, () => {
      console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
      console.log(`📋 API Docs tersedia di http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Gagal koneksi ke database:', error.message);
    process.exit(1);
  }
};

startServer();
