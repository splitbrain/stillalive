/**
 * The AnimatedTile object and its helper functions.
 */

export class AnimatedTile {
	/**
	 * @param {number} x The column of the tile in the map.
	 * @param {number} y The row of the tile in the map.
	 * @param {number} min The first frame, as a tile id.
	 * @param {number} max The last frame, as a tile id.
	 * @param {number} type RANDOM for random frames or ORDERED for frames in sequence.
	 * @param {number} place The index of the tile in the map.
	 * @param {number} speed The number of ticks between two frames.
	 */
	constructor(x, y, min, max, type, place, speed) {
		/** @type {number} The column of the tile in the map. */
		this.x = x;
		/** @type {number} The row of the tile in the map. */
		this.y = y;
		/** @type {number} 1 while the tile is drawn and solid; an open door is 0. */
		this.used = 1;
		/** @type {number} The current frame, as a tile id. */
		this.current = min;
		/** @type {number} The first frame, as a tile id. */
		this.min = min;
		/** @type {number} The last frame, as a tile id. */
		this.max = max;
		/** @type {number} RANDOM for random frames or ORDERED for frames in sequence. */
		this.type = type;
		/** @type {number} The index of the tile in the map. */
		this.place = place;
		/** @type {number} The number of ticks between two frames. */
		this.speed = speed;
	}
}
