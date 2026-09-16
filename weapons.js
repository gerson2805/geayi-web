/* 🔫🧸 Armas de JUGUETE tipo Roblox — diseños 100% originales GEAYI.
   Son juguetes de espuma/agua, nada realista, nada de marcas reales.
   - 3 básicas con monedas del juego 🪙: Lanzadardos, Pistola de Agua, Espada de Espuma.
   - 3 premium con dinero real 💳 (Billing demo): Turbo, Cañón de Espuma, Espada Sónica.
   - 🔒 Control parental con PIN: sin PIN no se puede comprar, equipar ni disparar.
   - Blancos "tiro al blanco" en Ciudad Neón y en Immokalee: darles da monedas.
   API para el coordinador: Weapons.equipped(), equippedDef(), tryFire(), swing(),
   update(dt), buildForLevel(i, group), equip(id), unequip(), owns(id), list(),
   buyBasic(id), buyPremium(id), grant(id), isUnlocked(), hasPin(), createPin(pin),
   unlockWithPin(pin), lockSession(), openPinPad(cb), targets(), activeShots(). */
(function () {
  'use strict';

  /* Catálogo: type 'ranged' | 'melee'. coin:true = se compra con 🪙; si no, con USD vía Billing. */
  var CATALOG = [
    { id: 'dart',   emoji: '🔫', name: 'Lanzadardos GEAYI', price: 200, coin: true, type: 'ranged',
      cooldown: 0.35, speed: 19, grav: 7, range: 26, reward: 10, desc: 'Dardos de espuma con punta naranja' },
    { id: 'water',  emoji: '💦', name: 'Pistola de Agua',   price: 120, coin: true, type: 'ranged',
      cooldown: 0.25, speed: 14, grav: 10, range: 13, reward: 10, desc: 'Chorrito de agua fresquita' },
    { id: 'sword',  emoji: '🗡️', name: 'Espada de Espuma',  price: 150, coin: true, type: 'melee',
      cooldown: 0.5, meleeRange: 2.8, reward: 10, desc: 'Golpes suavecitos de espuma' },
    { id: 'turbo',  emoji: '🔫', name: 'Lanzadardos Turbo', price: '$0.99', usd: 0.99, sku: 'geayi_weapon_turbo', type: 'ranged',
      cooldown: 0.18, speed: 25, grav: 6, range: 36, reward: 20, desc: '¡Doble de rápido y más alcance!' },
    { id: 'cannon', emoji: '💥', name: 'Cañón de Espuma',   price: '$1.99', usd: 1.99, sku: 'geayi_weapon_cannon', type: 'ranged',
      cooldown: 0.6, speed: 21, grav: 7, range: 30, reward: 10, n: 3, spread: 0.14, desc: 'Disparo triple en abanico' },
    { id: 'sonic',  emoji: '⚡', name: 'Espada Sónica',     price: '$2.99', usd: 2.99, sku: 'geayi_weapon_sonic', type: 'melee',
      cooldown: 0.3, meleeRange: 4.0, reward: 15, desc: 'Alcance 4m, golpe rapidísimo' },
  ];
  var BY_ID = {};
  CATALOG.forEach(function (w) { BY_ID[w.id] = w; });

  var W = {
    _pool: [], _targets: [], _mesh: null, _meshId: null, _baseRotX: 0.35,
    _cd: 0, _swingT: 0, _group: null, _avatarG: null,
    _sessionUnlocked: false, // 🔒 solo vive en memoria: se pierde al cerrar el juego
    _pinCb: null,
  };

  /* ---------- estado ---------- */
  function _save() {
    try {
      if (!SAVE.weapons || typeof SAVE.weapons !== 'object' || !SAVE.weapons.owned || typeof SAVE.weapons.owned !== 'object')
        SAVE.weapons = { owned: {}, equipped: null };
      if (!SAVE.parental || typeof SAVE.parental !== 'object')
        SAVE.parental = { pin: null, weaponsLocked: true };
    } catch (e) {}
    return SAVE;
  }
  function _toast(m) { try { toast(m); } catch (e) {} }
  function _snd(fn) { try { if (typeof Audio2 !== 'undefined' && Audio2 && Audio2[fn]) Audio2[fn](); } catch (e) {} }
  function _pew() { try { if (typeof Audio2 !== 'undefined' && Audio2.tone) Audio2.tone(880, 0.08, 'square', 0.08, 0, 220); } catch (e) {} }

  /* ---------- control parental ---------- */
  function isUnlocked() { return W._sessionUnlocked === true; }
  function hasPin() { _save(); return !!(SAVE.parental && SAVE.parental.pin); }
  function createPin(pin) {
    _save();
    if (!/^\d{4}$/.test(String(pin))) return false;
    SAVE.parental.pin = String(pin);
    try { persist(); } catch (e) {}
    W._sessionUnlocked = true;
    return true;
  }
  function unlockWithPin(pin) {
    _save();
    if (!SAVE.parental.pin) return false;
    if (String(pin) === String(SAVE.parental.pin)) { W._sessionUnlocked = true; return true; }
    return false;
  }
  function lockSession() { W._sessionUnlocked = false; } // para pruebas / cerrar sesión

  function _locked() {
    if (isUnlocked()) return false;
    _toast('🔒 Pide a un adulto');
    _snd('deny');
    return true;
  }

  /* ---------- catálogo / propiedad ---------- */
  function list() { return CATALOG.slice(); }
  function _def(id) { return BY_ID[id] || null; }
  function owns(id) { _save(); return !!(SAVE.weapons.owned && SAVE.weapons.owned[id]); }
  function equipped() { _save(); return SAVE.weapons.equipped || null; }
  function equippedDef() { var id = equipped(); return id ? _def(id) : null; }
  function grant(id) { // marca como propia (usado por Billing.deliver y buyPremium)
    _save();
    if (!_def(id)) return false;
    SAVE.weapons.owned[id] = true;
    try { persist(); } catch (e) {}
    return true;
  }

  /* ---------- compra ---------- */
  function buyBasic(id) {
    try {
      if (_locked()) return false;
      var def = _def(id);
      if (!def || !def.coin) return false;
      if (owns(id)) { equip(id); return true; }
      if (typeof Shop2 !== 'undefined' && Shop2.spendCoins) {
        if (!Shop2.spendCoins(def.price)) { _toast('🪙 Te faltan monedas (' + def.price + ' 🪙)'); _snd('deny'); return false; }
      } else return false;
      grant(id);
      _snd('buy');
      equip(id);
      _toast(def.emoji + ' ¡Compraste ' + def.name + '!');
      return true;
    } catch (e) { return false; }
  }
  async function buyPremium(id) {
    try {
      if (_locked()) return false;
      var def = _def(id);
      if (!def || def.coin || !def.sku) return false;
      if (owns(id)) { equip(id); return true; }
      if (typeof Billing === 'undefined' || !Billing.buy) return false;
      var r = await Billing.buy(def.sku);
      if (r && r.ok) {
        grant(id);
        _snd('buy');
        equip(id);
        _toast(def.emoji + ' ¡Compraste ' + def.name + '!');
        return true;
      }
      return false;
    } catch (e) { return false; }
  }

  /* ---------- equipar (mano derecha, como pickupItem) ---------- */
  function _std(c, emissive) {
    try { return new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, metalness: 0.05, emissive: emissive || 0x000000, emissiveIntensity: emissive ? 0.55 : 0 }); }
    catch (e) { return new THREE.MeshStandardMaterial({ color: c }); }
  }
  function _box(w, h, d, m, x, y, z) {
    var b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.set(x || 0, y || 0, z || 0);
    return b;
  }
  function _cyl(r1, r2, h, m, x, y, z, seg) {
    var c = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg || 10), m);
    c.position.set(x || 0, y || 0, z || 0);
    return c;
  }
  /* Modelos blocky de juguete, apuntando a +z. Nada que parezca arma real. */
  function _buildWeaponMesh(def) {
    var g = new THREE.Group();
    try {
      if (def.id === 'dart' || def.id === 'turbo') {
        var big = def.id === 'turbo';
        var bodyC = big ? 0xe53935 : 0x1e88e5, accC = big ? 0xffee58 : 0xff8a2a;
        g.add(_box(big ? 0.17 : 0.14, big ? 0.19 : 0.16, big ? 0.5 : 0.42, _std(bodyC), 0, 0, 0));
        var bar = _cyl(0.055, 0.055, 0.3, _std(accC), 0, 0.02, big ? 0.38 : 0.32); bar.rotation.x = Math.PI / 2; g.add(bar);
        var tip = _cyl(0.075, 0.075, 0.1, _std(0xffb74d), 0, 0.02, big ? 0.55 : 0.49); tip.rotation.x = Math.PI / 2; g.add(tip);
        g.add(_box(0.1, 0.22, 0.12, _std(0x4e342e), 0, -0.17, -0.1)); // mango
        g.add(_box(0.06, 0.06, 0.1, _std(accC), 0, big ? 0.13 : 0.11, -0.05)); // mira
        if (big) { // tanques laterales del turbo
          [-1, 1].forEach(function (s) {
            var t = _cyl(0.05, 0.05, 0.3, _std(0xffee58), s * 0.13, 0, 0.05); t.rotation.x = Math.PI / 2; g.add(t);
          });
        }
      } else if (def.id === 'water') {
        g.add(_box(0.13, 0.15, 0.4, _std(0x4fc3f7), 0, 0, 0));
        var tk = _cyl(0.08, 0.08, 0.22, _std(0x0288d1), 0, 0.14, -0.05); g.add(tk);
        var nz = _cyl(0.04, 0.055, 0.16, _std(0xff8a2a), 0, 0.01, 0.26); nz.rotation.x = Math.PI / 2; g.add(nz);
        g.add(_box(0.09, 0.2, 0.11, _std(0x01579b), 0, -0.16, -0.08));
      } else if (def.id === 'cannon') {
        g.add(_box(0.2, 0.2, 0.34, _std(0x7b1fa2), 0, 0, -0.05));
        var cb = _cyl(0.13, 0.15, 0.42, _std(0xff8a2a), 0, 0.02, 0.3); cb.rotation.x = Math.PI / 2; g.add(cb);
        var mz = _cyl(0.17, 0.17, 0.08, _std(0xffee58), 0, 0.02, 0.5); mz.rotation.x = Math.PI / 2; g.add(mz);
        g.add(_box(0.11, 0.22, 0.12, _std(0x4a148c), 0, -0.18, -0.12));
      } else { // espadas de espuma: sword / sonic
        var sonic = def.id === 'sonic';
        var bladeC = sonic ? 0xffee58 : 0xf5f5f5;
        g.add(_box(0.1, 0.1, sonic ? 0.85 : 0.7, _std(bladeC, sonic ? 0xffd600 : 0), 0, 0, sonic ? 0.5 : 0.42));
        g.add(_box(0.11, 0.11, 0.14, _std(sonic ? 0x00e5ff : 0xef5350), 0, 0, sonic ? 0.95 : 0.8)); // punta de espuma
        g.add(_box(sonic ? 0.3 : 0.24, 0.06, 0.07, _std(sonic ? 0x00e5ff : 0x1e88e5), 0, 0, 0.02)); // guarda
        var hd = _cyl(0.035, 0.035, 0.22, _std(0x4e342e), 0, 0, -0.12); hd.rotation.x = Math.PI / 2; g.add(hd);
      }
    } catch (e) {}
    return g;
  }
  function _detachMesh() {
    try {
      if (W._mesh && W._mesh.parent) W._mesh.parent.remove(W._mesh);
    } catch (e) {}
    W._mesh = null; W._meshId = null;
  }
  function _attach(id) {
    _detachMesh();
    var def = _def(id);
    if (!def || typeof THREE === 'undefined') return false;
    var mesh;
    try { mesh = _buildWeaponMesh(def); } catch (e) { return false; }
    W._mesh = mesh; W._meshId = id;
    try {
      var hand = (typeof handPivot === 'function') ? handPivot() : null;
      if (hand && hand.attach) {
        hand.attach(mesh); // conserva posición mundial, como pickupItem
        mesh.position.set(0, -0.72, 0.14); // en la palma 🤚
        mesh.rotation.set(0.35, 0, 0);
        W._baseRotX = 0.35;
        try { mesh.scale.setScalar(0.55); } catch (e2) {}
      } else {
        _ensureGroup();
        W._group.add(mesh);
        mesh.position.set(0, 1.2, 0);
      }
    } catch (e) {}
    try { W._avatarG = (typeof Avatar !== 'undefined' && Avatar.group) || null; } catch (e) {}
    return true;
  }
  function equip(id) {
    try {
      _save();
      if (_locked()) return false;
      if (!owns(id)) return false;
      SAVE.weapons.equipped = id;
      try { persist(); } catch (e) {}
      _attach(id);
      return true;
    } catch (e) { return false; }
  }
  function unequip() {
    try {
      _save();
      SAVE.weapons.equipped = null;
      try { persist(); } catch (e) {}
      _detachMesh();
      return true;
    } catch (e) { return false; }
  }
  /* Si el avatar se reconstruyó (outfits), re-equipa el arma. */
  function _keepAttached() {
    try {
      var id = equipped();
      if (!id) return;
      var Ag = (typeof Avatar !== 'undefined' && Avatar.group) || null;
      var carrying = (typeof window !== 'undefined' && window.__carried);
      if (W._mesh) W._mesh.visible = !carrying; // si lleva un producto en la mano, el arma se esconde
      if (!Ag) return;
      var inside = false;
      if (W._mesh && W._meshId === id) {
        var p = W._mesh.parent;
        while (p) { if (p === Ag) { inside = true; break; } p = p.parent; }
      }
      if (!inside || W._avatarG !== Ag) _attach(id);
    } catch (e) {}
  }

  /* ---------- proyectiles (pool de 12) ---------- */
  function _ensureGroup() {
    try {
      if (!W._group && typeof THREE !== 'undefined') {
        W._group = new THREE.Group();
        if (typeof scene !== 'undefined' && scene) scene.add(W._group);
      }
    } catch (e) {}
  }
  function _ensurePool() {
    try {
      if (W._pool.length || typeof THREE === 'undefined') return;
      _ensureGroup();
      for (var i = 0; i < 12; i++) {
        var g = new THREE.Group();
        var bodyM = _std(0xff8a2a), tipM = _std(0xffffff);
        var body = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.28, 8), bodyM);
        body.rotation.x = Math.PI / 2; g.add(body);
        var tip = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 6), tipM);
        tip.position.z = 0.17; g.add(tip);
        g.visible = false;
        if (W._group) W._group.add(g);
        W._pool.push({ o: g, bodyM: bodyM, tipM: tipM, active: false, vel: new THREE.Vector3(), life: 0, grav: 7, reward: 10 });
      }
    } catch (e) {}
  }
  function _freeShot() {
    _ensurePool();
    for (var i = 0; i < W._pool.length; i++) if (!W._pool[i].active) return W._pool[i];
    return null;
  }
  function _tintShot(p, def) {
    try {
      var bc = 0xff8a2a, tc = 0xffffff;
      if (def.id === 'dart') { bc = 0x1e88e5; tc = 0xff8a2a; }
      else if (def.id === 'water') { bc = 0x4fc3f7; tc = 0xb3e5fc; }
      else if (def.id === 'turbo') { bc = 0xe53935; tc = 0xffee58; }
      else if (def.id === 'cannon') { bc = 0x7b1fa2; tc = 0xff8a2a; p.o.scale.setScalar(1.6); }
      if (def.id !== 'cannon') p.o.scale.setScalar(1);
      if (p.bodyM && p.bodyM.color) p.bodyM.color.setHex ? p.bodyM.color.setHex(bc) : (p.bodyM.color.c = bc);
      if (p.tipM && p.tipM.color) p.tipM.color.setHex ? p.tipM.color.setHex(tc) : (p.tipM.color.c = tc);
    } catch (e) {}
  }
  function _killShot(p, burstIt) {
    try {
      if (burstIt && typeof Particles !== 'undefined')
        Particles.burst(p.o.position.x, p.o.position.y, p.o.position.z, [0xffffff, 0xffb74d, 0x4fc3f7], 10, 3);
    } catch (e) {}
    p.active = false;
    try { p.o.visible = false; } catch (e) {}
  }
  function activeShots() {
    var n = 0;
    for (var i = 0; i < W._pool.length; i++) if (W._pool[i].active) n++;
    return n;
  }
  function poolInfo() { // depuración/pruebas
    return W._pool.map(function (p) {
      return { active: p.active, x: p.o.position.x, y: p.o.position.y, z: p.o.position.z };
    });
  }

  function tryFire() {
    try {
      if (_locked()) return false;
      if (typeof MODE !== 'undefined' && MODE !== 'play') return false;
      var def = equippedDef();
      if (!def || def.type !== 'ranged') return false;
      if (W._cd > 0) return false;
      if (typeof Player === 'undefined' || !Player.pos) return false;
      _ensurePool();
      var h = Player.heading || 0;
      var n = def.n || 1, fired = 0;
      for (var k = 0; k < n; k++) {
        var p = _freeShot();
        if (!p) break;
        var a = h + ((n === 1) ? 0 : (k - (n - 1) / 2) * (def.spread || 0.14));
        var dx = Math.sin(a), dz = Math.cos(a);
        p.o.position.set(Player.pos.x + dx * 0.9, (Player.pos.y || 0) + 1.35, Player.pos.z + dz * 0.9);
        p.vel.set(dx * def.speed, 2.2, dz * def.speed);
        p.life = def.range / def.speed;
        p.grav = def.grav; p.reward = def.reward;
        _tintShot(p, def);
        p.active = true;
        try { p.o.visible = true; } catch (e2) {}
        fired++;
      }
      if (!fired) return false;
      W._cd = def.cooldown;
      _pew();
      return true;
    } catch (e) { return false; }
  }

  /* ---------- espada: golpe melee ---------- */
  function swing() {
    try {
      if (_locked()) return false;
      if (typeof MODE !== 'undefined' && MODE !== 'play') return false;
      var def = equippedDef();
      if (!def || def.type !== 'melee') return false;
      if (W._cd > 0) return false;
      if (typeof Player === 'undefined' || !Player.pos) return false;
      W._cd = def.cooldown;
      W._swingT = 0.28;
      try { if (typeof Audio2 !== 'undefined' && Audio2.tone) Audio2.tone(300, 0.1, 'sawtooth', 0.08, 0, 620); } catch (e2) {}
      var h = Player.heading || 0;
      var fx = Math.sin(h), fz = Math.cos(h), best = null, bd = 1e9;
      for (var i = 0; i < W._targets.length; i++) {
        var t = W._targets[i];
        if (!t.alive) continue;
        var dx = t.x - Player.pos.x, dz = t.z - Player.pos.z;
        var d = Math.sqrt(dx * dx + dz * dz);
        if (d > def.meleeRange) continue;
        if ((dx * fx + dz * fz) / (d || 1) < 0.5) continue; // solo al frente
        if (d < bd) { bd = d; best = t; }
      }
      if (best) _hitTarget(best, def.reward);
      return true;
    } catch (e) { return false; }
  }

  /* ---------- blancos ---------- */
  function _targetTex() {
    try {
      return canvasTex(128, 128, function (c) {
        c.fillStyle = '#ffffff'; c.fillRect(0, 0, 128, 128);
        c.fillStyle = '#e53935';
        c.beginPath(); c.arc(64, 64, 58, 0, 7); c.fill();
        c.fillStyle = '#ffffff';
        c.beginPath(); c.arc(64, 64, 40, 0, 7); c.fill();
        c.fillStyle = '#e53935';
        c.beginPath(); c.arc(64, 64, 24, 0, 7); c.fill();
        c.fillStyle = '#ffffff';
        c.beginPath(); c.arc(64, 64, 10, 0, 7); c.fill();
      });
    } catch (e) { return null; }
  }
  function _makeTarget(x, z) {
    var g = new THREE.Group();
    g.position.set(x, 0, z);
    var post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 1.5, 8), _std(0x6b4a2f));
    post.position.y = 0.75; g.add(post);
    var disc = new THREE.Group(); disc.position.y = 1.8; g.add(disc);
    var back = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.08, 20), _std(0xf5f5f5));
    back.rotation.x = Math.PI / 2; disc.add(back);
    var tex = _targetTex();
    [1, -1].forEach(function (s) {
      try {
        var m = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
        var f = new THREE.Mesh(new THREE.CircleGeometry(0.52, 20), m);
        f.position.z = s * 0.045;
        if (s < 0) f.rotation.y = Math.PI;
        disc.add(f);
      } catch (e) {}
    });
    return { o: g, disc: disc, x: x, z: z, alive: true, timer: 0, fallT: 0 };
  }
  /* Ubicaciones en PASTO, a ≥8m de cualquier calle.
     Neón: plaza central (calles en ejes ±30, ancho 8 → borde en ±26).
     Immokalee: parque comunitario (lejos de z=18, z=-14, x=-48 y del lago). */
  var SPOTS = {
    0: [[-15, -16], [-5, -16], [5, -16], [15, -16]],
    3: [[56, -8], [64, -8], [56, 2], [64, 2]],
  };
  function buildForLevel(i, group) {
    try {
      for (var k = 0; k < W._targets.length; k++) {
        try { if (W._targets[k].o.parent) W._targets[k].o.parent.remove(W._targets[k].o); } catch (e) {}
      }
      W._targets = [];
      var spots = SPOTS[i];
      if (!spots || !group || typeof THREE === 'undefined') return;
      spots.forEach(function (s) {
        var t = _makeTarget(s[0], s[1]);
        try { group.add(t.o); } catch (e) {}
        W._targets.push(t);
      });
    } catch (e) {}
  }
  function targets() {
    return W._targets.map(function (t) { return { x: t.x, z: t.z, alive: t.alive }; });
  }
  function _hitTarget(t, reward) {
    if (!t || !t.alive) return;
    t.alive = false; t.fallT = 0.0001;
    try { SAVE.coins = (SAVE.coins || 0) + reward; persist(); } catch (e) {}
    try { if (typeof Shop2 !== 'undefined' && Shop2.refreshCoinLabels) Shop2.refreshCoinLabels(); } catch (e) {}
    _snd('coin');
    try {
      if (typeof Particles !== 'undefined')
        Particles.burst(t.x, 1.9, t.z, [0xff5252, 0xffffff, 0xffe95e], 16, 4);
    } catch (e) {}
    _toast('🎯 ¡Diste en el blanco! +' + reward + '🪙');
  }

  /* ---------- loop ---------- */
  function update(dt) {
    try {
      if (!dt || dt <= 0) return;
      if (W._cd > 0) W._cd -= dt;
      _keepAttached();
      if (W._swingT > 0 && W._mesh) { // animación del golpe
        W._swingT -= dt;
        var k = Math.max(0, W._swingT) / 0.28;
        W._mesh.rotation.x = W._baseRotX - Math.sin((1 - k) * Math.PI) * 1.1;
        if (W._swingT <= 0) W._mesh.rotation.x = W._baseRotX;
      }
      var i, t;
      for (i = 0; i < W._pool.length; i++) { // proyectiles
        var p = W._pool[i];
        if (!p.active) continue;
        p.life -= dt;
        p.vel.y -= p.grav * dt;
        p.o.position.x += p.vel.x * dt;
        p.o.position.y += p.vel.y * dt;
        p.o.position.z += p.vel.z * dt;
        var hitT = null;
        for (var j = 0; j < W._targets.length; j++) {
          t = W._targets[j];
          if (!t.alive) continue;
          var dx = p.o.position.x - t.x, dz = p.o.position.z - t.z;
          if (dx * dx + dz * dz < 1.21 && p.o.position.y > 0.2 && p.o.position.y < 2.7) { hitT = t; break; }
        }
        if (hitT) { _killShot(p, true); _hitTarget(hitT, p.reward); continue; }
        if (p.o.position.y <= 0.06 || p.life <= 0) _killShot(p, true);
      }
      for (i = 0; i < W._targets.length; i++) { // blancos: se caen y reaparecen
        t = W._targets[i];
        if (!t.alive && t.fallT > 0 && t.fallT < 1) {
          t.fallT = Math.min(1, t.fallT + dt * 2.2);
          var f = t.fallT;
          t.disc.rotation.x = -f * 1.35;
          t.disc.position.y = 1.8 - f * 0.9;
          if (f >= 1) { try { t.o.visible = false; } catch (e2) {} t.timer = 10; }
        } else if (!t.alive && t.fallT >= 1) {
          t.timer -= dt;
          if (t.timer <= 0) {
            t.alive = true; t.fallT = 0;
            t.disc.rotation.x = 0; t.disc.position.y = 1.8;
            try { t.o.visible = true; } catch (e2) {}
          }
        }
      }
    } catch (e) {}
  }

  /* ---------- 🔒 PIN pad (overlay con teclado numérico) ---------- */
  function _injectPinCss() {
    if (typeof document === 'undefined' || document.getElementById('wpp-css')) return;
    var s = document.createElement('style');
    s.id = 'wpp-css';
    s.textContent =
      '#wpp-ov{position:fixed;inset:0;background:rgba(5,8,25,.78);z-index:99970;display:flex;align-items:center;justify-content:center;padding:18px}' +
      '.wpp-card{background:linear-gradient(160deg,#1b2140,#10142c);border:2px solid #ffb300;border-radius:20px;max-width:340px;width:100%;padding:22px;text-align:center;color:#fff}' +
      '.wpp-card h2{margin:0 0 6px;font-size:20px}' +
      '.wpp-card p{margin:0 0 12px;color:#aab4d8;font-size:14px}' +
      '.wpp-dots{font-size:34px;letter-spacing:12px;margin:8px 0 4px;min-height:48px;color:#ffe95e}' +
      '.wpp-msg{font-size:14px;min-height:22px;color:#ff8a80;margin-bottom:6px}' +
      '.wpp-keys{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:8px}' +
      '.wpp-key{background:#2a2f55;color:#fff;border:2px solid #3949ab;border-radius:16px;font-size:28px;font-weight:bold;padding:14px 0;cursor:pointer;min-height:64px}' +
      '.wpp-key:active{background:#3949ab;transform:scale(.94)}' +
      '.wpp-close{margin-top:12px;background:#2a2f55;color:#fff;border:none;border-radius:12px;padding:12px 22px;font-size:16px;font-weight:bold;cursor:pointer}';
    document.head.appendChild(s);
  }
  function openPinPad(cb) {
    try {
      _save();
      W._pinCb = (typeof cb === 'function') ? cb : null;
      var creating = !hasPin();
      var step = 1, first = '', cur = '';
      _injectPinCss();
      _closePinPad();
      var ov = document.createElement('div');
      ov.id = 'wpp-ov';
      ov.innerHTML =
        '<div class="wpp-card"><h2 id="wpp-title">🔒</h2><p id="wpp-sub"></p>' +
        '<div class="wpp-dots" id="wpp-dots"></div><div class="wpp-msg" id="wpp-msg"></div>' +
        '<div class="wpp-keys" id="wpp-keys"></div>' +
        '<button class="wpp-close" id="wpp-x">✕ Cerrar</button></div>';
      document.body.appendChild(ov);
      var dots = document.getElementById('wpp-dots'),
          msg = document.getElementById('wpp-msg'),
          title = document.getElementById('wpp-title'),
          sub = document.getElementById('wpp-sub'),
          keys = document.getElementById('wpp-keys');
      function draw() {
        var d = '';
        for (var i = 0; i < 4; i++) d += (i < cur.length ? '●' : '○');
        dots.textContent = d;
        if (creating) {
          title.textContent = '🔒 Solo adultos';
          sub.textContent = step === 1 ? 'Crea tu PIN de adulto (4 dígitos)' : 'Repite tu PIN para confirmar';
        } else {
          title.textContent = '🔒 Pide a un adulto';
          sub.textContent = 'Ingresa el PIN de adulto';
        }
      }
      function done() {
        _toast('🔓 ¡Desbloqueado!');
        _snd('check');
        _closePinPad();
        var cb2 = W._pinCb; W._pinCb = null;
        if (cb2) { try { cb2(); } catch (e) {} }
      }
      function press(v) {
        _snd('click');
        if (v === 'bk') { cur = cur.slice(0, -1); msg.textContent = ''; draw(); return; }
        if (cur.length >= 4) return;
        cur += v; msg.textContent = ''; draw();
        if (cur.length < 4) return;
        if (!creating) {
          if (unlockWithPin(cur)) done();
          else { msg.textContent = '❌ PIN incorrecto'; cur = ''; draw(); }
        } else if (step === 1) {
          first = cur; cur = ''; step = 2; draw();
        } else {
          if (cur === first && createPin(cur)) done();
          else { msg.textContent = '❌ No coinciden, intenta de nuevo'; step = 1; first = ''; cur = ''; draw(); }
        }
      }
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'bk'].forEach(function (k) {
        var b = document.createElement('button');
        b.className = 'wpp-key';
        if (!k) { b.style.visibility = 'hidden'; }
        else { b.textContent = (k === 'bk' ? '⌫' : k); b.addEventListener('click', function () { press(k); }); }
        keys.appendChild(b);
      });
      document.getElementById('wpp-x').addEventListener('click', function () { _snd('click'); _closePinPad(); });
      ov.addEventListener('click', function (e) { if (e.target === ov) _closePinPad(); });
      draw();
    } catch (e) {}
  }
  function _closePinPad() {
    try { var o = document.getElementById('wpp-ov'); if (o) o.remove(); } catch (e) {}
  }

  window.Weapons = {
    list: list, owns: owns, equipped: equipped, equippedDef: equippedDef,
    equip: equip, unequip: unequip,
    buyBasic: buyBasic, buyPremium: buyPremium, grant: grant,
    tryFire: tryFire, swing: swing, update: update,
    buildForLevel: buildForLevel, targets: targets, activeShots: activeShots, poolInfo: poolInfo,
    isUnlocked: isUnlocked, hasPin: hasPin, createPin: createPin,
    unlockWithPin: unlockWithPin, lockSession: lockSession, openPinPad: openPinPad,
  };
})();
