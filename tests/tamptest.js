/* Prueba del empleo 🍔 COCINERO en "LOS HERMANOS TAMPS" (jobs.js):
   registro en JOBS, inicio solo cerca de la traila (-16,44) en Immokalee,
   minijuego de cocina (secuencia correcta/incorrecta, bandeja llena),
   pago + propina al servir, cliente que se va por espera, y stopJob.
   Patrón de jobtest.js (stubs.js + vm.runInContext + helper R()). */
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

// registrado en JOBS
ok(R(`JOBS.some(j=>j.id==='tamps' && j.emoji==='🍔' && j.pay===12)`), 'tamps: registrado en JOBS (🍔, paga 12)');

// lejos de la traila no inicia (jugador en 30,118)
try {
  const r = R(`startJob('tamps')`);
  ok(r === false && R(`JB.active`) === null, 'tamps: lejos de la traila no inicia');
} catch (e) { ok(false, 'tamps: inicio lejos → ' + e.message); }

// junto a la traila sí inicia: 3 clientes en la fila
try {
  R(`Player.reset(-16,2,42)`);
  const r = R(`startJob('tamps')`);
  ok(r === true && R(`JB.active`) === 'tamps', 'tamps: startJob junto a la traila');
  ok(R(`JB.tamps && JB.tamps.customers.length === 3`), 'tamps: 3 clientes en la fila al abrir');
  ok(R(`JB.group && JB.group.children.length > 0`), 'tamps: grupo 3D (mesas, clientes) creado');
} catch (e) { ok(false, 'tamps: inicio cerca → ' + e.message); }

// ingrediente incorrecto: no avanza, sin castigo duro
try {
  R(`_tampsPick(2)`); // paso 0 pide pan base, se toca queso
  ok(R(`JB.tamps.step === 0 && JB.tamps.ready === 0`), 'tamps: ingrediente incorrecto no avanza el paso');
} catch (e) { ok(false, 'tamps: pick incorrecto → ' + e.message); }

// secuencia correcta ①→⑥: se apila y al completar hay 1 lista
try {
  R(`_tampsPick(0); _tampsPick(1); _tampsPick(2);`);
  ok(R(`JB.tamps.buildGrp.children.length === 3`), 'tamps: 3 capas apiladas en la mesa');
  R(`_tampsPick(3); _tampsPick(4); _tampsPick(5);`);
  ok(R(`JB.tamps.ready === 1 && JB.tamps.step === 0`), 'tamps: 6 pasos → 1 hamburguesa lista');
  ok(R(`JB.tamps.buildGrp.children.length === 0 && JB.tamps.readyMeshes.length === 1`),
    'tamps: la mesa se limpia y la hamburguesa pasa a la bandeja');
} catch (e) { ok(false, 'tamps: secuencia correcta → ' + e.message); }

// bandeja llena (máx 3): no se puede armar más
try {
  R(`for (let b=0;b<2;b++) for (let i=0;i<6;i++) _tampsPick(i);`);
  ok(R(`JB.tamps.ready === 3`), 'tamps: bandeja con 3 listas');
  R(`for (let i=0;i<6;i++) _tampsPick(i);`);
  ok(R(`JB.tamps.ready === 3`), 'tamps: con bandeja llena no se arma más');
} catch (e) { ok(false, 'tamps: bandeja llena → ' + e.message); }

// servir: +12 + propina máxima (+8, cliente recién llegado)
try {
  const c0 = R(`SAVE.coins`);
  R(`_serveBurger()`);
  ok(R(`SAVE.coins`) === c0 + 20, 'tamps: servir paga +12 +8 de propina (cliente rápido)');
  ok(R(`JB.tamps.served === 1 && JB.tamps.earned === 20 && JB.tamps.ready === 2`),
    'tamps: servida=1, ganado=20, bandeja 3→2');
  ok(R(`JB.tamps.streak === 1 && JB.tamps.customers.length === 2`), 'tamps: racha=1, el cliente se va contento');
} catch (e) { ok(false, 'tamps: servir → ' + e.message); }

// botón de acción 🍔 SERVIR visible con cliente en espera
try {
  R(`updateJobs(0.016)`);
  ok(R(`JB.actionFor === 'serve'`), 'tamps: botón 🍔 SERVIR visible en la ventana');
} catch (e) { ok(false, 'tamps: botón servir → ' + e.message); }

// cliente que espera demasiado se va molesto (sin pago, racha a 0)
try {
  const c0 = R(`SAVE.coins`), s0 = R(`JB.tamps.served`);
  R(`JB.tamps.customers[0].t0 = -1000; updateJobs(0.016);`);
  ok(R(`JB.tamps.customers.length === 1`), 'tamps: el cliente molesto se va de la fila');
  ok(R(`JB.tamps.streak === 0 && SAVE.coins === ` + c0 + ` && JB.tamps.served === ` + s0),
    'tamps: sin pago y la racha vuelve a 0');
} catch (e) { ok(false, 'tamps: cliente molesto → ' + e.message); }

// sin hamburguesas listas no se sirve (ni se cobra)
try {
  const c0 = R(`SAVE.coins`), s0 = R(`JB.tamps.served`);
  R(`JB.tamps.ready = 0; JB.tamps.readyMeshes = []; _serveBurger();`);
  ok(R(`SAVE.coins === ` + c0 + ` && JB.tamps.served === ` + s0), 'tamps: sin hamburguesas no hay pago');
} catch (e) { ok(false, 'tamps: servir sin stock → ' + e.message); }

// 60 cuadros de updateJobs sin errores (clientes entran/salen)
try {
  R(`for (let i=0;i<60;i++) updateJobs(0.016);`);
  ok(true, 'tamps: updateJobs 60 cuadros sin errores');
} catch (e) { ok(false, 'tamps: 60 cuadros → ' + e.message); }

// terminar: limpia estado y oculta la cocina
try {
  R(`stopJob()`);
  ok(R(`JB.active === null && JB.tamps === null`), 'tamps: stopJob limpia el estado');
  ok(true, 'tamps: stopJob sin errores');
} catch (e) { ok(false, 'tamps: stopJob → ' + e.message); }

// fuera de Immokalee no inicia
try {
  R(`LEVEL = buildLevel(0); Player.reset(-16,2,42);`);
  const r = R(`startJob('tamps')`);
  ok(r === false && R(`JB.active`) === null, 'tamps: fuera de Immokalee no inicia');
} catch (e) { ok(false, 'tamps: fuera de Immokalee → ' + e.message); }

console.log(`\nRESULTADO: ${pass} OK, ${fail} FALLOS`);
process.exit(fail ? 1 : 0);
