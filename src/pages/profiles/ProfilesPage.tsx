/* ─────────────────────────────────────────────
   GMotors — Panel de Administración v2
   Design premium · framer-motion · multi-rol
   ───────────────────────────────────────────── */

import { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  Search, Shield, Users, Mail, MapPin, UserPlus,
  ChevronRight, Wrench, Crown, User, X,
  Lock, Zap, Star, Activity, Trash2,
} from "lucide-react";
import { usuariosApi, rolesApi, authApi, motosApi } from "../../lib/api";
import { useTheme } from "../../lib/theme";
import { useToast } from "../../components/ui/Toast";
import { useAuth } from "../../contexts/AuthContext";
import { initials, extractCedula, getErrorMsg, parsePermisos, setPermisos } from "../../lib/utils";
import type { Usuario, Rol, Moto } from "../../types";
import { useNavigate } from "react-router-dom";
import { Bike, Gauge } from "lucide-react";
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

/* ── Módulos configurables para mecánicos ── */
const MECANICO_MODULES = [
  { key: 'registros',   label: 'Registros',   desc: 'Órdenes de servicio' },
  { key: 'motos',       label: 'Motos',        desc: 'Diagnósticos y perfiles' },
  { key: 'inventario',  label: 'Inventario',   desc: 'Productos y stock' },
  { key: 'proveedores', label: 'Proveedores',  desc: 'Gestión de proveedores' },
  { key: 'clientes',    label: 'Clientes',     desc: 'Historial de clientes' },
  { key: 'alertas',     label: 'Alertas',      desc: 'Alertas de mantenimiento' },
  { key: 'puntos',      label: 'Puntos',       desc: 'Sistema de puntos' },
  { key: 'combustible', label: 'Combustible',  desc: 'Registro de cargas' },
  { key: 'metodologia', label: 'Metodología',  desc: 'Guías técnicas' },
];

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
const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.055 } } };
const cardV: Variants = {
  hidden: { opacity: 0, y: 22, scale: 0.97 },
  show:   { opacity: 1, y: 0,  scale: 1,
            transition: { type: "spring", stiffness: 280, damping: 22 } },
  exit:   { opacity: 0, y: -10, scale: 0.97, transition: { duration: 0.15 } },
};
const statV: Variants = {
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
function UserCard({ u, roleName, onAssign, onDelete, onView, motosCount = 0 }: {
  u: Usuario; roleName: string; onAssign: (u: Usuario) => void;
  onDelete?: (u: Usuario) => void; onView?: (u: Usuario) => void; motosCount?: number;
}) {
  const [theme] = useTheme();
  const isDark = theme === 'dark';
  const isProtected = u.correo === 'gorilamotos2026@gmail.com';
  const tab    = TABS.find(t => t.key === roleName);
  const color  = tab?.color ?? "#8B8FA8";
  const cedula = extractCedula(u.descripcion);
  const phone  = u.descripcion?.match(/TELEFONO:\s*([^\s|]+)/)?.[1];

  return (
    <motion.div variants={cardV}>
      <div
        className="group relative rounded-2xl overflow-hidden flex flex-col h-full cursor-default"
        style={{
          background: isDark ? "linear-gradient(160deg, #18181F 0%, #131318 100%)" : "#FFFFFF",
          border: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid #E4E7EC",
          transition: "border-color 220ms ease, box-shadow 220ms ease, transform 220ms ease",
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.borderColor = `${color}35`;
          (e.currentTarget as HTMLElement).style.boxShadow  = isDark
            ? `0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px ${color}18`
            : `0 16px 48px rgba(0,0,0,0.12), 0 0 0 1px ${color}18`;
          (e.currentTarget as HTMLElement).style.transform  = "translateY(-3px)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.borderColor = isDark ? "rgba(255,255,255,0.07)" : "#E4E7EC";
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
            {motosCount > 0 && (
              <div className="flex items-center gap-2 text-[12px]" style={{ color }}>
                <Bike size={10} className="shrink-0" style={{ opacity: 0.7 }} />
                <span className="font-bold">{motosCount} moto{motosCount !== 1 ? "s" : ""} registrada{motosCount !== 1 ? "s" : ""}</span>
              </div>
            )}
          </div>

          {/* Footer acciones */}
          <div className="flex items-center justify-between pt-3 border-t border-white/[0.04] mt-auto">
            <button
              onClick={() => onAssign(u)}
              className="flex items-center gap-1.5 text-[11px] font-bold transition-colors duration-150"
              style={{ color: isDark ? "rgba(255,255,255,0.25)" : "rgba(21,21,27,0.42)" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = color}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = isDark ? "rgba(255,255,255,0.25)" : "rgba(21,21,27,0.42)"}
            >
              <Lock size={9} /> Cambiar rol
            </button>
            <div className="flex items-center gap-2">
              {onView && (
                <button
                  onClick={() => onView(u)}
                  className="flex items-center gap-1 text-[11px] font-bold transition-colors duration-150"
                  style={{ color: `${color}90` }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = color}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = `${color}90`}
                >
                  Ver detalle <ChevronRight size={10} />
                </button>
              )}
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
              {onDelete && !isProtected && (
                <button
                  onClick={() => onDelete(u)}
                  className="flex items-center gap-1 text-[11px] font-bold text-white/20 hover:text-red-400 transition-colors duration-150"
                  title="Eliminar cuenta"
                >
                  <Trash2 size={10} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Skeleton card ── */
function SkeletonCard() {
  const [theme] = useTheme();
  const isDark = theme === 'dark';
  return (
    <div className="rounded-2xl p-5 space-y-3 overflow-hidden"
         style={{ background: isDark ? "linear-gradient(160deg,#18181F,#131318)" : "#FFFFFF", border: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid #E4E7EC" }}>
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
  const [theme] = useTheme();
  const isDark = theme === 'dark';
  const toast = useToast();
  const { user: me, isAdmin } = useAuth();

  const navigate = useNavigate();
  const [usuarios,   setUsuarios]   = useState<Usuario[]>([]);
  const [motos,      setMotos]      = useState<Moto[]>([]);
  const [roles,      setRoles]      = useState<Rol[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,      setSearch]      = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const [activeTab,  setActiveTab]  = useState("ADMIN");
  const [roleModal,      setRoleModal]      = useState<{ user: Usuario } | null>(null);
  const [selectedRol,    setSelectedRol]    = useState(0);
  const [selectedModulos, setSelectedModulos] = useState<string[]>(MECANICO_MODULES.map(m => m.key));
  const [saving,         setSaving]         = useState(false);
  const [addModal,     setAddModal]     = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Usuario | null>(null);
  const [deleting,     setDeleting]     = useState(false);
  const [viewClient,   setViewClient]   = useState<Usuario | null>(null);

  /* Motos agrupadas por id de propietario */
  const motosByUser = useMemo(() => {
    const map = new Map<number, Moto[]>();
    motos.forEach(m => {
      const arr = map.get(m.id_usuario) ?? [];
      arr.push(m);
      map.set(m.id_usuario, arr);
    });
    return map;
  }, [motos]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(regSchema),
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [uRes, rRes, mRes] = await Promise.allSettled([usuariosApi.list(), rolesApi.list(), motosApi.list()]);
      if (uRes.status === "fulfilled") setUsuarios(uRes.value.data);
      if (mRes.status === "fulfilled") setMotos(mRes.value.data as Moto[]);
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
    const q  = search.toLowerCase().trim();
    const qm = searchEmail.toLowerCase().trim();
    return usuarios.filter(u => {
      const rn = getRolName((u.roles ?? []) as unknown[]);
      const matchTab = activeTab === "SINROL" ? rn === "" : rn === activeTab;
      if (!matchTab) return false;
      if (qm && !u.correo?.toLowerCase().includes(qm)) return false;
      if (!q) return true;
      const placas = (motosByUser.get(u.id_usuario) ?? []).map(m => m.placa.toLowerCase());
      return (
        u.nombre_completo?.toLowerCase().includes(q) ||
        u.nombre_usuario?.toLowerCase().includes(q) ||
        (extractCedula(u.descripcion) ?? "").includes(q) ||
        placas.some(p => p.includes(q))
      );
    });
  }, [usuarios, activeTab, search, searchEmail, motosByUser]);

  const openRoleModal = (u: Usuario) => {
    const currentPerms = parsePermisos(u.descripcion);
    setSelectedModulos(currentPerms ?? MECANICO_MODULES.map(m => m.key));
    const currentRolNombre = getRolName((u.roles ?? []) as unknown[]);
    const currentRol = roles.find(r => r.nombre === currentRolNombre);
    setSelectedRol(currentRol?.id_rol ?? 0);
    setRoleModal({ user: u });
  };

  const assignRole = async () => {
    if (!roleModal || !selectedRol || !me) return;
    setSaving(true);
    try {
      /* cambiarCategoria reemplaza el rol actual — evita duplicados */
      await rolesApi.cambiarCategoria(roleModal.user.id_usuario, selectedRol, me.id_usuario);

      /* Siempre guardar permisos en descripcion:
         - MECANICO → lista de módulos seleccionados
         - Otro rol  → limpia PERMISOS del campo para no dejar basura */
      const rolNombre = roles.find(r => r.id_rol === selectedRol)?.nombre?.toUpperCase() ?? '';
      const newDesc = rolNombre === 'MECANICO'
        ? setPermisos(roleModal.user.descripcion, selectedModulos)
        : (roleModal.user.descripcion ?? '').replace(/\|?PERMISOS:[^|]*/i, '').trim();
      await usuariosApi.update(roleModal.user.id_usuario, { descripcion: newDesc });

      toast.success("Rol y permisos guardados · el empleado debe cerrar sesión y volver a entrar");
      setRoleModal(null);
      fetchData();
    } catch (err) { toast.error(getErrorMsg(err)); }
    finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || deleteTarget.correo === 'gorilamotos2026@gmail.com') return;
    setDeleting(true);
    try {
      await usuariosApi.remove(deleteTarget.id_usuario);
      toast.success("Cuenta eliminada correctamente");
      setDeleteTarget(null);
      fetchData();
    } catch (err) { toast.error(getErrorMsg(err)); }
    finally { setDeleting(false); }
  };

  const onAddUser = async (data: Record<string, string>) => {
    setSaving(true);
    try {
      const correo = data.correo?.trim() || `${data.nombre_usuario}@gmotors.com`;

      await authApi.register({
        nombre_completo: data.nombre_completo,
        nombre_usuario:  data.nombre_usuario,
        correo,
        contrasena: data.contrasena,
        descripcion: `CEDULA: ${data.cedula} | TELEFONO: ${data.telefono || "N/A"}`,
        pais: "Ecuador", ciudad: "Quito",
      });

      // Aplicar el rol seleccionado si es distinto a CLIENTE (que es el rol por defecto)
      if (me && data.rol && data.rol !== "CLIENTE") {
        const roleObj = roles.find(r => r.nombre === data.rol);
        if (roleObj) {
          // Obtener la lista fresca para conseguir el id_usuario del nuevo usuario
          const { data: freshUsers } = await usuariosApi.list();
          const newUser = (freshUsers as Usuario[]).find((u: Usuario) => u.correo === correo);
          if (newUser?.id_usuario) {
            // cambiarCategoria reemplaza el rol actual (CLIENTE → rol seleccionado)
            await rolesApi.cambiarCategoria(newUser.id_usuario, roleObj.id_rol, me.id_usuario);
          }
        }
      }

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
          { label: "Total usuarios",    value: usuarios.length,      color: isDark ? "#fff" : "#15151B",     icon: Users,  bg: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)" },
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
              onClick={() => { setActiveTab(key); setSearch(""); setSearchEmail(""); }}
              className="relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all duration-200 border overflow-hidden"
              style={isActive
                ? { background: bg, borderColor: `${color}40`, color, boxShadow: `0 0 20px ${color}18` }
                : { background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)", borderColor: isDark ? "rgba(255,255,255,0.07)" : "#E4E7EC", color: isDark ? "rgba(255,255,255,0.38)" : "rgba(21,21,27,0.6)" }
              }
            >
              <Icon size={13} />
              {label}
              <span
                className="min-w-[20px] h-5 rounded-full flex items-center justify-center text-[10px] font-black px-1.5"
                style={isActive
                  ? { background: `${color}25`, color }
                  : { background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.03)", color: isDark ? "rgba(255,255,255,0.38)" : "rgba(21,21,27,0.6)" }
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
        {/* Nombre / usuario / placa */}
        <div className="search-d flex-1 min-w-[180px] max-w-xs">
          <Search size={14} />
          <input
            className="gm-input-d w-full"
            placeholder="Nombre, usuario o placa…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {/* Correo electrónico */}
        <div className="search-d flex-1 min-w-[180px] max-w-xs">
          <Search size={14} />
          <input
            className="gm-input-d w-full"
            placeholder="Filtrar por correo…"
            value={searchEmail}
            onChange={e => setSearchEmail(e.target.value)}
            type="email"
          />
        </div>
        <AnimatePresence>
          {(search || searchEmail) && (
            <motion.button
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.12 }}
              onClick={() => { setSearch(""); setSearchEmail(""); }}
              className="flex items-center gap-1.5 text-[11px] text-white/30 hover:text-white/70 font-semibold transition-colors"
            >
              <X size={12} /> Limpiar filtros
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
               style={{ background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.03)", border: isDark ? "1px solid rgba(255,255,255,0.05)" : "1px solid #E4E7EC" }}>
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
          key={activeTab}
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4"
        >
            {filtered.map(u => (
              <UserCard
                key={u.id_usuario}
                u={u}
                roleName={getRolName((u.roles ?? []) as unknown[])}
                motosCount={(motosByUser.get(u.id_usuario) ?? []).length}
                onAssign={(uu: Usuario) => openRoleModal(uu)}
                onView={(uu: Usuario) => setViewClient(uu)}
                onDelete={isAdmin ? (uu: Usuario) => setDeleteTarget(uu) : undefined}
              />
            ))}
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
                 style={{ background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)", border: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid #E4E7EC" }}>
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
              {(() => {
                const rolNombre = roles.find(r => r.id_rol === selectedRol)?.nombre?.toUpperCase() ?? "";
                if (rolNombre === "MECANICO") {
                  return (
                    <div className="space-y-1 p-3 rounded-xl" style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <p className="text-[10px] text-blue-400/70 mb-2">Elige qué puede ver este mecánico:</p>
                      {MECANICO_MODULES.map(m => {
                        const checked = selectedModulos.includes(m.key);
                        return (
                          <label key={m.key} className="flex items-center gap-2.5 py-1.5 border-b border-white/[0.04] last:border-0 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => setSelectedModulos(prev =>
                                checked ? prev.filter(x => x !== m.key) : [...prev, m.key]
                              )}
                              className="accent-blue-500 w-3.5 h-3.5 shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <span className="text-[12px] font-bold" style={{ color: checked ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.3)" }}>
                                {m.label}
                              </span>
                              <span className="text-[10px] text-white/22 ml-1.5">{m.desc}</span>
                            </div>
                          </label>
                        );
                      })}
                      <div className="flex gap-2 pt-2">
                        <button onClick={() => setSelectedModulos(MECANICO_MODULES.map(m => m.key))}
                          className="text-[10px] text-blue-400/70 hover:text-blue-400 transition-colors font-bold">Todos</button>
                        <span className="text-white/15">·</span>
                        <button onClick={() => setSelectedModulos([])}
                          className="text-[10px] text-white/25 hover:text-white/50 transition-colors font-bold">Ninguno</button>
                      </div>
                    </div>
                  );
                }
                if (rolNombre === "ADMIN") {
                  return (
                    <div className="p-3 rounded-xl" style={{ background: "rgba(225,20,40,0.05)", border: "1px solid rgba(225,20,40,0.15)" }}>
                      <p className="text-[11px] text-red-400/70">Acceso completo a todos los módulos.</p>
                    </div>
                  );
                }
                return (
                  <div className="p-3 rounded-xl" style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.15)" }}>
                    <p className="text-[11px] text-emerald-400/70">Acceso solo a sus motos y portal personal.</p>
                  </div>
                );
              })()}
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

      {/* ══ MODAL: Confirmar eliminación ══ */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Eliminar cuenta"
        size="sm"
        footer={<>
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
          <Button variant="danger" onClick={confirmDelete} loading={deleting}>
            <Trash2 size={13} /> Eliminar
          </Button>
        </>}
      >
        <div className="space-y-3">
          <div className="p-3.5 rounded-xl"
               style={{ background: "rgba(225,20,40,0.06)", border: "1px solid rgba(225,20,40,0.18)" }}>
            <p className="text-[12px] text-white/50 leading-relaxed">
              Vas a eliminar la cuenta de{' '}
              <strong className="text-white/85">{deleteTarget?.nombre_completo}</strong>
              {' '}({deleteTarget?.correo}).
              Esta acción no se puede deshacer.
            </p>
          </div>
          <p className="text-[11px] text-white/30">
            El usuario perderá acceso inmediatamente.
          </p>
        </div>
      </Modal>

      {/* ══ MODAL: Detalle de usuario + sus motos ══ */}
      <Modal
        open={!!viewClient}
        onClose={() => setViewClient(null)}
        title="Detalle del usuario"
        size="md"
      >
        {viewClient && (() => {
          const ced   = extractCedula(viewClient.descripcion);
          const tel   = viewClient.descripcion?.match(/TELEFONO:\s*([^\s|]+)/)?.[1];
          const sus   = motosByUser.get(viewClient.id_usuario) ?? [];
          const rn    = getRolName((viewClient.roles ?? []) as unknown[]);
          const tab   = TABS.find(t => t.key === rn);
          const color = tab?.color ?? "#8B8FA8";
          return (
            <div className="space-y-5">
              {/* Cabecera */}
              <div className="flex items-center gap-3 p-4 rounded-xl"
                   style={{ background: `${color}0D`, border: `1px solid ${color}25` }}>
                <Avatar name={viewClient.nombre_completo} />
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-black text-white/92">{viewClient.nombre_completo}</p>
                  <p className="text-[12px] text-white/40">@{viewClient.nombre_usuario}</p>
                  {tab && (
                    <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full"
                          style={{ color, background: `${color}18`, border: `1px solid ${color}30` }}>
                      <tab.icon size={9} /> {tab.label.replace(/s$/, "")}
                    </span>
                  )}
                </div>
              </div>

              {/* Datos de contacto */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Mail,       label: "Correo",   val: viewClient.correo },
                  { icon: Shield,     label: "Cédula",   val: ced ?? "No registrada" },
                  { icon: Star,       label: "Teléfono", val: tel && tel !== "N/A" ? tel : "No registrado" },
                  { icon: MapPin,     label: "Ciudad",   val: viewClient.ciudad ?? "—" },
                ].map(({ icon: Icon, label, val }) => (
                  <div key={label} className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <p className="flex items-center gap-1.5 text-[10px] tracking-wider uppercase font-black text-white/25 mb-1">
                      <Icon size={10} /> {label}
                    </p>
                    <p className="text-[12.5px] text-white/70 font-semibold truncate">{val}</p>
                  </div>
                ))}
              </div>

              {/* Motos del usuario */}
              <div>
                <p className="flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase font-black text-white/25 mb-3">
                  <Bike size={11} /> Motos registradas ({sus.length})
                </p>
                {sus.length === 0 ? (
                  <div className="py-6 text-center rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.08)" }}>
                    <p className="text-[12px] text-white/30">Este usuario no tiene motos registradas</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sus.map(m => (
                      <button
                        key={m.id_moto}
                        onClick={() => { setViewClient(null); navigate(`/motos/${m.id_moto}`); }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-150"
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(59,130,246,0.4)"; (e.currentTarget as HTMLElement).style.background = "rgba(59,130,246,0.06)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}
                      >
                        {m.ruta_imagen_motos && m.ruta_imagen_motos !== "Desconocido" ? (
                          <img src={m.ruta_imagen_motos} alt={m.placa} className="w-11 h-11 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.05)" }}>
                            <Bike size={18} className="text-white/30" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-black text-white/90 truncate">{m.marca} {m.modelo}</p>
                          <p className="flex items-center gap-2 text-[11px] text-white/40 mt-0.5">
                            <span className="plate-tag">{m.placa}</span>
                            <span className="flex items-center gap-1"><Gauge size={9} /> {m.kilometraje.toLocaleString("es-EC")} km</span>
                            <span>· {m.cilindraje} cc</span>
                          </p>
                        </div>
                        <ChevronRight size={15} className="text-white/25 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
