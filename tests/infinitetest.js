// infinitetest.js — 🌆 CALLES INFINITAS procedurales
// Verifica: determinismo del chunk, carga/descarga al mover al jugador,
// colisionadores se registran y se retiran, caminata larga sin errores ni
// crecimiento de memoria (chunks acotados), y que solo Ciudad Neón/Immokalee
// activan el sistema (otros mundos intactos).
const fs = require('fs'), vm = require('vm');
require('./stubs.js');
const DIR = __dirname + '/../';

let ok = 0, bad = 0;
const t = (name, cond) => { if (cond) { ok++; console.log('  ✅ ' + name); } else { bad++; console.log('  ❌ ' + name); } };

/* ---- entorno mínimo que infinite.js necesita de world.js ---- */
R(`var WALL_SOLIDS = [];`);
R(`function flushWallSolids(lvl) {
  for (const s of WALL_SOLIDS) {
    try {
      s.mesh.updateWorldMatrix(true, false);
      const b = new THREE.Box3().setFromObject(s.mesh);
      const w = b.max.x - b.min.x, d = b.max.z - b.min.z;
      if (w < 0.05 || d < 0.05) continue;
      lvl.platforms.push({
        mesh: null, x: (b.min.x + b.max.x) / 2, z: (b.min.z + b.max.z) / 2,
        topY: s.y1, w, h: Math.max(0.1, s.y1 - s.y0), d,
        kind: 'wall', solid: true, move: null, pad: null, ghost: null
      });
    } catch (e) {}
  }
  WALL_SOLIDS.length = 0;
}`);
// stubs que el pipeline de colisión necesita (THREE real los trae)
R(`THREE.Mesh.prototype.updateWorldMatrix = function(){};`);
R(`THREE.Box3 = class {
  constructor(){ this.min = {x:0,y:0,z:0}; this.max = {x:0,y:0,z:0}; }
  setFromObject(o){
    const p = o.position, s = o.scale;
    let hx = s.x / 2, hz = s.z / 2;
    if (o.rotation && Math.abs(Math.abs(o.rotation.y) - Math.PI / 2) < 0.01) { const tmp = hx; hx = hz; hz = tmp; }
    this.min = { x: p.x - hx, y: p.y - s.y / 2, z: p.z - hz };
    this.max = { x: p.x + hx, y: p.y + s.y / 2, z: p.z + hz };
    return this;
  }
};`);
R(`var LEVEL = { idx: 0, platforms: [], start: { x: 0, y: 0, z: 0 } };`);
R(`var Player = { pos: new THREE.Vector3(0, 0, 2) };`);
R(`var MODE = 'play';`);

vm.runInContext(fs.readFileSync(DIR + 'infinite.js', 'utf8'), global.sandbox, { filename: 'infinite.js' });

const nChunks = () => R('InfiniteStreets._chunks.size');
const setPlayer = (x, z) => R(`Player.pos.x = ${x}; Player.pos.z = ${z};`);
const setWorld = (idx) => R(`LEVEL.idx = ${idx}; LEVEL.platforms = []; InfiniteStreets.init();`);

try {
  /* ---------- 1. determinismo ---------- */
  const a = JSON.stringify(R('InfiniteStreets._genChunk(5, -3, 0)'));
  const b = JSON.stringify(R('InfiniteStreets._genChunk(5, -3, 0)'));
  t('mismo chunk dos veces → layout idéntico', a === b && a.length > 50);
  const c = JSON.stringify(R('InfiniteStreets._genChunk(6, -3, 0)'));
  t('chunk vecino genera distinto', a !== c);
  const d = JSON.stringify(R('InfiniteStreets._genChunk(5, -3, 3)'));
  t('mismo chunk en otro mundo genera distinto', a !== d);
  const nB = R('InfiniteStreets._genChunk(5, -3, 0).buildings.length');
  t('2-4 edificios por chunk', nB >= 2 && nB <= 4);
  const hs = R('InfiniteStreets._genChunk(5, -3, 0).buildings.map(x => x.h)');
  t('alturas 8-30 m', hs.every(h => h >= 8 && h <= 30));
  // el orden de generación no altera el resultado (RNG puro por chunk)
  const e1 = JSON.stringify(R('InfiniteStreets._genChunk(9, 9, 0)'));
  R('InfiniteStreets._genChunk(1, 1, 0)');
  const e2 = JSON.stringify(R('InfiniteStreets._genChunk(9, 9, 0)'));
  t('independiente del orden de generación', e1 === e2);

  /* ---------- 2. solo mundos ciudad ---------- */
  setWorld(1); // Volcán de Lava
  setPlayer(400, 0); R('InfiniteStreets.update(0.016);');
  t('mundo no-ciudad (idx 1): 0 chunks', nChunks() === 0);
  setWorld(5); // México
  R('InfiniteStreets.update(0.016);');
  t('mundo no-ciudad (idx 5): 0 chunks', nChunks() === 0);
  setWorld(3); // Immokalee sí
  setPlayer(400, 0); for (let i = 0; i < 8; i++) R('InfiniteStreets.update(0.016);'); // 2 cargas/frame
  t('Immokalee (idx 3): genera chunks', nChunks() === 9);
  setWorld(0); // Ciudad Neón sí

  /* ---------- 3. núcleo intacto: cero costo adentro ---------- */
  setPlayer(0, 2);
  R('InfiniteStreets.update(0.016);'); R('InfiniteStreets.update(0.016);');
  t('dentro del núcleo: 0 chunks (ciudad hecha a mano intacta)', nChunks() === 0);
  t('dentro del núcleo: 0 colisionadores extra', R('LEVEL.platforms.length') === 0);

  /* ---------- 4. carga/descarga + colisionadores ---------- */
  setPlayer(400, 0);
  for (let i = 0; i < 8; i++) R('InfiniteStreets.update(0.016);');
  t('fuera del núcleo: 3×3 = 9 chunks vivos', nChunks() === 9);
  const plats1 = R('LEVEL.platforms.length');
  t('colisionadores registrados (2-4 por chunk)', plats1 >= 18 && plats1 <= 36);
  const wallKinds = R('LEVEL.platforms.every(p => p.kind === "wall" && p.solid === true)');
  t('colisionadores con formato del sistema (kind wall, solid)', wallKinds === true);
  const platRef = R('LEVEL.platforms[0]');
  t('colisionador con dimensiones sanas', !!platRef && R('LEVEL.platforms[0].w') > 5 && R('LEVEL.platforms[0].topY') >= 8);
  // moverse lejos: los viejos se descargan y sus colisionadores se retiran
  setPlayer(2000, 500);
  for (let i = 0; i < 10; i++) R('InfiniteStreets.update(0.016);');
  t('tras moverse lejos: siguen ≤9 chunks', nChunks() <= 9 && nChunks() > 0);
  // verificación directa por referencia guardada en el sandbox
  R('LEVEL.__ref = null;');
  setPlayer(400, 0);
  for (let i = 0; i < 10; i++) R('InfiniteStreets.update(0.016);');
  R('LEVEL.__ref = LEVEL.platforms[0];');
  setPlayer(2000, 500);
  for (let i = 0; i < 10; i++) R('InfiniteStreets.update(0.016);');
  t('referencia del colisionador viejo ya no está en platforms', R('LEVEL.platforms.includes(LEVEL.__ref)') === false);
  t('platforms acotado tras mudanza', R('LEVEL.platforms.length') <= 36);
  R('LEVEL.__ref = null;');

  /* ---------- 5. caminata larga: sin errores ni fugas ---------- */
  let threw = false;
  const sceneBefore = R('scene.children.length');
  try {
    let x = 300, z = 0;
    for (let i = 0; i < 300; i++) { // 300 pasos × 20 m = 6 km caminados
      x += 20; z += (i % 7 === 0) ? 20 : 0;
      setPlayer(x, z);
      R('InfiniteStreets.update(0.016);');
      if (nChunks() > 12) throw new Error('demasiados chunks: ' + nChunks());
      if (R('LEVEL.platforms.length') > 48) throw new Error('fuga de colisionadores');
    }
  } catch (e) { threw = e.message; }
  t('caminata de 6 km sin errores', threw === false);
  if (threw !== false) console.log('     detalle: ' + threw);
  t('chunks acotados (≤12)', nChunks() <= 12);
  t('grupos en escena acotados (sin fuga de memoria)', R('scene.children.length') - sceneBefore <= 12);

  /* ---------- 6. robustez ---------- */
  setWorld(0);
  R('InfiniteStreets.reset();');
  t('reset() limpia todo', nChunks() === 0 && R('LEVEL.platforms.length') === 0);
  let crash = false;
  try { R('Player.pos = null; InfiniteStreets.update(0.016);'); } catch (e) { crash = true; }
  t('sin Player.pos no revienta', crash === false);
  R('Player.pos = new THREE.Vector3(400, 0, 0);');
  try { for (let i = 0; i < 8; i++) R('InfiniteStreets.update(0.016);'); } catch (e) { crash = true; }
  t('recupera tras estado raro', crash === false && nChunks() === 9);
} catch (e) {
  bad++; console.log('  ❌ excepción en el test: ' + (e && e.message));
}

console.log(`\ninfinitetest: ${ok} OK, ${bad} fallidas`);
process.exit(bad ? 1 : 0);
