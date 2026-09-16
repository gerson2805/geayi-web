/* Pruebas de UX de vehículos: SUBIRSE → manejar → bajarse (stubs THREE/DOM) */
'use strict';
const fs = require('fs');
const vm = require('vm');
const DIR = '/home/hatch/workspace/your_files/obby-3d/';

/* ---------- stubs DOM (classList con estado: verifica visibilidad real) ---------- */
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
    textContent: '', innerHTML: '', _html: undefined, value: '', width: 300, height: 150,
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
  DoubleSide: 2, FrontSide: 0,
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
  'player.js', 'online.js', 'travel.js', 'phase3.js', 'trophies.js'];
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

/* ============ 1. vehículos manejables a nivel de calle (los 9 mundos) ============ */
console.log('— vehículos manejables a nivel de calle');
for (let i = 0; i < 9; i++) {
  R(`LEVEL = buildLevel(${i})`);
  const bad = R(`LEVEL.cars.filter(c => (c.kind === 'car' || c.kind === 'bike') && c.drivable !== false && c.y > 1.2).map(c => c.kind + '@y=' + c.y.toFixed(1))`);
  ok(bad.length === 0, `mundo ${i + 1}: manejables a nivel de calle${bad.length ? ' → ' + bad.join(' ') : ''}`);
}

/* ============ 2. flujo SUBIRSE → manejar → girar → bajarse (carro, mundo 1) ============ */
console.log('— flujo SUBIRSE → manejar → bajarse (carro)');
R(`LEVEL = buildLevel(0); MODE = 'play'; Player.reset(0, 2, 0); Vehicle.mode = 'none'; Vehicle.def = null;`);
const flow = R(`(function(){
  const c = LEVEL.cars.find(c => c.kind === 'car' && c.drivable !== false && !c.taken);
  if (!c) return { err: 'sin carro' };
  const res = {};
  // 1. acercarse → aparece el botón SUBIRSE + marcador 3D
  Player.pos.set(c.x + 2, c.y + 1, c.z);
  updateVehiclePrompt(true);
  const bb = document.getElementById('btn-board');
  res.prompt = !bb.classList.contains('hidden') && /SUBIRSE/.test(bb.textContent || '');
  res.marker = (typeof _boardMarker !== 'undefined' && !!_boardMarker.visible);
  // 2. subirse (el carro conserva su orientación estacionada)
  boardVehicle({ type: 'car', def: c });
  res.board = Vehicle.mode === 'car' && c.taken === true;
  res.parkedHeading = Math.abs(Vehicle.heading - c.heading) < 0.01;
  res.markerOff = !_boardMarker.visible; // manejando: sin marcador
  // 3. manejar hacia adelante (flujo REAL: updatePlayer → updateVehicle)
  const x0 = c.mesh.position.x, z0 = c.mesh.position.z;
  for (let i = 0; i < 60; i++) updatePlayer(0.016, { x: 0, z: 1, jump: false });
  res.drove = Math.hypot(c.mesh.position.x - x0, c.mesh.position.z - z0) > 2 && Vehicle.speed > 1;
  // 4. girar con el joystick
  const h0 = Vehicle.heading;
  for (let i = 0; i < 40; i++) updatePlayer(0.016, { x: 0.7, z: 1, jump: false });
  res.turned = Math.abs(Vehicle.heading - h0) > 0.2;
  // 5. zona muerta: sin tocar el joystick no acelera ni gira solo
  Vehicle.speed = 0; Vehicle.sx = 0;
  const h1 = Vehicle.heading;
  for (let i = 0; i < 30; i++) updatePlayer(0.016, { x: 0.05, z: 0.05, jump: false });
  res.deadzone = Math.abs(Vehicle.speed) < 0.01 && Math.abs(Vehicle.heading - h1) < 0.01;
  // 6. bajarse → queda AL LADO del carro, carro liberado
  const cx = c.mesh.position.x, cz = c.mesh.position.z;
  exitVehicle();
  res.exit = Vehicle.mode === 'none' && c.taken === false;
  const d = Math.hypot(Player.pos.x - cx, Player.pos.z - cz);
  res.beside = d > 1 && d < 4;
  return res;
})()`);
if (flow.err) { ok(false, 'flujo carro: ' + flow.err); }
else {
  ok(flow.prompt, 'cerca del carro → botón SUBIRSE visible');
  ok(flow.marker, 'cerca del carro → marcador 3D visible');
  ok(flow.board, 'SUBIRSE → modo carro, carro ocupado');
  ok(flow.parkedHeading, 'al subir, el carro conserva su orientación estacionada');
  ok(flow.markerOff, 'manejando → marcador 3D oculto');
  ok(flow.drove, 'joystick adelante → el carro avanza (flujo real)');
  ok(flow.turned, 'joystick lateral → el carro gira');
  ok(flow.deadzone, 'joystick en reposo → no acelera ni gira solo');
  ok(flow.exit, 'BAJARSE → modo normal, carro liberado');
  ok(flow.beside, 'al bajar queda AL LADO del carro (no dentro)');
}

/* ============ 3. bicicleta: subir → pedalear → bajar ============ */
console.log('— bicicleta: subir → pedalear → bajar');
R(`LEVEL = buildLevel(0); MODE = 'play'; Player.reset(0, 2, 0); Vehicle.mode = 'none'; Vehicle.def = null;`);
const bf = R(`(function(){
  const b = LEVEL.cars.find(c => c.kind === 'bike' && c.drivable !== false && !c.taken);
  if (!b) return { err: 'sin bici' };
  const res = {};
  Player.pos.set(b.x + 2, b.y + 1, b.z);
  updateVehiclePrompt(true);
  res.prompt = !document.getElementById('btn-board').classList.contains('hidden');
  boardVehicle({ type: 'bike', def: b });
  res.board = Vehicle.mode === 'bike';
  const x0 = b.mesh.position.x, z0 = b.mesh.position.z;
  for (let i = 0; i < 60; i++) updatePlayer(0.016, { x: 0, z: 1, jump: false });
  res.drove = Math.hypot(b.mesh.position.x - x0, b.mesh.position.z - z0) > 1.5;
  exitVehicle();
  res.exit = Vehicle.mode === 'none' && b.taken === false;
  return res;
})()`);
if (bf.err) { ok(false, 'flujo bici: ' + bf.err); }
else {
  ok(bf.prompt, 'cerca de la bici → botón SUBIRSE');
  ok(bf.board, 'SUBIRSE → modo bici');
  ok(bf.drove, 'pedalear → la bici avanza');
  ok(bf.exit, 'BAJARSE → bici liberada');
}

/* ============ 4. taxi y bus GEAYI: subir → manejar → bajar ============ */
console.log('— taxi y bus GEAYI');
R(`LEVEL = buildLevel(3); MODE = 'play'; Player.reset(0, 2, 0); Vehicle.mode = 'none'; Vehicle.def = null;`);
// taxi y bus de prueba en el 🅿 del mundo 4 (suelo real)
R(`addVehicle(LEVEL, 'geayi-taxi', -12, 0, -5.5, 0xffd23f, true, 0); addVehicle(LEVEL, 'geayi-bus', -18, 0, -5.5, 0x7b2fff, true, 0);`);
for (const vt of ['geayi-taxi', 'geayi-bus']) {
  const tf = R(`(function(){
    const v = LEVEL.cars.find(c => c.vtype === '${vt}' && !c.taken);
    if (!v) return { err: 'sin ${vt}' };
    const res = {};
    Player.pos.set(v.x + 2, v.y + 1, v.z);
    updateVehiclePrompt(true);
    res.prompt = !document.getElementById('btn-board').classList.contains('hidden');
    boardVehicle({ type: 'car', def: v });
    res.board = Vehicle.mode === 'car';
    const x0 = v.mesh.position.x, z0 = v.mesh.position.z;
    for (let i = 0; i < 60; i++) updatePlayer(0.016, { x: 0, z: 1, jump: false });
    res.drove = Math.hypot(v.mesh.position.x - x0, v.mesh.position.z - z0) > 2;
    exitVehicle();
    res.exit = Vehicle.mode === 'none' && v.taken === false;
    return res;
  })()`);
  if (tf.err) { ok(false, vt + ': ' + tf.err); }
  else {
    ok(tf.prompt && tf.board && tf.drove && tf.exit, `${vt} GEAYI: SUBIRSE → manejar → BAJARSE`);
  }
}

/* ============ 5. robustez: updateVehicle sin vehículo no rompe ============ */
console.log('— robustez');
R(`LEVEL = buildLevel(0); MODE = 'play'; Player.reset(0, 2, 0);`);
const rob = R(`(function(){
  const res = {};
  try {
    Vehicle.mode = 'car'; Vehicle.def = null; // estado corrupto simulado
    updateVehicle(0.016, { x: 0, z: 1, jump: false });
    updateVehicle(0.016, { x: 0, z: 1, jump: false }); // segunda llamada tras la caída
    res.noCrash = Vehicle.mode === 'none';
  } catch (e) { res.noCrash = false; res.err = String(e).slice(0, 80); }
  try {
    Vehicle.mode = 'none'; Vehicle.def = null;
    updateVehicle(0.016, { x: 0, z: 1, jump: false }); // sin vehículo: no hace nada
    res.idle = true;
  } catch (e) { res.idle = false; }
  return res;
})()`);
ok(rob.noCrash, 'updateVehicle sin def → se recupera a modo none' + (rob.err ? ' (' + rob.err + ')' : ''));
ok(rob.idle, 'updateVehicle en modo none → no hace nada');

/* ============ 6. choque: el carro vuelve a su estacionamiento ============ */
console.log('— choque: el carro vuelve a su lugar');
R(`LEVEL = buildLevel(0); MODE = 'play'; Player.reset(0, 2, 0); Vehicle.mode = 'none'; Vehicle.def = null;`);
const ch = R(`(function(){
  const c = LEVEL.cars.find(c => c.kind === 'car' && c.drivable !== false && !c.taken);
  if (!c) return { err: 'sin carro' };
  Player.pos.set(c.x + 2, c.y + 1, c.z);
  boardVehicle({ type: 'car', def: c });
  for (let i = 0; i < 30; i++) updatePlayer(0.016, { x: 0, z: 1, jump: false });
  const moved = Math.hypot(c.mesh.position.x - c.x, c.mesh.position.z - c.z) > 1;
  crashVehicle(); // 💥 cae al vacío
  const back = Math.hypot(c.mesh.position.x - c.x, c.mesh.position.z - c.z) < 0.01;
  return { moved, back, freed: Vehicle.mode === 'none' && c.taken === false };
})()`);
ok(ch.moved !== false, 'el carro se movió antes del choque');
ok(ch.back === true, 'tras el choque el carro vuelve a su estacionamiento');
ok(ch.freed === true, 'tras el choque el carro queda libre');

console.log(`\nRESULTADO: ${pass} OK, ${fail} FALLOS`);
process.exit(fail ? 1 : 0);
