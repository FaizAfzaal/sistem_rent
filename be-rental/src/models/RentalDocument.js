const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RentalDocument = sequelize.define('RentalDocument', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  rental_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
    field: 'rental_id',
  },
  document_type: {
    type: DataTypes.ENUM('OUTGOING', 'RETURN'),
    allowNull: false,
  },
  document_number: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  customer_signature: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
  },
  admin_signature: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
  },
  pdf_path: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  condition_data: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('condition_data');
      if (!rawValue) return null;
      try {
        return typeof rawValue === 'object' ? rawValue : JSON.parse(rawValue);
      } catch (e) {
        return rawValue;
      }
    },
    set(value) {
      if (typeof value === 'object') {
        this.setDataValue('condition_data', JSON.stringify(value));
      } else {
        this.setDataValue('condition_data', value);
      }
    },
  },
  created_by: {
    type: DataTypes.BIGINT,
    allowNull: true,
  },
}, {
  tableName: 'rental_documents',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = RentalDocument;
