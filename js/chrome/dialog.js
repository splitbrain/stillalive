/**
 * Modal message dialogs.
 *
 * The game does not run while a dialog is open. A dialog closes on the release of Enter or Escape, so the release does
 * not reach the game after the dialog is closed. The key must be pressed while the dialog is open: the release of the
 * key that opened the dialog does not close it.
 */

/**
 * Show a message in a modal dialog with an OK button.
 *
 * @param {string} message The message. Line breaks start a new line.
 * @param {string} title The title of the dialog.
 * @returns {Promise<void>} Resolves when the player closes the dialog.
 */
export function alertDialog(message, title) {
	const dialog = document.createElement('dialog');
	const heading = document.createElement('h2');
	heading.textContent = title;
	const text = document.createElement('p');
	text.textContent = message;
	text.style.whiteSpace = 'pre-line';
	const buttons = document.createElement('p');
	const ok = Object.assign(document.createElement('button'), { textContent: 'OK' });
	buttons.append(ok);
	dialog.append(heading, text, buttons);
	document.body.append(dialog);

	return new Promise((resolve) => {
		const close = () => {
			dialog.close();
			dialog.remove();
			resolve();
		};
		// the key that was pressed while the dialog is open, so the release of an earlier press does not close it
		let pressed = null;
		ok.addEventListener('click', close);
		dialog.addEventListener('keydown', (event) => {
			if (event.key === 'Enter' || event.key === 'Escape') {
				event.preventDefault();
				pressed = event.key;
			}
		});
		dialog.addEventListener('keyup', (event) => {
			if (event.key === pressed) {
				event.stopPropagation();
				close();
			}
		});

		dialog.showModal();
		ok.focus();
	});
}
