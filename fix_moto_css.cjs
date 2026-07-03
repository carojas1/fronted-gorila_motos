
const fs = require("fs");
let css = fs.readFileSync("src/index.css", "utf8");

css = css.replace(/\.moto-name \{([\s\S]*?)\}/, `.moto-name {
  font-size: 1.1rem;
  font-weight: 800;
  color: rgba(21,21,27,0.92);
  letter-spacing: -0.01em;
  line-height: 1.25;
}
.dark .moto-name {
  color: rgba(255,255,255,0.92);
}`);

css = css.replace(/\.moto-modelo \{([\s\S]*?)\}/, `.moto-modelo {
  color: rgba(21,21,27,0.55);
  font-weight: 600;
}
.dark .moto-modelo {
  color: rgba(255,255,255,0.55);
}`);

css = css.replace(/\.moto-stats \{([\s\S]*?)\}/, `.moto-stats {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 0;
  padding: 12px 16px;
  border-top: 1px solid rgba(0,0,0,0.05);
  border-bottom: 1px solid rgba(0,0,0,0.05);
  background: rgba(0,0,0,0.02);
}
.dark .moto-stats {
  border-top: 1px solid rgba(255,255,255,0.05);
  border-bottom: 1px solid rgba(255,255,255,0.05);
  background: rgba(0,0,0,0.15);
}`);

css = css.replace(/\.moto-stat-val \{([\s\S]*?)\}/, `.moto-stat-val {
  font-size: 12px;
  font-weight: 700;
  color: rgba(21,21,27,0.82);
  line-height: 1.2;
  white-space: nowrap;
}
.dark .moto-stat-val {
  color: rgba(255,255,255,0.82);
}`);

css = css.replace(/\.moto-stat-lbl \{([\s\S]*?)\}/, `.moto-stat-lbl {
  font-size: 9.5px;
  color: rgba(21,21,27,0.48);
  font-weight: 500;
  letter-spacing: 0.02em;
  white-space: nowrap;
}
.dark .moto-stat-lbl {
  color: rgba(255,255,255,0.28);
}`);

css = css.replace(/\.moto-stat-divider \{([\s\S]*?)\}/, `.moto-stat-divider {
  width: 1px;
  height: 28px;
  background: rgba(0,0,0,0.06);
  flex-shrink: 0;
  margin: 0 8px;
}
.dark .moto-stat-divider {
  background: rgba(255,255,255,0.06);
}`);

fs.writeFileSync("src/index.css", css);
console.log("Moto CSS fixed");

