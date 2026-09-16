/* Pruebas de la FERIA EXTENDIDA (citylife2.js, sección d2):
   - noria SUBIBLE: abordaje solo con cabina abajo, el jugador sube y baja,
     BAJAR lo deja en el suelo, sin cabina abajo no hay abordaje
   - 🐴 carrusel subible: subir, gira, baja solo a los 20 s y BAJAR anticipado
   - 🎠 sillas voladoras: decoración giratoria
   - 🥫 tumba-latas y 🎈 globos: tumbar/reventar todo da premio +15..30 🪙
   - la feria vieja sigue funcionando (noria gira, aros dan premio, puesto)
   - i18n es/en de las claves nuevas
   Sigue el patrón de city2test.js (stubs.js + vm + R). */
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
R(`MODE='play'; LEVEL = buildLevel(3); Player.reset(-105,2,-122); SAVE.coins=1000; Vehicle.mode='none'; Vehicle.def=null;`);
R('CityLife2.onLevelStart(3);');
R('CL2.fair.next=0.01; updateCityLife2(0.05);'); // forzar la feria

/* ============ 1. la feria vieja sigue funcionando ============ */
console.log('— feria vieja intacta');
ok(R('CL2.fair.active===true && CL2.fair.group!==null && CL2.fair.wheel!==null'), 'feria: aparece con noria');
ok(R('CL2.fair.cabins.length===8'), 'feria: noria con 8 cabinas registradas');
R('for (let i=0;i<60;i++) updateCityLife2(0.016);');
ok(R('CL2.fair.wheel.rotation.z>0'), 'feria: la noria gira');
ok(R('!!CL2.fair.car && !!CL2.fair.swings && !!CL2.fair.cans && !!CL2.fair.darts'), 'feria: carrusel, sillas, tumba-latas y globos construidos');
ok(R('CL2.fair.car.horses.length===6 && CL2.fair.swings.chairs.length===6'), 'feria: 6 caballitos y 6 sillas');
ok(R('CL2.fair.cans.list.length===6 && CL2.fair.darts.list.length===6'), 'feria: 6 latas y 6 globos');
R('_c2ringPanel(); _c2ringThrow(); _c2ringThrow(); _c2ringThrow();');
ok(R('CL2.ring.att===3 && CL2.ring.active===false'), 'feria vieja: atrapa el aro = 3 intentos');
R('(function(){const s=CL2.fair.stalls[0]; _c2stallPrize(s.x,s.z);})()');
ok(R('CL2.fair.prizeTaken===true'), 'feria vieja: puesto da premio (una vez)');

/* ============ 2. noria subible ============ */
console.log('— noria subible');
try {
  R('CL2.fair.wheel.rotation.z=0;'); // cabina 6 queda exactamente abajo
  ok(R('_c2wheelBoardIdx()===6'), 'noria: con la rueda en 0 la cabina 6 está abajo');
  R('CL2.fair.wheel.rotation.z=5.105;'); // punto medio entre cabinas: ninguna abajo
  ok(R('_c2wheelBoardIdx()===-1'), 'noria: sin cabina abajo no hay abordaje');
  R('CL2.fair.wheel.rotation.z=0;');
  // jugador al punto de abordaje y SUBIR
  R('(function(){const bs=CL2.fair.boardSpot; Player.pos.set(bs.x,1,bs.z); if(Player.vel)Player.vel.set(0,0,0);})()');
  R('_c2wheelBoard(_c2wheelBoardIdx());');
  ok(R('!!CL2.fair.ride && CL2.fair.ride.stage==="riding"'), 'noria: SUBIR inicia el paseo');
  ok(R('_c2wheelBoardIdx()===-1'), 'noria: ya a bordo no se propone otra cabina');
  // 1/4 de vuelta: el jugador sube con la cabina
  R('CL2.fair.wheel.rotation.z = CL2.fair.ride.ang0 + Math.PI/2; updateCityLife2(0.016);');
  ok(R('Player.pos.y') > 5, 'noria: el jugador sube con la cabina (y>5)');
  // BAJAR antes de tiempo no hace nada (la cabina no está abajo)
  R('_c2wheelExit();');
  ok(R('!!CL2.fair.ride'), 'noria: BAJAR a mitad del paseo no saca al jugador');
  // completar 2 vueltas: la cabina vuelve abajo
  R('CL2.fair.wheel.rotation.z = CL2.fair.ride.ang0 + Math.PI*4; updateCityLife2(0.016);');
  ok(R('CL2.fair.ride.stage==="done"'), 'noria: tras 2 vueltas el paseo termina abajo');
  ok(Math.abs(R('Player.pos.y') - 3.1) < 0.05, 'noria: jugador sostenido abajo, sin caídas');
  // BAJAR lo deja en el suelo
  R('_c2wheelExit();');
  ok(R('CL2.fair.ride===null'), 'noria: BAJAR termina el paseo');
  ok(Math.abs(R('Player.pos.y') - 1) < 0.01, 'noria: BAJAR deja al jugador en el suelo');
  // sin cabina abajo, _c2wheelBoard(-1) no hace nada
  R('_c2wheelBoard(-1);');
  ok(R('CL2.fair.ride===null'), 'noria: índice inválido no inicia paseo');
  // tope de seguridad: paseo muy largo termina igual
  R('(function(){const bs=CL2.fair.boardSpot; Player.pos.set(bs.x,1,bs.z);})(); _c2wheelBoard(6);');
  R('CL2.fair.ride.t=59.9; updateCityLife2(0.2);');
  ok(R('CL2.fair.ride.stage==="done"'), 'noria: tope de 60 s termina el paseo');
  R('_c2wheelExit();');
} catch (e) { ok(false, 'noria → ' + e.message); }

/* ============ 3. carrusel subible ============ */
console.log('— carrusel subible');
try {
  R('(function(){const c=CL2.fair.car; Player.pos.set(c.boardSpot.x,1,c.boardSpot.z); if(Player.vel)Player.vel.set(0,0,0);})()');
  R('_c2carBoard();');
  ok(R('!!CL2.fair.car.rider'), 'carrusel: SUBIR');
  const hx0 = R('Player.pos.x');
  R('for (let i=0;i<60;i++) updateCityLife2(0.016);');
  ok(R('CL2.fair.car.rider.t') > 0.5, 'carrusel: el paseo avanza');
  ok(Math.abs(R('Player.pos.x') - hx0) > 0.5, 'carrusel: el jugador da vueltas en su caballito');
  ok(R('Player.pos.y') > 0.5, 'carrusel: el jugador va sentado (no en el suelo)');
  // a los 20 s baja solo
  R('CL2.fair.car.rider.t=19.95; updateCityLife2(0.1);');
  ok(R('CL2.fair.car.rider===null'), 'carrusel: a los 20 s el paseo termina solo');
  ok(Math.abs(R('Player.pos.y') - 1) < 0.01, 'carrusel: al terminar queda en el suelo');
  // BAJAR anticipado
  R('_c2carBoard(); _c2carExit();');
  ok(R('CL2.fair.car.rider===null && Math.abs(Player.pos.y-1)<0.01'), 'carrusel: BAJAR anticipado deja en el suelo');
  // segundo SUBIR mientras hay jinete no duplica
  R('_c2carBoard(); _c2carBoard();');
  ok(R('!!CL2.fair.car.rider'), 'carrusel: segundo SUBIR no rompe el paseo');
  R('_c2carExit();');
} catch (e) { ok(false, 'carrusel → ' + e.message); }

/* ============ 4. sillas voladoras (decoración) ============ */
console.log('— sillas voladoras');
try {
  const ry0 = R('CL2.fair.swings.disc.rotation.y');
  R('for (let i=0;i<30;i++) updateCityLife2(0.016);');
  ok(R('CL2.fair.swings.disc.rotation.y') > ry0, 'sillas: el disco gira');
  ok(R('Math.abs(CL2.fair.swings.chairs[1].rotation.x)>0.01 || Math.abs(CL2.fair.swings.chairs[1].rotation.z)>0.01'), 'sillas: se inclinan hacia afuera');
} catch (e) { ok(false, 'sillas → ' + e.message); }

/* ============ 5. tumba-latas ============ */
console.log('— tumba-latas');
try {
  R('SAVE.coins=1000;');
  R('while(!CL2.fair.cans.done) _c2cansThrow();');
  ok(R('CL2.fair.cans.done===true'), 'tumba-latas: se tumban las 6 latas');
  ok(R('CL2.fair.cans.list.every(function(k){return !k.visible;})'), 'tumba-latas: latas ocultas');
  const g = R('SAVE.coins') - 1000;
  ok(g >= 15 && g <= 30, 'tumba-latas: premio +15..30 🪙 (fue +' + g + ')');
  R('SAVE.coins=1000; _c2cansThrow();');
  ok(R('SAVE.coins') === 1000, 'tumba-latas: terminado no da más premio');
} catch (e) { ok(false, 'tumba-latas → ' + e.message); }

/* ============ 6. globos con dardos ============ */
console.log('— globos con dardos');
try {
  R('SAVE.coins=1000;');
  R('while(!CL2.fair.darts.done) _c2dartsThrow();');
  ok(R('CL2.fair.darts.done===true'), 'globos: se revientan los 6');
  ok(R('CL2.fair.darts.list.every(function(k){return !k.visible;})'), 'globos: globos ocultos');
  const g2 = R('SAVE.coins') - 1000;
  ok(g2 >= 15 && g2 <= 30, 'globos: premio +15..30 🪙 (fue +' + g2 + ')');
  R('SAVE.coins=1000; _c2dartsThrow();');
  ok(R('SAVE.coins') === 1000, 'globos: terminado no da más premio');
} catch (e) { ok(false, 'globos → ' + e.message); }

/* ============ 7. i18n es/en ============ */
console.log('— i18n');
try {
  ok(R(`_c2T('c2.board')`) === 'SUBIR', 'i18n es: c2.board');
  ok(R(`_c2T('c2.cans')`) === '🥫 TUMBA-LATAS', 'i18n es: c2.cans');
  ok(R(`_c2T('c2.fullPop')`) === '🎈 ¡Todos reventados! Premio', 'i18n es: c2.fullPop');
  R('setLang("en");');
  ok(R(`_c2T('c2.board')`) === 'RIDE', 'i18n en: c2.board');
  ok(R(`_c2T('c2.cans')`) === '🥫 CAN KNOCKDOWN', 'i18n en: c2.cans');
  ok(R(`_c2T('c2.fullPop')`) === '🎈 All popped! Prize', 'i18n en: c2.fullPop');
  R('setLang("es");');
} catch (e) { ok(false, 'i18n → ' + e.message); }

/* ============ 8. seguridad: la feria termina a mitad del paseo ============ */
console.log('— seguridad');
try {
  R('CL2.fair.wheel.rotation.z=0;');
  R('(function(){const bs=CL2.fair.boardSpot; Player.pos.set(bs.x,1,bs.z);})(); _c2wheelBoard(6);');
  R('(function(){const c=CL2.fair.car; c.rider={t:0,horse:0};})();');
  R('_c2clearFair();');
  ok(R('CL2.fair.ride===null && CL2.fair.car===null'), 'seguridad: clearFair desmonta ambos paseos');
  ok(Math.abs(R('Player.pos.y') - 1) < 0.01, 'seguridad: el jugador queda en el suelo (y=1)');
  ok(R('CL2.fair.cans===null && CL2.fair.darts===null && CL2.fair.swings===null'), 'seguridad: minijuegos y sillas limpiados');
} catch (e) { ok(false, 'seguridad → ' + e.message); }

/* ============ 9. 120 cuadros generales sin errores ============ */
console.log('— 120 cuadros');
try {
  R('LEVEL=buildLevel(3); Player.reset(-105,2,-122); CityLife2.onLevelStart(3); CL2.fair.next=0.01;');
  R('for (let i=0;i<120;i++) updateCityLife2(0.016);');
  ok(true, 'general: 120 cuadros en idx 3 sin errores');
  R('CityLife2.onLevelEnd();');
  ok(R('CL2.group===null && CL2.fair.active===false'), 'general: onLevelEnd limpia');
} catch (e) { ok(false, 'general → ' + e.message); }

console.log(`\nresultado: ${pass} ok, ${fail} fallos`);
process.exit(fail ? 1 : 0);
