/**
 * The HUD element.
 */

import { ChromeElement, loadMarkup, Screen } from '../element.js';

/** @type {HTMLTemplateElement|null} The markup of the HUD. */
const TEMPLATE = await loadMarkup(import.meta.url);

/** @type {string[]} The names of the HUD values of the stage, which are also the data-value names of their nodes. */
const HUD_VALUES = ['life', 'cakes', 'steps', 'portals', 'fps'];

/**
 * The custom element <game-hud>. It shows the HUD values of the stage: life, cakes, steps, portals and the frame rate.
 * It shows on the play screen.
 */
export class GameHud extends ChromeElement {
	/** @type {HTMLTemplateElement|null} The markup of the HUD. */
	static template = TEMPLATE;

	/**
	 * Subscribe to the HUD values of the stage.
	 *
	 * @returns {Array<function(): void>} The functions that remove the subscriptions.
	 */
	subscribe() {
		return HUD_VALUES.map((name) => {
			const node = this.querySelector(`[data-value="${name}"]`);
			return this.stage[name].subscribe((value) => {
				node.textContent = String(value);
			});
		});
	}

	/**
	 * Tell if the HUD shows on a screen of the app.
	 *
	 * @param {string} screen The screen, a value of Screen.
	 * @returns {boolean} True on the play screen only.
	 */
	shouldShow(screen) {
		return screen === Screen.PLAY;
	}
}
