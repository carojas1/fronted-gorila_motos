/* ─────────────────────────────────────────────
   GORILA MOTOS — Enrutador principal
   React Router v6 + protección de rutas + guardas por rol
   ───────────────────────────────────────────── */

import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth }  from './contexts/AuthContext';
import { ToastProvider }          from './components/ui/Toast';
import ProtectedRoute             from './components/layout/ProtectedRoute';
import AppLayout                  from './components/layout/AppLayout';

/* Auth pages */
import LoginPage               from './pages/auth/LoginPage';
import RegisterPage            from './pages/auth/RegisterPage';
import RecuperarPage          from './pages/auth/RecuperarPage';
import EmailVerificationPage  from './pages/auth/EmailVerificationPage';
import PrivacidadPage from './pages/legal/PrivacidadPage';
import TerminosPage   from './pages/legal/TerminosPage';

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
import MiMotoPage        from './pages/moto-cliente/MiMotoPage';
import DiagnosticoPage  from './pages/diagnostico/DiagnosticoPage';

/* ─── Guarda de roles ─────────────────────────────────────────────────────────
   Redirige a /dashboard si el usuario no tiene ninguno de los roles indicados.
   Debe usarse siempre dentro de <ProtectedRoute> (token garantizado).
   ──────────────────────────────────────────────────────────────────────────── */
function RequireRole({ roles }: { roles: Array<'admin' | 'mecanico' | 'cliente'> }) {
  const { isAdmin, isMecanico, isCliente } = useAuth();
  const allowed =
    (roles.includes('admin')    && isAdmin)    ||
    (roles.includes('mecanico') && isMecanico) ||
    (roles.includes('cliente')  && isCliente);
  return allowed ? <Outlet /> : <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* ── Rutas públicas ───────────────────────────────────────── */}
            <Route path="/login"           element={<LoginPage />}              />
            <Route path="/registro"        element={<RegisterPage />}           />
            <Route path="/recuperar"       element={<RecuperarPage />}          />
            <Route path="/verificar-email" element={<EmailVerificationPage />}  />
            <Route path="/privacidad"      element={<PrivacidadPage />}         />
            <Route path="/terminos"        element={<TerminosPage />}           />

            {/* ── Rutas protegidas (requieren JWT) ─────────────────────── */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>

                {/* Accesibles para TODOS los roles autenticados */}
                <Route path="/dashboard"   element={<DashboardPage />}    />
                <Route path="/motos"       element={<MotosPage />}         />
                <Route path="/puntos"      element={<PuntosPage />}        />
                <Route path="/combustible" element={<CombustiblePage />}   />
                <Route path="/invoice/:id" element={<InvoicePage />}       />
                <Route path="/portal"      element={<PortalClientePage />} />
                <Route path="/mi-moto"    element={<MiMotoPage />}        />
                <Route path="/ajustes"     element={<DashboardPage />}     />

                {/* Solo ADMIN + MECÁNICO */}
                <Route element={<RequireRole roles={['admin', 'mecanico']} />}>
                  <Route path="/registros"    element={<RecordsPage />}     />
                  <Route path="/inventario"   element={<InventoryPage />}   />
                  <Route path="/clientes"     element={<ClientesPage />}    />
                  <Route path="/alertas"      element={<AlertasPage />}     />
                  <Route path="/diagnostico"  element={<DiagnosticoPage />} />
                </Route>

                {/* Solo ADMIN */}
                <Route element={<RequireRole roles={['admin']} />}>
                  <Route path="/perfiles"     element={<ProfilesPage />}       />
                  <Route path="/perfiles/:id" element={<EmpleadoDetailPage />} />
                </Route>

              </Route>
            </Route>

            {/* ── Redirecciones ────────────────────────────────────────── */}
            <Route path="/"  element={<Navigate to="/dashboard" replace />} />
            <Route path="*"  element={<Navigate to="/login"     replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
