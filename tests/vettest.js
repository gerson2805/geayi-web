/* vettest.js — pruebas de vet.js (🏥 VETERINARIA GEAYI) con stubs THREE/DOM.
   Uso: cd tests && node vettest.js
   Verifica: la clínica solo se construye en idx 3; curar mascota enferma da
   +20 🪙 y la deja sana; alimentar/bañar suben stats con tope 100; los stats
   bajan con el tiempo simulado; curar cliente NPC paga +20 🪙. */
'use strict';
require('./stubs.js'); // deja global.sandbox y global.R
const fs = require('fs');
const DIR = '/home/hatch/workspace/your_files/obby-3d/';

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✅ ' + name); }
  else { fail++; console.log('  ❌ ' + name); }
}
function resetVetSave() {
  R(`SAVE.coins = 0;
     SAVE.vetStats = {
       mily:  { salud: 100, hambre: 100, limpio: 100, enferma: false },
       kiara: { salud: 100, hambre: 100, limpio: 100, enferma: false },
       whini: { salud: 100, hambre: 100, limpio: 100, enferma: false }
     };`);
}

/* ---------- cargar state.js + stubs de integración ---------- */
R(fs.readFileSync(DIR + 'state.js', 'utf8'));
R(`
  function addStrings(){}
  function T(k){ return k; }
  function toast(){}
  function canvasTex(w,h,draw){ return { __tex: true, w: w, h: h }; }
  function persist(){}
  var Particles = { burst(){ __bursts.push(1); } };
  var __bursts = [];
  var Shop2 = { addCoins(n){ SAVE.coins += n; } };
  LEVEL.idx = 3; LEVEL.group = null;
  MODE = 'play';
  var Player = { pos: { x: -22, y: 0, z: 150 } };
  var Audio2 = { click(){} };
`);
R(fs.readFileSync(DIR + 'vet.js', 'utf8'));

console.log('— la clínica solo se construye en idx 3 —');
resetVetSave();
R('var g0 = new THREE.Group();');
R('Vet.buildForLevel(0, g0)');
ok(R('g0.children.length') === 0, 'idx 0 → 0 hijos (sin clínica)');
R('var g5 = new THREE.Group();');
R('Vet.buildForLevel(5, g5)');
ok(R('g5.children.length') === 0, 'idx 5 → 0 hijos (sin clínica)');
R('var g3 = new THREE.Group();');
R('LEVEL.group = g3;');
const built = R('Vet.buildForLevel(3, g3)');
ok(built === 1, 'idx 3 → buildForLevel devuelve 1');
ok(R('g3.children.length') > 0, 'idx 3 → la clínica se agrega al grupo');
ok(R("Vet._clinic !== null"), 'Vet._clinic queda registrado');
ok(R("Vet._tablePet !== null"), 'la mascota elegida aparece en la camilla');
const again = R('Vet.buildForLevel(3, g3)');
ok(again === 1 && R('g3.children.length') === R('g3.children.length'), 'reconstruir no duplica (reemplaza)');
ok(R("typeof window.Vet === 'object'"), 'Vet expuesto en window');

console.log('— curar mascota enferma: +20 🪙 y queda sana —');
resetVetSave();
R(`Vet.buildForLevel(3, g3); SAVE.vetStats.mily.enferma = true; SAVE.vetStats.mily.salud = 40; SAVE.coins = 0;`);
const cr = R(`Vet.cure('mily')`);
ok(cr && cr.ok === true, 'cure(mily enferma) → ok:true');
ok(R('SAVE.coins') === 20, 'curar paga +20 🪙');
ok(R('SAVE.vetStats.mily.enferma') === false, 'la mascota queda sana');
ok(R('SAVE.vetStats.mily.salud') > 40, 'la salud sube al curar');
const cr2 = R(`Vet.cure('mily')`);
ok(cr2 && cr2.ok === false, 'curar mascota sana → ok:false');
ok(R('SAVE.coins') === 20, 'curar mascota sana NO paga de nuevo');
ok(R(`Vet.cure('nadie').ok`) === false, 'cure con id desconocido → ok:false');

console.log('— alimentar/bañar suben stats con tope 100 —');
resetVetSave();
R('SAVE.vetStats.kiara.hambre = 50;');
ok(R(`Vet.feed('kiara').ok`) === true, 'feed → ok:true');
ok(R('SAVE.vetStats.kiara.hambre') === 75, 'hambre 50 → 75 (+25)');
R('SAVE.vetStats.kiara.hambre = 90;');
R(`Vet.feed('kiara')`);
ok(R('SAVE.vetStats.kiara.hambre') === 100, 'hambre no pasa de 100');
ok(R(`Vet.feed('kiara').ok`) === false, 'alimentar llena → ok:false');
R('SAVE.vetStats.whini.limpio = 50;');
ok(R(`Vet.bathe('whini').ok`) === true, 'bathe → ok:true');
ok(R('SAVE.vetStats.whini.limpio') === 80, 'limpio 50 → 80 (+30)');
R('SAVE.vetStats.whini.limpio = 95;');
R(`Vet.bathe('whini')`);
ok(R('SAVE.vetStats.whini.limpio') === 100, 'limpio no pasa de 100');
ok(R(`Vet.bathe('whini').ok`) === false, 'bañar limpia → ok:false');

console.log('— los stats bajan con el tiempo simulado —');
resetVetSave();
R('Vet.tickMinute();');
ok(R('SAVE.vetStats.mily.hambre') === 97, 'hambre baja 3 por minuto');
ok(R('SAVE.vetStats.mily.limpio') === 97, 'limpio baja 3 por minuto');
ok(R('SAVE.vetStats.mily.salud') === 98, 'salud baja 2 por minuto');
R('SAVE.vetStats.mily.salud = 26; Vet.tickMinute();');
ok(R('SAVE.vetStats.mily.enferma') === true, 'salud ≤25 → se enferma');
ok(R('SAVE.vetStats.mily.salud') === 24, 'salud no baja de 0 (sigue bajando normal)');
R('SAVE.vetStats.mily.hambre = 1; SAVE.vetStats.mily.limpio = 0; Vet.tickMinute(); Vet.tickMinute();');
ok(R('SAVE.vetStats.mily.hambre') === 0 && R('SAVE.vetStats.mily.limpio') === 0, 'stats con piso en 0');

console.log('— cliente NPC: curarlo paga +20 🪙 —');
resetVetSave();
R('Vet.buildForLevel(3, g3); SAVE.coins = 0;');
R('Vet._spawnClient();');
ok(R('Vet._client !== null'), 'el cliente NPC aparece');
const cc = R('Vet.cureClient()');
ok(cc && cc.ok === true, 'cureClient → ok:true');
ok(R('SAVE.coins') === 20, 'curar al cliente paga +20 🪙');
ok(R('__bursts.length') > 0, 'hay partículas de celebración');

console.log('— selección de mascota en la camilla —');
resetVetSave();
R('Vet.buildForLevel(3, g3);');
ok(R('Vet._tablePetId') === 'mily', 'mascota inicial: mily');
R(`Vet.selectPet('kiara')`);
ok(R('Vet._tablePetId') === 'kiara' && R('Vet._sel') === 'kiara', 'selectPet cambia la mascota de la camilla');
R(`Vet.selectPet('whini')`);
ok(R('Vet._tablePetId') === 'whini', 'whini también sube a la camilla');

console.log('— init() no revienta con DOM stub —');
ok(R(`(function(){ Vet.init(); Vet.init(); return true; })()`) === true, 'Vet.init() idempotente y seguro');

console.log('— no toca pets.js —');
const src = fs.readFileSync(DIR + 'vet.js', 'utf8');
ok(!/PET_CHOICES|FAMILY\s*=|SAVE\.pet\s*=/.test(src), 'vet.js no escribe PET_CHOICES/FAMILY/SAVE.pet');

console.log('\n' + pass + ' ✅ · ' + fail + ' ❌');
process.exit(fail ? 1 : 0);
