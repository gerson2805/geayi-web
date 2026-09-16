/* Pruebas de motoboat.js (motos 🏍️, camiones 🚚 y lanchas 🛥️ GEAYI — Trabajador 6).
   Patrón lotstest/boattest: stubs THREE/DOM, carga vehicles.js ANTES que motoboat.js.
   Verifica: registro en VEHICLE_TYPES/VEHICLE_BUILDERS (sin romper los existentes),
   mallas originales que se construyen sin errores, spawn en los mundos correctos
   (motos en Neón idx 0, camiones + lanchas en Immokalee idx 3, nada en otros),
   lanchas sobre el agua del Lago Trafford y stats de manejo. */
'use strict';
const fs = require('fs');
const vm = require('vm');
require(__dirname + '/stubs.js'); // global.sandbox + global.R
const DIR = '/home/hatch/workspace/your_files/obby-3d/';
const FILES = ['state.js', 'i18n.js', 'audio.js', 'vehicles.js', 'motoboat.js'];
for (const f of FILES) {
  try {
    vm.runInContext(fs.readFileSync(DIR + f, 'utf8'), global.sandbox, { filename: f });
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

/* ============ 1. registro de los 3 tipos nuevos ============ */
console.log('— 1. registro');
const reg = R(`(function(){
  const m = VEHICLE_TYPES['geayi-moto'], t = VEHICLE_TYPES['geayi-truck'], l = VEHICLE_TYPES['geayi-lancha'];
  return {
    m: !!m, t: !!t, l: !!l,
    bm: typeof VEHICLE_BUILDERS['geayi-moto'] === 'function',
    bt: typeof VEHICLE_BUILDERS['geayi-truck'] === 'function',
    bl: typeof VEHICLE_BUILDERS['geayi-lancha'] === 'function',
    moto: m ? (m.maxSpeed + '/' + m.accel + '/' + m.emoji + ' ' + m.name) : '',
    truck: t ? (t.maxSpeed + '/' + t.accel + '/' + t.emoji + ' ' + t.name) : '',
    lancha: l ? (l.maxSpeed + '/' + l.accel + '/' + l.emoji + ' ' + l.name) : '',
    seatM: m && m.seatY, seatT: t && t.seatY, seatL: l && l.seatY,
  };
})()`);
ok(reg.m && reg.t && reg.l, 'los 3 tipos están en VEHICLE_TYPES');
ok(reg.bm && reg.bt && reg.bl, 'los 3 constructores están en VEHICLE_BUILDERS');
ok(reg.moto.indexOf('22/20') === 0 && reg.moto.indexOf('🏍️') > 0, 'moto: maxSpeed 22, accel 20, emoji 🏍️ (' + reg.moto + ')');
ok(reg.truck.indexOf('11/9') === 0 && reg.truck.indexOf('🚚') > 0, 'camión: maxSpeed 11, accel 9, emoji 🚚 (' + reg.truck + ')');
ok(reg.lancha.indexOf('18/15') === 0 && reg.lancha.indexOf('🛥️') > 0, 'lancha: maxSpeed 18, accel 15, emoji 🛥️ (' + reg.lancha + ')');
ok(reg.seatM === 0.85 && reg.seatT === 1.6 && reg.seatL === 0.55, 'seatY: moto 0.85, camión 1.6, lancha 0.55');
ok(reg.moto.indexOf('GEAYI') > 0 && reg.truck.indexOf('GEAYI') > 0 && reg.lancha.indexOf('GEAYI') > 0, 'los 3 nombres llevan marca GEAYI');

/* ============ 2. tipos existentes intactos ============ */
console.log('— 2. tipos existentes intactos');
const intact = R(`['geayi-pickup','geayi-gt','geayi-taxi','geayi-bus','geayi-boat','geayi-arrow','geayi-thunder','geayi-mower']
  .every(k => VEHICLE_TYPES[k] && typeof VEHICLE_BUILDERS[k] === 'function') &&
  ['geayi-drone','geayi-heli'].every(k => !!VEHICLE_TYPES[k])`);
ok(intact, 'pickup/gt/taxi/bus/boat/arrow/thunder/mower (+dron/heli en TYPES) siguen registrados');
const boatSpec = R(`VEHICLE_TYPES['geayi-boat'].maxSpeed`);
ok(boatSpec === 13, 'geayi-boat conserva su spec (maxSpeed 13)');

/* ============ 3. las mallas se construyen sin errores ============ */
console.log('— 3. mallas');
const meshes = R(`(function(){
  const out = {};
  try { out.moto = VEHICLE_BUILDERS['geayi-moto'](0x00e5ff); } catch (e) { out.motoErr = e.message; }
  try { out.truck = VEHICLE_BUILDERS['geayi-truck'](0x00b3a6); } catch (e) { out.truckErr = e.message; }
  try { out.lancha = VEHICLE_BUILDERS['geayi-lancha'](); } catch (e) { out.lanchaErr = e.message; }
  return {
    motoOk: !!out.moto && !out.motoErr, truckOk: !!out.truck && !out.truckErr, lanchaOk: !!out.lancha && !out.lanchaErr,
    motoWheels: out.moto ? (out.moto.userData.wheels || []).length : -1,
    truckWheels: out.truck ? (out.truck.userData.wheels || []).length : -1,
    lanchaKids: out.lancha ? out.lancha.children.length : -1,
    motoBadge: out.moto ? !!out.moto.userData.isGeayiBadge : false,
    truckBadge: out.truck ? !!out.truck.userData.isGeayiBadge : false,
    lanchaBadge: out.lancha ? !!out.lancha.userData.isGeayiBadge : false,
  };
})()`);
ok(meshes.motoOk, 'moto se construye sin errores' + (meshes.motoOk ? '' : ' (ver motoErr)'));
ok(meshes.truckOk, 'camión se construye sin errores');
ok(meshes.lanchaOk, 'lancha se construye sin errores');
ok(meshes.motoWheels === 2, 'moto tiene 2 ruedas giratorias (userData.wheels)');
ok(meshes.truckWheels === 6, 'camión tiene 6 ruedas giratorias');
ok(meshes.lanchaKids >= 15, 'lancha catamarán tiene estructura completa (' + meshes.lanchaKids + ' partes: 2 cascos, plataforma, T-top, motores…)');
ok(meshes.motoBadge && meshes.truckBadge && meshes.lanchaBadge, 'los 3 llevan insignia GEAYI');

/* ============ 4. spawn en Ciudad Neón (idx 0) ============ */
console.log('— 4. spawn Neón');
R(`LEVEL = { idx: 0, group: new THREE.Group(), cars: [] };`);
R(`MotoBoat.buildForLevel(0, LEVEL.group);`);
const neon = R(`(function(){
  const motos = LEVEL.cars.filter(c => c.vtype === 'geayi-moto');
  return {
    n: motos.length,
    kinds: motos.map(c => c.kind).join(','),
    speeds: motos.map(c => c.maxSpeed + '/' + c.accel).join(','),
    pos: motos.map(c => [c.mesh.position.x, c.mesh.position.z].join(',')).join(' | '),
    drivable: motos.every(c => c.taken === false),
  };
})()`);
ok(neon.n === 2, '2 motos spawneadas en Ciudad Neón');
ok(neon.kinds === 'car,car', 'motos usan kind "car" (avatar sentado al 55% con el sistema existente)');
ok(neon.speeds === '22/20,22/20', 'motos con maxSpeed 22 / accel 20');
ok(neon.pos === '11.5,-5 | 15,-5', 'motos en el estacionamiento 🅿 (11.5,-5) y (15,-5), fila libre z=-5');
ok(neon.drivable, 'motos marcadas manejables (taken=false, en LEVEL.cars)');

/* ============ 5. spawn en Immokalee (idx 3): camiones + lanchas ============ */
console.log('— 5. spawn Immokalee');
R(`LEVEL = { idx: 3, group: new THREE.Group(), cars: [] };`);
R(`MotoBoat.buildForLevel(3, LEVEL.group);`);
const immo = R(`(function(){
  const trucks = LEVEL.cars.filter(c => c.vtype === 'geayi-truck');
  const boats = LEVEL.cars.filter(c => c.vtype === 'geayi-lancha');
  const L = BOAT_LAKE;
  return {
    nt: trucks.length, nb: boats.length,
    tkind: trucks.map(c => c.kind).join(','), bkind: boats.map(c => c.kind).join(','),
    tspeed: trucks.map(c => c.maxSpeed).join(','),
    bspeed: boats.map(c => c.maxSpeed + '/' + c.accel).join(','),
    tpos: trucks.map(c => [c.mesh.position.x, c.mesh.position.z].join(',')).join(' | '),
    bpos: boats.map(c => [c.mesh.position.x.toFixed(1), c.mesh.position.z.toFixed(1)].join(',')).join(' | '),
    onWater: boats.every(c => Math.hypot(c.mesh.position.x - L.x, c.mesh.position.z - L.z) < L.r),
    waterY: boats.every(c => Math.abs(c.mesh.position.y - (L.waterY + 0.15)) < 0.001),
    wcx: boats.every(c => c.wcx === L.x && c.wcz === L.z),
  };
})()`);
ok(immo.nt === 2, '2 camiones spawneados en Immokalee');
ok(immo.nb === 2, '2 lanchas spawneadas en el Lago Trafford');
ok(immo.tkind === 'car,car' && immo.tspeed === '11,11', 'camiones kind "car", maxSpeed 11');
ok(immo.bkind === 'boat,boat' && immo.bspeed === '18/15,18/15', 'lanchas kind "boat", maxSpeed 18 / accel 15');
ok(immo.tpos === '78,-16 | 78,-32', 'camiones al oeste de las empacadoras (78,-16) y (78,-32) — zona libre documentada');
ok(immo.onWater, 'lanchas sobre el agua del lago (dentro del radio r=20 de (-78,18)): ' + immo.bpos);
ok(immo.waterY, 'lanchas a la altura del agua (waterY + 0.15)');
ok(immo.wcx, 'lanchas con centro de navegación = centro del lago (wcx/wcz)');

/* ============ 6. otros mundos: nada ============ */
console.log('— 6. otros mundos');
R(`LEVEL = { idx: 1, group: new THREE.Group(), cars: [] };`);
R(`MotoBoat.buildForLevel(1, LEVEL.group);`);
ok(R(`LEVEL.cars.length`) === 0, 'en el Volcán (idx 1) no spawnea nada');
R(`LEVEL = { idx: 5, group: new THREE.Group(), cars: [] };`);
R(`MotoBoat.buildForLevel(5, LEVEL.group);`);
ok(R(`LEVEL.cars.length`) === 0, 'en España (idx 5) no spawnea nada');

/* ============ 7. API pública y robustez ============ */
console.log('— 7. API');
ok(R(`typeof MotoBoat === 'object' && typeof MotoBoat.buildForLevel === 'function'`), 'MotoBoat.buildForLevel existe');
R(`MotoBoat.buildForLevel(0, null); MotoBoat.buildForLevel(3, undefined);`);
ok(true, 'buildForLevel no revienta con grupo nulo/indefinido');
R(`LEVEL = { idx: 0, group: new THREE.Group(), cars: [] }; MotoBoat.buildForLevel(0, LEVEL);`);
ok(R(`LEVEL.cars.filter(c=>c.vtype==='geayi-moto').length`) === 2, 'también acepta el objeto lvl completo (con .group y .cars)');

console.log('\n' + pass + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
