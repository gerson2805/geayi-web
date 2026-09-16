// colortest.js — manejo de color correcto: colores vivos, sin lavado pastel
const fs = require('fs'), vm = require('vm');
require('./stubs.js');
// Simular three r149 real: con sRGBEncoding y ColorManagement disponibles
global.sandbox.THREE.sRGBEncoding = 3001;
global.sandbox.THREE.ColorManagement = { legacyMode: true };
const DIR = __dirname + '/../';
const FILES = ['state.js','i18n.js','audio.js','vehicles.js','world.js','neoncity.js','family.js','player.js','online.js','travel.js','phase3.js','powers.js','trophies.js','community.js','casa.js','pets.js','fishing.js','racing.js','weather.js','observatory.js','jobs.js','candy.js','citylife3.js','citylife1.js','citylife2.js','bridges.js','buildmode.js','funpark.js','bowling.js','train.js','monetiza.js','promos.js','dealership.js','waterpark.js','fireworks.js','zoo.js','concerts.js','carwash.js','castle.js','game.js','ranch.js'];
for (const f of FILES) vm.runInContext(fs.readFileSync(DIR + f, 'utf8'), global.sandbox, { filename: f });
let ok = 0, bad = 0;
const t = (name, cond) => { if (cond) { ok++; console.log('  ✅ ' + name); } else { bad++; console.log('  ❌ ' + name); } };
try {
  R('boot(); initThree();');
  t('ColorManagement.legacyMode desactivado (color correcto)', R('THREE.ColorManagement.legacyMode') === false);
  t('renderer con salida sRGB', R('renderer.outputEncoding') === 3001);
  const enc = R('(function(){ const c = document.createElement("canvas"); return new THREE.CanvasTexture(c).encoding; })()');
  t('texturas de canvas marcadas sRGB (letreros nítidos y vivos)', enc === 3001);
} catch (e) { bad++; console.log('  ❌ excepción: ' + (e && e.message)); }
console.log('COLORTEST: ' + ok + ' ✅ · ' + bad + ' ❌');
process.exit(bad ? 1 : 0);
