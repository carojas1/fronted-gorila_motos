
const fs = require("fs");
const path = require("path");

let css = fs.readFileSync("src/index.css", "utf8");

css = css.replace(/\.gm-card-d \{([\s\S]*?)\}/, `.gm-card-d {
  background: var(--card-bg, #FFFFFF);
  border: 1px solid var(--card-border, #E4E7EC);
  transition: border-color 200ms ease, box-shadow 200ms ease, transform 200ms ease, background-color 200ms ease;
  position: relative;
}
.dark .gm-card-d {
  background: linear-gradient(150deg, #17171E 0%, #131318 50%, #111115 100%);
  border: 1px solid rgba(255,255,255,0.055);
}
`);

css = css.replace(/\.gm-card-d::before \{([\s\S]*?)\}/, `.gm-card-d::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(135deg, rgba(255,255,255,0.025) 0%, transparent 60%);
  pointer-events: none;
  opacity: 0;
}
.dark .gm-card-d::before {
  opacity: 1;
}
`);

css = css.replace(/\.gm-input-d \{([\s\S]*?)\}/, `.gm-input-d {
  background: rgba(0,0,0,0.03);
  border: 1px solid #E4E7EC;
  color: #15151B;
  border-radius: 12px;
  padding-top: 0;
  padding-bottom: 0;
  padding-right: 14px;
  height: 44px;
  font-size: 14px;
  width: 100%;
  transition: border-color 150ms ease, box-shadow 150ms ease;
}
.dark .gm-input-d {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  color: #F0EEE8;
}
`);

css = css.replace(/\.gm-select-d \{([\s\S]*?)\}/, `.gm-select-d {
  background: rgba(0,0,0,0.03);
  border: 1px solid #E4E7EC;
  color: #15151B;
  border-radius: 12px;
  height: 44px;
  padding: 0 14px;
  font-size: 14px;
  width: 100%;
  appearance: none;
  outline: none;
}
.dark .gm-select-d {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  color: #F0EEE8;
}
`);

css = css.replace(/\.gm-table-d \{([\s\S]*?)\}/, `.gm-table-d {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}
.gm-table-d th {
  background: rgba(0,0,0,0.02);
  color: rgba(21,21,27,0.6);
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid #E4E7EC;
}
.dark .gm-table-d th {
  background: rgba(255,255,255,0.02);
  color: rgba(255,255,255,0.4);
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.gm-table-d td {
  padding: 14px 16px;
  border-bottom: 1px solid #E4E7EC;
  color: #15151B;
}
.dark .gm-table-d td {
  border-bottom: 1px solid rgba(255,255,255,0.03);
  color: #EBEBEB;
}
`);

css = css.replace(/\.skeleton-d \{([\s\S]*?)\}/, `.skeleton-d {
  background: linear-gradient(90deg, #E8E5DE 25%, #F2EFEA 50%, #E8E5DE 75%);
  background-size: 200% 100%;
  animation: shimmer 1.6s linear infinite;
}
.dark .skeleton-d {
  background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%);
}
`);

fs.writeFileSync("src/index.css", css, "utf8");
console.log("Updated index.css");

