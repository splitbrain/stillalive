/**
 * The dialog element.
 */

import { Tile } from '../../stage/map/tiles.js';
import { route, RouteName } from '../../router.js';
import { Value } from '../../value.js';
import { loadMarkup, UiElement } from '../element.js';

/** @type {HTMLTemplateElement|null} The markup of the dialog. */
const TEMPLATE = await loadMarkup(import.meta.url);

/** @type {Value<boolean>} True while the dialog shows a question or a message. */
export const dialogShown = new Value(false);

/**
 * Check if the controls of the editor are locked. They are locked on the save screen, on the load screen and while the
 * dialog shows.
 *
 * @returns {boolean} True while the controls are locked.
 */
export function isEditorLocked() {
	return [RouteName.SAVE, RouteName.LOAD].includes(route.get().name) || dialogShown.get();
}

/**
 * Get the dialog element of the page.
 *
 * @returns {Dialog} The dialog element.
 */
function dialogElement() {
	return /** @type {Dialog} */ (document.querySelector('ui-dialog'));
}

/**
 * Ask the player a question with the dialog element.
 *
 * @param {string} message The question. A line break starts a new line.
 * @param {string} title The title of the dialog.
 * @returns {Promise<boolean>} Resolves when the player answers: true for Yes, false for No.
 */
export function askConfirmation(message, title) {
	return dialogElement().ask(message, title);
}

/**
 * Show the player a message with the dialog element.
 *
 * @param {string} message The message. A line break starts a new line.
 * @param {string} title The title of the dialog.
 * @returns {Promise<void>} Resolves when the player closes the message.
 */
export function showAlert(message, title) {
	return dialogElement().alert(message, title);
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
 * The custom element <ui-dialog>. It shows a title and a text on top of the stage, with the Yes and No buttons for a
 * question or with an OK button for a message.
 *
 * The element shows one dialog at a time. A new question or message replaces the open one: an open question gets the
 * answer No, and an open message closes. A question also gets the answer No when the route changes or the player
 * releases the Escape key. A message stays open when the route changes, so a message can come with a step up. The OK
 * button and the release of Enter or Escape close a message, and these keys do not reach the game or other handlers.
 */
export class Dialog extends UiElement {
	/** @type {HTMLTemplateElement|null} The markup of the dialog. */
	static template = TEMPLATE;

	/** @type {((answer: boolean) => void)|null} The function that answers the open question, or null for none. */
	#answer = null;
	/** @type {(() => void)|null} The function that closes the open message, or null for none. */
	#dismiss = null;
	/**
	 * @type {string|null} The Enter or Escape key that was pressed while the message shows, or null. The release of a
	 *     key that was pressed before the message does not close it.
	 */
	#pressedKey = null;

	/**
	 * Add the handlers of the buttons.
	 *
	 * @returns {void}
	 */
	setUp() {
		this.querySelector('.yes').addEventListener('click', () => this.#closeQuestion(true));
		this.querySelector('.no').addEventListener('click', () => this.#closeQuestion(false));
		this.querySelector('.ok').addEventListener('click', () => this.#closeMessage());
	}

	/**
	 * Subscribe to the route and listen to the keys. A route change and the release of Escape answer the open question
	 * with No. While a message shows, the listeners in the capture phase take the Enter and Escape keys before all
	 * other handlers, and the release closes the message.
	 *
	 * @returns {Array<() => void>} The functions that remove the subscriptions and the listeners.
	 */
	subscribe() {
		const onQuestionKeyUp = (event) => {
			if (event.key === 'Escape') this.#closeQuestion(false);
		};
		const onMessageKey = (event) => this.#onMessageKey(event);
		window.addEventListener('keyup', onQuestionKeyUp);
		window.addEventListener('keydown', onMessageKey, { capture: true });
		window.addEventListener('keyup', onMessageKey, { capture: true });
		return [
			route.subscribe(() => this.#closeQuestion(false)),
			() => window.removeEventListener('keyup', onQuestionKeyUp),
			() => window.removeEventListener('keydown', onMessageKey, { capture: true }),
			() => window.removeEventListener('keyup', onMessageKey, { capture: true }),
		];
	}

	/**
	 * Tell if the element shows: it shows while a question or a message is open.
	 *
	 * @returns {boolean} True while the dialog is open.
	 */
	shouldShow() {
		return dialogShown.get();
	}

	/**
	 * Show a question. An open question gets the answer No, and an open message closes.
	 *
	 * @param {string} message The question.
	 * @param {string} title The title above the question.
	 * @returns {Promise<boolean>} Resolves when the player answers: true for Yes, false for No.
	 */
	ask(message, title) {
		this.#closeQuestion(false);
		this.#closeMessage();
		this.#fill(message, title, true);
		dialogShown.set(true);
		return new Promise((resolve) => {
			this.#answer = resolve;
		});
	}

	/**
	 * Show a message with an OK button. An open question gets the answer No, and an open message closes. The OK button
	 * gets the focus.
	 *
	 * @param {string} message The message.
	 * @param {string} title The title above the message.
	 * @returns {Promise<void>} Resolves when the player closes the message.
	 */
	alert(message, title) {
		this.#closeQuestion(false);
		this.#closeMessage();
		this.#fill(message, title, false);
		dialogShown.set(true);
		/** @type {HTMLButtonElement} */ (this.querySelector('.ok')).focus();
		return new Promise((resolve) => {
			this.#dismiss = resolve;
		});
	}

	/**
	 * Put the title and the text into the element and show the buttons of a question or of a message.
	 *
	 * @param {string} message The text.
	 * @param {string} title The title.
	 * @param {boolean} question True for a question with Yes and No, false for a message with OK.
	 * @returns {void}
	 */
	#fill(message, title, question) {
		this.querySelector('h2').textContent = title;
		this.querySelector('p').textContent = message;
		/** @type {HTMLElement} */ (this.querySelector('.question')).hidden = !question;
		/** @type {HTMLElement} */ (this.querySelector('.message')).hidden = question;
	}

	/**
	 * Take the Enter and Escape keys while a message shows. The release of the key that was pressed during the message
	 * closes it.
	 *
	 * @param {KeyboardEvent} event The keydown or keyup event.
	 * @returns {void}
	 */
	#onMessageKey(event) {
		if (this.#dismiss === null || (event.key !== 'Enter' && event.key !== 'Escape')) return;
		event.stopPropagation();
		event.preventDefault();
		if (event.type === 'keydown') {
			this.#pressedKey = event.key;
		} else if (event.key === this.#pressedKey) {
			this.#closeMessage();
		}
	}

	/**
	 * Close the open question and answer it. Without an open question, nothing happens.
	 *
	 * @param {boolean} answer True for Yes, false for No.
	 * @returns {void}
	 */
	#closeQuestion(answer) {
		const resolve = this.#answer;
		if (resolve === null) return;
		this.#answer = null;
		dialogShown.set(false);
		resolve(answer);
	}

	/**
	 * Close the open message. Without an open message, nothing happens.
	 *
	 * @returns {void}
	 */
	#closeMessage() {
		const resolve = this.#dismiss;
		if (resolve === null) return;
		this.#dismiss = null;
		this.#pressedKey = null;
		dialogShown.set(false);
		resolve();
	}
}
