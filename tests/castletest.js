/* Pruebas del CASTILLO GEAYI (castle.js): España, puerta, murallas, rampa y cofres */
'use strict';
const fs = require('fs');
const vm = require('vm');
require(__dirname + '/stubs.js'); // stubs DOM/THREE + sandbox + R()
const DIR = '/home/hatch/workspace/your_files/obby-3d/';

const FILES = ['state.js', 'i18n.js', 'audio.js', 'vehicles.js', 'family.js', 'player.js',
  'world.js', 'neoncity.js', 'phase3.js', 'bridges.js', 'castle.js'];
for (const f of FILES) {
  try {
    vm.runInContext(fs.readFileSync(DIR + f, 'utf8'), global.sandbox, { filename: f });
  } catch (e) {
    console.log('✗ ERROR cargando ' + f + ': ' + e.message);
    process.exit(1);
  }
}
console.log('carga: ' + FILES.length + ' archivos OK (incluye castle.js)');

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; }
  else { fail++; console.log('  ✗ FAIL:', name); }
}
const R = (expr) => vm.runInContext(expr, global.sandbox);
R('initThree(); Particles.init(); Avatar.build();');
// mismo orden que boot(): Bridges.init() primero, luego Castle.init() (encadena moveAxis)
R('Bridges.init(); Castle.init();');

/* ============ 0. módulo y carga limpia ============ */
console.log('— módulo y carga limpia');
ok(R('typeof Castle') === 'object', 'existe Castle');
ok(R('typeof Castle.init') === 'function', 'Castle.init existe');
ok(R('typeof Castle.buildForLevel') === 'function', 'Castle.buildForLevel existe');
ok(R('typeof Castle.update') === 'function', 'Castle.update existe');
ok(R('typeof Castle.groundAt') === 'function', 'Castle.groundAt existe');
ok(R('T("castle.welcome1")') !== 'castle.welcome1', 'i18n es registrada');
R(`LANG='en'`);
ok(R('T("castle.welcome1")') === '🏰 Welcome to GEAYI CASTLE!', 'i18n en registrada');
R(`LANG='es'`);
ok(R('Castle.ramps.length') === 0 && R('Castle.built') === false, 'sin construir: limpio');

/* ============ 1. solo se construye en España (idx 7) ============ */
console.log('— solo en el mundo España');
for (let i = 0; i < 9; i++) {
  R(`LEVEL = buildLevel(${i})`);
  R(`Castle.buildForLevel(${i}, LEVEL.group)`);
  const nPlat = R('LEVEL.platforms.filter(p => p.kind === "castle").length');
  const nRamp = R('Castle.ramps.length');
  const nChest = R('Castle.chests.length');
  if (i === 7) {
    ok(nPlat > 10, `idx7: plataformas del castillo (${nPlat})`);
    ok(nRamp === 2, 'idx7: 2 rampas registradas (inclinada + meseta)');
    ok(nChest === 3, 'idx7: 3 cofres');
    ok(R('Castle.built') === true, 'idx7: built=true');
  } else {
    ok(nPlat === 0 && nRamp === 0 && nChest === 0, `idx${i}: sin castillo`);
  }
}
// idempotencia: construir dos veces no duplica
R('LEVEL = buildLevel(7); Castle.buildForLevel(7, LEVEL.group); Castle.buildForLevel(7, LEVEL.group);');
ok(R('Castle.ramps.length') === 2 && R('Castle.chests.length') === 3, 'buildForLevel idempotente');

/* ============ 2. estructura: puerta, murallas, salones ============ */
console.log('— estructura (puerta, murallas, salones)');
R('LEVEL = buildLevel(7); Castle.buildForLevel(7, LEVEL.group);');
const plats = R('LEVEL.platforms.filter(p => p.kind === "castle")');
// puerta oeste: hueco z∈[52,58] en x=50 → ninguna plataforma alta bloquea el paso
const doorBlock = plats.filter(p => p.x > 48 && p.x < 52 && p.z > 51.5 && p.z < 58.5 && p.topY - p.h < 2);
ok(doorBlock.length === 0, 'puerta principal libre a nivel del suelo (sin bloquear)');
const walls = plats.filter(p => p.topY === 6 && p.h >= 5.9);
ok(walls.length >= 4, `murallas con pasarela a y=6 (${walls.length} tramos)`);
const throneWalls = plats.filter(p => p.topY === 5 && p.x > 55 && p.x < 85 && p.z > 35 && p.z < 50);
ok(throneWalls.length >= 3, `salón del trono con muros (${throneWalls.length})`);
const diningWalls = plats.filter(p => p.topY === 4.5);
ok(diningWalls.length >= 3, `comedor con muros (${diningWalls.length})`);
const towers = plats.filter(p => p.topY === 12);
ok(towers.length === 4, '4 torres en las esquinas');
const table = plats.filter(p => Math.abs(p.topY - 1.07) < 0.01);
ok(table.length === 1, 'mesa larga del comedor');
const throne = plats.filter(p => Math.abs(p.topY - 2.2) < 0.01);
ok(throne.length === 1, 'trono de bloques');
const apron = plats.filter(p => p.topY === 0 && p.w >= 60);
ok(apron.length === 1, 'explanada a nivel del suelo pegada a la ciudad');

/* ============ 3. rampa caminable: pendiente ≤ 20° ============ */
console.log('— rampa al mirador (pendiente y simulación)');
const angDeg = R('Math.atan2(6, 22) * 180 / Math.PI');
ok(angDeg <= 20, `pendiente de la rampa ${angDeg.toFixed(1)}° ≤ 20°`);
ok(R('Castle.groundAt(84, 70)') !== null, 'groundAt cubre la base de la rampa');
ok(R('Castle.groundAt(84, 48)') !== null, 'groundAt cubre la cima de la rampa');
ok(Math.abs(R('Castle.groundAt(84, 48)') - 6) < 0.01, 'cima de la rampa a y=6 (pasarela)');
ok(R('Castle.groundAt(84, 59)') > 2.5 && R('Castle.groundAt(84, 59)') < 3.5, 'mitad de la rampa a y≈3');
ok(R('Castle.groundAt(0, 0)') === null, 'fuera de la rampa: null (física normal)');

/* ============ 4. simulación: entrar por la puerta caminando ============ */
console.log('— simulación: entrar por la puerta');
R(`MODE = 'play'; finished = false;`);
R('Player.reset(40, 2, 55); Vehicle.mode = "none"; Vehicle.def = null;');
// caminar al este (+x con {x:1,z:0} y camYaw=π) atravesando la puerta en x=50
for (let i = 0; i < 300; i++) R('updatePlayer(0.016, { x: 1, z: 0, jump: false });');
const px = R('Player.pos.x'), py = R('Player.pos.y'), pz = R('Player.pos.z');
ok(px > 54, `cruza la puerta caminando (x=${px.toFixed(1)} > 54)`);
ok(py < 1, `sigue a nivel del suelo (y=${py.toFixed(2)})`);
ok(Math.abs(pz - 55) < 3, `entra recto por el hueco (z=${pz.toFixed(1)})`);

/* ============ 5. simulación: subir la rampa caminando (sin saltar) ============ */
console.log('— simulación: subir la rampa al mirador');
R('Player.reset(84, 2, 71.5); Vehicle.mode = "none"; Vehicle.def = null;');
// fase 1: caminar al norte (-z con {x:0,z:1} y camYaw=π) por la rampa hasta el descanso
for (let i = 0; i < 600 && (R('Player.pos.y') < 5.5 || R('Player.pos.z') > 46.5); i++)
  R('updatePlayer(0.016, { x: 0, z: 1, jump: false });');
const ry = R('Player.pos.y'), rz = R('Player.pos.z'), rx = R('Player.pos.x');
ok(ry > 5.5, `sube la rampa caminando hasta la pasarela (y=${ry.toFixed(2)})`);
ok(rz < 54, `avanza al norte por la rampa (z=${rz.toFixed(1)})`);
ok(Math.abs(rx - 84) < 3, `se mantiene en la rampa ancha (x=${rx.toFixed(1)})`);
// fase 2: girar al este hacia el muro y seguir al norte por la pasarela del mirador
for (let i = 0; i < 200 && R('Player.pos.x') < 88.5; i++) R('updatePlayer(0.016, { x: 1, z: 0, jump: false });');
// fase 3: al norte por el mirador (el jugador se detiene, gira y camina al norte)
R('Player.vel.x = 0; Player.vel.z = 0; Player.camYaw = Math.PI; Player.heading = Math.PI;');
for (let i = 0; i < 100; i++) R('updatePlayer(0.016, { x: 0, z: 1, jump: false });');
const my = R('Player.pos.y'), mz = R('Player.pos.z'), mx = R('Player.pos.x');
ok(Math.abs(my - 6) < 0.3, `camina por la pasarela del mirador a y=6 (y=${my.toFixed(2)})`);
ok(mz < 45, `recorre el mirador al norte (z=${mz.toFixed(1)})`);
ok(mx > 88 && mx < 92, `sobre el muro este (x=${mx.toFixed(1)})`);
ok(R('Player.grounded') === true, 'queda parado sobre la pasarela');

/* ============ 6. cofres: 5-10 monedas una vez por visita ============ */
console.log('— cofres decorativos');
R('SAVE.coins = 0;');
R('Player.reset(75, 2, 42); Vehicle.mode = "none"; Vehicle.def = null;'); // junto al cofre del trono
for (let i = 0; i < 10; i++) R('Castle.update(0.016);');
const coins1 = R('SAVE.coins');
ok(coins1 >= 5 && coins1 <= 10, `cofre da 5-10 🪙 (dio ${coins1})`);
ok(R('Castle.chests[0].opened') === true, 'cofre marcado como abierto');
for (let i = 0; i < 10; i++) R('Castle.update(0.016);');
ok(R('SAVE.coins') === coins1, 'segunda visita al mismo cofre: no repite');
R('Player.reset(90, 8, 50);'); // cofre del mirador (a y=6)
for (let i = 0; i < 10; i++) R('Castle.update(0.016);');
ok(R('SAVE.coins') > coins1, 'cofre del mirador también entrega monedas');
ok(R('Castle.chests.filter(c => c.opened).length') === 2, 'cada cofre abre una sola vez');

/* ============ 7. limpieza al cambiar de mundo ============ */
console.log('— limpieza al cambiar de mundo');
R('LEVEL = buildLevel(0); Castle.buildForLevel(0, LEVEL.group);');
ok(R('Castle.ramps.length') === 0 && R('Castle.chests.length') === 0, 'al salir de España no quedan rampas ni cofres');
ok(R('Castle.groundAt(84, 59)') === null, 'groundAt inactivo fuera de España');
R('LEVEL = buildLevel(7); Castle.buildForLevel(7, LEVEL.group);');
for (let i = 0; i < 60; i++) R('Castle.update(0.016);');
ok(true, '60 cuadros de Castle.update sin errores');

console.log(`\n${pass} OK · ${fail} FAIL`);
process.exit(fail ? 1 : 0);
