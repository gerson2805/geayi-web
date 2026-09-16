/* ============================================================================
   vet.js — 🏥 VETERINARIA GEAYI (Immokalee, mundo idx 3)
   Diseños 100% ORIGINALES. Las mascotas son las perras reales de la familia
   (Mily, Kiara) y Whini: se las trata con cariño, nada de daño.

   - Clínica baja a nivel del suelo con entrada abierta (sin saltos), sala de
     espera, camilla y letrero 3D "🏥 VETERINARIA GEAYI".
   - Ubicación verificada libre: centro (-22, 150), 20x14 — al norte del lote
     de carros de Dealership (-30,128), lejos de la traila Tamps (-16,44),
     de los puentes (0,17)/(0,90) y de la pista de bicis (0,128).
   - El jugador elige mascota (Mily / Kiara / Whini): aparece en la camilla.
   - Tres cuidados con botones táctiles ≥52px:
       🩹 Curar: si está enferma → sana +20 🪙 (clientes NPC también traen
                 mascotas enfermas: curarlas paga +20 🪙).
       🍖 Alimentar: sube "hambre"; la mascota mueve la cola de felicidad.
       🛁 Bañar: sube "limpieza"; sale espuma (partículas) y queda brillante.
   - Stats por mascota en SAVE.vetStats = {mily:{salud,hambre,limpio,enferma},
     ...} que bajan despacio con el tiempo jugado.
   - i18n es/en (addStrings). Geometrías y materiales cacheados (Android).

   INTEGRACIÓN (la hace el padre, no este archivo):
   1. index.html: <script src="vet.js"></script> ANTES de game.js.
   2. boot(): if (typeof Vet!=='undefined') Vet.init();
   3. startLevel(i): tras LEVEL = buildLevel(i);
      if (typeof Vet!=='undefined') Vet.buildForLevel(i, LEVEL.group);
   4. loop(): if (typeof Vet!=='undefined' && typeof Vet.update==='function') Vet.update(dt);

   NO toca pets.js: solo lectura (no cambia IDs ni lógica de FAMILY/mascotas).
   ========================================================================== */
'use strict';

/* ---------------- i18n (es + en, patrón de jobs.js / dealership.js) ----- */
try {
  if (typeof addStrings === 'function') {
    addStrings('es', {
      'vet.title': '🏥 VETERINARIA GEAYI',
      'vet.subtitle': 'Cuida con cariño a Mily, Kiara y Whini',
      'vet.close': 'Cerrar',
      'vet.hint': 'Visita la clínica en Immokalee 🌴',
      'vet.cure': '🩹 Curar',
      'vet.feed': '🍖 Alimentar',
      'vet.bathe': '🛁 Bañar',
      'vet.pay': '+20 🪙',
      'vet.cured': '✅ ¡Curada! +20 🪙 ¡Gracias por cuidarla!',
      'vet.healthy': '💚 Ya está sana, no necesita curación.',
      'vet.fed': '🍖 ¡Ñam ñam! Mueve la cola de felicidad.',
      'vet.full': '😋 Ya está llena.',
      'vet.bathed': '🛁 ¡Limpia y brillante! ✨',
      'vet.clean': '✨ Ya está limpia.',
      'vet.sick': '🤒 enferma',
      'vet.client': '🐶 ¡Un cliente necesita ayuda!',
      'vet.clientSick': 'está enfermo 🤒',
      'vet.cureClient': '🩹 Curar · +20 🪙',
      'vet.clientThanks': '🙏 ¡Gracias! +20 🪙',
      'vet.clientLeft': '🚶 El cliente se fue.',
      'vet.gotSick': '🤒 ¡Oh no! {name} se siente mal.',
      'vet.n.mily': 'Mily',
      'vet.d.mily': 'Schnauzer gris plateado, dulce y juguetona.',
      'vet.n.kiara': 'Kiara',
      'vet.d.kiara': 'Blanca con manchas café y collar rosa.',
      'vet.n.whini': 'Whini',
      'vet.d.whini': 'Pastor belga valiente y leal.',
      'vet.st.salud': 'Salud',
      'vet.st.hambre': 'Panza llena',
      'vet.st.limpio': 'Limpieza',
      'vet.reception': 'RECEPCIÓN',
      'vet.open': 'Veterinaria',
    });
    addStrings('en', {
      'vet.title': '🏥 GEAYI VET CLINIC',
      'vet.subtitle': 'Loving care for Mily, Kiara and Whini',
      'vet.close': 'Close',
      'vet.hint': 'Visit the clinic in Immokalee 🌴',
      'vet.cure': '🩹 Heal',
      'vet.feed': '🍖 Feed',
      'vet.bathe': '🛁 Bathe',
      'vet.pay': '+20 🪙',
      'vet.cured': '✅ Healed! +20 🪙 Thanks for caring!',
      'vet.healthy': '💚 Already healthy, no healing needed.',
      'vet.fed': '🍖 Yum yum! Wags tail happily.',
      'vet.full': '😋 Already full.',
      'vet.bathed': '🛁 Clean and shiny! ✨',
      'vet.clean': '✨ Already clean.',
      'vet.sick': '🤒 sick',
      'vet.client': '🐶 A customer needs help!',
      'vet.clientSick': 'is sick 🤒',
      'vet.cureClient': '🩹 Heal · +20 🪙',
      'vet.clientThanks': '🙏 Thank you! +20 🪙',
      'vet.clientLeft': '🚶 The customer left.',
      'vet.gotSick': '🤒 Oh no! {name} feels sick.',
      'vet.n.mily': 'Mily',
      'vet.d.mily': 'Silver-gray schnauzer, sweet and playful.',
      'vet.n.kiara': 'Kiara',
      'vet.d.kiara': 'White with brown spots and a pink collar.',
      'vet.n.whini': 'Whini',
      'vet.d.whini': 'Brave and loyal Belgian shepherd.',
      'vet.st.salud': 'Health',
      'vet.st.hambre': 'Full belly',
      'vet.st.limpio': 'Cleanliness',
      'vet.reception': 'RECEPTION',
      'vet.open': 'Vet clinic',
    });
  }
} catch (e) {}

/* ---------------- datos ------------------------------------------------- */
/* Ubicación verificada libre en Immokalee (ver tests/vet_spot en /tmp):
   al norte del lote de carros (-30,128), entrada abierta al oeste hacia la calle. */
const VET_SPOT = { x: -22, z: 150, w: 20, d: 14 };
const VET_MAX = 100;
const VET_CURE_PAY = 20;

const VET_PETS = [
  { id: 'mily',  emoji: '🐶', nameKey: 'vet.n.mily',  descKey: 'vet.d.mily',
    fur: 0xb9bec7, belly: 0xffffff, ear: 0x8f959e, accent: 0xffffff, patch: null },      // schnauzer gris, barba y patas blancas, orejas paradas
  { id: 'kiara', emoji: '🐶', nameKey: 'vet.n.kiara', descKey: 'vet.d.kiara',
    fur: 0xf6f2ea, belly: 0xffffff, ear: 0xc98a4b, accent: 0xff7fa5, patch: 0xc98a4b },  // blanca con manchas café, collar rosa
  { id: 'whini', emoji: '🐶', nameKey: 'vet.n.whini', descKey: 'vet.d.whini',
    fur: 0xd9a75f, belly: 0xe8c98a, ear: 0x232323, accent: 0x232323, patch: null },      // malinois café claro, máscara y orejas negras
];
function _vetPetDef(id) {
  for (let i = 0; i < VET_PETS.length; i++) if (VET_PETS[i].id === id) return VET_PETS[i];
  return VET_PETS[0];
}
function _vetT(k) { try { return (typeof T === 'function') ? T(k) : k; } catch (e) { return k; } }
function _vetToast(m) { try { if (typeof toast === 'function') toast(m); } catch (e) {} }
function _vetClick() { try { if (typeof Audio2 !== 'undefined' && Audio2 && Audio2.click) Audio2.click(); } catch (e) {} }
function _vetEarn(n) {
  try {
    if (typeof Shop2 !== 'undefined' && Shop2 && typeof Shop2.addCoins === 'function') {
      Shop2.addCoins(n);
    } else if (typeof SAVE !== 'undefined' && SAVE) {
      SAVE.coins = (SAVE.coins || 0) + n;
      if (typeof persist === 'function') persist();
    }
    const h = (typeof $ === 'function') ? $('hud-coins') : null;
    if (h) h.textContent = (typeof SAVE !== 'undefined' && SAVE) ? SAVE.coins : n;
  } catch (e) {}
}
function _vetBurst(x, y, z, colors, n, speed) {
  try {
    if (typeof Particles !== 'undefined' && Particles && typeof Particles.burst === 'function')
      Particles.burst(x, y, z, colors, n || 18, speed || 4);
  } catch (e) {}
}

const Vet = {
  _geo: {}, _mat: {},
  _inited: false, _clinic: null, _tablePet: null, _tablePetId: null,
  _sel: 'mily', _acc: 0, _client: null, _clientCd: 20,
  _wagT: 0, _hopT: 0, _shineT: 0, _petBaseY: 1.04,

  /* ---------- persistencia ---------- */
  ensureSave() {
    try {
      if (typeof SAVE === 'undefined' || !SAVE) return;
      if (!SAVE.vetStats || typeof SAVE.vetStats !== 'object') SAVE.vetStats = {};
      VET_PETS.forEach(p => {
        const s = SAVE.vetStats[p.id];
        if (!s || typeof s !== 'object') {
          SAVE.vetStats[p.id] = { salud: VET_MAX, hambre: VET_MAX, limpio: VET_MAX, enferma: false };
        } else {
          if (typeof s.salud !== 'number') s.salud = VET_MAX;
          if (typeof s.hambre !== 'number') s.hambre = VET_MAX;
          if (typeof s.limpio !== 'number') s.limpio = VET_MAX;
          if (typeof s.enferma !== 'boolean') s.enferma = false;
        }
      });
    } catch (e) {}
  },
  stat(id) {
    this.ensureSave();
    try { return SAVE.vetStats[id] || SAVE.vetStats.mily; } catch (e) { return { salud: 100, hambre: 100, limpio: 100, enferma: false }; }
  },

  /* ---------- caché Android ---------- */
  vGeo(key, make) {
    if (!this._geo[key]) this._geo[key] = make();
    return this._geo[key];
  },
  vMat(color, emissive, ei) {
    const k = color + '|' + (emissive || 0) + '|' + (ei || 0);
    if (!this._mat[k]) {
      this._mat[k] = new THREE.MeshStandardMaterial({
        color: color, roughness: 0.7, metalness: 0.05,
        emissive: emissive || 0x000000, emissiveIntensity: (ei == null ? 1 : ei)
      });
    }
    return this._mat[k];
  },
  vbx(parent, w, h, d, color, x, y, z, emissive, ei) {
    const m = new THREE.Mesh(this.vGeo('b' + w + 'x' + h + 'x' + d, () => new THREE.BoxGeometry(w, h, d)),
      this.vMat(color, emissive, ei));
    m.position.set(x, y, z); m.castShadow = true;
    parent.add(m); return m;
  },
  vcyl(parent, rt, rb, h, seg, color, x, y, z) {
    const m = new THREE.Mesh(this.vGeo('c' + rt + 'x' + rb + 'x' + h, () => new THREE.CylinderGeometry(rt, rb, h, seg || 10)),
      this.vMat(color));
    m.position.set(x, y, z); m.castShadow = true;
    parent.add(m); return m;
  },

  /* ---------- letrero 3D (diseño original) ---------- */
  _signTex() {
    try {
      if (typeof canvasTex !== 'function') return null;
      return canvasTex(512, 256, (g, w, h) => {
        g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
        g.strokeStyle = '#0e7c86'; g.lineWidth = 14; g.strokeRect(10, 10, w - 20, h - 20);
        // cruz roja de veterinaria (original)
        g.fillStyle = '#e63b3b';
        g.fillRect(36, 78, 100, 36); g.fillRect(68, 46, 36, 100);
        g.fillStyle = '#0e7c86'; g.textAlign = 'left';
        g.font = '900 64px "Trebuchet MS", sans-serif';
        g.fillText('🏥', 170, 118);
        g.font = '900 44px "Trebuchet MS", sans-serif';
        g.fillText('VETERINARIA', 245, 105);
        g.font = '900 58px "Trebuchet MS", sans-serif';
        g.fillStyle = '#e63b3b';
        g.fillText('GEAYI', 245, 168);
        g.fillStyle = '#0e7c86'; g.font = '700 30px "Trebuchet MS", sans-serif';
        g.fillText('🐾 cuidado con amor 🐾', 60, 218);
      });
    } catch (e) { return null; }
  },
  _doubleFace(parent, w, h, tex, x, y, z, ry) {
    const g = new THREE.Group();
    const geo = this.vGeo('sign' + w + 'x' + h, () => new THREE.PlaneGeometry(w, h));
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: false });
    const f = new THREE.Mesh(geo, mat); f.position.z = 0.03; g.add(f);
    const b = new THREE.Mesh(geo, mat); b.position.z = -0.03; b.rotation.y = Math.PI; g.add(b);
    // marco
    const fr = new THREE.Mesh(this.vGeo('signf' + w + 'x' + h, () => new THREE.BoxGeometry(w + 0.3, h + 0.3, 0.08)),
      this.vMat(0x0e7c86));
    fr.position.z = 0; g.add(fr);
    g.position.set(x, y, z); g.rotation.y = ry || 0;
    parent.add(g); return g;
  },

  /* ---------- perrito original en bloques (~1.2 de largo, cabe en la camilla) ---------- */
  _buildDog(def) {
    const g = new THREE.Group();
    const fur = def.fur, belly = def.belly, earC = def.ear, acc = def.accent;
    const B = (w, h, d, c, x, y, z) => {
      const m = new THREE.Mesh(this.vGeo('vd' + w + 'x' + h + 'x' + d, () => new THREE.BoxGeometry(w, h, d)),
        this.vMat(c, 0xffffff, 0));
      m.position.set(x, y, z); m.castShadow = true; g.add(m); return m;
    };
    B(0.55, 0.42, 0.85, fur, 0, 0.42, 0);                 // cuerpo
    B(0.50, 0.18, 0.80, belly, 0, 0.24, 0);               // pancita
    if (def.patch) {                                      // manchas (Kiara)
      B(0.56, 0.20, 0.22, def.patch, 0, 0.52, -0.18);
      B(0.56, 0.16, 0.18, def.patch, 0.02, 0.54, 0.22);
    }
    const head = new THREE.Group(); head.position.set(0, 0.72, 0.52); g.add(head);
    const HB = (w, h, d, c, x, y, z) => {
      const m = new THREE.Mesh(this.vGeo('vd' + w + 'x' + h + 'x' + d, () => new THREE.BoxGeometry(w, h, d)),
        this.vMat(c, 0xffffff, 0));
      m.position.set(x, y, z); head.add(m); return m;
    };
    HB(0.42, 0.40, 0.40, fur, 0, 0, 0);                    // cabeza
    HB(0.22, 0.16, 0.18, belly, 0, -0.10, 0.26);           // hocico
    HB(0.09, 0.08, 0.06, 0x222222, 0, -0.05, 0.36);        // nariz
    HB(0.07, 0.09, 0.03, 0x1a1a1a, -0.12, 0.06, 0.21);     // ojo L
    HB(0.07, 0.09, 0.03, 0x1a1a1a, 0.12, 0.06, 0.21);      // ojo R
    if (def.id === 'whini') HB(0.30, 0.22, 0.06, 0x232323, 0, -0.02, 0.22); // máscara negra
    const earL = HB(0.12, 0.22, 0.08, earC, -0.16, 0.28, 0); // orejas paradas
    const earR = HB(0.12, 0.22, 0.08, earC, 0.16, 0.28, 0);
    if (def.id === 'mily') {                              // barba blanca de schnauzer
      HB(0.30, 0.14, 0.10, 0xffffff, 0, -0.22, 0.24);
      HB(0.34, 0.08, 0.06, 0xffffff, -0.10, 0.16, 0.20);   // cejas
      HB(0.34, 0.08, 0.06, 0xffffff, 0.10, 0.16, 0.20);
    }
    if (def.id === 'kiara') HB(0.44, 0.10, 0.42, acc, 0, -0.16, -0.02); // collar rosa
    const legs = [];
    [[-0.19, 0.30], [0.19, 0.30], [-0.19, -0.30], [0.19, -0.30]].forEach(p => {
      legs.push(B(0.14, 0.30, 0.14, def.id === 'mily' ? 0xffffff : fur, p[0], 0.15, p[1]));
    });
    const tail = B(0.10, 0.10, 0.34, earC, 0, 0.58, -0.52); // cola
    tail.rotation.x = -0.6;
    g.userData = { tail: tail, legs: legs, head: head, mats: [] };
    g.traverse(o => { if (o.material && g.userData.mats.indexOf(o.material) < 0) g.userData.mats.push(o.material); });
    return g;
  },

  /* ---------- persona NPC original (cliente) ---------- */
  _buildPerson(shirt, pants, skin) {
    const g = new THREE.Group();
    const B = (w, h, d, c, x, y, z) => {
      const m = new THREE.Mesh(this.vGeo('vp' + w + 'x' + h + 'x' + d, () => new THREE.BoxGeometry(w, h, d)),
        this.vMat(c));
      m.position.set(x, y, z); m.castShadow = true; g.add(m); return m;
    };
    B(0.22, 0.75, 0.22, pants, -0.14, 0.38, 0);
    B(0.22, 0.75, 0.22, pants, 0.14, 0.38, 0);
    B(0.62, 0.75, 0.36, shirt, 0, 1.12, 0);
    B(0.16, 0.62, 0.16, shirt, -0.40, 1.10, 0);
    B(0.16, 0.62, 0.16, shirt, 0.40, 1.10, 0);
    B(0.34, 0.36, 0.32, skin, 0, 1.68, 0);
    B(0.36, 0.12, 0.34, 0x3a2a1a, 0, 1.90, 0);
    B(0.07, 0.08, 0.03, 0x1a1a1a, -0.08, 1.70, 0.17);
    B(0.07, 0.08, 0.03, 0x1a1a1a, 0.08, 1.70, 0.17);
    return g;
  },

  /* ================================================================== */
  /* Clínica 3D en Immokalee (idx 3)                                    */
  /* ================================================================== */
  buildForLevel(i, lvlOrGroup) {
    if (this._clinic) {
      try {
        const pg = (lvlOrGroup && lvlOrGroup.group) ? lvlOrGroup.group : lvlOrGroup;
        if (pg && typeof pg.remove === 'function') pg.remove(this._clinic);
      } catch (e) {}
      this._clinic = null; this._tablePet = null; this._tablePetId = null; this._client = null;
    }
    if (i !== 3) return 0; // la veterinaria solo existe en Immokalee
    try {
      if (typeof THREE === 'undefined') return 0;
      const lvl = (lvlOrGroup && lvlOrGroup.group) ? lvlOrGroup : null;
      const group = lvl ? lvl.group : lvlOrGroup;
      if (!group) return 0;
      const cx = VET_SPOT.x, cz = VET_SPOT.z, W = VET_SPOT.w, D = VET_SPOT.d;
      const g = new THREE.Group();
      const x0 = cx - W / 2, x1 = cx + W / 2, z0 = cz - D / 2, z1 = cz + D / 2; // oeste abierto

      /* piso de loseta clara */
      const floor = new THREE.Mesh(this.vGeo('vetfloor', () => new THREE.BoxGeometry(W, 0.12, D)),
        this.vMat(0xdff5f0));
      floor.position.set(cx, 0.0, cz); floor.receiveShadow = true; g.add(floor);
      /* franja de entrada (huellitas) */
      const mat1 = new THREE.Mesh(this.vGeo('vetmat', () => new THREE.BoxGeometry(3, 0.14, 4.5)),
        this.vMat(0x59d867, 0x59d867, 0.25));
      mat1.position.set(x0 + 1.5, 0.02, cz); g.add(mat1);

      /* paredes: este completa, norte y sur; OESTE ABIERTO (entrada) */
      const wallC = 0xffffff, trimC = 0x0e7c86;
      this.vbx(g, 0.4, 3.2, D, wallC, x1, 1.6, cz);                    // este
      this.vbx(g, 0.5, 0.5, D, trimC, x1, 3.1, cz);                    // remate este
      this.vbx(g, W, 3.2, 0.4, wallC, cx, 1.6, z0);                    // norte
      this.vbx(g, W, 0.5, 0.5, trimC, cx, 3.1, z0);
      this.vbx(g, W, 3.2, 0.4, wallC, cx, 1.6, z1);                    // sur
      this.vbx(g, W, 0.5, 0.5, trimC, cx, 3.1, z1);
      /* ventanales en norte y sur (vidrio celeste) */
      for (let k = 0; k < 3; k++) {
        const wx = cx - 6 + k * 6;
        this.vbx(g, 3.2, 1.4, 0.1, 0x9fd8ff, wx, 1.9, z0, 0x9fd8ff, 0.35);
        this.vbx(g, 3.2, 1.4, 0.1, 0x9fd8ff, wx, 1.9, z1, 0x9fd8ff, 0.35);
      }
      /* techo plano + cruz roja en el techo */
      this.vbx(g, W + 0.8, 0.25, D + 0.8, trimC, cx, 3.45, cz);
      this.vbx(g, 2.4, 0.35, 0.8, 0xe63b3b, cx, 3.75, cz, 0xe63b3b, 0.3);
      this.vbx(g, 0.8, 0.35, 2.4, 0xe63b3b, cx, 3.75, cz, 0xe63b3b, 0.3);

      /* entrada oeste: 2 postes + toldo */
      this.vbx(g, 0.35, 3.2, 0.35, trimC, x0, 1.6, cz - 4);
      this.vbx(g, 0.35, 3.2, 0.35, trimC, x0, 1.6, cz + 4);
      this.vbx(g, 3.4, 0.16, 9.5, 0xff8a5c, x0 - 1.6, 3.15, cz, 0xff8a5c, 0.15); // toldo naranja

      /* letrero 3D doble cara sobre la entrada */
      this.vbx(g, 0.3, 1.6, 0.3, trimC, x0 - 1.6, 4.2, cz - 3.2);
      this.vbx(g, 0.3, 1.6, 0.3, trimC, x0 - 1.6, 4.2, cz + 3.2);
      const tex = this._signTex();
      if (tex) this._doubleFace(g, 7.5, 3.2, tex, x0 - 1.6, 5.4, cz, -Math.PI / 2);
      else this.vbx(g, 0.2, 3.2, 7.5, wallC, x0 - 1.6, 5.4, cz); // respaldo sin canvas

      /* sala de espera: 3 bancas al norte */
      for (let k = 0; k < 3; k++) {
        const bx = cx - 6 + k * 6;
        this.vbx(g, 2.6, 0.14, 0.7, 0xb08968, bx, 0.55, z0 + 1.1);
        this.vbx(g, 0.16, 0.55, 0.6, 0x8a5a33, bx - 1.1, 0.28, z0 + 1.1);
        this.vbx(g, 0.16, 0.55, 0.6, 0x8a5a33, bx + 1.1, 0.28, z0 + 1.1);
        this.vbx(g, 2.6, 0.7, 0.12, 0xb08968, bx, 1.0, z0 + 0.75); // respaldo
      }
      /* mesita + planta */
      this.vcyl(g, 0.55, 0.55, 0.1, 10, 0x8a5a33, cx + 7.5, 0.5, z0 + 1.6);
      this.vcyl(g, 0.08, 0.08, 0.5, 8, 0x8a5a33, cx + 7.5, 0.25, z0 + 1.6);
      this.vcyl(g, 0.35, 0.28, 0.45, 10, 0xc96f4a, cx + 2, 0.22, z1 - 1.2); // maceta
      const bush = new THREE.Mesh(this.vGeo('vetbush', () => new THREE.ConeGeometry(0.55, 1.1, 8)),
        this.vMat(0x2fae4f));
      bush.position.set(cx + 2, 1.0, z1 - 1.2); bush.castShadow = true; g.add(bush);

      /* recepción (mostrador al sureste) */
      this.vbx(g, 3.4, 1.1, 1.0, 0xf2e0a8, x1 - 2.2, 0.55, z1 - 1.0);
      this.vbx(g, 3.4, 0.12, 1.1, trimC, x1 - 2.2, 1.16, z1 - 1.0);
      const rtex = (() => {
        try {
          if (typeof canvasTex !== 'function') return null;
          return canvasTex(256, 64, (gg, w, h) => {
            gg.fillStyle = '#0e7c86'; gg.fillRect(0, 0, w, h);
            gg.fillStyle = '#ffffff'; gg.font = '900 34px "Trebuchet MS", sans-serif';
            gg.textAlign = 'center'; gg.fillText(_vetT('vet.reception'), w / 2, 44);
          });
        } catch (e) { return null; }
      })();
      if (rtex) this._doubleFace(g, 3.0, 0.75, rtex, x1 - 2.2, 2.1, z1 - 1.0, 0);

      /* camilla de examen (centro-este) */
      const tx = cx + 5, tz = cz;
      this.vbx(g, 2.6, 0.18, 1.3, 0xffffff, tx, 0.95, tz, 0xffffff, 0.1);   // colchoneta
      this.vbx(g, 2.6, 0.10, 1.3, 0x9fd8ff, tx, 0.82, tz);                 // base celeste
      [[-1.1, -0.5], [1.1, -0.5], [-1.1, 0.5], [1.1, 0.5]].forEach(p => {
        this.vbx(g, 0.12, 0.78, 0.12, 0x8a8f9a, tx + p[0], 0.39, tz + p[1]); // patas metal
      });
      this.vbx(g, 2.2, 0.08, 0.9, 0xd6dbe2, tx, 0.30, tz);                 // repisa
      /* lámpara de examen */
      this.vbx(g, 0.12, 2.2, 0.12, 0x8a8f9a, tx + 1.5, 1.9, tz - 0.9);
      this.vbx(g, 1.1, 0.12, 0.12, 0x8a8f9a, tx + 1.0, 2.95, tz - 0.9);
      const lamp = new THREE.Mesh(this.vGeo('vetlamp', () => new THREE.ConeGeometry(0.35, 0.4, 10)),
        this.vMat(0xffe95e, 0xffe95e, 0.7));
      lamp.position.set(tx + 0.5, 2.8, tz - 0.9); g.add(lamp);

      /* huellitas del piso: de la entrada a la camilla */
      for (let k = 0; k < 4; k++) {
        const paw = new THREE.Mesh(this.vGeo('vetpaw', () => new THREE.CylinderGeometry(0.22, 0.22, 0.02, 10)),
          this.vMat(0x0e7c86, 0x0e7c86, 0.2));
        paw.position.set(x0 + 3 + k * 2.2, 0.08, cz + (k % 2 ? 0.5 : -0.5));
        g.add(paw);
      }

      this._clinic = g;
      this._petBaseY = 1.04;
      group.add(g);
      this._placePetOnTable(this._sel, g);
      try { this._refreshSideBtn(); } catch (e) {}
      return 1;
    } catch (e) { return 0; }
  },

  /* mascota elegida sobre la camilla */
  _placePetOnTable(id, clinicGroup) {
    try {
      const g = clinicGroup || this._clinic;
      if (!g || typeof THREE === 'undefined') return;
      if (this._tablePet) { try { g.remove(this._tablePet); } catch (e) {} this._tablePet = null; }
      const def = _vetPetDef(id);
      const pet = this._buildDog(def);
      pet.position.set(VET_SPOT.x + 5, this._petBaseY, VET_SPOT.z);
      pet.rotation.y = -Math.PI / 2; // mirando a la entrada (oeste)
      g.add(pet);
      this._tablePet = pet; this._tablePetId = id;
      this._shineT = 0;
    } catch (e) {}
  },
  selectPet(id) {
    _vetClick();
    this._sel = _vetPetDef(id).id;
    this._placePetOnTable(this._sel);
    try { this._renderPanel(); } catch (e) {}
  },

  /* ---------- cuidados ---------- */
  cure(id) {
    const st = this.stat(id);
    if (!st.enferma) { _vetToast(_vetT('vet.healthy')); return { ok: false, reason: 'healthy' }; }
    st.enferma = false;
    st.salud = Math.min(VET_MAX, st.salud + 35);
    try { if (typeof persist === 'function') persist(); } catch (e) {}
    _vetEarn(VET_CURE_PAY);
    _vetBurst(VET_SPOT.x + 5, 2.0, VET_SPOT.z, [0x59d867, 0xffffff, 0x9dffb0], 22, 4);
    _vetClick();
    _vetToast(_vetT('vet.cured'));
    try { this._renderPanel(); } catch (e) {}
    return { ok: true, coins: VET_CURE_PAY };
  },
  feed(id) {
    const st = this.stat(id);
    if (st.hambre >= VET_MAX) { _vetToast(_vetT('vet.full')); return { ok: false, reason: 'full' }; }
    st.hambre = Math.min(VET_MAX, st.hambre + 25);
    try { if (typeof persist === 'function') persist(); } catch (e) {}
    this._wagT = 3; this._hopT = 1.6; // cola feliz + saltito de alegría
    _vetBurst(VET_SPOT.x + 5, 1.9, VET_SPOT.z, [0xff8ab3, 0xffd23f, 0xffffff], 16, 3);
    _vetClick();
    _vetToast(_vetT('vet.fed'));
    try { this._renderPanel(); } catch (e) {}
    return { ok: true };
  },
  bathe(id) {
    const st = this.stat(id);
    if (st.limpio >= VET_MAX) { _vetToast(_vetT('vet.clean')); return { ok: false, reason: 'clean' }; }
    st.limpio = Math.min(VET_MAX, st.limpio + 30);
    try { if (typeof persist === 'function') persist(); } catch (e) {}
    this._shineT = 5; // queda brillante unos segundos
    _vetBurst(VET_SPOT.x + 5, 1.8, VET_SPOT.z, [0xffffff, 0xeaf6ff, 0xcfeaff, 0x9fd8ff], 30, 3);
    _vetClick();
    _vetToast(_vetT('vet.bathed'));
    try { this._renderPanel(); } catch (e) {}
    return { ok: true };
  },

  /* ---------- cliente NPC con mascota enferma ---------- */
  _spawnClient() {
    try {
      if (!this._clinic || typeof THREE === 'undefined') return;
      const g = new THREE.Group();
      const person = this._buildPerson(0x4fc3f7, 0x37474f, 0xe8b88a);
      person.position.set(VET_SPOT.x + 7.5, 0, VET_SPOT.z + 3.2);
      person.rotation.y = Math.PI; // mirando al mostrador
      g.add(person);
      const dog = this._buildDog(VET_PETS[(Math.random() * VET_PETS.length) | 0]);
      dog.position.set(VET_SPOT.x + 7.5, 0.02, VET_SPOT.z + 1.6);
      dog.rotation.y = Math.PI;
      // vendaje: patita cuidada con amor (nada de daño)
      const band = new THREE.Mesh(this.vGeo('vetband', () => new THREE.BoxGeometry(0.16, 0.16, 0.16)),
        this.vMat(0xffffff));
      band.position.set(0.19, 0.10, 0.30); dog.add(band);
      g.add(dog);
      this._clinic.add(g);
      const names = ['Peludito', 'Toby', 'Luna', 'Rocky', 'Nena', 'Max'];
      this._client = { group: g, dog: dog, name: names[(Math.random() * names.length) | 0], wait: 75, happy: 0 };
      try { this._renderPanel(); } catch (e) {}
    } catch (e) {}
  },
  _removeClient() {
    try {
      if (this._client && this._clinic) this._clinic.remove(this._client.group);
    } catch (e) {}
    this._client = null;
    try { this._renderPanel(); } catch (e) {}
  },
  cureClient() {
    if (!this._client) return { ok: false };
    _vetEarn(VET_CURE_PAY);
    _vetBurst(VET_SPOT.x + 7.5, 1.6, VET_SPOT.z + 2.4, [0x59d867, 0xffffff, 0xffd23f], 24, 4);
    _vetClick();
    _vetToast(_vetT('vet.clientThanks'));
    this._client.happy = 1.2; // salta de alegría y se va
    const c = this._client;
    setTimeout(() => { if (this._client === c) this._removeClient(); }, 1300);
    this._clientCd = 45 + Math.random() * 40;
    try { this._renderPanel(); } catch (e) {}
    return { ok: true, coins: VET_CURE_PAY };
  },

  /* los stats bajan despacio con el tiempo jugado */
  tickMinute() {
    this.ensureSave();
    try {
      VET_PETS.forEach(p => {
        const st = SAVE.vetStats[p.id];
        st.hambre = Math.max(0, st.hambre - 3);
        st.limpio = Math.max(0, st.limpio - 3);
        st.salud = Math.max(0, st.salud - 2);
        if (st.salud <= 25 && !st.enferma) st.enferma = true; // se enferma si se descuida
      });
      if (typeof persist === 'function') persist();
    } catch (e) {}
  },

  /* ---------- por cuadro ---------- */
  update(dt) {
    try {
      if (typeof MODE === 'undefined' || MODE !== 'play') return;
      const inVet = (typeof LEVEL !== 'undefined' && LEVEL && LEVEL.idx === 3) && !!this._clinic;
      /* decaimiento lento de stats */
      if (inVet) {
        this._acc += dt;
        while (this._acc >= 60) { this._acc -= 60; this.tickMinute(); }
      }
      /* animación de la mascota en la camilla: mueve la cola */
      if (this._tablePet && this._tablePet.userData && this._tablePet.userData.tail) {
        const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() / 1000 : 0;
        const fast = this._wagT > 0 ? 14 : 6;
        const amp = this._wagT > 0 ? 0.7 : 0.35;
        this._tablePet.userData.tail.rotation.y = Math.sin(now * fast) * amp;
        if (this._wagT > 0) this._wagT -= dt;
        if (this._hopT > 0) { // saltito de alegría al comer
          this._hopT -= dt;
          this._tablePet.position.y = this._petBaseY + Math.abs(Math.sin(now * 10)) * 0.22;
          if (this._hopT <= 0) this._tablePet.position.y = this._petBaseY;
        }
        if (this._shineT > 0) { // brillante tras el baño
          this._shineT -= dt;
          const k = 0.18 + 0.14 * Math.sin(now * 9);
          (this._tablePet.userData.mats || []).forEach(m => {
            try { m.emissiveIntensity = Math.max(0, k); } catch (e) {}
          });
          if (this._shineT <= 0) (this._tablePet.userData.mats || []).forEach(m => {
            try { m.emissiveIntensity = 0; } catch (e) {}
          });
        }
      }
      /* cliente NPC: llega cuando el jugador está cerca, espera, se va */
      if (inVet && typeof Player !== 'undefined' && Player && Player.pos) {
        const dx = Player.pos.x - VET_SPOT.x, dz = Player.pos.z - VET_SPOT.z;
        const near = (dx * dx + dz * dz) < 40 * 40;
        if (!this._client) {
          this._clientCd -= dt;
          if (near && this._clientCd <= 0) { this._spawnClient(); this._clientCd = 60 + Math.random() * 60; }
        } else {
          const c = this._client;
          if (c.happy > 0) {
            c.happy -= dt;
            c.group.position.y = Math.abs(Math.sin(c.happy * 12)) * 0.35; // salta de alegría
          } else {
            c.wait -= dt;
            if (c.dog && c.dog.userData && c.dog.userData.tail) {
              const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() / 1000 : 0;
              c.dog.userData.tail.rotation.y = Math.sin(now * 5) * 0.3;
            }
            if (c.wait <= 0) { this._removeClient(); _vetToast(_vetT('vet.clientLeft')); this._clientCd = 50 + Math.random() * 40; }
          }
        }
      }
      this._refreshSideBtn();
    } catch (e) {}
  },

  /* ================================================================== */
  /* UI táctil                                                          */
  /* ================================================================== */
  init() {
    if (this._inited) return;
    this._inited = true;
    this.ensureSave();
    if (typeof document === 'undefined') return;
    try {
      if (!document.getElementById('vet-css')) {
        const st = document.createElement('style');
        st.id = 'vet-css';
        st.textContent =
          '.vet-ov{position:fixed;inset:0;z-index:9990;display:flex;align-items:center;justify-content:center;background:rgba(5,1,15,.78);padding:12px}' +
          '.vet-card{background:#10262b;border:2px solid #0e7c86;border-radius:18px;max-width:560px;width:100%;max-height:92vh;display:flex;flex-direction:column;color:#fff;box-shadow:0 0 30px #0e7c8655}' +
          '.vet-head{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid #0e7c86}' +
          '.vet-head h2{margin:0;font-size:20px;flex:1}' +
          '.vet-sub{padding:8px 14px 0;color:#bfe9ec;font-size:14px}' +
          '.vet-body{padding:12px 14px;overflow-y:auto}' +
          '.vet-pets{display:flex;gap:8px;margin-bottom:10px}' +
          '.vet-pet{flex:1;background:#0b1c20;border:2px solid #1e4a52;border-radius:14px;padding:8px 6px;text-align:center;cursor:pointer;min-height:52px;touch-action:manipulation}' +
          '.vet-pet.sel{border-color:#ffd23f;box-shadow:0 0 12px #ffd23f66}' +
          '.vet-pet .emoji{font-size:30px}' +
          '.vet-pet .pname{font-weight:900;font-size:15px;margin:2px 0}' +
          '.vet-pet .pdesc{font-size:11px;color:#9fc6cb;min-height:26px}' +
          '.vet-bar{height:8px;border-radius:6px;background:#22363b;margin:3px 0;overflow:hidden}' +
          '.vet-bar i{display:block;height:100%;border-radius:6px}' +
          '.vet-sick{display:inline-block;background:#e63b3b;color:#fff;font-weight:900;font-size:12px;border-radius:8px;padding:2px 8px;margin-top:4px}' +
          '.vet-actions{display:flex;gap:8px;margin:10px 0}' +
          '.vet-btn{flex:1;min-height:56px;border-radius:14px;border:0;font-weight:900;font-size:16px;cursor:pointer;color:#fff;touch-action:manipulation}' +
          '.vet-btn.cure{background:#2e9e5b}.vet-btn.feed{background:#e8912d}.vet-btn.bathe{background:#2d9de8}' +
          '.vet-btn.off{opacity:.45}' +
          '.vet-client{background:#0b1c20;border:2px dashed #ffd23f;border-radius:14px;padding:10px;margin:8px 0;text-align:center}' +
          '.vet-hint{padding:16px;text-align:center;color:#bfe9ec}' +
          '.vet-foot{padding:10px 14px;border-top:1px solid #0e7c86}' +
          '.vet-close{width:100%;min-height:52px;border-radius:14px;border:0;background:#3a3f55;color:#fff;font-weight:900;font-size:17px;cursor:pointer;touch-action:manipulation}';
        document.head.appendChild(st);
      }
      /* botón 🏥 en el side-menu (abre la clínica) */
      const sm = document.getElementById('side-menu');
      if (sm && !document.getElementById('btn-side-vet')) {
        const b = document.createElement('button');
        b.id = 'btn-side-vet';
        b.className = 'side-btn';
        b.setAttribute('aria-label', 'Veterinaria');
        b.innerHTML = '<span style="font-size:26px">🏥</span><span>' + _vetT('vet.open') + '</span>';
        b.addEventListener('click', () => { _vetClick(); this.open(); });
        sm.appendChild(b);
      }
      this._refreshSideBtn();
    } catch (e) {}
  },
  _refreshSideBtn() {
    try {
      const b = document.getElementById('btn-side-vet');
      if (!b) return;
      const show = (typeof LEVEL !== 'undefined' && LEVEL && LEVEL.idx === 3);
      b.style.display = show ? '' : 'none';
    } catch (e) {}
  },
  open() {
    try {
      _vetClick();
      /* estado aleatorio al entrar: una mascota descuidada puede enfermar */
      if (typeof LEVEL !== 'undefined' && LEVEL && LEVEL.idx === 3) {
        this.ensureSave();
        if (Math.random() < 0.22) {
          const cands = VET_PETS.filter(p => { const s = this.stat(p.id); return !s.enferma && s.salud < 70; });
          if (cands.length) {
            const pick = cands[(Math.random() * cands.length) | 0];
            this.stat(pick.id).enferma = true;
            try { if (typeof persist === 'function') persist(); } catch (e) {}
            _vetToast(_vetT('vet.gotSick').replace('{name}', _vetT(pick.nameKey)));
          }
        }
      }
      this._renderPanel();
      const ov = document.getElementById('vet-ov');
      if (ov) ov.classList.remove('hidden');
    } catch (e) {}
  },
  close() {
    try { const ov = document.getElementById('vet-ov'); if (ov) ov.classList.add('hidden'); } catch (e) {}
  },
  _bar(pct, color) {
    const c = Math.max(0, Math.min(100, Math.round(pct)));
    return '<div class="vet-bar"><i style="width:' + c + '%;background:' + color + '"></i></div>';
  },
  _renderPanel() {
    try {
      let ov = document.getElementById('vet-ov');
      if (!ov) {
        ov = document.createElement('div');
        ov.id = 'vet-ov';
        ov.className = 'vet-ov hidden';
        ov.addEventListener('click', (e) => { if (e.target === ov) this.close(); });
        const card = document.createElement('div');
        card.className = 'vet-card';
        card.innerHTML =
          '<div class="vet-head"><h2>🏥 <span id="vet-title"></span></h2></div>' +
          '<div class="vet-sub" id="vet-sub"></div>' +
          '<div class="vet-body" id="vet-body"></div>' +
          '<div class="vet-foot"><button class="vet-close" id="vet-close"></button></div>';
        ov.appendChild(card);
        document.body.appendChild(ov);
        document.getElementById('vet-close').addEventListener('click', () => { _vetClick(); this.close(); });
      }
      document.getElementById('vet-title').textContent = _vetT('vet.title');
      document.getElementById('vet-sub').textContent = _vetT('vet.subtitle');
      document.getElementById('vet-close').textContent = _vetT('vet.close');
      const body = document.getElementById('vet-body');
      const inVet = (typeof LEVEL !== 'undefined' && LEVEL && LEVEL.idx === 3);
      if (!inVet) { body.innerHTML = '<div class="vet-hint">🌴 ' + _vetT('vet.hint') + '</div>'; return; }
      let html = '<div class="vet-pets">';
      VET_PETS.forEach(p => {
        const st = this.stat(p.id);
        html += '<div class="vet-pet' + (this._sel === p.id ? ' sel' : '') + '" data-vetpet="' + p.id + '">' +
          '<div class="emoji">' + p.emoji + '</div>' +
          '<div class="pname">' + _vetT(p.nameKey) + '</div>' +
          '<div class="pdesc">' + _vetT(p.descKey) + '</div>' +
          '<div style="font-size:11px;text-align:left">❤️ ' + _vetT('vet.st.salud') + '</div>' + this._bar(st.salud, '#e63b3b') +
          '<div style="font-size:11px;text-align:left">🍖 ' + _vetT('vet.st.hambre') + '</div>' + this._bar(st.hambre, '#e8912d') +
          '<div style="font-size:11px;text-align:left">🧼 ' + _vetT('vet.st.limpio') + '</div>' + this._bar(st.limpio, '#2d9de8') +
          (st.enferma ? '<span class="vet-sick">' + _vetT('vet.sick') + '</span>' : '') +
          '</div>';
      });
      html += '</div>';
      const sel = this.stat(this._sel);
      html += '<div class="vet-actions">' +
        '<button class="vet-btn cure' + (sel.enferma ? '' : ' off') + '" data-vetact="cure">' + _vetT('vet.cure') + '<br>' + _vetT('vet.pay') + '</button>' +
        '<button class="vet-btn feed" data-vetact="feed">' + _vetT('vet.feed') + '</button>' +
        '<button class="vet-btn bathe" data-vetact="bathe">' + _vetT('vet.bathe') + '</button>' +
        '</div>';
      if (this._client) {
        html += '<div class="vet-client">🐶 <b>' + _vetT('vet.client') + '</b><br>' +
          this._client.name + ' ' + _vetT('vet.clientSick') + '<br><br>' +
          '<button class="vet-btn cure" style="width:100%" data-vetact="cureClient">' + _vetT('vet.cureClient') + '</button></div>';
      }
      body.innerHTML = html;
      const self = this;
      body.querySelectorAll('[data-vetpet]').forEach(el => {
        el.addEventListener('click', () => self.selectPet(el.getAttribute('data-vetpet')));
      });
      body.querySelectorAll('[data-vetact]').forEach(el => {
        el.addEventListener('click', () => {
          const a = el.getAttribute('data-vetact');
          if (a === 'cure') self.cure(self._sel);
          else if (a === 'feed') self.feed(self._sel);
          else if (a === 'bathe') self.bathe(self._sel);
          else if (a === 'cureClient') self.cureClient();
        });
      });
    } catch (e) {}
  }
};

if (typeof window !== 'undefined') window.Vet = Vet;
