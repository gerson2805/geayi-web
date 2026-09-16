/* Pruebas del TREN GEAYI EXPRESS (train.js): circuito, paradas, subir/bajar.
   Patrón de tests/funtest.js (stubs THREE/DOM propios). */
'use strict';
const fs = require('fs');
const vm = require('vm');
const { execSync } = require('child_process');
const DIR = '/home/hatch/workspace/your_files/obby-3d/';

/* ---------- stubs DOM ---------- */
function ctx2dStub() {
  return new Proxy({}, {
    get(t, p) {
      if (p === 'measureText') return () => ({ width: 10 });
      if (p === 'createLinearGradient' || p === 'createRadialGradient') return () => ({ addColorStop() {} });
      if (p === 'getImageData') return () => ({ data: [] });
      return (...a) => {};
    },
    set() { return true; }
  });
}
function elStub(tag) {
  const el = {
    tagName: (tag || 'div').toUpperCase(), children: [], style: {}, dataset: {},
    classList: {
      _s: new Set(),
      add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); },
      toggle(c, f) { if (f === undefined) f = !this._s.has(c); if (f) this._s.add(c); else this._s.delete(c); },
      contains(c) { return this._s.has(c); }
    },
    textContent: '', innerHTML: '', value: '', width: 300, height: 150,
    appendChild(c) { this.children.push(c); return c; },
    removeChild(c) { this.children = this.children.filter(x => x !== c); },
    addEventListener() {}, removeEventListener() {},
    setAttribute() {}, getAttribute() { return null; }, removeAttribute() {},
    querySelector() { return elStub(); }, querySelectorAll() { return []; },
    getContext() { return ctx2dStub(); },
    getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; },
    click() {}, focus() {}, blur() {}, play() {}, pause() {},
    onclick: null, onchange: null,
  };
  return el;
}
const _els = {};
const documentStub = {
  createElement: (t) => elStub(t),
  getElementById: (id) => (_els[id] || (_els[id] = elStub('div#' + id))),
  querySelector: () => elStub(),
  querySelectorAll: () => [],
  body: elStub('body'),
  addEventListener() {}, removeEventListener() {},
  documentElement: elStub('html'),
  title: '',
};
const localStorageStub = (() => {
  const m = {};
  return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; } };
})();

/* ---------- stub THREE ---------- */
class V3 {
  constructor(x, y, z) { this.x = x || 0; this.y = y || 0; this.z = z || 0; }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
  clone() { return new V3(this.x, this.y, this.z); }
  add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
  sub(v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; }
  multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
  setScalar(s) { this.x = s; this.y = s; this.z = s; return this; }
  lerp(v, t) { this.x += (v.x - this.x) * t; this.y += (v.y - this.y) * t; this.z += (v.z - this.z) * t; return this; }
  distanceTo(v) { const dx = this.x - v.x, dy = this.y - v.y, dz = this.z - v.z; return Math.sqrt(dx*dx + dy*dy + dz*dz); }
  normalize() { const l = this.distanceTo({x:0,y:0,z:0}) || 1; this.x/=l; this.y/=l; this.z/=l; return this; }
  length() { return this.distanceTo({x:0,y:0,z:0}); }
}
class Obj3D {
  constructor() {
    this.quaternion = { setFromUnitVectors() {}, set() {}, copy() {} }; this.position = new V3(); this.rotation = { x: 0, y: 0, z: 0, set() {} }; this.scale = new V3(1, 1, 1); this.children = []; this.visible = true; this.userData = {}; this.parent = null; }
  add(c) { this.children.push(c); c.parent = this; return this; }
  remove(c) { this.children = this.children.filter(x => x !== c); if (c.parent === this) c.parent = null; return this; }
  traverse(fn) { fn(this); this.children.forEach(c => c.traverse ? c.traverse(fn) : fn(c)); }
  lookAt() {}
}
class Geom { constructor(...a) { this.args = a; this.attributes = {}; } setAttribute(n, a) { this.attributes[n] = a; } dispose() {} }
class Mat { constructor(o) { Object.assign(this, o || {}); this.color = { setHex() {} }; } dispose() {} }
class Light extends Obj3D { constructor(...a) { super(); this.args = a; } }
const THREE_BASE = {
  Vector2: class { constructor(x, y) { this.x = x || 0; this.y = y || 0; } },
  Vector3: V3, Group: Obj3D, Object3D: Obj3D, Mesh: class extends Obj3D { constructor(g, m) { super(); this.geometry = g; this.material = m; } },
  Scene: class extends Obj3D {},
  Color: class { constructor(c) { this.c = (typeof c === 'number') ? c : 0; } getHex() { return this.c; } setHex(h) { this.c = h; return this; } },
  Fog: class { constructor() {} },
  DoubleSide: 2, FrontSide: 0, RepeatWrapping: 1000, AdditiveBlending: 2,
  MathUtils: { clamp: (v, a, b) => Math.min(b, Math.max(a, v)) },
  WebGLRenderer: class extends Obj3D {
    constructor() { super(); this.domElement = elStub('canvas'); }
    setPixelRatio() {} setSize() {} render() {}
  },
  PerspectiveCamera: class extends Obj3D {
    constructor(fov, aspect, near, far) { super(); this.fov = fov; this.aspect = aspect; }
    updateProjectionMatrix() {}
  },
  Clock: class { constructor() { this.elapsedTime = 0; } getDelta() { return 0.016; } },
  BoxGeometry: Geom, PlaneGeometry: Geom, SphereGeometry: Geom, CylinderGeometry: Geom,
  ConeGeometry: Geom, TorusGeometry: Geom, CircleGeometry: Geom, RingGeometry: Geom,
  MeshBasicMaterial: Mat, MeshStandardMaterial: Mat, SpriteMaterial: Mat,
  CanvasTexture: class { constructor(c) { this.image = c; this.repeat = { set() {} }; this.offset = { set() {} }; } dispose() {} },
  HemisphereLight: Light, DirectionalLight: Light,
  GridHelper: class extends Obj3D { constructor(...a) { super(); this.args = a; this.material = new Mat(); } },
  AxesHelper: class extends Obj3D { constructor(...a) { super(); this.args = a; } },
  Sprite: class extends Obj3D { constructor(m) { super(); this.material = m; } },
  SpriteMaterial: Mat,
  Raycaster: class { constructor() { this.far = Infinity; } set() {} setFromCamera() {} intersectObjects() { return []; } intersectObject() { return []; } },
};
const THREE = new Proxy(THREE_BASE, {
  get(t, p) {
    if (p in t) return t[p];
    if (typeof p === 'string' && /Geometry$/.test(p)) return Geom;
    if (typeof p === 'string' && /Material$/.test(p)) return Mat;
    if (typeof p === 'string' && /Light$/.test(p)) return Light;
    return undefined;
  }
});

const sandbox = {
  console, Math, JSON, Object, Array, String, Number, Boolean, Date, RegExp, Error,
  setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
  requestAnimationFrame() {}, cancelAnimationFrame() {},
  THREE, document: documentStub, localStorage: localStorageStub,
  window: null, navigator: { userAgent: 'node' }, performance: { now: () => 0 },
  AudioContext: undefined,
  scene: new THREE.Scene(), camera: new Obj3D(),
  MODE: 'menu', finished: false, respawn: { x: 0, y: 0, z: 0 },
  LEVEL: {}, levelTime: 0,
  innerWidth: 800, innerHeight: 600, devicePixelRatio: 1,
  addEventListener() {}, removeEventListener() {},
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const FILES = ['state.js', 'i18n.js', 'audio.js', 'vehicles.js', 'world.js', 'neoncity.js', 'family.js',
  'player.js', 'phase3.js', 'train.js'];
for (const f of FILES) {
  try {
    vm.runInContext(fs.readFileSync(DIR + f, 'utf8'), sandbox, { filename: f });
  } catch (e) {
    console.log('✗ ERROR cargando ' + f + ': ' + e.message);
    process.exit(1);
  }
}
console.log('carga: ' + FILES.length + ' archivos OK (incluye train.js)');

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; }
  else { fail++; console.log('  ✗ FAIL:', name); }
}
const R = (expr) => vm.runInContext(expr, sandbox);
R('initThree(); Particles.init(); Avatar.build(); Train.init();');

/* ============ 0. geometría del circuito ============ */
console.log('— geometría del circuito');
const p0 = R('trainTrackPoint(0)');
ok(Math.abs(p0.x - 61) < 1e-9 && Math.abs(p0.z + 56) < 1e-9, 's=0 → (61,-56)');
const pE = R('trainTrackPoint(56)');
ok(Math.abs(pE.x - 61) < 1e-9 && Math.abs(pE.z) < 1e-9, 's=56 → (61,0) vagón 1 en andén ESTE');
// continuidad en las 8 uniones de segmentos
const joints = R(`(function(){
  const SL=112, ARC=Math.PI/2*5, P=4*SL+4*ARC;
  const js=[SL, SL+ARC, 2*SL+ARC, 2*SL+2*ARC, 3*SL+2*ARC, 3*SL+3*ARC, 4*SL+3*ARC, P];
  let worst=0;
  for (const j of js) {
    const a=trainTrackPoint(j-0.01), b=trainTrackPoint(j+0.01);
    worst=Math.max(worst, Math.hypot(a.x-b.x, a.z-b.z));
  }
  return worst;
})()`);
ok(joints < 0.05, `circuito continuo en las 8 uniones (salto máx ${joints.toFixed(4)})`);
const per = R('TRAIN_P');
ok(Math.abs(per - (4 * 112 + 4 * Math.PI / 2 * 5)) < 1e-9, 'perímetro ≈ 479.4 m');
// paradas: el vagón 1 queda junto al andén
const stopsOk = R(`(function(){
  const chk=[[65,61,0],[164.854,20,61],[304.708,-61,0],[444.562,20,-61]];
  return chk.every(([s,ex,ez])=>{ const p=trainTrackPoint(s-9); return Math.hypot(p.x-ex,p.z-ez)<0.01; });
})()`);
ok(stopsOk, 'vagón 1 detenido junto a cada andén');

/* ============ 1. solo se construye en idx 0 ============ */
console.log('— construcción por nivel');
R('LEVEL = buildLevel(0); MODE = "play"; Train.buildForLevel(0, LEVEL.group);');
ok(R('!!Train.g'), 'idx0: grupo del tren creado');
ok(R('Train.cars.length') === 3, 'idx0: locomotora + 2 vagones');
ok(R('Train.g.children.length') > 100, `idx0: vía + andenes + tren (${R('Train.g.children.length')} mallas)`);
R('Train.buildForLevel(3, LEVEL.group);');
ok(R('Train.g') === null, 'idx3: sin tren');
ok(R('Train.cars.length') === 0, 'idx3: sin vagones');
R('Train.buildForLevel(1, LEVEL.group);');
ok(R('Train.g') === null, 'idx1: sin tren');
R('Train.buildForLevel(0, LEVEL.group);'); // reconstruir para el resto
ok(R('!!Train.g && Train.cars.length === 3'), 'idx0: reconstrucción idempotente');
const nMesh1 = R('Train.g.children.length');
R('Train.buildForLevel(0, LEVEL.group);');
ok(R('Train.g.children.length') === nMesh1, 'rebuild no duplica mallas');

/* ============ 2. avanza y se detiene en paradas ============ */
console.log('— movimiento y paradas');
R('Player.reset(0, 1, -172); Vehicle.mode = "none"; Vehicle.def = null;');
R('Train.s = 0; Train.v = 0; Train.state = "run";');
const s0 = R('Train.s');
for (let i = 0; i < 120; i++) R('Train.update(1/60);');
const s1 = R('Train.s');
ok(s1 > s0 + 3, `el tren avanza (s: ${s0.toFixed(1)} → ${s1.toFixed(1)})`);
ok(R('Train.v') > 3, `alcanza velocidad de crucero (${R('Train.v').toFixed(1)} m/s)`);
let frames = 0;
while (R('Train.state') !== 'dwell' && frames < 3000) { R('Train.update(1/60);'); frames++; }
ok(R('Train.state') === 'dwell', `se detiene en la parada (${frames} cuadros)`);
ok(Math.abs(R('Train.v')) < 1e-9, 'detenido: v = 0');
ok(Math.abs(R('Train.dwellT') - 8) < 0.01, `parada de ~8 s (dwellT=${R('Train.dwellT')})`);
const dwellS = R('Train.s');
R('Train.dwellT = 0.15;');
for (let i = 0; i < 30; i++) R('Train.update(1/60);');
ok(R('Train.state') === 'run', 'tras la parada vuelve a arrancar');
ok(R('Train.s') > dwellS, 'sigue avanzando tras la parada');

/* ============ 3. subir: solo detenido y cerca; viajar sigue al vagón ============ */
console.log('— subir y viajar');
R('Train.state = "run"; Train.v = 5; Train.riding = false; Train._placeCars();');
R('Player.reset(61, 1, -50); Vehicle.mode = "none"; Vehicle.def = null;');
ok(R('Train.board()') === false, 'con el tren en marcha NO se puede subir');
ok(R('Train.riding') === false, 'riding sigue en false');
R('Player.reset(0, 1, -150);');
ok(R('Train.board()') === false, 'lejos del tren NO se puede subir');
// detener en la parada ESTE y acercar al jugador al andén
R('Train.s = 65; Train.v = 0; Train.state = "dwell"; Train.dwellT = 8; Train.stopIdx = 0; Train._placeCars();');
R('Player.reset(58, 1, 0);');
ok(R('Train.board()') === true, 'detenido + cerca → SUBIR funciona');
ok(R('Train.riding') === true, 'riding = true');
const px0 = R('Player.pos.x'), pz0 = R('Player.pos.z');
for (let i = 0; i < 60; i++) R('Train.update(1/60);'); // sigue detenido 1 s
const w2d = R('Train.carPos[2]');
const dpw = Math.hypot(R('Player.pos.x') - w2d.x, R('Player.pos.z') - w2d.z);
ok(dpw < 0.6, `detenido: el jugador espera sentado en el vagón 2 (d=${dpw.toFixed(2)})`);
void px0; void pz0;
// arranca con el jugador a bordo: el jugador sigue al vagón 2
R('Train.dwellT = 0.05;');
for (let i = 0; i < 300; i++) R('Train.update(1/60);');
ok(R('Train.state') === 'run', 'el tren arrancó con el jugador a bordo');
const w2 = R('Train.carPos[2]');
const dp = Math.hypot(R('Player.pos.x') - w2.x, R('Player.pos.z') - w2.z);
ok(dp < 0.6, `viajando: el jugador sigue al vagón 2 (d=${dp.toFixed(2)})`);
ok(R('Math.abs(Player.pos.y - 1.05)') < 0.01, 'el jugador va a nivel del vagón (y=1.05)');
for (let i = 0; i < 300; i++) R('Train.update(1/60);');
ok(R('Train.riding') === true, 'sigue a bordo tras 10 s de viaje');

/* ============ 4. bajar deja al jugador en el andén ============ */
console.log('— bajar en parada');
let f2 = 0;
while (R('Train.state') !== 'dwell' && f2 < 4000) { R('Train.update(1/60);'); f2++; }
ok(R('Train.state') === 'dwell', 'llega a la siguiente parada con el jugador');
const stIdx = R('Train.stopIdx');
ok(R('Train.alight()') === true, 'BAJAR funciona en la parada');
ok(R('Train.riding') === false, 'riding = false');
const plat = R(`({x: TRAIN_STOPS[${stIdx}].px, z: TRAIN_STOPS[${stIdx}].pz})`);
const dp2 = Math.hypot(R('Player.pos.x') - plat.x, R('Player.pos.z') - plat.z);
ok(dp2 < 1.5, `el jugador queda en el andén (d=${dp2.toFixed(2)})`);
// bajar en marcha no funciona
R('Train.s = 65; Train.v = 0; Train.state = "dwell"; Train.dwellT = 8; Train.stopIdx = 0; Train._placeCars();');
R('Player.reset(58, 1, 0); Train.board();');
R('Train.dwellT = 0.05;');
for (let i = 0; i < 30; i++) R('Train.update(1/60);');
ok(R('Train.state') === 'run', 'tren en marcha');
ok(R('Train.alight()') === false, 'en marcha NO se puede bajar');
ok(R('Train.riding') === true, 'sigue a bordo (sin penalización)');

/* ============ 5. limpieza al cambiar de nivel ============ */
console.log('— limpieza');
R('Train.buildForLevel(2, LEVEL.group);');
ok(R('Train.g') === null && R('Train.riding') === false, 'al cambiar de mundo se limpia todo');
ok(R('document.body.children.filter(c => c.id === "btn-train-board").length') === 1, 'botones creados una sola vez');
for (let i = 0; i < 120; i++) R('Train.update(0.016);');
ok(true, '120 cuadros de update sin tren (otros mundos) sin errores');

/* ============ 6. sintaxis ============ */
console.log('— sintaxis');
try {
  execSync('node --check ' + DIR + 'train.js', { stdio: 'pipe' });
  ok(true, 'node --check train.js');
} catch (e) {
  ok(false, 'node --check train.js: ' + e.message);
}

console.log(`\n${pass} OK · ${fail} FAIL`);
process.exit(fail ? 1 : 0);
