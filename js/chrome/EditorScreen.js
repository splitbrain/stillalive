/**
 * The elements of the level editor: the editor screen, the tile palette, the object palette, the editor buttons, the
 * list of the slots and the buttons of the save and load screen.
 */

import { navigate } from '../router.js';
import { EDITOR_TILE_TITLES, EDITOR_TILES, LEVELS_PER_CAMPAIGN } from '../stage/constants.js';
import { MAP_FORMAT, parseMap } from '../stage/mapFile.js';
import { alertDialog } from './dialog.js';
import { setAttributes } from './dom.js';
import { downloadJson, pickJsonFile } from './files.js';
import { editorMap, saveEditorMap } from './storage.js';

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
 * Dispatch a bubbling event from an element.
 *
 * @param {HTMLElement} element The element.
 * @param {string} type The event type.
 * @param {object} [detail] The detail of the event.
 * @returns {void}
 */
function dispatch(element, type, detail = {}) {
	element.dispatchEvent(new CustomEvent(type, { bubbles: true, detail }));
}

/**
 * The custom element <editor-screen>. It is the frame of the editor and of its save and load screen. Its markup in the
 * page has the tile palette, the object palette, the editor buttons, the list of the slots and the buttons of the save
 * and load screen.
 *
 * The attribute mode is empty for the editor, and save or load for the save or load screen. The app element sets it on
 * the editor routes and removes it on the other routes. The editor shows the palettes and the editor buttons, the save
 * and load screen shows the slots and its buttons. The element marks the brush of the stage in the palettes.
 *
 * The element handles the events of its parts: it sets the brush and the background of the stage, clears the editor
 * map, starts the test run and shows the help. On the save and load screen, a selected slot shows its map on the stage
 * as a preview, while the stage keeps the editor map. The accept button saves the editor map into the slot or opens the
 * map of the slot in the editor, and the import opens a map file in the editor. Then the element goes back to the
 * editor: back in the history if the player came from the editor, else to the editor route in place of the current
 * entry. So after an accept or an import the history holds the editor route only once.
 */
export class EditorScreen extends HTMLElement {
	/** @type {string[]} The attributes that cause a new render when they change. */
	static observedAttributes = ['mode'];

	/** @type {import('../stage/GameStage.js').GameStage} The stage element. */
	#stage;

	/** @type {number} The selected slot of the save or load screen, or 0 for none. */
	#slot = 0;

	/** @type {boolean} True if the save or load screen was opened from the editor. */
	#fromEditor = false;

	/** @type {Array<function(): void>} The functions that remove the subscriptions. */
	#unsubscribe = [];

	/** @type {boolean} True after the first connect, which adds the event handlers. */
	#setUp = false;

	/**
	 * Subscribe to the brush of the stage. On the first connect, add the handlers of the events of the parts.
	 *
	 * @returns {void}
	 */
	connectedCallback() {
		this.#stage = document.querySelector('game-stage');
		if (!this.#setUp) {
			this.#setUp = true;
			const onImportError = (error) => alertDialog(error.message, 'Import map');
			this.addEventListener('brush-select', (event) => this.#stage.setBrush(event.detail.tile));
			this.addEventListener('background-change', (event) =>
				this.#stage.setBackground(this.#stage.getMap().bg + event.detail.step),
			);
			this.addEventListener('map-clear', () => this.#stage.clearMap());
			this.addEventListener('map-test', () => this.#stage.test());
			this.addEventListener('help-show', () => alertDialog(EDITOR_HELP, 'Level Editor Shortcuts'));
			this.addEventListener('slot-select', (event) => this.#selectSlot(event.detail.slot));
			this.addEventListener('file-accept', () => this.#accept());
			this.addEventListener('file-export', () => this.#export());
			this.addEventListener('file-import', () => this.#import().catch(onImportError));
		}
		this.#unsubscribe = [
			this.#stage.brush.subscribe((brush) => {
				for (const palette of this.querySelectorAll('tile-palette, object-palette')) {
					palette.setAttribute('selected', String(brush));
				}
			}),
		];
	}

	/**
	 * Remove the subscriptions.
	 *
	 * @returns {void}
	 */
	disconnectedCallback() {
		for (const unsubscribe of this.#unsubscribe) unsubscribe();
		this.#unsubscribe = [];
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
		this.render();
	}

	/**
	 * Show the parts of the mode and set the attributes of the slots and of the buttons of the save and load screen.
	 *
	 * @returns {void}
	 */
	render() {
		const mode = this.getAttribute('mode');
		const file = mode == 'save' || mode == 'load';
		for (const part of this.querySelectorAll('tile-palette, object-palette, editor-buttons')) part.hidden = file;
		for (const part of this.querySelectorAll('slot-list, editor-file-buttons')) {
			part.hidden = !file;
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
		if (stored) this.#stage.preview(stored);
		else this.#stage.stop();
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
			this.#stage.edit(editorMap(this.#slot).get());
		} else {
			const map = this.#stage.getMap();
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
		const map = this.getAttribute('mode') == 'save' ? this.#stage.getMap() : editorMap(this.#slot).get();
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
		this.#stage.edit(map);
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
}

/**
 * The custom element <tile-palette>. It shows a button for each tile of the editor, made from the button in its
 * template. Each button shows the image of its tile.
 *
 * The attribute selected is the tile id or the object id that the editor paints. Its button has the class selected. A
 * click on a button dispatches the bubbling event brush-select with the tile id as detail.tile.
 */
export class TilePalette extends HTMLElement {
	/** @type {string[]} The attributes that cause a new render when they change. */
	static observedAttributes = ['selected'];

	/** @type {HTMLTemplateElement|null} The template of a tile button, kept when the element replaces its children. */
	#template = null;

	/** @type {boolean} True after the first connect, which adds the click handler. */
	#setUp = false;

	/**
	 * On the first connect, add the click handler and build the buttons.
	 *
	 * @returns {void}
	 */
	connectedCallback() {
		if (this.#setUp) return;
		this.#setUp = true;
		this.addEventListener('click', (event) => {
			const button = event.target.closest('button[data-tile]');
			if (button) dispatch(this, 'brush-select', { tile: Number(button.dataset.tile) });
		});
		this.render();
	}

	/**
	 * Render the palette again after a change of an attribute.
	 *
	 * @returns {void}
	 */
	attributeChangedCallback() {
		this.render();
	}

	/**
	 * Build the tile buttons from the selected tile and replace the children with them.
	 *
	 * @returns {void}
	 */
	render() {
		this.#template ??= this.querySelector('template');
		const selected = Number(this.getAttribute('selected'));
		const buttons = EDITOR_TILES.map((tile) => {
			const button = this.#template.content.firstElementChild.cloneNode(true);
			button.dataset.tile = String(tile);
			button.title = EDITOR_TILE_TITLES[tile];
			button.querySelector('img').src = `tiles/tile_${tile}.svg`;
			button.classList.toggle('selected', this.hasAttribute('selected') && tile == selected);
			return button;
		});
		this.replaceChildren(this.#template, ...buttons);
	}
}

/**
 * The custom element <object-palette>. Its markup in the page has a button for each object of the editor and the
 * buttons that change the background.
 *
 * The attribute selected is the tile id or the object id that the editor paints. Its button has the class selected. A
 * click on an object button dispatches the bubbling event brush-select with the object id as detail.tile. A click on a
 * background button dispatches the bubbling event background-change with the change of the background index, -1 or 1,
 * as detail.step.
 */
export class ObjectPalette extends HTMLElement {
	/** @type {string[]} The attributes that cause a new render when they change. */
	static observedAttributes = ['selected'];

	/** @type {boolean} True after the first connect, which adds the click handler. */
	#setUp = false;

	/**
	 * On the first connect, add the click handler.
	 *
	 * @returns {void}
	 */
	connectedCallback() {
		if (this.#setUp) return;
		this.#setUp = true;
		this.addEventListener('click', (event) => {
			const button = event.target.closest('button');
			if (button?.dataset.sprite) dispatch(this, 'brush-select', { tile: Number(button.dataset.sprite) });
			else if (button?.dataset.bg) dispatch(this, 'background-change', { step: Number(button.dataset.bg) });
		});
	}

	/**
	 * Render the palette again after a change of an attribute.
	 *
	 * @returns {void}
	 */
	attributeChangedCallback() {
		this.render();
	}

	/**
	 * Mark the button of the selected object.
	 *
	 * @returns {void}
	 */
	render() {
		const selected = this.getAttribute('selected');
		for (const button of this.querySelectorAll('button[data-sprite]')) {
			button.classList.toggle('selected', Number(button.dataset.sprite) === Number(selected));
		}
	}
}

/**
 * The custom element <editor-buttons>. Its markup in the page has the Exit, Load and Save links and the Clear, Try Map
 * and Help buttons.
 *
 * A click on the Clear button dispatches the bubbling event map-clear, on the Try Map button map-test, and on the Help
 * button help-show. The name of each event is in the data-event attribute of its button.
 */
export class EditorButtons extends HTMLElement {
	/** @type {boolean} True after the first connect, which adds the click handler. */
	#setUp = false;

	/**
	 * On the first connect, add the click handler.
	 *
	 * @returns {void}
	 */
	connectedCallback() {
		if (this.#setUp) return;
		this.#setUp = true;
		this.addEventListener('click', (event) => {
			const button = event.target.closest('button[data-event]');
			if (button) dispatch(this, button.dataset.event);
		});
	}
}

/**
 * The custom element <slot-list>. It shows a button for each slot of the editor maps, made from the button in its
 * template.
 *
 * The attribute mode is save or load, and the attribute selected is the selected slot number, or 0 for none. A slot
 * with a stored map has the class stored. The load screen disables the empty slots. The selected slot has the class
 * selected. A click on a slot dispatches the bubbling event slot-select with the slot number as detail.slot.
 */
export class SlotList extends HTMLElement {
	/** @type {string[]} The attributes that cause a new render when they change. */
	static observedAttributes = ['mode', 'selected'];

	/** @type {HTMLTemplateElement|null} The template of a slot button, kept when the element replaces its children. */
	#template = null;

	/** @type {Array<function(): void>} The functions that remove the subscriptions. */
	#unsubscribe = [];

	/** @type {boolean} True after the first connect, which adds the click handler. */
	#setUp = false;

	/**
	 * Subscribe to the stored maps of the slots. On the first connect, add the click handler.
	 *
	 * @returns {void}
	 */
	connectedCallback() {
		if (!this.#setUp) {
			this.#setUp = true;
			this.addEventListener('click', (event) => {
				const button = event.target.closest('button[data-slot]');
				if (button) dispatch(this, 'slot-select', { slot: Number(button.dataset.slot) });
			});
		}
		this.#unsubscribe = [];
		for (let n = 1; n <= LEVELS_PER_CAMPAIGN; n++) {
			this.#unsubscribe.push(editorMap(n).subscribe(() => this.render()));
		}
	}

	/**
	 * Remove the subscriptions.
	 *
	 * @returns {void}
	 */
	disconnectedCallback() {
		for (const unsubscribe of this.#unsubscribe) unsubscribe();
		this.#unsubscribe = [];
	}

	/**
	 * Render the list again after a change of an attribute.
	 *
	 * @returns {void}
	 */
	attributeChangedCallback() {
		this.render();
	}

	/**
	 * Build the slot buttons from the attributes and the stored maps and replace the children with them.
	 *
	 * @returns {void}
	 */
	render() {
		this.#template ??= this.querySelector('template');
		const loading = this.getAttribute('mode') == 'load';
		const selected = Number(this.getAttribute('selected') ?? 0);
		const buttons = [];
		for (let n = 1; n <= LEVELS_PER_CAMPAIGN; n++) {
			const button = this.#template.content.firstElementChild.cloneNode();
			const stored = editorMap(n).get() != null;
			button.textContent = 'Slot ' + n;
			button.dataset.slot = String(n);
			button.classList.toggle('stored', stored);
			button.classList.toggle('selected', n == selected);
			button.disabled = loading && !stored;
			buttons.push(button);
		}
		this.replaceChildren(this.#template, ...buttons);
	}
}

/**
 * The custom element <editor-file-buttons>. Its markup in the page has the Exit link back to the editor and the Export,
 * Import and accept buttons.
 *
 * The attribute mode is save or load, and the attribute selected is the selected slot number, or 0 for none. The
 * accept button is labeled Save or Load by the mode and shows only with a selected slot. The Export button shows on
 * the save screen, and on the load screen with a selected slot. A click on the Export button dispatches the bubbling
 * event file-export, on the Import button file-import, and on the accept button file-accept. The name of each event is
 * in the data-event attribute of its button.
 */
export class EditorFileButtons extends HTMLElement {
	/** @type {string[]} The attributes that cause a new render when they change. */
	static observedAttributes = ['mode', 'selected'];

	/** @type {boolean} True after the first connect, which adds the click handler. */
	#setUp = false;

	/**
	 * On the first connect, add the click handler.
	 *
	 * @returns {void}
	 */
	connectedCallback() {
		if (this.#setUp) return;
		this.#setUp = true;
		this.addEventListener('click', (event) => {
			const button = event.target.closest('button[data-event]');
			if (button) dispatch(this, button.dataset.event);
		});
	}

	/**
	 * Render the buttons again after a change of an attribute.
	 *
	 * @returns {void}
	 */
	attributeChangedCallback() {
		this.render();
	}

	/**
	 * Show the buttons that apply and label the accept button.
	 *
	 * @returns {void}
	 */
	render() {
		const saving = this.getAttribute('mode') == 'save';
		const selected = Number(this.getAttribute('selected') ?? 0) > 0;
		const accept = this.querySelector('.accept');
		accept.textContent = saving ? 'Save' : 'Load';
		accept.hidden = !selected;
		this.querySelector('.export').hidden = !saving && !selected;
	}
}
