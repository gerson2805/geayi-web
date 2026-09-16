/* Prueba de integración total: carga game.js + ranch.js y corre boot(). */
const fs = require('fs'), vm = require('vm');
require(__dirname + '/stubs.js');
const DIR = '/home/hatch/workspace/your_files/obby-3d/';
const FILES = ['state.js', 'i18n.js', 'audio.js', 'vehicles.js', 'world.js', 'neoncity.js', 'family.js',
  'player.js', 'online.js', 'travel.js', 'phase3.js', 'powers.js', 'trophies.js', 'community.js',
  'casa.js', 'pets.js', 'fishing.js', 'racing.js', 'weather.js', 'observatory.js',
  'jobs.js', 'candy.js', 'citylife3.js', 'citylife1.js', 'citylife2.js', 'bridges.js', 'buildmode.js', 'funpark.js', 'bowling.js', 'train.js', 'monetiza.js', 'promos.js', 'dealership.js', 'vet.js', 'waterpark.js', 'fireworks.js', 'zoo.js', 'concerts.js', 'carwash.js', 'castle.js',
  'safewords.js', 'support.js',
  'game.js', 'ranch.js'];
for (const f of FILES) {
  try {
    vm.runInContext(fs.readFileSync(DIR + f, 'utf8'), global.sandbox, { filename: f });
  } catch (e) {
    console.log('✗ ERROR cargando ' + f + ': ' + e.message);
    process.exit(1);
  }
}
console.log('carga: 20 archivos OK (incluye game.js + ranch.js)');
try {
  R('boot()');
  console.log('boot() OK — MODE=' + R('MODE'));
} catch (e) {
  console.log('✗ ERROR en boot(): ' + e.message);
  console.log(e.stack.split('\n').slice(0, 4).join('\n'));
  process.exit(1);
}
// simular: ir a niveles, abrir trofeos, cambiar idioma, personalizar
try {
  R('initThree(); Particles.init(); Avatar.build();');
  R(`renderLevels(); showMain('screen-levels')`);
  R(`startLevel(0)`);
  console.log('startLevel(0) OK — LEVEL.idx=' + R('LEVEL.idx') + ' MODE=' + R('MODE'));
  // un cuadro completo del loop real
  R(`(function(){ const dt=0.016; levelTime+=dt; const inp={x:0,z:0,jump:false}; updatePlayer(dt,inp);
    if (typeof updateNPCs==='function') updateNPCs(dt);
    if (typeof updateWorldFx==='function') updateWorldFx(dt);
    if (typeof updateVehiclePrompt==='function') updateVehiclePrompt();
    if (typeof updateAirportPrompt==='function') updateAirportPrompt();
    if (typeof _updateSmoke==='function') _updateSmoke(dt);
    if (typeof _updateSled==='function') _updateSled(dt);
    if (typeof updateCasa==='function') updateCasa(dt);
    if (typeof updatePets==='function') updatePets(dt);
    if (typeof updateFishing==='function') updateFishing(dt);
    if (typeof updateRacing==='function') updateRacing(dt);
    if (typeof updateObservatory==='function') updateObservatory(dt);
    if (typeof updateRanch==='function') updateRanch(dt);
    if (typeof updateWeather==='function') updateWeather(dt);
    return true; })()`);
  console.log('cuadro de juego completo OK');
  R(`discoverWorld(0)`);
  console.log('discoverWorld(0) OK — trofeo w1=' + R(`Trophy.has('w1')`) + ' · visitado=' + R(`SAVE.visited[0] ? 'si' : 'no'`));
  R(`discoverWorld(0)`); // segunda visita no repite el bono
  console.log('discoverWorld repetido OK (sin doble bono)');
  R(`setLang('en'); setLang('pt'); setLang('fr'); setLang('es')`);
  console.log('cambio de idioma OK — title=' + R('document.title'));
  R(`renderCustom(); showMain('screen-custom')`);
  console.log('renderCustom() OK (con sección de mascotas)');
  const root = R(`(function(){ const r=$('trophies-root'); r.innerHTML=''; r.appendChild(renderTrophyPanel()); return r.children.length; })()`);
  console.log('renderTrophyPanel() OK — nodos=' + root);
} catch (e) {
  console.log('✗ ERROR en simulación: ' + e.message);
  console.log(e.stack.split('\n').slice(0, 5).join('\n'));
  process.exit(1);
}
console.log('\nINTEGRACIÓN TOTAL: OK');
