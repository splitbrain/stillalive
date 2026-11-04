/**
 * The labels of the control keys on the keyboard of the player.
 */

/**
 * The label of each control key, by key code. The defaults are the labels of a QWERTY keyboard.
 *
 * @type {Object<string, string>}
 */
export const keyLabels = {
	KeyW: 'W',
	KeyA: 'A',
	KeyS: 'S',
	KeyD: 'D',
	KeyE: 'E',
};

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
		for (const code of Object.keys(keyLabels)) {
			const label = layout.get(code);
			if (label) keyLabels[code] = label.toUpperCase();
		}
	} catch (error) {
		console.error(error);
	}
}
