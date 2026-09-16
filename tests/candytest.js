/* Smoke test del módulo Candy (colores caramelo): carga, luces, saturación,
   conversión de materiales, cachés de box(), sign() y css(). */
const fs = require('fs'), vm = require('vm');
require(__dirname + '/stubs.js');
const DIR = '/home/hatch/workspace/your_files/obby-3d/';
try {
  vm.runInContext(fs.readFileSync(DIR + 'candy.js', 'utf8'), sandbox, { filename: 'candy.js' });
} catch (e) {
  console.log('  ✗ ERROR cargando candy.js: ' + e.message);
  process.exit(1);
}
console.log('carga: candy.js sin errores');

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; } else { fail++; console.log('  ✗ FAIL:', name); }
}

/* API pública */
ok(R(`typeof Candy !== 'undefined'`), 'Candy global existe');
ok(R(`['init','apply','box','sign','css','saturate'].every(k => typeof Candy[k] === 'function')`),
   'Candy expone init/apply/box/sign/css/saturate');
ok(R(`(function(){ Candy.init(); return true; })()`), 'init no ejecuta DOM ni lanza errores');

/* saturación: grises y primarios intactos, pastel más saturado */
ok(R(`Candy.saturate(0x808080, 0.35) === 0x808080`), 'saturate: gris queda gris');
ok(R(`Candy.saturate(0xff0000, 0.35) === 0xff0000`), 'saturate: rojo puro no cambia');
function satOf(hex) { // saturación HSL calculada en el test (independiente del módulo)
  const r = ((hex >> 16) & 255) / 255, g = ((hex >> 8) & 255) / 255, b = (hex & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return 0;
  const d = mx - mn;
  return l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
}
const pastel = 0xd98c8c, pastelSat = R(`Candy.saturate(${pastel}, 0.35)`);
ok(satOf(pastelSat) > satOf(pastel) + 0.1, 'saturate: pastel sube ~35% de saturación');
ok(R(`Candy.saturate('no-num') === 0xffffff`), 'saturate: entrada inválida → blanco seguro');

/* luces: intensifica existentes, idempotente, agrega propias si no hay */
R(`scene.children.length = 0;
   const L1 = new THREE.HemisphereLight(0xffffff, 0x000000, 1); scene.add(L1);
   globalThis.__L1 = L1;`);
R(`Candy.init()`);
ok(R(`__L1.intensity > 1`), 'init: intensifica la luz existente');
const nLights = R(`scene.children.length`);
R(`Candy.init()`);
ok(R(`scene.children.length === ${nLights} && __L1.intensity > 1`), 'init: idempotente (no duplica ni re-sube)');
R(`scene.children.length = 0; Candy.init()`);
ok(R(`scene.children.length === 2`), 'init: sin luces agrega 2 propias');
R(`Candy.init()`);
ok(R(`scene.children.length === 2`), 'init: no duplica sus propias luces');
R(`scene.children.length = 0`); // dejar escena limpia

/* apply: convierte Standard/Lambert, respeta noCandy y Basic */
R(`
  const grp = new THREE.Group();
  const mStd = new THREE.MeshStandardMaterial({ color: 0xd98c8c }); mStd.isMeshStandardMaterial = true;
  const mLam = new THREE.MeshLambertMaterial({ color: 0x88bb66 }); mLam.isMeshLambertMaterial = true;
  const mBas = new THREE.MeshBasicMaterial({ color: 0x00ff00 }); mBas.isMeshBasicMaterial = true;
  const mNo  = new THREE.MeshStandardMaterial({ color: 0x0000ff }); mNo.isMeshStandardMaterial = true;
  mNo.userData = { noCandy: true };
  const a = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), mStd);
  const b = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), mLam);
  const c = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), mBas);
  const d = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), mNo);
  grp.add(a); grp.add(b); grp.add(c); grp.add(d);
  globalThis.__t = { grp, a, b, c, d, mStd, mLam, mBas, mNo, n: Candy.apply(grp) };
`);
ok(R(`__t.n === 2`), 'apply: convierte 2 materiales (Standard+Lambert)');
ok(R(`__t.a.material !== __t.mStd && __t.a.material.userData.candy === true`), 'apply: Standard → Phong caramelo marcado');
ok(R(`__t.b.material !== __t.mLam && __t.b.material.userData.candy === true`), 'apply: Lambert → Phong caramelo marcado');
ok(R(`__t.c.material === __t.mBas`), 'apply: BasicMaterial no se toca');
ok(R(`__t.d.material === __t.mNo`), 'apply: respeta userData.noCandy');
ok(R(`__t.a.material.shininess >= 80 && __t.a.material.shininess <= 110`), 'apply: shininess en rango glossy 80-110');
const convHex = R(`__t.a.material.color`);
ok(satOf(convHex) >= satOf(0xd98c8c), 'apply: el color convertido está más saturado');
ok(R(`Candy.apply(null) === 0`), 'apply: grupo nulo → 0 sin errores');

/* box: cachés de geometría y material */
ok(R(`(function(){
  const x = Candy.box(1,2,3,0xff0000), y = Candy.box(1,2,3,0x00ff00);
  return x.geometry === y.geometry;
})()`), 'box: misma dimensión → geometría compartida');
ok(R(`(function(){
  const x = Candy.box(1,1,1,0xff0000), y = Candy.box(2,2,2,0xff0000);
  return x.material === y.material;
})()`), 'box: mismo color → material compartido');
ok(R(`(function(){
  const x = Candy.box(1,1,1,0xff0000), y = Candy.box(1,1,1,0x0000ff);
  return x.material !== y.material;
})()`), 'box: distinto color → distinto material');
ok(R(`Candy.box(2,2,2,0xff77aa).userData.candyBox === true`), 'box: mesh marcado candyBox');

/* sign: letrero sin errores, con textura */
ok(R(`(function(){ const s = Candy.sign('HOLA'); return !!s && !!s.material.map && s.userData.isSign === true; })()`),
   'sign: devuelve mesh con CanvasTexture');
ok(R(`(function(){ const s = Candy.sign('L1\\nL2', { w: 8, h: 2, fg: '#ff0000' }); return !!s.material.map; })()`),
   'sign: multilínea + opciones no fallan');

/* css: string con clases caramelo */
const css = R(`Candy.css()`);
ok(typeof css === 'string' && css.indexOf('.candy-btn') >= 0 && css.indexOf('.candy-panel') >= 0 &&
   css.indexOf('.candy-title') >= 0, 'css: devuelve string con .candy-btn/.candy-panel/.candy-title');

console.log(`\nRESULTADO: ${pass} OK, ${fail} FALLOS`);
process.exit(fail ? 1 : 0);
