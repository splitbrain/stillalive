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
	TEST: 5,
};

/** @type {string[]} The folder names of the campaigns in the maps folder, by campaign id. */
export const CAMPAIGN_FOLDERS = ['normal', 'advanced', 'community', 'tutorial', 'story', 'test'];

/** @type {Object<string, number>} The transition effects at the end and the start of a level, the value of ui.transition. */
export const Transition = {
	TOP_LEFT: 1,
	LEFT_TO_RIGHT: 2,
	TOP_TO_BOTTOM: 3,
	HORIZONTAL_LINES: 4,
	VERTICAL_LINES: 5,
	SQUARE: 6,
};

/** @type {number} The number of levels of a campaign. */
export const LEVELS_PER_CAMPAIGN = 28;
