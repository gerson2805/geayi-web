/* ============================================================
   🪧 LOTES EN VENTA estilo Bloxburg (GEAYI — Obby Xtreme 3D)
   ------------------------------------------------------------
   - El jugador compra lotes con monedas del juego y construye
     en ellos DENTRO de la ciudad viva (como en Roblox/Bloxburg).
   - Cada lote: {id, x, z, w, d, price, name, groundY}.
   - Señalización 3D: letrero "🪧 SE VENDE" + precio y cerca de
     color que delimita el lote; al comprarlo cambia a "🏠 MI LOTE".
   - Compra por proximidad (botón flotante, patrón updateShopPrompt):
     descuenta con Shop2.spendCoins (o SAVE.coins con guards).
   - Construir: BuildMode.openOnLot(lot) — reutiliza el modo
     construir sobre el mundo vivo, sin descargarlo.
   - Los bloques del lote tienen COLISIÓN (se registran en
     LEVEL.platforms con lotTag para poder retirarlos).
   - Persistencia: SAVE.lots[worldIdx][lotId] = {x,z,w,d,blocks:[]}.
   Integración (la hace el coordinador, este archivo no toca DOM al cargar):
   1. <script src="lots.js"></script> en index.html (después de
      buildmode.js e infinite.js, antes de game.js).
   2. En startLevel(), junto a los demás buildForLevel:
        if (typeof LotSystem !== 'undefined') LotSystem.buildForLevel(i, LEVEL.group);
   3. En el loop de game.js, dentro de la rama MODE==='play':
        if (typeof LotSystem !== 'undefined') LotSystem.update(dt);
   4. En index.html, junto a los botones de vehículos:
        <button id="btn-lot" class="veh-btn hidden">🪧</button>
      (el clic lo enlaza LotSystem solo; no requiere más JS).
   Todo 100% original GEAYI. Sin saltos. Mundo abierto.
   ============================================================ */
'use strict';

/* ---------------- datos de lotes ----------------
   Áreas verificadas libres (técnica de escaneo de ocupación):
   - Immokalee (idx 3): se revisaron contra world.js + dealership.js
     (lote -30,128) + vet.js (-22,150) + ranch.js (x∈[42,118],z∈[118,162])
     + waterpark (oeste) + carwash (90,8) + casa (-20,40) + phase3 (0,26-84).
   - Ciudad Neón (idx 0): réplica exacta del LCG sembrado (20260913) de
     buildNeonCity: rectángulos libres con 2u de margen de edificios,
     tiendas y farolas. groundY 0.22 = altura de la acera (se sube de un salto).
   Todos dentro del núcleo de 220 m (las calles infinitas no los tocan). */
const LOTS = {
  3: [ // 🌴 Immokalee, FL
    { id: 'immo-1', name: 'Lote Sol Naciente',   x: 65, z: -90, w: 20, d: 16, price: 400,  groundY: 0 },
    { id: 'immo-2', name: 'Lote Camino Real',    x: 5,  z: 128, w: 26, d: 20, price: 700,  groundY: 0 },
    { id: 'immo-3', name: 'Lote Palmeras del Sur', x: 75, z: 195, w: 30, d: 24, price: 1200, groundY: 0 },
  ],
  0: [ // 🌃 Ciudad Neón
    { id: 'neon-1', name: 'Lote Neón Central', x: 138,  z: 103, w: 26, d: 20, price: 700, groundY: 0.22 },
    { id: 'neon-2', name: 'Lote Neón Oeste',   x: -165, z: 73,  w: 20, d: 16, price: 400, groundY: 0.22 },
  ],
};
const LOT_MAX_BLOCKS = 400; // tope por lote (igual que el sandbox)

/* materiales compartidos (Android: pocos materiales, se reutilizan) */
const _lotMats = {};
function _lotMat(key, make) {
  if (!_lotMats[key] && typeof THREE !== 'undefined') { try { _lotMats[key] = make(); } catch (e) {} }
  return _lotMats[key];
}

const LotSystem = {
  LOTS: LOTS,
  _signs: {},       // "worldIdx:lotId" -> {group, def}
  _btnState: 'off',
  _pending: null,   // {action:'buy'|'build', worldIdx, lot}
  _bound: false,
  _admirers: [],    // 🤩 vecinos que vienen solos a ver tu construcción
  _admCd: 25,       // enfriamiento entre visitas
  _admLevel: null,  // para limpiar admiradores al cambiar de mundo

  /* ---------------- persistencia ---------------- */
  ensureSave() {
    try {
      if (typeof SAVE === 'undefined') return false;
      if (!SAVE.lots || typeof SAVE.lots !== 'object') SAVE.lots = {};
      return true;
    } catch (e) { return false; }
  },
  lotsFor(idx) { return (typeof LOTS !== 'undefined' && LOTS[idx]) || []; },
  _defOf(worldIdx, lotId) {
    const defs = this.lotsFor(worldIdx);
    for (const d of defs) if (d.id === lotId) return d;
    return null;
  },
  isOwned(worldIdx, lotId) {
    try {
      this.ensureSave();
      return !!(SAVE.lots[worldIdx] && SAVE.lots[worldIdx][lotId]);
    } catch (e) { return false; }
  },
  getSave(worldIdx, lotId) {
    try {
      this.ensureSave();
      return (SAVE.lots[worldIdx] && SAVE.lots[worldIdx][lotId]) || null;
    } catch (e) { return null; }
  },
  getBlocks(worldIdx, lotId) {
    const rec = this.getSave(worldIdx, lotId);
    return (rec && Array.isArray(rec.blocks)) ? rec.blocks : [];
  },
  /* 🏠 lotes propios con construcción (para 🌍 Mis Mundos → visitar) */
  ownedWithBlocks() {
    const out = [];
    try {
      this.ensureSave();
      const all = SAVE.lots || {};
      Object.keys(all).forEach(wi => {
        const w = all[wi] || {};
        Object.keys(w).forEach(id => {
          const r = w[id];
          if (r && r.blocks && r.blocks.length)
            out.push({ worldIdx: +wi, lotId: id, name: r.name || 'Mi lote', n: r.blocks.length, visits: r.visits || 0 });
        });
      });
    } catch (e) {}
    return out;
  },

  /* ---------------- compra ---------------- */
  buyLot(worldIdx, lot) {
    try {
      if (!lot || !this.ensureSave()) return false;
      if (this.isOwned(worldIdx, lot.id)) { try { toast('🏠 Ya es tu lote'); } catch (e) {} return false; }
      let ok = false;
      if (typeof Shop2 !== 'undefined' && Shop2 && typeof Shop2.spendCoins === 'function') {
        ok = !!Shop2.spendCoins(lot.price);
      } else if (typeof SAVE !== 'undefined') {
        if ((SAVE.coins || 0) >= lot.price) { SAVE.coins -= lot.price; ok = true; try { persist(); } catch (e) {} }
      }
      if (!ok) { try { toast('🪙 Te faltan monedas (' + lot.price + ' 🪙)'); } catch (e) {} return false; }
      if (!SAVE.lots[worldIdx] || typeof SAVE.lots[worldIdx] !== 'object') SAVE.lots[worldIdx] = {};
      SAVE.lots[worldIdx][lot.id] = {
        x: lot.x, z: lot.z, w: lot.w, d: lot.d, groundY: lot.groundY || 0,
        name: lot.name, blocks: [],
      };
      try { persist(); } catch (e) {}
      this._refreshSign(worldIdx, lot.id);
      try { if (typeof Audio2 !== 'undefined' && Audio2.win) Audio2.win(); } catch (e) {}
      try {
        if (typeof Particles !== 'undefined' && typeof Player !== 'undefined' && Player && Player.pos)
          Particles.burst(Player.pos.x, Player.pos.y + 2, Player.pos.z,
            [0xffd23f, 0x59d867, 0x00e5ff, 0xffffff], 30, 8);
      } catch (e) {}
      try { if (typeof showBanner === 'function') showBanner('🏠 ¡MI LOTE!', (lot.name || '') + ' · toca 🧱 Construir'); }
      catch (e) { try { toast('🏠 ¡Lote comprado! Toca 🧱 Construir'); } catch (e2) {} }
      return true;
    } catch (e) { return false; }
  },

  /* guardar bloques del lote (los llama BuildMode.saveLot) */
  _saveBlocks(worldIdx, lotId, blocks) {
    try {
      const rec = this.getSave(worldIdx, lotId);
      if (!rec) return false;
      const def = this._defOf(worldIdx, lotId);
      const clean = (blocks || []).slice(0, LOT_MAX_BLOCKS).map(b => ({
        s: (b.s === 'ramp' || b.s === 'cyl' || b.s === 'sph') ? b.s : 'cube',
        c: String(b.c || '#ff9d00').slice(0, 16),
        x: Math.round(b.x), y: Math.max(0, Math.min(14, Math.round(b.y))), z: Math.round(b.z),
        r: ((b.r | 0) % 4 + 4) % 4,
      }));
      // 🔒 bloques restringidos al rectángulo del lote
      rec.blocks = def ? clean.filter(b =>
        b.x >= def.x - def.w / 2 && b.x <= def.x + def.w / 2 - 1 &&
        b.z >= def.z - def.d / 2 && b.z <= def.z + def.d / 2 - 1
      ) : clean;
      try { persist(); } catch (e) {}
      return true;
    } catch (e) { return false; }
  },

  /* ---------------- construcción del mundo ---------------- */
  buildForLevel(i, lvlOrGroup) {
    this._signs = {};
    try {
      if (typeof THREE === 'undefined') return;
      const group = (lvlOrGroup && lvlOrGroup.group) ? lvlOrGroup.group : lvlOrGroup;
      if (!group || typeof group.add !== 'function') return;
      this.lotsFor(i).forEach(def => {
        try { this._buildLotVisual(i, group, def); } catch (e) {}
        try { this._rebuildBlocks(i, group, def); } catch (e) {}
      });
    } catch (e) {}
  },

  _lotSignTex(sale, price) {
    if (typeof canvasTex !== 'function') return null;
    try {
      return canvasTex(512, 256, (c, w, h) => {
        c.fillStyle = sale ? '#10243f' : '#0f3a1e'; c.fillRect(0, 0, w, h);
        c.strokeStyle = sale ? '#ffd23f' : '#59d867'; c.lineWidth = 14; c.strokeRect(10, 10, w - 20, h - 20);
        c.textAlign = 'center';
        c.fillStyle = sale ? '#ffd23f' : '#59d867';
        c.font = '900 62px "Trebuchet MS", sans-serif';
        c.fillText(sale ? '🪧 SE VENDE' : '🏠 MI LOTE', w / 2, 96);
        c.fillStyle = '#ffffff';
        if (sale) {
          c.font = '900 70px "Trebuchet MS", sans-serif';
          c.fillText(price + ' 🪙', w / 2, 190);
        } else {
          c.font = '700 44px "Trebuchet MS", sans-serif';
          c.fillText('¡A construir! 🧱', w / 2, 190);
        }
      });
    } catch (e) { return null; }
  },

  _buildLotVisual(i, group, def) {
    const owned = this.isOwned(i, def.id);
    const g = new THREE.Group();
    const x0 = def.x - def.w / 2, x1 = def.x + def.w / 2;
    const z0 = def.z - def.d / 2, z1 = def.z + def.d / 2;
    const gy = def.groundY || 0;
    const fenceC = owned ? 0x59d867 : 0xffd23f;
    const postM = _lotMat('post', () => new THREE.MeshStandardMaterial({ color: 0x8a6a42, roughness: 0.9 }));
    const railM = _lotMat('rail-' + fenceC, () =>
      new THREE.MeshStandardMaterial({ color: fenceC, roughness: 0.6, emissive: fenceC, emissiveIntensity: 0.35 }));
    if (postM && railM) {
      const postG = new THREE.BoxGeometry(0.25, 0.9, 0.25);
      const putPost = (x, z) => {
        const p = new THREE.Mesh(postG, postM);
        p.position.set(x, gy + 0.45, z); g.add(p);
      };
      // postes en esquinas + cada ~4u (cerca baja, SOLO visual: no bloquea el paso)
      for (let x = x0; x <= x1 + 0.01; x += 4) { putPost(Math.min(x, x1), z0); putPost(Math.min(x, x1), z1); }
      for (let z = z0 + 4; z <= z1 - 0.01; z += 4) { putPost(x0, Math.min(z, z1)); putPost(x1, Math.min(z, z1)); }
      const railXG = new THREE.BoxGeometry(def.w, 0.14, 0.14);
      const railZG = new THREE.BoxGeometry(0.14, 0.14, def.d);
      [[0, z0, railXG], [0, z1, railXG]].forEach(([ox, oz, geo]) => {
        const r = new THREE.Mesh(geo, railM); r.position.set(def.x + ox, gy + 0.72, oz); g.add(r);
      });
      [[x0, 0], [x1, 0]].forEach(([ox]) => {
        const r = new THREE.Mesh(railZG, railM); r.position.set(ox, gy + 0.72, def.z); g.add(r);
      });
    }
    // 🪧 letrero en el borde sur del lote
    try {
      const tex = this._lotSignTex(!owned, def.price);
      if (tex && typeof doubleFaceSign === 'function') {
        const poleM = _lotMat('pole', () => new THREE.MeshStandardMaterial({ color: 0x6b5a3e, roughness: 0.9 }));
        if (poleM) {
          const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.4, 8), poleM);
          pole.position.set(def.x, gy + 1.2, z1 + 0.9); g.add(pole);
        }
        g.add(doubleFaceSign(6, 3, tex, def.x, gy + 3.1, z1 + 0.9, 0));
      }
    } catch (e) {}
    group.add(g);
    this._signs[i + ':' + def.id] = { group: g, def: def };
  },

  _refreshSign(worldIdx, lotId) {
    try {
      const key = worldIdx + ':' + lotId;
      const rec = this._signs[key];
      const def = this._defOf(worldIdx, lotId);
      if (!rec || !def || !rec.group.parent) return;
      const parent = rec.group.parent;
      parent.remove(rec.group);
      this._buildLotVisual(worldIdx, parent, def); // reconstruye cerca+letrero (los bloques no se tocan)
    } catch (e) {}
  },

  /* reconstruye los bloques guardados del lote + registra colisionadores */
  _rebuildBlocks(i, group, def) {
    const rec = this.getSave(i, def.id);
    if (!rec || !rec.blocks || !rec.blocks.length) return;
    const gy = def.groundY || 0;
    const canBM = (typeof bmShapeGeo === 'function' && typeof bmMat === 'function');
    const plats = (typeof LEVEL !== 'undefined' && LEVEL && Array.isArray(LEVEL.platforms)) ? LEVEL.platforms : null;
    const key = i + ':' + def.id;
    rec.blocks.forEach(b => {
      try {
        let mesh;
        if (canBM) {
          mesh = new THREE.Mesh(bmShapeGeo(b.s), bmMat(b.c));
          if (b.s === 'ramp') {
            mesh.position.set(b.x, gy + b.y + 0.42, b.z);
            mesh.rotation.z = -0.42; mesh.rotation.y = (b.r || 0) * Math.PI / 2;
          } else {
            mesh.position.set(b.x, gy + b.y + 0.5, b.z);
            if (b.s === 'cyl') mesh.rotation.y = (b.r || 0) * Math.PI / 2;
          }
        } else {
          mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshStandardMaterial({ color: 0xff9d00, roughness: 0.8 }));
          mesh.position.set(b.x, gy + b.y + 0.5, b.z);
        }
        mesh.userData.lotBlock = def.id;
        group.add(mesh);
        // 🧱 COLISIÓN: el jugador camina y se sube a su construcción
        if (plats) plats.push({
          x: b.x, z: b.z, topY: gy + b.y + 1, w: 1, h: 1, d: 1,
          kind: 'wall', solid: true, lotTag: key,
        });
      } catch (e) {}
    });
  },

  /* retira los colisionadores viejos del lote y los re-registra desde SAVE */
  syncLotColliders(worldIdx, lotId) {
    try {
      const key = worldIdx + ':' + lotId;
      if (typeof LEVEL !== 'undefined' && LEVEL && Array.isArray(LEVEL.platforms)) {
        LEVEL.platforms = LEVEL.platforms.filter(p => p.lotTag !== key);
        const def = this._defOf(worldIdx, lotId);
        const rec = this.getSave(worldIdx, lotId);
        if (def && rec && Array.isArray(rec.blocks)) {
          const gy = def.groundY || 0;
          rec.blocks.forEach(b => {
            LEVEL.platforms.push({
              x: b.x, z: b.z, topY: gy + b.y + 1, w: 1, h: 1, d: 1,
              kind: 'wall', solid: true, lotTag: key,
            });
          });
        }
      }
    } catch (e) {}
  },

  /* ---------------- botón de proximidad ---------------- */
  _bindBtn() {
    if (this._bound) return;
    try {
      const b = (typeof $ === 'function') ? $('btn-lot') : null;
      if (b && b.addEventListener) {
        b.addEventListener('click', () => this.onActionClick());
        this._bound = true;
      }
    } catch (e) {}
  },
  onActionClick() {
    try {
      const p = this._pending;
      if (!p) return;
      try { if (typeof Audio2 !== 'undefined' && Audio2.click) Audio2.click(); } catch (e) {}
      if (p.action === 'buy') this.buyLot(p.worldIdx, p.lot);
      else if (p.action === 'build' && typeof BuildMode !== 'undefined' && typeof BuildMode.openOnLot === 'function')
        BuildMode.openOnLot(p.worldIdx, p.lot);
    } catch (e) {}
  },
  /* 🤩 ADMIRADORES: vecinos que vienen solos a ver tu construcción.
     Fácil y sin estrés: aparecen cuando estás cerca de tu lote construido,
     miran con emoción (globo 🤩) y se van. Todo automático. */
  _updateAdmirers(dt) {
    try {
      const A = this._admirers;
      if (typeof LEVEL !== 'undefined' && LEVEL && LEVEL.idx !== this._admLevel) {
        this._admLevel = LEVEL.idx;
        for (let i = 0; i < A.length; i++) { try { if (A[i].g && A[i].g.parent) A[i].g.parent.remove(A[i].g); } catch (e2) {} }
        A.length = 0;
        this._admCd = 25;
      }
      for (let i = A.length - 1; i >= 0; i--) {
        const a = A[i];
        a.t += dt;
        const p = a.g.position;
        if (a.mode === 'go') {
          const dx = a.tx - p.x, dz = a.tz - p.z, d = Math.hypot(dx, dz);
          if (d < 1.4) { a.mode = 'look'; a.t = 0; this._admBubble(a); }
          else { const s = 3.4 * dt; p.x += dx / d * s; p.z += dz / d * s; a.g.rotation.y = Math.atan2(dx, dz); }
        } else if (a.mode === 'look') {
          a.g.rotation.y += dt * 0.5;
          if (a.t > 5 + a.seed * 4) {
            a.mode = 'bye'; a.t = 0;
            if (a.bub) { try { if (a.bub.parent) a.bub.parent.remove(a.bub); } catch (e2) {} a.bub = null; }
          }
        } else {
          p.x += Math.sin(a.ang) * 3.6 * dt; p.z += Math.cos(a.ang) * 3.6 * dt;
          if (a.t > 6) { try { if (a.g.parent) a.g.parent.remove(a.g); } catch (e2) {} A.splice(i, 1); }
        }
      }
      this._admCd -= dt;
      if (this._admCd > 0 || A.length >= 3) return;
      if (typeof MODE === 'undefined' || MODE !== 'play') return;
      if (typeof LEVEL === 'undefined' || !LEVEL || !LEVEL.group || LEVEL.idx == null) return;
      if (typeof Player === 'undefined' || !Player || !Player.pos) return;
      if (typeof BuildMode !== 'undefined' && BuildMode.active) return;
      if (typeof THREE === 'undefined') return;
      const mine = this.ownedWithBlocks().filter(l => l.worldIdx === LEVEL.idx);
      if (!mine.length) return;
      let near = null;
      for (const l of mine) {
        const rec = this.getSave(l.worldIdx, l.lotId);
        if (!rec) continue;
        if (Math.hypot(Player.pos.x - rec.x, Player.pos.z - rec.z) < 45) { near = rec; break; }
      }
      if (!near) return;
      this._admCd = 70 + Math.random() * 60;
      const n = 2 + (Math.random() < 0.5 ? 1 : 0);
      for (let k = 0; k < n; k++) this._admSpawn(near);
      try { if (typeof toast === 'function') toast('🤩 ¡Vinieron vecinos a ver tu construcción!'); } catch (e2) {}
    } catch (e) {}
  },
  _admSpawn(rec) {
    try {
      const g = new THREE.Group();
      const shirt = [0xff6b6b, 0x4db8ff, 0x59d867, 0xffd23f, 0xc58bff][(Math.random() * 5) | 0];
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.38, 1.1, 8),
        new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.9 }));
      body.position.y = 0.85; g.add(body);
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 10, 10),
        new THREE.MeshStandardMaterial({ color: 0xf2c89b, roughness: 0.9 }));
      head.position.y = 1.68; g.add(head);
      const gy = rec.groundY || 0;
      const ang = Math.random() * Math.PI * 2;
      const rad = Math.max(rec.w || 20, rec.d || 16) / 2 + 8 + Math.random() * 6;
      g.position.set(rec.x + Math.cos(ang) * rad, gy, rec.z + Math.sin(ang) * rad);
      LEVEL.group.add(g);
      const half = Math.max(rec.w || 20, rec.d || 16) / 2 + 3;
      const ta = ang + Math.PI + (Math.random() - 0.5) * 0.8;
      this._admirers.push({
        g: g, t: 0, mode: 'go', seed: Math.random(), ang: ang, bub: null,
        tx: rec.x + Math.cos(ta) * half, tz: rec.z + Math.sin(ta) * half,
      });
    } catch (e) {}
  },
  _admBubble(a) {
    try {
      const em = ['🤩', '👏', '😍', '🎉', '💯'][(Math.random() * 5) | 0];
      const cv = document.createElement('canvas'); cv.width = 128; cv.height = 128;
      const cx = cv.getContext('2d');
      cx.font = '92px serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
      cx.fillText(em, 64, 70);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthTest: false }));
      sp.scale.set(1.7, 1.7, 1); sp.position.y = 2.7;
      a.g.add(sp); a.bub = sp;
    } catch (e) {}
  },
  update(dt) {
    try { this._bindBtn(); } catch (e) {}
    try { this._updateAdmirers(dt); } catch (e) {}
    let show = null;
    try {
      if (typeof MODE !== 'undefined' && MODE === 'play' &&
          typeof Player !== 'undefined' && Player && Player.pos &&
          typeof LEVEL !== 'undefined' && LEVEL && LEVEL.idx != null) {
        const driving = (typeof Vehicle !== 'undefined' && Vehicle && Vehicle.mode && Vehicle.mode !== 'none');
        const building = (typeof BuildMode !== 'undefined' && BuildMode.active);
        if (!driving && !building) {
          let best = null, bd = Infinity;
          for (const def of this.lotsFor(LEVEL.idx)) {
            const dx = Player.pos.x - def.x, dz = Player.pos.z - def.z;
            const rad = Math.max(def.w, def.d) / 2 + 7;
            const d2 = dx * dx + dz * dz;
            if (d2 < rad * rad && d2 < bd) { bd = d2; best = def; }
          }
          if (best) {
            const owned = this.isOwned(LEVEL.idx, best.id);
            show = {
              action: owned ? 'build' : 'buy', worldIdx: LEVEL.idx, lot: best,
              label: owned ? '🧱 Construir' : '🪧 Comprar (' + best.price + ' 🪙)',
            };
          }
        }
      }
    } catch (e) {}
    try {
      const b = (typeof $ === 'function') ? $('btn-lot') : null;
      if (!b) return;
      const st = show ? show.action + ':' + show.lot.id : 'none';
      if (st !== this._btnState) {
        this._btnState = st;
        this._pending = show;
        if (show) { b.classList.remove('hidden'); b.textContent = show.label; }
        else b.classList.add('hidden');
      } else if (show) this._pending = show;
    } catch (e) {}
  },
};
