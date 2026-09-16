/* motoboat.js — Trabajador 6: motos, camiones y lanchas GEAYI (diseños 100% originales)
   ============================================================================
   Extiende el sistema de vehículos de vehicles.js EN TIEMPO DE EJECUCIÓN
   (no toca vehicles.js, game.js, index.html, styles.css ni player.js):

     VEHICLE_TYPES['geayi-moto'|'geayi-truck'|'geayi-lancha'] = {...}
     VEHICLE_BUILDERS['geayi-moto'|'geayi-truck'|'geayi-lancha'] = buildXMesh
     MotoBoat.buildForLevel(i, group)  → spawnea unidades manejables con
       addVehicle(...) (moto/camión, kind 'car') y addBoat(...) (lancha, kind 'boat').

   Los 3 usan la física y los controles EXISTENTES (joystick gira + 🟢 ACELERAR,
   avatar sentado al 55% en moto/camión por Vehicle.mode==='car', bobbing de
   lanchas por updateBoat). No necesita update() propio.

   CABLEADO (lo aplica el coordinador, este archivo no toca esos archivos):

   1) index.html, junto a los demás <script> de contenido (después de lots.js):
        <script src="motoboat.js"></script>

   2) game.js, en startLevel(i), junto a los demás buildForLevel (~línea 410):
        if (typeof MotoBoat !== 'undefined') MotoBoat.buildForLevel(i, LEVEL.group); // 🏍️🚚🛥️ motos, camiones y lanchas

   3) El ZIP debe incluir motoboat.js:
        zip -qr obby-3d.zip index.html styles.css *.js img/ audio/

   Todo 100% original GEAYI. Sin saltos. Mundo abierto.
   ============================================================================ */
'use strict';

/* ---------- cachés propios: geometrías y materiales compartidos (Android) ---------- */
const _mbGeoCache = new Map();
function _mbGeo(key, make) {
  let g = _mbGeoCache.get(key);
  if (!g) { g = make(); _mbGeoCache.set(key, g); }
  return g;
}
function _mbBoxGeo(w, h, d) {
  return _mbGeo('box:' + w + 'x' + h + 'x' + d, () => new THREE.BoxGeometry(w, h, d));
}
/* caja con material ya resuelto + rotación opcional (geometría compartida por medidas) */
function _mbb(parent, w, h, d, mat, x, y, z, rx, rz) {
  const m = new THREE.Mesh(_mbBoxGeo(w, h, d), mat);
  m.position.set(x, y, z);
  if (rx) m.rotation.x = rx;
  if (rz) m.rotation.z = rz;
  m.castShadow = true;
  parent.add(m);
  return m;
}
const _mbWheelMotoGeo = () => _mbGeo('wheelMoto', () => new THREE.TorusGeometry(0.42, 0.13, 10, 24));
const _mbWheelTruckGeo = () => _mbGeo('wheelTruck', () => new THREE.CylinderGeometry(0.55, 0.55, 0.42, 14));
const _mbHubGeo = () => _mbGeo('hub', () => new THREE.CylinderGeometry(0.1, 0.1, 0.16, 8));
let _mbGlassMat = null;
function _mbGlass() {
  if (!_mbGlassMat) _mbGlassMat = new THREE.MeshStandardMaterial({ color: 0x9fd8ff, roughness: 0.15, metalness: 0.5 });
  return _mbGlassMat;
}
/* tubo entre dos puntos (horquillas, postes del T-top) */
function _mbTube(g, mat, x1, y1, z1, x2, y2, z2, r) {
  const a = new THREE.Vector3(x1, y1, z1), b = new THREE.Vector3(x2, y2, z2);
  const len = a.distanceTo(b);
  const m = new THREE.Mesh(_mbGeo('tube:' + r, () => new THREE.CylinderGeometry(r, r, 1, 8)), mat);
  m.scale.y = len;
  m.position.copy(a).lerp(b, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize());
  m.castShadow = true;
  g.add(m);
  return m;
}
/* rueda de moto (grupo que gira en X; eje a lo largo de X) */
function _mbMotoWheel(tireM, hubM) {
  const wg = new THREE.Group();
  const tire = new THREE.Mesh(_mbWheelMotoGeo(), tireM);
  tire.rotation.y = Math.PI / 2; tire.castShadow = true; wg.add(tire);
  for (let k = 0; k < 3; k++) {
    const sp = new THREE.Mesh(_mbGeo('spoke', () => new THREE.BoxGeometry(0.05, 0.72, 0.05)), hubM);
    sp.rotation.x = k * Math.PI / 3; wg.add(sp);
  }
  const hub = new THREE.Mesh(_mbHubGeo(), hubM);
  hub.rotation.z = Math.PI / 2; wg.add(hub);
  return wg;
}

/* ============ 🏍️ MOTO DEPORTIVA GEAYI (diseño 100% original) ============
   Carenado agresivo con carenaje delantero inclinado, doble faro LED,
   tanque alto, asiento corrido, colín elevado con luz trasera neón,
   manillar clip-on, escape lateral y franja teal GEAYI.
   Adelante = +z. El conductor va SENTADO: kind 'car' → el sistema existente
   achica el avatar al 55% y lo sienta con seatY. */
function buildMotoMesh(color) {
  const g = new THREE.Group();
  const fair = (typeof vmatGloss === 'function') ? vmatGloss(color == null ? 0x00e5ff : color) : vmat(color == null ? 0x00e5ff : color);
  const dark = vmat(0x23232b), tireM = vmat(0x141418), hubM = vmat(0x9aa5b1);
  // chasis bajo entre las ruedas
  _mbb(g, 0.16, 0.16, 1.7, dark, 0, 0.5, 0);
  // ruedas (giran con updateDrive vía userData.wheels)
  const wheels = [];
  [[0.95], [-0.95]].forEach(([wz]) => {
    const w = _mbMotoWheel(tireM, hubM);
    w.position.set(0, 0.42, wz);
    g.add(w); wheels.push(w);
  });
  g.userData.wheels = wheels;
  // horquilla delantera doble (inclinada hacia el manillar)
  [-0.12, 0.12].forEach(fx => _mbTube(g, hubM, fx, 0.45, 0.95, fx, 1.18, 0.72, 0.045));
  // carenado delantero inclinado + parabrisas
  _mbb(g, 0.56, 0.55, 0.9, fair, 0, 0.95, 0.85, -0.32);
  _mbb(g, 0.4, 0.3, 0.06, _mbGlass(), 0, 1.28, 0.62, -0.5);
  // doble faro LED
  [-0.15, 0.15].forEach(fx => _mbb(g, 0.13, 0.1, 0.06, vmat(0xeaf6ff, 0xbfe9ff, 1), fx, 0.92, 1.28, -0.32));
  // tanque alto
  _mbb(g, 0.55, 0.38, 0.75, fair, 0, 1.05, 0.1);
  // asiento corrido del piloto
  _mbb(g, 0.5, 0.16, 0.75, dark, 0, 0.98, -0.55);
  // colín elevado + luz trasera neón
  _mbb(g, 0.42, 0.28, 0.55, fair, 0, 1.15, -1.1, 0.35);
  _mbb(g, 0.3, 0.09, 0.05, vmat(0xff3d5e, 0xff3d5e, 0.9), 0, 1.2, -1.38, 0.35);
  // manillar clip-on
  _mbb(g, 0.62, 0.08, 0.08, dark, 0, 1.28, 0.72);
  // escape lateral con punta plateada
  const ex = new THREE.Mesh(_mbGeo('exhaust', () => new THREE.CylinderGeometry(0.09, 0.11, 0.9, 10)), dark);
  ex.rotation.x = Math.PI / 2; ex.position.set(0.32, 0.42, -0.35); ex.castShadow = true; g.add(ex);
  const tip = new THREE.Mesh(_mbGeo('exhaustTip', () => new THREE.CylinderGeometry(0.1, 0.1, 0.12, 10)), hubM);
  tip.rotation.x = Math.PI / 2; tip.position.set(0.32, 0.42, -0.82); g.add(tip);
  // insignias GEAYI en el tanque + sello eléctrico en el carenado
  addGeayiBadge(g, 0.29, 1.05, 0.1, Math.PI / 2, 1.0, 0.38);
  addGeayiBadge(g, -0.29, 1.05, 0.1, -Math.PI / 2, 1.0, 0.38);
  addElectricBadge(g, 0.29, 0.95, 0.85, Math.PI / 2, 0.36);
  g.userData.isGeayiBadge = true;
  return g;
}

/* ============ 🚚 CAMIÓN DE CARGA GEAYI (diseño 100% original) ============
   Cabina avanzada (cab-over) con parabrisas panorámico, caja de carga alta
   con franja teal y letreros GEAYI grandes, 6 ruedas, espejos, chimenea de
   escape vertical y defensas. Lento pero imponente. Adelante = +z.
   kind 'car' → avatar al 55% sentado en la cabina (seatY 1.6). */
function buildTruckMesh(color) {
  const g = new THREE.Group();
  const cab = (typeof vmatGloss === 'function') ? vmatGloss(color == null ? 0x00b3a6 : color) : vmat(color == null ? 0x00b3a6 : color);
  const dark = vmat(0x2b2f3a), tireM = vmat(0x1c1c22), steel = vmat(0x9aa5b1, 0xbfe9ff, 0.4);
  const cream = vmat(0xfdf6e3), teal = vmat(0x00b3a6, 0x00e5ff, 0.3);
  // chasis
  _mbb(g, 2.0, 0.35, 7.4, dark, 0, 0.85, 0);
  // cabina avanzada + techo blanco
  _mbb(g, 2.3, 1.7, 1.9, cab, 0, 2.05, 2.5);
  _mbb(g, 2.34, 0.18, 1.94, cream, 0, 3.0, 2.5);
  // parabrisas panorámico
  _mbb(g, 2.0, 0.8, 0.12, _mbGlass(), 0, 2.35, 3.42, -0.15);
  // parrilla + faros + defensa
  _mbb(g, 1.6, 0.5, 0.1, steel, 0, 1.35, 3.48);
  [-0.85, 0.85].forEach(fx => _mbb(g, 0.3, 0.22, 0.08, vmat(0xfff6b0, 0xffe95e, 1), fx, 1.35, 3.5));
  _mbb(g, 2.4, 0.35, 0.25, steel, 0, 0.95, 3.5);
  // caja de carga alta con franja teal
  _mbb(g, 2.5, 2.7, 4.8, cream, 0, 2.5, -0.9);
  _mbb(g, 2.54, 0.4, 4.84, teal, 0, 2.5, -0.9);
  _mbb(g, 2.54, 0.4, 4.84, teal, 0, 3.6, -0.9);
  // 6 ruedas (giran con updateDrive)
  const wheels = [];
  [2.5, -1.4, -2.7].forEach(wz => [-1.15, 1.15].forEach(wx => {
    const w = new THREE.Mesh(_mbWheelTruckGeo(), tireM);
    w.rotation.z = Math.PI / 2; // eje a lo largo de X → gira en rotation.x
    w.position.set(wx, 0.55, wz); w.castShadow = true;
    g.add(w); wheels.push(w);
  }));
  g.userData.wheels = wheels;
  // espejos laterales
  [-1.3, 1.3].forEach(mx => {
    _mbb(g, 0.06, 0.06, 0.4, dark, mx, 2.7, 3.3);
    _mbb(g, 0.08, 0.3, 0.18, dark, mx, 2.55, 3.5);
  });
  // chimenea de escape vertical tras la cabina
  const stack = new THREE.Mesh(_mbGeo('stack', () => new THREE.CylinderGeometry(0.09, 0.09, 2.2, 10)), dark);
  stack.position.set(1.05, 2.4, 1.5); stack.castShadow = true; g.add(stack);
  // guardafangos traseros
  [-1.15, 1.15].forEach(mx => _mbb(g, 0.5, 0.5, 0.08, dark, mx, 0.6, -3.35));
  // insignias GEAYI grandes en la caja + sello eléctrico en la puerta
  addGeayiBadge(g, 1.27, 2.5, -0.9, Math.PI / 2, 2.2, 0.8);
  addGeayiBadge(g, -1.27, 2.5, -0.9, -Math.PI / 2, 2.2, 0.8);
  addElectricBadge(g, 1.16, 1.9, 2.5, Math.PI / 2, 0.45);
  g.userData.isGeayiBadge = true;
  return g;
}

/* ============ 🛥️ LANCHA "MANTA" GEAYI — catamarán (diseño 100% original) ============
   DIFIERE de las existentes: geayi-boat (monocasco teal/blanco, motor fuera
   de borda único), geayi-arrow (monocasco estrecho dorado con alerón) y
   geayi-thunder (monocasco ancho rosa, doble motor). La Manta es un
   CATAMARÁN: dos cascos gemelos azules con franja verde neón, plataforma,
   consola central, T-top con techo, banca trasera y doble motor pequeño
   (uno por casco). Usa la física de botes existente (kind 'boat'):
   addBoat + updateBoat (límite circular del lago + bobbing). */
function buildLanchaMesh() {
  const g = new THREE.Group();
  const blue = vmat(0x1a56ff, 0x2a7bff, 0.25), green = vmat(0x39ff6a, 0x39ff6a, 0.5);
  const cream = vmat(0xfdf6e3), dark = vmat(0x2b2f3a);
  // cascos gemelos + proas en cuña
  [-0.85, 0.85].forEach(hx => {
    _mbb(g, 0.85, 0.75, 4.6, blue, hx, 0.55, -0.1);
    _mbb(g, 0.85, 0.75, 1.2, blue, hx, 0.55, 2.4, 0.5);
    _mbb(g, 0.06, 0.2, 4.64, green, hx + (hx > 0 ? 0.44 : -0.44), 0.6, -0.1); // franja neón exterior
  });
  // plataforma que une los cascos
  _mbb(g, 2.6, 0.16, 4.2, cream, 0, 0.98, -0.1);
  // consola central + parabrisas
  _mbb(g, 0.8, 0.7, 0.6, dark, 0, 1.35, 0.5);
  _mbb(g, 0.7, 0.45, 0.08, _mbGlass(), 0, 1.85, 0.72, -0.3);
  // T-top: 4 postes + techo azul con borde verde
  [[-1.0, -0.6], [1.0, -0.6], [-1.0, 0.9], [1.0, 0.9]].forEach(([px, pz]) =>
    _mbTube(g, dark, px, 1.05, pz, px, 2.6, pz, 0.07));
  _mbb(g, 2.4, 0.12, 1.8, blue, 0, 2.66, 0.15);
  _mbb(g, 2.44, 0.06, 1.84, green, 0, 2.6, 0.15);
  // asientos: 2 delanteros + banca trasera
  [-0.45, 0.45].forEach(sx => _mbb(g, 0.5, 0.5, 0.5, dark, sx, 1.3, 0.3));
  _mbb(g, 1.8, 0.5, 0.5, dark, 0, 1.3, -1.3);
  // doble motor (uno por casco, más pequeños que los del Trueno)
  [-0.85, 0.85].forEach(mx => {
    _mbb(g, 0.4, 0.8, 0.32, dark, mx, 0.65, -2.6);
    _mbb(g, 0.09, 0.45, 0.45, dark, mx, 0.2, -2.6);
  });
  // insignias GEAYI en el exterior de cada casco + sello eléctrico en la consola
  addGeayiBadge(g, 1.29, 0.6, -0.1, Math.PI / 2, 1.4, 0.5);
  addGeayiBadge(g, -1.29, 0.6, -0.1, -Math.PI / 2, 1.4, 0.5);
  addElectricBadge(g, 0.41, 1.35, 0.5, Math.PI / 2, 0.36);
  g.userData.isGeayiBadge = true;
  return g;
}

/* ---- registro en el sistema extensible de vehicles.js ---- */
Object.assign(VEHICLE_TYPES, {
  'geayi-moto':   { name: 'Moto GEAYI 2026 ⚡ ELÉCTRICA',  emoji: '🏍️', maxSpeed: 22, accel: 20, seatY: 0.85 },
  'geayi-truck':  { name: 'Camión GEAYI 2026 ⚡ ELÉCTRICO', emoji: '🚚', maxSpeed: 11, accel: 9,  seatY: 1.6 },
  'geayi-lancha': { name: 'Lancha Manta GEAYI ⚡ ELÉCTRICA', emoji: '🛥️', maxSpeed: 18, accel: 15, seatY: 0.55 },
});
VEHICLE_BUILDERS['geayi-moto'] = buildMotoMesh;
VEHICLE_BUILDERS['geayi-truck'] = buildTruckMesh;
VEHICLE_BUILDERS['geayi-lancha'] = buildLanchaMesh;

/* ---- spawn por mundo (puerta que game.js llama en startLevel) ---- */
const MotoBoat = {
  /* Zonas de spawn verificadas:
     - Ciudad Neón (idx 0): estacionamiento 🅿 en (15,-6) de 14×10 → x∈[8,22], z∈[-11,-1]
       (los carros ocupan la fila z=-9; las motos van en la fila z=-5, sin traslape).
     - Immokalee (idx 3): empacadoras en (98,-8) y (98,-24), cajas de 16×10 → x∈[90,106];
       letrero en (88,-16). Los camiones van en el pasto al OESTE (x=78), ~10u libres.
     - Lago Trafford (idx 3): BOAT_LAKE = { x:-78, z:18, waterY:0.03, r:20 } (vehicles.js).
       Las lanchas de carrera ya ocupan el este (-59,14.5)/(-59,21.5); la Manta va al
       OESTE (-95,14)/(-95,22), a ~17.5 del centro (< 19.5 del límite navegable). */
  buildForLevel(i, lvlOrGroup) {
    try {
      if (typeof THREE === 'undefined') return;
      let lvl = (lvlOrGroup && lvlOrGroup.group && Array.isArray(lvlOrGroup.cars)) ? lvlOrGroup : null;
      if (!lvl) {
        const L = (typeof LEVEL !== 'undefined' && LEVEL && LEVEL.group && Array.isArray(LEVEL.cars)) ? LEVEL : null;
        if (L && (!lvlOrGroup || !lvlOrGroup.add || L.group === lvlOrGroup)) lvl = L;
        else if (lvlOrGroup && typeof lvlOrGroup.add === 'function') lvl = { group: lvlOrGroup, cars: [] };
      }
      if (!lvl || !lvl.group) return;
      const H = Math.PI / 2;
      if (i === 0) { // 🌃 CIUDAD NEÓN — motos en el estacionamiento
        addVehicle(lvl, 'geayi-moto', 11.5, 0, -5, 0x00e5ff, true, -H);
        addVehicle(lvl, 'geayi-moto', 15, 0, -5, 0xff2fd6, true, -H);
      } else if (i === 3) { // 🌴 IMMOKALEE — camiones junto a las empacadoras
        addVehicle(lvl, 'geayi-truck', 78, 0, -16, 0x00b3a6, true, H);
        addVehicle(lvl, 'geayi-truck', 78, 0, -32, 0xff9d00, true, H);
        // 🛥️ lanchas Manta en el Lago Trafford (lado oeste, lejos de las de carrera)
        const Lk = (typeof BOAT_LAKE !== 'undefined') ? BOAT_LAKE : { x: -78, z: 18, waterY: 0.03, r: 20 };
        addBoat(lvl, -95, Lk.waterY, 14, 19.5, { vtype: 'geayi-lancha', wcx: Lk.x, wcz: Lk.z, heading: H });
        addBoat(lvl, -95, Lk.waterY, 22, 19.5, { vtype: 'geayi-lancha', wcx: Lk.x, wcz: Lk.z, heading: H });
      }
    } catch (e) {}
  },
};
