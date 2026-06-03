/* ─────────────────────────────────────────────
   GORILA MOTOS — Enrutador principal
   React Router v6 + protección de rutas
   ───────────────────────────────────────────── */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider }   from './contexts/AuthContext';
import { ToastProvider }  from './components/ui/Toast';
import ProtectedRoute     from './components/layout/ProtectedRoute';
import AppLayout          from './components/layout/AppLayout';

/* Auth pages */
import LoginPage    from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

/* App pages */
import DashboardPage       from './pages/dashboard/DashboardPage';
import InventoryPage       from './pages/inventory/InventoryPage';
import ProfilesPage        from './pages/profiles/ProfilesPage';
import EmpleadoDetailPage  from './pages/profiles/EmpleadoDetailPage';
import MotosPage           from './pages/motos/MotosPage';
import RecordsPage         from './pages/records/RecordsPage';
import ClientesPage        from './pages/clientes/ClientesPage';

/* Nuevos módulos */
import AlertasPage       from './pages/alertas/AlertasPage';
import PuntosPage        from './pages/puntos/PuntosPage';
import CombustiblePage   from './pages/combustible/CombustiblePage';
import InvoicePage       from './pages/invoice/InvoicePage';
import PortalClientePage from './pages/portal/PortalClientePage';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Rutas públicas */}
            <Route path="/login"    element={<LoginPage />}    />
            <Route path="/registro" element={<RegisterPage />} />

            {/* Rutas protegidas */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard"      element={<DashboardPage />}      />
                <Route path="/registros"      element={<RecordsPage />}        />
                <Route path="/motos"          element={<MotosPage />}          />
                <Route path="/inventario"     element={<InventoryPage />}      />
                <Route path="/clientes"       element={<ClientesPage />}       />
                <Route path="/perfiles"       element={<ProfilesPage />}       />
                <Route path="/perfiles/:id"   element={<EmpleadoDetailPage />} />
                <Route path="/alertas"          element={<AlertasPage />}        />
                <Route path="/puntos"           element={<PuntosPage />}         />
                <Route path="/combustible"      element={<CombustiblePage />}    />
                <Route path="/invoice/:id"      element={<InvoicePage />}        />
                <Route path="/portal"           element={<PortalClientePage />}  />
                <Route path="/ajustes"          element={<DashboardPage />}      />
              </Route>
            </Route>

            {/* Redirecciones */}
            <Route path="/"  element={<Navigate to="/dashboard" replace />} />
            <Route path="*"  element={<Navigate to="/login"     replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
