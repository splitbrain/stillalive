var KEY_Z = 1;
var KEY_Q = 2;
var KEY_D = 4;
var KEY_E = 8;
var KEY_S = 16;
var MSE_L = 32;
var MSE_R = 64;
var MSE_M = 128;
var keys = oldKeys = 0;

var replay;
var replayMode = false;

var started = false;

var highscoreMessage;
var drawIntermission = false;
var intermissionChoice;
var selectMenu = 0;
var previewMap = 0;

var campaigns;
var currentMenu;
var goMenu, escapeMenu;

var currentLevel = 1;
var lvlType = 0;

var linesHoriz, linesVerti;

var HAUT = 0;
var BAS = 1;
var GAUCHE = 2;
var DROITE = 3;
var CAKELEFT;
var STEPS;
var PORTALS;

var BG;

var ECART_X = 64;
var ECART_Y = 96;

var TIME;
var timeWriting = 0;

var RANDOM = 1;
var ORDERED = 2;

var TRANS = 4;

var quality = 1;

var maxLevel;


var mouseX = mouseY = mousePressed = mouseReleased = mouseButton = mouseNewPress = 0;
var replayPauseInput = null;
var lastTickInGame = false;
var LEFT = 0;
var RIGHT = 1;
var MIDDLE = 2;


var tex_blackos, tex_tails;

var cakes;
var caisses;
var projos;
var tunnels;
var forceFields;
var platforms;
var tourelles;
var sparkles;
var animatedTiles;

var tex_button, tex_sound, tex_cross, tex_leftBG, tex_rightBG;
var key, mouseIcon;
var cameraFollow, robotEye, robotHead;
var levelEditorHud, menuBG, pauseBG;
var noLevel;
var highscore;
var platform;
var head, body;
var tunnel, tunnel2, tube, tube2;
var controls;
var tourelle;
var plasma;
var caisse;
var sparkle;
var bluePortal;
var redPortal;
var crosshair;
var bg;
var hud, hudLight;
var ctx;
var map, displayMap;
var needLoad;
var cake;
var portalGun;
var tileset;
var imgBuff;
var loadedImg;
var levelsLoaded;
var levelsToLoad;
var txtLoaded;
var txtToLoad;
var imgToLoad;
var loadedSfx;
var sfxToLoad;
var needLoadSfx;
var perso;
var GRAVITY = 60;
var portals;
var plasmaBall;
var camera, robot;

var needRedrawTiles;

var NUM_TILES = 61;

var sound = false;
var noSound = false;

var canDrawLoading = 0;

var sfx_enterPortal, sfx_flatline, sfx_noPortal, sfx_pain, sfx_shoot;
var sfx_explode, sfx_jump, sfx_bounce, sfx_grabCake, sfx_holdObject;
var sfx_throwObject, sfx_tick, sfx_transition;
var sfx_portal;
var ctx;

var txtLines;

var tubeX, tubeY, plasmaX, plasmaY;
var bossX, bossY;
var bossNum = 0;
var bossIsComing;

var portalLines;

var audioTagSupport = !!(document.createElement('audio').canPlayType);

var canSplash = false;
var overSplash = false;

function setup() {
	var canvas = document.getElementById('canvas');
	ctx = canvas.getContext('2d');
	ctx.strokeStyle = "rgb(255, 0, 0)";
	ctx.font = "bold 10px Yikes";
	ctx.fillText(" ", 0, 0);
	
	ctx.font = "bold 10px Arial";
	
	tex_tails = new Image();   // Create a new Image object
	tex_tails.src = 'decor/tails.png'; // Set the path to the source
	tex_tails.onload = function() {
		tex_blackos = new Image();   // Create a new Image object
		tex_blackos.src = 'decor/blackos.png'; // Set the path to the source
		tex_blackos.onload = function() {
			noLevel = new Image();   // Create a new Image object
			noLevel.src = 'bg/noLevel.png'; // Set the path to the source
			noLevel.onload = function() {  
				loadedImg++;
				canSplash = true;
				loadGfx();
				loadSfx();
				loadCreditsText();
				loadCampaigns();
			}
		}
	}

	loadedImg = 0;
	levelsLoaded = 0;
	levelsToLoad = 28 * 4 + 8;
	txtToLoad = 28 * 4 + 8;
	txtLoaded = 0;
	imgToLoad = 110;
	currentMenu = 0;
	
	sfxToLoad = 14;
	loadedSfx = 0;
	needLoadSfx = true;
				
	perso = new Perso();//prevents a crash during loading
	
	
	TIME = 0;
	
	startLoop(myLoop);
	
	//maxLevel[4] = 29;
}

function myLoop() {
	manageKeys();
	if(!drawCredits) draw();
	else doDrawCredits();
	updatePanel();
}

function unclick() {
	mousePressed = 0;
	mouseReleased = 0;
	mouseNewPress = 0;
	
	keys &= ~MSE_L;
	keys &= ~MSE_R;
	keys &= ~MSE_M;
}

function reportBrokenReplay() {
	alertDialog("The replay you're watching seems to be broken -_-;\n" +
				"Sorry for any inconveniences."
		, 'An error occured');
	replayMode = false;
	exitFunc();
}

/**
 * Store the level time and the replay if the time is a new best time.
 *
 * @returns {string} The message for the intermission screen.
 */
function checkBestTime() {
	var campaign = campaigns[lvlType].folder;
	var best = getBestTime(campaign, currentLevel);
	if(best != null && best <= TIME) return "Best time : " + toTime(best);
	
	saveBestTime(campaign, currentLevel, TIME, encodeReplay(replay, campaign, currentLevel)).catch(function(e) {
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
	return [oldKeys, mousePressed, mouseReleased, mouseButton, mouseNewPress,
			perso.isJump, perso.oldIsJump, perso.askClear ? 1 : 0];
}

/**
 * Restore an input state from captureInput().
 *
 * @param {number[]} state The input state.
 */
function restoreInput(state) {
	oldKeys = state[0];
	mousePressed = state[1];
	mouseReleased = state[2];
	mouseButton = state[3];
	mouseNewPress = state[4];
	perso.isJump = state[5];
	perso.oldIsJump = state[6];
	perso.askClear = state[7] == 1;
}

function manageKeys() {
	// The input still changes while the level time stands still. A replay restores the input state at the same time.
	var inGame = perso.fadeNextLevel == -1 && currentMenu == 2 && !escapeMenu;
	if(inGame && !replayMode && !lastTickInGame) replay.states[TIME] = captureInput();
	else if(inGame && replayMode && replay.states[TIME]) restoreInput(replay.states[TIME]);
	lastTickInGame = inGame;
	
	if(perso.fadeNextLevel == -1 && currentMenu == 2 && !replayMode) {
		mouseX = Math.round(mouseX);
		mouseY = Math.round(mouseY);
		replay.inputs[TIME] = keys;
		replay.mouseX[TIME] = mouseX;
		replay.mouseY[TIME] = mouseY;
	}else if(perso.fadeNextLevel == -1 && currentMenu == 2 && replayMode && !escapeMenu) {
		if(TIME < replay.inputs.length) {
			keys = replay.inputs[TIME];
			mouseX = replay.mouseX[TIME];
			mouseY = replay.mouseY[TIME];
		}else {
			reportBrokenReplay();
		}
	}
	
	// check for a new left click
	if((keys & MSE_L)) {
		if(mousePressed == 0) {
			mouseNewPress = 1;
		}else {
			mouseNewPress = 0;
		}
	}else mouseNewPress = 0;

	//check if a mouse button was just pressed
	if(!(oldKeys & MSE_L) && (keys & MSE_L)) {
		mouseButton = LEFT;
		mousePressed = 1;
		mouseReleased = 0;
	}else if(!(oldKeys & MSE_R) && (keys & MSE_R)) {
		mouseButton = RIGHT;
		mousePressed = 1;
		mouseReleased = 0;
	}else if(!(oldKeys & MSE_M) && (keys & MSE_M)) {
		mouseButton = MIDDLE;
		mousePressed = 1;
		mouseReleased = 0;
	}
	
	//check if a mouse button was just released
	if((oldKeys & MSE_L) && !(keys & MSE_L)) {
		mouseReleased = 1;
		mousePressed = 0;
	}else if((oldKeys & MSE_R) && !(keys & MSE_R)) {
		mouseButton = RIGHT;
		mouseReleased = 1;
		mousePressed = 0;
	}else if((oldKeys & MSE_M) && !(keys & MSE_M)) {
		mouseButton = MIDDLE;
		mouseReleased = 1;
		mousePressed = 0;
	}
	
	if(keys & KEY_E) {//clear portals
		if(oldKeys & KEY_E) keys &= ~KEY_E;
		else perso.askClear = true;
	}
	
	if(keys & KEY_Q) perso.isLeft = 1;if(!(keys & KEY_Q)) perso.isLeft = 0;
	if(keys & KEY_D) perso.isRight = 1;if(!(keys & KEY_D)) perso.isRight = 0;
	if(keys & KEY_S) perso.isDown = 1;if(!(keys & KEY_S)) perso.isDown = 0;
	
	//jump
	if((keys & KEY_Z) && (isTestingLevel || currentMenu == 2 || (currentMenu == 6 && tutoJump)) && !dansUnPortal(perso)) {
		if(!(oldKeys & KEY_Z)) perso.oldIsJump = perso.isJump;
		perso.isJump = 1;
	}
	if(!(keys & KEY_Z)) {
		if(oldKeys & KEY_Z) perso.oldIsJump = perso.isJump;
		perso.isJump = 0;
	}
	
	oldKeys = keys;
}

var drawCredits = false;

function draw() {
	if(currentMenu == 3) {
		drawLevelEditor();
	} else if((currentMenu == 2 || currentMenu == 6) && !escapeMenu) {	
		if(!finNiveau() && perso.fadeNextLevel == -1) {
			if(TIME==0) unclick();
			TIME++;
		}
		needRedrawTiles = 0;
		if(!perso.mort && perso.fadeNextLevel == -1) {
			perso.move();
			if(needRedrawTiles == 0) needRedrawTiles = dansUnPortal(perso);
		}
		
		gestionPorte();
		if(finNiveau()) {
			bossNum = 0;
			ECART_X = 64;
			ECART_Y = 96;
		
			if(perso.fadeNextLevel > 0) {
				perso.fadeNextLevel -= 4;
			}
			if(perso.fadeNextLevel == -1) {
				drawCredits = false;
				perso.fadeNextLevel = 120;
				perso.intermissionFade = 20;
				TRANS = parseInt(random(1, 7));//7 not included
				playSfx(sfx_transition);
				highscoreMessage = "";
				unclick();
				if(currentMenu == 2 && !replayMode) highscoreMessage = checkBestTime();
				intermissionChoice = 0;
				//TRANS = 7;
				if(currentMenu == 2 && !replayMode) {
					if(maxLevel[lvlType] < currentLevel + 1) {
						if(lvlType == 4 && maxLevel[lvlType] == 28) drawCredits = true;
						maxLevel[lvlType] = currentLevel + 1;
						localStorage.setItem('sajs_maxLevel_' + lvlType,  maxLevel[lvlType]);
					}
				}
				
				replayMode = false;
			}
			if(perso.fadeNextLevel <= 0) {
				perso.fadeNextLevel = 0;
				
				if(currentMenu == 6) {
					currentLevel++;
					if(currentLevel < 9) {
						unclick();
						loadLevel(currentLevel);
					}else {
						currentLevel = 9;
						if(!tutoEnded) perso.fadeNextLevel = 1;
					}
					tutoPause = true;
				}else {
					drawIntermission = true;
					if(intermissionChoice == 3) {//continue
						unclick();
						if(currentMenu == 2) {
							loadLevel(++currentLevel);
							perso.intermissionFade = -20;
						}
					}else if(intermissionChoice == 2) {//restart
						unclick();
						if(currentMenu == 2) {
							loadLevel(currentLevel);
							if(bossNum > 0) skipComingBoss();
						}
						perso.intermissionFade = -20;
					}else if(intermissionChoice == 1) {//exit
						exitFunc();
					}else if(intermissionChoice == 4) {//watch replay
						unclick();
						replayMode = true;
						if(currentMenu == 2) loadLevel(currentLevel);
						perso.intermissionFade = -20;
					}
				}
			}
		} else {
			if(perso.intermissionFade == 0) {
				if(perso.fadeNextLevel > 0) {
					perso.fadeNextLevel -= 4;
				}
				if(perso.fadeNextLevel <= 0) {
					perso.fadeNextLevel = -1;
					drawIntermission = false;
				}
			}
		}
		
		if(currentMenu == 2 || currentMenu == 6) {
			if(bossNum > 0 && bossIsComing && perso.fadeNextLevel == -1) perso.fadeNextLevel = 0;
			drawAllGame();
			drawHudText();
			
			manageBoss();
			
			if(replayMode) {
				drawKeys();
			}
			
			if(currentMenu == 6 && currentLevel == 9) {
				currentLevel = 9;
				ctx.fillStyle = "rgb(0, 0, 0)";
				ctx.fillRect(ECART_X, ECART_Y, 544, 384);
				
				manageTutorial();
				drawText(146, 28, 11);
				
				if(mousePressed) {
					unclick();
					currentMenu = 1;
					selectMenu = 0;
					classic = false;
					fadeMenu = 30;
					sparkles = new Array();
				}
				
				ctx.drawImage(crosshair, mouseX - 8, mouseY - 8, 16, 16);
			}
		}
	} 
	else if((currentMenu == 2 || currentMenu == 6) && escapeMenu) {
		drawPauseMenu();
	}
	else if(currentMenu == 0) {
		//loading is in progress
		if(canSplash && !overSplash) drawSplash();
		else if(overSplash) drawLoadingScreen();
	}
	else if(currentMenu == 1) {
		if(selectMenu == 0) drawMainMenu();
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

var bossLife;
var bossComingTime;
var bossIsTalking;
var rumbleTime;

function setupBoss() {
	bossX = 449;
	bossY = 150;
	bossLife = 0;
	projos = new Array();
	if(bossNum != 0) {
		bossIsComing = true;
		bossComingTime = 0;
		bossIsTalking = true;
		bossX = 449 + 50 - (bossComingTime >> 8);
		rumbleTime = 0;
	}else skipComingBoss();
	
	if(replayMode) skipComingBoss();
}

function skipComingBoss() {
	if(bossNum != 0) {
		bossIsComing = false;
		bossComingTime = 0;
		bossIsTalking = false;
		bossX = 449;
		rumbleTime = 0;
	}
}

function manageBoss() {
	if(bossNum == 0) return; 
	if(bossIsComing) {
		if(bossIsTalking) {
			if(bossLife == 0 && perso.fadeNextLevel == 0) {
				if(bossX > 449) {
					if(bossNum == 1) {
						prepareTxt(15, 10, 477, 60);
						ctx.fillText("Enough is enough little man. I've decided that you can no longer", ECART_X + 22, ECART_Y + 30);
						ctx.fillText("continue to progress through or laboratories anymore. Launching", ECART_X + 22, ECART_Y + 30 + 16);
						ctx.fillText("termination program in 3 ... 2 ... 1 .............", ECART_X + 22, ECART_Y + 30 + 32);
					}else if(bossNum == 2) {
						prepareTxt(15, 10, 477, 60);
						ctx.fillText("All your cake are belong to us ! You little rat, I think I don't have the", ECART_X + 22, ECART_Y + 30);
						ctx.fillText("choice ... You destroyed my brother and it will be your last mistake", ECART_X + 22, ECART_Y + 30 + 16);
						ctx.fillText("in life. Prepare to suffer, here I come !", ECART_X + 22, ECART_Y + 30 + 32);
					}else if(bossNum == 3) {
						prepareTxt(15, 10, 477, 60);
						ctx.fillText("You first started with my cousin, then you decided to take apart its", ECART_X + 22, ECART_Y + 30);
						ctx.fillText("brother ... I can't let you continue to destroy our family just like that.", ECART_X + 22, ECART_Y + 30 + 16);
						ctx.fillText("I'm coming to get you, and I'm sure you won't like the taste of it ...", ECART_X + 22, ECART_Y + 30 + 32);
					}else if(bossNum == 4) {
						prepareTxt(15, 10, 477, 60);
						ctx.fillText("Well, Well Well ... It's getting serious. I guess I'm the only one left", ECART_X + 22, ECART_Y + 30);
						ctx.fillText("to stop you from getting out of these laboratories. I hope you enjoyed", ECART_X + 22, ECART_Y + 30 + 16);
						ctx.fillText("your life as long as it lasted. You won't suffer, I promise.", ECART_X + 22, ECART_Y + 30 + 32);
					}
				}else {
					if(bossNum == 1) {
						prepareTxt(15, 10, 477, 60);
						ctx.fillText("I saw in previous rooms that you loved crates. But how many of them", ECART_X + 22, ECART_Y + 30);
						ctx.fillText("can you take at the same time ? I'll give you a little hint to survive ...", ECART_X + 22, ECART_Y + 30 + 16);
						ctx.fillText("... Don't try to jump in the acid ! Ha - Ha - Ha -", ECART_X + 22, ECART_Y + 30 + 32);
					}else if(bossNum == 2) {
						prepareTxt(15, 10, 477, 60);
						ctx.fillText("Razor wheels are pretty easy to avoid when they just don't move ...", ECART_X + 22, ECART_Y + 30);
						ctx.fillText("What do you say if I launch them into your direction ? Think you can", ECART_X + 22, ECART_Y + 30 + 16);
						ctx.fillText("avoid them all ? Say hello to my brother when you're gone.", ECART_X + 22, ECART_Y + 30 + 32);
					}else if(bossNum == 3) {
						prepareTxt(15, 10, 477, 60);
						ctx.fillText("Easy to spot, useful to open green walls and deadly weapons !", ECART_X + 22, ECART_Y + 30);
						ctx.fillText("You used them to get to me, what if I use them to get to you now ?", ECART_X + 22, ECART_Y + 30 + 16);
						ctx.fillText("You wanna play rough ? OK ! Say hello to my little friends !", ECART_X + 22, ECART_Y + 30 + 32);
					}else if(bossNum == 4) {
						prepareTxt(15, 10, 477, 60);
						ctx.fillText("Previous robots were too kind with you. You won't have the same", ECART_X + 22, ECART_Y + 30);
						ctx.fillText("chance here. I won't throw you crates, razor wheels or plasma balls ...", ECART_X + 22, ECART_Y + 30 + 16);
						ctx.fillText("No, I will throw you ... the three of them at the same time !", ECART_X + 22, ECART_Y + 30 + 32);
					}
				}
				
				if(mouseNewPress) {
					bossIsTalking = false;
					if(bossX == 449) {
						bossIsComing = false;
					}
					unclick();
				}
			}else if(perso.fadeNextLevel == 0){
				if(bossNum == 1) {
					prepareTxt(15, 10, 477, 60);
					ctx.fillText("I ... I can't believe it. I never thought you would be able to take", ECART_X + 22, ECART_Y + 30);
					ctx.fillText("me down that easily ... You deserve the right to continue your journey", ECART_X + 22, ECART_Y + 30 + 16);
					ctx.fillText("through next levels ... Come meet my brother in the next ro.............", ECART_X + 22, ECART_Y + 30 + 32);
				}else if(bossNum == 2) {
					prepareTxt(15, 10, 477, 60);
					ctx.fillText("I guess .... I'll have to say hello by my...self ... Fortunately I can't feel", ECART_X + 22, ECART_Y + 30);
					ctx.fillText("pain, cause I think it would hurt really bad ........ Continue your trip", ECART_X + 22, ECART_Y + 30 + 16);
					ctx.fillText("....... and tell my cousin I forgot to buy some milk ...........", ECART_X + 22, ECART_Y + 30 + 32);
				}else if(bossNum == 3) {
					prepareTxt(15, 10, 477, 60);
					ctx.fillText("I don't understand ... all my calculations where perfect ! You were", ECART_X + 22, ECART_Y + 30);
					ctx.fillText("supposed to die and ... oh wait ! I remember that movie now, that", ECART_X + 22, ECART_Y + 30 + 16);
					ctx.fillText("guy with a scar on his face .. guess I was wrong after all ..........", ECART_X + 22, ECART_Y + 30 + 32);
				}else if(bossNum == 4) {
					prepareTxt(15, 10, 477, 60);
					ctx.fillText("........ Was I too kind with you ? I don't think so ... It seems that you", ECART_X + 22, ECART_Y + 30);
					ctx.fillText("were bound to get out of here from the beginning. Well, it was nice", ECART_X + 22, ECART_Y + 30 + 16);
					ctx.fillText("to know you after all ... So long, and thanks for all the cakes ...", ECART_X + 22, ECART_Y + 30 + 32);
				}
				
				if(replayMode ? rumbleTime >= replay.bossSpeech : mouseNewPress && rumbleTime > 60) {
					if(!replayMode) replay.bossSpeech = rumbleTime;
					bossIsTalking = false;
					bossIsComing = false;
					shakeScreen();
					unclick();
				}
			}
		}else {
			bossComingTime += 32;
			rumbleTime++;
			bossX = 449 + 50 - (bossComingTime >> 8);
			if(bossX == 449) {
				bossIsTalking = true;
				ECART_X = 64;
				ECART_Y = 96;
			}
			if(rumbleTime % 3 == 0) {
				ECART_X = 64 + random(-3, 3);
				ECART_Y = 96 + random(-3, 3);
			}
		}
	}else {
		if(bossLife < 3 && bossNum > 0) {
			if(!perso.mort && persoTouchBoss()) {
				perso.vie = -200;
				perso.timeVie = 180;
				return;
			}
		}
		
		if(perso.mort) {
			projos = new Array();
			plasmaBall = new Array();
			return;
		}

		if(bossLife < 3 && bossNum == 1) {
			if(perso.fadeNextLevel == -1 && TIME%(90-30*bossLife) == 0) {
				caisses.push(new Caisse((31 * 16) << 8, (6 * 16) << 8));
				if(caisses.length > 10) {
					for(i=0; i < 10; i++) {
						if(!caisses[i].porter && caisses[i].noRemove == 0) {
							caisses.splice(i, 1);
							break;
						}
					}
				}

				var d = getDistance(perso.x>>8, perso.y>>8, caisses[caisses.length-1].x>>8, caisses[caisses.length-1].y>>8);
				d = parseInt(d/18);
				if(d > 16) d = 16;
				if(d < 3) d = 3;
				caisses[caisses.length - 1].vx = -(d << 8);
			}
		}else if(bossLife < 3 && bossNum == 2) {
			if(perso.fadeNextLevel == -1 && TIME%(90-15*bossLife) == 0) {
				var vx1 = getCos((perso.x>>8) + (perso.pX>>1), (perso.y>>8) + (perso.pY>>1), 435 + 8, 50 + 8) * (1200 - perso.vx);
				var vy1 = getSin((perso.x>>8) + (perso.pX>>1), (perso.y>>8) + (perso.pY>>1), 435 + 8, 50 + 8) * 1200;
				projos.push(new Projectile(435 << 8, 50 << 8, parseInt(vx1), parseInt(vy1)));
				
				if(bossLife == 2) {
					var vx2 = getCos((perso.x>>8) + (perso.pX>>1), (perso.y>>8) + (perso.pY>>1), 16 + 8, 48 + 8) * 1200;
					var vy2 = getSin((perso.x>>8) + (perso.pX>>1), (perso.y>>8) + (perso.pY>>1), 16 + 8, 48 + 8) * 1200;
					projos.push(new Projectile(16 << 8, 48 << 8, parseInt(vx2), parseInt(vy2)));
				}
			}
		}else if(bossLife < 3 && bossNum == 3) {
			var limit = bossLife+1;
			if(perso.fadeNextLevel == -1 && TIME%(90-30*bossLife) == 0 && plasmaBall.length < limit) {
				var vx1 = getCos((perso.x>>8) + (perso.pX>>1), (perso.y>>8) + (perso.pY>>1), (plasmaX>>8) + 8, (plasmaY>>8) + 8) * 800;
				var vy1 = getSin((perso.x>>8) + (perso.pX>>1), (perso.y>>8) + (perso.pY>>1), (plasmaX>>8) + 8, (plasmaY>>8) + 8) * 800;
				plasmaBall.push(new Plasma(plasmaX, plasmaY, vx1, vy1));
			}
			
			if(perso.fadeNextLevel == -1 && TIME%(90-30*bossLife) == 0 && caisses.length == 0) {
				caisses.push(new Caisse((31 * 16) << 8, (18 * 16) << 8));
				caisses[caisses.length - 1].vx = -(12 << 8);
				caisses[caisses.length - 1].vy = -(2 << 8);
			}
		}else if(bossLife < 3 && bossNum == 4) {
			if(perso.fadeNextLevel == -1 && TIME%(90-20*bossLife) == 0) {
				caisses.push(new Caisse((31 * 16) << 8, (5 * 16) << 8));
				if(caisses.length > 10) {
					for(i=0; i < 10; i++) {
						if(!caisses[i].porter && caisses[i].noRemove == 0) {
							caisses.splice(i, 1);
							break;
						}
					}
				}

				var d = getDistance(perso.x>>8, perso.y>>8, caisses[caisses.length-1].x>>8, caisses[caisses.length-1].y>>8);
				d = parseInt(d/20);
				if(d > 16) d = 16;
				if(d < 3) d = 3;
				caisses[caisses.length - 1].vx = -(d << 8);
			}
			
			if(bossLife > 0 && perso.fadeNextLevel == -1 && TIME%(180-20*bossLife) == 0) {
				var vx1 = getCos((perso.x>>8) + (perso.pX>>1), (perso.y>>8) + (perso.pY>>1), 432 + 8, 32 + 8) * 600;
				var vy1 = getSin((perso.x>>8) + (perso.pX>>1), (perso.y>>8) + (perso.pY>>1), 432 + 8, 32 + 8) * 600;
				projos.push(new Projectile((432) << 8, 32 << 8, parseInt(vx1), parseInt(vy1)));
			}
			
			if(bossLife > 1 && perso.fadeNextLevel == -1 && plasmaBall.length == 0) {
				var vx1 = getCos((perso.x>>8) + (perso.pX>>1), (perso.y>>8) + (perso.pY>>1), (plasmaX>>8) + 8, (plasmaY>>8) + 8) * 400;
				var vy1 = getSin((perso.x>>8) + (perso.pX>>1), (perso.y>>8) + (perso.pY>>1), (plasmaX>>8) + 8, (plasmaY>>8) + 8) * 400;
				plasmaBall.push(new Plasma(plasmaX, plasmaY, vx1, vy1));
			}
		}
	}
}

function exitFunc() {
	unclick();
	sparkles = new Array();
	if(currentMenu == 2) {//campaign
		ECART_X = 0;
		ECART_Y = 96;
		currentMenu = 1;
		prepareSelectionText();
		previewMap = currentLevel;
		loadPreviewMap(previewMap);
	}else if(currentMenu == 6) {
		currentMenu = 1;
		selectMenu = 0;
		classic = false;
		fadeMenu = 30;
		sparkles = new Array();
	}
	
	replayMode = false;
}

function prepareSelectionText() {
	timeWriting = 0;
	txtLines = new Array();
	
	txtLines.push("Welcome to the campaign mode of StillAliveJS. Here you can select a map on the right and click");
	txtLines.push("'Play' to play it. Good Luck !");
}

function manageDownMenu() {
	var overMenu = -1;
	if(mouseInZone(74, 445, 120, 24)) overMenu = 1;
	else if(mouseInZone(74 + 130, 445, 120, 24)) overMenu = 2;
	else if(mouseInZone(74 + 260, 445, 120, 24) && currentMenu < 5 && currentLevel + 1 < 29) {
		if(maxLevel[lvlType] >= currentLevel + 1) {
			overMenu = 3;
		}
	}else if(mouseInZone(74 + 390, 445, 120, 24)) overMenu = 4;
	
	var scale1 = overMenu == 1 ? 0.9 : 1;
	var scale2 = overMenu == 2 ? 0.9 : 1;
	var scale3 = overMenu == 3 ? 0.9 : 1;
	var scale4 = overMenu == 4 ? 0.9 : 1;
	
	drawTinyButton(74, 445, scale1, "Exit");
	drawTinyButton(74 + 130, 445, scale2, "Restart");
	if(currentMenu < 5 && currentLevel + 1 < 29) {
		if(maxLevel[lvlType] >= currentLevel + 1) {
			drawTinyButton(74 + 260, 445, scale3, "Continue");
		}
	}
	if(lvlType == 4 && (currentLevel == 7 || currentLevel == 14 || currentLevel == 21 || currentLevel == 28)) {
		if(overMenu == 4) overMenu = 0;
	}else {
		drawTinyButton(74 + 390, 445, scale4, "Watch Replay");
	}
	
	if(mousePressed && mouseButton == LEFT && overMenu > 0) {
		intermissionChoice = overMenu;
		unclick();
	}
}

function drawPortalGunMenu(x, y, angle) {
	var a = angle;
	ctx.save();
	ctx.translate(x + 8, y + 13);
	ctx.rotate(a);
	ctx.drawImage(portalGun, -5, -5);
	ctx.restore();
}

function createSparkles(xFrom, yFrom, xTo, yTo, color, used) {
	var x = xFrom;
	var y = yFrom;
	var x2 = xTo;
	var y2 = yTo;
	
	var vx = getCos(x2, y2, x, y) * 256;
	var vy = getSin(x2, y2, x, y) * 256;
	
	var i = 0;
	var now = 0;
	do{
		now++;
		x += vx;
		y += vy;
		
		if(i%6==0 && now > 15){
			var k;
			for(k=0;k<3;k++){
				var s = new Sparkle();
				s.x = x + parseInt(random(-5<<8,5<<8)) - (8<<8) - (ECART_X << 8);
				s.y = y + parseInt(random(-5<<8,5<<8)) - (8<<8) - (ECART_Y << 8);
				s.used = used;
				s.vx = parseInt(random(96, 192));
				s.vy = parseInt(random(96, 192));
				s.fading = 255;
				s.color = color;
				s.portalNum = -1;
				if(parseInt(random(2))==0) s.vx = -s.vx;
				if(parseInt(random(0, 2))==0) s.vy = -s.vy;
				sparkles.push(s);
			}
		}
		i++;
	}while(getDistance(x, y, x2, y2) > 256);
}

function mouseInZone(x, y, w, h) {
	if(mouseX >=x && mouseX < x+w && mouseY >= y && mouseY < y+h) return true;
	return false;
}

function loadAudio(snd, name) {
	if(audioTagSupport) {
		snd = new Audio("sounds/" + name + ".ogg");
		snd.load();
		snd.addEventListener('canplaythrough', function() { // totally loaded
			if(!noSound) loadedSfx++;
		});
		return snd;
	} else return null;
}

function reloadTiles() {
	ctx.drawImage(bg[BG], ECART_X, ECART_Y, 512, 384);
	for(i in displayMap) {		
		if(map[i] < NUM_TILES && map[i] > 0 && i < 768) {
			var y = i >> 5;
			var x = i - (y << 5);
			ctx.drawImage(tileset[displayMap[i]], x*16 + ECART_X, y*16 + ECART_Y, 16, 16);
		}
	}
	imgBuff = ctx.getImageData(ECART_X, ECART_Y, 512, 384);
}

function gestionPorte(){
	var etatPorte = perso.porte;
	
	if(!perso.porte){
		if(persoSurInterrupteur(perso.x>>8, perso.y>>8)){
			perso.porte = 1;
			ouvrirPorte();
		}else if(caisseSurInterrupteur()){
			perso.porte = 1;
			ouvrirPorte();
		}
	}else{
		if(!persoSurInterrupteur(perso.x>>8, perso.y>>8)&& !caisseSurInterrupteur()){
			perso.porte = 0;
			fermerPorte();
		}
	}
}

function retirerBloqueurPorte(){
	var i,j;
	for(i=0;i<2;i++){
		if(portals[i].used){
			var x = portals[i].x>>8;
			var y = portals[i].y>>8;
			if(portals[i].direction==HAUT) y+=6;
			else if(portals[i].direction==GAUCHE) x+=6;
			else if(portals[i].direction==DROITE) x-=2;
			else if(portals[i].direction==BAS) y-=2;
			
			if(portals[i].direction==GAUCHE || portals[i].direction==DROITE){
				for(j=0;j<32;j++){
					if(getTileSimple(x,y+j)==23){
						portals[i].used = 0;
						removeSparkles(i, 3);
						j = 32;
					}
				}
			}else{
				for(j=0;j<32;j++){
					if(getTileSimple(x+j,y)==23){
						portals[i].used = 0;
						removeSparkles(i, 3);
						j = 32;
					}
				}
			}
		}
	}
	
	for(i in caisses){
		var x = caisses[i].x>>8;
		var y = caisses[i].y>>8;
		if(getTileSimple(x,y)==23 || getTileSimple(x+15,y)==23 || getTileSimple(x,y+15)==23 || getTileSimple(x+15,y+15)==23){
			caisses[i].x = caisses[i].xOrig;
			caisses[i].y = caisses[i].yOrig;
			caisses[i].vx = 0;
			caisses[i].vy = 0;
		}
	}
	
	for(i in plasmaBall) {
		var x = plasmaBall[i].x>>8;
		var y = plasmaBall[i].y>>8;
		if(getTileSimple(x,y)==23 || getTileSimple(x+15,y)==23 || getTileSimple(x,y+15)==23 || getTileSimple(x+15,y+15)==23){
			plasmaBall[i].vx = plasmaBall[i].origVx;
			plasmaBall[i].vy = plasmaBall[i].origVy;
			plasmaBall[i].x = plasmaBall[i].xOrig;
			plasmaBall[i].y = plasmaBall[i].yOrig;
		}
	}
}

function fermerPorte(){		
	playSfx(sfx_tick);
	for(i in animatedTiles) {
		if(animatedTiles[i].current>=23 && animatedTiles[i].current<=28){
			animatedTiles[i].used = 1;
			map[animatedTiles[i].place] = animatedTiles[i].min;
			if(quality == 0) {
				displayMap[animatedTiles[i].place] = animatedTiles[i].min;
				needLoad = true;
			}
		}
	}
	retirerBloqueurPorte();
}

function ouvrirPorte(){
	playSfx(sfx_tick);
	for(i in animatedTiles) {
		if(animatedTiles[i].current>=23 && animatedTiles[i].current<=28){
			animatedTiles[i].used = 0;
			map[animatedTiles[i].place] = 0;
			if(quality == 0) {
				displayMap[animatedTiles[i].place] = 0;
				needLoad = true;
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
		var touche = getTile((obj.x>>8)+1, (obj.y>>8)+obj.pY);
		var touche2 = getTile((obj.x>>8)+obj.pX-1, (obj.y>>8)+obj.pY);
		
		if((touche >= 54 && touche <= 55) || (touche2 >= 54 && touche2 <= 55)) return 3;
		if((touche >= 56 && touche <= 57) || (touche2 >= 56 && touche2 <= 57)) return 4;
		if(touche == 46 || touche2 == 46) return 2;
		else if(touche || touche2) return 1;
	}
	return 0;
}

function objetToucheTileMort(x, y){
	if(x>=512 || y>=384 || y<0 || x<0) return 0;
	var tile = map[((y>>4)*32) + (x>>4)];
	return (tile==36||tile==37||tile==38||tile==39||tile==47);
}

function toucheTileMort(obj){
	var x = obj.x>>8;
	var y = obj.y>>8;
	var pX = obj.pX;
	var pY = obj.pY;
	
	var touche = objetToucheTileMort(x,y);
	if(!touche)	touche = objetToucheTileMort(x+pX-1,y);
	if(!touche)	touche = objetToucheTileMort(x,y+(pY>>1));
	if(!touche)	touche = objetToucheTileMort(x,y+pY-6);
	if(!touche)	touche = objetToucheTileMort(x+pX-1,y+(pY>>1));
	if(!touche)	touche = objetToucheTileMort(x+pX-1,y+pY-6);
	
	return touche;
}

function getTileNoCaisse(x, y) {
	if(x>=512 || y>=384 || y<0 || x<0) return 0;
	var tile = map[((y>>4)*32) + (x>>4)];
	
	if(!tile){//check contact with a platform
		tile = collidePlateforme(x,y);
	}
	
	if(tile==22 || tile==36 || tile==37 || tile==38 || tile==39 || tile==47 || tile==104) tile = 0;
	else if(tile >= 49 && tile <= 54) tile = 0;
	
	return tile;
}

function getTileNoCaisseNoPlate(x, y) {
	if(x>=512 || y>=384 || y<0 || x<0) return 0;
	var tile = map[((y>>4)*32) + (x>>4)];
	
	if(tile==22 || tile==36 || tile==37 || tile==38 || tile==39 || tile==47 || tile==104) tile = 0;
	else if(tile >= 49 && tile <= 54) tile = 0;
	
	return tile;
}

function getTile(x, y) {
	if(x>=512 || y>=384 || y<0 || x<0) return 0;
	var tile = map[((y>>4)*32) + (x>>4)];
	
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
	var tile = map[((y>>4)*32) + (x>>4)];
	//passes through: crate, finish, razor wheel, red plasma, cake, start
	if(tile==22 || tile==36 || (tile>=40 && tile<=45) || tile == 103 || tile == 104 || tile>=300) tile = 0;
	
	if(!tile){//check contact with a platform
		tile = collidePlateforme(x,y);
	}
	
	return tile;
}

function launchPortal(p){
	perso.timePosePortal = 0;
	perso.lastLaunched = p;
	
	var x = perso.x + ((perso.pX>>1)<<8);
	var y = perso.y + ((perso.pY>>1)<<8);
	
	portals[p].vx = getCos(mouseX, mouseY, (x>>8) + ECART_X, (y>>8) + ECART_Y) * 256;
	portals[p].vy = getSin(mouseX, mouseY, (x>>8) + ECART_X, (y>>8) + ECART_Y) * 256;
	
	for(i=0;i<sparkles.length; i++) {
		if(sparkles[i].color == p && sparkles[i].used == 1) {
			sparkles.splice(i, 1);
			i--;
		}
	}
	
	var i = 0;
	var rebond = 0;
	var tile;
	var now = 0;
	
	portalLines = new Array();
	portalLines.push(new Line(x>>8, y>>8, 0, 0, p));
	var inScreenOK = false;
	
	do{
		inScreenOK = false;
		now++;
		x += portals[p].vx;
		y += portals[p].vy;
		tile = getTilePortal(x>>8, y>>8);
		
		if(tile==46){
			var haut = getTilePortal((x>>8),(y>>8)-1);
			var bas = getTilePortal((x>>8),(y>>8)+1);
			var gauche = getTilePortal((x>>8)-1,(y>>8));
			var droite = getTilePortal((x>>8)+1,(y>>8));
			if((!bas||!haut)&&(gauche&&droite)){
				portals[p].vy = -portals[p].vy;
			}else if((!gauche||!droite)&&(haut&&bas)){
				portals[p].vx = -portals[p].vx;
			}
			tile = 0;
			rebond++;
			
			portalLines[portalLines.length - 1].x2 = x>>8;
			portalLines[portalLines.length - 1].y2 = y>>8;
			
			portalLines.push(new Line(x>>8, y>>8, 0, 0, p));
		}
		
		if(i%6==0 && now > 15){
			var k;
			for(k=0;k<1;k++){
				var s = new Sparkle();
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
				sparkles.push(s);
			}
		}
		i++;
		if(inScreen(x>>8,y>>8)) {
			inScreenOK = true;
		} else {
			var yy = y>>8;
			if(yy < 0 && portals[p].vy > 0) inScreenOK = true;
		}
	}while(tile==0 && inScreenOK && rebond<5);
	
	portalLines[portalLines.length - 1].x2 = x>>8;
	portalLines[portalLines.length - 1].y2 = y>>8;
	
	if(tile!=0 && (tile<=16 || (tile>=200 && tile<=204))){
		var ok = setPortalDir(p, x>>8, y>>8);
		if(ok){
			if(portals[p].direction==DROITE || portals[p].direction==GAUCHE){
				portals[p].scaleX = 1;
				portals[p].scaleY = 0;
				portals[p].plateforme = -1;
			}else{
				portals[p].scaleX = 0;
				portals[p].scaleY = 1;
				var plate = getTilePortal(x>>8,y>>8);
				if(plate>=200 && plate<=204) portals[p].plateforme = plate - 200;
				else portals[p].plateforme = -1;
			}
			var r = parseInt(random(0, 2));
			playSfx(sfx_portal[r]);
			PORTALS++;
		} else playSfx(sfx_noPortal);
	} else playSfx(sfx_noPortal);
}

function setPortalDir(p, x, y){
	var vx = portals[p].vx;
	var vy = portals[p].vy;
	var i;
	var oldDir = portals[p].direction;
	
	var mur = 0;
	//first check if the portal is on a left or right wall
	for(i=y-14;i<y+14;i++){
		var tile = getTilePortal(x,i);
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
			portals[p].direction = GAUCHE;
		}else portals[p].direction = DROITE;
		y-=16;
		
		var x2 = portals[1-p].x>>8;
		var y2 = portals[1-p].y>>8;
		if(x==x2){//portals on the same vertical wall?
			if(y2-y>-32 && y2-y<32 && portals[1-p].used){
				portals[p].direction = oldDir;
				return 0;
			}
		}
		
		portals[p].frame = 1;
		portals[p].y = y<<8;
		portals[p].x = x<<8;
		portals[p].used = 1;

		removeSparkles(p, 3);
		
		for(i=0;i<13;i++){
			var s = new Sparkle();
			s.x = portals[p].x;
			s.y = portals[p].y + ((i*2)<<8);
			s.xOrig = s.x;
			s.yOrig = s.y;
			s.portalNum = p;
			s.used = 3;
			if(portals[p].direction==DROITE) {
				s.vx = -parseInt(random(128, 384));
				s.xOrig -= 7 << 8;
			}else s.vx = parseInt(random(128, 384));
			s.vy = 0;
			s.fading = 200;
			s.color = p;
			
			sparkles.push(s);
		}
		
		return 1;
	}else{//then check if the portal is on a top or bottom wall
		mur = 0;
		for(i=x-14;i<x+14;i++){
			var tile = getTilePortal(i,y);
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
				portals[p].direction = HAUT;
			}else portals[p].direction = BAS;
			x-=16;
			
			var x2 = portals[1-p].x>>8;
			var y2 = portals[1-p].y>>8;
			if(y==y2){//portals on the same horizontal wall?
				if(x2-x>-32 && x2-x<32  && portals[1-p].used){
					portals[p].direction = oldDir;
					return 0;
				}
			}
			
			portals[p].y = y<<8;
			portals[p].x = x<<8;
			portals[p].used = 1;
			portals[p].frame = 0;
			
			removeSparkles(p, 3);
		
			for(i=0;i<13;i++){
				var s = new Sparkle();
				
				s.x = portals[p].x + ((i*2)<<8);
				s.y = portals[p].y;
				s.xOrig = s.x;
				s.yOrig = s.y;
				s.used = 3;
				s.portalNum = p;
				if(portals[p].direction==BAS) {
					s.vy = -parseInt(random(128, 384));
					s.yOrig -= 8 << 8;
				}
				else s.vy = parseInt(random(128, 384));
				s.vx = 0;
				s.fading = 200;
				s.color = p;
				
				sparkles.push(s);
			}
			
			return 1;
		}
	}
	return 0;
}

function checkTeleportGauche(obj){
	var j;
	var x = (obj.x)>>8;
	var y = (obj.y)>>8;
	x-=1;
	for(j=0;j<2;j++){
		var tx = (portals[j].x>>8) + 3;
		var ty = portals[j].y>>8;
		if(portals[j].used && portals[j].direction==GAUCHE && portals[1-j].used){
			if(y>=ty-6 && y+obj.pY<=ty+38 && x<tx && tx-x<=20){
				var ecrt = (32 - obj.pY)>>1;
				obj.y = (ty + ecrt)<<8;
				if(bossNum == 0 || obj.type != "plasma") obj.vy = 0;
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
	var j;
	var x = (obj.x)>>8;
	var y = (obj.y)>>8;
	x+=obj.pX;
	for(j=0;j<2;j++){
		var tx = portals[j].x>>8;
		var ty = portals[j].y>>8;
		if(portals[j].used && portals[j].direction==DROITE && portals[1-j].used){
			if(y>=ty-6 && y+obj.pY<=ty+38 && x>tx && x-tx<=20){
				var ecrt = (32 - obj.pY)>>1;
				obj.y = (ty + ecrt)<<8;
				if(bossNum == 0 || obj.type != "plasma") obj.vy=0;
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
	var j;
	var x = (obj.x)>>8;
	var y = (obj.y)>>8;
	y+=obj.pY;
	
	if(obj.type == "plasma" && (obj.vy == 0)) return 0;
	
	for(j=0;j<2;j++){
		var tx = portals[j].x>>8;
		var ty = portals[j].y>>8;
		if(portals[j].used && portals[j].direction==BAS && portals[1-j].used==1){
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
	var j;
	var x = (obj.x)>>8;
	var y = (obj.y)>>8;
	y-=1;
	
	if(obj.type == "plasma" && (obj.vy == 0)) return 0;
	
	for(j=0;j<2;j++){
		var tx = portals[j].x>>8;
		var ty = (portals[j].y>>8)+4;
		if(portals[j].used && portals[j].direction==HAUT && portals[1-j].used==1){
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
	var p = checkTeleportBas(obj);
	if(p == 0) p = checkTeleportHaut(obj);
	if(p == 0) p = checkTeleportGauche(obj);
	if(p == 0) p = checkTeleportDroite(obj);
	
	return p;
}

function transfertPortal(p, obj){
	var entree = portals[p].direction;
	var sortie = portals[1-p].direction;
	
	playSfx(sfx_enterPortal);
	
	if(obj.type == "tourelle") {
		obj.canExplode = 1;
	}
	
	if(obj.type == "perso") {
		perso.timePassedPortal = (p == 0 ? 42 : -42);
	}

	if(sortie==DROITE){
		var ecrt = (32 - obj.pY)>>1;
		obj.x = portals[1-p].x - ((obj.pX>>1)<<8);
		obj.y = portals[1-p].y + (ecrt<<8);
	}else if(sortie==GAUCHE){
		var ecrt = (32 - obj.pY)>>1;
		obj.x = portals[1-p].x - ((obj.pX>>1)<<8);
		obj.y = portals[1-p].y + (ecrt<<8);
	}else if(sortie==HAUT){
		obj.x = portals[1-p].x+(8<<8);
		obj.y = portals[1-p].y-((obj.pY>>1)<<8) + (4<<8);
	}else if(sortie==BAS){
		obj.x = portals[1-p].x+(8<<8);
		obj.y = portals[1-p].y-((obj.pY>>1)<<8);
	}
	
	if(bossNum == 0 || obj.type != "plasma") {
		if(entree==BAS && sortie==BAS) {
			obj.vy = -obj.vy;
			if(obj.vy>-1100) obj.vy = -1100;
		}else if(entree==BAS && sortie==GAUCHE){
			var oldx = obj.vx;
			obj.vx = obj.vy;
			obj.vy =  oldx;
		}else if(entree==BAS && sortie==DROITE){
			var oldx = obj.vx;
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
	}else if((bossNum == 3 || bossNum == 4) && obj.type == "plasma") {
		if((entree==BAS && sortie==BAS) || (entree==HAUT && sortie==HAUT)) {
			obj.vy = -obj.vy;
		}else if((entree==BAS && sortie==GAUCHE) || (entree==HAUT && sortie==DROITE)){
			var oldx = obj.vx;
			obj.vx = obj.vy;
			obj.vy =  oldx;
		}else if((entree==BAS && sortie==DROITE) || (entree==HAUT && sortie==GAUCHE)){
			var oldx = obj.vx;
			obj.vx = -obj.vy;
			obj.vy =  oldx;
		}else if((entree==GAUCHE && sortie==BAS) || (entree==DROITE && sortie==HAUT)){
			var oldx = obj.vx;
			obj.vx = obj.vy;
			obj.vy =  oldx;
		}else if((entree==DROITE && sortie==BAS) || (entree==GAUCHE && sortie==HAUT)){
			var oldx = obj.vx;
			obj.vx = obj.vy;
			obj.vy = -oldx;
		}else if((entree==DROITE && sortie==DROITE) || (entree==GAUCHE && sortie==GAUCHE)){
			obj.vx = -obj.vx;
		}
	}
}

function removeSparkles(p, used) {
	for(i=0;i<sparkles.length;i++) {
		if(sparkles[i].used == used && sparkles[i].color == p) {
			sparkles.splice(i, 1);
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
				
				var oldVx = this.vx;
				var oldVy = this.vy;
				
				moveObject(this);
				
				if(!this.mort) {
					if(this.vx == 0 && Math.abs(oldVx) > (3<<8) && this.canExplode && inForceFieldTp(this).length == 0) this.mort = 1;
					else if(this.vy == 0 && Math.abs(oldVy) > (4<<8) && this.canExplode && inForceFieldTp(this).length == 0) this.mort = 1;
					else if(toucheTileMort(this) || caisseToucheObjet(this) || plasmaToucheObjet(this)) {
						this.mort = 1;
					}
					if(this.mort) {
						this.animeFrame = 2;
						playSfx(sfx_explode);
						createCakeOrSmokeSparkles(this.x, this.y, 9, 4, 255);
						//_synth.play();
					}
				}else if(this.animFrame<10){
					if(TIME%4==0) this.animFrame++;
				}
				
				var plt = onPlateforme(this);
				if(plt){
					plt -= 200;
					this.x += platforms[plt].vx;
					
				}
				
				var colLeft = leftCollision(this);
				var colRight = rightCollision(this);
				if(!this.mort && ((colLeft>=200 && colLeft<=210) || (colRight>=200 && colRight<=210))){
					this.mort = 1;
					this.animeFrame = 2;
					playSfx(sfx_explode);
					createCakeOrSmokeSparkles(this.x, this.y, 9, 4, 255);
				}
			}else{
				placeObject(this);
			}
			if(!this.mort) this.shoot();
		}
	}
	
	this.shoot = function() {
		var j;
		var testShoot = false;
		if(this.dir == -1 && this.x > perso.x) testShoot = true;
		else if(this.dir == 1 && this.x < perso.x) testShoot = true;
		
		if(testShoot) {
			var y = (this.y >> 8) + 13;
			var y2 = (perso.y >> 8) + 16;
			
			if(Math.abs(y - y2) > 32) testShoot = false; 
			
		}
		
		if(this.mort==0 && testShoot && !perso.mort) {
			this.coolTime--;
			if(this.coolTime<0) this.coolTime = 0;
			if(this.coolTime==0){
				if(this.dir==1) j = (this.x>>8)+16;
				else j = (this.x>>8);
				var ySent = (this.y>>8) + 12;
				var dansLeChamp = 0;
				var exitt = 0;
				var oldJ = j;
				//var freeze = 0;
				while(j>=0&&j<512&&!dansLeChamp&&!exitt){
					var tile = getTile(j,ySent);
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
							var t = toucheJoueur(j,ySent);
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
						perso.vie -= 640;//2.5
						perso.timeVie = 300;
						perso.vx+=this.dir<<8;
						this.coolTime = this.startCool;
						playSfxIfFinished(sfx_shoot);
						
						for(var i=0; i<5; i++) {
							var s = new Sparkle();
							s.x = perso.x + (this.pX<<7) + random(-8<<8,8<<8);
							s.y = perso.y + (this.pY<<6);
							s.used = 5;
							s.vx = parseInt(random(512, 1024) * this.dir);
							s.vy = random(-3<<8,0);
							s.fading = 50;
							s.color = 1;
							s.portalNum = -1;
							sparkles.push(s);
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
	var x = perso.x>>8;
	var y = perso.y>>8;
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
	
		var angle;
		
		if(perso.flip == -1) {
			angle = 335;
		}else {
			angle = 185;
		}
		
		dx = perso.x + Math.cos(angle / 180 * Math.PI) * (40 << 8);
		dy = perso.y + Math.sin(angle / 180 * Math.PI) * (40 << 8);
		
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
			if(replayMode) {
				reportBrokenReplay();
				return;
			}
		
			this.mort = 1;
			this.vie = -256;
			playSfx(sfx_pain);
			playSfx(sfx_flatline);
			if(perso.y>>8 < 384) {
				for(var i=0; i<20; i++) {
					var s = new Sparkle();
					s.x = perso.x + (this.pX<<7) + random(-14<<8,8<<8);
					s.y = perso.y + (this.pY<<6);
					s.used = 6;
					s.vx = 0;
					s.vy = random(-2<<8,0);
					s.fading = 150;
					s.color = 1;
					s.portalNum = -1;
					sparkles.push(s);
				}
			}
		}else if(this.mort) {
			if(this.vie >= 0) {
				sfx_flatline.volume = 1;
				if(currentMenu == 2 || currentMenu == 6) {
					loadLevel(currentLevel);
					if(bossNum > 0) skipComingBoss();
				}
			}
		}
	}
	
	this.move = function() {
		//particles around the character
		if(this.timePassedPortal < 0) {
			if(++this.timePassedPortal<0 && this.timePassedPortal%6==0){
				for(var cpt=0;cpt<3;cpt++){
					var s = new Sparkle();
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
					sparkles.push(s);
				}
			}
		}else if(this.timePassedPortal > 0) {
			if(--this.timePassedPortal>0 && this.timePassedPortal%6==0){
				for(var cpt=0;cpt<5;cpt++){
					var s = new Sparkle();
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
					sparkles.push(s);
				}
			}
		}
		
		if(this.askClear) {
			clearPortals();
			this.askClear = false;
		}
		
		var ffield = inForceFieldTp(this);
		if(ffield.length > 0) {
			perso.vx = 0;
			perso.vy = 0;
		}
		for(i in ffield) {
			var f = ffield[i];
			if(ffield.length == 1) {
				if(forceFields[f].vx != 0) {
					if(checkTeleportHaut(this) || checkTeleportBas(this)) {
						if((perso.y >> 8) < forceFields[f].y) perso.y += 768;
						else if((perso.y >> 8) + perso.pY > forceFields[f].y + 32) perso.y -= 768;
					}
					else if((perso.y >> 8) < forceFields[f].y) perso.y += 512;
					else if((perso.y >> 8) + perso.pY > forceFields[f].y + 32) perso.y -= 512;
				}else if(forceFields[f].vy != 0) {
					if(perso.x >> 8 < forceFields[f].x + (16 - (perso.pY>>1))) perso.x += 256;
					else if((perso.x >> 8) + perso.pX > forceFields[f].x + 32 - (16 - (perso.pY>>1))) perso.x -= 256;
				}
			}
			
			perso.vx += forceFields[f].vx * 384;
			perso.vy += forceFields[f].vy * 384;
			
			if(forceFields[f].vx != 0) {
				if(this.isJump) {
					perso.y -= 3<<8;
					var ffi = inForceFieldTp(this);
					if(ffi.length == 0) {
						perso.vy = -800;
						perso.vx = forceFields[f].vx << 9;
					}
				}
				if(this.isDown) perso.y += 3<<8;
			}
			
			if(forceFields[f].vy != 0) {
				if(this.isLeft) {
					perso.x -= 3<<8;
					var ffi = inForceFieldTp(this);
					if(ffi.length == 0) {
						perso.vx = -384;
					}
				}
				if(this.isRight) {
					perso.x += 3<<8;
					var ffi = inForceFieldTp(this);
					if(ffi.length == 0) {
						perso.vx = 384;
					}
				}
			}
		}
		
		var toucheSol = touchingGround(this);
		var carp = onCarpet(this);
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
			var h = this.vie >> 8;
			var r = TIME%h;
			
			for(var i=0; r==0 && i<3; i++) {
				var s = new Sparkle();
				s.x = perso.x + (this.pX<<5) + random(-5<<8,5<<8);;
				s.y = perso.y + (this.pY<<6) + random(-5<<8,5<<8);
				s.used = 7;
				s.vx = 0;
				s.vy = 0;
				s.fading = 100;
				s.color = 1;
				s.portalNum = -1;
				sparkles.push(s);
			}	
		}
		
		//console.log(this.timeVie);
		
		var dir = (this.isRight - this.isLeft) * 128;
		
		//jump handling
		if(this.isJump && toucheSol && !checkTeleportBas(this) && ffield.length == 0){
			this.vy = -1300;
			playSfx(sfx_jump);
		}else if(!this.isJump && this.oldIsJump && this.vy<-200){
			this.vy = -200;
		}
		//end of jump handling
		
		if(this.vx>0){
			if(toucheSol==1 && !checkTeleportGauche(this)){
				STEPS+=(perso.vx)>>4;
				this.vx-=64;
			}else {
				this.vx-=toucheSol == 2 ? 14 : 28;
			}
			if(this.vx<0) this.vx = 0;
		}else if(this.vx<0){
			if(toucheSol==1 && !checkTeleportDroite(this)){
				STEPS-=(perso.vx)>>4;
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
		
		var i;
		for(i=0;i<8;i++){
			if(!checkTeleportBas(this)&&!checkTeleportHaut(this)) this.x += this.vx>>3;
			if(!checkTeleportGauche(this)&&!checkTeleportDroite(this)) this.y += this.vy>>3;
		}
		
		var plate = onPlateforme(this);
		if(plate){
			plate-=200;
			this.x += platforms[plate].vx;
		}
		
		toucheSol = touchingGround(this);
		
		var col = 1;		
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
		
		if(currentMenu != 6 || tutoPortal) {
			if(mousePressed && this.timePosePortal == 25 && !dansUnPortal(this) && !objetPortee() ) {
				if (mouseButton == LEFT) {
					launchPortal(0);
				}else if (mouseButton == RIGHT) {
					launchPortal(1);
				}
			}
		}
		
		
		var colLeft = leftCollision(this);
		var colRight = rightCollision(this);
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
	if(portals[0].used || portals[1].used) {
		if(inForceField(perso)) {
			var i;
			for(i=0;i<2;i++){
				portals[i].used = 0;
				removeSparkles(i, 3);
			}
		}
	}
}

function inForceField(obj) {
	var i, j;
	for(i=0;i<=obj.pY - 1;i+=2){
		for(j=0;j<=obj.pX - 1;j+=2){
			var t = getTileSimple((obj.x>>8) + j, (obj.y>>8) + j);
			if(t>=49 && t<=54) {				
				return true;
			}
		}
	}
	return false;
}

function manageSparkles() {
	for(i=0;i<sparkles.length && quality > 0;i++) {
		if(sparkles[i].used == 5) sparkles[i].vy += GRAVITY;
		else if(sparkles[i].used == 6 || sparkles[i].used == 7) sparkles[i].vy += GRAVITY>>1;
	
		if(sparkles[i].floorTime < 0) {
			sparkles[i].x += sparkles[i].vx;
			sparkles[i].y += sparkles[i].vy;
			sc = sparkles[i].fading / 255;
		}else {		
			if(sparkles[i].used == 7) {
				sparkles[i].fading -= 0.7;
				sc = sparkles[i].fading / 255;
			}else if(sparkles[i].used == 5) {
				if(++sparkles[i].floorTime >= 120) sparkles[i].fading -= 0.7;
				sc = sparkles[i].fading / 255;
			}
		}
		
		if(sparkles[i].used >= 5 && sparkles[i].used < 8) {
			if(getTile((sparkles[i].x>>8) + ((16*sc)>>1), (sparkles[i].y>>8) + ((16*sc)>>1)) != 0) {
				if(sparkles[i].floorTime < 0) {
					if(sparkles[i].used == 7 || sparkles[i].used == 5) {
						sparkles[i].floorTime = 0;
					}else {
						sparkles[i].fading = 0;
					}
				}
			}
		}
		
		if(sparkles[i].used == 1 || sparkles[i].used == 4) {
			sparkles[i].fading -= 8;
			if(getTile((sparkles[i].x>>8) + 4, (sparkles[i].y>>8) + 4) != 0) sparkles[i].fading = 0;
		}else if(sparkles[i].used == 3) {
			if(sparkles[i].vx != 0) {
				var d = Math.abs(sparkles[i].xOrig - sparkles[i].x) >> 8;
				sparkles[i].fading = 200 - (5 * d);
			}else if(sparkles[i].vy != 0) {
				var d = Math.abs(sparkles[i].yOrig - sparkles[i].y) >> 8;
				sparkles[i].fading = 200 - (5 * d);
				var n = sparkles[i].portalNum;
				var plt = portals[n].plateforme;
				if(plt >= 0) {
					sparkles[i].x += platforms[plt].vx;
					sparkles[i].xOrig = sparkles[i].x;
				}
			}
		}else if(sparkles[i].used == 8 || sparkles[i].used == 9) {
			sparkles[i].fading -= 8;
			//if( sparkles[i].used == 9) sparkles[i].vy += GRAVITY;
		}
		
		if(quality > 0 && sparkles[i].fading > 0) {
			var dt = 9 - (sc * 9);
			if(sparkles[i].used == 7 || sparkles[i].used == 5) {
				dt -= 8;
			}
			ctx.drawImage(sparkle, 0, sparkles[i].color * 9, 9, 9, (sparkles[i].x>>8) + dt + ECART_X, (sparkles[i].y>>8) + dt + ECART_Y, 16 * sc, 16 * sc); 
		}
		
		if(sparkles[i].fading <= 0) {
			if(sparkles[i].used == 1 || sparkles[i].used == 4) {
				sparkles.splice(i, 1);
				i--;
			}else if(sparkles[i].used == 3) {
				sparkles[i].x = sparkles[i].xOrig;
				sparkles[i].y = sparkles[i].yOrig;
				sparkles[i].fading = 200;
			}
		}
	}
}

function clearPortals(){
	var ok = 1;
	var i = 0;
	for(i in caisses) {
		if(!ok) break;
		if(caisses[i].shrink == 0 && dansUnPortal(caisses[i])) ok = 0;
	}

	if(ok) {
		for(i in tourelles){
			if(tourelles[i].mort == 0 && dansUnPortal(tourelles[i])) ok = 0;
		}
	}
	
	if(ok && plasmaBall.length > 0 && dansUnPortal(plasmaBall[0])) ok = 0;
	
	if(ok && dansUnPortal(perso)) ok = 0;
	
	if(ok){
		for(i=0;i<2;i++){
			portals[i].used = 0;
			removeSparkles(i, 3);
		}
	}
}

function validerArrivee(){
	var i;
	for(i=0;i<768;i++){
		if(map[i]==35) {
			map[i] = 22;
			displayMap[i] = 22;
		}
	}
	reloadTiles();
}

function toucheCake(){
	var i;
	for(i=0;i<cakes.length;i++){
		if(cakes[i].used){
			if(persoToucheCake(i)){
				cakes[i].used = 0;
				CAKELEFT--;
				createCakeOrSmokeSparkles(cakes[i].x, cakes[i].y, 8, 2, 180);
				playSfx(sfx_grabCake);
				if(CAKELEFT==0) validerArrivee();
			}
		}
	}
}

function createCakeOrSmokeSparkles(x, y, type, number, size) {
	var k;
	for(k=0;k<number;k++){
		var s = new Sparkle();
		s.x = x + parseInt(random(-8<<8,8<<8));
		s.y = y + parseInt(random(-8<<8,8<<8));
		s.used = type;
		s.vx = parseInt(random(-192, 192));
		s.vy = parseInt(random(-192, -96));
		s.fading = size;
		if(type == 8) s.color = 2;
		else if(type == 9) s.color = 3;
		s.portalNum = -1;
		sparkles.push(s);
	}
}


function persoToucheCake(i){
	var retour = 0;

	var posx = perso.x>>8;
	var posy = (perso.y>>8);
	var pX = perso.pX;
	var pY = perso.pY;
	var x = cakes[i].x>>8;
	var y = cakes[i].y>>8;
	
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
			this.x += platforms[this.plateforme].vx;
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
		if(TIME%10==0) {
			this.scale += 1 * this.scaleDir;
			if(this.scale < -2 || this.scale > 2) this.scaleDir = -this.scaleDir;
		}
	
		this.x+=this.vx;
		this.y+=this.vy;
		
		var vx = this.vx;
		var vy = this.vy;
		
		if(!dansUnPortal(this)){
			this.checkCollision();
			if(bossNum == 3 || bossNum == 4) {
				if(this.x < perso.x) this.vx += 4;
				else if(this.x > perso.x) this.vx -= 4;
				if(this.y < perso.y) this.vy += 4;
				else if(this.y > perso.y) this.vy -= 4;
				
				var vmx = 3;
				
				if(this.vx > (vmx<<8)) this.vx = vmx << 8;
				else if(this.vx < -(vmx<<8)) this.vx = -(vmx << 8);
				if(this.vy > (vmx<<8)) this.vy = vmx << 8;
				else if(this.vy < -(vmx<<8)) this.vy = -(vmx << 8);
				
				if(this.x > tubeX) this.needKill = true;
			}
		}
		
		if(bossNum == 0) {
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
			var t = getTileSimple((this.x>>8) + 8, (this.y>>8) + 8);
			if(t == 38 || t == 39 || t == 47) {
				this.x = this.xOrig;
				this.y = this.yOrig;
				this.vx = this.origVx;
				this.vy = this.origVy;
			}
		}
	}
	
	this.ouvrirPorte = function(){
		var i;
		for(i in animatedTiles) {
			if(animatedTiles[i].current>=29 && animatedTiles[i].current<=34){
				animatedTiles[i].used = 0;
				map[animatedTiles[i].place] = 0;
				if(quality == 0) {
					displayMap[animatedTiles[i].place] = 0;
					needLoad = true;
				}
			}
		}
	}
	
	this.encore = function() {
		var i;
		for(i=0;i<768;i++){
			if(map[i]==21) return 1;
		}
		return 0;
	}
	
	this.checkCollision = function() {
		var i;
		var dist = getDistance(this.x>>8, this.x>>8, perso.x>>8, perso.y>>8);
		if(dist > 384) dist = 384;
		sfx_bounce.volume = 1 - (dist / 384);

		if(getCollision(this)==GAUCHE){
			playSfx(sfx_bounce);
			do{
				this.x+=128;
			}while(getCollision(this)==GAUCHE);
			this.vx = -this.vx;
			
			var x = (this.x>>8) - 1;
			var y = this.y>>8;
			for(i=2;i<=14 && bossNum == 0;i++){
				if(getTileSimple(x,y+i)==21){
					y+=i;
					x>>=4;
					y>>=4;
					map[x+(y<<5)] = 1;
					displayMap[x+(y<<5)] = 1;
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
			playSfx(sfx_bounce);
			do{
				this.x-=128;
			}while(getCollision(this)==DROITE);
			this.vx = -this.vx;
			
			var x = (this.x>>8) + 16;
			var y = this.y>>8;
			for(i=2;i<=14 && bossNum == 0;i++){
				if(getTileSimple(x,y+i)==21){
					y+=i;
					x>>=4;
					y>>=4;
					map[x+(y<<5)] = 1;
					displayMap[x+(y<<5)] = 1;
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
			playSfx(sfx_bounce);
			do{
				this.y+=128;
			}while(getCollision(this)==HAUT);
			this.vy = -this.vy;
			
			var x = this.x>>8;
			var y = (this.y>>8) - 1;
			for(i=4;i<=12 && bossNum == 0;i++){
				if(getTileSimple(x+i,y)==21){
					x+=i;
					x>>=4;
					y>>=4;
					map[x+(y<<5)] = 1;
					displayMap[x+(y<<5)] = 1;
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
			playSfx(sfx_bounce);
			do{
				this.y-=128;
			}while(getCollision(this)==BAS);
			this.vy = -this.vy;

			var x = this.x>>8;
			var y = (this.y>>8) + 16;
			for(i=4;i<=12 && bossNum == 0;i++){
				if(getTileSimple(x+i,y)==21){
					x+=i;
					x>>=4;
					y>>=4;
					map[x+(y<<5)] = 1;
					displayMap[x+(y<<5)] = 1;
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
	for(i in plasmaBall) {
		if(plasmaBall[i].used) {
			var posx = obj.x>>8;
			var posy = obj.y>>8;
			var px = obj.pX;
			var py = obj.pY;
			
			var x = plasmaBall[i].x>>8;
			var y = plasmaBall[i].y>>8;
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
		var x = this.x>>8;
		//var y = plateForme[i].y>>8;
		if(x<0 || x>512-48 || (this.vx>0 && rightCollision(this)) || (this.vx<0 && leftCollision(this))){
			//this.x-=this.vx;
			this.vx = -this.vx;
		}
	}
}

function onCarpet(obj) {
	var toucheSol = touchingGround(obj);
	if(toucheSol == 3 || toucheSol == 4) {
		return toucheSol;
	}else {
		var cai = collideCaisse(obj.x>>8,(obj.y>>8) + obj.pY);
		if(!cai) cai = collideCaisse((obj.x>>8)+obj.pX-1,(obj.y>>8) + obj.pY);
		if(cai){
			cai-=300;
			if(caisses[cai].carpet > 0) return caisses[cai].carpet;
		}
	}
	
	return 0;
}

function onPlateforme(obj){
	var plate = collidePlateforme(obj.x>>8,(obj.y>>8) + obj.pY);
	if(!plate) plate = collidePlateforme((obj.x>>8)+obj.pX-1,(obj.y>>8) + obj.pY);
	if(!plate){
		var cai = collideCaisse(obj.x>>8,(obj.y>>8) + obj.pY);
		if(!cai) cai = collideCaisse((obj.x>>8)+obj.pX-1,(obj.y>>8) + obj.pY);
		if(cai){
			cai-=300;
			if(caisses[cai].plateforme>-1) plate = 200 + caisses[cai].plateforme;
		}
	}
	
	return plate;
}

function collidePlateforme(x, y){
	for(plt in platforms){
		var x2 = platforms[plt].x>>8;
		var y2 = platforms[plt].y>>8;
		if(x>x2 && x<x2+48 && y>=y2 && y<y2+15){
			var ret = parseInt(plt);
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
	var x = (perso.x>>8) + perso.pX;
	var y = (perso.y>>8) + (perso.pY>>1);
	var x2 = bossX + 15;
	var y2 = bossY;

	if(x > x2 && y > y2 && y < y2 + 58) return true;

	return false;	  
}

function manageToucheBoss(obj) {
  var posx = obj.x>>8;
  var posy = (obj.y>>8);
  var pX = obj.pX;
  var pY = obj.pY;
  var x = bossX + 16;
  var y = bossY;
  
  if(bossLife < 3 && posx+pX>x && x+74>posx && posy+pY>y && y+58>posy){
    if(bossNum == 1 || bossNum == 3 || bossNum == 4) obj.needKill = true;
	else if(bossNum == 2) {
		obj.x = (80) << 8;
		obj.y = (-16) << 8;
		obj.vx = 0;
		obj.vy = 0;
	}
    bossLife++;
	if(bossLife < 3) {
		for(i in oldMap) {
			if(oldMap[i] == 58) {
				map[i] = 58;
				displayMap[i] = 58;
			}
		}
		needLoad = true;
	}else {
		projos = new Array();
		plasmaBall = new Array();
		bossIsComing = true;
		bossIsTalking = true;
		rumbleTime = 0;
	}
  }
}

function manageInTube(obj) {
	if(obj.vx < 0) return;

	var posx = obj.x>>8;
	var posy = (obj.y>>8);
	var pX = obj.pX;
	var pY = obj.pY;
	var x = tubeX >> 8;
	var y = tubeY >> 8;

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
			
			if(TIME%6 == 0) {
				if(++this.img == 38) this.img = 36;
			}
			
			var t = getTile((this.x>>8) + 8, (this.y>>8) + 8);
			
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
		if(this.invincibility > 0) this.invincibility--;
		if(this.noRemove > 0) this.noRemove--;
  
		if(this.shrink == 0) {
			if(!this.porter){      
				moveObject(this);
				
				if(bossNum > 0) {	//if in boss mode, first level
					if(bossNum == 1 || bossNum == 4) manageInTube(this);
          
					var t = getTileSimple((this.x >> 8) + this.pX + 1, this.y >> 8);
					if(t>= 58 && t <= 60) {
						for(i in map) {
							if(map[i] == t) {
								if(t < 60) {
									map[i]++;
									displayMap[i]++;
								}
								else  {
									map[i] = 0;
									displayMap[i] = 0;
								}
							}
						}
						needLoad = true;
						if(bossNum == 1 || bossNum == 3 || bossNum == 4) this.needKill = true;
						else if(bossNum == 2) {
							this.x = (80) << 8;
							this.y = (-16) << 8;
							this.vx = 0;
							this.vy = 0;
						}
						return;
					}
          
					manageToucheBoss(this);
				}
				
				var plt = onPlateforme(this);
				if(plt){
					plt -= 200;
					this.x += platforms[plt].vx;
					this.plateforme = plt;
					if(platforms[plt].vx < 0 && leftCollision(this)) this.x -= platforms[plt].vx;
					else if(platforms[plt].vx > 0 && rightCollision(this)) this.x -= platforms[plt].vx;
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
				var x = this.x>>8;
				var y = this.y>>8;
				if(x<-16 || x>512 || y<-16 || y>384 || toucheTileMort(this) || plasmaToucheObjet(this)){
					if(bossNum == 1 || bossNum == 3 || bossNum == 4) {	//if in boss mode, first, third or fourth level
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
				if(bossNum == 1 || bossNum == 4) {	//if in boss mode, first or fourth level
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
	var i;
	for(i in caisses){
		var x2 = caisses[i].x>>8;
		var y2 = caisses[i].y>>8;
		if(!caisses[i].porter && !dansUnPortal(caisses[i]) && x>x2 && x<x2+15 && y>y2 && y<y2+15){
			var ret = parseInt(i);
			return 300 + ret;
		}
	}
	return 0;
}

function projoTouchePerso(obj) {
	var posx = obj.x>>8;
	var posy = obj.y>>8;
	var px = obj.pX;
	var py = obj.pY;
	
	var x = perso.x>>8;
	var y = perso.y>>8;

	if(posx+px>x && x+perso.pX>posx && posy+py>y && y+perso.pY>posy) {
		return true;
	}
		
	return false;
}

function collideAnyCaisse(x, y) {
	var i;
	for(i in caisses){
		var x2 = caisses[i].x>>8;
		var y2 = caisses[i].y>>8;
		if(x>x2 && x<x2+15 && y>y2 && y<y2+15){
			var ret = parseInt(i);
			return 300 + ret;
		}
	}
	return 0;
}

function caisseSurInterrupteur(){
	for(i in caisses){
		if(getTileSimple(caisses[i].x>>8,(caisses[i].y>>8)+19)==19){
			return 1;
		}else if(getTileSimple((caisses[i].x>>8)+15,(caisses[i].y>>8)+19)==19){
			return 1;
		}
	}
	return 0;
}

function caisseSurPerso(obj){
	if(obj.type == "caisse" && obj.vy > 0 && !dansUnPortal(obj)){	//the object is a crate
		var x = (obj.x>>8) + 3;
		var y = (obj.y>>8) + obj.pY;
		var x2 = perso.x>>8;
		var y2 = perso.y>>8;
		
		if(x>=x2 && x<x2+16 && y>=y2 && y<y2+4) return 1;
		else{
			x+=9;
			if(x>=x2 && x<x2+16 && y>=y2 && y<y2+4) return 1;
		}
	}
	return 0;
}

function caisseToucheObjet(obj){
	var posx = obj.x>>8;
	var posy = obj.y>>8;
	var px = obj.pX;
	var py = obj.pY;
	
	for(i in caisses){
		if(caisses[i].porter==0 && (caisses[i].vx!=0 || caisses[i].vy!=0) && !dansUnPortal(caisses[i])){
			var x = caisses[i].x>>8;
			var y = caisses[i].y>>8;
			if(posx+px>x && x+16>posx && posy+py>y && y+16>posy) return i+1;
		}
	}
	return 0;
}

function placeObject(obj){
	var x = perso.x + (perso.pX<<7);
	var y = perso.y + (perso.pY<<7);
	
	obj.x = x - (obj.pX << 7);
	obj.y = y - (obj.pY << 7);
	
	var cos = getCos(mouseX,mouseY,(x>>8) + ECART_X,(y>>8) + ECART_Y);
	var sin = getSin(mouseX,mouseY,(x>>8) + ECART_X,(y>>8) + ECART_Y);
	
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
	var ffield = inForceFieldTp(obj);
	for(i in ffield) {
		var f = ffield[i];
		if(forceFields[f].vx != 0) {
			if(checkTeleportHaut(obj) || checkTeleportBas(obj)) {
				if((obj.y >> 8) < forceFields[f].y) obj.y += 768;
				else if((obj.y >> 8) + obj.pY > forceFields[f].y + 32) obj.y -= 768;
			}
			else if((obj.y >> 8) < forceFields[f].y + (16 - (obj.pY>>1))) obj.y += 512;
			else if((obj.y >> 8) + obj.pY > forceFields[f].y + 32 - (16 - (obj.pY>>1))) obj.y -= 512;
		}else if(forceFields[f].vy != 0) {
			if(obj.x >> 8 < forceFields[f].x + (16 - (obj.pY>>1))) obj.x += 256;
			else if((obj.x >> 8) + obj.pX > forceFields[f].x + 32 - (16 - (obj.pY>>1))) obj.x -= 256;
		}
		
		obj.vx = forceFields[f].vx * 384;
		obj.vy = forceFields[f].vy * 384;
		
		if(obj.type == "tourelle" && !obj.canExplode) {
			obj.canExplode = true;
		}
	}

	var carp = onCarpet(obj);
	if(carp) {
		obj.x += carp == 3 ? 384 : carp == 4 ? -384 : 0;
		obj.vx = carp == 3 ? 8 : carp == 4 ? -8 : 0;
	}
	if(obj.type == "caisse") {
		if(carp == 0 && obj.carpet != 0) obj.vx = obj.carpet == 3 ? 384 : obj.carpet == 4 ? -384 : 0;
		obj.carpet = carp;
	}
	
	var checkTgauche = checkTeleportGauche(obj);
	var checkTdroite = checkTeleportDroite(obj);
	
	var toucheSol = touchingGround(obj);
	
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
	
	var j;
	for(j=0;j<8;j++){
		if(!checkTeleportBas(obj)&&!checkTeleportHaut(obj)) obj.x+=obj.vx>>3;
		if(!checkTeleportGauche(obj)&&!checkTeleportDroite(obj)&&!caisseSurPerso(obj)) obj.y+=obj.vy>>3;
    
		if(obj.type == "caisse") {
		  if(caisseToucheObjet(perso) && obj.invincibility == 0) {
			perso.x += obj.vx >> 3;
			
			if(obj.vx < 0) {
			  if(leftCollision(perso)) {
				while(leftCollision(perso)) perso.x += 128;
				obj.vx = 0;
			  }
			}else if(obj.vx > 0) {
			  if(rightCollision(perso)) {
				while(rightCollision(perso)) perso.x -= 128;
				obj.vx = 0;
			  }
			}
		  }
		  
		  if(obj.vx != 0 && !dansUnPortal(obj)) {
			for(c in caisses) {
			  var ca = caisses[c];
			  if(dansUnPortal(ca)) continue;
			  if(obj.x != ca.x && obj.y != ca.y) {
				var y = obj.y >> 8;
				var x = obj.x >> 8;
				
				if(obj.vx > 0) x += 16;
				else if(obj.vx < 0) x -= 1;
				
				var needReturn = false;
				
				if(pointDansObjet(x, y + 1, ca)) {
					if(ca.porter) perso.vx = obj.vx;
					else if(obj.porter) perso.vx = ca.vx;
					ca.vx = obj.vx;
					obj.vx >>= 1;
					needReturn = true;
				}else if(pointDansObjet(x, y + 8, ca)) {
					if(ca.porter) perso.vx = obj.vx;
					else if(obj.porter) perso.vx = ca.vx;
					ca.vx = obj.vx;
					obj.vx >>= 1;
					needReturn = true;
				}else if(pointDansObjet(x, y + 13, ca)) {
					if(ca.porter) perso.vx = obj.vx;
					else if(obj.porter) perso.vx = ca.vx;
					ca.vx = obj.vx;
					obj.vx >>= 1;
					needReturn = true;
				}
				
				if(needReturn) {
				  var col = 1;
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

	var col = 1;
	while(col && !dansUnPortal(obj)){
		col = checkCollisions(obj);
	}
}

function objetPortee(){
	var i;
	for(i in caisses){
		if(caisses[i].porter==1) return 1;
	}
	for(i in tourelles){
		if(tourelles[i].porter==1) return 1;
	}
	return 0;
}

function pointDansObjet(x, y, obj){
	var x2 = obj.x>>8;
	var y2 = obj.y>>8;
	if(x>=x2 && x<x2+obj.pX && y>=y2 && y<y2+obj.pY) return 1;
	else return 0;
}

function grabObject(){
	var ok = 0;
	if(!objetPortee()){
		if(mousePressed && (mouseButton == LEFT)){
			var x2 = (perso.x>>8) + (perso.pX>>1);
			var y2 = (perso.y>>8) + (perso.pY>>1);
			for(i in caisses){
				var x1 = (caisses[i].x>>8) + (caisses[i].pX>>1);
				var y1 = (caisses[i].y>>8) + (caisses[i].pY>>1);
				if(getDistance(x1, y1, x2, y2)<32 && pointDansObjet(mouseX - ECART_X, mouseY - ECART_Y, caisses[i])){
					caisses[i].porter = 1;
					ok = 1;
					break;
				}
			}
			if(!ok){
				for(i in tourelles){
					var x1 = (tourelles[i].x>>8) + (tourelles[i].pX>>1);
					var y1 = (tourelles[i].y>>8) + (tourelles[i].pY>>1);
					if(!tourelles[i].mort && getDistance(x1, y1, x2, y2)<32 && pointDansObjet(mouseX - ECART_X, mouseY - ECART_Y, tourelles[i])){
						tourelles[i].porter = 1;
						break;
					}
				}
			}
		}
	}else{
		if(!mousePressed) {
			ok = 0;
			for(i in caisses){
				if(caisses[i].porter==1){
					caisses[i].porter = 0;
					ok = 1;
					caisses[i].invincibility = 3;
					caisses[i].noRemove = 90;
					playSfx(sfx_throwObject);
					break;
				}
			}
			if(!ok){
				for(i in tourelles){
					if(tourelles[i].porter==1){
						tourelles[i].porter = 0;
						tourelles[i].canExplode = 1;
						playSfx(sfx_throwObject);
						break;
					}
				}
			}
		}
	}
}

function downCollision(obj){
	var x = obj.x>>8;
	var y = (obj.y>>8) + obj.pY - 1;
	var pX = obj.pX;
	
	var i;
	for(i=x;i<x+pX;i++){
		var tile = getTile(i,y);
		if(tile) return tile;
	}
	
	return 0;
}

function upCollision(obj){
	var x = obj.x>>8;
	var y = (obj.y>>8);
	var pX = obj.pX;
	
	var i;
	for(i=x;i<x+pX;i++){
		var tile = getTile(i,y);
		if(tile) return tile;
	}
	
	return 0;
}

function leftCollision(obj){
	var x = (obj.x>>8) - 1;
	var y = obj.y>>8;
	var pY = obj.pY;
	
	var i;
	for(i=y;i<y+pY;i++){
		var tile = getTile(x,i);
		if(tile) return tile;
	}
	
	return 0;
}

function rightCollision(obj){
	var x = (obj.x>>8) + obj.pX;
	var y = obj.y>>8;
	var pY = obj.pY;
	
	var i;
	for(i=y;i<y+pY;i++){
		var tile = getTile(x,i);
		if(tile) return tile;
	}
	
	return 0;
}

function getCollision(obj){
	var i;
	var touche = [0, 0, 0, 0];//top, bottom, left, right
	var x = obj.x>>8;
	var y = obj.y>>8;
	
	var max = 0;
	var maxVal = 0;
	
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

	var coll = 0;
	
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
	restoreInput(replayPauseInput);
	keys = replay.inputs[TIME];
	mouseX = replay.mouseX[TIME];
	mouseY = replay.mouseY[TIME];
}

function max(x, y){
	if(x>y) return x;
	else return y;
}

function getAngle(x1, y1, x2, y2)
{
	var value = parseFloat(Math.atan2(y2 - y1 , x2 - x1));
	return value;
}

function getCos(x1, y1, x2, y2){
	var adj = x1-x2;
	var opp = y1-y2;
	var hyp = Math.sqrt(opp*opp+adj*adj);
	var movx = adj/hyp;

	return movx;
}

function getSin(x1, y1, x2, y2){
	var adj = x1-x2;
	var opp = y1-y2;
	var hyp = Math.sqrt(opp*opp+adj*adj);
	var movy = opp/hyp;

	return movy;
}

function inScreen(x, y){
	if(x<0 || x>=512) return 0;
	if(y<0 || y>=384) return 0;
	return 1;
}

function finNiveau(){
	if(!dansUnPortal(perso)){
		var i, j;
		for(i=4;i<=28;i+=2){
			for(j=2;j<=14;j+=2){
				if(getTileSimple((perso.x>>8) + j, (perso.y>>8) + j)==22) return 1;
			}
		}
	}
	
	return 0;
}

function getTileSimple(x, y){
	if(x>=512 || y>=384 || y<0 || x<0) return 0;
	var tile = map[((y>>4)*32) + (x>>4)];
	
	return tile;
}

function getDistance(x1, y1, x2, y2){
	var adj = x1-x2;
	var opp = y1-y2;
	return Math.sqrt(opp*opp+adj*adj);
}

function tabContains(tab, value) {
	for(i in tab) {
		if(tab[i] == value) return true;
	}
	return false;
}

function playSfx(obj) {
	if(sound) {
		if(obj.currentTime != 0) {
			obj.currentTime = 0;
		}
		obj.play();
	}
}

function playSfxIfFinished(obj) {
	if(sound && obj.currentTime == 0 || obj.currentTime == obj.duration) {
		obj.currentTime = 0;
		obj.play();
	}
}

function toTime(time) {
	var s = time / 60.0;
	var m = parseInt((s/60.0));
	s = s - (60.0 * m);
	var ms = (s - (parseInt(s))) * 1000;
	
	return (m<10 ? "0" : "") + m + ":" + (s<10 ? "0" : "") + parseInt(s) + "." + Math.round(ms);
}

function Campaign(folder) {
	this.folder = folder;
	this.levels = new Array();
	this.texts = new Array();
}

function loadCampaigns() {
	campaigns = new Array();
	campaigns.push(new Campaign("normal"));
	campaigns.push(new Campaign("advanced"));
	campaigns.push(new Campaign("community"));
	campaigns.push(new Campaign("tutorial"));
	campaigns.push(new Campaign("story"));

	for(c in campaigns) {
		for(i=1; i<29;i++){
			campaigns[c].levels[i - 1] = new Array();
			campaigns[c].texts[i - 1] = new Array();
			
			if(campaigns[c].folder != "tutorial" || (campaigns[c].folder == "tutorial" && i < 9)) {
				loadLevelFiles(c, i);
			}
		}
	}
}

/**
 * Load the map and the text of a campaign level.
 *
 * @param {number} camp The index of the campaign.
 * @param {number} count The level number, starting at 1.
 */
function loadLevelFiles(camp, count) {
	var folder = campaigns[camp].folder;
	loadTextFile("maps/" + folder + "/level" + count + ".sad", function(msg) {
		var tmp = msg.split(" ", 768);
		for(j in tmp) {
			campaigns[camp].levels[count - 1].push(parseInt(tmp[j]));
		}
		levelsLoaded++;
	});
	
	var txtLevel = folder == "advanced" ? 1 : count;
	loadTextFile("txt/" + folder + "/level" + txtLevel + "_1.txt", function(msg) {
		campaigns[camp].texts[count - 1] = msg;
		txtLoaded++;
	});
}

/**
 * Load a text file.
 *
 * @param {string} url The URL of the file.
 * @param {function(string)} callback Gets the content of the file.
 */
function loadTextFile(url, callback) {
	fetch(url, { cache: "no-cache" }).then(function(response) {
		if(!response.ok) throw new Error(url + ": " + response.status);
		return response.text();
	}).then(callback).catch(function(e) {
		console.error(e);
	});
}

function loadSfx() {
	if(needLoadSfx) {
		needLoadSfx = false;
		sfx_explode = loadAudio(sfx_explode, "explode");
		sfx_bounce = loadAudio(sfx_bounce, "bounce");
		sfx_grabCake = loadAudio(sfx_grabCake, "grabCake");
		sfx_jump = loadAudio(sfx_jump, "jump");
		sfx_throwObject = loadAudio(sfx_throwObject, "throwObject");
		sfx_enterPortal = loadAudio(sfx_enterPortal, "enterPortal");
		sfx_transition = loadAudio(sfx_transition, "transition");
		sfx_tick = loadAudio(sfx_tick, "tick");
		sfx_pain = loadAudio(sfx_pain, "pain");
		sfx_flatline = loadAudio(sfx_flatline, "flatline");
		sfx_noPortal = loadAudio(sfx_noPortal, "noPortal");
		sfx_shoot = loadAudio(sfx_shoot, "shoot");
		
		sfx_portal = new Array();
		for(i=1; i<3 && audioTagSupport; i++) {
			var a = new Audio("sounds/portal" + i + ".ogg");
			a.load();
			a.addEventListener('canplaythrough', function() { // totally loaded
				if(!noSound) loadedSfx++;
			});
			sfx_portal.push(a);
			//loadedSfx++;
		}
	}
}

function loadCreditsText() {
	creditsTxt = new Array();
	loadTextFile("txt/credits/credits.txt", function(msg) {
		var tmp = msg.split("|");
		for(j in tmp) {
			creditsTxt.push(tmp[j]);
		}
	});
}

function loadGfx() {

	body = new Array();
	for(var i=0; i < 2; i++) {
		var t = new Image();   // Create a new Image object
		t.src = 'sprites/body' + i + '.png'; // Set the path to the source
		t.onload = function() {
			loadedImg++;
			canDrawLoading++;
		}
		body.push(t);
	}
	
	head = new Array();
	for(var i=0; i < 2; i++) {
		var t = new Image();   // Create a new Image object
		t.src = 'sprites/head' + i + '.png'; // Set the path to the source
		t.onload = function() {
			loadedImg++;
			canDrawLoading++;
		}
		head.push(t);
	}
	controls = new Image();   // Create a new Image object
	controls.src = 'decor/controls.png'; // Set the path to the source
	controls.onload = function() { 
		canDrawLoading++;
	}
	
	crosshair = new Image();   // Create a new Image object
	crosshair.src = 'sprites/crosshair.png'; // Set the path to the source
	crosshair.onload = function() {  
		loadedImg++;
		canDrawLoading++;
	}
	
	bluePortal = new Image();   // Create a new Image object
	bluePortal.src = 'sprites/bluePortal.png'; // Set the path to the source
	bluePortal.onload = function() {  
		loadedImg++; 
		canDrawLoading++;
	}
	
	redPortal = new Image();   // Create a new Image object
	redPortal.src = 'sprites/redPortal.png'; // Set the path to the source
	redPortal.onload = function() {  
		loadedImg++;
		canDrawLoading++;
	}
	
	//generating transition line order
	linesHoriz = new Array();
	linesVerti = new Array();
	for(i=0; i < 128; i++) {
		do {
			var r = parseInt(random(0, 129));
		}while(tabContains(linesHoriz, r));
		linesHoriz.push(r);
		linesVerti.push(r);
	}
	
	
	bg = new Array();
	for(i=1; i<12; i++) {
		var img = new Image();   // Create a new Image object
		img.src = 'bg/level' + i + '.png'; // Set the path to the source
		img.onload = function() {  
			loadedImg++; 
		}
		bg.push(img);
	}
	
	menuBG = new Image();   // Create a new Image object
	menuBG.src = 'bg/menuBG.png'; // Set the path to the source
	menuBG.onload = function() {  
		loadedImg++; 
	}
	
	levelEditorHud = new Image();   // Create a new Image object
	levelEditorHud.src = 'bg/levelEditorHud.png'; // Set the path to the source
	levelEditorHud.onload = function() {  
		loadedImg++; 
	}
	
	hud = new Image();   // Create a new Image object
	hud.src = 'bg/hud.png'; // Set the path to the source
	hud.onload = function() {  
		loadedImg++; 
	}
	
	mapSelection = new Image();   // Create a new Image object
	mapSelection.src = 'bg/mapSelection.png'; // Set the path to the source
	mapSelection.onload = function() {  
		loadedImg++; 
	}
	
	highscore = new Image();   // Create a new Image object
	highscore.src = 'bg/highscore.png'; // Set the path to the source
	highscore.onload = function() {  
		loadedImg++; 
	}
	
	tube = new Image();   // Create a new Image object
	tube.src = 'sprites/tube.png'; // Set the path to the source
	tube.onload = function() {
		loadedImg++; 
	}
	
	tube2 = new Image();   // Create a new Image object
	tube2.src = 'sprites/tube2.png'; // Set the path to the source
	tube2.onload = function() {
		loadedImg++; 
	}
	
	tunnel = new Image();   // Create a new Image object
	tunnel.src = 'sprites/tunnel.png'; // Set the path to the source
	tunnel.onload = function() {
		loadedImg++; 
	}
	
	tunnel2 = new Image();   // Create a new Image object
	tunnel2.src = 'sprites/tunnel2.png'; // Set the path to the source
	tunnel2.onload = function() {
		loadedImg++; 
	}
	
	mouseIcon = new Image();   // Create a new Image object
	mouseIcon.src = 'images/mouseIcon.png'; // Set the path to the source
	mouseIcon.onload = function() {
		loadedImg++; 
	}
	
	key = new Image();   // Create a new Image object
	key.src = 'images/key.png'; // Set the path to the source
	key.onload = function() {
		loadedImg++; 
	}
	
	caisse = new Image();   // Create a new Image object
	caisse.src = 'sprites/caisse.png'; // Set the path to the source
	caisse.onload = function() {
		loadedImg++; 
	}
	
	pauseBG = new Image();   // Create a new Image object
	pauseBG.src = 'menu/pauseBG.png'; // Set the path to the source
	pauseBG.onload = function() {
		loadedImg++;
	}
	
	tex_sound = new Image();   // Create a new Image object
	tex_sound.src = 'menu/tex_sound.png'; // Set the path to the source
	tex_sound.onload = function() {
		loadedImg++; 
	}
	
	tex_cross = new Image();   // Create a new Image object
	tex_cross.src = 'menu/tex_cross.png'; // Set the path to the source
	tex_cross.onload = function() {
		loadedImg++; 
	}
	
	tex_leftBG = new Image();   // Create a new Image object
	tex_leftBG.src = 'menu/tex_leftBG.png'; // Set the path to the source
	tex_leftBG.onload = function() {
		loadedImg++; 
	}
	
	tex_rightBG = new Image();   // Create a new Image object
	tex_rightBG.src = 'menu/tex_rightBG.png'; // Set the path to the source
	tex_rightBG.onload = function() {
		loadedImg++; 
	}
	
	tex_button = new Image();   // Create a new Image object
	tex_button.src = 'menu/tex_button.png'; // Set the path to the source
	tex_button.onload = function() {
		loadedImg++; 
	}
	
	tourelle = new Array();
	for(var i=0; i < 2; i++) {
		var t = new Image();   // Create a new Image object
		t.src = 'sprites/tourelle' + i + '.png'; // Set the path to the source
		t.onload = function() {
			loadedImg++; 
		}
		tourelle.push(t);
	}
	
	sparkle = new Image();   // Create a new Image object
	sparkle.src = 'sprites/sparkle.png'; // Set the path to the source
	sparkle.onload = function() {  
		loadedImg++; 
	}
	
	cake = new Image();   // Create a new Image object
	cake.src = 'sprites/cake.png'; // Set the path to the source
	cake.onload = function() {  
		loadedImg++;
	}
	
	portalGun = new Image();   // Create a new Image object
	portalGun.src = 'sprites/portalGun.png'; // Set the path to the source
	portalGun.onload = function() {  
		loadedImg++; 
	}
	
	cameraFollow = new Image();   // Create a new Image object
	cameraFollow.src = 'sprites/cameraFollow.png'; // Set the path to the source
	cameraFollow.onload = function() {  
		loadedImg++; 
	}
	
	robotEye = new Array();
	for(var rob = 1; rob < 5; rob++) {
		var r = new Image();   // Create a new Image object
		r.src = 'sprites/robotEye' + rob + '.png'; // Set the path to the source
		r.onload = function() {  
			loadedImg++; 
		}
		robotEye.push(r);
	}
	
	robotHead = new Image();   // Create a new Image object
	robotHead.src = 'sprites/robotHead.png'; // Set the path to the source
	robotHead.onload = function() {  
		loadedImg++; 
	}
	
	plasma = new Image();   // Create a new Image object
	plasma.src = 'sprites/plasma.png'; // Set the path to the source
	plasma.onload = function() {  
		loadedImg++; 
	}
	
	platform = new Image();   // Create a new Image object
	platform.src = 'sprites/plateforme.png'; // Set the path to the source
	platform.onload = function() {  
		loadedImg++;
	}
	
	tileset = new Array();
	for (i = 0; i < NUM_TILES; i++) {
		tileset[i] = new Image();
		tileset[i].src = 'tiles/tile_' + (i+1) + '.gif';
		tileset[i].onload = function() {  
			loadedImg++; 
		}
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
	var randomnumber = Math.floor(Math.random()*(max - min)) + min;
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