/**
 * Constants of the game: key bits, directions, tile animation types, mouse buttons and physics values.
 */

export const KEY_Z = 1;
/** @type {number} Key bit for left. */
export const KEY_Q = 2;
/** @type {number} Key bit for right. */
export const KEY_D = 4;
/** @type {number} Key bit for clear portals. */
export const KEY_E = 8;
/** @type {number} Key bit for down. */
export const KEY_S = 16;
/** @type {number} Key bit for the left mouse button. */
export const MSE_L = 32;
/** @type {number} Key bit for the right mouse button. */
export const MSE_R = 64;
/** @type {number} Key bit for the middle mouse button. */
export const MSE_M = 128;
/** @type {number} The direction up, or the top side of an object. */
export const HAUT = 0;
/** @type {number} The direction down, or the bottom side of an object. */
export const BAS = 1;
/** @type {number} The direction left, or the left side of an object. */
export const GAUCHE = 2;
/** @type {number} The direction right, or the right side of an object. */
export const DROITE = 3;
/** @type {number} Tile animation type: the frames come in random order. */
export const RANDOM = 1;
/** @type {number} Tile animation type: the frames come in sequence. */
export const ORDERED = 2;
/** @type {number} The left mouse button. */
export const LEFT = 0;
/** @type {number} The right mouse button. */
export const RIGHT = 1;
/** @type {number} The middle mouse button. */
export const MIDDLE = 2;
/** @type {number} The downward acceleration in 1/256 pixels per tick squared. */
export const GRAVITY = 60;
/** @type {number} The number of tiles in the tile set. */
export const NUM_TILES = 61;

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

/** @type {Object<string, number>} The buttons of the main menu from top to bottom, the value of ui.menuButton. */
export const MainButton = {
	CLASSIC: 0,
	ENHANCED: 1,
	ULTIMATE: 2,
	EDITOR: 3,
	TUTORIAL: 4,
};

/** @type {Object<string, number>} The transition effects at the end and the start of a level, the value of TRANS. */
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
	QUALITY: 4,
	SOUND: 5,
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

/** @type {Object<number, number>} The campaign that each campaign button of the main menu opens. */
export const BUTTON_CAMPAIGN = {
	[MainButton.CLASSIC]: CampaignId.NORMAL,
	[MainButton.ENHANCED]: CampaignId.COMMUNITY,
	[MainButton.ULTIMATE]: CampaignId.STORY,
};
