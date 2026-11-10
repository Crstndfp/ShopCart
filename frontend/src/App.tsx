import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute.js';
import { AppLayout } from './components/layout/AppLayout.js';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { AddressesPage } from './pages/AddressesPage.js';
import { AdminCatalogPage } from './pages/AdminCatalogPage.js';
import { AdminCouponsPage } from './pages/AdminCouponsPage.js';
import { AdminReportsPage } from './pages/AdminReportsPage.js';
import { AdminUsersPage } from './pages/AdminUsersPage.js';
import { CartPage } from './pages/CartPage.js';
import { CatalogPage } from './pages/CatalogPage.js';
import { CheckoutPage } from './pages/CheckoutPage.js';
import { DesignSystemPage } from './pages/DesignSystemPage.js';
import { InventoryPage } from './pages/InventoryPage.js';
import { LoginPage } from './pages/LoginPage.js';
import { MyOrdersPage } from './pages/MyOrdersPage.js';
import { OrdersManagementPage } from './pages/OrdersManagementPage.js';
import { RegisterPage } from './pages/RegisterPage.js';
import { ModuleViewPage } from './pages/RolePortalPage.js';
import { getDefaultRouteForRole } from './types/auth.types.js';

function RootRedirect() {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated || !user) {
    return <Navigate to="/catalog" replace />;
  }
  return <Navigate to={getDefaultRouteForRole(user.role)} replace />;
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<RootRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* RF-02: Public Product Catalog & Real-Time Stock (Guests, Clients, Admins) */}
            <Route path="/catalog" element={<CatalogPage />} />

            {/* RF-04: Shopping Cart (Public to Guests & Clients, Auth Required at Checkout Gate) */}
            <Route path="/cart" element={<CartPage />} />

            {/* CLIENT Exclusive Routes */}
            <Route
              path="/checkout"
              element={
                <ProtectedRoute allowedRoles={['CLIENT']}>
                  <CheckoutPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-orders"
              element={
                <ProtectedRoute allowedRoles={['CLIENT']}>
                  <MyOrdersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/addresses"
              element={
                <ProtectedRoute allowedRoles={['CLIENT']}>
                  <AddressesPage />
                </ProtectedRoute>
              }
            />

            {/* OPERATOR & ADMINISTRATOR Routes */}
            <Route
              path="/orders-management"
              element={
                <ProtectedRoute allowedRoles={['OPERATOR', 'ADMINISTRATOR']}>
                  <OrdersManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory"
              element={
                <ProtectedRoute allowedRoles={['OPERATOR', 'ADMINISTRATOR']}>
                  <InventoryPage />
                </ProtectedRoute>
              }
            />

            {/* RF-02: ADMINISTRATOR Exclusive Catalog, Variants & Prices Console */}
            <Route
              path="/admin/catalog"
              element={
                <ProtectedRoute allowedRoles={['ADMINISTRATOR']}>
                  <AdminCatalogPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/coupons"
              element={
                <ProtectedRoute allowedRoles={['ADMINISTRATOR']}>
                  <AdminCouponsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute allowedRoles={['ADMINISTRATOR']}>
                  <AdminUsersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/reports"
              element={
                <ProtectedRoute allowedRoles={['ADMINISTRATOR']}>
                  <AdminReportsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/audit"
              element={
                <ProtectedRoute allowedRoles={['ADMINISTRATOR']}>
                  <ModuleViewPage
                    rfCode="RF-010 · AUDITORÍA Y CONFIGURACIÓN DEL SISTEMA"
                    title="Bitácora de Auditoría y Parámetros Globales"
                    description="Consulta de trazabilidad OldValues/NewValues en JSON y edición de parámetros operativos (IVA, tiempos de reserva y abandono)."
                    allowedRoles={['ADMINISTRATOR']}
                  />
                </ProtectedRoute>
              }
            />

            {/* Design System Showcase */}
            <Route
              path="/design-system"
              element={
                <ProtectedRoute allowedRoles={['CLIENT', 'OPERATOR', 'ADMINISTRATOR']}>
                  <DesignSystemPage />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<RootRedirect />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
