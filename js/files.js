/**
 * Download and upload of JSON files.
 */

/**
 * Let the browser download data as a JSON file.
 *
 * @param {object} data The data to store in the file.
 * @param {string} filename The suggested file name.
 * @returns {void}
 */
export function downloadJson(data, filename) {
	const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
	const link = document.createElement('a');
	link.href = URL.createObjectURL(blob);
	link.download = filename;
	link.click();
	setTimeout(() => URL.revokeObjectURL(link.href), 0);
}

/**
 * Let the player select a JSON file and read it.
 *
 * The browser only opens the file dialog shortly after a click or a key press of the player.
 *
 * @returns {Promise<*>} The parsed content of the file, or null if the player cancels the dialog.
 * @throws {Error} If the file is not JSON.
 */
export function pickJsonFile() {
	const input = Object.assign(document.createElement('input'), { type: 'file', accept: '.json,application/json' });
	const result = new Promise((resolve, reject) => {
		input.addEventListener('cancel', () => resolve(null));
		input.addEventListener('change', async () => {
			try {
				resolve(JSON.parse(await input.files[0].text()));
			} catch {
				reject(new Error('The file is not a JSON file.'));
			}
		});
	});
	input.click();
	return result;
}
