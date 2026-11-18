/**
 * Sound effects and music with the Web Audio API.
 */

/** @type {OfflineAudioContext|null} The context that decodes the sounds and the music, or null before it is needed. */
let decoder = null;

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

/** @type {() => void} Called each time a sound is loaded or failed. */
let onDone = () => {};

/**
 * A sound effect.
 */
class Sound {
	/**
	 * Create a sound that is not loaded yet, and add it to the list of all sounds.
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
		sounds.push(this);
	}
}

/**
 * Decode the data of a sound file.
 *
 * @param {ArrayBuffer} data The content of the file.
 * @returns {Promise<AudioBuffer>} The decoded sound.
 */
function decode(data) {
	decoder ??= new OfflineAudioContext(1, 1, 44100);
	return decoder.decodeAudioData(data);
}

/**
 * Start to load a sound from the sounds folder. The sound plays nothing until it is loaded.
 *
 * @param {Sound} sound The sound.
 * @returns {void}
 */
function fetchSound(sound) {
	requested++;
	fetch(`sounds/${sound.name}.ogg`)
		.then((response) => {
			if (!response.ok) throw new Error(`${response.status}`);
			return response.arrayBuffer();
		})
		.then(decode)
		.then((buffer) => {
			sound.buffer = buffer;
		})
		.catch((error) => {
			missing.push(sound.name);
			console.error(`Could not load the sound ${sound.name}`, error);
		})
		.finally(() => {
			done++;
			onDone();
		});
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
	if (!context || !isSoundOn() || muted || !sound.buffer || !sound.gain) return;
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
	if (sound.loop || !context || !isSoundOn() || !sound.buffer || !sound.gain) return;
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
 * @param {() => void} callback The function.
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
 * @param {AudioContext} audio The audio context.
 * @param {GainNode} output The master gain node.
 * @returns {void}
 */
function connectSound(sound, audio, output) {
	const gain = audio.createGain();
	gain.gain.value = sound.volume;
	gain.connect(output);
	sound.gain = gain;
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

/** @type {HTMLAudioElement|null} The audio element of the menu music, or null before the first use. */
let menuElement = null;

/** @type {GainNode|null} The gain node of the fade of the menu music, or null before the audio context exists. */
let menuFade = null;

/** @type {boolean} True while the menu music plays or fades in. */
let menuPlaying = false;

/** @type {number} The timer that pauses the menu music at the end of its fade. */
let menuPauseTimer = 0;

/**
 * Get the audio element of the menu music, and create it on the first call. It has no source before the music loads.
 *
 * @returns {HTMLAudioElement} The audio element.
 */
function menuMusic() {
	if (!menuElement) {
		menuElement = new Audio();
		menuElement.loop = true;
	}
	return menuElement;
}

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
	menuMusic().src = MENU_MUSIC_FILE;
	fetch(LEVEL_MUSIC_FILE)
		.then((response) => {
			if (!response.ok) throw new Error(`${response.status}`);
			return response.arrayBuffer();
		})
		.then(decode)
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
		if (context && levelPlayback) rampTo(context, levelPlayback.source.playbackRate, rate, MUSIC_GLIDE);
	}
	if (duck !== musicDuck) {
		musicDuck = duck;
		if (context && musicGain) rampTo(context, musicGain.gain, MUSIC_VOLUME * duck, MUSIC_DUCK_FADE);
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
	updateLevelMusic(context, track === 'level');
	updateMenuMusic(context, track === 'menu');
}

/**
 * Start or stop the level music. Each start makes a new playback of the decoded music. The music plays only after
 * it is decoded; the music gain node exists together with the audio context.
 *
 * @param {AudioContext} audio The audio context.
 * @param {boolean} play True if the level music should play.
 * @returns {void}
 */
function updateLevelMusic(audio, play) {
	if (play && levelBuffer && musicGain && !levelPlayback) {
		const source = audio.createBufferSource();
		source.buffer = levelBuffer;
		source.loop = true;
		// Chrome 152 does not go back to the start of a long buffer when the loop ends at the end of the buffer
		source.loopEnd = (levelBuffer.length - 1) / levelBuffer.sampleRate;
		source.playbackRate.value = musicRate;
		const fade = audio.createGain();
		fade.gain.value = 0;
		source.connect(fade);
		fade.connect(musicGain);
		source.start();
		rampTo(audio, fade.gain, 1, MUSIC_FADE);
		levelPlayback = { source, fade };
	} else if (!(play && levelBuffer) && levelPlayback) {
		rampTo(audio, levelPlayback.fade.gain, 0, MUSIC_FADE);
		levelPlayback.source.stop(audio.currentTime + MUSIC_FADE);
		levelPlayback = null;
	}
}

/**
 * Start or stop the menu music. The audio element pauses at the end of the fade out. A start during the fade out
 * fades the music in again where it is. The fade node exists together with the audio context.
 *
 * @param {AudioContext} audio The audio context.
 * @param {boolean} play True if the menu music should play.
 * @returns {void}
 */
function updateMenuMusic(audio, play) {
	if (play === menuPlaying || !menuFade) return;
	menuPlaying = play;
	clearTimeout(menuPauseTimer);
	const element = menuMusic();
	if (play) {
		if (element.paused) {
			element.currentTime = 0;
			element.play().catch((error) => console.error('Could not play the menu music', error));
		}
		rampTo(audio, menuFade.gain, MENU_MUSIC_SHARE, MUSIC_FADE);
	} else {
		rampTo(audio, menuFade.gain, 0, MUSIC_FADE);
		menuPauseTimer = window.setTimeout(() => element.pause(), MUSIC_FADE * 1000);
	}
}

/**
 * Create the gain nodes of the music and connect the audio element of the menu music.
 *
 * @param {AudioContext} audio The audio context.
 * @returns {void}
 */
function connectMusic(audio) {
	const gain = audio.createGain();
	gain.gain.value = MUSIC_VOLUME * musicDuck;
	gain.connect(audio.destination);
	const fade = audio.createGain();
	fade.gain.value = 0;
	fade.connect(gain);
	audio.createMediaElementSource(menuMusic()).connect(fade);
	musicGain = gain;
	menuFade = fade;
	updateMusic();
}

/**
 * Change an audio parameter in a straight line from its current value to a new value.
 *
 * @param {AudioContext} audio The audio context, for the current time.
 * @param {AudioParam} param The audio parameter.
 * @param {number} value The new value.
 * @param {number} time The time of the change in seconds.
 * @returns {void}
 */
function rampTo(audio, param, value, time) {
	const now = audio.currentTime;
	param.cancelScheduledValues(now);
	param.setValueAtTime(param.value, now);
	param.linearRampToValueAtTime(value, now + time);
}

/**
 * Create the audio context on the first click or key press of the player, and resume it if the browser suspended it.
 * The creation also starts the timer that stops the old loops.
 *
 * @returns {void}
 */
function resumeAudio() {
	if (!context) {
		const audio = new AudioContext();
		const output = audio.createGain();
		output.connect(audio.destination);
		context = audio;
		master = output;
		updateMasterVolume();
		for (const sound of sounds) connectSound(sound, audio, output);
		connectMusic(audio);
		setInterval(stopOldLoops, LOOP_HOLD / 2);
	}
	if (context.state === 'suspended') context.resume();
}

/**
 * Start to wait for the first click or key press of the player, which creates the audio context. Each later click or
 * key press resumes the audio context if the browser suspended it.
 *
 * @returns {void}
 */
export function watchAudioUnlock() {
	// The capture phase lets the handler run before other handlers can stop the event.
	window.addEventListener('pointerdown', resumeAudio, { capture: true });
	window.addEventListener('keydown', resumeAudio, { capture: true });
}

/** @type {Sound} A turret explodes. */
export const sfx_explode = new Sound('explode');
/** @type {Sound} A plasma ball bounces. */
export const sfx_bounce = new Sound('bounce');
/** @type {Sound} The player collects a cake. */
export const sfx_grabCake = new Sound('grabCake');
/** @type {Sound} The exit opens. */
export const sfx_exit = new Sound('exit');
/** @type {Sound} The player jumps. */
export const sfx_jump = new Sound('jump');
/** @type {Sound} The player lands after a jump or a fall. */
export const sfx_land = new Sound('land');
/** @type {Sound[]} The player makes a step, thirteen variants. */
export const sfx_step = Array.from({ length: 13 }, (_, i) => new Sound(`step${i + 1}`));
/** @type {Sound[]} The player makes a step on ice, four variants. */
export const sfx_iceStep = Array.from({ length: 4 }, (_, i) => new Sound(`iceStep${i + 1}`));
/** @type {Sound} The player floats in the field of a gravitational pipe, as a loop. */
export const sfx_float = new Sound('float');
/** @type {Sound} The player picks up a crate or a turret. */
export const sfx_pickUp = new Sound('pickUp');
/** @type {Sound} The player throws a crate or a turret. */
export const sfx_throwObject = new Sound('throwObject');
/** @type {Sound} A crate lands. */
export const sfx_crateLand = new Sound('crateLand');
/** @type {Sound} A crate dissolves in a force field. */
export const sfx_dissolve = new Sound('dissolve');
/** @type {Sound} A body enters a portal. */
export const sfx_enterPortal = new Sound('enterPortal');
/** @type {Sound} A level ends. */
export const sfx_transition = new Sound('transition');
/** @type {Sound} A switch force field goes on or off. */
export const sfx_field = new Sound('field');
/** @type {Sound} A plasma force field goes off. */
export const sfx_plasmaField = new Sound('plasmaField');
/** @type {Sound} The player dies. */
export const sfx_die = new Sound('die');
/** @type {Sound} The player dies in acid. */
export const sfx_acid = new Sound('acid');
/** @type {Sound} A portal shot hits an invalid wall. */
export const sfx_noPortal = new Sound('noPortal');
/** @type {Sound} The portals are removed. */
export const sfx_cancelPortals = new Sound('cancelPortals');
/** @type {Sound} A crate hits the boss. */
export const sfx_bossHit = new Sound('bossHit');
/** @type {Sound} The screen shakes while the boss comes in or after its death, as a loop. */
export const sfx_bossRumble = new Sound('bossRumble');
/** @type {Sound} The alarm while the boss comes in, as a loop on top of the rumble. */
export const sfx_bossAlarm = new Sound('bossAlarm');
/** @type {Sound} A crate hits the yellow wall of a boss level, and the wall cracks. */
export const sfx_wallCrack = new Sound('wallCrack');
/** @type {Sound} A crate hits the yellow wall of a boss level, and the wall falls apart. */
export const sfx_wallBreak = new Sound('wallBreak');
/** @type {Sound} A razor wheel of the boss sticks in a wall or the floor. */
export const sfx_bladeStick = new Sound('bladeStick');
/** @type {Sound} A turret shoots. */
export const sfx_shoot = new Sound('shoot');
/** @type {Sound} The player is hit by a shot. */
export const sfx_pain = new Sound('pain');
/** @type {Sound} The player clicks a menu button. */
export const sfx_click = new Sound('click');
/** @type {Sound} The pointer or the keyboard focus moves onto a menu button. */
export const sfx_hover = new Sound('hover');
/** @type {Sound} The narrator types a character. */
export const sfx_tick = new Sound('tick');
/** @type {Sound[]} A portal is placed, two variants. */
export const sfx_portal = [new Sound('portal1'), new Sound('portal2')];

for (const sound of [...sfx_step, ...sfx_iceStep]) setSoundVolume(sound, 0.25);
setSoundVolume(sfx_jump, 0.2);
setSoundVolume(sfx_land, 0.35);
setSoundVolume(sfx_tick, 0.2);
setSoundVolume(sfx_wallBreak, 0.25);
sfx_bossAlarm.finishLoop = true;

/**
 * Start to load all sounds of the game.
 *
 * @returns {void}
 */
export function loadSfx() {
	for (const sound of sounds) fetchSound(sound);
}
