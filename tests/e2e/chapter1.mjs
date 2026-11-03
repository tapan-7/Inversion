// Phase 3 browser test: Chapter 1 slice. Usage: node tests/e2e/chapter1.mjs <baseUrl> <screenshotDir>
import { chromium } from 'playwright';

const baseUrl = process.argv[2] ?? 'http://localhost:5173';
const outDir = process.argv[3] ?? '.';
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
};

const T = 16;
const cx = (col) => col * T + T / 2;
const snap = (page) =>
  page.evaluate(() => {
    const g = window.__game;
    const level = g.scene.getScene('Level');
    const p = level.player;
    return {
      scenes: g.scene.getScenes(true).map((s) => s.scene.key),
      dim: g.registry.get('dimension'),
      echoes: g.registry.get('fragments'),
      x: p.x, y: p.y, grounded: p.body.blocked.down,
      collected: [...level.collected],
      remaining: level.fragments.length,
      respawn: { ...level.respawnPoint },
      portalOpen: level.portal?.isUnlocked ?? null,
      lit: level.checkpoints.map((c) => c.active_),
      elapsed: level.elapsedMs,
    };
  });
const save = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('inversion.save.v1') ?? 'null'));
const place = (page, x, y) =>
  page.evaluate(([x, y]) => {
    const p = window.__game.scene.getScene('Level').player;
    p.setPosition(x, y);
    p.body.setVelocity(0, 0);
  }, [x, y]);
const texts = (page, key) =>
  page.evaluate((key) => window.__game.scene.getScene(key).children.list.filter((c) => c.type === 'BitmapText').map((c) => c.text), key);
const waitScene = (page, key) =>
  page.waitForFunction((key) => window.__game.scene.getScenes(true).some((s) => s.scene.key === key), key, { timeout: 8000 });

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'chrome' });
const errors = [];

async function open(contextOptions, existing) {
  const context = existing ?? (await browser.newContext(contextOptions));
  const page = existing ? existing.pages()[0] : await context.newPage();
  if (!existing) {
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(String(e)));
  }
  return { context, page };
}
async function load(page) {
  await page.goto(baseUrl);
  await page.waitForFunction(() => window.__game?.scene.getScenes(true).some((s) => s.scene.key === 'Menu'), null, { timeout: 15000 });
  await page.waitForTimeout(500);
}
async function startFromMenu(page, key = 'Enter') {
  await page.keyboard.press(key);
  await waitScene(page, 'Level');
  await page.waitForTimeout(800);
}

{
  const { context, page } = await open({ viewport: { width: 1280, height: 720 } });
  await load(page);

  const menu = await texts(page, 'Menu');
  check('fresh menu offers START GAME and no Continue', menu.includes('START GAME') && !menu.includes('CONTINUE'), menu.join('|'));
  await startFromMenu(page);

  const s0 = await snap(page);
  check('Start opens Chapter 1 with 0/3 echoes', s0.echoes?.found === 0 && s0.echoes?.total === 3, JSON.stringify(s0.echoes));
  check('HUD shows the echo counter', (await texts(page, 'UI')).includes('ECHOES 0/3'));
  check('a run is saved as soon as the level opens', (await save(page))?.run?.levelId === 'chapter1');
  check('portal starts locked, no checkpoint lit', s0.portalOpen === false && s0.lit.every((l) => !l));
  await page.screenshot({ path: `${outDir}/ch1-start.png` });

  // Real input: hop onto the step, then the ledge, to reach the first fragment.
  // Timing depends on the frame rate, so allow a few attempts from the spawn point.
  let attempts = 0;
  for (const release of [60, 45, 75, 60]) {
    if ((await snap(page)).collected.includes('ch1-f1')) break;
    attempts++;
    await place(page, 56, 240);
    await page.waitForTimeout(350);
    await page.keyboard.down('d');
    const t0 = Date.now();
    let stage = 0;
    while (Date.now() - t0 < 5000) {
      const s = await snap(page);
      if (s.collected.includes('ch1-f1')) break;
      if (stage === 0 && s.grounded && s.y > 235 && s.x >= 86) {
        stage = 1;
        await page.keyboard.down('w');
        setTimeout(() => page.keyboard.up('w').catch(() => {}), 300);
        setTimeout(() => page.keyboard.up('d').catch(() => {}), release);
      } else if (stage === 1 && s.grounded && s.y < 230) {
        stage = 2;
        await page.keyboard.down('d');
        await page.waitForTimeout(150);
        await page.keyboard.down('w');
        setTimeout(() => page.keyboard.up('w').catch(() => {}), 300);
      }
      await page.waitForTimeout(20);
    }
    await page.keyboard.up('d');
  }
  const f1 = await snap(page);
  const jumped = attempts;
  check('real play: step, ledge and first fragment can be reached', f1.collected.includes('ch1-f1'), `attempts=${jumped} x=${f1.x.toFixed(0)} y=${f1.y.toFixed(0)}`);
  check('collecting updates the HUD and the save', (await texts(page, 'UI')).includes('ECHOES 1/3') && (await save(page)).run.fragments.includes('ch1-f1'));
  await page.screenshot({ path: `${outDir}/ch1-fragment1.png` });

  // Dimension-gated fragment: ignored in Forgotten, collected after switching.
  await place(page, cx(28), 11 * T + 4);
  await page.waitForTimeout(250);
  // (player may have fallen slightly; put back and test immediately)
  await place(page, cx(28), 11 * T + 4);
  await page.waitForTimeout(40);
  const gated = await snap(page);
  check('Awakening-only fragment is not collected in Forgotten', !gated.collected.includes('ch1-f2'), `dim=${gated.dim}`);
  await place(page, cx(28), 11 * T + 4);
  await page.keyboard.press(' ');
  await page.waitForTimeout(350);
  const f2 = await snap(page);
  check('switching to Awakening collects it', f2.dim === 'awakening' && f2.collected.includes('ch1-f2'), `dim=${f2.dim}`);
  await page.screenshot({ path: `${outDir}/ch1-fragment2.png` });

  // Locked portal.
  await page.keyboard.press(' ');
  await page.waitForTimeout(450);
  await place(page, 109 * T, 15 * T);
  await page.waitForTimeout(300);
  const locked = await snap(page);
  check('portal refuses to open with 2/3 echoes', locked.portalOpen === false && !locked.scenes.includes('Complete'));
  await page.screenshot({ path: `${outDir}/ch1-portal-locked.png` });

  // Checkpoint and respawn.
  await place(page, cx(38), 15 * T);
  await page.waitForTimeout(300);
  const cp = await snap(page);
  const saved1 = await save(page);
  check('touching the pylon lights it and moves the respawn point', cp.lit[0] === true && Math.abs(cp.respawn.x - cx(38)) < 1, JSON.stringify(cp.respawn));
  check('checkpoint and its world are saved', saved1.run.checkpointId === 'ch1-c1' && saved1.run.checkpointDimension === cp.dim);
  await page.screenshot({ path: `${outDir}/ch1-checkpoint.png` });

  // Fall into the first pit: respawn at the checkpoint, not the start.
  await place(page, cx(30), 15 * T + 200);
  await page.waitForTimeout(500);
  const resp = await snap(page);
  check('falling respawns at the checkpoint', Math.abs(resp.x - cx(38)) < 8 && resp.y <= 15 * T + 1 && resp.dim === cp.dim, `x=${resp.x.toFixed(0)} y=${resp.y.toFixed(0)}`);

  // Leave and Continue.
  const before = await snap(page);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  await page.keyboard.press('m');
  await waitScene(page, 'Menu');
  await page.waitForTimeout(400);
  await page.reload();
  await page.waitForFunction(() => window.__game?.scene.getScenes(true).some((s) => s.scene.key === 'Menu'), null, { timeout: 15000 });
  await page.waitForTimeout(500);
  const menu2 = await texts(page, 'Menu');
  check('after a reload the menu offers CONTINUE and NEW GAME', menu2.includes('CONTINUE') && menu2.includes('NEW GAME'), menu2.join('|'));
  await page.screenshot({ path: `${outDir}/ch1-menu-continue.png` });
  await startFromMenu(page);
  const cont = await snap(page);
  check('Continue restores fragments, checkpoint position and world', cont.collected.length === 2 && cont.remaining === 1 && Math.abs(cont.x - cx(38)) < 8 && cont.dim === cp.dim && cont.lit[0], `x=${cont.x.toFixed(0)} collected=${cont.collected}`);
  check('Continue restores the run clock', cont.elapsed >= before.elapsed - 50, `${before.elapsed.toFixed(0)} -> ${cont.elapsed.toFixed(0)}`);
  check('HUD shows the restored count', (await texts(page, 'UI')).includes('ECHOES 2/3'));

  // Last fragment and the portal.
  await place(page, cx(98), 8 * T + 6);
  await page.waitForTimeout(350);
  const all = await snap(page);
  check('third fragment wakes the portal', all.collected.length === 3 && all.portalOpen === true);
  await place(page, 109 * T, 15 * T);
  await waitScene(page, 'Complete');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${outDir}/ch1-complete.png` });
  const panel = await texts(page, 'Complete');
  check('level complete panel shows echoes and time', panel.includes('CHAPTER COMPLETE') && panel.includes('ECHOES  3/3') && panel.some((t) => t.startsWith('TIME')), panel.join('|'));
  const done = await save(page);
  check('completion is saved and the run is cleared', done.chapters.chapter1.completed === true && done.chapters.chapter1.bestFragments === 3 && done.run === null, JSON.stringify(done.chapters));
  check('best time is recorded', typeof done.chapters.chapter1.bestTimeMs === 'number' && done.chapters.chapter1.bestTimeMs > 0);

  // Menu after completion: no Continue, completion line shown.
  await page.keyboard.press('Escape');
  await waitScene(page, 'Menu');
  await page.waitForTimeout(500);
  const menu3 = await texts(page, 'Menu');
  check('menu marks the chapter complete and has no Continue', menu3.some((t) => t.startsWith('CHAPTERS 1/5 COMPLETE')) && !menu3.includes('CONTINUE'), menu3.join('|'));

  // New run starts clean, with the old best kept.
  await startFromMenu(page);
  const fresh = await snap(page);
  check('a new run starts at 0/3 at the spawn point', fresh.collected.length === 0 && fresh.x < 80 && fresh.remaining === 3);
  check('the best time survives a new run', (await save(page)).chapters.chapter1.bestTimeMs === done.chapters.chapter1.bestTimeMs);

  // R restarts into a clean run.
  await place(page, cx(38), 15 * T);
  await page.waitForTimeout(300);
  await page.keyboard.press('r');
  await page.waitForTimeout(800);
  const r = await snap(page);
  check('R restarts the level and clears the checkpoint', r.lit.every((l) => !l) && r.x < 80);
  await context.close();
}

// Phone: touch buttons on the complete panel.
{
  const { context, page } = await open({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  await load(page);
  const canvas = await page.evaluate(() => {
    const r = window.__game.canvas.getBoundingClientRect();
    return { w: r.width, h: r.height };
  });
  const zoom = canvas.w / 480;
  const at = (gx, gy) => ({ x: (844 - canvas.w) / 2 + gx * zoom, y: (390 - canvas.h) / 2 + gy * zoom });
  const tap = (gx, gy) => {
    const p = at(gx, gy);
    return page.touchscreen.tap(p.x, p.y);
  };
  await tap(240, 158);
  await waitScene(page, 'Level');
  await page.waitForTimeout(800);
  for (const [c, r] of [[9, 11], [98, 8]]) {
    await place(page, cx(c), r * T + 6);
    await page.waitForTimeout(300);
  }
  await place(page, cx(28), 11 * T + 4);
  await page.evaluate(() => window.__game.scene.getScene('Level').dimensions.trySwitch());
  await page.waitForTimeout(400);
  check('phone: all three echoes collected', (await snap(page)).collected.length === 3);
  await place(page, 109 * T, 15 * T);
  await waitScene(page, 'Complete');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${outDir}/ch1-complete-phone.png` });
  await tap(240 - 60, 180);
  await page.waitForTimeout(900);
  const again = await snap(page);
  check('phone: tapping REPLAY starts a fresh run', again.scenes.includes('Level') && !again.scenes.includes('Complete') && again.collected.length === 0 && again.x < 80, again.scenes.join(','));
  await context.close();
}

check('no console errors', errors.length === 0, errors.join(' | '));
await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
