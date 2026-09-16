/* Prueba de economy.js (economía GEAYI: BizSim + Bank + DailyQuests):
   carga, API pública, datos de negocios/banco, compra (con/sin fondos,
   sin doble cobro), acumulación pasiva con tope, recoger suma monedas,
   banco deposita/retira/interés diario con tope (simula cambio de fecha),
   misiones: generación, progreso pasivo, completar, reclamar una sola vez
   y rotación por fecha.
   Sigue el patrón de lotstest.js (stubs THREE/DOM, sin Shop2: usa el
   fallback de SAVE.coins como hace lots.js). */
const fs = require('fs'), vm = require('vm');
require(__dirname + '/stubs.js');
const DIR = '/home/hatch/workspace/your_files/obby-3d/';
const FILES = ['state.js', 'economy.js'];
for (const f of FILES) {
  try {
    vm.runInContext(fs.readFileSync(DIR + f, 'utf8'), sandbox, { filename: f });
  } catch (e) {
    console.log('  ✗ ERROR cargando ' + f + ': ' + e.message);
    process.exit(1);
  }
}
console.log('carga: ' + FILES.length + ' archivos sin errores');

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; } else { fail++; console.log('  ✗ FAIL:', name); }
}

/* ================= API pública ================= */
ok(R(`typeof BizSim==='object' && typeof Bank==='object' && typeof DailyQuests==='object'`), 'api: BizSim/Bank/DailyQuests existen');
ok(R(`typeof BizSim.buildForLevel==='function' && typeof BizSim.update==='function' &&
       typeof BizSim.buyBiz==='function' && typeof BizSim.collect==='function' &&
       typeof BizSim.isOwned==='function' && typeof BizSim.pendingOf==='function'`),
  'api: BizSim buildForLevel/update/buyBiz/collect/isOwned/pendingOf');
ok(R(`typeof Bank.buildForLevel==='function' && typeof Bank.update==='function' &&
       typeof Bank.deposit==='function' && typeof Bank.withdraw==='function' &&
       typeof Bank.applyInterest==='function' && typeof Bank.balance==='function'`),
  'api: Bank buildForLevel/update/deposit/withdraw/applyInterest/balance');
ok(R(`typeof DailyQuests.update==='function' && typeof DailyQuests.claim==='function' &&
       typeof DailyQuests.togglePanel==='function'`),
  'api: DailyQuests update/claim/togglePanel');

/* ================= datos ================= */
ok(R(`BizSim.defsFor(3).length`) === 2, 'datos: 2 negocios en Immokalee (idx 3)');
ok(R(`BizSim.defsFor(0).length`) === 1, 'datos: 1 negocio en Ciudad Neón (idx 0)');
ok(R(`JSON.stringify(BizSim.defsFor(3).map(d=>d.price))`) === '[800,2000]', 'datos: precios 800/2000 en Immokalee');
ok(R(`BizSim.defsFor(0)[0].price`) === 3500, 'datos: mini-súper 3500 en Ciudad Neón');
ok(R(`BizSim.defsFor(3).every(d=>d.id&&d.x!=null&&d.z!=null&&d.rate&&d.name) &&
      BizSim.defsFor(0).every(d=>d.id&&d.x!=null&&d.z!=null&&d.rate&&d.name)`),
  'datos: cada negocio tiene {id,x,z,rate,name}');
ok(R(`Bank.defFor(0) && Bank.defFor(0).name==='BANCO GEAYI'`), 'datos: banco solo en Ciudad Neón (idx 0)');
ok(R(`Bank.defFor(3)`) === null, 'datos: sin banco en Immokalee');

/* ================= BizSim: compra ================= */
R(`SAVE.coins=1000; SAVE.biz={}; BizSim.buyBiz(3, BizSim.DEFS[3][0]);`);
ok(R(`SAVE.coins`) === 200, 'compra: 1000-800=200');
ok(R(`BizSim.isOwned(3,'biz-drinks')`) === true, 'compra: el negocio queda como propio');
ok(R(`SAVE.biz['3:biz-drinks'].bought===true && SAVE.biz['3:biz-drinks'].pending===0`),
  'compra: registro SAVE.biz con pending 0');
R(`BizSim.buyBiz(3, BizSim.DEFS[3][0]);`);
ok(R(`SAVE.coins`) === 200, 'compra: segunda compra no cobra de nuevo');
R(`SAVE.coins=100; SAVE.biz={}; BizSim.buyBiz(3, BizSim.DEFS[3][1]);`);
ok(R(`BizSim.isOwned(3,'biz-resto')`) === false, 'compra: sin fondos no se compra');
ok(R(`SAVE.coins`) === 100, 'compra: sin fondos no descuenta');

/* ================= BizSim: ingreso pasivo + tope ================= */
R(`MODE='play'; LEVEL={idx:3,group:new THREE.Group(),platforms:[]}; SAVE.coins=5000; SAVE.biz={};`);
R(`BizSim.buyBiz(3, BizSim.DEFS[3][0]);`); // 🧋 2 🪙/min
R(`BizSim.update(60);`); // 1 minuto jugado
ok(Math.abs(R(`BizSim.pendingOf(3,'biz-drinks')`) - 2) < 0.001, 'pasivo: 1 min → 2 🪙 en puesto de bebidas');
R(`BizSim.update(60);`);
ok(Math.abs(R(`BizSim.pendingOf(3,'biz-drinks')`) - 4) < 0.001, 'pasivo: 2 min → 4 🪙');
R(`SAVE.biz['3:biz-drinks'].pending=499; BizSim.update(3600);`);
ok(R(`BizSim.pendingOf(3,'biz-drinks')`) === 500, 'pasivo: tope de 500 🪙 (no se pasa)');
ok(R(`BizSim.pendingOf(3,'biz-resto')`) === 0, 'pasivo: negocio no comprado no genera');

/* ================= BizSim: recoger ================= */
R(`SAVE.biz['3:biz-drinks'].pending=100; SAVE.coins=200;`);
const got = R(`BizSim.collect(3, BizSim.DEFS[3][0]);`);
ok(got === 100, 'recoger: devuelve 100');
ok(R(`SAVE.coins`) === 300, 'recoger: 200+100=300 monedas');
ok(R(`BizSim.pendingOf(3,'biz-drinks')`) === 0, 'recoger: pending vuelve a 0');
ok(R(`SAVE.biz['3:biz-drinks'].collects`) === 1, 'recoger: cuenta collects=1 (misión diaria)');
ok(R(`BizSim.collect(3, BizSim.DEFS[3][0])`) === 0, 'recoger: sin pending devuelve 0');
ok(R(`SAVE.coins`) === 300, 'recoger: sin pending no suma monedas');

/* ================= BizSim: visual ================= */
R(`LEVEL={idx:3,group:new THREE.Group(),platforms:[]}; BizSim.buildForLevel(3, LEVEL.group);`);
ok(R(`Object.keys(BizSim._signs).length`) === 2, 'visual: 2 locales construidos en Immokalee');
ok(R(`LEVEL.group.children.length`) === 2, 'visual: 2 grupos agregados al nivel');
R(`LEVEL={idx:0,group:new THREE.Group(),platforms:[]}; BizSim.buildForLevel(0, LEVEL.group);`);
ok(R(`Object.keys(BizSim._signs).length`) === 1, 'visual: 1 local construido en Ciudad Neón');
R(`LEVEL={idx:5,group:new THREE.Group(),platforms:[]}; BizSim.buildForLevel(5, LEVEL.group);`);
ok(R(`Object.keys(BizSim._signs).length`) === 0, 'visual: mundo sin negocios no construye nada');
// el letrero cambia al comprar
R(`LEVEL={idx:3,group:new THREE.Group(),platforms:[]}; SAVE.biz={}; BizSim.buildForLevel(3, LEVEL.group);`);
R(`SAVE.coins=5000; BizSim.buyBiz(3, BizSim.DEFS[3][0]);`);
ok(R(`Object.keys(BizSim._signs).length`) === 2, 'visual: al comprar se refresca el letrero (sigue habiendo 2)');

/* ================= Bank: depósito/retiro ================= */
R(`SAVE.bank=null; SAVE.coins=500;`);
ok(R(`Bank.deposit(200)`) === true, 'banco: depósito 200 ok');
ok(R(`Bank.balance()`) === 200, 'banco: saldo 200');
ok(R(`SAVE.coins`) === 300, 'banco: 500-200=300 en bolsa');
ok(R(`Bank.deposit(999)`) === false, 'banco: no deposita más de lo que hay');
ok(R(`Bank.balance()`) === 200, 'banco: saldo intacto tras depósito fallido');
ok(R(`Bank.withdraw(50)`) === true, 'banco: retiro 50 ok');
ok(R(`Bank.balance()`) === 150, 'banco: saldo 150');
ok(R(`SAVE.coins`) === 350, 'banco: 300+50=350 en bolsa');
ok(R(`Bank.withdraw(999)`) === false, 'banco: no retira más del saldo');
ok(R(`Bank.balance()`) === 150, 'banco: saldo intacto tras retiro fallido');

/* ================= Bank: interés diario ================= */
R(`(function(){ const d=new Date(); d.setDate(d.getDate()-1);
  SAVE.bank={balance:1000,lastInterest:d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}; })();`);
const gained = R(`Bank.applyInterest();`);
ok(gained === 50, 'interés: 5% de 1000 = 50 tras 1 día');
ok(R(`Bank.balance()`) === 1050, 'interés: saldo 1050');
ok(R(`Bank.applyInterest()`) === 0, 'interés: no se cobra dos veces el mismo día');
R(`(function(){ const d=new Date(); d.setDate(d.getDate()-2);
  SAVE.bank={balance:10000,lastInterest:d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}; })();`);
const gained2 = R(`Bank.applyInterest();`);
ok(gained2 === 400, 'interés: tope 200/día → 400 en 2 días (no 1000)');
ok(R(`Bank.balance()`) === 10400, 'interés: saldo 10400 con tope');
// primer depósito: fija la fecha sin regalar interés
R(`SAVE.bank={balance:500,lastInterest:null};`);
ok(R(`Bank.applyInterest()`) === 0, 'interés: sin fecha previa no hay interés retroactivo');
ok(R(`Bank.balance()`) === 500, 'interés: saldo intacto el primer día');

/* ================= Bank: visual ================= */
R(`LEVEL={idx:0,group:new THREE.Group(),platforms:[]}; Bank.buildForLevel(0, LEVEL.group);`);
ok(R(`LEVEL.group.children.length`) >= 1, 'visual: banco construido en Ciudad Neón');
R(`LEVEL={idx:3,group:new THREE.Group(),platforms:[]}; Bank.buildForLevel(3, LEVEL.group);`);
ok(R(`LEVEL.group.children.length`) === 0, 'visual: sin banco en Immokalee');

/* ================= DailyQuests: generación ================= */
R(`MODE='play'; SAVE.quests=null; SAVE.visited={}; SAVE.fish=0; SAVE.biz={}; coinsRun=0; DailyQuests.update(0.016);`);
ok(R(`SAVE.quests && SAVE.quests.date===DailyQuests._today()`), 'misiones: se generan con la fecha de hoy');
ok(R(`SAVE.quests.list.length`) === 3, 'misiones: 3 misiones al día');
ok(R(`SAVE.quests.list.every(q=>q.id&&q.desc&&q.target>0&&q.reward>=30&&q.reward<=100&&q.progress===0&&q.done===false&&q.claimed===false)`),
  'misiones: cada una tiene {id,desc,target,reward,progress 0,done,claimed}');
ok(R(`new Set(SAVE.quests.list.map(q=>q.id)).size`) === 3, 'misiones: las 3 son distintas');
// sin negocio propio no sale la misión de recoger ganancias
ok(R(`SAVE.quests.list.every(q=>q.id!=='collect')`), 'misiones: sin negocio no hay misión "recoge ganancias"');

/* ================= DailyQuests: progreso pasivo ================= */
R(`SAVE.quests=null; SAVE.visited={0:1,3:1}; SAVE.fish=7; coinsRun=0; DailyQuests._earned=0; DailyQuests.update(0.016);`);
const qi = id => R(`SAVE.quests.list.findIndex(q=>q.id==='${id}')`);
const qCoins = qi('coins'), qFish = qi('fish'), qVisit = qi('visit');
ok(qCoins >= 0, 'progreso: existe misión de monedas');
R(`coinsRun=25; DailyQuests.update(0.016);`);
ok(R(`SAVE.quests.list[${qCoins}].progress`) === 25, 'progreso: 25 monedas recolectadas → progreso 25');
R(`coinsRun=50; DailyQuests.update(0.016);`);
ok(R(`SAVE.quests.list[${qCoins}].done`) === true, 'progreso: 50 ≥ 40 → misión completada');
ok(qFish >= 0, 'progreso: existe misión de pesca');
R(`SAVE.fish=10; DailyQuests.update(0.016);`); // base 7 → 3 pescados
if (qFish >= 0) {
  ok(R(`SAVE.quests.list[${qFish}].progress`) === 3, 'progreso: pescar 3 (7→10) → progreso 3, completada');
  ok(R(`SAVE.quests.list[${qFish}].done`) === true, 'progreso: misión de pesca completada');
}
if (qVisit >= 0) {
  R(`SAVE.visited[4]=1; DailyQuests.update(0.016);`);
  ok(R(`SAVE.quests.list[${qVisit}].progress`) === 1, 'progreso: visitar 1 mundo nuevo (base 2) → progreso 1');
}

/* ================= DailyQuests: reclamar una sola vez ================= */
R(`SAVE.coins=0;`);
const rw = R(`SAVE.quests.list[${qCoins}].reward`);
const c1 = R(`DailyQuests.claim(${qCoins});`);
ok(c1 === true, 'reclamar: ok la primera vez');
ok(R(`SAVE.quests.list[${qCoins}].claimed`) === true, 'reclamar: queda marcada');
ok(R(`SAVE.coins`) === rw, 'reclamar: suma la recompensa (' + rw + ' 🪙)');
ok(R(`DailyQuests.claim(${qCoins})`) === false, 'reclamar: segunda vez no da nada');
ok(R(`SAVE.coins`) === rw, 'reclamar: sin doble pago');
ok(R(`DailyQuests.claim(99)`) === false, 'reclamar: índice inválido no da nada');

/* ================= DailyQuests: rotación por fecha ================= */
R(`SAVE.quests.date='2000-01-01'; DailyQuests.update(0.016);`);
ok(R(`SAVE.quests.date===DailyQuests._today()`), 'rotación: al cambiar el día se regeneran');
ok(R(`SAVE.quests.list.length`) === 3 && R(`SAVE.quests.list.every(q=>!q.done&&!q.claimed)`),
  'rotación: lista nueva sin completar');
// determinista: misma fecha → mismas 3 misiones
const ids1 = R(`SAVE.quests.list.map(q=>q.id).join(',')`);
R(`SAVE.quests.date='2000-01-01'; DailyQuests.update(0.016);`);
const ids2 = R(`SAVE.quests.list.map(q=>q.id).join(',')`);
ok(ids1 === ids2, 'rotación: misma fecha → mismas misiones (' + ids1 + ')');
// con negocio propio SÍ puede salir la misión de recoger ganancias
R(`SAVE.biz={'3:biz-drinks':{bought:true,pending:0,collects:0}}; SAVE.quests=null; DailyQuests.update(0.016);`);
ok(R(`SAVE.quests.list.length`) === 3, 'misiones: con negocio siguen siendo 3');

console.log('\neconomytest: ' + pass + ' OK, ' + fail + ' fallidas');
process.exit(fail ? 1 : 0);
