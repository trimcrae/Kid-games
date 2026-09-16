// Explicit, reviewable fork. Run only when intentionally updating the house
// edition from the original. Shared content and art remain read-only assets.
const fs=require('node:fs'),path=require('node:path');
const here=__dirname, source=path.join(here,'../games/craepets');
let html=fs.readFileSync(path.join(source,'index.html'),'utf8');
html=html.replace('<head>','<head>\n  <base href="../games/craepets/">\n  <meta name="robots" content="noindex,nofollow,noarchive">');
html=html.replace(/  <link rel="stylesheet" href="https:\/\/fonts.googleapis[^\n]+\n/,'');
// The game's own script tag carries a ?v= cache version, so match it loosely
// — and fail loudly rather than silently ship an activity page that loads the
// original engine with none of the house's save plumbing.
const gameTag=/<script src="craepets\.js(?:\?[^"]*)?"><\/script>/;
if(!gameTag.test(html))throw Error('Game script tag changed');
html=html.replace(gameTag,'<script src="../../house-test/save-mode.js"></script>\n  <script src="../../house-test/save-copy.js"></script>\n  <script src="../../house-test/engine.js"></script>');
html=html.replace('</head>','<link rel="stylesheet" href="../../house-test/activity.css">\n</head>');
fs.writeFileSync(path.join(here,'activity.html'),html);
let js=fs.readFileSync(path.join(source,'craepets.js'),'utf8');
// The three save keys follow save-mode.js: the game's own keys when the house
// is opened from the game, the separate house edition's keys otherwise.
function swap(from,to){if(!js.includes(from))throw Error('Save key integration point changed: '+from);js=js.replace(from,to);}
swap('var WHO_KEY = "craepets.who";','var HOUSE_KEYS = (window.CraepetsSaveMode && window.CraepetsSaveMode.prefix) || "craepets.house.";\n  var WHO_KEY = HOUSE_KEYS + "who";');
swap('var slot = function (who) { return "craepets.v1." + who; };','var slot = function (who) { return HOUSE_KEYS + "v1." + who; };');
swap('var VOICE_KEY = "craepets.voice";','var VOICE_KEY = HOUSE_KEYS + "voice";');
const from=js.indexOf('    // round at somebody\'s house,');
const to=js.indexOf('    // once a question is answered',from);
if(from<0||to<0)throw Error('Render integration point changed');
js=js.slice(0,from)+`    g.className = "house-activity";
    var hud = $("#hud"), desk = false;
    if (hud) hud.innerHTML = "";
    // A preview belongs to the furnishing editor and family visit, not to
    // navigation. All other rooms show just their interactive activity.
    var preview = view === "home" ? sceneHtml("nest") : view === "visit" ? withSave(visit.s, function(){return sceneHtml("nest");}) : "";
    g.innerHTML = topbarHtml() + needsHtml() + preview + panelHtml();
`+js.slice(to);
const insertion=fs.readFileSync(path.join(here,'engine-bridge.inc'),'utf8');
js=js.replace('case "market": return marketHtml();','case "market": return marketHtml();\n      case "bank": return bankHtml();');
js=js.replace('return bankHtml() +', 'return \'<p><button class="ghost" data-goto="bank">🏦 Walk to the bank in the basement office</button></p>\' +');
js=js.replace('  function takePhoto() {','  function takePhoto() {\n    if (parent.houseBridge) return parent.houseBridge.photo();');
js=js.replace('  function say(text, ms, tok) {','  function say(text, ms, tok) {\n    if(parent.houseBridge)parent.houseBridge.say(text);');
js=js.replace('  function resetValley() {','  function resetValley() {\n    if(HOUSE_KEYS==="craepets.house.")localStorage.setItem("craepets.house.reset."+who,"1");');
js=js.replace('  /* A tiny hook the play-test robot uses to look inside. */',insertion+'\n  /* A tiny hook the play-test robot uses to look inside. */');
fs.writeFileSync(path.join(here,'engine.js'),'// House edition fork. See make-activity-clone.cjs; original game is unchanged.\n'+js);
