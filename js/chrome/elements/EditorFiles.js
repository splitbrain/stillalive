/**
 * The element of the save and load screen of the editor.
 */

import { RouteName, up } from '../../router.js';
import { alertDialog } from '../dialog.js';
import { setAttributes } from '../dom.js';
import { loadMarkup, Screen } from '../element.js';
import { editorMap, saveEditorMap } from '../storage.js';
import { confirmOnScreen, confirmReplaceMap } from './ConfirmScreen.js';
import { SelectionScreen } from './SelectionScreen.js';

/** @type {HTMLTemplateElement|null} The markup of the save and load screen. */
const TEMPLATE = await loadMarkup(import.meta.url);

/**
 * The custom element <editor-files>. It is the save and load screen of the editor. The attribute mode is save for the
 * save screen and load for the load screen, a value of RouteName.
 */
export class EditorFiles extends SelectionScreen {
	/** @type {HTMLTemplateElement|null} The markup of the save and load screen. */
	static template = TEMPLATE;

	/** @type {string[]} The attributes that cause a new render when they change. */
	static observedAttributes = ['mode'];

	/** @type {boolean} True after a save or a load, until the mode changes. It blocks further slot clicks. */
	#leaving = false;

	/**
	 * Add the handlers of the preview and of the slot clicks.
	 *
	 * @returns {void}
	 */
	setUp() {
		super.setUp();
		this.addEventListener('slot-select', (event) =>
			this.#pickSlot(/** @type {CustomEvent<{slot: number}>} */ (event).detail.slot),
		);
	}

	/**
	 * Allow the slot clicks again, and render the screen again.
	 *
	 * @returns {void}
	 */
	attributeChangedCallback() {
		this.#leaving = false;
		super.attributeChangedCallback();
	}

	/**
	 * Give the mode to the slot list.
	 *
	 * @returns {void}
	 */
	render() {
		const mode = this.getAttribute('mode');
		setAttributes(this.querySelector('slot-list'), {
			mode: mode === RouteName.SAVE || mode === RouteName.LOAD ? mode : null,
		});
	}

	/**
	 * Show the preview of the map of a slot on the stage. An empty slot shows the editor map.
	 *
	 * @param {number} slot The slot number, or 0 for the editor map.
	 * @returns {void}
	 */
	previewChoice(slot) {
		this.stage.preview((slot > 0 && editorMap(slot).get()) || this.stage.getMap());
	}

	/**
	 * Save the editor map into a slot, or open the map of a slot in the editor, after the confirmation of the player if
	 * a map is lost. Then go back to the editor. The pick stops if the screen is closed or its mode changes before the
	 * player confirms.
	 *
	 * @param {number} slot The slot number.
	 * @returns {Promise<void>}
	 */
	async #pickSlot(slot) {
		if (this.#leaving) return;
		const mode = this.getAttribute('mode');
		const stored = editorMap(slot).get();
		if (mode === RouteName.LOAD) {
			if (stored == null || !(await confirmReplaceMap(this.stage))) return;
		} else if (mode === RouteName.SAVE) {
			const question = `Slot ${slot} contains a map. Do you want to overwrite it?`;
			if (stored != null && !(await confirmOnScreen(question, 'Save map'))) return;
		} else {
			return;
		}
		if (this.#leaving || this.getAttribute('mode') !== mode) return;

		if (mode === RouteName.LOAD) {
			this.stage.edit(editorMap(slot).get());
		} else {
			if (!saveEditorMap(slot, this.stage.getMap())) {
				alertDialog(
					'The map could not be saved, because the browser blocks the storage or the storage is full. ' +
						'Use Export to save the map as a file.',
					'Save map',
				);
				return;
			}
		}
		this.#backToEditor();
	}

	/**
	 * Go back to the editor.
	 *
	 * @returns {void}
	 */
	#backToEditor() {
		this.#leaving = true;
		up('#/editor');
	}

	/**
	 * Tell if the save and load screen shows on a screen of the app.
	 *
	 * @param {string} screen The screen, a value of Screen.
	 * @returns {boolean} True on the save and the load screen.
	 */
	shouldShow(screen) {
		return screen === Screen.SAVE || screen === Screen.LOAD;
	}
}
