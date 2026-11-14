/**
 * The editor buttons element.
 */

import { navigate, route, up } from '../../router.js';
import { MAP_FORMAT, parseMap } from '../../stage/mapFile.js';
import { alertDialog } from '../dialog.js';
import { ChromeScreen, loadMarkup, Screen } from '../element.js';
import { downloadJson, pickJsonFile } from '../files.js';
import { confirmReplaceMap, confirmShown, isEditorLocked } from './ConfirmScreen.js';

/** @type {HTMLTemplateElement|null} The markup of the editor buttons. */
const TEMPLATE = await loadMarkup(import.meta.url);

/**
 * The custom element <editor-buttons>. It shows the buttons that test, change, store and leave the editor map.
 */
export class EditorButtons extends ChromeScreen {
	/** @type {HTMLTemplateElement|null} The markup of the editor buttons. */
	static template = TEMPLATE;

	/**
	 * Add the click handlers of the buttons.
	 *
	 * @returns {void}
	 */
	setUp() {
		this.querySelector('.test').addEventListener('click', () => {
			if (this.stage.mode.get() === 'test') up('#/editor');
			else navigate('#/editor/test');
		});
		this.querySelector('.undo').addEventListener('click', () => this.stage.undo());
		this.querySelector('.redo').addEventListener('click', () => this.stage.redo());
		this.querySelector('.clear').addEventListener('click', () => this.stage.clearMap());
		this.querySelector('.export').addEventListener('click', () => this.#export());
		this.querySelector('.import').addEventListener('click', () => {
			this.#import().catch((error) => alertDialog(error.message, 'Import map'));
		});
		for (const button of /** @type {NodeListOf<HTMLElement>} */ (this.querySelectorAll('[data-href]'))) {
			button.addEventListener('click', () => navigate(button.dataset.href));
		}
		for (const button of /** @type {NodeListOf<HTMLElement>} */ (this.querySelectorAll('[data-up]'))) {
			button.addEventListener('click', () => up(button.dataset.up));
		}
	}

	/**
	 * Subscribe to the mode of the stage, to the route and to the confirmation screen, to label the Try button and to
	 * disable the buttons.
	 *
	 * @returns {Array<() => void>} The functions that remove the subscriptions.
	 */
	subscribe() {
		const update = () => this.#updateButtons();
		return [this.stage.mode.subscribe(update), route.subscribe(update), confirmShown.subscribe(update)];
	}

	/**
	 * Label the Try button Stop during the test run, and disable the other buttons. Disable all buttons while the editor
	 * is locked.
	 *
	 * @returns {void}
	 */
	#updateButtons() {
		const test = this.querySelector('.test');
		const testing = this.stage.mode.get() === 'test';
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
		if (data === null || this.stage.mode.get() !== 'edit') return;
		if (parseMap(data).boss > 0) throw new Error('The editor does not support boss levels.');
		this.stage.edit(data);
	}

	/**
	 * Tell if the editor buttons show on a screen of the app.
	 *
	 * @param {string} screen The screen, a value of Screen.
	 * @returns {boolean} True on the editor screen and on the save and load screen, and on the play screen during the
	 *     test run of the editor map.
	 */
	shouldShow(screen) {
		return (
			screen === Screen.EDITOR ||
			screen === Screen.EDITOR_FILE ||
			(screen === Screen.PLAY && this.stage.mode.get() === 'test')
		);
	}
}
