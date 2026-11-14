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
	const minutes = Math.floor(total / 60000);
	const seconds = Math.floor(total / 1000) % 60;
	const milliseconds = total % 1000;

	return `${pad(minutes)}:${pad(seconds)}.${pad(milliseconds, 3)}`;
}

/**
 * Format a level time as the time code of a VCR.
 *
 * @param {number} time The time in ticks of 1/60 second.
 * @returns {string} The time as hours, minutes and seconds, e.g. "0:01:23".
 */
export function toTimeCode(time) {
	const total = Math.floor(time / 60);
	const hours = Math.floor(total / 3600);
	const minutes = Math.floor(total / 60) % 60;
	const seconds = total % 60;

	return `${hours}:${pad(minutes)}:${pad(seconds)}`;
}
