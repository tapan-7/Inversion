import Phaser from "phaser";
import {
  DEFAULT_LIVES,
  DEPTH,
  GAME_EVENT,
  GAME_HEIGHT,
  MAX_LIVES,
  MOVE,
  REGISTRY_CHAPTER,
  REGISTRY_FRAGMENTS,
  REGISTRY_LIVES,
  SCENE,
  TILE_SIZE,
} from "../constants";
import { Checkpoint } from "../entities/Checkpoint";
import { Fragment } from "../entities/Fragment";
import { Player } from "../entities/Player";
import { Portal } from "../entities/Portal";
import { getLevel } from "../levels";
import type { LevelConfig } from "../levels/types";
import { audio } from "../systems/AudioEngine";
import { ChapterMechanics } from "../systems/ChapterMechanics";
import { fx } from "../systems/effects";
import { InputController, resetTouchState } from "../systems/InputController";
import { progress } from "../systems/ProgressManager";
import { settings } from "../systems/Settings";
import { TutorialState } from "../systems/tutorial";
import { showTitleCard, TITLE_CARD_MS } from "../ui/TitleCard";
import { shouldShowTouchControls } from "../ui/TouchControls";
import { Ambient } from "../world/Ambient";
import type { Dimension } from "../world/dimensionMath";
import { LoadedLevel, loadLevel } from "../world/LevelLoader";
import { Parallax } from "../world/Parallax";
import { PALETTE } from "../world/Palette";
import { TEXTURE } from "../world/PixelArt";
import { PIXEL_FONT_KEY } from "../world/PixelFont";
import { DimensionManager } from "../systems/DimensionManager";

export interface LevelSceneData {
  levelId?: string;
  /** Resume the saved run instead of starting over. */
  resume?: boolean;
}

interface RespawnPoint {
  x: number;
  y: number;
  dimension: Dimension;
}

/** Longest single frame added to the run clock, so a backgrounded tab does not inflate it. */
const MAX_CLOCK_STEP_MS = 100;
const PORTAL_NOTICE_COOLDOWN_MS = 1800;
const COMPLETE_DELAY_MS = 900;

export class LevelScene extends Phaser.Scene {
  private config!: LevelConfig;
  private levelKey: string | undefined;
  private level!: LoadedLevel;
  private player!: Player;
  private controls!: InputController;
  private stacks!: Record<Dimension, Parallax>;
  private dimensions!: DimensionManager;

  private fragments: Fragment[] = [];
  private checkpoints: Checkpoint[] = [];
  private portal?: Portal;
  private ambient?: Ambient;
  private mechanics!: ChapterMechanics;
  private tutorial?: TutorialState;
  /** Milliseconds left before tutorial tips may appear. */
  private tipDelayMs = 0;
  private collected = new Set<string>();
  private respawnPoint!: RespawnPoint;
  private elapsedMs = 0;
  private resume = false;
  private lastPortalNotice = -Infinity;

  private leaving = false;
  private completing = false;
  private completed = false;
  private lives = DEFAULT_LIVES;
  private isDying = false;
  private isInvulnerable = false;

  constructor() {
    super(SCENE.Level);
  }

  init(data: LevelSceneData): void {
    this.levelKey = data?.levelId;
    this.config = getLevel(data?.levelId);
    this.resume = !!data?.resume;
  }

  create(): void {
    this.cleanup();
    this.leaving = false;
    this.completing = false;
    this.completed = false;
    this.fragments = [];
    this.checkpoints = [];
    this.portal = undefined;
    this.lastPortalNotice = -Infinity;

    const config = this.config;
    const saved = this.restoreRun();

    this.cameras.main.setBackgroundColor(PALETTE.deepNavy);
    this.cameras.main.fadeIn(300, 16, 26, 50);

    this.stacks = {
      forgotten: new Parallax(this, "forgotten"),
      awakening: new Parallax(this, "awakening"),
    };
    this.level = loadLevel(this, config);

    const checkpointConfig = config.checkpoints?.find(
      (c) => c.id === saved?.checkpointId,
    );
    this.respawnPoint = checkpointConfig
      ? {
          x: checkpointConfig.col * TILE_SIZE + TILE_SIZE / 2,
          y: (checkpointConfig.row + 1) * TILE_SIZE,
          dimension: saved?.checkpointDimension ?? config.startDimension,
        }
      : { ...this.level.spawn, dimension: config.startDimension };

    this.physics.world.gravity.y = MOVE.gravity;
    this.physics.world.setBounds(
      0,
      0,
      this.level.widthPx,
      this.level.heightPx + 64,
    );
    this.physics.world.resume();

    this.player = new Player(this, this.respawnPoint.x, this.respawnPoint.y);
    this.dimensions = new DimensionManager(
      this,
      this.level,
      this.player,
      this.stacks,
      this.respawnPoint.dimension,
    );
    this.addObjects(saved?.checkpointId ?? null);
    this.mechanics = new ChapterMechanics(
      this,
      config,
      this.level,
      this.dimensions,
      this.player,
      {
        popup: (x, y, text, tint) => this.popup(x, y, text, tint),
        burst: (x, y, tint, count) => this.burst(x, y, tint, count),
        kill: (reason) => this.die(reason),
        allFound: () => this.allFound(),
        recordFlag: (flag) => {
          if (config.persistent) progress.recordFlag(flag, this.elapsedMs);
        },
      },
      saved?.flags ?? [],
    );
    this.ambient = new Ambient(
      this,
      this.dimensions,
      this.player,
      config.grids.awakening,
    );
    this.tutorial = new TutorialState(
      config.tips ?? [],
      TILE_SIZE,
      (id) => settings.hasSeenTip(id),
      (id) => settings.markTipSeen(id),
    );
    audio.setDimension(this.respawnPoint.dimension);
    // Tips wait until the title card has cleared, so the two never overlap.
    this.tipDelayMs = 0;
    if (config.persistent) {
      showTitleCard(this, config.chapter, config.name);
      this.tipDelayMs = TITLE_CARD_MS;
    }
    this.game.events.on(
      GAME_EVENT.DimensionSwitched,
      this.onDimensionSwitched,
      this,
    );

    const camera = this.cameras.main;
    camera.setBounds(0, 0, this.level.widthPx, GAME_HEIGHT);
    camera.startFollow(this.player, true, 0.12, 0);
    camera.setDeadzone(24, 0);
    camera.setRoundPixels(true);
    camera.scrollY = 0;

    this.controls = new InputController(this);
    this.input.keyboard?.on("keydown-R", this.restart, this);
    this.input.keyboard?.on("keydown-ESC", this.onEscape, this);
    this.input.keyboard?.on("keydown-P", this.togglePause, this);
    this.game.events.on(GAME_EVENT.RequestPause, this.togglePause, this);
    this.game.events.on(GAME_EVENT.RequestRestart, this.onRequestRestart, this);
    this.game.events.on(GAME_EVENT.RequestMenu, this.goToMenu, this);
    this.events.on(Phaser.Scenes.Events.RESUME, this.onResume, this);

    const chapterTitle = `Chapter ${String(config.chapter).padStart(2, "0")}  ${config.name}`;
    this.registry.set(REGISTRY_CHAPTER, chapterTitle);

    if (!this.scene.isActive(SCENE.UI)) {
      this.scene.launch(SCENE.UI, {
        chapter: chapterTitle,
      });
    }
    this.scene.bringToTop(SCENE.UI);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this);
  }

  update(_time: number, delta: number): void {
    const scrollX = this.cameras.main.scrollX;
    this.stacks.forgotten.update(scrollX, delta);
    this.stacks.awakening.update(scrollX, delta);
    this.dimensions.update();
    this.ambient?.update(this.time.now, !this.completing);
    if (this.completing) return;

    this.elapsedMs += Math.min(delta, MAX_CLOCK_STEP_MS);

    const input = this.controls.read();
    if (input.switchPressed) this.dimensions.trySwitch();
    this.player.updateMovement(delta, input);
    this.updateTutorial(input, delta);

    this.checkPickups();
    this.checkCheckpoints();
    this.checkPortal();
    this.mechanics.update(delta, this.playerBounds());

    // Fell into a pit: return to the last checkpoint, or the start.
    if (this.player.y > this.level.heightPx + 48) this.die("fall");
  }

  /** Sends the player back to the last checkpoint, or triggers Game Over if 0 lives left. */
  private die(reason: "fall" | "watcher" | "spike"): void {
    if (this.completing || this.isDying) return;
    if (this.isInvulnerable && reason !== "fall") return;

    this.isDying = true;
    const body = this.player.arcadeBody;
    if (reason === "watcher" || reason === "spike") {
      this.burst(
        body.center.x,
        body.center.y,
        [PALETTE.dangerRed, PALETTE.white, PALETTE.cyanAccent],
        26,
      );
      if (!fx.low) this.cameras.main.flash(140, 255, 60, 80, false);
    }
    if (fx.shake(1) > 0) this.cameras.main.shake(120, fx.shake(0.004));

    // Deduct life
    if (this.config.persistent) {
      this.lives = progress.deductLife();
    } else {
      this.lives = Math.max(0, this.lives - 1);
    }
    this.registry.set(REGISTRY_LIVES, this.lives);
    this.game.events.emit(GAME_EVENT.LivesChanged, { lives: this.lives, max: MAX_LIVES });
    this.game.events.emit(GAME_EVENT.PlayerDied, reason);

    if (this.lives <= 0) {
      this.popup(this.player.x, this.player.y - 28, "OUT OF LIVES", PALETTE.dangerRed);
      if (this.config.persistent) {
        progress.clearRun();
      }
      this.game.events.emit(GAME_EVENT.GameOver, { reason });
      return;
    }

    // Respawn with remaining lives
    this.dimensions.snapTo(this.respawnPoint.dimension);
    this.player.respawn(this.respawnPoint.x, this.respawnPoint.y);
    this.mechanics.onPlayerRespawned();

    // 1.2s invulnerability grace period (immune to watchers/hazards)
    this.isInvulnerable = true;
    this.player.startInvulnerability(1200);
    this.time.delayedCall(1200, () => {
      this.isInvulnerable = false;
    });

    this.time.delayedCall(150, () => {
      this.isDying = false;
    });
  }

  /** Loads or starts the saved run. Levels that are not persistent never touch the save. */
  private restoreRun() {
    this.collected = new Set();
    this.elapsedMs = 0;
    this.isDying = false;
    this.isInvulnerable = false;
    if (!this.config.persistent) {
      this.lives = DEFAULT_LIVES;
      this.registry.set(REGISTRY_LIVES, this.lives);
      return null;
    }

    if (this.resume && progress.canContinue(this.config.id)) {
      const run = progress.run!;
      this.collected = new Set(run.fragments);
      this.elapsedMs = run.elapsedMs;
      this.lives = run.lives;
      this.registry.set(REGISTRY_LIVES, this.lives);
      this.game.events.emit(GAME_EVENT.LivesChanged, { lives: this.lives, max: MAX_LIVES });
      return run;
    }
    const run = progress.startRun(this.config.id);
    this.lives = run.lives;
    this.registry.set(REGISTRY_LIVES, this.lives);
    this.game.events.emit(GAME_EVENT.LivesChanged, { lives: this.lives, max: MAX_LIVES });
    return null;
  }

  private addObjects(savedCheckpointId: string | null): void {
    const { config } = this;

    for (const fragmentConfig of config.fragments ?? []) {
      if (this.collected.has(fragmentConfig.id)) continue;
      this.fragments.push(new Fragment(this, fragmentConfig));
    }

    // Checkpoints up to and including the saved one stay lit.
    const all = config.checkpoints ?? [];
    const savedIndex = all.findIndex((c) => c.id === savedCheckpointId);
    all.forEach((checkpointConfig, index) => {
      const checkpoint = new Checkpoint(this, checkpointConfig);
      if (index <= savedIndex) checkpoint.light(true);
      this.checkpoints.push(checkpoint);
    });

    if (config.portal) {
      this.portal = new Portal(this, config.portal);
      if (this.allFound()) this.portal.unlock(true);
    }

    for (const fragment of this.fragments)
      fragment.applyDimension(this.dimensions.dimension);
    this.publishFragmentCount();
  }

  private total(): number {
    return this.config.fragments?.length ?? 0;
  }

  private allFound(): boolean {
    return this.total() > 0 && this.collected.size >= this.total();
  }

  private publishFragmentCount(): void {
    this.registry.set(REGISTRY_FRAGMENTS, {
      found: this.collected.size,
      total: this.total(),
    });
  }

  private onDimensionSwitched(dimension: Dimension): void {
    for (const fragment of this.fragments) fragment.applyDimension(dimension);
    this.mechanics?.onDimensionSwitched(dimension);
  }

  private playerBounds(): Phaser.Geom.Rectangle {
    const body = this.player.arcadeBody;
    return new Phaser.Geom.Rectangle(body.x, body.y, body.width, body.height);
  }

  private checkPickups(): void {
    const box = this.playerBounds();
    for (const fragment of this.fragments) {
      if (!fragment.canCollect) continue;
      if (Phaser.Geom.Intersects.RectangleToRectangle(box, fragment.bounds))
        this.collect(fragment);
    }
    this.fragments = this.fragments.filter((f) => !f.collected);
  }

  private collect(fragment: Fragment): void {
    this.collected.add(fragment.config.id);
    if (this.config.persistent)
      progress.recordFragment(fragment.config.id, this.elapsedMs);
    this.publishFragmentCount();

    this.game.events.emit(GAME_EVENT.FragmentCollected);
    this.burst(
      fragment.x,
      fragment.y,
      [PALETTE.energyGlow, PALETTE.cyanAccent, PALETTE.white],
      22,
    );
    this.popup(
      fragment.x,
      fragment.y - 14,
      `ECHO ${this.collected.size}/${this.total()}`,
      PALETTE.energyGlow,
    );
    fragment.collect();

    if (this.allFound() && this.portal) {
      this.portal.unlock();
      this.game.events.emit(GAME_EVENT.PortalUnlocked);
      this.popup(
        this.portal.x,
        this.portal.top - 8,
        "THE PORTAL WAKES",
        PALETTE.cyanAccent,
      );

      // Echo Bonus: finding all echoes in a chapter awards +1 life (anti-farming: once per chapter per run)
      if (this.config.persistent) {
        const bonusGranted = progress.claimBonusLife(this.config.id);
        if (bonusGranted) {
          this.lives = progress.lives;
          this.registry.set(REGISTRY_LIVES, this.lives);
          this.game.events.emit(GAME_EVENT.LivesChanged, { lives: this.lives, max: MAX_LIVES });
          this.popup(
            this.player.x,
            this.player.y - 28,
            "+1 LIFE BONUS",
            PALETTE.neonCoral,
          );
        }
      }
    }
  }

  private checkCheckpoints(): void {
    const box = this.playerBounds();
    for (const checkpoint of this.checkpoints) {
      if (checkpoint.active_) continue;
      if (!Phaser.Geom.Intersects.RectangleToRectangle(box, checkpoint.bounds))
        continue;

      checkpoint.light();
      this.game.events.emit(GAME_EVENT.CheckpointLit);
      const dimension = this.dimensions.dimension;
      this.respawnPoint = { ...checkpoint.feet, dimension };
      if (this.config.persistent) {
        progress.recordCheckpoint(
          checkpoint.config.id,
          dimension,
          this.elapsedMs,
        );
      }
      this.burst(
        checkpoint.x,
        checkpoint.y - 24,
        [PALETTE.cyanAccent, PALETTE.white],
        14,
      );
      this.popup(
        checkpoint.x,
        checkpoint.y - 36,
        "CHECKPOINT",
        PALETTE.cyanAccent,
      );
    }
  }

  private checkPortal(): void {
    const portal = this.portal;
    if (!portal) return;
    if (
      !Phaser.Geom.Intersects.RectangleToRectangle(
        this.playerBounds(),
        portal.bounds,
      )
    )
      return;

    if (portal.isUnlocked) {
      this.completeLevel(portal);
    } else if (
      this.time.now - this.lastPortalNotice >
      PORTAL_NOTICE_COOLDOWN_MS
    ) {
      this.lastPortalNotice = this.time.now;
      this.popup(
        portal.x,
        portal.top - 6,
        `FIND ALL ECHOES ${this.collected.size}/${this.total()}`,
        PALETTE.energyGlow,
      );
    }
  }

  private completeLevel(portal: Portal): void {
    if (this.completing) return;
    this.completing = true;
    this.completed = true;
    this.game.events.emit(GAME_EVENT.LevelCompleted);
    this.mechanics.halt();
    this.game.events.emit(GAME_EVENT.TipHide);

    const body = this.player.arcadeBody;
    body.setVelocity(0, 0);
    body.setAllowGravity(false);
    body.enable = false;
    this.tweens.add({
      targets: this.player,
      x: portal.x,
      y: this.player.y - 14,
      alpha: 0,
      scale: 0.35,
      duration: 650,
      ease: "Quad.In",
    });
    this.burst(
      portal.x,
      portal.arch.y - 20,
      [PALETTE.cyanAccent, PALETTE.energyGlow, PALETTE.white],
      30,
    );
    this.cameras.main.flash(320, 150, 230, 255, false);

    const timeMs = this.elapsedMs;
    const result = this.config.persistent
      ? progress.completeRun(this.config.id, timeMs, this.collected.size, this.config.next)
      : { timeMs, bestTimeMs: timeMs, isNewBest: false };

    this.time.delayedCall(COMPLETE_DELAY_MS, () => {
      if (this.leaving) return;
      const summary = {
        levelId: this.config.id,
        levelKey: this.levelKey,
        title: this.config.name,
        found: this.collected.size,
        total: this.total(),
        ...result,
      };
      if (this.config.final) {
        this.scene.launch(SCENE.Ending, summary);
        this.scene.bringToTop(SCENE.Ending);
      } else {
        this.scene.launch(SCENE.Complete, {
          ...summary,
          next: this.config.next,
        });
        this.scene.bringToTop(SCENE.Complete);
      }
    });
  }

  private burst(x: number, y: number, tint: number[], count: number): void {
    const emitter = this.add
      .particles(x, y, TEXTURE.pixel, {
        speed: { min: 40, max: 150 },
        angle: { min: 0, max: 360 },
        lifespan: { min: 300, max: 600 },
        scale: { start: 1.2, end: 0 },
        alpha: { start: 1, end: 0 },
        tint,
        gravityY: 30,
        emitting: false,
      })
      .setDepth(DEPTH.playerFx);
    emitter.explode(fx.count(count));
    this.time.delayedCall(800, () => emitter.destroy());
  }

  private popup(x: number, y: number, text: string, tint: number): void {
    const label = this.add
      .bitmapText(x, y, PIXEL_FONT_KEY, text)
      .setOrigin(0.5)
      .setTint(tint)
      .setDepth(DEPTH.popups);
    this.tweens.add({
      targets: label,
      y: y - 14,
      alpha: { from: 1, to: 0 },
      delay: 500,
      duration: 700,
      onComplete: () => label.destroy(),
    });
  }

  private updateTutorial(
    input: { switchPressed: boolean; jumpPressed: boolean },
    delta: number,
  ): void {
    if (this.tipDelayMs > 0) {
      this.tipDelayMs -= Math.min(delta, 50);
      return;
    }
    const change = this.tutorial?.update(
      this.player.x,
      { switched: input.switchPressed, jumped: input.jumpPressed },
      Math.min(delta, 50) / 1000,
    );
    if (!change) return;
    if ("show" in change) {
      const touch = shouldShowTouchControls(this.game);
      const text =
        touch && change.show.touchText
          ? change.show.touchText
          : change.show.text;
      this.game.events.emit(GAME_EVENT.TipShow, { id: change.show.id, text });
    } else {
      this.game.events.emit(GAME_EVENT.TipHide);
    }
  }

  /** ESC pauses. On the level complete panel it leaves for the menu instead. */
  private onEscape(): void {
    if (this.completing) this.goToMenu();
    else this.togglePause();
  }

  private togglePause(): void {
    if (this.leaving || this.completing) return;
    audio.setDuck(true);
    this.scene.launch(SCENE.Pause, { levelKey: this.levelKey });
    this.scene.bringToTop(SCENE.Pause);
    this.scene.pause();
  }

  private onResume(): void {
    // Keys released while paused are never seen, so clear any stuck input.
    this.input.keyboard?.resetKeys();
    resetTouchState();
  }

  /** Restarting begins a new run: fragments and checkpoints are cleared. */
  private restart(): void {
    if (this.leaving) return;
    this.scene.stop(SCENE.Complete);
    this.scene.stop(SCENE.Ending);
    this.scene.restart({
      levelId: this.levelKey,
      resume: false,
    } satisfies LevelSceneData);
  }

  private onRequestRestart(data?: { chapter?: string }): void {
    if (this.leaving) return;
    this.leaving = true;
    this.scene.stop(SCENE.Complete);
    this.scene.stop(SCENE.Ending);
    this.scene.stop(SCENE.UI);
    const target = data?.chapter ?? 'chapter1';
    progress.startRun(target);
    this.scene.start(SCENE.Level, { levelId: target, resume: false });
  }

  private goToMenu(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.scene.stop(SCENE.Complete);
    this.scene.stop(SCENE.Ending);
    this.scene.stop(SCENE.UI);
    this.scene.start(SCENE.Menu);
  }

  private cleanup(): void {
    if (this.config?.persistent && !this.completed)
      progress.saveTime(this.elapsedMs);
    this.game.events.off(GAME_EVENT.RequestPause, this.togglePause, this);
    this.game.events.off(GAME_EVENT.RequestRestart, this.onRequestRestart, this);
    this.game.events.off(GAME_EVENT.RequestMenu, this.goToMenu, this);
    this.events.off(Phaser.Scenes.Events.RESUME, this.onResume, this);
    this.game.events.emit(GAME_EVENT.TipHide);
    this.tutorial?.cancel();
    this.tutorial = undefined;
    this.ambient?.destroy();
    this.ambient = undefined;
    this.mechanics?.destroy();
    audio.setDuck(false);
    this.game.events.off(
      GAME_EVENT.DimensionSwitched,
      this.onDimensionSwitched,
      this,
    );
    this.input.keyboard?.off("keydown-R", this.restart, this);
    this.input.keyboard?.off("keydown-ESC", this.onEscape, this);
    this.input.keyboard?.off("keydown-P", this.togglePause, this);
    this.controls?.destroy(this);
    this.dimensions?.destroy();
  }
}
