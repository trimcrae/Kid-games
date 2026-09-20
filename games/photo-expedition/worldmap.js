/* ===========================================================
   Photo Expedition — the world map hub.
   -----------------------------------------------------------
   A real map of the world (Natural Earth coastlines, land.js) drawn
   on a canvas with an equirectangular projection, so that every
   line of latitude and longitude is a straight line and the grid
   can be READ: 30°N is a row, 90°E is a column, and a pin at
   2°S 35°E is exactly where it should be.

   The map is built once into an off-screen "atlas" (ocean, land
   tinted by climate, hill shading, graticule and labels); pins,
   routes, the pulsing current site and question highlights are
   drawn on top every frame.

     WorldMap.init(canvas, { onPick(site), onTap(lon, lat) })
     WorldMap.setState({ unlocked:Set, stars:{id:n}, done:Set,
                         current:id, route:[ids], question:{...} })
     WorldMap.lonLatToXY(lon, lat) / xyToLonLat(x, y)
     WorldMap.distanceKm(a, b)
   =========================================================== */
const WorldMap = (function () {
  "use strict";

  let canvas, ctx, atlas = null, atlasW = 0, atlasH = 0, dpr = 1;
  let W = 0, H = 0;            // css pixels
  let state = { unlocked: new Set(), stars: {}, done: new Set(), current: null, route: [], question: null, hover: null };
  let opts = {};
  let raf = 0, t0 = performance.now();
  let rings = null;            // decoded [[lon,lat],...] rings

  const PIN_R = 18;

  /* ---- projection ---- */
  function lonLatToXY(lon, lat) {
    return [((lon + 180) / 360) * W, ((90 - lat) / 180) * H];
  }
  function xyToLonLat(x, y) {
    return [(x / W) * 360 - 180, 90 - (y / H) * 180];
  }

  function decodeRings() {
    if (rings) return rings;
    rings = LAND_RINGS.map((flat) => {
      const pts = [];
      let x = 0, y = 0;
      for (let i = 0; i < flat.length; i += 2) {
        x += flat[i]; y += flat[i + 1];
        pts.push([x / 10, y / 10]);
      }
      return pts;
    });
    return rings;
  }

  /* ---- a tiny value-noise for the hill shading and desert texture ---- */
  function hash(x, y) {
    let h = (x * 374761393 + y * 668265263) | 0;
    h = (h ^ (h >> 13)) * 1274126177;
    return ((h ^ (h >> 16)) >>> 0) / 4294967295;
  }
  function noise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }

  /* Hand-placed climate blobs [lon, lat, rx, ry, kind] — the big deserts,
     the great forests and the ice, so the land is tinted like a satellite
     picture instead of one flat green. */
  const CLIMATE = [
    [12, 23, 26, 8, "desert"],      // Sahara
    [45, 23, 10, 7, "desert"],      // Arabia
    [62, 30, 8, 5, "desert"],       // Iran / Thar
    [100, 42, 16, 5, "desert"],     // Gobi / Taklamakan
    [132, -25, 14, 7, "desert"],    // Australian outback
    [-111, 33, 6, 5, "desert"],     // Sonoran / Mojave
    [-70, -24, 3, 8, "desert"],     // Atacama
    [18, -24, 5, 6, "desert"],      // Kalahari / Namib
    [-62, -4, 16, 9, "forest"],     // Amazon
    [20, 0, 12, 7, "forest"],       // Congo
    [110, 0, 18, 8, "forest"],      // Borneo / Indonesia
    [95, 60, 70, 10, "taiga"],      // Siberia
    [-100, 58, 45, 9, "taiga"],     // Canada
    [-42, 74, 12, 10, "ice"],       // Greenland
    [90, 33, 12, 4, "mountain"],    // Himalaya / Tibet
    [-70, -30, 4, 20, "mountain"],  // Andes
    [-113, 45, 8, 12, "mountain"]   // Rockies
  ];

  function tintFor(lon, lat, n) {
    let r = 122, g = 152, b = 82;                 // base grassland
    const a = Math.abs(lat);
    if (a > 75) { r = 236; g = 240; b = 244; }     // polar ice
    else if (a > 62) { r = 150; g = 150; b = 122; } // tundra
    else if (a < 12) { r = 70; g = 120; b = 58; }   // tropics
    let best = 0, kind = null;
    for (const c of CLIMATE) {
      const dx = (lon - c[0]) / c[2], dy = (lat - c[1]) / c[3];
      const d = 1 - (dx * dx + dy * dy);
      if (d > best) { best = d; kind = c[4]; }
    }
    if (kind) {
      const w = Math.min(1, best * 1.4);
      let tr, tg, tb;
      if (kind === "desert") { tr = 214; tg = 186; tb = 122; }
      else if (kind === "forest") { tr = 40; tg = 98; tb = 46; }
      else if (kind === "taiga") { tr = 74; tg = 108; tb = 70; }
      else if (kind === "ice") { tr = 240; tg = 244; tb = 248; }
      else { tr = 140; tg = 128; tb = 108; }
      r += (tr - r) * w; g += (tg - g) * w; b += (tb - b) * w;
    }
    const shade = 0.82 + n * 0.36;
    return "rgb(" + (r * shade | 0) + "," + (g * shade | 0) + "," + (b * shade | 0) + ")";
  }

  /* ---- build the base map once ---- */
  function buildAtlas() {
    atlasW = Math.round(W * dpr); atlasH = Math.round(H * dpr);
    atlas = document.createElement("canvas");
    atlas.width = atlasW; atlas.height = atlasH;
    const c = atlas.getContext("2d");
    c.scale(dpr, dpr);

    // ocean: deep blue with a lighter equator and pale poles
    const og = c.createLinearGradient(0, 0, 0, H);
    og.addColorStop(0, "#9ec9e2"); og.addColorStop(0.18, "#3f86b9"); og.addColorStop(0.5, "#2a6fa8");
    og.addColorStop(0.82, "#3f86b9"); og.addColorStop(1, "#c9e2ee");
    c.fillStyle = og; c.fillRect(0, 0, W, H);
    // gentle wave texture
    c.globalAlpha = 0.08;
    for (let y = 0; y < H; y += 6) {
      c.fillStyle = (y / 6) % 2 ? "#ffffff" : "#000000";
      c.fillRect(0, y, W, 3);
    }
    c.globalAlpha = 1;

    const land = decodeRings();
    const path = new Path2D();
    for (const ring of land) {
      let first = true;
      for (const p of ring) {
        const [x, y] = lonLatToXY(p[0], p[1]);
        if (first) { path.moveTo(x, y); first = false; } else path.lineTo(x, y);
      }
      path.closePath();
    }
    // continental shelf glow
    c.save(); c.shadowColor = "rgba(190,230,255,0.9)"; c.shadowBlur = 10; c.fillStyle = "#7fb9d6"; c.fill(path); c.restore();
    // land, painted as tinted tiles clipped to the coastline
    c.save(); c.clip(path);
    const cell = 4;
    for (let y = 0; y < H; y += cell) {
      for (let x = 0; x < W; x += cell) {
        const [lon, lat] = xyToLonLat(x + cell / 2, y + cell / 2);
        const n = noise(x / 9, y / 9) * 0.6 + noise(x / 33, y / 33) * 0.4;
        c.fillStyle = tintFor(lon, lat, n);
        c.fillRect(x, y, cell + 0.5, cell + 0.5);
      }
    }
    c.restore();
    c.strokeStyle = "rgba(40,60,50,0.55)"; c.lineWidth = 0.8; c.stroke(path);

    // graticule
    c.strokeStyle = "rgba(255,255,255,0.35)"; c.lineWidth = 1;
    c.font = "bold 11px " + getComputedStyle(document.body).fontFamily;
    c.fillStyle = "rgba(255,255,255,0.9)";
    c.textAlign = "center"; c.textBaseline = "top";
    for (let lon = -150; lon <= 180; lon += 30) {
      const [x] = lonLatToXY(lon, 0);
      c.setLineDash(lon === 0 ? [] : [4, 4]);
      c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke();
      c.fillText(lon === 0 ? "0°" : Math.abs(lon) + "°" + (lon < 0 ? "W" : "E"), x, 3);
    }
    c.textAlign = "left"; c.textBaseline = "middle";
    for (let lat = -60; lat <= 60; lat += 30) {
      const [, y] = lonLatToXY(0, lat);
      c.setLineDash(lat === 0 ? [] : [4, 4]);
      c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke();
      c.fillText(lat === 0 ? "Equator 0°" : Math.abs(lat) + "°" + (lat < 0 ? "S" : "N"), 4, y - 8);
    }
    c.setLineDash([]);
    // Arctic & Antarctic circles, tropics
    c.strokeStyle = "rgba(255,255,255,0.22)"; c.setLineDash([2, 6]);
    for (const lat of [66.5, -66.5, 23.4, -23.4]) {
      const [, y] = lonLatToXY(0, lat);
      c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke();
    }
    c.setLineDash([]);
    // continent names
    c.font = "bold 13px " + getComputedStyle(document.body).fontFamily;
    c.textAlign = "center"; c.textBaseline = "middle";
    c.fillStyle = "rgba(30,40,30,0.55)";
    const names = [["NORTH AMERICA", -100, 47], ["SOUTH AMERICA", -60, -16], ["EUROPE", 18, 50], ["AFRICA", 20, 8],
                   ["ASIA", 95, 50], ["OCEANIA", 134, -27], ["ANTARCTICA", 0, -80]];
    for (const n of names) { const [x, y] = lonLatToXY(n[1], n[2]); c.fillText(n[0], x, y); }
    c.fillStyle = "rgba(255,255,255,0.55)"; c.font = "bold 12px " + getComputedStyle(document.body).fontFamily;
    for (const n of [["PACIFIC OCEAN", -150, -20], ["ATLANTIC OCEAN", -35, 20], ["INDIAN OCEAN", 78, -25], ["PACIFIC OCEAN", 165, 15], ["SOUTHERN OCEAN", 60, -62], ["ARCTIC OCEAN", 60, 84]]) {
      const [x, y] = lonLatToXY(n[1], n[2]); c.fillText(n[0], x, y);
    }
  }

  /* ---- overlay drawing ---- */
  function draw() {
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (atlas) ctx.drawImage(atlas, 0, 0, W, H);
    const now = (performance.now() - t0) / 1000;

    // question mode: highlight a 10° grid to tap
    const q = state.question;
    if (q && q.type === "coord") {
      ctx.strokeStyle = "rgba(255,255,255,0.28)"; ctx.lineWidth = 1;
      for (let lon = -180; lon <= 180; lon += 10) { const [x] = lonLatToXY(lon, 0); ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let lat = -90; lat <= 90; lat += 10) { const [, y] = lonLatToXY(0, lat); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      if (state.hover) {
        const [lon, lat] = state.hover;
        const cl = Math.floor(lon / 10) * 10, ct = Math.ceil(lat / 10) * 10;
        const [x0, y0] = lonLatToXY(cl, ct), [x1, y1] = lonLatToXY(cl + 10, ct - 10);
        ctx.fillStyle = "rgba(255,209,102,0.35)"; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
        ctx.strokeStyle = "#ffd166"; ctx.lineWidth = 2; ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
      }
    }

    // travel route between the sites in the order they were visited
    const route = state.route || [];
    if (route.length > 1) {
      ctx.save();
      ctx.strokeStyle = "rgba(255,80,80,0.9)"; ctx.lineWidth = 2.5; ctx.setLineDash([7, 6]);
      ctx.lineDashOffset = -now * 20;
      ctx.beginPath();
      route.forEach((id, i) => {
        const s = siteById(id); if (!s) return;
        const [x, y] = lonLatToXY(s.lon, s.lat);
        if (i === 0) ctx.moveTo(x, y); else {
          // arc the line slightly, like a flight path
          const p = siteById(route[i - 1]); const [px, py] = lonLatToXY(p.lon, p.lat);
          const mx = (px + x) / 2, my = (py + y) / 2 - Math.min(60, Math.hypot(x - px, y - py) * 0.18);
          ctx.quadraticCurveTo(mx, my, x, y);
        }
      });
      ctx.stroke(); ctx.restore();
    }

    // pins
    for (const s of SITES) {
      const [x, y] = lonLatToXY(s.lon, s.lat);
      const unlocked = state.unlocked.has(s.id);
      const done = state.done.has(s.id);
      const stars = state.stars[s.id] || 0;
      const cur = state.current === s.id;
      const hidden = q && q.hideSite === s.id;
      if (hidden) continue;
      if (cur) {
        const pulse = 1 + 0.25 * Math.sin(now * 4);
        ctx.beginPath(); ctx.arc(x, y, PIN_R * 1.5 * pulse, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,209,102,0.85)"; ctx.lineWidth = 3; ctx.stroke();
      }
      // shadow + pin body
      ctx.beginPath(); ctx.arc(x + 1.5, y + 3, PIN_R, 0, Math.PI * 2); ctx.fillStyle = "rgba(0,0,0,0.28)"; ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, PIN_R, 0, Math.PI * 2);
      ctx.fillStyle = unlocked ? (done ? "#ffd166" : "#ffffff") : "#8b8f96"; ctx.fill();
      ctx.strokeStyle = unlocked ? s.color : "#5c6067"; ctx.lineWidth = 3; ctx.stroke();
      ctx.font = (unlocked ? 20 : 16) + "px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillStyle = "#000";
      ctx.fillText(unlocked ? s.emoji : "🔒", x, y + 1);
      // label + stars
      ctx.font = "bold 12px " + getComputedStyle(document.body).fontFamily;
      const label = s.name.replace(/^The /, "");
      const tw = ctx.measureText(label).width + 12;
      const ly = s.lat < -70 ? y - PIN_R - 12 : y + PIN_R + 12;   // Antarctica's label goes above its pin
      ctx.fillStyle = "rgba(20,24,30,0.78)";
      roundRect(ctx, x - tw / 2, ly - 9, tw, 18, 9); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.fillText(label, x, ly);
      if (unlocked && stars) {
        ctx.font = "11px system-ui, sans-serif";
        ctx.fillStyle = "#ffd166";
        const st = "★" + stars;
        ctx.fillText(st, x + PIN_R + 2, y - PIN_R + 4);
      }
    }
    raf = requestAnimationFrame(draw);
  }

  function roundRect(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }

  function siteById(id) { return SITES.find((s) => s.id === id); }

  /* ---- input ---- */
  function pointer(e) {
    const r = canvas.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    return [((p.clientX - r.left) / r.width) * W, ((p.clientY - r.top) / r.height) * H];
  }
  function pinAt(x, y) {
    let best = null, bd = 1e9;
    for (const s of SITES) {
      const [px, py] = lonLatToXY(s.lon, s.lat);
      const d = Math.hypot(px - x, py - y);
      if (d < PIN_R + 6 && d < bd) { bd = d; best = s; }
    }
    return best;
  }
  function onClick(e) {
    const [x, y] = pointer(e);
    if (state.question) {
      const [lon, lat] = xyToLonLat(x, y);
      opts.onTap && opts.onTap(lon, lat);
      return;
    }
    const s = pinAt(x, y);
    if (s) opts.onPick && opts.onPick(s);
  }
  function onMove(e) {
    const [x, y] = pointer(e);
    state.hover = xyToLonLat(x, y);
    canvas.style.cursor = (state.question || pinAt(x, y)) ? "pointer" : "default";
  }

  function resize() {
    const box = canvas.parentElement.getBoundingClientRect();
    W = Math.max(720, Math.floor(box.width)); H = Math.floor(W / 2);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    atlas = null; buildAtlas();
  }

  /* ---- great-circle distance ---- */
  function distanceKm(a, b) {
    const R = 6371, rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function continentAt(lon, lat) {
    for (const b of CONTINENT_BOXES) if (lon >= b[1] && lon <= b[2] && lat >= b[3] && lat <= b[4]) return b[0];
    return null;
  }
  function fmtCoord(lat, lon) {
    return Math.abs(lat).toFixed(0) + "°" + (lat < 0 ? "S" : "N") + " " + Math.abs(lon).toFixed(0) + "°" + (lon < 0 ? "W" : "E");
  }

  function init(el, o) {
    canvas = el; ctx = canvas.getContext("2d"); opts = o || {};
    canvas.addEventListener("click", onClick);
    canvas.addEventListener("mousemove", onMove);
    window.addEventListener("resize", () => { if (canvas.isConnected && canvas.offsetParent) resize(); });
    resize();
    cancelAnimationFrame(raf); draw();
  }
  function setState(s) { Object.assign(state, s); }
  function refresh() { if (canvas && canvas.offsetParent) { const w = canvas.parentElement.getBoundingClientRect().width; if (Math.max(720, Math.floor(w)) !== W) resize(); } }

  return { init, setState, refresh, lonLatToXY, xyToLonLat, distanceKm, continentAt, fmtCoord, siteById };
})();
