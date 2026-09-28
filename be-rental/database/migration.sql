-- ============================================
-- Database: db_rental
-- Migration Script - Sistem Rental Alat
-- ============================================

-- Buat database jika belum ada
CREATE DATABASE IF NOT EXISTS `db_rental` 
DEFAULT CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `db_rental`;

-- ============================================
-- Table: roles
-- ============================================
CREATE TABLE IF NOT EXISTS `roles` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nama_role` VARCHAR(50) NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: users
-- ============================================
CREATE TABLE IF NOT EXISTS `users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `role_id` BIGINT UNSIGNED NOT NULL,
  `nama` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `no_hp` VARCHAR(20) NULL,
  `alamat` TEXT NULL,
  `foto` VARCHAR(255) NULL,
  `status` ENUM('aktif', 'nonaktif') NULL DEFAULT 'aktif',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_role_id` (`role_id`),
  KEY `idx_email` (`email`),
  CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: kategori_alat
-- ============================================
CREATE TABLE IF NOT EXISTS `kategori_alat` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nama_kategori` VARCHAR(100) NOT NULL,
  `deskripsi` TEXT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: alat
-- ============================================
CREATE TABLE IF NOT EXISTS `alat` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `kategori_id` BIGINT UNSIGNED NOT NULL,
  `kode_alat` VARCHAR(30) NOT NULL UNIQUE,
  `nama_alat` VARCHAR(100) NOT NULL,
  `merek` VARCHAR(100) NULL,
  `deskripsi` TEXT NULL,
  `harga_sewa` DECIMAL(12,2) NOT NULL,
  `stok` INT NULL DEFAULT 0,
  `kondisi` ENUM('baik', 'rusak_ringan', 'rusak_berat') NULL DEFAULT 'baik',
  `gambar` VARCHAR(255) NULL,
  `status` ENUM('tersedia', 'disewa', 'tidak_tersedia') NULL DEFAULT 'tersedia',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_kategori_id` (`kategori_id`),
  KEY `idx_kode_alat` (`kode_alat`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_alat_kategori` FOREIGN KEY (`kategori_id`) REFERENCES `kategori_alat` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: booking
-- ============================================
CREATE TABLE IF NOT EXISTS `booking` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `kode_booking` VARCHAR(30) NOT NULL UNIQUE,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `tanggal_booking` DATETIME NOT NULL,
  `tanggal_mulai` DATE NOT NULL,
  `tanggal_selesai` DATE NOT NULL,
  `total_harga` DECIMAL(12,2) NULL,
  `status` ENUM('pending', 'dikonfirmasi', 'permohonan_pembatalan', 'disewa', 'selesai', 'dibatalkan') NULL DEFAULT 'pending',
  `catatan` TEXT NULL,
  `alasan_pembatalan` TEXT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_kode_booking` (`kode_booking`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_booking_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: booking_detail
-- ============================================
CREATE TABLE IF NOT EXISTS `booking_detail` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `booking_id` BIGINT UNSIGNED NOT NULL,
  `alat_id` BIGINT UNSIGNED NOT NULL,
  `qty` INT NOT NULL DEFAULT 1,
  `harga` DECIMAL(12,2) NOT NULL,
  `subtotal` DECIMAL(12,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_booking_id` (`booking_id`),
  KEY `idx_alat_id` (`alat_id`),
  CONSTRAINT `fk_booking_detail_booking` FOREIGN KEY (`booking_id`) REFERENCES `booking` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_booking_detail_alat` FOREIGN KEY (`alat_id`) REFERENCES `alat` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: pembayaran
-- ============================================
CREATE TABLE IF NOT EXISTS `pembayaran` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `booking_id` BIGINT UNSIGNED NOT NULL,
  `tanggal_bayar` DATETIME NULL,
  `metode` ENUM('transfer', 'tunai', 'qris', 'kartu_kredit') NULL,
  `jumlah` DECIMAL(12,2) NOT NULL,
  `bukti_bayar` VARCHAR(255) NULL,
  `status` ENUM('menunggu', 'lunas', 'gagal', 'dikembalikan') NULL DEFAULT 'menunggu',
  `alasan_penolakan` TEXT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_booking_id` (`booking_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_pembayaran_booking` FOREIGN KEY (`booking_id`) REFERENCES `booking` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: pengembalian
-- ============================================
CREATE TABLE IF NOT EXISTS `pengembalian` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `booking_id` BIGINT UNSIGNED NOT NULL,
  `tanggal_pengembalian` DATE NOT NULL,
  `kondisi_alat` ENUM('baik', 'rusak_ringan', 'rusak_berat') NULL,
  `denda` DECIMAL(12,2) NULL DEFAULT 0.00,
  `catatan` TEXT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_booking_id` (`booking_id`),
  CONSTRAINT `fk_pengembalian_booking` FOREIGN KEY (`booking_id`) REFERENCES `booking` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Seed Data: Roles
-- ============================================
INSERT INTO `roles` (`id`, `nama_role`) VALUES 
(1, 'admin'),
(2, 'customer')
ON DUPLICATE KEY UPDATE `nama_role` = VALUES(`nama_role`);

-- ============================================
-- Seed Data: Users (Default Admin & Customer)
-- Password: admin123 untuk admin, customer123 untuk customer
-- ============================================
INSERT INTO `users` (`id`, `role_id`, `nama`, `email`, `password`, `no_hp`, `alamat`, `status`) VALUES 
(1, 1, 'Administrator', 'admin@rental.com', '$2b$12$dh3FHJ14VcucpcaThDu3NuN1zOd3N4fYgUZgFwgB11wTmAC2sQsXy', '081234567890', NULL, 'aktif'),
(2, 2, 'Customer Demo', 'customer@rental.com', '$2b$12$zjCgQ72EC5fkNg/lDrEhseNIZIRai.HahA8GMiBnTL9ocq81Tpg9W', '089876543210', 'Jl. Contoh No. 1, Jakarta', 'aktif')
ON DUPLICATE KEY UPDATE `nama` = VALUES(`nama`);

-- ============================================
-- Seed Data: Kategori Alat
-- ============================================
INSERT INTO `kategori_alat` (`id`, `nama_kategori`, `deskripsi`) VALUES 
(1, 'Alat Berkemah', 'Perlengkapan berkemah dan outdoor'),
(2, 'Alat Pertukangan', 'Peralatan pertukangan dan konstruksi'),
(3, 'Alat Elektronik', 'Peralatan elektronik dan multimedia'),
(4, 'Alat Olahraga', 'Peralatan olahraga dan kebugaran')
ON DUPLICATE KEY UPDATE `deskripsi` = VALUES(`deskripsi`);

-- ============================================
-- Seed Data: Alat
-- ============================================
INSERT INTO `alat` (`id`, `kategori_id`, `kode_alat`, `nama_alat`, `merek`, `deskripsi`, `harga_sewa`, `stok`, `kondisi`, `status`) VALUES 
(1, 1, 'ALT-KMP-001', 'Tenda Dome 4 Orang', 'Eiger', 'Tenda dome kapasitas 4 orang, tahan air', 150000.00, 5, 'baik', 'tersedia'),
(2, 1, 'ALT-KMP-002', 'Sleeping Bag', 'Consina', 'Sleeping bag untuk suhu dingin', 50000.00, 10, 'baik', 'tersedia'),
(3, 2, 'ALT-TKG-001', 'Mesin Bor Listrik', 'Bosch', 'Mesin bor listrik 600W', 100000.00, 3, 'baik', 'tersedia'),
(4, 3, 'ALT-ELK-001', 'Proyektor Full HD', 'Epson', 'Proyektor Full HD 3500 lumens', 250000.00, 2, 'baik', 'tersedia')
ON DUPLICATE KEY UPDATE `nama_alat` = VALUES(`nama_alat`);

-- ============================================
-- Migration Complete
-- ============================================
