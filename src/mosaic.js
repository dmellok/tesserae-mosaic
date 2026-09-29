/*
 * Mosaic: the script half of the design system. A classic script that defines window.Mosaic, so a
 * page loads it with a plain <script src> and its own code (a module or not) calls Mosaic.x.
 *
 *   await Mosaic.ready();               // fonts loaded, one-bit detected, [data-fit] boxes fitted
 *   Mosaic.clock(el);                   // the time, with a small am/pm where the locale has one
 *   Mosaic.bars(el, [{value, label, tick}], { now: 0 });
 *   Mosaic.list(el, ["Headline", ...], { numbered: true });
 *
 * Nothing here fetches or stores anything; it only draws into elements the page already has.
 */
(function (global) {
  "use strict";
  const M = { version: "0.1.0" };

  const roots = (root) => (root ? [root.closest(".m") || root] : [...document.querySelectorAll(".m")]);
  const rootOf = (el) => (el && el.closest && el.closest(".m")) || document.querySelector(".m") || document.documentElement;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  M.esc = esc;

  // ---------- fitting

  /**
   * Grow or shrink an element's font until its text fills the element's content box without
   * overflowing it. Measures the text itself (a Range over its contents) rather than the line box,
   * so a tight line-height does not read as overflow. Returns the size chosen, in px.
   */
  M.fit = function fit(el, opts) {
    if (!el) return 0;
    const o = opts || {};
    const cs = getComputedStyle(el);
    const w = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const h = el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    if (w <= 0 || h <= 0) return 0;
    const min = o.min != null ? o.min : 10;
    // A look may stack a fitted element's parts (hour over minutes); that is lines, not one line.
    const stacked = [...el.querySelectorAll("*")].some((c) => getComputedStyle(c).display === "block");
    if (el.dataset.fit === "wrap" || o.wrap || stacked) { el.style.lineHeight = ""; el.style.removeProperty("--m-fit-shift"); return fitLines(el, w, h, min, o.max); }
    return fitInk(el, w, h, min, o.max);
  };

  /**
   * Text that wraps: the largest size at which its lines fit the box. Measured by scroll size,
   * which is what wrapping and clipping obey.
   */
  function fitLines(el, w, h, min, maxOpt) {
    const max = maxOpt != null ? maxOpt : Math.max(min, h * 1.4);
    const fits = () => el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= el.clientHeight + 1;
    return search(el, min, max, fits);
  }

  /**
   * One line of text, sized by its ink. A font's line box can be twice the height of its
   * numerals (Jost's is about 1.45em against 0.72em digits), so sizing by the line box leaves a
   * number at half its room. This measures the glyphs' own extent with canvas text metrics, sets
   * the line box to exactly the box, and nudges the text so the ink sits centred in it.
   */
  function fitInk(el, w, h, min, maxOpt) {
    // Bare text is wrapped so it can be nudged; a clock's spans are nudged as they are.
    if ([...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) el.innerHTML = '<span class="m-fit">' + el.innerHTML + "</span>";
    const main = el.querySelector(".m-clock__time") || el.firstElementChild || el;
    const k = inkOf(main);
    const max = maxOpt != null ? maxOpt : Math.max(min, h / Math.max(0.2, k.a + k.d));
    el.style.lineHeight = h + "px";
    const range = document.createRange();
    range.selectNodeContents(el);
    const fits = () => range.getBoundingClientRect().width <= w + 0.5 && el.scrollWidth <= el.clientWidth + 1;
    const size = search(el, min, max, fits);
    // Where the baseline is with this line box, against where it would centre the ink.
    el.style.setProperty("--m-fit-shift", (size * ((k.a - k.d) - (k.A - k.D)) / 2).toFixed(2) + "px");
    return size;
  }

  /** Ink and font extents of an element's text, per 1px of font size. */
  function inkOf(el) {
    const cs = getComputedStyle(el);
    const c = (M._canvas = M._canvas || document.createElement("canvas").getContext("2d"));
    c.font = cs.fontStyle + " " + cs.fontWeight + " 100px " + cs.fontFamily;
    const m = c.measureText(el.textContent || "0");
    const A = m.fontBoundingBoxAscent || m.actualBoundingBoxAscent, D = m.fontBoundingBoxDescent || m.actualBoundingBoxDescent;
    return { a: m.actualBoundingBoxAscent / 100, d: m.actualBoundingBoxDescent / 100, A: A / 100, D: D / 100 };
  }

  /** The largest font size in [min, max] at which fits() holds, set on el and returned. */
  function search(el, min, max, fits) {
    let lo = min, hi = max;
    el.style.fontSize = hi + "px";
    if (fits()) return hi;
    for (let i = 0; i < 18; i++) {
      const mid = (lo + hi) / 2;
      el.style.fontSize = mid + "px";
      if (fits()) lo = mid; else hi = mid;
    }
    const size = Math.floor(lo * 10) / 10;
    el.style.fontSize = size + "px";
    return size;
  }
  /** Fit every [data-fit] inside root. data-fit-min / data-fit-max bound the size. */
  M.fitAll = function fitAll(root) {
    for (const el of (root || document).querySelectorAll("[data-fit]")) {
      M.fit(el, { min: el.dataset.fitMin ? +el.dataset.fitMin : undefined, max: el.dataset.fitMax ? +el.dataset.fitMax : undefined });
    }
  };

  // ---------- one-bit panels

  /** 1 when the theme prints the red role as ink (a one-bit panel's mono theme), else 24. */
  M.bits = function bits(root) {
    const r = rootOf(root);
    const probe = (v) => {
      const s = document.createElement("span");
      s.style.color = "var(" + v + ")";
      r.appendChild(s);
      const c = getComputedStyle(s).color;
      s.remove();
      return c;
    };
    return probe("--m-red") === probe("--m-ink") && probe("--m-blue") === probe("--m-ink") ? 1 : 24;
  };

  /**
   * Everything a page does before it draws its big text: wait for the fonts (so fitting measures
   * the real glyphs), mark one-bit roots, then fit [data-fit] and trim lists.
   */
  M.ready = async function ready(root) {
    // A face only starts loading once something is set in it, so text drawn after this (a list
    // filled later) would be measured in the fallback. Ask for every face the look names first.
    const faces = new Set();
    for (const r of roots(root)) {
      const cs = getComputedStyle(r);
      for (const k of ["text", "display", "num", "label"]) {
        const fam = cs.getPropertyValue("--m-font-" + k).trim(), w = cs.getPropertyValue("--m-w-" + k).trim() || "400";
        if (fam) faces.add(w + " 16px " + fam);
      }
    }
    if (document.fonts && document.fonts.load) await Promise.all([...faces].map((f) => document.fonts.load(f).catch(() => undefined)));
    if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) { /* draw anyway */ } }
    for (const r of roots(root)) {
      r.dataset.bits = String(M.bits(r));
      M.fitAll(r);
      for (const l of r.querySelectorAll(".m-list")) M.trim(l);
    }
  };

  // ---------- time

  const fmt = (o) => o || {};
  /** "11:52" and "pm" (or "23:52" and "" in a 24-hour locale), in the page's zone. */
  M.timeParts = function timeParts(date, opts) {
    const o = fmt(opts);
    const parts = new Intl.DateTimeFormat(o.locale || undefined, { hour: "numeric", minute: "2-digit", timeZone: o.tz || undefined }).formatToParts(date || new Date());
    let time = "", period = "";
    for (const p of parts) {
      if (p.type === "dayPeriod") period = p.value;
      else if (!(p.type === "literal" && /^\s+$/.test(p.value) && time)) time += p.value;
    }
    return { time: time.trim(), period: period.trim() };
  };
  /** Fill a .m-clock with the time and its period, then fit it if it asks to be fitted. */
  M.clock = function clock(el, opts) {
    const t = M.timeParts(fmt(opts).date, opts);
    // Hour, separator and minutes in their own spans, so a look can stack them (hour over minutes).
    const hm = /^(\d{1,2})(\D+)(\d{2})$/.exec(t.time);
    const time = hm ? '<span class="m-clock__h">' + esc(hm[1]) + '</span><span class="m-clock__sep">' + esc(hm[2]) + '</span><span class="m-clock__m">' + esc(hm[3]) + "</span>" : esc(t.time);
    el.innerHTML = '<span class="m-clock__time">' + time + "</span>" + (t.period ? '<span class="m-clock__period">' + esc(t.period) + "</span>" : "");
    return t;
  };
  /**
   * A date said one of a few ways: "weekday" (Tuesday), "day" (29), "month" (September),
   * "long" (Tuesday 29 September), "short" (Tue 29 Sep), "numeric" (29.09.26), "year" (2026).
   */
  M.date = function date(d, style, opts) {
    const o = fmt(opts);
    const tz = o.tz || undefined, L = o.locale || undefined;
    const f = (x) => new Intl.DateTimeFormat(L, Object.assign({ timeZone: tz }, x)).format(d || new Date());
    switch (style) {
      case "weekday": return f({ weekday: "long" });
      case "day": return f({ day: "numeric" });
      case "month": return f({ month: "long" });
      case "year": return f({ year: "numeric" });
      case "short": return f({ weekday: "short", day: "numeric", month: "short" });
      case "numeric": return f({ day: "2-digit", month: "2-digit", year: "2-digit" });
      default: return f({ weekday: "long", day: "numeric", month: "long" });
    }
  };

  // ---------- data

  /**
   * Bars, one per item: { value, label (above), tick (below) }. Heights run from floor to the
   * largest value, so small differences still show. opts.now marks one bar as the current one.
   */
  M.bars = function bars(el, items, opts) {
    const o = fmt(opts);
    const vals = items.map((i) => +i.value).filter((v) => isFinite(v));
    const lo = o.min != null ? o.min : Math.min.apply(null, vals), hi = o.max != null ? o.max : Math.max.apply(null, vals);
    const span = Math.max(hi - lo, 1e-9);
    const floor = o.floor != null ? o.floor : 0.18;
    el.classList.add("m-bars");
    el.innerHTML = items.map((it, i) => {
      const v = floor + (1 - floor) * ((+it.value - lo) / span);
      return '<div class="m-bars__col' + (i === o.now ? " m-bars__col--now" : "") + '" style="--v:' + v.toFixed(3) + '">' +
        (it.label != null ? '<span class="m-bars__val">' + esc(it.label) + "</span>" : "") +
        '<div class="m-bars__plot"><div class="m-bars__bar" style="--v:' + v.toFixed(3) + '"></div></div>' +
        (it.tick != null ? '<span class="m-bars__tick">' + esc(it.tick) + "</span>" : "") + "</div>";
    }).join("");
  };

  /** A line through values, filling the box; opts.now marks one point. */
  M.spark = function spark(el, values, opts) {
    const o = fmt(opts);
    const w = 100, h = 40, lo = Math.min.apply(null, values), hi = Math.max.apply(null, values), span = Math.max(hi - lo, 1e-9);
    const pts = values.map((v, i) => [values.length > 1 ? (i / (values.length - 1)) * w : w / 2, h - 3 - ((v - lo) / span) * (h - 6)]);
    const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(2) + " " + p[1].toFixed(2)).join(" ");
    // The marker is an element over the stretched line, so it keeps its shape and a look can square it.
    const now = o.now != null && pts[o.now] ? '<i class="m-spark__now" style="left:' + (pts[o.now][0] / w * 100).toFixed(2) + "%;top:" + (pts[o.now][1] / h * 100).toFixed(2) + '%"></i>' : "";
    el.classList.add("m-spark");
    el.innerHTML = '<svg viewBox="0 0 ' + w + " " + h + '" preserveAspectRatio="none"><path class="m-spark__line" d="' + d + '"/></svg>' + now;
  };

  /**
   * A grid of total marks, the first done of them filled and the one after marked as now, sized
   * so the grid fills the element: the largest mark that fits all of them.
   */
  M.dots = function dots(el, opts) {
    const o = fmt(opts);
    const total = o.total, done = o.done || 0;
    // The class goes on first, so a look's padding for .m-dots is in place before measuring, and
    // the grid is fitted to the content box, inside that padding.
    el.classList.add("m-dots");
    const cs = getComputedStyle(el);
    const W = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const H = el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    if (!total || !W || !H) return;
    const gapRatio = o.gap != null ? o.gap : 0.28;
    let best = { cols: 1, size: 0 };
    for (let cols = 1; cols <= total; cols++) {
      const rows = Math.ceil(total / cols);
      const size = Math.min(W / (cols + (cols - 1) * gapRatio), H / (rows + (rows - 1) * gapRatio));
      if (size > best.size) best = { cols, size };
    }
    const size = Math.max(1, Math.floor(best.size)), gap = Math.max(1, Math.floor(size * gapRatio));
    el.style.gridTemplateColumns = "repeat(" + best.cols + ", " + size + "px)";
    el.style.gap = gap + "px";
    let html = "";
    for (let i = 0; i < total; i++) html += '<i class="m-dots__dot' + (i < done ? " m-dots__dot--done" : i === done ? " m-dots__dot--now" : "") + '"></i>';
    el.innerHTML = html;
  };

  /** Rows of text, numbered or not, trimmed so that none is cut short. */
  M.list = function list(el, items, opts) {
    const o = fmt(opts);
    el.classList.add("m-list");
    el.innerHTML = items.map((t, i) => '<li class="m-list__item">' + (o.numbered === false ? "" : '<span class="m-list__n">' + (o.pad ? String(i + 1).padStart(2, "0") : i + 1) + "</span>") + '<span class="m-list__t">' + esc(t) + "</span></li>").join("");
    M.trim(el);
  };
  /** Drop rows from the end until the rest fit the list's box. */
  M.trim = function trim(el) {
    // Against the content box's bottom, so a look that pads or insets the list keeps its inset.
    const bottom = () => { const cs = getComputedStyle(el); return el.getBoundingClientRect().bottom - parseFloat(cs.paddingBottom) - parseFloat(cs.borderBottomWidth) + 0.5; };
    const rows = [...el.children];
    let dropped = 0;
    while (rows.length > 1 && rows[rows.length - 1].getBoundingClientRect().bottom > bottom()) { rows.pop().remove(); dropped++; }
    // How many did not fit, for a look that says "+3 more" (content: attr(data-more)).
    if (dropped) el.dataset.more = "+" + dropped + " more"; else delete el.dataset.more;
  };

  // ---------- icons

  /** Phosphor names for Open-Meteo weather codes. */
  M.weatherKind = function weatherKind(code, day) {
    const c = +code, d = day !== false;
    if (c === 0 || c === 1) return d ? "sun" : "moon";
    if (c === 2) return "part";
    if (c === 3) return "cloud";
    if (c === 45 || c === 48) return "fog";
    if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82)) return "rain";
    if ((c >= 71 && c <= 77) || c === 85 || c === 86) return "snow";
    if (c >= 95) return "storm";
    return "cloud";
  };
  const PHOSPHOR = { sun: "sun", moon: "moon", part: "cloud-sun", cloud: "cloud", fog: "cloud-fog", rain: "cloud-rain", snow: "cloud-snow", storm: "cloud-lightning", unknown: "question", calendar: "calendar-blank", clock: "clock", news: "newspaper", quote: "quotes", pin: "map-pin", sunrise: "sun-horizon", sunset: "moon-stars", up: "arrow-up", down: "arrow-down", thermometer: "thermometer" };
  /** Bitmaps for looks that draw their own icons: "#" is ink, "+" an ink checker, "." paper. */
  const PIXEL = {
    sun: [".......#........", ".......#........", "..#.........#...", "...#..###..#....", ".....#####......", "....#######.....", "...#########....", "##.#########.##.", "...#########....", "....#######.....", ".....#####......", "...#..###..#....", "..#.........#...", ".......#........", ".......#........"],
    moon: ["......###.......", "....###.........", "...###......#...", "..###......###..", "..###.......#...", ".####...........", ".####...........", ".#####..........", ".######.......#.", "..#######....##.", "..############..", "...##########...", ".....######....."],
    part: [".....#..........", ".#...#...#......", "..#.....#.......", "....###.........", "...#####........", "##.#####.##.....", "...#####........", "....###.........", "..#.....####....", ".#...#.#....#...", "....###......##.", "...#...........#", "...#...........#", "....###########."],
    cloud: [".......####.....", "......#++++#....", "...###++++++#...", "..#++++++++++##.", "..#++++++++++++#", ".#+++++++++++++#", "#++++++++++++++#", "#++++++++++++++#", ".##############."],
    fog: ["...##########...", "................", ".#####.#######..", "................", "..########.####.", "................", "....#########..."],
    rain: [".......####.....", "......#....#....", "...###......#...", "..#..........##.", "..#............#", ".#.............#", "#..............#", "#..............#", ".##############.", "................", "..#...#...#...#.", ".#...#...#...#..", "................", "...#...#...#....", "..#...#...#....."],
    snow: [".......####.....", "......#....#....", "...###......#...", "..#..........##.", "..#............#", ".#.............#", "#..............#", "#..............#", ".##############.", "................", "..#.....#.....#.", ".###...###...###", "..#.....#.....#.", "................", ".....#.....#...."],
    storm: [".......####.....", "......#....#....", "...###......#...", "..#..........##.", "..#............#", ".#.............#", "#..............#", "#..............#", ".##############.", ".......####.....", ".....#####......", "....######......", "......###.......", "......##........", "......#........."],
    unknown: [".......####.....", "......#....#....", "...###..##..#...", "..#....#..#..##.", "..#......#.....#", ".#......#......#", "#..............#", "#.......#......#", ".##############."],
    arrow: ["#...", "##..", "###.", "####", "###.", "##..", "#..."],
    calendar: ["..#......#..", "############", "#..........#", "############", "#..........#", "#.##.##.##.#", "#.##.##.##.#", "#..........#", "#.##.##....#", "#.##.##....#", "#..........#", "############"],
    news: ["##########..", "#........###", "#.######.#.#", "#.######.#.#", "#........#.#", "#.######.#.#", "#........#.#", "#.######.#.#", "#........#.#", "#.######.#.#", "#........#.#", "############"],
    quote: ["............", ".###...###..", "####..####..", "####..####..", ".###...###..", "..##....##..", ".##....##...", "##....##....", "............"],
    pin: ["...####...", "..#....#..", ".#..##..#.", ".#.#..#.#.", ".#..##..#.", "..#....#..", "..#....#..", "...#..#...", "...#..#...", "....##...."],
    clock: ["...######...", "..#......#..", ".#...#....#.", "#....#.....#", "#....#.....#", "#....####..#", "#..........#", "#..........#", ".#........#.", "..#......#..", "...######..."],
    sunrise: ["......#......", "..#...#...#..", "...#.....#...", ".....###.....", "....#####....", "##.#######.##", ".............", "#############", "..#########..", "....#####...."],
    sunset: ["....#####....", "..#########..", "#############", "......#......", ".....###.....", "....#####....", "##.#######.##", "...#.....#...", "..#...#...#..", "......#......"],
  };
  M.PIXEL = PIXEL;
  /** A bitmap as crisp inline SVG, one rect per ink cell. */
  M.pixel = function pixel(rows) {
    const w = rows[0].length, h = rows.length;
    let body = "";
    rows.forEach((r, y) => { for (let x = 0; x < w; x++) {
      if (r[x] === "#") body += '<rect x="' + x + '" y="' + y + '" width="1" height="1"/>';
      else if (r[x] === "+" && (x + y) % 2 === 0) body += '<rect x="' + x + '" y="' + y + '" width="1" height="1"/>';
    } });
    return '<svg viewBox="0 0 ' + w + " " + h + '" style="aspect-ratio:' + w + "/" + h + ';width:auto;height:1em" shape-rendering="crispEdges" fill="currentColor" aria-hidden="true">' + body + "</svg>";
  };
  /**
   * An icon by name: a Phosphor glyph, or a pixel bitmap when the look asks for pixel icons
   * (--m-icons: pixel) and has one by that name. el is any element inside the page's .m.
   */
  M.icon = function icon(name, el) {
    const style = getComputedStyle(rootOf(el)).getPropertyValue("--m-icons").trim();
    if (style === "pixel" && PIXEL[name]) return '<span class="m-icon">' + M.pixel(PIXEL[name]) + "</span>";
    const weight = getComputedStyle(rootOf(el)).getPropertyValue("--m-icon-weight").trim() || "bold";
    return '<span class="m-icon"><i class="ph' + (weight === "regular" ? "" : "-" + weight) + " ph-" + (PHOSPHOR[name] || name) + '" aria-hidden="true"></i></span>';
  };

  global.Mosaic = M;
})(typeof window !== "undefined" ? window : globalThis);
