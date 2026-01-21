import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Loading from './Loading.jsx';

const ProtectedRoute = ({ children, requireAdmin = false, excludeRoles = [] }) => {
  const { user, loading } = useAuth();
  const location = window.location;

  if (loading) {
    return <Loading />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const userRole = user.role?.toLowerCase();

  // If admin route required, verify admin roles
  if (requireAdmin && !['admin', 'unit_admin', 'user'].includes(userRole)) {
    // If not authorized for admin routes, send to kiosk
    return <Navigate to="/kiosk/products" replace />;
  }

  // Check Excluded Roles (e.g. preventing admin from seeing kiosk pages if needed)
  if (excludeRoles.length > 0 && excludeRoles.includes(user.role)) {
    if (['admin', 'unit_admin', 'user'].includes(userRole)) {
      return <Navigate to="/admin/dashboard" replace />;
    }
    return <Navigate to="/kiosk/products" replace />;
  }

  return children;
};

export default ProtectedRoute;

