/**
 * The narrator text element.
 */

import { ChromeElement, loadMarkup, Screen } from '../element.js';

/** @type {HTMLTemplateElement|null} The markup of the narrator text. */
const TEMPLATE = await loadMarkup(import.meta.url);

/** @type {number} The time between two characters of the narrator text in milliseconds: 45 characters per second. */
const TYPE_TIME = 1000 / 45;

/** @type {string} The narrator text of the test run of the editor map. */
const TEST_TEXT = 'Press <Enter> or <Escape> key to stop testing.';

/**
 * The custom element <narrator-text>. It shows a text in a paragraph. The element types the text at 45 characters per
 * second, and starts again for each new text and for each new message of the stage, also when the message has the same
 * text. The typing stops while the stage is paused. A text that is longer than the paragraph scrolls, and the typing
 * keeps its end in view.
 *
 * The text is the key hint during the test run of the editor map, else the attribute text, which the app element sets
 * on the screens with a fixed text, else the text of the message of the stage.
 */
export class NarratorText extends ChromeElement {
	/** @type {HTMLTemplateElement|null} The markup of the narrator text. */
	static template = TEMPLATE;

	/** @type {string[]} The attributes that cause a new render when they change. */
	static observedAttributes = ['text'];

	/** @type {string|object|null} The source of the text: the fixed text, or the message object of the stage. */
	#source = null;

	/** @type {string} The text that the element types. */
	#text = '';

	/** @type {number} The number of characters of the text that show. */
	#shown = 0;

	/** @type {number} The id of the timer of the typing, or 0 if the typing stopped. */
	#timer = 0;

	/**
	 * Subscribe to the message, the pause and the mode of the stage, and stop the typing on disconnect.
	 *
	 * @returns {Array<function(): void>} The functions that remove the subscriptions and the function that stops the
	 *     typing.
	 */
	subscribe() {
		return [
			this.stage.message.subscribe(() => this.render()),
			this.stage.paused.subscribe(() => this.render()),
			this.stage.mode.subscribe(() => this.render()),
			() => this.#stopTyping(),
		];
	}

	/**
	 * Start a new text from its first character, and run the typing while the stage is not paused and characters are
	 * left to type.
	 *
	 * @returns {void}
	 */
	render() {
		const testing = this.stage.mode.get() == 'test';
		const source = testing ? TEST_TEXT : (this.getAttribute('text') ?? this.stage.message.get());
		if (source !== this.#source) {
			this.#source = source;
			this.#text = typeof source == 'string' ? source : (source?.text ?? '');
			this.#shown = 0;
			this.#show();
		}
		if (this.stage.paused.get() || this.#shown >= this.#text.length) this.#stopTyping();
		else if (this.#timer == 0) this.#timer = setInterval(() => this.#type(), TYPE_TIME);
	}

	/**
	 * Tell if the narrator text shows on a screen of the app.
	 *
	 * @param {string} screen The screen, a value of Screen.
	 * @returns {boolean} True on the play, the editor and the editor-file screen.
	 */
	shouldShow(screen) {
		return [Screen.PLAY, Screen.EDITOR, Screen.EDITOR_FILE].includes(screen);
	}

	/**
	 * Type one more character, and stop the typing at the end of the text.
	 *
	 * @returns {void}
	 */
	#type() {
		this.#shown++;
		this.#show();
		if (this.#shown >= this.#text.length) this.#stopTyping();
	}

	/**
	 * Show the typed part of the text, and scroll to its end.
	 *
	 * @returns {void}
	 */
	#show() {
		const paragraph = this.querySelector('p');
		paragraph.textContent = this.#text.slice(0, this.#shown);
		paragraph.scrollTop = paragraph.scrollHeight;
	}

	/**
	 * Stop the timer of the typing.
	 *
	 * @returns {void}
	 */
	#stopTyping() {
		clearInterval(this.#timer);
		this.#timer = 0;
	}
}
