/**
 * The AnimatedTile object and its helper functions.
 */

export function AnimatedTile(x, y, min, max, type, place, speed) {
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
