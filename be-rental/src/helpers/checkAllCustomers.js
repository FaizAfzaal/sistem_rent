const { Customer, User, Role } = require('../models');
const { generateCustomerCode } = require('../helpers/generateKode');

async function syncAllCustomers() {
  try {
    console.log('🔍 Checking all Customer & User records...');
    const customers = await Customer.findAll();
    console.log(`📋 Total Customer in Customer table: ${customers.length}`);
    customers.forEach(c => {
      console.log(` - ID: ${c.id} | Code: ${c.customer_code} | Name: ${c.full_name} | Phone: ${c.phone} | NIK: ${c.identity_number}`);
    });

    // Sync any user accounts with role 'customer' into Customer table if missing
    const custRole = await Role.findOne({ where: { nama_role: 'customer' } });
    const userCustomers = await User.findAll({ where: { role_id: custRole ? custRole.id : 2 } });
    console.log(`\n📋 Total User with role 'customer': ${userCustomers.length}`);

    for (const u of userCustomers) {
      let custMatch = await Customer.findOne({ where: { email: u.email } });
      if (!custMatch && u.nama) {
        custMatch = await Customer.findOne({ where: { full_name: u.nama } });
      }
      if (!custMatch) {
        const code = await generateCustomerCode(Customer);
        custMatch = await Customer.create({
          customer_code: code,
          full_name: u.nama,
          phone: u.no_hp || '-',
          email: u.email,
          identity_number: u.nik || `ID-${u.id}`,
          address: u.alamat || '-',
        });
        console.log(`✨ Created missing Customer record for User "${u.nama}" (ID: ${custMatch.id})`);
      }
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

syncAllCustomers();
