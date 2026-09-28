const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AuditLog = sequelize.define(
  'AuditLog',
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    aktivitas: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    data_sebelum: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    data_sesudah: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    tableName: 'audit_logs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  }
);

module.exports = AuditLog;
