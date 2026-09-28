/**
 * Automated Verification Script - Independent Item Dates & Aggregated Status Multi-Item Lifecycle Workflow Audit
 * Test Case Customer Udin with 2+ items on different date schedules.
 */

const sequelize = require('../config/database');
const {
  User, Customer, Alat, Booking, BookingDetail, PickupTransaction, ReturnTransaction, Invoice, InvoiceDetail
} = require('../models');
const { getReadyPickups, processPickup, addEquipmentToBooking } = require('../controllers/pickupController');
const { getRentedBookings, processReturn } = require('../controllers/returnController');
const { syncInvoiceFromBooking } = require('../controllers/invoiceController');

const runAudit = async () => {
  console.log('====================================================');
  console.log('🧪 RUNNING INDEPENDENT DATES MULTI-ITEM LIFECYCLE AUDIT');
  console.log('====================================================');

  // 1. Setup Customer 'Udin'
  let customer = await Customer.findOne({ where: { full_name: 'Udin' } });
  if (!customer) {
    customer = await Customer.create({
      customer_code: 'CUST-UDIN-01',
      full_name: 'Udin',
      phone: '081234567890',
      email: 'udin.test@gmail.com',
      identity_number: '3171001122330001',
      address: 'Jakarta',
    });
  }

  let user = await User.findOne();

  // 2. Setup Equipment
  let tenda = await Alat.findOne({ where: { nama_alat: { [sequelize.Sequelize.Op.like]: '%Tenda Dome%' } } });
  if (!tenda) {
    tenda = await Alat.create({ kode_alat: 'ALT-TENDA-TEST', nama_alat: 'Tenda Dome 4 Orang', stok: 5, harga_sewa: 150000 });
  }

  let testingTool = await Alat.findOne({ where: { nama_alat: { [sequelize.Sequelize.Op.like]: '%Testing%' } } });
  if (!testingTool) {
    testingTool = await Alat.create({ kode_alat: 'ALT-TESTING-TOOL', nama_alat: 'Testing Tool Heavy', stok: 5, harga_sewa: 200000 });
  }

  // 3. Create Initial Booking for Customer Udin with 1 Item (10-08-2026 s/d 11-08-2026)
  console.log('\n--- 1. CREATING INITIAL BOOKING WITH ITEM A (10-08 s/d 11-08-2026) ---');
  const kodeBooking = `BK${Date.now().toString().slice(-6)}`;

  const booking = await Booking.create({
    kode_booking: kodeBooking,
    user_id: user ? user.id : 1,
    customer_id: customer.id,
    tanggal_booking: new Date(),
    tanggal_mulai: '2026-08-10',
    tanggal_selesai: '2026-08-11',
    jam_mulai: '11:00',
    jam_selesai: '17:00',
    status: 'WAITING_PICKUP',
    status_pembayaran: 'belum_bayar',
    opsi_pembayaran: 'dp',
    jumlah_dp: 150000,
    sisa_pembayaran: 150000,
    total_harga: 300000,
    catatan: 'Independent Dates Multi Item Test',
  });

  const detailTenda = await BookingDetail.create({
    booking_id: booking.id,
    alat_id: tenda.id,
    qty: 1,
    harga: 150000,
    subtotal: 300000, // 2 days
    tanggal_mulai: '2026-08-10',
    tanggal_selesai: '2026-08-11',
    jam_mulai: '11:00',
    jam_selesai: '17:00',
    status: 'WAITING_PICKUP',
  });

  console.log(`✅ Booking Created #${kodeBooking} with Initial Item: ${tenda.nama_alat} (10-08 s/d 11-08-2026)`);

  // 4. Add Additional Item with Different Rental Dates (15-08-2026 s/d 17-08-2026)
  console.log('\n--- 2. ADDING ADDITIONAL ITEM B WITH INDEPENDENT DATES (15-08 s/d 17-08-2026) ---');
  let addResult = null;
  const reqAdd = {
    body: {
      booking_id: booking.id,
      items: [
        {
          alat_id: testingTool.id,
          qty: 1,
          harga: 200000,
          tanggal_mulai: '2026-08-15',
          tanggal_selesai: '2026-08-17',
          jam_mulai: '09:00',
          jam_selesai: '17:00',
        }
      ]
    },
    user: { id: user ? user.id : 1, nama: 'Admin Warehouse' }
  };
  const resAdd = {
    json: (obj) => { addResult = obj; return obj; },
    status: () => resAdd,
  };

  await addEquipmentToBooking(reqAdd, resAdd);

  const updatedBookingAfterAdd = await Booking.findByPk(booking.id, {
    include: [{ model: BookingDetail, as: 'details' }]
  });

  const addedDetailB = updatedBookingAfterAdd.details.find(d => Number(d.alat_id) === Number(testingTool.id));

  console.log(`✅ Additional Item Added:`);
  console.log(`   - Item B Dates: ${addedDetailB.tanggal_mulai} s/d ${addedDetailB.tanggal_selesai} (3 Days, Subtotal: Rp ${addedDetailB.subtotal})`);
  console.log(`   - Parent Booking Global Bounds: ${updatedBookingAfterAdd.tanggal_mulai} s/d ${updatedBookingAfterAdd.tanggal_selesai}`);
  console.log(`   - Parent Booking Total Price: Rp ${updatedBookingAfterAdd.total_harga}`);

  if (addedDetailB.tanggal_mulai === '2026-08-15' && addedDetailB.tanggal_selesai === '2026-08-17' && updatedBookingAfterAdd.tanggal_selesai === '2026-08-17') {
    console.log('✅ EXPECTED OK: Item B successfully saved with independent dates 15-08 s/d 17-08!');
  } else {
    console.error('❌ FAILED: Item B independent date saving failed!');
    process.exit(1);
  }

  // 5. Test Date 10-08-2026: Process Pickup for Tenda Dome ONLY
  console.log('\n--- 3. TANGGAL 10 AGUSTUS 2026: PICKUP ALAT A (TENDA DOME) ---');
  let pickupResult = null;
  const reqProcessPickup1 = {
    body: {
      booking_id: booking.id,
      booking_detail_ids: [detailTenda.id],
      pickup_name: 'Udin (Customer)',
      pickup_phone: '081234567890',
      pickup_date: '2026-08-10',
      pickup_time: '11:00',
      pickup_signature: 'data:image/png;base64,sample',
    },
    user: { id: user ? user.id : 1, nama: 'Admin Warehouse' }
  };
  const resProcessPickup1 = {
    json: (obj) => { pickupResult = obj; return obj; },
    status: () => resProcessPickup1,
  };

  await processPickup(reqProcessPickup1, resProcessPickup1);

  const detailTendaP1 = await BookingDetail.findByPk(detailTenda.id);
  const detailTestingP1 = await BookingDetail.findByPk(addedDetailB.id);
  const bookingP1 = await Booking.findByPk(booking.id);

  console.log(`   - Alat A (Tenda Dome) Status: ${detailTendaP1.status}`);
  console.log(`   - Alat B (Testing Tool) Status: ${detailTestingP1.status}`);
  console.log(`   - Parent Booking Status: ${bookingP1.status}`);

  if (detailTendaP1.status === 'BARANG_SEDANG_DISEWA' && detailTestingP1.status === 'WAITING_PICKUP' && bookingP1.status === 'PARTIAL_PICKUP') {
    console.log('✅ EXPECTED OK: Booking status is PARTIAL_PICKUP!');
  } else {
    console.error(`❌ FAILED: Unexpected status! booking.status=${bookingP1.status}`);
    process.exit(1);
  }

  // Verify Admin Return API includes ONLY Item A (PARTIAL_PICKUP) and EXCLUDES Item B (WAITING_PICKUP)!
  console.log('\n--- 3b. VERIFY ADMIN RETURN INCLUDES ONLY ITEM A (EXCLUDES ITEM B) ---');
  let rentedResult = null;
  const reqRented = { query: { page: 1, size: 10 } };
  const resRented = { json: (obj) => { rentedResult = obj; return obj; }, status: () => resRented };
  await getRentedBookings(reqRented, resRented);

  const foundBookingInReturn = (rentedResult?.data || []).find(b => b.id === booking.id);
  if (foundBookingInReturn) {
    const detailIds = foundBookingInReturn.details.map(d => d.id);
    const hasItemA = detailIds.includes(detailTenda.id);
    const hasItemB = detailIds.includes(addedDetailB.id);

    if (hasItemA && !hasItemB) {
      console.log(`✅ EXPECTED OK: Admin Return strictly includes ONLY Item A (Tenda Dome) and EXCLUDES un-rented Item B (Testing Tool)!`);
    } else {
      console.error(`❌ FAILED: Admin Return included un-rented Item B! detailIds=${detailIds}`);
      process.exit(1);
    }
  } else {
    console.error(`❌ FAILED: Booking #${kodeBooking} missing from Admin Return list!`);
    process.exit(1);
  }

  // Verify Invoice sync on 10 Aug ONLY counts Item A (Rp 300,000)!
  console.log('\n--- 3c. VERIFY INVOICE ONLY CHARGES ITEM A (RP 300,000) ---');
  const invoice10Aug = await syncInvoiceFromBooking(booking.id);
  console.log(`   - Invoice Total on 10 Aug: Rp ${invoice10Aug.subtotal}`);
  if (Number(invoice10Aug.subtotal) === 300000) {
    console.log(`✅ EXPECTED OK: Invoice on 10 Aug strictly charged Item A (Rp 300,000), excluding future Item B!`);
  } else {
    console.error(`❌ FAILED: Invoice incorrect subtotal! ${invoice10Aug.subtotal}`);
    process.exit(1);
  }

  // 6. Test Date 11-08-2026: Process Return for Tenda Dome ONLY
  console.log('\n--- 4. TANGGAL 11 AGUSTUS 2026: RETURN ALAT A (TENDA DOME) ---');
  const reqProcessReturn1 = {
    body: {
      booking_id: booking.id,
      booking_detail_ids: [detailTenda.id],
      return_name: 'Udin (Customer)',
      return_phone: '081234567890',
      return_date: '2026-08-11',
      return_time: '17:00',
      return_signature: 'data:image/png;base64,sample',
      damage_status: 'sesuai_awal',
    },
    files: [{ filename: 'test_return_photo.jpg' }],
    user: { id: user ? user.id : 1, nama: 'Admin Warehouse' }
  };
  const resProcessReturn1 = {
    json: (obj) => obj,
    status: () => resProcessReturn1,
  };

  await processReturn(reqProcessReturn1, resProcessReturn1);

  const detailTendaR1 = await BookingDetail.findByPk(detailTenda.id);
  const detailTestingR1 = await BookingDetail.findByPk(addedDetailB.id);
  const bookingR1 = await Booking.findByPk(booking.id);

  console.log(`   - Alat A (Tenda Dome) Status: ${detailTendaR1.status}`);
  console.log(`   - Alat B (Testing Tool) Status: ${detailTestingR1.status}`);
  console.log(`   - Parent Booking Status: ${bookingR1.status}`);

  if (detailTendaR1.status === 'SELESAI_DISEWA' && detailTestingR1.status === 'WAITING_PICKUP' && bookingR1.status === 'PARTIAL_RETURN') {
    console.log('✅ EXPECTED OK: Booking status is PARTIAL_RETURN!');
  } else {
    console.error(`❌ FAILED: Unexpected status! booking.status=${bookingR1.status}`);
    process.exit(1);
  }

  // 7. Test Date 15-08-2026: Pickup Alat B (Testing Tool)
  console.log('\n--- 5. TANGGAL 15 AGUSTUS 2026: PICKUP ALAT B (TESTING TOOL) ---');
  const reqProcessPickup2 = {
    body: {
      booking_id: booking.id,
      booking_detail_ids: [addedDetailB.id],
      pickup_name: 'Udin (Customer)',
      pickup_phone: '081234567890',
      pickup_date: '2026-08-15',
      pickup_time: '09:00',
      pickup_signature: 'data:image/png;base64,sample',
    },
    user: { id: user ? user.id : 1, nama: 'Admin Warehouse' }
  };
  const resProcessPickup2 = {
    json: (obj) => obj,
    status: () => resProcessPickup2,
  };

  await processPickup(reqProcessPickup2, resProcessPickup2);

  const detailTendaP2 = await BookingDetail.findByPk(detailTenda.id);
  const detailTestingP2 = await BookingDetail.findByPk(addedDetailB.id);
  const bookingP2 = await Booking.findByPk(booking.id);

  console.log(`   - Alat A (Tenda Dome) Status: ${detailTendaP2.status}`);
  console.log(`   - Alat B (Testing Tool) Status: ${detailTestingP2.status}`);
  console.log(`   - Parent Booking Status: ${bookingP2.status}`);

  if (detailTendaP2.status === 'SELESAI_DISEWA' && detailTestingP2.status === 'BARANG_SEDANG_DISEWA' && bookingP2.status === 'BARANG_SEDANG_DISEWA') {
    console.log('✅ EXPECTED OK: Booking status is BARANG_SEDANG_DISEWA!');
  } else {
    console.error(`❌ FAILED: Unexpected status! booking.status=${bookingP2.status}`);
    process.exit(1);
  }

  // 8. Test Date 17-08-2026: Return Alat B (Testing Tool)
  console.log('\n--- 6. TANGGAL 17 AGUSTUS 2026: RETURN ALAT B (TESTING TOOL) ---');
  const reqProcessReturn2 = {
    body: {
      booking_id: booking.id,
      booking_detail_ids: [addedDetailB.id],
      return_name: 'Udin (Customer)',
      return_phone: '081234567890',
      return_date: '2026-08-17',
      return_time: '17:00',
      return_signature: 'data:image/png;base64,sample',
      damage_status: 'sesuai_awal',
    },
    files: [{ filename: 'test_return_photo_b.jpg' }],
    user: { id: user ? user.id : 1, nama: 'Admin Warehouse' }
  };
  const resProcessReturn2 = {
    json: (obj) => obj,
    status: () => resProcessReturn2,
  };

  await processReturn(reqProcessReturn2, resProcessReturn2);

  const detailTendaR2 = await BookingDetail.findByPk(detailTenda.id);
  const detailTestingR2 = await BookingDetail.findByPk(addedDetailB.id);
  const bookingR2 = await Booking.findByPk(booking.id);

  console.log(`   - Alat A (Tenda Dome) Status: ${detailTendaR2.status}`);
  console.log(`   - Alat B (Testing Tool) Status: ${detailTestingR2.status}`);
  console.log(`   - Parent Booking Status: ${bookingR2.status}`);

  if (detailTendaR2.status === 'SELESAI_DISEWA' && detailTestingR2.status === 'SELESAI_DISEWA' && bookingR2.status === 'SELESAI_DISEWA') {
    console.log('✅ EXPECTED OK: Booking status is SELESAI_DISEWA!');
  } else {
    console.error(`❌ FAILED: Unexpected status! booking.status=${bookingR2.status}`);
    process.exit(1);
  }

  console.log('\n====================================================');
  console.log('🎉 INDEPENDENT DATES MULTI-ITEM AUDIT 100% PASSED!');
  console.log('====================================================');
};

runAudit()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ AUDIT FAILED:', err);
    process.exit(1);
  });
