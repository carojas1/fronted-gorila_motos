/* ─────────────────────────────────────────────
   GMotors — Hook de notificaciones automáticas
   Genera alertas basadas en datos reales del sistema
   ───────────────────────────────────────────── */

import { useEffect, useState, useCallback } from 'react';
import { motosApi, productosApi, registrosApi } from '../lib/api';
import { toIsoStr } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { isNativeApp } from '../lib/platform';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { Moto, Producto, RegistroDetalle } from '../types';

function hashCode(str: string) {
  let hash = 0;
  for (let i = 0, len = str.length; i < len; i++) {
    const chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return hash;
}

export type NotifPriority = 'high' | 'medium' | 'low';
export type NotifType     = 'oil_alert' | 'low_stock' | 'pending_order' | 'moto_ready' | 'info';

export interface Notification {
  id:       string;
  type:     NotifType;
  priority: NotifPriority;
  title:    string;
  message:  string;
  link?:    string;
  read:     boolean;
  createdAt:string;
}

const CURRENT_VER = '3';  // bump para resetear caché al cambiar formato

/* Claves por usuario para que cada cuenta tenga sus propias notificaciones */
function keys(uid: number) {
  return {
    notifs:    `gm_notifs_${uid}`,
    dismissed: `gm_dismissed_${uid}`,
    ver:       `gm_notif_ver_${uid}`,
  };
}

function loadStored(uid: number): Notification[] {
  try {
    const k = keys(uid);
    if (localStorage.getItem(k.ver) !== CURRENT_VER) {
      localStorage.removeItem(k.notifs);
      localStorage.removeItem(k.dismissed);
      localStorage.setItem(k.ver, CURRENT_VER);
      return [];
    }
    return JSON.parse(localStorage.getItem(k.notifs) ?? '[]');
  } catch { return []; }
}

function loadDismissed(uid: number): Set<string> {
  try {
    const raw = localStorage.getItem(keys(uid).dismissed);
    return new Set(JSON.parse(raw ?? '[]'));
  } catch { return new Set(); }
}

function saveNotifs(uid: number, n: Notification[]) {
  const k = keys(uid);
  localStorage.setItem(k.notifs, JSON.stringify(n));
  localStorage.setItem(k.ver, CURRENT_VER);
}

function saveDismissed(uid: number, set: Set<string>) {
  localStorage.setItem(keys(uid).dismissed, JSON.stringify([...set]));
}

function genId(prefix: string, id: number | string) {
  return `${prefix}_${id}_${new Date().toISOString().slice(0, 10)}`;
}

function oilThreshold(cc: number) { return cc >= 300 ? 5000 : 1000; }

export function useNotifications() {
  const { user, isAdmin, isMecanico } = useAuth();
  const canManage = isAdmin || isMecanico;
  const uid = user?.id_usuario ?? 0;

  const [notifications, setNotifications] = useState<Notification[]>(() =>
    uid > 0 ? loadStored(uid) : []
  );
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user || !localStorage.getItem('gm_token')) return;
    setLoading(true);
    try {
      /* No-admin/no-mecánico (incluye usuarios sin rol) → solo SUS motos */
      const motosReq = !canManage
        ? motosApi.byUser(user.id_usuario)
        : motosApi.list();
      const [mr, pr, rr] = await Promise.allSettled([
        motosReq,
        canManage ? productosApi.list() : Promise.reject(),
        registrosApi.list(),
      ]);
      const motos:    Moto[]            = mr.status === 'fulfilled' ? mr.value.data : [];
      const productos:Producto[]        = pr.status === 'fulfilled' ? pr.value.data : [];
      const registros:RegistroDetalle[] = rr.status === 'fulfilled' ? rr.value.data : [];

      const today      = new Date().toISOString();
      const stored     = loadStored(uid);
      const dismissed  = loadDismissed(uid);           // IDs aceptadas/descartadas para siempre

      /* Estado de "leído" previo, por id, para preservarlo al reconstruir */
      const prevRead = new Map(stored.map(n => [n.id, n.read]));

      /* Reconstrucción TOTAL: cada refresh genera el conjunto COMPLETO de alertas
         válidas según los datos actuales. Si un dato se borra (producto eliminado,
         stock repuesto, orden cerrada), su notificación desaparece sola.
         Nunca se acumula basura en localStorage. */
      const live: Notification[] = [];
      const add = (n: Notification) => {
        if (dismissed.has(n.id)) return;               // descartada para siempre
        live.push({ ...n, read: prevRead.get(n.id) ?? false });
      };

      /* ── 1. Alertas de aceite ── */
      const OIL_KW = ['cambio de aceite', 'aceite', 'oil'];
      motos.forEach(m => {
        if (m.id_usuario !== uid) return;
        const oilRecs = registros
          .filter(r => r.placa === m.placa && OIL_KW.some(k => r.tipo_servicio?.toLowerCase().includes(k)) && r.kilometraje != null)
          .sort((a, b) => (b.kilometraje ?? 0) - (a.kilometraje ?? 0));
        const lastKm  = oilRecs[0]?.kilometraje ?? null;
        const thr     = oilThreshold(m.cilindraje);
        const kmSince = lastKm != null ? m.kilometraje - lastKm : null;
        if (kmSince != null && kmSince >= thr) {
          add({
            id: genId('oil', m.id_moto), type: 'oil_alert', priority: 'high', read: false, createdAt: today,
            title: `Cambio de aceite vencido — ${m.placa}`,
            message: `${m.marca} ${m.modelo}: ${(kmSince - thr).toLocaleString()} km de retraso`,
            link: '/alertas',
          });
        } else if (kmSince != null && kmSince >= thr * 0.8) {
          add({
            id: genId('oil_soon', m.id_moto), type: 'oil_alert', priority: 'medium', read: false, createdAt: today,
            title: `Cambio de aceite próximo — ${m.placa}`,
            message: `${m.marca} ${m.modelo}: faltan ${(thr - kmSince).toLocaleString()} km`,
            link: '/alertas',
          });
        }
      });

      /* ── 2. Stock bajo (solo admin/mecánico) ── */
      if (canManage) {
        productos.filter(p => p.stock <= 3 && p.stock >= 0).forEach(p => {
          add({
            id: genId('stock', p.id_producto), type: 'low_stock', priority: p.stock === 0 ? 'high' : 'medium',
            read: false, createdAt: today,
            title: p.stock === 0 ? `Sin stock: ${p.nombre}` : `Stock bajo: ${p.nombre}`,
            message: `Quedan ${p.stock} unidades. Código: ${p.codigo_personal}`,
            link: '/inventario',
          });
        });
      }

      /* ── 3. Órdenes pendientes > 24h (admin/mecánico) ── */
      if (canManage) {
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
        registros
          .filter(r => r.estado === 0 && new Date(toIsoStr(r.fecha) + 'T00:00:00') < cutoff)
          .slice(0, 5)
          .forEach(r => {
            add({
              id: genId('pending', r.id_registro), type: 'pending_order', priority: 'low', read: false, createdAt: today,
              title: 'Orden pendiente sin atender',
              message: `${r.placa} — ${r.nombre_cliente} desde ${toIsoStr(r.fecha)}`,
              link: '/registros',
            });
          });
      }

      /* ── 4. Moto lista para retirar (cliente: sus órdenes completadas/entregadas) ── */
      if (!canManage) {
        registros
          .filter(r => {
            const esMiMoto = motos.some(m => m.placa === r.placa);
            return esMiMoto && (r.estado === 2 || r.estado === 3);
          })
          .slice(0, 3)
          .forEach(r => {
            add({
              id: genId('ready', r.id_registro), type: 'moto_ready', priority: 'high', read: false, createdAt: today,
              title: r.estado === 3 ? `Tu moto está lista para retirar` : `Servicio completado`,
              message: `${r.placa} — ${r.tipo_servicio ?? 'Servicio'}. Pasa por el taller.`,
              link: '/mi-moto',
            });
          });
      }

      /* Ordenar por prioridad (high → low) y limitar; SIEMPRE reemplaza el set
         guardado (aunque sea vacío) para que las alertas obsoletas desaparezcan. */
      const rank: Record<NotifPriority, number> = { high: 0, medium: 1, low: 2 };
      const finalNotifs = live
        .sort((a, b) => rank[a.priority] - rank[b.priority])
        .slice(0, 60);

      // Capacitor: Notificaciones Locales
      if (isNativeApp()) {
        const storedIds = new Set(stored.map(n => n.id));
        const newNotifs = finalNotifs.filter(n => !storedIds.has(n.id) && !n.read);
        if (newNotifs.length > 0) {
          LocalNotifications.checkPermissions().then(status => {
            const sendLocal = () => {
              const toSchedule = newNotifs.map((n, idx) => ({
                title: n.title,
                body: n.message,
                id: Math.abs(hashCode(n.id)) + idx,
                schedule: { at: new Date(Date.now() + 100 * idx) },
              }));
              LocalNotifications.schedule({ notifications: toSchedule }).catch(() => {});
            };
            if (status.display === 'granted') {
              sendLocal();
            } else if (status.display === 'prompt') {
              LocalNotifications.requestPermissions().then(res => {
                if (res.display === 'granted') sendLocal();
              });
            }
          }).catch(() => {});
        }
      }

      saveNotifs(uid, finalNotifs);
      setNotifications(finalNotifs);
    } catch { /* silent */ }
    finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id_usuario, canManage]);

  useEffect(() => {
    if (uid > 0) setNotifications(loadStored(uid));
  }, [uid]);

  useEffect(() => {
    refresh();
    const tick = () => { if (document.visibilityState === 'visible') refresh(); };
    const id = setInterval(tick, 30_000);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', tick); };
  }, [refresh]);

  const markRead = (id: string) => setNotifications(prev => {
    const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
    saveNotifs(uid, updated); return updated;
  });

  const markAllRead = () => setNotifications(prev => {
    const updated = prev.map(n => ({ ...n, read: true }));
    saveNotifs(uid, updated); return updated;
  });

  /* dismiss = acepta/descarta para siempre: nunca vuelve a aparecer */
  const dismiss = (id: string) => setNotifications(prev => {
    const updated = prev.filter(n => n.id !== id);
    const dis = loadDismissed(uid);
    dis.add(id);
    saveDismissed(uid, dis);
    saveNotifs(uid, updated);
    return updated;
  });

  const unread = notifications.filter(n => !n.read).length;

  return { notifications, unread, loading, markRead, markAllRead, dismiss, refresh };
}
