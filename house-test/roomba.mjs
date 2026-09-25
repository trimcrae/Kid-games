// The robot vacuum, parked on the family-room carpet beside the fireplace.
// E switches it on and it goes about its business: drive straight until the
// bumper finds a wall or a couch leg, reverse a little, turn a random angle,
// carry on — the same random walk the real one does, and about as good at it.
// E again and it stops dead where it stands. It is drawn here out of three
// cylinders and a half-ring (no textures, nothing to download) and hums from a
// pair of oscillators of its own (the car's engine node is the car's).
const TAU = Math.PI * 2;
// Where it lives: the clear patch of carpet south of the hearth (the hearth is
// x 13.89–14.51, z -3.17…-1.43; the couch and the cabinet are further west and
// south), and the family room it is not allowed to leave.
const HOME = {x: 13.55, z: -3.55};
const ROOM = {x0: 9.85, x1: 14.58, z0: -4.5, z1: -0.15};
// The carpet is 2 cm proud of the slab: anything else underfoot — the hearth,
// the stair treads, the hall — is not the family-room floor and is refused.
const FLOOR = -1.03, FLAT = .05;
// Small enough to be polite, big enough to watch: 34 cm across, 9 cm tall.
const R = .17, H = .09, SPEED = .34, BACK = .18, PET = .6;

export function roombaInteractions(ctx) {
  const {THREE, scene, world, player, life, list, ticking, reducedMotion} = ctx;

  // ----- the machine itself.
  const spot = world.safeSpot(HOME.x, FLOOR, HOME.z) || {x: HOME.x, y: FLOOR, z: HOME.z};
  const bot = new THREE.Group();
  bot.position.set(spot.x, spot.y, spot.z);
  bot.rotation.y = -Math.PI / 2;           // parked nose-out, away from the wall
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(R, R * .97, H, 40),
    new THREE.MeshStandardMaterial({color: '#2b2f33', roughness: .55, metalness: .25}));
  shell.position.y = H / 2;
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(R * .86, R * .86, .014, 40),
    new THREE.MeshStandardMaterial({color: '#6b7278', roughness: .35, metalness: .4}));
  lid.position.y = H + .005;
  // The bumper: a half-ring round the front half, where it takes the knocks.
  const bumper = new THREE.Mesh(new THREE.TorusGeometry(R * .99, .016, 8, 28, Math.PI),
    new THREE.MeshStandardMaterial({color: '#15181b', roughness: .8}));
  bumper.rotation.x = Math.PI / 2; bumper.position.y = H * .42;   // laid flat, its half round the front (+Z)
  // The little green eye, dull when it is off and glowing when it is working.
  const lampMat = new THREE.MeshStandardMaterial({color: '#1d3a22', emissive: '#37e05a', emissiveIntensity: 0});
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, .006, 16), lampMat);
  lamp.position.set(0, H + .013, R * .5);
  bot.add(shell, lid, bumper, lamp);
  scene.add(bot);

  // ----- the hum: a low motor note and the hiss of the fan over it.
  let ac = null, hum = null;
  function motor(level) {
    try { ac ??= new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); } catch { return; }
    if (!ac) return;
    const t = ac.currentTime;
    if (!hum) {
      const o = ac.createOscillator(), fan = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
      o.type = 'sawtooth'; o.frequency.value = 62; fan.type = 'triangle'; fan.frequency.value = 187;
      f.type = 'lowpass'; f.frequency.value = 520; g.gain.value = 0;
      o.connect(f); fan.connect(f); f.connect(g).connect(ac.destination); o.start(); fan.start();
      hum = {o, fan, g};
    }
    if (level === null) { hum.g.gain.linearRampToValueAtTime(0, t + .25); const h = hum; hum = null; h.o.stop(t + .35); h.fan.stop(t + .35); return; }
    hum.g.gain.setTargetAtTime(level, t, .12);
    hum.o.frequency.setTargetAtTime(58 + level * 240, t, .15);
  }

  // ----- driving. Heading is the group's own rotation: turning by h sends the
  // bumper (local +Z) off towards (sin h, cos h).
  // `turn` is how much of a turn is left to make; a bump turn is made on the
  // spot, a turn away from the pet is driven round as an arc (pivoting on the
  // spot while the pet stands over it would leave it spinning there for ever).
  let on = false, heading = bot.rotation.y, spin = 0, reverse = 0, turn = 0, arc = false, nudge = 0, bumps = 0;
  const rim=Array.from({length:8},(_,i)=>[Math.sin(i*TAU/8)*R,Math.cos(i*TAU/8)*R]);
  const ok = (x, z) => {
    // The centre can clear a table leg while the circular bumper intersects
    // it. Check the whole rim against room edges, raised surfaces and boxes.
    for(const [dx,dz] of [[0,0],...rim]){
      const px=x+dx,pz=z+dz;
      if(px<ROOM.x0||px>ROOM.x1||pz<ROOM.z0||pz>ROOM.z1)return false;
      const f=world.floor(px,pz,FLOOR);
      if(!Number.isFinite(f)||Math.abs(f-FLOOR)>=FLAT||world.blocked(px,pz,f,.015))return false;
    }
    return true;
  };
  const away = () => { turn = (Math.random() < .5 ? -1 : 1) * (Math.PI * .28 + Math.random() * Math.PI * .55); arc = false; };

  list.push({
    id: 'roomba', icon: '🤖', name: 'Switch on the Roomba', kind: 'toggle', radius: .95,
    get at() { return {x: bot.position.x, y: bot.position.y, z: bot.position.z}; },
    label: () => on ? 'Switch off the Roomba' : 'Switch on the Roomba',
    start() {
      on = !on;
      if (on) { reverse = 0; turn = 0; motor(.05); life.say(['Off it goes!', 'Vrrrrrm.', 'It does the hoovering!'][Math.floor(Math.random() * 3)], 2400); life.hop(.4); }
      else { motor(null); lampMat.emissiveIntensity = 0; life.say('All tidy.', 1600); }
    },
  });

  ticking.push(dt => {
    if (!on) return;
    lampMat.emissiveIntensity = reducedMotion ? 1 : .7 + Math.sin(performance.now() / 260) * .35;
    // The brushes go round underneath; the lid turns with them, slowly.
    if (!reducedMotion) { spin = (spin + dt * 2.2) % TAU; lid.rotation.y = spin; }
    // Backing out of whatever it just met, then the turn, then off again.
    if (reverse > 0) reverse -= dt;
    else if (turn) {
      const step = Math.sign(turn) * Math.min(Math.abs(turn), dt * 2.4);
      heading += step; turn -= step;
      if (Math.abs(turn) < 1e-3) turn = 0;
    }
    // Politely round the pet: it would rather not run over anybody's paws.
    if (!turn && !reverse) {
      const dx = player.x - bot.position.x, dz = player.z - bot.position.z, d = Math.hypot(dx, dz);
      if (d < PET && (nudge -= dt) <= 0) {
        const to = Math.atan2(dx, dz), side = Math.sin(heading - to) >= 0 ? 1 : -1;
        turn = side * (Math.PI * .45 + Math.random() * Math.PI * .3); arc = true;
        nudge = 1.4; life.hop(.25);
      }
    } else nudge = Math.max(0, nudge - dt);
    const speed = reverse > 0 ? -BACK : (turn ? (arc ? SPEED * .55 : 0) : SPEED);
    if (speed) {
      const d = speed * dt, nx = bot.position.x + Math.sin(heading) * d, nz = bot.position.z + Math.cos(heading) * d;
      // A pet may step into the path during an arc or reverse. The bumper
      // cannot advance through its paws just because the room floor is clear.
      if(Math.hypot(nx-player.x,nz-player.z)<R+.14&&Math.hypot(nx-player.x,nz-player.z)<Math.hypot(bot.position.x-player.x,bot.position.z-player.z)){
        reverse=0;turn=Math.PI*.65*(Math.sin(heading-Math.atan2(player.x-bot.position.x,player.z-bot.position.z))>=0?1:-1);arc=false;
      }
      else if (ok(nx, nz)) { bot.position.x = nx; bot.position.z = nz; }
      else if (reverse > 0) { reverse = 0; away(); }          // stuck behind as well: just turn
      else { reverse = .45; bumps++; away(); }                 // bump: back off, then turn away
    }
    bot.rotation.y = heading;
    motor(reverse > 0 ? .055 : turn ? .04 : .035);
  });

  // For QA: is it running, where has it got to, how many things has it met.
  // (Its own global: walkthrough.js publishes window.houseTest after us.)
  window.houseRoomba = () => ({on, bumps, x: +bot.position.x.toFixed(2), z: +bot.position.z.toFixed(2), heading: +heading.toFixed(2)});
}
