/**
 * The ForceField object and its helper functions.
 */

import { removeSparkles } from './Sparkle.js';
import { getTileSimple } from '../physics.js';
import { game } from '../state.js';

export function fieldForceTest() {
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

export function inForceField(obj) {
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

export class ForceField {
	constructor(x, y, w, h, vx, vy) {
		this.x = x;
		this.y = y;
		this.h = h;
		this.w = w;
		this.vx = vx;
		this.vy = vy;
	}
}

export function inForceFieldTp(obj) {
	let i;
	const posx = obj.x>>8;
	const posy = (obj.y>>8);
	const pX = obj.pX;
	const pY = obj.pY;
	
	const fields = new Array();
	
	for(i in game.forceFields) {
		let x = game.forceFields[i].x;
		let y = game.forceFields[i].y;
		let w = game.forceFields[i].w;
		let h = game.forceFields[i].h;
		
		if(w < 0) {
			w = -w;
			x -= w;
		}else if(h < 0) {
			h = -h;
			y -= h;
		}
		
		if(posx+pX>x && x+w>posx && posy+pY>y && y+h>posy){
			fields.push(i);
		}
	}
	
	return fields;
}
