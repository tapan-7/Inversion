/** Shared colour palette. Anchors come from the design document. */
export const PALETTE = {
  deepNavy: 0x101a32,
  forgottenBlue: 0x263c61,
  awakeningPurple: 0x673e9b,
  energyGlow: 0xc27aff,
  cyanAccent: 0x4fe3e8,

  // Forgotten stone shades, dark to light.
  stoneShadow: 0x16233f,
  stoneDark: 0x1d2e50,
  stoneMid: 0x263c61,
  stoneLight: 0x35517f,
  stoneHighlight: 0x5878ab,
  mortar: 0x131d36,

  // Background shades.
  skyTop: 0x0b1226,
  skyMid: 0x101a32,
  skyLow: 0x1a2a4d,
  mountainFar: 0x172646,
  mountainNear: 0x1b2f55,
  ruinSilhouette: 0x13213f,

  // Player.
  cloak: 0x5b6fb0,
  cloakLight: 0x7f93d6,
  cloakDark: 0x3a4a7c,
  hoodDark: 0x2c3866,
  face: 0x0a0f1e,
  eye: 0xc27aff,
  scarf: 0xc27aff,
  scarfDark: 0x8a4fd0,
  boot: 0x1d2547,

  // Awakening: restored purple stone with crystal light.
  crystalMid: 0x673e9b,
  crystalLight: 0x8a5cc4,
  crystalDark: 0x4a2a73,
  crystalShadow: 0x2e1a4d,
  crystalMortar: 0x1f1038,
  crystalHighlight: 0xc27aff,
  magenta: 0xd45cc9,
  awSkyTop: 0x1a0f33,
  awSkyMid: 0x2d1a54,
  awSkyLow: 0x4a2a7a,
  awMountainFar: 0x3a2268,
  awMountainEdge: 0x5a3590,
  awRuinSilhouette: 0x2a184f,
  awSpire: 0x4a2a7a,

  blocked: 0xff5577,
  danger: 0xff5577,
  dangerRed: 0xff2b3d,
  white: 0xffffff,

  // UI, Card, and Text shades
  cardNavy: 0x131f38,
  textMuted: 0x8fa6d6,
  textDim: 0x5878ab,
  textSubtle: 0x7a98c8,
  textLight: 0x9dbbd8,
  textCaption: 0x6f8bb8,
  gold: 0xffd98a,
} as const;

/** Crystal colours for the ordered sequence puzzle: cyan, magenta, violet, gold. */
export const SEQUENCE_COLORS = [0x4fe3e8, 0xd45cc9, 0xc27aff, 0xffd98a] as const;

export function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}
