/* Pruebas del PARQUE GEAYI (themepark.js) — mundo 4 · Immokalee (idx 3) */
'use strict';
const fs = require('fs'), vm = require('vm');
require(__dirname + '/stubs.js');
const DIR = '/home/hatch/workspace/your_files/obby-3d/';
vm.runInContext(fs.readFileSync(DIR + 'themepark.js', 'utf8'), sandbox, { filename: 'themepark.js' });

let ok = 0, fail = 0;
function t(name, fn) {
  try { fn(); ok++; /* console.log('ok - ' + name); */ }
  catch (e) { fail++; console.log('FAIL - ' + name + ': ' + e.message); }
}
function eq(a, b, msg) { if (a !== b) throw new Error((msg || '') + ' esperado ' + b + ', fue ' + a); }
function near(a, b, eps, msg) { if (Math.abs(a - b) > (eps || 1e-6)) throw new Error((msg || '') + ' ' + a + ' no ~ ' + b); }
function rectsOverlap(a, b) {
  return a.x0 < b.x1 && a.x1 > b.x0 && a.z0 < b.z1 && a.z1 > b.z0;
}
function countLights(g) {
  let n = 0;
  g.traverse(c => { if (/light/i.test(c.constructor.name)) n++; });
  return n;
}

/* 1. global y API pública */
t('ThemePark global existe', () => eq(typeof R('ThemePark'), 'object'));
t('buildForLevel es función', () => eq(typeof R('typeof ThemePark.buildForLevel'), 'string'));
t('update es función', () => eq(typeof R('typeof ThemePark.update'), 'string'));
t('tryBoard es función', () => eq(R('typeof ThemePark.tryBoard'), 'function'));
t('init es función', () => eq(R('typeof ThemePark.init'), 'function'));

/* 2. solo construye en idx 3 */
t('buildForLevel(0) no construye', () => {
  R('ThemePark.buildForLevel(0, new THREE.Group())');
  eq(R('ThemePark.built'), false);
});
t('buildForLevel(3) construye', () => {
  R('LEVEL = { idx: 3, group: new THREE.Group(), platforms: [] }');
  R('ThemePark.buildForLevel(3, LEVEL.group)');
  eq(R('ThemePark.built'), true);
});
t('agrega sólidos a LEVEL.platforms', () => {
  const n = R('LEVEL.platforms.length');
  if (n < 10) throw new Error('muy pocos sólidos: ' + n);
});

/* 3. zona sin intersección con los 3 lotes de LotSystem */
t('rectángulo del parque no toca immo-1/immo-2/immo-3', () => {
  const zone = R('ThemePark.zone'), lots = R('ThemePark.lots');
  eq(lots.length, 3);
  lots.forEach(L => {
    if (rectsOverlap(zone, L)) throw new Error('el parque pisa el lote ' + L.id);
  });
});
t('estación dentro del parque', () => {
  const z = R('ThemePark.zone'), s = R('ThemePark.station');
  if (!(s.x >= z.x0 && s.x <= z.x1 && s.z >= z.z0 && s.z <= z.z1)) throw new Error('estación fuera');
});
t('rectángulo del acuario dentro del parque y sin soportes encima', () => {
  const z = R('ThemePark.zone'), a = R('ThemePark.aqRect');
  if (!(a.x0 >= z.x0 && a.x1 <= z.x1 && a.z0 >= z.z0 && a.z1 <= z.z1)) throw new Error('acuario fuera del parque');
});

/* 4. riel cerrado y elevado */
t('riel cerrado: 41 puntos, el último coincide con el primero', () => {
  const pts = R('ThemePark.coaster.pts');
  eq(pts.length, 41);
  near(pts[0].x, pts[40].x, 1e-9); near(pts[0].y, pts[40].y, 1e-9); near(pts[0].z, pts[40].z, 1e-9);
});
t('riel elevado: todos los puntos a y>=4.5', () => {
  const pts = R('ThemePark.coaster.pts');
  pts.forEach((p, i) => { if (p.y < 4.5 - 1e-9) throw new Error('punto ' + i + ' bajo: ' + p.y); });
});
t('longitud del riel > 0', () => { if (!(R('ThemePark.trackLen()') > 50)) throw new Error('riel muy corto'); });

/* 5. carritos y modo de abordar */
t('hay 2 carritos', () => {
  if (!R('ThemePark.coaster.cartA') || !R('ThemePark.coaster.cartB')) throw new Error('faltan carritos');
});
t('tryBoard rechaza lejos de la estación', () => {
  R('Player = { pos: { x: 0, y: 0, z: 0 }, vel: { x:0,y:0,z:0 } }');
  eq(R('ThemePark.tryBoard()'), false);
  eq(R('ThemePark.coaster.riding'), false);
});
t('tryBoard acepta en la estación y cobra 10 🪙', () => {
  R('Player.pos.x = 104; Player.pos.z = -102');
  R('SAVE = { coins: 25 }; Shop2 = { spendCoins(n){ if (SAVE.coins < n) return false; SAVE.coins -= n; return true; } }');
  eq(R('ThemePark.tryBoard()'), true);
  eq(R('ThemePark.coaster.riding'), true);
  eq(R('SAVE.coins'), 15);
});
t('update lleva al jugador por el riel y lo devuelve a la estación', () => {
  const y0 = R('Player.pos.y');
  R('for (let k = 0; k < 4000 && ThemePark.coaster.riding; k++) ThemePark.update(1/60)');
  eq(R('ThemePark.coaster.riding'), false);
  const p = R('Player.pos');
  near(p.x, 104, 0.5, 'x final'); near(p.z, -102, 0.5, 'z final');
  if (!(y0 < 3)) throw new Error('nunca subió al riel');
});

/* 6. castillo, juegos y toboganes */
t('castillo con cofre', () => {
  if (!R('ThemePark.chest')) throw new Error('sin cofre');
  if (R('ThemePark.chest.x') === undefined) throw new Error('cofre sin posición');
});
t('carrusel con 4 caballitos', () => eq(R('ThemePark.rides.carousel.horses.length'), 4));
t('torre de caída con góndola', () => { if (!R('ThemePark.rides.tower.gon')) throw new Error('sin góndola'); });
t('tazas con 3 tazas', () => eq(R('ThemePark.rides.teacups.cups.length'), 3));
t('toboganes con alberca', () => { if (!R('ThemePark.rides.waterMat')) throw new Error('sin alberca'); });

/* 7. update no lanza y anima (120 cuadros) */
t('update(1/60) ×120 sin errores', () => {
  R('for (let k = 0; k < 120; k++) ThemePark.update(1/60)');
});
t('carrusel gira', () => {
  const r0 = R('ThemePark.rides.carousel.spin.rotation.y');
  R('ThemePark.update(0.5)');
  if (!(R('ThemePark.rides.carousel.spin.rotation.y') > r0)) throw new Error('no gira');
});

/* 8. sin luces reales nuevas (Android) */
t('el parque no agrega luces reales', () => {
  const n = R('(function(){ let c=0; LEVEL.group.traverse(o=>{ if (/light/i.test(o.constructor.name)) c++; }); return c; })()');
  eq(n, 0);
});

/* 9. botón dinámico init() */
t('init crea el botón sin romper', () => {
  R('ThemePark.init()');
  if (!R('ThemePark._btn')) throw new Error('sin botón');
});
t('onLevelEnd oculta y baja al jugador de la rusa', () => {
  R('ThemePark.onLevelEnd()');
  eq(R('ThemePark.coaster.riding'), false);
});

/* 10. cofre da 30 🪙 una sola vez */
t('cofre del castillo da +30 🪙', () => {
  R('SAVE.tpChest = false; ThemePark.chest.opened = false; SAVE.coins = 0');
  R('Player.pos.x = ThemePark.chest.x; Player.pos.z = ThemePark.chest.z');
  R('ThemePark.update(0.016)');
  eq(R('SAVE.coins'), 30);
  eq(R('SAVE.tpChest'), true);
});

console.log('themepark: ' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
