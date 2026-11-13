/**
 * The labels of the control keys on the keyboard of the player.
 */

import { Value } from '../value.js';

/**
 * The label of each control key, by key code, as an object. The defaults are the labels of a QWERTY keyboard.
 *
 * @type {Value}
 */
export const keyLabels = new Value({
	KeyW: 'W',
	KeyA: 'A',
	KeyS: 'S',
	KeyD: 'D',
	KeyE: 'E',
});

/**
 * Replace the default labels with the labels of the keyboard layout of the player. Browsers without the Keyboard
 * Map API keep the defaults.
 *
 * @returns {Promise<void>}
 */
export async function loadKeyLabels() {
	if (!navigator.keyboard || !navigator.keyboard.getLayoutMap) return;
	try {
		const layout = await navigator.keyboard.getLayoutMap();
		const labels = { ...keyLabels.get() };
		for (const code of Object.keys(labels)) {
			const label = layout.get(code);
			if (label) labels[code] = label.toUpperCase();
		}
		keyLabels.set(labels);
	} catch (error) {
		console.error(error);
	}
}
