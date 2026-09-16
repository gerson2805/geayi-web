const vm = require('vm'); const fs = require('fs');
/* Pruebas funcionales fase 3 + mundo 9 (stubs THREE/DOM) */
'use strict';
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
  setScalar(s) { this.x = this.y = this.z = s; return this; }
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
  add(c) { this.children.push(c); c.parent = this; return this; }
  remove(c) { this.children = this.children.filter(x => x !== c); if (c.parent === this) c.parent = null; }
  attach(c) { if (c.parent) c.parent.remove(c); this.add(c); return this; }
  traverse(fn) { fn(this); this.children.forEach(c => c.traverse ? c.traverse(fn) : fn(c)); }
  clone() { const c = Object.create(Object.getPrototypeOf(this)); Object.assign(c, this); c.position = this.position.clone(); c.rotation = { x: this.rotation.x, y: this.rotation.y, z: this.rotation.z }; c.scale = { x: 1, y: 1, z: 1, set(){} }; c.children = []; return c; }
  lookAt() {}
}
class Mesh extends Obj3D { constructor(g, m) { super(); this.geometry = g; this.material = m; } }
class Scene extends Obj3D {}
class Group extends Obj3D {}
class Points extends Obj3D { constructor(g, m) { super(); this.geometry = g; this.material = m; } }
class Geom { constructor(...a) { this.args = a; this.attributes = {}; } setAttribute(n, a) { this.attributes[n] = a; } dispose() {} }
class Mat {
  constructor(o) {
    Object.assign(this, o || {});
    if (typeof this.emissive === 'number') this.emissive = new THREE_BASE.__Color(this.emissive);
    if (!this.emissive) this.emissive = new THREE_BASE.__Color(0x000000);
    if (typeof this.emissiveIntensity !== 'number') this.emissiveIntensity = 1;
  }
  dispose() {}
}
class Light extends Obj3D { constructor(...a) { super(); this.args = a; } }
const THREE_BASE = {
  Scene, Group, Mesh, Points,
  MeshStandardMaterial: Mat, MeshBasicMaterial: Mat, PointsMaterial: Mat,
  CanvasTexture: class { constructor(c) { this.image = c; this.repeat = { set() {} }; this.offset = { set() {} }; } dispose() {} },
  TextureLoader: class { load() { return { dispose() {}, repeat: { set() {} }, offset: { set() {} } }; } },
  Float32BufferAttribute: class { constructor(a, n) { this.array = a; this.itemSize = n; } },
  __Color: null, // se rellena abajo
  Color: class { constructor(c) { this.c = (typeof c === 'number') ? c : 0; } getHex() { return this.c; } setHex(h) { this.c = h; return this; } copy(c) { this.c = c.c !== undefined ? c.c : c; return this; } lerp(c, t) { return this; } },
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
  Raycaster: class { constructor() { this.far = Infinity; } set() {} intersectObjects() { return []; } intersectObject() { return []; } },  Shape: class { constructor() { this.pts = []; } moveTo(x, y) { this.pts.push([x, y]); } lineTo(x, y) { this.pts.push([x, y]); } closePath() {} },
  Path: class { constructor() {} moveTo() {} lineTo() {} },
  HemisphereLight: Light, DirectionalLight: Light,
  GridHelper: class extends Obj3D { constructor(...a) { super(); this.args = a; this.material = new Mat(); } },
  AxesHelper: class extends Obj3D { constructor(...a) { super(); this.args = a; } },
  Sprite: class extends Obj3D { constructor(m) { super(); this.material = m; } },
  Points: class extends Obj3D { constructor(g, m) { super(); this.geometry = g; this.material = m; this.frustumCulled = true; } },
  BufferAttribute: class { constructor(arr, size) { this.array = arr; this.itemSize = size; this.needsUpdate = false; } },
  SpriteMaterial: Mat,
};
THREE_BASE.__Color = THREE_BASE.Color;
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

global.sandbox = {
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
global.sandbox.window = global.sandbox;
global.sandbox.globalThis = global.sandbox;
vm.createContext(sandbox);
global.R = (expr) => vm.runInContext(expr, global.sandbox);
