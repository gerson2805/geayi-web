/* Pruebas de la BOLERA GEAYI (bowling.js): edificio solo en idx 3,
   física determinista, juego completo con NPCs y premio */
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
    querySelector() { return null; }, querySelectorAll() { return []; },
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
  setScalar(s) { this.x = this.y = this.z = s; return this; }
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
  clone() { const c = Object.create(Object.getPrototypeOf(this)); Object.assign(c, this); c.position = this.position.clone(); c.children = []; return c; }
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
  'player.js', 'phase3.js', 'trophies.js', 'funpark.js', 'bowling.js'];
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
ok(documentStub.body.children.length === 0, 'bowling.js no toca el DOM al cargar');
ok(R('typeof Bowling') === 'object', 'existe Bowling');
ok(R('typeof Bowling.init') === 'function', 'Bowling.init existe');
ok(R('typeof Bowling.buildForLevel') === 'function', 'Bowling.buildForLevel existe');
ok(R('typeof Bowling.update') === 'function', 'Bowling.update existe');
R('Bowling.init(); Bowling.init();');
ok(documentStub.body.children.filter(c => c.id === 'bw-play').length === 1, 'init() idempotente (un solo botón JUGAR)');
ok(R('!!Bowling._els["bw-throw"]'), 'hay UI creada');
const btnSizes = R(`['bw-play','bw-aimL','bw-aimR','bw-throw','bw-exit'].map(id => Bowling._els[id].style.cssText).join('|')`);
ok(/min-width:56px/.test(btnSizes) && /min-height:56px/.test(btnSizes), 'botones ≥56px (táctil)');
ok(R(`T('bowl.play')`) === '🎳 JUGAR', 'i18n es registrado');
R(`setLang('en')`);
ok(R(`T('bowl.play')`) === '🎳 PLAY', 'i18n en registrado');
R(`setLang('es')`);

/* ============ 1. la bolera solo se construye en idx 3 ============ */
console.log('— bolera solo en Immokalee (idx 3)');
for (let i = 0; i < 9; i++) {
  R(`LEVEL = buildLevel(${i}); Bowling.buildForLevel(${i}, LEVEL.group);`);
  const built = R('!!Bowling.alley');
  ok(built === (i === 3), `idx${i}: bolera ${i === 3 ? 'construida' : 'ausente'}`);
}
R('LEVEL = buildLevel(3); Bowling.buildForLevel(3, LEVEL.group);');
ok(R('Bowling.alley.lanes.length') === 3, '3 pistas');
ok(R('Bowling.alley.lanes.every(l => l.pins.length === 10)'), '10 pinos por pista');
const bx = R('Bowling.alley.group.children.length');
ok(bx > 40, `edificio con contenido (${bx} nodos)`);
ok(Math.abs(R('BWL.cx') - (-144)) < 0.01 && Math.abs(R('BWL.cz') - 25) < 0.01, 'ubicación (-144, 25)');

/* ============ 2. física determinista ============ */
console.log('— física determinista');
const r1 = R('Bowling.simThrow(0.7, 0)');
const r2 = R('Bowling.simThrow(0.7, 0)');
ok(r1.pins === r2.pins, `tiro repetible: ${r1.pins} pinos ambas veces`);
ok(r1.pins >= 3 && r1.pins <= 10, `tiro centrado tumba entre 3 y 10 (${r1.pins})`);
const gut = R('Bowling.simThrow(0.9, 2)');
ok(gut.pins === 0, 'tiro al canal (notch 2): 0 pinos');
const weak = R('Bowling.simThrow(0.25, 0)');
ok(weak.pins >= 0 && weak.pins <= 10, 'tiro suave no rompe nada');
const r3 = R('Bowling.simThrow(1, 0)');
ok(r3.pins >= r1.pins, `más potencia no tumba menos (${r3.pins} >= ${r1.pins})`);
const rLow = R('Bowling.simThrow(0.25, 0)');
ok(rLow.pins < r3.pins, `poca potencia tumba menos que máxima (${rLow.pins} < ${r3.pins})`);
const rMid = R('Bowling.simThrow(0.55, 0)');
ok(rMid.pins >= rLow.pins && rMid.pins <= r3.pins, `potencia media en rango (${rMid.pins})`);

/* ============ 3. juego completo: 3 rondas, 2 NPC, ganador y marcador ============ */
console.log('— juego completo con NPCs');
R('MODE = "play"; finished = false;');
R('Player.reset(-152.5, 2, 25); Vehicle.mode = "none"; Vehicle.def = null;');
R('SAVE.coins = 100;');
R('Bowling.npcResult = () => 4;'); // NPC determinista: 4 pinos por tiro
R('Bowling.startGame();');
ok(R('!!Bowling.game'), 'el juego arranca');
ok(R('Bowling.game.players.length') === 3, 'jugador + 2 NPC');
ok(R('Bowling.game.players[1].id') === 'ian' && R('Bowling.game.players[2].id') === 'yael', 'NPCs de FAMILY (ian, yael)');
ok(R('Bowling.game.npcMeshes.length') === 2, '2 avatares NPC en la pista');
// bombear el loop hasta terminar (tiros del jugador con potencia fija)
R(`(function(){
  let n = 0;
  while (Bowling.game && Bowling.game.state !== 'over' && n < 40000) {
    if (Bowling.game.state === 'aim') Bowling._launch(0.75);
    Bowling.update(1/60);
    n++;
  }
  return n;
})()`);
ok(R('Bowling.game && Bowling.game.state') === 'over', '3 rondas terminan en game over');
const pScore = R('Bowling.game.scores["player"]');
const expPins = R('Bowling.simThrow(0.75, 0).pins');
ok(pScore[0] === expPins && pScore[1] === expPins && pScore[2] === expPins,
  `marcador del jugador cuadra (${pScore.join(',')})`);
ok(R('Bowling.game.scores["ian"].join(",")') === '4,4,4', 'marcador de ian cuadra (4,4,4)');
ok(R('Bowling.game.scores["yael"].join(",")') === '4,4,4', 'marcador de yael cuadra (4,4,4)');
const totals = R(`Bowling.game.players.map(p => Bowling.game.scores[p.id][0]+Bowling.game.scores[p.id][1]+Bowling.game.scores[p.id][2]).join(',')`);
console.log('  totales:', totals);

/* ============ 4. premio +20 🪙 si gana el jugador ============ */
console.log('— premio al ganador');
R('Bowling.exitGame(true);');
R('SAVE.coins = 100;');
R('Bowling.npcResult = () => 0;'); // NPCs no tumban nada: el jugador gana seguro
R('Bowling.startGame();');
R(`(function(){
  let n = 0;
  while (Bowling.game && Bowling.game.state !== 'over' && n < 40000) {
    if (Bowling.game.state === 'aim') Bowling._launch(0.8);
    Bowling.update(1/60);
    n++;
  }
  return n;
})()`);
ok(R('Bowling.game.state') === 'over', 'segundo juego termina');
ok(R('SAVE.coins') === 120, 'el jugador gana → +20 🪙 (100 → 120)');
R('Bowling.exitGame(true);');
ok(R('Bowling.game') === null, 'exitGame limpia el juego');
ok(R('Bowling._els["bw-panel"].style.display') === 'none', 'exitGame oculta la UI');

/* ============ 5. integración con startLevel (limpieza) ============ */
console.log('— limpieza al cambiar de nivel');
R('LEVEL = buildLevel(3); Bowling.buildForLevel(3, LEVEL.group); Bowling.startGame();');
R('Bowling.buildForLevel(0, LEVEL.group);');
ok(R('Bowling.alley') === null && R('Bowling.game') === null, 'buildForLevel(0) limpia bolera y juego');
ok(R('Object.keys(Bowling._cacheG()).length') === 0, 'cachés vaciadas al salir');
R('LEVEL = buildLevel(3); Bowling.buildForLevel(3, LEVEL.group);');
ok(R('!!Bowling.alley') && R('Object.keys(Bowling._cacheG()).length') > 0, 'al volver a idx 3 la bolera se reconstruye con geometrías frescas');
ok(R('Bowling.alley.lanes.every(l => l.pins.length === 10)'), '10 pinos por pista tras reconstruir');

console.log(`\n${pass} OK · ${fail} FAIL`);
process.exit(fail ? 1 : 0);
