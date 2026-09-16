/* Pruebas de la comisaría + trabajo de policía (citylife1.js §i):
   - la comisaría con 3 celdas solo se construye en idx 3 (no en idx 0)
   - la patrulla estacionada es abordable (botón SUBIR) sin romper la decorativa
   - arrestar a ≤4 m funciona (el NPC te sigue, manos arriba); a >4 m no
   - encerrar en celda libre paga +20 🪙 y la celda queda ocupada (puerta cerrada)
   - el delincuente huye si te ve de frente a >10 m; si escapa >80 m se pierde
   - el rango sube +5 por encierro; a 50+ el pago es +25 y huyen más lento
   - fianza: se genera al encerrar, el NPC la paga tras el tiempo, el jugador
     recibe el 50% y la celda queda libre
   Sigue el patrón de tests/jobtest.js. */
const fs = require('fs'), vm = require('vm');
require(__dirname + '/stubs.js');
const DIR = '/home/hatch/workspace/your_files/obby-3d/';
const FILES = ['state.js', 'i18n.js', 'audio.js', 'vehicles.js', 'world.js', 'neoncity.js', 'family.js',
  'player.js', 'online.js', 'travel.js', 'phase3.js', 'trophies.js',
  'casa.js', 'pets.js', 'fishing.js', 'racing.js', 'weather.js', 'observatory.js', 'ranch.js', 'jobs.js',
  'candy.js', 'citylife3.js', 'citylife1.js', 'citylife2.js', 'bridges.js', 'buildmode.js', 'funpark.js',
  'monetiza.js', 'promos.js', 'dealership.js', 'game.js'];
for (const f of FILES) {
  try {
    vm.runInContext(fs.readFileSync(DIR + f, 'utf8'), global.sandbox, { filename: f });
  } catch (e) {
    console.log('  ✗ ERROR cargando ' + f + ': ' + e.message);
    process.exit(1);
  }
}
console.log('carga: ' + FILES.length + ' archivos sin errores');

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; } else { fail++; console.log('  ✗ FAIL:', name); }
}
R('boot(); initThree(); Particles.init(); Avatar.build();');
R(`MODE='play'; LEVEL = buildLevel(3); Player.reset(-8,2,140);`);
R(`CityLife1.onLevelEnd(); CityLife1.onLevelStart(3);`);

// 1) comisaría solo en idx 3: 3 celdas libres, patrulla estacionada
ok(R(`CityLife1.state().station === true`), 'comisaría: se construye en idx 3');
ok(R(`CityLife1.state().cells === '000'`), 'comisaría: 3 celdas libres (' + R(`CityLife1.state().cells`) + ')');
ok(R(`LEVEL.cars.filter(c=>c.cl1police).length === 1`), 'comisaría: patrulla estacionada en LEVEL.cars');
ok(R(`CityLife1.state().police === true`), 'comisaría: la patrulla decorativa del circuito sigue');
ok(R(`CityLife1.state().amb === true`), 'comisaría: la ambulancia decorativa sigue');
// la patrulla es abordable con el botón SUBIR
R(`Player.pos.set(-8,0,163)`);
ok(R(`(function(){ const nb = nearestBoardable(); return !!(nb && nb.def && nb.def.cl1police); })()`),
  'comisaría: nearestBoardable detecta la patrulla (botón SUBIR)');

// 2) en idx 0 no hay comisaría
R(`CityLife1.onLevelEnd(); CityLife1.onLevelStart(0);`);
ok(R(`CityLife1.state().station === false`), 'comisaría: NO se construye en idx 0');
ok(R(`LEVEL.cars.filter(c=>c.cl1police).length === 0`), 'comisaría: sin patrulla en LEVEL.cars en idx 0');
R(`LEVEL = buildLevel(3); Player.reset(-8,2,140); CityLife1.onLevelEnd(); CityLife1.onLevelStart(3);`);
ok(R(`CityLife1.state().station === true`), 'comisaría: se reconstruye al volver a idx 3');

// 3) trabajo: empezar a patrullar
R(`SAVE.policeRank = 0; SAVE.coins = 100;`);
R(`CityLife1.toggleCop()`);
ok(R(`CityLife1.state().cop === true`), 'policía: toggleCop inicia el patrullaje');
ok(R(`_cl1Rank() === 0`), 'policía: rango inicial 0');

// 4) arresto a ≤4 m: el NPC te sigue (manos arriba)
const c1 = R(`(function(){ const c = _cl1SpawnCrim(); c.x = -8; c.z = 30; c.g.position.set(-8,0,30); return CL1.crims.length; })()`);
ok(c1 === 1, 'policía: delincuente generado robando tienda');
R(`Player.pos.set(-8,0,32.5)`); // a 2.5 m, por detrás (dir aleatoria; se fuerza abajo)
R(`(function(){ const c = CL1.crims[0]; c.dir = Math.PI; })()`); // mira al sur (-z): el jugador está al norte → no lo ve
R(`CityLife1.copAction()`);
ok(R(`CL1.crims[0].state === 'follow'`), 'policía: arrestar a ≤4 m → el NPC te sigue');
ok(R(`(function(){ const u = CL1.crims[0].g.userData.crim; return !!(u && u.armL && u.armR); })()`),
  'policía: el muñeco tiene brazos articulados (manos arriba)');
// el arrestado te sigue al caminar
R(`Player.pos.set(-8,0,40)`);
R(`_cl1CopTick(1.0)`);
ok(R(`Math.hypot(CL1.crims[0].x - (-8), CL1.crims[0].z - 40) < 3`), 'policía: el arrestado camina tras de ti');

// 5) a >4 m NO se puede arrestar
R(`(function(){ const c = _cl1SpawnCrim(); c.x = 20; c.z = 30; c.dir = 0; c.g.position.set(20,0,30); })()`);
R(`Player.pos.set(20,0,45)`); // a 15 m, detrás del delincuente (mira al norte +z)
R(`CityLife1.copAction()`);
ok(R(`CL1.crims[1].state === 'steal'`), 'policía: a >4 m no hay arresto (sigue robando)');

// 6) encerrar en celda libre: +20 🪙, celda ocupada, puerta cerrada, rango +5
const coins0 = R(`SAVE.coins`);
R(`(function(){ const c = CL1.crims[0]; c.x = -14; c.z = 146; c.g.position.set(-14,0,146); })()`); // celda 0
R(`CityLife1.copAction()`);
ok(R(`CL1.crims[0].state === 'jailed'`), 'policía: encerrar al arrestado en celda libre');
ok(R(`CityLife1.state().cells === '100'`), 'policía: la celda 0 queda ocupada');
ok(R(`SAVE.coins`) === coins0 + 20, 'policía: encerrar paga +20 🪙');
ok(R(`_cl1Rank() === 5`), 'policía: el rango sube +5 por encierro');
ok(R(`CL1.station.cells[0].doorT === 0`), 'policía: la puerta se cierra con rejas');

// 7) huida: te ve venir de frente a >10 m → huye; si escapa >80 m se pierde
R(`(function(){ const c = CL1.crims[1]; c.x = 0; c.z = 26; c.dir = 0; c.g.position.set(0,0,26); })()`);
R(`Player.pos.set(0,0,41)`); // 15 m al norte, de frente (el delincuente mira +z)
R(`_cl1CopTick(0.016)`);
ok(R(`CL1.crims[1].state === 'flee'`), 'policía: te ve de frente a >10 m → huye');
const nBefore = R(`CL1.crims.length`);
R(`(function(){ const c = CL1.crims[1]; c.x = 200; c.z = 200; })()`); // >80 m del jugador
R(`_cl1CopTick(0.016)`);
ok(R(`CL1.crims.length`) === nBefore - 1, 'policía: si escapa >80 m se pierde (sin pago)');
ok(R(`SAVE.coins`) === coins0 + 20, 'policía: el escape no paga monedas');

// 8) rango 50+: pago +25 y huida más lenta
R(`SAVE.policeRank = 45;`);
R(`(function(){ const c = _cl1SpawnCrim(); c.x = -8; c.z = 30; c.dir = Math.PI; c.g.position.set(-8,0,30); })()`);
R(`Player.pos.set(-8,0,32.5); CityLife1.copAction();`); // arrestar
const coins1 = R(`SAVE.coins`);
R(`(function(){ const c = CL1.crims[CL1.crims.length-1]; c.x = -8; c.z = 146; c.g.position.set(-8,0,146); })()`);
R(`CityLife1.copAction()`); // encerrar en celda 1
ok(R(`_cl1Rank() === 50`), 'policía: rango 45 + 5 = 50');
ok(R(`SAVE.coins`) === coins1 + 25, 'policía: a rango 50+ el pago sube a +25 🪙');
ok(R(`CityLife1.state().cells === '110'`), 'policía: segunda celda ocupada');
// huida más lenta a rango 50+
R(`(function(){ const c = _cl1SpawnCrim(); c.x = 0; c.z = 26; c.dir = 0; c.state='flee'; c.g.position.set(0,0,26); })()`);
R(`Player.pos.set(0,0,60)`);
R(`_cl1CopTick(1.0)`);
const fled = R(`Math.hypot(CL1.crims[CL1.crims.length-1].x - 0, CL1.crims[CL1.crims.length-1].z - 26)`);
ok(Math.abs(fled - 5.0) < 0.6, 'policía: a rango 50+ huye a 5 m/s (' + fled.toFixed(2) + ' m)');

// 9) fianza: se genera al encerrar
const cell0 = R(`CL1.station.cells[0]`);
ok(cell0.bail === 20 + Math.floor(5 / 2), 'fianza: precio = 20 + rango/2 (' + cell0.bail + ' 🪙)');
ok(cell0.bailT > 50 && cell0.bailT <= 90, 'fianza: vence en 60-90 s (' + cell0.bailT.toFixed(0) + ' s)');
// el NPC paga la fianza tras el tiempo: el jugador recibe el 50% y la celda queda libre
const coins2 = R(`SAVE.coins`);
const cut = Math.floor(cell0.bail / 2);
R(`CL1.station.cells[0].bailT = 0.05;`);
R(`_cl1CopTick(0.1)`);
ok(R(`CL1.station.cells[0].occupied === false`), 'fianza: tras el pago la celda queda libre');
ok(R(`CityLife1.state().cells === '010'`), 'fianza: mapa de celdas actualizado');
ok(R(`SAVE.coins`) === coins2 + cut, 'fianza: el jugador recibe el 50% (+' + cut + ' 🪙)');
ok(R(`CL1.station.cells[0].doorT === -1.9`), 'fianza: la puerta se abre para que salga');
// el liberado camina a la salida y desaparece
R(`for (let i=0;i<10;i++) _cl1CopTick(1.0);`);
ok(R(`CL1.crims.filter(c=>c.state==='leaving').length === 0`), 'fianza: el liberado sale y desaparece');

// 10) fin del patrullaje suelta a los sueltos pero no a los encarcelados
R(`CityLife1.toggleCop()`);
ok(R(`CityLife1.state().cop === false`), 'policía: toggleCop termina el patrullaje');
ok(R(`CityLife1.state().cells === '010'`), 'policía: el encarcelado sigue en su celda');

// 11) update completo 120 cuadros sin errores (con celda ocupada y fianza corriendo)
try {
  R(`CityLife1.toggleCop(); for (let i=0;i<120;i++) CityLife1.update(0.016); CityLife1.toggleCop();`);
  ok(true, 'policía: CityLife1.update 120 cuadros sin errores');
} catch (e) { ok(false, 'policía: 120 cuadros → ' + e.message); }

console.log(`\nRESULTADO: ${pass} OK, ${fail} FALLOS`);
process.exit(fail ? 1 : 0);
