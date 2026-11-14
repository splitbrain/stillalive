/**
 * Sound effects and music with the Web Audio API.
 */

/** @type {OfflineAudioContext} The context that decodes the sounds and the level music. */
const decoder = new OfflineAudioContext(1, 1, 44100);

/** @type {AudioContext|null} The audio context of the game, or null before the first click or key press. */
let context = null;

/** @type {GainNode|null} The gain node that all sounds use. Its volume is 0 while the sound is off. */
let master = null;

/** @type {Sound[]} All sounds, so their gain nodes can be created with the audio context. */
const sounds = [];

/** @type {boolean} True if the player wants to hear the sounds. */
let enabled = true;

/** @type {boolean} True while new sounds cannot start. The sound setting of the player stays the same. */
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
	 * Create a sound that is not loaded yet.
	 *
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
 * @param {number} [rate] The playback rate. 1 is the normal speed and pitch, less is slower and lower, and more is
 *     faster and higher.
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

/** @type {number} The time that a loop plays on after the last call of playLoop(), in milliseconds. */
const LOOP_HOLD = 100;

/**
 * Keep a sound playing as a loop. The game calls this function in each tick while the loop plays. The loop stops a
 * short time after the last call, e.g. at a pause or at the end of the level. A sound with finishLoop plays to its end
 * before the loop stops.
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
 * Stop the loops that had no call of playLoop() for the time LOOP_HOLD.
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
export function isSoundOn() {
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

/** @type {string} The file of the music of the levels, a loop. */
const LEVEL_MUSIC_FILE = 'music/level.ogg';

/** @type {string} The file of the music of the menus and the other screens, a loop. */
const MENU_MUSIC_FILE = 'music/menu.ogg';

/** @type {number} The volume of the music, from 0 to 1, so that the sounds stay louder than the music. */
const MUSIC_VOLUME = 0.35;

/** @type {number} The share of the music volume that the menu music plays with. */
const MENU_MUSIC_SHARE = 0.7;

/** @type {number} The time of the fade when the music starts or stops, in seconds. */
const MUSIC_FADE = 1;

/** @type {number} The time of the glide to a new speed of the music, in seconds. */
const MUSIC_GLIDE = 1.5;

/** @type {number} The time of the fade to a new duck volume of the music, in seconds. */
const MUSIC_DUCK_FADE = 0.5;

/** @type {AudioBuffer|null} The decoded music of the levels, or null until it is loaded. */
let levelBuffer = null;

/**
 * @type {{source: AudioBufferSourceNode, fade: GainNode}|null} The playback of the level music with the gain node of
 *     its fade, or null while the level music does not play.
 */
let levelPlayback = null;

/** @type {HTMLAudioElement} The audio element of the menu music. It has no source before the music loads. */
const menuElement = new Audio();
menuElement.loop = true;

/** @type {GainNode|null} The gain node of the fade of the menu music, or null before the audio context exists. */
let menuFade = null;

/** @type {boolean} True while the menu music plays or fades in. */
let menuPlaying = false;

/** @type {number} The timer that pauses the menu music at the end of its fade. */
let menuPauseTimer = 0;

/** @type {boolean} True after the music started to load. */
let musicRequested = false;

/** @type {GainNode|null} The gain node of all music, or null before the audio context exists. */
let musicGain = null;

/** @type {boolean} True if the player wants to hear the music. */
let musicEnabled = true;

/** @type {string|null} The chosen music. "level" is the level music, "menu" is the menu music, null is no music. */
let musicTrack = null;

/** @type {number} The playback rate of the level music. 1 is the normal speed and pitch, more is faster and higher. */
let musicRate = 1;

/** @type {number} The share of the music volume that plays, from 0 to 1. */
let musicDuck = 1;

/**
 * Start to load the music, once. The level music is decoded, so that it loops without a gap and can change its speed.
 * The menu music streams from its audio element.
 *
 * @returns {void}
 */
function loadMusic() {
	if (musicRequested) return;
	musicRequested = true;
	menuElement.src = MENU_MUSIC_FILE;
	fetch(LEVEL_MUSIC_FILE)
		.then((response) => {
			if (!response.ok) throw new Error(`${response.status}`);
			return response.arrayBuffer();
		})
		.then((data) => decoder.decodeAudioData(data))
		.then((buffer) => {
			levelBuffer = buffer;
			updateMusic();
		})
		.catch((error) => console.error('Could not load the level music', error));
}

/**
 * Turn the music on or off. The music loads when it is on the first time.
 *
 * @param {boolean} on True to play the chosen music.
 * @returns {void}
 */
export function setMusicOn(on) {
	musicEnabled = on;
	if (on) loadMusic();
	updateMusic();
}

/**
 * Choose the music to play. The music that stops fades out while the new music fades in. A new start plays the music
 * from the beginning.
 *
 * @param {string|null} track "level" for the level music, "menu" for the menu music, or null for no music.
 * @returns {void}
 */
export function setMusicPlaying(track) {
	musicTrack = track;
	updateMusic();
}

/**
 * Set the speed and the volume of the music. The speed applies to the level music. Both values change gradually to
 * the new value.
 *
 * @param {number} rate The playback rate: 1 for the normal speed and pitch, more for faster and higher.
 * @param {number} duck The share of the music volume that plays, from 0 to 1.
 * @returns {void}
 */
export function setMusicMood(rate, duck) {
	if (rate !== musicRate) {
		musicRate = rate;
		if (levelPlayback) rampTo(levelPlayback.source.playbackRate, rate, MUSIC_GLIDE);
	}
	if (duck !== musicDuck) {
		musicDuck = duck;
		if (musicGain) rampTo(musicGain.gain, MUSIC_VOLUME * duck, MUSIC_DUCK_FADE);
	}
}

/**
 * Start the music that should play and does not, and stop the music that plays and should not.
 *
 * @returns {void}
 */
function updateMusic() {
	if (!context) return;
	const track = musicEnabled ? musicTrack : null;
	updateLevelMusic(track === 'level');
	updateMenuMusic(track === 'menu');
}

/**
 * Start or stop the level music. Each start makes a new playback of the decoded music.
 *
 * @param {boolean} play True if the level music should play.
 * @returns {void}
 */
function updateLevelMusic(play) {
	play = play && levelBuffer !== null;
	if (play === (levelPlayback !== null)) return;
	if (play) {
		const source = context.createBufferSource();
		source.buffer = levelBuffer;
		source.loop = true;
		// Chrome 152 does not go back to the start of a long buffer when the loop ends at the end of the buffer
		source.loopEnd = (levelBuffer.length - 1) / levelBuffer.sampleRate;
		source.playbackRate.value = musicRate;
		const fade = context.createGain();
		fade.gain.value = 0;
		source.connect(fade);
		fade.connect(musicGain);
		source.start();
		rampTo(fade.gain, 1, MUSIC_FADE);
		levelPlayback = { source, fade };
	} else {
		rampTo(levelPlayback.fade.gain, 0, MUSIC_FADE);
		levelPlayback.source.stop(context.currentTime + MUSIC_FADE);
		levelPlayback = null;
	}
}

/**
 * Start or stop the menu music. The audio element pauses at the end of the fade out. A start during the fade out
 * fades the music in again where it is.
 *
 * @param {boolean} play True if the menu music should play.
 * @returns {void}
 */
function updateMenuMusic(play) {
	if (play === menuPlaying) return;
	menuPlaying = play;
	clearTimeout(menuPauseTimer);
	if (play) {
		if (menuElement.paused) {
			menuElement.currentTime = 0;
			menuElement.play().catch((error) => console.error('Could not play the menu music', error));
		}
		rampTo(menuFade.gain, MENU_MUSIC_SHARE, MUSIC_FADE);
	} else {
		rampTo(menuFade.gain, 0, MUSIC_FADE);
		menuPauseTimer = setTimeout(() => menuElement.pause(), MUSIC_FADE * 1000);
	}
}

/**
 * Create the gain nodes of the music and connect the audio element of the menu music.
 *
 * @returns {void}
 */
function connectMusic() {
	musicGain = context.createGain();
	musicGain.gain.value = MUSIC_VOLUME * musicDuck;
	musicGain.connect(context.destination);
	menuFade = context.createGain();
	menuFade.gain.value = 0;
	menuFade.connect(musicGain);
	context.createMediaElementSource(menuElement).connect(menuFade);
	updateMusic();
}

/**
 * Change an audio parameter in a straight line from its current value to a new value.
 *
 * @param {AudioParam} param The audio parameter.
 * @param {number} value The new value.
 * @param {number} time The time of the change in seconds.
 * @returns {void}
 */
function rampTo(param, value, time) {
	const now = context.currentTime;
	param.cancelScheduledValues(now);
	param.setValueAtTime(param.value, now);
	param.linearRampToValueAtTime(value, now + time);
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
		connectMusic();
	}
	if (context.state === 'suspended') context.resume();
}

// The capture phase lets the handler run before other handlers can stop the event.
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
	sfx_step = Array.from({ length: 13 }, (_, i) => loadSound(`step${i + 1}`));
	sfx_iceStep = Array.from({ length: 4 }, (_, i) => loadSound(`iceStep${i + 1}`));
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
	for (const sound of [...sfx_step, ...sfx_iceStep]) setSoundVolume(sound, 0.25);
	setSoundVolume(sfx_jump, 0.2);
	setSoundVolume(sfx_land, 0.35);
	setSoundVolume(sfx_tick, 0.2);
	setSoundVolume(sfx_wallBreak, 0.25);
	sfx_bossAlarm.finishLoop = true;
}
