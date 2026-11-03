import { describe, expect, it } from 'vitest';
import { JumpTimers, moveToward } from '../src/game/systems/movement';

describe('moveToward', () => {
  it('steps toward the target without overshooting', () => {
    expect(moveToward(0, 10, 3)).toBe(3);
    expect(moveToward(9, 10, 3)).toBe(10);
    expect(moveToward(0, -10, 4)).toBe(-4);
    expect(moveToward(5, 5, 1)).toBe(5);
  });
});

describe('JumpTimers', () => {
  it('jumps when grounded and jump is pressed', () => {
    const t = new JumpTimers(0.1, 0.12);
    expect(t.update(0.016, true, true)).toBe(true);
  });

  it('does not jump in the air with no recent ground contact', () => {
    const t = new JumpTimers(0.1, 0.12);
    expect(t.update(0.5, false, true)).toBe(false);
  });

  it('allows a jump shortly after leaving a ledge (coyote time)', () => {
    const t = new JumpTimers(0.1, 0.12);
    t.update(0.016, true, false);
    expect(t.update(0.05, false, true)).toBe(true);
  });

  it('rejects a jump after coyote time has expired', () => {
    const t = new JumpTimers(0.1, 0.12);
    t.update(0.016, true, false);
    t.update(0.1, false, false);
    expect(t.update(0.05, false, true)).toBe(false);
  });

  it('buffers a press made just before landing', () => {
    const t = new JumpTimers(0.1, 0.12);
    expect(t.update(0.016, false, true)).toBe(false);
    expect(t.update(0.05, true, false)).toBe(true);
  });

  it('drops a buffered press that is too old', () => {
    const t = new JumpTimers(0.1, 0.12);
    t.update(0.016, false, true);
    expect(t.update(0.2, true, false)).toBe(false);
  });

  it('cannot trigger two jumps from one press', () => {
    const t = new JumpTimers(0.1, 0.12);
    expect(t.update(0.016, true, true)).toBe(true);
    expect(t.update(0.016, false, false)).toBe(false);
  });
});
