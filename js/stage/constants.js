/**
 * Constants of the game: key bits, directions, tile animation types, mouse buttons, physics values, the map and
 * playfield sizes, the sparkle types and the transitions. Also the campaign ids, the campaign folders, the number of
 * levels and the tiles of the editor palette, which the page uses.
 */

/** @type {number} Key bit for the jump key. */
export const KEY_JUMP = 1;
/** @type {number} Key bit for the left key. */
export const KEY_LEFT = 2;
/** @type {number} Key bit for the right key. */
export const KEY_RIGHT = 4;
/** @type {number} Key bit for the clear portals key. */
export const KEY_CLEAR = 8;
/** @type {number} Key bit for the down key. */
export const KEY_DOWN = 16;
/** @type {number} Key bit for the left mouse button. */
export const MOUSE_LEFT = 32;
/** @type {number} Key bit for the right mouse button. */
export const MOUSE_RIGHT = 64;
/** @type {number} Key bit for the middle mouse button. */
export const MOUSE_MIDDLE = 128;
/** @type {number} Tile animation type: the frames come in random order. */
export const RANDOM = 1;
/** @type {number} Tile animation type: the frames come in sequence. */
export const ORDERED = 2;
/** @type {Object<string, number>} The directions, also the sides of an object. */
export const Direction = {
	UP: 0,
	DOWN: 1,
	LEFT: 2,
	RIGHT: 3,
};

/** @type {Object<string, number>} The mouse buttons, the value of input.mouseButton. */
export const MouseButton = {
	LEFT: 0,
	RIGHT: 1,
	MIDDLE: 2,
};

/** @type {number} The downward acceleration in 1/256 pixels per tick squared. */
export const GRAVITY = 60;
/** @type {number} The number of tiles in the tile set. */
export const NUM_TILES = 61;

/** @type {number} The width of a map in tiles. */
export const MAP_WIDTH = 32;
/** @type {number} The height of a map in tiles. */
export const MAP_HEIGHT = 24;
/** @type {number} The number of tiles of a map. */
export const MAP_SIZE = MAP_WIDTH * MAP_HEIGHT;
/** @type {number} The width of the playfield in pixels. */
export const PLAYFIELD_WIDTH = MAP_WIDTH * 16;
/** @type {number} The height of the playfield in pixels. */
export const PLAYFIELD_HEIGHT = MAP_HEIGHT * 16;

/** @type {Object<string, number>} The types of the sparkles, which select their movement, their fade and their size. */
export const SparkleType = {
	PORTAL_SHOT: 1,
	PORTAL_GLOW: 3,
	TELEPORT: 4,
	SHOT_HIT: 5,
	DEATH: 6,
	LOW_LIFE: 7,
	CAKE: 8,
	SMOKE: 9,
};

/** @type {Object<string, number>} The campaigns and their index in the campaigns list. */
export const CampaignId = {
	NORMAL: 0,
	ADVANCED: 1,
	COMMUNITY: 2,
	STORY: 4,
};

/** @type {string[]} The folder names of the campaigns in the maps folder, by campaign id. */
export const CAMPAIGN_FOLDERS = ['normal', 'advanced', 'community', 'tutorial', 'story'];

/** @type {Object<string, number>} The transition effects at the end and the start of a level, the value of ui.transition. */
export const Transition = {
	TOP_LEFT: 1,
	LEFT_TO_RIGHT: 2,
	TOP_TO_BOTTOM: 3,
	HORIZONTAL_LINES: 4,
	VERTICAL_LINES: 5,
	SQUARE: 6,
};

/** @type {number[]} The tile ids of the tile palette of the editor, in the order of the palette. */
export const EDITOR_TILES = [0, 1, 17, 18, 19, 20, 21, 22, 23, 29, 36, 38, 40, 46, 47, 49, 55, 57];

/** @type {Object<number, string>} The titles of the tiles of the tile palette of the editor, by tile id. */
export const EDITOR_TILE_TITLES = {
	0: 'Eraser: removes the tile',
	1: 'Wall: solid, takes portals',
	17: 'Warning stripes: solid, takes no portals',
	18: 'Warning stripes: solid, takes no portals',
	19: 'Switch: opens the switch doors while the player or a crate stands on it',
	20: 'Plasma emitter: shoots a plasma ball away from the walls around it, one per level',
	21: 'Plasma receiver: opens the plasma doors when a plasma ball hits it',
	22: 'Exit: opens when all cakes are eaten',
	23: 'Switch door: solid, opens while a switch is pressed',
	29: 'Plasma door: solid, opens when a plasma ball hits the receiver',
	36: 'Razor wheel: kills the player and destroys objects, portal shots go through it',
	38: 'Acid surface: kills the player and destroys objects, sends plasma balls back',
	40: 'Red energy wall: solid, portal shots go through it',
	46: 'Icy wall: reflects portal shots, slippery to walk on',
	47: 'Acid pool: goes below the acid surface, kills the player and destroys objects, sends plasma balls back',
	49: 'Force field: removes the portals when the player goes through, destroys crates',
	55: 'Conveyor belt: moves the player and objects to the right',
	57: 'Conveyor belt: moves the player and objects to the left',
};

/** @type {number} The number of levels of a campaign. */
export const LEVELS_PER_CAMPAIGN = 28;

/** @type {number} The value of the highest unlocked level after the player finished the last level of a campaign. */
export const CAMPAIGN_FINISHED = LEVELS_PER_CAMPAIGN + 1;
