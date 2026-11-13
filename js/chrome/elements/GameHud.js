/**
 * The HUD element.
 */

import { isReplayRoute } from '../../router.js';
import { ChromeScreen, loadMarkup, Screen } from '../element.js';

/** @type {HTMLTemplateElement|null} The markup of the HUD. */
const TEMPLATE = await loadMarkup(import.meta.url);

/** @type {string[]} The names of the HUD values of the stage, which are also the data-value names of their nodes. */
const HUD_VALUES = ['life', 'cakes', 'steps', 'portals', 'fps'];

/**
 * Get the level of a life value, which sets the color of the life display.
 *
 * @param {number} life The life, from 0 to 100.
 * @returns {string} "high" above 50, "mid" above 25, else "low".
 */
function lifeLevel(life) {
	if (life > 50) return 'high';
	if (life > 25) return 'mid';
	return 'low';
}

/**
 * The custom element <game-hud>. It shows the HUD values of the stage on the displays of a control panel.
 */
export class GameHud extends ChromeScreen {
	/** @type {HTMLTemplateElement|null} The markup of the HUD. */
	static template = TEMPLATE;

	/**
	 * Subscribe to the HUD values of the stage, to show them and to color the life display by the level of the life.
	 *
	 * @returns {Array<function(): void>} The functions that remove the subscriptions.
	 */
	subscribe() {
		const life = this.querySelector('.life');
		return [
			...HUD_VALUES.map((name) => {
				const node = this.querySelector(`[data-value="${name}"]`);
				return this.stage[name].subscribe((value) => {
					node.textContent = String(value);
				});
			}),
			this.stage.life.subscribe((value) => {
				life.dataset.level = lifeLevel(value);
			}),
		];
	}

	/**
	 * Tell if the HUD shows on a screen of the app.
	 *
	 * @param {string} screen The screen, a value of Screen.
	 * @returns {boolean} True on the play screen, except on a replay route.
	 */
	shouldShow(screen) {
		return screen === Screen.PLAY && !isReplayRoute();
	}
}
