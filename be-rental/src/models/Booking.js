const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Booking = sequelize.define(
  'Booking',
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    kode_booking: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    customer_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    tanggal_booking: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    tanggal_mulai: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    tanggal_selesai: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    actual_return_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    total_harga: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    discount_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 0.00,
    },
    discount_amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: 0.00,
    },
    final_payment: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'WAITING_PICKUP',
    },
    opsi_pembayaran: {
      type: DataTypes.ENUM('dp', 'bayar_setelah_selesai', 'batal_booking', 'lunas_awal'),
      allowNull: true,
      defaultValue: 'dp',
    },
    status_pembayaran: {
      type: DataTypes.ENUM('belum_bayar', 'dp_lunas', 'bayar_di_akhir', 'lunas', 'dibatalkan'),
      allowNull: true,
      defaultValue: 'belum_bayar',
    },
    jumlah_dp: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: 0,
    },
    sisa_pembayaran: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: 0,
    },
    jam_mulai: {
      type: DataTypes.STRING(10),
      allowNull: true,
      defaultValue: '08:00',
    },
    jam_selesai: {
      type: DataTypes.STRING(10),
      allowNull: true,
      defaultValue: '17:00',
    },
    uang_jaminan: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: 0,
    },
    jenis_jaminan: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: 'KTP Asli',
    },
    tanda_tangan_customer: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },
    tanda_tangan_admin: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },
    catatan: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    alasan_pembatalan: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    pengambil_nama: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    pengambil_no_hp: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    pengambil_hubungan: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
  },
  {
    tableName: 'booking',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = Booking;
