import { describe, expect, it } from 'vitest';
import type { TipConfig } from '../src/game/levels/types';
import { TutorialState } from '../src/game/systems/tutorial';

const T = 16;
const tips: TipConfig[] = [
  { id: 'jump', text: 'J', fromCol: 1, toCol: 4, dismiss: 'jump' },
  { id: 'switch', text: 'S', fromCol: 10, toCol: 12, dismiss: 'switch' },
  { id: 'timed', text: 'T', fromCol: 20, toCol: 22, dismiss: 'time', seconds: 2 },
];
const none = { switched: false, jumped: false };

function make(seen: string[] = []) {
  const set = new Set(seen);
  const state = new TutorialState(tips, T, (id) => set.has(id), (id) => set.add(id));
  return { state, set };
}

describe('TutorialState', () => {
  it('shows a tip when the player enters its zone', () => {
    const { state } = make();
    expect(state.update(5 * T, none, 0.016)).toBeNull();
    expect(state.update(2 * T, none, 0.016)).toEqual({ show: tips[0] });
    expect(state.current?.id).toBe('jump');
  });

  it('hides on the matching action and marks the tip seen', () => {
    const { state, set } = make();
    state.update(2 * T, none, 0.016);
    expect(state.update(2 * T, { switched: true, jumped: false }, 0.016)).toBeNull();
    expect(state.update(2 * T, { switched: false, jumped: true }, 0.016)).toEqual({ hide: tips[0] });
    expect(set.has('jump')).toBe(true);
    expect(state.update(2 * T, none, 0.016)).toBeNull();
  });

  it('never shows a tip that was already seen', () => {
    const { state } = make(['jump']);
    expect(state.update(2 * T, none, 0.016)).toBeNull();
  });

  it('hides a timed tip after its duration', () => {
    const { state } = make();
    expect(state.update(21 * T, none, 0.016)).toEqual({ show: tips[2] });
    expect(state.update(21 * T, none, 1)).toBeNull();
    expect(state.update(21 * T, none, 1.1)).toEqual({ hide: tips[2] });
  });

  it('hides once the player has walked away from the zone', () => {
    const { state, set } = make();
    state.update(11 * T, none, 0.016);
    expect(state.update(30 * T, none, 0.5)).toBeNull();
    expect(state.update(30 * T, none, 0.8)).toEqual({ hide: tips[1] });
    expect(set.has('switch')).toBe(true);
  });

  it('keeps a tip while the player stays in the zone', () => {
    const { state } = make();
    state.update(11 * T, none, 0.016);
    for (let i = 0; i < 100; i++) expect(state.update(11 * T, none, 0.05)).toBeNull();
    expect(state.current?.id).toBe('switch');
  });

  it('cancel clears the active tip without marking it seen', () => {
    const { state, set } = make();
    state.update(2 * T, none, 0.016);
    expect(state.cancel()?.id).toBe('jump');
    expect(set.has('jump')).toBe(false);
    expect(state.current).toBeNull();
  });
});
