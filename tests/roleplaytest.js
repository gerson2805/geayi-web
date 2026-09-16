/* Pruebas de roleplay.js (🏡 Vida GEAYI): cuidado de mascotas, atuendos,
   hub y decaimiento de stats. Patrón de tests/minigamestest.js. */
const fs = require('fs'), vm = require('vm');
require(__dirname + '/stubs.js');
const DIR = '/home/hatch/workspace/your_files/obby-3d/';
const FILES = ['state.js', 'i18n.js', 'audio.js', 'pets.js', 'roleplay.js'];
for (const f of FILES) {
  try {
    vm.runInContext(fs.readFileSync(DIR + f, 'utf8'), global.sandbox, { filename: f });
  } catch (e) {
    console.log('  ✗ ERROR cargando ' + f + ': ' + e.message);
    process.exit(1);
  }
}
console.log('carga: 5 archivos sin errores');

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; } else { fail++; console.log('  ✗ FAIL:', name); }
}
const R = (expr) => vm.runInContext(expr, global.sandbox);

ok(R(`typeof Roleplay !== 'undefined'`), 'Roleplay existe');
try { R(`Roleplay.init()`); ok(true, 'Roleplay.init() no falla'); }
catch (e) { ok(false, 'init → ' + e.message); }
ok(R(`Roleplay._t('rp.hub') === '🏡 Vida GEAYI'`), 'título ES del hub');
ok(R(`Roleplay._ensureSave() === true`), '_ensureSave crea petCare/petGear');

/* ---------- cuidado ---------- */
R(`SAVE.activePet = 'dog1'; SAVE.coins = 100;`);
R(`SAVE.petCare = { dog1: { food: 50, fun: 50, clean: 50, seen: Date.now(), gift: '' } };`);
ok(R(`Roleplay.feed() === true`), 'feed funciona con monedas');
ok(R(`SAVE.coins === 80`), 'feed cuesta 20🪙');
ok(R(`SAVE.petCare.dog1.food === 85`), 'feed sube hambre +35');
R(`SAVE.coins = 5;`);
ok(R(`Roleplay.feed() === false`), 'feed bloqueado sin monedas');
ok(R(`SAVE.coins === 5`), 'sin monedas no se cobra');
R(`Roleplay._playCd = 0; Roleplay._bathCd = 0;`);
ok(R(`Roleplay.play() === true`), 'play funciona');
ok(R(`Roleplay.play() === false`), 'play tiene espera (cooldown)');
ok(R(`Roleplay.bathe() === true`), 'bathe funciona');
ok(R(`Roleplay.bathe() === false`), 'bathe tiene espera');

/* ---------- decaimiento ---------- */
R(`SAVE.petCare.dog1 = { food: 80, fun: 80, clean: 80, seen: Date.now() - 120*60000, gift: '' };`);
R(`Roleplay._applyDecay(SAVE.petCare.dog1)`);
const food = R(`Math.round(SAVE.petCare.dog1.food)`);
ok(food === 32, 'decaimiento 120 min ≈ -48 (dio ' + food + ')');

/* ---------- regalo diario ---------- */
R(`SAVE.petCare.dog1 = { food: 90, fun: 90, clean: 90, seen: Date.now(), gift: '' }; SAVE.coins = 0;`);
ok(R(`Roleplay.gift() === true`), 'mascota feliz da regalo');
ok(R(`SAVE.coins === 50`), 'regalo = 50🪙');
ok(R(`Roleplay.gift() === false`), 'regalo solo una vez al día');
R(`SAVE.petCare.dog1 = { food: 10, fun: 10, clean: 10, seen: Date.now(), gift: '' };`);
ok(R(`Roleplay.gift() === false`), 'mascota triste no da regalo');

/* ---------- atuendos ---------- */
R(`SAVE.petGear = { owned: {}, worn: {} }; SAVE.coins = 500; SAVE.activePet = 'dog1';`);
ok(R(`Roleplay.buyOutfit('hat') === true`), 'comprar sombrero');
ok(R(`SAVE.petGear.owned.hat === true`), 'sombrero queda en owned');
ok(R(`SAVE.coins === 400`), 'sombrero cuesta 100🪙');
R(`SAVE.coins = 10;`);
ok(R(`Roleplay.buyOutfit('crown') === false`), 'corona bloqueada sin monedas');
ok(R(`Roleplay.wearOutfit('hat') === true`), 'poner sombrero');
ok(R(`Roleplay._wornOf('dog1') === 'hat'`), 'sombrero queda puesto');
ok(R(`Roleplay.wearOutfit(null) === true`), 'quitar atuendo');
ok(R(`Roleplay._wornOf('dog1') === null`), 'atuendo quitado');
R(`SAVE.activePet = 'none';`);
ok(R(`Roleplay.wearOutfit('hat') === false`), 'sin mascota activa no se viste');
R(`SAVE.activePet = 'dog1';`);

/* ---------- malla 3D del atuendo ---------- */
const mesh = R(`Roleplay._buildOutfitMesh('hat')`);
ok(mesh && mesh.userData && mesh.userData.rpOutfit === true, 'sombrero 3D lleva marca rpOutfit');
ok(R(`Roleplay._buildOutfitMesh('glasses') !== null`), 'lentes 3D se construyen');
ok(R(`Roleplay._buildOutfitMesh('cape') !== null`), 'capa 3D se construye');
ok(R(`Roleplay._buildOutfitMesh('crown') !== null`), 'corona 3D se construye');
ok(R(`Roleplay._buildOutfitMesh('zzz') === null`), 'atuendo inválido → null');

/* ---------- paneles y update ---------- */
try { R(`Roleplay.openHub()`); ok(true, 'openHub no falla'); } catch (e) { ok(false, 'openHub → ' + e.message); }
try { R(`Roleplay.openCare()`); ok(true, 'openCare no falla'); } catch (e) { ok(false, 'openCare → ' + e.message); }
try { R(`Roleplay.openOutfits()`); ok(true, 'openOutfits no falla'); } catch (e) { ok(false, 'openOutfits → ' + e.message); }
try { R(`Roleplay.update(0.5)`); ok(true, 'update no falla'); } catch (e) { ok(false, 'update → ' + e.message); }
R(`Roleplay.close()`);

console.log(`\nroleplaytest: ${pass} OK, ${fail} FALLOS`);
process.exit(fail ? 1 : 0);
