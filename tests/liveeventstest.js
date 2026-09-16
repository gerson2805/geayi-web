/* Prueba de liveevents.js (eventos en vivo en la plaza de Ciudad Neón):
   carga, API pública, programación/anuncio/inicio/fin del evento,
   integración con Concerts/Fireworks (con y sin ellos),
   recompensa +25🪙 una sola vez por evento estando cerca de la plaza,
   persistencia del último evento. Sigue el patrón de lotstest.js. */
const fs = require('fs'), vm = require('vm');
require(__dirname + '/stubs.js');
const DIR = '/home/hatch/workspace/your_files/obby-3d/';
const FILES = ['state.js', 'liveevents.js'];
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

/* ============ API y datos ============ */
ok(R(`typeof LiveEvents==='object'`), 'api: LiveEvents existe');
ok(R(`typeof LiveEvents.buildForLevel==='function' && typeof LiveEvents.update==='function'`), 'api: buildForLevel/update existen');
ok(R(`LiveEvents.CFG.plaza.x`) === 0 && R(`LiveEvents.CFG.plaza.z`) === 0, 'datos: la plaza es (0,0) como en neoncity.js');
ok(R(`LiveEvents.CFG.everySec`) === 1200, 'datos: un evento cada 20 min (1200s)');
ok(R(`LiveEvents.CFG.lenSec`) === 300, 'datos: el evento dura 5 min (300s)');
ok(R(`LiveEvents.CFG.rewardCoins`) === 25, 'datos: recompensa 25🪙');

/* ============ setup base ============ */
// ciclos cortos para la prueba (se restauran al final)
R(`LiveEvents.CFG.everySec=200; LiveEvents.CFG.warnSec=60; LiveEvents.CFG.lenSec=90; LiveEvents.CFG.fwSec=5;`);
R(`SAVE={coins:0}; MODE='play'; LEVEL={idx:0, group:new THREE.Group()}; Player={pos:{x:0,y:0,z:0}};`);
// fakes de Concerts y Fireworks (APIs públicas reales)
R(`window.__ctStarted=false; window.__fwShown=null;
   Concerts={ startShow:function(){ window.__ctStarted=true; return true; } };
   Fireworks={ show:function(x,z,d){ window.__fwShown={x:x,z:z,d:d}; } };
   window.__toasts=[]; toast=function(m){ window.__toasts.push(m); };`);
R(`LiveEvents.buildForLevel(0, null);`);

/* ============ anuncio con cuenta regresiva ============ */
R(`LiveEvents.tNext=50; LiveEvents.active=0; LiveEvents.update(1);`);
ok(R(`LiveEvents._banner.style.display`) === 'block', 'anuncio: el banner se muestra antes del evento');
ok(/en \d+:\d\d/.test(R(`LiveEvents._banner.textContent`)), 'anuncio: el banner trae cuenta regresiva (' + R(`LiveEvents._banner.textContent`) + ')');
R(`LiveEvents.tNext=120; LiveEvents.update(1);`);
ok(R(`LiveEvents._banner.style.display`) === 'none', 'anuncio: fuera del aviso (tNext>warnSec) el banner se oculta');

/* ============ inicio del evento ============ */
R(`LiveEvents.tNext=2; LiveEvents.active=0; window.__ctStarted=false; window.__fwShown=null; LiveEvents.update(3);`);
ok(R(`LiveEvents.active`) > 0, "inicio: el evento empieza al llegar tNext a 0"); R(`LiveEvents.update(0.1);`);
ok(R(`LiveEvents.eid`) === 1, 'inicio: eid=1 (contador único)');
ok(R(`window.__ctStarted`) === true, 'integración: se llama Concerts.startShow() al empezar');
ok(R(`window.__fwShown && window.__fwShown.x===0 && window.__fwShown.z===0`), 'integración: se llama Fireworks.show(0,0,dur) al empezar');
ok(R(`SAVE.liveEvents.lastEvent`) === 1, 'persistencia: SAVE.liveEvents.lastEvent=1');
ok(/FIESTA EN VIVO/.test(R(`LiveEvents._banner.textContent`)), 'inicio: el banner dice "¡FIESTA EN VIVO AHORA!"');

/* ============ recompensa una sola vez, cerca de la plaza ============ */
// (el update(0.1) de arriba pudo premiar ya estando en (0,0): se limpia la marca)
R(`delete SAVE.liveEvents.rewarded; SAVE.coins=0; Player.pos.x=5; Player.pos.z=5; LiveEvents.update(1);`);
ok(R(`SAVE.coins`) === 25, 'recompensa: cerca de la plaza → +25🪙 (0→25)');
ok(R(`SAVE.liveEvents.rewarded[1]`) === true, 'recompensa: queda marcada en SAVE.liveEvents.rewarded');
R(`LiveEvents.update(1); LiveEvents.update(1);`);
ok(R(`SAVE.coins`) === 25, 'recompensa: NO se repite en el mismo evento (sigue 25)');
R(`Player.pos.x=200; Player.pos.z=200; SAVE.coins=0; delete SAVE.liveEvents.rewarded[1]; LiveEvents.update(1);`);
ok(R(`SAVE.coins`) === 0, 'recompensa: lejos de la plaza no hay recompensa');

/* ============ fin del evento ============ */
R(`Player.pos.x=0; Player.pos.z=0; LiveEvents.active=2; LiveEvents.update(3);`);
ok(R(`LiveEvents.active`) === 0, 'fin: el evento termina al agotarse su duración');
ok(R(`LiveEvents.tNext`) === 200, 'fin: se programa el próximo evento (tNext=everySec)');
ok(R(`LiveEvents._banner.style.display`) === 'none', 'fin: el banner se oculta');
ok(R(`window.__toasts.some(t=>/terminó/.test(t))`), 'fin: hay mensaje de cierre');

/* ============ sin Concerts/Fireworks no rompe ============ */
R(`Concerts=undefined; Fireworks=undefined; LiveEvents.tNext=1; LiveEvents.active=0;`);
let threw = false;
try { R(`LiveEvents.update(2);`); } catch (e) { threw = true; }
ok(!threw && R(`LiveEvents.active`) > 0, 'robustez: el evento arranca aunque Concerts/Fireworks no existan');

/* ============ en otro mundo la fiesta no se anuncia ni premia ============ */
R(`LEVEL={idx:3, group:new THREE.Group()}; LiveEvents.active=60; LiveEvents.eid=5;
   SAVE.coins=0; Player.pos.x=0; Player.pos.z=0; LiveEvents.update(1);`);
ok(R(`LiveEvents._banner.style.display`) === 'none', 'mundos: fuera de Ciudad Neón no hay banner');
ok(R(`SAVE.coins`) === 0, 'mundos: fuera de Ciudad Neón no hay recompensa');
R(`LEVEL={idx:0, group:new THREE.Group()};`);

/* ============ restauración desde SAVE ============ */
R(`SAVE={coins:0, liveEvents:{lastEvent:7, tNext:150, rewarded:{7:true}}}; LiveEvents.tNext=999; LiveEvents.buildForLevel(0, null);`);
ok(R(`LiveEvents.eid`) === 7, 'persistencia: buildForLevel restaura el contador de eventos');
ok(R(`LiveEvents.tNext`) === 150, 'persistencia: buildForLevel restaura tNext');
R(`LiveEvents.active=90; LiveEvents.update(1); SAVE.coins=0; Player.pos.x=0; Player.pos.z=0; LiveEvents.update(1);`);
ok(R(`SAVE.coins`) === 0, 'persistencia: el evento 7 ya premiado no vuelve a premiar');

/* ============ resumen ============ */
console.log('liveevents: ' + pass + ' OK, ' + fail + ' FAIL');
if (fail > 0) process.exit(1);
