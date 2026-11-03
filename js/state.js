/**
 * The shared state of the game.
 */

import { PLAYFIELD_X, PLAYFIELD_Y, Transition } from './constants.js';

/** @type {object} The state of the current level: the map, the player, the objects, the level time and the boss. */
export const game = {
	replay: undefined,
	replayMode: false,
	cakesLeft: undefined,
	steps: undefined,
	portalShots: undefined,
	background: undefined,
	/**
	 * @type {number} The x position of the playfield on the canvas: PLAYFIELD_X in a level, 0 in the level selection
	 *     and in the editor menus. The screen shake of the boss levels adds a few pixels.
	 */
	offsetX: PLAYFIELD_X,
	/** @type {number} The y position of the playfield on the canvas, PLAYFIELD_Y plus the screen shake of the boss levels. */
	offsetY: PLAYFIELD_Y,
	time: undefined,
	cakes: undefined,
	crates: undefined,
	tunnels: undefined,
	tunnelFields: undefined,
	platforms: undefined,
	turrets: undefined,
	sparkles: undefined,
	animatedTiles: undefined,
	projectiles: undefined,
	map: undefined,
	displayMap: undefined,
	oldMap: undefined,
	player: undefined,
	portals: undefined,
	plasmaBall: undefined,
	camera: undefined,
	robot: undefined,
	/** @type {boolean} True when the tiles changed, so the drawing must draw the tile layer again. */
	tilesChanged: undefined,
	needRedrawTiles: undefined,
	tubeX: undefined,
	tubeY: undefined,
	plasmaX: undefined,
	plasmaY: undefined,
	bossX: undefined,
	bossY: undefined,
	bossNum: 0,
	bossLife: undefined,
	bossIsComing: undefined,
	bossComingTime: undefined,
	bossIsTalking: undefined,
	rumbleTime: undefined,
};

/** @type {object} The state of the menus, the intermission screen, the level texts and the tutorial. */
export const ui = {
	currentMenu: undefined,
	selectMenu: 0,
	previewMap: 0,
	campaign: 0,
	menuButton: 0,
	currentLevel: 1,
	escapeMenu: undefined,
	goMenu: undefined,
	fadeMenu: undefined,
	drawIntermission: false,
	intermissionChoice: undefined,
	intermissionHover: -1,
	/** @type {number} The hovered button of the pause menu, a value of PauseButton, or -1. */
	pauseHover: -1,
	/** @type {number} The hovered button of the main menu, a value of MainButton, or -1. */
	mainHover: -1,
	/** @type {boolean} True while the mouse is over the sound icon of the main menu. */
	soundHover: false,
	/** @type {number} The hovered button of the level selection, a value of SelectionButton, or -1. */
	selectionHover: -1,
	/** @type {number} The hovered level in the list of the level selection, or -1. */
	selectionListHover: -1,
	/** @type {{time: number, alpha: number, speed: number}} The scroll position, the fade and the scroll speed of the credits. */
	credits: { time: 0, alpha: 0, speed: 0.4 },
	/** @type {boolean} True while the mouse is over the link of the loading screen that turns the sound off. */
	loadingHover: false,
	/**
	 * @type {object} The animation of the splash screen: the fade from 0 to 60, the ticks since the start, and the
	 *     positions and the speeds of the title and of the two names. over becomes true at its end.
	 */
	splash: {
		over: false,
		fade: 0,
		time: 0,
		titleY: -50,
		titleVY: 0,
		tailsY: -100,
		tailsVY: 0,
		blackosY: -100,
		blackosVY: 0,
	},
	highscoreMessage: undefined,
	drawCredits: false,
	timeWriting: 0,
	txtLines: undefined,
	tutoJump: false,
	tutoPortal: false,
	tutoPause: false,
	portalsDisplayed: false,
	tutoEnded: false,
	/** @type {number} The transition effect of the level end, chosen at random. */
	transition: Transition.HORIZONTAL_LINES,
	/** @type {boolean} True when the images and the font of the splash screen are loaded. */
	canSplash: false,
	/** @type {boolean} True while the player tests the map in the editor. */
	isTestingLevel: false,
};

/** @type {object} The keys and the mouse, and the input state that the game derives from them. */
export const input = {
	keys: 0,
	oldKeys: 0,
	mouseX: 0,
	mouseY: 0,
	mousePressed: 0,
	mouseReleased: 0,
	mouseButton: 0,
	mouseNewPress: 0,
	leftReleased: undefined,
	rightReleased: undefined,
	replayPauseInput: null,
	lastTickInGame: false,
};
