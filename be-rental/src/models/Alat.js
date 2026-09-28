const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Alat = sequelize.define(
  'Alat',
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    kategori_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    kode_alat: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
    },
    nama_alat: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    merek: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    pemilik: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: 'RIS',
    },
    deskripsi: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    harga_sewa: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    stok: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    kondisi: {
      type: DataTypes.ENUM('baik', 'rusak_ringan', 'rusak_berat'),
      allowNull: true,
      defaultValue: 'baik',
    },
    gambar: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(
        'TERSEDIA',
        'MENUNGGU_PENGAMBILAN',
        'SEDANG_DISEWA',
        'MENUNGGU_PENGEMBALIAN',
        'PEMERIKSAAN_BARANG',
        'MAINTENANCE',
        'TERSEDIA_KEMBALI',
        'tidak_tersedia'
      ),
      allowNull: true,
      defaultValue: 'TERSEDIA',
    },
  },
  {
    tableName: 'alat',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = Alat;
