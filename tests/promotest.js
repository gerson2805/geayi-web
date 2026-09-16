/* promotest.js — pruebas de promos.js (Promos) con stubs THREE/DOM.
   Uso: cd tests && node promotest.js
   Verifica: crear códigos de descuento y aplicarlos (10/25/50%), códigos de
   monedas con límite de usos, expiración, anti-doble canje, desactivar,
   y el flujo admin (sin clave no entra, con la clave sí). */
'use strict';
require('./stubs.js'); // deja global.sandbox y global.R
const fs = require('fs');
const DIR = '/home/hatch/workspace/your_files/obby-3d/';

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✅ ' + name); }
  else { fail++; console.log('  ❌ ' + name); }
}
function resetPromos() {
  R(`SAVE.promoCodes=undefined; SAVE.redeemedPromos=[]; SAVE.coins=0; SAVE.coinsInf=false;
     SAVE.vipUntil=0; SAVE.famCode=false; Promos.activeDiscount=0; Promos.activeDiscountId=null; Promos._adminAuth=false;
     Promos.ensureSave();`); // re-siembra los códigos de ejemplo
}

/* ---------- cargar state.js + stubs de integración ---------- */
R(fs.readFileSync(DIR + 'state.js', 'utf8'));
R(`
  function addStrings(){}
  function T(k){ return k; }
  function toast(){}
`);
R(fs.readFileSync(DIR + 'monetiza.js', 'utf8'));
R(fs.readFileSync(DIR + 'promos.js', 'utf8'));
R('Promos.init();'); // envuelve Shop2 + instala acceso admin (stubs DOM)

console.log('— carga y semillas —');
ok(R("typeof Promos === 'object'"), 'Promos existe');
ok(R("typeof Promos.init === 'function'"), 'Promos.init existe');
ok(R("!!Shop2.__promos"), 'Shop2 quedó envuelto (monkey-patch seguro)');
const seeds = R('Promos.list()');
ok(seeds.some(c => c.id === 'BIENVENIDO10' && c.type === 'descuento' && c.value === 10 && c.limit === 500), 'semilla BIENVENIDO10 (10% off, 500 usos)');
ok(seeds.some(c => c.id === 'AMIGOS500' && c.type === 'monedas' && c.value === 500 && c.limit === 100 && c.expiresAt > Date.now()), 'semilla AMIGOS500 (500 🪙, 100 usos, expira en 30 días)');

console.log('— crear código de descuento y aplicarlo (10/25/50%) —');
resetPromos();
let r = R(`Promos.createCode({id:'d10', type:'descuento', value:10, limit:10, days:0})`);
ok(r.ok === true && r.id === 'D10', 'crear descuento 10%');
r = R(`Promos.applyDiscount('d10')`);
ok(r.ok === true && r.pct === 10, 'aplicar descuento 10%');
ok(R('Promos.activeDiscount') === 10, 'activeDiscount = 10');
ok(R(`Promos.discountedPrice('$2.99', 10)`) === '$2.69', "precio $2.99 con 10% → $2.69");
R(`Promos.createCode({id:'d25', type:'descuento', value:25, limit:10, days:0})`);
R(`Promos.applyDiscount('D25')`);
ok(R(`Promos.discountedPrice('$2.99', 25)`) === '$2.24', "precio $2.99 con 25% → $2.24");
R(`Promos.createCode({id:'d50', type:'descuento', value:50, limit:10, days:0})`);
R(`Promos.applyDiscount('d50')`);
ok(R('Promos.activeDiscount') === 50, 'activeDiscount = 50');
ok(R(`Promos.discountedPrice('$4.00', 50)`) === '$2.00', "precio $4.00 con 50% → $2.00");
ok(R(`Promos.discountedPrice('$2.00', 10)`) === '$1.80', "precio $2.00 con 10% → $1.80");
r = R(`Promos.applyDiscount('noexiste')`);
ok(r.ok === false, 'código inexistente no aplica');
R('Promos.clearDiscount()');
ok(R('Promos.activeDiscount') === 0 && R('Promos.activeDiscountId') === null, 'clearDiscount limpia el descuento');

console.log('— código de monedas con límite 2 (2 jugadores simulados) —');
resetPromos();
R(`Promos.createCode({id:'m2', type:'monedas', value:500, limit:2, days:0})`);
r = R(`Promos.redeemCoins('M2')`);
ok(r.ok === true && r.coins === 500, 'jugador 1 canjea: +500 🪙');
ok(R('SAVE.coins') === 500, 'monedas sumadas al jugador 1');
ok(R(`Promos.get('M2').used`) === 1, 'usados = 1');
R('SAVE.redeemedPromos=[];'); // jugador 2 (otro dispositivo)
r = R(`Promos.redeemCoins('m2')`);
ok(r.ok === true && R('SAVE.coins') === 1000, 'jugador 2 canjea: OK (usados = 2)');
R('SAVE.redeemedPromos=[];'); // jugador 3
r = R(`Promos.redeemCoins('m2')`);
ok(r.ok === false && R(`Promos.get('M2').used`) === 2, '3er canje falla por límite de usos');

console.log('— código expirado no canjea —');
resetPromos();
R(`Promos.createCode({id:'exp1', type:'monedas', value:100, limit:5, days:0})`);
R(`Promos.get('EXP1').expiresAt = Date.now() - 1000;`);
r = R(`Promos.redeemCoins('exp1')`);
ok(r.ok === false, 'código expirado → no canjea');
ok(R('SAVE.coins') === 0, 'código expirado no da monedas');
r = R(`Promos.applyDiscount('AMIGOS500')`);
ok(r.ok === false, 'código de monedas no sirve como descuento');

console.log('— anti-doble canje: mismo jugador no canjea 2 veces —');
resetPromos();
R(`Promos.createCode({id:'una', type:'monedas', value:200, limit:5, days:0})`);
r = R(`Promos.redeemCoins('una')`);
ok(r.ok === true, 'primer canje OK');
r = R(`Promos.redeemCoins('UNA')`);
ok(r.ok === false, 'mismo jugador, segundo canje → falla');
ok(R(`Promos.get('UNA').used`) === 1, 'no consume uso extra en el doble canje');
ok(JSON.stringify(R('SAVE.redeemedPromos')) === JSON.stringify(['UNA']), 'redeemedPromos guarda el id');

console.log('— desactivar / activar / borrar —');
resetPromos();
R(`Promos.createCode({id:'off1', type:'descuento', value:10, limit:5, days:0})`);
ok(R(`Promos.setActive('off1', false)`) === true, 'desactivar devuelve true');
r = R(`Promos.applyDiscount('off1')`);
ok(r.ok === false, 'código desactivado no aplica descuento');
R(`Promos.createCode({id:'off2', type:'monedas', value:50, limit:5, days:0})`);
R(`Promos.setActive('off2', false)`);
r = R(`Promos.redeemCoins('off2')`);
ok(r.ok === false, 'código desactivado no da monedas');
ok(R(`Promos.setActive('off2', true)`) === true, 'reactivar devuelve true');
r = R(`Promos.redeemCoins('off2')`);
ok(r.ok === true, 'código reactivado vuelve a funcionar');
ok(R(`Promos.deleteCode('OFF2')`) === true, 'borrar devuelve true');
ok(R(`Promos.get('OFF2')`) === null, 'código borrado ya no existe');
r = R(`Promos.redeemCoins('off2')`);
ok(r.ok === false, 'código borrado no canjea');
// semillas también se pueden desactivar
ok(R(`Promos.setActive('BIENVENIDO10', false)`) === true, 'semilla BIENVENIDO10 se puede desactivar');
ok(R(`Promos.applyDiscount('bienvenido10')`).ok === false, 'BIENVENIDO10 desactivado no aplica');

console.log('— flujo admin: sin clave no entra, con la clave sí —');
resetPromos();
ok(R('Promos.isAdmin()') === false, 'al inicio no es admin');
ok(R(`Promos.adminLogin('clave-mala')`) === false, 'clave incorrecta → false');
ok(R('Promos.isAdmin()') === false, 'clave incorrecta → sigue sin ser admin');
ok(R(`Promos.adminLogin('')`) === false, 'clave vacía → false');
const FAM = R('FAMILY_CODE'); // solo el test conoce el valor interno
ok(R(`Promos.adminLogin(${JSON.stringify(FAM)})`) === true, 'clave correcta → true');
ok(R('Promos.isAdmin()') === true, 'clave correcta → es admin');
ok(R('SAVE.famCode') === true, 'clave correcta marca famCode (ya autenticado)');
R('Promos.adminLogout(); SAVE.famCode=false;');
ok(R('Promos.isAdmin()') === false, 'adminLogout quita el acceso de sesión');
// crear/listar/desactivar como admin
r = R(`Promos.adminLogin(${JSON.stringify(FAM)}) && Promos.createCode({id:'adm1', type:'monedas', value:777, limit:3, days:7})`);
ok(r.ok === true, 'admin crea código de monedas (777 🪙, 3 usos, 7 días)');
const li = R('Promos.list()');
const adm = li.find(c => c.id === 'ADM1');
ok(!!adm && adm.used === 0 && adm.limit === 3 && adm.expiresAt > Date.now(), 'listar muestra ADM1 con usados/límite 0/3 y expiración');
ok(R(`Promos.setActive('ADM1', false)`) === true, 'admin desactiva ADM1');

console.log('— validaciones de creación —');
resetPromos();
ok(R(`Promos.createCode({id:'x', type:'descuento', value:10, limit:5, days:0})`).ok === false, 'id muy corto se rechaza');
ok(R(`Promos.createCode({id:'d10', type:'descuento', value:10, limit:5, days:0})`).ok === true, 'crear D10 OK');
ok(R(`Promos.createCode({id:'d10', type:'descuento', value:10, limit:5, days:0})`).ok === false, 'id duplicado se rechaza');
ok(R(`Promos.createCode({id:'bad', type:'descuento', value:150, limit:5, days:0})`).ok === false, 'descuento >90% se rechaza');
ok(R(`Promos.createCode({id:'bad2', type:'monedas', value:0, limit:5, days:0})`).ok === false, 'monedas 0 se rechaza');

console.log('— el código familiar NUNCA aparece en promos.js visible —');
const src = fs.readFileSync(DIR + 'promos.js', 'utf8');
ok(!/@uruapan16/.test(src), 'el valor del código no está escrito en promos.js');
ok(/FAMILY_CODE/.test(src), 'solo se referencia la constante FAMILY_CODE para comparar');

console.log('\n' + pass + ' ✅ · ' + fail + ' ❌');
process.exit(fail ? 1 : 0);
