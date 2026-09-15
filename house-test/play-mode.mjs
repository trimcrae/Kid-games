// How the house was opened. From the Craepets game (?from=game) it is part of
// the game: it plays on the game's own saves (save-mode.js) and offers a way
// back. On its own it is the separate house edition with its own saves.
// (Node tests import modules that import this; they have no page address.)
export const GAME_MODE=typeof location!=='undefined'&&new URLSearchParams(location.search).get('from')==='game';
// Relative, so it works under the site's /Kid-games/ prefix and locally.
export const GAME_URL='../games/craepets/';
