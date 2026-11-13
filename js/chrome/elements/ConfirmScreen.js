/**
 * The confirmation screen element.
 */

import { route } from '../../router.js';
import { Value } from '../../value.js';
import { ChromeElement, loadMarkup } from '../element.js';

/** @type {HTMLTemplateElement|null} The markup of the confirmation screen. */
const TEMPLATE = await loadMarkup(import.meta.url);

/** @type {Value<boolean>} True while the confirmation screen shows a question. */
export const confirmShown = new Value(false);

/**
 * Check if the controls of the editor are locked. They are locked while the save and load screen or a question shows.
 *
 * @returns {boolean} True while the controls are locked.
 */
export function isEditorLocked() {
	return route.get().name == 'editor-file' || confirmShown.get();
}

/**
 * Ask the player a question on the confirmation screen.
 *
 * @param {string} message The question.
 * @param {string} title The title of the screen.
 * @returns {Promise<boolean>} Resolves when the player answers: true for Yes, false for No.
 */
export function confirmOnScreen(message, title) {
	return document.querySelector('confirm-screen').ask(message, title);
}

/**
 * Ask the player to confirm that the editor map is replaced. An empty editor map is replaced without a question.
 *
 * @param {import('../../stage/GameStage.js').GameStage} stage The stage.
 * @returns {Promise<boolean>} True if the editor map is empty or the player confirms.
 */
export async function confirmReplaceMap(stage) {
	if (stage.getMap().tiles.every((tile) => tile == 0)) return true;
	return confirmOnScreen('The current map is not empty. Do you want to discard it?', 'Replace map');
}

/**
 * The custom element <confirm-screen>. It shows a title, a question and the Yes and No buttons on top of the stage.
 * It shows on the screen that asks the question, so it is a chrome element and not a screen part.
 */
export class ConfirmScreen extends ChromeElement {
	/** @type {HTMLTemplateElement|null} The markup of the confirmation screen. */
	static template = TEMPLATE;

	/** @type {function(boolean): void|null} The function that answers the open question, or null for none. */
	#answer = null;

	/**
	 * Hide the element and add the handlers of the buttons.
	 *
	 * @returns {void}
	 */
	setUp() {
		this.hidden = true;
		this.querySelector('.yes').addEventListener('click', () => this.#close(true));
		this.querySelector('.no').addEventListener('click', () => this.#close(false));
	}

	/**
	 * Subscribe to the route and listen to the keys, to answer the open question with No when the player leaves the
	 * screen or releases the Escape key.
	 *
	 * @returns {Array<function(): void>} The functions that remove the subscriptions and the listener.
	 */
	subscribe() {
		const onKeyUp = (event) => {
			if (event.key === 'Escape') this.#close(false);
		};
		window.addEventListener('keyup', onKeyUp);
		return [route.subscribe(() => this.#close(false)), () => window.removeEventListener('keyup', onKeyUp)];
	}

	/**
	 * Show a question. An open question gets the answer No.
	 *
	 * @param {string} message The question.
	 * @param {string} title The title of the screen.
	 * @returns {Promise<boolean>} Resolves when the player answers: true for Yes, false for No.
	 */
	ask(message, title) {
		this.#close(false);
		this.querySelector('h2').textContent = title;
		this.querySelector('p').textContent = message;
		this.hidden = false;
		confirmShown.set(true);
		return new Promise((resolve) => {
			this.#answer = resolve;
		});
	}

	/**
	 * Hide the element and answer the open question.
	 *
	 * @param {boolean} answer True for Yes, false for No.
	 * @returns {void}
	 */
	#close(answer) {
		const resolve = this.#answer;
		this.#answer = null;
		this.hidden = true;
		confirmShown.set(false);
		resolve?.(answer);
	}
}
