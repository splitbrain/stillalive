/**
 * The editor palette element.
 */

import { route } from '../../router.js';
import { Tile } from '../../stage/tiles.js';
import { ChromeScreen, loadMarkup, Screen } from '../element.js';
import { confirmShown } from './ConfirmScreen.js';

/** @type {HTMLTemplateElement|null} The markup of the editor palette. */
const TEMPLATE = await loadMarkup(import.meta.url);

/**
 * An item of the tray: a tile or an object of the editor.
 *
 * @typedef {object} PaletteItem
 * @property {number} tile The tile id or the object id, the brush that the item sets.
 * @property {string} title The tooltip of the item.
 * @property {string} [sprite] The class of the sprite of an object. A tile has no sprite and shows its tile image.
 * @property {string} [arrow] The arrow on a platform that shows its direction.
 */

/**
 * The bins of the tray, grouped by function: level, walls, switch, plasma, hazards and movement. Each bin is a list of
 * rows, and the items of a row wrap when the bin is too narrow for them.
 *
 * @type {PaletteItem[][][]}
 */
const BINS = [
	[
		[
			{ tile: Tile.PLAYER_START, sprite: 'player', title: 'Player start' },
			{ tile: Tile.EMPTY, title: 'Eraser: removes the tile' },
			{ tile: Tile.EXIT, title: 'Exit: opens when all cakes are eaten' },
			{ tile: Tile.CAKE, sprite: 'cake', title: 'Cake' },
		],
	],
	[
		[
			{ tile: Tile.WALL, title: 'Wall: solid, takes portals' },
			{ tile: Tile.STRIPES, title: 'Warning stripes: solid, takes no portals' },
			{ tile: Tile.STRIPES_MIRRORED, title: 'Warning stripes: solid, takes no portals' },
			{ tile: Tile.ICYWALL, title: 'Icy wall: reflects portal shots, slippery to walk on' },
			{ tile: Tile.ENERGYWALL, title: 'Red energy wall: solid, portal shots go through it' },
			{
				tile: Tile.FORCE_FIELD,
				title: 'Force field: removes the portals when the player goes through, destroys crates',
			},
		],
	],
	[
		[
			{ tile: Tile.SWITCH, title: 'Switch: opens the switch doors while the player or a crate stands on it' },
			{ tile: Tile.SWITCH_DOOR, title: 'Switch door: solid, opens while a switch is pressed' },
			{ tile: Tile.CRATE, sprite: 'crate', title: 'Crate' },
		],
	],
	[
		[
			{
				tile: Tile.PLASMA_START,
				title: 'Plasma emitter: shoots a plasma ball away from the walls around it, one per level',
			},
			{ tile: Tile.PLASMA_SLOT, title: 'Plasma receiver: opens the plasma doors when a plasma ball hits it' },
			{ tile: Tile.PLASMA_DOOR, title: 'Plasma door: solid, opens when a plasma ball hits the receiver' },
		],
	],
	[
		[
			{ tile: Tile.WHEEL, title: 'Razor wheel: kills the player and destroys objects, portal shots go through it' },
			{ tile: Tile.ACID, title: 'Acid surface: kills the player and destroys objects, sends plasma balls back' },
			{
				tile: Tile.ACIDPOOL,
				title: 'Acid pool: goes below the acid surface, kills the player and destroys objects, sends plasma balls back',
			},
		],
		[
			{ tile: Tile.TURRET_LEFT, sprite: 'turret-left', title: 'Turret, facing left' },
			{ tile: Tile.TURRET_RIGHT, sprite: 'turret-right', title: 'Turret, facing right' },
		],
	],
	[
		[
			{ tile: Tile.PLATFORM_RIGHT, sprite: 'platform', arrow: '▶', title: 'Platform, moving right' },
			{ tile: Tile.BELT_RIGHT, title: 'Conveyor belt: moves the player and objects to the right' },
			{
				tile: Tile.GRAVPIPE_RIGHT,
				sprite: 'gravpipe-right',
				title: 'Gravitational pipe: carries the player and objects to the right',
			},
			{ tile: Tile.PLATFORM_LEFT, sprite: 'platform', arrow: '◀', title: 'Platform, moving left' },
			{ tile: Tile.BELT_LEFT, title: 'Conveyor belt: moves the player and objects to the left' },
			{
				tile: Tile.GRAVPIPE_LEFT,
				sprite: 'gravpipe-left',
				title: 'Gravitational pipe: carries the player and objects to the left',
			},
			{ tile: Tile.GRAVPIPE_UP, sprite: 'gravpipe-up', title: 'Gravitational pipe: carries the player and objects up' },
			{
				tile: Tile.GRAVPIPE_DOWN,
				sprite: 'gravpipe-down',
				title: 'Gravitational pipe: carries the player and objects down',
			},
		],
	],
];

/**
 * Make the button of an item of the tray.
 *
 * @param {PaletteItem} item The item.
 * @returns {HTMLButtonElement} The button, with the tile id in its data-tile attribute.
 */
function createButton(item) {
	const button = document.createElement('button');
	button.dataset.tile = String(item.tile);
	button.title = item.title;
	if (item.sprite) {
		const sprite = document.createElement('span');
		sprite.className = `sprite ${item.sprite}`;
		button.append(sprite);
	} else {
		const image = document.createElement('img');
		image.src = `gfx/tiles/tile_${item.tile}.svg`;
		image.alt = '';
		button.append(image);
	}
	if (item.arrow) {
		const arrow = document.createElement('span');
		arrow.className = 'arrow';
		arrow.textContent = item.arrow;
		button.append(arrow);
	}
	return button;
}

/**
 * The custom element <editor-palette>. It shows a parts tray with a button for each tile and each object of the
 * editor, grouped by function, and a panel with the buttons that change the background, on the editor screen and on
 * the save and load screen. On the save and load screen and while the confirmation screen shows a question, the
 * palette is inert and gray.
 *
 * A click on an item button, with the tile id or the object id in its data-tile attribute, makes its tile or object
 * the brush of the stage. The button of the brush has the class selected. A click on a background button changes the
 * background of the stage to the previous or the next one, by the step of the button, -1 or 1, in its data-bg
 * attribute.
 */
export class EditorPalette extends ChromeScreen {
	/** @type {HTMLTemplateElement|null} The markup of the editor palette. */
	static template = TEMPLATE;

	/**
	 * Fill the tray with the bins and their items, and add the click handler of the buttons.
	 *
	 * @returns {void}
	 */
	setUp() {
		const tray = this.querySelector('.tray');
		for (const rows of BINS) {
			const bin = document.createElement('div');
			bin.className = 'bin';
			for (const items of rows) {
				const row = document.createElement('div');
				row.className = 'row';
				row.append(...items.map(createButton));
				bin.append(row);
			}
			tray.append(bin);
		}
		this.addEventListener('click', (event) => {
			const button = event.target.closest('button');
			const stage = this.stage;
			if (button?.dataset.tile) stage.setBrush(Number(button.dataset.tile));
			else if (button?.dataset.bg) stage.setBackground(stage.getMap().bg + Number(button.dataset.bg));
		});
	}

	/**
	 * Subscribe to the brush of the stage, and to the route and the confirmation screen to disable the palette.
	 *
	 * @returns {Array<function(): void>} The functions that remove the subscriptions.
	 */
	subscribe() {
		const lock = () => {
			this.inert = route.get().name == 'editor-file' || confirmShown.get();
		};
		return [this.stage.brush.subscribe(() => this.render()), route.subscribe(lock), confirmShown.subscribe(lock)];
	}

	/**
	 * Mark the button of the tile or object that is the brush of the stage.
	 *
	 * @returns {void}
	 */
	render() {
		const brush = this.stage.brush.get();
		for (const button of this.querySelectorAll('button[data-tile]')) {
			button.classList.toggle('selected', Number(button.dataset.tile) === brush);
		}
	}

	/**
	 * Tell if the editor palette shows on a screen of the app.
	 *
	 * @param {string} screen The screen, a value of Screen.
	 * @returns {boolean} True on the editor screen and on the save and load screen.
	 */
	shouldShow(screen) {
		return screen === Screen.EDITOR || screen === Screen.EDITOR_FILE;
	}
}
