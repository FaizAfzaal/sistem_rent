const sequelize = require('../config/database');
const Role = require('./Role');
const User = require('./User');
const Customer = require('./Customer');
const KategoriAlat = require('./KategoriAlat');
const Alat = require('./Alat');
const Booking = require('./Booking');
const BookingDetail = require('./BookingDetail');
const Pembayaran = require('./Pembayaran');
const Pengembalian = require('./Pengembalian');
const PickupTransaction = require('./PickupTransaction');
const ReturnTransaction = require('./ReturnTransaction');
const Invoice = require('./Invoice');
const InvoiceDetail = require('./InvoiceDetail');
const Maintenance = require('./Maintenance');
const AuditLog = require('./AuditLog');
const PaymentHistory = require('./PaymentHistory');
const AlatKelengkapan = require('./AlatKelengkapan');
const BookingChecklist = require('./BookingChecklist');

// Role -> User
Role.hasMany(User, { foreignKey: 'role_id', as: 'users' });
User.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });

// KategoriAlat -> Alat
KategoriAlat.hasMany(Alat, { foreignKey: 'kategori_id', as: 'alat' });
Alat.belongsTo(KategoriAlat, { foreignKey: 'kategori_id', as: 'kategori' });

// Alat -> AlatKelengkapan (Master Data Kelengkapan)
Alat.hasMany(AlatKelengkapan, { foreignKey: 'alat_id', as: 'kelengkapan_list', onDelete: 'CASCADE' });
AlatKelengkapan.belongsTo(Alat, { foreignKey: 'alat_id', as: 'alat' });

// User -> Booking
User.hasMany(Booking, { foreignKey: 'user_id', as: 'bookings' });
Booking.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Customer -> Booking
Customer.hasMany(Booking, { foreignKey: 'customer_id', as: 'bookings' });
Booking.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });

// Booking -> BookingDetail
Booking.hasMany(BookingDetail, { foreignKey: 'booking_id', as: 'details' });
BookingDetail.belongsTo(Booking, { foreignKey: 'booking_id', as: 'booking' });

// Alat -> BookingDetail
Alat.hasMany(BookingDetail, { foreignKey: 'alat_id', as: 'booking_details' });
BookingDetail.belongsTo(Alat, { foreignKey: 'alat_id', as: 'alat' });

// Booking -> BookingChecklist (Transaction Snapshot)
Booking.hasMany(BookingChecklist, { foreignKey: 'booking_id', as: 'checklists', onDelete: 'CASCADE' });
BookingChecklist.belongsTo(Booking, { foreignKey: 'booking_id', as: 'booking' });

// BookingDetail -> BookingChecklist
BookingDetail.hasMany(BookingChecklist, { foreignKey: 'booking_detail_id', as: 'checklists', onDelete: 'CASCADE' });
BookingChecklist.belongsTo(BookingDetail, { foreignKey: 'booking_detail_id', as: 'booking_detail' });

// Alat -> BookingChecklist
Alat.hasMany(BookingChecklist, { foreignKey: 'alat_id', as: 'booking_checklists' });
BookingChecklist.belongsTo(Alat, { foreignKey: 'alat_id', as: 'alat' });

// Booking -> Pembayaran
Booking.hasMany(Pembayaran, { foreignKey: 'booking_id', as: 'pembayaran' });
Pembayaran.belongsTo(Booking, { foreignKey: 'booking_id', as: 'booking' });

// Booking -> Invoice
Booking.hasOne(Invoice, { foreignKey: 'booking_id', as: 'invoice' });
Invoice.belongsTo(Booking, { foreignKey: 'booking_id', as: 'booking' });

// Invoice -> InvoiceDetail
Invoice.hasMany(InvoiceDetail, { foreignKey: 'invoice_id', as: 'details' });
InvoiceDetail.belongsTo(Invoice, { foreignKey: 'invoice_id', as: 'invoice' });

// Invoice -> PaymentHistory
Invoice.hasMany(PaymentHistory, { foreignKey: 'invoice_id', as: 'payment_histories' });
PaymentHistory.belongsTo(Invoice, { foreignKey: 'invoice_id', as: 'invoice' });

// User -> PaymentHistory
User.hasMany(PaymentHistory, { foreignKey: 'user_id', as: 'recorded_payments' });
PaymentHistory.belongsTo(User, { foreignKey: 'user_id', as: 'admin' });

// Alat -> InvoiceDetail
Alat.hasMany(InvoiceDetail, { foreignKey: 'alat_id', as: 'invoice_details' });
InvoiceDetail.belongsTo(Alat, { foreignKey: 'alat_id', as: 'alat' });

// Alat -> Maintenance
Alat.hasMany(Maintenance, { foreignKey: 'alat_id', as: 'maintenance_history' });
Maintenance.belongsTo(Alat, { foreignKey: 'alat_id', as: 'alat' });

// User -> AuditLog
User.hasMany(AuditLog, { foreignKey: 'user_id', as: 'audit_logs' });
AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Booking -> Pengembalian (Legacy alias)
Booking.hasOne(Pengembalian, { foreignKey: 'booking_id', as: 'pengembalian' });
Pengembalian.belongsTo(Booking, { foreignKey: 'booking_id', as: 'booking' });

// Booking -> PickupTransaction & ReturnTransaction
Booking.hasOne(PickupTransaction, { foreignKey: 'booking_id', as: 'pickup' });
PickupTransaction.belongsTo(Booking, { foreignKey: 'booking_id', as: 'booking' });

Booking.hasOne(ReturnTransaction, { foreignKey: 'booking_id', as: 'return' });
ReturnTransaction.belongsTo(Booking, { foreignKey: 'booking_id', as: 'booking' });

// BookingDetail -> PickupTransaction, ReturnTransaction, & InvoiceDetail
BookingDetail.hasMany(PickupTransaction, { foreignKey: 'booking_detail_id', as: 'pickups' });
BookingDetail.hasOne(PickupTransaction, { foreignKey: 'booking_detail_id', as: 'pickup' });
PickupTransaction.belongsTo(BookingDetail, { foreignKey: 'booking_detail_id', as: 'booking_detail' });

BookingDetail.hasMany(ReturnTransaction, { foreignKey: 'booking_detail_id', as: 'returns' });
BookingDetail.hasOne(ReturnTransaction, { foreignKey: 'booking_detail_id', as: 'return' });
ReturnTransaction.belongsTo(BookingDetail, { foreignKey: 'booking_detail_id', as: 'booking_detail' });

BookingDetail.hasMany(InvoiceDetail, { foreignKey: 'booking_detail_id', as: 'invoice_details' });
InvoiceDetail.belongsTo(BookingDetail, { foreignKey: 'booking_detail_id', as: 'booking_detail' });

const RentalDocument = require('./RentalDocument');
const DailyChecklist = require('./DailyChecklist');

// Booking -> RentalDocument
Booking.hasMany(RentalDocument, { foreignKey: 'rental_id', as: 'documents' });
RentalDocument.belongsTo(Booking, { foreignKey: 'rental_id', as: 'booking' });

// User -> RentalDocument
User.hasMany(RentalDocument, { foreignKey: 'created_by', as: 'documents' });
RentalDocument.belongsTo(User, { foreignKey: 'created_by', as: 'admin' });

// Alat -> DailyChecklist
Alat.hasMany(DailyChecklist, { foreignKey: 'alat_id', as: 'daily_checklists', onDelete: 'CASCADE' });
DailyChecklist.belongsTo(Alat, { foreignKey: 'alat_id', as: 'alat' });

module.exports = {
  sequelize,
  Role,
  User,
  Customer,
  KategoriAlat,
  Alat,
  AlatKelengkapan,
  BookingChecklist,
  Booking,
  BookingDetail,
  Pembayaran,
  Pengembalian,
  PickupTransaction,
  ReturnTransaction,
  Invoice,
  InvoiceDetail,
  Maintenance,
  AuditLog,
  PaymentHistory,
  RentalDocument,
  DailyChecklist,
};


