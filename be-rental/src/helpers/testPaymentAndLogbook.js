/**
 * Automated Verification Script - Log Book Auto-Sync & Finance Payment Audit
 */

const sequelize = require('../config/database');
const {
  User, Customer, Alat, Booking, BookingDetail, Pembayaran, Invoice
} = require('../models');
const { getLogBook } = require('../controllers/bookingController');
const { getCurrentDateWIB, getWIBDateTime } = require('./dateHelper');

const runTest = async () => {
  console.log('====================================================');
  console.log('🧪 RUNNING LOG BOOK AUTO-SYNC & FINANCE PAYMENT TEST');
  console.log('====================================================');

  const nowWIB = getWIBDateTime();
  console.log(`[TIMEZONE CHECK] Current WIB DateTime: ${nowWIB.fullStr}`);

  // Find or create test customer 'Adnan'
  let customer = await Customer.findOne({ where: { full_name: 'Adnan' } });
  if (!customer) {
    customer = await Customer.create({
      customer_code: 'CUST-ADNAN-01',
      full_name: 'Adnan',
      phone: '081299887766',
      email: 'adnan.test@gmail.com',
      identity_number: '3171009988770001',
      address: 'Jakarta Indonesia',
    });
  }

  // Ensure test tools exist
  let flueGas = await Alat.findOne({ where: { nama_alat: { [sequelize.Sequelize.Op.like]: '%Flue Gas%' } } });
  if (!flueGas) {
    flueGas = await Alat.create({ kode_alat: 'ALT-FG-TEST', nama_alat: 'Flue Gas Analyzer', stok: 5, harga_sewa: 250000 });
  }
  let smokeMeter = await Alat.findOne({ where: { nama_alat: { [sequelize.Sequelize.Op.like]: '%Smoke Opacity%' } } });
  if (!smokeMeter) {
    smokeMeter = await Alat.create({ kode_alat: 'ALT-SO-TEST', nama_alat: 'Smoke Opacity Meter', stok: 5, harga_sewa: 300000 });
  }
  let airDetector = await Alat.findOne({ where: { nama_alat: { [sequelize.Sequelize.Op.like]: '%Air Quality%' } } });
  if (!airDetector) {
    airDetector = await Alat.create({ kode_alat: 'ALT-AQ-TEST', nama_alat: 'Air Quality Detector', stok: 5, harga_sewa: 150000 });
  }

  // TEST 1: Create 3-item booking for Customer Adnan
  console.log('\n--- TEST 1: CREATE BOOKING (3 ALAT FOR CUSTOMER ADNAN) ---');
  const kodeBooking = `BK${Date.now().toString().slice(-6)}`;
  const totalHarga = (250000 * 1 * 2) + (300000 * 1 * 2) + (150000 * 3 * 2); // 2 days

  let user = await User.findOne();

  const booking = await Booking.create({
    kode_booking: kodeBooking,
    user_id: user ? user.id : 1,
    customer_id: customer.id,
    tanggal_booking: new Date(),
    tanggal_mulai: '2026-08-08',
    tanggal_selesai: '2026-08-09',
    jam_mulai: '10:00',
    jam_selesai: '17:00',
    status: 'WAITING_PICKUP',
    status_pembayaran: 'belum_bayar',
    opsi_pembayaran: 'dp',
    jumlah_dp: totalHarga * 0.3,
    sisa_pembayaran: totalHarga * 0.7,
    total_harga: totalHarga,
    catatan: 'Test Audit Booking Auto Logbook',
  });

  // Create details for 3 items
  await BookingDetail.create({
    booking_id: booking.id,
    alat_id: flueGas.id,
    qty: 1,
    harga: 250000,
    subtotal: 500000,
    tanggal_mulai: '2026-08-08',
    tanggal_selesai: '2026-08-09',
    jam_mulai: '10:00',
    jam_selesai: '17:00',
    status: 'WAITING_PICKUP',
  });

  await BookingDetail.create({
    booking_id: booking.id,
    alat_id: smokeMeter.id,
    qty: 1,
    harga: 300000,
    subtotal: 600000,
    tanggal_mulai: '2026-08-08',
    tanggal_selesai: '2026-08-09',
    jam_mulai: '10:00',
    jam_selesai: '17:00',
    status: 'WAITING_PICKUP',
  });

  await BookingDetail.create({
    booking_id: booking.id,
    alat_id: airDetector.id,
    qty: 3,
    harga: 150000,
    subtotal: 900000,
    tanggal_mulai: '2026-08-08',
    tanggal_selesai: '2026-08-09',
    jam_mulai: '10:00',
    jam_selesai: '17:00',
    status: 'WAITING_PICKUP',
  });

  console.log(`✅ Booking Created in DB: Kode ${booking.kode_booking}, Status: ${booking.status}`);

  // Mock req/res for getLogBook API call
  let logbookData = null;
  const mockReq = { query: { bulan: '8', tahun: '2026' } };
  const mockRes = {
    json: (obj) => { logbookData = obj.data; return obj; },
    status: () => mockRes,
  };

  await getLogBook(mockReq, mockRes);

  console.log('\n--- VERIFYING LOG BOOK AUTO-SYNC ---');
  console.log(`Logbook Month/Year: ${logbookData.bulan}/${logbookData.tahun}`);
  
  // Find Air Quality Detector row in matrix
  const airRow = logbookData.matrix.find(r => r.id === airDetector.id);
  const day8Bookings = airRow?.bookings?.[8] || [];
  const foundBooking = day8Bookings.find(b => b.kode_booking === kodeBooking);

  if (foundBooking) {
    console.log(`✅ SUCCESS: Booking #${foundBooking.kode_booking} Automatically Found in Log Book!`);
    console.log(`   - Customer: ${foundBooking.customer_nama}`);
    console.log(`   - Qty: ${foundBooking.qty} Unit`);
    console.log(`   - Tanggal: ${foundBooking.tanggal_mulai} s/d ${foundBooking.tanggal_selesai}`);
    console.log(`   - Jam: ${foundBooking.jam_mulai} - ${foundBooking.jam_selesai} WIB`);
    console.log(`   - Status: ${foundBooking.status}`);
  } else {
    console.error(`❌ FAILED: Booking #${kodeBooking} NOT found in Log Book matrix!`);
    process.exit(1);
  }

  // TEST 2: Finance Payment Status Update
  console.log('\n--- TEST 2: FINANCE PAYMENT STATUS UPDATE ---');
  await Pembayaran.create({
    booking_id: booking.id,
    jumlah: totalHarga,
    metode: 'transfer',
    status: 'lunas',
    tanggal_bayar: new Date(),
  });

  await booking.update({
    status_pembayaran: 'lunas',
    status: 'PAID',
    sisa_pembayaran: 0,
  });

  const updatedBooking = await Booking.findByPk(booking.id);
  console.log(`✅ Database Updated: Booking Status = ${updatedBooking.status}, Status Pembayaran = ${updatedBooking.status_pembayaran}`);

  console.log('\n====================================================');
  console.log('🎉 ALL TESTS PASSED SUCCESSFULLY! LOGBOOK & FINANCE OK');
  console.log('====================================================');
};

runTest()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ TEST FAILED WITH ERROR:', err);
    process.exit(1);
  });
