/* Prueba del módulo de vida de ciudad tanda 2 (citylife2.js):
   carga, API CityLife2, casas (comprar/rentar/renta pasiva), trabajos
   (repartidor/taxista), tour en airboat, feria + atrapa el aro,
   iglesia/hospital, radio, tormenta, huracán, arcade (memoria) y
   updateCityLife2 120 cuadros sin errores en buildLevel(3) y buildLevel(0).
   Sigue el patrón de city3test.js (stubs THREE/DOM). */
const fs = require('fs'), vm = require('vm');
require(__dirname + '/stubs.js');
const DIR = '/home/hatch/workspace/your_files/obby-3d/';
const FILES = ['state.js', 'i18n.js', 'audio.js', 'vehicles.js', 'world.js', 'family.js',
  'player.js', 'online.js', 'travel.js', 'phase3.js', 'trophies.js',
  'casa.js', 'pets.js', 'fishing.js', 'racing.js', 'weather.js', 'observatory.js', 'ranch.js', 'jobs.js', 'neoncity.js', 'citylife2.js'];
for (const f of FILES) {
  try {
    vm.runInContext(fs.readFileSync(DIR + f, 'utf8'), sandbox, { filename: f });
  } catch (e) {
    console.log('  ✗ ERROR cargando ' + f + ': ' + e.message);
    process.exit(1);
  }
}
console.log('carga: 21 archivos sin errores');

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; } else { fail++; console.log('  ✗ FAIL:', name); }
}
R('initThree(); Particles.init(); Avatar.build(); CityLife2.init();');
R(`MODE='play'; LEVEL = buildLevel(3); Player.reset(-105,2,-35); SAVE.coins=5000; SAVE.cl2={houses:{},radio:{st:-1,muted:false},playSec:0,lastPaySec:0,lastPayTs:0};`);

// API pública
ok(R(`typeof CityLife2==='object' && typeof CityLife2.init==='function' && typeof CityLife2.onLevelStart==='function' && typeof CityLife2.onLevelEnd==='function' && typeof CityLife2.update==='function'`),
  'api: CityLife2 expone init/onLevelStart/onLevelEnd/update');
ok(R(`typeof updateCityLife2==='function' && typeof cityLife2LevelStart==='function'`), 'api: alias updateCityLife2/cityLife2LevelStart');
ok(R(`VEHICLE_TYPES['geayi-airboat'] && typeof VEHICLE_BUILDERS['geayi-airboat']==='function'`),
  'airboat: tipo geayi-airboat registrado en vehicles.js');

// nivel 3: construcción del barrio
R(`CityLife2.onLevelStart(3);`);
ok(R(`CL2.group!==null && CL2.houses.length===4`), 'ciudad: 4 casas construidas en idx 3');
ok(R(`CL2.doors.length===4`), 'ciudad: 4 triggers de puerta (iglesia+hospital, ida y vuelta)');
ok(R(`typeof CL2.arcadeSpot==='object'`), 'ciudad: arcade construido');
R(`LEVEL = buildLevel(0); CityLife2.onLevelStart(0);`);
ok(R(`CL2.group!==null && CL2.houses.length===4`), 'ciudad: barrio también en idx 0 (Neón)');
R(`LEVEL = buildLevel(3); Player.reset(-105,2,-35); CityLife2.onLevelStart(3);`);

// a) casas: comprar, rentar, renta pasiva
try {
  R(`SAVE.coins=2000;`);
  R(`_c2buyHouse(0)`);
  ok(R(`SAVE.cl2.houses[0].owned===true && SAVE.coins===1500`), 'casa: comprar #1 ($500)');
  R(`_c2toggleRent(0)`);
  ok(R(`SAVE.cl2.houses[0].rented===true`), 'casa: rentar a NPC');
  ok(R(`CL2.renters.length===1`), 'casa: NPC inquilino aparece');
  R(`SAVE.cl2.playSec=125; SAVE.cl2.lastPaySec=0;`);
  const c0 = R(`SAVE.coins`);
  R(`_c2rentTick(0.016)`);
  ok(R(`SAVE.coins`) === c0 + 20, 'casa: renta pasiva $10/min x2min (+20 🪙)');
  ok(R(`SAVE.cl2.lastPayTs>0`), 'casa: timestamp de pago en SAVE');
  R(`_c2collectRent()`);
  ok(true, 'casa: recoger renta sin errores');
  R(`_c2toggleRent(0)`);
  ok(R(`SAVE.cl2.houses[0].rented===false && CL2.renters.length===0`), 'casa: detener renta quita NPC');
} catch (e) { ok(false, 'casas → ' + e.message); }

// b) repartidor
try {
  R(`Player.reset(-105,1,-35);`); // en el depósito
  R(`_c2startDelivery()`);
  ok(R(`CL2.del.stage==='goA' && CL2.wp!==null`), 'repartidor: inicia en goA con flecha guía');
  R(`_c2delAction()`);
  ok(R(`CL2.del.stage==='goB'`), 'repartidor: recoge paquete → goB');
  const c0 = R(`SAVE.coins`);
  R(`(function(){ const b=CL2.del.b; Player.pos.set(b[0],1,b[1]); _c2delAction(); })()`);
  ok(R(`CL2.del.stage==='idle' && CL2.wp===null`), 'repartidor: entrega completa, sin flecha');
  ok(R(`SAVE.coins`) > c0, 'repartidor: pago por entrega (>0 🪙)');
} catch (e) { ok(false, 'repartidor → ' + e.message); }

// b) taxista
try {
  R(`Player.reset(-70,1,-42);`); // en la parada
  R(`_c2startTaxi()`);
  ok(R(`CL2.taxi.stage==='wait' && CL2.taxi.pax!==null`), 'taxista: pasajero NPC esperando');
  R(`_c2taxiAction()`);
  ok(R(`CL2.taxi.stage==='ride'`), 'taxista: pasajero a bordo → ride');
  const c0 = R(`SAVE.coins`);
  R(`(function(){ const d=CL2.taxi.dest; Player.pos.set(d[0],1,d[1]); _c2taxiAction(); })()`);
  ok(R(`CL2.taxi.stage==='idle'`), 'taxista: llegada completa');
  ok(R(`SAVE.coins`) > c0, 'taxista: tarifa por distancia (>0 🪙)');
} catch (e) { ok(false, 'taxista → ' + e.message); }

// c) tour en airboat
try {
  R(`SAVE.coins=100;`);
  R(`_c2startTour(true)`);
  ok(R(`CL2.tour!==null && CL2.tour.stop===0 && SAVE.coins===80`), 'tour: inicia pagado ($20)');
  R(`(function(){ const s=C2_SPOTS[3].tourStops; for(let i=0;i<4;i++){ const st=s[i]; Player.pos.set(st[0],1,st[1]); _c2updateTour(0.016); } })()`);
  ok(R(`CL2.tour===null`), 'tour: 4 paradas completan el tour');
  ok(R(`SAVE.coins`) === 120, 'tour: recuerdo +$40 (neto 120)');
  R(`_c2startTour(false)`);
  ok(R(`CL2.tour!==null && CL2.tour.paid===false`), 'tour: versión gratis disponible');
  R(`CL2.tour=null; _c2clearWaypoint();`);
} catch (e) { ok(false, 'tour → ' + e.message); }

// d) feria + atrapa el aro
try {
  R(`CL2.fair.next=0.01; updateCityLife2(0.05);`);
  ok(R(`CL2.fair.active===true && CL2.fair.group!==null && CL2.fair.wheel!==null`), 'feria: aparece con noria');
  R(`for (let i=0;i<60;i++) updateCityLife2(0.016);`);
  ok(R(`CL2.fair.wheel.rotation.z>0`), 'feria: la noria gira');
  R(`_c2ringPanel(); _c2ringThrow(); _c2ringThrow(); _c2ringThrow();`);
  ok(R(`CL2.ring.att===3 && CL2.ring.active===false`), 'feria: atrapa el aro = 3 intentos');
  const sp = R(`CL2.fair.stalls[0]`);
  R(`_c2stallPrize(${sp.x},${sp.z});`);
  ok(R(`CL2.fair.prizeTaken===true`), 'feria: puesto da premio (una vez)');
  R(`_c2clearFair();`);
  ok(R(`CL2.fair.active===false`), 'feria: se limpia');
} catch (e) { ok(false, 'feria → ' + e.message); }

// e) iglesia y hospital
try {
  R(`(function(){ const d=CL2.doors[0]; Player.pos.set(d.x,1,d.z); CL2.tpCd=0; _c2updateDoors(0.016); })()`);
  ok(R(`CL2.inside==='church'`), 'iglesia: puerta teletransporta al interior');
  R(`(function(){ const d=CL2.doors[1]; Player.pos.set(d.x,1,d.z); CL2.tpCd=0; _c2updateDoors(0.016); })()`);
  ok(R(`CL2.inside===null`), 'iglesia: puerta interior devuelve afuera');
  R(`(function(){ const d=CL2.doors[2]; Player.pos.set(d.x,1,d.z); CL2.tpCd=0; _c2updateDoors(0.016); })()`);
  ok(R(`CL2.inside==='hospital'`), 'hospital: puerta teletransporta al interior');
  R(`SAVE.coins=50; _c2heal();`);
  ok(R(`SAVE.coins===40`), 'hospital: 💚 Curar cuesta $10');
} catch (e) { ok(false, 'iglesia/hospital → ' + e.message); }

// f) radio
try {
  R(`_c2radioPlay(0)`);
  ok(R(`CL2.radio.st===0`), 'radio: estación 0 sonando');
  R(`_c2radioTick();`);
  ok(R(`CL2.radio.step===1`), 'radio: avanza la melodía');
  R(`_c2radioMute()`);
  ok(R(`CL2.radio.muted===true`), 'radio: mute');
  R(`_c2radioStop()`);
  ok(R(`CL2.radio.st===-1`), 'radio: apagar');
  ok(R(`C2_STATIONS.length===3`), 'radio: 3 estaciones');
} catch (e) { ok(false, 'radio → ' + e.message); }

// g) tormenta (opcional: SAVE.storms)
try {
  R(`SAVE.storms=false; CL2.storm.active=false; CL2.storm.next=0.01; updateCityLife2(0.05);`);
  ok(R(`CL2.storm.active===false`), 'tormenta: APAGADA no arranca sola');
  R(`SAVE.storms=true; CL2.storm.next=0.01; updateCityLife2(0.05);`);
  ok(R(`CL2.storm.active===true && CL2.rain.pts.visible===true`), 'tormenta: ENCENDIDA sí arranca');
  R(`_c2lightning();`);
  ok(true, 'tormenta: relámpago (flash + trueno) sin errores');
  R(`CL2.storm.t=44.9; updateCityLife2(0.2);`);
  ok(R(`CL2.storm.active===false && CL2.rain.pts.visible===false`), 'tormenta: termina a los ~45s');
  R(`SAVE.storms=true; CL2.storm.next=0.01; updateCityLife2(0.05); SAVE.storms=false; updateCityLife2(0.05);`);
  ok(R(`CL2.storm.active===false`), 'tormenta: apagar a mitad la corta');
  R(`SAVE.storms=false;`);
} catch (e) { ok(false, 'tormenta → ' + e.message); }

// h) huracán (opcional: SAVE.storms)
try {
  R(`SAVE.storms=false; CL2.hurr.active=false; CL2.hurr.next=0.01; updateCityLife2(0.05);`);
  ok(R(`CL2.hurr.active===false`), 'huracán: APAGADO no arranca solo');
  R(`SAVE.storms=true; CL2.hurr.next=0.01; updateCityLife2(0.05);`);
  ok(R(`CL2.hurr.active===true`), 'huracán: ENCENDIDO sí arranca');
  const px0 = R(`Player.pos.x`);
  R(`for (let i=0;i<30;i++) updateCityLife2(0.016);`);
  ok(R(`Player.pos.x`) !== px0, 'huracán: el viento empuja al jugador');
  R(`CL2.hurr.t=59.9; updateCityLife2(0.2);`);
  ok(R(`CL2.hurr.active===false && CL2.siren===null`), 'huracán: calma a los ~60s, sirena apagada');
  R(`SAVE.storms=false;`);
} catch (e) { ok(false, 'huracán → ' + e.message); }

// i) arcade: memoria
try {
  R(`SAVE.coins=50; Player.reset(-52,1,-68); _c2memStart();`);
  ok(R(`CL2.mem!==null && SAVE.coins===45`), 'arcade: memoria cuesta $5');
  R(`(function(){ const m=CL2.mem; for(let v=0;v<3;v++){ const idx=[]; m.cards.forEach((c,i)=>{ if(c.v===v) idx.push(i); }); _c2memFlip(idx[0]); _c2memFlip(idx[1]); } })()`);
  ok(R(`CL2.mem===null`), 'arcade: completar pares cierra el juego');
  ok(R(`SAVE.coins`) === 65, 'arcade: premio +$20 (neto 65)');
} catch (e) { ok(false, 'arcade → ' + e.message); }

// limpieza y 120 cuadros generales en ambos mundos
try {
  R(`CityLife2.onLevelEnd();`);
  ok(R(`CL2.group===null && CL2.houses.length===0`), 'cierre: onLevelEnd limpia');
  R(`LEVEL=buildLevel(3); Player.reset(-105,2,-35); CityLife2.onLevelStart(3); for (let i=0;i<120;i++) updateCityLife2(0.016);`);
  ok(true, 'general: 120 cuadros en idx 3 sin errores');
  R(`LEVEL=buildLevel(0); Player.reset(-22,2,-108); CityLife2.onLevelStart(0); for (let i=0;i<120;i++) updateCityLife2(0.016); CityLife2.onLevelEnd();`);
  ok(true, 'general: 120 cuadros en idx 0 sin errores');
} catch (e) { ok(false, 'general → ' + e.message); }

console.log(`\nresultado: ${pass} ok, ${fail} fallos`);
process.exit(fail ? 1 : 0);
