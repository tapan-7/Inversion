# Inversion: Echoes of Two Worlds, Build Plan

A 2D atmospheric pixel-art puzzle-platformer. One world, two realities, one path to escape. Built with Phaser 3, TypeScript and Vite. Playable in desktop and mobile browsers.

## 1. Locked decisions

- **Stack:** Phaser 3, TypeScript, Vite, Arcade Physics.
- **Logical resolution:** 480 x 270, 16 x 16 tiles.
- **Rendering:** crisp pixel art (`pixelArt: true`, `roundPixels: true`), no blurry full-scene post-processing.
- **Core mechanic:** one level, two tile/collision sets (Forgotten and Awakening) sharing the same coordinates and camera. Switching never teleports the player and keeps velocity.
- **Fairness rule:** a switch is rejected, with a brief warning flash, if the player's box would overlap a solid in the target dimension.
- **Save:** LocalStorage.
- **Out of scope for v1:** multiplayer, inventory, skill trees, complex combat, procedural levels.
- **No dashboard UI** in this project, so the shadcn admin rule does not apply.

## 2. Reference images (folder `reference/`)

18 images reviewed. They are screenshots and concept art from other games and AI sources. Use them as **mood and design reference only**. Do not ship them or trace them. Licences are unknown.

### Dimension look and feel

| Image content | What we take from it |
| --- | --- |
| Purple crystal rendered in 6 stages, from flat silhouette to glowing | Crystal sprite shading steps: dark base, gradient, facets, highlights, glow halo. Used for crystals and Echo Fragments. |
| Pink and purple pixel ruins, crystal tree, stone portal gates with a floating character | Awakening palette, ruin-plus-crystal composition, portal gate design. |
| Teal and violet night temple, crescent moon, pillars, guardian statues, glowing arch portal | Forgotten palette, the chapter-exit portal, symmetrical framing. |
| Floating rock debris around a blue portal in a night sky | Portal and sky particles, floating shards. |
| Purple glowing forest with hanging platforms, vines, dandelion light orbs | Awakening parallax layers, ambient floating particles, hanging platform shapes. |
| Teal ruined city with glowing crystals, stairs, waterfalls | Forgotten key-art mood for the title screen and backgrounds. |
| Dark ruined bridge over still water with reflection | Forgotten level composition and water reflection strip. |
| Hollow Knight style screenshot with dark foreground silhouettes and blue haze | Foreground silhouette layer for depth, muted blue fog. |
| Purple floating ruins with ribbons of violet energy | Energy bridge look (the source is 3D, so we only borrow the colour flow). |

### Transition and enemy

| Image content | What we take from it |
| --- | --- |
| Dark scene with a glowing circular bubble revealing a different world inside | **Primary transition model:** a circle expanding from the player reveals the new dimension. |
| Screen split by a diagonal wipe, sunset world on one side, night world on the other, with an enemy visible only in one | Confirms the design: same geometry, different state per world. Enemy exists in one dimension only. |
| World mirrored around a glowing horizontal line, with the same blocks in both halves | Optional "inversion" flourish on the title screen. |
| Black shadow creature with a cyan outline and one red eye | The Watcher: silhouette, cyan rim light, single red eye as the danger tell. |

### Characters, tiles and UI

| Image content | What we take from it |
| --- | --- |
| Explorer sprite sheet: idle 6 frames, run 8, jump 6 | Animation set to match: idle, run, jump up, apex, fall. Our sprite is smaller (about 16 x 24), so frame counts are reduced and we add a switch pose. |
| Mossy ruined stone tileset: arches, doors, vines, pillars | Forgotten tileset: stone, cracks, moss, broken arches, decorations. |
| Crystal cave tileset with ladders, props, coins | Prop variety and platform edge style (frosted lip, hanging stalactites). The style is cartoon vector, so mood only. |
| Warm lantern-lit pixel forest ruins | Accent lighting: small warm glows against cold palettes, used sparingly. |
| Action-RPG screenshot with a large HUD | **What to avoid.** Our HUD stays minimal (chapter name, fragment counter, dimension indicator). |

### Art direction we derive

- Palette anchors from the design doc: `#101A32` deep navy, `#263C61` Forgotten blue, `#673E9B` Awakening purple, `#C27AFF` energy glow. Add one cyan accent (`#4FE3E8`) for portals and the Watcher rim, as seen across the references.
- Three to four tones per material, a 1px darker outline, glow only on interactive things (crystals, fragments, portals, gates).
- Both dimensions use the same ruin architecture. Forgotten is cold, cracked, silent. Awakening is the same space restored, with crystals, floating pieces and violet light.

## 3. Art production approach (needs your decision)

Procedural canvas art can produce clean tiles, crystals, portals and a small player. It will not reach the painterly depth of most references (the glowing forest, the teal city).

Recommended hybrid:

1. **Phase 1 to 3:** procedural tiles and sprites generated at boot from palette definitions in code. Fully consistent, no licensing risk, easy to swap.
2. **Backgrounds:** layered parallax built from procedural silhouettes (mountains, pillars, ruins) plus particles and gradients drawn as pixel bands.
3. **Later upgrade:** replace procedural textures with real sprite sheets (player, Watcher, two tilesets) by keeping texture keys and frame sizes identical. No gameplay code changes.

## 4. Responsive design (desktop and mobile)

Layout
- Phaser `Scale.FIT` with `autoCenter`. The canvas fills the viewport (`100dvh`). Navy letterbox bars absorb leftover space.
- Integer scale when it fits, otherwise the largest crisp scale. Never stretch to odd aspect ratios.
- Landscape is the target on phones. In portrait show a "rotate your device" overlay and pause the game.
- Handle `resize` and `orientationchange`, safe-area insets (`viewport-fit=cover`), and block page scroll and pinch zoom (`touch-action: none`).

Input
- `InputController` merges keyboard, touch and gamepad into one action set: left, right, jump, switch, interact, pause.
- Touch controls live in the UI scene so they ignore the world camera:
  - Bottom left: left and right buttons.
  - Bottom right: Jump and Switch buttons (large hit areas).
  - Top right: pause.
- Show touch controls only on touch devices (`pointer: coarse`) and offer a toggle in settings.
- Multi-touch enabled (at least 3 pointers) so running, jumping and switching can overlap.
- Open question: the design doc assigns SPACE to both jump and switch. Proposal: **W / Up / Z for jump, SPACE for switch**, with a dedicated Switch button on mobile.

Performance on phones
- Pooled sprites and particles with caps, one tile layer per dimension, a "low effects" setting that reduces particles and shake.
- Audio unlocks on first tap. Fullscreen button hidden where unsupported (iOS Safari).
- Later: PWA manifest for home-screen install.

## 5. Architecture

Follow the structure from the design doc, with these additions.

```
src/
  main.ts
  game/
    config.ts, constants.ts
    scenes/    Boot, Preload, Menu, Level, UI
    entities/  Player, Enemy (Watcher), Collectible
    systems/   DimensionManager, PuzzleManager, CheckpointManager,
               ProgressManager, InputController
    world/     LevelLoader, PlatformLayer, WorldEffects, PixelArt, Palette
    ui/        HUD, PauseMenu, TouchControls
    levels/    chapter1.ts ... chapter5.ts (ASCII grids per dimension)
```

Key rules
- Each level defines two same-sized tile grids (Forgotten, Awakening) in code or JSON.
- `DimensionManager`: pick target, test the player box against the target collision layer, reject or commit, swap active collision, swap visuals, run the transition, update HUD.
- Every dynamic object (gate, bridge, crystal, enemy, moving platform) carries a `dimensionMask` and toggles its own physics body. Collision never depends on tile visibility alone.
- The transition uses a circular mask that expands from the player over about 300 ms (target range 250 to 400 ms), with leftover particles and a short settle.
- The player is never recreated. Position and velocity are preserved across switches.

## 6. Roadmap

Each phase ends with a runnable build and verification before moving on.

### Phase 1: Core movement and responsive shell
- Vite, Phaser, TypeScript project, Boot and Preload scenes, menu with Start Game.
- Level scene with a test environment from procedural tiles.
- Player: run with acceleration and deceleration, variable jump, coyote time, jump buffer.
- Arcade collisions, camera follow with bounds, keyboard input.
- Responsive scaling, rotate overlay, touch controls, safe restart and return to menu.
- Done when: the dev command works, menu loads, Start opens the level, run and jump work on desktop and in phone viewports, no console errors.

### Phase 2: Dimension switching (the mechanic people remember)
- Two tile layers, collision-aware switching, rejection feedback.
- Circular reveal transition, particles, subtle camera pulse.
- Dimension-only platforms, tested while airborne.

### Phase 3: Chapter 1 vertical slice
- Three Echo Fragments, one energy bridge, checkpoint, portal, level complete.
- LocalStorage progress, Continue on the menu.

### Phase 4: Presentation
- Parallax backgrounds, ambient particles, crystal glow, player light.
- HUD, pause menu, settings, tutorial overlays, chapter transitions.
- Synthesized ambient audio with separate layers per dimension (no audio files needed).

### Phase 5: Chapters 2 to 5
- Alternating platforms, the Watcher (Awakening only), ordered crystal sequences, the collapse finale, ending screen with fragments and time.

### Phase 6: Polish and testing
- Edge cases for switching (corners, ceilings, moving platforms).
- Real device checks (iOS Safari, Android Chrome), loading and bundle size, 60 FPS target.

## 7. Verification

- Unit tests (Vitest) for `DimensionManager` rejection logic, coyote time and jump buffering.
- Playwright smoke tests: menu to level, jump and run, screenshots at 1920 x 1080, 1280 x 720, 844 x 390 (phone landscape) and portrait overlay.
- Console error check on every run.
- No feature is reported as done until it has been run and observed.

## 8. Open questions

1. Jump and switch keys: confirm W / Up / Z for jump and SPACE for switch.
2. Art path: procedural now with a later upgrade to sprite sheets (recommended), or source sprite sheets before starting?
3. Player character: small hooded Wanderer (fits the lore and the small sprite size, recommended) or an explorer like the reference sheet?
