/**
 * The Camera object and its helper functions.
 */

import { game } from '../state.js';

export class Camera {
	constructor(x, y) {
		this.x = x;
		this.y = y;
		this.vx = 0;
		this.vy = 0;
		this.inert = 1;
		this.dy = 0;
	}

	move() {
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
