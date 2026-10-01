#!/usr/bin/env node
"use strict";

// Real WebGL checks of the code-built wildlife, pets and worlds. Evidence is
// private; run with CHROMIUM_PATH=/usr/bin/chromium node tests/three-model-visuals.cjs.
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");
const { chromium } = require("playwright-core");
const ROOT = path.resolve(__dirname, "..");
const OUT = process.env.THREE_VISUAL_DIR || "/tmp/kid-games-visuals/validation";
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".json": "application/json", ".mp3": "audio/mpeg", ".gz": "application/gzip" };

async function startServer() {
  const server = http.createServer(async (req, res) => {
    try {
      let pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
      if (pathname === "/__three_visual_test__.html") {
        res.writeHead(200, { "Content-Type": "text/html" }).end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><title>Private model checks</title><style>body{margin:0;background:#d9ddd7}canvas{display:block}</style>');
        return;
      }
      if (pathname.endsWith("/")) pathname += "index.html";
      const file = path.resolve(ROOT, "." + pathname);
      if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403).end(); return; }
      const data = await fs.readFile(file);
      res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" }).end(data);
    } catch (_) { res.writeHead(404).end(); }
  });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  return server;
}

async function modelChecks(page, base) {
  await page.goto(base + "/__three_visual_test__.html");
  await page.addScriptTag({ url: base + "/games/photo-expedition/data.js" });
  await page.addScriptTag({ url: base + "/games/craepets/lines.js" });
  await page.addScriptTag({ url: base + "/games/craepets/data.js" });
  return page.evaluate(async () => {
    const THREE = await import("/assets/vendor/three/three.module.min.js");
    const wildlife = await import("/games/photo-expedition/creatures.mjs");
    const { buildWorld } = await import("/games/photo-expedition/world.mjs");
    const { updateWalk } = await import("/games/photo-expedition/locomotion.mjs");
    const housePets = await import("/house-test/creatures.mjs");
    const { furnishing } = await import("/house-test/furnishings.mjs");
    const check = (condition, label) => { if (!condition) throw Error(label); };
    const finite = (values, label) => { for (const value of values) check(Number.isFinite(value), label + " contains a non-finite number"); };
    function inspect(root, label) {
      let meshes = 0, triangles = 0;
      root.updateMatrixWorld(true);
      root.traverse(object => {
        finite(object.matrixWorld.elements, label + " transform");
        if (!object.isMesh) return;
        meshes++;
        const geometry = object.geometry;
        check(geometry?.attributes.position?.count > 0, label + " has an empty mesh");
        for (const [name, attribute] of Object.entries(geometry.attributes)) finite(attribute.array, label + " " + name);
        if (geometry.index) for (const index of geometry.index.array) check(index >= 0 && index < geometry.attributes.position.count, label + " has an invalid vertex index");
        triangles += (geometry.index?.count || geometry.attributes.position.count) / 3;
        for (const material of [object.material].flat()) {
          check(material?.isMaterial, label + " has no material");
          for (const field of ["roughness", "metalness", "opacity", "emissiveIntensity"]) if (field in material) check(Number.isFinite(material[field]), label + " invalid " + field);
          for (const field of ["color", "emissive"]) if (material[field]) finite(material[field].toArray(), label + " " + field);
          for (const value of Object.values(material)) if (value?.isTexture) check(value.image && value.image.width > 0 && value.image.height > 0, label + " has an empty texture");
        }
        if (object.isSkinnedMesh) {
          const indices = geometry.getAttribute("skinIndex"), weights = geometry.getAttribute("skinWeight");
          check(indices && weights && object.skeleton?.bones.length, label + " has no skinning data");
          for (let i = 0; i < weights.count; i++) {
            let sum = 0;
            for (let j = 0; j < 4; j++) {
              const weight = weights.array[i * 4 + j], bone = indices.array[i * 4 + j];
              check(weight >= 0 && bone < object.skeleton.bones.length, label + " has invalid bone weights");
              sum += weight;
            }
            check(Math.abs(sum - 1) < .001, label + " bone weights are not normalized");
          }
        }
      });
      const box = new THREE.Box3().setFromObject(root);
      finite([...box.min.toArray(), ...box.max.toArray()], label + " bounds");
      const size = box.getSize(new THREE.Vector3());
      check(size.x > 0 && size.y > 0 && size.z > 0, label + " has empty bounds");
      return { meshes, triangles, size: size.toArray() };
    }
    function resources(root) {
      const set = new Set();
      root.traverse(object => {
        if (object.geometry) set.add(object.geometry);
        for (const material of [object.material].flat().filter(Boolean)) {
          set.add(material);
          for (const value of Object.values(material)) if (value?.isTexture) set.add(value);
        }
      });
      return set;
    }
    function disposeOwned(root) { for (const resource of resources(root)) resource.dispose(); root.removeFromParent(); }
    function verifyDisposal(root, dispose, label, exclude = () => false) {
      const owned = [...resources(root)].filter(resource => !exclude(resource)), freed = new Set();
      for (const resource of owned) resource.addEventListener("dispose", () => freed.add(resource));
      dispose();
      check(freed.size === owned.length, label + " did not free " + (owned.length - freed.size) + " owned resources");
    }
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(640, 400); renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05; document.body.append(renderer.domElement);
    const stage = new THREE.Scene(); stage.background = new THREE.Color("#d9ddd7");
    stage.add(new THREE.HemisphereLight("#ecf4ff", "#88715c", 2));
    const sun = new THREE.DirectionalLight("#fff0df", 3); sun.position.set(4, 7, 5); stage.add(sun);
    function portrait(root) {
      stage.add(root);
      const box = new THREE.Box3().setFromObject(root), extent = Math.max(...box.getSize(new THREE.Vector3()).toArray());
      const centre = box.getCenter(new THREE.Vector3()), camera = new THREE.PerspectiveCamera(36, 1.6, .005, extent * 30);
      camera.position.copy(centre).add(new THREE.Vector3(1, .45, 1.4).normalize().multiplyScalar(extent * 2.15)); camera.lookAt(centre);
      renderer.render(stage, camera);
      const metric = { draws: renderer.info.render.calls, renderedTriangles: renderer.info.render.triangles };
      check(metric.draws > 0 && metric.renderedTriangles > 0, "A model did not render");
      root.removeFromParent(); return metric;
    }
    const species = [...new Set(SITES.flatMap(site => site.subjects))].filter(id => ["animal", "bird", "swimmer", "flutter"].includes(SUBJECTS[id].kind));
    const animals = [];
    for (const id of species) {
      const creature = wildlife.makeCreature(THREE, id), metric = inspect(creature.group, id);
      if (creature.parts.walk) {
        Object.assign(creature, { scale: 1, heading: 0, pos: new THREE.Vector3(), fleeing: false, seed: 0 });
        for (let i = 0; i < 90; i++) {
          creature.pos.z += Math.min(creature.spec.speed, creature.spec.sh * 1.8) / 60;
          creature.group.position.copy(creature.pos);
          updateWalk(THREE, creature, 1 / 60, () => 0);
          creature.group.updateMatrixWorld(true);
          creature.group.traverse(object => finite(object.matrixWorld.elements, id + " walking transform"));
        }
      }
      animals.push({ id, ...metric, ...portrait(creature.group) });
      verifyDisposal(creature.group, () => disposeOwned(creature.group), id);
      check(renderer.info.memory.geometries === 0, id + " left rendered geometry allocated");
    }
    const pets = [];
    const speciesPets = ["craepet", "snorbit", "puddlepop", "flarn", "twiggle", "glimmr", "zibbit", "blorb", "cat"];
    const petpets = ["duckling", "snail", "blobbin", "moth", "kit", "hedge", "wisp", "starling"];
    for (const id of [...speciesPets, "egg", ...petpets]) {
      const root = petpets.includes(id) ? housePets.petpet(id) : housePets.creature({ species: id === "egg" ? "blorb" : id, egg: id === "egg", wear: id === "flarn" ? { head: "partyhat", neck: "scarf" } : {} });
      if (!petpets.includes(id)) root.scale.setScalar(housePets.PET_SCALE);
      const rig = root.userData.rig;
      check(rig?.skeleton, id + " has no creature rig");
      const metric = inspect(root, id);
      for (const pose of [{}, { sit: 1 }, { lie: 1 }, { stretch: 1 }]) {
        rig.setPose(pose);
        for (let frame = 0; frame < 45; frame++) rig.update(1 / 60, { moving: false });
        root.updateMatrixWorld(true);
        for (const bone of rig.skeleton.bones) finite(bone.matrixWorld.elements, id + " posed bone");
      }
      rig.setPose({});
      const drawn = portrait(root);
      check(drawn.draws <= 3, id + " exceeded the creature's three draw-call budget: " + drawn.draws);
      pets.push({ id, ...metric, ...drawn });
      const shadow = rig.shadow.material.map; let sharedFreed = false;
      shadow.addEventListener("dispose", () => { sharedFreed = true; });
      verifyDisposal(root, () => housePets.disposeCreature(root), id, resource => resource.userData?.shared);
      check(!sharedFreed, id + " disposed the shared contact-shadow texture");
      check(renderer.info.memory.geometries === 0, id + " left rendered geometry allocated");
    }
    const furniture = [];
    for (const [index, item] of CPData.FURNITURE.entries()) {
      const root = furnishing(item, index, { label: false });
      const metric = inspect(root, "furniture/" + item.id);
      const drawn = portrait(root);
      check(drawn.draws <= 4 && metric.triangles <= 2600, item.id + " furniture exceeded its four-batch/2,600-triangle budget");
      check(metric.size[0] < .94 && metric.size[1] < 1.04 && metric.size[2] < .95, item.id + " furniture outgrew its placement slot");
      check(new THREE.Box3().setFromObject(root).min.y >= -.011, item.id + " furniture sank below the floor");
      root.traverse(object => {
        const normals = object.geometry?.getAttribute("normal");
        if (normals) for (let i = 0; i < normals.count; i++) check(Math.abs(Math.hypot(normals.getX(i), normals.getY(i), normals.getZ(i)) - 1) < .002, item.id + " furniture has an invalid surface normal");
      });
      furniture.push({ id: item.id, ...metric, ...drawn });
      const shared = [...resources(root)].filter(resource => resource.userData?.shared); let sharedFreed = false;
      for (const resource of shared) resource.addEventListener("dispose", () => { sharedFreed = true; });
      verifyDisposal(root, () => housePets.disposeCreature(root), "furniture/" + item.id, resource => resource.userData?.shared);
      check(!sharedFreed, item.id + " furniture disposed a shared surface texture");
      check(renderer.info.memory.geometries === 0, item.id + " furniture left rendered geometry allocated");
    }
    const worlds = [];
    for (const quality of [.6, 1]) for (const site of SITES) {
      // Every biome on mobile, plus representative forest, savanna and ocean
      // on desktop. Geometry counts let us compare the two quality levels.
      if (quality === 1 && !["serengeti", "amazon", "reef"].includes(site.id)) continue;
      const world = buildWorld(THREE, site, quality), spawn = world.spawn.player;
      const eye = new THREE.Vector3(spawn[0], world.underwater ? world.waterLevel - 6 : world.heightAt(...spawn) + 2, spawn[1]);
      const camera = new THREE.PerspectiveCamera(65, 1.6, .1, 2600); camera.position.copy(eye); camera.lookAt(0, eye.y + 4, 0);
      const ids = site.subjects.filter(id => species.includes(id));
      const zoo = wildlife.createCreatureManager(THREE, world, site, { shy: .8 }, ids);
      for (const clock of [.08, .45, .95, 1.125]) for (let frame = 0; frame < 15; frame++) {
        world.update(1 / 30, frame / 30, clock, eye);
        zoo.update(1 / 30, frame / 30, eye, world.env, false, false);
        for (const creature of zoo.list) finite([...creature.group.position.toArray(), ...creature.group.quaternion.toArray()], site.id + "/" + creature.id + " animation");
      }
      const geometry = inspect(world.scene, site.id);
      world.update(0, 1, .45, eye); renderer.render(world.scene, camera);
      const metric = { id: site.id, quality, ...geometry, draws: renderer.info.render.calls, renderedTriangles: renderer.info.render.triangles, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures };
      check(metric.draws > 0 && metric.renderedTriangles > 0, site.id + " did not render");
      const gl = renderer.getContext(), pixels = new Uint8Array(640 * 400 * 4); gl.readPixels(0, 0, 640, 400, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      const colors = new Set(); for (let i = 0; i < pixels.length; i += 64) colors.add(pixels.slice(i, i + 3).join(","));
      check(colors.size > 8, site.id + " rendered a blank or flat image");
      worlds.push(metric);
      verifyDisposal(world.scene, () => world.dispose(), site.id);
      check(renderer.info.memory.geometries === 0, site.id + " left rendered geometry allocated after world disposal");
    }
    for (const desktop of worlds.filter(world => world.quality === 1)) {
      const mobile = worlds.find(world => world.id === desktop.id && world.quality === .6);
      check(mobile.triangles <= desktop.triangles, desktop.id + " mobile geometry exceeded desktop geometry");
    }
    renderer.dispose(); renderer.forceContextLoss();
    return { animals, pets, furniture, worlds };
  });
}

async function houseChecks(browser, base) {
  const results = [];
  for (const mobile of [false, true]) {
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1024, height: 640 }, isMobile: mobile, hasTouch: mobile, serviceWorkers: "block" });
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
    await context.addInitScript(() => {
      localStorage.setItem("craepets.house.who", "tristan");
      localStorage.setItem("craepets.house.v1.tristan", JSON.stringify({ v: 1, pet: { name: "Visual test", species: "blorb", colour: "blue", egg: false }, coins: 20 }));
    });
    try {
      console.log(`Checking full house: ${mobile ? "phone at night" : "desktop in daylight"}`);
      // The exported house is large on software WebGL. Pin the existing
      // adaptive-resolution floor without disabling lighting or materials.
      await page.goto(base + "/house-test/?phase=" + (mobile ? "night" : "day") + "&pr=.6", { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForFunction(() => window.houseTest?.state.ready || window.houseBoot?.state === "failed", null, { polling: 100, timeout: 120000 });
      assert.equal(await page.evaluate(() => !!window.houseTest?.state.ready), true, "House model failed to load");
      // Locator stability polling needs animation frames, which software
      // rendering can delay for seconds. Verify a visible, enabled hit target
      // directly, then send a real mouse click or touch to its centre.
      const point = await page.evaluate(() => {
        const button = document.getElementById("start");
        button.scrollIntoView({ behavior: "instant", block: "center" });
        const rect = button.getBoundingClientRect(), x = rect.x + rect.width / 2, y = rect.y + rect.height / 2;
        return { x, y, enabled: !button.disabled, visible: rect.width > 0 && rect.height > 0 && getComputedStyle(button).visibility === "visible", hit: button.contains(document.elementFromPoint(x, y)) };
      });
      assert.ok(point.enabled && point.visible && point.hit, "House Start button is inaccessible: " + JSON.stringify(point));
      if (mobile) await page.touchscreen.tap(point.x, point.y);
      else await page.mouse.click(point.x, point.y);
      assert.equal(await page.evaluate(() => houseTest.state.active), true, "Pointer activation did not start the house");
      for (const room of ["Living room", "Kitchen", "Family room"]) {
        const frames = await page.evaluate(() => houseTest.state.framesDrawn);
        assert.equal(await page.evaluate(room => houseTest.go(room), room), true, "Could not visit " + room);
        await page.waitForFunction(previous => houseTest.state.framesDrawn >= previous + 3, frames, { polling: 100, timeout: 30000 });
        const state = await page.evaluate(() => houseTest.state);
        assert.equal(state.timeOfDay, mobile ? "night" : "day", "House lighting did not use the requested phase");
        assert.ok(state.drawCalls > 0 && state.triangles > 0, room + " did not draw");
        assert.ok(state.camera.every(Number.isFinite), room + " has an invalid camera");
        results.push({ mobile, room, draws: state.drawCalls, triangles: state.triangles, programs: state.programs, pixelRatio: state.pixelRatio, ambientOcclusion: state.ambientOcclusion });
      }
      await page.screenshot({ path: path.join(OUT, "house-" + (mobile ? "mobile-night" : "desktop-day") + ".png") });
      assert.deepEqual(errors, [], "House browser errors");
    } finally { await context.close(); }
  }
  return results;
}

(async () => {
  await fs.mkdir(OUT, { recursive: true });
  const server = await startServer();
  let browser;
  try {
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", headless: true, args: ["--no-sandbox", "--enable-unsafe-swiftshader"] });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, serviceWorkers: "block" });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
    const base = "http://127.0.0.1:" + server.address().port;
    const models = await modelChecks(page, base);
    assert.deepEqual(errors, [], "Model shaders or worlds produced browser errors");
    console.log(`PASS models: ${models.animals.length} wildlife, ${models.pets.length} pets/companions, ${models.furniture.length} furnishings, ${models.worlds.length} biome/quality variants; geometry, shaders, animation and disposal`);
    await fs.writeFile(path.join(OUT, "models.json"), JSON.stringify(models, null, 2) + "\n");
    await page.close();
    // CI checks the changed procedural models. Whole-house smoke also loads
    // the much larger, unchanged architecture and is an explicit local run.
    const house = process.env.THREE_FULL_HOUSE === "1" ? await houseChecks(browser, base) : [];
    await fs.writeFile(path.join(OUT, "metrics.json"), JSON.stringify({ ...models, house }, null, 2) + "\n");
    console.log(`PASS real WebGL: ${models.animals.length} wildlife models, ${models.pets.length} pets and companions, ${models.furniture.length} furnishings, ${models.worlds.length} biome/quality variants${house.length ? `, ${house.length} house views` : ""}; finite geometry and rigs, shaders, animation, quality and disposal.`);
    console.log(JSON.stringify({ maxAnimalDraws: Math.max(...models.animals.map(model => model.draws)), maxAnimalTriangles: Math.max(...models.animals.map(model => model.triangles)), maxPetDraws: Math.max(...models.pets.map(model => model.draws)), maxFurnitureDraws: Math.max(...models.furniture.map(model => model.draws)), maxFurnitureTriangles: Math.max(...models.furniture.map(model => model.triangles)), maxWorldDraws: Math.max(...models.worlds.map(model => model.draws)), maxWorldTriangles: Math.max(...models.worlds.map(model => model.renderedTriangles)), evidence: OUT }));
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
