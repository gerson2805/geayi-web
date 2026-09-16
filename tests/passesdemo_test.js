/* passesdemo_test.js — pruebas de Pases de Juego + Paquetes de Monedas (modo DEMO).
   Uso: cd tests && node passesdemo_test.js
   Verifica: compra demo otorga perks y persiste en SAVE.passes; paquete 500🪙
   suma 500; sin PIN no se compra; todo marcado demo y sin red de pagos real. */
'use strict';
require('./stubs.js'); // deja global.sandbox y global.R
const fs = require('fs');
const DIR = '/home/hatch/workspace/your_files/obby-3d/';

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✅ ' + name); }
  else { fail++; console.log('  ❌ ' + name); }
}
function resetSave() {
  R(`SAVE.coins=0; SAVE.coinsInf=false; SAVE.famCode=false;
     SAVE.vipUntil=0; SAVE.builderPass=false;
     SAVE.passes={}; SAVE.parental={pin:null};
     SAVE.ownedOutfits=[]; SAVE.ownedVehicles=[]; SAVE.ownedPets=[];
     SAVE.hat='none'; SAVE.pet='none'; Shop2._pinOk=false;`);
}

/* ---------- cargar state.js + stubs de integración ---------- */
R(fs.readFileSync(DIR + 'state.js', 'utf8'));
R(`
  function addStrings(){}
  function T(k){ return k; }
  function toast(){}
  function setAvatarHat(av, id){}
  function petId(){ return 'none'; }
  var Pets = { onLevelStart(){} };
  var Player = { heading: 0, pos: { x: 0, y: 0, z: 0 } };
`);
R('setTimeout = (fn) => { fn(); return 1; };'); // temporizadores inmediatos en el test
R(fs.readFileSync(DIR + 'payments-live.js', 'utf8')); // mismo orden que index.html
R(fs.readFileSync(DIR + 'monetiza.js', 'utf8'));

async function main() {
  console.log('— pases demo: compra otorga perk y persiste —');
  resetSave();
  R('Shop2._pinOk = true;'); // sesión con PIN verificado
  let r = await R(`Shop2.buyPassDemo('vip')`);
  ok(r && r.ok === true && r.demo === true, 'comprar Pase VIP demo → ok + recibo demo');
  ok(R(`SAVE.passes.vip`) === true, 'VIP persiste en SAVE.passes');
  ok(R(`Shop2.hasPass('vip')`) === true, 'hasPass(vip)');
  ok(R(`Shop2.mult()`) === 1.1, 'VIP → +10% monedas (mult 1.1)');
  R('SAVE.coins = 0; Shop2.addCoins(100);');
  ok(R('SAVE.coins') === 110, 'addCoins aplica el +10% del VIP');

  r = await R(`Shop2.buyPassDemo('fly')`);
  ok(r && r.ok === true && R(`Shop2.canFly()`) === true, 'Pase de Vuelo → canFly() true');

  r = await R(`Shop2.buyPassDemo('constructor')`);
  ok(r && r.ok === true && R(`Shop2.blockBonus()`) === 200, 'Pase Constructor → +200 bloques');

  r = await R(`Shop2.buyPassDemo('vip')`);
  ok(r && r.ok === true && r.reason === 'owned', 'recomprar pase → owned (no se duplica)');

  r = await R(`Shop2.buyPassDemo('nope')`);
  ok(r && r.ok === false && r.reason === 'id', 'pase inexistente → error');

  console.log('— paquetes de monedas consumibles —');
  resetSave();
  R('Shop2._pinOk = true;');
  r = await R(`Shop2.buyCoinsDemo(500)`);
  ok(r && r.ok === true && r.coins === 500 && r.demo === true, 'paquete 500🪙 → ok demo');
  ok(R('SAVE.coins') === 500, 'paquete 500🪙 suma 500 monedas');
  r = await R(`Shop2.buyCoinsDemo(10000)`);
  ok(r && r.ok === true && R('SAVE.coins') === 10500, 'paquete 10,000🪙 existe y suma');
  r = await R(`Shop2.buyCoinsDemo(999)`);
  ok(r && r.ok === false, 'paquete inexistente → error');

  console.log('— sin PIN no se puede comprar —');
  resetSave(); // _pinOk = false
  r = await R(`Shop2.buyPassDemo('vip')`);
  ok(r && r.ok === false && r.reason === 'pin', 'sin PIN → pase bloqueado');
  ok(R(`!!SAVE.passes.vip`) === false, 'sin PIN → nada persiste');
  r = await R(`Shop2.buyCoinsDemo(500)`);
  ok(r && r.ok === false && r.reason === 'pin', 'sin PIN → monedas bloqueadas');
  ok(R('SAVE.coins') === 0, 'sin PIN → monedas intactas');

  console.log('— demo: etiquetas y sin pagos reales —');
  const src = fs.readFileSync(DIR + 'monetiza.js', 'utf8');
  const banner = R(`Shop2._demoBanner()`);
  ok(banner.indexOf('DEMO') >= 0 && banner.indexOf('NO SE COBRA DINERO REAL') >= 0,
    'banner DEMO grande y claro en cada compra');
  ok(/async buy\(sku\)[\s\S]{0,300}demo:\s*true/.test(src), 'Billing.buy devuelve recibo demo');
  const nets = ['fetch(', 'XMLHttpRequest', 'square', 'stripe'];
  const bad = nets.filter(w => new RegExp(w.replace(/[()]/g, '\\$&'), 'i').test(src));
  ok(bad.length === 0, 'monetiza.js sin llamadas de pago real (' + (bad.join(',') || 'limpio') + ')');
  const srcP = fs.readFileSync(DIR + 'player.js', 'utf8');
  const srcB = fs.readFileSync(DIR + 'buildmode.js', 'utf8');
  const srcA = fs.readFileSync(DIR + 'agent.js', 'utf8');
  ok(!/fetch\(|XMLHttpRequest|stripe|square/i.test(srcP + srcB + srcA), 'player/buildmode/agent sin red de pagos');
  ok(srcP.indexOf('flyTick') >= 0 && srcP.indexOf('Shop2.canFly') >= 0, 'vuelo cableado en player.js');
  ok(srcB.indexOf('bmMax()') >= 0, 'tope de bloques usa bmMax() (+pase)');
  ok(srcA.indexOf('_buildBatch') >= 0 && srcA.indexOf('_drainQueue') >= 0, 'agente con velocidad de construcción');
  ok(src.indexOf('attachCrown') >= 0, 'insignia corona del VIP existe');

  console.log('— compatibilidad con pases anteriores —');
  resetSave();
  R('SAVE.vipUntil = Date.now() + 100000;');
  ok(R(`Shop2.mult()`) === 2, 'VIP temporal anterior sigue 2x');
  R('SAVE.builderPass = true;');
  ok(R(`Shop2.blockBonus()`) === 150, 'pase constructor anterior sigue +150');

  console.log('\n' + pass + ' ✅ · ' + fail + ' ❌');
  process.exit(fail ? 1 : 0);
}
main();
