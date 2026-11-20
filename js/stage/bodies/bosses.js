/**
 * The bosses of the four boss levels.
 */

import { MAP_WIDTH, TILE_SIZE } from '../constants.js';
import { Boss } from './Boss.js';
import { Crate } from './Crate.js';
import { toSubpixels } from '../utils.js';

/**
 * Boss 1 throws crates.
 */
export class CrateBoss extends Boss {
	/**
	 * @param {import('../world/World.js').World} world The World of the body.
	 */
	constructor(world) {
		super(world, 1);
		this.makesCrates = true;
		this.throwsCrates = true;
	}

	/**
	 * Throw a crate at the player. Each hit makes the throws faster.
	 *
	 * @returns {void}
	 */
	attack() {
		if (this.world.time % (90 - 30 * this.hits) === 0) this.throwCrate(6, 18);
	}
}

/**
 * Boss 2 shoots razor wheels. It makes no crates, so a crate that hits it drops from the top again.
 */
export class WheelBoss extends Boss {
	/**
	 * @param {import('../world/World.js').World} world The World of the body.
	 */
	constructor(world) {
		super(world, 2);
		this.shootsWheels = true;
	}

	/**
	 * Shoot a razor wheel at the player. Each hit makes the shots faster, and after the second hit a second wheel comes
	 * from the left.
	 *
	 * @returns {void}
	 */
	attack() {
		const hits = this.hits;
		if (this.world.time % (90 - 15 * hits) !== 0) return;
		this.shootWheel(435, 50, 1200, 1200 - this.world.player.vx);
		if (hits === 2) this.shootWheel(TILE_SIZE, 3 * TILE_SIZE, 1200);
	}
}

/**
 * Boss 3 shoots plasma balls that follow the player, and drops a crate when no crate is left.
 */
export class PlasmaBoss extends Boss {
	/**
	 * @param {import('../world/World.js').World} world The World of the body.
	 */
	constructor(world) {
		super(world, 3);
		this.makesCrates = true;
		this.shootsPlasma = true;
	}

	/**
	 * Shoot a plasma ball at the player, up to one ball more than the hits. Throw a new crate when no crate is left.
	 * Each hit makes the attacks faster.
	 *
	 * @returns {void}
	 */
	attack() {
		const hits = this.hits;
		if (this.world.time % (90 - 30 * hits) !== 0) return;
		if (this.world.plasmaBalls.length < hits + 1) this.shootPlasma(800);
		if (this.world.crates.length === 0) {
			const crate = new Crate(this.world, toSubpixels((MAP_WIDTH - 1) * TILE_SIZE), toSubpixels(18 * TILE_SIZE));
			crate.vx = -toSubpixels(12);
			crate.vy = -toSubpixels(2);
			this.world.addCrate(crate);
		}
	}
}

/**
 * Boss 4 uses all attacks: it throws crates, and after the hits it adds razor wheels and plasma balls.
 */
export class FinalBoss extends Boss {
	/**
	 * @param {import('../world/World.js').World} world The World of the body.
	 */
	constructor(world) {
		super(world, 4);
		this.makesCrates = true;
		this.throwsCrates = true;
		this.shootsWheels = true;
		this.shootsPlasma = true;
	}

	/**
	 * Throw crates at the player. After the first hit, shoot razor wheels. After the second hit, shoot a plasma ball
	 * when no ball is in the level. Each hit makes the attacks faster.
	 *
	 * @returns {void}
	 */
	attack() {
		const time = this.world.time;
		const hits = this.hits;
		if (time % (90 - 20 * hits) === 0) this.throwCrate(5, 20);
		if (hits > 0 && time % (180 - 20 * hits) === 0) this.shootWheel(27 * TILE_SIZE, 2 * TILE_SIZE, 600);
		if (hits > 1 && this.world.plasmaBalls.length === 0) this.shootPlasma(400);
	}
}

/** @type {Array<new (world: import('../world/World.js').World) => Boss>} The boss classes, by the boss number minus 1. */
const BOSSES = [CrateBoss, WheelBoss, PlasmaBoss, FinalBoss];

/**
 * Create the boss of a boss level.
 *
 * @param {import('../world/World.js').World} world The World of the boss.
 * @param {number} number The number of the boss, from 1 to 4.
 * @returns {Boss} The boss.
 */
export function createBoss(world, number) {
	return new BOSSES[number - 1](world);
}
