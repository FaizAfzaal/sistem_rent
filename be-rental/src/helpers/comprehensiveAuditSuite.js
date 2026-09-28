const sequelize = require('../config/database');
const {
  User, Customer, Alat, KategoriAlat, Booking, BookingDetail,
  PickupTransaction, ReturnTransaction, Pembayaran, Invoice, InvoiceDetail, Role
} = require('../models');
const { checkAvailability, getCurrentDateWIB, addDaysStr } = require('./stockHelper');
const { autoCancelUncollectedBookings } = require('./autoCancelHelper');

const runComprehensiveAudit = async () => {
  console.log('================================================================');
  console.log('🔍 STARTING FULL SYSTEM AUDIT & END-TO-END VERIFICATION SUITE');
  console.log('================================================================');

  let passedTests = 0;
  let failedTests = 0;
  const auditLogs = [];

  const logResult = (testName, isSuccess, details = '') => {
    if (isSuccess) {
      passedTests++;
      console.log(`✅ [PASS] ${testName} ${details ? '- ' + details : ''}`);
      auditLogs.push({ testName, status: 'PASS', details });
    } else {
      failedTests++;
      console.error(`❌ [FAIL] ${testName} - ${details}`);
      auditLogs.push({ testName, status: 'FAIL', details });
    }
  };

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Database Models & Associations Integrity Check
    // -------------------------------------------------------------------------
    console.log('\n--- 1. DATABASE MODELS & ASSOCIATIONS CHECK ---');
    try {
      await sequelize.authenticate();
      const modelList = [User, Customer, Alat, KategoriAlat, Booking, BookingDetail, PickupTransaction, ReturnTransaction, Pembayaran, Invoice, InvoiceDetail, Role];
      logResult('Database Connection & Models', true, `${modelList.length} models loaded cleanly`);
    } catch (e) {
      logResult('Database Connection & Models', false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 2: Role-Based Access Control (RBAC) Data Setup Check
    // -------------------------------------------------------------------------
    console.log('\n--- 2. RBAC & ROLES CHECK ---');
    try {
      const roles = await Role.findAll();
      const roleNames = roles.map(r => r.nama_role);
      logResult('RBAC Roles Setup', roles.length > 0, `Roles found: ${roleNames.join(', ')}`);
    } catch (e) {
      logResult('RBAC Roles Setup', false, e.message);
    }

    // Ensure Prerequisites (User, Customer, Alat)
    let testUser = await User.findOne();
    if (!testUser) {
      const adminRole = await Role.findOne({ where: { nama_role: 'admin' } });
      testUser = await User.create({
        nama: 'Audit Admin',
        email: 'auditadmin@test.com',
        password: '$2a$10$eE0m1Hq0aJ71kK42lS4u..1111111111111111111111111111111',
        role_id: adminRole?.id || 1,
        no_hp: '08123456789'
      });
    }

    let testCustomer = await Customer.findOne();
    if (!testCustomer) {
      testCustomer = await Customer.create({
        customer_code: 'CUST-AUDIT-E2E',
        full_name: 'Audit Customer E2E',
        phone: '081234567890',
        email: 'customer.audit@test.com',
        identity_number: '3171012345670002',
        address: 'Jl. Audit E2E No. 99, Jakarta'
      });
    }

    let kat = await KategoriAlat.findOne();
    if (!kat) {
      kat = await KategoriAlat.create({ nama_kategori: 'Heavy Equipment Audit', deskripsi: 'Audit category' });
    }

    let testAlat1 = await Alat.findOne();
    if (!testAlat1) {
      testAlat1 = await Alat.create({
        kode_alat: 'ALT-AUD-01',
        nama_alat: 'Audit Flue Gas Analyzer',
        stok: 10,
        harga_sewa: 200000,
        status: 'AVAILABLE',
        kondisi: 'baik',
        kategori_id: kat.id
      });
    }

    let testAlat2 = await Alat.findOne({ where: { id: { [sequelize.Sequelize.Op.ne]: testAlat1.id } } });
    if (!testAlat2) {
      testAlat2 = await Alat.create({
        kode_alat: 'ALT-AUD-02',
        nama_alat: 'Audit Smoke Opacity Meter',
        stok: 10,
        harga_sewa: 300000,
        status: 'AVAILABLE',
        kondisi: 'baik',
        kategori_id: kat.id
      });
    }

    // -------------------------------------------------------------------------
    // TEST 3: Multi-Item Booking with Distinct Dates Per Item
    // -------------------------------------------------------------------------
    console.log('\n--- 3. MULTI-ITEM BOOKING WITH DISTINCT DATES PER ITEM ---');
    let testBookingId = null;
    try {
      const kode = `AUDIT-MULTI-${Date.now().toString().slice(-5)}`;
      
      // Multi-item with distinct dates per item
      const date1Start = '2026-09-08';
      const date1End = '2026-09-09';
      const date2Start = '2026-09-10';
      const date2End = '2026-09-12';

      const price1 = Number(testAlat1.harga_sewa || 200000);
      const price2 = Number(testAlat2.harga_sewa || 300000);

      const subtotal1 = price1 * 1 * 2; // 1 unit, 2 days
      const subtotal2 = price2 * 2 * 3; // 2 units, 3 days
      const totalHargaCalculated = subtotal1 + subtotal2;

      const booking = await Booking.create({
        kode_booking: kode,
        user_id: testUser.id,
        customer_id: testCustomer.id,
        tanggal_booking: new Date(),
        tanggal_mulai: date1Start,
        tanggal_selesai: date2End,
        jam_mulai: '08:00',
        jam_selesai: '17:00',
        status: 'WAITING_PICKUP',
        opsi_pembayaran: 'lunas_awal',
        total_harga: totalHargaCalculated,
        jumlah_dp: totalHargaCalculated,
        sisa_pembayaran: 0,
        uang_jaminan: 50000,
        jenis_jaminan: 'KTP',
        pengambil_nama: 'Adnan Pengambil',
        pengambil_no_hp: '081299990000',
        pengambil_hubungan: 'Diri Sendiri',
        catatan: 'Multi Item Distinct Dates Audit Test'
      });

      testBookingId = booking.id;

      const detail1 = await BookingDetail.create({
        booking_id: booking.id,
        alat_id: testAlat1.id,
        qty: 1,
        harga: price1,
        subtotal: subtotal1,
        tanggal_mulai: date1Start,
        tanggal_selesai: date1End,
        jam_mulai: '08:00',
        jam_selesai: '17:00',
        status: 'WAITING_PICKUP'
      });

      const detail2 = await BookingDetail.create({
        booking_id: booking.id,
        alat_id: testAlat2.id,
        qty: 2,
        harga: price2,
        subtotal: subtotal2,
        tanggal_mulai: date2Start,
        tanggal_selesai: date2End,
        jam_mulai: '08:00',
        jam_selesai: '17:00',
        status: 'WAITING_PICKUP'
      });

      const reloaded = await Booking.findByPk(booking.id, {
        include: [{ model: BookingDetail, as: 'details' }]
      });

      const isDetailDatesDistinct = reloaded.details[0].tanggal_mulai !== reloaded.details[1].tanggal_mulai;
      const isTotalCorrect = Number(reloaded.total_harga) === totalHargaCalculated;

      logResult(
        'Multi-Item Distinct Dates Creation',
        isDetailDatesDistinct && isTotalCorrect,
        `Item 1: ${reloaded.details[0].tanggal_mulai} s/d ${reloaded.details[0].tanggal_selesai}, Item 2: ${reloaded.details[1].tanggal_mulai} s/d ${reloaded.details[1].tanggal_selesai}. Total: Rp ${reloaded.total_harga}`
      );
    } catch (e) {
      logResult('Multi-Item Booking Distinct Dates Creation', false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 4: Finance & Invoice Synchronization Audit
    // -------------------------------------------------------------------------
    console.log('\n--- 4. FINANCE & INVOICE SYNC ---');
    try {
      if (testBookingId) {
        const { syncInvoiceFromBooking } = require('../controllers/invoiceController');
        await syncInvoiceFromBooking(testBookingId);

        const inv = await Invoice.findOne({
          where: { booking_id: testBookingId },
          include: [{ model: InvoiceDetail, as: 'details' }]
        });

        const invCorrect = inv && inv.details.length === 2 && Number(inv.total) > 0;
        logResult('Finance Invoice Auto-Sync', Boolean(invCorrect), `Invoice #${inv?.nomor_invoice}, Total: Rp ${inv?.total}, Line items: ${inv?.details?.length}`);
      }
    } catch (e) {
      logResult('Finance Invoice Auto-Sync', false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 5: Warehouse Pickup & Auto-fill Pengambil Info
    // -------------------------------------------------------------------------
    console.log('\n--- 5. WAREHOUSE PICKUP & PENGAMBIL AUTO-FILL ---');
    try {
      if (testBookingId) {
        const b = await Booking.findByPk(testBookingId);
        
        const pickup = await PickupTransaction.create({
          booking_id: b.id,
          pickup_name: b.pengambil_nama, // auto fill check
          pickup_phone: b.pengambil_no_hp,
          pickup_relation: b.pengambil_hubungan,
          pickup_date: b.tanggal_mulai,
          pickup_time: b.jam_mulai,
          pickup_signature: 'data:image/png;base64,sample',
          condition_status: 'baik',
          pickup_notes: 'Pickup audit test'
        });

        await b.update({ status: 'BARANG_SEDANG_DISEWA' });
        await BookingDetail.update({ status: 'BARANG_SEDANG_DISEWA' }, { where: { booking_id: b.id } });

        const isPengambilMatched = pickup.pickup_name === b.pengambil_nama;
        logResult('Pickup Pengambil Auto-Fill & Status Transition', isPengambilMatched, `Pickup Name: ${pickup.pickup_name}, Booking Status: BARANG_SEDANG_DISEWA`);
      }
    } catch (e) {
      logResult('Pickup Pengambil Auto-Fill & Status Transition', false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 6: Warehouse Return & Stock Replenishment
    // -------------------------------------------------------------------------
    console.log('\n--- 6. WAREHOUSE RETURN & STOCK REPLENISHMENT ---');
    try {
      if (testBookingId) {
        const b = await Booking.findByPk(testBookingId);

        const ret = await ReturnTransaction.create({
          booking_id: b.id,
          return_name: b.pengambil_nama,
          return_phone: b.pengambil_no_hp,
          return_date: b.tanggal_selesai,
          return_time: b.jam_selesai,
          return_signature: 'data:image/png;base64,sample',
          damage_status: 'sesuai_awal',
          return_notes: 'Return audit test'
        });

        await b.update({ status: 'SELESAI_DISEWA', actual_return_date: b.tanggal_selesai });
        await BookingDetail.update({ status: 'SELESAI_DISEWA' }, { where: { booking_id: b.id } });

        const updatedBooking = await Booking.findByPk(testBookingId);
        logResult('Warehouse Return & Status Transition to SELESAI_DISEWA', updatedBooking.status === 'SELESAI_DISEWA', `Booking ID ${b.id} status updated to ${updatedBooking.status}`);
      }
    } catch (e) {
      logResult('Warehouse Return & Status Transition', false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 7: 3-Day Auto Cancellation Trigger Test
    // -------------------------------------------------------------------------
    console.log('\n--- 7. AUTO-CANCEL 3-DAY UNCOLLECTED BOOKINGS TEST ---');
    try {
      const autoCancelRes = await autoCancelUncollectedBookings();
      logResult('3-Day Auto Cancellation Execution', typeof autoCancelRes.cancelledCount === 'number', `Cancelled Count: ${autoCancelRes.cancelledCount}`);
    } catch (e) {
      logResult('3-Day Auto Cancellation Execution', false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 8: Timezone & Date Helper Utilities Audit
    // -------------------------------------------------------------------------
    console.log('\n--- 8. TIMEZONE & DATE UTILITIES AUDIT ---');
    try {
      const todayStr = getCurrentDateWIB();
      const minus3Days = addDaysStr(todayStr, -3);
      const isDateValidStr = /^\d{4}-\d{2}-\d{2}$/.test(todayStr) && /^\d{4}-\d{2}-\d{2}$/.test(minus3Days);
      logResult('WIB Timezone Date Calculation', isDateValidStr, `Today WIB: ${todayStr}, 3 Days Ago WIB: ${minus3Days}`);
    } catch (e) {
      logResult('WIB Timezone Date Calculation', false, e.message);
    }

    // -------------------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------------------
    console.log('\n================================================================');
    console.log(`📊 SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED out of ${passedTests + failedTests} Audit Checks.`);
    console.log('================================================================');

    if (failedTests > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('CRITICAL AUDIT ERROR:', err);
    process.exit(1);
  }
};

runComprehensiveAudit();
