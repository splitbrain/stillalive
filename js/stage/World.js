/**
 * The World object.
 */

import { playSound, sfx_exit, sfx_field, sfx_grabCake, sfx_plasmaField, sfx_transition } from './audio.js';
import {
	Direction,
	Ground,
	KEY_DOWN,
	KEY_JUMP,
	KEY_LEFT,
	KEY_RIGHT,
	PLAYFIELD_HEIGHT,
	SparkleType,
	TILE_SIZE,
	TILE_SIZE_BITS,
	Transition,
} from './constants.js';
import { Boss } from './entities/Boss.js';
import { Camera } from './entities/Camera.js';
import { traceGravPipeField } from './entities/GravPipeField.js';
import { Plasma } from './entities/Plasma.js';
import { Player } from './entities/Player.js';
import { PortalPair } from './entities/PortalPair.js';
import { createCakeOrSmokeSparkles } from './entities/Sparkle.js';
import { LevelEvents } from './LevelEvents.js';
import { LevelPhase } from './LevelPhase.js';
import { createObjects } from './mapObjects.js';
import { SwitchDoors } from './SwitchDoors.js';
import { TileMap } from './TileMap.js';
import { FIRST_OF_KIND, Tile, TileKind, inForceFieldRange, isDeadlyTile, isTileKind } from './tiles.js';
import { inScreen, random, toSubpixels } from './utils.js';

/** @type {Object<string, typeof sfx_field>} The sound of the opening and the closing doors, by door kind. */
const DOOR_SOUNDS = { [TileKind.SWITCH_DOOR]: sfx_field, [TileKind.PLASMA_DOOR]: sfx_plasmaField };

/** @typedef {import('./entities/Crate.js').Crate} Crate */
/** @typedef {import('./entities/Platform.js').Platform} Platform */

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
	return tile === Tile.EXIT || isDeadlyTile(tile) || tile === Tile.PLAYER_START || inForceFieldRange(tile);
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
	/** @type {import('./entities/GravPipeField.js').GravPipeField[]} The fields of the gravitational pipes. */
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
	/** @type {LevelPhase} The phase of the level with the progress and the effect of its transitions. */
	phase = new LevelPhase();
	/** @type {SwitchDoors} The switches and the switch doors. */
	switches = new SwitchDoors(this);
	/**
	 * @type {import('./entities/Portal.js').Portal|null} The portal that an object is in during this tick, or null.
	 *     The drawing then draws the tiles around the portals over the objects.
	 */
	objectInPortal = null;
	/** @type {LevelEvents|null} The events of the level, or null outside a level. */
	events = null;
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
		world.phase.transition = transition;
		if (level.fromBelow) world.#jumpInFromBelow();
		world.boss = level.boss ? new Boss(world, level.boss) : null;
		world.#loadObjects({ levelStart: true, boss: level.boss });
		world.camera = new Camera(world, world.player.x, world.player.y);
		world.cakesLeft = world.cakes.length;
		if (world.cakesLeft === 0) world.openExit();
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
		world.#loadObjects();
		if (level.fromBelow) world.#jumpInFromBelow();
		world.boss = level.boss ? new Boss(world, level.boss) : null;
		world.cakesLeft = world.cakes.length;
		if (world.cakesLeft === 0) {
			const map = world.map;
			for (const [i, tile] of map.display.entries()) {
				if (tile === Tile.EXIT_CLOSED) map.setDisplay(i, Tile.EXIT);
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
		this.player.x = -toSubpixels(TILE_SIZE);
		this.phase.reset();
		this.#loadObjects({ editor: true });
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

		player.left = (input.keys & KEY_LEFT) !== 0;
		player.right = (input.keys & KEY_RIGHT) !== 0;
		player.down = (input.keys & KEY_DOWN) !== 0;

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
		const phase = this.phase;
		this.input = input;
		this.outcome = null;
		if (phase.isRunning()) {
			if (this.time === 0) input.unclick();
			this.time++;
		}
		this.objectInPortal = null;
		if (!this.player.dead && phase.isRunning()) {
			this.player.move();
			if (!this.objectInPortal) this.objectInPortal = this.portals.isInPortal(this.player);
		}

		this.switches.update();
		if (this.#atExit()) {
			this.#updateLevelEnd();
		} else if (phase.isOpening()) {
			phase.advanceOpening();
		} else if (phase.isHalted()) {
			phase.run();
		}

		if ((this.events.isWaiting() || this.boss?.entering) && phase.isRunning()) phase.halt();
		this.#updateObjects();
		// the caller starts the level again after this tick, so the boss and the events do not run in this tick
		if (this.outcome === 'died') return;
		this.boss?.update();
		if (!phase.reachedExit()) this.events.update();
	}

	/**
	 * Run the end of the level after the player reaches the exit. An exit event that waits for a click holds the
	 * closing transition until the click. The level stays in the exit freeze after the closing transition.
	 *
	 * @returns {void}
	 */
	#updateLevelEnd() {
		const phase = this.phase;
		this.boss = null;
		this.shakeX = 0;
		this.shakeY = 0;

		// the player starts on the open exit: the opening transition continues as the closing transition
		if (phase.isOpening()) phase.continueAsClosing();
		if (phase.isClosing() && phase.advanceClosing()) this.outcome = 'finished';
		if (phase.isRunning() || this.events.isWaiting()) {
			this.events.trigger('exit');
			this.events.update();
			if (this.events.isWaiting()) {
				phase.waitAtExit();
				return;
			}
			phase.startClosing(random(Transition.TOP_LEFT, Transition.SQUARE + 1));
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
		const running = this.phase.isRunning();

		for (const tile of this.animatedTiles) tile.animate();

		this.player.flip = this.input.mouseX > this.player.midX() ? 1 : -1;

		this.#rebuildGravPipeFields();

		if (running) {
			for (const cake of this.cakes) {
				if (cake.used) cake.move();
			}
			for (const turret of this.turrets) {
				turret.update();
				if (!this.objectInPortal) this.objectInPortal = this.portals.isInPortal(turret);
			}
		}

		for (const ball of this.plasmaBall) {
			if (!ball.used) continue;
			ball.animate();
			if (running) {
				ball.move();
				if (!this.objectInPortal) this.objectInPortal = this.portals.isInPortal(ball);
			}
		}
		if (running) this.plasmaBall = this.plasmaBall.filter((ball) => !ball.needKill);

		for (const sparkle of this.sparkles) sparkle.move();
		this.sparkles = this.sparkles.filter((sparkle) => sparkle.fading > 0);

		// an update can add crates, and the other crates must not see a removed crate, so the loop removes it at once
		for (let i = 0; i < this.crates.length; i++) {
			const crate = this.crates[i];
			// a shrinking crate moves at half of its speed
			if (crate.shrink > 0) {
				crate.x += crate.vx >> 1;
				crate.y += crate.vy >> 1;
			}
			if (running) {
				crate.update();
				if (crate.needKill) {
					if (crate.carried) this.player.carrying = null;
					this.crates.splice(i, 1);
					i--;
					continue;
				}
				if (!this.objectInPortal) this.objectInPortal = this.portals.isInPortal(crate);
			}
		}

		if (this.boss && running) {
			if (this.boss.shootsWheels()) this.#updateProjectiles();
			this.boss.updateRumble();
		}

		if (running) {
			for (const platform of this.platforms) platform.move();
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
		// a hit ends the loop, so the loop removes the stopped wheels at once
		for (let i = 0; i < this.projectiles.length; i++) {
			const wheel = this.projectiles[i];
			wheel.move();
			if (!wheel.needKill && wheel.overlaps(this.player)) {
				this.projectiles.splice(i, 1);
				this.player.takeFatalHit();
				return;
			}
			if (wheel.needKill && wheel.timer === 0) {
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
		if (this.gravPipes.length === 0) return;
		this.gravPipeFields = [];
		for (const pipe of this.gravPipes) {
			let vx = 0;
			let vy = 0;
			switch (pipe.dir) {
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
			traceGravPipeField(this, pipe.pixelX, pipe.pixelY, vx, vy);
		}
	}

	/**
	 * Collect the cakes that the player touches, and open the exit when the last cake is collected.
	 *
	 * @returns {void}
	 */
	collectCakes() {
		for (const cake of this.cakes) {
			if (!cake.used || !this.player.overlaps(cake)) continue;
			cake.used = false;
			this.cakesLeft--;
			createCakeOrSmokeSparkles(this, cake.x, cake.y, SparkleType.CAKE, 2, 180);
			playSound(sfx_grabCake);
			if (this.cakesLeft === 0) {
				this.openExit();
				playSound(sfx_exit);
			}
		}
	}

	/**
	 * Open the exit.
	 *
	 * @returns {void}
	 */
	openExit() {
		this.map.replaceAll(Tile.EXIT_CLOSED, Tile.EXIT);
	}

	/**
	 * Open or close the door tiles of a kind and play the sound of the doors.
	 *
	 * @param {string} kind The kind of the doors: TileKind.SWITCH_DOOR or TileKind.PLASMA_DOOR.
	 * @param {boolean} open True to open the doors, false to close them.
	 * @returns {void}
	 */
	setDoors(kind, open) {
		playSound(DOOR_SOUNDS[kind]);
		for (const door of this.animatedTiles) {
			if (!isTileKind(door.current, kind)) continue;
			door.used = !open;
			this.map.setTile(door.place, open ? Tile.EMPTY : door.min);
		}
	}

	/**
	 * Place the player below the bottom edge with a speed upward, so the player jumps into the level.
	 *
	 * @returns {void}
	 */
	#jumpInFromBelow() {
		this.player.vy = -2400;
		this.player.x = toSubpixels(8 * TILE_SIZE);
		this.player.y = toSubpixels(PLAYFIELD_HEIGHT);
	}

	/**
	 * Create the objects of the map at their start positions and put them into the World. The method sets the position
	 * of the player and of the tube when the map has their tiles. Each plasma launch of a level start starts a plasma
	 * ball in a level without a boss. In the levels of boss 3 and boss 4, the plasma launch is the start point of the
	 * plasma shots of the boss.
	 *
	 * @param {object} [options] The options.
	 * @param {boolean} [options.levelStart] True for a level start, see createObjects().
	 * @param {boolean} [options.editor] True for the editor map, see createObjects().
	 * @param {number} [options.boss] The boss of the level, or 0 for a level without a boss.
	 * @returns {void}
	 */
	#loadObjects({ levelStart = false, editor = false, boss = 0 } = {}) {
		const objects = createObjects(this, { levelStart, editor });
		this.cakes = objects.cakes;
		this.turrets = objects.turrets;
		this.crates = objects.crates;
		this.gravPipes = objects.gravPipes;
		this.gravPipeFields = [];
		this.platforms = objects.platforms;
		this.animatedTiles = objects.animatedTiles;
		if (objects.playerStart) {
			this.player.x = objects.playerStart.x;
			this.player.y = objects.playerStart.y;
		}
		if (objects.tube) {
			this.tubeX = objects.tube.x;
			this.tubeY = objects.tube.y;
		}

		for (const launch of objects.plasmaLaunches) {
			if (boss === 0) {
				this.plasmaBall.push(new Plasma(this, launch.x, launch.y, launch.vx, launch.vy));
			} else if (boss === 3 || boss === 4) {
				this.plasmaX = launch.x;
				this.plasmaY = launch.y;
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
		if (tile === Tile.EMPTY) {
			return (crates && this.crateAt(x, y)) || (platforms && this.platformAt(x, y)) || Tile.EMPTY;
		}
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
		return /** @type {number} */ (this.#solidAt(x, y, false, false));
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
		if (!inScreen(x, y)) return Tile.EMPTY;
		const map = this.map;
		const tile = map.tiles[map.index(x >> TILE_SIZE_BITS, y >> TILE_SIZE_BITS)];
		const passes =
			tile === Tile.EXIT ||
			tile === FIRST_OF_KIND[TileKind.WHEEL] ||
			isTileKind(tile, TileKind.ENERGYWALL) ||
			tile === Tile.CAKE ||
			tile === Tile.PLAYER_START;
		return passes || !tile ? this.platformAt(x, y) || Tile.EMPTY : tile;
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
		return (
			this.crates.find((crate) => {
				const left = crate.pixelX;
				const top = crate.pixelY;
				return (
					(any || (!crate.carried && !this.portals.isInPortal(crate))) &&
					x > left &&
					x < left + TILE_SIZE - 1 &&
					y > top &&
					y < top + TILE_SIZE - 1
				);
			}) ?? null
		);
	}

	/**
	 * Find a moving crate that overlaps an object.
	 *
	 * @param {import('./entities/Body.js').Body} obj The object.
	 * @returns {Crate|null} The crate, or null if no moving crate overlaps the object.
	 */
	movingCrateTouching(obj) {
		return (
			this.crates.find(
				(crate) =>
					!crate.carried &&
					(crate.vx !== 0 || crate.vy !== 0) &&
					!this.portals.isInPortal(crate) &&
					crate.overlaps(obj),
			) ?? null
		);
	}

	/**
	 * Find the platform at a point.
	 *
	 * @param {number} x The x coordinate in pixels.
	 * @param {number} y The y coordinate in pixels.
	 * @returns {Platform|null} The platform, or null.
	 */
	platformAt(x, y) {
		return (
			this.platforms.find((platform) => {
				const left = platform.pixelX;
				const top = platform.pixelY;
				return x > left && x < left + 3 * TILE_SIZE && y >= top && y < top + TILE_SIZE - 1;
			}) ?? null
		);
	}

	/**
	 * Check if a plasma ball overlaps an object.
	 *
	 * @param {import('./entities/Body.js').Body} obj The object.
	 * @returns {boolean} True if a ball overlaps the object.
	 */
	plasmaTouching(obj) {
		return this.plasmaBall.some((ball) => ball.used && ball.overlaps(obj));
	}

	/**
	 * Find the pipe fields that an object overlaps.
	 *
	 * @param {import('./entities/Body.js').Body} obj The object.
	 * @returns {import('./entities/GravPipeField.js').GravPipeField[]} The fields.
	 */
	gravPipeFieldsAt(obj) {
		return this.gravPipeFields.filter((field) => {
			let { x, y, width, height } = field;
			if (width < 0) {
				width = -width;
				x -= width;
			} else if (height < 0) {
				height = -height;
				y -= height;
			}
			return obj.overlapsBox(x, y, width, height);
		});
	}

	/**
	 * Get the conveyor belt that moves an object, directly or through the crate that the object stands on.
	 *
	 * @param {import('./entities/Body.js').Body} obj The object. It must also have the vertical speed vy.
	 * @returns {number} The direction of the belt: 1 to the right, -1 to the left, 0 for no belt.
	 */
	beltUnder(obj) {
		const ground = obj.touchingGround();
		if (ground === Ground.BELT_RIGHT) return 1;
		if (ground === Ground.BELT_LEFT) return -1;
		const y = obj.pixelY + obj.height;
		const crate = this.crateAt(obj.pixelX, y) || this.crateAt(obj.pixelX + obj.width - 1, y);
		return crate ? crate.belt : 0;
	}

	/**
	 * Get the platform that carries an object, directly or through the crate that the object stands on. The search
	 * looks below the left edge of the object first, then below the right edge.
	 *
	 * @param {import('./entities/Body.js').Body} obj The object.
	 * @returns {Platform|null} The platform, or null.
	 */
	onPlatform(obj) {
		const x = obj.pixelX;
		const y = obj.pixelY + obj.height;
		return (
			this.platformAt(x, y) ||
			this.platformAt(x + obj.width - 1, y) ||
			((this.crateAt(x, y) || this.crateAt(x + obj.width - 1, y))?.platform ?? null)
		);
	}

	/**
	 * Check if the player touches the exit.
	 *
	 * @returns {boolean} True if the player is on the open exit.
	 */
	#atExit() {
		const player = this.player;
		if (this.portals.isInPortal(player)) return false;
		const x = player.pixelX;
		const y = player.pixelY;
		// check each tile that the box of the player touches
		for (let row = y >> TILE_SIZE_BITS; row <= (y + player.height - 1) >> TILE_SIZE_BITS; row++) {
			for (let column = x >> TILE_SIZE_BITS; column <= (x + player.width - 1) >> TILE_SIZE_BITS; column++) {
				if (this.map.atPixel(column << TILE_SIZE_BITS, row << TILE_SIZE_BITS) === Tile.EXIT) return true;
			}
		}
		return false;
	}
}
