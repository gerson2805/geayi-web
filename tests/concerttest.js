/* Pruebas de CONCIERTOS (concerts.js): escenario, show, banda, público y música */
'use strict';
const fs = require('fs'), vm = require('vm');
require(__dirname + '/stubs.js');
const DIR = '/home/hatch/workspace/your_files/obby-3d/';
const FILES = ['state.js', 'i18n.js', 'audio.js', 'world.js', 'concerts.js'];
for (const f of FILES) {
  try {
    vm.runInContext(fs.readFileSync(DIR + f, 'utf8'), global.sandbox, { filename: f });
  } catch (e) {
    console.log('✗ ERROR cargando ' + f + ': ' + e.message);
    process.exit(1);
  }
}
const R = global.R;
global.sandbox.__g0 = new global.sandbox.THREE.Group();
global.sandbox.__g3 = new global.sandbox.THREE.Group();

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; }
  else { fail++; console.log('  ✗ FAIL:', name); }
}

/* ============ 0. módulo ============ */
console.log('— módulo');
ok(R('typeof Concerts') === 'object', 'existe Concerts');
ok(R('typeof Concerts.init') === 'function', 'Concerts.init existe');
ok(R('typeof Concerts.buildForLevel') === 'function', 'Concerts.buildForLevel existe');
ok(R('typeof Concerts.update') === 'function', 'Concerts.update existe');
ok(R('typeof Concerts.startShow') === 'function', 'Concerts.startShow existe');
R('Concerts.init();');
ok(true, 'init() sin errores');

/* ============ 1. escenario solo en idx 0 ============ */
console.log('— escenario solo en Ciudad Neón (idx 0)');
R('Concerts.buildForLevel(0, __g0)');
ok(R('!!Concerts.stage'), 'idx0: se construye el escenario');
ok(R('Concerts.stage.children.length') > 10, 'idx0: escenario con tarima, luces, bocinas y pantallas');
ok(R('Concerts.stage.position.x') === 0 && R('Concerts.stage.position.z') === 20, 'escenario en (0, 0, 20)');
ok(R('__g0.children.indexOf(Concerts.stage)') !== -1, 'el escenario queda agregado al grupo del nivel');
ok(R('Math.hypot(Concerts.stage.position.x, Concerts.stage.position.z)') > 10, 'escenario lejos de la fuente de la plaza (0,0)');
const oldStage = R('Concerts.stage');
global.sandbox.__oldStage = oldStage;
R('Concerts.buildForLevel(3, __g3)');
ok(R('!Concerts.stage'), 'idx3: no se construye escenario');
ok(R('__g3.children.length') === 0, 'idx3: grupo del nivel vacío');
ok(R('__g0.children.indexOf(__oldStage)') === -1, 'cambiar de mundo retira el escenario anterior');
R('Concerts.buildForLevel(1, __g3)');
ok(R('!Concerts.stage'), 'idx1: no se construye escenario');
ok(R('Concerts.startShow()') === false, 'sin escenario no hay show');
R('Concerts.buildForLevel(0, __g0)');
ok(R('!!Concerts.stage'), 'de vuelta en idx0: escenario reconstruido');

/* ============ 2. show forzado: banda, público y música ============ */
console.log('— show: banda, público y música');
R('MODE = "play"');
ok(R('Concerts.startShow()') === true, 'startShow() arranca');
ok(R('!!Concerts.show'), 'hay show activo');
ok(R('Concerts.show.band.length') === 4, 'banda de 4 músicos');
ok(R('Concerts.show.crowd.length') === 12, 'público de 12 NPC');
ok(R('Concerts.show.phase') === 'play', 'fase play');
ok(R('Concerts.musicOn') === true, 'la música se activa (flag)');
ok(R('Concerts.startShow()') === false, 'no se duplica el show si ya hay uno');

/* ============ 3. el público baila al ritmo ============ */
console.log('— el público baila al ritmo');
const posOf = 'JSON.stringify(Concerts.show.crowd.map(c => [c.g.position.x.toFixed(3), c.g.position.y.toFixed(3), c.g.position.z.toFixed(3)].join(",")))';
const before = R(posOf);
R('for (let i = 0; i < 60; i++) Concerts.update(0.016);');
const after = R(posOf);
ok(before !== after, 'las posiciones del público cambian con el ritmo');
ok(R('Concerts.show.phase') === 'play', 'sigue en fase play tras 1 s');
ok(R('Concerts.musicOn') === true, 'la música sigue durante el show');

/* ============ 4. fin del show: aplauso, dispersión, limpieza ============ */
console.log('— fin del show: aplauso, dispersión y limpieza');
global.sandbox.__sg = R('Concerts.show.g');
R('Concerts.show.t = 0.05; for (let i = 0; i < 5; i++) Concerts.update(0.016);');
ok(R('Concerts.show.phase') === 'applause', 'fase aplauso al terminar los 60 s');
ok(R('Concerts.musicOn') === false, 'la música para al terminar el show');
ok(R('Concerts.show.crowd[0].armL.rotation.z') < -1, 'aplauden con los brazos arriba');
R('Concerts.show.t = 0.05; for (let i = 0; i < 5; i++) Concerts.update(0.016);');
ok(R('Concerts.show.phase') === 'leave', 'fase dispersión tras el aplauso');
const lx0 = R('Concerts.show.crowd[0].g.position.x + "," + Concerts.show.crowd[0].g.position.z');
R('for (let i = 0; i < 60; i++) Concerts.update(0.016);');
const lx1 = R('Concerts.show.crowd[0].g.position.x + "," + Concerts.show.crowd[0].g.position.z');
ok(lx0 !== lx1, 'el público se dispersa (se aleja del escenario)');
R('Concerts.show.t = 0.05; for (let i = 0; i < 5; i++) Concerts.update(0.016);');
ok(R('Concerts.show') === null, 'show limpio tras la dispersión');
ok(R('__g0.children.indexOf(__sg)') === -1, 'banda y público removidos del grupo');
ok(R('Concerts.musicOn') === false, 'música apagada tras limpiar');
ok(R('!!Concerts.stage'), 'el escenario permanente sigue en pie');

/* ============ 5. el show arranca solo cada ~4 min ============ */
console.log('— arranque automático del show');
R('Concerts.buildForLevel(0, __g0)'); // reinicia el temporizador (~200-260 s)
R('for (let i = 0; i < 17000 && !Concerts.show; i++) Concerts.update(0.016);');
ok(R('!!Concerts.show'), 'el show arranca solo tras el temporizador');
ok(R('Concerts.musicOn') === true, 'la música arranca con el show automático');
R('Concerts.onLevelEnd();');
ok(R('Concerts.show') === null && R('Concerts.musicOn') === false, 'onLevelEnd limpia show y música');

/* ============ 6. i18n ============ */
console.log('— i18n es/en');
ok(R('T("ct.show")') === '🎶 ¡CONCIERTO EN VIVO!', 'es: banner del show');
ok(R('T("ct.stage")').indexOf('ESCENARIO GEAYI') !== -1, 'es: nombre del escenario');
R('setLang("en")');
ok(R('T("ct.show")') === '🎶 LIVE CONCERT!', 'en: banner del show');
ok(R('T("ct.end")').indexOf('Neon City') !== -1, 'en: despedida del show');
R('setLang("es")');

/* ============ 7. la música no suena fuera de juego ============ */
console.log('— la música no suena fuera de juego');
R('Concerts.buildForLevel(0, __g0); MODE = "play"; Concerts.startShow();');
ok(R('Concerts.musicOn') === true, 'música activa en play');
R('MODE = "menu"; for (let i = 0; i < 3; i++) Concerts.update(0.016);');
ok(R('Concerts.musicOn') === false, 'update en menú corta la música');
R('_ctBeat(); _ctBeat();');
ok(R('Concerts.musicOn') === false, 'el secuenciador se autocorta fuera de play');
R('MODE = "play"; Concerts.onLevelEnd();');

console.log(`\n${pass} OK · ${fail} FAIL`);
process.exit(fail ? 1 : 0);
