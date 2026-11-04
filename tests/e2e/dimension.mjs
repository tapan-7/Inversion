// Phase 2 browser test: dimension switching. Usage: node tests/e2e/dimension.mjs <baseUrl> <screenshotDir>
import { chromium } from 'playwright';

const baseUrl = process.argv[2] ?? 'http://localhost:5173';
const outDir = process.argv[3] ?? '.';
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
};

const T = 16;
const snap = (page) =>
  page.evaluate(() => {
    const g = window.__game;
    const level = g.scene.getScene('Level');
    const p = level.player;
    return {
      dim: g.registry.get('dimension'),
      busy: level.dimensions.isTransitioning,
      x: p.x, y: p.y, vx: p.body.velocity.x, vy: p.body.velocity.y,
      grounded: p.body.blocked.down,
    };
  });
const place = (page, x, y, vx = 0, vy = 0) =>
  page.evaluate(([x, y, vx, vy]) => {
    const p = window.__game.scene.getScene('Level').player;
    p.setPosition(x, y);
    p.body.setVelocity(vx, vy);
  }, [x, y, vx, vy]);
const settle = (page) => page.waitForTimeout(450);

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'chrome' });
const errors = [];

async function open(contextOptions, query = '?level=test') {
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${baseUrl}${query}`);
  await page.waitForFunction(() => window.__game?.scene.getScenes(true).some((s) => s.scene.key === 'Menu'), null, { timeout: 15000 });
  await page.waitForTimeout(400);
  return page;
}

// Desktop keyboard.
{
  const page = await open({ viewport: { width: 1280, height: 720 } });
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__game.scene.getScenes(true).some((s) => s.scene.key === 'Level'), null, { timeout: 5000 });
  await page.waitForTimeout(800);

  const s0 = await snap(page);
  check('starts in Forgotten', s0.dim === 'forgotten' && s0.grounded);
  await page.screenshot({ path: `${outDir}/dim-1-forgotten.png` });

  // The Forgotten-only wall at column 12 stops the player.
  await page.keyboard.down('d');
  await page.waitForTimeout(1500);
  const wall = await snap(page);
  await page.keyboard.up('d');
  check('Forgotten wall blocks walking right', wall.x < 12 * T, `x=${wall.x.toFixed(1)}`);

  // Switch while running into the wall: velocity and position survive.
  await page.keyboard.down('d');
  await page.waitForTimeout(200);
  const before = await snap(page);
  await page.keyboard.press(' ');
  await page.waitForTimeout(40);
  const after = await snap(page);
  check('switch commits to Awakening', after.dim === 'awakening');
  check('switch never teleports the player', Math.abs(after.x - before.x) < 8 && Math.abs(after.y - before.y) < 2, `dx=${(after.x - before.x).toFixed(2)}`);
  check('transition is running right after the switch', after.busy === true);
  await page.waitForTimeout(140);
  await page.screenshot({ path: `${outDir}/dim-2-mid-transition.png` });
  await settle(page);
  const done = await snap(page);
  check('transition finishes', done.busy === false);
  check('player walks through the wall in Awakening', done.x > 14 * T, `x=${done.x.toFixed(1)}`);
  await page.keyboard.up('d');
  await page.screenshot({ path: `${outDir}/dim-3-awakening.png` });

  // Collision-aware rejection: the pillar at columns 42-43 exists only in Awakening.
  await page.keyboard.press(' ');
  await settle(page);
  check('switch back to Forgotten', (await snap(page)).dim === 'forgotten');
  await place(page, 43 * T, 15 * T);
  await page.waitForTimeout(200);
  const blockedEvents = await page.evaluate(() => {
    window.__blocked = 0;
    window.__game.events.on('dimension:blocked', () => window.__blocked++);
  });
  await page.keyboard.press(' ');
  await page.waitForTimeout(60);
  await page.screenshot({ path: `${outDir}/dim-4-blocked.png` });
  const blocked = await snap(page);
  const nBlocked = await page.evaluate(() => window.__blocked);
  check('switch is rejected inside a target-dimension wall', blocked.dim === 'forgotten' && nBlocked === 1, `dim=${blocked.dim} events=${nBlocked}`);
  check('rejection does not start a transition', blocked.busy === false);

  // Step out beside the pillar: now the switch is accepted.
  await place(page, 40 * T, 15 * T);
  await page.waitForTimeout(200);
  await page.keyboard.press(' ');
  await settle(page);
  check('switch accepted once clear of the pillar', (await snap(page)).dim === 'awakening');

  // Awakening pillar is solid in Awakening: walking right stops against it.
  await place(page, 38 * T, 15 * T);
  await page.keyboard.down('d');
  await page.waitForTimeout(1200);
  await page.keyboard.up('d');
  const pillar = await snap(page);
  check('Awakening pillar collides in Awakening', pillar.x < 42 * T, `x=${pillar.x.toFixed(1)}`);

  // Airborne switch onto an Awakening-only ledge (columns 28-29, row 12, top y=192).
  await page.keyboard.press(' ');
  await settle(page);
  await place(page, 29 * T, 165, 0, 0);
  await page.waitForTimeout(60);
  const falling = await snap(page);
  check('player is airborne and falling before the switch', !falling.grounded && falling.vy > 0, `vy=${falling.vy.toFixed(0)}`);
  await page.keyboard.press(' ');
  await page.waitForTimeout(700);
  const landed = await snap(page);
  check('airborne switch lands on the Awakening-only ledge', landed.dim === 'awakening' && landed.grounded && Math.abs(landed.y - 12 * T) < 2, `y=${landed.y.toFixed(1)}`);

  // Standing on it, switch to Forgotten: the ledge vanishes and the player falls.
  await page.keyboard.press(' ');
  await page.waitForTimeout(150);
  const drop = await snap(page);
  check('ledge disappears when its world is left', drop.dim === 'forgotten' && drop.y > 12 * T + 2 && !drop.grounded, `y=${drop.y.toFixed(1)}`);

  // Rapid presses during a transition are ignored, not queued.
  await place(page, 3 * T, 15 * T);
  await page.waitForTimeout(200);
  const startDim = (await snap(page)).dim;
  await page.keyboard.press(' ');
  await page.keyboard.press(' ');
  await page.keyboard.press(' ');
  await settle(page);
  check('presses during a transition are ignored', (await snap(page)).dim !== startDim);

  // HUD reflects the dimension.
  const hud = await page.evaluate(() => {
    const ui = window.__game.scene.getScene('UI');
    return ui.indicator.text;
  });
  check('HUD indicator shows the current world', hud === (await snap(page)).dim.toUpperCase(), hud);
  await page.context().close();
}

// Phone: the on-screen Switch button.
{
  const page = await open({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  await page.touchscreen.tap(844 / 2, 390 * (158 / 270));
  await page.waitForFunction(() => window.__game.scene.getScenes(true).some((s) => s.scene.key === 'Level'), null, { timeout: 5000 });
  await page.waitForTimeout(800);
  const canvas = await page.evaluate(() => {
    const r = window.__game.canvas.getBoundingClientRect();
    return { w: r.width, h: r.height };
  });
  const W = await page.evaluate(() => window.__game.scale.width);
  const zoom = canvas.w / W;
  const ox = (844 - canvas.w) / 2;
  const oy = (390 - canvas.h) / 2;
  const at = (gx, gy) => ({ x: ox + gx * zoom, y: oy + gy * zoom });
  const sw = at(W - 8 - 56 - 8 - 24, 270 - 8 - 24);
  const jump = at(W - 8 - 28, 270 - 8 - 28);
  await page.screenshot({ path: `${outDir}/dim-5-phone.png` });

  const cdp = await page.context().newCDPSession(page);
  const tap = async (pt) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...pt, id: 1 }] });
    await page.waitForTimeout(90);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };
  check('phone: starts in Forgotten', (await snap(page)).dim === 'forgotten');
  await tap(sw);
  await page.waitForTimeout(500);
  check('phone: Switch button toggles to Awakening', (await snap(page)).dim === 'awakening');
  await tap(sw);
  await page.waitForTimeout(500);
  check('phone: Switch button toggles back', (await snap(page)).dim === 'forgotten');

  // Holding Switch must switch once, not flicker every frame.
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...sw, id: 1 }] });
  await page.waitForTimeout(1200);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  check('phone: holding Switch switches only once', (await snap(page)).dim === 'awakening');

  // Jump and Switch can be pressed together.
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...jump, id: 1 }, { ...sw, id: 2 }] });
  await page.waitForTimeout(150);
  const both = await snap(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  check('phone: jump and switch work together', both.dim === 'forgotten' && !both.grounded, `dim=${both.dim} vy=${both.vy.toFixed(0)}`);
  await page.context().close();
}

check('no console errors', errors.length === 0, errors.join(' | '));
await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
