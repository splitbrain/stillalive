/**
 * Start code of the page: registers the stage element and the chrome elements. The stage element comes first. The app
 * element comes last, because it creates all other elements from its template when it connects.
 */

import { BestTimes } from './chrome/elements/BestTimes.js';
import { CreditsScreen } from './chrome/elements/CreditsScreen.js';
import { EditorButtons } from './chrome/elements/EditorButtons.js';
import { EditorFileButtons } from './chrome/elements/EditorFileButtons.js';
import { EditorFiles } from './chrome/elements/EditorFiles.js';
import { GameApp } from './chrome/elements/GameApp.js';
import { GameHud } from './chrome/elements/GameHud.js';
import { IntermissionPanel } from './chrome/elements/IntermissionPanel.js';
import { LevelList } from './chrome/elements/LevelList.js';
import { LevelSelection } from './chrome/elements/LevelSelection.js';
import { LoadingScreen } from './chrome/elements/LoadingScreen.js';
import { MainMenu } from './chrome/elements/MainMenu.js';
import { NarratorText } from './chrome/elements/NarratorText.js';
import { ObjectPalette } from './chrome/elements/ObjectPalette.js';
import { PauseMenu } from './chrome/elements/PauseMenu.js';
import { ReplayKeys } from './chrome/elements/ReplayKeys.js';
import { RobotHead } from './chrome/elements/RobotHead.js';
import { SlotList } from './chrome/elements/SlotList.js';
import { TilePalette } from './chrome/elements/TilePalette.js';
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
customElements.define('tile-palette', TilePalette);
customElements.define('object-palette', ObjectPalette);
customElements.define('editor-buttons', EditorButtons);
customElements.define('slot-list', SlotList);
customElements.define('editor-file-buttons', EditorFileButtons);
customElements.define('editor-files', EditorFiles);
customElements.define('game-app', GameApp);
