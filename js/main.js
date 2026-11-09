/**
 * Start code of the page: starts the loading of the game and defines the custom elements in the order of their need.
 * The page contains all elements from the start; an element shows when it is defined. The CRT screen and the loading
 * screen come first, so the player sees the progress early. The app element comes after the stage, because it commands
 * the stage, and the other elements come last. In a group, an element comes after the elements in its markup.
 */

import { loadGame } from './loader.js';

loadGame(
	[
		{ tag: 'crt-screen', url: './chrome/elements/CrtScreen.js', name: 'CrtScreen' },
		{ tag: 'menu-button', url: './chrome/elements/MenuButton.js', name: 'MenuButton' },
		{ tag: 'loading-screen', url: './chrome/elements/LoadingScreen.js', name: 'LoadingScreen' },
	],
	[
		[{ tag: 'game-stage', url: './stage/GameStage.js', name: 'GameStage' }],
		[{ tag: 'game-app', url: './chrome/elements/GameApp.js', name: 'GameApp' }],
		[
			{ tag: 'level-list', url: './chrome/elements/LevelList.js', name: 'LevelList' },
			{ tag: 'slot-list', url: './chrome/elements/SlotList.js', name: 'SlotList' },
			{ tag: 'main-menu', url: './chrome/elements/MainMenu.js', name: 'MainMenu' },
			{ tag: 'credits-screen', url: './chrome/elements/CreditsScreen.js', name: 'CreditsScreen' },
			{ tag: 'level-selection', url: './chrome/elements/LevelSelection.js', name: 'LevelSelection' },
			{ tag: 'best-times', url: './chrome/elements/BestTimes.js', name: 'BestTimes' },
			{ tag: 'robot-head', url: './chrome/elements/RobotHead.js', name: 'RobotHead' },
			{ tag: 'narrator-text', url: './chrome/elements/NarratorText.js', name: 'NarratorText' },
			{ tag: 'game-hud', url: './chrome/elements/GameHud.js', name: 'GameHud' },
			{ tag: 'vcr-panel', url: './chrome/elements/VcrPanel.js', name: 'VcrPanel' },
			{ tag: 'vcr-display', url: './chrome/elements/VcrDisplay.js', name: 'VcrDisplay' },
			{ tag: 'pause-menu', url: './chrome/elements/PauseMenu.js', name: 'PauseMenu' },
			{ tag: 'intermission-panel', url: './chrome/elements/IntermissionPanel.js', name: 'IntermissionPanel' },
			{ tag: 'editor-palette', url: './chrome/elements/EditorPalette.js', name: 'EditorPalette' },
			{ tag: 'editor-buttons', url: './chrome/elements/EditorButtons.js', name: 'EditorButtons' },
			{ tag: 'editor-files', url: './chrome/elements/EditorFiles.js', name: 'EditorFiles' },
			{ tag: 'confirm-screen', url: './chrome/elements/ConfirmScreen.js', name: 'ConfirmScreen' },
		],
	],
);
