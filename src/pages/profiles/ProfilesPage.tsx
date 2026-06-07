/* ─────────────────────────────────────────────
   GMotors — Panel de Administración v2
   Design premium · framer-motion · multi-rol
   ───────────────────────────────────────────── */

import { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Shield, Users, Mail, MapPin, UserPlus,
  ChevronRight, Wrench, Crown, User, X, TrendingUp,
  Lock, Eye, Zap, Star, Activity,
} from "lucide-react";
import { usuariosApi, rolesApi, authApi } from "../../lib/api";
import { useToast } from "../../components/ui/Toast";
import { useAuth } from "../../contexts/AuthContext";
import { initials, extractCedula, getErrorMsg } from "../../lib/utils";
import type { Usuario, Rol } from "../../types";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Input from "../../components/ui/Input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

/* ── Helpers ── */
function getRolName(roles: unknown[]): string {
  if (!roles || roles.length === 0) return "";
  const r = roles[0];
  const raw = typeof r === "string"
    ? r
    : ((r as { rol?: { nombre?: string }; nombre?: string })?.rol?.nombre
        ?? (r as { nombre?: string })?.nombre ?? "");
  return raw.toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/* ── Constantes de roles ── */
const TABS = [
  { key: "ADMIN",    label: "Admins",     icon: Crown,  color: "#E11428", variant: "gold",    bg: "rgba(225,20,40,0.06)"    },
  { key: "MECANICO", label: "Mecánicos",  icon: Wrench, color: "#3B82F6", variant: "info",    bg: "rgba(59,130,246,0.06)"   },
  { key: "CLIENTE",  label: "Clientes",   icon: User,   color: "#10B981", variant: "success", bg: "rgba(16,185,129,0.06)"   },
  { key: "SINROL",   label: "Sin rol",    icon: Users,  color: "#8B8FA8", variant: "default", bg: "rgba(139,143,168,0.06)"  },
];

const regSchema = z.object({
  nombre_completo: z.string().min(3),
  cedula:          z.string().min(10).max(13),
  nombre_usuario:  z.string().min(3),
  contrasena:      z.string().min(4),
  correo:          z.string().email().optional().or(z.literal("")),
  telefono:        z.string().optional(),
  rol:             z.string().min(1, "Selecciona un rol"),
});

/* ── Framer variants ── */
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.055 } } };
const cardV   = {
  hidden: { opacity: 0, y: 22, scale: 0.97 },
  show:   { opacity: 1, y: 0,  scale: 1,
            transition: { type: "spring", stiffness: 280, damping: 22 } },
  exit:   { opacity: 0, y: -10, scale: 0.97, transition: { duration: 0.15 } },
};
const statV = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { type: "spring", stiffness: 320, damping: 26 } },
};

/* ── Avatar colorizado ── */
function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const palette = [
    ["#E11428","#9E0E1B"], ["#3B82F6","#1D4ED8"], ["#8B5CF6","#6D28D9"],
    ["#10B981","#047857"], ["#F59E0B","#B45309"], ["#06B6D4","#0E7490"],
  ];
  const [bg, bd] = palette[name.charCodeAt(0) % palette.length];
  const sz = { sm: "w-8 h-8 text-xs", md: "w-11 h-11 text-sm", lg: "w-14 h-14 text-base" }[size];
  return (
    <div
      className={`${sz} rounded-2xl flex items-center justify-center font-black shrink-0`}
      style={{ background: `${bg}20`, border: `2px solid ${bd}40`, color: bg }}
    >
      {initials(name)}
    </div>
  );
}

/* ── Tarjeta de usuario premium ── */
function UserCard({ u, roleName, onAssign }: {
  u: Usuario; roleName: string; onAssign: (u: Usuario) => void;
}) {
  const tab    = TABS.find(t => t.key === roleName);
  const color  = tab?.color ?? "#8B8FA8";
  const cedula = extractCedula(u.descripcion);
  const phone  = u.descripcion?.match(/TELEFONO:\s*([^\s|]+)/)?.[1];

  return (
    <motion.div variants={cardV} layout>
      <div
        className="group relative rounded-2xl overflow-hidden flex flex-col h-full cursor-default"
        style={{
          background: "linear-gradient(160deg, #18181F 0%, #131318 100%)",
          border: "1px solid rgba(255,255,255,0.07)",
          transition: "border-color 220ms ease, box-shadow 220ms ease, transform 220ms ease",
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.borderColor = `${color}35`;
          (e.currentTarget as HTMLElement).style.boxShadow  = `0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px ${color}18`;
          (e.currentTarget as HTMLElement).style.transform  = "translateY(-3px)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)";
          (e.currentTarget as HTMLElement).style.boxShadow  = "";
          (e.currentTarget as HTMLElement).style.transform  = "";
        }}
      >
        {/* Borde superior de color */}
        <div style={{ height: 2, background: `linear-gradient(90deg,${color}70,transparent)` }} />

        {/* Glow ambiental */}
        <div
          className="absolute top-0 right-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            width: 120, height: 120, borderRadius: "50%",
            background: `radial-gradient(circle, ${color}12 0%, transparent 70%)`,
          }}
        />

        {/* Contenido */}
        <div className="p-5 flex flex-col gap-3 flex-1 relative">

          {/* Header */}
          <div className="flex items-start gap-3">
            <Avatar name={u.nombre_completo} />
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-black text-white/92 truncate leading-tight">
                {u.nombre_completo}
              </p>
              <p className="text-[11px] text-white/28 mt-0.5">@{u.nombre_usuario}</p>
              {tab && (
                <div className="mt-1.5 flex items-center gap-1.5">
                  <tab.icon size={9} style={{ color }} />
                  <span className="text-[10px] font-black tracking-wider uppercase" style={{ color }}>
                    {tab.label.replace(/s$/, "")}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-[12px] text-white/38">
              <Mail size={10} className="text-white/20 shrink-0" />
              <span className="truncate">{u.correo}</span>
            </div>
            {u.ciudad && (
              <div className="flex items-center gap-2 text-[12px] text-white/38">
                <MapPin size={10} className="text-white/20 shrink-0" />
                <span>{u.ciudad}</span>
              </div>
            )}
            {cedula && (
              <div className="flex items-center gap-2 text-[12px] text-white/38">
                <Shield size={10} className="text-white/20 shrink-0" />
                <span className="font-mono tracking-wider">C.I. {cedula}</span>
              </div>
            )}
            {phone && phone !== "N/A" && (
              <div className="flex items-center gap-2 text-[12px] text-white/38">
                <Star size={10} className="text-white/20 shrink-0" />
                <span>{phone}</span>
              </div>
            )}
          </div>

          {/* Footer acciones */}
          <div className="flex items-center justify-between pt-3 border-t border-white/[0.04] mt-auto">
            <button
              onClick={() => onAssign(u)}
              className="flex items-center gap-1.5 text-[11px] font-bold transition-colors duration-150"
              style={{ color: "rgba(255,255,255,0.25)" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = color}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.25)"}
            >
              <Lock size={9} /> Cambiar rol
            </button>
            {roleName === "MECANICO" && (
              <Link
                to={`/perfiles/${u.id_usuario}`}
                className="flex items-center gap-1 text-[11px] font-bold transition-colors duration-150"
                style={{ color: `${color}80` }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = color}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = `${color}80`}
              >
                Ver ficha <ChevronRight size={10} />
              </Link>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Skeleton card ── */
function SkeletonCard() {
  return (
    <div className="rounded-2xl p-5 space-y-3 overflow-hidden"
         style={{ background: "linear-gradient(160deg,#18181F,#131318)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex gap-3">
        <div className="skeleton-d w-11 h-11 rounded-2xl shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="skeleton-d h-3.5 w-32" />
          <div className="skeleton-d h-3 w-20" />
          <div className="skeleton-d h-4 w-14 rounded-full mt-1" />
        </div>
      </div>
      <div className="skeleton-d h-3 w-44" />
      <div className="skeleton-d h-3 w-28" />
    </div>
  );
}

/* ══════════════════════════════════════════════
   PÁGINA PRINCIPAL
   ══════════════════════════════════════════════ */
export default function ProfilesPage() {
  const toast = useToast();
  const { user: me, isAdmin } = useAuth();

  const [usuarios,   setUsuarios]   = useState<Usuario[]>([]);
  const [roles,      setRoles]      = useState<Rol[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [activeTab,  setActiveTab]  = useState("ADMIN");
  const [roleModal,  setRoleModal]  = useState<{ user: Usuario } | null>(null);
  const [selectedRol,setSelectedRol]= useState(0);
  const [saving,     setSaving]     = useState(false);
  const [addModal,   setAddModal]   = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(regSchema),
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [uRes, rRes] = await Promise.allSettled([usuariosApi.list(), rolesApi.list()]);
      if (uRes.status === "fulfilled") setUsuarios(uRes.value.data);
      const def = [{ id_rol: 1, nombre: "ADMIN" }, { id_rol: 2, nombre: "MECANICO" }, { id_rol: 3, nombre: "CLIENTE" }];
      if (rRes.status === "fulfilled" && rRes.value.data?.length > 0) setRoles(rRes.value.data);
      else setRoles(def);
    } catch { toast.error("Error al cargar usuarios"); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const countFor = useCallback((key: string) =>
    usuarios.filter(u => {
      const rn = getRolName((u.roles ?? []) as unknown[]);
      return key === "SINROL" ? rn === "" : rn === key;
    }).length, [usuarios]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return usuarios.filter(u => {
      const rn = getRolName((u.roles ?? []) as unknown[]);
      const matchTab = activeTab === "SINROL" ? rn === "" : rn === activeTab;
      if (!matchTab) return false;
      if (!q) return true;
      return (
        u.nombre_completo?.toLowerCase().includes(q) ||
        u.correo?.toLowerCase().includes(q) ||
        u.nombre_usuario?.toLowerCase().includes(q) ||
        (extractCedula(u.descripcion) ?? "").includes(q)
      );
    });
  }, [usuarios, activeTab, search]);

  const assignRole = async () => {
    if (!roleModal || !selectedRol || !me) return;
    setSaving(true);
    try {
      await rolesApi.assign(roleModal.user.id_usuario, selectedRol, me.id_usuario);
      toast.success("Rol actualizado");
      setRoleModal(null);
      fetchData();
    } catch (err) { toast.error(getErrorMsg(err)); }
    finally { setSaving(false); }
  };

  const onAddUser = async (data: Record<string, string>) => {
    setSaving(true);
    try {
      await authApi.register({
        nombre_completo: data.nombre_completo,
        nombre_usuario:  data.nombre_usuario,
        correo: data.correo || `${data.nombre_usuario}@gmotors.com`,
        contrasena: data.contrasena,
        descripcion: `CEDULA: ${data.cedula} | TELEFONO: ${data.telefono || "N/A"}`,
        pais: "Ecuador", ciudad: "Quito",
      });
      toast.success("Usuario registrado correctamente");
      setAddModal(false);
      reset();
      fetchData();
    } catch (err) { toast.error(getErrorMsg(err)); }
    finally { setSaving(false); }
  };

  const activeTab_ = TABS.find(t => t.key === activeTab)!;

  return (
    <div className="space-y-7 pb-10">

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-2"
      >
        <div>
          <p className="text-[10px] tracking-[0.38em] uppercase text-white/20 font-black mb-2 flex items-center gap-2">
            <Activity size={10} className="text-gm-red" />
            Sistema · Gestión de personal
          </p>
          <h1 className="text-[2rem] font-black text-white leading-tight tracking-tight">
            Usuarios del <span className="text-gradient-red">sistema</span>
          </h1>
          <p className="text-white/28 text-sm mt-1">
            {usuarios.length} cuentas registradas · {countFor("SINROL")} sin rol asignado
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setAddModal(true)} icon={<UserPlus size={14} />}>
            Nuevo usuario
          </Button>
        )}
      </motion.div>

      {/* ── Stats KPI ── */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        {[
          { label: "Total usuarios",    value: usuarios.length,      color: "#fff",     icon: Users,  bg: "rgba(255,255,255,0.04)" },
          { label: "Administradores",   value: countFor("ADMIN"),    color: "#E11428",  icon: Crown,  bg: "rgba(225,20,40,0.06)"   },
          { label: "Mecánicos",         value: countFor("MECANICO"), color: "#3B82F6",  icon: Wrench, bg: "rgba(59,130,246,0.06)"  },
          { label: "Clientes",          value: countFor("CLIENTE"),  color: "#10B981",  icon: User,   bg: "rgba(16,185,129,0.06)"  },
        ].map(({ label, value, color, icon: Icon, bg }) => (
          <motion.div
            key={label}
            variants={statV}
            className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: bg, border: `1px solid ${color}18` }}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                 style={{ background: `${color}15`, border: `1px solid ${color}22` }}>
              <Icon size={15} style={{ color }} />
            </div>
            <div>
              <p className="text-xl font-black leading-none" style={{ color }}>{value}</p>
              <p className="text-[11px] text-white/32 font-medium mt-0.5 leading-tight">{label}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Tabs ── */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(({ key, label, icon: Icon, color, bg }) => {
          const count    = countFor(key);
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => { setActiveTab(key); setSearch(""); }}
              className="relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all duration-200 border overflow-hidden"
              style={isActive
                ? { background: bg, borderColor: `${color}40`, color, boxShadow: `0 0 20px ${color}18` }
                : { background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.38)" }
              }
            >
              <Icon size={13} />
              {label}
              <span
                className="min-w-[20px] h-5 rounded-full flex items-center justify-center text-[10px] font-black px-1.5"
                style={isActive
                  ? { background: `${color}25`, color }
                  : { background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.38)" }
                }
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Búsqueda ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="search-d flex-1 min-w-[200px] max-w-sm">
          <Search size={14} />
          <input
            className="gm-input-d w-full"
            placeholder={`Buscar en ${activeTab_?.label.toLowerCase()}…`}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <AnimatePresence>
          {search && (
            <motion.button
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.12 }}
              onClick={() => setSearch("")}
              className="flex items-center gap-1.5 text-[11px] text-white/30 hover:text-white/70 font-semibold transition-colors"
            >
              <X size={12} /> Limpiar
            </motion.button>
          )}
        </AnimatePresence>
        <span className="text-[11px] text-white/20 font-medium">
          {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Grid de usuarios ── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="py-24 text-center flex flex-col items-center gap-4"
        >
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
               style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <Users size={30} className="text-white/12" />
          </div>
          <div>
            <p className="text-sm font-black text-white/30">
              {search ? "Sin coincidencias" : `No hay ${activeTab_?.label.toLowerCase()}`}
            </p>
            {search && <p className="text-xs text-white/18 mt-1">Intenta con otro término de búsqueda</p>}
          </div>
        </motion.div>
      ) : (
        <motion.div
          key={activeTab + search}
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4"
        >
          <AnimatePresence mode="popLayout">
            {filtered.map(u => (
              <UserCard
                key={u.id_usuario}
                u={u}
                roleName={getRolName((u.roles ?? []) as unknown[])}
                onAssign={(uu: Usuario) => setRoleModal({ user: uu })}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ══ MODAL: Asignar rol ══ */}
      <Modal
        open={!!roleModal}
        onClose={() => setRoleModal(null)}
        title="Gestión de acceso"
        size="md"
        footer={<>
          <Button variant="secondary" onClick={() => setRoleModal(null)}>Cancelar</Button>
          <Button onClick={assignRole} loading={saving} disabled={!selectedRol}>
            <Shield size={14} /> Guardar cambios
          </Button>
        </>}
      >
        <div className="space-y-5">
          {roleModal && (
            <div className="flex items-center gap-3 p-3.5 rounded-xl"
                 style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <Avatar name={roleModal.user.nombre_completo} size="sm" />
              <div>
                <p className="text-[13px] font-black text-white/90">{roleModal.user.nombre_completo}</p>
                <p className="text-[11px] text-white/35">{roleModal.user.correo}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Selector de rol */}
            <div>
              <p className="text-[10px] tracking-[0.25em] uppercase font-black text-white/25 mb-3">
                Rol del sistema
              </p>
              <div className="space-y-2">
                {[
                  { id: roles.find(r => r.nombre === "ADMIN")?.id_rol,    label: "ADMIN",    color: "#E11428", desc: "Control total del sistema" },
                  { id: roles.find(r => r.nombre === "MECANICO")?.id_rol, label: "MECÁNICO", color: "#3B82F6", desc: "Taller y registros" },
                  { id: roles.find(r => r.nombre === "CLIENTE")?.id_rol,  label: "CLIENTE",  color: "#10B981", desc: "Solo su información" },
                ].filter(r => r.id != null).map(r => (
                  <label
                    key={r.id}
                    className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-150"
                    style={selectedRol === r.id
                      ? { background: `${r.color}10`, borderColor: `${r.color}40` }
                      : { background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }
                    }
                  >
                    <input
                      type="radio" name="rol" value={r.id}
                      checked={selectedRol === r.id}
                      onChange={() => setSelectedRol(r.id!)}
                      className="accent-gm-red shrink-0"
                    />
                    <div>
                      <p className="text-[12px] font-black" style={{ color: selectedRol === r.id ? r.color : "rgba(255,255,255,0.75)" }}>
                        {r.label}
                      </p>
                      <p className="text-[10px] text-white/30">{r.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Módulos accesibles */}
            <div>
              <p className="text-[10px] tracking-[0.25em] uppercase font-black text-white/25 mb-3">
                Módulos accesibles
              </p>
              <div className="space-y-1.5 p-3 rounded-xl" style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)" }}>
                {(() => {
                  const sel  = roles.find(r => r.id_rol === selectedRol)?.nombre?.toUpperCase() ?? "";
                  const isA  = sel === "ADMIN";
                  const isM  = sel === "MECANICO";
                  const mods = [
                    { name: "Dashboard",  ok: true },
                    { name: "Registros",  ok: isA || isM },
                    { name: "Motos",      ok: true },
                    { name: "Clientes",   ok: isA || isM },
                    { name: "Inventario", ok: isA || isM },
                    { name: "Perfiles",   ok: isA },
                  ];
                  return mods.map(m => (
                    <div key={m.name} className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
                      <span className="text-[12px] text-white/55 font-medium">{m.name}</span>
                      <span
                        className="text-[9px] font-black tracking-wider px-2 py-0.5 rounded-full"
                        style={m.ok
                          ? { background: "rgba(16,185,129,0.12)", color: "#10B981", border: "1px solid rgba(16,185,129,0.22)" }
                          : { background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.22)", border: "1px solid rgba(255,255,255,0.07)" }
                        }
                      >
                        {m.ok ? "✓ SÍ" : "✗ NO"}
                      </span>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* ══ MODAL: Agregar usuario ══ */}
      <Modal
        open={addModal}
        onClose={() => { setAddModal(false); reset(); }}
        title="Registrar nuevo usuario"
        size="md"
        footer={<>
          <Button variant="secondary" onClick={() => { setAddModal(false); reset(); }}>Cancelar</Button>
          <Button onClick={handleSubmit(onAddUser)} loading={saving}>
            <UserPlus size={14} /> Registrar
          </Button>
        </>}
      >
        <div className="space-y-4">
          {/* Aviso */}
          <div className="p-3.5 rounded-xl flex items-center gap-3"
               style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.2)" }}>
            <Zap size={16} className="text-blue-400 shrink-0" />
            <p className="text-[12px] text-white/50 leading-relaxed">
              El usuario puede iniciar sesión inmediatamente con las credenciales que definas.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Cédula *" placeholder="0912345678"
              error={errors.cedula?.message} {...register("cedula")} />
            <Input label="Nombre completo *" placeholder="Juan Pérez"
              error={errors.nombre_completo?.message} {...register("nombre_completo")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Usuario (login) *" placeholder="juanp"
              error={errors.nombre_usuario?.message} {...register("nombre_usuario")} />
            <Input label="Contraseña *" type="password" placeholder="••••••••"
              error={errors.contrasena?.message} {...register("contrasena")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Correo (opcional)" type="email" placeholder="juan@correo.com"
              error={errors.correo?.message} {...register("correo")} />
            <Input label="Teléfono (opcional)" placeholder="0987654321"
              error={errors.telefono?.message} {...register("telefono")} />
          </div>
          <div>
            <label className="text-sm font-medium text-white/70 block mb-1.5">Rol *</label>
            <select className="gm-select-d w-full" {...register("rol")}>
              <option value="">Seleccionar rol</option>
              {roles.map(r => <option key={r.id_rol} value={r.nombre}>{r.nombre}</option>)}
            </select>
            {errors.rol && <p className="text-xs text-gm-red mt-1">{errors.rol.message}</p>}
          </div>
        </div>
      </Modal>
    </div>
  );
}
