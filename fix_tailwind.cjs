
const fs = require("fs");
let config = fs.readFileSync("tailwind.config.js", "utf8");

// Generate all opacities from 1 to 99
let opacities = {};
for (let i = 1; i <= 99; i++) {
  opacities[i.toString()] = (i / 100).toString();
}

// Add opacity to theme.extend
if (!config.includes("opacity: {")) {
  config = config.replace("colors: {", `opacity: ${JSON.stringify(opacities, null, 8)},\n      colors: {`);
  fs.writeFileSync("tailwind.config.js", config);
  console.log("Tailwind config updated with opacities");
} else {
  console.log("Opacity already exists in config");
}

