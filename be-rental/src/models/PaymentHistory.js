const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PaymentHistory = sequelize.define(
  'PaymentHistory',
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    invoice_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    jumlah: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    metode_pembayaran: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'Transfer Bank',
    },
    status: {
      type: DataTypes.ENUM('SEBAGIAN', 'LUNAS', 'DP', 'DIBATALKAN'),
      allowNull: false,
      defaultValue: 'LUNAS',
    },
    bukti_pembayaran: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    catatan: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'payment_history',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = PaymentHistory;
