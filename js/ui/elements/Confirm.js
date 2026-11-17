/**
 * The confirmation element.
 */

import { Tile } from '../../stage/map/tiles.js';
import { route, RouteName } from '../../router.js';
import { Value } from '../../value.js';
import { loadMarkup, UiElement } from '../element.js';

/** @type {HTMLTemplateElement|null} The markup of the confirmation. */
const TEMPLATE = await loadMarkup(import.meta.url);

/** @type {Value<boolean>} True while the confirmation shows a question. */
export const confirmShown = new Value(false);

/**
 * Check if the controls of the editor are locked. They are locked on the save screen, on the load screen and while a
 * question shows.
 *
 * @returns {boolean} True while the controls are locked.
 */
export function isEditorLocked() {
	return [RouteName.SAVE, RouteName.LOAD].includes(route.get().name) || confirmShown.get();
}

/**
 * Ask the player a question with the confirmation element.
 *
 * @param {string} message The question.
 * @param {string} title The title of the screen.
 * @returns {Promise<boolean>} Resolves when the player answers: true for Yes, false for No.
 */
export function askConfirmation(message, title) {
	return /** @type {Confirm} */ (document.querySelector('ui-confirm')).ask(message, title);
}

/**
 * Ask the player to confirm that the editor map is replaced. An empty editor map is replaced without a question.
 *
 * @param {import('../../stage/GameStage.js').GameStage} stage The stage.
 * @returns {Promise<boolean>} True if the editor map is empty or the player confirms.
 */
export async function confirmReplaceMap(stage) {
	const empty = stage.getMap().tiles.every((tile) => tile === Tile.EMPTY);
	return empty || askConfirmation('The current map is not empty. Do you want to discard it?', 'Replace map');
}

/**
 * The custom element <ui-confirm>. It shows a title, a question and the Yes and No buttons on top of the stage. It
 * shows while a question is open, on the screen that asks the question.
 */
export class Confirm extends UiElement {
	/** @type {HTMLTemplateElement|null} The markup of the confirmation. */
	static template = TEMPLATE;

	/** @type {((answer: boolean) => void)|null} The function that answers the open question, or null for none. */
	#answer = null;

	/**
	 * Add the handlers of the buttons.
	 *
	 * @returns {void}
	 */
	setUp() {
		this.querySelector('.yes').addEventListener('click', () => this.#close(true));
		this.querySelector('.no').addEventListener('click', () => this.#close(false));
	}

	/**
	 * Subscribe to the route and listen to the keys, to answer the open question with No when the player leaves the
	 * screen or releases the Escape key.
	 *
	 * @returns {Array<() => void>} The functions that remove the subscriptions and the listener.
	 */
	subscribe() {
		const onKeyUp = (event) => {
			if (event.key === 'Escape') this.#close(false);
		};
		window.addEventListener('keyup', onKeyUp);
		return [route.subscribe(() => this.#close(false)), () => window.removeEventListener('keyup', onKeyUp)];
	}

	/**
	 * Tell if the element shows: it shows while a question is open.
	 *
	 * @returns {boolean} True while a question is open.
	 */
	shouldShow() {
		return confirmShown.get();
	}

	/**
	 * Show a question. An open question gets the answer No.
	 *
	 * @param {string} message The question.
	 * @param {string} title The title above the question.
	 * @returns {Promise<boolean>} Resolves when the player answers: true for Yes, false for No.
	 */
	ask(message, title) {
		this.#close(false);
		this.querySelector('h2').textContent = title;
		this.querySelector('p').textContent = message;
		confirmShown.set(true);
		return new Promise((resolve) => {
			this.#answer = resolve;
		});
	}

	/**
	 * Close the question and answer it.
	 *
	 * @param {boolean} answer True for Yes, false for No.
	 * @returns {void}
	 */
	#close(answer) {
		const resolve = this.#answer;
		this.#answer = null;
		confirmShown.set(false);
		resolve?.(answer);
	}
}
