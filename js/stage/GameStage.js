/**
 * The stage element <game-stage>: the canvas, the game loop and the interface of the stage for the page.
 *
 * The page commands the stage with the methods, reads and observes its state with the Value properties, and gets the
 * events "finished", "died", "focuslost" and "brokenreplay".
 */

import { allImagesLoaded, imageProgress, missingImages, onImageDone } from './assets.js';
import { allSoundsLoaded, loadSfx, missingSounds, onSoundDone, setSoundOn, soundProgress } from './audio.js';
import { clearCanvas, ctx, setCanvas, watchCanvasSize } from './canvas.js';
import { PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH } from './constants.js';
import {
	clearEditorMap,
	editorMap,
	leaveEditor,
	openEditor,
	redoEditor,
	setEditorBackground,
	startPlayingLevel,
	stopPlayingLevel,
	undoEditor,
} from './editor.js';
import { Player } from './entities/Player.js';
import { startLevel, tick } from './game.js';
import { loadGfx } from './images.js';
import { canPause, setupInput } from './input.js';
import { captureInput, unclick } from './inputState.js';
import { loadKeyLabels } from './keys.js';
import { loadLevel, loadPreviewMap } from './level.js';
import { getFps, startLoop } from './loop.js';
import { render } from './render/frame.js';
import { decodeReplay, resumeReplay } from './replay.js';
import { game, input, stageEvents, ui } from './state.js';
import { Value } from '../value.js';

/** @type {number} The number of ticks between two updates of the level time. */
const TIME_UPDATE_INTERVAL = 30;

/**
 * The stage: it plays a level, shows the preview of a level or opens the editor on a map.
 */
export class GameStage extends HTMLElement {
	/** @type {Value<boolean>} False until the images and the sounds are loaded. The sounds are not needed while the sound is off. */
	ready = new Value(false);
	/**
	 * @type {Value<{images: {progress: number, missing: string[]}, sounds: {progress: number, missing: string[]}}>}
	 *     The loading progress of the images and the sounds from 0 to 1, and the files that could not be loaded. A
	 *     new object each time a file is done.
	 */
	loading = new Value({ images: { progress: 0, missing: [] }, sounds: { progress: 0, missing: [] } });
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
	/** @type {Value<boolean>} True while the level time stands still for the pause menu. */
	paused = new Value(false);
	/** @type {Value<{text: string, wait: boolean, portrait: number}|null>} The message for the narrator, or null. */
	message = new Value(null);
	/** @type {Value<number>} The key bitmask in the playback of a replay, else 0. */
	replayKeys = new Value(0);
	/** @type {Value<number>} The tile id or the object id that the editor paints. */
	brush = new Value(ui.editor.brush);
	/** @type {Value<number>} The measured number of frames per second. */
	fps = new Value(0);
	/** @type {Value<boolean>} True if the stage plays the sounds. */
	sound = new Value(true);

	/** @type {boolean} True after the first connection, which starts the loop. */
	#started = false;

	/**
	 * Create the canvas, start the loading of the images and the sounds, the input and the game loop.
	 *
	 * @returns {void}
	 */
	connectedCallback() {
		if (this.#started) return;
		this.#started = true;

		const canvas = document.createElement('canvas');
		canvas.width = PLAYFIELD_WIDTH;
		canvas.height = PLAYFIELD_HEIGHT;
		this.append(canvas);
		setCanvas(canvas);
		ctx.strokeStyle = 'rgb(255, 0, 0)';
		ctx.font = 'bold 10px Arial';

		watchCanvasSize();
		setupInput(canvas, this);
		loadKeyLabels();
		onImageDone(() => this.#fileDone());
		onSoundDone(() => this.#fileDone());
		loadGfx();
		loadSfx();

		game.player = new Player(); // the input reads the player before the first level starts
		game.time = 0;

		startLoop(() => this.#step(), render);
		this.#addTestHook();
	}

	/**
	 * Start a level, or the playback of a replay of the level.
	 *
	 * @param {import('./level.js').Level} level The level.
	 * @param {object} [options] The options.
	 * @param {object|null} [options.replay] A replay in the file format to play, or null to let the player play.
	 * @param {boolean} [options.restart] True for a restart of the same level: the waits of the events and the entrance
	 *     of the boss are skipped.
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
	 * @param {{tiles: number[], bg: number}} [level] The map, or nothing to open the editor map from before.
	 * @returns {void}
	 */
	edit(level) {
		this.#leave();
		openEditor(level);
		this.#publish();
	}

	/**
	 * Run the editor map as a level. stop() or the death of the player ends the test run.
	 *
	 * @returns {void}
	 */
	test() {
		if (ui.mode != 'edit') return;
		startPlayingLevel();
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
	 * Leave the level, the preview or the editor, so the canvas shows nothing. A test run goes back to the editor
	 * instead.
	 *
	 * @returns {void}
	 */
	stop() {
		if (ui.mode == 'test') {
			stopPlayingLevel();
		} else {
			this.#leave();
			ui.mode = 'idle';
			clearCanvas();
		}
		this.#publish();
	}

	/**
	 * Select what the editor paints.
	 *
	 * @param {number} tile The tile id or the object id.
	 * @returns {void}
	 */
	setBrush(tile) {
		ui.editor.brush = tile;
		this.#publish();
	}

	/**
	 * Set the background of the editor map. A number outside the range of the backgrounds wraps around.
	 *
	 * @param {number} n The background index.
	 * @returns {void}
	 */
	setBackground(n) {
		if (ui.mode == 'edit') setEditorBackground(n);
	}

	/**
	 * Get the editor map, also while the stage shows something else.
	 *
	 * @returns {{tiles: number[], bg: number}} A copy of the tiles and the background.
	 */
	getMap() {
		return editorMap();
	}

	/**
	 * Remove all tiles and objects of the editor map.
	 *
	 * @returns {void}
	 */
	clearMap() {
		if (ui.mode == 'edit') clearEditorMap();
	}

	/**
	 * Go back to the editor map before the last change.
	 *
	 * @returns {void}
	 */
	undo() {
		if (ui.mode == 'edit') undoEditor();
	}

	/**
	 * Go forward to the editor map of the next change after an undo.
	 *
	 * @returns {void}
	 */
	redo() {
		if (ui.mode == 'edit') redoEditor();
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
		this.#checkReady();
	}

	/**
	 * Leave the current mode before a new command: end the test run without an event, keep the editor map, and end
	 * the pause and the playback of a replay.
	 *
	 * @returns {void}
	 */
	#leave() {
		if (ui.mode == 'test') {
			stopPlayingLevel(false);
		}
		if (ui.mode == 'edit') leaveEditor();
		ui.paused = false;
		game.replayMode = false;
		game.message = null;
		game.shakeX = 0;
		game.shakeY = 0;
	}

	/**
	 * Run one tick and publish the state.
	 *
	 * @returns {void}
	 */
	#step() {
		tick();
		this.#publish();
	}

	/**
	 * Write the state of the stage into the values and dispatch the events of the tick.
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
		this.time.set(player.fadeNextLevel == -1 ? time - (time % TIME_UPDATE_INTERVAL) : time);
		this.paused.set(ui.paused);
		this.message.set(game.message);
		this.replayKeys.set(ui.mode == 'play' && game.replayMode ? input.keys : 0);
		this.brush.set(ui.editor.brush);
		this.fps.set(getFps());

		const events = stageEvents.splice(0);
		for (const { type, detail } of events) this.dispatchEvent(new CustomEvent(type, { detail }));
	}

	/**
	 * Set the loading progress after an image or a sound is loaded or failed, and check if the stage is ready.
	 *
	 * @returns {void}
	 */
	#fileDone() {
		this.loading.set({
			images: { progress: imageProgress(), missing: missingImages().slice() },
			sounds: { progress: soundProgress(), missing: missingSounds().slice() },
		});
		this.#checkReady();
	}

	/**
	 * Set the stage ready when the images are loaded, and the sounds too while the sound is on. The stage stays ready.
	 *
	 * @returns {void}
	 */
	#checkReady() {
		if (allImagesLoaded() && (allSoundsLoaded() || !this.sound.get())) this.ready.set(true);
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
			loadLevel,
			loadPreviewMap,
		};
	}
}
