/* ─────────────────────────────────────────────
   GMotors — Hook de notificaciones automáticas
   Genera alertas basadas en datos reales del sistema
   ───────────────────────────────────────────── */

import { useEffect, useState, useCallback } from 'react';
import { motosApi, productosApi, registrosApi } from '../lib/api';
import { toIsoStr } from '../lib/utils';
import type { Moto, Producto, RegistroDetalle } from '../types';

export type NotifPriority = 'high' | 'medium' | 'low';
export type NotifType     = 'oil_alert' | 'low_stock' | 'pending_order' | 'info';

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

const STORAGE_KEY = 'gm_notifications';

function loadStored(): Notification[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'); }
  catch { return []; }
}

function saveNotifs(n: Notification[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(n));
}

function genId(prefix: string, id: number | string) {
  return `${prefix}_${id}_${new Date().toISOString().slice(0, 10)}`;
}

function oilThreshold(cc: number) { return cc >= 300 ? 5000 : 1000; }

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>(loadStored);
  const [loading, setLoading]             = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [mr, pr, rr] = await Promise.allSettled([
        motosApi.list(), productosApi.list(), registrosApi.list(),
      ]);
      const motos:    Moto[]            = mr.status === 'fulfilled' ? mr.value.data : [];
      const productos:Producto[]        = pr.status === 'fulfilled' ? pr.value.data : [];
      const registros:RegistroDetalle[] = rr.status === 'fulfilled' ? rr.value.data : [];

      const newNotifs: Notification[] = [];
      const today = new Date().toISOString();
      const stored = loadStored();
      const storedIds = new Set(stored.map(n => n.id));

      /* ── Alertas de aceite ── */
      const OIL_KW = ['cambio de aceite', 'aceite', 'oil'];
      motos.forEach(m => {
        const oilRecs = registros
          .filter(r => r.placa === m.placa &&
            OIL_KW.some(k => r.tipo_servicio?.toLowerCase().includes(k))
          )
          .filter(r => r.kilometraje != null)
          .sort((a, b) => (b.kilometraje ?? 0) - (a.kilometraje ?? 0));

        const lastKm  = oilRecs[0]?.kilometraje ?? null;
        const thr     = oilThreshold(m.cilindraje);
        const kmSince = lastKm != null ? m.kilometraje - lastKm : null;

        if (kmSince != null && kmSince >= thr) {
          const nid = genId('oil', m.id_moto);
          if (!storedIds.has(nid)) {
            newNotifs.push({
              id: nid, type: 'oil_alert', priority: 'high', read: false, createdAt: today,
              title: `Cambio de aceite vencido — ${m.placa}`,
              message: `${m.marca} ${m.modelo}: ${(kmSince - thr).toLocaleString()} km de retraso`,
              link: '/alertas',
            });
          }
        } else if (kmSince != null && kmSince >= thr * 0.8) {
          const nid = genId('oil_soon', m.id_moto);
          if (!storedIds.has(nid)) {
            newNotifs.push({
              id: nid, type: 'oil_alert', priority: 'medium', read: false, createdAt: today,
              title: `Cambio de aceite próximo — ${m.placa}`,
              message: `${m.marca} ${m.modelo}: faltan ${(thr - kmSince).toLocaleString()} km`,
              link: '/alertas',
            });
          }
        }
      });

      /* ── Stock bajo ── */
      productos.filter(p => p.stock <= 3 && p.stock >= 0).forEach(p => {
        const nid = genId('stock', p.id_producto);
        if (!storedIds.has(nid)) {
          newNotifs.push({
            id: nid, type: 'low_stock', priority: p.stock === 0 ? 'high' : 'medium',
            read: false, createdAt: today,
            title: p.stock === 0 ? `Sin stock: ${p.nombre}` : `Stock bajo: ${p.nombre}`,
            message: `Quedan ${p.stock} unidades. Código: ${p.codigo_personal}`,
            link: '/inventario',
          });
        }
      });

      /* ── Órdenes pendientes > 24h ── */
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      registros
        .filter(r => r.estado === 0 && new Date(toIsoStr(r.fecha) + 'T00:00:00') < cutoff)
        .slice(0, 5)
        .forEach(r => {
          const nid = genId('pending', r.id_registro);
          if (!storedIds.has(nid)) {
            newNotifs.push({
              id: nid, type: 'pending_order', priority: 'low', read: false, createdAt: today,
              title: `Orden pendiente sin atender`,
              message: `${r.placa} — ${r.nombre_cliente} desde ${r.fecha}`,
              link: '/registros',
            });
          }
        });

      if (newNotifs.length > 0) {
        const merged = [...newNotifs, ...stored].slice(0, 50);
        saveNotifs(merged);
        setNotifications(merged);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  /* Refresco inicial + polling en tiempo real cada 30 s (solo con pestaña visible) */
  useEffect(() => {
    refresh();
    const tick = () => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') refresh();
    };
    const id = setInterval(tick, 30_000);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', tick); };
  }, [refresh]);

  const markRead    = (id: string) => setNotifications(prev => {
    const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
    saveNotifs(updated); return updated;
  });

  const markAllRead = () => setNotifications(prev => {
    const updated = prev.map(n => ({ ...n, read: true }));
    saveNotifs(updated); return updated;
  });

  const dismiss     = (id: string) => setNotifications(prev => {
    const updated = prev.filter(n => n.id !== id);
    saveNotifs(updated); return updated;
  });

  const unread = notifications.filter(n => !n.read).length;

  return { notifications, unread, loading, markRead, markAllRead, dismiss, refresh };
}
