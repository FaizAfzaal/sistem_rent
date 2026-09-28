const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Pembayaran = sequelize.define(
  'Pembayaran',
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    booking_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    tanggal_bayar: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    metode: {
      type: DataTypes.ENUM('transfer', 'tunai', 'qris', 'kartu_kredit'),
      allowNull: true,
    },
    jumlah: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    tipe_pembayaran: {
      type: DataTypes.ENUM('dp', 'pelunasan', 'lunas'),
      allowNull: true,
      defaultValue: 'lunas',
    },
    bukti_bayar: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('menunggu', 'lunas', 'gagal', 'dikembalikan'),
      allowNull: true,
      defaultValue: 'menunggu',
    },
    alasan_penolakan: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'pembayaran',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = Pembayaran;
