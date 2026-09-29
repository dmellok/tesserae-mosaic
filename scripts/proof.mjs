// Proofs Mosaic: every specimen in every look at the panel sizes that exist, in colour and on a
// one-bit panel, with and without data. One contact sheet per look and specimen, and a report of
// script errors and of anything off the panel or cut short.
//
//   node scripts/proof.mjs [look ...] [--spec today] [--out DIR]
//
// Fonts and icons come from a Tesserae public/ directory (TESSERAE_PUBLIC, default
// ../tesserae-cloud/public). Needs Chrome (CHROME_PATH to override).
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import puppeteer from "puppeteer-core";

const args = process.argv.slice(2);
const opt = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const LOOKS = ["bauhaus", "almanac", "signal", "pixel"];
const looks = args.filter((a) => LOOKS.includes(a));
const SPECS = ["today", "weather_board", "year_progress", "countdown", "headlines", "quote"];
const specs = opt("--spec") ? [opt("--spec")] : SPECS;
const OUT = resolve(opt("--out") || "/tmp/mosaic-proof");
const SIZES = [[800, 480], [480, 800], [1600, 1200], [400, 300], [296, 128]];

const ROOT = resolve(".");
const ASSETS = resolve(process.env.TESSERAE_PUBLIC || "../tesserae-cloud/public");
const MIME = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf", ".svg": "image/svg+xml", ".png": "image/png" };
const server = createServer((req, res) => {
  const url = decodeURIComponent((req.url || "/").split("?")[0]);
  // Fonts and icons are the host's: /assets/ for the page's own links, and /fonts/ and /icons/ for
  // the url()s inside faces.css and the icon stylesheets, which are written root-relative.
  const path = url.startsWith("/assets/") ? join(ASSETS, url.slice(8)) : /^\/(fonts|icons)\//.test(url) ? join(ASSETS, url.slice(1)) : join(ROOT, url);
  if (!existsSync(path) || statSync(path).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "Content-Type": MIME[extname(path)] || "application/octet-stream" });
  res.end(readFileSync(path));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;

const CHROME = [process.env.CHROME_PATH, "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/chromium"].find((p) => p && existsSync(p));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox", "--disable-gpu", "--font-render-hinting=none"] });
const tab = await browser.newPage();

const INSPECT = `(() => {
  const pg = document.getElementById("page"), R = pg.getBoundingClientRect(), out = [];
  const name = (el) => el.tagName.toLowerCase() + (typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\\s+/).join(".") : "");
  for (const el of pg.querySelectorAll("*")) {
    if (el.classList.contains("err")) continue;
    const r = el.getBoundingClientRect(); if (!r.width && !r.height) continue;
    const cs = getComputedStyle(el); if (cs.visibility === "hidden" || cs.display === "none") continue;
    if (r.right > R.right + 1 || r.bottom > R.bottom + 1 || r.left < R.left - 1 || r.top < R.top - 1) out.push("off the panel: " + name(el));
    // One-line fitted text is sized by its ink and nudged to centre it, so its line box may overhang
    // the box while the glyphs do not; only its width is checked.
    else if (el.matches('[data-fit]:not([data-fit="wrap"])') ? el.scrollWidth > el.clientWidth + 1 : ((el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1) && cs.overflow !== "visible" && !/\\d/.test(cs.webkitLineClamp || ""))) out.push("cut short: " + name(el) + (el.textContent ? " (" + el.textContent.trim().slice(0, 30) + ")" : ""));
  }
  return [...new Set(out)].slice(0, 8);
})()`;

let problems = 0;
for (const look of looks.length ? looks : LOOKS) {
  mkdirSync(join(OUT, look), { recursive: true });
  for (const spec of specs) {
    const cells = [], lines = [];
    for (const empty of [false, true]) for (const [w, h] of SIZES) for (const bits of [24, 1]) {
      await tab.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
      await tab.goto(`${ORIGIN}/reference/render.html?spec=${spec}&look=${look}&w=${w}&h=${h}${bits === 1 ? "&bits=1" : ""}${empty ? "&empty=1" : ""}`, { waitUntil: "load" });
      await tab.waitForFunction("window.__ready === true", { timeout: 15000 }).catch(() => undefined);
      const errors = await tab.evaluate("window.__errors || []");
      const issues = await tab.evaluate(INSPECT);
      const file = `${spec}-${w}x${h}-${bits}${empty ? "-empty" : ""}.png`;
      await (await tab.$("#page")).screenshot({ path: join(OUT, look, file) });
      cells.push(`<figure><img src="${file}" style="width:${Math.round(w * (w > 900 ? 0.36 : 0.56))}px"><figcaption>${w}×${h} ${bits === 1 ? "one-bit" : "colour"}${empty ? " · no data" : ""}${errors.length || issues.length ? " ⚠" : ""}</figcaption></figure>`);
      for (const e of errors) lines.push(`  ${w}x${h} ${bits}-bit${empty ? " empty" : ""}: script error: ${e}`);
      for (const i of issues) lines.push(`  ${w}x${h} ${bits}-bit${empty ? " empty" : ""}: ${i}`);
    }
    problems += lines.length;
    const sheet = join(OUT, look, `${spec}.html`);
    writeFileSync(sheet, `<html><body style="margin:0;padding:14px;background:#2a2b2a;font:11px sans-serif;color:#ccc"><h3 style="margin:0 0 8px;color:#fff">${look} · ${spec}</h3><div style="display:flex;flex-wrap:wrap;gap:12px;align-items:flex-start">${cells.join("")}</div></body></html>`);
    await tab.setViewport({ width: 1500, height: 900, deviceScaleFactor: 1 });
    await tab.goto(`file://${sheet}`, { waitUntil: "load" });
    await tab.screenshot({ path: join(OUT, look, `${spec}.png`), fullPage: true });
    console.log(`${look} ${spec}: ${lines.length ? `${lines.length} problem(s)\n${lines.join("\n")}` : "clean"} -> ${join(OUT, look, `${spec}.png`)}`);
  }
}
await browser.close();
server.close();
process.exit(problems ? 2 : 0);
