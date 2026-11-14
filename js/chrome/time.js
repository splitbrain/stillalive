/**
 * The formats of the level times.
 */

/**
 * Write a number with leading zeros.
 *
 * @param {number} value The number.
 * @param {number} [digits] The minimum number of digits.
 * @returns {string} The number with leading zeros, e.g. "05".
 */
function pad(value, digits = 2) {
	return String(value).padStart(digits, '0');
}

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

	return `${pad(m)}:${pad(s)}.${pad(ms, 3)}`;
}

/**
 * Format a level time as the time code of a VCR.
 *
 * @param {number} time The time in ticks of 1/60 second.
 * @returns {string} The time as hours, minutes and seconds, e.g. "0:01:23".
 */
export function toTimeCode(time) {
	const seconds = Math.floor(time / 60);
	const h = Math.floor(seconds / 3600);
	const m = Math.floor(seconds / 60) % 60;
	const s = seconds % 60;

	return `${h}:${pad(m)}:${pad(s)}`;
}
