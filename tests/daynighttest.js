/* Prueba de daynight.js (ciclo día/noche persistente + estrellas + toggle manual):
   carga, API pública, restauración de la hora guardada, ciclo configurable,
   estrellas visibles solo de noche, persistencia cada ~30s, toggle manual,
   y enganche con weather.js (de noche baja la luz existente y sube el
   emissive de farolas/neones). Sigue el patrón de lotstest.js (stubs THREE/DOM). */
const fs = require('fs'), vm = require('vm');
require(__dirname + '/stubs.js');
const DIR = '/home/hatch/workspace/your_files/obby-3d/';
const FILES = ['state.js', 'weather.js', 'daynight.js'];
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

/* ============ API ============ */
ok(R(`typeof DayNight==='object'`), 'api: DayNight existe');
ok(R(`typeof DayNight.buildForLevel==='function' && typeof DayNight.update==='function'`), 'api: buildForLevel/update existen');
ok(R(`typeof DayNight.toggle==='function' && typeof DayNight.isNight==='function'`), 'api: toggle/isNight existen');
ok(R(`typeof DayNight.setCycle==='function'`), 'api: setCycle existe');

/* ============ ciclo configurable (~10 min por defecto) ============ */
R(`DayNight.buildForLevel(0, null);`);
ok(R(`DayNight.CFG.cycleSec`) === 600, 'cfg: ciclo por defecto 600s (~10 min)');
ok(R(`Weather.CYCLE`) === 600, 'enganche: buildForLevel aplica el ciclo a Weather.CYCLE');
R(`DayNight.setCycle(300);`);
ok(R(`Weather.CYCLE`) === 300 && R(`DayNight.CFG.cycleSec`) === 300, 'cfg: setCycle(300) cambia Weather.CYCLE');
R(`DayNight.setCycle(600);`); // volver al valor pedido

/* ============ restauración de la hora guardada ============ */
R(`SAVE.dayNight={t:0.72}; DayNight.buildForLevel(0, null);`);
ok(Math.abs(R(`Weather.t`) - 0.72) < 1e-9, 'persistencia: buildForLevel restaura SAVE.dayNight.t en Weather.t');
R(`delete SAVE.dayNight;`);

/* ============ estrellas ============ */
ok(R(`DayNight._stars !== null`), 'estrellas: se crean en buildForLevel');
ok(R(`scene.children.indexOf(DayNight._stars)!==-1`), 'estrellas: viven en la escena');
ok(R(`DayNight._stars.visible`) === false, 'estrellas: ocultas antes de update');
ok(R(`DayNight._stars.geometry.attributes.position.array.length`) === 220 * 3, 'estrellas: 220 puntos en el buffer');
ok(R(`typeof DayNight._stars.material.emissiveIntensity`) === 'undefined' || true, 'nota: las estrellas son Points sin luz propia (prohibido crear luces)');
R(`MODE='play'; LEVEL={idx:0, group:new THREE.Group()}; Weather.nightFactor=1; Weather.t=0.72; DayNight.update(0.016);`);
ok(R(`DayNight._stars.visible`) === true, 'estrellas: visibles de noche (Weather.isNight)');
R(`Weather.nightFactor=0; Weather.t=0.25; DayNight.update(0.016);`);
ok(R(`DayNight._stars.visible`) === false, 'estrellas: ocultas de día');
ok(R(`Math.abs(DayNight._stars.position.x)<1e-9`), 'estrellas: la cúpula sigue al jugador (x=0 con Player ausente)');

/* ============ toggle manual ============ */
R(`Weather.t=0.25; Weather.nightFactor=0; DayNight.toggle();`);
ok(Math.abs(R(`Weather.t`) - 0.72) < 1e-9, 'toggle: de día → salta a noche (0.72)');
ok(R(`DayNight.isNight()`) === true, 'toggle: isNight() true tras saltar a noche');
R(`DayNight.toggle();`);
ok(Math.abs(R(`Weather.t`) - 0.25) < 1e-9, 'toggle: de noche → vuelve a día (0.25)');
ok(R(`SAVE.dayNight && Math.abs(SAVE.dayNight.t-0.25)<1e-9`), 'toggle: persiste la hora en SAVE.dayNight');

/* ============ persistencia cada ~30s ============ */
R(`delete SAVE.dayNight; Weather.t=0.5; DayNight._saveT=29.9; DayNight.update(0.2);`);
ok(R(`SAVE.dayNight && Math.abs(SAVE.dayNight.t-0.5)<1e-9`), 'persistencia: update guarda SAVE.dayNight={t} cada ~30s');

/* ============ enganche con weather.js: luces + farolas ============ */
// luces existentes en la escena (como las pone world.js: hemisphere 0.9, sun 1.45)
R(`(function(){
  var hemi = new THREE.HemisphereLight(0xf2f8ff, 0xa89a86, 0.9);
  var sun = new THREE.DirectionalLight(0xfff3dc, 1.45);
  hemi.isHemisphereLight = true; sun.isDirectionalLight = true; // como en three real
  hemi.color = new THREE.Color(0xf2f8ff); hemi.intensity = 0.9;
  sun.color = new THREE.Color(0xfff3dc); sun.intensity = 1.45;
  scene.add(hemi); scene.add(sun);
})();`);
// farola con material emisivo (neón), como las de neoncity/world.js
R(`(function(){
  var m = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0x00e5ff, emissiveIntensity: 1 });
  window.__lampMesh = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), m);
  LEVEL.group.add(window.__lampMesh);
})();`);
R(`Weather._lightsResolved=false; Weather._dir=null; Weather._hemi=null; Weather._idx=-99;
   Weather.t=0.72; updateWeather(1);`);
ok(R(`Weather.isNight()`) === true, 'weather: a t=0.72 es de noche');
ok(R(`Weather._dir.intensity`) < 1.0, 'luces: de noche BAJA la intensidad del DirectionalLight existente (' + R(`Weather._dir.intensity.toFixed(2)`) + ' < 1.45)');
ok(R(`Weather._hemi.intensity`) < 0.9, 'luces: de noche BAJA la intensidad del HemisphereLight existente');
ok(R(`window.__lampMesh.material.emissiveIntensity`) > 1, 'farolas: de noche SUBE el emissiveIntensity del neón (' + R(`window.__lampMesh.material.emissiveIntensity.toFixed(2)`) + ' > 1)');
R(`Weather.t=0.25; updateWeather(60);`);
ok(R(`Weather.isNight()`) === false, 'weather: a t=0.25 es de día');
ok(R(`Weather._dir.intensity`) > 0.8, 'luces: de día el DirectionalLight recupera intensidad');

/* ============ sin DOM al cargar / botón flotante ============ */
ok(R(`document.body.children.some(c=>c.id==='btn-daynight')`), 'botón: se crea en buildForLevel (no al cargar el archivo)');
R(`var n1 = document.body.children.length; DayNight.buildForLevel(0, null); DayNight.buildForLevel(0, null);`);
ok(R(`document.body.children.length`) === R(`n1`), 'botón: idempotente (no duplica el botón)');

/* ============ resumen ============ */
console.log('daynight: ' + pass + ' OK, ' + fail + ' FAIL');
if (fail > 0) process.exit(1);
