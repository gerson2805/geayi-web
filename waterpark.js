/* waterpark.js — 🌊 PARQUE ACUÁTICO GEAYI (Obby Xtreme 3D)
   Parque acuático 100% original en Immokalee (mundo 4 · idx 3), anexo a la
   playa de funpark.js (NO duplica su sistema de nado):
   - 3 toboganes gigantes de diseño propio (colores caramelo):
     (a) 🍬 Recto Caramelo — recto y empinado,
     (b) 🍭 Serpiente Dulce — con curvas en S,
     (c) 🌀 Tubo Misterio — tubo cerrado.
   - El jugador SUBE CAMINANDO por una rampa de 10° (patrón heightfield de
     bridges.js: envuelve moveAxis, sin tocar player.js) hasta la cima (~10 m).
   - Botón "🌊 DESLIZAR" (≥52px) junto a cada salida → baja deslizándose con
     física simple (acelera en bajadas, sigue las curvas) y cae a una alberca
     segura (sin daño); al salir camina normal.
   - Extras baratos: regaderas, camastros, sombrillas, letreros, NPC tomando
     sol, palmeras y cerca perimetral.
   UBICACIÓN (verificada libre por script contra edificios/lámparas/cultivos):
   torre (-165,108), rampas x∈[-181,-169] z∈[40,108], toboganes hacia el sur,
   alberca x∈[-192,-138] z∈[134,156], camastros al este.
   REGLAS: sin saltos obligatorios · caída segura al agua · mundo abierto ·
   sin premium · no rompe módulos existentes · sin DOM al cargar. */
'use strict';

/* ---------- i18n (es/en; T() respalda a español) ---------- */
if (typeof addStrings === 'function') {
  addStrings('es', {
    'wp.title': '🌊 PARQUE ACUÁTICO GEAYI',
    'wp.slide': '🌊 DESLIZAR',
    'wp.enter': '🌊 ENTRADA · sube por la rampa',
    'wp.choose': '🛝 Elige tu tobogán',
    'wp.s1': '🍬 Recto Caramelo',
    'wp.s2': '🍭 Serpiente Dulce',
    'wp.s3': '🌀 Tubo Misterio',
    'wp.splash': '💦 ¡Chapuzón! Sal caminando de la alberca 💙',
    'wp.climb': '🚶 Sube la rampa hasta la cima del tobogán',
  });
  addStrings('en', {
    'wp.title': '🌊 GEAYI WATER PARK',
    'wp.slide': '🌊 SLIDE',
    'wp.enter': '🌊 ENTRANCE · walk up the ramp',
    'wp.choose': '🛝 Pick your slide',
    'wp.s1': '🍬 Candy Straight',
    'wp.s2': '🍭 Sweet Snake',
    'wp.s3': '🌀 Mystery Tube',
    'wp.splash': '💦 Splash! Walk out of the pool 💙',
    'wp.climb': '🚶 Walk up the ramp to the top of the slide',
  });
}

/* ================= constantes del parque ================= */
const WP_IDX = 3;                 // solo Immokalee (mundo 4)
const WP_TOP = 10;                // altura de la cima
const WP_RAMP_HW = 1.6;           // medio ancho de rampa
const WP_POOL = { x0: -192, x1: -138, z0: 134, z1: 156 }; // alberca
const WP_DECK = { x0: -168.5, x1: -161.5, z0: 104.5, z1: 111.5, y: WP_TOP };
/* rampas de 10° (x fija, zA→zB, yA→yB) + descansos planos */
const WP_RAMPS = [
  { x: -181, zA: 104, zB: 76, yA: 0, yB: 4.93 },    // tramo 1 (desde el suelo)
  { x: -177, zA: 72, zB: 44, yA: 4.93, yB: 9.87 },  // tramo 2
  { x: -165, zA: 44, zB: 106, yA: 9.87, yB: 10 },   // tramo 3: entra directo a la cima
];
const WP_TURNS = [
  { x0: -181, x1: -177, z0: 72, z1: 76, y: 4.93 },
  { x0: -177, x1: -163, z0: 40, z1: 44, y: 9.87 },
];
/* toboganes: puntos de control [x, y, z] de la superficie de deslizamiento */
const WP_SLIDES = [
  { id: 'recto', tube: false, c1: 0xff5e7a, c2: 0xffffff,
    pts: [[-165, 9.7, 111.5], [-165, 0.4, 140]] },
  { id: 'serpiente', tube: false, c1: 0xffd23f, c2: 0xff8c00,
    pts: [[-161.5, 9.7, 108], [-150, 7.2, 112], [-142, 5.2, 122], [-150, 3.2, 132], [-146, 0.4, 144]] },
  { id: 'tubo', tube: true, c1: 0x29b6ff, c2: 0x9fdcff,
    pts: [[-168.5, 9.7, 108], [-180, 7.2, 100], [-188, 5, 110], [-182, 2.8, 122], [-184, 0.4, 138]] },
];

/* ================= caché (Android) ================= */
const _wpMats = new Map();
function wpMat(color, emissive, ei, extra) {
  const key = color + '|' + (emissive || 0) + '|' + (ei || 0) + '|' + (extra || '');
  let m = _wpMats.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial(Object.assign({
      color, roughness: 0.55, metalness: 0.1,
      emissive: emissive || 0x000000, emissiveIntensity: ei || 0,
    }, extra || {}));
    _wpMats.set(key, m);
  }
  return m;
}
const _wpGeos = new Map();
function wpGeo(key, make) {
  let g = _wpGeos.get(key);
  if (!g) { g = make(); _wpGeos.set(key, g); }
  return g;
}
const _r2 = v => Math.round(v * 100) / 100;
function wpBoxGeo(w, h, d) { return wpGeo('b' + _r2(w) + 'x' + _r2(h) + 'x' + _r2(d), () => new THREE.BoxGeometry(w, h, d)); }
function wpCylGeo(rt, rb, h, s) { return wpGeo('c' + _r2(rt) + 'x' + _r2(rb) + 'x' + _r2(h) + 'x' + s, () => new THREE.CylinderGeometry(rt, rb, h, s)); }
function wpMesh(parent, geo, mat, x, y, z, shadow) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  if (shadow) m.castShadow = true;
  parent.add(m);
  return m;
}
function wpSignTex(main, sub, bg, fg) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 512, 256);
  g.strokeStyle = '#ffffff'; g.lineWidth = 12; g.strokeRect(10, 10, 492, 236);
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '900 62px "Trebuchet MS",sans-serif';
  g.fillText(main, 256, sub ? 92 : 128);
  if (sub) { g.font = '700 42px "Trebuchet MS",sans-serif'; g.fillText(sub, 256, 178); }
  return new THREE.CanvasTexture(c);
}
function wpSign(parent, w, h, tex, x, y, z, ry) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
  m.position.set(x, y, z);
  m.rotation.y = ry || 0;
  parent.add(m);
  return m;
}
function wpPost(parent, x, z, h, color) {
  return wpMesh(parent, wpBoxGeo(0.22, h, 0.22), wpMat(color || 0xffffff), x, h / 2, z, false);
}

/* ================= rutas de deslizamiento ================= */
function wpSamplePath(pts) {
  const P = { x: [], y: [], z: [], cum: [0], len: 0 };
  const step = 0.6;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const segLen = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const n = Math.max(1, Math.round(segLen / step));
    for (let k = (i === 0 ? 0 : 1); k <= n; k++) {
      const t = k / n;
      P.x.push(a[0] + (b[0] - a[0]) * t);
      P.y.push(a[1] + (b[1] - a[1]) * t);
      P.z.push(a[2] + (b[2] - a[2]) * t);
    }
  }
  for (let i = 1; i < P.x.length; i++) {
    P.len += Math.hypot(P.x[i] - P.x[i - 1], P.y[i] - P.y[i - 1], P.z[i] - P.z[i - 1]);
    P.cum.push(P.len);
  }
  return P;
}
function wpPathAt(P, d) {
  d = Math.max(0, Math.min(P.len, d));
  let i = 0;
  while (i < P.cum.length - 2 && P.cum[i + 1] < d) i++;
  const c0 = P.cum[i], c1 = P.cum[i + 1] !== undefined ? P.cum[i + 1] : P.len;
  const t = c1 > c0 ? (d - c0) / (c1 - c0) : 0;
  const j = Math.min(i + 1, P.x.length - 1);
  return {
    x: P.x[i] + (P.x[j] - P.x[i]) * t,
    y: P.y[i] + (P.y[j] - P.y[i]) * t,
    z: P.z[i] + (P.z[j] - P.z[i]) * t,
    dx: P.x[j] - P.x[i], dy: P.y[j] - P.y[i], dz: P.z[j] - P.z[i],
  };
}

/* ================= estado ================= */
const WaterPark = {
  _ui: false, _wrapped: false, _els: {},
  idx: -1, park: null,
  slide: { active: false, si: 0, d: 0, v: 0 },
  _t: 0, _ppx: 0, _ppz: 0, _poolToast: false, _wasInPool: false, _showerT: 0,

  /* ---------- ciclo de vida ---------- */
  init() {
    if (this._ui) return;
    this._ui = true;
    const b = document.createElement('button');
    b.id = 'wp-slide';
    b.style.cssText = 'position:fixed;z-index:45;display:none;left:50%;transform:translateX(-50%);' +
      'bottom:120px;min-width:200px;min-height:56px;padding:12px 26px;font-size:22px;font-weight:900;' +
      'border-radius:999px;border:4px solid #fff;color:#fff;' +
      'background:linear-gradient(180deg,#29b6ff,#0a6aa8);box-shadow:0 4px 14px rgba(0,0,0,.45);font-family:inherit;';
    b.style.minHeight = '56px'; // explícito: botón táctil ≥ 52px
    b.addEventListener('click', () => {
      try { if (typeof Audio2 !== 'undefined') Audio2.init(); } catch (e) {}
      WaterPark.trySlide();
    });
    document.body.appendChild(b);
    this._els.slide = b;
    // física de rampa: envolver moveAxis (encadenado sobre bridges.js si ya lo envolvió)
    if (!this._wrapped && typeof moveAxis === 'function') {
      const prev = moveAxis;
      this._wrapped = true;
      moveAxis = function (axis, delta) { // eslint-disable-line no-global-assign
        if (axis === 'y' && delta < 0 && WaterPark.park && !WaterPark.slide.active) {
          try {
            const P = (typeof Player !== 'undefined') ? Player : null;
            if (P && P.pos) {
              const g = WaterPark.groundAt(P.pos.x, P.pos.z);
              if (g != null) {
                const py = P.pos.y;
                if (py >= g - 0.09 && py + delta <= g) {
                  P.pos.y = g; P.vel.y = 0; P.grounded = true;
                  P.groundPlat = { topY: g, kind: 'wp-ramp', solid: true, move: null };
                  return;
                }
              }
            }
          } catch (e) {}
        }
        return prev(axis, delta);
      };
    }
  },

  /* altura caminable de rampas/descansos/cima (null = sin rampa aquí) */
  groundAt(x, z) {
    if (!this.park) return null;
    for (const L of WP_RAMPS) {
      if (Math.abs(x - L.x) <= WP_RAMP_HW) {
        const zLo = Math.min(L.zA, L.zB) - 0.3, zHi = Math.max(L.zA, L.zB) + 0.3;
        if (z >= zLo && z <= zHi) {
          const t = (z - L.zA) / (L.zB - L.zA);
          return L.yA + (L.yB - L.yA) * t;
        }
      }
    }
    for (const Tn of WP_TURNS)
      if (x >= Tn.x0 - 0.3 && x <= Tn.x1 + 0.3 && z >= Tn.z0 - 0.3 && z <= Tn.z1 + 0.3) return Tn.y;
    const D = WP_DECK;
    if (x >= D.x0 - 0.3 && x <= D.x1 + 0.3 && z >= D.z0 - 0.3 && z <= D.z1 + 0.3) return D.y;
    return null;
  },

  buildForLevel(i, group) {
    this.idx = i;
    this.slide.active = false;
    this.park = null;
    this._poolToast = false;
    if (i !== WP_IDX || !group || typeof THREE === 'undefined') return;
    try {
      this._build(group);
    } catch (e) {
      this.park = null;
      if (typeof console !== 'undefined') console.warn('[waterpark] build:', e && e.message);
    }
  },

  update(dt) {
    try {
      if (typeof LEVEL === 'undefined' || !LEVEL || !LEVEL.group) return;
      if (typeof MODE !== 'undefined' && MODE !== 'play') { this._hideUI(); return; }
      const P = (typeof Player !== 'undefined' && Player) ? Player : null;
      if (!P || !P.pos || !this.park) { this._hideUI(); return; }
      this._t += dt;
      // agua de la alberca: oscilación barata (sin shaders)
      const w = this.park.water;
      if (w) {
        w.a.material.opacity = 0.5 + 0.14 * Math.sin(this._t * 1.9);
        w.b.material.opacity = 0.58 - 0.14 * Math.sin(this._t * 1.9);
      }
      // regaderas: chorro de partículas cada 0.45 s
      this._showerT -= dt;
      if (this._showerT <= 0 && this.park.showers) {
        this._showerT = 0.45;
        try {
          for (const s of this.park.showers)
            Particles.spawn(s[0], s[1], s[2], {
              n: 4, colors: [0xffffff, 0x9fd8ff], speed: 0.6, up: -1.5,
              life: 0.5, size: 0.3, spread: 0.35, grav: 9,
            });
        } catch (e) {}
      }
      // NPC tomando sol: respiración tranquila
      if (this.park.sun) this.park.sun.position.y = 0.55 + 0.03 * Math.sin(this._t * 1.4);
      if (this.slide.active) this._slideStep(dt);
      else this._poolStep(dt);
      this._uiStep();
    } catch (e) { /* nunca romper el loop del juego */ }
  },

  /* ================= deslizamiento ================= */
  _nearSlide() {
    if (!this.park) return -1;
    const P = Player.pos;
    let best = -1, bd = 3.2;
    this.park.slides.forEach((S, i) => {
      const d = Math.hypot(P.x - S.path.x[0], P.z - S.path.z[0]);
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  },
  trySlide() {
    if (this.slide.active || !this.park) return false;
    const si = this._nearSlide();
    if (si < 0) return false;
    this._beginSlide(si);
    return true;
  },
  _beginSlide(si) {
    this.slide.active = true;
    this.slide.si = si;
    this.slide.d = 0;
    this.slide.v = 2.5;
    this._hideUI();
    try { if (typeof Audio2 !== 'undefined') Audio2.boost(); } catch (e) {}
    try { toast(T('wp.s' + (si + 1)) + ' ' + T('wp.sliding')); } catch (e) {}
  },
  _slideStep(dt) {
    const S = this.park.slides[this.slide.si], P = S.path;
    const yNow = wpPathAt(P, this.slide.d).y;
    const yAhead = wpPathAt(P, Math.min(P.len, this.slide.d + 0.9)).y;
    const drop = (yNow - yAhead) / 0.9; // >0 bajando
    let v = this.slide.v + (16 * drop - 1.6) * dt; // acelera en bajadas, fricción
    v = Math.max(0, Math.min(16, v));
    this.slide.d += v * dt;
    this.slide.v = v;
    if (this.slide.d >= P.len - 0.4) { this._slideEnd(); return; }
    const at = wpPathAt(P, this.slide.d);
    Player.pos.set(at.x, at.y + 0.12, at.z);
    const hs = Math.hypot(at.dx, at.dz) || 1;
    Player.heading = Math.atan2(at.dx, at.dz);
    Player.vel.set(at.dx / hs * v, 0, at.dz / hs * v);
    Player.grounded = true;
    try { if (Avatar.group) Avatar.group.position.y -= 0.35; } catch (e) {} // postura sentada
    this._ppx = Player.pos.x; this._ppz = Player.pos.z;
    if (v > 5 && Math.random() < 0.35) {
      try {
        Particles.spawn(at.x, at.y + 0.4, at.z, {
          n: 2, colors: [0xffffff, 0x9fd8ff], speed: 1.5, up: 1.5,
          life: 0.4, size: 0.35, spread: 0.6, grav: 7,
        });
      } catch (e) {}
    }
    try {
      const sl = document.getElementById('speedlines');
      if (sl) sl.style.opacity = Math.max(0, Math.min(0.85, (v - 7) / 7));
    } catch (e) {}
  },
  _slideEnd() {
    const S = this.park.slides[this.slide.si], P = S.path;
    const end = wpPathAt(P, P.len);
    this.slide.active = false;
    this.slide.v = 0;
    Player.pos.set(end.x, 0.35, end.z); // cae a la alberca (segura, sin daño)
    Player.vel.set(0, 0, 0);
    this._ppx = end.x; this._ppz = end.z;
    try { if (typeof Audio2 !== 'undefined') Audio2.land(); } catch (e) {}
    try {
      Particles.burst(end.x, 0.7, end.z, [0xffffff, 0x9fd8ff, 0x4fd8ff], 16, 5);
    } catch (e) {}
    try { toast(T('wp.splash')); } catch (e) {}
  },

  /* alberca: chapoteo lento propio (no usa el nado de funpark) */
  _poolStep(dt) {
    const P = Player, S = WP_POOL;
    const inPool = LEVEL.idx === WP_IDX &&
      (typeof Vehicle === 'undefined' || !Vehicle || Vehicle.mode === 'none') &&
      P.pos.x > S.x0 && P.pos.x < S.x1 && P.pos.z > S.z0 && P.pos.z < S.z1;
    if (inPool) {
      if (!this._wasInPool) { this._ppx = P.pos.x; this._ppz = P.pos.z; } // entrar: sin teletransporte
      const dx = P.pos.x - this._ppx, dz = P.pos.z - this._ppz;
      P.pos.x = this._ppx + dx * 0.5; // chapoteo a ~mitad de velocidad
      P.pos.z = this._ppz + dz * 0.5;
      try { if (Avatar.group) Avatar.group.position.y -= 0.25; } catch (e) {}
      if (Math.hypot(dx, dz) > 0.05 && Math.random() < 0.25) {
        try {
          Particles.spawn(P.pos.x, 0.35, P.pos.z, {
            n: 2, colors: [0xffffff, 0x9fd8ff], speed: 1.2, up: 1.6,
            life: 0.45, size: 0.32, spread: 0.5, grav: 7,
          });
        } catch (e) {}
      }
      if (!this._poolToast) {
        this._poolToast = true;
        try { toast(T('wp.splash')); } catch (e) {}
      }
    } else {
      this._poolToast = false;
    }
    this._wasInPool = inPool;
    this._ppx = P.pos.x; this._ppz = P.pos.z;
  },

  _hideUI() { try { if (this._els.slide) this._els.slide.style.display = 'none'; } catch (e) {} },
  _uiStep() {
    const b = this._els.slide;
    if (!b) return;
    const show = !this.slide.active && this.park && LEVEL.idx === WP_IDX &&
      typeof MODE !== 'undefined' && MODE === 'play' &&
      (typeof Vehicle === 'undefined' || !Vehicle || Vehicle.mode === 'none') &&
      this._nearSlide() >= 0;
    if (show) {
      try { b.textContent = T('wp.slide'); } catch (e) {}
      if (b.style.display !== 'block') b.style.display = 'block';
    } else if (b.style.display !== 'none') {
      b.style.display = 'none';
    }
  },

  /* ================= construcción ================= */
  _build(g) {
    const slides = WP_SLIDES.map(def => ({
      id: def.id, tube: def.tube, c1: def.c1, c2: def.c2,
      path: wpSamplePath(def.pts),
    }));
    const park = { slides, water: null, showers: [], sun: null };
    this._buildRamps(g);
    this._buildTower(g);
    slides.forEach((S, i) => this._buildSlide(g, S, i));
    this._buildPool(g);
    park.water = this._pendingWater; // _buildPool lo deja en _pendingWater
    this._pendingWater = null;
    this._buildDecor(g, park);
    this.park = park;
  },

  _buildRamps(g) {
    const rampM = wpMat(0xff9ecd, 0x5e1f3a, 0.25);   // rosa caramelo
    const railM = wpMat(0xffffff, 0x9fd8ff, 0.15);
    const postM = wpMat(0x0e3a4a);
    for (const L of WP_RAMPS) {
      const dy = L.yB - L.yA, dz = L.zB - L.zA;
      const len = Math.hypot(dy, dz);
      const grp = new THREE.Group();
      grp.position.set(L.x, (L.yA + L.yB) / 2 - 0.25, (L.zA + L.zB) / 2);
      grp.lookAt(L.x, L.yB - 0.25, L.zB);
      g.add(grp);
      const floor = new THREE.Mesh(wpBoxGeo(3.2, 0.5, len + 0.6), rampM);
      floor.receiveShadow = true;
      grp.add(floor);
      // pasamanos + postes
      [-1.5, 1.5].forEach(px => {
        const rail = new THREE.Mesh(wpBoxGeo(0.12, 0.12, len + 0.6), railM);
        rail.position.set(px, 1.15, 0);
        grp.add(rail);
        for (let d = -len / 2; d <= len / 2 + 0.1; d += 4) {
          const p = new THREE.Mesh(wpBoxGeo(0.12, 1.15, 0.12), postM);
          p.position.set(px, 0.6, d);
          grp.add(p);
        }
      });
      // pilares de soporte
      for (let t = 0.12; t < 0.95; t += 0.22) {
        const topY = L.yA + (L.yB - L.yA) * t - 0.5;
        if (topY < 1) continue;
        wpMesh(g, wpBoxGeo(0.35, topY, 0.35), postM, L.x, topY / 2, L.zA + (L.zB - L.zA) * t, false);
      }
    }
    // descansos planos
    for (const Tn of WP_TURNS) {
      const w = Tn.x1 - Tn.x0, d = Tn.z1 - Tn.z0;
      const m = wpMesh(g, wpBoxGeo(w + 3.2, 0.5, d + 3.2), rampM,
        (Tn.x0 + Tn.x1) / 2, Tn.y - 0.25, (Tn.z0 + Tn.z1) / 2, true);
      m.receiveShadow = true;
    }
  },

  _buildTower(g) {
    const TW = { x: -165, z: 108 };
    const legM = wpMat(0x0e3a4a);
    const deckM = wpMat(0x7edbff, 0x0e3a4a, 0.3);
    const trimM = wpMat(0xffffff);
    // patas
    [[-3.2, -3.2], [3.2, -3.2], [-3.2, 3.2], [3.2, 3.2]].forEach(([ox, oz]) => {
      wpMesh(g, wpBoxGeo(0.6, WP_TOP, 0.6), legM, TW.x + ox, WP_TOP / 2, TW.z + oz, true);
    });
    // plataforma (cima)
    wpMesh(g, wpBoxGeo(7, 0.5, 7), deckM, TW.x, WP_TOP - 0.25, TW.z, true);
    wpMesh(g, wpBoxGeo(7.3, 0.18, 7.3), trimM, TW.x, WP_TOP - 0.05, TW.z, false);
    // barandal con huecos en las 3 salidas de tobogán
    const railM = wpMat(0xffffff, 0x9fd8ff, 0.15);
    const rail = (x0, z0, x1, z1) => {
      const len = Math.hypot(x1 - x0, z1 - z0);
      const m = new THREE.Mesh(wpBoxGeo(len, 0.12, 0.12), railM);
      m.position.set((x0 + x1) / 2, WP_TOP + 1.05, (z0 + z1) / 2);
      m.rotation.y = Math.atan2(-(z1 - z0), x1 - x0); // eje X → dirección del tramo
      g.add(m);
      const n = Math.max(2, Math.round(len / 1.6));
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        wpMesh(g, wpBoxGeo(0.12, 1.05, 0.12), railM, x0 + (x1 - x0) * t, WP_TOP + 0.52, z0 + (z1 - z0) * t, false);
      }
    };
    const x0 = TW.x - 3.5, x1 = TW.x + 3.5, z0 = TW.z - 3.5, z1 = TW.z + 3.5;
    rail(x0, z0, TW.x - 1, z0); rail(TW.x + 1, z0, x1, z0); // norte (hueco: entra la rampa)
    rail(x0, z0, x0, z1 - 2.2); rail(x0, z1 - 0.2, x0, z1); // oeste (hueco tubo)
    rail(x1, z0, x1, z1 - 2.2); rail(x1, z1 - 0.2, x1, z1); // este (hueco serpiente)
    rail(x0, z1, TW.x - 1, z1); rail(TW.x + 1, z1, x1, z1);   // sur (hueco recto)
    // techo caramelo
    [[-3.2, -3.2], [3.2, -3.2], [-3.2, 3.2], [3.2, 3.2]].forEach(([ox, oz]) => {
      wpMesh(g, wpBoxGeo(0.35, 3.2, 0.35), legM, TW.x + ox, WP_TOP + 1.6, TW.z + oz, false);
    });
    const roof = new THREE.Mesh(
      wpGeo('roof', () => new THREE.ConeGeometry(5.4, 2.8, 4)), wpMat(0xff5e7a, 0xff5e7a, 0.25));
    roof.position.set(TW.x, WP_TOP + 4.4, TW.z);
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    g.add(roof);
    wpMesh(g, wpGeo('ball', () => new THREE.SphereGeometry(0.45, 12, 10)), wpMat(0xffd23f, 0xffd23f, 0.4),
      TW.x, WP_TOP + 6, TW.z, false);
    // letrero de la cima (tótem alto al este, fuera del paso de la rampa)
    wpPost(g, TW.x + 3, TW.z - 2.6, WP_TOP + 2.6, 0xffffff);
    wpSign(g, 4.6, 1.15, wpSignTex(T('wp.choose'), '', '#0a6aa8', '#ffffff'), TW.x + 3, WP_TOP + 2.6, TW.z - 2.6, 0);
  },

  _buildSlide(g, S, idx) {
    const P = S.path;
    const cA = wpMat(S.c1, S.c1, 0.3);
    const cB = wpMat(S.c2, S.c2, 0.3);
    for (let i = 0; i < P.x.length - 1; i++) {
      const ax = P.x[i], ay = P.y[i], az = P.z[i];
      const bx = P.x[i + 1], by = P.y[i + 1], bz = P.z[i + 1];
      const segLen = Math.hypot(bx - ax, by - ay, bz - az);
      if (segLen < 0.01) continue;
      const grp = new THREE.Group();
      grp.position.set(ax, ay, az);
      grp.lookAt(bx, by, bz);
      g.add(grp);
      const mat = (i % 2 === 0) ? cA : cB;
      if (S.tube) {
        // tubo cerrado: cilindro alrededor de la ruta
        const tube = new THREE.Mesh(wpCylGeo(1.05, 1.05, segLen + 0.14, 12), mat);
        tube.rotation.x = Math.PI / 2;
        tube.position.y = 1.05;
        tube.castShadow = true;
        grp.add(tube);
        if (i % 4 === 0) {
          const ring = new THREE.Mesh(
            wpGeo('ring', () => new THREE.TorusGeometry(1.08, 0.09, 8, 16)), cB);
          ring.position.set(ax, ay + 1.05, az);
          ring.lookAt(bx, by + 1.05, bz);
          g.add(ring);
        }
      } else {
        // canal abierto: piso + bordes
        const floor = new THREE.Mesh(wpBoxGeo(1.8, 0.22, segLen + 0.14), mat);
        floor.position.y = -0.11;
        floor.castShadow = true;
        grp.add(floor);
        [-1.0, 1.0].forEach(px => {
          const r = new THREE.Mesh(wpBoxGeo(0.24, 0.8, segLen + 0.14), mat);
          r.position.set(px, 0.28, 0);
          grp.add(r);
        });
      }
      // pilar de soporte cada ~7 segmentos
      if (i % 7 === 0 && ay > 1.6) {
        wpMesh(g, wpBoxGeo(0.4, ay - 0.2, 0.4), wpMat(0x0e3a4a), ax, (ay - 0.2) / 2, az, false);
      }
    }
    // nombre del tobogán junto a su salida (poste sobre la cima)
    const names = ['wp.s1', 'wp.s2', 'wp.s3'];
    const signXY = [[-163, 110], [-163, 106.5], [-167, 106.5]][idx]; // sobre la cima, sin estorbar
    wpMesh(g, wpBoxGeo(0.22, 1.7, 0.22), wpMat(0xffffff), signXY[0], WP_TOP + 0.85, signXY[1], false);
    wpSign(g, 3.4, 0.85, wpSignTex(T(names[idx]), '', '#ff8c00', '#ffffff'),
      signXY[0], WP_TOP + 1.9, signXY[1], idx === 2 ? Math.PI / 2 : 0);
  },

  _buildPool(g) {
    const S = WP_POOL;
    const w = S.x1 - S.x0, d = S.z1 - S.z0, cx = (S.x0 + S.x1) / 2, cz = (S.z0 + S.z1) / 2;
    // piso de azulejos (lona fina, sin colisión: se camina sobre el suelo base)
    const tileC = document.createElement('canvas');
    tileC.width = 128; tileC.height = 128;
    const tg = tileC.getContext('2d');
    tg.fillStyle = '#7ecfff'; tg.fillRect(0, 0, 128, 128);
    tg.fillStyle = '#e8f9ff';
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++)
      if ((i + j) % 2 === 0) tg.fillRect(i * 32, j * 32, 32, 32);
    const tileTex = new THREE.CanvasTexture(tileC);
    tileTex.wrapS = tileTex.wrapT = THREE.RepeatWrapping;
    tileTex.repeat.set(13, 5);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d),
      new THREE.MeshStandardMaterial({ map: tileTex, roughness: 0.4 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(cx, 0.03, cz);
    g.add(floor);
    // borde caramelo (plano, sin colisión)
    const edgeM = wpMat(0xffd23f, 0xff8c00, 0.3);
    wpMesh(g, wpBoxGeo(w + 1.2, 0.12, 0.6), edgeM, cx, 0.06, S.z0 - 0.3, false);
    wpMesh(g, wpBoxGeo(w + 1.2, 0.12, 0.6), edgeM, cx, 0.06, S.z1 + 0.3, false);
    wpMesh(g, wpBoxGeo(0.6, 0.12, d + 1.2), edgeM, S.x0 - 0.3, 0.06, cz, false);
    wpMesh(g, wpBoxGeo(0.6, 0.12, d + 1.2), edgeM, S.x1 + 0.3, 0.06, cz, false);
    // agua: 2 planos animados
    const mkWater = (y, color, op) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d),
        new THREE.MeshStandardMaterial({
          color, transparent: true, opacity: op, roughness: 0.2, metalness: 0.1,
          emissive: color, emissiveIntensity: 0.15,
        }));
      m.rotation.x = -Math.PI / 2;
      m.position.set(cx, y, cz);
      g.add(m);
      return m;
    };
    this._pendingWater = { a: mkWater(0.28, 0x00a8e0, 0.5), b: mkWater(0.34, 0x4fd8ff, 0.58) };
  },

  _buildDecor(g, park) {
    // arco de entrada junto al inicio de la rampa
    const archM = wpMat(0x29b6ff, 0x0a6aa8, 0.3);
    wpMesh(g, wpBoxGeo(0.5, 3.6, 0.5), archM, -183.2, 1.8, 108, true);
    wpMesh(g, wpBoxGeo(0.5, 3.6, 0.5), archM, -178.8, 1.8, 108, true);
    wpMesh(g, wpBoxGeo(5.2, 1.3, 0.4), archM, -181, 3.9, 108, true);
    wpSign(g, 4.9, 1.1, wpSignTex(T('wp.title'), T('wp.enter'), '#0a6aa8', '#ffffff'), -181, 3.9, 107.75, 0);
    wpSign(g, 4.9, 1.1, wpSignTex(T('wp.title'), T('wp.enter'), '#0a6aa8', '#ffffff'), -181, 3.9, 108.25, Math.PI);
    // regaderas (2) al oeste de la alberca
    const shM = wpMat(0x9fd8ff, 0x0a6aa8, 0.2);
    [[-194.5, 140], [-194.5, 150]].forEach(([sx, sz]) => {
      wpMesh(g, wpBoxGeo(0.18, 2.7, 0.18), shM, sx, 1.35, sz, false);
      wpMesh(g, wpBoxGeo(0.6, 0.12, 0.12), shM, sx + 0.25, 2.62, sz, false);
      wpMesh(g, wpBoxGeo(0.4, 0.1, 0.4), shM, sx + 0.5, 2.55, sz, false);
      park.showers.push([sx + 0.5, 2.4, sz]);
    });
    // camastros + sombrillas + NPC tomando sol (este de la alberca)
    const fabM = [wpMat(0xff5e7a, 0xff5e7a, 0.25), wpMat(0xffd23f, 0xff8c00, 0.25),
                  wpMat(0x29b6ff, 0x0a6aa8, 0.25), wpMat(0x9dff6e, 0x1e8e3e, 0.25)];
    const lounge = [[-132, 140], [-132, 146], [-132, 152], [-127, 143]];
    lounge.forEach(([lx, lz], i) => {
      const m = fabM[i % 4];
      wpMesh(g, wpBoxGeo(1.0, 0.32, 2.1), m, lx, 0.2, lz, true);
      const back = wpMesh(g, wpBoxGeo(1.0, 0.9, 0.22), m, lx, 0.6, lz + 1.0, false);
      back.rotation.x = -0.45;
    });
    const umbC = [0xff3d5e, 0x00a2ff];
    [[-130, 143], [-130, 149]].forEach(([ux, uz], i) => {
      wpMesh(g, wpCylGeo(0.08, 0.08, 2.6, 8), wpMat(0x8a6f3a), ux, 1.3, uz, false);
      const cone = new THREE.Mesh(wpGeo('umb' + i, () => new THREE.ConeGeometry(1.8, 1.0, 10)),
        wpMat(umbC[i], umbC[i], 0.25));
      cone.position.set(ux, 3.0, uz);
      cone.castShadow = true;
      g.add(cone);
    });
    // NPC tomando sol: muñeco simple acostado (diseño propio)
    const sg = new THREE.Group();
    sg.position.set(-132, 0.55, 146);
    const skin = wpMat(0xf2b98a), shirt = wpMat(0xff5e7a, 0xff5e7a, 0.2);
    const torso = new THREE.Mesh(wpBoxGeo(0.55, 0.32, 0.95), shirt);
    torso.position.y = 0.16; sg.add(torso);
    const head = new THREE.Mesh(wpGeo('shead', () => new THREE.SphereGeometry(0.24, 12, 10)), skin);
    head.position.set(0, 0.24, 0.68); head.castShadow = true; sg.add(head);
    const glasses = new THREE.Mesh(wpBoxGeo(0.3, 0.08, 0.06), wpMat(0x222831));
    glasses.position.set(0, 0.3, 0.88); sg.add(glasses);
    [-0.2, 0.2].forEach(px => {
      const leg = new THREE.Mesh(wpBoxGeo(0.18, 0.22, 0.75), skin);
      leg.position.set(px, 0.11, -0.8); sg.add(leg);
      const arm = new THREE.Mesh(wpBoxGeo(0.14, 0.18, 0.6), skin);
      arm.position.set(px * 1.9, 0.12, 0.1); sg.add(arm);
    });
    g.add(sg);
    park.sun = sg;
    // palmeras (generador del juego, si existe)
    try {
      if (typeof makePalm === 'function') {
        makePalm(-196, 120, 0.9, g); makePalm(-136, 120, 1.0, g);
        makePalm(-196, 162, 0.85, g); makePalm(-136, 162, 0.95, g);
      }
    } catch (e) {}
    // cerca perimetral barata (postes alternados)
    const fA = wpMat(0xffffff), fB = wpMat(0x7edbff, 0x0e3a4a, 0.2);
    let fi = 0;
    for (let z = 44; z <= 162; z += 8.5) {
      wpMesh(g, wpBoxGeo(0.18, 1.0, 0.18), fi % 2 ? fA : fB, -196.5, 0.5, z, false);
      wpMesh(g, wpBoxGeo(0.18, 1.0, 0.18), fi % 2 ? fB : fA, -133.5, 0.5, z, false);
      fi++;
    }
    for (let x = -192; x <= -136; x += 8) {
      wpMesh(g, wpBoxGeo(0.18, 1.0, 0.18), fi % 2 ? fA : fB, x, 0.5, 42, false);
      fi++;
    }
  },
};
