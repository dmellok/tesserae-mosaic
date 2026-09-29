# Mosaic

An open design system for e-ink dashboards and widgets. Write a dashboard once from Mosaic
components, and one attribute gives it one of five complete looks. It reads at every panel size
from 296×128 to 1600×1200, and prints cleanly on one-bit panels as well as colour ones.

Mosaic is used by [Tesserae](https://github.com/dmellok/tesserae) and Tesserae Cloud, and it is
optional in both: nothing changes for a dashboard that does not use it.

```html
<link rel="stylesheet" href="mosaic.css">
<script src="mosaic.js"></script>

<main class="m" data-look="bauhaus"><div class="m-page">
  <header class="m-masthead"><span>Tuesday</span><span>29 September</span><span>2026</span></header>
  <div class="m-hero"><div class="m-clock" data-fit></div></div>
  <div class="m-stats">
    <div class="m-stat"><span class="m-stat__label">High</span><b class="m-stat__value">17°</b></div>
    <div class="m-stat"><span class="m-stat__label">Low</span><b class="m-stat__value">9°</b></div>
  </div>
</div></main>

<script type="module">
  Mosaic.clock(document.querySelector(".m-clock"));
  await Mosaic.ready();
</script>
```

In a Tesserae code page, add `"mosaic"` to the page's `libs` and both files are loaded for you.

## Looks

| Look | What it is |
|---|---|
| `bauhaus` | Solid colour blocks, thick rules, very heavy type and big icons. |
| `almanac` | A printed page: serif numerals, a masthead between rules, one red accent. |
| `signal` | Swiss minimal on a twelve-column grid, designed for one-bit panels first. |
| `pixel` | Pixel type, pixel-art icons and dithered windows, like an old handheld game. |
| `os7` | The classic Macintosh System 7: pinstriped windows, a menu bar, dialogs, the grey desktop. |

A look styles components, never a particular dashboard, so it applies to anything built from them.

## Size

`.m` is a size container. Inside it, `--m-u` is one hundredth of its short edge and every length is
a multiple of it, so the same markup scales from a 2.9″ shelf label to a 13.3″ wall panel. Every
type size has a pixel floor so small panels stay legible. Utility classes hide things by size:
`m-hide-small` (short edge under 360 px), `m-hide-tiny` (under 220 px), `m-hide-portrait`,
`m-hide-landscape`.

## Colour

Mosaic paints from roles, not colours: `--m-paper`, `--m-ink`, `--m-ink-2`, `--m-mute`, `--m-tint`,
`--m-red`, `--m-yellow`, `--m-green`, `--m-blue`, `--m-on` (text on a coloured block) and
`--m-accent` (the one thing marked "now"). They read the host's theme when there is one (Tesserae
Cloud's `--ink`, `--accent-1`; self-hosted Tesserae's `--text-primary`, `--accent-1`) and fall back
to a paper palette when there is not.

On a one-bit panel Tesserae's mono theme prints every accent as ink. `Mosaic.ready()` notices and
sets `data-bits="1"` on the root, and the looks keep text readable on what were light blocks.

## Components

| Class | What it is |
|---|---|
| `m` | The root: a size container carrying the look (`data-look`). |
| `m-page`, `m-page--flush` | The page inside the root: padded column with the look's gap. |
| `m-stack`, `m-row`, `m-fill`, `m-split`, `m-grid` + `m-span-N` | Layout. `m-split` stacks in portrait; `m-grid` spans go full width in portrait. |
| `m-masthead` | A header with two or three slots: left, centre, right. |
| `m-hero` | The one big thing (a clock, a count). Put `data-fit` on the text inside. |
| `m-window` with `data-cap` | A titled section. The look decides: card, ruled section or double-bordered window. |
| `m-block`, `--1` `--2` `--3` `--ink` `--paper` | A filled surface with the right text colour for it. |
| `m-stat` (`__label`, `__value`, `__sub`), `m-stat--hero` | A figure with its name. |
| `m-stats`, `m-stats--wrap` | A row of stats sharing the width; `--wrap` goes two by two in portrait. |
| `m-clock` | A time with a small am/pm, filled by `Mosaic.clock`. |
| `m-iconbox` | An icon in a square of its own. |
| `m-bars` | A bar chart, drawn by `Mosaic.bars`. |
| `m-spark` | A line, drawn by `Mosaic.spark`. |
| `m-meter` | Progress: set `--m-value` from 0 to 1. |
| `m-dots` | A grid of days or steps, drawn by `Mosaic.dots` to fill its box. |
| `m-list` | Numbered rows, filled by `Mosaic.list`, trimmed so none is cut short. |
| `m-quote` (`__text`, `__by`) | A line and who said it. |
| `m-empty` | What to show when there is nothing yet. |
| `m-label`, `m-num`, `m-display`, `m-mute`, `m-accent`, `m-xs` … `m-xxl` | Text. |
| `m-rule`, `--heavy`, `--double`, `--v` | Rules. |

## Script

`mosaic.js` defines `window.Mosaic`:

- `ready(root?)`: wait for fonts, mark one-bit roots, fit every `[data-fit]`, trim lists. Await it before measuring anything.
- `fit(el, {min, max})`: grow or shrink an element's text to fill it.
- `clock(el, {tz, locale, date})`, `timeParts(date, opts)`, `date(d, style, opts)`: times and dates in the page's zone and language.
- `bars(el, [{value, label, tick}], {now})`, `spark(el, values, {now})`, `dots(el, {total, done})`, `list(el, items, {pad, numbered})`.
- `icon(name, el)`: a Phosphor icon, or a pixel-art one in a look that draws its own. `weatherKind(code, isDay)` maps an Open-Meteo code to an icon name.

## Working on Mosaic

```
npm run build                     # dist/mosaic.css and dist/mosaic.js
node scripts/proof.mjs [look ...] # every specimen, every size, colour and one-bit, with and without data
```

`reference/specimens.js` holds six dashboards built from the components; the proof renders each in
every look and reports anything off the panel or cut short. Fonts and icons come from a Tesserae
`public/` directory (`TESSERAE_PUBLIC`).

MIT licence.
