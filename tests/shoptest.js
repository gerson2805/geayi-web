/* shoptest.js — pruebas de monetiza.js (Shop2/Billing/Ads) con stubs THREE/DOM.
   Uso: cd tests && node shoptest.js
   Verifica: activación con código correcto/incorrecto, monedas infinitas,
   pases, Billing demo, Ads demo, envoltura de setAvatarHat y que el código
   familiar NUNCA aparezca en la UI. */
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
     SAVE.vipUntil=0; SAVE.builderPass=false; SAVE.passes={};
     SAVE.ownedOutfits=[]; SAVE.ownedVehicles=[]; SAVE.ownedPets=[];
     SAVE.hat='none'; SAVE.pet='none';`);
}

/* ---------- cargar state.js + stubs de integración ---------- */
R(fs.readFileSync(DIR + 'state.js', 'utf8'));
R(`
  function addStrings(){}
  function T(k){ return k; }
  function toast(){}
  let __hatCalls = [];
  function setAvatarHat(av, id){ __hatCalls.push(id); }
  function petId(){ return 'none'; }
  var Pets = { onLevelStart(){ __petStart = true; } };
  var __petStart = false;
  var Avatar = { setHat(id){ __hatCalls.push('avatar:'+id); }, group: null };
  var Player = { heading: 0, pos: { x: 0, y: 0, z: 0 } };
`);
R(fs.readFileSync(DIR + 'monetiza.js', 'utf8'));

console.log('— Shop2 carga y expone globales —');
ok(R("typeof Shop2 === 'object'"), 'Shop2 existe');
ok(R("typeof Billing === 'object' && typeof Billing.buy === 'function'"), 'Billing.buy existe');
ok(R("typeof Ads === 'object' && typeof Ads.watch === 'function'"), 'Ads.watch existe');
ok(R("typeof window.FAMILY_CODE === 'undefined'"), 'el código NO se expone en window');

console.log('— código incorrecto —');
resetSave();
const bad = R(`Shop2.redeemCode('1234')`);
ok(bad.ok === false, 'código malo → ok:false');
ok(R("SAVE.famCode") === false, 'código malo → famCode sigue false');
ok(R("SAVE.ownedOutfits.length") === 0, 'código malo → nada desbloqueado');
ok(/codeBad|no válido|Invalid/i.test(bad.msg), 'mensaje genérico de error (no revela nada)');

console.log('— código correcto —');
resetSave();
const CODE = R('FAMILY_CODE'); // solo el test conoce el valor interno; la UI jamás lo muestra
const good = R(`Shop2.redeemCode(${JSON.stringify(CODE)})`);
ok(good.ok === true, 'código bueno → ok:true');
ok(R("SAVE.famCode") === true, 'famCode=true');
ok(R("SAVE.coinsInf") === true, 'monedas infinitas activadas');
ok(R("Shop2.coinsText()") === '∞', 'coinsText muestra ∞');
ok(R("SAVE.ownedOutfits.length") === 6, '6 prendas desbloqueadas');
ok(R("SAVE.ownedVehicles.length") === 3, '3 vehículos desbloqueados');
ok(R("SAVE.ownedPets.length") === 3, '3 mascotas desbloqueadas');
ok(R("SAVE.builderPass") === true, 'Pase Constructor incluido');
ok(R("Shop2.vipActive()") === true, 'Pase VIP activo (7 días)');

console.log('— monedas infinitas no descuentan —');
R('SAVE.coins = 42;');
ok(R("Shop2.spendCoins(999999)") === true, 'spendCoins con ∞ → true');
ok(R("SAVE.coins") === 42, 'spendCoins con ∞ no descuenta');
R('Shop2.addCoins(50);');
ok(R("SAVE.coins") === 42, 'addCoins con ∞ no suma (ya es infinito)');

console.log('— monedas normales y Pase VIP 2x —');
resetSave();
R('Shop2.addCoins(100);');
ok(R("SAVE.coins") === 100, 'addCoins suma normal');
R('SAVE.vipUntil = Date.now() + 100000;');
ok(R("Shop2.mult()") === 2, 'VIP → mult 2x');
R('Shop2.addCoins(100);');
ok(R("SAVE.coins") === 300, 'VIP duplica las monedas ganadas');
ok(R("Shop2.spendCoins(500)") === false, 'sin saldo → spendCoins false');
ok(R("Shop2.spendCoins(100)") === true && R("SAVE.coins") === 200, 'spendCoins descuenta con saldo');
R('SAVE.builderPass = true;');
ok(R("Shop2.blockBonus()") === 150, 'Pase Constructor → +150 bloques');

console.log('— Billing demo —');
R('setTimeout = (fn) => { fn(); return 1; };'); // temporizadores inmediatos en el test
R(`Billing.buy('geayi_coins_500').then(r => { globalThis.__bill = r; });`);
setTimeout(() => {
  const r = R('globalThis.__bill');
  ok(r && r.ok === true && r.demo === true, 'Billing.buy resuelve recibo demo');
  R(`Billing.deliver('outfit','out_neon'); Billing.deliver('vip','pass_vip');`);
  ok(R("SAVE.ownedOutfits.includes('out_neon')"), 'deliver desbloquea prenda');
  ok(R("Shop2.vipActive()"), 'deliver activa VIP');

  console.log('— envoltura de setAvatarHat (ropa premium) —');
  resetSave();
  R('Shop2.init();');
  ok(R("typeof setAvatarHat.__shop2 !== 'undefined'"), 'setAvatarHat quedó envuelto');
  R(`Shop2.ensureSave(); SAVE.ownedOutfits.push('out_vaquero'); Shop2.equipOutfit('out_vaquero');`);
  ok(R("SAVE.hat") === 'out_vaquero', 'equipOutfit guarda SAVE.hat');
  R('setAvatarHat({userData:{}}, "out_vaquero");');
  ok(R("__hatCalls[__hatCalls.length-1]") === 'none', 'prenda premium limpia el sombrero base primero');
  R('setAvatarHat({userData:{}}, "crown");');
  ok(R("__hatCalls[__hatCalls.length-1]") === 'crown', 'sombrero normal sigue funcionando');

  console.log('— constructores 3D premium no revientan —');
  ok(R("Shop2.buildVehicleMesh('veh_monstruo') !== null"), 'Troca Monstruo se construye');
  ok(R("Shop2.buildVehicleMesh('veh_rayo') !== null"), 'Deportivo Rayo se construye');
  ok(R("Shop2.buildVehicleMesh('veh_chopper') !== null"), 'Moto Chopper se construye');
  ok(R("Shop2.buildVehicleMesh('nope') === null"), 'vehículo desconocido → null');

  console.log('— Ads demo (temporizador inmediato en test) —');
  resetSave();
  R('SAVE.coins = 0;');
  let seen = null;
  // Ads.watch usa DOM stub + countdown; con setTimeout inmediato termina al instante
  R(`Ads.watch(s => { globalThis.__seen = s; });`);
  seen = R('globalThis.__seen');
  ok(seen === true, 'Ads.watch completa el anuncio demo');

  console.log('— el código NUNCA aparece en la UI —');
  const src = fs.readFileSync(DIR + 'monetiza.js', 'utf8');
  const hits = [];
  src.split('\n').forEach((ln, i) => {
    if (ln.includes(CODE)) hits.push(i + 1);
  });
  const allowed = hits.every(n => {
    const ln = src.split('\n')[n - 1];
    return /FAMILY_CODE\s*=|code === FAMILY_CODE|código familiar|NUNCA/i.test(ln);
  });
  ok(hits.length > 0 && allowed, 'el código solo aparece en la const interna y su comparación (' + hits.length + ' líneas)');
  ok(!/placeholder=.*uruapan|codePh.*uruapan/i.test(src), 'ningún placeholder/label revela el código');

  console.log('\n' + pass + ' ✅ · ' + fail + ' ❌');
  process.exit(fail ? 1 : 0);
}, 1200);
