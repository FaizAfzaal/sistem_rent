const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PickupTransaction = sequelize.define(
  'PickupTransaction',
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
    pickup_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    pickup_phone: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    pickup_relation: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: 'Customer',
    },
    pickup_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    pickup_time: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: '09:00',
    },
    pickup_signature: {
      type: DataTypes.TEXT('long'),
      allowNull: false,
    },
    pickup_photos: {
      type: DataTypes.TEXT, // Store JSON string array of photo paths
      allowNull: true,
    },
    condition_status: {
      type: DataTypes.ENUM('baik', 'ada_minus'),
      allowNull: false,
      defaultValue: 'baik',
    },
    pickup_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'pickup_transactions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = PickupTransaction;
