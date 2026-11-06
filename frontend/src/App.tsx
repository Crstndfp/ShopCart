import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute.js';
import { AppLayout } from './components/layout/AppLayout.js';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { DesignSystemPage } from './pages/DesignSystemPage.js';
import { LoginPage } from './pages/LoginPage.js';
import { RegisterPage } from './pages/RegisterPage.js';
import { ModuleViewPage } from './pages/RolePortalPage.js';
import { getDefaultRouteForRole } from './types/auth.types.js';

function RootRedirect() {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
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

            {/* CLIENT & ADMINISTRATOR Routes */}
            <Route
              path="/catalog"
              element={
                <ProtectedRoute allowedRoles={['CLIENT', 'ADMINISTRATOR']}>
                  <ModuleViewPage
                    rfCode="RF-02 · CATÁLOGO DE PRODUCTOS Y VARIANTES"
                    title="Catálogo de Productos y Precios Vigentes"
                    description="Exploración de productos con búsqueda por texto, categoría, rango de precios y disponibilidad real en inventario."
                    allowedRoles={['CLIENT', 'ADMINISTRATOR']}
                  />
                </ProtectedRoute>
              }
            />

            {/* CLIENT Exclusive Routes */}
            <Route
              path="/cart"
              element={
                <ProtectedRoute allowedRoles={['CLIENT']}>
                  <ModuleViewPage
                    rfCode="RF-04 · CARRITO DE COMPRAS Y RESERVAS"
                    title="Mi Carrito de Compras"
                    description="Gestión de ítems en el carrito, aplicación de cupones promocionales y proceso de checkout con reserva temporal de stock."
                    allowedRoles={['CLIENT']}
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-orders"
              element={
                <ProtectedRoute allowedRoles={['CLIENT']}>
                  <ModuleViewPage
                    rfCode="RF-07 · HISTORIAL Y SEGUIMIENTO DE PEDIDOS"
                    title="Mis Pedidos"
                    description="Consulta exclusiva de los pedidos del cliente autenticado, estados de envío, historial de transiciones y solicitud de devoluciones."
                    allowedRoles={['CLIENT']}
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/addresses"
              element={
                <ProtectedRoute allowedRoles={['CLIENT']}>
                  <ModuleViewPage
                    rfCode="RF-06 · DIRECCIONES DE ENTREGA"
                    title="Mis Direcciones de Entrega"
                    description="Administración de la libreta personal de direcciones de envío para pedidos."
                    allowedRoles={['CLIENT']}
                  />
                </ProtectedRoute>
              }
            />

            {/* OPERATOR & ADMINISTRATOR Routes */}
            <Route
              path="/orders-management"
              element={
                <ProtectedRoute allowedRoles={['OPERATOR', 'ADMINISTRATOR']}>
                  <ModuleViewPage
                    rfCode="RF-07 & RF-08 · FLUJO OPERATIVO DE PEDIDOS Y DEVOLUCIONES"
                    title="Gestión Operativa de Pedidos"
                    description="Avance de estados de pedidos (Preparación, Despacho con empresa y número de guía, Entrega, Cancelación y Devoluciones parciales/totales)."
                    allowedRoles={['OPERATOR', 'ADMINISTRATOR']}
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory"
              element={
                <ProtectedRoute allowedRoles={['OPERATOR', 'ADMINISTRATOR']}>
                  <ModuleViewPage
                    rfCode="RF-03 · INVENTARIO TRANSACCIONAL Y KARDEX"
                    title="Control de Inventario y Libro Mayor Kardex"
                    description="Consulta de stock físico, stock reservado, stock disponible, alertas de stock mínimo y registro de entradas/ajustes auditables."
                    allowedRoles={['OPERATOR', 'ADMINISTRATOR']}
                  />
                </ProtectedRoute>
              }
            />

            {/* ADMINISTRATOR Exclusive Routes */}
            <Route
              path="/admin/catalog"
              element={
                <ProtectedRoute allowedRoles={['ADMINISTRATOR']}>
                  <ModuleViewPage
                    rfCode="RF-02 · ADMINISTRACIÓN DE CATÁLOGO Y PRECIOS"
                    title="Administración de Catálogo, Variantes y Precios"
                    description="Creación y edición de categorías, productos, variantes por SKU e historial de precios con vigencia programada."
                    allowedRoles={['ADMINISTRATOR']}
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/coupons"
              element={
                <ProtectedRoute allowedRoles={['ADMINISTRATOR']}>
                  <ModuleViewPage
                    rfCode="RF-05 · CUPONES DE DESCUENTO"
                    title="Gestión de Cupones Promocionales"
                    description="Configuración de reglas de descuento porcentual o monto fijo, límites de uso total/por cliente y restricción por categoría."
                    allowedRoles={['ADMINISTRATOR']}
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute allowedRoles={['ADMINISTRATOR']}>
                  <ModuleViewPage
                    rfCode="RF-01 · GESTIÓN DE USUARIOS Y ROLES"
                    title="Administración de Usuarios del Sistema"
                    description="Alta de cuentas de Operador y Administrador, consulta de usuarios y activación/desactivación de accesos."
                    allowedRoles={['ADMINISTRATOR']}
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/reports"
              element={
                <ProtectedRoute allowedRoles={['ADMINISTRATOR']}>
                  <ModuleViewPage
                    rfCode="RF-09 · REPORTES Y DASHBOARD EJECUTIVO"
                    title="Dashboard Ejecutivo y Reportes Analíticos"
                    description="Indicadores de ventas por período, top productos, valoración de inventario, efectividad de cupones y carritos abandonados."
                    allowedRoles={['ADMINISTRATOR']}
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/audit"
              element={
                <ProtectedRoute allowedRoles={['ADMINISTRATOR']}>
                  <ModuleViewPage
                    rfCode="RF-10 · AUDITORÍA Y CONFIGURACIÓN DEL SISTEMA"
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
