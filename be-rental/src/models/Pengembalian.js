const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Pengembalian = sequelize.define(
  'Pengembalian',
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
    tanggal_pengembalian: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    kondisi_alat: {
      type: DataTypes.ENUM('baik', 'rusak_ringan', 'rusak_berat'),
      allowNull: true,
    },
    denda: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: 0,
    },
    catatan: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'pengembalian',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = Pengembalian;
