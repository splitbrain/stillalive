/**
 * The Portal object and its helper functions.
 */

import { game } from '../state.js';

export function Portal() {
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
