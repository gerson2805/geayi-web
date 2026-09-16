/* Pruebas de FUEGOS ARTIFICIALES (fireworks.js): show, estallidos, límites y ganchos */
'use strict';
const fs = require('fs'), vm = require('vm');
require(__dirname + '/stubs.js');
const DIR = '/home/hatch/workspace/your_files/obby-3d/';
const R = global.R;
function load(f) {
  vm.runInContext(fs.readFileSync(DIR + f, 'utf8'), global.sandbox, { filename: f });
}
// Fase 1: núcleo sin citylife3/citylife2 (los ganchos no deben romper)
['state.js', 'i18n.js', 'audio.js', 'world.js', 'weather.js', 'fireworks.js'].forEach(load);

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; }
  else { fail++; console.log('  ✗ FAIL:', name); }
}

/* ============ 1. módulo y API ============ */
console.log('— módulo y API');
R('Fireworks.init(); Fireworks.init();'); // idempotente
ok(R('typeof Fireworks') === 'object', 'existe Fireworks');
ok(R('typeof Fireworks.init') === 'function', 'Fireworks.init existe');
ok(R('typeof Fireworks.show') === 'function', 'Fireworks.show existe');
ok(R('typeof Fireworks.update') === 'function', 'Fireworks.update existe');
ok(R('typeof Fireworks.burst') === 'function', 'Fireworks.burst existe');
ok(R('typeof Fireworks.manualShow') === 'function', 'Fireworks.manualShow existe');
ok(R('T("fw.show")') !== 'fw.show', 'i18n es registrada (fw.show)');
ok(R('document.getElementById("side-menu").children.length') === 1, 'botón 🎆 inyectado una vez en el side-menu');
ok(R('Particles.list.length') === 0, 'Particles intacto al iniciar');

/* ============ 2. show() crea cohetes y estallidos ============ */
console.log('— show() crea cohetes y estallidos');
R('MODE = "play";');
R('initThree(); Particles.init();');
R('Fireworks.stats.launched = 0; Fireworks.stats.bursts = 0;');
R('Fireworks.show(10, 20, 4);');
R('for (let i = 0; i < 180; i++) Fireworks.update(1/60);'); // 3 s
ok(R('Fireworks.stats.launched') > 0, `cohetes lanzados (${R('Fireworks.stats.launched')})`);
ok(R('Fireworks.stats.bursts') > 0, `estallidos producidos (${R('Fireworks.stats.bursts')})`);
ok(R('Fireworks._showT') > 0, 'el show sigue en curso antes de durSec');

/* ============ 3. el show termina solo y limpia ============ */
console.log('— el show termina solo y limpia');
R('for (let i = 0; i < 1200; i++) Fireworks.update(1/60);'); // +20 s (show era de 4 s)
ok(R('Fireworks._showT') <= 0, 'el show termina tras durSec');
ok(R('Fireworks._rockets.length') === 0, 'no quedan cohetes en vuelo');
ok(R('Fireworks.activeBursts()') === 0, 'no quedan estallidos activos');

/* ============ 4. límite de estallidos simultáneos ============ */
console.log('— límite de estallidos simultáneos');
R('for (let i = 0; i < 30; i++) Fireworks.burst(0, 25, 0, "sphere", [0xff0000, 0x00ff00]);');
ok(R('Fireworks.activeBursts()') <= 6, `máximo 6 estallidos (${R('Fireworks.activeBursts()')})`);
ok(R('Fireworks.burst(0, 25, 0)') === false, 'burst() devuelve false cuando el pool está lleno');
R('for (let i = 0; i < 300; i++) Fireworks.update(1/60);');
ok(R('Fireworks.activeBursts()') === 0, 'los estallidos se apagan solos');
// formas: esfera, anillo y sauce no rompen
for (const s of ['sphere', 'ring', 'willow']) {
  R(`Fireworks.burst(5, 30, -5, "${s}", Fireworks.PALETTES[0]);`);
}
ok(R('Fireworks.activeBursts()') === 3, 'las 3 formas (esfera/anillo/sauce) funcionan');
R('for (let i = 0; i < 300; i++) Fireworks.update(1/60);');
ok(R('Fireworks.activeBursts()') === 0, 'limpieza tras las 3 formas');

/* ============ 5. botón manual: cooldown 2 min, gratis ============ */
console.log('— show manual con cooldown');
R('Fireworks._coolT = 0; Fireworks._showT = 0;');
R('Fireworks.manualShow();');
ok(R('Fireworks._coolT') > 100, `cooldown de 2 min activado (${Math.round(R('Fireworks._coolT'))}s)`);
ok(R('Fireworks._showT') > 0, 'el show manual arranca (20 s)');
const showT1 = R('Fireworks._showT');
R('Fireworks.manualShow();'); // segundo intento en cooldown: no reinicia
ok(Math.abs(R('Fireworks._showT') - showT1) < 1, 'en cooldown no lanza otro show');
R('for (let i = 0; i < 1800; i++) Fireworks.update(1/60);'); // +30 s: termina el show
ok(R('Fireworks._showT') <= 0 && R('Fireworks.activeBursts()') === 0, 'el show manual termina y limpia');

/* ============ 6. ganchos sin módulos: no rompen ============ */
console.log('— ganchos sin citylife3/concerts/citylife2');
ok(R('typeof _seasonEff') === 'undefined', 'citylife3 NO cargado (precondición)');
ok(R('typeof Concerts') === 'undefined', 'concerts NO cargado (precondición)');
ok(R('typeof CL2') === 'undefined', 'citylife2 NO cargado (precondición)');
let threw = false;
try {
  R('MODE = "play"; Fireworks._partyKey = ""; for (let i = 0; i < 1200; i++) Fireworks.update(1/60);');
} catch (e) { threw = true; console.log('   error:', e.message); }
ok(!threw, '1200 cuadros de update sin citylife3/concerts/citylife2 no lanzan error');
// aviso de día no rompe (Weather.t=0.15 → de día)
R('Fireworks.show(0, 0, 5);');
ok(true, 'show() de día no rompe (aviso 🌃 mejor de noche)');
R('for (let i = 0; i < 900; i++) Fireworks.update(1/60);');

/* ============ 7. ganchos CON módulos ============ */
console.log('— ganchos con citylife3/citylife2/concerts cargados');
load('citylife3.js');
try {
  load('citylife2.js');
} catch (e) {
  // NOTA: citylife2.js trae un error ajeno a este módulo (otro agente lo dejó con
  // "Cannot access 'CityLife2' before initialization" al cargar). CL2/fair sí
  // quedan definidos (línea 208, antes del punto que falla) y el hook los usa.
  console.log('   (aviso: citylife2.js no carga limpio por un error ajeno: ' + e.message + ')');
}
load('concerts.js');
ok(R('typeof _seasonEff') === 'function', 'citylife3 cargado (_seasonEff existe)');
ok(R('typeof Concerts') === 'object', 'concerts.js cargado (Concerts existe)');
// 7a. fiesta de noche → show automático una sola vez por día
R('Weather.nightFactor = 1;'); // forzar noche
R('_seasonEff = function () { return "navidad"; };'); // simular temporada
R('Fireworks._partyKey = ""; Fireworks._showT = 0; Fireworks.stats.launched = 0;');
R('for (let i = 0; i < 120; i++) Fireworks.update(1/60);');
ok(R('Fireworks._partyKey').indexOf('navidad|') === 0, 'la fiesta de navidad dispara el show de noche');
ok(R('Fireworks._showT') > 0, 'show de fiesta en curso');
R('for (let i = 0; i < 2400; i++) Fireworks.update(1/60);'); // deja terminar
// 7b. de día NO dispara (espera la noche)
R('Weather.nightFactor = 0; Fireworks._partyKey = ""; Fireworks._showT = 0;');
R('for (let i = 0; i < 120; i++) Fireworks.update(1/60);');
ok(R('Fireworks._showT') === 0 && R('Fireworks._partyKey') === '', 'de día no hay show de fiesta (espera la noche)');
R('Weather.nightFactor = 1;');
// 7c. cierre de la feria → fuegos
R('Fireworks._showT = 0; CL2.fair.active = true;');
R('for (let i = 0; i < 5; i++) Fireworks.update(1/60);'); // registra estado previo
R('CL2.fair.active = false;'); // simula el cierre
R('for (let i = 0; i < 5; i++) Fireworks.update(1/60);');
ok(R('Fireworks._showT') > 0, 'el cierre de la feria dispara fuegos');
// 7d. concierto: gran final al terminar el show (fase applause)
R('Fireworks._showT = 0; Fireworks._concertPhase = null; Fireworks._concertWas = false;');
R('CT.show = { phase: "play", t: 10, wall: Date.now() };');
R('for (let i = 0; i < 5; i++) Fireworks.update(1/60);');
ok(R('Fireworks._showT') === 0, 'durante el concierto (fase play) no hay fuegos');
R('CT.show.phase = "applause";'); // el show terminó, el público aplaude
R('for (let i = 0; i < 5; i++) Fireworks.update(1/60);');
ok(R('Fireworks._showT') > 0, 'al terminar el concierto hay gran final con fuegos');
R('CT.show = null;');
R('for (let i = 0; i < 2400; i++) Fireworks.update(1/60);'); // limpia
ok(R('Fireworks._showT') <= 0 && R('Fireworks.activeBursts()') === 0, 'limpieza final tras ganchos');

console.log(`\n${pass} OK · ${fail} FAIL`);
process.exit(fail ? 1 : 0);
