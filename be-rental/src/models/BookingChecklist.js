const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BookingChecklist = sequelize.define(
  'BookingChecklist',
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
    booking_detail_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    alat_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    nama_kelengkapan: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    status_keluar: {
      type: DataTypes.ENUM('ADA', 'TIDAK_ADA'),
      allowNull: true,
      defaultValue: 'ADA',
    },
    keterangan_keluar: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    waktu_keluar: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    admin_keluar_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    status_kembali: {
      type: DataTypes.ENUM('ADA', 'TIDAK_ADA'),
      allowNull: true,
    },
    keterangan_kembali: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    waktu_kembali: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    admin_kembali_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
  },
  {
    tableName: 'booking_checklists',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = BookingChecklist;
