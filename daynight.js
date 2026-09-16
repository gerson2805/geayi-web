/* daynight.js — 🌞🌙 Ciclo día/noche persistente + estrellas + cambio manual
   para GEAYI: Obby Xtreme 3D. Diseño 100% original GEAYI.

   IMPORTANTE: este módulo NO duplica el ciclo de weather.js, lo extiende:
   - weather.js YA hace el ciclo (sol que baja/sube, luna, cielo, niebla,
     bajar luces hemisphere/directional y subir el emissive de farolas/neones).
   - daynight.js agrega lo que weather.js no tiene:
       1) ⭐ Estrellas de noche (THREE.Points, sin luces nuevas: prohibido).
       2) 💾 Persistencia: guarda/restaura SAVE.dayNight={t} (cada ~30s).
       3) ⏱️ Ciclo configurable (~10 min por defecto) vía Weather.CYCLE.
       4) 🔘 Cambio manual día/noche: tecla N + botón flotante (solo en juego).

   Ganchos (read-only, nunca crea luces reales):
   - Weather.isNight() / Weather.nightFactor / Weather.t / Weather.CYCLE
   - El cielo y las luces los escribe weather.js; daynight.js solo LE
     el estado para mostrar/ocultar estrellas y para el toggle manual.
   - Si Weather no existe (fallback), daynight usa su propio reloj interno.

   Contrato: usa los globales THREE, scene, camera, Player, MODE, LEVEL,
   SAVE, persist, toast, T, $; no toca otros archivos ni DOM al cargarse
   (todo el DOM se crea en buildForLevel). */
'use strict';

const DayNight = {
  CFG: {
    cycleSec: 600,      // ~10 min por ciclo día/noche (configurable)
    saveEverySec: 30,   // cada cuánto se persiste la hora en SAVE
    dayT: 0.25,         // hora del día al alternar (mediodía en weather.js)
    nightT: 0.72,       // hora de la noche al alternar (noche plena en weather.js)
    stars: 220,         // cantidad de estrellas
    starRadius: 90,     // radio de la cúpula de estrellas
  },

  _stars: null,         // THREE.Points
  _starGeo: null,
  _saveT: 0,            // acumulador para la persistencia
  _keyOn: false,        // listener de tecla N ya instalado
  _btnMade: false,      // botón flotante ya creado
  _applied: false,      // ciclo + hora restaurada ya aplicados
  _fbT: 0.25,           // reloj propio si no existe Weather

  /* ============ helpers ============ */
  _hasWeather() {
    try {
      return (typeof Weather !== 'undefined') && Weather &&
        typeof Weather.isNight === 'function';
    } catch (e) { return false; }
  },
  isNight() {
    if (this._hasWeather()) { try { return !!Weather.isNight(); } catch (e) {} }
    // fallback: misma curva que weather.js (noche entre ~0.44 y ~0.96)
    const t = this._fbT % 1;
    return t > 0.49 && t < 0.91;
  },
  timeOfDay() {
    if (this._hasWeather()) { try { return Weather.t; } catch (e) {} }
    return this._fbT % 1;
  },
  setCycle(sec) { // cambia la duración del ciclo (segundos), configurable
    const s = Math.max(60, Math.min(3600, +sec || this.CFG.cycleSec));
    this.CFG.cycleSec = s;
    try { if (this._hasWeather()) Weather.CYCLE = s; } catch (e) {}
    return s;
  },

  /* Alterna manualmente entre día y noche (tecla N o botón). */
  toggle() {
    try {
      const night = this.isNight();
      if (this._hasWeather()) {
        Weather.t = night ? this.CFG.dayT : this.CFG.nightT;
        if (typeof Weather.nightFactor === 'number')
          Weather.nightFactor = night ? 0 : 1;
      } else {
        this._fbT = night ? this.CFG.dayT : this.CFG.nightT;
      }
      if (typeof toast === 'function')
        toast(night ? '☀️ ¡Día!' : '🌙 ¡Noche!');
      this._saveNow();
    } catch (e) {}
  },

  /* ============ construcción ============ */
  buildForLevel(i, group) {
    try {
      // 1) restaurar la hora guardada (si hay)
      try {
        if (this._hasWeather() && typeof SAVE !== 'undefined' && SAVE &&
            SAVE.dayNight && typeof SAVE.dayNight.t === 'number') {
          const t = Math.max(0, Math.min(0.999, SAVE.dayNight.t));
          Weather.t = t;
        }
      } catch (e) {}
      // 2) aplicar el ciclo configurado (~10 min por defecto)
      try { if (this._hasWeather()) Weather.CYCLE = this.CFG.cycleSec; } catch (e) {}
      this._applied = true;
      // 3) estrellas (una sola vez; viven en la escena)
      this._ensureStars();
      // 4) tecla N para alternar manual (una sola vez, sin DOM al cargar)
      this._ensureKey();
      // 5) botón flotante 🌙/☀️ (una sola vez)
      this._ensureButton();
    } catch (e) {}
  },

  _ensureStars() {
    if (this._stars) return;
    try {
      if (typeof THREE === 'undefined' || typeof scene === 'undefined') return;
      const n = this.CFG.stars, R = this.CFG.starRadius;
      const pos = new Float32Array(n * 3);
      for (let k = 0; k < n; k++) {
        // cúpula: ángulo azimutal + elevación 5°..85°
        const az = Math.random() * Math.PI * 2;
        const el = (5 + Math.random() * 80) * Math.PI / 180;
        pos[k * 3] = Math.cos(az) * Math.cos(el) * R;
        pos[k * 3 + 1] = Math.sin(el) * R;
        pos[k * 3 + 2] = Math.sin(az) * Math.cos(el) * R;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({
        color: 0xffffff, size: 1.6, sizeAttenuation: false,
        transparent: true, opacity: 0.9, fog: false, depthWrite: false,
      });
      const pts = new THREE.Points(geo, mat);
      pts.frustumCulled = false; // la cúpula se mueve con el jugador
      pts.visible = false;
      scene.add(pts);
      this._stars = pts; this._starGeo = geo;
    } catch (e) {}
  },

  _ensureKey() {
    if (this._keyOn) return;
    try {
      if (typeof window === 'undefined' || !window.addEventListener) return;
      window.addEventListener('keydown', (e) => {
        try {
          if (!e || e.code !== 'KeyN') return;
          if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
          if (typeof MODE !== 'undefined' && MODE !== 'play') return;
          DayNight.toggle();
        } catch (err) {}
      });
      this._keyOn = true;
    } catch (e) {}
  },

  _ensureButton() {
    if (this._btnMade) return;
    try {
      if (typeof document === 'undefined' || !document.createElement) return;
      const b = document.createElement('button');
      b.id = 'btn-daynight';
      b.textContent = '🌙';
      b.title = 'Cambiar día/noche (N)';
      b.setAttribute('aria-label', 'Cambiar día o noche');
      // estilos inline: no se puede tocar styles.css
      b.style.cssText = 'position:fixed;right:12px;bottom:118px;z-index:60;width:46px;height:46px;' +
        'border-radius:50%;border:2px solid rgba(255,255,255,.35);background:rgba(10,16,48,.72);' +
        'color:#fff;font-size:22px;cursor:pointer;backdrop-filter:blur(2px);';
      b.addEventListener('click', () => {
        try { if (typeof MODE !== 'undefined' && MODE === 'play') DayNight.toggle(); } catch (e) {}
      });
      (document.body || document.documentElement).appendChild(b);
      this._btnMade = true;
    } catch (e) {}
  },

  /* ============ frame ============ */
  update(dt) {
    try {
      if (typeof MODE === 'undefined' || MODE !== 'play') {
        if (this._stars) this._stars.visible = false; // no romper el menú
        return;
      }
      if (typeof THREE === 'undefined' || typeof scene === 'undefined') return;
      if (!this._applied) this.buildForLevel(-1, null);

      // reloj de respaldo si Weather no existe
      if (!this._hasWeather()) this._fbT = (this._fbT + dt / this.CFG.cycleSec) % 1;

      // estrellas: visibles solo de noche, cúpula centrada en el jugador
      const night = this.isNight();
      if (this._stars) {
        this._stars.visible = night;
        let px = 0, py = 0, pz = 0;
        try {
          if (typeof Player !== 'undefined' && Player && Player.pos) {
            px = Player.pos.x; py = Player.pos.y; pz = Player.pos.z;
          } else if (typeof camera !== 'undefined' && camera && camera.position) {
            px = camera.position.x; py = camera.position.y; pz = camera.position.z;
          }
        } catch (e) {}
        this._stars.position.set(px, py, pz);
      }

      // persistencia cada ~30s
      this._saveT += dt;
      if (this._saveT >= this.CFG.saveEverySec) {
        this._saveT = 0;
        this._saveNow();
      }
    } catch (e) {}
  },

  _saveNow() {
    try {
      if (typeof SAVE === 'undefined' || !SAVE) return;
      if (this._hasWeather()) SAVE.dayNight = { t: Weather.t };
      else SAVE.dayNight = { t: this._fbT % 1 };
      if (typeof persist === 'function') persist();
    } catch (e) {}
  },

  onLevelEnd() { // limpieza suave al cambiar de mundo
    try {
      if (this._stars) { try { scene.remove(this._stars); } catch (e) {} }
      this._stars = null; this._starGeo = null; this._applied = false; this._saveT = 0;
    } catch (e) {}
  },
};
