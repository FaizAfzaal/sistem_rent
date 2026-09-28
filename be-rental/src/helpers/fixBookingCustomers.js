const { Booking, Customer, User } = require('../models');
const { generateCustomerCode } = require('../helpers/generateKode');

async function fixExistingBookings() {
  try {
    console.log('🔧 Memeriksa & memperbaiki tautan Customer pada seluruh booking...');
    const bookings = await Booking.findAll({
      include: [
        { model: User, as: 'user' },
        { model: Customer, as: 'customer' }
      ]
    });

    for (const b of bookings) {
      if (!b.customer_id) {
        // Cari Customer berdasarkan email / nama user jika ada
        let cust = null;
        if (b.user && b.user.email) {
          cust = await Customer.findOne({ where: { email: b.user.email } });
        }
        if (!cust && b.user && b.user.nama) {
          cust = await Customer.findOne({ where: { full_name: b.user.nama } });
        }
        if (!cust && b.user) {
          const code = await generateCustomerCode(Customer);
          cust = await Customer.create({
            customer_code: code,
            full_name: b.user.nama || 'Customer Rental',
            phone: b.user.no_hp || '-',
            email: b.user.email || null,
            identity_number: b.user.nik || `ID-${b.user.id}`,
            address: b.user.alamat || '-',
          });
        }
        if (cust) {
          await b.update({ customer_id: cust.id });
          console.log(`✅ Fixed Booking #${b.kode_booking} -> linked to Customer "${cust.full_name}" (ID ${cust.id})`);
        }
      }
    }
    console.log('🎉 SELURUH DATA BOOKING TELAH TERSINKRONISASI DENGAN MENDAPATKAN LINK CUSTOMER RESMI.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Gagal memperbaiki data booking customer:', err);
    process.exit(1);
  }
}

fixExistingBookings();
