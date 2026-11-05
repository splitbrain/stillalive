/**
 * The object palette element.
 */

import { Tile } from '../../stage/tiles.js';
import { ChromeElement, loadMarkup, Screen } from '../element.js';

/** @type {HTMLTemplateElement|null} The markup of the object palette. */
const TEMPLATE = await loadMarkup(import.meta.url);

/**
 * The custom element <object-palette>. It shows a button for each object of the editor and the buttons that change the
 * background, on the editor screen.
 *
 * A click on an object button makes its object the brush of the stage. The button of the brush has the class selected.
 * A click on a background button changes the background of the stage to the previous or the next one, by the step of
 * the button, -1 or 1, in its data-bg attribute.
 */
export class ObjectPalette extends ChromeElement {
	/** @type {HTMLTemplateElement|null} The markup of the object palette. */
	static template = TEMPLATE;

	/**
	 * Add the click handler of the object and the background buttons.
	 *
	 * @returns {void}
	 */
	setUp() {
		this.addEventListener('click', (event) => {
			const button = event.target.closest('button');
			const stage = this.stage;
			if (button?.dataset.object) stage.setBrush(Tile[button.dataset.object]);
			else if (button?.dataset.bg) stage.setBackground(stage.getMap().bg + Number(button.dataset.bg));
		});
	}

	/**
	 * Subscribe to the brush of the stage.
	 *
	 * @returns {Array<function(): void>} The functions that remove the subscriptions.
	 */
	subscribe() {
		return [this.stage.brush.subscribe(() => this.render())];
	}

	/**
	 * Mark the button of the object that is the brush of the stage.
	 *
	 * @returns {void}
	 */
	render() {
		const brush = this.stage.brush.get();
		for (const button of this.querySelectorAll('button[data-object]')) {
			button.classList.toggle('selected', Tile[button.dataset.object] === brush);
		}
	}

	/**
	 * Tell if the object palette shows on a screen of the app.
	 *
	 * @param {string} screen The screen, a value of Screen.
	 * @returns {boolean} True on the editor screen only.
	 */
	shouldShow(screen) {
		return screen === Screen.EDITOR;
	}
}
