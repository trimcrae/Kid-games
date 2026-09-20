/* ===========================================================
   Photo Expedition — being there.
   -----------------------------------------------------------
   Walks (or swims) the photographer through a world from
   world.mjs full of animals from creatures.mjs, and turns the
   screen into a camera: a viewfinder with a rule-of-thirds grid,
   a zoom from a wide 24 mm to a 300 mm telephoto, and a shutter
   that scores the picture the way a photo editor would — how big
   the animal is in the frame, where it sits, whether you caught
   its eyes, which way the light was, and whether you held still.

   Plus the explorer's kit: a grid minimap (A–H × 1–8), a compass,
   a full-screen map with the treasure clue and a tap-to-set
   waypoint, sneaking, and a day that turns from dawn to golden
   hour to night.

     const ex = await startExpedition({ THREE, site, tier, explorer,
       root, onPhoto, onTreasure, onExit });
   =========================================================== */
import { buildWorld, SIZE, GRID, CELL } from "./world.mjs";
import { createCreatureManager } from "./creatures.mjs";

const DAY_SECONDS = 360;          // one sunrise-to-sunset in real seconds
const NIGHT_SECONDS = 80;

const TREASURE_AT = {
  serengeti: [101, -12], amazon: [150, 175], reef: [-144, 63], arctic: [40, 110], galapagos: [204, -4],
  himalaya: [-38, 60], sahara: [-65, -40], yellestone: [0, 0], yellowstone: [-3, -218], antarctica: [190, 172]
};

export async function startExpedition(opts) {
  const { THREE, site, tier, explorer, root } = opts;
  const $ = (id) => root.querySelector("#" + id);
  const canvas = $("ex-canvas");
  const isTouch = window.matchMedia("(pointer: coarse)").matches;
  const dpr = Math.min(window.devicePixelRatio || 1, isTouch ? 1.5 : 2);
  const quality = (isTouch || window.innerWidth < 900) ? 0.6 : 1;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(dpr);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const world = buildWorld(THREE, site, quality);
  const subjectIds = site.subjects.filter((s) => ["animal", "bird", "swimmer", "flutter"].includes(SUBJECTS[s].kind));
  const zoo = createCreatureManager(THREE, world, site, tier, subjectIds);

  const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 2600);
  const player = {
    pos: new THREE.Vector3(world.spawn.player[0], 0, world.spawn.player[1]),
    yaw: Math.PI, pitch: 0, sneak: false, run: false, swimY: 0,
    vel: new THREE.Vector3(), speedNow: 0, turnNow: 0
  };
  // face the middle of the map to start
  player.yaw = Math.atan2(-player.pos.x, -player.pos.z);
  if (world.underwater) player.swimY = world.waterLevel - 6;
  const EYE = 1.6, EYE_SNEAK = 0.9;
  let focal = 35, camMode = false, clock = 0.08, t = 0, running = true, last = performance.now();
  let treasureFound = false, waypoint = null, shots = 0, lastShotAt = -10, mapOpen = false;
  const best = {};           // subject id -> stars
  const treasurePos = new THREE.Vector3(TREASURE_AT[site.id][0], 0, TREASURE_AT[site.id][1]);
  treasurePos.y = world.heightAt(treasurePos.x, treasurePos.z);
  const hudTasks = $("hud-tasks");

  /* ---------- the treasure glint ---------- */
  const glint = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d");
    const rg = g.createRadialGradient(32, 32, 0, 32, 32, 32); rg.addColorStop(0, "rgba(255,240,150,1)"); rg.addColorStop(0.3, "rgba(255,220,80,0.7)"); rg.addColorStop(1, "rgba(255,200,0,0)");
    g.fillStyle = rg; g.fillRect(0, 0, 64, 64);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
    s.position.copy(treasurePos).add(new THREE.Vector3(0, 0.6, 0)); s.scale.set(1.2, 1.2, 1); world.scene.add(s); return s;
  })();

  /* ---------- resize ---------- */
  function resize() {
    const w = root.clientWidth, h = root.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize); resize();

  /* ---------- input ---------- */
  const keys = {};
  const onKey = (e) => {
    if (e.type === "keydown" && !e.repeat) {
      if (e.code === "KeyE" || e.code === "KeyC") toggleCamera();
      if (e.code === "Space") { if (camMode) shoot(); e.preventDefault(); }
      if (e.code === "KeyM") toggleMap();
      if (e.code === "KeyX") { player.sneak = !player.sneak; $("btn-sneak").classList.toggle("on", player.sneak); }
      if (e.code === "KeyF") dig();
      if (e.code === "Escape") { if (mapOpen) toggleMap(); else if (camMode) toggleCamera(); }
      if (e.code === "Equal" || e.code === "NumpadAdd") zoomBy(1.25);
      if (e.code === "Minus" || e.code === "NumpadSubtract") zoomBy(0.8);
    }
    keys[e.code] = e.type === "keydown";
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
  };
  window.addEventListener("keydown", onKey); window.addEventListener("keyup", onKey);

  // look: drag anywhere on the canvas (mouse or the right-hand side on touch)
  let dragging = null;
  const lookArea = $("look-area");
  const onDown = (e) => {
    if (e.target.closest && e.target.closest("button, input, .no-look")) return;
    const p = e.touches ? e.touches[0] : e;
    dragging = { x: p.clientX, y: p.clientY, id: e.touches ? e.touches[0].identifier : -1 };
  };
  const onMove = (e) => {
    if (!dragging) return;
    let p = e.touches ? Array.from(e.touches).find((t) => t.identifier === dragging.id) : e;
    if (!p) return;
    const sens = (camMode ? 0.0032 * (35 / focal) : 0.0045);
    player.yaw -= (p.clientX - dragging.x) * sens;
    player.pitch = Math.max(-1.2, Math.min(1.2, player.pitch - (p.clientY - dragging.y) * sens));
    player.turnNow += Math.abs(p.clientX - dragging.x) * sens;
    dragging.x = p.clientX; dragging.y = p.clientY;
    if (e.cancelable) e.preventDefault();
  };
  const onUp = () => { dragging = null; };
  lookArea.addEventListener("mousedown", onDown); window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
  lookArea.addEventListener("touchstart", onDown, { passive: false }); lookArea.addEventListener("touchmove", onMove, { passive: false }); lookArea.addEventListener("touchend", onUp);
  lookArea.addEventListener("wheel", (e) => { if (camMode) { zoomBy(e.deltaY < 0 ? 1.12 : 0.9); e.preventDefault(); } }, { passive: false });

  // joystick
  const joy = $("joy"), knob = $("joy-knob"); let joyVec = { x: 0, y: 0 }, joyId = null;
  const joyStart = (e) => { const p = e.touches ? e.touches[0] : e; joyId = e.touches ? p.identifier : -1; joyMove(e); e.preventDefault(); };
  const joyMove = (e) => {
    if (joyId === null) return;
    const p = e.touches ? Array.from(e.touches).find((t) => t.identifier === joyId) : e; if (!p) return;
    const r = joy.getBoundingClientRect(); const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let dx = (p.clientX - cx) / (r.width / 2), dy = (p.clientY - cy) / (r.height / 2);
    const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; }
    joyVec = { x: dx, y: dy }; knob.style.transform = `translate(${dx * 34}px, ${dy * 34}px)`;
    if (e.cancelable) e.preventDefault();
  };
  const joyEnd = () => { joyId = null; joyVec = { x: 0, y: 0 }; knob.style.transform = ""; };
  joy.addEventListener("touchstart", joyStart, { passive: false }); joy.addEventListener("touchmove", joyMove, { passive: false }); joy.addEventListener("touchend", joyEnd);
  joy.addEventListener("mousedown", joyStart); window.addEventListener("mousemove", joyMove); window.addEventListener("mouseup", joyEnd);

  $("btn-camera").addEventListener("click", toggleCamera);
  $("btn-map").addEventListener("click", toggleMap);
  $("btn-sneak").addEventListener("click", () => { player.sneak = !player.sneak; $("btn-sneak").classList.toggle("on", player.sneak); });
  $("btn-dig").addEventListener("click", dig);
  $("shutter").addEventListener("click", shoot);
  $("btn-exit").addEventListener("click", () => exit());
  $("zoom").addEventListener("input", (e) => { focal = +e.target.value; updateZoomLabel(); });
  $("btn-zoom-in").addEventListener("click", () => zoomBy(1.3)); $("btn-zoom-out").addEventListener("click", () => zoomBy(0.77));
  $("bigmap-close").addEventListener("click", toggleMap);
  $("btn-up").addEventListener("touchstart", (e) => { keys.SwimUp = true; e.preventDefault(); }, { passive: false }); $("btn-up").addEventListener("touchend", () => { keys.SwimUp = false; });
  $("btn-down").addEventListener("touchstart", (e) => { keys.SwimDown = true; e.preventDefault(); }, { passive: false }); $("btn-down").addEventListener("touchend", () => { keys.SwimDown = false; });
  $("btn-up").addEventListener("mousedown", () => { keys.SwimUp = true; }); $("btn-down").addEventListener("mousedown", () => { keys.SwimDown = true; });
  window.addEventListener("mouseup", () => { keys.SwimUp = keys.SwimDown = false; });
  root.classList.toggle("underwater", world.underwater);
  root.classList.toggle("touch", isTouch);

  function zoomBy(k) { focal = Math.max(24, Math.min(300, Math.round(focal * k))); $("zoom").value = focal; updateZoomLabel(); }
  function updateZoomLabel() { $("focal").textContent = focal + " mm"; $("focal-kind").textContent = focal < 35 ? "wide" : focal < 85 ? "normal" : focal < 200 ? "telephoto" : "super-tele"; }
  function toggleCamera() {
    camMode = !camMode; root.classList.toggle("cam", camMode);
    $("btn-camera").classList.toggle("on", camMode);
    if (camMode) updateZoomLabel();
    if (window.SFX) SFX.tap && SFX.tap();
  }
  function toggleMap() { mapOpen = !mapOpen; root.classList.toggle("map-open", mapOpen); if (mapOpen) drawBigMap(); }

  /* ---------- the maps ---------- */
  const mini = $("minimap"), miniCtx = mini.getContext("2d");
  const big = $("bigmap"), bigCtx = big.getContext("2d");
  const terrainThumb = (() => {
    const n = 96, c = document.createElement("canvas"); c.width = c.height = n; const g = c.getContext("2d"); const img = g.createImageData(n, n);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const x = (i / (n - 1) - 0.5) * SIZE, z = (j / (n - 1) - 0.5) * SIZE;
      const h = world.heightAt(x, z), s = world.slopeAt(x, z);
      let r, gg, b;
      const B = world.biome.colours;
      const nz = 0.5;
      const col = world.biome.colour(B, h, s, x, z, nz);
      r = col[0] * 255; gg = col[1] * 255; b = col[2] * 255;
      const shade = 0.75 + Math.max(-0.25, Math.min(0.25, (world.heightAt(x - 3, z - 3) - h) * 0.08));
      if (!world.underwater && h < world.waterLevel) { const d = Math.min(1, (world.waterLevel - h) / 8); r = 60 - d * 30; gg = 130 - d * 50; b = 190 - d * 40; }
      else if (world.underwater) { const d = Math.min(1, (world.waterLevel - h) / 25); r = 90 - d * 60; gg = 180 - d * 100; b = 200 - d * 60; }
      else { r *= shade; gg *= shade; b *= shade; }
      const k = (j * n + i) * 4; img.data[k] = r; img.data[k + 1] = gg; img.data[k + 2] = b; img.data[k + 3] = 255;
    }
    g.putImageData(img, 0, 0); return c;
  })();
  function drawMap(ctx, px, full) {
    const w = px;
    ctx.clearRect(0, 0, w, w);
    ctx.imageSmoothingEnabled = true; ctx.drawImage(terrainThumb, 0, 0, w, w);
    const cs = w / GRID;
    ctx.strokeStyle = "rgba(255,255,255,0.55)"; ctx.lineWidth = full ? 1.5 : 1;
    for (let i = 0; i <= GRID; i++) { ctx.beginPath(); ctx.moveTo(i * cs, 0); ctx.lineTo(i * cs, w); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i * cs); ctx.lineTo(w, i * cs); ctx.stroke(); }
    ctx.fillStyle = "#fff"; ctx.font = "bold " + (full ? 15 : 9) + "px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.8)"; ctx.shadowBlur = 3;
    for (let i = 0; i < GRID; i++) { ctx.fillText("ABCDEFGH"[i], i * cs + cs / 2, full ? 10 : 6); ctx.fillText(String(i + 1), full ? 10 : 6, i * cs + cs / 2); }
    ctx.shadowBlur = 0;
    const toXY = (x, z) => [((x / SIZE) + 0.5) * w, ((z / SIZE) + 0.5) * w];
    // landmarks
    ctx.font = (full ? 22 : 12) + "px system-ui, sans-serif";
    for (const L of world.landmarks) {
      if (L.subject === "everest") continue;
      const sub = SUBJECTS[L.subject]; const emoji = sub ? sub.emoji : (L.subject === "wreck" ? "⚓" : L.subject === "temple" ? "🛕" : L.subject === "hut" ? "🛖" : L.subject === "oasis" ? "🌴" : L.subject === "hotspring" ? "♨️" : L.subject === "pirate" ? "🪨" : L.subject === "sledge" ? "🛷" : L.subject === "pyramid2" ? "🔺" : L.subject === "iceberg2" ? "🧊" : "📍");
      if (!full && !sub) continue;
      const [x, y] = toXY(L.pos.x, L.pos.z); ctx.fillText(emoji, x, y);
    }
    // animals you've spotted
    for (const cr of zoo.list) { if (!cr.spotted || !cr.present) continue; const [x, y] = toXY(cr.pos.x, cr.pos.z); ctx.fillText(cr.info.emoji, x, y); }
    // waypoint
    if (waypoint) { const [x, y] = toXY(waypoint.x, waypoint.z); ctx.fillText("🚩", x, y - (full ? 10 : 5)); }
    if (treasureFound) { const [x, y] = toXY(treasurePos.x, treasurePos.z); ctx.fillText(site.treasure.emoji, x, y); }
    // player
    const [px2, py2] = toXY(player.pos.x, player.pos.z);
    ctx.save(); ctx.translate(px2, py2); ctx.rotate(-player.yaw + Math.PI);
    ctx.fillStyle = "#ff4d6d"; ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
    const r = full ? 12 : 7;
    ctx.beginPath(); ctx.moveTo(0, -r * 1.4); ctx.lineTo(r, r); ctx.lineTo(0, r * 0.4); ctx.lineTo(-r, r); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    // north arrow
    ctx.fillStyle = "#fff"; ctx.font = "bold " + (full ? 16 : 10) + "px system-ui, sans-serif"; ctx.fillText("N ↑", w - (full ? 24 : 14), full ? 12 : 8);
  }
  function drawBigMap() {
    const s = Math.min(big.parentElement.clientWidth - 8, 520);
    big.width = s * 2; big.height = s * 2; big.style.width = s + "px"; big.style.height = s + "px";
    bigCtx.setTransform(2, 0, 0, 2, 0, 0); drawMap(bigCtx, s, true);
    $("bigmap-scale").textContent = "One square = " + CELL + " m. The whole map is " + SIZE + " m across — about " + Math.round(SIZE / 100) * 100 + " big steps.";
    $("bigmap-clue").textContent = tier.name === "Pro" ? site.treasure.pro : site.treasure.clue;
    $("bigmap-you").textContent = "You are in square " + gridRef(player.pos.x, player.pos.z) + ", facing " + compassName(headingDeg()) + ".";
  }
  big.addEventListener("click", (e) => {
    const r = big.getBoundingClientRect(); const u = (e.clientX - r.left) / r.width, v = (e.clientY - r.top) / r.height;
    waypoint = new THREE.Vector3((u - 0.5) * SIZE, 0, (v - 0.5) * SIZE);
    drawBigMap(); $("bigmap-you").textContent = "Waypoint set in square " + gridRef(waypoint.x, waypoint.z) + ". The compass will point to it.";
  });
  function gridRef(x, z) { const c = Math.max(0, Math.min(GRID - 1, Math.floor((x + SIZE / 2) / CELL))), r = Math.max(0, Math.min(GRID - 1, Math.floor((z + SIZE / 2) / CELL))); return "ABCDEFGH"[c] + (r + 1); }
  function headingDeg() { let d = (-player.yaw * 180 / Math.PI + 180) % 360; if (d < 0) d += 360; return d; }
  function compassName(d) { return ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(d / 45) % 8]; }

  /* ---------- HUD tasks ---------- */
  function renderTasks() {
    const rows = site.subjects.map((id) => {
      const s = SUBJECTS[id], b = best[id] || 0; const done = b >= tier.passStars;
      return `<li class="${done ? "done" : ""}"><span>${s.emoji}</span> ${s.name} <b>${b ? "★".repeat(b) : ""}</b></li>`;
    });
    rows.push(`<li class="${treasureFound ? "done" : ""}"><span>${site.treasure.emoji}</span> ${site.treasure.name}</li>`);
    hudTasks.innerHTML = rows.join("");
  }
  renderTasks();

  /* ---------- the camera & scoring ---------- */
  const fwd = new THREE.Vector3(), toS = new THREE.Vector3(), ndc = new THREE.Vector3(), crFwd = new THREE.Vector3();
  function visibleSubjects() {
    // every animal and landmark: where is it in the frame, and how big?
    const out = [];
    camera.getWorldDirection(fwd);
    const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const consider = (pos, radius, height, obj) => {
      toS.copy(pos).sub(camera.position); const dist = toS.length();
      if (dist < 0.5) return;
      const dot = toS.clone().normalize().dot(fwd); if (dot < 0.2) return;
      ndc.copy(pos).project(camera);
      const sizeFrac = (height / (dist * tanH)) / 2;               // fraction of frame height
      const rx = (radius / (dist * tanH)) / camera.aspect, ry = sizeFrac / 2;
      if (Math.abs(ndc.x) > 1 + rx || Math.abs(ndc.y) > 1 + ry) return;
      // is a hill in the way?
      let blocked = 0;
      for (let i = 1; i <= 8; i++) { const k = i / 9; const x = camera.position.x + toS.x * k, y = camera.position.y + toS.y * k, z = camera.position.z + toS.z * k; if (world.heightAt(x, z) > y + 0.3) blocked++; }
      if (blocked > 1) return;
      const fogFade = Math.exp(-dist * world.biome.fog * 2.2);
      out.push(Object.assign({ dist, ndcX: ndc.x, ndcY: ndc.y, sizeFrac, cut: Math.max(0, Math.abs(ndc.x) + rx - 1, Math.abs(ndc.y) + ry - 1), fog: fogFade }, obj));
    };
    for (const cr of zoo.list) {
      if (!cr.present) continue;
      const S = cr.spec; const h = cr.height * cr.scale;
      const centre = cr.group.position.clone(); centre.y += (S.rig === "fish" || S.rig === "bird" || S.rig === "flutter") ? 0 : h * 0.5;
      crFwd.set(Math.sin(cr.heading), 0, Math.cos(cr.heading));
      const toCam = camera.position.clone().sub(centre).setY(0).normalize();
      const facing = crFwd.dot(toCam);
      const action = cr.fleeing || cr.breaching || (S.rig === "bird" && cr.flying) || cr.state === "flee";
      consider(centre, cr.radius * cr.scale, Math.max(h, cr.radius * cr.scale * 1.2), { id: cr.id, info: cr.info, facing, action, creature: cr, kindOf: "animal" });
    }
    for (const L of world.landmarks) {
      const info = SUBJECTS[L.subject]; if (!info) continue;
      if (L.subject === "geyser" && !(L.active && L.active())) { consider(L.pos, L.radius, 6, { id: "geyser-quiet", info: null, facing: 0, kindOf: "quiet" }); continue; }
      consider(L.pos, L.radius, L.height, { id: L.subject, info, facing: 0.3, action: L.subject === "geyser", kindOf: "landmark" });
    }
    // the aurora: a sky subject — score it by looking up at the northern sky at night
    if (world.biome.aurora && world.env.isNight) {
      const up = fwd.y, north = -fwd.z;
      if (up > 0.25 && north > 0.3) out.push({ id: "aurora", info: SUBJECTS.aurora, dist: 1000, ndcX: 0, ndcY: 0, sizeFrac: 0.6, cut: 0, fog: 1, facing: 1, action: true, kindOf: "sky" });
    }
    return out;
  }

  function scoreShot() {
    const subs = visibleSubjects().filter((s) => s.info);
    const env = world.env;
    const sunDot = fwd.dot(env.sunDir);
    const blur = Math.min(1, player.speedNow * 0.6 + player.turnNow * 8) * (focal / 60);
    const notes = [], good = [];
    let subject = null, score = 0;
    const shotClockLabel = env.label;

    if (!subs.length) {
      // a landscape
      let s = 40 + env.golden * 30 - env.night * 25 - Math.min(20, blur * 25);
      if (Math.abs(player.pitch) > 0.8) s -= 12;
      if (sunDot > 0.7 && !env.golden) { s -= 10; notes.push("Shooting straight into the sun makes everything dark. Turn so the sun is behind you."); }
      if (env.golden) good.push("Golden-hour light: the whole scene glows.");
      if (env.night) notes.push("It's dark — night pictures come out black without a subject like the northern lights.");
      notes.unshift("No animal or landmark in the frame — a scenery shot. Find a subject to earn more stars.");
      return { subject: null, score: Math.max(5, Math.round(s)), stars: s >= 62 ? 3 : s >= 40 ? 2 : 1, notes, good, label: "Landscape", when: shotClockLabel };
    }
    // the star of the picture: biggest, most central animal wins
    subs.sort((a, b) => (b.sizeFrac * (1 - Math.hypot(b.ndcX, b.ndcY) * 0.3) * (b.info.rare || 1)) - (a.sizeFrac * (1 - Math.hypot(a.ndcX, a.ndcY) * 0.3) * (a.info.rare || 1)));
    subject = subs[0];
    const name = subject.info.name.toLowerCase();
    // size
    const sf = subject.sizeFrac;
    let size;
    if (sf < 0.06) { size = 0.1; notes.push("The " + name + " is only a tiny speck. Get closer, or zoom in with the telephoto."); }
    else if (sf < 0.3) { size = 0.1 + (sf - 0.06) / 0.24 * 0.8; notes.push("A bit small in the frame — zoom in so the " + name + " fills more of the picture."); }
    else if (sf <= 0.95) { size = 1; good.push("The " + name + " fills the frame nicely."); }
    else { size = 0.7; notes.push("So close that part of the " + name + " is cut off. Zoom out a touch."); }
    if (subject.cut > 0.15 && sf > 0.2) { size *= 0.7; notes.push("Part of the " + name + " is outside the frame."); }
    // placement: centre for portraits, or on a rule-of-thirds point
    const px = subject.ndcX, py = subject.ndcY;
    const dThirds = Math.min(...[[-1 / 3, 1 / 3], [1 / 3, 1 / 3], [-1 / 3, -1 / 3], [1 / 3, -1 / 3]].map(([tx, ty]) => Math.hypot(px - tx, py - ty)));
    const dCentre = Math.hypot(px, py);
    const place = Math.max(0, 1 - Math.min(dThirds, dCentre * 0.8) / 0.75);
    if (place > 0.75) good.push(dThirds < dCentre * 0.8 ? "Placed right on a rule-of-thirds line — very pro." : "Nicely centred.");
    else if (place < 0.4) notes.push("The " + name + " is right at the edge. Frame it on one of the grid lines.");
    // the eyes
    const facing = subject.kindOf === "animal" ? (0.55 + 0.45 * Math.max(0, subject.facing)) : 0.85;
    if (subject.kindOf === "animal" && subject.facing > 0.5) good.push("You caught its eyes — photographers love eye contact.");
    else if (subject.kindOf === "animal" && subject.facing < -0.5) notes.push("That's the back end of the " + name + ". Wait for it to turn round.");
    // light
    let light = 1;
    if (subject.kindOf !== "sky") {
      if (env.night) { light = 0.35; notes.push("Too dark! Animals need daylight — or wait for the moon to rise."); }
      else if (sunDot > 0.65) { light = env.golden ? 0.85 : 0.65; notes.push(env.golden ? "Backlit at golden hour — a moody silhouette." : "The sun was in front of you, so the " + name + " is in shadow. Put the sun behind you."); }
      else if (env.golden) { light = 1.15; good.push("Golden-hour light — this is when the pros shoot."); }
      else if (env.label === "day" && env.elevation > 0.9) { light = 0.9; notes.push("Harsh midday light. Early morning and evening are softer."); }
    }
    if (subject.fog < 0.45) { light *= 0.8; notes.push("Haze is washing out the " + name + " — it's too far away."); }
    // sharpness
    let sharp = 1;
    if (blur > 0.5) { sharp = 0.55; notes.push("Blurry! Stand still and hold the camera steady when you press the shutter."); }
    else if (blur > 0.2) { sharp = 0.8; notes.push("A little shaky — stop moving before you shoot."); }
    else good.push("Sharp — you held still.");
    if (focal >= 200 && subject.dist > 60 && blur < 0.2) good.push("Great telephoto work.");
    // put it together
    score = 100 * (size * 0.38 + place * 0.2 + facing * 0.15 + (light / 1.15) * 0.15 + sharp * 0.12);
    if (subject.action) { score *= 1.1; good.push(subject.kindOf === "landmark" ? "You caught the eruption!" : "Action shot!"); }
    if (subject.info.rare >= 3) { score *= 1.12; good.push("A " + name + " — hardly anyone ever gets this picture."); }
    if (subject.creature && subject.creature.breaching) good.push("A breaching whale! Front page.");
    score = Math.max(8, Math.min(100, Math.round(score)));
    let stars = score >= 86 ? 5 : score >= 70 ? 4 : score >= 52 ? 3 : score >= 32 ? 2 : 1;
    if (tier.name === "Little Explorer") stars = Math.max(stars, 3);
    return { subject: subject.id, info: subject.info, score, stars, notes: notes.slice(0, 3), good: good.slice(0, 3), label: subject.info.name, when: shotClockLabel };
  }

  const shotCanvas = document.createElement("canvas");
  function shoot() {
    if (!camMode || t - lastShotAt < 0.6) return;
    lastShotAt = t;
    renderer.render(world.scene, camera);
    const W = 900, H = Math.round(900 / camera.aspect);
    shotCanvas.width = W; shotCanvas.height = H;
    const g = shotCanvas.getContext("2d");
    g.drawImage(renderer.domElement, 0, 0, W, H);
    const dataUrl = shotCanvas.toDataURL("image/jpeg", 0.82);
    const result = scoreShot();
    shots++;
    const photo = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      site: site.id, subject: result.subject, label: result.label, stars: result.stars, score: result.score,
      notes: result.notes, good: result.good, when: result.when, grid: gridRef(player.pos.x, player.pos.z), focal, taken: Date.now(), img: dataUrl
    };
    if (result.subject && SUBJECTS[result.subject]) { best[result.subject] = Math.max(best[result.subject] || 0, result.stars); renderTasks(); }
    flash(); clickSound();
    showShot(photo);
    opts.onPhoto && opts.onPhoto(photo);
  }
  function flash() { const f = $("flash"); f.classList.remove("go"); void f.offsetWidth; f.classList.add("go"); }
  let actx = null;
  function clickSound() {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const b = actx.createBuffer(1, actx.sampleRate * 0.08, actx.sampleRate); const d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3) * (i < 300 ? 1 : 0.3);
      const s = actx.createBufferSource(); s.buffer = b; const gn = actx.createGain(); gn.gain.value = 0.5; s.connect(gn); gn.connect(actx.destination); s.start();
    } catch (e) {}
  }
  function showShot(photo) {
    const card = $("shot-card");
    $("shot-img").src = photo.img;
    $("shot-title").textContent = (photo.info ? photo.info.emoji + " " : "🏞️ ") + photo.label;
    $("shot-stars").textContent = "★".repeat(photo.stars) + "☆".repeat(5 - photo.stars);
    $("shot-score").textContent = photo.score + " / 100";
    $("shot-good").innerHTML = photo.good.map((n) => `<li>✅ ${n}</li>`).join("");
    $("shot-notes").innerHTML = photo.notes.map((n) => `<li>💡 ${n}</li>`).join("");
    const done = photo.subject && photo.stars >= tier.passStars && SUBJECTS[photo.subject];
    $("shot-done").textContent = done ? "Assignment complete: " + SUBJECTS[photo.subject].name + "!" : "";
    card.classList.add("show");
    if (photo.stars >= 4 && window.SFX) SFX.win && SFX.win(); else if (window.SFX) SFX.good && SFX.good();
    if (allDone() && !celebrated) { celebrated = true; setTimeout(() => { window.Confetti && Confetti.burst && Confetti.burst(); $("shot-done").textContent = "🏆 EXPEDITION COMPLETE! Every assignment done. Keep shooting, or head back to the map."; }, 200); }
  }
  let celebrated = false;
  function allDone() { return site.subjects.every((id) => (best[id] || 0) >= tier.passStars) && treasureFound; }
  $("shot-close").addEventListener("click", () => $("shot-card").classList.remove("show"));

  /* ---------- treasure ---------- */
  function dig() {
    const d = player.pos.distanceTo(treasurePos);
    if (treasureFound || d > 7) return;
    treasureFound = true; glint.visible = false;
    renderTasks();
    const tc = $("treasure-card");
    $("treasure-title").textContent = site.treasure.emoji + " " + site.treasure.name;
    $("treasure-fact").textContent = site.treasure.fact;
    tc.classList.add("show");
    window.Confetti && Confetti.burst && Confetti.burst();
    if (window.SFX) SFX.win && SFX.win();
    opts.onTreasure && opts.onTreasure(site.treasure);
    if (allDone() && !celebrated) { celebrated = true; $("treasure-fact").textContent += " 🏆 And that's the whole expedition done!"; }
  }
  $("treasure-close").addEventListener("click", () => $("treasure-card").classList.remove("show"));

  /* ---------- movement ---------- */
  const move = new THREE.Vector3();
  function stepPlayer(dt) {
    let fx = 0, fz = 0;
    if (keys.KeyW || keys.ArrowUp) fz += 1; if (keys.KeyS || keys.ArrowDown) fz -= 1;
    if (keys.KeyA || keys.ArrowLeft) fx -= 1; if (keys.KeyD || keys.ArrowRight) fx += 1;
    fx += joyVec.x; fz -= joyVec.y;
    const m = Math.hypot(fx, fz); if (m > 1) { fx /= m; fz /= m; }
    player.run = !!(keys.ShiftLeft || keys.ShiftRight) || (Math.hypot(joyVec.x, joyVec.y) > 0.92);
    const speed = (world.underwater ? 3.2 : (player.sneak ? 1.6 : player.run ? 7 : 3.6)) * (camMode ? 0.6 : 1);
    const sy = Math.sin(player.yaw), cy = Math.cos(player.yaw);
    move.set((-sy * fz + cy * fx) * speed, 0, (-cy * fz - sy * fx) * speed);
    // note: forward is -z rotated by yaw; yaw=0 looks down -z
    let nx = player.pos.x + move.x * dt, nz = player.pos.z + move.z * dt;
    nx = Math.max(-SIZE / 2 + 6, Math.min(SIZE / 2 - 6, nx)); nz = Math.max(-SIZE / 2 + 6, Math.min(SIZE / 2 - 6, nz));
    // walls: rocks, trunks, landmarks
    for (const c of world.colliders) {
      const dx = nx - c.x, dz = nz - c.z, d = Math.hypot(dx, dz), r = c.r + 0.6;
      if (d < r && d > 0.001) { nx = c.x + dx / d * r; nz = c.z + dz / d * r; }
    }
    const h = world.heightAt(nx, nz);
    if (!world.underwater) {
      if (h < world.waterLevel - 0.7) { nx = player.pos.x; nz = player.pos.z; }     // no deeper than your knees
      const rise = h - world.heightAt(player.pos.x, player.pos.z);
      if (rise > 1.6 * dt * speed + 0.35 && world.slopeAt(nx, nz) > 1.2) { nx = player.pos.x; nz = player.pos.z; }  // too steep
    }
    player.speedNow = Math.hypot(nx - player.pos.x, nz - player.pos.z) / Math.max(dt, 1e-4);
    player.pos.x = nx; player.pos.z = nz;
    if (world.underwater) {
      let vy = 0; if (keys.KeyQ || keys.SwimUp) vy += 1; if (keys.KeyZ || keys.SwimDown) vy -= 1;
      vy += fz * Math.sin(player.pitch) * 0.8;       // swim where you look
      player.swimY += vy * 2.5 * dt;
      const floor = world.heightAt(nx, nz) + 1.4;
      player.swimY = Math.max(floor, Math.min(world.waterLevel - 0.8, player.swimY));
      player.pos.y = player.swimY;
    } else {
      const eye = player.sneak ? EYE_SNEAK : EYE;
      const bob = Math.sin(t * 9) * 0.03 * Math.min(1, player.speedNow / 3);
      player.pos.y = Math.max(h, world.waterLevel - 0.7) + eye + bob;
    }
    camera.position.copy(player.pos);
    camera.rotation.set(0, 0, 0, "YXZ"); camera.rotation.y = player.yaw; camera.rotation.x = player.pitch;
    const wantFov = camMode ? THREE.MathUtils.radToDeg(2 * Math.atan(12 / focal)) : 68;
    if (Math.abs(camera.fov - wantFov) > 0.01) { camera.fov += (wantFov - camera.fov) * Math.min(1, dt * 10); camera.updateProjectionMatrix(); }
  }

  /* ---------- HUD ---------- */
  const compassEl = $("compass-strip"), clockEl = $("hud-clock"), gridEl = $("hud-grid"), hintEl = $("hud-hint"), subjEl = $("vf-subject"), wpEl = $("hud-waypoint");
  let hudTimer = 0;
  function clockLabel() {
    const d = clock % 1.25; let hrs;
    if (d <= 1) hrs = 6 + d * 12; else hrs = 18 + (d - 1) / 0.25 * 12;
    hrs = hrs % 24; const h = Math.floor(hrs), m = Math.floor((hrs - h) * 60);
    const ap = h >= 12 ? "pm" : "am"; const h12 = ((h + 11) % 12) + 1;
    return h12 + ":" + (m < 10 ? "0" : "") + m + " " + ap;
  }
  function updateHUD(dt) {
    hudTimer -= dt; if (hudTimer > 0) return; hudTimer = 0.12;
    const hd = headingDeg();
    const env = world.env;
    clockEl.textContent = clockLabel() + " · " + (env.label === "dawn" ? "🌅 golden hour" : env.label === "dusk" ? "🌇 golden hour" : env.label === "night" ? "🌙 night" : "☀️ day");
    gridEl.textContent = "Square " + gridRef(player.pos.x, player.pos.z) + " · " + Math.round(hd) + "° " + compassName(hd);
    // compass strip
    let html = "";
    for (let off = -90; off <= 90; off += 15) {
      let deg = (hd + off + 360) % 360; const x = 50 + off / 90 * 50;
      const label = deg % 90 === 0 ? ["N", "E", "S", "W"][Math.round(deg / 90) % 4] : (deg % 45 === 0 ? ["NE", "SE", "SW", "NW"][Math.floor(deg / 90) % 4] : "|");
      html += `<span style="left:${x}%" class="${label.length <= 2 && label !== "|" ? "big" : ""}">${label}</span>`;
    }
    if (waypoint) { let b = Math.atan2(waypoint.x - player.pos.x, -(waypoint.z - player.pos.z)) * 180 / Math.PI; b = (b + 360) % 360; let rel = ((b - hd + 540) % 360) - 180; if (Math.abs(rel) <= 90) html += `<span style="left:${50 + rel / 90 * 50}%" class="wp">🚩</span>`; wpEl.textContent = "🚩 " + Math.round(Math.hypot(waypoint.x - player.pos.x, waypoint.z - player.pos.z)) + " m"; }
    else wpEl.textContent = "";
    compassEl.innerHTML = html;
    const dT = player.pos.distanceTo(treasurePos);
    $("btn-dig").classList.toggle("show", !treasureFound && dT < 7);
    if (!treasureFound && dT < 30) hintEl.textContent = dT < 7 ? "✨ Something is buried right here! Press DIG." : "✨ Something glints nearby…";
    else hintEl.textContent = "";
    if (camMode) {
      const subs = visibleSubjects().filter((s) => s.info);
      subs.sort((a, b) => b.sizeFrac - a.sizeFrac);
      subjEl.textContent = subs.length ? subs[0].info.emoji + " " + subs[0].info.name + " · " + Math.round(subs[0].dist) + " m" : "";
    }
  }

  /* ---------- main loop ---------- */
  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    if (!mapOpen && !$("shot-card").classList.contains("show")) {
      clock += dt / ((clock % 1.25) <= 1 ? DAY_SECONDS : NIGHT_SECONDS * 4);
      stepPlayer(dt);
      zoo.update(dt, t, player.pos, world.env, player.sneak, player.run && player.speedNow > 1);
    }
    world.update(dt, t, clock, player.pos);
    renderer.toneMappingExposure = 1.05 - world.env.night * 0.35 + (world.underwater ? 0.1 : 0);
    glint.scale.setScalar(1 + Math.sin(t * 5) * 0.4);
    updateHUD(dt);
    player.turnNow *= Math.pow(0.02, dt);
    renderer.render(world.scene, camera);
    if (!mapOpen) drawMap(miniCtx, mini.width, false);
    requestAnimationFrame(frame);
  }
  mini.width = mini.height = 150;
  requestAnimationFrame(frame);

  function exit() {
    running = false;
    window.removeEventListener("keydown", onKey); window.removeEventListener("keyup", onKey);
    window.removeEventListener("resize", resize);
    root.classList.remove("cam", "map-open");
    $("shot-card").classList.remove("show"); $("treasure-card").classList.remove("show");
    world.dispose(); renderer.dispose();
    opts.onExit && opts.onExit({ shots, best, treasureFound });
  }
  return { exit, get best() { return best; }, world, zoo, player, shoot, toggleCamera };
}
