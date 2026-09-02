/* ===========================================================
   Craepets — THE VALLEY MAP.
   -----------------------------------------------------------
   One painted picture of the whole valley, drawn as inline SVG
   so it is crisp at any size: hills, a river, the paths, and
   every place you can go as something you can TAP. Your own
   house has your Craepet standing outside it; the rest of the
   family's houses have theirs, and tapping one is a visit.

       CPMap.svg({ here, homes: [{id, name, colour, chip, mine}] })

   The markers carry the same data-goto / data-visit attributes
   as the nav buttons, so the engine's one click handler does
   the rest.
   =========================================================== */
window.CPMap = (function () {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* Where everything is, on a canvas 100 wide (86 tall, or 94 with a
     second row of houses). A marker is a dot
     about 11 wide with a label under it up to ~20 wide, so places
     on the same row sit at least 22 apart and rows are 18+ apart —
     nothing overlaps, whatever the labels say. */
  var W = 100;
  var PLACES = [
    { id: "games",  x: 17, y: 12, emoji: "🎮", label: "Games Room",  go: "games" },
    { id: "arena",  x: 60, y: 13, emoji: "⚔️", label: "Arena",       go: "arena" },
    { id: "tower",  x: 87, y: 10, emoji: "🗼", label: "Shadow Tower", go: "arena", dark: true },
    { id: "farm",   x: 18, y: 32, emoji: "🍓", label: "Berry Farm",  go: "farm" },
    { id: "well",   x: 48, y: 31, emoji: "📖", label: "Word Well",   go: "well" },
    { id: "pool",   x: 80, y: 34, emoji: "🌈", label: "Rainbow Pool", go: "pool" },
    { id: "quests", x: 30, y: 52, emoji: "📜", label: "Quest Board", go: "quests" },
    { id: "market", x: 54, y: 53, emoji: "🏪", label: "Market & Bank", go: "market" },
    { id: "stall",  x: 82, y: 54, emoji: "🏬", label: "Your Stall",  go: "stall" }
  ];
  /* The family's houses line the lane at the bottom, spread evenly.
     Up to three fit in one row; more than that and they take turns on
     either side of the lane, so neighbours' names are never on the
     same line (six houses → 16 apart, names 32 apart). */
  var LANE_GAP = 20, LANE_PAD = 10, LANE_TOP = 73, LANE_BOTTOM = 83;
  function laneSpots(n) {
    if (n <= 0) return [];
    var zig = n > 3;
    var gap = Math.min(LANE_GAP, (W - 2 * LANE_PAD) / Math.max(1, n - 1));
    var x0 = W / 2 - gap * (n - 1) / 2;
    var spots = [];
    for (var i = 0; i < n; i++) spots.push([Math.round((x0 + gap * i) * 10) / 10, zig && i % 2 ? LANE_BOTTOM : LANE_TOP]);
    return spots;
  }
  /* Pet names can be 14 letters; a house label has room for about 11. */
  function shortName(name) {
    name = String(name == null ? "" : name);
    return name.length > 12 ? name.slice(0, 11).replace(/\s+$/, "") + "…" : name;
  }

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
    var spots = laneSpots(homes.length);
    var H = homes.length > 3 ? 94 : 86;      // a second row of houses needs the room
    var river = "M100 36 C 88 42, 80 44, 70 48 S 65 64, 66 " + H;
    var out = '<svg class="valley" viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A map of the valley">' +
      "<defs>" +
        '<linearGradient id="vm-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fd3ff"/><stop offset="1" stop-color="#e8f7ff"/></linearGradient>' +
        '<linearGradient id="vm-far" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b8e3a5"/><stop offset="1" stop-color="#8fcf7a"/></linearGradient>' +
        '<linearGradient id="vm-near" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9bd97f"/><stop offset="1" stop-color="#5fa845"/></linearGradient>' +
        '<linearGradient id="vm-dark" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4d4478"/><stop offset="1" stop-color="#2b2450"/></linearGradient>' +
      "</defs>" +
      '<rect width="' + W + '" height="' + H + '" fill="url(#vm-sky)"/>' +
      // a sun and some cloud
      '<circle cx="90" cy="7" r="4" fill="#ffe27a"/>' +
      '<g fill="#fff" opacity="0.9"><ellipse cx="30" cy="6" rx="6" ry="2.2"/><ellipse cx="34" cy="5" rx="4" ry="2.4"/><ellipse cx="52" cy="9" rx="5" ry="1.8"/></g>' +
      // the tower's own hill, dark
      '<ellipse cx="88" cy="20" rx="16" ry="8" fill="url(#vm-dark)"/>' +
      // far hills
      '<ellipse cx="20" cy="26" rx="30" ry="10" fill="url(#vm-far)"/>' +
      '<ellipse cx="60" cy="27" rx="34" ry="11" fill="url(#vm-far)"/>' +
      // the valley floor
      '<rect y="30" width="' + W + '" height="' + (H - 30) + '" fill="url(#vm-near)"/>' +
      '<ellipse cx="50" cy="31" rx="60" ry="6" fill="#9bd97f"/>' +
      // the river, from the pool down past the market
      '<path d="' + river + '" fill="none" stroke="#57c4ff" stroke-width="3.2" stroke-linecap="round"/>' +
      '<path d="' + river + '" fill="none" stroke="#9fe0ff" stroke-width="1.2" stroke-linecap="round"/>' +
      // the paths
      '<path class="vm-path" d="M18 32 L48 31 M48 31 L80 34 M18 32 L17 12 M48 31 L60 13 L87 10 M80 34 L60 13 M18 32 L30 52 L54 53 L82 54 M48 31 L54 53 M30 52 L30 78 M4 78 L96 78"/>' +
      // trees
      '<g fill="#3fb469"><circle cx="8" cy="40" r="1.8"/><circle cx="32" cy="40" r="1.5"/><circle cx="64" cy="42" r="1.6"/><circle cx="92" cy="48" r="2"/><circle cx="94" cy="62" r="1.6"/><circle cx="42" cy="64" r="1.7"/><circle cx="70" cy="24" r="1.4"/><circle cx="6" cy="46" r="1.4"/><circle cx="12" cy="62" r="1.6"/><circle cx="4" cy="' + (H - 4) + '" r="1.5"/><circle cx="96" cy="' + (H - 2) + '" r="1.5"/></g>' +
      '<g fill="#2f8f5b"><rect x="7.6" y="41" width="0.8" height="1.6"/><rect x="31.6" y="41" width="0.8" height="1.4"/><rect x="63.6" y="43" width="0.8" height="1.4"/><rect x="91.6" y="49.5" width="0.8" height="1.8"/><rect x="93.6" y="63" width="0.8" height="1.4"/><rect x="41.6" y="65" width="0.8" height="1.6"/><rect x="11.6" y="63" width="0.8" height="1.4"/></g>' +
      // the farm's field and the pool's water
      '<rect x="10" y="36" width="14" height="4" rx="1" fill="#c9906a" opacity="0.6"/>' +
      '<ellipse cx="80" cy="39" rx="6" ry="2.2" fill="#8fe4ff"/>';

    PLACES.forEach(function (p) {
      var attrs = 'data-goto="' + p.go + '" data-map="' + p.id + '" role="button" tabindex="0" aria-label="Go to the ' + esc(p.label) + '"';
      out += marker(p.x, p.y, p.emoji, p.label, attrs, (p.dark ? "dark " : "") + (here === p.id ? "here" : ""));
    });
    // the family's houses along the lane
    homes.forEach(function (h, i) {
      var spot = spots[i];
      var attrs = h.mine
        ? 'data-goto="nest" data-map="nest" role="button" tabindex="0" aria-label="Go home to ' + esc(h.name) + '"'
        : 'data-visit="' + esc(h.id) + '" role="button" tabindex="0" aria-label="Visit ' + esc(h.name) + '"';
      out += '<g class="mp home' + (h.mine ? " mine" : "") + (h.mine && here === "nest" ? " here" : "") + '" ' + attrs +
        ' transform="translate(' + spot[0] + " " + spot[1] + ')">' +
        '<ellipse class="mp-shadow" cx="0" cy="4.6" rx="5" ry="1.3"/>' +
        '<circle class="mp-dot" r="5.2" style="stroke:' + esc(h.colour) + '"/>' +
        '<text class="mp-emoji" y="1.6" text-anchor="middle">' + h.emoji + "</text>" +
        (h.chip ? '<image href="' + h.chip + '" x="2.6" y="-6.2" width="4.6" height="5.6" style="image-rendering:pixelated"/>' : "") +
        '<text class="mp-label" y="9" text-anchor="middle">' + esc(shortName(h.name)) + "</text>" +
      "</g>";
    });
    out += "</svg>";
    return out;
  }

  return { svg: svg, PLACES: PLACES, laneSpots: laneSpots };
})();
