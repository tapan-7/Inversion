# Inversion: Echoes of Two Worlds

A 2D atmospheric pixel-art puzzle-platformer for desktop and mobile browsers.
Built with Phaser 3, TypeScript and Vite. See `PLAN.md` for the full build plan.

## Status

Phases 1 to 5 are implemented: core movement, the responsive shell, dimension
switching, the presentation pass and all five chapters with the ending. Phase 6
(edge cases and real device checks) is still to do.

## Commands

```
npm install
npm run dev        # dev server on http://localhost:5173 (also on your LAN for phone testing)
npm run build      # typecheck and production build into dist/
npm run preview    # serve the production build
npm test           # unit tests (Vitest)
npm run test:e2e   # browser tests (smoke, switching, chapter 1, presentation, chapters 2 to 5) (needs `npm run dev` running and Google Chrome installed)
```

Set `PW_CHANNEL=chromium` to use Playwright's own browser instead of Chrome.

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move | A / D or Left / Right | On-screen left and right buttons |
| Jump | W, Up or Z | On-screen jump button |
| Switch world | SPACE | On-screen switch button, left of jump |
| Pause | ESC or P | Pause button, top right |
| Restart level (new run) | R, or RESTART in the pause menu | RESTART in the pause menu |
| Main menu | M in the pause menu | MAIN MENU in the pause menu |


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

## The five chapters

| Chapter | Name | New idea |
| --- | --- | --- |
| 1 | The Forgotten Gate | The switch, one-world walls, the energy bridge |
| 2 | Alternating Stairs | Platforms and floors that change world underfoot |
| 3 | The Watcher | An enemy that exists only in Awakening |
| 4 | The Echo Sequence | Touch crystals in the shrine's order to open a gate |
| 5 | The Collapse | Take the last echo and outrun the falling world |

- **The Watcher** walks a fixed beat and is drawn and deadly only while Awakening is
  active. A switch into Awakening is refused if a Watcher is next to you, so you are
  never switched into one. Caught, you return to the last checkpoint.
- **Crystal sequence:** the shrine shows the colours in order. A wrong crystal darkens
  them all. Some crystals only answer in one world. The solved gate stays open when you
  Continue.
- **The collapse** starts when you cross a line with every echo in hand. Columns fall from
  the left at a steady pace, and a red glow on the screen edge warns you when it is close.
  Falling restores the ground and re-arms it from the last checkpoint.
- **Ending:** finishing chapter 5 shows total echoes (out of 15) and total time.
- **Chapter select:** the menu shows CHAPTERS once chapter 1 is done. A chapter opens when
  the one before it is finished. NEXT on the complete panel moves straight on.

### Chapter 1 details

Collect the three Echo Fragments, then walk into the portal. One fragment can only be
collected while Awakening is active, and the energy bridge only exists in Awakening.

- **Checkpoints:** touching a pylon sets the respawn point and remembers which world
  you were in. Falling into a pit returns you there.
- **Progress:** the run (fragments, checkpoint, clock) is saved to LocalStorage as you
  play. The menu shows CONTINUE when a run is saved, and NEW GAME starts over. The best
  time and completion are kept across runs. If storage is blocked, progress lasts for
  the session only.
- **Test room:** open `/?level=test` for the small switching test level from Phase 2.

## Presentation

- **Ambience:** each world has its own drifting particles (cold dust in Forgotten,
  rising light orbs in Awakening), glowing crystals on the Awakening ruins, and a soft
  light around the player. They reveal through the switch wave with their world.
- **Audio:** fully synthesized with Web Audio, no files. Forgotten is a drone with wind
  and sparse low bells, Awakening is a warm pad with shimmering bells, and a switch
  crossfades between them. Sound effects cover jump, switch, refused switch, fragment,
  checkpoint, portal and level complete. Audio starts on the first key press or tap.
- **Pause menu:** resume, restart, settings, main menu. The level, its timers and
  tweens freeze, and the audio ducks.
- **Settings** (from the main menu with S or the SETTINGS button, or the pause menu):
  volume, sound on or off, Low Effects (fewer particles, no glow sprites, no screen
  shake) and Touch Controls (auto, on, off). All apply immediately and are saved.
- **Tips:** short one-time banners (movement, switching, mid-air switching, the bridge)
  appear where they are needed and go away when you do the thing. RESET TIPS in
  settings shows them again.
- **Chapter title card** fades in when a chapter opens.
- **Instruction cards:** on a new run the opening instructions arrive as pixel cards, one at
  a time. Each slides in from the left edge at mid height, rests in the centre, then drifts
  right while fading away, and the next follows. Resuming a saved run skips them.

## Screen layout

The view is always 270 logical pixels tall. Its width grows to match the window (480 to
800), so the picture covers the screen with no bars at the sides. A phone in landscape or an
ultra-wide window simply shows more of the level. Wider than about 3:1, or narrower than
16:9, you get bars at the sides or at the top and bottom instead. Zoom stays a whole number
when that wastes under a tenth of the screen, and is fractional otherwise.

Things are laid out from the real width: menus centre, the HUD hugs the left, the pause and
touch buttons hug the right corners. Resizing the window mid-game keeps the level running and
re-lays-out the overlays. `systems/scale.ts` holds the calculation.

## Layout

```
src/game/
  config.ts, constants.ts
  scenes/    Boot, Preload, Menu, Level, UI, Complete, Pause, Settings, Ending, Chapters
  entities/  Player, Fragment, Checkpoint, Portal, Watcher, SequenceCrystal, Shrine, Gate
  systems/   ChapterMechanics, CollapseController, sequence, patrol, collapse (the last three pure),
             AudioEngine, AudioDirector, music (pure), Settings, tutorial (pure), effects,
             DimensionManager, ProgressManager (pure save logic), InputController, movement (pure helpers), scale, responsive
  world/     Ambient, LevelLoader, dimensionMath, Parallax, PixelArt (procedural textures), PixelFont, Palette
  ui/        TouchControls, MenuList, TitleCard
  levels/    testLevel (ASCII tile grid)
tests/       unit tests and tests/e2e/smoke.mjs
```

All art is generated in code at boot, so there are no asset files to load or license.
Texture keys and frame sizes are fixed so real sprite sheets can replace them later.

## Level checks

`tests/helpers/reach.ts` is a conservative solvability analyzer: it follows walking, jumps
shorter than the real ones, falling and free mid-air switching, and answers whether the
portal, every echo and every checkpoint can be reached from the spawn. The chapter tests
use it, and also break each level on purpose (no bridge, no world-specific ledges) to prove
it fails when a level is unsolvable. For the collapse it also checks that the fastest route
stays ahead of the wave with a margin. It is a design aid, not a proof, so a real
playthrough is still the final word.
