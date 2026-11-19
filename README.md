# Neon Shore Cover Studio

[![Make GTA 6 Cover Art](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![Rank](https://make.fun/badge/gta6-cover-art-01/monomo99/gta6-cover-art-01-entry/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![Reward](https://make.fun/badge/gta6-cover-art-01/monomo99/gta6-cover-art-01-entry/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

An offline web app that turns your photos and a caption into GTA-style
multi-panel cover art, in the spirit of a Vice City sunset poster — and
exports it as a PNG to share. Everything runs in your browser from static
files; your photos never leave your machine and nothing is uploaded.

## What it does

- **Three layouts** — Vice Grid (one wide feature panel plus two stacked
  panels), Nine (a 3×3 grid), and Snapshots (three tilted prints in a row).
- **Any photo** — the two bundled sample photos, or any photo from your own
  machine via the file picker. Each panel can be flipped, zoomed, and panned
  on its own, and one photo can fill every panel with a single click.
- **Caption lettering** — a big bold display title plus a script subtitle,
  set in the bundled SIL-licensed Anton and Pacifico fonts.
- **Colour grades** — Sunset, Neon, Golden, and Dusk, each washing the
  panels in its own tint with a matching sky gradient, halftone dots, film
  grain, bird silhouettes, and an optional bold poster frame.
- **Export** — one click downloads the cover as a PNG in 1080×1080,
  1080×1350, or 1920×1080.
- **Screenshot mode** — the app reads `?shot=cover|editor` plus layout,
  grade, size, title, panels, zooms, flips, frame, and pan params from the
  URL, so a cover can be driven deterministically (see `shots.json`).

All art is original canvas drawing. No Rockstar Games logos, wordmarks,
official artwork, or game fonts anywhere.

## How to run it

```sh
node serve.ts
```

Then open <http://localhost:8080> in your browser. Pick a layout, drop in
your photos, edit the caption, and hit **Export PNG**.

## How it is handed in

`main.ts` is the entrypoint program (Node 22, standard library only). It
copies `app/` and `screenshots/` into the output directory (`/output`, or
`MAKEFUN_OUTPUT_DIR` when set) and writes `dossier.json` there using
`buildDossier` from `vendor/makefun-app.ts`. Running it twice produces
identical bytes.

---

Built for the [Make GTA 6 Cover Art](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) competition on [make.fun](https://make.fun/?ref=6xmkb82c).
