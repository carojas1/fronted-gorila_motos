/* ─────────────────────────────────────────────
   GORILA MOTOS — Enrutador principal
   React Router v6 + protección de rutas + guardas por rol
   ───────────────────────────────────────────── */

import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth }  from './contexts/AuthContext';
import { ToastProvider }          from './components/ui/Toast';
import ProtectedRoute             from './components/layout/ProtectedRoute';
import AppLayout                  from './components/layout/AppLayout';
import { useEffect }              from 'react';
import { useIntervalosStore }     from './lib/intervalosStore';
import { canAccessModulo }        from './lib/utils';

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
import MotoPerfilPage     from './pages/motos/MotoPerfilPage';
import RecordsPage         from './pages/records/RecordsPage';
import ClientesPage        from './pages/clientes/ClientesPage';

/* Nuevos módulos */
import AlertasPage       from './pages/alertas/AlertasPage';
import PuntosPage        from './pages/puntos/PuntosPage';
import CombustiblePage   from './pages/combustible/CombustiblePage';
import InvoicePage       from './pages/invoice/InvoicePage';
import PortalClientePage from './pages/portal/PortalClientePage';
import MiMotoPage        from './pages/moto-cliente/MiMotoPage';
import DiagnosticoPage   from './pages/diagnostico/DiagnosticoPage';
import PagosPage         from './pages/pagos/PagosPage';
import ContabilidadPage  from './pages/contabilidad/ContabilidadPage';
import ProveedoresPage   from './pages/proveedores/ProveedoresPage';
import MetodologiaPage   from './pages/metodologia/MetodologiaPage';
import AjustesPage       from './pages/settings/AjustesPage';
import IntervalosMantenimientoPage from './pages/settings/IntervalosMantenimientoPage';

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

function RequireModule({ modulo }: { modulo: string }) {
  const { user, isAdmin, isMecanico } = useAuth();
  return canAccessModulo(user?.descripcion, modulo, isAdmin, isMecanico)
    ? <Outlet />
    : <Navigate to="/dashboard" replace />;
}

export default function App() {
  const fetchParametros = useIntervalosStore(s => s.fetchParametros);

  useEffect(() => {
    // Carga los parámetros dinámicos de mantenimiento (ajustables por el mecánico)
    fetchParametros();
  }, [fetchParametros]);

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
                <Route path="/puntos"      element={<PuntosPage />}        />
                <Route path="/combustible" element={<CombustiblePage />}   />
                <Route path="/invoice/:id" element={<InvoicePage />}       />
                <Route path="/portal"      element={<PortalClientePage />} />
                <Route path="/mi-moto"    element={<MiMotoPage />}        />
                <Route path="/ajustes"     element={<AjustesPage />}       />

                {/* Todos los autenticados: ver clientes */}

                {/* Solo ADMIN + MECÁNICO */}
                <Route element={<RequireRole roles={['admin', 'mecanico']} />}>
                  <Route element={<RequireModule modulo="motos" />}>
                    <Route path="/motos"       element={<MotosPage />}         />
                    <Route path="/motos/:id"   element={<MotoPerfilPage />}    />
                  </Route>
                  <Route element={<RequireModule modulo="registros" />}>
                    <Route path="/registros"    element={<RecordsPage />}      />
                  </Route>
                  <Route element={<RequireModule modulo="inventario" />}>
                    <Route path="/inventario"   element={<InventoryPage />}    />
                  </Route>
                  <Route element={<RequireModule modulo="alertas" />}>
                    <Route path="/alertas"      element={<AlertasPage />}      />
                  </Route>
                  <Route element={<RequireModule modulo="diagnostico" />}>
                    <Route path="/diagnostico"  element={<DiagnosticoPage />}  />
                  </Route>
                  <Route element={<RequireModule modulo="proveedores" />}>
                    <Route path="/proveedores"  element={<ProveedoresPage />}  />
                  </Route>
                  <Route element={<RequireModule modulo="clientes" />}>
                    <Route path="/clientes"     element={<ClientesPage />}     />
                  </Route>
                  <Route element={<RequireModule modulo="metodologia" />}>
                    <Route path="/metodologia" element={<MetodologiaPage />}  />
                  </Route>
                  <Route path="/ajustes/intervalos" element={<IntervalosMantenimientoPage />} />
                </Route>

                {/* ADMIN + MECÁNICO: contabilidad (mecánico ve solo sus datos) */}
                <Route element={<RequireRole roles={['admin', 'mecanico']} />}>
                  <Route element={<RequireModule modulo="contabilidad" />}>
                    <Route path="/contabilidad" element={<ContabilidadPage />}    />
                  </Route>
                </Route>

                {/* Solo ADMIN */}
                <Route element={<RequireRole roles={['admin']} />}>
                  <Route path="/perfiles"     element={<ProfilesPage />}        />
                  <Route path="/perfiles/:id" element={<EmpleadoDetailPage />}  />
                  <Route path="/pagos"        element={<PagosPage />}           />
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
