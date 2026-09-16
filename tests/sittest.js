/* Prueba de sentarse / acostarse / mover muebles (furniture.js + player.js):
   - Player.sit() en silla/sofá cambia la pose y coloca al avatar en el asiento
   - Player.lieDown() en cama acuesta al avatar sobre el colchón
   - Player.standUp() restaura la pose y da un pasito al frente del mueble
   - Reconstruir el avatar (Avatar.build) re-aplica la pose si seguía sentado/acostado
   - Joystick o salto levantan al jugador automáticamente
   - Furniture.nearSeat() detecta silla/sofá a < 2.2m; nearBed() la cama
   - Furniture.nearFurniture() detecta cualquier mueble propio a < 2.8m
   - ✋ Mover: fantasma que sigue al jugador, ✅ Colocar guarda en SAVE,
     no permite colocar fuera del lote, colisionadores sincronizados
   - Compatibilidad: agarrar → soltar conserva la nueva posición del objeto
   Sigue el patrón de furnituretest.js (stubs THREE/DOM). */
const fs = require('fs'), vm = require('vm');
require(__dirname + '/stubs.js');
const DIR = '/home/hatch/workspace/your_files/obby-3d/';
const FILES = ['state.js', 'i18n.js', 'audio.js', 'vehicles.js', 'world.js', 'neoncity.js', 'family.js', 'player.js',
  'online.js', 'travel.js', 'phase3.js', 'powers.js', 'trophies.js', 'community.js', 'casa.js', 'pets.js',
  'fishing.js', 'racing.js', 'weather.js', 'observatory.js', 'jobs.js', 'candy.js', 'citylife3.js', 'citylife1.js',
  'citylife2.js', 'bridges.js', 'buildmode.js', 'funpark.js', 'bowling.js', 'train.js', 'promos.js',
  'dealership.js', 'waterpark.js', 'fireworks.js', 'zoo.js', 'concerts.js', 'carwash.js', 'castle.js',
  'lots.js', 'furniture.js', 'game.js', 'ranch.js'];
for (const f of FILES) {
  try {
    vm.runInContext(fs.readFileSync(DIR + f, 'utf8'), sandbox, { filename: f });
  } catch (e) {
    console.log('  ✗ ERROR cargando ' + f + ': ' + e.message);
    process.exit(1);
  }
}
console.log('carga: ' + FILES.length + ' archivos sin errores');

/* Shop2 realista (descuenta de SAVE.coins) + captura de toast + silencio de audio/partículas */
vm.runInContext(
  `var Shop2 = { spendCoins(n){ if ((SAVE.coins||0) < n) return false; SAVE.coins -= n; try { persist(); } catch(e){} return true; },
    coinsText(){ return String(SAVE.coins||0); } };
   var __toastLog = []; var __toastOrig = toast;
   toast = function(m){ __toastLog.push(m); try { __toastOrig(m); } catch(e){} };
   try { Audio2.click = function(){}; Audio2.win = function(){}; } catch(e){}
   try { Particles.burst = function(){}; } catch(e){}`, sandbox);

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; } else { fail++; console.log('  ✗ FAIL:', name); }
}
const lastToast = () => R(`__toastLog[__toastLog.length-1]`);
const approx = (a, b, e) => Math.abs(a - b) <= (e || 0.01);

/* initThree como en el arranque real (world.js declara let scene; sin esto es undefined) */
R(`initThree(); Particles.init();`);

/* ================= escenario base ================= */
function freshWorld() {
  R(`SAVE.coins=2000; SAVE.lots={};`);
  R(`LEVEL={idx:3,group:new THREE.Group(),platforms:[],sweepers:[],coins:[],checkpoints:[],killY:-60}; MODE='play';`);
  R(`try{ if(!Avatar.group) Avatar.build(); }catch(e){}`);
  R(`Player.reset(65,0,-90); Player.heading=0;`);
  R(`LotSystem.buyLot(3, LotSystem.LOTS[3][0]);`); // immo-1: (65,-90) w20 d16
  R(`Furniture.buildForLevel(3, LEVEL.group);`);
  R(`__toastLog.length=0; window.__carried=null;`);
}
freshWorld();
ok(R(`LotSystem.isOwned(3,'immo-1')`) === true, 'setup: lote immo-1 comprado');
ok(R(`Player.pose`) === 'stand', 'setup: el jugador empieza de pie');
ok(R(`!!(Avatar.group.userData.parts && Avatar.group.userData.parts.legL)`) === true, 'setup: el avatar tiene piernas');

/* ================= sentarse ================= */
R(`SAVE.coins=2000; Furniture.buy('chair');`); // se coloca frente al jugador (65,-87.6)
const chairX = R(`SAVE.lots[3]['immo-1'].furniture[0].x`), chairZ = R(`SAVE.lots[3]['immo-1'].furniture[0].z`);
R(`Player.pos.x=${chairX}; Player.pos.z=${chairZ};`);
ok(R(`Furniture.nearSeat() && Furniture.nearSeat().item.rec.type`) === 'chair', 'nearSeat: detecta la silla a < 2.2m');
const ref = R(`Furniture.poseRefFor(Furniture.nearSeat())`);
ok(!!ref && approx(ref.useH, 0.53) && ref.ry != null && ref.gy != null, 'poseRefFor: trae {x,z,ry,useH,gy,front} con la altura del asiento');
ok(R(`Player.sit(Furniture.poseRefFor(Furniture.nearSeat()))`) === true, 'sit: sentarse en la silla devuelve true');
ok(R(`Player.pose`) === 'sit', 'sit: la pose cambia a "sit"');
ok(approx(R(`Avatar.group.userData.parts.legL.rotation.x`), -1.5), 'sit: las piernas se doblan (-1.5 rad)');
ok(approx(R(`Avatar.group.position.y`), ref.gy + ref.useH - 0.82), 'sit: el avatar queda a la altura del asiento');
ok(R(`Player.sit(Furniture.poseRefFor(Furniture.nearSeat()))`) === false, 'sit: ya sentado no se puede volver a sentar');
ok(R(`Furniture.nearSeat()`) === null, 'nearSeat: sentado no ofrece volver a sentarse');

// levantarse
ok(R(`Player.standUp()`) === true, 'standUp: levantarse devuelve true');
ok(R(`Player.pose`) === 'stand', 'standUp: la pose vuelve a "stand"');
ok(approx(Math.hypot(R(`Player.pos.x`) - chairX, R(`Player.pos.z`) - chairZ), ref.front, 0.05), 'standUp: da un pasito al frente del mueble');
R(`updatePlayer(0.016,{x:0,z:0});`);
ok(approx(R(`Avatar.group.userData.parts.legL.rotation.x`), 0), 'standUp: tras un cuadro las piernas vuelven a 0 (animación manda)');
ok(R(`Player.standUp()`) === false, 'standUp: de pie no hace nada');

// el joystick levanta automáticamente
R(`Player.pos.x=${chairX}; Player.pos.z=${chairZ}; Player.sit(Furniture.poseRefFor(Furniture.nearSeat()));`);
ok(R(`Player.pose`) === 'sit', 'setup: sentado de nuevo para probar el joystick');
R(`updatePlayer(0.016,{x:0,z:1});`);
ok(R(`Player.pose`) === 'stand', 'joystick: mover el joystick levanta al jugador');

// el salto levanta automáticamente
R(`Player.pos.x=${chairX}; Player.pos.z=${chairZ}; Player.sit(Furniture.poseRefFor(Furniture.nearSeat()));`);
R(`tryJump(); updatePlayer(0.016,{x:0,z:0});`);
ok(R(`Player.pose`) === 'stand', 'salto: el botón de saltar levanta al jugador');

// reconstruir el avatar re-aplica la pose
R(`Player.pos.x=${chairX}; Player.pos.z=${chairZ}; Player.sit(Furniture.poseRefFor(Furniture.nearSeat())); Avatar.build();`);
ok(R(`Player.pose`) === 'sit', 'rebuild: la pose se conserva al reconstruir el avatar');
ok(approx(R(`Avatar.group.userData.parts.legL.rotation.x`), -1.5), 'rebuild: las piernas siguen dobladas tras reconstruir');
R(`Player.standUp();`);

/* ================= acostarse ================= */
freshWorld(); // solo la cama, sin la silla de la sección anterior
R(`SAVE.coins=2000; Player.pos.x=65; Player.pos.z=-90; Player.heading=0; Furniture.buy('bed');`);
const bedX = R(`SAVE.lots[3]['immo-1'].furniture[0].x`), bedZ = R(`SAVE.lots[3]['immo-1'].furniture[0].z`);
R(`Player.pos.x=${bedX}; Player.pos.z=${bedZ};`);
ok(R(`Furniture.nearBed() && Furniture.nearBed().item.rec.type`) === 'bed', 'nearBed: detecta la cama a < 2.2m');
ok(R(`Furniture.nearSeat()`) === null, 'nearSeat: la cama NO es sentable');
const bedRef = R(`Furniture.poseRefFor(Furniture.nearBed())`);
ok(approx(bedRef.useH, 0.75), 'poseRefFor: la cama trae la altura del colchón');
ok(R(`Player.lieDown(Furniture.poseRefFor(Furniture.nearBed()))`) === true, 'lieDown: acostarse devuelve true');
ok(R(`Player.pose`) === 'lie', 'lieDown: la pose cambia a "lie"');
ok(approx(R(`Avatar.group.rotation.x`), -Math.PI / 2), 'lieDown: el cuerpo queda horizontal');
ok(approx(R(`Avatar.group.position.y`), bedRef.gy + bedRef.useH + 0.30), 'lieDown: el avatar queda sobre el colchón');
R(`updatePlayer(0.016,{x:1,z:0});`);
ok(R(`Player.pose`) === 'stand', 'joystick: también levanta al jugador acostado');

/* ================= proximidad: sofá y límites ================= */
freshWorld();
R(`SAVE.coins=2000; Player.pos.x=65; Player.pos.z=-90; Player.heading=0;`);
R(`Furniture.buy('sofa');`);
const sofaX = R(`SAVE.lots[3]['immo-1'].furniture[0].x`), sofaZ = R(`SAVE.lots[3]['immo-1'].furniture[0].z`);
R(`Player.pos.x=${sofaX}; Player.pos.z=${sofaZ};`);
ok(R(`Furniture.nearSeat() && Furniture.nearSeat().item.rec.type`) === 'sofa', 'nearSeat: también detecta el sofá');
R(`Player.pos.x=200; Player.pos.z=200;`);
ok(R(`Furniture.nearSeat()`) === null, 'nearSeat: lejos (> 2.2m) → null');
ok(R(`Furniture.nearBed()`) === null, 'nearBed: lejos (> 2.2m) → null');

/* ================= ✋ mover muebles ================= */
freshWorld();
R(`SAVE.coins=2000; Player.pos.x=65; Player.pos.z=-90; Player.heading=0;`);
R(`Furniture.buy('table');`); // la mesa NO es sentable
const tblX = R(`SAVE.lots[3]['immo-1'].furniture[0].x`), tblZ = R(`SAVE.lots[3]['immo-1'].furniture[0].z`);
R(`Player.pos.x=${tblX}; Player.pos.z=${tblZ};`);
ok(R(`Furniture.nearFurniture() && Furniture.nearFurniture().item.rec.type`) === 'table', 'nearFurniture: detecta la mesa a < 2.8m');
ok(R(`Furniture.nearSeat()`) === null, 'nearSeat: la mesa no es sentable');
const found = R(`Furniture.nearFurniture()`);
ok(R(`Furniture.startMove(Furniture.nearFurniture())`) === true, 'startMove: poner en modo mover devuelve true');
ok(R(`Furniture.isMoving()`) === true, 'isMoving: true mientras se mueve');
ok(R(`LEVEL.platforms.filter(p=>p.kind==='furn').length`) === 0, 'startMove: el colisionador del mueble se retira mientras se mueve');
ok(R(`Furniture.nearFurniture()`) === null, 'nearFurniture: el mueble en movimiento no se detecta a sí mismo');

// el fantasma sigue al jugador (solo a posiciones válidas)
R(`Player.heading=0; Furniture.update(0.016);`);
ok(approx(R(`Furniture.moving.entry.group.position.x`), R(`Player.pos.x`) + Math.sin(0) * 2.4) &&
   approx(R(`Furniture.moving.entry.group.position.z`), R(`Player.pos.z`) + Math.cos(0) * 2.4),
  'mover: el fantasma sigue al jugador a 2.4u al frente');

// no sale del lote: junto al borde, el fantasma no avanza a posición inválida
const beforeX = R(`Furniture.moving.entry.group.position.x`), beforeZ = R(`Furniture.moving.entry.group.position.z`);
R(`Player.pos.x=74; Player.pos.z=-90; Player.heading=${Math.PI / 2}; Furniture.update(0.016);`);
ok(R(`!Furniture._spotOk(Furniture._defOf(3,'immo-1'), FURN_DEF['table'], 0, Player.pos.x + Math.sin(Player.heading)*2.4, Player.pos.z + Math.cos(Player.heading)*2.4)`) === true,
  'setup: el punto frente al jugador junto al borde queda fuera del lote');
ok(approx(R(`Furniture.moving.entry.group.position.x`), beforeX) &&
   approx(R(`Furniture.moving.entry.group.position.z`), beforeZ),
  'mover: el fantasma NO avanza a una posición inválida fuera del lote');

// ✅ colocar: guarda la nueva posición en SAVE
R(`Player.pos.x=60; Player.pos.z=-86; Player.heading=0; Furniture.update(0.016);`);
const putX = R(`Furniture.moving.entry.group.position.x`), putZ = R(`Furniture.moving.entry.group.position.z`);
ok(R(`Furniture.placeMove()`) === true, 'placeMove: colocar devuelve true');
ok(R(`Furniture.isMoving()`) === false, 'placeMove: sale del modo mover');
ok(approx(R(`SAVE.lots[3]['immo-1'].furniture[0].x`), putX) && approx(R(`SAVE.lots[3]['immo-1'].furniture[0].z`), putZ),
  'placeMove: SAVE.lots guarda la nueva posición del mueble');
ok(R(`LEVEL.platforms.filter(p=>p.kind==='furn').length`) === 1, 'placeMove: el colisionador queda sincronizado (1 mueble = 1 colisionador)');
ok(R(`Furniture._placed['3:immo-1'].length`) === 1, 'placeMove: el registro activo tiene el mueble re-spawneado');
ok(R(`Furniture.placeMove()`) === false, 'placeMove: sin modo mover devuelve false');
ok(R(`Furniture.cancelMove()`) === false, 'cancelMove: sin modo mover devuelve false');

// cancelar: vuelve al sitio original
R(`Player.pos.x=${putX}; Player.pos.z=${putZ};`);
R(`Furniture.startMove(Furniture.nearFurniture());`);
R(`Player.pos.x=62; Player.pos.z=-84; Player.heading=0; Furniture.update(0.016);`);
ok(R(`Furniture.cancelMove()`) === true, 'cancelMove: cancelar devuelve true');
ok(approx(R(`Furniture._placed['3:immo-1'][0].group.position.x`), putX) &&
   approx(R(`Furniture._placed['3:immo-1'][0].group.position.z`), putZ),
  'cancelMove: el mueble vuelve a su sitio original');
ok(approx(R(`SAVE.lots[3]['immo-1'].furniture[0].x`), putX),
  'cancelMove: SAVE conserva la posición original (el registro nunca cambió)');
ok(R(`LEVEL.platforms.filter(p=>p.kind==='furn').length`) === 1, 'cancelMove: el colisionador original se restaura');

// reconstruir el nivel cancela el modo mover de forma segura
R(`Furniture.startMove(Furniture.nearFurniture()); Furniture.buildForLevel(3, LEVEL.group);`);
ok(R(`Furniture.isMoving()`) === false, 'buildForLevel: cancela el modo mover al reconstruir');

/* ================= compatibilidad: agarrar → soltar ================= */
freshWorld();
const coinsBefore = R(`SAVE.coins`); // 2000 - 400 del lote
R(`TOUCHABLES.push({ o: (function(){ const m = new THREE.Mesh(new THREE.BoxGeometry(0.3,0.3,0.3), new THREE.Mesh(new THREE.Color(1,0,0))); LEVEL.group.add(m); return m; })(),
  name: 'Pelota', price: 0, emoji: '⚽', kind: 'decor', home: { parent: LEVEL.group, x: 1, y: 0.22, z: 1 } });`);
const ball = R(`TOUCHABLES[TOUCHABLES.length-1]`);
R(`pickupItem(TOUCHABLES[TOUCHABLES.length-1]);`);
ok(R(`!!window.__carried`) === true, 'agarrar: pickupItem deja el objeto en la mano');
R(`dropItem(70, -80);`);
ok(R(`window.__carried`) === null, 'soltar: dropItem libera la mano');
ok(approx(R(`TOUCHABLES[TOUCHABLES.length-1].o.position.x`), 70) && approx(R(`TOUCHABLES[TOUCHABLES.length-1].o.position.z`), -80),
  'soltar: el objeto conserva su nueva posición en la sesión (se puede mover de lugar)');
ok(R(`SAVE.coins`) === coinsBefore, 'compatibilidad: soltar un objeto de casa no toca las monedas ni el flujo de compra');

console.log('\n----------------------------------------');
console.log('sittest: ' + pass + ' OK, ' + fail + ' fallidas');
process.exit(fail ? 1 : 0);
