/* sports.js — 🏟️ OLIMPIADAS GEAYI (juegos deportivos, 100% originales)
   Deportes portátiles: se arman donde esté el jugador, en cualquier mundo.
   - 🏁 Carros y 🚴 Ciclismo: circuito ovalado, 3 rivales robots, 2-3 vueltas, premios.
   - ⚽ Fútbol: 3 contra 3 con robots, 3 minutos.
   - 🏀 Básquet: encesta lo más que puedas en 60 segundos.
   - 🎾 Tenis y 🏓 Ping pong: rally contra robot, primero en 5 puntos.
   - 🏐 Voleibol: 2 contra 2, primero en 5 puntos.
   - 🏊 Natación: 50 m en la piscina portátil (usa el nado del juego).
   - 🏋️ Fuerza: toca el botón lo más rápido que puedas en 10 s.
   - 🌀 Contrarreloj: enlaza al minijuego de 100 m.
   API: Sports.init() / Sports.update(dt) / Sports.openMenu() / Sports.start(id) / Sports.cancel() */
'use strict';

const SP_GRAV = 22;

const Sports = {
  cur: null,       // deporte activo {id, ...estado}
  group: null,     // grupo 3D del escenario
  ball: null,      // {mesh,x,y,z,vx,vy,vz,r,carried}
  hud: null, panel: null,
  _inited: false,

  /* ================= i18n ================= */
  _strings() {
    if (typeof addStrings !== 'function') return;
    const es = {
      'sp.title': '🏟️ Olimpiadas GEAYI', 'sp.close': 'Cerrar', 'sp.play': '▶ Jugar', 'sp.best': '⭐ Récord',
      'sp.cancel': '✕ Terminar',
      'sp.race': 'Carros', 'sp.raced': '🏁 Circuito ovalado: 3 vueltas contra 3 robots. ¡Gana monedas!',
      'sp.bike': 'Ciclismo', 'sp.biked': '🚴 2 vueltas en bici contra 3 robots.',
      'sp.soccer': 'Fútbol', 'sp.soccerd': '⚽ 3 contra 3 con robots. ¡Mete más goles en 3 minutos!',
      'sp.basket': 'Básquet', 'sp.basketd': '🏀 Encesta la mayor cantidad en 60 segundos.',
      'sp.tennis': 'Tenis', 'sp.tennisd': '🎾 Rally contra un robot. ¡Primero en 5 puntos!',
      'sp.pingpong': 'Ping pong', 'sp.pingpongd': '🏓 Mini tenis rápido. ¡Primero en 5 puntos!',
      'sp.volley': 'Voleibol', 'sp.vold': '🏐 2 contra 2. ¡Primero en 5 puntos!',
      'sp.swim': 'Natación', 'sp.swimd': '🏊 Nada 50 metros en la piscina. ¡Tu mejor tiempo!',
      'sp.lift': 'Fuerza', 'sp.liftd': '🏋️ Toca el botón rapidísimo por 10 segundos.',
      'sp.dash': 'Contrarreloj', 'sp.dashd': '🌀 Corre 100 metros. ¡Tu mejor tiempo!',
      'sp.count': '¡Prepárate! {n}…', 'sp.go': '¡YA! 🚀',
      'sp.lap': 'Vuelta {n}/{m}', 'sp.pos': 'Vas {n}º',
      'sp.time': '⏱️ {t}', 'sp.score': '{a} - {b}',
      'sp.youBlue': 'Tú (azul)', 'sp.win': '🏆 ¡GANASTE! +{n}🪙', 'sp.lose': '¡Buen juego! +{n}🪙',
      'sp.draw': '🤝 ¡Empate! +{n}🪙', 'sp.newBest': ' ⭐ ¡NUEVO RÉCORD!',
      'sp.baskets': '🏀 Encestes: {n}', 'sp.shoot': '🏀 ¡LANZAR!',
      'sp.liftTap': '🏋️ ¡TOCA!',
      'sp.needCar': '🚗 Súbete a un carro primero',
      'sp.swimGo': '🏊 ¡Nada hasta el otro lado! Usa el joystick.',
      'sp.finish': '🏁 ¡Meta! Tiempo: {t}{best}',
      'sp.goal': '⚽ ¡GOOOL!', 'sp.point': '¡Punto! {a}-{b}',
      'sp.serve': '🎾 ¡Saque! Devuélvela',
      'sp.first': 'gana {n}', 'sp.noWater': 'no se pudo armar la piscina aquí',
    };
    const en = {
      'sp.title': '🏟️ GEAYI Olympics', 'sp.close': 'Close', 'sp.play': '▶ Play', 'sp.best': '⭐ Best',
      'sp.cancel': '✕ Quit',
      'sp.race': 'Race cars', 'sp.raced': '🏁 Oval circuit: 3 laps vs 3 robots. Win coins!',
      'sp.bike': 'Cycling', 'sp.biked': '🚴 2 bike laps vs 3 robots.',
      'sp.soccer': 'Soccer', 'sp.soccerd': '⚽ 3 vs 3 with robots. Most goals in 3 minutes!',
      'sp.basket': 'Basketball', 'sp.basketd': '🏀 Score as many baskets in 60 seconds.',
      'sp.tennis': 'Tennis', 'sp.tennisd': '🎾 Rally vs a robot. First to 5 points!',
      'sp.pingpong': 'Ping pong', 'sp.pingpongd': '🏓 Fast mini tennis. First to 5 points!',
      'sp.volley': 'Volleyball', 'sp.vold': '🏐 2 vs 2. First to 5 points!',
      'sp.swim': 'Swimming', 'sp.swimd': '🏊 Swim 50 meters in the pool. Your best time!',
      'sp.lift': 'Strength', 'sp.liftd': '🏋️ Tap the button super fast for 10 seconds.',
      'sp.dash': 'Time trial', 'sp.dashd': '🌀 Run 100 meters. Your best time!',
      'sp.count': 'Get ready! {n}…', 'sp.go': 'GO! 🚀',
      'sp.lap': 'Lap {n}/{m}', 'sp.pos': 'You are {n}{s}',
      'sp.time': '⏱️ {t}', 'sp.score': '{a} - {b}',
      'sp.youBlue': 'You (blue)', 'sp.win': '🏆 YOU WIN! +{n}🪙', 'sp.lose': 'Good game! +{n}🪙',
      'sp.draw': '🤝 Draw! +{n}🪙', 'sp.newBest': ' ⭐ NEW RECORD!',
      'sp.baskets': '🏀 Baskets: {n}', 'sp.shoot': '🏀 SHOOT!',
      'sp.liftTap': '🏋️ TAP!',
      'sp.needCar': '🚗 Get in a car first',
      'sp.swimGo': '🏊 Swim to the other side! Use the joystick.',
      'sp.finish': '🏁 Finish! Time: {t}{best}',
      'sp.goal': '⚽ GOOOAL!', 'sp.point': 'Point! {a}-{b}',
      'sp.serve': '🎾 Serve! Hit it back',
      'sp.first': 'first to {n}', 'sp.noWater': 'could not build the pool here',
    };
    addStrings('es', es); addStrings('en', en);
  },
  _t(k, v) {
    let s = (typeof T === 'function') ? T(k) : k;
    if (v) for (const key in v) s = String(s).split('{' + key + '}').join(v[key]);
    return s;
  },
  _toast(m) { try { if (typeof toast === 'function') toast(m); } catch (e) {} },
  _sfx(n) { try { if (typeof Audio2 !== 'undefined' && Audio2 && typeof Audio2[n] === 'function') Audio2[n](); } catch (e) {} },
  _scene() { try { return (typeof scene !== 'undefined' && scene) ? scene : null; } catch (e) { return null; } },

  /* ================= ciclo de vida ================= */
  init() {
    if (this._inited) return;
    this._inited = true;
    this._strings();
    try { if (typeof SAVE !== 'undefined' && (!SAVE.sp || typeof SAVE.sp !== 'object')) SAVE.sp = {}; } catch (e) {}
  },
  update(dt) {
    if (!this.cur) return;
    if (dt == null || dt <= 0) dt = 0.016;
    dt = Math.min(dt, 0.05);
    try {
      if (typeof MODE !== 'undefined' && MODE !== 'play') return;
      if (this.cur.tick) this.cur.tick(dt);
    } catch (e) {}
  },

  /* ================= récords y monedas ================= */
  _best(key) { try { return (typeof SAVE !== 'undefined' && SAVE.sp) ? (SAVE.sp[key] || null) : null; } catch (e) { return null; } },
  // lower=true: gana el menor (tiempos). Devuelve {best:boolean, txt}
  _setBest(key, val, lower) {
    try {
      if (typeof SAVE === 'undefined') return { best: false, txt: '' };
      if (!SAVE.sp || typeof SAVE.sp !== 'object') SAVE.sp = {};
      const old = SAVE.sp[key];
      const isBest = (old == null) || (lower ? val < old : val > old);
      if (isBest) { SAVE.sp[key] = val; if (typeof persist === 'function') persist(); }
      return { best: isBest, txt: isBest ? this._t('sp.newBest') : '' };
    } catch (e) { return { best: false, txt: '' }; }
  },
  _fmtTime(s) {
    s = Math.max(0, s || 0);
    const m = Math.floor(s / 60), sec = s - m * 60;
    return (m > 0 ? m + ':' + (sec < 10 ? '0' : '') : '') + sec.toFixed(1) + 's';
  },
  _earn(n) {
    if (!n) return;
    try {
      SAVE.coins = (SAVE.coins | 0) + n;
      if (typeof persist === 'function') persist();
      const el = (typeof $ === 'function') ? $('hud-coins') : null;
      if (el) el.textContent = SAVE.coins;
    } catch (e) {}
  },

  /* ================= escenario ================= */
  _clearVenue() {
    try {
      if (this.group && this._scene()) this._scene().remove(this.group);
    } catch (e) {}
    this.group = null; this.ball = null;
  },
  _mat(color, rough) {
    return new THREE.MeshStandardMaterial({ color: color, roughness: rough == null ? 0.9 : rough });
  },
  _box(w, h, d, color) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), this._mat(color));
    m.position.y = h / 2; return m;
  },
  _newVenue() {
    this._clearVenue();
    const g = new THREE.Group();
    g.userData.spVenue = true;
    if (this._scene()) this._scene().add(g);
    this.group = g;
    return g;
  },
  _ground(w, d, color) {
    const g = this.group;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), this._mat(color));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.02; g.add(m);
    return m;
  },
  _cone(x, z, color) {
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.8, 10), this._mat(color || 0xff7b24));
    c.position.set(x, 0.4, z); this.group.add(c); return c;
  },
  _line(x1, z1, x2, z2, color, w) {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(len, w || 0.3), this._mat(color || 0xffffff));
    m.rotation.x = -Math.PI / 2;
    m.position.set((x1 + x2) / 2, 0.04, (z1 + z2) / 2);
    m.rotation.z = -Math.atan2(z2 - z1, x2 - x1);
    this.group.add(m); return m;
  },
  _arch(x, z, rotY, color, label) {
    const g = new THREE.Group();
    const pm = this._mat(color || 0xffd23f);
    for (const sx of [-3, 3]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 5, 10), pm);
      p.position.set(sx, 2.5, 0); g.add(p);
    }
    const top = new THREE.Mesh(new THREE.BoxGeometry(7, 1, 0.6), pm);
    top.position.y = 5; g.add(top);
    if (label) {
      try {
        const tex = canvasTex(256, 48, (c2, w, h) => {
          c2.fillStyle = '#10203a'; c2.fillRect(0, 0, w, h);
          c2.fillStyle = '#ffd23f'; c2.font = '700 30px "Trebuchet MS", sans-serif';
          c2.textAlign = 'center'; c2.textBaseline = 'middle'; c2.fillText(label, w / 2, h / 2);
        });
        const sp = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 1), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
        sp.position.set(0, 5, 0.35); g.add(sp);
      } catch (e) {}
    }
    g.position.set(x, 0, z); g.rotation.y = rotY || 0;
    this.group.add(g); return g;
  },
  // rectángulo redondeado: waypoints para circuitos
  _ovalPoints(hw, hh, r, step) {
    const pts = [];
    const corners = [[hw - r, hh - r, 0], [-(hw - r), hh - r, Math.PI / 2], [-(hw - r), -(hh - r), Math.PI], [hw - r, -(hh - r), Math.PI * 1.5]];
    void corners;
    // lados: parametrización simple por segmentos
    const segs = [];
    segs.push({ x0: -hw + r, z0: hh, x1: hw - r, z1: hh });
    segs.push({ x0: hw, z0: hh - r, x1: hw, z1: -hh + r });
    segs.push({ x0: hw - r, z0: -hh, x1: -hw + r, z1: -hh });
    segs.push({ x0: -hw, z0: -hh + r, x1: -hw, z1: hh - r });
    for (const s of segs) {
      const len = Math.hypot(s.x1 - s.x0, s.z1 - s.z0);
      const n = Math.max(2, Math.round(len / step));
      for (let i = 0; i < n; i++) {
        const t = i / n;
        pts.push({ x: s.x0 + (s.x1 - s.x0) * t, z: s.z0 + (s.z1 - s.z0) * t });
      }
    }
    return pts;
  },

  /* ================= pelota ================= */
  _spawnBall(r, color, x, z, y) {
    this.ball = null;
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 12), this._mat(color, 0.5));
    mesh.position.set(x, y == null ? r + 0.1 : y, z);
    mesh.castShadow = true;
    this.group.add(mesh);
    this.ball = { mesh, x, y: y == null ? r + 0.1 : y, z, vx: 0, vy: 0, vz: 0, r, carried: false, bounces: 0 };
    return this.ball;
  },
  _ballSync() {
    const b = this.ball; if (!b) return;
    b.mesh.position.set(b.x, b.y, b.z);
  },
  _ballStep(dt, bounds) {
    const b = this.ball; if (!b || b.carried) return 0;
    let bounced = 0;
    b.vy -= SP_GRAV * dt;
    b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
    if (b.y < b.r) {
      b.y = b.r;
      if (b.vy < -1.5) { bounced = 1; this._sfx('bounce'); }
      b.vy = -b.vy * 0.55;
      b.vx *= 0.92; b.vz *= 0.92;
      b.bounces++;
    } else {
      const fr = Math.pow(0.4, dt);
      b.vx *= fr; b.vz *= fr;
    }
    if (bounds) {
      if (b.x < bounds.x0) { b.x = bounds.x0; b.vx = Math.abs(b.vx) * 0.6; }
      if (b.x > bounds.x1) { b.x = bounds.x1; b.vx = -Math.abs(b.vx) * 0.6; }
      if (b.z < bounds.z0) { b.z = bounds.z0; b.vz = Math.abs(b.vz) * 0.6; }
      if (b.z > bounds.z1) { b.z = bounds.z1; b.vz = -Math.abs(b.vz) * 0.6; }
    }
    this._ballSync();
    return bounced;
  },
  _kickBall(tx, tz, power, up) {
    const b = this.ball; if (!b) return;
    const dx = tx - b.x, dz = tz - b.z, d = Math.hypot(dx, dz) || 1;
    b.vx = (dx / d) * power; b.vz = (dz / d) * power;
    b.vy = up == null ? power * 0.25 : up;
    b.bounces = 0; b.carried = false;
    this._sfx('kick');
  },
  _playerKick(power, up, maxDist) {
    const b = this.ball, P = (typeof Player !== 'undefined') ? Player : null;
    if (!b || !P || b.carried) return false;
    const d = Math.hypot(P.pos.x - b.x, P.pos.z - b.z);
    if (d > (maxDist || 2.2) || Math.abs(P.pos.y - b.y) > 2.5) return false;
    const fx = Math.sin(P.heading), fz = Math.cos(P.heading);
    this._kickBall(b.x + fx * 10, b.z + fz * 10, power, up);
    return true;
  },

  /* ================= atletas robots ================= */
  _athlete(color, x, z) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.4, 0.9, 10), this._mat(color));
    body.position.y = 0.75; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), this._mat(0xffe0b8));
    head.position.y = 1.45; g.add(head);
    g.position.set(x, 0, z);
    this.group.add(g);
    return { mesh: g, x, z, kx: 0, kz: 0 };
  },
  _seek(a, tx, tz, dt, sp) {
    const dx = tx - a.x, dz = tz - a.z, d = Math.hypot(dx, dz);
    if (d < 0.05) return true;
    const v = Math.min(sp, d / Math.max(dt, 0.001));
    a.x += (dx / d) * v * dt; a.z += (dz / d) * v * dt;
    a.mesh.position.set(a.x, 0, a.z);
    a.mesh.rotation.y = Math.atan2(dx, dz);
    return d < 0.6;
  },

  /* ================= HUD ================= */
  _ensureHud() {
    if (this.hud) return;
    try {
      const d = document.createElement('div');
      d.id = 'sp-hud';
      d.style.cssText = 'position:fixed;top:8px;left:50%;transform:translateX(-50%);background:rgba(8,12,26,.82);color:#fff;padding:8px 18px;border-radius:99px;font:700 17px "Trebuchet MS",sans-serif;z-index:60;display:none;border:2px solid #ffd23f';
      document.body.appendChild(d);
      this.hud = d;
    } catch (e) {}
  },
  _hud(html) {
    this._ensureHud();
    if (!this.hud) return;
    this.hud.innerHTML = html + ' <button id="sp-quit" style="margin-left:10px;background:#e84545;border:none;color:#fff;border-radius:99px;padding:4px 12px;font-weight:700">✕</button>';
    this.hud.style.display = 'block';
    try {
      const q = document.getElementById('sp-quit');
      if (q) q.addEventListener('click', () => this.cancel());
    } catch (e) {}
  },
  _hideHud() { try { if (this.hud) this.hud.style.display = 'none'; } catch (e) {} },
  _bigBtn(label, id) {
    // botón táctil grande para básquet/fuerza
    try {
      let b = document.getElementById(id);
      if (!b) {
        b = document.createElement('button');
        b.id = id;
        b.style.cssText = 'position:fixed;bottom:110px;right:14px;z-index:61;background:#ffd23f;color:#10203a;border:none;border-radius:99px;padding:16px 22px;font:800 19px "Trebuchet MS",sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.4)';
        document.body.appendChild(b);
      }
      b.textContent = label; b.style.display = 'block';
      return b;
    } catch (e) { return null; }
  },
  _hideBigBtn(id) { try { const b = document.getElementById(id); if (b) b.style.display = 'none'; } catch (e) {} },
};

/* ============ 🏁🚴 CARRERAS (circuito portátil) ============ */
Object.assign(Sports, {
  _carMesh(color, bike) {
    let mesh = null;
    try {
      mesh = bike
        ? (typeof buildBikeMesh === 'function' ? buildBikeMesh(color) : null)
        : (typeof buildCarMesh === 'function' ? buildCarMesh(color, 'sport') : null);
    } catch (e) {}
    if (!mesh) { // respaldo simple
      mesh = new THREE.Group();
      const b = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.7, 1.2), this._mat(color));
      b.position.y = 0.6; mesh.add(b);
    }
    return mesh;
  },
  _startCircuit(kind) { // kind: 'race' | 'bike'
    const P = (typeof Player !== 'undefined') ? Player : null;
    if (!P) return false;
    const bike = kind === 'bike';
    const laps = bike ? 2 : 3;
    const g = this._newVenue();
    const cx = P.pos.x, cz = P.pos.z + 30;
    const hw = 26, hh = 17;
    this._ground(hw * 2 + 14, hh * 2 + 14, 0x3f7a4e);
    // pista: cinta de asfalto (rectángulo redondeado aproximado con 4 rectas + esquinas)
    const pts = this._ovalPoints(hw, hh, 6, 3);
    for (const p of pts) {
      const t = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 5.4), this._mat(0x3a3f4a, 1));
      t.rotation.x = -Math.PI / 2; t.position.set(cx + p.x, 0.03, cz + p.z); g.add(t);
    }
    for (let i = 0; i < pts.length; i += 2) this._cone(cx + pts[i].x * 1.18, cz + pts[i].z * 1.18);
    const p0 = pts[0];
    this._arch(cx + p0.x, cz + p0.z, 0, 0xffd23f, bike ? '🚴 META' : '🏁 META');
    // waypoints con tangente
    const wp = pts.map((p, i) => {
      const q = pts[(i + 1) % pts.length];
      return { x: cx + p.x, z: cz + p.z, dx: q.x - p.x, dz: q.z - p.z };
    });
    // rivales robots
    const rivals = [];
    const cols = [0x3fa7ff, 0xff5f5f, 0xb06bff];
    for (let i = 0; i < 3; i++) {
      const mesh = this._carMesh(cols[i], bike);
      const wi = Math.floor((i + 1) * wp.length / 4);
      mesh.position.set(wp[wi].x, 0, wp[wi].z);
      g.add(mesh);
      rivals.push({ mesh, wi, s: (i + 1) * 30, speed: 0, base: (bike ? 8.5 : 11) + i * 0.7 });
    }
    // carro/bici del jugador
    let def = null, mesh = null;
    try {
      mesh = this._carMesh(0xffd23f, bike);
      mesh.position.set(wp[0].x, 0, wp[0].z - 3);
      mesh.rotation.y = Math.atan2(wp[0].dx, wp[0].dz);
      g.add(mesh);
      def = { taken: false, heading: mesh.rotation.y, mesh, vtype: bike ? 'geayi-bike' : 'sport', seatY: 0.15, seatZ: -0.3, x: mesh.position.x, y: 0, z: mesh.position.z };
      if (typeof boardVehicle === 'function') boardVehicle({ type: bike ? 'bike' : 'car', def });
      else return false;
    } catch (e) { return false; }
    const total = wp.length * 3; // longitud aprox en "pasos"
    this.cur = {
      id: kind, phase: 'count', t: 3.2, lastN: 4, time: 0, laps, lap: 1,
      wp, rivals, def, mesh, total, pS: 0, bike,
      tick: (dt) => this._tickCircuit(dt),
    };
    this._hud(this._t('sp.count', { n: 3 }));
    this._sfx('count');
    return true;
  },
  _circuitProgress() {
    const c = this.cur, P = (typeof Player !== 'undefined') ? Player : null;
    if (!P || typeof Vehicle === 'undefined') return -1;
    const px = (Vehicle.mode === 'none') ? P.pos.x : (Vehicle.pPos ? Vehicle.pPos.x : P.pos.x);
    const pz = (Vehicle.mode === 'none') ? P.pos.z : (Vehicle.pPos ? Vehicle.pPos.z : P.pos.z);
    let best = 0, bd = 1e9;
    for (let i = 0; i < c.wp.length; i++) {
      const d = Math.hypot(px - c.wp[i].x, pz - c.wp[i].z);
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  },
  _tickCircuit(dt) {
    const c = this.cur;
    const driving = (typeof Vehicle !== 'undefined') && (c.bike ? Vehicle.mode === 'bike' : Vehicle.mode === 'car');
    if (!driving) { this._toast(this._t('sp.needCar')); this.cancel(); return; }
    if (c.phase === 'count') {
      c.t -= dt;
      const n = Math.ceil(c.t);
      if (n !== c.lastN && n >= 1) { c.lastN = n; this._hud(this._t('sp.count', { n })); this._sfx('count'); }
      if (c.t <= 0) { c.phase = 'run'; this._hud(this._t('sp.go')); this._sfx('check'); }
      return;
    }
    c.time += dt;
    // rivales con rubber-banding
    const pS = this._circuitProgress();
    for (const r of c.rivals) {
      let target = r.base;
      if (pS >= 0) {
        const ahead = (((r.wi - pS) % c.wp.length) + c.wp.length) % c.wp.length;
        if (ahead < c.wp.length / 2) { if (ahead > 8) target = r.base - 1.6; }
        else if (c.wp.length - ahead > 8) target = r.base + 1.6;
      }
      r.speed += (target - r.speed) * Math.min(1, dt * 1.2);
      r.s += r.speed * dt;
      r.wi = Math.floor(r.s / 3) % c.wp.length;
      const w = c.wp[r.wi];
      r.mesh.position.set(w.x, 0, w.z);
      r.mesh.rotation.y = Math.atan2(w.dx, w.dz);
    }
    // vueltas del jugador: cruzar el arco (wp 0)
    if (pS >= 0) {
      const prev = c.pS;
      c.pS = pS;
      if (prev > c.wp.length * 0.75 && pS < c.wp.length * 0.25) {
        c.lap++;
        if (c.lap > c.laps) { this._finishCircuit(); return; }
        this._sfx('check');
      }
    }
    // posición
    const scores = [{ s: c.lap * 100000 + pS, me: true }];
    for (const r of c.rivals) scores.push({ s: (Math.floor(r.s / (c.wp.length * 3)) + 1) * 100000 + r.wi });
    scores.sort((a, b) => b.s - a.s);
    const pos = scores.findIndex(s => s.me) + 1;
    const ord = ['1º', '2º', '3º', '4º'];
    this._hud(this._t('sp.lap', { n: Math.min(c.lap, c.laps), m: c.laps }) + ' · ' + this._t('sp.pos', { n: ord[pos - 1] || pos }) + ' · ' + this._fmtTime(c.time));
  },
  _finishCircuit() {
    const c = this.cur;
    const scores = [{ s: c.lap * 100000 + c.pS, me: true }];
    for (const r of c.rivals) scores.push({ s: (Math.floor(r.s / (c.wp.length * 3)) + 1) * 100000 + r.wi });
    scores.sort((a, b) => b.s - a.s);
    const pos = scores.findIndex(s => s.me) + 1;
    const prizes = [100, 50, 25, 10];
    const coins = prizes[pos - 1] || 10;
    const rec = this._setBest('sp_' + c.id, c.time, true);
    this._endSport(this._t('sp.finish', { t: this._fmtTime(c.time), best: rec.txt }), this._t(pos === 1 ? 'sp.win' : 'sp.lose', { n: coins }), coins);
  },
});

/* ============ ⚽ FÚTBOL 3v3 ============ */
Object.assign(Sports, {
  _startSoccer() {
    const P = (typeof Player !== 'undefined') ? Player : null;
    if (!P) return false;
    const g = this._newVenue();
    const cx = P.pos.x, cz = P.pos.z + 26;
    const W = 34, D = 22, GW = 3.2;
    this._ground(W + 8, D + 8, 0x3f9e4d);
    this._line(cx - W / 2, cz - D / 2, cx + W / 2, cz - D / 2);
    this._line(cx - W / 2, cz + D / 2, cx + W / 2, cz + D / 2);
    this._line(cx - W / 2, cz - D / 2, cx - W / 2, cz + D / 2);
    this._line(cx + W / 2, cz - D / 2, cx + W / 2, cz + D / 2);
    this._line(cx, cz - D / 2, cx, cz + D / 2);
    // porterías
    for (const s of [-1, 1]) {
      const gx = cx + s * W / 2;
      for (const gz of [-GW, GW]) {
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 2.6, 8), this._mat(0xffffff));
        p.position.set(gx, 1.3, cz + gz); g.add(p);
      }
      const cross = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, GW * 2, 8), this._mat(0xffffff));
      cross.rotation.x = Math.PI / 2; cross.position.set(gx, 2.6, cz); g.add(cross);
    }
    this._spawnBall(0.45, 0xffffff, cx, cz);
    const blue = [], red = [];
    for (let i = 0; i < 2; i++) blue.push(this._athlete(0x3fa7ff, cx - 8 - i * 4, cz - 5 + i * 10));
    for (let i = 0; i < 3; i++) red.push(this._athlete(0xff5f5f, cx + 8 + i * 3, cz - 7 + i * 7));
    // llevar al jugador al campo
    try { P.pos.set(cx - 12, P.pos.y, cz); P.vel.set(0, 0, 0); } catch (e) {}
    this.cur = {
      id: 'soccer', phase: 'count', t: 3.2, lastN: 4, time: 180, a: 0, b: 0,
      blue, red, cx, cz, W, D, GW, kickCd: 0,
      tick: (dt) => this._tickSoccer(dt),
    };
    this._hud(this._t('sp.count', { n: 3 })); this._sfx('count');
    return true;
  },
  _tickSoccer(dt) {
    const c = this.cur, b = this.ball;
    if (c.phase === 'count') {
      c.t -= dt;
      const n = Math.ceil(c.t);
      if (n !== c.lastN && n >= 1) { c.lastN = n; this._hud(this._t('sp.count', { n })); this._sfx('count'); }
      if (c.t <= 0) { c.phase = 'run'; this._hud(this._t('sp.go')); this._sfx('check'); }
      return;
    }
    c.time -= dt;
    if (c.time <= 0) { this._finishSoccer(); return; }
    c.kickCd -= dt;
    // jugador patea al tocar
    if (c.kickCd <= 0 && this._playerKick(13, 3.2, 2.4)) c.kickCd = 0.5;
    // robots: el más cercano de cada equipo persigue
    const chase = (team, gx, gz, foe) => {
      let chaser = null, bd = 1e9;
      for (const a of team) {
        const d = Math.hypot(a.x - b.x, a.z - b.z);
        if (d < bd) { bd = d; chaser = a; }
      }
      for (const a of team) {
        if (a === chaser) {
          if (bd < 1.6) { // patea al arco rival
            this._kickBall(gx + (Math.random() - 0.5) * 3, gz + (Math.random() - 0.5) * 3, 12 + Math.random() * 4, 2.5);
          } else this._seek(a, b.x, b.z, dt, 5.2);
        } else {
          // apoyo: vuelve a su zona
          const hx = c.cx + (foe ? 6 : -6), hz = c.cz + (team.indexOf(a) - 0.5) * 8;
          this._seek(a, hx, hz, dt, 3.5);
        }
      }
    };
    chase(c.blue, c.cx + c.W / 2, c.cz, false);
    chase(c.red, c.cx - c.W / 2, c.cz, true);
    this._ballStep(dt, { x0: c.cx - c.W / 2 - 4, x1: c.cx + c.W / 2 + 4, z0: c.cz - c.D / 2 - 4, z1: c.cz + c.D / 2 + 4 });
    // goles
    if (Math.abs(b.z - c.cz) < c.GW && b.y < 2.6) {
      if (b.x > c.cx + c.W / 2) { c.a++; this._goalReset('a', c); return; }
      if (b.x < c.cx - c.W / 2) { c.b++; this._goalReset('b', c); return; }
    }
    this._hud(this._t('sp.score', { a: c.a, b: c.b }) + ' · ' + this._fmtTime(c.time));
  },
  _goalReset(side, c) {
    this._toast(this._t('sp.goal')); this._sfx('win');
    try {
      if (typeof Particles !== 'undefined') Particles.burst(this.ball.x, 2, this.ball.z, [0xffd23f, 0xffffff], 25, 6);
    } catch (e) {}
    this._spawnBall(0.45, 0xffffff, c.cx, c.cz);
    const P = (typeof Player !== 'undefined') ? Player : null;
    try { if (P) { P.pos.set(c.cx - 12, P.pos.y, c.cz); P.vel.set(0, 0, 0); } } catch (e) {}
    void side;
  },
  _finishSoccer() {
    const c = this.cur;
    let coins, key;
    if (c.a > c.b) { coins = 80; key = 'sp.win'; }
    else if (c.a === c.b) { coins = 30; key = 'sp.draw'; }
    else { coins = 10; key = 'sp.lose'; }
    this._setBest('sp_soccer', c.a, false);
    this._endSport(this._t('sp.score', { a: c.a, b: c.b }), this._t(key, { n: coins }), coins);
  },
});

/* ============ 🏀 BÁSQUET (encesta en 60s) ============ */
Object.assign(Sports, {
  _startBasket() {
    const P = (typeof Player !== 'undefined') ? Player : null;
    if (!P) return false;
    const g = this._newVenue();
    const cx = P.pos.x, cz = P.pos.z + 20;
    const W = 16, D = 14, HX = cx + W / 2 - 1.5;
    this._ground(W + 6, D + 6, 0xb06b3f);
    this._line(cx - W / 2, cz - D / 2, cx - W / 2, cz + D / 2);
    this._line(cx - W / 2, cz + D / 2, cx + W / 2, cz + D / 2);
    this._line(cx - W / 2, cz - D / 2, cx + W / 2, cz - D / 2);
    // aro: poste + tablero + canasta
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 3.6, 8), this._mat(0x888888));
    pole.position.set(HX + 1.2, 1.8, cz); g.add(pole);
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.1, 1.7), this._mat(0xffffff));
    board.position.set(HX + 0.7, 3.4, cz); g.add(board);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.06, 8, 18), this._mat(0xff5f2f));
    rim.rotation.x = Math.PI / 2; rim.position.set(HX, 3.05, cz); g.add(rim);
    this._spawnBall(0.35, 0xe8722a, cx - 5, cz);
    try { P.pos.set(cx - 5, P.pos.y, cz + 3); P.vel.set(0, 0, 0); } catch (e) {}
    const btn = this._bigBtn(this._t('sp.shoot'), 'sp-bigbtn');
    if (btn) btn.onclick = () => this._shootBasket();
    this.cur = {
      id: 'basket', phase: 'run', time: 60, score: 0, cx, cz, HX,
      tick: (dt) => this._tickBasket(dt),
    };
    this._hud(this._t('sp.baskets', { n: 0 }) + ' · ' + this._fmtTime(60));
    this._toast(this._t('sp.go')); this._sfx('check');
    return true;
  },
  _shootBasket() {
    const c = this.cur, b = this.ball;
    if (!c || c.id !== 'basket' || !b || !b.carried) return;
    b.carried = false;
    // tiro con asistencia: parábola hacia el aro
    const dx = c.HX - b.x, dz = c.cz - b.z, d = Math.hypot(dx, dz);
    const T2 = Math.max(0.5, d / 9);
    b.vx = dx / T2; b.vz = dz / T2;
    b.vy = (3.05 - b.y) / T2 + 0.5 * SP_GRAV * T2;
    this._sfx('kick');
  },
  _tickBasket(dt) {
    const c = this.cur, b = this.ball;
    c.time -= dt;
    if (c.time <= 0) { this._finishBasket(); return; }
    const P = (typeof Player !== 'undefined') ? Player : null;
    if (P && !b.carried && Math.hypot(P.pos.x - b.x, P.pos.z - b.z) < 1.6 && b.y < 1.6) {
      b.carried = true; this._sfx('click');
    }
    if (b.carried && P) { b.x = P.pos.x; b.y = P.pos.y + 2.1; b.z = P.pos.z; this._ballSync(); }
    else {
      const before = b.vy;
      this._ballStep(dt, null);
      // ¿encestó? cruza el plano del aro hacia abajo dentro del radio
      if (before < 0 && Math.abs(b.y - 3.05) < 0.5) {
        const d = Math.hypot(b.x - c.HX, b.z - c.cz);
        if (d < 0.5 && !b.scored) {
          b.scored = true; c.score++;
          this._toast('🏀 ¡Enceste!'); this._sfx('win');
          try { if (typeof Particles !== 'undefined') Particles.burst(c.HX, 3.4, c.cz, [0xffd23f, 0xff5f2f], 20, 5); } catch (e) {}
        }
      }
      if (b.y <= b.r + 0.01) b.scored = false;
      // la pelota no se pierde: rebota en límites
      if (Math.abs(b.x - c.cx) > 14 || Math.abs(b.z - c.cz) > 12) {
        this._spawnBall(0.35, 0xe8722a, c.cx - 5, c.cz);
      }
    }
    this._hud(this._t('sp.baskets', { n: c.score }) + ' · ' + this._fmtTime(c.time));
  },
  _finishBasket() {
    const c = this.cur;
    const coins = c.score * 15;
    const rec = this._setBest('sp_basket', c.score, false);
    this._hideBigBtn('sp-bigbtn');
    this._endSport(this._t('sp.baskets', { n: c.score }) + rec.txt, this._t(coins > 0 ? 'sp.win' : 'sp.lose', { n: coins }), coins);
  },
});

/* ============ 🎾 TENIS / 🏓 PING PONG / 🏐 VOLEIBOL (rally) ============ */
Object.assign(Sports, {
  _startRally(kind) { // 'tennis' | 'pingpong' | 'volley'
    const P = (typeof Player !== 'undefined') ? Player : null;
    if (!P) return false;
    const cfg = {
      tennis:   { W: 16, D: 8, netH: 1,   ballR: 0.32, ballC: 0xd8ff5e, spd: 9,  to: 5 },
      pingpong: { W: 8,  D: 4, netH: 0.5, ballR: 0.16, ballC: 0xffffff, spd: 8,  to: 5 },
      volley:   { W: 16, D: 8, netH: 2.2, ballR: 0.4,  ballC: 0xffffff, spd: 8,  to: 5 },
    }[kind];
    if (!cfg) return false;
    const g = this._newVenue();
    const cx = P.pos.x, cz = P.pos.z + 16;
    this._ground(cfg.W + 6, cfg.D + 6, kind === 'volley' ? 0xd8b25e : 0x3f9e4d);
    this._line(cx - cfg.W / 2, cz - cfg.D / 2, cx + cfg.W / 2, cz - cfg.D / 2);
    this._line(cx - cfg.W / 2, cz + cfg.D / 2, cx + cfg.W / 2, cz + cfg.D / 2);
    this._line(cx - cfg.W / 2, cz - cfg.D / 2, cx - cfg.W / 2, cz + cfg.D / 2);
    this._line(cx + cfg.W / 2, cz - cfg.D / 2, cx + cfg.W / 2, cz + cfg.D / 2);
    this._line(cx, cz - cfg.D / 2, cx, cz + cfg.D / 2, 0xffffff, 0.2);
    // red
    const net = new THREE.Mesh(new THREE.PlaneGeometry(cfg.D, cfg.netH), this._mat(0x222831, 1));
    net.material.transparent = true; net.material.opacity = 0.55;
    net.rotation.y = Math.PI / 2; net.position.set(cx, cfg.netH / 2, cz); g.add(net);
    for (const s of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, cfg.netH + 0.3, 8), this._mat(0xdddddd));
      post.position.set(cx, (cfg.netH + 0.3) / 2, cz + s * cfg.D / 2); g.add(post);
    }
    const bots = [];
    bots.push(this._athlete(0xff5f5f, cx + cfg.W / 4, cz));
    if (kind === 'volley') {
      bots.push(this._athlete(0x3fa7ff, cx - cfg.W / 4, cz - 2));
      bots.push(this._athlete(0xff5f5f, cx + cfg.W / 4, cz + 2));
    }
    this._spawnBall(cfg.ballR, cfg.ballC, cx - cfg.W / 4, cz);
    try { P.pos.set(cx - cfg.W / 4, P.pos.y, cz + 1); P.vel.set(0, 0, 0); } catch (e) {}
    this.cur = Object.assign({
      id: kind, phase: 'serve', t: 1.2, a: 0, b: 0, bots, cx, cz,
      hitCd: 0, serveSide: -1,
      tick: (dt) => this._tickRally(dt),
    }, cfg);
    this._hud(this._t('sp.serve')); this._sfx('count');
    return true;
  },
  _rallyPoint(winner) { // 'a' = jugador/azul
    const c = this.cur;
    if (winner === 'a') c.a++; else c.b++;
    this._toast(this._t('sp.point', { a: c.a, b: c.b }));
    this._sfx(winner === 'a' ? 'win' : 'deny');
    if (c.a >= c.to || c.b >= c.to) { this._finishRally(); return; }
    c.phase = 'serve'; c.t = 1.4; c.serveSide = winner === 'a' ? 1 : -1;
    this._spawnBall(c.ballR, c.ballC, c.cx + c.serveSide * c.W / 4, c.cz);
  },
  _tickRally(dt) {
    const c = this.cur, b = this.ball;
    c.hitCd -= dt;
    if (c.phase === 'serve') {
      c.t -= dt;
      if (c.t <= 0) {
        c.phase = 'run';
        // saque hacia el lado del jugador
        this._kickBall(c.cx - c.W / 4, c.cz + (Math.random() - 0.5) * 2, c.spd * 0.7, 3);
      }
      return;
    }
    const onA = b.x < c.cx; // lado del jugador (izquierda)
    // jugador devuelve: pelota cerca, de su lado y bajita
    const P = (typeof Player !== 'undefined') ? Player : null;
    if (c.hitCd <= 0 && P && onA) {
      const d = Math.hypot(P.pos.x - b.x, P.pos.z - b.z);
      if (d < 2.4 && b.y < c.netH + 1.6) {
        c.hitCd = 0.7;
        this._kickBall(c.cx + c.W / 4 + (Math.random() - 0.5) * 3, c.cz + (Math.random() - 0.5) * (c.D / 2), c.spd, c.netH + 1.2);
      }
    }
    // robots devuelven
    for (const bot of c.bots) {
      const botSideA = bot.x < c.cx;
      if (botSideA === onA) { // está del lado de la pelota
        if (Math.hypot(bot.x - b.x, bot.z - b.z) > 1.2) this._seek(bot, b.x, b.z, dt, 5.5);
        else if (c.hitCd <= 0 && b.y < c.netH + 1.6) {
          c.hitCd = 0.7;
          const tx = botSideA ? c.cx + c.W / 4 : c.cx - c.W / 4;
          this._kickBall(tx + (Math.random() - 0.5) * 3, c.cz + (Math.random() - 0.5) * (c.D / 2), c.spd, c.netH + 1.2);
        }
      } else {
        this._seek(bot, botSideA ? c.cx - c.W / 4 : c.cx + c.W / 4, c.cz, dt, 3);
      }
    }
    const bounced = this._ballStep(dt, null);
    // red: la pelota no pasa
    if (Math.abs(b.x - c.cx) < 0.4 && b.y < c.netH) {
      this._rallyPoint(onA ? 'b' : 'a'); return;
    }
    // fuera de la cancha
    if (Math.abs(b.x - c.cx) > c.W / 2 + 2 || Math.abs(b.z - c.cz) > c.D / 2 + 2) {
      this._rallyPoint(onA ? 'b' : 'a'); return;
    }
    // doble bote en un lado
    if (bounced) {
      b.sideBounces = b.sideBounces || {};
      const k = onA ? 'a' : 'b';
      b.sideBounces[k] = (b.sideBounces[k] || 0) + 1;
      b.sideBounces[onA ? 'b' : 'a'] = 0;
      if (b.sideBounces[k] >= 2) { this._rallyPoint(onA ? 'b' : 'a'); return; }
    }
    this._hud(this._t('sp.score', { a: c.a, b: c.b }) + ' · ' + this._t('sp.first', { n: c.to }));
  },
  _finishRally() {
    const c = this.cur;
    const win = c.a > c.b;
    const coins = win ? 60 : 15;
    this._setBest('sp_' + c.id, c.a, false);
    this._endSport(this._t('sp.score', { a: c.a, b: c.b }), this._t(win ? 'sp.win' : 'sp.lose', { n: coins }), coins);
  },
});

/* ============ 🏊 NATACIÓN 50m ============ */
Object.assign(Sports, {
  _startSwim() {
    const P = (typeof Player !== 'undefined') ? Player : null;
    if (!P) return false;
    const g = this._newVenue();
    const L = 50, W = 8, SURF = 2.0;
    const cx = P.pos.x, z0 = P.pos.z + 14, z1 = z0 + L;
    // muros
    const wallM = this._mat(0x9fd8ff);
    for (const s of [-1, 1]) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.6, SURF + 0.6, L + 1), wallM);
      w.position.set(cx + s * (W / 2 + 0.3), (SURF + 0.6) / 2, (z0 + z1) / 2); g.add(w);
    }
    for (const z of [z0 - 0.3, z1 + 0.3]) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(W + 1.2, SURF + 0.6, 0.6), wallM);
      w.position.set(cx, (SURF + 0.6) / 2, z); g.add(w);
    }
    // agua visual
    const wat = new THREE.Mesh(new THREE.PlaneGeometry(W, L), new THREE.MeshStandardMaterial({ color: 0x2f9dff, transparent: true, opacity: 0.75 }));
    wat.rotation.x = -Math.PI / 2; wat.position.set(cx, SURF, (z0 + z1) / 2); g.add(wat);
    // carriles
    for (const lx of [-W / 6, W / 6]) this._line(cx + lx, z0, cx + lx, z1, 0xffffff, 0.25);
    // zona de agua real para el nado
    let zone = null;
    try {
      if (typeof WATER_ZONES !== 'undefined') {
        zone = { x0: cx - W / 2, x1: cx + W / 2, z0, z1, y: SURF };
        WATER_ZONES.push(zone);
      }
    } catch (e) {}
    if (!zone) { this._toast('💧 ' + this._t('sp.noWater')); this.cancel(); return false; }
    try { P.pos.set(cx, 0.6, z0 + 2); P.vel.set(0, 0, 0); } catch (e) {}
    this.cur = {
      id: 'swim', phase: 'run', time: 0, cx, z1, zone,
      tick: (dt) => this._tickSwim(dt),
    };
    this._hud(this._t('sp.time', { t: '0.0s' }));
    this._toast(this._t('sp.swimGo')); this._sfx('check');
    return true;
  },
  _tickSwim(dt) {
    const c = this.cur, P = (typeof Player !== 'undefined') ? Player : null;
    if (!P) { this.cancel(); return; }
    c.time += dt;
    if (P.pos.z >= c.z1 - 1) {
      const rec = this._setBest('sp_swim', c.time, true);
      const coins = 40 + (rec.best ? 20 : 0);
      this._endSport(this._t('sp.finish', { t: this._fmtTime(c.time), best: rec.txt }), this._t('sp.win', { n: coins }), coins);
      return;
    }
    this._hud(this._t('sp.time', { t: this._fmtTime(c.time) }));
  },
});

/* ============ 🏋️ FUERZA (toca rápido) ============ */
Object.assign(Sports, {
  _startLift() {
    const P = (typeof Player !== 'undefined') ? Player : null;
    if (!P) return false;
    const g = this._newVenue();
    const cx = P.pos.x, cz = P.pos.z + 8;
    this._ground(10, 10, 0x6b5f4e);
    // barra con pesas que sube con los toques
    const bar = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3, 8), this._mat(0xcccccc));
    pole.rotation.z = Math.PI / 2; pole.position.y = 1; bar.add(pole);
    for (const s of [-1.4, 1.4]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.25, 12), this._mat(0x333344));
      w.rotation.z = Math.PI / 2; w.position.set(s, 1, 0); bar.add(w);
    }
    bar.position.set(cx, 0, cz); g.add(bar);
    try { P.pos.set(cx, P.pos.y, cz + 4); P.vel.set(0, 0, 0); } catch (e) {}
    const btn = this._bigBtn(this._t('sp.liftTap'), 'sp-bigbtn');
    if (btn) btn.onclick = () => { if (this.cur && this.cur.id === 'lift' && this.cur.phase === 'run') { this.cur.taps++; this._sfx('click'); } };
    this.cur = {
      id: 'lift', phase: 'run', time: 10, taps: 0, bar,
      tick: (dt) => this._tickLift(dt),
    };
    this._hud(this._t('sp.liftTap') + ' · 10.0s');
    this._sfx('count');
    return true;
  },
  _tickLift(dt) {
    const c = this.cur;
    c.time -= dt;
    c.bar.position.y = Math.min(2.2, c.taps * 0.06);
    if (c.time <= 0) {
      const coins = c.taps * 2;
      const rec = this._setBest('sp_lift', c.taps, false);
      this._hideBigBtn('sp-bigbtn');
      this._endSport('🏋️ ' + c.taps + ' toques' + rec.txt, this._t('sp.win', { n: coins }), coins);
      return;
    }
    this._hud('🏋️ ' + c.taps + ' · ' + this._fmtTime(c.time));
  },
});

/* ============ menú, inicio y fin ============ */
Object.assign(Sports, {
  _menu() {
    return [
      { id: 'race', emoji: '🏁' }, { id: 'bike', emoji: '🚴' },
      { id: 'soccer', emoji: '⚽' }, { id: 'basket', emoji: '🏀' },
      { id: 'tennis', emoji: '🎾' }, { id: 'pingpong', emoji: '🏓' },
      { id: 'volley', emoji: '🏐' }, { id: 'swim', emoji: '🏊' },
      { id: 'lift', emoji: '🏋️' }, { id: 'dash', emoji: '🌀' },
    ];
  },
  _bestLabel(id) {
    const b = this._best('sp_' + id);
    if (b == null) return '';
    const isTime = (id === 'race' || id === 'bike' || id === 'swim');
    return '<div class="pow-state">' + this._t('sp.best') + ': ' + (isTime ? this._fmtTime(b) : b) + '</div>';
  },
  openMenu() {
    this._sfx('click');
    const cards = this._menu().map(s =>
      '<div class="pow-card"><div class="pow-emoji">' + s.emoji + '</div>' +
      '<div class="pow-info"><div class="pow-name">' + this._t('sp.' + s.id) + '</div>' +
      '<div class="pow-desc">' + this._t('sp.' + s.id + 'd') + '</div>' + this._bestLabel(s.id) + '</div>' +
      '<button class="btn pow-btn" data-sp="start" data-id="' + s.id + '">' + this._t('sp.play') + '</button></div>'
    ).join('');
    this._showPanel(this._t('sp.title'), cards);
  },
  _ensurePanel() {
    if (this.panel) return;
    try {
      const p = document.createElement('div');
      p.id = 'sp-panel';
      p.className = 'screen overlay hidden';
      document.body.appendChild(p);
      this.panel = p;
    } catch (e) {}
  },
  _showPanel(title, body) {
    this._ensurePanel();
    if (!this.panel) return;
    this.panel.innerHTML = '<div class="panel" style="max-width:440px;width:100%"><h2>' + title + '</h2>' + body +
      '<div class="menu-buttons"><button class="btn" data-sp="close">✕ ' + this._t('sp.close') + '</button></div></div>';
    const q = (sel) => Array.prototype.slice.call(this.panel.querySelectorAll(sel));
    q('[data-sp="close"]').forEach(b => b.addEventListener('click', () => this.closePanel()));
    q('[data-sp="start"]').forEach(b => b.addEventListener('click', () => this.start(b.getAttribute('data-id'))));
    q('[data-sp="again"]').forEach(b => b.addEventListener('click', () => this.start(b.getAttribute('data-id'))));
    this.panel.classList.remove('hidden');
  },
  closePanel() { try { if (this.panel) this.panel.classList.add('hidden'); } catch (e) {} },

  start(id) {
    if (this.cur) this.cancel();
    this.closePanel();
    if (id === 'dash') {
      if (typeof Minigames !== 'undefined' && typeof Minigames.start === 'function') Minigames.start('dash');
      return true;
    }
    const fn = { race: '_startCircuit', bike: '_startCircuit', soccer: '_startSoccer', basket: '_startBasket', tennis: '_startRally', pingpong: '_startRally', volley: '_startRally', swim: '_startSwim', lift: '_startLift' }[id];
    if (!fn || typeof this[fn] !== 'function') return false;
    const ok = (id === 'race' || id === 'bike') ? this[fn](id) : (id === 'tennis' || id === 'pingpong' || id === 'volley') ? this[fn](id) : this[fn]();
    if (!ok) this._clearVenue();
    return !!ok;
  },
  _endSport(title, subtitle, coins) {
    const id = this.cur ? this.cur.id : '';
    this._cleanupSport();
    this._hideHud();
    this._earn(coins);
    this._sfx('win');
    try {
      if (typeof Particles !== 'undefined' && typeof Player !== 'undefined' && Player)
        Particles.burst(Player.pos.x, Player.pos.y + 2, Player.pos.z, [0xffd23f, 0x00e5ff, 0xff2fd6], 40, 7);
    } catch (e) {}
    try {
      if (typeof Trophy !== 'undefined' && Trophy && typeof Trophy.unlock === 'function') Trophy.unlock('sportWin');
    } catch (e) {}
    this._showPanel('🏟️', '<div class="pow-card"><div class="pow-emoji">🏆</div>' +
      '<div class="pow-info"><div class="pow-name">' + title + '</div><div class="pow-desc">' + subtitle + '</div></div></div>' +
      '<div class="menu-buttons"><button class="btn" data-sp="again" data-id="' + id + '">🔁 ' + this._t('sp.play') + '</button> ' +
      '<button class="btn" data-sp="close">✕</button></div>');
  },
  _cleanupSport() {
    const c = this.cur;
    try {
      if (c && c.def && typeof Vehicle !== 'undefined') {
        if (Vehicle.def === c.def) { Vehicle.mode = 'none'; Vehicle.def = null; Vehicle.speed = 0; }
        c.def.taken = false;
      }
      if (c && c.zone && typeof WATER_ZONES !== 'undefined') {
        const i = WATER_ZONES.indexOf(c.zone);
        if (i >= 0) WATER_ZONES.splice(i, 1);
      }
    } catch (e) {}
    this._hideBigBtn('sp-bigbtn');
    this._clearVenue();
    this.cur = null;
  },
  cancel() {
    if (!this.cur) { this.closePanel(); return; }
    this._cleanupSport();
    this._hideHud();
    this.closePanel();
    this._toast(this._t('sp.cancel'));
  },
});
