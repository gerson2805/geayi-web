/* Pruebas de lanchas rápidas GEAYI 🚤 + mini-carreras en el Lago Trafford (stubs THREE/DOM).
   Patrón de tests/vehicletest.js: carga vehicles.js + world.js en un sandbox y simula el juego. */
'use strict';
const fs = require('fs');
const vm = require('vm');
require(__dirname + '/stubs.js'); // global.sandbox + global.R
const DIR = '/home/hatch/workspace/your_files/obby-3d/';
const FILES = ['state.js', 'i18n.js', 'audio.js', 'vehicles.js', 'world.js', 'neoncity.js', 'family.js',
  'player.js', 'online.js', 'travel.js', 'phase3.js', 'trophies.js'];
for (const f of FILES) {
  vm.runInContext(fs.readFileSync(DIR + f, 'utf8'), global.sandbox, { filename: f });
}

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; }
  else { fail++; console.log('  ✗ FAIL:', name); }
}
R('initThree(); Particles.init(); Avatar.build();');

/* ============ 1. lanchas rápidas registradas (extienden el sistema de botes) ============ */
console.log('— 1. lanchas rápidas registradas');
const t1 = R(`(function(){
  const a = VEHICLE_TYPES['geayi-arrow'], t = VEHICLE_TYPES['geayi-thunder'], b = VEHICLE_TYPES['geayi-boat'];
  return {
    reg: !!(a && t && VEHICLE_BUILDERS['geayi-arrow'] && VEHICLE_BUILDERS['geayi-thunder']),
    faster: a.maxSpeed > b.maxSpeed && t.maxSpeed > b.maxSpeed && a.accel > b.accel && t.accel > b.accel,
    arrow: a.maxSpeed + '/' + a.accel + ' ' + a.name,
    thunder: t.maxSpeed + '/' + t.accel + ' ' + t.name,
    base: b.maxSpeed + '/' + b.accel,
  };
})()`);
ok(t1.reg, 'geayi-arrow y geayi-thunder en VEHICLE_TYPES + VEHICLE_BUILDERS');
ok(t1.faster, 'más rápidas que la lancha base (base ' + t1.base + ' → flecha ' + t1.arrow.split(' ')[0] + ' / trueno ' + t1.thunder.split(' ')[0] + ')');
ok(/Flecha Veloz/.test(t1.arrow) && /GEAYI/.test(t1.arrow), 'Flecha Veloz GEAYI registrada');
ok(/Trueno Doble/.test(t1.thunder) && /GEAYI/.test(t1.thunder), 'Trueno Doble GEAYI registrada');

/* ============ 2. circuito de boyas en el Lago Trafford (mundo 4, idx 3) ============ */
console.log('— 2. circuito de boyas en el Lago Trafford');
R(`LEVEL = buildLevel(3); MODE = 'play'; Player.reset(0, 2, 0); Vehicle.mode = 'none'; Vehicle.def = null;`);
const c2 = R(`(function(){
  const res = {};
  res.built = BoatRace.built === true;
  res.n = BoatRace.buoys.length;
  res.overWater = BoatRace.buoys.every(b => Math.hypot(b.x - (-78), b.z - 18) < 20);
  res.circle = BoatRace.buoys.every(b => Math.abs(Math.hypot(b.x - (-78), b.z - 18) - 11) < 0.01);
  res.startFlag = BoatRace.buoys[0] && BoatRace.buoys[0].mesh.children.length >= 3;
  res.sign = !!BoatRace.sign;
  const boats = LEVEL.cars.filter(c => c.kind === 'boat' && c.raceBoat);
  res.twoBoats = boats.length === 2;
  res.vtypes = boats.map(c => c.vtype).sort().join(',');
  res.moored = boats.every(c => Math.abs(c.mesh.position.x - (-59)) < 0.01 &&
    Math.abs(Math.abs(c.mesh.position.z - 18) - 3.5) < 0.01); // (-59, 14.5) y (-59, 21.5), junto al muelle
  res.lakeBound = boats.every(c => c.wcx === -78 && c.wcz === 18 && c.wr === 19.5);
  try { updateWorldFx(0.016); res.fx = true; } catch (e) { res.fx = false; res.fxErr = String(e).slice(0, 60); }
  return res;
})()`);
ok(c2.built, 'circuito construido en idx 3');
ok(c2.n === 6, '6 boyas en el circuito');
ok(c2.overWater, 'todas las boyas sobre el agua del Lago Trafford');
ok(c2.circle, 'boyas en círculo (radio 11) alrededor del centro del lago');
ok(c2.startFlag, 'la boya 0 (salida/meta) lleva banderín');
ok(c2.sign, 'letrero 🏁 CARRERA DE LANCHAS junto al muelle');
ok(c2.twoBoats, '2 lanchas rápidas amarradas en el muelle');
ok(c2.vtypes === 'geayi-arrow,geayi-thunder', 'una Flecha Veloz y una Trueno Doble (' + c2.vtypes + ')');
ok(c2.moored, 'amarradas junto al muelle del lago');
ok(c2.lakeBound, 'las lanchas están limitadas al lago (centro -78,18, radio 19.5)');
ok(c2.fx, 'updateWorldFx mece las boyas sin errores' + (c2.fxErr ? ' (' + c2.fxErr + ')' : ''));

/* ============ 3. SUBIR a la lancha rápida + física de botes intacta ============ */
console.log('— 3. SUBIR a la lancha rápida + física');
const b3 = R(`(function(){
  const res = {};
  const boat = LEVEL.cars.find(c => c.kind === 'boat' && c.raceBoat && c.vtype === 'geayi-arrow');
  if (!boat) return { err: 'sin lancha' };
  Player.pos.set(boat.mesh.position.x, 1, boat.mesh.position.z);
  const nb = nearestBoardable();
  res.near = !!(nb && nb.type === 'boat' && nb.def === boat);
  boardVehicle({ type: 'boat', def: boat });
  res.board = Vehicle.mode === 'boat' && boat.taken === true;
  // manejar: la lancha avanza con el joystick (física de updateBoat sin cambios)
  Vehicle.heading = -Math.PI / 2; // hacia el oeste, agua abierta
  const x0 = boat.mesh.position.x, z0 = boat.mesh.position.z;
  for (let k = 0; k < 30; k++) updateBoat(0.016, { x: 0, z: 1 });
  res.drove = Math.hypot(boat.mesh.position.x - x0, boat.mesh.position.z - z0) > 1.5;
  res.inLake = Math.hypot(boat.mesh.position.x - (-78), boat.mesh.position.z - 18) <= 19.5 + 0.01;
  res.baseOk = VEHICLE_TYPES['geayi-boat'].maxSpeed === 13 && VEHICLE_TYPES['geayi-boat'].accel === 10;
  return res;
})()`);
if (b3.err) { ok(false, 'lancha: ' + b3.err); }
else {
  ok(b3.near, 'cerca de la lancha amarrada → detectable para SUBIR');
  ok(b3.board, 'SUBIR → modo boat con la Flecha Veloz');
  ok(b3.drove, 'joystick adelante → la lancha avanza (updateBoat)');
  ok(b3.inLake, 'la lancha no sale del lago');
  ok(b3.baseOk, 'la lancha base sigue con maxSpeed 13 / accel 10 (física intacta)');
}

/* ============ 4. mini-carrera: inicio → 3 vueltas → récord + premio ============ */
console.log('— 4. mini-carrera: inicio → 3 vueltas → récord + premio');
const coins0 = R(`SAVE.coins || 0`);
const r4 = R(`(function(){
  const res = {};
  const teleport = (x, z) => { Vehicle.def.mesh.position.set(x, Vehicle.def.waterY + 0.15, z); };
  const step = () => updateBoat(0.016, { x: 0, z: 0 });
  const cx = (i) => { const b = BoatRace.buoys[i]; teleport(b.x, b.z); step(); };
  teleport(-59, 14.5); step(); // alejarse >7 de la boya 0 → se arma la salida
  cx(0); // cruzar la boya de inicio → empieza el cronómetro
  res.started = BoatRace.phase === 'racing';
  const n0 = BoatRace.next; // orden incorrecto se ignora: toca la 1, cruzar la 3 no avanza
  cx(3);
  res.orderOk = BoatRace.next === n0 && BoatRace.laps === 0;
  for (let lap = 0; lap < 3; lap++) { // 3 vueltas en orden
    for (const i of [1, 2, 3, 4, 5, 0]) { cx(i); for (let k = 0; k < 5; k++) step(); }
    res['lap' + (lap + 1)] = (lap < 2) ? (BoatRace.laps === lap + 1) : (BoatRace.phase === 'finished');
  }
  res.finished = BoatRace.phase === 'finished';
  res.record = SAVE.bestBoatLap;
  res.coins = SAVE.coins;
  res.hud = BoatRace.hud && BoatRace.hud.textContent;
  return res;
})()`);
ok(r4.started, 'cruzar la boya de inicio → empieza el cronómetro');
ok(r4.orderOk, 'cruzar una boya fuera de orden no cuenta');
ok(r4.lap1, 'vuelta 1 completa al cruzar la meta');
ok(r4.lap2, 'vuelta 2 completa al cruzar la meta');
ok(r4.finished, '3 vueltas → carrera terminada');
ok(typeof r4.record === 'number' && r4.record > 0, 'mejor tiempo guardado en SAVE.bestBoatLap (' + r4.record + ' ms)');
ok(r4.coins === coins0 + 30, 'premio +30 🪙 por batir tu récord (' + coins0 + ' → ' + r4.coins + ')');
ok(/Vuelta 3\/3/.test(r4.hud || ''), 'HUD muestra la vuelta y el tiempo (' + (r4.hud || '?') + ')');

/* ============ 5. sin reinicio automático; 2ª carrera lenta no da premio ============ */
console.log('— 5. sin reinicio automático; 2ª carrera lenta no da premio');
const r5 = R(`(function(){
  const res = {};
  const coinsAfterFirst = SAVE.coins, recordAfterFirst = SAVE.bestBoatLap;
  const teleport = (x, z) => { Vehicle.def.mesh.position.set(x, Vehicle.def.waterY + 0.15, z); };
  const step = () => updateBoat(0.016, { x: 0, z: 0 });
  const cx = (i) => { const b = BoatRace.buoys[i]; teleport(b.x, b.z); step(); };
  for (let k = 0; k < 400; k++) step(); // pasan 6+ s con la lancha sobre la meta
  res.resetIdle = BoatRace.phase === 'idle';
  for (let k = 0; k < 60; k++) step(); // quieta sobre la boya 0: NO se reinicia sola
  res.noAuto = BoatRace.phase === 'idle';
  teleport(-59, 14.5); step(); // alejarse y volver → segunda carrera
  cx(0);
  res.second = BoatRace.phase === 'racing';
  for (let lap = 0; lap < 3; lap++) { // vueltas LENTAS (muchos cuadros extra)
    for (const i of [1, 2, 3, 4, 5, 0]) { cx(i); for (let k = 0; k < 300; k++) step(); }
  }
  res.finished2 = BoatRace.phase === 'finished';
  res.recordSame = SAVE.bestBoatLap === recordAfterFirst;
  res.coinsSame = SAVE.coins === coinsAfterFirst;
  return res;
})()`);
ok(r5.resetIdle, 'tras la meta la carrera vuelve a reposo');
ok(r5.noAuto, 'la lancha quieta sobre la meta no reinicia la carrera sola');
ok(r5.second, 'alejarse y cruzar la boya → empieza una segunda carrera');
ok(r5.finished2, 'la segunda carrera también termina en 3 vueltas');
ok(r5.recordSame, 'una carrera más lenta no cambia el récord');
ok(r5.coinsSame, 'una carrera más lenta no da premio de nuevo (+30 una sola vez por récord)');

/* ============ 6. BAJAR cancela la carrera; i18n es/en ============ */
console.log('— 6. BAJAR cancela la carrera; i18n');
const r6 = R(`(function(){
  const res = {};
  exitVehicle();
  res.exit = Vehicle.mode === 'none';
  res.idle = BoatRace.phase === 'idle';
  res.hudHidden = !BoatRace.hud || BoatRace.hud.style.display === 'none';
  const es = T('boatrace.sign');
  setLang('en', true);
  const en = T('boatrace.sign'), board = T('boatrace.board');
  setLang('es', true);
  res.i18n = (es === '🏁 CARRERA DE LANCHAS' && en === '🏁 SPEEDBOAT RACING' && /speedboat/i.test(board));
  return res;
})()`);
ok(r6.exit, 'BAJAR → modo normal');
ok(r6.idle, 'bajarse de la lancha cancela la mini-carrera');
ok(r6.hudHidden, 'el HUD de la carrera se oculta');
ok(r6.i18n, 'textos en español e inglés (addStrings)');

console.log(`\nRESULTADO: ${pass} OK, ${fail} FALLOS`);
process.exit(fail ? 1 : 0);
