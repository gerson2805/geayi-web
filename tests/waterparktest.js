/* Pruebas del PARQUE ACUÁTICO (waterpark.js): rampas, toboganes y alberca */
'use strict';
const fs = require('fs'), vm = require('vm');
require(__dirname + '/stubs.js');
const DIR = '/home/hatch/workspace/your_files/obby-3d/';
const R = global.R;

const FILES = ['state.js', 'i18n.js', 'audio.js', 'vehicles.js', 'world.js', 'neoncity.js', 'family.js',
  'player.js', 'phase3.js', 'trophies.js', 'funpark.js', 'waterpark.js'];
for (const f of FILES) {
  try {
    vm.runInContext(fs.readFileSync(DIR + f, 'utf8'), global.sandbox, { filename: f });
  } catch (e) {
    console.log('✗ ERROR cargando ' + f + ': ' + e.message);
    process.exit(1);
  }
}

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; }
  else { fail++; console.log('  ✗ FAIL:', name); }
}
R('initThree(); Particles.init(); Avatar.build();');

/* ============ 0. módulo y carga limpia ============ */
console.log('— módulo y carga limpia');
ok(R("document.body.children.length") === 0, 'waterpark.js no toca el DOM al cargar');
ok(R('typeof WaterPark') === 'object', 'existe WaterPark');
ok(R('typeof WaterPark.init') === 'function', 'WaterPark.init existe');
ok(R('typeof WaterPark.buildForLevel') === 'function', 'WaterPark.buildForLevel existe');
ok(R('typeof WaterPark.update') === 'function', 'WaterPark.update existe');
ok(R('typeof WaterPark.groundAt') === 'function', 'WaterPark.groundAt existe');
ok(R('typeof WaterPark.trySlide') === 'function', 'WaterPark.trySlide existe');

/* ============ 1. contenido solo en Immokalee (idx 3) ============ */
console.log('— contenido por nivel (9 mundos)');
for (let i = 0; i < 9; i++) {
  R(`LEVEL = buildLevel(${i}); WaterPark.buildForLevel(${i}, LEVEL.group);`);
  const has = R('!!WaterPark.park');
  const nSlides = R('WaterPark.park ? WaterPark.park.slides.length : 0');
  if (i === 3) {
    ok(has, 'idx3: parque construido');
    ok(nSlides === 3, 'idx3: 3 toboganes');
    if (has) {
      ok(R('WaterPark.park.slides.every(s => s.path.len > 20)'), 'idx3: los 3 toboganes tienen recorrido > 20 m');
      ok(R('!!WaterPark.park.water'), 'idx3: alberca con agua animada');
      ok(R('WaterPark.park.showers.length') === 2, 'idx3: 2 regaderas');
      ok(R('!!WaterPark.park.sun'), 'idx3: NPC tomando sol');
    }
  } else {
    ok(!has, `idx${i}: sin parque acuático`);
  }
}

/* ============ 2. rampa caminable (sin saltos) ============ */
console.log('— rampa de subida (heightfield)');
R(`LEVEL = buildLevel(3); WaterPark.buildForLevel(3, LEVEL.group); MODE = 'play'; finished = false;`);
R('WaterPark.init();');
const g = (x, z) => R(`WaterPark.groundAt(${x}, ${z})`);
ok(Math.abs(g(-181, 104) - 0) < 0.01, 'inicio de rampa a nivel del suelo');
ok(Math.abs(g(-181, 76) - 4.93) < 0.05, 'fin del tramo 1 ≈ 4.93 m');
ok(Math.abs(g(-177, 44) - 9.87) < 0.05, 'fin del tramo 2 ≈ 9.87 m');
ok(Math.abs(g(-165, 100) - 9.99) < 0.05, 'tramo 3 ≈ 10 m');
ok(Math.abs(g(-165, 108) - 10) < 0.01, 'cima de la torre = 10 m');
ok(g(0, 0) === null, 'fuera del parque no hay rampa');
ok(g(-165, 140) === null, 'sobre la alberca no hay rampa');

// subir caminando: waypoints por los 3 tramos + descansos (sin saltar jamás)
// NOTA: el input de updatePlayer es relativo a la cámara (Player.camYaw),
// así que el test convierte la dirección mundo deseada a input cada cuadro.
R(`Player.reset(-181, 2, 108); Vehicle.mode = 'none'; Vehicle.def = null;`);
const WAY = [[-181, 76], [-179, 74], [-177, 70], [-177, 44], [-173, 42], [-165, 42],
             [-165, 60], [-165, 100], [-165, 108]];
let wi = 0, frames = 0;
while (wi < WAY.length && frames < 3000) {
  frames++;
  const [wx, wz] = WAY[wi];
  const r = R(`(function(){
    const dx = (${wx}) - Player.pos.x, dz = (${wz}) - Player.pos.z;
    if (Math.hypot(dx, dz) < 1.6) return 'next';
    const a = Player.camYaw - Math.atan2(dx, dz);
    updatePlayer(0.016, { x: Math.sin(a), z: Math.cos(a), jump: false });
    WaterPark.update(0.016);
    return 'ok';
  })()`);
  if (r === 'next') wi++;
}
const topY = R('Player.pos.y');
ok(wi === WAY.length, `llegó a la cima caminando (${frames} cuadros)`);
ok(topY > 9, `altura en la cima ≈ 10 m (y=${topY.toFixed(2)})`);
ok(R('Player.pos.y') > -2 && R('finished') === false, 'sin caídas ni daño subiendo');

/* ============ 3. deslizamiento por los 3 toboganes ============ */
console.log('— deslizamiento y chapuzón seguro');
const POOL = { x0: -192, x1: -138, z0: 134, z1: 156 };
const STARTS = [[-165, 109], [-161.5, 106], [-168.5, 106]];
for (let si = 0; si < 3; si++) {
  const [sx, sz] = STARTS[si];
  R(`LEVEL = buildLevel(3); WaterPark.buildForLevel(3, LEVEL.group); MODE = 'play'; finished = false;`);
  R('WaterPark.init();');
  R(`Player.reset(${sx}, 2, ${sz}); Vehicle.mode = 'none'; Vehicle.def = null;`);
  R('WaterPark.update(0.016);');
  ok(R('WaterPark._els.slide.style.display') === 'block', `tobogán ${si}: botón 🌊 DESLIZAR visible en la cima`);
  ok(R('WaterPark.trySlide()') === true, `tobogán ${si}: trySlide arranca`);
  ok(R('WaterPark.slide.active') === true, `tobogán ${si}: deslizamiento activo`);
  let maxV = 0, f2 = 0;
  while (R('WaterPark.slide.active') === true && f2 < 1200) {
    R('updatePlayer(0.016, { x: 0, z: 0, jump: false }); WaterPark.update(0.016);');
    maxV = Math.max(maxV, R('WaterPark.slide.v'));
    f2++;
  }
  const ex = R('Player.pos.x'), ez = R('Player.pos.z'), ey = R('Player.pos.y');
  ok(R('WaterPark.slide.active') === false, `tobogán ${si}: el deslizamiento termina`);
  ok(maxV > 6, `tobogán ${si}: tomó velocidad (máx ${maxV.toFixed(1)} m/s)`);
  ok(ex > POOL.x0 && ex < POOL.x1 && ez > POOL.z0 && ez < POOL.z1,
    `tobogán ${si}: termina dentro de la alberca (${ex.toFixed(1)}, ${ez.toFixed(1)})`);
  ok(Math.abs(R('Player.vel.x')) < 0.01 && Math.abs(R('Player.vel.z')) < 0.01,
    `tobogán ${si}: velocidad 0 al salir`);
  ok(ey > -1 && R('finished') === false, `tobogán ${si}: sin daño (y=${ey.toFixed(2)})`);
  // salir de la alberca caminando (hacia el borde norte, el más cercano)
  let out = 0;
  for (let k = 0; k < 600; k++) {
    const pz = R('Player.pos.z');
    if (pz < POOL.z0) break;
    out++;
    R(`(function(){
      const a = Player.camYaw - Math.atan2(0, -1);
      updatePlayer(0.016, { x: Math.sin(a), z: Math.cos(a), jump: false });
      WaterPark.update(0.016);
    })()`);
  }
  const oz = R('Player.pos.z');
  ok(oz < POOL.z0, `tobogán ${si}: sale de la alberca caminando (${out} cuadros, z=${oz.toFixed(1)})`);
}

/* ============ 4. UI e i18n ============ */
console.log('— UI e i18n');
R(`LEVEL = buildLevel(3); WaterPark.buildForLevel(3, LEVEL.group); MODE = 'play'; finished = false;`);
R('WaterPark.init();');
R('Player.reset(0, 2, 0); Vehicle.mode = "none"; WaterPark.update(0.016);');
ok(R('WaterPark._els.slide.style.display') === 'none', 'botón oculto lejos del parque');
ok(R('WaterPark._els.slide.style.minHeight') === '56px', 'botón ≥ 52px (56px)');
R(`setLang('en');`);
R('Player.reset(-165, 2, 109); WaterPark.update(0.016);');
ok(R("WaterPark._els.slide.textContent") === '🌊 SLIDE', 'botón en inglés');
R(`setLang('es'); WaterPark.update(0.016);`);
ok(R("WaterPark._els.slide.textContent") === '🌊 DESLIZAR', 'botón en español');
ok(R("T('wp.title')") === '🌊 PARQUE ACUÁTICO GEAYI', 'título del parque en español');

/* ============ 5. limpieza ============ */
console.log('— limpieza');
R(`LEVEL = buildLevel(5); WaterPark.buildForLevel(5, LEVEL.group);`);
ok(R('WaterPark.park') === null, 'fuera de idx3 no hay parque');
R('WaterPark.init(); WaterPark.init();');
ok(R("document.body.children.filter(c => c.id === 'wp-slide').length") === 1, 'init() idempotente (un solo botón)');
for (let i = 0; i < 120; i++) R('WaterPark.update(0.016);');
ok(true, '120 cuadros de update sin errores');

console.log(`\n${pass} OK · ${fail} FAIL`);
process.exit(fail ? 1 : 0);
