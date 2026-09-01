/* ===========================================================
   Craepets — THE VALLEY MAP.
   -----------------------------------------------------------
   One painted picture of the whole valley, drawn as inline SVG
   so it is crisp at any size: hills, a river, the paths, and
   every place you can go as something you can TAP. Your own
   house has your Craepet standing outside it; the rest of the
   family's houses have theirs, and tapping one is a visit.

       CPMap.svg({ here, homes: [{id, name, colour, chip, mine}] })

   The markers carry the same data-go / data-visit attributes
   as the nav buttons, so the engine's one click handler does
   the rest.
   =========================================================== */
window.CPMap = (function () {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* Where everything is, on a 100 × 64 canvas. */
  var PLACES = [
    { id: "games",  x: 17, y: 12, emoji: "🎮", label: "Games Room",  go: "games" },
    { id: "arena",  x: 63, y: 14, emoji: "⚔️", label: "Arena",       go: "arena" },
    { id: "tower",  x: 88, y: 10, emoji: "🗼", label: "Shadow Tower", go: "arena", dark: true },
    { id: "farm",   x: 18, y: 31, emoji: "🍓", label: "Berry Farm",  go: "farm" },
    { id: "well",   x: 46, y: 30, emoji: "📖", label: "Word Well",   go: "well" },
    { id: "pool",   x: 78, y: 36, emoji: "🌈", label: "Rainbow Pool", go: "pool" },
    { id: "market", x: 50, y: 50, emoji: "🏪", label: "Market & Bank", go: "market" },
    { id: "stall",  x: 66, y: 55, emoji: "🏬", label: "Your Stall",  go: "stall" },
    { id: "quests", x: 34, y: 45, emoji: "📜", label: "Quest Board", go: "quests" }
  ];
  /* The family's houses sit along the lane at the bottom left. */
  var HOME_SPOTS = [[10, 53], [23, 56], [8, 44], [30, 60], [16, 61], [4, 62]];

  function marker(x, y, emoji, label, attrs, cls) {
    return '<g class="mp ' + (cls || "") + '" ' + attrs + ' transform="translate(' + x + " " + y + ')">' +
      '<ellipse class="mp-shadow" cx="0" cy="5.2" rx="5" ry="1.3"/>' +
      '<circle class="mp-dot" r="5.4"/>' +
      '<text class="mp-emoji" y="1.9" text-anchor="middle">' + emoji + "</text>" +
      '<text class="mp-label" y="9.6" text-anchor="middle">' + esc(label) + "</text>" +
    "</g>";
  }

  function svg(opts) {
    opts = opts || {};
    var here = opts.here || "nest";
    var homes = opts.homes || [];
    var out = '<svg class="valley" viewBox="0 0 100 72" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A map of the valley">' +
      "<defs>" +
        '<linearGradient id="vm-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fd3ff"/><stop offset="1" stop-color="#e8f7ff"/></linearGradient>' +
        '<linearGradient id="vm-far" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b8e3a5"/><stop offset="1" stop-color="#8fcf7a"/></linearGradient>' +
        '<linearGradient id="vm-near" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9bd97f"/><stop offset="1" stop-color="#5fa845"/></linearGradient>' +
        '<linearGradient id="vm-dark" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4d4478"/><stop offset="1" stop-color="#2b2450"/></linearGradient>' +
      "</defs>" +
      '<rect width="100" height="72" fill="url(#vm-sky)"/>' +
      // a sun and some cloud
      '<circle cx="90" cy="7" r="4" fill="#ffe27a"/>' +
      '<g fill="#fff" opacity="0.9"><ellipse cx="30" cy="6" rx="6" ry="2.2"/><ellipse cx="34" cy="5" rx="4" ry="2.4"/><ellipse cx="52" cy="9" rx="5" ry="1.8"/></g>' +
      // the tower's own hill, dark
      '<ellipse cx="88" cy="20" rx="16" ry="8" fill="url(#vm-dark)"/>' +
      // far hills
      '<ellipse cx="20" cy="26" rx="30" ry="10" fill="url(#vm-far)"/>' +
      '<ellipse cx="60" cy="27" rx="34" ry="11" fill="url(#vm-far)"/>' +
      // the valley floor
      '<rect y="30" width="100" height="42" fill="url(#vm-near)"/>' +
      '<ellipse cx="50" cy="31" rx="60" ry="6" fill="#9bd97f"/>' +
      // the river, from the pool down past the market
      '<path d="M100 33 C 84 38, 80 42, 72 46 S 60 62, 48 72" fill="none" stroke="#57c4ff" stroke-width="3.2" stroke-linecap="round"/>' +
      '<path d="M100 33 C 84 38, 80 42, 72 46 S 60 62, 48 72" fill="none" stroke="#9fe0ff" stroke-width="1.2" stroke-linecap="round"/>' +
      // the paths
      '<path class="vm-path" d="M16 56 L18 36 M18 36 L46 34 L50 46 M46 34 L78 40 M50 46 L66 53 M34 45 L50 50 M18 36 L20 18 M46 30 L63 18 L86 14 M78 36 L64 18 M16 56 L30 60"/>' +
      // trees
      '<g fill="#3fb469"><circle cx="8" cy="36" r="1.8"/><circle cx="30" cy="38" r="1.5"/><circle cx="58" cy="41" r="1.6"/><circle cx="90" cy="50" r="2"/><circle cx="84" cy="58" r="1.6"/><circle cx="38" cy="60" r="1.7"/><circle cx="72" cy="30" r="1.4"/><circle cx="6" cy="42" r="1.4"/></g>' +
      '<g fill="#2f8f5b"><rect x="7.6" y="37" width="0.8" height="1.6"/><rect x="29.6" y="39" width="0.8" height="1.4"/><rect x="57.6" y="42" width="0.8" height="1.4"/><rect x="89.6" y="51.5" width="0.8" height="1.8"/><rect x="83.6" y="59" width="0.8" height="1.4"/><rect x="37.6" y="61" width="0.8" height="1.6"/></g>' +
      // the farm's field and the pool's water
      '<rect x="10" y="34" width="12" height="4" rx="1" fill="#c9906a" opacity="0.6"/>' +
      '<ellipse cx="78" cy="41" rx="6" ry="2.2" fill="#8fe4ff"/>';

    PLACES.forEach(function (p) {
      var attrs = 'data-go="' + p.go + '" data-map="' + p.id + '" role="button" tabindex="0" aria-label="Go to the ' + esc(p.label) + '"';
      out += marker(p.x, p.y, p.emoji, p.label, attrs, (p.dark ? "dark " : "") + (here === p.id || (p.id === "tower" && false) ? "here" : ""));
    });
    // the family's houses along the lane
    homes.forEach(function (h, i) {
      var spot = HOME_SPOTS[i % HOME_SPOTS.length];
      var attrs = h.mine
        ? 'data-go="nest" data-map="nest" role="button" tabindex="0" aria-label="Go home to ' + esc(h.name) + '"'
        : 'data-visit="' + esc(h.id) + '" role="button" tabindex="0" aria-label="Visit ' + esc(h.name) + '"';
      out += '<g class="mp home' + (h.mine ? " mine" : "") + (h.mine && here === "nest" ? " here" : "") + '" ' + attrs +
        ' transform="translate(' + spot[0] + " " + spot[1] + ')">' +
        '<ellipse class="mp-shadow" cx="0" cy="4.6" rx="5" ry="1.3"/>' +
        '<circle class="mp-dot" r="5.2" style="stroke:' + esc(h.colour) + '"/>' +
        '<text class="mp-emoji" y="1.6" text-anchor="middle">' + h.emoji + "</text>" +
        (h.chip ? '<image href="' + h.chip + '" x="2.6" y="-6.2" width="4.6" height="5.6" style="image-rendering:pixelated"/>' : "") +
        '<text class="mp-label" y="9" text-anchor="middle">' + esc(h.name) + "</text>" +
      "</g>";
    });
    out += "</svg>";
    return out;
  }

  return { svg: svg, PLACES: PLACES };
})();
