[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-clipper-01.svg)](https://make.fun/bounty/gta6-clipper-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-clipper-01)
[![make.fun · rank](https://make.fun/badge/rank/gta6-cover-art-01/monomo99/gta6-cover-art-01-entry-lunaku.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![make.fun · reward](https://make.fun/badge/reward/gta6-cover-art-01/monomo99/gta6-cover-art-01-entry-lunaku.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

# Vice Cover Studio — GTA-style cover art maker

Turn your own photo and a caption into cover art in the style of GTA 6's
posters: the multi-panel poster look, bold caption lettering, and a Vice City
sunset or neon colour grade — then export it as a PNG to share.

Made for the [gta6-cover-art-01 bounty](https://make.fun/bounty/gta6-cover-art-01)
on make.fun. Everything here is original: no Rockstar Games logo, artwork or
font. The lettering uses Anton, Bebas Neue and Pacifico, all under the SIL Open
Font License (see `app/fonts/OFL.txt`).

## What it does

- **Any photo** — drop in your own photos from your machine, or start from the
  three built-in sample shots. Photos are read locally and never leave the
  machine; the app works fully offline.
- **Multi-panel posters** — six layouts (Hero, Duo, Trio, Quad, Strip,
  Columns). Fill several panels with one photo or a different photo per panel.
- **Crop and position each panel** — click a panel to select it, then zoom,
  pan, flip, or fill every panel with the same photo.
- **Caption editing** — title, subtitle and tagline, three display fonts,
  colour swatches, size and tilt.
- **Sunset and neon grades** — five colour grades (Sunset, Neon, Palm Dusk,
  Rose, Noir) plus a synthwave sun, palm silhouettes, halftone dots, film
  grain, scanlines and a poster frame.
- **Fast export** — one click exports a PNG in the common post sizes:
  1080 × 1080, 1080 × 1350, or 1920 × 1080.

## Try it offline

```sh
node serve.ts
# open http://localhost:8080 in desktop Chrome
```

Or serve `app/` with any static file server. No build step, no network
requests: every script, font and sample image is a file under `app/`.

Shortcuts in the editor: `E` exports the PNG, `S` shuffles the look.

## Handing it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/`
into the output directory and writes `dossier.json` with `buildDossier` from
`vendor/makefun-app.ts` (the kit's copy, unchanged).

## Screenshots

- `screenshots/1-cover.jpg` — a wide cover the app exported
- `screenshots/2-editor.jpg` — the editor with photos loaded
- `screenshots/3-cover-portrait.jpg` — a portrait cover the app exported
- `screenshots/4-cover-square.jpg` — a square cover the app exported

## License

MIT — see `LICENSE`. The sample photos under `app/samples/` were made with an
image model for make.fun and are free to use.
