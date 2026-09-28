const bcrypt = require('bcryptjs');
const { sequelize, Role, User, KategoriAlat, Alat } = require('../models');

const seed = async () => {
  try {
    // Sync database (force: false agar tidak drop tabel)
    await sequelize.sync({ alter: true });
    console.log('✅ Database synced');

    // Roles
    const [adminRole] = await Role.findOrCreate({
      where: { nama_role: 'admin' },
      defaults: { nama_role: 'admin' },
    });
    const [pickupRole] = await Role.findOrCreate({
      where: { nama_role: 'pengeluaran' },
      defaults: { nama_role: 'pengeluaran' },
    });
    const [returnRole] = await Role.findOrCreate({
      where: { nama_role: 'penerimaan' },
      defaults: { nama_role: 'penerimaan' },
    });
    const [keuanganRole] = await Role.findOrCreate({
      where: { nama_role: 'keuangan' },
      defaults: { nama_role: 'keuangan' },
    });
    const [customerRole] = await Role.findOrCreate({
      where: { nama_role: 'customer' },
      defaults: { nama_role: 'customer' },
    });
    console.log('✅ Roles seeded');

    // Admin Booking user
    const adminExists = await User.findOne({ where: { email: 'admin@rental.com' } });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 12);
      await User.create({
        role_id: adminRole.id,
        nama: 'Admin Booking',
        email: 'admin@rental.com',
        password: hashedPassword,
        no_hp: '081234567890',
        status: 'aktif',
      });
      console.log('✅ Admin Booking user seeded (email: admin@rental.com, password: admin123)');
    }

    // Admin Pickup (Warehouse Out) user
    const pickupExists = await User.findOne({ where: { email: 'pickup@rental.com' } });
    if (!pickupExists) {
      const hashedPassword = await bcrypt.hash('admin123', 12);
      await User.create({
        role_id: pickupRole.id,
        nama: 'Admin Pengeluaran Barang',
        email: 'pickup@rental.com',
        password: hashedPassword,
        no_hp: '081211112222',
        status: 'aktif',
      });
      console.log('✅ Admin Pickup user seeded (email: pickup@rental.com, password: admin123)');
    }

    // Admin Return (Warehouse In) user
    const returnExists = await User.findOne({ where: { email: 'return@rental.com' } });
    if (!returnExists) {
      const hashedPassword = await bcrypt.hash('admin123', 12);
      await User.create({
        role_id: returnRole.id,
        nama: 'Admin Penerimaan Barang',
        email: 'return@rental.com',
        password: hashedPassword,
        no_hp: '081233334444',
        status: 'aktif',
      });
      console.log('✅ Admin Return user seeded (email: return@rental.com, password: admin123)');
    }

    // Admin Finance user
    const financeExists = await User.findOne({ where: { email: 'finance@rental.com' } });
    if (!financeExists) {
      const hashedPassword = await bcrypt.hash('admin123', 12);
      await User.create({
        role_id: keuanganRole.id,
        nama: 'Admin Finance',
        email: 'finance@rental.com',
        password: hashedPassword,
        no_hp: '081298765432',
        status: 'aktif',
      });
      console.log('✅ Admin Finance user seeded (email: finance@rental.com, password: admin123)');
    }

    // Kategori Alat
    const kategoriData = [
      { nama_kategori: 'Alat Berkemah', deskripsi: 'Perlengkapan berkemah dan outdoor' },
      { nama_kategori: 'Alat Pertukangan', deskripsi: 'Peralatan pertukangan dan konstruksi' },
      { nama_kategori: 'Alat Elektronik', deskripsi: 'Peralatan elektronik dan multimedia' },
      { nama_kategori: 'Alat Olahraga', deskripsi: 'Peralatan olahraga dan kebugaran' },
    ];

    for (const k of kategoriData) {
      await KategoriAlat.findOrCreate({ where: { nama_kategori: k.nama_kategori }, defaults: k });
    }
    console.log('✅ Kategori alat seeded');

    // Alat
    const kategori = await KategoriAlat.findAll();
    const alatData = [
      {
        kategori_id: kategori[0].id,
        kode_alat: 'ALT-KMP-001',
        nama_alat: 'Tenda Dome 4 Orang',
        merek: 'Eiger',
        deskripsi: 'Tenda dome kapasitas 4 orang, tahan air',
        harga_sewa: 150000,
        stok: 5,
        kondisi: 'baik',
        status: 'tersedia',
      },
      {
        kategori_id: kategori[0].id,
        kode_alat: 'ALT-KMP-002',
        nama_alat: 'Sleeping Bag',
        merek: 'Consina',
        deskripsi: 'Sleeping bag untuk suhu dingin',
        harga_sewa: 50000,
        stok: 10,
        kondisi: 'baik',
        status: 'tersedia',
      },
      {
        kategori_id: kategori[1].id,
        kode_alat: 'ALT-TKG-001',
        nama_alat: 'Mesin Bor Listrik',
        merek: 'Bosch',
        deskripsi: 'Mesin bor listrik 600W',
        harga_sewa: 100000,
        stok: 3,
        kondisi: 'baik',
        status: 'tersedia',
      },
      {
        kategori_id: kategori[2].id,
        kode_alat: 'ALT-ELK-001',
        nama_alat: 'Proyektor Full HD',
        merek: 'Epson',
        deskripsi: 'Proyektor Full HD 3500 lumens',
        harga_sewa: 250000,
        stok: 2,
        kondisi: 'baik',
        status: 'tersedia',
      },
    ];

    for (const a of alatData) {
      await Alat.findOrCreate({ where: { kode_alat: a.kode_alat }, defaults: a });
    }
    console.log('✅ Alat seeded');

    console.log('\n🎉 Seeding selesai!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
};

seed();
