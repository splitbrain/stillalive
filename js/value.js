/**
 * A value with change notification.
 */

/**
 * A value that calls its subscribers on each change.
 */
export class Value {
	/**
	 * @param {*} initial The first value.
	 */
	constructor(initial) {
		/** @type {*} The current value. */
		this.value = initial;
		/** @type {Set<function(*): void>} The functions that get each new value. */
		this.subscribers = new Set();
	}

	/**
	 * Get the current value.
	 *
	 * @returns {*} The value.
	 */
	get() {
		return this.value;
	}

	/**
	 * Store a new value and call the subscribers. A value that is the same as the current value changes nothing.
	 *
	 * @param {*} value The new value.
	 * @returns {void}
	 */
	set(value) {
		if (Object.is(this.value, value)) return;
		this.value = value;
		for (const fn of this.subscribers) fn(value);
	}

	/**
	 * Call a function with the current value now and with each new value.
	 *
	 * @param {function(*): void} fn The function.
	 * @returns {function(): void} A function that removes the subscription.
	 */
	subscribe(fn) {
		this.subscribers.add(fn);
		fn(this.value);
		return () => this.subscribers.delete(fn);
	}
}
