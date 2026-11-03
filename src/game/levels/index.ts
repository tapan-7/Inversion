import { CHAPTER_1 } from './chapter1';
import { CHAPTER_2 } from './chapter2';
import { CHAPTER_3 } from './chapter3';
import { CHAPTER_4 } from './chapter4';
import { CHAPTER_5 } from './chapter5';
import { TEST_LEVEL } from './testLevel';
import type { LevelConfig } from './types';

/** Level keys usable in the `?level=` URL parameter. `test` is the Phase 2 switch test room. */
const LEVELS: Record<string, LevelConfig> = {
  chapter1: CHAPTER_1,
  chapter2: CHAPTER_2,
  chapter3: CHAPTER_3,
  chapter4: CHAPTER_4,
  chapter5: CHAPTER_5,
  test: TEST_LEVEL,
};

export const DEFAULT_LEVEL_KEY = 'chapter1';

export function getLevel(key: string | null | undefined): LevelConfig {
  return LEVELS[key ?? DEFAULT_LEVEL_KEY] ?? CHAPTER_1;
}

/** Level key to open from the menu, taken from the URL query string. */
export function levelKeyFromSearch(search: string): string {
  const key = new URLSearchParams(search).get('level');
  return key && key in LEVELS ? key : DEFAULT_LEVEL_KEY;
}

/** The five chapters in play order. */
export const CHAPTERS: LevelConfig[] = [CHAPTER_1, CHAPTER_2, CHAPTER_3, CHAPTER_4, CHAPTER_5];
