/**
 * Math and helper functions.
 */

export function degToRad(d) {
	return d * Math.PI / 180;
}

export function radToDeg(r) {
	return r * 180 / Math.PI;
}

function max(x, y){
	if(x>y) return x;
	else return y;
}

export function getAngle(x1, y1, x2, y2)
{
	const value = parseFloat(Math.atan2(y2 - y1 , x2 - x1));
	return value;
}

export function getCos(x1, y1, x2, y2){
	const adj = x1-x2;
	const opp = y1-y2;
	const hyp = Math.sqrt(opp*opp+adj*adj);
	const movx = adj/hyp;

	return movx;
}

export function getSin(x1, y1, x2, y2){
	const adj = x1-x2;
	const opp = y1-y2;
	const hyp = Math.sqrt(opp*opp+adj*adj);
	const movy = opp/hyp;

	return movy;
}

export function inScreen(x, y){
	if(x<0 || x>=512) return 0;
	if(y<0 || y>=384) return 0;
	return 1;
}

export function getDistance(x1, y1, x2, y2){
	const adj = x1-x2;
	const opp = y1-y2;
	return Math.sqrt(opp*opp+adj*adj);
}

export function tabContains(tab, value) {
	let i;
	for(i in tab) {
		if(tab[i] == value) return true;
	}
	return false;
}

export function toTime(time) {
	let s = time / 60.0;
	const m = parseInt((s/60.0));
	s = s - (60.0 * m);
	const ms = (s - (parseInt(s))) * 1000;
	
	return (m<10 ? "0" : "") + m + ":" + (s<10 ? "0" : "") + parseInt(s) + "." + Math.round(ms);
}

export function random(min, max) {
	const randomnumber = Math.floor(Math.random()*(max - min)) + min;
	return randomnumber;
}
