/**
 * The element of the save and load screen of the editor.
 */

import { navigate } from '../../router.js';
import { MAP_FORMAT, parseMap } from '../../stage/mapFile.js';
import { alertDialog } from '../dialog.js';
import { setAttributes } from '../dom.js';
import { ChromeElement, loadMarkup, Screen } from '../element.js';
import { downloadJson, pickJsonFile } from '../files.js';
import { editorMap, saveEditorMap } from '../storage.js';

/** @type {HTMLTemplateElement|null} The markup of the save and load screen. */
const TEMPLATE = await loadMarkup(import.meta.url);

/**
 * The custom element <editor-files>. It is the save and load screen of the editor. Its parts are the list of the slots
 * and the buttons of the screen.
 *
 * The attribute mode is empty for the editor, and save or load for the save or load screen. The app element sets it on
 * the editor routes and removes it on the other routes. The element shows on the save and load screen only, but the
 * empty mode tells it that the player came from the editor. The element gives the mode and the selected slot to the
 * slot list and to the buttons.
 *
 * A selected slot shows its map on the stage as a preview, while the stage keeps the editor map. The accept button saves the editor map into the slot or opens the
 * map of the slot in the editor, and the import opens a map file in the editor. Then the element goes back to the
 * editor: back in the history if the player came from the editor, else to the editor route in place of the current
 * entry. So after an accept or an import the history holds the editor route only once.
 */
export class EditorFiles extends ChromeElement {
	/** @type {HTMLTemplateElement|null} The markup of the save and load screen. */
	static template = TEMPLATE;

	/** @type {string[]} The attributes that cause a new render when they change. */
	static observedAttributes = ['mode'];

	/** @type {number} The selected slot of the save or load screen, or 0 for none. */
	#slot = 0;

	/** @type {boolean} True if the save or load screen was opened from the editor. */
	#fromEditor = false;

	/**
	 * Add the handlers of the events of the parts.
	 *
	 * @returns {void}
	 */
	setUp() {
		const onImportError = (error) => alertDialog(error.message, 'Import map');
		this.addEventListener('slot-select', (event) => this.#selectSlot(event.detail.slot));
		this.addEventListener('file-accept', () => this.#accept());
		this.addEventListener('file-export', () => this.#export());
		this.addEventListener('file-import', () => this.#import().catch(onImportError));
	}

	/**
	 * Clear the selected slot after a change of the mode, note if the save or load screen opens from the editor, and
	 * render the screen again.
	 *
	 * @param {string} name The name of the attribute.
	 * @param {string|null} oldValue The value before the change.
	 * @param {string|null} newValue The value after the change.
	 * @returns {void}
	 */
	attributeChangedCallback(name, oldValue, newValue) {
		if (oldValue !== newValue) this.#fromEditor = oldValue === '';
		this.#slot = 0;
		super.attributeChangedCallback();
	}

	/**
	 * Set the attributes of the slots and of the buttons.
	 *
	 * @returns {void}
	 */
	render() {
		const mode = this.getAttribute('mode');
		const file = mode == 'save' || mode == 'load';
		for (const part of this.querySelectorAll('slot-list, editor-file-buttons')) {
			setAttributes(part, { mode: file ? mode : null, selected: this.#slot });
		}
	}

	/**
	 * Select a slot of the save or load screen and show its map, or nothing for an empty slot. The load screen selects
	 * only stored slots.
	 *
	 * @param {number} slot The slot number.
	 * @returns {void}
	 */
	#selectSlot(slot) {
		const stored = editorMap(slot).get();
		if (slot == this.#slot || (this.getAttribute('mode') == 'load' && stored == null)) return;
		this.#slot = slot;
		if (stored) this.stage.preview(stored);
		else this.stage.stop();
		this.render();
	}

	/**
	 * Save the editor map into the selected slot, or open the map of the selected slot in the editor. Then go back to
	 * the editor.
	 *
	 * @returns {void}
	 */
	#accept() {
		if (this.#slot < 1) return;
		if (this.getAttribute('mode') == 'load') {
			this.stage.edit(editorMap(this.#slot).get());
		} else {
			const map = this.stage.getMap();
			if (!saveEditorMap(this.#slot, map.tiles, map.bg)) {
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
	 * Let the browser download the editor map, or on the load screen the map of the selected slot, as a JSON file.
	 *
	 * @returns {void}
	 */
	#export() {
		const map = this.getAttribute('mode') == 'save' ? this.stage.getMap() : editorMap(this.#slot).get();
		if (!map) return;
		downloadJson({ format: MAP_FORMAT, tiles: map.tiles, bg: map.bg }, 'stillalivejs-map.json');
	}

	/**
	 * Let the player select a map file, open it in the editor and go back to the editor. Nothing happens if the save or
	 * load screen is closed when the player has selected the file.
	 *
	 * @returns {Promise<void>}
	 * @throws {Error} If the file is not a valid map or is a boss level.
	 */
	async #import() {
		const data = await pickJsonFile();
		const mode = this.getAttribute('mode');
		if (data === null || (mode != 'save' && mode != 'load')) return;
		const map = parseMap(data);
		if (map.boss > 0) throw new Error('The editor does not support boss levels.');
		this.stage.edit(map);
		this.#backToEditor();
	}

	/**
	 * Go back to the editor. The selected slot is cleared, so that a second click on the accept button does nothing.
	 *
	 * @returns {void}
	 */
	#backToEditor() {
		this.#slot = 0;
		this.render();
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
