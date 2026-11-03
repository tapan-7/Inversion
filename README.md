# Inversion: Echoes of Two Worlds

A 2D atmospheric pixel-art puzzle-platformer for desktop and mobile browsers.
Built with Phaser 3, TypeScript and Vite. See `PLAN.md` for the full build plan.

## Status

Phases 1 to 3 are implemented: core movement, the responsive shell, dimension
switching and the Chapter 1 vertical slice. The presentation pass, enemies and
chapters 2 to 5 are not built yet.

## Commands

```
npm install
npm run dev        # dev server on http://localhost:5173 (also on your LAN for phone testing)
npm run build      # typecheck and production build into dist/
npm run preview    # serve the production build
npm test           # unit tests (Vitest)
npm run test:e2e   # browser tests (smoke, switching, chapter 1) (needs `npm run dev` running and Google Chrome installed)
```

Set `PW_CHANNEL=chromium` to use Playwright's own browser instead of Chrome.

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move | A / D or Left / Right | On-screen left and right buttons |
| Jump | W, Up or Z | On-screen jump button |
| Switch world | SPACE | On-screen switch button, left of jump |
| Restart level (new run) | R | none yet |
| Back to menu | ESC | Menu button, top right |


## Dimension switching

Each level has two tile grids (Forgotten and Awakening) on the same coordinates.
Only the active world collides. The player is never moved on a switch, so position
and velocity carry over, including in mid-air.

- A switch is refused when the player's box would overlap a solid of the other world.
  The blocking cells flash red, the player flashes, and the HUD shows BLOCKED.
- A successful switch reveals the new world as a circle expanding from the player
  (320 ms), with a particle burst and a small camera pulse. Presses during the
  transition are ignored.
- Logic lives in `world/dimensionMath.ts` (pure, unit tested) and
  `systems/DimensionManager.ts` (Phaser side).

Add `?touch=1` to the URL to force the touch controls on a desktop.

## Chapter 1

Collect the three Echo Fragments, then walk into the portal. One fragment can only be
collected while Awakening is active, and the energy bridge only exists in Awakening.

- **Checkpoints:** touching a pylon sets the respawn point and remembers which world
  you were in. Falling into a pit returns you there.
- **Progress:** the run (fragments, checkpoint, clock) is saved to LocalStorage as you
  play. The menu shows CONTINUE when a run is saved, and NEW GAME starts over. The best
  time and completion are kept across runs. If storage is blocked, progress lasts for
  the session only.
- **Test room:** open `/?level=test` for the small switching test level from Phase 2.

## Layout

```
src/game/
  config.ts, constants.ts
  scenes/    Boot, Preload, Menu, Level, UI, Complete
  entities/  Player, Fragment, Checkpoint, Portal
  systems/   DimensionManager, ProgressManager (pure save logic), InputController, movement (pure helpers), scale, responsive
  world/     LevelLoader, dimensionMath, Parallax, PixelArt (procedural textures), PixelFont, Palette
  ui/        TouchControls
  levels/    testLevel (ASCII tile grid)
tests/       unit tests and tests/e2e/smoke.mjs
```

All art is generated in code at boot, so there are no asset files to load or license.
Texture keys and frame sizes are fixed so real sprite sheets can replace them later.
