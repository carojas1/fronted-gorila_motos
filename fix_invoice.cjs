
const fs = require("fs");
let code = fs.readFileSync("src/pages/invoice/InvoicePage.tsx", "utf8");

// We need to replace the table body from <tbody> down to </tbody>
// The user wants a single list of items, no Mano de obra / Repuestos / Descuento headers.

const tbodyRegex = /<tbody>([\s\S]*?)<\/tbody>/;
const newTbody = `<tbody>
              {!hayDetalles && (
                <tr style={{ borderBottom: "1px solid #F0F1F3" }}>
                  <td style={{ width: 4, background: "#0C0C10", padding: 0 }} />
                  <td className="px-3 py-3.5 text-sm text-gray-600">1</td>
                  <td className="px-3 py-3.5">
                    <p className="text-sm font-bold text-gray-800">{reg.tipo_servicio || "Servicio"}</p>
                    {reg.descripcion && (
                      <p className="text-xs text-gray-500 mt-0.5 font-normal leading-relaxed">{reg.descripcion}</p>
                    )}
                  </td>
                  <td className="px-3 py-3.5 text-sm text-gray-600 text-right">{fmtMoney(reg.costo_total || 0)}</td>
                  <td className="px-3 py-3.5 text-sm font-black text-gray-900 text-right">{fmtMoney(reg.costo_total || 0)}</td>
                </tr>
              )}
              {detalles.map((d, i) => {
                const kind = detalleKind(d);
                const isDesc = kind === "descuento";
                return (
                  <tr key={i} style={{ borderBottom: "1px solid #F0F1F3", background: i % 2 === 0 ? "#FFFCFC" : "#FFFFFF" }}>
                    <td style={{ width: 4, background: isDesc ? "#10B981" : "#0C0C10", padding: 0 }} />
                    <td className="px-3 py-3 text-sm text-gray-500 font-mono text-center">{d.cantidad ?? 1}</td>
                    <td className="px-3 py-3">
                      <p className="text-sm font-bold text-gray-800">{cleanDescripcion(d.descripcion) || "Detalle"}</p>
                      {isDesc && <p className="text-[10px] text-emerald-500 mt-0.5 font-semibold">Descuento por puntos</p>}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-500 text-right">{fmtMoney(Number(d.precioUnitario ?? 0))}</td>
                    <td className={\`px-3 py-3 text-sm font-black text-right \${isDesc ? "text-emerald-700" : "text-gray-800"}\`}>{fmtMoney(Number(d.subtotal ?? 0))}</td>
                  </tr>
                );
              })}
            </tbody>`;

code = code.replace(tbodyRegex, newTbody);

// Now remove the "Mano de Obra" and "Repuestos" total boxes at the bottom.
const boxesRegex = /\{hayDetalles && \([\s\S]*?<div className="flex justify-between items-center py-2 px-3 rounded-lg"[\s\S]*?<\/div>\s*<\/div>\s*\)\}/;
code = code.replace(boxesRegex, "");

// Remove the warranty text
const warrantyRegex = /<div className="mt-3 p-2\.5 rounded-lg"[\s\S]*?<\/p>\s*<\/div>/;
code = code.replace(warrantyRegex, "");

fs.writeFileSync("src/pages/invoice/InvoicePage.tsx", code);
console.log("InvoicePage modified");

