/* ============================================================
   💰 ECONOMÍA GEAYI — negocios propios, banco y misiones diarias
   (GEAYI — Obby Xtreme 3D · 100% diseño original)
   ------------------------------------------------------------
   Tres globales independientes:

   1. BizSim — negocios comprables con ingreso pasivo:
      🧋 Puesto de bebidas (800🪙) · 🍔 Restaurante (2000🪙) ·
      🏪 Mini-súper (3500🪙). Locales físicos en Ciudad Neón
      (idx 0) e Immokalee (idx 3). Compra por proximidad con
      Shop2.spendCoins; el letrero cambia a "MI NEGOCIO".
      Cada negocio genera monedas con el tiempo JUGADO
      (2/4/6 🪙 por minuto); el jugador las RECOGE acercándose
      (botón "💰 Recoger"). Tope de 500🪙 por negocio.
      Persistencia: SAVE.biz["idx:id"]={bought,pending,collects}.

   2. Bank — 🏦 BANCO GEAYI (local físico en Ciudad Neón) +
      panel DOM. Depositar/retirar; interés 5% diario sobre el
      saldo por fecha real (tope 200🪙/día).
      Persistencia: SAVE.bank={balance,lastInterest}.

   3. DailyQuests — 3 misiones rotativas al día (semilla por
      fecha). Progreso pasivo en update(dt) solo leyendo
      SAVE/Player (no toca otros archivos). Botón flotante 📋
      creado por JS; panel DOM con "🎁 Reclamar" (30-100🪙).
      Persistencia: SAVE.quests={date,list:[...]}.

   Integración (la hace el coordinador; este archivo NO toca
   DOM al cargar y NO añade luces ni red):
   1. <script src="economy.js"></script> en index.html
      (después de monetiza.js y lots.js, antes de game.js).
   2. En startLevel(), junto a los demás buildForLevel:
        if (typeof BizSim !== 'undefined') BizSim.buildForLevel(i, LEVEL.group);
        if (typeof Bank !== 'undefined') Bank.buildForLevel(i, LEVEL.group);
   3. En el loop de game.js, dentro de la rama MODE==='play':
        if (typeof BizSim !== 'undefined') BizSim.update(dt);
        if (typeof Bank !== 'undefined') Bank.update(dt);
        if (typeof DailyQuests !== 'undefined') DailyQuests.update(dt);
   Todo 100% original GEAYI. Sin saltos. Mundo abierto.
   ============================================================ */
'use strict';

/* ---------------- utilidades compartidas ---------------- */
function _ecoToday() {
  try {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  } catch (e) { return '1970-01-01'; }
}
function _ecoVisitedCount() {
  try { return Object.keys((typeof SAVE !== 'undefined' && SAVE.visited) || {}).length; }
  catch (e) { return 0; }
}
function _ecoToast(msg) { try { if (typeof toast === 'function') toast(msg); } catch (e) {} }
function _ecoBanner(t, s) {
  try { if (typeof showBanner === 'function') showBanner(t, s); }
  catch (e) { _ecoToast(t); }
}
function _ecoSpend(n) { // como lots.js: Shop2 si existe, si no SAVE.coins con guards
  try {
    if (typeof Shop2 !== 'undefined' && Shop2 && typeof Shop2.spendCoins === 'function')
      return !!Shop2.spendCoins(n);
    if (typeof SAVE !== 'undefined' && (SAVE.coins || 0) >= n) {
      SAVE.coins -= n; try { persist(); } catch (e) {} return true;
    }
  } catch (e) {}
  return false;
}
function _ecoEarn(n) {
  try {
    if (typeof Shop2 !== 'undefined' && Shop2 && typeof Shop2.addCoins === 'function') {
      Shop2.addCoins(n); return;
    }
    if (typeof SAVE !== 'undefined') { SAVE.coins = (SAVE.coins || 0) + n; try { persist(); } catch (e) {} }
  } catch (e) {}
}
/* CSS propio inyectado (patrón promos.js): no toca styles.css */
function _ecoCSS() {
  try {
    if (typeof document === 'undefined' || document.getElementById('eco-css')) return;
    const st = document.createElement('style');
    st.id = 'eco-css';
    st.textContent =
      '.eco-float{position:fixed;z-index:9500;width:64px;height:64px;border-radius:50%;' +
      'border:3px solid #ffd23f;background:#141a36ee;color:#fff;font-size:26px;cursor:pointer;' +
      'display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px #000a}' +
      '.eco-float:active{transform:scale(.94)}' +
      '.eco-float .eco-sub{position:absolute;bottom:-6px;right:-6px;background:#ffd23f;color:#201100;' +
      'font-size:11px;font-weight:bold;border-radius:10px;padding:2px 7px}' +
      '.eco-ov{position:fixed;inset:0;z-index:9995;display:flex;align-items:center;justify-content:center;' +
      'background:rgba(5,1,15,.85);padding:12px}' +
      '.eco-card{background:#141a36;border:2px solid #ffd23f;border-radius:18px;max-width:420px;width:100%;' +
      'max-height:92vh;display:flex;flex-direction:column;color:#fff;box-shadow:0 0 30px #ffd23f55}' +
      '.eco-head{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid #3949ab}' +
      '.eco-head h2{margin:0;font-size:19px;flex:1}' +
      '.eco-x{background:#2b2f4a;border:none;color:#fff;border-radius:10px;font-size:18px;' +
      'width:40px;height:40px;cursor:pointer}' +
      '.eco-body{padding:12px;overflow-y:auto}' +
      '.eco-row{background:#1a2040;border:2px solid #3949ab;border-radius:14px;padding:10px;margin-bottom:10px}' +
      '.eco-btn{border:none;border-radius:12px;padding:12px 10px;font-size:15px;font-weight:bold;cursor:pointer;' +
      'min-height:52px;flex:1;color:#fff;background:linear-gradient(135deg,#00a2ff,#7b2fff)}' +
      '.eco-btn:active{transform:scale(.96)}' +
      '.eco-btn.gold{background:linear-gradient(135deg,#ffb300,#ff7a00);color:#201100}' +
      '.eco-btn.green{background:linear-gradient(135deg,#00c853,#009624)}' +
      '.eco-btn.gray{background:#2b2f4a;color:#aab}' +
      '.eco-btnrow{display:flex;gap:8px;margin:6px 0}' +
      '.eco-bar{height:10px;background:#0a0e24;border-radius:6px;overflow:hidden;margin:6px 0}' +
      '.eco-bar>div{height:100%;background:linear-gradient(90deg,#ffd23f,#ff9d00)}' +
      '.eco-big{font-size:26px;font-weight:bold;color:#ffd23f;text-align:center;margin:6px 0}' +
      '.eco-note{font-size:13px;color:#aab;text-align:center;margin:4px 0}';
    document.head.appendChild(st);
  } catch (e) {}
}
function _ecoOverlay(title) { // overlay + tarjeta, devuelve {ov, body, close}
  const ov = document.createElement('div');
  ov.className = 'eco-ov';
  ov.innerHTML = '<div class="eco-card"><div class="eco-head"><h2>' + title +
    '</h2><button class="eco-x" aria-label="Cerrar">✕</button></div><div class="eco-body"></div></div>';
  const body = ov.querySelector('.eco-body');
  const close = () => { try { ov.remove(); } catch (e) { if (ov.parentNode) ov.parentNode.removeChild(ov); } };
  ov.querySelector('.eco-x').addEventListener('click', close);
  ov.addEventListener('click', (e) => { if (e.target === ov) close(); });
  document.body.appendChild(ov);
  return { ov, body, close };
}

/* ============================================================
   1. BizSim — NEGOCIOS PROPIOS
   ------------------------------------------------------------
   Coordenadas elegidas (verificadas contra world.js/neoncity.js):
   - Immokalee idx 3, acera este de buildCityBase: franja x∈[3.5,8.5]
     (acera a x=±6, ancho 5, y=0.18). Bloques z: [48,67] y [73,92].
     · 🧋 (6, 50): vecinos este: farola (8.9,62)→12u, checkpoint
       (5,62)→12u, bote (8.8,36)→14u, banca (6.8,30)→20u. Kiosco
       4.5×4.5 → x∈[3.75,8.25] cabe en la franja.
     · 🍔 (6, 78): vecinos este: farola (8.9,86)→8u, bote (8.8,100)
       →22u. Kiosco 5×5 → x∈[3.5,8.5] justo en la franja.
   - Ciudad Neón idx 0, franjas libres junto a la avenida principal
     (avenida x∈[-4,4], tráfico en x=±2.2, farolas en x=±6.5;
     STREETS en ±30/±90/±150; manzanas (30,30): x,z∈[4,56], etc).
     · 🏪 (12, 60): x∈[9,15], z∈[57,63]. Libre de manzanas
       (z≤56 y z≥64), de farolas (x=±6.5) y del tráfico (±2.2).
       Tiendas neón más cercanas en (8,30): z∈[27,33] → 24u.
     · 🏦 banco (-12, -60): x∈[-15.5,-8.5], z∈[-63,-57]. Libre de
       manzana (-30,-30) [z≥-56], manzana (-30,-90) [z≤-64] y de
       tiendas en (-8,-30) [z∈[-33,-27]].
   Todo dentro del núcleo de 220 m (InfiniteStreets no los toca).
   ============================================================ */
const BIZ_CAP = 500; // tope de monedas acumuladas por negocio
const BIZ_DEFS = {
  3: [ // 🌴 Immokalee
    { id: 'biz-drinks', name: 'PUESTO DE BEBIDAS', emoji: '🧋', x: 6, z: 50, price: 800,  rate: 2, w: 4.5, d: 4.5, gy: 0.18, color: '#00e5ff' },
    { id: 'biz-resto',  name: 'RESTAURANTE GEAYI', emoji: '🍔', x: 6, z: 78, price: 2000, rate: 4, w: 5,   d: 5,   gy: 0.18, color: '#ff9d00' },
  ],
  0: [ // 🌃 Ciudad Neón
    { id: 'biz-market', name: 'MINI-SÚPER GEAYI',  emoji: '🏪', x: 12, z: 60, price: 3500, rate: 6, w: 6,   d: 6,   gy: 0,    color: '#59d867' },
  ],
};
const BANK_DEF = { id: 'bank-geayi', name: 'BANCO GEAYI', emoji: '🏦', x: -12, z: -60, w: 7, d: 6, gy: 0, color: '#7b2fff' };

const _ecoMats = {};
function _ecoMat(key, make) {
  if (!_ecoMats[key] && typeof THREE !== 'undefined') { try { _ecoMats[key] = make(); } catch (e) {} }
  return _ecoMats[key];
}

const BizSim = {
  DEFS: BIZ_DEFS,
  _signs: {},          // "worldIdx:bizId" -> {group, def}
  _btnState: 'off',
  _pending: null,      // {kind:'buy'|'collect'|'bank', worldIdx, def}
  _btn: null,

  /* ---------------- persistencia ---------------- */
  ensureSave() {
    try {
      if (typeof SAVE === 'undefined') return false;
      if (!SAVE.biz || typeof SAVE.biz !== 'object') SAVE.biz = {};
      return true;
    } catch (e) { return false; }
  },
  defsFor(idx) { return (typeof BIZ_DEFS !== 'undefined' && BIZ_DEFS[idx]) || []; },
  _key(worldIdx, bizId) { return worldIdx + ':' + bizId; },
  _defOf(worldIdx, bizId) {
    const ds = this.defsFor(worldIdx);
    for (const d of ds) if (d.id === bizId) return d;
    return null;
  },
  isOwned(worldIdx, bizId) {
    try { this.ensureSave(); const r = SAVE.biz[this._key(worldIdx, bizId)]; return !!(r && r.bought); }
    catch (e) { return false; }
  },
  getSave(worldIdx, bizId) {
    try { this.ensureSave(); return SAVE.biz[this._key(worldIdx, bizId)] || null; }
    catch (e) { return null; }
  },
  pendingOf(worldIdx, bizId) {
    const r = this.getSave(worldIdx, bizId);
    return (r && typeof r.pending === 'number') ? r.pending : 0;
  },
  totalCollects() { // para la misión diaria "recoge ganancias"
    try {
      this.ensureSave();
      let n = 0;
      for (const k in SAVE.biz) if (SAVE.biz[k] && typeof SAVE.biz[k].collects === 'number') n += SAVE.biz[k].collects;
      return n;
    } catch (e) { return 0; }
  },

  /* ---------------- compra ---------------- */
  buyBiz(worldIdx, def) {
    try {
      if (!def || !this.ensureSave()) return false;
      const k = this._key(worldIdx, def.id);
      if (SAVE.biz[k] && SAVE.biz[k].bought) { _ecoToast(def.emoji + ' Ya es tu negocio'); return false; }
      if (!_ecoSpend(def.price)) { _ecoToast('🪙 Te faltan monedas (' + def.price + ' 🪙)'); return false; }
      SAVE.biz[k] = { bought: true, pending: 0, collects: 0, name: def.name };
      try { persist(); } catch (e) {}
      this._refreshSign(worldIdx, def.id);
      _ecoBanner(def.emoji + ' ¡MI NEGOCIO!', (def.name || '') + ' · genera ' + def.rate + ' 🪙/min · recoge tus ganancias aquí');
      return true;
    } catch (e) { return false; }
  },

  /* ---------------- ingreso pasivo + recoger ---------------- */
  _accrue(worldIdx, def, dt) { // suma rate*dt/60 con tope; devuelve pending
    try {
      const k = this._key(worldIdx, def.id);
      const r = SAVE.biz[k];
      if (!r || !r.bought) return 0;
      r.pending = Math.min(BIZ_CAP, (r.pending || 0) + def.rate * (dt / 60));
      return r.pending;
    } catch (e) { return 0; }
  },
  collect(worldIdx, def) {
    try {
      if (!def || !this.ensureSave()) return 0;
      const k = this._key(worldIdx, def.id);
      const r = SAVE.biz[k];
      if (!r || !r.bought) return 0;
      const n = Math.floor(r.pending || 0);
      if (n <= 0) { _ecoToast('💰 Aún no hay ganancias · vuelve en un rato'); return 0; }
      r.pending = 0;
      r.collects = (r.collects || 0) + 1;
      try { persist(); } catch (e) {}
      _ecoEarn(n);
      _ecoToast('💰 +' + n + ' 🪙 de ' + (def.name || 'tu negocio'));
      return n;
    } catch (e) { return 0; }
  },

  /* ---------------- visual del mundo ---------------- */
  _signTex(def, owned) {
    if (typeof canvasTex !== 'function') return null;
    try {
      return canvasTex(512, 256, (c, w, h) => {
        c.fillStyle = owned ? '#0f3a1e' : '#10243f'; c.fillRect(0, 0, w, h);
        c.strokeStyle = owned ? '#59d867' : '#ffd23f'; c.lineWidth = 14; c.strokeRect(10, 10, w - 20, h - 20);
        c.textAlign = 'center';
        c.fillStyle = def.color || '#ffffff';
        c.font = '900 52px "Trebuchet MS", sans-serif';
        c.fillText(def.emoji + ' ' + def.name, w / 2, 84);
        c.fillStyle = '#ffffff';
        if (owned) {
          c.font = '900 62px "Trebuchet MS", sans-serif';
          c.fillText('MI NEGOCIO', w / 2, 190);
        } else {
          c.font = '900 62px "Trebuchet MS", sans-serif';
          c.fillText('SE VENDE', w / 2, 170);
          c.font = '900 54px "Trebuchet MS", sans-serif';
          c.fillStyle = '#ffd23f';
          c.fillText(def.price + ' 🪙', w / 2, 228);
        }
      });
    } catch (e) { return null; }
  },
  _buildShop(i, group, def) {
    const owned = this.isOwned(i, def.id);
    const g = new THREE.Group();
    const gy = def.gy || 0, w = def.w, d = def.d;
    const bodyM = _ecoMat('biz-body-' + def.color, () =>
      new THREE.MeshStandardMaterial({ color: 0xf2ede2, roughness: 0.8 }));
    const trimM = _ecoMat('biz-trim-' + def.color, () =>
      new THREE.MeshStandardMaterial({ color: new THREE.Color(def.color), roughness: 0.5, emissive: new THREE.Color(def.color), emissiveIntensity: 0.35 }));
    const roofM = _ecoMat('biz-roof', () => new THREE.MeshStandardMaterial({ color: 0x3a3f4a, roughness: 0.9 }));
    if (bodyM) {
      const body = new THREE.Mesh(new THREE.BoxGeometry(w, 3, d), bodyM);
      body.position.set(0, gy + 1.5, 0); g.add(body);
    }
    if (trimM) { // toldo + marco de puerta en el color del negocio
      const awn = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 0.18, 1.4), trimM);
      awn.position.set(0, gy + 2.7, d / 2 + 0.6); awn.rotation.x = 0.18; g.add(awn);
      const door = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.1, 0.12), trimM);
      door.position.set(0, gy + 1.05, d / 2 + 0.02); g.add(door);
    }
    if (roofM) {
      const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.25, d + 0.6), roofM);
      roof.position.set(0, gy + 3.1, 0); g.add(roof);
    }
    try {
      const tex = this._signTex(def, owned);
      if (tex && typeof doubleFaceSign === 'function') {
        const s = doubleFaceSign(Math.min(w + 1, 7), 2.2, tex, 0, gy + 4.6, 0, 0);
        g.add(s);
      }
    } catch (e) {}
    g.position.set(def.x, 0, def.z);
    group.add(g);
    this._signs[i + ':' + def.id] = { group: g, def: def };
  },
  _refreshSign(worldIdx, bizId) {
    try {
      const key = worldIdx + ':' + bizId;
      const rec = this._signs[key];
      const def = this._defOf(worldIdx, bizId);
      if (!rec || !def || !rec.group.parent) return;
      const parent = rec.group.parent;
      parent.remove(rec.group);
      this._buildShop(worldIdx, parent, def);
    } catch (e) {}
  },
  buildForLevel(i, lvlOrGroup) {
    this._signs = {};
    try {
      if (typeof THREE === 'undefined') return;
      const group = (lvlOrGroup && lvlOrGroup.group) ? lvlOrGroup.group : lvlOrGroup;
      if (!group || typeof group.add !== 'function') return;
      this.defsFor(i).forEach(def => { try { this._buildShop(i, group, def); } catch (e) {} });
    } catch (e) {}
  },

  /* ---------------- botón de proximidad (creado por JS) ---------------- */
  _ensureBtn() {
    try {
      if (this._btn || typeof document === 'undefined') return;
      _ecoCSS();
      const b = document.createElement('button');
      b.id = 'eco-act';
      b.className = 'eco-float';
      b.style.right = '12px'; b.style.bottom = '150px';
      b.setAttribute('aria-label', 'Negocio');
      b.addEventListener('click', () => this.onActionClick());
      document.body.appendChild(b);
      this._btn = b;
    } catch (e) {}
  },
  onActionClick() {
    try {
      const p = this._pending;
      if (!p) return;
      try { if (typeof Audio2 !== 'undefined' && Audio2.click) Audio2.click(); } catch (e) {}
      if (p.kind === 'buy') this.buyBiz(p.worldIdx, p.def);
      else if (p.kind === 'collect') this.collect(p.worldIdx, p.def);
      else if (p.kind === 'bank' && typeof Bank !== 'undefined' && Bank.open) Bank.open();
    } catch (e) {}
  },
  _nearest() { // {kind, worldIdx, def, label} o null
    try {
      if (typeof MODE !== 'undefined' && MODE !== 'play') return null;
      if (typeof Player === 'undefined' || !Player || !Player.pos) return null;
      if (typeof LEVEL === 'undefined' || !LEVEL || LEVEL.idx == null) return null;
      if (typeof Vehicle !== 'undefined' && Vehicle && Vehicle.mode && Vehicle.mode !== 'none') return null;
      const i = LEVEL.idx;
      let best = null, bd = Infinity;
      const consider = (kind, def, label) => {
        const dx = Player.pos.x - def.x, dz = Player.pos.z - def.z;
        const d2 = dx * dx + dz * dz;
        if (d2 < 49 && d2 < bd) { bd = d2; best = { kind, worldIdx: i, def, label }; } // radio 7u
      };
      for (const def of this.defsFor(i)) {
        if (this.isOwned(i, def.id)) {
          if (Math.floor(this.pendingOf(i, def.id)) >= 1)
            consider('collect', def, '💰 Recoger');
          else
            consider('collect', def, def.emoji + ' Mi negocio');
        } else {
          consider('buy', def, def.emoji + ' ' + def.price + '🪙');
        }
      }
      if (typeof Bank !== 'undefined' && Bank && typeof Bank.defFor === 'function') {
        const bdef = Bank.defFor(i);
        if (bdef) consider('bank', bdef, '🏦 Banco');
      }
      return best;
    } catch (e) { return null; }
  },
  update(dt) {
    try { this._ensureBtn(); } catch (e) {}
    try { // ingreso pasivo con el tiempo jugado
      if (typeof LEVEL !== 'undefined' && LEVEL && LEVEL.idx != null && typeof MODE !== 'undefined' && MODE === 'play') {
        const i = LEVEL.idx;
        let dirty = false;
        for (const def of this.defsFor(i)) {
          if (this.isOwned(i, def.id)) {
            const before = this.pendingOf(i, def.id);
            const after = this._accrue(i, def, dt || 0);
            if (after !== before) dirty = true;
          }
        }
        if (dirty) { try { persist(); } catch (e) {} }
      }
    } catch (e) {}
    let show = null;
    try { show = this._nearest(); } catch (e) {}
    try {
      const b = this._btn;
      if (!b) return;
      const st = show ? show.kind + ':' + show.def.id : 'none';
      if (st !== this._btnState) {
        this._btnState = st;
        this._pending = show;
        if (show) {
          b.style.display = 'flex';
          b.innerHTML = show.label +
            (show.kind === 'collect' ? '<span class="eco-sub">+' + Math.floor(this.pendingOf(show.worldIdx, show.def.id)) + '</span>' : '');
        } else b.style.display = 'none';
      } else if (show && show.kind === 'collect') {
        // actualiza el contador sin parpadear el botón
        const sub = b.querySelector('.eco-sub');
        const txt = '+' + Math.floor(this.pendingOf(show.worldIdx, show.def.id));
        if (sub) sub.textContent = txt;
        this._pending = show;
      } else if (show) this._pending = show;
    } catch (e) {}
  },
};

/* ============================================================
   2. Bank — BANCO GEAYI
   Interés 5% diario por fecha real, tope 200🪙/día.
   SAVE.bank = {balance, lastInterest}.
   ============================================================ */
const BANK_RATE = 0.05, BANK_CAP_DAY = 200;
const Bank = {
  ensureSave() {
    try {
      if (typeof SAVE === 'undefined') return false;
      if (!SAVE.bank || typeof SAVE.bank !== 'object') SAVE.bank = { balance: 0, lastInterest: null };
      if (typeof SAVE.bank.balance !== 'number') SAVE.bank.balance = 0;
      return true;
    } catch (e) { return false; }
  },
  defFor(idx) { return (typeof BANK_DEF !== 'undefined' && idx === 0) ? BANK_DEF : null; }, // solo Ciudad Neón
  balance() { try { this.ensureSave(); return SAVE.bank.balance || 0; } catch (e) { return 0; } },

  /* interés por días reales transcurridos (compuesto, con tope diario) */
  applyInterest() {
    try {
      if (!this.ensureSave()) return 0;
      const today = _ecoToday();
      if (SAVE.bank.lastInterest === today) return 0;
      if (!SAVE.bank.lastInterest) { SAVE.bank.lastInterest = today; try { persist(); } catch (e) {} return 0; }
      let days = 1;
      try {
        const ms = Date.parse(today) - Date.parse(SAVE.bank.lastInterest);
        days = Math.max(1, Math.min(30, Math.round(ms / 86400000)));
      } catch (e) { days = 1; }
      let gained = 0;
      for (let d = 0; d < days; d++) {
        const i = Math.min(BANK_CAP_DAY, Math.floor(SAVE.bank.balance * BANK_RATE));
        if (i <= 0) break;
        SAVE.bank.balance += i; gained += i;
      }
      SAVE.bank.lastInterest = today;
      try { persist(); } catch (e) {}
      if (gained > 0) _ecoToast('🏦 Intereses: +' + gained + ' 🪙');
      return gained;
    } catch (e) { return 0; }
  },

  deposit(n) {
    try {
      if (!this.ensureSave() || !(n > 0)) return false;
      n = Math.floor(n);
      if (!_ecoSpend(n)) { _ecoToast('🪙 No tienes ' + n + ' 🪙'); return false; }
      SAVE.bank.balance += n;
      try { persist(); } catch (e) {}
      _ecoToast('🏦 Depositaste ' + n + ' 🪙');
      return true;
    } catch (e) { return false; }
  },
  withdraw(n) {
    try {
      if (!this.ensureSave() || !(n > 0)) return false;
      n = Math.floor(n);
      if (SAVE.bank.balance < n) { _ecoToast('🏦 Solo tienes ' + SAVE.bank.balance + ' 🪙 en el banco'); return false; }
      SAVE.bank.balance -= n;
      try { persist(); } catch (e) {}
      _ecoEarn(n);
      _ecoToast('🏦 Retiraste ' + n + ' 🪙');
      return true;
    } catch (e) { return false; }
  },

  /* ---------------- visual del banco ---------------- */
  buildForLevel(i, lvlOrGroup) {
    try {
      if (typeof THREE === 'undefined') return;
      const group = (lvlOrGroup && lvlOrGroup.group) ? lvlOrGroup.group : lvlOrGroup;
      if (!group || typeof group.add !== 'function') return;
      const def = this.defFor(i);
      if (!def) return;
      const g = new THREE.Group();
      const gy = def.gy || 0, w = def.w, d = def.d;
      const wallM = _ecoMat('bank-wall', () => new THREE.MeshStandardMaterial({ color: 0xf5f0e6, roughness: 0.7 }));
      const colM = _ecoMat('bank-col', () => new THREE.MeshStandardMaterial({ color: 0xd9cfae, roughness: 0.6 }));
      const goldM = _ecoMat('bank-gold', () =>
        new THREE.MeshStandardMaterial({ color: 0xffd23f, roughness: 0.35, metalness: 0.6, emissive: 0xffd23f, emissiveIntensity: 0.25 }));
      if (wallM) {
        const hall = new THREE.Mesh(new THREE.BoxGeometry(w, 4, d), wallM);
        hall.position.set(0, gy + 2, 0); g.add(hall);
      }
      if (colM) { // columnas al frente (original GEAYI, no copia de nada)
        [-w / 2 + 1, w / 2 - 1].forEach(px => {
          const col = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 4.4, 10), colM);
          col.position.set(px, gy + 2.2, d / 2 + 1.2); g.add(col);
        });
        const arch = new THREE.Mesh(new THREE.BoxGeometry(w + 0.8, 0.5, 1.6), colM);
        arch.position.set(0, gy + 4.6, d / 2 + 1.2); g.add(arch);
      }
      if (goldM) { // puerta dorada
        const door = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.8, 0.15), goldM);
        door.position.set(0, gy + 1.4, d / 2 + 0.05); g.add(door);
      }
      try {
        if (typeof canvasTex === 'function' && typeof doubleFaceSign === 'function') {
          const tex = canvasTex(512, 128, (c, cw, ch) => {
            c.fillStyle = '#1a1440'; c.fillRect(0, 0, cw, ch);
            c.strokeStyle = '#ffd23f'; c.lineWidth = 10; c.strokeRect(6, 6, cw - 12, ch - 12);
            c.textAlign = 'center'; c.fillStyle = '#ffd23f';
            c.font = '900 64px "Trebuchet MS", sans-serif';
            c.fillText('🏦 BANCO GEAYI', cw / 2, 88);
          });
          g.add(doubleFaceSign(7, 1.75, tex, 0, gy + 6, d / 2 + 1.2, 0));
        }
      } catch (e) {}
      g.position.set(def.x, 0, def.z);
      group.add(g);
    } catch (e) {}
  },

  /* ---------------- panel DOM ---------------- */
  open() {
    try {
      if (typeof document === 'undefined') return;
      _ecoCSS();
      const gained = this.applyInterest();
      const ov = _ecoOverlay('🏦 BANCO GEAYI');
      const render = () => {
        const b = this.balance();
        ov.body.innerHTML =
          '<div class="eco-big">' + b + ' 🪙</div>' +
          '<div class="eco-note">Interés 5% diario · tope 200 🪙/día' +
          (gained > 0 ? ' · ¡hoy ganaste ' + gained + ' 🪙!' : '') + '</div>' +
          '<div class="eco-row"><div style="font-weight:bold;margin-bottom:4px">Depositar</div>' +
          '<div class="eco-btnrow">' +
          '<button class="eco-btn gold" data-a="dep50">+50</button>' +
          '<button class="eco-btn gold" data-a="dep200">+200</button>' +
          '<button class="eco-btn gold" data-a="depall">Todo</button></div></div>' +
          '<div class="eco-row"><div style="font-weight:bold;margin-bottom:4px">Retirar</div>' +
          '<div class="eco-btnrow">' +
          '<button class="eco-btn" data-a="wd50">−50</button>' +
          '<button class="eco-btn" data-a="wd200">−200</button>' +
          '<button class="eco-btn" data-a="wdall">Todo</button></div></div>' +
          '<div class="eco-note">Tienes ' + ((typeof SAVE !== 'undefined' && SAVE.coins) || 0) + ' 🪙 en la bolsa</div>';
        ov.body.querySelectorAll('button[data-a]').forEach(btn => {
          btn.addEventListener('click', () => {
            const a = btn.getAttribute('data-a');
            const coins = (typeof SAVE !== 'undefined' && SAVE.coins) || 0;
            if (a === 'dep50') this.deposit(50);
            else if (a === 'dep200') this.deposit(200);
            else if (a === 'depall') this.deposit(coins);
            else if (a === 'wd50') this.withdraw(50);
            else if (a === 'wd200') this.withdraw(200);
            else if (a === 'wdall') this.withdraw(this.balance());
            render();
          });
        });
      };
      render();
    } catch (e) {}
  },

  update(dt) {
    try { // cobra intereses aunque no abras el panel (una vez al día)
      if (typeof MODE !== 'undefined' && MODE === 'play') this.applyInterest();
    } catch (e) {}
  },
};

/* ============================================================
   3. DailyQuests — MISIONES DIARIAS
   3 misiones rotativas al día con semilla = fecha (YYYY-MM-DD).
   Progreso 100% pasivo: solo lee SAVE/Player/Vehicle.
   ============================================================ */
const QUEST_POOL = [
  { id: 'visit',   emoji: '🌍', desc: 'Visita 2 mundos', target: 2, reward: 50,
    cur: () => _ecoVisitedCount() },
  { id: 'coins',   emoji: '🪙', desc: 'Recolecta 40 monedas', target: 40, reward: 40,
    cur: () => DailyQuests._earned },
  { id: 'fish',    emoji: '🎣', desc: 'Pesca 3 peces', target: 3, reward: 60,
    cur: () => { try { return (typeof SAVE !== 'undefined' && SAVE.fish) || 0; } catch (e) { return 0; } } },
  { id: 'drive',   emoji: '🚗', desc: 'Maneja 400 m', target: 400, reward: 50,
    cur: () => Math.floor(DailyQuests._drive) },
  { id: 'collect', emoji: '💰', desc: 'Recoge ganancias de tus negocios 2 veces', target: 2, reward: 40,
    needsBiz: true,
    cur: () => (typeof BizSim !== 'undefined' ? BizSim.totalCollects() : 0) },
];
const DailyQuests = {
  _earned: 0, _lastCoinsRun: 0, _drive: 0, _lastPos: null, _btn: null,

  _today() { return _ecoToday(); },
  ensureSave() {
    try {
      if (typeof SAVE === 'undefined') return false;
      if (!SAVE.quests || typeof SAVE.quests !== 'object' || !Array.isArray(SAVE.quests.list)) SAVE.quests = null;
      return true;
    } catch (e) { return false; }
  },
  _hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; },
  _rng(seed) { // mulberry32
    let a = seed >>> 0;
    return () => {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },
  _ownsBiz() {
    try {
      if (typeof BizSim === 'undefined') return false;
      for (const idx in BizSim.DEFS)
        for (const d of BizSim.DEFS[idx])
          if (BizSim.isOwned(+idx, d.id)) return true;
    } catch (e) {}
    return false;
  },
  _generate() {
    const today = this._today();
    const rnd = this._rng(this._hash(today));
    const order = QUEST_POOL.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) { // Fisher-Yates con semilla
      const j = Math.floor(rnd() * (i + 1));
      const t = order[i]; order[i] = order[j]; order[j] = t;
    }
    const hasBiz = this._ownsBiz();
    const list = [];
    for (const pi of order) {
      if (list.length >= 3) break;
      const q = QUEST_POOL[pi];
      if (q.needsBiz && !hasBiz) continue; // sin negocio no sale esa misión
      list.push({
        id: q.id, emoji: q.emoji, desc: q.desc, target: q.target, reward: q.reward,
        base: q.cur(), progress: 0, done: false, claimed: false, notified: false,
      });
    }
    SAVE.quests = { date: today, list: list };
    this._earned = 0; this._drive = 0;
    try { persist(); } catch (e) {}
  },
  _questDef(id) { for (const q of QUEST_POOL) if (q.id === id) return q; return null; },

  claim(idx) {
    try {
      if (!this.ensureSave() || !SAVE.quests) return false;
      const q = SAVE.quests.list[idx];
      if (!q || !q.done || q.claimed) return false;
      q.claimed = true;
      try { persist(); } catch (e) {}
      _ecoEarn(q.reward);
      _ecoBanner('🎁 ¡Recompensa!', '+' + q.reward + ' 🪙 · ' + q.desc);
      return true;
    } catch (e) { return false; }
  },

  /* ---------------- botón flotante 📋 (creado por JS) ---------------- */
  _ensureBtn() {
    try {
      if (this._btn || typeof document === 'undefined') return;
      _ecoCSS();
      const b = document.createElement('button');
      b.id = 'eco-quests';
      b.className = 'eco-float';
      b.style.left = '12px'; b.style.bottom = '150px';
      b.textContent = '📋';
      b.setAttribute('aria-label', 'Misiones diarias');
      b.addEventListener('click', () => this.togglePanel());
      document.body.appendChild(b);
      this._btn = b;
    } catch (e) {}
  },
  togglePanel() {
    try {
      if (typeof document === 'undefined') return;
      _ecoCSS();
      this.ensureSave();
      if (!SAVE.quests || SAVE.quests.date !== this._today()) this._generate();
      const ov = _ecoOverlay('📋 MISIONES DIARIAS');
      const render = () => {
        let html = '<div class="eco-note">Se renuevan cada día · completa y reclama tu premio</div>';
        SAVE.quests.list.forEach((q, i) => {
          const pct = Math.min(100, Math.round((q.progress / q.target) * 100));
          html += '<div class="eco-row"><div style="font-weight:bold;font-size:15px">' +
            q.emoji + ' ' + q.desc + '</div>' +
            '<div class="eco-bar"><div style="width:' + pct + '%"></div></div>' +
            '<div class="eco-note">' + Math.min(q.progress, q.target) + ' / ' + q.target +
            ' · premio ' + q.reward + ' 🪙</div>';
          if (q.claimed) html += '<button class="eco-btn gray" disabled>✅ Reclamado</button>';
          else if (q.done) html += '<button class="eco-btn green" data-claim="' + i + '">🎁 Reclamar +' + q.reward + ' 🪙</button>';
          else html += '<button class="eco-btn gray" disabled>⏳ En progreso</button>';
          html += '</div>';
        });
        ov.body.innerHTML = html;
        ov.body.querySelectorAll('button[data-claim]').forEach(btn => {
          btn.addEventListener('click', () => { this.claim(+btn.getAttribute('data-claim')); render(); });
        });
      };
      render();
    } catch (e) {}
  },

  /* ---------------- progreso pasivo ---------------- */
  _trackPassive() {
    try {
      if (typeof MODE !== 'undefined' && MODE !== 'play') return;
      // 🪙 monedas recolectadas (coinsRun se reinicia por nivel: solo suma deltas positivos)
      if (typeof coinsRun === 'number') {
        if (coinsRun > this._lastCoinsRun) this._earned += coinsRun - this._lastCoinsRun;
        this._lastCoinsRun = coinsRun;
      }
      // 🚗 distancia manejada (cualquier vehículo)
      if (typeof Vehicle !== 'undefined' && Vehicle && Vehicle.mode && Vehicle.mode !== 'none' &&
          typeof Player !== 'undefined' && Player && Player.pos) {
        if (this._lastPos) {
          const dx = Player.pos.x - this._lastPos.x, dz = Player.pos.z - this._lastPos.z;
          this._drive += Math.sqrt(dx * dx + dz * dz);
        }
        this._lastPos = { x: Player.pos.x, z: Player.pos.z };
      } else this._lastPos = null;
    } catch (e) {}
  },
  update(dt) {
    try { this._ensureBtn(); } catch (e) {}
    try {
      if (!this.ensureSave()) return;
      if (!SAVE.quests || SAVE.quests.date !== this._today()) this._generate(); // rotación por fecha
      this._trackPassive();
      let dirty = false;
      for (const q of SAVE.quests.list) {
        const def = this._questDef(q.id);
        if (!def || q.done) continue;
        const p = Math.max(0, def.cur() - (q.base || 0));
        if (p !== q.progress) { q.progress = p; dirty = true; }
        if (p >= q.target) {
          q.done = true; q.progress = q.target; dirty = true;
          if (!q.notified) {
            q.notified = true;
            _ecoToast('📋 ¡Misión completa: ' + q.desc + '! Toca 📋 para reclamar +' + q.reward + ' 🪙');
          }
        }
      }
      if (dirty) { try { persist(); } catch (e) {} }
    } catch (e) {}
  },
};
