/* liveevents.js — 🎪 Eventos en vivo en la plaza de Ciudad Neón
   para GEAYI: Obby Xtreme 3D. Diseño 100% original GEAYI.

   - 🎪 Fiesta / 🎤 Concierto cada CFG.everySec (20 min), dura CFG.lenSec (5 min).
   - Anuncio con cuenta regresiva CFG.warnSec (5 min) antes:
       "🎪 ¡Fiesta en la plaza en 5:00!"
   - Al empezar: usa Concerts.startShow() y Fireworks.show() si existen
     (solo llamadas a sus APIs públicas, todo con try/catch).
   - Recompensa por asistir: si el jugador está cerca de la plaza (0,0)
     durante el evento → +25🪙, una sola vez por evento
     (SAVE.liveEvents.rewarded). El último evento se persiste en SAVE.
   - La agenda avanza en cualquier mundo durante el juego; el anuncio,
     la fiesta y la recompensa solo aplican en Ciudad Neón (índice 0),
     donde está la plaza (verificado en neoncity.js: fuente en 0,0).

   Contrato: usa los globales THREE, scene, Player, MODE, LEVEL, SAVE,
   persist, toast, showBanner, Shop2, T; no toca otros archivos ni DOM
   al cargarse (el banner se crea en buildForLevel). */
'use strict';

const LiveEvents = {
  CFG: {
    everySec: 20 * 60,  // cada 20 min hay un evento
    lenSec: 5 * 60,     // el evento dura 5 min
    warnSec: 5 * 60,    // aviso con cuenta regresiva 5 min antes
    rewardCoins: 25,    // 🪙 por asistir
    radius: 22,         // radio de "cerca de la plaza"
    worldIdx: 0,        // Ciudad Neón
    plaza: { x: 0, z: 0 },
    fwSec: 30,          // segundos de fuegos artificiales al empezar
  },

  tNext: 20 * 60,       // segundos para el próximo evento
  active: 0,            // segundos restantes del evento en curso (0 = ninguno)
  eid: 0,               // contador de eventos (único, persistido)
  _banner: null,        // elemento DOM del aviso
  _fwDone: false,       // fuegos ya lanzados en el evento actual

  /* ============ construcción ============ */
  buildForLevel(i, group) {
    try {
      // restaurar agenda desde SAVE (sin repetir recompensas)
      try {
        if (typeof SAVE !== 'undefined' && SAVE && SAVE.liveEvents) {
          const s = SAVE.liveEvents;
          if (typeof s.lastEvent === 'number' && s.lastEvent >= 0) this.eid = s.lastEvent | 0;
          if (typeof s.tNext === 'number' && s.tNext > 0)
            this.tNext = Math.min(s.tNext, this.CFG.everySec);
        }
      } catch (e) {}
      this.active = 0;
      this._fwDone = false;
      this._ensureBanner();
      this._hideBanner();
    } catch (e) {}
  },

  _ensureBanner() {
    if (this._banner) return;
    try {
      if (typeof document === 'undefined' || !document.createElement) return;
      const b = document.createElement('div');
      b.id = 'live-event-banner';
      b.style.cssText = 'position:fixed;top:84px;left:50%;transform:translateX(-50%);' +
        'z-index:55;pointer-events:none;display:none;padding:10px 18px;border-radius:14px;' +
        'background:rgba(20,8,40,.88);border:2px solid #ff2fd6;color:#fff;' +
        'font:700 16px/1.3 system-ui,sans-serif;text-align:center;white-space:nowrap;' +
        'box-shadow:0 4px 18px rgba(255,47,214,.45);';
      (document.body || document.documentElement).appendChild(b);
      this._banner = b;
    } catch (e) {}
  },

  _showBanner(txt) {
    try {
      if (!this._banner) this._ensureBanner();
      if (!this._banner) return;
      this._banner.textContent = txt;
      this._banner.style.display = 'block';
    } catch (e) {}
  },
  _hideBanner() {
    try { if (this._banner) this._banner.style.display = 'none'; } catch (e) {}
  },

  _fmt(sec) {
    sec = Math.max(0, Math.ceil(sec));
    return ((sec / 60) | 0) + ':' + String(sec % 60).padStart(2, '0');
  },

  _inPlazaWorld() {
    try {
      return (typeof LEVEL !== 'undefined') && LEVEL && LEVEL.idx === this.CFG.worldIdx;
    } catch (e) { return false; }
  },

  _playerDist() {
    try {
      if (typeof Player === 'undefined' || !Player || !Player.pos) return Infinity;
      const dx = Player.pos.x - this.CFG.plaza.x, dz = Player.pos.z - this.CFG.plaza.z;
      return Math.sqrt(dx * dx + dz * dz);
    } catch (e) { return Infinity; }
  },

  _saveNow() {
    try {
      if (typeof SAVE === 'undefined' || !SAVE) return;
      if (!SAVE.liveEvents) SAVE.liveEvents = {};
      SAVE.liveEvents.lastEvent = this.eid;
      SAVE.liveEvents.tNext = this.tNext;
      if (typeof persist === 'function') persist();
    } catch (e) {}
  },

  _rewarded(eid) {
    try {
      return !!(typeof SAVE !== 'undefined' && SAVE && SAVE.liveEvents &&
        SAVE.liveEvents.rewarded && SAVE.liveEvents.rewarded[eid]);
    } catch (e) { return false; }
  },

  /* ============ frame ============ */
  update(dt) {
    try {
      if (typeof MODE === 'undefined' || MODE !== 'play' ||
          typeof LEVEL === 'undefined' || !LEVEL || LEVEL.idx == null) {
        this._hideBanner();
        return;
      }
      const here = this._inPlazaWorld();

      if (this.active > 0) { // ===== evento en curso =====
        this.active -= dt;
        if (here) {
          this._showBanner('🎪 ¡FIESTA EN VIVO AHORA! 🎶 · quédate en la plaza');
          // recompensa por asistir (una sola vez por evento)
          if (!this._rewarded(this.eid) && this._playerDist() <= this.CFG.radius) {
            try {
              if (typeof SAVE !== 'undefined' && SAVE) {
                if (!SAVE.liveEvents) SAVE.liveEvents = {};
                if (!SAVE.liveEvents.rewarded) SAVE.liveEvents.rewarded = {};
                SAVE.liveEvents.rewarded[this.eid] = true;
              }
              if (typeof Shop2 !== 'undefined' && Shop2 && typeof Shop2.addCoins === 'function')
                Shop2.addCoins(this.CFG.rewardCoins);
              else if (typeof SAVE !== 'undefined' && SAVE)
                SAVE.coins = (SAVE.coins | 0) + this.CFG.rewardCoins;
              if (typeof persist === 'function') persist();
              if (typeof toast === 'function')
                toast('🎪 ¡Gracias por venir! +' + this.CFG.rewardCoins + '🪙');
              if (typeof showBanner === 'function')
                showBanner('🎪 +25 🪙', '¡Asististe a la fiesta en la plaza!', 2500);
            } catch (e) {}
          }
        }
        if (this.active <= 0) { // terminó
          this.active = 0;
          this.tNext = this.CFG.everySec;
          if (here) {
            this._hideBanner();
            if (typeof toast === 'function') toast('🎪 La fiesta terminó. ¡Nos vemos en la próxima!');
          }
          this._saveNow();
        }
        return;
      }

      // ===== esperando el próximo evento =====
      this.tNext -= dt;
      if (here && this.tNext <= this.CFG.warnSec && this.tNext > 0) {
        this._showBanner('🎪 ¡Fiesta en la plaza en ' + this._fmt(this.tNext) + '! 🎶');
      } else if (here) {
        this._hideBanner(); // fuera del aviso: no dejar el cartel pegado
      }
      if (this.tNext <= 0) this._startEvent();
    } catch (e) {}
  },

  _startEvent() {
    this.eid++;
    this.active = this.CFG.lenSec;
    this.tNext = this.CFG.everySec;
    this._fwDone = false;
    try {
      // 🎤 concierto en la tarima de la plaza (API pública de concerts.js)
      try {
        if (typeof Concerts !== 'undefined' && Concerts &&
            typeof Concerts.startShow === 'function') Concerts.startShow();
      } catch (e) {}
      // 🎆 fuegos artificiales sobre la plaza (API pública de fireworks.js)
      try {
        if (typeof Fireworks !== 'undefined' && Fireworks &&
            typeof Fireworks.show === 'function') {
          Fireworks.show(this.CFG.plaza.x, this.CFG.plaza.z, this.CFG.fwSec);
          this._fwDone = true;
        }
      } catch (e) {}
      if (this._inPlazaWorld()) {
        if (typeof toast === 'function') toast('🎪 ¡EMPEZÓ LA FIESTA EN LA PLAZA! 🎶');
        if (typeof showBanner === 'function')
          showBanner('🎪 ¡Fiesta en la plaza!', '🎶 Quédate cerca para ganar +25 🪙', 4000);
      }
    } catch (e) {}
    this._saveNow();
  },

  onLevelEnd() { // al cambiar de mundo: ocultar aviso, la agenda sigue
    try { this._hideBanner(); this._saveNow(); } catch (e) {}
  },
};
