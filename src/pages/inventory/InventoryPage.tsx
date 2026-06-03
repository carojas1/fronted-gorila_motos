/* ─────────────────────────────────────────────
   GORILA MOTOS — Inventario
   Dark redesign, tabla completa, GSAP entrance
   ───────────────────────────────────────────── */

import { useEffect, useState, useCallback, useRef } from 'react';
import { Plus, Search, Pencil, Trash2, Package, AlertTriangle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import gsap from 'gsap';
import { productosApi, categoriasApi } from '../../lib/api';
import { useToast } from '../../components/ui/Toast';
import { fmtMoney, getErrorMsg, nextProductCode } from '../../lib/utils';
import type { Producto, Categoria } from '../../types';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';

const schema = z.object({
  nombre:            z.string().min(2),
  descripcion:       z.string().min(2),
  codigo_proveedor:  z.string().min(1),
  codigo_personal:   z.string().min(1),
  costo:             z.coerce.number().positive(),
  pvp:               z.coerce.number().positive(),
  stock:             z.coerce.number().int().nonnegative(),
  id_categoria:      z.coerce.number().positive('Selecciona categoría'),
  fecha_registro:    z.string().default(() => new Date().toISOString().slice(0, 10)),
  fecha_modificacion:z.string().default(() => new Date().toISOString().slice(0, 10)),
});
type Form = z.infer<typeof schema>;

function SkeletonRow() {
  return (
    <tr>
      {[140, 60, 80, 55, 60, 60, 50].map((w, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="skeleton-d h-3.5 rounded-md" style={{ width: w }} />
        </td>
      ))}
    </tr>
  );
}

export default function InventoryPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const toast   = useToast();

  const [productos,    setProductos]    = useState<Producto[]>([]);
  const [categorias,   setCategorias]   = useState<Categoria[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [search,       setSearch]       = useState('');
  const [catFilter,    setCatFilter]    = useState(0);
  const [modalOpen,    setModalOpen]    = useState(false);
  const [editTarget,   setEditTarget]   = useState<Producto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Producto | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [p, c] = await Promise.allSettled([productosApi.list(), categoriasApi.list()]);
    if (p.status === 'fulfilled') setProductos(p.value.data as Producto[]);
    if (c.status === 'fulfilled') setCategorias(c.value.data as Categoria[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* Animación de entrada */
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.timeline({ defaults: { ease: 'power3.out' } })
        .fromTo('.header-enter', { y: -16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.05 })
        .fromTo('.card-enter',   { y: 32, opacity: 0, scale: 0.96 },
          { y: 0, opacity: 1, scale: 1, stagger: 0.08, duration: 0.6, clearProps: 'transform' }, '-=0.3')
        .fromTo('.section-enter',{ y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, '-=0.3');
    }, pageRef);
    return () => ctx.revert();
  }, []);

  const openCreate = () => {
    setEditTarget(null);
    reset({
      fecha_registro:     new Date().toISOString().slice(0, 10),
      fecha_modificacion: new Date().toISOString().slice(0, 10),
      codigo_personal:    nextProductCode(productos.map((p) => p.codigo_personal)),
    });
    setModalOpen(true);
  };

  const openEdit = (p: Producto) => {
    setEditTarget(p);
    reset({
      nombre: p.nombre, descripcion: p.descripcion,
      codigo_proveedor: p.codigo_proveedor, codigo_personal: p.codigo_personal,
      costo: p.costo, pvp: p.pvp, stock: p.stock, id_categoria: p.id_categoria,
      fecha_registro: p.fecha_registro,
      fecha_modificacion: new Date().toISOString().slice(0, 10),
    });
    setModalOpen(true);
  };

  const onSubmit = async (data: Form) => {
    setSaving(true);
    try {
      if (editTarget) {
        await productosApi.update(editTarget.id_producto, data);
        toast.success('Producto actualizado');
      } else {
        await productosApi.create(data);
        toast.success('Producto creado');
      }
      setModalOpen(false);
      fetchData();
    } catch (err) { toast.error(getErrorMsg(err)); }
    finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await productosApi.remove(deleteTarget.id_producto);
      toast.success('Producto eliminado');
      setDeleteTarget(null);
      fetchData();
    } catch (err) { toast.error(getErrorMsg(err)); }
  };

  const catName = (id: number) =>
    categorias.find((c) => c.id_categoria === id)?.nombre ?? '—';

  const filtered = productos.filter((p) => {
    const q        = search.toLowerCase();
    const matchQ   = p.nombre.toLowerCase().includes(q) || p.codigo_personal.toLowerCase().includes(q);
    const matchCat = catFilter === 0 || p.id_categoria === catFilter;
    return matchQ && matchCat;
  });

  /* KPI cards */
  const lowStock  = productos.filter((p) => p.stock > 0 && p.stock <= 5).length;
  const outStock  = productos.filter((p) => p.stock === 0).length;
  const totalCats = new Set(productos.map((p) => p.id_categoria)).size;

  const stockVariant = (stock: number): 'success' | 'warning' | 'danger' => {
    if (stock > 10) return 'success';
    if (stock > 0)  return 'warning';
    return 'danger';
  };

  return (
    <div ref={pageRef} className="space-y-7 pb-8">

      {/* ─── Header ─── */}
      <div className="header-enter flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-2">
        <div>
          <p className="text-[10px] tracking-[0.35em] uppercase text-white/25 font-semibold mb-2 flex items-center gap-2">
            <Package size={10} className="text-gm-red" /> Stock · Productos
          </p>
          <h1 className="text-[1.9rem] font-black text-white leading-tight tracking-tight">Inventario</h1>
          <p className="text-white/35 text-sm mt-1">{productos.length} productos registrados</p>
        </div>
        <Button icon={<Plus size={15} />} onClick={openCreate}>Nuevo producto</Button>
      </div>

      {/* ─── KPI mini cards ─── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Productos',       value: productos.length, color: 'text-blue-400',    glowColor: 'rgba(59,130,246,0.12)', borderActive: 'rgba(59,130,246,0.35)' },
          { label: 'Stock bajo (≤5)', value: lowStock,         color: 'text-amber-400',   glowColor: 'rgba(245,158,11,0.12)', borderActive: 'rgba(245,158,11,0.35)' },
          { label: 'Sin stock',       value: outStock,         color: 'text-gm-red',      glowColor: 'rgba(225,20,40,0.15)', borderActive: 'rgba(225,20,40,0.4)', warn: outStock > 0 },
        ].map(({ label, value, color, glowColor, borderActive, warn }) => (
          <div
            key={label}
            className="card-enter gm-card-d rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 group"
            style={{
              borderColor: warn ? borderActive : 'rgba(255,255,255,0.05)',
              boxShadow: warn ? `0 0 0 1px ${borderActive}40, 0 0 40px ${glowColor}` : 'none'
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {warn ? <AlertTriangle size={15} className="text-gm-red animate-pulse" /> : <Package size={15} className="text-white/30" />}
                <span className="text-[10px] tracking-[0.2em] uppercase text-white/40 font-bold">{label}</span>
              </div>
            </div>
            <p className={`text-4xl font-black ${warn ? 'text-gm-red drop-shadow-[0_0_15px_rgba(225,20,40,0.8)]' : color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* ─── Filtros ─── */}
      <div className="section-enter flex flex-wrap gap-3 items-center">
        <div className="search-d">
          <Search size={14} />
          <input
            className="gm-input-d w-64"
            placeholder="Nombre o código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(Number(e.target.value))}
          className="gm-select-d w-52"
        >
          <option value={0}>Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>
          ))}
        </select>
        <span className="text-[11px] text-white/25">{filtered.length} resultado(s)</span>
      </div>

      {/* ─── Tabla ─── */}
      <div className="section-enter gm-card-d rounded-2xl overflow-hidden">
        <div className="overflow-x-auto dark-scroll">
          <table className="gm-table-d">
            <thead>
              <tr>
                {['Producto','Código','Categoría','Stock','Costo','PVP','Acciones'].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 7 }).map((_, i) => <SkeletonRow key={i} />)
                : filtered.length === 0
                  ? (
                    <tr>
                      <td colSpan={7}>
                        <div className="py-20 text-center flex flex-col items-center gap-4">
                          <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center">
                            <Package size={28} className="text-white/20" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white/50">Inventario vacío</p>
                            <p className="text-[11px] text-white/30 mt-1">Aún no hay productos registrados o que coincidan con la búsqueda.</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                  : filtered.map((p) => (
                    <tr key={p.id_producto}>
                      <td>
                        <p className="font-semibold text-white/85">{p.nombre}</p>
                        <p className="text-[11px] text-white/30 truncate max-w-[180px] mt-0.5">{p.descripcion}</p>
                      </td>
                      <td>
                        <span className="font-mono text-[11px] text-white/45 bg-white/[0.04] px-2 py-1 rounded-md border border-white/[0.06]">
                          {p.codigo_personal}
                        </span>
                      </td>
                      <td>
                        <Badge>{catName(p.id_categoria)}</Badge>
                      </td>
                      <td>
                        <Badge variant={stockVariant(p.stock)}>{p.stock} u.</Badge>
                      </td>
                      <td className="text-white/45 tabular-nums">{fmtMoney(p.costo)}</td>
                      <td className="font-bold text-white/85 tabular-nums">{fmtMoney(p.pvp)}</td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => openEdit(p)} className="icon-btn" title="Editar">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => setDeleteTarget(p)} className="icon-btn danger" title="Eliminar">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Modal crear/editar ─── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? 'Editar producto' : 'Nuevo producto'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button form="product-form" type="submit" loading={saving}>
              {editTarget ? 'Guardar cambios' : 'Crear producto'}
            </Button>
          </>
        }
      >
        <form id="product-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nombre" placeholder="Nombre del producto" error={errors.nombre?.message} {...register('nombre')} />
            <Input label="Código personal" placeholder="COD-001" error={errors.codigo_personal?.message} {...register('codigo_personal')} />
          </div>
          <Input label="Código proveedor" placeholder="PROV-001" error={errors.codigo_proveedor?.message} {...register('codigo_proveedor')} />
          <Input label="Descripción" placeholder="Describe el producto" error={errors.descripcion?.message} {...register('descripcion')} />
          <div className="grid grid-cols-3 gap-4">
            <Input label="Costo ($)" type="number" placeholder="0.00" error={errors.costo?.message} {...register('costo')} />
            <Input label="PVP ($)" type="number" placeholder="0.00" error={errors.pvp?.message} {...register('pvp')} />
            <Input label="Stock" type="number" placeholder="0" error={errors.stock?.message} {...register('stock')} />
          </div>
          <div>
            <label className="text-sm font-medium text-white/70 block mb-1.5">Categoría</label>
            <select className="gm-select-d w-full" {...register('id_categoria')}>
              <option value="">Seleccionar categoría</option>
              {categorias.map((c) => (
                <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>
              ))}
            </select>
            {errors.id_categoria && <p className="text-xs text-gm-red mt-1">{errors.id_categoria.message}</p>}
          </div>
        </form>
      </Modal>

      {/* ─── Modal eliminar ─── */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Eliminar producto"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="danger" onClick={confirmDelete}>Eliminar</Button>
          </>
        }
      >
        <p className="text-sm text-white/60">
          ¿Estás seguro de eliminar{' '}
          <strong className="text-white/90">{deleteTarget?.nombre}</strong>?
          <br />
          <span className="text-white/30 text-xs mt-1 block">Esta acción no se puede deshacer.</span>
        </p>
      </Modal>
    </div>
  );
}
