/* Pruebas de SUPERPODERES (powers.js): desbloqueo con monedas, desbloqueo por
   mundo, activación de los 5 poderes, efectos, persistencia, i18n y update.
   Patrón de tests/funtest.js (stubs THREE/DOM propios). */
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
  'player.js', 'phase3.js', 'trophies.js', 'powers.js'];
for (const f of FILES) {
  vm.runInContext(fs.readFileSync(DIR + f, 'utf8'), sandbox, { filename: f });
}

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; }
  else { fail++; console.log('  ✗ FAIL:', name); }
}
const R = (expr) => vm.runInContext(expr, sandbox);
R('initThree(); Particles.init(); Avatar.build(); Powers.init();');
R(`LEVEL = buildLevel(0); MODE = 'play'; finished = false;`);
R('Player.reset(LEVEL.start.x, LEVEL.start.y, LEVEL.start.z); Vehicle.mode = "none"; Vehicle.def = null;');
function resetPowers() {
  R(`SAVE.powers = {speed:false,magnet:false,jump:false,shield:false,dash:false};
     SAVE.activePowers = {speed:false,magnet:false,jump:false,shield:false,dash:false};
     SAVE.coins = 0; Powers.dashCd = 0;`);
}

/* ============ 0. módulo y carga limpia ============ */
console.log('— módulo y carga limpia');
ok(R('typeof Powers') === 'object', 'existe Powers');
for (const m of ['init', 'buildForLevel', 'update', 'dash', 'toggle', 'unlockWithCoins', 'onWorldComplete', 'isUnlocked', 'isActive', 'speedMult', 'jumpMult', 'magnetRadius', 'hudChips', 'openPanel', 'closePanel', 'deactivateAll'])
  ok(R(`typeof Powers.${m}`) === 'function', 'Powers.' + m + ' existe');
ok(R('POWER_DEFS.length') === 13, 'hay 13 poderes definidos (5 + 8 técnicas)');
ok(R('POWER_DEFS.every(d => d.id && d.emoji && d.price >= 40 && d.price <= 800)') === true, 'precios entre 40 y 800 🪙');

/* ============ 1. i18n es/en ============ */
console.log('— i18n es/en');
R(`setLang('es')`);
const NAMES_ES = { speed: 'Súper velocidad', magnet: 'Imán dorado', jump: 'Salto potenciado', shield: 'Escudo de energía', dash: 'Dash eléctrico' };
const NAMES_EN = { speed: 'Super speed', magnet: 'Golden magnet', jump: 'Power jump', shield: 'Energy shield', dash: 'Electric dash' };
for (const id of Object.keys(NAMES_ES)) ok(R(`T('pow.${id}.name')`) === NAMES_ES[id], `es: pow.${id}.name`);
R(`setLang('en')`);
for (const id of Object.keys(NAMES_EN)) ok(R(`T('pow.${id}.name')`) === NAMES_EN[id], `en: pow.${id}.name`);
ok(R(`T('pow.title')`) === '⚡ Superpowers', 'en: pow.title');
R(`setLang('es')`);
ok(R(`T('pow.title')`) === '⚡ Superpoderes', 'es: pow.title');

/* ============ 2. forma del SAVE ============ */
console.log('— SAVE');
resetPowers();
ok(R(`['speed','magnet','jump','shield','dash'].every(id => SAVE.powers[id] === false)`) === true, 'SAVE.powers con las 5 claves en false');
ok(R(`['speed','magnet','jump','shield','dash'].every(id => SAVE.activePowers[id] === false)`) === true, 'SAVE.activePowers con las 5 claves en false');
ok(R(`['speed','magnet','jump','shield','dash'].every(id => !Powers.isUnlocked(id) && !Powers.isActive(id))`) === true, 'nada desbloqueado ni activo al inicio');

/* ============ 3. desbloqueo con monedas ============ */
console.log('— desbloqueo con monedas');
resetPowers();
R('SAVE.coins = 1000;');
ok(R(`Powers.unlockWithCoins('speed')`) === true, 'desbloquea speed con monedas');
ok(R('SAVE.coins') === 600, 'cobra 400 🪙 (1000 → 600)');
ok(R(`Powers.isUnlocked('speed')`) === true, 'speed queda desbloqueado');
ok(R(`Powers.unlockWithCoins('speed')`) === false, 'no cobra dos veces el mismo poder');
ok(R('SAVE.coins') === 600, 'sin segundo cobro');
R('SAVE.coins = 100;');
ok(R(`Powers.unlockWithCoins('shield')`) === false, 'sin monedas suficientes no desbloquea');
ok(R('SAVE.coins') === 100, 'no cobra si no alcanza');
ok(R(`Powers.isUnlocked('shield')`) === false, 'shield sigue bloqueado');
ok(R(`Powers.unlockWithCoins('noexiste')`) === false, 'id inválido → false');
const saved = localStorageStub.getItem('obbyXtreme3D_v1') || '';
ok(saved.indexOf('"speed":true') !== -1, 'persiste SAVE.powers en localStorage');

/* ============ 4. desbloqueo por mundo ============ */
console.log('— desbloqueo por mundo (gratis)');
resetPowers();
ok(JSON.stringify(R('Powers.onWorldComplete(3)')) === '["speed"]', 'mundo 1 (Immokalee, idx 3) → speed gratis');
ok(R(`Powers.isUnlocked('speed')`) === true, 'speed desbloqueado por mundo');
ok(JSON.stringify(R('Powers.onWorldComplete(0)')) === '["magnet"]', 'mundo 2 (Ciudad Neón, idx 0) → magnet gratis');
ok(JSON.stringify(R('Powers.onWorldComplete(1)')) === '["jump"]', 'mundo 3 (Volcán, idx 1) → jump gratis');
ok(JSON.stringify(R('Powers.onWorldComplete(4)')) === '["shield"]', 'mundo 5 (Honduras, idx 4) → shield gratis');
ok(JSON.stringify(R('Powers.onWorldComplete(6)')) === '["dash"]', 'mundo 7 (USA, idx 6) → dash gratis');
ok(JSON.stringify(R('Powers.onWorldComplete(2)')) === '["water"]', 'mundo con técnica → water gratis');
ok(JSON.stringify(R('Powers.onWorldComplete(3)')) === '[]', 'poder ya desbloqueado no se otorga de nuevo');
ok(R('SAVE.coins') === 0, 'el desbloqueo por mundo no cuesta monedas');

/* ============ 5. activación y multiplicadores ============ */
console.log('— activación y multiplicadores');
resetPowers();
ok(R(`Powers.toggle('speed')`) === false, 'no se activa un poder bloqueado');
ok(R(`Powers.isActive('speed')`) === false, 'sigue inactivo');
R(`SAVE.powers.speed = true; SAVE.powers.jump = true; SAVE.powers.magnet = true; SAVE.powers.shield = true; SAVE.powers.dash = true;`);
ok(R(`Powers.toggle('speed')`) === true, 'activa speed');
ok(R(`Powers.isActive('speed')`) === true, 'speed activo');
ok(R('Powers.speedMult()') === 1.7, 'speedMult = 1.7 activo');
ok(R(`Powers.toggle('speed')`) === false, 'desactiva speed');
ok(R('Powers.speedMult()') === 1, 'speedMult = 1 inactivo');
ok(R(`Powers.toggle('jump')`) === true && R('Powers.jumpMult()') === 1.6, 'jump activo → jumpMult 1.6');
ok(R(`Powers.toggle('magnet')`) === true && R('Powers.magnetRadius()') === 14, 'magnet activo → radio 14');
ok(R(`Powers.toggle('magnet')`) === false && R('Powers.magnetRadius()') === 3.2, 'magnet inactivo → radio 3.2');
ok(R(`Powers.toggle('dash')`) === false, 'dash no es toggle (se usa con dash())');
ok(R(`Powers.hudChips()`).indexOf('🐸') !== -1, 'hudChips muestra 🐸 con jump activo');
R('Powers.deactivateAll();');
ok(R(`Powers.hudChips()`).indexOf('🐸') === -1 && R(`Powers.hudChips()`).indexOf('⚡') === -1, 'hudChips sin chips de poderes toggle');
ok(R(`Powers.hudChips()`).indexOf('💨') !== -1, 'hudChips conserva el chip de dash desbloqueado');
ok(R(`['speed','magnet','jump','shield'].every(id => !Powers.isActive(id))`) === true, 'deactivateAll apaga todo');

/* ============ 6. dash eléctrico ============ */
console.log('— dash eléctrico');
resetPowers();
R(`SAVE.powers.dash = true; MODE = 'play';`);
R('Player.reset(0, 2, 0); Player.vel.set(0, 0, 0); Player.heading = 0; Vehicle.mode = "none";');
ok(R('Powers.dash()') === true, 'dash se ejecuta desbloqueado y en play');
ok(Math.abs(R('Player.vel.z') - 26) < 0.01 && Math.abs(R('Player.vel.x')) < 0.01, 'impulso de 26 en dirección del heading');
ok(R('Powers.dashCd') === 5, 'cooldown de 5 s');
ok(R('Powers.dash()') === false, 'bloqueado durante el cooldown');
R('Powers.dashCd = 0; SAVE.powers.dash = false;');
ok(R('Powers.dash()') === false, 'bloqueado si el poder no está desbloqueado');
R(`SAVE.powers.dash = true; MODE = 'menu';`);
ok(R('Powers.dash()') === false, 'no hace dash fuera de play');
R(`MODE = 'play'; Vehicle.mode = 'car';`);
ok(R('Powers.dash()') === false, 'no hace dash subido a un vehículo');
R(`Vehicle.mode = 'none'; Powers.dashCd = 0.2; Powers.update(0.1); Powers.update(0.1);`);
ok(R('Powers.dashCd') === 0, 'el cooldown decae con update(dt)');
R(`Powers.dashCd = 0; Player.vel.set(3, 0, 4);`);
ok(R('Powers.dash()') === true, 'dash con velocidad previa');
{
  const vx = R('Player.vel.x'), vz = R('Player.vel.z');
  ok(Math.abs(Math.hypot(vx, vz) - 26) < 0.01, 'el dash conserva la dirección del movimiento');
}

/* ============ 7. integración física con player.js ============ */
console.log('— integración física (player.js)');
resetPowers();
R(`SAVE.powers.speed = true;`);
R('Player.reset(LEVEL.start.x, LEVEL.start.y, LEVEL.start.z);');
for (let i = 0; i < 5; i++) R('updatePlayer(0.016, { x: 0, z: 0, jump: false });');
R('var _p0 = { x: Player.pos.x, z: Player.pos.z };');
for (let i = 0; i < 60; i++) R('updatePlayer(0.016, { x: 0, z: 1, jump: false });');
const dBase = R('Math.hypot(Player.pos.x - _p0.x, Player.pos.z - _p0.z)');
R(`Powers.toggle('speed');`);
R('Player.reset(LEVEL.start.x, LEVEL.start.y, LEVEL.start.z);');
for (let i = 0; i < 5; i++) R('updatePlayer(0.016, { x: 0, z: 0, jump: false });');
R('var _p1 = { x: Player.pos.x, z: Player.pos.z };');
for (let i = 0; i < 60; i++) R('updatePlayer(0.016, { x: 0, z: 1, jump: false });');
const dFast = R('Math.hypot(Player.pos.x - _p1.x, Player.pos.z - _p1.z)');
ok(dFast > dBase * 1.4, `súper velocidad corre más (${dBase.toFixed(1)} → ${dFast.toFixed(1)})`);
R(`Powers.toggle('speed');`); // apagar
// salto potenciado
resetPowers();
R(`SAVE.powers.jump = true;`);
R('Player.reset(LEVEL.start.x, LEVEL.start.y, LEVEL.start.z);');
for (let i = 0; i < 5; i++) R('updatePlayer(0.016, { x: 0, z: 0, jump: false });');
R('Player.jumpBuf = 0.14; updatePlayer(0.016, { x: 0, z: 0, jump: false });');
const vyBase = R('Player.vel.y');
R(`Powers.toggle('jump');`);
R('Player.reset(LEVEL.start.x, LEVEL.start.y, LEVEL.start.z);');
for (let i = 0; i < 5; i++) R('updatePlayer(0.016, { x: 0, z: 0, jump: false });');
R('Player.jumpBuf = 0.14; updatePlayer(0.016, { x: 0, z: 0, jump: false });');
const vyJump = R('Player.vel.y');
ok(vyBase > 10 && vyBase < 13, `salto base ≈ 12 (${vyBase.toFixed(1)})`);
ok(vyJump > 17, `salto potenciado ≈ 19.2 (${vyJump.toFixed(1)})`);
R(`Powers.toggle('jump');`);
// imán de monedas
ok(R('LEVEL.coins.length') > 0, 'el nivel tiene monedas');
R(`SAVE.powers.magnet = true; Powers.toggle('magnet');`); // desbloquear + ACTIVAR
R(`var _c = LEVEL.coins[0]; _c.taken = false; _c.mesh.visible = true;
   _c.mesh.position.set(Player.pos.x + 10, Player.pos.y + 1, Player.pos.z);`);
const d0 = R('Math.abs(_c.mesh.position.x - Player.pos.x)');
for (let i = 0; i < 3; i++) R('updatePlayer(0.016, { x: 0, z: 0, jump: false });');
const d1 = R('Math.abs(_c.mesh.position.x - Player.pos.x)');
ok(d1 < d0 - 1, `imán atrae la moneda lejana (${d0.toFixed(1)} → ${d1.toFixed(1)})`);
R(`Powers.toggle('magnet');`);
R(`_c.mesh.position.set(Player.pos.x + 10, Player.pos.y + 1, Player.pos.z);`);
for (let i = 0; i < 3; i++) R('updatePlayer(0.016, { x: 0, z: 0, jump: false });');
const d2 = R('Math.abs(_c.mesh.position.x - Player.pos.x)');
ok(Math.abs(d2 - 10) < 0.01, 'sin imán la moneda lejana no se mueve');

/* ============ 8. escudo de energía ============ */
console.log('— escudo de energía');
resetPowers();
R(`SAVE.powers.shield = true; SAVE.activePowers.shield = false;`);
R('Player.reset(0, 2, 0); Player.fx.shield = false;');
R(`Powers.toggle('shield'); Powers.update(0.016);`);
ok(R('Player.fx.shield') === true, 'el escudo sostiene P.fx.shield');
ok(R('Powers._fx.bubble.visible') === true, 'burbuja visible');
{
  const bx = R('Powers._fx.bubble.position.x');
  ok(Math.abs(bx - R('Player.pos.x')) < 0.01, 'la burbuja sigue al jugador');
}
R(`Player.lastSafe = { x: 5, y: 3, z: 7 }; hitHazard();`);
ok(R('Player.fx.shield') === false, 'hitHazard consume el escudo (protección real)');
ok(Math.abs(R('Player.pos.x') - 5) < 0.01, 'con escudo reaparece en el punto seguro, no en el inicio');
R('Powers.update(0.016);');
ok(R('Player.fx.shield') === true, 'el poder vuelve a sostener el escudo');
R(`Powers.toggle('shield'); Powers.update(0.016);`);
ok(R('Player.fx.shield') === false, 'al desactivar se libera P.fx.shield');
ok(R('Powers._fx.bubble.visible') === false, 'burbuja oculta al desactivar');

/* ============ 9. FX, limpieza y 120 cuadros ============ */
console.log('— FX, limpieza y 120 cuadros');
resetPowers();
R(`SAVE.powers.speed = true; SAVE.powers.magnet = true; SAVE.powers.jump = true; SAVE.powers.shield = true;
   SAVE.activePowers.speed = true; SAVE.activePowers.magnet = true; SAVE.activePowers.jump = true; SAVE.activePowers.shield = true;`);
R('Player.reset(0, 2, 0);');
R('Powers.update(0.016);');
ok(R('!!(Powers._fx && Powers._fx.aura && Powers._fx.bubble)') === true, 'aura y burbuja creadas');
ok(R('Powers._fx.aura.visible') === true, 'aura visible con poder activo');
R('Powers.buildForLevel(0, null);');
ok(R('Powers._fx.aura.visible') === false && R('Powers._fx.bubble.visible') === false, 'buildForLevel oculta los FX');
ok(R('Powers.dashCd') === 0, 'buildForLevel reinicia el cooldown');
R(`SAVE.activePowers.speed = true; SAVE.activePowers.magnet = true; SAVE.activePowers.jump = true; SAVE.activePowers.shield = true;`);
R('Player.reset(LEVEL.start.x, LEVEL.start.y, LEVEL.start.z);');
for (let i = 0; i < 120; i++) R('updatePlayer(0.016, { x: 0, z: 1, jump: false }); Powers.update(0.016); Particles.update(0.016);');
ok(true, '120 cuadros de updatePlayer + Powers.update sin errores');
ok(R('Particles.list.length') < 400, `partículas acotadas (${R('Particles.list.length')})`);
R('Powers.deactivateAll();');

/* ============ 10. panel y botón de dash ============ */
console.log('— panel y botón de dash');
resetPowers();
R(`SAVE.coins = 500; Powers.openPanel();`);
ok(R(`Powers._panel.classList.contains('hidden')`) === false, 'openPanel muestra el panel');
{
  const html = R('Powers._panel.innerHTML');
  ok((html.match(/pow-card/g) || []).length === 13, 'el panel muestra los 13 poderes');
  ok(html.indexOf('🪙 400') !== -1 && html.indexOf('data-unlock="speed"') !== -1, 'poder bloqueado muestra precio y botón');
  ok(html.indexOf('🔒') !== -1, 'poder bloqueado muestra 🔒');
}
R(`SAVE.powers.speed = true; Powers._renderPanel();`);
{
  const html = R('Powers._panel.innerHTML');
  ok(html.indexOf('data-toggle="speed"') !== -1 && html.indexOf('Activar') !== -1, 'poder desbloqueado ofrece Activar');
}
R(`Powers.toggle('speed'); Powers._renderPanel();`);
{
  const html = R('Powers._panel.innerHTML');
  ok(html.indexOf('🟢') !== -1, 'poder activo muestra 🟢');
}
R('Powers.closePanel();');
ok(R(`Powers._panel.classList.contains('hidden')`) === true, 'closePanel oculta el panel');
ok(R('!!Powers._dashBtn') === true, 'botón de dash creado en init');
ok(R(`Powers._dashBtn.style.cssText`).indexOf('64px') !== -1, 'botón de dash ≥ 52px');
R(`SAVE.powers.dash = true; MODE = 'play'; Powers.update(0.016);`);
ok(R(`Powers._dashBtn.style.display`) === '', 'botón visible en play con dash desbloqueado');
R(`MODE = 'menu'; Powers.update(0.016);`);
ok(R(`Powers._dashBtn.style.display`) === 'none', 'botón oculto fuera de play');

/* ---- 🌀⭐🔵💥 4 técnicas nuevas: solo en venta (nunca gratis por mundo) ---- */
ok(R(`['spin','star','bolt','beam'].every(id => { const d = Powers.def(id); return d && d.kind === 'tool' && d.freePos === null; })`) === true,
  'spin/star/bolt/beam son herramientas solo en venta');
ok(R(`Powers.def('spin').price === 50 && Powers.def('star').price === 110 && Powers.def('bolt').price === 75 && Powers.def('beam').price === 130`) === true,
  'precios: 50/110/75/130');
ok(R(`Powers.def('web').price === 90 && Powers.def('heroflight').price === 150 && Powers.def('web').freePos === null && Powers.def('heroflight').freePos === null`) === true,
  'telaraña 90 y súper vuelo 150, solo en venta');
R(`SAVE.powers = {}; SAVE.coins = 0; Powers._ensureSave();`);
R(`for (let i = 0; i < 7; i++) Powers.onWorldComplete(i);`);
ok(R(`['spin','star','bolt','beam','web','heroflight'].every(id => !SAVE.powers[id])`) === true,
  'ningún mundo otorga las 6 técnicas nuevas');
ok(R(`Powers._t('pow.shopOnly')`) === '🛒 Solo en venta', 'texto "Solo en venta"');
R(`SAVE.coins = 5000;`);
ok(R(`Powers.unlockWithCoins('spin')`) === true && R(`SAVE.powers.spin`) === true, 'giro turbo se compra');
ok(R(`Powers.unlockWithCoins('star')`) === true, 'poder estrella se compra');
ok(R(`Powers.unlockWithCoins('bolt')`) === true, 'bola de energía se compra');
ok(R(`Powers.unlockWithCoins('beam')`) === true, 'onda turbo se compra');
ok(R(`Powers.unlockWithCoins('web')`) === true, 'telaraña se compra');
ok(R(`Powers.unlockWithCoins('heroflight')`) === true, 'súper vuelo se compra');
/* uso */
R(`SAVE.equippedTool = 'spin'; MODE = 'play'; Powers._toolCd = 0; Powers._spinT = 0;`);
ok(R(`Powers.useTool()`) === true && R(`Powers._spinT`) > 0, 'giro turbo se activa');
R(`Powers.update(0.5);`);
ok(R(`Powers._spinT`) < 2, 'el giro avanza con el tiempo');
R(`SAVE.equippedTool = 'star'; Powers._toolCd = 0;`);
ok(R(`Powers.useTool()`) === true && R(`Powers._starT`) === 10, 'poder estrella se activa 10s');
ok(R(`Powers.speedMult()`) > 1, 'estrella da velocidad extra');
R(`SAVE.equippedTool = 'bolt'; Powers._toolCd = 0; Powers._shots = [];`);
ok(R(`Powers.useTool()`) === true && R(`Powers._shots.length`) === 1 && R(`Powers._shots[0].kind`) === 'bolt',
  'bola de energía se dispara');
R(`SAVE.equippedTool = 'beam'; Powers._toolCd = 0;`);
ok(R(`Powers.useTool()`) === true && R(`!!Powers._beamFx`) === true, 'onda turbo crea el visual');
/* la onda rompe dianas al frente */
R(`Powers.targets = []; Powers.boards = [];`);
R(`Powers.placeTargets({ add(){} }, [[Player.pos.x, Player.pos.z + 8, 't1']]);`);
R(`SAVE.equippedTool = 'beam'; Powers._toolCd = 0; Powers._beamFx = null;`);
R(`Player.heading = 0;`); // mirando +z
ok(R(`Powers.useTool()`) === true, 'onda turbo usada');
ok(R(`Powers.targets[0].alive`) === false, 'la onda rompe la diana al frente');
R(`Powers.update(1);`);
ok(R(`Powers._beamFx`) === null, 'el visual de la onda se limpia');
/* 🕸️ telaraña: jala al jugador */
R(`Powers.targets = []; Powers.placeTargets({ add(){} }, [[Player.pos.x, Player.pos.z + 10, 'tw']]);`);
R(`SAVE.equippedTool = 'web'; Powers._toolCd = 0; Powers._web = null;`);
R(`Player.heading = 0;`);
ok(R(`Powers.useTool()`) === true && R(`!!Powers._web`) === true, 'telaraña se lanza');
ok(R(`Powers._web && Math.abs(Powers._web.ax - Player.pos.x) < 0.01 && Math.abs(Powers._web.az - (Player.pos.z + 10)) < 0.01`) === true,
  'la telaraña apunta a la diana');
R(`Powers.update(2);`);
ok(R(`Powers._web`) === null, 'la telaraña termina y suelta');
/* 🦸 súper vuelo: 15 s */
R(`SAVE.equippedTool = 'heroflight'; Powers._toolCd = 0;`);
ok(R(`Powers.useTool()`) === true && R(`Powers._heroFlyT`) === 15, 'súper vuelo se activa 15s');
R(`Player.pos.y = 0; Powers.update(0.1);`);
ok(R(`Player.vel.y`) > 0, 'el súper vuelo eleva al jugador');
R(`Powers._heroFlyT = 0.01; Powers.update(0.1);`);
ok(R(`Powers._heroFlyT`) <= 0, 'el súper vuelo termina');
R(`Powers._spinT = 0; Powers._starT = 0;`);
/* ============ FX cinematográfico ============ */
R(`Powers._shakeT = 0;`);
ok(R(`(Powers._shakeFX(6, 0.3), Powers._shakeT)`) > 0, 'la sacudida se activa');
ok(R(`(Powers._flashFX(0xff0000, 0.3, 50), true)`) === true, 'el destello no falla');
ok(R(`(Powers._ringFX(0, 0, 0, 0xffffff, 5, 0.4), true)`) === true, 'la onda de choque no falla');
ok(R(`(Powers._auraShow(0xffd23f, 5), Powers._fxAuraFollow)`) === true, 'el aura se muestra y sigue al jugador');
R(`Powers._auraHide();`);
ok(R(`Powers._fxAuraFollow`) === false, 'el aura se oculta');
R(`SAVE.equippedTool = 'spin'; Powers._toolCd = 0; Powers.useTool();`);
ok(R(`Powers._fxAuraFollow`) === true, 'el giro activa el aura');
R(`Powers.update(2.5);`);
ok(R(`Powers._fxAuraFollow`) === false, 'al terminar el giro el aura se apaga');
R(`Powers.clearProps();`);
ok(R(`Powers._rings.length`) === 0 && R(`Powers._shakeT`) === 0, 'clearProps limpia anillos y sacudida');

console.log(`\n${pass} OK · ${fail} FAIL`);
process.exit(fail ? 1 : 0);
