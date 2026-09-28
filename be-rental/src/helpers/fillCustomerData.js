const { Customer, User } = require('../models');

async function fillMissingCustomerData() {
  try {
    console.log('🚀 Memulai pengisian data customer & user yang masih kosong...');

    const customerUpdates = [
      {
        customer_code: 'CUST0006',
        full_name: 'Afzal Pratama',
        company_name: 'PT Afzal Karya Mandiri',
        phone: '081234567890',
        email: 'afzaal@gmail.com',
        identity_number: '3174012903910001',
        address: 'Jl. Raya Industri No. 12, Jakarta Pusat',
        city: 'Jakarta Pusat',
        province: 'DKI Jakarta',
        postal_code: '10110',
      },
      {
        customer_code: 'CUST0002',
        full_name: 'Ujang Suherman',
        company_name: 'PT Ujang Jaya Konstruksi',
        phone: '081298765432',
        email: 'ujang3@gmail.com',
        identity_number: '3273021508880002',
        address: 'Jl. Merdeka Barat No. 45, Bandung',
        city: 'Bandung',
        province: 'Jawa Barat',
        postal_code: '40111',
      },
      {
        customer_code: 'CUST0003',
        full_name: 'Aji Pangestu',
        company_name: 'PT Aji Heavy Tech',
        phone: '085712345678',
        email: 'kodir@gmail.com',
        identity_number: '3578031204950003',
        address: 'Jl. Pemuda No. 88, Surabaya',
        city: 'Surabaya',
        province: 'Jawa Timur',
        postal_code: '60271',
      },
      {
        customer_code: 'CUST0004',
        full_name: 'Budi Santoso',
        company_name: 'CV Budi Perkasa',
        phone: '081399887766',
        email: 'yanti3@gmail.com',
        identity_number: '3374042006900004',
        address: 'Jl. Pandanaran No. 101, Semarang',
        city: 'Semarang',
        province: 'Jawa Tengah',
        postal_code: '50241',
      },
      {
        customer_code: 'CUST0005',
        full_name: 'Intan Permata',
        company_name: 'PT Intan Utama Sejahtera',
        phone: '087811223344',
        email: 'Intan@gmail.com',
        identity_number: '1271051809930005',
        address: 'Jl. Gajah Mada No. 55, Medan',
        city: 'Medan',
        province: 'Sumatera Utara',
        postal_code: '20112',
      },
      {
        customer_code: 'CUST0001',
        full_name: 'Sopi Wijaya',
        company_name: 'PT Sopi Jaya Abadi',
        phone: '081283010101',
        email: 'sopi@gmail.com',
        identity_number: '3671060907920006',
        address: 'Jl. Boulevard Gading No. 18, Tangerang',
        city: 'Tangerang',
        province: 'Banten',
        postal_code: '15810',
      },
    ];

    for (const data of customerUpdates) {
      let cust = await Customer.findOne({ where: { customer_code: data.customer_code } });
      if (!cust && data.email) {
        cust = await Customer.findOne({ where: { email: data.email } });
      }

      if (cust) {
        await cust.update(data);
        console.log(`✅ Updated Customer ${data.customer_code} (${data.full_name}) -> PT: ${data.company_name}, HP: ${data.phone}`);

        // Sync data ke User account terkait
        if (data.email) {
          const userMatch = await User.findOne({ where: { email: data.email } });
          if (userMatch) {
            await userMatch.update({
              nama: data.full_name,
              no_hp: data.phone,
              nik: data.identity_number,
              alamat: data.address,
            });
            console.log(`   ↳ Synced matching User #${userMatch.id} (${data.full_name})`);
          }
        }
      }
    }

    console.log('🎉 POPULASI DATA CUSTOMER BERHASIL LENGKAP 100%.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Gagal memperbarui data customer:', err);
    process.exit(1);
  }
}

fillMissingCustomerData();
