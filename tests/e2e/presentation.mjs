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
/** Visible intro cards: text, position and opacity, read from the level scene. */
const introCards = (page) => page.evaluate(() => {
  const l = window.__game.scene.getScene('Level');
  return l.children.list
    .filter((c) => c.type === 'Container' && c.list.some((o) => o.type === 'BitmapText'))
    .map((c) => ({ t: c.list.find((o) => o.type === 'BitmapText').text, x: c.x, y: c.y, a: c.alpha }));
});
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

  // Instruction cards: one at a time, in from the left at mid height, out to the right.
  const W = await page.evaluate(() => window.__game.scale.width);
  const mid = 270 / 2;
  const seen = [];
  const log = [];
  let shotRest = false;
  let shotExit = false;
  const t0 = Date.now();
  while (Date.now() - t0 < 14500) {
    const cards = (await introCards(page)).filter((c) => c.a > 0.02 || c.x > -5);
    const live = cards.filter((c) => c.a > 0.05);
    log.push({ live: live.length, cards });
    for (const c of cards) if (!seen.includes(c.t)) seen.push(c.t);
    const first = live[0];
    if (first && !shotRest && Math.abs(first.x - W / 2) < 4 && first.a > 0.95) {
      shotRest = true;
      await page.screenshot({ path: `${outDir}/p4-intro-rest.png` });
    }
    if (first && shotRest && !shotExit && first.x > W / 2 + 40 && first.a < 0.85) {
      shotExit = true;
      await page.screenshot({ path: `${outDir}/p4-intro-exit.png` });
    }
    await sleep(page, 70);
  }
  const all = log.flatMap((e) => e.cards);
  const byText = (t) => all.filter((c) => c.t === t);
  check('intro: the instructions appear in order', JSON.stringify(seen) === JSON.stringify(['COLLECT ALL THREE ECHO FRAGMENTS', 'A D OR ARROWS MOVE   W OR Z JUMPS', 'SPACE SWITCHES WORLDS']), JSON.stringify(seen));
  check('intro: only one card is visible at a time', log.every((e) => e.live <= 1), `max=${Math.max(...log.map((e) => e.live))}`);
  check('intro: cards sit at the vertical middle', all.every((c) => Math.abs(c.y - mid) < 1), `y=${[...new Set(all.map((c) => Math.round(c.y)))]}`);
  const first = byText('COLLECT ALL THREE ECHO FRAGMENTS');
  check('intro: a card starts off the left edge', first[0].x < W / 4, `x=${first[0].x.toFixed(0)}`);
  check('intro: it rests in the centre', first.some((c) => Math.abs(c.x - W / 2) < 3 && c.a > 0.95));
  check('intro: it leaves to the right while fading', first.some((c) => c.x > W / 2 + 40 && c.a < 0.9 && c.a > 0.02), JSON.stringify(first.slice(-3)));
  check('intro: every card is gone afterwards', (await introCards(page)).length === 0);
  check('intro: title card clears too', (await level(page, (l) => l.children.list.filter((c) => c.type === 'BitmapText' && c.text.startsWith('CHAPTER')).length)) === 0);

  // Tutorial tips.
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
  check('settings and seen tips persist across a reload', persisted.lowEffects === true && persisted.tipsSeen.includes('switch'));
  await page.keyboard.press('Enter');
  await waitScene(page, 'Level');
  await sleep(page, 900);
  await place(page, cx(11), 15 * T);
  await sleep(page, 3500);
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
  const W = await page.evaluate(() => window.__game.scale.width);
  const zoom = canvas.w / W;
  const tap = (gx, gy) => page.touchscreen.tap((844 - canvas.w) / 2 + gx * zoom, (390 - canvas.h) / 2 + gy * zoom);
  await tap(W / 2, 158);
  await waitScene(page, 'Level');
  await sleep(page, 900);
  await sleep(page, 2800);
  await page.screenshot({ path: `${outDir}/p4-phone-level.png` });
  const hasTouch = () => page.evaluate(() => !!window.__game.scene.getScene('UI').touch);
  check('phone: touch controls shown in auto mode', await hasTouch());
  const phoneCards = new Set();
  const tp = Date.now();
  while (Date.now() - tp < 9000 && !phoneCards.has('TAP THE SWITCH BUTTON')) {
    for (const c of await introCards(page)) phoneCards.add(c.t);
    await sleep(page, 100);
  }
  check('phone: instruction cards use touch wording', phoneCards.has('USE THE ARROW AND JUMP BUTTONS') && phoneCards.has('TAP THE SWITCH BUTTON'), [...phoneCards].join('|'));

  await tap(W - 8 - 12, 8 + 12);
  await sleep(page, 400);
  check('phone: top-right button pauses', (await scenes(page)).includes('Pause'));
  await page.screenshot({ path: `${outDir}/p4-phone-pause.png` });
  await tap(W / 2, 104 + 60);
  await sleep(page, 500);
  check('phone: tapping SETTINGS opens it', (await scenes(page)).includes('Settings'));
  // TOUCH CONTROLS row is the fourth (y = 84 + 3 * 26), tap until OFF.
  await tap(W / 2, 84 + 3 * 26);
  await sleep(page, 300);
  await tap(W / 2, 84 + 3 * 26);
  await sleep(page, 300);
  const touchMode = (await settingsOf(page)).touchControls;
  check('phone: tapping cycles TOUCH CONTROLS to off', touchMode === 'off', touchMode);
  check('phone: buttons disappear live', !(await hasTouch()));
  await tap(W / 2, 84 + 3 * 26);
  await sleep(page, 300);
  check('phone: cycling back to auto restores them', (await settingsOf(page)).touchControls === 'auto' && (await hasTouch()));
  await tap(W / 2, 84 + 5 * 26);
  await sleep(page, 400);
  check('phone: BACK returns to the pause menu', (await scenes(page)).includes('Pause'));
  await tap(W / 2, 104);
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
