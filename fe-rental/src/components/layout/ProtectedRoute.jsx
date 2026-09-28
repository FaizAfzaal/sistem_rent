import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export function BookingOnlyRoute({ children }) {
  const { user, isAdmin1, activeModule, isKeuangan } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (isKeuangan) return <Navigate to="/finance/booking-masuk" replace />;
  if (isAdmin1 && activeModule !== 'BOOKING') {
    if (activeModule === 'PICKUP') return <Navigate to="/pickup/ready" replace />;
    if (activeModule === 'RETURN') return <Navigate to="/return/rented" replace />;
    return <Navigate to="/admin/select-module" replace />;
  }
  return children;
}

export function AdminRoute({ children }) {
  const { user, isAdmin, isAdmin1, activeModule } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (isAdmin1 && !activeModule) return <Navigate to="/admin/select-module" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}

export function KeuanganRoute({ children }) {
  const { user, isKeuangan, isAdmin } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!isKeuangan && !isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}

export function PickupRoute({ children }) {
  const { user, isAdminPickup, isAdmin1, activeModule } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (isAdmin1 && !activeModule) return <Navigate to="/admin/select-module" replace />;
  if (!isAdminPickup && !isAdmin1) return <Navigate to="/dashboard" replace />;
  return children;
}

export function ReturnRoute({ children }) {
  const { user, isAdminReturn, isAdmin1, activeModule } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (isAdmin1 && !activeModule) return <Navigate to="/admin/select-module" replace />;
  if (!isAdminReturn && !isAdmin1) return <Navigate to="/dashboard" replace />;
  return children;
}

export function StaffRoute({ children }) {
  const { user, isStaff, isAdmin1, activeModule } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (isAdmin1 && !activeModule) return <Navigate to="/admin/select-module" replace />;
  if (!isStaff) return <Navigate to="/dashboard" replace />;
  return children;
}

export function GuestRoute({ children }) {
  const { user, isAdmin1, activeModule, isKeuangan } = useAuth();
  if (user) {
    if (isKeuangan) return <Navigate to="/finance/booking-masuk" replace />;
    if (isAdmin1) {
      if (activeModule === 'PICKUP') return <Navigate to="/pickup/ready" replace />;
      if (activeModule === 'RETURN') return <Navigate to="/return/rented" replace />;
      if (activeModule === 'BOOKING') return <Navigate to="/admin" replace />;
      return <Navigate to="/admin/select-module" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}
