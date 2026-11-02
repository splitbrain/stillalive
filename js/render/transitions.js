/**
 * Drawing of the transitions between levels.
 */

import { ctx } from '../canvas.js';
import { TRANS } from '../game.js';
import { highscore, linesHoriz, linesVerti } from '../images.js';
import { finNiveau } from '../physics.js';
import { doDrawIntermission } from './menus.js';
import { game, ui } from '../state.js';

export function manageTransitionDraw() {
	if(finNiveau()) {//if a level is finished, closing transition
		if(game.perso.fadeNextLevel > 0) {
			drawTransitionIn();
		}
		else {
			if(ui.drawIntermission) {
				doDrawIntermission();
			}
		}
		
	} else {//else it is an opening transition
		if(game.perso.intermissionFade < 0) {
			ctx.fillStyle = "rgb(0, 0, 0)";
			//noStroke();
			ctx.fillRect(game.ECART_X - 1, game.ECART_Y, 512, 384);
			const a = -(game.perso.intermissionFade / 20);
			game.perso.intermissionFade++;
			ctx.globalAlpha = a;
			ctx.drawImage(highscore, game.ECART_X, game.ECART_Y);
			ctx.globalAlpha = 1;
		}else drawTransitionOut();
	}
}

function drawTransitionIn() {
	let nb, i;
	ctx.fillStyle = "rgb(0, 0, 0)";;
	//noStroke();
	const scale = 1 - (game.perso.fadeNextLevel / 120);
	if(TRANS == 1) {//top left corner
		ctx.fillRect(game.ECART_X, game.ECART_Y, parseInt(512 * scale), parseInt(384 * scale));
	}else if(TRANS == 2) {//left to right
		ctx.fillRect(game.ECART_X, game.ECART_Y, parseInt(512 * scale), 384);
	}else if(TRANS == 3) {//top to bottom
		ctx.fillRect(game.ECART_X, game.ECART_Y, 512, parseInt(384 * scale));
	}else if(TRANS == 4) {//successive horizontal lines
		nb = 120 - game.perso.fadeNextLevel;
		if(nb < linesHoriz.length) {
			for(i = 0; i < nb; i++) {
				ctx.fillRect(game.ECART_X, game.ECART_Y + (linesHoriz[i] * 3), 512, 3);
			}
		}else {
			ctx.fillRect(game.ECART_X, game.ECART_Y, 512, 384);
		}
	}else if(TRANS == 5) {//successive vertical lines
		nb = 120 - game.perso.fadeNextLevel;
		if(nb < linesVerti.length) {
			for(i = 0; i < nb; i++) {
				ctx.fillRect(game.ECART_X + (linesVerti[i] * 4), game.ECART_Y, 6, 384);
			}
		}else {
			ctx.fillRect(game.ECART_X, game.ECART_Y, 512, 384);
		}
	}else if(TRANS == 6) {//square to center
		const x = 512 - parseInt(512 * scale);
		const y = 384 - parseInt(384 * scale);
		ctx.fillRect(game.ECART_X + (x>>1), game.ECART_Y + (y>>1), parseInt(512 * scale), parseInt(384 * scale));
	}
}

function drawTransitionOut() {
	let nb, i;
	ctx.fillStyle = "rgb(0, 0, 0)";
	ctx.strokeStyle = "rgb(0, 0, 0)";
	const scale = game.perso.fadeNextLevel / 120;
	const x = 512 - parseInt(512 * scale);
	const y = 384 - parseInt(384 * scale);
	
	if(TRANS == 1) {//top left corner
		ctx.fillRect(game.ECART_X + x, game.ECART_Y + y, parseInt(512 * scale), parseInt(384 * scale));
	}else if(TRANS == 2) {//left to right
		ctx.fillRect(game.ECART_X + x, game.ECART_Y, parseInt(512 * scale), 384);
	}else if(TRANS == 3) {//top to bottom
		ctx.fillRect(game.ECART_X, game.ECART_Y + y, 512, parseInt(384 * scale));
	}else if(TRANS == 4) {//successive lines
		nb = game.perso.fadeNextLevel;
		if(nb < linesHoriz.length) {
			for(i = 0; i < nb; i++) {
				ctx.fillRect(game.ECART_X, game.ECART_Y + (linesHoriz[i] * 3), 512, 5);
			}
		}else {
			ctx.fillRect(game.ECART_X, game.ECART_Y, 512, 384);
		}
	}else if(TRANS == 5) {//successive vertical lines
		nb = game.perso.fadeNextLevel;
		if(nb < linesVerti.length) {
			for(i = 0; i < nb; i++) {
				ctx.fillRect(game.ECART_X + (linesVerti[i] * 4), game.ECART_Y, 6, 384);
			}
		}else {
			ctx.fillRect(game.ECART_X, game.ECART_Y, 512, 384);
		}
	}else if(TRANS == 6) {//square to center
		ctx.strokeStyle = "rgb(0, 0, 0)";
		ctx.lineWidth = 384 * scale;
		//noFill();
		ctx.strokeRect(game.ECART_X, game.ECART_Y, 512, 384);
	}
}
