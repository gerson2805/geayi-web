/* community.js — 🌍 COMUNIDAD Y RETENCIÓN (módulo nuevo, no modifica archivos existentes)
   Complementa a online.js (salas nombradas, frases rápidas, fantasmas), trophies.js
   (12+ logros con medallas y monedas vía Community.grantLogro), family.js
   (modo historia "La familia llega a Immokalee") y añade: voces TTS en español,
   regalos con códigos, y concursos de construcción con jurado.
   - NO ejecuta DOM al cargar: todo vive en Community.init(), que el boot llama.
   - UI en español, botones grandes táctiles, liviano para Android.
   - Todo 100% original: nombres de salas, jurado y diálogos son creación propia.
   ==================================================================================
   INTEGRACIÓN (la hace el orquestador, este archivo no toca otros):
   1. <script src="community.js"></script> en index.html (después de trophies.js).
   2. En boot(): Community.init();
   3. En el loop de game.js (MODE==='play'): if (typeof Community!=='undefined') Community.tick(dt);
   4. Botón "📖 HISTORIA" en el menú → Community.abrirHistoria()
   5. Opcional: botones "🎁 REGALAR" → Community.panelRegalo(), "🏗️ CONCURSO" → Community.mostrarConcurso()
   6. Opcional en joinRoom (online.js) tras SUBSCRIBED: Community.onEntrarSala(Net.worldIdx);
   ================================================================================== */
'use strict';

/* ============================== helpers internos ============================== */
function _comToast(msg) {
  try { if (typeof toast === 'function') toast(msg); } catch (e) {}
}
function _comConfeti() {
  try {
    if (typeof Particles !== 'undefined' && Particles && typeof Particles.burst === 'function') {
      let px = 0, py = 2.5, pz = 0;
      if (typeof Player !== 'undefined' && Player && Player.pos) {
        px = Player.pos.x; py = Player.pos.y + 2; pz = Player.pos.z;
      }
      Particles.burst(px, py, pz, [0xffd23f, 0xffffff, 0xff9d00, 0xffe95e, 0x59d867], 50, 9);
    }
  } catch (e) {}
}
function _comSumarMonedas(n) {
  try {
    if (typeof SAVE === 'undefined' || !SAVE) return;
    SAVE.coins = (SAVE.coins || 0) + n;
    if (typeof persist === 'function') persist();
    ['hud-coins', 'menu-coins', 'custom-coins'].forEach(id => {
      try { const el = $(id); if (el) el.textContent = SAVE.coins; } catch (e) {}
    });
  } catch (e) {}
}
function _comNomJugador() {
  try { if (typeof displayName === 'function') return displayName(); } catch (e) {}
  return 'Jugador';
}
/* base64 propio (funciona en navegador y en node, sin btoa/atob) */
const _B64ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
function _b64encode(str) {
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if (c < 128) bytes.push(c);
    else if (c < 2048) bytes.push(192 | (c >> 6), 128 | (c & 63));
    else bytes.push(224 | (c >> 12), 128 | ((c >> 6) & 63), 128 | (c & 63));
  }
  let out = '', i = 0;
  while (i < bytes.length) {
    const b0 = bytes[i++], b1 = i < bytes.length ? bytes[i++] : NaN, b2 = i < bytes.length ? bytes[i++] : NaN;
    const n = (b0 << 16) | ((isNaN(b1) ? 0 : b1) << 8) | (isNaN(b2) ? 0 : b2);
    out += _B64ABC[(n >> 18) & 63] + _B64ABC[(n >> 12) & 63] +
      (isNaN(b1) ? '' : _B64ABC[(n >> 6) & 63]) + (isNaN(b2) ? '' : _B64ABC[n & 63]);
  }
  return out;
}
function _b64decode(s) {
  s = String(s || '').replace(/[^A-Za-z0-9\-_]/g, '');
  const bytes = [];
  for (let i = 0; i < s.length; i += 4) {
    const c0 = _B64ABC.indexOf(s[i]), c1 = _B64ABC.indexOf(s[i + 1]);
    const c2 = i + 2 < s.length ? _B64ABC.indexOf(s[i + 2]) : -2;
    const c3 = i + 3 < s.length ? _B64ABC.indexOf(s[i + 3]) : -2;
    if (c0 < 0 || c1 < 0) return null;
    const n = (c0 << 18) | (c1 << 12) | ((c2 < 0 ? 0 : c2) << 6) | (c3 < 0 ? 0 : c3);
    bytes.push((n >> 16) & 255);
    if (c2 >= 0) bytes.push((n >> 8) & 255);
    if (c3 >= 0) bytes.push(n & 255);
  }
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (b < 128) out += String.fromCharCode(b);
    else if ((b & 224) === 192) out += String.fromCharCode(((b & 31) << 6) | (bytes[++i] & 63));
    else out += String.fromCharCode(((b & 15) << 12) | ((bytes[++i] & 63) << 6) | (bytes[++i] & 63));
  }
  return out;
}
/* overlay genérico de pantalla completa (se cierra solo) */
function _comOverlay(titulo, emoji) {
  const ov = document.createElement('div');
  ov.className = 'com-ov';
  ov.style.cssText = 'position:fixed;inset:0;z-index:9990;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;padding:14px;';
  const box = document.createElement('div');
  box.style.cssText = 'background:#1c2030;border:3px solid #ffd23f;border-radius:18px;max-width:520px;width:100%;max-height:86vh;overflow:auto;padding:18px;text-align:center;color:#fff;';
  const h = document.createElement('h2');
  h.style.cssText = 'margin:0 0 10px;font-size:24px;';
  h.textContent = (emoji || '') + ' ' + titulo;
  box.appendChild(h);
  const body = document.createElement('div');
  box.appendChild(body);
  const cerrar = document.createElement('button');
  cerrar.textContent = '✖ Cerrar';
  cerrar.style.cssText = 'margin-top:14px;min-height:52px;padding:12px 26px;font-size:18px;border-radius:14px;border:0;background:#3a3f55;color:#fff;font-weight:bold;';
  cerrar.addEventListener('click', () => { try { if (typeof Audio2 !== 'undefined') Audio2.click(); } catch (e) {} try { if (typeof Voz !== 'undefined') Voz.callar(); } catch (e) {} ov.remove(); });
  box.appendChild(cerrar);
  ov.appendChild(box);
  ov.addEventListener('click', e => { if (e.target === ov) { try { if (typeof Voz !== 'undefined') Voz.callar(); } catch (err) {} ov.remove(); } });
  document.body.appendChild(ov);
  return { ov, body };
}
function _comBotonGrande(txt, bg) {
  const b = document.createElement('button');
  b.textContent = txt;
  b.style.cssText = 'display:block;width:100%;min-height:56px;margin:8px 0;padding:12px;font-size:18px;font-weight:bold;border-radius:14px;border:0;cursor:pointer;background:' + (bg || '#2f9e44') + ';color:#fff;';
  b.addEventListener('click', () => { try { if (typeof Audio2 !== 'undefined') Audio2.click(); } catch (e) {} });
  return b;
}

/* ============================== 🔊 VOZ (TTS español) ============================== */
/* Voz.hablar(texto): usa speechSynthesis con voz en español, velocidad 1.
   NUNCA habla sin interacción previa del usuario (bandera _interactuado). */
const Voz = {
  on: true,
  _interactuado: false,
  _vozEs: null,
  _turno: 0,
  /* idioma de la voz: 'auto' = sigue el idioma del juego; o 'es'/'en'/'pt'/'fr' */
  idioma: 'auto',

  init() {
    const marcar = () => {
      this._interactuado = true;
      this._elegirVoz();
      try {
        document.removeEventListener('pointerdown', marcar);
        document.removeEventListener('keydown', marcar);
        document.removeEventListener('touchstart', marcar);
      } catch (e) {}
    };
    try {
      document.addEventListener('pointerdown', marcar, { once: true });
      document.addEventListener('keydown', marcar, { once: true });
      document.addEventListener('touchstart', marcar, { once: true });
    } catch (e) {}
    try {
      if (typeof SAVE !== 'undefined' && SAVE && typeof SAVE.voz === 'boolean') this.on = SAVE.voz;
      if (typeof SAVE !== 'undefined' && SAVE && typeof SAVE.vozLang === 'string') this.idioma = SAVE.vozLang;
    } catch (e) {}
    if (typeof speechSynthesis !== 'undefined' && speechSynthesis) {
      try { speechSynthesis.getVoices(); } catch (e) {}
      try {
        if (typeof speechSynthesis.onvoiceschanged !== 'undefined')
          speechSynthesis.onvoiceschanged = () => this._elegirVoz();
      } catch (e) {}
    }
  },

  /* idioma efectivo de la voz */
  _langVoz() {
    if (this.idioma && this.idioma !== 'auto') return this.idioma;
    try { if (typeof LANG === 'string' && LANG) return LANG; } catch (e) {}
    return 'es';
  },
  _langCode() {
    const l = this._langVoz();
    return { es: 'es-ES', en: 'en-US', pt: 'pt-BR', fr: 'fr-FR' }[l] || 'es-ES';
  },
  setIdioma(id) {
    this.idioma = id;
    try { if (typeof SAVE !== 'undefined' && SAVE) { SAVE.vozLang = id; if (typeof persist === 'function') persist(); } } catch (e) {}
    this._turno++;
    this.callar();
    this._elegirVoz();
    try { if (typeof Audio2 !== 'undefined') Audio2.click(); } catch (e) {}
  },

  _elegirVoz() {
    try {
      if (typeof speechSynthesis === 'undefined' || !speechSynthesis) return;
      const voces = speechSynthesis.getVoices() || [];
      const lang = this._langVoz();
      this._vozEs = voces.find(v => new RegExp('^' + lang + '([-_]|$)', 'i').test(v.lang || '')) ||
                    voces.find(v => (v.lang || '').toLowerCase().indexOf(lang) === 0) || null;
    } catch (e) { this._vozEs = null; }
  },

  /* ¿puede hablar ahora mismo? */
  _puede() {
    if (!this.on || !this._interactuado) return false;
    try { if (typeof speechSynthesis === 'undefined' || !speechSynthesis) return false; } catch (e) { return false; }
    return true;
  },

  /* parte el texto en frases cortas: en Android los textos largos atoran la voz */
  _trozos(texto) {
    const t = String(texto).replace(/\s+/g, ' ').trim();
    if (!t) return [];
    const partes = t.split(/(?<=[.!?¿¡…:;])\s+/);
    const out = [];
    let cur = '';
    partes.forEach(p => {
      if ((cur + ' ' + p).trim().length > 190 && cur) { out.push(cur.trim()); cur = p; }
      else cur = (cur + ' ' + p).trim();
    });
    if (cur.trim()) out.push(cur.trim());
    return out;
  },

  hablar(texto) {
    if (!texto || !this._puede()) return false;
    try {
      const yo = this;
      const turno = ++this._turno;
      speechSynthesis.cancel();
      try { speechSynthesis.resume(); } catch (e) {}
      this._elegirVoz();
      const trozos = this._trozos(texto);
      if (!trozos.length) return false;
      /* la pausa tras cancel() evita que la voz se quede atorada en Android */
      setTimeout(function () {
        if (turno !== yo._turno) return;
        try {
          let i = 0;
          const decir = function () {
            if (turno !== yo._turno || i >= trozos.length) return;
            try { speechSynthesis.resume(); } catch (e) {}
            const u = new SpeechSynthesisUtterance(trozos[i]);
            u.lang = yo._langCode();
            u.rate = 1;
            u.pitch = 1;
            if (yo._vozEs) { try { u.voice = yo._vozEs; } catch (e) {} }
            u.onend = function () { i++; decir(); };
            u.onerror = function () { i++; decir(); };
            speechSynthesis.speak(u);
          };
          decir();
        } catch (e) {}
      }, 120);
      return true;
    } catch (e) { return false; }
  },

  narrarLogro(nombre) { return this.hablar('¡Logro desbloqueado! ' + nombre); },
  narrarHistoria(linea) { return this.hablar(linea); },
  callar() { this._turno++; try { if (typeof speechSynthesis !== 'undefined' && speechSynthesis) speechSynthesis.cancel(); } catch (e) {} },

  toggle() {
    this.on = !this.on;
    try { if (typeof SAVE !== 'undefined' && SAVE) { SAVE.voz = this.on; if (typeof persist === 'function') persist(); } } catch (e) {}
    if (!this.on) this.callar();
    try { if (typeof Audio2 !== 'undefined') Audio2.click(); } catch (e) {}
    Community._refrescarBotonVoz();
    if (this.on) this.hablar('Voz activada. ¡A jugar!');
    try { if (this.on && typeof Community !== 'undefined') Community.grantLogro('voz'); } catch (e) {}
    return this.on;
  }
};

/* ============================== 🌍 COMMUNITY ============================== */
const Community = {
  /* ---------- estado ---------- */
  fantasmasOn: false,
  _fantasmas: {},       // id jugador -> { mesh, color }
  _regalosHook: false,

  /* =====================================================================
     a) MULTIJUGADOR (complementa online.js, no lo duplica)
     ===================================================================== */
  /* Nombres originales para las salas (online.js usa 'sala1'..'sala3' por mundo) */
  NOMBRES_SALA: ['La Plaza', 'El Malecón', 'La Cancha', 'El Kiosko', 'El Mirador', 'La Esquina'],

  /* nombre bonito de una sala: Community.nombreDeSala(0, 1) → "Sala 1 · La Plaza" */
  nombreDeSala(w, r) {
    const n = this.NOMBRES_SALA[((+r || 1) - 1 + (+w || 0)) % this.NOMBRES_SALA.length];
    return 'Sala ' + (+r || 1) + ' · ' + n;
  },

  /* re-etiqueta las filas de salas del lobby online con los nombres bonitos */
  etiquetarSalas() {
    try {
      const box = $('online-rooms');
      if (!box) return false;
      const filas = box.querySelectorAll('.rname');
      for (let i = 0; i < filas.length; i++) {
        filas[i].textContent = '🚪 ' + this.nombreDeSala((typeof Net !== 'undefined' ? Net.onlineWorld : 0) || 0, i + 1);
      }
      return true;
    } catch (e) { return false; }
  },

  /* frases rápidas de chat en español */
  FRASES: ['👋 ¡Hola!', '🏃 ¡Sígueme!', '🎉 ¡Bien hecho!', '💪 ¡Tú puedes!', '😂 ¡Jajaja!', '👍 ¡Buena esa!', '🏆 ¡Buen juego!', '🌟 ¡Nos vemos!'],

  /* envía una frase rápida a la sala (mismo canal que sendChat de online.js) */
  enviarFrase(i) {
    try { if (typeof Audio2 !== 'undefined') Audio2.click(); } catch (e) {}
    const texto = this.FRASES[+i];
    if (!texto) return false;
    try {
      if (typeof Net === 'undefined' || !Net.active || !Net.channel || !Net.me) {
        _comToast('🌐 Entra a una sala online para usar las frases.');
        return false;
      }
      const ahora = Date.now();
      if (ahora - (Net.lastChat || 0) < 1000) { _comToast('⏳ Espera un segundo…'); return false; }
      Net.lastChat = ahora;
      Net.channel.send({ type: 'broadcast', event: 'chat', payload: { id: Net.me.id, name: _comNomJugador(), text: texto } });
      try { if (typeof addChatLine === 'function') addChatLine(_comNomJugador(), texto, true); } catch (e) {}
      this._stat('frases', 1);
      this._stat('chats', 1);
      this._revisarLogrosChat();
      return true;
    } catch (e) { _comToast('⚠️ No se pudo enviar.'); return false; }
  },

  /* panel con las 8 frases en botones grandes */
  panelFrases() {
    const { ov, body } = _comOverlay('Frases rápidas', '💬');
    this.FRASES.forEach((f, i) => {
      const b = _comBotonGrande(f, '#0b7285');
      b.addEventListener('click', () => { if (this.enviarFrase(i)) ov.remove(); });
      body.appendChild(b);
    });
  },

  /* llamado (opcional) tras entrar a una sala: logro + conteo de mundos */
  onEntrarSala(w) {
    this.grantLogro('amigo1');
    try {
      const s = this._stats();
      if (s.mundosOnline.indexOf(+w || 0) === -1) { s.mundosOnline.push(+w || 0); this._guardarStats(); }
      if (s.mundosOnline.length >= 4) this.grantLogro('aventurero');
    } catch (e) {}
    this.etiquetarSalas();
  },

  /* ---- fantasmas: presencia liviana — el otro jugador como cubo de color ----
     Modo pensado para Android: cubos translúcidos en vez de avatares completos.
     Community.modoFantasma(true) oculta los avatares remotos de online.js y
     muestra un cubo de color por jugador; Community.tick(dt) los mueve. */
  modoFantasma(on) {
    this.fantasmasOn = !!on;
    if (!on) this._limpiarFantasmas();
    _comToast(on ? '👻 Modo fantasma: jugadores como cubos de color' : '👻 Modo fantasma desactivado');
    try { if (typeof Audio2 !== 'undefined') Audio2.click(); } catch (e) {}
  },

  _colorPara(id) {
    let h = 0;
    const s = String(id || '?');
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return (h % 0xffffff) || 0x00c2a8;
  },

  _limpiarFantasmas() {
    try {
      for (const k of Object.keys(this._fantasmas)) {
        try { if (typeof scene !== 'undefined' && scene) scene.remove(this._fantasmas[k].mesh); } catch (e) {}
      }
    } catch (e) {}
    this._fantasmas = {};
    try { // devolver la visibilidad a los avatares de online.js
      if (typeof Net !== 'undefined' && Net.players)
        for (const k of Object.keys(Net.players)) Net.players[k].group.visible = true;
    } catch (e) {}
  },

  fantasmaTick(dt) {
    if (!this.fantasmasOn) return;
    try {
      if (typeof Net === 'undefined' || !Net.active || typeof scene === 'undefined' || !scene) return;
      if (typeof THREE === 'undefined') return;
      const vistos = {};
      for (const k of Object.keys(Net.players || {})) {
        vistos[k] = true;
        const rp = Net.players[k];
        rp.group.visible = false; // el cubo reemplaza al avatar pesado
        let f = this._fantasmas[k];
        if (!f) {
          const color = this._colorPara(k);
          const geo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
          const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55 });
          const mesh = new THREE.Mesh(geo, mat);
          let etiqueta = null;
          try {
            if (typeof makeNameLabel === 'function') {
              etiqueta = makeNameLabel(String(rp.name || 'Jugador').slice(0, 16));
              etiqueta.position.y = 1.1;
              mesh.add(etiqueta);
            }
          } catch (e) {}
          mesh.position.set(rp.tx || 0, (rp.ty || 0) + 0.8, rp.tz || 0);
          scene.add(mesh);
          f = this._fantasmas[k] = { mesh, color };
        }
        const m = f.mesh;
        const vel = 1 - Math.pow(0.001, dt);
        m.position.x += ((rp.tx || 0) - m.position.x) * vel;
        m.position.y += (((rp.ty || 0) + 0.8 + Math.sin(Date.now() / 400 + k.length) * 0.15) - m.position.y) * vel;
        m.position.z += ((rp.tz || 0) - m.position.z) * vel;
        m.rotation.y += dt * 1.5;
      }
      for (const k of Object.keys(this._fantasmas)) {
        if (!vistos[k]) {
          try { scene.remove(this._fantasmas[k].mesh); } catch (e) {}
          delete this._fantasmas[k];
        }
      }
    } catch (e) {}
  },

  /* =====================================================================
     c) LOGROS Y MEDALLAS (compatible con trophies.js)
     Community.grantLogro(id): si el id es un trofeo nativo de Trophy.DEFS,
     delega en Trophy.unlock(id); si es un logro de comunidad, lo otorga con
     medalla 🥇🥈🥉 + monedas, toast, confeti, sonido y narración por voz.
     ===================================================================== */
  LOGROS: [
    { id: 'amigo1',      medalla: '🥉', emoji: '🌐', nombre: 'Primer Amigo',      desc: 'Entra a tu primera sala online',              monedas: 25  },
    { id: 'voz',         medalla: '🥉', emoji: '🔊', nombre: 'Buena Voz',         desc: 'Activa la voz narradora del juego',           monedas: 10  },
    { id: 'capitulo1',   medalla: '🥉', emoji: '📖', nombre: 'Primer Capítulo',   desc: 'Completa el capítulo 1 de la historia',       monedas: 20  },
    { id: 'generoso1',   medalla: '🥉', emoji: '🎁', nombre: 'Corazón Generoso',  desc: 'Regala tu primer objeto',                     monedas: 50  },
    { id: 'regalo1',     medalla: '🥉', emoji: '🎀', nombre: 'Regalo Recibido',   desc: 'Canjea tu primer código de regalo',           monedas: 25  },
    { id: 'constructor1',medalla: '🥉', emoji: '🧱', nombre: 'Mini Constructor',  desc: 'Registra 1 construcción en un concurso',      monedas: 30  },
    { id: 'charlatan',   medalla: '🥈', emoji: '💬', nombre: 'Charlatán',         desc: 'Envía 10 mensajes en el chat online',         monedas: 50  },
    { id: 'jurado',      medalla: '🥈', emoji: '⚖️', nombre: 'Ojo de Jurado',     desc: 'Vota en un concurso de construcción',         monedas: 40  },
    { id: 'constructor5',medalla: '🥈', emoji: '🏗️', nombre: 'Maestro Constructor', desc: 'Registra 5 construcciones en concursos',    monedas: 80  },
    { id: 'generoso3',   medalla: '🥈', emoji: '💝', nombre: 'Súper Generoso',    desc: 'Regala 3 objetos a otros jugadores',          monedas: 100 },
    { id: 'mascota',     medalla: '🥈', emoji: '🐶', nombre: 'Mejor Amigo',       desc: 'Regala una mascota',                          monedas: 75  },
    { id: 'saludador',   medalla: '🥇', emoji: '📣', nombre: 'Saludador Pro',     desc: 'Envía 50 mensajes en el chat online',         monedas: 100 },
    { id: 'campeon',     medalla: '🥇', emoji: '🏆', nombre: 'Campeón del Concurso', desc: 'Gana un concurso de construcción',         monedas: 150 },
    { id: 'aventurero',  medalla: '🥇', emoji: '🌎', nombre: 'Aventurero Global', desc: 'Juega online en 4 mundos distintos',           monedas: 120 },
    { id: 'historia',    medalla: '🥇', emoji: '👨‍👩‍👧‍👦', nombre: 'Historia Completa', desc: 'Termina los 5 capítulos de la historia',    monedas: 200 },
  ],

  /* estadísticas de comunidad (persistentes en SAVE.cstats) */
  _stats() {
    try {
      if (typeof SAVE === 'undefined' || !SAVE) return { frases: 0, chats: 0, regalos: 0, recibidos: 0, construcciones: 0, concursos: 0, votos: 0, mundosOnline: [], clogros: [] };
      if (!SAVE.cstats || typeof SAVE.cstats !== 'object') SAVE.cstats = {};
      const s = SAVE.cstats;
      if (typeof s.frases !== 'number') s.frases = 0;
      if (typeof s.chats !== 'number') s.chats = 0;
      if (typeof s.regalos !== 'number') s.regalos = 0;
      if (typeof s.recibidos !== 'number') s.recibidos = 0;
      if (typeof s.construcciones !== 'number') s.construcciones = 0;
      if (typeof s.concursos !== 'number') s.concursos = 0;
      if (typeof s.votos !== 'number') s.votos = 0;
      if (!Array.isArray(s.mundosOnline)) s.mundosOnline = [];
      if (!Array.isArray(s.clogros)) s.clogros = [];
      return s;
    } catch (e) { return { frases: 0, chats: 0, regalos: 0, recibidos: 0, construcciones: 0, concursos: 0, votos: 0, mundosOnline: [], clogros: [] }; }
  },
  _stat(k, n) {
    try { const s = this._stats(); s[k] = (s[k] || 0) + (n || 1); this._guardarStats(); } catch (e) {}
  },
  _guardarStats() { try { if (typeof persist === 'function') persist(); } catch (e) {} },

  /* revisa los logros de chat (llamar tras cada mensaje enviado) */
  _revisarLogrosChat() {
    try {
      const s = this._stats();
      if (s.chats >= 10) this.grantLogro('charlatan');
      if (s.chats >= 50) this.grantLogro('saludador');
    } catch (e) {}
  },
  /* hook público: el juego puede llamar Community.onChatEnviado() tras sendChat() */
  onChatEnviado() { this._stat('chats', 1); this._revisarLogrosChat(); },

  tieneLogro(id) {
    try { return this._stats().clogros.indexOf(id) !== -1; } catch (e) { return false; }
  },

  grantLogro(id) {
    if (!id) return false;
    try {
      /* 1) ¿es un trofeo nativo? → delegar al sistema de trophies.js */
      if (typeof Trophy !== 'undefined' && Trophy && Array.isArray(Trophy.DEFS)) {
        const nativo = Trophy.DEFS.some(d => d.id === id);
        if (nativo) return Trophy.unlock(id);
      }
      /* 2) logro de comunidad */
      const def = this.LOGROS.find(d => d.id === id);
      if (!def) return false; // id desconocido
      const s = this._stats();
      if (s.clogros.indexOf(id) !== -1) return false; // ya lo tenía
      s.clogros.push(id);
      this._guardarStats();
      _comSumarMonedas(def.monedas || 0);
      _comToast(def.medalla + ' ¡Logro: ' + def.nombre + '! +' + (def.monedas || 0) + ' 🪙');
      _comConfeti();
      try { if (typeof Audio2 !== 'undefined' && Audio2.win) Audio2.win(); } catch (e) {}
      try { Voz.narrarLogro(def.nombre); } catch (e) {}
      return true;
    } catch (e) { return false; }
  },

  /* catálogo de logros con estado (para la galería) */
  listLogros() {
    return this.LOGROS.map(d => ({
      id: d.id, medalla: d.medalla, emoji: d.emoji,
      nombre: d.nombre, desc: d.desc, monedas: d.monedas,
      unlocked: this.tieneLogro(d.id)
    }));
  },

  /* galería de logros de comunidad */
  panelLogros() {
    const { body } = _comOverlay('Logros de comunidad', '🏅');
    const tot = this.listLogros().filter(l => l.unlocked).length;
    const sub = document.createElement('div');
    sub.style.cssText = 'margin-bottom:12px;color:#ffe95e;font-weight:bold;';
    sub.textContent = '🏅 ' + tot + ' de ' + this.LOGROS.length + ' logros';
    body.appendChild(sub);
    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;';
    body.appendChild(grid);
    this.listLogros().forEach(l => {
      const card = document.createElement('div');
      card.style.cssText = l.unlocked
        ? 'border:2px solid #ffd23f;border-radius:14px;padding:12px 8px;background:linear-gradient(160deg,#3a2c00,#211800);'
        : 'border:2px solid #555;border-radius:14px;padding:12px 8px;background:#161616;opacity:.55;filter:grayscale(1);';
      const em = document.createElement('div');
      em.style.cssText = 'font-size:38px;line-height:1.2;';
      em.textContent = l.unlocked ? (l.medalla + ' ' + l.emoji) : '🔒';
      card.appendChild(em);
      const nm = document.createElement('div');
      nm.style.cssText = 'font-weight:bold;margin-top:6px;font-size:14px;color:' + (l.unlocked ? '#ffe95e' : '#999') + ';';
      nm.textContent = l.nombre;
      card.appendChild(nm);
      const ds = document.createElement('div');
      ds.style.cssText = 'font-size:12px;margin-top:4px;color:' + (l.unlocked ? '#fff' : '#777') + ';';
      ds.textContent = l.desc + ' (+' + l.monedas + ' 🪙)';
      card.appendChild(ds);
      grid.appendChild(card);
    });
  },

  /* =====================================================================
     d) INTERCAMBIAR OBJETOS 🎁
     - itemsRegalables(): lo que el jugador posee y puede regalar
       (gorras de HATS, estelas de TRAILS, su mascota de SAVE.pet).
     - Online: se envía al jugador seleccionado por broadcast 'regalo'.
     - Local: se genera un código alfanumérico GEAYI-XXXX (base64 simple del
       objeto) y Community.canjear(codigo) lo convierte en el objeto.
     ===================================================================== */
  itemsRegalables() {
    const items = [];
    try {
      if (typeof SAVE === 'undefined' || !SAVE) return items;
      const hats = Array.isArray(SAVE.ownedHats) ? SAVE.ownedHats : [];
      const trails = Array.isArray(SAVE.ownedTrails) ? SAVE.ownedTrails : [];
      const cat = (lista, tipo, ids) => {
        (lista || []).forEach(id => {
          if (id === 'none') return;
          const def = (ids || []).find(d => d.id === id);
          if (def) items.push({ tipo, id, emoji: def.emoji || '🎁', nombre: def.name || def.nombre || id });
        });
      };
      cat(hats, 'hat', (typeof HATS !== 'undefined' ? HATS : []));
      cat(trails, 'trail', (typeof TRAILS !== 'undefined' ? TRAILS : []));
      if (SAVE.pet === 'dog') items.push({ tipo: 'pet', id: 'dog', emoji: '🐶', nombre: 'Perrito' });
      if (SAVE.pet === 'cat') items.push({ tipo: 'pet', id: 'cat', emoji: '🐱', nombre: 'Gatito' });
    } catch (e) {}
    return items;
  },

  /* código de regalo: "GEAYI-" + base64('{"t":"hat","i":"cap"}') */
  crearCodigoRegalo(tipo, id) {
    try {
      tipo = String(tipo || ''); id = String(id || '');
      const ok = this.itemsRegalables().some(it => it.tipo === tipo && it.id === id);
      if (!ok) { _comToast('⚠️ Ese objeto no lo tienes para regalar.'); return null; }
      const codigo = 'GEAYI-' + _b64encode(JSON.stringify({ t: tipo, i: id }));
      _comToast('🎁 ¡Código creado! Compártelo con quien quieras.');
      try { if (typeof Audio2 !== 'undefined' && Audio2.buy) Audio2.buy(); } catch (e) {}
      return codigo;
    } catch (e) { return null; }
  },

  /* canjea un código GEAYI-XXXX y entrega el objeto al jugador */
  canjear(codigo) {
    try {
      const crudo = String(codigo || '').trim();
      /* el prefijo es insensible a mayúsculas, pero el base64 SÍ distingue: no usar toUpperCase() */
      if (!/^GEAYI-/i.test(crudo)) return { ok: false, mensaje: '⚠️ Código inválido. Debe empezar con GEAYI-' };
      const json = _b64decode(crudo.slice(6));
      if (!json) return { ok: false, mensaje: '⚠️ Código inválido o dañado.' };
      let obj = null;
      try { obj = JSON.parse(json); } catch (e) { return { ok: false, mensaje: '⚠️ Código inválido o dañado.' }; }
      const tipo = obj && obj.t, id = obj && obj.i;
      if ((tipo !== 'hat' && tipo !== 'trail' && tipo !== 'pet') || !id) return { ok: false, mensaje: '⚠️ Código inválido.' };
      const valido =
        (tipo === 'hat' && typeof HATS !== 'undefined' && HATS.some(d => d.id === id && d.id !== 'none')) ||
        (tipo === 'trail' && typeof TRAILS !== 'undefined' && TRAILS.some(d => d.id === id && d.id !== 'none')) ||
        (tipo === 'pet' && (id === 'dog' || id === 'cat'));
      if (!valido) return { ok: false, mensaje: '⚠️ Ese objeto no existe.' };
      if (typeof SAVE === 'undefined' || !SAVE) return { ok: false, mensaje: '⚠️ Sin guardado.' };
      let ya = false;
      if (tipo === 'hat') {
        if (!Array.isArray(SAVE.ownedHats)) SAVE.ownedHats = ['none'];
        ya = SAVE.ownedHats.indexOf(id) !== -1;
        if (!ya) SAVE.ownedHats.push(id);
      } else if (tipo === 'trail') {
        if (!Array.isArray(SAVE.ownedTrails)) SAVE.ownedTrails = ['none'];
        ya = SAVE.ownedTrails.indexOf(id) !== -1;
        if (!ya) SAVE.ownedTrails.push(id);
      } else {
        ya = SAVE.pet === id;
        if (!ya) SAVE.pet = id;
      }
      if (typeof persist === 'function') persist();
      const nom = tipo === 'hat' ? 'gorra' : tipo === 'trail' ? 'estela' : 'mascota';
      this._stat('recibidos', 1);
      if (ya) return { ok: true, mensaje: '🎁 ¡Ya tenías esa ' + nom + '! Sigue siendo tuya.' };
      this.grantLogro('regalo1');
      _comConfeti();
      try { if (typeof Audio2 !== 'undefined' && Audio2.win) Audio2.win(); } catch (e) {}
      return { ok: true, mensaje: '🎁 ¡Recibiste una ' + nom + '! Mírala en Personalizar.' };
    } catch (e) { return { ok: false, mensaje: '⚠️ No se pudo canjear.' }; }
  },

  /* panel para regalar: elige objeto → elige jugador online o genera código */
  panelRegalo() {
    const items = this.itemsRegalables();
    const { ov, body } = _comOverlay('Regalar objeto', '🎁');
    if (!items.length) {
      const p = document.createElement('p');
      p.style.cssText = 'font-size:16px;';
      p.textContent = 'Aún no tienes gorras, estelas ni mascotas para regalar. ¡Juega y consigue monedas! 🪙';
      body.appendChild(p);
      return;
    }
    const info = document.createElement('p');
    info.style.cssText = 'font-size:14px;color:#ffd23f;';
    info.textContent = 'Elige qué quieres regalar:';
    body.appendChild(info);
    items.forEach(it => {
      const b = _comBotonGrande(it.emoji + ' ' + it.nombre, '#7048e8');
      b.addEventListener('click', () => { ov.remove(); this._elegirDestinoRegalo(it); });
      body.appendChild(b);
    });
    const sep = document.createElement('div');
    sep.style.cssText = 'margin:14px 0 6px;font-weight:bold;color:#ffe95e;';
    sep.textContent = '— o canjea un código —';
    body.appendChild(sep);
    const inp = document.createElement('input');
    inp.placeholder = 'GEAYI-XXXX';
    inp.style.cssText = 'width:100%;min-height:52px;font-size:18px;text-align:center;border-radius:12px;border:2px solid #ffd23f;background:#0f1220;color:#fff;margin-bottom:8px;';
    body.appendChild(inp);
    const bc = _comBotonGrande('🎀 Canjear código', '#0b7285');
    bc.addEventListener('click', () => {
      const r = this.canjear(inp.value);
      _comToast(r.mensaje);
    });
    body.appendChild(bc);
  },

  /* paso 2 del regalo: jugador online seleccionado, o código local */
  _elegirDestinoRegalo(item) {
    const online = (typeof Net !== 'undefined' && Net.active && Net.players && Object.keys(Net.players).length > 0);
    if (!online) {
      const codigo = this.crearCodigoRegalo(item.tipo, item.id);
      if (!codigo) return;
      const { body } = _comOverlay('Tu código de regalo', '🎁');
      const p = document.createElement('p');
      p.textContent = 'Comparte este código. Quien lo canjee recibe: ' + item.emoji + ' ' + item.nombre;
      body.appendChild(p);
      const code = document.createElement('div');
      code.textContent = codigo;
      code.style.cssText = 'font-size:22px;font-weight:bold;letter-spacing:1px;background:#0f1220;border:2px dashed #ffd23f;border-radius:12px;padding:16px 8px;margin:10px 0;word-break:break-all;color:#ffe95e;';
      body.appendChild(code);
      const cp = _comBotonGrande('📋 Copiar código', '#0b7285');
      cp.addEventListener('click', () => {
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(codigo);
          _comToast('📋 ¡Código copiado!');
        } catch (e) { _comToast('📋 Copia el código a mano.'); }
      });
      body.appendChild(cp);
      return;
    }
    const { ov, body } = _comOverlay('¿A quién se lo regalas?', '🎁');
    Object.keys(Net.players).forEach(k => {
      const rp = Net.players[k];
      const b = _comBotonGrande('👤 ' + String(rp.name || 'Jugador').slice(0, 16), '#7048e8');
      b.addEventListener('click', () => { ov.remove(); this.enviarRegalo(k, item); });
      body.appendChild(b);
    });
  },

  /* envía el regalo a un jugador de la sala por broadcast */
  enviarRegalo(playerId, item) {
    try {
      if (typeof Net === 'undefined' || !Net.active || !Net.channel || !Net.me) {
        _comToast('🌐 Entra a una sala online para regalar en vivo.');
        return false;
      }
      const rp = Net.players[playerId];
      if (!rp) { _comToast('⚠️ Ese jugador ya no está.'); return false; }
      Net.channel.send({
        type: 'broadcast', event: 'regalo',
        payload: { de: Net.me.id, nombre: _comNomJugador(), para: playerId, tipo: item.tipo, id: item.id }
      });
      this._stat('regalos', 1);
      this.grantLogro('generoso1');
      if (this._stats().regalos >= 3) this.grantLogro('generoso3');
      if (item.tipo === 'pet') this.grantLogro('mascota');
      _comToast('🎁 ¡Regalo enviado a ' + String(rp.name || 'Jugador').slice(0, 16) + '!');
      return true;
    } catch (e) { _comToast('⚠️ No se pudo enviar el regalo.'); return false; }
  },

  /* recibe un regalo por broadcast (se auto-engancha en Community.tick) */
  _vigilarRegalos() {
    try {
      if (this._regalosHook) return;
      if (typeof Net === 'undefined' || !Net.active || !Net.channel || !Net.me) return;
      this._regalosHook = true;
      const yo = Net.me.id;
      Net.channel.on('broadcast', { event: 'regalo' }, ({ payload }) => {
        try {
          if (!payload || payload.para !== yo) return;
          const r = this.canjear('GEAYI-' + _b64encode(JSON.stringify({ t: payload.tipo, i: payload.id })));
          _comToast('🎁 ¡' + String(payload.nombre || 'Alguien').slice(0, 16) + ' te regaló algo! ' + (r.ok ? r.mensaje : ''));
          _comConfeti();
        } catch (e) {}
      });
    } catch (e) {}
  },

  /* =====================================================================
     e) CONCURSOS DE CONSTRUCCIÓN 🏗️
     Community.concurso: { activo, tema, fin, construcciones: [{nombre, jugador}], votos }
     - iniciarConcurso(tema): 10 minutos de temporizador.
     - registrarConstruccion(nombre): la usa el modo construir (phase3.js).
     - Al terminar: en local vota un jurado de NPCs originales (Juez Lolo,
       Jueza Mimi, Juez Tito); online, además vota cada jugador de la sala.
     - El ganador recibe monedas + logro 'campeon'.
     ===================================================================== */
  concurso: { activo: false, tema: '', fin: 0, construcciones: [], votos: {}, duracion: 10 * 60 * 1000 },

  TEMAS_CONCURSO: [
    '🏰 Castillo de arena', '🍬 Casa de dulces', '🚀 Cohete espacial',
    '🌊 Parque acuático', '🦁 Zoológico GEAYI', '🌮 Taquería voladora',
    '🏝️ Isla tropical', '🎡 Feria de colores', '🐠 Acuario gigante', '🌵 Oasis del desierto'
  ],

  /* jurado original (NPCs inventados para el juego) */
  JURADO: ['Juez Lolo', 'Jueza Mimi', 'Juez Tito'],

  iniciarConcurso(tema) {
    if (this.concurso.activo) { _comToast('🏗️ Ya hay un concurso en curso.'); return false; }
    const t = tema || this.TEMAS_CONCURSO[Math.floor(Math.random() * this.TEMAS_CONCURSO.length)];
    this.concurso = { activo: true, tema: t, fin: Date.now() + this.concurso.duracion, construcciones: [], votos: {} };
    this._stat('concursos', 1);
    _comToast('🏗️ ¡Concurso! Tema: ' + t + ' — ¡tienes 10 minutos!');
    try { if (typeof Audio2 !== 'undefined' && Audio2.power) Audio2.power(); } catch (e) {}
    try { Voz.hablar('¡Nuevo concurso! El tema es: ' + t); } catch (e) {}
    this._chipConcurso();
    return true;
  },

  /* la llama el modo construir cuando el jugador termina su construcción */
  registrarConstruccion(nombre) {
    const n = String(nombre || 'Mi construcción').slice(0, 40) || 'Mi construcción';
    if (!this.concurso.activo) this.iniciarConcurso(); // auto-arranca con tema al azar
    this.concurso.construcciones.push({ nombre: n, jugador: _comNomJugador(), puntos: 0 });
    this._stat('construcciones', 1);
    const s = this._stats();
    this.grantLogro('constructor1');
    if (s.construcciones >= 5) this.grantLogro('constructor5');
    _comToast('🧱 ¡Construcción registrada: ' + n + '!');
    this._chipConcurso();
    return true;
  },

  /* voto local del jugador (una vez por concurso) */
  votarConstruccion(idx) {
    try {
      const c = this.concurso;
      if (!c.activo || !c.construcciones[idx]) { _comToast('⚠️ No hay concurso activo.'); return false; }
      const yo = _comNomJugador();
      if (c.votos[yo] != null) { _comToast('⚠️ Ya votaste en este concurso.'); return false; }
      c.votos[yo] = idx;
      this._stat('votos', 1);
      this.grantLogro('jurado');
      _comToast('🗳️ ¡Voto registrado para "' + c.construcciones[idx].nombre + '"!');
      return true;
    } catch (e) { return false; }
  },

  tiempoRestante() {
    if (!this.concurso.activo) return 0;
    return Math.max(0, this.concurso.fin - Date.now());
  },

  /* chip flotante con el temporizador (se actualiza en concursoTick) */
  _chipConcurso() {
    try {
      let chip = $('com-concurso-chip');
      if (this.concurso.activo && this.concurso.construcciones) {
        if (!chip) {
          chip = document.createElement('div');
          chip.id = 'com-concurso-chip';
          chip.style.cssText = 'position:fixed;top:64px;left:8px;z-index:9980;background:rgba(20,16,0,.85);border:2px solid #ffd23f;border-radius:12px;color:#ffe95e;font-weight:bold;font-size:14px;padding:8px 12px;';
          chip.addEventListener('click', () => this.mostrarConcurso());
          document.body.appendChild(chip);
        }
        const s = Math.ceil(this.tiempoRestante() / 1000);
        const mm = Math.floor(s / 60), ss = String(s % 60).padStart(2, '0');
        chip.textContent = '🏗️ ' + this.concurso.tema + ' · ' + mm + ':' + ss +
          ' · 🧱' + this.concurso.construcciones.length;
      } else if (chip) { chip.remove(); }
    } catch (e) {}
  },

  concursoTick() {
    try {
      if (!this.concurso.activo) return;
      if (Date.now() >= this.concurso.fin) { this.finalizarConcurso(); return; }
      this._chipConcurso();
    } catch (e) {}
  },

  /* cierra el concurso, vota el jurado (+ la sala si hay online) y premia */
  finalizarConcurso() {
    try {
      const c = this.concurso;
      c.activo = false;
      try { const chip = $('com-concurso-chip'); if (chip) chip.remove(); } catch (e) {}
      if (!c.construcciones.length) {
        _comToast('🏗️ El concurso terminó sin construcciones. ¡Será la próxima!');
        return null;
      }
      const yo = _comNomJugador();
      const votantes = this.JURADO.slice();
      /* online: cada jugador de la sala también vota (no hay API de votos, es por presencia) */
      try {
        if (typeof Net !== 'undefined' && Net.active && Net.players) {
          for (const k of Object.keys(Net.players)) {
            const nm = String(Net.players[k].name || 'Jugador').slice(0, 16);
            if (votantes.indexOf(nm) === -1) votantes.push(nm);
          }
        }
      } catch (e) {}
      /* cada votante da 4..10 puntos a cada construcción */
      const puntos = c.construcciones.map(() => 0);
      const detalle = [];
      votantes.forEach(v => {
        c.construcciones.forEach((cons, i) => {
          const p = 4 + Math.floor(Math.random() * 7);
          puntos[i] += p;
          detalle.push({ votante: v, construccion: cons.nombre, puntos: p });
        });
      });
      /* votos del jugador */
      Object.keys(c.votos).forEach(v => {
        const i = c.votos[v];
        if (c.construcciones[i]) puntos[i] += 8;
      });
      let win = 0;
      puntos.forEach((p, i) => { if (p > puntos[win]) win = i; });
      const ganadora = c.construcciones[win];
      const soyYo = ganadora.jugador === yo;
      const ranking = c.construcciones
        .map((cons, i) => ({ nombre: cons.nombre, jugador: cons.jugador, puntos: puntos[i] }))
        .sort((a, b) => b.puntos - a.puntos);
      if (soyYo) {
        _comSumarMonedas(150);
        this.grantLogro('campeon');
        _comConfeti();
        try { Voz.hablar('¡Felicidades! Ganaste el concurso de construcción.'); } catch (e) {}
      }
      this._mostrarResultados(ganadora, ranking, detalle, soyYo);
      this.concurso = { activo: false, tema: '', fin: 0, construcciones: [], votos: {}, duracion: 10 * 60 * 1000 };
      return { ganadora, ranking };
    } catch (e) { return null; }
  },

  _mostrarResultados(ganadora, ranking, detalle, soyYo) {
    const { body } = _comOverlay('Resultados del concurso', '🏆');
    const g = document.createElement('div');
    g.style.cssText = 'font-size:20px;font-weight:bold;color:#ffe95e;margin-bottom:10px;';
    g.textContent = (soyYo ? '🎉 ¡GANASTE! ' : '🏆 Ganó ') + '"' + ganadora.nombre + '" de ' + ganadora.jugador + (soyYo ? ' (+150 🪙)' : '');
    body.appendChild(g);
    ranking.forEach((r, i) => {
      const fila = document.createElement('div');
      fila.style.cssText = 'text-align:left;font-size:15px;margin:6px 0;padding:8px 12px;border-radius:10px;background:' + (i === 0 ? '#3a2c00' : '#22263a') + ';';
      fila.textContent = (i === 0 ? '🥇 ' : i === 1 ? '🥈 ' : i === 2 ? '🥉 ' : (i + 1) + '. ') + r.nombre + ' — ' + r.jugador + ' (' + r.puntos + ' pts)';
      body.appendChild(fila);
    });
    const j = document.createElement('div');
    j.style.cssText = 'margin-top:10px;font-size:13px;color:#aaa;';
    j.textContent = '🗳️ Jurado: ' + this.JURADO.join(', ') + (detalle.length > this.JURADO.length * ranking.length ? ' + jugadores de la sala' : '');
    body.appendChild(j);
  },

  /* panel del concurso: tema, tiempo, construcciones y votación */
  mostrarConcurso() {
    const c = this.concurso;
    const { body } = _comOverlay('Concurso de construcción', '🏗️');
    if (!c.activo) {
      const p = document.createElement('p');
      p.textContent = 'No hay concurso activo. ¡Inicia uno y reta a tu creatividad!';
      body.appendChild(p);
      const b = _comBotonGrande('🏗️ Iniciar concurso (10 min)', '#2f9e44');
      b.addEventListener('click', () => { this.iniciarConcurso(); this.mostrarConcurso(); });
      body.appendChild(b);
      return;
    }
    const s = Math.ceil(this.tiempoRestante() / 1000);
    const info = document.createElement('div');
    info.style.cssText = 'font-size:17px;margin-bottom:10px;';
    info.innerHTML = '';
    info.textContent = 'Tema: ' + c.tema + ' · ⏱️ ' + Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    body.appendChild(info);
    if (!c.construcciones.length) {
      const p = document.createElement('p');
      p.style.cssText = 'color:#aaa;';
      p.textContent = 'Aún no hay construcciones. ¡Construye algo en el modo construir y regístralo!';
      body.appendChild(p);
    }
    c.construcciones.forEach((cons, i) => {
      const fila = document.createElement('div');
      fila.style.cssText = 'display:flex;align-items:center;gap:8px;margin:8px 0;';
      const t = document.createElement('div');
      t.style.cssText = 'flex:1;text-align:left;font-size:16px;';
      t.textContent = '🧱 ' + cons.nombre + ' — ' + cons.jugador;
      fila.appendChild(t);
      const vb = document.createElement('button');
      vb.textContent = '🗳️ Votar';
      vb.style.cssText = 'min-height:52px;padding:10px 18px;font-size:16px;border-radius:12px;border:0;background:#7048e8;color:#fff;font-weight:bold;';
      vb.addEventListener('click', () => { try { if (typeof Audio2 !== 'undefined') Audio2.click(); } catch (e) {} this.votarConstruccion(i); });
      fila.appendChild(vb);
      body.appendChild(fila);
    });
    const hint = document.createElement('div');
    hint.style.cssText = 'margin-top:10px;font-size:13px;color:#aaa;';
    hint.textContent = '💡 Desde el modo construir usa Community.registrarConstruccion("Mi obra") al terminar.';
    body.appendChild(hint);
  },

  /* =====================================================================
     f) MODO HISTORIA 📖 "La familia llega a Immokalee"
     5 capítulos cortos 100% originales con Gerson, Esmeralda, Ian, Yael y
     Audrey (ids de FAMILY, sin cambios). Banners de diálogo con retrato,
     botón "Continuar ➤", objetivos simples con verificación y recompensas.
     Progreso en SAVE.historia = { cap, vistos, done: [] }.
     ===================================================================== */
  HISTORIA: [
    {
      titulo: 'La llegada', emoji: '🛬', recompensa: 20,
      objetivo: 'Lee todos los diálogos del capítulo',
      pista: 'Toca "Continuar ➤" hasta terminar de leer.',
      check() {
        const h = Community.historia;
        return h.vistos >= Community.HISTORIA[0].dialogos.length;
      },
      dialogos: [
        { q: 'gerson', t: '¡Familia! Por fin llegamos a Immokalee. ¡Miren qué bonito está el atardecer!' },
        { q: 'esmeralda', t: '¡Qué emoción! Esta va a ser nuestra nueva casa. Ian, Yael, Audrey… ¿les gusta?' },
        { q: 'ian', t: '¡Sííí! ¡Hay mucho espacio para correr y jugar!' },
        { q: 'yael', t: '¿Y hay parque cerca, mamá? ¡Quiero columpios!' },
        { q: 'audrey', t: '¡Yo quiero ver el lago! Dicen que hay peces de colores.' },
        { q: 'gerson', t: 'Hay de todo: parque, lago y hasta un aeropuerto. ¡Vamos a explorar juntos!' },
      ]
    },
    {
      titulo: 'La casa nueva', emoji: '🏠', recompensa: 30,
      objetivo: 'Recoge 5 monedas para comprar muebles',
      pista: 'Juega cualquier mundo y recoge 5 monedas 🪙.',
      check() {
        const h = Community.historia;
        try { return (typeof SAVE !== 'undefined' && SAVE.coins || 0) >= (h.coinSnap || 0) + 5; }
        catch (e) { return false; }
      },
      dialogos: [
        { q: 'esmeralda', t: 'La casa está linda, pero vacía. Necesitamos muebles y decoración.' },
        { q: 'gerson', t: '¡Tengo una idea! En este mundo hay monedas por todas partes. ¡A recoger!' },
        { q: 'ian', t: '¡Yo vi unas monedas brillantes junto a la plaza!' },
        { q: 'yael', t: '¡Carrera! ¡El que recoja más monedas gana!' },
        { q: 'audrey', t: 'Yo las guardo en mi bolsita. ¡Vamos a decorar la casa más bonita de Immokalee!' },
      ]
    },
    {
      titulo: 'El parque', emoji: '🌳', recompensa: 40,
      objetivo: 'Completa el mundo 1: La Ciudad 🏙️',
      pista: 'Termina el mundo 1 para ganar su trofeo.',
      check() {
        try { return (typeof Trophy !== 'undefined' && Trophy.has('w1')) === true; }
        catch (e) { return false; }
      },
      dialogos: [
        { q: 'yael', t: '¡El parque es ENORME! ¡Hay resbaladillas, columpios y hasta una tirolesa!' },
        { q: 'audrey', t: '¡Mira, Yael! ¡Ese tobogán parece llegar hasta las nubes!' },
        { q: 'ian', t: 'Papá, ¿podemos subir a la montaña rusa del parque?' },
        { q: 'esmeralda', t: 'Claro que sí, pero primero completen el recorrido de la ciudad. ¡Sin caerse!' },
        { q: 'gerson', t: 'Recuerden: despacio y con cuidado. ¡Los campeones no se rinden!' },
      ]
    },
    {
      titulo: 'El lago', emoji: '🎣', recompensa: 50,
      objetivo: 'Visita el mundo 4: Immokalee ☀️',
      pista: 'Entra al mundo 4 (el pueblo del sol).',
      check() {
        try { return (typeof LEVEL !== 'undefined' && LEVEL && LEVEL.idx === 3) === true; }
        catch (e) { return false; }
      },
      dialogos: [
        { q: 'gerson', t: 'Este es el lago Trafford. Dicen que aquí se pescan los peces más grandes.' },
        { q: 'audrey', t: '¡Mira, papá! ¡Hay tortugas nadando junto a los lirios!' },
        { q: 'esmeralda', t: 'Qué paz se siente aquí. Este lugar me recuerda a casa.' },
        { q: 'ian', t: '¿Podemos pescar, papá? ¡Quiero atrapar un pez gigante!' },
        { q: 'yael', t: '¡Yo te ayudo! Traje mi caña de la suerte.' },
      ]
    },
    {
      titulo: 'La fiesta familiar', emoji: '🎉', recompensa: 200,
      objetivo: 'Registra tu construcción "Mi casa familiar" en el concurso',
      pista: 'En el modo construir crea tu casa y usa Community.registrarConstruccion("Mi casa familiar").',
      check() {
        try {
          return Community.concurso.construcciones.concat([]).some(c => /casa familiar/i.test(c.nombre || ''));
        } catch (e) { return false; }
      },
      dialogos: [
        { q: 'esmeralda', t: '¡Ya casi! Nuestra casa quedó hermosa. Es hora de celebrar en familia.' },
        { q: 'gerson', t: 'Propongo un concurso: cada quien construye su casa soñada. ¡La mejor gana!' },
        { q: 'ian', t: '¡La mía va a tener un castillo con tobogán!' },
        { q: 'yael', t: '¡La mía una pista de carros alrededor!' },
        { q: 'audrey', t: '¡Y la mía un jardín lleno de flores y mariposas!' },
        { q: 'gerson', t: '¡Esta familia ya está en casa! ¡Que empiece la fiesta de Immokalee!' },
      ]
    },
  ],

  /* estado de la historia (persistente) */
  historia: { cap: 0, vistos: 0, done: [], coinSnap: 0, leyendo: false },

  _cargarHistoria() {
    try {
      if (typeof SAVE !== 'undefined' && SAVE) {
        if (!SAVE.historia || typeof SAVE.historia !== 'object') SAVE.historia = {};
        const s = SAVE.historia;
        this.historia.cap = s.cap | 0;
        this.historia.vistos = s.vistos | 0;
        this.historia.done = Array.isArray(s.done) ? s.done : [];
        this.historia.coinSnap = s.coinSnap | 0;
      }
    } catch (e) {}
  },
  _guardarHistoria() {
    try {
      if (typeof SAVE !== 'undefined' && SAVE) {
        SAVE.historia = { cap: this.historia.cap, vistos: this.historia.vistos, done: this.historia.done, coinSnap: this.historia.coinSnap };
        if (typeof persist === 'function') persist();
      }
    } catch (e) {}
  },

  /* panel de capítulos (lo abre el botón "📖 HISTORIA" del menú) */
  abrirHistoria() {
    try { if (typeof Audio2 !== 'undefined') { Audio2.init(); Audio2.click(); } } catch (e) {}
    try { document.querySelectorAll('.com-ov').forEach(o => o.remove()); } catch (e) {}
    this._cargarHistoria();
    const { body } = _comOverlay('La familia llega a Immokalee', '📖');
    const intro = document.createElement('p');
    intro.style.cssText = 'font-size:15px;color:#ffd9a0;';
    intro.textContent = 'Acompaña a Gerson, Esmeralda, Ian, Yael y Audrey en su aventura en Immokalee. ¡Completa los 5 capítulos!';
    body.appendChild(intro);
    /* 🎙️ idioma de la voz narradora */
    const filaVoz = document.createElement('div');
    filaVoz.style.cssText = 'margin:6px 0 10px;font-size:15px;color:#fff;';
    const labVoz = document.createElement('span');
    labVoz.textContent = '🎙️ Voz: ';
    labVoz.style.cssText = 'font-weight:bold;margin-right:6px;';
    filaVoz.appendChild(labVoz);
    const opsVoz = [['auto', '🌍 Auto'], ['es', '🇪🇸 ES'], ['en', '🇺🇸 EN'], ['pt', '🇧🇷 PT'], ['fr', '🇫🇷 FR']];
    opsVoz.forEach(([id, txt]) => {
      const ob = document.createElement('button');
      ob.textContent = txt;
      const sel = (Voz.idioma || 'auto') === id;
      ob.style.cssText = 'margin:2px;padding:8px 10px;min-height:44px;font-size:15px;font-weight:bold;border-radius:10px;border:0;cursor:pointer;background:' + (sel ? '#7048e8' : '#3a3f55') + ';color:#fff;';
      ob.addEventListener('click', () => { Voz.setIdioma(id); this.abrirHistoria(); });
      filaVoz.appendChild(ob);
    });
    body.appendChild(filaVoz);
    this.HISTORIA.forEach((cap, i) => {
      const hecho = this.historia.done.indexOf(i) !== -1;
      const actual = i === this.historia.cap && !hecho;
      const b = document.createElement('button');
      b.style.cssText = 'display:block;width:100%;min-height:60px;margin:8px 0;padding:12px;font-size:18px;font-weight:bold;border-radius:14px;border:0;cursor:pointer;background:' +
        (hecho ? '#2f9e44' : actual ? '#7048e8' : '#3a3f55') + ';color:#fff;opacity:' + ((!hecho && !actual) ? '.6' : '1') + ';';
      b.textContent = (hecho ? '✅ ' : actual ? '▶ ' : '🔒 ') + (i + 1) + '. ' + cap.emoji + ' ' + cap.titulo + ' (+' + cap.recompensa + ' 🪙)';
      if (actual || hecho) b.addEventListener('click', () => this.empezarCapitulo(i));
      else b.addEventListener('click', () => _comToast('🔒 Completa el capítulo anterior primero.'));
      body.appendChild(b);
    });
  },

  /* inicia un capítulo: guarda snapshot de monedas y muestra el primer diálogo */
  empezarCapitulo(i) {
    this._cargarHistoria();
    if (i !== this.historia.cap && this.historia.done.indexOf(i) === -1) {
      _comToast('🔒 Completa el capítulo anterior primero.');
      return false;
    }
    this.historia.cap = i;
    this.historia.vistos = 0;
    this.historia.leyendo = true;
    try { this.historia.coinSnap = (typeof SAVE !== 'undefined' && SAVE.coins) || 0; } catch (e) { this.historia.coinSnap = 0; }
    this._guardarHistoria();
    this._mostrarDialogo(i, 0);
    return true;
  },

  /* banner de diálogo: retrato del personaje FAMILY + texto + Continuar ➤ */
  _mostrarDialogo(capIdx, lineaIdx) {
    try {
      const cap = this.HISTORIA[capIdx];
      const lin = cap.dialogos[lineaIdx];
      let fam = null;
      try { if (typeof getFamilyChar === 'function') fam = getFamilyChar(lin.q); } catch (e) {}
      const nombre = fam ? fam.name : lin.q;
      const retrato = fam ? fam.portrait : null;

      let bn = $('com-dialogo');
      if (!bn) {
        bn = document.createElement('div');
        bn.id = 'com-dialogo';
        bn.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:9995;padding:10px;';
        document.body.appendChild(bn);
      }
      bn.innerHTML = '';
      const caja = document.createElement('div');
      caja.style.cssText = 'max-width:640px;margin:0 auto;background:#1c2030;border:3px solid #ffd23f;border-radius:18px;padding:14px;display:flex;gap:12px;align-items:center;position:relative;';
      /* ✖ salir de la historia: también calla la voz */
      const x = document.createElement('button');
      x.textContent = '✖';
      x.title = 'Salir de la historia';
      x.style.cssText = 'position:absolute;top:6px;right:8px;width:44px;height:44px;border-radius:50%;border:0;background:#3a3f55;color:#fff;font-size:18px;font-weight:bold;';
      x.addEventListener('click', () => {
        try { if (typeof Audio2 !== 'undefined') Audio2.click(); } catch (e) {}
        try { Voz.callar(); } catch (e) {}
        try { this.historia.leyendo = false; this._guardarHistoria(); } catch (e) {}
        const d = $('com-dialogo'); if (d) d.remove();
      });
      caja.appendChild(x);
      if (retrato) {
        const img = document.createElement('img');
        img.src = retrato;
        img.alt = nombre;
        img.style.cssText = 'width:84px;height:84px;border-radius:50%;object-fit:cover;border:3px solid #ffd23f;flex:none;background:#333;';
        img.onerror = () => { img.style.display = 'none'; };
        caja.appendChild(img);
      }
      const txt = document.createElement('div');
      txt.style.cssText = 'flex:1;color:#fff;text-align:left;';
      const nm = document.createElement('div');
      nm.style.cssText = 'font-weight:bold;color:#ffe95e;font-size:17px;margin-bottom:4px;';
      nm.textContent = nombre;
      txt.appendChild(nm);
      const tx = document.createElement('div');
      tx.style.cssText = 'font-size:16px;line-height:1.45;';
      tx.textContent = lin.t;
      txt.appendChild(tx);
      caja.appendChild(txt);
      bn.appendChild(caja);

      const btn = document.createElement('button');
      btn.textContent = (lineaIdx < cap.dialogos.length - 1) ? 'Continuar ➤' : '¡A la misión! ➤';
      btn.style.cssText = 'display:block;max-width:640px;width:100%;margin:8px auto 0;min-height:60px;font-size:20px;font-weight:bold;border-radius:16px;border:0;background:#2f9e44;color:#fff;';
      btn.addEventListener('click', () => {
        try { if (typeof Audio2 !== 'undefined') Audio2.click(); } catch (e) {}
        this.historia.vistos = lineaIdx + 1;
        this._guardarHistoria();
        if (lineaIdx < cap.dialogos.length - 1) {
          this._mostrarDialogo(capIdx, lineaIdx + 1);
        } else {
          const d = $('com-dialogo'); if (d) d.remove();
          this.historia.leyendo = false;
          this._guardarHistoria();
          this._mostrarObjetivo(capIdx);
        }
      });
      bn.appendChild(btn);
      /* narración por voz (solo tras interacción del usuario, ver Voz) */
      try { Voz.narrarHistoria(nombre + ': ' + lin.t); } catch (e) {}
      return true;
    } catch (e) { return false; }
  },

  /* banner del objetivo del capítulo con botón de verificación */
  _mostrarObjetivo(capIdx) {
    const cap = this.HISTORIA[capIdx];
    const { ov, body } = _comOverlay('Misión del capítulo ' + (capIdx + 1), '🎯');
    const t = document.createElement('div');
    t.style.cssText = 'font-size:19px;font-weight:bold;margin-bottom:8px;';
    t.textContent = cap.emoji + ' ' + cap.titulo;
    body.appendChild(t);
    const o = document.createElement('div');
    o.style.cssText = 'font-size:17px;background:#22263a;border-radius:12px;padding:14px;margin-bottom:8px;';
    o.textContent = '🎯 Objetivo: ' + cap.objetivo;
    body.appendChild(o);
    const p = document.createElement('div');
    p.style.cssText = 'font-size:14px;color:#aaa;margin-bottom:10px;';
    p.textContent = '💡 ' + cap.pista + ' Recompensa: +' + cap.recompensa + ' 🪙';
    body.appendChild(p);
    const b = _comBotonGrande('✓ ¡Ya lo hice! Revisar', '#2f9e44');
    b.addEventListener('click', () => {
      let ok = false;
      try { ok = cap.check() === true; } catch (e) { ok = false; }
      if (ok) { ov.remove(); this.completarCapitulo(capIdx); }
      else _comToast('⏳ Aún no… ' + cap.pista);
    });
    body.appendChild(b);
  },

  /* completa el capítulo: recompensa, logro y avance */
  completarCapitulo(i) {
    try {
      this._cargarHistoria();
      if (this.historia.done.indexOf(i) !== -1) return false;
      const cap = this.HISTORIA[i];
      this.historia.done.push(i);
      if (i === 0) this.grantLogro('capitulo1');
      _comSumarMonedas(cap.recompensa || 0);
      _comConfeti();
      try { if (typeof Audio2 !== 'undefined' && Audio2.win) Audio2.win(); } catch (e) {}
      _comToast('📖 ¡Capítulo ' + (i + 1) + ' completo! +' + (cap.recompensa || 0) + ' 🪙');
      try { Voz.hablar('¡Capítulo completado! ' + cap.titulo); } catch (e) {}
      if (i < this.HISTORIA.length - 1) {
        this.historia.cap = i + 1;
        this.historia.vistos = 0;
      } else {
        /* final de la historia */
        this.grantLogro('historia');
        _comSumarMonedas(0);
        try { Voz.hablar('¡Felicidades! La familia está reunida en Immokalee. ¡Eres increíble!'); } catch (e) {}
        const { body } = _comOverlay('¡Historia completa!', '👨‍👩‍👧‍👦');
        const f = document.createElement('div');
        f.style.cssText = 'font-size:18px;margin-bottom:10px;';
        f.textContent = 'Gerson, Esmeralda, Ian, Yael y Audrey ya están en casa. ¡Gracias por acompañarlos! 🏡💛';
        body.appendChild(f);
      }
      this._guardarHistoria();
      return true;
    } catch (e) { return false; }
  },

  /* se llama desde Community.tick: auto-completa si el objetivo ya se cumplió */
  historiaTick() {
    try {
      if (this.historia.leyendo) return;
      this._cargarHistoria();
      const i = this.historia.cap;
      if (i < 0 || i >= this.HISTORIA.length) return;
      if (this.historia.done.indexOf(i) !== -1) return;
      if (this.historia.vistos <= 0 && i > 0) return; // aún no empezó este capítulo
      let ok = false;
      try { ok = this.HISTORIA[i].check() === true; } catch (e) {}
      if (ok) this.completarCapitulo(i);
    } catch (e) {}
  },

  /* =====================================================================
     ARRANQUE E INTEGRACIÓN
     ===================================================================== */
  /* botón flotante 🔊/🔇 de la voz en el HUD */
  _refrescarBotonVoz() {
    try {
      const b = $('com-voz-btn');
      if (b) b.textContent = Voz.on ? '🔊' : '🔇';
    } catch (e) {}
  },
  _crearBotonVoz() {
    try {
      if ($('com-voz-btn')) return;
      const b = document.createElement('button');
      b.id = 'com-voz-btn';
      b.className = 'hud-btn';
      b.textContent = Voz.on ? '🔊' : '🔇';
      b.title = 'Voz narradora';
      b.addEventListener('click', () => Voz.toggle());
      // en la fila del HUD, junto a los demás botones (no flotando encima)
      let host = null;
      try { host = document.querySelector('.hud-right'); } catch (e) {}
      if (host && host.appendChild) host.appendChild(b);
      else {
        b.style.cssText = 'position:fixed;top:8px;right:64px;z-index:9970;width:52px;height:52px;font-size:24px;border-radius:50%;border:2px solid #ffd23f;background:rgba(20,20,30,.8);color:#fff;';
        document.body.appendChild(b);
      }
    } catch (e) {}
  },

  /* conecta botones del menú si existen (los agrega el orquestador en index.html) */
  _conectarBotones() {
    const mapa = {
      'btn-historia': () => this.abrirHistoria(),
      'btn-regalar': () => this.panelRegalo(),
      'btn-concurso': () => this.mostrarConcurso(),
      'btn-logros': () => this.panelLogros(),
      'btn-frases': () => this.panelFrases(),
      'btn-fantasma': () => this.modoFantasma(!this.fantasmasOn),
    };
    Object.keys(mapa).forEach(id => {
      try {
        const el = $(id);
        if (el && !el._comConectado) {
          el._comConectado = true;
          el.addEventListener('click', () => { try { if (typeof Audio2 !== 'undefined') { Audio2.init(); Audio2.click(); } } catch (e) {} mapa[id](); });
        }
      } catch (e) {}
    });
  },

  /* init(): lo llama el boot del juego. NO toca el DOM al cargar el script. */
  init() {
    try { Voz.init(); } catch (e) {}
    this._cargarHistoria();
    try { this._crearBotonVoz(); } catch (e) {}
    try { this._conectarBotones(); } catch (e) {}
    return true;
  },

  /* tick(dt): lo llama el loop principal cuando MODE==='play'.
     Mueve fantasmas, revisa el temporizador del concurso, auto-completa
     objetivos de historia y engancha el listener de regalos online. */
  tick(dt) {
    try {
      this.fantasmaTick(dt || 0.016);
      this.concursoTick();
      this.historiaTick();
      this._vigilarRegalos();
      /* re-etiquetar salas si el lobby se redibujó */
      if (typeof Net !== 'undefined' && Net.lobby && !this._salasEtiquetadas) {
        if (this.etiquetarSalas()) this._salasEtiquetadas = true;
      }
    } catch (e) {}
  },
};

/* Voz queda como global independiente (la usa Community y el HUD) */
if (typeof window !== 'undefined' && typeof window.Voz === 'undefined') { try { window.Voz = Voz; } catch (e) {} }
