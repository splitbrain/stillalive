/**
 * The World object.
 */

import { playSound, sfx_exit, sfx_field, sfx_grabCake, sfx_transition } from './audio.js';
import {
	Direction,
	FADE_START,
	KEY_DOWN,
	KEY_JUMP,
	KEY_LEFT,
	KEY_RIGHT,
	LevelPhase,
	ORDERED,
	PLAYFIELD_HEIGHT,
	PLAYFIELD_WIDTH,
	RANDOM,
	SparkleType,
	TILE_SIZE,
	TILE_SIZE_BITS,
	Transition,
} from './constants.js';
import { AnimatedTile } from './entities/AnimatedTile.js';
import { Boss } from './entities/Boss.js';
import { Cake } from './entities/Cake.js';
import { Camera } from './entities/Camera.js';
import { Crate } from './entities/Crate.js';
import { GravPipe } from './entities/GravPipe.js';
import { traceGravPipeField } from './entities/GravPipeField.js';
import { Plasma } from './entities/Plasma.js';
import { Platform } from './entities/Platform.js';
import { Player } from './entities/Player.js';
import { PortalPair } from './entities/PortalPair.js';
import { createCakeOrSmokeSparkles, removeSparkles } from './entities/Sparkle.js';
import { Turret } from './entities/Turret.js';
import { GRAVPIPE_DIRECTIONS, plasmaLaunch } from './level.js';
import { LevelEvents } from './LevelEvents.js';
import { TileMap } from './TileMap.js';
import { FIRST_OF_KIND, LAST_OF_KIND, Tile, TileKind, inForceFieldRange, isDeadlyTile, isTileKind } from './tiles.js';
import { inScreen, random } from './utils.js';

/** @type {{kind: string, type: number, speed: number}[]} The tile kinds that become animated tiles in a level. */
const ANIMATED_KINDS = [
	{ kind: TileKind.PLASMA_DOOR, type: RANDOM, speed: 6 },
	{ kind: TileKind.SWITCH_DOOR, type: RANDOM, speed: 6 },
	{ kind: TileKind.WHEEL, type: ORDERED, speed: 15 },
	{ kind: TileKind.ACID, type: ORDERED, speed: 15 },
	{ kind: TileKind.ENERGYWALL, type: RANDOM, speed: 6 },
	{ kind: TileKind.FORCE_FIELD, type: ORDERED, speed: 6 },
	{ kind: TileKind.BELT_RIGHT, type: ORDERED, speed: 10 },
	{ kind: TileKind.BELT_LEFT, type: ORDERED, speed: 10 },
];

/**
 * A solid thing at a point: a tile id, a crate or a platform. The tile id Tile.EMPTY means that nothing solid is there.
 *
 * @typedef {number|Crate|Platform} Solid
 */

/**
 * Check if objects pass through a tile. The exit, the deadly tiles, the player start and the force fields are not
 * solid.
 *
 * @param {number} tile The tile id.
 * @returns {boolean} True if objects pass the tile.
 */
function isPassable(tile) {
	return tile == Tile.EXIT || isDeadlyTile(tile) || tile == Tile.PLAYER_START || inForceFieldRange(tile);
}

/**
 * The state of one level, one preview or one editor map. Each level start creates a new World.
 */
export class World {
	/** @type {TileMap} The tiles of the map. */
	map;
	/** @type {import('./level.js').Level|null} The level that runs, or null for a preview or an editor map. */
	level = null;
	/** @type {boolean} True if a replay plays the level. */
	#replaying = false;
	/** @type {import('./entities/Cake.js').Cake[]} The cakes. */
	cakes = [];
	/** @type {import('./entities/Crate.js').Crate[]} The crates. */
	crates = [];
	/** @type {import('./entities/Turret.js').Turret[]} The turrets. */
	turrets = [];
	/** @type {import('./entities/Plasma.js').Plasma[]} The plasma balls. */
	plasmaBall = [];
	/** @type {import('./entities/Platform.js').Platform[]} The moving platforms. */
	platforms = [];
	/** @type {import('./entities/GravPipe.js').GravPipe[]} The gravitational pipes. */
	gravPipes = [];
	/** @type {object[]} The fields of the gravitational pipes. */
	gravPipeFields = [];
	/** @type {import('./entities/AnimatedTile.js').AnimatedTile[]} The animated tiles. */
	animatedTiles = [];
	/** @type {import('./entities/Projectile.js').Projectile[]} The projectiles of the boss. */
	projectiles = [];
	/** @type {import('./entities/Sparkle.js').Sparkle[]} The sparkles. */
	sparkles = [];
	/** @type {Player} The player. */
	player;
	/** @type {PortalPair} The two portals. */
	portals = new PortalPair(this);
	/** @type {Boss|null} The boss of the level, or null for a level without a boss. */
	boss = null;
	/** @type {Camera|null} The security camera, or null for a preview or an editor map. */
	camera = null;
	/** @type {number} The x position of the tube in 1/256 pixels, or -1 for a level without a tube. */
	tubeX = -1;
	/** @type {number} The y position of the tube in 1/256 pixels, or -1 for a level without a tube. */
	tubeY = -1;
	/** @type {number} The x start position of the plasma shots of the boss in 1/256 pixels. */
	plasmaX = 0;
	/** @type {number} The y start position of the plasma shots of the boss in 1/256 pixels. */
	plasmaY = 0;
	/** @type {number} The level time in ticks. */
	time = 0;
	/** @type {number} The walked distance of the player for the step counter. */
	steps = 0;
	/** @type {number} The number of portals that the player shot. */
	portalShots = 0;
	/** @type {number} The number of cakes that the player has not eaten yet. */
	cakesLeft = 0;
	/** @type {{jump: boolean, portals: boolean}} The abilities of the player. */
	abilities = { jump: false, portals: false };
	/** @type {import('./mapFile.js').MapLabel[]} The texts at positions of the playfield. */
	labels = [];
	/** @type {number} The index of the background image. */
	background = 0;
	/** @type {number} The x shift of the drawing in playfield units: the screen shake of the boss levels, else 0. */
	shakeX = 0;
	/** @type {number} The y shift of the drawing in playfield units: the screen shake of the boss levels, else 0. */
	shakeY = 0;
	/** @type {number} The phase of the level, a value of LevelPhase. */
	phase;
	/** @type {number} The progress of the opening and the closing transition, from FADE_START down to 0. */
	fade;
	/** @type {number} 1 while the player or a crate holds a switch and the switch doors are open. */
	switchPressed = 0;
	/**
	 * @type {import('./entities/Portal.js').Portal|null} The portal that an object is in during this tick, or null.
	 *     The drawing then draws the tiles around the portals over the objects.
	 */
	objectInPortal = null;
	/** @type {LevelEvents|null} The events of the level, or null outside a level. */
	events = null;
	/** @type {number} The effect of the opening and the closing transition, a value of Transition. */
	transition = Transition.HORIZONTAL_LINES;
	/**
	 * @type {string|null} The result of the last tick: "finished" when the closing transition ended, "died" when the
	 *     death fade ended, "brokenReplay" when the player died in a replay or when the replay has fewer inputs than
	 *     the level needs, else null.
	 */
	outcome = null;
	/** @type {import('./InputState.js').InputState|null} The keys and the mouse of the tick, or null before a tick. */
	input = null;

	/**
	 * Create a World without objects at the start of the opening transition.
	 *
	 * @param {TileMap} map The map. The World uses the object and does not copy it.
	 */
	constructor(map) {
		this.map = map;
		this.player = new Player(this);
		this.resetPhase();
	}

	/**
	 * Check if a replay plays the level.
	 *
	 * @returns {boolean} True if the World plays a replay.
	 */
	get replaying() {
		return this.#replaying;
	}

	/**
	 * Create the World of a level start. The object tiles leave the map, the exits close, and the animated tiles and
	 * the plasma balls start.
	 *
	 * @param {import('./level.js').Level} level The level.
	 * @param {object} [options] The options.
	 * @param {boolean} [options.restart] True for a restart of the same level, for example after a death. A restart and
	 *     a replay skip the waits of the events and the entrance of the boss.
	 * @param {boolean} [options.replay] True if a replay plays the level.
	 * @param {number} [options.transition] The effect of the opening transition, a value of Transition.
	 * @returns {World} The World.
	 */
	static forLevel(level, { restart = false, replay = false, transition = Transition.HORIZONTAL_LINES } = {}) {
		const world = new World(new TileMap(level.tiles));
		world.level = level;
		world.#replaying = replay;
		world.transition = transition;
		if (level.fromBelow) world.#jumpInFromBelow();
		world.boss = level.boss ? new Boss(world, level.boss) : null;
		world.#parse({ levelStart: true, boss: level.boss });
		world.camera = new Camera(world, world.player.x, world.player.y);
		world.cakesLeft = world.cakes.length;
		if (world.cakesLeft == 0) world.openExit();
		world.background = level.bg;
		world.abilities = { ...level.abilities };
		world.labels = level.labels;
		world.events = new LevelEvents(world, level.events, restart || replay);
		world.events.update(); // fire the start events
		if (world.boss && (restart || replay)) world.boss.skipEntry();
		return world;
	}

	/**
	 * Create the World of a preview of a level or of a map. The objects stand at their start positions, and a map
	 * without cakes shows the open exit.
	 *
	 * @param {{tiles: number[], bg: number, boss?: number, fromBelow?: boolean}} level The level or the editor map.
	 * @returns {World} The World.
	 */
	static forPreview(level) {
		const world = new World(new TileMap(level.tiles));
		world.#parse();
		if (level.fromBelow) world.#jumpInFromBelow();
		world.boss = level.boss ? new Boss(world, level.boss) : null;
		world.cakesLeft = world.cakes.length;
		if (world.cakesLeft == 0) {
			const map = world.map;
			for (let i = 0; i < map.display.length; i++) {
				if (map.display[i] == Tile.EXIT_CLOSED) map.setDisplay(i, Tile.EXIT);
			}
		}
		world.background = level.bg;
		return world;
	}

	/**
	 * Create the World of the editor map with the objects of the map.
	 *
	 * @param {TileMap} map The editor map. The World uses the object and does not copy it.
	 * @returns {World} The World.
	 */
	static forEditor(map) {
		const world = new World(map);
		world.createEditorObjects();
		return world;
	}

	/**
	 * Create the objects of the editor map again. The player stays outside the playfield if the map has no player
	 * start tile.
	 *
	 * @returns {void}
	 */
	createEditorObjects() {
		this.player = new Player(this);
		this.player.x = -(TILE_SIZE << 8);
		this.resetPhase();
		this.#parse({ editor: true });
	}

	/**
	 * Set the control flags of the player from the keys of the tick. The player jumps only with the jump ability and
	 * outside a portal.
	 *
	 * @param {import('./InputState.js').InputState} input The keys of the tick and of the previous tick.
	 * @returns {void}
	 */
	applyInput(input) {
		const player = this.player;
		if (input.clearPressed) player.askClear = true;

		player.left = (input.keys & KEY_LEFT) != 0;
		player.right = (input.keys & KEY_RIGHT) != 0;
		player.down = (input.keys & KEY_DOWN) != 0;

		if (input.keys & KEY_JUMP && this.abilities.jump && !this.portals.isInPortal(player)) {
			if (!(input.oldKeys & KEY_JUMP)) player.oldJump = player.jump;
			player.jump = true;
		}
		if (!(input.keys & KEY_JUMP)) {
			if (input.oldKeys & KEY_JUMP) player.oldJump = player.jump;
			player.jump = false;
		}
	}

	/**
	 * Run one tick of the level. The level time stands still while an event waits and while the boss comes in. The
	 * outcome tells the caller what happened in the tick.
	 *
	 * @param {import('./InputState.js').InputState} input The keys and the mouse of the tick.
	 * @returns {void}
	 */
	tick(input) {
		this.input = input;
		this.outcome = null;
		if (this.isRunning()) {
			if (this.time == 0) input.unclick();
			this.time++;
		}
		this.objectInPortal = null;
		if (!this.player.dead && this.isRunning()) {
			this.player.move();
			if (!this.objectInPortal) this.objectInPortal = this.portals.isInPortal(this.player);
		}

		this.#manageDoors();
		if (this.#atExit()) {
			this.#updateLevelEnd();
		} else if (this.isOpening()) {
			this.fade -= 4;
			if (this.fade <= 0) this.phase = LevelPhase.RUNNING;
		} else if (this.isHalted()) {
			this.phase = LevelPhase.RUNNING;
		}

		if ((this.events.isWaiting() || this.boss?.entering) && this.isRunning()) {
			this.phase = LevelPhase.HALTED;
		}
		this.#updateObjects();
		// the caller starts the level again after this tick, so the boss and the events do not run in this tick
		if (this.outcome == 'died') return;
		this.boss?.update();
		if (!this.reachedExit()) this.events.update();
	}

	/**
	 * Run the end of the level after the player reaches the exit. An exit event that waits for a click holds the
	 * closing transition until the click. The level stays in the exit freeze after the closing transition.
	 *
	 * @returns {void}
	 */
	#updateLevelEnd() {
		this.boss = null;
		this.shakeX = 0;
		this.shakeY = 0;

		// the player starts on the open exit: the opening transition continues as the closing transition
		if (this.isOpening()) this.phase = LevelPhase.CLOSING;
		if (this.isClosing()) {
			this.fade -= 4;
			if (this.fade <= 0) {
				this.fade = 0;
				this.phase = LevelPhase.ENDED;
				this.outcome = 'finished';
			}
		}
		if (this.isRunning() || this.events.isWaiting()) {
			this.events.trigger('exit');
			this.events.update();
			if (this.events.isWaiting()) {
				this.phase = LevelPhase.EXIT_WAIT;
				return;
			}
			this.phase = LevelPhase.CLOSING;
			this.fade = FADE_START;
			this.transition = random(Transition.TOP_LEFT, Transition.SQUARE + 1);
			playSound(sfx_transition);
			this.events.message = null;
			this.input.unclick();
		}
	}

	/**
	 * Update the objects, the camera and the death fade for one tick. No object moves while the level time stands
	 * still.
	 *
	 * @returns {void}
	 */
	#updateObjects() {
		const running = this.isRunning();
		let i;

		for (const tile of this.animatedTiles) tile.animate();

		this.player.flip = this.input.mouseX > this.player.midX() ? 1 : -1;

		this.#rebuildGravPipeFields();

		if (running) {
			for (const c of this.cakes) {
				if (c.used) c.move();
			}
			for (const t of this.turrets) {
				t.update();
				if (!this.objectInPortal) this.objectInPortal = this.portals.isInPortal(t);
			}
		}

		for (i = 0; i < this.plasmaBall.length; i++) {
			const ball = this.plasmaBall[i];
			if (!ball.used) continue;
			ball.animate();
			if (running) {
				ball.move();
				if (!this.objectInPortal) this.objectInPortal = this.portals.isInPortal(ball);
				if (ball.needKill) {
					this.plasmaBall.splice(i, 1);
					i--;
				}
			}
		}

		for (i = 0; i < this.sparkles.length; i++) {
			this.sparkles[i].move();
			if (this.sparkles[i].fading <= 0) {
				this.sparkles.splice(i, 1);
				i--;
			}
		}

		for (i = 0; i < this.crates.length; i++) {
			const c = this.crates[i];
			// a shrinking crate moves at half of its speed
			if (c.shrink > 0) {
				c.x += c.vx >> 1;
				c.y += c.vy >> 1;
			}
			if (running) {
				c.update();
				if (c.needKill) {
					if (c.carried) this.player.carrying = null;
					this.crates.splice(i, 1);
					i--;
					continue;
				}
				if (!this.objectInPortal) this.objectInPortal = this.portals.isInPortal(c);
			}
		}

		if (this.boss && running) {
			if (this.boss.shootsWheels()) this.#updateProjectiles();
			this.boss.updateRumble();
		}

		if (running) {
			for (const p of this.platforms) p.move();
		}
		this.portals.update();
		this.camera.move();

		if (this.player.dead) {
			this.player.life += 6;
			this.player.checkDeath();
		}
	}

	/**
	 * Move the razor wheels of the boss, kill the player on a hit and remove the stopped wheels after their timer.
	 *
	 * @returns {void}
	 */
	#updateProjectiles() {
		for (let i = 0; i < this.projectiles.length; i++) {
			const p = this.projectiles[i];
			p.move();
			if (!p.needKill && p.overlaps(this.player)) {
				this.projectiles.splice(i, 1);
				this.player.life = -200;
				this.player.recoveryTime = 180;
				return;
			}
			if (p.needKill && p.timer == 0) {
				this.projectiles.splice(i, 1);
				i--;
			}
		}
	}

	/**
	 * Build the pipe fields of all gravitational pipes again. A field reaches from the gravitational pipe to the first
	 * wall or platform. At a portal, the field continues from the other portal.
	 *
	 * @returns {void}
	 */
	#rebuildGravPipeFields() {
		if (this.gravPipes.length == 0) return;
		this.gravPipeFields = new Array();
		for (const t of this.gravPipes) {
			let vx = 0;
			let vy = 0;
			switch (t.dir) {
				case Direction.RIGHT:
					vx = 1;
					break;
				case Direction.LEFT:
					vx = -1;
					break;
				case Direction.UP:
					vy = -1;
					break;
				case Direction.DOWN:
					vy = 1;
					break;
			}
			traceGravPipeField(this, t.x >> 8, t.y >> 8, vx, vy);
		}
	}

	/**
	 * Collect the cakes that the player touches, and open the exit when the last cake is collected.
	 *
	 * @returns {void}
	 */
	collectCakes() {
		for (const cake of this.cakes) {
			if (cake.used) {
				if (this.player.overlaps(cake)) {
					cake.used = false;
					this.cakesLeft--;
					createCakeOrSmokeSparkles(this, cake.x, cake.y, SparkleType.CAKE, 2, 180);
					playSound(sfx_grabCake);
					if (this.cakesLeft == 0) {
						this.openExit();
						playSound(sfx_exit);
					}
				}
			}
		}
	}

	/**
	 * Open the exit.
	 *
	 * @returns {void}
	 */
	openExit() {
		const map = this.map;
		for (let i = 0; i < map.tiles.length; i++) {
			if (map.tiles[i] == Tile.EXIT_CLOSED) map.set(i, Tile.EXIT);
		}
	}

	/**
	 * Place the player below the bottom edge with a speed upward, so the player jumps into the level.
	 *
	 * @returns {void}
	 */
	#jumpInFromBelow() {
		this.player.vy = -2400;
		this.player.x = (8 * TILE_SIZE) << 8;
		this.player.y = PLAYFIELD_HEIGHT << 8;
	}

	/**
	 * Create the objects of the map at their start positions. The method sets the position of the player when the
	 * map has a player start tile. Without options, the method prepares a preview: the logic layer stays the same, the
	 * display layer shows the closed exits, and the tube tile is the tube of the boss.
	 *
	 * @param {object} [options] The options.
	 * @param {boolean} [options.levelStart] True for a level start: the object tiles leave the map, the gravitational
	 *     pipes block their tiles, the exits close, and the animated tiles and the plasma balls start. In the levels of
	 *     boss 3 and boss 4, the plasma start tile is the start point of the plasma shots of the boss.
	 * @param {boolean} [options.editor] True for the editor map: both layers stay the same, and the tube tile is a
	 *     tile of the map.
	 * @param {number} [options.boss] The boss of the level, or 0 for a level without a boss.
	 * @returns {void}
	 */
	#parse({ levelStart = false, editor = false, boss = 0 } = {}) {
		let vx;
		this.cakes = [];
		this.turrets = [];
		this.crates = [];
		this.gravPipes = [];
		this.gravPipeFields = [];
		this.platforms = [];

		const map = this.map;
		for (let i = 0; i < map.tiles.length; i++) {
			const x = map.column(i);
			const y = map.row(i);
			const tile = map.tiles[i];
			const animated = levelStart ? ANIMATED_KINDS.find((a) => isTileKind(tile, a.kind)) : undefined;

			if (tile in GRAVPIPE_DIRECTIONS) {
				const dir = GRAVPIPE_DIRECTIONS[tile];
				this.gravPipes.push(new GravPipe(this, (x * TILE_SIZE) << 8, (y * TILE_SIZE) << 8, dir));
				if (levelStart) {
					// a gravitational pipe covers two tiles
					const next = dir == Direction.RIGHT || dir == Direction.LEFT ? map.index(x, y + 1) : map.index(x + 1, y);
					map.setTile(i, Tile.GRAVPIPE_BLOCK);
					map.setTile(next, Tile.GRAVPIPE_BLOCK);
					map.setDisplay(i, Tile.EMPTY);
					map.setDisplay(next, Tile.EMPTY);
				}
			} else if (tile == Tile.EXIT) {
				if (levelStart) map.setTile(i, Tile.EXIT_CLOSED);
				if (!editor) map.setDisplay(i, Tile.EXIT_CLOSED);
			} else if (animated) {
				map.setDisplay(i, Tile.EMPTY);
				this.animatedTiles.push(
					new AnimatedTile(
						this,
						x,
						y,
						FIRST_OF_KIND[animated.kind],
						LAST_OF_KIND[animated.kind],
						animated.type,
						i,
						animated.speed,
					),
				);
			} else if (tile == Tile.CAKE) {
				this.cakes.push(new Cake(this, (x * TILE_SIZE) << 8, (y * TILE_SIZE) << 8));
				if (levelStart) map.setTile(i, Tile.EMPTY);
			} else if (tile == Tile.TURRET_LEFT || tile == Tile.TURRET_RIGHT) {
				if (levelStart) map.set(i, Tile.EMPTY);
				this.turrets.push(
					new Turret(this, (x * TILE_SIZE) << 8, (y * TILE_SIZE) << 8, tile == Tile.TURRET_LEFT ? -1 : 1),
				);
			} else if (tile == Tile.CRATE) {
				if (levelStart) map.set(i, Tile.EMPTY);
				this.crates.push(new Crate(this, (x * TILE_SIZE) << 8, (y * TILE_SIZE) << 8));
			} else if (tile == Tile.PLAYER_START) {
				this.player.x = (x * TILE_SIZE) << 8;
				this.player.y = (y * TILE_SIZE) << 8;
				if (levelStart) map.setTile(i, Tile.EMPTY);
			} else if (tile == Tile.PLATFORM_RIGHT || tile == Tile.PLATFORM_LEFT) {
				vx = tile == Tile.PLATFORM_RIGHT ? 256 : -256;
				this.platforms.push(new Platform(this, (x * TILE_SIZE) << 8, (y * TILE_SIZE) << 8, vx, 0));
				if (levelStart) map.setTile(i, Tile.EMPTY);
			} else if (tile == Tile.TUBE) {
				if (editor) continue;
				this.tubeX = (x * TILE_SIZE) << 8;
				this.tubeY = (y * TILE_SIZE) << 8;
				if (levelStart) map.set(i, Tile.EMPTY);
			} else if (tile == Tile.PLASMA_START && levelStart) {
				const launch = plasmaLaunch(map, x, y);
				if (launch && boss == 0) this.plasmaBall.push(new Plasma(this, launch.x, launch.y, launch.vx, launch.vy));
				else if (launch && (boss == 3 || boss == 4)) {
					this.plasmaX = launch.x;
					this.plasmaY = launch.y;
				}
			}
		}
	}

	/**
	 * Get the solid tile at a point, or the object at the point where the map is empty.
	 *
	 * @param {number} x The x coordinate in pixels.
	 * @param {number} y The y coordinate in pixels.
	 * @param {boolean} crates True if the crates count.
	 * @param {boolean} platforms True if the platforms count.
	 * @returns {Solid} The tile id or the object, or Tile.EMPTY if nothing solid is there or the point is outside the
	 *     playfield.
	 */
	#solidAt(x, y, crates, platforms) {
		if (!inScreen(x, y)) return Tile.EMPTY;
		const map = this.map;
		const tile = map.tiles[map.index(x >> TILE_SIZE_BITS, y >> TILE_SIZE_BITS)];
		if (tile == Tile.EMPTY) return (crates && this.crateAt(x, y)) || (platforms && this.platformAt(x, y)) || Tile.EMPTY;
		return isPassable(tile) ? Tile.EMPTY : tile;
	}

	/**
	 * Get the solid tile, crate or platform at a point.
	 *
	 * @param {number} x The x coordinate in pixels.
	 * @param {number} y The y coordinate in pixels.
	 * @returns {Solid} The tile id, the crate, the platform, or Tile.EMPTY if nothing solid is there.
	 */
	getTile(x, y) {
		return this.#solidAt(x, y, true, true);
	}

	/**
	 * Get the solid tile or platform at a point, without the crates.
	 *
	 * @param {number} x The x coordinate in pixels.
	 * @param {number} y The y coordinate in pixels.
	 * @returns {Solid} The tile id, the platform, or Tile.EMPTY if nothing solid is there.
	 */
	getTileWithoutCrates(x, y) {
		return this.#solidAt(x, y, false, true);
	}

	/**
	 * Get the solid tile at a point, without the crates and the platforms.
	 *
	 * @param {number} x The x coordinate in pixels.
	 * @param {number} y The y coordinate in pixels.
	 * @returns {number} The tile id, or Tile.EMPTY if nothing solid is there.
	 */
	getTileWithoutObjects(x, y) {
		return this.#solidAt(x, y, false, false);
	}

	/**
	 * Get the tile or platform at a point for a portal shot. The shot passes through the exit, the first wheel frame,
	 * the red energy walls, the cakes and the player start.
	 *
	 * @param {number} x The x coordinate in pixels.
	 * @param {number} y The y coordinate in pixels.
	 * @returns {Solid} The tile id, the platform, or Tile.EMPTY if the shot passes.
	 */
	getTilePortal(x, y) {
		if (x >= PLAYFIELD_WIDTH || y >= PLAYFIELD_HEIGHT || y < 0 || x < 0) return 0;
		const map = this.map;
		let tile = map.tiles[map.index(x >> TILE_SIZE_BITS, y >> TILE_SIZE_BITS)];
		if (
			tile == Tile.EXIT ||
			tile == FIRST_OF_KIND[TileKind.WHEEL] ||
			isTileKind(tile, TileKind.ENERGYWALL) ||
			tile == Tile.CAKE ||
			tile == Tile.PLAYER_START
		)
			tile = Tile.EMPTY;

		if (!tile) {
			tile = this.platformAt(x, y) || Tile.EMPTY;
		}

		return tile;
	}

	/**
	 * Find the crate at a point. Carried crates and crates in a portal do not count.
	 *
	 * @param {number} x The x coordinate in pixels.
	 * @param {number} y The y coordinate in pixels.
	 * @returns {Crate|null} The crate, or null.
	 */
	crateAt(x, y) {
		return this.#findCrate(x, y, false);
	}

	/**
	 * Find the crate at a point, including carried crates and crates in a portal.
	 *
	 * @param {number} x The x coordinate in pixels.
	 * @param {number} y The y coordinate in pixels.
	 * @returns {Crate|null} The crate, or null.
	 */
	anyCrateAt(x, y) {
		return this.#findCrate(x, y, true);
	}

	/**
	 * Find a crate at a point.
	 *
	 * @param {number} x The x coordinate in pixels.
	 * @param {number} y The y coordinate in pixels.
	 * @param {boolean} any True if all crates count. False if carried crates and crates in a portal do not count.
	 * @returns {Crate|null} The first crate that counts at the point, or null.
	 */
	#findCrate(x, y, any) {
		for (let i = 0; i < this.crates.length; i++) {
			const crate = this.crates[i];
			const x2 = crate.x >> 8;
			const y2 = crate.y >> 8;
			if (
				(any || (!crate.carried && !this.portals.isInPortal(crate))) &&
				x > x2 &&
				x < x2 + TILE_SIZE - 1 &&
				y > y2 &&
				y < y2 + TILE_SIZE - 1
			)
				return crate;
		}
		return null;
	}

	/**
	 * Find a moving crate that overlaps an object.
	 *
	 * @param {import('./entities/Body.js').Body} obj The object.
	 * @returns {Crate|null} The crate, or null if no moving crate overlaps the object.
	 */
	movingCrateTouching(obj) {
		for (let i = 0; i < this.crates.length; i++) {
			const crate = this.crates[i];
			if (!crate.carried && (crate.vx != 0 || crate.vy != 0) && !this.portals.isInPortal(crate) && crate.overlaps(obj))
				return crate;
		}
		return null;
	}

	/**
	 * Find the platform at a point.
	 *
	 * @param {number} x The x coordinate in pixels.
	 * @param {number} y The y coordinate in pixels.
	 * @returns {Platform|null} The platform, or null.
	 */
	platformAt(x, y) {
		let pi;
		for (pi = 0; pi < this.platforms.length; pi++) {
			const x2 = this.platforms[pi].x >> 8;
			const y2 = this.platforms[pi].y >> 8;
			if (x > x2 && x < x2 + 3 * TILE_SIZE && y >= y2 && y < y2 + TILE_SIZE - 1) return this.platforms[pi];
		}
		return null;
	}

	/**
	 * Check if a plasma ball overlaps an object.
	 *
	 * @param {import('./entities/Body.js').Body} obj The object.
	 * @returns {boolean} True if a ball overlaps the object.
	 */
	plasmaTouching(obj) {
		let i;
		for (i = 0; i < this.plasmaBall.length; i++) {
			if (this.plasmaBall[i].used && this.plasmaBall[i].overlaps(obj)) return true;
		}

		return false;
	}

	/**
	 * Find the pipe fields that an object overlaps.
	 *
	 * @param {import('./entities/Body.js').Body} obj The object.
	 * @returns {object[]} The fields.
	 */
	gravPipeFieldsAt(obj) {
		let i;
		const fields = new Array();

		for (i = 0; i < this.gravPipeFields.length; i++) {
			let x = this.gravPipeFields[i].x;
			let y = this.gravPipeFields[i].y;
			let w = this.gravPipeFields[i].w;
			let h = this.gravPipeFields[i].h;

			if (w < 0) {
				w = -w;
				x -= w;
			} else if (h < 0) {
				h = -h;
				y -= h;
			}

			if (obj.overlapsBox(x, y, w, h)) {
				fields.push(this.gravPipeFields[i]);
			}
		}

		return fields;
	}

	/**
	 * Get the conveyor belt that moves an object, directly or through the crate that the object stands on.
	 *
	 * @param {import('./entities/Body.js').Body} obj The object. It must also have the vertical speed vy.
	 * @returns {number} 3 for a belt to the right, 4 for a belt to the left, else 0.
	 */
	onBelt(obj) {
		const ground = obj.touchingGround();
		if (ground == 3 || ground == 4) {
			return ground;
		} else {
			const y = (obj.y >> 8) + obj.pY;
			const crate = this.crateAt(obj.x >> 8, y) || this.crateAt((obj.x >> 8) + obj.pX - 1, y);
			if (crate && crate.carpet > 0) return crate.carpet;
		}

		return 0;
	}

	/**
	 * Get the platform that carries an object, directly or through the crate that the object stands on. The search
	 * looks below the left edge of the object first, then below the right edge.
	 *
	 * @param {import('./entities/Body.js').Body} obj The object.
	 * @returns {Platform|null} The platform, or null.
	 */
	onPlatform(obj) {
		const x = obj.x >> 8;
		const y = (obj.y >> 8) + obj.pY;
		const platform = this.platformAt(x, y) || this.platformAt(x + obj.pX - 1, y);
		if (platform) return platform;
		return (this.crateAt(x, y) || this.crateAt(x + obj.pX - 1, y))?.platform ?? null;
	}

	/**
	 * Open or close the switch doors when the player or a crate steps on or off a switch.
	 *
	 * @returns {void}
	 */
	#manageDoors() {
		if (!this.switchPressed) {
			if (this.#playerOnSwitch(this.player.x >> 8, this.player.y >> 8)) {
				this.switchPressed = 1;
				this.#openSwitchDoors();
			} else if (this.#crateOnSwitch()) {
				this.switchPressed = 1;
				this.#openSwitchDoors();
			}
		} else {
			if (!this.#playerOnSwitch(this.player.x >> 8, this.player.y >> 8) && !this.#crateOnSwitch()) {
				this.switchPressed = 0;
				this.#closeSwitchDoors();
			}
		}
	}

	/**
	 * Remove everything that blocks a closed switch door. Portals on the door go away. Crates and plasma balls in the
	 * door go back to their start positions.
	 *
	 * @returns {void}
	 */
	#clearDoorBlockers() {
		const door = FIRST_OF_KIND[TileKind.SWITCH_DOOR];
		for (let i = 0; i < 2; i++) {
			const portal = this.portals.list[i];
			if (!portal.used) continue;
			let x = portal.x >> 8;
			let y = portal.y >> 8;
			switch (portal.direction) {
				case Direction.UP:
					y += 6;
					break;
				case Direction.LEFT:
					x += 6;
					break;
				case Direction.RIGHT:
					x -= 2;
					break;
				case Direction.DOWN:
					y -= 2;
					break;
			}
			const onSideWall = portal.direction == Direction.LEFT || portal.direction == Direction.RIGHT;
			for (let j = 0; j < 2 * TILE_SIZE; j++) {
				if (this.map.atPixel(onSideWall ? x : x + j, onSideWall ? y + j : y) == door) {
					portal.used = false;
					removeSparkles(this, i, SparkleType.PORTAL_GLOW);
					break;
				}
			}
		}

		for (const crate of this.crates) {
			if (this.#touchesSwitchDoor(crate)) {
				crate.x = crate.xOrig;
				crate.y = crate.yOrig;
				crate.vx = 0;
				crate.vy = 0;
			}
		}

		for (const ball of this.plasmaBall) {
			if (this.#touchesSwitchDoor(ball)) ball.reset();
		}
	}

	/**
	 * Check if a 16 by 16 object touches a switch door with one of its corners.
	 *
	 * @param {import('./entities/Body.js').Body} obj The object.
	 * @returns {boolean} True if a corner of the object is on a switch door tile.
	 */
	#touchesSwitchDoor(obj) {
		const door = FIRST_OF_KIND[TileKind.SWITCH_DOOR];
		const x = obj.x >> 8;
		const y = obj.y >> 8;
		const corners = [
			[x, y],
			[x + TILE_SIZE - 1, y],
			[x, y + TILE_SIZE - 1],
			[x + TILE_SIZE - 1, y + TILE_SIZE - 1],
		];
		return corners.some(([cx, cy]) => this.map.atPixel(cx, cy) == door);
	}

	/**
	 * Close the switch doors.
	 *
	 * @returns {void}
	 */
	#closeSwitchDoors() {
		let i;
		playSound(sfx_field);
		for (i = 0; i < this.animatedTiles.length; i++) {
			if (isTileKind(this.animatedTiles[i].current, TileKind.SWITCH_DOOR)) {
				this.animatedTiles[i].used = true;
				this.map.setTile(this.animatedTiles[i].place, this.animatedTiles[i].min);
			}
		}
		this.#clearDoorBlockers();
	}

	/**
	 * Open the switch doors.
	 *
	 * @returns {void}
	 */
	#openSwitchDoors() {
		let i;
		playSound(sfx_field);
		for (i = 0; i < this.animatedTiles.length; i++) {
			if (isTileKind(this.animatedTiles[i].current, TileKind.SWITCH_DOOR)) {
				this.animatedTiles[i].used = false;
				this.map.setTile(this.animatedTiles[i].place, Tile.EMPTY);
			}
		}
	}

	/**
	 * Check if the player stands on a switch. The test points lie a few pixels inside the tile below the feet.
	 *
	 * @param {number} x The x coordinate of the player in pixels.
	 * @param {number} y The y coordinate of the player in pixels.
	 * @returns {boolean} True if a switch tile is below the player.
	 */
	#playerOnSwitch(x, y) {
		if (this.map.atPixel(x, y + this.player.pY + 5) == Tile.SWITCH) return true;
		else if (this.map.atPixel(x + 15, y + this.player.pY + 5) == Tile.SWITCH) return true;
		return false;
	}

	/**
	 * Check if a crate stands on a switch. The test points lie a few pixels inside the tile below the crate.
	 *
	 * @returns {boolean} True if a switch tile is below a crate.
	 */
	#crateOnSwitch() {
		let i;
		for (i = 0; i < this.crates.length; i++) {
			if (this.map.atPixel(this.crates[i].x >> 8, (this.crates[i].y >> 8) + this.crates[i].pY + 3) == Tile.SWITCH) {
				return true;
			} else if (
				this.map.atPixel((this.crates[i].x >> 8) + TILE_SIZE - 1, (this.crates[i].y >> 8) + this.crates[i].pY + 3) ==
				Tile.SWITCH
			) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Check if the player touches the exit.
	 *
	 * @returns {boolean} True if the player is on the open exit.
	 */
	#atExit() {
		const p = this.player;
		if (!this.portals.isInPortal(p)) {
			const x = p.x >> 8;
			const y = p.y >> 8;
			// check each tile that the box of the player touches
			for (let ty = y >> TILE_SIZE_BITS; ty <= (y + p.pY - 1) >> TILE_SIZE_BITS; ty++) {
				for (let tx = x >> TILE_SIZE_BITS; tx <= (x + p.pX - 1) >> TILE_SIZE_BITS; tx++) {
					if (this.map.atPixel(tx << TILE_SIZE_BITS, ty << TILE_SIZE_BITS) == Tile.EXIT) return true;
				}
			}
		}

		return false;
	}

	/**
	 * Set the phase of a new level, a preview or the editor map: the start of the opening transition.
	 *
	 * @returns {void}
	 */
	resetPhase() {
		this.phase = LevelPhase.OPENING;
		this.fade = FADE_START;
	}

	/**
	 * Check if the level runs. The level time counts and the objects move.
	 *
	 * @returns {boolean} True while the level runs.
	 */
	isRunning() {
		return this.phase == LevelPhase.RUNNING;
	}

	/**
	 * Check if the level time stands still while an event waits for a click or the boss comes in.
	 *
	 * @returns {boolean} True while the level is halted.
	 */
	isHalted() {
		return this.phase == LevelPhase.HALTED;
	}

	/**
	 * Check if the opening transition of the level runs.
	 *
	 * @returns {boolean} True during the opening transition.
	 */
	isOpening() {
		return this.phase == LevelPhase.OPENING;
	}

	/**
	 * Check if the player is on the exit and an exit event waits for a click.
	 *
	 * @returns {boolean} True while the exit event waits.
	 */
	isExitWait() {
		return this.phase == LevelPhase.EXIT_WAIT;
	}

	/**
	 * Check if the closing transition of the level runs.
	 *
	 * @returns {boolean} True during the closing transition.
	 */
	isClosing() {
		return this.phase == LevelPhase.CLOSING;
	}

	/**
	 * Check if the closing transition started in the last tick.
	 *
	 * @returns {boolean} True in the tick in which the closing transition started.
	 */
	closingStarted() {
		return this.isClosing() && this.fade == FADE_START;
	}

	/**
	 * Check if the level is in the exit freeze after the closing transition.
	 *
	 * @returns {boolean} True in the exit freeze.
	 */
	isEnded() {
		return this.phase == LevelPhase.ENDED;
	}

	/**
	 * Check if the player reached the exit and the level end runs.
	 *
	 * @returns {boolean} True in the phases EXIT_WAIT, CLOSING and ENDED.
	 */
	reachedExit() {
		return this.isExitWait() || this.isClosing() || this.isEnded();
	}
}
