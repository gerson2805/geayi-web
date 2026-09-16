/* powers.js — SUPERPODERES desbloqueables GEAYI ⚡ (diseño 100% original)
   5 poderes con efectos especiales vistosos (estelas, partículas, brillo):
     ⚡ Súper velocidad · 🧲 Imán dorado · 🐸 Salto potenciado ·
     🛡️ Escudo de energía · 💨 Dash eléctrico
   Desbloqueo: con monedas del juego (SAVE.coins) O gratis al completar
   ciertos mundos. 100% interno: no toca monetiza.js ni pagos reales.
   API global: Powers.init() / Powers.buildForLevel(i, group) / Powers.update(dt)
   + desbloqueo/activación + multiplicadores que usa player.js (con guards). */
'use strict';

const POWER_DEFS = [
  { id: 'speed',  emoji: '⚡', price: 400, freePos: 0, color: 0xffe95e, kind: 'toggle', nameKey: 'pow.speed.name',  descKey: 'pow.speed.desc'  },
  { id: 'magnet', emoji: '🧲', price: 250, freePos: 1, color: 0xffb300, kind: 'toggle', nameKey: 'pow.magnet.name', descKey: 'pow.magnet.desc' },
  { id: 'jump',   emoji: '🐸', price: 300, freePos: 2, color: 0x59d867, kind: 'toggle', nameKey: 'pow.jump.name',   descKey: 'pow.jump.desc'   },
  { id: 'shield', emoji: '🛡️', price: 500, freePos: 4, color: 0x59c1ff, kind: 'toggle', nameKey: 'pow.shield.name', descKey: 'pow.shield.desc' },
  { id: 'dash',   emoji: '💨', price: 350, freePos: 6, color: 0x00e5ff, kind: 'dash',   nameKey: 'pow.dash.name',   descKey: 'pow.dash.desc'   },
];
const DASH_COOLDOWN = 5;   // segundos de recarga del dash
const DASH_SPEED = 26;      // impulso del dash (SPEED base = 8.2)

const Powers = {
  _inited: false, _panel: null, _dashBtn: null, _fx: null,
  dashCd: 0, _dashFxT: 0, _trailT: 0, _sparkT: 0, _shieldHeld: false,

  /* ---------------- i18n ---------------- */
  _strings() {
    if (typeof addStrings !== 'function') return;
    addStrings('es', {
      'pow.title': '⚡ Superpoderes', 'pow.close': 'Cerrar', 'pow.unlock': 'Desbloquear',
      'pow.activate': 'Activar', 'pow.deactivate': 'Desactivar', 'pow.active': '🟢 Activo',
      'pow.unlocked': '✅ Desbloqueado', 'pow.locked': '🔒 Bloqueado',
      'pow.free': 'o gratis al pasar el mundo {n}', 'pow.dashNow': '💨 ¡DASH!',
      'pow.unlockedToast': '⚡ ¡Poder desbloqueado: {name}!', 'pow.freeToast': '🎁 ¡Mundo {n} superado! Poder gratis: {name}',
      'pow.noCoins': '🪙 Te faltan monedas para este poder',
      'pow.speed.name': 'Súper velocidad', 'pow.speed.desc': 'Corre 70% más rápido con estela de luz.',
      'pow.magnet.name': 'Imán dorado', 'pow.magnet.desc': 'Las monedas vuelan hacia ti desde lejos.',
      'pow.jump.name': 'Salto potenciado', 'pow.jump.desc': 'Salta mucho más alto. Tú eliges cuándo usarlo.',
      'pow.shield.name': 'Escudo de energía', 'pow.shield.desc': 'Burbuja brillante: te salva de la lava y las caídas.',
      'pow.dash.name': 'Dash eléctrico', 'pow.dash.desc': 'Impulso relámpago con chispas. Recarga: 5 s.',
    });
    addStrings('en', {
      'pow.title': '⚡ Superpowers', 'pow.close': 'Close', 'pow.unlock': 'Unlock',
      'pow.activate': 'Activate', 'pow.deactivate': 'Deactivate', 'pow.active': '🟢 Active',
      'pow.unlocked': '✅ Unlocked', 'pow.locked': '🔒 Locked',
      'pow.free': 'or free by clearing world {n}', 'pow.dashNow': '💨 DASH!',
      'pow.unlockedToast': '⚡ Power unlocked: {name}!', 'pow.freeToast': '🎁 World {n} cleared! Free power: {name}',
      'pow.noCoins': '🪙 Not enough coins for this power',
      'pow.speed.name': 'Super speed', 'pow.speed.desc': 'Run 70% faster with a light trail.',
      'pow.magnet.name': 'Golden magnet', 'pow.magnet.desc': 'Coins fly to you from far away.',
      'pow.jump.name': 'Power jump', 'pow.jump.desc': 'Jump much higher. You choose when to use it.',
      'pow.shield.name': 'Energy shield', 'pow.shield.desc': 'Shiny bubble: saves you from lava and falls.',
      'pow.dash.name': 'Electric dash', 'pow.dash.desc': 'Lightning burst with sparks. Recharge: 5 s.',
    });
  },
  _t(key, vars) {
    let s = (typeof T === 'function') ? T(key) : key;
    if (vars) for (const k in vars) s = String(s).split('{' + k + '}').join(vars[k]);
    return s;
  },
  _toast(msg) { try { if (typeof toast === 'function') toast(msg); } catch (e) {} },
  _sfx(name) { try { if (typeof Audio2 !== 'undefined' && Audio2 && typeof Audio2[name] === 'function') Audio2[name](); } catch (e) {} },

  /* ---------------- SAVE ---------------- */
  _ensureSave() {
    if (typeof SAVE === 'undefined') return false;
    if (!SAVE.powers || typeof SAVE.powers !== 'object') SAVE.powers = {};
    if (!SAVE.activePowers || typeof SAVE.activePowers !== 'object') SAVE.activePowers = {};
    for (const d of POWER_DEFS) {
      if (typeof SAVE.powers[d.id] !== 'boolean') SAVE.powers[d.id] = false;
      if (typeof SAVE.activePowers[d.id] !== 'boolean') SAVE.activePowers[d.id] = false;
    }
    return true;
  },
  def(id) { for (const d of POWER_DEFS) if (d.id === id) return d; return null; },
  isUnlocked(id) { return !!(typeof SAVE !== 'undefined' && SAVE.powers && SAVE.powers[id]); },
  isActive(id) {
    const d = this.def(id);
    if (!d || d.kind !== 'toggle' || !this.isUnlocked(id)) return false;
    return !!(typeof SAVE !== 'undefined' && SAVE.activePowers && SAVE.activePowers[id]);
  },
  // multiplicadores que player.js consulta (guards incluidos allá)
  speedMult() {
    let m = this.isActive('speed') ? 1.7 : 1;
    if (this._starT > 0) m *= 1.5; // ⭐ Poder Estrella activo
    return m;
  },
  jumpMult() { return this.isActive('jump') ? 1.6 : 1; },
  magnetRadius() { return this.isActive('magnet') ? 14 : 3.2; },

  /* ---------------- ciclo de vida ---------------- */
  init() {
    if (this._inited) return;
    this._inited = true;
    this._ensureSave();
    this._strings();
    this._ensureDashBtn();
  },
  buildForLevel(i, group) { // al entrar a un mundo: limpiar FX temporales
    this.dashCd = 0; this._dashFxT = 0; this._trailT = 0; this._sparkT = 0;
    this._releaseShield();
    if (this._fx) { this._fx.aura.visible = false; this._fx.bubble.visible = false; }
    if (this._panel) this._renderPanel();
  },

  /* ---------------- desbloqueo ---------------- */
  unlockWithCoins(id) {
    const d = this.def(id);
    if (!d || this.isUnlocked(id) || typeof SAVE === 'undefined') return false;
    if ((SAVE.coins | 0) < d.price) { this._sfx('deny'); this._toast(this._t('pow.noCoins')); return false; }
    SAVE.coins -= d.price;
    SAVE.powers[id] = true;
    // 🎯 al comprar se equipa automáticamente (listo para usar)
    if (d.kind === 'tool') { SAVE.equippedTool = id; }
    if (typeof persist === 'function') persist();
    this._sfx('buy');
    this._toast(this._t('pow.unlockedToast', { name: this._t(d.nameKey) }));
    this._burstAtPlayer([d.color, 0xffffff], 24, 7);
    this._refreshCoinsHud();
    this._renderPanel();
    this._updateToolBtn();
    return true;
  },
  onWorldComplete(idx) { // gratis al descubrir mundos (llamado desde discoverWorld)
    if (!this._ensureSave()) return [];
    const pos = (typeof worldPos === 'function') ? worldPos(idx) : idx;
    const granted = [];
    for (const d of POWER_DEFS) {
      if (d.freePos === pos && !SAVE.powers[d.id]) { SAVE.powers[d.id] = true; granted.push(d); }
    }
    if (granted.length) {
      if (typeof persist === 'function') persist();
      this._sfx('good');
      for (const d of granted) this._toast(this._t('pow.freeToast', { n: pos + 1, name: this._t(d.nameKey) }));
      this._renderPanel();
    }
    return granted.map(d => d.id);
  },

  /* ---------------- activación ---------------- */
  toggle(id) {
    const d = this.def(id);
    if (!d || d.kind !== 'toggle' || !this.isUnlocked(id) || !this._ensureSave()) return false;
    SAVE.activePowers[id] = !SAVE.activePowers[id];
    const on = SAVE.activePowers[id];
    if (!on && id === 'shield') this._releaseShield();
    if (typeof persist === 'function') persist();
    this._sfx(on ? 'power' : 'click');
    if (on) this._burstAtPlayer([d.color, 0xffffff], 20, 6);
    this._renderPanel();
    if (typeof updateFxHud === 'function') { try { updateFxHud(); } catch (e) {} }
    return on;
  },
  deactivateAll() {
    if (!this._ensureSave()) return;
    for (const d of POWER_DEFS) SAVE.activePowers[d.id] = false;
    this._releaseShield();
    if (typeof persist === 'function') persist();
    this._renderPanel();
    if (typeof updateFxHud === 'function') { try { updateFxHud(); } catch (e) {} }
  },

  /* ---------------- dash eléctrico ---------------- */
  dash() {
    if (!this.isUnlocked('dash') || this.dashCd > 0) return false;
    const P = (typeof Player !== 'undefined') ? Player : null;
    if (!P || !P.pos || !P.vel) return false;
    if (typeof MODE !== 'undefined' && MODE !== 'play') return false;
    if (typeof Vehicle !== 'undefined' && Vehicle && Vehicle.mode !== 'none') return false;
    let dx = P.vel.x, dz = P.vel.z;
    const m = Math.hypot(dx, dz);
    if (m < 0.5) { dx = Math.sin(P.heading || 0); dz = Math.cos(P.heading || 0); }
    else { dx /= m; dz /= m; }
    P.vel.x = dx * DASH_SPEED; P.vel.z = dz * DASH_SPEED;
    if (P.vel.y < 0) P.vel.y = 0;
    this.dashCd = DASH_COOLDOWN; this._dashFxT = 0.45;
    this._sfx('boost');
    this._burstAtPlayer([0x00e5ff, 0xffffff, 0xffe95e], 26, 10);
    return true;
  },

  /* ---------------- HUD ---------------- */
  hudChips() { // lo llama updateFxHud() en player.js
    let html = '';
    if (this.isActive('speed')) html += '<span class="hud-chip fx">⚡</span>';
    if (this.isActive('magnet')) html += '<span class="hud-chip fx">🧲</span>';
    if (this.isActive('jump')) html += '<span class="hud-chip fx">🐸</span>';
    if (this.isActive('shield')) html += '<span class="hud-chip fx">🛡️</span>';
    if (this.isUnlocked('dash')) html += '<span class="hud-chip fx">💨' + (this.dashCd > 0 ? ' ' + Math.ceil(this.dashCd) + 's' : '') + '</span>';
    return html;
  },

  /* ---------------- update: efectos por cuadro ---------------- */
  update(dt) {
    if (dt == null || dt <= 0) dt = 0.016;
    if (dt > 0.1) dt = 0.1;
    if (this.dashCd > 0) this.dashCd = Math.max(0, this.dashCd - dt);
    if (this._dashFxT > 0) this._dashFxT = Math.max(0, this._dashFxT - dt);
    this._updateDashBtn();
    const P = (typeof Player !== 'undefined' && Player && Player.pos) ? Player : null;
    if (!P) { this._hideFx(); return; }
    this._ensureFx();
    const fx = this._fx;
    // escudo: sostener P.fx.shield mientras esté activo (protege de lava/caídas en hitHazard)
    if (this.isActive('shield')) {
      if (P.fx && !P.fx.shield) { P.fx.shield = true; this._shieldHeld = true; }
      fx.bubble.visible = true;
      fx.bubble.position.set(P.pos.x, P.pos.y + 1, P.pos.z);
      const s = 1 + Math.sin(performance.now() * 0.006) * 0.06;
      fx.bubble.scale.set(s, s, s);
      fx.bubble.rotation.y += dt * 1.5;
      this._spawnTick('shield', dt, 0.22, () => this._burstAtPlayer([0x59c1ff, 0xffffff], 2, 1.5, 0.5, 1.6));
    } else {
      if (this._shieldHeld) this._releaseShield();
      fx.bubble.visible = false;
    }
    // aura de brillo: color del primer poder activo
    let auraColor = 0, auraOn = false;
    for (const d of POWER_DEFS) {
      if (d.kind === 'toggle' && this.isActive(d.id)) { auraColor = d.color; auraOn = true; break; }
    }
    fx.aura.visible = auraOn;
    if (auraOn) {
      fx.aura.position.set(P.pos.x, P.pos.y + 1, P.pos.z);
      try { fx.aura.material.color.setHex(auraColor); } catch (e) {}
    }
    // estela de súper velocidad
    if (this.isActive('speed')) {
      const hSpeed = Math.hypot(P.vel.x, P.vel.z);
      if (hSpeed > 3) {
        this._trailT += dt;
        while (this._trailT >= 0.06) {
          this._trailT -= 0.06;
          const bx = P.pos.x - Math.sin(P.heading || 0) * 0.8, bz = P.pos.z - Math.cos(P.heading || 0) * 0.8;
          this._spawn(bx, P.pos.y + 0.9, bz, { n: 2, colors: [0xffe95e, 0xffffff, 0xff9d00], speed: 1.2, up: 1.4, life: 0.55, size: 0.5, grav: 1.5 });
        }
      }
    }
    // chispas del imán dorado
    if (this.isActive('magnet')) {
      this._sparkT += dt;
      if (this._sparkT >= 0.28) { this._sparkT = 0; this._burstAtPlayer([0xffd23f, 0xffe95e], 4, 2, 1, 1.2); }
    }
    // destellos del salto potenciado
    if (this.isActive('jump')) {
      this._spawnTick('jump', dt, 0.34, () => this._spawn(P.pos.x, P.pos.y + 0.2, P.pos.z,
        { n: 2, colors: [0x59d867, 0xffffff], speed: 1, up: 2.5, life: 0.6, size: 0.4, grav: 2 }));
    }
    // rastro eléctrico tras el dash
    if (this._dashFxT > 0) {
      this._spawn(P.pos.x, P.pos.y + 1, P.pos.z,
        { n: 3, colors: [0x00e5ff, 0xffffff], speed: 2, up: 1, life: 0.4, size: 0.45, grav: 1 });
    }
  },
  _spawnTick(key, dt, every, fn) {
    this._tickT = this._tickT || {};
    this._tickT[key] = (this._tickT[key] || 0) + dt;
    if (this._tickT[key] >= every) { this._tickT[key] = 0; fn(); }
  },
  _hideFx() { if (this._fx) { this._fx.aura.visible = false; this._fx.bubble.visible = false; } },

  _releaseShield() {
    this._shieldHeld = false;
    try {
      const P = (typeof Player !== 'undefined') ? Player : null;
      if (P && P.fx && P.fx.shield && !this.isActive('shield')) P.fx.shield = false;
    } catch (e) {}
    if (this._fx) this._fx.bubble.visible = false;
  },

  /* ---------------- partículas y FX 3D (cacheados) ---------------- */
  _spawn(x, y, z, opts) {
    try {
      if (typeof Particles !== 'undefined' && Particles && Particles.group && typeof Particles.spawn === 'function')
        Particles.spawn(x, y, z, opts);
    } catch (e) {}
  },
  _burstAtPlayer(colors, n, speed, up, spread) {
    const P = (typeof Player !== 'undefined' && Player && Player.pos) ? Player : null;
    if (!P) return;
    try {
      if (typeof Particles !== 'undefined' && Particles && Particles.group && typeof Particles.burst === 'function')
        Particles.burst(P.pos.x, P.pos.y + (up != null ? up : 1), P.pos.z, colors, n, speed);
    } catch (e) {}
  },
  /* ============ FX CINEMATOGRÁFICO ============ */
  /* destello de pantalla (como en las películas) */
  _flashFX(color, alpha, dur) {
    try {
      if (typeof document === 'undefined') return;
      let el = document.getElementById('geayi-fxflash');
      if (!el) {
        el = document.createElement('div');
        el.id = 'geayi-fxflash';
        el.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;opacity:0;';
        document.body.appendChild(el);
      }
      el.style.transition = 'none';
      el.style.background = '#' + ('000000' + (color >>> 0).toString(16)).slice(-6);
      el.style.opacity = (alpha != null ? alpha : 0.3);
      clearTimeout(this._flashTO);
      const ms = dur || 130;
      this._flashTO = setTimeout(() => {
        try { el.style.transition = 'opacity 220ms'; el.style.opacity = 0; } catch (e) {}
      }, ms);
    } catch (e) {}
  },
  /* sacudida de cámara */
  _shakeFX(amp, dur) { this._shakeT = dur || 0.3; this._shakeAmp = amp || 6; },
  /* onda de choque en el suelo */
  _ringFX(x, y, z, color, maxR, dur) {
    try {
      if (typeof THREE === 'undefined' || typeof scene === 'undefined' || !scene) return;
      if (typeof THREE.RingGeometry !== 'function') return;
      const m = new THREE.Mesh(
        new THREE.RingGeometry(0.8, 1, 40),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
      );
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, (y || 0) + 0.12, z);
      scene.add(m);
      this._rings = this._rings || [];
      this._rings.push({ m, t: 0, dur: dur || 0.5, maxR: maxR || 8 });
    } catch (e) {}
  },
  /* aura brillante alrededor del jugador */
  _auraShow(color, scale) {
    try {
      this._ensureFx();
      if (!this._fx || !this._fx.aura) return;
      const P = (typeof Player !== 'undefined' && Player && Player.pos) ? Player : null;
      if (!P) return;
      this._fx.aura.visible = true;
      this._fx.aura.material.color.setHex(color >>> 0);
      const s = scale || 4.5;
      this._fx.aura.scale.set(s, s, 1);
      this._fxAuraFollow = true;
    } catch (e) {}
  },
  _auraHide() {
    try {
      this._fxAuraFollow = false;
      if (this._fx && this._fx.aura) this._fx.aura.visible = false;
    } catch (e) {}
  },
  _updateFxCine(dt) {
    /* sacudida */
    if (this._shakeT > 0) {
      this._shakeT -= dt;
      try {
        if (typeof document !== 'undefined') {
          const cv = this._fxCanvas || (this._fxCanvas = document.querySelector('canvas'));
          if (cv) {
            if (this._shakeT <= 0) cv.style.transform = '';
            else {
              const a = this._shakeAmp * Math.max(0, this._shakeT / 0.35);
              cv.style.transform = 'translate(' + ((Math.random() * 2 - 1) * a).toFixed(1) + 'px,' + ((Math.random() * 2 - 1) * a).toFixed(1) + 'px)';
            }
          }
        }
      } catch (e) {}
    }
    /* anillos de choque */
    if (this._rings && this._rings.length) {
      for (let i = this._rings.length - 1; i >= 0; i--) {
        const r = this._rings[i];
        r.t += dt;
        const k = Math.min(1, r.t / r.dur);
        try {
          const s = 0.5 + k * r.maxR;
          r.m.scale.set(s, s, 1);
          r.m.material.opacity = 0.85 * (1 - k);
        } catch (e) {}
        if (k >= 1) {
          try { if (r.m.parent) r.m.parent.remove(r.m); } catch (e) {}
          this._rings.splice(i, 1);
        }
      }
    }
    /* aura sigue al jugador */
    if (this._fxAuraFollow && this._fx && this._fx.aura && this._fx.aura.visible) {
      try {
        const P = (typeof Player !== 'undefined' && Player && Player.pos) ? Player : null;
        if (P) this._fx.aura.position.set(P.pos.x, P.pos.y + 1.4, P.pos.z);
      } catch (e) {}
    }
  },
  _ensureFx() {
    if (this._fx) return;
    try {
      const g = (typeof scene !== 'undefined') ? scene : null;
      if (!g || typeof THREE === 'undefined') return;
      const map = (typeof softTex !== 'undefined') ? softTex : null;
      const aura = new THREE.Sprite(new THREE.SpriteMaterial({
        map: map, color: 0xffffff, transparent: true, opacity: 0.5,
        depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      aura.scale.set(3.2, 3.2, 1); aura.visible = false;
      const bubble = new THREE.Mesh(
        new THREE.SphereGeometry(1.7, 20, 14),
        new THREE.MeshBasicMaterial({ color: 0x59c1ff, transparent: true, opacity: 0.22, depthWrite: false })
      );
      bubble.visible = false;
      g.add(aura); g.add(bubble);
      this._fx = { aura, bubble };
    } catch (e) { this._fx = null; }
  },

  /* ---------------- botón flotante de dash ---------------- */
  _ensureDashBtn() {
    if (this._dashBtn) return;
    try {
      if (typeof document === 'undefined') return;
      const b = document.createElement('button');
      b.id = 'btn-dash';
      b.textContent = '💨';
      b.setAttribute('aria-label', 'Dash eléctrico');
      b.style.cssText = 'position:fixed;right:16px;bottom:392px;z-index:16;width:64px;height:64px;' +
        'min-width:52px;min-height:52px;border-radius:50%;font-size:30px;border:3px solid #bffcff;' +
        'background:radial-gradient(circle at 35% 30%,#9ff3ff,#00b8d4 70%);color:#fff;' +
        'box-shadow:0 0 18px #00e5ffaa,0 4px 0 #006978;display:none;touch-action:manipulation;';
      b.addEventListener('click', () => { Powers.dash(); });
      document.body.appendChild(b);
      this._dashBtn = b;
    } catch (e) {}
  },
  _updateDashBtn() {
    const b = this._dashBtn;
    if (!b) return;
    try {
      const show = this.isUnlocked('dash') && (typeof MODE === 'undefined' || MODE === 'play');
      b.style.display = show ? '' : 'none';
      if (show) {
        const ready = this.dashCd <= 0;
        b.style.opacity = ready ? '1' : '0.45';
        b.textContent = ready ? '💨' : Math.ceil(this.dashCd);
      }
    } catch (e) {}
  },

  /* ---------------- panel de poderes ---------------- */
  openPanel() {
    this._sfx('click');
    this._ensureSave();
    this._ensurePanel();
    this._renderPanel();
    if (this._panel) this._panel.classList.remove('hidden');
  },
  closePanel() { if (this._panel) this._panel.classList.add('hidden'); },
  _ensurePanel() {
    if (this._panel) return;
    try {
      const p = document.createElement('div');
      p.id = 'power-panel';
      p.className = 'screen overlay hidden';
      document.body.appendChild(p);
      this._panel = p;
    } catch (e) {}
  },
  _refreshCoinsHud() {
    try {
      if (typeof SAVE === 'undefined') return;
      const el = (typeof $ === 'function') ? $('hud-coins') : null;
      if (el) el.textContent = SAVE.coins;
      const m = (typeof $ === 'function') ? $('menu-coins') : null;
      if (m) m.textContent = SAVE.coins;
    } catch (e) {}
  },
  _renderPanel() {
    if (!this._panel) return;
    // 📜 guardar posición de scroll para no volver arriba
    let scTop = 0;
    try { scTop = this._panel.scrollTop || 0; } catch (e) {}
    // 🔧 auto-equipar la primera herramienta poseída si no hay ninguna equipada
    try {
      if (typeof SAVE !== 'undefined' && !SAVE.equippedTool && SAVE.powers) {
        const owned = POWER_DEFS.filter(d => d.kind === 'tool' && SAVE.powers[d.id]);
        if (owned.length) { SAVE.equippedTool = owned[0].id; if (typeof persist === 'function') persist(); }
      }
    } catch (e) {}
    const cards = POWER_DEFS.map(d => {
      const unlocked = this.isUnlocked(d.id);
      const active = d.kind === 'toggle' && this.isActive(d.id);
      let state, btn;
      if (!unlocked) {
        const afford = (typeof SAVE !== 'undefined' && (SAVE.coins | 0) >= d.price);
        state = '<div class="pow-state">🔒 ' + this._t('pow.locked') + ' · ' +
          (d.freePos == null ? this._t('pow.shopOnly') : this._t('pow.free', { n: d.freePos + 1 })) + '</div>';
        btn = '<button class="btn pow-btn" data-unlock="' + d.id + '"' + (afford ? '' : ' disabled') + '>' +
          '🪙 ' + d.price + ' · ' + this._t('pow.unlock') + '</button>';
      } else if (d.kind === 'tool') {
        const eq = (typeof SAVE !== 'undefined' && SAVE.equippedTool === d.id) && this.isUsable(d.id);
        state = '<div class="pow-state">' + (eq ? this._t('pow.equipped') : this._t('pow.unlocked')) + '</div>';
        btn = eq
          ? '<button class="btn pow-btn" disabled style="opacity:0.7">✅ ' + this._t('pow.equipped') + '</button>'
          : '<button class="btn pow-btn" data-equip="' + d.id + '">🔧 ' + this._t('pow.equip') + '</button>';
      } else if (d.kind === 'dash') {
        state = '<div class="pow-state">' + this._t('pow.unlocked') + '</div>';
        btn = '<button class="btn pow-btn" data-dash="1">' + this._t('pow.dashNow') + '</button>';
      } else if (active) {
        state = '<div class="pow-state">' + this._t('pow.active') + '</div>';
        btn = '<button class="btn pow-btn" data-toggle="' + d.id + '">' + this._t('pow.deactivate') + '</button>';
      } else {
        state = '<div class="pow-state">' + this._t('pow.unlocked') + '</div>';
        btn = '<button class="btn pow-btn" data-toggle="' + d.id + '">' + this._t('pow.activate') + '</button>';
      }
      return '<div class="pow-card' + (active ? ' on' : '') + (unlocked ? '' : ' locked') + '">' +
        '<div class="pow-emoji">' + d.emoji + '</div>' +
        '<div class="pow-info"><div class="pow-name">' + this._t(d.nameKey) + '</div>' +
        '<div class="pow-desc">' + this._t(d.descKey) + '</div>' + state + '</div>' + btn + '</div>';
    }).join('');
    this._panel.innerHTML =
      '<div class="panel" style="max-width:440px;width:100%">' +
      '<h2>' + this._t('pow.title') + '</h2>' +
      '<div class="pow-coins">🪙 ' + ((typeof SAVE !== 'undefined') ? (SAVE.coins | 0) : 0) + '</div>' +
      cards +
      '<div class="menu-buttons"><button class="btn" data-act="close">✕ ' + this._t('pow.close') + '</button></div>' +
      '</div>';
    const q = (sel) => Array.prototype.slice.call(this._panel.querySelectorAll(sel));
    const onTap = (el, fn) => {
      el.addEventListener('click', (e) => { e.preventDefault(); fn(); });
      el.addEventListener('touchstart', (e) => { e.preventDefault(); fn(); }, { passive: false });
    };
    q('[data-unlock]').forEach(b => onTap(b, () => this.unlockWithCoins(b.getAttribute('data-unlock'))));
    q('[data-toggle]').forEach(b => onTap(b, () => this.toggle(b.getAttribute('data-toggle'))));
    q('[data-dash]').forEach(b => onTap(b, () => { this.dash(); this._renderPanel(); }));
    q('[data-equip]').forEach(b => onTap(b, () => this.equipTool(b.getAttribute('data-equip'))));
    q('[data-act]').forEach(b => onTap(b, () => this.closePanel()));
    // 📜 restaurar posición de scroll
    try { this._panel.scrollTop = scTop; } catch (e) {}
  },
};

/* =====================================================================
   HERRAMIENTAS DE TÉCNICAS — usables en CUALQUIER mundo o ciudad 🌍
   🔫 Pistola de agua · 🥋 Patada karate (kind:'tool')
   - Se equipan en el panel ⚡ Poderes y se usan con el botón flotante.
   - Dianas y tablas se colocan en las ciudades: dan 🪙 al acertar/romper.
   - Todo sano: el agua divierte (😂), el karate es exhibición (👏).
   ===================================================================== */
'use strict';

POWER_DEFS.push(
  { id: 'water', emoji: '💦', price: 350, freePos: 3, color: 0x35b6ff, kind: 'tool', nameKey: 'pow.water.name', descKey: 'pow.water.desc' },
  { id: 'karate', emoji: '🥋', price: 450, freePos: 5, color: 0xff5e3a, kind: 'tool', nameKey: 'pow.karate.name', descKey: 'pow.karate.desc' },
  /* 🌀⭐ estilo velocidad y 🔵💥 estilo energía: 100% originales de GEAYI, SOLO en venta */
  { id: 'spin', emoji: '🌀', price: 50, freePos: null, color: 0x7bffea, kind: 'tool', nameKey: 'pow.spin.name', descKey: 'pow.spin.desc' },
  { id: 'star', emoji: '⭐', price: 110, freePos: null, color: 0xffe95e, kind: 'tool', nameKey: 'pow.star.name', descKey: 'pow.star.desc' },
  { id: 'bolt', emoji: '🔵', price: 75, freePos: null, color: 0x4da3ff, kind: 'tool', nameKey: 'pow.bolt.name', descKey: 'pow.bolt.desc' },
  { id: 'beam', emoji: '💥', price: 130, freePos: null, color: 0xffb300, kind: 'tool', nameKey: 'pow.beam.name', descKey: 'pow.beam.desc' },
  /* 🕸️🦸 estilo héroe: 100% originales de GEAYI, SOLO en venta */
  { id: 'web', emoji: '🕸️', price: 90, freePos: null, color: 0xe8f4ff, kind: 'tool', nameKey: 'pow.web.name', descKey: 'pow.web.desc' },
  { id: 'heroflight', emoji: '🦸', price: 150, freePos: null, color: 0x3f7bff, kind: 'tool', nameKey: 'pow.heroflight.name', descKey: 'pow.heroflight.desc' },
);

/* ---- textos (se agregan a los de Powers._strings) ---- */
(function () {
  const _origStrings = Powers._strings.bind(Powers);
  Powers._strings = function () {
    _origStrings();
    if (typeof addStrings !== 'function') return;
    addStrings('es', {
      'pow.water.name': 'Chorro de agua', 'pow.water.desc': 'Técnica: lanza chorros de agua con tus manos en cualquier mundo. Moja dianas (+10🪙) y divierte a los vecinos.',
      'pow.karate.name': 'Patada karate', 'pow.karate.desc': '¡HI-YA! Rompe tablas de práctica donde sea (+15🪙). Exhibición sana.',
      'pow.equip': 'Equipar', 'pow.equipped': '✅ Equipado',
      'pow.waterHit': '🎯 ¡Diana! +10 🪙', 'pow.boardBreak': '🥋 ¡Tabla rota! +15 🪙',
      'pow.hiya': '🥋 ¡HI-YA!',
      'pow.spin.name': 'Giro Turbo', 'pow.spin.desc': '¡Rueda como un torbellino! Avanza rapidísimo 2 segundos y rompe dianas y tablas a tu paso.',
      'pow.star.name': 'Poder Estrella', 'pow.star.desc': 'Brilla 10 segundos: corres más rápido, dejas estela de estrellas y rompes dianas al tocarlas.',
      'pow.bolt.name': 'Bola de Energía', 'pow.bolt.desc': 'Lanza una bola de energía brillante que revienta dianas y tablas a lo lejos.',
      'pow.beam.name': 'Onda Turbo', 'pow.beam.desc': '¡Una gran onda de energía al frente! Rompe todo lo que haya en tu camino.',
      'pow.web.name': 'Telaraña', 'pow.web.desc': '🕸️ ¡Lanza un hilo y viaja volando hasta una diana o un punto alto!',
      'pow.heroflight.name': 'Súper Vuelo', 'pow.heroflight.desc': '🦸 ¡Vuela como un héroe por 15 segundos! Sube y planea por la ciudad.',
      'pow.shopOnly': '🛒 Solo en venta',
    });
    addStrings('en', {
      'pow.water.name': 'Water splash', 'pow.water.desc': 'Technique: splash water with your hands in any world. Soak targets (+10🪙) and make neighbors laugh.',
      'pow.karate.name': 'Karate kick', 'pow.karate.desc': 'HI-YA! Break practice boards anywhere (+15🪙). Friendly exhibition.',
      'pow.equip': 'Equip', 'pow.equipped': '✅ Equipped',
      'pow.waterHit': '🎯 Bullseye! +10 🪙', 'pow.boardBreak': '🥋 Board broken! +15 🪙',
      'pow.hiya': '🥋 HI-YA!',
      'pow.spin.name': 'Turbo Spin', 'pow.spin.desc': 'Roll like a whirlwind! Dash super fast for 2 seconds, smashing targets and boards in your path.',
      'pow.star.name': 'Star Power', 'pow.star.desc': 'Shine for 10 seconds: run faster, leave a star trail, and smash targets on touch.',
      'pow.bolt.name': 'Energy Ball', 'pow.bolt.desc': 'Launch a glowing energy ball that pops targets and boards from far away.',
      'pow.beam.name': 'Turbo Wave', 'pow.beam.desc': 'A huge energy wave forward! Breaks everything in your path.',
      'pow.web.name': 'Web Zip', 'pow.web.desc': '🕸️ Shoot a web line and zip flying to a target or a high spot!',
      'pow.heroflight.name': 'Super Flight', 'pow.heroflight.desc': '🦸 Fly like a hero for 15 seconds! Soar over the city.',
      'pow.shopOnly': '🛒 Shop only',
    });
  };
  /* ---- SAVE: equippedTool ---- */
  const _origEnsure = Powers._ensureSave.bind(Powers);
  Powers._ensureSave = function () {
    const r = _origEnsure();
    try { if (typeof SAVE !== 'undefined' && !('equippedTool' in SAVE)) SAVE.equippedTool = null; } catch (e) {}
    return r;
  };
  /* ---- init: botón flotante de herramienta ---- */
  const _origInit = Powers.init.bind(Powers);
  Powers.init = function () { _origInit(); this._ensureToolBtn(); };
  /* ---- update: física de herramientas ---- */
  const _origUpdate = Powers.update.bind(Powers);
  Powers.update = function (dt) { _origUpdate(dt); this._updateTools(dt == null ? 0.016 : dt); };
  /* ---- buildForLevel: limpiar utilería ---- */
  const _origBFL = Powers.buildForLevel.bind(Powers);
  Powers.buildForLevel = function (i, group) { _origBFL(i, group); this.clearProps(); };
  /* ---- hudChips: mostrar herramienta equipada (tocable para usar) ---- */
  const _origChips = Powers.hudChips.bind(Powers);
  Powers.hudChips = function () {
    let h = _origChips();
    try {
      const d = this.equippedToolDef();
      if (d) h += '<span class="hud-chip fx" id="hud-tool-chip" style="cursor:pointer">' + d.emoji + '</span>';
      // Hacer el chip tocable: al tocarlo usa la herramienta
      setTimeout(() => {
        const chip = document.getElementById('hud-tool-chip');
        if (chip && !chip._toolTap) {
          chip._toolTap = true;
          const tap = (e) => { e.preventDefault(); e.stopPropagation(); Powers.useTool(); };
          chip.addEventListener('click', tap);
          chip.addEventListener('touchstart', tap, { passive: false });
        }
      }, 0);
    } catch (e) {}
    return h;
  };
})();

Object.assign(Powers, {
  _toolCd: 0, _loaned: null, _shots: [], _reacts: [],
  _spinT: 0, _starT: 0, _spinDir: null, _beamFx: null, _starFxT: 0,
  _web: null, _heroFlyT: 0,
  targets: [], boards: [],

  /* ---------------- préstamo (minijuegos te prestan la técnica) ---------------- */
  loanTool(id) { this._loaned = id; try { if (typeof SAVE !== 'undefined') SAVE.equippedTool = id; } catch (e) {} this._updateToolBtn(); },
  unloan() { this._loaned = null; },
  isUsable(id) { return this.isUnlocked(id) || this._loaned === id; },
  equippedToolDef() {
    let id = null;
    try { id = (typeof SAVE !== 'undefined' && SAVE.equippedTool) || null; } catch (e) {}
    // 🔧 si no hay herramienta equipada pero el jugador posee alguna, equipar la primera automáticamente
    if (!id && typeof SAVE !== 'undefined' && SAVE.powers) {
      try {
        const owned = Object.keys(SAVE.powers).filter(k => SAVE.powers[k] && this.def(k) && this.def(k).kind === 'tool');
        if (owned.length) { id = owned[0]; SAVE.equippedTool = id; if (typeof persist === 'function') persist(); }
      } catch (e) {}
    }
    return id ? this.def(id) : null;
  },

  /* ---------------- equipar ---------------- */
  equipTool(id) {
    if (!this._ensureSave()) return false;
    if (!this.isUsable(id)) { this._sfx('deny'); return false; }
    SAVE.equippedTool = (SAVE.equippedTool === id) ? null : id;
    if (typeof persist === 'function') persist();
    this._sfx('click');
    this._renderPanel();
    this._updateToolBtn();
    if (typeof updateFxHud === 'function') { try { updateFxHud(); } catch (e) {} }
    return SAVE.equippedTool === id;
  },

  /* ---------------- usar la técnica equipada ---------------- */
  useTool() {
    const d = this.equippedToolDef();
    if (!d || d.kind !== 'tool' || !this.isUsable(d.id)) { this._toast('⚠️ No hay técnica equipada'); return false; }
    if (this._toolCd > 0) return false;
    if (typeof MODE !== 'undefined' && MODE !== 'play') { this._toast('⚠️ No estás jugando'); return false; }
    const P = (typeof Player !== 'undefined') ? Player : null;
    if (!P || !P.pos) { this._toast('⚠️ Sin jugador'); return false; }
    if (typeof Vehicle !== 'undefined' && Vehicle && Vehicle.mode !== 'none') { this._toast('⚠️ Baja del vehículo primero'); return false; }
    if (d.id === 'water') { this._fireWater(P); this._toolCd = 0.8; }
    else if (d.id === 'karate') { this._doKarate(P); this._toolCd = 1.5; }
    else if (d.id === 'spin') { this._doSpin(P); this._toolCd = 2.5; }
    else if (d.id === 'star') { this._doStar(P); this._toolCd = 1.0; }
    else if (d.id === 'bolt') { this._fireBolt(P); this._toolCd = 0.7; }
    else if (d.id === 'beam') { this._doBeam(P); this._toolCd = 3.0; }
    else if (d.id === 'web') { this._doWeb(P); this._toolCd = 3.0; }
    else if (d.id === 'heroflight') { this._doHeroFlight(P); this._toolCd = 2.0; }
    else return false;
    this._updateToolBtn();
    return true;
  },

  _fireWater(P) {
    try {
      const g = (typeof scene !== 'undefined') ? scene : null;
      if (!g || typeof THREE === 'undefined') return;
      const h = P.heading || 0, dx = Math.sin(h), dz = Math.cos(h);
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8),
        new THREE.MeshBasicMaterial({ color: 0x35b6ff, transparent: true, opacity: 0.92 }));
      m.position.set(P.pos.x + dx * 1.2, P.pos.y + 1.4, P.pos.z + dz * 1.2);
      g.add(m);
      this._shots.push({ m, vx: dx * 24, vy: 3.4, vz: dz * 24, life: 2, trail: 0 });
      /* cine: salpicón al lanzar */
      this._spawn(P.pos.x + dx * 1.2, P.pos.y + 1.4, P.pos.z + dz * 1.2,
        { n: 18, colors: [0x35b6ff, 0xbfe6ff, 0xffffff], speed: 6, up: 3, life: 0.55, size: 0.45, grav: 5 });
      if (typeof Audio2 !== 'undefined' && Audio2 && typeof Audio2.tone === 'function') {
        try { Audio2.tone(1300, 0.14, 'sine', 0.1, 0, 420); } catch (e) {}
      }
    } catch (e) {}
  },

  _doKarate(P) {
    try {
      this._toast(this._t('pow.hiya'));
      this._burstAtPlayer([0xff5e3a, 0xffe95e, 0xffffff], 34, 10);
      /* cine: impacto de película */
      this._flashFX(0xffe95e, 0.22, 100);
      this._shakeFX(6, 0.3);
      if (P && P.pos) this._ringFX(P.pos.x, P.pos.y, P.pos.z, 0xffe95e, 5, 0.4);
      if (typeof Audio2 !== 'undefined' && Audio2) {
        try { if (typeof Audio2.tone === 'function') Audio2.tone(190, 0.12, 'square', 0.13); } catch (e) {}
        try { if (typeof Audio2.noise === 'function') Audio2.noise(0.12, 0.14); } catch (e) {}
      }
      // romper tablas cercanas
      for (const b of this.boards) {
        if (!b.alive) continue;
        const d2 = (b.x - P.pos.x) * (b.x - P.pos.x) + (b.z - P.pos.z) * (b.z - P.pos.z);
        if (d2 < 3.5 * 3.5) this._breakBoard(b);
      }
      // exhibición ante vecinos: aplauden (sin violencia)
      const npcs = this._nearNpcs(P.pos, 7);
      for (const n of npcs) this._npcReact(n, '👏');
    } catch (e) {}
  },

  /* ---------------- 🌀 Giro Turbo (estilo velocidad, original GEAYI) ---------------- */
  _doSpin(P) {
    const h = P.heading || 0;
    this._spinDir = { x: Math.sin(h), z: Math.cos(h) };
    this._spinT = 2;
    this._toast('🌀 ¡Giro Turbo!');
    /* cine: destello + sacudida + onda en el suelo */
    this._flashFX(0x66eeff, 0.28, 120);
    this._shakeFX(5, 0.25);
    if (P && P.pos) this._ringFX(P.pos.x, P.pos.y, P.pos.z, 0x66eeff, 6, 0.45);
    this._auraShow(0x66eeff, 5);
    this._burstAtPlayer([0x66eeff, 0xffffff], 30, 9);
    try { if (typeof Audio2 !== 'undefined' && Audio2 && typeof Audio2.whoosh === 'function') Audio2.whoosh(); } catch (e) {}
  },
  /* ---------------- ⭐ Poder Estrella (estilo velocidad, original GEAYI) ---------------- */
  _doStar(P) {
    this._starT = 10;
    this._toast('⭐ ¡Poder Estrella!');
    /* cine: destello dorado + aura de héroe */
    this._flashFX(0xffd23f, 0.35, 150);
    this._shakeFX(4, 0.25);
    this._auraShow(0xffd23f, 6);
    if (P && P.pos) this._ringFX(P.pos.x, P.pos.y, P.pos.z, 0xffd23f, 7, 0.5);
    this._burstAtPlayer([0xffe95e, 0xffffff, 0xffb300], 40, 9);
    this._sfx('win');
    const npcs = this._nearNpcs(P.pos, 8);
    for (const n of npcs) this._npcReact(n, '⭐');
  },
  /* ---------------- 🔵 Bola de Energía (estilo energía, original GEAYI) ---------------- */
  _fireBolt(P) {
    try {
      const g = (typeof scene !== 'undefined') ? scene : null;
      if (!g || typeof THREE === 'undefined') return;
      const h = P.heading || 0, dx = Math.sin(h), dz = Math.cos(h);
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10),
        new THREE.MeshBasicMaterial({ color: 0x4da3ff }));
      const halo = new THREE.Mesh(new THREE.SphereGeometry(0.46, 12, 10),
        new THREE.MeshBasicMaterial({ color: 0xbfe0ff, transparent: true, opacity: 0.5 }));
      m.add(halo);
      m.position.set(P.pos.x + dx * 1.2, P.pos.y + 1.4, P.pos.z + dz * 1.2);
      g.add(m);
      this._shots.push({ m, vx: dx * 30, vy: 2.5, vz: dz * 30, life: 2.2, trail: 0, kind: 'bolt' });
      /* cine: fogonazo al lanzar */
      this._flashFX(0x4da3ff, 0.2, 100);
      this._ringFX(P.pos.x + dx * 1.2, P.pos.y, P.pos.z + dz * 1.2, 0x4da3ff, 4, 0.35);
      this._burstAtPlayer([0x4da3ff, 0xffffff], 16, 6);
      try { if (typeof Audio2 !== 'undefined' && Audio2 && typeof Audio2.tone === 'function') Audio2.tone(700, 0.2, 'sawtooth', 0.12, 0, 1800); } catch (e) {}
    } catch (e) {}
  },
  /* ---------------- 💥 Onda Turbo (estilo energía, original GEAYI) ---------------- */
  _doBeam(P) {
    try {
      const h = P.heading || 0, dx = Math.sin(h), dz = Math.cos(h);
      let hits = 0;
      const inCone = (x, z) => {
        const rx = x - P.pos.x, rz = z - P.pos.z;
        const d = Math.hypot(rx, rz);
        if (d > 9 || d < 0.5) return false;
        return ((rx * dx + rz * dz) / d) > 0.9;
      };
      for (const t of this.targets) if (t.alive && !t.gate && inCone(t.x, t.z)) { this._hitTarget(t); hits++; }
      for (const b of this.boards) if (b.alive && inCone(b.x, b.z)) { this._breakBoard(b); hits++; }
      if (typeof THREE !== 'undefined' && typeof scene !== 'undefined' && scene) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.2, 8),
          new THREE.MeshBasicMaterial({ color: 0xffb300, transparent: true, opacity: 0.55 }));
        m.position.set(P.pos.x + dx * 4.5, P.pos.y + 1.2, P.pos.z + dz * 4.5);
        m.rotation.y = h;
        scene.add(m);
        this._beamFx = { m, ttl: 0.35 };
      }
      this._burstAtPlayer([0xffb300, 0xffe95e, 0xffffff], 40, 11);
      /* cine: fogonazo + sacudida fuerte + doble onda */
      this._flashFX(0xffb300, 0.32, 140);
      this._shakeFX(9, 0.4);
      this._ringFX(P.pos.x, P.pos.y, P.pos.z, 0xffb300, 10, 0.55);
      this._ringFX(P.pos.x + dx * 3, P.pos.y, P.pos.z + dz * 3, 0xffe95e, 8, 0.45);
      try { if (typeof Audio2 !== 'undefined' && Audio2 && typeof Audio2.noise === 'function') Audio2.noise(0.3, 0.2); } catch (e) {}
      const npcs = this._nearNpcs(P.pos, 8);
      for (const n of npcs) this._npcReact(n, '😮');
      if (!hits) this._toast('💥 ¡Onda Turbo!');
    } catch (e) {}
  },
  /* ---------------- 🕸️ Telaraña (estilo héroe, original GEAYI) ----------------
     Lanza un hilo: si hay una diana al frente (30 m), te jala hasta ella;
     si no, a un punto alto al frente. ¡Viaje divertido, sin peligro! */
  _doWeb(P) {
    try {
      const h = P.heading || 0, dx = Math.sin(h), dz = Math.cos(h);
      let ax = null, az = null, ay = null, best = 1e9;
      for (const t of this.targets) {
        if (!t.alive) continue;
        const rx = t.x - P.pos.x, rz = t.z - P.pos.z;
        const d = Math.hypot(rx, rz);
        if (d < 30 && d > 3 && ((rx * dx + rz * dz) / d) > 0.85 && d < best) {
          best = d; ax = t.x; az = t.z; ay = (t.y || 1.7) + 0.5;
        }
      }
      if (ax == null) { ax = P.pos.x + dx * 22; az = P.pos.z + dz * 22; ay = P.pos.y + 7; }
      let line = null;
      try {
        if (typeof THREE !== 'undefined' && typeof THREE.Line === 'function' && typeof scene !== 'undefined' && scene) {
          const geo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(P.pos.x, P.pos.y + 1.5, P.pos.z),
            new THREE.Vector3(ax, ay, az),
          ]);
          line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffffff }));
          scene.add(line);
        }
      } catch (e) { line = null; }
      this._web = { ax, ay, az, t: 1.1, line };
      this._toast('🕸️ ¡Telaraña!');
      /* cine: fogonazo rápido al disparar */
      this._flashFX(0xffffff, 0.18, 90);
      try { if (typeof Audio2 !== 'undefined' && Audio2 && typeof Audio2.whoosh === 'function') Audio2.whoosh(); } catch (e) {}
      const npcs = this._nearNpcs(P.pos, 8);
      for (const n of npcs) this._npcReact(n, '😮');
    } catch (e) {}
  },
  /* ---------------- 🦸 Súper Vuelo (estilo héroe, original GEAYI) ----------------
     15 segundos de vuelo: sube solo hasta buena altura y planea;
     el joystick dirige, el salto da impulso extra. */
  _doHeroFlight(P) {
    this._heroFlyT = 15;
    this._toast('🦸 ¡Súper Vuelo!');
    /* cine: despegue con onda de choque */
    this._flashFX(0x3f7bff, 0.3, 140);
    this._shakeFX(6, 0.35);
    if (P && P.pos) {
      this._ringFX(P.pos.x, P.pos.y, P.pos.z, 0x3f7bff, 9, 0.55);
      this._spawn(P.pos.x, P.pos.y + 0.3, P.pos.z, { n: 30, colors: [0xffffff, 0xd9ecff, 0x9dc4ff], speed: 8, up: 4, life: 0.7, size: 0.55, grav: 5 });
    }
    this._auraShow(0x3f7bff, 5.5);
    this._burstAtPlayer([0x3f7bff, 0xffffff, 0xffe95e], 40, 10);
    this._sfx('win');
  },
  /* rompe dianas/tablas cercanas (giro y estrella) */
  _smashNear(pos, r) {
    for (const t of this.targets) {
      if (!t.alive || t.gate) continue;
      const dx = t.x - pos.x, dz = t.z - pos.z;
      if (dx * dx + dz * dz < r * r) this._hitTarget(t);
    }
    for (const b of this.boards) {
      if (!b.alive) continue;
      const dx = b.x - pos.x, dz = b.z - pos.z;
      if (dx * dx + dz * dz < r * r) this._breakBoard(b);
    }
  },

  /* ---------------- dianas y tablas (ciudades) ---------------- */
  _targetTex() {
    if (this._ttex) return this._ttex;
    try {
      this._ttex = canvasTex(128, 128, function (g) {
        g.fillStyle = '#ffffff'; g.fillRect(0, 0, 128, 128);
        const rings = [['#e33f3f', 62], ['#ffffff', 47], ['#e33f3f', 33], ['#ffffff', 20], ['#2f6df6', 10]];
        for (const r of rings) { g.fillStyle = r[0]; g.beginPath(); g.arc(64, 64, r[1], 0, 7); g.fill(); }
      });
    } catch (e) { this._ttex = null; }
    return this._ttex;
  },
  placeTargets(group, spots) {
    if (!group || !spots || typeof THREE === 'undefined') return;
    try {
      for (const s of spots) {
        const x = s[0], z = s[1];
        const grp = new THREE.Group();
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 1.3, 8),
          new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 0.9 }));
        pole.position.y = 0.65; grp.add(pole);
        const disc = new THREE.Mesh(new THREE.CircleGeometry(0.85, 24),
          new THREE.MeshBasicMaterial({ map: this._targetTex(), transparent: true, side: THREE.DoubleSide }));
        disc.position.y = 1.7; grp.add(disc);
        grp.position.set(x, 0, z);
        group.add(grp);
        this.targets.push({ x, z, y: 1.7, mesh: grp, alive: true, respawn: 0, tag: s[2] || null });
      }
    } catch (e) {}
  },
  placeBoards(group, spots) {
    if (!group || !spots || typeof THREE === 'undefined') return;
    try {
      for (const s of spots) {
        const x = s[0], z = s[1];
        const grp = new THREE.Group();
        const stand = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.9, 0.35),
          new THREE.MeshStandardMaterial({ color: 0x6b4a2e, roughness: 0.9 }));
        stand.position.y = 0.45; grp.add(stand);
        const board = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.3, 0.09),
          new THREE.MeshStandardMaterial({ color: 0xc99a5b, roughness: 0.85 }));
        board.position.y = 1.35; board.rotation.z = 0.06; grp.add(board);
        grp.position.set(x, 0, z);
        group.add(grp);
        this.boards.push({ x, z, y: 1.35, mesh: grp, alive: true, respawn: 0, tag: s[2] || null });
      }
    } catch (e) {}
  },
  clearProps() {
    try {
      for (const t of this.targets) { try { if (t.mesh && t.mesh.parent) t.mesh.parent.remove(t.mesh); } catch (e) {} }
      for (const b of this.boards) { try { if (b.mesh && b.mesh.parent) b.mesh.parent.remove(b.mesh); } catch (e) {} }
      for (const s of this._shots) { try { if (s.m && s.m.parent) s.m.parent.remove(s.m); } catch (e) {} }
      for (const r of this._reacts) { try { if (r.spr && r.spr.parent) r.spr.parent.remove(r.spr); } catch (e) {} }
      if (this._beamFx && this._beamFx.m && this._beamFx.m.parent) { try { this._beamFx.m.parent.remove(this._beamFx.m); } catch (e) {} }
    } catch (e) {}
    this._beamFx = null; this._spinT = 0; this._starT = 0; this._spinDir = null;
    this._heroFlyT = 0;
    this._shakeT = 0;
    try { if (this._fxCanvas) this._fxCanvas.style.transform = ''; } catch (e) {}
    this._auraHide();
    if (this._rings) { for (const r of this._rings) { try { if (r.m.parent) r.m.parent.remove(r.m); } catch (e) {} } }
    this._rings = [];
    if (this._web && this._web.line) { try { if (this._web.line.parent) this._web.line.parent.remove(this._web.line); } catch (e) {} }
    this._web = null;
    this.targets = []; this.boards = []; this._shots = []; this._reacts = [];
  },

  _hitTarget(t) {
    t.alive = false; t.respawn = 12;
    try { t.mesh.visible = false; } catch (e) {}
    try {
      this._spawn(t.x, t.y, t.z, { n: 14, colors: [0x35b6ff, 0xffffff, 0x2f6df6], speed: 5, up: 3, life: 0.7, size: 0.45, grav: 4 });
      if (typeof Audio2 !== 'undefined' && Audio2 && typeof Audio2.coin === 'function') Audio2.coin();
    } catch (e) {}
    this._giveCoins(10);
    this._toast(this._t('pow.waterHit'));
    if (typeof Minigames !== 'undefined' && Minigames && typeof Minigames.onTargetHit === 'function') {
      try { Minigames.onTargetHit(t); } catch (e) {}
    }
  },
  _breakBoard(b) {
    b.alive = false; b.respawn = 25;
    try { b.mesh.visible = false; } catch (e) {}
    try {
      this._spawn(b.x, b.y, b.z, { n: 16, colors: [0xc99a5b, 0x8a5a2a, 0xffffff], speed: 5, up: 4, life: 0.8, size: 0.5, grav: 8 });
      if (typeof Audio2 !== 'undefined' && Audio2 && typeof Audio2.check === 'function') Audio2.check();
    } catch (e) {}
    this._giveCoins(15);
    this._toast(this._t('pow.boardBreak'));
    if (typeof Minigames !== 'undefined' && Minigames && typeof Minigames.onBoardBreak === 'function') {
      try { Minigames.onBoardBreak(b); } catch (e) {}
    }
  },
  _giveCoins(n) {
    try {
      if (typeof SAVE === 'undefined') return;
      SAVE.coins = (SAVE.coins | 0) + n;
      if (typeof persist === 'function') persist();
      this._refreshCoinsHud();
    } catch (e) {}
  },

  /* ---------------- NPCs: reacciones sanas ---------------- */
  _nearNpcs(pos, r) {
    const out = [];
    try {
      const list = (typeof LEVEL !== 'undefined' && LEVEL.npcs) || [];
      for (const n of list) {
        if (!n || !n.g) continue;
        const dx = n.g.position.x - pos.x, dz = n.g.position.z - pos.z;
        if (dx * dx + dz * dz < r * r) out.push(n);
      }
    } catch (e) {}
    return out;
  },
  _npcReact(n, emoji) {
    try {
      if (typeof THREE === 'undefined' || typeof canvasTex !== 'function') return;
      for (const r of this._reacts) { if (r.npc === n) return; } // uno a la vez
      const tex = canvasTex(96, 96, function (g) {
        g.font = '72px serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(emoji, 48, 52);
      });
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
      spr.scale.set(1.3, 1.3, 1);
      spr.position.set(0, 2.7, 0);
      n.g.add(spr);
      this._reacts.push({ npc: n, spr, ttl: 2.2 });
    } catch (e) {}
  },

  /* ---------------- física por cuadro ---------------- */
  _updateTools(dt) {
    if (this._toolCd > 0) this._toolCd = Math.max(0, this._toolCd - dt);
    this._updateToolBtn();
    this._updateFxCine(dt);
    const P0 = (typeof Player !== 'undefined') ? Player : null;
    // 🌀 Giro Turbo: avance forzado + estela + rompe a su paso
    if (this._spinT > 0) {
      this._spinT -= dt;
      if (P0 && this._spinDir && P0.vel) { P0.vel.x = this._spinDir.x * 19; P0.vel.z = this._spinDir.z * 19; }
      if (P0 && P0.pos) {
        this._smashNear(P0.pos, 2.6);
        this._trailT = (this._trailT || 0) + dt;
        if (this._trailT > 0.05) {
          this._trailT = 0;
          this._spawn(P0.pos.x, P0.pos.y + 1, P0.pos.z, { n: 2, colors: [0x7bffea, 0xffffff], speed: 1.5, up: 1, life: 0.4, size: 0.5, grav: 2 });
        }
      }
      if (this._spinT <= 0) { this._spinDir = null; this._auraHide(); }
    }
    // ⭐ Poder Estrella: brillo + rompe al tocar (la velocidad va en speedMult)
    if (this._starT > 0) {
      this._starT -= dt;
      if (P0 && P0.pos) {
        this._smashNear(P0.pos, 2.0);
        this._starFxT += dt;
        if (this._starFxT > 0.12) {
          this._starFxT = 0;
          this._spawn(P0.pos.x, P0.pos.y + 2.2, P0.pos.z, { n: 3, colors: [0xffe95e, 0xffffff, 0xffb300], speed: 2, up: 1.5, life: 0.6, size: 0.4, grav: 1 });
        }
      }
      if (this._starT <= 0) this._auraHide();
    }
    // 💥 visual de la onda
    if (this._beamFx) {
      this._beamFx.ttl -= dt;
      try {
        this._beamFx.m.material.opacity = Math.max(0, this._beamFx.ttl / 0.35) * 0.55;
        this._beamFx.m.scale.multiplyScalar(1 + dt * 3);
      } catch (e) {}
      if (this._beamFx.ttl <= 0) {
        try { if (this._beamFx.m.parent) this._beamFx.m.parent.remove(this._beamFx.m); } catch (e) {}
        this._beamFx = null;
      }
    }
    // 🕸️ telaraña: jala al jugador al ancla
    if (this._web) {
      const w = this._web;
      w.t -= dt;
      if (P0 && P0.pos) {
        const k = Math.min(1, dt * 5);
        P0.pos.x += (w.ax - P0.pos.x) * k;
        P0.pos.z += (w.az - P0.pos.z) * k;
        P0.pos.y += (w.ay - P0.pos.y) * k;
        if (P0.vel) P0.vel.set(0, 0, 0);
        /* líneas de velocidad mientras viaja */
        this._webFxT = (this._webFxT || 0) + dt;
        if (this._webFxT > 0.08) {
          this._webFxT = 0;
          this._spawn(P0.pos.x, P0.pos.y + 1.2, P0.pos.z, { n: 3, colors: [0xffffff, 0xd9ecff], speed: 0.8, up: 0.3, life: 0.35, size: 0.7, grav: 1 });
        }
        if (w.line) {
          try {
            w.line.geometry.setFromPoints([
              new THREE.Vector3(P0.pos.x, P0.pos.y + 1.5, P0.pos.z),
              new THREE.Vector3(w.ax, w.ay, w.az),
            ]);
          } catch (e) {}
        }
      }
      if (w.t <= 0) {
        try { if (w.line && w.line.parent) w.line.parent.remove(w.line); } catch (e) {}
        this._web = null;
        if (P0 && P0.vel) P0.vel.y = 4; // saltito al soltar
        /* cine: nube de polvo + onda al soltar */
        if (P0 && P0.pos) {
          this._spawn(P0.pos.x, P0.pos.y + 0.3, P0.pos.z, { n: 22, colors: [0xffffff, 0xd9ecff, 0xbfd9f2], speed: 5, up: 3, life: 0.6, size: 0.5, grav: 4 });
          this._ringFX(P0.pos.x, P0.pos.y, P0.pos.z, 0xffffff, 5, 0.4);
        }
      }
    }
    // 🦸 súper vuelo: 15 s planeando
    if (this._heroFlyT > 0) {
      this._heroFlyT -= dt;
      if (P0 && P0.pos && P0.vel) {
        const targetY = 13;
        P0.vel.y = (P0.pos.y < targetY - 1) ? 7 : (P0.pos.y > targetY + 4 ? -3 : 1.4);
        if (P0.jumpBuf > 0) { P0.vel.y = 9; P0.jumpBuf = 0; }
        P0.grounded = false;
        this._starFxT += dt;
        if (this._starFxT > 0.15) {
          this._starFxT = 0;
          this._spawn(P0.pos.x, P0.pos.y + 0.5, P0.pos.z, { n: 2, colors: [0x3f7bff, 0xffffff], speed: 1, up: 0.5, life: 0.5, size: 0.45, grav: 1 });
        }
      }
      if (this._heroFlyT <= 0) { this._toast('🦸 ¡Buen aterrizaje!'); this._auraHide(); }
    }
    // reaparición de dianas/tablas
    for (const t of this.targets) {
      if (!t.alive && t.respawn > 0) {
        t.respawn -= dt;
        if (t.respawn <= 0) { t.alive = true; try { t.mesh.visible = true; } catch (e) {} }
      }
    }
    for (const b of this.boards) {
      if (!b.alive && b.respawn > 0) {
        b.respawn -= dt;
        if (b.respawn <= 0) { b.alive = true; try { b.mesh.visible = true; } catch (e) {} }
      }
    }
    // reacciones sobre NPCs
    for (let i = this._reacts.length - 1; i >= 0; i--) {
      const r = this._reacts[i];
      r.ttl -= dt;
      if (r.ttl <= 0) {
        try { if (r.spr && r.spr.parent) r.spr.parent.remove(r.spr); } catch (e) {}
        this._reacts.splice(i, 1);
      }
    }
    // proyectiles de agua
    for (let i = this._shots.length - 1; i >= 0; i--) {
      const s = this._shots[i];
      s.life -= dt;
      s.vy -= 13 * dt;
      s.m.position.x += s.vx * dt;
      s.m.position.y += s.vy * dt;
      s.m.position.z += s.vz * dt;
      s.trail += dt;
      if (s.trail >= 0.06) {
        s.trail = 0;
        const cols = s.kind === 'bolt' ? [0x4da3ff, 0xbfe0ff, 0xffffff] : [0x35b6ff, 0xbfe6ff];
        this._spawn(s.m.position.x, s.m.position.y, s.m.position.z,
          { n: 1, colors: cols, speed: 0.6, up: 0.5, life: 0.35, size: 0.35, grav: 2 });
      }
      let dead = s.life <= 0;
      const px = s.m.position.x, py = s.m.position.y, pz = s.m.position.z;
      if (!dead) {
        // dianas (los arcos de meta no son dianas)
        for (const t of this.targets) {
          if (!t.alive || t.gate) continue;
          const dx = px - t.x, dy = py - t.y, dz = pz - t.z;
          if (dx * dx + dy * dy + dz * dz < 1.5 * 1.5) { this._hitTarget(t); dead = true; break; }
        }
      }
      if (!dead && s.kind === 'bolt') {
        // 🔵 la bola de energía también rompe tablas
        for (const b of this.boards) {
          if (!b.alive) continue;
          const dx = px - b.x, dy = py - b.y, dz = pz - b.z;
          if (dx * dx + dy * dy + dz * dz < 1.8 * 1.8) { this._breakBoard(b); dead = true; break; }
        }
      }
      if (!dead) {
        // vecinos: se ríen o se asombran (sano)
        const npcs = this._nearNpcs({ x: px, z: pz }, 1.4);
        for (const n of npcs) {
          const ny = n.g.position.y;
          if (Math.abs(py - (ny + 1.2)) < 1.8) {
            this._npcReact(n, s.kind === 'bolt' ? '😮' : '😂');
            const cols = s.kind === 'bolt' ? [0x4da3ff, 0xffffff] : [0x35b6ff, 0xffffff];
            this._spawn(px, py, pz, { n: 8, colors: cols, speed: 3, up: 2, life: 0.5, size: 0.4, grav: 5 });
            dead = true; break;
          }
        }
      }
      if (!dead && py <= 0.25) { // salpicadura en el suelo
        this._spawn(px, 0.3, pz, { n: 6, colors: [0x35b6ff, 0xbfe6ff], speed: 2.5, up: 2.5, life: 0.45, size: 0.35, grav: 6 });
        dead = true;
      }
      if (dead) {
        try { if (s.m.parent) s.m.parent.remove(s.m); } catch (e) {}
        /* cine: la bola de energía explota con onda de choque */
        if (s.kind === 'bolt') {
          this._flashFX(0x66ccff, 0.3, 120);
          this._shakeFX(7, 0.3);
          this._ringFX(px, py - 0.5, pz, 0x66ccff, 7, 0.5);
          this._spawn(px, py, pz, { n: 34, colors: [0x4da3ff, 0xffffff, 0xbfe0ff], speed: 9, up: 5, life: 0.7, size: 0.55, grav: 4 });
          this._spawn(px, py + 0.5, pz, { n: 14, colors: [0xffffff, 0xffe95e], speed: 4, up: 3, life: 0.5, size: 0.4, grav: 2 });
        }
        this._shots.splice(i, 1);
      }
    }
  },

  /* ---------------- botón flotante de técnica (desactivado: se usa el 🌀 del HUD) ---------------- */
  _ensureToolBtn() {
    // Desactivado: el chip 🌀 del HUD superior ya es tocable y no se enciman botones
    try { if (this._toolBtn) this._toolBtn.style.display = 'none'; } catch (e) {}
    return;
  },
  _updateToolBtn() {
    const b = this._toolBtn;
    if (!b) return;
    try {
      const d = this.equippedToolDef();
      const show = !!d && this.isUsable(d.id) && (typeof MODE === 'undefined' || MODE === 'play');
      b.style.display = show ? '' : 'none';
      if (show) {
        b.textContent = this._toolCd > 0 ? String(Math.ceil(this._toolCd)) : d.emoji;
        b.style.opacity = this._toolCd > 0 ? '0.5' : '1';
      }
    } catch (e) {}
  },
});
