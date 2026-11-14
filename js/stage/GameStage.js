/**
 * The stage element <game-stage>, which shows the game on a canvas.
 *
 * The page controls the stage with its methods and reads the state from the Value properties. The stage dispatches
 * the events "finished", "died", "focuslost", "brokenreplay" and "replaystop".
 */

import {
	playSound,
	randomRate,
	setMusicMood,
	setMusicOn,
	setMusicPlaying,
	setSoundMuted,
	setSoundOn,
	sfx_click,
	sfx_hover,
	sfx_tick,
} from './audio.js';
import { clearCanvas, ctx, setCanvas, watchCanvasSize } from './canvas.js';
import { PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH } from './constants.js';
import { Editor } from './Editor.js';
import { Player } from './entities/Player.js';
import { startLevel, tick } from './game.js';
import { canPause, setupInput } from './input.js';
import { captureInput, unclick } from './inputState.js';
import { loadLevel, loadPreviewMap } from './level.js';
import { getFps, startLoop } from './loop.js';
import { render } from './render/frame.js';
import { decodeReplay, resumeReplay } from './replay.js';
import { game, input, stageEvents, ui } from './state.js';
import { Value } from '../value.js';

/** @type {number} The number of ticks between two updates of the level time. */
const TIME_UPDATE_INTERVAL = 30;

/**
 * The styles of the stage in its shadow root. The canvas is centered in the element and has the largest size that
 * fits into the element at the aspect ratio of the playfield.
 *
 * @type {string}
 */
const STAGE_STYLE = `
	:host {
		display: grid;
		place-items: center;
		container-type: size;
	}

	canvas {
		width: min(100%, calc(100cqh * ${PLAYFIELD_WIDTH} / ${PLAYFIELD_HEIGHT}));
		aspect-ratio: ${PLAYFIELD_WIDTH} / ${PLAYFIELD_HEIGHT};
		background: black;
		cursor: none;
		touch-action: none;
	}
`;

/** @type {number} The playback rate of the music during a boss fight, faster and higher. */
const BOSS_MUSIC_RATE = 1.4;

/** @type {number} The share of the music volume while the boss comes in and while it leaves after its death. */
const BOSS_MUSIC_DUCK = 0.5;

/**
 * The game stage. It plays a level, shows the preview of a level or opens the editor on a map.
 */
export class GameStage extends HTMLElement {
	/** @type {Value<string>} What the stage shows: "idle", "play", "preview", "edit" or "test". */
	mode = new Value('idle');
	/** @type {Value<number>} The life of the player in points. */
	life = new Value(0);
	/** @type {Value<number>} The number of cakes that are left in the level. */
	cakes = new Value(0);
	/** @type {Value<number>} The number of steps of the player. */
	steps = new Value(0);
	/** @type {Value<number>} The number of portal shots. */
	portals = new Value(0);
	/** @type {Value<number>} The level time in ticks. While the level runs, it changes every 30 ticks. */
	time = new Value(0);
	/** @type {Value<boolean>} True while the level time stands still for a pause. */
	paused = new Value(false);
	/** @type {Value<{text: string, wait: boolean, portrait: number}|null>} The message for the narrator, or null. */
	message = new Value(null);
	/** @type {Value<number>} The speed of the playback of a replay: 1, 2 or 4 ticks per tick of real time. */
	speed = new Value(1);
	/** @type {Editor} The level editor. It keeps the editor map while the stage shows something else. */
	#editor = new Editor();
	/** @type {Value<number>} The tile id or the object id that the editor paints. */
	brush = new Value(this.#editor.brush);
	/** @type {Value<number>} The measured number of frames per second. */
	fps = new Value(0);
	/** @type {Value<boolean>} True if the stage plays the sounds. */
	sound = new Value(true);
	/** @type {Value<boolean>} True if the stage plays the music. */
	music = new Value(true);

	/** @type {boolean} True after the first connection, which starts the loop. */
	#started = false;

	/** @type {number} The number of ticks that the stage runs for each tick of real time. */
	#speed = 1;

	/**
	 * Set up the canvas, the input and the game loop when the element is first connected to the page.
	 *
	 * @returns {void}
	 */
	connectedCallback() {
		if (this.#started) return;
		this.#started = true;

		const style = document.createElement('style');
		style.textContent = STAGE_STYLE;
		const canvas = document.createElement('canvas');
		canvas.width = PLAYFIELD_WIDTH;
		canvas.height = PLAYFIELD_HEIGHT;
		this.attachShadow({ mode: 'open' }).append(style, canvas);
		setCanvas(canvas);
		ctx.strokeStyle = 'rgb(255, 0, 0)';
		ctx.font = 'bold 10px Arial';

		watchCanvasSize();
		setupInput(canvas, this, this.#editor);

		game.player = new Player(); // the input reads the player before the first level starts
		game.resetPhase();
		game.time = 0;

		startLoop(
			() => this.#step(),
			() => render(this.#editor),
		);
		this.#addTestHook();
	}

	/**
	 * Start a level, or the playback of a replay of the level.
	 *
	 * @param {import('./level.js').Level} level The level.
	 * @param {object} [options] The options.
	 * @param {object|null} [options.replay] A replay in the file format to play, or null to let the player play.
	 * @param {boolean} [options.restart] True for a restart of the same level. The restart skips the waits of the events
	 *     and the entrance of the boss.
	 * @returns {void}
	 * @throws {Error} If the replay is not valid.
	 */
	play(level, { replay = null, restart = false } = {}) {
		const recorded = replay === null ? null : decodeReplay(replay);
		this.#leave();
		startLevel(level, recorded, restart);
		this.#publish();
	}

	/**
	 * Show the still picture of a level or of a map.
	 *
	 * @param {{tiles: number[], bg: number, boss?: number, fromBelow?: boolean}} level The level or the map.
	 * @returns {void}
	 */
	preview(level) {
		this.#leave();
		ui.mode = 'preview';
		loadPreviewMap(level);
		this.#publish();
	}

	/**
	 * Open the editor on a map. A new map starts a new undo list.
	 *
	 * @param {object} [level] The map in the map file format, or nothing to open the editor map from before.
	 * @returns {void}
	 */
	edit(level) {
		this.#leave();
		this.#editor.open(level);
		this.#publish();
	}

	/**
	 * Run the editor map as a level. The level restarts when the player dies. The end of the exit transition and the
	 * Escape and Enter keys end the test run and go back to the editor.
	 *
	 * @returns {void}
	 */
	test() {
		if (ui.mode != 'edit') return;
		this.#editor.startTest();
		this.#publish();
	}

	/**
	 * End the test run and go back to the editor.
	 *
	 * @returns {void}
	 */
	stopTest() {
		if (ui.mode != 'test') return;
		this.#editor.stopTest();
		this.#publish();
	}

	/**
	 * Stop the level time. Only a level before its end can pause. A replay keeps its input state for the resume.
	 *
	 * @returns {void}
	 */
	pause() {
		if (!canPause() || ui.paused) return;
		ui.paused = true;
		if (game.replayMode) {
			input.replayPauseInput = captureInput();
			unclick();
			input.keys = 0;
		}
		this.#publish();
	}

	/**
	 * Continue the level time after a pause.
	 *
	 * @returns {void}
	 */
	resume() {
		if (!ui.paused) return;
		ui.paused = false;
		unclick();
		if (game.replayMode) resumeReplay();
		this.#publish();
	}

	/**
	 * Set the speed of the playback of a replay. Only a speed of 1 plays the sounds of the game. The speed changes only
	 * during a replay.
	 *
	 * @param {number} speed The number of ticks for each tick of real time: 1, 2 or 4.
	 * @returns {void}
	 */
	setSpeed(speed) {
		if (!game.replayMode) return;
		this.#speed = speed;
		this.#publish();
	}

	/**
	 * Leave the level, the preview, the test run or the editor, and clear the canvas.
	 *
	 * @returns {void}
	 */
	stop() {
		this.#leave();
		ui.mode = 'idle';
		clearCanvas();
		this.#publish();
	}

	/**
	 * Select what the editor paints.
	 *
	 * @param {number} tile The tile id or the object id.
	 * @returns {void}
	 */
	setBrush(tile) {
		this.#editor.brush = tile;
		this.#publish();
	}

	/**
	 * Set the background of the editor map. A number outside the range of the backgrounds wraps around.
	 *
	 * @param {number} n The background index.
	 * @returns {void}
	 */
	setBackground(n) {
		if (ui.mode == 'edit') this.#editor.setBackground(n);
	}

	/**
	 * Get the editor map, also while the stage shows something else.
	 *
	 * @returns {object} The editor map in the map file format without the format property, with a copy of the tiles.
	 */
	getMap() {
		return this.#editor.getMap();
	}

	/**
	 * Remove all tiles, objects and other properties of the editor map.
	 *
	 * @returns {void}
	 */
	clearMap() {
		if (ui.mode == 'edit') this.#editor.clear();
	}

	/**
	 * Go back to the editor map before the last change.
	 *
	 * @returns {void}
	 */
	undo() {
		if (ui.mode == 'edit') this.#editor.undo();
	}

	/**
	 * Go forward to the editor map of the next change after an undo.
	 *
	 * @returns {void}
	 */
	redo() {
		if (ui.mode == 'edit') this.#editor.redo();
	}

	/**
	 * Turn the sound on or off.
	 *
	 * @param {boolean} on True to play the sounds.
	 * @returns {void}
	 */
	setSound(on) {
		setSoundOn(on);
		this.sound.set(on);
	}

	/**
	 * Turn the music on or off.
	 *
	 * @param {boolean} on True to play the music.
	 * @returns {void}
	 */
	setMusic(on) {
		setMusicOn(on);
		this.music.set(on);
	}

	/**
	 * Choose the music. The music plays on through all commands of the stage until other music is chosen.
	 *
	 * @param {string|null} track "level" for the level music, "menu" for the menu music, or null for no music.
	 * @returns {void}
	 */
	playMusic(track) {
		setMusicPlaying(track);
	}

	/**
	 * Play the click sound of the menu buttons. At the start of the game, the click lets the player hear that the sound
	 * works.
	 *
	 * @returns {void}
	 */
	playClickSound() {
		playSound(sfx_click);
	}

	/**
	 * Play the sound of a menu button that the pointer or the keyboard focus moves onto.
	 *
	 * @returns {void}
	 */
	playHoverSound() {
		playSound(sfx_hover);
	}

	/**
	 * Play the tick sound of the narrator, with a small random change of the pitch.
	 *
	 * @returns {void}
	 */
	playTypeSound() {
		playSound(sfx_tick, randomRate(0.1));
	}

	/**
	 * Leave the current mode before a new command. A test run ends without the event "died".
	 *
	 * @returns {void}
	 */
	#leave() {
		if (ui.mode == 'test') {
			this.#editor.stopTest(false);
		}
		if (ui.mode == 'edit') this.#editor.leave();
		ui.paused = false;
		game.replayMode = false;
		this.#speed = 1;
		game.events = null;
		game.shakeX = 0;
		game.shakeY = 0;
	}

	/**
	 * Run the ticks of one tick of real time and publish the state. Above the normal speed, the ticks start no sounds.
	 *
	 * @returns {void}
	 */
	#step() {
		setSoundMuted(this.#speed > 1);
		for (let i = 0; i < this.#speed; i++) tick(this.#editor);
		setSoundMuted(false);
		this.#publish();
	}

	/**
	 * Update the Value properties and dispatch the events of the tick. The speed and the volume of the music follow the
	 * phase of the boss fight.
	 *
	 * @returns {void}
	 */
	#publish() {
		const player = game.player;
		this.mode.set(ui.mode);
		this.life.set(Math.max(player.life >> 8, 0));
		this.cakes.set(game.cakesLeft ?? 0);
		this.steps.set((game.steps ?? 0) >> 8);
		this.portals.set(game.portalShots ?? 0);
		const time = game.time ?? 0;
		this.time.set(game.isRunning() ? time - (time % TIME_UPDATE_INTERVAL) : time);
		this.paused.set(ui.paused);
		this.message.set(game.events?.message ?? null);
		this.speed.set(this.#speed);
		this.brush.set(this.#editor.brush);
		this.fps.set(getFps());
		const phase = ui.mode == 'play' ? (game.boss?.phase() ?? null) : null;
		setMusicMood(phase == 'fight' ? BOSS_MUSIC_RATE : 1, phase == 'coming' || phase == 'leaving' ? BOSS_MUSIC_DUCK : 1);

		const events = stageEvents.splice(0);
		for (const { type, detail } of events) this.dispatchEvent(new CustomEvent(type, { detail }));
	}

	/**
	 * Give the tests access to the stage and its internals when the URL contains "?test".
	 *
	 * @returns {void}
	 */
	#addTestHook() {
		if (!new URLSearchParams(location.search).has('test')) return;
		window.__test = {
			stage: this,
			game,
			input,
			tick: () => this.#step(),
			render: () => render(this.#editor),
			loadLevel,
			loadPreviewMap,
		};
	}
}
