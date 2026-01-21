import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { OrderProvider } from './context/OrderContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import GlobalScannerListener from './components/GlobalScannerListener.jsx';
import Layout from './components/Layout.jsx';
import AdminLayout from './components/AdminLayout.jsx';

// Kiosk routes
import UnifiedLogin from './pages/UnifiedLogin.jsx';
import ProductSelection from './pages/kiosk/ProductSelection.jsx';
import CalendarSelection from './pages/kiosk/CalendarSelection.jsx';
import Payment from './pages/kiosk/Payment.jsx';
import Success from './pages/kiosk/Success.jsx';
import MyOrders from './pages/kiosk/MyOrders.jsx';
import OrderDetails from './pages/kiosk/OrderDetails.jsx';
import MealPlanView from './pages/kiosk/MealPlanView.jsx';
import Dashboard from './pages/admin/Dashboard.jsx';
import Products from './pages/admin/Products.jsx';
import Units from './pages/admin/Units.jsx';
import Logs from './pages/admin/Logs.jsx';
import Users from './pages/admin/Users.jsx';
import AdminCheckout from './pages/admin/AdminCheckout.jsx';
import AdminOrderTracking from './pages/admin/AdminOrderTracking.jsx';
import MealScheduler from './pages/admin/MealScheduler.jsx';

import Employee from './pages/admin/Employee.jsx';
import AddEmployee from './pages/admin/AddEmployee.jsx';
import EditEmployee from './pages/admin/EditEmployee.jsx';
import AdminReports from './pages/admin/AdminReports.jsx';
// import Categories from './pages/admin/Categories.jsx';
// import Colors from './pages/admin/Colors.jsx';
// import Sizes from './pages/admin/Sizes.jsx';
import Terms from './pages/policies/Terms.jsx';
import Privacy from './pages/policies/Privacy.jsx';
import Refund from './pages/policies/Refund.jsx';
import Shipping from './pages/policies/Shipping.jsx';
import KitchenDisplay from './pages/KitchenDisplay.jsx';
import KitchenLogin from './pages/KitchenLogin.jsx';

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Kiosk Routes */}
      <Route path="/login" element={<UnifiedLogin />} />
      <Route
        path="/kiosk/products"
        element={
          <ProtectedRoute>
            <OrderProvider>
              <ProductSelection />
            </OrderProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/kiosk/calendar"
        element={
          <ProtectedRoute>
            <OrderProvider>
              <CalendarSelection />
            </OrderProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/kiosk/payment"
        element={
          <ProtectedRoute>
            <OrderProvider>
              <Payment />
            </OrderProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/kiosk/success"
        element={
          <ProtectedRoute>
            <OrderProvider>
              <Success />
            </OrderProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute requireAdmin>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      {/* 
      <Route
        path="/admin/track-order"
        element={
          <ProtectedRoute requireAdmin>
            <AdminOrderTracking />
          </ProtectedRoute>
        }
      /> 
      */}

      {/* Policy Pages */}
      <Route path="/policies/terms" element={<Terms />} />
      <Route path="/policies/privacy" element={<Privacy />} />
      <Route path="/policies/refund" element={<Refund />} />
      <Route path="/policies/shipping" element={<Shipping />} />

      {/* Kitchen Display */}
      <Route path="/kitchen/login" element={<KitchenLogin />} />
      <Route path="/kitchen" element={<KitchenDisplay />} />
      <Route
        path="/admin/products"
        element={
          <ProtectedRoute requireAdmin>
            <Products />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/units"
        element={
          <ProtectedRoute requireAdmin>
            <Units />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/logs"
        element={
          <ProtectedRoute requireAdmin>
            <Logs />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/meal-scheduler"
        element={
          <ProtectedRoute requireAdmin>
            <MealScheduler />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute requireAdmin>
            <Users />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/AdminCheckout"
        element={
          <ProtectedRoute requireAdmin>
            <AdminCheckout />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/reports"
        element={
          <ProtectedRoute requireAdmin>
            <AdminReports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/employees"
        element={
          <ProtectedRoute requireAdmin>
            <Employee />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/add-employee"
        element={
          <ProtectedRoute requireAdmin>
            <AddEmployee />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/edit-employee/:id"
        element={
          <ProtectedRoute requireAdmin>
            <EditEmployee />
          </ProtectedRoute>
        }
      />
      {/* 
      <Route
        path="/admin/categories"
        element={
          <ProtectedRoute requireAdmin>
            <Categories />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/colors"
        element={
          <ProtectedRoute requireAdmin>
            <Colors />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/sizes"
        element={
          <ProtectedRoute requireAdmin>
            <Sizes />
          </ProtectedRoute>
        }
      />
      */}

      {/* My Orders - Kiosk */}
      <Route
        path="/kiosk/my-orders"
        element={
          <ProtectedRoute>
            <MyOrders layout={Layout} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/kiosk/my-orders/:orderId"
        element={
          <ProtectedRoute>
            <OrderDetails layout={Layout} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/kiosk/meal-plan"
        element={
          <ProtectedRoute>
            <MealPlanView />
          </ProtectedRoute>
        }
      />

      {/* My Orders - Admin */}
      <Route
        path="/admin/my-orders"
        element={
          <ProtectedRoute>
            <MyOrders layout={AdminLayout} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/my-orders/:orderId"
        element={
          <ProtectedRoute>
            <OrderDetails layout={AdminLayout} />
          </ProtectedRoute>
        }
      />


      {/* Default redirect */}
      <Route path="/admin/login" element={<Navigate to="/login" replace />} />

      {/* Default redirect */}
      <Route
        path="/"
        element={
          user ? (
            ['admin', 'unit_admin'].includes(user.role?.toLowerCase()) ? (
              <Navigate to="/admin/dashboard" replace />
            ) : (
              <Navigate to="/kiosk/products" replace />
            )
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
};

import InstallPrompt from './components/InstallPrompt.jsx';

// ... (existing imports)

function App() {
  useEffect(() => {
    // Disable context menu (right-click menu) for kiosk mode
    const handleContextMenu = (e) => {
      e.preventDefault();
      return false;
    };

    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  return (
    <AuthProvider>
      <GlobalScannerListener />
      <InstallPrompt />
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;