/* dealertest.js — pruebas de dealership.js (Tienda de Carros GEAYI) con stubs THREE/DOM.
   Uso: cd tests && node dealertest.js
   Verifica: catálogo (3 normales + 2 de lujo), compra con monedas suficientes/
   insuficientes, persistencia en SAVE.ownedDealerCars, flujo premium con código
   correcto/incorrecto, pago demo, lote construido SOLO en idx 3, y que el código
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
     SAVE.ownedDealerCars=[];`);
}

/* ---------- cargar state.js + stubs de integración ---------- */
R(fs.readFileSync(DIR + 'state.js', 'utf8'));
R(`
  function addStrings(){}
  function T(k){ return k; }
  function toast(){}
`);
R(fs.readFileSync(DIR + 'monetiza.js', 'utf8'));
R(fs.readFileSync(DIR + 'dealership.js', 'utf8'));

console.log('— catálogo —');
ok(R("typeof Dealership === 'object'"), 'Dealership existe');
ok(R("DEALER_CARS.length") === 5, '5 carros en el catálogo');
ok(R("DEALER_CARS.filter(c=>!c.premium).length") === 3, '3 carros normales');
ok(R("DEALER_CARS.filter(c=>c.premium).length") === 2, '2 carros de lujo');
ok(R("DEALER_CARS.filter(c=>!c.premium).every(c=>c.coins<=2500)") === true, 'normales cuestan ≤2500 🪙');
ok(R("DEALER_CARS.filter(c=>c.premium).every(c=>c.coins===8000)") === true, 'lujo cuestan 8000 🪙');

console.log('— compra con monedas suficientes —');
resetSave();
R('SAVE.coins = 1000;');
const b1 = R(`Dealership.buyWithCoins('dl_trotador')`);
ok(b1.ok === true, 'buyWithCoins(800) con 1000 → ok:true');
ok(R("Dealership.owns('dl_trotador')") === true, 'carro queda en ownedDealerCars');
ok(R("SAVE.coins") === 200, 'descuenta 800 (quedan 200)');

console.log('— compra con monedas insuficientes —');
resetSave();
R('SAVE.coins = 700;');
const b2 = R(`Dealership.buyWithCoins('dl_trotador')`);
ok(b2.ok === false, 'buyWithCoins(800) con 700 → ok:false');
ok(R("Dealership.owns('dl_trotador')") === false, 'no se desbloquea');
ok(R("SAVE.coins") === 700, 'no descuenta nada');

console.log('— no se puede comprar dos veces —');
resetSave();
R('SAVE.coins = 5000;');
R(`Dealership.buyWithCoins('dl_campestre')`);
const b3 = R(`Dealership.buyWithCoins('dl_campestre')`);
ok(b3.ok === false, 'segunda compra → ok:false');
ok(R("SAVE.coins") === 3500, 'solo descuenta una vez (1500)');

console.log('— monedas infinitas (código familiar) no descuentan —');
resetSave();
R('SAVE.coins = 42; SAVE.coinsInf = true;');
const b4 = R(`Dealership.buyWithCoins('dl_veloz')`);
ok(b4.ok === true && R("SAVE.coins") === 42, 'con ∞ se compra sin descontar');

console.log('— código incorrecto —');
resetSave();
const bad = R(`Dealership.redeemCodeFor('1234', 'dl_diamante')`);
ok(bad.ok === false, 'código malo → ok:false');
ok(R("Dealership.owns('dl_diamante')") === false, 'código malo → no desbloquea');
ok(/codeBad|no válido|Invalid/i.test(bad.msg), 'mensaje genérico (no revela nada)');

console.log('— código correcto —');
resetSave();
const CODE = R('FAMILY_CODE'); // solo el test conoce el valor interno; la UI jamás lo muestra
const good = R(`Dealership.redeemCodeFor(${JSON.stringify(CODE)}, 'dl_diamante')`);
ok(good.ok === true, 'código bueno → ok:true');
ok(R("Dealership.owns('dl_diamante')") === true, 'Diamante GT desbloqueado');
ok(R("Dealership.owns('dl_fenix')") === false, 'el otro de lujo sigue bloqueado (desbloqueo por carro)');

console.log('— el código NUNCA aparece en la UI —');
const src = fs.readFileSync(DIR + 'dealership.js', 'utf8');
const hits = [];
src.split('\n').forEach((ln, i) => { if (ln.includes(CODE)) hits.push(i + 1); });
const allowed = hits.every(n => /FAMILY_CODE/.test(src.split('\n')[n - 1]));
ok(hits.length === 0, 'el valor del código no aparece en dealership.js (' + hits.length + ' líneas)');
ok(allowed, 'solo se referencia el símbolo FAMILY_CODE');
ok(!/placeholder=.*uruapan|codePh.*uruapan/i.test(src), 'ningún placeholder/label revela el código');

console.log('— persistencia en SAVE —');
resetSave();
R('SAVE.coins = 9000;');
R(`Dealership.buyWithCoins('dl_diamante')`);
const raw = R(`localStorage.getItem('obbyXtreme3D_v1')`);
ok(raw && raw.includes('dl_diamante') && raw.includes('ownedDealerCars'), 'persist() guarda ownedDealerCars en localStorage');
ok(R("JSON.parse(localStorage.getItem('obbyXtreme3D_v1')).ownedDealerCars.includes('dl_diamante')") === true, 'recuperable tras "reinicio"');

console.log('— constructores 3D originales no revientan —');
ok(R("Dealership.buildDealerMesh('dl_trotador') !== null"), 'Trotador se construye');
ok(R("Dealership.buildDealerMesh('dl_campestre') !== null"), 'Campestre se construye');
ok(R("Dealership.buildDealerMesh('dl_veloz') !== null"), 'Veloz GT se construye');
ok(R("Dealership.buildDealerMesh('dl_diamante') !== null"), 'Diamante GT se construye');
ok(R("Dealership.buildDealerMesh('dl_fenix') !== null"), 'Fénix Imperial se construye');
ok(R("Dealership.buildDealerMesh('nope') === null"), 'carro desconocido → null');

/* ---------- lote 3D: necesita los helpers de mundo (mismo set que worldstress.js) ---------- */
const vm2 = require('vm');
const WFILES = ['i18n.js', 'audio.js', 'vehicles.js', 'world.js', 'neoncity.js', 'family.js',
  'player.js', 'online.js', 'travel.js', 'phase3.js', 'trophies.js', 'community.js',
  'casa.js', 'pets.js', 'fishing.js', 'racing.js', 'weather.js', 'observatory.js',
  'jobs.js', 'candy.js', 'citylife3.js', 'citylife1.js', 'citylife2.js', 'bridges.js', 'buildmode.js', 'funpark.js'];
for (const f of WFILES) vm2.runInContext(fs.readFileSync(DIR + f, 'utf8'), global.sandbox, { filename: f });
R('initThree()');

console.log('— lote SOLO en Immokalee (idx 3) —');
const neg = R(`(function(){
  const g = new THREE.Group();
  const l = { group: g, cars: [], idx: 0 };
  Dealership.buildForLevel(0, l.group);
  Dealership.buildForLevel(1, l.group);
  return g.children.length;
})()`);
ok(neg === 0, 'idx 0 y 1 → lote vacío');
R('var LVL = buildLevel(3)');
const before = R('LVL.group.children.length');
R('Dealership.buildForLevel(3, LVL.group)');
const after = R('LVL.group.children.length');
ok(after > before, 'idx 3 → lote construido (+' + (after - before) + ' nodos)');
const sign = R(`(function(){ let f=null; LVL.group.traverse(o=>{ if(o.userData&&o.userData.dealerSign) f=o; }); return f!==null; })()`);
ok(sign === true, 'letrero 3D "TIENDA DE CARROS GEAYI" presente');
const displays = R(`(function(){ let n=0; LVL.group.traverse(o=>{ if(o.userData&&o.userData.dealerDisplay) n++; }); return n; })()`);
ok(displays === 5, '5 carros de exhibición en el lote');

console.log('— carros propios aparecen manejables —');
resetSave();
R(`SAVE.ownedDealerCars.push('dl_veloz'); SAVE.ownedDealerCars.push('dl_fenix');`);
R('var LVL2 = buildLevel(3)');
R('LEVEL = LVL2;'); // igual que en startLevel de game.js: LEVEL ya está asignado
R('Dealership.buildForLevel(3, LVL2.group)');
const drivable = R(`LVL2.cars.filter(c=>c.dealer).map(c=>c.dealer).sort()`);
ok(JSON.stringify(drivable) === JSON.stringify(['dl_fenix', 'dl_veloz']), 'los 2 propios están en lvl.cars como manejables');
ok(R("LVL2.cars.filter(c=>c.dealer).every(c=>c.kind==='car'&&c.taken===false)") === true, 'formato kind:car, taken:false (patrón addCar)');

console.log('— update() de vitrina no revienta —');
ok(R("Dealership.update(0.016) === undefined"), 'update(dt) corre sin errores');

console.log('— pago demo —');
R('setTimeout = (fn) => { fn(); return 1; };'); // temporizadores inmediatos en el test
resetSave();
R(`Dealership.payDemo('dl_fenix').then(r => { globalThis.__pay = r; });`);
setTimeout(() => {
  const r = R('globalThis.__pay');
  ok(r && r.ok === true, 'payDemo resuelve ok:true (demo)');
  ok(R("Dealership.owns('dl_fenix')") === true, 'payDemo desbloquea el carro');
  const r2 = R(`(function(){ let p=null; return Dealership.payDemo('dl_trotador').then(x=>{p=x; return p;}); })()`);
  Promise.resolve(r2).then(v => {
    ok(v && v.ok === false, 'payDemo en carro normal → ok:false');
    console.log('\n' + pass + ' ✅ · ' + fail + ' ❌');
    process.exit(fail ? 1 : 0);
  });
}, 300);
