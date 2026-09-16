/* vehicles.js — FASE 2: aviones volables, paracaídas, carros, bicis y peatones (NPCs)
   No rompe nada existente: toda la física normal sigue en player.js.
   updatePlayer() delega aquí cuando Vehicle.mode !== 'none'. */
'use strict';

/* ---------- caché de materiales (menos programas de GPU = mejor en teléfonos) ---------- */
const _vmatCache = new Map();
function vmat(color, emissive, emissiveIntensity) {
  const key = color + '|' + (emissive || 0) + '|' + (emissiveIntensity || 0);
  let m = _vmatCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color, roughness: 0.55, metalness: 0.15,
      emissive: emissive || 0x000000, emissiveIntensity: emissiveIntensity || 0
    });
    _vmatCache.set(key, m);
  }
  return m;
}
function vbox(parent, w, h, d, color, x, y, z, emissive, ei) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), vmat(color, emissive, ei));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}
/* carrocería brillante: más brillo especular en carros y vidrios (se ve "nuevo") */
function vmatGloss(color) {
  const key = 'gloss|' + color;
  let m = _vmatCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: 0.28, metalness: 0.4 });
    _vmatCache.set(key, m);
  }
  return m;
}
function vboxGloss(parent, w, h, d, color, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), vmatGloss(color));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

/* ================= ESTADO DEL VEHÍCULO ================= */
const Vehicle = {
  mode: 'none',   // none | plane | car | bike
  def: null,      // definición del vehículo abordado (de LEVEL.planes / LEVEL.cars)
  near: null,     // { type, def } más cercano para el botón SUBIR
  heading: 0, speed: 0, pitch: 0, boostT: 0,
  pPos: null      // posición del avión en vuelo (Vector3)
};

/* ================= AVIÓN BLOQUEADO ================= */
function buildPlaneMesh(color) {
  const g = new THREE.Group();
  g.rotation.order = 'YXZ';
  vbox(g, 0.9, 0.9, 3.6, color, 0, 0, 0);                    // fuselaje
  vbox(g, 0.7, 0.7, 0.7, 0x2b2f3a, 0, 0, 2.0);               // nariz
  vbox(g, 5.2, 0.18, 1.1, 0xf5f0e6, 0, 0.15, 0.3);           // alas
  vbox(g, 2.2, 0.15, 0.7, 0xf5f0e6, 0, 0.25, -1.6);          // estabilizador
  vbox(g, 0.15, 1.0, 0.8, color, 0, 0.6, -1.6);              // cola vertical
  vbox(g, 0.7, 0.5, 1.0, 0x9fd8ff, 0, 0.62, 0.2);            // cabina
  vbox(g, 0.5, 0.5, 0.3, 0x2b2f3a, 0, -0.55, 1.2);           // tren delantero
  // hélice (gira en vuelo)
  const prop = new THREE.Group();
  prop.position.set(0, 0, 2.42);
  vbox(prop, 0.16, 1.7, 0.08, 0x2b2f3a, 0, 0, 0);
  vbox(prop, 1.7, 0.16, 0.08, 0x2b2f3a, 0, 0, 0);
  g.add(prop);
  g.userData.prop = prop;
  g.userData.wheels = [];
  return g;
}
function addPlanePad(lvl, x, y, z, color) {
  // plataforma del pad (la crea quien llama con addPlatform)
  const pad = new THREE.Group();
  pad.position.set(x, y, z);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.18, 10, 32), vmat(0x00e5ff, 0x00e5ff, 1));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.12;
  pad.add(ring);
  // marca "H"
  vbox(pad, 0.5, 0.06, 1.6, 0xffffff, -0.55, 0.1, 0);
  vbox(pad, 0.5, 0.06, 1.6, 0xffffff, 0.55, 0.1, 0);
  vbox(pad, 1.6, 0.06, 0.5, 0xffffff, 0, 0.1, 0);
  lvl.group.add(pad);
  const plane = buildPlaneMesh(color || 0xff5533);
  plane.position.set(x, y + 1.2, z);
  lvl.group.add(plane);
  lvl.planes.push({ x, y, z, mesh: plane, pad, taken: false });
}

/* ================= CARRO / BICI BLOQUEADOS ================= */
/* ============ CARROS DE LUJO GEAYI (diseños 100% originales) ============
   Tipos reales: sedan (sedán de lujo), sport (deportivo), suv (camioneta).
   Nada copiado de marcas reales: insignias GEAYI propias. */
function luxTrim(g, w, h, d, x, y, z) { // moldura cromada
  vbox(g, w, h, d, 0xd9dee8, x, y, z, 0xd9dee8, 0.5);
}
function luxGlass(g, w, h, d, x, y, z) { // vidrio tinteado de lujo
  vboxGloss(g, w, h, d, 0x16242f, x, y, z);
}
function luxBadgeDoors(g, zc, hw) { // insignias GEAYI en las puertas
  const x = (hw || 0.925) + 0.02;
  addGeayiBadge(g, -x, 0.95, zc, -Math.PI / 2, 0.9, 0.34);
  addGeayiBadge(g, x, 0.95, zc, Math.PI / 2, 0.9, 0.34);
}
function buildSedanMesh(color) { // SEDÁN DE LUJO elegante y largo
  const g = new THREE.Group();
  vboxGloss(g, 1.85, 0.55, 4.4, color, 0, 0.62, 0);                    // carrocería
  vboxGloss(g, 1.7, 0.28, 1.1, color, 0, 0.55, 1.75);                  // cofre bajo
  const shield = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.42, 0.1), vmat(0x16242f, 0x16242f, 0.4));
  shield.position.set(0, 0.62, 2.28); shield.rotation.x = -0.25; g.add(shield); // parrilla inclinada
  luxGlass(g, 1.5, 0.5, 2.0, 0, 1.12, -0.2);                          // cabina tinteada
  const ws = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.06, 0.9), vmat(0x16242f, 0x16242f, 0.5));
  ws.position.set(0, 1.05, 0.95); ws.rotation.x = 0.5; g.add(ws);      // parabrisas inclinado
  vboxGloss(g, 1.55, 0.09, 1.15, color, 0, 1.4, -0.25);                // techo panorámico (marco)
  luxGlass(g, 1.3, 0.05, 0.95, 0, 1.42, -0.25);                        // techo de cristal
  luxTrim(g, 1.56, 0.06, 2.06, 0, 0.9, -0.2);                          // moldura cromada de ventanas
  vbox(g, 1.86, 0.16, 4.42, 0x2b2f3a, 0, 0.36, 0);                     // faldón
  luxTrim(g, 1.87, 0.05, 4.42, 0, 0.47, 0);                            // línea cromada lateral
  vbox(g, 1.9, 0.22, 0.18, 0xd9dee8, 0, 0.45, 2.24, 0xd9dee8, 0.4);     // defensa cromada
  vbox(g, 1.9, 0.22, 0.18, 0xd9dee8, 0, 0.45, -2.24, 0xd9dee8, 0.4);
  vbox(g, 0.62, 0.14, 0.08, 0xeaf6ff, -0.5, 0.72, 2.26, 0xbfe9ff, 1);   // faros LED
  vbox(g, 0.62, 0.14, 0.08, 0xeaf6ff, 0.5, 0.72, 2.26, 0xbfe9ff, 1);
  vbox(g, 1.5, 0.12, 0.08, 0xff3d5e, 0, 0.72, -2.26, 0xff3d5e, 0.9);    // barra trasera LED
  vbox(g, 0.16, 0.05, 0.05, 0xd9dee8, -0.93, 0.85, 0.3, 0xd9dee8, 0.5); // manijas
  vbox(g, 0.16, 0.05, 0.05, 0xd9dee8, 0.93, 0.85, 0.3, 0xd9dee8, 0.5);
  vbox(g, 0.16, 0.05, 0.05, 0xd9dee8, -0.93, 0.85, -0.7, 0xd9dee8, 0.5);
  vbox(g, 0.16, 0.05, 0.05, 0xd9dee8, 0.93, 0.85, -0.7, 0xd9dee8, 0.5);
  vbox(g, 0.09, 0.16, 0.14, color, -0.98, 1.15, 0.75);                  // espejos
  vbox(g, 0.09, 0.16, 0.14, color, 0.98, 1.15, 0.75);
  luxBadgeDoors(g, -0.2, 0.925);
  carWheels(g, [[-0.95, 1.35, 0.38, 0.3], [0.95, 1.35, 0.38, 0.3],
                [-0.95, -1.35, 0.38, 0.3], [0.95, -1.35, 0.38, 0.3]], 0xd9dee8); // rines de lujo
  return g;
}
function buildSportMesh(color) { // DEPORTIVO bajo y agresivo
  const g = new THREE.Group();
  vboxGloss(g, 1.9, 0.42, 3.8, color, 0, 0.5, 0);                      // carrocería baja
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.1, 1.3), vboxGlossMat(color));
  hood.position.set(0, 0.62, 1.35); hood.rotation.x = -0.18; g.add(hood); // cofre inclinado
  vbox(g, 0.3, 0.06, 0.7, 0x1c1c22, -0.4, 0.68, 1.3);                   // tomas de aire
  vbox(g, 0.3, 0.06, 0.7, 0x1c1c22, 0.4, 0.68, 1.3);
  luxGlass(g, 1.25, 0.42, 1.4, 0, 1.0, -0.35);                        // cabina
  const ws = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.8), vmat(0x16242f, 0x16242f, 0.5));
  ws.position.set(0, 0.94, 0.5); ws.rotation.x = 0.55; g.add(ws);       // parabrisas tendido
  vboxGloss(g, 1.3, 0.07, 0.9, color, 0, 1.24, -0.4);                  // techo
  vbox(g, 0.09, 0.32, 0.4, color, -0.55, 1.0, -1.75);                   // soportes del alerón
  vbox(g, 0.09, 0.32, 0.4, color, 0.55, 1.0, -1.75);
  vboxGloss(g, 1.7, 0.09, 0.45, color, 0, 1.18, -1.8);                  // alerón
  vbox(g, 1.92, 0.14, 3.82, 0x2b2f3a, 0, 0.3, 0);                      // faldón
  vbox(g, 0.7, 0.12, 0.08, 0xeaf6ff, -0.48, 0.55, 1.92, 0xbfe9ff, 1);   // faros agresivos
  vbox(g, 0.7, 0.12, 0.08, 0xeaf6ff, 0.48, 0.55, 1.92, 0xbfe9ff, 1);
  vbox(g, 1.6, 0.1, 0.08, 0xff3d5e, 0, 0.6, -1.92, 0xff3d5e, 1);        // barra trasera
  vbox(g, 0.35, 0.16, 0.3, 0x1c1c22, -0.45, 0.32, -1.9);                // difusor
  vbox(g, 0.35, 0.16, 0.3, 0x1c1c22, 0.45, 0.32, -1.9);
  luxBadgeDoors(g, -0.35, 0.95);
  carWheels(g, [[-0.95, 1.2, 0.34, 0.32], [0.95, 1.2, 0.34, 0.32],
                [-0.98, -1.2, 0.37, 0.36], [0.98, -1.2, 0.37, 0.36]], 0x2b2f3a); // rines deportivos
  return g;
}
function buildSuvMesh(color) { // SUV DE LUJO alta y robusta
  const g = new THREE.Group();
  vboxGloss(g, 1.95, 0.75, 4.1, color, 0, 0.85, 0);                    // carrocería alta
  luxGlass(g, 1.7, 0.62, 2.3, 0, 1.5, -0.15);                         // cabina amplia
  vboxGloss(g, 1.75, 0.1, 2.4, color, 0, 1.85, -0.15);                 // techo
  vbox(g, 0.08, 0.08, 2.2, 0xd9dee8, -0.7, 1.95, -0.15, 0xd9dee8, 0.5); // rieles de techo
  vbox(g, 0.08, 0.08, 2.2, 0xd9dee8, 0.7, 1.95, -0.15, 0xd9dee8, 0.5);
  const shield = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.12), vmat(0xd9dee8, 0xd9dee8, 0.5));
  shield.position.set(0, 0.85, 2.08); g.add(shield);                    // parrilla cromada
  vbox(g, 1.96, 0.2, 4.12, 0x2b2f3a, 0, 0.45, 0);                      // faldón
  luxTrim(g, 1.97, 0.06, 4.12, 0, 0.62, 0);
  vbox(g, 0.55, 0.2, 0.1, 0xeaf6ff, -0.6, 0.95, 2.1, 0xbfe9ff, 1);      // faros
  vbox(g, 0.55, 0.2, 0.1, 0xeaf6ff, 0.6, 0.95, 2.1, 0xbfe9ff, 1);
  vbox(g, 0.4, 0.28, 0.1, 0xff3d5e, -0.65, 0.95, -2.08, 0xff3d5e, 0.9); // traseras
  vbox(g, 0.4, 0.28, 0.1, 0xff3d5e, 0.65, 0.95, -2.08, 0xff3d5e, 0.9);
  vbox(g, 0.09, 0.18, 0.16, color, -1.02, 1.45, 0.7);                   // espejos
  vbox(g, 0.09, 0.18, 0.16, color, 1.02, 1.45, 0.7);
  vbox(g, 0.3, 0.12, 1.2, 0x2b2f3a, -0.99, 0.62, 0);                    // estribos
  vbox(g, 0.3, 0.12, 1.2, 0x2b2f3a, 0.99, 0.62, 0);
  luxBadgeDoors(g, -0.15, 0.975);
  carWheels(g, [[-1.0, 1.3, 0.44, 0.34], [1.0, 1.3, 0.44, 0.34],
                [-1.0, -1.3, 0.44, 0.34], [1.0, -1.3, 0.44, 0.34]], 0xd9dee8); // llantas grandes
  return g;
}
function vboxGlossMat(color) { // material brillante reutilizable
  return new THREE.MeshStandardMaterial({ color, roughness: 0.25, metalness: 0.55 });
}
function buildCarMesh(color, type) {
  if (type === 'sport') return buildSportMesh(color);
  if (type === 'suv') return buildSuvMesh(color);
  return buildSedanMesh(color); // por defecto: sedán de lujo
}
function buildBikeMesh(color) {
  const g = new THREE.Group();
  const wheels = [];
  // Adelante = +z (dirección de marcha, igual que los carros)
  // ruedas con rayos (giran de verdad)
  [[0, 0.85], [0, -0.85]].forEach(([wx, wz]) => {
    const wg = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.07, 10, 24), vmat(0x1c1c22));
    tire.rotation.y = Math.PI / 2; tire.castShadow = true; wg.add(tire);
    for (let i = 0; i < 3; i++) { // rayos
      const sp = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.8, 0.03), vmat(0x9aa5b1));
      sp.rotation.x = i * Math.PI / 3; wg.add(sp);
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.14, 8), vmat(0x9aa5b1));
    hub.rotation.z = Math.PI / 2; wg.add(hub);
    wg.position.set(wx, 0.46, wz);
    g.add(wg); wheels.push(wg);
  });
  const frameM = vboxGlossMat(color);
  const tube = (x1, y1, z1, x2, y2, z2, r) => { // tubo entre dos puntos
    const a = new THREE.Vector3(x1, y1, z1), b = new THREE.Vector3(x2, y2, z2);
    const len = a.distanceTo(b);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), frameM);
    m.position.copy(a).lerp(b, 0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    m.castShadow = true; g.add(m);
  };
  tube(0, 0.46, -0.85, 0, 0.72, -0.1);   // tirantes traseros
  tube(0, 0.72, -0.1, 0, 0.95, 0.78);    // tubo superior
  tube(0, 0.46, -0.1, 0, 0.95, 0.78);    // tubo inferior
  tube(0, 0.46, 0.85, 0, 0.95, 0.78);    // horquilla delantera
  tube(0, 0.46, -0.1, 0, 0.78, -0.3);    // tubo del asiento
  vbox(g, 0.3, 0.09, 0.26, 0x2b2f3a, 0, 0.82, -0.3);   // asiento
  vbox(g, 0.52, 0.09, 0.09, 0x2b2f3a, 0, 1.0, 0.78);   // manillar
  vbox(g, 0.1, 0.28, 0.1, color, 0, 0.86, 0.78);       // potencia
  // salpicaderas CURVAS pegadas a la rueda (arco de toro sobre cada rueda)
  [0.85, -0.85].forEach(wz => {
    const fg = new THREE.Group();
    fg.position.set(0, 0.46, wz); fg.rotation.y = Math.PI / 2;
    const arc = 2.0; // ~115° sobre la parte alta de la rueda
    const fender = new THREE.Mesh(new THREE.TorusGeometry(0.57, 0.045, 8, 18, arc), frameM);
    fender.rotation.z = Math.PI / 2 - arc / 2; // arco centrado arriba
    fender.castShadow = true; fg.add(fender); g.add(fg);
  });
  vbox(g, 0.12, 0.12, 0.12, 0xfff6b0, 0, 1.0, 0.95, 0xffe95e, 0.9); // faro
  vbox(g, 0.1, 0.1, 0.06, 0xff3d5e, 0, 0.8, -1.32, 0xff3d5e, 0.8);  // luz trasera
  // cadena
  const chain = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.78), vmat(0x3a3d45));
  chain.position.set(0.06, 0.46, -0.47); g.add(chain);
  // bielas + pedales (GIRAN al pedalear)
  const crank = new THREE.Group(); crank.position.set(0, 0.46, -0.1); g.add(crank);
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.05, 14), vmat(0x9aa5b1));
  ring.rotation.z = Math.PI / 2; crank.add(ring);
  [-1, 1].forEach(sgn => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.05), vmat(0x3a3d45));
    arm.position.set(sgn * 0.08, sgn > 0 ? -0.14 : 0.14, 0); crank.add(arm);
    const pedal = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.12), vmat(0x1c1c22));
    pedal.position.set(sgn * 0.08, sgn > 0 ? -0.3 : 0.3, 0); crank.add(pedal);
  });
  g.userData.wheels = wheels;
  g.userData.crank = crank;
  return g;
}
function addCar(lvl, x, y, z, color, drivable, heading, type) {
  const mesh = buildCarMesh(color, type);
  mesh.position.set(x, y, z);
  mesh.rotation.y = heading || 0;
  lvl.group.add(mesh);
  if (drivable) lvl.cars.push({ kind: 'car', vtype: type || 'sedan', x, y, z, mesh, taken: false,
    heading: heading || 0,
    seatY: type === 'sport' ? -0.02 : type === 'suv' ? 0.6 : 0.15, // cabeza bajo el techo
    seatZ: type === 'sport' ? -0.3 : -0.25 }); // conductor en la cabina
  return mesh;
}
function addBike(lvl, x, y, z, color, drivable, heading) {
  const mesh = buildBikeMesh(color);
  mesh.position.set(x, y, z);
  mesh.rotation.y = heading || 0;
  lvl.group.add(mesh);
  if (drivable) lvl.cars.push({ kind: 'bike', x, y, z, mesh, taken: false, heading: heading || 0, seatZ: -0.4 });
  return mesh;
}

/* ============ GEAYI 2026 ⚡ — marca eléctrica 100% ORIGINAL del juego ============
   Diseños propios, nada copiado de marcas reales. Todos los GEAYI son eléctricos. */
let _geayiBadgeTex = null;
function geayiBadgeTex() {
  if (_geayiBadgeTex) return _geayiBadgeTex;
  const c = document.createElement('canvas'); c.width = 256; c.height = 96;
  const g = c.getContext('2d');
  g.fillStyle = '#101418'; g.fillRect(0, 0, 256, 96);
  g.strokeStyle = '#00e5ff'; g.lineWidth = 6; g.strokeRect(6, 6, 244, 84);
  g.fillStyle = '#00e5ff'; g.textAlign = 'center';
  g.font = '900 46px "Trebuchet MS", sans-serif';
  g.fillText('GEAYI', 128, 56);
  g.fillStyle = '#ffffff'; g.font = '700 22px "Trebuchet MS", sans-serif';
  g.fillText('· 2026 ·', 128, 82);
  _geayiBadgeTex = new THREE.CanvasTexture(c);
  return _geayiBadgeTex;
}
function addGeayiBadge(g, x, y, z, ry, w, h) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w || 1.15, h || 0.43),
    new THREE.MeshBasicMaterial({ map: geayiBadgeTex(), transparent: true }));
  m.position.set(x, y, z);
  m.rotation.y = (ry == null ? Math.PI : ry);
  m.userData.isGeayiBadge = true;
  g.add(m);
  return m;
}
let _evBadgeTex = null;
function electricBadgeTex() { // ⚡ insignia "100% eléctrico"
  if (_evBadgeTex) return _evBadgeTex;
  const c = document.createElement('canvas'); c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#0c3a2d';
  g.beginPath(); g.arc(64, 64, 60, 0, TAU); g.fill();
  g.strokeStyle = '#7dff9e'; g.lineWidth = 6;
  g.beginPath(); g.arc(64, 64, 52, 0, TAU); g.stroke();
  g.fillStyle = '#ffe95e'; // rayo dibujado (original)
  g.beginPath();
  g.moveTo(74, 16); g.lineTo(42, 70); g.lineTo(60, 70); g.lineTo(52, 112);
  g.lineTo(86, 56); g.lineTo(68, 56); g.closePath(); g.fill();
  _evBadgeTex = new THREE.CanvasTexture(c);
  return _evBadgeTex;
}
function addElectricBadge(g, x, y, z, ry, s) {
  const sz = s || 0.45;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sz, sz),
    new THREE.MeshBasicMaterial({ map: electricBadgeTex(), transparent: true }));
  m.position.set(x, y, z);
  m.rotation.y = (ry == null ? Math.PI : ry);
  m.userData.isElectricBadge = true;
  g.add(m);
  return m;
}
let _taxiSignTex = null;
function taxiSignTex() {
  if (_taxiSignTex) return _taxiSignTex;
  const c = document.createElement('canvas'); c.width = 256; c.height = 80;
  const g = c.getContext('2d');
  g.fillStyle = '#141414'; g.fillRect(0, 0, 256, 80);
  for (let i = 0; i < 16; i++) {
    g.fillStyle = (i % 2) ? '#ffffff' : '#141414';
    g.fillRect(i * 16, 2, 16, 12); g.fillRect(i * 16, 66, 16, 12);
  }
  g.fillStyle = '#ffcf3f'; g.textAlign = 'center';
  g.font = '900 44px "Trebuchet MS", sans-serif';
  g.fillText('TAXI', 128, 56);
  _taxiSignTex = new THREE.CanvasTexture(c);
  return _taxiSignTex;
}
/* ruedas con rin deportivo (grupo: llanta + rin, gira todo junto) */
function carWheels(g, list, rimColor) {
  const wheels = [];
  list.forEach(([wx, wz, r, w]) => {
    const wg = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 14), vmat(0x1c1c22));
    tire.castShadow = true;
    wg.add(tire);
    if (rimColor) {
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, w + 0.05, 10),
        vmat(rimColor, rimColor, 0.35));
      wg.add(rim);
    }
    wg.rotation.z = Math.PI / 2;
    wg.position.set(wx, r, wz);
    g.add(wg); wheels.push(wg);
  });
  g.userData.wheels = wheels;
  return wheels;
}
/* ---- GEAYI Pickup 2026 🛻 (troca blanca de trabajo, caja abierta) ---- */
function buildPickupMesh(color) {
  const g = new THREE.Group();
  const glass = 0x9fd8ff;
  vbox(g, 1.9, 0.5, 4.2, color, 0, 0.62, 0);                 // chasis
  vbox(g, 1.9, 0.55, 1.1, color, 0, 1.0, 1.55);              // cofre
  vbox(g, 1.8, 0.95, 1.25, color, 0, 1.35, 0.45);            // cabina
  vbox(g, 1.82, 0.14, 1.27, color, 0, 1.9, 0.45);            // techo
  vbox(g, 1.6, 0.62, 0.08, glass, 0, 1.42, 1.1);            // parabrisas
  vbox(g, 1.6, 0.5, 0.08, glass, 0, 1.42, -0.2);            // ventana trasera
  vbox(g, 1.8, 0.14, 2.0, 0x3a3f47, 0, 0.98, -1.1);         // piso de la caja
  vbox(g, 0.12, 0.62, 2.0, color, -0.9, 1.36, -1.1);        // pared izq
  vbox(g, 0.12, 0.62, 2.0, color, 0.9, 1.36, -1.1);         // pared der
  vbox(g, 1.8, 0.62, 0.12, color, 0, 1.36, -0.14);          // pared frontal
  vbox(g, 1.8, 0.62, 0.12, color, 0, 1.36, -2.06);          // tapa trasera
  vbox(g, 1.7, 0.13, 0.08, 0xffffff, 0, 1.0, 2.12, 0xd8f4ff, 1.3); // barra LED 2026
  vbox(g, 0.35, 0.2, 0.08, 0xff3d5e, -0.6, 1.0, -2.14, 0xff3d5e, 0.9);
  vbox(g, 0.35, 0.2, 0.08, 0xff3d5e, 0.6, 1.0, -2.14, 0xff3d5e, 0.9);
  vbox(g, 1.92, 0.16, 4.22, 0x2b2f3a, 0, 0.4, 0);           // faldón
  carWheels(g, [[-0.95, 1.35, 0.42, 0.32], [0.95, 1.35, 0.42, 0.32], [-0.95, -1.35, 0.42, 0.32], [0.95, -1.35, 0.42, 0.32]], 0x9aa5b1);
  addGeayiBadge(g, 0, 1.36, -2.14, Math.PI);
  addElectricBadge(g, 0.75, 1.36, -2.14, Math.PI, 0.4);
  return g;
}
/* ---- GEAYI GT 2026 🏎️ (deportivo rojo, el más rápido) ---- */
function buildSportsMesh(color) {
  const g = new THREE.Group();
  const glass = 0x9fd8ff;
  vbox(g, 1.75, 0.42, 3.4, color, 0, 0.52, 0);              // cuerpo bajo
  vbox(g, 1.5, 0.3, 0.9, color, 0, 0.5, 1.85);              // nariz
  vbox(g, 1.78, 0.14, 3.0, 0x2b2f3a, 0, 0.3, 0);           // faldones
  vbox(g, 1.15, 0.4, 1.5, glass, 0, 0.9, -0.25);           // cabina aerodinámica
  vbox(g, 0.12, 0.32, 0.28, 0x2b2f3a, -0.6, 0.82, -1.5);   // soportes del alerón
  vbox(g, 0.12, 0.32, 0.28, 0x2b2f3a, 0.6, 0.82, -1.5);
  vbox(g, 1.7, 0.08, 0.55, 0x2b2f3a, 0, 1.0, -1.55);       // alerón
  vbox(g, 0.55, 0.1, 0.08, 0xffffff, -0.5, 0.58, 2.28, 0xcfefff, 1.5); // faros LED finos
  vbox(g, 0.55, 0.1, 0.08, 0xffffff, 0.5, 0.58, 2.28, 0xcfefff, 1.5);
  vbox(g, 1.4, 0.09, 0.08, 0xff3d5e, 0, 0.58, -1.73, 0xff3d5e, 1.2);  // barra trasera
  carWheels(g, [[-0.88, 1.15, 0.34, 0.3], [0.88, 1.15, 0.34, 0.3], [-0.88, -1.15, 0.34, 0.3], [0.88, -1.15, 0.34, 0.3]], 0xd7dde5);
  addGeayiBadge(g, 0, 0.52, -1.75, Math.PI, 1.0, 0.38);
  addElectricBadge(g, 0.62, 0.52, -1.75, Math.PI, 0.34);
  return g;
}
/* ---- GEAYI Taxi 2026 🚕 (amarillo, cuadros, letrero) ---- */
function buildTaxiMesh(color) {
  const g = new THREE.Group();
  vbox(g, 1.7, 0.62, 3.1, color, 0, 0.68, 0);              // carrocería
  vbox(g, 1.35, 0.55, 1.5, 0x9fd8ff, 0, 1.2, -0.25);       // cabina
  vbox(g, 1.72, 0.18, 3.12, 0x2b2f3a, 0, 0.42, 0);         // faldón
  for (let i = 0; i < 8; i++) {                            // franja de cuadros
    const cc = (i % 2 === 0) ? 0x111111 : 0xffffff;
    const z = -1.05 + i * 0.3;
    vbox(g, 0.04, 0.3, 0.28, cc, -0.87, 0.72, z);
    vbox(g, 0.04, 0.3, 0.28, cc, 0.87, 0.72, z);
  }
  vbox(g, 0.95, 0.3, 0.42, 0x111111, 0, 1.66, -0.25);      // base del letrero
  const signM = new THREE.MeshBasicMaterial({ map: taxiSignTex() });
  const s1 = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.28), signM);
  s1.position.set(0, 1.66, -0.465); s1.rotation.y = Math.PI; g.add(s1);
  const s2 = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.28), signM);
  s2.position.set(0, 1.66, -0.035); g.add(s2);
  vbox(g, 0.35, 0.25, 0.1, 0xfff6b0, -0.55, 0.72, 1.56, 0xffe95e, 0.9);
  vbox(g, 0.35, 0.25, 0.1, 0xfff6b0, 0.55, 0.72, 1.56, 0xffe95e, 0.9);
  vbox(g, 0.3, 0.22, 0.1, 0xff3d5e, -0.55, 0.72, -1.56, 0xff3d5e, 0.8);
  vbox(g, 0.3, 0.22, 0.1, 0xff3d5e, 0.55, 0.72, -1.56, 0xff3d5e, 0.8);
  carWheels(g, [[-0.9, 1.05, 0.36, 0.3], [0.9, 1.05, 0.36, 0.3], [-0.9, -1.05, 0.36, 0.3], [0.9, -1.05, 0.36, 0.3]], 0x9aa5b1);
  addGeayiBadge(g, 0, 0.72, -1.58, Math.PI);
  addElectricBadge(g, 0.62, 0.72, -1.58, Math.PI, 0.36);
  return g;
}
/* ---- GEAYI Bus 2026 🚌 (bus urbano grande) ---- */
function buildBusMesh(color) {
  const g = new THREE.Group();
  const glass = 0x9fd8ff;
  vbox(g, 2.5, 2.2, 6.2, color, 0, 1.6, 0);               // cuerpo
  vbox(g, 2.54, 0.7, 5.4, glass, 0, 1.95, -0.2);          // banda de ventanas
  vbox(g, 2.2, 0.95, 0.1, glass, 0, 1.85, 3.12);          // parabrisas
  vbox(g, 2.52, 0.14, 6.24, 0xf5f0e6, 0, 2.76, 0);        // techo
  vbox(g, 0.08, 1.7, 1.1, 0x2b2f3a, 1.27, 1.05, 2.1);     // puerta delantera
  vbox(g, 2.52, 0.3, 6.22, 0x2b2f3a, 0, 0.45, 0);         // faldón
  vbox(g, 0.45, 0.3, 0.1, 0xfff6b0, -0.8, 0.95, 3.13, 0xffe95e, 0.9);
  vbox(g, 0.45, 0.3, 0.1, 0xfff6b0, 0.8, 0.95, 3.13, 0xffe95e, 0.9);
  vbox(g, 0.4, 0.35, 0.1, 0xff3d5e, -0.85, 0.95, -3.13, 0xff3d5e, 0.8);
  vbox(g, 0.4, 0.35, 0.1, 0xff3d5e, 0.85, 0.95, -3.13, 0xff3d5e, 0.8);
  vbox(g, 0.08, 0.3, 0.2, 0x2b2f3a, -1.32, 2.2, 2.9);      // espejos
  vbox(g, 0.08, 0.3, 0.2, 0x2b2f3a, 1.32, 2.2, 2.9);
  carWheels(g, [[-1.15, 2.2, 0.45, 0.34], [1.15, 2.2, 0.45, 0.34], [-1.15, 0, 0.45, 0.34],
                [1.15, 0, 0.45, 0.34], [-1.15, -2.2, 0.45, 0.34], [1.15, -2.2, 0.45, 0.34]], 0x9aa5b1);
  addGeayiBadge(g, 0, 2.62, 3.15, 0, 1.3, 0.48);          // frente
  addGeayiBadge(g, 1.31, 1.1, 0, Math.PI / 2, 1.6, 0.6);  // lateral der
  addGeayiBadge(g, -1.31, 1.1, 0, -Math.PI / 2, 1.6, 0.6);// lateral izq
  addElectricBadge(g, 1.31, 1.85, 2.6, Math.PI / 2, 0.5);
  addElectricBadge(g, -1.31, 1.85, 2.6, -Math.PI / 2, 0.5);
  return g;
}
/* ---- Metro GEAYI 2026 🚇 (tren de 2 vagones, conducción automática) ---- */
function buildMetroMesh() {
  const g = new THREE.Group();
  const glass = 0x9fd8ff;
  [-2.35, 2.35].forEach(cz => {
    vbox(g, 2.6, 2.2, 4.6, 0xdfe5ea, 0, 1.6, cz);         // vagón plateado
    vbox(g, 2.64, 0.7, 4.0, glass, 0, 1.95, cz);          // banda de ventanas
    vbox(g, 2.66, 0.3, 4.2, 0x00b3a6, 0, 0.85, cz);       // franja teal GEAYI
    vbox(g, 2.62, 0.12, 4.7, 0x9fb3c8, 0, 2.76, cz);      // techo
    addGeayiBadge(g, 1.34, 1.35, cz, Math.PI / 2, 1.2, 0.45);
    addGeayiBadge(g, -1.34, 1.35, cz, -Math.PI / 2, 1.2, 0.45);
  });
  vbox(g, 2.62, 0.25, 9.7, 0x2b2f3a, 0, 0.42, 0);         // faldón
  vbox(g, 2.4, 1.7, 0.7, 0xdfe5ea, 0, 1.35, 4.95);        // frente
  vbox(g, 2.0, 0.7, 0.12, glass, 0, 1.7, 5.32);           // parabrisas
  vbox(g, 0.35, 0.25, 0.1, 0xfff6b0, -0.8, 0.95, 5.34, 0xffe95e, 1);
  vbox(g, 0.35, 0.25, 0.1, 0xfff6b0, 0.8, 0.95, 5.34, 0xffe95e, 1);
  addGeayiBadge(g, 0, 2.35, 5.32, 0, 1.3, 0.48);
  addElectricBadge(g, 1.1, 2.35, 5.32, 0, 0.42);
  g.userData.wheels = [];
  return g;
}
/* ---- registro de tipos de vehículo GEAYI ---- */
const VEHICLE_TYPES = {
  'geayi-pickup': { name: 'GEAYI Pickup 2026 ⚡ ELÉCTRICO', emoji: '🛻', maxSpeed: 15, accel: 14, seatY: 0.62 },
  'geayi-gt':     { name: 'GEAYI GT 2026 ⚡ ELÉCTRICO',     emoji: '🏎️', maxSpeed: 20, accel: 18, seatY: 0.5 },
  'geayi-taxi':   { name: 'GEAYI Taxi 2026 ⚡ ELÉCTRICO',   emoji: '🚕', maxSpeed: 16, accel: 15, seatY: 0.55 },
  'geayi-bus':    { name: 'GEAYI Bus 2026 ⚡ ELÉCTRICO',    emoji: '🚌', maxSpeed: 12, accel: 10, seatY: 0.45 },
  'geayi-metro':  { name: 'Metro GEAYI 2026 ⚡ ELÉCTRICO',  emoji: '🚇', maxSpeed: 9,  accel: 3.5, seatY: 0.55 },
};
const VEHICLE_BUILDERS = {
  'geayi-pickup': buildPickupMesh,
  'geayi-gt': buildSportsMesh,
  'geayi-taxi': buildTaxiMesh,
  'geayi-bus': buildBusMesh,
};
function addVehicle(lvl, vtype, x, y, z, color, drivable, heading) {
  const spec = VEHICLE_TYPES[vtype];
  const mesh = VEHICLE_BUILDERS[vtype](color);
  mesh.position.set(x, y, z);
  mesh.rotation.y = heading || 0;
  lvl.group.add(mesh);
  if (drivable) lvl.cars.push({
    kind: 'car', vtype, x, y, z, mesh, taken: false, heading: heading || 0,
    maxSpeed: spec.maxSpeed, accel: spec.accel, seatY: spec.seatY
  });
  return mesh;
}
/* ---- estación de metro: circuito elevado en loop + andén + tren ---- */
let _metroSignTex = null;
function metroSignTex() {
  if (_metroSignTex) return _metroSignTex;
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#0d1b2a'; g.fillRect(0, 0, 512, 128);
  g.strokeStyle = '#00e5ff'; g.lineWidth = 8; g.strokeRect(8, 8, 496, 112);
  g.fillStyle = '#ffffff'; g.textAlign = 'center';
  g.font = '900 54px "Trebuchet MS", sans-serif';
  g.fillText('🚇 METRO GEAYI', 256, 84);
  _metroSignTex = new THREE.CanvasTexture(c);
  return _metroSignTex;
}
function addMetroStation(lvl, cx, cz) {
  const R = 12, trackY = 4;
  const g = lvl.group;
  addPlatform(lvl, cx, 0, cz, 40, 40); // plaza base bajo el circuito
  const railM = vmat(0x8a94a6, 0x9fb3c8, 0.25);
  [-0.9, 0.9].forEach(off => { // doble riel elevado
    const rail = new THREE.Mesh(new THREE.TorusGeometry(R + off, 0.14, 8, 72), railM);
    rail.rotation.x = Math.PI / 2;
    rail.position.set(cx, trackY, cz);
    g.add(rail);
  });
  const tieM = vmat(0x5a4632); // traviesas
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * TAU;
    const tie = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.12, 0.5), tieM);
    tie.position.set(cx + Math.cos(a) * R, trackY - 0.18, cz + Math.sin(a) * R);
    tie.rotation.y = -a;
    g.add(tie);
  }
  const pilM = vmat(0x6b7686); // pilares
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + 0.19;
    const pil = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, trackY, 10), pilM);
    pil.position.set(cx + Math.cos(a) * R, trackY / 2, cz + Math.sin(a) * R);
    pil.castShadow = true;
    g.add(pil);
  }
  const sx = cx + R; // andén junto a la vía (ángulo 0)
  addPlatform(lvl, sx + 4.5, trackY, cz, 5.5, 9);
  addPlatform(lvl, sx + 13, 1, cz, 3, 4); // escalones desde la plaza
  addPlatform(lvl, sx + 10, 2, cz, 3, 4);
  addPlatform(lvl, sx + 7, 3, cz, 3, 4);
  const poleM = vmat(0x2b2f3a); // letrero 🚇 METRO GEAYI
  [cz - 2, cz + 2].forEach(pz => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 3.4, 8), poleM);
    pole.position.set(sx + 4.5, trackY + 1.7, pz);
    g.add(pole);
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 1.3),
    new THREE.MeshBasicMaterial({ map: metroSignTex() }));
  sign.position.set(sx + 4.5, trackY + 3.1, cz);
  sign.rotation.y = Math.PI / 2; // mira a los escalones (+x)
  g.add(sign);
  const mesh = buildMetroMesh(); // tren estacionado en el ángulo 0
  mesh.position.set(cx + R, trackY, cz);
  mesh.rotation.y = 0;
  g.add(mesh);
  lvl.cars.push({
    kind: 'train', vtype: 'geayi-metro', mesh, taken: false,
    heading: 0, cx, cz, r: R, trackY, angle: 0, speed: 0,
    cruise: 9, maxSpeed: 9, accel: 3.5, seatY: 0.55
  });
  return mesh;
}
/* ============ GeayiBoots 🤖 — robots ORIGINALES (diseño propio) ============
   Amigables y redondos: cabeza esférica con DOS ojos redondos brillantes
   (nada de visor estilo Optimus), cuerpo abultado, logo en el pecho. */
let _gbLogoTex = null;
function geayiBootsTex() {
  if (_gbLogoTex) return _gbLogoTex;
  const c = document.createElement('canvas'); c.width = 256; c.height = 96;
  const g = c.getContext('2d');
  g.fillStyle = '#0e2a33'; g.fillRect(0, 0, 256, 96);
  g.strokeStyle = '#00e5ff'; g.lineWidth = 5; g.strokeRect(5, 5, 246, 86);
  g.fillStyle = '#ffffff'; g.textAlign = 'center';
  g.font = '900 40px "Trebuchet MS", sans-serif';
  g.fillText('GeayiBoots', 128, 60);
  _gbLogoTex = new THREE.CanvasTexture(c);
  return _gbLogoTex;
}
function buildGeayiBootMesh() {
  const g = new THREE.Group();
  const white = vmat(0xf2f4f7), silver = vmat(0xb9c2cc);
  const mkLimb = (x, topY, r1, r2, len, mat) => { // extremidad con pivote arriba
    const grp = new THREE.Group(); grp.position.set(x, topY, 0);
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, len, 10), mat);
    seg.position.y = -len / 2; seg.castShadow = true; grp.add(seg);
    g.add(grp);
    return grp;
  };
  const legL = mkLimb(-0.2, 0.72, 0.13, 0.16, 0.66, silver);
  const legR = mkLimb(0.2, 0.72, 0.13, 0.16, 0.66, silver);
  const footM = vmat(0x2b2f3a);
  [[-0.2], [0.2]].forEach(([fx]) => {
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.36), footM);
    foot.position.set(fx, 0.06, 0.06); g.add(foot);
  });
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.44, 0.75, 14), white);
  torso.position.y = 1.08; torso.castShadow = true; g.add(torso);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.4, 14, 12), white);
  belly.position.y = 1.02; belly.scale.set(1, 0.9, 0.85); belly.castShadow = true; g.add(belly);
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.2),
    new THREE.MeshBasicMaterial({ map: geayiBootsTex(), transparent: true }));
  logo.position.set(0, 1.18, 0.44); logo.userData.isGeayiBadge = true; g.add(logo);
  const armL = mkLimb(-0.48, 1.32, 0.1, 0.12, 0.6, white);
  const armR = mkLimb(0.48, 1.32, 0.1, 0.12, 0.6, white);
  const handM = vmat(0x00b3a6, 0x00b3a6, 0.4);
  [armL, armR].forEach(a => {
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), handM);
    hand.position.y = -0.66; a.add(hand);
  });
  const head = new THREE.Group(); head.position.y = 1.78; // cabeza redonda
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), white);
  skull.castShadow = true; head.add(skull);
  const eyeM = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
  const eL = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), eyeM);
  eL.position.set(-0.12, 0.05, 0.27); head.add(eL);
  const eR = eL.clone(); eR.position.x = 0.12; head.add(eR);
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.25, 6), silver);
  ant.position.y = 0.42; head.add(ant);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xffe95e }));
  tip.position.y = 0.56; head.add(tip);
  g.add(head);
  g.userData.bot = { armL, armR, legL, legR, head };
  g.userData.isGeayiBoot = true;
  return g;
}
function animateGeayiBoot(g, dt, speed) {
  const b = g.userData.bot;
  if (!b) return;
  g.userData.walkT = (g.userData.walkT || 0) + dt * (2 + speed * 1.6);
  const sw = Math.sin(g.userData.walkT) * clamp(speed * 0.12, 0, 0.6);
  b.legL.rotation.x = sw; b.legR.rotation.x = -sw;
  b.armL.rotation.x = -sw * 0.8; b.armR.rotation.x = sw * 0.8;
  b.head.rotation.y = Math.sin(g.userData.walkT * 0.4) * 0.35; // mira alrededor, curioso
}
function addGeayiBoot(lvl, x, y, z, ax, az, bx, bz) {
  const g = buildGeayiBootMesh();
  g.position.set(x, y, z);
  lvl.group.add(g);
  if (typeof makeNameLabel === 'function') {
    const label = makeNameLabel('GeayiBoots');
    label.position.y = 2.5;
    g.add(label);
  }
  lvl.npcs.push({
    g, y, a: { x: ax, z: az }, b: { x: bx, z: bz },
    t: Math.random(), dir: Math.random() < 0.5 ? 1 : -1,
    speed: 1.2 + Math.random(), robot: true
  });
}

/* ============ GEAYI AIRE 🚁🛸🚀 y AGUA 🛥️ (diseños 100% originales) ============ */
const VEMOJI = { plane: '✈️', train: '🚇', car: '🚗', bike: '🚲', drone: '🛸', heli: '🚁', boat: '🛥️', rocket: '🚀' };
function vemoji(t) { return VEMOJI[t] || '🚗'; }

/* ---- Dron GEAYI 🛸 (quadcóptero de pasajeros, diseño original) ---- */
function buildDroneMesh(withBox) {
  const g = new THREE.Group();
  const white = vmat(0xf2f4f7), teal = vmat(0x00b3a6, 0x00b3a6, 0.4), dark = vmat(0x2b2f3a);
  vbox(g, 1.7, 0.5, 1.7, 0xf2f4f7, 0, 0.75, 0);            // cuerpo
  vbox(g, 1.74, 0.16, 1.74, 0x00b3a6, 0, 0.62, 0);         // franja teal
  vbox(g, 1.2, 0.3, 1.2, 0x9fd8ff, 0, 1.05, 0);            // cabina superior
  const props = [];
  [[-1.15, -1.15], [1.15, -1.15], [-1.15, 1.15], [1.15, 1.15]].forEach(([ax, az]) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 0.18), dark);
    arm.position.set(ax * 0.55, 0.78, az * 0.55);
    arm.rotation.y = Math.atan2(az, ax);
    g.add(arm);
    const mot = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.17, 0.22, 10), dark);
    mot.position.set(ax, 0.86, az); mot.castShadow = true; g.add(mot);
    const prop = new THREE.Group(); prop.position.set(ax, 1.0, az);
    const b1 = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.04, 0.12), teal);
    const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 1.1), teal);
    prop.add(b1); prop.add(b2); g.add(prop); props.push(prop);
  });
  [[-0.7], [0.7]].forEach(([sx]) => { // patines
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 1.9), dark);
    rail.position.set(sx, 0.12, 0); g.add(rail);
    [-0.7, 0.7].forEach(sz => {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.08), dark);
      strut.position.set(sx, 0.32, sz); g.add(strut);
    });
  });
  if (withBox) { // caja de reparto (drones decorativos)
    vbox(g, 0.9, 0.7, 0.9, 0xb9835a, 0, -0.15, 0);
    addGeayiBadge(g, 0, -0.15, 0.46, 0, 0.7, 0.26);
  }
  const blinkers = [];
  [[-0.88, 0xff3d5e], [0.88, 0x35c759]].forEach(([bx, col]) => {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6),
      new THREE.MeshBasicMaterial({ color: col }));
    b.position.set(bx, 0.78, 0); g.add(b);
    blinkers.push({ m: b, phase: bx > 0 ? 0.5 : 0 });
  });
  addGeayiBadge(g, 0, 0.78, 0.86, 0, 1.0, 0.37);
  addElectricBadge(g, 0.62, 0.78, 0.86, 0, 0.32);
  g.userData.props = props; g.userData.blinkers = blinkers;
  g.userData.isGeayiBadge = true;
  return g;
}
/* ---- Helicóptero GEAYI 🚁 (diseño original, rotor animado) ---- */
function buildHeliMesh() {
  const g = new THREE.Group();
  const white = vmat(0xf7f9fc), teal = vmat(0x00b3a6, 0x00e5ff, 0.35), dark = vmat(0x2b2f3a);
  vbox(g, 1.9, 1.15, 2.7, 0xf7f9fc, 0, 1.35, 0.2);         // cabina
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.95, 12, 10), white);
  nose.scale.set(1, 0.75, 0.8); nose.position.set(0, 1.25, 1.6); nose.castShadow = true; g.add(nose);
  const shield = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.7, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x9fd8ff, roughness: 0.2, metalness: 0.3 }));
  shield.position.set(0, 1.55, 1.28); shield.rotation.x = -0.35; g.add(shield);
  vbox(g, 1.94, 0.28, 2.74, 0x00b3a6, 0, 0.85, 0.2);       // franja teal
  const boom = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 3.4), white);
  boom.position.set(0, 1.6, -2.8); boom.castShadow = true; g.add(boom);
  vbox(g, 0.14, 1.3, 0.7, 0x00b3a6, 0, 2.2, -4.3);         // aleta vertical
  const tr = new THREE.Group(); tr.position.set(0.12, 2.2, -4.35); // rotor de cola
  tr.add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.0, 0.12), dark));
  tr.add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 1.0), dark));
  g.add(tr);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.5, 8), dark);
  mast.position.set(0, 2.15, 0.2); g.add(mast);
  const rotor = new THREE.Group(); rotor.position.set(0, 2.42, 0.2); // rotor principal
  const bl1 = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.06, 0.3), dark);
  const bl2 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 5.6), dark);
  rotor.add(bl1); rotor.add(bl2); g.add(rotor);
  [[-0.8], [0.8]].forEach(([sx]) => { // patines
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 2.9), dark);
    rail.position.set(sx, 0.15, 0.2); g.add(rail);
    [-0.9, 1.1].forEach(sz => {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.75, 0.09), dark);
      s.position.set(sx, 0.5, sz); g.add(s);
    });
  });
  vbox(g, 0.4, 0.25, 0.1, 0xfff6b0, -0.6, 1.1, 2.42, 0xffe95e, 1);
  vbox(g, 0.4, 0.25, 0.1, 0xfff6b0, 0.6, 1.1, 2.42, 0xffe95e, 1);
  addGeayiBadge(g, 0.96, 1.45, 0.2, Math.PI / 2, 1.2, 0.45);
  addGeayiBadge(g, -0.96, 1.45, 0.2, -Math.PI / 2, 1.2, 0.45);
  addElectricBadge(g, 0.96, 0.95, 1.2, Math.PI / 2, 0.36);
  g.userData.rotor = rotor; g.userData.tailRotor = tr;
  g.userData.isGeayiBadge = true;
  return g;
}
/* ---- Lancha GEAYI 🛥️ (speedboat original, 100% eléctrica) ---- */
function buildBoatMesh() {
  const g = new THREE.Group();
  const teal = vmat(0x00b3a6, 0x00e5ff, 0.3), white = vmat(0xf7f9fc), dark = vmat(0x2b2f3a);
  vbox(g, 1.9, 0.7, 4.2, 0x00b3a6, 0, 0.55, -0.2);         // casco
  const bow = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.7, 1.2), teal);
  bow.position.set(0, 0.55, 2.3); bow.rotation.x = 0.5; bow.castShadow = true; g.add(bow);
  vbox(g, 1.7, 0.18, 3.6, 0xf7f9fc, 0, 0.95, -0.3);        // cubierta
  const shield = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.6, 0.1),
    new THREE.MeshStandardMaterial({ color: 0x9fd8ff, roughness: 0.2, metalness: 0.3 }));
  shield.position.set(0, 1.35, 0.9); shield.rotation.x = -0.3; g.add(shield);
  vbox(g, 0.5, 0.5, 0.5, 0x2b2f3a, -0.45, 1.2, -0.3);      // asientos
  vbox(g, 0.5, 0.5, 0.5, 0x2b2f3a, 0.45, 1.2, -0.3);
  vbox(g, 0.7, 0.5, 0.3, 0x2b2f3a, 0, 1.2, 0.35);          // consola
  vbox(g, 0.5, 0.9, 0.35, 0x2b2f3a, 0, 0.7, -2.5);         // motor fuera de borda
  vbox(g, 0.1, 0.5, 0.5, 0x2b2f3a, 0, 0.25, -2.5);
  vbox(g, 1.94, 0.14, 4.24, 0xf7f9fc, 0, 0.92, -0.2);      // línea blanca
  addGeayiBadge(g, 0.96, 0.62, -0.2, Math.PI / 2, 1.3, 0.48);
  addGeayiBadge(g, -0.96, 0.62, -0.2, -Math.PI / 2, 1.3, 0.48);
  addElectricBadge(g, 0.96, 0.62, 1.3, Math.PI / 2, 0.4);
  g.userData.isGeayiBadge = true;
  return g;
}
/* ---- Cohete GEAYI 🚀 (diseño original, no SpaceX) ---- */
function buildRocketMesh() {
  const g = new THREE.Group();
  const white = vmat(0xf2f4f7), teal = vmat(0x00b3a6, 0x00e5ff, 0.4), dark = vmat(0x2b2f3a);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 5, 14), white);
  body.position.y = 3.4; body.castShadow = true; g.add(body);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.6, 14), teal);
  nose.position.y = 6.7; nose.castShadow = true; g.add(nose);
  vbox(g, 1.74, 0.5, 1.74, 0x00b3a6, 0, 2.2, 0);           // franja teal
  const port = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.1, 12),
    new THREE.MeshStandardMaterial({ color: 0x0d1b2a, roughness: 0.2, metalness: 0.5 }));
  port.rotation.x = Math.PI / 2; port.position.set(0, 4.6, 0.88); g.add(port);
  for (let i = 0; i < 3; i++) { // 3 aletas
    const a = (i / 3) * TAU;
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.6, 0.9), teal);
    fin.position.set(Math.cos(a) * 1.1, 1.3, Math.sin(a) * 1.1);
    fin.rotation.y = -a; fin.castShadow = true; g.add(fin);
  }
  const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.3, 0.7, 12), dark);
  bell.position.y = 0.55; g.add(bell);
  addGeayiBadge(g, 0, 3.6, 0.96, 0, 1.1, 0.41);
  addElectricBadge(g, 0.55, 2.9, 0.78, 0.5, 0.36);
  g.userData.isGeayiBadge = true;
  return g;
}
Object.assign(VEHICLE_TYPES, {
  'geayi-drone':  { name: 'Dron GEAYI 2026 ⚡ ELÉCTRICO',        emoji: '🛸', seatY: 0.55, rideY: 0,
                    fc: { cruise: 10, turbo: 7, yaw: 2.6, pitch: 0.6, minY: 1.2, maxY: 60 } },
  'geayi-heli':   { name: 'Helicóptero GEAYI 2026 ⚡ ELÉCTRICO', emoji: '🚁', seatY: 0.5, rideY: 0,
                    fc: { cruise: 8, turbo: 7, yaw: 3.0, pitch: 0.5, minY: 1.2, maxY: 60 } },
  'geayi-boat':   { name: 'Lancha GEAYI 2026 ⚡ ELÉCTRICA',       emoji: '🛥️', maxSpeed: 13, accel: 10, seatY: 0.55 },
  'geayi-rocket': { name: 'Cohete GEAYI 2026 ⚡ ELÉCTRICO',      emoji: '🚀', seatY: 0.4 },
});
VEHICLE_BUILDERS['geayi-boat'] = buildBoatMesh;
/* ============ 🌱 CORTACÉSPED GEAYI (trabajo de jardinería — diseño 100% original) ============
   Ride-on mower: chasis verde, plataforma de corte amarilla al frente con
   cuchilla, asiento con respaldo, columna de dirección + volante y 4 ruedas.
   Usa la física de 'car' (kind:'car') así que se maneja con el joystick. */
function buildMowerMesh() {
  const g = new THREE.Group();
  const green = vmat(0x35c759), darkG = vmat(0x1e8e3e), dark = vmat(0x2b2f3a);
  const yel = vmat(0xffd23f, 0xffb300, 0.35), seat = vmat(0x4a3b2e);
  // plataforma de corte (al frente, baja) + cuchilla
  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.28, 1.0), yel);
  deck.position.set(0, 0.32, 1.05); g.add(deck);
  const blade = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.08, 0.5), dark);
  blade.position.set(0, 0.16, 1.05); g.add(blade);
  // chasis + capó
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 2.0), green);
  body.position.set(0, 0.62, -0.1); g.add(body);
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.35, 0.7), darkG);
  hood.position.set(0, 0.95, 0.55); g.add(hood);
  // franja teal GEAYI alrededor del chasis
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.54, 0.14, 2.04),
    vmat(0x00e5ff, 0x00e5ff, 0.5));
  stripe.position.set(0, 0.62, -0.1); g.add(stripe);
  // asiento + respaldo
  const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.16, 0.6), seat);
  cushion.position.set(0, 1.0, -0.55); g.add(cushion);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.6, 0.14), seat);
  back.position.set(0, 1.35, -0.85); g.add(back);
  // columna de dirección + volante
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.7, 8), dark);
  col.position.set(0, 1.1, 0.15); col.rotation.x = 0.5; g.add(col);
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.06, 8, 20), dark);
  wheel.position.set(0, 1.38, 0.32); wheel.rotation.x = Math.PI / 2 + 0.5; g.add(wheel);
  // 4 ruedas (giran con la física de updateDrive)
  const wheelG = new THREE.CylinderGeometry(0.34, 0.34, 0.28, 12);
  const wheels = [];
  [[-0.85, 0.75], [0.85, 0.75], [-0.8, -0.95], [0.8, -0.95]].forEach(([wx, wz]) => {
    const w = new THREE.Mesh(wheelG, dark);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.34, wz);
    g.add(w); wheels.push(w);
  });
  g.userData.wheels = wheels;
  return g;
}
Object.assign(VEHICLE_TYPES, {
  'geayi-mower': { name: 'Cortacésped GEAYI 🌱', emoji: '🌱', maxSpeed: 7, accel: 10, seatY: 0.85 },
});
VEHICLE_BUILDERS['geayi-mower'] = buildMowerMesh;
function addDrone(lvl, x, y, z, heading) {
  const mesh = buildDroneMesh(false);
  mesh.position.set(x, y, z); mesh.rotation.y = heading || 0;
  lvl.group.add(mesh);
  lvl.cars.push({ kind: 'drone', vtype: 'geayi-drone', x, y, z, mesh, taken: false, busy: false, landing: false,
    heading: heading || 0, fc: VEHICLE_TYPES['geayi-drone'].fc, rideY: 0, seatY: 0.55 });
  return mesh;
}
function addHeli(lvl, x, y, z, heading) {
  const mesh = buildHeliMesh();
  mesh.position.set(x, y, z); mesh.rotation.y = heading || 0;
  lvl.group.add(mesh);
  lvl.cars.push({ kind: 'heli', vtype: 'geayi-heli', x, y, z, mesh, taken: false, busy: false, landing: false,
    heading: heading || 0, fc: VEHICLE_TYPES['geayi-heli'].fc, rideY: 0, seatY: 0.5 });
  return mesh;
}
function addBoat(lvl, x, waterY, z, waterR, opts) {
  opts = opts || {};
  const vtype = opts.vtype || 'geayi-boat';
  const spec = VEHICLE_TYPES[vtype] || VEHICLE_TYPES['geayi-boat'];
  const mesh = VEHICLE_BUILDERS[vtype]();
  mesh.position.set(x, waterY + 0.15, z);
  mesh.rotation.y = opts.heading || 0;
  lvl.group.add(mesh);
  lvl.cars.push({ kind: 'boat', vtype, mesh, taken: false, busy: false,
    waterY, wcx: (opts.wcx != null ? opts.wcx : x), wcz: (opts.wcz != null ? opts.wcz : z),
    wr: waterR, maxSpeed: spec.maxSpeed, accel: spec.accel, seatY: spec.seatY || 0.55,
    bobT: Math.random() * 9, raceBoat: !!opts.raceBoat });
  return mesh;
}
function addDeliveryDrone(lvl, cx, cy, cz, r, speed) { // dron decorativo de reparto
  lvl.drones = lvl.drones || [];
  const mesh = buildDroneMesh(true);
  lvl.group.add(mesh);
  lvl.drones.push({ mesh, cx, cy, cz, r, speed, a: Math.random() * TAU });
  return mesh;
}
/* ============ 🚤 LANCHAS RÁPIDAS GEAYI + MINI-CARRERAS EN EL LAGO TRAFFORD ============
   Extiende el sistema de lanchas EXISTENTE (buildBoatMesh / geayi-boat / updateBoat):
   - 2 lanchas rápidas nuevas, diseños 100% originales, colores caramelo,
     marca GEAYI ⚡ eléctrica: Flecha Veloz (más rápida y ágil) y Trueno Doble (doble motor, estable).
   - Mini-carrera en el Lago Trafford (mundo 4, idx 3): circuito de 6 boyas
     flotantes naranjas, letrero "🏁 CARRERA DE LANCHAS", cronómetro de 3 vueltas
     y mejor tiempo en SAVE.bestBoatLap (+30 🪙 por batir tu récord).
   Sin saltos, sin premium: las lanchas se usan gratis en el lago.
   No toca la física de botes existente: updateBoat sigue igual, solo reporta la posición. */
addStrings('es', {
  'boatrace.sign': '🏁 CARRERA DE LANCHAS',
  'boatrace.board': '🚤 ¡Lancha rápida GEAYI! Cruza la boya de cuadros 🏁 para empezar la carrera: 3 vueltas',
  'boatrace.go': '🏁 ¡YA! ¡Acelera! 🚤💨',
  'boatrace.hud': '🚤 Vuelta {lap}/3 · {t}',
  'boatrace.buoy': '🟠 ¡Boya {n}/6!',
  'boatrace.lap': '🏁 ¡Vuelta {n}/3!',
  'boatrace.finish': '🏆 ¡Carrera de lanchas terminada! Tiempo: {t}{best}',
  'boatrace.newBest': ' ⭐ ¡NUEVO RÉCORD! +30 🪙',
});
addStrings('en', {
  'boatrace.sign': '🏁 SPEEDBOAT RACING',
  'boatrace.board': '🚤 GEAYI speedboat! Cross the checkered buoy 🏁 to start the race: 3 laps',
  'boatrace.go': '🏁 GO! Floor it! 🚤💨',
  'boatrace.hud': '🚤 Lap {lap}/3 · {t}',
  'boatrace.buoy': '🟠 Buoy {n}/6!',
  'boatrace.lap': '🏁 Lap {n}/3!',
  'boatrace.finish': '🏆 Speedboat race finished! Time: {t}{best}',
  'boatrace.newBest': ' ⭐ NEW RECORD! +30 🪙',
});
addStrings('pt', {
  'boatrace.sign': '🏁 CORRIDA DE LANCHAS',
  'boatrace.board': '🚤 Lancha rápida GEAYI! Cruze a boia quadriculada 🏁 para começar a corrida: 3 voltas',
  'boatrace.go': '🏁 VAI! Acelera! 🚤💨',
  'boatrace.hud': '🚤 Volta {lap}/3 · {t}',
  'boatrace.buoy': '🟠 Boia {n}/6!',
  'boatrace.lap': '🏁 Volta {n}/3!',
  'boatrace.finish': '🏆 Corrida de lanchas concluída! Tempo: {t}{best}',
  'boatrace.newBest': ' ⭐ NOVO RECORDE! +30 🪙',
});
addStrings('fr', {
  'boatrace.sign': '🏁 COURSE DE BATEAUX',
  'boatrace.board': '🚤 Bateau rapide GEAYI ! Franchis la bouée à damier 🏁 pour commencer la course : 3 tours',
  'boatrace.go': '🏁 C’EST PARTI ! À fond ! 🚤💨',
  'boatrace.hud': '🚤 Tour {lap}/3 · {t}',
  'boatrace.buoy': '🟠 Bouée {n}/6 !',
  'boatrace.lap': '🏁 Tour {n}/3 !',
  'boatrace.finish': '🏆 Course de bateaux terminée ! Temps : {t}{best}',
  'boatrace.newBest': ' ⭐ NOUVEAU RECORD ! +30 🪙',
});
/* ---- Lancha Flecha Veloz 🚤 (caramelo dorado: la más rápida y ágil) ---- */
function buildArrowBoatMesh() {
  const g = new THREE.Group();
  const gold = vmat(0xf5a623, 0xff8c00, 0.25), cream = vmat(0xfdf6e3), dark = vmat(0x2b2f3a);
  vbox(g, 1.5, 0.6, 4.4, 0xf5a623, 0, 0.5, -0.1);           // casco estrecho y largo
  const bow = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.6, 1.4), gold);
  bow.position.set(0, 0.5, 2.5); bow.rotation.x = 0.55; bow.castShadow = true; g.add(bow); // proa afilada
  vbox(g, 1.3, 0.16, 3.4, 0xfdf6e3, 0, 0.86, -0.3);        // cubierta crema
  vbox(g, 1.54, 0.14, 0.5, 0xfdf6e3, 0, 0.5, -1.2);        // franja caramelo-crema
  const shield = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.45, 0.1),
    new THREE.MeshStandardMaterial({ color: 0x9fd8ff, roughness: 0.2, metalness: 0.3 }));
  shield.position.set(0, 1.15, 0.7); shield.rotation.x = -0.45; g.add(shield); // parabrisas bajo de carrera
  vbox(g, 0.55, 0.45, 0.45, 0x2b2f3a, 0, 1.05, -0.2);      // asiento único de piloto
  vbox(g, 0.6, 0.45, 0.25, 0x2b2f3a, 0, 1.05, 0.4);        // consola
  vbox(g, 1.1, 0.12, 0.5, 0xf5a623, 0, 1.35, -2.0);        // alerón trasero
  vbox(g, 0.12, 0.5, 0.4, 0x2b2f3a, -0.45, 1.05, -2.0);
  vbox(g, 0.12, 0.5, 0.4, 0x2b2f3a, 0.45, 1.05, -2.0);
  vbox(g, 0.55, 1.0, 0.4, 0x2b2f3a, 0, 0.65, -2.7);        // motor central grande
  vbox(g, 0.12, 0.55, 0.55, 0x2b2f3a, 0, 0.2, -2.7);
  vbox(g, 1.54, 0.12, 4.44, 0xfdf6e3, 0, 0.82, -0.1);      // línea crema
  addGeayiBadge(g, 0.76, 0.55, -0.1, Math.PI / 2, 1.2, 0.45);
  addGeayiBadge(g, -0.76, 0.55, -0.1, -Math.PI / 2, 1.2, 0.45);
  addElectricBadge(g, 0.76, 0.55, 1.4, Math.PI / 2, 0.36);
  g.userData.isGeayiBadge = true;
  return g;
}
/* ---- Lancha Trueno Doble 🛥️ (caramelo rosa: doble motor, más estable) ---- */
function buildThunderBoatMesh() {
  const g = new THREE.Group();
  const rose = vmat(0xff7d9c, 0xff4d7e, 0.25), cream = vmat(0xfdf6e3), dark = vmat(0x2b2f3a);
  vbox(g, 2.3, 0.7, 4.0, 0xff7d9c, 0, 0.55, -0.1);         // casco ancho (estable)
  const bow = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.7, 1.2), rose);
  bow.position.set(0, 0.55, 2.2); bow.rotation.x = 0.5; bow.castShadow = true; g.add(bow);
  vbox(g, 2.1, 0.16, 3.2, 0xfdf6e3, 0, 0.95, -0.3);        // cubierta crema
  const shield = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.6, 0.1),
    new THREE.MeshStandardMaterial({ color: 0x9fd8ff, roughness: 0.2, metalness: 0.3 }));
  shield.position.set(0, 1.35, 0.8); shield.rotation.x = -0.3; g.add(shield);
  vbox(g, 1.6, 0.45, 0.6, 0x2b2f3a, 0, 1.15, -0.3);        // banca doble
  vbox(g, 0.7, 0.5, 0.3, 0x2b2f3a, 0, 1.15, 0.4);          // consola
  vbox(g, 0.45, 0.9, 0.35, 0x2b2f3a, -0.55, 0.65, -2.35);  // motor doble izq
  vbox(g, 0.45, 0.9, 0.35, 0x2b2f3a, 0.55, 0.65, -2.35);   // motor doble der
  vbox(g, 0.1, 0.45, 0.45, 0x2b2f3a, -0.55, 0.22, -2.35);
  vbox(g, 0.1, 0.45, 0.45, 0x2b2f3a, 0.55, 0.22, -2.35);
  vbox(g, 2.34, 0.14, 4.04, 0xfdf6e3, 0, 0.92, -0.1);      // línea crema
  addGeayiBadge(g, 1.16, 0.62, -0.1, Math.PI / 2, 1.3, 0.48);
  addGeayiBadge(g, -1.16, 0.62, -0.1, -Math.PI / 2, 1.3, 0.48);
  addElectricBadge(g, 1.16, 0.62, 1.2, Math.PI / 2, 0.4);
  g.userData.isGeayiBadge = true;
  return g;
}
Object.assign(VEHICLE_TYPES, {
  'geayi-arrow':   { name: 'Lancha Flecha Veloz GEAYI ⚡ ELÉCTRICA',  emoji: '🚤', maxSpeed: 20, accel: 17, seatY: 0.55 },
  'geayi-thunder': { name: 'Lancha Trueno Doble GEAYI ⚡ ELÉCTRICA', emoji: '🛥️', maxSpeed: 18, accel: 15, seatY: 0.55 },
});
VEHICLE_BUILDERS['geayi-arrow'] = buildArrowBoatMesh;
VEHICLE_BUILDERS['geayi-thunder'] = buildThunderBoatMesh;
/* ---- boyas del circuito: anillos naranjas flotantes con banderín ---- */
let _boatCheckTex = null;
function boatCheckTex() { // cuadros de la boya de salida/meta (cacheado)
  if (_boatCheckTex) return _boatCheckTex;
  _boatCheckTex = canvasTex(64, 64, (g) => {
    const s = 16;
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      g.fillStyle = (x + y) % 2 ? '#111111' : '#ffffff';
      g.fillRect(x * s, y * s, s, s);
    }
  });
  return _boatCheckTex;
}
function buildBuoyMesh(isStart) {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.35, 10, 28),
    vmat(0xff6a00, 0xff6a00, 0.55));
  ring.rotation.x = Math.PI / 2;
  ring.castShadow = true;
  g.add(ring);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 2.4, 8), vmat(0xfdf6e3));
  pole.position.y = 1.2; pole.castShadow = true; g.add(pole);
  if (isStart) { // banderín de cuadros en la boya de salida/meta
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1),
      new THREE.MeshBasicMaterial({ map: boatCheckTex(), side: THREE.DoubleSide }));
    flag.position.set(0.78, 2.0, 0);
    g.add(flag);
  } else { // banderín naranja triangular (diseño original)
    const tri = new THREE.Mesh(new THREE.CircleGeometry(0.5, 3),
      new THREE.MeshBasicMaterial({ color: 0xffe95e, side: THREE.DoubleSide }));
    tri.position.set(0.55, 1.95, 0);
    tri.rotation.z = -Math.PI / 2;
    g.add(tri);
  }
  return g;
}
/* ---- estado de la mini-carrera de lanchas ---- */
const BoatRace = {
  built: false, buoys: [], sign: null, hud: null,
  phase: 'idle', // idle | racing | finished
  next: 0, laps: 0, t: 0, finishT: 0,
};
const BOAT_LAKE = { x: -78, z: 18, waterY: 0.03, r: 20 }; // Lago Trafford (igual que world.js)
function boatFmtTime(ms) {
  if (ms == null) return '—';
  const t = ms / 1000, m = Math.floor(t / 60), s = Math.floor(t % 60), d = Math.floor((t % 1) * 10);
  return m + ':' + String(s).padStart(2, '0') + '.' + d;
}
function resetBoatRace() {
  BoatRace.phase = 'idle'; BoatRace.next = 0; BoatRace.laps = 0; BoatRace.t = 0; BoatRace.finishT = 0;
  // la boya 0 se desarma: hay que alejarse (>7) y volver a cruzarla para empezar otra carrera
  BoatRace.buoys.forEach((b, i) => { b.armed = (i !== 0); });
  boatRaceHud(false);
}
let _boatSignTex = null, _boatSignLang = '';
function boatSignTex() { // se regenera si el jugador cambia de idioma
  const lang = (typeof LANG !== 'undefined') ? LANG : 'es';
  if (_boatSignTex && _boatSignLang === lang) return _boatSignTex;
  _boatSignTex = canvasTex(512, 128, (g, w, h) => {
    g.fillStyle = '#0d1b2a'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#ff6a00'; g.lineWidth = 8; g.strokeRect(8, 8, w - 16, h - 16);
    g.fillStyle = '#ffffff'; g.textAlign = 'center';
    g.font = '900 54px "Trebuchet MS", sans-serif';
    g.fillText(T('boatrace.sign'), w / 2, 84);
  });
  _boatSignLang = lang;
  return _boatSignTex;
}
/* Puerta de entrada para el mundo 4 (Immokalee, idx 3). El padre la llama en addPhase2Content. */
function addBoatRaceCourse(lvl) {
  if (!lvl || !lvl.group) return;
  resetBoatRace();
  const g = lvl.group, L = BOAT_LAKE;
  // letrero 🏁 CARRERA DE LANCHAS junto al muelle: en el PASTO al sur de la calle (z=30),
  // fuera de la calzada este-oeste (z=18), de la norte-sur (x=-48) y del agua
  const postM = vmat(0x5e3717);
  [-60, -56].forEach(px => {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 2.8, 8), postM);
    p.position.set(px, 1.4, 30); p.castShadow = true; g.add(p);
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.75),
    new THREE.MeshBasicMaterial({ map: boatSignTex(), side: THREE.DoubleSide }));
  sign.position.set(-58, 3.0, 30);
  sign.rotation.y = -Math.PI / 2; // mira al lago (oeste)
  g.add(sign);
  BoatRace.sign = sign;
  // 6 boyas naranjas en círculo (radio 11) sobre el agua; la 0 es salida/meta (banderín de cuadros)
  BoatRace.buoys = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    const x = L.x + Math.cos(a) * 11, z = L.z + Math.sin(a) * 11;
    const mesh = buildBuoyMesh(i === 0);
    mesh.position.set(x, L.waterY + 0.15, z);
    g.add(mesh);
    BoatRace.buoys.push({ mesh, x, z, y: L.waterY + 0.15, t: Math.random() * 9, phase: i * 1.1, armed: i !== 0 });
  }
  lvl.boatBuoys = BoatRace.buoys; // updateWorldFx las mece
  // 2 lanchas rápidas amarradas junto al muelle (botón SUBIR existente, gratis)
  addBoat(lvl, -59, L.waterY, 14.5, 19.5, { vtype: 'geayi-arrow', wcx: L.x, wcz: L.z, raceBoat: true, heading: -Math.PI / 2 });
  addBoat(lvl, -59, L.waterY, 21.5, 19.5, { vtype: 'geayi-thunder', wcx: L.x, wcz: L.z, raceBoat: true, heading: -Math.PI / 2 });
  BoatRace.built = true;
}
/* ==================== HUD de la mini-carrera ==================== */
function ensureBoatRaceHud() {
  if (BoatRace.hud || typeof document === 'undefined') return;
  const d = document.createElement('div');
  d.id = 'boatrace-hud';
  d.style.cssText = 'position:fixed;top:104px;left:50%;transform:translateX(-50%);' +
    'background:rgba(10,20,30,.74);color:#fff;font:700 15px/1.5 system-ui,sans-serif;' +
    'padding:6px 16px;border-radius:20px;border:2px solid #ff6a00;z-index:60;' +
    'display:none;pointer-events:none;white-space:nowrap;';
  document.body.appendChild(d);
  BoatRace.hud = d;
}
function boatRaceHud(on) {
  ensureBoatRaceHud();
  if (BoatRace.hud) BoatRace.hud.style.display = on ? '' : 'none';
}
function boatRaceHudUpdate() {
  if (!BoatRace.hud || BoatRace.phase === 'idle') return;
  BoatRace.hud.textContent = tp('boatrace.hud', {
    lap: Math.min(3, BoatRace.laps + 1),
    t: boatFmtTime(Math.floor(BoatRace.t * 1000))
  });
}
/* ==================== lógica de la mini-carrera ====================
   La llama updateBoat al final de cada cuadro con la posición real de la lancha.
   Boyas en orden 0→1→2→3→4→5→0: cruzar la 0 empieza el cronómetro; cruzarla de
   nuevo completa una vuelta; 3 vueltas → meta, récord y premio. */
function updateBoatRace(dt, nx, nz) {
  if (!BoatRace.built) return;
  if (typeof MODE !== 'undefined' && MODE !== 'play') return;
  const def = (typeof Vehicle !== 'undefined') ? Vehicle.def : null;
  if (!def || !def.raceBoat || Vehicle.mode !== 'boat') return;
  dt = Math.min(dt, 0.05);
  if (BoatRace.phase === 'racing') BoatRace.t += dt; // ⏱️ el cronómetro corre cada cuadro
  if (BoatRace.phase === 'finished') {
    BoatRace.finishT -= dt;
    if (BoatRace.finishT <= 0) resetBoatRace();
    return;
  }
  for (const b of BoatRace.buoys) { // re-armar al alejarse (evita doble conteo)
    if (!b.armed && Math.hypot(nx - b.x, nz - b.z) > 7) b.armed = true;
  }
  const b = BoatRace.buoys[BoatRace.next];
  if (!b || !b.armed) return;
  if (Math.hypot(nx - b.x, nz - b.z) > 3.5) return;
  b.armed = false;
  const A2 = (typeof Audio2 !== 'undefined') ? Audio2 : null;
  if (BoatRace.phase === 'idle') { // cruzar la boya de inicio → empieza el cronómetro
    BoatRace.phase = 'racing'; BoatRace.t = 0; BoatRace.laps = 0; BoatRace.next = 1;
    if (typeof toast === 'function') toast(T('boatrace.go'));
    if (A2) { if (A2.check) A2.check(); else A2.click(); }
    boatRaceHud(true); boatRaceHudUpdate();
    return;
  }
  if (BoatRace.next === 0) { // de nuevo en la meta → vuelta completa
    BoatRace.laps++;
    if (BoatRace.laps >= 3) { boatRaceFinish(); return; }
    if (typeof toast === 'function') toast(tp('boatrace.lap', { n: BoatRace.laps + 1 }));
  } else {
    if (typeof toast === 'function') toast(tp('boatrace.buoy', { n: BoatRace.next + 1 }));
  }
  BoatRace.next = (BoatRace.next + 1) % BoatRace.buoys.length;
  if (A2 && A2.check) A2.check();
  boatRaceHudUpdate();
}
function boatRaceFinish() {
  BoatRace.phase = 'finished'; BoatRace.finishT = 6;
  const ms = Math.floor(BoatRace.t * 1000);
  let best = '';
  const prev = (typeof SAVE !== 'undefined') ? SAVE.bestBoatLap : null;
  if (prev == null || ms < prev) { // 🏆 batir tu récord → +30 🪙 (una vez por carrera)
    SAVE.bestBoatLap = ms;
    SAVE.coins = (SAVE.coins || 0) + 30;
    if (typeof persist === 'function') persist();
    try { const h = (typeof $ === 'function') ? $('hud-coins') : null; if (h) h.textContent = SAVE.coins; } catch (e) {}
    best = T('boatrace.newBest');
    const P = (typeof Player !== 'undefined' && Player.pos) ? Player.pos : { x: BOAT_LAKE.x, y: 0, z: BOAT_LAKE.z };
    if (typeof Particles !== 'undefined')
      Particles.burst(P.x, P.y + 2, P.z, [0xff6a00, 0x00e5ff, 0xffe95e, 0xffffff], 30, 6);
    if (typeof Audio2 !== 'undefined' && Audio2.win) Audio2.win();
  }
  if (typeof toast === 'function') toast(tp('boatrace.finish', { t: boatFmtTime(ms), best: best }));
  boatRaceHudUpdate();
}
/* ---- plataforma de lanzamiento GEAYI SPACE 🚀 ---- */
let _spaceSignTex = null;
function spaceSignTex() {
  if (_spaceSignTex) return _spaceSignTex;
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#0d1b2a'; g.fillRect(0, 0, 512, 128);
  g.strokeStyle = '#ff9d00'; g.lineWidth = 8; g.strokeRect(8, 8, 496, 112);
  g.fillStyle = '#ffffff'; g.textAlign = 'center';
  g.font = '900 52px "Trebuchet MS", sans-serif';
  g.fillText('🚀 GEAYI SPACE', 256, 84);
  _spaceSignTex = new THREE.CanvasTexture(c);
  return _spaceSignTex;
}
function addRocketPad(lvl, x, padTopY, z, skyY) {
  const g = lvl.group;
  addPlatform(lvl, x, padTopY, z, 9, 9, { color: 0x3a4150, emissive: 0x000000 }); // plataforma
  const dark = vmat(0x2b2f3a);
  const mount = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.5, 0.8, 12), dark); // base
  mount.position.set(x, padTopY + 0.4, z); mount.castShadow = true; g.add(mount);
  const towerM = vmat(0x8a94a6);
  const tower = new THREE.Mesh(new THREE.BoxGeometry(0.5, 9, 0.5), towerM); // torre
  tower.position.set(x + 2.6, padTopY + 4.5, z - 2.6); tower.castShadow = true; g.add(tower);
  const armM = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.25, 0.25), towerM); // brazo
  armM.position.set(x + 1.5, padTopY + 6.4, z - 2.6); g.add(armM);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 1.6),
    new THREE.MeshBasicMaterial({ map: spaceSignTex() })); // letrero
  sign.position.set(x, padTopY + 8.2, z - 4.2); sign.rotation.y = Math.PI; g.add(sign);
  [-2.8, 2.8].forEach(px => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 8.2, 8), dark);
    pole.position.set(x + px, padTopY + 4.1, z - 4.2); g.add(pole);
  });
  const mesh = buildRocketMesh(); // cohete en la rampa
  mesh.position.set(x, padTopY + 0.8, z);
  g.add(mesh);
  addPlatform(lvl, x, skyY, z, 11, 11, { color: 0x2b3a55, emissive: 0x0a1030 }); // plataforma espacial
  const ringM = vmat(0x00e5ff, 0x00e5ff, 0.8);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(5.2, 0.18, 8, 40), ringM); // anillo neón
  ring.rotation.x = Math.PI / 2; ring.position.set(x, skyY + 0.3, z); g.add(ring);
  for (let i = 0; i < 8; i++) { // monedas bonus en círculo
    const a = (i / 8) * TAU;
    addCoin(lvl, x + Math.cos(a) * 3.4, skyY + 1.2, z + Math.sin(a) * 3.4);
  }
  addCoin(lvl, x, skyY + 1.2, z);
  lvl.rockets = lvl.rockets || [];
  lvl.rockets.push({ mesh, taken: false, busy: false, rstate: 'pad',
    x, padY: padTopY + 0.8, z, skyY, vy: 0, rt: 0, lastN: 99 });
  return mesh;
}
/* ---- tren: sigue el loop solo ---- */
function updateTrain(dt) {
  const V = Vehicle, P = Player, T = V.def;
  T.speed = Math.min(T.cruise, T.speed + 3.5 * dt);
  T.angle += (T.speed / T.r) * dt;
  const x = T.cx + Math.cos(T.angle) * T.r;
  const z = T.cz + Math.sin(T.angle) * T.r;
  const m = T.mesh;
  m.position.set(x, T.trackY, z);
  m.rotation.y = -T.angle;
  V.heading = -T.angle;
  P.pos.set(x, T.trackY + 0.55, z);
  P.vel.set(-Math.sin(T.angle) * T.speed, 0, Math.cos(T.angle) * T.speed);
  P.grounded = true; P.groundPlat = null;
  P.heading = V.heading;
  Audio2.engineSet(0.25);
}
/* ---- lancha: como carro pero sobre el agua ---- */
function updateBoat(dt, input) {
  const V = Vehicle, P = Player, def = V.def, m = def.mesh;
  const maxS = def.maxSpeed || 13, accel = def.accel || 10;
  if (input.z > 0.1) V.speed = Math.min(maxS, V.speed + accel * dt);
  else if (input.z < -0.1) V.speed = Math.max(-maxS / 3, V.speed - 20 * dt);
  else V.speed *= Math.pow(0.05, dt);
  if (Math.abs(V.speed) < 0.05) V.speed = 0;
  V.heading -= input.x * 1.3 * dt * clamp(V.speed / 4, -1, 1);
  let nx = m.position.x + Math.sin(V.heading) * V.speed * dt;
  let nz = m.position.z + Math.cos(V.heading) * V.speed * dt;
  const dx = nx - def.wcx, dz = nz - def.wcz, d = Math.hypot(dx, dz), maxR = def.wr || 6;
  if (d > maxR) { nx = def.wcx + dx / d * maxR; nz = def.wcz + dz / d * maxR; V.speed *= 0.6; }
  def.bobT = (def.bobT || 0) + dt;
  const bob = Math.sin(def.bobT * 3) * 0.06;
  m.position.set(nx, def.waterY + 0.15 + bob, nz);
  m.rotation.y = V.heading;
  m.rotation.z = -input.x * 0.08;
  m.rotation.x = clamp(V.speed * 0.008, -0.06, 0.1);
  P.pos.set(nx, def.waterY + 0.6 + bob, nz);
  P.vel.set(Math.sin(V.heading) * V.speed, 0, Math.cos(V.heading) * V.speed);
  P.grounded = true; P.groundPlat = null; P.heading = V.heading;
  Audio2.engineSet(0.35);
  def.wakeT = (def.wakeT || 0) - dt;
  if (Math.abs(V.speed) > 4 && def.wakeT <= 0 && typeof Particles !== 'undefined') {
    def.wakeT = 0.12;
    Particles.spawn(nx - Math.sin(V.heading) * 2, def.waterY + 0.2, nz - Math.cos(V.heading) * 2,
      { n: 2, colors: [0xffffff, 0x9fd8ff], speed: 1.5, up: 1, life: 0.6, size: 0.5, spread: 0.8, grav: 2 });
  }
  if (def.raceBoat && typeof updateBoatRace === 'function') updateBoatRace(dt, nx, nz); // 🏁 mini-carrera
}
/* ---- cohete: el jugador viaja pegado al cohete (lo mueve updateWorldFx) ---- */
function updateRocketRide(dt) {
  const def = Vehicle.def, m = def.mesh;
  Player.pos.set(m.position.x, m.position.y + 0.6, m.position.z);
  Player.vel.set(0, def.vy || 0, 0);
  Player.grounded = false; Player.groundPlat = null;
  Player.heading = Vehicle.heading;
  Audio2.engineSet(def.rstate === 'ascent' ? 1 : 0.2);
}
/* ---- FX del mundo: drones/pterodáctilos decorativos, cohetes, aterrizajes, disco ---- */
let _fxT = 0;
function updateWorldFx(dt) {
  _fxT += dt;
  const lvl = (typeof LEVEL !== 'undefined') ? LEVEL : null;
  if (!lvl || !lvl.group) return;
  const riderRocket = (typeof Vehicle !== 'undefined' && Vehicle.mode === 'rocket') ? Vehicle.def : null;
  for (const d of (lvl.drones || [])) { // drones de reparto en círculos perezosos
    d.a += d.speed * dt;
    const m = d.mesh;
    m.position.set(d.cx + Math.cos(d.a) * d.r, d.cy + Math.sin(d.a * 2.3) * 0.8, d.cz + Math.sin(d.a) * d.r);
    m.rotation.y = -d.a;
    if (m.userData.props) for (const p of m.userData.props) p.rotation.y += dt * 22;
    if (m.userData.blinkers) for (const b of m.userData.blinkers)
      b.m.visible = ((_fxT * 1.6 + b.phase) % 1) < 0.55;
  }
  for (const b of (lvl.boatBuoys || [])) { // 🟠 boyas del circuito de lanchas: flotan y giran suave
    b.t += dt;
    b.mesh.position.y = b.y + Math.sin(b.t * 2.2 + b.phase) * 0.16;
    b.mesh.rotation.y += dt * 0.25;
  }
  for (const p of (lvl.pteros || [])) { // pterodáctilos
    p.a += p.speed * dt;
    const m = p.mesh;
    m.position.set(p.cx + Math.cos(p.a) * p.r, p.cy + Math.sin(p.a * 1.7) * 1.2, p.cz + Math.sin(p.a) * p.r);
    m.rotation.y = -p.a;
    const flap = Math.sin(_fxT * 6 + p.phase) * 0.55;
    if (m.userData.wingL) m.userData.wingL.rotation.z = flap;
    if (m.userData.wingR) m.userData.wingR.rotation.z = -flap;
  }
  for (const r of (lvl.rockets || [])) {
    const m = r.mesh, hasRider = riderRocket === r;
    if (r.rstate === 'countdown') {
      r.rt -= dt;
      const n = Math.ceil(r.rt);
      if (n !== r.lastN && n > 0) { r.lastN = n; toast('🚀 ' + n + '…'); }
      if (r.rt <= 0) {
        r.rstate = 'ascent'; r.vy = 2;
        if (hasRider) { toast('🚀 ¡DESPEGUE!'); Audio2.boost(); }
      }
    } else if (r.rstate === 'ascent') {
      r.vy = Math.min(26, r.vy + 22 * dt);
      m.position.y += r.vy * dt;
      m.rotation.y += dt * 0.4;
      if (typeof Particles !== 'undefined') {
        Particles.spawn(m.position.x, m.position.y - 1.6, m.position.z,
          { n: 3, colors: [0xffdd55, 0xff8830, 0xffffff], speed: 3, up: -13, life: 0.7, size: 0.9, spread: 0.9, grav: 1 });
        Particles.spawn(m.position.x, m.position.y - 2.2, m.position.z,
          { n: 2, colors: [0xbbbbbb, 0x888888], speed: 2, up: -5, life: 1.6, size: 1.5, spread: 1.2, grav: -1, grow: 2.5 });
      }
      if (m.position.y >= r.skyY) {
        m.position.y = r.skyY; r.rstate = 'top'; r.vy = 0; r.rt = 8;
        if (hasRider) toast('🪐 ¡Plataforma espacial GEAYI! 🪙 Monedas bonus · BAJAR para salir');
      }
    } else if (r.rstate === 'top') {
      m.position.y = r.skyY + Math.sin(_fxT * 2) * 0.15;
      if (!hasRider) { r.rt -= dt; if (r.rt <= 0) r.rstate = 'return'; }
    } else if (r.rstate === 'return') {
      m.position.y -= 12 * dt;
      if (m.position.y <= r.padY) {
        m.position.y = r.padY; m.rotation.y = 0;
        r.rstate = 'pad'; r.busy = false;
      }
    }
  }
  for (const c of (lvl.cars || [])) { // aterrizaje automático de dron/heli al bajar
    if (!c.landing) continue;
    const m = c.mesh;
    let target = m.position.y;
    if (typeof findGroundBelow === 'function') {
      const gy = findGroundBelow(m.position.x, m.position.z, m.position.y + 1);
      if (gy != null) target = gy + (c.kind === 'heli' ? 0.9 : 0.55);
    }
    m.position.y -= Math.min(Math.max(m.position.y - target, 0), 10 * dt);
    if (m.userData.rotor) m.userData.rotor.rotation.y += dt * 3;
    if (m.userData.props) for (const p of m.userData.props) p.rotation.y += dt * 6;
    if (m.position.y <= target + 0.05) { m.position.y = target; c.landing = false; c.busy = false; }
  }
  if (lvl.disco && lvl.disco.tiles) { // 🪩 piso de la disco: luces que parpadean
    const cols = [0xff2fd6, 0x00e5ff, 0x7b2fff, 0xffe95e, 0x35c759, 0xff6a00];
    for (let i = 0; i < lvl.disco.tiles.length; i++) {
      const tl = lvl.disco.tiles[i];
      const k = Math.floor(_fxT * 3 + i * 0.7) % cols.length;
      tl.material.color.setHex(cols[k]);
    }
  }
  for (const t of (lvl.traffic || [])) { // 🚗 tráfico de Ciudad Neón: carros GEAYI circulando por la avenida
    const m = t.mesh, wp = t.wps[t.i];
    const dx = wp.x - m.position.x, dz = wp.z - m.position.z;
    const d = Math.hypot(dx, dz);
    if (d < 1.4) { t.i = (t.i + 1) % t.wps.length; continue; }
    let sp = t.speed;
    if (typeof Player !== 'undefined' && Player.pos) { // frena si el jugador está al frente
      const px = Player.pos.x - m.position.x, pz = Player.pos.z - m.position.z;
      if (Math.hypot(px, pz) < 5.5 && (px * dx + pz * dz) / (d || 1) > 0) sp = 0;
    }
    const des = Math.atan2(dx, dz);
    let dh = des - m.rotation.y;
    while (dh > Math.PI) dh -= TAU; while (dh < -Math.PI) dh += TAU;
    m.rotation.y += clamp(dh, -2.6 * dt, 2.6 * dt);
    m.position.x += Math.sin(m.rotation.y) * sp * dt;
    m.position.z += Math.cos(m.rotation.y) * sp * dt;
    const wspin = sp * dt * 1.6;
    (m.userData.wheels || []).forEach(w => { w.rotation.x += wspin; });
  }
}

/* ================= PEATONES (NPC) ================= */
function addNPC(lvl, x, y, z, ax, az, bx, bz) {
  const cols = ['#ff5533', '#00a2ff', '#59d867', '#ffe95e', '#ff2fd6', '#7b2fff', '#f5f0e6', '#ff9d00'];
  const g = createAvatarMesh({ body: cols[(Math.random() * cols.length) | 0] });
  g.position.set(x, y, z);
  lvl.group.add(g);
  lvl.npcs.push({
    g, y,
    a: { x: ax, z: az }, b: { x: bx, z: bz },
    t: Math.random(), dir: Math.random() < 0.5 ? 1 : -1,
    speed: 1.6 + Math.random() * 1.4
  });
}
function addJuanNPC(lvl, x, y, z, ry) { // 👨‍🍳 Juan, dueño de Los Hermanos Tamps (NPC quieto con su nombre)
  const f = (typeof getFamilyChar === 'function') ? getFamilyChar('juan') : null;
  if (!f) return;
  const g = createAvatarMesh(familyStyle(f));
  g.position.set(x, y, z);
  g.rotation.y = (ry == null ? Math.PI / 2 : ry); // por defecto mira a la pista (+x)
  if (typeof makeNameLabel === 'function') {
    const label = makeNameLabel('Juan');
    label.position.y = g.userData.nameLabelY || 2.7;
    g.add(label);
  }
  lvl.group.add(g);
  lvl.npcs.push({ g, y, a: { x, z }, b: { x, z }, t: 0.5, dir: 1, speed: 0, still: true });
}
function updateNPCs(dt) {
  const list = (typeof LEVEL !== 'undefined' && LEVEL.npcs) || [];
  for (const n of list) {
    n.t += n.dir * n.speed * dt * 0.03;
    if (n.t >= 1) { n.t = 1; n.dir = -1; }
    else if (n.t <= 0) { n.t = 0; n.dir = 1; }
    const x = lerp(n.a.x, n.b.x, n.t), z = lerp(n.a.z, n.b.z, n.t);
    n.g.position.set(x, n.y, z);
    const dx = (n.b.x - n.a.x) * n.dir, dz = (n.b.z - n.a.z) * n.dir;
    if (dx * dx + dz * dz > 0.0001) n.g.rotation.y = Math.atan2(dx, dz);
    if (n.robot) animateGeayiBoot(n.g, dt, n.speed);
    else if (!n.still) animateAvatarMesh(n.g, dt, n.speed, true);
  }
}

/* ================= PARACAÍDAS ================= */
const Chute = {
  deployed: false, leaveY: 0, mesh: null,
  ensureMesh() {
    if (this.mesh) return this.mesh;
    const g = new THREE.Group();
    const canopy = new THREE.Mesh(
      new THREE.SphereGeometry(1.35, 14, 8, 0, TAU, 0, Math.PI / 2),
      vmat(0xff7043, 0xff7043, 0.25));
    canopy.scale.y = 0.75;
    canopy.position.y = 2.6;
    g.add(canopy);
    const stripe = new THREE.Mesh(
      new THREE.SphereGeometry(1.36, 14, 8, Math.PI / 4, Math.PI / 4, 0, Math.PI / 2),
      vmat(0xffffff, 0xffffff, 0.15));
    stripe.scale.y = 0.75;
    stripe.position.y = 2.6;
    g.add(stripe);
    const lineM = vmat(0x2b2f3a);
    [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]].forEach(([lx, lz]) => {
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.9, 0.05), lineM);
      line.position.set(lx * 0.72, 1.75, lz * 0.72);
      line.rotation.z = lx > 0 ? -0.32 : 0.32;
      line.rotation.x = lz > 0 ? 0.32 : -0.32;
      g.add(line);
    });
    g.visible = false;
    scene.add(g);
    this.mesh = g;
    return g;
  },
  deploy() {
    this.deployed = true;
    const m = this.ensureMesh();
    m.visible = true;
    Audio2.chute();
    toast('🪂 ¡Paracaídas!');
    Particles.burst(Player.pos.x, Player.pos.y + 2, Player.pos.z, [0xffffff, 0xff7043], 10, 3);
  },
  repack(silent) {
    this.deployed = false;
    if (this.mesh) this.mesh.visible = false;
    if (!silent) { Audio2.click(); }
  },
  dispose() {
    if (this.mesh) { scene.remove(this.mesh); this.mesh = null; }
    this.deployed = false;
  }
};
function updateChute(dt) {
  const P = Player;
  if (!SAVE.chute || Vehicle.mode !== 'none') {
    if (Chute.deployed) Chute.repack(true);
    return;
  }
  if (P.grounded) {
    Chute.leaveY = P.pos.y;
    if (Chute.deployed) Chute.repack();
    return;
  }
  if (!Chute.deployed) {
    // despliegue automático: caída rápida (>6 m desde que dejó el suelo)
    if (P.vel.y < -13 && (Chute.leaveY - P.pos.y) > 6 && !finished) Chute.deploy();
  } else {
    // descenso suave y dirigible (la dirección ya la maneja updatePlayer)
    if (P.vel.y < -2.5) P.vel.y = -2.5;
    const m = Chute.mesh;
    if (m) {
      m.position.set(P.pos.x, P.pos.y, P.pos.z);
      m.rotation.y = P.heading;
      m.rotation.z = Math.sin(clock.elapsedTime * 2.2) * 0.07;
    }
  }
}

/* ================= LÓGICA DE VEHÍCULOS ================= */
function findGroundBelow(x, z, y) {
  let best = null;
  for (const p of LEVEL.platforms) {
    if (!p.solid) continue;
    const hw = p.w / 2 + 0.3, hd = p.d / 2 + 0.3;
    if (Math.abs(x - p.x) <= hw && Math.abs(z - p.z) <= hd && p.topY <= y + 1) {
      if (best == null || p.topY > best) best = p.topY;
    }
  }
  return best;
}
function nearestBoardable() {
  const P = Player;
  let best = null, bd = 4.8; // radio generoso: en táctil es difícil pegarse al carro
  for (const pl of (LEVEL.planes || [])) {
    if (pl.taken) continue;
    const d = Math.hypot(P.pos.x - pl.x, P.pos.z - pl.z);
    if (d < bd && Math.abs(P.pos.y - pl.y) < 3.5) { bd = d; best = { type: 'plane', def: pl }; }
  }
  for (const c of (LEVEL.cars || [])) {
    if (c.taken || c.busy || c.landing) continue;
    const d = Math.hypot(P.pos.x - c.mesh.position.x, P.pos.z - c.mesh.position.z);
    if (d < bd && Math.abs(P.pos.y - c.mesh.position.y) < 3.5) { bd = d; best = { type: c.kind, def: c }; }
  }
  return best;
}
function boardVehicle(nb) {
  const def = nb.def;
  if (nb.type === 'rocket' && (def.rstate !== 'pad' || def.busy)) {
    toast('🚀 El cohete no está listo… espera al próximo lanzamiento');
    Audio2.deny();
    return;
  }
  def.taken = true;
  Vehicle.mode = nb.type;
  Vehicle.def = def;
  // el carro/bici conserva su orientación estacionada (no gira brusco al subir)
  Vehicle.heading = ((nb.type === 'car' || nb.type === 'bike') && def.heading != null) ? def.heading : Player.heading;
  Vehicle.speed = 0; Vehicle.pitch = 0; Vehicle.boostT = 0; Vehicle.sx = 0; // sx: dirección suavizada desde cero
  Audio2.init();
  // 🏆 trofeo "conductor": primera vez que se sube a carro o bici
  if ((nb.type === 'car' || nb.type === 'bike') && typeof Trophy !== 'undefined' && Trophy.unlock)
    try { Trophy.unlock('rider'); } catch (e) {}
  const vt = (def.vtype && VEHICLE_TYPES[def.vtype]) ? VEHICLE_TYPES[def.vtype] : null;
  if (nb.type === 'plane') {
    Vehicle.pPos = new THREE.Vector3(def.x, def.y + 1.2, def.z);
    if (Avatar.group) Avatar.group.visible = false;
    toast('✈️ ¡A volar! Joystick o WASD · SALTAR = turbo');
  } else if (nb.type === 'drone' || nb.type === 'heli') {
    Vehicle.pPos = def.mesh.position.clone();
    Player.vel.set(0, 0, 0);
    toast(vt ? (vt.emoji + ' ¡' + vt.name + '! Joystick o WASD · SALTAR = turbo') : '🚁 ¡A volar!');
  } else if (nb.type === 'boat') {
    def.shore = { x: Player.pos.x, y: Player.pos.y, z: Player.pos.z };
    Player.vel.set(0, 0, 0);
    if (def.raceBoat) toast(T('boatrace.board')); // 🏁 pista de la mini-carrera
    else toast(vt ? (vt.emoji + ' ¡' + vt.name + '! 🛥️ (E o botón para volver a la orilla)') : '🛥️ ¡A navegar!');
  } else if (nb.type === 'rocket') {
    def.busy = true; def.rstate = 'countdown'; def.rt = 3.2; def.lastN = 99;
    Player.vel.set(0, 0, 0);
    toast('🚀 ¡' + (vt ? vt.name : 'Cohete') + '! Despegue en 3… ¡no te bajes!');
  } else if (nb.type === 'train') {
    def.speed = 0;
    toast('🚇 ¡' + (vt ? vt.name : 'Metro') + ' en marcha! ⚡ Conduce solo · BAJAR para salir');
  } else {
    Player.pos.set(def.mesh.position.x, def.mesh.position.y, def.mesh.position.z);
    Player.vel.set(0, 0, 0);
    toast(vt ? (vt.emoji + ' ¡' + vt.name + '! 🟢 ACELERAR para avanzar · joystick ← → para girar · BAJAR para salir')
             : (nb.type === 'car' ? '🚗 ¡A manejar! 🟢 ACELERAR para avanzar · joystick ← → para girar · BAJAR para salir' : '🚲 ¡A rodar! 🟢 ACELERAR para avanzar · joystick ← → para girar · BAJAR para salir'));
  }
  Audio2.engineStart();
  Audio2.click();
  updateVehiclePrompt(true);
  if (typeof setDriveUI === 'function') setDriveUI(nb.type === 'car' || nb.type === 'bike'); // 🚗 botones de manejo
}
function exitVehicle() {
  const def = Vehicle.def;
  Audio2.engineStop();
  if (Vehicle.mode === 'plane' && def) {
    const gy = findGroundBelow(Vehicle.pPos.x, Vehicle.pPos.z, Vehicle.pPos.y);
    if (gy != null) Player.pos.set(Vehicle.pPos.x, gy + 0.02, Vehicle.pPos.z);
    else Player.pos.set(respawn.x, respawn.y + 0.02, respawn.z);
    Player.vel.set(0, 0, 0);
    Player.grounded = false; Player.groundPlat = null;
    def.mesh.position.set(def.x, def.y + 1.2, def.z);
    def.mesh.rotation.set(0, 0, 0);
    def.taken = false;
    if (Avatar.group) Avatar.group.visible = true;
    toast('✈️ ¡De vuelta en tierra!');
  } else if (def) {
    def.taken = false;
    if (Vehicle.mode === 'train') { def.speed = 0; toast('🚇 ¡Te bajaste del metro!'); }
    else if (Vehicle.mode === 'boat') {
      if (def.shore) Player.pos.set(def.shore.x, def.shore.y + 0.02, def.shore.z);
      Player.vel.set(0, 0, 0); Player.grounded = false; Player.groundPlat = null;
      resetBoatRace(); // 🏁 salir de la lancha cancela la mini-carrera
      toast('🛥️ ¡De vuelta en la orilla!');
    }
    else if (Vehicle.mode === 'rocket') {
      if (def.rstate === 'pad' || def.rstate === 'countdown') { def.rstate = 'pad'; def.busy = false; }
      else if (def.rstate === 'top') def.rt = 6; // el cohete regresa solo a la rampa
      Player.vel.set(0, 0, 0); Player.grounded = false; Player.groundPlat = null;
      toast('🚀 ¡Te bajaste! (el paracaídas se abre solo)');
    }
    else if (Vehicle.mode === 'drone' || Vehicle.mode === 'heli') {
      def.landing = true; def.busy = true; // aterriza solo donde quedó
      Player.pos.set(def.mesh.position.x, def.mesh.position.y - 1, def.mesh.position.z);
      Player.vel.set(0, 0, 0); Player.grounded = false; Player.groundPlat = null;
      toast(vemoji(Vehicle.mode) + ' ¡Aterrizando solo…!');
    }
    else { // 🚗🚲 carro / bici / taxi / bus: el jugador queda AL LADO del vehículo, no dentro
      const m = def.mesh;
      const sx = m.position.x + Math.sin(m.rotation.y + Math.PI / 2) * 2.3;
      const sz = m.position.z + Math.cos(m.rotation.y + Math.PI / 2) * 2.3;
      const gy = (typeof findGroundBelow === 'function') ? findGroundBelow(sx, sz, m.position.y + 2.5) : null;
      Player.pos.set(sx, (gy != null ? gy : Math.max(m.position.y, 0)) + 0.05, sz);
      Player.vel.set(0, 0, 0); Player.grounded = false; Player.groundPlat = null;
      toast('👋 ¡Te bajaste!');
    }
  }
  Vehicle.mode = 'none'; Vehicle.def = null; Vehicle.speed = 0; Vehicle.near = null;
  Audio2.click();
  Player.syncMesh();
  updateVehiclePrompt(true);
  if (typeof setDriveUI === 'function') setDriveUI(false); // 🚗 ocultar botones de manejo
}
function crashVehicle() {
  // choque contra el vacío: el vehículo vuelve a su lugar, el jugador al checkpoint
  const def = Vehicle.def;
  if (def && Vehicle.mode === 'plane') {
    def.mesh.position.set(def.x, def.y + 1.2, def.z);
    def.mesh.rotation.set(0, 0, 0);
    def.taken = false;
  }
  if (def && (Vehicle.mode === 'car' || Vehicle.mode === 'bike' || Vehicle.mode === 'train' ||
             Vehicle.mode === 'boat' || Vehicle.mode === 'drone' || Vehicle.mode === 'heli')) {
    def.taken = false; def.busy = false; def.landing = false;
    if (Vehicle.mode === 'train') def.speed = 0;
    // el carro/bici vuelve a su estacionamiento (no se pierde en el vacío)
    if ((Vehicle.mode === 'car' || Vehicle.mode === 'bike') && def.mesh &&
        def.x != null && def.y != null && def.z != null) {
      def.mesh.position.set(def.x, def.y, def.z);
      def.mesh.rotation.set(0, def.heading || 0, 0);
    }
  }
  if (def && Vehicle.mode === 'rocket') { def.taken = false; }
  Vehicle.mode = 'none'; Vehicle.def = null; Vehicle.speed = 0; Vehicle.near = null;
  Audio2.engineStop();
  resetBoatRace(); // 🏁 choque: se cancela la mini-carrera
  if (typeof setDriveUI === 'function') setDriveUI(false); // 🚗 ocultar botones de manejo
  if (Avatar.group) Avatar.group.visible = true;
}
function vehicleInteract() {
  if (typeof MODE === 'undefined' || MODE !== 'play' || finished) return;
  Audio2.init();
  if (Vehicle.mode !== 'none') { exitVehicle(); return; }
  const nb = Vehicle.near || nearestBoardable();
  if (nb) boardVehicle(nb);
}
function vehicleBoost() {
  if (Vehicle.mode === 'plane' || Vehicle.mode === 'drone' || Vehicle.mode === 'heli') {
    Vehicle.boostT = 0.7;
    Audio2.boost();
    const pp = Vehicle.pPos || Player.pos;
    Particles.burst(pp.x, pp.y, pp.z, [0xffffff, 0x00e5ff], 8, 4);
  }
}

/* --- física del avión --- */
function updatePlane(dt, input) {
  const V = Vehicle, P = Player;
  const fc = (V.def && V.def.fc) || null; // dron/heli: mismos controles, otra agilidad
  const cruise = fc ? fc.cruise : 13, turbo = fc ? fc.turbo : 11, yaw = fc ? fc.yaw : 1.7;
  const pitchMax = fc ? fc.pitch : 0.55, minY = fc ? fc.minY : 1.5, maxY = fc ? fc.maxY : 60;
  V.boostT = Math.max(0, V.boostT - dt);
  const target = cruise + (V.boostT > 0 ? turbo : 0);
  V.speed = lerp(V.speed, target, 1 - Math.pow(0.01, dt));
  // guiñada suavizada (igual que en carro: sin latigazos en táctil)
  const tx = clamp(input.x, -1, 1);
  V.sx = lerp(V.sx || 0, tx, 1 - Math.pow(0.0005, dt));
  const ix = Math.abs(V.sx) < 0.1 ? 0 : V.sx;
  V.heading -= ix * yaw * dt;
  const pitchT = clamp(input.z, -1, 1) * pitchMax; // W / joystick arriba = subir
  V.pitch = lerp(V.pitch, pitchT, 1 - Math.pow(0.001, dt));
  const cp = Math.cos(V.pitch);
  const fx = Math.sin(V.heading) * cp, fy = Math.sin(V.pitch), fz = Math.cos(V.heading) * cp;
  V.pPos.x += fx * V.speed * dt;
  V.pPos.y += fy * V.speed * dt;
  V.pPos.z += fz * V.speed * dt;
  // límites del cielo
  const r = Math.hypot(V.pPos.x, V.pPos.z);
  if (r > 150) { const k = 150 / r; V.pPos.x *= k; V.pPos.z *= k; }
  V.pPos.y = clamp(V.pPos.y, minY, maxY);
  // no atravesar el suelo: deslizarse sobre él
  const gy = findGroundBelow(V.pPos.x, V.pPos.z, V.pPos.y + 2);
  if (gy != null && V.pPos.y < gy + 1.4) V.pPos.y = gy + 1.4;
  // malla del avión
  const m = V.def.mesh;
  m.position.copy(V.pPos);
  m.rotation.set(-V.pitch * 0.6, V.heading, -input.x * 0.35);
  if (m.userData.prop) m.userData.prop.rotation.z += dt * (10 + V.speed);
  if (m.userData.props) for (const pr of m.userData.props) pr.rotation.y += dt * (18 + V.speed * 1.5);
  if (m.userData.rotor) m.userData.rotor.rotation.y += dt * (9 + V.speed * 1.2);
  if (m.userData.tailRotor) m.userData.tailRotor.rotation.x += dt * (14 + V.speed * 1.5);
  // el jugador viaja con el avión (la cámara lo sigue sola)
  const rideY = (V.def && V.def.rideY != null) ? V.def.rideY : -1.2;
  P.pos.set(V.pPos.x, V.pPos.y + rideY, V.pPos.z);
  P.vel.set(fx * V.speed, fy * V.speed, fz * V.speed);
  P.grounded = false; P.groundPlat = null;
  P.heading = V.heading;
  Audio2.engineSet(clamp(V.speed / 26, 0, 1));
}

/* --- física de carro / bici (reusa la colisión del jugador) --- */
function updateDrive(dt, input) {
  const V = Vehicle, P = Player;
  if (!V.def || !V.def.mesh) { V.mode = 'none'; return; } // seguridad: sin definición no se maneja
  const maxS = (V.def && V.def.maxSpeed) || (V.mode === 'car' ? 16 : 11);
  const accel = (V.def && V.def.accel) || (V.mode === 'car' ? 15 : 11);
  // 🚗 el joystick SOLO gira (eje X): acelerar = botón 🟢 ACELERAR o W/↑; freno = S/↓ (teclado)
  let thr = 0;
  if (Drive.gas || Input.keys.up) thr = 1;
  else if (Input.keys.down) thr = -1;
  if (thr > 0) V.speed = Math.min(maxS, V.speed + accel * dt);
  else if (thr < 0) V.speed = Math.max(-maxS / 3, V.speed - 24 * dt);
  else V.speed *= Math.pow(0.05, dt);
  if (Math.abs(V.speed) < 0.05) V.speed = 0;
  // dirección directa estilo arcade: responde al instante y gira hasta a baja velocidad
  let ix = clamp(input.x, -1, 1);
  if (Math.abs(ix) < 0.14) ix = 0;
  const spdF = clamp(Math.abs(V.speed) / 6, 0, 1);
  const dirS = V.speed < -0.1 ? -1 : 1; // en reversa el giro se invierte
  V.heading -= ix * 1.9 * (0.45 + 0.55 * spdF) * dirS * dt;
  // 📷 la cámara sigue detrás del carro suavemente (pausa si el jugador la está moviendo)
  if (typeof CamDrag === 'undefined' || CamDrag.id === null) {
    let dyaw = V.heading - P.camYaw;
    while (dyaw > Math.PI) dyaw -= Math.PI * 2;
    while (dyaw < -Math.PI) dyaw += Math.PI * 2;
    P.camYaw += dyaw * (1 - Math.pow(0.001, dt));
  }
  P.vel.x = Math.sin(V.heading) * V.speed;
  P.vel.z = Math.cos(V.heading) * V.speed;
  P.vel.y -= GRAV * dt;
  if (P.vel.y < -26) P.vel.y = -26;
  P.grounded = false; P.groundPlat = null;
  moveAxis('x', P.vel.x * dt);
  moveAxis('z', P.vel.z * dt);
  moveAxis('y', P.vel.y * dt);
  const m = V.def.mesh;
  m.position.set(P.pos.x, P.pos.y, P.pos.z);
  m.rotation.set(0, V.heading, 0); // 🚗🚲 siempre derecho: nunca queda ladeado al bajar
  const spin = V.speed * dt * 1.6;
  (m.userData.wheels || []).forEach(w => { w.rotation.x += spin; });
  if (m.userData.crank && V.mode === 'bike') m.userData.crank.rotation.x += spin * 2.4; // 🚲 pedales giran
  P.heading = V.heading;
  Audio2.engineSet(clamp(Math.abs(V.speed) / 18, 0, 1) * 0.8);
}

function updateVehicle(dt, input) {
  if (Vehicle.mode === 'none' || !Vehicle.def) { // seguridad: nunca manejar sin vehículo
    if (Vehicle.mode !== 'none') { Vehicle.mode = 'none'; Vehicle.def = null; Vehicle.speed = 0; }
    return;
  }
  updateLevelDynamics(dt, false); // el mundo se sigue moviendo, pero no te derriba
  if (Vehicle.mode === 'plane' || Vehicle.mode === 'drone' || Vehicle.mode === 'heli') updatePlane(dt, input);
  else if (Vehicle.mode === 'train') updateTrain(dt);
  else if (Vehicle.mode === 'boat') updateBoat(dt, input);
  else if (Vehicle.mode === 'rocket') updateRocketRide(dt);
  else updateDrive(dt, input);
  levelTriggers(dt); // monedas, checkpoints, meta y vacío (con choque suave)
  const P = Player;
  const hSpeed = Math.hypot(P.vel.x, P.vel.z);
  if (Vehicle.mode === 'plane') {
    if (Avatar.group) { Avatar.group.position.copy(P.pos); Avatar.group.rotation.y = P.heading; }
  } else {
    // avatar sentado al volante (en carro se achica para caber bajo el techo)
    P.syncMesh();
    if (Avatar.group) {
      Avatar.group.position.y += (Vehicle.def && Vehicle.def.seatY != null)
        ? Vehicle.def.seatY : (Vehicle.mode === 'bike' ? 0.75 : 0.55);
      const sz = (Vehicle.def && Vehicle.def.seatZ != null) ? Vehicle.def.seatZ : 0;
      Avatar.group.position.x += Math.sin(Vehicle.heading) * sz;
      Avatar.group.position.z += Math.cos(Vehicle.heading) * sz;
      Avatar.group.rotation.y = Vehicle.heading;
      const baseS = Avatar.group.userData.baseScale || 1;
      Avatar.group.scale.setScalar(Vehicle.mode === 'car' ? baseS * 0.55 : baseS);
    }
  }
  if ((Vehicle.mode === 'car' || Vehicle.mode === 'bike') && typeof animateRiderMesh === 'function')
    animateRiderMesh(Avatar.group, dt, Math.abs(Vehicle.speed), Vehicle.mode); // 🚲 pedalea / 🚗 maneja
  else Avatar.animate(dt, Math.abs(Vehicle.speed) * 0.35, true);
  emitTrail(dt, hSpeed);
  updateCamera(dt, hSpeed);
  $('speedlines').style.opacity = clamp((hSpeed - 7) / 7, 0, 0.85);
}

/* --- botón 🛍️ COMPRAR cerca de tiendas físicas (abre la Tienda GEAYI) --- */
const _shopV = (typeof THREE !== 'undefined') ? new THREE.Vector3() : null;
let _shopPromptState = '';
function updateShopPrompt() {
  const b = (typeof $ === 'function') ? $('btn-shopbuy') : null;
  if (!b) return;
  if (typeof MODE === 'undefined' || MODE !== 'play' || typeof Player === 'undefined' || !Player.pos) {
    if (_shopPromptState !== 'off') { _shopPromptState = 'off'; b.classList.add('hidden'); }
    return;
  }
  let near = null;
  if (typeof SHOP3D !== 'undefined' && SHOP3D.length && _shopV) {
    for (const s of SHOP3D) {
      if (!s || !s.o) continue;
      try { s.o.getWorldPosition(_shopV); } catch (e) { continue; }
      const dx = Player.pos.x - _shopV.x, dz = Player.pos.z - _shopV.z;
      if (dx * dx + dz * dz < 30.25) { near = s; break; } // radio 5.5
    }
  }
  const state = near ? 'shop-' + near.name : 'none';
  try { window.__nearFood = (near && near.food) ? near.name : null; } catch (e) {}
  if (state !== _shopPromptState) {
    _shopPromptState = state;
    if (near) { b.classList.remove('hidden'); b.textContent = (near.food ? '🍔 ' : '🛍️ ') + near.name; }
    else b.classList.add('hidden');
  }
}
/* ================= DEPENDIENTES (personas reales que atienden) ================= */
let _talkPromptState = 'off';
function updateTalkPrompt() { // detecta al dependiente cercano (los botones los maneja updateContextButtons)
  if (typeof MODE === 'undefined' || MODE !== 'play' || typeof Player === 'undefined' || !Player.pos) {
    try { window.__nearKeeper = null; } catch (e) {}
    return;
  }
  let near = null;
  if (typeof SHOPKEEPERS !== 'undefined' && SHOPKEEPERS.length && _shopV) {
    for (const s of SHOPKEEPERS) {
      if (!s || !s.o) continue;
      try { s.o.getWorldPosition(_shopV); } catch (e) { continue; }
      const dx = Player.pos.x - _shopV.x, dz = Player.pos.z - _shopV.z;
      if (dx * dx + dz * dz < 10.24) { near = s; break; } // radio 3.2
    }
  }
  try { window.__nearKeeper = near || null; } catch (e) {}
  const state = near ? 'talk-' + near.name : 'none';
  if (state !== _talkPromptState) {
    _talkPromptState = state;
    if (near) {
      try { toast('🧑‍💼 ' + near.name + ' (' + near.shop + '): ¡Hola! ¿Qué te ofrezco? 😊'); } catch (e) {}
    }
  }
  if (near && near.o) { // el dependiente te mira (como una persona real)
    try {
      near.o.getWorldPosition(_shopV);
      near.o.lookAt(Player.pos.x, _shopV.y, Player.pos.z);
    } catch (e) {}
  }
}

/* --- marcador 3D "SUBIR" sobre el vehículo más cercano (para que se vea en táctil) --- */
let _boardMarker = null;
function boardMarker() {
  if (_boardMarker) return _boardMarker;
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.13, 8, 40),
    new THREE.MeshBasicMaterial({ color: 0xffe95e }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.3;
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1, 4),
    new THREE.MeshBasicMaterial({ color: 0xffe95e }));
  cone.rotation.x = Math.PI; cone.position.y = 2.7;
  const tex = canvasTex(256, 96, (c) => {
    c.fillStyle = 'rgba(8,10,14,0.78)'; c.fillRect(0, 0, 256, 96);
    c.strokeStyle = '#ffe95e'; c.lineWidth = 6; c.strokeRect(5, 5, 246, 86);
    c.fillStyle = '#ffe95e'; c.textAlign = 'center';
    c.font = '900 50px "Trebuchet MS", sans-serif';
    c.fillText('SUBIR', 128, 64);
  });
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  spr.scale.set(3.6, 1.35, 1); spr.position.y = 4.1;
  g.add(ring); g.add(cone); g.add(spr);
  g.visible = false;
  if (typeof scene !== 'undefined' && scene) scene.add(g);
  _boardMarker = g;
  return g;
}
function updateBoardMarker(nb) {
  const m = boardMarker();
  if (!m) return;
  if (nb && nb.def && nb.def.mesh) {
    const p = nb.def.mesh.position;
    m.position.set(p.x, p.y, p.z);
    const s = 1 + Math.sin(performance.now() * 0.006) * 0.12; // pulso
    m.scale.set(s, s, s);
    m.visible = true;
  } else m.visible = false;
}

/* --- botones SUBIR / BAJAR --- */
let _vehPromptState = '';
function updateVehiclePrompt(force) {
  if (typeof MODE === 'undefined' || MODE !== 'play') {
    if (_vehPromptState !== 'off') {
      _vehPromptState = 'off';
      $('btn-board').classList.add('hidden');
      $('btn-exit').classList.add('hidden');
      $('btn-jump').style.display = '';
      if (typeof updateBoardMarker === 'function') updateBoardMarker(null);
    }
    return;
  }
  let state;
  const bb = $('btn-board'), be = $('btn-exit');
  if (Vehicle.mode !== 'none') {
    state = 'exit-' + Vehicle.mode;
    if (typeof updateBoardMarker === 'function') updateBoardMarker(null); // manejando: sin marcador
    if (state !== _vehPromptState || force) {
      _vehPromptState = state;
      bb.classList.add('hidden');
      be.classList.remove('hidden');
      be.textContent = vemoji(Vehicle.mode) + ' ' + T('veh.exit');
      $('btn-jump').style.display = (Vehicle.mode === 'plane' || Vehicle.mode === 'drone' || Vehicle.mode === 'heli') ? '' : 'none'; // SALTAR = turbo en vuelo
    }
  } else {
    const nb = nearestBoardable();
    Vehicle.near = nb;
    if (typeof updateBoardMarker === 'function') updateBoardMarker(nb); // ← marcador 3D sobre el vehículo
    state = nb ? 'board-' + nb.type : 'none';
    if (state !== _vehPromptState || force) {
      _vehPromptState = state;
      be.classList.add('hidden');
      $('btn-jump').style.display = '';
      if (nb) {
        bb.classList.remove('hidden');
        bb.textContent = vemoji(nb.type) + ' ' + T('veh.board');
      } else bb.classList.add('hidden');
    }
  }
}

/* --- reinicio al cambiar de nivel / menú --- */
function resetVehiclesForLevel() {
  if (Vehicle.mode !== 'none') crashVehicle();
  Vehicle.near = null;
  _vehPromptState = '';
  resetBoatRace(); // 🏁 la mini-carrera no sobrevive al cambio de nivel
  Chute.dispose();
  Audio2.engineStop();
  const bb = $('btn-board'), be = $('btn-exit');
  if (bb) bb.classList.add('hidden');
  if (be) be.classList.add('hidden');
  const bj = $('btn-jump');
  if (bj) bj.style.display = '';
}

/* ============ 🅿 ESTACIONAMIENTOS A NIVEL DE SUELO ============
   Ningún vehículo manejable queda sobre bloques altos: todos a nivel de
   calle, en estacionamientos donde se pueden subir y manejar libremente. */
function addParkingLot(lvl, cx, cz, w, d, solid) {
  const g = lvl.group;
  if (solid !== false) addPlatform(lvl, cx, 0.02, cz, w, d, { color: 0x2e3340, emissive: 0x0d1420 }); // losa de asfalto
  const lineM = new THREE.MeshBasicMaterial({ color: 0xf2f2f2 });
  const n = Math.max(2, Math.floor(w / 3.6));
  for (let i = 0; i <= n; i++) { // cajones pintados
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, d * 0.78), lineM);
    line.position.set(cx - w / 2 + (i * w) / n, 0.035, cz);
    g.add(line);
  }
  const tex = canvasTex(128, 128, (c) => { // señal 🅿
    c.fillStyle = '#0a3d8f'; c.fillRect(0, 0, 128, 128);
    c.strokeStyle = '#ffffff'; c.lineWidth = 8; c.strokeRect(6, 6, 116, 116);
    c.fillStyle = '#ffffff'; c.textAlign = 'center';
    c.font = '900 82px "Trebuchet MS", sans-serif';
    c.fillText('P', 64, 96);
  });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 3, 8),
    new THREE.MeshStandardMaterial({ color: 0x8a93a6, roughness: 0.5, metalness: 0.6 }));
  pole.position.set(cx - w / 2 + 0.7, 1.5, cz - d / 2 + 0.7);
  g.add(pole);
  g.add(doubleFaceSign(1.6, 1.6, tex, cx - w / 2 + 0.7, 3.6, cz - d / 2 + 0.7, Math.PI / 4)); // 🅿 legible por ambos lados
}

/* ================= CONTENIDO FASE 2 POR MUNDO ================= */
function addPhase2Content(idx, lvl) {
  const A = (x, y, z, w, d, o) => addPlatform(lvl, x, y, z, w, d, o);
  const padColors = [0xff5533, 0xff9d00, 0x00a2ff, 0x59d867];
  if (idx === 0) { // NEON CITY 🌃 (ciudad real: calles, aceras y tráfico)
    addPlanePad(lvl, 10, 0, 10, padColors[0]); // helipuerto sobre la losa (sin losa extra: evita parpadeo)
    addParkingLot(lvl, 15, -6, 14, 10, false); // 🅿 pintado sobre el suelo de la ciudad
    addCar(lvl, 11, 0, -9, 0xff3d5e, true, -Math.PI / 2, 'sedan');
    addCar(lvl, 14.5, 0, -9, 0x7b2fff, true, -Math.PI / 2, 'sport');
    addCar(lvl, 18, 0, -9, 0xff9d00, true, -Math.PI / 2, 'suv');
    addBike(lvl, -9.5, 0, -9, 0x00e5ff, true, Math.PI / 2); // bici en la franja oeste
    // 🚶 peatones en las aceras (lejos del tráfico de la avenida)
    addNPC(lvl, -5.8, 0.18, 8, -5.8, 8, -5.8, 40);
    addNPC(lvl, 5.8, 0.18, 40, 5.8, 40, 5.8, 8);
    addNPC(lvl, -5.8, 0.18, 50, -5.8, 50, -5.8, 85);
    addNPC(lvl, 5.8, 0.18, 85, 5.8, 85, 5.8, 50);
  } else if (idx === 1) { // VOLCÁN
    A(10, 0, 10, 6, 6); addPlanePad(lvl, 10, 0, 10, padColors[1]);
    addParkingLot(lvl, -15, -8, 14, 10); // 🅿 estacionamiento a nivel de suelo (oeste, libre de la ruta extrema)
    addCar(lvl, 2.2, 0, -2.2, 0xff9d00, true, 0.4, 'suv');
    addBike(lvl, -2.2, 0, 2.2, 0x59d867, true, -0.5);
    addCar(lvl, -12, 0, -8, 0xff3d5e, true, 0, 'sedan');
    addCar(lvl, -18, 0, -8, 0x7b2fff, true, 0, 'sport');
    addNPC(lvl, -2.5, 0, 1.5, -2.5, 1.5, 2.5, 1.5);
    addNPC(lvl, 2.5, 0, -1.5, 2.5, -1.5, -2.5, -1.5);
  } else if (idx === 2) { // DULCE HIELO
    A(10, 0, 10, 6, 6); addPlanePad(lvl, 10, 0, 10, padColors[2]);
    addParkingLot(lvl, -15, -8, 14, 10); // 🅿 estacionamiento a nivel de suelo (oeste, libre de la ruta extrema)
    addCar(lvl, 2.2, 0, -2.2, 0x00a2ff, true, 0.4, 'sedan');
    addBike(lvl, -2.2, 0, 2.2, 0xff2fd6, true, -0.5);
    addCar(lvl, -12, 0, -8, 0xffffff, true, 0, 'suv');
    addCar(lvl, -18, 0, -8, 0xff3d5e, true, 0, 'sport');
    addNPC(lvl, -2.5, 0, 1.5, -2.5, 1.5, 2.5, 1.5);
    addNPC(lvl, 2.5, 0, -1.5, 2.5, -1.5, -2.5, -1.5);
  } else if (idx === 3) { // IMMOKALEE 🌴
    A(10, 0, 10, 6, 6); addPlanePad(lvl, 10, 0, 10, padColors[3]);
    A(-10, 0, 110, 6, 6); addPlanePad(lvl, -10, 0, 110, 0xffd23f);
    // carros y bicis manejables — TODOS a nivel de suelo
    addParkingLot(lvl, -15, -8, 14, 10); // 🅿 al oeste (el aeropuerto está al este)
    addCar(lvl, 2.2, 0, -2.2, 0xff3d5e, true, 0.4, 'sport');
    addBike(lvl, -2.2, 0, 2.2, 0x00e5ff, true, -0.5);
    addCar(lvl, -18, 0, -8, 0x00a2ff, true, 0, 'sedan');
    addBike(lvl, -12, 0, -8, 0x59d867, true, 0.3); // 🅿 (antes sobre un bloque a y=2.4)
    addCar(lvl, -15, 0, -5.5, 0xffd23f, true, 0, 'suv');
    // parque de diversión con pista de bicis (después de la meta)
    A(0, 0.5, 128, 20, 14);
    const track = new THREE.Mesh(new THREE.TorusGeometry(5.2, 0.55, 8, 36),
      new THREE.MeshStandardMaterial({ color: 0xb08968, roughness: 1 }));
    track.rotation.x = Math.PI / 2;
    track.position.set(0, 0.62, 128);
    lvl.group.add(track);
    const coneM = new THREE.MeshStandardMaterial({ color: 0xff6a00, roughness: 0.7 });
    [[5.2, 128], [-5.2, 128], [0, 122.8], [0, 133.2]].forEach(([cx, cz]) => {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1, 10), coneM);
      cone.position.set(cx, 1.1, cz);
      lvl.group.add(cone);
    });
    for (let i = 0; i < 8; i++) { // monedas en la pista
      const a = (i / 8) * TAU;
      addCoin(lvl, Math.cos(a) * 5.2, 1.8, 128 + Math.sin(a) * 5.2);
    }
    addCar(lvl, -6, 0.5, 128, 0x7b2fff, true, 1.2);
    addBike(lvl, 6, 0.5, 128, 0xff2fd6, true, -1.2);
    // carros estacionados (decoración) a lo largo de MAIN ST
    addCar(lvl, -28, 0, 49.5, 0xd32f2f, false, 0.15);
    addCar(lvl, 8, 0, 49.5, 0x1976d2, false, -0.1);
    addCar(lvl, 36, 0, 49.5, 0xffb300, false, 0.2);
    addCar(lvl, -8, 0, 60.5, 0x388e3c, false, -0.15);
    addCar(lvl, 24, 0, 60.5, 0xf5f0e6, false, 1.4);
    // bicis decorativas junto a las tiendas de MAIN ST
    addBike(lvl, 12, 0, 50, 0xff7043, false, 0.5);
    addBike(lvl, -12, 0, 60, 0x00a2ff, false, -0.4);
    addBike(lvl, 52, 0, 50, 0x59d867, false, 0.9);
    // 🚶 8 peatones en las banquetas de la avenida (9TH ST)
    const gy = 0.18;
    addNPC(lvl, 6.5, gy, 15, 6.5, 15, 6.5, 100);
    addNPC(lvl, 6.5, gy, 100, 6.5, 100, 6.5, 15);
    addNPC(lvl, 6.5, gy, 40, 6.5, 40, 6.5, 90);
    addNPC(lvl, 6.5, gy, 70, 6.5, 70, 6.5, 20);
    addNPC(lvl, -6.5, gy, 20, -6.5, 20, -6.5, 105);
    addNPC(lvl, -6.5, gy, 105, -6.5, 105, -6.5, 20);
    addNPC(lvl, -6.5, gy, 50, -6.5, 50, -6.5, 95);
    addNPC(lvl, -6.5, gy, 80, -6.5, 80, -6.5, 30);
    addJuanNPC(lvl, -16, 0, 48, 0); // 👨‍🍳 Juan, dueño de Los Hermanos Tamps, frente a su traila en MAIN ST
    // 🚤 mini-carreras de lanchas rápidas en el Lago Trafford (usa el sistema de botes existente)
    addBoatRaceCourse(lvl);
  } else if (idx === 4) { // HONDURAS 🇭🇳
    A(-10, 0, 10, 6, 6); addPlanePad(lvl, -10, 0, 10, 0x0073ce);
    addParkingLot(lvl, -15, -8, 14, 10); // 🅿 a nivel de suelo (oeste)
    addCar(lvl, 2.2, 0, -2.2, 0x0073ce, true, 0.4);
    addBike(lvl, -2.2, 0, 2.2, 0xffffff, true, -0.5);
    addCar(lvl, -15, 0, -8, 0xd4a017, true, 0); // 🅿
    addCar(lvl, 8, 0, -6, 0xd4a017, false, 0.2);
    addNPC(lvl, -2.5, 0, 1.5, -2.5, 1.5, 2.5, 1.5);
    addNPC(lvl, 2.5, 0, -1.5, 2.5, -1.5, -2.5, -1.5);
  } else if (idx === 5) { // MÉXICO 🇲🇽
    A(-10, 0, 10, 6, 6); addPlanePad(lvl, -10, 0, 10, 0x006847);
    addParkingLot(lvl, -15, -8, 14, 10); // 🅿 a nivel de suelo (oeste)
    addCar(lvl, 2.2, 0, -2.2, 0x006847, true, 0.4);
    addBike(lvl, -2.2, 0, 2.2, 0xce1126, true, -0.5);
    addCar(lvl, -15, 0, -8, 0xce1126, true, 0); // 🅿
    addCar(lvl, -8, 0, -6, 0xce1126, false, -0.2);
    addNPC(lvl, -2.5, 0, 1.5, -2.5, 1.5, 2.5, 1.5);
    addNPC(lvl, 2.5, 0, -1.5, 2.5, -1.5, -2.5, -1.5);
  } else if (idx === 6) { // USA 🇺🇸
    A(-10, 0, 10, 6, 6); addPlanePad(lvl, -10, 0, 10, 0xb31942);
    addParkingLot(lvl, -15, -8, 14, 10); // 🅿 a nivel de suelo (oeste)
    addCar(lvl, 2.2, 0, -2.2, 0xb31942, true, 0.4);
    addBike(lvl, -2.2, 0, 2.2, 0x0a3161, true, -0.5);
    addCar(lvl, -15, 0, -8, 0x0a3161, true, 0); // 🅿
    addCar(lvl, 8, 0, -6, 0x0a3161, false, 0.2);
    addNPC(lvl, -2.5, 0, 1.5, -2.5, 1.5, 2.5, 1.5);
    addNPC(lvl, 2.5, 0, -1.5, 2.5, -1.5, -2.5, -1.5);
  } else if (idx === 7) { // ESPAÑA 🇪🇸
    A(-10, 0, 10, 6, 6); addPlanePad(lvl, -10, 0, 10, 0xc60b1e);
    addParkingLot(lvl, -15, -8, 14, 10); // 🅿 a nivel de suelo (oeste)
    addCar(lvl, 2.2, 0, -2.2, 0xc60b1e, true, 0.4);
    addBike(lvl, -2.2, 0, 2.2, 0xffc400, true, -0.5);
    addCar(lvl, -15, 0, -8, 0xffc400, true, 0); // 🅿
    addCar(lvl, -8, 0, -6, 0xffc400, false, -0.2);
    addNPC(lvl, -2.5, 0, 1.5, -2.5, 1.5, 2.5, 1.5);
    addNPC(lvl, 2.5, 0, -1.5, 2.5, -1.5, -2.5, -1.5);
  } else if (idx === 8) { // MONTAÑA NEVADA ❄️
    A(-10, 0, 10, 6, 6); addPlanePad(lvl, -10, 0, 10, 0x9fd8ff);
    addParkingLot(lvl, -15, -8, 14, 10); // 🅿 a nivel de suelo (oeste)
    addCar(lvl, 2.2, 0, -2.2, 0x9fd8ff, true, 0.4);
    addBike(lvl, -2.2, 0, 2.2, 0xffffff, true, -0.5);
    addCar(lvl, -15, 0, -8, 0xd32f2f, true, 0); // 🅿
    addCar(lvl, 8, 0, -6, 0xd32f2f, false, 0.2);
    addNPC(lvl, -2.5, 0, 1.5, -2.5, 1.5, 2.5, 1.5);
    addNPC(lvl, 2.5, 0, -1.5, 2.5, -1.5, -2.5, -1.5);
  }
}
