/* roleplay.js — 🏡 VIDA GEAYI: juego de rol estilo Adopt Me / Brookhaven (100% original)
   Lo que piden los niños según el artículo: adoptar y CUIDAR mascotas, VESTIRLAS,
   personalizar y DISEÑAR tu casa, y vivir tu alter ego en la ciudad.
   - 🐾 Cuidado: hambre / diversión / limpieza (0-100, decaen con el tiempo real).
     Alimentar (20🪙), jugar y bañar (gratis, con espera). Mascota feliz (≥70)
     da un regalo diario de 50🪙.
   - 👕 Atuendos 3D para la mascota seguidora: sombrero, lentes, capa, corona.
   - 🏡 Hub: cuidado, atuendos, trabajos (jobs.js) y mi casa (casa.js).
   API: Roleplay.init() / Roleplay.update(dt) / Roleplay.openHub() */
'use strict';

const RP_DECAY_MIN = 0.4;      // puntos que baja cada stat por minuto
const RP_FOOD_PRICE = 20;      // 🪙 por alimentar
const RP_GIFT_COINS = 50;      // regalo diario por mascota feliz
const RP_PLAY_CD = 20, RP_BATH_CD = 30; // segundos de espera

const RP_OUTFITS = [
  { id: 'hat',     emoji: '🎩', price: 100, nameKey: 'rp.of.hat',     descKey: 'rp.ofd.hat' },
  { id: 'glasses', emoji: '🕶️', price: 80,  nameKey: 'rp.of.glasses', descKey: 'rp.ofd.glasses' },
  { id: 'cape',    emoji: '🦸', price: 120, nameKey: 'rp.of.cape',    descKey: 'rp.ofd.cape' },
  { id: 'crown',   emoji: '👑', price: 200, nameKey: 'rp.of.crown',   descKey: 'rp.ofd.crown' },
];

const Roleplay = {
  _inited: false, _panel: null, _playCd: 0, _bathCd: 0, _tick: 0, _appliedKey: '',

  /* ================= i18n ================= */
  _strings() {
    if (typeof addStrings !== 'function') return;
    addStrings('es', {
      'rp.hub': '🏡 Vida GEAYI', 'rp.close': 'Cerrar',
      'rp.care': '🐾 Cuidar mascota', 'rp.cared': 'Cuida a tu mascota: aliméntala, juega y báñala. ¡Feliz te da regalos!',
      'rp.gear': '👕 Atuendos', 'rp.geard': 'Viste a tu mascota con sombrero, lentes, capa o corona.',
      'rp.jobs': '🎭 Trabajos', 'rp.jobsd': 'Vive tu alter ego: policía, doctor, tendero y más.',
      'rp.home': '🏠 Mi casa', 'rp.homed': 'Tu casa está en Immokalee (mundo 4). Entra para decorarla.',
      'rp.noPet': 'Aún no tienes mascota. ¡Adopta una! 🐾',
      'rp.adopt': '🐾 Adoptar mascota',
      'rp.food': 'Hambre', 'rp.fun': 'Diversión', 'rp.clean': 'Limpieza',
      'rp.feed': '🍖 Alimentar', 'rp.play': '🎾 Jugar', 'rp.bath': '🧼 Bañar',
      'rp.gift': '🎁 Regalo', 'rp.giftGot': '🎁 ¡Tu mascota feliz te dio 50🪙!',
      'rp.giftNeed': 'Sube su felicidad a 70 para el regalo 🎁',
      'rp.fed': '🍖 ¡Ñam ñam!', 'rp.played': '🎾 ¡Qué divertido!', 'rp.bathed': '🧼 ¡Limpiecita!',
      'rp.noCoins': '🪙 Te faltan monedas',
      'rp.wait': 'Espera {n}s…',
      'rp.buy': 'Comprar', 'rp.wear': 'Poner', 'rp.worn': '✅ Puesto', 'rp.remove': 'Quitar',
      'rp.of.hat': 'Sombrero', 'rp.ofd.hat': 'Elegante sombrero de copa.',
      'rp.of.glasses': 'Lentes cool', 'rp.ofd.glasses': 'Lentes oscuros de estrella.',
      'rp.of.cape': 'Capa', 'rp.ofd.cape': 'Capa de superhéroe.',
      'rp.of.crown': 'Corona', 'rp.ofd.crown': 'Corona dorada real.',
      'rp.bought': '👕 ¡Atuendo comprado!',
    });
    addStrings('en', {
      'rp.hub': '🏡 GEAYI Life', 'rp.close': 'Close',
      'rp.care': '🐾 Care for pet', 'rp.cared': 'Care for your pet: feed, play and bathe it. A happy pet gives gifts!',
      'rp.gear': '👕 Outfits', 'rp.geard': 'Dress your pet with a hat, glasses, cape or crown.',
      'rp.jobs': '🎭 Jobs', 'rp.jobsd': 'Live your alter ego: police, doctor, shopkeeper and more.',
      'rp.home': '🏠 My house', 'rp.homed': 'Your house is in Immokalee (world 4). Go inside to decorate it.',
      'rp.noPet': 'You have no pet yet. Adopt one! 🐾',
      'rp.adopt': '🐾 Adopt a pet',
      'rp.food': 'Hunger', 'rp.fun': 'Fun', 'rp.clean': 'Cleanliness',
      'rp.feed': '🍖 Feed', 'rp.play': '🎾 Play', 'rp.bath': '🧼 Bathe',
      'rp.gift': '🎁 Gift', 'rp.giftGot': '🎁 Your happy pet gave you 50🪙!',
      'rp.giftNeed': 'Raise happiness to 70 for the gift 🎁',
      'rp.fed': '🍖 Yum yum!', 'rp.played': '🎾 So fun!', 'rp.bathed': '🧼 All clean!',
      'rp.noCoins': '🪙 Not enough coins',
      'rp.wait': 'Wait {n}s…',
      'rp.buy': 'Buy', 'rp.wear': 'Wear', 'rp.worn': '✅ On', 'rp.remove': 'Remove',
      'rp.of.hat': 'Hat', 'rp.ofd.hat': 'Fancy top hat.',
      'rp.of.glasses': 'Cool glasses', 'rp.ofd.glasses': 'Star shades.',
      'rp.of.cape': 'Cape', 'rp.ofd.cape': 'Superhero cape.',
      'rp.of.crown': 'Crown', 'rp.ofd.crown': 'Royal golden crown.',
      'rp.bought': '👕 Outfit bought!',
    });
  },
  _t(key, vars) {
    let s = (typeof T === 'function') ? T(key) : key;
    if (vars) for (const k in vars) s = String(s).split('{' + k + '}').join(vars[k]);
    return s;
  },
  _toast(m) { try { if (typeof toast === 'function') toast(m); } catch (e) {} },
  _sfx(n) { try { if (typeof Audio2 !== 'undefined' && Audio2 && typeof Audio2[n] === 'function') Audio2[n](); } catch (e) {} },

  /* ================= SAVE ================= */
  _ensureSave() {
    try {
      if (typeof SAVE === 'undefined') return false;
      if (!SAVE.petCare || typeof SAVE.petCare !== 'object') SAVE.petCare = {};
      if (!SAVE.petGear || typeof SAVE.petGear !== 'object') SAVE.petGear = { owned: {}, worn: {} };
      if (!SAVE.petGear.owned || typeof SAVE.petGear.owned !== 'object') SAVE.petGear.owned = {};
      if (!SAVE.petGear.worn || typeof SAVE.petGear.worn !== 'object') SAVE.petGear.worn = {};
      return true;
    } catch (e) { return false; }
  },
  _careOf(id) {
    this._ensureSave();
    if (!SAVE.petCare[id]) SAVE.petCare[id] = { food: 80, fun: 80, clean: 80, seen: Date.now(), gift: '' };
    return SAVE.petCare[id];
  },
  _applyDecay(c) {
    const mins = Math.max(0, (Date.now() - (c.seen || Date.now())) / 60000);
    if (mins < 1) return;
    const d = Math.min(100, mins * RP_DECAY_MIN);
    c.food = Math.max(0, c.food - d); c.fun = Math.max(0, c.fun - d); c.clean = Math.max(0, c.clean - d);
    c.seen = Date.now();
  },
  _avg(c) { return Math.round((c.food + c.fun + c.clean) / 3); },
  _today() { try { return new Date().toISOString().slice(0, 10); } catch (e) { return ''; } },
  _activePetId() {
    try { return (typeof SAVE !== 'undefined' && SAVE.activePet && SAVE.activePet !== 'none') ? SAVE.activePet : null; }
    catch (e) { return null; }
  },
  _petName(id) {
    try { if (typeof petDef === 'function') { const d = petDef(id); if (d) return d.emoji + ' ' + d.name; } } catch (e) {}
    return '🐾 ' + id;
  },

  /* ================= ciclo de vida ================= */
  init() {
    if (this._inited) return;
    this._inited = true;
    this._strings();
    this._ensureSave();
  },
  update(dt) {
    if (dt == null || dt <= 0) dt = 0.016;
    if (this._playCd > 0) this._playCd -= dt;
    if (this._bathCd > 0) this._bathCd -= dt;
    // re-aplicar atuendo si cambió la mascota o el atuendo
    this._tick += dt;
    if (this._tick >= 1) { this._tick = 0; this._applyOutfit(); }
  },

  /* ================= monedas ================= */
  _spend(n) {
    try {
      if (typeof Shop2 !== 'undefined' && Shop2 && typeof Shop2.spendCoins === 'function') return !!Shop2.spendCoins(n);
      if (typeof SAVE !== 'undefined' && (SAVE.coins | 0) >= n) {
        SAVE.coins -= n; if (typeof persist === 'function') persist(); this._refreshCoins(); return true;
      }
    } catch (e) {}
    return false;
  },
  _earn(n) {
    try {
      if (typeof SAVE === 'undefined') return;
      SAVE.coins = (SAVE.coins | 0) + n;
      if (typeof persist === 'function') persist();
      this._refreshCoins();
    } catch (e) {}
  },
  _refreshCoins() {
    try {
      const el = (typeof $ === 'function') ? $('hud-coins') : null;
      if (el && typeof SAVE !== 'undefined') el.textContent = SAVE.coins;
    } catch (e) {}
  },

  /* ================= acciones de cuidado ================= */
  feed() {
    const id = this._activePetId(); if (!id) return false;
    const c = this._careOf(id); this._applyDecay(c);
    if (!this._spend(RP_FOOD_PRICE)) { this._sfx('deny'); this._toast(this._t('rp.noCoins')); return false; }
    c.food = Math.min(100, c.food + 35); c.seen = Date.now();
    if (typeof persist === 'function') persist();
    this._sfx('good'); this._toast(this._t('rp.fed'));
    this.openCare(); return true;
  },
  play() {
    const id = this._activePetId(); if (!id) return false;
    if (this._playCd > 0) { this._toast(this._t('rp.wait', { n: Math.ceil(this._playCd) })); return false; }
    const c = this._careOf(id); this._applyDecay(c);
    c.fun = Math.min(100, c.fun + 35); c.seen = Date.now(); this._playCd = RP_PLAY_CD;
    if (typeof persist === 'function') persist();
    this._sfx('good'); this._toast(this._t('rp.played'));
    this.openCare(); return true;
  },
  bathe() {
    const id = this._activePetId(); if (!id) return false;
    if (this._bathCd > 0) { this._toast(this._t('rp.wait', { n: Math.ceil(this._bathCd) })); return false; }
    const c = this._careOf(id); this._applyDecay(c);
    c.clean = Math.min(100, c.clean + 40); c.seen = Date.now(); this._bathCd = RP_BATH_CD;
    if (typeof persist === 'function') persist();
    this._sfx('good'); this._toast(this._t('rp.bathed'));
    this.openCare(); return true;
  },
  gift() {
    const id = this._activePetId(); if (!id) return false;
    const c = this._careOf(id); this._applyDecay(c);
    if (this._avg(c) < 70 || c.gift === this._today()) { this._toast(this._t('rp.giftNeed')); return false; }
    c.gift = this._today();
    if (typeof persist === 'function') persist();
    this._earn(RP_GIFT_COINS);
    this._sfx('win'); this._toast(this._t('rp.giftGot'));
    this.openCare(); return true;
  },

  /* ================= atuendos ================= */
  buyOutfit(oid) {
    const o = RP_OUTFITS.find(x => x.id === oid); if (!o) return false;
    this._ensureSave();
    if (SAVE.petGear.owned[oid]) return true;
    if (!this._spend(o.price)) { this._sfx('deny'); this._toast(this._t('rp.noCoins')); return false; }
    SAVE.petGear.owned[oid] = true;
    if (typeof persist === 'function') persist();
    this._sfx('buy'); this._toast(this._t('rp.bought'));
    this.openOutfits(); return true;
  },
  wearOutfit(oid) {
    const id = this._activePetId(); if (!id) return false;
    this._ensureSave();
    if (oid && !SAVE.petGear.owned[oid]) return false;
    SAVE.petGear.worn[id] = oid || null;
    if (typeof persist === 'function') persist();
    this._appliedKey = '';
    this._sfx('click');
    this.openOutfits(); return true;
  },
  _wornOf(id) {
    try { return (SAVE.petGear && SAVE.petGear.worn && SAVE.petGear.worn[id]) || null; } catch (e) { return null; }
  },
  _buildOutfitMesh(kind) {
    if (typeof THREE === 'undefined') return null;
    try {
      const g = new THREE.Group();
      const mat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 });
      if (kind === 'hat') {
        const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.06, 14), mat(0x222831));
        brim.position.y = 0.78; g.add(brim);
        const top = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.3, 14), mat(0x222831));
        top.position.y = 0.95; g.add(top);
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.07, 14), mat(0xe84545));
        band.position.y = 0.84; g.add(band);
      } else if (kind === 'glasses') {
        for (const sx of [-0.16, 0.16]) {
          const lens = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.06), mat(0x111111));
          lens.position.set(sx, 0.55, 0.34); g.add(lens);
        }
        const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.04), mat(0x111111));
        bridge.position.set(0, 0.58, 0.34); g.add(bridge);
      } else if (kind === 'cape') {
        const cape = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.9),
          new THREE.MeshStandardMaterial({ color: 0xe84545, roughness: 0.8, side: THREE.DoubleSide }));
        cape.position.set(0, 0.45, -0.42); cape.rotation.x = 0.25; g.add(cape);
      } else if (kind === 'crown') {
        const c = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.18, 10), mat(0xffd23f));
        c.position.y = 0.92; g.add(c);
        for (let i = 0; i < 5; i++) {
          const p = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 6), mat(0xffd23f));
          const a = (i / 5) * Math.PI * 2;
          p.position.set(Math.cos(a) * 0.2, 1.05, Math.sin(a) * 0.2); g.add(p);
        }
      } else return null;
      g.userData.rpOutfit = true;
      return g;
    } catch (e) { return null; }
  },
  _applyOutfit() {
    try {
      const pg = (typeof petGroup !== 'undefined') ? petGroup : null;
      if (!pg) return;
      const id = this._activePetId();
      const want = id ? this._wornOf(id) : null;
      const key = (id || 'x') + '|' + (want || '');
      if (key === this._appliedKey) return;
      this._appliedKey = key;
      for (let i = pg.children.length - 1; i >= 0; i--) {
        if (pg.children[i].userData && pg.children[i].userData.rpOutfit) pg.remove(pg.children[i]);
      }
      if (want) { const m = this._buildOutfitMesh(want); if (m) pg.add(m); }
    } catch (e) {}
  },

  /* ================= paneles ================= */
  _ensurePanel() {
    if (this._panel) return;
    try {
      const p = document.createElement('div');
      p.id = 'rp-panel';
      p.className = 'screen overlay hidden';
      document.body.appendChild(p);
      this._panel = p;
    } catch (e) {}
  },
  _shell(title, body) {
    return '<div class="panel" style="max-width:440px;width:100%">' +
      '<h2>' + title + '</h2>' + body +
      '<div class="menu-buttons"><button class="btn" data-rp="close">✕ ' + this._t('rp.close') + '</button></div></div>';
  },
  _wire() {
    if (!this._panel) return;
    const q = (sel) => Array.prototype.slice.call(this._panel.querySelectorAll(sel));
    q('[data-rp="close"]').forEach(b => b.addEventListener('click', () => this.close()));
    q('[data-rp="hub"]').forEach(b => b.addEventListener('click', () => this.openHub()));
    q('[data-rp="care"]').forEach(b => b.addEventListener('click', () => this.openCare()));
    q('[data-rp="outfits"]').forEach(b => b.addEventListener('click', () => this.openOutfits()));
    q('[data-rp="jobs"]').forEach(b => b.addEventListener('click', () => {
      this.close(); try { if (typeof openJobsPanel === 'function') openJobsPanel(); } catch (e) {}
    }));
    q('[data-rp="home"]').forEach(b => b.addEventListener('click', () => { this._toast(this._t('rp.homed')); }));
    q('[data-rp="adopt"]').forEach(b => b.addEventListener('click', () => {
      this.close(); try { if (typeof PetShop !== 'undefined' && PetShop && typeof PetShop.open === 'function') PetShop.open(); } catch (e) {}
    }));
    q('[data-rp="feed"]').forEach(b => b.addEventListener('click', () => this.feed()));
    q('[data-rp="play"]').forEach(b => b.addEventListener('click', () => this.play()));
    q('[data-rp="bath"]').forEach(b => b.addEventListener('click', () => this.bathe()));
    q('[data-rp="gift"]').forEach(b => b.addEventListener('click', () => this.gift()));
    q('[data-rp="buy"]').forEach(b => b.addEventListener('click', () => this.buyOutfit(b.getAttribute('data-id'))));
    q('[data-rp="wear"]').forEach(b => b.addEventListener('click', () => this.wearOutfit(b.getAttribute('data-id'))));
    q('[data-rp="unwear"]').forEach(b => b.addEventListener('click', () => this.wearOutfit(null)));
  },
  _show(html) {
    this._ensurePanel();
    if (!this._panel) return;
    this._panel.innerHTML = html;
    this._wire();
    this._panel.classList.remove('hidden');
  },
  close() { if (this._panel) this._panel.classList.add('hidden'); },

  openHub() {
    this._sfx('click');
    const card = (rp, emoji, name, desc) =>
      '<div class="pow-card"><div class="pow-emoji">' + emoji + '</div>' +
      '<div class="pow-info"><div class="pow-name">' + name + '</div>' +
      '<div class="pow-desc">' + desc + '</div></div>' +
      '<button class="btn pow-btn" data-rp="' + rp + '">▶</button></div>';
    this._show(this._shell(this._t('rp.hub'),
      card('care', '🐾', this._t('rp.care'), this._t('rp.cared')) +
      card('outfits', '👕', this._t('rp.gear'), this._t('rp.geard')) +
      card('jobs', '🎭', this._t('rp.jobs'), this._t('rp.jobsd')) +
      card('home', '🏠', this._t('rp.home'), this._t('rp.homed'))));
  },

  openCare() {
    const id = this._activePetId();
    if (!id) {
      this._show(this._shell(this._t('rp.care'),
        '<div class="pow-card"><div class="pow-emoji">🐾</div>' +
        '<div class="pow-info"><div class="pow-desc">' + this._t('rp.noPet') + '</div></div>' +
        '<button class="btn pow-btn" data-rp="adopt">' + this._t('rp.adopt') + '</button></div>' +
        '<div class="menu-buttons"><button class="btn" data-rp="hub">🏡 ' + this._t('rp.hub') + '</button></div>'));
      return;
    }
    const c = this._careOf(id); this._applyDecay(c);
    const bar = (label, v) => {
      const col = v >= 70 ? '#59d867' : (v >= 40 ? '#ffd23f' : '#e84545');
      return '<div style="margin:6px 0"><div style="font-size:13px">' + label + ' ' + Math.round(v) + '%</div>' +
        '<div style="background:#223;border-radius:99px;height:12px">' +
        '<div style="width:' + Math.round(v) + '%;background:' + col + ';height:12px;border-radius:99px"></div></div></div>';
    };
    const canGift = this._avg(c) >= 70 && c.gift !== this._today();
    const btn = (rp, label, dis) =>
      '<button class="btn pow-btn" data-rp="' + rp + '"' + (dis ? ' disabled' : '') + '>' + label + '</button>';
    this._show(this._shell(this._t('rp.care') + ' — ' + this._petName(id),
      bar('🍖 ' + this._t('rp.food'), c.food) + bar('🎾 ' + this._t('rp.fun'), c.fun) + bar('🧼 ' + this._t('rp.clean'), c.clean) +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">' +
      btn('feed', this._t('rp.feed') + ' 20🪙') + btn('play', this._t('rp.play')) + btn('bath', this._t('rp.bath')) +
      btn('gift', this._t('rp.gift') + ' 🎁', !canGift) + '</div>' +
      '<div class="menu-buttons"><button class="btn" data-rp="hub">🏡 ' + this._t('rp.hub') + '</button></div>'));
  },

  openOutfits() {
    const id = this._activePetId();
    if (!id) {
      this._show(this._shell(this._t('rp.gear'),
        '<div class="pow-desc">' + this._t('rp.noPet') + '</div>' +
        '<div class="menu-buttons"><button class="btn" data-rp="adopt">' + this._t('rp.adopt') + '</button> ' +
        '<button class="btn" data-rp="hub">🏡</button></div>'));
      return;
    }
    this._ensureSave();
    const worn = this._wornOf(id);
    const cards = RP_OUTFITS.map(o => {
      const owned = !!SAVE.petGear.owned[o.id];
      const isWorn = worn === o.id;
      let b;
      if (!owned) b = '<button class="btn pow-btn" data-rp="buy" data-id="' + o.id + '">🪙 ' + o.price + ' ' + this._t('rp.buy') + '</button>';
      else if (isWorn) b = '<button class="btn pow-btn" data-rp="unwear">' + this._t('rp.remove') + '</button>';
      else b = '<button class="btn pow-btn" data-rp="wear" data-id="' + o.id + '">' + this._t('rp.wear') + '</button>';
      return '<div class="pow-card' + (isWorn ? ' on' : '') + '"><div class="pow-emoji">' + o.emoji + '</div>' +
        '<div class="pow-info"><div class="pow-name">' + this._t(o.nameKey) + '</div>' +
        '<div class="pow-desc">' + this._t(o.descKey) + '</div>' +
        (isWorn ? '<div class="pow-state">' + this._t('rp.worn') + '</div>' : '') + '</div>' + b + '</div>';
    }).join('');
    this._show(this._shell(this._t('rp.gear') + ' — ' + this._petName(id), cards +
      '<div class="menu-buttons"><button class="btn" data-rp="hub">🏡 ' + this._t('rp.hub') + '</button></div>'));
  },
};
