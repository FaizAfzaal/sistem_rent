const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const InvoiceDetail = sequelize.define(
  'InvoiceDetail',
  {
    id_invoice_detail: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    invoice_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    booking_detail_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    alat_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    qty: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    harga: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    subtotal: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: 'invoice_detail',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = InvoiceDetail;
