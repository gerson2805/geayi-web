/* Pruebas de DIVERSIÓN NUEVA (funpark.js): estadio, playa, helicóptero y cine */
'use strict';
const fs = require('fs');
const vm = require('vm');
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
      toggle(c) { if (this._s.has(c)) this._s.delete(c); else this._s.add(c); },
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
  return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { m[k] = String(k); } };
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
    this.quaternion = { setFromUnitVectors() {}, set() {}, copy() {} }; this.position = new V3(); this.rotation = { x: 0, y: 0, z: 0, set() {} }; this.scale = new V3(1, 1, 1); this.children = []; this.visible = true; this.userData = {}; }
  add(c) { this.children.push(c); return this; }
  remove(c) { this.children = this.children.filter(x => x !== c); return this; }
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
  'player.js', 'phase3.js', 'trophies.js', 'funpark.js'];
for (const f of FILES) {
  vm.runInContext(fs.readFileSync(DIR + f, 'utf8'), sandbox, { filename: f });
}

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; }
  else { fail++; console.log('  ✗ FAIL:', name); }
}
const R = (expr) => vm.runInContext(expr, sandbox);
R('initThree(); Particles.init(); Avatar.build();');

/* ============ 0. módulo y carga limpia ============ */
console.log('— módulo y carga limpia');
ok(documentStub.body.children.length === 0, 'funpark.js no toca el DOM al cargar');
ok(typeof R('typeof FunPark') !== 'undefined' && R('typeof FunPark') === 'object', 'existe FunPark');
ok(R('typeof FunPark.init') === 'function', 'FunPark.init existe');
ok(R('typeof FunPark.onLevelStart') === 'function', 'FunPark.onLevelStart existe');
ok(R('typeof FunPark.onLevelEnd') === 'function', 'FunPark.onLevelEnd existe');
ok(R('typeof FunPark.update') === 'function', 'FunPark.update existe');

/* ============ 1. contenido por nivel ============ */
console.log('— contenido por nivel (9 mundos)');
for (let i = 0; i < 9; i++) {
  R(`LEVEL = buildLevel(${i})`);
  const hasStadium = R('!!(LEVEL.fpStadium && LEVEL.fpStadium.ball)');
  const hasSea = R('!!(FunPark.sea && FunPark.sea.m1)');
  const hasHeli = R('LEVEL.cars.some(c => c.vtype === "geayi-funcopter" && c.kind === "heli")');
  const nCine = R('FunPark.cinemas.length');
  if (i === 3) {
    ok(hasStadium, 'idx3: estadio con pelota');
    ok(hasSea, 'idx3: playa con mar animado');
    ok(hasHeli, 'idx3: helicóptero en el aeropuerto');
    ok(nCine === 1, 'idx3: 1 cine');
  } else if (i === 0) {
    ok(!hasStadium && !hasSea, 'idx0: sin estadio ni playa');
    ok(hasHeli, 'idx0: helicóptero en Ciudad Neón');
    ok(nCine === 1, 'idx0: 1 cine');
  } else {
    ok(!hasStadium && !hasSea && !hasHeli, `idx${i}: sin estadio/playa/heli`);
    ok(nCine === 1, `idx${i}: 1 cine`);
  }
}
ok(R('!!VEHICLE_TYPES["geayi-funcopter"]'), 'vehículo geayi-funcopter registrado');

/* ============ 2. partido de fútbol ============ */
console.log('— partido de fútbol (mundo 4)');
R(`LEVEL = buildLevel(3); MODE = 'play'; finished = false;`);
R(`Player.reset(30, 2, -80); Vehicle.mode = 'none'; Vehicle.def = null;`);
R('FunPark.onLevelStart(3); FunPark.init();');
R('fpMatchStart()');
ok(R('!!FunPark.match'), 'el partido arranca');
ok(R('FunPark.match.npcs.length') === 9, '9 jugadores (familia 4 + rivales 5)');
ok(R('FunPark.match.ball') !== null, 'hay pelota');
R('for (let i = 0; i < 130; i++) fpMatchUpdate(1/60);'); // pasa el saque inicial
ok(R('FunPark.match.freeze') <= 0, 'termina el saque inicial sin errores');
// patada del jugador hacia la portería norte
R('Player.pos.set(30, 0.5, -94); Player.heading = Math.PI;');
R('for (let i = 0; i < 8; i++) fpMatchUpdate(1/60);');
ok(R('FunPark.match.ball.z') < -96, 'la pelota sale pateada hacia el norte');
// gol directo: pelota ya cruzando la línea norte (evita al portero en el test)
R('var M = FunPark.match; M.ball.x = 30; M.ball.z = -123.1; M.ball.vx = 0; M.ball.vz = -2; M.ball.vy = 0;');
R('for (let i = 0; i < 10 && FunPark.match.home < 1; i++) fpMatchUpdate(1/60);');
ok(R('FunPark.match.home') === 1, 'el gol de la Familia suma en el marcador');
R('FunPark.update(1/60);');
ok(R('FunPark._els["fp-score"].style.display') === 'block', 'marcador visible');
// victoria → trofeo
R('FunPark.match.home = 2; FunPark.match.away = 0; FunPark.match.t = 0.05;');
R('for (let i = 0; i < 30; i++) fpMatchUpdate(1/60);');
ok(R('FunPark.match.over') === true, 'el partido termina al acabarse el tiempo');
ok(R('Trophy.has("soccer_win")') === true, 'trofeo de campeón desbloqueado');
R('for (let i = 0; i < 400; i++) fpMatchUpdate(1/60);');
ok(R('FunPark.match') === null, 'limpieza tras el partido');

/* ============ 3. playa y nado ============ */
console.log('— playa y nado familiar');
R(`LEVEL = buildLevel(3); MODE = 'play'; finished = false;`);
R('FunPark.onLevelStart(3);');
R('Player.reset(-175, 2, 218); Vehicle.mode = "none"; Vehicle.def = null;');
for (let i = 0; i < 60; i++) R('updatePlayer(0.016, { x: 0, z: 1, jump: false });');
const walkDz = Math.abs(R('Player.pos.z') - 218);
R('Player.reset(-175, 2, 218); FunPark.onLevelStart(3);');
for (let i = 0; i < 60; i++) R('updatePlayer(0.016, { x: 0, z: 1, jump: false }); FunPark.update(0.016);');
const swimDz = Math.abs(R('Player.pos.z') - 218);
ok(R('FunPark.swim') === true, 'detecta que está en el mar');
ok(swimDz > 0.3 && swimDz < walkDz * 0.8, `nado lento (${swimDz.toFixed(2)} < caminata ${walkDz.toFixed(2)})`);
ok(R('Player.pos.y') > -1, 'no se hunde ni muere en el agua');
R('Player.reset(30, 2, 30); FunPark.update(0.016);');
ok(R('FunPark.swim') === false, 'fuera del agua no hay nado');

/* ============ 4. helicóptero volable ============ */
console.log('— helicóptero volable');
R(`LEVEL = buildLevel(0); MODE = 'play'; finished = false;`);
R('FunPark.onLevelStart(0);');
R('var hc = LEVEL.cars.find(c => c.vtype === "geayi-funcopter"); Player.pos.set(hc.x + 1.5, 1, hc.z);');
R('boardVehicle({ type: "heli", def: LEVEL.cars.find(c => c.vtype === "geayi-funcopter") })');
ok(R('Vehicle.mode') === 'heli', 'SUBIR aborda el helicóptero GEAYI');
for (let i = 0; i < 60; i++) R('updatePlayer(0.016, { x: 0, z: 0, jump: false }); FunPark.update(0.016);');
const y0 = R('Vehicle.pPos.y');
R('FunPark.heliLift = 1;');
for (let i = 0; i < 30; i++) R('updatePlayer(0.016, { x: 0, z: 0, jump: false }); FunPark.update(0.016);');
const y1 = R('Vehicle.pPos.y');
ok(y1 > y0 + 1, `botón ⬆️ sube el helicóptero (${y0.toFixed(1)} → ${y1.toFixed(1)})`);
R('FunPark.heliLift = -1;');
for (let i = 0; i < 30; i++) R('updatePlayer(0.016, { x: 0, z: 0, jump: false }); FunPark.update(0.016);');
const y2 = R('Vehicle.pPos.y');
ok(y2 < y1 - 1, `botón ⬇️ baja el helicóptero (${y1.toFixed(1)} → ${y2.toFixed(1)})`);
R('FunPark.heliLift = 0; FunPark.update(0.016);');
ok(R('FunPark._els["fp-heli-up"].style.display') === 'block', 'botones ⬆️⬇️ visibles volando');
R('exitVehicle();');
R('for (let i = 0; i < 900 && Vehicle.mode !== "none"; i++) updatePlayer(0.016, { x: 0, z: 0, jump: false });');
ok(R('Vehicle.mode') === 'none', 'aterriza y permite BAJAR sin caerse al vacío');
ok(R('Player.pos.y') > -2, 'el jugador queda a nivel del suelo');

/* ============ 5. cine y palomitas ============ */
console.log('— cine GEAYI y palomitas');
R(`LEVEL = buildLevel(3); MODE = 'play'; finished = false;`);
R('FunPark.onLevelStart(3);');
R('Player.reset(100, 2, 30); Vehicle.mode = "none"; Vehicle.def = null; SAVE.coins = 20;');
for (let i = 0; i < 5; i++) R('FunPark.update(0.016);');
ok(R('FunPark._els["fp-pop"].style.display') === 'block', 'botón 🍿 visible dentro del cine');
const t0 = R('FunPark.cinemas[0].movie.t');
for (let i = 0; i < 60; i++) R('FunPark.update(0.016);');
ok(R('FunPark.cinemas[0].movie.t') !== t0, 'la película avanza en la pantalla');
R('fpBuyPopcorn();');
ok(R('SAVE.coins') === 15, 'palomitas cuestan $5');
ok(R('Player.fx.speedT') === 30, 'palomitas dan boost de velocidad 30 s');
R('SAVE.coins = 2; fpBuyPopcorn();');
ok(R('SAVE.coins') === 2, 'sin monedas no cobra');
R('fpCineExit();');
ok(Math.abs(R('Player.pos.x') - 91) < 0.01, '🚪 SALIR lleva a la puerta del cine');

/* ============ 6. limpieza e idempotencia ============ */
console.log('— limpieza e idempotencia');
R(`LEVEL = buildLevel(3); MODE = 'play'; finished = false;`);
R('Player.reset(30, 2, -80); FunPark.onLevelStart(3); fpMatchStart();');
R('FunPark.onLevelEnd();');
ok(R('FunPark.match') === null, 'onLevelEnd limpia el partido');
ok(R('FunPark._els["fp-score"].style.display') === 'none', 'onLevelEnd oculta la UI');
R('FunPark.init(); FunPark.init();');
ok(documentStub.body.children.filter(c => c.id === 'fp-match').length === 1, 'init() idempotente (un solo botón)');
for (let i = 0; i < 120; i++) R('FunPark.update(0.016);');
ok(true, '120 cuadros de update sin errores');

console.log(`\n${pass} OK · ${fail} FAIL`);
process.exit(fail ? 1 : 0);
