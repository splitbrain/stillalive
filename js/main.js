/**
 * Start code of the page: registers the stage element and the chrome elements. The stage element comes first, so that
 * the chrome elements find it ready for use when they connect.
 */

import { CreditsScreen } from './chrome/CreditsScreen.js';
import { GameApp } from './chrome/GameApp.js';
import { LoadingScreen } from './chrome/LoadingScreen.js';
import { MainMenu } from './chrome/MainMenu.js';
import { GameStage } from './stage/GameStage.js';

customElements.define('game-stage', GameStage);
customElements.define('loading-screen', LoadingScreen);
customElements.define('main-menu', MainMenu);
customElements.define('credits-screen', CreditsScreen);
customElements.define('game-app', GameApp);
