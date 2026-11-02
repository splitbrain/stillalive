/**
 * Modal message dialogs.
 *
 * The game does not run while a dialog is open. A dialog closes on the release of Enter or Escape, so the release does
 * not reach the game after the dialog is closed.
 */

/** @type {number} The number of open dialogs. */
let openDialogs = 0;

/**
 * Show a modal dialog.
 *
 * @param {string} message The message. Line breaks start a new line.
 * @param {string} title The title of the dialog.
 * @param {boolean} withCancel True to show a Cancel button next to the OK button.
 * @returns {Promise<boolean>} True if the player chose OK, false if the player chose Cancel or pressed Escape.
 */
function showDialog(message, title, withCancel) {
	const dialog = document.createElement('dialog');
	dialog.className = 'message';
	const heading = document.createElement('h2');
	heading.textContent = title;
	const text = document.createElement('p');
	text.textContent = message;
	const buttons = document.createElement('p');
	buttons.className = 'buttons';
	const ok = Object.assign(document.createElement('button'), { textContent: 'OK' });
	const cancel = Object.assign(document.createElement('button'), { textContent: 'Cancel' });
	buttons.append(ok);
	if (withCancel) buttons.append(cancel);
	dialog.append(heading, text, buttons);
	document.body.append(dialog);

	return new Promise((resolve) => {
		const close = (result) => {
			dialog.close();
			dialog.remove();
			openDialogs--;
			resolve(result);
		};
		ok.addEventListener('click', () => close(true));
		cancel.addEventListener('click', () => close(false));
		dialog.addEventListener('keydown', (event) => {
			if (event.key === 'Enter' || event.key === 'Escape') event.preventDefault();
		});
		dialog.addEventListener('keyup', (event) => {
			if (event.key === 'Enter') {
				event.stopPropagation();
				(document.activeElement === cancel ? cancel : ok).click();
			} else if (event.key === 'Escape') {
				event.stopPropagation();
				close(false);
			}
		});

		openDialogs++;
		dialog.showModal();
		ok.focus();
	});
}

/**
 * Show a message.
 *
 * @param {string} message The message. Line breaks start a new line.
 * @param {string} title The title of the dialog.
 * @returns {Promise<void>} Resolves when the player closes the dialog.
 */
export async function alertDialog(message, title) {
	await showDialog(message, title, false);
}

/**
 * Ask the player a question.
 *
 * @param {string} message The question. Line breaks start a new line.
 * @param {string} title The title of the dialog.
 * @returns {Promise<boolean>} True if the player chose OK.
 */
export function confirmDialog(message, title) {
	return showDialog(message, title, true);
}

/**
 * Check if a dialog is open.
 *
 * @returns {boolean} True while a dialog is open.
 */
export function isDialogOpen() {
	return openDialogs > 0;
}
