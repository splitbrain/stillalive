/**
 * Start code of the page. It loads the game and defines the custom elements in the order of their need. The page
 * contains all elements from the start, and an element shows when it is defined. The CRT and the element of the
 * loading screen come first, so the player sees the progress early. The root element uses the stage, so it comes after
 * the stage. In a group, an element comes after the elements in its markup.
 */

import { loadGame } from './loader.js';

loadGame(
	[
		{ tag: 'ui-crt', url: './ui/elements/Crt.js', name: 'Crt' },
		{ tag: 'ui-button', url: './ui/elements/Button.js', name: 'Button' },
		{ tag: 'ui-loading', url: './ui/elements/Loading.js', name: 'Loading' },
	],
	[
		[{ tag: 'game-stage', url: './stage/GameStage.js', name: 'GameStage' }],
		[{ tag: 'ui-root', url: './ui/elements/Root.js', name: 'Root' }],
		[
			{ tag: 'ui-level-list', url: './ui/elements/LevelList.js', name: 'LevelList' },
			{ tag: 'ui-slot-list', url: './ui/elements/SlotList.js', name: 'SlotList' },
			{ tag: 'ui-main-menu', url: './ui/elements/MainMenu.js', name: 'MainMenu' },
			{ tag: 'ui-credits', url: './ui/elements/Credits.js', name: 'Credits' },
			{ tag: 'ui-level-selection', url: './ui/elements/LevelSelection.js', name: 'LevelSelection' },
			{ tag: 'ui-robot-head', url: './ui/elements/RobotHead.js', name: 'RobotHead' },
			{ tag: 'ui-narrator-text', url: './ui/elements/NarratorText.js', name: 'NarratorText' },
			{ tag: 'ui-hud', url: './ui/elements/Hud.js', name: 'Hud' },
			{ tag: 'ui-vcr-panel', url: './ui/elements/VcrPanel.js', name: 'VcrPanel' },
			{ tag: 'ui-vcr-display', url: './ui/elements/VcrDisplay.js', name: 'VcrDisplay' },
			{ tag: 'ui-pause-menu', url: './ui/elements/PauseMenu.js', name: 'PauseMenu' },
			{ tag: 'ui-intermission', url: './ui/elements/Intermission.js', name: 'Intermission' },
			{ tag: 'ui-editor-palette', url: './ui/elements/EditorPalette.js', name: 'EditorPalette' },
			{ tag: 'ui-editor-buttons', url: './ui/elements/EditorButtons.js', name: 'EditorButtons' },
			{ tag: 'ui-editor-files', url: './ui/elements/EditorFiles.js', name: 'EditorFiles' },
			{ tag: 'ui-confirm', url: './ui/elements/Confirm.js', name: 'Confirm' },
		],
	],
);
