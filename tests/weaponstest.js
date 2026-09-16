/* Prueba de juguetes tipo Roblox (weapons.js) + control parental con PIN:
   - Catálogo de 6 juguetes originales GEAYI (3 básicos 🪙 + 3 premium USD)
   - Sin PIN: no se puede comprar ni equipar (control parental bloqueado)
   - Crear PIN (4 dígitos) → sesión desbloqueada
   - lockSession + PIN incorrecto → sigue bloqueado; PIN correcto → desbloquea
   - Compra básica descuenta monedas vía Shop2.spendCoins; sin monedas no compra
   - Compra premium vía Billing.buy (demo) marca propiedad y equipa
   - equipar/desequipar persiste en SAVE.weapons
   - tryFire crea proyectil; pool máximo de 12; cannon dispara triple
   - Blanco acertado da +10🪙 (turbo +20🪙); no paga dos veces durante respawn
   - Espada básica alcanza 2.8m; espada sónica alcanza 4m
   - Blancos de Neón (i=0) e Immokalee (i=3) a ≥8m de las calles
   Sigue el patrón de sittest.js (stubs THREE/DOM). */
const fs = require('fs'), vm = require('vm');
require(__dirname + '/stubs.js');
const DIR = '/home/hatch/workspace/your_files/obby-3d/';
const FILES = ['state.js', 'i18n.js', 'audio.js', 'vehicles.js', 'world.js', 'neoncity.js', 'family.js', 'player.js',
  'online.js', 'travel.js', 'phase3.js', 'powers.js', 'trophies.js', 'community.js', 'casa.js', 'pets.js',
  'fishing.js', 'racing.js', 'weather.js', 'observatory.js', 'jobs.js', 'candy.js', 'citylife3.js', 'citylife1.js',
  'citylife2.js', 'bridges.js', 'buildmode.js', 'funpark.js', 'bowling.js', 'train.js', 'promos.js',
  'dealership.js', 'waterpark.js', 'fireworks.js', 'zoo.js', 'concerts.js', 'carwash.js', 'castle.js',
  'lots.js', 'furniture.js', 'monetiza.js', 'weapons.js', 'game.js', 'ranch.js'];
for (const f of FILES) {
  try {
    vm.runInContext(fs.readFileSync(DIR + f, 'utf8'), sandbox, { filename: f });
  } catch (e) {
    console.log('  ✗ ERROR cargando ' + f + ': ' + e.message);
    process.exit(1);
  }
}
console.log('carga: ' + FILES.length + ' archivos sin errores');

/* Silencio de audio/partículas + captura de toast */
vm.runInContext(
  `var __toastLog = []; var __toastOrig = toast;
   toast = function(m){ __toastLog.push(m); try { __toastOrig(m); } catch(e){} };
   try { Audio2.click = function(){}; Audio2.buy = function(){}; Audio2.coin = function(){}; Audio2.deny = function(){}; Audio2.tone = function(){}; } catch(e){}
   try { Particles.burst = function(){}; } catch(e){}`, sandbox);

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; } else { fail++; console.log('  ✗ FAIL:', name); }
}

R(`initThree(); Particles.init();`);
R(`SAVE.coins = 0; MODE = 'play'; Player.pos = new THREE.Vector3(0,0,0); Player.vel = new THREE.Vector3(); Player.heading = 0;`);
const clearCd = () => R(`for (let i = 0; i < 40; i++) Weapons.update(1/60);`); // limpia el cooldown interno

/* 1. Estado por defecto: armas + control parental */
ok(R(`!!SAVE.weapons && typeof SAVE.weapons.owned === 'object' && SAVE.weapons.equipped === null`), 'state: SAVE.weapons por defecto');
ok(R(`!!SAVE.parental && SAVE.parental.pin === null && SAVE.parental.weaponsLocked === true`), 'state: SAVE.parental por defecto (pin null, bloqueado)');

/* 2. Catálogo: 6 juguetes */
ok(R(`Weapons.list().length`) === 6, 'catálogo de 6 juguetes');
ok(R(`Weapons.list().filter(w=>w.coin).length`) === 3, '3 básicas con monedas');
ok(R(`Weapons.list().filter(w=>!w.coin).length`) === 3, '3 premium USD');
ok(R(`Weapons.list().every(w=>w.id && w.name && w.emoji && w.type)`), 'catálogo completo (id/nombre/emoji/tipo)');
ok(R(`JSON.stringify(Weapons.list().map(w=>w.sku||''))`).includes('geayi_weapon_turbo'), 'premium con SKUs geayi_weapon_*');

/* 3. 🔒 Sin PIN no se puede comprar ni equipar */
ok(R(`Weapons.isUnlocked()`) === false, 'sin PIN: sesión bloqueada');
ok(R(`Weapons.hasPin()`) === false, 'sin PIN: hasPin false');
ok(R(`Weapons.buyBasic('dart')`) === false, 'sin PIN: buyBasic rechazado');
ok(R(`Weapons.equip('dart')`) === false, 'sin PIN: equip rechazado');
ok(R(`Weapons.tryFire()`) === false, 'sin PIN: tryFire rechazado');
ok(R(`Weapons.swing()`) === false, 'sin PIN: swing rechazado');
ok(R(`Weapons.equipped()`) === null, 'sin PIN: nada equipado');

/* 4. Crear PIN → desbloquea la sesión */
ok(R(`Weapons.createPin('12')`) === false, 'createPin rechaza PIN de 2 dígitos');
ok(R(`Weapons.createPin('1234')`) === true, 'createPin(1234) ok');
ok(R(`SAVE.parental.pin`) === '1234', 'PIN guardado en SAVE.parental');
ok(R(`Weapons.hasPin()`) === true, 'hasPin true tras crear');
ok(R(`Weapons.isUnlocked()`) === true, 'sesión desbloqueada tras crear PIN');

/* 5. Cerrar sesión → PIN incorrecto no abre; correcto sí */
R(`Weapons.lockSession();`);
ok(R(`Weapons.isUnlocked()`) === false, 'lockSession bloquea de nuevo');
ok(R(`Weapons.unlockWithPin('0000')`) === false, 'PIN incorrecto rechazado');
ok(R(`Weapons.isUnlocked()`) === false, 'PIN incorrecto no desbloquea');
ok(R(`Weapons.equip('dart')`) === false, 'con PIN incorrecto: equip sigue rechazado');
ok(R(`Weapons.unlockWithPin('1234')`) === true, 'PIN correcto desbloquea');
ok(R(`Weapons.isUnlocked()`) === true, 'sesión desbloqueada con PIN correcto');

/* 6. Compra básica con monedas (Shop2.spendCoins real) */
R(`SAVE.coins = 1000;`);
ok(R(`Weapons.buyBasic('dart')`) === true, 'compra básica dart (200🪙) ok');
ok(R(`SAVE.coins`) === 800, 'descuenta 200 monedas (1000→800)');
ok(R(`Weapons.owns('dart')`) === true, 'dart marcada como propia');
ok(R(`Weapons.equipped()`) === 'dart', 'dart se equipa al comprar');
ok(R(`SAVE.weapons.owned.dart === true && SAVE.weapons.equipped === 'dart'`), 'compra persiste en SAVE.weapons');
R(`SAVE.coins = 50;`);
ok(R(`Weapons.buyBasic('water')`) === false, 'sin monedas suficientes: no compra water (120🪙)');
ok(R(`Weapons.owns('water')`) === false, 'sin monedas: water no marcada como propia');
ok(R(`SAVE.coins`) === 50, 'sin monedas: no descuenta nada');

/* 7. Equipar / desequipar */
R(`SAVE.coins = 1000; Weapons.buyBasic('sword');`);
ok(R(`Weapons.equipped()`) === 'sword', 'sword equipada');
ok(R(`Weapons.unequip()`) === true, 'unequip ok');
ok(R(`Weapons.equipped()`) === null, 'nada equipado tras unequip');
ok(R(`SAVE.weapons.equipped`) === null, 'unequip persiste en SAVE');
ok(R(`Weapons.equip('water')`) === false, 'equipar juguete no comprado → false');

/* 8. Disparo: crea proyectil, respeta cooldown y pool */
R(`Weapons.equip('dart'); Player.pos.set(0,0,30); Player.heading = 0;`);
clearCd();
ok(R(`Weapons.tryFire()`) === true, 'tryFire con dart ok');
ok(R(`Weapons.activeShots()`) === 1, 'disparo crea 1 proyectil');
ok(R(`Weapons.tryFire()`) === false, 'cooldown bloquea disparo inmediato (0.35s)');
R(`for (let i = 0; i < 30; i++) Weapons.update(1/60);`); // avanza ~0.5s: cooldown listo
const pi = R(`JSON.stringify(Weapons.poolInfo().filter(p=>p.active))`);
const act = JSON.parse(pi);
ok(act.length >= 1 && act[0].z > 30.5, 'proyectil avanza hacia adelante (+z)');
R(`for (let i = 0; i < 60; i++) Weapons.update(1/60);`); // ~1.5s total: el dardo ya cayó
ok(R(`Weapons.activeShots()`) === 0, 'proyectil cae al suelo y se desactiva (arco de gravedad)');
/* pool máximo de 12 */
clearCd();
const many = R(`(function(){ let n = 0; for (let i = 0; i < 30; i++) { Weapons._cd = 0; if (Weapons.tryFire()) n++; } return n; })()`);
ok(many <= 12, 'pool máximo de 12 proyectiles (intentos: 30, activos: ' + many + ')');
ok(R(`Weapons.poolInfo().length`) === 12, 'pool pre-creado de 12');
R(`for (let i = 0; i < 300; i++) Weapons.update(1/60);`);
ok(R(`Weapons.activeShots()`) === 0, 'pool se recicla: todo desactivado tras caer');

/* 9. Melee con espada equipada → tryFire rechazado */
R(`Weapons.equip('sword');`);
ok(R(`Weapons.tryFire()`) === false, 'espada no dispara (melee)');
ok(R(`Weapons.swing()`) === true, 'swing con espada ok');

/* 10. Blancos: posiciones seguras (≥8m de calles) */
R(`Weapons.buildForLevel(0, new THREE.Group());`);
const neon = R(`JSON.stringify(Weapons.targets())`);
ok(R(`Weapons.targets().length`) === 4, 'Neón: 4 blancos');
{
  const ts = JSON.parse(neon);
  const streets = [-150, -90, -30, 30, 90, 150];
  const safe = ts.every(t => streets.every(s => Math.abs(t.x - s) >= 8 && Math.abs(t.z - s) >= 8));
  ok(safe, 'Neón: blancos a ≥8m de las calles (plaza ' + ts.map(t => `(${t.x},${t.z})`).join(' ') + ')');
}
R(`Weapons.buildForLevel(3, new THREE.Group());`);
const immo = R(`JSON.stringify(Weapons.targets())`);
ok(R(`Weapons.targets().length`) === 4, 'Immokalee: 4 blancos');
{
  const ts = JSON.parse(immo);
  // calles de world.js cercanas: roadEW z=18, roadEW z=-14 (x -100..36), roadNS x=-48
  const safe = ts.every(t =>
    Math.abs(t.z - 18) >= 8 &&
    !(Math.abs(t.z - (-14)) < 8 && t.x >= -100 && t.x <= 36) &&
    Math.abs(t.x - (-48)) >= 8);
  ok(safe, 'Immokalee: blancos a ≥8m de las calles (parque ' + ts.map(t => `(${t.x},${t.z})`).join(' ') + ')');
}

/* 11. Acertar blanco con dart → +10🪙, no paga dos veces, respawn a los 10s */
R(`Weapons.equip('dart'); SAVE.coins = 0;`);
{
  const ts = JSON.parse(R(`JSON.stringify(Weapons.targets())`));
  const t0 = ts[0];
  clearCd();
  R(`Player.pos.set(${t0.x}, 0, ${t0.z - 6}); Player.heading = 0; Weapons.tryFire();`);
  let steps = 0;
  while (R(`Weapons.targets()[0].alive`) === true && steps < 120) { R(`Weapons.update(1/60);`); steps++; }
  ok(R(`Weapons.targets()[0].alive`) === false, 'dart acierta el blanco (cae)');
  ok(R(`SAVE.coins`) === 10, 'blanco normal da +10🪙');
  R(`for (let i = 0; i < 300; i++) Weapons.update(1/60);`); // 5s: a mitad del respawn
  ok(R(`Weapons.targets()[0].alive`) === false, 'blanco no paga dos veces durante respawn');
  ok(R(`SAVE.coins`) === 10, 'sin doble pago durante respawn');
  R(`for (let i = 0; i < 420; i++) Weapons.update(1/60);`); // +7s = 12s total > 10s
  ok(R(`Weapons.targets()[0].alive`) === true, 'blanco reaparece a los 10s');
}

/* 12. Turbo da +20🪙 por blanco (requiere compra premium primero) */
(async () => {
  /* Billing.buy real espera setTimeout (stub) → se simula el modo demo y se capturan los SKUs */
  R(`globalThis.__skus = []; Billing.buy = async (sku) => { __skus.push(sku); return { ok: true, sku: sku, demo: true, ts: 1 }; };`);
  const bought = await R(`Weapons.buyPremium('turbo')`);
  ok(bought === true, 'compra premium turbo vía Billing.buy demo ok');
  ok(R(`__skus.join(',')`).includes('geayi_weapon_turbo'), 'Billing.buy recibió el SKU geayi_weapon_turbo');
  ok(R(`Weapons.owns('turbo')`) === true, 'turbo marcada como propia');
  ok(R(`Weapons.equipped()`) === 'turbo', 'turbo se equipa al comprar');
  const boughtCannon = await R(`Weapons.buyPremium('cannon')`);
  ok(boughtCannon === true, 'compra premium cannon ok');
  ok(R(`__skus.join(',')`).includes('geayi_weapon_cannon'), 'Billing.buy recibió el SKU geayi_weapon_cannon');
  ok(R(`Weapons.owns('cannon')`) === true, 'cannon marcada como propia');
  ok(R(`Weapons.activeShots()`) === 0, 'sin disparos pendientes');
  /* cañón: disparo triple */
  R(`Weapons.equip('cannon'); Player.pos.set(0,0,0); Player.heading = 0;`); clearCd();
  R(`Weapons.tryFire();`);
  ok(R(`Weapons.activeShots()`) === 3, 'cañón genera disparo triple en abanico');
  R(`for (let i = 0; i < 300; i++) Weapons.update(1/60);`);
  /* turbo: +20🪙 por blanco */
  R(`Weapons.buildForLevel(3, new THREE.Group()); Weapons.equip('turbo'); SAVE.coins = 0;`);
  const ts2 = JSON.parse(R(`JSON.stringify(Weapons.targets())`));
  const t1 = ts2[1];
  clearCd();
  R(`Player.pos.set(${t1.x}, 0, ${t1.z - 8}); Player.heading = 0; Weapons.tryFire();`);
  let s2 = 0;
  while (R(`SAVE.coins`) === 0 && s2 < 200) { R(`Weapons.update(1/60);`); s2++; }
  ok(R(`SAVE.coins`) === 20, 'turbo da +20🪙 por blanco (coins=' + R(`SAVE.coins`) + ')');

  /* 13. Espada básica alcanza a 2.8m; sónica alcanza 4m */
  R(`Weapons.buildForLevel(3, new THREE.Group()); Weapons.equip('sword'); SAVE.coins = 0;`);
  const ts3 = JSON.parse(R(`JSON.stringify(Weapons.targets())`));
  const t2 = ts3[2];
  clearCd();
  R(`Player.pos.set(${t2.x}, 0, ${t2.z - 2.5}); Player.heading = 0; Weapons.swing();`);
  ok(R(`SAVE.coins`) === 10, 'espada básica alcanza blanco a 2.5m (+10🪙)');
  R(`Weapons.buildForLevel(3, new THREE.Group()); SAVE.coins = 0;`);
  const ts4 = JSON.parse(R(`JSON.stringify(Weapons.targets())`));
  const t3 = ts4[3];
  clearCd();
  R(`Player.pos.set(${t3.x}, 0, ${t3.z - 3.5}); Player.heading = 0; Weapons.swing();`);
  ok(R(`SAVE.coins`) === 0, 'espada básica NO alcanza a 3.5m');
  const boughtSonic = await R(`Weapons.buyPremium('sonic')`);
  ok(boughtSonic === true, 'compra premium sonic ok');
  R(`Weapons.buildForLevel(3, new THREE.Group()); Weapons.equip('sonic'); SAVE.coins = 0;`);
  const ts5 = JSON.parse(R(`JSON.stringify(Weapons.targets())`));
  const t4 = ts5[0];
  clearCd();
  R(`Player.pos.set(${t4.x}, 0, ${t4.z - 3.5}); Player.heading = 0; Weapons.swing();`);
  ok(R(`SAVE.coins`) === 15, 'espada sónica alcanza hasta 4m (+15🪙)');

  /* 14. Premium bloqueado sin desbloquear sesión */
  R(`Weapons.lockSession(); SAVE.coins = 5000;`);
  const bp = await R(`Weapons.buyPremium('turbo')`);
  ok(bp === false, 'buyPremium rechazado con sesión bloqueada');
  ok(R(`Weapons.tryFire()`) === false, 'tryFire rechazado con sesión bloqueada');
  R(`Weapons.unlockWithPin('1234');`);

  /* 15. Overlay del PIN no rompe y usa español */
  ok(R(`(function(){ Weapons.openPinPad(()=>{}); return !!document.getElementById('wpp-ov'); })()`) === true, 'openPinPad crea el overlay');
  ok(R(`document.getElementById('wpp-title').textContent`).includes('🔒'), 'overlay con candado');
  R(`(function(){ var o = document.getElementById('wpp-ov'); if (o && o.remove) o.remove(); })();`);

  /* 16. Tienda: pestaña 🧸 existe, se abre y respeta el bloqueo */
  ok(R(`typeof Shop2 !== 'undefined' && typeof Shop2.open === 'function'`), 'Shop2 disponible');
  R(`Weapons.lockSession();`);
  let shopOk = true;
  try { R(`Shop2.open('weapons');`); } catch (e) { shopOk = false; }
  ok(shopOk, 'Shop2.open(weapons) con sesión bloqueada no rompe');
  R(`Weapons.unlockWithPin('1234');`);
  try { R(`Shop2.open('weapons');`); } catch (e) { shopOk = false; }
  ok(shopOk, 'Shop2.open(weapons) desbloqueada no rompe');

  console.log(`\nweaponstest: ${pass} OK, ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('  ✗ ERROR en prueba async:', e.message); process.exit(1); });
