/**
 * The element of the save and load screen of the editor.
 */

import { navigate } from '../../router.js';
import { alertDialog } from '../dialog.js';
import { setAttributes } from '../dom.js';
import { loadMarkup, Screen } from '../element.js';
import { editorMap, saveEditorMap } from '../storage.js';
import { confirmOnScreen, confirmReplaceMap } from './ConfirmScreen.js';
import { SelectionScreen } from './SelectionScreen.js';

/** @type {HTMLTemplateElement|null} The markup of the save and load screen. */
const TEMPLATE = await loadMarkup(import.meta.url);

/**
 * The custom element <editor-files>. It is the save and load screen of the editor. It shows the back link to the
 * editor and the list of the slots. The stage shows the preview of the slot under the pointer, or of the editor map
 * when the pointer is on no stored slot.
 *
 * The attribute mode is empty for the editor, and save or load for the save or load screen. The app element sets it on
 * the editor routes and removes it on the other routes. The element shows on the save and load screen only, but the
 * empty mode tells it that the player came from the editor. The element gives the mode to the slot list.
 *
 * On the save screen, a click on an empty slot saves the editor map into the slot. A click on a stored slot saves only
 * after the player confirms that the stored map is overwritten. On the load screen, a click on a stored slot opens its
 * map in the editor. If the editor map is not empty, the player must first confirm that it is replaced. Then the
 * element goes back to the editor: back in the history if the player came from the editor, else to the editor route
 * in place of the current entry. So after a save or a load the history holds the editor route only once.
 */
export class EditorFiles extends SelectionScreen {
	/** @type {HTMLTemplateElement|null} The markup of the save and load screen. */
	static template = TEMPLATE;

	/** @type {string[]} The attributes that cause a new render when they change. */
	static observedAttributes = ['mode'];

	/** @type {boolean} True if the save or load screen was opened from the editor. */
	#fromEditor = false;

	/** @type {boolean} True after a save or a load, until the mode changes. Further slot clicks do nothing. */
	#leaving = false;

	/**
	 * Add the handlers of the preview and of the slot clicks.
	 *
	 * @returns {void}
	 */
	setUp() {
		super.setUp();
		this.addEventListener('slot-select', (event) => this.#pickSlot(event.detail.slot));
	}

	/**
	 * Note if the save or load screen opens from the editor, allow the slot clicks again, and render the screen again.
	 *
	 * @param {string} name The name of the attribute.
	 * @param {string|null} oldValue The value before the change.
	 * @param {string|null} newValue The value after the change.
	 * @returns {void}
	 */
	attributeChangedCallback(name, oldValue, newValue) {
		if (oldValue !== newValue) this.#fromEditor = oldValue === '';
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
		setAttributes(this.querySelector('slot-list'), { mode: mode == 'save' || mode == 'load' ? mode : null });
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
	 * a map is lost. Then go back to the editor. Nothing happens if the screen is closed or its mode changed when the
	 * player confirms.
	 *
	 * @param {number} slot The slot number.
	 * @returns {Promise<void>}
	 */
	async #pickSlot(slot) {
		const mode = this.getAttribute('mode');
		const stored = editorMap(slot).get();
		if (mode == 'load') {
			if (stored == null || !(await confirmReplaceMap(this.stage))) return;
		} else if (mode == 'save') {
			const question = 'Slot ' + slot + ' contains a map. Do you want to overwrite it?';
			if (stored != null && !(await confirmOnScreen(question, 'Save map'))) return;
		} else {
			return;
		}
		if (this.#leaving || this.getAttribute('mode') != mode) return;

		if (mode == 'load') {
			this.stage.edit(editorMap(slot).get());
		} else {
			const map = this.stage.getMap();
			if (!saveEditorMap(slot, map.tiles, map.bg)) {
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
		if (this.#fromEditor) history.back();
		else navigate('#/editor', true);
	}

	/**
	 * Tell if the save and load screen shows on a screen of the app.
	 *
	 * @param {string} screen The screen, a value of Screen.
	 * @returns {boolean} True on the save and load screen only.
	 */
	shouldShow(screen) {
		return screen === Screen.EDITOR_FILE;
	}
}
