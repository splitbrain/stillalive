/**
 * Sound effects with the Web Audio API.
 *
 * Each sound is decoded once into an audio buffer, so the same sound can play more than once at the same time. Each
 * sound has its own gain node for its volume. Browsers block sound until the player clicks or presses a key on the
 * page, so the module creates the audio context on the first click or key press. It handles them in the capture
 * phase, so that no other handler can stop them before. Until then, an offline audio context decodes the sounds.
 */

/** @type {OfflineAudioContext} The context that decodes the sounds before the audio context exists. */
const decoder = new OfflineAudioContext(1, 1, 44100);

/** @type {AudioContext|null} The audio context of the game, or null before the first click or key press. */
let context = null;

/** @type {GainNode|null} The gain node that all sounds use. Its volume is 0 while the sound is off. */
let master = null;

/** @type {Sound[]} All sounds, so their gain nodes can be created with the audio context. */
const sounds = [];

/** @type {boolean} True if the player wants to hear the sounds. */
let enabled = true;

/** @type {boolean} True while no new sounds start, whatever the player wants. */
let muted = false;

/** @type {number} The number of requested sounds. */
let requested = 0;

/** @type {number} The number of sounds that are loaded or failed. */
let done = 0;

/** @type {string[]} The names of the sounds that could not be loaded. */
const missing = [];

/** @type {function(): void} Called each time a sound is loaded or failed. */
let onDone = () => {};

/**
 * A sound effect.
 */
class Sound {
	/**
	 * @param {string} name The file name of the sound without extension.
	 */
	constructor(name) {
		/** @type {string} The file name of the sound without extension. */
		this.name = name;
		/** @type {AudioBuffer|null} The decoded sound, or null until it is loaded. */
		this.buffer = null;
		/** @type {GainNode|null} The volume of the sound, or null before the audio context exists. */
		this.gain = null;
		/** @type {number} The volume of the sound, from 0 to 1. */
		this.volume = 1;
		/** @type {number} The number of playbacks of the sound that have not ended. */
		this.playing = 0;
		/** @type {AudioBufferSourceNode|null} The playback of the sound as a loop, or null while no loop plays. */
		this.loop = null;
		/** @type {number} The time of performance.now() until which the loop plays on, in milliseconds. */
		this.loopUntil = 0;
		/** @type {boolean} True if the loop plays to the end of the sound when it stops, false if it stops at once. */
		this.finishLoop = false;
	}
}

/**
 * Start to load a sound.
 *
 * @param {string} name The file name of the sound in the sounds folder, without extension.
 * @returns {Sound} The sound. It plays nothing until it is loaded.
 */
function loadSound(name) {
	const sound = new Sound(name);
	sounds.push(sound);
	if (context) connectSound(sound);
	requested++;
	fetch(`sounds/${name}.ogg`)
		.then((response) => {
			if (!response.ok) throw new Error(`${response.status}`);
			return response.arrayBuffer();
		})
		.then((data) => decoder.decodeAudioData(data))
		.then((buffer) => {
			sound.buffer = buffer;
		})
		.catch((error) => {
			missing.push(name);
			console.error(`Could not load the sound ${name}`, error);
		})
		.finally(() => {
			done++;
			onDone();
		});
	return sound;
}

/**
 * Play a sound if the sound is on and new sounds can start.
 *
 * @param {Sound} sound The sound.
 * @param {number} rate The playback rate: 1 for the normal speed and pitch, less for slower and lower, more for faster
 *     and higher.
 * @returns {void}
 */
export function playSound(sound, rate = 1) {
	if (!context || !isSoundOn() || muted || !sound.buffer) return;
	const source = context.createBufferSource();
	source.buffer = sound.buffer;
	source.playbackRate.value = rate;
	source.connect(sound.gain);
	sound.playing++;
	source.addEventListener('ended', () => sound.playing--);
	source.start();
}

/**
 * Play a sound if the sound is on and the same sound does not play.
 *
 * @param {Sound} sound The sound.
 * @returns {void}
 */
export function playSoundIfFinished(sound) {
	if (sound.playing === 0) playSound(sound);
}

/** @type {number} The time that a loop plays on after the last call of playLoop, in milliseconds. */
const LOOP_HOLD = 100;

/**
 * Keep a sound playing as a loop. Call it in each tick while the loop should play: the loop starts on the first call
 * and stops a short time after the last call, so a pause or the end of the level also stops it. A sound with finishLoop
 * plays to its end before the loop stops.
 *
 * @param {Sound} sound The sound.
 * @returns {void}
 */
export function playLoop(sound) {
	if (muted) return;
	sound.loopUntil = performance.now() + LOOP_HOLD;
	if (sound.loop || !context || !isSoundOn() || !sound.buffer) return;
	const source = context.createBufferSource();
	source.buffer = sound.buffer;
	source.loop = true;
	source.connect(sound.gain);
	source.start();
	sound.loop = source;
}

/**
 * Stop the loops that playLoop did not keep alive.
 *
 * @returns {void}
 */
function stopOldLoops() {
	for (const sound of sounds) {
		if (sound.loop && performance.now() > sound.loopUntil) {
			if (sound.finishLoop) sound.loop.loop = false;
			else sound.loop.stop();
			sound.loop = null;
		}
	}
}

setInterval(stopOldLoops, LOOP_HOLD / 2);

/**
 * Get a random playback rate near the normal speed, so that a repeated sound does not sound the same each time.
 *
 * @param {number} range The largest change of the rate, e.g. 0.1 for rates from 0.9 to 1.1.
 * @returns {number} The playback rate.
 */
export function randomRate(range) {
	return 1 + (Math.random() * 2 - 1) * range;
}

/**
 * Set the volume of a sound. The volume applies to all playbacks of the sound, also to the playing ones.
 *
 * @param {Sound} sound The sound.
 * @param {number} volume The volume, from 0 to 1.
 * @returns {void}
 */
export function setSoundVolume(sound, volume) {
	sound.volume = volume;
	if (sound.gain) sound.gain.gain.value = volume;
}

/**
 * Check if the sound is on.
 *
 * @returns {boolean} True if the game plays sounds.
 */
function isSoundOn() {
	return enabled;
}

/**
 * Turn the sound on or off.
 *
 * @param {boolean} on True to play the sounds.
 * @returns {void}
 */
export function setSoundOn(on) {
	enabled = on;
	updateMasterVolume();
}

/**
 * Stop or allow the start of new sounds. The sounds that play continue, and the loops end. The setting of the player
 * does not change.
 *
 * @param {boolean} on True to start no new sounds.
 * @returns {void}
 */
export function setSoundMuted(on) {
	muted = on;
}

/**
 * Set the function that is called each time a sound is loaded or failed.
 *
 * @param {function(): void} callback The function.
 * @returns {void}
 */
export function onSoundDone(callback) {
	onDone = callback;
}

/**
 * Get the loading progress of the sounds.
 *
 * @returns {number} The share of loaded or failed sounds, from 0 to 1.
 */
export function soundProgress() {
	return requested === 0 ? 0 : done / requested;
}

/**
 * Check if all sounds are loaded or failed.
 *
 * @returns {boolean} True if the game does not need to wait for sounds.
 */
export function allSoundsLoaded() {
	return requested > 0 && done === requested;
}

/**
 * Get the sounds that could not be loaded.
 *
 * @returns {string[]} The names of the missing sounds.
 */
export function missingSounds() {
	return missing;
}

/**
 * Set the master volume from the sound setting. Turning the sound off also silences the sounds that play.
 *
 * @returns {void}
 */
function updateMasterVolume() {
	if (master) master.gain.value = isSoundOn() ? 1 : 0;
}

/**
 * Create the gain node of a sound and connect it to the master gain node.
 *
 * @param {Sound} sound The sound.
 * @returns {void}
 */
function connectSound(sound) {
	sound.gain = context.createGain();
	sound.gain.gain.value = sound.volume;
	sound.gain.connect(master);
}

/**
 * Create the audio context on the first click or key press of the player, and resume it if the browser suspended it.
 *
 * @returns {void}
 */
function resumeAudio() {
	if (!context) {
		context = new AudioContext();
		master = context.createGain();
		master.connect(context.destination);
		updateMasterVolume();
		sounds.forEach(connectSound);
	}
	if (context.state === 'suspended') context.resume();
}

window.addEventListener('pointerdown', resumeAudio, { capture: true });
window.addEventListener('keydown', resumeAudio, { capture: true });

/** @type {Sound} An object enters a portal. */
export let sfx_enterPortal;
/** @type {Sound} The player dies. */
export let sfx_die;
/** @type {Sound} The player dies in acid. */
export let sfx_acid;
/** @type {Sound} A portal shot hits an invalid wall. */
export let sfx_noPortal;
/** @type {Sound} The portals are removed. */
export let sfx_cancelPortals;
/** @type {Sound} A turret shoots. */
export let sfx_shoot;
/** @type {Sound} The player is hit by a shot. */
export let sfx_pain;
/** @type {Sound} A turret explodes. */
export let sfx_explode;
/** @type {Sound} The player jumps. */
export let sfx_jump;
/** @type {Sound} The player lands after a jump or a fall. */
export let sfx_land;
/** @type {Sound[]} The player makes a step, thirteen variants. */
export let sfx_step;
/** @type {Sound[]} The player makes a step on ice, four variants. */
export let sfx_iceStep;
/** @type {Sound} The player floats in the field of a gravitational pipe, as a loop. */
export let sfx_float;
/** @type {Sound} A plasma ball bounces. */
export let sfx_bounce;
/** @type {Sound} The player collects a cake. */
export let sfx_grabCake;
/** @type {Sound} The exit opens. */
export let sfx_exit;
/** @type {Sound} The player picks up an object. */
export let sfx_pickUp;
/** @type {Sound} The player throws an object. */
export let sfx_throwObject;
/** @type {Sound} A crate lands. */
export let sfx_crateLand;
/** @type {Sound} A crate dissolves in a force field. */
export let sfx_dissolve;
/** @type {Sound} A switch force field goes on or off. */
export let sfx_field;
/** @type {Sound} A plasma force field goes off. */
export let sfx_plasmaField;
/** @type {Sound} The screen shakes while the boss comes in or after its death, as a loop. */
export let sfx_bossRumble;
/** @type {Sound} The alarm while the boss comes in, as a loop on top of the rumble. */
export let sfx_bossAlarm;
/** @type {Sound} An object hits the boss. */
export let sfx_bossHit;
/** @type {Sound} A crate hits the yellow wall of a boss level, and the wall cracks. */
export let sfx_wallCrack;
/** @type {Sound} A crate hits the yellow wall of a boss level, and the wall falls apart. */
export let sfx_wallBreak;
/** @type {Sound} A razor wheel of the boss sticks in a wall or the floor. */
export let sfx_bladeStick;
/** @type {Sound} A level ends. */
export let sfx_transition;
/** @type {Sound} The player clicks a menu button. */
export let sfx_click;
/** @type {Sound} The pointer or the keyboard focus moves onto a menu button. */
export let sfx_hover;
/** @type {Sound} The narrator types a character. */
export let sfx_tick;
/** @type {Sound[]} A portal is placed, two variants. */
export let sfx_portal;

/**
 * Start to load all sounds of the game, and set the volume of the quiet sounds.
 *
 * @returns {void}
 */
export function loadSfx() {
	sfx_explode = loadSound('explode');
	sfx_bounce = loadSound('bounce');
	sfx_grabCake = loadSound('grabCake');
	sfx_exit = loadSound('exit');
	sfx_jump = loadSound('jump');
	sfx_land = loadSound('land');
	sfx_step = Array.from({ length: 13 }, (_, n) => loadSound(`step${n + 1}`));
	sfx_iceStep = Array.from({ length: 4 }, (_, n) => loadSound(`iceStep${n + 1}`));
	sfx_float = loadSound('float');
	sfx_pickUp = loadSound('pickUp');
	sfx_throwObject = loadSound('throwObject');
	sfx_crateLand = loadSound('crateLand');
	sfx_dissolve = loadSound('dissolve');
	sfx_enterPortal = loadSound('enterPortal');
	sfx_transition = loadSound('transition');
	sfx_field = loadSound('field');
	sfx_plasmaField = loadSound('plasmaField');
	sfx_die = loadSound('die');
	sfx_acid = loadSound('acid');
	sfx_noPortal = loadSound('noPortal');
	sfx_cancelPortals = loadSound('cancelPortals');
	sfx_bossHit = loadSound('bossHit');
	sfx_bossRumble = loadSound('bossRumble');
	sfx_bossAlarm = loadSound('bossAlarm');
	sfx_wallCrack = loadSound('wallCrack');
	sfx_wallBreak = loadSound('wallBreak');
	sfx_bladeStick = loadSound('bladeStick');
	sfx_shoot = loadSound('shoot');
	sfx_pain = loadSound('pain');
	sfx_click = loadSound('click');
	sfx_hover = loadSound('hover');
	sfx_tick = loadSound('tick');
	sfx_portal = [loadSound('portal1'), loadSound('portal2')];
	sfx_step.concat(sfx_iceStep).forEach((sound) => setSoundVolume(sound, 0.25));
	setSoundVolume(sfx_jump, 0.2);
	setSoundVolume(sfx_land, 0.35);
	setSoundVolume(sfx_tick, 0.2);
	setSoundVolume(sfx_wallBreak, 0.25);
	sfx_bossAlarm.finishLoop = true;
}
