/* ===========================================================
   Word Wizard — PIXEL-ART PICTURES
   -----------------------------------------------------------
   Every clue gets a hand-authored pixel-art picture instead of an
   emoji, matching the look of the other arcade games. Each picture
   is a text grid rendered to crisp inline SVG <rect> "pixels" via
   the shared PX helper (assets/js/pixelsvg.js) — no image files.

   Grid is 16×16, drawn into a viewBox="0 0 64 64" (pixel = 4 units).
   Exposed as the global WordArt object:  WordArt.draw("dragon")
   returns an <svg> string (or "" if that word has no picture yet).

   Load AFTER pixelsvg.js and BEFORE word-wizard.js.
   =========================================================== */
window.WordArt = (function () {
  "use strict";

  /* A generous shared palette — single-char keys used across every
     sprite. Per-sprite palettes are merged on top when a word needs
     a colour the base set doesn't cover. "." / " " are transparent. */
  var BASE = {
    ".": null, " ": null,
    k: "#2b2440",   // dark outline
    w: "#ffffff", W: "#dfe6f0",
    r: "#ff5b5b", R: "#c8385a",
    o: "#ff9f43", O: "#e67e22",
    y: "#ffd166", Y: "#f4b400",
    g: "#46c46a", G: "#2e9e4f", e: "#1f7a43",
    b: "#4ea3ff", B: "#2e6fd6",
    c: "#7ce0e0", C: "#39b8c8",
    p: "#a06cff", P: "#7a4ad6",
    m: "#ff7bc5", M: "#e0489f",
    n: "#b07a47", N: "#7d5230",
    a: "#b8bfcc", A: "#8b94a8", d: "#5b6273",
    s: "#bfe9ff", t: "#1ec8c8", f: "#ff6a00", i: "#3a2c52",
  };

  function svg(rows, extra) {
    var pal = extra ? Object.assign({}, BASE, extra) : BASE;
    var inner = PX.sprite(rows, pal, { u: 4, cx: 32, cy: 32 });
    return (
      '<svg viewBox="0 0 64 64" width="100%" height="100%" ' +
      'preserveAspectRatio="xMidYMid meet" ' +
      'style="image-rendering:pixelated;max-height:100%;">' +
      inner + "</svg>"
    );
  }

  /* ---- the pictures (one per word) ---- */
  var ART = {

    /* ===== Animal Spells ===== */
    leopard: function () { return svg([
      "................",
      "...k........k...",
      "..kok......kok..",
      "..koyk....kyok..",
      "...kyyyyyyyyk...",
      "..kyyyyyyyyyyk..",
      ".kyNyyyyyyyyNyk.",
      ".kybbyyyyyybbyk.",
      ".kyyyyyyyyyyyyk.",
      ".kyNyywwwwyyNyk.",
      ".kyyyyymmyyyyyk.",
      "..kyyNyyyyNyyk..",
      "...kyyyyyyyyk...",
      "....kyyyyyyk....",
      ".....kkkkkk.....",
      "................",
    ], { N: "#5b3a1c", w: "#fff8e6" }); },

    penguin: function () { return svg([
      "......kkkk......",
      ".....kkkkkk.....",
      "....kkwwwwkk....",
      "....kwkwwkwk....",
      "....kwwooww k...",
      "....kkwooww kk..",
      "...kkwwwwwwwkk..",
      "..kkwwwwwwwwwkk.",
      "..kwwwwwwwwwww k",
      "..kwwwwwwwwwwwk.",
      "..kwwwwwwwwwwk..",
      "...kwwwwwwwwk...",
      "...kkwwwwwwkk...",
      "....kkwwwwkk....",
      "....oo.kk.oo....",
      "...ooo....ooo...",
    ], {}); },

    squirrel: function () { return svg([
      "................",
      "..........nNNn..",
      ".........nNNNNn.",
      "........nNN..NNn",
      "...kk...nN...nNn",
      "..knnk..nN...nNn",
      "..knwk.nN...nNn.",
      "..knnnnnN..nNn..",
      "..knnnNNN.nNn...",
      "..nnnnNNNnNn....",
      ".nNnnNNNNNn.....",
      ".nNNNNNNNn......",
      ".nNNNNNNn.......",
      ".nNN.NNn........",
      ".nn...nn........",
      "................",
    ], {}); },

    flamingo: function () { return svg([
      "..........mmm...",
      ".........mMMMm..",
      ".........mMkMm..",
      "..........MMfm..",   // beak f
      ".........mMM....",
      "........mMm.....",
      ".......mMm......",
      "......mMm.......",
      ".....mMm........",
      ".....mMm........",
      ".....mMm........",
      ".....mMm........",
      "....mmMmm.......",
      ".....kk.kk......",
      ".....k...k......",
      ".....k...k......",
    ], {}); },

    elephant: function () { return svg([
      "................",
      ".AA........AA...",
      "AaaaA....AaaaaA.",
      "AaaaaA..AaaaaaA.",
      "AaaaaaAAAAaaaaA.",
      "AaaaaaaaaaaaaaA.",
      "AaakaaaaaaakaaA.",
      "AaaaaaaaaaaaaaA.",
      ".AaaaaaaaaaaaA..",
      ".AaaaaAAaaaaaA..",
      "..AaaaAAaaaaA...",
      "...aaaAAaaaa....",
      "......AAa.......",
      ".ww...aAA..ww...",
      "......aAa.......",
      "................",
    ], {}); },

    hedgehog: function () { return svg([
      "................",
      "....k.k.k.......",
      "...kNkNkNk......",
      "..kNkNkNkNk.....",
      "..kNNNNNNNNk....",
      ".kNkNkNkNNNk....",
      ".kNNNNNNNNnnk...",
      "kNkNkNkNNnnnnk..",
      "kNNNNNNnnnwnnk..",   // face + eye w
      "kNkNkNnnnnnknk..",   // nose k
      ".kNNNnnnnnkkk...",
      ".kkNnnnnnnk.....",
      "...knnnnnk......",
      "...k.kk.k.......",   // feet
      "................",
      "................",
    ], {}); },

    /* ===== Nature Spells ===== */
    volcano: function () { return svg([
      "......f..f......",
      ".....f.ff.f.....",
      "....f.frf.f.....",
      ".....ffrff......",
      "......frf.......",
      "......krk.......",
      ".....kArAk......",
      ".....kArAk......",
      "....kAArAAk.....",
      "....kAAfAAk.....",
      "...kAAfffAAk....",
      "...kAfffffAk....",
      "..kAAfffffAAk...",
      "..kAAAAAAAAAk...",
      ".kAAAAAAAAAAAk..",
      ".kkkkkkkkkkkkk..",
    ], { f: "#ff6a00", r: "#ffd166" }); },

    iceberg: function () { return svg([
      "................",
      "......ss........",
      ".....swws.......",
      "....swwwws......",
      "...swwwwwws.....",
      "..swwwwwwwws....",
      ".sssssssssss s..",
      "bbbsbbsbbsbbbb..",   // water line
      ".bcbccbccbcbcb..",
      "..bccccccccb b..",
      "..ccccccccccb...",
      "...ccccccccc....",
      "...cccccccc.....",
      "....cccccc......",
      ".....cccc.......",
      "................",
    ], {}); },

    tornado: function () { return svg([
      "..aaaaaaaaaa....",
      "..AAAAAAAAAA....",
      "...aaaaaaaa.....",
      "....AAAAAA......",
      "...aaaaaaaa.....",
      "....AAAAAA......",
      ".....aaaa.......",
      "....AAAAAA......",
      ".....aaaa.......",
      "......AA........",
      ".....aaaa.......",
      "......AA........",
      ".......a........",
      "......AA........",
      ".......a........",
      "......nnn.......",   // dust
    ], {}); },

    waterfall: function () { return svg([
      "..aaa......aaa..",
      ".aAAAa....aAAAa.",
      ".aAAAa....aAAAa.",
      ".aAAAbbbbbbAAAa.",
      ".aAAbsbsbsbAAa..",
      ".aAAbsbsbsbAAa..",
      "..a.bsbsbsb.a...",
      "....bsbsbsb.....",
      "....bsbsbsb.....",
      "....bsbsbsb.....",
      "....bsbsbsb.....",
      "...bbsbsbsbb....",
      "..bbsbwbwsbbb...",
      ".bbswbwbwbwsbb..",
      "bbbbbbbbbbbbbbb.",
      ".bbsbbsbbsbbsb..",
    ], {}); },

    glacier: function () { return svg([
      "................",
      "...s....ss......",
      "..sws...sws.....",
      ".swcws.swwcs....",
      "swccwwsswccws...",
      "swccccwwccccws..",
      "scccccccccccc s.",
      "scccccccccccccs.",
      "scccscccscccc s.",
      "sccccccccccccs..",
      ".sccccccccccs...",
      ".bbbbbbbbbbbb b.",
      "bbsbbsbbsbbsbbb.",
      ".bbbsbbsbbsbbb..",
      "bbbbbbbbbbbbbb..",
      "................",
    ], {}); },

    canyon: function () { return svg([
      "ssssssssssssss..",
      "ssssssssssssss..",
      "nnnnnn..nnnnnn..",
      "NNNNNn..nNNNNN..",
      "ooooon..nooooo..",
      "nnnnn....nnnnn..",
      "NNNNn....nNNNN..",
      "ooon......nooo..",
      "nnn........nnn..",
      "NNn..bbbb..nNN..",   // river
      "oon.bbbbbb.noo..",
      "nn.bbbbbbbb.nn..",
      "n.bbbbbbbbbb.n..",
      ".bbbbbbbbbbbb...",
      "bbbbbbbbbbbbbb..",
      "................",
    ], {}); },

    /* ===== Castle Spells ===== */
    dragon: function () { return svg([
      "................",
      "...k...k...k....",   // horn tips
      "..kgk.kgk.kgk...",   // spikes
      "..kggkkggkkggk..",
      ".kgggggggggggk..",   // head top
      ".kgggggggggggk..",
      ".kggwkgggggggk..",   // eye w
      ".kgggggggg.ff...",   // mouth opens, fire
      ".kgggggggGfOf...",
      ".kggggggGk.ff...",   // lower jaw
      ".kgggggGk.......",
      "..kggggk........",
      "..kgggk.........",
      "...kgk..........",   // neck
      "...kk...........",
      "................",
    ], { f: "#ff6a00", O: "#ffd166" }); },

    castle: function () { return svg([
      "k.k..k.k..k.k...",
      "kak.kak.kak.kak.",
      "kaak.kaak.kaak..",   // flag area simplified
      "kaaaaaaaaaaaak..",
      "kaaaaaaaaaaaak..",
      "kaabbaaaabbaak..",   // windows
      "kaaBBaaaaBBaak..",
      "kaaaakaaakaaak..",
      "kaaaakwwkaaaak..",   // gate
      "kaaaawwwwaaaak..",
      "kaaaawwwwaaaak..",
      "kaaaawwwwaaaak..",
      "kaaaawwwwaaaak..",
      "kkkkkkkkkkkkkk..",
      "nnnnnnnnnnnnnn..",
      "................",
    ], {}); },

    wizard: function () { return svg([
      ".......p........",
      "......pPp.......",
      ".....pPyPp......",   // star on hat
      "....pPPPPPp.....",
      "...pPPPwPPPp....",
      "..pPPPPPPPPPp...",
      ".pPPPPPPPPPPPp..",
      "...wwwwwwww.....",   // face
      "..wwsswssww w...",   // eyes
      "..wwwwwwwwww....",
      "...WWWWWWWW.....",   // beard
      "...WWWWWWWW.....",
      "....WWWWWW......",
      ".....WWWW.......",
      "......WW........",
      "................",
    ], {}); },

    knight: function () { return svg([
      "......rr........",
      ".....rrr........",
      "....rraaar......",
      "...aaaaaaaa.....",
      "..aaaaaaaaaa....",
      "..aaaaaaaaaa....",
      "..akkkkkkkka....",   // visor slit
      "..aaaaaaaaaa....",
      "..aaaaaaaaaa....",
      "..aakkaakkaa....",   // breathing holes
      "..aaaaaaaaaa....",
      "..aaaaaaaaaa....",
      "...aaaaaaaa.....",
      "....aAAAAa......",
      "....AAAAAA......",
      "................",
    ], {}); },

    shield: function () { return svg([
      "..kkkkkkkkkk....",
      ".kbbbbbbbbbbk...",
      ".kbbbbwwbbbbk...",
      ".kbbbbwwbbbbk...",
      ".kbwwwwwwwwbk...",
      ".kbwwwwwwwwbk...",
      ".kbbbbwwbbbbk...",
      ".kbbbbwwbbbbk...",
      ".kbbbbwwbbbbk...",
      "..kbbbwwbbbk....",
      "..kbbbbbbbbk....",
      "...kbbbbbbk.....",
      "....kbbbbk......",
      ".....kbbk.......",
      "......kk........",
      "................",
    ], {}); },

    goblet: function () { return svg([
      "................",
      ".kyyyyyyyyyyk...",
      ".kyYYYYYYYYyk...",
      ".kyYrrrrrrYyk...",   // wine r
      ".kyYrrrrrrYyk...",
      "..kyYYYYYYyk....",
      "...kyYYYYyk.....",
      "....kyYYyk......",
      ".....kyyk.......",
      ".....kyyk.......",
      ".....kyyk.......",
      "....kyyyyk......",
      "...kyYYYYyk.....",
      "..kyyyyyyyyk....",
      "..kkkkkkkkkk....",
      "................",
    ], {}); },

    /* ===== Space Spells ===== */
    comet: function () { return svg([
      "...............s",
      ".............ss.",
      "...........bss..",
      ".........bcss...",
      "........bcs.....",
      ".......ywy......",   // head
      "......ywwwy.....",
      "....b.ywwwy.....",
      "...bc.yywy......",
      "..bcs..y........",
      ".bcs............",
      "bcs.............",
      "cs..............",
      "s...............",
      "................",
      "................",
    ], { y: "#ffe066", w: "#fff6c0" }); },

    planet: function () { return svg([
      "................",
      ".......bBBb.....",
      ".....bBBBBBBb...",
      "....bBBBBBBBBb..",
      "...bBBBBBBBBBb..",
      "yy.bBBBBBBBBBb.y",   // ring tips behind
      ".yybBBBBBBBBbyy.",
      "...yyyyyyyyyy...",   // ring crosses in front
      "...bBBBBBBBBBb..",
      "...bBBBBBBBBBb..",
      "....bBBBBBBBb...",
      ".....bBBBBBb....",
      ".......bb.......",
      "................",
      "................",
      "................",
    ], { y: "#ffd166" }); },

    rocket: function () { return svg([
      "......ww........",
      ".....wwww.......",
      ".....wrrw.......",
      "....wwrrww......",
      "....wbbbbw......",   // window
      "....wbssbw......",
      "....wwwwww......",
      "....wrwwrw......",
      "...wwrwwrww.....",
      "..rw.wwww.wr....",   // fins
      ".rrw.wwww.wrr...",
      ".rr...ww...rr...",
      "......ff........",
      ".....ffrf.......",
      "......frf.......",
      ".......f........",
    ], { r: "#ff5b5b", f: "#ff9f43" }); },

    galaxy: function () { return svg([
      "................",
      ".....ppppp......",
      "...ppPPPPPpp....",
      "..pPPwwwwPPp w..",
      ".pPPwwmmwwPPp...",
      ".pPwwmMMmwwPp...",
      ".pPwmMyyMmwPp...",   // bright core
      ".pPwmMyyMmwPp...",
      ".pPwwmMMmwwPp...",
      ".pPPwwmmwwPP....",
      "w.pPPwwwwPPp....",
      "..ppPPPPPpp.....",
      "....ppppp.....w.",
      "................",
      "..w..........w..",
      "................",
    ], { y: "#fff3b0" }); },

    asteroid: function () { return svg([
      "................",
      "......AAAA......",
      "....AAaaaaAA....",
      "...AaaadaaaaA...",   // craters d
      "..AaadaaaaaaA...",
      "..AaaaaaadaaA...",
      ".AaadaaaaaaaaA..",
      ".AaaaaaaaadaaA..",
      ".AaaaadaaaaaaA..",
      ".AaaaaaaaaaaA...",
      "..AaadaaaadaA...",
      "..AAaaaaaaAA....",
      "....AAaaAA......",
      "......AA........",
      "................",
      "................",
    ], {}); },

    telescope: function () { return svg([
      "............ww..",
      "...........wbw..",
      "..........wbbw..",
      ".........wbbw...",
      "........aab w...",
      ".......aaab.....",
      "......aaab......",
      ".....aaab.......",
      "....aaab........",
      "...aaab.........",
      "...aab..........",
      "..yyy...........",   // stand
      "..y.y...........",
      ".yy.yy..........",
      "yy...yy.........",
      "................",
    ], { y: "#b07a47" }); },

    /* ===== Ocean Spells ===== */
    dolphin: function () { return svg([
      "................",
      "................",
      "......bb........",   // dorsal fin
      ".....bbbb.......",
      "...bbbbbbb......",
      "..bbbbbbbbb...bb",   // back + top tail fluke
      ".bbbbbbbbbbb.bbb",
      "bbwbbbbbbbbbbbbb",   // snout + eye + tail stalk
      ".bbbbbbbbbbb.bbb",
      "..bbbbbbbbb...bb",   // belly + bottom tail fluke
      "...bbbbbbb......",
      ".....bbbb.......",
      "................",
      "................",
      "................",
      "................",
    ], { b: "#3d8be0" }); },

    octopus: function () { return svg([
      ".....pppp.......",
      "...ppPPPPpp.....",
      "..pPPPPPPPPp....",
      "..pPwwPPwwPp....",   // eyes
      "..pPkwPPwkPp....",
      "..pPPPPPPPPp....",
      "..pPPPPPPPPp....",
      "..pPPPPPPPPp....",
      ".pPpPpPpPpPp....",
      "pPp.p.p.p.pPp...",   // legs
      "Pp.p.p.p.p.pP...",
      "p..p.p.p.p..p...",
      "..p..p.p..p.....",
      ".p...p..p..p....",
      "................",
      "................",
    ], {}); },

    seahorse: function () { return svg([
      "....kkk.........",   // crest
      "...yyyyy........",
      "..yYkYYYy.......",   // eye
      ".ffYYYYYy.......",   // snout f
      "..yYYYYy........",
      "...yYYYy........",
      "....yYYYy.......",
      ".....yYYYy......",
      "......yYYy......",
      ".....yYYy.......",
      "....yYYy........",
      "...yYYy.........",
      "...yYYYy........",
      "....yYYy........",   // curled tail
      ".....yYy........",
      "......y.........",
    ], { y: "#ffb347", Y: "#e6932a", f: "#ff7bc5" }); },

    anchor: function () { return svg([
      "......kk........",
      ".....kwwk.......",
      ".....kwwk.......",
      "......kk........",
      "...kkkkkkkk.....",   // crossbar
      "......kk........",
      "......kk........",
      "......kk........",
      "......kk........",
      "..k...kk...k....",
      ".kk...kk...kk...",
      ".kk...kk...kk...",
      "..kk..kk..kk....",
      "...kkkkkkkk.....",
      ".....kkkk.......",
      "................",
    ], {}); },

    jellyfish: function () { return svg([
      "................",
      ".....mmmm.......",
      "...mmMMMMmm.....",
      "..mMMMMMMMMm....",
      ".mMMwwMMwwMMm...",   // spots
      ".mMMMMMMMMMMm...",
      ".mMMMMMMMMMMm...",
      ".mmMMMMMMMMmm...",
      "..m.m.m.m.m.....",
      "..m.m.m.m.m.....",
      ".m..m.m.m..m....",   // tentacles
      ".m.m...m.m.m....",
      "..m.m.m...m.....",
      "...m.m.m.m......",
      "....m..m.m......",
      "................",
    ], {}); },

    lighthouse: function () { return svg([
      "......yy........",
      "...y.ywwy.y.....",   // light beams
      "....ywwwwy......",
      "...kkrwwrkk.....",
      "...kwwwwwwk.....",
      "....rwwwwr......",
      "....wwwwww......",
      "....rrrrrr......",
      "...wwwwwwww.....",
      "...rrrrrrrr.....",
      "...wwwwwwww.....",
      "..rrrrrrrrrr....",
      "..wwwwwwwwww....",
      "..rrrrrrrrrr....",
      ".kkkkkkkkkkkk...",
      "................",
    ], { r: "#ff5b5b" }); },

    /* ===== Garden Spells ===== */
    ladybug: function () { return svg([
      "................",
      "......kkkk......",
      ".....kkkkkk.....",
      "....kwk..kwk....",   // antennae dots
      "...rrrkkrrr.....",
      "..rrrrkkrrrr....",
      "..rkrrkkrrkr....",   // spots k
      ".rrrrrkkrrrrr...",
      ".rkrrrkkrrrkr...",
      ".rrrrrkkrrrrr...",
      ".rrkrrkkrrkrr...",
      "..rrrrkkrrrr....",
      "..rrrrkkrrrr....",
      "...rrrkkrrr.....",
      "....rrrrrr......",
      "................",
    ], { r: "#ff3b3b" }); },

    beetle: function () { return svg([
      "......kk........",
      ".....kwwk.......",   // head
      "....kgggk.......",
      "...kgGGGgk......",
      "..kgGGGGGgk.....",
      "..kgGkkGgk......",
      ".kgGGkkGGgk.....",
      ".kgGGkkGGgk.....",
      ".kgGGkkGGgk.....",
      ".kgGGkkGGgk.....",
      "..kgGGGGgk......",
      "..kkgggggk......",
      ".k..kkkk..k.....",   // legs
      "k...k..k...k....",
      "................",
      "................",
    ], { g: "#46c46a", G: "#2e8b57" }); },

    spider: function () { return svg([
      "................",
      "k...........k...",
      ".k.........k....",
      "..k.kkkk..k.....",   // legs + body
      ".k.kwkkwk.k.....",   // eyes
      "k.kkkkkkkk.k....",
      ".k.kkkkkk.k.....",
      "..k.kkkk.k......",
      ".k........k.....",
      "k..........k....",
      "................",
      ".......k........",
      "......k.........",
      ".....k..........",
      "................",
      "................",
    ], {}); },

    caterpillar: function () { return svg([
      "................",
      "..k.k...........",
      "...g g..........",   // antennae
      "..ggGgg.........",
      ".ggGwGggGg......",   // head + body
      ".gGGkGGGGGgGg...",
      ".ggGGgggGGgGGg..",
      "..gg..ggg..gggg.",
      "..........gggg..",
      "...gg...gg......",   // legs
      "..g.g..g.g..gg..",
      "................",
      "................",
      "................",
      "................",
      "................",
    ], { g: "#7ed957", G: "#46c46a" }); },

    dragonfly: function () { return svg([
      "......kk........",
      "ccc..kwwk..ccc..",   // wings + head
      "cccc.kggk.cccc..",
      ".ccccgGGgcccc...",
      "..cc.kggk.cc....",
      "ccc..gGGg..ccc..",
      "cccc.gGGg.cccc..",
      ".ccc.kggk.ccc...",
      ".....gGGg.......",
      "......gg........",   // long body
      "......gg........",
      "......GG........",
      "......gg........",
      "......GG........",
      "......gg........",
      "................",
    ], { c: "#9be7ff", g: "#46c46a", G: "#2e8b57" }); },

    mushroom: function () { return svg([
      "................",
      "....rrrrrr......",
      "..rrrrrrrrrr....",
      ".rrwrrrrrwrr r..",   // white spots
      ".rrrrrwrrrrrr...",
      "rrwrrrrrrrwrrr..",
      "rrrrrwrrrrrrrr..",
      "rrrrrrrrrwrrrr..",
      ".rrrrrrrrrrrr...",
      "...wwwwwwww.....",   // stalk
      "...wWwwwwWw.....",
      "...wwwwwwww.....",
      "...wWwwwwWw.....",
      "...wwwwwwww.....",
      "..wwwwwwwwww....",
      "................",
    ], { r: "#ff4d4d" }); },

    /* ===== Music Spells ===== */
    trumpet: function () { return svg([
      "................",
      "..............yy",
      "............yyYy",
      "...........yYYYy",
      "..yyyyyyyyyyYYYy",
      ".yYyyyyyyyyyYYY.",
      "yYYYYYYYYYYyYy..",
      ".yYyyyyyyyyyy....",
      "..yyyyyyyyyy.....",
      "....yk.yk.yk.....",   // valves
      "....yk.yk.yk.....",
      "................",
      "................",
      "................",
      "................",
      "................",
    ], { y: "#ffcf33", Y: "#e6a700" }); },

    guitar: function () { return svg([
      ".........kk.....",
      ".........kwk....",   // headstock
      ".........kkk....",
      "........kkk.....",
      ".......nnk......",   // neck
      "......nnk.......",
      ".....nnk........",
      "...nnnNn........",
      "..nNNNkNNn......",   // body + sound hole
      ".nNNNkkkNNn.....",
      ".nNNNkkkNNn.....",
      ".nNNNkkkNNn.....",
      ".nNNNNNNNNn.....",
      "..nNNNNNNn......",
      "...nnnnnn.......",
      "................",
    ], {}); },

    violin: function () { return svg([
      "......kk........",
      ".....kwwk.......",   // scroll + pegbox
      ".....kkkk.......",
      "......nn........",
      "......nn........",   // neck
      ".....nNNn.......",   // upper bout
      "....nNNNNn......",
      "...nNNkkNNn.....",   // f-holes
      "....nNkkNn......",   // waist
      "....nNkkNn......",
      "...nNNkkNNn.....",
      "..nNNNNNNNNn....",   // lower bout
      "..nNNNNNNNNn....",
      "...nNNNNNNn.....",
      "....nnnnnn......",
      "................",
    ], {}); },

    drum: function () { return svg([
      "..k..........k..",   // crossed sticks
      "...k........k...",
      "....k......k....",
      ".....k....k.....",
      "...wwwwwwwwww...",   // drumhead
      "..wWWWWWWWWWWw..",
      "..wWWWWWWWWWWw..",
      "..aaaaaaaaaaaa..",   // silver rim
      "..akakakakakaa..",   // tension rods
      "..arrrrrrrrra...",   // red stripe
      "..arrrrrrrrra...",
      "..akakakakakaa..",
      "..aaaaaaaaaaaa..",
      "...wwwwwwwwww...",
      "................",
      "................",
    ], { r: "#ff5b5b" }); },

    piano: function () { return svg([
      "kkkkkkkkkkkkkk..",
      "kwwwwwwwwwwwwk..",
      "kwkwkwwkwkwkwk..",   // black keys
      "kwkwkwwkwkwkwk..",
      "kwkwkwwkwkwkwk..",
      "kwwwwwwwwwwwwk..",
      "kwwwwwwwwwwwwk..",
      "kw.w.w.w.w.w.k..",
      "kw.w.w.w.w.w.k..",
      "kwwwwwwwwwwwwk..",
      "kkkkkkkkkkkkkk..",
      "k............k..",
      "k............k..",
      "kkkkkkkkkkkkkk..",
      ".k..........k...",
      "................",
    ], {}); },

    harp: function () { return svg([
      ".kkkkkkkk.......",
      ".kyyyyyyk.......",
      ".ky....wyk......",
      ".ky...w.yk......",
      ".ky..w..yk......",
      ".ky.w...yk......",
      ".kyw....yk......",
      ".kyw...wyk......",
      ".kyw..w.yk......",
      ".kyw.w..yk......",
      ".kyww...yk......",
      ".kyw....yk......",
      ".kkyyyyykk......",
      "...kyyyk........",
      "....kkk.........",
      "................",
    ], { y: "#ffcf33", w: "#fff6c0" }); },

    /* ===== Master Spells ===== */
    treasure: function () { return svg([
      "................",
      "..nnnnnnnnnn....",
      ".nNyyyyyyyyNn...",   // gold lid
      ".nyYyYyYyYyYn...",
      ".nNNNNNNNNNNn...",
      "nnnnnnnnnnnnnn..",
      "nyyyyyyyyyyyyn..",   // jewels row
      "nymyrybycygyrn..",
      "nNNNNkNkNNNNNn..",   // lock
      "nnnnnkkknnnnnn..",
      "nNNNNkkkNNNNNn..",
      "nyyyyyyyyyyyyn..",
      "nNNNNNNNNNNNNn..",
      "nnnnnnnnnnnnnn..",
      "................",
      "................",
    ], { y: "#ffd23f", Y: "#ffe680" }); },

    compass: function () { return svg([
      "................",
      "....aaaaaa......",
      "..aaWWWWWWaa....",
      ".aWWwwwwwwWWa...",
      ".aWwwwrwwwwWa...",   // N needle r
      "aWwwwrrwwwwWWa..",
      "aWwwwwrwwwwwWa..",
      "aWwwwwkwwwwwWa..",   // center
      "aWwwwwbwwwwwWa..",
      "aWwwwwbbwwwwWa..",   // S needle b
      ".aWwwwbwwwwWa...",
      ".aWWwwwwwwWWa...",
      "..aaWWWWWWaa....",
      "....aaaaaa......",
      "................",
      "................",
    ], { r: "#ff5b5b" }); },

    pyramid: function () { return svg([
      "ssssssssssssss..",
      "ssssssssssssss..",
      "ssssssyysssss s.",   // sun
      "ssssssyysssssss.",
      "......yy........",
      ".....yYYn.......",
      ".....yYNNn......",
      "....yYYNNNn.....",
      "....yYYNNNNn....",
      "...yYYNNNNNNn...",
      "..yYYNNNNNNNNn..",
      ".yYYNNNNNNNNNNn.",
      "yYYNNNNNNNNNNNn.",
      "nnnnnnnnnnnnnn..",
      "oooooooooooooo..",   // sand
      "................",
    ], { y: "#ffd23f", Y: "#ffe199", o: "#e6c27a" }); },

    dinosaur: function () { return svg([
      "................",
      "............ggg.",
      "...........gGGg.",
      "..........gGwGg.",   // eye
      "..........gGGGg.",
      "...........ggg..",
      "..........gGg...",
      ".g........gGg...",
      "gGg......gGGg...",   // tail + body
      "gGGggggggGGGg...",
      "gGGGGGGGGGGGg...",
      ".gGGGGGGGGGg....",
      "..gGg...gGg.....",   // legs
      "..gGg...gGg.....",
      "..gg.....gg.....",
      "................",
    ], { g: "#5fbf5f", G: "#3d9e3d" }); },

    umbrella: function () { return svg([
      ".......k........",
      ".....rrrrrr.....",
      "...rrRrrrRrr....",
      "..rRrrrrrrrRr...",
      ".rRrrrrrrrrrRr..",
      "rRrrrrrrrrrrrRr.",
      "rrRrRrRrRrRrRr..",   // scallops
      "......kk........",
      "......kk........",
      "......kk........",
      "......kk........",
      "......kk........",
      "......kkk.......",   // hook
      "......w.kk......",
      ".......w.k......",
      "................",
    ], { r: "#ff4d4d", R: "#c8385a" }); },

    butterfly: function () { return svg([
      "................",
      ".mmm..kk..ccc...",
      "mMMMm.kk.cCCCc..",
      "mMyMm.kk.cCyCc..",   // wing spots
      "mMMMmmkkmmCCCc..",
      ".mMMmkwwkmCCm...",   // body + eyes
      ".mMMmkkkkmCCm...",
      "mMMMmmkkmmCCCm..",
      "mMpMm.kk.cCpCc..",
      "mMMMm.kk.cCCCc..",
      ".mmm..kk..ccc...",
      "......kk........",
      ".......k........",
      "................",
      "................",
      "................",
    ], { y: "#ffe066" }); },
  };

  function draw(word) {
    var fn = ART[word];
    return fn ? fn() : "";
  }

  return { draw: draw, has: function (w) { return !!ART[w]; } };
})();
