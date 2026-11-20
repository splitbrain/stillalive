/**
 * The element of the save screen and the load screen of the editor.
 */

import { RouteName, up } from '../../router.js';
import { requireElement, setAttributes } from '../dom.js';
import { loadMarkup, Screen } from '../element.js';
import { editorMap, saveEditorMap } from '../../data/storage.js';
import { CampaignId } from '../../stage/constants.js';
import { levelFromMap } from '../../stage/world/level.js';
import { askConfirmation, confirmReplaceMap, showAlert } from './Dialog.js';
import { Selection } from './Selection.js';

/** @type {HTMLTemplateElement|null} The markup of the editor files. */
const TEMPLATE = await loadMarkup(import.meta.url);

/**
 * The custom element <ui-editor-files>. It shows the slots of the editor maps on the save screen and on the load
 * screen of the editor. The attribute mode is save for the save screen and load for the load screen, a value of
 * RouteName.
 */
export class EditorFiles extends Selection {
	/** @type {HTMLTemplateElement|null} The markup of the editor files. */
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
	 * Allow the slot clicks again, and render the element again.
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
		setAttributes(requireElement(this, 'ui-slot-list', HTMLElement), {
			mode: mode === RouteName.SAVE || mode === RouteName.LOAD ? mode : null,
		});
	}

	/**
	 * Show the preview of the map of a slot on the stage. An empty slot shows the editor map. A slot with a map that
	 * is not valid stops the stage and shows no preview.
	 *
	 * @param {number} slot The slot number, or 0 for the editor map.
	 * @returns {void}
	 */
	previewChoice(slot) {
		const stored = slot > 0 ? editorMap(slot).get() : null;
		let level;
		try {
			level = stored ? levelFromMap(stored, CampaignId.CUSTOM, slot) : levelFromMap(this.stage.getMap(), '', 0);
		} catch {
			this.stage.stop();
			return;
		}
		this.stage.preview(level);
	}

	/**
	 * Save the editor map into a slot, or open the map of a slot in the editor, after the confirmation of the player if
	 * a map is lost. Then go back to the editor. The pick stops if the element hides or its mode changes before the
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
			if (stored != null && !(await askConfirmation(question, 'Save map'))) return;
		} else {
			return;
		}
		if (this.#leaving || this.getAttribute('mode') !== mode) return;

		if (mode === RouteName.LOAD) {
			this.stage.edit(editorMap(slot).get());
		} else {
			if (!saveEditorMap(slot, this.stage.getMap())) {
				showAlert(
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
	 * Tell if the editor files show on a screen of the app.
	 *
	 * @param {string} screen The screen, a value of Screen.
	 * @returns {boolean} True on the save and the load screen.
	 */
	shouldShow(screen) {
		return screen === Screen.SAVE || screen === Screen.LOAD;
	}
}
