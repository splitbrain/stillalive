/**
 * The Tunnel object and its helper functions.
 */

export function Tunnel(x, y, dir) {
	this.x = x;
	this.y = y;
	this.dir = dir;
	this.pX = 16;
	this.pY = 32;
	this.vx = 0;
	this.vy = 0;
}
