
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
      
      let modified = content;
      // Replace text-white/XX
      modified = modified.replace(/text-white\/(\d+)/g, "dark:text-white/$1 text-slate-900/$1");
      // Replace text-white (but ignore text-white/XX)
      modified = modified.replace(/text-white(?!\/)/g, "dark:text-white text-slate-900");
      
      // Basic heuristic to revert inside buttons
      // If a line contains "button" or "btn-red" or "Button", we revert back to text-white
      let lines = modified.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes("button") || lines[i].includes("btn-red") || lines[i].includes("bg-") || lines[i].includes("background:")) {
          // Revert on this line
          lines[i] = lines[i].replace(/dark:text-white\/(\d+) text-slate-900\/\1/g, "text-white/$1");
          lines[i] = lines[i].replace(/dark:text-white text-slate-900/g, "text-white");
        }
      }
      modified = lines.join("\n");

      if (modified !== content) {
        fs.writeFileSync(fullPath, modified, "utf8");
        console.log("Updated", fullPath);
      }
    }
  }
}

processDir("src/pages");
processDir("src/components");

