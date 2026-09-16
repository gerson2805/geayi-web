// checkpointtest.js — los 🚩 puntos de control NO van en medio de la calle.
// Regresión: los postes con banderín estaban en x=0 (centro de la avenida,
// donde circulan los carros). Ahora deben estar en la acera (|x| >= 3.5).
const fs = require('fs'), vm = require('vm');
require('./stubs.js');
const DIR = __dirname + '/../';
const FILES = ['state.js','i18n.js','audio.js','vehicles.js','world.js','neoncity.js','family.js','player.js','online.js','travel.js','phase3.js','powers.js','trophies.js','community.js','casa.js','pets.js','fishing.js','racing.js','weather.js','observatory.js','jobs.js','candy.js','citylife3.js','citylife1.js','citylife2.js','bridges.js','buildmode.js','funpark.js','bowling.js','train.js','monetiza.js','promos.js','dealership.js','waterpark.js','fireworks.js','zoo.js','concerts.js','carwash.js','castle.js','infinite.js','game.js','ranch.js'];
for (const f of FILES) vm.runInContext(fs.readFileSync(DIR + f, 'utf8'), global.sandbox, { filename: f });
let ok = 0, bad = 0;
const t = (name, cond) => { if (cond) { ok++; console.log('  ✅ ' + name); } else { bad++; console.log('  ❌ ' + name); } };
try {
  R('boot(); initThree(); Particles.init(); Avatar.build();');
  // mundos ciudad: 0 Neón, 2 Volcán, 3 Immokalee, 4 Honduras, 5 México, 6 USA, 7 España, 8 Nevada
  for (const idx of [0, 2, 3, 4, 5, 6, 7, 8]) {
    R('startLevel(' + idx + ')');
    const cps = R('(LEVEL.checkpoints || []).map(c => ({x: c.x, z: c.z}))');
    const onRoad = cps.filter(c => Math.abs(c.x) < 3.5);
    t('mundo ' + idx + ': ' + cps.length + ' checkpoints, ninguno en la calzada', cps.length > 0 && onRoad.length === 0);
  }
  // el trigger sigue funcionando en la acera: jugador junto al poste lo activa
  R('startLevel(0)');
  const cp = R('LEVEL.checkpoints[0]');
  R(`LEVEL.checkpoints.forEach(c => {
    const mock = () => ({ color: { set(){} }, emissive: { set(){} } });
    c.flag.material = mock(); c.ring.material = mock();
  })`);
  R('Player.pos.x = ' + (cp.x + 1) + '; Player.pos.z = ' + cp.z + '; Player.pos.y = 0;');
  R('updatePlayer(0.016, {x:0,z:0,jump:false})');
  t('checkpoint en la acera se activa al pasar cerca', R('LEVEL.checkpoints[0].active') === true);
} catch (e) { bad++; console.log('  ❌ excepción: ' + (e && e.message)); }
console.log('CHECKPOINTTEST: ' + ok + ' ✅ · ' + bad + ' ❌');
process.exit(bad ? 1 : 0);
