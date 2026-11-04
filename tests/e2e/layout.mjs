// Layout browser test: the canvas covers the window and everything follows its width.
// Usage: node tests/e2e/layout.mjs <baseUrl> <screenshotDir>
import { chromium } from 'playwright';

const baseUrl = process.argv[2] ?? 'http://localhost:5173';
const outDir = process.argv[3] ?? '.';
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
};
const sleep = (page, ms) => page.waitForTimeout(ms);
const key = async (page, k) => { await page.keyboard.press(k); await sleep(page, 90); };
const info = (page) => page.evaluate(() => {
  const r = window.__game.canvas.getBoundingClientRect();
  return { left: r.left, top: r.top, w: r.width, h: r.height, W: window.__game.scale.width, H: window.__game.scale.height, zoom: window.__game.scale.zoom, vw: window.innerWidth, vh: window.innerHeight };
});
const waitScene = (page, k) => page.waitForFunction((k) => window.__game.scene.getScenes(true).some((s) => s.scene.key === k), k, { timeout: 8000 });
const scenes = (page) => page.evaluate(() => window.__game.scene.getScenes(true).map((s) => s.scene.key));
const textX = (page, scene, text) => page.evaluate(([scene, text]) => window.__game.scene.getScene(scene).children.list.filter((c) => c.type === 'BitmapText' && c.text === text).map((c) => c.x), [scene, text]);

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'chrome' });
const errors = [];
async function open(viewport, query = '', extra = {}) {
  const context = await browser.newContext({ viewport, ...extra });
  await context.addInitScript(() => {
    localStorage.setItem('inversion.settings.v1', JSON.stringify({ lowEffects: false, touchControls: 'auto', volume: 0.7, muted: true, tipsSeen: [] }));
  });
  const page = await context.newPage();
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(baseUrl + query);
  await page.waitForFunction(() => window.__game?.scene.getScenes(true).some((s) => s.scene.key === 'Menu'), null, { timeout: 15000 });
  await sleep(page, 500);
  return { context, page };
}

// The canvas covers the window across many shapes, and the menu is centred.
for (const [vw, vh] of [[1280, 720], [1920, 1080], [1920, 950], [2560, 1080], [1440, 900], [1024, 768], [844, 390], [932, 430]]) {
  const { context, page } = await open({ width: vw, height: vh }, '?level=test', vw < 1000 ? { hasTouch: true, isMobile: true } : {});
  const i = await info(page);
  check(`${vw}x${vh}: the canvas covers the full width`, i.w >= vw - i.zoom * 2 && i.left <= i.zoom * 2 + 1, `canvas ${i.w.toFixed(0)}x${i.h.toFixed(0)} at ${i.left.toFixed(0)}, view ${i.W}x${i.H} zoom ${i.zoom}`);
  check(`${vw}x${vh}: the canvas fits inside the window`, i.w <= vw + 0.5 && i.h <= vh + 0.5);
  const title = await textX(page, 'Menu', 'START GAME');
  check(`${vw}x${vh}: the menu is centred`, title.length > 0 && Math.abs(title[0] - i.W / 2) < 2, `x=${title[0]} centre=${i.W / 2}`);
  const settings = await textX(page, 'Menu', 'SETTINGS');
  check(`${vw}x${vh}: the settings button hugs the right edge`, settings.length > 0 && Math.abs(settings[0] - (i.W - 10)) < 2, `x=${settings[0]} edge=${i.W - 10}`);
  if (vw === 1920 && vh === 950) await page.screenshot({ path: `${outDir}/layout-menu-1920x950.png` });
  if (vw === 844) await page.screenshot({ path: `${outDir}/layout-menu-844x390.png` });
  await context.close();
}

// A live resize keeps the game going and re-lays-out the overlays.
{
  const { context, page } = await open({ width: 1280, height: 720 }, '?level=test&touch=1');
  const before = await info(page);
  await key(page, 'Enter');
  await waitScene(page, 'Level');
  await sleep(page, 900);
  await page.keyboard.down('d');
  await sleep(page, 400);
  await page.keyboard.up('d');
  await sleep(page, 300);
  const x0 = await page.evaluate(() => window.__game.scene.getScene('Level').player.x);
  const jump0 = await page.evaluate(() => window.__game.scene.getScene('UI').touch.jump.rect.x);

  await page.setViewportSize({ width: 1920, height: 950 });
  await sleep(page, 700);
  const after = await info(page);
  check('resize: the logical width grows with the window', after.W > before.W + 50, `${before.W} -> ${after.W}`);
  check('resize: the canvas still covers the window', after.w >= 1920 - after.zoom * 2, `${after.w.toFixed(0)} of 1920`);
  const state = await page.evaluate(() => {
    const l = window.__game.scene.getScene('Level');
    return {
      x: l.player.x,
      camW: l.cameras.main.width,
      sky: l.stacks.forgotten.layers[0].sprite.width,
      skyA: l.stacks.awakening.layers[2].sprite.width,
      jump: window.__game.scene.getScene('UI').touch.jump.rect.x,
      running: window.__game.loop.running,
    };
  });
  check('resize: the level carries on with the player where they were', Math.abs(state.x - x0) < 2 && state.running, `${x0.toFixed(1)} -> ${state.x.toFixed(1)}`);
  check('resize: the camera and backgrounds widen with the view', state.camW === after.W && state.sky === after.W && state.skyA === after.W, JSON.stringify({ cam: state.camW, sky: state.sky, W: after.W }));
  check('resize: the touch buttons stay on the right edge', Math.abs(state.jump - (after.W - 8 - 56)) < 1 && state.jump > jump0, `${jump0} -> ${state.jump}`);
  await page.screenshot({ path: `${outDir}/layout-level-1920x950.png` });

  // The game is still playable at the new size.
  await page.keyboard.down('d');
  await sleep(page, 500);
  await page.keyboard.up('d');
  const x1 = await page.evaluate(() => window.__game.scene.getScene('Level').player.x);
  check('resize: input still moves the player', x1 > state.x + 20, `${state.x.toFixed(0)} -> ${x1.toFixed(0)}`);

  // Pause overlay re-centres without losing the paused level.
  await key(page, 'Escape');
  await sleep(page, 300);
  await page.setViewportSize({ width: 1280, height: 720 });
  await sleep(page, 700);
  const small = await info(page);
  const pauseState = await page.evaluate(() => ({ scenes: window.__game.scene.getScenes(true).map((s) => s.scene.key), paused: window.__game.scene.isPaused('Level') }));
  check('resize while paused: still paused with the pause menu up', pauseState.scenes.includes('Pause') && pauseState.paused, JSON.stringify(pauseState));
  const backdrop = (scene) => page.evaluate((scene) => {
    const r = window.__game.scene.getScene(scene).children.list.find((c) => c.type === 'Rectangle');
    return r ? { w: r.width, h: r.height, x: r.x, y: r.y } : null;
  }, scene);
  const pauseBg = await backdrop('Pause');
  check('resize while paused: the pause backdrop covers the whole screen', pauseBg && pauseBg.w === small.W && pauseBg.h === small.H && pauseBg.x === 0 && pauseBg.y === 0, JSON.stringify({ pauseBg, W: small.W, H: small.H }));
  const resume = await textX(page, 'Pause', 'RESUME');
  check('resize while paused: the pause menu re-centres', resume.length === 1 && Math.abs(resume[0] - small.W / 2) < 2, `x=${resume[0]} centre=${small.W / 2}`);
  await key(page, 'Escape');
  await sleep(page, 400);
  check('resize while paused: resume works', (await scenes(page)).includes('Level') && !(await scenes(page)).includes('Pause'));

  // Settings opened from the menu, then the window changes while it is open.
  await key(page, 'Escape');
  await sleep(page, 250);
  await key(page, 'm');
  await waitScene(page, 'Menu');
  await sleep(page, 400);
  await key(page, 's');
  await waitScene(page, 'Settings');
  await page.setViewportSize({ width: 1600, height: 800 });
  await sleep(page, 700);
  const big = await info(page);
  const settingsBg = await backdrop('Settings');
  check('resize in settings: the backdrop covers the whole screen', settingsBg && settingsBg.w === big.W && settingsBg.h === big.H, JSON.stringify({ settingsBg, W: big.W }));
  const back = await textX(page, 'Settings', 'BACK');
  check('resize in settings: it re-centres', back.length === 1 && Math.abs(back[0] - big.W / 2) < 2, `x=${back[0]} centre=${big.W / 2}`);
  await key(page, 'Escape');
  await sleep(page, 500);
  const menuAgain = await textX(page, 'Menu', 'START GAME');
  check('resize behind settings: the menu catches up when it resumes', menuAgain.length > 0 && Math.abs(menuAgain[0] - big.W / 2) < 2, `x=${menuAgain[0]} centre=${big.W / 2}`);
  await context.close();
}

// Phone landscape: buttons sit at the real corners of the wider view.
{
  const { context, page } = await open({ width: 844, height: 390 }, '?level=test', { hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const i = await info(page);
  const zoom = i.w / i.W;
  await page.touchscreen.tap(i.left + (i.W / 2) * zoom, i.top + 158 * zoom);
  await waitScene(page, 'Level');
  await sleep(page, 900);
  const rects = await page.evaluate(() => {
    const t = window.__game.scene.getScene('UI').touch;
    return { left: t.left.rect.x, jump: t.jump.rect.x + t.jump.rect.width, sw: t.switchButton.rect.x };
  });
  check('phone: buttons are in the corners of the full-width view', Math.abs(rects.left - 8) < 1 && Math.abs(rects.jump - (i.W - 8)) < 1, JSON.stringify(rects));
  await page.screenshot({ path: `${outDir}/layout-phone-level.png` });
  await context.close();
}

check('no console errors', errors.length === 0, errors.join(' | '));
await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
