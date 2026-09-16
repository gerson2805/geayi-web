/* Prueba de CABALLOS LIBRES (ranch.js): 2 caballos de paseo montables
   (Trueno junto al rancho, Canela en la zona tranquila), montar/mover con el
   joystick, paseo más lento que la carrera, la carrera y los rivales intactos,
   y bajar deja al jugador junto al caballo en el suelo.
   Sigue el patrón de tests/jobtest.js (stubs THREE/DOM + R()). */
const fs = require('fs'), vm = require('vm');
require(__dirname + '/stubs.js');
const DIR = '/home/hatch/workspace/your_files/obby-3d/';
const FILES = ['state.js', 'i18n.js', 'audio.js', 'vehicles.js', 'world.js', 'neoncity.js', 'family.js',
  'player.js', 'online.js', 'travel.js', 'phase3.js', 'trophies.js',
  'casa.js', 'pets.js', 'fishing.js', 'racing.js', 'weather.js', 'observatory.js', 'ranch.js'];
for (const f of FILES) {
  try {
    vm.runInContext(fs.readFileSync(DIR + f, 'utf8'), sandbox, { filename: f });
  } catch (e) {
    console.log('  ✗ ERROR cargando ' + f + ': ' + e.message);
    process.exit(1);
  }
}
console.log('carga: 18 archivos sin errores');

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; } else { fail++; console.log('  ✗ FAIL:', name); }
}
R('initThree(); Particles.init(); Avatar.build();');
R(`MODE='play'; LEVEL = buildLevel(3); Player.reset(30,2,118);`);
R(`for (let i=0;i<10;i++) updateRanch(0.016);`); // estabilizar

// --- 1. hay 3 caballos montables: 1 de carreras + 2 de paseo ---
ok(R(`Ranch.built === true`), 'ranch: construido en mundo idx 3');
ok(R(`Ranch.horse && Ranch.horse.kind === 'race'`), 'ranch: el caballo de carreras sigue siendo solo 1');
ok(R(`Ranch.ride.length === 2`), 'ranch: 2 caballos de paseo (Trueno y Canela)');
ok(R(`Ranch.ride[0].key === 'ranch.rideHorse1' && Ranch.ride[1].key === 'ranch.rideHorse2'`),
  'ranch: nombres Trueno / Canela');
ok(R(`Ranch.ride.every(h => h.kind === 'ride' && h.group && h.legs.length === 4 && h.neck && h.tail)`),
  'ranch: paseo con malla, 4 patas, pivote de cuello y cola');
ok(R(`typeof T('ranch.ride2') === 'string' && T('ranch.ride2').length > 3`), 'i18n: ranch.ride2 existe (es)');

// --- 2. los caballos no nacen chocando con edificios (verificado contra LEVEL.houses) ---
ok(R(`(function(){
  const pts = Ranch.ride.map(h => [h.pos.x, h.pos.z]);
  return pts.every(([x,z]) => LEVEL.houses.every(h => Math.hypot(h.x - x, h.z - z) > 7));
})()`), 'ranch: paseo a >7 m de cualquier casa registrada');
ok(R(`Ranch.ride[0].pos.x === 70 && Ranch.ride[0].pos.z === 125`), 'ranch: Trueno en (70,125), junto al rancho');
ok(R(`Ranch.ride[1].pos.x === 132 && Ranch.ride[1].pos.z === 128`), 'ranch: Canela en (132,128), zona tranquila');

// --- 3. subir al caballo de paseo funciona ---
R(`Player.pos.set(70, 0.02, 124);`); // junto a Trueno
R(`ranchMount();`);
ok(R(`Ranch.riding === true && Ranch.mount === Ranch.ride[0]`), 'paseo: SUBIR monta a Trueno');
ok(R(`Ranch.mount.kind === 'ride'`), 'paseo: la montura es de tipo ride');

// --- 4. el jugador se mueve con el caballo (joystick) y el paseo es más lento que la carrera ---
// (adelante = z:+1, como el joystick real; la física de dirección es la original)
R(`readInput = function(){ return { x: 0, z: 1 }; }; Player.camYaw = 0;`);
const px0 = R(`Ranch.mount.pos.x`), pz0 = R(`Ranch.mount.pos.z`);
R(`for (let i=0;i<90;i++) updateRanch(0.016);`);
const paseoMoved = Math.hypot(R(`Ranch.mount.pos.x`) - px0, R(`Ranch.mount.pos.z`) - pz0);
ok(paseoMoved > 2 && paseoMoved < 10,
  'paseo: el caballo avanza con el joystick (' + paseoMoved.toFixed(1) + ' m, ritmo tranquilo)');
ok(R(`Math.abs(Player.pos.x - Ranch.mount.pos.x) < 0.01`), 'paseo: el jugador va sentado en el caballo');

// --- 5. el caballo de paseo NO activa la carrera aunque cruce la meta ---
R(`(function(){ Ranch.mount.pos.set(Ranch.track.gate.x, 0, Ranch.track.gate.z);
  Ranch.mount.vel.set(0,0,0); })();`);
R(`for (let i=0;i<60;i++) updateRanch(0.016);`);
ok(R(`Ranch.race.state === 'idle'`), 'paseo: cruzar la meta NO inicia cronómetro ni carrera');

// --- 6. bajar deja al jugador junto al caballo, en el suelo ---
R(`ranchDismount();`);
ok(R(`Ranch.riding === false && Ranch.mount === null`), 'paseo: BAJAR desmonta');
ok(Math.abs(R(`Player.pos.y`) - 0.02) < 0.01 && R(`Player.grounded`) === true,
  'paseo: el jugador queda en el suelo (y=0.02)');
ok(R(`Math.hypot(Player.pos.x - Ranch.ride[0].pos.x, Player.pos.z - Ranch.ride[0].pos.z) < 3`),
  'paseo: el jugador queda junto al caballo (<3 m)');
ok(R(`Ranch.ride[0].bounds.x1 === 42 && Ranch.ride[0].bounds.z2 === 164`),
  'paseo: Trueno limitado a su zona (rancho)');

// --- 7. la carrera sigue intacta: caballo rápido + rivales + vueltas ---
ok(R(`Ranch.track.wps.length === 12`), 'carrera: 12 waypoints del óvalo');
ok(R(`Ranch.rivals.length === 3`), 'carrera: 3 robots rivales');
const th0 = R(`Ranch.rivals[0].theta`);
R(`for (let i=0;i<60;i++) updateRanch(0.016);`);
ok(R(`Ranch.rivals[0].theta`) > th0, 'carrera: los rivales siguen dando vueltas');
R(`Player.pos.set(50, 0.02, 144); ranchMount();`); // junto al caballo de carreras
ok(R(`Ranch.riding === true && Ranch.mount === Ranch.horse`), 'carrera: SUBIR monta el caballo de carreras');
const rpx0 = R(`Ranch.mount.pos.x`), rpz0 = R(`Ranch.mount.pos.z`);
R(`for (let i=0;i<90;i++) updateRanch(0.016);`);
const raceMoved = Math.hypot(R(`Ranch.mount.pos.x`) - rpx0, R(`Ranch.mount.pos.z`) - rpz0);
ok(raceMoved > paseoMoved, 'carrera: el caballo de carreras es más rápido (' +
  raceMoved.toFixed(1) + ' m vs ' + paseoMoved.toFixed(1) + ' m de paseo)');

// --- 8. la carrera completa funciona: cuenta atrás → vueltas → meta → récord ---
R(`readInput = function(){ return { x: 0, z: 0 }; };`); // sin input: teletransporte por waypoints
R(`(function(){ Ranch.mount.pos.set(Ranch.track.gate.x, 0, Ranch.track.gate.z);
  Ranch.mount.vel.set(0,0,0); })();`);
R(`for (let i=0;i<230;i++) updateRanch(0.016);`); // 3.68 s > cuenta atrás de 3.2 s
ok(R(`Ranch.race.state`) === 'racing', 'carrera: tras la cuenta atrás empieza (racing)');
R(`(function(){ var T0 = Ranch.track, M = Ranch.mount;
  for (var rep = 0; rep < 2; rep++) {
    for (var k = 1; k <= T0.wps.length; k++) {
      var w = T0.wps[k % T0.wps.length];
      M.pos.set(w.x, 0, w.z); M.vel.set(0, 0, 0);
      for (var i = 0; i < 5; i++) updateRanch(0.016);
    }
  }
})();`);
ok(R(`Ranch.race.state`) === 'done', 'carrera: 2 vueltas completas → estado done');
ok(R(`SAVE.bestHorse != null && SAVE.bestHorse > 0`), 'carrera: se guardó el récord (SAVE.bestHorse)');
R(`ranchDismount();`);
ok(R(`Ranch.riding === false`), 'carrera: BAJAR tras la carrera funciona');

// --- 9. los caballos de paseo deambulan/pastan solos sin errores ---
const idlePos = R(`[Ranch.ride[0].pos.x, Ranch.ride[0].pos.z].join(',')`);
R(`for (let i=0;i<300;i++) updateRanch(0.016);`); // 5 s de vida libre
ok(true, 'paseo: 300 cuadros de deambulado/pastoreo sin errores');
ok(R(`[Ranch.ride[0].pos.x, Ranch.ride[0].pos.z].join(',')`) !== idlePos ||
   R(`Ranch.ride[0].pause > 0 || Ranch.ride[0].neck.rotation.x !== 0`),
  'paseo: Trueno deambula o pasta (cabeza/posición cambian)');
ok(R(`typeof Ranch.ride[1].neck.rotation.x === 'number' && typeof Ranch.ride[1].tail.rotation.z === 'number'`),
  'paseo: animación de cabeza/cola activa en Canela');

console.log(`\nRESULTADO: ${pass} OK, ${fail} FALLOS`);
process.exit(fail ? 1 : 0);
