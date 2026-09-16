// biketest.js — la bici parece bici: orientada a la marcha, sin "caparazón"
const fs = require('fs'), vm = require('vm');
require('./stubs.js');
const DIR = __dirname + '/../';
const FILES = ['state.js','i18n.js','audio.js','vehicles.js','world.js','neoncity.js','family.js','player.js','online.js','travel.js','phase3.js','powers.js','trophies.js','community.js','casa.js','pets.js','fishing.js','racing.js','weather.js','observatory.js','jobs.js','candy.js','citylife3.js','citylife1.js','citylife2.js','bridges.js','buildmode.js','funpark.js','bowling.js','train.js','monetiza.js','promos.js','dealership.js','waterpark.js','fireworks.js','zoo.js','concerts.js','carwash.js','castle.js','game.js','ranch.js'];
for (const f of FILES) vm.runInContext(fs.readFileSync(DIR + f, 'utf8'), global.sandbox, { filename: f });
let ok = 0, bad = 0;
const t = (name, cond) => { if (cond) { ok++; console.log('  ✅ ' + name); } else { bad++; console.log('  ❌ ' + name); } };
try {
  R('boot();');
  R(`window.__bike = buildBikeMesh(0xe63946);
     window.__parts = [];
     window.__bike.traverse(o => { if (o.geometry && o.geometry.args) window.__parts.push({ args: o.geometry.args, x: o.position.x, y: o.position.y, z: o.position.z, nargs: o.geometry.args.length }); });`);
  const parts = R('window.__parts');
  const boxes = parts.filter(p => p.nargs === 3);
  const findBox = (w, h, d) => boxes.find(p => Math.abs(p.args[0]-w)<1e-6 && Math.abs(p.args[1]-h)<1e-6 && Math.abs(p.args[2]-d)<1e-6);
  const headlight = findBox(0.12, 0.12, 0.12);
  const handlebar = findBox(0.52, 0.09, 0.09);
  const saddle = findBox(0.3, 0.09, 0.26);
  t('faro al frente (+z, dirección de marcha)', headlight && headlight.z > 0.5);
  t('manillar al frente (+z)', handlebar && handlebar.z > 0.5);
  t('asiento atrás (−z)', saddle && saddle.z < 0);
  t('sin tablas planas de 1 m (sin "caparazón")', !boxes.some(p => p.args[2] >= 0.9));
  const torus5 = parts.filter(p => p.nargs === 5); // TorusGeometry con arco = salpicadera curva
  t('salpicaderas curvas sobre las ruedas (2 arcos)', torus5.length === 2 &&
    torus5.every(p => Math.abs(p.args[0]-0.57)<1e-6 && Math.abs(p.args[4]-2.0)<1e-6));
  t('2 ruedas con rayos', R('window.__bike.userData.wheels.length') === 2);
  t('bielas/pedales presentes', !!R('window.__bike.userData.crank'));
} catch (e) { bad++; console.log('  ❌ excepción: ' + (e && e.message)); }
console.log('BIKETEST: ' + ok + ' ✅ · ' + bad + ' ❌');
process.exit(bad ? 1 : 0);
