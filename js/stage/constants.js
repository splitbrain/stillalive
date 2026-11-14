/**
 * Constants of the game and the page.
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

/**
 * @typedef {object} DirectionInfo
 * @property {number} dx The horizontal unit step towards the direction: -1, 0 or 1.
 * @property {number} dy The vertical unit step towards the direction: -1, 0 or 1.
 * @property {number} opposite The opposite direction, a value of Direction.
 * @property {boolean} horizontal True for LEFT and RIGHT. A portal with a horizontal direction is on a side wall.
 */

/** @type {Object<number, DirectionInfo>} The step, the opposite and the orientation of each direction. */
export const DIRECTIONS = {
	[Direction.UP]: { dx: 0, dy: -1, opposite: Direction.DOWN, horizontal: false },
	[Direction.DOWN]: { dx: 0, dy: 1, opposite: Direction.UP, horizontal: false },
	[Direction.LEFT]: { dx: -1, dy: 0, opposite: Direction.RIGHT, horizontal: true },
	[Direction.RIGHT]: { dx: 1, dy: 0, opposite: Direction.LEFT, horizontal: true },
};

/** @type {Object<string, number>} The mouse buttons, as values of input.mouseButton. */
export const MouseButton = {
	LEFT: 0,
	RIGHT: 1,
	MIDDLE: 2,
};

/** @type {number} The downward acceleration in 1/256 pixels per tick squared. */
export const GRAVITY = 60;
/**
 * @type {number} The length of the death fade. A dead player counts the life from -DEATH_FADE up to 0, and the
 *     playfield fades to black on the way.
 */
export const DEATH_FADE = 256;
/** @type {number} The speed of a conveyor belt in 1/256 pixels per tick. */
export const BELT_SPEED = 384;
/** @type {number} The speed of a pipe field in 1/256 pixels per tick. */
export const PIPE_SPEED = 384;

/** @type {Object<string, number>} What an object stands on, the result of Body.touchingGround(). */
export const Ground = {
	AIR: 0,
	FLOOR: 1,
	ICE: 2,
	BELT_RIGHT: 3,
	BELT_LEFT: 4,
};
/** @type {number} The number of tiles in the tile set. */
export const NUM_TILES = 61;

/** @type {number} The size of a tile in pixels as a power of two, for shifts between pixels and tiles. */
export const TILE_SIZE_BITS = 4;
/** @type {number} The width and the height of a tile in pixels. */
export const TILE_SIZE = 1 << TILE_SIZE_BITS;
/** @type {number} The width of a map as a power of two, for shifts between map rows and map indexes. */
export const MAP_WIDTH_BITS = 5;
/** @type {number} The width of a map in tiles. */
export const MAP_WIDTH = 1 << MAP_WIDTH_BITS;
/** @type {number} The height of a map in tiles. */
export const MAP_HEIGHT = 24;
/** @type {number} The number of tiles of a map. */
export const MAP_SIZE = MAP_WIDTH * MAP_HEIGHT;
/** @type {number} The width of the playfield in pixels. */
export const PLAYFIELD_WIDTH = MAP_WIDTH * TILE_SIZE;
/** @type {number} The height of the playfield in pixels. */
export const PLAYFIELD_HEIGHT = MAP_HEIGHT * TILE_SIZE;
/** @type {number} The number of level backgrounds. A map selects one by its index. */
export const BACKGROUND_COUNT = 11;

/** @type {Object<string, number>} The campaigns and their index in the campaigns list. */
export const CampaignId = {
	NORMAL: 0,
	ADVANCED: 1,
	COMMUNITY: 2,
	TUTORIAL: 3,
	STORY: 4,
	TEST: 5,
	CUSTOM: 6,
};

/**
 * @type {string[]} The folder names of the campaigns in the maps folder, by campaign id. The custom campaign has no
 *     folder. Its levels are the editor maps in the slots.
 */
export const CAMPAIGN_FOLDERS = ['normal', 'advanced', 'community', 'tutorial', 'story', 'test', 'custom'];

/**
 * @type {number} The start value of the fade of a level transition. The fade counts down to 0 by FADE_STEP per tick.
 */
export const FADE_START = 120;
/** @type {number} The part of the fade that a level transition takes per tick. */
export const FADE_STEP = 4;
/** @type {Object<string, number>} The effects of the transitions at the end and the start of a level. */
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
