/**
 * Start code of the page: registers the stage element and the app element.
 */

import { GameApp } from './chrome/GameApp.js';
import { GameStage } from './stage/GameStage.js';

customElements.define('game-stage', GameStage);
customElements.define('game-app', GameApp);
