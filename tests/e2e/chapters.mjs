// Phase 5 browser test: chapters 2 to 5. Usage: node tests/e2e/chapters.mjs <baseUrl> <screenshotDir>
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
const key = async (page, k) => { await page.keyboard.press(k); await sleep(page, 90); };
const run = (page, fn, arg) =>
  page.evaluate(([src, arg]) => {
    const l = window.__game.scene.getScene('Level');
    return new Function('l', 'g', 'a', `return (${src})(l, g, a)`)(l, window.__game, arg);
  }, [fn.toString(), arg]);
const place = (page, x, y) => run(page, (l, g, a) => { l.player.setPosition(a[0], a[1]); l.player.body.setVelocity(0, 0); }, [x, y]);
const scenes = (page) => page.evaluate(() => window.__game.scene.getScenes(true).map((s) => s.scene.key));
const texts = (page, k) => page.evaluate((k) => window.__game.scene.getScene(k).children.list.filter((c) => c.type === 'BitmapText').map((c) => c.text), k);
const save = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('inversion.save.v1') ?? 'null'));
const waitScene = (page, k) => page.waitForFunction((k) => window.__game.scene.getScenes(true).some((s) => s.scene.key === k), k, { timeout: 8000 });
const levelId = (page) => run(page, (l) => l.config.id);
const dim = (page) => page.evaluate(() => window.__game.registry.get('dimension'));

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
const errors = [];

function presetSave(completed) {
  const chapters = {};
  for (const id of completed) chapters[id] = { completed: true, bestTimeMs: 60000, bestFragments: 3 };
  return JSON.stringify({ version: 1, chapters, run: null });
}
async function newPage(completed, viewport = { width: 1280, height: 720 }) {
  const context = await browser.newContext({ viewport });
  if (completed) {
    await context.addInitScript(([k, v]) => { if (!localStorage.getItem(k)) localStorage.setItem(k, v); }, ['inversion.save.v1', presetSave(completed)]);
  }
  // Tips are not under test here and would clutter screenshots.
  await context.addInitScript(() => {
    if (!localStorage.getItem('inversion.settings.v1')) {
      localStorage.setItem('inversion.settings.v1', JSON.stringify({ lowEffects: false, touchControls: 'auto', volume: 0.7, muted: true, tipsSeen: ['move', 'switch', 'air', 'bridge', 'ch2-alternate', 'ch2-floor', 'ch3-watcher', 'ch3-refuse', 'ch4-shrine', 'ch4-wrong', 'ch5-last'] }));
    }
  });
  const page = await context.newPage();
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(baseUrl);
  await page.waitForFunction(() => window.__game?.scene.getScenes(true).some((s) => s.scene.key === 'Menu'), null, { timeout: 15000 });
  await sleep(page, 500);
  return { context, page };
}
async function openChapter(page, index) {
  await key(page, 'c');
  await waitScene(page, 'Chapters');
  await sleep(page, 250);
  for (let i = 0; i < index; i++) await key(page, 'ArrowDown');
  await key(page, 'Enter');
  await waitScene(page, 'Level');
  await sleep(page, 900);
}

// Menu, chapter select, and the unlock rule.
{
  const { context, page } = await newPage(['chapter1']);
  const menu = await texts(page, 'Menu');
  check('menu shows progress and a CHAPTERS button after chapter 1', menu.includes('CHAPTERS') && menu.some((t) => t.startsWith('CHAPTERS 1/5 COMPLETE')), menu.join('|'));
  await key(page, 'c');
  await waitScene(page, 'Chapters');
  await sleep(page, 300);
  await page.screenshot({ path: `${outDir}/p5-chapters.png` });
  const list = await texts(page, 'Chapters');
  check('chapter 2 is open and chapter 3 is locked', list.some((t) => t.startsWith('2 ALTERNATING STAIRS')) && list.includes('3 LOCKED'), list.join('|'));
  await key(page, 'ArrowDown');
  await key(page, 'ArrowDown');
  await key(page, 'Enter');
  await sleep(page, 400);
  check('selecting a locked chapter does nothing', !(await scenes(page)).includes('Level'));
  await key(page, 'Escape');
  await sleep(page, 300);
  check('ESC closes chapter select back to the menu', (await scenes(page)).includes('Menu') && !(await scenes(page)).includes('Chapters'));
  await openChapter(page, 1);
  check('selecting chapter 2 opens it', (await levelId(page)) === 'chapter2');
  await context.close();
}

// Chapter 2: alternating platforms and floors.
{
  const { context, page } = await newPage(['chapter1']);
  await openChapter(page, 1);
  await page.screenshot({ path: `${outDir}/p5-ch2.png` });

  // Standing on a Forgotten-only platform, switching drops the player: the platform belongs to one world.
  await place(page, cx(17), 12 * T);
  await sleep(page, 400);
  const onF = await run(page, (l) => l.player.arcadeBody.blocked.down);
  check('ch2: a Forgotten step holds the player in Forgotten', onF === true);
  await key(page, ' ');
  await sleep(page, 200);
  // Sampled while falling: a pit below means the player then respawns at the start.
  const fell = await run(page, (l) => ({ y: l.player.y, g: l.player.arcadeBody.blocked.down, d: window.__game.registry.get('dimension') }));
  check('ch2: switching away from a one-world step drops the player', fell.d === 'awakening' && fell.y > 13 * T && fell.g === false, JSON.stringify(fell));

  // An overlapping floor lets the player switch without falling.
  await place(page, cx(80), 14 * T + 4);
  await sleep(page, 300);
  await key(page, ' ');
  await sleep(page, 500);
  const overlap = await run(page, (l) => ({ g: l.player.arcadeBody.blocked.down, d: window.__game.registry.get('dimension'), y: l.player.y }));
  check('ch2: switching on overlapping floors keeps the player standing', overlap.g === true && overlap.y <= 15 * T + 1, JSON.stringify(overlap));
  await place(page, cx(86), 14 * T + 4);
  await sleep(page, 300);
  const noFloor = await run(page, (l) => ({ g: l.player.arcadeBody.blocked.down, y: l.player.y }));
  check('ch2: but a spot with only the other world floor lets them fall', noFloor.y > 15 * T || noFloor.g === false, JSON.stringify(noFloor));
  await context.close();
}

// Chapter 3: the Watcher.
{
  const { context, page } = await newPage(['chapter1', 'chapter2']);
  await openChapter(page, 2);
  check('ch3: opens', (await levelId(page)) === 'chapter3');
  const vis = (d) => run(page, (l) => l.mechanics.watchers.map((w) => w.sprite.visible));
  check('ch3: Watchers are hidden in Forgotten', (await vis()).every((v) => v === false));

  // Harmless in Forgotten.
  const w1x = await run(page, (l) => l.mechanics.watchers[0].x);
  await place(page, w1x, 15 * T);
  await sleep(page, 700);
  const alive = await run(page, (l) => ({ x: l.player.x, d: window.__game.registry.get('dimension') }));
  check('ch3: a Watcher cannot hurt in Forgotten', alive.d === 'forgotten' && Math.abs(alive.x - w1x) < 40, JSON.stringify(alive));

  // Refused switch into a Watcher.
  await run(page, (l, g) => { window.__blocked = 0; g.events.on('dimension:blocked', () => window.__blocked++); });
  const wx = await run(page, (l) => l.mechanics.watchers[0].x);
  await place(page, wx, 15 * T);
  await key(page, ' ');
  await sleep(page, 200);
  const refused = await page.evaluate(() => ({ d: window.__game.registry.get('dimension'), n: window.__blocked }));
  check('ch3: switching into a Watcher is refused', refused.d === 'forgotten' && refused.n === 1, JSON.stringify(refused));
  await page.screenshot({ path: `${outDir}/p5-ch3-refused.png` });

  // Away from it, the switch is allowed and the Watcher appears.
  await place(page, cx(10), 15 * T);
  await sleep(page, 300);
  await key(page, ' ');
  await sleep(page, 700);
  check('ch3: Watchers appear in Awakening', (await dim(page)) === 'awakening' && (await vis()).every((v) => v === true));
  await page.screenshot({ path: `${outDir}/p5-ch3-awake.png` });

  // They patrol within their beat.
  const xs = [];
  for (let i = 0; i < 8; i++) { xs.push(await run(page, (l) => l.mechanics.watchers[0].x)); await sleep(page, 250); }
  const cfg = await run(page, (l) => ({ min: l.mechanics.watchers[0].config.minCol * 16 + 8, max: l.mechanics.watchers[0].config.maxCol * 16 + 8 }));
  check('ch3: a Watcher walks its beat and stays inside it', Math.max(...xs) - Math.min(...xs) > 20 && xs.every((x) => x >= cfg.min - 1 && x <= cfg.max + 1), `${Math.min(...xs).toFixed(0)}..${Math.max(...xs).toFixed(0)}`);

  // Lethal in Awakening: caught, then back at the start.
  await run(page, (l, g) => { window.__died = []; g.events.on('player:died', (r) => window.__died.push(r)); });
  const wx2 = await run(page, (l) => l.mechanics.watchers[0].x);
  await place(page, wx2, 15 * T);
  await sleep(page, 500);
  const died = await run(page, (l) => ({ died: window.__died, x: l.player.x, d: window.__game.registry.get('dimension') }));
  check('ch3: a Watcher kills in Awakening and the player respawns', died.died[0] === 'watcher' && died.x < 100, JSON.stringify(died));
  await context.close();
}

// Chapter 4: the crystal sequence and its gate.
{
  const { context, page } = await newPage(['chapter1', 'chapter2', 'chapter3']);
  await openChapter(page, 3);
  check('ch4: opens', (await levelId(page)) === 'chapter4');
  await page.screenshot({ path: `${outDir}/p5-ch4.png` });
  const state = () => run(page, (l) => ({ n: l.mechanics.sequence.count, solved: l.mechanics.sequence.solved, gate: l.mechanics.gate.isOpen, lit: l.mechanics.crystals.map((c) => l.mechanics.sequence.isLit(c.index)) }));
  const touch = async (i, dimension) => {
    const c = await run(page, (l, g, a) => { const k = l.mechanics.crystals[a].config; return { col: k.col, row: k.row }; }, i);
    if (dimension && (await dim(page)) !== dimension) {
      await place(page, cx(3), 15 * T);
      await sleep(page, 250);
      await key(page, ' ');
      await sleep(page, 600);
    }
    await place(page, cx(c.col), c.row * T + 12);
    await sleep(page, 200);
    // Step away so the next touch registers as a new entry.
    await place(page, cx(3), 15 * T);
    await sleep(page, 150);
  };
  await run(page, (l, g) => { window.__seq = []; g.events.on('level:sequence-step', (n) => window.__seq.push(n)); g.events.on('level:sequence-wrong', () => window.__seq.push('wrong')); });

  check('ch4: starts with four dark crystals and a closed gate', (await state()).n === 0 && (await state()).gate === false);
  // Order is violet(2), cyan(0), white(3), magenta(1). Cyan first is wrong.
  await touch(0, 'forgotten');
  check('ch4: touching the wrong crystal first lights nothing', (await state()).n === 0 && (await page.evaluate(() => window.__seq)).includes('wrong'));
  await touch(2, 'forgotten');
  check('ch4: the first crystal in order lights', (await state()).n === 1 && (await state()).lit[2] === true);
  await touch(3, 'forgotten');
  check('ch4: a wrong crystal mid-way resets the whole sequence', (await state()).n === 0 && (await state()).lit.every((v) => !v));

  // Dimension-locked crystals ignore the wrong world.
  await touch(2, 'forgotten');
  await touch(0);
  await touch(3);
  const before = await state();
  const wrongWorld = await run(page, (l) => l.mechanics.crystals[1].canTouch);
  await touch(1);
  check('ch4: the magenta crystal ignores a touch in Forgotten', wrongWorld === false && (await state()).n === before.n && before.n === 3, JSON.stringify({ n: before.n, wrongWorld }));

  // Gate blocks until solved.
  await place(page, cx(64), 15 * T);
  await page.keyboard.down('d');
  await sleep(page, 1200);
  await page.keyboard.up('d');
  const blocked = await run(page, (l) => l.player.x);
  check('ch4: the closed gate stops the player', blocked < 66 * T, `x=${blocked.toFixed(0)}`);

  await touch(1, 'awakening');
  const done = await state();
  check('ch4: the last crystal solves the puzzle and opens the gate', done.solved && done.gate, JSON.stringify(done));
  check('ch4: the opened gate is saved to the run', (await save(page)).run.flags.includes('gate'));
  await place(page, cx(64), 15 * T);
  await run(page, (l, g) => { g.registry.set('dimension', g.registry.get('dimension')); });
  await key(page, ' ');
  await sleep(page, 600);
  await page.keyboard.down('d');
  await sleep(page, 1500);
  await page.keyboard.up('d');
  const through = await run(page, (l) => l.player.x);
  check('ch4: the player walks through the open gate', through > 70 * T, `x=${through.toFixed(0)}`);
  await page.screenshot({ path: `${outDir}/p5-ch4-open.png` });

  // Continue restores the open gate.
  await place(page, cx(71), 15 * T);
  await sleep(page, 400);
  await key(page, 'Escape');
  await sleep(page, 250);
  await key(page, 'm');
  await waitScene(page, 'Menu');
  await page.reload();
  await page.waitForFunction(() => window.__game?.scene.getScenes(true).some((s) => s.scene.key === 'Menu'), null, { timeout: 15000 });
  await sleep(page, 500);
  await key(page, 'Enter');
  await waitScene(page, 'Level');
  await sleep(page, 900);
  const resumed = await run(page, (l) => ({ id: l.config.id, gate: l.mechanics.gate.isOpen, solved: l.mechanics.sequence.solved, lit: l.mechanics.crystals.every((c) => l.mechanics.sequence.isLit(c.index)) }));
  check('ch4: Continue returns to chapter 4 with the gate open and crystals lit', resumed.id === 'chapter4' && resumed.gate && resumed.solved && resumed.lit, JSON.stringify(resumed));
  await context.close();
}

// Chapter 5: the collapse, then the ending.
{
  const { context, page } = await newPage(['chapter1', 'chapter2', 'chapter3', 'chapter4']);
  await openChapter(page, 4);
  check('ch5: opens', (await levelId(page)) === 'chapter5');
  const grid = (col, row = 15) => run(page, (l, g, a) => ({ cell: l.level.grids.forgotten[a[1]][a[0]], tile: !!l.level.layers.forgotten.getTileAt(a[0], a[1]) }), [col, row]);
  const cstate = () => run(page, (l) => l.mechanics.collapse.state);

  // The trigger needs every echo first.
  await place(page, cx(72), 14 * T);
  await sleep(page, 500);
  check('ch5: crossing the trigger without every echo does not start it', (await cstate()) === 'armed');
  await place(page, cx(3), 15 * T);
  await sleep(page, 300);

  // Collect the three echoes, touching the last checkpoint on the way.
  await place(page, cx(43), 10 * T + 6);
  await sleep(page, 350);
  await place(page, cx(60), 10 * T + 6);
  await sleep(page, 350);
  await place(page, cx(64), 15 * T);
  await sleep(page, 350);
  await place(page, cx(68), 15 * T);
  await sleep(page, 400);
  check('ch5: all three echoes collected', (await run(page, (l) => l.collected.size)) === 3);
  check('ch5: the portal is awake', await run(page, (l) => l.portal.isUnlocked));
  check('ch5: the collapse has not started yet', (await cstate()) === 'armed' && (await grid(44)).tile === true);

  // Trigger.
  await run(page, (l, g) => { window.__col = []; g.events.on('level:collapse-started', () => window.__col.push('start')); g.events.on('level:collapse-step', (c) => window.__col.push(c)); });
  await place(page, cx(71), 15 * T);
  await sleep(page, 400);
  check('ch5: crossing the trigger starts the collapse', (await cstate()) === 'running');
  await sleep(page, 2600);
  const g44 = await grid(44);
  check('ch5: columns begin to fall from the left', g44.cell === '.' && g44.tile === false, JSON.stringify(g44));
  await page.screenshot({ path: `${outDir}/p5-ch5-collapse.png` });
  await sleep(page, 3600);
  const g60 = await grid(60);
  const g110 = await grid(110);
  check('ch5: the collapse keeps advancing, and has not reached far ground yet', g60.cell === '.' && g110.cell === '#', `col60=${g60.cell} col110=${g110.cell}`);
  const events = await page.evaluate(() => window.__col);
  check('ch5: collapse events fire for audio', events[0] === 'start' && events.length > 5, `${events.length} events`);

  // Falling resets everything.
  await place(page, cx(75), 15 * T + 220);
  await sleep(page, 600);
  const reset = await run(page, (l) => ({ s: l.mechanics.collapse.state, x: l.player.x }));
  const g44b = await grid(44);
  check('ch5: dying during the collapse restores the ground and re-arms it', reset.s === 'armed' && g44b.cell === '#' && g44b.tile === true && reset.x < 70 * T, JSON.stringify({ reset, g44b }));
  check('ch5: respawn is at the last checkpoint, before the trigger', Math.abs(reset.x - cx(64)) < 10, `x=${reset.x.toFixed(0)}`);

  // Finish: ending.
  await place(page, cx(124), 15 * T);
  await waitScene(page, 'Ending');
  await sleep(page, 5600);
  await page.screenshot({ path: `${outDir}/p5-ending.png` });
  const ending = await texts(page, 'Ending');
  check('ending: shows the restored message, echoes and time', ending.includes('THE ECHOES ARE RESTORED') && ending.some((t) => t.startsWith('ECHOES  ')) && ending.some((t) => t.startsWith('TOTAL TIME')), ending.join('|'));
  const done = await save(page);
  check('ending: chapter 5 is saved as complete and no run is left', done.chapters.chapter5.completed === true && done.run === null);
  await key(page, 'Enter');
  await waitScene(page, 'Menu');
  const menu = await texts(page, 'Menu');
  check('ending: ENTER returns to a menu that shows all five chapters done', menu.some((t) => t.startsWith('CHAPTERS 5/5 COMPLETE')), menu.join('|'));
  await context.close();
}

// Next chapter flow from the complete panel.
{
  const { context, page } = await newPage(null);
  await key(page, 'Enter');
  await waitScene(page, 'Level');
  await sleep(page, 800);
  for (const [c, r, d] of [[9, 11], [98, 8]]) { await place(page, cx(c), r * T + 6); await sleep(page, 300); }
  await place(page, cx(28), 11 * T + 4);
  await run(page, (l) => l.dimensions.trySwitch());
  await sleep(page, 400);
  await place(page, 109 * T, 15 * T);
  await waitScene(page, 'Complete');
  await sleep(page, 300);
  const panel = await texts(page, 'Complete');
  check('chapter 1 complete panel offers NEXT', panel.includes('NEXT') && panel.includes('REPLAY') && panel.includes('MENU'), panel.join('|'));
  await key(page, 'Enter');
  await sleep(page, 900);
  check('ENTER starts chapter 2 with a fresh run', (await levelId(page)) === 'chapter2' && (await save(page)).run.levelId === 'chapter2');
  await context.close();
}

check('no console errors', errors.length === 0, errors.join(' | '));
await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
