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
import { InputState } from './InputState.js';
import { setupInput } from './input.js';
import { getFps, startLoop } from './loop.js';
import { Renderer } from './render/Renderer.js';
import { PlaySession } from './PlaySession.js';
import { PreviewSession } from './PreviewSession.js';
import { decodeReplay } from './replay.js';
import { Value } from '../value.js';
import { toPixels } from './utils.js';

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
 * A mode of the stage: a PlaySession, a PreviewSession or the Editor.
 *
 * @typedef {object} Session
 * @property {string} mode The mode text: "play" or "test" for a PlaySession, "preview" for a PreviewSession and "edit"
 *     for the Editor.
 * @property {import('./World.js').World} world The World that the session shows.
 * @property {function(): void} tick The function that runs one tick of the session, with the input of the tick.
 * @property {function(Renderer): void} draw The function that draws the session with the methods of the Renderer.
 */

/**
 * The game stage. It plays a level, shows the preview of a level or opens the editor on a map. Each of these is a
 * session: a PlaySession, a PreviewSession or the Editor. Without a session, the stage is idle.
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
	/** @type {InputState} The keys and the mouse, and the changes of each tick. */
	#input = new InputState();
	/** @type {Editor} The level editor. It keeps the editor map while the stage shows something else. */
	#editor = new Editor(this.#input);
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

	/** @type {Session|null} The session that the stage shows, or null for an idle stage. */
	#session = null;

	/** @type {Renderer} The drawing of the stage. */
	#renderer = new Renderer(this.#input);

	/** @type {number} The effect of the opening transition of the next level, a value of Transition. */
	#transition = Transition.HORIZONTAL_LINES;

	/** @type {{type: string, detail: *}[]} The events of the sessions that the next publication dispatches. */
	#events = [];

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
		setupInput(canvas, this, this.#input, {
			escape: () => this.#onEscape(),
			enter: () => this.#onEnter(),
			focusLost: () => this.#onFocusLost(),
		});

		startLoop(
			() => this.#step(),
			() => this.#renderer.render(this.#session),
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
		this.#session = new PlaySession(level, {
			input: this.#input,
			report: (type, detail) => this.#onSessionEvent(type, detail),
			transition: this.#transition,
			replay: recorded,
			restart,
		});
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
		this.#session = new PreviewSession(level, this.#input);
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
		this.#session = this.#editor;
		this.#publish();
	}

	/**
	 * Run the editor map as a level. The level restarts when the player dies. The end of the exit transition and the
	 * Escape and Enter keys end the test run and go back to the editor.
	 *
	 * @returns {void}
	 */
	test() {
		if (this.#session !== this.#editor) return;
		this.#session = new PlaySession(this.#editor.testLevel(), {
			input: this.#input,
			report: (type, detail) => this.#onSessionEvent(type, detail),
			transition: this.#transition,
			testRun: true,
		});
		this.#publish();
	}

	/**
	 * End the test run and go back to the editor.
	 *
	 * @returns {void}
	 */
	stopTest() {
		if (!this.#play?.testRun) return;
		this.#play.endTest();
		this.#publish();
	}

	/**
	 * Stop the level time. Only a level before its end can pause. A replay keeps its input state for the resume.
	 *
	 * @returns {void}
	 */
	pause() {
		if (this.#play?.pause()) this.#publish();
	}

	/**
	 * Continue the level time after a pause.
	 *
	 * @returns {void}
	 */
	resume() {
		if (this.#play?.resume()) this.#publish();
	}

	/**
	 * Set the speed of the playback of a replay. Only a speed of 1 plays the sounds of the game. The speed changes only
	 * during a replay.
	 *
	 * @param {number} speed The number of ticks for each tick of real time: 1, 2 or 4.
	 * @returns {void}
	 */
	setSpeed(speed) {
		if (!this.#play?.replaying) return;
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
		if (this.#session === this.#editor) this.#editor.setBackground(n);
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
		if (this.#session === this.#editor) this.#editor.clear();
	}

	/**
	 * Go back to the editor map before the last change.
	 *
	 * @returns {void}
	 */
	undo() {
		if (this.#session === this.#editor) this.#editor.undo();
	}

	/**
	 * Go forward to the editor map of the next change after an undo.
	 *
	 * @returns {void}
	 */
	redo() {
		if (this.#session === this.#editor) this.#editor.redo();
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
	 * Get the play session that the stage shows.
	 *
	 * @returns {PlaySession|null} The session in the mode "play" or "test", else null.
	 */
	get #play() {
		return this.#session instanceof PlaySession ? this.#session : null;
	}

	/**
	 * Leave the current session before a new command. A test run ends without the event "died", and the editor
	 * continues with its own map.
	 *
	 * @returns {void}
	 */
	#leave() {
		const play = this.#play;
		if (play) {
			play.endPlayback();
			if (play.testRun) this.#editor.open();
		}
		this.#session = null;
		this.#speed = 1;
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
	 * Run one tick of the current session. Without a session, only the input changes. The stage keeps the transition
	 * effect of the last level for the next play session.
	 *
	 * @returns {void}
	 */
	#tick() {
		const play = this.#play;
		if (this.#session) {
			this.#session.tick();
		} else {
			this.#input.update();
			this.#input.endTick();
		}
		if (play) this.#transition = play.transition;
	}

	/**
	 * Act on an event of a play session. The events "replaystop" and "focuslost" go to the page at once. The other
	 * events go to the page with the next publication: "died" after the stage went back to the editor, and
	 * "brokenreplay" after the stage became idle.
	 *
	 * @param {string} type The event type.
	 * @param {{time: number, replay: object}|null} detail The level time and the replay of the event "finished", else
	 *     null.
	 * @returns {void}
	 */
	#onSessionEvent(type, detail) {
		if (type === 'replaystop' || type === 'focuslost') {
			this.dispatchEvent(new Event(type));
			return;
		}
		if (type === 'died') {
			this.#editor.open();
			this.#session = this.#editor;
		} else if (type === 'brokenreplay') {
			this.#session = null;
		}
		this.#events.push({ type, detail });
	}

	/**
	 * Handle the release of the Escape key. The play session decides what the key does. A change of the pause shows at
	 * once.
	 *
	 * @returns {void}
	 */
	#onEscape() {
		if (this.#play?.onEscape()) this.#publish();
	}

	/**
	 * Handle the release of the Enter key. It ends a test run, and the next frame publishes the end.
	 *
	 * @returns {void}
	 */
	#onEnter() {
		this.#play?.endTest();
	}

	/**
	 * Release all keys and mouse buttons when the game loses the focus. The release events of these keys do not reach
	 * the game. A play session decides itself, because a replay keeps the keys of the recording.
	 *
	 * @returns {void}
	 */
	#onFocusLost() {
		if (this.#play) this.#play.onFocusLost();
		else this.#input.keys = 0;
	}

	/**
	 * Update the Value properties from the session and dispatch the events of the sessions. Without a session, the
	 * life, the cakes, the steps, the portal shots and the time keep their last values. The speed and the volume of the
	 * music follow the phase of the boss fight.
	 *
	 * @returns {void}
	 */
	#publish() {
		const session = this.#session;
		const world = session?.world;
		this.mode.set(session?.mode ?? 'idle');
		if (world) {
			this.life.set(Math.max(world.player.lifePoints, 0));
			this.cakes.set(world.cakesLeft);
			this.steps.set(toPixels(world.steps));
			this.portals.set(world.portalShots);
			const time = world.time;
			this.time.set(world.isRunning() ? time - (time % TIME_UPDATE_INTERVAL) : time);
		}
		this.paused.set(this.#play?.paused ?? false);
		this.message.set(world?.events?.message ?? null);
		this.speed.set(this.#speed);
		this.brush.set(this.#editor.brush);
		this.fps.set(getFps());
		const phase = session?.mode === 'play' ? (world.boss?.phase() ?? null) : null;
		setMusicMood(
			phase === 'fight' ? BOSS_MUSIC_RATE : 1,
			phase === 'coming' || phase === 'leaving' ? BOSS_MUSIC_DUCK : 1,
		);

		const events = this.#events.splice(0);
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
			world: () => this.#session?.world ?? null,
			replay: () => this.#play?.source?.replay,
			endReplay: () => this.#play?.endPlayback(),
			input: this.#input,
			tick: () => this.#step(),
			render: () => this.#renderer.render(this.#session),
		};
	}
}
