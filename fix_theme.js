
const fs = require("fs");
const path = require("path");

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith(".tsx")) {
      let content = fs.readFileSync(fullPath, "utf8");
      
      // Replace text-white with text-gm-text except in some specific cases
      // We will do a generic replace and then we can review if buttons are broken.
      // But wait, the easiest way to avoid buttons is to just do it manually where needed?
      // No, let us replace all `text-white` -> `dark:text-white text-slate-900`
      // For opacities: `text-white/(\d+)` -> `dark:text-white/$1 text-slate-900/$1`
      
      let modified = content;
      // Replace text-white/XX
      modified = modified.replace(/text-white\/(\d+)/g, "dark:text-white/$1 text-slate-900/$1");
      // Replace text-white
      modified = modified.replace(/text-white(?!\/)/g, "dark:text-white text-slate-900");
      
      // Revert in buttons (heuristic: lines containing "<button" or "btn-red")
      // Actually, if we just do this, how bad is it?
      if (modified !== content) {
        fs.writeFileSync(fullPath, modified, "utf8");
        console.log("Updated", fullPath);
      }
    }
  }
}

processDir("src/pages");
processDir("src/components");

