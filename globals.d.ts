/**
 * The properties of the browser globals that the game and the tests add or that the DOM library of TypeScript does
 * not know.
 */

interface Window {
	/** The access of the tests to the stage, set by the stage when the URL contains "?test". */
	__test: import('./js/stage/GameStage.js').TestHook;
	/** The ready value of the loader, set by the tests to wait for the end of the loading. */
	__loaded: import('./js/value.js').Value<boolean>;
	/** The player object of the level run that the tests remember. */
	__rememberedLevelRun: import('./js/stage/entities/Player.js').Player;
}

interface Navigator {
	/** The Keyboard API, which only some browsers have. */
	keyboard?: {
		/** Get the labels of the keys of the keyboard layout of the player, by key code. */
		getLayoutMap?: () => Promise<Map<string, string>>;
	};
}
