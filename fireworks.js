/* fireworks.js — 🎆 Fuegos artificiales para GEAYI: Obby Xtreme 3D
   - Sistema reutilizable: Fireworks.show(x, z, durSec) lanza cohetes al cielo
     que explotan en estallidos de partículas de colores (esfera, anillo, sauce).
   - Barato para Android: máximo 6 estallidos simultáneos, ~48 puntos por
     estallido, vida corta, sin shaders, sin asignar objetos por frame
     (buffers y materiales prealocados).
   - Sonido con Audio2 si existe (estallido = noise, cohete = silbido);
     si no hay Audio2, se omite sin romper.
   - De día se ven poco: show() avisa "🌃 mejor de noche"; los shows
     automáticos de fiestas esperan a la noche (Weather.isNight si existe).
   - Ganchos automáticos (todos con guards typeof, no rompen si los módulos
     no están): fiestas de citylife3 (Halloween/Navidad/15 de sep + Año Nuevo),
     cierre de la feria de citylife2 y fin de conciertos si concerts.js existe.
   - Show manual: botón 🎆 inyectado en el side-menu, 20 s, cooldown 2 min, gratis.
   Contrato: solo usa los globales THREE, scene, Player, MODE, Particles,
   Audio2, Weather, toast, T/tp, addStrings y $; no toca otros archivos. */
'use strict';

const Fireworks = {
  _inited: false,
  _visOK: false,          // true cuando los THREE.Points ya están creados
  _bursts: [],            // estallidos activos (pool fijo)
  _rockets: [],           // cohetes en vuelo
  _rocketPts: null, _rocketPos: null, _rocketAttr: null,
  _showT: 0, _showX: 0, _showZ: 0,   // show en curso
  _spawnT: 0,             // temporizador entre cohetes del show
  _coolT: 0,              // cooldown del botón manual (s)
  _fairInit: false, _fairWas: false, // para detectar el cierre de la feria
  _partyKey: '',          // fiesta+día ya celebrada (no repetir)
  _concertWas: false, _concertPhase: null,
  stats: { launched: 0, bursts: 0 }, // contadores (útiles en tests)

  MAX_BURSTS: 6,
  MAX_ROCKETS: 8,
  P: 48,                 // partículas por estallido
  MANUAL_DUR: 20,        // segundos del show manual
  COOLDOWN: 120,         // cooldown del botón manual (s)

  PALETTES: [
    [0xff5252, 0xffd740, 0xffffff], // rojo + dorado
    [0x40c4ff, 0xffffff, 0x7c4dff], // azul + violeta
    [0x69f0ae, 0xffeb3b, 0xffffff], // verde + amarillo
    [0xff80ab, 0xffd740, 0x40c4ff], // rosa multicolor
    [0xffd740, 0xffb300, 0xfff8e1], // dorado sauce
    [0xffffff, 0x40c4ff, 0xff5252], // patrio
  ],
  SHAPES: ['sphere', 'ring', 'willow'],

  /* ================= init ================= */
  init() {
    if (this._inited) return;
    this._inited = true;
    // i18n es/en
    if (typeof addStrings === 'function') {
      addStrings('es', {
        'fw.show': '🎆 Fuegos',
        'fw.start': '🎆 ¡Show de fuegos artificiales!',
        'fw.nightTip': '🌃 Se ven mejor de noche',
        'fw.cool': '⏳ Espera {n}s para otro show',
      });
      addStrings('en', {
        'fw.show': '🎆 Fireworks',
        'fw.start': '🎆 Fireworks show!',
        'fw.nightTip': '🌃 They look best at night',
        'fw.cool': '⏳ Wait {n}s for another show',
      });
    }
    // Visuales: si la escena aún no existe (initThree no ha corrido), se reintenta
    // en cada update() hasta lograrlo; el botón y la lógica no dependen de esto.
    this._setupVisuals();
    // --- botón manual 🎆 en el side-menu ---
    try {
      if (typeof $ === 'function') {
        const sm = $('side-menu');
        // (no se usa $('btn-side-fw') como guarda: en algunos entornos getElementById
        // nunca devuelve null; la idempotencia la da _inited/_btnMade)
        if (sm && !this._btnMade) {
          const b = document.createElement('button');
          b.id = 'btn-side-fw';
          b.className = 'side-btn side-fw';
          b.setAttribute('aria-label', 'Fuegos');
          const em = document.createElement('div');
          em.textContent = '🎆';
          em.style.fontSize = '24px';
          const lb = document.createElement('span');
          lb.id = 'btn-side-fw-label';
          lb.textContent = (typeof T === 'function') ? T('fw.show') : '🎆 Fuegos';
          b.appendChild(em); b.appendChild(lb);
          b.addEventListener('click', () => { Fireworks.manualShow(); });
          sm.appendChild(b);
          this._btnMade = true;
        }
      }
    } catch (e) { /* el botón es opcional */ }
  },

  // Crea los THREE.Points prealocados. Devuelve true si quedó listo.
  // Se reintenta desde update() si la escena aún no existía en init().
  _setupVisuals() {
    if (this._visOK) return true;
    if (typeof THREE === 'undefined') return false;
    try {
      if (typeof scene === 'undefined' || !scene) return false;
      // --- cohetes: un solo THREE.Points con 8 vértices ---
      const rg = new THREE.BufferGeometry();
      this._rocketPos = new Float32Array(this.MAX_ROCKETS * 3);
      for (let i = 0; i < this.MAX_ROCKETS; i++) this._rocketPos[i * 3 + 1] = -999;
      this._rocketAttr = new THREE.BufferAttribute(this._rocketPos, 3);
      rg.setAttribute('position', this._rocketAttr);
      this._rocketPts = new THREE.Points(rg, new THREE.PointsMaterial({
        color: 0xffe08a, size: 0.9, transparent: true, opacity: 0.95,
        depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      this._rocketPts.frustumCulled = false;
      scene.add(this._rocketPts);
      // --- estallidos: pool fijo de 6 Points de 48 vértices ---
      for (let b = 0; b < this.MAX_BURSTS; b++) {
        const pos = new Float32Array(this.P * 3);
        const col = new Float32Array(this.P * 3);
        const vel = new Float32Array(this.P * 3);
        const g = new THREE.BufferGeometry();
        const pa = new THREE.BufferAttribute(pos, 3);
        const ca = new THREE.BufferAttribute(col, 3);
        g.setAttribute('position', pa);
        g.setAttribute('color', ca);
        const m = new THREE.PointsMaterial({
          size: 0.55, vertexColors: true, transparent: true, opacity: 1,
          depthWrite: false, blending: THREE.AdditiveBlending,
        });
        const pts = new THREE.Points(g, m);
        pts.frustumCulled = false;
        pts.visible = false;
        scene.add(pts);
        this._bursts.push({ pts, pos, col, vel, pa, ca, mat: m, life: 0, maxLife: 1, active: false, grav: 5, twinkle: false });
      }
      this._visOK = true;
      return true;
    } catch (e) { return false; }
  },

  /* ================= API pública ================= */
  // Lanza un show de fuegos en (x, z) durante durSec segundos.
  show(x, z, durSec) {
    const d = Math.max(5, Math.min(60, durSec || 20));
    this._showX = x || 0; this._showZ = z || 0;
    this._showT = Math.max(this._showT, d);
    this._spawnT = Math.min(this._spawnT, 0.01); // primer cohete casi ya
    try {
      if (typeof T === 'function') {
        if (typeof toast === 'function') toast(T('fw.start'));
        // aviso de día: se ven poco con luz
        if (typeof Weather !== 'undefined' && Weather && typeof Weather.isNight === 'function' &&
            !Weather.isNight() && typeof toast === 'function') {
          setTimeout(() => { try { toast(T('fw.nightTip')); } catch (e) {} }, 1900);
        }
      }
    } catch (e) {}
  },

  // Botón manual: 20 s donde esté el jugador, cooldown 2 min, gratis.
  manualShow() {
    if (this._coolT > 0) {
      try {
        if (typeof toast === 'function' && typeof T === 'function') {
          const msg = (typeof tp === 'function') ? tp('fw.cool', { n: Math.ceil(this._coolT) }) : T('fw.cool');
          toast(msg);
        }
      } catch (e) {}
      return;
    }
    this._coolT = this.COOLDOWN;
    const p = this._playerPos();
    this.show(p.x, p.z, this.MANUAL_DUR);
  },

  // Estallido directo (también lo usan los tests).
  burst(x, y, z, shape, palette) {
    if (!this._visOK) return false;
    let slot = null;
    for (const b of this._bursts) if (!b.active) { slot = b; break; }
    if (!slot) return false; // límite de 6 simultáneos
    shape = this.SHAPES.indexOf(shape) !== -1 ? shape : this.SHAPES[(Math.random() * this.SHAPES.length) | 0];
    palette = palette || this.PALETTES[(Math.random() * this.PALETTES.length) | 0];
    const P = this.P;
    // base ortonormal aleatoria (plano inclinado) para el anillo
    let ux = 1, uy = 0, uz = 0, vx = 0, vy = 1, vz = 0;
    if (shape === 'ring') {
      const tilt = Math.random() * 0.9 - 0.45; // inclinación del plano
      const ct = Math.cos(tilt), st = Math.sin(tilt);
      ux = 1; uy = 0; uz = 0;
      vx = 0; vy = ct; vz = st; // segundo eje rotado en el plano YZ
    }
    for (let i = 0; i < P; i++) {
      const j = i * 3;
      slot.pos[j] = x; slot.pos[j + 1] = y; slot.pos[j + 2] = z;
      let dx, dy, dz, sp;
      if (shape === 'ring') {
        const a = (i / P) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
        sp = 9 + Math.random() * 3;
        dx = (Math.cos(a) * ux + Math.sin(a) * vx) * sp;
        dy = (Math.cos(a) * uy + Math.sin(a) * vy) * sp;
        dz = (Math.cos(a) * uz + Math.sin(a) * vz) * sp;
      } else if (shape === 'willow') {
        dx = (Math.random() - 0.5) * 4.5;
        dy = 6 + Math.random() * 5;
        dz = (Math.random() - 0.5) * 4.5;
      } else { // sphere
        const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
        sp = 7 + Math.random() * 7;
        dx = Math.sin(ph) * Math.cos(th) * sp;
        dy = Math.cos(ph) * sp;
        dz = Math.sin(ph) * Math.sin(th) * sp;
      }
      slot.vel[j] = dx; slot.vel[j + 1] = dy; slot.vel[j + 2] = dz;
      const c = palette[(Math.random() * palette.length) | 0];
      const vr = 0.85 + Math.random() * 0.15; // leve variación de brillo
      slot.col[j] = ((c >> 16) & 255) / 255 * vr;
      slot.col[j + 1] = ((c >> 8) & 255) / 255 * vr;
      slot.col[j + 2] = (c & 255) / 255 * vr;
    }
    slot.pa.needsUpdate = true;
    slot.ca.needsUpdate = true;
    slot.life = 0;
    slot.maxLife = shape === 'willow' ? 1.6 + Math.random() * 0.6 : 1.0 + Math.random() * 0.5;
    slot.grav = shape === 'willow' ? 9 : 5;
    slot.twinkle = shape === 'willow';
    slot.active = true;
    slot.pts.visible = true;
    slot.mat.opacity = 1;
    this.stats.bursts++;
    return true;
  },

  activeBursts() {
    let n = 0;
    for (const b of this._bursts) if (b.active) n++;
    return n;
  },

  /* ================= update(dt) — llamar cada frame ================= */
  update(dt) {
    if (!this._inited || dt <= 0) return;
    if (!this._visOK) this._setupVisuals(); // reintento perezoso si init() fue antes que initThree()
    if (this._coolT > 0) this._coolT -= dt;
    // show en curso: lanzar cohetes
    if (this._showT > 0) {
      this._showT -= dt;
      this._spawnT -= dt;
      if (this._spawnT <= 0) {
        if (this._rockets.length < this.MAX_ROCKETS) {
          this._launch(this._showX + (Math.random() - 0.5) * 16, this._showZ + (Math.random() - 0.5) * 16);
        }
        this._spawnT = 0.35 + Math.random() * 0.55;
      }
      if (this._showT <= 0) this._showT = 0;
    }
    this._updateRockets(dt);
    this._updateBursts(dt);
    // ganchos automáticos solo jugando
    try {
      if (typeof MODE !== 'undefined' && MODE === 'play') this._hooks();
    } catch (e) {}
  },

  /* ================= internos ================= */
  _playerPos() {
    try {
      if (typeof Player !== 'undefined' && Player && Player.pos) return { x: Player.pos.x, y: Player.pos.y, z: Player.pos.z };
    } catch (e) {}
    return { x: 0, y: 0, z: 0 };
  },

  _isNight() {
    try {
      if (typeof Weather !== 'undefined' && Weather && typeof Weather.isNight === 'function') return Weather.isNight();
    } catch (e) {}
    return true; // sin clima, se asume visible
  },

  _boom() {
    try {
      if (typeof Audio2 !== 'undefined' && Audio2 && typeof Audio2.noise === 'function') Audio2.noise(0.45, 0.32);
    } catch (e) {}
  },

  _launch(x, z) {
    if (this._rockets.length >= this.MAX_ROCKETS) return;
    const p = this._playerPos();
    const y0 = (p.y || 0) + 1;
    this._rockets.push({
      x, z, y: y0, vy: 22 + Math.random() * 7,
      targetY: y0 + 24 + Math.random() * 14,
      shape: this.SHAPES[(Math.random() * this.SHAPES.length) | 0],
      pal: this.PALETTES[(Math.random() * this.PALETTES.length) | 0],
      trailT: 0,
    });
    this.stats.launched++;
    try {
      if (typeof Audio2 !== 'undefined' && Audio2 && typeof Audio2.tone === 'function') {
        Audio2.tone(1200, 0.28, 'sine', 0.06, 0, 500); // silbido del cohete
      }
    } catch (e) {}
  },

  _updateRockets(dt) {
    const rs = this._rockets;
    for (let i = rs.length - 1; i >= 0; i--) {
      const r = rs[i];
      r.y += r.vy * dt;
      // chispas de la estela (barato: cada 0.06 s, usa Particles si existe)
      r.trailT -= dt;
      if (r.trailT <= 0) {
        r.trailT = 0.06;
        try {
          if (typeof Particles !== 'undefined' && Particles && typeof Particles.spawn === 'function') {
            Particles.spawn(r.x, r.y - 0.5, r.z, { n: 2, life: 0.5, speed: 1.2, up: 0.5, grav: 3, size: 0.22, color: 0xffd98a });
          }
        } catch (e) {}
      }
      if (r.y >= r.targetY) {
        rs.splice(i, 1);
        this.burst(r.x, r.y, r.z, r.shape, r.pal);
        this._boom();
      }
    }
    // volcar posiciones al Points (los inactivos bajo el suelo)
    if (this._visOK && this._rocketAttr) {
      for (let i = 0; i < this.MAX_ROCKETS; i++) {
        const j = i * 3, r = rs[i];
        if (r) { this._rocketPos[j] = r.x; this._rocketPos[j + 1] = r.y; this._rocketPos[j + 2] = r.z; }
        else this._rocketPos[j + 1] = -999;
      }
      this._rocketAttr.needsUpdate = true;
    }
  },

  _updateBursts(dt) {
    for (const b of this._bursts) {
      if (!b.active) continue;
      b.life += dt;
      if (b.life >= b.maxLife) {
        b.active = false;
        b.pts.visible = false;
        continue;
      }
      const vy_ = b.grav * dt;
      for (let i = 0; i < this.P; i++) {
        const j = i * 3;
        b.vel[j + 1] -= vy_;
        b.pos[j] += b.vel[j] * dt;
        b.pos[j + 1] += b.vel[j + 1] * dt;
        b.pos[j + 2] += b.vel[j + 2] * dt;
      }
      b.pa.needsUpdate = true;
      let op = 1 - b.life / b.maxLife;
      if (b.twinkle) op *= 0.65 + 0.35 * Math.sin(b.life * 42);
      b.mat.opacity = op < 0 ? 0 : op;
    }
  },

  /* ---- ganchos automáticos (con guards; no rompen sin los módulos) ---- */
  _hooks() {
    // a) fiestas de citylife3: show la noche de cada fiesta (+ Año Nuevo)
    try {
      let season = null;
      if (typeof _seasonEff === 'function') season = _seasonEff();
      if (season === 'halloween' || season === 'navidad' || season === 'sept15') {
        this._partyNight(season);
      }
      const d = new Date();
      if ((d.getMonth() === 11 && d.getDate() === 31) || (d.getMonth() === 0 && d.getDate() === 1)) {
        this._partyNight('newyear');
      }
    } catch (e) {}
    // b) feria de citylife2: fuegos al cerrar
    try {
      if (typeof CL2 !== 'undefined' && CL2 && CL2.fair) {
        const a = !!CL2.fair.active;
        if (!this._fairInit) { this._fairWas = a; this._fairInit = true; }
        else if (this._fairWas && !a) {
          const p = this._playerPos();
          this.show(p.x, p.z, 15);
        }
        this._fairWas = a;
      }
    } catch (e) {}
    // c) conciertos (concerts.js): gran final con fuegos al terminar el show
    //     (fase 'applause' = el show terminó; también soporta showOver/show.over)
    try {
      if (typeof Concerts !== 'undefined' && Concerts) {
        const s = Concerts.show || null;
        const ph = s ? s.phase : null;
        const over = !!(Concerts.showOver || (s && s.over));
        if ((over && !this._concertWas) || (ph === 'applause' && this._concertPhase !== 'applause')) {
          const p = this._playerPos();
          this.show(p.x, p.z, 20); // 🎆 gran final
        }
        this._concertWas = over;
        this._concertPhase = ph;
      }
    } catch (e) {}
  },

  // Espera la noche y lanza el show una vez por fiesta+día.
  _partyNight(key) {
    const day = new Date().toDateString();
    if (this._partyKey === key + '|' + day) return;
    if (!this._isNight()) return; // de día no se ven: esperar
    this._partyKey = key + '|' + day;
    const p = this._playerPos();
    this.show(p.x, p.z, 25);
  },
};
