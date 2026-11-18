/**
 * The editor buttons element.
 */

import { navigate, route, up } from '../../router.js';
import { StageMode } from '../../stage/constants.js';
import { MAP_FORMAT, parseMap } from '../../stage/map/mapFile.js';
import { requireElement } from '../dom.js';
import { loadMarkup, Screen, UiElement } from '../element.js';
import { downloadJson, pickJsonFile } from '../files.js';
import { confirmReplaceMap, dialogShown, isEditorLocked, showAlert } from './Dialog.js';

/** @type {HTMLTemplateElement|null} The markup of the editor buttons. */
const TEMPLATE = await loadMarkup(import.meta.url);

/**
 * The custom element <ui-editor-buttons>. It shows the buttons that test, change, store and leave the editor map.
 */
export class EditorButtons extends UiElement {
	/** @type {HTMLTemplateElement|null} The markup of the editor buttons. */
	static template = TEMPLATE;

	/**
	 * Add the click handlers of the buttons.
	 *
	 * @returns {void}
	 */
	setUp() {
		requireElement(this, '.test', HTMLButtonElement).addEventListener('click', () => {
			if (this.stage.mode.get() === StageMode.TEST) up('#/editor');
			else navigate('#/test');
		});
		requireElement(this, '.undo', HTMLElement).addEventListener('click', () => this.stage.undo());
		requireElement(this, '.redo', HTMLElement).addEventListener('click', () => this.stage.redo());
		requireElement(this, '.clear', HTMLElement).addEventListener('click', () => this.stage.clearMap());
		requireElement(this, '.export', HTMLElement).addEventListener('click', () => this.#export());
		requireElement(this, '.import', HTMLElement).addEventListener('click', () => {
			this.#import().catch((error) => showAlert(error.message, 'Import map'));
		});
		for (const button of /** @type {NodeListOf<HTMLElement>} */ (this.querySelectorAll('[data-href]'))) {
			button.addEventListener('click', () => navigate(/** @type {string} */ (button.dataset.href)));
		}
		for (const button of /** @type {NodeListOf<HTMLElement>} */ (this.querySelectorAll('[data-up]'))) {
			button.addEventListener('click', () => up(/** @type {string} */ (button.dataset.up)));
		}
	}

	/**
	 * Subscribe to the mode of the stage, to the route and to the dialog, to label the Try button and to
	 * disable the buttons.
	 *
	 * @returns {Array<() => void>} The functions that remove the subscriptions.
	 */
	subscribe() {
		const update = () => this.#updateButtons();
		return [this.stage.mode.subscribe(update), route.subscribe(update), dialogShown.subscribe(update)];
	}

	/**
	 * Label the Try button Stop during the test run, and disable the other buttons. Disable all buttons while the editor
	 * is locked.
	 *
	 * @returns {void}
	 */
	#updateButtons() {
		const test = requireElement(this, '.test', HTMLButtonElement);
		const testing = this.stage.mode.get() === StageMode.TEST;
		const locked = isEditorLocked();
		test.textContent = testing ? 'Stop' : 'Try';
		for (const button of this.querySelectorAll('button')) button.disabled = locked || (testing && button !== test);
	}

	/**
	 * Let the browser download the map of the stage as a map file.
	 *
	 * @returns {void}
	 */
	#export() {
		downloadJson({ format: MAP_FORMAT, ...this.stage.getMap() }, 'stillalive-map.json');
	}

	/**
	 * Let the player select a map file and open it in the editor. If the map of the stage is not empty, the player must
	 * first confirm that it is replaced. The import stops if the editor is closed when the player has selected the file.
	 *
	 * @returns {Promise<void>}
	 * @throws {Error} If the file is not a valid map or is a boss level.
	 */
	async #import() {
		if (!(await confirmReplaceMap(this.stage))) return;
		const data = await pickJsonFile();
		if (data === null || this.stage.mode.get() !== StageMode.EDIT) return;
		if (parseMap(data).boss > 0) throw new Error('The editor does not support boss levels.');
		this.stage.edit(data);
	}

	/**
	 * Tell if the editor buttons show on a screen of the app.
	 *
	 * @param {string} screen The screen, a value of Screen.
	 * @returns {boolean} True on the editor, the save, the load and the test run screen.
	 */
	shouldShow(screen) {
		return [Screen.EDITOR, Screen.SAVE, Screen.LOAD, Screen.TEST].includes(screen);
	}
}
