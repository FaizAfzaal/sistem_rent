const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define(
  'User',
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    role_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    nama: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    no_hp: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    nik: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    kontak_darurat_nama: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    kontak_darurat_hp: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    alamat: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    foto: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('aktif', 'nonaktif'),
      allowNull: true,
      defaultValue: 'aktif',
    },
  },
  {
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = User;
