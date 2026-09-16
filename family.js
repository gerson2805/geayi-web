/* family.js — personajes en honor a la familia del dueño (Ian, Yael, Audrey) */
'use strict';

/* Retratos: img/portrait-ian.png, img/portrait-yael.png, img/portrait-audrey.png */
const FAMILY = [
  {
    id: 'ian',
    outfit: 'hoodie', name: 'Ian', kid: true,
    portrait: 'img/portrait-ian.png',
    face: 'img/face-ian.png',
    skin: 0xf3c9a2, hair: 0x2e1d12, hairStyle: 'short',
    shirt: 0xd92038, pants: 0xa8c8ec, shoes: 0x2456c8
  },
  {
    id: 'yael',
    outfit: 'hoodie', name: 'Yael', kid: true,
    portrait: 'img/portrait-yael.png',
    face: 'img/face-yael.png',
    skin: 0xf3c9a2, hair: 0x2e1d12, hairStyle: 'short',
    shirt: 0xc81e3a, pants: 0x5b8dd9, shoes: 0x333333
  },
  {
    id: 'audrey',
    outfit: 'hoodie', name: 'Audrey', kid: true,
    portrait: 'img/portrait-audrey.png',
    face: 'img/face-audrey.png',
    skin: 0xf0bd9a, hair: 0x1f1410, hairStyle: 'long',
    shirt: 0xffffff, pants: 0x7a9cc6, shoes: 0xffffff
  },
  {
    id: 'mily', name: 'Mily', species: 'dog',
    portrait: 'img/portrait-mily.png',
    body: 0x8a8f98, light: 0xeceff1, dark: 0x5f646d,
    beard: true
  },
  {
    id: 'kiara', name: 'Kiara', species: 'dog',
    portrait: 'img/portrait-kiara.png',
    body: 0xf7f5f2, patches: 0x5d4037, collar: 0xf06292
  },
  {
    id: 'gerson',
    outfit: 'jacket', name: 'Gerson', kid: false,
    portrait: 'img/portrait-gerson.png',
    face: 'img/face-gerson.png',
    skin: 0xd9a06b, hair: 0x1f1410, hairStyle: 'short', beard: true,
    hat: 'white-cap',
    shirt: 0xe8e8e8, pants: 0x3d5a80, shoes: 0xffffff
  },
  {
    id: 'esmeralda',
    outfit: 'jacket', name: 'Esmeralda', kid: false,
    portrait: 'img/portrait-esmeralda.png',
    face: 'img/face-esmeralda.png',
    skin: 0xf0bd9a, hair: 0x4a2e1a, hairStyle: 'bun',
    shirt: 0xf5f2ea, pants: 0xa8c8ec, shoes: 0xffffff
  },
  {
    id: 'adelina',
    outfit: 'jacket', name: 'Adelina', kid: false,
    portrait: 'img/portrait-adelina.png',
    face: 'img/face-adelina.png',
    skin: 0xeab88f, hair: 0x3a2a1e, hairStyle: 'bun',
    shirt: 0xd21f2f, pants: 0x5b8dd9, shoes: 0xffffff
  },
  {
    id: 'fani',
    outfit: 'jacket', name: 'Fani', kid: false,
    portrait: 'img/portrait-fani.png',
    face: 'img/face-fani.png',
    skin: 0xf0bd9a, hair: 0x2e1d12, hairStyle: 'long',
    shirt: 0xd21f2f, pants: 0x1a1a1a, shoes: 0xd21f2f
  },
  {
    id: 'damaris',
    outfit: 'jacket', name: 'Damaris', kid: false,
    portrait: 'img/portrait-damaris.png',
    face: 'img/face-damaris.png',
    skin: 0xf3c9a2, hair: 0xc9a86a, hairStyle: 'long',
    shirt: 0x2e2a26, pants: 0x9fc3e0, shoes: 0x6b4226
  },
  {
    id: 'ander',
    outfit: 'hoodie', name: 'Ander', kid: true,
    portrait: 'img/portrait-ander.png',
    face: 'img/face-ander.png',
    skin: 0xeab88f, hair: 0x1f1410, hairStyle: 'short',
    shirt: 0x1a1a1a, pants: 0x9fc3e0, shoes: 0x333333
  },
  {
    id: 'aitana',
    outfit: 'dress', name: 'Aitana', kid: true,
    portrait: 'img/portrait-aitana.png',
    face: 'img/face-aitana.png',
    skin: 0xf3c9a2, hair: 0x2e1d12, hairStyle: 'bun',
    shirt: 0xf8bbd0, pants: 0xf8bbd0, shoes: 0xffffff
  },
  {
    id: 'yurem',
    outfit: 'jacket', name: 'Yurem', kid: false,
    portrait: 'img/portrait-yurem.png',
    face: 'img/face-yurem.png',
    skin: 0xeab88f, hair: 0x1f1410, hairStyle: 'short',
    shirt: 0xc8c8c8, pants: 0x5b8dd9, shoes: 0x888888
  },
  {
    id: 'dylan',
    outfit: 'hoodie', name: 'Dylan', kid: true,
    portrait: 'img/portrait-dylan.png',
    face: 'img/face-dylan.png',
    skin: 0xeab88f, hair: 0x1f1410, hairStyle: 'short',
    shirt: 0xf5f5f0, pants: 0x1a1a1a, shoes: 0xffffff
  },
  {
    id: 'juan',
    outfit: 'jacket', name: 'Juan', kid: false,
    portrait: 'img/portrait-juan.png',
    face: 'img/face-juan.png',
    skin: 0xc98e5f, hair: 0x1f1410, hairStyle: 'short', beard: true,
    shirt: 0x7a8b5c, pants: 0x333333, shoes: 0x222222
  },
  {
    id: 'abi',
    outfit: 'jacket', name: 'Abi', kid: false,
    portrait: 'img/portrait-abi.png',
    face: 'img/face-abi.png',
    skin: 0xd9a066, hair: 0x0f0a08, hairStyle: 'long',
    shirt: 0x8b5a2b, pants: 0x8b5a2b, shoes: 0xf5e6d0
  },
  {
    id: 'robert',
    outfit: 'jacket', name: 'Robert', kid: false,
    portrait: 'img/portrait-robert.png',
    face: 'img/face-robert.png',
    skin: 0xeab88f, hair: 0x1f1410, hairStyle: 'short',
    shirt: 0x9fc3e0, pants: 0x333333, shoes: 0x222222
  },
  {
    id: 'suegra',
    outfit: 'jacket', name: 'Suegra', kid: false,
    portrait: 'img/portrait-suegra.png',
    face: 'img/face-suegra.png',
    skin: 0xf0c8a0, hair: 0xb0b0b0, hairStyle: 'bun',
    shirt: 0xaecde8, pants: 0x5b8dd9, shoes: 0xffffff
  },
  {
    id: 'roberto',
    outfit: 'jacket', name: 'Roberto', kid: false,
    portrait: 'img/portrait-roberto.png',
    face: 'img/face-roberto.png',
    skin: 0xc98e5f, hair: 0x3a2a1e, hairStyle: 'short', mustache: true,
    hat: 'olive-cap',
    shirt: 0x1a1a1a, pants: 0x333333, shoes: 0x222222
  },
  {
    id: 'gorda', name: 'Gorda', species: 'cuyo',
    portrait: 'img/portrait-gorda.png',
    body: 0xf7f5f2, patches: 0x5d4037
  },
  {
    id: 'nina', name: 'Niña', species: 'cuyo',
    portrait: 'img/portrait-nina.png',
    body: 0xf7f5f2, patches: 0x6d4c41
  },
  {
    id: 'whini', name: 'Whini', species: 'dog',
    portrait: 'img/portrait-whini.png',
    body: 0xd9a86c, light: 0xe8c896, dark: 0x1f1a14,
    patches: 0x2a2118
  }
];

function getFamilyChar(id) {
  for (const f of FAMILY) if (f.id === id) return f;
  return null;
}

/* ---------- animales genéricos (no son de la familia) ---------- */
const ANIMALS = [
  { id: 'oso', name: 'Oso', species: 'bear', portrait: 'img/portrait-oso.png' },
  { id: 'tortuga', name: 'Tortuga', species: 'turtle', portrait: 'img/portrait-tortuga.png' },
  { id: 'pantera', name: 'Pantera', species: 'panther', portrait: 'img/portrait-pantera.png' }
];

/* busca en familia + animales */
function getPlayableChar(id) {
  return getFamilyChar(id) || ANIMALS.find(a => a.id === id) || null;
}

/* personaje actualmente elegido en Personalizar (familia o animal; null = libre) */
function activeCharacter() {
  try {
    if (typeof SAVE !== 'undefined' && SAVE.familyChar) return getPlayableChar(SAVE.familyChar);
  } catch (e) {}
  return null;
}

function activeFamilyChar() {
  const c = activeCharacter();
  return (c && getFamilyChar(c.id)) ? c : null;
}

function famHexCss(hex) {
  let s = (hex >>> 0).toString(16);
  while (s.length < 6) s = '0' + s;
  return '#' + s;
}

/* Convierte un preset familiar en el objeto "style" de createAvatarMesh */
function familyStyle(f, hatOverride) {
  // sombrero fijo del personaje (p. ej. la gorra blanca de Gerson) o el del jugador
  const hat = f.hat ? f.hat
    : (typeof hatOverride !== 'undefined')
      ? hatOverride
      : ((typeof SAVE !== 'undefined' && SAVE.hat) || 'none');
  if (f.species === 'dog' || f.species === 'cuyo') {
    return {
      species: f.species,
      body: famHexCss(f.body),
      light: famHexCss(f.light != null ? f.light : 0xffffff),
      dark: famHexCss(f.dark != null ? f.dark : 0x333333),
      patches: f.patches != null ? famHexCss(f.patches) : null,
      collar: f.collar != null ? famHexCss(f.collar) : null,
      beard: !!f.beard,
      hat: hat
    };
  }
  if (f.species === 'bear' || f.species === 'turtle' || f.species === 'panther') {
    return { species: f.species, hat: hat };
  }
  return {
    skin: famHexCss(f.skin),
    hair: famHexCss(f.hair),
    hairStyle: f.hairStyle || 'short',
    beard: !!f.beard,
    mustache: !!f.mustache,
    shirt: famHexCss(f.shirt),
    pants: famHexCss(f.pants),
    shoes: famHexCss(f.shoes),
    kid: !!f.kid,
    face: f.face || null, // calcomanía de la cara en la cabeza (estilo Roblox)
    outfit: f.outfit || null, // hoodie | jacket | dress | tee
    cap3d: f.hat || null, // gorra 3D: Gerson (white-cap), Roberto (olive-cap)
    hat: f.face ? 'none' : hat // la gorra ya viene dibujada en la cara (Gerson, Roberto)
  };
}

/* Estilo del avatar local: personaje elegido (familia o animal), o Gerson por defecto */
function avatarStyleForLocal() {
  const f = (typeof activeCharacter === 'function') ? activeCharacter() : activeFamilyChar();
  if (f) return familyStyle(f);
  const g0 = (typeof getFamilyChar === 'function') ? getFamilyChar('gerson') : null;
  if (g0) return familyStyle(g0); // arranca con un miembro de la familia, no el muñeco genérico
  const body = (typeof SAVE !== 'undefined' && SAVE.body) || '#ff5533';
  const hat = (typeof SAVE !== 'undefined' && SAVE.hat) || 'none';
  return { body, hat };
}

/* Estilo de un avatar remoto a partir de la presencia de otro jugador */
function avatarStyleForRemote(meta) {
  meta = meta || {};
  const f = getPlayableChar(meta.fam);
  if (f) return familyStyle(f, meta.hat || 'none');
  return { body: meta.body || '#ff5533', hat: meta.hat || 'none' };
}
