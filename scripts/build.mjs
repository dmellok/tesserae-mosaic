// Builds dist/: mosaic.css (the core and every look, in that order) and mosaic.js, each with a
// version banner. No bundler: the sources are already what ships.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
const { version } = JSON.parse(readFileSync("package.json", "utf8"));
const banner = `/*! Mosaic ${version} | MIT | https://github.com/dmellok/tesserae-mosaic */\n`;
const LOOKS = ["bauhaus", "almanac", "signal", "pixel", "os7"];
mkdirSync("dist", { recursive: true });
const css = [readFileSync("src/core.css", "utf8"), ...LOOKS.map((l) => readFileSync(`src/looks/${l}.css`, "utf8"))].join("\n");
writeFileSync("dist/mosaic.css", banner + css);
writeFileSync("dist/mosaic.js", banner + readFileSync("src/mosaic.js", "utf8").replace('version: "0.1.0"', `version: "${version}"`));
console.log(`dist/mosaic.css ${Math.round(css.length / 1024)} KB, dist/mosaic.js`);
