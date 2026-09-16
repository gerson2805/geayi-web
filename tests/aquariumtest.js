/* Pruebas del ACUARIO GEAYI (aquarium.js) — atracción del Parque GEAYI, idx 3 */
'use strict';
const fs = require('fs'), vm = require('vm');
require(__dirname + '/stubs.js');
const DIR = '/home/hatch/workspace/your_files/obby-3d/';
vm.runInContext(fs.readFileSync(DIR + 'aquarium.js', 'utf8'), sandbox, { filename: 'aquarium.js' });

let ok = 0, fail = 0;
function t(name, fn) {
  try { fn(); ok++; }
  catch (e) { fail++; console.log('FAIL - ' + name + ': ' + e.message); }
}
function eq(a, b, msg) { if (a !== b) throw new Error((msg || '') + ' esperado ' + b + ', fue ' + a); }

/* 1. global y API */
t('Aquarium global existe', () => eq(typeof R('Aquarium'), 'object'));
t('buildForLevel es función', () => eq(R('typeof Aquarium.buildForLevel'), 'function'));
t('update es función', () => eq(R('typeof Aquarium.update'), 'function'));

/* 2. solo construye en idx 3 */
t('buildForLevel(0) no construye', () => {
  R('Aquarium.buildForLevel(0, new THREE.Group())');
  eq(R('Aquarium.built'), false);
});
t('buildForLevel(3) construye', () => {
  R('LEVEL = { idx: 3, group: new THREE.Group(), platforms: [] }; INTERIORS = []; CEILINGS = []');
  R('Aquarium.buildForLevel(3, LEVEL.group)');
  eq(R('Aquarium.built'), true);
});

/* 3. ubicación dentro del parque */
t('rectángulo del acuario (85-101, -87.5/-80.5)', () => {
  const r = R('Aquarium.rect');
  eq(r.x, 93); eq(r.z, -84); eq(r.w, 16); eq(r.d, 7);
  if (!(r.x - r.w / 2 >= 80 && r.x + r.w / 2 <= 106)) throw new Error('x fuera del parque');
  if (!(r.z - r.d / 2 >= -122 && r.z + r.d / 2 <= -72)) throw new Error('z fuera del parque');
});
t('se registra como interior entrable con techo ocultable', () => {
  eq(R('INTERIORS.length'), 1);
  const z = R('INTERIORS[0]');
  eq(z.cx, 93); eq(z.cz, -84);
  eq(R('CEILINGS.length'), 1);
});

/* 4. criaturas: peces, tiburones y tortugas */
t('hay 6 peces, 2 tiburones y 3 tortugas', () => {
  const c = R('Aquarium.creatures');
  const n = k => c.filter(x => x.sw.kind === k).length;
  eq(n('fish'), 6); eq(n('shark'), 2); eq(n('turtle'), 3);
});
t('cada criatura tiene parámetros de nado', () => {
  const c = R('Aquarium.creatures');
  c.forEach((x, i) => {
    ['a', 'rx', 'rz', 'y', 'spd', 'dir', 'ph', 'tf'].forEach(f => {
      if (typeof x.sw[f] !== 'number') throw new Error('criatura ' + i + ' sin ' + f);
    });
  });
});
t('peces y tiburones tienen cola animable', () => {
  const c = R('Aquarium.creatures');
  c.filter(x => x.sw.kind !== 'turtle').forEach((x, i) => {
    if (!x.grp.userData.parts.tail) throw new Error('sin cola ' + i);
  });
});
t('tortugas tienen 4 aletas animables', () => {
  const c = R('Aquarium.creatures');
  c.filter(x => x.sw.kind === 'turtle').forEach((x, i) => {
    const f = x.grp.userData.parts.flips;
    if (!f || f.length !== 4) throw new Error('tortuga ' + i + ' sin 4 aletas');
  });
});

/* 5. update anima sin errores */
t('update(1/60) ×200 sin errores', () => {
  R('for (let k = 0; k < 200; k++) Aquarium.update(1/60)');
});
t('las criaturas se mueven y las colas oscilan', () => {
  const a0 = R('Aquarium.creatures[0].sw.a');
  const tr0 = R('Aquarium.creatures[0].grp.userData.parts.tail.rotation.y');
  const p0 = R('Aquarium.creatures[0].grp.position.x');
  R('Aquarium.update(0.5)');
  if (!(R('Aquarium.creatures[0].sw.a') !== a0)) throw new Error('no avanza el ángulo');
  if (!(R('Aquarium.creatures[0].grp.position.x') !== p0)) throw new Error('no se desplaza');
  if (!(R('Aquarium.creatures[0].grp.userData.parts.tail.rotation.y') !== tr0)) throw new Error('la cola no oscila');
});
t('las aletas de tortuga se mueven', () => {
  const tu = R('Aquarium.creatures.filter(x=>x.sw.kind==="turtle")[0]');
  const r0 = tu.grp.userData.parts.flips[0].rotation.z;
  R('Aquarium.update(0.5)');
  const r1 = R('Aquarium.creatures.filter(x=>x.sw.kind==="turtle")[0].grp.userData.parts.flips[0].rotation.z');
  if (!(r1 !== r0)) throw new Error('aletas quietas');
});

/* 6. sin luces reales nuevas */
t('el acuario no agrega luces reales', () => {
  const n = R('(function(){ let c=0; LEVEL.group.traverse(o=>{ if (/light/i.test(o.constructor.name)) c++; }); return c; })()');
  eq(n, 0);
});

/* 7. tanque sólido (colisionador) */
t('los 3 tanques registran colisionador', () => {
  const n = R('LEVEL.platforms.length');
  if (n < 3) throw new Error('faltan colisionadores: ' + n);
});

console.log('aquarium: ' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
