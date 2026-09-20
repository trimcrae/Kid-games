/* ===========================================================
   Photo Expedition — the game shell.
   -----------------------------------------------------------
   Screens: who's exploring → the world map (hub) → the field
   guide for one expedition → the 3D expedition itself (loaded on
   demand from expedition.mjs) → the album and the magazine cover.

   Saves per explorer in localStorage:
     unlocked   which expeditions are open
     stars      { siteId: { subjectId: bestStars } }
     treasures  [siteId…]
     route      the order the sites were visited (drawn on the map)
     photos     up to 48 shots, newest first, as small JPEG data URLs
   =========================================================== */
(function () {
  "use strict";
  const SAVE_KEY = "photo-expedition.v1";
  const MAX_PHOTOS = 40;   // ~60 KB each, well inside localStorage
  const $ = (id) => document.getElementById(id);

  let save = load();
  let explorer = null, tier = null, prof = null;       // current explorer & their profile
  let currentSite = null, expedition = null, question = null;

  /* ---------------- saving ---------------- */
  function load() {
    try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || { explorers: {} }; } catch (e) { return { explorers: {} }; }
  }
  function persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); }
    catch (e) {
      // out of room: drop the weakest old photos and try again
      for (const p of Object.values(save.explorers)) { p.photos.sort((a, b) => b.stars - a.stars || b.taken - a.taken); p.photos = p.photos.slice(0, Math.max(6, Math.floor(p.photos.length / 2))); }
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e2) {}
    }
  }
  function profile(id) {
    if (!save.explorers[id]) save.explorers[id] = { unlocked: ["serengeti"], stars: {}, treasures: [], route: [], photos: [], visits: {} };
    const p = save.explorers[id];
    p.visits = p.visits || {};
    return p;
  }
  function siteStars(siteId) { const s = prof.stars[siteId] || {}; return Object.values(s).reduce((a, b) => a + b, 0) + (prof.treasures.includes(siteId) ? 3 : 0); }
  function totalStars() { return SITES.reduce((a, s) => a + siteStars(s.id), 0); }
  function siteDone(site) { return site.subjects.every((id) => ((prof.stars[site.id] || {})[id] || 0) >= tier.passStars) && prof.treasures.includes(site.id); }
  function rankFor(stars) { let r = RANKS[0]; for (const x of RANKS) if (stars >= x[0]) r = x; return r; }
  function isUnlocked(site) { return !tier.gates || prof.unlocked.includes(site.id); }

  /* ---------------- screens ---------------- */
  function show(id) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("show", s.id === id));
    window.scrollTo(0, 0);
    if (id === "s-map") { WorldMap.refresh(); refreshMapState(); }
  }

  /* ---------------- start ---------------- */
  function renderPicker() {
    const grid = $("explorer-picker"); grid.innerHTML = "";
    for (const e of EXPLORERS) {
      const p = save.explorers[e.id];
      const stars = p ? SITES.reduce((a, s) => a + Object.values(p.stars[s.id] || {}).reduce((x, y) => x + y, 0) + (p.treasures.includes(s.id) ? 3 : 0), 0) : 0;
      const b = document.createElement("button");
      b.className = "explorer-btn";
      b.innerHTML = `<span class="e">${e.emoji}</span><span class="n">${e.name}</span><span class="t">${TIERS[e.tier].name}</span><span class="s">${p ? "★ " + stars + " · " + rankFor(stars)[1] : "New explorer"}</span>`;
      b.addEventListener("click", () => pickExplorer(e));
      grid.appendChild(b);
    }
  }
  function pickExplorer(e) {
    explorer = e; tier = TIERS[e.tier]; prof = profile(e.id);
    save.last = e.id; persist();
    $("who-name").textContent = e.name;
    show("s-map");
  }

  /* ---------------- the world map ---------------- */
  WorldMap.init($("worldmap"), { onPick: openSite, onTap: answerTap });
  function refreshMapState() {
    const stars = {}; for (const s of SITES) stars[s.id] = siteStars(s.id);
    const done = new Set(SITES.filter(siteDone).map((s) => s.id));
    WorldMap.setState({ unlocked: new Set(tier.gates ? prof.unlocked : SITES.map((s) => s.id)), stars, done, current: currentSite ? currentSite.id : null, route: prof.route, question });
    const total = totalStars(); const r = rankFor(total);
    $("rank-emoji").textContent = r[2]; $("rank-name").textContent = r[1]; $("total-stars").textContent = total;
    $("album-count").textContent = prof.photos.length ? "(" + prof.photos.length + ")" : "";
  }
  function fmtKm(km) { return Math.round(km).toLocaleString("en-US") + " km (" + Math.round(km * 0.621).toLocaleString("en-US") + " miles)"; }
  function openSite(site) {
    if (question) return;
    currentSite = site;
    const panel = $("site-panel");
    const unlocked = isUnlocked(site);
    const stars = siteStars(site.id);
    const from = prof.route.length ? WorldMap.siteById(prof.route[prof.route.length - 1]) : null;
    const dist = from && from.id !== site.id ? WorldMap.distanceKm(from, site) : null;
    const chips = site.subjects.map((id) => { const s = SUBJECTS[id]; const b = (prof.stars[site.id] || {})[id] || 0; return `<span class="chip ${b >= tier.passStars ? "done" : ""}">${s.emoji} ${s.name}${b ? ` <span class="st">${"★".repeat(b)}</span>` : ""}</span>`; }).join("") +
      `<span class="chip ${prof.treasures.includes(site.id) ? "done" : ""}">${site.treasure.emoji} ${site.treasure.name}</span>`;
    let gate = "";
    if (!unlocked) {
      const need = site.gate.stars, have = totalStars();
      gate = `<div class="locked">🔒 <b>Locked.</b> ${have >= need ? "You have enough stars! Answer a map question to unlock it." : `Earn <b>${need - have}</b> more ★ on the expeditions you've unlocked (you have ${have} of ${need}).`}</div>`;
    }
    panel.innerHTML = `
      <div class="site-head"><span class="big">${site.emoji}</span><div><h2>${site.name}</h2><div class="place">${site.flag} ${site.place}</div></div></div>
      <div><span class="coords">${WorldMap.fmtCoord(site.lat, site.lon)}</span><span class="coords">${CONTINENTS[site.continent].name}</span>${dist != null ? `<span class="coords">✈️ from ${from.name.replace(/^The /, "")}: ${fmtKm(dist)} · about ${Math.max(1, Math.round(dist / 850))} h flying</span>` : ""}</div>
      <p>${site.intro}</p>
      <div class="site-facts"><span>★ ${stars} earned here</span><span>${site.subjects.length} photo assignments</span><span>${site.treasure.emoji} 1 treasure</span></div>
      <div class="subject-chips">${chips}</div>
      ${gate}
      ${unlocked ? `<button class="btn-big" id="btn-brief">📓 Open the field guide</button>` : (totalStars() >= site.gate.stars ? `<button class="btn-big" id="btn-unlock">🔑 Unlock it</button>` : "")}`;
    const bb = $("btn-brief"); if (bb) bb.addEventListener("click", () => openBrief(site));
    const bu = $("btn-unlock"); if (bu) bu.addEventListener("click", () => askQuestion(site));
    refreshMapState();
    panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  /* unlocking: tap the continent (Explorer) or the 10° grid square (Pro) */
  function askQuestion(site) {
    const pro = tier.name === "Pro";
    question = { type: pro ? "coord" : "continent", site, hideSite: pro ? site.id : null, tries: 0 };
    const q = $("map-question"); q.classList.remove("hidden");
    $("mq-text").textContent = pro
      ? `🧭 ${site.name} is at ${WorldMap.fmtCoord(site.lat, site.lon)}. Tap the 10° grid square on the map that contains it.`
      : `🧭 ${site.name} is in ${CONTINENTS[site.continent].name}. Tap ${CONTINENTS[site.continent].name} on the map to unlock the expedition!`;
    $("mq-feedback").textContent = ""; $("mq-feedback").className = "feedback";
    refreshMapState();
    q.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  function answerTap(lon, lat) {
    if (!question) return;
    const site = question.site; let ok;
    if (question.type === "coord") ok = Math.floor(lon / 10) === Math.floor(site.lon / 10) && Math.floor(lat / 10) === Math.floor(site.lat / 10);
    else ok = WorldMap.continentAt(lon, lat) === site.continent;
    const fb = $("mq-feedback");
    if (ok) {
      fb.textContent = "✅ That's it! " + site.name + " is unlocked."; fb.className = "feedback ok";
      prof.unlocked.push(site.id); persist();
      window.SFX && SFX.win(); window.Confetti && Confetti.burst({ count: 90 });
      question = null;
      setTimeout(() => { $("map-question").classList.add("hidden"); openSite(site); }, 900);
    } else {
      question.tries++;
      const where = WorldMap.continentAt(lon, lat);
      fb.textContent = question.type === "coord"
        ? `❌ That square is around ${WorldMap.fmtCoord(Math.floor(lat / 10) * 10 + 5, Math.floor(lon / 10) * 10 + 5)}. ${site.lat < 0 ? "S means SOUTH of the equator" : "N means NORTH of the equator"}, ${site.lon < 0 ? "W means WEST of the 0° line" : "E means EAST of the 0° line"}.`
        : `❌ That's ${where ? CONTINENTS[where].name : "the ocean"}. ${hintFor(site.continent)}`;
      fb.className = "feedback no";
      window.SFX && SFX.nope();
      refreshMapState();
    }
  }
  function hintFor(c) {
    return { africa: "Africa is the big continent under Europe, with the Sahara at the top.", asia: "Asia is the biggest continent, on the right-hand side of the map.", europe: "Europe is the small continent above Africa.", namerica: "North America is at the top left, above the equator.", samerica: "South America is the long continent at the bottom left, under the equator.", oceania: "Oceania is Australia and its islands, at the bottom right.", antarctica: "Antarctica is the white continent along the very bottom of the map." }[c];
  }

  /* ---------------- the field guide ---------------- */
  function photoBlock(id, emoji, big) {
    const m = window.PHOTO_MANIFEST && PHOTO_MANIFEST[id];
    if (m) {
      const lic = m.licenseUrl ? `<a href="${m.licenseUrl}" target="_blank" rel="noopener">${m.license}</a>` : m.license;
      return `<img src="photos/${m.file}" alt="${m.title}" loading="lazy" /><div class="credit">📷 ${escapeHtml(m.artist || "Wikimedia Commons")} · ${lic} · <a href="${m.page}" target="_blank" rel="noopener">source</a></div>`;
    }
    return `<div class="placeholder"><span class="pe">${emoji}</span>${big ? "Real photograph on its way" : "Photo coming"}<small>The expedition team is still developing the film.</small></div>`;
  }
  function escapeHtml(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
  function whenLabel(w) { return { any: "any time", day: "daytime", dawn: "dawn & dusk", dusk: "dusk & night", night: "night" }[w] || w; }
  function openBrief(site) {
    currentSite = site;
    $("brief-place").textContent = site.flag + " " + site.name + " · " + WorldMap.fmtCoord(site.lat, site.lon);
    $("brief-hero").innerHTML = photoBlock("site-" + site.id, site.emoji, true);
    $("brief-title").textContent = site.emoji + " " + site.name;
    $("brief-intro").textContent = site.intro;
    $("brief-tip").textContent = "📷 Pro tip: " + site.tip;
    $("brief-meta").innerHTML = `<span>📍 ${site.country}, ${CONTINENTS[site.continent].name}</span><span>🌐 ${WorldMap.fmtCoord(site.lat, site.lon)}</span><span>🎯 Pass mark: ${"★".repeat(tier.passStars)} per assignment (${tier.name})</span>`;
    $("guide").innerHTML = site.subjects.map((id) => {
      const s = SUBJECTS[id]; const b = (prof.stars[site.id] || {})[id] || 0;
      return `<div class="guide-card"><div class="guide-photo">${photoBlock(id, s.emoji)}</div><div class="guide-body">
        <h4><span>${s.emoji} ${s.name}</span><span class="st">${b ? "★".repeat(b) : (b >= tier.passStars ? "" : "")}</span></h4>
        <span class="when">🕒 ${whenLabel(s.when)}</span>${s.rare >= 3 ? `<span class="when rare">💎 rare</span>` : s.rare === 2 ? `<span class="when">🔍 shy</span>` : ""}
        <p>${s.fact}</p><p class="tip">📷 ${s.tip}</p></div></div>`;
    }).join("");
    $("brief-treasure").innerHTML = `<h3>${site.treasure.emoji} Treasure: ${site.treasure.name} ${prof.treasures.includes(site.id) ? "✅ found" : ""}</h3><p>${tier.name === "Pro" ? site.treasure.pro : site.treasure.clue}</p><p class="muted">Open the map with <b>M</b> in the expedition to read the clue again and plant a waypoint.</p>`;
    show("s-brief");
  }

  /* ---------------- the expedition ---------------- */
  async function startExpedition(site) {
    const root = $("s-world");
    show("s-world");
    root.classList.add("loading");
    try {
      const [THREE, mod] = await Promise.all([import("../../assets/vendor/three/three.module.min.js"), import("./expedition.mjs")]);
      if (!prof.route.length || prof.route[prof.route.length - 1] !== site.id) prof.route.push(site.id);
      prof.visits[site.id] = (prof.visits[site.id] || 0) + 1; persist();
      expedition = await mod.startExpedition({
        THREE, site, tier, explorer, root,
        onPhoto(photo) {
          prof.photos.unshift(photo);
          if (prof.photos.length > MAX_PHOTOS) { const idx = prof.photos.slice(12).reduce((w, p, i) => (p.stars < prof.photos[w + 12].stars ? i : w), 0) + 12; prof.photos.splice(idx, 1); }
          if (photo.subject && SUBJECTS[photo.subject]) { prof.stars[site.id] = prof.stars[site.id] || {}; prof.stars[site.id][photo.subject] = Math.max(prof.stars[site.id][photo.subject] || 0, photo.stars); }
          persist();
        },
        onTreasure() { if (!prof.treasures.includes(site.id)) prof.treasures.push(site.id); persist(); },
        onExit(summary) { expedition = null; root.classList.remove("loading"); openBrief(site); show("s-map"); openSite(site); }
      });
      // the expedition module is loaded: give the 3D scene the whole screen
      root.classList.remove("loading");
      // a pre-existing best score for this site shows in the HUD checklist
      const bestHere = prof.stars[site.id] || {};
      for (const k in bestHere) expedition.best[k] = bestHere[k];
    } catch (e) {
      console.error(e);
      root.classList.remove("loading");
      alert("The 3D expedition couldn't start on this device (" + (e && e.message ? e.message : e) + "). Try a different browser or a bigger screen.");
      show("s-brief");
    }
  }
  window.PhotoExpedition = { get expedition() { return expedition; }, get profile() { return prof; }, startExpedition, openBrief, pickExplorer, show, get save() { return save; } };

  /* ---------------- the album ---------------- */
  function openAlbum() {
    $("album-title").textContent = explorer.name + "'s album";
    const grid = $("album-grid"); grid.innerHTML = "";
    $("album-empty").classList.toggle("hidden", prof.photos.length > 0);
    for (const p of prof.photos) {
      const b = document.createElement("button"); b.className = "album-item";
      const site = WorldMap.siteById(p.site);
      b.innerHTML = `<img src="${p.img}" alt="${p.label}" loading="lazy" /><div class="cap"><span>${(p.subject && SUBJECTS[p.subject] ? SUBJECTS[p.subject].emoji : "🏞️")} ${p.label}</span><span class="st">${"★".repeat(p.stars)}</span></div>`;
      b.addEventListener("click", () => openViewer(p));
      grid.appendChild(b);
    }
    show("s-album");
  }
  let viewing = null;
  function openViewer(p) {
    viewing = p;
    const site = WorldMap.siteById(p.site); const sub = p.subject && SUBJECTS[p.subject];
    $("v-img").src = p.img;
    $("v-meta").textContent = `${site ? site.name : ""} · square ${p.grid} · ${p.focal} mm · ${p.when}`;
    $("v-title").textContent = (sub ? sub.emoji + " " : "🏞️ ") + p.label + (site ? " — " + site.name : "");
    $("v-stars").textContent = "★".repeat(p.stars) + "☆".repeat(5 - p.stars); $("v-score").textContent = p.score + " / 100";
    $("v-good").innerHTML = (p.good || []).map((n) => `<li>✅ ${n}</li>`).join("");
    $("v-notes").innerHTML = (p.notes || []).map((n) => `<li>💡 ${n}</li>`).join("");
    $("v-fact").textContent = sub ? "📓 " + sub.fact : (site ? "📓 " + site.intro : "");
    const fig = $("v-pro-fig");
    if (sub) { fig.classList.remove("hidden"); $("v-pro").innerHTML = photoBlock(p.subject, sub.emoji); $("v-pro-cap").textContent = "How a pro shot it"; }
    else fig.classList.add("hidden");
    $("v-save").href = p.img; $("v-save").download = (p.label + "-" + p.grid).toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".jpg";
    $("viewer").classList.add("show");
  }
  $("v-close").addEventListener("click", () => $("viewer").classList.remove("show"));
  $("v-delete").addEventListener("click", () => { if (!viewing) return; if (!confirm("Delete this photo?")) return; prof.photos = prof.photos.filter((x) => x.id !== viewing.id); persist(); $("viewer").classList.remove("show"); openAlbum(); });
  $("v-cover").addEventListener("click", () => { $("viewer").classList.remove("show"); openCover(viewing); });
  $("btn-cover").addEventListener("click", () => { const best = prof.photos.slice().sort((a, b) => b.stars - a.stars || b.score - a.score)[0]; if (best) openCover(best); else alert("Take a photo first!"); });

  /* ---------------- the magazine cover ---------------- */
  let coverPhoto = null;
  function openCover(p) {
    coverPhoto = p;
    const site = WorldMap.siteById(p.site);
    $("cover-headline").value = (p.subject && SUBJECTS[p.subject] ? SUBJECTS[p.subject].name.toUpperCase() : (site ? site.name.replace(/^The /, "").toUpperCase() : "WILD")).slice(0, 40);
    $("cover-by").value = explorer.name;
    $("cover").classList.add("show");
    drawCover();
  }
  function drawCover() {
    const c = $("cover-canvas"), g = c.getContext("2d"); const W = c.width, H = c.height;
    const img = new Image();
    img.onload = () => {
      g.fillStyle = "#111"; g.fillRect(0, 0, W, H);
      // cover the page with the photo
      const s = Math.max(W / img.width, H / img.height); const w = img.width * s, h = img.height * s;
      g.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
      // a dark wash at the bottom so the words read
      const grad = g.createLinearGradient(0, H * 0.55, 0, H); grad.addColorStop(0, "rgba(0,0,0,0)"); grad.addColorStop(1, "rgba(0,0,0,0.75)");
      g.fillStyle = grad; g.fillRect(0, 0, W, H);
      const top = g.createLinearGradient(0, 0, 0, H * 0.3); top.addColorStop(0, "rgba(0,0,0,0.55)"); top.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = top; g.fillRect(0, 0, W, H * 0.3);
      // the frame
      g.lineWidth = 28; g.strokeStyle = "#1f6f5f"; g.strokeRect(14, 14, W - 28, H - 28);
      // masthead
      g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "top";
      g.font = "900 96px 'Trebuchet MS', 'Segoe UI', system-ui, sans-serif";
      g.fillText("THE EXPLORER'S", W / 2, 50);
      g.fillText("JOURNAL", W / 2, 150);
      g.font = "700 30px 'Trebuchet MS', system-ui, sans-serif"; g.fillStyle = "#ffd166";
      const site = WorldMap.siteById(coverPhoto.site);
      const d = new Date(coverPhoto.taken);
      g.fillText((site ? site.name.toUpperCase() + "  ·  " : "") + d.toLocaleDateString("en-US", { month: "long", year: "numeric" }).toUpperCase(), W / 2, 262);
      // headline
      const head = ($("cover-headline").value || "WILD").toUpperCase();
      g.fillStyle = "#fff"; g.textAlign = "left"; g.textBaseline = "alphabetic";
      let size = 110; g.font = `900 ${size}px 'Trebuchet MS', system-ui, sans-serif`;
      while (g.measureText(head).width > W - 120 && size > 40) { size -= 6; g.font = `900 ${size}px 'Trebuchet MS', system-ui, sans-serif`; }
      g.shadowColor = "rgba(0,0,0,0.6)"; g.shadowBlur = 12;
      g.fillText(head, 60, H - 210);
      g.font = "700 38px 'Trebuchet MS', system-ui, sans-serif"; g.fillStyle = "#ffd166";
      g.fillText("Photograph by " + ($("cover-by").value || explorer.name), 60, H - 140);
      g.font = "400 30px 'Trebuchet MS', system-ui, sans-serif"; g.fillStyle = "#fff";
      g.fillText("★".repeat(coverPhoto.stars) + "  " + (coverPhoto.label || "") + " · " + coverPhoto.focal + " mm · square " + coverPhoto.grid, 60, H - 85);
      g.shadowBlur = 0;
      $("cover-save").href = c.toDataURL("image/jpeg", 0.9);
    };
    img.src = coverPhoto.img;
  }
  $("cover-headline").addEventListener("input", drawCover); $("cover-by").addEventListener("input", drawCover);
  $("cover-close").addEventListener("click", () => $("cover").classList.remove("show"));

  /* ---------------- wiring ---------------- */
  $("btn-change").addEventListener("click", () => { renderPicker(); show("s-start"); });
  $("btn-album").addEventListener("click", openAlbum);
  $("brief-album").addEventListener("click", openAlbum);
  $("album-back").addEventListener("click", () => show(currentSite ? "s-brief" : "s-map"));
  $("brief-back").addEventListener("click", () => { show("s-map"); if (currentSite) openSite(currentSite); });
  $("brief-go").addEventListener("click", () => startExpedition(currentSite));
  $("brief-go2").addEventListener("click", () => startExpedition(currentSite));

  renderPicker();
  // straight back in for whoever played last
  if (save.last && EXPLORERS.find((e) => e.id === save.last) && location.hash !== "#pick") pickExplorer(EXPLORERS.find((e) => e.id === save.last));
})();
