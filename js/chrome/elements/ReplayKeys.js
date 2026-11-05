/**
 * The replay keys element.
 */

import { KEY_CLEAR, KEY_DOWN, KEY_JUMP, KEY_LEFT, KEY_RIGHT, MOUSE_LEFT, MOUSE_RIGHT } from '../../stage/constants.js';
import { keyLabels } from '../../stage/keys.js';
import { ChromeElement, loadMarkup } from '../element.js';

/** @type {HTMLTemplateElement|null} The markup of the replay keys. */
const TEMPLATE = await loadMarkup(import.meta.url);

/** @type {Object<string, number>} The key bit of each key cap of the replay keys, by the data-key name of the cap. */
const KEY_CAPS = {
	KeyW: KEY_JUMP,
	KeyA: KEY_LEFT,
	KeyS: KEY_DOWN,
	KeyD: KEY_RIGHT,
	KeyE: KEY_CLEAR,
	left: MOUSE_LEFT,
	right: MOUSE_RIGHT,
};

/**
 * The custom element <replay-keys>. It shows a key cap for each key and mouse button of the controls. The element marks
 * the caps that are pressed in the playback of a replay with the class pressed, and shows the key labels of the
 * keyboard of the player on the key caps.
 */
export class ReplayKeys extends ChromeElement {
	/** @type {HTMLTemplateElement|null} The markup of the replay keys. */
	static template = TEMPLATE;

	/**
	 * Subscribe to the keys of the replay and to the key labels.
	 *
	 * @returns {Array<function(): void>} The functions that remove the subscriptions.
	 */
	subscribe() {
		const caps = [...this.querySelectorAll('[data-key]')];
		return [
			this.stage.replayKeys.subscribe((keys) => {
				for (const cap of caps) cap.classList.toggle('pressed', (keys & KEY_CAPS[cap.dataset.key]) != 0);
			}),
			keyLabels.subscribe((labels) => {
				for (const cap of caps) if (cap.dataset.key in labels) cap.textContent = labels[cap.dataset.key];
			}),
		];
	}
}
