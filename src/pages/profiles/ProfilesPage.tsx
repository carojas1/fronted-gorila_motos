/* ─────────────────────────────────────────────
   GMotors — Gestión de Usuarios del Sistema
   3 tabs: Admins · Mecánicos · Clientes · Sin rol
   ───────────────────────────────────────────── */

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Search, Shield, Users, Mail, MapPin, UserPlus,
  ChevronRight, Wrench, Crown, User, X,
} from "lucide-react";
import gsap from "gsap";
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

function getRolName(roles: unknown[]): string {
  if (!roles || roles.length === 0) return "";
  const r = roles[0];
  const raw = typeof r === "string"
    ? r
    : ((r as { rol?: { nombre?: string }; nombre?: string })?.rol?.nombre
        ?? (r as { nombre?: string })?.nombre ?? "");
  return raw.toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const pal = [
    ["#E11428","#9E0E1B"],["#3B82F6","#1D4ED8"],["#8B5CF6","#6D28D9"],
    ["#10B981","#047857"],["#F59E0B","#B45309"],["#06B6D4","#0E7490"],
  ];
  const [bg, bd] = pal[name.charCodeAt(0) % pal.length];
  const sz = { sm:"w-8 h-8 text-xs", md:"w-11 h-11 text-sm", lg:"w-14 h-14 text-base" }[size];
  return (
    <div className={`${sz} rounded-2xl flex items-center justify-center font-black shrink-0`}
         style={{ background:`${bg}20`, border:`2px solid ${bd}40`, color:bg }}>
      {initials(name)}
    </div>
  );
}

const TABS = [
  { key:"ADMIN",    label:"Administradores", icon:Crown,  color:"#E11428", variant:"gold"    },
  { key:"MECANICO", label:"Mecánicos",       icon:Wrench, color:"#3B82F6", variant:"info"    },
  { key:"CLIENTE",  label:"Clientes",        icon:User,   color:"#10B981", variant:"success" },
  { key:"SINROL",   label:"Sin rol",         icon:Users,  color:"#888888", variant:"default" },
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

function UserCard({ u, roleName, onAssign }: { u: Usuario; roleName: string; onAssign: (u: Usuario) => void }) {
  const tab   = TABS.find(t => t.key === roleName);
  const color = tab?.color ?? "#888";
  const cedula = extractCedula(u.descripcion);
  const isMecanico = roleName === "MECANICO";
  return (
    <div className="gm-card-d rounded-2xl overflow-hidden flex flex-col up-card group">
      <div className="h-[2px]" style={{ background:`linear-gradient(90deg,${color}55,transparent)` }} />
      <div className="p-5 flex flex-col gap-3 flex-1">
        <div className="flex items-start gap-3">
          <Avatar name={u.nombre_completo} />
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-black text-white/90 truncate">{u.nombre_completo}</p>
            <p className="text-[11px] text-white/30 mt-0.5">@{u.nombre_usuario}</p>
            {tab && <Badge variant={tab.variant} className="mt-1.5">{tab.label.replace(/s$/,"")}</Badge>}
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[12px] text-white/40">
            <Mail size={10} className="text-white/20 shrink-0"/><span className="truncate">{u.correo}</span>
          </div>
          {u.ciudad && (
            <div className="flex items-center gap-2 text-[12px] text-white/40">
              <MapPin size={10} className="text-white/20 shrink-0"/><span>{u.ciudad}</span>
            </div>
          )}
          {cedula && (
            <div className="flex items-center gap-2 text-[12px] text-white/40">
              <Shield size={10} className="text-white/20 shrink-0"/>
              <span className="font-mono">C.I. {cedula}</span>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-white/[0.04] mt-auto">
          <button onClick={() => onAssign(u)}
            className="flex items-center gap-1.5 text-[11px] text-white/25 hover:text-gm-red transition-colors font-semibold">
            <Shield size={10}/> Cambiar rol
          </button>
          {isMecanico && (
            <Link to={`/perfiles/${u.id_usuario}`}
              className="flex items-center gap-1 text-[11px] text-gm-red/60 hover:text-gm-red font-bold transition-colors">
              Ficha <ChevronRight size={10}/>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="gm-card-d rounded-2xl p-5 space-y-3">
      <div className="flex gap-3">
        <div className="skeleton-d w-11 h-11 rounded-2xl shrink-0"/>
        <div className="flex-1 space-y-1.5">
          <div className="skeleton-d h-3.5 w-32"/><div className="skeleton-d h-3 w-20"/>
          <div className="skeleton-d h-5 w-16 rounded-full mt-1"/>
        </div>
      </div>
      <div className="skeleton-d h-3 w-44"/><div className="skeleton-d h-3 w-28"/>
    </div>
  );
}

export default function ProfilesPage() {
  const toast = useToast();
  const { user: me, isAdmin } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roles,    setRoles]    = useState<Rol[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [activeTab,setActiveTab]= useState("ADMIN");
  const [roleModal,setRoleModal]= useState<{ user: Usuario } | null>(null);
  const [selectedRol,setSelectedRol] = useState(0);
  const [saving,   setSaving]   = useState(false);
  const [addModal, setAddModal] = useState(false);

  const { register, handleSubmit, reset, formState:{errors} } = useForm({
    resolver: zodResolver(regSchema),
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [uRes, rRes] = await Promise.allSettled([usuariosApi.list(), rolesApi.list()]);
      if (uRes.status === "fulfilled") setUsuarios(uRes.value.data);
      const def = [{id_rol:1,nombre:"ADMIN"},{id_rol:2,nombre:"MECANICO"},{id_rol:3,nombre:"CLIENTE"}];
      if (rRes.status === "fulfilled" && rRes.value.data?.length > 0) setRoles(rRes.value.data);
      else setRoles(def);
    } catch { toast.error("Error al cargar usuarios"); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (loading) return;
    gsap.fromTo(".up-card",
      {y:20,opacity:0,scale:0.97},
      {y:0,opacity:1,scale:1,stagger:0.05,duration:0.4,ease:"power3.out",clearProps:"transform"}
    );
  }, [loading, activeTab]);

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

  return (
    <div className="space-y-7 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-2">
        <div>
          <p className="text-[10px] tracking-[0.35em] uppercase text-white/20 font-black mb-2 flex items-center gap-2">
            <Users size={10} className="text-gm-red"/> Sistema · Gestión de personal
          </p>
          <h1 className="text-[1.9rem] font-black text-white leading-tight">Usuarios del sistema</h1>
          <p className="text-white/30 text-sm mt-1">{usuarios.length} cuentas registradas</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setAddModal(true)} icon={<UserPlus size={14}/>}>
            Agregar usuario
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(({ key, label, icon:Icon, color }) => {
          const count = countFor(key);
          const isActive = activeTab === key;
          return (
            <button key={key} onClick={() => { setActiveTab(key); setSearch(""); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all duration-150 border"
              style={isActive
                ? { background:`${color}18`, borderColor:`${color}40`, color, boxShadow:`0 0 16px ${color}20` }
                : { background:"rgba(255,255,255,0.03)", borderColor:"rgba(255,255,255,0.07)", color:"rgba(255,255,255,0.4)" }
              }
            >
              <Icon size={14}/>
              {label}
              <span className="min-w-[20px] h-5 rounded-full flex items-center justify-center text-[11px] font-black px-1.5"
                style={isActive
                  ? { background:`${color}30`, color }
                  : { background:"rgba(255,255,255,0.06)", color:"rgba(255,255,255,0.4)" }
                }>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Búsqueda */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="search-d flex-1 min-w-[200px] max-w-sm">
          <Search size={14}/>
          <input className="gm-input-d w-full" placeholder="Nombre, correo o cédula..."
            value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        {search && (
          <button onClick={() => setSearch("")}
            className="flex items-center gap-1 text-[11px] text-white/30 hover:text-white/60 font-semibold">
            <X size={12}/> Limpiar
          </button>
        )}
        <span className="text-[11px] text-white/20">{filtered.length} resultado(s)</span>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {Array.from({length:6}).map((_,i)=><SkeletonCard key={i}/>)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center">
            <Users size={26} className="text-white/15"/>
          </div>
          <p className="text-sm font-bold text-white/35">
            {search ? "Sin coincidencias" : `No hay ${TABS.find(t=>t.key===activeTab)?.label.toLowerCase()}`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {filtered.map(u => (
            <UserCard key={u.id_usuario} u={u}
              roleName={getRolName((u.roles ?? []) as unknown[])}
              onAssign={(uu: Usuario) => setRoleModal({ user: uu })}
            />
          ))}
        </div>
      )}

      {/* Modal asignar rol + permisos de módulos */}
      <Modal open={!!roleModal} onClose={() => setRoleModal(null)}
        title="Acceso y permisos del empleado" size="md"
        footer={<>
          <Button variant="secondary" onClick={() => setRoleModal(null)}>Cancelar</Button>
          <Button onClick={assignRole} loading={saving} disabled={!selectedRol}>
            <Shield size={14}/> Guardar cambios
          </Button>
        </>}>
        <div className="space-y-5">
          {/* Info usuario */}
          {roleModal && (
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
              <Avatar name={roleModal.user.nombre_completo} size="sm"/>
              <div>
                <p className="text-[13px] font-black text-white/90">{roleModal.user.nombre_completo}</p>
                <p className="text-[11px] text-white/35">{roleModal.user.correo}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Columna izquierda: selección de rol */}
            <div>
              <p className="text-[10px] tracking-[0.25em] uppercase font-black text-white/25 mb-3">
                Rol del sistema
              </p>
              <div className="space-y-2">
                {[
                  { id: roles.find(r=>r.nombre==="ADMIN")?.id_rol,    label:"ADMIN",    color:"#E11428", desc:"Control total" },
                  { id: roles.find(r=>r.nombre==="MECANICO")?.id_rol, label:"MECÁNICO", color:"#3B82F6", desc:"Taller y registros" },
                  { id: roles.find(r=>r.nombre==="CLIENTE")?.id_rol,  label:"CLIENTE",  color:"#10B981", desc:"Solo su info" },
                ].filter(r => r.id != null).map(r => (
                  <label key={r.id}
                    className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all"
                    style={selectedRol === r.id
                      ? { background:`${r.color}12`, borderColor:`${r.color}40` }
                      : { background:'rgba(255,255,255,0.02)', borderColor:'rgba(255,255,255,0.07)' }
                    }
                  >
                    <input type="radio" name="rol" value={r.id}
                      checked={selectedRol === r.id}
                      onChange={() => setSelectedRol(r.id!)}
                      className="accent-gm-red shrink-0" />
                    <div>
                      <p className="text-[12px] font-black" style={{ color: selectedRol===r.id ? r.color : 'rgba(255,255,255,0.75)' }}>
                        {r.label}
                      </p>
                      <p className="text-[10px] text-white/30">{r.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Columna derecha: módulos que puede ver */}
            <div>
              <p className="text-[10px] tracking-[0.25em] uppercase font-black text-white/25 mb-3">
                Módulos accesibles
              </p>
              <div className="space-y-1.5 p-3 rounded-xl bg-black/20 border border-white/[0.05]">
                {(() => {
                  const selRol = roles.find(r => r.id_rol === selectedRol)?.nombre?.toUpperCase() ?? '';
                  const isA = selRol === 'ADMIN';
                  const isM = selRol === 'MECANICO';
                  const modulos = [
                    { name:'Dashboard',  access: true },
                    { name:'Registros',  access: isA || isM },
                    { name:'Motos',      access: true },
                    { name:'Clientes',   access: isA || isM },
                    { name:'Inventario', access: isA || isM },
                    { name:'Perfiles',   access: isA },
                  ];
                  return modulos.map(m => (
                    <div key={m.name} className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
                      <span className="text-[12px] text-white/55 font-medium">{m.name}</span>
                      <span
                        className="text-[10px] font-black tracking-wider px-2 py-0.5 rounded-full"
                        style={m.access
                          ? { background:'rgba(16,185,129,0.12)', color:'#10B981', border:'1px solid rgba(16,185,129,0.25)' }
                          : { background:'rgba(255,255,255,0.04)', color:'rgba(255,255,255,0.25)', border:'1px solid rgba(255,255,255,0.08)' }
                        }
                      >
                        {m.access ? '✓ SÍ' : '✗ NO'}
                      </span>
                    </div>
                  ));
                })()}
              </div>
              {selectedRol > 0 && (
                <p className="text-[10px] text-white/20 mt-2 italic text-center">
                  Los accesos se actualizan al guardar
                </p>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal agregar usuario */}
      <Modal open={addModal} onClose={() => { setAddModal(false); reset(); }}
        title="Registrar nuevo usuario" size="md"
        footer={<>
          <Button variant="secondary" onClick={() => { setAddModal(false); reset(); }}>Cancelar</Button>
          <Button onClick={handleSubmit(onAddUser)} loading={saving}>
            <UserPlus size={14}/> Registrar
          </Button>
        </>}>
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-gm-red/[0.06] border border-gm-red/20 flex items-center gap-3">
            <UserPlus size={18} className="text-gm-red shrink-0"/>
            <p className="text-[12px] text-white/50 leading-relaxed">
              El usuario puede iniciar sesión inmediatamente con las credenciales que definas.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Cédula *" placeholder="0912345678"
              error={errors.cedula?.message} {...register("cedula")}/>
            <Input label="Nombre completo *" placeholder="Juan Pérez"
              error={errors.nombre_completo?.message} {...register("nombre_completo")}/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Usuario (login) *" placeholder="juanp"
              error={errors.nombre_usuario?.message} {...register("nombre_usuario")}/>
            <Input label="Contraseña *" type="password" placeholder="••••••••"
              error={errors.contrasena?.message} {...register("contrasena")}/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Correo (opcional)" type="email" placeholder="juan@correo.com"
              error={errors.correo?.message} {...register("correo")}/>
            <Input label="Teléfono (opcional)" placeholder="0987654321"
              error={errors.telefono?.message} {...register("telefono")}/>
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