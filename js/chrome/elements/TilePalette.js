/**
 * The tile palette element.
 */

import { EDITOR_TILE_TITLES, EDITOR_TILES } from '../../stage/constants.js';
import { ChromeScreen, loadMarkup, Screen } from '../element.js';

/** @type {HTMLTemplateElement|null} The markup of the tile palette, null because the palette has only a style. */
const TEMPLATE = await loadMarkup(import.meta.url);

/**
 * The custom element <tile-palette>. It shows a button for each tile of the editor on the editor screen. Each button
 * shows the image of its tile. A click on a button makes its tile the brush of the stage. The button of the brush has
 * the class selected.
 */
export class TilePalette extends ChromeScreen {
	/** @type {HTMLTemplateElement|null} The markup of the tile palette, null because the palette has only a style. */
	static template = TEMPLATE;

	/**
	 * Add the click handler of the tile buttons.
	 *
	 * @returns {void}
	 */
	setUp() {
		this.addEventListener('click', (event) => {
			const button = event.target.closest('button[data-tile]');
			if (button) this.stage.setBrush(Number(button.dataset.tile));
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
	 * Make the tile buttons from the brush of the stage and replace the children with them.
	 *
	 * @returns {void}
	 */
	render() {
		const brush = this.stage.brush.get();
		const buttons = EDITOR_TILES.map((tile) => {
			const button = document.createElement('button');
			const image = document.createElement('img');
			image.alt = '';
			image.src = `tiles/tile_${tile}.svg`;
			button.append(image);
			button.dataset.tile = String(tile);
			button.title = EDITOR_TILE_TITLES[tile];
			button.classList.toggle('selected', tile == brush);
			return button;
		});
		this.replaceChildren(...buttons);
	}

	/**
	 * Tell if the tile palette shows on a screen of the app.
	 *
	 * @param {string} screen The screen, a value of Screen.
	 * @returns {boolean} True on the editor screen only.
	 */
	shouldShow(screen) {
		return screen === Screen.EDITOR;
	}
}
