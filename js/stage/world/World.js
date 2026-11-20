/**
 * The World object.
 */

import { playSound, sfx_exit, sfx_field, sfx_plasmaField, sfx_transition } from '../browser/audio.js';
import { DIRECTIONS, Ground, TILE_SIZE, TILE_SIZE_BITS, Transition } from '../constants.js';
import { createBoss } from '../bodies/bosses.js';
import { InputState } from '../browser/InputState.js';
import { Effects } from '../effects/Effects.js';
import { traceGravPipeField } from '../bodies/GravPipe.js';
import { Plasma } from '../bodies/Plasma.js';
import { Player } from '../bodies/Player.js';
import { PortalPair } from '../portals/PortalPair.js';
import { LevelEvents } from './LevelEvents.js';
import { LevelPhase } from './LevelPhase.js';
import { createBodies } from './mapBodies.js';
import { SwitchDoors } from './SwitchDoors.js';
import { TileMap } from './TileMap.js';
import { FIRST_OF_KIND, Tile, TileKind, inForceFieldRange, isDeadlyTile, isTileKind } from '../map/tiles.js';
import { inScreen, random } from '../utils.js';

/** @type {Object<string, typeof sfx_field>} The sound of the opening and the closing doors, by door kind. */
const DOOR_SOUNDS = { [TileKind.SWITCH_DOOR]: sfx_field, [TileKind.PLASMA_DOOR]: sfx_plasmaField };

/** @typedef {import('../bodies/Boss.js').Boss} Boss */
/** @typedef {import('../bodies/Crate.js').Crate} Crate */
/** @typedef {import('../bodies/Platform.js').Platform} Platform */

/**
 * A solid thing at a point: a tile id, a crate or a platform. The tile id Tile.EMPTY means that nothing solid is there.
 *
 * @typedef {number|Crate|Platform} Solid
 */

/**
 * Check if bodies pass through a tile. The exit, the deadly tiles, the player start and the force fields are not
 * solid.
 *
 * @param {number} tile The tile id.
 * @returns {boolean} True if bodies pass the tile.
 */
function isPassable(tile) {
	return tile === Tile.EXIT || isDeadlyTile(tile) || tile === Tile.PLAYER_START || inForceFieldRange(tile);
}

/**
 * The state of one started level. Each level start creates a new World. A preview shows the World of a level start
 * and never ticks it.
 */
export class World {
	/** @type {TileMap} The tiles of the map. */
	map;
	/** @type {import('./level.js').Level|null} The level that runs, or null before the level start. */
	level = null;
	/** @type {boolean} True if a replay plays the level. */
	#replaying = false;
	/** @type {import('../bodies/Cake.js').Cake[]} The cakes. */
	cakes = [];
	/** @type {import('../bodies/Crate.js').Crate[]} The crates. */
	crates = [];
	/** @type {import('../bodies/Turret.js').Turret[]} The turrets. */
	turrets = [];
	/** @type {import('../bodies/Plasma.js').Plasma[]} The plasma balls. */
	plasmaBalls = [];
	/** @type {import('../bodies/Platform.js').Platform[]} The moving platforms. */
	platforms = [];
	/** @type {import('../bodies/GravPipe.js').GravPipe[]} The gravitational pipes. */
	gravPipes = [];
	/** @type {import('../bodies/GravPipe.js').GravPipeField[]} The fields of the gravitational pipes. */
	gravPipeFields = [];
	/** @type {import('./AnimatedTile.js').AnimatedTile[]} The animated tiles. */
	animatedTiles = [];
	/** @type {import('../bodies/RazorWheel.js').RazorWheel[]} The razor wheels of the boss. */
	razorWheels = [];
	/** @type {Player} The player. */
	player;
	/** @type {PortalPair} The two portals. */
	portals = new PortalPair(this);
	/** @type {Effects} The visual effects: the sparkles, the security camera and the screen shake. */
	effects = new Effects(this);
	/** @type {Boss|null} The boss of the level, or null for a level without a boss. */
	boss = null;
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
	/** @type {import('../map/mapFile.js').MapLabel[]} The texts at positions of the playfield. */
	labels = [];
	/** @type {number} The index of the background image. */
	background = 0;
	/** @type {LevelPhase} The phase of the level with the progress and the effect of its transitions. */
	phase = new LevelPhase();
	/** @type {SwitchDoors} The switches and the switch doors. */
	switches = new SwitchDoors(this);
	/**
	 * @type {LevelEvents} The events of the level. Before the level start, the list has no events. The level start
	 *     replaces it with the events of the level.
	 */
	events = new LevelEvents(this, [], false);
	/**
	 * @type {string|null} The result of the last tick: "finished" when the closing transition ended, "died" when the
	 *     death fade ended, "brokenReplay" when the player died in a replay or when the replay has fewer inputs than
	 *     the level needs, else null.
	 */
	outcome = null;
	/**
	 * @type {InputState} The keys and the mouse of the tick. Before the first tick, it is an input without keys and
	 *     clicks, with the mouse at the top left corner.
	 */
	input = new InputState();

	/**
	 * Create a World without bodies at the start of the opening transition.
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
	 * Create the World of a level start. The body tiles leave the map, the exits close, and the animated tiles and
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
		world.boss = level.boss ? createBoss(world, level.boss) : null;
		world.#loadBodies({ levelStart: true });
		world.effects.startCamera(world.player.x, world.player.y);
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
	 * Give the input of a tick to the bodies before the tick runs.
	 *
	 * @param {import('../browser/InputState.js').InputState} input The keys of the tick and of the previous tick.
	 * @returns {void}
	 */
	applyInput(input) {
		/** @type {import('../bodies/Body.js').Body[]} */
		const bodies = [
			this.player,
			...this.cakes,
			...this.turrets,
			...this.plasmaBalls,
			...this.crates,
			...this.platforms,
			...this.gravPipes,
			...this.razorWheels,
		];
		if (this.boss) bodies.push(this.boss);
		for (const body of bodies) body.readInput(input);
	}

	/**
	 * Run one tick of a body: the body moves while the level time runs, else it idles.
	 *
	 * @param {import('../bodies/Body.js').Body} body The body.
	 * @param {boolean} running True while the level time runs.
	 * @returns {void}
	 */
	#update(body, running) {
		if (running) body.move();
		else body.idle();
	}

	/**
	 * Run one tick of each body of a list. A body that went away leaves the list at once, so the bodies after it do
	 * not see it. A body can add bodies to the list during its tick.
	 *
	 * @param {import('../bodies/Body.js').Body[]} bodies The list of the bodies.
	 * @param {boolean} running True while the level time runs.
	 * @returns {void}
	 */
	#updateAll(bodies, running) {
		for (let i = 0; i < bodies.length; i++) {
			const body = bodies[i];
			this.#update(body, running);
			if (body.gone) {
				bodies.splice(i, 1);
				i--;
			}
		}
	}

	/**
	 * Run one tick of the level. The level time stands still while an event waits and while the boss comes in. The
	 * outcome tells the caller what happened in the tick.
	 *
	 * @param {import('../browser/InputState.js').InputState} input The keys and the mouse of the tick.
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
		this.#update(this.player, phase.isRunning());

		this.switches.update();
		if (this.#atExit()) {
			this.#updateLevelEnd();
		} else if (phase.isOpening()) {
			phase.advanceOpening();
		} else if (phase.isHalted()) {
			phase.run();
		}

		if ((this.events.isWaiting() || this.boss?.entering) && phase.isRunning()) phase.halt();
		this.#updateContents();
		// the caller starts the level again after this tick, so the boss and the events do not run in this tick
		if (this.outcome === 'died') return;
		if (this.boss) this.#update(this.boss, phase.isRunning());
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
		this.effects.stopShake();

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
	 * Update the contents of the World for one tick: the animated tiles, the fields of the gravitational pipes, the
	 * bodies, the portals and the effects. The World removes the bodies that went away.
	 *
	 * @returns {void}
	 */
	#updateContents() {
		const running = this.phase.isRunning();

		for (const tile of this.animatedTiles) tile.animate();

		this.#rebuildGravPipeFields();

		this.#updateAll(this.cakes, running);
		this.#updateAll(this.turrets, running);
		this.#updateAll(this.plasmaBalls, running);

		this.effects.updateSparkles();

		this.#updateAll(this.crates, running);
		this.#updateAll(this.razorWheels, running);
		this.#updateAll(this.platforms, running);
		this.portals.update();
		this.effects.moveCamera();
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
			const { dx, dy } = DIRECTIONS[pipe.direction];
			this.gravPipeFields.push(...traceGravPipeField(this, pipe.pixelX, pipe.pixelY, dx, dy));
		}
	}

	/**
	 * Count a cake that the player ate, and open the exit after the last cake.
	 *
	 * @returns {void}
	 */
	cakeEaten() {
		this.cakesLeft--;
		if (this.cakesLeft === 0) {
			this.openExit();
			playSound(sfx_exit);
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
			if (!isTileKind(door.frame, kind)) continue;
			door.used = !open;
			this.map.setTile(door.place, open ? Tile.EMPTY : door.min);
		}
	}

	/**
	 * Add a crate.
	 *
	 * @param {Crate} crate The crate.
	 * @returns {void}
	 */
	addCrate(crate) {
		this.crates.push(crate);
	}

	/**
	 * Remove a crate. A crate that is not in the list changes nothing.
	 *
	 * @param {Crate} crate The crate.
	 * @returns {void}
	 */
	removeCrate(crate) {
		const index = this.crates.indexOf(crate);
		if (index >= 0) this.crates.splice(index, 1);
	}

	/**
	 * Add a razor wheel of the boss.
	 *
	 * @param {import('../bodies/RazorWheel.js').RazorWheel} razorWheel The razor wheel.
	 * @returns {void}
	 */
	addRazorWheel(razorWheel) {
		this.razorWheels.push(razorWheel);
	}

	/**
	 * Add a plasma ball.
	 *
	 * @param {Plasma} plasmaBall The plasma ball.
	 * @returns {void}
	 */
	addPlasma(plasmaBall) {
		this.plasmaBalls.push(plasmaBall);
	}

	/**
	 * Remove the razor wheels and the plasma balls of the boss.
	 *
	 * @returns {void}
	 */
	clearBossAttacks() {
		this.razorWheels = [];
		this.plasmaBalls = [];
	}

	/**
	 * Create the bodies of the map at their start positions and put them into the World. The method sets the position
	 * of the player and of the tube when the map has their tiles. At a level start, a player launch tile also launches
	 * the player. Each plasma launch starts a plasma ball when the World has no boss. For a boss that shoots plasma
	 * balls, the plasma launch is the start point of its shots. Only a level start has plasma launches, so forLevel()
	 * creates the boss first.
	 *
	 * @param {object} [options] The options.
	 * @param {boolean} [options.levelStart] True for a level start, see createBodies().
	 * @returns {void}
	 */
	#loadBodies({ levelStart = false } = {}) {
		const bodies = createBodies(this, { levelStart });
		this.cakes = bodies.cakes;
		this.turrets = bodies.turrets;
		this.crates = bodies.crates;
		this.gravPipes = bodies.gravPipes;
		this.gravPipeFields = [];
		this.platforms = bodies.platforms;
		this.animatedTiles = bodies.animatedTiles;
		if (bodies.playerStart) {
			this.player.putAt(bodies.playerStart.x, bodies.playerStart.y);
			if (levelStart && bodies.playerStart.launch !== null) this.player.launch(bodies.playerStart.launch);
		}
		if (bodies.tube) {
			this.tubeX = bodies.tube.x;
			this.tubeY = bodies.tube.y;
		}

		for (const launch of bodies.plasmaLaunches) {
			if (!this.boss) {
				this.plasmaBalls.push(new Plasma(this, launch.x, launch.y, launch.vx, launch.vy));
			} else if (this.boss.shootsPlasma) {
				this.plasmaX = launch.x;
				this.plasmaY = launch.y;
			}
		}
	}

	/**
	 * Get the solid tile at a point, or the body at the point where the map is empty.
	 *
	 * @param {number} x The x coordinate in pixels.
	 * @param {number} y The y coordinate in pixels.
	 * @param {boolean} crates True if the crates count.
	 * @param {boolean} platforms True if the platforms count.
	 * @returns {Solid} The tile id or the body, or Tile.EMPTY if nothing solid is there or the point is outside the
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
	getTileWithoutBodies(x, y) {
		return /** @type {number} */ (this.#solidAt(x, y, false, false));
	}

	/**
	 * Get the tile or platform at a point for a portal shot. The shot passes through the exit, the first razor wheel
	 * frame, the red energy walls, the cakes and the player start.
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
			tile === FIRST_OF_KIND[TileKind.RAZOR_WHEEL] ||
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
	 * Find a moving crate that overlaps a body.
	 *
	 * @param {import('../bodies/Body.js').Body} body The body.
	 * @returns {Crate|null} The crate, or null if no moving crate overlaps the body.
	 */
	movingCrateTouching(body) {
		return (
			this.crates.find(
				(crate) =>
					!crate.carried &&
					(crate.vx !== 0 || crate.vy !== 0) &&
					!this.portals.isInPortal(crate) &&
					crate.overlaps(body),
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
	 * Check if a plasma ball overlaps a body.
	 *
	 * @param {import('../bodies/Body.js').Body} body The body.
	 * @returns {boolean} True if a ball overlaps the body.
	 */
	plasmaTouching(body) {
		return this.plasmaBalls.some((plasmaBall) => plasmaBall.used && plasmaBall.overlaps(body));
	}

	/**
	 * Find the pipe fields that a body overlaps.
	 *
	 * @param {import('../bodies/Body.js').Body} body The body.
	 * @returns {import('../bodies/GravPipe.js').GravPipeField[]} The fields.
	 */
	gravPipeFieldsAt(body) {
		return this.gravPipeFields.filter((field) => {
			let { x, y, width, height } = field;
			if (width < 0) {
				width = -width;
				x -= width;
			} else if (height < 0) {
				height = -height;
				y -= height;
			}
			return body.overlapsBox(x, y, width, height);
		});
	}

	/**
	 * Get the conveyor belt that moves a body, directly or through the crate that the body stands on.
	 *
	 * @param {import('../bodies/MovingBody.js').MovingBody} body The body.
	 * @returns {number} The direction of the belt: 1 to the right, -1 to the left, 0 for no belt.
	 */
	beltUnder(body) {
		const ground = body.touchingGround();
		if (ground === Ground.BELT_RIGHT) return 1;
		if (ground === Ground.BELT_LEFT) return -1;
		const y = body.pixelY + body.height;
		const crate = this.crateAt(body.pixelX, y) || this.crateAt(body.pixelX + body.width - 1, y);
		return crate ? crate.belt : 0;
	}

	/**
	 * Get the platform that carries a body, directly or through the crate that the body stands on. The search
	 * looks below the left edge of the body first, then below the right edge.
	 *
	 * @param {import('../bodies/Body.js').Body} body The body.
	 * @returns {Platform|null} The platform, or null.
	 */
	onPlatform(body) {
		const x = body.pixelX;
		const y = body.pixelY + body.height;
		return (
			this.platformAt(x, y) ||
			this.platformAt(x + body.width - 1, y) ||
			((this.crateAt(x, y) || this.crateAt(x + body.width - 1, y))?.platform ?? null)
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
