/* Prueba de lots.js (lotes en venta estilo Bloxburg) + modo lote de BuildMode:
   carga, API pública, datos de lotes, compra (con/sin monedas, sin doble cobro),
   persistencia en SAVE.lots, guardado y reconstrucción de bloques con colisión,
   restricción al rectángulo del lote y tope de 400 bloques.
   Sigue el patrón de buildtest.js (stubs THREE/DOM). */
const fs = require('fs'), vm = require('vm');
require(__dirname + '/stubs.js');
const DIR = '/home/hatch/workspace/your_files/obby-3d/';
const FILES = ['state.js', 'buildmode.js', 'lots.js'];
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

/* ================= datos ================= */
ok(R(`typeof LotSystem==='object'`), 'api: LotSystem existe');
ok(R(`typeof LotSystem.buildForLevel==='function' && typeof LotSystem.update==='function'`), 'api: buildForLevel/update existen');
ok(R(`typeof LotSystem.buyLot==='function' && typeof LotSystem.isOwned==='function'`), 'api: buyLot/isOwned existen');
ok(R(`typeof BuildMode.openOnLot==='function' && typeof BuildMode.saveLot==='function'`), 'api: openOnLot/saveLot existen');
ok(R(`LotSystem.lotsFor(3).length`) === 3, 'datos: 3 lotes en Immokalee (idx 3)');
ok(R(`LotSystem.lotsFor(0).length`) === 2, 'datos: 2 lotes en Ciudad Neón (idx 0)');
ok(R(`JSON.stringify(LotSystem.lotsFor(3).map(l=>l.price))`) === '[400,700,1200]', 'datos: precios 400/700/1200 en Immokalee');
ok(R(`LotSystem.lotsFor(3).every(l=>l.id&&l.x!=null&&l.z!=null&&l.w&&l.d&&l.price&&l.name) &&
      LotSystem.lotsFor(0).every(l=>l.id&&l.x!=null&&l.z!=null&&l.w&&l.d&&l.price&&l.name)`),
  'datos: cada lote tiene {id,x,z,w,d,price,name}');

/* ================= compra ================= */
// con monedas suficientes
R(`SAVE.coins=1000; SAVE.lots={}; LotSystem.buyLot(3, LotSystem.LOTS[3][0]);`);
ok(R(`SAVE.coins`) === 600, 'compra: descuenta 400 de 1000 → 600');
ok(R(`LotSystem.isOwned(3,'immo-1')`) === true, 'compra: el lote queda marcado como propio');
ok(R(`Array.isArray(SAVE.lots[3]['immo-1'].blocks)`) === true, 'compra: crea registro con blocks:[]');
// sin doble cobro
R(`LotSystem.buyLot(3, LotSystem.LOTS[3][0]);`);
ok(R(`SAVE.coins`) === 600, 'compra: segunda compra no cobra de nuevo');
// sin monedas
R(`SAVE.coins=100; LotSystem.buyLot(3, LotSystem.LOTS[3][1]);`);
ok(R(`LotSystem.isOwned(3,'immo-2')`) === false, 'compra: sin monedas no se compra');
ok(R(`SAVE.coins`) === 100, 'compra: sin monedas no descuenta nada');

/* ================= construcción en el lote ================= */
R(`LEVEL={idx:3,group:new THREE.Group(),platforms:[]}; MODE='play'; Player={pos:{x:65,y:0,z:-90}};`);
R(`SAVE.coins=1000; SAVE.lots={}; LotSystem.buyLot(3, LotSystem.LOTS[3][0]);`);
ok(R(`BuildMode.openOnLot(3, LotSystem.LOTS[3][0])`) === true, 'lote: openOnLot abre sobre el mundo vivo');
ok(R(`MODE`) === 'build', 'lote: MODE=build al editar el lote');
ok(R(`LEVEL.group.visible`) === true, 'lote: LEVEL.group sigue visible (no se descarga el mundo)');
// colocar bloques dentro del lote
R(`BuildMode.placeBlock('cube','#ff9d00', 65,0,-90,0); BuildMode.placeBlock('ramp','#00a2ff', 66,0,-89,1);`);
ok(R(`BuildMode.blocks.length`) === 2, 'lote: 2 bloques colocados');
// 🔒 fuera del rectángulo → se restringe al borde del lote
R(`BuildMode.placeBlock('cube','#ff2fd6', 200,0,200,0);`);
const last = R(`const b=BuildMode.blocks[2]; [b.x,b.z];`);
ok(last[0] === 74 && last[1] === -83,
  'lote: bloque fuera del lote queda restringido al rectángulo (74,-83), no en (200,200)');
R(`BuildMode.saveLot(true);`);
ok(R(`SAVE.lots[3]['immo-1'].blocks.length`) === 3, 'lote: saveLot guarda 3 bloques en SAVE.lots (no en SAVE.builds)');
ok(R(`SAVE.builds.filter(Boolean).length`) === 0 && JSON.stringify(R(`SAVE.builds`)).indexOf('immo-1') < 0,
  'lote: SAVE.builds no recibe bloques del lote (slots vacíos, sandbox intacto)');
R(`BuildMode.close();`);
ok(R(`MODE`) === 'play', 'lote: al cerrar vuelve a MODE=play (no al menú)');
ok(R(`LEVEL.group.children.filter(o=>o.userData&&o.userData.lotBlock==='immo-1').length`) === 3,
  'lote: los bloques quedan visibles en LEVEL.group al salir');
ok(R(`LEVEL.platforms.filter(p=>p.lotTag==='3:immo-1').length`) === 3,
  'lote: 3 colisionadores registrados al salir (syncLotColliders)');
// sin duplicar colliders al sincronizar de nuevo
R(`LotSystem.syncLotColliders(3,'immo-1'); LotSystem.syncLotColliders(3,'immo-1');`);
ok(R(`LEVEL.platforms.filter(p=>p.lotTag==='3:immo-1').length`) === 3, 'lote: syncLotColliders no duplica colisionadores');

/* ================= reconstrucción al cargar el nivel ================= */
R(`LEVEL={idx:3,group:new THREE.Group(),platforms:[]}; LotSystem.buildForLevel(3, LEVEL.group);`);
ok(R(`LEVEL.group.children.filter(o=>o.userData&&o.userData.lotBlock==='immo-1').length`) === 3,
  'nivel: buildForLevel reconstruye los 3 bloques del lote comprado');
ok(R(`LEVEL.platforms.filter(p=>p.lotTag==='3:immo-1').length`) === 3,
  'nivel: buildForLevel registra 3 colisionadores del lote');
ok(R(`LEVEL.platforms.filter(p=>p.lotTag==='3:immo-1').every(p=>p.topY!=null&&p.solid!==false)`),
  'nivel: los colisionadores tienen topY y son sólidos');
// lote no comprado no deja bloques
ok(R(`LEVEL.group.children.filter(o=>o.userData&&o.userData.lotBlock==='immo-2').length`) === 0,
  'nivel: lote en venta no reconstruye bloques');
// colisión útil: el topY del primer bloque (y=0) es 1 → el jugador se sube
ok(R(`LEVEL.platforms.filter(p=>p.lotTag==='3:immo-1'&&p.topY===1).length`) >= 1,
  'nivel: collider topY=1 para bloque en el suelo (se puede pisar)');

/* ================= tope de 400 bloques ================= */
R(`LEVEL={idx:3,group:new THREE.Group(),platforms:[]}; MODE='play'; Player={pos:{x:65,y:0,z:-90}};`);
R(`BuildMode.openOnLot(3, LotSystem.LOTS[3][0]);`);
R(`for(let i=0;i<450;i++) BuildMode.placeBlock('cube','#ff9d00', 60+(i%20),0,-96+((i/20)|0),0);`);
ok(R(`BuildMode.blocks.length`) === 400, 'lote: tope de 400 bloques');
R(`BuildMode.close();`);
ok(R(`SAVE.lots[3]['immo-1'].blocks.length`) === 400, 'lote: SAVE.lots guarda máximo 400 bloques');

/* ================= señalización y cercas ================= */
R(`LEVEL={idx:3,group:new THREE.Group(),platforms:[]}; LotSystem.buildForLevel(3, LEVEL.group);`);
ok(R(`Object.keys(LotSystem._signs).length`) === 3, 'lote: 3 letreros/cercas construidos en Immokalee');
R(`LEVEL={idx:0,group:new THREE.Group(),platforms:[]}; LotSystem.buildForLevel(0, LEVEL.group);`);
ok(R(`Object.keys(LotSystem._signs).length`) === 2, 'lote: 2 letreros/cercas construidos en Ciudad Neón');
R(`LEVEL={idx:5,group:new THREE.Group(),platforms:[]}; LotSystem.buildForLevel(5, LEVEL.group);`);
ok(R(`Object.keys(LotSystem._signs).length`) === 0, 'lote: mundo sin lotes no construye nada');

console.log('\nlotstest: ' + pass + ' OK, ' + fail + ' fallidas');
process.exit(fail ? 1 : 0);
