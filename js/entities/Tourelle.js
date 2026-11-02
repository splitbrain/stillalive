/**
 * The Tourelle object and its helper functions.
 */

import { playSound, playSoundIfFinished, sfx_explode, sfx_shoot } from '../audio.js';
import { caisseToucheObjet, collideAnyCaisse } from './Caisse.js';
import { inForceFieldTp } from './ForceField.js';
import { plasmaToucheObjet } from './Plasma.js';
import { onPlateforme } from './Platform.js';
import { Sparkle, createCakeOrSmokeSparkles } from './Sparkle.js';
import {
	getTile,
	leftCollision,
	moveObject,
	placeObject,
	rightCollision,
	toucheTileMort,
	touchingGround,
} from '../physics.js';
import { game } from '../state.js';
import { Tile, isPlatformCode } from '../tiles.js';
import { random } from '../utils.js';

/**
 * A turret. It shoots at the player in its line of sight, and the player can carry and throw it.
 */
export class Tourelle {
	/**
	 * @param {number} x The x position in 1/256 pixels.
	 * @param {number} y The y position in 1/256 pixels.
	 * @param {number} dir The direction that the turret faces, -1 left or 1 right.
	 */
	constructor(x, y, dir) {
		/** @type {number} The x position in 1/256 pixels. */
		this.x = x;
		/** @type {number} The y position in 1/256 pixels. */
		this.y = y;
		/** @type {number} The horizontal speed in 1/256 pixels per tick. */
		this.vx = 0;
		/** @type {number} The vertical speed in 1/256 pixels per tick. */
		this.vy = 0;
		/** @type {number} The rotation in degrees while the turret flies. */
		this.angle = 0;
		/** @type {number} The direction that the turret faces, -1 left or 1 right. */
		this.dir = dir;
		/** @type {number} Ticks until the next shot. */
		this.coolTime = 0;
		/** @type {number} The number of ticks between two shots. */
		this.startCool = 3;
		/** @type {number} Ticks until the turret shoots after it saw the player, from 10 down to 0. */
		this.rotation = 10;
		/** @type {number} 1 when the turret is destroyed. */
		this.mort = 0;
		/** @type {number} 1 while the turret exists. */
		this.used = 1;
		/** @type {number} 1 while the player carries the turret. */
		this.porter = 0;
		/** @type {number} 1 while the turret sees the player. */
		this.inSight = 0;
		/** @type {number} The width in pixels. */
		this.pX = 16;
		/** @type {number} The height in pixels. */
		this.pY = 32;
		/** @type {number} The frame of the turret image; 1 is the shot flash. */
		this.animFrame = 0;
		/** @type {number} 1 after the turret passed a portal or a force field; a hard landing then destroys it. */
		this.canExplode = 0;
		/** @type {string} The entity type, used by the shared object functions. */
		this.type = 'tourelle';
		/** @type {number} The x position where the laser sight ends, in 1/256 pixels. */
		this.ex = 0;
	}

	/**
	 * Move the turret for one tick: the rotation in the air, the destruction and the shot at the player. A hard
	 * landing, a deadly tile, a moving crate, a plasma ball or a platform destroys the turret.
	 *
	 * @returns {void}
	 */
	move() {
		if (this.used) {
			if (!this.porter) {
				if (!touchingGround(this)) this.angle += (this.vx >> 8) << 1;
				else this.angle = 0;
				if (this.angle >= 360) this.angle -= 360;

				const oldVx = this.vx;
				const oldVy = this.vy;

				moveObject(this);

				if (!this.mort) {
					if (this.vx == 0 && Math.abs(oldVx) > 3 << 8 && this.canExplode && inForceFieldTp(this).length == 0)
						this.mort = 1;
					else if (this.vy == 0 && Math.abs(oldVy) > 4 << 8 && this.canExplode && inForceFieldTp(this).length == 0)
						this.mort = 1;
					else if (toucheTileMort(this) || caisseToucheObjet(this) || plasmaToucheObjet(this)) {
						this.mort = 1;
					}
					if (this.mort) {
						this.animeFrame = 2;
						playSound(sfx_explode);
						createCakeOrSmokeSparkles(this.x, this.y, 9, 4, 255);
					}
				} else if (this.animFrame < 10) {
					if (game.TIME % 4 == 0) this.animFrame++;
				}

				let plt = onPlateforme(this);
				if (plt) {
					plt -= 200;
					this.x += game.platforms[plt].vx;
				}

				const colLeft = leftCollision(this);
				const colRight = rightCollision(this);
				if (!this.mort && (isPlatformCode(colLeft) || isPlatformCode(colRight))) {
					this.mort = 1;
					this.animeFrame = 2;
					playSound(sfx_explode);
					createCakeOrSmokeSparkles(this.x, this.y, 9, 4, 255);
				}
			} else {
				placeObject(this);
			}
			if (!this.mort) this.shoot();
		}
	}

	/**
	 * Shoot at the player if the player is in the line of sight. The shot stops at walls and crates.
	 *
	 * @returns {void}
	 */
	shoot() {
		let j;
		let testShoot = false;
		if (this.dir == -1 && this.x > game.perso.x) testShoot = true;
		else if (this.dir == 1 && this.x < game.perso.x) testShoot = true;

		if (testShoot) {
			const y = (this.y >> 8) + 13;
			const y2 = (game.perso.y >> 8) + 16;

			if (Math.abs(y - y2) > 32) testShoot = false;
		}

		if (this.mort == 0 && testShoot && !game.perso.mort) {
			this.coolTime--;
			if (this.coolTime < 0) this.coolTime = 0;
			if (this.coolTime == 0) {
				if (this.dir == 1) j = (this.x >> 8) + 16;
				else j = this.x >> 8;
				const ySent = (this.y >> 8) + 12;
				let dansLeChamp = 0;
				let exitt = 0;
				const oldJ = j;
				while (j >= 0 && j < 512 && !dansLeChamp && !exitt) {
					const tile = getTile(j, ySent);
					if (tile != Tile.EMPTY) {
						exitt = 1;
						break;
					} else {
						if (collideAnyCaisse(j, ySent)) {
							exitt = 2;
							break;
						} else {
							const t = toucheJoueur(j, ySent);
							if (t) {
								dansLeChamp = t;
								break;
							}
						}
					}
					j += this.dir * 14;
					if (oldJ == j) exitt = 1;
				}
				if (exitt == 2) {
					this.rotation--;
					if (this.rotation < 0) this.rotation = 0;
					this.ex = j << 8;
				} else if (dansLeChamp) {
					this.ex = j << 8;
					this.rotation--;
					this.inSight = dansLeChamp;
					dansLeChamp--;
					if (this.rotation < 0) this.rotation = 0;
					if (!this.rotation) {
						this.animFrame = 1 - this.animFrame;
						game.perso.vie -= 640; // 2.5 life points
						game.perso.timeVie = 300;
						game.perso.vx += this.dir << 8;
						this.coolTime = this.startCool;
						playSoundIfFinished(sfx_shoot);

						for (let i = 0; i < 5; i++) {
							const s = new Sparkle();
							s.x = game.perso.x + (this.pX << 7) + random(-8 << 8, 8 << 8);
							s.y = game.perso.y + (this.pY << 6);
							s.used = 5;
							s.vx = parseInt(random(512, 1024) * this.dir);
							s.vy = random(-3 << 8, 0);
							s.fading = 50;
							s.color = 1;
							s.portalNum = -1;
							game.sparkles.push(s);
						}
					}
				} else {
					this.inSight = 0;
					if (++this.rotation > 10) this.rotation = 10;
				}
			} else this.animFrame = 0;
		} else {
			if (this.mort == 0) {
				this.animFrame = 0;
				this.rotation = 10;
			}
		}
	}
}

/**
 * Check if a point of the laser line is inside the player.
 *
 * @param {number} j The x coordinate in pixels.
 * @param {number} ySent The y coordinate in pixels.
 * @returns {number} 1 if the point is inside the player, else 0.
 */
function toucheJoueur(j, ySent) {
	const x = game.perso.x >> 8;
	const y = game.perso.y >> 8;
	if (j >= x && j < x + 15 && ySent >= y && ySent < y + 31) return 1;
	return 0;
}
