/**
 * The editor buttons element.
 */

import { navigate, route, up } from '../../router.js';
import { MAP_FORMAT, parseMap } from '../../stage/mapFile.js';
import { alertDialog } from '../dialog.js';
import { ChromeScreen, loadMarkup, Screen } from '../element.js';
import { downloadJson, pickJsonFile } from '../files.js';
import { confirmReplaceMap, confirmShown } from './ConfirmScreen.js';

/** @type {HTMLTemplateElement|null} The markup of the editor buttons. */
const TEMPLATE = await loadMarkup(import.meta.url);

/**
 * The custom element <editor-buttons>. It shows the row of the Try, Undo, Redo, Clear, Save, Load, Export, Import and
 * Exit buttons on the editor screen and during the test run of the map. The Undo and Redo buttons show arrows. The Try button goes to the test run of the map.
 * The Undo, Redo and Clear buttons change the map of the stage. The Export button downloads the map as a JSON file,
 * and the Import button replaces the map with a map file. A button with a data-href attribute goes to that route, and a
 * button with a data-up attribute goes up to that route.
 *
 * During the test run, the Try button is labeled Stop and goes back to the editor, and all other buttons are disabled. On
 * the save and load screen and while the confirmation screen shows a question, all buttons are disabled.
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
			if (this.stage.mode.get() == 'test') up('#/editor');
			else navigate('#/editor/test');
		});
		this.querySelector('.undo').addEventListener('click', () => this.stage.undo());
		this.querySelector('.redo').addEventListener('click', () => this.stage.redo());
		this.querySelector('.clear').addEventListener('click', () => this.stage.clearMap());
		this.querySelector('.export').addEventListener('click', () => this.#export());
		this.querySelector('.import').addEventListener('click', () => {
			this.#import().catch((error) => alertDialog(error.message, 'Import map'));
		});
		for (const button of this.querySelectorAll('[data-href]')) {
			button.addEventListener('click', () => navigate(button.dataset.href));
		}
		for (const button of this.querySelectorAll('[data-up]')) {
			button.addEventListener('click', () => up(button.dataset.up));
		}
	}

	/**
	 * Subscribe to the mode of the stage, to the route and to the confirmation screen, to label the Try button and to
	 * disable the buttons.
	 *
	 * @returns {Array<function(): void>} The functions that remove the subscriptions.
	 */
	subscribe() {
		const update = () => this.#updateButtons();
		return [this.stage.mode.subscribe(update), route.subscribe(update), confirmShown.subscribe(update)];
	}

	/**
	 * Label the Try button by the mode of the stage, and disable the buttons that do not apply.
	 *
	 * @returns {void}
	 */
	#updateButtons() {
		const test = this.querySelector('.test');
		const testing = this.stage.mode.get() == 'test';
		const locked = route.get().name == 'editor-file' || confirmShown.get();
		test.textContent = testing ? 'Stop' : 'Try';
		for (const button of this.querySelectorAll('button')) button.disabled = locked || (testing && button != test);
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
	 * first confirm that it is replaced. Nothing happens if the editor is closed when the player has selected the file.
	 *
	 * @returns {Promise<void>}
	 * @throws {Error} If the file is not a valid map or is a boss level.
	 */
	async #import() {
		if (!(await confirmReplaceMap(this.stage))) return;
		const data = await pickJsonFile();
		if (data === null || this.stage.mode.get() != 'edit') return;
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
		if (screen === Screen.EDITOR || screen === Screen.EDITOR_FILE) return true;
		return screen === Screen.PLAY && this.stage.mode.get() == 'test';
	}
}
