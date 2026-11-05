/**
 * The tile palette element.
 */

import { EDITOR_TILE_TITLES, EDITOR_TILES } from '../../stage/constants.js';
import { dispatch } from '../dom.js';
import { ChromeElement, loadMarkup } from '../element.js';

/** @type {HTMLTemplateElement|null} The markup of the tile palette, null because the palette has only a style. */
const TEMPLATE = await loadMarkup(import.meta.url);

/**
 * The custom element <tile-palette>. It shows a button for each tile of the editor. Each button shows the image of its
 * tile.
 *
 * The attribute selected is the tile id or the object id that the editor paints. Its button has the class selected. A
 * click on a button dispatches the bubbling event brush-select with the tile id as detail.tile.
 */
export class TilePalette extends ChromeElement {
	/** @type {HTMLTemplateElement|null} The markup of the tile palette, null because the palette has only a style. */
	static template = TEMPLATE;

	/** @type {string[]} The attributes that cause a new render when they change. */
	static observedAttributes = ['selected'];

	/**
	 * Add the click handler of the tile buttons.
	 *
	 * @returns {void}
	 */
	setUp() {
		this.addEventListener('click', (event) => {
			const button = event.target.closest('button[data-tile]');
			if (button) dispatch(this, 'brush-select', { tile: Number(button.dataset.tile) });
		});
	}

	/**
	 * Make the tile buttons from the selected tile and replace the children with them.
	 *
	 * @returns {void}
	 */
	render() {
		const selected = Number(this.getAttribute('selected'));
		const buttons = EDITOR_TILES.map((tile) => {
			const button = document.createElement('button');
			const image = document.createElement('img');
			image.alt = '';
			image.src = `tiles/tile_${tile}.svg`;
			button.append(image);
			button.dataset.tile = String(tile);
			button.title = EDITOR_TILE_TITLES[tile];
			button.classList.toggle('selected', this.hasAttribute('selected') && tile == selected);
			return button;
		});
		this.replaceChildren(...buttons);
	}
}
