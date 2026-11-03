import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, PLAYER_FRAME, TILE_SIZE } from '../constants';
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
} as const;

/** Tile indices inside the `tiles` texture. */
export const TILE = { top: 0, body: 1, bodyCrack: 2, ledge: 3 } as const;

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
  generateTiles(scene);
  generatePlayer(scene);
  generateBackgrounds(scene);
  generateUi(scene);
}

function generateTiles(scene: Phaser.Scene): void {
  const ctx = makeCanvas(scene, TEXTURE.tiles, TILE_SIZE * 4, TILE_SIZE);
  const rand = mulberry32(1337);

  const drawBricks = (ox: number) => {
    px(ctx, ox, 0, TILE_SIZE, TILE_SIZE, PALETTE.stoneMid);
    // Two courses of bricks, 8px tall, offset against each other.
    px(ctx, ox, 7, TILE_SIZE, 1, PALETTE.mortar);
    px(ctx, ox, 15, TILE_SIZE, 1, PALETTE.mortar);
    px(ctx, ox + 7, 0, 1, 7, PALETTE.mortar);
    px(ctx, ox + 3, 8, 1, 7, PALETTE.mortar);
    px(ctx, ox + 11, 8, 1, 7, PALETTE.mortar);
    // Brick highlights and shadows.
    for (const [bx, by, bw] of [
      [0, 0, 7],
      [8, 0, 7],
      [0, 8, 3],
      [4, 8, 7],
      [12, 8, 4],
    ] as const) {
      px(ctx, ox + bx, by, bw, 1, PALETTE.stoneLight);
      px(ctx, ox + bx, by + 6, bw, 1, PALETTE.stoneDark);
    }
    // Speckle.
    for (let i = 0; i < 10; i++) {
      const x = ox + Math.floor(rand() * TILE_SIZE);
      const y = Math.floor(rand() * TILE_SIZE);
      px(ctx, x, y, 1, 1, rand() > 0.5 ? PALETTE.stoneDark : PALETTE.stoneLight);
    }
  };

  // 0: top surface with a worn highlight edge.
  drawBricks(0);
  px(ctx, 0, 0, TILE_SIZE, 2, PALETTE.stoneHighlight);
  px(ctx, 0, 2, TILE_SIZE, 1, PALETTE.stoneLight);
  for (let x = 0; x < TILE_SIZE; x += 1) {
    if (rand() > 0.7) px(ctx, x, 0, 1, 1, PALETTE.stoneLight);
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
    px(ctx, TILE_SIZE * 2 + x, y, 1, 1, PALETTE.deepNavy);
  }

  // 3: thin ledge, lit on top and shadowed beneath.
  const ox = TILE_SIZE * 3;
  px(ctx, ox, 0, TILE_SIZE, 8, PALETTE.stoneMid);
  px(ctx, ox, 0, TILE_SIZE, 2, PALETTE.stoneHighlight);
  px(ctx, ox, 2, TILE_SIZE, 1, PALETTE.stoneLight);
  px(ctx, ox, 6, TILE_SIZE, 1, PALETTE.stoneDark);
  px(ctx, ox, 7, TILE_SIZE, 1, PALETTE.mortar);
  px(ctx, ox + 7, 3, 1, 3, PALETTE.mortar);
  px(ctx, ox + 14, 3, 1, 3, PALETTE.mortar);
  px(ctx, ox + 3, 8, 3, 1, PALETTE.stoneShadow);
  px(ctx, ox + 10, 8, 2, 1, PALETTE.stoneShadow);

  refresh(scene, TEXTURE.tiles);
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

function generateBackgrounds(scene: Phaser.Scene): void {
  // Sky: banded vertical gradient with checker-dithered band edges.
  const sky = makeCanvas(scene, TEXTURE.bgSky, GAME_WIDTH, GAME_HEIGHT);
  const bandCount = 9;
  const lerpColor = (a: number, b: number, t: number) => {
    const ch = (shift: number) =>
      Math.round(((a >> shift) & 0xff) * (1 - t) + ((b >> shift) & 0xff) * t);
    return (ch(16) << 16) | (ch(8) << 8) | ch(0);
  };
  const bands = Array.from({ length: bandCount }, (_, i) => {
    const t = i / (bandCount - 1);
    return t < 0.5
      ? lerpColor(PALETTE.skyTop, PALETTE.skyMid, t * 2)
      : lerpColor(PALETTE.skyMid, PALETTE.skyLow, (t - 0.5) * 2);
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
    px(sky, x, y, 1, 1, rand() > 0.85 ? PALETTE.energyGlow : PALETTE.stoneHighlight);
  }
  refresh(scene, TEXTURE.bgSky);

  // Far mountains. Sine periods divide the width so the layer tiles seamlessly.
  const far = makeCanvas(scene, TEXTURE.bgFar, GAME_WIDTH, GAME_HEIGHT);
  const wave = (x: number, cycles: number, phase: number) =>
    Math.sin(((x / GAME_WIDTH) * cycles + phase) * Math.PI * 2);
  for (let x = 0; x < GAME_WIDTH; x++) {
    const h = 70 + wave(x, 2, 0.1) * 26 + wave(x, 5, 0.4) * 10 + wave(x, 11, 0.7) * 4;
    const top = Math.round(GAME_HEIGHT - 60 - h);
    px(far, x, top, 1, GAME_HEIGHT - top, PALETTE.mountainFar);
    px(far, x, top, 1, 1, PALETTE.stoneDark);
  }
  refresh(scene, TEXTURE.bgFar);

  // Near ruins: broken pillars and arches in silhouette.
  const near = makeCanvas(scene, TEXTURE.bgNear, GAME_WIDTH, GAME_HEIGHT);
  const base = GAME_HEIGHT - 30;
  px(near, 0, base, GAME_WIDTH, GAME_HEIGHT - base, PALETTE.ruinSilhouette);
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
    px(near, p.x, top, p.w, p.h, PALETTE.ruinSilhouette);
    px(near, p.x - 2, top, p.w + 4, 4, PALETTE.ruinSilhouette);
    px(near, p.x - 2, base - 6, p.w + 4, 6, PALETTE.ruinSilhouette);
    // Broken top edge.
    for (let i = 0; i < p.w; i += 3) px(near, p.x + i, top - 2, 2, 2, PALETTE.ruinSilhouette);
  }
  // Arch between the two tall pillars.
  px(near, 206, base - 150, 16, 6, PALETTE.ruinSilhouette);
  px(near, 208, base - 144, 12, 3, PALETTE.ruinSilhouette);
  px(near, 211, base - 141, 6, 2, PALETTE.ruinSilhouette);
  refresh(scene, TEXTURE.bgNear);
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

  const menu = makeCanvas(scene, TEXTURE.iconMenu, 10, 8);
  px(menu, 0, 0, 10, 2, PALETTE.white);
  px(menu, 0, 3, 10, 2, PALETTE.white);
  px(menu, 0, 6, 10, 2, PALETTE.white);
  refresh(scene, TEXTURE.iconMenu);
}
