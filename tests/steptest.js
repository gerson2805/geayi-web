// steptest.js — prueba del auto-escalón (subir aceras/bordillos caminando, sin saltar)
// y de que los postes/señales quedaron fuera de la calzada.
const fs = require('fs'), vm = require('vm');
require('./stubs.js');
const DIR = __dirname + '/../';
const FILES = ['state.js','i18n.js','audio.js','vehicles.js','world.js','neoncity.js','family.js','player.js','online.js','travel.js','phase3.js','powers.js','trophies.js','community.js','casa.js','pets.js','fishing.js','racing.js','weather.js','observatory.js','jobs.js','candy.js','citylife3.js','citylife1.js','citylife2.js','bridges.js','buildmode.js','funpark.js','bowling.js','train.js','monetiza.js','promos.js','dealership.js','waterpark.js','fireworks.js','zoo.js','concerts.js','carwash.js','castle.js','game.js','ranch.js'];
for (const f of FILES) vm.runInContext(fs.readFileSync(DIR + f, 'utf8'), global.sandbox, { filename: f });
let ok = 0, bad = 0;
const t = (name, cond) => { if (cond) { ok++; console.log('  ✅ ' + name); } else { bad++; console.log('  ❌ ' + name); } };
try {
  R('boot(); initThree(); Particles.init(); Avatar.build();');
  // ---- mundo 3 (Immokalee): postes y señales fuera de la calle ----
  R('startLevel(3); MODE="play";');
  // 1) no hay checkpoints con |x| < 6.5 (calzada ±3.35 + margen)
  const cps = R('LEVEL.checkpoints.map(c=>c.x)');
  t('checkpoints fuera de la calzada (|x|>=6.5): ' + JSON.stringify(cps), cps.every(x => Math.abs(x) >= 6.5));
  // 2) verificar en el código fuente que las señales de alto están en x=±7
  const src = fs.readFileSync(DIR + 'world.js', 'utf8');
  t('señales de alto en x=±7', /addStopSign\(G, 7, 22/.test(src) && /addStopSign\(G, -7, 68/.test(src));
  t('sin señales de alto en x=±3.9', !/addStopSign\(G, 3\.9/.test(src) && !/addStopSign\(G, -3\.9/.test(src));

  // ---- auto-escalón: simulación directa de moveAxis ----
  // Nivel sintético: losa base (top=0) + acera (top=0.18) al este
  R(`LEVEL = { platforms: [], group: null, coins: [], checkpoints: [] };
     LEVEL.platforms.push({x:0,z:0,topY:0,w:100,h:1,d:100,solid:true,mesh:null,kind:'static'});
     LEVEL.platforms.push({x:6,z:0,topY:0.18,w:5,h:1,d:100,solid:true,mesh:null,kind:'static'});
     Player.pos.x = 2.5; Player.pos.y = 0; Player.pos.z = 0; Player.vel.x = 0; Player.vel.y = 0;`);
  // 3) caminar hacia la acera (delta +x): debe SUBIR el escalón en vez de atorarse
  R(`moveAxis('x', 1.2);`);
  const px1 = R('Player.pos.x'), py1 = R('Player.pos.y');
  t('auto-escalón: sube la acera caminando (y=' + py1.toFixed(2) + ', x=' + px1.toFixed(2) + ')', Math.abs(py1 - 0.18) < 0.01 && px1 > 3.0);
  // 4) muro alto (2 m) SÍ bloquea: no hay escalón mágico
  R(`LEVEL.platforms.push({x:10,z:0,topY:2,w:1,h:3,d:100,solid:true,mesh:null,kind:'static'});
     Player.pos.x = 8.5; Player.pos.y = 0.18; Player.vel.x = 0;`);
  R(`moveAxis('x', 1.2);`);
  const px2 = R('Player.pos.x'), py2 = R('Player.pos.y');
  t('muro alto sí bloquea (x=' + px2.toFixed(2) + ' < 9.5, fuera del muro)', px2 < 9.5 && Math.abs(py2 - 0.18) < 0.01);
  // 5) escalón con techo encima (sin espacio para la cabeza) NO se sube
  R(`LEVEL.platforms.push({x:-6,z:0,topY:0.18,w:5,h:1,d:100,solid:true,mesh:null,kind:'static'});
     LEVEL.platforms.push({x:-6,z:0,topY:2.2,w:5,h:0.2,d:100,solid:true,mesh:null,kind:'static'});
     Player.pos.x = -2.5; Player.pos.y = 0; Player.vel.x = 0;`);
  R(`moveAxis('x', -1.2);`);
  const px3 = R('Player.pos.x'), py3 = R('Player.pos.y');
  t('escalón sin espacio para la cabeza no se sube (y=' + py3.toFixed(2) + ')', Math.abs(py3) < 0.01 && px3 > -3.6);
  // 6) el checkpoint de la acera sigue activándose al pasar cerca (trigger 2 m)
  R('startLevel(3); MODE="play";');
  const cp = R('LEVEL.checkpoints.filter(c=>c.y===0)[0]'); // el de la calle (los otros son de la torre)
  // stub: el material simplificado de pruebas no tiene color.set (en el juego real sí)
  R(`LEVEL.checkpoints.filter(c=>c.y===0).forEach(c=>{ c.flag.material.color={set(){}}; c.flag.material.emissive={set(){}}; c.ring.material.color={set(){}}; });`);
  R(`Player.pos.x = ${cp.x}; Player.pos.y = 0; Player.pos.z = ${cp.z}; levelTriggers(0.016);`);
  t('checkpoint en la acera se activa al pasar', R('LEVEL.checkpoints.filter(c=>c.y===0)[0].active') === true);
} catch (e) { bad++; console.log('  ❌ excepción: ' + (e && e.message)); }
console.log(`\nsteptest: ${ok} OK, ${bad} FAIL`);
process.exit(bad ? 1 : 0);
