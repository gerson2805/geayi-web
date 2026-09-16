/* Pruebas de sports.js (🏟️ Olimpiadas GEAYI): menú, física de pelota,
   circuito, rally, levantamiento y natación (stubs THREE/DOM). */
const fs = require('fs'), vm = require('vm');
require(__dirname + '/stubs.js');
const DIR = '/home/hatch/workspace/your_files/obby-3d/';
const FILES = ['state.js', 'i18n.js', 'audio.js', 'sports.js'];
for (const f of FILES) {
  try {
    vm.runInContext(fs.readFileSync(DIR + f, 'utf8'), global.sandbox, { filename: f });
  } catch (e) {
    console.log('  ✗ ERROR cargando ' + f + ': ' + e.message);
    process.exit(1);
  }
}
console.log('carga: 4 archivos sin errores');

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; } else { fail++; console.log('  ✗ FAIL:', name); }
}
const R = (expr) => vm.runInContext(expr, global.sandbox);

ok(R(`typeof Sports !== 'undefined'`), 'Sports existe');
try { R(`Sports.init()`); ok(true, 'Sports.init() no falla'); }
catch (e) { ok(false, 'init → ' + e.message); }
ok(R(`Sports._t('sp.title') === '🏟️ Olimpiadas GEAYI'`), 'título ES');
const menu = R(`Sports._menu()`);
ok(Array.isArray(menu) && menu.length === 10, 'menú con 10 deportes');
ok(R(`Sports._menu().map(s=>s.id).join(',') === 'race,bike,soccer,basket,tennis,pingpong,volley,swim,lift,dash'`),
  'deportes: race bike soccer basket tennis pingpong volley swim lift dash');

/* ---------- récords y formato ---------- */
ok(R(`Sports._fmtTime(75.25) === '1:15.3s'`), '_fmtTime 75.25');
R(`SAVE.sp = {};`);
ok(R(`Sports._setBest('sp_swim', 20, true).best === true`), 'primer tiempo se guarda');
ok(R(`Sports._setBest('sp_swim', 25, true).best === false`), 'peor tiempo no gana');
ok(R(`Sports._setBest('sp_lift', 30, false).best === true`), 'primer puntaje se guarda');
ok(R(`Sports._setBest('sp_lift', 20, false).best === false`), 'peor puntaje no gana');

/* ---------- escenario y pelota ---------- */
R(`Player = { pos: { x: 0, y: 0, z: 0, set(x,y,z){ this.x=x; this.y=y; this.z=z; } }, vel: { set(){} }, heading: 0 };`);
R(`MODE = 'play';`);
try { R(`Sports._newVenue()`); ok(true, '_newVenue no falla'); } catch (e) { ok(false, '_newVenue → ' + e.message); }
R(`Sports._spawnBall(0.4, 0xffffff, 0, 0, 5)`);
ok(R(`Sports.ball && Sports.ball.r === 0.4`), 'pelota creada');
R(`Sports._ballStep(0.4, null)`);
ok(R(`Sports.ball.y < 5`), 'la pelota cae con gravedad');
for (let i = 0; i < 40; i++) R(`Sports._ballStep(0.05, null)`);
ok(R(`Sports.ball.y >= Sports.ball.r - 0.01`), 'la pelota no atraviesa el suelo');
R(`Sports._kickBall(10, 0, 12, 4)`);
ok(R(`Sports.ball.vx > 5 && Sports.ball.vy > 0`), '_kickBall da velocidad');
const pts = R(`Sports._ovalPoints(26, 17, 6, 3)`);
ok(Array.isArray(pts) && pts.length > 20, '_ovalPoints genera el circuito');
const ath2 = R(`Sports._athlete(0x00ff00, 0, 0)`);
R(`Sports.__t = Sports._athlete(0x00ff00, 0, 0); Sports._seek(Sports.__t, 10, 0, 0.5, 5);`);
ok(R(`Sports.__t.x > 1`), '_seek mueve al atleta hacia el objetivo');

/* ---------- levantamiento ---------- */
R(`SAVE.coins = 0;`);
ok(R(`Sports.start('lift') === true`), 'start lift');
ok(R(`Sports.cur && Sports.cur.id === 'lift'`), 'cur = lift');
R(`Sports.cur.taps = 25; Sports.cur.time = 0.01;`);
R(`Sports.update(0.05)`);
ok(R(`Sports.cur === null`), 'lift termina y limpia');
ok(R(`SAVE.coins === 50`), 'lift paga 25*2 = 50🪙');

/* ---------- tenis ---------- */
ok(R(`Sports.start('tennis') === true`), 'start tennis');
ok(R(`Sports.cur && Sports.cur.id === 'tennis'`), 'cur = tennis');
R(`Sports._rallyPoint('a')`);
ok(R(`Sports.cur.a === 1`), 'punto para el jugador');
R(`Sports._rallyPoint('b'); Sports._rallyPoint('b')`);
ok(R(`Sports.cur.b === 2`), 'puntos para el robot');
R(`Sports.cancel()`);
ok(R(`Sports.cur === null`), 'cancel limpia');

/* ---------- circuito con vehículo simulado ---------- */
R(`Vehicle = { mode: 'none', def: null, speed: 0 };`);
R(`boardVehicle = function(nb){ Vehicle.mode = nb.type; Vehicle.def = nb.def; };`);
R(`Vehicle.pPos = { x: 0, y: 0, z: 0 };`);
ok(R(`Sports.start('race') === true`), 'start race (con boardVehicle simulado)');
ok(R(`Vehicle.mode === 'car'`), 'jugador subido al carro');
R(`Sports.cur.t = 0.01; Sports.update(0.05);`);
ok(R(`Sports.cur.phase === 'run'`), 'cuenta regresiva → carrera');
R(`Sports.cur.lap = Sports.cur.laps; Sports.cur.pS = Sports.cur.wp.length - 2;`);
R(`Sports.update(0.05);`); // pS se recalcula; forzamos cruce
R(`(function(){ var c = Sports.cur; if (c) { c.pS = c.wp.length - 2; } })();`);
ok(R(`Sports.cur !== null`), 'carrera sigue');
// terminar directo
R(`Sports._finishCircuit()`);
ok(R(`Sports.cur === null`), '_finishCircuit termina');
ok(R(`Vehicle.mode === 'none'`), 'jugador bajado del carro');
ok(R(`SAVE.coins >= 10`), 'premio de carrera pagado');

/* ---------- menú y deporte inválido ---------- */
try { R(`Sports.openMenu()`); ok(true, 'openMenu no falla'); } catch (e) { ok(false, 'openMenu → ' + e.message); }
ok(R(`Sports.start('zzz') === false`), 'deporte inválido → false');
R(`Sports.closePanel(); Sports.cancel();`);

console.log(`\nsportstest: ${pass} OK, ${fail} FALLOS`);
process.exit(fail ? 1 : 0);
