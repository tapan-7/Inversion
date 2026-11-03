// Playwright smoke test. Usage: node tests/e2e/smoke.mjs <baseUrl> <screenshotDir>
import { chromium } from 'playwright';

const baseUrl = process.argv[2] ?? 'http://localhost:5173';
const outDir = process.argv[3] ?? '.';
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
};

const state = (page) =>
  page.evaluate(() => {
    const g = window.__game;
    const level = g.scene.getScene('Level');
    const p = level?.player;
    return {
      scenes: g.scene.getScenes(true).map((s) => s.scene.key),
      px: p?.x, py: p?.y, vy: p?.body?.velocity.y,
      grounded: p?.body?.blocked.down,
      camX: level?.cameras?.main?.scrollX,
      canvas: { w: g.canvas.getBoundingClientRect().width, h: g.canvas.getBoundingClientRect().height },
    };
  });

async function run(label, contextOptions, fn) {
  const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'chrome' });
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('requestfailed', (r) => errors.push(`request failed: ${r.url()}`));
  await page.goto(`${baseUrl}${label.query ?? ''}`);
  await page.waitForFunction(() => window.__game?.scene.getScenes(true).some((s) => s.scene.key === 'Menu'), null, { timeout: 15000 });
  await page.waitForTimeout(500);
  await fn(page);
  check(`${label.name}: no console errors`, errors.length === 0, errors.join(' | '));
  await browser.close();
}

// Desktop: keyboard.
await run({ name: 'desktop 1280x720' }, { viewport: { width: 1280, height: 720 } }, async (page) => {
  await page.screenshot({ path: `${outDir}/desktop-menu.png` });
  const menu = await state(page);
  check('desktop: menu scene active', menu.scenes.includes('Menu'));
  check('desktop: canvas is 4:... 16:9 and fits viewport', menu.canvas.w <= 1280 && menu.canvas.h <= 720 && Math.abs(menu.canvas.w / menu.canvas.h - 480 / 270) < 0.01, JSON.stringify(menu.canvas));

  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__game.scene.getScenes(true).some((s) => s.scene.key === 'Level'), null, { timeout: 5000 });
  await page.waitForTimeout(900);
  const s0 = await state(page);
  check('desktop: level + UI scenes active', s0.scenes.includes('Level') && s0.scenes.includes('UI'));
  check('desktop: player standing on ground', s0.grounded === true, `y=${s0.py}`);
  await page.screenshot({ path: `${outDir}/desktop-level-start.png` });

  await page.keyboard.down('d');
  await page.waitForTimeout(800);
  const s1 = await state(page);
  check('desktop: holding D moves right', s1.px > s0.px + 40, `x ${s0.px} -> ${s1.px}`);
  await page.keyboard.up('d');

  await page.keyboard.down('w');
  await page.waitForTimeout(150);
  const air = await state(page);
  await page.keyboard.up('w');
  check('desktop: W jumps (airborne, moving up)', air.grounded === false && air.vy < 0, `vy=${air.vy}`);
  await page.waitForTimeout(900);
  const land = await state(page);
  check('desktop: lands back on the ground', land.grounded === true);

  // Short tap jumps lower than a held jump.
  const peak = async (holdMs) => {
    let min = Infinity;
    await page.keyboard.down('w');
    const t0 = Date.now();
    let released = false;
    while (Date.now() - t0 < 800) {
      if (!released && Date.now() - t0 >= holdMs) { await page.keyboard.up('w'); released = true; }
      const s = await state(page);
      min = Math.min(min, s.py);
      await page.waitForTimeout(16);
    }
    if (!released) await page.keyboard.up('w');
    return min;
  };
  await page.waitForTimeout(400);
  const baseY = (await state(page)).py;
  const tapPeak = await peak(40);
  await page.waitForTimeout(500);
  const holdPeak = await peak(600);
  check('desktop: variable jump height (hold > tap)', baseY - holdPeak > baseY - tapPeak + 8, `tap rise ${(baseY - tapPeak).toFixed(1)}, hold rise ${(baseY - holdPeak).toFixed(1)}`);

  // Restart, then walk right (stopping before the first pit): camera follows.
  await page.keyboard.press('r');
  await page.waitForTimeout(700);
  const afterR = await state(page);
  check('desktop: R restarts the level', afterR.px < 80 && afterR.scenes.includes('Level'), `x=${afterR.px}`);
  // A Forgotten-only wall stands at column 12. Switch to Awakening to walk through it.
  await page.keyboard.press(' ');
  await page.waitForTimeout(450);
  // Walk right, hopping (stop before the first pit).
  await page.keyboard.down('d');
  for (let i = 0; i < 5; i++) {
    await page.keyboard.down('w');
    await page.waitForTimeout(260);
    await page.keyboard.up('w');
    await page.waitForTimeout(240);
  }
  await page.keyboard.up('d');
  await page.waitForTimeout(500);
  const far = await state(page);
  check('desktop: camera follows the player', far.camX > 0 && far.camX <= far.px - 240 + 1 && far.px > 240, `x=${far.px} camX=${far.camX}`);
  check('desktop: still above the floor line', far.py <= 16 * 16 + 1, `y=${far.py}`);

  // Walk into the first pit without jumping: the player falls and respawns at the start.
  await page.keyboard.down('d');
  let maxX = 0;
  let respawned = false;
  for (let i = 0; i < 80 && !respawned; i++) {
    await page.waitForTimeout(50);
    const s = await state(page);
    maxX = Math.max(maxX, s.px);
    if (maxX > 300 && s.px < 80) respawned = true;
  }
  await page.keyboard.up('d');
  check('desktop: falling into a pit respawns at the start', respawned, `maxX=${maxX}`);

  await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.__game.scene.getScenes(true).some((s) => s.scene.key === 'Menu'), null, { timeout: 5000 });
  const back = await state(page);
  check('desktop: ESC returns to menu and stops UI', back.scenes.includes('Menu') && !back.scenes.includes('UI') && !back.scenes.includes('Level'), back.scenes.join(','));

  // Start again via click to prove re-entry works.
  await page.mouse.click(1280 / 2, 720 * (158 / 270));
  await page.waitForFunction(() => window.__game.scene.getScenes(true).some((s) => s.scene.key === 'Level'), null, { timeout: 5000 });
  check('desktop: clicking START GAME opens the level again', true);
});

// Phone landscape: touch controls.
await run(
  { name: 'phone landscape 844x390', query: '' },
  { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 },
  async (page) => {
    await page.screenshot({ path: `${outDir}/phone-menu.png` });
    const m = await state(page);
    check('phone: canvas fits landscape viewport', m.canvas.w <= 844 && m.canvas.h <= 390 && m.canvas.h > 370, JSON.stringify(m.canvas));
    await page.touchscreen.tap(844 / 2, 390 * (158 / 270));
    await page.waitForFunction(() => window.__game.scene.getScenes(true).some((s) => s.scene.key === 'Level'), null, { timeout: 5000 });
    await page.waitForTimeout(900);
    const s0 = await state(page);
    await page.screenshot({ path: `${outDir}/phone-level.png` });
    check('phone: touch controls visible (UI scene has buttons)', await page.evaluate(() => window.__game.scene.getScene('UI').children.list.filter((c) => c.type === 'Image').length >= 6));

    // Hold the right button with a real touch point via CDP.
    const cdp = await page.context().newCDPSession(page);
    const zoom = m.canvas.w / 480;
    const ox = (844 - m.canvas.w) / 2;
    const oy = (390 - m.canvas.h) / 2;
    const at = (gx, gy) => ({ x: ox + gx * zoom, y: oy + gy * zoom });
    const rightBtn = at(8 + 48 + 6 + 24, 270 - 8 - 24);
    const jumpBtn = at(480 - 8 - 28, 270 - 8 - 28);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...rightBtn, id: 1 }] });
    await page.waitForTimeout(700);
    const s1 = await state(page);
    check('phone: holding right button moves player', s1.px > s0.px + 30, `x ${s0.px} -> ${s1.px}`);
    // Add a second finger on jump while still holding right.
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...rightBtn, id: 1 }, { ...jumpBtn, id: 2 }] });
    await page.waitForTimeout(150);
    const air = await state(page);
    check('phone: multi-touch run + jump', air.grounded === false && air.vy < 0, `vy=${air.vy}`);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(900);
    const stopped = await state(page);
    await page.waitForTimeout(300);
    const stopped2 = await state(page);
    check('phone: releasing buttons stops the player', Math.abs(stopped2.px - stopped.px) < 2, `${stopped.px} -> ${stopped2.px}`);
  },
);

// Phone portrait: rotate overlay.
await run(
  { name: 'phone portrait 390x844' },
  { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true },
  async (page) => {
    await page.screenshot({ path: `${outDir}/phone-portrait.png` });
    const visible = await page.evaluate(() => getComputedStyle(document.getElementById('rotate')).display !== 'none');
    check('portrait: rotate overlay is shown', visible);
    const running = await page.evaluate(() => window.__game.loop.running);
    check('portrait: game loop is asleep', running === false);
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(500);
    const after = await page.evaluate(() => ({
      overlay: getComputedStyle(document.getElementById('rotate')).display,
      running: window.__game.loop.running,
    }));
    check('portrait to landscape: overlay hidden and loop resumed', after.overlay === 'none' && after.running === true, JSON.stringify(after));
  },
);

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
