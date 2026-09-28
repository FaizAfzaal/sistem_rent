import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute, AdminRoute, KeuanganRoute, PickupRoute, ReturnRoute, StaffRoute, GuestRoute, BookingOnlyRoute } from './components/layout/ProtectedRoute';

// Auth
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Customer
import DashboardPage from './pages/customer/DashboardPage';
import AlatPage from './pages/customer/AlatPage';
import CreateBookingPage from './pages/customer/CreateBookingPage';
import BookingsPage from './pages/customer/BookingsPage';
import BookingDetailPage from './pages/customer/BookingDetailPage';
import PembayaranPage from './pages/customer/PembayaranPage';
import CreatePembayaranPage from './pages/customer/CreatePembayaranPage';
import UploadBuktiPage from './pages/customer/UploadBuktiPage';

// Admin & Staff
import ModuleSelectPage from './pages/admin/ModuleSelectPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import KategoriPage from './pages/admin/KategoriPage';
import AlatAdminPage from './pages/admin/AlatAdminPage';
import CustomerAdminPage from './pages/admin/CustomerAdminPage';
import BookingAdminPage from './pages/admin/BookingAdminPage';
import PembayaranAdminPage from './pages/admin/PembayaranAdminPage';
import PengembalianAdminPage from './pages/admin/PengembalianAdminPage';
import UsersAdminPage from './pages/admin/UsersAdminPage';
import LogBookPage from './pages/admin/LogBookPage';
import DailyChecklistPage from './pages/admin/DailyChecklistPage';
import AdminPickupPage from './pages/admin/AdminPickupPage';
import AdminReturnPage from './pages/admin/AdminReturnPage';
import AdminRentedPage from './pages/admin/AdminRentedPage';
import AdminReturnReadyPage from './pages/admin/AdminReturnReadyPage';
import AdminReturnDetailPage from './pages/admin/AdminReturnDetailPage';
import AdminReturnDocsPage from './pages/admin/AdminReturnDocsPage';
import AdminHistoryPage from './pages/admin/AdminHistoryPage';

// Admin Finance
import FinanceDashboardPage from './pages/finance/FinanceDashboardPage';
import BookingMasukPage from './pages/finance/BookingMasukPage';
import PembayaranFinancePage from './pages/finance/PembayaranFinancePage';
import InvoicePage from './pages/finance/InvoicePage';
import RiwayatTransaksiPage from './pages/finance/RiwayatTransaksiPage';
import LaporanKeuanganPage from './pages/finance/LaporanKeuanganPage';

// Shared
import ProfilePage from './pages/ProfilePage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              borderRadius: '12px',
              fontFamily: 'Inter, sans-serif',
              fontSize: '14px',
              fontWeight: '500',
            },
            success: { style: { background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' } },
            error: { style: { background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' } },
          }}
        />
        <Routes>
          {/* Public / Guest only */}
          <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
          <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />

          {/* Customer routes */}
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/alat" element={<ProtectedRoute><AlatPage /></ProtectedRoute>} />
          <Route path="/bookings" element={<ProtectedRoute><BookingsPage /></ProtectedRoute>} />
          <Route path="/bookings/baru" element={<ProtectedRoute><CreateBookingPage /></ProtectedRoute>} />
          <Route path="/bookings/:id" element={<ProtectedRoute><BookingDetailPage /></ProtectedRoute>} />
          <Route path="/bookings/:id/form" element={<ProtectedRoute><BookingDetailPage /></ProtectedRoute>} />
          <Route path="/pembayaran" element={<ProtectedRoute><PembayaranPage /></ProtectedRoute>} />
          <Route path="/pembayaran/buat/:bookingId" element={<ProtectedRoute><CreatePembayaranPage /></ProtectedRoute>} />
          <Route path="/pembayaran/upload/:id" element={<ProtectedRoute><UploadBuktiPage /></ProtectedRoute>} />

          {/* Admin & Staff routes */}
          <Route path="/admin/select-module" element={<ProtectedRoute><ModuleSelectPage /></ProtectedRoute>} />
          <Route path="/admin" element={<StaffRoute><AdminDashboard /></StaffRoute>} />
          <Route path="/admin/kategori" element={<StaffRoute><KategoriPage /></StaffRoute>} />
          <Route path="/admin/alat" element={<StaffRoute><AlatAdminPage /></StaffRoute>} />
          <Route path="/admin/customers" element={<StaffRoute><CustomerAdminPage /></StaffRoute>} />
          <Route path="/admin/bookings" element={<StaffRoute><BookingAdminPage /></StaffRoute>} />
          <Route path="/admin/bookings/:id/form" element={<StaffRoute><BookingDetailPage /></StaffRoute>} />
          <Route path="/admin/pembayaran" element={<KeuanganRoute><PembayaranAdminPage /></KeuanganRoute>} />
          <Route path="/admin/pengembalian" element={<KeuanganRoute><PengembalianAdminPage /></KeuanganRoute>} />
          <Route path="/admin/users" element={<AdminRoute><UsersAdminPage /></AdminRoute>} />
          <Route path="/admin/logbook" element={<BookingOnlyRoute><LogBookPage /></BookingOnlyRoute>} />
          <Route path="/admin/checklist" element={<BookingOnlyRoute><DailyChecklistPage /></BookingOnlyRoute>} />

          {/* Admin Pickup (Warehouse Out) & Return (Warehouse In) routes */}
          <Route path="/pickup/ready" element={<PickupRoute><AdminPickupPage /></PickupRoute>} />
          <Route path="/pickup/rented" element={<PickupRoute><AdminRentedPage /></PickupRoute>} />
          <Route path="/pickup/history" element={<PickupRoute><AdminHistoryPage /></PickupRoute>} />
          <Route path="/pickup/detail/:id" element={<PickupRoute><AdminReturnDetailPage /></PickupRoute>} />
          <Route path="/return/rented" element={<ReturnRoute><AdminRentedPage /></ReturnRoute>} />
          <Route path="/return/ready" element={<ReturnRoute><AdminReturnReadyPage /></ReturnRoute>} />
          <Route path="/return/history" element={<ReturnRoute><AdminHistoryPage /></ReturnRoute>} />
          <Route path="/return/docs" element={<ReturnRoute><AdminReturnDocsPage /></ReturnRoute>} />
          <Route path="/return/detail/:id" element={<ReturnRoute><AdminReturnDetailPage /></ReturnRoute>} />

          {/* Admin Finance routes */}
          <Route path="/finance" element={<KeuanganRoute><FinanceDashboardPage /></KeuanganRoute>} />
          <Route path="/finance/booking-masuk" element={<KeuanganRoute><BookingMasukPage /></KeuanganRoute>} />
          <Route path="/finance/pembayaran" element={<KeuanganRoute><PembayaranFinancePage /></KeuanganRoute>} />
          <Route path="/finance/invoice" element={<KeuanganRoute><InvoicePage /></KeuanganRoute>} />
          <Route path="/finance/riwayat-transaksi" element={<KeuanganRoute><RiwayatTransaksiPage /></KeuanganRoute>} />
          <Route path="/finance/laporan-keuangan" element={<KeuanganRoute><LaporanKeuanganPage /></KeuanganRoute>} />

          {/* Shared */}
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

          {/* Redirects */}
          <Route path="/" element={<Navigate to="/alat" replace />} />
          <Route path="*" element={<Navigate to="/alat" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
