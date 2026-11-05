/**
 * The object palette element.
 */

import { Tile } from '../../stage/tiles.js';
import { dispatch } from '../dom.js';
import { ChromeElement, loadMarkup } from '../element.js';

/** @type {HTMLTemplateElement|null} The markup of the object palette. */
const TEMPLATE = await loadMarkup(import.meta.url);

/**
 * The custom element <object-palette>. It shows a button for each object of the editor and the buttons that change the
 * background.
 *
 * The attribute selected is the tile id or the object id that the editor paints. Its button has the class selected. A
 * click on an object button dispatches the bubbling event brush-select with the object id as detail.tile. A click on a
 * background button dispatches the bubbling event background-change with the change of the background index, -1 or 1,
 * as detail.step.
 */
export class ObjectPalette extends ChromeElement {
	/** @type {HTMLTemplateElement|null} The markup of the object palette. */
	static template = TEMPLATE;

	/** @type {string[]} The attributes that cause a new render when they change. */
	static observedAttributes = ['selected'];

	/**
	 * Add the click handler of the object and the background buttons.
	 *
	 * @returns {void}
	 */
	setUp() {
		this.addEventListener('click', (event) => {
			const button = event.target.closest('button');
			if (button?.dataset.object) dispatch(this, 'brush-select', { tile: Tile[button.dataset.object] });
			else if (button?.dataset.bg) dispatch(this, 'background-change', { step: Number(button.dataset.bg) });
		});
	}

	/**
	 * Mark the button of the selected object.
	 *
	 * @returns {void}
	 */
	render() {
		const selected = this.getAttribute('selected');
		for (const button of this.querySelectorAll('button[data-object]')) {
			button.classList.toggle('selected', Tile[button.dataset.object] === Number(selected));
		}
	}
}
