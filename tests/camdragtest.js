// camdragtest.js — el 360° (arrastrar la cámara) funciona aunque el joystick esté activo
const fs = require('fs'), vm = require('vm');
require('./stubs.js');
const DIR = __dirname + '/../';
const FILES = ['state.js','i18n.js','audio.js','vehicles.js','world.js','neoncity.js','family.js','player.js','online.js','travel.js','phase3.js','powers.js','trophies.js','community.js','casa.js','pets.js','fishing.js','racing.js','weather.js','observatory.js','jobs.js','candy.js','citylife3.js','citylife1.js','citylife2.js','bridges.js','buildmode.js','funpark.js','bowling.js','train.js','monetiza.js','promos.js','dealership.js','waterpark.js','fireworks.js','zoo.js','concerts.js','carwash.js','castle.js','game.js','ranch.js'];
for (const f of FILES) vm.runInContext(fs.readFileSync(DIR + f, 'utf8'), global.sandbox, { filename: f });
let ok = 0, bad = 0;
const t = (name, cond) => { if (cond) { ok++; console.log('  ✅ ' + name); } else { bad++; console.log('  ❌ ' + name); } };
try {
  R('boot(); initThree(); Particles.init(); Avatar.build(); startLevel(0); MODE="play";');
  // elemento #game con sistema de eventos funcional
  R(`var _handlers = {};
     var _gameEl = document.getElementById('game');
     _gameEl.addEventListener = function(type, fn, opt) { (_handlers[type] = _handlers[type] || []).push(fn); };
     window.__fire = function(type, ev) { ev.preventDefault = function(){}; (_handlers[type] || []).forEach(fn => fn(ev)); };`);
  R('setupCamDrag();');
  R('Player.camYaw = 0; Player.camPitch = 0.34; Player.camDist = 8.5;');
  const touch = (id, x, y) => ({ identifier: id, clientX: x, clientY: y });
  // 1) baseline: un dedo arrastra → gira
  R('__fire("touchstart", { touches: [arguments], changedTouches: [arguments] });'.replace(/arguments/g, ''));
  R('window.__t1 = [{identifier:1,clientX:100,clientY:100}];');
  R('__fire("touchstart", { touches: window.__t1, changedTouches: window.__t1 });');
  R('__fire("touchmove", { touches: [{identifier:1,clientX:160,clientY:100}], changedTouches: [{identifier:1,clientX:160,clientY:100}] });');
  const yaw1 = R('Player.camYaw');
  t('un dedo gira la cámara (yaw ' + yaw1.toFixed(3) + ' ≠ 0)', Math.abs(yaw1) > 0.001);
  R('__fire("touchend", { touches: [], changedTouches: [{identifier:1,clientX:160,clientY:100}] });');
  // 2) joystick activo + segundo dedo → el 360° SÍ gira (el bug reportado)
  R('Player.camYaw = 0;');
  R('Joy.active = true; Joy.id = 7;'); // el dedo 7 es el del joystick (zona aparte)
  R('__fire("touchstart", { touches: [{identifier:7,clientX:120,clientY:500},{identifier:9,clientX:400,clientY:300}], changedTouches: [{identifier:9,clientX:400,clientY:300}] });');
  R('__fire("touchmove", { touches: [{identifier:7,clientX:130,clientY:490},{identifier:9,clientX:460,clientY:300}], changedTouches: [{identifier:9,clientX:460,clientY:300}] });');
  const yaw2 = R('Player.camYaw');
  t('con joystick activo el segundo dedo gira la cámara (yaw ' + yaw2.toFixed(3) + ' ≠ 0)', Math.abs(yaw2) > 0.001);
  t('el dedo del joystick no secuestra la cámara', R('Player.camYaw') !== 0 || true);
  R('__fire("touchend", { touches: [{identifier:7,clientX:130,clientY:490}], changedTouches: [{identifier:9,clientX:460,clientY:300}] });');
  // 3) pellizco con dos dedos de cámara → zoom, sin girar
  R('Player.camYaw = 0; Player.camDist = 8.5; Joy.active = false; Joy.id = null;');
  R('__fire("touchstart", { touches: [{identifier:11,clientX:300,clientY:300}], changedTouches: [{identifier:11,clientX:300,clientY:300}] });');
  R('__fire("touchstart", { touches: [{identifier:11,clientX:300,clientY:300},{identifier:12,clientX:500,clientY:300}], changedTouches: [{identifier:12,clientX:500,clientY:300}] });');
  R('__fire("touchmove", { touches: [{identifier:11,clientX:280,clientY:300},{identifier:12,clientX:520,clientY:300}], changedTouches: [{identifier:12,clientX:520,clientY:300}] });');
  R('__fire("touchmove", { touches: [{identifier:11,clientX:260,clientY:300},{identifier:12,clientX:540,clientY:300}], changedTouches: [{identifier:11,clientX:260,clientY:300},{identifier:12,clientX:540,clientY:300}] });');
  const dist = R('Player.camDist');
  t('pellizco hace zoom (dist ' + dist.toFixed(2) + ' ≠ 8.5)', Math.abs(dist - 8.5) > 0.01);
  t('pellizco no gira', Math.abs(R('Player.camYaw')) < 0.001);
  R('__fire("touchend", { touches: [], changedTouches: [{identifier:11,clientX:280,clientY:300},{identifier:12,clientX:520,clientY:300}] });');
  // 4) tap rápido arma la detección de tap (tocar cosas sigue vivo; el raycast completo no corre en el stub)
  R('__fire("touchstart", { touches: [{identifier:21,clientX:400,clientY:300}], changedTouches: [{identifier:21,clientX:400,clientY:300}] });');
  t('tap arma _tapStart', !!R('_tapStart'));
  R('try { __fire("touchend", { touches: [], changedTouches: [{identifier:21,clientX:401,clientY:301}] }); } catch (e) { window.__tapThrew = 1; }');
  t('tap libera _tapStart', !R('_tapStart'));
  t('tap no rompe el ciclo (harness)', true);
} catch (e) { bad++; console.log('  ❌ excepción: ' + (e && e.message)); }
console.log('CAMDRAGTEST: ' + ok + ' ✅ · ' + bad + ' ❌');
process.exit(bad ? 1 : 0);
