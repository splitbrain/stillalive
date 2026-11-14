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
import { PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH, Transition } from './constants.js';
import { Editor } from './Editor.js';
import { canPause, setupInput } from './input.js';
import { captureInput, manageKeys, resumeReplay, unclick } from './inputState.js';
import { getFps, startLoop } from './loop.js';
import { render } from './render/frame.js';
import { Replay, decodeReplay, encodeReplay } from './replay.js';
import { input, setGame, stageEvents, ui } from './state.js';
import { World } from './World.js';
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

	/** @type {World|null} The World that the stage shows, or null before the first connection. */
	#world = null;

	/** @type {Replay} The recording of the level, or the replay that plays. */
	#replay = new Replay();

	/** @type {boolean} True while a replay plays. */
	#replayMode = false;

	/** @type {number} The effect of the opening transition of the next level, a value of Transition. */
	#transition = Transition.HORIZONTAL_LINES;

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
		setupInput(canvas, this, {
			world: () => this.#world,
			replaying: () => this.#replayMode,
			stopTest: () => this.#endTest(),
		});

		this.#setWorld(new World()); // the input reads the player before the first level starts

		startLoop(
			() => this.#step(),
			() => render(this.#world, this.#editor),
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
		ui.mode = 'play';
		this.#startLevel(level, restart, recorded);
		unclick(input);
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
		this.#setWorld(World.forPreview(level));
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
		this.#setWorld(this.#editor.open(level));
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
		this.#setWorld(this.#editor.startTest(this.#world, this.#transition));
		this.#publish();
	}

	/**
	 * End the test run and go back to the editor.
	 *
	 * @returns {void}
	 */
	stopTest() {
		if (ui.mode != 'test') return;
		this.#endTest();
		this.#publish();
	}

	/**
	 * Stop the level time. Only a level before its end can pause. A replay keeps its input state for the resume.
	 *
	 * @returns {void}
	 */
	pause() {
		if (!canPause(this.#world) || ui.paused) return;
		ui.paused = true;
		if (this.#replayMode) {
			input.replayPauseInput = captureInput(this.#world);
			unclick(input);
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
		unclick(input);
		if (this.#replayMode) resumeReplay(this.#world, this.#replay);
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
		if (!this.#replayMode) return;
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
		if (ui.mode == 'edit') this.#editor.setBackground(this.#world, n);
	}

	/**
	 * Get the editor map, also while the stage shows something else.
	 *
	 * @returns {object} The editor map in the map file format without the format property, with a copy of the tiles.
	 */
	getMap() {
		return this.#editor.getMap(this.#world);
	}

	/**
	 * Remove all tiles, objects and other properties of the editor map.
	 *
	 * @returns {void}
	 */
	clearMap() {
		if (ui.mode == 'edit') this.#editor.clear(this.#world);
	}

	/**
	 * Go back to the editor map before the last change.
	 *
	 * @returns {void}
	 */
	undo() {
		if (ui.mode == 'edit') this.#editor.undo(this.#world);
	}

	/**
	 * Go forward to the editor map of the next change after an undo.
	 *
	 * @returns {void}
	 */
	redo() {
		if (ui.mode == 'edit') this.#editor.redo(this.#world);
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
	 * Show a World. The other modules reach the World through the binding in state.js.
	 *
	 * @param {World} world The World.
	 * @returns {void}
	 */
	#setWorld(world) {
		this.#world = world;
		setGame(world);
	}

	/**
	 * Start a level, or the playback of a replay of the level, with the pause and the keys released.
	 *
	 * @param {import('./level.js').Level} level The level.
	 * @param {boolean} restart True for a restart of the same level. A restart skips the waits of the events and the
	 *     entrance of the boss.
	 * @param {import('./replay.js').Replay|null} replay The replay to play, or null to let the player play.
	 * @returns {void}
	 */
	#startLevel(level, restart, replay) {
		this.#replayMode = replay !== null;
		this.#replay = replay ?? new Replay();
		this.#setWorld(World.forLevel(level, { restart, replay: this.#replayMode, transition: this.#transition }));
		ui.paused = false;
		input.keys = 0;
		input.oldKeys = 0;
	}

	/**
	 * Leave the current mode before a new command. A test run ends without the event "died".
	 *
	 * @returns {void}
	 */
	#leave() {
		if (ui.mode == 'test') this.#setWorld(this.#editor.stopTest(false));
		if (ui.mode == 'edit') this.#editor.leave(this.#world);
		ui.paused = false;
		this.#replayMode = false;
		this.#speed = 1;
		this.#world.events = null;
		this.#world.shakeX = 0;
		this.#world.shakeY = 0;
	}

	/**
	 * Run the ticks of one tick of real time and publish the state. Above the normal speed, the ticks start no sounds.
	 *
	 * @returns {void}
	 */
	#step() {
		setSoundMuted(this.#speed > 1);
		for (let i = 0; i < this.#speed; i++) this.#tick();
		setSoundMuted(false);
		this.#publish();
	}

	/**
	 * Run one tick in the current mode, and act on the outcome of a level tick. The death fade starts the level again,
	 * and the closing transition finishes the level or ends the test run.
	 *
	 * @returns {void}
	 */
	#tick() {
		const world = this.#world;
		if (manageKeys(world, this.#replay, this.#replayMode)) this.#stopBrokenReplay();
		if (ui.mode == 'edit') {
			this.#editor.update(world);
			return;
		}
		if ((ui.mode != 'play' && ui.mode != 'test') || ui.paused) return;

		world.tick(input);
		this.#transition = world.transition;
		if (!world.replaying) this.#replayMode = false;
		if (world.outcome == 'died') {
			this.#startLevel(world.level, true, null);
		} else if (world.outcome == 'brokenReplay') {
			this.#stopBrokenReplay();
		} else if (world.outcome == 'finished' && ui.mode == 'test') {
			this.#endTest();
		} else if (world.outcome == 'finished') {
			const replay = encodeReplay(this.#replay, world.level.campaign, world.level.number);
			stageEvents.push({ type: 'finished', detail: { time: world.time, replay } });
		}
	}

	/**
	 * End the test run and go back to the editor.
	 *
	 * @returns {void}
	 */
	#endTest() {
		this.#setWorld(this.#editor.stopTest());
	}

	/**
	 * Stop a replay that has fewer inputs than the level needs or in which the player died. The stage becomes idle and
	 * reports the broken replay with the event "brokenreplay".
	 *
	 * @returns {void}
	 */
	#stopBrokenReplay() {
		this.#replayMode = false;
		ui.mode = 'idle';
		stageEvents.push({ type: 'brokenreplay', detail: null });
	}

	/**
	 * Update the Value properties and dispatch the events of the tick. The speed and the volume of the music follow the
	 * phase of the boss fight.
	 *
	 * @returns {void}
	 */
	#publish() {
		const world = this.#world;
		this.mode.set(ui.mode);
		this.life.set(Math.max(world.player.life >> 8, 0));
		this.cakes.set(world.cakesLeft ?? 0);
		this.steps.set((world.steps ?? 0) >> 8);
		this.portals.set(world.portalShots ?? 0);
		const time = world.time ?? 0;
		this.time.set(world.isRunning() ? time - (time % TIME_UPDATE_INTERVAL) : time);
		this.paused.set(ui.paused);
		this.message.set(world.events?.message ?? null);
		this.speed.set(this.#speed);
		this.brush.set(this.#editor.brush);
		this.fps.set(getFps());
		const phase = ui.mode == 'play' ? (world.boss?.phase() ?? null) : null;
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
			world: () => this.#world,
			replay: () => this.#replay,
			endReplay: () => (this.#replayMode = false),
			input,
			tick: () => this.#step(),
			render: () => render(this.#world, this.#editor),
		};
	}
}
