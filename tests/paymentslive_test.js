/* paymentslive_test.js — pruebas de la conexión de PAGOS REALES (apagada por defecto).
   Uso: cd tests && node paymentslive_test.js
   Verifica: (a) LIVE=false por defecto; (b) sin WORKER_URL no intenta pago
   real; (c) sin secretos en payments-live.js ni worker-pagos-geayi.js;
   (d) la ruta demo sigue intacta. */
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

const plSrc = fs.readFileSync(DIR + 'payments-live.js', 'utf8');
const wkSrc = fs.readFileSync(DIR + 'worker-pagos-geayi.js', 'utf8');

console.log('— (c) sin secretos en el código —');
ok(/LIVE:\s*false/.test(plSrc), 'payments-live.js: LIVE=false por defecto en el archivo');
ok(plSrc.indexOf('SQUARE_ACCESS_TOKEN') === -1, 'payments-live.js: jamás menciona el secreto');
ok(!/sk-/.test(plSrc), 'payments-live.js: sin "sk-"');
ok(!/sk-/.test(wkSrc), 'worker: sin "sk-"');
ok(/env\.SQUARE_ACCESS_TOKEN/.test(wkSrc), 'worker: el secreto solo se lee de env.SQUARE_ACCESS_TOKEN');
ok(!/["']EAAA[A-Za-z0-9_\-]{10,}["']/.test(wkSrc), 'worker: sin token de Square hardcodeado');
ok(!/["']EAAA[A-Za-z0-9_\-]{10,}["']/.test(plSrc), 'payments-live.js: sin token hardcodeado');
ok(plSrc.indexOf('sq0idp-edk63378_Fu8TzZWR0xQmQ') !== -1, 'payments-live.js: trae el App ID público (por diseño)');
ok(plSrc.indexOf('LNBBVB583BP20') !== -1, 'payments-live.js: trae el Location ID público (por diseño)');
ok(/\/health/.test(wkSrc) && /\/pay/.test(wkSrc), 'worker: expone /health y /pay');
ok(/MAX_CENTS|monto excede/.test(wkSrc), 'worker: tope de seguridad por compra');

/* ---------- cargar estado + juego ---------- */
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
R(plSrc);
R(fs.readFileSync(DIR + 'monetiza.js', 'utf8'));

async function main() {
  console.log('— (a) LIVE apagado por defecto —');
  ok(R('PaymentsLive.LIVE') === false, 'PaymentsLive.LIVE === false');
  ok(R('PaymentsLive.WORKER_URL') === '', 'WORKER_URL vacío por defecto');
  ok(R('PaymentsLive.isLive()') === false, 'isLive() === false sin configurar');
  ok(R('PaymentsLive.label()') === '🧪 DEMO', 'label() dice DEMO');

  console.log('— (b) sin WORKER_URL no hay pago real —');
  R('PaymentsLive.LIVE = true;'); // bandera prendida pero sin URL
  ok(R('PaymentsLive.isLive()') === false, 'LIVE=true sin URL → isLive() sigue false');
  let r = await R(`PaymentsLive.route('geayi_coins_500', 99, 'prueba')`);
  ok(r && r.ok === true && r.demo === true, 'route() sin URL → cae al demo (recibo demo)');
  R('PaymentsLive.LIVE = false;');
  ok(R('PaymentsLive.setLive(true)') === true, 'setLive(true) prende la bandera');
  ok(R('PaymentsLive.setLive(false)') === false, 'setLive(false) la apaga (reversible)');

  console.log('— (d) la ruta demo sigue intacta —');
  resetSave();
  R('Shop2._pinOk = true;'); // sesión con PIN verificado
  r = await R(`Shop2.buyPassDemo('vip')`);
  ok(r && r.ok === true && r.demo === true, 'buyPassDemo → recibo demo');
  ok(R(`SAVE.passes.vip`) === true, 'pase VIP se entrega por la vía existente');
  r = await R(`Shop2.buyCoinsDemo(500)`);
  ok(r && r.ok === true && r.demo === true && r.coins === 500, 'buyCoinsDemo(500) → recibo demo + 500');
  ok(Number(R('SAVE.coins')) >= 500, 'monedas sumadas a SAVE.coins');
  ok(String(R(`Shop2._payBanner()`)).indexOf('DEMO') !== -1, 'banner en demo muestra DEMO');
  ok(R(`Shop2._centsOf({price:'$4.99'})`) === 499, '_centsOf("$4.99") → 499');
  ok(R(`Shop2._centsOf({cents:299})`) === 299, '_centsOf({cents:299}) → 299');
  ok(R(`Shop2._isLivePay()`) === false, '_isLivePay() false en demo');

  // el PIN sigue obligatorio
  R('Shop2._pinOk = false;');
  r = await R(`Shop2.buyPassDemo('fly')`);
  ok(r && r.ok === false && r.reason === 'pin', 'sin PIN no se compra (ni en demo)');

  console.log('\n' + pass + ' OK, ' + fail + ' fallas');
  process.exit(fail ? 1 : 0);
}
main().catch(e => { console.error('ERROR:', e); process.exit(1); });
