const fs = require('fs');
const path = 'src/pages/inventory/InventoryPage.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1
content = content.replace(
  'import { fmtMoney, getErrorMsg, nextProductCode } from \'../../lib/utils\';',
  'import { fmtMoney, getErrorMsg, nextProductCode } from \'../../lib/utils\';\nimport { comprimirImagen } from \'../../lib/fotos\';'
);

// 2
content = content.replace(
  'const [saving, setSaving] = useState(false);',
  'const [saving, setSaving] = useState(false);\n  const [imageFile, setImageFile] = useState<File | null>(null);\n  const [previewUrl, setPreviewUrl] = useState<string | null>(null);'
);

// 3
content = content.replace(
  '  const openCreate = () => {\n    setEditTarget(null);',
  '  const openCreate = () => {\n    setEditTarget(null);\n    setImageFile(null);\n    setPreviewUrl(null);'
);

// 4
content = content.replace(
  '  const openEdit = (p: Producto) => {\n    setEditTarget(p);',
  '  const openEdit = (p: Producto) => {\n    setEditTarget(p);\n    setImageFile(null);\n    setPreviewUrl(p.ruta_imagenproductos || null);'
);

// 5
content = content.replace(
  '  const onSubmit = async (data: Form) => {\n    setSaving(true);\n    try {\n      if (editTarget) {\n        await productosApi.update(editTarget.id_producto, data);',
  '  const onSubmit = async (data: Form) => {\n    setSaving(true);\n    try {\n      let fotoBase64 = undefined;\n      if (imageFile) {\n        try { fotoBase64 = await comprimirImagen(imageFile); } catch { /* ignore */ }\n      }\n      const payload = fotoBase64 ? { ...data, ruta_imagenproductos: fotoBase64 } : data;\n\n      if (editTarget) {\n        await productosApi.update(editTarget.id_producto, payload);'
);

// 6
content = content.replace(
  '      } else {\n        await productosApi.create(data);',
  '      } else {\n        await productosApi.create(payload);'
);

// 7
content = content.replace(
  '            <div>\n              <label className="text-sm font-medium text-white/70 block mb-1.5">Categor\u00EDa</label>',
  '            <div>\n              <label className="text-sm font-medium text-white/70 block mb-1.5">Foto del producto (opcional)</label>\n              <input type="file" accept="image/*" onChange={(e) => {\n                const file = e.target.files?.[0];\n                if (file) {\n                  setImageFile(file);\n                  setPreviewUrl(URL.createObjectURL(file));\n                }\n              }} className="gm-input-d w-full mb-2" />\n              {previewUrl && <img src={previewUrl} alt="Preview" className="h-20 rounded object-cover" />}\n            </div>\n            <div>\n              <label className="text-sm font-medium text-white/70 block mb-1.5">Categor\u00EDa</label>'
);

fs.writeFileSync(path, content, 'utf8');
console.log('Done');
