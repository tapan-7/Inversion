import { GameScene } from '../enums/game-scene.enum';
import { GameEvent } from '../enums/game-event.enum';

export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 270;
export const TILE_SIZE = 16;

export const SCENE = {
  Boot: GameScene.BOOT,
  Preload: GameScene.PRELOAD,
  Menu: GameScene.MENU,
  Level: GameScene.LEVEL,
  UI: GameScene.UI,
  Complete: GameScene.COMPLETE,
  Pause: GameScene.PAUSE,
  Settings: GameScene.SETTINGS,
  HowToPlay: GameScene.HOW_TO_PLAY,
  Ending: GameScene.ENDING,
  Chapters: GameScene.CHAPTERS,
} as const;

export const GAME_EVENT = {
  /** Emitted by the UI scene when the player taps the on-screen pause button. */
  RequestPause: GameEvent.REQUEST_PAUSE,
  RequestRestart: GameEvent.REQUEST_RESTART,
  RequestMenu: GameEvent.REQUEST_MENU,
  /** Gameplay events, consumed by audio and the HUD. */
  PlayerJumped: GameEvent.PLAYER_JUMPED,
  FragmentCollected: GameEvent.FRAGMENT_COLLECTED,
  CheckpointLit: GameEvent.CHECKPOINT_LIT,
  PortalUnlocked: GameEvent.PORTAL_UNLOCKED,
  LevelCompleted: GameEvent.LEVEL_COMPLETED,
  PlayerDied: GameEvent.PLAYER_DIED,
  LivesChanged: GameEvent.LIVES_CHANGED,
  GameOver: GameEvent.GAME_OVER,
  /** Payload: index of the crystal in the sequence, 0 for the first. */
  SequenceStep: GameEvent.SEQUENCE_STEP,
  SequenceWrong: GameEvent.SEQUENCE_WRONG,
  GateOpened: GameEvent.GATE_OPENED,
  CollapseStarted: GameEvent.COLLAPSE_STARTED,
  CollapseStep: GameEvent.COLLAPSE_STEP,
  /** Tutorial banner control. Payload: `{ id, text }` or nothing for hide. */
  TipShow: GameEvent.TIP_SHOW,
  TipHide: GameEvent.TIP_HIDE,
  /** Emitted with the new Dimension after a successful switch. */
  DimensionSwitched: GameEvent.DIMENSION_CHANGED,
  /** Emitted when a switch is rejected because it would overlap a solid. */
  DimensionBlocked: GameEvent.DIMENSION_BLOCKED,
} as const;

/** Registry key holding `{ found, total }` for the Echo Fragment counter, read by the HUD. */
export const REGISTRY_FRAGMENTS = 'fragments';

/** Registry key holding the current Dimension, read by the HUD. */
export const REGISTRY_DIMENSION = 'dimension';

/** Registry key holding the current Chapter title, read by the HUD. */
export const REGISTRY_CHAPTER = 'chapter';

/** Registry key holding remaining lives, read by the HUD. */
export const REGISTRY_LIVES = 'lives';

export const DEFAULT_LIVES = 3;
export const MAX_LIVES = 3;

/** Length of the dimension-switch wave, within the 250 to 400 ms design range. */
export const SWITCH_DURATION_MS = 320;

/** Insets the player box when testing a switch so resting contact never counts as overlap. */
export const SWITCH_OVERLAP_INSET = 0.5;

/** Player movement tuning, in pixels and seconds. */
export const MOVE = {
  maxSpeed: 112,
  accelGround: 900,
  accelAir: 620,
  frictionGround: 1100,
  frictionAir: 380,
  jumpVelocity: 320,
  /** Extra downward pull applied while rising with the jump key released. */
  jumpCutGravity: 1300,
  gravity: 900,
  maxFallSpeed: 420,
  coyoteTime: 0.1,
  jumpBuffer: 0.12,
} as const;

export const PLAYER_FRAME = { width: 16, height: 24 } as const;
export const PLAYER_BODY = { width: 10, height: 20, offsetX: 3, offsetY: 4 } as const;

export const DEPTH = {
  /** Each dimension is a stack: sky, far, near layers and its tile layer. */
  stackFront: -20,
  stackBack: -60,
  stackTiles: 10,
  hints: 3,
  objects: 4,
  effects: 5,
  pickups: 6,
  player: 10,
  playerFx: 12,
  popups: 14,
  titleCard: 90,
  ui: 100,
} as const;

