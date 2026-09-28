const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Invoice = sequelize.define(
  'Invoice',
  {
    id_invoice: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    booking_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      unique: true,
    },
    nomor_invoice: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    tanggal_invoice: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    subtotal: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    diskon: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    dp: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    total: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    status_pembayaran: {
      type: DataTypes.ENUM('BELUM_BAYAR', 'DP_DITERIMA', 'LUNAS', 'DIBATALKAN'),
      allowNull: false,
      defaultValue: 'BELUM_BAYAR',
    },
  },
  {
    tableName: 'invoice',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = Invoice;
