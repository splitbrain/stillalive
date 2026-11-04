/**
 * Start code of the page: registers the stage element and starts the page around it.
 */

import { startPage } from './chrome/tempPage.js';
import { GameStage } from './stage/GameStage.js';

customElements.define('game-stage', GameStage);
startPage();
