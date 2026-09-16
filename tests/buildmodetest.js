/* Prueba del MODO CONSTRUIR enriquecido (buildmode.js):
   8 formas · 7 materiales · 8 objetos · tutorial · ghost preview ·
   save/load con material+forma+objeto · tope bmMax respetado.
   Patrón vm+stubs como los demás tests. */
const fs = require('fs'), vm = require('vm');
require(__dirname + '/stubs.js');
const DIR = '/home/hatch/workspace/your_files/obby-3d/';
const FILES = ['state.js', 'buildmode.js'];
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

/* (a) ≥8 formas */
ok(R(`BM_SHAPES.length`) >= 8, 'formas: ≥8 (' + R(`BM_SHAPES.length`) + ')');
['cube', 'ramp', 'cyl', 'sph', 'stair', 'arch', 'wedge', 'slab'].forEach(id => {
  ok(R(`BM_SHAPES.some(s=>s.id==='${id}')`), 'formas: existe ' + id);
});
ok(R(`Object.keys(BM_SHAPE_DEFS).length`) >= 8, 'formas: defs de posición para todas');

/* (b) ≥7 materiales */
ok(R(`BM_MATS.length`) >= 7, 'materiales: ≥7 (' + R(`BM_MATS.length`) + ')');
['candy', 'brick', 'wood', 'glass', 'metal', 'stone', 'grass'].forEach(id => {
  ok(R(`BM_MATS.some(m=>m.id==='${id}')`), 'materiales: existe ' + id);
});
ok(R(`typeof bmMatFor==='function'`), 'materiales: bmMatFor existe');
ok(R(`bmMatFor('brick','#ff5e8a')===bmMatFor('brick','#ff5e8a')`), 'materiales: caché reutiliza (mat,color)');
ok(R(`bmMatFor('brick','#ff5e8a')!==bmMatFor('wood','#ff5e8a')`), 'materiales: distinto material = distinto objeto');
ok(R(`bmMatFor('glass','#00a2ff').transparent===true`), 'materiales: vidrio semitransparente');
ok(R(`typeof bmTexture==='function' && bmTexture('brick')!==undefined`), 'materiales: textura procedural brick');

/* (c) ≥8 objetos */
ok(R(`BM_OBJECTS.length`) >= 8, 'objetos: ≥8 (' + R(`BM_OBJECTS.length`) + ')');
['tree', 'flower', 'lamp', 'chair', 'table', 'fence', 'rock', 'post'].forEach(id => {
  ok(R(`BM_OBJECTS.some(o=>o.id==='${id}')`), 'objetos: existe ' + id);
});
ok(R(`BM_TOOLS.some(t=>t.id==='object')`), 'herramientas: existe Objetos 🪑');
R(`BuildMode.placeBlock('cube','#ff5e8a',0,0,0,0,'candy','tree',true);`);
ok(R(`BuildMode.blocks.length`) === 1, 'objetos: se colocan y cuentan en el tope');
ok(R(`BuildMode.blocks[0].o`) === 'tree', 'objetos: se guarda el id del objeto');
ok(R(`BuildMode.blocks[0].mesh.children.length`) >= 2, 'objetos: árbol tiene varias piezas');
R(`BuildMode.clearBlocks();`);

/* (d) ghost preview + tutorial */
ok(R(`typeof BuildMode._ensureGhost==='function' && typeof BuildMode._moveGhost==='function' && typeof BuildMode._hideGhost==='function'`),
  'ghost: funciones existen');
R(`const _g = BuildMode._ensureGhost();`);
ok(R(`_g && _g.visible===false`), 'ghost: creado oculto');
ok(R(`_g.children.length`) === 2, 'ghost: bloque + sombra suave');
ok(R(`typeof BuildMode.showTutorial==='function' && typeof BuildMode.maybeTutorial==='function'`),
  'tutorial: funciones existen');
R(`BuildMode.init();`);
ok(R(`!!BuildMode.ui.tut`), 'tutorial: overlay creado en init');
ok(R(`BuildMode.ui.tut.innerHTML`).indexOf('¡Entendido!') !== -1, 'tutorial: botón ¡Entendido!');
ok(R(`BuildMode.ui.tut.innerHTML`).indexOf('Toca el suelo') !== -1, 'tutorial: paso 1 (tocar suelo)');
ok(R(`BuildMode.ui.tut.innerHTML`).indexOf('Pincel') !== -1, 'tutorial: paso 2 (pincel)');
ok(R(`BuildMode.ui.tut.innerHTML`).indexOf('Goma') !== -1, 'tutorial: paso 3 (goma)');
ok(R(`!!BuildMode.ui.rowMat && !!BuildMode.ui.rowObj`), 'ui: filas Material y Objetos existen');

/* (e) save/load conserva material + forma + objeto */
R(`BuildMode.clearBlocks();`);
R(`BuildMode.placeBlock('stair','#ff9d00',1,0,0,1,'brick',null,true);`);
R(`BuildMode.placeBlock('wedge','#00a2ff',2,0,0,0,'glass',null,true);`);
R(`BuildMode.placeBlock('cube','#59d867',3,0,0,0,'wood','lamp',true);`);
R(`BuildMode.curName='Test Mats'; BuildMode.saveSlot(1);`);
R(`BuildMode.clearBlocks();`);
ok(R(`BuildMode.blocks.length`) === 0, 'save/load: limpiar vacía');
R(`BuildMode.loadSlot(1);`);
ok(R(`BuildMode.blocks.length`) === 3, 'save/load: recupera 3');
ok(R(`BuildMode.blocks[0].s`) === 'stair' && R(`BuildMode.blocks[0].m`) === 'brick', 'save/load: escalera de ladrillo');
ok(R(`BuildMode.blocks[1].s`) === 'wedge' && R(`BuildMode.blocks[1].m`) === 'glass', 'save/load: cuña de vidrio');
ok(R(`BuildMode.blocks[2].o`) === 'lamp' && R(`BuildMode.blocks[2].m`) === 'wood', 'save/load: lámpara (objeto)');
R(`BuildMode.deleteSlot(1);`);

/* formas nuevas: posicionamiento */
R(`BuildMode.clearBlocks();`);
R(`BuildMode.placeBlock('slab','#ffffff',0,0,0,0,'candy',null,true);`);
ok(R(`Math.abs(BuildMode.blocks[0].mesh.position.y-0.125)`) < 0.001, 'losa: altura 0.125');
R(`BuildMode.placeBlock('arch','#ffffff',1,0,0,0,'stone',null,true);`);
ok(R(`BuildMode.blocks[1].mesh.children.length`) === 3, 'arco: 3 piezas (2 pilares + viga)');
R(`BuildMode.clearBlocks();`);

/* (f) tope bmMax() respetado (con objetos incluidos) */
ok(R(`typeof bmMax==='function' && bmMax()`) >= 400, 'tope: bmMax() ≥400 (' + R(`bmMax()`) + ')');
R(`for(let i=0;i<400;i++) BuildMode.placeBlock(i%2?'cube':'slab','#ffffff',(i%30)-15,0,((i/30)|0)-15,0,'stone',i%9===0?'rock':null,true);`);
ok(R(`BuildMode.blocks.length`) === R(`bmMax()`), 'tope: no pasa de bmMax()');
ok(R(`BuildMode.placeBlock('cube','#ffffff',0,5,0,0,'candy',null,true)`) === false, 'tope: el siguiente se rechaza');
R(`BuildMode.clearBlocks();`);

/* (g) 📋 copiar taller → lote: un toque, sin preguntas */
R(`SAVE.builds=[
 {name:'Vieja',ts:1000,blocks:[{s:'cube',c:'#ff0000',m:'candy',o:null,x:0,y:0,z:0,r:0}]},
 {name:'Nueva',ts:2000,blocks:[{s:'cube',c:'#00ff00',m:'brick',o:null,x:0,y:0,z:0,r:0},{s:'cube',c:'#00ff00',m:'brick',o:null,x:2,y:1,z:0,r:2}]},
 null,null,null];`);
R(`BuildMode._lot={lot:{id:'t1',x:50,z:60,w:21,d:21,groundY:0}};`);
R(`BuildMode.blocks=[];`);
R(`var _pl=BuildMode._stampPlan(BuildMode._slots()[1].blocks, BuildMode._lotRect());`);
ok(R(`_pl.length`) === 2, 'copiar: entran los 2 bloques');
ok(R(`_pl[0].x`) >= 39.5 && R(`_pl[1].x`) <= 59.5, 'copiar: centrados dentro del lote');
ok(R(`_pl[1].b.y`) === 1 && R(`_pl[1].b.r`) === 2 && R(`_pl[1].b.m`) === 'brick', 'copiar: conserva altura, giro y material');
R(`var _big=[]; for(var i=0;i<30;i++) _big.push({s:'cube',c:'#fff',m:'candy',o:null,x:i,y:0,z:0,r:0});`);
R(`var _pl2=BuildMode._stampPlan(_big, BuildMode._lotRect());`);
ok(R(`_pl2.length`) < 30 && R(`_pl2.length`) > 0, 'copiar: lo que no cabe se omite sin romper');
ok(R(`_pl2.every(p=>p.x>=39.5&&p.x<=59.5)`), 'copiar: todo lo copiado queda dentro del lote');
ok(R(`BuildMode._stampPlan([], BuildMode._lotRect()).length`) === 0, 'copiar: vacio → plan vacio');
R(`var _ok=BuildMode.copyBestToLot();`);
ok(R(`_ok`) === true, 'copiar: copyBestToLot OK');
ok(R(`BuildMode.blocks.length`) === 2, 'copiar: coloca 2 bloques en el lote');
ok(R(`BuildMode.blocks[0].c`) === '#00ff00', 'copiar: usa el guardado mas reciente');
R(`SAVE.builds=[null,null,null,null,null]; BuildMode.blocks=[];`);
ok(R(`BuildMode.copyBestToLot()`) === false, 'copiar: sin guardados avisa y no hace nada');
ok(R(`BuildMode.blocks.length`) === 0, 'copiar: sin guardados no coloca nada');
R(`BuildMode._lot=null; BuildMode.blocks=[];`);

console.log('\n' + pass + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
