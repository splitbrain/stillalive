/**
 * The Projectile object and its helper functions.
 */

import { collideAnyCaisse } from './Caisse.js';
import { getTile } from '../physics.js';
import { game } from '../state.js';

export function Projectile(x, y, vx, vy) {
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

export function projoTouchePerso(obj) {
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
