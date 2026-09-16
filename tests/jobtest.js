/* Prueba del módulo de trabajos (jobs.js): carga, JOBS, casas registradas,
   start/stop de los 3 trabajos, mecánicas (cortar/pintar/construir) y
   updateJobs 120 cuadros sin errores en buildLevel(3). Sigue el patrón de modtest.js. */
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
R(`MODE='play'; LEVEL = buildLevel(3); Player.reset(30,2,118);`);

// JOBS: existen los 4 trabajos
ok(R(`typeof JOBS !== 'undefined' && JOBS.length === 4`), 'jobs: JOBS tiene 4 trabajos');
ok(R(`JOBS.map(j=>j.id).join(',') === 'garden,paint,build,tamps'`), 'jobs: ids garden/paint/build/tamps');
ok(R(`typeof startJob==='function' && typeof stopJob==='function' && typeof updateJobs==='function' && typeof openJobsPanel==='function'`),
  'jobs: funciones startJob/stopJob/updateJobs/openJobsPanel expuestas');
// casas pintables registradas desde world.js
ok(R(`Array.isArray(LEVEL.houses) && LEVEL.houses.length > 10`),
  'jobs: LEVEL.houses registrado (' + R(`LEVEL.houses.length`) + ' casas)');
// cortacésped registrado como vehículo
ok(R(`VEHICLE_TYPES['geayi-mower'] && typeof VEHICLE_BUILDERS['geayi-mower']==='function'`),
  'jobs: VEHICLE_TYPE geayi-mower registrado');

// start/stop de cada trabajo sin errores
for (const id of ['garden', 'paint', 'build']) {
  try {
    R(`startJob('${id}')`);
    ok(R(`JB.active === '${id}'`), 'jobs: startJob activa ' + id);
    R(`for (let i=0;i<40;i++) updateJobs(0.016);`);
    R(`stopJob()`);
    ok(R(`JB.active === null`), 'jobs: stopJob limpia ' + id);
  } catch (e) { ok(false, 'jobs: start/update/stop ' + id + ' → ' + e.message); }
}

// 🌱 jardinería: la cortacésped aparece y cortar un parche da +5
try {
  R(`startJob('garden')`);
  ok(R(`JB.mower && JB.mower.mesh && JB.patches.length === 12`), 'jobs: cortacésped + 12 parches creados');
  ok(R(`LEVEL.cars.indexOf(JB.mower) >= 0`), 'jobs: cortacésped en LEVEL.cars (botón SUBIR la detecta)');
  const c0 = R(`SAVE.coins`);
  R(`(function(){ Vehicle.mode='car'; Vehicle.def=JB.mower;
      JB.mower.mesh.position.set(JB.patches[0].position.x, 0, JB.patches[0].position.z);
      updateJobs(0.016); })()`);
  ok(R(`SAVE.coins`) === c0 + 5, 'jobs: cortar pasto da +5 🪙');
  ok(R(`JB.patches[0].userData.cut === true`), 'jobs: el parche queda marcado como cortado');
  const nCars = R(`LEVEL.cars.length`);
  R(`stopJob()`);
  ok(R(`LEVEL.cars.length`) === nCars - 1, 'jobs: stopJob retira la cortacésped');
} catch (e) { ok(false, 'jobs: mecánica de jardinería → ' + e.message); }

// 🎨 pintura: detecta casa cercana y pintar da +8
try {
  R(`startJob('paint')`);
  R(`(function(){ const h = LEVEL.houses[0]; Player.pos.set(h.x + 3, 1, h.z); })()`);
  R(`updateJobs(0.016)`);
  ok(R(`JB.paintTarget !== null`), 'jobs: detecta casa cercana para pintar');
  const c0 = R(`SAVE.coins`);
  R(`_jobAction()`);
  ok(R(`SAVE.coins`) === c0 + 8, 'jobs: pintar casa da +8 🪙');
  ok(R(`LEVEL.houses[0].paintCd > 0`), 'jobs: la casa queda con cooldown de 120 s');
  R(`stopJob()`);
} catch (e) { ok(false, 'jobs: mecánica de pintura → ' + e.message); }

// 🏗️ construcción: 6 fantasmas, poner bloque da +10
try {
  R(`startJob('build')`);
  ok(R(`JB.ghosts.length === 6`), 'jobs: 6 fantasmas de pared creados');
  R(`(function(){ const w = JB.ghosts[0]; Player.pos.set(w.position.x + 2, 1, w.position.z); })()`);
  R(`updateJobs(0.016)`);
  ok(R(`JB.buildTarget !== null`), 'jobs: detecta pared fantasma cercana');
  const c0 = R(`SAVE.coins`);
  R(`_jobAction()`);
  ok(R(`SAVE.coins`) === c0 + 10, 'jobs: poner bloque da +10 🪙');
  ok(R(`JB.builtCount === 1 && JB.ghosts[0].userData.built === true`), 'jobs: la pared queda sólida');
  R(`stopJob()`);
  ok(R(`JB.group === null`), 'jobs: stopJob retira la obra');
} catch (e) { ok(false, 'jobs: mecánica de construcción → ' + e.message); }

// 120 cuadros de updateJobs sin errores (jardinería activa)
try {
  R(`startJob('garden'); for (let i=0;i<120;i++) updateJobs(0.016); stopJob();`);
  ok(true, 'jobs: updateJobs 120 cuadros sin errores');
} catch (e) { ok(false, 'jobs: 120 cuadros → ' + e.message); }

// fuera de Immokalee no se puede empezar (no lanza errores)
try {
  R(`LEVEL = buildLevel(0)`);
  const r = R(`startJob('garden')`);
  ok(r === false && R(`JB.active`) === null, 'jobs: fuera de Immokalee no inicia');
} catch (e) { ok(false, 'jobs: fuera de Immokalee → ' + e.message); }

// panel abre/cierra sin errores
try {
  R(`openJobsPanel(); closeJobsPanel();`);
  ok(true, 'jobs: openJobsPanel/closeJobsPanel sin errores');
} catch (e) { ok(false, 'jobs: panel → ' + e.message); }

console.log(`\nRESULTADO: ${pass} OK, ${fail} FALLOS`);
process.exit(fail ? 1 : 0);
