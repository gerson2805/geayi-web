/* minigames.js — 🎮 MINIJUEGOS GEAYI (diseño 100% original)
   Los géneros pedidos, sanos y portátiles: funcionan en CUALQUIER mundo o ciudad.
     🎯 Tiro al blanco  — pistola de agua prestada, 60 s, dianas portátiles
     🥋 Torneo karate   — patada prestada, rompe 5 tablas lo más rápido posible
     🌀 Contrarreloj    — corre 100 m, vale usar turbo/dash
     🏎️ Carreras        — enlace a la pista de Immokalee (racing.js)
     🎭 Rol             — enlace a Trabajos (jobs.js)
     🧱 Construir       — enlace al modo construir (buildmode.js)
   Las técnicas también se usan fuera de los minijuegos (powers.js, kind 'tool').
   API: Minigames.init() / Minigames.update(dt) / Minigames.openMenu()
        / Minigames.onTargetHit(t) / Minigames.onBoardBreak(b) */
'use strict';

const Minigames = {
  _inited: false, _panel: null, _hud: null,
  game: null, // {id, phase, t, score, need, from:{x,z}, dir:{x,z}, gate}

  /* ================= i18n ================= */
  _strings() {
    if (typeof addStrings !== 'function') return;
    addStrings('es', {
      'mg.title': '🎮 Minijuegos', 'mg.close': 'Cerrar', 'mg.play': '▶ Jugar',
      'mg.best': 'Récord', 'mg.noBest': '—',
      'mg.tiro.name': 'Tiro al blanco', 'mg.tiro.desc': '🎯 60 segundos. Moja las dianas con el chorro de agua (técnica prestada).',
      'mg.karate.name': 'Torneo karate', 'mg.karate.desc': '🥋 Rompe las 5 tablas lo más rápido que puedas (técnica prestada).',
      'mg.dash.name': 'Contrarreloj 100 m', 'mg.dash.desc': '🌀 Corre 100 metros. ¡Vale usar turbo y dash!',
      'mg.olimpiadas.name': 'Olimpiadas', 'mg.olimpiadas.desc': '🏟️ 10 deportes: carros, fútbol, tenis, natación y más.',
      'mg.rol.name': 'Vida GEAYI', 'mg.rol.desc': '🏡 Cuida y viste a tu mascota, decora tu casa y trabaja.',
      'mg.build.name': 'Construir mundos', 'mg.build.desc': '🧱 Pon bloques y crea tus propios niveles.',
      'mg.raceWhere': '🏁 Ve al mundo 4 (Immokalee) y cruza el arco de meta para correr.',
      'mg.needPlay': 'Entra a un mundo para jugar 🎮',
      'mg.tiroGo': '🎯 ¡Moja las dianas! 60 s',
      'mg.karateGo': '🥋 ¡Rompe las 5 tablas!',
      'mg.dashReady': '🌀 ¡Prepárate…!', 'mg.dashGo': '🌀 ¡CORRE!',
      'mg.timeUp': '⏰ ¡Tiempo!',
      'mg.results': '🏆 Resultados', 'mg.score': 'Puntos', 'mg.time': 'Tiempo',
      'mg.newBest': '⭐ ¡NUEVO RÉCORD!', 'mg.again': '🔁 Otra vez',
    });
    addStrings('en', {
      'mg.title': '🎮 Mini-games', 'mg.close': 'Close', 'mg.play': '▶ Play',
      'mg.best': 'Best', 'mg.noBest': '—',
      'mg.tiro.name': 'Target shooting', 'mg.tiro.desc': '🎯 60 seconds. Soak the targets with the water splash (lent technique).',
      'mg.karate.name': 'Karate tournament', 'mg.karate.desc': '🥋 Break the 5 boards as fast as you can (technique lent).',
      'mg.dash.name': '100 m time trial', 'mg.dash.desc': '🌀 Run 100 meters. Turbo and dash allowed!',
      'mg.olimpiadas.name': 'Olympics', 'mg.olimpiadas.desc': '🏟️ 10 sports: racing, soccer, tennis, swimming and more.',
      'mg.rol.name': 'GEAYI Life', 'mg.rol.desc': '🏡 Care for and dress your pet, decorate your house and work.',
      'mg.build.name': 'Build worlds', 'mg.build.desc': '🧱 Place blocks and create your own levels.',
      'mg.raceWhere': '🏁 Go to world 4 (Immokalee) and cross the finish arch to race.',
      'mg.needPlay': 'Enter a world to play 🎮',
      'mg.tiroGo': '🎯 Soak the targets! 60 s',
      'mg.karateGo': '🥋 Break the 5 boards!',
      'mg.dashReady': '🌀 Get ready…!', 'mg.dashGo': '🌀 RUN!',
      'mg.timeUp': '⏰ Time!',
      'mg.results': '🏆 Results', 'mg.score': 'Score', 'mg.time': 'Time',
      'mg.newBest': '⭐ NEW RECORD!', 'mg.again': '🔁 Again',
    });
  },
  _t(key, vars) {
    let s = (typeof T === 'function') ? T(key) : key;
    if (vars) for (const k in vars) s = String(s).split('{' + k + '}').join(vars[k]);
    return s;
  },
  _toast(msg) { try { if (typeof toast === 'function') toast(msg); } catch (e) {} },
  _sfx(name) { try { if (typeof Audio2 !== 'undefined' && Audio2 && typeof Audio2[name] === 'function') Audio2[name](); } catch (e) {} },

  /* ================= ciclo de vida ================= */
  init() {
    if (this._inited) return;
    this._inited = true;
    this._strings();
    try { if (typeof SAVE !== 'undefined' && (!SAVE.mg || typeof SAVE.mg !== 'object')) SAVE.mg = {}; } catch (e) {}
    this._ensureHud();
  },
  _best(id) { try { return (typeof SAVE !== 'undefined' && SAVE.mg && SAVE.mg[id] != null) ? SAVE.mg[id] : null; } catch (e) { return null; } },
  _setBest(id, v, lower) {
    try {
      if (typeof SAVE === 'undefined') return false;
      if (!SAVE.mg || typeof SAVE.mg !== 'object') SAVE.mg = {};
      const cur = SAVE.mg[id];
      const better = (cur == null) || (lower ? v < cur : v > cur);
      if (better) { SAVE.mg[id] = v; if (typeof persist === 'function') persist(); }
      return better;
    } catch (e) { return false; }
  },
  _fmtTime(s) {
    s = Math.max(0, s);
    const m = Math.floor(s / 60), sec = Math.floor(s % 60), ds = Math.floor((s % 1) * 10);
    return (m > 0 ? m + ':' + String(sec).padStart(2, '0') : sec) + '.' + ds + 's';
  },

  /* ================= HUD del minijuego ================= */
  _ensureHud() {
    if (this._hud) return;
    try {
      if (typeof document === 'undefined') return;
      const d = document.createElement('div');
      d.id = 'mg-hud';
      d.style.cssText = 'position:fixed;top:64px;left:50%;transform:translateX(-50%);z-index:15;' +
        'background:rgba(10,20,40,.78);color:#fff;font-weight:700;font-size:17px;padding:8px 18px;' +
        'border-radius:999px;border:2px solid #ffd23f;display:none;pointer-events:none;white-space:nowrap;';
      document.body.appendChild(d);
      this._hud = d;
    } catch (e) {}
  },
  _showHud(txt) { try { if (this._hud) { this._hud.textContent = txt; this._hud.style.display = txt ? '' : 'none'; } } catch (e) {} },

  /* ================= menú ================= */
  openMenu() {
    this._sfx('click');
    this._ensurePanel();
    this._renderMenu();
    if (this._panel) this._panel.classList.remove('hidden');
  },
  closeMenu() { if (this._panel) this._panel.classList.add('hidden'); },
  _ensurePanel() {
    if (this._panel) return;
    try {
      const p = document.createElement('div');
      p.id = 'mg-panel';
      p.className = 'screen overlay hidden';
      document.body.appendChild(p);
      this._panel = p;
    } catch (e) {}
  },
  _cards() {
    const b = (id) => this._best(id);
    const fmtBest = (id, isTime) => {
      const v = b(id);
      if (v == null) return this._t('mg.noBest');
      return isTime ? this._fmtTime(v) : String(v);
    };
    return [
      { id: 'tiro', emoji: '🎯', best: fmtBest('tiro', false) },
      { id: 'karate', emoji: '🥋', best: fmtBest('karate', true) },
      { id: 'dash', emoji: '🌀', best: fmtBest('dash', true) },
      { id: 'olimpiadas', emoji: '🏟️', link: 'olimpiadas' },
      { id: 'rol', emoji: '🏡', link: 'rol' },
      { id: 'build', emoji: '🧱', link: 'build' },
    ];
  },
  _renderMenu() {
    if (!this._panel) return;
    const cards = this._cards().map(c => {
      const best = c.link ? '' : '<div class="pow-state">🏆 ' + this._t('mg.best') + ': ' + c.best + '</div>';
      const act = c.link ? 'data-link="' + c.link + '"' : 'data-game="' + c.id + '"';
      return '<div class="pow-card">' +
        '<div class="pow-emoji">' + c.emoji + '</div>' +
        '<div class="pow-info"><div class="pow-name">' + this._t('mg.' + c.id + '.name') + '</div>' +
        '<div class="pow-desc">' + this._t('mg.' + c.id + '.desc') + '</div>' + best + '</div>' +
        '<button class="btn pow-btn" ' + act + '>' + this._t('mg.play') + '</button></div>';
    }).join('');
    this._panel.innerHTML =
      '<div class="panel" style="max-width:440px;width:100%">' +
      '<h2>' + this._t('mg.title') + '</h2>' + cards +
      '<div class="menu-buttons"><button class="btn" data-act="close">✕ ' + this._t('mg.close') + '</button></div></div>';
    const q = (sel) => Array.prototype.slice.call(this._panel.querySelectorAll(sel));
    q('[data-game]').forEach(el => el.addEventListener('click', () => this.start(el.getAttribute('data-game'))));
    q('[data-link]').forEach(el => el.addEventListener('click', () => this._openLink(el.getAttribute('data-link'))));
    q('[data-act]').forEach(el => el.addEventListener('click', () => this.closeMenu()));
  },
  _openLink(kind) {
    this.closeMenu();
    try {
      if (kind === 'olimpiadas') { if (typeof Sports !== 'undefined' && typeof Sports.openMenu === 'function') Sports.openMenu(); }
      else if (kind === 'rol') { if (typeof Roleplay !== 'undefined' && typeof Roleplay.openHub === 'function') Roleplay.openHub(); }
      else if (kind === 'build') { if (typeof BuildMode !== 'undefined' && typeof BuildMode.open === 'function') BuildMode.open(); }
    } catch (e) {}
  },

  /* ================= utilidades portátiles ================= */
  _playerOk() {
    if (typeof MODE !== 'undefined' && MODE !== 'play') { this._toast(this._t('mg.needPlay')); return false; }
    const P = (typeof Player !== 'undefined') ? Player : null;
    if (!P || !P.pos) return false;
    return true;
  },
  _spotsFront(n, dist, spread) {
    const P = (typeof Player !== 'undefined') ? Player : null;
    const h = (P && P.heading) || 0;
    const dx = Math.sin(h), dz = Math.cos(h);
    const ox = Math.cos(h), oz = -Math.sin(h);
    const px = P.pos.x, pz = P.pos.z;
    const out = [];
    for (let i = 0; i < n; i++) {
      const off = (i - (n - 1) / 2) * spread;
      out.push([px + dx * dist + ox * off, pz + dz * dist + oz * off, 'mg']);
    }
    return out;
  },
  _clearTag(tag) {
    try {
      if (typeof Powers === 'undefined' || !Powers) return;
      for (const arr of [Powers.targets, Powers.boards]) {
        for (let i = arr.length - 1; i >= 0; i--) {
          if (arr[i].tag === tag) {
            try { if (arr[i].mesh && arr[i].mesh.parent) arr[i].mesh.parent.remove(arr[i].mesh); } catch (e) {}
            arr.splice(i, 1);
          }
        }
      }
    } catch (e) {}
  },
  _levelGroup() {
    try {
      if (typeof LEVEL !== 'undefined' && LEVEL && LEVEL.group) return LEVEL.group;
      if (typeof scene !== 'undefined') return scene;
    } catch (e) {}
    return null;
  },

  /* ================= inicio / fin ================= */
  start(id) {
    if (this.game) this._finish(true); // cierra el anterior sin drama
    if (!this._playerOk()) return false;
    this.closeMenu();
    const G = this._levelGroup();
    if ((id === 'tiro' || id === 'karate') && !G) return false;
    if (id === 'tiro') {
      if (typeof Powers !== 'undefined' && typeof Powers.loanTool === 'function') Powers.loanTool('water');
      Powers.placeTargets(G, this._spotsFront(6, 10, 3));
      this.game = { id, phase: 'run', t: 60, score: 0 };
      this._toast(this._t('mg.tiroGo'));
      this._sfx('good');
    } else if (id === 'karate') {
      if (typeof Powers !== 'undefined' && typeof Powers.loanTool === 'function') Powers.loanTool('karate');
      Powers.placeBoards(G, this._spotsFront(5, 7, 2.6));
      this.game = { id, phase: 'run', t: 0, score: 0, need: 5 };
      this._toast(this._t('mg.karateGo'));
      this._sfx('good');
    } else if (id === 'dash') {
      const P = Player, h = P.heading || 0;
      const dx = Math.sin(h), dz = Math.cos(h);
      this._placeGate(G, P.pos.x + dx * 100, P.pos.z + dz * 100);
      this.game = { id, phase: 'count', t: 3.2, score: 0, from: { x: P.pos.x, z: P.pos.z }, dir: { x: dx, z: dz } };
      this._toast(this._t('mg.dashReady'));
      this._sfx('check');
    } else return false;
    return true;
  },
  _placeGate(G, x, z) {
    this._clearTag('mggate');
    if (!G || typeof THREE === 'undefined') return;
    try {
      const grp = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
      for (const sx of [-2.2, 2.2]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 4, 8), mat);
        pole.position.set(sx, 2, 0); grp.add(pole);
      }
      let topMat = mat;
      try {
        const tex = canvasTex(256, 64, function (g) {
          g.fillStyle = '#111'; g.fillRect(0, 0, 256, 64);
          g.font = '40px serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
          g.fillText('🏁 🏁 🏁', 128, 34);
        });
        topMat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
      } catch (e) {}
      const top = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1, 0.3), topMat);
      top.position.y = 4; grp.add(top);
      const P = (typeof Player !== 'undefined') ? Player : null;
      grp.position.set(x, 0, z);
      grp.rotation.y = (P && P.heading) || 0;
      G.add(grp);
      if (typeof Powers !== 'undefined' && Powers) {
        // lo registramos como "diana" invisible para el tag, pero con mesh propio
        Powers.targets.push({ x, z, y: 2, mesh: grp, alive: true, respawn: 0, tag: 'mggate', gate: true });
      }
      this._gateMesh = grp;
    } catch (e) {}
  },
  onTargetHit(t) {
    if (!this.game || this.game.id !== 'tiro' || this.game.phase !== 'run') return;
    if (t && t.tag === 'mg' && !t.gate) this.game.score++;
  },
  onBoardBreak(b) {
    if (!this.game || this.game.id !== 'karate' || this.game.phase !== 'run') return;
    if (b && b.tag === 'mg') {
      this.game.score++;
      if (this.game.score >= this.game.need) this._finish(false);
    }
  },
  _finish(silent) {
    const g = this.game;
    this.game = null;
    this._showHud('');
    try { if (typeof Powers !== 'undefined' && typeof Powers.unloan === 'function') Powers.unloan(); } catch (e) {}
    this._clearTag('mg'); this._clearTag('mggate');
    if (!g || silent) return;
    let msg, isBest = false;
    if (g.id === 'tiro') {
      isBest = this._setBest('tiro', g.score, false);
      msg = '🎯 ' + this._t('mg.score') + ': ' + g.score;
    } else if (g.id === 'karate') {
      isBest = this._setBest('karate', g.t, true);
      msg = '🥋 ' + this._t('mg.time') + ': ' + this._fmtTime(g.t);
    } else {
      isBest = this._setBest('dash', g.t, true);
      msg = '🌀 ' + this._t('mg.time') + ': ' + this._fmtTime(g.t);
    }
    if (isBest) {
      msg += ' ' + this._t('mg.newBest');
      try { if (typeof Fireworks !== 'undefined' && Fireworks && typeof Fireworks.show === 'function') { const P = Player; Fireworks.show(P.pos.x, P.pos.z, 6); } } catch (e) {}
      this._sfx('win');
    } else this._sfx('good');
    this._toast('🏆 ' + msg);
    this._showResults(g, msg, isBest);
  },
  _showResults(g, msg, isBest) {
    this._ensurePanel();
    if (!this._panel) return;
    const detail = g.id === 'tiro'
      ? '🎯 ' + this._t('mg.score') + ': <b>' + g.score + '</b>'
      : '⏱️ ' + this._t('mg.time') + ': <b>' + this._fmtTime(g.t) + '</b>';
    this._panel.innerHTML =
      '<div class="panel" style="max-width:380px;width:100%;text-align:center">' +
      '<h2>' + this._t('mg.results') + '</h2>' +
      '<div style="font-size:20px;margin:10px 0">' + detail + '</div>' +
      (isBest ? '<div style="font-size:18px;color:#ffd23f;font-weight:700">' + this._t('mg.newBest') + '</div>' : '') +
      '<div class="menu-buttons" style="margin-top:14px">' +
      '<button class="btn" data-act="again">' + this._t('mg.again') + '</button> ' +
      '<button class="btn" data-act="close">✕ ' + this._t('mg.close') + '</button></div></div>';
    const q = (sel) => Array.prototype.slice.call(this._panel.querySelectorAll(sel));
    q('[data-act="close"]').forEach(el => el.addEventListener('click', () => this.closeMenu()));
    q('[data-act="again"]').forEach(el => el.addEventListener('click', () => this.start(g.id)));
    this._panel.classList.remove('hidden');
  },

  /* ================= por cuadro ================= */
  onLevelEnter() { if (this.game) this._finish(true); this._clearTag('mg'); this._clearTag('mggate'); },
  update(dt) {
    if (dt == null || dt <= 0) dt = 0.016;
    const g = this.game;
    if (!g) return;
    const P = (typeof Player !== 'undefined' && Player.pos) ? Player : null;
    if (!P) { this._finish(true); return; }
    if (g.id === 'tiro') {
      g.t -= dt;
      this._showHud('🎯 ' + Math.ceil(g.t) + 's · ' + g.score + ' pts');
      if (g.t <= 0) { this._toast(this._t('mg.timeUp')); this._finish(false); }
    } else if (g.id === 'karate') {
      g.t += dt;
      this._showHud('🥋 ' + g.score + '/' + g.need + ' · ' + this._fmtTime(g.t));
    } else if (g.id === 'dash') {
      if (g.phase === 'count') {
        g.t -= dt;
        const n = Math.ceil(g.t);
        this._showHud(n > 0 ? '🌀 ' + n + '…' : this._t('mg.dashGo'));
        if (g.t <= 0) { g.phase = 'run'; g.t = 0; this._sfx('boost'); this._toast(this._t('mg.dashGo')); }
      } else {
        g.t += dt;
        // meta: 100 m en la dirección inicial
        const ex = g.from.x + g.dir.x * 100, ez = g.from.z + g.dir.z * 100;
        const d = Math.hypot(P.pos.x - ex, P.pos.z - ez);
        this._showHud('🌀 ' + this._fmtTime(g.t) + ' · ' + Math.max(0, Math.round(d)) + ' m');
        if (d < 4) this._finish(false);
        if (g.t > 120) this._finish(true); // seguridad
      }
    }
  },
};
