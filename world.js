/* world.js — escena Three.js, partículas, temas y construcción de niveles */
'use strict';
let renderer, scene, camera, clock;
let softTex; // textura suave para partículas

/* ============ STREAMING estilo Roblox: solo muestra lo cercano ============
   Los objetos decorativos lejanos se ocultan para no ponerse lento.
   Radio: 90 metros (como el streaming de Roblox). */
const Stream = {
  items: [], // {mesh, x, z}
  _t: 0,
  reg(mesh, x, z) {
    if (!mesh) return;
    try { this.items.push({ mesh: mesh, x: x || 0, z: z || 0 }); } catch (e) {}
  },
  update() {
    const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
    if (now - this._t < 600) return; // cada 0.6s
    this._t = now;
    try {
      if (!this.items.length) return;
      let px = 0, pz = 0;
      if (typeof player !== 'undefined' && player && player.position) { px = player.position.x; pz = player.position.z; }
      else if (typeof camera !== 'undefined' && camera && camera.position) { px = camera.position.x; pz = camera.position.z; }
      const R2 = 90 * 90;
      for (let i = 0; i < this.items.length; i++) {
        const it = this.items[i];
        if (!it.mesh) continue;
        const dx = it.x - px, dz = it.z - pz;
        const vis = (dx * dx + dz * dz) <= R2;
        if (it.mesh.visible !== vis) it.mesh.visible = vis;
      }
    } catch (e) {}
  }
};

/* Todas las texturas de canvas del juego son mapas de color (letreros, insignias,
   etiquetas, cielo): se marcan como sRGB para que los colores se vean vivos
   con el manejo de color correcto (r149). */
try {
  if (typeof THREE !== 'undefined' && THREE.CanvasTexture && THREE.sRGBEncoding !== undefined) {
    const _CanvasTextureOrig = THREE.CanvasTexture;
    const _Patched = function (canvas) {
      const t = new _CanvasTextureOrig(canvas);
      t.encoding = THREE.sRGBEncoding;
      return t;
    };
    _Patched.prototype = _CanvasTextureOrig.prototype;
    THREE.CanvasTexture = _Patched;
  }
} catch (e) { /* stub de pruebas u otro entorno: se sigue sin el parche */ }

function webglOK() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
  } catch (e) { return false; }
}
function makeSoftTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

function initThree() {
  /* Manejo de color correcto (r149): los hex se interpretan como sRGB y la luz
     se calcula en lineal → colores vivos y fieles, sin el lavado pastel. */
  try { if (THREE.ColorManagement !== undefined) THREE.ColorManagement.legacyMode = false; } catch (e) {}
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (THREE.sRGBEncoding !== undefined) renderer.outputEncoding = THREE.sRGBEncoding;
  $('game').appendChild(renderer.domElement);
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 600);
  camera.position.set(0, 6, 10);
  clock = new THREE.Clock();
  softTex = makeSoftTexture();
  /* iluminación viva: sol cálido con fuerza + ambiente suave (colores con vida, sin lavar) */
  scene.add(new THREE.HemisphereLight(0xf2f8ff, 0xa89a86, 0.9));
  const sun = new THREE.DirectionalLight(0xfff3dc, 1.45);
  sun.position.set(38, 48, 24);
  sun.castShadow = true;
  if (sun.shadow) {
    sun.shadow.mapSize.set(1024, 1024);
    const sc = sun.shadow.camera;
    sc.left = -60; sc.right = 60; sc.top = 60; sc.bottom = -60; sc.near = 10; sc.far = 180;
    sun.shadow.bias = -0.002;
    sun.shadow.normalBias = 0.8;
  }
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xc4d8ff, 0.35); // relleno frío desde el lado opuesto
  fill.position.set(-30, 22, -28);
  scene.add(fill);
  if (renderer.shadowMap) { // sombras suaves (PCF); en tests el stub no tiene shadowMap y se omite
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

/* ---------------- sistema de partículas ---------------- */
const Particles = {
  list: [], group: null, geo: null,
  init() {
    this.group = new THREE.Group();
    scene.add(this.group);
  },
  spawn(x, y, z, opts) {
    opts = opts || {};
    const n = opts.n || 10;
    for (let i = 0; i < n; i++) {
      const size = (opts.size || 0.35) * (0.6 + Math.random() * 0.8);
      const mat = new THREE.SpriteMaterial({
        map: softTex, transparent: true, depthWrite: false,
        color: opts.colors ? opts.colors[(Math.random() * opts.colors.length) | 0] : (opts.color || 0xffffff)
      });
      const s = new THREE.Sprite(mat);
      s.position.set(x + (Math.random() - 0.5) * (opts.spread || 0.4),
                     y + (Math.random() - 0.5) * (opts.spread || 0.4),
                     z + (Math.random() - 0.5) * (opts.spread || 0.4));
      s.scale.set(size, size, 1);
      const sp = opts.speed || 4;
      this.group.add(s);
      this.list.push({
        s, life: 0, maxLife: (opts.life || 0.7) * (0.7 + Math.random() * 0.6),
        vx: (Math.random() - 0.5) * sp, vy: (opts.up || 3) * (0.5 + Math.random()),
        vz: (Math.random() - 0.5) * sp, grav: opts.grav == null ? 6 : opts.grav,
        grow: opts.grow || 0
      });
    }
  },
  burst(x, y, z, colors, n, speed) { this.spawn(x, y, z, { n: n || 14, colors, speed: speed || 5, up: 4, life: 0.8 }); },
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.group.remove(p.s); p.s.material.dispose();
        this.list.splice(i, 1); continue;
      }
      p.vy -= p.grav * dt;
      p.s.position.x += p.vx * dt; p.s.position.y += p.vy * dt; p.s.position.z += p.vz * dt;
      if (p.s.position.y < 0.05 && p.vy < 0) { p.vy *= -0.4; p.s.position.y = 0.05; }
      const k = 1 - p.life / p.maxLife;
      p.s.material.opacity = k;
      const sc = p.s.scale.x + p.grow * dt;
      p.s.scale.set(sc, sc, 1);
    }
  },
  clear() {
    for (const p of this.list) { this.group.remove(p.s); p.s.material.dispose(); }
    this.list.length = 0;
  }
};

/* ---------------- MUNDOS — 3 niveles con temas distintos
   Formato de plataforma: y = altura de la SUPERFICIE (top), h = grosor
   ========================================================================= */
const LEVELS = [
  { name: 'Ciudad Neón', nameKey: 'world.n0', emoji: '🌃', desc: 'La ciudad que nunca duerme', descKey: 'world.d0' },
  { name: 'Volcán de Lava', nameKey: 'world.n1', emoji: '🌋', desc: '¡No toques la lava!', descKey: 'world.d1' },
  { name: 'Dulce Hielo', nameKey: 'world.n2', emoji: '🍭', desc: 'Un mundo de caramelo', descKey: 'world.d2' },
  { name: 'Immokalee, FL', nameKey: 'world.n3', emoji: '🌴', desc: 'El pueblo del sol ☀️', descKey: 'world.d3' },
  // 🌍 MUNDOS DE PAÍSES (se viaja en avión desde el aeropuerto)
  { name: 'Honduras', nameKey: 'world.n4', emoji: '🇭🇳', desc: 'Copán y las playas de Roatán', descKey: 'world.d4' },
  { name: 'México', nameKey: 'world.n5', emoji: '🇲🇽', desc: 'Chichén Itzá y mucha fiesta', descKey: 'world.d5' },
  { name: 'USA', nameKey: 'world.n6', emoji: '🇺🇸', desc: 'La Estatua de la Libertad 🗽', descKey: 'world.d6' },
  { name: 'España', nameKey: 'world.n7', emoji: '🇪🇸', desc: 'La Sagrada Familia ⛪', descKey: 'world.d7' },
  // ❄️ MUNDO 9
  { name: 'Montaña Nevada', nameKey: 'world.n8', emoji: '❄️', desc: '¡Nieve, esquí y trineo! 🏔️', descKey: 'world.d8' },
];

/* 🌴 ORDEN DE PRESENTACIÓN: Immokalee es el MUNDO 1 (los demás conservan su orden).
   WORLD_ORDER[posVisible] = índice real en LEVELS.
   Los índices reales NO se tocan (casa, pesca, rancho, etc. usan idx===3 para Immokalee). */
const WORLD_ORDER = [3, 0, 1, 2, 4, 5, 6, 7, 8];
function worldIdx(pos) { return WORLD_ORDER[pos]; }   // índice real desde la posición visible
function worldPos(idx) { return WORLD_ORDER.indexOf(idx); } // posición visible (0-based) de un mundo real

function stripeTexture(c1, c2) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = c1; g.fillRect(0, 0, 64, 64);
  g.fillStyle = c2;
  for (let i = -64; i < 128; i += 16) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 8, 0); g.lineTo(i + 8 - 64, 64); g.lineTo(i - 64, 64); g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = maxAniso();
  return t;
}
function lavaTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#ff5a00'; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 260; i++) {
    g.fillStyle = ['#ffb300', '#ff7b00', '#ff3d00', '#ffe95e'][(Math.random() * 4) | 0];
    const r = 3 + Math.random() * 10;
    g.beginPath(); g.arc(Math.random() * 128, Math.random() * 128, r, 0, TAU); g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(8, 8);
  t.anisotropy = maxAniso();
  return t;
}

/* ---------- helpers de decoración: IMMOKALEE, FL ---------- */
function maxAniso() { // anisotropía máxima segura: tope 8 en teléfono, 4 en tests
  try {
    if (renderer && renderer.capabilities && renderer.capabilities.getMaxAnisotropy)
      return Math.min(8, renderer.capabilities.getMaxAnisotropy());
  } catch (e) {}
  return 4;
}
function canvasTex(w, h, draw) {
  const S = 2; // SUPERSAMPLE: letreros y señales al doble de resolución (más nitidez)
  const c = document.createElement('canvas'); c.width = w * S; c.height = h * S;
  const g = c.getContext('2d');
  if (g && g.scale) g.scale(S, S); // el dibujo sigue usando coordenadas lógicas w×h
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = maxAniso(); // calles y suelos nítidos en ángulo
  return t;
}
/* cielo con degradado vertical (barato: una textura de 4x256 como fondo de escena) */
const _skyTexCache = {};
function setSky(top, horizon) {
  const k = top.toString(16) + '_' + horizon.toString(16);
  if (!_skyTexCache[k]) {
    const hx = n => '#' + n.toString(16).padStart(6, '0');
    _skyTexCache[k] = canvasTex(4, 256, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, hx(top)); gr.addColorStop(1, hx(horizon));
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    });
  }
  scene.background = _skyTexCache[k];
}
/* letrero legible por ambos lados: dos planos espalda con espalda, cada uno con la textura al derecho */
function doubleFaceSign(w, h, tex, x, y, z, ry) {
  const g = new THREE.Group();
  const geo = new THREE.PlaneGeometry(w, h);
  const f = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex }));
  f.position.z = 0.02; g.add(f);
  const b = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex }));
  b.position.z = -0.02; b.rotation.y = Math.PI; g.add(b);
  g.position.set(x, y, z); g.rotation.y = ry || 0;
  return g;
}
function facadeSign(w, h, tex, x, y, z, ry) { // rótulo PEGADO a la fachada (una sola cara, como pintado)
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, polygonOffset: true, polygonOffsetFactor: -2 }));
  m.position.set(x, y, z); m.rotation.y = ry || 0;
  return m;
}
function paintedSignTexture(name) { // letras pintadas directo en la pared (fondo transparente)
  return canvasTex(512, 96, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    let fs = 62;
    g.font = '900 ' + fs + 'px "Trebuchet MS", sans-serif';
    while (g.measureText(name).width > 472 && fs > 22) { fs -= 4; g.font = '900 ' + fs + 'px "Trebuchet MS", sans-serif'; }
    g.lineWidth = 10; g.strokeStyle = 'rgba(25,18,12,0.92)'; g.strokeText(name, w / 2, h / 2 + 2);
    g.fillStyle = '#ffffff'; g.fillText(name, w / 2, h / 2 + 2);
  });
}
function streetNameTexture(name) { // letrero azul eléctrico de calle estilo USA
  return canvasTex(512, 128, (g, w, h) => {
    g.fillStyle = '#1565ff'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#ffffff'; g.lineWidth = 8; g.strokeRect(8, 8, w - 16, h - 16);
    g.fillStyle = '#ffffff'; g.textAlign = 'center';
    g.font = '900 ' + (name.length > 9 ? 40 : 56) + 'px "Trebuchet MS", sans-serif';
    g.fillText(name, w / 2, name.length > 9 ? 80 : 84);
  });
}
function addStreetSign(g, x, z, name, ry) { // poste + letrero de calle: pequeño, en la acera
  const pole = new THREE.Mesh(urbGeo('sspole', () => new THREE.CylinderGeometry(0.07, 0.07, 2.8, 8)), urbMat(0x8a8f9a));
  pole.position.set(x, 1.4, z); g.add(pole);
  g.add(doubleFaceSign(3.2, 0.85, streetNameTexture(name), x, 3.0, z, ry || 0));
}
function airportImmTexture() { // "AEROPUERTO IMMOKALEE"
  return canvasTex(512, 160, (g, w, h) => {
    g.fillStyle = '#1565ff'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#ffffff'; g.lineWidth = 8; g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = '#ffffff'; g.textAlign = 'center';
    g.font = '900 44px "Trebuchet MS", sans-serif';
    g.fillText('✈️ AEROPUERTO', w / 2, 62);
    g.font = '900 54px "Trebuchet MS", sans-serif';
    g.fillText('IMMOKALEE', w / 2, 122);
  });
}
function marketTexture() { // "MERCADO" (pulgas / farmers market)
  return canvasTex(512, 160, (g, w, h) => {
    g.fillStyle = '#00b248'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#ffffff'; g.lineWidth = 8; g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = '#ffffff'; g.textAlign = 'center';
    g.font = '900 72px "Trebuchet MS", sans-serif';
    g.fillText('🍅 MERCADO 🍊', w / 2, 108);
  });
}
function monumentTexture() { // "BIENVENIDOS A IMMOKALEE, FL" + franja mural
  return canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#7a4f2c'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(0,0,0,0.28)'; g.lineWidth = 3;
    for (let y = 44; y < h; y += 44) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.strokeStyle = '#ffe9b8'; g.lineWidth = 10; g.strokeRect(8, 8, w - 16, h - 16);
    g.textAlign = 'center';
    g.fillStyle = '#ffffff'; g.font = '900 44px "Trebuchet MS", sans-serif';
    g.fillText('BIENVENIDOS A', w / 2, 88);
    g.fillStyle = '#ffe95e'; g.font = '900 58px "Trebuchet MS", sans-serif';
    g.fillText('IMMOKALEE, FL', w / 2, 158);
    const cols = ['#ff3d5e', '#ffb300', '#35c759', '#00a2ff', '#7b2fff'];
    for (let i = 0; i < 16; i++) { g.fillStyle = cols[i % cols.length]; g.fillRect(24 + i * 29, 196, 24, 34); }
  });
}
function shopSignTexture(name) {
  return canvasTex(256, 80, (g, w, h) => {
    g.fillStyle = '#c51162'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#ffffff'; g.lineWidth = 6; g.strokeRect(4, 4, w - 8, h - 8);
    g.fillStyle = '#ffffff'; g.textAlign = 'center';
    let fs = 38;
    g.font = '900 ' + fs + 'px "Trebuchet MS", sans-serif';
    while (g.measureText(name).width > 228 && fs > 18) { fs -= 2; g.font = '900 ' + fs + 'px "Trebuchet MS", sans-serif'; }
    g.fillText(name, w / 2, 54);
  });
}
function drawBurgerIcon(g, cx, cy, s) { // mini hamburguesa dibujada (letreros)
  g.fillStyle = '#e0a75e';
  g.beginPath(); g.ellipse(cx, cy, 26 * s, 15 * s, 0, Math.PI, 0); g.fill();
  g.fillStyle = '#35c759'; g.fillRect(cx - 28 * s, cy, 56 * s, 7 * s);
  g.fillStyle = '#6b3f1d'; g.fillRect(cx - 26 * s, cy + 7 * s, 52 * s, 9 * s);
  g.fillStyle = '#e0a75e'; g.fillRect(cx - 26 * s, cy + 16 * s, 52 * s, 8 * s);
}
/* ============================================================
   LOGOS REALES "LOS HERMANOS TAMPS" (carpeta img/)
   - La traila carga img/logo-tamps-burger.png en su letrero.
   - La carreta de tacos carga img/logo-tamps-tacos.png.
   Se cargan con THREE.TextureLoader y ruta relativa "img/..."
   (funciona en Netlify y al abrir el index.html local).
   Si el logo no carga (sin internet, archivo movido, etc.),
   el letrero de texto dibujado en canvas queda como respaldo.
   ============================================================ */
function applyLogoTexture(path, mats) {
  try {
    new THREE.TextureLoader().load(path, (t) => {
      if (THREE.sRGBEncoding !== undefined) t.encoding = THREE.sRGBEncoding;
      mats.forEach(m => { m.map = t; m.needsUpdate = true; });
    }, undefined, () => { /* sin logo: se conserva el letrero de texto */ });
  } catch (e) { /* sin logo: se conserva el letrero de texto */ }
}
function trailerSignTexture() { // respaldo de texto (se usa solo si el logo no carga)
  const tex = canvasTex(512, 160, (g, w, h) => {
    g.fillStyle = '#b71c1c'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#ffe9b8'; g.lineWidth = 8; g.strokeRect(6, 6, w - 12, h - 12);
    g.textAlign = 'center';
    g.fillStyle = '#fff8e7'; g.font = '900 52px "Trebuchet MS", sans-serif';
    g.fillText('LOS HERMANOS', w / 2, 66);
    g.fillStyle = '#ffd23f'; g.font = '900 68px "Trebuchet MS", sans-serif';
    g.fillText('TAMPS', w / 2, 138);
    drawBurgerIcon(g, 52, 78, 1);
    drawBurgerIcon(g, w - 52, 78, 1);
  });
  return tex;
}
function drawTacoIcon(g, cx, cy, s) { // mini taco dibujado (letrero de respaldo)
  g.fillStyle = '#35c759';
  for (let i = -2; i <= 2; i++) { g.beginPath(); g.arc(cx + i * 10 * s, cy - 8 * s, 4.5 * s, 0, TAU); g.fill(); }
  g.fillStyle = '#7a4a21'; g.fillRect(cx - 24 * s, cy - 6 * s, 48 * s, 7 * s);
  g.fillStyle = '#f2c14e';
  g.beginPath(); g.arc(cx, cy + 2 * s, 24 * s, Math.PI, 0); g.fill();
  g.fillRect(cx - 24 * s, cy + 2 * s, 48 * s, 5 * s);
}
function tacoSignTexture() { // respaldo de texto "TACOS" (se usa solo si el logo no carga)
  return canvasTex(512, 160, (g, w, h) => {
    g.fillStyle = '#1b5e20'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#ffe9b8'; g.lineWidth = 8; g.strokeRect(6, 6, w - 12, h - 12);
    g.textAlign = 'center';
    g.fillStyle = '#ffe95e'; g.font = '900 84px "Trebuchet MS", sans-serif';
    g.fillText('TACOS', w / 2, 116);
    drawTacoIcon(g, 58, 80, 1);
    drawTacoIcon(g, w - 58, 80, 1);
  });
}
function muralTexture() {
  return canvasTex(256, 256, (g, w, h) => {
    const cols = ['#ff3d5e', '#ffb300', '#ffe95e', '#35c759', '#00a2ff', '#7b2fff', '#ff2fd6'];
    g.fillStyle = '#1c2b4a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) {
      g.fillStyle = cols[(Math.random() * cols.length) | 0];
      g.fillRect(Math.random() * w, Math.random() * h, 20 + Math.random() * 50, 20 + Math.random() * 50);
    }
    g.fillStyle = '#ffffff'; g.textAlign = 'center';
    g.font = '900 40px "Trebuchet MS", sans-serif';
    g.fillText('IMMOKALEE', w / 2, h / 2 + 14);
  });
}
function towerTexture() {
  return canvasTex(512, 128, (g, w, h) => {
    g.fillStyle = '#cfd8dc'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1a5fa8'; g.textAlign = 'center';
    g.font = '900 62px "Trebuchet MS", sans-serif';
    g.fillText('IMMOKALEE', w / 4, 86);
    g.fillText('IMMOKALEE', (3 * w) / 4, 86);
  });
}
function casinoTexture() {
  return canvasTex(512, 128, (g, w, h) => {
    g.fillStyle = '#5e0f1b'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#ffd23f'; g.lineWidth = 8; g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = '#ffd23f'; g.textAlign = 'center';
    g.font = '900 76px "Trebuchet MS", sans-serif';
    g.fillText('CASINO', w / 2, 92); // genérico: sin marcas de terceros
  });
}
function tomatoFieldTexture() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#2e7d32'; g.fillRect(0, 0, w, h);
    for (let r = 0; r < 8; r++) {
      g.fillStyle = '#388e3c'; g.fillRect(0, r * 32 + 6, w, 20);
      for (let i = 0; i < 14; i++) {
        g.fillStyle = '#e53935';
        g.beginPath(); g.arc(Math.random() * w, r * 32 + 16, 3.5, 0, TAU); g.fill();
      }
    }
  });
}
function cornFieldTexture() { // sembradío de maíz: surcos verdes + elotes amarillos
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#3a6b2e'; g.fillRect(0, 0, w, h);
    for (let r = 0; r < 8; r++) {
      g.fillStyle = '#4a7d3a'; g.fillRect(0, r * 32 + 6, w, 20);
      for (let i = 0; i < 16; i++) {
        g.fillStyle = '#ffd23f';
        g.beginPath(); g.arc(Math.random() * w, r * 32 + 16, 2.6, 0, TAU); g.fill();
      }
    }
  });
}
function makePalm(x, z, s, group) { // palmera de bloques
  const p = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.4 * s, 0.6 * s, 15 * s, 8),
    new THREE.MeshStandardMaterial({ color: 0x8a5a33, roughness: 0.9 }));
  trunk.position.y = 7.5 * s; p.add(trunk);
  const leafM = new THREE.MeshStandardMaterial({ color: 0x2f9e44, roughness: 0.8 });
  for (let i = 0; i < 6; i++) {
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(3.4 * s, 0.16 * s, 0.9 * s), leafM);
    const a = (i / 6) * TAU;
    leaf.position.set(Math.cos(a) * 1.5 * s, 15 * s - 0.35 * s, Math.sin(a) * 1.5 * s);
    leaf.rotation.y = -a; leaf.rotation.z = 0.28;
    p.add(leaf);
  }
  const cocoM = new THREE.MeshStandardMaterial({ color: 0x5d3a1e, roughness: 0.9 });
  for (let i = 0; i < 3; i++) {
    const coco = new THREE.Mesh(new THREE.SphereGeometry(0.32 * s, 8, 8), cocoM);
    const a = (i / 3) * TAU;
    coco.position.set(Math.cos(a) * 0.7 * s, 14.3 * s, Math.sin(a) * 0.7 * s);
    p.add(coco);
  }
  p.position.set(x, -13, z);
  group.add(p);
}
function makeGator(x, z, group) { // lagarto de bloques (Lake Trafford)
  const gt = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0x3f9e4d, roughness: 0.8 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.7, 1.2), skin);
  body.position.y = 0.55; gt.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.6, 1.1), skin);
  head.position.set(1.7, 0.5, 0); gt.add(head);
  const snout = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.32, 0.8), skin);
  snout.position.set(2.6, 0.42, 0); gt.add(snout);
  const toothM = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (let i = 0; i < 3; i++) {
    [0.42, -0.42].forEach(oz => {
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.12), toothM);
      t.position.set(2.3 + i * 0.3, 0.28, oz); gt.add(t);
    });
  }
  const eyeW = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const eyeB = new THREE.MeshBasicMaterial({ color: 0x111111 });
  [-0.3, 0.3].forEach(oz => {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 8), eyeW);
    e.position.set(1.7, 0.88, oz); gt.add(e);
    const pu = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), eyeB);
    pu.position.set(1.78, 0.92, oz); gt.add(pu);
  });
  const tail = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, 0.5), skin);
  tail.position.set(-1.9, 0.5, 0); tail.rotation.z = 0.15; gt.add(tail);
  [[0.9, 0.55], [0.9, -0.55], [-0.9, 0.55], [-0.9, -0.55]].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.4, 0.35), skin);
    leg.position.set(lx, 0.2, lz); gt.add(leg);
  });
  for (let i = 0; i < 4; i++) { // cresta dorsal
    const spike = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.28), skin);
    spike.position.set(0.8 - i * 0.55, 0.98, 0); spike.rotation.z = Math.PI / 4; gt.add(spike);
  }
  gt.position.set(x, 0.15, z);
  gt.rotation.y = 0.5;
  group.add(gt);
}
/* ================= 🏠 EDIFICIOS ENTRABLES (GEAYI) =================
   Paredes HUECAS con puerta real (hueco) + interior amueblado + colisionadores.
   Los colisionadores se registran en WALL_SOLIDS y buildLevel los vuelca a
   lvl.platforms al final (las matrices de mundo ya son válidas ahí). */
const WALL_SOLIDS = []; // {mesh, y0, y1}
const CUTAWAY = []; // paredes/techos que la cámara puede ocultar para ver al jugador adentro
const SHOP3D = []; // tiendas físicas entrables: {parent (grupo 3D), name} → botón 🛍️ COMPRAR por proximidad
const SHOPKEEPERS = []; // dependientes (personas reales) dentro de las tiendas: {o (grupo), name, shop, food}
const INTERIORS = []; // zonas interiores (tiendas/casas): {cx,cz,hw,hd,h,ry} → la cámara entra con el jugador
const CEILINGS = []; // techos de interiores: {m, zone} → se ocultan cuando la cámara está adentro
const TOUCHABLES = []; // cosas que se pueden tocar/agarrar: {o, name, price, emoji, kind, home}
/* 🛍️ Cada tienda vende LO QUE DICE su letrero: stock por nombre de tienda.
   Si la tienda no está en la lista, usa el catálogo genérico (PRODUCT_CATALOG). */
/* 🎨 paletas de colores por tienda (nombre en español + hex). Todo original GEAYI. */
const _PAL = {};
_PAL.ropa = [['Roja',0xe53935],['Azul',0x1e88e5],['Verde',0x43a047],['Amarilla',0xffd600],['Negra',0x212121],['Blanca',0xf5f5f5],['Rosa',0xec407a],['Morada',0x8e24aa],['Naranja',0xfb8c00]];
_PAL.dulce = [['de Fresa',0xef5350],['de Menta',0x66bb6a],['de Limón',0xffee58],['de Uva',0x8e24aa],['de Naranja',0xfb8c00],['de Chicle',0xec407a],['de Chocolate',0x6d4c41],['de Vainilla',0xfff3e0],['de Cereza',0xc62828]];
_PAL.juguete = [['Rojo',0xe53935],['Azul',0x1e88e5],['Verde',0x43a047],['Amarillo',0xffd600],['Rosa',0xec407a],['Morado',0x8e24aa],['Naranja',0xfb8c00],['Blanco',0xf5f5f5],['Multicolor',0x26c6da]];
_PAL.papel = [['Roja',0xe53935],['Azul',0x1e88e5],['Verde',0x43a047],['Amarilla',0xffd600],['Rosa',0xec407a],['Morada',0x8e24aa],['Naranja',0xfb8c00],['Negra',0x212121],['Blanca',0xf5f5f5]];
_PAL.flor = [['Roja',0xe53935],['Blanca',0xf5f5f5],['Rosada',0xf48fb1],['Amarilla',0xffd600],['Morada',0x8e24aa],['Naranja',0xfb8c00],['Fucsia',0xd81b60],['Celeste',0x4fc3f7],['Bicolor',0xce93d8]];
_PAL.belleza = [['de Coco',0xfff3e0],['de Argán',0xd7a86e],['de Keratina',0xce93d8],['Natural',0x9ccc65],['de Aloe',0x66bb6a],['de Miel',0xffb300],['Profesional',0x5c6bc0],['Suave',0xb3e5fc],['Intenso',0x37474f]];
_PAL.pan = [['de Vainilla',0xfff3e0],['de Chocolate',0x6d4c41],['de Fresa',0xf48fb1],['de Limón',0xffee58],['de Zanahoria',0xfb8c00],['Marmoleado',0x8d6e63],['de Coco',0xf5f5f5],['de Café',0x4e342e],['de Naranja',0xffa726]];
_PAL.fruta = [['Roja',0xe53935],['Verde',0x43a047],['Amarilla',0xffee58],['Dulce',0xfb8c00],['Grande',0xef6c00],['Pequeña',0xffa726],['Jugosa',0xff7043],['Crujiente',0x8d6e63],['de Temporada',0x9ccc65]];
_PAL.optica = [['Negros',0x212121],['de Carey',0x6d4c41],['Azules',0x1e88e5],['Rojos',0xe53935],['Dorados',0xffd54f],['Plateados',0xb0bec5],['Verdes',0x43a047],['Transparentes',0xe1f5fe],['de Pasta',0x37474f]];
_PAL.pizza = [['Personal',0xffd54f],['Mediana',0xffb300],['Grande',0xfb8c00],['Familiar',0xef6c00],['Doble Queso',0xffe082],['Orilla Rellena',0xffcc80],['Delgada',0xd7a86e],['Gruesa',0xa1887f],['Extra Grande',0xe65100]];
_PAL.regalo = [['Rojo',0xe53935],['Azul',0x1e88e5],['Verde',0x43a047],['Dorado',0xffd54f],['Plateado',0xb0bec5],['Rosa',0xec407a],['Morado',0x8e24aa],['Amarillo',0xffd600],['Blanco',0xf5f5f5]];
_PAL.cafe = [['Clásico',0x4e342e],['de la Casa',0x6d4c41],['Doble',0x3e2723],['Suave',0xa1887f],['Intenso',0x212121],['de Vainilla',0xd7ccc8],['de Caramelo',0xffb300],['Descafeinado',0xbcaaa4],['Grande',0x5d4037]];
_PAL.helado = [['de Vainilla',0xfff3e0],['de Chocolate',0x6d4c41],['de Fresa',0xf48fb1],['de Limón',0xffee58],['de Mango',0xffb300],['de Coco',0xf5f5f5],['de Café',0x8d6e63],['de Menta',0xa5d6a7],['Napolitano',0xce93d8]];
_PAL.herramienta = [['Profesional',0x5c6bc0],['de Acero',0x9aa2ad],['Grande',0x78909c],['Mediana',0xb0bec5],['Pequeña',0xcfd8dc],['Reforzada',0x37474f],['de Precisión',0x26c6da],['Multiusos',0xff9100],['de Titanio',0x8d9ca8]];
_PAL.libro = [['de Aventuras',0xe53935],['de Misterio',0x37474f],['Infantil',0xffd600],['de Ciencia',0x1e88e5],['de Historia',0x8d6e63],['de Cocina',0xfb8c00],['de Viajes',0x43a047],['Clásico',0x5d4037],['Ilustrado',0x8e24aa]];
_PAL.mascota = [['para Perro',0x8d6e63],['para Gato',0x78909c],['Pequeña',0xa1887f],['Grande',0x6d4c41],['de Colores',0x26c6da],['Resistente',0x37474f],['Suave',0xf48fb1],['Premium',0xffd54f],['de Viaje',0x5c6bc0]];
_PAL.limpieza = [['de Lavanda',0xce93d8],['de Limón',0xffee58],['Suave',0xb3e5fc],['Intenso',0x0288d1],['para Ropa Blanca',0xf5f5f5],['para Ropa de Color',0xec407a],['Grande',0x78909c],['de Viaje',0xa5d6a7],['Ecológico',0x9ccc65]];
_PAL.joya = [['de Oro',0xffd54f],['de Plata',0xcfd8dc],['con Diamante',0xe1f5fe],['con Rubí',0xc62828],['con Esmeralda',0x2e7d32],['Elegante',0x37474f],['de Fantasía',0xce93d8],['Dorados',0xffb300],['Plateados',0xb0bec5]];
_PAL.deporte = [['Profesional',0x212121],['de Entrenamiento',0x5c6bc0],['Juvenil',0xffd600],['Clásico',0xf5f5f5],['Reforzado',0x37474f],['Ligero',0xb3e5fc],['de Competición',0xe53935],['Grande',0x78909c],['Pequeño',0xcfd8dc]];
_PAL.musica = [['Acústica',0x8d6e63],['Eléctrica',0x212121],['Clásica',0x5d4037],['Infantil',0xffd600],['Profesional',0x37474f],['de Concierto',0xbf360c],['Pequeña',0xa1887f],['Grande',0x4e342e],['de Estudio',0x5c6bc0]];
_PAL.carne = [['de Res',0xc62828],['de Cerdo',0xef9a9a],['Premium',0x8e24aa],['Ahumada',0x6d4c41],['Fresca',0xef5350],['del Día',0xe53935],['Selecta',0xad1457],['Mixta',0xd7a86e],['de Pollo',0xffcc80]];
_PAL.verdura = [['Fresca',0x66bb6a],['Grande',0x43a047],['Pequeña',0x9ccc65],['Dulce',0xffb300],['del Día',0x7cb342],['Orgánica',0x33691e],['Selecta',0x558b2f],['Jugosa',0x8bc34a],['de Temporada',0xaed581]];
_PAL.correo = [['Pequeño',0xfff3e0],['Mediano',0xd7ccc8],['Grande',0xa1887f],['Aéreo',0x90caf9],['Certificado',0xffd54f],['Urgente',0xef5350],['de Colores',0xce93d8],['Clásico',0xbcaaa4],['de Lujo',0x8e24aa]];
_PAL.auto = [['Sintético',0xffd54f],['Multigrado',0xffb300],['Grande',0x78909c],['Pequeño',0xcfd8dc],['Premium',0x8e24aa],['de Alto Rendimiento',0xe53935],['Clásico',0x5c6bc0],['de Viaje',0x26c6da],['Reforzado',0x37474f]];
_PAL.mercado = [['Frescos',0x66bb6a],['del Día',0xffb300],['Grandes',0xef6c00],['Orgánicos',0x33691e],['de la Casa',0x8d6e63],['Selectos',0xad1457],['Dulces',0xec407a],['Jugosos',0xff7043],['de Temporada',0x9ccc65]];
_PAL.taqueria = [['al Pastor',0xef6c00],['de Asada',0x6d4c41],['de Pollo',0xffcc80],['de Carnitas',0x8d6e63],['de la Casa',0xe53935],['Doble',0xbf360c],['Grande',0xd7a86e],['con Todo',0x9ccc65],['de Pescado',0x90caf9]];
_PAL.hamburguesa = [['Clásica',0xd7a86e],['Doble',0xa1887f],['con Queso',0xffd54f],['de la Casa',0x8d6e63],['Grande',0x6d4c41],['con Tocino',0xc62828],['Hawaiana',0xffb300],['Vegetariana',0x66bb6a],['Especial',0x8e24aa]];
_PAL.farmacia = [['Forte',0xe53935],['Suave',0x90caf9],['Infantil',0xffd600],['Natural',0x9ccc65],['de 100ml',0x66bb6a],['de 200ml',0x43a047],['Grande',0x78909c],['de Viaje',0xce93d8],['Clásico',0x5c6bc0]];
_PAL.reloj = [['Clásico',0x8d6e63],['Deportivo',0x1565c0],['Elegante',0x212121],['de Oro',0xffd54f],['de Plata',0xcfd8dc],['Digital',0x26c6da],['Grande',0x78909c],['Pequeño',0xbcaaa4],['de Lujo',0x8e24aa]];
_PAL.perfume = [['Floral',0xf48fb1],['Cítrico',0xffee58],['Dulce',0xec407a],['Fresco',0xb3e5fc],['Intenso',0x4a148c],['Suave',0xfce4ec],['de Noche',0x212121],['Deportivo',0x26c6da],['Clásico',0xd7ccc8]];
_PAL.banco = [['Clásica',0x8d6e63],['de Cerámica',0x90caf9],['Digital',0x26c6da],['Pequeña',0xbcaaa4],['Grande',0x78909c],['de Viaje',0xa5d6a7],['Profesional',0x37474f],['de Lujo',0xffd54f],['de Metal',0x9aa2ad]];
_PAL.dentista = [['Suave',0x90caf9],['Media',0x66bb6a],['Dura',0xef5350],['de Menta',0xa5d6a7],['Infantil',0xffd600],['Profesional',0x5c6bc0],['de Viaje',0xce93d8],['Eléctrica',0x26c6da],['Grande',0x78909c]];
_PAL.llanta = [['Negra',0x212121],['Reforzada',0x37474f],['Todo Terreno',0x2b2f36],['Deportiva',0x1c1e24],['de Carga',0x3a3f47],['Radial',0x4e555f],['Grande',0x5a626c],['Pequeña',0x6b7280],['Premium',0xc7ccd6]];
_PAL.pupusa = [['de Queso',0xffd54f],['Mixta',0xffb300],['de Frijol',0x6d4c41],['Revueltas',0x8d6e63],['de Pollo',0xffcc80],['Grande',0xd7a86e],['Doble',0xa1887f],['de la Casa',0xe53935],['con Todo',0x9ccc65]];
_PAL.hotel = [['Blanca',0xf5f5f5],['Azul',0x90caf9],['Grande',0x78909c],['Pequeña',0xbcaaa4],['de Lujo',0xffd54f],['Suave',0xfce4ec],['de Viaje',0xa5d6a7],['Clásica',0x8d6e63],['de Algodón',0xd7ccc8]];
_PAL.merceria = [['Rojo',0xe53935],['Azul',0x1e88e5],['Negro',0x212121],['Blanco',0xf5f5f5],['Dorado',0xffd54f],['Plateado',0xb0bec5],['de Colores',0x26c6da],['Grande',0x78909c],['Pequeño',0xcfd8dc]];
_PAL.sastreria = [['Roja',0xe53935],['Azul',0x1e88e5],['Negra',0x212121],['Blanca',0xf5f5f5],['Dorada',0xffd54f],['Plateada',0xb0bec5],['de Colores',0x26c6da],['Grande',0x78909c],['Pequeña',0xcfd8dc]];
/* 🛍️ generador compacto de mercancía: cada base {emoji,name,price,shape,colors}
   se multiplica por sus colores → 50+ artículos por tienda.
   Genera {emoji, name: base+" "+color, price, c: hex, shape}. */
function _mkStock(bases) {
  const out = [];
  for (const b of bases) {
    const cols = (b.colors && b.colors.length) ? b.colors : [[null, b.c != null ? b.c : 0xffffff]];
    for (const cn of cols) out.push({ emoji: b.emoji, name: cn[0] ? (b.name + ' ' + cn[0]) : b.name, price: b.price, c: cn[1], shape: b.shape });
  }
  return out;
}
const SHOP_STOCK = {};
SHOP_STOCK['LLANTERA'] = [
    { emoji: '🛞', name: 'Llanta Todo Terreno', price: 18, c: 0x2b2f36, shape: 'tire' },
    { emoji: '🛞', name: 'Llanta Deportiva', price: 22, c: 0x1c1e24, shape: 'tire' },
    { emoji: '⚙️', name: 'Rin Cromado', price: 25, c: 0xc7ccd6, shape: 'tire' },
    { emoji: '🛞', name: 'Llanta de Refacción', price: 15, c: 0x3a3f47, shape: 'tire' },
  ..._mkStock([
    { emoji: '🛞', name: 'Llanta Urbana', price: 16, shape: 'tire', colors: _PAL.llanta },
    { emoji: '🛞', name: 'Llanta de Carga', price: 20, shape: 'tire', colors: _PAL.llanta },
    { emoji: '🛞', name: 'Llanta de Lluvia', price: 19, shape: 'tire', colors: _PAL.llanta },
    { emoji: '⚙️', name: 'Rin Deportivo', price: 28, shape: 'tire', colors: _PAL.llanta },
    { emoji: '🛞', name: 'Tapón', price: 8, shape: 'tire', colors: _PAL.llanta },
    { emoji: '🔩', name: 'Válvula', price: 5, shape: 'box', colors: _PAL.llanta },
  ]),
];
SHOP_STOCK['TALLER'] = [
    { emoji: '🔧', name: 'Llave Inglesa', price: 12, c: 0x9aa2ad, shape: 'tall' },
    { emoji: '🔨', name: 'Martillo', price: 10, c: 0x8a5a33, shape: 'tall' },
    { emoji: '🪛', name: 'Destornillador', price: 8, c: 0xe53935, shape: 'tall' },
    { emoji: '🧰', name: 'Caja de Herramientas', price: 20, c: 0xd23c2e, shape: 'box' },
  ..._mkStock([
    { emoji: '🔨', name: 'Martillo', price: 11, shape: 'tall', colors: _PAL.herramienta },
    { emoji: '🪛', name: 'Pinzas', price: 9, shape: 'tall', colors: _PAL.herramienta },
    { emoji: '🔧', name: 'Llave Ajustable', price: 13, shape: 'tall', colors: _PAL.herramienta },
    { emoji: '🪛', name: 'Taladro', price: 30, shape: 'box', colors: _PAL.herramienta },
    { emoji: '📏', name: 'Nivel', price: 10, shape: 'tall', colors: _PAL.herramienta },
    { emoji: '📏', name: 'Cinta Métrica', price: 7, shape: 'box', colors: _PAL.herramienta },
  ]),
];
SHOP_STOCK['AUTOPARTES'] = [
    { emoji: '🔋', name: 'Batería', price: 20, c: 0x2e7d32, shape: 'box' },
    { emoji: '💡', name: 'Faro LED', price: 14, c: 0xfff59d, shape: 'box' },
    { emoji: '🪞', name: 'Espejo Retrovisor', price: 12, c: 0xb0bec5, shape: 'box' },
    { emoji: '🛢️', name: 'Aceite 4T', price: 10, c: 0x4e342e, shape: 'can' },
  ..._mkStock([
    { emoji: '🛢️', name: 'Filtro', price: 11, shape: 'can', colors: _PAL.auto },
    { emoji: '🔌', name: 'Bujía', price: 8, shape: 'tall', colors: _PAL.auto },
    { emoji: '⚙️', name: 'Correa', price: 13, shape: 'tire', colors: _PAL.auto },
    { emoji: '🪞', name: 'Espejo', price: 14, shape: 'box', colors: _PAL.auto },
    { emoji: '🧹', name: 'Limpiaparabrisas', price: 9, shape: 'tall', colors: _PAL.auto },
    { emoji: '📢', name: 'Bocina', price: 16, shape: 'box', colors: _PAL.auto },
  ]),
];
SHOP_STOCK['FARMACIA'] = [
    { emoji: '💊', name: 'Pastillas', price: 6, c: 0xffffff, shape: 'box' },
    { emoji: '🧴', name: 'Jarabe', price: 8, c: 0x7b1fa2, shape: 'tall' },
    { emoji: '🩹', name: 'Curitas', price: 4, c: 0xf5c99b, shape: 'box' },
    { emoji: '🍊', name: 'Vitaminas', price: 7, c: 0xff9800, shape: 'can' },
  ..._mkStock([
    { emoji: '🍊', name: 'Vitamina', price: 7, shape: 'can', colors: _PAL.farmacia },
    { emoji: '🧴', name: 'Jarabe', price: 9, shape: 'tall', colors: _PAL.farmacia },
    { emoji: '🩹', name: 'Vendas', price: 5, shape: 'box', colors: _PAL.farmacia },
    { emoji: '🌡️', name: 'Termómetro', price: 12, shape: 'tall', colors: _PAL.farmacia },
    { emoji: '🧴', name: 'Alcohol', price: 6, shape: 'tall', colors: _PAL.farmacia },
    { emoji: '😷', name: 'Mascarilla', price: 4, shape: 'box', colors: _PAL.farmacia },
  ]),
];
SHOP_STOCK['RELOJERÍA'] = [
    { emoji: '⌚', name: 'Reloj Clásico', price: 30, c: 0x8d6e63, shape: 'box' },
    { emoji: '⌚', name: 'Reloj Deportivo', price: 25, c: 0x1565c0, shape: 'box' },
    { emoji: '⏱️', name: 'Cronómetro', price: 20, c: 0x37474f, shape: 'box' },
    { emoji: '🔋', name: 'Pila de Reloj', price: 5, c: 0xc0ca33, shape: 'can' },
  ..._mkStock([
    { emoji: '🕰️', name: 'Reloj de Pared', price: 32, shape: 'box', colors: _PAL.reloj },
    { emoji: '⏰', name: 'Despertador', price: 18, shape: 'box', colors: _PAL.reloj },
    { emoji: '⌚', name: 'Correa', price: 10, shape: 'box', colors: _PAL.reloj },
    { emoji: '⌚', name: 'Reloj de Bolsillo', price: 35, shape: 'box', colors: _PAL.reloj },
    { emoji: '🔋', name: 'Pila', price: 5, shape: 'can', colors: _PAL.reloj },
    { emoji: '⏱️', name: 'Cronómetro', price: 22, shape: 'box', colors: _PAL.reloj },
  ]),
];
SHOP_STOCK['BISUTERÍA'] = [
    { emoji: '💍', name: 'Anillo', price: 28, c: 0xffd54f, shape: 'box' },
    { emoji: '📿', name: 'Collar', price: 22, c: 0xce93d8, shape: 'box' },
    { emoji: '💎', name: 'Pulsera', price: 18, c: 0x80deea, shape: 'box' },
    { emoji: '✨', name: 'Aretes', price: 12, c: 0xfff176, shape: 'box' },
  ..._mkStock([
    { emoji: '📿', name: 'Collar', price: 24, shape: 'box', colors: _PAL.joya },
    { emoji: '💍', name: 'Anillo', price: 30, shape: 'box', colors: _PAL.joya },
    { emoji: '💎', name: 'Pulsera', price: 20, shape: 'box', colors: _PAL.joya },
    { emoji: '✨', name: 'Aretes', price: 14, shape: 'box', colors: _PAL.joya },
    { emoji: '📌', name: 'Broche', price: 12, shape: 'box', colors: _PAL.joya },
    { emoji: '⛓️', name: 'Tobillera', price: 16, shape: 'box', colors: _PAL.joya },
  ]),
];
SHOP_STOCK['MERCERÍA'] = [
    { emoji: '🧵', name: 'Hilo', price: 3, c: 0xe53935, shape: 'can' },
    { emoji: '🔘', name: 'Botones', price: 4, c: 0x5c6bc0, shape: 'box' },
    { emoji: '📏', name: 'Cinta Métrica', price: 6, c: 0xffee58, shape: 'box' },
    { emoji: '🪡', name: 'Set de Agujas', price: 5, c: 0xb0bec5, shape: 'tall' },
  ..._mkStock([
    { emoji: '🧵', name: 'Hilo', price: 3, shape: 'can', colors: _PAL.merceria },
    { emoji: '🔘', name: 'Botones', price: 4, shape: 'box', colors: _PAL.merceria },
    { emoji: '📏', name: 'Cierre', price: 5, shape: 'box', colors: _PAL.merceria },
    { emoji: '🧶', name: 'Elástico', price: 6, shape: 'can', colors: _PAL.merceria },
    { emoji: '🎀', name: 'Encaje', price: 8, shape: 'box', colors: _PAL.merceria },
    { emoji: '🎀', name: 'Listón', price: 5, shape: 'can', colors: _PAL.merceria },
  ]),
];
SHOP_STOCK['TELAS'] = [
    { emoji: '🧶', name: 'Tela Roja', price: 8, c: 0xe53935, shape: 'box' },
    { emoji: '🧶', name: 'Tela Azul', price: 8, c: 0x1e88e5, shape: 'box' },
    { emoji: '🎨', name: 'Tela Estampada', price: 10, c: 0x8e24aa, shape: 'box' },
    { emoji: '🧻', name: 'Rollo de Tela', price: 12, c: 0xf5f5f5, shape: 'can' },
  ..._mkStock([
    { emoji: '🧶', name: 'Tela Lisa', price: 9, shape: 'box', colors: _PAL.ropa },
    { emoji: '🧶', name: 'Tela de Algodón', price: 10, shape: 'box', colors: _PAL.ropa },
    { emoji: '🧶', name: 'Tela de Seda', price: 14, shape: 'box', colors: _PAL.ropa },
    { emoji: '🧶', name: 'Manta', price: 8, shape: 'box', colors: _PAL.ropa },
    { emoji: '🧶', name: 'Franela', price: 7, shape: 'box', colors: _PAL.ropa },
    { emoji: '🧶', name: 'Loneta', price: 11, shape: 'box', colors: _PAL.ropa },
  ]),
];
SHOP_STOCK['PERFUMERÍA'] = [
    { emoji: '🌸', name: 'Perfume Floral', price: 24, c: 0xf48fb1, shape: 'tall' },
    { emoji: '🧴', name: 'Colonia', price: 20, c: 0x80cbc4, shape: 'tall' },
    { emoji: '🧼', name: 'Jabón Artesanal', price: 8, c: 0xfff3e0, shape: 'box' },
    { emoji: '🧪', name: 'Loción', price: 14, c: 0xce93d8, shape: 'tall' },
  ..._mkStock([
    { emoji: '🌸', name: 'Perfume', price: 26, shape: 'tall', colors: _PAL.perfume },
    { emoji: '🧴', name: 'Colonia', price: 22, shape: 'tall', colors: _PAL.perfume },
    { emoji: '🧴', name: 'Desodorante', price: 9, shape: 'tall', colors: _PAL.perfume },
    { emoji: '🧴', name: 'Crema', price: 12, shape: 'can', colors: _PAL.perfume },
    { emoji: '🧪', name: 'Aceite Esencial', price: 16, shape: 'tall', colors: _PAL.perfume },
    { emoji: '🎁', name: 'Set de Regalo', price: 30, shape: 'box', colors: _PAL.perfume },
  ]),
];
SHOP_STOCK['JUGUETERÍA'] = [
    { emoji: '🧸', name: 'Peluche', price: 15, c: 0xa1887f, shape: 'box' },
    { emoji: '⚽', name: 'Pelota', price: 10, c: 0xffffff, shape: 'sphere' },
    { emoji: '🚗', name: 'Carrito', price: 12, c: 0xe53935, shape: 'box' },
    { emoji: '🧩', name: 'Rompecabezas', price: 9, c: 0x42a5f5, shape: 'box' },
  ..._mkStock([
    { emoji: '🪆', name: 'Muñeca', price: 14, shape: 'tall', colors: _PAL.juguete },
    { emoji: '🪀', name: 'Yoyo', price: 6, shape: 'sphere', colors: _PAL.juguete },
    { emoji: '🪁', name: 'Cometa', price: 11, shape: 'box', colors: _PAL.juguete },
    { emoji: '🧱', name: 'Bloques', price: 13, shape: 'box', colors: _PAL.juguete },
    { emoji: '🌀', name: 'Trompo', price: 7, shape: 'sphere', colors: _PAL.juguete },
    { emoji: '🎭', name: 'Marioneta', price: 16, shape: 'box', colors: _PAL.juguete },
  ]),
];
SHOP_STOCK['LENCERÍA'] = [
    { emoji: '👕', name: 'Playera', price: 12, c: 0x42a5f5, shape: 'box' },
    { emoji: '👖', name: 'Pantalón', price: 15, c: 0x37474f, shape: 'box' },
    { emoji: '👗', name: 'Vestido', price: 18, c: 0xec407a, shape: 'box' },
    { emoji: '🧢', name: 'Gorra', price: 10, c: 0xef6c00, shape: 'box' },
  ..._mkStock([
    { emoji: '👗', name: 'Falda', price: 15, shape: 'box', colors: _PAL.ropa },
    { emoji: '🩳', name: 'Short', price: 10, shape: 'box', colors: _PAL.ropa },
    { emoji: '👔', name: 'Camisa', price: 14, shape: 'box', colors: _PAL.ropa },
    { emoji: '🧥', name: 'Suéter', price: 22, shape: 'box', colors: _PAL.ropa },
    { emoji: '🌙', name: 'Pijama', price: 16, shape: 'box', colors: _PAL.ropa },
    { emoji: '🩱', name: 'Traje de Baño', price: 18, shape: 'box', colors: _PAL.ropa },
  ]),
];
SHOP_STOCK['SOMBREROS'] = [
    { emoji: '🤠', name: 'Sombrero Vaquero', price: 20, c: 0x8d6e63, shape: 'box' },
    { emoji: '🧢', name: 'Gorra GEAYI', price: 12, c: 0x1565c0, shape: 'box' },
    { emoji: '⛱️', name: 'Sombrero de Playa', price: 15, c: 0xffee58, shape: 'box' },
    { emoji: '🎩', name: 'Sombrero Elegante', price: 22, c: 0x212121, shape: 'box' },
  ..._mkStock([
    { emoji: '⛑️', name: 'Boina', price: 14, shape: 'box', colors: _PAL.ropa },
    { emoji: '🧢', name: 'Gorra Deportiva', price: 11, shape: 'box', colors: _PAL.ropa },
    { emoji: '🎩', name: 'Sombrero de Copa', price: 24, shape: 'box', colors: _PAL.ropa },
    { emoji: '⛱️', name: 'Pamelo', price: 16, shape: 'box', colors: _PAL.ropa },
    { emoji: '🧶', name: 'Gorro', price: 9, shape: 'box', colors: _PAL.ropa },
    { emoji: '🧢', name: 'Visera', price: 8, shape: 'box', colors: _PAL.ropa },
  ]),
];
SHOP_STOCK['ABIS CLEAN'] = [
    { emoji: '🧹', name: 'Escoba', price: 10, c: 0xa1887f, shape: 'tall' },
    { emoji: '🪣', name: 'Trapeador', price: 12, c: 0x78909c, shape: 'tall' },
    { emoji: '🧽', name: 'Esponja', price: 4, c: 0xffee58, shape: 'box' },
    { emoji: '🧴', name: 'Jabón Líquido', price: 7, c: 0x4fc3f7, shape: 'tall' },
  ..._mkStock([
    { emoji: '🪣', name: 'Cubeta', price: 9, shape: 'can', colors: _PAL.limpieza },
    { emoji: '🧹', name: 'Recogedor', price: 8, shape: 'box', colors: _PAL.limpieza },
    { emoji: '🧤', name: 'Guantes', price: 7, shape: 'box', colors: _PAL.limpieza },
    { emoji: '🧴', name: 'Atomizador', price: 8, shape: 'tall', colors: _PAL.limpieza },
    { emoji: '🧽', name: 'Fibra', price: 5, shape: 'box', colors: _PAL.limpieza },
    { emoji: '🧴', name: 'Desinfectante', price: 10, shape: 'tall', colors: _PAL.limpieza },
  ]),
];
SHOP_STOCK['HOTEL'] = [
    { emoji: '🗺️', name: 'Mapa', price: 5, c: 0xd7ccc8, shape: 'box' },
    { emoji: '🧸', name: 'Souvenir', price: 12, c: 0xff8a65, shape: 'box' },
    { emoji: '🛏️', name: 'Almohada', price: 15, c: 0xffffff, shape: 'box' },
    { emoji: '🔑', name: 'Llavero', price: 6, c: 0xffd54f, shape: 'box' },
  ..._mkStock([
    { emoji: '🧖', name: 'Toalla', price: 12, shape: 'box', colors: _PAL.hotel },
    { emoji: '🩴', name: 'Sandalias', price: 10, shape: 'box', colors: _PAL.hotel },
    { emoji: '🪥', name: 'Kit Dental', price: 6, shape: 'box', colors: _PAL.hotel },
    { emoji: '🗺️', name: 'Postal', price: 4, shape: 'box', colors: _PAL.hotel },
    { emoji: '☕', name: 'Taza', price: 8, shape: 'can', colors: _PAL.hotel },
    { emoji: '🗺️', name: 'Playera Recuerdo', price: 15, shape: 'box', colors: _PAL.hotel },
  ]),
];
SHOP_STOCK['DULCERÍA'] = _mkStock([
    { emoji: '🍭', name: 'Paleta', price: 4, shape: 'tall', colors: _PAL.dulce },
    { emoji: '🍫', name: 'Chocolate', price: 5, shape: 'box', colors: _PAL.dulce },
    { emoji: '🍬', name: 'Gomitas', price: 3, shape: 'box', colors: _PAL.dulce },
    { emoji: '🍬', name: 'Caramelo', price: 2, shape: 'can', colors: _PAL.dulce },
    { emoji: '🫧', name: 'Chicle', price: 3, shape: 'box', colors: _PAL.dulce },
    { emoji: '🍯', name: 'Dulce Típico', price: 6, shape: 'box', colors: _PAL.dulce },
]);
SHOP_STOCK['JUGUETES'] = _mkStock([
    { emoji: '🧸', name: 'Peluche', price: 15, shape: 'box', colors: _PAL.juguete },
    { emoji: '⚽', name: 'Pelota', price: 10, shape: 'sphere', colors: _PAL.juguete },
    { emoji: '🚗', name: 'Carrito', price: 12, shape: 'box', colors: _PAL.juguete },
    { emoji: '🧩', name: 'Rompecabezas', price: 9, shape: 'box', colors: _PAL.juguete },
    { emoji: '🪆', name: 'Muñeca', price: 14, shape: 'tall', colors: _PAL.juguete },
    { emoji: '🪀', name: 'Yoyo', price: 6, shape: 'sphere', colors: _PAL.juguete },
]);
SHOP_STOCK['PAPELERÍA'] = _mkStock([
    { emoji: '📓', name: 'Cuaderno', price: 6, shape: 'box', colors: _PAL.papel },
    { emoji: '✏️', name: 'Lápices', price: 4, shape: 'tall', colors: _PAL.papel },
    { emoji: '🎨', name: 'Colores', price: 8, shape: 'box', colors: _PAL.papel },
    { emoji: '🎒', name: 'Mochila', price: 18, shape: 'box', colors: _PAL.papel },
    { emoji: '✂️', name: 'Tijeras', price: 7, shape: 'box', colors: _PAL.papel },
    { emoji: '🧴', name: 'Pegamento', price: 5, shape: 'tall', colors: _PAL.papel },
]);
SHOP_STOCK['ZAPATERÍA'] = _mkStock([
    { emoji: '👟', name: 'Tenis', price: 25, shape: 'box', colors: _PAL.ropa },
    { emoji: '👞', name: 'Zapatos', price: 30, shape: 'box', colors: _PAL.ropa },
    { emoji: '🩴', name: 'Chanclas', price: 10, shape: 'box', colors: _PAL.ropa },
    { emoji: '🥾', name: 'Botas', price: 35, shape: 'box', colors: _PAL.ropa },
    { emoji: '👡', name: 'Sandalias', price: 15, shape: 'box', colors: _PAL.ropa },
    { emoji: '🏃', name: 'Tenis Deportivos', price: 28, shape: 'box', colors: _PAL.ropa },
]);
SHOP_STOCK['FLORERÍA'] = _mkStock([
    { emoji: '🌹', name: 'Rosas', price: 12, shape: 'tall', colors: _PAL.flor },
    { emoji: '🌻', name: 'Girasol', price: 10, shape: 'tall', colors: _PAL.flor },
    { emoji: '🌷', name: 'Tulipanes', price: 11, shape: 'tall', colors: _PAL.flor },
    { emoji: '🪴', name: 'Maceta', price: 15, shape: 'box', colors: _PAL.flor },
    { emoji: '🌸', name: 'Orquídea', price: 18, shape: 'tall', colors: _PAL.flor },
    { emoji: '🌺', name: 'Claveles', price: 9, shape: 'tall', colors: _PAL.flor },
]);
SHOP_STOCK['PELUQUERÍA'] = _mkStock([
    { emoji: '🧴', name: 'Shampoo', price: 9, shape: 'tall', colors: _PAL.belleza },
    { emoji: '💇', name: 'Tinte', price: 14, shape: 'tall', colors: _PAL.belleza },
    { emoji: '🧴', name: 'Acondicionador', price: 10, shape: 'tall', colors: _PAL.belleza },
    { emoji: '🧴', name: 'Gel', price: 7, shape: 'can', colors: _PAL.belleza },
    { emoji: '💨', name: 'Secadora', price: 35, shape: 'box', colors: _PAL.belleza },
    { emoji: '✂️', name: 'Tijeras de Peluquero', price: 20, shape: 'box', colors: _PAL.belleza },
]);
SHOP_STOCK['ROPA'] = _mkStock([
    { emoji: '👕', name: 'Playera', price: 12, shape: 'box', colors: _PAL.ropa },
    { emoji: '👖', name: 'Pantalón', price: 18, shape: 'box', colors: _PAL.ropa },
    { emoji: '👗', name: 'Vestido', price: 20, shape: 'box', colors: _PAL.ropa },
    { emoji: '🧥', name: 'Chamarra', price: 25, shape: 'box', colors: _PAL.ropa },
    { emoji: '👗', name: 'Falda', price: 15, shape: 'box', colors: _PAL.ropa },
    { emoji: '🩳', name: 'Short', price: 10, shape: 'box', colors: _PAL.ropa },
]);
SHOP_STOCK['PANADERÍA'] = _mkStock([
    { emoji: '🍞', name: 'Pan', price: 3, shape: 'box', colors: _PAL.pan },
    { emoji: '🥐', name: 'Croissant', price: 4, shape: 'box', colors: _PAL.pan },
    { emoji: '🍩', name: 'Dona', price: 3, shape: 'tire', colors: _PAL.pan },
    { emoji: '🎂', name: 'Pastel', price: 12, shape: 'box', colors: _PAL.pan },
    { emoji: '🍪', name: 'Galleta', price: 2, shape: 'box', colors: _PAL.pan },
    { emoji: '🥟', name: 'Empanada', price: 5, shape: 'box', colors: _PAL.pan },
]);
SHOP_STOCK['FRUTERÍA'] = _mkStock([
    { emoji: '🍎', name: 'Manzana', price: 3, shape: 'sphere', colors: _PAL.fruta },
    { emoji: '🍊', name: 'Naranja', price: 3, shape: 'sphere', colors: _PAL.fruta },
    { emoji: '🍌', name: 'Plátano', price: 4, shape: 'tall', colors: _PAL.fruta },
    { emoji: '🍉', name: 'Sandía', price: 8, shape: 'sphere', colors: _PAL.fruta },
    { emoji: '🍇', name: 'Uvas', price: 5, shape: 'sphere', colors: _PAL.fruta },
    { emoji: '🍍', name: 'Piña', price: 6, shape: 'tall', colors: _PAL.fruta },
]);
SHOP_STOCK['ÓPTICA'] = _mkStock([
    { emoji: '👓', name: 'Lentes', price: 30, shape: 'box', colors: _PAL.optica },
    { emoji: '🕶️', name: 'Lentes de Sol', price: 25, shape: 'box', colors: _PAL.optica },
    { emoji: '👓', name: 'Estuche', price: 12, shape: 'box', colors: _PAL.optica },
    { emoji: '🧴', name: 'Líquido Limpiador', price: 10, shape: 'tall', colors: _PAL.optica },
    { emoji: '🥸', name: 'Armazón', price: 28, shape: 'box', colors: _PAL.optica },
    { emoji: '🧻', name: 'Paño', price: 5, shape: 'box', colors: _PAL.optica },
]);
SHOP_STOCK['PIZZERÍA'] = _mkStock([
    { emoji: '🍕', name: 'Pizza', price: 10, shape: 'box', colors: _PAL.pizza },
    { emoji: '🍕', name: 'Pizza Pepperoni', price: 12, shape: 'box', colors: _PAL.pizza },
    { emoji: '🍕', name: 'Pizza Hawaiana', price: 11, shape: 'box', colors: _PAL.pizza },
    { emoji: '🥟', name: 'Calzone', price: 9, shape: 'box', colors: _PAL.pizza },
    { emoji: '🍞', name: 'Pan de Ajo', price: 5, shape: 'box', colors: _PAL.pizza },
    { emoji: '🥤', name: 'Refresco', price: 3, shape: 'can', colors: _PAL.pizza },
]);
SHOP_STOCK['BARBERÍA'] = _mkStock([
    { emoji: '🪒', name: 'Navaja', price: 15, shape: 'box', colors: _PAL.belleza },
    { emoji: '🧴', name: 'Gel', price: 7, shape: 'can', colors: _PAL.belleza },
    { emoji: '🧴', name: 'Cera', price: 9, shape: 'can', colors: _PAL.belleza },
    { emoji: '✂️', name: 'Tijeras', price: 12, shape: 'box', colors: _PAL.belleza },
    { emoji: '💈', name: 'Máquina', price: 40, shape: 'box', colors: _PAL.belleza },
    { emoji: '🧴', name: 'After Shave', price: 11, shape: 'tall', colors: _PAL.belleza },
]);
SHOP_STOCK['REGALOS'] = _mkStock([
    { emoji: '🎁', name: 'Regalo', price: 15, shape: 'box', colors: _PAL.regalo },
    { emoji: '💌', name: 'Tarjeta', price: 4, shape: 'box', colors: _PAL.regalo },
    { emoji: '🎀', name: 'Moño', price: 5, shape: 'box', colors: _PAL.regalo },
    { emoji: '🧸', name: 'Peluche', price: 12, shape: 'box', colors: _PAL.regalo },
    { emoji: '🎈', name: 'Globo', price: 3, shape: 'sphere', colors: _PAL.regalo },
    { emoji: '🎁', name: 'Envoltura', price: 6, shape: 'box', colors: _PAL.regalo },
]);
SHOP_STOCK['CAFETERÍA'] = _mkStock([
    { emoji: '☕', name: 'Café', price: 4, shape: 'can', colors: _PAL.cafe },
    { emoji: '☕', name: 'Capuchino', price: 6, shape: 'can', colors: _PAL.cafe },
    { emoji: '🥐', name: 'Croissant', price: 4, shape: 'box', colors: _PAL.cafe },
    { emoji: '🍰', name: 'Pastel', price: 8, shape: 'box', colors: _PAL.cafe },
    { emoji: '🍪', name: 'Galleta', price: 3, shape: 'box', colors: _PAL.cafe },
    { emoji: '☕', name: 'Chocolate Caliente', price: 5, shape: 'can', colors: _PAL.cafe },
]);
SHOP_STOCK['HELADERÍA'] = _mkStock([
    { emoji: '🍦', name: 'Helado', price: 5, shape: 'can', colors: _PAL.helado },
    { emoji: '🍨', name: 'Sundae', price: 7, shape: 'can', colors: _PAL.helado },
    { emoji: '🧋', name: 'Malteada', price: 6, shape: 'tall', colors: _PAL.helado },
    { emoji: '🍧', name: 'Nieve', price: 5, shape: 'can', colors: _PAL.helado },
    { emoji: '🍭', name: 'Paleta Helada', price: 4, shape: 'tall', colors: _PAL.helado },
    { emoji: '🍦', name: 'Cono', price: 4, shape: 'tall', colors: _PAL.helado },
]);
SHOP_STOCK['FERRETERÍA'] = _mkStock([
    { emoji: '🔨', name: 'Martillo', price: 10, shape: 'tall', colors: _PAL.herramienta },
    { emoji: '🔧', name: 'Llave', price: 12, shape: 'tall', colors: _PAL.herramienta },
    { emoji: '🪛', name: 'Destornillador', price: 8, shape: 'tall', colors: _PAL.herramienta },
    { emoji: '🔩', name: 'Tornillos', price: 6, shape: 'box', colors: _PAL.herramienta },
    { emoji: '📌', name: 'Clavos', price: 5, shape: 'box', colors: _PAL.herramienta },
    { emoji: '📏', name: 'Cinta Métrica', price: 7, shape: 'box', colors: _PAL.herramienta },
]);
SHOP_STOCK['LIBRERÍA'] = _mkStock([
    { emoji: '📚', name: 'Libro', price: 10, shape: 'box', colors: _PAL.libro },
    { emoji: '📖', name: 'Cuento', price: 8, shape: 'box', colors: _PAL.libro },
    { emoji: '📓', name: 'Libreta', price: 6, shape: 'box', colors: _PAL.libro },
    { emoji: '🗺️', name: 'Atlas', price: 12, shape: 'box', colors: _PAL.libro },
    { emoji: '📕', name: 'Diccionario', price: 14, shape: 'box', colors: _PAL.libro },
    { emoji: '💥', name: 'Historieta', price: 7, shape: 'box', colors: _PAL.libro },
]);
SHOP_STOCK['MASCOTAS'] = _mkStock([
    { emoji: '🦴', name: 'Hueso', price: 5, shape: 'box', colors: _PAL.mascota },
    { emoji: '🐕', name: 'Croquetas', price: 12, shape: 'box', colors: _PAL.mascota },
    { emoji: '🦮', name: 'Correa', price: 12, shape: 'box', colors: _PAL.mascota },
    { emoji: '🧸', name: 'Juguete', price: 8, shape: 'box', colors: _PAL.mascota },
    { emoji: '🛏️', name: 'Cama', price: 20, shape: 'box', colors: _PAL.mascota },
    { emoji: '🥣', name: 'Plato', price: 7, shape: 'can', colors: _PAL.mascota },
]);
SHOP_STOCK['LAVANDERÍA'] = _mkStock([
    { emoji: '🧴', name: 'Detergente', price: 9, shape: 'tall', colors: _PAL.limpieza },
    { emoji: '🧴', name: 'Suavizante', price: 8, shape: 'tall', colors: _PAL.limpieza },
    { emoji: '🧼', name: 'Jabón', price: 5, shape: 'box', colors: _PAL.limpieza },
    { emoji: '🧺', name: 'Canasta', price: 14, shape: 'box', colors: _PAL.limpieza },
    { emoji: '👕', name: 'Gancho', price: 3, shape: 'box', colors: _PAL.limpieza },
    { emoji: '🛍️', name: 'Bolsa', price: 4, shape: 'box', colors: _PAL.limpieza },
]);
SHOP_STOCK['JOYERÍA'] = _mkStock([
    { emoji: '💍', name: 'Anillo', price: 40, shape: 'box', colors: _PAL.joya },
    { emoji: '📿', name: 'Collar', price: 35, shape: 'box', colors: _PAL.joya },
    { emoji: '💎', name: 'Pulsera', price: 30, shape: 'box', colors: _PAL.joya },
    { emoji: '✨', name: 'Aretes', price: 25, shape: 'box', colors: _PAL.joya },
    { emoji: '⌚', name: 'Reloj', price: 45, shape: 'box', colors: _PAL.joya },
    { emoji: '🧿', name: 'Dije', price: 20, shape: 'box', colors: _PAL.joya },
]);
SHOP_STOCK['DEPORTES'] = _mkStock([
    { emoji: '⚽', name: 'Pelota', price: 12, shape: 'sphere', colors: _PAL.deporte },
    { emoji: '🏀', name: 'Balón', price: 14, shape: 'sphere', colors: _PAL.deporte },
    { emoji: '🎾', name: 'Raqueta', price: 20, shape: 'box', colors: _PAL.deporte },
    { emoji: '🥊', name: 'Guantes', price: 18, shape: 'box', colors: _PAL.deporte },
    { emoji: '🪖', name: 'Casco', price: 25, shape: 'box', colors: _PAL.deporte },
    { emoji: '🥅', name: 'Red', price: 15, shape: 'box', colors: _PAL.deporte },
]);
SHOP_STOCK['MÚSICA'] = _mkStock([
    { emoji: '🎸', name: 'Guitarra', price: 45, shape: 'box', colors: _PAL.musica },
    { emoji: '🥁', name: 'Tambor', price: 30, shape: 'can', colors: _PAL.musica },
    { emoji: '🎺', name: 'Trompeta', price: 35, shape: 'tall', colors: _PAL.musica },
    { emoji: '🎹', name: 'Teclado', price: 40, shape: 'box', colors: _PAL.musica },
    { emoji: '🪈', name: 'Flauta', price: 20, shape: 'tall', colors: _PAL.musica },
    { emoji: '🪇', name: 'Maracas', price: 12, shape: 'tall', colors: _PAL.musica },
]);
SHOP_STOCK['SASTRERÍA'] = _mkStock([
    { emoji: '🧵', name: 'Hilo', price: 4, shape: 'can', colors: _PAL.sastreria },
    { emoji: '📏', name: 'Cinta Métrica', price: 6, shape: 'box', colors: _PAL.sastreria },
    { emoji: '👔', name: 'Corbata', price: 12, shape: 'box', colors: _PAL.sastreria },
    { emoji: '🔘', name: 'Botones', price: 4, shape: 'box', colors: _PAL.sastreria },
    { emoji: '🪡', name: 'Agujas', price: 5, shape: 'tall', colors: _PAL.sastreria },
    { emoji: '🧶', name: 'Tela', price: 10, shape: 'box', colors: _PAL.sastreria },
]);
SHOP_STOCK['DENTISTA'] = _mkStock([
    { emoji: '🪥', name: 'Cepillo', price: 6, shape: 'tall', colors: _PAL.dentista },
    { emoji: '🦷', name: 'Pasta Dental', price: 5, shape: 'tall', colors: _PAL.dentista },
    { emoji: '🦷', name: 'Hilo Dental', price: 4, shape: 'box', colors: _PAL.dentista },
    { emoji: '👄', name: 'Enjuague', price: 7, shape: 'tall', colors: _PAL.dentista },
    { emoji: '🪥', name: 'Cepillo Eléctrico', price: 25, shape: 'box', colors: _PAL.dentista },
    { emoji: '🧰', name: 'Estuche', price: 10, shape: 'box', colors: _PAL.dentista },
]);
SHOP_STOCK['VETERINARIA'] = _mkStock([
    { emoji: '🐕', name: 'Croquetas', price: 12, shape: 'box', colors: _PAL.mascota },
    { emoji: '💊', name: 'Vitaminas', price: 10, shape: 'box', colors: _PAL.mascota },
    { emoji: '🦮', name: 'Correa', price: 12, shape: 'box', colors: _PAL.mascota },
    { emoji: '🧸', name: 'Juguete', price: 8, shape: 'box', colors: _PAL.mascota },
    { emoji: '🧴', name: 'Shampoo', price: 9, shape: 'tall', colors: _PAL.mascota },
    { emoji: '🛏️', name: 'Cama', price: 20, shape: 'box', colors: _PAL.mascota },
]);
SHOP_STOCK['BANCO'] = _mkStock([
    { emoji: '🐷', name: 'Alcancía', price: 20, shape: 'box', colors: _PAL.banco },
    { emoji: '👛', name: 'Monedero', price: 15, shape: 'box', colors: _PAL.banco },
    { emoji: '🔐', name: 'Candado', price: 15, shape: 'box', colors: _PAL.banco },
    { emoji: '🧮', name: 'Calculadora', price: 18, shape: 'box', colors: _PAL.banco },
    { emoji: '📓', name: 'Libreta', price: 8, shape: 'box', colors: _PAL.banco },
    { emoji: '🖊️', name: 'Pluma', price: 5, shape: 'tall', colors: _PAL.banco },
]);
SHOP_STOCK['CARNICERÍA'] = _mkStock([
    { emoji: '🥩', name: 'Carne', price: 15, shape: 'box', colors: _PAL.carne },
    { emoji: '🍗', name: 'Pollo', price: 12, shape: 'box', colors: _PAL.carne },
    { emoji: '🌭', name: 'Salchicha', price: 8, shape: 'tall', colors: _PAL.carne },
    { emoji: '🥓', name: 'Tocino', price: 10, shape: 'box', colors: _PAL.carne },
    { emoji: '🌭', name: 'Chorizo', price: 9, shape: 'tall', colors: _PAL.carne },
    { emoji: '🍖', name: 'Costilla', price: 14, shape: 'box', colors: _PAL.carne },
]);
SHOP_STOCK['PUPUSERÍA'] = _mkStock([
    { emoji: '🫓', name: 'Pupusa', price: 5, shape: 'box', colors: _PAL.pupusa },
    { emoji: '🫓', name: 'Pupusa de Queso', price: 6, shape: 'box', colors: _PAL.pupusa },
    { emoji: '🫓', name: 'Pupusa Mixta', price: 7, shape: 'box', colors: _PAL.pupusa },
    { emoji: '🥗', name: 'Curtido', price: 4, shape: 'can', colors: _PAL.pupusa },
    { emoji: '🍅', name: 'Salsa', price: 3, shape: 'can', colors: _PAL.pupusa },
    { emoji: '🥤', name: 'Refresco', price: 3, shape: 'can', colors: _PAL.pupusa },
]);
SHOP_STOCK['VERDULERÍA'] = _mkStock([
    { emoji: '🥬', name: 'Lechuga', price: 3, shape: 'sphere', colors: _PAL.verdura },
    { emoji: '🍅', name: 'Tomate', price: 3, shape: 'sphere', colors: _PAL.verdura },
    { emoji: '🥕', name: 'Zanahoria', price: 4, shape: 'tall', colors: _PAL.verdura },
    { emoji: '🥔', name: 'Papa', price: 2, shape: 'sphere', colors: _PAL.verdura },
    { emoji: '🧅', name: 'Cebolla', price: 3, shape: 'sphere', colors: _PAL.verdura },
    { emoji: '🌶️', name: 'Chile', price: 4, shape: 'tall', colors: _PAL.verdura },
]);
SHOP_STOCK['CORREO'] = _mkStock([
    { emoji: '✉️', name: 'Sobre', price: 2, shape: 'box', colors: _PAL.correo },
    { emoji: '📦', name: 'Paquete', price: 8, shape: 'box', colors: _PAL.correo },
    { emoji: '📮', name: 'Estampilla', price: 3, shape: 'box', colors: _PAL.correo },
    { emoji: '💌', name: 'Tarjeta', price: 4, shape: 'box', colors: _PAL.correo },
    { emoji: '📦', name: 'Caja', price: 6, shape: 'box', colors: _PAL.correo },
    { emoji: '📬', name: 'Buzón', price: 10, shape: 'box', colors: _PAL.correo },
]);
SHOP_STOCK['GASOLINERA'] = _mkStock([
    { emoji: '🛢️', name: 'Aceite', price: 10, shape: 'can', colors: _PAL.auto },
    { emoji: '🧴', name: 'Anticongelante', price: 9, shape: 'tall', colors: _PAL.auto },
    { emoji: '🥤', name: 'Refresco', price: 3, shape: 'can', colors: _PAL.auto },
    { emoji: '🍫', name: 'Chocolate', price: 5, shape: 'box', colors: _PAL.auto },
    { emoji: '🍟', name: 'Papas', price: 4, shape: 'box', colors: _PAL.auto },
    { emoji: '💧', name: 'Agua', price: 3, shape: 'tall', colors: _PAL.auto },
]);
SHOP_STOCK['MERCADO'] = _mkStock([
    { emoji: '🍎', name: 'Fruta', price: 3, shape: 'sphere', colors: _PAL.mercado },
    { emoji: '🥬', name: 'Verdura', price: 3, shape: 'sphere', colors: _PAL.mercado },
    { emoji: '🫓', name: 'Tortillas', price: 4, shape: 'box', colors: _PAL.mercado },
    { emoji: '🧀', name: 'Queso', price: 6, shape: 'box', colors: _PAL.mercado },
    { emoji: '🥛', name: 'Crema', price: 5, shape: 'can', colors: _PAL.mercado },
    { emoji: '🥚', name: 'Huevos', price: 4, shape: 'box', colors: _PAL.mercado },
]);
SHOP_STOCK['TAQUERÍA'] = _mkStock([
    { emoji: '🌮', name: 'Taco', price: 5, shape: 'box', colors: _PAL.taqueria },
    { emoji: '🌶️', name: 'Salsa', price: 4, shape: 'can', colors: _PAL.taqueria },
    { emoji: '🥤', name: 'Agua Fresca', price: 6, shape: 'tall', colors: _PAL.taqueria },
    { emoji: '🫓', name: 'Quesadilla', price: 7, shape: 'box', colors: _PAL.taqueria },
    { emoji: '🥑', name: 'Guacamole', price: 6, shape: 'can', colors: _PAL.taqueria },
    { emoji: '🥤', name: 'Refresco', price: 3, shape: 'can', colors: _PAL.taqueria },
]);
SHOP_STOCK['HAMBURGUESAS'] = _mkStock([
    { emoji: '🍔', name: 'Hamburguesa', price: 10, shape: 'box', colors: _PAL.hamburguesa },
    { emoji: '🍟', name: 'Papas', price: 4, shape: 'box', colors: _PAL.hamburguesa },
    { emoji: '🧋', name: 'Malteada', price: 6, shape: 'tall', colors: _PAL.hamburguesa },
    { emoji: '🍗', name: 'Nuggets', price: 7, shape: 'box', colors: _PAL.hamburguesa },
    { emoji: '🥤', name: 'Refresco', price: 3, shape: 'can', colors: _PAL.hamburguesa },
    { emoji: '🍦', name: 'Helado', price: 5, shape: 'can', colors: _PAL.hamburguesa },
]);
const PRODUCT_CATALOG = [ // mercancía de las tiendas (se compra con monedas del juego)
  { emoji: '🥤', name: 'Refresco', price: 3, c: 0xe53935, shape: 'can' },
  { emoji: '🍪', name: 'Galletas', price: 4, c: 0xfb8c00, shape: 'box' },
  { emoji: '🍫', name: 'Chocolate', price: 5, c: 0x6d4c41, shape: 'box' },
  { emoji: '🧃', name: 'Jugo', price: 3, c: 0x43a047, shape: 'tall' },
  { emoji: '🍬', name: 'Dulces', price: 2, c: 0xec407a, shape: 'box' },
  { emoji: '🥜', name: 'Maní', price: 4, c: 0xffee58, shape: 'can' },
  { emoji: '🥛', name: 'Leche', price: 3, c: 0xffffff, shape: 'tall' },
  { emoji: '☕', name: 'Café', price: 4, c: 0x4e342e, shape: 'can' },
  { emoji: '🍩', name: 'Dona', price: 3, c: 0xf48fb1, shape: 'box' },
  { emoji: '🍭', name: 'Paleta', price: 2, c: 0xff5252, shape: 'tall' },
  { emoji: '🍞', name: 'Pan', price: 3, c: 0xd7a86e, shape: 'box' },
  { emoji: '🍦', name: 'Helado', price: 5, c: 0xfff3e0, shape: 'can' },
];
function addProductItem(parent, x, y, z, idx, stock) { // 🖐️ producto 3D agarrable en el estante
  const cat = (stock && stock.length) ? stock : PRODUCT_CATALOG;
  const p = cat[((idx % cat.length) + cat.length) % cat.length];
  const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
  const m = urbMat(p.c);
  if (p.shape === 'can') {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.38, 10), m); b.position.y = 0.19; g.add(b);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.155, 0.05, 10), urbMat(0xd7dde3)); lid.position.y = 0.4; g.add(lid);
  } else if (p.shape === 'tall') {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.5, 0.26), m); b.position.y = 0.25; g.add(b);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.09, 0.12), urbMat(0xffffff)); cap.position.y = 0.54; g.add(cap);
  } else if (p.shape === 'tire') { // 🛞 llanta de verdad (toroide)
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.085, 10, 18), m);
    t.position.y = 0.29; t.rotation.y = Math.PI / 2; g.add(t);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.1, 10), urbMat(0xc7ccd6));
    hub.position.y = 0.29; hub.rotation.z = Math.PI / 2; g.add(hub);
  } else if (p.shape === 'sphere') { // ⚽ pelota
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), m); s.position.y = 0.2; g.add(s);
  } else {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.28, 0.26), m); b.position.y = 0.14; g.add(b);
  }
  TOUCHABLES.push({ o: g, name: p.name, price: p.price, emoji: p.emoji, kind: 'product', home: { parent: parent, x: x, y: y, z: z } });
  return g;
}
function addDecorBall(parent, x, z) { // ⚽ pelota de juguete (se puede mover)
  const g = new THREE.Group(); g.position.set(x, 0.22, z); parent.add(g);
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), urbMat(0xff2fd6)));
  TOUCHABLES.push({ o: g, name: 'Pelota', price: 0, emoji: '⚽', kind: 'decor', home: { parent: parent, x: x, y: 0.22, z: z } });
}
function addDecorBox(parent, x, z) { // 📦 caja de juguetes (se puede mover)
  const g = new THREE.Group(); g.position.set(x, 0.16, z); parent.add(g);
  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.32, 0.36), urbMat(0xffb300)));
  TOUCHABLES.push({ o: g, name: 'Caja de juguetes', price: 0, emoji: '📦', kind: 'decor', home: { parent: parent, x: x, y: 0.16, z: z } });
}
const KEEPER_NAMES = ['Doña Mary', 'Don Beto', 'Lupita', 'Don Chuy', 'Doña Rosa', 'Don Pepe'];
let _keeperIdx = 0;
function addShopkeeper(parent, x, z, ry, shopName, food) { // 🧑‍💼 persona que atiende la tienda
  if (typeof createAvatarMesh !== 'function') return;
  const cols = ['#ff5533', '#00a2ff', '#59d867', '#7b2fff', '#ff2fd6', '#ff9d00'];
  const g = createAvatarMesh({ body: cols[_keeperIdx % cols.length] });
  const name = KEEPER_NAMES[_keeperIdx % KEEPER_NAMES.length]; _keeperIdx++;
  g.position.set(x, 0, z); g.rotation.y = ry || 0;
  if (typeof makeNameLabel === 'function') {
    const label = makeNameLabel(name);
    label.position.y = g.userData.nameLabelY || 2.7;
    g.add(label);
  }
  parent.add(g);
  SHOPKEEPERS.push({ o: g, name: name, shop: shopName || 'Tienda', food: !!food });
}
function flushWallSolids(lvl) {
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
}
const _hbUnit = () => urbGeo('hb-unit', () => new THREE.BoxGeometry(1, 1, 1));
function gBox(parent, w, h, d, mat, x, y, z, ry) {
  const m = new THREE.Mesh(_hbUnit(), mat);
  m.scale.set(w, h, d); m.position.set(x, y, z);
  if (ry) m.rotation.y = ry;
  parent.add(m); return m;
}
let _prodTex = null;
function productStripTex() { // productos de tienda: cajas con etiqueta, botellas y latas (ya no parecen libros)
  if (_prodTex) return _prodTex;
  _prodTex = canvasTex(256, 64, (c, w, h) => {
    c.fillStyle = '#3a2a1c'; c.fillRect(0, 0, w, h); // fondo del estante
    const cols = ['#ff5252', '#ffd23f', '#69f0ae', '#40c4ff', '#ff8a65', '#ea80fc', '#aed581', '#fff59d', '#ff6e40', '#7c9eff'];
    let x = 4, seed = 987654321;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    while (x < w - 14) {
      const col = cols[Math.floor(rnd() * cols.length)];
      const kind = rnd();
      const step = 12 + Math.floor(rnd() * 10); // ancho variado
      if (kind < 0.45) {
        // caja con etiqueta blanca
        const bh = 30 + Math.floor(rnd() * 18), y = h - bh - 3;
        c.fillStyle = col; c.fillRect(x, y, step, bh);
        c.fillStyle = 'rgba(255,255,255,0.9)'; c.fillRect(x + 2, y + bh * 0.30, step - 4, bh * 0.30);
        c.fillStyle = 'rgba(0,0,0,0.28)'; c.fillRect(x + 2, y + bh * 0.34, step - 4, 2);
        c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(x, y, 3, bh); // lomo con luz
      } else if (kind < 0.75) {
        // botella: cuerpo + cuello + tapa
        const bw2 = 9 + Math.floor(rnd() * 5), bh = 36 + Math.floor(rnd() * 14);
        const y = h - bh - 3, cx = x + bw2 / 2;
        c.fillStyle = col; c.fillRect(x, y + 10, bw2, bh - 10);
        c.fillRect(cx - 2.5, y + 3, 5, 9);
        c.fillStyle = '#d7ccc8'; c.fillRect(cx - 3.5, y, 7, 4);
        c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(x + 1.5, y + 12, 2.5, bh - 16);
      } else {
        // lata con borde metálico y etiqueta
        const bw2 = 11 + Math.floor(rnd() * 6), bh = 24 + Math.floor(rnd() * 14), y = h - bh - 3;
        c.fillStyle = col; c.fillRect(x, y, bw2, bh);
        c.fillStyle = '#b0bec5'; c.fillRect(x, y, bw2, 3);
        c.fillStyle = 'rgba(255,255,255,0.8)'; c.fillRect(x + 2, y + bh * 0.30, bw2 - 4, bh * 0.32);
      }
      x += step + 3 + Math.floor(rnd() * 4);
    }
  });
  return _prodTex;
}
function shopShelf(parent, x, z, ry, w, stock) { // estante con 3 niveles de productos
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry || 0; parent.add(g);
  const wood = urbMat(0x6b4a2f), woodD = urbMat(0x4e3421);
  const H = 2.2, D = 0.55;
  gBox(g, 0.08, H, D, woodD, -w / 2, H / 2, 0);
  gBox(g, 0.08, H, D, woodD, w / 2, H / 2, 0);
  const prodM = new THREE.MeshBasicMaterial({ map: productStripTex() });
  for (let i = 0; i < 3; i++) {
    const y = 0.35 + i * 0.7;
    gBox(g, w, 0.07, D, wood, 0, y, 0);
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.2, 0.55), prodM);
    strip.position.set(0, y + 0.32, 0.14); g.add(strip);
  }
  gBox(g, w, 0.08, D, wood, 0, H, 0);
  const solidM = new THREE.Mesh(new THREE.BoxGeometry(w, 2.2, 0.6));
  solidM.position.set(0, 1.1, 0); solidM.visible = false; g.add(solidM);
  WALL_SOLIDS.push({ mesh: solidM, y0: 0, y1: 2.2 }); // 🧱 no se atraviesa el estante
  // 🖐️ productos 3D que se pueden tocar y agarrar (en los 3 niveles: estante lleno)
  const _np = Math.max(2, Math.min(4, Math.floor(w / 0.8)));
  for (let _lv = 0; _lv < 3; _lv++) {
    const _py = 0.35 + _lv * 0.7; // sobre cada tabla del estante
    for (let _i = 0; _i < _np; _i++) {
      const _px = -w / 2 + 0.45 + _i * ((w - 0.9) / Math.max(1, _np - 1));
      addProductItem(g, _px, _py, 0.18, Math.abs(Math.round(x * 7 + _i * 13 + _lv * 37 + z * 3)) % 997, stock);
    }
  }
}
function shopCounter(parent, x, z, ry) { // mostrador + caja registradora
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry || 0; parent.add(g);
  gBox(g, 2.4, 0.95, 0.9, urbMat(0x8a5a33), 0, 0.475, 0);
  gBox(g, 2.6, 0.08, 1.05, urbMat(0xf5f0e6), 0, 0.99, 0);
  gBox(g, 0.42, 0.28, 0.36, urbMat(0x37474f), 0.6, 1.17, 0);
  gBox(g, 0.3, 0.2, 0.05, urbBasic(0x9be8ff), 0.6, 1.32, -0.12);
  const solidC = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.95, 0.9));
  solidC.position.set(0, 0.475, 0); solidC.visible = false; g.add(solidC);
  WALL_SOLIDS.push({ mesh: solidC, y0: 0, y1: 0.95 }); // 🧱 no se atraviesa el mostrador
}
function ceilingLamp(parent, x, y, z) { // lámpara que brilla en el interior
  gBox(parent, 0.09, 0.35, 0.09, urbMat(0x444444), x, y + 0.22, z);
  gBox(parent, 1.3, 0.12, 0.7, urbBasic(0xfff3c4), x, y, z);
}
function houseBed(p, x, z, ry, c) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry || 0; p.add(g);
  const wood = urbMat(0x6b4a2f);
  gBox(g, 1.7, 0.9, 0.12, wood, 0, 0.45, -1.28);      // cabecera
  gBox(g, 1.7, 0.3, 2.5, wood, 0, 0.25, 0);           // base
  gBox(g, 1.6, 0.25, 2.4, urbMat(0xf5f5f5), 0, 0.52, 0); // colchón
  gBox(g, 1.6, 0.13, 1.25, urbMat(c), 0, 0.62, 0.55); // cobija de color
  gBox(g, 0.68, 0.18, 0.42, urbMat(0xffffff), -0.38, 0.7, -0.9);
  gBox(g, 0.68, 0.18, 0.42, urbMat(0xffffff), 0.38, 0.7, -0.9);
}
function houseTable(p, x, z) {
  const wood = urbMat(0x8a5a33), woodD = urbMat(0x6b4a2f);
  gBox(p, 1.7, 0.09, 1.1, wood, x, 0.78, z);
  [[-0.75, -0.45], [0.75, -0.45], [-0.75, 0.45], [0.75, 0.45]].forEach(([dx, dz]) =>
    gBox(p, 0.09, 0.78, 0.09, woodD, x + dx, 0.39, z + dz));
  [[-1.45], [1.45]].forEach(([dx]) => { // 2 sillas
    gBox(p, 0.45, 0.07, 0.45, wood, x + dx, 0.48, z);
    gBox(p, 0.07, 0.65, 0.45, wood, x + dx + (dx < 0 ? -0.22 : 0.22), 0.8, z);
  });
}
function houseSofa(p, x, z, ry, c) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry || 0; p.add(g);
  const m = urbMat(c);
  gBox(g, 2.0, 0.45, 0.85, m, 0, 0.32, 0);
  gBox(g, 2.0, 0.7, 0.25, m, 0, 0.78, -0.32);
  gBox(g, 0.25, 0.4, 0.85, m, -1.0, 0.62, 0);
  gBox(g, 0.25, 0.4, 0.85, m, 1.0, 0.62, 0);
  gBox(g, 0.88, 0.13, 0.68, urbMat(0xf5f5f5), -0.47, 0.6, 0.03);
  gBox(g, 0.88, 0.13, 0.68, urbMat(0xf5f5f5), 0.47, 0.6, 0.03);
}
function houseLamp(p, x, z) {
  gBox(p, 0.34, 0.06, 0.34, urbMat(0x444444), x, 0.03, z);
  gBox(p, 0.09, 1.6, 0.09, urbMat(0x444444), x, 0.83, z);
  gBox(p, 0.55, 0.42, 0.55, urbBasic(0xffe9a8), x, 1.82, z);
}
/* Edificio hueco genérico: piso, 4 paredes (frente con hueco de puerta),
   techo, puerta abierta, interior amueblado y colisionadores.
   o: {w, d, h, wallC, trimC, ry, doorW, interior:'shop'|'house', floorC} */
function hollowBuilding(g, x, z, o) {
  const W = o.w, D = o.d, H = o.h, T = 0.35;
  const doorW = o.doorW || 1.8, doorH = 2.9;
  const grp = new THREE.Group();
  grp.position.set(x, 0, z); grp.rotation.y = o.ry || 0;
  g.add(grp);
  // paredes con leve brillo propio para que el interior se vea con luz
  const wallMat = new THREE.MeshStandardMaterial({ color: o.wallC, roughness: 0.9, metalness: 0.02, emissive: o.wallC, emissiveIntensity: 0.22 });
  const trimM = urbMat(o.trimC != null ? o.trimC : 0xf7f3ea);
  const wallMeshes = [];
  const wall = (w, h, d, px, py, pz, y0, y1) => {
    const m = gBox(grp, w, h, d, wallMat, px, py, pz);
    wallMeshes.push(m);
    CUTAWAY.push(m); // la cámara puede ocultar esta pared para ver al jugador adentro
    WALL_SOLIDS.push({ mesh: m, y0: y0 == null ? 0 : y0, y1: y1 == null ? H : y1 });
    return m;
  };
  const segL = (W - doorW) / 2, fz = D / 2;
  wall(segL, H, T, -(doorW / 2 + segL / 2), H / 2, fz);          // frente izq
  wall(segL, H, T, (doorW / 2 + segL / 2), H / 2, fz);           // frente der
  // dintel sobre la puerta: solo visual (sin colisionador, para no frenar saltos en la puerta)
  const lintel = gBox(grp, doorW, H - doorH, T, wallMat, 0, doorH + (H - doorH) / 2, fz);
  CUTAWAY.push(lintel);
  wall(W, H, T, 0, H / 2, -fz);                                  // atrás
  wall(T, H, D, -W / 2, H / 2, 0);                              // lado izq
  wall(T, H, D, W / 2, H / 2, 0);                               // lado der
  // piso (visual; el suelo del mundo ya colisiona en y=0)
  gBox(grp, W, 0.12, D, urbMat(o.floorC != null ? o.floorC : 0xc9a06a), 0, -0.04, 0);
  // techo plano con borde
  const ceil = gBox(grp, W + 0.8, 0.35, D + 0.8, trimM, 0, H + 0.175, 0);
  CUTAWAY.push(ceil);
  if (o.interior === 'shop' || o.interior === 'house') {
    const zone = { cx: x, cz: z, hw: W / 2, hd: D / 2, h: H, ry: o.ry || 0 };
    INTERIORS.push(zone);
    CEILINGS.push({ m: ceil, zone: zone }); // el techo se oculta cuando la cámara entra
  }
  // marco de puerta + puerta ABIERTA
  gBox(grp, 0.22, doorH, 0.5, trimM, -doorW / 2, doorH / 2, fz);
  gBox(grp, 0.22, doorH, 0.5, trimM, doorW / 2, doorH / 2, fz);
  gBox(grp, doorW + 0.44, 0.25, 0.5, trimM, 0, doorH + 0.125, fz);
  const hinge = new THREE.Group(); hinge.position.set(-doorW / 2 + 0.05, 0, fz); hinge.rotation.y = -1.9; grp.add(hinge);
  gBox(hinge, doorW - 0.15, doorH - 0.12, 0.07, urbMat(0x7a5230), (doorW - 0.15) / 2, (doorH - 0.12) / 2 + 0.03, 0);
  // ---- interior ----
  if (o.interior === 'shop') {
    const bz = -D / 2 + 0.85;
    const stock = (typeof SHOP_STOCK !== 'undefined' && o.shopName && SHOP_STOCK[o.shopName]) || null; // 🏷️ cada tienda vende lo que dice
    if (W >= 8) { shopShelf(grp, -W / 4, bz, 0, 3.2, stock); shopShelf(grp, W / 4, bz, 0, 3.2, stock); }
    else shopShelf(grp, 0, bz, 0, Math.max(2.4, W - 2), stock);
    shopShelf(grp, -W / 2 + 0.85, 0.4, Math.PI / 2, Math.min(3, D - 2.4), stock);
    shopCounter(grp, W / 2 - 1.9, D / 2 - 1.7, 0);
    addShopkeeper(grp, W / 2 - 1.9, D / 2 - 2.9, 0, o.shopName || 'Tienda', !!o.shopFood); // 🧑‍💼 dependiente detrás del mostrador
    ceilingLamp(grp, 0, H - 0.35, 0);
  } else if (o.interior === 'house') {
    const bc = [0xd94f4f, 0x3f7fd9, 0x35c759, 0xffb300][Math.abs(Math.round(x * 7 + z * 13)) % 4];
    houseBed(grp, -W / 2 + 1.35, -D / 2 + 1.75, 0, bc);
    houseTable(grp, W / 2 - 1.7, 0.6);
    houseSofa(grp, W / 2 - 1.35, -D / 2 + 1.0, Math.PI, bc);
    gBox(grp, 2.6, 0.05, 1.8, urbMat(0xd9b382), -0.4, 0.045, 0.6); // tapete
    houseLamp(grp, -W / 2 + 0.7, D / 2 - 0.9);
    ceilingLamp(grp, 0, H - 0.35, 0);
    addDecorBall(grp, -0.4, 1.2); // ⚽ pelota que se puede agarrar y mover
    addDecorBox(grp, W / 2 - 1.7, -0.9); // 📦 caja de juguetes que se puede mover
  }
  return { grp, wallMeshes, wallMat };
}

function addShop(group, x, z, color, name, burger) { // tiendita de Main Street (burger=true: hamburguesa 3D en el techo)
  // tiendita ENTRABLE: frente local -x (igual que antes) => ry=-90°
  const W = 6, D = 5, H = 3.6;
  const { grp } = hollowBuilding(group, x, z, {
    w: W, d: D, h: H, wallC: color, ry: -Math.PI / 2,
    interior: 'shop', floorC: 0xc9a06a, trimC: 0xf5f0e6,
    shopName: name, shopFood: !!burger || name === 'TAQUERÍA'
  });
  const fz = D / 2;
  grp.add(facadeSign(5.0, 0.62, paintedSignTexture(name), 0, 3.24, fz + 0.21, 0)); // nombre PINTADO en la fachada
  const awnM = new THREE.MeshStandardMaterial({ map: stripeTexture('#ffffff', '#ff1744'), roughness: 0.7 });
  const awn = new THREE.Mesh(_hbUnit(), awnM);
  awn.scale.set(W * 0.9, 0.16, 1.4); awn.position.set(0, 2.62, fz + 0.7); awn.rotation.x = 0.22; grp.add(awn);
  const win = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.6),
    new THREE.MeshBasicMaterial({ color: 0x9fd8ff }));
  win.position.set(1.95, 1.5, fz + 0.19); grp.add(win);
  // torre decorativa arriba (visual, inalcanzable)
  const tower = new THREE.Mesh(_hbUnit(), urbMat(color));
  tower.scale.set(W - 1.4, 8, D - 1.4); tower.position.set(0, H + 4, -0.4); grp.add(tower);
  const cap = new THREE.Mesh(_hbUnit(), urbMat(0xf5f0e6));
  cap.scale.set(W - 1.0, 0.3, D - 1.0); cap.position.set(0, H + 8.1, -0.4); grp.add(cap);
  if (burger) addRoofBurger(grp, 0, H + 8.3, -0.4);
  SHOP3D.push({ o: group, name: name, food: !!burger || name === 'TAQUERÍA' }); // tienda física (food: abre menú de comida 🍔)
  return { grp };
}
/* ---------- tienda de fachada completa para MAIN ST (frente SIEMPRE a la calle) ---------- */
function addMainStShop(g, x, z, color, name, faceZ, stripe) {
  // tienda de fachada ENTRABLE: frente siempre a la calle, puerta real e interior con mercancía
  const W = 11, D = 7;
  const H = 4.6 + (Math.abs(Math.round(x * 13 + z * 7)) % 3) * 0.8; // altura variada pero determinista
  const ry = faceZ === 1 ? 0 : faceZ === -1 ? Math.PI : faceZ === 'E' ? Math.PI / 2 : -Math.PI / 2;
  const { grp } = hollowBuilding(g, x, z, {
    w: W, d: D, h: H, wallC: color, trimC: 0xf7f3ea, ry,
    interior: 'shop', floorC: 0xc9a06a, shopName: name, shopFood: false
  });
  const fz = D / 2;
  grp.add(facadeSign(W * 0.72, 0.9, paintedSignTexture(name), 0, H - 0.55, fz + 0.21, 0)); // nombre PINTADO en la fachada
  const awnM = new THREE.MeshStandardMaterial({ map: stripeTexture('#ffffff', stripe || '#ff1744'), roughness: 0.7 });
  const awn = new THREE.Mesh(urbGeo('mssh-awn', () => new THREE.BoxGeometry(1, 1, 1)), awnM);
  awn.scale.set(W * 0.92, 0.16, 1.7); awn.position.set(0, 3.15, fz + 0.85); awn.rotation.x = 0.22; grp.add(awn);
  const val = new THREE.Mesh(urbGeo('mssh-val', () => new THREE.BoxGeometry(1, 1, 1)), awnM);
  val.scale.set(W * 0.92, 0.5, 0.08); val.position.set(0, 2.82, fz + 1.62); grp.add(val);
  [-2.9, 2.9].forEach(wx => { // ventanas en los segmentos del frente
    const win = new THREE.Mesh(urbGeo('mssh-win', () => new THREE.PlaneGeometry(2.6, 2.0)),
      new THREE.MeshBasicMaterial({ map: winFrameTex() }));
    win.position.set(wx, 1.55, fz + 0.19); grp.add(win);
  });
  SHOP3D.push({ o: grp, name: name }); // tienda física comprable (botón 🛍️ por proximidad)
  return { grp };
}
/* ---------- casa ligera para las cuadras de Immokalee (8-9 mallas, mismo lenguaje visual) ---------- */
function addImmHouse(g, x, z, wallC, roofC, ry, chimney) {
  // casa ENTRABLE: paredes huecas, puerta real e interior amueblado (cama, mesa, sofá)
  // (el frente antes era +x local; hollowBuilding usa +z => se suma π/2 para conservar la orientación)
  const W = 7, D = 6, H = 3.4, Rh = 2.0;
  const { grp, wallMeshes } = hollowBuilding(g, x, z, {
    w: W, d: D, h: H, wallC, ry: (ry || 0) + Math.PI / 2,
    doorW: 1.6, interior: 'house', floorC: 0xb08a5a
  });
  // techo a dos aguas (cumbrera a lo largo de Z)
  const half = W / 2 + 0.6, ang = Math.atan2(Rh, half), slabL = Math.sqrt(half * half + Rh * Rh) + 0.2;
  const roofM = urbMat(roofC);
  [1, -1].forEach(s => {
    const slab = new THREE.Mesh(urbGeo('imh-roof', () => new THREE.BoxGeometry(1, 1, 1)), roofM);
    slab.scale.set(slabL, 0.28, D + 1.2);
    slab.position.set(s * half / 2, H + Rh / 2, 0); slab.rotation.z = -s * ang; grp.add(slab);
    CUTAWAY.push(slab); // el techo también se oculta para ver al jugador adentro
  });
  const ridge = new THREE.Mesh(urbGeo('imh-box', () => new THREE.BoxGeometry(1, 1, 1)), roofM);
  ridge.scale.set(0.45, 0.26, D + 1.2); ridge.position.set(0, H + Rh + 0.06, 0); grp.add(ridge);
  CUTAWAY.push(ridge);
  // ventanas al frente (+z local)
  const fz = D / 2 + 0.19;
  [-1.8, 1.8].forEach(wx => {
    const win = new THREE.Mesh(urbGeo('imh-win', () => new THREE.PlaneGeometry(1.8, 1.6)),
      new THREE.MeshBasicMaterial({ map: winFrameTex() }));
    win.position.set(wx, 1.8, fz); grp.add(win);
  });
  if (chimney) {
    const ch = new THREE.Mesh(urbGeo('imh-box', () => new THREE.BoxGeometry(1, 1, 1)), urbMat(0x6b4a35));
    ch.scale.set(0.8, 2.0, 0.8); ch.position.set(-1.5, H + Rh - 0.4, 1.5); grp.add(ch);
  }
  // 🧰 TRABAJOS: registro de casas pintables (jobs.js las usa vía lvl.houses)
  try {
    if (g) {
      if (!g.userData.houses) g.userData.houses = [];
      g.userData.houses.push({ walls: wallMeshes[0], wallMeshes: wallMeshes, x: x, z: z, grp: grp, paintCd: 0 });
    }
  } catch (e) {}
  return { grp };
}
/* ============================================================
   KIT DE INFRAESTRUCTURA MODERNA (estilo Brookhaven, 100% original GEAYI)
   Fachadas de vidrio, edificios limpios, paseos, farolas modernas,
   bancas, jardineras y fuente. Todo con texturas cacheadas y
   geometrías reutilizadas para no pesar en el celular.
   ============================================================ */
const _mdGlassCache = {};
function mdGlassTex(v, rx, ry) { // fachada moderna: panel claro + retícula de ventanas de vidrio
  v = v % 3; rx = rx || 1; ry = ry || 1;
  const k = v + '_' + rx + 'x' + ry;
  if (_mdGlassCache[k]) return _mdGlassCache[k];
  const pals = [
    { wall: '#eceae4', glass: ['#bfe6ff', '#5fa8dd'], mull: '#3a4048' },
    { wall: '#e3e7ea', glass: ['#c8f4ec', '#4fbfae'], mull: '#2f3a40' },
    { wall: '#efe6d8', glass: ['#cfe0f5', '#6f8fd0'], mull: '#43434c' }
  ];
  const p = pals[v];
  const t = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = p.wall; g.fillRect(0, 0, w, h);
    const cols = 4, rows = 4, cw = w / cols, ch = h / rows;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = c * cw + 7, y = r * ch + 9, ww = cw - 14, hh = ch - 22;
      const gr = g.createLinearGradient(x, y, x + ww, y + hh);
      gr.addColorStop(0, p.glass[0]); gr.addColorStop(1, p.glass[1]);
      g.fillStyle = gr; g.fillRect(x, y, ww, hh);
      g.fillStyle = 'rgba(255,255,255,0.55)'; // reflejo diagonal del vidrio
      g.beginPath(); g.moveTo(x, y + hh); g.lineTo(x + ww * 0.45, y); g.lineTo(x + ww * 0.7, y); g.lineTo(x + ww * 0.25, y + hh); g.fill();
      g.strokeStyle = p.mull; g.lineWidth = 5; g.strokeRect(x, y, ww, hh);
      g.beginPath(); g.moveTo(x + ww / 2, y); g.lineTo(x + ww / 2, y + hh); g.stroke();
    }
    g.fillStyle = 'rgba(0,0,0,0.10)'; g.fillRect(0, h - 14, w, 14); // zócalo
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
  _mdGlassCache[k] = t;
  return t;
}
const _mdTileCache = {};
function mdTileTex(rx, ry) { // loseta clara para paseos y plazas
  rx = rx || 1; ry = ry || 1;
  const k = rx + 'x' + ry;
  if (_mdTileCache[k]) return _mdTileCache[k];
  const t = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#dfe3e8'; g.fillRect(0, 0, w, h);
    const n = 4, s = w / n;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const sh = 225 + ((r + c) % 2) * 8;
      g.fillStyle = 'rgb(' + sh + ',' + (sh + 3) + ',' + (sh + 8) + ')';
      g.fillRect(c * s + 2, r * s + 2, s - 4, s - 4);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
  _mdTileCache[k] = t;
  return t;
}
function addModernBld(g, x, z, w, h, d, ry, v, name) { // edificio moderno de vidrio, sólido
  const grp = new THREE.Group(); grp.position.set(x, 0, z); grp.rotation.y = ry || 0; g.add(grp);
  const t = mdGlassTex(v, Math.max(1, Math.round(w / 7)), Math.max(1, Math.round(h / 7)));
  const side = new THREE.MeshStandardMaterial({ map: t, roughness: 0.35, metalness: 0.12 });
  const topM = urbMat(0x9aa0a8);
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [side, side, topM, topM, side, side]);
  body.position.y = h / 2; grp.add(body);
  const trim = new THREE.Mesh(urbGeo('md-trim', () => new THREE.BoxGeometry(1, 1, 1)), urbMat(0x2b2f38));
  trim.scale.set(w + 0.5, 0.45, d + 0.5); trim.position.y = h + 0.22; grp.add(trim);
  const fz = d / 2; // entrada al frente (+z local): puerta + marquesina + columnas
  const door = new THREE.Mesh(urbGeo('md-door', () => new THREE.PlaneGeometry(3.2, 3.2)),
    new THREE.MeshBasicMaterial({ color: 0x18242f }));
  door.position.set(0, 1.6, fz + 0.03); grp.add(door);
  const cano = new THREE.Mesh(urbGeo('md-cano', () => new THREE.BoxGeometry(1, 1, 1)), urbMat(0x2b2f38));
  cano.scale.set(5.4, 0.22, 1.8); cano.position.set(0, 3.6, fz + 0.9); grp.add(cano);
  [-2.4, 2.4].forEach(cx => {
    const col = new THREE.Mesh(urbGeo('md-col', () => new THREE.CylinderGeometry(0.12, 0.12, 3.5, 8)), urbMat(0xd8dce2));
    col.position.set(cx, 1.75, fz + 1.6); grp.add(col);
  });
  if (name) grp.add(facadeSign(Math.min(w * 0.7, 9), 1.05, paintedSignTexture(name), 0, h - 1.3, fz + 0.06, 0));
  return grp;
}
function addPlazaSlab(g, cx, cz, w, d) { // losa de paseo/plaza con losetas claras
  const t = mdTileTex(Math.max(1, Math.round(w / 4)), Math.max(1, Math.round(d / 4)));
  const s = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, d),
    new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }));
  s.position.set(cx, 0.03, cz); s.receiveShadow = true; g.add(s);
  return s;
}
function addModernLamp(g, x, z, armDir) { // farola moderna y delgada con halo cálido
  const m = urbMat(0x30343e);
  const base = new THREE.Mesh(urbGeo('mdlb-base', () => new THREE.CylinderGeometry(0.2, 0.26, 0.4, 8)), m);
  base.position.set(x, 0.2, z); g.add(base);
  const pole = new THREE.Mesh(urbGeo('mdlb-pole', () => new THREE.CylinderGeometry(0.08, 0.11, 5.2, 8)), m);
  pole.position.set(x, 2.8, z); g.add(pole);
  const dx = armDir === 'E' ? 1 : armDir === 'W' ? -1 : 0;
  const dz = armDir === 'S' ? 1 : armDir === 'N' ? -1 : 0;
  const arm = new THREE.Mesh(urbGeo('mdlb-arm', () => new THREE.BoxGeometry(1.2, 0.09, 0.09)), m);
  arm.position.set(x + dx * 0.55, 5.35, z + dz * 0.55);
  if (dz !== 0) arm.rotation.y = Math.PI / 2;
  g.add(arm);
  const hx = x + dx * 1.05, hz = z + dz * 1.05;
  const head = new THREE.Mesh(urbGeo('mdlb-head', () => new THREE.BoxGeometry(0.62, 0.14, 0.3)), m);
  head.position.set(hx, 5.32, hz); if (dz !== 0) head.rotation.y = Math.PI / 2; g.add(head);
  const panel = new THREE.Mesh(urbGeo('mdlb-panel', () => new THREE.BoxGeometry(0.5, 0.05, 0.2)), urbBasic(0xfff2c4));
  panel.position.set(hx, 5.24, hz); if (dz !== 0) panel.rotation.y = Math.PI / 2; g.add(panel);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: softTex, color: 0xffe9a8, transparent: true, opacity: 0.2,
    depthWrite: false, blending: THREE.AdditiveBlending
  }));
  halo.scale.set(1.6, 1.6, 1); halo.position.set(hx, 5.2, hz); g.add(halo);
}
function addBench(g, x, z, ry) { // banca moderna: listones de madera + estructura oscura
  const grp = new THREE.Group(); grp.position.set(x, 0, z); grp.rotation.y = ry || 0; g.add(grp);
  const frameM = urbMat(0x2b2f38), woodM = urbMat(0xb07a45);
  [-0.8, 0.8].forEach(sx => {
    const leg = new THREE.Mesh(urbGeo('mdb-leg', () => new THREE.BoxGeometry(0.12, 0.45, 0.5)), frameM);
    leg.position.set(sx, 0.225, 0); grp.add(leg);
    const back = new THREE.Mesh(urbGeo('mdb-back', () => new THREE.BoxGeometry(0.12, 0.55, 0.1)), frameM);
    back.position.set(sx, 0.7, -0.24); back.rotation.x = -0.15; grp.add(back);
  });
  [-0.14, 0, 0.14].forEach(sz => {
    const slat = new THREE.Mesh(urbGeo('mdb-slat', () => new THREE.BoxGeometry(1.9, 0.06, 0.12)), woodM);
    slat.position.set(0, 0.48, sz); grp.add(slat);
  });
  [0.62, 0.86].forEach(sy => {
    const bs = new THREE.Mesh(urbGeo('mdb-bslat', () => new THREE.BoxGeometry(1.9, 0.12, 0.05)), woodM);
    bs.position.set(0, sy, -0.27 - (sy - 0.62) * 0.15); bs.rotation.x = -0.15; grp.add(bs);
  });
  return grp;
}
function addPlanter(g, x, z) { // jardinera cuadrada de concreto con arbusto
  const box = new THREE.Mesh(urbGeo('mdp-box', () => new THREE.BoxGeometry(1.3, 0.7, 1.3)), urbMat(0xcfd4da));
  box.position.set(x, 0.35, z); g.add(box);
  const bush = new THREE.Mesh(urbGeo('mdp-bush', () => new THREE.SphereGeometry(0.62, 9, 7)),
    urbMat(0x2e9e4f));
  bush.position.set(x, 1.05, z); bush.scale.y = 0.85; g.add(bush);
  const bush2 = new THREE.Mesh(urbGeo('mdp-bush'), urbMat(0x37b95c));
  bush2.position.set(x + 0.25, 0.85, z - 0.15); bush2.scale.setScalar(0.55); g.add(bush2);
}
function addFountain(g, x, z) { // fuente redonda con chorro
  const stone = urbMat(0xd5d9de);
  const basin = new THREE.Mesh(urbGeo('mdf-basin', () => new THREE.CylinderGeometry(2.4, 2.55, 0.8, 18)), stone);
  basin.position.set(x, 0.4, z); g.add(basin);
  const water = new THREE.Mesh(urbGeo('mdf-water', () => new THREE.CircleGeometry(2.05, 18)),
    new THREE.MeshStandardMaterial({ color: 0x35b6ff, roughness: 0.15, metalness: 0.3, emissive: 0x0a4a6e, emissiveIntensity: 0.35 }));
  water.rotation.x = -Math.PI / 2; water.position.set(x, 0.78, z); g.add(water);
  const col = new THREE.Mesh(urbGeo('mdf-col', () => new THREE.CylinderGeometry(0.28, 0.4, 1.5, 10)), stone);
  col.position.set(x, 1.2, z); g.add(col);
  const bowl = new THREE.Mesh(urbGeo('mdf-bowl', () => new THREE.CylinderGeometry(0.85, 0.5, 0.35, 12)), stone);
  bowl.position.set(x, 2.05, z); g.add(bowl);
  const jet = new THREE.Mesh(urbGeo('mdf-jet', () => new THREE.ConeGeometry(0.32, 1.4, 8)),
    new THREE.MeshBasicMaterial({ color: 0xd8f4ff, transparent: true, opacity: 0.75 }));
  jet.position.set(x, 2.9, z); g.add(jet);
}
/* ---------- letrero de la TORRE GEAYI (diseño original) ---------- */
function torreTexture() {
  return canvasTex(512, 160, (c, w, h) => {
    c.fillStyle = '#0b1e3a'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#ffd23f'; c.lineWidth = 10; c.strokeRect(8, 8, w - 16, h - 16);
    c.fillStyle = '#ffd23f'; c.textAlign = 'center';
    c.font = '900 62px "Trebuchet MS", sans-serif';
    c.fillText('TORRE GEAYI', w / 2, 74);
    c.fillStyle = '#7df9ff'; c.font = '700 34px "Trebuchet MS", sans-serif';
    c.fillText('★ MIRADOR ★', w / 2, 124);
  });
}
/* ---------- TORRE GEAYI: edificio-torre escalable ----------
   Edificio de 20 m en el centro, OPCIONAL (no bloquea la ruta):
   - galería de escaleras "interiores" por tramos en la cara sur (0 → 7.2 m)
   - plataformas en ZIGZAG por fuera, brincando de un lado a otro (7.2 → 20 m)
   - mirador arriba con barandal, letrero, monedas y checkpoint
   Dificultad media: plataformas anchas (3.4 m), saltos de 1.5 m (el salto da 2.4 m).
   Si caes, caes a una plataforma inferior o al suelo: nunca al vacío. */
function buildTorreGeayi(lvl) {
  const g = lvl.group, TX = 46, TZ = 38; // centro de la torre (centro de Immokalee)
  // cuerpo del edificio (sólido): 12 x 20 x 12
  addPlatform(lvl, TX, 20, TZ, 12, 12, { h: 20, color: 0x00b8d4, emissive: 0x06333d });
  // fachada de ventanas (4 paneles, 1 por cara)
  const winTex = windowsTexture();
  const facM = new THREE.MeshStandardMaterial({ map: winTex, roughness: 0.55, metalness: 0.1 });
  const facG = urbGeo('tg-fac', () => new THREE.BoxGeometry(1, 1, 1));
  [[0, 6.06, 11.6, 0.18], [0, -6.06, 11.6, 0.18], [6.06, 0, 0.18, 11.6], [-6.06, 0, 0.18, 11.6]].forEach(([ox, oz, sx, sz]) => {
    const p = new THREE.Mesh(facG, facM);
    p.scale.set(sx, 18, sz); p.position.set(TX + ox, 10, TZ + oz); g.add(p);
  });
  // cornisa del techo
  const cor = new THREE.Mesh(urbGeo('tg-cor', () => new THREE.BoxGeometry(1, 1, 1)), urbMat(0xffd23f));
  cor.scale.set(12.7, 0.5, 12.7); cor.position.set(TX, 20.1, TZ); g.add(cor);

  /* ---- galería de escaleras por tramos (cara sur, z≈47): 0 → 7.2 m ---- */
  const SZ = 47.1, SW = 2.6;
  for (let i = 0; i < 8; i++) // tramo A: sube hacia el este (0 → 3.6)
    addPlatform(lvl, 38.75 + i * 1.5, 0.45 * (i + 1), SZ, 1.5, SW, { color: 0xffd23f, emissive: 0x4a2e00 });
  addPlatform(lvl, 51.75, 3.6, SZ, 2.6, SW, { color: 0xffd23f, emissive: 0x4a2e00 }); // descanso intermedio
  for (let i = 0; i < 8; i++) // tramo B: sube hacia el oeste (3.6 → 7.2)
    addPlatform(lvl, 50.25 - i * 1.5, 3.6 + 0.45 * (i + 1), SZ, 1.5, SW, { color: 0xffd23f, emissive: 0x4a2e00 });
  addPlatform(lvl, 37.2, 7.2, SZ, 3.4, SW, { color: 0xffd23f, emissive: 0x4a2e00 }); // descanso alto (salida al zigzag)
  // muro sur + techo de la galería (sensación de escalera interior)
  const wallM = urbMat(0x0b5e78);
  const wallS = new THREE.Mesh(urbGeo('tg-wall', () => new THREE.BoxGeometry(1, 1, 1)), wallM);
  wallS.scale.set(18.7, 9.2, 0.4); wallS.position.set(44.85, 4.6, 48.7); g.add(wallS);
  const roof = new THREE.Mesh(urbGeo('tg-roof', () => new THREE.BoxGeometry(1, 1, 1)), urbMat(0xff8c1a));
  roof.scale.set(19.4, 0.4, 4.4); roof.position.set(44.85, 9.35, SZ); g.add(roof);
  // letrero de entrada en el muro sur
  g.add(doubleFaceSign(6, 1.7, torreTexture(), 38.5, 3.1, 48.95, 0));

  /* ---- zigzag exterior: plataformas alternando de lado (7.2 → 20 m) ---- */
  const zig = [
    [36.5, 8.7, 43], [32.5, 10.2, 41], [36.5, 11.7, 39], [32.5, 13.2, 37],
    [36.5, 14.7, 35], [33.5, 16.2, 32.5], [37.5, 17.7, 30.5], [42, 19.2, 30]
  ];
  const zigM = { color: 0xff8c1a, emissive: 0x5a2a00 };
  zig.forEach(([px, py, pz], i) => {
    addPlatform(lvl, px, py, pz, 3.4, 3.4, zigM);
    addCoin(lvl, px, py + 1.3, pz);
    if (i < 3) { // barandal en los tramos fáciles (borde exterior oeste)
      const rail = new THREE.Mesh(urbGeo('tg-rail', () => new THREE.BoxGeometry(1, 1, 1)), urbMat(0xffd23f));
      rail.scale.set(0.25, 1.1, 3.4); rail.position.set(px - 1.7, py + 0.55, pz); g.add(rail);
    }
  });
  addCheckpoint(lvl, 37.2, 7.2, SZ); // descanso alto: si caes arriba, reapareces aquí

  /* ---- mirador en el techo (y=20) ---- */
  const railM = urbMat(0xffd23f), railG = urbGeo('tg-mrail', () => new THREE.BoxGeometry(1, 1, 1));
  const mkRail = (rx, rz, sx, sz) => {
    const r = new THREE.Mesh(railG, railM);
    r.scale.set(sx, 1.1, sz); r.position.set(rx, 20.55, rz); g.add(r);
  };
  mkRail(47.85, 32.3, 7.7, 0.3); // norte (con hueco de llegada en x∈[40.3,44])
  mkRail(TX, 43.7, 12, 0.3);     // sur
  mkRail(51.7, TZ, 0.3, 12);      // este
  mkRail(40.3, TZ, 0.3, 12);      // oeste
  // letrero del mirador en un poste
  const pole = new THREE.Mesh(urbGeo('tg-pole', () => new THREE.CylinderGeometry(0.12, 0.12, 3.4, 8)), urbMat(0x8a8f9a));
  pole.position.set(49, 21.7, 41); g.add(pole);
  g.add(doubleFaceSign(8, 2.2, torreTexture(), 49, 23.2, 41, 0));
  for (let i = 0; i < 8; i++) { // anillo de monedas en el mirador
    const a = i / 8 * Math.PI * 2;
    addCoin(lvl, TX + Math.cos(a) * 3.4, 21.4, TZ + Math.sin(a) * 3.4);
  }
  addCheckpoint(lvl, TX, 20, TZ); // checkpoint del mirador
}
function addRoofBurger(group, x, y, z) { // hamburguesa 3D de bloques en el techo
  const bunM = new THREE.MeshStandardMaterial({ color: 0xe0a75e, roughness: 0.7 });
  const bottom = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.7, 0.4, 12), bunM);
  bottom.position.set(x, y + 0.2, z); group.add(bottom);
  const patty = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.35, 12),
    new THREE.MeshStandardMaterial({ color: 0x6b3f1d, roughness: 0.8 }));
  patty.position.set(x, y + 0.58, z); group.add(patty);
  const lettuce = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.02, 0.14, 12),
    new THREE.MeshStandardMaterial({ color: 0x35c759, roughness: 0.8 }));
  lettuce.position.set(x, y + 0.82, z); group.add(lettuce);
  const cheese = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.08, 1.35),
    new THREE.MeshStandardMaterial({ color: 0xffd23f, roughness: 0.6 }));
  cheese.position.set(x, y + 0.93, z); cheese.rotation.y = Math.PI / 4; group.add(cheese);
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.95, 14, 10), bunM);
  top.scale.y = 0.62; top.position.set(x, y + 1.25, z); group.add(top);
}
function addRoofShirt(group, x, y, z) { // playera 3D de bloques en el techo (tienda GEAYI16)
  const m = new THREE.MeshStandardMaterial({ color: 0x22d3ee, roughness: 0.7 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.9, 0.5), m);
  torso.position.set(x, y + 0.95, z); group.add(torso);
  const sl = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 0.5), m);
  sl.position.set(x - 1.15, y + 1.35, z); sl.rotation.z = 0.35; group.add(sl);
  const sr = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 0.5), m);
  sr.position.set(x + 1.15, y + 1.35, z); sr.rotation.z = -0.35; group.add(sr);
}
function addRoofCrepe(group, x, y, z) { // crepa 3D de bloques en el techo (GEAYI 16 CREPES)
  const m = new THREE.MeshStandardMaterial({ color: 0xf0c987, roughness: 0.75 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.16, 18), m);
  base.position.set(x, y + 0.1, z); group.add(base);
  const fold = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.16, 12, 1, false, 0, Math.PI), m);
  fold.position.set(x + 0.15, y + 0.26, z); fold.rotation.y = 0.5; group.add(fold);
  const berry = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xd81b60, roughness: 0.5 }));
  berry.position.set(x - 0.3, y + 0.42, z + 0.25); group.add(berry);
}
function addRoofBroom(group, x, y, z) { // 🧹 escoba 3D de bloques en el techo (ABIS CLEAN)
  const stickM = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.8 });
  const stick = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.4, 0.18), stickM);
  stick.position.set(x, y + 1.9, z); stick.rotation.z = 0.18; group.add(stick);
  const bristleM = new THREE.MeshStandardMaterial({ color: 0xd9a441, roughness: 0.9 });
  const bristle = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.1, 0.35), bristleM);
  bristle.position.set(x - 0.32, y + 0.6, z); bristle.rotation.z = 0.18; group.add(bristle);
}
function addFoodTrailer(group, x, z) { // 🚚 traila de comida "LOS HERMANOS TAMPS" (decoración, ventana da a la pista)
  const t = new THREE.Group();
  const redM = new THREE.MeshStandardMaterial({ color: 0xee1a1a, roughness: 0.6 });
  const creamM = new THREE.MeshStandardMaterial({ color: 0xf5f0e6, roughness: 0.7 });
  const darkM = new THREE.MeshStandardMaterial({ color: 0x222226, roughness: 0.9 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.4, 3, 7.5), redM);
  body.position.y = 2; t.add(body); // carrocería
  const roof = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.25, 7.7), creamM);
  roof.position.y = 3.62; t.add(roof); // techo
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.35, 7.6), darkM);
  skirt.position.y = 0.55; t.add(skirt); // faldón
  const wheelG = new THREE.CylinderGeometry(0.55, 0.55, 0.4, 14);
  [[-1.85, -2.2], [1.85, -2.2], [-1.85, 2.2], [1.85, 2.2]].forEach(([wx, wz]) => {
    const wh = new THREE.Mesh(wheelG, darkM);
    wh.rotation.z = Math.PI / 2; wh.position.set(wx, 0.55, wz); t.add(wh);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.44, 10), creamM);
    hub.rotation.z = Math.PI / 2; hub.position.set(wx, 0.55, wz); t.add(hub);
  });
  const win = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.4, 3.6),
    new THREE.MeshStandardMaterial({ color: 0x1c1c22, roughness: 0.4 }));
  win.position.set(1.72, 2.3, 0); t.add(win); // ventana de servicio (lado +x = a la pista)
  const counter = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.14, 3.8),
    new THREE.MeshStandardMaterial({ color: 0x7a5230, roughness: 0.8 }));
  counter.position.set(2.05, 1.55, 0); t.add(counter); // mostrador
  const awn = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.18, 4.2),
    new THREE.MeshStandardMaterial({ map: stripeTexture('#ffffff', '#d62828'), roughness: 0.7 }));
  awn.position.set(2.2, 3.15, 0); awn.rotation.z = -0.16; t.add(awn); // toldo
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.2, 1.1), creamM);
  door.position.set(0, 1.9, 3.78); t.add(door); // puerta trasera
  const hitch = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 2.4), darkM);
  hitch.position.set(0, 0.75, -4.6); t.add(hitch); // lanza delantera
  const jack = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.9, 8), darkM);
  jack.position.set(0, 0.45, -5.4); t.add(jack);
  const bulbM = new THREE.MeshBasicMaterial({ color: 0xffe95e });
  for (let i = 0; i < 6; i++) { // foquitos del toldo
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), bulbM);
    b.position.set(2.62, 2.88, -1.9 + i * 0.76); t.add(b);
  }
  // letrero grande del techo con el nombre (🔁 fácil de cambiar por el logo: ver trailerSignTexture)
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.7, 6.4), darkM);
  board.position.set(0, 5.2, 0); t.add(board);
  [-0.28, 0.28].forEach(px => {
    [-2.4, 2.4].forEach(pz => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.1, 0.18), darkM);
      post.position.set(px, 4.25, pz); t.add(post);
    });
  });
  const faceG = new THREE.PlaneGeometry(6.0, 1.5);
  const signMats = [new THREE.MeshBasicMaterial({ map: trailerSignTexture() }),
                    new THREE.MeshBasicMaterial({ map: trailerSignTexture() })];
  const f1 = new THREE.Mesh(faceG, signMats[0]);
  f1.position.set(0.14, 5.2, 0); f1.rotation.y = Math.PI / 2; t.add(f1); // cara a la pista
  const f2 = new THREE.Mesh(faceG, signMats[1]);
  f2.position.set(-0.14, 5.2, 0); f2.rotation.y = -Math.PI / 2; t.add(f2);
  applyLogoTexture('img/logo-tamps-burger.png', signMats); // logo real; si no carga, queda el texto
  t.position.set(x, 0, z);
  group.add(t);
  return t;
}
function addWaterTower(group, x, z) { // torre de agua del pueblo (diseño original)
  const t = new THREE.Group();
  const legM = urbMat(0x8a8f9a);
  [[-2.5, -2.5], [2.5, -2.5], [-2.5, 2.5], [2.5, 2.5]].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 9, 8), legM);
    leg.position.set(lx, 4.5, lz); t.add(leg);
  });
  const bandM = urbMat(0x6b7078);
  [2.5, 6.5].forEach(by => {
    const band = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.3, 5.6), bandM);
    band.position.y = by; t.add(band);
  });
  const tankTex = canvasTex(512, 256, (c, w, h) => {
    c.fillStyle = '#e8f4fa'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#0d47a1'; c.textAlign = 'center';
    c.font = '900 72px "Trebuchet MS", sans-serif';
    c.fillText('IMMOKALEE', w / 2, 150);
  });
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 4.5, 18),
    new THREE.MeshStandardMaterial({ map: tankTex, roughness: 0.6 }));
  tank.position.y = 11; t.add(tank);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.6, 1.8, 18), urbMat(0xd23c3c));
  roof.position.y = 14.1; t.add(roof);
  t.position.set(x, 0, z);
  group.add(t);
  return t;
}
function addTomatoPlanter(group, x, z) { // 🍅 jardinera de tomates (diseño original)
  const t = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.8, 1.4), urbMat(0x8a5a33));
  box.position.y = 0.4; t.add(box);
  const soil = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.15, 1.2), urbMat(0x4a2f1a));
  soil.position.y = 0.85; t.add(soil);
  const leafM = urbMat(0x2e7d32), tomM = urbBasic(0xe53935);
  for (let i = 0; i < 4; i++) {
    const px = -1.2 + i * 0.8;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.9, 6), leafM);
    stem.position.set(px, 1.3, 0); t.add(stem);
    const bush = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), leafM);
    bush.position.set(px, 1.8, 0); t.add(bush);
    const tom = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), tomM);
    tom.position.set(px + 0.15, 1.65, 0.15); t.add(tom);
  }
  t.position.set(x, 0, z);
  group.add(t);
  return t;
}
function addTacoCart(group, x, z) { // 🌮 carreta de tacos (decoración, junto a las hamburgueserías)
  const t = new THREE.Group();
  const steelM = new THREE.MeshStandardMaterial({ color: 0xdfe3e6, roughness: 0.4, metalness: 0.3 });
  const redM = new THREE.MeshStandardMaterial({ color: 0xc62828, roughness: 0.6 });
  const darkM = new THREE.MeshStandardMaterial({ color: 0x222226, roughness: 0.9 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.5, 2.6), steelM);
  body.position.y = 1.35; t.add(body); // cuerpo de la carreta
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.35, 2.66), redM);
  stripe.position.y = 1.85; t.add(stripe); // franja roja
  const win = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.7, 1.8), darkM);
  win.position.set(-0.92, 1.5, 0); t.add(win); // ventanita de servicio (da a la pista)
  const counter = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.14, 2.8), darkM);
  counter.position.y = 2.17; t.add(counter); // mostrador
  const grill = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.1, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x111114, roughness: 0.5 }));
  grill.position.set(0, 2.28, -0.5); t.add(grill); // plancha
  const wheelG = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 12);
  [[-1.0, -0.8], [1.0, -0.8], [-1.0, 0.8], [1.0, 0.8]].forEach(([wx, wz]) => {
    const wh = new THREE.Mesh(wheelG, darkM);
    wh.rotation.z = Math.PI / 2; wh.position.set(wx, 0.35, wz); t.add(wh);
  });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.6, 8), darkM);
  pole.position.y = 3.4; t.add(pole); // palo de la sombrilla
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.9, 0.9, 12),
    new THREE.MeshStandardMaterial({ map: stripeTexture('#ffe95e', '#c62828'), roughness: 0.7 }));
  canopy.position.y = 4.85; t.add(canopy); // sombrilla a rayas
  // letrero "TACOS" (se reemplaza por el logo real si carga)
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.0, 2.3), redM);
  board.position.set(0, 3.9, 0); t.add(board);
  const signMats = [new THREE.MeshBasicMaterial({ map: tacoSignTexture() }),
                    new THREE.MeshBasicMaterial({ map: tacoSignTexture() })];
  const faceG = new THREE.PlaneGeometry(2.1, 0.9);
  const s1 = new THREE.Mesh(faceG, signMats[0]);
  s1.position.set(-0.1, 3.9, 0); s1.rotation.y = -Math.PI / 2; t.add(s1); // cara a la pista
  const s2 = new THREE.Mesh(faceG, signMats[1]);
  s2.position.set(0.1, 3.9, 0); s2.rotation.y = Math.PI / 2; t.add(s2);
  applyLogoTexture('img/logo-tamps-tacos.png', signMats); // logo real; si no carga, queda el texto
  t.position.set(x, 0, z);
  group.add(t);
  return t;
}
function paleteriaSignTexture() { // letrero "DELICIAS MICHOACANAS" (dos líneas)
  return canvasTex(512, 160, (g, w, h) => {
    g.fillStyle = '#ff5fa2'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#ffffff'; g.lineWidth = 8; g.strokeRect(6, 6, w - 12, h - 12);
    g.textAlign = 'center';
    g.fillStyle = '#ffffff'; g.font = '900 62px "Trebuchet MS", sans-serif';
    g.fillText('DELICIAS', w / 2, 64);
    g.font = '900 52px "Trebuchet MS", sans-serif';
    g.fillText('MICHOACANAS', w / 2, 128);
  });
}
function addPaletaOnRoof(group, x, y, z) { // paleta gigante decorativa en el techo
  const p = new THREE.Group();
  const stick = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.4, 0.3),
    new THREE.MeshStandardMaterial({ color: 0xc89b6a, roughness: 0.85 }));
  stick.position.y = 0.7; p.add(stick);
  const b1 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.6, 0.9),
    new THREE.MeshStandardMaterial({ color: 0xff3b5c, roughness: 0.5 }));
  b1.position.y = 2.2; p.add(b1);
  const b2 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.2, 0.9),
    new THREE.MeshStandardMaterial({ color: 0xfff3f8, roughness: 0.5 }));
  b2.position.y = 3.6; p.add(b2);
  p.rotation.z = 0.09;
  p.position.set(x, y, z);
  group.add(p);
}
function addPaleteria(group, x, z) { // 🍦 paletería "DELICIAS MICHOACANAS" (decoración)
  const s = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(6, 14, 6),
    new THREE.MeshStandardMaterial({ color: 0xff9ecf, roughness: 0.85 }));
  body.position.y = -6; s.add(body);
  const band = new THREE.Mesh(new THREE.BoxGeometry(6.4, 3, 6.4),
    new THREE.MeshStandardMaterial({ color: 0xf5f0e6, roughness: 0.8 }));
  band.position.y = 1; s.add(band);
  const awn = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.25, 6.2),
    new THREE.MeshStandardMaterial({ map: stripeTexture('#ffffff', '#ff5fa2'), roughness: 0.7 }));
  awn.position.set(-3.9, 2.9, 0); awn.rotation.z = -0.18; s.add(awn);
  const pval = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.55, 6.2), // cenefa colgante del toldo
    new THREE.MeshStandardMaterial({ map: stripeTexture('#ffffff', '#ff5fa2'), roughness: 0.7 }));
  pval.position.set(-4.78, 2.48, 0); s.add(pval);
  s.add(doubleFaceSign(5.2, 1.6, paleteriaSignTexture(), -3.25, 4.7, 0, -Math.PI / 2));
  const win = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.6, 4),
    new THREE.MeshStandardMaterial({ color: 0x9fd8ff, roughness: 0.3, metalness: 0.4 }));
  win.position.set(-3.3, 0.6, 0); s.add(win);
  const vitrina = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.9, 4.4),
    new THREE.MeshStandardMaterial({ map: stripeTexture('#ff5fa2', '#7fd8ff'), roughness: 0.6 }));
  vitrina.position.set(-3.3, -0.6, 0); s.add(vitrina); // vitrina de paletas
  s.position.set(x, 0, z);
  group.add(s);
  addPaletaOnRoof(group, x, 2.5, z); // la banda termina en y=2.5
  return s;
}

/* ---------- decoración por tema ---------- */
/* ============================================================
   🌍 MUNDOS DE PAÍSES — decoraciones típicas de cada país
   ============================================================ */
function steppedPyramid(g, x, baseY, z, levels, base, stepH, color) { // pirámide escalonada (Copán / Chichén Itzá)
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
  for (let i = 0; i < levels; i++) {
    const s = base * (1 - (i / levels) * 0.72);
    const st = new THREE.Mesh(new THREE.BoxGeometry(s, stepH, s), m);
    st.position.set(x, baseY + stepH / 2 + i * stepH, z);
    g.add(st);
  }
  const topY = baseY + levels * stepH;
  const topS = base * (1 - ((levels - 1) / levels) * 0.72);
  const temple = new THREE.Mesh(new THREE.BoxGeometry(topS * 0.55, stepH * 1.6, topS * 0.55), m);
  temple.position.set(x, topY + stepH * 0.8, z); g.add(temple);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(topS * 0.45, stepH * 1.2, 4), m);
  roof.position.set(x, topY + stepH * 2.2, z); roof.rotation.y = Math.PI / 4; g.add(roof);
  const stairM = new THREE.MeshStandardMaterial({ color: 0xd7ccc8, roughness: 0.9 });
  for (let i = 0; i < levels; i++) { // escalinata central
    const s = base * (1 - (i / levels) * 0.72);
    const st = new THREE.Mesh(new THREE.BoxGeometry(1.6, stepH * 0.9, 0.8), stairM);
    st.position.set(x, baseY + stepH / 2 + i * stepH, z + s / 2 + 0.1);
    g.add(st);
  }
  return topY;
}
function makeJungleTree(g, x, z, s) { // árbol de selva
  const base = 0;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.45 * s, 0.65 * s, 6 * s, 7),
    new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.9 }));
  trunk.position.set(x, base + 3 * s, z); g.add(trunk);
  const leafM = new THREE.MeshStandardMaterial({ color: 0x1f7a38, roughness: 0.85 });
  [[0, 6.6, 0, 3.2], [1.6, 5.8, 0.8, 2.2], [-1.5, 6.0, -0.7, 2.4]].forEach(([ox, oy, oz, bs]) => {
    const c = new THREE.Mesh(new THREE.BoxGeometry(bs * s, bs * 0.7 * s, bs * s), leafM);
    c.position.set(x + ox * s, base + oy * s, z + oz * s); g.add(c);
  });
}
function makeCactus(g, x, z, s) { // cactus 🌵
  const m = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.85 });
  const base = 0;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.5 * s, 0.55 * s, 4 * s, 8), m);
  body.position.set(x, base + 2 * s, z); g.add(body);
  const armH = new THREE.Mesh(new THREE.CylinderGeometry(0.32 * s, 0.32 * s, 1.4 * s, 8), m);
  armH.rotation.z = Math.PI / 2; armH.position.set(x + 0.9 * s, base + 2.2 * s, z); g.add(armH);
  const armV = new THREE.Mesh(new THREE.CylinderGeometry(0.32 * s, 0.32 * s, 1.4 * s, 8), m);
  armV.position.set(x + 1.5 * s, base + 2.9 * s, z); g.add(armV);
}
function makeSombrero(g, x, z) { // sombrero mexicano gigante
  const base = 0;
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 0.25, 18),
    new THREE.MeshStandardMaterial({ color: 0xf2c14e, roughness: 0.8 }));
  brim.position.set(x, base + 0.4, z); g.add(brim);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.5, 14, 8, 0, TAU, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xd32f2f, roughness: 0.8 }));
  dome.position.set(x, base + 0.5, z); g.add(dome);
  const trim = new THREE.Mesh(new THREE.TorusGeometry(3.0, 0.12, 8, 24),
    new THREE.MeshBasicMaterial({ color: 0x2e7d32 }));
  trim.rotation.x = Math.PI / 2; trim.position.set(x, base + 0.55, z); g.add(trim);
}
function papelPicadoRow(g, z, colors) { // banderines colgados sobre la pista (papel picado / bunting)
  const rope = new THREE.Mesh(new THREE.BoxGeometry(17, 0.08, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.9 }));
  rope.position.set(0, 7.2, z); g.add(rope);
  for (let i = 0; i < 12; i++) {
    const t = i / 11;
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.0, 0.06),
      new THREE.MeshStandardMaterial({ color: colors[i % colors.length], roughness: 0.8, side: THREE.DoubleSide }));
    p.position.set(-8 + t * 16, 6.9 - Math.sin(t * Math.PI) * 0.5, z);
    g.add(p);
  }
}
function makeUmbrella(g, x, z, groundY) { // sombrilla de playa
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.6, 8),
    new THREE.MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.6 }));
  pole.position.set(x, groundY + 1.3, z); g.add(pole);
  const top = new THREE.Mesh(new THREE.ConeGeometry(1.8, 0.9, 10),
    new THREE.MeshStandardMaterial({ map: stripeTexture('#ff3d5e', '#ffffff'), roughness: 0.7 }));
  top.position.set(x, groundY + 2.9, z); g.add(top);
}
function makeLiberty(g, x, z) { // 🗽 Estatua de la Libertad de bloques
  const copper = new THREE.MeshStandardMaterial({ color: 0x6fae9f, roughness: 0.7 });
  const stone = new THREE.MeshStandardMaterial({ color: 0x9a9a9a, roughness: 0.9 });
  const base = 0;
  const ped = new THREE.Mesh(new THREE.BoxGeometry(5, 4, 5), stone);
  ped.position.set(x, base + 2, z); g.add(ped);
  const y0 = base + 4;
  const robe = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 2.0, 7, 10), copper);
  robe.position.set(x, y0 + 3.5, z); g.add(robe);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.95, 12, 10), copper);
  head.position.set(x, y0 + 7.9, z); g.add(head);
  for (let i = 0; i < 5; i++) { // corona con picos
    const a = (i / 5) * TAU;
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.9, 6), copper);
    spike.position.set(x + Math.cos(a) * 0.95, y0 + 8.7, z + Math.sin(a) * 0.95);
    spike.rotation.z = -Math.cos(a) * 0.5; spike.rotation.x = Math.sin(a) * 0.5;
    g.add(spike);
  }
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.6, 4.5, 0.6), copper); // brazo con antorcha
  arm.position.set(x + 1.9, y0 + 8.6, z); arm.rotation.z = -0.5; g.add(arm);
  const torch = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.22, 1.2, 8),
    new THREE.MeshStandardMaterial({ color: 0x8a6a3a, roughness: 0.7 }));
  torch.position.set(x + 3.0, y0 + 10.6, z); g.add(torch);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.4, 8),
    new THREE.MeshBasicMaterial({ color: 0xffb300 }));
  flame.position.set(x + 3.0, y0 + 11.9, z); g.add(flame);
  const flame2 = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.9, 8),
    new THREE.MeshBasicMaterial({ color: 0xffe95e }));
  flame2.position.set(x + 3.0, y0 + 11.8, z); g.add(flame2);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.6, 3.4, 0.6), copper); // brazo con tabla
  armL.position.set(x - 1.6, y0 + 6.2, z); armL.rotation.z = 0.35; g.add(armL);
  const tablet = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.5, 0.25), stone);
  tablet.position.set(x - 2.3, y0 + 6.4, z); g.add(tablet);
}
function windowsTexture() { // ventanas encendidas para rascacielos
  return canvasTex(128, 256, (g, w, h) => {
    g.fillStyle = '#2b3a55'; g.fillRect(0, 0, w, h);
    for (let y = 12; y < h - 8; y += 24) for (let x = 10; x < w - 8; x += 22) {
      g.fillStyle = Math.random() < 0.6 ? '#ffe95e' : '#0d1626';
      g.fillRect(x, y, 12, 14);
    }
  });
}
function makeSpire(g, x, z, h) { // torre estilo Sagrada Familia
  const base = 0;
  const stone = new THREE.MeshStandardMaterial({ color: 0xe0c9a6, roughness: 0.85 });
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.3, h, 10), stone);
  tower.position.set(x, base + h / 2, z); g.add(tower);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(1.15, 3.2, 10),
    new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.7 }));
  tip.position.set(x, base + h + 1.6, z); g.add(tip);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xffd23f, roughness: 0.4 }));
  ball.position.set(x, base + h + 3.4, z); g.add(ball);
  const winM = new THREE.MeshBasicMaterial({ color: 0x5d4037 });
  for (let wy = 3; wy < h; wy += 4) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.9, 0.2), winM);
    w.position.set(x, base + wy, z + 1.25); g.add(w);
  }
}
function makeFan(g, x, z) { // abanico flamenco decorativo
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.4, 8),
    new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.9 }));
  pole.position.set(x, 1.2, z); g.add(pole);
  const fan = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.15, 12, 1, false, 0, Math.PI),
    new THREE.MeshStandardMaterial({ color: 0xd32f2f, roughness: 0.7, side: THREE.DoubleSide }));
  fan.rotation.x = Math.PI / 2; fan.rotation.z = Math.PI / 2;
  fan.position.set(x, 2.9, z); g.add(fan);
}
function tileTexture() { // baldosas rojo/crema de plaza española
  const t = canvasTex(128, 128, (g, w, h) => {
    const n = 4, s = w / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      g.fillStyle = (i + j) % 2 ? '#c0392b' : '#f5f0e6';
      g.fillRect(i * s, j * s, s, s);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 6);
  return t;
}
/* ---------- banderas de los países ---------- */
function flagTextureHN() { // turquesa / blanco / turquesa + 5 estrellas
  return canvasTex(256, 160, (g, w, h) => {
    g.fillStyle = '#00b2e3'; g.fillRect(0, 0, w, h / 3);
    g.fillStyle = '#ffffff'; g.fillRect(0, h / 3, w, h / 3);
    g.fillStyle = '#00b2e3'; g.fillRect(0, 2 * h / 3, w, h / 3);
    g.fillStyle = '#00b2e3';
    [[0.3, 0.35], [0.7, 0.35], [0.5, 0.5], [0.3, 0.65], [0.7, 0.65]].forEach(([fx, fy]) => {
      g.beginPath(); g.arc(w * fx, h * fy, 7, 0, TAU); g.fill();
    });
  });
}
function flagTextureMX() { // verde / blanco / rojo + águila simplificada
  return canvasTex(256, 160, (g, w, h) => {
    g.fillStyle = '#006847'; g.fillRect(0, 0, w / 3, h);
    g.fillStyle = '#ffffff'; g.fillRect(w / 3, 0, w / 3, h);
    g.fillStyle = '#ce1126'; g.fillRect(2 * w / 3, 0, w / 3, h);
    g.fillStyle = '#8a6a3a';
    g.beginPath(); g.ellipse(w / 2, h / 2, 22, 15, 0, 0, TAU); g.fill();
    g.fillStyle = '#5d3f24';
    g.beginPath(); g.arc(w / 2 + 12, h / 2 - 12, 9, 0, TAU); g.fill();
  });
}
function flagTextureUS() { // barras + cantón azul con estrellas
  return canvasTex(256, 160, (g, w, h) => {
    for (let i = 0; i < 7; i++) { g.fillStyle = i % 2 ? '#ffffff' : '#b31942'; g.fillRect(0, (h / 7) * i, w, h / 7 + 1); }
    g.fillStyle = '#0a3161'; g.fillRect(0, 0, w * 0.42, h * 0.55);
    g.fillStyle = '#ffffff';
    for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) {
      g.beginPath(); g.arc(12 + c * 20, 12 + r * 18, 4, 0, TAU); g.fill();
    }
  });
}
function flagTextureES() { // rojo / amarillo / rojo
  return canvasTex(256, 160, (g, w, h) => {
    g.fillStyle = '#aa151b'; g.fillRect(0, 0, w, h / 4);
    g.fillStyle = '#f1bf00'; g.fillRect(0, h / 4, w, h / 2);
    g.fillStyle = '#aa151b'; g.fillRect(0, 3 * h / 4, w, h / 4);
  });
}
function addFlag(g, x, z, tex, poleH) {
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, poleH, 8),
    new THREE.MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.6 }));
  pole.position.set(x, poleH / 2, z); g.add(pole);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.1),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
  flag.position.set(x + 1.75, poleH - 1.3, z); g.add(flag);
}
/* ---------- ✈️ AEROPUERTO (sistema de viajes entre mundos) ---------- */
function airportSignTexture() {
  return canvasTex(512, 128, (g, w, h) => {
    g.fillStyle = '#0d47a1'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#ffffff'; g.lineWidth = 8; g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = '#ffffff'; g.textAlign = 'center';
    g.font = '900 58px "Trebuchet MS", sans-serif';
    g.fillText('✈️ AEROPUERTO', w / 2, 86);
  });
}
function addAirport(lvl, x, topY, z) {
  const g = new THREE.Group(); g.position.set(x, topY, z);
  const termM = new THREE.MeshStandardMaterial({ color: 0xeceff1, roughness: 0.8 });
  const glassM = new THREE.MeshStandardMaterial({ color: 0x9fd8ff, roughness: 0.3, metalness: 0.4 });
  const term = new THREE.Mesh(new THREE.BoxGeometry(4.6, 2.6, 3.6), termM); // terminal
  term.position.set(0, 1.3, 0.8); g.add(term);
  const win = new THREE.Mesh(new THREE.BoxGeometry(4.7, 0.9, 3.7), glassM);
  win.position.set(0, 1.9, 0.8); g.add(win);
  g.add(doubleFaceSign(4.4, 1.1, airportSignTexture(), -2.36, 3.4, 0.8, -Math.PI / 2)); // cara al jugador que llega
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 5, 10), termM); // torre de control
  shaft.position.set(-1.6, 2.5, -0.9); g.add(shaft);
  const cab = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 0.9, 1.1, 10), glassM);
  cab.position.set(-1.6, 5.4, -0.9); g.add(cab);
  const strip = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 5.4),
    new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.9 })); // pista
  strip.position.set(1.8, 0.05, 0.4); g.add(strip);
  for (let i = 0; i < 4; i++) {
    const dash = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.1, 0.7),
      new THREE.MeshBasicMaterial({ color: 0xffffff }));
    dash.position.set(1.8, 0.06, -1.4 + i * 1.25); g.add(dash);
  }
  if (typeof buildPlaneMesh === 'function') { // avioncito decorativo (reusa el de vehicles.js)
    const p = buildPlaneMesh(0xffd23f);
    p.position.set(1.8, 0.9, 0.4); p.rotation.y = Math.PI / 2; g.add(p);
  }
  lvl.group.add(g);
  (lvl.airports = lvl.airports || []).push({ x, y: topY, z, r: 3.4 });
}

/* ---------- decoración por tema ---------- */
function decorate(idx, lvl) {
  const g = lvl.group;
  if (idx === 0) { // NEON CITY
    setSky(0x0b0140, 0x3d0a5e); // noche neón vibrante: violeta profundo + magenta
    scene.fog = new THREE.Fog(0x1a0a30, 40, 160);
    const grid = new THREE.GridHelper(400, 80, 0x00e5ff, 0x7b2fff);
    grid.position.y = -14; grid.material.transparent = true; grid.material.opacity = 0.5;
    g.add(grid);
    const bMat = new THREE.MeshStandardMaterial({ color: 0x0d0a24, roughness: 0.8, emissive: 0x111133, emissiveIntensity: 0.4 });
    const winMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
    for (let i = 0; i < 46; i++) {
      const w = 4 + Math.random() * 8, h = 12 + Math.random() * 34, d = 4 + Math.random() * 8;
      const side = Math.random() < 0.5 ? -1 : 1;
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bMat);
      b.position.set(side * (26 + Math.random() * 55), h / 2 - 14, -20 + Math.random() * 190);
      g.add(b);
      for (let k = 0; k < 6; k++) { // ventanitas
        const win = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.1),
          new THREE.MeshBasicMaterial({ color: Math.random() < 0.5 ? 0x00e5ff : 0xff2fd6 }));
        win.position.set(b.position.x + (Math.random() - 0.5) * w * 0.7, -8 + Math.random() * h * 0.8, b.position.z + d / 2 + 0.06);
        g.add(win);
      }
    }
    // anillos flotantes decorativos
    for (let i = 0; i < 8; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.12, 8, 32),
        new THREE.MeshBasicMaterial({ color: i % 2 ? 0xff2fd6 : 0x00e5ff }));
      ring.position.set((Math.random() - 0.5) * 40, 8 + Math.random() * 10, 10 + i * 16);
      ring.userData.spin = 0.4 + Math.random();
      (lvl.decoSpinners = lvl.decoSpinners || []).push(ring);
      g.add(ring);
    }
    lvl.ambient = { colors: [0x00e5ff, 0xff2fd6, 0x7b2fff], rate: 6, area: 45, up: 1.5, size: 0.35 };
  } else if (idx === 1) { // VOLCÁN DE LAVA
    setSky(0x2a0800, 0x6b1e02); // resplandor de lava intenso
    scene.fog = new THREE.Fog(0x4a1402, 35, 150);
    const lt = lavaTexture();
    const lava = new THREE.Mesh(new THREE.PlaneGeometry(500, 500),
      new THREE.MeshBasicMaterial({ map: lt }));
    lava.rotation.x = -Math.PI / 2; lava.position.y = -13;
    g.add(lava); lvl.lavaTex = lt;
    const rockM = new THREE.MeshStandardMaterial({ color: 0x2a1a12, roughness: 0.95 });
    for (let i = 0; i < 26; i++) { // rocas volcánicas
      const r = new THREE.Mesh(new THREE.ConeGeometry(2 + Math.random() * 4, 8 + Math.random() * 18, 6), rockM);
      const side = Math.random() < 0.5 ? -1 : 1;
      r.position.set(side * (24 + Math.random() * 50), -6 + Math.random() * 6, -10 + Math.random() * 170);
      g.add(r);
    }
    lvl.ambient = { colors: [0xff6a00, 0xffb300, 0xff3d00], rate: 14, area: 40, up: 5, size: 0.4 };
  } else if (idx === 2) { // DULCE HIELO
    setSky(0x7ec8ff, 0xffd6f0); // caramelo: azul vivo + rosa pastel
    scene.fog = new THREE.Fog(0xd8ecff, 45, 170);
    const snow = new THREE.Mesh(new THREE.PlaneGeometry(500, 500),
      new THREE.MeshStandardMaterial({ color: 0xeaf7ff, roughness: 1 }));
    snow.rotation.x = -Math.PI / 2; snow.position.y = -13;
    snow.receiveShadow = true;
    g.add(snow);
    const poleTex = stripeTexture('#ff4d6d', '#ffffff');
    for (let i = 0; i < 14; i++) { // bastones de caramelo
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 9, 12),
        new THREE.MeshStandardMaterial({ map: poleTex, roughness: 0.4 }));
      const side = Math.random() < 0.5 ? -1 : 1;
      const ppx = side * (10 + Math.random() * 8), ppz = 5 + i * 12;
      if (Math.abs(ppx) > 9 && ppz > 60 && ppz < 80) continue; // puerta misteriosa
      pole.position.set(ppx, 4.5, ppz);
      g.add(pole);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0xff7edb, roughness: 0.35 }));
      ball.position.set(pole.position.x, 9.4, pole.position.z);
      g.add(ball);
    }
    lvl.ambient = { colors: [0xffffff, 0xcfeeff], rate: 20, area: 45, up: -1.2, size: 0.3 };
  } else if (idx === 3) { // IMMOKALEE, FL 🌴 — MAPA REAL (cuadrícula simplificada del pueblo)
    setSky(0x0aa8ff, 0xff9e50); // cielo eléctrico: azul caramelo + atardecer vibrante
    scene.fog = new THREE.Fog(0xffc182, 60, 240);
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(560, 560),
      new THREE.MeshStandardMaterial({ color: 0x3fe04c, roughness: 1 }));
    grass.rotation.x = -Math.PI / 2; grass.position.y = -13;
    grass.receiveShadow = true;
    g.add(grass);
    // sol de Florida (tamaño moderado: el sprite gigante encandilaba la pantalla)
    const sunSpr = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex, color: 0xffe95e, transparent: true, opacity: 0.85, depthWrite: false, fog: false }));
    sunSpr.scale.set(26, 26, 1); sunSpr.position.set(80, 95, 30); g.add(sunSpr);
    const sunCore = new THREE.Mesh(new THREE.SphereGeometry(7, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xfff6b0, fog: false }));
    sunCore.position.set(80, 95, 30); g.add(sunCore);
    // nubes de bloques
    const cloudM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 });
    [[-40, 30, 40], [30, 34, 90], [-25, 28, 110], [45, 32, 10], [0, 36, 140]].forEach(([cx, cy, cz]) => {
      const cl = new THREE.Group();
      [[0, 0, 0, 7, 2.4, 3.4], [4.5, 0.4, 0.6, 5, 2, 2.8], [-4.5, 0.3, -0.5, 5.4, 2.1, 3]].forEach(([ox, oy, oz, bw, bh, bd]) => {
        const bm = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), cloudM);
        bm.position.set(ox, oy, oz); cl.add(bm);
      });
      cl.position.set(cx, cy, cz); g.add(cl);
    });
    // ---- monumento de bienvenida al pueblo ----
    const monG = new THREE.Group();
    const monBase = new THREE.Mesh(new THREE.BoxGeometry(6, 1.2, 1), urbMat(0x9c7a4d));
    monBase.position.y = 0.6; monG.add(monBase);
    monG.add(doubleFaceSign(7.5, 3.4, monumentTexture(), 0, 3.6, 0, 0));
    [-2.6, 2.6].forEach(mx => {
      const mp = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.2, 8), urbMat(0x6b4a2a));
      mp.position.set(mx, 1.6, 0); monG.add(mp);
    });
    monG.position.set(7, 0, -1); monG.rotation.y = 0.5; g.add(monG);

    /* ===== MAPA REAL DE IMMOKALEE (trazado del pueblo real, interpretación jugable) =====
       z- = norte · z+ = sur. MAIN ST va de ESTE a OESTE (avenida comercial);
       1ST ST es el eje NORTE-SUR (el corredor jugable que construye buildCityBase);
       su cruce es el centro del pueblo. La SR 29 es un bypass en DIAGONAL por el
       ESTE (no cruza el centro). Lago Trafford al oeste, aeropuerto al noreste,
       CASINO al sureste, Pioneer Museum al noroeste, empacadoras al este,
       La Pulga en S 3rd St, high school al norte sobre Immokalee Dr. */
    // ---- suelo caminable de todo el mapa (una sola plataforma; las calles son visuales) ----
    // ciudad grande: x∈[-200,200], z∈[-125,235]
    addPlatform(lvl, 0, -0.02, 55, 400, 360, { color: 0x3fc653, emissive: 0x0b3a10, matte: true });
    // ---- calles del mapa real (losas visuales delgadas sobre el suelo) ----
    const roadM = urbMatte(0x3b4038), yelM = urbBasic(0xffc400), edgeM = urbBasic(0xf2f2f2);
    const walkM = urbMatte(0xd6dbe2); // aceras
    const roadEW = (x0, x1, z) => {
      const w = x1 - x0, cx = (x0 + x1) / 2;
      const r = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, 7), roadM);
      r.position.set(cx, 0.02, z); r.receiveShadow = true; g.add(r);
      [-4.5, 4.5].forEach(lx => { // aceras a los lados (más bajas: sin z-fight en cruces)
        const sw = new THREE.Mesh(new THREE.BoxGeometry(w, 0.03, 2), walkM);
        sw.position.set(cx, 0.015, z + lx); sw.receiveShadow = true; g.add(sw);
      });
      [-0.32, 0.32].forEach(lx => {
        const ln = new THREE.Mesh(new THREE.BoxGeometry(w - 2, 0.02, 0.14), yelM);
        ln.position.set(cx, 0.05, z + lx); g.add(ln);
      });
      [-3.1, 3.1].forEach(lx => {
        const ln = new THREE.Mesh(new THREE.BoxGeometry(w - 2, 0.02, 0.12), edgeM);
        ln.position.set(cx, 0.05, z + lx); g.add(ln);
      });
    };
    const roadNS = (x, z0, z1) => {
      const d = z1 - z0, cz = (z0 + z1) / 2;
      const r = new THREE.Mesh(new THREE.BoxGeometry(7, 0.04, d), roadM);
      r.position.set(x, 0.02, cz); r.receiveShadow = true; g.add(r);
      [-4.5, 4.5].forEach(lx => { // aceras a los lados
        const sw = new THREE.Mesh(new THREE.BoxGeometry(2, 0.03, d), walkM);
        sw.position.set(x + lx, 0.015, cz); sw.receiveShadow = true; g.add(sw);
      });
      [-0.32, 0.32].forEach(lx => {
        const ln = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, d - 2), yelM);
        ln.position.set(x + lx, 0.05, cz); g.add(ln);
      });
      [-3.1, 3.1].forEach(lx => {
        const ln = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, d - 2), edgeM);
        ln.position.set(x + lx, 0.05, cz); g.add(ln);
      });
    };
    const roadDiag = (x0, z0, x1, z1) => { // bypass en diagonal (SR 29): losa + línea central, sin aceras
      const dx = x1 - x0, dz = z1 - z0, len = Math.hypot(dx, dz), ry = Math.atan2(-dz, dx);
      const r = new THREE.Mesh(new THREE.BoxGeometry(len, 0.04, 7), roadM);
      r.position.set((x0 + x1) / 2, 0.015, (z0 + z1) / 2); // bajo las otras calles: no hay z-fight en cruces
      r.rotation.y = ry; r.receiveShadow = true; g.add(r);
      const n = Math.max(1, Math.floor(len / 12));
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const dash = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.02, 0.28), yelM);
        dash.position.set(x0 + dx * t, 0.045, z0 + dz * t); dash.rotation.y = ry; g.add(dash);
      }
    };
    // MAIN ST (este-oeste, avenida comercial) y 3RD ST (norte-sur; 1ST ST = corredor central)
    roadEW(-100, -39, 55); roadEW(39, 100, 55);
    roadNS(-48, -20, 14.5); roadNS(-48, 21.5, 51.5); roadNS(-48, 58.5, 104.5); roadNS(-48, 111.5, 130);
    // LAKE TRAFFORD RD (del lago al este, cruza la SR 29) y COLORADO AVE (este-oeste, sur)
    roadEW(-58, 160, 18);
    roadEW(-100, -39, 108); roadEW(39, 100, 108);
    // cruce peatonal donde MAIN ST cruza el corredor (9TH ST)
    for (let sx = -3; sx <= 3; sx += 1.2) {
      const st = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.02, 2.4), edgeM);
      st.position.set(sx, 0.05, 55); g.add(st);
    }
    // ---- letreros con los nombres reales de las calles ----
    addStreetSign(g, 9.5, 47, 'MAIN ST × 1ST ST', Math.PI / 2); // centro del pueblo
    addStreetSign(g, 9.5, 31, '1ST ST', 0);
    addStreetSign(g, -41, 47, '3RD ST', Math.PI / 2);
    addStreetSign(g, -36, 10, 'LAKE TRAFFORD RD', Math.PI / 2);
    addStreetSign(g, 9.5, 100, 'COLORADO AVE', Math.PI / 2);
    // ---- SR 29: bypass en DIAGONAL por el este (no cruza el centro, como en el mapa real) ----
    roadDiag(110, -125, 215, 175);
    addStreetSign(g, 104, -112, 'SR 29', 0.6);
    addStreetSign(g, 171, 46, 'SR 29', 0.6); // cruce con E Main St (en el pasto, fuera de la calzada)

    // ---- LAGO TRAFFORD (oeste) — el muelle de pesca lo construye fishing.js ----
    const shore = new THREE.Mesh(new THREE.CircleGeometry(24, 28), urbMat(0xf7e08a));
    shore.rotation.x = -Math.PI / 2; shore.position.set(-78, 0.01, 18); g.add(shore);
    const bigLake = new THREE.Mesh(new THREE.CircleGeometry(20, 28),
      new THREE.MeshStandardMaterial({ color: 0x00c4ff, roughness: 0.25, metalness: 0.2 }));
    bigLake.rotation.x = -Math.PI / 2; bigLake.position.set(-78, 0.03, 18); g.add(bigLake);
    makeGator(-70, 24, g); // 🐊 lagarto del lago

    // ---- AEROPUERTO REGIONAL DE IMMOKALEE (noreste, al este de la SR 29; pista NORTE-SUR como en el mapa real) ----
    const AR = { x: 145, z: -70 };
    const rwy = new THREE.Mesh(new THREE.BoxGeometry(7, 0.04, 38), urbMat(0x37474f));
    rwy.position.set(AR.x, 0.02, AR.z); rwy.receiveShadow = true; g.add(rwy);
    const dashM = urbBasic(0xffffff);
    for (let dz = -15; dz <= 15; dz += 6) {
      const dash = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 2.4), dashM);
      dash.position.set(AR.x, 0.05, AR.z + dz); g.add(dash);
    }
    const termM = urbMat(0xeceff1), glassM = urbMat(0x9fd8ff);
    const term = new THREE.Mesh(new THREE.BoxGeometry(6, 3.6, 9), termM);
    term.position.set(AR.x + 10, 1.8, AR.z); g.add(term);
    const tglass = new THREE.Mesh(new THREE.BoxGeometry(6.2, 1.1, 9.2), glassM);
    tglass.position.set(AR.x + 10, 2.6, AR.z); g.add(tglass);
    const ctrlT = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 6, 10), termM);
    ctrlT.position.set(AR.x + 10, 3, AR.z - 8); g.add(ctrlT);
    const cab = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.0, 1.3, 10), glassM);
    cab.position.set(AR.x + 10, 6.4, AR.z - 8); g.add(cab);
    [[17, -14], [17, 14]].forEach(([ox, oz]) => { // hangares / naves
      const hgr = new THREE.Mesh(new THREE.BoxGeometry(8, 4.5, 10), urbMat(0xb0bec5));
      hgr.position.set(AR.x + ox, 2.25, AR.z + oz); g.add(hgr);
    });
    if (typeof buildPlaneMesh === 'function') { // avioneta decorativa
      const ap = buildPlaneMesh(0xffd23f);
      ap.position.set(AR.x, 0.9, AR.z + 10); ap.rotation.y = 0; g.add(ap);
    }
    const poleG = new THREE.CylinderGeometry(0.12, 0.12, 3.4, 8);
    const poleM = urbMat(0x8a8f9a);
    const mkPole = (px, pz) => {
      const p = new THREE.Mesh(poleG, poleM);
      p.position.set(px, 1.7, pz); g.add(p);
    };
    mkPole(AR.x + 7, AR.z + 26); // letrero del aeropuerto
    g.add(doubleFaceSign(9, 2.8, airportImmTexture(), AR.x + 7, 3.6, AR.z + 26, Math.PI / 2));
    mkPole(AR.x + 7, AR.z + 30); // manga de viento
    const sock = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.6, 8),
      new THREE.MeshStandardMaterial({ color: 0xff6f00, roughness: 0.7 }));
    sock.rotation.z = Math.PI / 2; sock.position.set(AR.x + 7.9, 3.1, AR.z + 30); g.add(sock);
    // registro para el botón ✈️ VIAJAR (travel.js)
    (lvl.airports = lvl.airports || []).push({ x: AR.x, y: 0, z: AR.z, r: 4 });
    // ---- IMMOKALEE COMMUNITY PARK (la pista vieja ahora es parque, al norte del centro) ----
    [[50, -12], [58, -4], [66, -12], [74, -4], [54, 4], [70, 6]].forEach(([tx, tz]) => addTree(g, tx, tz, 1));
    addStreetSign(g, 48, 8, 'COMMUNITY PARK', Math.PI / 2);

    // ---- CASINO (sureste, sobre S 1st St, como en el mapa real) — diseño original genérico, solo "CASINO" ----
    const CX = 20, CZ = 155;
    const cas = new THREE.Mesh(new THREE.BoxGeometry(12, 7, 10), urbMat(0x4545d8));
    cas.position.set(CX, 3.5, CZ); g.add(cas);
    const casTrim = new THREE.Mesh(new THREE.BoxGeometry(12.6, 1.0, 10.6),
      new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0xffb300, emissiveIntensity: 0.4, roughness: 0.5 }));
    casTrim.position.set(CX, 6.6, CZ); g.add(casTrim);
    const casRoof = new THREE.Mesh(new THREE.BoxGeometry(13, 1.2, 11), urbMat(0x8a1020));
    casRoof.position.set(CX, 7.6, CZ); g.add(casRoof);
    mkPole(CX - 6.8, CZ + 8); // letrero del casino
    g.add(doubleFaceSign(9, 2.2, casinoTexture(), CX - 6.8, 4.0, CZ + 8, Math.PI / 2));
    const casWinG = urbGeo('caswin', () => new THREE.BoxGeometry(0.15, 1, 1));
    const casWinM = urbBasic(0xffe95e);
    for (let wy = 1.5; wy <= 5; wy += 3.5) for (let wz = CZ - 4.5; wz <= CZ + 4.5; wz += 2.3) {
      const cw = new THREE.Mesh(casWinG, casWinM);
      cw.position.set(CX - 6.05, wy, wz); g.add(cw);
    }
    // estacionamiento del casino
    const park = new THREE.Mesh(new THREE.BoxGeometry(18, 0.04, 12), urbMat(0x4a4f55));
    park.position.set(CX, 0.02, CZ + 13); park.receiveShadow = true; g.add(park);
    // pinos donde estaba el casino viejo (ahora al sureste)
    [[156, 90], [164, 98], [156, 102]].forEach(([tx, tz]) => addTree(g, tx, tz, 1));

    // ---- LA PULGA: mercado de pulgas en S 3rd St, entre Main St y Boston Ave ----
    const stallM = urbMat(0x8a5a33);
    const stallPostG = urbGeo('stallpost', () => new THREE.CylinderGeometry(0.07, 0.07, 2.4, 6));
    const addStall = (sx, sz, stripe) => {
      const st = new THREE.Group();
      const table = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.9, 1.6), stallM);
      table.position.y = 0.45; st.add(table);
      const prod = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.4, 1.2), urbMat(0xe53935));
      prod.position.y = 1.1; st.add(prod); // frutas y verduras
      [[-1.2, -0.7], [1.2, -0.7], [-1.2, 0.7], [1.2, 0.7]].forEach(([px, pz]) => {
        const post = new THREE.Mesh(stallPostG, stallM);
        post.position.set(px, 1.2, pz); st.add(post);
      });
      const awn = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.12, 2.4),
        new THREE.MeshStandardMaterial({ map: stripeTexture('#ffffff', stripe), roughness: 0.8 }));
      awn.position.y = 2.5; st.add(awn);
      st.position.set(sx, 0, sz);
      g.add(st);
    };
    addStall(-60, 64, '#ff1744'); addStall(-66, 64, '#00d054');
    addStall(-60, 70, '#ff9100'); addStall(-66, 70, '#ff1744');
    mkPole(-63, 58); // letrero de La Pulga
    g.add(doubleFaceSign(5.5, 1.7, marketTexture(), -63, 3.8, 58, Math.PI / 2));

    // ---- negocios familiares en MAIN ST (con permiso) ----
    const rotShop = (fn, x, z, ry) => { // coloca un negocio rotado mirando a la calle
      const tmp = new THREE.Group();
      fn(tmp, 0, 0);
      tmp.rotation.y = ry; tmp.position.set(x, 0, z);
      g.add(tmp);
      return tmp;
    };
    const _ft = rotShop(addFoodTrailer, -16, 44, -Math.PI / 2); // 🚚 LOS HERMANOS TAMPS (ventana al sur, a Main St)
    SHOP3D.push({ o: _ft, name: 'LOS HERMANOS TAMPS', food: true });
    const _pl = rotShop(addPaleteria, 16, 66, -Math.PI / 2); // 🍦 DELICIAS MICHOACANAS (frente al norte, a Main St)
    SHOP3D.push({ o: _pl, name: 'DELICIAS MICHOACANAS', food: true });
    rotShop((gr, x, z) => { const s = addShop(gr, x, z, 0x00e5b0, 'ABIS CLEAN'); addRoofBroom(s.grp, 2.6, 3.95, 1.9); }, 28, 44, Math.PI / 2);
    rotShop((gr, x, z) => addShop(gr, x, z, 0xff4d94, 'MERCADO'), -30, 44, Math.PI / 2);
    rotShop((gr, x, z) => addShop(gr, x, z, 0xffc400, 'TAQUERÍA'), -40, 66, -Math.PI / 2);
    rotShop((gr, x, z) => addShop(gr, x, z, 0x2fb9ff, 'FARMACIA'), 40, 66, -Math.PI / 2);
    rotShop((gr, x, z) => addShop(gr, x, z, 0xff5e1a, 'HAMBURGUESAS', true), -32, 66, -Math.PI / 2);
    const tc = new THREE.Group(); // 🌮 carreta de tacos frente a la traila
    addTacoCart(tc, 0, 0); tc.rotation.y = Math.PI / 2; tc.position.set(-24, 0, 49); g.add(tc);
    SHOP3D.push({ o: tc, name: 'TACOS', food: true });

    // ---- cuadras comerciales de MAIN ST: fachadas MIRANDO a la avenida ----
    const stripes = ['#ff1744', '#00d054', '#ff9100', '#7b2fff', '#00b8d4'];
    let sc = 0;
    // lado norte (frente al sur, hacia Main St)
    [[-95, 0xff5e8a, 'DULCERÍA'], [-76, 0x2fd6ff, 'JUGUETES'], [-64, 0xffc400, 'PAPELERÍA'],
     [60, 0xff7a1a, 'ZAPATERÍA'], [72, 0x00c48a, 'FLORERÍA'], [84, 0xff4d6d, 'PELUQUERÍA']
    ].forEach(([sx, c, n]) => addMainStShop(g, sx, 46, c, n, 1, stripes[(sc++) % stripes.length]));
    // lado sur (frente al norte, hacia Main St)
    [[-95, 0x9d6bff, 'ROPA'], [-76, 0xffb300, 'PANADERÍA'], [-64, 0x35c759, 'FRUTERÍA'],
     [48, 0x2fa9ff, 'ÓPTICA'], [60, 0xff5e3a, 'PIZZERÍA'], [72, 0x00b8d4, 'BARBERÍA'], [84, 0xc86bff, 'REGALOS']
    ].forEach(([sx, c, n]) => addMainStShop(g, sx, 64, c, n, -1, stripes[(sc++) % stripes.length]));
    // ---- 🏢 TORRE GEAYI: edificio-torre escalable (opcional, en el centro) ----
    buildTorreGeayi(lvl);
    /* ===== DISTRITO MODERNO GEAYI (infraestructura estilo Brookhaven, 100% original) =====
       Paseo peatonal con edificios de vidrio, fuente, bancas, jardineras y
       farolas modernas. Manzana verificada libre: x∈[52,102], z∈[-2,28]. */
    addPlazaSlab(g, 75, 16, 30, 10); // paseo central x∈[60,90]
    addPlazaSlab(g, 96, 16, 12, 12); // plazoleta de la fuente x∈[90,102]
    addModernBld(g, 78, 2, 26, 9, 6, 0, 0, 'CENTRO GEAYI'); // norte del paseo, frente al sur
    addModernBld(g, 56, 16, 7, 7, 12, Math.PI / 2, 1, 'BIBLIOTECA'); // oeste, frente al este
    addFountain(g, 96, 16);
    [[63, 12.5, 'S'], [63, 19.5, 'N'], [87, 12.5, 'S'], [87, 19.5, 'N'],
     [91, 11, 'S'], [91, 21, 'N'], [101, 11, 'S'], [101, 21, 'N']
    ].forEach(([lx, lz, ad]) => addModernLamp(g, lx, lz, ad));
    addBench(g, 68, 13.4, 0); addBench(g, 78, 18.6, Math.PI); addBench(g, 88, 13.4, 0);
    [62, 72, 82].forEach(px => { addPlanter(g, px, 11.6); addPlanter(g, px, 20.4); });
    // ---- farolas modernas a lo largo de MAIN ST (aceras, sin tapar frentes de tiendas) ----
    [[-52, 50.8, 'S'], [-30, 50.8, 'S'], [8, 50.8, 'S'], [38, 50.8, 'S']
    ].forEach(([lx, lz, ad]) => addModernLamp(g, lx, lz, ad));
    [[-45, 59.2, 'N'], [-5, 59.2, 'N'], [25, 59.2, 'N'], [55, 59.2, 'N']
    ].forEach(([lx, lz, ad]) => addModernLamp(g, lx, lz, ad));

    // ---- casas de familia repartidas por el pueblo ----
    const houseCols = [0xff4fa3, 0xffc400, 0x2df06e, 0x2fa9ff, 0xff7a1a, 0x9d6bff];
    [[-64, 84, 1], [56, 40, -1], [-62, -6, 1], [48, 88, -1]].forEach(([hx, hz, f], i) => {
      addHouse(g, hx, hz, {
        wall: houseCols[i % houseCols.length], roof: 0xa34a2e,
        face: f, chimney: i % 2 === 0, fence: true
      });
    });
    // ---- cuadras residenciales densas (casas mirando a sus calles) ----
    let hc = 4, hi = 0;
    const hcol = () => houseCols[(hc++) % houseCols.length];
    const hchim = () => (hi++) % 2 === 0;
    // 1ST ST (norte-sur): casas a ambos lados mirando a la calle
    [-6, 12, 38, 76, 94].forEach(hz => addImmHouse(g, -60, hz, hcol(), 0xa34a2e, 0, hchim()));
    [-6, 12, 38, 80].forEach(hz => addImmHouse(g, -36, hz, hcol(), 0x7a4a35, Math.PI, hchim()));
    // IMMOKALEE DR (este-oeste): casas al norte y sur mirando a la avenida
    [-80, -60, 45, 65, 85].forEach(hx => addImmHouse(g, hx, 98, hcol(), 0xa34a2e, -Math.PI / 2, hchim())); // norte: frente al sur
    [-80, -60].forEach(hx => addImmHouse(g, hx, 118, hcol(), 0x7a4a35, Math.PI / 2, hchim()));            // sur: frente al norte
    // casas reubicadas: la pista vieja ahora es parque y el aeropuerto está al noreste
    [[52, 32, 0.3], [70, 32, -0.2], [88, 32, 0.15], [122, -8, 0], [122, 6, -0.3]].forEach(([hx, hz, ry]) =>
      addImmHouse(g, hx, hz, hcol(), 0xa34a2e, ry, hchim()));
    // manzana suroeste
    addImmHouse(g, -72, 68, hcol(), 0xa34a2e, 0.2, hchim());
    addImmHouse(g, -72, 88, hcol(), 0x7a4a35, -0.15, hchim());
    // ---- palmeras a lo largo de MAIN ST y COLORADO AVE ----
    [[-70, 48, 1], [-58, 62, 1.05], [44, 48, 1], [58, 62, 0.95],
     [-70, 101, 1.1], [70, 101, 1], [-30, 101, 1.05], [38, 116, 1]
    ].forEach(([px, pz, ps]) => makePalm(px, pz, ps, g));
    // ---- torre de agua del pueblo (al oeste) ----
    addWaterTower(g, -38, 92);
    // ---- sembradío de tomates (oeste, junto a Lake Trafford Rd) ----
    const field = new THREE.Mesh(new THREE.PlaneGeometry(30, 36),
      new THREE.MeshStandardMaterial({ map: tomatoFieldTexture(), roughness: 1 }));
    field.rotation.x = -Math.PI / 2; field.position.set(-95, 0.005, 88); g.add(field);
    addTomatoPlanter(g, -9, 23); // 🍅 jardinera junto a la avenida
    // ---- mural de bienvenida en la avenida ----
    const mural = new THREE.Mesh(new THREE.BoxGeometry(0.8, 13, 15), urbMat(0xd8d2c4));
    mural.position.set(20, 6.5, 42); g.add(mural);
    const muralArt = new THREE.Mesh(new THREE.PlaneGeometry(13.5, 11.5),
      new THREE.MeshBasicMaterial({ map: monumentTexture() }));
    muralArt.position.set(19.55, 6.5, 42); muralArt.rotation.y = -Math.PI / 2; g.add(muralArt);
    /* ===== EXPANSIÓN — CIUDAD GRANDE (esqueleto del mapa real) =====
       1ST ST = eje norte-sur (corredor jugable x=0) con comercios;
       MAIN ST = este-oeste (avenida comercial); SR 29 = bypass en diagonal al este;
       cuadrícula densa al centro; aeropuerto al NE; CASINO al SE;
       campo (sembradíos + árboles) al oeste y al sur. */
    // ---- MAIN ST extendida: más cuadras al este (hasta la SR 29) y al oeste (curva al suroeste) ----
    roadEW(100, 168, 55); roadEW(-180, -100, 55);
    roadDiag(-178, 55, -200, 84); // W Main St se curva al suroeste, como en el mapa real
    [[104, 0xff2f9e, 'CAFETERÍA'], [116, 0x2fd6ff, 'HELADERÍA'], [128, 0xffc400, 'FERRETERÍA'],
     [140, 0x00c48a, 'LIBRERÍA'], [152, 0xff7a1a, 'MASCOTAS']
    ].forEach(([sx, c, n]) => addMainStShop(g, sx, 46, c, n, 1, stripes[(sc++) % stripes.length]));
    [[104, 0x2f9eff, 'LAVANDERÍA'], [116, 0xffd23f, 'JOYERÍA'], [128, 0x35c759, 'DEPORTES'],
     [140, 0xff5e8a, 'MÚSICA'], [152, 0x00b8d4, 'SASTRERÍA']
    ].forEach(([sx, c, n]) => addMainStShop(g, sx, 64, c, n, -1, stripes[(sc++) % stripes.length]));
    [[-132, 0x7fd4ff, 'DENTISTA'], [-144, 0x9dff6e, 'VETERINARIA'], [-156, 0xffb300, 'BANCO'],
     [-168, 0x9d6bff, 'CARNICERÍA']
    ].forEach(([sx, c, n]) => addMainStShop(g, sx, 46, c, n, 1, stripes[(sc++) % stripes.length]));
    [[-132, 0xff8a5e, 'PUPUSERÍA'], [-144, 0x6effa8, 'VERDULERÍA'], [-156, 0xd4a5ff, 'CORREO']
    ].forEach(([sx, c, n]) => addMainStShop(g, sx, 64, c, n, -1, stripes[(sc++) % stripes.length]));
    addStreetSign(g, 150, 47, 'MAIN ST', Math.PI / 2);
    // ---- 1ST ST: comercios con frente al eje norte-sur (corredor jugable) ----
    [[-16, 8, 0xff6e9e, 'RELOJERÍA', 'E'], [-16, 26, 0x2fd6ff, 'BISUTERÍA', 'E'],
     [-16, 80, 0xffc400, 'MERCERÍA', 'E'], [-16, 98, 0x00c48a, 'TELAS', 'E'],
     [16, 8, 0xff7a1a, 'PERFUMERÍA', 'W'], [16, 26, 0x9d6bff, 'JUGUETERÍA', 'W'],
     [16, 80, 0x2f9eff, 'LENCERÍA', 'W'], [16, 98, 0x35c759, 'SOMBREROS', 'W']
    ].forEach(([sx, sz, c, n, f]) => addMainStShop(g, sx, sz, c, n, f, stripes[(sc++) % stripes.length]));
    // ---- AIRPARK BLVD (al aeropuerto, noreste): avenida este-oeste ----
    roadEW(-55, 140, -40); // cruza la SR 29 y sigue al este, al aeropuerto
    roadNS(0, -42, -16); // conector con 1ST ST
    [[-20, 0xff8a2a, 'TALLER'], [20, 0x3fa9ff, 'LLANTERA'], [44, 0xffd23f, 'AUTOPARTES']
    ].forEach(([sx, c, n]) => addMainStShop(g, sx, -49, c, n, 1, stripes[(sc++) % stripes.length]));
    [[-20, 0xff5e8a, 'HOTEL'], [20, 0x00c48a, 'GASOLINERA']
    ].forEach(([sx, c, n]) => addMainStShop(g, sx, -31, c, n, -1, stripes[(sc++) % stripes.length]));
    addStreetSign(g, -41, -32, 'AIRPARK BLVD', Math.PI / 2);
    // ---- 11TH ST (oeste) y 16TH ST SE (este): cuadrícula norte-sur ----
    roadNS(-118, -40, 125);
    [-20, 0, 20, 84, 120].forEach(hz => addImmHouse(g, -130, hz, hcol(), 0xa34a2e, 0, hchim()));
    [-20, 0, 20, 120].forEach(hz => addImmHouse(g, -106, hz, hcol(), 0x7a4a35, Math.PI, hchim()));
    roadNS(180, -30, 130);
    [-6, 12, 80].forEach(hz => addImmHouse(g, 168, hz, hcol(), 0xa34a2e, 0, hchim()));
    [-6, 12, 80, 96].forEach(hz => addImmHouse(g, 192, hz, hcol(), 0x7a4a35, Math.PI, hchim()));
    addStreetSign(g, -103, 47, '11TH ST', 0);
    addStreetSign(g, 173, 47, '16TH ST SE', 0);
    // ---- 1ST ST extendida al norte y al sur ----
    roadNS(-48, -75, -20);
    roadNS(-48, 130, 175);
    addImmHouse(g, -60, -55, hcol(), 0xa34a2e, 0, hchim());
    addImmHouse(g, -36, -55, hcol(), 0x7a4a35, Math.PI, hchim());
    addImmHouse(g, -62, 140, hcol(), 0xa34a2e, 0, true);
    addImmHouse(g, -62, 160, hcol(), 0x7a4a35, 0, false);
    // ---- IMMOKALEE DR extendida al este y al oeste ----
    roadEW(100, 190, 108);
    roadEW(-140, -100, 108);
    [110, 130, 150, 170].forEach(hx => addImmHouse(g, hx, 98, hcol(), 0xa34a2e, -Math.PI / 2, hchim()));
    [150, 170].forEach(hx => addImmHouse(g, hx, 118, hcol(), 0x7a4a35, Math.PI / 2, hchim()));
    // ---- farolas en las calles nuevas ----
    [[-124, -20], [-124, 20], [-124, 80], [-124, 120]].forEach(([lx, lz]) => addStreetLamp(g, lx, lz, 0xffe95e));
    [[188, -10], [188, 40], [188, 90]].forEach(([lx, lz]) => addStreetLamp(g, lx, lz, 0xffe95e));
    // ---- campo al oeste y al sur: sembradíos de maíz y tomate ----
    const cornTex = cornFieldTexture();
    const mkField = (w, d, x, z, tex) => {
      const f = new THREE.Mesh(new THREE.PlaneGeometry(w, d),
        new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }));
      f.rotation.x = -Math.PI / 2; f.position.set(x, 0.005, z); g.add(f);
    };
    mkField(34, 44, -180, 92, cornTex);                 // maíz al oeste
    mkField(40, 36, -80, -102, tomatoFieldTexture());    // tomate al norte (junto a Immokalee Dr)
    mkField(70, 80, -105, 180, tomatoFieldTexture());   // tomate al sur (oeste)
    mkField(62, 56, 3, 204, cornTex);                   // maíz al sur (centro)
    mkField(52, 80, 146, 180, cornTex);                 // maíz al sur (este, junto al rancho)
    // casas rurales dispersas
    addImmHouse(g, 108, 150, hcol(), 0x8a5a33, 0.3, true);
    addImmHouse(g, -160, -60, hcol(), 0x7a4a35, -0.2, false);
    // ---- hileras de árboles en las avenidas extendidas ----
    [105, 118, 131, 144, 157, 170].forEach(tx => { addTree(g, tx, 40, 1); addTree(g, tx, 70, 1); });
    [-155, -142, -129, -103].forEach(tx => { addTree(g, tx, 40, 1); addTree(g, tx, 70, 1); });
    [-30, -52, -64].forEach(tz => { addTree(g, -40, tz, 1); addTree(g, -56, tz, 1); });
    [146, 158, 170].forEach(tz => { addTree(g, -40, tz, 1); addTree(g, -56, tz, 1); });
    [105, 121, 137, 161].forEach(tx => { addTree(g, tx, 100, 1); addTree(g, tx, 116, 1); });
    [-35, -20, -5, 10, 25, 40, 55, 70, 85].forEach(tx => { addTree(g, tx, -56, 1); addTree(g, tx, -24, 1); });
    [[-195, 125], [110, 228], [-150, 228], [-195, 30], [195, 120]].forEach(([tx, tz]) => addTree(g, tx, tz, 1.1));
    /* ===== DENSIFICACIÓN DE CALLES (cuadrícula urbana densa, nombres del mapa real) =====
       EW: 2ND AVE N (norte de Main) · BOSTON AVE (sur de Main) · IMMOKALEE DR (sector norte)
       NS: 3RD/5TH/11TH ST al oeste de 1ST ST (la numeración crece al oeste) ·
       ROBERTS AVE, 9TH ST SE y 16TH ST SE al este. Sin mover landmarks. */
    // 2ND AVE N (este-oeste, norte de Main St)
    roadEW(-100, 36, -14);
    addStreetSign(g, -90, -6, '2ND AVE N', Math.PI / 2);
    [[-70, -19], [-20, -19], [20, -19]].forEach(([lx, lz]) => addStreetLamp(g, lx, lz, 0xffe95e));
    // BOSTON AVE (este-oeste, sur de Main St; tramo oeste: La Pulga ↔ SR 29)
    roadEW(-100, 178, 80);
    addStreetSign(g, -90, 72, 'BOSTON AVE', Math.PI / 2);
    [[135, 76.5], [165, 76.5]].forEach(([lx, lz]) => addStreetLamp(g, lx, lz, 0xffe95e));
    // 5TH ST (norte-sur, oeste de 1ST ST; rodea el lago por el este)
    roadNS(-84, -72, -6); roadNS(-84, 42, 130);
    addStreetSign(g, -77, 47, '5TH ST', 0);
    [[-88, -20], [-88, 60], [-88, 100]].forEach(([lx, lz]) => addStreetLamp(g, lx, lz, 0xffe95e));
    // ROBERTS AVE (norte-sur, zona noreste)
    roadNS(112, -30, 64);
    addStreetSign(g, 104, -24, 'ROBERTS AVE', 0);
    [[115.5, -10], [115.5, 30]].forEach(([lx, lz]) => addStreetLamp(g, lx, lz, 0xffe95e));
    // 9TH ST SE (norte-sur, este: MAIN ST ↔ BOSTON AVE)
    roadNS(144, -30, 86);
    addStreetSign(g, 136, -24, '9TH ST SE', 0);
    [[147.5, -10], [147.5, 30], [147.5, 70]].forEach(([lx, lz]) => addStreetLamp(g, lx, lz, 0xffe95e));
    // IMMOKALEE DR (este-oeste, sector norte; la cruzan 3RD ST y 5TH ST)
    roadEW(-120, 60, -64);
    addStreetSign(g, -100, -56, 'IMMOKALEE DR', Math.PI / 2);
    // HIGH SCHOOL al norte, sobre Immokalee Dr
    const hs = new THREE.Mesh(new THREE.BoxGeometry(26, 7, 12), urbMat(0xd86a2c));
    hs.position.set(-20, 3.5, -84); g.add(hs);
    const hsTrim = new THREE.Mesh(new THREE.BoxGeometry(26.6, 1, 12.6), urbBasic(0xffffff));
    hsTrim.position.set(-20, 6.8, -84); g.add(hsTrim);
    mkPole(-34, -74); // letrero de la escuela
    g.add(doubleFaceSign(8, 2, shopSignTexture('HIGH SCHOOL'), -34, 3.6, -74, 0));
    // casas al norte, a lo largo de Immokalee Dr
    [[-40, -74], [-20, -74], [0, -74]].forEach(([hx, hz]) =>
      addImmHouse(g, hx, hz, hcol(), 0xa34a2e, -Math.PI / 2, hchim()));
    [[-40, -54], [-20, -54], [0, -54]].forEach(([hx, hz]) =>
      addImmHouse(g, hx, hz, hcol(), 0x7a4a35, Math.PI / 2, hchim()));
    // PIONEER MUSEUM (Roberts Ranch, noroeste del pueblo, al oeste de 11TH ST)
    const pm = new THREE.Mesh(new THREE.BoxGeometry(10, 5, 8), urbMat(0x8a5a33));
    pm.position.set(-135, 2.5, -55); g.add(pm);
    const pmRoof = new THREE.Mesh(new THREE.BoxGeometry(11, 1.4, 9), urbMat(0x5b3a1e));
    pmRoof.position.set(-135, 5.6, -55); g.add(pmRoof);
    mkPole(-135, -48); // letrero del museo
    g.add(doubleFaceSign(7, 2, shopSignTexture('PIONEER MUSEUM'), -135, 3.6, -48, 0));
    // EMPACADORAS agrícolas al este del centro (diseño genérico)
    [[98, -8], [98, -24]].forEach(([px, pz]) => {
      const wh = new THREE.Mesh(new THREE.BoxGeometry(16, 6, 10), urbMat(0xc8b89a));
      wh.position.set(px, 3, pz); g.add(wh);
      const wd = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4, 6), urbMat(0x6b5a3e));
      wd.position.set(px - 8.1, 2, pz); g.add(wd);
    });
    mkPole(88, -16); // letrero de la empacadora
    g.add(doubleFaceSign(7, 2, shopSignTexture('EMPAQUE'), 88, 3.6, -16, Math.PI / 2));
    // cruces peatonales donde las nuevas norte-sur cruzan MAIN ST
    [-84, 112, 144].forEach(px => {
      for (let sx = -3; sx <= 3; sx += 1.2) {
        const st = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.02, 2.4), edgeM);
        st.position.set(px + sx, 0.05, 55); g.add(st);
      }
    });
    // 💡 las farolas de la ciudad ya vienen de buildCityBase
    lvl.ambient = { colors: [0x7df9ff, 0xff9de2, 0xfff06e], rate: 8, area: 45, up: 1.0, size: 0.32 };
  } else if (idx === 4) { // 🇭🇳 HONDURAS: Copán + selva + Roatán
    setSky(0x25a8e0, 0xc9f2e4); // Caribe tropical vivo
    scene.fog = new THREE.Fog(0xbdeaf0, 55, 190);
    ground(lvl, 0x3d8b4f);
    steppedPyramid(lvl.group, -26, 0, 6, 5, 14, 1.6, 0x9c8a7a); // ruinas de Copán (plaza oeste)
    for (let i = 0; i < 22; i++) { // selva densa (entre acera y edificios, sin tapar la ruta)
      const side = i % 2 ? 1 : -1;
      const x = side * (17 + (i % 3));
      const z = 20 + i * 4.6;
      if (side < 0 && z > 60 && z < 80) continue; // puerta misteriosa
      if (i % 3 === 0) makePalm(x, z, 0.8, lvl.group);
      else makeJungleTree(lvl.group, x, z, 0.7 + (i % 4) * 0.2);
    }
    { // 🏝️ playa de Roatán: arena blanca + agua turquesa
      const sand = new THREE.Mesh(new THREE.CircleGeometry(9, 24),
        new THREE.MeshStandardMaterial({ color: 0xf7ead1, roughness: 0.95 }));
      sand.rotation.x = -Math.PI / 2; sand.position.set(-24, 0.03, 45); lvl.group.add(sand);
      const sea = new THREE.Mesh(new THREE.CircleGeometry(7.5, 24),
        new THREE.MeshStandardMaterial({ color: 0x25d0c5, roughness: 0.35 }));
      sea.rotation.x = -Math.PI / 2; sea.position.set(-24, 0.06, 45); lvl.group.add(sea);
      makePalm(-19, 40, 1.2, lvl.group);
      makePalm(-29, 50, 1.0, lvl.group);
      makeUmbrella(lvl.group, -22, 42, 0.1);
    }
    addFlag(lvl.group, -7, -6, flagTextureHN(), 9);
    lvl.ambient = { colors: [0x9dff6e, 0xffffff], rate: 8, area: 45, up: 1.0, size: 0.32 };
  } else if (idx === 5) { // 🇲🇽 MÉXICO: Chichén Itzá + fiesta
    setSky(0xffb347, 0xffe9a8); // fiesta dorada mexicana
    scene.fog = new THREE.Fog(0xffdf9e, 55, 190);
    ground(lvl, 0xd9a066);
    steppedPyramid(lvl.group, -26, 0, 6, 6, 14, 1.6, 0xd9b382); // El Castillo (plaza oeste)
    // (banderines colgantes de papel picado retirados por pedido del usuario)
    for (let i = 0; i < 16; i++) { // cactus 🌵
      const side = i % 2 ? 1 : -1;
      const cx = side * (17 + (i % 3)), cz = 14 + i * 6.5;
      if (side < 0 && cz > 60 && cz < 80) continue; // puerta misteriosa
      makeCactus(lvl.group, cx, cz, 0.8 + (i % 3) * 0.3);
    }
    makeSombrero(lvl.group, 18, 45); // sombrero gigante
    addFlag(lvl.group, -7, -6, flagTextureMX(), 9);
    lvl.ambient = { colors: [0xffe95e, 0xff9d00], rate: 8, area: 45, up: 1.0, size: 0.32 };
  } else if (idx === 6) { // 🇺🇸 USA: libertad + rascacielos
    setSky(0x3f8fe0, 0xd4ecff); // azul metrópoli vivo
    scene.fog = new THREE.Fog(0xc4e2f8, 55, 190);
    ground(lvl, 0x7a8a9a);
    makeLiberty(lvl.group, 26, 55); // 🗽 Estatua de la Libertad
    const wtex = windowsTexture(); // rascacielos
    for (let i = 0; i < 10; i++) {
      const side = i % 2 ? 1 : -1;
      const h = 22 + (i * 7) % 18;
      const x = side * (18 + (i % 3) * 7);
      const z = 6 + i * 12;
      const b = new THREE.Mesh(new THREE.BoxGeometry(7, h, 7),
        new THREE.MeshStandardMaterial({ map: wtex, roughness: 0.8 }));
      b.position.set(x, -13 + h / 2, z); lvl.group.add(b);
    }
    // (bunting colgante retirado por pedido del usuario)
    addFlag(lvl.group, -7, -6, flagTextureUS(), 9);
    lvl.ambient = { colors: [0xffffff, 0x9be8ff], rate: 8, area: 45, up: 1.0, size: 0.32 };
  } else if (idx === 7) { // 🇪🇸 ESPAÑA: Sagrada Familia + plaza
    setSky(0x2f9be8, 0xffe4a8); // Mediterráneo luminoso
    scene.fog = new THREE.Fog(0xd8ecf8, 55, 190);
    ground(lvl, 0xc98a5e);
    { // plaza de baldosas
      const plaza = new THREE.Mesh(new THREE.CircleGeometry(8, 26),
        new THREE.MeshStandardMaterial({ map: tileTexture(), roughness: 0.9 }));
      plaza.rotation.x = -Math.PI / 2; plaza.position.set(0, 0.2, 68); lvl.group.add(plaza); // rotonda
    }
    const hs = [18, 22, 25, 21, 16]; // torres de la Sagrada Familia
    for (let i = 0; i < hs.length; i++) makeSpire(lvl.group, -26 + i * 3.2, 8, hs[i]); // junto a la entrada
    for (let z = 15; z <= 105; z += 15) { // abanicos flamencos
      if (z !== 45) makeFan(lvl.group, -9, z); // z=45: estación de colores
      makeFan(lvl.group, 9, z + 7);
    }
    addFlag(lvl.group, -7, -6, flagTextureES(), 9);
    lvl.ambient = { colors: [0xffd23f, 0xffffff], rate: 8, area: 45, up: 1.0, size: 0.32 };
  } else if (idx === 8) { // ❄️ MONTAÑA NEVADA: pueblo, pistas y trineo
    setSky(0x6fb4e8, 0xeaf6ff); // alpino nítido y brillante
    scene.fog = new THREE.Fog(0xd8ecfa, 60, 200);
    ground(lvl, 0xe6f1f9);
    const std = (c, e, ei) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, emissive: e || 0x000000, emissiveIntensity: ei || 0 });
    // ⛰️ montaña grande al fondo
    const mtn = new THREE.Mesh(new THREE.ConeGeometry(38, 52, 7), std(0xf4faff));
    mtn.position.set(35, 12, 150); lvl.group.add(mtn);
    const mtn2 = new THREE.Mesh(new THREE.ConeGeometry(26, 38, 7), std(0xe3f0fa));
    mtn2.position.set(-38, 8, 165); lvl.group.add(mtn2);
    // 🏘️ pueblo nevado: cabañas con chimenea y ventanas cálidas
    const cabinAt = (cx, cz, ry) => {
      const g = new THREE.Group();
      const base = new THREE.Mesh(new THREE.BoxGeometry(6, 3.4, 5), std(0x8a5a33));
      base.position.y = 1.7; g.add(base);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(4.6, 2.6, 4), std(0xffffff));
      roof.position.y = 4.6; roof.rotation.y = Math.PI / 4; g.add(roof);
      const chim = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.2, 0.9), std(0x6b4a35));
      chim.position.set(1.6, 4.6, 0.8); g.add(chim);
      const winM = new THREE.MeshBasicMaterial({ color: 0xffc14d }); // luz cálida 🕯️
      [-1.2, 1.2].forEach(wx => {
        const win = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.1), winM);
        win.position.set(wx, 1.9, 2.52); g.add(win);
      });
      g.position.set(cx, 0, cz); g.rotation.y = ry || 0;
      lvl.group.add(g);
      return { x: cx, z: cz };
    };
    const chimneys = [cabinAt(-16, 20, 0.4), cabinAt(18, 26, -0.3), cabinAt(-22, 88, 0.2), cabinAt(18, 78, -0.5)];
    // 💨 humo de chimeneas (sube suave)
    lvl.smokeSrc = chimneys.map(c => ({ x: c.x + 1.6, y: 6, z: c.z + 0.8, acc: Math.random() }));
    // 🌲 pinos nevados
    const pineAt = (px, pz, s) => {
      const g = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28 * s, 0.4 * s, 1.6 * s, 7), std(0x6b4a2e));
      trunk.position.y = 0.8 * s; g.add(trunk);
      for (let i = 0; i < 3; i++) {
        const cone = new THREE.Mesh(new THREE.ConeGeometry((2.2 - i * 0.55) * s, 1.9 * s, 8), std(0x2e7d4f));
        cone.position.y = (2 + i * 1.35) * s; g.add(cone);
        const snow = new THREE.Mesh(new THREE.ConeGeometry((1.7 - i * 0.45) * s, 1.1 * s, 8), std(0xffffff));
        snow.position.y = (2.45 + i * 1.35) * s; g.add(snow);
      }
      g.position.set(px, 0, pz); lvl.group.add(g);
    };
    for (let i = 0; i < 26; i++) {
      const side = i % 2 ? 1 : -1;
      const ppx = side * (11 + Math.random() * 9), ppz = -5 + i * 5.2;
      if (Math.abs(ppx) < 18 && ppz > 26 && ppz < 82) continue; // estaciones y puerta
      pineAt(ppx, ppz, 0.8 + Math.random() * 0.7);
    }
    // ⛄ muñecos de nieve
    const snowmanAt = (sx, sz) => {
      const g = new THREE.Group(); const wm = std(0xffffff);
      [[1.1, 1.1], [0.8, 2.6], [0.55, 3.7]].forEach(([r, y]) => {
        const b = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), wm); b.position.y = y; g.add(b);
      });
      const eyeM = new THREE.MeshBasicMaterial({ color: 0x222222 });
      [-0.2, 0.2].forEach(ex => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), eyeM); e.position.set(ex, 3.85, 0.48); g.add(e); });
      const nose = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.5, 6), std(0xff8c2e));
      nose.rotation.x = Math.PI / 2; nose.position.set(0, 3.7, 0.7); g.add(nose);
      g.position.set(sx, 0, sz); lvl.group.add(g);
    };
    snowmanAt(9, 14); snowmanAt(-10, 20); snowmanAt(11, 88);
    // 🧊 lago congelado
    const lake = new THREE.Mesh(new THREE.CircleGeometry(9, 26),
      new THREE.MeshStandardMaterial({ color: 0x9fd8f0, roughness: 0.25, metalness: 0.35, emissive: 0x4d9fc4, emissiveIntensity: 0.25 }));
    lake.rotation.x = -Math.PI / 2; lake.position.set(-24, 0.04, 55); lvl.group.add(lake);
    // 🚡 telesilla decorativo
    for (let i = 0; i < 5; i++) {
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 9, 6), std(0x555566));
      tower.position.set(38, 4.5, 30 + i * 18); lvl.group.add(tower);
      const chair = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1, 0.4), std(0xd23c3c));
      chair.position.set(36.5, 7.6, 32 + i * 18); lvl.group.add(chair);
    }
    const cable = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 95), std(0x333344));
    cable.position.set(37.2, 8.6, 64); lvl.group.add(cable);
    // 💡 las farolas de la ciudad ya vienen de buildCityBase
    // ❄️ nieve cayendo
    lvl.ambient = { colors: [0xffffff, 0xd8efff], rate: 30, area: 60, up: -1.4, size: 0.28 };
  }
}

/* ---------- constructores ---------- */
function addPlatform(lvl, x, topY, z, w, d, opts) {
  opts = opts || {};
  const h = opts.h || 1;
  const palettes = [
    { c: 0x1a1440, e: 0x00e5ff }, // neón
    { c: 0x33231a, e: 0xff6a00 }, // lava
    { c: 0xffffff, e: 0x7edbff }, // dulce
    { c: 0x9c7a4d, e: 0x35c759 }, // immokalee (madera cálida + verde)
    { c: 0x3f7a3a, e: 0x9dff6e }, // honduras (jungla)
    { c: 0xc98a4b, e: 0xffb300 }, // méxico (desierto cálido)
    { c: 0x4a5a7a, e: 0xff5a5a }, // usa (ciudad)
    { c: 0xb08968, e: 0xffd23f }, // españa (plaza terracota)
    { c: 0xdfeefc, e: 0x9fd8ff }, // nieve (hielo)
  ];
  const pal = palettes[lvl.idx];
  const mat = new THREE.MeshStandardMaterial({
    color: opts.color != null ? opts.color : pal.c,
    roughness: opts.matte ? 0.95 : 0.6, metalness: opts.matte ? 0 : 0.15,
    emissive: opts.emissive != null ? opts.emissive : pal.e,
    emissiveIntensity: opts.kind === 'pad' ? 0.9 : 0.35,
    transparent: !!opts.ghost
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, topY - h / 2, z);
  mesh.receiveShadow = true; // el suelo recibe las sombras suaves
  lvl.group.add(mesh);
  // borde brillante para pads
  if (opts.kind === 'pad') {
    const ring = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 0.15, d * 0.7),
      new THREE.MeshBasicMaterial({ color: 0x59ff7a }));
    ring.position.set(x, topY + 0.08, z);
    lvl.group.add(ring);
  }
  const p = {
    mesh, x, z, topY, w, h, d, kind: opts.kind || 'static',
    solid: true, ghostT: 0, ghostState: 'solid',
    baseX: x, baseZ: z, dx: 0, dz: 0,
    move: opts.move || null, pad: opts.pad || null,
    ghost: opts.ghost || null, phase: Math.random() * TAU
  };
  lvl.platforms.push(p);
  return p;
}
function ground(lvl, color) { // piso decorativo grande bajo el nivel (debajo de killY, no afecta el recorrido)
  const g = new THREE.Mesh(new THREE.BoxGeometry(500, 2, 500),
    new THREE.MeshStandardMaterial({ color, roughness: 1, metalness: 0 }));
  g.position.set(0, -14, 150);
  lvl.group.add(g);
  const p = {
    mesh: g, x: 0, z: 150, topY: -13, w: 500, h: 2, d: 500, kind: 'static',
    solid: true, ghostT: 0, ghostState: 'solid',
    baseX: 0, baseZ: 150, dx: 0, dz: 0,
    move: null, pad: null, ghost: null, phase: 0
  };
  lvl.platforms.push(p);
  return p;
}
function addSweeper(lvl, x, topY, z, o) {
  o = o || {};
  const grp = new THREE.Group(); grp.position.set(x, topY, z);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 2.6, 10),
    new THREE.MeshStandardMaterial({ color: 0x3949ab, roughness: 0.5 }));
  pole.position.y = 1.3; grp.add(pole);
  const armLen = o.armLen || 3.4, armW = o.armW || 0.7;
  const arm = new THREE.Mesh(new THREE.BoxGeometry(armLen * 2, armW, armW),
    new THREE.MeshStandardMaterial({ color: 0xff3d5e, emissive: 0xff3d5e, emissiveIntensity: 0.7, roughness: 0.4 }));
  arm.position.y = o.armY || 1.0; grp.add(arm);
  const tipM = new THREE.MeshBasicMaterial({ color: 0xffe95e });
  [-1, 1].forEach(sgn => {
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 10), tipM);
    tip.position.set(sgn * armLen, o.armY || 1.0, 0); grp.add(tip);
  });
  lvl.group.add(grp);
  lvl.sweepers.push({ x, z, armY: topY + (o.armY || 1.0), angle: Math.random() * TAU, speed: o.speed || 1.6, armLen, grp });
}
function addCoin(lvl, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.14, 10, 20),
    new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0xffb300, emissiveIntensity: 0.8, metalness: 0.8, roughness: 0.25 }));
  mesh.position.set(x, y, z);
  lvl.group.add(mesh);
  lvl.coins.push({ mesh, x, y, z, taken: false, mag: false });
}
function coinLine(lvl, x1, y1, z1, x2, y2, z2, n) {
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    addCoin(lvl, lerp(x1, x2, t), lerp(y1, y2, t), lerp(z1, z2, t));
  }
}
function addCheckpoint(lvl, x, topY, z) {
  const grp = new THREE.Group(); grp.position.set(x, topY, z);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3, 8),
    new THREE.MeshStandardMaterial({ color: 0x888899 }));
  pole.position.y = 1.5; grp.add(pole);
  const flag = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.7, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x555566, emissive: 0x222222 }));
  flag.position.set(0.6, 2.5, 0); grp.add(flag);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.1, 8, 24),
    new THREE.MeshBasicMaterial({ color: 0x555566 }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.1; grp.add(ring);
  lvl.group.add(grp);
  lvl.checkpoints.push({ x, y: topY, z, active: false, grp, flag, ring });
}
function geayiArchTexture() { // letrero del arco de bienvenida (mundo libre: sin cuadros de meta)
  const c = document.createElement('canvas'); c.width = 512; c.height = 104;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 512, 0);
  gr.addColorStop(0, '#7b2fff'); gr.addColorStop(0.5, '#ff2fd6'); gr.addColorStop(1, '#00a2ff');
  g.fillStyle = gr; g.fillRect(0, 0, 512, 104);
  g.font = 'bold 62px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 6; g.strokeStyle = '#ffffff'; g.strokeText('GEAYI', 256, 54);
  g.fillStyle = '#ffe95e'; g.fillText('GEAYI', 256, 54);
  return new THREE.CanvasTexture(c);
}
function addFinish(lvl, x, topY, z) {
  // GEAYI mundo libre: el arco ya no es meta de carrera, es arco de bienvenida decorativo.
  const grp = new THREE.Group(); grp.position.set(x, topY, z);
  const postM = new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0xffb300, emissiveIntensity: 0.5, metalness: 0.6, roughness: 0.3 });
  [-1.8, 1.8].forEach(px => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.5, 4.4, 0.5), postM);
    post.position.set(px, 2.2, 0); grp.add(post);
  });
  const beam = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.9, 0.6),
    new THREE.MeshStandardMaterial({ map: geayiArchTexture(), roughness: 0.5 }));
  beam.position.y = 4.4; grp.add(beam);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 4.4),
    new THREE.MeshBasicMaterial({ color: 0xffe95e, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }));
  glow.position.y = 2.2; grp.add(glow);
  lvl.group.add(grp);
  lvl.finish = { x, y: topY, z };
}

/* ---------- nivel 1: NEON CITY ---------- */
/* ---------- nivel 1: CIUDAD NEÓN 🌃 (ciudad real: calles, aceras, edificios y tráfico) ---------- */
let _neonTexCache = [];
function neonWinTex(v) { // fachada con ventanas de neón encendidas (3 variantes)
  if (_neonTexCache[v]) return _neonTexCache[v];
  const t = canvasTex(128, 256, (c) => {
    c.fillStyle = '#101420'; c.fillRect(0, 0, 128, 256);
    const cols = ['#00e5ff', '#ff2fd6', '#ffe95e', '#7bff9e', '#ffffff'];
    let s = 1234 + v * 777;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let r = 0; r < 10; r++) for (let col = 0; col < 5; col++) {
      c.fillStyle = rnd() < 0.55 ? cols[(rnd() * cols.length) | 0] : '#05070d';
      c.fillRect(6 + col * 24, 8 + r * 24, 16, 15);
    }
  });
  _neonTexCache[v] = t;
  return t;
}
function addNeonBuilding(lvl, cx, cz, w, h, d, v) { // edificio de bloques con ventanas de neón
  const win = new THREE.MeshStandardMaterial({
    map: neonWinTex(v % 3), emissive: 0xffffff, emissiveMap: neonWinTex(v % 3),
    emissiveIntensity: 0.55, roughness: 0.85
  });
  const dark = new THREE.MeshStandardMaterial({ color: 0x11141d, roughness: 0.9 });
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [win, win, dark, dark, win, win]);
  m.position.set(cx, h / 2, cz);
  lvl.group.add(m);
  const trim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.35, d + 0.4), // cornisa de neón
    new THREE.MeshBasicMaterial({ color: [0x00e5ff, 0xff2fd6, 0xffe95e][v % 3] }));
  trim.position.set(cx, h + 0.15, cz);
  lvl.group.add(trim);
}
/* ============ CIUDADES CAMINABLES (niveles 2-9) ============
   La RUTA PRINCIPAL es una avenida a nivel del suelo: sin caídas,
   sin saltos obligatorios sobre el vacío. Todo lo difícil vive en
   la RUTA EXTREMA 🔥 opcional (phase3.js). */
/* ================= MEJORA URBANA (calles y casas más reales) =================
   Constructores compartidos: los 9 mundos mejoran a la vez. Todo a nivel de
   calle (sin saltos al vacío). Geometrías y materiales cacheados para Android. */
const _urbMats = {};
function urbMat(color, emissive, ei) {
  const k = color + '_' + (emissive || 0) + '_' + (ei || 0);
  if (!_urbMats[k]) _urbMats[k] = new THREE.MeshStandardMaterial({
    color, roughness: 0.55, metalness: 0.05,
    emissive: emissive || 0x000000, emissiveIntensity: ei || 0
  });
  return _urbMats[k];
}
function urbBasic(color) {
  const k = 'b' + color;
  if (!_urbMats[k]) _urbMats[k] = new THREE.MeshBasicMaterial({ color });
  return _urbMats[k];
}
const _urbGeos = {};
function urbGeo(key, make) { if (!_urbGeos[key]) _urbGeos[key] = make(); return _urbGeos[key]; }
function urbMatte(color) { // asfalto/aceras mate: sin brillo molesto del sol
  const k = 'matte_' + color;
  if (!_urbMats[k]) _urbMats[k] = new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0 });
  return _urbMats[k];
}

/* ventana con marco blanco, vidrio y parteluz (1 sola malla con textura) */
let _winTex = null;
function winFrameTex() {
  if (_winTex) return _winTex;
  _winTex = canvasTex(128, 160, (c, w, h) => {
    c.fillStyle = '#f7f7f7'; c.fillRect(0, 0, w, h);
    const grd = c.createLinearGradient(0, 16, 0, h - 18);
    grd.addColorStop(0, '#cdeaff'); grd.addColorStop(1, '#7fb6e6');
    c.fillStyle = grd; c.fillRect(15, 15, w - 30, h - 33);
    c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(15, 15, w - 30, 24);
    c.fillStyle = '#f7f7f7';
    c.fillRect(w / 2 - 4, 15, 8, h - 33);
    c.fillRect(15, h / 2 - 4, w - 30, 8);
    c.fillStyle = '#d9d9d9'; c.fillRect(0, h - 18, w, 18);
  });
  return _winTex;
}
/* puerta de madera con marco y manija (1 sola malla con textura) */
let _doorTx = null;
function doorTex() {
  if (_doorTx) return _doorTx;
  _doorTx = canvasTex(96, 168, (c, w, h) => {
    c.fillStyle = '#f4f4f4'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#7a4a26'; c.fillRect(10, 8, w - 20, h - 8);
    c.fillStyle = '#5e3819';
    c.fillRect(21, 24, w - 42, 50); c.fillRect(21, 90, w - 42, 50);
    c.fillStyle = '#6e452a';
    c.fillRect(27, 30, w - 54, 38); c.fillRect(27, 96, w - 54, 38);
    c.fillStyle = '#ffd76e'; c.beginPath(); c.arc(w - 25, h / 2, 6, 0, 7); c.fill();
  });
  return _doorTx;
}
/* señal de ALTO */
let _altoTx = null;
function altoTex() {
  if (_altoTx) return _altoTx;
  _altoTx = canvasTex(128, 128, (c, w, h) => {
    c.fillStyle = '#c22a20'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#ffffff'; c.lineWidth = 7; c.strokeRect(9, 9, w - 18, h - 18);
    c.fillStyle = '#ffffff'; c.font = 'bold 36px sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('ALTO', w / 2, h / 2 + 2);
  });
  return _altoTx;
}

/* ---------- casa realista: techo a dos aguas, ventanas con marco, puerta,
   porche, andador, cochera, chimenea, jardín con cerca y buzón ---------- */
function addHouse(g, x, z, o) {
  o = o || {};
  const wallC = o.wall != null ? o.wall : 0xffe0b2;
  const roofC = o.roof != null ? o.roof : 0xa34a2e;
  const W = o.w || 7, D = o.d || 6, floors = o.floors || 1;
  const FH = o.h || 3.4, H = FH * floors;
  const face = o.face || 1; // 1: frente hacia +x, -1: hacia -x
  const grp = new THREE.Group();
  const std = c => urbMat(c);
  const found = new THREE.Mesh(new THREE.BoxGeometry(W + 0.7, 0.35, D + 0.7), std(0xbdbdbd));
  found.position.y = 0.17; grp.add(found);
  const walls = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), std(wallC));
  walls.position.y = 0.35 + H / 2; grp.add(walls);
  const topY = 0.35 + H;
  // techo a dos aguas (cumbrera a lo largo de Z)
  const ov = 0.75, Rh = o.roofH || 2.1, half = W / 2 + ov;
  const ang = Math.atan2(Rh, half);
  const slabL = Math.sqrt(half * half + Rh * Rh) + 0.25;
  const roofM = std(roofC);
  [1, -1].forEach(s => {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(slabL, 0.3, D + 1.3), roofM);
    slab.position.set(s * half / 2, topY + Rh / 2, 0);
    slab.rotation.z = -s * ang;
    grp.add(slab);
  });
  // hastiales: triángulo a dos aguas (una sola geometría cacheada, escalada por casa)
  const gableGeo = urbGeo('gabletri', () => {
    const bg = new THREE.BufferGeometry();
    const Attr = THREE.Float32BufferAttribute || THREE.BufferAttribute ||
      function (a, n) { this.array = a; this.itemSize = n; };
    bg.setAttribute('position', new Attr([-0.5, 0, 0, 0.5, 0, 0, 0, 1, 0], 3));
    return bg;
  });
  [1, -1].forEach(s => {
    const gm = new THREE.Mesh(gableGeo, std(wallC));
    gm.scale.set(W, Rh, 1);
    gm.position.set(0, topY, s * (D / 2 + 0.02));
    if (s < 0) gm.rotation.y = Math.PI;
    grp.add(gm);
  });
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.28, D + 1.3), std(roofC));
  ridge.position.set(0, topY + Rh + 0.08, 0); grp.add(ridge);
  // ventanas con marco 3D (marco con profundidad + repisa, no planos)
  const winM = new THREE.MeshBasicMaterial({ map: winFrameTex() });
  const winG = urbGeo('hwin', () => new THREE.PlaneGeometry(1.15, 1.45));
  const winFrM = std(0xf7f7f7);
  const addWinFrame = (x, y, z, ry) => {
    const fr = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.7, 0.14), winFrM);
    fr.position.set(x, y, z); fr.rotation.y = ry; grp.add(fr);
    const sill = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 0.32), winFrM);
    const ox = Math.sin(ry), oz = Math.cos(ry); // hacia afuera de la pared
    sill.position.set(x + ox * 0.12, y - 0.92, z + oz * 0.12); sill.rotation.y = ry; grp.add(sill);
  };
  for (let f = 0; f < floors; f++) {
    const wy = 2.15 + f * FH;
    [-D / 4, D / 4].forEach(wz => {
      addWinFrame(W / 2 + 0.02, wy, wz, Math.PI / 2);
      const win = new THREE.Mesh(winG, winM);
      win.position.set(W / 2 + 0.1, wy, wz);
      win.rotation.y = Math.PI / 2;
      grp.add(win);
    });
  }
  [-1, 1].forEach(s => { // ventana lateral
    addWinFrame(0, 2.15, s * (D / 2 + 0.02), s > 0 ? 0 : Math.PI);
    const win = new THREE.Mesh(winG, winM);
    win.position.set(0, 2.15, s * (D / 2 + 0.1));
    if (s < 0) win.rotation.y = Math.PI;
    grp.add(win);
  });
  // puerta principal con marco 3D
  const dfr = new THREE.Mesh(new THREE.BoxGeometry(1.45, 2.3, 0.16), winFrM);
  dfr.position.set(W / 2 + 0.02, 1.35, 0); dfr.rotation.y = Math.PI / 2; grp.add(dfr);
  const door = new THREE.Mesh(urbGeo('hdoor', () => new THREE.PlaneGeometry(1.15, 2.0)),
    new THREE.MeshBasicMaterial({ map: doorTex() }));
  door.position.set(W / 2 + 0.11, 1.35, 0);
  door.rotation.y = Math.PI / 2; grp.add(door);
  const step = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.22, 1.7), std(0xbdbdbd));
  step.position.set(W / 2 + 0.55, 0.11, 0); grp.add(step);
  // porche
  if (o.porch !== false) {
    const px = W / 2 + 1.35;
    const slab = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.28, 3.8), std(0xcacaca));
    slab.position.set(px, 0.42, 0); grp.add(slab);
    const postG = urbGeo('hpost', () => new THREE.CylinderGeometry(0.09, 0.09, 2.5, 6));
    const postM = std(0xffffff);
    [-1.7, 1.7].forEach(pz => {
      const post = new THREE.Mesh(postG, postM);
      post.position.set(px + 1.05, 1.8, pz); grp.add(post);
    });
    const proof = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.22, 4.2), roofM);
    proof.position.set(px, 3.15, 0); grp.add(proof);
  }
  // andador + cochera
  const walk = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.12, 1.6), std(0xd6d6d6));
  walk.position.set(W / 2 + 4.7, 0.06, 0); grp.add(walk);
  const drive = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.1, 3.1), std(0x9a9a9a));
  drive.position.set(0.6, 0.05, D / 2 + 4.3); grp.add(drive);
  // chimenea
  if (o.chimney) {
    const chx = W * 0.22, chz = D * 0.18, chy = topY + Rh * 0.62;
    const ch = new THREE.Mesh(new THREE.BoxGeometry(0.95, 2.6, 0.95), std(0x9e5b45));
    ch.position.set(chx, chy, chz); grp.add(ch);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.25, 1.25), std(0x7a7a7a));
    cap.position.set(chx, chy + 1.4, chz); grp.add(cap);
  }
  // cerca del jardín (frontal)
  if (o.fence) {
    const fx = W / 2 + 6.4, fenceM = std(0xf5f5f5);
    for (let fz = -4; fz <= 4; fz += 1.6) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.0, 0.14), fenceM);
      post.position.set(fx, 0.5, fz); grp.add(post);
    }
    [-0.22, 0.22].forEach(ry => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 8.4), fenceM);
      rail.position.set(fx, 0.62 + ry, 0); grp.add(rail);
    });
  }
  // arbustos con volumen (racimo de 3 esferas) + buzón
  const bushG = urbGeo('hbush', () => new THREE.SphereGeometry(0.6, 8, 6));
  const bushM = std(o.bush != null ? o.bush : 0x2e7d4f);
  [[W / 2 + 0.9, -D / 2 - 0.2], [W / 2 + 0.9, D / 2 + 0.2]].forEach(([bx, bz]) => {
    [[0, 0.5, 0, 1], [0.5, 0.35, 0.3, 0.7], [-0.45, 0.38, -0.25, 0.75]].forEach(([ox, oy, oz, k]) => {
      const b = new THREE.Mesh(bushG, bushM);
      b.position.set(bx + ox, oy, bz + oz); b.scale.set(k, k, k);
      grp.add(b);
    });
  });
  if (o.mailbox !== false) {
    const mbx = W / 2 + 6.4;
    const mp = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.1, 0.12), std(0x5a5a5a));
    mp.position.set(mbx, 0.55, 1.3); grp.add(mp);
    const mb = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.35, 0.35), std(0x2e5aa8));
    mb.position.set(mbx, 1.25, 1.3); grp.add(mb);
    const flag = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.08), std(0xd32f2f));
    flag.position.set(mbx + 0.25, 1.5, 1.3); grp.add(flag);
  }
  grp.position.set(x, 0, z);
  if (face < 0) grp.rotation.y = Math.PI;
  g.add(grp);
  return grp;
}

/* ---------- mobiliario urbano ---------- */
function addStreetLamp(g, x, z, color) { // farola con base, brazo y farol
  const poleM = urbMat(0x2a2f3d);
  const base = new THREE.Mesh(urbGeo('polebase', () => new THREE.CylinderGeometry(0.22, 0.3, 0.45, 8)), poleM);
  base.position.set(x, 0.22, z); g.add(base); Stream.reg(base, x, z);
  const pole = new THREE.Mesh(urbGeo('pole', () => new THREE.CylinderGeometry(0.1, 0.14, 5.6, 8)), poleM);
  pole.position.set(x, 2.8, z); g.add(pole); Stream.reg(pole, x, z);
  const dir = x > 0 ? -1 : 1; // brazo hacia la calle
  const arm = new THREE.Mesh(urbGeo('arm', () => new THREE.BoxGeometry(1.7, 0.12, 0.12)), poleM);
  arm.position.set(x + dir * 0.8, 5.5, z); g.add(arm); Stream.reg(arm, x, z);
  const head = new THREE.Mesh(urbGeo('lamphead', () => new THREE.BoxGeometry(0.7, 0.18, 0.34)), poleM);
  head.position.set(x + dir * 1.6, 5.42, z); g.add(head); Stream.reg(head, x, z);
  const panel = new THREE.Mesh(urbGeo('lamppanel', () => new THREE.BoxGeometry(0.55, 0.06, 0.24)), urbBasic(color));
  panel.position.set(x + dir * 1.6, 5.32, z); g.add(panel); Stream.reg(panel, x, z);
  // halo de luz barato (sprite aditivo, sin post-procesado) — tenue para no tapar la vista
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: softTex, color, transparent: true, opacity: 0.22,
    depthWrite: false, blending: THREE.AdditiveBlending
  }));
  halo.scale.set(1.8, 1.8, 1);
  halo.position.set(x + dir * 1.6, 5.25, z); g.add(halo); Stream.reg(halo, x, z);
}
function addTree(g, x, z, s, leaf) { // árbol: tronco + copa (optimizado: 2 mallas)
  s = s || 1; leaf = leaf == null ? 0x2e8b57 : leaf;
  const trunk = new THREE.Mesh(urbGeo('trunk', () => new THREE.CylinderGeometry(0.22, 0.32, 2.2, 7)), urbMat(0x6b4a2e));
  trunk.position.set(x, 1.1 * s, z); trunk.scale.set(s, s, s); g.add(trunk); Stream.reg(trunk, x, z);
  const c1 = new THREE.Mesh(urbGeo('canopy', () => new THREE.SphereGeometry(1.6, 9, 7)), urbMat(leaf));
  c1.position.set(x, 3.5 * s, z); c1.scale.set(s, s * 1.1, s); g.add(c1); Stream.reg(c1, x, z);
}
function addTrafficLight(g, x, z, dir) { // semáforo (dir: hacia dónde mira, ±1 en x)
  const poleM = urbMat(0x30343d);
  const tlbase = new THREE.Mesh(urbGeo('tlbase', () => new THREE.CylinderGeometry(0.2, 0.26, 0.4, 8)), poleM);
  tlbase.position.set(x, 0.2, z); g.add(tlbase);
  const pole = new THREE.Mesh(urbGeo('tlpole', () => new THREE.CylinderGeometry(0.11, 0.14, 5.2, 8)), poleM);
  pole.position.set(x, 2.6, z); g.add(pole);
  const arm = new THREE.Mesh(urbGeo('tlarm', () => new THREE.BoxGeometry(2.2, 0.14, 0.14)), poleM);
  arm.position.set(x + dir * 1.0, 5.1, z); g.add(arm);
  const head = new THREE.Mesh(urbGeo('tlhead', () => new THREE.BoxGeometry(0.5, 1.35, 0.5)), urbMat(0x1c1e24));
  head.position.set(x + dir * 2.0, 4.35, z); g.add(head);
  [0xff2d2d, 0xffb300, 0x2eff5a].forEach((c, i) => {
    const lamp = new THREE.Mesh(urbGeo('tllamp', () => new THREE.CircleGeometry(0.16, 10)),
      i === 0 ? urbBasic(c) : urbMat(0x3a3d45));
    lamp.position.set(x + dir * 2.0 + dir * 0.26, 4.8 - i * 0.45, z);
    lamp.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    g.add(lamp);
  });
}
function addStopSign(g, x, z, ry) { // señal de alto
  const pole = new THREE.Mesh(urbGeo('spole', () => new THREE.CylinderGeometry(0.07, 0.07, 2.6, 6)), urbMat(0x8a8f9a));
  pole.position.set(x, 1.3, z); g.add(pole);
  g.add(doubleFaceSign(1.15, 1.15, altoTex(), x, 2.95, z, ry || 0)); // ALTO legible por ambos lados
}
function addBench(g, x, z, ry) { // banca
  const wood = urbMat(0x8a5a33), iron = urbMat(0x3a3d45);
  const grp = new THREE.Group();
  const seat = new THREE.Mesh(urbGeo('bseat', () => new THREE.BoxGeometry(2.0, 0.12, 0.55)), wood);
  seat.position.y = 0.55; grp.add(seat);
  const back = new THREE.Mesh(urbGeo('bback', () => new THREE.BoxGeometry(2.0, 0.6, 0.1)), wood);
  back.position.set(0, 0.95, -0.26); grp.add(back);
  [-0.8, 0.8].forEach(lx => {
    const leg = new THREE.Mesh(urbGeo('bleg', () => new THREE.BoxGeometry(0.1, 0.55, 0.5)), iron);
    leg.position.set(lx, 0.28, 0); grp.add(leg);
  });
  grp.position.set(x, 0, z); grp.rotation.y = ry || 0;
  g.add(grp);
}
function addHydrant(g, x, z) { // hidrante con forma: base, cuerpo, tapas, boquilla y tuerca
  const m = urbMat(0xd32f2f), dk = urbMat(0xb71c1c);
  const base = new THREE.Mesh(urbGeo('hybase', () => new THREE.CylinderGeometry(0.4, 0.46, 0.16, 10)), m);
  base.position.set(x, 0.08, z); g.add(base);
  const body = new THREE.Mesh(urbGeo('hybody', () => new THREE.CylinderGeometry(0.28, 0.32, 0.9, 10)), m);
  body.position.set(x, 0.55, z); g.add(body);
  const top = new THREE.Mesh(urbGeo('hytop', () => new THREE.SphereGeometry(0.28, 10, 8)), m);
  top.position.set(x, 1.05, z); g.add(top);
  const nut = new THREE.Mesh(urbGeo('hynut', () => new THREE.BoxGeometry(0.15, 0.15, 0.15)), dk);
  nut.position.set(x, 1.3, z); g.add(nut);
  [-1, 1].forEach(s => {
    const cap = new THREE.Mesh(urbGeo('hycap', () => new THREE.CylinderGeometry(0.12, 0.12, 0.18, 8)), dk);
    cap.rotation.z = Math.PI / 2; cap.position.set(x + s * 0.34, 0.75, z); g.add(cap);
  });
  const noz = new THREE.Mesh(urbGeo('hynoz', () => new THREE.CylinderGeometry(0.1, 0.12, 0.24, 8)), dk);
  noz.rotation.x = Math.PI / 2; noz.position.set(x, 0.72, z + 0.36); g.add(noz);
}
function addTrashBin(g, x, z, color) { // bote de basura
  const bin = new THREE.Mesh(urbGeo('bin', () => new THREE.CylinderGeometry(0.42, 0.36, 1.0, 10)), urbMat(color || 0x2e5a3a));
  bin.position.set(x, 0.5, z); g.add(bin);
  const lid = new THREE.Mesh(urbGeo('binlid', () => new THREE.CylinderGeometry(0.45, 0.45, 0.12, 10)), urbMat(0x222528));
  lid.position.set(x, 1.05, z); g.add(lid);
}

function addCityBuilding(lvl, cx, cz, w, h, d, wall, win) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color: wall, roughness: 0.9 }));
  m.position.set(cx, h / 2, cz); lvl.group.add(m);
  const winM = new THREE.MeshBasicMaterial({ map: winFrameTex() });
  const winG = urbGeo('bwin', () => new THREE.PlaneGeometry(1.05, 1.35));
  const bfrM = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.85 });
  const bfrG = urbGeo('bwinfr', () => new THREE.BoxGeometry(1.25, 1.55, 0.12));
  const cols = Math.max(2, Math.round(w / 2.4)), rows = Math.max(1, Math.round((h - 1.5) / 2.6));
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if ((r * 5 + c * 3) % 4 === 3) continue; // algunas ventanas apagadas
    const wx = cx - w / 2 + 1.2 + c * ((w - 2.4) / Math.max(1, cols - 1));
    const wy = 2 + r * 2.6;
    if (r === 0 && Math.abs(wx - cx) < 1.3) continue; // hueco de la puerta
    [1, -1].forEach(s => { // marco con profundidad + ventana, en ambas caras
      const fr = new THREE.Mesh(bfrG, bfrM);
      fr.position.set(wx, wy, cz + s * (d / 2 + 0.02)); lvl.group.add(fr);
      const wn = new THREE.Mesh(winG, winM);
      wn.position.set(wx, wy, cz + s * (d / 2 + 0.09));
      if (s < 0) wn.rotation.y = Math.PI; lvl.group.add(wn);
    });
  }
  const dfr = new THREE.Mesh(urbGeo('bdoorfr', () => new THREE.BoxGeometry(1.6, 2.5, 0.14)), bfrM);
  dfr.position.set(cx, 1.45, cz + d / 2 + 0.02); lvl.group.add(dfr);
  const door = new THREE.Mesh(urbGeo('bdoor', () => new THREE.PlaneGeometry(1.3, 2.2)),
    new THREE.MeshBasicMaterial({ map: doorTex() }));
  door.position.set(cx, 1.45, cz + d / 2 + 0.1); lvl.group.add(door);
  const frieze = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.35, d + 0.3), bfrM); // friso bajo la cornisa
  frieze.position.set(cx, h - 0.35, cz); lvl.group.add(frieze);
  const trim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.35, d + 0.5),
    new THREE.MeshStandardMaterial({ color: wall, emissive: win, emissiveIntensity: 0.4 }));
  trim.position.set(cx, h + 0.15, cz); lvl.group.add(trim);
  if (h >= 8) { // balcones en la fachada con barandal
    const railM = new THREE.MeshStandardMaterial({ color: 0x3a3d45, roughness: 0.6, metalness: 0.3 });
    [4.6, 7.2].forEach((by, bi) => {
      if (by > h - 1.6) return;
      const bx = cx + (bi % 2 ? 1 : -1) * (w / 4);
      const slab = new THREE.Mesh(urbGeo('balc', () => new THREE.BoxGeometry(2.0, 0.16, 0.9)), bfrM);
      slab.position.set(bx, by, cz + d / 2 + 0.45); lvl.group.add(slab);
      const rail = new THREE.Mesh(urbGeo('balcrail', () => new THREE.BoxGeometry(2.0, 0.08, 0.08)), railM);
      rail.position.set(bx, by + 0.85, cz + d / 2 + 0.86); lvl.group.add(rail);
      [-0.9, 0.9].forEach(px => {
        const post = new THREE.Mesh(urbGeo('balcpost', () => new THREE.BoxGeometry(0.08, 0.85, 0.08)), railM);
        post.position.set(bx + px, by + 0.45, cz + d / 2 + 0.86); lvl.group.add(post);
      });
    });
  }
}

/* cuadras de edificios a los lados de la avenida (sides: [-1,1] o [1]) */
function cityBlockRow(lvl, walls, win, hMin, hMax, sides) {
  sides = sides || [-1, 1];
  let bi = 0;
  [[18, 40], [50, 64], [75, 89], [100, 120]].forEach(([z0, z1]) => {
    const zm = (z0 + z1) / 2, q = (z1 - z0) / 2 - 1;
    sides.forEach(s => {
      const h1 = hMin + (bi % 4) * ((hMax - hMin) / 3);
      addCityBuilding(lvl, s * 27, zm - q / 2, 10, h1, 9, walls[bi % walls.length], win); bi++;
      const h2 = hMin + ((bi + 1) % 4) * ((hMax - hMin) / 3);
      addCityBuilding(lvl, s * 35, zm + q / 2, 7, h2, 8, walls[bi % walls.length], win); bi++;
    });
  });
}

/* base de ciudad: losa, aceras anchas con bordillo, líneas viales dobles,
   cruces peatonales, farolas, árboles, semáforos, altos, bancas, hidrantes */
function buildCityBase(lvl, th) {
  const A = (x, y, z, w, d, o) => addPlatform(lvl, x, y, z, w, d, o);
  const G = lvl.group;
  A(0, 0, 55, 78, 142, { color: th.slab, emissive: th.slabE, matte: true }); // x∈[-39,39], z∈[-16,126]
  // 🛟 red de seguridad invisible: si el jugador sale de la losa, aterriza aquí en vez de caer al vacío
  try {
    const _net = A(0, -0.6, 55, 900, 900, { color: 0x111111, matte: true });
    if (_net && _net.mesh) _net.mesh.visible = false;
  } catch (e) {}
  // aceras más anchas (5 m) a los lados de la avenida
  const SW = { color: th.walk, emissive: th.walkE, matte: true };
  const blocks = [[-14, 17], [23, 42], [48, 67], [73, 92], [98, 124]];
  [-6, 6].forEach(sx => {
    blocks.forEach(([z0, z1]) => A(sx, 0.18, (z0 + z1) / 2, 5, z1 - z0, SW));
  });
  // bordillo en el borde de cada acera (visual)
  const curbM = urbMat(th.curb != null ? th.curb : 0xcfd4da);
  [-3.34, 3.34].forEach(cx => {
    blocks.forEach(([z0, z1]) => {
      const curb = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.34, z1 - z0), curbM);
      curb.position.set(cx, 0.17, (z0 + z1) / 2); G.add(curb);
    });
  });
  // calzada de asfalto (visual, entre los bordillos)
  const asph = new THREE.Mesh(new THREE.BoxGeometry(6.7, 0.05, 134),
    urbMatte(th.asphalt != null ? th.asphalt : 0x3a3f45));
  asph.position.set(0, 0, 55); G.add(asph);
  // doble línea amarilla central (se interrumpe en los cruces) + líneas blancas de borde
  const yelM = urbBasic(0xffc400), edgeM = urbBasic(0xf2f2f2);
  [[-12, 18], [22, 43], [47, 68], [72, 93], [97, 122]].forEach(([z0, z1]) => {
    [-0.32, 0.32].forEach(lx => {
      const ln = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, z1 - z0), yelM);
      ln.position.set(lx, 0.035, (z0 + z1) / 2); G.add(ln);
    });
  });
  [-2.9, 2.9].forEach(lx => {
    const ln = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 134), edgeM);
    ln.position.set(lx, 0.035, 55); G.add(ln);
  });
  // cruces peatonales (franjas blancas)
  const crossM = urbBasic(0xffffff);
  const crossG = urbGeo('cross', () => new THREE.BoxGeometry(0.7, 0.03, 2.4));
  [20, 45, 70, 95].forEach(cz => {
    for (let sx = -3; sx <= 3; sx += 1.2) {
      const st = new THREE.Mesh(crossG, crossM);
      st.position.set(sx, 0.045, cz); G.add(st);
    }
  });
  // farolas con brazo hacia la calle
  const cols = th.lamps;
  [-1, 1].forEach(s => [14, 38, 62, 86, 110].forEach((lz, li) => {
    addStreetLamp(G, s * 11.5, lz, cols[li % cols.length]); // poste fuera de la acera (no estorba)
  }));
  // árboles en la franja verde
  if (th.trees !== false) {
    const leaf = th.treeLeaf != null ? th.treeLeaf : 0x2e8b57;
    const zA = [-6, 14, 34, 54, 74, 94, 114], zB = [4, 24, 44, 64, 84, 104];
    zA.forEach((tz, i) => addTree(G, 11.5, tz, 0.9 + (i % 3) * 0.15, leaf));
    zB.forEach((tz, i) => addTree(G, -11.5, tz, 0.9 + ((i + 1) % 3) * 0.15, leaf));
  }
  // semáforos en dos cruces
  [[10.8, 42, -1], [-10.8, 42, 1], [10.8, 92, -1], [-10.8, 92, 1]].forEach(([tx, tz, d]) =>
    addTrafficLight(G, tx, tz, d));
  // señales de alto en la acera (x=±7): fuera de la calzada, no estorban
  addStopSign(G, 7, 22, Math.PI);
  addStopSign(G, -7, 68, 0);
  // bancas en las aceras (mirando a la calle)
  addBench(G, 6.8, 30, -Math.PI / 2);
  addBench(G, -6.8, 80, Math.PI / 2);
  // hidrantes y botes de basura
  addHydrant(G, 9.2, 12);
  addHydrant(G, -9.2, 105);
  addTrashBin(G, 8.8, 36, th.bin != null ? th.bin : 0x2e5a3a);
  addTrashBin(G, -8.8, 62, th.bin != null ? th.bin : 0x2e5a3a);
  addTrashBin(G, 8.8, 100, th.bin != null ? th.bin : 0x2e5a3a);
  const meta = LEVELS[lvl.idx];
  addSign3D(lvl, 8.6, 0, -12, [meta.emoji + ' ' + T(meta.nameKey), T(meta.descKey)],
    { bg: th.signBg, border: th.signBorder, fg: '#ffffff', pw: 7, ph: 2.6, hang: true }); // 🪧 en la orilla, colgando (no en medio)
  addCheckpoint(lvl, 7, 0, 30); // 🚩 bien adentro de la acera (x=7): fuera de la calzada
  addCheckpoint(lvl, 7, 0, 62);
  addCheckpoint(lvl, 7, 0, 94);
  coinLine(lvl, 0, 1.3, -6, 0, 1.3, 114, 14);
  addFinish(lvl, 0, 0, 118);
  lvl.start = { x: 0, y: 0, z: 0 };
  lvl.killY = -12;
  // 🎯🥋 dianas y tablas de práctica: las técnicas (agua/karate) se usan en cualquier ciudad
  try {
    if (typeof Powers !== 'undefined' && Powers && typeof Powers.placeTargets === 'function') {
      Powers.placeTargets(G, [[12, 48], [-12, 74], [12, 108]]);
      Powers.placeBoards(G, [[-12, 20], [12, 40]]);
    }
  } catch (e) {}
}

function buildLevel1(lvl) {
  buildNeonCity(lvl); // 🌃 Ciudad Neón gigante (neoncity.js)
}



/* ---------- nivel 2: VOLCÁN DE LAVA (ciudad volcánica caminable) ---------- */
function buildLevel2(lvl) {
  const G = lvl.group;
  buildCityBase(lvl, { slab: 0x2b2226, slabE: 0x3a1200, walk: 0x5a4a40, walkE: 0x2a0e00, curb: 0x6b4a30,
    dash: 0xffb300, lamps: [0xff6a00, 0xffb300, 0xff3d00], signBg: '#2a0e00', signBorder: '#ff6a00',
    treeLeaf: 0x8a5a2a, asphalt: 0x241d1a });
  cityBlockRow(lvl, [0x241d1a, 0x33261e], 0xff7a1a, 10, 20); // edificios de basalto con ventanas de lava
  [[-20, 30], [-20, 70], [-20, 100]].forEach(([hx, hz], i) => { // casas de piedra volcánica
    addHouse(lvl.group, hx, hz, { wall: [0x4a3a30, 0x3d2f28, 0x554034][i % 3], roof: 0x241a12, face: 1, fence: false, chimney: true, bush: 0x6e4a2f });
  });
  [[9.8, 30], [-9.8, 62], [9.8, 94]].forEach(([lx, lz]) => { // grietas de lava decorativas
    const crack = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 14),
      new THREE.MeshBasicMaterial({ color: 0xff5a00 }));
    crack.position.set(lx, 0.03, lz); G.add(crack);
  });
  addAirport(lvl, -12, 0, 8); // ✈️ aeropuerto
}

/* ---------- nivel 3: DULCE HIELO (ciudad de caramelo) ---------- */
function buildLevel3(lvl) {
  buildCityBase(lvl, { slab: 0xf2e4f5, slabE: 0x8a6bb8, walk: 0xffffff, walkE: 0x9fd8ff, curb: 0xff9ecd,
    dash: 0xff4d6d, lamps: [0xff7edb, 0x7edbff, 0xffe95e], signBg: '#7a2d5e', signBorder: '#ff7edb',
    treeLeaf: 0xff9ecd, asphalt: 0xd9c8e8 });
  cityBlockRow(lvl, [0xffb3d9, 0xb9e8ff, 0xfff3b0], 0xffffff, 8, 15); // edificios de caramelo
  [[17.5, 30], [17.5, 70], [17.5, 105]].forEach(([hx, hz], i) => { // casitas de caramelo
    addHouse(lvl.group, hx, hz, { wall: [0xffb3d9, 0xb9e8ff, 0xfff3b0][i % 3], roof: [0xff6fa5, 0x7ec8ff, 0xffd23f][i % 3], face: -1, fence: false, bush: 0xff9ecd });
  });
  addAirport(lvl, -12, 0, 8); // ✈️ aeropuerto
}

/* ---------- nivel 4: IMMOKALEE, FL (pueblo tropical caminable) ---------- */
function buildLevel4(lvl) {
  const G = lvl.group;
  buildCityBase(lvl, { slab: 0xd3c5a3, slabE: 0x57503a, walk: 0xf2dd9a, walkE: 0x7a6a3d, curb: 0xd9b382,
    dash: 0xffe95e, lamps: [0xffe95e, 0xffffff, 0xffe95e], signBg: '#0d4d1f', signBorder: '#35c759',
    trees: false, asphalt: 0x3b4038 }); // Immokalee ya tiene palmeras
  // edificios bajos al ESTE (al oeste está el rancho); Main Street ya decora la avenida
  [[18, 40], [50, 64], [75, 89]].forEach(([z0, z1], bi) => {
    addCityBuilding(lvl, 27, (z0 + z1) / 2, 10, 6 + (bi % 3) * 1.5, 9,
      [0xff9e2c, 0xff5e3a, 0xffe95e, 0x4df08a][bi % 4], 0x9fd8ff); // colores tropicales eléctricos
  });
  [-10, 10].forEach(px => [22, 70, 100].forEach(pz => makePalm(px, pz, 0.75, G)));
  // ✈️ el aeropuerto ahora está al NORESTE (se construye en decorate)
}

/* ---------- nivel 5: HONDURAS 🇭🇳 (ciudad entre la selva) ---------- */
function buildLevel5(lvl) {
  buildCityBase(lvl, { slab: 0x4a5a48, slabE: 0x1d3a24, walk: 0xd8cba8, walkE: 0x6b5f3d, curb: 0x9fd8a8,
    dash: 0xffe95e, lamps: [0x9dff6e, 0xffffff, 0xffe95e], signBg: '#0d3d1f', signBorder: '#9dff6e',
    treeLeaf: 0x2e7d4f, asphalt: 0x3f4a3d });
  cityBlockRow(lvl, [0x8a6a42, 0x6f8f5a], 0xffe95e, 8, 15);
  addAirport(lvl, 12, 0, 8); // ✈️ aeropuerto
}

/* ---------- nivel 6: MÉXICO 🇲🇽 (ciudad de fiesta) ---------- */
function buildLevel6(lvl) {
  buildCityBase(lvl, { slab: 0xb08968, slabE: 0x5e3a1a, walk: 0xf2e2c0, walkE: 0x8a6a42, curb: 0xffd23f,
    dash: 0xffffff, lamps: [0xffd23f, 0xff6f00, 0x2e7d32], signBg: '#5e1f1f', signBorder: '#ffd23f',
    treeLeaf: 0x3f8f4f, asphalt: 0x6b5a48 });
  cityBlockRow(lvl, [0xe08a4b, 0xd45d79, 0xffd23f], 0xfff6d8, 8, 15);
  [[-25, 35], [-25, 65], [-25, 95]].forEach(([hx, hz], i) => { // casas mexicanas de colores
    addHouse(lvl.group, hx, hz, { wall: [0xffd6a5, 0xffb3c1, 0xfff3b0][i % 3], roof: 0x9e4a2e, face: 1, fence: false, chimney: true });
  });
  addAirport(lvl, 12, 0, 8); // ✈️ aeropuerto
}

/* ---------- nivel 7: USA 🇺🇸 (ciudad con rascacielos) ---------- */
function buildLevel7(lvl) {
  buildCityBase(lvl, { slab: 0x3d4451, slabE: 0x141a24, walk: 0xaeb8c8, walkE: 0x4a5260, curb: 0x9aa5b1,
    dash: 0xffe95e, lamps: [0xffffff, 0x9be8ff, 0xffffff], signBg: '#0a3161', signBorder: '#b31942',
    treeLeaf: 0x3f8f4f, asphalt: 0x33383f });
  // los rascacielos ya vienen de decorate(); solo cuadras bajas al este para rellenar
  cityBlockRow(lvl, [0x5a6a8a, 0x6a7a9a], 0xffe9b0, 7, 12, [1]);
  addAirport(lvl, 12, 0, 8); // ✈️ aeropuerto
}

/* ---------- nivel 8: ESPAÑA 🇪🇸 (ciudad con plaza) ---------- */
function buildLevel8(lvl) {
  buildCityBase(lvl, { slab: 0xb08968, slabE: 0x6b4423, walk: 0xfaf2e2, walkE: 0xa08a68, curb: 0xd9a066,
    dash: 0xffffff, lamps: [0xffd23f, 0xffffff, 0xffd23f], signBg: '#7a1f1f', signBorder: '#ffc400',
    treeLeaf: 0x4a8f5a, asphalt: 0x7a6a5a });
  cityBlockRow(lvl, [0xe8d5b5, 0xd9a066, 0xc98a5e], 0xffe9b0, 9, 18);
  [[-20, 30], [-20, 62], [-20, 98]].forEach(([hx, hz], i) => { // casas españolas de dos pisos
    addHouse(lvl.group, hx, hz, { wall: [0xf5e6c8, 0xefe0d0, 0xf7ead1][i % 3], roof: 0x9e4a30, face: 1, floors: 2, fence: false });
  });
  addAirport(lvl, 12, 0, 8); // ✈️ aeropuerto
}

/* ---------- nivel 9: MONTAÑA NEVADA ❄️ (pueblo nevado) ---------- */
function buildLevel9(lvl) {
  const A = (x, y, z, w, d, o) => addPlatform(lvl, x, y, z, w, d, o);
  buildCityBase(lvl, { slab: 0xdfe9f5, slabE: 0x9fc4e8, walk: 0xffffff, walkE: 0xbfe0f5, curb: 0xbfe0f5,
    dash: 0x7db8e8, lamps: [0xffc14d, 0xffffff, 0xffc14d], signBg: '#1f3d5e', signBorder: '#9fd8ff',
    trees: false, asphalt: 0x9fb2c8 }); // Montaña Nevada ya tiene pinos nevados
  cityBlockRow(lvl, [0xf0f4fa, 0xdfe9f5], 0xffc14d, 6, 10, [1]); // cabañas urbanas al este
  addAirport(lvl, 12, 0, 8); // ✈️ aeropuerto
  // 🛷 escalera a la plataforma de abordaje del trineo (atracción opcional)
  for (let i = 0; i < 5; i++)
    A(-14, 1 + i, 22 + i * 2.4, 4, 2.6, { color: 0xbfe0f5, emissive: 0x7db8e8 });
  // 🛷 pista de trineo (lateral, opcional)
  const sledPath = [];
  for (let i = 0; i <= 7; i++) {
    const sy = 6 - i * 0.8, sz = 40 + i * 8;
    A(-14, sy, sz, 4, 9.5, { color: 0xbfe0f5, emissive: 0x7db8e8 });
    sledPath.push({ x: -14, y: sy, z: sz });
  }
  A(-14, 6, 34, 5, 5); // plataforma de abordaje
  coinLine(lvl, -14, 7, 36, -14, 1.6, 92, 6);
  if (typeof addSled === 'function') addSled(lvl, -14, 6, 34, sledPath);
}

const BUILDERS = [buildLevel1, buildLevel2, buildLevel3, buildLevel4, buildLevel5, buildLevel6, buildLevel7, buildLevel8, buildLevel9];

function buildLevel(idx) {
  clearLevel();
  WALL_SOLIDS.length = 0; // colisionadores de edificios entrables (se re-registran al construir)
  CUTAWAY.length = 0; // recorte de cámara (se re-registra al construir)
  SHOP3D.length = 0; // tiendas físicas (se re-registran al construir)
  SHOPKEEPERS.length = 0; _keeperIdx = 0; // dependientes (se re-registran al construir)
  INTERIORS.length = 0; CEILINGS.length = 0; TOUCHABLES.length = 0; // interiores y objetos tocables
  const lvl = {
    idx, group: new THREE.Group(),
    platforms: [], sweepers: [], coins: [], checkpoints: [],
    planes: [], cars: [], npcs: [], // FASE 2: vehículos y peatones
    decoSpinners: [], finish: null, lavaTex: null, ambient: null,
    start: { x: 0, y: 0, z: 0 }, killY: -12, ambAcc: 0
  };
  scene.add(lvl.group);
  decorate(idx, lvl);
  BUILDERS[idx](lvl);
  if (typeof addPhase2Content === 'function') addPhase2Content(idx, lvl); // FASE 2
  if (typeof addPhase3Content === 'function') addPhase3Content(idx, lvl); // FASE 3
  // módulos de juego: casa, pesca, carreras, observatorio y rancho (mundo 4)
  if (typeof addCasaContent === 'function') addCasaContent(idx, lvl);
  if (typeof addFishingContent === 'function') addFishingContent(idx, lvl);
  if (typeof addRacingContent === 'function') addRacingContent(idx, lvl);
  if (typeof addObservatoryContent === 'function') addObservatoryContent(idx, lvl);
  if (typeof addRanchContent === 'function') addRanchContent(idx, lvl);
  flushWallSolids(lvl); // 🏠 vuelca los colisionadores de edificios entrables a lvl.platforms
  lvl.houses = (lvl.group.userData.houses || []).slice(); // 🧰 trabajos: casas pintables (Immokalee)
  return lvl;
}
function clearLevel() {
  if (!LEVEL.group) return;
  scene.remove(LEVEL.group);
  LEVEL.group.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
  });
  LEVEL.group = null;
}
