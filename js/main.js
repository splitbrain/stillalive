/**
 * Start code of the page: registers the stage element and the chrome elements. The stage element comes first, so that
 * the chrome elements find it ready for use when they connect.
 */

import { CreditsScreen } from './chrome/CreditsScreen.js';
import { GameApp } from './chrome/GameApp.js';
import { BestTimes, LevelList, LevelSelection } from './chrome/LevelSelection.js';
import { LoadingScreen } from './chrome/LoadingScreen.js';
import { MainMenu } from './chrome/MainMenu.js';
import {
	GameHud,
	IntermissionPanel,
	NarratorText,
	PauseMenu,
	PlayScreen,
	ReplayKeys,
	RobotHead,
} from './chrome/PlayScreen.js';
import { GameStage } from './stage/GameStage.js';

customElements.define('game-stage', GameStage);
customElements.define('loading-screen', LoadingScreen);
customElements.define('main-menu', MainMenu);
customElements.define('credits-screen', CreditsScreen);
customElements.define('level-list', LevelList);
customElements.define('level-selection', LevelSelection);
customElements.define('best-times', BestTimes);
customElements.define('robot-head', RobotHead);
customElements.define('narrator-text', NarratorText);
customElements.define('game-hud', GameHud);
customElements.define('replay-keys', ReplayKeys);
customElements.define('pause-menu', PauseMenu);
customElements.define('intermission-panel', IntermissionPanel);
customElements.define('play-screen', PlayScreen);
customElements.define('game-app', GameApp);
