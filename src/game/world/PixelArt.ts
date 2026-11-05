import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, PLAYER_FRAME, TILE_SIZE } from '../constants';
import type { Dimension } from './dimensionMath';
import { PALETTE, hex } from './Palette';

export const TEXTURE = {
  tiles: 'tiles',
  player: 'player',
  bgSky: 'bg-sky',
  bgFar: 'bg-far',
  bgNear: 'bg-near',
  pixel: 'px',
  btn: 'btn',
  iconLeft: 'icon-left',
  iconRight: 'icon-right',
  iconJump: 'icon-jump',
  iconMenu: 'icon-menu',
  iconSwitch: 'icon-switch',
  iconPause: 'icon-pause',
  fragment: 'fragment',
  halo: 'halo',
  checkpointOff: 'checkpoint-off',
  checkpointOn: 'checkpoint-on',
  portalArch: 'portal-arch',
  portalCore: 'portal-core',
  watcher: 'watcher',
  seqCrystal: 'seq-crystal',
  gate: 'gate',
  tilesAwakening: 'tiles-awakening',
  bgSkyAwakening: 'bg-sky-awakening',
  bgFarAwakening: 'bg-far-awakening',
  bgNearAwakening: 'bg-near-awakening',
} as const;

export interface DimensionTextures {
  tiles: string;
  sky: string;
  far: string;
  near: string;
}

/** Texture keys for each dimension. Sprite sheets can replace these later without code changes. */
export const DIMENSION_TEXTURES: Record<Dimension, DimensionTextures> = {
  forgotten: { tiles: TEXTURE.tiles, sky: TEXTURE.bgSky, far: TEXTURE.bgFar, near: TEXTURE.bgNear },
  awakening: {
    tiles: TEXTURE.tilesAwakening,
    sky: TEXTURE.bgSkyAwakening,
    far: TEXTURE.bgFarAwakening,
    near: TEXTURE.bgNearAwakening,
  },
};

interface TileTheme {
  mid: number;
  light: number;
  dark: number;
  shadow: number;
  mortar: number;
  highlight: number;
  crack: number;
}

const TILE_THEMES: Record<Dimension, TileTheme> = {
  forgotten: {
    mid: PALETTE.stoneMid,
    light: PALETTE.stoneLight,
    dark: PALETTE.stoneDark,
    shadow: PALETTE.stoneShadow,
    mortar: PALETTE.mortar,
    highlight: PALETTE.stoneHighlight,
    crack: PALETTE.deepNavy,
  },
  awakening: {
    mid: PALETTE.crystalMid,
    light: PALETTE.crystalLight,
    dark: PALETTE.crystalDark,
    shadow: PALETTE.crystalShadow,
    mortar: PALETTE.crystalMortar,
    highlight: PALETTE.crystalHighlight,
    crack: PALETTE.crystalMortar,
  },
};

interface BackgroundTheme {
  skyTop: number;
  skyMid: number;
  skyLow: number;
  far: number;
  farEdge: number;
  ruin: number;
  starBright: number;
  starDim: number;
}

const BACKGROUND_THEMES: Record<Dimension, BackgroundTheme> = {
  forgotten: {
    skyTop: PALETTE.skyTop,
    skyMid: PALETTE.skyMid,
    skyLow: PALETTE.skyLow,
    far: PALETTE.mountainFar,
    farEdge: PALETTE.stoneDark,
    ruin: PALETTE.ruinSilhouette,
    starBright: PALETTE.energyGlow,
    starDim: PALETTE.stoneHighlight,
  },
  awakening: {
    skyTop: PALETTE.awSkyTop,
    skyMid: PALETTE.awSkyMid,
    skyLow: PALETTE.awSkyLow,
    far: PALETTE.awMountainFar,
    farEdge: PALETTE.awMountainEdge,
    ruin: PALETTE.awRuinSilhouette,
    starBright: PALETTE.cyanAccent,
    starDim: PALETTE.magenta,
  },
};

/** Tile indices inside the `tiles` texture. */
export const TILE = { top: 0, body: 1, bodyCrack: 2, ledge: 3, bridge: 4, spikes: 5, decay: 6 } as const;

/** Watcher frames inside the `watcher` texture. */
export const WATCHER_FRAME = { width: 18, height: 22 } as const;
export const WATCHER_FRAMES = ['w-idle', 'w-walk'] as const;

export const PLAYER_FRAMES = ['idle0', 'idle1', 'run0', 'run1', 'run2', 'run3', 'jump', 'fall'] as const;

type Ctx = CanvasRenderingContext2D;

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(scene: Phaser.Scene, key: string, width: number, height: number): Ctx {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const texture = scene.textures.createCanvas(key, width, height);
  if (!texture) throw new Error(`Could not create texture "${key}".`);
  const ctx = texture.getContext();
  ctx.imageSmoothingEnabled = false;
  return ctx;
}

function refresh(scene: Phaser.Scene, key: string): void {
  (scene.textures.get(key) as Phaser.Textures.CanvasTexture).refresh();
}

function px(ctx: Ctx, x: number, y: number, w: number, h: number, color: number): void {
  ctx.fillStyle = hex(color);
  ctx.fillRect(x, y, w, h);
}

/** Generates every texture the game uses. Nothing is loaded from disk. */
export function generateTextures(scene: Phaser.Scene): void {
  generateTiles(scene, 'forgotten');
  generateTiles(scene, 'awakening');
  generatePlayer(scene);
  generateBackgrounds(scene, 'forgotten');
  generateBackgrounds(scene, 'awakening');
  generateObjects(scene);
  generateUi(scene);
}

function generateTiles(scene: Phaser.Scene, dimension: Dimension): void {
  const t = TILE_THEMES[dimension];
  const key = DIMENSION_TEXTURES[dimension].tiles;
  const ctx = makeCanvas(scene, key, TILE_SIZE * 7, TILE_SIZE);
  const rand = mulberry32(1337);

  const drawBricks = (ox: number) => {
    px(ctx, ox, 0, TILE_SIZE, TILE_SIZE, t.mid);
    // Two courses of bricks, 8px tall, offset against each other.
    px(ctx, ox, 7, TILE_SIZE, 1, t.mortar);
    px(ctx, ox, 15, TILE_SIZE, 1, t.mortar);
    px(ctx, ox + 7, 0, 1, 7, t.mortar);
    px(ctx, ox + 3, 8, 1, 7, t.mortar);
    px(ctx, ox + 11, 8, 1, 7, t.mortar);
    // Brick highlights and shadows.
    for (const [bx, by, bw] of [
      [0, 0, 7],
      [8, 0, 7],
      [0, 8, 3],
      [4, 8, 7],
      [12, 8, 4],
    ] as const) {
      px(ctx, ox + bx, by, bw, 1, t.light);
      px(ctx, ox + bx, by + 6, bw, 1, t.dark);
    }
    // Speckle.
    for (let i = 0; i < 10; i++) {
      const x = ox + Math.floor(rand() * TILE_SIZE);
      const y = Math.floor(rand() * TILE_SIZE);
      px(ctx, x, y, 1, 1, rand() > 0.5 ? t.dark : t.light);
    }
  };

  // 0: top surface with a worn highlight edge.
  drawBricks(0);
  px(ctx, 0, 0, TILE_SIZE, 2, t.highlight);
  px(ctx, 0, 2, TILE_SIZE, 1, t.light);
  for (let x = 0; x < TILE_SIZE; x += 1) {
    if (rand() > 0.7) px(ctx, x, 0, 1, 1, t.light);
  }

  // 1: plain body.
  drawBricks(TILE_SIZE);

  // 2: body with a crack.
  drawBricks(TILE_SIZE * 2);
  for (const [x, y] of [
    [5, 2],
    [6, 3],
    [6, 4],
    [7, 5],
    [8, 6],
    [8, 7],
    [9, 8],
    [10, 9],
  ] as const) {
    px(ctx, TILE_SIZE * 2 + x, y, 1, 1, t.crack);
  }

  // 3: thin ledge, lit on top and shadowed beneath.
  const ox = TILE_SIZE * 3;
  px(ctx, ox, 0, TILE_SIZE, 8, t.mid);
  px(ctx, ox, 0, TILE_SIZE, 2, t.highlight);
  px(ctx, ox, 2, TILE_SIZE, 1, t.light);
  px(ctx, ox, 6, TILE_SIZE, 1, t.dark);
  px(ctx, ox, 7, TILE_SIZE, 1, t.mortar);
  px(ctx, ox + 7, 3, 1, 3, t.mortar);
  px(ctx, ox + 14, 3, 1, 3, t.mortar);
  px(ctx, ox + 3, 8, 3, 1, t.shadow);
  px(ctx, ox + 10, 8, 2, 1, t.shadow);

  drawBridgeTile(ctx, TILE_SIZE * TILE.bridge);
  drawSpikeTile(ctx, TILE_SIZE * TILE.spikes, dimension);
  drawDecayTile(ctx, TILE_SIZE * TILE.decay, dimension);
  if (dimension === 'awakening') drawCrystalAccents(ctx, rand);

  refresh(scene, key);
}

/** Sharp, pointy triangular spikes jutting upward. Dangerous in both dimensions. */
function drawSpikeTile(ctx: Ctx, ox: number, dimension: Dimension): void {
  const t = TILE_THEMES[dimension];
  const tipColor = dimension === 'awakening' ? PALETTE.neonCoral : PALETTE.dangerRed;
  const edgeColor = dimension === 'awakening' ? PALETTE.cyanAccent : PALETTE.white;
  const bodyColor = dimension === 'awakening' ? PALETTE.magenta : PALETTE.stoneLight;
  const shadowColor = dimension === 'awakening' ? PALETTE.crystalShadow : PALETTE.deepNavy;

  // Base mount strip (row 14-15)
  px(ctx, ox, 15, TILE_SIZE, 1, shadowColor);
  px(ctx, ox, 14, TILE_SIZE, 1, t.mortar);

  // Two sharp triangular teeth per 16px tile (8px wide each)
  for (let s = 0; s < 2; s++) {
    const sx = ox + s * 8;

    // Row 3: sharp needle tip (1px)
    px(ctx, sx + 3, 3, 1, 1, tipColor);

    // Rows 4-5: narrowing tip (2px)
    px(ctx, sx + 3, 4, 1, 2, tipColor);
    px(ctx, sx + 4, 4, 1, 2, shadowColor);

    // Rows 6-8: upper triangular taper (4px)
    px(ctx, sx + 2, 6, 1, 3, edgeColor);
    px(ctx, sx + 3, 6, 2, 3, bodyColor);
    px(ctx, sx + 5, 6, 1, 3, shadowColor);

    // Rows 9-12: mid body (6px)
    px(ctx, sx + 1, 9, 1, 4, edgeColor);
    px(ctx, sx + 2, 9, 4, 4, t.mid);
    px(ctx, sx + 6, 9, 1, 4, shadowColor);

    // Rows 13-14: wide base (8px)
    px(ctx, sx, 13, 1, 2, edgeColor);
    px(ctx, sx + 1, 13, 6, 2, t.dark);
    px(ctx, sx + 7, 13, 1, 2, shadowColor);
  }
}

/** Decaying platform: a fragile, crumbling stone ledge with visible cracks and erosion. */
function drawDecayTile(ctx: Ctx, ox: number, dimension: Dimension): void {
  const t = TILE_THEMES[dimension];
  // Broken crumbled slab: 8px tall
  px(ctx, ox + 1, 0, TILE_SIZE - 2, 8, t.mid);
  // Highlight with gaps (cracked worn top)
  px(ctx, ox + 1, 0, 4, 1, t.highlight);
  px(ctx, ox + 7, 0, 3, 1, t.highlight);
  px(ctx, ox + 12, 0, 2, 1, t.highlight);
  // Deep cracks
  px(ctx, ox + 4, 1, 1, 3, t.crack);
  px(ctx, ox + 5, 3, 1, 4, t.crack);
  px(ctx, ox + 10, 2, 1, 4, t.crack);
  px(ctx, ox + 11, 5, 1, 2, t.crack);
  // Crumbling bottom
  px(ctx, ox + 2, 7, TILE_SIZE - 4, 1, t.dark);
  px(ctx, ox + 3, 8, 2, 2, t.shadow);
  px(ctx, ox + 9, 8, 3, 1, t.shadow);
}

/** Energy bridge: a bright ribbon on top with light dripping from it. Same look in both worlds. */
function drawBridgeTile(ctx: Ctx, ox: number): void {
  px(ctx, ox, 0, TILE_SIZE, 1, PALETTE.white);
  px(ctx, ox, 1, TILE_SIZE, 2, PALETTE.energyGlow);
  px(ctx, ox, 3, TILE_SIZE, 2, PALETTE.crystalLight);
  px(ctx, ox, 5, TILE_SIZE, 1, PALETTE.crystalMid);
  for (let x = 1; x < TILE_SIZE; x += 4) {
    px(ctx, ox + x, 6, 1, 3, PALETTE.magenta);
    px(ctx, ox + x, 9, 1, 1, PALETTE.crystalMid);
  }
  px(ctx, ox, 0, 1, 1, PALETTE.cyanAccent);
  px(ctx, ox + TILE_SIZE - 1, 0, 1, 1, PALETTE.cyanAccent);
}

function drawCrystalAccents(ctx: Ctx, rand: () => number): void {
  // Glowing veins on surfaces and a few magenta flecks inside the stone.
  for (const ox of [0, TILE_SIZE, TILE_SIZE * 2]) {
    for (let i = 0; i < 3; i++) {
      const x = ox + 1 + Math.floor(rand() * (TILE_SIZE - 2));
      const y = ox === 0 ? 3 + Math.floor(rand() * 12) : Math.floor(rand() * TILE_SIZE);
      px(ctx, x, y, 1, 1, rand() > 0.5 ? PALETTE.magenta : PALETTE.crystalHighlight);
    }
  }
  // A small crystal shard growing from the top surface.
  px(ctx, 5, 0, 1, 1, PALETTE.white);
  px(ctx, 10, 0, 1, 1, PALETTE.crystalHighlight);
  // Ledge underside glow.
  px(ctx, TILE_SIZE * 3 + 4, 8, 4, 1, PALETTE.magenta);
}

function drawPlayerFrame(ctx: Ctx, ox: number, name: (typeof PLAYER_FRAMES)[number]): void {
  const bob = name === 'idle1' || name === 'run1' || name === 'run3' ? 1 : 0;
  const airborne = name === 'jump' || name === 'fall';
  const y = (v: number) => v - bob;

  // Scarf tail trails behind (left). It lifts when falling and drops when rising.
  const tailShift = name === 'fall' ? -3 : name === 'jump' ? 1 : name.startsWith('run') ? -1 : 0;
  px(ctx, ox + 2, y(10) + tailShift, 3, 2, PALETTE.scarf);
  px(ctx, ox + 1, y(11) + tailShift + 1, 2, 2, PALETTE.scarfDark);

  // Legs and boots.
  const leg = (lx: number, top: number, height: number) => {
    px(ctx, ox + lx, top, 2, height, PALETTE.cloakDark);
    px(ctx, ox + lx, top + height - 1, 3, 1, PALETTE.boot);
  };
  switch (name) {
    case 'run0':
      leg(4, 18, 5);
      leg(10, 18, 3);
      break;
    case 'run2':
      leg(5, 18, 3);
      leg(9, 18, 5);
      break;
    case 'jump':
      leg(5, 18, 3);
      leg(9, 18, 3);
      break;
    case 'fall':
      leg(5, 18, 5);
      leg(9, 18, 5);
      break;
    default:
      leg(5, 18, 5);
      leg(9, 18, 5);
  }

  // Cloak body, flared at the hem.
  px(ctx, ox + 4, y(9), 8, 9, PALETTE.cloak);
  px(ctx, ox + (airborne ? 2 : 3), y(14), airborne ? 12 : 10, 4, PALETTE.cloak);
  px(ctx, ox + 4, y(9), 1, 9, PALETTE.cloakLight);
  px(ctx, ox + 11, y(11), 1, 7, PALETTE.cloakDark);
  px(ctx, ox + (airborne ? 2 : 3), y(17), airborne ? 12 : 10, 1, PALETTE.cloakDark);

  // Scarf at the neck.
  px(ctx, ox + 4, y(9), 8, 1, PALETTE.scarf);

  // Hood and face.
  px(ctx, ox + 5, y(2), 6, 1, PALETTE.hoodDark);
  px(ctx, ox + 4, y(3), 8, 6, PALETTE.cloakDark);
  px(ctx, ox + 4, y(3), 1, 6, PALETTE.cloak);
  px(ctx, ox + 6, y(5), 5, 4, PALETTE.face);
  px(ctx, ox + 8, y(6), 1, 1, PALETTE.eye);
  px(ctx, ox + 10, y(6), 1, 1, PALETTE.eye);
  // Hood tip.
  px(ctx, ox + 3, y(5), 1, 3, PALETTE.hoodDark);
}

function generatePlayer(scene: Phaser.Scene): void {
  const width = PLAYER_FRAME.width * PLAYER_FRAMES.length;
  const ctx = makeCanvas(scene, TEXTURE.player, width, PLAYER_FRAME.height);
  PLAYER_FRAMES.forEach((name, index) => drawPlayerFrame(ctx, index * PLAYER_FRAME.width, name));
  refresh(scene, TEXTURE.player);

  const texture = scene.textures.get(TEXTURE.player);
  PLAYER_FRAMES.forEach((name, index) => {
    if (!texture.has(name)) {
      texture.add(name, 0, index * PLAYER_FRAME.width, 0, PLAYER_FRAME.width, PLAYER_FRAME.height);
    }
  });

  const make = (key: string, frames: string[], frameRate: number, repeat: number) => {
    if (scene.anims.exists(key)) return;
    scene.anims.create({
      key,
      frames: frames.map((frame) => ({ key: TEXTURE.player, frame })),
      frameRate,
      repeat,
    });
  };
  make('player-idle', ['idle0', 'idle1'], 2, -1);
  make('player-run', ['run0', 'run1', 'run2', 'run3'], 10, -1);
  make('player-jump', ['jump'], 1, 0);
  make('player-fall', ['fall'], 1, 0);
}

function generateBackgrounds(scene: Phaser.Scene, dimension: Dimension): void {
  const theme = BACKGROUND_THEMES[dimension];
  const keys = DIMENSION_TEXTURES[dimension];
  // Sky: banded vertical gradient with checker-dithered band edges.
  const sky = makeCanvas(scene, keys.sky, GAME_WIDTH, GAME_HEIGHT);
  const bandCount = 9;
  const lerpColor = (a: number, b: number, t: number) => {
    const ch = (shift: number) =>
      Math.round(((a >> shift) & 0xff) * (1 - t) + ((b >> shift) & 0xff) * t);
    return (ch(16) << 16) | (ch(8) << 8) | ch(0);
  };
  const bands = Array.from({ length: bandCount }, (_, i) => {
    const t = i / (bandCount - 1);
    return t < 0.5
      ? lerpColor(theme.skyTop, theme.skyMid, t * 2)
      : lerpColor(theme.skyMid, theme.skyLow, (t - 0.5) * 2);
  });
  const bandHeight = Math.ceil(GAME_HEIGHT / bandCount);
  bands.forEach((color, i) => px(sky, 0, i * bandHeight, GAME_WIDTH, bandHeight, color));
  for (let i = 1; i < bandCount; i++) {
    const edge = i * bandHeight;
    for (let x = 0; x < GAME_WIDTH; x += 2) {
      px(sky, x + (i % 2), edge - 1, 1, 1, bands[i]);
      px(sky, x + ((i + 1) % 2), edge, 1, 1, bands[i - 1]);
    }
  }
  const rand = mulberry32(42);
  for (let i = 0; i < 60; i++) {
    const x = Math.floor(rand() * GAME_WIDTH);
    const y = Math.floor(rand() * GAME_HEIGHT * 0.6);
    px(sky, x, y, 1, 1, rand() > 0.85 ? theme.starBright : theme.starDim);
  }
  refresh(scene, keys.sky);

  // Far mountains. Sine periods divide the width so the layer tiles seamlessly.
  const far = makeCanvas(scene, keys.far, GAME_WIDTH, GAME_HEIGHT);
  const wave = (x: number, cycles: number, phase: number) =>
    Math.sin(((x / GAME_WIDTH) * cycles + phase) * Math.PI * 2);
  for (let x = 0; x < GAME_WIDTH; x++) {
    const h = 70 + wave(x, 2, 0.1) * 26 + wave(x, 5, 0.4) * 10 + wave(x, 11, 0.7) * 4;
    const top = Math.round(GAME_HEIGHT - 60 - h);
    px(far, x, top, 1, GAME_HEIGHT - top, theme.far);
    px(far, x, top, 1, 1, theme.farEdge);
  }
  refresh(scene, keys.far);

  // Near ruins: broken pillars and arches in silhouette.
  const near = makeCanvas(scene, keys.near, GAME_WIDTH, GAME_HEIGHT);
  const base = GAME_HEIGHT - 30;
  px(near, 0, base, GAME_WIDTH, GAME_HEIGHT - base, theme.ruin);
  const pillars = [
    { x: 40, w: 14, h: 120 },
    { x: 96, w: 12, h: 70 },
    { x: 190, w: 16, h: 150 },
    { x: 222, w: 16, h: 100 },
    { x: 330, w: 12, h: 90 },
    { x: 396, w: 18, h: 135 },
  ];
  for (const p of pillars) {
    const top = base - p.h;
    px(near, p.x, top, p.w, p.h, theme.ruin);
    px(near, p.x - 2, top, p.w + 4, 4, theme.ruin);
    px(near, p.x - 2, base - 6, p.w + 4, 6, theme.ruin);
    // Broken top edge.
    for (let i = 0; i < p.w; i += 3) px(near, p.x + i, top - 2, 2, 2, theme.ruin);
  }
  // Arch between the two tall pillars.
  px(near, 206, base - 150, 16, 6, theme.ruin);
  px(near, 208, base - 144, 12, 3, theme.ruin);
  px(near, 211, base - 141, 6, 2, theme.ruin);
  if (dimension === 'awakening') drawAwakeningNear(near, base, pillars, theme);
  refresh(scene, keys.near);
}

function drawAwakeningNear(
  near: Ctx,
  base: number,
  pillars: { x: number; w: number; h: number }[],
  theme: BackgroundTheme,
): void {
  // The same ruins, restored: crystals grow from every pillar top and glow along an edge.
  for (const p of pillars) {
    const top = base - p.h;
    px(near, p.x, top, 1, p.h, PALETTE.crystalDark);
    const cx = p.x + Math.floor(p.w / 2);
    px(near, cx - 1, top - 8, 3, 8, PALETTE.awSpire);
    px(near, cx, top - 12, 1, 4, PALETTE.awSpire);
    px(near, cx, top - 8, 1, 6, PALETTE.crystalHighlight);
    px(near, cx - 1, top - 9, 1, 1, theme.starBright);
  }
  // Restored arch keystone with a glow.
  px(near, 212, base - 150 - 4, 4, 2, PALETTE.crystalHighlight);
  // Floating fragments of the ruins.
  const shards = [
    [70, 60, 6, 4],
    [150, 40, 4, 3],
    [275, 70, 7, 4],
    [360, 45, 5, 3],
    [440, 80, 4, 3],
  ] as const;
  for (const [x, y, w, h] of shards) {
    px(near, x, y, w, h, theme.ruin);
    px(near, x, y, w, 1, PALETTE.crystalLight);
    px(near, x + 1, y + h, w - 2, 1, PALETTE.crystalShadow);
  }
}

function generateObjects(scene: Phaser.Scene): void {
  generateWatcher(scene);
  generateSequenceParts(scene);

  // Echo Fragment: a faceted crystal, flat dark base to bright core.
  const frag = makeCanvas(scene, TEXTURE.fragment, 12, 16);
  const shape = [
    '000001100000',
    '000011110000',
    '000111111000',
    '001111111100',
    '011111111110',
    '011111111110',
    '011111111110',
    '011111111110',
    '001111111100',
    '001111111100',
    '000111111000',
    '000111111000',
    '000011110000',
    '000011110000',
    '000001100000',
    '000000000000',
  ];
  shape.forEach((row, y) =>
    [...row].forEach((bit, x) => {
      if (bit !== '1') return;
      const left = x < 6;
      let color: number = left ? PALETTE.crystalLight : PALETTE.crystalMid;
      if (y > 9) color = left ? PALETTE.crystalMid : PALETTE.crystalDark;
      px(frag, x, y, 1, 1, color);
    }),
  );
  px(frag, 5, 2, 2, 3, PALETTE.crystalHighlight);
  px(frag, 5, 5, 2, 4, PALETTE.cyanAccent);
  px(frag, 5, 4, 1, 1, PALETTE.white);
  px(frag, 3, 6, 1, 3, PALETTE.crystalHighlight);
  px(frag, 8, 10, 1, 2, PALETTE.crystalShadow);
  refresh(scene, TEXTURE.fragment);

  // Soft halo: concentric stepped discs, drawn white so it can be tinted.
  const halo = makeCanvas(scene, TEXTURE.halo, 32, 32);
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const d = Math.hypot(x - 15.5, y - 15.5);
      if (d > 15.5) continue;
      const alpha = d < 6 ? 0.5 : d < 10 ? 0.28 : d < 13 ? 0.14 : 0.06;
      halo.fillStyle = `rgba(255,255,255,${alpha})`;
      halo.fillRect(x, y, 1, 1);
    }
  }
  refresh(scene, TEXTURE.halo);

  // Checkpoint pylon, dormant and lit.
  const pylon = (key: string, lit: boolean) => {
    const c = makeCanvas(scene, key, 14, 30);
    const body = lit ? PALETTE.crystalLight : PALETTE.stoneMid;
    const dark = lit ? PALETTE.crystalDark : PALETTE.stoneDark;
    px(c, 2, 26, 10, 4, dark);
    px(c, 1, 28, 12, 2, PALETTE.stoneShadow);
    px(c, 4, 12, 6, 14, body);
    px(c, 4, 12, 1, 14, lit ? PALETTE.crystalHighlight : PALETTE.stoneLight);
    px(c, 9, 14, 1, 12, dark);
    px(c, 3, 24, 8, 2, dark);
    // Crystal tip.
    px(c, 6, 3, 2, 3, lit ? PALETTE.white : PALETTE.stoneLight);
    px(c, 5, 6, 4, 4, lit ? PALETTE.cyanAccent : PALETTE.stoneMid);
    px(c, 6, 10, 2, 2, lit ? PALETTE.crystalHighlight : PALETTE.stoneDark);
    if (lit) {
      px(c, 6, 7, 2, 2, PALETTE.white);
      px(c, 3, 8, 1, 1, PALETTE.magenta);
      px(c, 10, 6, 1, 1, PALETTE.magenta);
    }
    refresh(scene, key);
  };
  pylon(TEXTURE.checkpointOff, false);
  pylon(TEXTURE.checkpointOn, true);

  // Portal arch: two pillars and a rounded lintel around an open centre.
  const arch = makeCanvas(scene, TEXTURE.portalArch, 32, 48);
  const stone = PALETTE.stoneMid;
  px(arch, 0, 10, 6, 38, stone);
  px(arch, 26, 10, 6, 38, stone);
  px(arch, 4, 4, 24, 6, stone);
  px(arch, 8, 0, 16, 5, stone);
  px(arch, 0, 10, 1, 38, PALETTE.stoneLight);
  px(arch, 26, 10, 1, 38, PALETTE.stoneLight);
  px(arch, 5, 10, 1, 38, PALETTE.stoneDark);
  px(arch, 31, 10, 1, 38, PALETTE.stoneDark);
  px(arch, 8, 0, 16, 1, PALETTE.stoneHighlight);
  px(arch, 4, 4, 4, 1, PALETTE.stoneHighlight);
  px(arch, 24, 4, 4, 1, PALETTE.stoneHighlight);
  px(arch, 6, 9, 20, 1, PALETTE.stoneDark);
  px(arch, 13, 1, 6, 3, PALETTE.stoneDark);
  px(arch, 15, 2, 2, 1, PALETTE.cyanAccent);
  for (let y = 16; y < 48; y += 8) {
    px(arch, 0, y, 6, 1, PALETTE.mortar);
    px(arch, 26, y, 6, 1, PALETTE.mortar);
  }
  px(arch, 0, 44, 6, 4, PALETTE.stoneDark);
  px(arch, 26, 44, 6, 4, PALETTE.stoneDark);
  refresh(scene, TEXTURE.portalArch);

  // Portal core: a soft oval, drawn white so it can be tinted and pulsed.
  const core = makeCanvas(scene, TEXTURE.portalCore, 20, 38);
  for (let y = 0; y < 38; y++) {
    for (let x = 0; x < 20; x++) {
      const dx = (x - 9.5) / 9.5;
      const dy = (y - 18) / 19;
      const d = Math.hypot(dx, dy);
      if (d > 1) continue;
      const band = Math.floor(d * 4);
      const alpha = [0.95, 0.7, 0.45, 0.25][band] ?? 0.2;
      core.fillStyle = `rgba(255,255,255,${alpha})`;
      core.fillRect(x, y, 1, 1);
    }
  }
  refresh(scene, TEXTURE.portalCore);
}

/** The Watcher: a black silhouette with a cyan rim light and one red eye. */
function generateWatcher(scene: Phaser.Scene): void {
  const { width, height } = WATCHER_FRAME;
  const ctx = makeCanvas(scene, TEXTURE.watcher, width * WATCHER_FRAMES.length, height);
  const rim = PALETTE.cyanAccent;
  const dark = 0x05070f;

  WATCHER_FRAMES.forEach((name, index) => {
    const ox = index * width;
    const stride = name === 'w-walk' ? 1 : 0;
    // Rim first, then the body inset by one pixel so a thin cyan outline remains.
    const body = (inset: number, color: number) => {
      px(ctx, ox + 4 + inset, 3 + inset, 10 - inset * 2, 14 - inset * 2, color);
      px(ctx, ox + 3 + inset, 8 + inset, 12 - inset * 2, 8 - inset * 2, color);
      px(ctx, ox + 5 + inset, 1 + inset, 8 - inset * 2, 3, color);
      // Ragged hem.
      for (let x = 3; x < 15; x += 3) px(ctx, ox + x + inset, 16, 2 - inset, 3 + (x % 2), color);
      // Spikes on the back.
      px(ctx, ox + 2 + inset, 6 + inset, 2, 2, color);
      px(ctx, ox + 14 - inset, 5 + inset, 2, 3, color);
    };
    body(0, rim);
    body(1, dark);
    // Legs.
    px(ctx, ox + 6, 18, 2, 4 - stride, dark);
    px(ctx, ox + 10, 18, 2, 3 + stride, dark);
    px(ctx, ox + 6, 21 - stride, 3, 1, rim);
    px(ctx, ox + 10, 21 - (1 - stride), 3, 1, rim);
    // The single red eye, looking left.
    px(ctx, ox + 6, 7, 3, 3, 0xff2b3d);
    px(ctx, ox + 6, 7, 1, 1, 0xffd0d4);
  });
  refresh(scene, TEXTURE.watcher);
  const tex = scene.textures.get(TEXTURE.watcher);
  WATCHER_FRAMES.forEach((name, index) => {
    if (!tex.has(name)) tex.add(name, 0, index * width, 0, width, height);
  });
  if (!scene.anims.exists('watcher-walk')) {
    scene.anims.create({
      key: 'watcher-walk',
      frames: WATCHER_FRAMES.map((frame) => ({ key: TEXTURE.watcher, frame })),
      frameRate: 4,
      repeat: -1,
    });
  }
}

function generateSequenceParts(scene: Phaser.Scene): void {
  // Sequence crystal: drawn white so it can take any of the puzzle colours.
  const c = makeCanvas(scene, TEXTURE.seqCrystal, 12, 18);
  const rows = [
    '000001100000',
    '000011110000',
    '000111111000',
    '001111111100',
    '011111111110',
    '011111111110',
    '011111111110',
    '011111111110',
    '011111111110',
    '011111111110',
    '001111111100',
    '001111111100',
    '000111111000',
    '000111111000',
    '000011110000',
    '000011110000',
    '000001100000',
    '000000000000',
  ];
  rows.forEach((row, y) =>
    [...row].forEach((bit, x) => {
      if (bit !== '1') return;
      const shade = x < 4 ? 1 : x > 7 ? 0.62 : 0.85;
      const v = Math.round(255 * shade);
      c.fillStyle = `rgb(${v},${v},${v})`;
      c.fillRect(x, y, 1, 1);
    }),
  );
  px(c, 5, 3, 2, 12, PALETTE.white);
  refresh(scene, TEXTURE.seqCrystal);

  // Gate bars: a repeating 16x16 stone grille.
  const gate = makeCanvas(scene, TEXTURE.gate, 16, 16);
  px(gate, 0, 0, 16, 16, PALETTE.stoneShadow);
  px(gate, 2, 0, 5, 16, PALETTE.stoneMid);
  px(gate, 9, 0, 5, 16, PALETTE.stoneMid);
  px(gate, 2, 0, 1, 16, PALETTE.stoneHighlight);
  px(gate, 9, 0, 1, 16, PALETTE.stoneHighlight);
  px(gate, 6, 0, 1, 16, PALETTE.stoneDark);
  px(gate, 13, 0, 1, 16, PALETTE.stoneDark);
  px(gate, 0, 7, 16, 2, PALETTE.stoneDark);
  px(gate, 0, 7, 16, 1, PALETTE.stoneLight);
  px(gate, 7, 3, 2, 2, PALETTE.cyanAccent);
  refresh(scene, TEXTURE.gate);
}

function drawIcon(ctx: Ctx, rows: string[], color: number): void {
  rows.forEach((row, y) => {
    [...row].forEach((bit, x) => {
      if (bit === '1') px(ctx, x, y, 1, 1, color);
    });
  });
}

function generateUi(scene: Phaser.Scene): void {
  const dot = makeCanvas(scene, TEXTURE.pixel, 2, 2);
  px(dot, 0, 0, 2, 2, PALETTE.white);
  refresh(scene, TEXTURE.pixel);

  // Touch button: stepped-corner panel, drawn white so it can be tinted.
  const size = 48;
  const btn = makeCanvas(scene, TEXTURE.btn, size, size);
  px(btn, 4, 0, size - 8, size, PALETTE.white);
  px(btn, 0, 4, size, size - 8, PALETTE.white);
  px(btn, 2, 2, size - 4, size - 4, PALETTE.white);
  px(btn, 4, 4, size - 8, size - 8, PALETTE.deepNavy);
  px(btn, 2, 6, 2, size - 12, PALETTE.deepNavy);
  px(btn, size - 4, 6, 2, size - 12, PALETTE.deepNavy);
  px(btn, 6, 2, size - 12, 2, PALETTE.deepNavy);
  px(btn, 6, size - 4, size - 12, 2, PALETTE.deepNavy);
  refresh(scene, TEXTURE.btn);

  const left = makeCanvas(scene, TEXTURE.iconLeft, 10, 14);
  drawIcon(
    left,
    [
      '0000000011',
      '0000001111',
      '0000111111',
      '0011111111',
      '1111111111',
      '0011111111',
      '0000111111',
      '0000001111',
      '0000000011',
    ],
    PALETTE.white,
  );
  refresh(scene, TEXTURE.iconLeft);

  const right = makeCanvas(scene, TEXTURE.iconRight, 10, 14);
  drawIcon(
    right,
    [
      '1100000000',
      '1111000000',
      '1111110000',
      '1111111100',
      '1111111111',
      '1111111100',
      '1111110000',
      '1111000000',
      '1100000000',
    ],
    PALETTE.white,
  );
  refresh(scene, TEXTURE.iconRight);

  const jump = makeCanvas(scene, TEXTURE.iconJump, 14, 12);
  drawIcon(
    jump,
    [
      '00000011000000',
      '00001111110000',
      '00111111111100',
      '11111111111111',
      '00001111110000',
      '00001111110000',
      '00001111110000',
      '00001111110000',
    ],
    PALETTE.white,
  );
  refresh(scene, TEXTURE.iconJump);

  // Switch icon: a disc split down the middle, one half solid and one half outlined.
  const swap = makeCanvas(scene, TEXTURE.iconSwitch, 16, 16);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const dx = x - 7.5;
      const dy = y - 7.5;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 7.5) continue;
      const ring = dist > 5.6;
      if (ring || x < 8) px(swap, x, y, 1, 1, PALETTE.white);
    }
  }
  refresh(scene, TEXTURE.iconSwitch);

  const pause = makeCanvas(scene, TEXTURE.iconPause, 10, 10);
  px(pause, 1, 0, 3, 10, PALETTE.white);
  px(pause, 6, 0, 3, 10, PALETTE.white);
  refresh(scene, TEXTURE.iconPause);

  const menu = makeCanvas(scene, TEXTURE.iconMenu, 10, 8);
  px(menu, 0, 0, 10, 2, PALETTE.white);
  px(menu, 0, 3, 10, 2, PALETTE.white);
  px(menu, 0, 6, 10, 2, PALETTE.white);
  refresh(scene, TEXTURE.iconMenu);
}
