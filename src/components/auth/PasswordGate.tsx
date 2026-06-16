/* ─────────────────────────────────────────────
   GMotors — Password Gate
   Re-pide la contraseña antes de mostrar contenido
   sensible (ej. Perfiles). Desbloqueo válido por
   5 minutos en sessionStorage. Nunca guarda la clave.
   ───────────────────────────────────────────── */

import { useState, type ReactNode } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { authApi } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

const UNLOCK_KEY = 'gm_gate_unlock';
const TTL_MS     = 5 * 60 * 1000; // 5 minutos

function isUnlocked(scope: string): boolean {
  try {
    const raw = sessionStorage.getItem(`${UNLOCK_KEY}_${scope}`);
    if (!raw) return false;
    return Date.now() - parseInt(raw) < TTL_MS;
  } catch { return false; }
}

export default function PasswordGate({ scope, title, children }: {
  scope: string; title: string; children: ReactNode;
}) {
  const { user } = useAuth();
  const [unlocked, setUnlocked] = useState(() => isUnlocked(scope));
  const [pwd,      setPwd]      = useState('');
  const [show,     setShow]     = useState(false);
  const [error,    setError]    = useState('');
  const [checking, setChecking] = useState(false);

  if (unlocked) return <>{children}</>;

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.correo || !pwd) return;
    setChecking(true); setError('');
    try {
      // Verifica credenciales sin tocar la sesión actual
      await authApi.login(user.correo, pwd);
      sessionStorage.setItem(`${UNLOCK_KEY}_${scope}`, String(Date.now()));
      setUnlocked(true);
    } catch {
      setError('Contraseña incorrecta. Intenta de nuevo.');
      setPwd('');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: '8vh auto 0', padding: '0 16px' }}>
      <div style={{ background: '#111117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: '32px 28px', textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(225,20,40,0.12)', border: '1px solid rgba(225,20,40,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
          <Lock size={26} color="#E11428" />
        </div>
        <h2 style={{ color: '#EBEBEB', fontWeight: 800, fontSize: 19, margin: '0 0 6px', letterSpacing: '-0.02em' }}>
          Zona protegida
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: '0 0 22px', lineHeight: 1.6 }}>
          Para acceder a <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{title}</strong> confirma tu contraseña.
        </p>

        <form onSubmit={verify}>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <Lock size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
            <input
              type={show ? 'text' : 'password'}
              value={pwd}
              autoFocus
              onChange={e => { setPwd(e.target.value); setError(''); }}
              placeholder="Tu contraseña"
              style={{
                width: '100%', height: 46, borderRadius: 11, padding: '0 44px',
                background: '#1A1A22', border: `1px solid ${error ? '#E11428' : 'rgba(255,255,255,0.1)'}`,
                color: '#EBEBEB', fontSize: 14, outline: 'none', boxSizing: 'border-box',
              }}
            />
            <button type="button" onClick={() => setShow(s => !s)}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', display: 'flex' }}>
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {error && (
            <p style={{ color: '#EF4444', fontSize: 12.5, margin: '0 0 12px', textAlign: 'left' }}>{error}</p>
          )}

          <button type="submit" disabled={checking || !pwd}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontSize: 14, fontWeight: 700, color: '#fff',
              background: checking || !pwd ? 'rgba(225,20,40,0.4)' : '#E11428',
              border: 'none', borderRadius: 11, padding: '12px', cursor: checking || !pwd ? 'not-allowed' : 'pointer',
            }}>
            {checking
              ? <><span style={{ width: 15, height: 15, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite', display: 'inline-block' }} /> Verificando…</>
              : <><ShieldCheck size={16} /> Desbloquear</>}
          </button>
        </form>

        <p style={{ color: 'rgba(255,255,255,0.22)', fontSize: 11, margin: '16px 0 0' }}>
          El acceso queda desbloqueado por 5 minutos.
        </p>
      </div>
    </div>
  );
}
