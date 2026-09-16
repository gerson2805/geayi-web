/* Prueba de 🏠 Mis Lotes: ownedWithBlocks() (lots.js).
   Patrón vm+stubs como los demás tests. */
const fs = require('fs'), vm = require('vm');
require(__dirname + '/stubs.js');
const DIR = '/home/hatch/workspace/your_files/obby-3d/';
const FILES = ['state.js', 'lots.js'];
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

ok(R(`typeof LotSystem==='object' && typeof LotSystem.ownedWithBlocks==='function'`), 'existe LotSystem.ownedWithBlocks');

R(`SAVE.lots={
 "0":{ "neon-1":{name:'Lote Neon',x:1,z:2,w:20,d:16,groundY:0,blocks:[{s:'cube'}],visits:3},
        "neon-2":{name:'Vacio',x:3,z:4,w:20,d:16,groundY:0,blocks:[],visits:0} },
 "3":{ "immo-1":{name:'Lote Sol',x:5,z:6,w:20,d:16,groundY:0,blocks:[{s:'cube'},{s:'cube'}]} } };`);
R(`var _lw=LotSystem.ownedWithBlocks();`);
ok(R(`_lw.length`) === 2, 'solo lotes con bloques (2 de 3)');
ok(R(`_lw.some(l=>l.lotId==='neon-1'&&l.worldIdx===0&&l.n===1&&l.visits===3)`), 'datos del lote: mundo, id, bloques y visitas');
ok(R(`_lw.some(l=>l.lotId==='immo-1'&&l.name==='Lote Sol'&&l.n===2)`), 'segundo lote con nombre y conteo');
ok(!R(`_lw.some(l=>l.lotId==='neon-2')`), 'lote vacio no aparece');

R(`SAVE.lots={};`);
ok(R(`LotSystem.ownedWithBlocks().length`) === 0, 'sin lotes → lista vacia');
ok(R(`typeof LotSystem._updateAdmirers==='function'`), 'existe _updateAdmirers');
ok(R(`typeof LotSystem._admSpawn==='function' && typeof LotSystem._admBubble==='function'`), 'existen _admSpawn y _admBubble');

console.log('\n' + pass + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
