/* Prueba del módulo de autolavado (carwash.js): carga, construcción solo en
   idx 3 (Immokalee), llegada de carros NPC sucios, secuencia de lavado ①→④,
   orden incorrecto, pago 15+propina, bono de racha cada 5 carros y
   update 120 cuadros sin errores. Sigue el patrón de jobtest.js. */
const fs = require('fs'), vm = require('vm');
require(__dirname + '/stubs.js');
const DIR = '/home/hatch/workspace/your_files/obby-3d/';
const FILES = ['state.js', 'i18n.js', 'audio.js', 'vehicles.js', 'world.js',
  'neoncity.js', 'family.js', 'phase3.js', 'player.js', 'carwash.js'];
for (const f of FILES) {
  try {
    vm.runInContext(fs.readFileSync(DIR + f, 'utf8'), sandbox, { filename: f });
  } catch (e) {
    console.log('  ✗ ERROR cargando ' + f + ': ' + e.message);
    process.exit(1);
  }
}
console.log('carga: 10 archivos sin errores');

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; } else { fail++; console.log('  ✗ FAIL:', name); }
}
R('initThree(); Particles.init(); Avatar.build();');
R(`MODE='play'; LEVEL = buildLevel(3); Player.reset(90,1,10); CarWash.init(); CarWash.buildForLevel(3, LEVEL.group);`);

// solo se construye en idx 3 (Immokalee)
ok(R(`CW.built === true`), 'carwash: se construye en idx 3');
ok(R(`CW.group && CW.group.children.length > 15`), 'carwash: lote construido (' + R(`CW.group.children.length`) + ' piezas)');
ok(R(`CW.rollers.length === 3`), 'carwash: 3 rodillos de colores');
R(`CarWash.buildForLevel(0, LEVEL.group);`);
ok(R(`CW.built === false && CW.group === null`), 'carwash: NO se construye fuera de idx 3');
R(`CarWash.buildForLevel(3, LEVEL.group);`);
ok(R(`CW.built === true`), 'carwash: se reconstruye al volver a idx 3');

// UI táctil: botón LAVAR + 4 botones de paso ≥52px
ok(R(`!!CW.btnWash && CW.stepBtns.length === 4`), 'carwash: UI con botón LAVAR + 4 pasos');
ok(R(`CW.stepBtns.every(b => b.style.cssText.indexOf('min-height:56px') >= 0 && b.style.cssText.indexOf('min-width:56px') >= 0)`),
  'carwash: botones táctiles ≥52px');

// llega un carro NPC sucio
let car = R(`CarWash.spawnCar()`);
ok(R(`!!CW.car && CW.car.state === 'arriving'`), 'carwash: el carro NPC llega (arriving)');
ok(R(`CW.car.spots.length === 8 && CW.car.spots.every(s => s.visible && s.material.opacity === 1)`),
  'carwash: carro sucio con 8 manchas visibles');
R(`for (let i=0;i<400;i++) CarWash.update(0.016);`);
ok(R(`CW.car.state === 'waiting' && Math.abs(CW.car.mesh.position.x - 90) < 0.01`),
  'carwash: el carro entra al túnel y espera');
ok(R(`typeof buildCarMesh === 'function'`), 'carwash: usa buildCarMesh de vehicles.js');

// no se puede lavar lejos
R(`Player.pos.set(0, 1, 0);`);
ok(R(`CarWash.startWash()`) === false, 'carwash: lejos del carro no empieza');

// secuencia ①→④ completa un lavado y paga 15+propina (rápido <40s)
R(`Player.pos.set(90, 1, 4);`);
ok(R(`CarWash.startWash()`) === true && R(`CW.washing === true`), 'carwash: startWash cerca del carro');
ok(R(`CarWash.doStep(2)`) === false && R(`CW.step`) === 0, 'carwash: paso en orden incorrecto NO avanza');
ok(R(`CarWash.doStep(1)`) === false && R(`CW.step`) === 0, 'carwash: otro orden incorrecto NO avanza');
const c0 = R(`SAVE.coins`);
R(`CarWash.doStep(0); CW.stepAnim = 0;`);
ok(R(`CW.step`) === 1, 'carwash: paso ① avanza');
ok(R(`CW.car.spots.every(s => s.material.opacity < 1)`), 'carwash: tras ① el carro se ve más limpio');
R(`CarWash.doStep(1); CW.stepAnim = 0; CarWash.doStep(2); CW.stepAnim = 0;`);
ok(R(`CW.step`) === 3, 'carwash: pasos ② y ③ avanzan en orden');
R(`CarWash.doStep(3);`);
ok(R(`CW.washing === false && CW.car.state === 'leaving'`), 'carwash: paso ④ termina el lavado');
ok(R(`CW.car.spots.every(s => s.visible === false)`), 'carwash: carro totalmente limpio');
ok(R(`SAVE.coins`) === c0 + 20, 'carwash: paga 15 + propina 5 = +20 🪙 (rápido)');
ok(R(`CW.streak`) === 1, 'carwash: racha = 1');
R(`CarWash.removeCar();`);

// lavado lento: sin propina
R(`CarWash.spawnCar(); CW.car.state='waiting'; CW.car.mesh.position.set(90,0,8); Player.pos.set(90,1,4);`);
R(`CarWash.startWash(); CW.t0 = _cwNow() - 50;`); // simula >40 s
const c1 = R(`SAVE.coins`);
R(`for (const s of [0,1,2]) { CarWash.doStep(s); CW.stepAnim = 0; } CarWash.doStep(3); CarWash.removeCar();`);
ok(R(`SAVE.coins`) === c1 + 15, 'carwash: lavado lento paga solo 15 (sin propina)');
ok(R(`CW.streak`) === 2, 'carwash: racha = 2');

// bono de racha cada 5 carros: 3 lavados más → 5.º da +25 extra
const c2 = R(`SAVE.coins`);
R(`for (let w = 0; w < 3; w++) {
  CarWash.spawnCar(); CW.car.state='waiting'; CW.car.mesh.position.set(90,0,8); Player.pos.set(90,1,4);
  CarWash.startWash();
  for (const s of [0,1,2,3]) { CarWash.doStep(s); CW.stepAnim = 0; }
  CarWash.removeCar();
}`);
ok(R(`CW.streak`) === 5, 'carwash: racha = 5');
ok(R(`SAVE.coins`) === c2 + 20 * 3 + 25, 'carwash: bono de racha +25 en el 5.º carro');
R(`CarWash.removeCar();`);

// spawn automático + 120 cuadros de update sin errores
try {
  R(`CW.spawnT = 0.01;`);
  R(`CarWash.spawnCar(); CW.car.state='waiting'; CW.car.mesh.position.set(90,0,8); Player.pos.set(90,1,4);`);
  R(`CarWash.startWash();`);
  R(`for (let i=0;i<120;i++) { CarWash.update(0.016); }`);
  ok(true, 'carwash: update 120 cuadros sin errores');
} catch (e) { ok(false, 'carwash: 120 cuadros → ' + e.message); }
// el carro se va solo tras pagar
try {
  R(`for (const s of [0,1,2,3]) { CarWash.doStep(s); CW.stepAnim = 0; }`);
  const firstCar = R(`CW.car`);
  R(`for (let i=0;i<600;i++) CarWash.update(0.016);`);
  ok(R(`CW.car`) !== firstCar, 'carwash: tras pagar, el carro sale y desaparece (llega otro)');
  ok(R(`CW.spawnT > 0`), 'carwash: se programa la llegada del siguiente carro');
} catch (e) { ok(false, 'carwash: salida del carro → ' + e.message); }

// fuera de Immokalee update no hace nada (no rompe)
try {
  R(`LEVEL = buildLevel(0); CarWash.buildForLevel(0, LEVEL.group);`);
  R(`for (let i=0;i<30;i++) CarWash.update(0.016);`);
  ok(R(`CW.built === false`), 'carwash: fuera de idx 3 no hay autolavado');
} catch (e) { ok(false, 'carwash: fuera de idx 3 → ' + e.message); }

console.log(`\nRESULTADO: ${pass} OK, ${fail} FALLOS`);
process.exit(fail ? 1 : 0);
