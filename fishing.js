/* fishing.js — minijuego de pesca 🎣 en Lake Trafford (mundo 4: Immokalee, idx 3)
   - addFishingContent(idx, lvl): construye muelle de madera + letrero "🎣 PESCA" (solo idx===3)
   - updateFishing(dt): proximidad, botón flotante, tiempos de picada
   Diseño 100% original. Sin penalizaciones: si el pez escapa, solo "inténtalo de nuevo".
*/
'use strict';

/* ---------------- i18n ---------------- */
try {
  if (typeof addStrings === 'function') {
    addStrings('es', {
      'fish.title': '🎣 PESCA',
      'fish.cast': '🎣 PESCAR',
      'fish.wait': '⌛ ¡Espera que pique…!',
      'fish.now': '❗ ¡AHORA!',
      'fish.caught': '🐟 ¡Pescaste {fish}! ({n})',
      'fish.escaped': '💨 ¡Se escapó! Inténtalo de nuevo',
      'fish.n1': 'un pececito', 'fish.n2': 'una mojarra', 'fish.n3': 'un pez payaso',
      'fish.n4': 'una carpa', 'fish.n5': 'un bagrecito',
      'trophy.fish10': 'Pescador experto',
      'trophy.fish10.d': 'Pesca 10 peces en Lake Trafford',
    });
    addStrings('en', {
      'fish.title': '🎣 FISHING',
      'fish.cast': '🎣 FISH',
      'fish.wait': '⌛ Wait for a bite…!',
      'fish.now': '❗ NOW!',
      'fish.caught': '🐟 You caught {fish}! ({n})',
      'fish.escaped': '💨 It got away! Try again',
      'fish.n1': 'a little fish', 'fish.n2': 'a tilapia', 'fish.n3': 'a clownfish',
      'fish.n4': 'a carp', 'fish.n5': 'a little catfish',
      'trophy.fish10': 'Expert angler',
      'trophy.fish10.d': 'Catch 10 fish at Lake Trafford',
    });
    addStrings('pt', {
      'fish.title': '🎣 PESCA',
      'fish.cast': '🎣 PESCAR',
      'fish.wait': '⌛ Espera morder…!',
      'fish.now': '❗ AGORA!',
      'fish.caught': '🐟 Pescaste {fish}! ({n})',
      'fish.escaped': '💨 Escapou! Tenta de novo',
      'fish.n1': 'um peixinho', 'fish.n2': 'uma tilápia', 'fish.n3': 'um peixe-palhaço',
      'fish.n4': 'uma carpa', 'fish.n5': 'um bagrinho',
      'trophy.fish10': 'Pescador experiente',
      'trophy.fish10.d': 'Pesque 10 peixes no Lake Trafford',
    });
    addStrings('fr', {
      'fish.title': '🎣 PÊCHE',
      'fish.cast': '🎣 PÊCHER',
      'fish.wait': '⌛ Attends que ça morde… !',
      'fish.now': '❗ MAINTENANT !',
      'fish.caught': '🐟 Tu as attrapé {fish} ! ({n})',
      'fish.escaped': '💨 Il s’est échappé ! Réessaie',
      'fish.n1': 'un petit poisson', 'fish.n2': 'un tilapia', 'fish.n3': 'un poisson-clown',
      'fish.n4': 'une carpe', 'fish.n5': 'un petit poisson-chat',
      'trophy.fish10': 'Pêcheur expert',
      'trophy.fish10.d': 'Attrape 10 poissons au Lake Trafford',
    });
  }
} catch (e) {}

/* Registra el trofeo de pesca para que Trophy.unlock('fish10') funcione de verdad */
try {
  if (typeof Trophy !== 'undefined' && Trophy && Array.isArray(Trophy.DEFS) &&
      !Trophy.DEFS.some(function (d) { return d.id === 'fish10'; })) {
    Trophy.DEFS.push({ id: 'fish10', emoji: '🐟', nameKey: 'trophy.fish10', descKey: 'trophy.fish10.d' });
  }
} catch (e) {}

/* ---------------- estado ---------------- */
const FISH_SPOT = { x: -55.2, z: 18, r: 3.5 }; // letrero, orilla este del Lago Trafford (-78,18)
const F = {
  built: false, group: null,
  stage: 'idle', // idle | wait | bite
  waitT: 0, biteT: 0, animT: 0,
  bobber: null, bobBaseY: 0.16, line: null,
  btn: null, chip: null, _label: '', _ui: false,
};

function _fishT(key) { try { return T(key); } catch (e) { return key; } }
function _fishInWorld() {
  return F.built && typeof LEVEL !== 'undefined' && LEVEL && LEVEL.idx === 3;
}
function _fishCanAct() {
  if (!_fishInWorld()) return false;
  if (typeof MODE !== 'undefined' && MODE !== 'play') return false;
  if (typeof Vehicle !== 'undefined' && Vehicle.mode !== 'none') return false;
  if (typeof Vehicle !== 'undefined' && Vehicle.near) return false; // no pelear con SUBIR
  if (typeof Player === 'undefined' || !Player || !Player.pos) return false;
  const dx = Player.pos.x - FISH_SPOT.x, dz = Player.pos.z - FISH_SPOT.z;
  return (dx * dx + dz * dz) <= FISH_SPOT.r * FISH_SPOT.r;
}

/* ---------------- construcción (solo mundo 4) ---------------- */
function _fishSignTexture() {
  return canvasTex(512, 256, function (g, w, h) {
    g.fillStyle = '#7a4a21'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#5e3717'; g.fillRect(0, 0, w, 26); g.fillRect(0, h - 26, w, 26);
    g.strokeStyle = '#3d240e'; g.lineWidth = 14; g.strokeRect(7, 7, w - 14, h - 14);
    g.textAlign = 'center';
    g.fillStyle = '#ffe9b8'; g.font = '900 92px "Trebuchet MS", sans-serif';
    g.fillText(_fishT('fish.title'), w / 2, h / 2 + 34);
  });
}

function addFishingContent(idx, lvl) {
  if (idx !== 3 || !lvl || !lvl.group) return;
  _clearTackle();
  F.built = true; F.group = lvl.group;
  F.stage = 'idle';
  const g = lvl.group;
  const woodM = new THREE.MeshStandardMaterial({ color: 0x8a5a33, roughness: 0.85 });
  const darkM = new THREE.MeshStandardMaterial({ color: 0x5e3717, roughness: 0.9 });

  /* muelle: x -62→-56, z 16.9→19.1, deck a 0.35 sobre el agua (0.03) */
  addPlatform(lvl, -59, 0.35, 18, 6, 2.2, { color: 0x8a5a33, emissive: 0x140a04 });
  [[-61.4, 17.05], [-61.4, 18.95], [-59, 17.05], [-59, 18.95], [-56.6, 17.05], [-56.6, 18.95]]
    .forEach(function (p) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 1.1, 8), darkM);
      post.position.set(p[0], -0.15, p[1]); g.add(post);
    });
  for (let i = 0; i < 5; i++) { // ranuras de tablones
    const groove = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.02, 2.2), darkM);
    groove.position.set(-61.1 + i * 1.05, 0.36, 18); g.add(groove);
  }

  /* letrero "🎣 PESCA" junto al extremo del muelle (orilla del Lago Trafford), doble cara */
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 2.6, 8), darkM);
  post.position.set(FISH_SPOT.x, 0.9, FISH_SPOT.z); g.add(post);
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.35, 3.1), woodM);
  board.position.set(FISH_SPOT.x, 2.45, FISH_SPOT.z); g.add(board);
  const tex = _fishSignTexture();
  const faceM = new THREE.MeshBasicMaterial({ map: tex });
  const f1 = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 1.15), faceM);
  f1.rotation.y = -Math.PI / 2; f1.position.set(FISH_SPOT.x - 0.09, 2.45, FISH_SPOT.z); g.add(f1);
  const f2 = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 1.15), faceM);
  f2.rotation.y = Math.PI / 2; f2.position.set(FISH_SPOT.x + 0.09, 2.45, FISH_SPOT.z); g.add(f2);
}

/* ---------------- UI flotante ---------------- */
function _ensureFishUI() {
  if (F._ui) return;
  F._ui = true;
  try {
    const btn = document.createElement('button');
    btn.id = 'fish-btn';
    btn.style.cssText = 'position:fixed;right:14px;bottom:172px;z-index:40;display:none;' +
      'font-size:22px;font-weight:900;padding:14px 20px;border-radius:999px;border:4px solid #fff;' +
      'background:linear-gradient(180deg,#35c759,#1e8e3e);color:#fff;' +
      'box-shadow:0 4px 14px rgba(0,0,0,.45);font-family:inherit;';
    btn.addEventListener('click', function () { _fishAction(); });
    document.body.appendChild(btn);
    F.btn = btn;

    const chip = document.createElement('div');
    chip.id = 'fish-chip';
    chip.style.cssText = 'position:fixed;top:56px;right:10px;z-index:16;display:none;' +
      'font-size:16px;font-weight:800;background:rgba(0,40,80,.55);color:#fff;' +
      'padding:6px 12px;border-radius:999px;border:2px solid rgba(255,255,255,.7);font-family:inherit;';
    document.body.appendChild(chip);
    F.chip = chip;
    _fishPaintChip();

    const bj = document.getElementById('btn-jump');
    if (bj) bj.addEventListener('click', function () { if (F.stage === 'bite') _fishAction(); });
  } catch (e) {}
}
function _fishPaintChip() {
  if (!F.chip) return;
  let n = 0;
  try { n = (typeof SAVE !== 'undefined' && SAVE.fish) || 0; } catch (e) {}
  F.chip.textContent = '🐟 ' + n;
}
function _fishSetBtn(label, visible) {
  if (!F.btn) return;
  F.btn.style.display = visible ? '' : 'none';
  if (label !== F._label) { F._label = label; F.btn.textContent = label; }
}

/* ---------------- aparejo ---------------- */
function _clearTackle() {
  try {
    if (F.bobber && F.bobber.parent) F.bobber.parent.remove(F.bobber);
    if (F.line && F.line.parent) F.line.parent.remove(F.line);
    if (F.bobber) F.bobber.traverse(function (o) {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
    if (F.line) { F.line.geometry.dispose(); F.line.material.dispose(); }
  } catch (e) {}
  F.bobber = null; F.line = null;
}
function _castBobber() {
  _clearTackle();
  const bx = -63.5 - Math.random() * 2.5, bz = 16.8 + Math.random() * 2.4; // dentro del Lago Trafford
  const grp = new THREE.Group();
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xe23b2e, roughness: 0.4 }));
  const bot = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.4 }));
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.22, 6),
    new THREE.MeshStandardMaterial({ color: 0x222222 }));
  tip.position.y = 0.28;
  grp.add(top); grp.add(bot); grp.add(tip);
  grp.position.set(bx, F.bobBaseY, bz);
  F.group.add(grp);
  F.bobber = grp;
  const lg = new THREE.BufferGeometry().setFromPoints(
    [new THREE.Vector3(), new THREE.Vector3(bx, F.bobBaseY + 0.3, bz)]);
  F.line = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: 0xf5f5f5, transparent: true, opacity: 0.85 }));
  F.group.add(F.line);
}

/* ---------------- jugabilidad ---------------- */
function _fishAction() {
  if (F.stage === 'idle') {
    if (!_fishCanAct()) return;
    _castBobber();
    F.stage = 'wait';
    F.waitT = 3 + Math.random() * 4; // 3–7 s
    F.animT = 0;
    try { if (typeof Audio2 !== 'undefined' && Audio2.chute) Audio2.chute(); } catch (e) {}
    try {
      if (typeof Particles !== 'undefined' && Particles.burst && F.bobber)
        Particles.burst(F.bobber.position.x, 0.4, F.bobber.position.z, [0x9fd8ff, 0xffffff], 10, 4);
    } catch (e) {}
  } else if (F.stage === 'bite') {
    if (!_fishCanAct()) return;
    _catchFish();
  }
  /* en 'wait' el botón no hace nada: hay que esperar la picada */
}
function _catchFish() {
  let n = 0;
  try {
    n = ((typeof SAVE !== 'undefined' && SAVE.fish) || 0) + 1;
    if (typeof SAVE !== 'undefined') SAVE.fish = n;
    if (typeof persist === 'function') persist();
  } catch (e) {}
  const name = _fishT('fish.n' + (1 + ((Math.random() * 5) | 0)));
  try {
    if (typeof Particles !== 'undefined' && Particles.burst && F.bobber)
      Particles.burst(F.bobber.position.x, 0.6, F.bobber.position.z,
        [0x9fd8ff, 0xffffff, 0x35c759], 24, 6);
  } catch (e) {}
  try {
    if (typeof Audio2 !== 'undefined' && Audio2.tone) {
      Audio2.tone(660, 0.1, 'triangle', 0.2);
      Audio2.tone(880, 0.16, 'triangle', 0.2, 0.09);
      Audio2.tone(1174, 0.22, 'triangle', 0.18, 0.18);
    }
  } catch (e) {}
  try { if (typeof toast === 'function') toast(tp('fish.caught', { fish: name, n: n })); } catch (e) {}
  _fishPaintChip();
  if (n >= 10) {
    try { if (typeof Trophy !== 'undefined' && Trophy.unlock) Trophy.unlock('fish10'); } catch (e) {}
  }
  F.stage = 'idle';
  _clearTackle();
}
function _fishEscaped() {
  try { if (typeof toast === 'function') toast(_fishT('fish.escaped')); } catch (e) {}
  try { if (typeof Audio2 !== 'undefined' && Audio2.tone) Audio2.tone(220, 0.25, 'sine', 0.12, 0, 140); } catch (e) {}
  F.stage = 'idle';
  _clearTackle();
}

/* ---------------- bucle ---------------- */
function updateFishing(dt) {
  _ensureFishUI();
  if (!_fishInWorld()) { // fuera del mundo 4: ocultar todo y recoger el aparejo
    _fishSetBtn('', false);
    if (F.chip) F.chip.style.display = 'none';
    if (F.stage !== 'idle') { F.stage = 'idle'; _clearTackle(); }
    return;
  }
  if (F.chip) F.chip.style.display = '';
  const near = _fishCanAct();

  if (F.stage === 'wait') {
    F.waitT -= dt;
    if (F.waitT <= 0) { // ¡PICÓ!
      F.stage = 'bite'; F.biteT = 1.4; F.animT = 0;
      try { if (typeof Audio2 !== 'undefined' && Audio2.chute) Audio2.chute(); } catch (e) {}
    }
  } else if (F.stage === 'bite') {
    F.biteT -= dt;
    if (F.biteT <= 0) _fishEscaped();
  }

  /* animación del flotador + sedal */
  if (F.bobber) {
    F.animT += dt;
    if (F.stage === 'bite') {
      F.bobber.position.y = 0.03 + Math.abs(Math.sin(F.animT * 14)) * 0.1;
      F.bobber.rotation.z = Math.sin(F.animT * 18) * 0.35;
    } else {
      F.bobber.position.y = F.bobBaseY + Math.sin(F.animT * 2.5) * 0.05;
      F.bobber.rotation.z = 0;
    }
    if (F.line && typeof Player !== 'undefined' && Player && Player.pos) {
      const lp = F.line.geometry.attributes.position;
      lp.setXYZ(0, Player.pos.x, Player.pos.y + 1.5, Player.pos.z);
      lp.setXYZ(1, F.bobber.position.x, F.bobber.position.y + 0.3, F.bobber.position.z);
      lp.needsUpdate = true;
    }
  }

  /* botón flotante */
  if (F.stage === 'idle') _fishSetBtn(_fishT('fish.cast'), near);
  else if (F.stage === 'wait') _fishSetBtn(_fishT('fish.wait'), near);
  else _fishSetBtn(_fishT('fish.now'), near);
}

/* ---------------- teclado ---------------- */
try {
  if (typeof window !== 'undefined' && !window.__fishKeys) {
    window.__fishKeys = true;
    window.addEventListener('keydown', function (e) {
      if (e.repeat) return;
      if (e.code === 'KeyE') { _fishAction(); }
      else if (e.code === 'Space' && F.stage === 'bite') { _fishAction(); } // atrapar (SALTAR también salta: inofensivo)
    });
  }
} catch (e) {}
