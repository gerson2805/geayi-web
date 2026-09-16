/* Test de citylife1.js (VIDA DE CIUDAD · TANDA 1): carga, construcción en
   mundos ciudad, updates sin errores, tiendas, gasolina y torneo de pesca. */
const fs = require('fs'), vm = require('vm');
require(__dirname + '/stubs.js');
const DIR = '/home/hatch/workspace/your_files/obby-3d/';
const FILES = ['state.js', 'i18n.js', 'audio.js', 'vehicles.js', 'world.js', 'family.js',
  'player.js', 'online.js', 'travel.js', 'phase3.js', 'trophies.js',
  'casa.js', 'pets.js', 'fishing.js', 'racing.js', 'weather.js', 'observatory.js', 'ranch.js', 'jobs.js',
  'citylife1.js'];
for (const f of FILES) {
  try {
    vm.runInContext(fs.readFileSync(DIR + f, 'utf8'), sandbox, { filename: f });
  } catch (e) {
    console.log('  ✗ ERROR cargando ' + f + ': ' + e.message);
    process.exit(1);
  }
}
console.log('carga: 20 archivos sin errores');

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; } else { fail++; console.log('  ✗ FAIL:', name); }
}

R(`initThree(); Particles.init(); Avatar.build();`);
R(`MODE='play'; LEVEL = buildLevel(3); Player.reset(0,2,0)`);

// init / onLevelStart
ok(R(`CityLife1.init(), CityLife1.ready === true`), 'init: ready');
R(`CityLife1.onLevelStart(3)`);
let st = R(`CityLife1.state()`);
ok(st.active === true && st.idx === 3, 'onLevelStart(3): activo en Immokalee');
ok(st.lamps >= 8, 'farolas propias marcadas (userData.streetLamp): ' + st.lamps);
ok(st.police && st.amb, 'policía y ambulancia construidos');
ok(st.npcs === 4, '4 carros NPC');
ok(st.bus, 'autobús escolar construido');
ok(st.shops === 2, '2 tiendas (comida + ropa)');
ok(R(`CL1.group.children.length > 20`), 'grupo del nivel con contenido');

// mundo no-ciudad: inactivo
R(`CityLife1.onLevelStart(1)`);
ok(R(`CityLife1.state().active === false`), 'onLevelStart(1): inactivo fuera de ciudad');
R(`CityLife1.onLevelStart(0)`);
ok(R(`CityLife1.state().active === true`), 'onLevelStart(0): activo en Ciudad Neón');
R(`CityLife1.onLevelStart(3)`);

// updates: 240 cuadros sin errores (después de updateWeather, como en el loop real)
try {
  for (let i = 0; i < 240; i++) R(`updateWeather(0.016); CityLife1.update(0.016);`);
  ok(true, 'updates: 240 cuadros sin errores');
} catch (e) { ok(false, 'updates sin errores → ' + e.message); }

// semáforo: el ciclo avanza
const tl0 = R(`CL1.tl.state`);
R(`for (let i = 0; i < 700; i++) CityLife1.update(0.016)`);
ok(R(`CL1.tl.state !== '${tl0}'`), 'semáforo: cambia de color con el tiempo');

// lluvia: el interruptor apaga la de weather.js (no duplica partículas)
R(`CityLife1.rainOn = false; updateWeather(0.016); CityLife1.update(0.016);`);
ok(R(`typeof Weather._rain === 'undefined' || Weather._rain.pts.visible === false`),
  'lluvia: toggle OFF la apaga');
R(`CityLife1.rainOn = true;`);

// tienda de comida: cobra y da boost
R(`SAVE.coins = 100`);
ok(R(`CityLife1.buyFood(0), SAVE.coins === 95`), 'comida: cobra 5 🪙');
ok(R(`Player.fx && Player.fx.speedT > 40`), 'comida: boost de velocidad activo');

// tienda de ropa: compra sombrero
R(`SAVE.coins = 100; SAVE.ownedHats = ['none']; SAVE.hat = 'none';`);
ok(R(`CityLife1.buyHat('cap'), SAVE.hat === 'cap' && SAVE.ownedHats.indexOf('cap') !== -1`),
  'ropa: compra y equipa sombrero');
ok(R(`SAVE.coins === 60`), 'ropa: cobra 40 🪙');

// gasolina: drena al manejar y recarga con botón
R(`CityLife1.fuel = 100; Vehicle.mode = 'car'; Vehicle.speed = 10;`);
R(`for (let i = 0; i < 120; i++) CityLife1.update(0.016)`);
ok(R(`CityLife1.fuel < 100`), 'gasolina: se gasta al manejar (' + R(`CityLife1.fuel`).toFixed(1) + '%)');
R(`CityLife1.fuel = 50; SAVE.coins = 100; CityLife1.refuel();`);
ok(R(`CityLife1.fuel === 100 && SAVE.coins === 92`), 'gasolina: ⛽ Cargar recarga (8 🪙)');
R(`Vehicle.mode = 'none'; Vehicle.speed = 0;`);

// torneo de pesca: 60 s, tabla local en SAVE
R(`SAVE.fish = 5; SAVE.cl1 = undefined;`);
ok(R(`CityLife1.startTourney(), CL1.tour.active === true`), 'torneo: inicia en Immokalee');
R(`SAVE.fish = 8; CL1.tour.t = 0.01; CityLife1.update(0.05);`);
ok(R(`CL1.tour.active === false`), 'torneo: termina a los 60 s');
ok(R(`SAVE.cl1 && SAVE.cl1.tourney && SAVE.cl1.tourney.best === 3`),
  'torneo: tabla local guarda récord (3 🐟)');
ok(R(`SAVE.coins >= 102`), 'torneo: premio en 🪙 (récord → 40)');

// prompts por proximidad
R(`Player.pos.set(-8.5, 0, 24); CityLife1.update(0.016);`);
ok(R(`CityLife1.state().actFor === 'food'`), 'prompt: cerca de la tienda de comida');
R(`Player.pos.set(8.5, 0, 24); CityLife1.update(0.016);`);
ok(R(`CityLife1.state().actFor === 'ropa'`), 'prompt: cerca de la tienda de ropa');
R(`Player.pos.set(-15, 0, 2); Vehicle.mode = 'car'; Vehicle.speed = 0; CityLife1.fuel = 50; CityLife1.update(0.016);`);
ok(R(`CityLife1.state().actFor === 'gas'`), 'prompt: ⛽ Cargar en la gasolinera con carro');
R(`Vehicle.mode = 'none';`);

// onLevelEnd limpia
R(`CityLife1.onLevelEnd()`);
ok(R(`CityLife1.state().active === false`), 'onLevelEnd: desactiva y limpia');

console.log(`\nRESULTADO: ${pass} OK, ${fail} FALLOS`);
process.exit(fail ? 1 : 0);
