/**
 * The temporary page around the stage.
 *
 * The module keeps the game playable with the HTML elements of the page until the chrome elements exist. It owns the
 * screens: the loading screen, the main menu, the level selection with the best times panel, the play screen with the
 * pause menu and the intermission screen, the editor with its save and load screen, and the credits. It commands the
 * stage through the methods of the stage element and shows the values of the stage. The page shows its parts by the
 * screen attribute of the game element and by the menu attribute of the overlay over the stage.
 */

import {
	CAMPAIGN_FINISHED,
	CampaignId,
	EDITOR_TILE_TITLES,
	EDITOR_TILES,
	KEY_CLEAR,
	KEY_DOWN,
	KEY_JUMP,
	KEY_LEFT,
	KEY_RIGHT,
	LEVELS_PER_CAMPAIGN,
	MAP_SIZE,
	MOUSE_LEFT,
	MOUSE_RIGHT,
} from '../stage/constants.js';
import { keyLabels } from '../stage/keys.js';
import { MAP_FORMAT, parseMap } from '../stage/mapFile.js';
import { decodeReplay } from '../stage/replay.js';
import {
	areCampaignsLoaded,
	campaigns,
	creditsTxt,
	levelsLoaded,
	levelsToLoad,
	loadCampaigns,
	loadCreditsText,
	missingLevelFiles,
} from './campaigns.js';
import { alertDialog } from '../dialog.js';
import { downloadJson, pickJsonFile } from '../files.js';
import {
	getBestTime,
	getCampaignTotal,
	getEditorMap,
	loadBestReplay,
	loadProgress,
	loadSoundSetting,
	maxLevel,
	saveBestTime,
	saveEditorMap,
	saveProgress,
	saveSoundSetting,
} from '../storage.js';

/** @type {string} The narrator text of the level selection. */
const SELECTION_TEXT =
	"Welcome to the campaign mode of StillAliveJS. Here you can select a map on the right and click 'Play' to play it. Good Luck !";

/** @type {string} The narrator text of the editor and of its save and load screen. */
const EDITOR_TEXT =
	'Welcome to the StillAliveJS Level Editor ! Here is a place where you can easily create your own maps. You can use your mouse to select tiles or object and draw them on the screen. Then, try out your map. Have Fun !';

/** @type {string} The narrator text of the test run of the editor map. */
const TEST_TEXT = 'Press <Enter> or <Escape> key to stop testing.';

/** @type {string} The text of the help dialog of the editor. */
const EDITOR_HELP =
	'Left click : Put tile or object\n' +
	'Right click : Remove tile or object\n' +
	'Middle click : Fill\n' +
	'ctrl + z : Undo\n' +
	'ctrl + y : Redo\n' +
	'Return : Try Map / Stop trying\n' +
	'Escape : Stop trying';

/** @type {Object<string, number>} The campaign that each campaign button of the main menu opens, by button id. */
const CAMPAIGN_BUTTONS = {
	'main-classic': CampaignId.NORMAL,
	'main-enhanced': CampaignId.COMMUNITY,
	'main-ultimate': CampaignId.STORY,
};

/** @type {Object<string, number>} The key bit of each key cap of the replay keys, by the name in the cap id. */
const KEY_CAPS = {
	KeyW: KEY_JUMP,
	KeyA: KEY_LEFT,
	KeyS: KEY_DOWN,
	KeyD: KEY_RIGHT,
	KeyE: KEY_CLEAR,
	left: MOUSE_LEFT,
	right: MOUSE_RIGHT,
};

/** @type {import('../stage/GameStage.js').GameStage} The stage element. */
let stage;

/** @type {string} The screen: loading, main, select, level, editor, editor-file or credits. */
let screen = 'loading';

/** @type {number} The index of the campaign of the level selection and of the level that runs. */
let campaignId = 0;

/** @type {number} The selected level of the level selection, or 0 for none. */
let selected = 0;

/** @type {number} The level number of the level that runs. */
let currentLevel = 1;

/** @type {boolean} True if the level started from the level selection, false if it started from the main menu. */
let fromSelection = false;

/** @type {object|null} The replay in the file format that the stage plays, or null while the player plays. */
let playReplay = null;

/** @type {{time: number, message: string, replay: object}|null} The intermission screen after a level, or null. */
let intermission = null;

/** @type {string} The mode of the save or load screen of the editor: "save" or "load". */
let editorFile = 'save';

/** @type {number} The selected slot of the save or load screen, or 0 for none. */
let slot = 0;

/** @type {boolean} True if a change of the sound is a change of the player and goes into the storage. */
let storeSound = false;

/**
 * Get an element of the page by its id.
 *
 * @param {string} id The id.
 * @returns {HTMLElement} The element.
 */
function el(id) {
	return document.getElementById(id);
}

/**
 * Show or hide an element.
 *
 * @param {HTMLElement} element The element.
 * @param {boolean} shown True to show the element.
 * @returns {void}
 */
function show(element, shown) {
	element.hidden = !shown;
}

/**
 * Format a level time.
 *
 * @param {number} time The time in ticks of 1/60 second.
 * @returns {string} The time as minutes, seconds and milliseconds, e.g. "01:05.500".
 */
export function toTime(time) {
	const total = Math.round((time * 1000) / 60);
	const m = Math.floor(total / 60000);
	const s = Math.floor(total / 1000) % 60;
	const ms = total % 1000;

	return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0') + '.' + String(ms).padStart(3, '0');
}

/**
 * Get the level of the current campaign.
 *
 * @param {number} number The level number, starting at 1.
 * @returns {import('../stage/level.js').Level} The level.
 */
function levelOf(number) {
	return campaigns[campaignId].levels[number - 1];
}

/**
 * Get the screen that the page shows. The test run of the editor shows the play screen.
 *
 * @returns {string} The name of the screen.
 */
function shownScreen() {
	if (screen == 'editor' && stage.mode.get() == 'test') return 'level';
	return screen;
}

/**
 * Show a screen.
 *
 * @param {string} name The name of the screen.
 * @returns {void}
 */
function showScreen(name) {
	screen = name;
	render();
}

/**
 * Update the parts of the page for the current screen.
 *
 * @returns {void}
 */
function render() {
	const name = shownScreen();
	el('game').dataset.screen = name;

	show(el('loading-screen'), name === 'loading');
	show(el('credits'), name === 'credits');
	show(el('robot'), name === 'level');
	show(el('speech'), name === 'level' || name === 'select' || name.startsWith('editor'));
	show(el('stats'), name === 'level');
	show(el('editor-tiles'), name === 'editor');
	show(el('editor-objects'), name === 'editor');
	show(el('side'), name === 'level' || name === 'select' || name === 'editor-file');
	show(el('level-list'), name === 'select');
	show(el('slot-list'), name === 'editor-file');
	show(el('highscores'), name === 'level' || name === 'select');
	el('highscores').classList.toggle('open', name === 'select' || (name === 'level' && fromSelection));
	show(el('keys'), name === 'level' && playReplay !== null);

	let menu = '';
	if (name === 'main') {
		menu = 'main';
		renderMainMenu();
	} else if (name === 'select') {
		menu = 'selection';
		renderSelection();
	} else if (name === 'editor') {
		menu = 'editor';
	} else if (name === 'editor-file') {
		menu = 'editor-file';
		renderEditorFile();
	} else if (name === 'level') {
		renderRobot();
		menu = renderLevelMenus();
	}
	el('overlay').dataset.menu = menu;
	renderNarrator();
	renderPanel();
}

/**
 * Show the narrator text of the current screen.
 *
 * @returns {void}
 */
function renderNarrator() {
	const name = shownScreen();
	let text = '';
	if (name === 'select') text = SELECTION_TEXT;
	else if (name.startsWith('editor')) text = EDITOR_TEXT;
	else if (name === 'level') text = stage.mode.get() == 'test' ? TEST_TEXT : (stage.message.get()?.text ?? '');
	el('narrator').textContent = text;
}

/**
 * Show the progress of the loading and the link that turns the sound off. When everything is loaded, a click on the
 * stage opens the main menu.
 *
 * @returns {void}
 */
function renderLoading() {
	const { images, sounds } = stage.loading.get();
	const percent = (share) => Math.trunc(share * 100) + '%';
	const lines = [
		'Loading gfx ... ' + percent(images.progress),
		'Loading maps ... ' + percent(levelsLoaded / levelsToLoad),
		'Loading sfx ... ' + percent(sounds.progress),
		'- Grab cakes and reach the exit of each level.',
		'- Use your portal gun to teleport through levels.',
	];
	if (images.missing.length > 0) lines.push('Some images could not be loaded: ' + images.missing.join(', '));
	if (sounds.missing.length > 0) lines.push('Some sounds could not be loaded: ' + sounds.missing.join(', '));
	if (missingLevelFiles.length > 0) lines.push('Some levels could not be loaded: ' + missingLevelFiles.join(', '));
	if (isLoaded()) lines.push('Click to continue ...');

	const paragraphs = lines.map((line) => Object.assign(document.createElement('p'), { textContent: line }));
	const soundOff = Object.assign(document.createElement('button'), { textContent: '(click here if not loading)' });
	soundOff.addEventListener('click', () => {
		// the link turns the sound off for this session only
		storeSound = false;
		stage.setSound(false);
		storeSound = true;
	});
	paragraphs[2].append(' ', soundOff);
	el('loading-screen').replaceChildren(...paragraphs);
}

/**
 * Check if the stage and the campaigns are loaded.
 *
 * @returns {boolean} True when the game can start.
 */
function isLoaded() {
	return stage.ready.get() && areCampaignsLoaded();
}

/**
 * Update the main menu: the label of the first campaign and the sound button.
 *
 * @returns {void}
 */
function renderMainMenu() {
	el('main-classic').textContent = 'Classic Mode' + (maxLevel[CampaignId.NORMAL] == CAMPAIGN_FINISHED ? ' +' : '');
	el('sound-button').classList.toggle('off', !stage.sound.get());
}

/**
 * Check if the level selection has the button that switches between the normal and the hard campaign.
 *
 * @returns {boolean} True when the button is there.
 */
function hasModeButton() {
	return (
		(campaignId == CampaignId.NORMAL && maxLevel[CampaignId.NORMAL] == CAMPAIGN_FINISHED) ||
		campaignId == CampaignId.ADVANCED
	);
}

/**
 * Update the level selection: the list of the levels and the buttons.
 *
 * @returns {void}
 */
function renderSelection() {
	for (const button of el('level-list').children) {
		const level = Number(button.dataset.level);
		button.disabled = level > maxLevel[campaignId];
		button.classList.toggle('selected', level == selected);
	}
	show(el('selection-play'), selected > 0);
	show(el('selection-mode'), hasModeButton());
	el('selection-mode').textContent = campaignId == CampaignId.NORMAL ? 'Hard Mode' : 'Normal Mode';
}

/**
 * Show the robot head with the eye of the boss of the current story level. The robot leaves the panel in the boss
 * levels and in the test run of the editor.
 *
 * @returns {void}
 */
function renderRobot() {
	const testing = stage.mode.get() == 'test';
	el('robot').style.visibility = !testing && levelOf(currentLevel).boss > 0 ? 'hidden' : 'visible';
	let eye = 0;
	if (!testing && campaignId == CampaignId.STORY) eye = Math.min(Math.floor((currentLevel - 1) / 7), 3);
	el('robot-eye').style.backgroundImage = `url("sprites/robotEye${eye + 1}.svg")`;
}

/**
 * Check if the intermission screen has the button that starts the next level: when the next level is unlocked.
 *
 * @returns {boolean} True when the button is there.
 */
function canContinue() {
	return currentLevel < LEVELS_PER_CAMPAIGN && maxLevel[campaignId] >= currentLevel + 1;
}

/**
 * Check if the current level is not unlocked yet. This is the case after the replay of a level that the player has
 * not reached. The player can then not play the level from the intermission screen.
 *
 * @returns {boolean} True for a locked level.
 */
function isLevelLocked() {
	return campaigns[campaignId].records && currentLevel > maxLevel[campaignId];
}

/**
 * Update the pause menu and the intermission screen over the stage.
 *
 * @returns {string} The name of the menu that the overlay shows, or an empty string.
 */
function renderLevelMenus() {
	if (stage.paused.get()) {
		el('pause-sound').textContent = 'Sounds : ' + (stage.sound.get() ? 'On' : 'Off');
		return 'pause';
	}
	if (intermission !== null) {
		el('intermission-time').textContent = 'Your time : ' + toTime(intermission.time);
		el('intermission-message').textContent = intermission.message;
		show(el('intermission-restart'), !isLevelLocked());
		show(el('intermission-continue'), canContinue());
		show(el('intermission-replay'), campaigns[campaignId].records);
		return 'intermission';
	}
	return '';
}

/**
 * Update the save or load screen of the editor: the slots and the buttons.
 *
 * @returns {void}
 */
function renderEditorFile() {
	const saving = editorFile == 'save';
	for (const button of el('slot-list').children) {
		const n = Number(button.dataset.slot);
		const stored = getEditorMap(n) != null;
		button.classList.toggle('stored', stored);
		button.disabled = !saving && !stored;
		button.classList.toggle('selected', n == slot);
	}
	el('editor-accept').textContent = saving ? 'Save' : 'Load';
	show(el('editor-accept'), slot > 0);
	show(el('editor-export'), saving || slot > 0);
}

/**
 * Update the best times panel. In the level selection, the panel shows the best time of the selected level and
 * buttons for the replays. During play, the panel shows the current time and the best time. The panel always shows
 * the sum of all best times of the campaign.
 *
 * @returns {void}
 */
function renderPanel() {
	const name = shownScreen();
	const playing = name === 'level' && stage.mode.get() == 'play';
	let html = '';
	if (playing || name === 'select') {
		const campaign = campaigns[campaignId].folder;
		const level = playing ? currentLevel : selected;
		const best = level > 0 ? getBestTime(campaign, level) : null;
		const total = getCampaignTotal(campaign);
		const formatTime = (ticks) => (ticks === null ? '-' : toTime(ticks));

		if (playing) {
			html += `<p class="title">Level ${level}${playReplay !== null ? ' (replay)' : ''}</p>`;
			html += `<p>Time: ${toTime(stage.time.get())}</p>`;
			html += `<p>Best time: ${formatTime(best)}</p>`;
		} else {
			if (level > 0) {
				html += `<p class="title">Level ${level}</p>`;
				html += `<p>Best time: ${formatTime(best)}</p>`;
				if (best !== null) {
					html += '<p><button data-action="watch">Watch replay</button></p>';
					html += '<p><button data-action="export">Export replay</button></p>';
				}
			}
			html += '<p><button data-action="import">Import replay</button></p>';
		}
		html += `<p class="total">Campaign total: ${toTime(total.ticks)}<br>${total.levels} of ${LEVELS_PER_CAMPAIGN} levels</p>`;
	}
	const panel = el('highscores_in');
	if (panel.innerHTML !== html) panel.innerHTML = html;
}

/**
 * Show the values of the HUD.
 *
 * @returns {void}
 */
function renderStats() {
	el('stat-life').textContent = String(stage.life.get());
	el('stat-cakes').textContent = String(stage.cakes.get());
	el('stat-steps').textContent = String(stage.steps.get());
	el('stat-portals').textContent = String(stage.portals.get());
}

/**
 * Show the pressed keys and mouse buttons of a replay.
 *
 * @returns {void}
 */
function renderKeys() {
	const keys = stage.replayKeys.get();
	for (const [name, bit] of Object.entries(KEY_CAPS)) {
		const cap = el(`key-${name}`);
		cap.classList.toggle('pressed', (keys & bit) != 0);
		if (name in keyLabels) cap.textContent = keyLabels[name];
	}
}

/**
 * Show the selected tile or object in the palettes of the editor.
 *
 * @returns {void}
 */
function renderBrush() {
	const brush = stage.brush.get();
	for (const button of el('editor-tiles').children) {
		button.classList.toggle('selected', Number(button.dataset.tile) == brush);
	}
	for (const button of el('editor-objects').querySelectorAll('button[data-sprite]')) {
		button.classList.toggle('selected', Number(button.dataset.sprite) == brush);
	}
}

/**
 * Open the main menu. The stage shows nothing.
 *
 * @returns {void}
 */
function showMain() {
	stage.stop();
	showScreen('main');
}

/**
 * Open the level selection of a campaign without a selected level.
 *
 * @param {number} campaign The campaign index.
 * @returns {void}
 */
function showSelection(campaign) {
	campaignId = campaign;
	selected = 0;
	stage.stop();
	showScreen('select');
}

/**
 * Select a level in the level selection and show its preview.
 *
 * @param {number} level The level number.
 * @returns {void}
 */
function selectLevel(level) {
	if (level > maxLevel[campaignId] || level == selected) return;
	selected = level;
	stage.preview(levelOf(level));
	render();
}

/**
 * Start a level of a campaign, or the playback of a replay of the level.
 *
 * @param {number} campaign The campaign index.
 * @param {number} level The level number.
 * @param {object} [options] The options of play() of the stage: replay in the file format and restart.
 * @returns {void}
 */
function startPlay(campaign, level, options = {}) {
	campaignId = campaign;
	currentLevel = level;
	playReplay = options.replay ?? null;
	intermission = null;
	stage.play(levelOf(level), options);
	showScreen('level');
}

/**
 * Leave the level: back to the level selection with the preview of the level, or to the main menu if the level
 * started from there.
 *
 * @returns {void}
 */
function exitLevel() {
	playReplay = null;
	intermission = null;
	if (fromSelection) {
		selected = currentLevel;
		stage.preview(levelOf(currentLevel));
		showScreen('select');
	} else {
		showMain();
	}
}

/**
 * Store the level time and the replay if the time is a new best time.
 *
 * @param {number} time The level time in ticks.
 * @param {object} replay The replay in the file format.
 * @returns {string} The message for the intermission screen.
 */
function checkBestTime(time, replay) {
	const campaign = campaigns[campaignId].folder;
	const best = getBestTime(campaign, currentLevel);
	if (best != null && best <= time) return 'Best time : ' + toTime(best);

	saveBestTime(campaign, currentLevel, time, replay).then(render, function (e) {
		console.error(e);
	});
	return 'New best time !';
}

/**
 * Handle the end of a level: the best time, the progress and the intermission screen. In a campaign without
 * intermission screens, the next level starts at once. The last level always shows the intermission screen, with the
 * end text of the campaign if it has one. After the last story level, the credits show the first time.
 *
 * @param {CustomEvent<{time: number, replay: object}>} event The finished event of the stage.
 * @returns {void}
 */
function onFinished(event) {
	if (screen != 'level') return;
	const { time, replay } = event.detail;
	const campaign = campaigns[campaignId];
	const isLastLevel = currentLevel == campaign.levels.length;
	const records = campaign.records && playReplay === null;
	let message = '';
	let credits = false;
	if (records) message = checkBestTime(time, replay);
	if (isLastLevel && campaign.endText) message = campaign.endText;
	if (records && maxLevel[campaignId] < currentLevel + 1) {
		credits = campaignId == CampaignId.STORY && maxLevel[campaignId] == LEVELS_PER_CAMPAIGN;
		saveProgress(campaignId, currentLevel + 1);
	}
	playReplay = null;

	if (!campaign.intermission && !isLastLevel) {
		startPlay(campaignId, currentLevel + 1);
	} else if (credits) {
		showCredits();
	} else {
		intermission = { time, message, replay };
		render();
	}
}

/**
 * Stop a broken replay with a message and go back to the level selection.
 *
 * @returns {void}
 */
function onBrokenReplay() {
	alertDialog(
		"The replay you're watching seems to be broken -_-;\n" + 'Sorry for any inconveniences.',
		'An error occurred',
	);
	exitLevel();
}

/**
 * Show the credits as text. A click on the stage opens the main menu.
 *
 * @returns {void}
 */
function showCredits() {
	stage.stop();
	el('credits').replaceChildren(
		...creditsTxt.map((line) => Object.assign(document.createElement('p'), { textContent: line })),
	);
	showScreen('credits');
}

/**
 * Open the editor on an empty map with the wall tile as the brush.
 *
 * @returns {void}
 */
function showEditor() {
	stage.edit({ tiles: new Array(MAP_SIZE).fill(0), bg: 0 });
	stage.setBrush(1);
	showScreen('editor');
}

/**
 * Open the save or load screen of the editor without a selected slot. The stage keeps the editor map.
 *
 * @param {string} mode "save" or "load".
 * @returns {void}
 */
function showEditorFile(mode) {
	editorFile = mode;
	slot = 0;
	stage.stop();
	showScreen('editor-file');
}

/**
 * Go back from the save or load screen to the editor, with the editor map from before or with a new map.
 *
 * @param {{tiles: number[], bg: number}} [map] The new map, or nothing for the editor map from before.
 * @returns {void}
 */
function backToEditor(map) {
	stage.edit(map);
	showScreen('editor');
}

/**
 * Select a slot of the save or load screen and show its map. The load screen selects only stored slots.
 *
 * @param {number} n The slot number.
 * @returns {void}
 */
function selectSlot(n) {
	const stored = getEditorMap(n);
	if (n == slot || (editorFile == 'load' && stored == null)) return;
	slot = n;
	if (stored) stage.preview(stored);
	else stage.stop();
	render();
}

/**
 * Save the editor map into the selected slot, or load the map of the selected slot into the editor.
 *
 * @returns {void}
 */
function acceptEditorFile() {
	if (slot < 1) return;
	if (editorFile == 'load') {
		backToEditor(getEditorMap(slot));
		return;
	}
	const map = stage.getMap();
	if (!saveEditorMap(slot, map.tiles, map.bg)) {
		alertDialog(
			'The map could not be saved, because the browser blocks the storage or the storage is full. ' +
				'Use Export to save the map as a file.',
			'Save map',
		);
		return;
	}
	backToEditor();
}

/**
 * Let the browser download the editor map, or in the load screen the map of the selected slot, as a JSON file.
 *
 * @returns {void}
 */
function exportEditorMap() {
	const map = editorFile == 'save' ? stage.getMap() : getEditorMap(slot);
	if (!map) return;
	downloadJson({ format: MAP_FORMAT, tiles: map.tiles, bg: map.bg }, 'stillalivejs-map.json');
}

/**
 * Let the player select a map file and open it in the editor.
 *
 * @returns {Promise<void>}
 */
async function importEditorMap() {
	const data = await pickJsonFile();
	if (data === null || screen != 'editor-file') return;
	const map = parseMap(data);
	if (map.boss > 0) throw new Error('The editor does not support boss levels.');
	backToEditor(map);
}

/**
 * Start the playback of a replay from the level selection.
 *
 * @param {object} data The replay in the file format.
 * @returns {void}
 * @throws {Error} If the replay is not valid or the campaign or level does not exist.
 */
function startReplay(data) {
	decodeReplay(data);
	const campaign = campaigns.findIndex((c) => c.folder === data.campaign && c.records);
	if (campaign < 0 || data.level < 1 || data.level > LEVELS_PER_CAMPAIGN)
		throw new Error('The replay is for an unknown level.');
	fromSelection = true;
	startPlay(campaign, data.level, { replay: data });
}

/**
 * Run the action of a button of the best times panel.
 *
 * @param {string} action The action name from the data-action attribute.
 * @returns {Promise<void>}
 */
async function runPanelAction(action) {
	if (screen != 'select') return;
	if (action === 'import') {
		const data = await pickJsonFile();
		if (data !== null && screen == 'select') startReplay(data);
		return;
	}

	const data = await loadBestReplay(campaigns[campaignId].folder, selected);
	if (!data) throw new Error('There is no stored replay for this level.');
	if (action === 'watch') startReplay(data);
	else if (action === 'export')
		downloadJson(data, `stillalivejs-${data.campaign}-${String(data.level).padStart(2, '0')}.json`);
}

/**
 * Add a click handler to a button of the page.
 *
 * @param {string} id The id of the button.
 * @param {function(): void} handler The handler.
 * @returns {void}
 */
function onClick(id, handler) {
	el(id).addEventListener('click', handler);
}

/**
 * Create the lists of the levels and of the slots, the tile palette, and add the handlers of all buttons.
 *
 * @returns {void}
 */
function setupButtons() {
	for (const [id, campaign] of Object.entries(CAMPAIGN_BUTTONS)) onClick(id, () => showSelection(campaign));
	onClick('main-editor', showEditor);
	onClick('main-tutorial', () => {
		fromSelection = false;
		startPlay(
			campaigns.findIndex((c) => c.folder == 'tutorial'),
			1,
		);
	});
	onClick('sound-button', () => stage.setSound(!stage.sound.get()));

	for (let level = 1; level <= LEVELS_PER_CAMPAIGN; level++) {
		const button = Object.assign(document.createElement('button'), { textContent: 'Level ' + level });
		button.dataset.level = String(level);
		button.addEventListener('click', () => selectLevel(level));
		el('level-list').append(button);
	}
	onClick('selection-play', () => {
		if (selected < 1) return;
		fromSelection = true;
		startPlay(campaignId, selected);
	});
	onClick('selection-exit', showMain);
	onClick('selection-mode', () => {
		if (hasModeButton()) showSelection(campaignId == CampaignId.NORMAL ? CampaignId.ADVANCED : CampaignId.NORMAL);
	});
	el('highscores_in').addEventListener('click', (event) => {
		const action = event.target.closest('button')?.dataset.action;
		if (action) runPanelAction(action).catch((error) => alertDialog(error.message, 'Replay'));
	});

	onClick('pause-resume', () => stage.resume());
	onClick('pause-restart', () => startPlay(campaignId, currentLevel, { replay: playReplay, restart: true }));
	onClick('pause-exit', exitLevel);
	onClick('pause-sound', () => stage.setSound(!stage.sound.get()));

	onClick('intermission-exit', exitLevel);
	onClick('intermission-restart', () => startPlay(campaignId, currentLevel, { restart: true }));
	onClick('intermission-continue', () => startPlay(campaignId, currentLevel + 1));
	onClick('intermission-replay', () => startPlay(campaignId, currentLevel, { replay: intermission.replay }));

	for (const tile of EDITOR_TILES) {
		const button = document.createElement('button');
		button.dataset.tile = String(tile);
		button.title = EDITOR_TILE_TITLES[tile];
		const image = Object.assign(document.createElement('img'), { src: `tiles/tile_${tile}.svg`, alt: '' });
		button.append(image);
		button.addEventListener('click', () => stage.setBrush(tile));
		el('editor-tiles').append(button);
	}
	for (const button of document.querySelectorAll('#editor-objects button[data-sprite]')) {
		button.addEventListener('click', () => stage.setBrush(Number(button.dataset.sprite)));
	}
	for (const button of document.querySelectorAll('#editor-bg button')) {
		button.addEventListener('click', () => stage.setBackground(stage.getMap().bg + Number(button.dataset.bg)));
	}
	onClick('editor-exit', showMain);
	onClick('editor-clear', () => stage.clearMap());
	onClick('editor-try', () => stage.test());
	onClick('editor-help', () => alertDialog(EDITOR_HELP, 'Level Editor Shortcuts'));
	onClick('editor-load', () => showEditorFile('load'));
	onClick('editor-save', () => showEditorFile('save'));

	for (let n = 1; n <= LEVELS_PER_CAMPAIGN; n++) {
		const button = Object.assign(document.createElement('button'), { textContent: 'Slot ' + n });
		button.dataset.slot = String(n);
		button.addEventListener('click', () => selectSlot(n));
		el('slot-list').append(button);
	}
	onClick('editor-accept', acceptEditorFile);
	onClick('editor-file-exit', () => backToEditor());
	onClick('editor-export', exportEditorMap);
	onClick('editor-import', () => importEditorMap().catch((error) => alertDialog(error.message, 'Import map')));

	el('stage').addEventListener('click', () => {
		if (screen == 'loading' && isLoaded()) showMain();
		else if (screen == 'credits') showMain();
	});
}

/**
 * Start the page: load the progress, the sound setting, the campaigns and the credits, add the handlers and show the
 * loading screen.
 *
 * @returns {void}
 */
export function startPage() {
	stage = el('game-stage');
	loadProgress();
	stage.setSound(loadSoundSetting());
	stage.sound.subscribe((on) => {
		if (storeSound) saveSoundSetting(on);
	});
	storeSound = true;
	loadCampaigns(renderLoading);
	loadCreditsText();
	setupButtons();

	stage.loading.subscribe(renderLoading);
	stage.ready.subscribe(renderLoading);
	stage.mode.subscribe(render);
	stage.paused.subscribe(render);
	stage.sound.subscribe(render);
	stage.message.subscribe(renderNarrator);
	stage.time.subscribe(renderPanel);
	stage.brush.subscribe(renderBrush);
	stage.replayKeys.subscribe(renderKeys);
	for (const value of [stage.life, stage.cakes, stage.steps, stage.portals]) value.subscribe(renderStats);

	stage.addEventListener('finished', onFinished);
	stage.addEventListener('brokenreplay', onBrokenReplay);
	stage.addEventListener('focuslost', () => stage.pause());
	showScreen('loading');
}
