/* ============================================================
   🎳 BOLERA GEAYI — bolera visitable + minijuego de bolos
   ------------------------------------------------------------
   - Bolera "BOLERA GEAYI" en Immokalee (mundo idx 3), centro
     (-144, 25): lote libre verificado por escaneo de ocupación.
     Edificio bajo a nivel del suelo, entrada abierta al este
     (sin puertas que bloqueen), 3 pistas, estilo caramelo.
   - Minijuego táctil: acercarse a la pista → "🎳 JUGAR" →
     apuntar con ◀ ▶ → fijar potencia en la barra → la bola
     rueda con física propia (sin librerías) y tumba los 10 pinos.
   - Turnos con 2 miembros de FAMILY (NPC, sin cambiar sus IDs):
     3 rondas por jugador, marcador por turnos, +20 🪙 si el
     jugador gana.
   - Todo original GEAYI. Sin saltos. Mundo abierto: la bolera
     no bloquea el paso (solo visual, sin colisiones).
   Integración: Bowling.init() en boot(), Bowling.buildForLevel(i,
   LEVEL.group) en startLevel(), Bowling.update(dt) en loop().
   ============================================================ */
'use strict';

/* ---------------- i18n (es/en) ---------------- */
if (typeof addStrings === 'function') {
  addStrings('es', {
    'bowl.play': '🎳 JUGAR',
    'bowl.aim': 'Apunta con ◀ ▶ y toca 🎳',
    'bowl.powerFix': '🎯 ¡FIJA LA POTENCIA!',
    'bowl.exit': '✖ SALIR',
    'bowl.again': '🔁 OTRA VEZ',
    'bowl.score': '🎳 MARCADOR',
    'bowl.round': 'Ronda',
    'bowl.turn': 'Tira',
    'bowl.you': 'Tú',
    'bowl.wait': 'Tira {name}…',
    'bowl.win': '🏆 ¡GANASTE! +20 🪙',
    'bowl.npcwin': '🏆 Ganó {name}',
    'bowl.tie': '🤝 ¡Empate! Nadie se lleva el premio',
    'bowl.strike': '¡CHUZA! 🎳🎳🎳',
    'bowl.pins': '{n} pinos',
    'bowl.welcome': '🎳 ¡Bienvenido a la BOLERA GEAYI! Toca 🎳 JUGAR',
    'bowl.bye': '¡Gracias por jugar! 🎳',
    'bowl.prize': '+20 🪙 ¡premio de campeón!',
    'bowl.name': 'BOLERA GEAYI'
  });
  addStrings('en', {
    'bowl.play': '🎳 PLAY',
    'bowl.aim': 'Aim with ◀ ▶ then tap 🎳',
    'bowl.powerFix': '🎯 LOCK THE POWER!',
    'bowl.exit': '✖ EXIT',
    'bowl.again': '🔁 AGAIN',
    'bowl.score': '🎳 SCOREBOARD',
    'bowl.round': 'Round',
    'bowl.turn': 'Throws',
    'bowl.you': 'You',
    'bowl.wait': '{name} throws…',
    'bowl.win': '🏆 YOU WON! +20 🪙',
    'bowl.npcwin': '🏆 {name} won',
    'bowl.tie': "🤝 It's a tie! No prize this time",
    'bowl.strike': 'STRIKE! 🎳🎳🎳',
    'bowl.pins': '{n} pins',
    'bowl.welcome': '🎳 Welcome to GEAYI BOWLING! Tap 🎳 PLAY',
    'bowl.bye': 'Thanks for playing! 🎳',
    'bowl.prize': '+20 🪙 champion prize!',
    'bowl.name': 'GEAYI BOWLING'
  });
}

/* ---------------- constantes ---------------- */
const BWL = {
  cx: -144, cz: 25,        // centro de la bolera (lote libre verificado)
  W: 22, D: 18,            // tamaño del edificio
  wallH: 4, wallT: 0.5,
  lanes: 3, laneGap: 3.1, laneW: 2.4,
  xApp0: -154.25, xApp1: -149.75,   // approach
  xLane1: -139.75,                  // fin de pista
  xDeck1: -136.55,                  // fin del deck de pinos
  pinX: -139.0,                     // cabeza de bolo (x)
  pinDX: 0.62, pinDZ: 0.62,         // separación de pinos
  ballR: 0.32, pinR: 0.28,
  ballX0: -152.5,                   // salida de la bola
  gutterHalf: 1.2                   // media pista antes del canal
};
const BWL_NPC_IDS = ['ian', 'yael']; // de FAMILY (solo lectura)
const BWL_KNOCK_ORDER = [0, 4, 1, 7, 2, 5, 8, 3, 6, 9]; // orden vistoso p/turno NPC

function bwlLaneZ(i) { return BWL.cz + (i - 1) * BWL.laneGap; }

/* ---------------- cachés de geometría/material (Android) ---------------- */
const _bwG = {}, _bwM = {};
function bwG(k, f) { if (!_bwG[k]) _bwG[k] = f(); return _bwG[k]; }
function bwM(k, f) { if (!_bwM[k]) _bwM[k] = f(); return _bwM[k]; }
function bwBox(w, h, d, color, emissive, ei) {
  const m = new THREE.Mesh(
    bwG('b' + w + 'x' + h + 'x' + d, () => new THREE.BoxGeometry(w, h, d)),
    bwM('m' + color + '_' + (emissive || 0) + '_' + (ei || 0), () =>
      new THREE.MeshStandardMaterial({
        color, roughness: 0.75, metalness: 0.05,
        emissive: emissive || 0x000000, emissiveIntensity: ei || 0
      })));
  return m;
}
function bwCyl(rt, rb, h, color, seg) {
  return new THREE.Mesh(
    bwG('c' + rt + 'x' + rb + 'x' + h, () => new THREE.CylinderGeometry(rt, rb, h, seg || 12)),
    bwM('m' + color + '_0_0', () =>
      new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.05 })));
}
function bwPut(parent, mesh, x, y, z, ry) {
  mesh.position.set(x, y, z);
  if (ry) mesh.rotation.y = ry;
  parent.add(mesh);
  return mesh;
}

/* ---------------- textura del letrero (original) ---------------- */
function bwSignTexture(big, small) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 200;
  const g = c.getContext('2d');
  // fondo caramelo: franjas diagonales rosas/blancas
  g.fillStyle = '#ff5e8a'; g.fillRect(0, 0, 512, 200);
  g.fillStyle = '#ffffff';
  for (let i = -4; i < 14; i++) {
    g.save(); g.translate(i * 56, 0); g.rotate(Math.PI / 5);
    g.fillRect(0, -60, 26, 340); g.restore();
  }
  // marco
  g.strokeStyle = '#7b2fff'; g.lineWidth = 14; g.strokeRect(10, 10, 492, 180);
  g.fillStyle = '#2b0a4a'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '900 64px "Trebuchet MS", sans-serif';
  g.fillText(big, 256, 82);
  g.font = '700 34px "Trebuchet MS", sans-serif';
  g.fillStyle = '#ffffff';
  g.fillText(small, 256, 148);
  const t = new THREE.CanvasTexture(c);
  return t;
}

/* ============================================================
   FÍSICA PROPIA (determinista: sin Math.random aquí)
   ============================================================ */
// posiciones "casa" de los 10 pinos para una pista con centro zc
function bwPinHomes(zc) {
  const homes = [];
  let n = 0;
  for (let r = 0; r < 4; r++) {
    for (let k = 0; k <= r; k++) {
      homes.push({
        // r=0 (cabecera) al OESTE, cerca del jugador; las filas crecen al este
        x: BWL.pinX - (3 - r) * BWL.pinDX,
        z: zc + (k - r / 2) * BWL.pinDZ,
        idx: n++
      });
    }
  }
  return homes;
}
// crea el estado de un lanzamiento (potencia 0..1, notch -2..2)
function bwNewThrow(zc, power, notch) {
  const p = Math.max(0, Math.min(1, power));
  const nt = Math.max(-2, Math.min(2, Math.round(notch)));
  const ang = nt * 0.05;
  const speed = 7 + p * 13;
  const pins = bwPinHomes(zc).map(h => ({
    x: h.x, z: h.z, hx: h.x, hz: h.z, idx: h.idx,
    down: false, vx: 0, vz: 0, tip: 0, fallDx: 0, fallDz: 1, moving: false, age: 0
  }));
  return {
    zc, power: p, notch: nt, t: 0, done: false, counted: false,
    ball: { x: BWL.ballX0, z: zc + nt * 0.3, vx: Math.cos(ang) * speed, vz: Math.sin(ang) * speed, gutter: false },
    pins
  };
}
function bwKnockPin(th, pin, kx, kz) {
  if (pin.down) return;
  pin.down = true;
  pin.moving = true;
  pin.age = 0; // frames desde que cayó (la cadena empieza al frame siguiente)
  const sp = Math.hypot(kx, kz) || 1;
  pin.vx = kx; pin.vz = kz;
  pin.fallDx = kx / sp; pin.fallDz = kz / sp;
  pin.tip = 0.0001;
}
function bwDist2(ax, az, bx, bz) {
  const dx = ax - bx, dz = az - bz;
  return dx * dx + dz * dz;
}
// un paso de física; devuelve true cuando el lanzamiento terminó
function bwStepThrow(th, dt) {
  if (th.done) return true;
  th.t += dt;
  const b = th.ball, zc = th.zc;
  const hitR = BWL.ballR + BWL.pinR;
  // --- bola ---
  if (!b.gutter) {
    b.x += b.vx * dt; b.z += b.vz * dt;
    const damp = Math.max(0, 1 - 0.50 * dt);
    b.vx *= damp; b.vz *= damp;
    if (Math.abs(b.z - zc) > BWL.gutterHalf) { // ¡al canal!
      b.gutter = true;
      b.z = zc + (b.z > zc ? 1 : -1) * (BWL.gutterHalf + 0.175);
      b.vz = 0;
    } else {
      // choque bola-pino
      for (const pin of th.pins) {
        if (pin.down) continue;
        if (bwDist2(b.x, b.z, pin.x, pin.z) < hitR * hitR) {
          const isp = Math.hypot(b.vx, b.vz);
          if (isp < 1.5) { b.vx *= 0.2; b.vz *= 0.2; continue; } // muy lento: no derriba
          const lat = pin.z - b.z; // empuje lateral: hacia afuera de la línea de tiro
          const wob = ((pin.idx % 3) - 1) * 0.8;
          bwKnockPin(th, pin, b.vx * 0.7, b.vz * 0.7 + lat * 2.5 + wob);
          b.vx *= 0.6; b.vz *= 0.6; // la bola pierde fuerza con cada pino
          b.vz += (b.z - pin.z) * 2; // la bola se desvía al golpear de lado
        }
      }
    }
  } else {
    b.x += b.vx * dt;
    b.vx *= Math.max(0, 1 - 0.3 * dt);
  }
  // --- pinos caídos: mover + amortiguar (pase 1) ---
  for (const pin of th.pins) {
    if (pin.down && pin.tip < 1) pin.tip = Math.min(1, pin.tip + dt * 3.2);
    if (!pin.down || !pin.moving) continue;
    pin.x += pin.vx * dt; pin.z += pin.vz * dt;
    const damp = Math.max(0, 1 - 6.0 * dt);
    pin.vx *= damp; pin.vz *= damp;
    pin.age++;
    if (Math.hypot(pin.vx, pin.vz) <= 0.8) pin.moving = false; // (umbral de cadena: 2.0 abajo)
  }
  // --- cadena pino→pino (pase 2): solo pinos caídos en frames anteriores ---
  for (const pin of th.pins) {
    if (!pin.down || !pin.moving || pin.age < 1) continue;
    const sp = Math.hypot(pin.vx, pin.vz);
    if (sp <= 2.0) continue; // solo golpes fuertes encadenan
    for (const q of th.pins) {
      if (q.down || q === pin) continue;
      if (bwDist2(pin.x, pin.z, q.x, q.z) < 0.55 * 0.55) {
        bwKnockPin(th, q, pin.vx * 0.5, pin.vz * 0.5);
      }
    }
  }
  const bsp = Math.hypot(b.vx, b.vz);
  if (bsp < 0.35 || b.x > BWL.xDeck1 + 1.2 || th.t > 7) th.done = true;
  return th.done;
}
function bwCountDown(th) {
  let n = 0;
  for (const pin of th.pins) if (pin.down) n++;
  return n;
}

/* ============================================================
   CONSTRUCCIÓN DE LA BOLERA (solo mundo idx 3 — Immokalee)
   ============================================================ */
function bwBuildAlley(group) {
  const A = new THREE.Group(); // grupo de la bolera
  const cx = BWL.cx, cz = BWL.cz;
  // --- piso ---
  bwPut(A, bwBox(22.8, 0.2, 18.8, 0xd9a066), cx, 0.0, cz);                 // madera base
  bwPut(A, bwBox(23.4, 0.08, 19.4, 0xff5e8a), cx, -0.06, cz);              // borde caramelo
  // --- paredes (bajas, estilo caramelo) ---
  const wallC = 0x8ef2d2, trimC = 0xff5e8a;
  bwPut(A, bwBox(BWL.wallT, BWL.wallH, BWL.D, wallC), cx - BWL.W / 2 + BWL.wallT / 2, BWL.wallH / 2, cz); // oeste
  bwPut(A, bwBox(BWL.W, BWL.wallH, BWL.wallT, wallC), cx, BWL.wallH / 2, cz - BWL.D / 2 + BWL.wallT / 2); // norte
  bwPut(A, bwBox(BWL.W, BWL.wallH, BWL.wallT, wallC), cx, BWL.wallH / 2, cz + BWL.D / 2 - BWL.wallT / 2); // sur
  // este con ENTRADA ABIERTA (hueco z 22.5..27.5, sin puertas)
  const ex = cx + BWL.W / 2 - BWL.wallT / 2;
  bwPut(A, bwBox(BWL.wallT, BWL.wallH, 6.5, wallC), ex, BWL.wallH / 2, 19.25);
  bwPut(A, bwBox(BWL.wallT, BWL.wallH, 6.5, wallC), ex, BWL.wallH / 2, 30.75);
  bwPut(A, bwBox(BWL.wallT, 1.0, 5.0, trimC), ex, BWL.wallH - 0.5, cz); // dintel
  // franjas decorativas en paredes
  for (let i = 0; i < 5; i++) {
    bwPut(A, bwBox(0.1, 0.5, BWL.D - 0.6, i % 2 ? 0xffe95e : 0xffffff),
      cx - BWL.W / 2 + BWL.wallT + 0.02, 3.1, cz);
    bwPut(A, bwBox(BWL.W - 0.6, 0.5, 0.1, i % 2 ? 0x7b2fff : 0xffffff),
      cx - 8 + i * 4, 3.1, cz - BWL.D / 2 + BWL.wallT + 0.02);
  }
  // --- techo plano con borde luminoso ---
  bwPut(A, bwBox(BWL.W + 1, 0.35, BWL.D + 1, 0xff8fb3), cx, BWL.wallH + 0.17, cz);
  bwPut(A, bwBox(BWL.W + 1.2, 0.12, 0.3, 0xffffff, 0xfff6b0, 0.9), cx, BWL.wallH + 0.1, cz - (BWL.D + 1) / 2);
  bwPut(A, bwBox(BWL.W + 1.2, 0.12, 0.3, 0xffffff, 0xfff6b0, 0.9), cx, BWL.wallH + 0.1, cz + (BWL.D + 1) / 2);
  bwPut(A, bwBox(0.3, 0.12, BWL.D + 1, 0xffffff, 0xfff6b0, 0.9), cx - (BWL.W + 1) / 2, BWL.wallH + 0.1, cz);
  // tiras de luz interior
  for (let i = -1; i <= 1; i++)
    bwPut(A, bwBox(14, 0.08, 0.25, 0xffffff, 0xbdf3ff, 1), cx - 1, BWL.wallH - 0.15, cz + i * 3.1);
  // --- letrero sobre la entrada (doble cara) ---
  const signTex = bwSignTexture('🎳 BOLERA', 'GEAYI');
  const signMat = new THREE.MeshBasicMaterial({ map: signTex });
  const s1 = new THREE.Mesh(bwG('signp', () => new THREE.PlaneGeometry(8, 3.1)), signMat);
  const s2 = s1.clone();
  bwPut(A, s1, ex + 0.28, BWL.wallH + 1.9, cz);
  s2.rotation.y = Math.PI;
  bwPut(A, s2, ex - 0.28, BWL.wallH + 1.9, cz);
  bwPut(A, bwCyl(0.18, 0.22, 2.2, 0x5b4a68), ex, BWL.wallH + 0.6, cz - 3.4);
  bwPut(A, bwCyl(0.18, 0.22, 2.2, 0x5b4a68), ex, BWL.wallH + 0.6, cz + 3.4);
  // --- pin gigante decorativo afuera (diseño original) ---
  const px = cx + BWL.W / 2 + 2.6, pz = cz + 6;
  const pinBody = bwCyl(0.55, 1.0, 3.4, 0xffffff, 14); bwPut(A, pinBody, px, 1.7, pz);
  const pinBand = bwCyl(0.62, 0.66, 0.5, 0xff2f5e, 14); bwPut(A, pinBand, px, 2.9, pz);
  const pinHead = new THREE.Mesh(bwG('pinsph', () => new THREE.SphereGeometry(0.55, 14, 10)),
    bwM('mpinw', () => new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 })));
  bwPut(A, pinHead, px, 3.85, pz);
  bwPut(A, bwCyl(1.3, 1.5, 0.3, 0x7b2fff, 14), px, 0.15, pz); // base

  // --- pistas ---
  const lanes = [];
  for (let i = 0; i < BWL.lanes; i++) {
    const zc = bwlLaneZ(i);
    const lane = { zc, pins: [] };
    // approach + pista + deck
    bwPut(A, bwBox(4.5, 0.14, 2.6, 0xe8b96f), -152, 0.07, zc);                    // approach
    bwPut(A, bwBox(10, 0.14, BWL.laneW, 0xf4d79a), -144.75, 0.07, zc);           // pista
    bwPut(A, bwBox(10, 0.02, 0.18, 0x7b2fff, 0x7b2fff, 0.35), -144.75, 0.15, zc); // línea guía
    bwPut(A, bwBox(10, 0.1, 0.4, 0x4a3f66), -144.75, 0.05, zc - 1.4);            // canal izq
    bwPut(A, bwBox(10, 0.1, 0.4, 0x4a3f66), -144.75, 0.05, zc + 1.4);            // canal der
    bwPut(A, bwBox(3.2, 0.14, 3.4, 0xd89a55), -138.15, 0.07, zc);                // deck
    bwPut(A, bwBox(0.5, 1.3, 3.4, 0x2b2440), -136.3, 0.65, zc);                  // colchón trasero
    bwPut(A, bwBox(1.1, 0.5, 0.8, 0x35c759), -151, 0.35, zc + 2.1);              // retorno de bolas
    // 10 pinos (originales: cuerpo + banda)
    const bodyG = bwG('pinbody', () => new THREE.CylinderGeometry(0.13, 0.2, 0.8, 10));
    const bandG = bwG('pinband', () => new THREE.CylinderGeometry(0.145, 0.15, 0.14, 10));
    const bodyM = bwM('pinwm', () => new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45 }));
    const bandM = bwM('pinrm', () => new THREE.MeshStandardMaterial({ color: 0xff2f5e, roughness: 0.5 }));
    for (const h of bwPinHomes(zc)) {
      const pivot = new THREE.Group();
      const tilt = new THREE.Group();
      const body = new THREE.Mesh(bodyG, bodyM); body.position.y = 0.4;
      const band = new THREE.Mesh(bandG, bandM); band.position.y = 0.62;
      tilt.add(body); tilt.add(band); pivot.add(tilt);
      pivot.position.set(h.x, 0.14, h.z);
      A.add(pivot);
      lane.pins.push({ pivot, tilt, hx: h.x, hz: h.z, idx: h.idx });
    }
    lanes.push(lane);
  }
  // bancas de colores junto a la pared norte
  bwPut(A, bwBox(3, 0.5, 1, 0x35c759), -146, 0.35, 17.6);
  bwPut(A, bwBox(3, 0.5, 1, 0x00a2ff), -142, 0.35, 17.6);
  bwPut(A, bwBox(3, 0.5, 1, 0xffe95e), -138, 0.35, 17.6);

  group.add(A);
  return { group: A, lanes };
}
// devuelve los pinos visuales a su posición inicial
function bwResetLanePins(alley, li) {
  const lane = alley.lanes[li];
  for (const p of lane.pins) {
    p.pivot.position.set(p.hx, 0.14, p.hz);
    p.pivot.rotation.set(0, 0, 0);
    p.tilt.rotation.set(0, 0, 0);
  }
}
// sincroniza los meshes con el estado físico de un lanzamiento
function bwSyncThrow(alley, li, th) {
  const lane = alley.lanes[li];
  for (let i = 0; i < th.pins.length; i++) {
    const sp = th.pins[i], vp = lane.pins[i];
    vp.pivot.position.set(sp.x, 0.14, sp.z);
    if (sp.down) {
      vp.pivot.rotation.y = Math.atan2(sp.fallDx, sp.fallDz);
      vp.tilt.rotation.x = Math.min(1, sp.tip) * 1.45;
    }
  }
  const bm = alley.ballMesh;
  bm.visible = true;
  bm.position.set(th.ball.x, 0.14 + BWL.ballR, th.ball.z);
  bm.rotation.x -= Math.hypot(th.ball.vx, th.ball.vz) * 0.016 / BWL.ballR;
}

/* ============================================================
   MÓDULO Bowling — ciclo de vida + minijuego
   ============================================================ */
function bwClick() { try { if (typeof Audio2 !== 'undefined' && Audio2) Audio2.click(); } catch (e) {} }
function bwToast(m) { try { if (typeof toast === 'function') toast(m); } catch (e) {} }
function bwT(k) { try { if (typeof T === 'function') return T(k); } catch (e) {} return k; }
function bwTp(k, v) { try { if (typeof tp === 'function') return tp(k, v); } catch (e) {} return k; }

const Bowling = {
  alley: null, game: null, _ui: false, _els: {}, _levelGroup: null,

  /* ---------- init: UI táctil (idempotente, sin THREE) ---------- */
  init() {
    if (this._ui) return;
    this._ui = true;
    const E = this._els;
    const mk = (id, html, css, tag) => {
      const b = document.createElement(tag || 'button');
      b.id = id;
      b.innerHTML = html;
      b.style.cssText = 'position:fixed;z-index:46;display:none;' + css;
      document.body.appendChild(b);
      E[id] = b;
      return b;
    };
    const bigBtn = 'min-width:56px;min-height:56px;font-size:20px;font-weight:900;' +
      'padding:12px 20px;border-radius:999px;border:4px solid #fff;color:#fff;' +
      'box-shadow:0 4px 14px rgba(0,0,0,.45);font-family:inherit;';
    const bm = mk('bw-play', '🎳 JUGAR',
      bigBtn + 'left:14px;bottom:150px;background:linear-gradient(180deg,#ff5e8a,#c2185b);');
    bm.addEventListener('click', () => { bwClick(); Bowling.startGame(); });
    // panel marcador
    mk('bw-panel', '',
      'top:56px;left:50%;transform:translateX(-50%);font-size:16px;font-weight:700;' +
      'background:rgba(20,6,30,.85);color:#fff;padding:10px 16px;border-radius:16px;' +
      'border:3px solid #ff5e8a;text-align:center;max-width:92vw;');
    // apuntar
    const ab = 'width:60px;height:60px;border-radius:50%;font-size:26px;font-weight:900;' +
      'border:4px solid #fff;color:#fff;background:rgba(123,47,255,.85);font-family:inherit;';
    const al = mk('bw-aimL', '◀', ab + 'left:14px;bottom:230px;');
    const ar = mk('bw-aimR', '▶', ab + 'left:88px;bottom:230px;');
    al.addEventListener('click', () => { bwClick(); Bowling.aim(-1); });
    ar.addEventListener('click', () => { bwClick(); Bowling.aim(1); });
    // lanzar / fijar potencia
    const th = mk('bw-throw', '🎳',
      'width:84px;height:84px;border-radius:50%;font-size:38px;border:5px solid #fff;' +
      'background:linear-gradient(180deg,#00c48a,#007a55);box-shadow:0 4px 16px rgba(0,0,0,.5);' +
      'right:16px;bottom:120px;font-family:inherit;');
    th.addEventListener('click', () => { bwClick(); Bowling.throwTap(); });
    // barra de potencia
    const pw = mk('bw-pow', '<div id="bw-powfill"></div>',
      'left:50%;transform:translateX(-50%);bottom:24px;width:min(420px,70vw);height:30px;' +
      'border-radius:999px;border:3px solid #fff;background:rgba(0,0,0,.55);overflow:hidden;padding:0;',
      'div');
    // salir / otra vez
    const ex = mk('bw-exit', '✖', bigBtn + 'right:14px;top:56px;background:linear-gradient(180deg,#5a6a7a,#333d47);font-size:18px;');
    ex.addEventListener('click', () => { bwClick(); Bowling.exitGame(); });
    const ag = mk('bw-again', '🔁',
      bigBtn + 'right:16px;bottom:220px;background:linear-gradient(180deg,#00a2ff,#005a8a);');
    ag.addEventListener('click', () => { bwClick(); Bowling.startGame(); });
    this._powFill = null;
  },

  /* ---------- construcción por nivel ---------- */
  buildForLevel(idx, group) {
    try { this._clearAlley(); } catch (e) {}
    if (idx !== 3 || !group) { this.alley = null; return; }
    try {
      const built = bwBuildAlley(group);
      // bola reutilizable (oculta hasta lanzar)
      const ball = new THREE.Mesh(
        bwG('bowlball', () => new THREE.SphereGeometry(BWL.ballR, 16, 12)),
        bwM('bowlballm', () => new THREE.MeshStandardMaterial({
          color: 0x00e5ff, roughness: 0.25, metalness: 0.15,
          emissive: 0x00a2ff, emissiveIntensity: 0.35
        })));
      ball.castShadow = true; ball.visible = false;
      built.group.add(ball);
      // flecha de apuntado
      const arrow = new THREE.Mesh(
        bwG('bowlarrow', () => new THREE.ConeGeometry(0.28, 0.9, 10)),
        bwM('bowlarrowm', () => new THREE.MeshBasicMaterial({ color: 0xffe95e })));
      arrow.rotation.z = -Math.PI / 2;
      arrow.visible = false;
      built.group.add(arrow);
      this.alley = built;
      this.alley.ballMesh = ball;
      this.alley.aimArrow = arrow;
      this.alley.lane = 1;
      this._levelGroup = group;
    } catch (e) { this.alley = null; }
  },
  _clearAlley() {
    try { this.exitGame(true); } catch (e) { this.game = null; }
    if (this.alley && this.alley.group && this._levelGroup) {
      try { this._levelGroup.remove(this.alley.group); } catch (e) {}
    }
    this.alley = null;
    // clearLevel() dispone las geometrías/materiales del nivel anterior:
    // vaciar cachés para reconstruirlas frescas al volver a Immokalee
    for (const k in _bwG) delete _bwG[k];
    for (const k in _bwM) delete _bwM[k];
    this._hideAll();
  },
  _hideAll() {
    const E = this._els;
    ['bw-play', 'bw-panel', 'bw-aimL', 'bw-aimR', 'bw-throw', 'bw-pow', 'bw-exit', 'bw-again']
      .forEach(id => { if (E[id]) E[id].style.display = 'none'; });
  },

  /* ---------- update (loop) ---------- */
  update(dt) {
    try {
      if (!this.alley) return;
      if (typeof LEVEL === 'undefined' || !LEVEL || LEVEL.idx !== 3) return;
      if (typeof MODE !== 'undefined' && MODE !== 'play') return;
      if (typeof Player === 'undefined' || !Player || !Player.pos) return;
      const G = this.game;
      if (!G) { this._proximity(); return; }
      if (G.state === 'power') {
        G.powerT += dt;
        const osc = (Math.sin(G.powerT * 4.6) + 1) / 2;
        G.power = 0.25 + 0.75 * osc;
        this._paintPower();
      } else if (G.state === 'roll' && G.throw_) {
        bwStepThrow(G.throw_, Math.min(dt, 0.05));
        bwSyncThrow(this.alley, G.lane, G.throw_);
        if (G.throw_.done) {
          G.endT += dt;
          if (G.endT > 1.0 && !G.counted) {
            G.counted = true;
            const n = bwCountDown(G.throw_);
            G.scores['player'][G.round] = n;
            this._setMsg(n === 10 ? bwT('bowl.strike') : bwTp('bowl.pins', { n }));
            bwResetLanePins(this.alley, G.lane);
            this.alley.ballMesh.visible = false;
            G.pauseT = 0; G.state = 'pause'; G.afterPause = 'next';
          }
        }
      } else if (G.state === 'pause') {
        G.pauseT += dt;
        if (G.pauseT > 0.9) this._nextTurn();
      } else if (G.state === 'npc') {
        this._npcUpdate(dt);
      }
    } catch (e) { /* nunca romper el loop */ }
  },
  _proximity() {
    const E = this._els;
    if (!E['bw-play']) return;
    let vMode = 'none';
    try { if (typeof Vehicle !== 'undefined' && Vehicle) vMode = Vehicle.mode; } catch (e) {}
    const d = Math.hypot(Player.pos.x - BWL.ballX0, Player.pos.z - BWL.cz);
    const show = vMode === 'none' && d < 8 && (typeof finished === 'undefined' || !finished);
    E['bw-play'].style.display = show ? 'block' : 'none';
    if (show && !this._welcomed) { this._welcomed = true; bwToast(bwT('bowl.welcome')); }
    if (!show) this._welcomed = false;
  },

  /* ---------- flujo del juego ---------- */
  startGame() {
    if (!this.alley) return;
    if (this.game) {
      if (this.game.state === 'over') { try { this.exitGame(true); } catch (e) { this.game = null; } }
      else return;
    }
    const famOf = (id) => {
      try {
        if (typeof FAMILY !== 'undefined' && FAMILY) {
          const f = FAMILY.find(x => x.id === id);
          if (f) return { id: f.id, name: f.name || id, fam: f };
        }
      } catch (e) {}
      return { id, name: id, fam: null };
    };
    const players = [{ id: 'player', name: bwT('bowl.you'), fam: null }]
      .concat(BWL_NPC_IDS.map(famOf));
    const scores = {};
    players.forEach(p => { scores[p.id] = [0, 0, 0]; });
    const G = this.game = {
      state: 'aim', players, scores, round: 0, turn: 0,
      notch: 0, power: 0.6, powerT: 0, throw_: null,
      endT: 0, counted: false, pauseT: 0, afterPause: null,
      npcK: 0, npcT: 0, npcKnocked: 0, npcAnim: [],
      lane: this.alley.lane, npcMeshes: []
    };
    // NPCs como espectadores (avatares de la familia)
    try {
      players.slice(1).forEach((p, i) => {
        let style = { body: '#35c759' };
        if (p.fam && typeof familyStyle === 'function') {
          try { style = familyStyle(p.fam); } catch (e) {}
        }
        if (typeof createAvatarMesh !== 'function') return;
        const mesh = createAvatarMesh(style);
        if (typeof makeNameLabel === 'function') {
          const label = makeNameLabel(p.name, '#ff5e8a');
          label.position.y = 2.6;
          mesh.add(label);
        }
        mesh.position.set(-150 + i * 2.2, 0.1, 17.9);
        if (LEVEL && LEVEL.group) LEVEL.group.add(mesh);
        G.npcMeshes.push({ id: p.id, mesh, hx: -150 + i * 2.2, hz: 17.9 });
      });
    } catch (e) {}
    bwResetLanePins(this.alley, G.lane);
    this.alley.ballMesh.visible = false;
    try { Player.pos.set(-153.5, 0.6, BWL.cz); } catch (e) {}
    this._showGameUI(true);
    this._updateAim();
    this._renderScores();
    this._setMsg(bwT('bowl.aim'));
    this._els['bw-play'].style.display = 'none';
    this._els['bw-exit'].style.display = 'block';
  },
  exitGame(silent) {
    const G = this.game;
    if (G && G.npcMeshes) {
      try {
        G.npcMeshes.forEach(n => { if (LEVEL && LEVEL.group && n.mesh) LEVEL.group.remove(n.mesh); });
      } catch (e) {}
    }
    if (this.alley) {
      try {
        bwResetLanePins(this.alley, this.alley.lane);
        this.alley.ballMesh.visible = false;
        this.alley.aimArrow.visible = false;
      } catch (e) {}
    }
    this.game = null;
    this._hideAll();
    if (!silent) bwToast(bwT('bowl.bye'));
  },
  aim(d) {
    const G = this.game;
    if (!G || G.state !== 'aim') return;
    G.notch = Math.max(-2, Math.min(2, G.notch + d));
    this._updateAim();
  },
  _updateAim() {
    const G = this.game;
    if (!G || !this.alley || !this.alley.aimArrow) return;
    const a = this.alley.aimArrow, zc = bwlLaneZ(G.lane);
    const show = G.state === 'aim' || G.state === 'power';
    a.visible = show;
    if (show) {
      a.position.set(BWL.ballX0 + 0.9, 0.55, zc + G.notch * 0.3);
      a.rotation.y = -G.notch * 0.05;
    }
  },
  throwTap() {
    const G = this.game;
    if (!G) return;
    if (G.state === 'aim') {
      G.state = 'power'; G.powerT = 0;
      this._els['bw-throw'].innerHTML = '🎯';
      this._els['bw-pow'].style.display = 'block';
      this._setMsg(bwT('bowl.powerFix'));
      this._showAimUI(false);
    } else if (G.state === 'power') {
      this._launch(G.power);
    }
  },
  _launch(power) {
    const G = this.game;
    const zc = bwlLaneZ(G.lane);
    G.throw_ = bwNewThrow(zc, power, G.notch);
    G.state = 'roll'; G.endT = 0; G.counted = false;
    this._els['bw-throw'].innerHTML = '🎳';
    this._els['bw-pow'].style.display = 'none';
    this._els['bw-throw'].style.display = 'none';
    if (this.alley.aimArrow) this.alley.aimArrow.visible = false;
  },
  _paintPower() {
    const G = this.game;
    let fill = this._powFill;
    if (!fill) {
      try {
        fill = this._els['bw-pow'] && this._els['bw-pow'].querySelector('#bw-powfill');
        // el stub no implementa querySelector real: buscar en hijos
        if (!fill && this._els['bw-pow']) {
          const kids = this._els['bw-pow'].children || [];
          for (const k of kids) fill = fill || k;
        }
        this._powFill = fill || null;
      } catch (e) { fill = null; }
    }
    if (fill && fill.style) {
      fill.style.cssText = 'height:100%;width:' + Math.round(G.power * 100) + '%;' +
        'background:linear-gradient(90deg,#35c759,#ffe95e,#ff2f5e);border-radius:999px;';
    }
  },

  /* ---------- turno NPC (resultado simple 0-10) ---------- */
  npcResult() {
    return Math.floor(Math.random() * 11);
  },
  _startNpc() {
    const G = this.game;
    const p = G.players[G.turn];
    G.state = 'npc';
    G.npcK = Math.max(0, Math.min(10, this.npcResult()));
    G.npcT = 0; G.npcKnocked = 0; G.npcAnim = [];
    this._setMsg(bwTp('bowl.wait', { name: p.name }));
    this._showAimUI(false);
    this._els['bw-throw'].style.display = 'none';
    // el NPC pasa a la pista
    const nm = G.npcMeshes.find(n => n.id === p.id);
    if (nm) nm.mesh.position.set(BWL.ballX0, 0.1, bwlLaneZ(G.lane));
  },
  _npcUpdate(dt) {
    const G = this.game;
    G.npcT += dt;
    const lane = this.alley.lanes[G.lane];
    while (G.npcKnocked < G.npcK && G.npcT > 0.35 + G.npcKnocked * 0.16) {
      const vp = lane.pins[BWL_KNOCK_ORDER[G.npcKnocked]];
      vp.pivot.rotation.y = (G.npcKnocked % 2 ? 0.8 : -0.8);
      G.npcAnim.push({ vp, t: 0 });
      G.npcKnocked++;
    }
    for (const a of G.npcAnim) {
      if (a.t < 1) { a.t = Math.min(1, a.t + dt * 3.4); a.vp.tilt.rotation.x = a.t * 1.45; }
    }
    if (G.npcT > 0.35 + G.npcK * 0.16 + 1.0) {
      G.scores[G.players[G.turn].id][G.round] = G.npcK;
      // el NPC vuelve con los demás
      const nm = G.npcMeshes.find(n => n.id === G.players[G.turn].id);
      if (nm) nm.mesh.position.set(nm.hx, 0.1, nm.hz);
      bwResetLanePins(this.alley, G.lane);
      this._renderScores();
      G.state = 'pause'; G.pauseT = 0;
    }
  },
  _nextTurn() {
    const G = this.game;
    if (!G) return;
    G.turn++;
    if (G.turn >= G.players.length) {
      G.turn = 0; G.round++;
      if (G.round >= 3) { this._gameOver(); return; }
    }
    this._renderScores();
    const p = G.players[G.turn];
    if (p.id === 'player') {
      G.state = 'aim'; G.notch = 0;
      this._showAimUI(true);
      this._els['bw-throw'].style.display = 'block';
      this._els['bw-throw'].innerHTML = '🎳';
      this._updateAim();
      this._setMsg(bwT('bowl.aim') + ' · ' + bwT('bowl.round') + ' ' + (G.round + 1) + '/3');
    } else {
      this._startNpc();
    }
  },
  _gameOver() {
    const G = this.game;
    G.state = 'over';
    const totals = G.players.map(p => ({
      id: p.id, name: p.name,
      total: G.scores[p.id][0] + G.scores[p.id][1] + G.scores[p.id][2]
    }));
    totals.sort((a, b) => b.total - a.total);
    const best = totals[0].total;
    const winners = totals.filter(t => t.total === best);
    const playerTotal = totals.find(t => t.id === 'player').total;
    let msg;
    if (winners.length === 1 && winners[0].id === 'player') {
      try {
        SAVE.coins += 20;
        if (typeof persist === 'function') persist();
        if (typeof $ === 'function') { const h = $('hud-coins'); if (h) h.textContent = SAVE.coins; }
      } catch (e) {}
      msg = bwT('bowl.win') + ' ' + bwT('bowl.prize');
      bwToast(bwT('bowl.win'));
    } else if (winners.length === 1) {
      msg = bwTp('bowl.npcwin', { name: winners[0].name });
    } else {
      msg = bwT('bowl.tie');
    }
    this._setMsg(msg + ' — ' + bwTp('bowl.pins', { n: playerTotal }));
    this._showAimUI(false);
    this._els['bw-throw'].style.display = 'none';
    this._els['bw-pow'].style.display = 'none';
    this._els['bw-again'].style.display = 'block';
    if (this.alley.aimArrow) this.alley.aimArrow.visible = false;
  },

  /* ---------- UI ---------- */
  _showGameUI(on) {
    const E = this._els, d = on ? 'block' : 'none';
    E['bw-panel'].style.display = d;
    E['bw-exit'].style.display = d;
    this._showAimUI(on);
    E['bw-throw'].style.display = d;
    E['bw-throw'].innerHTML = '🎳';
    if (!on) { E['bw-pow'].style.display = 'none'; E['bw-again'].style.display = 'none'; }
  },
  _showAimUI(on) {
    const E = this._els, d = on ? 'block' : 'none';
    E['bw-aimL'].style.display = d;
    E['bw-aimR'].style.display = d;
  },
  _setMsg(html) {
    const E = this._els;
    if (E['bw-panel']) {
      E['bw-panel'].innerHTML = (this._scoreHTML || '') +
        '<div style="margin-top:6px;font-size:15px;color:#ffe95e;">' + html + '</div>';
    }
  },
  _renderScores() {
    const G = this.game;
    if (!G) return;
    let h = '<div style="font-size:18px;margin-bottom:4px;">' + bwT('bowl.score') +
      ' · ' + bwT('bowl.round') + ' ' + (Math.min(G.round, 2) + 1) + '/3</div>';
    h += '<table style="margin:0 auto;border-collapse:collapse;font-size:14px;">';
    h += '<tr><td></td><td style="padding:2px 8px;">1</td><td style="padding:2px 8px;">2</td>' +
      '<td style="padding:2px 8px;">3</td><td style="padding:2px 8px;">Σ</td></tr>';
    G.players.forEach((p, i) => {
      const s = G.scores[p.id];
      const tot = s[0] + s[1] + s[2];
      const cur = (G.state !== 'over' && i === G.turn) ? ' style="color:#ffe95e;"' : '';
      h += '<tr' + cur + '><td style="padding:2px 8px;text-align:left;">' + p.name + '</td>' +
        s.map(v => '<td style="padding:2px 8px;">' + v + '</td>').join('') +
        '<td style="padding:2px 8px;font-weight:900;">' + tot + '</td></tr>';
    });
    h += '</table>';
    this._scoreHTML = h;
    this._setMsg('');
  },

  /* ---------- ayuda para pruebas: tiro síncrono determinista ---------- */
  _cacheG() { return _bwG; },
  simThrow(power, notch) {
    const th = bwNewThrow(bwlLaneZ(1), power, notch);
    let steps = 0;
    while (!bwStepThrow(th, 1 / 60) && steps < 1200) steps++;
    return { pins: bwCountDown(th), steps };
  }
};
