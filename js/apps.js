"use strict";

const KEY_Z = 1;
const KEY_Q = 2;
const KEY_D = 4;
const KEY_E = 8;
const KEY_S = 16;
const MSE_L = 32;
const MSE_R = 64;
const MSE_M = 128;


let started = false;


let campaigns;


let linesHoriz, linesVerti;

const HAUT = 0;
const BAS = 1;
const GAUCHE = 2;
const DROITE = 3;




const RANDOM = 1;
const ORDERED = 2;

let TRANS = 4;


let maxLevel;


const LEFT = 0;
const RIGHT = 1;
const MIDDLE = 2;


let tex_blackos, tex_tails;


let tex_button, tex_sound, tex_cross, tex_leftBG, tex_rightBG;
let key, mouseIcon;
let cameraFollow, robotEye, robotHead;
let levelEditorHud, menuBG, pauseBG, mapSelection;
let noLevel;
let highscore;
let platform;
let head, body;
let tunnel, tunnel2, tube, tube2;
let controls;
let tourelle;
let plasma;
let caisse;
let sparkle;
let bluePortal;
let redPortal;
let crosshair;
let bg;
let hud;
let ctx;
let cake;
let portalGun;
let tileset;
let levelsLoaded;
let levelsToLoad;
const GRAVITY = 60;


const NUM_TILES = 61;



let sfx_enterPortal, sfx_flatline, sfx_noPortal, sfx_pain, sfx_shoot;
let sfx_explode, sfx_jump, sfx_bounce, sfx_grabCake, sfx_holdObject;
let sfx_throwObject, sfx_tick, sfx_transition;
let sfx_portal;



let portalLines;


let canSplash = false;
let overSplash = false;

function setup() {
	const canvas = document.getElementById('canvas');
	ctx = canvas.getContext('2d');
	ctx.strokeStyle = "rgb(255, 0, 0)";
	ctx.font = "bold 10px Arial";
	
	tex_tails = loadImage('decor/tails.png');
	tex_blackos = loadImage('decor/blackos.png');
	noLevel = loadImage('bg/noLevel.png');
	Promise.all([whenImagesDone(), document.fonts.load("48px yikes")]).then(function() {
		canSplash = true;
		loadGfx();
		loadSfx();
		loadCreditsText();
		loadCampaigns();
	});

	levelsLoaded = 0;
	levelsToLoad = 5;
	ui.currentMenu = 0;
	
				
	game.perso = new Perso();//prevents a crash during loading
	
	
	game.TIME = 0;
	
	startLoop(myLoop);
	
	//maxLevel[4] = 29;
}

function myLoop() {
	manageKeys();
	if(!ui.drawCredits) draw();
	else doDrawCredits();
	updatePanel();
}

function unclick() {
	input.mousePressed = 0;
	input.mouseReleased = 0;
	input.mouseNewPress = 0;
	
	input.keys &= ~MSE_L;
	input.keys &= ~MSE_R;
	input.keys &= ~MSE_M;
}

function reportBrokenReplay() {
	alertDialog("The replay you're watching seems to be broken -_-;\n" +
				"Sorry for any inconveniences."
		, 'An error occured');
	game.replayMode = false;
	exitFunc();
}

/**
 * Store the level time and the replay if the time is a new best time.
 *
 * @returns {string} The message for the intermission screen.
 */
function checkBestTime() {
	const campaign = campaigns[ui.lvlType].folder;
	const best = getBestTime(campaign, ui.currentLevel);
	if(best != null && best <= game.TIME) return "Best time : " + toTime(best);
	
	saveBestTime(campaign, ui.currentLevel, game.TIME, encodeReplay(game.replay, campaign, ui.currentLevel)).catch(function(e) {
		console.error(e);
	});
	return "New best time !";
}

/**
 * Get the input state that the game derives from the keys of the previous ticks.
 *
 * @returns {number[]} The old keys, the mouse state and the jump and clear state of the player.
 */
function captureInput() {
	return [input.oldKeys, input.mousePressed, input.mouseReleased, input.mouseButton, input.mouseNewPress,
			game.perso.isJump, game.perso.oldIsJump, game.perso.askClear ? 1 : 0];
}

/**
 * Restore an input state from captureInput().
 *
 * @param {number[]} state The input state.
 */
function restoreInput(state) {
	input.oldKeys = state[0];
	input.mousePressed = state[1];
	input.mouseReleased = state[2];
	input.mouseButton = state[3];
	input.mouseNewPress = state[4];
	game.perso.isJump = state[5];
	game.perso.oldIsJump = state[6];
	game.perso.askClear = state[7] == 1;
}

function manageKeys() {
	// The input still changes while the level time stands still. A replay restores the input state at the same time.
	const inGame = game.perso.fadeNextLevel == -1 && ui.currentMenu == 2 && !ui.escapeMenu;
	if(inGame && !game.replayMode && !input.lastTickInGame) game.replay.states[game.TIME] = captureInput();
	else if(inGame && game.replayMode && game.replay.states[game.TIME]) restoreInput(game.replay.states[game.TIME]);
	input.lastTickInGame = inGame;
	
	if(game.perso.fadeNextLevel == -1 && ui.currentMenu == 2 && !game.replayMode) {
		input.mouseX = Math.round(input.mouseX);
		input.mouseY = Math.round(input.mouseY);
		game.replay.inputs[game.TIME] = input.keys;
		game.replay.mouseX[game.TIME] = input.mouseX;
		game.replay.mouseY[game.TIME] = input.mouseY;
	}else if(game.perso.fadeNextLevel == -1 && ui.currentMenu == 2 && game.replayMode && !ui.escapeMenu) {
		if(game.TIME < game.replay.inputs.length) {
			input.keys = game.replay.inputs[game.TIME];
			input.mouseX = game.replay.mouseX[game.TIME];
			input.mouseY = game.replay.mouseY[game.TIME];
		}else {
			reportBrokenReplay();
		}
	}
	
	// check for a new left click
	if((input.keys & MSE_L)) {
		if(input.mousePressed == 0) {
			input.mouseNewPress = 1;
		}else {
			input.mouseNewPress = 0;
		}
	}else input.mouseNewPress = 0;

	//check if a mouse button was just pressed
	if(!(input.oldKeys & MSE_L) && (input.keys & MSE_L)) {
		input.mouseButton = LEFT;
		input.mousePressed = 1;
		input.mouseReleased = 0;
	}else if(!(input.oldKeys & MSE_R) && (input.keys & MSE_R)) {
		input.mouseButton = RIGHT;
		input.mousePressed = 1;
		input.mouseReleased = 0;
	}else if(!(input.oldKeys & MSE_M) && (input.keys & MSE_M)) {
		input.mouseButton = MIDDLE;
		input.mousePressed = 1;
		input.mouseReleased = 0;
	}
	
	//check if a mouse button was just released
	if((input.oldKeys & MSE_L) && !(input.keys & MSE_L)) {
		input.mouseReleased = 1;
		input.mousePressed = 0;
	}else if((input.oldKeys & MSE_R) && !(input.keys & MSE_R)) {
		input.mouseButton = RIGHT;
		input.mouseReleased = 1;
		input.mousePressed = 0;
	}else if((input.oldKeys & MSE_M) && !(input.keys & MSE_M)) {
		input.mouseButton = MIDDLE;
		input.mouseReleased = 1;
		input.mousePressed = 0;
	}
	
	if(input.keys & KEY_E) {//clear portals
		if(input.oldKeys & KEY_E) input.keys &= ~KEY_E;
		else game.perso.askClear = true;
	}
	
	if(input.keys & KEY_Q) game.perso.isLeft = 1;if(!(input.keys & KEY_Q)) game.perso.isLeft = 0;
	if(input.keys & KEY_D) game.perso.isRight = 1;if(!(input.keys & KEY_D)) game.perso.isRight = 0;
	if(input.keys & KEY_S) game.perso.isDown = 1;if(!(input.keys & KEY_S)) game.perso.isDown = 0;
	
	//jump
	if((input.keys & KEY_Z) && (isTestingLevel || ui.currentMenu == 2 || (ui.currentMenu == 6 && ui.tutoJump)) && !dansUnPortal(game.perso)) {
		if(!(input.oldKeys & KEY_Z)) game.perso.oldIsJump = game.perso.isJump;
		game.perso.isJump = 1;
	}
	if(!(input.keys & KEY_Z)) {
		if(input.oldKeys & KEY_Z) game.perso.oldIsJump = game.perso.isJump;
		game.perso.isJump = 0;
	}
	
	input.oldKeys = input.keys;
}


function draw() {
	if(ui.currentMenu == 3) {
		drawLevelEditor();
	} else if((ui.currentMenu == 2 || ui.currentMenu == 6) && !ui.escapeMenu) {	
		if(!finNiveau() && game.perso.fadeNextLevel == -1) {
			if(game.TIME==0) unclick();
			game.TIME++;
		}
		game.needRedrawTiles = 0;
		if(!game.perso.mort && game.perso.fadeNextLevel == -1) {
			game.perso.move();
			if(game.needRedrawTiles == 0) game.needRedrawTiles = dansUnPortal(game.perso);
		}
		
		gestionPorte();
		if(finNiveau()) {
			game.bossNum = 0;
			game.ECART_X = 64;
			game.ECART_Y = 96;
		
			if(game.perso.fadeNextLevel > 0) {
				game.perso.fadeNextLevel -= 4;
			}
			if(game.perso.fadeNextLevel == -1) {
				ui.drawCredits = false;
				game.perso.fadeNextLevel = 120;
				game.perso.intermissionFade = 20;
				TRANS = parseInt(random(1, 7));//7 not included
				playSound(sfx_transition);
				ui.highscoreMessage = "";
				unclick();
				if(ui.currentMenu == 2 && !game.replayMode) ui.highscoreMessage = checkBestTime();
				ui.intermissionChoice = 0;
				//TRANS = 7;
				if(ui.currentMenu == 2 && !game.replayMode) {
					if(maxLevel[ui.lvlType] < ui.currentLevel + 1) {
						if(ui.lvlType == 4 && maxLevel[ui.lvlType] == 28) ui.drawCredits = true;
						maxLevel[ui.lvlType] = ui.currentLevel + 1;
						localStorage.setItem('sajs_maxLevel_' + ui.lvlType,  maxLevel[ui.lvlType]);
					}
				}
				
				game.replayMode = false;
			}
			if(game.perso.fadeNextLevel <= 0) {
				game.perso.fadeNextLevel = 0;
				
				if(ui.currentMenu == 6) {
					ui.currentLevel++;
					if(ui.currentLevel < 9) {
						unclick();
						loadLevel(ui.currentLevel);
					}else {
						ui.currentLevel = 9;
						if(!ui.tutoEnded) game.perso.fadeNextLevel = 1;
					}
					ui.tutoPause = true;
				}else {
					ui.drawIntermission = true;
					if(ui.intermissionChoice == 3) {//continue
						unclick();
						if(ui.currentMenu == 2) {
							loadLevel(++ui.currentLevel);
							game.perso.intermissionFade = -20;
						}
					}else if(ui.intermissionChoice == 2) {//restart
						unclick();
						if(ui.currentMenu == 2) {
							loadLevel(ui.currentLevel);
							if(game.bossNum > 0) skipComingBoss();
						}
						game.perso.intermissionFade = -20;
					}else if(ui.intermissionChoice == 1) {//exit
						exitFunc();
					}else if(ui.intermissionChoice == 4) {//watch replay
						unclick();
						game.replayMode = true;
						if(ui.currentMenu == 2) loadLevel(ui.currentLevel);
						game.perso.intermissionFade = -20;
					}
				}
			}
		} else {
			if(game.perso.intermissionFade == 0) {
				if(game.perso.fadeNextLevel > 0) {
					game.perso.fadeNextLevel -= 4;
				}
				if(game.perso.fadeNextLevel <= 0) {
					game.perso.fadeNextLevel = -1;
					ui.drawIntermission = false;
				}
			}
		}
		
		if(ui.currentMenu == 2 || ui.currentMenu == 6) {
			if(game.bossNum > 0 && game.bossIsComing && game.perso.fadeNextLevel == -1) game.perso.fadeNextLevel = 0;
			drawAllGame();
			drawHudText();
			
			manageBoss();
			
			if(game.replayMode) {
				drawKeys();
			}
			
			if(ui.currentMenu == 6 && ui.currentLevel == 9) {
				ui.currentLevel = 9;
				ctx.fillStyle = "rgb(0, 0, 0)";
				ctx.fillRect(game.ECART_X, game.ECART_Y, 544, 384);
				
				manageTutorial();
				drawText(146, 28, 11);
				
				if(input.mousePressed) {
					unclick();
					ui.currentMenu = 1;
					ui.selectMenu = 0;
					ui.fadeMenu = 30;
					game.sparkles = new Array();
				}
				
				ctx.drawImage(crosshair, input.mouseX - 8, input.mouseY - 8, 16, 16);
			}
		}
	} 
	else if((ui.currentMenu == 2 || ui.currentMenu == 6) && ui.escapeMenu) {
		drawPauseMenu();
	}
	else if(ui.currentMenu == 0) {
		//loading is in progress
		if(canSplash && !overSplash) drawSplash();
		else if(overSplash) drawLoadingScreen();
	}
	else if(ui.currentMenu == 1) {
		if(ui.selectMenu == 0) drawMainMenu();
		else {
			drawMapSelection();
			drawText(30, 25, 14);
		}
	}
	
	ctx.font = "bold 10px Arial";
	ctx.strokeStyle = "rgb(255, 255, 255)";
	ctx.fillStyle = "rgb(255, 255, 255)";
	ctx.fillText("" + getFps(), 5, 10);
}


function setupBoss() {
	game.bossX = 449;
	game.bossY = 150;
	game.bossLife = 0;
	game.projos = new Array();
	if(game.bossNum != 0) {
		game.bossIsComing = true;
		game.bossComingTime = 0;
		game.bossIsTalking = true;
		game.bossX = 449 + 50 - (game.bossComingTime >> 8);
		game.rumbleTime = 0;
	}else skipComingBoss();
	
	if(game.replayMode) skipComingBoss();
}

function skipComingBoss() {
	if(game.bossNum != 0) {
		game.bossIsComing = false;
		game.bossComingTime = 0;
		game.bossIsTalking = false;
		game.bossX = 449;
		game.rumbleTime = 0;
	}
}

function manageBoss() {
	let d, vx1, vy1, i;
	if(game.bossNum == 0) return; 
	if(game.bossIsComing) {
		if(game.bossIsTalking) {
			if(game.bossLife == 0 && game.perso.fadeNextLevel == 0) {
				if(game.bossX > 449) {
					if(game.bossNum == 1) {
						prepareTxt(15, 10, 477, 60);
						ctx.fillText("Enough is enough little man. I've decided that you can no longer", game.ECART_X + 22, game.ECART_Y + 30);
						ctx.fillText("continue to progress through or laboratories anymore. Launching", game.ECART_X + 22, game.ECART_Y + 30 + 16);
						ctx.fillText("termination program in 3 ... 2 ... 1 .............", game.ECART_X + 22, game.ECART_Y + 30 + 32);
					}else if(game.bossNum == 2) {
						prepareTxt(15, 10, 477, 60);
						ctx.fillText("All your cake are belong to us ! You little rat, I think I don't have the", game.ECART_X + 22, game.ECART_Y + 30);
						ctx.fillText("choice ... You destroyed my brother and it will be your last mistake", game.ECART_X + 22, game.ECART_Y + 30 + 16);
						ctx.fillText("in life. Prepare to suffer, here I come !", game.ECART_X + 22, game.ECART_Y + 30 + 32);
					}else if(game.bossNum == 3) {
						prepareTxt(15, 10, 477, 60);
						ctx.fillText("You first started with my cousin, then you decided to take apart its", game.ECART_X + 22, game.ECART_Y + 30);
						ctx.fillText("brother ... I can't let you continue to destroy our family just like that.", game.ECART_X + 22, game.ECART_Y + 30 + 16);
						ctx.fillText("I'm coming to get you, and I'm sure you won't like the taste of it ...", game.ECART_X + 22, game.ECART_Y + 30 + 32);
					}else if(game.bossNum == 4) {
						prepareTxt(15, 10, 477, 60);
						ctx.fillText("Well, Well Well ... It's getting serious. I guess I'm the only one left", game.ECART_X + 22, game.ECART_Y + 30);
						ctx.fillText("to stop you from getting out of these laboratories. I hope you enjoyed", game.ECART_X + 22, game.ECART_Y + 30 + 16);
						ctx.fillText("your life as long as it lasted. You won't suffer, I promise.", game.ECART_X + 22, game.ECART_Y + 30 + 32);
					}
				}else {
					if(game.bossNum == 1) {
						prepareTxt(15, 10, 477, 60);
						ctx.fillText("I saw in previous rooms that you loved crates. But how many of them", game.ECART_X + 22, game.ECART_Y + 30);
						ctx.fillText("can you take at the same time ? I'll give you a little hint to survive ...", game.ECART_X + 22, game.ECART_Y + 30 + 16);
						ctx.fillText("... Don't try to jump in the acid ! Ha - Ha - Ha -", game.ECART_X + 22, game.ECART_Y + 30 + 32);
					}else if(game.bossNum == 2) {
						prepareTxt(15, 10, 477, 60);
						ctx.fillText("Razor wheels are pretty easy to avoid when they just don't move ...", game.ECART_X + 22, game.ECART_Y + 30);
						ctx.fillText("What do you say if I launch them into your direction ? Think you can", game.ECART_X + 22, game.ECART_Y + 30 + 16);
						ctx.fillText("avoid them all ? Say hello to my brother when you're gone.", game.ECART_X + 22, game.ECART_Y + 30 + 32);
					}else if(game.bossNum == 3) {
						prepareTxt(15, 10, 477, 60);
						ctx.fillText("Easy to spot, useful to open green walls and deadly weapons !", game.ECART_X + 22, game.ECART_Y + 30);
						ctx.fillText("You used them to get to me, what if I use them to get to you now ?", game.ECART_X + 22, game.ECART_Y + 30 + 16);
						ctx.fillText("You wanna play rough ? OK ! Say hello to my little friends !", game.ECART_X + 22, game.ECART_Y + 30 + 32);
					}else if(game.bossNum == 4) {
						prepareTxt(15, 10, 477, 60);
						ctx.fillText("Previous robots were too kind with you. You won't have the same", game.ECART_X + 22, game.ECART_Y + 30);
						ctx.fillText("chance here. I won't throw you crates, razor wheels or plasma balls ...", game.ECART_X + 22, game.ECART_Y + 30 + 16);
						ctx.fillText("No, I will throw you ... the three of them at the same time !", game.ECART_X + 22, game.ECART_Y + 30 + 32);
					}
				}
				
				if(input.mouseNewPress) {
					game.bossIsTalking = false;
					if(game.bossX == 449) {
						game.bossIsComing = false;
					}
					unclick();
				}
			}else if(game.perso.fadeNextLevel == 0){
				if(game.bossNum == 1) {
					prepareTxt(15, 10, 477, 60);
					ctx.fillText("I ... I can't believe it. I never thought you would be able to take", game.ECART_X + 22, game.ECART_Y + 30);
					ctx.fillText("me down that easily ... You deserve the right to continue your journey", game.ECART_X + 22, game.ECART_Y + 30 + 16);
					ctx.fillText("through next levels ... Come meet my brother in the next ro.............", game.ECART_X + 22, game.ECART_Y + 30 + 32);
				}else if(game.bossNum == 2) {
					prepareTxt(15, 10, 477, 60);
					ctx.fillText("I guess .... I'll have to say hello by my...self ... Fortunately I can't feel", game.ECART_X + 22, game.ECART_Y + 30);
					ctx.fillText("pain, cause I think it would hurt really bad ........ Continue your trip", game.ECART_X + 22, game.ECART_Y + 30 + 16);
					ctx.fillText("....... and tell my cousin I forgot to buy some milk ...........", game.ECART_X + 22, game.ECART_Y + 30 + 32);
				}else if(game.bossNum == 3) {
					prepareTxt(15, 10, 477, 60);
					ctx.fillText("I don't understand ... all my calculations where perfect ! You were", game.ECART_X + 22, game.ECART_Y + 30);
					ctx.fillText("supposed to die and ... oh wait ! I remember that movie now, that", game.ECART_X + 22, game.ECART_Y + 30 + 16);
					ctx.fillText("guy with a scar on his face .. guess I was wrong after all ..........", game.ECART_X + 22, game.ECART_Y + 30 + 32);
				}else if(game.bossNum == 4) {
					prepareTxt(15, 10, 477, 60);
					ctx.fillText("........ Was I too kind with you ? I don't think so ... It seems that you", game.ECART_X + 22, game.ECART_Y + 30);
					ctx.fillText("were bound to get out of here from the beginning. Well, it was nice", game.ECART_X + 22, game.ECART_Y + 30 + 16);
					ctx.fillText("to know you after all ... So long, and thanks for all the cakes ...", game.ECART_X + 22, game.ECART_Y + 30 + 32);
				}
				
				if(game.replayMode ? game.rumbleTime >= game.replay.bossSpeech : input.mouseNewPress && game.rumbleTime > 60) {
					if(!game.replayMode) game.replay.bossSpeech = game.rumbleTime;
					game.bossIsTalking = false;
					game.bossIsComing = false;
					shakeScreen();
					unclick();
				}
			}
		}else {
			game.bossComingTime += 32;
			game.rumbleTime++;
			game.bossX = 449 + 50 - (game.bossComingTime >> 8);
			if(game.bossX == 449) {
				game.bossIsTalking = true;
				game.ECART_X = 64;
				game.ECART_Y = 96;
			}
			if(game.rumbleTime % 3 == 0) {
				game.ECART_X = 64 + random(-3, 3);
				game.ECART_Y = 96 + random(-3, 3);
			}
		}
	}else {
		if(game.bossLife < 3 && game.bossNum > 0) {
			if(!game.perso.mort && persoTouchBoss()) {
				game.perso.vie = -200;
				game.perso.timeVie = 180;
				return;
			}
		}
		
		if(game.perso.mort) {
			game.projos = new Array();
			game.plasmaBall = new Array();
			return;
		}

		if(game.bossLife < 3 && game.bossNum == 1) {
			if(game.perso.fadeNextLevel == -1 && game.TIME%(90-30*game.bossLife) == 0) {
				game.caisses.push(new Caisse((31 * 16) << 8, (6 * 16) << 8));
				if(game.caisses.length > 10) {
					for(i=0; i < 10; i++) {
						if(!game.caisses[i].porter && game.caisses[i].noRemove == 0) {
							game.caisses.splice(i, 1);
							break;
						}
					}
				}

				d = getDistance(game.perso.x>>8, game.perso.y>>8, game.caisses[game.caisses.length-1].x>>8, game.caisses[game.caisses.length-1].y>>8);
				d = parseInt(d/18);
				if(d > 16) d = 16;
				if(d < 3) d = 3;
				game.caisses[game.caisses.length - 1].vx = -(d << 8);
			}
		}else if(game.bossLife < 3 && game.bossNum == 2) {
			if(game.perso.fadeNextLevel == -1 && game.TIME%(90-15*game.bossLife) == 0) {
				vx1 = getCos((game.perso.x>>8) + (game.perso.pX>>1), (game.perso.y>>8) + (game.perso.pY>>1), 435 + 8, 50 + 8) * (1200 - game.perso.vx);
				vy1 = getSin((game.perso.x>>8) + (game.perso.pX>>1), (game.perso.y>>8) + (game.perso.pY>>1), 435 + 8, 50 + 8) * 1200;
				game.projos.push(new Projectile(435 << 8, 50 << 8, parseInt(vx1), parseInt(vy1)));
				
				if(game.bossLife == 2) {
					const vx2 = getCos((game.perso.x>>8) + (game.perso.pX>>1), (game.perso.y>>8) + (game.perso.pY>>1), 16 + 8, 48 + 8) * 1200;
					const vy2 = getSin((game.perso.x>>8) + (game.perso.pX>>1), (game.perso.y>>8) + (game.perso.pY>>1), 16 + 8, 48 + 8) * 1200;
					game.projos.push(new Projectile(16 << 8, 48 << 8, parseInt(vx2), parseInt(vy2)));
				}
			}
		}else if(game.bossLife < 3 && game.bossNum == 3) {
			const limit = game.bossLife+1;
			if(game.perso.fadeNextLevel == -1 && game.TIME%(90-30*game.bossLife) == 0 && game.plasmaBall.length < limit) {
				vx1 = getCos((game.perso.x>>8) + (game.perso.pX>>1), (game.perso.y>>8) + (game.perso.pY>>1), (game.plasmaX>>8) + 8, (game.plasmaY>>8) + 8) * 800;
				vy1 = getSin((game.perso.x>>8) + (game.perso.pX>>1), (game.perso.y>>8) + (game.perso.pY>>1), (game.plasmaX>>8) + 8, (game.plasmaY>>8) + 8) * 800;
				game.plasmaBall.push(new Plasma(game.plasmaX, game.plasmaY, vx1, vy1));
			}
			
			if(game.perso.fadeNextLevel == -1 && game.TIME%(90-30*game.bossLife) == 0 && game.caisses.length == 0) {
				game.caisses.push(new Caisse((31 * 16) << 8, (18 * 16) << 8));
				game.caisses[game.caisses.length - 1].vx = -(12 << 8);
				game.caisses[game.caisses.length - 1].vy = -(2 << 8);
			}
		}else if(game.bossLife < 3 && game.bossNum == 4) {
			if(game.perso.fadeNextLevel == -1 && game.TIME%(90-20*game.bossLife) == 0) {
				game.caisses.push(new Caisse((31 * 16) << 8, (5 * 16) << 8));
				if(game.caisses.length > 10) {
					for(i=0; i < 10; i++) {
						if(!game.caisses[i].porter && game.caisses[i].noRemove == 0) {
							game.caisses.splice(i, 1);
							break;
						}
					}
				}

				d = getDistance(game.perso.x>>8, game.perso.y>>8, game.caisses[game.caisses.length-1].x>>8, game.caisses[game.caisses.length-1].y>>8);
				d = parseInt(d/20);
				if(d > 16) d = 16;
				if(d < 3) d = 3;
				game.caisses[game.caisses.length - 1].vx = -(d << 8);
			}
			
			if(game.bossLife > 0 && game.perso.fadeNextLevel == -1 && game.TIME%(180-20*game.bossLife) == 0) {
				vx1 = getCos((game.perso.x>>8) + (game.perso.pX>>1), (game.perso.y>>8) + (game.perso.pY>>1), 432 + 8, 32 + 8) * 600;
				vy1 = getSin((game.perso.x>>8) + (game.perso.pX>>1), (game.perso.y>>8) + (game.perso.pY>>1), 432 + 8, 32 + 8) * 600;
				game.projos.push(new Projectile((432) << 8, 32 << 8, parseInt(vx1), parseInt(vy1)));
			}
			
			if(game.bossLife > 1 && game.perso.fadeNextLevel == -1 && game.plasmaBall.length == 0) {
				vx1 = getCos((game.perso.x>>8) + (game.perso.pX>>1), (game.perso.y>>8) + (game.perso.pY>>1), (game.plasmaX>>8) + 8, (game.plasmaY>>8) + 8) * 400;
				vy1 = getSin((game.perso.x>>8) + (game.perso.pX>>1), (game.perso.y>>8) + (game.perso.pY>>1), (game.plasmaX>>8) + 8, (game.plasmaY>>8) + 8) * 400;
				game.plasmaBall.push(new Plasma(game.plasmaX, game.plasmaY, vx1, vy1));
			}
		}
	}
}

function exitFunc() {
	unclick();
	game.sparkles = new Array();
	if(ui.currentMenu == 2) {//campaign
		game.ECART_X = 0;
		game.ECART_Y = 96;
		ui.currentMenu = 1;
		prepareSelectionText();
		ui.previewMap = ui.currentLevel;
		loadPreviewMap(ui.previewMap);
	}else if(ui.currentMenu == 6) {
		ui.currentMenu = 1;
		ui.selectMenu = 0;
		ui.fadeMenu = 30;
		game.sparkles = new Array();
	}
	
	game.replayMode = false;
}

function prepareSelectionText() {
	ui.timeWriting = 0;
	ui.txtLines = new Array();
	
	ui.txtLines.push("Welcome to the campaign mode of StillAliveJS. Here you can select a map on the right and click");
	ui.txtLines.push("'Play' to play it. Good Luck !");
}

function manageDownMenu() {
	let overMenu = -1;
	if(mouseInZone(74, 445, 120, 24)) overMenu = 1;
	else if(mouseInZone(74 + 130, 445, 120, 24)) overMenu = 2;
	else if(mouseInZone(74 + 260, 445, 120, 24) && ui.currentMenu < 5 && ui.currentLevel + 1 < 29) {
		if(maxLevel[ui.lvlType] >= ui.currentLevel + 1) {
			overMenu = 3;
		}
	}else if(mouseInZone(74 + 390, 445, 120, 24)) overMenu = 4;
	
	const scale1 = overMenu == 1 ? 0.9 : 1;
	const scale2 = overMenu == 2 ? 0.9 : 1;
	const scale3 = overMenu == 3 ? 0.9 : 1;
	const scale4 = overMenu == 4 ? 0.9 : 1;
	
	drawTinyButton(74, 445, scale1, "Exit");
	drawTinyButton(74 + 130, 445, scale2, "Restart");
	if(ui.currentMenu < 5 && ui.currentLevel + 1 < 29) {
		if(maxLevel[ui.lvlType] >= ui.currentLevel + 1) {
			drawTinyButton(74 + 260, 445, scale3, "Continue");
		}
	}
	if(ui.lvlType == 4 && (ui.currentLevel == 7 || ui.currentLevel == 14 || ui.currentLevel == 21 || ui.currentLevel == 28)) {
		if(overMenu == 4) overMenu = 0;
	}else {
		drawTinyButton(74 + 390, 445, scale4, "Watch Replay");
	}
	
	if(input.mousePressed && input.mouseButton == LEFT && overMenu > 0) {
		ui.intermissionChoice = overMenu;
		unclick();
	}
}

function drawPortalGunMenu(x, y, angle) {
	const a = angle;
	ctx.save();
	ctx.translate(x + 8, y + 13);
	ctx.rotate(a);
	ctx.drawImage(portalGun, -5, -5);
	ctx.restore();
}

function createSparkles(xFrom, yFrom, xTo, yTo, color, used) {
	let k;
	let x = xFrom;
	let y = yFrom;
	const x2 = xTo;
	const y2 = yTo;
	
	const vx = getCos(x2, y2, x, y) * 256;
	const vy = getSin(x2, y2, x, y) * 256;
	
	let i = 0;
	let now = 0;
	do{
		now++;
		x += vx;
		y += vy;
		
		if(i%6==0 && now > 15){
			for(k=0;k<3;k++){
				const s = new Sparkle();
				s.x = x + parseInt(random(-5<<8,5<<8)) - (8<<8) - (game.ECART_X << 8);
				s.y = y + parseInt(random(-5<<8,5<<8)) - (8<<8) - (game.ECART_Y << 8);
				s.used = used;
				s.vx = parseInt(random(96, 192));
				s.vy = parseInt(random(96, 192));
				s.fading = 255;
				s.color = color;
				s.portalNum = -1;
				if(parseInt(random(2))==0) s.vx = -s.vx;
				if(parseInt(random(0, 2))==0) s.vy = -s.vy;
				game.sparkles.push(s);
			}
		}
		i++;
	}while(getDistance(x, y, x2, y2) > 256);
}

function mouseInZone(x, y, w, h) {
	if(input.mouseX >=x && input.mouseX < x+w && input.mouseY >= y && input.mouseY < y+h) return true;
	return false;
}

function reloadTiles() {
	let i;
	ctx.drawImage(bg[game.BG], game.ECART_X, game.ECART_Y, 512, 384);
	for(i in game.displayMap) {		
		if(game.map[i] < NUM_TILES && game.map[i] > 0 && i < 768) {
			const y = i >> 5;
			const x = i - (y << 5);
			ctx.drawImage(tileset[game.displayMap[i]], x*16 + game.ECART_X, y*16 + game.ECART_Y, 16, 16);
		}
	}
	game.imgBuff = copyCanvas(game.ECART_X, game.ECART_Y, 512, 384);
}

function gestionPorte(){
	const etatPorte = game.perso.porte;
	
	if(!game.perso.porte){
		if(persoSurInterrupteur(game.perso.x>>8, game.perso.y>>8)){
			game.perso.porte = 1;
			ouvrirPorte();
		}else if(caisseSurInterrupteur()){
			game.perso.porte = 1;
			ouvrirPorte();
		}
	}else{
		if(!persoSurInterrupteur(game.perso.x>>8, game.perso.y>>8)&& !caisseSurInterrupteur()){
			game.perso.porte = 0;
			fermerPorte();
		}
	}
}

function retirerBloqueurPorte(){
	let x, y, i,j;
	for(i=0;i<2;i++){
		if(game.portals[i].used){
			x = game.portals[i].x>>8;
			y = game.portals[i].y>>8;
			if(game.portals[i].direction==HAUT) y+=6;
			else if(game.portals[i].direction==GAUCHE) x+=6;
			else if(game.portals[i].direction==DROITE) x-=2;
			else if(game.portals[i].direction==BAS) y-=2;
			
			if(game.portals[i].direction==GAUCHE || game.portals[i].direction==DROITE){
				for(j=0;j<32;j++){
					if(getTileSimple(x,y+j)==23){
						game.portals[i].used = 0;
						removeSparkles(i, 3);
						j = 32;
					}
				}
			}else{
				for(j=0;j<32;j++){
					if(getTileSimple(x+j,y)==23){
						game.portals[i].used = 0;
						removeSparkles(i, 3);
						j = 32;
					}
				}
			}
		}
	}
	
	for(i in game.caisses){
		x = game.caisses[i].x>>8;
		y = game.caisses[i].y>>8;
		if(getTileSimple(x,y)==23 || getTileSimple(x+15,y)==23 || getTileSimple(x,y+15)==23 || getTileSimple(x+15,y+15)==23){
			game.caisses[i].x = game.caisses[i].xOrig;
			game.caisses[i].y = game.caisses[i].yOrig;
			game.caisses[i].vx = 0;
			game.caisses[i].vy = 0;
		}
	}
	
	for(i in game.plasmaBall) {
		x = game.plasmaBall[i].x>>8;
		y = game.plasmaBall[i].y>>8;
		if(getTileSimple(x,y)==23 || getTileSimple(x+15,y)==23 || getTileSimple(x,y+15)==23 || getTileSimple(x+15,y+15)==23){
			game.plasmaBall[i].vx = game.plasmaBall[i].origVx;
			game.plasmaBall[i].vy = game.plasmaBall[i].origVy;
			game.plasmaBall[i].x = game.plasmaBall[i].xOrig;
			game.plasmaBall[i].y = game.plasmaBall[i].yOrig;
		}
	}
}

function fermerPorte(){		
	let i;
	playSound(sfx_tick);
	for(i in game.animatedTiles) {
		if(game.animatedTiles[i].current>=23 && game.animatedTiles[i].current<=28){
			game.animatedTiles[i].used = 1;
			game.map[game.animatedTiles[i].place] = game.animatedTiles[i].min;
			if(settings.quality == 0) {
				game.displayMap[game.animatedTiles[i].place] = game.animatedTiles[i].min;
				game.needLoad = true;
			}
		}
	}
	retirerBloqueurPorte();
}

function ouvrirPorte(){
	let i;
	playSound(sfx_tick);
	for(i in game.animatedTiles) {
		if(game.animatedTiles[i].current>=23 && game.animatedTiles[i].current<=28){
			game.animatedTiles[i].used = 0;
			game.map[game.animatedTiles[i].place] = 0;
			if(settings.quality == 0) {
				game.displayMap[game.animatedTiles[i].place] = 0;
				game.needLoad = true;
			}
		}
	}
}

function persoSurInterrupteur(x, y){
	if(getTileSimple(x,y+32)==19) return 1;
	else if(getTileSimple(x+15,y+32)==19) return 1;
	return 0;
}

function touchingGround(obj){
	if(obj.vy >= 0){
		const touche = getTile((obj.x>>8)+1, (obj.y>>8)+obj.pY);
		const touche2 = getTile((obj.x>>8)+obj.pX-1, (obj.y>>8)+obj.pY);
		
		if((touche >= 54 && touche <= 55) || (touche2 >= 54 && touche2 <= 55)) return 3;
		if((touche >= 56 && touche <= 57) || (touche2 >= 56 && touche2 <= 57)) return 4;
		if(touche == 46 || touche2 == 46) return 2;
		else if(touche || touche2) return 1;
	}
	return 0;
}

function objetToucheTileMort(x, y){
	if(x>=512 || y>=384 || y<0 || x<0) return 0;
	const tile = game.map[((y>>4)*32) + (x>>4)];
	return (tile==36||tile==37||tile==38||tile==39||tile==47);
}

function toucheTileMort(obj){
	const x = obj.x>>8;
	const y = obj.y>>8;
	const pX = obj.pX;
	const pY = obj.pY;
	
	let touche = objetToucheTileMort(x,y);
	if(!touche)	touche = objetToucheTileMort(x+pX-1,y);
	if(!touche)	touche = objetToucheTileMort(x,y+(pY>>1));
	if(!touche)	touche = objetToucheTileMort(x,y+pY-6);
	if(!touche)	touche = objetToucheTileMort(x+pX-1,y+(pY>>1));
	if(!touche)	touche = objetToucheTileMort(x+pX-1,y+pY-6);
	
	return touche;
}

function getTileNoCaisse(x, y) {
	if(x>=512 || y>=384 || y<0 || x<0) return 0;
	let tile = game.map[((y>>4)*32) + (x>>4)];
	
	if(!tile){//check contact with a platform
		tile = collidePlateforme(x,y);
	}
	
	if(tile==22 || tile==36 || tile==37 || tile==38 || tile==39 || tile==47 || tile==104) tile = 0;
	else if(tile >= 49 && tile <= 54) tile = 0;
	
	return tile;
}

function getTileNoCaisseNoPlate(x, y) {
	if(x>=512 || y>=384 || y<0 || x<0) return 0;
	let tile = game.map[((y>>4)*32) + (x>>4)];
	
	if(tile==22 || tile==36 || tile==37 || tile==38 || tile==39 || tile==47 || tile==104) tile = 0;
	else if(tile >= 49 && tile <= 54) tile = 0;
	
	return tile;
}

function getTile(x, y) {
	if(x>=512 || y>=384 || y<0 || x<0) return 0;
	let tile = game.map[((y>>4)*32) + (x>>4)];
	
	if(!tile){//check contact with a crate
		tile = collideCaisse(x,y);
		if(!tile){//check contact with a platform
			tile = collidePlateforme(x,y);
		}
	}
	
	if(tile==22 || tile==36 || tile==37 || tile==38 || tile==39 || tile==47 || tile==104) tile = 0;
	else if(tile >= 49 && tile <= 54) tile = 0;
	
	return tile;
}

function getTilePortal(x, y){
	if(x>=512 || y>=384 || y<0 || x<0) return 0;
	let tile = game.map[((y>>4)*32) + (x>>4)];
	//passes through: crate, finish, razor wheel, red plasma, cake, start
	if(tile==22 || tile==36 || (tile>=40 && tile<=45) || tile == 103 || tile == 104 || tile>=300) tile = 0;
	
	if(!tile){//check contact with a platform
		tile = collidePlateforme(x,y);
	}
	
	return tile;
}

function launchPortal(p){
	let i, k;
	game.perso.timePosePortal = 0;
	game.perso.lastLaunched = p;
	
	let x = game.perso.x + ((game.perso.pX>>1)<<8);
	let y = game.perso.y + ((game.perso.pY>>1)<<8);
	
	game.portals[p].vx = getCos(input.mouseX, input.mouseY, (x>>8) + game.ECART_X, (y>>8) + game.ECART_Y) * 256;
	game.portals[p].vy = getSin(input.mouseX, input.mouseY, (x>>8) + game.ECART_X, (y>>8) + game.ECART_Y) * 256;
	
	for(i=0;i<game.sparkles.length; i++) {
		if(game.sparkles[i].color == p && game.sparkles[i].used == 1) {
			game.sparkles.splice(i, 1);
			i--;
		}
	}
	
	i = 0;
	let rebond = 0;
	let tile;
	let now = 0;
	
	portalLines = new Array();
	portalLines.push(new Line(x>>8, y>>8, 0, 0, p));
	let inScreenOK = false;
	
	do{
		inScreenOK = false;
		now++;
		x += game.portals[p].vx;
		y += game.portals[p].vy;
		tile = getTilePortal(x>>8, y>>8);
		
		if(tile==46){
			const haut = getTilePortal((x>>8),(y>>8)-1);
			const bas = getTilePortal((x>>8),(y>>8)+1);
			const gauche = getTilePortal((x>>8)-1,(y>>8));
			const droite = getTilePortal((x>>8)+1,(y>>8));
			if((!bas||!haut)&&(gauche&&droite)){
				game.portals[p].vy = -game.portals[p].vy;
			}else if((!gauche||!droite)&&(haut&&bas)){
				game.portals[p].vx = -game.portals[p].vx;
			}
			tile = 0;
			rebond++;
			
			portalLines[portalLines.length - 1].x2 = x>>8;
			portalLines[portalLines.length - 1].y2 = y>>8;
			
			portalLines.push(new Line(x>>8, y>>8, 0, 0, p));
		}
		
		if(i%6==0 && now > 15){
			for(k=0;k<1;k++){
				const s = new Sparkle();
				s.x = x + parseInt(random(-5<<8,5<<8)) - (8<<8);
				s.y = y + parseInt(random(-5<<8,5<<8)) - (8<<8);
				s.used = 1;
				s.vx = parseInt(random(96, 192));
				s.vy = parseInt(random(96, 192));
				s.fading = 255;
				s.color = p;
				s.portalNum = -1;
				if(parseInt(random(2))==0) s.vx = -s.vx;
				if(parseInt(random(0, 2))==0) s.vy = -s.vy;
				game.sparkles.push(s);
			}
		}
		i++;
		if(inScreen(x>>8,y>>8)) {
			inScreenOK = true;
		} else {
			const yy = y>>8;
			if(yy < 0 && game.portals[p].vy > 0) inScreenOK = true;
		}
	}while(tile==0 && inScreenOK && rebond<5);
	
	portalLines[portalLines.length - 1].x2 = x>>8;
	portalLines[portalLines.length - 1].y2 = y>>8;
	
	if(tile!=0 && (tile<=16 || (tile>=200 && tile<=204))){
		const ok = setPortalDir(p, x>>8, y>>8);
		if(ok){
			if(game.portals[p].direction==DROITE || game.portals[p].direction==GAUCHE){
				game.portals[p].scaleX = 1;
				game.portals[p].scaleY = 0;
				game.portals[p].plateforme = -1;
			}else{
				game.portals[p].scaleX = 0;
				game.portals[p].scaleY = 1;
				const plate = getTilePortal(x>>8,y>>8);
				if(plate>=200 && plate<=204) game.portals[p].plateforme = plate - 200;
				else game.portals[p].plateforme = -1;
			}
			const r = parseInt(random(0, 2));
			playSound(sfx_portal[r]);
			game.PORTALS++;
		} else playSound(sfx_noPortal);
	} else playSound(sfx_noPortal);
}

function setPortalDir(p, x, y){
	let tile, x2, y2, s;
	const vx = game.portals[p].vx;
	const vy = game.portals[p].vy;
	let i;
	const oldDir = game.portals[p].direction;
	
	let mur = 0;
	//first check if the portal is on a left or right wall
	for(i=y-14;i<y+14;i++){
		tile = getTilePortal(x,i);
		if(tile!=0){
			if((tile>0 && tile<=16) || (tile>=200 && tile<=204)) mur++;
		}
	}
	if(mur==28){
		mur = 0;
		for(i=x-16;i<x+16;i++){//make sure that nothing touches horizontally
			if(getTile(i,y-14)!=0 && getTile(i,y-14)<300) mur++;
			if(getTile(i,y+13)!=0 && getTile(i,y+13)<300) mur++;
		}
		if(mur>36) return 0;
		
		if(vx<0){//if the portal is on the left
			x-=3;
			game.portals[p].direction = GAUCHE;
		}else game.portals[p].direction = DROITE;
		y-=16;
		
		x2 = game.portals[1-p].x>>8;
		y2 = game.portals[1-p].y>>8;
		if(x==x2){//portals on the same vertical wall?
			if(y2-y>-32 && y2-y<32 && game.portals[1-p].used){
				game.portals[p].direction = oldDir;
				return 0;
			}
		}
		
		game.portals[p].frame = 1;
		game.portals[p].y = y<<8;
		game.portals[p].x = x<<8;
		game.portals[p].used = 1;

		removeSparkles(p, 3);
		
		for(i=0;i<13;i++){
			s = new Sparkle();
			s.x = game.portals[p].x;
			s.y = game.portals[p].y + ((i*2)<<8);
			s.xOrig = s.x;
			s.yOrig = s.y;
			s.portalNum = p;
			s.used = 3;
			if(game.portals[p].direction==DROITE) {
				s.vx = -parseInt(random(128, 384));
				s.xOrig -= 7 << 8;
			}else s.vx = parseInt(random(128, 384));
			s.vy = 0;
			s.fading = 200;
			s.color = p;
			
			game.sparkles.push(s);
		}
		
		return 1;
	}else{//then check if the portal is on a top or bottom wall
		mur = 0;
		for(i=x-14;i<x+14;i++){
			tile = getTilePortal(i,y);
			if(tile!=0){
				if((tile>0 && tile<=16) || (tile>=200 && tile<=204)) mur++;
			}
		}
		if(mur==28){
			mur = 0;
			for(i=y-16;i<y+16;i++){//make sure that nothing touches vertically
				if(getTile(x-14,i)!=0 && getTile(x-14,i)<300) mur++;
				if(getTile(x+13,i)!=0 && getTile(x+13,i)<300) mur++;
			}
			if(mur>36) return 0;
			
			if(vy<0){//if the portal is at the top
				y-=3;
				game.portals[p].direction = HAUT;
			}else game.portals[p].direction = BAS;
			x-=16;
			
			x2 = game.portals[1-p].x>>8;
			y2 = game.portals[1-p].y>>8;
			if(y==y2){//portals on the same horizontal wall?
				if(x2-x>-32 && x2-x<32  && game.portals[1-p].used){
					game.portals[p].direction = oldDir;
					return 0;
				}
			}
			
			game.portals[p].y = y<<8;
			game.portals[p].x = x<<8;
			game.portals[p].used = 1;
			game.portals[p].frame = 0;
			
			removeSparkles(p, 3);
		
			for(i=0;i<13;i++){
				s = new Sparkle();
				
				s.x = game.portals[p].x + ((i*2)<<8);
				s.y = game.portals[p].y;
				s.xOrig = s.x;
				s.yOrig = s.y;
				s.used = 3;
				s.portalNum = p;
				if(game.portals[p].direction==BAS) {
					s.vy = -parseInt(random(128, 384));
					s.yOrig -= 8 << 8;
				}
				else s.vy = parseInt(random(128, 384));
				s.vx = 0;
				s.fading = 200;
				s.color = p;
				
				game.sparkles.push(s);
			}
			
			return 1;
		}
	}
	return 0;
}

function checkTeleportGauche(obj){
	let j;
	let x = (obj.x)>>8;
	const y = (obj.y)>>8;
	x-=1;
	for(j=0;j<2;j++){
		const tx = (game.portals[j].x>>8) + 3;
		const ty = game.portals[j].y>>8;
		if(game.portals[j].used && game.portals[j].direction==GAUCHE && game.portals[1-j].used){
			if(y>=ty-6 && y+obj.pY<=ty+38 && x<tx && tx-x<=20){
				const ecrt = (32 - obj.pY)>>1;
				obj.y = (ty + ecrt)<<8;
				if(game.bossNum == 0 || obj.type != "plasma") obj.vy = 0;
				if(tx-x>=(obj.pX>>1) && obj.vx<0){
					//perso.vy = 128;
					transfertPortal(j,obj);
				}
				return j+1;
			}
		}
	}
	return 0;
}

function checkTeleportDroite(obj){
	let j;
	let x = (obj.x)>>8;
	const y = (obj.y)>>8;
	x+=obj.pX;
	for(j=0;j<2;j++){
		const tx = game.portals[j].x>>8;
		const ty = game.portals[j].y>>8;
		if(game.portals[j].used && game.portals[j].direction==DROITE && game.portals[1-j].used){
			if(y>=ty-6 && y+obj.pY<=ty+38 && x>tx && x-tx<=20){
				const ecrt = (32 - obj.pY)>>1;
				obj.y = (ty + ecrt)<<8;
				if(game.bossNum == 0 || obj.type != "plasma") obj.vy=0;
				if(x-tx>=(obj.pX>>1) && obj.vx>0){
						//perso.vy = 128;
						transfertPortal(j,obj);
				}
				return j+1;
			}
		}
	}
	return 0;
}

function checkTeleportBas(obj){
	let j;
	const x = (obj.x)>>8;
	let y = (obj.y)>>8;
	y+=obj.pY;
	
	if(obj.type == "plasma" && (obj.vy == 0)) return 0;
	
	for(j=0;j<2;j++){
		const tx = game.portals[j].x>>8;
		const ty = game.portals[j].y>>8;
		if(game.portals[j].used && game.portals[j].direction==BAS && game.portals[1-j].used==1){
			if(x>=tx-4 && x+obj.pX<tx+36 && y>=ty && y-ty<=20){
				obj.x = (tx+8)<<8;
				if(y-ty>=16 && obj.vy>0){
					transfertPortal(j,obj);
				}
				return j+1;
			}
		}
	}
	return 0;
}

function checkTeleportHaut(obj){
	let j;
	const x = (obj.x)>>8;
	let y = (obj.y)>>8;
	y-=1;
	
	if(obj.type == "plasma" && (obj.vy == 0)) return 0;
	
	for(j=0;j<2;j++){
		const tx = game.portals[j].x>>8;
		const ty = (game.portals[j].y>>8)+4;
		if(game.portals[j].used && game.portals[j].direction==HAUT && game.portals[1-j].used==1){
			if(x>=tx-4 && x+obj.pX<tx+36 && y<ty && ty-y<=20){
				obj.x = (tx+8)<<8;
				if(ty-y>=16 && obj.vy<0){
					transfertPortal(j,obj);
				}
				return j+1;
			}
		}
	}
	return 0;
}

function dansUnPortal(obj){
	let p = checkTeleportBas(obj);
	if(p == 0) p = checkTeleportHaut(obj);
	if(p == 0) p = checkTeleportGauche(obj);
	if(p == 0) p = checkTeleportDroite(obj);
	
	return p;
}

function transfertPortal(p, obj){
	let ecrt, oldx;
	const entree = game.portals[p].direction;
	const sortie = game.portals[1-p].direction;
	
	playSound(sfx_enterPortal);
	
	if(obj.type == "tourelle") {
		obj.canExplode = 1;
	}
	
	if(obj.type == "perso") {
		game.perso.timePassedPortal = (p == 0 ? 42 : -42);
	}

	if(sortie==DROITE){
		ecrt = (32 - obj.pY)>>1;
		obj.x = game.portals[1-p].x - ((obj.pX>>1)<<8);
		obj.y = game.portals[1-p].y + (ecrt<<8);
	}else if(sortie==GAUCHE){
		ecrt = (32 - obj.pY)>>1;
		obj.x = game.portals[1-p].x - ((obj.pX>>1)<<8);
		obj.y = game.portals[1-p].y + (ecrt<<8);
	}else if(sortie==HAUT){
		obj.x = game.portals[1-p].x+(8<<8);
		obj.y = game.portals[1-p].y-((obj.pY>>1)<<8) + (4<<8);
	}else if(sortie==BAS){
		obj.x = game.portals[1-p].x+(8<<8);
		obj.y = game.portals[1-p].y-((obj.pY>>1)<<8);
	}
	
	if(game.bossNum == 0 || obj.type != "plasma") {
		if(entree==BAS && sortie==BAS) {
			obj.vy = -obj.vy;
			if(obj.vy>-1100) obj.vy = -1100;
		}else if(entree==BAS && sortie==GAUCHE){
			oldx = obj.vx;
			obj.vx = obj.vy;
			obj.vy =  oldx;
		}else if(entree==BAS && sortie==DROITE){
			oldx = obj.vx;
			obj.vx = -obj.vy;
			obj.vy =  oldx;
		}else if(entree==GAUCHE && sortie==BAS){
			obj.vy = -1000;
		}else if(entree==DROITE && sortie==BAS){
			obj.vy = -1000;
		}else if(entree==DROITE && sortie==DROITE){
			obj.vx = -1000;
		}else if(entree==GAUCHE && sortie==GAUCHE){
			obj.vx = 1000;
		}else if(entree==HAUT && sortie==HAUT){
			obj.vy = 650;
		}else if(entree==GAUCHE && sortie==DROITE){
			obj.vx = -650;
		}else if(entree==DROITE && sortie==GAUCHE){
			obj.vx = 650;
		}else if(entree==DROITE && sortie==HAUT){
			obj.vy = 650;
		}else if(entree==GAUCHE && sortie==HAUT){
			obj.vy = 650;
		}else if(entree==HAUT && sortie==GAUCHE){
			obj.vx = 650;
		}else if(entree==HAUT && sortie==DROITE){
			obj.vx = -650;
		}else if(entree==HAUT && sortie==BAS){
			obj.vy = -1000;
		}else if(entree==HAUT && sortie==HAUT){
			obj.vy = -obj.vy;
		}
	}else if((game.bossNum == 3 || game.bossNum == 4) && obj.type == "plasma") {
		if((entree==BAS && sortie==BAS) || (entree==HAUT && sortie==HAUT)) {
			obj.vy = -obj.vy;
		}else if((entree==BAS && sortie==GAUCHE) || (entree==HAUT && sortie==DROITE)){
			oldx = obj.vx;
			obj.vx = obj.vy;
			obj.vy =  oldx;
		}else if((entree==BAS && sortie==DROITE) || (entree==HAUT && sortie==GAUCHE)){
			oldx = obj.vx;
			obj.vx = -obj.vy;
			obj.vy =  oldx;
		}else if((entree==GAUCHE && sortie==BAS) || (entree==DROITE && sortie==HAUT)){
			oldx = obj.vx;
			obj.vx = obj.vy;
			obj.vy =  oldx;
		}else if((entree==DROITE && sortie==BAS) || (entree==GAUCHE && sortie==HAUT)){
			oldx = obj.vx;
			obj.vx = obj.vy;
			obj.vy = -oldx;
		}else if((entree==DROITE && sortie==DROITE) || (entree==GAUCHE && sortie==GAUCHE)){
			obj.vx = -obj.vx;
		}
	}
}

function removeSparkles(p, used) {
	let i;
	for(i=0;i<game.sparkles.length;i++) {
		if(game.sparkles[i].used == used && game.sparkles[i].color == p) {
			game.sparkles.splice(i, 1);
			i--;
		}
	}
}

function Tourelle(x, y, dir) {
	this.x = x;
	this.y = y;
	this.vx = 0;
	this.vy = 0;
	this.angle = 0;
	this.dir = dir;
	this.coolTime = 0;
	this.startCool = 3;
	this.rotation = 10;
	this.mort = 0;
	this.used = 1;
	this.porter = 0;
	this.inSight = 0;
	this.pX = 16;
	this.pY = 32;
	this.animFrame = 0;
	this.canExplode = 0;
	this.type = "tourelle";
	this.ex = 0;
	
	this.move = function() {
		if(this.used){
			if(!this.porter){
				if(!touchingGround(this)) this.angle += (this.vx>>8)<<1;
				else this.angle = 0;
				if(this.angle >= 360) this.angle -= 360;
				
				const oldVx = this.vx;
				const oldVy = this.vy;
				
				moveObject(this);
				
				if(!this.mort) {
					if(this.vx == 0 && Math.abs(oldVx) > (3<<8) && this.canExplode && inForceFieldTp(this).length == 0) this.mort = 1;
					else if(this.vy == 0 && Math.abs(oldVy) > (4<<8) && this.canExplode && inForceFieldTp(this).length == 0) this.mort = 1;
					else if(toucheTileMort(this) || caisseToucheObjet(this) || plasmaToucheObjet(this)) {
						this.mort = 1;
					}
					if(this.mort) {
						this.animeFrame = 2;
						playSound(sfx_explode);
						createCakeOrSmokeSparkles(this.x, this.y, 9, 4, 255);
						//_synth.play();
					}
				}else if(this.animFrame<10){
					if(game.TIME%4==0) this.animFrame++;
				}
				
				let plt = onPlateforme(this);
				if(plt){
					plt -= 200;
					this.x += game.platforms[plt].vx;
					
				}
				
				const colLeft = leftCollision(this);
				const colRight = rightCollision(this);
				if(!this.mort && ((colLeft>=200 && colLeft<=210) || (colRight>=200 && colRight<=210))){
					this.mort = 1;
					this.animeFrame = 2;
					playSound(sfx_explode);
					createCakeOrSmokeSparkles(this.x, this.y, 9, 4, 255);
				}
			}else{
				placeObject(this);
			}
			if(!this.mort) this.shoot();
		}
	}
	
	this.shoot = function() {
		let j;
		let testShoot = false;
		if(this.dir == -1 && this.x > game.perso.x) testShoot = true;
		else if(this.dir == 1 && this.x < game.perso.x) testShoot = true;
		
		if(testShoot) {
			const y = (this.y >> 8) + 13;
			const y2 = (game.perso.y >> 8) + 16;
			
			if(Math.abs(y - y2) > 32) testShoot = false; 
			
		}
		
		if(this.mort==0 && testShoot && !game.perso.mort) {
			this.coolTime--;
			if(this.coolTime<0) this.coolTime = 0;
			if(this.coolTime==0){
				if(this.dir==1) j = (this.x>>8)+16;
				else j = (this.x>>8);
				const ySent = (this.y>>8) + 12;
				let dansLeChamp = 0;
				let exitt = 0;
				const oldJ = j;
				//var freeze = 0;
				while(j>=0&&j<512&&!dansLeChamp&&!exitt){
					const tile = getTile(j,ySent);
					if(tile!=0) {
						exitt = 1;
						break;
					}
					else {
						if(collideAnyCaisse(j,ySent)) {
							exitt = 2;
							break;
						}
						else {
							const t = toucheJoueur(j,ySent);
							if(t) {
								dansLeChamp = t;
								break;
							}
						}
					}
					j+=this.dir*14;
					if(oldJ==j) exitt = 1;
				}
				if(exitt == 2) {
					this.rotation--;
					if(this.rotation<0) this.rotation = 0;
					this.ex = j<<8;
				}else if(dansLeChamp){
					this.ex = j<<8;
					this.rotation--;
					this.inSight = dansLeChamp;
					dansLeChamp--;
					if(this.rotation<0) this.rotation = 0;
					if(!this.rotation){
						this.animFrame = 1 - this.animFrame;
						game.perso.vie -= 640;//2.5
						game.perso.timeVie = 300;
						game.perso.vx+=this.dir<<8;
						this.coolTime = this.startCool;
						playSoundIfFinished(sfx_shoot);
						
						for(let i=0; i<5; i++) {
							const s = new Sparkle();
							s.x = game.perso.x + (this.pX<<7) + random(-8<<8,8<<8);
							s.y = game.perso.y + (this.pY<<6);
							s.used = 5;
							s.vx = parseInt(random(512, 1024) * this.dir);
							s.vy = random(-3<<8,0);
							s.fading = 50;
							s.color = 1;
							s.portalNum = -1;
							game.sparkles.push(s);
						}
						
						/*ECART_SHAKE_X = 64 + randMinMax(-5,5);
						ECART_SHAKE_Y = 96 + randMinMax(-5,5);*/
					}
				}else{
					this.inSight = 0;
					if(++this.rotation>10) this.rotation = 10;
				}
			}else this.animFrame = 0;
		}else {
			if(this.mort==0) {
				this.animFrame = 0;
				this.rotation = 10;
			}
		}
	}
}

function toucheJoueur(j, ySent){
	const x = game.perso.x>>8;
	const y = game.perso.y>>8;
	if(j>=x && j<x+15 && ySent>=y && ySent<y+31) return 1;
	return 0;
}

function Robot() {
	this.x = 18 << 8;
	this.y = 30 << 8;
	this.ex = this.x + (29 << 8);
	this.ey = this.y + (26 << 8);
	this.vx = 0;
	this.vy = 0;
	this.doingAction = false;
	this.actionDir = 0;
	this.eye = 0;
	this.eyeDir = 0;
	this.blinking = 0;
	this.movx = 128;
	this.movy = 48;
	
	this.move = function() {
		if(this.vy != 0 || this.vx != 0) {
			this.ex += this.vx;
			this.ey += this.vy;
			
			if(this.ex>>8 > (this.x >> 8) + 29 + 10) {
				this.ex = ((this.x >> 8) + 29 + 10) << 8;
				this.vx = 0;
				this.doingAction = false;
			}else if(this.ex>>8 < (this.x >> 8) + 29 - 8) {
				this.ex = ((this.x >> 8) + 29 - 8) << 8;
				this.vx = 0;
				this.doingAction = false;
			}
			
			if(this.ey>>8 > (this.y >> 8) + 26 + 10) {
				this.ey = ((this.y >> 8) + 26 + 10) << 8;
				this.vy = 0;
				this.doingAction = false;
			}else if(this.ey>>8 < (this.y >> 8) + 26 - 10) {
				this.ey = ((this.y >> 8) + 26 - 10) << 8;
				this.vy = 0;
				this.doingAction = false;
			}
		}
		
		if(this.movx != 0) {
			this.x += this.movx;
			this.ex += this.movx;
			this.ey += this.movy;
			this.y += this.movy;
			
			if(this.y > 32 << 8) {
				this.y = 32 << 8;
				this.movy = -this.movy;
				//this.ey = this.y + (26 << 8);
			}else if(this.y < 30 << 8) {
				this.y = 30 << 8;
				this.movy = -this.movy;
				//this.ey = this.y + (26 << 8);
			}
			
			if(this.x > 35 << 8) {
				this.x = 35 << 8;
				//this.ex = this.x + (29 << 8);
				this.movx = 0;
				this.movy = 0;
			}else if(this.x < 0 << 8) {
				this.x = 0 << 8;
				//this.ex = this.x + (29 << 8);
				this.movx = 0;
				this.movy = 0;
			}
		}
		
		if(this.vx != 0) {
			if(this.ex >> 8 == (this.x + (29 << 8)) >> 8) {
				this.doingAction = false;
				this.vx = 0;
			}
		}
		if(this.vy != 0) {
			if(this.ey >> 8 == (this.y + (26 << 8)) >> 8) {
				this.doingAction = false;
				this.vy = 0;
			}
		}
		
		if(this.blinking > 0) {
			if(--this.blinking == 0) {
				this.eye += this.eyeDir;
				this.blinking = 2;
				if(this.eye == 4) {
					this.eyeDir = -this.eyeDir;
					this.eye = 3;
				}else if(this.eye == 0) {
					this.blinking = 0;
				}
			}
		}
	}
	
	this.lookLeftRight = function(dir) {
		if(!this.doingAction) {
			this.doingAction = true;
			this.vx = 128 * dir;
			this.actionDir = this.vx;
		}
	}
	
	this.lookUpDown = function(dir) {
		if(!this.doingAction) {
			this.doingAction = true;
			this.vy = 128 * dir;
			this.actionDir = this.vy;
		}
	}
	
	this.moveRobot = function(dir) {
		if(!this.doingAction) {
			if((dir < 0 && this.x < 18 << 8) || (dir > 0 && this.x > 18 << 8 )) dir = -dir;
			this.doingAction = true;
			this.vx = 128 * dir;
			this.movx = 128 * dir;
			this.movy = 64;
		}
	}
	
	this.blink = function() {
		if(this.eye == 0) {
			this.eye = 1;
			this.eyeDir = 1;
			this.blinking = 2;
		}
	}
}

function Camera(x, y) {
	this.x = x;
	this.y = y;
	this.vx = 0;
	this.vy = 0;
	
	this.inert = 1;
	this.dy = 0;
	
	this.move = function() {
		this.x += this.vx;
		this.y += this.vy;
	
		let angle;
		
		if(game.perso.flip == -1) {
			angle = 335;
		}else {
			angle = 185;
		}
		
		const dx = game.perso.x + Math.cos(angle / 180 * Math.PI) * (40 << 8);
		const dy = game.perso.y + Math.sin(angle / 180 * Math.PI) * (40 << 8);
		
		this.vx = (dx - this.x) >> 4;
		this.vy = (dy - this.y) >> 4;
		
		this.dy += this.inert * 6;
		this.y += this.dy;
		if(this.dy >= 64) this.inert = -this.inert;
		else if(this.dy <= -64) this.inert = -this.inert;
	}
}

function Replay() {
	this.inputs = new Array();
	this.mouseX = new Array();
	this.mouseY = new Array();
	this.states = {};
	this.bossSpeech = -1;
}

function Perso() {
	this.isLeft = 0;
	this.isRight = 0;
	this.oldIsJump = 0;
	this.isJump = 0;
	this.isDown = 0;
	this.x = 0;
	this.y = 0;
	this.vx = 0;
	this.vy = 0;
	this.pX = 15;
	this.pY = 27;
	this.flip = 1;
	this.timePosePortal = 25;
	this.timePassedPortal = 0;
	this.porte = 0;
	this.animeTime = 10;
	this.animeFrame = 0;
	this.vie = 100 << 8;
	this.mort = 0;
	this.timeVie = 0;
	this.type = "perso";
	this.fadeNextLevel = 120;
	this.intermissionFade = 0;
	this.askClear = false;
  
	this.midX = function() {
		return (this.x >> 8) + (this.pX>>1);
	}
  
	this.midY = function() {
		return (this.y >> 8) + (this.pY>>1);
	}

	this.checkMort = function() {
		if(this.vie<=0 && !this.mort){
			if(game.replayMode) {
				reportBrokenReplay();
				return;
			}
		
			this.mort = 1;
			this.vie = -256;
			playSound(sfx_pain);
			playSound(sfx_flatline);
			if(game.perso.y>>8 < 384) {
				for(let i=0; i<20; i++) {
					const s = new Sparkle();
					s.x = game.perso.x + (this.pX<<7) + random(-14<<8,8<<8);
					s.y = game.perso.y + (this.pY<<6);
					s.used = 6;
					s.vx = 0;
					s.vy = random(-2<<8,0);
					s.fading = 150;
					s.color = 1;
					s.portalNum = -1;
					game.sparkles.push(s);
				}
			}
		}else if(this.mort) {
			if(this.vie >= 0) {
				setSoundVolume(sfx_flatline, 1);
				if(ui.currentMenu == 2 || ui.currentMenu == 6) {
					loadLevel(ui.currentLevel);
					if(game.bossNum > 0) skipComingBoss();
				}
			}
		}
	}
	
	this.move = function() {
		//particles around the character
		let cpt, s, ffi, i;
		if(this.timePassedPortal < 0) {
			if(++this.timePassedPortal<0 && this.timePassedPortal%6==0){
				for(cpt = 0;cpt<3;cpt++){
					s = new Sparkle();
					s.x = this.x + (this.pX<<7) + random(-8<<8,8<<8);
					s.y = this.y + (this.pY<<7) + random(-16<<8,16<<8);
					s.used = 4;
					s.vx = parseInt(random(32, 64));
					s.vy = parseInt(random(32, 64));
					s.fading = 200;
					s.color = 0;
					s.portalNum = -1;
					if(parseInt(random(2))==0) s.vx = -s.vx;
					if(parseInt(random(0, 2))==0) s.vy = -s.vy;
					game.sparkles.push(s);
				}
			}
		}else if(this.timePassedPortal > 0) {
			if(--this.timePassedPortal>0 && this.timePassedPortal%6==0){
				for(cpt = 0;cpt<5;cpt++){
					s = new Sparkle();
					s.x = this.x + (this.pX<<7) + random(-8<<8,8<<8);
					s.y = this.y + (this.pY<<7) + random(-16<<8,16<<8);
					s.used = 4;
					s.vx = parseInt(random(32, 64));
					s.vy = parseInt(random(32, 64));
					s.fading = 255;
					s.color = 1;
					s.portalNum = -1;
					if(parseInt(random(2))==0) s.vx = -s.vx;
					if(parseInt(random(0, 2))==0) s.vy = -s.vy;
					game.sparkles.push(s);
				}
			}
		}
		
		if(this.askClear) {
			clearPortals();
			this.askClear = false;
		}
		
		const ffield = inForceFieldTp(this);
		if(ffield.length > 0) {
			game.perso.vx = 0;
			game.perso.vy = 0;
		}
		for(i in ffield) {
			const f = ffield[i];
			if(ffield.length == 1) {
				if(game.forceFields[f].vx != 0) {
					if(checkTeleportHaut(this) || checkTeleportBas(this)) {
						if((game.perso.y >> 8) < game.forceFields[f].y) game.perso.y += 768;
						else if((game.perso.y >> 8) + game.perso.pY > game.forceFields[f].y + 32) game.perso.y -= 768;
					}
					else if((game.perso.y >> 8) < game.forceFields[f].y) game.perso.y += 512;
					else if((game.perso.y >> 8) + game.perso.pY > game.forceFields[f].y + 32) game.perso.y -= 512;
				}else if(game.forceFields[f].vy != 0) {
					if(game.perso.x >> 8 < game.forceFields[f].x + (16 - (game.perso.pY>>1))) game.perso.x += 256;
					else if((game.perso.x >> 8) + game.perso.pX > game.forceFields[f].x + 32 - (16 - (game.perso.pY>>1))) game.perso.x -= 256;
				}
			}
			
			game.perso.vx += game.forceFields[f].vx * 384;
			game.perso.vy += game.forceFields[f].vy * 384;
			
			if(game.forceFields[f].vx != 0) {
				if(this.isJump) {
					game.perso.y -= 3<<8;
					ffi = inForceFieldTp(this);
					if(ffi.length == 0) {
						game.perso.vy = -800;
						game.perso.vx = game.forceFields[f].vx << 9;
					}
				}
				if(this.isDown) game.perso.y += 3<<8;
			}
			
			if(game.forceFields[f].vy != 0) {
				if(this.isLeft) {
					game.perso.x -= 3<<8;
					ffi = inForceFieldTp(this);
					if(ffi.length == 0) {
						game.perso.vx = -384;
					}
				}
				if(this.isRight) {
					game.perso.x += 3<<8;
					ffi = inForceFieldTp(this);
					if(ffi.length == 0) {
						game.perso.vx = 384;
					}
				}
			}
		}
		
		let toucheSol = touchingGround(this);
		const carp = onCarpet(this);
		this.x += carp == 3 ? 384 : carp == 4 ? -384 : 0;
	
		this.animeTime -= 1 + 2 * (1 - (toucheSol == 2 ? 1 : 0));
		if(this.animeTime <= 0) {
			this.animeTime = 10;
			if(++this.animeFrame == 4) this.animeFrame = 1;
		}
		
		if(++this.timePosePortal>25) this.timePosePortal = 25;
		
		if(this.timeVie > 0) {
			this.timeVie--;
		}
		
		if(this.timeVie == 0 && this.vie < 100<<8) {
			if((this.vie+=256)>(100<<8)) this.vie = 100<<8;
		}
		
		if(this.vie <= (50<<8)) {
			const h = this.vie >> 8;
			const r = game.TIME%h;
			
			for(i = 0; r==0 && i<3; i++) {
				s = new Sparkle();
				s.x = game.perso.x + (this.pX<<5) + random(-5<<8,5<<8);;
				s.y = game.perso.y + (this.pY<<6) + random(-5<<8,5<<8);
				s.used = 7;
				s.vx = 0;
				s.vy = 0;
				s.fading = 100;
				s.color = 1;
				s.portalNum = -1;
				game.sparkles.push(s);
			}	
		}
		
		//console.log(this.timeVie);
		
		let dir = (this.isRight - this.isLeft) * 128;
		
		//jump handling
		if(this.isJump && toucheSol && !checkTeleportBas(this) && ffield.length == 0){
			this.vy = -1300;
			playSound(sfx_jump);
		}else if(!this.isJump && this.oldIsJump && this.vy<-200){
			this.vy = -200;
		}
		//end of jump handling
		
		if(this.vx>0){
			if(toucheSol==1 && !checkTeleportGauche(this)){
				game.STEPS+=(game.perso.vx)>>4;
				this.vx-=64;
			}else {
				this.vx-=toucheSol == 2 ? 14 : 28;
			}
			if(this.vx<0) this.vx = 0;
		}else if(this.vx<0){
			if(toucheSol==1 && !checkTeleportDroite(this)){
				game.STEPS-=(game.perso.vx)>>4;
				this.vx+=64;
			}else {
				this.vx+=toucheSol == 2 ? 14 : 28;
			}
			if(this.vx>0) this.vx = 0;
		}
		
		if(dir == 0 && toucheSol) this.animeFrame = 0;
		
		if(ffield.length == 0) {
			if(this.vx>448 && toucheSol==1 && !checkTeleportGauche(this) && !checkTeleportDroite(this)) this.vx = 448;
			else if(this.vx<-448 && toucheSol==1 && !checkTeleportGauche(this) && !checkTeleportDroite(this)) this.vx = -448;
			if(this.vx>672 && toucheSol>1 && !checkTeleportGauche(this) && !checkTeleportDroite(this)) this.vx = 672;
			else if(this.vx<-672 && toucheSol>1 && !checkTeleportGauche(this) && !checkTeleportDroite(this)) this.vx = -672;
		}
		
		if(!toucheSol || checkTeleportBas(this)) {
			if(ffield.length == 0) this.vy+=GRAVITY;
			dir = parseInt((dir*0.28));
			if(this.vy>(10<<8)+128) this.vy = (10<<8)+128;
		}
		
		if(ffield.length == 0) {
			if(toucheSol != 2) this.vx+=dir;
			else if(toucheSol==2) this.vx += dir>>2;
		}
		
		for(i=0;i<8;i++){
			if(!checkTeleportBas(this)&&!checkTeleportHaut(this)) this.x += this.vx>>3;
			if(!checkTeleportGauche(this)&&!checkTeleportDroite(this)) this.y += this.vy>>3;
		}
		
		let plate = onPlateforme(this);
		if(plate){
			plate-=200;
			this.x += game.platforms[plate].vx;
		}
		
		toucheSol = touchingGround(this);
		
		let col = 1;		
		while(col && !dansUnPortal(this)){
			col = checkCollisions(this);
		}
		
		if(checkTeleportHaut(this) && this.vy>0){
			if(downCollision(this)) this.vy = -this.vy;
		}else if(checkTeleportBas(this) && this.vy<0){
			if(upCollision(this)) this.vy = -this.vy;
		}
		
		toucheCake();
		grabObject();
		fieldForceTest();
		
		if(ui.currentMenu != 6 || ui.tutoPortal) {
			if(input.mousePressed && this.timePosePortal == 25 && !dansUnPortal(this) && !objetPortee() ) {
				if (input.mouseButton == LEFT) {
					launchPortal(0);
				}else if (input.mouseButton == RIGHT) {
					launchPortal(1);
				}
			}
		}
		
		
		const colLeft = leftCollision(this);
		const colRight = rightCollision(this);
		if(colLeft && colRight && !dansUnPortal(this)){
			if((colLeft>=200 && colLeft<=210) || (colRight>=200 && colRight<=210)){
				this.vie = 0;
			}
		}
		
		if(plasmaToucheObjet(this) || toucheTileMort(this)){
			this.vie = 0;
		}
		
		if(this.y>(384+40)<<8) this.vie = 0;
		this.oldIsJump = this.isJump;
		this.checkMort();
	}
}

function fieldForceTest() {
	if(game.portals[0].used || game.portals[1].used) {
		if(inForceField(game.perso)) {
			let i;
			for(i=0;i<2;i++){
				game.portals[i].used = 0;
				removeSparkles(i, 3);
			}
		}
	}
}

function inForceField(obj) {
	let i, j;
	for(i=0;i<=obj.pY - 1;i+=2){
		for(j=0;j<=obj.pX - 1;j+=2){
			const t = getTileSimple((obj.x>>8) + j, (obj.y>>8) + j);
			if(t>=49 && t<=54) {				
				return true;
			}
		}
	}
	return false;
}

function manageSparkles() {
	let d, i, sc;
	for(i=0;i<game.sparkles.length && settings.quality > 0;i++) {
		if(game.sparkles[i].used == 5) game.sparkles[i].vy += GRAVITY;
		else if(game.sparkles[i].used == 6 || game.sparkles[i].used == 7) game.sparkles[i].vy += GRAVITY>>1;
	
		if(game.sparkles[i].floorTime < 0) {
			game.sparkles[i].x += game.sparkles[i].vx;
			game.sparkles[i].y += game.sparkles[i].vy;
			sc = game.sparkles[i].fading / 255;
		}else {		
			if(game.sparkles[i].used == 7) {
				game.sparkles[i].fading -= 0.7;
				sc = game.sparkles[i].fading / 255;
			}else if(game.sparkles[i].used == 5) {
				if(++game.sparkles[i].floorTime >= 120) game.sparkles[i].fading -= 0.7;
				sc = game.sparkles[i].fading / 255;
			}
		}
		
		if(game.sparkles[i].used >= 5 && game.sparkles[i].used < 8) {
			if(getTile((game.sparkles[i].x>>8) + ((16*sc)>>1), (game.sparkles[i].y>>8) + ((16*sc)>>1)) != 0) {
				if(game.sparkles[i].floorTime < 0) {
					if(game.sparkles[i].used == 7 || game.sparkles[i].used == 5) {
						game.sparkles[i].floorTime = 0;
					}else {
						game.sparkles[i].fading = 0;
					}
				}
			}
		}
		
		if(game.sparkles[i].used == 1 || game.sparkles[i].used == 4) {
			game.sparkles[i].fading -= 8;
			if(getTile((game.sparkles[i].x>>8) + 4, (game.sparkles[i].y>>8) + 4) != 0) game.sparkles[i].fading = 0;
		}else if(game.sparkles[i].used == 3) {
			if(game.sparkles[i].vx != 0) {
				d = Math.abs(game.sparkles[i].xOrig - game.sparkles[i].x) >> 8;
				game.sparkles[i].fading = 200 - (5 * d);
			}else if(game.sparkles[i].vy != 0) {
				d = Math.abs(game.sparkles[i].yOrig - game.sparkles[i].y) >> 8;
				game.sparkles[i].fading = 200 - (5 * d);
				const n = game.sparkles[i].portalNum;
				const plt = game.portals[n].plateforme;
				if(plt >= 0) {
					game.sparkles[i].x += game.platforms[plt].vx;
					game.sparkles[i].xOrig = game.sparkles[i].x;
				}
			}
		}else if(game.sparkles[i].used == 8 || game.sparkles[i].used == 9) {
			game.sparkles[i].fading -= 8;
			//if( sparkles[i].used == 9) sparkles[i].vy += GRAVITY;
		}
		
		if(settings.quality > 0 && game.sparkles[i].fading > 0) {
			let dt = 9 - (sc * 9);
			if(game.sparkles[i].used == 7 || game.sparkles[i].used == 5) {
				dt -= 8;
			}
			ctx.drawImage(sparkle, 0, game.sparkles[i].color * 9, 9, 9, (game.sparkles[i].x>>8) + dt + game.ECART_X, (game.sparkles[i].y>>8) + dt + game.ECART_Y, 16 * sc, 16 * sc); 
		}
		
		if(game.sparkles[i].fading <= 0) {
			if(game.sparkles[i].used == 1 || game.sparkles[i].used == 4) {
				game.sparkles.splice(i, 1);
				i--;
			}else if(game.sparkles[i].used == 3) {
				game.sparkles[i].x = game.sparkles[i].xOrig;
				game.sparkles[i].y = game.sparkles[i].yOrig;
				game.sparkles[i].fading = 200;
			}
		}
	}
}

function clearPortals(){
	let ok = 1;
	let i = 0;
	for(i in game.caisses) {
		if(!ok) break;
		if(game.caisses[i].shrink == 0 && dansUnPortal(game.caisses[i])) ok = 0;
	}

	if(ok) {
		for(i in game.tourelles){
			if(game.tourelles[i].mort == 0 && dansUnPortal(game.tourelles[i])) ok = 0;
		}
	}
	
	if(ok && game.plasmaBall.length > 0 && dansUnPortal(game.plasmaBall[0])) ok = 0;
	
	if(ok && dansUnPortal(game.perso)) ok = 0;
	
	if(ok){
		for(i=0;i<2;i++){
			game.portals[i].used = 0;
			removeSparkles(i, 3);
		}
	}
}

function validerArrivee(){
	let i;
	for(i=0;i<768;i++){
		if(game.map[i]==35) {
			game.map[i] = 22;
			game.displayMap[i] = 22;
		}
	}
	reloadTiles();
}

function toucheCake(){
	let i;
	for(i=0;i<game.cakes.length;i++){
		if(game.cakes[i].used){
			if(persoToucheCake(i)){
				game.cakes[i].used = 0;
				game.CAKELEFT--;
				createCakeOrSmokeSparkles(game.cakes[i].x, game.cakes[i].y, 8, 2, 180);
				playSound(sfx_grabCake);
				if(game.CAKELEFT==0) validerArrivee();
			}
		}
	}
}

function createCakeOrSmokeSparkles(x, y, type, number, size) {
	let k;
	for(k=0;k<number;k++){
		const s = new Sparkle();
		s.x = x + parseInt(random(-8<<8,8<<8));
		s.y = y + parseInt(random(-8<<8,8<<8));
		s.used = type;
		s.vx = parseInt(random(-192, 192));
		s.vy = parseInt(random(-192, -96));
		s.fading = size;
		if(type == 8) s.color = 2;
		else if(type == 9) s.color = 3;
		s.portalNum = -1;
		game.sparkles.push(s);
	}
}


function persoToucheCake(i){
	let retour = 0;

	const posx = game.perso.x>>8;
	const posy = (game.perso.y>>8);
	const pX = game.perso.pX;
	const pY = game.perso.pY;
	const x = game.cakes[i].x>>8;
	const y = game.cakes[i].y>>8;
	
	if(posx+pX>x && x+16>posx && posy+pY>y && y+16>posy){
		retour =  1;
	}
	
	return retour;
}

function Cake(x, y) {
	this.x = x;
	this.y = y;
	this.ox = x;
	this.oy = y;
	this.mDir = parseInt(random(0, 1)) == 0 ? -1 : 1;
	this.vy = random(-3<<8, 3<<8);
	this.used = true;
}

function Portal() {
	this.x = 0;
	this.y = 0;
	this.vx = 0;
	this.vy = 0;
	this.scaleX = 1;
	this.scaleY = 1;
	this.used = false;
	this.direction = 0;
	this.plateforme = -1;
	this.frame = 0;
	this.portalNum = -1;
	
	this.move = function() {
		if(this.used && this.plateforme>-1){
			this.x += game.platforms[this.plateforme].vx;
		}
	}
}

function Sparkle() {
	this.x = 0;
	this.y = 0;
	this.xOrig = 0;
	this.yOrig = 0;
	this.vx = 0;
	this.vy = 0;
	this.used = 0;
	this.color = 0;
	this.floorTime = -1;
}

function AnimatedTile(x, y, min, max, type, place, speed) {
	this.x = x;
	this.y = y;
	this.used = 1;
	this.current = min;
	this.min = min;
	this.max = max;
	this.type = type;
	this.place = place;
	this.speed = speed;
}

function Plasma(x, y, vx, vy) {
	this.x = x;
	this.y = y;
	this.xOrig = x;
	this.yOrig = y;
	this.vx = vx;
	this.vy = vy;
	this.origVx = vx;
	this.origVy = vy;
	this.vMax = 424;
	this.pX = 16;
	this.pY = 16;
	this.used = 1;
	this.scale = 1;
	this.scaleDir = -1;
	this.type = "plasma";
	this.animFrame = 0;
	this.needKill = false;
	
	this.move = function() {
		if(game.TIME%10==0) {
			this.scale += 1 * this.scaleDir;
			if(this.scale < -2 || this.scale > 2) this.scaleDir = -this.scaleDir;
		}
	
		this.x+=this.vx;
		this.y+=this.vy;
		
		const vx = this.vx;
		const vy = this.vy;
		
		if(!dansUnPortal(this)){
			this.checkCollision();
			if(game.bossNum == 3 || game.bossNum == 4) {
				if(this.x < game.perso.x) this.vx += 4;
				else if(this.x > game.perso.x) this.vx -= 4;
				if(this.y < game.perso.y) this.vy += 4;
				else if(this.y > game.perso.y) this.vy -= 4;
				
				const vmx = 3;
				
				if(this.vx > (vmx<<8)) this.vx = vmx << 8;
				else if(this.vx < -(vmx<<8)) this.vx = -(vmx << 8);
				if(this.vy > (vmx<<8)) this.vy = vmx << 8;
				else if(this.vy < -(vmx<<8)) this.vy = -(vmx << 8);
				
				if(this.x > game.tubeX) this.needKill = true;
			}
		}
		
		if(game.bossNum == 0) {
			if(vx&&this.vy) this.vx = 0;
			else if(vy&&this.vx) this.vy = 0;
			if(this.vx>this.vMax) this.vx = this.vMax;
			else if(this.vx<-this.vMax) this.vx = -this.vMax;
			if(this.vy>this.vMax) this.vy = this.vMax;
			else if(this.vy<-this.vMax) this.vy = -this.vMax;
		}
		
		if((this.y>>8)>384 || (this.y>>8)<=-16 || (this.x>>8)>512 || (this.x>>8)<-16){
			this.x = this.xOrig;
			this.y = this.yOrig;
			this.vx = this.origVx;
			this.vy = this.origVy;
		}else {
			const t = getTileSimple((this.x>>8) + 8, (this.y>>8) + 8);
			if(t == 38 || t == 39 || t == 47) {
				this.x = this.xOrig;
				this.y = this.yOrig;
				this.vx = this.origVx;
				this.vy = this.origVy;
			}
		}
	}
	
	this.ouvrirPorte = function(){
		let i;
		for(i in game.animatedTiles) {
			if(game.animatedTiles[i].current>=29 && game.animatedTiles[i].current<=34){
				game.animatedTiles[i].used = 0;
				game.map[game.animatedTiles[i].place] = 0;
				if(settings.quality == 0) {
					game.displayMap[game.animatedTiles[i].place] = 0;
					game.needLoad = true;
				}
			}
		}
	}
	
	this.encore = function() {
		let i;
		for(i=0;i<768;i++){
			if(game.map[i]==21) return 1;
		}
		return 0;
	}
	
	this.checkCollision = function() {
		let x, y, i;
		let dist = getDistance(this.x>>8, this.x>>8, game.perso.x>>8, game.perso.y>>8);
		if(dist > 384) dist = 384;
		setSoundVolume(sfx_bounce, 1 - (dist / 384));

		if(getCollision(this)==GAUCHE){
			playSound(sfx_bounce);
			do{
				this.x+=128;
			}while(getCollision(this)==GAUCHE);
			this.vx = -this.vx;
			
			x = (this.x>>8) - 1;
			y = this.y>>8;
			for(i=2;i<=14 && game.bossNum == 0;i++){
				if(getTileSimple(x,y+i)==21){
					y+=i;
					x>>=4;
					y>>=4;
					game.map[x+(y<<5)] = 1;
					game.displayMap[x+(y<<5)] = 1;
					reloadTiles();
					if(!this.encore()){
						this.used = 0;
						this.ouvrirPorte();
					}else{
						this.x = this.xOrig;
						this.y = this.yOrig;
						this.vx = this.origVx;
						this.vy = this.origVy;
					}
				}
			}
		}else if(getCollision(this)==DROITE){
			playSound(sfx_bounce);
			do{
				this.x-=128;
			}while(getCollision(this)==DROITE);
			this.vx = -this.vx;
			
			x = (this.x>>8) + 16;
			y = this.y>>8;
			for(i=2;i<=14 && game.bossNum == 0;i++){
				if(getTileSimple(x,y+i)==21){
					y+=i;
					x>>=4;
					y>>=4;
					game.map[x+(y<<5)] = 1;
					game.displayMap[x+(y<<5)] = 1;
					reloadTiles();
					if(!this.encore()){
						this.used = 0;
						this.ouvrirPorte();
					}else{
						this.x = this.xOrig;
						this.y = this.yOrig;
						this.vx = this.origVx;
						this.vy = this.origVy;
					}
				}
			}
		}else if(getCollision(this)==HAUT){
			playSound(sfx_bounce);
			do{
				this.y+=128;
			}while(getCollision(this)==HAUT);
			this.vy = -this.vy;
			
			x = this.x>>8;
			y = (this.y>>8) - 1;
			for(i=4;i<=12 && game.bossNum == 0;i++){
				if(getTileSimple(x+i,y)==21){
					x+=i;
					x>>=4;
					y>>=4;
					game.map[x+(y<<5)] = 1;
					game.displayMap[x+(y<<5)] = 1;
					reloadTiles();
					if(!this.encore()){
						this.used = 0;
						this.ouvrirPorte();
					}else{
						this.x = this.xOrig;
						this.y = this.yOrig;
						this.vx = this.origVx;
						this.vy = this.origVy;
					}
				}
			}
		}else if(getCollision(this)==BAS){
			playSound(sfx_bounce);
			do{
				this.y-=128;
			}while(getCollision(this)==BAS);
			this.vy = -this.vy;

			x = this.x>>8;
			y = (this.y>>8) + 16;
			for(i=4;i<=12 && game.bossNum == 0;i++){
				if(getTileSimple(x+i,y)==21){
					x+=i;
					x>>=4;
					y>>=4;
					game.map[x+(y<<5)] = 1;
					game.displayMap[x+(y<<5)] = 1;
					reloadTiles();
					if(!this.encore()){
						this.used = 0;
						this.ouvrirPorte();
					}else{
						this.x = this.xOrig;
						this.y = this.yOrig;
						this.vx = this.origVx;
						this.vy = this.origVy;
					}
				}
			}
		}
	}
}

function plasmaToucheObjet(obj){
	let i;
	for(i in game.plasmaBall) {
		if(game.plasmaBall[i].used) {
			const posx = obj.x>>8;
			const posy = obj.y>>8;
			const px = obj.pX;
			const py = obj.pY;
			
			const x = game.plasmaBall[i].x>>8;
			const y = game.plasmaBall[i].y>>8;
			if(posx+px>x && x+16>posx && posy+py>y && y+16>posy) return 1;
		}
	}
	
	return 0;
}

function Platform(x, y, vx, vy) {
	this.x = x;
	this.y = y;
	this.pX = 48;
	this.pY = 16;
	this.vx = vx;
	this.vy = vy;
	this.type = "plateforme";
	this.dir = vx > 0 ? 1 : -1;
	
	this.move = function() {
		this.x += this.vx;
		const x = this.x>>8;
		//var y = plateForme[i].y>>8;
		if(x<0 || x>512-48 || (this.vx>0 && rightCollision(this)) || (this.vx<0 && leftCollision(this))){
			//this.x-=this.vx;
			this.vx = -this.vx;
		}
	}
}

function onCarpet(obj) {
	const toucheSol = touchingGround(obj);
	if(toucheSol == 3 || toucheSol == 4) {
		return toucheSol;
	}else {
		let cai = collideCaisse(obj.x>>8,(obj.y>>8) + obj.pY);
		if(!cai) cai = collideCaisse((obj.x>>8)+obj.pX-1,(obj.y>>8) + obj.pY);
		if(cai){
			cai-=300;
			if(game.caisses[cai].carpet > 0) return game.caisses[cai].carpet;
		}
	}
	
	return 0;
}

function onPlateforme(obj){
	let plate = collidePlateforme(obj.x>>8,(obj.y>>8) + obj.pY);
	if(!plate) plate = collidePlateforme((obj.x>>8)+obj.pX-1,(obj.y>>8) + obj.pY);
	if(!plate){
		let cai = collideCaisse(obj.x>>8,(obj.y>>8) + obj.pY);
		if(!cai) cai = collideCaisse((obj.x>>8)+obj.pX-1,(obj.y>>8) + obj.pY);
		if(cai){
			cai-=300;
			if(game.caisses[cai].plateforme>-1) plate = 200 + game.caisses[cai].plateforme;
		}
	}
	
	return plate;
}

function collidePlateforme(x, y){
	let plt;
	for(plt in game.platforms){
		const x2 = game.platforms[plt].x>>8;
		const y2 = game.platforms[plt].y>>8;
		if(x>x2 && x<x2+48 && y>=y2 && y<y2+15){
			const ret = parseInt(plt);
			return 200 + ret;
		}
	}
	return 0;
}

function forceField(x, y, w, h, vx, vy) {
	this.x = x;
	this.y = y;
	this.h = h;
	this.w = w;
	this.vx = vx;
	this.vy = vy;
}

function Tunnel(x, y, dir) {
	this.x = x;
	this.y = y;
	this.dir = dir;
	this.pX = 16;
	this.pY = 32;
	this.vx = 0;
	this.vy = 0;
}

function persoTouchBoss() {
	const x = (game.perso.x>>8) + game.perso.pX;
	const y = (game.perso.y>>8) + (game.perso.pY>>1);
	const x2 = game.bossX + 15;
	const y2 = game.bossY;

	if(x > x2 && y > y2 && y < y2 + 58) return true;

	return false;	  
}

function manageToucheBoss(obj) {
  let i;
  const posx = obj.x>>8;
  const posy = (obj.y>>8);
  const pX = obj.pX;
  const pY = obj.pY;
  const x = game.bossX + 16;
  const y = game.bossY;
  
  if(game.bossLife < 3 && posx+pX>x && x+74>posx && posy+pY>y && y+58>posy){
    if(game.bossNum == 1 || game.bossNum == 3 || game.bossNum == 4) obj.needKill = true;
	else if(game.bossNum == 2) {
		obj.x = (80) << 8;
		obj.y = (-16) << 8;
		obj.vx = 0;
		obj.vy = 0;
	}
    game.bossLife++;
	if(game.bossLife < 3) {
		for(i in game.oldMap) {
			if(game.oldMap[i] == 58) {
				game.map[i] = 58;
				game.displayMap[i] = 58;
			}
		}
		game.needLoad = true;
	}else {
		game.projos = new Array();
		game.plasmaBall = new Array();
		game.bossIsComing = true;
		game.bossIsTalking = true;
		game.rumbleTime = 0;
	}
  }
}

function manageInTube(obj) {
	if(obj.vx < 0) return;

	const posx = obj.x>>8;
	const posy = (obj.y>>8);
	const pX = obj.pX;
	const pY = obj.pY;
	const x = game.tubeX >> 8;
	const y = game.tubeY >> 8;

	if(posx+pX>x && x+64>posx && posy+pY>y && y+48>posy){
	obj.shrink = 60;
	}
}

function Projectile(x, y, vx, vy) {
	this.x = x;
	this.y = y;
	this.vx = vx;
	this.vy = vy;
	this.pX = 16;
	this.pY = 16;
	this.needKill = false;
	this.timer = 0;
	this.img = 36;
	
	this.move = function() {
		if(!this.needKill) {
			this.x += this.vx;
			this.y += this.vy;
			
			if(game.TIME%6 == 0) {
				if(++this.img == 38) this.img = 36;
			}
			
			const t = getTile((this.x>>8) + 8, (this.y>>8) + 8);
			
			if(t) {
				this.needKill = true;
				this.timer = 180;
				if(t > 200) {
					this.timer = 0;
				}
			}else {
				if(collideAnyCaisse((this.x>>8), (this.y>>8))) this.needKill = true;
				else if(collideAnyCaisse((this.x>>8) + 16, (this.y>>8))) this.needKill = true;
				else if(collideAnyCaisse((this.x>>8), (this.y>>8) + 16)) this.needKill = true;
				else if(collideAnyCaisse((this.x>>8) + 16, (this.y>>8) + 16)) this.needKill = true;
			}
		}else {
			if(--this.timer < 0) this.timer = 0;
		}
	}
}

function Caisse(x, y) {
	this.x = x;
	this.y = y;
	this.pX = 16;
	this.pY = 16;
	this.xOrig = x;
	this.yOrig = y;
	this.angle = 0;
	this.vx = 0;
	this.vy = 0;
	this.porter = 0;
	this.plateforme =-1;
	this.carpet = 0;
	this.type = "caisse";
	this.shrink = 0;
	this.needKill = false;
	this.invincibility = 0;
	this.noRemove = 0;
  
	this.midX = function() {
		return (this.x >> 8) + (this.pX>>1);
	}

	this.midY = function() {
		return (this.y >> 8) + (this.pY>>1);
	}
	
	this.move = function() {
		let i;
		if(this.invincibility > 0) this.invincibility--;
		if(this.noRemove > 0) this.noRemove--;
  
		if(this.shrink == 0) {
			if(!this.porter){      
				moveObject(this);
				
				if(game.bossNum > 0) {	//if in boss mode, first level
					if(game.bossNum == 1 || game.bossNum == 4) manageInTube(this);
          
					const t = getTileSimple((this.x >> 8) + this.pX + 1, this.y >> 8);
					if(t>= 58 && t <= 60) {
						for(i in game.map) {
							if(game.map[i] == t) {
								if(t < 60) {
									game.map[i]++;
									game.displayMap[i]++;
								}
								else  {
									game.map[i] = 0;
									game.displayMap[i] = 0;
								}
							}
						}
						game.needLoad = true;
						if(game.bossNum == 1 || game.bossNum == 3 || game.bossNum == 4) this.needKill = true;
						else if(game.bossNum == 2) {
							this.x = (80) << 8;
							this.y = (-16) << 8;
							this.vx = 0;
							this.vy = 0;
						}
						return;
					}
          
					manageToucheBoss(this);
				}
				
				let plt = onPlateforme(this);
				if(plt){
					plt -= 200;
					this.x += game.platforms[plt].vx;
					this.plateforme = plt;
					if(game.platforms[plt].vx < 0 && leftCollision(this)) this.x -= game.platforms[plt].vx;
					else if(game.platforms[plt].vx > 0 && rightCollision(this)) this.x -= game.platforms[plt].vx;
				}else this.plateforme = -1;

				if(!touchingGround(this)) this.angle += (this.vx>>8)<<1;
				else this.angle = 0;
				if(this.angle >= 360) this.angle -= 360;
				if(caisseSurPerso(this)) {
					//this.vx >>= 1;
					while(caisseSurPerso(this)) this.y -= 256;
					this.vy = 0;
					this.angle = 0;
				}
				const x = this.x>>8;
				const y = this.y>>8;
				if(x<-16 || x>512 || y<-16 || y>384 || toucheTileMort(this) || plasmaToucheObjet(this)){
					if(game.bossNum == 1 || game.bossNum == 3 || game.bossNum == 4) {	//if in boss mode, first, third or fourth level
						this.needKill = true;
						return;
					}
					this.x = this.xOrig;
					this.y = this.yOrig;
					this.vx = 0;
					this.vy = 0;
				}
			}else{
				if(this.carpet > 0) this.carpet = 0;
				placeObject(this);
			}
		} else {
			this.shrink -= 4;
			if(this.shrink == 0) {
				if(game.bossNum == 1 || game.bossNum == 4) {	//if in boss mode, first or fourth level
				  this.needKill = true;
				  return;
				}
				this.x = this.xOrig;
				this.y = this.yOrig;
				this.vx = 0;
				this.vy = 0;
			}
		}
		
		if(this.shrink == 0 && inForceField(this)) {
			this.porter = 0;
			this.shrink = 60;
		}
	}
}

function collideCaisse(x, y){
	let i;
	for(i in game.caisses){
		const x2 = game.caisses[i].x>>8;
		const y2 = game.caisses[i].y>>8;
		if(!game.caisses[i].porter && !dansUnPortal(game.caisses[i]) && x>x2 && x<x2+15 && y>y2 && y<y2+15){
			const ret = parseInt(i);
			return 300 + ret;
		}
	}
	return 0;
}

function projoTouchePerso(obj) {
	const posx = obj.x>>8;
	const posy = obj.y>>8;
	const px = obj.pX;
	const py = obj.pY;
	
	const x = game.perso.x>>8;
	const y = game.perso.y>>8;

	if(posx+px>x && x+game.perso.pX>posx && posy+py>y && y+game.perso.pY>posy) {
		return true;
	}
		
	return false;
}

function collideAnyCaisse(x, y) {
	let i;
	for(i in game.caisses){
		const x2 = game.caisses[i].x>>8;
		const y2 = game.caisses[i].y>>8;
		if(x>x2 && x<x2+15 && y>y2 && y<y2+15){
			const ret = parseInt(i);
			return 300 + ret;
		}
	}
	return 0;
}

function caisseSurInterrupteur(){
	let i;
	for(i in game.caisses){
		if(getTileSimple(game.caisses[i].x>>8,(game.caisses[i].y>>8)+19)==19){
			return 1;
		}else if(getTileSimple((game.caisses[i].x>>8)+15,(game.caisses[i].y>>8)+19)==19){
			return 1;
		}
	}
	return 0;
}

function caisseSurPerso(obj){
	if(obj.type == "caisse" && obj.vy > 0 && !dansUnPortal(obj)){	//the object is a crate
		let x = (obj.x>>8) + 3;
		const y = (obj.y>>8) + obj.pY;
		const x2 = game.perso.x>>8;
		const y2 = game.perso.y>>8;
		
		if(x>=x2 && x<x2+16 && y>=y2 && y<y2+4) return 1;
		else{
			x+=9;
			if(x>=x2 && x<x2+16 && y>=y2 && y<y2+4) return 1;
		}
	}
	return 0;
}

function caisseToucheObjet(obj){
	let i;
	const posx = obj.x>>8;
	const posy = obj.y>>8;
	const px = obj.pX;
	const py = obj.pY;
	
	for(i in game.caisses){
		if(game.caisses[i].porter==0 && (game.caisses[i].vx!=0 || game.caisses[i].vy!=0) && !dansUnPortal(game.caisses[i])){
			const x = game.caisses[i].x>>8;
			const y = game.caisses[i].y>>8;
			if(posx+px>x && x+16>posx && posy+py>y && y+16>posy) return i+1;
		}
	}
	return 0;
}

function placeObject(obj){
	let po, col;
	const x = game.perso.x + (game.perso.pX<<7);
	const y = game.perso.y + (game.perso.pY<<7);
	
	obj.x = x - (obj.pX << 7);
	obj.y = y - (obj.pY << 7);
	
	const cos = getCos(input.mouseX,input.mouseY,(x>>8) + game.ECART_X,(y>>8) + game.ECART_Y);
	const sin = getSin(input.mouseX,input.mouseY,(x>>8) + game.ECART_X,(y>>8) + game.ECART_Y);
	
	obj.vx = cos * (16<<8);
	obj.vy = sin * (16<<8);
	
	for(po=0;po<2;po++){
		obj.x += obj.vx>>1;
		obj.y += obj.vy>>1;
		
		if(!checkTeleportGauche(obj) &&
				!checkTeleportBas(obj) &&
				!checkTeleportHaut(obj) &&
				!checkTeleportDroite(obj)){
			col = checkCollisions(obj);
		}
	}
	
	obj.vx = (cos * (30<<8)) >> 2;
	obj.vy = (sin * (30<<8)) >> 2;
}

function moveObject(obj) {
	let col, i, c;
	const ffield = inForceFieldTp(obj);
	for(i in ffield) {
		const f = ffield[i];
		if(game.forceFields[f].vx != 0) {
			if(checkTeleportHaut(obj) || checkTeleportBas(obj)) {
				if((obj.y >> 8) < game.forceFields[f].y) obj.y += 768;
				else if((obj.y >> 8) + obj.pY > game.forceFields[f].y + 32) obj.y -= 768;
			}
			else if((obj.y >> 8) < game.forceFields[f].y + (16 - (obj.pY>>1))) obj.y += 512;
			else if((obj.y >> 8) + obj.pY > game.forceFields[f].y + 32 - (16 - (obj.pY>>1))) obj.y -= 512;
		}else if(game.forceFields[f].vy != 0) {
			if(obj.x >> 8 < game.forceFields[f].x + (16 - (obj.pY>>1))) obj.x += 256;
			else if((obj.x >> 8) + obj.pX > game.forceFields[f].x + 32 - (16 - (obj.pY>>1))) obj.x -= 256;
		}
		
		obj.vx = game.forceFields[f].vx * 384;
		obj.vy = game.forceFields[f].vy * 384;
		
		if(obj.type == "tourelle" && !obj.canExplode) {
			obj.canExplode = true;
		}
	}

	const carp = onCarpet(obj);
	if(carp) {
		obj.x += carp == 3 ? 384 : carp == 4 ? -384 : 0;
		obj.vx = carp == 3 ? 8 : carp == 4 ? -8 : 0;
	}
	if(obj.type == "caisse") {
		if(carp == 0 && obj.carpet != 0) obj.vx = obj.carpet == 3 ? 384 : obj.carpet == 4 ? -384 : 0;
		obj.carpet = carp;
	}
	
	const checkTgauche = checkTeleportGauche(obj);
	const checkTdroite = checkTeleportDroite(obj);
	
	const toucheSol = touchingGround(obj);
	
	if(!toucheSol || checkTeleportBas(obj)) {
		if(ffield.length == 0) obj.vy+=GRAVITY;
		if(obj.vy>(10<<8)) obj.vy = 10<<8;
	}
	
	if(obj.vy==0 && obj.vx==0) return;
	
	if(obj.vx>0){
		if(toucheSol&&!checkTgauche) obj.vx-=64;
		else obj.vx-=10;
		if(obj.vx<0) obj.vx = 0;
	}else if(obj.vx<0){
		if(toucheSol&&!checkTdroite) obj.vx+=64;
		else obj.vx+=10;
		if(obj.vx>0) obj.vx = 0;
	}

	if(obj.vx>512&&toucheSol==1&&!checkTgauche) obj.vx = 512;
	else if(obj.vx<-512&&toucheSol==1&&!checkTdroite) obj.vx = -512;
	
	let j;
	for(j=0;j<8;j++){
		if(!checkTeleportBas(obj)&&!checkTeleportHaut(obj)) obj.x+=obj.vx>>3;
		if(!checkTeleportGauche(obj)&&!checkTeleportDroite(obj)&&!caisseSurPerso(obj)) obj.y+=obj.vy>>3;
    
		if(obj.type == "caisse") {
		  if(caisseToucheObjet(game.perso) && obj.invincibility == 0) {
			game.perso.x += obj.vx >> 3;
			
			if(obj.vx < 0) {
			  if(leftCollision(game.perso)) {
				while(leftCollision(game.perso)) game.perso.x += 128;
				obj.vx = 0;
			  }
			}else if(obj.vx > 0) {
			  if(rightCollision(game.perso)) {
				while(rightCollision(game.perso)) game.perso.x -= 128;
				obj.vx = 0;
			  }
			}
		  }
		  
		  if(obj.vx != 0 && !dansUnPortal(obj)) {
			for(c in game.caisses) {
			  const ca = game.caisses[c];
			  if(dansUnPortal(ca)) continue;
			  if(obj.x != ca.x && obj.y != ca.y) {
				const y = obj.y >> 8;
				let x = obj.x >> 8;
				
				if(obj.vx > 0) x += 16;
				else if(obj.vx < 0) x -= 1;
				
				let needReturn = false;
				
				if(pointDansObjet(x, y + 1, ca)) {
					if(ca.porter) game.perso.vx = obj.vx;
					else if(obj.porter) game.perso.vx = ca.vx;
					ca.vx = obj.vx;
					obj.vx >>= 1;
					needReturn = true;
				}else if(pointDansObjet(x, y + 8, ca)) {
					if(ca.porter) game.perso.vx = obj.vx;
					else if(obj.porter) game.perso.vx = ca.vx;
					ca.vx = obj.vx;
					obj.vx >>= 1;
					needReturn = true;
				}else if(pointDansObjet(x, y + 13, ca)) {
					if(ca.porter) game.perso.vx = obj.vx;
					else if(obj.porter) game.perso.vx = ca.vx;
					ca.vx = obj.vx;
					obj.vx >>= 1;
					needReturn = true;
				}
				
				if(needReturn) {
				  col = 1;
				  while(col && !dansUnPortal(obj)){
					col = checkCollisions(obj);
				  }
				  return;
				}
				
			  }
			}
		   }
		}
	}

	col = 1;
	while(col && !dansUnPortal(obj)){
		col = checkCollisions(obj);
	}
}

function objetPortee(){
	let i;
	for(i in game.caisses){
		if(game.caisses[i].porter==1) return 1;
	}
	for(i in game.tourelles){
		if(game.tourelles[i].porter==1) return 1;
	}
	return 0;
}

function pointDansObjet(x, y, obj){
	const x2 = obj.x>>8;
	const y2 = obj.y>>8;
	if(x>=x2 && x<x2+obj.pX && y>=y2 && y<y2+obj.pY) return 1;
	else return 0;
}

function grabObject(){
	let x1, y1, i;
	let ok = 0;
	if(!objetPortee()){
		if(input.mousePressed && (input.mouseButton == LEFT)){
			const x2 = (game.perso.x>>8) + (game.perso.pX>>1);
			const y2 = (game.perso.y>>8) + (game.perso.pY>>1);
			for(i in game.caisses){
				x1 = (game.caisses[i].x>>8) + (game.caisses[i].pX>>1);
				y1 = (game.caisses[i].y>>8) + (game.caisses[i].pY>>1);
				if(getDistance(x1, y1, x2, y2)<32 && pointDansObjet(input.mouseX - game.ECART_X, input.mouseY - game.ECART_Y, game.caisses[i])){
					game.caisses[i].porter = 1;
					ok = 1;
					break;
				}
			}
			if(!ok){
				for(i in game.tourelles){
					x1 = (game.tourelles[i].x>>8) + (game.tourelles[i].pX>>1);
					y1 = (game.tourelles[i].y>>8) + (game.tourelles[i].pY>>1);
					if(!game.tourelles[i].mort && getDistance(x1, y1, x2, y2)<32 && pointDansObjet(input.mouseX - game.ECART_X, input.mouseY - game.ECART_Y, game.tourelles[i])){
						game.tourelles[i].porter = 1;
						break;
					}
				}
			}
		}
	}else{
		if(!input.mousePressed) {
			ok = 0;
			for(i in game.caisses){
				if(game.caisses[i].porter==1){
					game.caisses[i].porter = 0;
					ok = 1;
					game.caisses[i].invincibility = 3;
					game.caisses[i].noRemove = 90;
					playSound(sfx_throwObject);
					break;
				}
			}
			if(!ok){
				for(i in game.tourelles){
					if(game.tourelles[i].porter==1){
						game.tourelles[i].porter = 0;
						game.tourelles[i].canExplode = 1;
						playSound(sfx_throwObject);
						break;
					}
				}
			}
		}
	}
}

function downCollision(obj){
	const x = obj.x>>8;
	const y = (obj.y>>8) + obj.pY - 1;
	const pX = obj.pX;
	
	let i;
	for(i=x;i<x+pX;i++){
		const tile = getTile(i,y);
		if(tile) return tile;
	}
	
	return 0;
}

function upCollision(obj){
	const x = obj.x>>8;
	const y = (obj.y>>8);
	const pX = obj.pX;
	
	let i;
	for(i=x;i<x+pX;i++){
		const tile = getTile(i,y);
		if(tile) return tile;
	}
	
	return 0;
}

function leftCollision(obj){
	const x = (obj.x>>8) - 1;
	const y = obj.y>>8;
	const pY = obj.pY;
	
	let i;
	for(i=y;i<y+pY;i++){
		const tile = getTile(x,i);
		if(tile) return tile;
	}
	
	return 0;
}

function rightCollision(obj){
	const x = (obj.x>>8) + obj.pX;
	const y = obj.y>>8;
	const pY = obj.pY;
	
	let i;
	for(i=y;i<y+pY;i++){
		const tile = getTile(x,i);
		if(tile) return tile;
	}
	
	return 0;
}

function getCollision(obj){
	let i;
	const touche = [0, 0, 0, 0];//top, bottom, left, right
	const x = obj.x>>8;
	const y = obj.y>>8;
	
	let max = 0;
	let maxVal = 0;
	
	for(i=x;i<x+obj.pX;i+=2){//top
		if(getTile(i,y)) touche[0]++;
	}
	maxVal = touche[0];
		
	for(i=x+1;i<x+obj.pX-1;i+=2){//bottom
		if(getTile(i,y+obj.pY-1)) touche[1]++;
	}
	if(touche[1] > maxVal) {
		max = 1;
		maxVal = touche[1];
	}
	
	for(i=y;i<y+obj.pY;i+=2){//left
		if(getTile(x,i)) touche[2]++;
	}
	if(touche[2] > maxVal) {
		max = 2;
		maxVal = touche[2];
	}
	
	for(i=y;i<y+obj.pY;i+=2){//right
		if(getTile(x+obj.pX-1,i)) touche[3]++;
	}
	if(touche[3] > maxVal) {
		max = 3;
		maxVal = touche[3];
	}
	
	/*i = 0;
	for(x=0;x<4;x++){
		i+=touche[x];
		;
	}*/
	
	if(maxVal==0) return -1;
	return max;
}

function checkCollisions(obj) {

	let coll = 0;
	
	if(getCollision(obj)==HAUT){
		coll = 1;
		if(obj.vy<0){
			obj.vx>>=1;
			obj.vy = 0;
		}
		do{
			obj.y+= 256;
			if(getCollision(obj)==BAS){
				coll = 0;
				//*hitbox->y-= 64;
				break;
			}
		}while(getCollision(obj)==HAUT);
	}
	
	if(!coll && getCollision(obj)==BAS){
		coll = 1;
		if(obj.vy>0){
			obj.vy = 0;
		}
		do{
			obj.y-= 256;
			if(getCollision(obj)==HAUT){
				coll = 0;
				//*hitbox->y+= 64;
				break;
			}
		}while(getCollision(obj)==BAS);
	}

	if(!coll && getCollision(obj)==GAUCHE){
		coll = 1;
		if(obj.vx<0) obj.vx = 0;
		do{
			obj.x+= 256;
			if(getCollision(obj)==DROITE){
				coll = 0;
				obj.vy = 0;
				//*hitbox->x-= 64;
				break;
			}
		}while(getCollision(obj)==GAUCHE);
	}
	
	if(!coll && getCollision(obj)==DROITE){
		coll = 1;
		if(obj.vx>0) obj.vx = 0;
		do{
			obj.x-= 256;
			if(getCollision(obj)==GAUCHE){
				coll = 0;
				obj.vy = 0;
				//*hitbox->x+= 64;
				break;
			}
		}while(getCollision(obj)==DROITE);
	}
	
	return coll;
}

function rescaleReplay() {
	restoreInput(input.replayPauseInput);
	input.keys = game.replay.inputs[game.TIME];
	input.mouseX = game.replay.mouseX[game.TIME];
	input.mouseY = game.replay.mouseY[game.TIME];
}

function max(x, y){
	if(x>y) return x;
	else return y;
}

function getAngle(x1, y1, x2, y2)
{
	const value = parseFloat(Math.atan2(y2 - y1 , x2 - x1));
	return value;
}

function getCos(x1, y1, x2, y2){
	const adj = x1-x2;
	const opp = y1-y2;
	const hyp = Math.sqrt(opp*opp+adj*adj);
	const movx = adj/hyp;

	return movx;
}

function getSin(x1, y1, x2, y2){
	const adj = x1-x2;
	const opp = y1-y2;
	const hyp = Math.sqrt(opp*opp+adj*adj);
	const movy = opp/hyp;

	return movy;
}

function inScreen(x, y){
	if(x<0 || x>=512) return 0;
	if(y<0 || y>=384) return 0;
	return 1;
}

function finNiveau(){
	if(!dansUnPortal(game.perso)){
		let i, j;
		for(i=4;i<=28;i+=2){
			for(j=2;j<=14;j+=2){
				if(getTileSimple((game.perso.x>>8) + j, (game.perso.y>>8) + j)==22) return 1;
			}
		}
	}
	
	return 0;
}

function getTileSimple(x, y){
	if(x>=512 || y>=384 || y<0 || x<0) return 0;
	const tile = game.map[((y>>4)*32) + (x>>4)];
	
	return tile;
}

function getDistance(x1, y1, x2, y2){
	const adj = x1-x2;
	const opp = y1-y2;
	return Math.sqrt(opp*opp+adj*adj);
}

function tabContains(tab, value) {
	let i;
	for(i in tab) {
		if(tab[i] == value) return true;
	}
	return false;
}

function toTime(time) {
	let s = time / 60.0;
	const m = parseInt((s/60.0));
	s = s - (60.0 * m);
	const ms = (s - (parseInt(s))) * 1000;
	
	return (m<10 ? "0" : "") + m + ":" + (s<10 ? "0" : "") + parseInt(s) + "." + Math.round(ms);
}

function Campaign(folder) {
	this.folder = folder;
	this.levels = new Array();
	this.backgrounds = new Array();
	this.texts = new Array();
}

function loadCampaigns() {
	let c;
	campaigns = new Array();
	campaigns.push(new Campaign("normal"));
	campaigns.push(new Campaign("advanced"));
	campaigns.push(new Campaign("community"));
	campaigns.push(new Campaign("tutorial"));
	campaigns.push(new Campaign("story"));

	for(c in campaigns) {
		loadCampaignFiles(c);
	}
}

/**
 * Load the level list of a campaign and then its level files.
 *
 * @param {number} camp The index of the campaign.
 */
function loadCampaignFiles(camp) {
	const folder = "maps/" + campaigns[camp].folder + "/";
	loadJsonFile(folder + "campaign.json", function(data) {
		levelsToLoad += data.levels.length;
		for(let i = 0; i < data.levels.length; i++) {
			loadLevelFile(camp, i, folder + data.levels[i]);
		}
		levelsLoaded++;
	});
}

/**
 * Load a level file of a campaign.
 *
 * @param {number} camp The index of the campaign.
 * @param {number} index The index of the level in the campaign, starting at 0.
 * @param {string} url The URL of the level file.
 */
function loadLevelFile(camp, index, url) {
	loadJsonFile(url, function(data) {
		const level = parseMap(data);
		campaigns[camp].levels[index] = level.tiles;
		campaigns[camp].backgrounds[index] = level.bg;
		campaigns[camp].texts[index] = typeof data.text == "string" ? data.text : "";
		levelsLoaded++;
	});
}

/**
 * Load a JSON file.
 *
 * @param {string} url The URL of the file.
 * @param {function(*)} callback Gets the content of the file.
 */
function loadJsonFile(url, callback) {
	fetch(url, { cache: "no-cache" }).then(function(response) {
		if(!response.ok) throw new Error(url + ": " + response.status);
		return response.json();
	}).then(callback).catch(function(e) {
		console.error(url, e);
	});
}

function loadSfx() {
	sfx_explode = loadSound("explode");
	sfx_bounce = loadSound("bounce");
	sfx_grabCake = loadSound("grabCake");
	sfx_jump = loadSound("jump");
	sfx_throwObject = loadSound("throwObject");
	sfx_enterPortal = loadSound("enterPortal");
	sfx_transition = loadSound("transition");
	sfx_tick = loadSound("tick");
	sfx_pain = loadSound("pain");
	sfx_flatline = loadSound("flatline");
	sfx_noPortal = loadSound("noPortal");
	sfx_shoot = loadSound("shoot");
	sfx_portal = [loadSound("portal1"), loadSound("portal2")];
}

function loadCreditsText() {
	creditsTxt = new Array();
	loadJsonFile("credits.json", function(data) {
		creditsTxt = data.lines;
	});
}

function loadGfx() {

	let i, t, r;
	body = new Array();
	for(i = 0; i < 2; i++) {
		t = loadImage('sprites/body' + i + '.png');
		body.push(t);
	}
	
	head = new Array();
	for(i = 0; i < 2; i++) {
		t = loadImage('sprites/head' + i + '.png');
		head.push(t);
	}
	controls = loadImage('decor/controls.png');
	
	crosshair = loadImage('sprites/crosshair.png');
	
	bluePortal = loadImage('sprites/bluePortal.png');
	
	redPortal = loadImage('sprites/redPortal.png');
	
	//generating transition line order
	linesHoriz = new Array();
	linesVerti = new Array();
	for(i=0; i < 128; i++) {
		do {
			r = parseInt(random(0, 129));
		}while(tabContains(linesHoriz, r));
		linesHoriz.push(r);
		linesVerti.push(r);
	}
	
	
	bg = new Array();
	for(i=1; i<12; i++) {
		const img = loadImage('bg/level' + i + '.png');
		bg.push(img);
	}
	
	menuBG = loadImage('bg/menuBG.png');
	
	levelEditorHud = loadImage('bg/levelEditorHud.png');
	
	hud = loadImage('bg/hud.png');
	
	mapSelection = loadImage('bg/mapSelection.png');
	
	highscore = loadImage('bg/highscore.png');
	
	tube = loadImage('sprites/tube.png');
	
	tube2 = loadImage('sprites/tube2.png');
	
	tunnel = loadImage('sprites/tunnel.png');
	
	tunnel2 = loadImage('sprites/tunnel2.png');
	
	mouseIcon = loadImage('images/mouseIcon.png');
	
	key = loadImage('images/key.png');
	
	caisse = loadImage('sprites/caisse.png');
	
	pauseBG = loadImage('menu/pauseBG.png');
	
	tex_sound = loadImage('menu/tex_sound.png');
	
	tex_cross = loadImage('menu/tex_cross.png');
	
	tex_leftBG = loadImage('menu/tex_leftBG.png');
	
	tex_rightBG = loadImage('menu/tex_rightBG.png');
	
	tex_button = loadImage('menu/tex_button.png');
	
	tourelle = new Array();
	for(i = 0; i < 2; i++) {
		t = loadImage('sprites/tourelle' + i + '.png');
		tourelle.push(t);
	}
	
	sparkle = loadImage('sprites/sparkle.png');
	
	cake = loadImage('sprites/cake.png');
	
	portalGun = loadImage('sprites/portalGun.png');
	
	cameraFollow = loadImage('sprites/cameraFollow.png');
	
	robotEye = new Array();
	for(let rob = 1; rob < 5; rob++) {
		r = loadImage('sprites/robotEye' + rob + '.png');
		robotEye.push(r);
	}
	
	robotHead = loadImage('sprites/robotHead.png');
	
	plasma = loadImage('sprites/plasma.png');
	
	platform = loadImage('sprites/plateforme.png');
	
	tileset = new Array();
	for (i = 0; i < NUM_TILES; i++) {
		tileset[i] = loadImage('tiles/tile_' + (i+1) + '.gif');
	}
}

function Line(x1, y1, x2, y2, color) {
	this.x1 = x1;
	this.y1 = y1;
	this.x2 = x2;
	this.y2 = y2;
	this.color = color;
}

function random(min, max) {
	const randomnumber = Math.floor(Math.random()*(max - min)) + min;
	return randomnumber;
}

function line(x1, y1, x2, y2) {
	ctx.beginPath();
	ctx.moveTo(x1, y1)
	ctx.lineTo(x2, y2);
	ctx.stroke();
	ctx.closePath();
}

function triangle(x1, y1, x2, y2, x3, y3) {
	ctx.beginPath();
	ctx.moveTo(x1, y1);
	ctx.lineTo(x2, y2);
	ctx.lineTo(x3, y3);
	ctx.lineTo(x1, y1);
	ctx.fill();
	ctx.closePath();
}