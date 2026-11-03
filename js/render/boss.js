/**
 * Drawing of the boss and of its speech.
 */

import { ctx } from '../canvas.js';
import { robotEye, robotHead } from '../images.js';
import { game, ui } from '../state.js';
import { prepareTxt } from './hud.js';

/** @type {Object<number, string[]>} The speech of each boss when it comes in. */
const ENTRY_SPEECH = {
	1: [
		"Enough is enough little man. I've decided that you can no longer",
		'continue to progress through our laboratories anymore. Launching',
		'termination program in 3 ... 2 ... 1 .............',
	],
	2: [
		"All your cake are belong to us ! You little rat, I think I don't have the",
		'choice ... You destroyed my brother and it will be your last mistake',
		'in life. Prepare to suffer, here I come !',
	],
	3: [
		'You first started with my cousin, then you decided to take apart its',
		"brother ... I can't let you continue to destroy our family just like that.",
		"I'm coming to get you, and I'm sure you won't like the taste of it ...",
	],
	4: [
		"Well, Well Well ... It's getting serious. I guess I'm the only one left",
		'to stop you from getting out of these laboratories. I hope you enjoyed',
		"your life as long as it lasted. You won't suffer, I promise.",
	],
};

/** @type {Object<number, string[]>} The speech of each boss before the fight. */
const FIGHT_SPEECH = {
	1: [
		'I saw in previous rooms that you loved crates. But how many of them',
		"can you take at the same time ? I'll give you a little hint to survive ...",
		"... Don't try to jump in the acid ! Ha - Ha - Ha -",
	],
	2: [
		"Razor wheels are pretty easy to avoid when they just don't move ...",
		'What do you say if I launch them into your direction ? Think you can',
		"avoid them all ? Say hello to my brother when you're gone.",
	],
	3: [
		'Easy to spot, useful to open green walls and deadly weapons !',
		'You used them to get to me, what if I use them to get to you now ?',
		'You wanna play rough ? OK ! Say hello to my little friends !',
	],
	4: [
		"Previous robots were too kind with you. You won't have the same",
		"chance here. I won't throw you crates, razor wheels or plasma balls ...",
		'No, I will throw you ... the three of them at the same time !',
	],
};

/** @type {Object<number, string[]>} The speech of each boss after its death. */
const DEATH_SPEECH = {
	1: [
		"I ... I can't believe it. I never thought you would be able to take",
		'me down that easily ... You deserve the right to continue your journey',
		'through next levels ... Come meet my brother in the next ro.............',
	],
	2: [
		"I guess .... I'll have to say hello by my...self ... Fortunately I can't feel",
		'pain, cause I think it would hurt really bad ........ Continue your trip',
		'....... and tell my cousin I forgot to buy some milk ...........',
	],
	3: [
		"I don't understand ... all my calculations were perfect ! You were",
		'supposed to die and ... oh wait ! I remember that movie now, that',
		'guy with a scar on his face .. guess I was wrong after all ..........',
	],
	4: [
		"........ Was I too kind with you ? I don't think so ... It seems that you",
		'were bound to get out of here from the beginning. Well, it was nice',
		'to know you after all ... So long, and thanks for all the cakes ...',
	],
};

/**
 * Draw the speech of the boss while it talks.
 *
 * @returns {void}
 */
export function drawBossSpeech() {
	if (game.bossNum == 0 || !game.bossIsComing || !game.bossIsTalking || game.player.fadeNextLevel != 0) return;
	let lines;
	if (game.bossLife == 0) lines = game.bossX > 449 ? ENTRY_SPEECH[game.bossNum] : FIGHT_SPEECH[game.bossNum];
	else lines = DEATH_SPEECH[game.bossNum];
	prepareTxt(15, 10, 477, 60);
	lines.forEach((line, i) => ctx.fillText(line, game.offsetX + 22, game.offsetY + 30 + 16 * i));
}

/**
 * Draw the boss with the eye of the current boss.
 *
 * @returns {void}
 */
export function drawBoss() {
	ctx.drawImage(robotHead, game.bossX + game.offsetX, game.bossY + game.offsetY, 74, 58);

	let eye;
	if (ui.currentLevel <= 7) eye = 0;
	else if (ui.currentLevel <= 14) eye = 1;
	else if (ui.currentLevel <= 21) eye = 2;
	else eye = 3;

	ctx.drawImage(
		robotEye[eye],
		0,
		19 * game.bossLife,
		19,
		19,
		game.bossX + game.offsetX + 15,
		game.bossY + game.offsetY + 22,
		19,
		19,
	);
}
