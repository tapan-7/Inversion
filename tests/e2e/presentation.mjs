// Phase 4 browser test: presentation, pause, settings, tips, audio. Usage: node tests/e2e/presentation.mjs <baseUrl> <screenshotDir>
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
const sleep = (page, ms) => page.waitForTimeout(ms);
const level = (page, fn, arg) => page.evaluate(([src, arg]) => {
  const l = window.__game.scene.getScene('Level');
  return new Function('l', 'g', 'a', `return (${src})(l, g, a)`)(l, window.__game, arg);
}, [fn.toString(), arg]);
const scenes = (page) => page.evaluate(() => window.__game.scene.getScenes(true).map((s) => s.scene.key));
const place = (page, x, y) => level(page, (l, g, a) => { l.player.setPosition(a[0], a[1]); l.player.body.setVelocity(0, 0); }, [x, y]);
const settingsOf = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('inversion.settings.v1') ?? 'null'));
const audioOf = (page) => page.evaluate(() => window.__audio.debugState());
const texts = (page, key) => page.evaluate((key) => window.__game.scene.getScene(key).children.list.filter((c) => c.type === 'BitmapText').map((c) => c.text), key);
const tipText = (page) => page.evaluate(() => {
  const ui = window.__game.scene.getScene('UI');
  const c = ui.tip;
  return c ? { text: c.list.find((o) => o.type === 'BitmapText').text, alpha: c.alpha } : null;
});
const key = async (page, k) => { await page.keyboard.press(k); await page.waitForTimeout(90); };
const waitScene = (page, key) => page.waitForFunction((k) => window.__game.scene.getScenes(true).some((s) => s.scene.key === k), key, { timeout: 8000 });

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
const errors = [];
const attach = (page) => {
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
};
async function load(page, query = '') {
  await page.goto(baseUrl + query);
  await page.waitForFunction(() => window.__game?.scene.getScenes(true).some((s) => s.scene.key === 'Menu'), null, { timeout: 15000 });
  await sleep(page, 500);
}

{
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  attach(page);
  await load(page);

  // Main menu settings: opens, does not start the game, closes back to the menu.
  await page.keyboard.press('s');
  await waitScene(page, 'Settings');
  await sleep(page, 300);
  await page.screenshot({ path: `${outDir}/p4-settings.png` });
  check('S opens settings over the menu', (await scenes(page)).includes('Settings'));
  await page.keyboard.press('Enter');
  await sleep(page, 200);
  const afterEnter = await scenes(page);
  check('Enter inside settings does not start the game', !afterEnter.includes('Level') && afterEnter.includes('Settings'), afterEnter.join(','));
  const vol = await settingsOf(page);
  check('Enter on VOLUME changes and saves it', vol && vol.volume !== 0.7, JSON.stringify(vol));
  await page.keyboard.press('Escape');
  await sleep(page, 300);
  const backMenu = await scenes(page);
  check('ESC returns to the menu', backMenu.includes('Menu') && !backMenu.includes('Settings') && !backMenu.includes('Level'), backMenu.join(','));
  await page.keyboard.press('Enter');
  await waitScene(page, 'Level');
  await sleep(page, 700);

  // Title card.
  const card = await level(page, (l) => l.children.list.filter((c) => c.type === 'BitmapText' && c.text.startsWith('CHAPTER')).map((c) => ({ t: c.text, a: c.alpha })));
  await page.screenshot({ path: `${outDir}/p4-titlecard.png` });
  check('no tip overlaps the title card', (await tipText(page)) === null);
  check('chapter title card is shown on entering Chapter 1', card.length === 1 && card[0].a > 0, JSON.stringify(card));
  await sleep(page, 3000);
  const cardGone = await level(page, (l) => l.children.list.filter((c) => c.type === 'BitmapText' && c.text.startsWith('CHAPTER')).length);
  check('title card clears itself', cardGone === 0);

  // Tutorial tips (held back until the title card has cleared).
  const tip1 = await tipText(page);
  check('first-run tip: movement', tip1 && tip1.text.includes('JUMPS'), JSON.stringify(tip1));
  await page.screenshot({ path: `${outDir}/p4-tip.png` });
  await page.keyboard.down('w');
  await sleep(page, 120);
  await page.keyboard.up('w');
  await sleep(page, 500);
  check('jumping dismisses the movement tip and saves it', (await tipText(page)) === null && (await settingsOf(page)).tipsSeen.includes('move'));
  await place(page, cx(11), 15 * T);
  await sleep(page, 400);
  const tip2 = await tipText(page);
  check('switch tip appears near the first wall', tip2 && tip2.text.includes('SWITCH'), JSON.stringify(tip2));
  await page.keyboard.press(' ');
  await sleep(page, 600);
  check('switching dismisses the switch tip', (await tipText(page)) === null && (await settingsOf(page)).tipsSeen.includes('switch'));
  await page.keyboard.press(' ');
  await sleep(page, 500);

  // Ambient world layers.
  const amb = await level(page, (l) => ({
    emitters: l.ambient.emitters.map((e) => ({ vis: e.emitter.visible, alive: e.emitter.getAliveParticleCount(), fg: e.foreground })),
    glows: l.ambient.glows.length,
    glowVisible: l.ambient.glows.some((g) => g.visible),
    dim: window.__game.registry.get('dimension'),
  }));
  check('Forgotten: only its particles are visible and alive', amb.dim === 'forgotten' && amb.emitters.filter((e) => e.vis).length === 2 && amb.emitters.filter((e) => e.vis).every((e) => e.alive > 0), JSON.stringify(amb.emitters));
  check('crystal glows exist but are hidden in Forgotten', amb.glows > 5 && !amb.glowVisible, `glows=${amb.glows}`);
  await place(page, cx(3), 15 * T);
  await sleep(page, 300);
  await page.keyboard.press(' ');
  await sleep(page, 700);
  const amb2 = await level(page, (l) => ({
    vis: l.ambient.emitters.filter((e) => e.emitter.visible).length,
    alive: l.ambient.emitters.filter((e) => e.emitter.visible).every((e) => e.emitter.getAliveParticleCount() > 0),
    glowVisible: l.ambient.glows.some((g) => g.visible),
    mask: l.ambient.glows.some((g) => g.mask),
  }));
  check('Awakening: its particles and crystal glows take over, masks cleared', amb2.vis === 2 && amb2.alive && amb2.glowVisible && !amb2.mask, JSON.stringify(amb2));
  await page.screenshot({ path: `${outDir}/p4-awakening.png` });

  const light = await level(page, (l) => ({ lx: l.ambient.light.x, px: l.player.arcadeBody.center.x, a: l.ambient.light.alpha }));
  check('player light follows the player', Math.abs(light.lx - light.px) < 2 && light.a > 0.1, JSON.stringify(light));

  // Audio layers.
  let a = await audioOf(page);
  check('audio started after the first key press', a.state === 'running', a.state);
  check('Awakening layer is up, Forgotten faded out', a.mix && a.mix.awakening > 0.9 && a.mix.forgotten < 0.1, JSON.stringify(a.mix));
  check('Awakening audio is not silent', a.rms > 0.0005, `rms=${a.rms.toFixed(5)}`);
  await place(page, cx(3), 15 * T);
  await sleep(page, 300);
  await page.keyboard.press(' ');
  await sleep(page, 900);
  a = await audioOf(page);
  check('switching crossfades to the Forgotten layer', a.mix.forgotten > 0.9 && a.mix.awakening < 0.1, JSON.stringify(a.mix));
  check('Forgotten audio is not silent', a.rms > 0.0005, `rms=${a.rms.toFixed(5)}`);

  // Pause: freezes the level, resumes without stuck input.
  await page.keyboard.down('d');
  await sleep(page, 300);
  await page.keyboard.press('Escape');
  await sleep(page, 400);
  const paused = await page.evaluate(() => ({ scenes: window.__game.scene.getScenes(true).map((s) => s.scene.key), levelPaused: window.__game.scene.isPaused('Level') }));
  check('ESC opens the pause menu and pauses the level', paused.scenes.includes('Pause') && paused.levelPaused, JSON.stringify(paused));
  check('pausing ducks the audio', (await audioOf(page)).ducked === true);
  const x0 = await level(page, (l) => l.player.x);
  await page.screenshot({ path: `${outDir}/p4-pause.png` });
  await sleep(page, 600);
  const x1 = await level(page, (l) => l.player.x);
  check('the player does not move while paused, even with D held', Math.abs(x1 - x0) < 0.5, `${x0.toFixed(1)} -> ${x1.toFixed(1)}`);
  await page.keyboard.up('d');
  await page.keyboard.press('Escape');
  await sleep(page, 500);
  const x2 = await level(page, (l) => l.player.x);
  await sleep(page, 400);
  const x3 = await level(page, (l) => l.player.x);
  const resumed = await scenes(page);
  check('ESC resumes the level and unducks', resumed.includes('Level') && !resumed.includes('Pause') && (await audioOf(page)).ducked === false);
  check('no stuck input after resuming (key released during pause)', Math.abs(x3 - x2) < 1, `${x2.toFixed(1)} -> ${x3.toFixed(1)}`);

  // Pause > Settings: Low Effects applies live, mute silences audio.
  await page.keyboard.press('Escape');
  await sleep(page, 300);
  await key(page, 'ArrowDown');
  await key(page, 'ArrowDown');
  await page.keyboard.press('Enter');
  await sleep(page, 300);
  await waitScene(page, 'Settings');
  await sleep(page, 250);
  await key(page, 'ArrowDown');
  await key(page, 'Enter'); // SOUND -> off
  await sleep(page, 400);
  const muted = await audioOf(page);
  check('SOUND OFF mutes the master output', muted.muted === true && muted.masterGain < 0.001 && muted.rms < 0.0005, `gain=${muted.masterGain.toFixed(4)} rms=${muted.rms.toFixed(5)}`);
  await key(page, 'Enter'); // SOUND -> on
  await sleep(page, 300);
  await key(page, 'ArrowDown');
  await key(page, 'Enter'); // LOW EFFECTS -> on
  await sleep(page, 300);
  await page.screenshot({ path: `${outDir}/p4-settings-low.png` });
  const low = await level(page, (l) => ({
    fg: l.ambient.emitters.filter((e) => e.foreground).map((e) => e.emitter.alpha),
    freq: l.ambient.emitters.filter((e) => !e.foreground).map((e) => e.emitter.frequency / e.frequency),
  }));
  check('LOW EFFECTS hides foreground particles and slows the rest, live', low.fg.every((v) => v === 0) && low.freq.every((r) => r > 3), JSON.stringify(low));
  check('settings are saved', (await settingsOf(page)).lowEffects === true && (await settingsOf(page)).muted === false);
  await page.keyboard.press('Escape');
  await sleep(page, 300);
  const backToPause = await page.evaluate(() => ({ scenes: window.__game.scene.getScenes(true).map((s) => s.scene.key) }));
  check('closing settings returns to the pause menu', backToPause.scenes.includes('Pause') && !backToPause.scenes.includes('Settings'), backToPause.scenes.join(','));
  await page.keyboard.press('Escape');
  await sleep(page, 400);

  // Restart from the pause menu begins a fresh run.
  await place(page, cx(38), 15 * T);
  await sleep(page, 300);
  await page.keyboard.press('Escape');
  await sleep(page, 300);
  await key(page, 'ArrowDown');
  await key(page, 'Enter');
  await sleep(page, 900);
  const restarted = await level(page, (l) => ({ x: l.player.x, lit: l.checkpoints.some((c) => c.active_), paused: window.__game.scene.isPaused('Level') }));
  check('RESTART from the pause menu starts a fresh run', restarted.x < 80 && !restarted.lit && !restarted.paused, JSON.stringify(restarted));

  // Low effects removes camera shake.
  const shaken = await level(page, (l) => { l.cameras.main.shakeEffect.reset(); l.dimensions.rejectFeedback([{ x: 48, y: 224, width: 16, height: 16 }]); return l.cameras.main.shakeEffect.isRunning; });
  check('Low Effects disables screen shake on a refused switch', shaken === false);

  // Persistence across reload.
  await page.reload();
  await page.waitForFunction(() => window.__game?.scene.getScenes(true).some((s) => s.scene.key === 'Menu'), null, { timeout: 15000 });
  await sleep(page, 400);
  const persisted = await settingsOf(page);
  check('settings and seen tips persist across a reload', persisted.lowEffects === true && persisted.tipsSeen.includes('move') && persisted.tipsSeen.includes('switch'));
  await page.keyboard.press('Enter');
  await waitScene(page, 'Level');
  await sleep(page, 900);
  check('a seen tip is not shown again', (await tipText(page)) === null);
  await context.close();
}

// Phone: touch pause button and the touch controls setting.
{
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const page = await context.newPage();
  attach(page);
  await load(page);
  const canvas = await page.evaluate(() => { const r = window.__game.canvas.getBoundingClientRect(); return { w: r.width, h: r.height }; });
  const zoom = canvas.w / 480;
  const tap = (gx, gy) => page.touchscreen.tap((844 - canvas.w) / 2 + gx * zoom, (390 - canvas.h) / 2 + gy * zoom);
  await tap(240, 158);
  await waitScene(page, 'Level');
  await sleep(page, 900);
  await sleep(page, 2800);
  await page.screenshot({ path: `${outDir}/p4-phone-level.png` });
  const hasTouch = () => page.evaluate(() => !!window.__game.scene.getScene('UI').touch);
  check('phone: touch controls shown in auto mode', await hasTouch());
  check('phone: movement tip uses touch wording', (await tipText(page))?.text.includes('BUTTON'), JSON.stringify(await tipText(page)));

  await tap(480 - 8 - 12, 8 + 12);
  await sleep(page, 400);
  check('phone: top-right button pauses', (await scenes(page)).includes('Pause'));
  await page.screenshot({ path: `${outDir}/p4-phone-pause.png` });
  await tap(240, 104 + 60);
  await sleep(page, 500);
  check('phone: tapping SETTINGS opens it', (await scenes(page)).includes('Settings'));
  // TOUCH CONTROLS row is the fourth (y = 84 + 3 * 26), tap until OFF.
  await tap(240, 84 + 3 * 26);
  await sleep(page, 300);
  await tap(240, 84 + 3 * 26);
  await sleep(page, 300);
  const touchMode = (await settingsOf(page)).touchControls;
  check('phone: tapping cycles TOUCH CONTROLS to off', touchMode === 'off', touchMode);
  check('phone: buttons disappear live', !(await hasTouch()));
  await tap(240, 84 + 3 * 26);
  await sleep(page, 300);
  check('phone: cycling back to auto restores them', (await settingsOf(page)).touchControls === 'auto' && (await hasTouch()));
  await tap(240, 84 + 5 * 26);
  await sleep(page, 400);
  check('phone: BACK returns to the pause menu', (await scenes(page)).includes('Pause'));
  await tap(240, 104);
  await sleep(page, 500);
  const s = await scenes(page);
  check('phone: RESUME continues the level', s.includes('Level') && !s.includes('Pause'));
  await context.close();
}

check('no console errors', errors.length === 0, errors.join(' | '));
await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
