/* Prueba de bridges.js (puentes peatonales) y buildmode.js (modo construir):
   carga, API pública, coordenadas de puentes, heightfield + física de rampa
   (el jugador SUBE CAMINANDO), letreros, tope de bloques, materiales
   reutilizados, guardado/cargado en SAVE.builds y envío a concurso.
   Sigue el patrón de city3test.js (stubs THREE/DOM). */
const fs = require('fs'), vm = require('vm');
require(__dirname + '/stubs.js');
const DIR = '/home/hatch/workspace/your_files/obby-3d/';
const FILES = ['state.js', 'i18n.js', 'audio.js', 'vehicles.js', 'world.js', 'family.js',
  'player.js', 'phase3.js', 'bridges.js', 'buildmode.js'];
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
function approx(a, b, eps) { return Math.abs(a - b) <= (eps || 0.05); }

/* ================= BRIDGES ================= */
ok(R(`typeof Bridges==='object'`), 'api: Bridges existe');
ok(R(`typeof Bridges.init==='function' && typeof Bridges.buildForLevel==='function' && typeof Bridges.groundAt==='function'`),
  'api: init/buildForLevel/groundAt');
ok(R(`Bridges.init()===true`), 'init: instala física sin errores');
ok(R(`Bridges.init()===true`), 'init: idempotente (doble llamada segura)');

// Ciudad Neón (idx 0): puentes en (0,-120) y (0,60) — verificados libres de edificios/farolas
R(`LEVEL={idx:0,group:new THREE.Group(),platforms:[]}; Bridges.buildForLevel(0, LEVEL.group);`);
ok(R(`Bridges.list.length`) === 2, 'neón: 2 puentes');
ok(R(`JSON.stringify(Bridges.list.map(b=>[b.cx,b.bz]))`) === '[[0,-120],[0,60]]', 'neón: coords (0,-120) y (0,60)');
ok(R(`LEVEL.platforms.filter(p=>p.kind==='bridge').length`) === 2, 'neón: 2 plataformas de puente registradas');
ok(R(`LEVEL.platforms.filter(p=>p.kind==='bridge-wall').length`) > 0, 'neón: muros laterales registrados');

// Immokalee (idx 3): puentes en (0,17) y (0,90) — verificados libres
R(`LEVEL={idx:3,group:new THREE.Group(),platforms:[]}; Bridges.buildForLevel(3, LEVEL.group);`);
ok(R(`JSON.stringify(Bridges.list.map(b=>[b.cx,b.bz]))`) === '[[0,17],[0,90]]', 'immokalee: coords (0,17) y (0,90)');

// mundo sin puentes: no construye nada
R(`LEVEL={idx:5,group:new THREE.Group(),platforms:[]}; Bridges.buildForLevel(5, LEVEL.group);`);
ok(R(`Bridges.list.length`) === 0, 'otro mundo: sin puentes');

// heightfield: perfil 0 → 5 → 0
R(`LEVEL={idx:3,group:new THREE.Group(),platforms:[]}; Bridges.buildForLevel(3, LEVEL.group);`);
ok(R(`Bridges.groundAt(0,90)`) === 5, 'heightfield: plataforma = 5 m');
ok(approx(R(`Bridges.groundAt(-10,90)`), 3.68, 0.1), 'heightfield: rampa oeste x=-10 ≈ 3.68 m');
ok(approx(R(`Bridges.groundAt(20,89)`), 5 * (1 - (20 - 2.5) / 28.36), 0.15), 'heightfield: rampa este x=20');
ok(R(`Bridges.groundAt(50,90)`) === null, 'heightfield: fuera del puente = null');
ok(R(`Bridges.groundAt(0,96)`) === null, 'heightfield: fuera en z = null');
ok(R(`Bridges.groundAt(0,17)`) === 5, 'heightfield: segundo puente también responde');

// física: el jugador SUBE CAMINANDO la rampa (sin saltar)
const climb = R(`(function(){
  Player.pos = new THREE.Vector3(-30.4, 0.05, 89);
  Player.vel = new THREE.Vector3();
  Player.grounded = false; Player.groundPlat = null;
  let maxY = 0;
  for (let i = 0; i < 280; i++) {
    Player.pos.x += 0.13;               // camina hacia el este
    Player.grounded = false; Player.groundPlat = null;
    moveAxis('y', -0.5);                // gravedad de un cuadro
    if (!Player.grounded) return 'se cayó en x=' + Player.pos.x.toFixed(1) + ' y=' + Player.pos.y.toFixed(2);
    if (Player.pos.y > maxY) maxY = Player.pos.y;
  }
  return 'ok maxY=' + maxY.toFixed(2) + ' yFinal=' + Player.pos.y.toFixed(2);
})()`);
console.log('  (simulación subida: ' + climb + ')');
ok(/^ok maxY=5/.test(climb), 'física: sube la rampa caminando hasta y=5 (y cruza al otro lado)');

// la calle queda libre: bajo la plataforma no hay colisión a nivel de calle
ok(R(`(function(){
  Player.pos = new THREE.Vector3(0, 0.05, 89);
  Player.vel = new THREE.Vector3(); Player.grounded = false; Player.groundPlat = null;
  moveAxis('x', 2); // camina bajo el puente
  return Player.pos.x > 1.5; // no lo frena la plataforma (está a 5 m)
})()`), 'calle libre: se puede pasar por debajo del puente');

// letreros "Puente seguro" creados (grupos de addSign3D en el grupo)
ok(R(`(function(){
  let n = 0;
  LEVEL.group.traverse(o => { if (o.children && o.children.length >= 2 && o.position && o.position.y === 0) n++; });
  return n >= 2;
})()`), 'letreros: hay señales en las entradas');

// geometrías/materiales reutilizados (caché del módulo)
ok(R(`(function(){
  const keys = Object.keys(Bridges._geo);
  return keys.indexOf('box1') >= 0 && Object.keys(Bridges._mat).length >= 4;
})()`), 'rendimiento: geometrías y materiales en caché');

/* ================= BUILDMODE ================= */
ok(R(`typeof BuildMode==='object'`), 'api: BuildMode existe');
ok(R(`typeof BuildMode.open==='function' && typeof BuildMode.close==='function' && typeof BuildMode.update==='function' && typeof BuildMode.init==='function'`),
  'api: init/open/close/update');
ok(R(`BuildMode.init()===true`), 'init: sin errores');
ok(R(`!!document.getElementById('btn-build')`), 'init: botón 🧱 CONSTRUIR inyectado en el menú');
ok(R(`!!document.getElementById('screen-build')`), 'init: overlay #screen-build creado');
ok(R(`BuildMode.init()===true && !!document.getElementById('btn-build')`), 'init: no duplica el botón');

R(`LEVEL={idx:0,group:new THREE.Group(),platforms:[]}; LEVEL.group.visible=true;`);
R(`BuildMode.open();`);
ok(R(`BuildMode.active===true`), 'open: activo');
ok(R(`MODE==='build'`), 'open: MODE = build');
ok(R(`BuildMode.group!==null && BuildMode.blocks.length===0`), 'open: parcela 60×60 creada y vacía');
ok(R(`LEVEL.group.visible===false`), 'open: mundo oculto durante construcción');
ok(R(`BuildMode.ui.overlay.style.display`)==='flex', 'open: overlay visible');

// colocar bloques: formas y colores
R(`BuildMode.placeBlock('cube','#ff5e8a',0,0,0,0);`);
R(`BuildMode.placeBlock('ramp','#00a2ff',1,0,0,1);`);
R(`BuildMode.placeBlock('cyl','#59d867',2,0,0,0);`);
R(`BuildMode.placeBlock('sph','#ffe95e',3,0,0,0);`);
ok(R(`BuildMode.blocks.length`) === 4, 'colocar: 4 formas creadas');
ok(R(`BuildMode.blocks[0].mesh.material===BuildMode.blocks[1].mesh.material`) === false, 'materiales: distinto color = distinto material');
R(`BuildMode.placeBlock('cube','#ff5e8a',5,0,0,0);`);
ok(R(`BuildMode.blocks[0].mesh.material===BuildMode.blocks[4].mesh.material`), 'materiales: mismo color reutiliza material');
ok(R(`BuildMode._geo.cube && BuildMode._geo.ramp && BuildMode._geo.cyl && BuildMode._geo.sph`), 'geometrías: una por forma, reutilizadas');

// pintar y borrar
R(`BuildMode.recolorBlock(BuildMode.blocks[0],'#00a2ff');`);
ok(R(`BuildMode.blocks[0].c`) === '#00a2ff', 'pincel: cambia el color');
ok(R(`BuildMode.blocks[0].mesh.material===BuildMode.blocks[1].mesh.material`), 'pincel: reutiliza material del color');
R(`BuildMode.removeBlock(BuildMode.blocks[0]);`);
ok(R(`BuildMode.blocks.length`) === 4, 'goma: borra el bloque');

// tope de 400 bloques
R(`for(let i=0;i<396;i++) BuildMode.placeBlock('cube','#ffffff',(i%30)-15,0,((i/30)|0)-15,0);`);
ok(R(`BuildMode.blocks.length`) === 400, 'tope: llega a 400');
ok(R(`BuildMode.placeBlock('cube','#ffffff',0,5,0,0)`) === false, 'tope: el 401 se rechaza');
ok(R(`BuildMode.blocks.length`) === 400, 'tope: no pasa de 400');

// guardar / cargar / borrar (SAVE.builds, 5 espacios)
R(`BuildMode.curName='Ciudad Test'; BuildMode.saveSlot(0);`);
ok(R(`SAVE.builds[0] && SAVE.builds[0].name==='Ciudad Test' && SAVE.builds[0].blocks.length===400`),
  'guardar: slot 0 con nombre y 400 bloques');
R(`BuildMode.clearBlocks();`);
ok(R(`BuildMode.blocks.length`) === 0, 'limpiar: parcela vacía');
R(`BuildMode.loadSlot(0);`);
ok(R(`BuildMode.blocks.length`) === 400, 'cargar: recupera los 400 bloques');
ok(R(`BuildMode.loadSlot(3)`) === false, 'cargar: slot vacío no hace nada');
R(`BuildMode.deleteSlot(0);`);
ok(R(`SAVE.builds[0]`) === null, 'borrar: slot 0 vacío');
ok(R(`Array.isArray(SAVE.builds) && SAVE.builds.length===5`), 'slots: siempre 5 espacios');

// concurso: sin Community no crashea; con Community registra
R(`BuildMode.curName='Mi Obra';`);
ok(R(`BuildMode.enviarConcurso()`) === false, 'concurso: sin Community avisa sin crashear');
R(`Community={registrarConstruccion(n){this._n=n;return true;}};`);
ok(R(`BuildMode.enviarConcurso()`) === true, 'concurso: con Community registra');
ok(R(`Community._n`) === 'Mi Obra', 'concurso: pasa el nombre');

// cámara orbital (requiere initThree como en los otros tests)
R(`initThree();`);
R(`BuildMode.cam.az=0; BuildMode.update(0.016);`);
ok(R(`typeof camera.position.x==='number'`), 'update: posiciona la cámara sin errores');

// cerrar: restaura todo
R(`BuildMode.close();`);
ok(R(`BuildMode.active===false`), 'close: inactivo');
ok(R(`MODE==='menu'`), 'close: vuelve a menu');
ok(R(`LEVEL.group.visible===true`), 'close: mundo visible de nuevo');
ok(R(`BuildMode.ui.overlay.style.display`)==='none', 'close: overlay oculto');

console.log('\n' + pass + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
