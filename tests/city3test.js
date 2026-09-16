/* Prueba del módulo de vida de ciudad tanda 3 (citylife3.js):
   carga, API CityLife3, temporadas (las 3 + auto/off), negocio propio,
   banco, karaoke, bomberos, minimapa, mascota llamar/alejar y
   updateCityLife3 120 cuadros sin errores en buildLevel(3).
   Sigue el patrón de jobtest.js (stubs THREE/DOM). */
const fs = require('fs'), vm = require('vm');
require(__dirname + '/stubs.js');
const DIR = '/home/hatch/workspace/your_files/obby-3d/';
const FILES = ['state.js', 'i18n.js', 'audio.js', 'vehicles.js', 'world.js', 'neoncity.js', 'family.js',
  'player.js', 'online.js', 'travel.js', 'phase3.js', 'trophies.js',
  'casa.js', 'pets.js', 'fishing.js', 'racing.js', 'weather.js', 'observatory.js', 'ranch.js', 'jobs.js', 'citylife3.js'];
for (const f of FILES) {
  try {
    vm.runInContext(fs.readFileSync(DIR + f, 'utf8'), sandbox, { filename: f });
  } catch (e) {
    console.log('  ✗ ERROR cargando ' + f + ': ' + e.message);
    process.exit(1);
  }
}
console.log('carga: 20 archivos sin errores');

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; } else { fail++; console.log('  ✗ FAIL:', name); }
}
R('initThree(); Particles.init(); Avatar.build(); CityLife3.init();');
R(`MODE='play'; LEVEL = buildLevel(3); Player.reset(30,2,118); SAVE.coins=5000;`);

// API pública
ok(R(`typeof CityLife3==='object' && typeof CityLife3.init==='function' && typeof CityLife3.onLevelStart==='function' && typeof CityLife3.onLevelEnd==='function' && typeof CityLife3.update==='function'`),
  'api: CityLife3 expone init/onLevelStart/onLevelEnd/update');
ok(R(`typeof updateCityLife3==='function'`), 'api: alias global updateCityLife3');
ok(R(`VEHICLE_TYPES['geayi-fire'] && typeof VEHICLE_BUILDERS['geayi-fire']==='function'`),
  'bomberos: tipo geayi-fire registrado');

// a) temporadas: forzar cada una y verificar decoración
for (const [s, check, name] of [
  ['halloween', `CL3.seasonGroup!==null && CL3.candy.length===10`, 'halloween: grupo + 10 dulces'],
  ['navidad', `CL3.seasonGroup!==null && CL3.gifts.length===6 && CL3.treeLights.length>0 && CL3.snow!==null`, 'navidad: regalos + luces + nieve'],
  ['sept15', `CL3.seasonGroup!==null && CL3.parade.length>0`, 'sept15: banderas + desfile'],
]) {
  try {
    R(`SAVE.season='${s}'; CityLife3.onLevelStart(3);`);
    ok(R(check), 'temporada: ' + name);
    R(`for (let i=0;i<60;i++) updateCityLife3(0.016);`);
  } catch (e) { ok(false, 'temporada ' + s + ' → ' + e.message); }
}
R(`SAVE.season='none'; CityLife3.onLevelStart(3);`);
ok(R(`CL3.seasonGroup===null && CL3.seasonBuilt==='none'`), 'temporada: none no construye decoración');
ok(R(`['auto','halloween','navidad','sept15','none'].indexOf((SAVE.season='auto', _seasonEff()))>=0`), 'temporada: _seasonEff auto devuelve valor válido');
// dulce recolectable da +5
try {
  R(`SAVE.season='halloween'; CityLife3.onLevelStart(3);`);
  const c0 = R(`SAVE.coins`);
  R(`(function(){ const cd=CL3.candy[0]; Player.pos.set(cd.mesh.position.x,1,cd.mesh.position.z); updateCityLife3(0.016); })()`);
  ok(R(`SAVE.coins`) === c0 + 5, 'temporada: dulce da +5 🪙');
} catch (e) { ok(false, 'temporada: dulce → ' + e.message); }

// edificios solo en Immokalee
R(`SAVE.season='none'; CityLife3.onLevelStart(3);`);
ok(R(`CL3.cityGroup!==null`), 'ciudad: edificios construidos en idx 3');
ok(R(`CL3.truckDef && CL3.truckDef.vtype==='geayi-fire'`), 'bomberos: camión estacionado y abordable');
R(`LEVEL = buildLevel(0); CityLife3.onLevelStart(0);`);
ok(R(`CL3.cityGroup===null`), 'ciudad: sin edificios fuera de Immokalee');
R(`LEVEL = buildLevel(3); Player.reset(30,2,118); CityLife3.onLevelStart(3);`);

// b) negocio propio
try {
  R(`SAVE.coins=2000; SAVE.biz={owned:false,giro:null,stock:0,level:1,earned:0};`);
  R(`_buyStore()`);
  ok(R(`SAVE.biz.owned===true && SAVE.coins===1200`), 'negocio: comprar local $800');
  R(`_pickGiro('tacos')`);
  ok(R(`SAVE.biz.giro==='tacos' && SAVE.biz.stock===10`), 'negocio: elegir giro tacos (+10 stock)');
  R(`_restock()`);
  ok(R(`SAVE.biz.stock===20 && SAVE.coins===1185`), 'negocio: surtir +10 ($15)');
  R(`_upgradeBiz()`);
  ok(R(`SAVE.biz.level===2 && SAVE.coins===685`), 'negocio: mejora a nivel 2 ($500)');
  // venta por NPC: forzar temporizador y simular ~12 s
  R(`CL3.saleT=0.01; SAVE.biz.stock=5;`);
  R(`for (let i=0;i<750;i++) updateCityLife3(0.016);`);
  ok(R(`SAVE.biz.stock<5 || (SAVE.biz.earned||0)>0`), 'negocio: NPC compra (stock baja / ganancias suben)');
  ok(R(`(SAVE.biz.earned||0)>0`), 'negocio: hay ganancias registradas');
} catch (e) { ok(false, 'negocio → ' + e.message); }

// d) banco
try {
  R(`SAVE.coins=500; SAVE.bank={balance:1000};`);
  R(`_bankMove('dep',100)`);
  ok(R(`SAVE.bank.balance===1100 && SAVE.coins===400`), 'banco: depositar 100');
  R(`_bankMove('wd',200)`);
  ok(R(`SAVE.bank.balance===900 && SAVE.coins===600`), 'banco: retirar 200');
  R(`_bankMove('wd','all')`);
  ok(R(`SAVE.bank.balance===0 && SAVE.coins===1500`), 'banco: retirar todo');
  R(`SAVE.bank.balance=1000; CL3.dayAcc=299.9; updateCityLife3(0.5);`);
  ok(R(`SAVE.bank.balance===1020`), 'banco: 2% de interés por día de juego (+20)');
} catch (e) { ok(false, 'banco → ' + e.message); }

// e) karaoke: cantar perfecto da 100 pts y +60
try {
  R(`_karaStart('s1')`);
  ok(R(`CL3.kara!==null && CL3.kara.song.beats.length===18`), 'karaoke: inicia canción s1 (18 sílabas)');
  const c0 = R(`SAVE.coins`);
  R(`(function(){ const k=CL3.kara; for (let i=0;i<k.times.length;i++){ k.t=k.times[i]-0.01; _karaTap(); } _karaEnd(); })()`);
  ok(R(`CL3.kara===null`), 'karaoke: sesión termina');
  ok(R(`SAVE.coins`) === c0 + 60, 'karaoke: puntaje perfecto premia +60 🪙');
  ok(R(`KARAOKE_SONGS.length===3`), 'karaoke: 3 canciones inventadas');
} catch (e) { ok(false, 'karaoke → ' + e.message); }

// f) bomberos: incendio aleatorio y apagarlo
try {
  R(`CityLife3.onLevelStart(3); CL3.fire.next=0.01; updateCityLife3(0.05);`);
  ok(R(`CL3.fire && CL3.fire.group`), 'bomberos: incendio aleatorio aparece');
  const c0 = R(`SAVE.coins`);
  R(`_putOutFire()`);
  ok(R(`SAVE.coins`) === c0 + 40, 'bomberos: apagar da +40 🪙');
  ok(R(`typeof _inFireTruck==='function'`), 'bomberos: detector de camión existe');
} catch (e) { ok(false, 'bomberos → ' + e.message); }

// c) minimapa
try {
  R(`_toggleMap(true)`);
  ok(R(`!CL3.mapOv.classList.contains('hidden')`), 'mapa: se abre con 🗺️');
  R(`CL3.waypoint={x:10,z:20}; _drawMap(); updateCityLife3(0.2);`);
  ok(true, 'mapa: dibuja sin errores (rejilla, iconos, waypoint, jugador)');
  R(`_toggleMap(false)`);
  ok(R(`typeof _w2m==='function' && typeof _m2w==='function'`), 'mapa: conversión mundo↔píxeles');
} catch (e) { ok(false, 'mapa → ' + e.message); }

// g) mascota llamar/alejar (mejora compatible con pets.js)
try {
  R(`SAVE.pet='dog'; persist(); Pets.onLevelStart();`);
  R(`setPetAway(true); updatePets(0.016);`);
  ok(R(`isPetAway()===true`), 'mascota: alejar la oculta');
  R(`callPet();`);
  ok(R(`isPetAway()===false`), 'mascota: llamar la trae de vuelta');
  ok(R(`typeof Pets.setAway==='function' && typeof Pets.call==='function' && typeof Pets.isAway==='function'`),
    'mascota: API expuesta en Pets (compatible, sin duplicar)');
} catch (e) { ok(false, 'mascota → ' + e.message); }

// limpieza y 120 cuadros generales
try {
  R(`CityLife3.onLevelEnd();`);
  ok(R(`CL3.cityGroup===null && CL3.seasonGroup===null`), 'cierre: onLevelEnd limpia grupos');
  R(`CityLife3.onLevelStart(3); for (let i=0;i<120;i++) updateCityLife3(0.016); CityLife3.onLevelEnd();`);
  ok(true, 'general: 120 cuadros de updateCityLife3 sin errores');
} catch (e) { ok(false, 'general → ' + e.message); }

console.log(`\nresultado: ${pass} ok, ${fail} fallos`);
process.exit(fail ? 1 : 0);
