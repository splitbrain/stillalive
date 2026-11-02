/**
 * The shared state of the game.
 */

/** @type {object} The state of the current level: the map, the player, the objects, the level time and the boss. */
export const game = {
	replay: undefined,
	replayMode: false,
	CAKELEFT: undefined,
	STEPS: undefined,
	PORTALS: undefined,
	BG: undefined,
	offsetX: 64,
	offsetY: 96,
	TIME: undefined,
	cakes: undefined,
	crates: undefined,
	tunnels: undefined,
	forceFields: undefined,
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
	needLoad: undefined,
	needRedrawTiles: undefined,
	imgBuff: undefined,
	hudLight: undefined,
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
	highscoreMessage: undefined,
	drawCredits: false,
	timeWriting: 0,
	txtLines: undefined,
	tutoJump: false,
	tutoPortal: false,
	tutoPause: false,
	portalsDisplayed: false,
	tutoEnded: false,
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

/** @type {object} The settings of the player. */
export const settings = {
	quality: 1,
};
