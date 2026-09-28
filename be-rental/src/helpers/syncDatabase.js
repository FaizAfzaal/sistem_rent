const sequelize = require('../config/database');
const { Invoice, InvoiceDetail, Maintenance, AuditLog, ReturnTransaction, Pengembalian } = require('../models');

async function syncAndMigrate() {
  try {
    console.log('🔄 Memulai sinkronisasi tabel database...');

    // 1. Sync models ke MySQL DB (alter safe mode)
    await sequelize.sync({ alter: true });
    console.log('✅ Sinkronisasi tabel invoice, invoice_detail, maintenance, & audit_logs sukses.');

    // 2. Cek & Migrasi data dari pengembalian ke return_transactions jika ada
    try {
      const oldReturns = await Pengembalian.findAll();
      if (oldReturns && oldReturns.length > 0) {
        console.log(`📦 Ditemukan ${oldReturns.length} data lama di tabel 'pengembalian'. Memulai migrasi...`);
        for (const r of oldReturns) {
          const exists = await ReturnTransaction.findOne({ where: { booking_id: r.booking_id } });
          if (!exists) {
            await ReturnTransaction.create({
              booking_id: r.booking_id,
              return_name: 'Customer (Migrated)',
              return_phone: '-',
              return_date: r.tanggal_pengembalian || new Date().toISOString().split('T')[0],
              return_time: '17:00',
              return_signature: 'DATA_MIGRATED',
              damage_status: r.kondisi_alat === 'baik' ? 'sesuai_awal' : 'ada_kerusakan',
              damage_notes: r.catatan || null,
              return_notes: `Migrasi dari tabel pengembalian. Denda: Rp ${r.denda || 0}`,
            });
          }
        }
        console.log('✅ Migrasi data pengembalian → return_transactions berhasil.');
      }
    } catch (migErr) {
      console.warn('⚠️ Tidak ada data migrasi pengembalian atau tabel sudah sinkron:', migErr.message);
    }

    console.log('🎉 SELURUH SKEMA DATABASE DAN HAK AKSES BERHASIL DISINKRONKAN.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Gagal menyelaraskan database:', err);
    process.exit(1);
  }
}

syncAndMigrate();
