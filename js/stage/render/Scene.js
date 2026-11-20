/**
 * The Scene object.
 */

/**
 * An object that draws one kind of object of a World.
 *
 * @typedef {object} Painter
 * @property {(world: import('../world/World.js').World) => void} draw Draw the objects of this kind in a World.
 */

/**
 * An ordered list of painters that draws a World from back to front.
 */
export class Scene {
	/** @type {Painter[]} The painters in the draw order. */
	#painters;

	/**
	 * Create a scene.
	 *
	 * @param {Painter[]} painters The painters in the draw order, from back to front.
	 */
	constructor(painters) {
		this.#painters = painters;
	}

	/**
	 * Draw a World with each painter in the draw order.
	 *
	 * @param {import('../world/World.js').World} world The World.
	 * @returns {void}
	 */
	draw(world) {
		for (const painter of this.#painters) painter.draw(world);
	}
}
