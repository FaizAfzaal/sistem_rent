const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AlatKelengkapan = sequelize.define(
  'AlatKelengkapan',
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
    nama_kelengkapan: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
  },
  {
    tableName: 'alat_kelengkapan',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = AlatKelengkapan;
