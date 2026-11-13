/**
 * The narrator text element.
 */

import { route } from '../../router.js';
import { ChromeScreen, loadMarkup, Screen } from '../element.js';

/** @type {HTMLTemplateElement|null} The markup of the narrator text. */
const TEMPLATE = await loadMarkup(import.meta.url);

/** @type {number} The time between two characters of the narrator text in milliseconds: 45 characters per second. */
const TYPE_TIME = 1000 / 45;

/**
 * The custom element <narrator-text>. It types a text one character after the other. The typing starts again for each
 * new text and for each new message of the stage, also when the message has the same text. The typing stops while the
 * stage is paused. On a replay route, each text shows in full at once, because the playback can run faster than the
 * typing.
 *
 * During the test run of the editor map, the text is the message of the stage. Else the text is the attribute text,
 * and without the attribute the message of the stage.
 */
export class NarratorText extends ChromeScreen {
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
	 * Subscribe to the message, the pause and the mode of the stage and to the Space key, and stop the typing on
	 * disconnect.
	 *
	 * @returns {Array<function(): void>} The functions that remove the subscriptions and the function that stops the
	 *     typing.
	 */
	subscribe() {
		const onKeyDown = (event) => this.#onKeyDown(event);
		window.addEventListener('keydown', onKeyDown);
		return [
			() => window.removeEventListener('keydown', onKeyDown),
			this.stage.message.subscribe(() => this.render()),
			this.stage.paused.subscribe(() => this.render()),
			this.stage.mode.subscribe(() => this.render()),
			() => this.#stopTyping(),
		];
	}

	/**
	 * Start a new text from its first character, or in full on a replay route, and run the typing while the stage is
	 * not paused and characters are left to type.
	 *
	 * @returns {void}
	 */
	render() {
		const testing = this.stage.mode.get() == 'test';
		const source = (testing ? null : this.getAttribute('text')) ?? this.stage.message.get();
		if (source !== this.#source) {
			this.#source = source;
			this.#text = typeof source == 'string' ? source : (source?.text ?? '');
			this.#shown = route.get().mode == 'replay' ? this.#text.length : 0;
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
	 * Type one more character, and stop the typing at the end of the text. Every second character plays a tick sound,
	 * except a space.
	 *
	 * @returns {void}
	 */
	#type() {
		this.#shown++;
		this.#show();
		if (this.#text[this.#shown - 1] != ' ' && this.#shown % 2 == 0) this.stage.playTypeSound();
		if (this.#shown >= this.#text.length) this.#stopTyping();
	}

	/**
	 * Show the full text on a press of the Space key while the element types. The key then does not press the focused
	 * button. While the element shows, the Space key does not scroll the page. A Space key in a text field or a dialog
	 * keeps its normal effect.
	 *
	 * @param {KeyboardEvent} event The keydown event.
	 * @returns {void}
	 */
	#onKeyDown(event) {
		if (event.code != 'Space' || this.hidden) return;
		if (event.target instanceof Element && event.target.closest('input, textarea, select, dialog')) return;
		if (this.#timer == 0 && event.target != document.body) return;
		event.preventDefault();
		if (this.#timer == 0) return;
		this.#shown = this.#text.length;
		this.#show();
		this.#stopTyping();
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
