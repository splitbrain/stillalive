/**
 * Constants of the game: key bits, directions, tile animation types, mouse buttons and physics values.
 */

export const KEY_Z = 1;
export const KEY_Q = 2;
export const KEY_D = 4;
export const KEY_E = 8;
export const KEY_S = 16;
export const MSE_L = 32;
export const MSE_R = 64;
export const MSE_M = 128;
export const HAUT = 0;
export const BAS = 1;
export const GAUCHE = 2;
export const DROITE = 3;
export const RANDOM = 1;
export const ORDERED = 2;
export const LEFT = 0;
export const RIGHT = 1;
export const MIDDLE = 2;
export const GRAVITY = 60;
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

/** @type {number} The number of levels of a campaign. */
export const LEVELS_PER_CAMPAIGN = 28;

/** @type {Object<number, number>} The campaign that each campaign button of the main menu opens. */
export const BUTTON_CAMPAIGN = {
	[MainButton.CLASSIC]: CampaignId.NORMAL,
	[MainButton.ENHANCED]: CampaignId.COMMUNITY,
	[MainButton.ULTIMATE]: CampaignId.STORY,
};
