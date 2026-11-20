/**
 * The Scene object.
 */

/**
 * An object that draws one kind of object of a state, for example of a World.
 *
 * @template T
 * @typedef {object} Painter
 * @property {(state: T) => void} draw Draw the objects of this kind in a state.
 */

/**
 * An ordered list of painters that draws a state from back to front.
 *
 * @template T The type of the state: a World, or the state of the editor.
 */
export class Scene {
	/** @type {Painter<T>[]} The painters in the draw order. */
	#painters;

	/**
	 * Create a scene.
	 *
	 * @param {Painter<T>[]} painters The painters in the draw order, from back to front.
	 */
	constructor(painters) {
		this.#painters = painters;
	}

	/**
	 * Draw a state with each painter in the draw order.
	 *
	 * @param {T} state The state.
	 * @returns {void}
	 */
	draw(state) {
		for (const painter of this.#painters) painter.draw(state);
	}
}
