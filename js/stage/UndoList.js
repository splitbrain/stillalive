/**
 * The undo list of the editor.
 */

/** @type {number} The largest number of maps in the undo list. */
const UNDO_SIZE = 11;

/**
 * @typedef {object} UndoEntry
 * @property {number[]} tiles The logic tiles of the map.
 * @property {object} properties The properties of the map other than the format, the tiles and the background.
 */

/**
 * The maps of the editor after each change, for undo and redo. The list holds up to eleven maps and drops the
 * oldest map.
 */
export class UndoList {
	/** @type {UndoEntry[]} The maps, from the oldest to the newest. */
	#entries = [];

	/** @type {number} The index of the current map in the list, or -1 for an empty list. */
	#index = -1;

	/**
	 * Add a map after the current map. The maps after the current map go away.
	 *
	 * @param {UndoEntry} entry The map.
	 * @returns {void}
	 */
	add(entry) {
		if (this.#index == UNDO_SIZE - 1) {
			this.#entries.shift();
			this.#index--;
		}
		this.#index++;
		this.#entries[this.#index] = entry;
		this.#entries.length = this.#index + 1;
	}

	/**
	 * Go back to the map before the current map.
	 *
	 * @returns {UndoEntry|null} The map before the current map, or null if the current map is the oldest.
	 */
	undo() {
		if (this.#index <= 0) return null;
		this.#index--;
		return this.#entries[this.#index];
	}

	/**
	 * Go forward to the map after the current map.
	 *
	 * @returns {UndoEntry|null} The map after the current map, or null if the current map is the newest.
	 */
	redo() {
		if (this.#index + 1 >= this.#entries.length) return null;
		this.#index++;
		return this.#entries[this.#index];
	}
}
