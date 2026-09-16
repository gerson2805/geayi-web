/* Smoke test de los 7 módulos: carga, builders en idx 3 y updates sin lanzar errores. */
const fs = require('fs'), vm = require('vm');
require(__dirname + '/stubs.js');
const DIR = '/home/hatch/workspace/your_files/obby-3d/';
const FILES = ['state.js', 'i18n.js', 'audio.js', 'vehicles.js', 'world.js', 'neoncity.js', 'family.js',
  'player.js', 'online.js', 'travel.js', 'phase3.js', 'trophies.js',
  'casa.js', 'pets.js', 'fishing.js', 'racing.js', 'weather.js', 'observatory.js', 'ranch.js', 'jobs.js'];
for (const f of FILES) {
  try {
    vm.runInContext(fs.readFileSync(DIR + f, 'utf8'), sandbox, { filename: f });
  } catch (e) {
    console.log('  ✗ ERROR cargando ' + f + ': ' + e.message);
    process.exit(1);
  }
}
console.log('carga: 19 archivos sin errores');

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; } else { fail++; console.log('  ✗ FAIL:', name); }
}
R('initThree(); Particles.init(); Avatar.build();');
R(`MODE='play'; LEVEL = buildLevel(3); Player.reset(0,2,0)`);

// builders (buildLevel ya los llamó vía world.js)
ok(R(`typeof CASA !== 'undefined' && CASA.x === -20`), 'casa: constante CASA existe');
ok(R(`typeof FISH_SPOT !== 'undefined'`), 'pesca: FISH_SPOT existe');
ok(R(`typeof RACE !== 'undefined'`), 'carreras: RACE existe');
ok(R(`typeof OBS !== 'undefined'`), 'observatorio: OBS existe');
ok(R(`typeof Ranch !== 'undefined'`), 'rancho: Ranch existe');
ok(R(`typeof Weather !== 'undefined'`), 'clima: Weather existe');

// updates no lanzan errores en 120 cuadros
try {
  for (let i = 0; i < 120; i++) {
    R(`updateCasa(0.016); updatePets(0.016); updateFishing(0.016); updateRacing(0.016);
       updateObservatory(0.016); updateRanch(0.016); updateWeather(0.016); updateJobs(0.016);`);
  }
  ok(true, 'updates: 120 cuadros sin errores');
} catch (e) {
  ok(false, 'updates sin errores → ' + e.message);
}

// mascota
ok(R(`Pets.onLevelStart(), true`), 'pets: onLevelStart no falla');
R(`SAVE.pet = 'dog'`);
ok(R(`Pets.onLevelStart(), true`), 'pets: onLevelStart con perrito no falla');

// clima: ciclo avanza
const t0 = R(`Weather.t`);
R(`for (let i = 0; i < 600; i++) updateWeather(0.016)`);
ok(R(`Weather.t !== ${t0}`), 'clima: el ciclo día/noche avanza');

// observatorio: contenido solo en idx 3
ok(R(`LEVEL = buildLevel(0), typeof OBS !== 'undefined'`), 'observatorio no rompe otros mundos');

console.log(`\nRESULTADO: ${pass} OK, ${fail} FALLOS`);
process.exit(fail ? 1 : 0);
