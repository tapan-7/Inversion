# Inversion: Echoes of Two Worlds

A 2D atmospheric pixel-art puzzle-platformer for desktop and mobile browsers.
Built with Phaser 3, TypeScript and Vite. See `PLAN.md` for the full build plan.

## Status

Phase 1 (core movement and responsive shell) is implemented. Dimension switching,
collectibles, enemies and later chapters are not built yet.

## Commands

```
npm install
npm run dev        # dev server on http://localhost:5173 (also on your LAN for phone testing)
npm run build      # typecheck and production build into dist/
npm run preview    # serve the production build
npm test           # unit tests (Vitest)
npm run test:e2e   # browser smoke tests (needs `npm run dev` running and Google Chrome installed)
```

Set `PW_CHANNEL=chromium` to use Playwright's own browser instead of Chrome.

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move | A / D or Left / Right | On-screen left and right buttons |
| Jump | W, Up or Z | On-screen jump button |
| Restart level | R | none yet |
| Back to menu | ESC | Menu button, top right |

SPACE is reserved for dimension switching (Phase 2).
Add `?touch=1` to the URL to force the touch controls on a desktop.

## Layout

```
src/game/
  config.ts, constants.ts
  scenes/    Boot, Preload, Menu, Level, UI
  entities/  Player
  systems/   InputController, movement (pure helpers), scale, responsive
  world/     LevelLoader, Parallax, PixelArt (procedural textures), PixelFont, Palette
  ui/        TouchControls
  levels/    testLevel (ASCII tile grid)
tests/       unit tests and tests/e2e/smoke.mjs
```

All art is generated in code at boot, so there are no asset files to load or license.
Texture keys and frame sizes are fixed so real sprite sheets can replace them later.
