/**
 * Constants of the game: key bits, directions, tile animation types, mouse buttons and physics values.
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
/** @type {number} The width of the screen in screen units. */
export const SCREEN_WIDTH = 640;
/** @type {number} The height of the screen in screen units. */
export const SCREEN_HEIGHT = 544;
/** @type {number} The width of the playfield in pixels. */
export const PLAYFIELD_WIDTH = MAP_WIDTH * 16;
/** @type {number} The height of the playfield in pixels. */
export const PLAYFIELD_HEIGHT = MAP_HEIGHT * 16;
/** @type {number} The x position of the playfield on the canvas in a level. */
export const PLAYFIELD_X = 64;
/** @type {number} The y position of the playfield on the canvas. */
export const PLAYFIELD_Y = 96;

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

/** @type {Object<string, number>} The screens of the game, the value of ui.currentMenu. */
export const Menu = {
	LOADING: 0,
	MAIN: 1,
	PLAY: 2,
	EDITOR: 3,
	TUTORIAL: 6,
};

/** @type {Object<string, number>} The campaigns, their index in the campaigns list and the value of ui.campaign. */
export const CampaignId = {
	NORMAL: 0,
	ADVANCED: 1,
	COMMUNITY: 2,
	TUTORIAL: 3,
	STORY: 4,
};

/** @type {string[]} The folder names of the campaigns in the maps folder, by campaign id. */
export const CAMPAIGN_FOLDERS = ['normal', 'advanced', 'community', 'tutorial', 'story'];

/** @type {Object<string, number>} The buttons of the main menu from top to bottom, the value of ui.menuButton. */
export const MainButton = {
	CLASSIC: 0,
	ENHANCED: 1,
	ULTIMATE: 2,
	EDITOR: 3,
	TUTORIAL: 4,
};

/** @type {Object<string, number>} The transition effects at the end and the start of a level, the value of ui.transition. */
export const Transition = {
	TOP_LEFT: 1,
	LEFT_TO_RIGHT: 2,
	TOP_TO_BOTTOM: 3,
	HORIZONTAL_LINES: 4,
	VERTICAL_LINES: 5,
	SQUARE: 6,
};

/** @type {Object<string, number>} The buttons of the pause menu. */
export const PauseButton = {
	RESUME: 1,
	RESTART: 2,
	EXIT: 3,
	SOUND: 4,
};

/** @type {Object<string, number>} The buttons of the intermission screen, the value of ui.intermissionChoice. */
export const IntermissionButton = {
	NONE: 0,
	EXIT: 1,
	RESTART: 2,
	CONTINUE: 3,
	REPLAY: 4,
};

/** @type {Object<string, number>} The buttons of the level selection. */
export const SelectionButton = {
	PLAY: 1,
	EXIT: 2,
	MODE: 3,
};

/** @type {number[]} The tile ids of the tile palette of the editor, in the order of the palette. */
export const EDITOR_TILES = [0, 1, 17, 18, 19, 20, 21, 22, 23, 29, 36, 38, 40, 46, 47, 49, 55, 57];

/** @type {Object<string, number>} The buttons of the level editor. */
export const EditorButton = {
	LOAD: 1,
	SAVE: 2,
	EXIT: 3,
	CLEAR: 4,
	TRY: 5,
	HELP: 6,
};

/** @type {Object<string, number>} The buttons of the save and load screens of the editor. */
export const EditorMenuButton = {
	ACCEPT: 1,
	EXIT: 2,
	EXPORT: 3,
	IMPORT: 4,
};

/** @type {number} The number of levels of a campaign. */
export const LEVELS_PER_CAMPAIGN = 28;

/** @type {number} The value of the highest unlocked level after the player finished the last level of a campaign. */
export const CAMPAIGN_FINISHED = LEVELS_PER_CAMPAIGN + 1;

/** @type {number} The level number of the end screen of the tutorial, after its last level. */
export const TUTORIAL_END_LEVEL = 9;

/** @type {Object<number, number>} The campaign that each campaign button of the main menu opens. */
export const BUTTON_CAMPAIGN = {
	[MainButton.CLASSIC]: CampaignId.NORMAL,
	[MainButton.ENHANCED]: CampaignId.COMMUNITY,
	[MainButton.ULTIMATE]: CampaignId.STORY,
};
