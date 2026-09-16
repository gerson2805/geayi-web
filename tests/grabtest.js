// grabtest.js — prueba del botón de contexto 🖐️ AGARRAR / ⬇️ SOLTAR / 💰 PAGAR
// y de los colisionadores de estantes y mostrador (WALL_SOLIDS).
const fs = require('fs'), vm = require('vm');
require('./stubs.js');
const DIR = __dirname + '/../';
const FILES = ['state.js','i18n.js','audio.js','vehicles.js','world.js','neoncity.js','family.js','player.js','online.js','travel.js','phase3.js','powers.js','trophies.js','community.js','casa.js','pets.js','fishing.js','racing.js','weather.js','observatory.js','jobs.js','candy.js','citylife3.js','citylife1.js','citylife2.js','bridges.js','buildmode.js','funpark.js','bowling.js','train.js','monetiza.js','promos.js','dealership.js','waterpark.js','fireworks.js','zoo.js','concerts.js','carwash.js','castle.js','game.js','ranch.js'];
for (const f of FILES) vm.runInContext(fs.readFileSync(DIR + f, 'utf8'), global.sandbox, { filename: f });
let ok = 0, bad = 0;
const t = (name, cond) => { if (cond) { ok++; console.log('  ✅ ' + name); } else { bad++; console.log('  ❌ ' + name); } };
// Polyfill: posición de mundo caminando la cadena de padres (el stub no tiene getWorldPosition)
function worldPosOf(o, v) {
  let x = 0, y = 0, z = 0, p = o;
  while (p) { if (p.position) { x += p.position.x || 0; y += p.position.y || 0; z += p.position.z || 0; } p = p.parent; }
  return v.set(x, y, z);
}
// Polyfill: classList funcional para los botones del test
function realClassList(el) {
  const s = new Set();
  el.classList = { add: c => s.add(c), remove: c => s.delete(c), toggle: c => s.has(c) ? s.delete(c) : s.add(c), contains: c => s.has(c) };
  s.add('hidden');
}
try {
  R('boot(); initThree(); Particles.init(); Avatar.build(); startLevel(0);');
  R('addShop(LEVEL.group, 0, 0, 0xff0000, "TIENDA", false); MODE="play";');
  t('hay productos tocables', R('TOUCHABLES.length') >= 6);
  // 1) colisionadores registrados para estantes y mostrador
  const nSolids = R('WALL_SOLIDS.length');
  t('WALL_SOLIDS incluye estantes+mostrador (' + nSolids + ' >= 3 nuevos)', nSolids >= 3);
  // 2) jugador al lado de un producto → __nearGrab detectado
  R('var _t0 = TOUCHABLES[0];');
  const v = { x: 0, y: 0, z: 0 };
  // usar el polyfill dentro del sandbox
  global.sandbox.__wpos = function (o) {
    let x = 0, z = 0, p = o;
    while (p) { if (p.position) { x += p.position.x || 0; z += p.position.z || 0; } p = p.parent; }
    return { x, z };
  };
  const wp = R('__wpos(_t0.o)');
  R('Player.pos.set(' + (wp.x + 1.0) + ', 0, ' + wp.z + '); updateTalkPrompt();');
  // parchear getWorldPosition en los objetos del sandbox para updateContextButtons
  R('for (const _tt of TOUCHABLES) { if (_tt.o && !_tt.o.getWorldPosition) _tt.o.getWorldPosition = function(_v){ const _w = __wpos(this); return _v.set(_w.x, 0, _w.z); }; }');
  for (const id of ['btn-talk', 'btn-pay', 'btn-grab']) realClassList(global.sandbox.document.getElementById(id));
  R('updateContextButtons();');
  t('cerca del producto: __nearGrab = ' + R('window.__nearGrab ? window.__nearGrab.name : "ninguno"'), !!R('window.__nearGrab'));
  t('botón 🖐️ AGARRAR visible', R('!document.getElementById("btn-grab").classList.contains("hidden")'));
  // 3) agarrar vía pickupItem (lo que hace el botón)
  R('pickupItem(window.__nearGrab); updateContextButtons();');
  t('producto en la mano', !!R('window.__carried'));
  t('botón ⬇️ SOLTAR visible', R('!document.getElementById("btn-grab").classList.contains("hidden")'));
  // 4) cerca del dependiente con producto → PAGAR (y HABLAR oculto)
  R('window.__nearKeeper = SHOPKEEPERS[0]; updateContextButtons();');
  t('botón 💰 PAGAR visible', R('!document.getElementById("btn-pay").classList.contains("hidden")'));
  t('botón 💬 oculto cuando hay PAGAR', R('document.getElementById("btn-talk").classList.contains("hidden")'));
  // 5) pagar descuenta monedas
  R('SAVE.coinsInf = false; SAVE.coins = 100; window.__payPrice = window.__carried.t.price; payForCarried();');
  t('pago descuenta monedas (100-' + R('window.__payPrice') + ')', R('SAVE.coins') === 100 - R('window.__payPrice'));
  t('bolsa suma 1', R('window.__bagCount') === 1);
  t('mano queda vacía', !R('window.__carried'));
  // 6) lejos de todo → todos ocultos
  R('window.__nearKeeper = null; Player.pos.set(500, 0, 500); updateTalkPrompt(); updateContextButtons();');
  t('lejos: los 3 botones ocultos',
    R('document.getElementById("btn-grab").classList.contains("hidden")') &&
    R('document.getElementById("btn-talk").classList.contains("hidden")') &&
    R('document.getElementById("btn-pay").classList.contains("hidden")'));
  // 7) pickupItem(null) no rompe el estado
  R('pickupItem(null);');
  t('pickupItem(null) no deja la mano ocupada', !R('window.__carried'));
} catch (e) { bad++; console.log('  ❌ EXCEPCIÓN: ' + e.message.split('\n')[0]); }
console.log('GRABTEST: ' + ok + ' ✅ · ' + bad + ' ❌');
process.exit(bad ? 1 : 0);
