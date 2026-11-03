/**
 * Sound effects with the Web Audio API.
 *
 * Each sound is decoded once into an audio buffer, so the same sound can play more than once at the same time. Each
 * sound has its own gain node for its volume. Browsers block sound until the player clicks or presses a key on the
 * page, so the module resumes the audio context on the first click or key press.
 */

import { loadSoundSetting, saveSoundSetting } from './storage.js';

/** @type {AudioContext} The audio context of the game. */
const context = new AudioContext();

/** @type {GainNode} The gain node that all sounds use. */
const master = context.createGain();
master.connect(context.destination);

/** @type {boolean} True if the player wants to hear the sounds. */
let enabled = loadSoundSetting();

/** @type {boolean} True if the player chose to play without sound on the loading screen. */
let disabled = false;

/** @type {number} The number of requested sounds. */
let requested = 0;

/** @type {number} The number of sounds that are loaded or failed. */
let done = 0;

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
		/** @type {GainNode} The volume of the sound. */
		this.gain = context.createGain();
		this.gain.connect(master);
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
export function loadSound(name) {
	const sound = new Sound(name);
	requested++;
	fetch(`sounds/${name}.ogg`)
		.then((response) => {
			if (!response.ok) throw new Error(`${response.status}`);
			return response.arrayBuffer();
		})
		.then((data) => context.decodeAudioData(data))
		.then((buffer) => {
			sound.buffer = buffer;
		})
		.catch((error) => console.error(`Could not load the sound ${name}`, error))
		.finally(() => done++);
	return sound;
}

/**
 * Play a sound if the sound is on.
 *
 * @param {Sound} sound The sound.
 * @returns {void}
 */
export function playSound(sound) {
	if (!isSoundOn() || !sound.buffer) return;
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
	sound.gain.gain.value = volume;
}

/**
 * Check if the sound is on.
 *
 * @returns {boolean} True if the game plays sounds.
 */
export function isSoundOn() {
	return enabled && !disabled;
}

/**
 * Check if the player can turn the sound on and off.
 *
 * @returns {boolean} False if the player chose to play without sound on the loading screen.
 */
export function isSoundAvailable() {
	return !disabled;
}

/**
 * Turn the sound on or off and store the setting.
 *
 * @returns {void}
 */
export function toggleSound() {
	if (disabled) return;
	enabled = !enabled;
	saveSoundSetting(enabled);
}

/**
 * Play the game without sound. The loading screen offers this if the sounds do not load.
 *
 * @returns {void}
 */
export function disableSound() {
	disabled = true;
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
 * Check if all sounds are loaded or failed, or if the player chose to play without sound.
 *
 * @returns {boolean} True if the game does not need to wait for sounds.
 */
export function allSoundsLoaded() {
	return disabled || (requested > 0 && done === requested);
}

/**
 * Resume the audio context after a click or key press of the player.
 *
 * @returns {void}
 */
function resumeAudio() {
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
