# Setup Database - Sistem Rental Alat

## Cara Import Database via phpMyAdmin

### Langkah 1: Buka phpMyAdmin
Akses phpMyAdmin di browser: `http://localhost/phpmyadmin` atau `http://localhost:88/phpmyadmin`

### Langkah 2: Import File SQL
1. Klik tab **"Import"** di menu atas
2. Klik tombol **"Choose File"** atau **"Browse"**
3. Pilih file: `d:\be-rental\database\migration.sql`
4. Scroll ke bawah, klik tombol **"Go"** atau **"Import"**
5. Tunggu sampai muncul pesan sukses

### Langkah 3: Verifikasi Database
Setelah import berhasil, Anda akan melihat:
- Database baru: `db_rental`
- 8 tabel:
  - `roles` (2 data: admin, customer)
  - `users` (2 data: admin@rental.com, customer@rental.com)
  - `kategori_alat` (4 data kategori)
  - `alat` (4 data alat sample)
  - `booking`
  - `booking_detail`
  - `pembayaran`
  - `pengembalian`

## User Default

### Admin
- **Email:** admin@rental.com
- **Password:** admin123

### Customer
- **Email:** customer@rental.com
- **Password:** customer123

## Struktur Database

```
db_rental/
├── roles                 # Role user (admin, customer)
├── users                 # Data user
├── kategori_alat         # Kategori alat rental
├── alat                  # Master data alat
├── booking               # Transaksi booking
├── booking_detail        # Detail item booking
├── pembayaran            # Data pembayaran
└── pengembalian          # Data pengembalian alat
```

## Foreign Key Relationships

- `users.role_id` → `roles.id`
- `alat.kategori_id` → `kategori_alat.id`
- `booking.user_id` → `users.id`
- `booking_detail.booking_id` → `booking.id`
- `booking_detail.alat_id` → `alat.id`
- `pembayaran.booking_id` → `booking.id`
- `pengembalian.booking_id` → `booking.id`

## Troubleshooting

### Error: Database sudah ada
Jika database `db_rental` sudah ada:
1. Hapus database lama: DROP DATABASE `db_rental`;
2. Import ulang file migration.sql

### Error: Foreign key constraint
Pastikan import dijalankan secara berurutan (file migration.sql sudah terurut dengan benar)

---

Setelah database berhasil di-import, jalankan:
```bash
npm run dev
```

Server akan berjalan di: http://localhost:3000
