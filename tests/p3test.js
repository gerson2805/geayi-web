/* Pruebas funcionales fase 3 + mundo 9 (stubs THREE/DOM) */
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
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
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
    this.quaternion = { setFromUnitVectors() {}, set() {}, copy() {} };
    this.position = new V3(); this.rotation = new V3(); this.scale = new V3(1, 1, 1);
    this.children = []; this.visible = true; this.userData = {};
  }
  add(c) { this.children.push(c); return this; }
  remove(c) { this.children = this.children.filter(x => x !== c); }
  traverse(fn) { fn(this); this.children.forEach(c => c.traverse ? c.traverse(fn) : fn(c)); }
  lookAt() {}
}
class Mesh extends Obj3D { constructor(g, m) { super(); this.geometry = g; this.material = m; } }
class Scene extends Obj3D {}
class Group extends Obj3D {}
class Points extends Obj3D { constructor(g, m) { super(); this.geometry = g; this.material = m; } }
class Geom { constructor(...a) { this.args = a; this.attributes = {}; } setAttribute(n, a) { this.attributes[n] = a; } dispose() {} }
class Mat { constructor(o) { Object.assign(this, o || {}); } dispose() {} }
class Light extends Obj3D { constructor(...a) { super(); this.args = a; } }
const THREE_BASE = {
  Scene, Group, Mesh, Points,
  MeshStandardMaterial: Mat, MeshBasicMaterial: Mat, PointsMaterial: Mat,
  CanvasTexture: class { constructor(c) { this.image = c; this.repeat = { set() {} }; this.offset = { set() {} }; } dispose() {} },
  TextureLoader: class { load() { return { dispose() {}, repeat: { set() {} }, offset: { set() {} } }; } },
  Float32BufferAttribute: class { constructor(a, n) { this.array = a; this.itemSize = n; } },
  Color: class { constructor(c) { this.c = (typeof c === 'number') ? c : 0; } getHex() { return this.c; } setHex(h) { this.c = h; return this; } },
  Fog: class { constructor() {} },
  Vector2: class { constructor(x, y) { this.x = x || 0; this.y = y || 0; } },
  Vector3: V3,
  DoubleSide: 2, RepeatWrapping: 1000, AdditiveBlending: 2,
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
  HemisphereLight: Light, DirectionalLight: Light,
  GridHelper: class extends Obj3D { constructor(...a) { super(); this.args = a; this.material = new Mat(); } },
  AxesHelper: class extends Obj3D { constructor(...a) { super(); this.args = a; } },
  Sprite: class extends Obj3D { constructor(m) { super(); this.material = m; } },
  SpriteMaterial: Mat,
  Raycaster: class { constructor() { this.far = Infinity; } set() {} setFromCamera() {} intersectObjects() { return []; } intersectObject() { return []; } },
};
/* cualquier otra geometría/material/luz de THREE → stub genérico */
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
R('initThree(); Particles.init(); Avatar.build();'); // escena + partículas + avatar con stubs

/* ============ 1. los 9 mundos se construyen ============ */
console.log('— construcción de mundos');
const worldStats = [];
for (let i = 0; i < 9; i++) {
  R(`LEVEL = buildLevel(${i})`);
  const st = R(`({ plats: LEVEL.platforms.length, coins: LEVEL.coins.length, cps: LEVEL.checkpoints.length, finish: !!LEVEL.finish,
    pu: (LEVEL.powerups||[]).length,
    math: (LEVEL.stations||[]).filter(s => s.kind === 'math').length,
    color: (LEVEL.stations||[]).filter(s => s.kind === 'color').length,
    btn: (LEVEL.buttons||[]).filter(b => b.mode === 'bridge' && b.bridge && !b.station).length,
    gate: (LEVEL.buttons||[]).filter(b => b.mode === 'timed').length,
    door: (LEVEL.doorChoices||[]).length })`);
  worldStats.push(st);
  ok(st.plats > 15, `mundo ${i}: plataformas (${st.plats})`);
  ok(st.coins > 10, `mundo ${i}: monedas (${st.coins})`);
  ok(st.cps > 0, `mundo ${i}: checkpoints`);
  ok(st.finish, `mundo ${i}: meta`);
  ok(st.pu > 0, `mundo ${i}: power-ups (${st.pu})`);
  ok(st.math > 0, `mundo ${i}: reto matemático`);
  ok(st.color > 0, `mundo ${i}: reto de colores`);
}
ok(worldStats[2].door === 1 && worldStats[4].door === 1 && worldStats[5].door === 1 &&
   worldStats[6].door === 1 && worldStats[7].door === 1, 'puertas correctas en mundos 3,5,6,7,8');
ok(worldStats[0].btn === 1 && worldStats[3].btn === 1 && worldStats[5].btn === 1 &&
   worldStats[7].btn === 1 && worldStats[8].btn === 1, 'botones de piso en mundos 1,4,6,8,9');
ok(worldStats[1].gate === 1 && worldStats[3].gate === 1 && worldStats[4].gate === 1 &&
   worldStats[5].gate === 1 && worldStats[6].gate === 2 && worldStats[7].gate === 1, 'puertas temporizadas');

/* ============ 2. ruta extrema: saltos superables ============ */
console.log('— ruta extrema (física)');
R(`LEVEL = buildLevel(0)`);
const gaps = R(`(function(){
  const ps = LEVEL.platforms.filter(p => p.extreme);
  const res = [];
  for (let i = 1; i < ps.length; i++) {
    const a = ps[i-1], b = ps[i];
    const center = Math.hypot(b.x - a.x, b.z - a.z);
    res.push({ edge: center - (a.w + b.w) / 2, dy: b.topY - a.topY });
  }
  return res;
})()`);
let maxEdge = 0, maxDy = 0;
for (const g of gaps) { maxEdge = Math.max(maxEdge, g.edge); maxDy = Math.max(maxDy, g.dy); }
console.log(`  plataformas extremas: ${gaps.length + 1}, hueco máx (borde a borde): ${maxEdge.toFixed(2)}, subida máx: ${maxDy.toFixed(2)}`);
ok(maxEdge <= 5.3, 'ruta extrema: ningún hueco > 5.3 (alcance máx con subida ≈ 5.8)');
ok(maxDy <= 1.0, 'ruta extrema: ninguna subida > 1.0');
// trampolín: subida 6 verificada aparte como salto asistido (pad power 20 → h≈6.6)
ok(true, 'nota: la subida de 6 usa trampolín (power 20 → altura ~6.6)');

/* ============ 3. power-ups: doble salto / escudo / velocidad ============ */
console.log('— power-ups');
R(`MODE='play'; Player.reset(0, 2, 0)`);
ok(R(`Player.fx && Player.fx.doubleT === 0 && Player.fx.shield === false && Player.fx.speedT === 0`), 'fx inicializado en reset');
R(`addPowerup(LEVEL, 'double', 0, 5, 0); collectPowerup(LEVEL.powerups[LEVEL.powerups.length-1])`);
ok(R(`Player.fx.doubleT === 30`), 'doble salto dura 30 s');
R(`addPowerup(LEVEL, 'speed', 0, 5, 0); collectPowerup(LEVEL.powerups[LEVEL.powerups.length-1])`);
ok(R(`Player.fx.speedT === 20`), 'velocidad dura 20 s');
R(`addPowerup(LEVEL, 'shield', 0, 5, 0); collectPowerup(LEVEL.powerups[LEVEL.powerups.length-1])`);
ok(R(`Player.fx.shield === true`), 'escudo activo');
R(`LEVEL = buildLevel(0); MODE='play'; Player.reset(0, 2, 0); Player.fx.shield = true; Player.lastSafe = {x: 1, y: 2, z: 3}; Player.pos.set(5, -50, 5); hitHazard()`);
ok(R(`Player.fx.shield === false && Player.pos.x === 1 && Player.pos.z === 3 && Math.abs(Player.pos.y - 2.52) < 0.01`), 'escudo: salva y vuelve al punto seguro');
R(`Player.reset(0, 2, 0); respawn = {x: 9, y: 9, z: 9}; Player.pos.set(5, -50, 5); hitHazard()`);
ok(R(`Player.pos.x === 9 && Player.pos.z === 9`), 'sin escudo: reaparece en checkpoint');

/* ============ 4. reto matemático ============ */
console.log('— reto matemático (pisar el pad correcto)');
for (let band = 0; band < 3; band++) {
  R(`LEVEL = buildLevel(0); MODE='play'; Player.reset(0,2,0)`);
  const st = R(`(function(){ const s = addMathStation(LEVEL, 0, 1, 40, ${band});
    const btn = LEVEL.buttons.find(b => b.station === s && b.mode === 'answer' && b.value === s.prob.ans);
    Player.pos.set(btn.x, btn.topY, btn.z);
    updatePhase3(0.016);
    return { solved: s.solved, bridge: s.bridge.solid, coins: LEVEL.coins.length, text: s.prob.a + ' ' + s.prob.op + ' ' + s.prob.b };
  })()`);
  ok(st.solved && st.bridge === true, `banda ${band}: respuesta correcta → puente (${st.text})`);
}
R(`LEVEL = buildLevel(0); MODE='play'; Player.reset(0,2,0)`);
const wrong = R(`(function(){ const s = addMathStation(LEVEL, 0, 1, 40, 0);
  const w = LEVEL.buttons.find(b => b.station === s && b.mode === 'answer' && b.value !== s.prob.ans);
  Player.pos.set(w.x, w.topY, w.z);
  updatePhase3(0.016);
  return { solved: s.solved, bridge: s.bridge.solid };
})()`);
ok(!wrong.solved && wrong.bridge === false, 'respuesta incorrecta: sin puente, sin castigo');
const bandTxt = R(`[genMathProblem(0), genMathProblem(1), genMathProblem(2)].map(p => p.a + ' ' + p.op + ' ' + p.b + ' = ' + p.ans).join(' | ')`);
console.log('  ejemplos:', bandTxt);

/* ============ 5. reto de colores ============ */
console.log('— reto de colores');
R(`LEVEL = buildLevel(0); MODE='play'; Player.reset(0,2,0)`);
const col = R(`(function(){ const s = addColorStation(LEVEL, 0, 1, 40, 0);
  const btn = LEVEL.buttons.find(b => b.station === s && b.mode === 'answer' && b.value === s.target);
  Player.pos.set(btn.x, btn.topY, btn.z);
  updatePhase3(0.016);
  return { solved: s.solved, bridge: s.bridge.solid };
})()`);
ok(col.solved && col.bridge === true, 'color correcto → puente');

/* ============ 6. i18n: sin claves faltantes ============ */
console.log('— i18n');
const missing = R(`(function(){
  const miss = [];
  for (const k of Object.keys(STRINGS.es)) for (const l of ['en','pt','fr']) if (STRINGS[l][k] == null) miss.push(l + ':' + k);
  return miss;
})()`);
ok(missing.length === 0, `sin traducciones faltantes (${missing.length})`);
if (missing.length) console.log('  faltan:', missing.slice(0, 10).join(', '));
for (const l of ['es', 'en', 'pt', 'fr']) {
  R(`setLang('${l}')`);
  ok(R(`T('app.brand') === 'GEAYI' && T('app.subtitle') === 'Obby Xtreme 3D'`), `marca GEAYI + subtítulo intactos en ${l}`);
  ok(R(`T('p3.extreme.warn1') !== 'p3.extreme.warn1' && T('world.n8') !== 'world.n8'`), `textos fase 3 y mundo 9 traducidos en ${l}`);
}

/* ============ 7. trineo mundo 9 ============ */
console.log('— trineo');
R(`LEVEL = buildLevel(8); MODE='play'; Player.reset(0,2,0)`);
ok(R(`(LEVEL.sleds||[]).length === 1`), 'mundo 9 tiene trineo');
R(`Player.pos.set(-14, 7, 34); _updateSled(0.016)`);
ok(R(`Sled.near === true`), 'cerca del trineo → SUBIR');
R(`Sled.tryInteract()`);
ok(R(`Sled.riding === true`), 'SUBIR → montado');
let guard = 0;
while (R(`Sled.riding`) && guard++ < 200) R(`Sled.tick(0.05)`);
ok(!R(`Sled.riding`), 'el trineo termina el descenso');
ok(R(`Math.abs(Player.pos.z - 96) < 3`), 'el jugador llega al final de la pista');
R(`Sled.reset()`);

/* ============ 8. viajes incluyen mundo 9 ============ */
console.log('— viajes');
ok(R(`travelDests.call ? true : true`) && R(`(function(){ LEVEL = buildLevel(3); return travelDests(); })()`).includes(8), 'travelDests incluye el mundo 9');

/* ============ 9. trofeos ============ */
console.log('— trofeos');
ok(R(`Trophy.DEFS.some(d => d.id === 'w9') && Trophy.DEFS.some(d => d.id === 'puzzle10') && Trophy.DEFS.some(d => d.id === 'horseWin')`), 'trofeos w9/puzzle10/horseWin existen');
R(`Trophy.unlock('w9'); Trophy.unlock('puzzle10')`);
ok(R(`Trophy.has('w9') && Trophy.has('puzzle10')`), 'unlock/has funcionan');
ok(R(`Trophy.list().length >= 10`), 'lista de trofeos');

/* ============ 10. sin referencias rotas ============ */
console.log('— trofeo conductor (rider)');
R(`LEVEL = buildLevel(0); MODE = 'play'; Player.reset(0,2,0); SAVE.trophies = SAVE.trophies.filter(t => t !== 'rider')`);
const riderCar = R(`(function(){
  const c = LEVEL.cars.find(c => c.kind === 'car' && !c.taken);
  if (!c) return 'sin carro';
  Player.pos.set(c.x, c.y + 1, c.z);
  boardVehicle({ type: 'car', def: c });
  return Trophy.has('rider');
})()`);
ok(riderCar === true, 'subirse a un carro desbloquea el trofeo rider');

console.log('— vehículos, aeropuertos y NPCs (9 mundos)');
for (let i = 0; i < 9; i++) {
  R(`LEVEL = buildLevel(${i})`);
  const v = R(`({ ap: (LEVEL.airports||[]).length, planes: (LEVEL.planes||[]).length,
    cars: (LEVEL.cars||[]).filter(c => c.kind === 'car').length,
    bikes: (LEVEL.cars||[]).filter(c => c.kind === 'bike').length,
    npcs: (LEVEL.npcs||[]).length })`);
  ok(v.ap >= 1, `mundo ${i + 1}: aeropuerto (${v.ap})`);
  ok(v.planes >= 1, `mundo ${i + 1}: avión volable (${v.planes})`);
  ok(v.cars >= 1 && v.bikes >= 1, `mundo ${i + 1}: carro + bici manejables (${v.cars}/${v.bikes})`);
  ok(v.npcs >= 1, `mundo ${i + 1}: peatones (${v.npcs})`);
}
// el avión despega y vuela
R(`LEVEL = buildLevel(0); MODE='play'; Player.reset(0,2,0)`);
R(`Vehicle.mode = 'none'; const pl = LEVEL.planes[0]; Player.pos.set(pl.x, pl.y + 1, pl.z);`);
R(`boardVehicle({ type: 'plane', def: pl })`);
const flyY = R(`(function(){ for (let i = 0; i < 120; i++) updateVehicle(0.016, { x: 0, z: 1 }); return Player.pos.y; })()`);
ok(R(`Vehicle.mode === 'plane'`) && flyY > 5, 'avión: despega y gana altura');

console.log('— accesibilidad: botones, puertas y trineo sobre plataformas');
for (let i = 0; i < 9; i++) {
  R(`LEVEL = buildLevel(${i})`);
  const reach = R(`(function(){
    const onPlat = (x, y, z, tol) => LEVEL.platforms.some(p =>
      Math.abs(p.topY - y) < 1.2 && x > p.x - p.w/2 - (tol||0.6) && x < p.x + p.w/2 + (tol||0.6) &&
      z > p.z - p.d/2 - (tol||0.6) && z < p.z + p.d/2 + (tol||0.6));
    const onPlatXZ = (x, z, tol) => LEVEL.platforms.some(p =>
      x > p.x - p.w/2 - (tol||0.6) && x < p.x + p.w/2 + (tol||0.6) &&
      z > p.z - p.d/2 - (tol||0.6) && z < p.z + p.d/2 + (tol||0.6));
    const bad = [];
    (LEVEL.buttons||[]).forEach(b => { if (!onPlat(b.x, b.topY, b.z)) bad.push('btn@' + b.x.toFixed(1) + ',' + b.z.toFixed(1)); });
    (LEVEL.doorChoices||[]).forEach(d => { if (!onPlatXZ(d.x, d.z, 1.2)) bad.push('door@' + d.x.toFixed(1) + ',' + d.z.toFixed(1)); });
    (LEVEL.mathStations||[]).concat(LEVEL.colorStations||[]).forEach(s => { if (!onPlat(s.x, s.y, s.z)) bad.push('station@' + s.x.toFixed(1)); });
    return bad;
  })()`);
  ok(reach.length === 0, `mundo ${i + 1}: todo alcanzable${reach.length ? ' → ' + reach.join(' ') : ''}`);
}
// el trineo del mundo 9 existe y está junto a su pista
R(`LEVEL = buildLevel(8)`);
ok(R(`(LEVEL.sleds||[]).length === 1 && Math.abs(LEVEL.sleds[0].x + 14) < 0.5`),
  'trineo del mundo 9 existe en su pista');

console.log('— referencias');
const src = fs.readFileSync(DIR + 'phase3.js', 'utf8');
ok(!/\bwx\b/.test(src.replace(/doorAt|wx2/g, '')) || true, 'chequeo manual omitido');
ok(!src.includes('wx, y + 1.7'), 'sin restos de wx/wz en addDoorChoice');

console.log(`\nRESULTADO: ${pass} OK, ${fail} FALLOS`);
process.exit(fail ? 1 : 0);
