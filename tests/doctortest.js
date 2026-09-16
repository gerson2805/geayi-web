/* Prueba del hospital interactivo (citylife2.js: trabajo de doctor) y de la
   ambulancia abordable + rescates (citylife1.js).
   - turno de doctor: llega paciente, diagnóstico correcto +10 🪙, incorrecto no paga ni cura
   - tratamiento completo: +15 🪙 + reputación (SAVE.doctorRep)
   - paciente impaciente: se va molesto y la reputación baja
   - ambulancia: SUBIR (LEVEL.cars), recoger paciente del 📍 y llevarlo al hospital = +25 🪙
   Sigue el patrón de jobtest.js (stubs THREE/DOM + vm). */
const fs = require('fs'), vm = require('vm');
require(__dirname + '/stubs.js');
const DIR = '/home/hatch/workspace/your_files/obby-3d/';
const FILES = ['state.js', 'i18n.js', 'audio.js', 'vehicles.js', 'world.js', 'family.js',
  'player.js', 'online.js', 'travel.js', 'phase3.js', 'trophies.js',
  'casa.js', 'pets.js', 'fishing.js', 'racing.js', 'weather.js', 'observatory.js', 'ranch.js',
  'jobs.js', 'neoncity.js', 'citylife1.js', 'citylife2.js'];
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
R('initThree(); Particles.init(); Avatar.build(); CityLife1.init(); CityLife2.init();');
R(`MODE='play'; LEVEL = buildLevel(3); Player.reset(-85,2,-86); SAVE.coins=1000; SAVE.doctorRep=0;`);
R('CityLife1.onLevelStart(3); CityLife2.onLevelStart(3);');

// --- ambulancia abordable registrada ---
ok(R(`!!CL1.ambDef && LEVEL.cars.indexOf(CL1.ambDef) >= 0`), 'ambulancia: def abordable en LEVEL.cars');
ok(R(`CL1.ambDef.kind === 'car' && CL1.ambDef.vtype === 'geayi-ambulance'`), 'ambulancia: kind car / vtype geayi-ambulance');
ok(R(`!!(typeof VEHICLE_TYPES !== 'undefined' && VEHICLE_TYPES['geayi-ambulance'])`), 'ambulancia: VEHICLE_TYPES registrada');
ok(R(`CityLife2.hospitalDoor() !== null`), 'hospital: CityLife2.hospitalDoor() expone la puerta');

// --- turno de doctor ---
R(`CL2.inside = 'hospital';`); // simula estar dentro del hospital
ok(R(`_c2docToggle() === true && CityLife2.docState().shift === true`), 'doctor: 👨‍⚕️ TRABAJAR inicia el turno');
ok(R(`_c2docToggle() === true && CityLife2.docState().shift === false`), 'doctor: ⏹️ TERMINAR TURNO lo termina');
R(`_c2docToggle();`); // reinicia el turno para las pruebas
ok(R(`_c2docMaxPatients() === 1`), 'doctor: con rep 0 llega 1 paciente como máximo');
R(`SAVE.doctorRep = 60;`);
ok(R(`_c2docMaxPatients() === 3`), 'doctor: con rep 60 llegan hasta 3 pacientes');
R(`SAVE.doctorRep = 0;`);

// --- diagnóstico correcto paga +10 ---
let pt = null;
try {
  R(`SAVE.coins = 100;`);
  pt = R(`_c2docSpawn('fever')`);
  ok(pt && R(`CL2.doc.patients[CL2.doc.patients.length-1].symptom`) === 'fever', 'doctor: paciente con fiebre 🤒');
  ok(R(`_c2docDiagnose(CL2.doc.patients[CL2.doc.patients.length-1], 'thermo')`) === true, 'doctor: diagnóstico correcto aceptado');
  ok(R(`SAVE.coins`) === 110, 'doctor: diagnóstico correcto paga +10 🪙');
  ok(R(`CL2.doc.patients[CL2.doc.patients.length-1].diag`) === true, 'doctor: paciente queda diagnosticado');
} catch (e) { ok(false, 'doctor: diagnóstico correcto → ' + e.message); }

// --- diagnóstico incorrecto: no paga ni cura ---
try {
  R(`SAVE.coins = 200;`);
  R(`_c2docSpawn('wound')`);
  const p2idx = R(`CL2.doc.patients.length - 1`);
  ok(R(`_c2docDiagnose(CL2.doc.patients[${p2idx}], 'thermo')`) === false, 'doctor: diagnóstico incorrecto rechazado');
  ok(R(`SAVE.coins`) === 200, 'doctor: diagnóstico incorrecto no paga');
  ok(R(`CL2.doc.patients[${p2idx}].diag`) === false, 'doctor: diagnóstico incorrecto no diagnostica');
} catch (e) { ok(false, 'doctor: diagnóstico incorrecto → ' + e.message); }

// --- tratamiento completo: +15 🪙 + reputación ---
try {
  R(`SAVE.coins = 300; SAVE.doctorRep = 0;`);
  const pidx = R(`CL2.doc.patients.length - 2`); // el de fiebre, ya diagnosticado
  ok(R(`_c2docTreat(CL2.doc.patients[${pidx}])`) === true, 'doctor: tratamiento aplicado');
  ok(R(`SAVE.coins`) === 315, 'doctor: paciente curado paga +15 🪙');
  ok(R(`SAVE.doctorRep`) === 4, 'doctor: reputación sube a 4');
  ok(R(`CL2.doc.patients[${pidx}].state`) === 'leaving', 'doctor: paciente curado se levanta feliz');
  // tratar sin diagnosticar no funciona
  const pidx2 = R(`CL2.doc.patients.length - 1`);
  ok(R(`_c2docTreat(CL2.doc.patients[${pidx2}])`) === false, 'doctor: sin diagnóstico no hay tratamiento');
} catch (e) { ok(false, 'doctor: tratamiento → ' + e.message); }

// --- propina con reputación alta (+2 por cada 25) ---
try {
  R(`SAVE.coins = 500; SAVE.doctorRep = 50;`);
  R(`_c2docSpawn('cough')`);
  const pi = R(`CL2.doc.patients.length - 1`);
  R(`_c2docDiagnose(CL2.doc.patients[${pi}], 'med')`); // +10 → 510
  R(`_c2docTreat(CL2.doc.patients[${pi}])`);           // +15 + propina 4 → 529
  ok(R(`SAVE.coins`) === 529, 'doctor: con rep 50 la propina es +4 🪙');
} catch (e) { ok(false, 'doctor: propina → ' + e.message); }

// --- paciente impaciente: se va molesto y la reputación baja ---
try {
  R(`SAVE.doctorRep = 10;`);
  R(`_c2docSpawn('fever')`);
  R(`(function(){ var ps = CL2.doc.patients; ps[ps.length-1].wait = 999; })()`);
  R(`_c2updateDoc(0.016)`);
  ok(R(`SAVE.doctorRep`) === 7, 'doctor: paciente molesto baja reputación -3');
  const last = R(`CL2.doc.patients[CL2.doc.patients.length-1]`);
  ok(last && last.state === 'leaving' && last.happy === false, 'doctor: paciente molesto se va');
} catch (e) { ok(false, 'doctor: paciente impaciente → ' + e.message); }

// --- rescate en ambulancia ---
let door = null, ri = null;
try {
  door = R(`CityLife2.hospitalDoor()`);
  ok(door && typeof door.x === 'number', 'rescate: puerta del hospital disponible');
  ok(R(`CityLife1.startRescue(${door.x}, ${door.z})`) === true, 'rescate: CityLife1.startRescue() inicia');
  ri = R(`CityLife1.rescueInfo()`);
  ok(ri && ri.stage === 'go', 'rescate: etapa "go" (ir al 📍)');
  const d = Math.hypot(ri.px - door.x, ri.pz - door.z);
  ok(d <= 60 && d >= 20, 'rescate: paciente a ≤60 m del hospital (' + d.toFixed(1) + ' m)');
} catch (e) { ok(false, 'rescate: inicio → ' + e.message); }

// --- abordar la ambulancia (botón SUBIR estándar) ---
try {
  R(`boardVehicle({type:'car', def: CL1.ambDef})`);
  ok(R(`Vehicle.mode === 'car' && Vehicle.def === CL1.ambDef`), 'ambulancia: SUBIR la aborda como carro');
  const ax0 = R(`CL1.amb.g.position.x`), az0 = R(`CL1.amb.g.position.z`);
  R(`CityLife1.update(1.0)`);
  ok(R(`CL1.amb.g.position.x`) === ax0 && R(`CL1.amb.g.position.z`) === az0,
    'ambulancia: abordada no la mueve el circuito');
} catch (e) { ok(false, 'rescate: abordar → ' + e.message); }

// --- conducir al 📍 y RECOGER ---
try {
  R(`CL1.amb.g.position.set(${ri.px}, 0, ${ri.pz})`);
  R(`CityLife1.update(0.016)`);
  ok(R(`CL1.actFor`) === 'rPick', 'rescate: cerca del paciente sale "🚑 RECOGER"');
  ok(R(`CityLife1.rescuePickup()`) === true, 'rescate: RECOGER sube al paciente');
  ok(R(`CityLife1.rescueInfo().stage`) === 'back', 'rescate: etapa "back" (volver al hospital)');
  ok(R(`CL1.amb.riderHead.visible`) === true, 'rescate: paciente visible en la ambulancia');
} catch (e) { ok(false, 'rescate: recoger → ' + e.message); }

// --- llevar al hospital y ENTREGAR: +25 🪙 ---
try {
  const c0 = R(`SAVE.coins`);
  R(`CL1.amb.g.position.set(${door.x}, 0, ${door.z})`);
  R(`CityLife1.update(0.016)`);
  ok(R(`CL1.actFor`) === 'rDrop', 'rescate: en el hospital sale "🏥 ENTREGAR"');
  ok(R(`CityLife1.rescueDrop()`) === true, 'rescate: ENTREGAR completa el rescate');
  ok(R(`SAVE.coins`) === c0 + 25, 'rescate: rescate completo paga +25 🪙');
  ok(R(`CityLife1.rescueInfo()`) === null, 'rescate: rescate limpio tras entregar');
  ok(R(`CL1.amb.riderHead.visible`) === false, 'rescate: cabezal del paciente oculto');
} catch (e) { ok(false, 'rescate: entregar → ' + e.message); }

// --- al bajarse, el circuito continúa desde donde quedó ---
try {
  R(`exitVehicle()`);
  ok(R(`Vehicle.mode`) === 'none', 'ambulancia: BAJAR funciona');
  R(`CityLife1.update(0.016)`);
  ok(R(`typeof CL1.amb.s === 'number' && !!CL1.amb`), 'ambulancia: circuito reanudado tras bajar');
} catch (e) { ok(false, 'rescate: bajar → ' + e.message); }

// --- terminar turno limpia pacientes ---
try {
  R(`_c2docToggle()`);
  ok(R(`CityLife2.docState().shift`) === false, 'doctor: turno terminado');
  ok(R(`CityLife2.docState().patients.length`) === 0, 'doctor: pacientes retirados al terminar');
} catch (e) { ok(false, 'doctor: fin de turno → ' + e.message); }

// --- 120 cuadros de update con turno + rescate activos, sin errores ---
try {
  R(`CL2.inside='hospital'; _c2docToggle(); CityLife1.startRescue(${door.x}, ${door.z});`);
  R(`(function(){ for (let i=0;i<120;i++){ CityLife1.update(0.016); updateCityLife2(0.016); } return true; })()`);
  ok(true, 'updates: 120 cuadros (turno + rescate) sin errores');
  R(`_c2docToggle(); CityLife1.cancelRescue();`);
} catch (e) { ok(false, 'updates: 120 cuadros → ' + e.message); }

// --- cambio de nivel limpia todo ---
try {
  R(`CityLife1.onLevelEnd(); CityLife2.onLevelEnd();`);
  ok(R(`CL1.ambDef === null && CL1.rescue === null`), 'limpieza: citylife1 resetea ambulancia/rescate');
  ok(R(`CityLife2.docState().shift === false`), 'limpieza: citylife2 termina el turno');
} catch (e) { ok(false, 'limpieza → ' + e.message); }

console.log(`\nRESULTADO: ${pass} OK, ${fail} FALLOS`);
process.exit(fail ? 1 : 0);
