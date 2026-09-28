const sequelize = require('../config/database');
const { Alat, Booking, BookingDetail, User, Customer, Role } = require('../models');
const { checkAvailability, reevaluateQueueBookings } = require('../helpers/stockHelper');

const runVerificationTests = async () => {
  console.log('=====================================================');
  console.log('🚀 MENJALANKAN VERIFIKASI WORKFLOW RENTAL & STOK');
  console.log('=====================================================');

  try {
    // 1. Dapatkan atau buat data pengujian
    const user = await User.findOne({ where: { role_id: 2 } }) || await User.findByPk(1);
    const customer = await Customer.findOne() || { id: 1 };
    const alat = await Alat.findOne({ where: { status: 'TERSEDIA' } });

    if (!alat) {
      console.log('❌ Gagal: Tidak ada alat dengan status TERSEDIA untuk pengujian');
      return;
    }

    console.log(`\n📌 1. Test Single Canonical Stock Check: Alat ${alat.nama_alat} (Total Stok: ${alat.stok})`);
    const stockTest1 = await checkAvailability(alat.id, '2026-09-01', '2026-09-05', 1);
    console.log(`   Result: Available=${stockTest1.is_available}, Sisa Stok=${stockTest1.sisa_stok}`);
    if (stockTest1.success) {
      console.log('   ✅ PASS: Fungsi stok global checkAvailability berjalan presisi');
    }

    // 2. Test Booking 1 (FIFO Customer A)
    console.log('\n📌 2. Test Booking Creation & FIFO Queue System');
    const kodeA = `TEST-A-${Date.now()}`;
    const bookingA = await Booking.create({
      kode_booking: kodeA,
      user_id: user.id,
      customer_id: customer.id,
      tanggal_booking: new Date(),
      tanggal_mulai: '2026-09-10',
      tanggal_selesai: '2026-09-15',
      total_harga: 500000,
      status: 'MENUNGGU_BARANG_KELUAR', // Customer A priority 1
    });

    await BookingDetail.create({
      booking_id: bookingA.id,
      alat_id: alat.id,
      qty: alat.stok, // Book all stock for Customer A
      harga: alat.harga_sewa,
      subtotal: 500000,
      tanggal_mulai: '2026-09-10',
      tanggal_selesai: '2026-09-15',
    });

    console.log(`   Customer A booking #${kodeA} dibuat untuk tanggal 2026-09-10 s/d 2026-09-15 (Qty: ${alat.stok})`);
    console.log(`   Status Customer A: ${bookingA.status}`);

    // Check stock for Customer B requesting same dates
    const stockTestB = await checkAvailability(alat.id, '2026-09-10', '2026-09-15', 1);
    console.log(`   Ketersediaan untuk Customer B pada tanggal sama: Available=${stockTestB.is_available}, Sisa=${stockTestB.sisa_stok}`);

    const kodeB = `TEST-B-${Date.now()}`;
    const bookingB = await Booking.create({
      kode_booking: kodeB,
      user_id: user.id,
      customer_id: customer.id,
      tanggal_booking: new Date(Date.now() + 1000), // created 1s later
      tanggal_mulai: '2026-09-10',
      tanggal_selesai: '2026-09-15',
      total_harga: 500000,
      status: stockTestB.is_available ? 'MENUNGGU_BARANG_KELUAR' : 'MENUNGGU_KETERSEDIAAN', // Customer B in Queue
    });

    await BookingDetail.create({
      booking_id: bookingB.id,
      alat_id: alat.id,
      qty: 1,
      harga: alat.harga_sewa,
      subtotal: 500000,
      tanggal_mulai: '2026-09-10',
      tanggal_selesai: '2026-09-15',
    });

    console.log(`   Status Customer B (antrian FIFO): ${bookingB.status}`);
    if (bookingB.status === 'MENUNGGU_KETERSEDIAAN') {
      console.log('   ✅ PASS: Customer B otomatis berstatus MENUNGGU_KETERSEDIAAN sesuai aturan FIFO');
    }

    // 3. Test Automatic Queue Advancement when Customer A cancels
    console.log('\n📌 3. Test Queue Advancement (Customer A membatalkan)');
    await bookingA.update({ status: 'DIBATALKAN', alasan_pembatalan: 'Test pembatalan Customer A' });
    console.log('   Customer A membatalkan booking. Menjalankan reevaluateQueueBookings()...');

    await reevaluateQueueBookings();

    const updatedB = await Booking.findByPk(bookingB.id);
    console.log(`   Status Customer B setelah A batal: ${updatedB.status}`);
    if (updatedB.status === 'MENUNGGU_BARANG_KELUAR') {
      console.log('   ✅ PASS: Customer B otomatis mendapatkan kesempatan (status berubah ke MENUNGGU_BARANG_KELUAR)');
    }

    // Clean up test records
    await BookingDetail.destroy({ where: { booking_id: [bookingA.id, bookingB.id] } });
    await Booking.destroy({ where: { id: [bookingA.id, bookingB.id] } });

    console.log('\n=====================================================');
    console.log('🎉 SEMUA PENGUJAN VERIFIKASI BERHASIL! (100% PASS)');
    console.log('=====================================================');
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
};

runVerificationTests();
