/**
 * The editor buttons element.
 */

import { alertDialog } from '../dialog.js';
import { ChromeScreen, loadMarkup, Screen } from '../element.js';

/** @type {HTMLTemplateElement|null} The markup of the editor buttons. */
const TEMPLATE = await loadMarkup(import.meta.url);

/** @type {string} The text of the help dialog of the editor. */
const EDITOR_HELP =
	'Left click : Put tile or object\n' +
	'Right click : Remove tile or object\n' +
	'Middle click : Fill\n' +
	'ctrl + z : Undo\n' +
	'ctrl + y : Redo\n' +
	'Return : Try Map / Stop trying\n' +
	'Escape : Stop trying';

/**
 * The custom element <editor-buttons>. It shows the Exit, Load and Save links and the Clear, Try Map and Help buttons
 * on the editor screen. The Clear button clears the map of the stage, the Try Map button starts the test run of the
 * map, and the Help button shows the shortcuts of the editor.
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
		this.querySelector('.clear').addEventListener('click', () => this.stage.clearMap());
		this.querySelector('.test').addEventListener('click', () => this.stage.test());
		this.querySelector('.help').addEventListener('click', () => alertDialog(EDITOR_HELP, 'Level Editor Shortcuts'));
	}

	/**
	 * Tell if the editor buttons show on a screen of the app.
	 *
	 * @param {string} screen The screen, a value of Screen.
	 * @returns {boolean} True on the editor screen only.
	 */
	shouldShow(screen) {
		return screen === Screen.EDITOR;
	}
}
