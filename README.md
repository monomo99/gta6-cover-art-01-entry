[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/monomo99/gta6-cover-art-01-entry/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/monomo99/gta6-cover-art-01-entry/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

# Vice City Cover Studio — GTA-style cover art maker

Turn a photo + a caption into a GTA 6-style poster. Six multi-panel layouts, five Vice City grades, three OFL display fonts, and exact PNG exports for posts.

## The theme

Vice City, Leonida — the city GTA 6 lives in. Ocean Drive sunsets, Leonida Beach daylight, Vice Nights neon, Palm Dusk, Neon Streets. The samples are original art made for this app (an Ocean Drive hotel row, a Leonida beach, a neon street); the lettering is hand-set in Anton, Bebas Neue and Pacifico. No Rockstar logo, artwork or fonts anywhere.

## Use it

Open `app/index.html` in a desktop browser — it works fully offline, no server, no network. Or serve it locally:

```sh
node serve.ts 8080
# then open http://localhost:8080/
```

1. Pick a layout: Hero, Duo, Trio, Quad, Strip, Columns.
2. Pick a grade: Ocean Drive, Leonida Beach, Vice Nights, Palm Dusk, Neon Streets.
3. Pick a photo: one of the three bundled Vice City samples, or upload your own — it never leaves your machine. Click the cover to choose a panel, drag to pan, scroll to zoom, flip it, or use one photo everywhere.
4. Edit the caption: title, subtitle, tagline, fonts, colour, size, tilt, top or bottom.
5. Export a real PNG: **1080 × 1080**, **1080 × 1350**, or **1920 × 1080**.

## Files

- `app/index.html` — the page
- `app/src/state.js` — grades, layouts, fonts, default state
- `app/src/cover.js` — the poster renderer (sky, sun, panels, palms, halftone, caption, frame)
- `app/src/main.js` — controls, uploads, exports
- `app/style.css` — the neon-dusk UI
- `app/fonts/` — Anton, Bebas Neue, Pacifico (SIL Open Font License, see `OFL.txt`)
- `app/samples/` — three original Vice City sample photos
- `screenshots/` — renders of the app with a photo loaded, plus an exported cover
- `main.ts` — make.fun entrypoint: copies `app/` + `screenshots/` to the output and writes `dossier.json`
- `serve.ts` — tiny local static server (optional)

## License

MIT. Fan-made tool, not affiliated with Rockstar Games.
