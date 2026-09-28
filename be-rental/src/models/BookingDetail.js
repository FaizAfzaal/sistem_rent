const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BookingDetail = sequelize.define(
  'BookingDetail',
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
    },
    tanggal_mulai: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    tanggal_selesai: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    subtotal: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    kelengkapan: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: 'Unit utama, tas & aksesoris standar',
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
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'WAITING_PICKUP',
    },
    durasi_jam: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    tableName: 'booking_detail',
    timestamps: false,
  }
);

module.exports = BookingDetail;
