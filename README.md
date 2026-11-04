# Inversion: Echoes of Two Worlds

A 2D atmospheric pixel-art puzzle-platformer across two intertwined dimensions for desktop and mobile browsers.

Migrated to **Next.js (App Router) + React + TypeScript + Phaser 3 + Tailwind CSS**.

---

## 1. Technology Stack

- **Framework**: Next.js 16 (App Router)
- **UI & Components**: React 19
- **Game Engine**: Phaser 3.90 (Arcade Physics, WebGL/Canvas)
- **Language**: TypeScript (Strict Mode enabled)
- **Styling**: Tailwind CSS v4 & Retro Pixel CSS
- **Audio**: Web Audio API procedural synthesis (`AudioEngine.ts`)
- **State & Events**: React Context (`GameProvider`), Typed Event Bridge (`GameEventEmitter`)
- **Persistence**: Safe browser `localStorage` with SSR fallback
- **Testing**: Vitest (Unit Tests) & Playwright (E2E)

---

## 2. Getting Started

### Installation

```bash
npm install
```

### Development

Run the Next.js development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

Build for production:

```bash
npm run build
npm start
```

### Running Tests

Execute Vitest unit tests:

```bash
npm test
```

Type-check the codebase:

```bash
npm run typecheck
```

---

## 3. Project Structure

```text
inversion/
├── public/                     # Static public assets
│   ├── assets/                 # Sprite, audio, fonts, and map assets
│   │   ├── sprites/
│   │   ├── backgrounds/
│   │   ├── tilesets/
│   │   ├── audio/
│   │   ├── fonts/
│   │   └── maps/
│   ├── favicon.svg             # Game favicon
│   └── manifest.json           # Web App / PWA manifest
│
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Root layout & GameProvider
│   │   ├── page.tsx            # Main game page
│   │   ├── globals.css         # Global styling & pixel art CSS
│   │   └── game/
│   │       └── page.tsx        # Direct /game route
│   │
│   ├── components/             # React UI components
│   │   ├── game/
│   │   │   ├── GameContainer.tsx       # Master game shell
│   │   │   ├── GameCanvas.tsx          # Client-only Phaser canvas lifecycle
│   │   │   ├── GameHUD.tsx             # Reactive HUD (Dimension, Echoes, Sound)
│   │   │   ├── GameMenu.tsx            # Main menu overlay
│   │   │   ├── InstructionPanel.tsx    # "How to Play" modal
│   │   │   ├── PauseScreen.tsx         # Pause modal
│   │   │   ├── LevelCompleteScreen.tsx # Chapter complete summary
│   │   │   ├── GameOverScreen.tsx      # Respawn / defeat screen
│   │   │   └── OrientationWarning.tsx  # Mobile portrait rotation notice
│   │   └── layout/
│   │       └── GameLayout.tsx          # Viewport layout wrapper
│   │
│   ├── game/                   # Phaser 3 Core Game Engine
│   │   ├── config/             # Game configuration, constants, settings
│   │   │   ├── game.config.ts
│   │   │   ├── game.constants.ts
│   │   │   └── game.settings.ts
│   │   ├── enums/              # Strongly typed enums
│   │   │   ├── game-state.enum.ts
│   │   │   ├── game-scene.enum.ts
│   │   │   ├── dimension.enum.ts
│   │   │   ├── player-state.enum.ts
│   │   │   └── game-event.enum.ts
│   │   ├── events/             # Event bridge connecting Phaser to React
│   │   │   └── GameEventEmitter.ts
│   │   ├── types/              # Game & Event TypeScript definitions
│   │   │   ├── game.types.ts
│   │   │   ├── player.types.ts
│   │   │   ├── level.types.ts
│   │   │   └── event.types.ts
│   │   ├── entities/           # Player, Gate, Fragment, Checkpoint, etc.
│   │   ├── levels/             # Chapters 1-5 definitions and grid builders
│   │   ├── scenes/             # LevelScene, MenuScene, UIScene, etc.
│   │   ├── systems/            # AudioEngine, DimensionManager, InputController, etc.
│   │   └── world/              # PixelArt, PixelFont, Palette, Parallax, LevelLoader
│   │
│   ├── hooks/                  # React Hooks
│   │   ├── useGame.ts          # Access game state & actions
│   │   ├── useGameEvents.ts    # Subscribe to typed game events
│   │   └── useOrientation.ts   # Screen orientation detection
│   │
│   ├── providers/
│   │   └── GameProvider.tsx    # React Context & Event subscription
│   │
│   └── lib/                    # Storage and utility helpers
│       ├── storage.ts          # SSR-safe local storage wrapper
│       └── utils.ts            # Formatting & styling utilities
│
├── next.config.ts              # Next.js configuration & Phaser bundling alias
├── tsconfig.json               # TypeScript compiler options (Strict mode)
├── postcss.config.mjs          # Tailwind CSS PostCSS configuration
└── package.json
```

---

## 4. How React and Phaser Communicate

The project uses an **Event-Driven Bridge** (`GameEventEmitter.ts`) to decouple the Phaser rendering engine from React:

1. **Phaser $\rightarrow$ React**:
   - When in-game events occur in Phaser (e.g. `GAME_EVENT.DimensionSwitched`, `LevelCompleted`, `TipShow`), `bindGameEventEmitter` catches them on `game.events` and emits typed events through `gameEvents`.
   - The React `GameProvider` (or components using `useGameEvents`) listens to these typed events and updates the React state (HUD, modals, dimension indicator).
2. **React $\rightarrow$ Phaser**:
   - When a user interacts with a React UI button (e.g. clicking PAUSE or MUTED in `GameHUD`), `useGame()` calls `togglePause()`.
   - This dispatches `GameEvent.REQUEST_PAUSE` across the bridge to Phaser's scene event listener, triggering Phaser's internal pause flow.

---

## 5. Development Guide

### How to Modify Game UI
- **In-Game HUD**: Edit `src/components/game/GameHUD.tsx`.
- **How to Play Overlay**: Edit `src/components/game/InstructionPanel.tsx` (React) or `src/game/scenes/HowToPlayScene.ts` (Phaser).
- **Pause & Completion Screens**: Edit `src/components/game/PauseScreen.tsx` and `src/components/game/LevelCompleteScreen.tsx`.

### How to Modify Gameplay Mechanics
- **Player Movement & Jumping**: Edit `src/game/entities/Player.ts` and `src/game/systems/movement.ts`.
- **Dimension Switch & Collision**: Edit `src/game/systems/DimensionManager.ts` and `src/game/world/dimensionMath.ts`.
- **Special Mechanics (Watchers, Crystals, Collapse)**: Edit `src/game/systems/ChapterMechanics.ts`.

### How to Add a New Level
1. Create a new file in `src/game/levels/` (e.g. `chapter6.ts`).
2. Construct the dual-dimension grid using `GridPair`:
   - `'#'` stone, `'='` one-way ledge, `'b'` energy bridge, `'.'` empty.
3. Export a `LevelConfig` object with spawn points, echoes, portal, and checkpoints.
4. Register the level in `src/game/levels/index.ts`.

### How to Add New Assets
1. Static files: Place them in `public/assets/` (`sprites/`, `audio/`, `tilesets/`).
2. Procedural pixel art: Add sprite matrices to `src/game/world/PixelArt.ts`.

### How to Add a New Game Event
1. Add the enum key in `src/game/enums/game-event.enum.ts`.
2. Define its typed payload in `src/game/types/event.types.ts` under `GameEventPayloads`.
3. Add the event name to `forwardedEvents` in `src/game/events/GameEventEmitter.ts`.
4. Emit it from Phaser via `this.game.events.emit(...)` and listen in React using `useGameEvents(...)`.
