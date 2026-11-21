[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/monomo99/gta6-cover-art-01-entry/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/monomo99/gta6-cover-art-01-entry/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

# Vice City Cover Studio — GTA-style cover art maker

Turn a photo + a caption into a GTA 6-style poster. Eight multi-panel layouts (including Mosaic and a Pop-Out hero that breaks the frame), five Vice City grades, three OFL display fonts, exact PNG exports for posts — and the touches that make a cover win: a face-aware crop that keeps faces in frame, retro-chrome titles, role tags painted on the panels, a movie-poster billing block with a studio seal, sticker stamps, and a GTA HUD drawn on the poster itself (wanted stars, a minimap, health/armor bars, a mission briefing card, a radio ticker, a district stamp, WASTED / MISSION PASSED end cards, and a worn-print effect).

## The theme

Vice City, Leonida — the city GTA 6 lives in. Ocean Drive sunsets, Leonida Beach daylight, Vice Nights neon, Palm Dusk, Neon Streets. The samples are original art made for this app (an Ocean Drive hotel row, a Leonida beach, a neon street, a palm court, a yacht club, a midnight diner); the lettering is hand-set in Anton, Bebas Neue and Pacifico. No Rockstar logo, artwork or fonts anywhere.

## Use it

Open `app/index.html` in a desktop browser — it works fully offline, no server, no network. Or serve it locally:

```sh
node serve.ts 8080
# then open http://localhost:8080/
```

1. Pick a layout: Hero, Duo, Trio, Quad, Strip, Columns, Mosaic, or Pop-Out (the hero's face breaks out of the frame in a medallion).
2. Pick a grade: Ocean Drive, Leonida Beach, Vice Nights, Palm Dusk, Neon Streets — or set a custom accent colour.
3. Pick a photo: one of the six bundled Vice City samples, or upload your own — it never leaves your machine. Faces are detected when a photo loads, so the crop keeps them in frame; tap “Face focus” and then tap a face to pin it yourself. Click the cover to choose a panel, drag to pan, scroll to zoom, flip it, or use one photo everywhere.
4. Edit the caption: title, subtitle, tagline, fonts, treatment (Solid, Retro chrome, Outline), colour, size, tilt, top or bottom.
5. Stamp stickers on the poster (star, palm, skull, crown, dice, bolt) — pick one, then tap the cover.
6. Dress the poster with the GTA HUD: wanted level (0–5 stars), health and armor bars, a district stamp, a mission briefing card (name, objective, reward — or hit “Spin a heist” for a random job, or “Surprise me” for a whole new poster), a Vice City radio ticker, a WASTED / MISSION PASSED end card, a billing block with a studio seal, and a worn-print effect. Uncheck “Show HUD” to compare the clean art.
7. Export a real PNG: **1080 × 1080**, **1080 × 1350**, **1920 × 1080**, or **1080 × 1920** (story).

## Files

- `app/index.html` — the page
- `app/src/data.js` — grades, layouts, fonts, samples, districts, radio stations, heist pools, stickers, export sizes, default poster state
- `app/src/faceCrop.js` — face-aware crop (skin-tone cluster detection + manual face focus)
- `app/src/chromeTitle.js` — solid / retro-chrome / outline title treatments
- `app/src/fx.js` — sticker emblems, worn print, grain
- `app/src/render.js` — the poster painter (sky, sun, panels, palms, caption, role tags, HUD, billing block, seal, stickers, frame)
- `app/src/ui.js` — controls, uploads, exports, heist spinner, surprise randomizer
- `app/style.css` — the sunset-neon editor UI
- `app/fonts/` — Anton, Bebas Neue, Pacifico (SIL Open Font License, see `OFL.txt`)
- `app/samples/` — six original Vice City sample photos
- `screenshots/` — the landscape exported cover first, then the editor, then the other post sizes
- `main.ts` — make.fun entrypoint: copies `app/` + `screenshots/` to the output and writes `dossier.json`
- `serve.ts` — tiny local static server (optional)

## License

MIT. Fan-made tool, not affiliated with Rockstar Games.
