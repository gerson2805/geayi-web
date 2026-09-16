/* pets.js — 🐾 MASCOTAS SEGUIDORAS + TIENDA DE MASCOTAS
   - Catálogo: 60 mascotas comprables (6 especies × 10 colores), diseños
     originales hechos con cajas. Especies: perro, gato, conejo, pájaro,
     hámster, tortuga (+ dragón/unicornio/robotito premium de monetiza.js).
   - Guardado: SAVE.ownedPets (array de ids), SAVE.activePet (id o 'none').
     Migra SAVE.pet='dog'/'cat' legado → ownedPets/activePet. petId() sigue
     devolviendo la especie ('dog'|'cat'|...) o 'none' (lo usa citylife3 y tests).
   - Pets.onLevelStart(): (re)construye la mascota activa y la añade a scene.
   - updatePets(dt): la mascota sigue al jugador (bob al caminar, salto,
     aleteo en pájaros, bamboleo en tortugas). Solo visible en MODE==='play'.
   - window.PetShop = { open() }: panel catálogo estilo dealership.js
     (comprar con monedas, elegir activa). Se abre desde Personalizar → Animales.
   - renderPetSection(): llena #animals-grid con botón de tienda + 'Ninguna' +
     mascotas del jugador. Mantiene PET_CHOICES por compatibilidad.
*/
'use strict';

/* ---------- i18n ---------- */
addStrings('es', {
  'pet.title': '🐾 Mascotas seguidoras',
  'pet.none': 'Ninguna',
  'pet.dog': 'Perrito',
  'pet.cat': 'Gatito',
  'pet.name_dog': 'Peludito',
  'pet.name_cat': 'Misifu',
  'pet.chosen': '✅ Te acompaña',
  'pet.choose': 'Elegir',
  'pet.picked': '🐾 ¡Tu mascota te acompaña!',
  'pet.sp_dog': 'Perritos',
  'pet.sp_cat': 'Gatitos',
  'pet.sp_rabbit': 'Conejitos',
  'pet.sp_bird': 'Pajaritos',
  'pet.sp_hamster': 'Hámsters',
  'pet.sp_turtle': 'Tortugas',
  'petshop.title': '🐾 Tienda de Mascotas',
  'petshop.all': 'Todas',
  'petshop.buy': 'Comprar',
  'petshop.choose': 'Elegir',
  'petshop.owned': '✅ Tuya',
  'petshop.active': '✅ Te acompaña',
  'petshop.noCoins': '❌ No tienes monedas suficientes.',
  'petshop.bought': '🐾 ¡Mascota comprada! Ya te acompaña.',
  'petshop.note': '60 mascotas: 6 especies × 10 colores. ¡Elige tus favoritas! 🐶🐱🐰🐦🐹🐢',
  'petshop.shopBtn': 'Ver tienda de mascotas',
  'petshop.shopHint': '🐶🐱🐰🐦🐹🐢 60 para elegir',
});
addStrings('en', {
  'pet.title': '🐾 Follower pets',
  'pet.none': 'None',
  'pet.dog': 'Puppy',
  'pet.cat': 'Kitten',
  'pet.name_dog': 'Fluffy',
  'pet.name_cat': 'Mittens',
  'pet.chosen': '✅ Follows you',
  'pet.choose': 'Choose',
  'pet.picked': '🐾 Your pet follows you now!',
  'pet.sp_dog': 'Puppies',
  'pet.sp_cat': 'Kittens',
  'pet.sp_rabbit': 'Bunnies',
  'pet.sp_bird': 'Birds',
  'pet.sp_hamster': 'Hamsters',
  'pet.sp_turtle': 'Turtles',
  'petshop.title': '🐾 Pet Shop',
  'petshop.all': 'All',
  'petshop.buy': 'Buy',
  'petshop.choose': 'Choose',
  'petshop.owned': '✅ Yours',
  'petshop.active': '✅ Follows you',
  'petshop.noCoins': '❌ Not enough coins.',
  'petshop.bought': '🐾 Pet bought! It follows you now.',
  'petshop.note': '60 pets: 6 species × 10 colors. Pick your favorites! 🐶🐱🐰🐦🐹🐢',
  'petshop.shopBtn': 'Open pet shop',
  'petshop.shopHint': '🐶🐱🐰🐦🐹🐢 60 to choose',
});
addStrings('pt', {
  'pet.title': '🐾 Bichinhos seguidores',
  'pet.none': 'Nenhum',
  'pet.dog': 'Cachorrinho',
  'pet.cat': 'Gatinho',
  'pet.name_dog': 'Peludinho',
  'pet.name_cat': 'Mimi',
  'pet.chosen': '✅ Te acompanha',
  'pet.choose': 'Escolher',
  'pet.picked': '🐾 Seu bichinho te acompanha!',
});
addStrings('fr', {
  'pet.title': '🐾 Animaux de compagnie',
  'pet.none': 'Aucun',
  'pet.dog': 'Chiot',
  'pet.cat': 'Chaton',
  'pet.name_dog': 'Poilu',
  'pet.name_cat': 'Minou',
  'pet.chosen': '✅ Te suit',
  'pet.choose': 'Choisir',
  'pet.picked': '🐾 Ton animal te suit maintenant !',
});

/* ---------- catálogo: 6 especies × 10 colores = 60 mascotas ---------- */
const PET_COLORS = [
  { key: 'negro',    es: 'Negro',    en: 'Black',   hex: 0x2b2f3a },
  { key: 'blanco',   es: 'Blanco',   en: 'White',   hex: 0xf5f2ea },
  { key: 'cafe',     es: 'Café',     en: 'Brown',   hex: 0x8a5a28 },
  { key: 'gris',     es: 'Gris',     en: 'Gray',    hex: 0x9aa3b8 },
  { key: 'dorado',   es: 'Dorado',   en: 'Golden',  hex: 0xe8a020 },
  { key: 'crema',    es: 'Crema',    en: 'Cream',   hex: 0xf7e3c3 },
  { key: 'manchado', es: 'Manchado', en: 'Spotted', hex: 0xf5f2ea, spotted: true, spot: 0x8a5a28 },
  { key: 'rosa',     es: 'Rosa',     en: 'Pink',    hex: 0xf2a0b5 },
  { key: 'azul',     es: 'Azul',     en: 'Blue',    hex: 0x4a90d9 },
  { key: 'verde',    es: 'Verde',    en: 'Green',   hex: 0x59d867 },
];
const PET_SPECIES = [
  { species: 'dog',     key: 'perro',   emoji: '🐶', es: 'Perrito',  en: 'Puppy',   base: 50 },
  { species: 'cat',     key: 'gato',    emoji: '🐱', es: 'Gatito',   en: 'Kitten',  base: 50 },
  { species: 'rabbit',  key: 'conejo',  emoji: '🐰', es: 'Conejito', en: 'Bunny',   base: 40 },
  { species: 'bird',    key: 'pajaro',  emoji: '🐦', es: 'Pajarito', en: 'Bird',    base: 70 },
  { species: 'hamster', key: 'hamster', emoji: '🐹', es: 'Hámster',  en: 'Hamster', base: 30 },
  { species: 'turtle',  key: 'tortuga', emoji: '🐢', es: 'Tortuga',  en: 'Turtle',  base: 60 },
];
const PET_CATALOG = [];
PET_SPECIES.forEach(sp => {
  PET_COLORS.forEach((c, ci) => {
    PET_CATALOG.push({
      id: 'pet_' + sp.key + '_' + c.key,
      species: sp.species,
      color: c.hex,
      colorName: c.es,
      colorNameEn: c.en,
      name: sp.es + ' ' + c.es,
      nameEn: sp.en + ' ' + c.en,
      emoji: sp.emoji,
      price: sp.base + ci * 20, // 30–250 🪙: accesible, que la gente se dé gusto
      spotted: !!c.spotted,
      spot: c.spot || 0,
    });
  });
});
/* premium de monetiza.js (código familiar / pago demo): también se pueden seguir */
const PREMIUM_PET_DEFS = {
  pet_dragon: { id: 'pet_dragon', species: 'dragon', color: 0x3fae5a, colorName: '', name: 'Dragón Mini', nameEn: 'Mini Dragon', emoji: '🐲', price: 0 },
  pet_uni:    { id: 'pet_uni',    species: 'uni',    color: 0xf5f0ff, colorName: '', name: 'Unicornio',   nameEn: 'Unicorn',     emoji: '🦄', price: 0 },
  pet_robo:   { id: 'pet_robo',   species: 'robo',   color: 0x9aa5b1, colorName: '', name: 'Robotito',    nameEn: 'Little Robot', emoji: '🤖', price: 0 },
};
const PET_BY_ID = {};
PET_CATALOG.forEach(p => { PET_BY_ID[p.id] = p; });
Object.keys(PREMIUM_PET_DEFS).forEach(k => { PET_BY_ID[k] = PREMIUM_PET_DEFS[k]; });
function petDef(id) {
  try { return PET_BY_ID[id]; } catch (e) { return undefined; }
}

/* ---------- estado ---------- */
/* compat: antes solo había 3 opciones; se mantiene la constante */
const PET_CHOICES = [
  { id: 'none', emoji: '🚫', nameKey: 'pet.none' },
  { id: 'dog',  emoji: '🐶', nameKey: 'pet.dog' },
  { id: 'cat',  emoji: '🐱', nameKey: 'pet.cat' },
];

function ensurePetSave() {
  try {
    if (typeof SAVE === 'undefined' || !SAVE) return;
    if (!Array.isArray(SAVE.ownedPets)) SAVE.ownedPets = [];
    if (SAVE.activePet == null) SAVE.activePet = 'none';
  } catch (e) {}
}
/* migra el formato viejo (SAVE.pet='dog'/'cat' gratis) al nuevo */
function migratePetSave() {
  try {
    ensurePetSave();
    const p = SAVE.pet;
    let nid = null;
    if (p === 'dog') nid = 'pet_perro_negro';
    else if (p === 'cat') nid = 'pet_gato_negro';
    if (nid) {
      if (SAVE.ownedPets.indexOf(nid) === -1) SAVE.ownedPets.push(nid);
      if (!SAVE.activePet || SAVE.activePet === 'none') SAVE.activePet = nid;
    } else if (typeof p === 'string' && p !== 'none' && petDef(p)) {
      if (SAVE.ownedPets.indexOf(p) === -1) SAVE.ownedPets.push(p);
      if (!SAVE.activePet || SAVE.activePet === 'none') SAVE.activePet = p;
    }
  } catch (e) {}
}
/* id de la mascota activa ('none' si no hay) */
function activePetId() {
  try {
    migratePetSave();
    const a = SAVE.activePet;
    if (typeof a === 'string' && a !== 'none' && petDef(a)) return a;
    if (a === 'none') return 'none';
    const p = SAVE.pet; // respaldo legado (tests y monetiza.js)
    if (typeof p === 'string' && p !== 'none') {
      if (petDef(p)) return p;
      if (p === 'dog') return 'pet_perro_negro';
      if (p === 'cat') return 'pet_gato_negro';
    }
    return 'none';
  } catch (e) { return 'none'; }
}
/* especie de la mascota activa o 'none' (contrato que usan citylife3 y tests).
   NOTA: debe seguir siendo `function` reasignable: monetiza.js la envuelve. */
function petId() {
  try {
    const id = activePetId();
    if (id === 'none') return 'none';
    const def = petDef(id);
    return def ? def.species : 'none';
  } catch (e) { return 'none'; }
}
function ownsPet(id) {
  try { ensurePetSave(); return SAVE.ownedPets.indexOf(id) !== -1; }
  catch (e) { return false; }
}
function setActivePet(id) {
  try {
    ensurePetSave();
    if (id !== 'none') {
      const def = petDef(id);
      if (!def || SAVE.ownedPets.indexOf(id) === -1) return false;
    }
    SAVE.activePet = id;
    const def = petDef(id);
    /* compat: citylife3.js y community.js leen SAVE.pet para perro/gato */
    if (def && (def.species === 'dog' || def.species === 'cat')) SAVE.pet = def.species;
    else if (id === 'none') SAVE.pet = 'none';
    try { persist(); } catch (e) {}
    return true;
  } catch (e) { return false; }
}

/* ---------- sección del menú (Personalizar → Animales) ---------- */
function renderPetSection() {
  try {
    const old = document.getElementById('pet-section');
    if (old && old.parentNode) old.parentNode.removeChild(old);
  } catch (e) {}
  ensurePetSave();
  const paintInto = (container) => {
    container.innerHTML = '';
    const cards = [];
    const refresh = () => {
      const act = activePetId();
      cards.forEach(k => {
        const on = k.id === act;
        k.el.classList.toggle('equipped', on);
        const pr = k.el.querySelector('.price');
        if (pr) pr.textContent = on ? T('pet.chosen') : T('pet.choose');
      });
    };
    /* botón: abrir la tienda */
    const sb = document.createElement('div');
    sb.className = 'shop-item';
    sb.setAttribute('style', 'border:2px dashed #00e5ff;cursor:pointer;');
    sb.innerHTML = '<span class="emoji">🏪</span>' +
      '<div class="pname">' + T('petshop.shopBtn') + '</div>' +
      '<div class="price">' + T('petshop.shopHint') + '</div>';
    sb.addEventListener('click', () => {
      try { Audio2.init(); Audio2.click(); } catch (e) {}
      try { PetShop.open(); } catch (e) {}
    });
    container.appendChild(sb);
    /* tarjeta "Ninguna" */
    const mkCard = (id, emoji, label) => {
      const d = document.createElement('div');
      const sel = activePetId() === id;
      d.className = 'shop-item' + (sel ? ' equipped' : '');
      d.innerHTML = '<span class="emoji">' + emoji + '</span>' +
        '<div class="pname">' + label + '</div>' +
        '<div class="price">' + (sel ? T('pet.chosen') : T('pet.choose')) + '</div>';
      d.addEventListener('click', () => {
        try { Audio2.init(); Audio2.click(); } catch (e) {}
        if (setActivePet(id)) {
          try { if (typeof Pets !== 'undefined' && Pets.onLevelStart) Pets.onLevelStart(); } catch (e) {}
          refresh();
          if (id !== 'none') { try { toast(T('pet.picked')); } catch (e) {} }
        }
      });
      cards.push({ id: id, el: d });
      container.appendChild(d);
    };
    mkCard('none', '🚫', T('pet.none'));
    /* mascotas del jugador (en orden del catálogo, premium al final) */
    PET_CATALOG.forEach(def => {
      if (ownsPet(def.id)) mkCard(def.id, def.emoji, def.name);
    });
    Object.keys(PREMIUM_PET_DEFS).forEach(k => {
      const def = PREMIUM_PET_DEFS[k];
      if (ownsPet(k)) mkCard(k, def.emoji, def.name);
    });
    return container;
  };
  /* sección propia DESPUÉS de #animals-grid (no la borra: ahí viven los personajes-animales) */
  const sec = document.createElement('div');
  sec.id = 'pet-section';
  const h = document.createElement('h3');
  h.textContent = T('pet.title');
  sec.appendChild(h);
  const g2 = document.createElement('div');
  g2.className = 'shop-grid';
  sec.appendChild(g2);
  paintInto(g2);
  try {
    const ag = document.getElementById('animals-grid');
    if (ag && ag.parentNode) ag.parentNode.insertBefore(sec, ag.nextSibling);
  } catch (e) {}
  return sec;
}

/* ---------- constructores 3D originales (cajas) ---------- */
function lam(color) {
  return new THREE.MeshLambertMaterial({ color: color });
}
function box(w, h, d, color, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lam(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}
function shade(hex, f) { // f<1 oscurece
  const r = Math.max(0, Math.min(255, Math.round(((hex >> 16) & 255) * f)));
  const g = Math.max(0, Math.min(255, Math.round(((hex >> 8) & 255) * f)));
  const b = Math.max(0, Math.min(255, Math.round((hex & 255) * f)));
  return (r << 16) | (g << 8) | b;
}
function mixW(hex, f) { // mezcla con blanco
  const r = Math.round(((hex >> 16) & 255) * (1 - f) + 255 * f);
  const g = Math.round(((hex >> 8) & 255) * (1 - f) + 255 * f);
  const b = Math.round((hex & 255) * (1 - f) + 255 * f);
  return (r << 16) | (g << 8) | b;
}

/* Perrito: orejas caídas, hocico, cola que se mueve */
function buildPetDog(fur, dark, cream, spotC) {
  if (fur == null) fur = 0xd1945a;
  if (dark == null) dark = shade(fur, 0.55);
  if (cream == null) cream = mixW(fur, 0.7);
  const g = new THREE.Group();
  g.add(box(0.40, 0.30, 0.54, fur, 0, 0.36, 0));                 // cuerpo
  if (spotC) { // manchado
    g.add(box(0.03, 0.12, 0.16, spotC, 0.21, 0.40, 0.10));
    g.add(box(0.03, 0.10, 0.12, spotC, -0.21, 0.38, -0.12));
    g.add(box(0.16, 0.03, 0.20, spotC, -0.05, 0.52, -0.05));
  }
  const head = new THREE.Group();
  head.position.set(0, 0.60, 0.30);
  head.add(box(0.30, 0.28, 0.30, fur, 0, 0, 0));                // cabeza
  if (spotC) head.add(box(0.10, 0.08, 0.02, spotC, 0.08, 0.08, 0.16));
  head.add(box(0.16, 0.13, 0.13, cream, 0, -0.06, 0.20));      // hocico
  head.add(box(0.07, 0.06, 0.04, 0x222222, 0, -0.02, 0.27));   // nariz
  head.add(box(0.05, 0.06, 0.02, 0x1a1a1a, -0.09, 0.04, 0.16));// ojo L
  head.add(box(0.05, 0.06, 0.02, 0x1a1a1a, 0.09, 0.04, 0.16)); // ojo R
  const earL = box(0.09, 0.17, 0.07, dark, -0.17, 0.12, 0);     // oreja L caída
  earL.rotation.z = 0.35;
  const earR = box(0.09, 0.17, 0.07, dark, 0.17, 0.12, 0);      // oreja R caída
  earR.rotation.z = -0.35;
  head.add(earL); head.add(earR);
  g.add(head);
  const tail = box(0.08, 0.08, 0.30, dark, 0, 0.48, -0.36);     // cola
  tail.rotation.x = -0.5;
  g.add(tail);
  const legs = [];
  [[-0.14, 0.19], [0.14, 0.19], [-0.14, -0.19], [0.14, -0.19]].forEach(p => {
    const leg = box(0.10, 0.24, 0.10, dark, p[0], 0.12, p[1]);
    legs.push(leg); g.add(leg);
  });
  g.userData = { legs: legs, tail: tail, head: head };
  return g;
}

/* Gatito: orejas puntiagudas, cola larga hacia arriba */
function buildPetCat(fur, dark, cream, spotC) {
  if (fur == null) fur = 0x9aa3b8;
  if (dark == null) dark = shade(fur, 0.6);
  if (cream == null) cream = 0xf2a0b5;
  const g = new THREE.Group();
  g.add(box(0.34, 0.28, 0.48, fur, 0, 0.33, 0));                // cuerpo
  if (spotC) {
    g.add(box(0.03, 0.10, 0.14, spotC, 0.18, 0.36, 0.08));
    g.add(box(0.14, 0.03, 0.16, spotC, 0.02, 0.48, -0.06));
  }
  const head = new THREE.Group();
  head.position.set(0, 0.55, 0.26);
  head.add(box(0.28, 0.26, 0.26, fur, 0, 0, 0));               // cabeza
  const earL = box(0.11, 0.13, 0.06, fur, -0.09, 0.17, 0);      // oreja L
  earL.rotation.z = 0.2;
  const earR = box(0.11, 0.13, 0.06, fur, 0.09, 0.17, 0);       // oreja R
  earR.rotation.z = -0.2;
  head.add(earL); head.add(earR);
  head.add(box(0.05, 0.07, 0.02, cream, -0.09, 0.16, 0.035));    // interior oreja L
  head.add(box(0.05, 0.07, 0.02, cream, 0.09, 0.16, 0.035));     // interior oreja R
  head.add(box(0.05, 0.07, 0.02, 0x1a1a1a, -0.08, 0.03, 0.14));// ojo L
  head.add(box(0.05, 0.07, 0.02, 0x1a1a1a, 0.08, 0.03, 0.14)); // ojo R
  head.add(box(0.06, 0.03, 0.03, cream, 0, -0.05, 0.14));       // naricita
  g.add(head);
  const tail = new THREE.Group();                               // cola larga
  tail.position.set(0, 0.36, -0.24);
  const t1 = box(0.07, 0.07, 0.30, dark, 0, 0, -0.14);
  const t2 = box(0.07, 0.26, 0.07, dark, 0, 0.12, -0.28);       // punta hacia arriba
  tail.add(t1); tail.add(t2);
  g.add(tail);
  const legs = [];
  [[-0.12, 0.17], [0.12, 0.17], [-0.12, -0.17], [0.12, -0.17]].forEach(p => {
    const leg = box(0.09, 0.20, 0.09, dark, p[0], 0.10, p[1]);
    legs.push(leg); g.add(leg);
  });
  g.userData = { legs: legs, tail: tail, head: head };
  return g;
}

/* Conejito: orejas LARGAS, dientitos, cola pompón */
function buildPetRabbit(fur, dark, cream, spotC) {
  if (fur == null) fur = 0xf5f2ea;
  if (dark == null) dark = shade(fur, 0.6);
  if (cream == null) cream = mixW(fur, 0.5);
  const g = new THREE.Group();
  g.add(box(0.36, 0.34, 0.46, fur, 0, 0.32, 0));               // cuerpo redondito
  if (spotC) {
    g.add(box(0.03, 0.12, 0.14, spotC, 0.19, 0.34, 0.06));
    g.add(box(0.14, 0.03, 0.16, spotC, -0.04, 0.50, -0.08));
  }
  const head = new THREE.Group();
  head.position.set(0, 0.56, 0.24);
  head.add(box(0.28, 0.26, 0.26, fur, 0, 0, 0));              // cabeza
  head.add(box(0.09, 0.34, 0.06, fur, -0.08, 0.28, 0));        // oreja L larga
  head.add(box(0.09, 0.34, 0.06, fur, 0.08, 0.28, 0));         // oreja R larga
  head.add(box(0.045, 0.22, 0.02, cream, -0.08, 0.26, 0.035)); // interior L
  head.add(box(0.045, 0.22, 0.02, cream, 0.08, 0.26, 0.035));  // interior R
  head.add(box(0.05, 0.06, 0.02, 0x1a1a1a, -0.08, 0.02, 0.14));// ojo L
  head.add(box(0.05, 0.06, 0.02, 0x1a1a1a, 0.08, 0.02, 0.14)); // ojo R
  head.add(box(0.05, 0.04, 0.02, 0xf2a0b5, 0, -0.03, 0.14));   // nariz
  head.add(box(0.07, 0.05, 0.02, 0xffffff, 0, -0.08, 0.14));   // dientitos
  g.add(head);
  g.add(box(0.14, 0.14, 0.14, cream, 0, 0.30, -0.28));         // cola pompón
  const legs = [];
  [[-0.13, 0.16, 0.10, 0.20], [0.13, 0.16, 0.10, 0.20],
   [-0.13, -0.16, 0.12, 0.26], [0.13, -0.16, 0.12, 0.26]].forEach(p => {
    const leg = box(p[2], p[3], p[2], dark, p[0], p[3] / 2, p[1]);
    legs.push(leg); g.add(leg);
  });
  g.userData = { legs: legs, tail: null, head: head };
  return g;
}

/* Pajarito: alitas que aletean, pico, cresta; vuela junto al jugador */
function buildPetBird(fur, dark, cream, spotC) {
  if (fur == null) fur = 0x4a90d9;
  if (dark == null) dark = shade(fur, 0.6);
  if (cream == null) cream = mixW(fur, 0.55);
  const g = new THREE.Group();
  g.add(box(0.30, 0.30, 0.38, fur, 0, 0.42, 0));              // cuerpo
  g.add(box(0.18, 0.18, 0.10, cream, 0, 0.36, 0.16));         // pechuga
  if (spotC) g.add(box(0.03, 0.10, 0.12, spotC, 0.16, 0.46, -0.02));
  const head = new THREE.Group();
  head.position.set(0, 0.64, 0.16);
  head.add(box(0.24, 0.24, 0.24, fur, 0, 0, 0));             // cabeza
  head.add(box(0.10, 0.08, 0.12, 0xff9d00, 0, -0.03, 0.17)); // pico
  head.add(box(0.05, 0.06, 0.02, 0x1a1a1a, -0.07, 0.04, 0.13)); // ojo L
  head.add(box(0.05, 0.06, 0.02, 0x1a1a1a, 0.07, 0.04, 0.13));  // ojo R
  head.add(box(0.06, 0.12, 0.06, dark, 0, 0.17, -0.02));      // cresta
  g.add(head);
  const wingL = new THREE.Group(); wingL.position.set(-0.16, 0.48, 0);
  wingL.add(box(0.28, 0.06, 0.30, dark, -0.15, 0, 0));        // ala L
  const wingR = new THREE.Group(); wingR.position.set(0.16, 0.48, 0);
  wingR.add(box(0.28, 0.06, 0.30, dark, 0.15, 0, 0));        // ala R
  g.add(wingL); g.add(wingR);
  const tail = box(0.14, 0.05, 0.24, dark, 0, 0.44, -0.28);   // cola
  tail.rotation.x = 0.25;
  g.add(tail);
  const legs = [];
  [[-0.08], [0.08]].forEach(p => {
    const leg = box(0.05, 0.16, 0.05, 0xff9d00, p[0], 0.08, 0);
    legs.push(leg); g.add(leg);
  });
  g.userData = { legs: legs, tail: tail, head: head, wings: [wingL, wingR] };
  return g;
}

/* Hámster: gordito, cachetes, orejitas redondas */
function buildPetHamster(fur, dark, cream, spotC) {
  if (fur == null) fur = 0xe8a020;
  if (dark == null) dark = shade(fur, 0.6);
  if (cream == null) cream = mixW(fur, 0.6);
  const g = new THREE.Group();
  g.add(box(0.40, 0.34, 0.42, fur, 0, 0.30, 0));             // cuerpo gordito
  g.add(box(0.42, 0.18, 0.30, cream, 0, 0.22, 0.05));        // pancita
  if (spotC) {
    g.add(box(0.03, 0.10, 0.12, spotC, 0.21, 0.34, -0.02));
    g.add(box(0.12, 0.03, 0.14, spotC, 0.06, 0.48, -0.06));
  }
  const head = new THREE.Group();
  head.position.set(0, 0.50, 0.24);
  head.add(box(0.30, 0.26, 0.24, fur, 0, 0, 0));             // cabeza
  head.add(box(0.09, 0.09, 0.05, fur, -0.11, 0.16, 0));       // orejita L
  head.add(box(0.09, 0.09, 0.05, fur, 0.11, 0.16, 0));        // orejita R
  head.add(box(0.05, 0.06, 0.02, 0x1a1a1a, -0.08, 0.03, 0.13));// ojo L
  head.add(box(0.05, 0.06, 0.02, 0x1a1a1a, 0.08, 0.03, 0.13)); // ojo R
  head.add(box(0.05, 0.04, 0.02, 0xf2a0b5, 0, -0.04, 0.13));  // nariz
  head.add(box(0.10, 0.10, 0.08, cream, -0.13, -0.07, 0.05)); // cachete L
  head.add(box(0.10, 0.10, 0.08, cream, 0.13, -0.07, 0.05));  // cachete R
  g.add(head);
  const tail = box(0.08, 0.08, 0.08, dark, 0, 0.26, -0.24);   // colita
  g.add(tail);
  const legs = [];
  [[-0.14, 0.14], [0.14, 0.14], [-0.14, -0.14], [0.14, -0.14]].forEach(p => {
    const leg = box(0.09, 0.16, 0.09, dark, p[0], 0.08, p[1]);
    legs.push(leg); g.add(leg);
  });
  g.userData = { legs: legs, tail: tail, head: head };
  return g;
}

/* Tortuga: caparazón, cabecita afuera, camina bamboleándose */
function buildPetTurtle(fur, dark, cream, spotC) {
  if (fur == null) fur = 0x59d867;
  if (dark == null) dark = shade(fur, 0.55);
  if (cream == null) cream = mixW(fur, 0.6);
  const skin = fur, shell = dark, belly = cream;
  const g = new THREE.Group();
  g.add(box(0.44, 0.16, 0.56, belly, 0, 0.20, 0));           // panza
  g.add(box(0.48, 0.22, 0.60, shell, 0, 0.35, 0));           // caparazón
  g.add(box(0.52, 0.06, 0.64, shade(shell, 0.7), 0, 0.26, 0)); // borde
  g.add(box(0.20, 0.05, 0.20, shade(shell, 1.3), 0, 0.47, 0)); // dibujo
  g.add(box(0.10, 0.05, 0.34, shade(shell, 1.3), 0, 0.47, 0));
  if (spotC) g.add(box(0.14, 0.05, 0.14, spotC, 0.12, 0.47, 0.14));
  const head = new THREE.Group();
  head.position.set(0, 0.30, 0.38);
  head.add(box(0.20, 0.18, 0.22, skin, 0, 0, 0));            // cabeza
  head.add(box(0.05, 0.06, 0.02, 0x1a1a1a, -0.06, 0.03, 0.12)); // ojo L
  head.add(box(0.05, 0.06, 0.02, 0x1a1a1a, 0.06, 0.03, 0.12));  // ojo R
  g.add(head);
  const tail = box(0.08, 0.08, 0.14, skin, 0, 0.20, -0.34);  // colita
  g.add(tail);
  const legs = [];
  [[-0.20, 0.18], [0.20, 0.18], [-0.20, -0.18], [0.20, -0.18]].forEach(p => {
    const leg = box(0.12, 0.18, 0.12, skin, p[0], 0.09, p[1]);
    legs.push(leg); g.add(leg);
  });
  g.userData = { legs: legs, tail: tail, head: head, waddle: true };
  return g;
}

/* construye la malla 3D de cualquier mascota del catálogo (o premium) */
function buildPetMesh(id) {
  const def = petDef(id);
  if (!def) return null;
  try {
    if (def.price === 0 && typeof Shop2 !== 'undefined' && typeof Shop2.buildPetMesh === 'function') {
      const m = Shop2.buildPetMesh(id); // dragón/unicornio/robotito (monetiza.js)
      if (m) return m;
    }
    const fur = def.color, dark = shade(fur, 0.55), cream = mixW(fur, 0.7);
    const spotC = def.spotted ? def.spot : 0;
    switch (def.species) {
      case 'dog': return buildPetDog(fur, dark, cream, spotC);
      case 'cat': return buildPetCat(fur, dark, cream, spotC);
      case 'rabbit': return buildPetRabbit(fur, dark, cream, spotC);
      case 'bird': return buildPetBird(fur, dark, cream, spotC);
      case 'hamster': return buildPetHamster(fur, dark, cream, spotC);
      case 'turtle': return buildPetTurtle(fur, dark, cream, spotC);
      default: return null;
    }
  } catch (e) { return null; }
}

/* etiqueta flotante con el nombre de la mascota */
function buildPetLabel(idOrDef) {
  let emoji = '🐾', name = 'Mascota';
  try {
    const def = (typeof idOrDef === 'object' && idOrDef) ? idOrDef : petDef(idOrDef);
    if (def) { emoji = def.emoji; name = def.name; }
    else if (idOrDef === 'dog') { emoji = '🐶'; name = T('pet.name_dog'); }
    else if (idOrDef === 'cat') { emoji = '🐱'; name = T('pet.name_cat'); }
  } catch (e) {}
  const tex = canvasTex(256, 64, (g, w, h) => {
    g.fillStyle = 'rgba(10,14,30,0.72)';
    g.beginPath();
    if (g.roundRect) g.roundRect(4, 6, w - 8, h - 12, 16); else g.rect(4, 6, w - 8, h - 12);
    g.fill();
    g.strokeStyle = '#ffe95e'; g.lineWidth = 3; g.stroke();
    g.fillStyle = '#ffffff';
    g.font = '700 30px "Trebuchet MS", sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(emoji + ' ' + name, w / 2, h / 2 + 1);
  });
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sp.scale.set(1.7, 0.425, 1);
  sp.position.y = 1.05;
  return sp;
}

/* ---------- mascota en escena ---------- */
let petGroup = null;
let petPhase = 0;
let petAway = false; // 🐾 mejora CityLife3: la mascota se queda quieta/oculta (llamar/alejar)

/* 🐾 llamar: la mascota vuelve junto al jugador (la trae la mejora CityLife3) */
function callPet() {
  petAway = false;
  try {
    if (petGroup && typeof Player !== 'undefined' && Player && Player.pos) {
      const fx = Math.sin(Player.heading), fz = Math.cos(Player.heading);
      petGroup.position.set(Player.pos.x - fx * 1.6, Player.pos.y, Player.pos.z - fz * 1.6);
      petGroup.rotation.y = Player.heading;
      petGroup.visible = true;
    }
  } catch (e) {}
}
/* 🐾 alejar: true = se queda quieta y oculta; false = vuelve a seguir */
function setPetAway(a) {
  petAway = !!a;
  try { if (petGroup) petGroup.visible = !petAway; } catch (e) {}
}
function isPetAway() { return petAway; }

function disposeGroup(gr) {
  try {
    gr.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
      }
    });
  } catch (e) {}
}

const Pets = {
  onLevelStart() {
    try {
      if (petGroup) {
        try { scene.remove(petGroup); } catch (e) {}
        disposeGroup(petGroup);
        petGroup = null;
      }
      const id = activePetId();
      if (id === 'none') return;
      if (typeof scene === 'undefined' || !scene) return;
      const def = petDef(id);
      if (!def) return;
      petGroup = new THREE.Group();
      const inner = buildPetMesh(id);
      if (!inner) { petGroup = null; return; }
      petGroup.add(inner);
      petGroup.userData.inner = inner;
      petGroup.userData.def = def;
      try { petGroup.add(buildPetLabel(def)); } catch (e) {}
      // aparece detrás del jugador
      try {
        const fx = Math.sin(Player.heading), fz = Math.cos(Player.heading);
        petGroup.position.set(Player.pos.x - fx * 1.6, Player.pos.y, Player.pos.z - fz * 1.6);
        petGroup.rotation.y = Player.heading;
      } catch (e) {}
      scene.add(petGroup);
    } catch (e) {}
  }
};

function updatePets(dt) {
  const show = petGroup &&
    (typeof MODE === 'undefined' || MODE === 'play') &&
    typeof Player !== 'undefined' && Player;
  if (petGroup) petGroup.visible = !!show && !petAway;
  if (!show) return;
  if (petAway) return; // 🐾 mejora CityLife3: quieta y oculta hasta que la llamen
  try {
    const fx = Math.sin(Player.heading), fz = Math.cos(Player.heading);
    const tx = Player.pos.x - fx * 1.6;
    const tz = Player.pos.z - fz * 1.6;
    const ty = Player.pos.y;
    const p = petGroup.position;
    const dx = tx - p.x, dz = tz - p.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const now = performance.now() / 1000;
    if (dist > 8) { // teletransporte (respawn, cambio de nivel): aparece cerca
      p.set(tx, ty, tz);
    } else if (dist > 0.12) {
      const sp = Math.min(1, dt * 7);
      p.x += dx * sp; p.z += dz * sp;
      if (typeof lerpAngle === 'function') {
        petGroup.rotation.y = lerpAngle(petGroup.rotation.y, Math.atan2(dx, dz), Math.min(1, dt * 10));
      } else {
        petGroup.rotation.y = Math.atan2(dx, dz);
      }
    } else if (typeof lerpAngle === 'function') {
      petGroup.rotation.y = lerpAngle(petGroup.rotation.y, Player.heading, Math.min(1, dt * 6));
    }
    // animación: trote, bob y salto
    const hv = Math.sqrt(Player.vel.x * Player.vel.x + Player.vel.z * Player.vel.z);
    const active = Math.min(1, hv / 3);
    petPhase += dt * (5 + hv * 1.6);
    let bob = Math.abs(Math.sin(petPhase)) * 0.12 * (0.25 + 0.75 * active);
    if (!Player.grounded) bob += Math.abs(Math.sin(now * 9)) * 0.28; // brinca con el jugador
    const def = petGroup.userData.def;
    let hover = 0;
    if (def && def.species === 'bird') hover = 0.32 + Math.abs(Math.sin(now * 5)) * 0.10; // 🐦 vuela
    p.y = ty + bob + hover;
    const inner = petGroup.userData.inner;
    if (inner && inner.userData) {
      (inner.userData.legs || []).forEach((leg, i) => {
        leg.rotation.x = Math.sin(petPhase + (i % 2) * Math.PI) * 0.55 * (0.2 + 0.8 * active);
      });
      if (inner.userData.tail) inner.userData.tail.rotation.y = Math.sin(now * 7) * 0.45; // mueve la cola
      if (inner.userData.head) inner.userData.head.rotation.y = Math.sin(now * 1.6) * 0.3;
      const wings = inner.userData.wings;
      if (wings && wings.length === 2 && wings[0] && wings[0].isGroup) { // 🐦 aleteo
        const flap = 0.15 + Math.sin(petPhase * 2.4) * (0.2 + 0.6 * active);
        wings[0].rotation.z = flap;
        wings[1].rotation.z = -flap;
      }
      if (inner.userData.waddle) inner.rotation.z = Math.sin(petPhase) * 0.09 * (0.3 + 0.7 * active); // 🐢 bamboleo
    }
  } catch (e) {}
}

/* ---------- 🏪 TIENDA DE MASCOTAS ---------- */
const PetShop = {
  _filter: 'all',
  _cssDone: false,
  ensureCss() {
    if (this._cssDone) return;
    this._cssDone = true;
    try {
      if (typeof document === 'undefined') return;
      if (document.getElementById('psh-css')) return;
      const st = document.createElement('style');
      st.id = 'psh-css';
      st.textContent =
        '.psh-ov{position:fixed;inset:0;background:rgba(4,6,18,.72);z-index:99990;display:flex;align-items:center;justify-content:center;padding:12px}' +
        '.psh-card{background:#141a36;border:2px solid #00e5ff;border-radius:18px;max-width:660px;width:100%;max-height:92vh;display:flex;flex-direction:column;overflow:hidden}' +
        '.psh-head{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid #2b2f4a}' +
        '.psh-head h2{flex:1;margin:0;font-size:20px;color:#fff}' +
        '.psh-coins{color:#ffd23f;font-weight:bold;font-size:17px;white-space:nowrap}' +
        '.psh-x{background:#ff5f6e;border:none;color:#fff;font-size:18px;border-radius:10px;min-width:52px;min-height:52px;cursor:pointer}' +
        '.psh-tabs{display:flex;gap:6px;overflow-x:auto;padding:10px 12px 4px}' +
        '.psh-tab{background:#0a0e24;border:2px solid #3949ab;color:#fff;border-radius:12px;padding:10px 12px;font-size:14px;min-height:52px;white-space:nowrap;cursor:pointer}' +
        '.psh-tab.on{background:#3949ab;border-color:#00e5ff}' +
        '.psh-body{overflow-y:auto;padding:6px 12px 12px}' +
        '.psh-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}' +
        '.psh-item{background:#0a0e24;border:2px solid #2b2f4a;border-radius:14px;padding:10px;text-align:center}' +
        '.psh-item.active{border-color:#00e676}' +
        '.psh-item .emoji{font-size:40px}' +
        '.psh-item .pname{color:#fff;font-weight:bold;font-size:14px;margin:4px 0}' +
        '.psh-item .pprice{color:#ffd23f;font-weight:bold;font-size:14px;margin-bottom:6px}' +
        '.psh-item .pstate{color:#00e676;font-weight:bold;font-size:13px;margin:4px 0}' +
        '.psh-btn{background:#00c853;color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:bold;padding:12px;width:100%;min-height:52px;cursor:pointer;margin-top:4px}' +
        '.psh-btn:active{transform:scale(.96)}' +
        '.psh-btn.choose{background:#3949ab}' +
        '.psh-msg{text-align:center;font-size:16px;font-weight:bold;margin:10px 0;min-height:24px}' +
        '.psh-msg.ok{color:#00e676}.psh-msg.bad{color:#ff5f6e}' +
        '.psh-note{font-size:12px;color:#aab;text-align:center;margin-top:10px;line-height:1.5}';
      document.head.appendChild(st);
    } catch (e) {}
  },
  coinsText() {
    try {
      if (typeof Shop2 !== 'undefined' && typeof Shop2.coinsText === 'function') return Shop2.coinsText();
      return String(SAVE.coins);
    } catch (e) { return '0'; }
  },
  owns(id) { return ownsPet(id); },
  buyWithCoins(id) {
    ensurePetSave();
    const def = petDef(id);
    if (!def || !(def.price > 0)) return { ok: false, msg: T('petshop.noCoins') };
    if (this.owns(id)) return { ok: false, msg: T('petshop.owned') };
    let paid = false;
    try {
      if (typeof Shop2 !== 'undefined' && typeof Shop2.spendCoins === 'function') {
        paid = !!Shop2.spendCoins(def.price); // respeta ∞ del código familiar
      } else if (SAVE.coins >= def.price) {
        SAVE.coins -= def.price; paid = true;
      }
    } catch (e) {}
    if (!paid) {
      try { if (typeof Audio2 !== 'undefined') Audio2.deny(); } catch (e) {}
      return { ok: false, msg: T('petshop.noCoins') };
    }
    SAVE.ownedPets.push(id);
    try { persist(); } catch (e) {}
    setActivePet(id); // la recién comprada te acompaña de una vez
    try { if (typeof Pets !== 'undefined' && Pets.onLevelStart) Pets.onLevelStart(); } catch (e) {}
    try { if (typeof Shop2 !== 'undefined' && Shop2.refreshCoinLabels) Shop2.refreshCoinLabels(); } catch (e) {}
    try { if (typeof toast === 'function') toast(T('petshop.bought')); } catch (e) {}
    return { ok: true, msg: T('petshop.bought') };
  },
  choose(id) {
    if (!this.owns(id)) return { ok: false };
    try { if (typeof Audio2 !== 'undefined') { Audio2.init(); Audio2.click(); } } catch (e) {}
    setActivePet(id);
    try { if (typeof Pets !== 'undefined' && Pets.onLevelStart) Pets.onLevelStart(); } catch (e) {}
    try { if (typeof toast === 'function') toast(T('pet.picked')); } catch (e) {}
    this.render();
    return { ok: true };
  },
  _flash(r) {
    try {
      const m = document.getElementById('psh-msg');
      if (!m) return;
      m.textContent = r.msg || '';
      m.className = 'psh-msg ' + (r.ok ? 'ok' : 'bad');
    } catch (e) {}
  },
  _card(def) {
    const self = this;
    const d = document.createElement('div');
    const owned = this.owns(def.id);
    const active = activePetId() === def.id;
    d.className = 'psh-item' + (active ? ' active' : '');
    let foot = '';
    if (active) foot = '<div class="pstate">' + T('petshop.active') + '</div>';
    else if (owned) foot = '<div class="pstate">' + T('petshop.owned') + '</div>';
    else foot = '<div class="pprice">🪙 ' + def.price + '</div>';
    d.innerHTML = '<span class="emoji">' + def.emoji + '</span>' +
      '<div class="pname">' + def.name + '</div>' + foot;
    if (!owned) {
      const b = document.createElement('button');
      b.className = 'psh-btn';
      b.textContent = T('petshop.buy') + ' · 🪙' + def.price;
      b.addEventListener('click', (ev) => {
        if (ev && ev.stopPropagation) ev.stopPropagation();
        const r = self.buyWithCoins(def.id);
        self._flash(r);
        self.render();
      });
      d.appendChild(b);
    } else if (!active) {
      const b = document.createElement('button');
      b.className = 'psh-btn choose';
      b.textContent = '🐾 ' + T('petshop.choose');
      b.addEventListener('click', (ev) => {
        if (ev && ev.stopPropagation) ev.stopPropagation();
        self.choose(def.id);
      });
      d.appendChild(b);
    }
    return d;
  },
  render() {
    try {
      const tabs = document.getElementById('psh-tabs');
      const grid = document.getElementById('psh-grid');
      if (!tabs || !grid) return;
      const cc = document.getElementById('psh-coins');
      if (cc) cc.textContent = this.coinsText();
      tabs.innerHTML = '';
      const self = this;
      const mkTab = (key, label) => {
        const t = document.createElement('button');
        t.className = 'psh-tab' + (self._filter === key ? ' on' : '');
        t.textContent = label;
        t.addEventListener('click', () => {
          try { if (typeof Audio2 !== 'undefined') Audio2.click(); } catch (e) {}
          self._filter = key;
          self.render();
        });
        tabs.appendChild(t);
      };
      mkTab('all', '🌟 ' + T('petshop.all'));
      PET_SPECIES.forEach(sp => mkTab(sp.species, sp.emoji + ' ' + T('pet.sp_' + sp.species)));
      grid.innerHTML = '';
      PET_CATALOG
        .filter(def => self._filter === 'all' || def.species === self._filter)
        .forEach(def => grid.appendChild(self._card(def)));
    } catch (e) {}
  },
  open() {
    if (typeof document === 'undefined') return;
    try {
      ensurePetSave();
      this.ensureCss();
      let ov = document.getElementById('psh-ov');
      if (ov && ov.parentNode) ov.parentNode.removeChild(ov);
      ov = document.createElement('div');
      ov.id = 'psh-ov';
      ov.className = 'psh-ov';
      ov.innerHTML = '<div class="psh-card">' +
        '<div class="psh-head"><h2>' + T('petshop.title') + '</h2>' +
        '<div class="psh-coins">🪙 <span id="psh-coins">' + this.coinsText() + '</span></div>' +
        '<button class="psh-x" id="psh-x">✕</button></div>' +
        '<div class="psh-tabs" id="psh-tabs"></div>' +
        '<div class="psh-body"><div class="psh-msg" id="psh-msg"></div>' +
        '<div class="psh-grid" id="psh-grid"></div>' +
        '<div class="psh-note">' + T('petshop.note') + '</div></div></div>';
      document.body.appendChild(ov);
      ov.querySelector('#psh-x').addEventListener('click', () => {
        if (ov.parentNode) ov.parentNode.removeChild(ov);
      });
      this._filter = 'all';
      this.render();
    } catch (e) {}
  },
};

/* exponer para el juego */
Pets.setAway = setPetAway; // 🐾 mejora CityLife3
Pets.call = callPet;
Pets.isAway = isPetAway;
if (typeof window !== 'undefined') {
  window.Pets = Pets;
  window.updatePets = updatePets;
  window.renderPetSection = renderPetSection;
  window.setPetAway = setPetAway;
  window.callPet = callPet;
  window.isPetAway = isPetAway;
  window.PetShop = PetShop;
  window.petDef = petDef;
  window.activePetId = activePetId;
}
if (typeof globalThis !== 'undefined') {
  try { globalThis.PetShop = PetShop; } catch (e) {}
}
