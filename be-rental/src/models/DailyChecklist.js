const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DailyChecklist = sequelize.define(
  'DailyChecklist',
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    alat_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    tanggal_pemeriksaan: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    waktu_pemeriksaan: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: '07:00:00',
    },
    total_stok: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    stok_tersedia: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    stok_sedang_disewa: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    status_ketersediaan: {
      type: DataTypes.ENUM('TERSEDIA', 'TIDAK_TERSEDIA', 'STOK_MENIPIS', 'TIDAK_AKTIF'),
      allowNull: false,
      defaultValue: 'TERSEDIA',
    },
    is_checked: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    keterangan: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    tipe_pemeriksaan: {
      type: DataTypes.ENUM('OTOMATIS', 'MANUAL'),
      allowNull: false,
      defaultValue: 'OTOMATIS',
    },
    foto_rak: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    foto_fisik: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'daily_checklists',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['tanggal_pemeriksaan', 'alat_id'],
        name: 'unique_daily_checklist_per_alat',
      },
    ],
  }
);

module.exports = DailyChecklist;
