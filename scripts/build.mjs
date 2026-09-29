// Builds dist/: mosaic.css (the core and every look, in that order) and mosaic.js, each with a
// version banner. No bundler: the sources are already what ships.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
const { version } = JSON.parse(readFileSync("package.json", "utf8"));
const banner = `/*! Mosaic ${version} | MIT | https://github.com/dmellok/tesserae-mosaic */\n`;
const LOOKS = ["bauhaus", "almanac", "signal", "pixel", "os7"];
mkdirSync("dist", { recursive: true });
const css = [readFileSync("src/core.css", "utf8"), ...LOOKS.map((l) => readFileSync(`src/looks/${l}.css`, "utf8"))].join("\n");
writeFileSync("dist/mosaic.css", banner + css);
// The core and each look on their own too, so a host can send a page only the look it uses.
writeFileSync("dist/core.css", banner + readFileSync("src/core.css", "utf8"));
mkdirSync("dist/looks", { recursive: true });
for (const l of LOOKS) writeFileSync(`dist/looks/${l}.css`, banner + readFileSync(`src/looks/${l}.css`, "utf8"));
// Which Phosphor weights each look draws its icons in (none for the looks with pixel icons), so a
// host that loads icon weights by need knows what a Mosaic page needs.
const meta = { version, looks: Object.fromEntries(LOOKS.map((l) => {
  const src = readFileSync(`src/looks/${l}.css`, "utf8");
  const pixel = /--m-icons:\s*pixel/.test(src);
  const w = (/--m-icon-weight:\s*([a-z]+)/.exec(src) || [])[1] || "bold";
  return [l, { icons: pixel ? [] : [w] }];
})) };
writeFileSync("dist/mosaic.json", JSON.stringify(meta, null, 2));
writeFileSync("dist/mosaic.js", banner + readFileSync("src/mosaic.js", "utf8").replace('version: "0.1.0"', `version: "${version}"`));
console.log(`dist/mosaic.css ${Math.round(css.length / 1024)} KB, dist/mosaic.js`);
