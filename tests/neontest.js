/* Prueba de neoncity.js (CIUDAD NEÓN GIGANTE — reemplazo de buildLevel1):
   carga la cadena de scripts con stubs THREE/DOM, construye el nivel 0
   llamando a buildNeonCity(lvl) directamente (como hará el integrador) y
   verifica sin excepciones: start, meta, monedas, puntos de control,
   tráfico y letreros. Sigue el patrón de tests/worldstress.js. */
const fs = require('fs'), vm = require('vm');
require(__dirname + '/stubs.js');
const DIR = '/home/hatch/workspace/your_files/obby-3d/';
const FILES = ['state.js', 'i18n.js', 'audio.js', 'vehicles.js', 'world.js', 'family.js',
  'player.js', 'online.js', 'travel.js', 'phase3.js', 'trophies.js',
  'casa.js', 'pets.js', 'fishing.js', 'racing.js', 'weather.js', 'observatory.js', 'ranch.js',
  'neoncity.js'];
for (const f of FILES) {
  try {
    vm.runInContext(fs.readFileSync(DIR + f, 'utf8'), sandbox, { filename: f });
  } catch (e) {
    console.log('  ✗ ERROR cargando ' + f + ': ' + e.message);
    process.exit(1);
  }
}
console.log('carga: 20 archivos sin errores');

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; } else { fail++; console.log('  ✗ FAIL:', name); }
}

// world.js declara su propio `scene` (se llena en initThree): igual que worldstress.js
R('initThree(); Particles.init(); Avatar.build();');

ok(R(`typeof buildNeonCity==='function'`), 'api: buildNeonCity es función global');
ok(R(`typeof addNeonTower==='function' && typeof addNeonSign==='function'`), 'api: addNeonTower y addNeonSign expuestos');

// construir el nivel 0 exactamente como lo hará el integrador:
// mismo esqueleto que buildLevel() pero con buildNeonCity en vez de buildLevel1
const NEW_LVL = `(function(){
  clearLevel();
  const lvl = { idx:0, group:new THREE.Group(), platforms:[], sweepers:[], coins:[],
    checkpoints:[], planes:[], cars:[], npcs:[], decoSpinners:[], finish:null,
    lavaTex:null, ambient:null, start:{x:0,y:0,z:0}, killY:-12, ambAcc:0 };
  scene.add(lvl.group);
  decorate(0, lvl);
  buildNeonCity(lvl);
  if (typeof addPhase2Content==='function') addPhase2Content(0, lvl);
  if (typeof addPhase3Content==='function') addPhase3Content(0, lvl);
  return lvl;
})()`;
let lvl = null;
try {
  R('globalThis.__nlvl = ' + NEW_LVL + ';');
  lvl = R('globalThis.__nlvl');
  ok(true, 'construcción: buildNeonCity(lvl) sin excepciones');
} catch (e) {
  ok(false, 'construcción: buildNeonCity(lvl) → ' + e.message);
}

if (lvl) {
  ok(lvl.start && lvl.start.x === 0 && lvl.start.z === -172, 'start: {x:0, z:-172} en la avenida principal');
  ok(lvl.killY === -12, 'killY: -12');
  ok(lvl.finish !== null && lvl.finish.z === 172, 'meta: addFinish en z=172');
  ok(lvl.checkpoints.length === 4, 'checkpoints: 4 en la avenida');
  ok(lvl.coins.length >= 56, 'monedas: ' + lvl.coins.length + ' (>=56: aceras + plaza)');
  ok(lvl.traffic && lvl.traffic.length === 4, 'tráfico: 4 vehículos GEAYI en la avenida');
  ok(lvl.platforms.length >= 40, 'plataformas: ' + lvl.platforms.length + ' (losa + aceras + mirador)');
  ok(R(`globalThis.__nlvl.group.children.length`) > 400, 'mallas: ciudad gigante (' + R(`globalThis.__nlvl.group.children.length`) + ' objetos)');
  // segunda construcción: cachés reutilizadas, sin excepciones
  try {
    R(NEW_LVL);
    ok(true, 'reconstrucción: segunda llamada sin excepciones (cachés reutilizadas)');
  } catch (e) { ok(false, 'reconstrucción → ' + e.message); }
}

console.log(`\nresultado: ${pass} ok, ${fail} fallos`);
process.exit(fail ? 1 : 0);
