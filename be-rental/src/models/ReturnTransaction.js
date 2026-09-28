const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ReturnTransaction = sequelize.define(
  'ReturnTransaction',
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
    return_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    return_phone: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    return_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    return_time: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: '17:00',
    },
    return_signature: {
      type: DataTypes.TEXT('long'),
      allowNull: false,
    },
    return_photos: {
      type: DataTypes.TEXT, // Store JSON string array of photo paths
      allowNull: true,
    },
    damage_status: {
      type: DataTypes.ENUM('sesuai_awal', 'ada_kerusakan'),
      allowNull: false,
      defaultValue: 'sesuai_awal',
    },
    damage_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    return_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    return_type: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'NORMAL', // 'NORMAL' or 'EARLY_RETURN'
    },
    early_return_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    early_return_time: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    early_return_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    approved_by: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
  },
  {
    tableName: 'return_transactions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = ReturnTransaction;
