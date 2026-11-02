/**
 * The Cake object and its helper functions.
 */

import { playSound, sfx_grabCake } from '../audio.js';
import { createCakeOrSmokeSparkles } from './Sparkle.js';
import { reloadTiles } from '../render/game.js';
import { game } from '../state.js';
import { random } from '../utils.js';

export function validerArrivee(){
	let i;
	for(i=0;i<768;i++){
		if(game.map[i]==35) {
			game.map[i] = 22;
			game.displayMap[i] = 22;
		}
	}
	reloadTiles();
}

export function toucheCake(){
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

export class Cake {
	constructor(x, y) {
		this.x = x;
		this.y = y;
		this.ox = x;
		this.oy = y;
		this.mDir = parseInt(random(0, 1)) == 0 ? -1 : 1;
		this.vy = random(-3<<8, 3<<8);
		this.used = true;
	}
}
