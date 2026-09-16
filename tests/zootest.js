/* Pruebas del ZOOLÓGICO GEAYI (zoo.js): recintos, alimentar +5 🪙, cooldown y animaciones */
'use strict';
const fs = require('fs');
const vm = require('vm');
require(__dirname + '/stubs.js'); // sandbox THREE/DOM + global.R
const DIR = '/home/hatch/workspace/your_files/obby-3d/';

const FILES = ['state.js', 'i18n.js', 'audio.js', 'vehicles.js', 'world.js', 'neoncity.js', 'family.js',
  'player.js', 'phase3.js', 'trophies.js', 'funpark.js', 'zoo.js'];
for (const f of FILES) {
  vm.runInContext(fs.readFileSync(DIR + f, 'utf8'), global.sandbox, { filename: f });
}
const R = global.R;
R('initThree(); Particles.init(); Avatar.build();');

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; }
  else { fail++; console.log('  ✗ FAIL:', name); }
}
function buildZoo(idx) {
  R(`LEVEL = buildLevel(${idx}); MODE = 'play'; finished = false;`);
  R(`Zoo.buildForLevel(${idx}, LEVEL.group);`);
  R('Zoo.onLevelStart(' + idx + '); Zoo.init();');
  R('Player.reset(-168, 2, -98); Vehicle.mode = "none"; Vehicle.def = null;');
}

/* ============ 0. módulo y carga limpia ============ */
console.log('— módulo y carga limpia');
ok(R('typeof Zoo') === 'object', 'existe Zoo');
ok(R('typeof Zoo.init') === 'function', 'Zoo.init existe');
ok(R('typeof Zoo.buildForLevel') === 'function', 'Zoo.buildForLevel existe');
ok(R('typeof Zoo.update') === 'function', 'Zoo.update existe');
ok(R('typeof Zoo.feed') === 'function', 'Zoo.feed existe');
ok(R('T("zoo.title")') === '🦁 ZOOLÓGICO GEAYI', 'i18n es del título');
R('setLang("en")');
ok(R('T("zoo.title")') === '🦁 GEAYI ZOO', 'i18n en del título');
R('setLang("es")');

/* ============ 1. el zoo solo se construye en idx 3 ============ */
console.log('— construcción por nivel');
buildZoo(3);
ok(R('Zoo.recintos.length') >= 5, 'idx3: 5+ recintos (' + R('Zoo.recintos.length') + ')');
ok(R('Zoo.recintos.every(r => r.animals.length >= 1)'), 'cada recinto tiene animales');
ok(R('Zoo.recintos.reduce((s, r) => s + r.animals.length, 0)') >= 10, '10+ animales en total');
const ids = R('Zoo.recintos.map(r => r.id).join(",")');
for (const id of ['jirafa', 'leon', 'elefante', 'cebra', 'mono', 'flamenco'])
  ok(ids.includes(id), 'recinto de ' + id);
ok(R('Zoo.recintos.filter(r => r.feedable).length') >= 3, '3+ recintos alimentables');
for (const i of [0, 1, 2, 4, 5, 6, 7, 8]) {
  R(`LEVEL = buildLevel(${i}); Zoo.buildForLevel(${i}, LEVEL.group);`);
  ok(R('Zoo.recintos.length') === 0, `idx${i}: sin zoológico`);
}
buildZoo(3); // dejar el zoo construido para las siguientes pruebas

/* ============ 2. alimentar: +5 🪙 y cooldown ============ */
console.log('— alimentar y cooldown');
R('SAVE.coins = 100;');
ok(R('Zoo.feed("jirafa")') === true, 'alimentar jirafa devuelve true');
ok(R('SAVE.coins') === 105, 'alimentar da +5 🪙');
ok(R('Zoo.recintos.find(r => r.id === "jirafa").cd') > 0, 'cooldown activado tras alimentar');
const coins1 = R('SAVE.coins');
ok(R('Zoo.feed("jirafa")') === false, 'segundo intento inmediato bloqueado');
ok(R('SAVE.coins') === coins1, 'bloqueado: no suma monedas');
ok(R('Zoo.feed("mono")') === true, 'otro recinto sí puede alimentarse (+5 🪙)');
ok(R('SAVE.coins') === coins1 + 5, 'segundo recinto suma sus +5 🪙');
ok(R('Zoo.feed("leon")') === false, 'los leones no son alimentables');
// el cooldown expira y se puede volver a alimentar
R('Zoo.recintos.find(r => r.id === "jirafa").cd = 0.01;');
R('for (let i = 0; i < 5; i++) Zoo.update(0.016);');
ok(R('Zoo.feed("jirafa")') === true, 'tras expirar el cooldown se puede alimentar de nuevo');
// alimentar cerca del comedero (flujo del botón)
R('Player.pos.set(-150, 0.5, -100);');
R('for (let i = 0; i < 3; i++) Zoo.update(0.016);');
ok(R('Zoo._els["zoo-feed"].style.display') === 'block', 'botón 🍎 visible cerca del comedero');
ok(R('Zoo._els["zoo-feed"].innerHTML').includes('ELEFANTES'), 'el botón nombra el recinto cercano');
const c0 = R('SAVE.coins');
R('Zoo.recintos.find(r => r.id === "elefante").cd = 0; Zoo.feedNear();');
ok(R('SAVE.coins') === c0 + 5, 'feedNear() alimenta el recinto cercano (+5 🪙)');
R('Player.pos.set(-100, 0.5, -100);');
R('for (let i = 0; i < 3; i++) Zoo.update(0.016);');
ok(R('Zoo._els["zoo-feed"].style.display') === 'none', 'botón 🍎 oculto lejos de comederos');

/* ============ 3. animaciones ============ */
console.log('— animaciones de los animales');
R('Player.pos.set(-168, 0.5, -98);');
const neck0 = R('Zoo.recintos.find(r => r.id === "jirafa").animals[0].userData.pivots.neck.rotation.x');
const trunk0 = R('Zoo.recintos.find(r => r.id === "elefante").animals[0].userData.pivots.trunk.rotation.x');
const jumpY0 = R('Zoo.recintos.find(r => r.id === "mono").animals[0].position.y');
for (let i = 0; i < 40; i++) R('Zoo.update(1/60);');
const neck1 = R('Zoo.recintos.find(r => r.id === "jirafa").animals[0].userData.pivots.neck.rotation.x');
const trunk1 = R('Zoo.recintos.find(r => r.id === "elefante").animals[0].userData.pivots.trunk.rotation.x');
const jumpY1 = R('Zoo.recintos.find(r => r.id === "mono").animals[0].position.y');
ok(neck1 !== neck0, 'la jirafa mueve el cuello');
ok(trunk1 !== trunk0, 'el elefante mueve la trompa');
ok(jumpY1 !== jumpY0, 'el mono salta en su sitio');
// acercamiento al alimentar (primero dejar que termine cualquier acercamiento previo)
R('for (let i = 0; i < 200; i++) Zoo.update(1/60);');
R('Zoo.recintos.find(r => r.id === "mono").cd = 0; Zoo.feed("mono");');
const mx0 = R('Zoo.recintos.find(r => r.id === "mono").animals[0].position.x');
R('for (let i = 0; i < 45; i++) Zoo.update(1/60);'); // ~0.75 s: a medio acercamiento
const mx1 = R('Zoo.recintos.find(r => r.id === "mono").animals[0].position.x');
ok(Math.abs(mx1 - mx0) > 0.2, 'el animal se acerca al comedero al alimentar');
R('for (let i = 0; i < 200; i++) Zoo.update(1/60);'); // termina el acercamiento
const mx2 = R('Zoo.recintos.find(r => r.id === "mono").animals[0].position.x');
const mbx = R('Zoo.recintos.find(r => r.id === "mono").animals[0].userData.base.x');
ok(Math.abs(mx2 - mbx) < 0.05, 'el animal vuelve a su sitio');

/* ============ 4. estabilidad e idempotencia ============ */
console.log('— estabilidad');
for (let i = 0; i < 180; i++) R('Zoo.update(1/60);');
ok(true, '180 cuadros de update sin errores');
R('Zoo.onLevelEnd();');
ok(R('Zoo.recintos.length') === 0, 'onLevelEnd limpia los recintos');
ok(R('Zoo._els["zoo-feed"].style.display') === 'none', 'onLevelEnd oculta el botón');
R('Zoo.init(); Zoo.init();');
ok(R('typeof Zoo._els["zoo-feed"]') === 'object', 'init() idempotente');
buildZoo(3);
R('for (let i = 0; i < 60; i++) Zoo.update(1/60);');
ok(true, 'reconstruir el zoo tras onLevelEnd funciona');

console.log(`\n${pass} OK · ${fail} FAIL`);
process.exit(fail ? 1 : 0);
