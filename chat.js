/* ============================================================
   💬 CHAT Y AMIGOS + 🧳 VISITAR LOTES MODELO (GEAYI — Obby Xtreme 3D)
   ------------------------------------------------------------
   - Chat dentro del juego: panel DOM creado 100% por JS (este
     archivo NO toca DOM al cargar; todo se crea en init()).
     Historial local en SAVE.chatlog (últimos 50) + persist().
   - Online: si Supabase está configurado (online.js: Net activo +
     isOnlineConfigured()), el mensaje se envía al canal de la sala
     (chat real). Si NO hay online → modo offline SIEMPRE funcional:
     mensajes del jugador + respuestas automáticas de vecinos NPC
     con frases amables originales y consejos del juego. Cero red.
   - Amigos: SAVE.friends = [{name, code}]; agregar por nombre/código,
     quitar, todo persistido. (online.js no trae API de amigos; la
     lista local se usa en ambos modos.)
   - Visitar lotes: 3 lotes modelo (showcase) preconstruidos con
     bloques originales en Ciudad Neón (zonas verificadas libres con
     réplica exacta del LCG de buildNeonCity — ver coordenadas abajo).
     El botón "🧳 Visitar" (pestaña Amigos) viaja al mundo si hace
     falta y teletransporta con Player.pos.set(...).
   Todo 100% original GEAYI. Sin red obligatoria. Todo con try/catch.
   ============================================================
   INTEGRACIÓN (la hace el coordinador; este archivo no toca DOM al cargar):
   1. En index.html, entre lots.js y game.js:
        <script src="chat.js"></script>
   2. En boot() de game.js, junto a onlineInit():
        if (typeof ChatFriends !== 'undefined') ChatFriends.init();
   3. En startLevel() de game.js, junto a LotSystem.buildForLevel:
        if (typeof ChatFriends !== 'undefined') ChatFriends.buildShowcaseForLevel(i, LEVEL.group);
   4. CSS opcional: si se quiere en styles.css en vez del <style> que
      inyecta chat.js por JS, copiar el bloque CF_CSS de _injectCSS().
   ============================================================ */
'use strict';

/* ---------------- zonas verificadas libres (Ciudad Neón, mundo idx 0) -----
   Réplica exacta del orden de llamadas a _ncRnd(20260913) en buildNeonCity
   (neoncity.js): edificios + tiendas rotadas (huella 6×12) + farolas +
   checkpoints. Los 3 rectángulos 16×14 quedan libres con ≥2 m de margen
   de edificios y ≥3 m de tiendas. Bloques con lotes del usuario
   (150,90) y (-150,90) excluidos. groundY 0.22 = altura de la acera. */
const CF_SHOWCASES = [
  { id: 'casa-sol',    name: '🏠 Casa Sol',     desc: 'Casa demo con techo de teja',  worldIdx: 0, x: -132, z: 131, w: 16, d: 14, groundY: 0.22 },
  { id: 'jardin-neon', name: '🌻 Jardín Neón',  desc: 'Jardín demo con fuente',       worldIdx: 0, x: 38,   z: -90, w: 16, d: 14, groundY: 0.22 },
  { id: 'torre-demo',  name: '🗼 Torre Demo',   desc: 'Mirador demo de 2 pisos',      worldIdx: 0, x: 132,  z: 131, w: 16, d: 14, groundY: 0.22 },
];

/* vecinos NPC (nombres y frases 100% inventados, nada copiado) */
const CF_NPCS = ['Tino', 'Meche', 'Don Chalo', 'Lupita'];
const CF_NPC_LINES = [
  '¡Hola, vecino! 👋 ¿Ya visitaste los lotes modelo en la pestaña 👥?',
  'Tip: en la Tienda GEAYI puedes ponerte sombrero, chaqueta, botas y bufanda a la vez. 🧥',
  'Si compras un lote, el botón 🧱 te deja construir tu casa ahí mismo. ¡Como en Bloxburg!',
  'Tip: el segundo dedo gira la cámara mientras caminas con el joystick. 📱',
  '¿Ya probaste el paracaídas? Salta desde lo alto y cae despacio. 🪂',
  'Las monedas 🪙 sirven para comida, ropa y lotes. ¡Explora que hay bono +50 por mundo nuevo!',
  'Tip: los carros lujosos están en la avenida. El botón 🟢 es acelerar. 🏎️',
  'Puedes pescar en el lago de Immokalee. ¡Suerte con la pesca! 🎣',
  'Si entras a una tienda, toca los productos con el dedo para agarrarlos. 🖐️',
  'Tip: tu mascota te sigue a todas partes. ¡Cuídala! 🐾',
  'En el modo construir puedes hacer tus propios niveles con bloques. 🧱',
  '¡Bienvenido a GEAYI! Aquí se juega sin prisa: explora, construye y vive en tu ciudad. 🌍',
];

const _cfMats = {};
function _cfMat(key, make) {
  if (!_cfMats[key]) { try { _cfMats[key] = make(); } catch (e) { _cfMats[key] = null; } }
  return _cfMats[key];
}

const ChatFriends = {
  SHOWCASES: CF_SHOWCASES,
  _inited: false,
  _ui: null,          // {btn, panel, msgs, input, fName, fCode, fList, visits, tabChat, tabFriends, badge}
  _npcTO: 0,
  _npcIdx: 0,

  /* ---------------- persistencia ---------------- */
  ensureSave() {
    try {
      if (typeof SAVE === 'undefined' || !SAVE) return false;
      if (!Array.isArray(SAVE.chatlog)) SAVE.chatlog = [];
      if (!Array.isArray(SAVE.friends)) SAVE.friends = [];
      return true;
    } catch (e) { return false; }
  },
  _persist() { try { if (typeof persist === 'function') persist(); } catch (e) {} },
  _toast(msg) { try { if (typeof toast === 'function') toast(msg); } catch (e) {} },

  myName() {
    try { if (typeof displayName === 'function') { const n = displayName(); if (n) return String(n).slice(0, 16); } } catch (e) {}
    return 'Jugador';
  },
  isOnline() {
    try {
      return typeof Net !== 'undefined' && !!Net && !!Net.active && !!Net.channel &&
        typeof isOnlineConfigured === 'function' && isOnlineConfigured();
    } catch (e) { return false; }
  },

  /* ---------------- chat ---------------- */
  send(text) {
    try {
      text = String(text == null ? '' : text).trim().slice(0, 120);
      if (!text || !this.ensureSave()) return false;
      // 🛡️ SafeWords: filtro anti-grooming, siempre activo (sin apagador en la UI)
      try {
        if (typeof SafeWords !== 'undefined' && SafeWords) {
          if (SafeWords.isMuted()) {
            // 📢 si el silencio ACABA de iniciar: aviso GRANDE con el PORQUÉ
            try {
              if (typeof SafeWords.muteJustStarted === 'function' && SafeWords.muteJustStarted() &&
                  typeof SafeWords.showMuteAlert === 'function' && SafeWords.showMuteAlert()) {
                return false;
              }
            } catch (e) {}
            // 🆘 pista: si el bloqueo es leve, puede apelarse desde AYUDA
            var _swm = '🔇 Silenciado por seguridad: podrás escribir de nuevo en 5 minutos.';
            try {
              if (SafeWords.appealableReason(SafeWords.lastReason()))
                _swm += ' Si crees que fue un error, toca 🆘 AYUDA en el menú para apelar.';
              else
                _swm += ' Toca 🆘 AYUDA en el menú si necesitas ayuda.';
            } catch (e) {}
            this._toast(_swm);
            return false;
          }
          var _swc = SafeWords.check(text);
          if (!_swc.ok) {
            SafeWords.noteBlocked();
            if (SafeWords.isCritical(_swc.reason)) SafeWords.showBigAlert(); // 🚨 alerta grande
            else SafeWords.showBlocked(_swc.reason, text); // 🛡️ el niño ve POR QUÉ no se envió
            return false;
          }
        }
      } catch (e) {}
      const msg = { name: this.myName(), text: text, mine: true, t: Date.now() };
      SAVE.chatlog.push(msg);
      while (SAVE.chatlog.length > 50) SAVE.chatlog.shift(); // máx 50
      this._persist();
      this._renderLine(msg);
      if (this.isOnline()) {
        // 💬 chat real por el canal Supabase de la sala (igual que online.js, con guards)
        try {
          const now = Date.now();
          if ((now - (Net.lastChat || 0)) >= 1000) {
            Net.lastChat = now;
            Net.channel.send({
              type: 'broadcast', event: 'chat',
              payload: { id: (Net.me && Net.me.id) || 'yo', name: this.myName(), text: text }
            });
          }
        } catch (e) {}
      } else {
        this._npcReply(); // modo offline: un vecino responde (sin red)
      }
      return true;
    } catch (e) { return false; }
  },
  history() {
    try { return this.ensureSave() ? SAVE.chatlog.slice() : []; } catch (e) { return []; }
  },
  clearHistory() {
    try {
      if (!this.ensureSave()) return false;
      SAVE.chatlog = []; this._persist(); this._renderAll();
      return true;
    } catch (e) { return false; }
  },

  /* respuesta automática offline: se programa con setTimeout; _npcSay() es
     el cuerpo (llamable directo en tests porque el stub de setTimeout no corre). */
  _npcReply() {
    try {
      if (typeof setTimeout === 'undefined') return;
      try { if (this._npcTO) clearTimeout(this._npcTO); } catch (e) {}
      const ms = 1200 + Math.floor(Math.random() * 1300);
      const self = this;
      this._npcTO = setTimeout(() => { try { self._npcSay(); } catch (e) {} }, ms);
    } catch (e) {}
  },
  _npcSay() {
    try {
      if (!this.ensureSave()) return false;
      const name = CF_NPCS[this._npcIdx % CF_NPCS.length];
      const line = CF_NPC_LINES[this._npcIdx % CF_NPC_LINES.length];
      this._npcIdx++;
      const msg = { name: name, text: line, mine: false, t: Date.now() };
      SAVE.chatlog.push(msg);
      while (SAVE.chatlog.length > 50) SAVE.chatlog.shift();
      this._persist();
      this._renderLine(msg);
      return true;
    } catch (e) { return false; }
  },

  /* ---------------- amigos ---------------- */
  friends() {
    try { return this.ensureSave() ? SAVE.friends.map(f => ({ name: f.name, code: f.code })) : []; }
    catch (e) { return []; }
  },
  _genCode() {
    try {
      const abc = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
      let s = 'GEAYI-';
      for (let i = 0; i < 4; i++) s += abc[(Math.random() * abc.length) | 0];
      return s;
    } catch (e) { return 'GEAYI-0000'; }
  },
  addFriend(name, code) {
    try {
      if (!this.ensureSave()) return false;
      name = String(name == null ? '' : name).trim().slice(0, 16);
      if (!name) return false;
      const low = name.toLowerCase();
      for (const f of SAVE.friends) if (String(f.name).toLowerCase() === low) return false; // sin duplicados
      code = String(code == null || code === '' ? this._genCode() : code).trim().slice(0, 24);
      SAVE.friends.push({ name: name, code: code });
      this._persist();
      this._renderFriends();
      return true;
    } catch (e) { return false; }
  },
  removeFriend(nameOrCode) {
    try {
      if (!this.ensureSave()) return false;
      const key = String(nameOrCode == null ? '' : nameOrCode).trim().toLowerCase();
      if (!key) return false;
      const before = SAVE.friends.length;
      SAVE.friends = SAVE.friends.filter(f =>
        String(f.name).toLowerCase() !== key && String(f.code).toLowerCase() !== key);
      if (SAVE.friends.length === before) return false;
      this._persist();
      this._renderFriends();
      return true;
    } catch (e) { return false; }
  },

  /* ---------------- visitar lotes modelo ---------------- */
  showcaseById(id) {
    try {
      for (const s of CF_SHOWCASES) if (s.id === id) return s;
      return null;
    } catch (e) { return null; }
  },
  visitShowcase(id) {
    try {
      const sh = this.showcaseById(id);
      if (!sh) return false;
      // viajar al mundo del showcase si no estamos ahí (startLevel es sincrónico)
      if (typeof startLevel === 'function' &&
          (typeof LEVEL === 'undefined' || !LEVEL || LEVEL.idx !== sh.worldIdx)) {
        startLevel(sh.worldIdx);
      }
      // teletransportar al jugador (Player.pos.set)
      if (typeof Player !== 'undefined' && Player && Player.pos && typeof Player.pos.set === 'function') {
        Player.pos.set(sh.x, (sh.groundY || 0) + 0.6, sh.z);
      } else return false;
      this._toast('🧳 ' + sh.name + ' · ' + sh.desc);
      if (this._ui && this._ui.panel) { try { this._ui.panel.classList.add('hidden'); } catch (e2) {} }
      return true;
    } catch (e) { return false; }
  },

  /* ---------------- construcción de los showcases (mundo 0) ---------------- */
  buildShowcaseForLevel(i, group) {
    if (i !== 0) return;
    try {
      if (typeof THREE === 'undefined') return;
      const g0 = (group && group.group) ? group.group : group;
      if (!g0 || typeof g0.add !== 'function') return;
      for (const sh of CF_SHOWCASES) {
        try {
          if (sh.id === 'casa-sol') this._buildCasaSol(g0, sh);
          else if (sh.id === 'jardin-neon') this._buildJardinNeon(g0, sh);
          else if (sh.id === 'torre-demo') this._buildTorreDemo(g0, sh);
        } catch (e) {}
      }
    } catch (e) {}
  },
  _solid(x, z, topY, w, d, tag) { // colisionador estilo lots.js
    try {
      if (typeof LEVEL !== 'undefined' && LEVEL && Array.isArray(LEVEL.platforms)) {
        LEVEL.platforms.push({ x: x, z: z, topY: topY, w: w, h: 2, d: d, kind: 'wall', solid: true, lotTag: tag });
      }
    } catch (e) {}
  },
  _box(parent, x, y, z, w, h, d, color, emissive) {
    try {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({ color: color, roughness: 0.75, emissive: emissive || 0x000000, emissiveIntensity: 0.25 }));
      m.position.set(x, y, z);
      parent.add(m);
      return m;
    } catch (e) { return null; }
  },
  _sign(group, x, y, z, line1, line2, fg) {
    // letrero original con canvas; si no hay canvasTex, plano de color
    try {
      let tex = null;
      if (typeof canvasTex === 'function') {
        tex = canvasTex(512, 200, (c, w, h) => {
          c.fillStyle = '#0a0e1a'; c.fillRect(0, 0, w, h);
          c.strokeStyle = fg; c.lineWidth = 12; c.strokeRect(8, 8, w - 16, h - 16);
          c.textAlign = 'center'; c.fillStyle = fg;
          c.font = '900 58px "Trecho MS", "Trebuchet MS", sans-serif';
          c.fillText(line1, w / 2, 88);
          c.fillStyle = '#ffffff'; c.font = '700 40px "Trecho MS", "Trebuchet MS", sans-serif';
          c.fillText(line2, w / 2, 152);
        });
      }
      const mat = tex ? new THREE.MeshBasicMaterial({ map: tex })
                      : new THREE.MeshBasicMaterial({ color: 0x0a0e1a });
      const s = new THREE.Mesh(new THREE.PlaneGeometry(7, 2.7), mat);
      s.position.set(x, y, z); group.add(s);
      const back = s.clone(); back.rotation.y = Math.PI; back.position.z = z - 0.06; group.add(back);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, y, 8),
        new THREE.MeshStandardMaterial({ color: 0x8a8f9a, roughness: 0.6 }));
      pole.position.set(x, y / 2, z - 0.1); group.add(pole);
    } catch (e) {}
  },
  _buildCasaSol(group, sh) {
    const g = new THREE.Group(); g.userData.showcaseId = sh.id;
    const gy = sh.groundY || 0, cx = sh.x, cz = sh.z;
    const tag = 'showcase:' + sh.id;
    // plataforma del lote
    this._box(g, cx, gy + 0.1, cz, 14, 0.4, 12, 0x2c3145, 0x0c1226);
    // casa: cuerpo + techo piramidal de teja + puerta + ventanas + chimenea
    this._box(g, cx, gy + 1.7, cz, 8, 3, 7, 0xffd98a);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(6.4, 2.6, 4),
      new THREE.MeshStandardMaterial({ color: 0xc65a1e, roughness: 0.8 }));
    try { roof.position.set(cx, gy + 4.5, cz); roof.rotation.y = Math.PI / 4; g.add(roof); } catch (e) {}
    this._box(g, cx, gy + 1.35, cz + 3.56, 1.6, 2.7, 0.1, 0x7a4a26);          // puerta
    this._box(g, cx - 2.4, gy + 1.9, cz + 3.56, 1.5, 1.2, 0.1, 0x9fd8ff);      // ventanas
    this._box(g, cx + 2.4, gy + 1.9, cz + 3.56, 1.5, 1.2, 0.1, 0x9fd8ff);
    this._box(g, cx + 2.2, gy + 4.4, cz - 1.2, 0.9, 2.2, 0.9, 0x6b4a35);       // chimenea
    this._box(g, cx - 5.2, gy + 0.8, cz + 3.4, 1.2, 1.2, 1.2, 0x3fae4e);       // arbusto
    this._sign(g, cx, gy + 3.4, cz - 8.2, '🏠 CASA SOL', 'lote modelo · GEAYI', '#ffe95e');
    this._solid(cx, cz, gy + 3.2, 8.6, 7.6, tag); // la casa es sólida
    g.position.set(0, 0, 0);
    group.add(g);
  },
  _buildJardinNeon(group, sh) {
    const g = new THREE.Group(); g.userData.showcaseId = sh.id;
    const gy = sh.groundY || 0, cx = sh.x, cz = sh.z;
    const tag = 'showcase:' + sh.id;
    this._box(g, cx, gy + 0.1, cz, 14, 0.4, 12, 0x2c3145, 0x0c1226); // plataforma
    // fuente pequeña original
    const stone = _cfMat('stone', () => new THREE.MeshStandardMaterial({ color: 0x3a4a6b, roughness: 0.7 }));
    try {
      if (stone) {
        const base = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.5, 1, 14), stone);
        base.position.set(cx, gy + 0.9, cz); g.add(base);
        const water = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 0.3, 14),
          new THREE.MeshBasicMaterial({ color: 0x00e5ff }));
        water.position.set(cx, gy + 1.4, cz); g.add(water);
        const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.3, 1.6, 8),
          new THREE.MeshBasicMaterial({ color: 0xbff6ff, transparent: true, opacity: 0.85 }));
        jet.position.set(cx, gy + 2.2, cz); g.add(jet);
      }
    } catch (e) {}
    this._solid(cx, cz, gy + 1.6, 5, 5, tag); // fuente sólida
    // 3 jardineras circulares con flores de colores
    const cols = [0xff2fd6, 0xffe95e, 0x00e5ff];
    [[-4.4, -3.2], [4.4, -3.2], [0, 4]].forEach(([ox, oz], i) => {
      try {
        const bed = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 0.7, 12),
          new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.9 }));
        bed.position.set(cx + ox, gy + 0.75, cz + oz); g.add(bed);
        const fl = new THREE.Mesh(new THREE.SphereGeometry(1.15, 10, 8),
          new THREE.MeshStandardMaterial({ color: cols[i % 3], roughness: 0.6, emissive: cols[i % 3], emissiveIntensity: 0.35 }));
        fl.position.set(cx + ox, gy + 1.25, cz + oz); fl.scale.y = 0.55; g.add(fl);
      } catch (e) {}
    });
    // bancas + farolitos
    this._box(g, cx - 4.4, gy + 0.65, cz + 3.6, 2.4, 0.25, 0.9, 0x6b4a35);
    this._box(g, cx + 4.4, gy + 0.65, cz + 3.6, 2.4, 0.25, 0.9, 0x6b4a35);
    [[-6, -5], [6, -5]].forEach(([ox, oz]) => {
      this._box(g, cx + ox, gy + 1.5, cz + oz, 0.22, 3, 0.22, 0x2b2f3a);
      this._box(g, cx + ox, gy + 3.1, cz + oz, 0.7, 0.5, 0.7, 0xffe95e, 0xffe95e);
    });
    this._sign(g, cx, gy + 3.4, cz - 8.2, '🌻 JARDÍN NEÓN', 'lote modelo · GEAYI', '#7bff9e');
    group.add(g);
  },
  _buildTorreDemo(group, sh) {
    const g = new THREE.Group(); g.userData.showcaseId = sh.id;
    const gy = sh.groundY || 0, cx = sh.x, cz = sh.z;
    const tag = 'showcase:' + sh.id;
    this._box(g, cx, gy + 0.1, cz, 14, 0.4, 12, 0x2c3145, 0x0c1226); // plataforma
    // torre baja de 2 pisos con rampa (todo a nivel, sin caídas)
    this._box(g, cx, gy + 0.9, cz, 6, 1.4, 6, 0x3949ab, 0x00e5ff);       // piso 1
    this._solid(cx, cz, gy + 1.6, 6, 6, tag);
    this._box(g, cx, gy + 2.3, cz - 0.8, 4, 1.4, 4, 0x5c6bc0, 0x7b2fff); // piso 2
    this._solid(cx, cz - 0.8, gy + 3.0, 4, 4, tag);
    try { // rampa de subida (caja rotada, original)
      const ramp = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.3, 5.2),
        new THREE.MeshStandardMaterial({ color: 0x8a8f9a, roughness: 0.8 }));
      ramp.position.set(cx - 4, gy + 0.9, cz + 1.5); ramp.rotation.x = -0.28; g.add(ramp);
    } catch (e) {}
    // barandal del mirador + baliza
    const railM = _cfMat('rail', () => new THREE.MeshBasicMaterial({ color: 0x00e5ff }));
    if (railM) {
      [[0, -2.7, 4, 0.15], [0, 1.1, 4, 0.15], [-1.9, -0.8, 0.15, 3.8], [1.9, -0.8, 0.15, 3.8]].forEach(([ox, oz, w, d]) => {
        try {
          const r = new THREE.Mesh(new THREE.BoxGeometry(w, 0.8, d), railM);
          r.position.set(cx + ox, gy + 3.4, cz + oz); g.add(r);
        } catch (e) {}
      });
    }
    this._box(g, cx, gy + 3.9, cz - 0.8, 0.5, 0.8, 0.5, 0xff2fd6, 0xff2fd6); // baliza
    this._sign(g, cx, gy + 3.4, cz - 8.2, '🗼 TORRE DEMO', 'lote modelo · GEAYI', '#00e5ff');
    group.add(g);
  },

  /* ---------------- UI (todo creado por JS, nada al cargar) ---------------- */
  init() {
    if (this._inited) return true;
    try {
      if (typeof document === 'undefined') return false;
      this.ensureSave();
      this._injectCSS();
      this._buildBtn();
      this._buildPanel();
      this._inited = true;
      return true;
    } catch (e) { return false; }
  },
  _injectCSS() {
    try {
      if (this._cssDone) return;
      this._cssDone = true;
      const st = document.createElement('style');
      st.id = 'cf-style';
      st.textContent = [
        '#cf-panel{position:fixed;right:10px;bottom:76px;width:min(340px,88vw);max-height:62vh;z-index:26;',
        'background:rgba(8,6,24,.96);border:2px solid #7b2fff;border-radius:14px;color:#fff;',
        'display:flex;flex-direction:column;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,.5)}',
        '#cf-panel.hidden{display:none}',
        '.cf-head{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;',
        'background:linear-gradient(180deg,#2a1a5e,#160f38);font-weight:900}',
        '.cf-head button{background:none;border:none;color:#fff;font-size:16px;cursor:pointer}',
        '.cf-tabs{display:flex;gap:6px;padding:8px 10px 0}',
        '.cf-tabs button{flex:1;padding:8px 4px;border-radius:10px 10px 0 0;border:none;cursor:pointer;',
        'background:#1c1440;color:#cfc6ff;font-weight:800;font-size:14px}',
        '.cf-tabs button.on{background:#7b2fff;color:#fff}',
        '.cf-body{padding:10px;overflow-y:auto;min-height:120px}',
        '#cf-msgs{display:flex;flex-direction:column;gap:6px;max-height:220px;overflow-y:auto;margin-bottom:8px}',
        '.cf-line{background:#1c1440;border-radius:10px;padding:6px 10px;font-size:14px;max-width:92%}',
        '.cf-line.mine{align-self:flex-end;background:#0f4d2e}',
        '.cf-line.sys{align-self:center;background:none;color:#9fd8ff;font-size:12px}',
        '.cf-line b{color:#ffe95e}.cf-line.mine b{color:#7bff9e}',
        '.cf-row{display:flex;gap:6px}',
        '#cf-input{flex:1;font-size:15px;padding:10px;border-radius:10px;border:2px solid #3949ab;background:#0a0e1a;color:#fff}',
        '#cf-send{font-size:18px;background:linear-gradient(180deg,#00e676,#00b248);border:none;border-radius:10px;',
        'padding:0 14px;cursor:pointer}',
        '.cf-friend{display:flex;align-items:center;gap:8px;background:#1c1440;border-radius:10px;',
        'padding:8px 10px;margin-bottom:6px;font-size:14px}',
        '.cf-friend .nm{flex:1;font-weight:800}.cf-friend .cd{color:#9fd8ff;font-size:12px}',
        '.cf-friend button{background:#5e1a1a;border:none;color:#fff;border-radius:8px;padding:6px 10px;cursor:pointer}',
        '.cf-visit{background:#141b33;border:1px solid #00e5ff;border-radius:12px;padding:10px;margin:8px 0}',
        '.cf-visit .t{font-weight:900;font-size:15px}.cf-visit .d{color:#bfe9ff;font-size:13px;margin:2px 0 8px}',
        '.cf-visit button{width:100%;padding:10px;border:none;border-radius:10px;cursor:pointer;font-weight:900;font-size:15px;',
        'background:linear-gradient(180deg,#00e5ff,#0090b8);color:#04222b}',
        '.cf-sec{font-weight:900;color:#ffe95e;margin:10px 0 6px;font-size:14px}',
        '.cf-mode{font-size:12px;color:#9fd8ff;padding:0 10px 8px}',
      ].join('\n');
      const host = document.head || document.body || document.documentElement;
      if (host && host.appendChild) host.appendChild(st);
    } catch (e) {}
  },
  _el(tag, cls, html) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (html != null) el.textContent = html;
    return el;
  },
  _clearEl(el) { // innerHTML='' no vacía children en los stubs de test (ahí children es un array)
    try {
      if (!el) return;
      try { el.innerHTML = ''; } catch (e) {}
      if (Array.isArray(el.children)) el.children.length = 0;
    } catch (e) {}
  },
  _buildBtn() {
    try {
      if (this._ui && this._ui.btn) return; // idempotente (getElementById en tests siempre devuelve algo)
      const b = this._el('button', 'hud-btn', '💬');
      b.id = 'cf-chat-btn';
      b.title = 'Chat y amigos';
      b.setAttribute('aria-label', 'Chat y amigos');
      const self = this;
      b.addEventListener('click', () => { try { self.toggle(); } catch (e) {} });
      // junto a los demás botones del HUD (hereda .hud-btn de styles.css)
      let host = null;
      try { host = document.querySelector('.hud-right'); } catch (e) {}
      if (host && host.appendChild) host.appendChild(b);
      else if (document.body && document.body.appendChild) {
        b.style.cssText = 'position:fixed;right:12px;bottom:120px;z-index:26;';
        document.body.appendChild(b);
      }
      this._ui = this._ui || {};
      this._ui.btn = b;
    } catch (e) {}
  },
  _buildPanel() {
    try {
      if (this._ui && this._ui.panel) return; // idempotente
      const self = this;
      const p = this._el('div', null, null);
      p.id = 'cf-panel';
      p.classList.add('hidden');
      // encabezado
      const head = this._el('div', 'cf-head', null);
      const title = this._el('span', null, '💬 Chat y Amigos');
      const x = this._el('button', null, '✖');
      x.addEventListener('click', () => self.toggle());
      head.appendChild(title); head.appendChild(x); p.appendChild(head);
      // pestañas
      const tabs = this._el('div', 'cf-tabs', null);
      const bChat = this._el('button', 'on', '💬 Chat');
      const bFr = this._el('button', null, '👥 Amigos');
      bChat.addEventListener('click', () => self.openTab('chat'));
      bFr.addEventListener('click', () => self.openTab('friends'));
      tabs.appendChild(bChat); tabs.appendChild(bFr); p.appendChild(tabs);
      // cuerpo chat
      const bodyChat = this._el('div', 'cf-body', null);
      bodyChat.id = 'cf-tab-chat';
      const msgs = this._el('div', null, null); msgs.id = 'cf-msgs';
      const row = this._el('div', 'cf-row', null);
      const inp = this._el('input', null, null); inp.id = 'cf-input';
      inp.setAttribute('maxlength', '120');
      inp.setAttribute('placeholder', 'Escribe un mensaje…');
      inp.setAttribute('autocomplete', 'off');
      inp.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); self._doSend(); }
        try { e.stopPropagation(); } catch (e2) {}
      });
      const send = this._el('button', null, '➤'); send.id = 'cf-send';
      send.title = 'Enviar';
      send.addEventListener('click', () => self._doSend());
      row.appendChild(inp); row.appendChild(send);
      bodyChat.appendChild(msgs); bodyChat.appendChild(row);
      p.appendChild(bodyChat);
      // cuerpo amigos (+ visitar)
      const bodyFr = this._el('div', 'cf-body', null);
      bodyFr.id = 'cf-tab-friends';
      bodyFr.classList.add('hidden');
      const sec1 = this._el('div', 'cf-sec', '👥 Mis amigos');
      const fRow = this._el('div', 'cf-row', null);
      const fName = this._el('input', null, null); fName.id = 'cf-fname';
      fName.setAttribute('placeholder', 'Nombre'); fName.setAttribute('maxlength', '16');
      const fCode = this._el('input', null, null); fCode.id = 'cf-fcode';
      fCode.setAttribute('placeholder', 'Código (opcional)'); fCode.setAttribute('maxlength', '24');
      const fAdd = this._el('button', null, '➕'); fAdd.id = 'cf-fadd'; fAdd.title = 'Agregar amigo';
      fAdd.addEventListener('click', () => {
        const ok = self.addFriend(fName.value, fCode.value);
        self._toast(ok ? '👥 ¡Amigo agregado!' : '⚠️ Revisa el nombre (1-16 caracteres, sin duplicar).');
        if (ok) { fName.value = ''; fCode.value = ''; }
      });
      fRow.appendChild(fName); fRow.appendChild(fCode); fRow.appendChild(fAdd);
      const fList = this._el('div', null, null); fList.id = 'cf-flist';
      fList.style.marginTop = '8px';
      const sec2 = this._el('div', 'cf-sec', '🧳 Lotes modelo para visitar');
      const visits = this._el('div', null, null); visits.id = 'cf-visits';
      bodyFr.appendChild(sec1); bodyFr.appendChild(fRow); bodyFr.appendChild(fList);
      bodyFr.appendChild(sec2); bodyFr.appendChild(visits);
      p.appendChild(bodyFr);
      // modo (online/offline)
      const mode = this._el('div', 'cf-mode', null); mode.id = 'cf-mode';
      p.appendChild(mode);
      document.body.appendChild(p);
      this._ui = this._ui || {};
      Object.assign(this._ui, {
        panel: p, msgs: msgs, input: inp, fName: fName, fCode: fCode, fList: fList,
        visits: visits, tabChat: bodyChat, tabFriends: bodyFr, tabBtnChat: bChat, tabBtnFr: bFr, mode: mode,
      });
      this._renderAll();
    } catch (e) {}
  },
  _doSend() {
    try {
      const inp = this._ui && this._ui.input;
      if (!inp) return;
      const t = inp.value;
      if (this.send(t)) inp.value = '';
    } catch (e) {}
  },
  toggle() {
    try {
      if (!this._inited) this.init();
      const p = this._ui && this._ui.panel;
      if (!p) return false;
      p.classList.toggle('hidden');
      const hidden = p.classList.contains('hidden');
      if (!hidden) {
        this._renderAll();
        const inp = this._ui.input;
        if (inp) setTimeout(() => { try { inp.focus(); } catch (e) {} }, 80);
      }
      return !hidden;
    } catch (e) { return false; }
  },
  openTab(which) {
    try {
      const u = this._ui;
      if (!u) return;
      const chat = which !== 'friends';
      u.tabChat.classList.toggle('hidden', !chat);
      u.tabFriends.classList.toggle('hidden', chat);
      u.tabBtnChat.classList.toggle('on', chat);
      u.tabBtnFr.classList.toggle('on', !chat);
      if (!chat) this._renderFriends();
    } catch (e) {}
  },
  _renderLine(msg) {
    try {
      const box = this._ui && this._ui.msgs;
      if (!box || typeof document === 'undefined') return;
      const d = document.createElement('div');
      d.className = 'cf-line' + (msg.mine ? ' mine' : '');
      const b = document.createElement('b');
      b.textContent = msg.name + ': ';
      const s = document.createElement('span');
      // 🛡️ SafeWords: censurar al mostrar (mensajes recibidos de otros jugadores)
      try {
        if (typeof SafeWords !== 'undefined' && SafeWords && !msg.mine) {
          var _swr = SafeWords.check(msg.text);
          if (!_swr.ok) {
            if (SafeWords.isCritical(_swr.reason)) SafeWords.showBigAlert(); // 🚨 alerta grande
            else if (_swr.reason === 'encuentro' && SafeWords.isRisky())
              this._toast('⚠️ Esta persona ya te pidió tus datos antes. No le respondas y avísale a un adulto.');
          }
        }
        s.textContent = (typeof SafeWords !== 'undefined' && SafeWords)
          ? SafeWords.censor(msg.text) : msg.text;
      } catch (e) { s.textContent = msg.text; }
      d.appendChild(b); d.appendChild(s);
      box.appendChild(d);
      while (box.children.length > 50) box.removeChild(box.children[0]); // children[0]: también funciona en stubs de test
      box.scrollTop = box.scrollHeight;
    } catch (e) {}
  },
  _renderAll() {
    try {
      const u = this._ui;
      if (!u) return;
      if (u.msgs) this._clearEl(u.msgs);
      const hist = this.history();
      for (const m of hist) this._renderLine(m);
      if (!hist.length && u.msgs) {
        const d = document.createElement('div');
        d.className = 'cf-line sys';
        d.textContent = this.isOnline()
          ? '🌐 Estás en una sala: tu mensaje también llega al chat de la sala.'
          : '📴 Modo offline: chatea aquí y los vecinos te responden. ¡Sin internet!';
        u.msgs.appendChild(d);
      }
      this._renderFriends();
      if (u.mode) u.mode.textContent = this.isOnline() ? '🟢 Online (Supabase)' : '📴 Offline · historial local';
    } catch (e) {}
  },
  _renderFriends() {
    try {
      const u = this._ui;
      if (!u || !u.fList) return;
      this._clearEl(u.fList);
      const list = this.friends();
      const self = this;
      if (!list.length) {
        const d = document.createElement('div');
        d.className = 'cf-line sys';
        d.textContent = 'Aún no tienes amigos. Agrégalos con su nombre o código GEAYI.';
        u.fList.appendChild(d);
      }
      for (const f of list) {
        const row = document.createElement('div');
        row.className = 'cf-friend';
        const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = '👤 ' + f.name;
        const cd = document.createElement('span'); cd.className = 'cd'; cd.textContent = f.code || '';
        const del = document.createElement('button'); del.textContent = '❌'; del.title = 'Quitar amigo';
        del.addEventListener('click', () => {
          if (self.removeFriend(f.name)) self._toast('👋 Amigo eliminado.');
        });
        row.appendChild(nm); row.appendChild(cd); row.appendChild(del);
        u.fList.appendChild(row);
      }
      // tarjetas de visita a lotes modelo
      if (u.visits) {
        this._clearEl(u.visits);
        for (const sh of CF_SHOWCASES) {
          const card = document.createElement('div');
          card.className = 'cf-visit';
          const t = document.createElement('div'); t.className = 't'; t.textContent = sh.name;
          const d = document.createElement('div'); d.className = 'd';
          d.textContent = sh.desc + ' · Ciudad Neón';
          const b = document.createElement('button'); b.textContent = '🧳 Visitar';
          b.addEventListener('click', () => self.visitShowcase(sh.id));
          card.appendChild(t); card.appendChild(d); card.appendChild(b);
          u.visits.appendChild(card);
        }
      }
    } catch (e) {}
  },
};

/* sin export: global por <script> (patrón del proyecto) */
