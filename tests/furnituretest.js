/* Prueba de furniture.js (tienda de muebles GEAYI para lotes):
   carga, API pública, catálogo con precios, compra con/sin monedas,
   colocación restringida al lote propio y a sus límites, persistencia y
   reconstrucción, tope de 40, colisionadores registrados (los de volumen
   sí, alfombra/planta/lámpara no), quitar mueble, y sin luces reales.
   Sigue el patrón de lotstest.js (stubs THREE/DOM). */
const fs = require('fs'), vm = require('vm');
require(__dirname + '/stubs.js');
const DIR = '/home/hatch/workspace/your_files/obby-3d/';
const FILES = ['state.js', 'lots.js', 'furniture.js'];
for (const f of FILES) {
  try {
    vm.runInContext(fs.readFileSync(DIR + f, 'utf8'), sandbox, { filename: f });
  } catch (e) {
    console.log('  ✗ ERROR cargando ' + f + ': ' + e.message);
    process.exit(1);
  }
}
console.log('carga: ' + FILES.length + ' archivos sin errores');

/* Shop2 realista (descuenta de SAVE.coins) + captura de toast */
vm.runInContext(
  `var Shop2 = { spendCoins(n){ if ((SAVE.coins||0) < n) return false; SAVE.coins -= n; try { persist(); } catch(e){} return true; },
    coinsText(){ return String(SAVE.coins||0); } };
   var toast = function(m){ globalThis.__toast = m; };
   var Audio2 = { click(){}, win(){} };
   var Particles = { burst(){} };`, sandbox);

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; } else { fail++; console.log('  ✗ FAIL:', name); }
}
const lastToast = () => R(`globalThis.__toast`);

/* ================= API y catálogo ================= */
ok(R(`typeof Furniture==='object'`), 'api: Furniture existe');
ok(R(`typeof Furniture.buildForLevel==='function' && typeof Furniture.update==='function'`), 'api: buildForLevel/update existen');
ok(R(`typeof Furniture.buy==='function' && typeof Furniture.removeNearest==='function'`), 'api: buy/removeNearest existen');
ok(R(`typeof Furniture.openStore==='function' && typeof Furniture.lotAt==='function'`), 'api: openStore/lotAt existen');
ok(R(`Furniture.CATALOG.length`) === 10, 'catálogo: 10 muebles');
ok(R(`Furniture.CATALOG.every(c=>c.id&&c.emoji&&c.name&&c.price>0&&c.w>0&&c.d>0&&c.h>0)`), 'catálogo: cada mueble tiene {id,emoji,name,price,w,d,h}');
ok(R(`JSON.stringify(Furniture.CATALOG.map(c=>c.id))`) ===
  '["bed","sofa","lamp","table","chair","shelf","tv","plant","rug","fridge"]', 'catálogo: los 10 tipos esperados');
ok(R(`Furniture.CATALOG.filter(c=>c.solid).length`) === 7, 'catálogo: 7 muebles con volumen (colisionan)');
ok(R(`['lamp','plant','rug'].every(id=>FURN_DEF[id].solid===false)`), 'catálogo: lámpara, planta y alfombra NO colisionan');
ok(R(`Furniture.MAX_PER_LOT`) === 40, 'catálogo: tope de 40 muebles por lote');

// los 10 constructores generan un Group sin errores
ok(R(`Furniture.CATALOG.every(c=>{ const g=Furniture.buildItem(c.id); return g && g.children && g.children.length>0; })`),
  'builders: los 10 muebles se construyen con hijos');
ok(R(`Furniture.buildItem('noexiste')`) === null, 'builders: tipo inválido → null');
// sin luces reales (solo emissive): el código no debe crear PointLight/SpotLight/DirectionalLight/HemisphereLight
const src = fs.readFileSync(DIR + 'furniture.js', 'utf8');
ok(src.indexOf('PointLight') < 0 && src.indexOf('SpotLight') < 0 &&
   src.indexOf('DirectionalLight') < 0 && src.indexOf('HemisphereLight') < 0,
  'luces: ninguna luz real en furniture.js (solo emissive)');
ok(src.indexOf('document.createElement') > 0 && src.indexOf('typeof document') > 0,
  'DOM: creación de elementos protegida con typeof document');
// rendimiento: geometrías/materiales compartidos
R(`Furniture.buildItem('bed'); Furniture.buildItem('sofa'); Furniture.buildItem('fridge'); Furniture.buildItem('shelf');`);
ok(R(`Furniture._sharedGeoCount()`) <= 6, 'perf: ≤6 geometrías compartidas (caja/cilindro/esfera/pantalla/maceta)');
ok(R(`Furniture._sharedMatCount()`) < 40, 'perf: materiales compartidos en caché');

/* ================= escenario base ================= */
function freshWorld() {
  R(`SAVE.coins=1000; SAVE.lots={};`);
  R(`LEVEL={idx:3,group:new THREE.Group(),platforms:[]}; MODE='play'; Player={pos:{x:65,y:0,z:-90},heading:0};`);
  R(`LotSystem.buyLot(3, LotSystem.LOTS[3][0]);`); // immo-1: (65,-90) w20 d16
  R(`Furniture.buildForLevel(3, LEVEL.group);`);
}
freshWorld();
ok(R(`LotSystem.isOwned(3,'immo-1')`) === true, 'setup: lote immo-1 comprado');
ok(R(`Furniture.lotAt(3,65,-90) && Furniture.lotAt(3,65,-90).def.id`) === 'immo-1', 'lotAt: detecta el lote propio bajo el jugador');
ok(R(`Furniture.lotAt(3,200,200)`) === null, 'lotAt: fuera del lote → null');
R(`SAVE.lots={};`); // quitar la propiedad para probar lote ajeno
ok(R(`Furniture.lotAt(3,65,-90)`) === null, 'lotAt: lote no comprado → null');
freshWorld();

/* ================= compra ================= */
R(`Furniture.buy('chair');`);
ok(R(`SAVE.coins`) === 560, 'compra: silla 40 → descuenta de 600 a 560 (el lote costó 400)');
ok(R(`SAVE.lots[3]['immo-1'].furniture.length`) === 1, 'compra: el mueble queda en SAVE.lots[3][immo-1].furniture');
ok(R(`JSON.stringify(SAVE.lots[3]['immo-1'].furniture[0].type)`) === '"chair"', 'compra: el registro guarda el tipo');
ok(R(`SAVE.lots[3]['immo-1'].furniture[0].x!=null && SAVE.lots[3]['immo-1'].furniture[0].z!=null`), 'compra: el registro guarda x,z,ry');
ok(R(`LEVEL.group.children.filter(o=>o.userData&&o.userData.furnType==='chair').length`) === 1, 'compra: el mesh aparece en LEVEL.group');
ok(R(`LEVEL.platforms.filter(p=>p.kind==='furn').length`) === 1, 'compra: la silla (con volumen) registra colisionador');
ok(R(`LEVEL.platforms.filter(p=>p.kind==='furn').every(p=>p.solid===true&&p.topY!=null)`), 'compra: el colisionador es sólido y tiene topY');

// sin fondos → no compra, mensaje exacto
R(`SAVE.coins=10; Furniture.buy('bed');`);
ok(R(`SAVE.coins`) === 10, 'fondos: sin monedas no descuenta nada');
ok(R(`SAVE.lots[3]['immo-1'].furniture.length`) === 1, 'fondos: sin monedas no agrega mueble');
ok(String(lastToast()).indexOf('🪙 Te faltan monedas') === 0, 'fondos: mensaje "🪙 Te faltan monedas"');

// fuera del lote propio → no coloca
R(`SAVE.coins=1000; Player.pos.x=200; Player.pos.z=200; Furniture.buy('chair');`);
ok(R(`SAVE.coins`) === 1000, 'lote: fuera del lote propio no cobra');
ok(String(lastToast()).indexOf('🏠') === 0, 'lote: fuera del lote propio avisa que entre a su lote');
ok(R(`Object.keys(SAVE.lots[3]).filter(k=>SAVE.lots[3][k].furniture&&SAVE.lots[3][k].furniture.length>1).length`) === 0,
  'lote: no se creó mueble fuera del lote');

/* ================= límites del rectángulo ================= */
freshWorld();
R(`SAVE.coins=5000;`);
// jugador pegado al borde este mirando hacia afuera: el mueble debe quedar DENTRO
R(`Player.pos.x=74.2; Player.pos.z=-90; Player.heading=Math.PI/2; Furniture.buy('bed');`);
const bed = R(`SAVE.lots[3]['immo-1'].furniture[0]`);
ok(bed && bed.x - 2.2 / 2 >= 65 - 10 && bed.x + 2.2 / 2 <= 65 + 10,
  'límites: la cama queda dentro del rectángulo del lote (x∈[55,75]) aunque el jugador mire afuera');
ok(bed && bed.z - 3.4 / 2 >= -90 - 8 && bed.z + 3.4 / 2 <= -90 + 8,
  'límites: la cama queda dentro del rectángulo del lote (z∈[-98,-82])');
// todos los muebles comprados en varias posiciones quedan dentro del lote
R(`for (let a=0; a<8; a++){ Player.pos.x=65+Math.cos(a)*7; Player.pos.z=-90+Math.sin(a)*5; Player.heading=a; Furniture.buy('chair'); }`);
ok(R(`SAVE.lots[3]['immo-1'].furniture.every(f=>f.x>=55.15&&f.x<=74.85&&f.z>=-97.85&&f.z<=-82.15)`),
  'límites: 8 sillas en círculo quedan todas dentro del lote');

/* ================= persistencia y reconstrucción ================= */
R(`LEVEL={idx:3,group:new THREE.Group(),platforms:[]}; Furniture.buildForLevel(3, LEVEL.group);`);
ok(R(`LEVEL.group.children.filter(o=>o.userData&&o.userData.furnType).length`) === 9,
  'nivel: buildForLevel reconstruye los 9 muebles comprados');
ok(R(`LEVEL.platforms.filter(p=>p.kind==='furn').length`) === 9,
  'nivel: buildForLevel registra los 9 colisionadores (todos con volumen)');
// alfombra/planta/lámpara no colisionan
R(`Player.pos.x=65; Player.pos.z=-90; Player.heading=0; Furniture.buy('rug'); Furniture.buy('plant'); Furniture.buy('lamp');`);
ok(R(`LEVEL.platforms.filter(p=>p.kind==='furn').length`) === 9,
  'colisión: alfombra, planta y lámpara NO registran colisionador');
ok(R(`LEVEL.group.children.filter(o=>o.userData&&(o.userData.furnType==='rug'||o.userData.furnType==='plant'||o.userData.furnType==='lamp')).length`) === 3,
  'colisión: alfombra, planta y lámpara SÍ se ven en el mundo');

/* ================= tope de 40 ================= */
freshWorld();
R(`SAVE.coins=99999;`);
R(`for (let i=0;i<45;i++){ Player.pos.x=58+(i%14)*1.1; Player.pos.z=-95+((i/14)|0)*1.1; Player.heading=0; Furniture.buy('chair'); }`);
ok(R(`SAVE.lots[3]['immo-1'].furniture.length`) === 40, 'tope: máximo 40 muebles por lote');
ok(String(lastToast()).indexOf('🧱 Tope de 40') === 0, 'tope: al 41 avisa "🧱 Tope de 40 muebles en este lote"');

/* ================= quitar ================= */
freshWorld();
R(`SAVE.coins=5000; Player.pos.x=65; Player.pos.z=-90; Player.heading=0;`);
R(`Furniture.buy('sofa'); Furniture.buy('fridge');`);
ok(R(`SAVE.lots[3]['immo-1'].furniture.length`) === 2, 'quitar: setup con 2 muebles');
ok(R(`LEVEL.platforms.filter(p=>p.kind==='furn').length`) === 2, 'quitar: 2 colisionadores antes de quitar');
// el jugador se para junto al sofá (se colocó 2.4u al frente, en (65,-87.6))
R(`Player.pos.x=65; Player.pos.z=-87.6; Furniture.removeNearest();`);
ok(R(`SAVE.lots[3]['immo-1'].furniture.length`) === 1, 'quitar: elimina 1 mueble del SAVE');
ok(R(`LEVEL.group.children.filter(o=>o.userData&&o.userData.furnType==='sofa').length`) === 0,
  'quitar: el mesh del sofá sale del mundo');
ok(R(`LEVEL.platforms.filter(p=>p.kind==='furn').length`) === 1, 'quitar: su colisionador también se retira');
ok(R(`LEVEL.platforms.filter(p=>p.kind==='furn'&&p.furnTag.indexOf('fridge')>=0).length`) === 1,
  'quitar: el colisionador del refri sigue intacto');
// quitar sin mueble cerca
R(`Player.pos.x=0; Player.pos.z=0; Furniture.removeNearest();`);
ok(String(lastToast()).indexOf('🪑 Acércate') === 0, 'quitar: lejos de todo avisa que se acerque');

/* ================= syncColliders no duplica ================= */
R(`Furniture.syncColliders(3,'immo-1'); Furniture.syncColliders(3,'immo-1');`);
ok(R(`LEVEL.platforms.filter(p=>p.kind==='furn').length`) === 1, 'colliders: syncColliders no duplica');

/* ================= update: botones de proximidad ================= */
freshWorld();
R(`SAVE.coins=5000; Player.pos.x=65; Player.pos.z=-90; Player.heading=0; Furniture.buy('chair');`);
R(`Furniture.update(0.016);`);
ok(R(`Furniture._btns && Furniture._btns.store.style.display`) === 'block', 'update: dentro del lote propio sale el botón 🪑 Mueblería');
R(`Player.pos.x=64.4; Player.pos.z=-89.4; Furniture.update(0.016);`); // junto a la silla
ok(R(`Furniture._btns.rm.style.display`) === 'block', 'update: cerca de un mueble propio sale ❌ Quitar');
R(`MODE='menu'; Furniture.update(0.016);`);
ok(R(`Furniture._btns.store.style.display`) === 'none' && R(`Furniture._btns.rm.style.display`) === 'none',
  'update: fuera de MODE=play los botones se ocultan');
R(`MODE='play'; Player.pos.x=200; Player.pos.z=200; Furniture.update(0.016);`);
ok(R(`Furniture._btns.store.style.display`) === 'none', 'update: fuera del lote no sale el botón de tienda');

/* ================= tienda DOM ================= */
R(`Player.pos.x=65; Player.pos.z=-90; Furniture.openStore();`);
ok(R(`!!document.getElementById('furn-ov')`), 'tienda: openStore crea el overlay');
ok(R(`Furniture._panelOpen`) === true, 'tienda: panel marcado como abierto');
R(`Furniture.closeStore();`);
ok(R(`Furniture._panelOpen`) === false, 'tienda: closeStore cierra el panel');

/* ================= mundo 0 (Ciudad Neón) ================= */
R(`SAVE.coins=2000; SAVE.lots={}; LEVEL={idx:0,group:new THREE.Group(),platforms:[]}; MODE='play'; Player={pos:{x:138,y:0,z:103},heading:0};`);
R(`LotSystem.buyLot(0, LotSystem.LOTS[0][0]);`); // neon-1: (138,103) w26 d20, groundY 0.22
R(`Furniture.buy('fridge');`);
ok(R(`SAVE.lots[0]['neon-1'].furniture.length`) === 1, 'neón: compra en lote de Ciudad Neón');
ok(R(`LEVEL.platforms.filter(p=>p.kind==='furn'&&Math.abs(p.topY-(0.22+2.1))<0.001).length`) === 1,
  'neón: el colisionador respeta groundY 0.22 (topY=2.32)');
R(`LEVEL={idx:0,group:new THREE.Group(),platforms:[]}; Furniture.buildForLevel(0, LEVEL.group);`);
ok(R(`LEVEL.group.children.filter(o=>o.userData&&o.userData.furnType==='fridge').length`) === 1,
  'neón: buildForLevel reconstruye el refri');
// mundo sin lotes no rompe nada
R(`LEVEL={idx:5,group:new THREE.Group(),platforms:[]}; Furniture.buildForLevel(5, LEVEL.group); Furniture.update(0.016);`);
ok(R(`LEVEL.group.children.length`) === 0, 'nivel: mundo sin lotes no construye muebles');

console.log('\nfurnituretest: ' + pass + ' OK, ' + fail + ' fallidas');
process.exit(fail ? 1 : 0);
