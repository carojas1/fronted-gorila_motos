/* ─────────────────────────────────────────────
   GORILA MOTOS — Inventario
   Dark redesign, tabla completa, GSAP entrance
   ───────────────────────────────────────────── */

import { useEffect, useState, useCallback, useRef, type Dispatch, type SetStateAction } from 'react';
import { Plus, Search, Pencil, Trash2, Package, AlertTriangle, ShoppingCart, Tags, FolderPlus, Minus, UserCheck, Mail, Camera, ImagePlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import gsap from 'gsap';
import { productosApi, categoriasApi, usuariosApi, motosApi, facturasApi, detallesFacturaApi, proveedorContactosApi } from '../../lib/api';
import { isNativeApp } from '../../lib/platform';
import { useTheme } from '../../lib/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { extractCedula, extractPhone, fmtMoney, getErrorMsg, nextProductCode } from '../../lib/utils';
import { comprimirImagen } from '../../lib/fotos';
import type { Producto, Categoria, Usuario, Moto } from '../../types';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';

const schema = z.object({
  nombre:            z.string().min(1, 'Requerido'),
  descripcion:       z.string().nullish().transform(v => v || ''),
  codigo_proveedor:  z.string().nullish().transform(v => v || ''),
  codigo_distribuidor: z.string().nullish().transform(v => v || ''),
  codigo_personal:   z.string().nullish().transform(v => v || ''),
  costo:             z.coerce.number({ invalid_type_error: 'El costo debe ser un número válido' }).min(0, 'Inválido'),
  pvp:               z.coerce.number({ invalid_type_error: 'El PVP debe ser un número válido' }).min(0, 'Inválido'),
  stock:             z.coerce.number({ invalid_type_error: 'El stock debe ser un número válido' }).int('El stock debe ser entero').min(0, 'Inválido'),
  id_categoria:      z.coerce.number({ invalid_type_error: 'Selecciona una categoría válida' }).min(1, 'Selecciona categoría'),
  fecha_registro:    z.any().transform(v => {
    if (typeof v === 'string' && v.length >= 10) return v.slice(0, 10);
    if (Array.isArray(v) && v.length >= 3) return `${v[0]}-${String(v[1]).padStart(2, '0')}-${String(v[2]).padStart(2, '0')}`;
    return new Date().toISOString().slice(0, 10);
  }),
  fecha_modificacion:z.any().transform(v => {
    if (typeof v === 'string' && v.length >= 10) return v.slice(0, 10);
    if (Array.isArray(v) && v.length >= 3) return `${v[0]}-${String(v[1]).padStart(2, '0')}-${String(v[2]).padStart(2, '0')}`;
    return new Date().toISOString().slice(0, 10);
  }),
});
type Form = z.infer<typeof schema>;

interface VentaExtra {
  producto: Producto;
  cantidad: number;
}

interface ClienteVenta {
  tipo: 'consumidor_final' | 'puntual' | 'registrado';
  nombre: string;
  cedula: string;
  telefono: string;
  correo: string;
  direccion: string;
}

function SkeletonRow() {
  return (
    <tr>
      {[140, 60, 80, 80, 55, 60, 60, 50].map((w, i) => (
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
  const [theme] = useTheme();
  const isDark  = theme === 'dark';
  const navigate = useNavigate();
  const { user } = useAuth();

  // Estados principales
  const [productos,    setProductos]    = useState<Producto[]>([]);
  const [categorias,   setCategorias]   = useState<Categoria[]>([]);
  const [proveedores,  setProveedores]  = useState<{codigo: string, nombre: string}[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [search,       setSearch]       = useState('');
  const [catFilter,    setCatFilter]    = useState(0);
  const [modalOpen,      setModalOpen]      = useState(false);
  const [editTarget,     setEditTarget]     = useState<Producto | null>(null);
  const [deleteTarget,   setDeleteTarget]   = useState<Producto | null>(null);
  const [stockView,      setStockView]      = useState<'all' | 'ok' | 'low' | 'out'>('all');

  const [catModalOpen,  setCatModalOpen]  = useState(false);
  const [newCatName,    setNewCatName]    = useState('');
  const [newCatDesc,    setNewCatDesc]    = useState('');
  const [editingCat,    setEditingCat]    = useState<Categoria | null>(null);
  const [savingCat,     setSavingCat]     = useState(false);

  /* Proveedor Modal (Crear rápido) */
  const [provModalOpen, setProvModalOpen] = useState(false);
  const [newProvCodigo, setNewProvCodigo] = useState('');
  const [newProvNombre, setNewProvNombre] = useState('');
  const [savingProv,    setSavingProv]    = useState(false);

  /* Venta directa (consumidor final — solo baja stock, sin orden) */
  const [sellTarget,    setSellTarget]    = useState<Producto | null>(null);
  const [sellQty,       setSellQty]       = useState('1');
  const [selling,       setSelling]       = useState(false);
  const [sellExtras,    setSellExtras]    = useState<VentaExtra[]>([]);
  const [sellCliente,   setSellCliente]   = useState<ClienteVenta>({
    tipo: 'consumidor_final',
    nombre: 'Consumidor final',
    cedula: '9999999999',
    telefono: '',
    correo: '',
    direccion: '',
  });

  /* Fotos de producto */
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoTarget, setPhotoTarget]   = useState<Producto | null>(null);
  const [photoUploading, setPhotoUploading] = useState<Record<number, boolean>>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  /* Venta Normal — con cliente registrado, busca por email o placa */
  const [vnTarget,      setVnTarget]      = useState<Producto | null>(null);
  const [vnStep,        setVnStep]        = useState<'search' | 'confirm'>('search');
  const [vnMode]                          = useState<'email' | 'placa'>('email');
  const [vnQuery,       setVnQuery]       = useState('');
  const [, setVnSearching]                = useState(false);
  const [vnCliente,     setVnCliente]     = useState<{ nombre: string; correo: string; id_usuario: number; cedula?: string | null; telefono?: string | null; direccion?: string | null } | null>(null);
  const [, setVnNotFound]                 = useState(false);
  const [vnQty,         setVnQty]         = useState('1');
  const [vnSending,     setVnSending]     = useState(false);
  const [sellEmail,     setSellEmail]     = useState('');
  const [vnUsuarios,    setVnUsuarios]    = useState<Usuario[]>([]);
  const [vnExtras,      setVnExtras]      = useState<VentaExtra[]>([]);

  const [addStockOpen,  setAddStockOpen]  = useState(false);
  const [addStockVals,  setAddStockVals]  = useState({ cant: 1, costo: 0, pvp: 0 });

  const { register, handleSubmit, reset, getValues, setValue, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as Resolver<Form>,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [p, c, pr] = await Promise.allSettled([
      productosApi.list(), 
      categoriasApi.list(),
      proveedorContactosApi.list()
    ]);
    
    const fetchedProds = p.status === 'fulfilled' ? (p.value.data as Producto[]) : [];
    const fetchedContactos = pr.status === 'fulfilled' ? (pr.value.data as any[]) : [];
    
    if (p.status === 'fulfilled') setProductos(fetchedProds);
    if (c.status === 'fulfilled') setCategorias(c.value.data as Categoria[]);
    
    const provMap = new Map<string, {codigo: string, nombre: string}>();
    fetchedContactos.forEach(ct => provMap.set(ct.codigo, ct));
    fetchedProds.forEach(prod => {
      if (prod.codigo_proveedor && !provMap.has(prod.codigo_proveedor)) {
        provMap.set(prod.codigo_proveedor, { codigo: prod.codigo_proveedor, nombre: `Proveedor ${prod.codigo_proveedor}` });
      }
    });
    setProveedores(Array.from(provMap.values()));
    
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (vnTarget) {
      usuariosApi.list().then(res => setVnUsuarios(res.data as Usuario[])).catch(() => {});
    } else {
      setVnUsuarios([]);
    }
  }, [vnTarget]);

  /* Animación de entrada — solo cuando termina de cargar */
  useEffect(() => {
    if (loading) return;
    const ctx = gsap.context(() => {
      const headers  = gsap.utils.toArray<HTMLElement>('.header-enter');
      const cards    = gsap.utils.toArray<HTMLElement>('.card-enter');
      const sections = gsap.utils.toArray<HTMLElement>('.section-enter');
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      if (headers.length)  tl.fromTo(headers,  { y: -16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.05 });
      if (cards.length)    tl.fromTo(cards,    { y: 32, opacity: 0, scale: 0.96 }, { y: 0, opacity: 1, scale: 1, stagger: 0.08, duration: 0.6, clearProps: 'transform' }, '-=0.3');
      if (sections.length) tl.fromTo(sections, { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, '-=0.3');
    }, pageRef);
    return () => ctx.revert();
  }, [loading]);

  const openCreate = () => {
    setImageFile(null);
    setPreviewUrl(null);
    setEditTarget(null);
    reset({
      nombre: '', descripcion: '', codigo_proveedor: '', costo: 0, pvp: 0, stock: 0, id_categoria: undefined,
      fecha_registro:     new Date().toISOString().slice(0, 10),
      fecha_modificacion: new Date().toISOString().slice(0, 10),
      codigo_personal:    nextProductCode(productos.map((p) => p.codigo_personal)),
      codigo_distribuidor: '',
    });
    setModalOpen(true);
  };

  const openEdit = (p: Producto) => {
    setImageFile(null);
    setPreviewUrl(null);
    setEditTarget(p);
    reset({
      nombre: p.nombre || '', descripcion: p.descripcion || '',
      codigo_proveedor: p.codigo_proveedor || '', codigo_personal: p.codigo_personal || '',
      codigo_distribuidor: p.codigo_distribuidor || '',
      costo: p.costo || 0, pvp: p.pvp || 0, stock: p.stock || 0, id_categoria: p.id_categoria,
      fecha_registro: p.fecha_registro || new Date().toISOString().slice(0, 10),
      fecha_modificacion: new Date().toISOString().slice(0, 10),
    });
    setModalOpen(true);
  };

  const onSubmit = async (data: Form) => {
    setSaving(true);
    try {
      let finalUrl: string | undefined = undefined;
      if (imageFile) {
        const base64 = await comprimirImagen(imageFile);
        const resBlob = await fetch(base64).then(r => r.blob());
        const compFile = new File([resBlob], imageFile.name || 'foto.jpg', { type: 'image/jpeg' });
        const fd = new FormData();
        fd.append('file', compFile);
        const { data: uploadRes } = await productosApi.upload(fd);
        finalUrl = uploadRes.url;
      }

      const submissionData = { ...data, ruta_imagenproductos: finalUrl };

      if (editTarget) {
        await productosApi.update(editTarget.id_producto, submissionData);
        toast.success('Producto actualizado');
      } else {
        await productosApi.create(submissionData);
        toast.success('Producto creado');
      }
      setModalOpen(false);
      fetchData();
    } catch (err) { toast.error(getErrorMsg(err)); }
    finally { 
      setSaving(false); 
      setImageFile(null);
      setPreviewUrl(null);
    }
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

  /* ─── Categorías ─── */
  const saveCategoria = async () => {
    if (!newCatName.trim()) { toast.error('Escribe el nombre de la categoría'); return; }
    setSavingCat(true);
    try {
      if (editingCat) {
        await categoriasApi.update(editingCat.id_categoria, { nombre: newCatName.trim(), descripcion: newCatDesc.trim() });
        toast.success('Categoría actualizada');
      } else {
        await categoriasApi.create({ nombre: newCatName.trim(), descripcion: newCatDesc.trim() });
        toast.success('Categoría creada');
      }
      setNewCatName(''); setNewCatDesc(''); setEditingCat(null);
      fetchData();
    } catch (err) { toast.error(getErrorMsg(err)); }
    finally { setSavingCat(false); }
  };

  const editCategoria = (c: Categoria) => {
    setEditingCat(c); setNewCatName(c.nombre); setNewCatDesc(c.descripcion ?? '');
  };

  const deleteCategoria = async (c: Categoria) => {
    const enUso = productos.some(p => p.id_categoria === c.id_categoria);
    if (enUso) { toast.error(`No se puede eliminar "${c.nombre}": tiene productos asignados`); return; }
    try {
      await categoriasApi.remove(c.id_categoria);
      toast.success('Categoría eliminada');
      if (editingCat?.id_categoria === c.id_categoria) { setEditingCat(null); setNewCatName(''); setNewCatDesc(''); }
      fetchData();
    } catch (err) { toast.error(getErrorMsg(err)); }
  };

  /* ─── Proveedor Rápido ─── */
  const saveProveedor = async () => {
    if (!newProvCodigo.trim() || !newProvNombre.trim()) { 
      toast.error('Llena código y nombre'); 
      return; 
    }
    setSavingProv(true);
    try {
      await proveedorContactosApi.guardar(newProvCodigo.trim().toUpperCase(), {
        nombre: newProvNombre.trim(),
        telefono: '', email: '', producto: ''
      });
      toast.success('Proveedor creado');
      setValue('codigo_proveedor', newProvCodigo.trim().toUpperCase());
      setProvModalOpen(false);
      setNewProvCodigo(''); setNewProvNombre('');
      fetchData();
    } catch (err) { toast.error(getErrorMsg(err)); }
    finally { setSavingProv(false); }
  };

  const mergeVentaItems = (base: Producto, qty: number, extras: VentaExtra[]) => {
    const map = new Map<number, { producto: Producto; cantidad: number }>();
    map.set(base.id_producto, { producto: base, cantidad: qty });
    extras.forEach(({ producto, cantidad }) => {
      const prev = map.get(producto.id_producto);
      map.set(producto.id_producto, {
        producto,
        cantidad: (prev?.cantidad ?? 0) + Math.max(0, Number(cantidad) || 0),
      });
    });
    return Array.from(map.values()).filter(i => i.cantidad > 0);
  };

  const validarItemsVenta = (items: { producto: Producto; cantidad: number }[]) => {
    if (items.length === 0) return 'Agrega al menos un producto';
    for (const item of items) {
      if (!Number.isInteger(item.cantidad) || item.cantidad <= 0) return `Cantidad invalida: ${item.producto.nombre}`;
      if (item.cantidad > item.producto.stock) return `Solo hay ${item.producto.stock} unidades de ${item.producto.nombre}`;
    }
    return null;
  };

  const itemsParaApi = (items: { producto: Producto; cantidad: number }[]) =>
    items.map(({ producto, cantidad }) => ({
      idProducto: producto.id_producto,
      cantidad,
      nombreProducto: producto.nombre,
      codigoProducto: producto.codigo_personal,
      codigoDistribuidor: producto.codigo_distribuidor,
      pvp: producto.pvp,
      subtotal: cantidad * producto.pvp,
    }));

  const totalItems = (items: { producto: Producto; cantidad: number }[]) =>
    items.reduce((sum, item) => sum + item.cantidad * item.producto.pvp, 0);

  const addExtra = (
    idProducto: number,
    setter: Dispatch<SetStateAction<VentaExtra[]>>,
    excludedId?: number,
  ) => {
    const producto = productos.find(p => p.id_producto === idProducto);
    if (!producto || producto.id_producto === excludedId || producto.stock <= 0) return;
    setter(prev => prev.some(x => x.producto.id_producto === producto.id_producto)
      ? prev
      : [...prev, { producto, cantidad: 1 }]);
  };

  /* ─── Venta directa: baja stock sin crear orden ─── */
  const confirmSell = async () => {
    if (!sellTarget) return;
    const qty = parseInt(sellQty, 10);
    const items = mergeVentaItems(sellTarget, qty, sellExtras);
    const itemError = validarItemsVenta(items);
    if (itemError) { toast.error(itemError); return; }
    if (!user?.id_usuario) { toast.error('No se pudo identificar el usuario que registra la venta'); return; }
    setSelling(true);
    try {
      const total = totalItems(items);
      const cliente = {
        ...sellCliente,
        correo: sellEmail.trim() || sellCliente.correo,
        nombre: sellCliente.tipo === 'consumidor_final' ? 'Consumidor final' : sellCliente.nombre,
      };
      const ventaRes = await productosApi.ventaDirecta({
        items:      itemsParaApi(items),
        idUsuario:  user.id_usuario,
        cliente,
      });
      const venta = ventaRes.data as { idFactura?: number; id_factura?: number };
      const facturaId = venta.idFactura ?? venta.id_factura ?? null;
      const stockRestante = sellTarget.stock - qty;
      let emailOk: boolean | null = null;
      if ((cliente.correo ?? '').trim()) {
        const fecha = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
        try {
          const comprobante = await productosApi.enviarComprobante({
            correo:         cliente.correo,
            nombreCliente:  cliente.nombre || 'Consumidor final',
            items:          itemsParaApi(items),
            total,
            fecha,
            referencia:     facturaId ? `FAC-${String(facturaId).padStart(5, '0')}` : undefined,
            cliente,
          });
          emailOk = Boolean((comprobante.data as { sent?: boolean })?.sent);
        } catch {
          emailOk = false;
        }
      }
      toast.success(`Venta registrada · ${qty} u. de ${sellTarget.nombre} (quedan ${sellTarget.stock - qty})`);
      if (emailOk === false) {
        toast.warning('La venta quedó registrada, pero el comprobante no se pudo enviar. Revisa la configuración de correo.');
      }
      if (stockRestante !== sellTarget.stock - qty) {
        toast.success(`Stock actualizado en servidor: ${stockRestante} u.`);
      }
      if (!facturaId) {
        toast.warning('La venta se registro, pero no llego el numero de factura para referencia.');
      }
      setSellTarget(null); setSellQty('1'); setSellEmail(''); setSellExtras([]);
      fetchData();
    } catch (err) { toast.error(getErrorMsg(err)); }
    finally { setSelling(false); }
  };

  /* ─── Venta Normal: buscar cliente ─── */
  /* Búsqueda de cliente para "Venta Normal" — función lista, pendiente de cablear a la UI */
  const _buscarCliente = async () => {
    const q = vnQuery.trim();
    if (!q) { toast.error('Ingresa un ' + (vnMode === 'email' ? 'correo' : 'número de placa')); return; }
    setVnSearching(true);
    setVnCliente(null);
    setVnNotFound(false);
    try {
      if (vnMode === 'email') {
        const { data: usuarios } = await usuariosApi.list();
        const found = (usuarios as Usuario[]).find(
          (u) => u.correo.toLowerCase() === q.toLowerCase()
        );
        if (found) {
          setVnCliente({
            nombre: found.nombre_completo,
            correo: found.correo,
            id_usuario: found.id_usuario,
            cedula: found.cedula ?? extractCedula(found.descripcion),
            telefono: found.telefono ?? extractPhone(found.descripcion),
            direccion: found.direccion ?? found.ciudad ?? '',
          });
          setVnStep('confirm');
        } else {
          setVnNotFound(true);
        }
      } else {
        const [{ data: motos }, { data: usuarios }] = await Promise.all([
          motosApi.list(),
          usuariosApi.list(),
        ]);
        const moto = (motos as Moto[]).find(
          (m) => m.placa.toUpperCase() === q.toUpperCase()
        );
        if (!moto) { setVnNotFound(true); return; }
        const usuario = (usuarios as Usuario[]).find((u) => u.id_usuario === moto.id_usuario);
        if (usuario) {
          setVnCliente({
            nombre: usuario.nombre_completo,
            correo: usuario.correo,
            id_usuario: usuario.id_usuario,
            cedula: usuario.cedula ?? extractCedula(usuario.descripcion),
            telefono: usuario.telefono ?? extractPhone(usuario.descripcion),
            direccion: usuario.direccion ?? usuario.ciudad ?? '',
          });
          setVnStep('confirm');
        } else {
          setVnNotFound(true);
        }
      }
    } catch { toast.error('Error buscando cliente'); }
    finally { setVnSearching(false); }
  };

  const seleccionarCliente = (usuario: Usuario) => {
    setVnCliente({
      nombre: usuario.nombre_completo,
      correo: usuario.correo,
      id_usuario: usuario.id_usuario,
      cedula: usuario.cedula ?? extractCedula(usuario.descripcion),
      telefono: usuario.telefono ?? extractPhone(usuario.descripcion),
      direccion: usuario.direccion ?? usuario.ciudad ?? '',
    });
    setVnStep('confirm');
    setVnQuery('');
  };

  /* ─── Venta Normal: confirmar venta ─── */
  const confirmVentaNormal = async () => {
    if (!vnTarget || !vnCliente) return;
    const qty = parseInt(vnQty, 10);
    const items = mergeVentaItems(vnTarget, qty, vnExtras);
    const itemError = validarItemsVenta(items);
    if (itemError) { toast.error(itemError); return; }
    const cliente = {
      tipo: 'registrado',
      nombre: vnCliente.nombre,
      cedula: vnCliente.cedula ?? '',
      telefono: vnCliente.telefono ?? '',
      correo: vnCliente.correo,
      direccion: vnCliente.direccion ?? '',
    };
    setVnSending(true);
    try {
      const total = totalItems(items);
      const ventaRes = await productosApi.ventaDirecta({
        items: itemsParaApi(items),
        idUsuario: vnCliente.id_usuario,
        cliente,
      });
      const venta = ventaRes.data as { idFactura?: number; id_factura?: number };
      const facturaId = venta.idFactura ?? venta.id_factura ?? null;
      let emailOk: boolean | null = null;
      if (vnCliente.correo) {
        const fecha = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
        try {
          const comprobante = await productosApi.enviarComprobante({
            correo: vnCliente.correo,
            nombreCliente: vnCliente.nombre,
            items: itemsParaApi(items),
            total,
            fecha,
            referencia: facturaId ? `FAC-${String(facturaId).padStart(5, '0')}` : undefined,
            cliente,
          });
          emailOk = Boolean((comprobante.data as { sent?: boolean })?.sent);
        } catch {
          emailOk = false;
        }
      }
      toast.success(`Venta registrada · ${items.length} producto${items.length === 1 ? '' : 's'} → ${vnCliente.nombre}`);
      if (emailOk === false) {
        toast.warning('La venta quedó registrada, pero el comprobante no se pudo enviar. Revisa la configuración de correo.');
      }
      if (!facturaId) {
        toast.warning('La venta se registró, pero no se pudo abrir el comprobante porque no se creó la factura.');
      }
      setVnSending(false);
      setVnTarget(null); setVnStep('search'); setVnQuery(''); setVnCliente(null); setVnQty('1'); setVnExtras([]);
      fetchData();
      if (facturaId) navigate(`/invoice/f_${facturaId}`);
      return;
    } catch (err) {
      toast.error(getErrorMsg(err));
      setVnSending(false);
      return;
    }
    if (isNaN(qty) || qty <= 0) { toast.error('Cantidad inválida'); return; }
    if (qty > vnTarget.stock) { toast.error(`Solo hay ${vnTarget.stock} unidades en stock`); return; }
    setVnSending(true);
    const today = new Date().toISOString().slice(0, 10);
    const total = qty * vnTarget.pvp;
    try {
      /* 1. Descontar stock */
      await productosApi.update(vnTarget.id_producto, {
        ...vnTarget,
        stock:              vnTarget.stock - qty,
        fecha_modificacion: today,
      });

      /* 2. Crear factura + detalle (queda registrado para historial de cliente) */
      let facturaId: number | null = null;
      try {
        const facRes = await facturasApi.create({
          fecha_emision: today,
          id_usuario:    vnCliente.id_usuario,
          costo_total:   total,
        });
        const factura = facRes.data as { id_factura?: number; idFactura?: number };
        facturaId = factura.id_factura ?? factura.idFactura ?? null;
        if (facturaId) {
          await detallesFacturaApi.create({
            id_factura:  facturaId,
            id_producto: vnTarget.id_producto,
            cantidad:    qty,
            subtotal:    total,
            descripcion: vnTarget.nombre,
          });
        }
      } catch { /* factura opcional — no bloquea la venta */ }

      /* 3. Enviar comprobante por email (siempre, si el cliente tiene correo) */
      let emailOk: boolean | null = null;
      if (vnCliente.correo) {
        const fecha = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
        try {
          const comprobante = await productosApi.enviarComprobante({
            correo:         vnCliente.correo,
            nombreCliente:  vnCliente.nombre,
            nombreProducto: vnTarget.nombre,
            codigoProducto: vnTarget.codigo_personal,
            cantidad:       qty,
            pvp:            vnTarget.pvp,
            total,
            fecha,
            referencia:     facturaId ? `FAC-${String(facturaId).padStart(5, '0')}` : undefined,
          });
          emailOk = Boolean((comprobante.data as { sent?: boolean })?.sent);
        } catch {
          emailOk = false;
        }
      }

      toast.success(`Venta registrada · ${qty} u. de ${vnTarget.nombre} → ${vnCliente.nombre}`);
      if (emailOk === false) {
        toast.warning('La venta quedó registrada, pero el comprobante no se pudo enviar. Revisa la configuración de correo.');
      }
      if (!facturaId) {
        toast.warning('La venta se registró, pero no se pudo abrir el comprobante porque no se creó la factura.');
      }
      setVnTarget(null); setVnStep('search'); setVnQuery(''); setVnCliente(null); setVnQty('1');
      fetchData();
      if (facturaId) {
        navigate(`/invoice/f_${facturaId}`);
      }
    } catch (err) { toast.error(getErrorMsg(err)); }
    finally { setVnSending(false); }
  };

  /* ─── Fotos ─── */
  const handlePhotoClick = (p: Producto) => {
    setPhotoTarget(p);
    photoInputRef.current?.click();
  };

  const handlePhotoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !photoTarget) return;
    const id = photoTarget.id_producto;
    setPhotoUploading(prev => ({ ...prev, [id]: true }));
    try {
      const base64 = await comprimirImagen(file);
      const resBlob = await fetch(base64).then(r => r.blob());
      const compFile = new File([resBlob], file.name || 'foto.jpg', { type: 'image/jpeg' });
      const fd = new FormData();
      fd.append('file', compFile);
      const { data: uploadRes } = await productosApi.upload(fd);
      await productosApi.update(id, { 
        ...photoTarget,
        ruta_imagenproductos: uploadRes.url 
      } as unknown as Record<string, unknown>);
      toast.success('Foto de producto actualizada');
      fetchData();
    } catch (err) {
      toast.error(getErrorMsg(err));
    } finally {
      setPhotoUploading(prev => ({ ...prev, [id]: false }));
      setPhotoTarget(null);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const catName = (id: number) =>
    categorias.find((c) => c.id_categoria === id)?.nombre ?? '—';

  const filtered = productos.filter((p) => {
    const q        = search.toLowerCase();
    const provName = proveedores.find(pr => pr.codigo === p.codigo_proveedor)?.nombre || '';
    const matchQ   = p.nombre.toLowerCase().includes(q) || 
                     p.codigo_personal.toLowerCase().includes(q) || 
                     (p.codigo_distribuidor || '').toLowerCase().includes(q) ||
                     (p.codigo_proveedor || '').toLowerCase().includes(q) || 
                     provName.toLowerCase().includes(q);
    const matchCat = catFilter === 0 || p.id_categoria === catFilter;
    const matchStock =
      stockView === 'all' ? true :
      stockView === 'out' ? p.stock === 0 :
      stockView === 'low' ? (p.stock > 0 && p.stock <= 5) :
      /* ok */              p.stock > 5;
    return matchQ && matchCat && matchStock;
  });

  /* KPI cards */
  const lowStock  = productos.filter((p) => p.stock > 0 && p.stock <= 5).length;
  const outStock  = productos.filter((p) => p.stock === 0).length;

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
          <p className="text-[10px] tracking-[0.35em] uppercase dark:text-white/25 text-slate-900/25 font-semibold mb-2 flex items-center gap-2">
            <Package size={10} className="text-gm-red" /> Stock · Productos
          </p>
          <h1 className="text-[1.9rem] font-black dark:text-white text-slate-900 leading-tight tracking-tight">Inventario</h1>
          <p className="dark:text-white/35 text-slate-900/35 text-sm mt-1">{productos.length} productos registrados</p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="secondary" icon={<Tags size={15} />} onClick={() => setCatModalOpen(true)}>Categorías</Button>
          <Button icon={<Plus size={15} />} onClick={openCreate}>Nuevo producto</Button>
        </div>
      </div>

      {/* ─── KPI mini cards (clic = filtrar la tabla) ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {([
          { view: 'all', label: 'Todos',        value: productos.length, color: 'text-blue-400',    borderActive: 'rgba(59,130,246,0.5)',  warn: false },
          { view: 'ok',  label: 'Stock OK (>5)', value: productos.filter(p => p.stock > 5).length, color: 'text-emerald-400', borderActive: 'rgba(16,185,129,0.5)', warn: false },
          { view: 'low', label: 'Stock bajo (≤5)', value: lowStock,      color: 'text-amber-400',   borderActive: 'rgba(245,158,11,0.5)',  warn: lowStock > 0 },
          { view: 'out', label: 'Sin stock',     value: outStock,        color: 'text-gm-red',      borderActive: 'rgba(225,20,40,0.5)',   warn: outStock > 0 },
        ] as const).map(({ view, label, value, color, borderActive, warn }) => {
          const isActive = stockView === view;
          return (
            <div
              key={view}
              onClick={() => setStockView(isActive ? 'all' : view)}
              title={`Filtrar: ${label}`}
              className="card-enter gm-card-d rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 cursor-pointer"
              style={{
                borderColor: isActive ? borderActive : (warn ? borderActive : (isDark ? 'rgba(255,255,255,0.05)' : '#E4E7EC')),
                boxShadow: isActive ? `0 0 0 2px ${borderActive}, 0 0 30px ${borderActive}40` : 'none',
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {warn ? <AlertTriangle size={15} className="text-gm-red animate-pulse" /> : <Package size={15} className="dark:text-white/30 text-slate-900/30" />}
                  <span className="text-[10px] tracking-[0.2em] uppercase dark:text-white/40 text-slate-900/40 font-bold">{label}</span>
                </div>
                {isActive && <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: borderActive, color: '#fff' }}>Activo</span>}
              </div>
              <p className={`text-4xl font-black ${color}`}>{value}</p>
            </div>
          );
        })}
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
        <span className="text-[11px] dark:text-white/25 text-slate-900/25">{filtered.length} resultado(s)</span>
      </div>

      {/* ─── Tabla ─── */}
      <div className="section-enter gm-card-d rounded-2xl overflow-hidden">
        <div className="overflow-x-auto dark-scroll">
          <table className="gm-table-d">
            <thead>
              <tr>
                {['Producto','Código','Proveedor','Categoría','Stock','Costo','PVP','Acciones'].map((h) => (
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
                      <td colSpan={8}>
                        <div className="py-20 text-center flex flex-col items-center gap-4">
                          <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center">
                            <Package size={28} className="dark:text-white/20 text-slate-900/20" />
                          </div>
                          <div>
                            <p className="text-sm font-bold dark:text-white/50 text-slate-900/50">Inventario vacío</p>
                            <p className="text-[11px] dark:text-white/30 text-slate-900/30 mt-1">Aún no hay productos registrados o que coincidan con la búsqueda.</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                  : filtered.map((p) => (
                    <tr key={p.id_producto}>
                      <td>
                        <div className="flex items-center gap-3">
                          {p.ruta_imagenproductos ? (
                            <img
                              src={p.ruta_imagenproductos}
                              alt={p.nombre}
                              className="w-10 h-10 rounded-xl object-cover shrink-0"
                              style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center"
                              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                              <Package size={16} className="dark:text-white/20 text-slate-900/20" />
                            </div>
                          )}
                          <div>
                            <p className="font-semibold dark:text-white/85 text-slate-900/85">{p.nombre}</p>
                            <p className="text-[11px] dark:text-white/30 text-slate-900/30 truncate max-w-[140px] mt-0.5">{p.descripcion}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-col gap-1.5">
                          <span className="font-mono text-[11px] dark:text-white/45 text-slate-900/45 dark:bg-white/[0.04] bg-slate-900/[0.04] px-2 py-1 rounded-md border dark:border-white/[0.06] border-slate-900/[0.06] w-max">
                            {p.codigo_personal}
                          </span>
                          {p.codigo_distribuidor && (
                            <span className="text-[9.5px] dark:text-white/35 text-slate-900/35 font-mono">
                              Dist: {p.codigo_distribuidor}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        {p.codigo_proveedor ? (
                          <div className="flex flex-col">
                            <span className="text-[11.5px] font-semibold dark:text-white/75 text-slate-900/75">
                              {proveedores.find(pr => pr.codigo === p.codigo_proveedor)?.nombre || p.codigo_proveedor}
                            </span>
                            <span className="text-[9px] dark:text-white/30 text-slate-900/30 font-mono">Cód: {p.codigo_proveedor}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] dark:text-white/20 text-slate-900/20">—</span>
                        )}
                      </td>
                      <td>
                        <Badge>{catName(p.id_categoria)}</Badge>
                      </td>
                      <td>
                        <Badge variant={stockVariant(p.stock)}>{p.stock} u.</Badge>
                      </td>
                      <td className="dark:text-white/45 text-slate-900/45 tabular-nums">{fmtMoney(p.costo)}</td>
                      <td className="font-bold dark:text-white/85 text-slate-900/85 tabular-nums">{fmtMoney(p.pvp)}</td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => { setSellTarget(p); setSellQty('1'); }}
                            className="icon-btn"
                            title="Venta rápida (sin cliente)"
                            disabled={p.stock <= 0}
                            style={p.stock <= 0 ? { opacity: 0.3, cursor: 'not-allowed' } : { color: '#10B981' }}
                          >
                            <ShoppingCart size={13} />
                          </button>
                          <button
                            onClick={() => {
                              setVnTarget(p); setVnStep('search'); setVnQuery('');
                              setVnCliente(null); setVnNotFound(false); setVnQty('1');
                            }}
                            className="icon-btn"
                            title="Venta Normal (con cliente registrado)"
                            disabled={p.stock <= 0}
                            style={p.stock <= 0 ? { opacity: 0.3, cursor: 'not-allowed' } : { color: '#60A5FA' }}
                          >
                            <UserCheck size={13} />
                          </button>
                          <button
                            onClick={() => handlePhotoClick(p)}
                            className="icon-btn"
                            title={p.ruta_imagenproductos ? 'Cambiar foto' : 'Subir foto'}
                            disabled={!!photoUploading[p.id_producto]}
                            style={{ color: p.ruta_imagenproductos ? '#10B981' : undefined, opacity: photoUploading[p.id_producto] ? 0.5 : 1 }}
                          >
                            <Camera size={13} />
                          </button>
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
        <form id="product-form" onSubmit={handleSubmit(onSubmit, (errs) => {
          console.error("Errores de validación Zod:", errs);
          const entries = Object.entries(errs);
          if (entries.length > 0) {
            const [field, error] = entries[0];
            toast.error(`Error en ${field}: ${error.message}`);
          } else {
            toast.error('Revisa los campos del formulario');
          }
        })} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nombre" placeholder="Nombre del producto" error={errors.nombre?.message} {...register('nombre')} />
            <Input label="Código personal" placeholder="COD-001" error={errors.codigo_personal?.message} {...register('codigo_personal')} />
          </div>
          <Input label="Código del distribuidor" placeholder="Ej. MT09 / código de compra IMMER" error={errors.codigo_distribuidor?.message} {...register('codigo_distribuidor')} />
          <div>
            <label className="text-sm font-medium dark:text-white/70 text-slate-900/70 block mb-1.5 flex justify-between items-center">
              <span>Proveedor</span>
              <button type="button" onClick={() => setProvModalOpen(true)} className="text-[11px] text-gm-red hover:underline font-bold bg-transparent border-none p-0 cursor-pointer transition-transform hover:scale-105">
                + Crear proveedor
              </button>
            </label>
            <select
              className="gm-input-d w-full"
              {...register('codigo_proveedor')}
            >
              <option value="" className="dark:bg-[#131318] dark:text-white bg-white text-black">-- Sin proveedor --</option>
              {proveedores.map(pr => (
                <option key={pr.codigo} value={pr.codigo} className="dark:bg-[#131318] dark:text-white bg-white text-black">
                  {pr.nombre} (Cód. {pr.codigo})
                </option>
              ))}
            </select>
          </div>
          <Input label="Descripción" placeholder="Describe el producto" error={errors.descripcion?.message} {...register('descripcion')} />
          <div className="grid grid-cols-3 gap-4">
            <Input label="Costo ($)" type="number" step="0.01" placeholder="0.00" error={errors.costo?.message} {...register('costo')} />
            <Input label="PVP ($)" type="number" step="0.01" placeholder="0.00" error={errors.pvp?.message} {...register('pvp')} />
            <div>
              <label className="text-sm font-medium dark:text-white/70 text-slate-900/70 block mb-1.5 flex justify-between items-center">
                <span>Stock</span>
                {editTarget && (
                  <button type="button" onClick={() => {
                    setAddStockVals({
                      cant: 1,
                      costo: Number(getValues('costo') || 0),
                      pvp: Number(getValues('pvp') || 0)
                    });
                    setAddStockOpen(true);
                  }} className="text-[11px] text-gm-red hover:underline font-bold bg-transparent border-none p-0 cursor-pointer transition-transform hover:scale-105">
                    + Añadir
                  </button>
                )}
              </label>
              <input 
                type="number" 
                placeholder="0"
                className="gm-input-d w-full"
                {...register('stock')} 
              />
              {errors.stock && <p className="text-xs text-gm-red mt-1">{errors.stock.message}</p>}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5" style={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(21,21,27,0.6)' }}>Foto del producto (opcional)</label>
            <div className="flex gap-2 mb-2">
              {/* Botón Cámara */}
              <button
                type="button"
                onClick={() => {
                  if (isNativeApp) {
                    import('@capacitor/camera').then(({ Camera: CapCamera, CameraResultType, CameraSource }) => {
                      CapCamera.getPhoto({ quality: 70, width: 720, resultType: CameraResultType.DataUrl, source: CameraSource.Camera })
                        .then(photo => {
                          if (photo.dataUrl) {
                            setPreviewUrl(photo.dataUrl);
                            // Create a File from dataUrl for comprimirImagen compatibility
                            fetch(photo.dataUrl).then(r => r.blob()).then(blob => {
                              setImageFile(new File([blob], 'camera.jpg', { type: 'image/jpeg' }));
                            });
                          }
                        }).catch(() => {});
                    }).catch(() => {
                      // Fallback: open file input with capture
                      const inp = document.createElement('input');
                      inp.type = 'file'; inp.accept = 'image/*'; inp.capture = 'environment';
                      inp.onchange = () => { const f = inp.files?.[0]; if (f) { setImageFile(f); setPreviewUrl(URL.createObjectURL(f)); } };
                      inp.click();
                    });
                  } else {
                    const inp = document.createElement('input');
                    inp.type = 'file'; inp.accept = 'image/*'; inp.capture = 'environment';
                    inp.onchange = () => { const f = inp.files?.[0]; if (f) { setImageFile(f); setPreviewUrl(URL.createObjectURL(f)); } };
                    inp.click();
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all hover:scale-105"
                style={{ background: '#E11428', color: '#fff' }}
              >
                <Camera size={14} /> Cámara
              </button>
              {/* Botón Galería / Archivos */}
              <button
                type="button"
                onClick={() => {
                  if (isNativeApp) {
                    import('@capacitor/camera').then(({ Camera: CapCamera, CameraResultType, CameraSource }) => {
                      CapCamera.getPhoto({ quality: 70, width: 720, resultType: CameraResultType.DataUrl, source: CameraSource.Photos })
                        .then(photo => {
                          if (photo.dataUrl) {
                            setPreviewUrl(photo.dataUrl);
                            fetch(photo.dataUrl).then(r => r.blob()).then(blob => {
                              setImageFile(new File([blob], 'gallery.jpg', { type: 'image/jpeg' }));
                            });
                          }
                        }).catch(() => {});
                    }).catch(() => {
                      const inp = document.createElement('input');
                      inp.type = 'file'; inp.accept = 'image/*';
                      inp.onchange = () => { const f = inp.files?.[0]; if (f) { setImageFile(f); setPreviewUrl(URL.createObjectURL(f)); } };
                      inp.click();
                    });
                  } else {
                    const inp = document.createElement('input');
                    inp.type = 'file'; inp.accept = 'image/*';
                    inp.onchange = () => { const f = inp.files?.[0]; if (f) { setImageFile(f); setPreviewUrl(URL.createObjectURL(f)); } };
                    inp.click();
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all hover:scale-105"
                style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', color: isDark ? '#fff' : '#333', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #ddd' }}
              >
                <ImagePlus size={14} /> Galería
              </button>
            </div>
            {previewUrl && (
              <div className="relative inline-block">
                <img src={previewUrl} alt="Preview" className="h-20 rounded-lg object-cover border" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#ddd' }} />
                <button type="button" onClick={() => { setPreviewUrl(null); setImageFile(null); }}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center dark:text-white text-slate-900 text-[10px] font-bold"
                  style={{ background: '#E11428' }}>✕</button>
              </div>
            )}
          </div>
          <div>
            <label className="text-sm font-medium dark:text-white/70 text-slate-900/70 block mb-1.5">Categoría</label>
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

      {/* Indicador de filtro activo */}
      {stockView !== 'all' && (
        <div className="flex items-center gap-2 -mt-3">
          <span className="text-[11px] dark:text-white/40 text-slate-900/40">
            Mostrando: <strong className="dark:text-white/70 text-slate-900/70">{filtered.length}</strong>{' '}
            {stockView === 'out' ? 'sin stock' : stockView === 'low' ? 'con stock bajo' : 'con stock OK'}
          </span>
          <button onClick={() => setStockView('all')} className="text-[11px] font-bold text-gm-red hover:underline">
            Ver todos
          </button>
        </div>
      )}

      {/* ─── Modal gestionar categorías ─── */}
      <Modal
        open={catModalOpen}
        onClose={() => { setCatModalOpen(false); setEditingCat(null); setNewCatName(''); setNewCatDesc(''); }}
        title="Gestionar categorías"
        size="md"
      >
        <div className="space-y-5">
          {/* Form crear/editar */}
          <div className="p-4 rounded-xl" style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)' }}>
            <p className="flex items-center gap-2 text-[12px] font-bold text-blue-300 mb-3">
              <FolderPlus size={14} /> {editingCat ? `Editando: ${editingCat.nombre}` : 'Nueva categoría'}
            </p>
            <div className="space-y-3">
              <input className="gm-input-d w-full" placeholder="Nombre (ej. Lubricantes)" value={newCatName} onChange={e => setNewCatName(e.target.value)} />
              <input className="gm-input-d w-full" placeholder="Descripción (opcional)" value={newCatDesc} onChange={e => setNewCatDesc(e.target.value)} />
              <div className="flex justify-end gap-2">
                {editingCat && (
                  <button onClick={() => { setEditingCat(null); setNewCatName(''); setNewCatDesc(''); }}
                    className="text-[12px] font-semibold px-3 py-2 rounded-lg" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(21,21,27,0.6)' }}>
                    Cancelar edición
                  </button>
                )}
                <button onClick={saveCategoria} disabled={savingCat}
                  className="flex items-center gap-2 text-[12px] font-bold px-4 py-2 rounded-lg dark:text-white text-slate-900"
                  style={{ background: savingCat ? 'rgba(59,130,246,0.4)' : '#3B82F6' }}>
                  <Plus size={13} /> {editingCat ? 'Guardar' : 'Crear categoría'}
                </button>
              </div>
            </div>
          </div>

          {/* Lista de categorías */}
          <div className="space-y-2">
            <p className="text-[10px] tracking-[0.2em] uppercase font-black dark:text-white/25 text-slate-900/25">Categorías existentes ({categorias.length})</p>
            {categorias.length === 0 ? (
              <p className="text-[12px] dark:text-white/30 text-slate-900/30 text-center py-4">Aún no hay categorías</p>
            ) : categorias.map(c => {
              const count = productos.filter(p => p.id_categoria === c.id_categoria).length;
              return (
                <div key={c.id_categoria} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #E4E7EC' }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold dark:text-white/85 text-slate-900/85 truncate">{c.nombre}</p>
                    <p className="text-[11px] dark:text-white/35 text-slate-900/35 truncate">{c.descripcion || 'Sin descripción'} · {count} producto{count !== 1 ? 's' : ''}</p>
                  </div>
                  <button onClick={() => editCategoria(c)} className="icon-btn" title="Editar"><Pencil size={12} /></button>
                  <button onClick={() => deleteCategoria(c)} className="icon-btn danger" title="Eliminar"><Trash2 size={12} /></button>
                </div>
              );
            })}
          </div>
        </div>
      </Modal>

      {/* ─── Modal venta directa ─── */}
      <Modal
        open={!!sellTarget}
        onClose={() => { setSellTarget(null); setSellQty('1'); setSellEmail(''); }}
        title="Venta directa (mostrador)"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setSellTarget(null); setSellQty('1'); setSellEmail(''); }}>Cancelar</Button>
            <Button onClick={confirmSell} loading={selling}>
              <ShoppingCart size={14} /> Registrar venta
            </Button>
          </>
        }
      >
        {sellTarget && (
          <div className="space-y-4">
            <p className="text-[12px] dark:text-white/45 text-slate-900/45 leading-relaxed">
              Venta a consumidor final — <strong className="dark:text-white/70 text-slate-900/70">solo descuenta el stock</strong>, sin crear orden de servicio.
              <br />
              <span className="dark:text-white/55 text-slate-900/55">Tambien queda registrada para contabilidad.</span>
            </p>
            <div className="p-3 rounded-xl" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #E4E7EC' }}>
              <p className="text-[14px] font-bold dark:text-white/90 text-slate-900/90">{sellTarget.nombre}</p>
              <p className="text-[11px] dark:text-white/40 text-slate-900/40 mt-0.5">
                Stock actual: <strong style={{ color: '#10B981' }}>{sellTarget.stock} u.</strong> · PVP {fmtMoney(sellTarget.pvp)}
              </p>
            </div>
            <div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <select
                  className="gm-select-d col-span-2"
                  value={sellCliente.tipo}
                  onChange={e => setSellCliente(v => ({
                    ...v,
                    tipo: e.target.value as ClienteVenta['tipo'],
                    nombre: e.target.value === 'consumidor_final' ? 'Consumidor final' : '',
                    cedula: e.target.value === 'consumidor_final' ? '9999999999' : '',
                  }))}
                >
                  <option value="consumidor_final">Consumidor final</option>
                  <option value="puntual">Cliente puntual</option>
                </select>
                {sellCliente.tipo === 'puntual' && (
                  <>
                    <input className="gm-input-d" placeholder="Nombre cliente" value={sellCliente.nombre} onChange={e => setSellCliente(v => ({ ...v, nombre: e.target.value }))} />
                    <input className="gm-input-d" placeholder="Cedula / RUC" value={sellCliente.cedula} onChange={e => setSellCliente(v => ({ ...v, cedula: e.target.value }))} />
                    <input className="gm-input-d" placeholder="Telefono" value={sellCliente.telefono} onChange={e => setSellCliente(v => ({ ...v, telefono: e.target.value }))} />
                    <input className="gm-input-d" placeholder="Direccion" value={sellCliente.direccion} onChange={e => setSellCliente(v => ({ ...v, direccion: e.target.value }))} />
                  </>
                )}
              </div>
              <label className="text-xs font-semibold dark:text-white/50 text-slate-900/50 uppercase tracking-wider block mb-1.5">Cantidad vendida</label>
              <div className="flex items-center gap-2">
                <button onClick={() => setSellQty(q => String(Math.max(1, parseInt(q || '1', 10) - 1)))} className="icon-btn"><Minus size={14} /></button>
                <input type="number" min={1} max={sellTarget.stock} value={sellQty} onChange={e => setSellQty(e.target.value)}
                  className="gm-input-d text-center" style={{ width: 90 }} />
                <button onClick={() => setSellQty(q => String(Math.min(sellTarget.stock, parseInt(q || '1', 10) + 1)))} className="icon-btn"><Plus size={14} /></button>
                <span className="text-[13px] dark:text-white/40 text-slate-900/40 ml-2">
                  Total: <strong className="text-emerald-400">{fmtMoney(totalItems(mergeVentaItems(sellTarget, parseInt(sellQty || '0', 10), sellExtras)))}</strong>
                </span>
              </div>
            </div>
            <div>
              <div className="space-y-2 mb-3">
                <label className="text-xs font-semibold dark:text-white/50 text-slate-900/50 uppercase tracking-wider block">Agregar otro producto</label>
                <select className="gm-select-d w-full" defaultValue="" onChange={e => { addExtra(Number(e.target.value), setSellExtras, sellTarget.id_producto); e.currentTarget.value = ''; }}>
                  <option value="">Seleccionar producto...</option>
                  {productos.filter(p => p.id_producto !== sellTarget.id_producto && p.stock > 0).map(p => (
                    <option key={p.id_producto} value={p.id_producto}>{p.nombre} - {p.stock} u. - {fmtMoney(p.pvp)}</option>
                  ))}
                </select>
                {sellExtras.map((it, index) => (
                  <div key={it.producto.id_producto} className="flex items-center gap-2">
                    <span className="flex-1 text-[12px] dark:text-white/70 text-slate-900/70 truncate">{it.producto.nombre}</span>
                    <input className="gm-input-d text-center" style={{ width: 74 }} type="number" min={1} max={it.producto.stock} value={it.cantidad}
                      onChange={e => setSellExtras(prev => prev.map((x, i) => i === index ? { ...x, cantidad: Number(e.target.value) } : x))} />
                    <button className="icon-btn danger" onClick={() => setSellExtras(prev => prev.filter((_, i) => i !== index))}><Trash2 size={12} /></button>
                  </div>
                ))}
              </div>
              <label className="text-xs font-semibold dark:text-white/50 text-slate-900/50 uppercase tracking-wider block mb-1.5">
                Email del cliente <span className="dark:text-white/25 text-slate-900/25 font-normal normal-case tracking-normal">(opcional — envía comprobante)</span>
              </label>
              <div className="relative">
                <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 dark:text-white/30 text-slate-900/30 pointer-events-none" />
                <input
                  type="email"
                  className="gm-input-d w-full pl-8"
                  placeholder="cliente@correo.com"
                  value={sellEmail}
                  onChange={e => setSellEmail(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}
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
        <p className="text-sm dark:text-white/60 text-slate-900/60">
          ¿Estás seguro de eliminar{' '}
          <strong className="dark:text-white/90 text-slate-900/90">{deleteTarget?.nombre}</strong>?
          <br />
          <span className="dark:text-white/30 text-slate-900/30 text-xs mt-1 block">Esta acción no se puede deshacer.</span>
        </p>
      </Modal>

      {/* Input oculto para subir fotos de productos */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handlePhotoFile}
      />

      {/* ─── Modal Venta Normal (con cliente registrado) ─── */}
      <Modal
        open={!!vnTarget}
        onClose={() => { setVnTarget(null); setVnStep('search'); setVnQuery(''); setVnCliente(null); setVnNotFound(false); }}
        title="Venta Normal — cliente registrado"
        size="lg"
        footer={
          vnStep === 'search' ? (
            <>
              <Button variant="secondary" onClick={() => setVnTarget(null)}>Cancelar</Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={() => { setVnStep('search'); setVnCliente(null); }}>
                ← Volver
              </Button>
              <Button onClick={confirmVentaNormal} loading={vnSending}>
                <UserCheck size={14} /> Registrar venta
              </Button>
            </>
          )
        }
      >
        {vnTarget && vnStep === 'search' && (
          <div className="grid grid-cols-5 gap-5">

            {/* ── Columna izquierda: producto + instrucción ── */}
            <div className="col-span-2 space-y-4">
              <div className="p-4 rounded-xl h-full" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #E4E7EC' }}>
                <p className="text-[10px] dark:text-white/30 text-slate-900/30 uppercase tracking-widest font-bold mb-2">Producto</p>
                <p className="text-[15px] font-black dark:text-white/90 text-slate-900/90 leading-tight">{vnTarget.nombre}</p>
                <p className="text-[11px] dark:text-white/40 text-slate-900/40 mt-1">Código: {vnTarget.codigo_personal}</p>
                <div className="mt-3 pt-3" style={{ borderTop: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #E4E7EC' }}>
                  <p className="text-[11px] dark:text-white/35 text-slate-900/35">Stock disponible</p>
                  <p className="text-[22px] font-black" style={{ color: '#10B981' }}>{vnTarget.stock} u.</p>
                </div>
                <div className="mt-2">
                  <p className="text-[11px] dark:text-white/35 text-slate-900/35">PVP unitario</p>
                  <p className="text-[18px] font-black dark:text-white/80 text-slate-900/80">{fmtMoney(vnTarget.pvp)}</p>
                </div>
              </div>
            </div>

            {/* ── Columna derecha: búsqueda + lista de clientes ── */}
            <div className="col-span-3 space-y-3">
              <div>
                <label className="text-xs font-semibold dark:text-white/50 text-slate-900/50 uppercase tracking-wider block mb-1.5">
                  Seleccionar cliente
                  <span className="ml-2 dark:text-white/25 text-slate-900/25 font-normal normal-case tracking-normal">
                    {vnUsuarios.length > 0 ? `${vnUsuarios.length} registrados` : 'cargando...'}
                  </span>
                </label>
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 dark:text-white/30 text-slate-900/30 pointer-events-none" />
                  <input
                    className="gm-input-d w-full pl-8"
                    placeholder="Nombre o correo electrónico..."
                    value={vnQuery}
                    onChange={(e) => setVnQuery(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>

              {/* Lista inline de todos los clientes */}
              <div className="rounded-xl overflow-hidden" style={{ border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E4E7EC' }}>
                <div className="overflow-y-auto dark-scroll" style={{ maxHeight: 290 }}>
                  {(() => {
                    const q = vnQuery.toLowerCase();
                    const lista = vnUsuarios
                      .filter(u => !q || u.correo.toLowerCase().includes(q) || u.nombre_completo.toLowerCase().includes(q))
                      .slice(0, 25);
                    if (vnUsuarios.length === 0) return (
                      <div className="flex items-center justify-center py-12">
                        <p className="text-[12px] dark:text-white/25 text-slate-900/25">Cargando clientes...</p>
                      </div>
                    );
                    if (lista.length === 0) return (
                      <div className="flex items-center justify-center py-12">
                        <p className="text-[12px] dark:text-white/25 text-slate-900/25">Sin coincidencias</p>
                      </div>
                    );
                    return lista.map((u, i) => (
                      <button
                        key={u.id_usuario}
                        type="button"
                        onClick={() => seleccionarCliente(u)}
                        className="w-full text-left px-4 py-3 transition-colors hover:bg-white/5 flex items-center gap-3"
                        style={{ borderBottom: i < lista.length - 1 ? (isDark ? '1px solid rgba(255,255,255,0.04)' : '1px solid #E4E7EC') : 'none' }}
                      >
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-black dark:text-white text-slate-900 shrink-0"
                             style={{ background: 'rgba(225,20,40,0.18)', border: '1px solid rgba(225,20,40,0.3)' }}>
                          {u.nombre_completo?.charAt(0)?.toUpperCase() ?? '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold dark:text-white/85 text-slate-900/85 truncate">{u.nombre_completo}</p>
                          <p className="text-[11px] dark:text-white/40 text-slate-900/40 truncate">{u.correo}</p>
                        </div>
                        <UserCheck size={13} className="dark:text-white/20 text-slate-900/20 shrink-0" />
                      </button>
                    ));
                  })()}
                </div>
              </div>
            </div>

          </div>
        )}

        {vnTarget && vnStep === 'confirm' && vnCliente && (
          <div className="grid grid-cols-5 gap-5">

            {/* ── Izquierda: cliente + producto ── */}
            <div className="col-span-2 space-y-3">
              <div className="p-4 rounded-xl" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
                <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mb-2">Cliente seleccionado</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-black dark:text-white text-slate-900 shrink-0"
                       style={{ background: 'rgba(225,20,40,0.18)', border: '1px solid rgba(225,20,40,0.3)' }}>
                    {vnCliente.nombre?.charAt(0)?.toUpperCase() ?? '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold dark:text-white/90 text-slate-900/90 truncate">{vnCliente.nombre}</p>
                    <p className="text-[11px] dark:text-white/50 text-slate-900/50 truncate">{vnCliente.correo}</p>
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-xl" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #E4E7EC' }}>
                <p className="text-[10px] dark:text-white/30 text-slate-900/30 uppercase tracking-widest font-bold mb-2">Producto</p>
                <p className="text-[13px] font-bold dark:text-white/85 text-slate-900/85">{vnTarget.nombre}</p>
                <p className="text-[11px] dark:text-white/40 text-slate-900/40 mt-1">PVP: {fmtMoney(vnTarget.pvp)} · Stock: {vnTarget.stock} u.</p>
              </div>
              {vnCliente.correo && (
                <div className="flex items-start gap-2 px-3 py-3 rounded-xl"
                     style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)' }}>
                  <Mail size={12} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-[11px] text-emerald-400/80 leading-relaxed">
                    Comprobante enviado automáticamente a <strong>{vnCliente.correo}</strong>
                  </span>
                </div>
              )}
            </div>

            {/* ── Derecha: cantidad + total ── */}
            <div className="col-span-3 flex flex-col justify-center space-y-5">
              <div>
                <label className="text-xs font-semibold dark:text-white/50 text-slate-900/50 uppercase tracking-wider block mb-3">Cantidad a vender</label>
                <div className="flex items-center gap-3">
                  <button onClick={() => setVnQty(q => String(Math.max(1, parseInt(q || '1', 10) - 1)))} className="icon-btn w-10 h-10"><Minus size={16} /></button>
                  <input
                    type="number" min={1} max={vnTarget.stock} value={vnQty}
                    onChange={e => setVnQty(e.target.value)}
                    className="gm-input-d text-center text-lg font-bold" style={{ width: 100 }}
                  />
                  <button onClick={() => setVnQty(q => String(Math.min(vnTarget.stock, parseInt(q || '1', 10) + 1)))} className="icon-btn w-10 h-10"><Plus size={16} /></button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold dark:text-white/50 text-slate-900/50 uppercase tracking-wider block">Agregar otro producto</label>
                <select className="gm-select-d w-full" defaultValue="" onChange={e => { addExtra(Number(e.target.value), setVnExtras, vnTarget.id_producto); e.currentTarget.value = ''; }}>
                  <option value="">Seleccionar producto...</option>
                  {productos.filter(p => p.id_producto !== vnTarget.id_producto && p.stock > 0).map(p => (
                    <option key={p.id_producto} value={p.id_producto}>{p.nombre} - {p.stock} u. - {fmtMoney(p.pvp)}</option>
                  ))}
                </select>
                {vnExtras.map((it, index) => (
                  <div key={it.producto.id_producto} className="flex items-center gap-2">
                    <span className="flex-1 text-[12px] dark:text-white/70 text-slate-900/70 truncate">{it.producto.nombre}</span>
                    <input className="gm-input-d text-center" style={{ width: 74 }} type="number" min={1} max={it.producto.stock} value={it.cantidad}
                      onChange={e => setVnExtras(prev => prev.map((x, i) => i === index ? { ...x, cantidad: Number(e.target.value) } : x))} />
                    <button className="icon-btn danger" onClick={() => setVnExtras(prev => prev.filter((_, i) => i !== index))}><Trash2 size={12} /></button>
                  </div>
                ))}
              </div>
              <div className="p-5 rounded-2xl" style={{ background: 'linear-gradient(135deg,rgba(225,20,40,0.15),rgba(185,28,28,0.1))', border: '1px solid rgba(225,20,40,0.3)' }}>
                <p className="text-[11px] dark:text-white/40 text-slate-900/40 uppercase tracking-widest mb-1">Total de la venta</p>
                <p className="text-[36px] font-black dark:text-white text-slate-900 leading-none">
                  {fmtMoney(totalItems(mergeVentaItems(vnTarget, parseInt(vnQty || '0', 10), vnExtras)))}
                </p>
                <p className="text-[12px] dark:text-white/35 text-slate-900/35 mt-1">
                  {vnQty} u. × {fmtMoney(vnTarget.pvp)}
                </p>
              </div>
            </div>

          </div>
        )}
      </Modal>

      {/* ─── Modal Añadir Stock (Custom sin window.prompt) ─── */}
      <Modal
        open={addStockOpen}
        onClose={() => setAddStockOpen(false)}
        title="➕ Añadir Stock a este lote"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddStockOpen(false)}>Cancelar</Button>
            <Button onClick={() => {
              const currentStock = Number(getValues('stock') || 0);
              setValue('stock', currentStock + Number(addStockVals.cant));
              setValue('costo', Number(addStockVals.costo));
              setValue('pvp', Number(addStockVals.pvp));
              toast.success(`Se sumaron +${addStockVals.cant} al stock. ¡No olvides darle a Guardar cambios!`);
              setAddStockOpen(false);
            }}>
              Confirmar adición
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium dark:text-white/70 text-slate-900/70 block mb-1.5">Cantidad a añadir</label>
            <input 
              type="number" min={1} 
              className="gm-input-d w-full" 
              value={addStockVals.cant} 
              onChange={e => setAddStockVals(v => ({ ...v, cant: parseInt(e.target.value || '0', 10) }))} 
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium dark:text-white/70 text-slate-900/70 block mb-1.5">Nuevo Costo ($)</label>
              <input 
                type="number" step="0.01"
                className="gm-input-d w-full" 
                value={addStockVals.costo} 
                onChange={e => setAddStockVals(v => ({ ...v, costo: parseFloat(e.target.value || '0') }))} 
              />
            </div>
            <div>
              <label className="text-sm font-medium dark:text-white/70 text-slate-900/70 block mb-1.5">Nuevo PVP ($)</label>
              <input 
                type="number" step="0.01"
                className="gm-input-d w-full" 
                value={addStockVals.pvp} 
                onChange={e => setAddStockVals(v => ({ ...v, pvp: parseFloat(e.target.value || '0') }))} 
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium dark:text-white/70 text-slate-900/70 block mb-1.5">Proveedor</label>
            <div className="flex gap-2">
              <select className="gm-input-d flex-1" value={addStockVals.id_proveedor || ''} onChange={e => setAddStockVals(v => ({ ...v, id_proveedor: e.target.value }))}>
                <option value="">Seleccionar proveedor...</option>
                {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
              <Button variant="secondary" onClick={() => setProvModalOpen(true)}>+</Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* ══ MODAL CREAR PROVEEDOR RÁPIDO ══ */}
      <Modal
        open={provModalOpen}
        onClose={() => setProvModalOpen(false)}
        title="Crear Proveedor"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setProvModalOpen(false)}>Cancelar</Button>
            <Button onClick={saveProveedor} loading={savingProv}>Guardar</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input 
            label="Código (Único)" 
            placeholder="Ej. IMMER, MOTUL" 
            value={newProvCodigo} 
            onChange={e => setNewProvCodigo(e.target.value.toUpperCase())} 
          />
          <Input 
            label="Nombre" 
            placeholder="Distribuidora XYZ" 
            value={newProvNombre} 
            onChange={e => setNewProvNombre(e.target.value)} 
          />
        </div>
      </Modal>

    </div>
  );
}
