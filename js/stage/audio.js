/**
 * Sound effects with the Web Audio API.
 *
 * Each sound is decoded once into an audio buffer, so the same sound can play more than once at the same time. Each
 * sound has its own gain node for its volume. Browsers block sound until the player clicks or presses a key on the
 * page, so the module creates the audio context on the first click or key press. Until then, an offline audio context
 * decodes the sounds.
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
 * Play a sound if the sound is on.
 *
 * @param {Sound} sound The sound.
 * @returns {void}
 */
export function playSound(sound) {
	if (!context || !isSoundOn() || !sound.buffer) return;
	const source = context.createBufferSource();
	source.buffer = sound.buffer;
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

window.addEventListener('pointerdown', resumeAudio);
window.addEventListener('keydown', resumeAudio);

/** @type {Sound} An object enters a portal. */
export let sfx_enterPortal;
/** @type {Sound} The player dies. */
export let sfx_flatline;
/** @type {Sound} A portal shot hits an invalid wall. */
export let sfx_noPortal;
/** @type {Sound} The player takes damage. */
export let sfx_pain;
/** @type {Sound} A turret shoots. */
export let sfx_shoot;

/** @type {Sound} A turret explodes. */
export let sfx_explode;
/** @type {Sound} The player jumps. */
export let sfx_jump;
/** @type {Sound} A plasma ball bounces. */
export let sfx_bounce;
/** @type {Sound} The player collects a cake. */
export let sfx_grabCake;

/** @type {Sound} The player throws an object. */
export let sfx_throwObject;
/** @type {Sound} A switch door opens or closes. */
export let sfx_tick;
/** @type {Sound} A level ends. */
export let sfx_transition;

/** @type {Sound[]} A portal is placed, two variants. */
export let sfx_portal;

/**
 * Start to load all sounds of the game.
 *
 * @returns {void}
 */
export function loadSfx() {
	sfx_explode = loadSound('explode');
	sfx_bounce = loadSound('bounce');
	sfx_grabCake = loadSound('grabCake');
	sfx_jump = loadSound('jump');
	sfx_throwObject = loadSound('throwObject');
	sfx_enterPortal = loadSound('enterPortal');
	sfx_transition = loadSound('transition');
	sfx_tick = loadSound('tick');
	sfx_pain = loadSound('pain');
	sfx_flatline = loadSound('flatline');
	sfx_noPortal = loadSound('noPortal');
	sfx_shoot = loadSound('shoot');
	sfx_portal = [loadSound('portal1'), loadSound('portal2')];
}
