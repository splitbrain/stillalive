/**
 * The format of the level times.
 */

/**
 * Format a level time.
 *
 * @param {number} time The time in ticks of 1/60 second.
 * @returns {string} The time as minutes, seconds and milliseconds, e.g. "01:05.500".
 */
export function toTime(time) {
	const total = Math.round((time * 1000) / 60);
	const m = Math.floor(total / 60000);
	const s = Math.floor(total / 1000) % 60;
	const ms = total % 1000;

	return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0') + '.' + String(ms).padStart(3, '0');
}
