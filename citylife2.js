/* citylife2.js — 🏙️ VIDA DE CIUDAD · TANDA 2 (GEAYI — Obby Xtreme 3D)
   Módulo global CityLife2 con init() / onLevelStart(idx) / onLevelEnd() / update(dt).
   100% ORIGINAL (diseños y nombres propios), mundos a nivel del suelo,
   geometría simple con cachés compartidas (Android).
   Activo en idx 3 (Immokalee) e idx 0 (Ciudad Neón).
   Sistemas (aislados en sus funciones):
     a) 🏠 Casas comprables/rentables: 4 casas con letrero "SE VENDE"
        ($500–1500); rentar a NPC da $10/min de juego (timestamp en SAVE)
     b) 🚚🚕 Trabajos: repartidor (recoge en A → waypoint B con flecha guía)
        y taxista (recoge pasajero NPC → destino; tarifa por distancia)
     c) 🚤 Tour en airboat por Lago Trafford (solo Immokalee): bote abordable
        en el muelle, 4 paradas con datos curiosos; $20 o gratis
     d) 🎡 Feria GEAYI periódica: banner + noria giratoria + puestos con premios;
        mini-juego "atrapa el aro" (3 intentos)
     e) ⛪ Iglesia y 🏥 hospital visitables: puerta con trigger → interior simple;
        hospital con botón "💚 Curar"
     j) 👨‍⚕️ Hospital interactivo: turno de doctor con pacientes NPC (🤒🤕🤧),
        minijuego diagnosticar→tratar (+10/+15 🪙), reputación ⭐ (SAVE.doctorRep)
        y rescates en la ambulancia abordable de citylife1.js (+25 🪙)
     f) 📻 Radio en carros: 3 estaciones de melodías originales (WebAudio,
        volumen bajo, mute)
     g) ⛈️ Tormentas con rayos: ~45 s, cielo oscuro, relámpagos + truenos,
        lluvia intensa
     h) 🌀 Huracanes raros: sirena + banner, viento que empuja, lluvia muy
        intensa, sacudida leve de cámara; ~60 s y luego calma
     i) 🕹️ Arcade: local con 3 maquinitas; memoria ($5, premios)

   Integración (NO modifica archivos existentes; el orquestador aplica los hooks):
     - index.html: <script src="citylife2.js"></script> ANTES de game.js (tras jobs.js)
     - game.js boot():        if (typeof CityLife2 !== 'undefined') CityLife2.init();
     - game.js startLevel(i):  CityLife2.onLevelStart(i);
     - game.js loop (MODE==='play'): if (typeof updateCityLife2 === 'function') updateCityLife2(dt);
     - game.js toMenu():       CityLife2.onLevelEnd();
*/
'use strict';

/* ============================== i18n ============================== */
try {
  if (typeof addStrings === 'function') {
    addStrings('es', {
      'c2.house': '🏠 CASA', 'c2.forSale': 'SE VENDE', 'c2.myHouse': 'MI CASA',
      'c2.buy': 'COMPRAR', 'c2.rent': '🤝 Rentar a NPC', 'c2.rented': 'Rented: SÍ', 'c2.notRented': 'Renta: no',
      'c2.income': '💰 Renta: $10/min', 'c2.collect': '💰 RECOGER RENTA', 'c2.noMoney': '💸 Te faltan monedas',
      'c2.bought': '🏠 ¡Casa comprada!', 'c2.rentOn': '🤝 NPC rentando: +$10/min', 'c2.rentOff': '🤝 Renta detenida',
      'c2.rentPaid': '🏠 Renta +', 'c2.close': '✕ Cerrar',
      'c2.jobs': '💼 TRABAJOS', 'c2.delivery': '🚚 Repartidor', 'c2.taxi': '🚕 Taxista',
      'c2.dDelivery': 'Recoge el 📦 en el depósito y llévalo al destino. ¡Sigue la flecha!',
      'c2.dTaxi': 'Recoge al pasajero 🧍 y llévalo a su destino. Tarifa por distancia.',
      'c2.start': 'EMPEZAR', 'c2.pickup': '📦 RECOGER', 'c2.deliver': '📬 ENTREGAR',
      'c2.pickupPax': '🧍 RECOGER', 'c2.dropoff': '🏁 LLEGAMOS',
      'c2.pkgTaken': '📦 ¡Paquete recogido! Sigue la flecha amarilla ➡️',
      'c2.delivered': '📬 ¡Entregado!', 'c2.paxIn': '🧍 ¡Pasajero a bordo! Sigue la flecha ➡️',
      'c2.fare': '🚕 Tarifa', 'c2.onFoot': '⬇️ Hazlo a pie',
      'c2.tour': '🚤 TOUR LAGO TRAFFORD', 'c2.tourD': '4 paradas con datos curiosos del lago 🐊',
      'c2.tourFree': '🆓 TOUR GRATIS', 'c2.tourPaid': '🎁 TOUR $20 (recuerdo +$40)',
      'c2.tourStart': '🚤 ¡Tour iniciado! Sigue la flecha ➡️', 'c2.tourEnd': '🚤 ¡Tour completo! Gracias por visitar 🐊',
      'c2.souvenir': '🎁 Recuerdo del tour +$40',
      'c2.fair': '🎡 ¡FERIA GEAYI!', 'c2.fairSub': 'Noria, puestos y premios 🎯',
      'c2.ring': '🎯 ATRAPA EL ARO', 'c2.throw': '🎯 LANZAR ARO', 'c2.ringWin': '🎯 ¡Premio!',
      'c2.board': 'SUBIR', 'c2.exit': '⬇️ BAJAR',
      'c2.carousel': '🐴 CARRUSEL', 'c2.swings': '🎠 SILLAS VOLADORAS',
      'c2.cans': '🥫 TUMBA-LATAS', 'c2.darts': '🎈 GLOBOS',
      'c2.throwCan': '🥎 LANZAR PELOTA', 'c2.throwDart': '🎈 LANZAR DARDO',
      'c2.cansLeft': 'Latas en pie', 'c2.dartsLeft': 'Globos',
      'c2.fullHit': '🥫 ¡Todas abajo! Premio', 'c2.fullPop': '🎈 ¡Todos reventados! Premio',
      'c2.prize': '🎁 ¡Premio!', 'c2.stallOnce': '🎁 Ya reclamaste este premio',
      'c2.church': '⛪ IGLESIA', 'c2.hospital': '🏥 HOSPITAL', 'c2.entered': '¡Bienvenido!',
      'c2.heal': '💚 CURAR ($10)', 'c2.healed': '💚 ¡Curado! Te sientes como nuevo ✨',
      'c2.radio': '📻 RADIO', 'c2.mute': '🔇 Silenciar', 'c2.unmute': '🔊 Sonar', 'c2.stop': '⏹️ Apagar',
      'c2.st1': '🌵 Cumbia Geayi', 'c2.st2': '🎸 Rock Geayi', 'c2.st3': '🌊 Chill Geayi',
      'c2.storm': '⛈️ ¡Tormenta!', 'c2.hurr': '🌀 ¡HURACÁN!', 'c2.hurrSub': '¡Refúgiate! Viento fuerte 💨',
      'c2.calm': '☀️ ¡Pasó el huracán! Todo en calma',
      'c2.arcade': '🕹️ ARCADIA GEAYI', 'c2.play': '🕹️ JUGAR ($5)', 'c2.memWin': '🧠 ¡Memoria completa! Premio +$20',
      'c2.memTitle': '🧠 MEMORIA ($5)', 'c2.cardBack': '❓',
      'c2.docWork': '👨‍⚕️ TRABAJAR', 'c2.docEnd': '⏹️ TERMINAR TURNO',
      'c2.docStart': '👨‍⚕️ ¡Turno iniciado! Atiende a los pacientes',
      'c2.docEndT': '⏹️ Turno terminado. ¡Buen trabajo!',
      'c2.docChip': '👨‍⚕️ Turno', 'c2.rep': '⭐ Reputación',
      'c2.patient': '🧍 PACIENTE', 'c2.attend': '🧍 ATENDER',
      'c2.diagQ': 'Observa el síntoma. ¿Qué herramienta usas para diagnosticar?',
      'c2.toolThermo': '🌡️ Termómetro', 'c2.toolBandage': '🩹 Venda', 'c2.toolMed': '💊 Medicina',
      'c2.diagOk': '✅ ¡Diagnóstico correcto! +10 🪙',
      'c2.diagNo': '❌ No es eso… observa bien el síntoma',
      'c2.treat': '💉 APLICAR TRATAMIENTO', 'c2.needDiag': '🔍 Primero diagnostica al paciente',
      'c2.cured': '😊 ¡Paciente curado! +15 🪙', 'c2.tip': '💰 Propina +',
      'c2.angry': '😠 Un paciente se fue molesto…',
      'c2.symptomFever': '🤒 Tiene la cara roja y caliente: fiebre',
      'c2.symptomWound': '🤕 Tiene una herida: necesita venda',
      'c2.symptomCough': '🤧 Tose sin parar: necesita medicina',
      'c2.rescue': '🚑 ¡Emergencia! Sube a la ambulancia y ve al 📍',
    });
    addStrings('en', {
      'c2.house': '🏠 HOUSE', 'c2.forSale': 'FOR SALE', 'c2.myHouse': 'MY HOUSE',
      'c2.buy': 'BUY', 'c2.rent': '🤝 Rent to NPC', 'c2.rented': 'Rented: YES', 'c2.notRented': 'Rent: no',
      'c2.income': '💰 Rent: $10/min', 'c2.collect': '💰 COLLECT RENT', 'c2.noMoney': '💸 Not enough coins',
      'c2.bought': '🏠 House bought!', 'c2.rentOn': '🤝 NPC renting: +$10/min', 'c2.rentOff': '🤝 Rent stopped',
      'c2.rentPaid': '🏠 Rent +', 'c2.close': '✕ Close',
      'c2.jobs': '💼 JOBS', 'c2.delivery': '🚚 Courier', 'c2.taxi': '🚕 Taxi driver',
      'c2.dDelivery': 'Pick up the 📦 at the depot and deliver it. Follow the arrow!',
      'c2.dTaxi': 'Pick up the 🧍 passenger and drive them over. Fare by distance.',
      'c2.start': 'START', 'c2.pickup': '📦 PICK UP', 'c2.deliver': '📬 DELIVER',
      'c2.pickupPax': '🧍 PICK UP', 'c2.dropoff': '🏁 ARRIVED',
      'c2.pkgTaken': '📦 Package taken! Follow the yellow arrow ➡️',
      'c2.delivered': '📬 Delivered!', 'c2.paxIn': '🧍 Passenger aboard! Follow the arrow ➡️',
      'c2.fare': '🚕 Fare', 'c2.onFoot': '⬇️ Do it on foot',
      'c2.tour': '🚤 TRAFFORD LAKE TOUR', 'c2.tourD': '4 stops with fun lake facts 🐊',
      'c2.tourFree': '🆓 FREE TOUR', 'c2.tourPaid': '🎁 $20 TOUR (souvenir +$40)',
      'c2.tourStart': '🚤 Tour started! Follow the arrow ➡️', 'c2.tourEnd': '🚤 Tour complete! Thanks for visiting 🐊',
      'c2.souvenir': '🎁 Tour souvenir +$40',
      'c2.fair': '🎡 GEAYI FAIR!', 'c2.fairSub': 'Ferris wheel, stalls and prizes 🎯',
      'c2.ring': '🎯 RING TOSS', 'c2.throw': '🎯 THROW RING', 'c2.ringWin': '🎯 Prize!',
      'c2.board': 'RIDE', 'c2.exit': '⬇️ GET OFF',
      'c2.carousel': '🐴 CAROUSEL', 'c2.swings': '🎠 FLYING CHAIRS',
      'c2.cans': '🥫 CAN KNOCKDOWN', 'c2.darts': '🎈 BALLOONS',
      'c2.throwCan': '🥎 THROW BALL', 'c2.throwDart': '🎈 THROW DART',
      'c2.cansLeft': 'Cans standing', 'c2.dartsLeft': 'Balloons',
      'c2.fullHit': '🥫 All down! Prize', 'c2.fullPop': '🎈 All popped! Prize',
      'c2.prize': '🎁 Prize!', 'c2.stallOnce': '🎁 Prize already claimed',
      'c2.church': '⛪ CHURCH', 'c2.hospital': '🏥 HOSPITAL', 'c2.entered': 'Welcome!',
      'c2.heal': '💚 HEAL ($10)', 'c2.healed': '💚 Healed! You feel brand new ✨',
      'c2.radio': '📻 RADIO', 'c2.mute': '🔇 Mute', 'c2.unmute': '🔊 Unmute', 'c2.stop': '⏹️ Off',
      'c2.st1': '🌵 Geayi Cumbia', 'c2.st2': '🎸 Geayi Rock', 'c2.st3': '🌊 Geayi Chill',
      'c2.storm': '⛈️ Storm!', 'c2.hurr': '🌀 HURRICANE!', 'c2.hurrSub': 'Take cover! Strong wind 💨',
      'c2.calm': '☀️ Hurricane passed! All calm',
      'c2.arcade': '🕹️ GEAYI ARCADE', 'c2.play': '🕹️ PLAY ($5)', 'c2.memWin': '🧠 Memory complete! Prize +$20',
      'c2.memTitle': '🧠 MEMORY ($5)', 'c2.cardBack': '❓',
      'c2.docWork': '👨‍⚕️ WORK', 'c2.docEnd': '⏹️ END SHIFT',
      'c2.docStart': '👨‍⚕️ Shift started! Treat the patients',
      'c2.docEndT': '⏹️ Shift over. Good job!',
      'c2.docChip': '👨‍⚕️ Shift', 'c2.rep': '⭐ Reputation',
      'c2.patient': '🧍 PATIENT', 'c2.attend': '🧍 TREAT',
      'c2.diagQ': 'Look at the symptom. Which tool do you use to diagnose?',
      'c2.toolThermo': '🌡️ Thermometer', 'c2.toolBandage': '🩹 Bandage', 'c2.toolMed': '💊 Medicine',
      'c2.diagOk': '✅ Correct diagnosis! +10 🪙',
      'c2.diagNo': '❌ Not that… look at the symptom',
      'c2.treat': '💉 APPLY TREATMENT', 'c2.needDiag': '🔍 Diagnose the patient first',
      'c2.cured': '😊 Patient cured! +15 🪙', 'c2.tip': '💰 Tip +',
      'c2.angry': '😠 A patient left upset…',
      'c2.symptomFever': '🤒 Red hot face: fever',
      'c2.symptomWound': '🤕 Has a wound: needs a bandage',
      'c2.symptomCough': '🤧 Keeps coughing: needs medicine',
      'c2.rescue': '🚑 Emergency! Board the ambulance and go to the 📍',
    });
  }
} catch (e) {}

/* ============================== SAVE ============================== */
try {
  SAVE.cl2 = SAVE.cl2 || {};
  SAVE.cl2.houses = SAVE.cl2.houses || {};       // id -> {owned, rented}
  SAVE.cl2.radio = Object.assign({ st: -1, muted: false }, SAVE.cl2.radio || {});
  SAVE.cl2.playSec = SAVE.cl2.playSec || 0;      // segundos jugados (acumula renta)
  SAVE.cl2.lastPaySec = SAVE.cl2.lastPaySec || 0;
  SAVE.cl2.lastPayTs = SAVE.cl2.lastPayTs || 0;  // timestamp del último pago
} catch (e) {}
/* reputación de doctor (0..100): persiste en SAVE */
function _c2docRepGet() {
  try {
    if (typeof SAVE.doctorRep !== 'number' || isNaN(SAVE.doctorRep)) SAVE.doctorRep = 0;
    SAVE.doctorRep = Math.max(0, Math.min(100, Math.round(SAVE.doctorRep)));
    return SAVE.doctorRep;
  } catch (e) { return 0; }
}
function _c2docRepAdd(n) {
  try {
    const v = Math.max(0, Math.min(100, _c2docRepGet() + n));
    SAVE.doctorRep = v;
    try { if (typeof persist === 'function') persist(); } catch (e) {}
    return v;
  } catch (e) { return 0; }
}

/* ============================== posiciones por mundo ============================== */
const C2_WORLDS = [0, 3]; // Ciudad Neón y Immokalee
const C2_SPOTS = {
  3: { // Immokalee: barrio GEAYI al noroeste (pasto abierto)
    houses: [[-120, -60], [-105, -60], [-90, -60], [-75, -60]],
    church: [-125, -92], churchIn: [-170, -92],
    hospital: [-85, -92], hospitalIn: [-170, -58],
    fair: [-105, -122], arcade: [-52, -75],
    depot: [-105, -35], taxi: [-70, -42],
    dock: [-58, 28], boat: [-66, 24],
    tourStops: [[-70, 10], [-86, 14], [-90, 26], [-70, 32]],
  },
  0: { // Ciudad Neón: barrio GEAYI en zona libre verificada (sin rascacielos)
    houses: [[-72, -138], [-57, -138], [-42, -138], [-27, -138]],
    church: [-72, -122], churchIn: [-72, -106],
    hospital: [-52, -122], hospitalIn: [-48, -106],
    fair: [60, -124], arcade: [-28, -122],
    depot: [-22, -108], taxi: [-18, -112],
    dock: null, boat: null, tourStops: [],
  },
};
const C2_HOUSE_DEFS = [
  { price: 500, color: 0xffd54f, roof: 0xc23b2e },
  { price: 800, color: 0x7ec8f7, roof: 0x2e5fc2 },
  { price: 1100, color: 0x9fe6b8, roof: 0x1e7a4c },
  { price: 1500, color: 0xff9ebf, roof: 0x8e2a5c },
];
const C2_TOUR_FACTS = [
  ['🐊 Parada 1 · Los lagartos', 'Los lagartos del lago toman el sol en la orilla este. ¡Míralos de lejitos!'],
  ['🎣 Parada 2 · Pesca famosa', 'Aquí se pescan lobinas gigantes. ¡El récord es de 5 kilos!'],
  ['🌅 Parada 3 · Atardecer', 'Al atardecer el lago se pinta de color caramelo. ¡Foto obligada! 📸'],
  ['🚤 Parada 4 · Airboats', 'Los airboats flotan con solo 15 cm de agua gracias a su abanico gigante.'],
];

/* ============================== estado ============================== */
const CL2 = {
  idx: -1, group: null, ui: false,
  act: null, actFn: null,            // botón de acción contextual {label, fn}
  panel: null, chip: null, btn: null, radioBtn: null, healBtn: null, docBtn: null,
  hospDoor: null,                   // {x, z} puerta exterior del hospital (para rescates)
  doc: null,                        // {shift, patients:[], spawnT, rescueCd} — trabajo de doctor
  stormOv: null, flashOv: null,
  houses: [], doors: [], wp: null,   // wp: flecha guía {x,z,mesh}
  del: { stage: 'idle', a: null, b: null },   // idle | goA | goB
  taxi: { stage: 'idle', dest: null, pax: null }, // idle | wait | ride
  tour: null,                        // {stop, paid}
  fair: { active: false, t: 0, next: 200, group: null, wheel: null, prizeTaken: false,
          cabins: [], boardSpot: null, ride: null, car: null, swings: null, cans: null, darts: null },
  ring: { active: false, att: 0, hits: 0 },
  inside: null, tpCd: 0,             // 'church' | 'hospital' | null
  storm: { active: false, t: 0, next: 80, bolt: 3 },
  hurr: { active: false, t: 0, next: 340 },
  rain: null,                        // sistema de lluvia propio
  radio: { st: -1, timer: null, step: 0, muted: false },
  siren: null,
  mem: null,                         // juego de memoria
  renters: [],                       // NPCs de casas rentadas
};

/* ============================== ayudantes ============================== */
function _c2T(k) { try { return T(k); } catch (e) { return k; } }
function _c2inCity() { try { return CL2.idx === 0 || CL2.idx === 3; } catch (e) { return false; } }
function _c2d2(ax, az, bx, bz) { const dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; }
function _c2toast(m) { try { if (typeof toast === 'function') toast(m); } catch (e) {} }
function _c2banner(a, b, ms) { try { if (typeof showBanner === 'function') showBanner(a, b, ms); } catch (e) { _c2toast(a); } }
function _c2earn(n) {
  try {
    SAVE.coins = Math.max(0, (SAVE.coins || 0) + n); persist();
    const h = (typeof $ === 'function') ? $('hud-coins') : null; if (h) h.textContent = SAVE.coins;
  } catch (e) {}
}
function _c2coin() { try { if (typeof Audio2 !== 'undefined' && Audio2.coin) Audio2.coin(); } catch (e) {} }
function _c2click() { try { if (typeof Audio2 !== 'undefined' && Audio2.click) Audio2.click(); } catch (e) {} }
function _c2burst(x, y, z, colors, n, power) {
  try { if (typeof Particles !== 'undefined' && Particles.burst) Particles.burst(x, y, z, colors, n, power); } catch (e) {}
}
function _c2onFoot() {
  if (typeof MODE !== 'undefined' && MODE !== 'play') return false;
  if (typeof Vehicle !== 'undefined' && Vehicle.mode !== 'none') return false;
  return true;
}
function _c2playerPos() {
  try {
    if (typeof Player !== 'undefined' && Player && Player.pos) return Player.pos;
  } catch (e) {}
  return null;
}

/* ---- caché de geometrías y materiales (Android: menos programas GPU) ---- */
const _c2geoCache = {}, _c2matCache = {};
function _c2geo(key, make) {
  let g = _c2geoCache[key];
  if (!g) { g = make(); _c2geoCache[key] = g; }
  return g;
}
function _c2mat(color, emissive, ei) {
  const key = color + '|' + (emissive || 0) + '|' + (ei || 0);
  let m = _c2matCache[key];
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color: color, roughness: 0.8, metalness: 0.05,
      emissive: emissive || 0x000000, emissiveIntensity: ei || 0,
    });
    _c2matCache[key] = m;
  }
  return m;
}
function _c2box(parent, w, h, d, color, x, y, z, ry, emissive, ei) {
  const m = new THREE.Mesh(_c2geo('b' + w + 'x' + h + 'x' + d, () => new THREE.BoxGeometry(w, h, d)),
    _c2mat(color, emissive, ei));
  m.position.set(x, y, z);
  if (ry) m.rotation.y = ry;
  parent.add(m);
  return m;
}
function _c2cyl(parent, r1, r2, h, color, x, y, z, seg) {
  const m = new THREE.Mesh(_c2geo('c' + r1 + 'x' + r2 + 'x' + h, () => new THREE.CylinderGeometry(r1, r2, h, seg || 10)),
    _c2mat(color));
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}
function _c2signTex(lines, bg, fg) {
  try {
    return canvasTex(512, 256, function (g, w, h) {
      g.fillStyle = bg; g.fillRect(0, 0, w, h);
      g.strokeStyle = fg; g.lineWidth = 10; g.strokeRect(10, 10, w - 20, h - 20);
      g.textAlign = 'center'; g.fillStyle = fg;
      const n = lines.length;
      lines.forEach(function (ln, i) {
        g.font = '900 ' + (n > 1 && i === 0 ? 64 : 72) + 'px "Trebuchet MS", sans-serif';
        g.fillText(ln, w / 2, h / 2 - (n - 1) * 44 + i * 88 + 24);
      });
    });
  } catch (e) { return null; }
}
function _c2postSign(parent, tex, x, z, w, h, ry) {
  try {
    _c2cyl(parent, 0.12, 0.14, h + 1.6, 0x6b4a2a, x, (h + 1.6) / 2, z);
    const s = doubleFaceSign(w, h, tex, x, h + 0.9, z, ry || 0);
    parent.add(s);
    return s;
  } catch (e) { return null; }
}
/* persona NPC simple (diseño propio: cilindro + esfera) */
function _c2person(shirt) {
  const g = new THREE.Group();
  _c2cyl(g, 0.32, 0.38, 1.1, shirt, 0, 0.85, 0);
  const head = new THREE.Mesh(_c2geo('hd', () => new THREE.SphereGeometry(0.3, 10, 10)), _c2mat(0xf2c89b));
  head.position.y = 1.68; g.add(head);
  _c2cyl(g, 0.34, 0.34, 0.14, 0x2b2f3a, 0, 1.92, 0); // gorra
  return g;
}

/* ============================== UI (solo en init) ============================== */
function _c2css() {
  if (document.getElementById('c2-css')) return;
  const st = document.createElement('style');
  st.id = 'c2-css';
  st.textContent =
    '#cl2-act{position:fixed;right:14px;bottom:322px;z-index:40;display:none;font-size:19px;font-weight:900;' +
    'padding:14px 20px;border-radius:999px;border:4px solid #fff;background:linear-gradient(180deg,#ffb300,#ff6f00);' +
    'color:#fff;box-shadow:0 4px 14px rgba(0,0,0,.45);font-family:inherit}' +
    '#cl2-chip{position:fixed;top:98px;right:10px;z-index:16;display:none;font-size:15px;font-weight:800;' +
    'background:rgba(20,10,40,.65);color:#fff;padding:6px 12px;border-radius:999px;' +
    'border:2px solid rgba(255,255,255,.7);font-family:inherit}' +
    '#cl2-radio{position:fixed;left:14px;bottom:252px;z-index:40;display:none;font-size:24px;font-weight:900;' +
    'padding:12px 16px;border-radius:999px;border:4px solid #fff;background:linear-gradient(180deg,#00c2a8,#007a68);' +
    'color:#fff;box-shadow:0 4px 14px rgba(0,0,0,.45);font-family:inherit}' +
    '#cl2-heal{position:fixed;left:50%;transform:translateX(-50%);bottom:180px;z-index:40;display:none;' +
    'font-size:20px;font-weight:900;padding:14px 26px;border-radius:999px;border:4px solid #fff;' +
    'background:linear-gradient(180deg,#59ff7a,#1e9e4a);color:#062a12;box-shadow:0 4px 14px rgba(0,0,0,.45);font-family:inherit}' +
    '#cl2-doc{position:fixed;left:50%;transform:translateX(-50%);bottom:252px;z-index:40;display:none;' +
    'font-size:20px;font-weight:900;padding:14px 26px;border-radius:999px;border:4px solid #fff;' +
    'background:linear-gradient(180deg,#4db8ff,#1e5f9e);color:#fff;box-shadow:0 4px 14px rgba(0,0,0,.45);font-family:inherit}' +
    '#cl2-storm{position:fixed;inset:0;z-index:25;display:none;pointer-events:none;background:rgba(8,12,38,.5);transition:background .4s}' +
    '#cl2-flash{position:fixed;inset:0;z-index:26;display:none;pointer-events:none;background:#fff;opacity:0}' +
    '.c2-row{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin:8px 0}' +
    '.c2-card{background:rgba(255,255,255,.07);border:2px solid rgba(255,255,255,.2);border-radius:14px;padding:10px;margin:8px 0}' +
    '.c2-mem{display:grid;grid-template-columns:repeat(3,64px);gap:10px;justify-content:center;margin:10px 0}' +
    '.c2-mem button{width:64px;height:64px;font-size:30px;border-radius:14px;border:3px solid #fff;background:#2a2350;color:#fff}';
  document.head.appendChild(st);
}
function _c2ensureUI() {
  if (CL2.ui) return;
  CL2.ui = true;
  try {
    _c2css();
    const mk = (id, txt, fn) => {
      const b = document.createElement('button');
      b.id = id; b.textContent = txt;
      b.addEventListener('click', fn);
      document.body.appendChild(b);
      return b;
    };
    CL2.btn = mk('cl2-act', '', () => _c2doAct());
    const chip = document.createElement('div'); chip.id = 'cl2-chip'; document.body.appendChild(chip); CL2.chip = chip;
    CL2.radioBtn = mk('cl2-radio', '📻', () => _c2radioPanel());
    CL2.healBtn = mk('cl2-heal', '', () => _c2heal());
    CL2.docBtn = mk('cl2-doc', '', () => _c2docToggle());
    const so = document.createElement('div'); so.id = 'cl2-storm'; document.body.appendChild(so); CL2.stormOv = so;
    const fo = document.createElement('div'); fo.id = 'cl2-flash'; document.body.appendChild(fo); CL2.flashOv = fo;
    const p = document.createElement('div');
    p.id = 'cl2-panel'; p.className = 'screen overlay hidden';
    document.body.appendChild(p); CL2.panel = p;
  } catch (e) {}
}
function _c2setAct(label, fn) {
  CL2.act = label || null; CL2.actFn = fn || null;
  try {
    if (!CL2.btn) return;
    CL2.btn.style.display = label ? '' : 'none';
    if (label) CL2.btn.textContent = label;
  } catch (e) {}
}
function _c2doAct() { try { if (CL2.actFn) CL2.actFn(); } catch (e) {} }
function _c2setChip(txt) {
  try {
    if (!CL2.chip) return;
    CL2.chip.style.display = txt ? '' : 'none';
    if (txt) CL2.chip.textContent = txt;
  } catch (e) {}
}
function _c2openPanel(html) {
  try {
    _c2ensureUI();
    if (!CL2.panel) return;
    CL2.panel.innerHTML = '<div class="panel" style="max-width:440px;width:100%">' + html + '</div>';
    CL2.panel.classList.remove('hidden');
    const c = CL2.panel.querySelector('[data-c2close]');
    if (c) c.addEventListener('click', () => { _c2click(); _c2closePanel(); });
  } catch (e) {}
}
function _c2closePanel() { try { if (CL2.panel) CL2.panel.classList.add('hidden'); } catch (e) {} }

/* flecha guía 3D (cono amarillo flotante sobre el destino) */
function _c2setWaypoint(x, z) {
  _c2clearWaypoint();
  try {
    const g = new THREE.Group();
    const cone = new THREE.Mesh(_c2geo('awc', () => new THREE.ConeGeometry(0.9, 1.8, 10)),
      new THREE.MeshBasicMaterial({ color: 0xffe95e }));
    cone.rotation.x = Math.PI; cone.position.y = 0.9; g.add(cone);
    const ring = new THREE.Mesh(_c2geo('awr', () => new THREE.TorusGeometry(1.6, 0.18, 8, 20)),
      new THREE.MeshBasicMaterial({ color: 0xffe95e }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.15; g.add(ring);
    g.position.set(x, 4.5, z);
    CL2.group.add(g);
    CL2.wp = { x: x, z: z, mesh: g, t: 0 };
  } catch (e) {}
}
function _c2clearWaypoint() {
  try {
    if (CL2.wp && CL2.wp.mesh && CL2.wp.mesh.parent) CL2.wp.mesh.parent.remove(CL2.wp.mesh);
  } catch (e) {}
  CL2.wp = null;
}

/* ============================== a) 🏠 CASAS ============================== */
function _c2houseState(id) {
  const s = (SAVE.cl2.houses || {})[id];
  return s || { owned: false, rented: false };
}
function _c2buildHouse(x, z, def, id) {
  const g = new THREE.Group();
  _c2box(g, 7.4, 0.25, 6.4, 0xd9c9a8, 0, 0.12, 0);                    // base
  _c2box(g, 6.4, 2.9, 5.4, def.color, 0, 1.7, 0);                    // cuerpo
  const roof = new THREE.Mesh(_c2geo('pyr', () => new THREE.ConeGeometry(4.9, 2, 4)),
    _c2mat(def.roof));
  roof.position.y = 4.15; roof.rotation.y = Math.PI / 4; g.add(roof); // techo pirámide
  _c2box(g, 1.3, 2.2, 0.18, 0x5a3a1e, 0, 1.35, 2.75);                 // puerta
  _c2box(g, 1.4, 1.1, 0.16, 0x9fd8ff, -1.9, 1.9, 2.72, 0, 0x9fd8ff, 0.5); // ventanas
  _c2box(g, 1.4, 1.1, 0.16, 0x9fd8ff, 1.9, 1.9, 2.72, 0, 0x9fd8ff, 0.5);
  const st = _c2houseState(id);
  const tex = _c2signTex(st.owned ? ['🏠', _c2T('c2.myHouse')] : ['🏠', _c2T('c2.forSale')], '#fff7e0', '#c23b2e');
  const sign = _c2postSign(g, tex, 0, 4.6, 4.4, 1.7, 0);
  g.position.set(x, 0, z);
  CL2.group.add(g);
  const h = { id: id, x: x, z: z, price: def.price, group: g, sign: sign, tex: tex };
  CL2.houses.push(h);
  return h;
}
function _c2refreshHouseSign(h) {
  try {
    const st = _c2houseState(h.id);
    const tex = _c2signTex(st.owned ? ['🏠', _c2T('c2.myHouse')] : ['🏠', _c2T('c2.forSale')], '#fff7e0', '#c23b2e');
    if (h.sign && h.sign.traverse) h.sign.traverse(o => { // doubleFaceSign devuelve un Group
      if (o && o.isMesh && o.material && 'map' in o.material) { o.material.map = tex; o.material.needsUpdate = true; }
    });
  } catch (e) {}
}
function _c2buyHouse(id) {
  const h = CL2.houses[id]; if (!h) return;
  const st = _c2houseState(id);
  if (st.owned) { _c2toast(_c2T('c2.myHouse')); return; }
  if ((SAVE.coins || 0) < h.price) { _c2toast(_c2T('c2.noMoney')); try { Audio2.deny(); } catch (e) {} return; }
  _c2earn(-h.price);
  SAVE.cl2.houses[id] = { owned: true, rented: false };
  persist();
  _c2refreshHouseSign(h);
  try { Audio2.buy(); } catch (e) {}
  _c2burst(h.x, 3, h.z, [0xffe95e, 0x59ff7a, 0xffffff], 24, 6);
  _c2toast(_c2T('c2.bought'));
  _c2housePanel(id);
}
function _c2toggleRent(id) {
  const st = SAVE.cl2.houses[id]; if (!st || !st.owned) return;
  st.rented = !st.rented;
  persist();
  _c2click();
  _c2toast(st.rented ? _c2T('c2.rentOn') : _c2T('c2.rentOff'));
  _c2syncRenters();
  _c2housePanel(id);
}
/* NPC inquilino junto a la puerta de cada casa rentada */
function _c2syncRenters() {
  try {
    CL2.renters.forEach(r => { if (r.parent) r.parent.remove(r); });
  } catch (e) {}
  CL2.renters = [];
  if (!CL2.group) return;
  CL2.houses.forEach(h => {
    const st = _c2houseState(h.id);
    if (st.owned && st.rented) {
      const p = _c2person([0x00a2ff, 0xff2fd6, 0x59d867, 0xffb300][h.id % 4]);
      p.position.set(h.x + 2.2, 0, h.z + 4.2);
      p.rotation.y = Math.PI + (h.id * 0.7);
      CL2.group.add(p);
      CL2.renters.push(p);
    }
  });
}
function _c2rentCount() {
  let n = 0;
  CL2.houses.forEach(h => { const s = _c2houseState(h.id); if (s.owned && s.rented) n++; });
  return n;
}
/* renta pasiva: $10 por minuto de juego por casa rentada (timestamp en SAVE) */
function _c2rentTick(dt) {
  try {
    SAVE.cl2.playSec = (SAVE.cl2.playSec || 0) + dt;
    const dueMin = Math.floor((SAVE.cl2.playSec - (SAVE.cl2.lastPaySec || 0)) / 60);
    if (dueMin <= 0) return;
    const n = _c2rentCount();
    if (n > 0) {
      const pay = dueMin * 10 * n;
      _c2earn(pay); _c2coin();
      _c2toast(_c2T('c2.rentPaid') + ' +' + pay + ' 🪙');
    }
    SAVE.cl2.lastPaySec = (SAVE.cl2.lastPaySec || 0) + dueMin * 60;
    SAVE.cl2.lastPayTs = Date.now();
    persist();
  } catch (e) {}
}
function _c2collectRent() {
  try {
    const pend = Math.floor((SAVE.cl2.playSec - (SAVE.cl2.lastPaySec || 0)) / 60);
    const n = _c2rentCount();
    if (pend > 0 && n > 0) {
      const pay = pend * 10 * n;
      _c2earn(pay); _c2coin();
      _c2toast(_c2T('c2.rentPaid') + ' +' + pay + ' 🪙');
    } else _c2toast('🏠 …');
    SAVE.cl2.lastPaySec = SAVE.cl2.playSec;
    SAVE.cl2.lastPayTs = Date.now();
    persist();
  } catch (e) {}
}
function _c2housePanel(id) {
  const h = CL2.houses[id]; if (!h) return;
  const st = _c2houseState(id);
  const pend = Math.floor((SAVE.cl2.playSec - (SAVE.cl2.lastPaySec || 0)) / 60) * 10 * (st.rented ? 1 : 0);
  let html = '<h2>🏠 ' + _c2T('c2.house') + ' #' + (id + 1) + '</h2>';
  html += '<div class="c2-card">💰 ' + _c2T('c2.income') + '<br>' +
    (st.owned ? '✅ ' + _c2T('c2.myHouse') : '🏷️ $' + h.price) + '<br>' +
    (st.rented ? '🤝 ' + _c2T('c2.rented') : '🤝 ' + _c2T('c2.notRented')) + '</div>';
  html += '<div class="menu-buttons">';
  if (!st.owned) html += '<button class="btn btn-big" data-a="buy">🏠 ' + _c2T('c2.buy') + ' ($' + h.price + ')</button>';
  else {
    html += '<button class="btn" data-a="rent">' + _c2T('c2.rent') + ': ' + (st.rented ? 'ON' : 'OFF') + '</button>';
    html += '<button class="btn" data-a="collect">💰 ' + _c2T('c2.collect') + ' (+$' + pend + ')</button>';
  }
  html += '<button class="btn" data-c2close>✕ ' + _c2T('c2.close') + '</button></div>';
  _c2openPanel(html);
  try {
    CL2.panel.querySelector('[data-a="buy"]').addEventListener('click', () => _c2buyHouse(id));
    const r = CL2.panel.querySelector('[data-a="rent"]');
    if (r) r.addEventListener('click', () => _c2toggleRent(id));
    const c = CL2.panel.querySelector('[data-a="collect"]');
    if (c) c.addEventListener('click', () => { _c2collectRent(); _c2housePanel(id); });
  } catch (e) {}
}

/* ============================== b) 💼 TRABAJOS: repartidor y taxista ============================== */
function _c2jobSpots() {
  const s = C2_SPOTS[CL2.idx]; if (!s) return [];
  const pts = [];
  s.houses.forEach(h => pts.push([h[0], h[1]]));
  pts.push(s.arcade, s.church, s.hospital, s.fair);
  if (s.dock) pts.push(s.dock);
  return pts;
}
function _c2jobsPanel() {
  let html = '<h2>💼 ' + _c2T('c2.jobs') + '</h2>';
  const d = CL2.del, t = CL2.taxi;
  html += '<div class="c2-card">🚚 <b>' + _c2T('c2.delivery') + '</b><br><span style="font-size:13px">' +
    _c2T('c2.dDelivery') + '</span><br>' +
    (d.stage === 'idle'
      ? '<button class="btn" data-j="del">▶ ' + _c2T('c2.start') + '</button>'
      : '<span>📦 ' + (d.stage === 'goA' ? '→ depósito' : '→ destino') + '</span>') + '</div>';
  html += '<div class="c2-card">🚕 <b>' + _c2T('c2.taxi') + '</b><br><span style="font-size:13px">' +
    _c2T('c2.dTaxi') + '</span><br>' +
    (t.stage === 'idle'
      ? '<button class="btn" data-j="taxi">▶ ' + _c2T('c2.start') + '</button>'
      : '<span>🧍 ' + (t.stage === 'wait' ? '→ parada' : '→ destino') + '</span>') + '</div>';
  html += '<div class="menu-buttons"><button class="btn" data-c2close>✕ ' + _c2T('c2.close') + '</button></div>';
  _c2openPanel(html);
  try {
    CL2.panel.querySelector('[data-j="del"]').addEventListener('click', () => { _c2closePanel(); _c2startDelivery(); });
    CL2.panel.querySelector('[data-j="taxi"]').addEventListener('click', () => { _c2closePanel(); _c2startTaxi(); });
  } catch (e) {}
}
/* ---- 🚚 repartidor ---- */
function _c2startDelivery() {
  const s = C2_SPOTS[CL2.idx]; if (!s || CL2.del.stage !== 'idle') return;
  if (!_c2onFoot()) { _c2toast(_c2T('c2.onFoot')); return; }
  const spots = _c2jobSpots();
  const b = spots[(Math.random() * spots.length) | 0];
  CL2.del = { stage: 'goA', a: s.depot, b: b };
  _c2setWaypoint(s.depot[0], s.depot[1]);
  _c2setChip('🚚 → 📦');
  _c2click();
}
function _c2delAction() {
  const d = CL2.del, p = _c2playerPos(); if (!p) return;
  if (d.stage === 'goA' && _c2d2(p.x, p.z, d.a[0], d.a[1]) < 16) {
    d.stage = 'goB';
    _c2setWaypoint(d.b[0], d.b[1]);
    _c2setChip('🚚 📦 → 🏁');
    _c2toast(_c2T('c2.pkgTaken'));
    _c2click();
  } else if (d.stage === 'goB' && _c2d2(p.x, p.z, d.b[0], d.b[1]) < 16) {
    const dist = Math.hypot(d.b[0] - d.a[0], d.b[1] - d.a[1]);
    const pay = 15 + Math.round(dist * 0.5);
    _c2earn(pay); _c2coin();
    _c2burst(d.b[0], 2, d.b[1], [0xffe95e, 0x59ff7a], 18, 5);
    _c2toast(_c2T('c2.delivered') + ' +' + pay + ' 🪙');
    CL2.del = { stage: 'idle', a: null, b: null };
    _c2clearWaypoint(); _c2setChip('');
  }
}
/* ---- 🚕 taxista ---- */
function _c2startTaxi() {
  const s = C2_SPOTS[CL2.idx]; if (!s || CL2.taxi.stage !== 'idle') return;
  if (!_c2onFoot()) { _c2toast(_c2T('c2.onFoot')); return; }
  const spots = _c2jobSpots();
  const dest = spots[(Math.random() * spots.length) | 0];
  CL2.taxi = { stage: 'wait', dest: dest, pax: null };
  try {
    const pax = _c2person(0xff5533);
    pax.position.set(s.taxi[0] + 1.5, 0, s.taxi[1]);
    CL2.group.add(pax);
    CL2.taxi.pax = pax;
  } catch (e) {}
  _c2setWaypoint(s.taxi[0], s.taxi[1]);
  _c2setChip('🚕 → 🧍');
  _c2click();
}
function _c2taxiAction() {
  const t = CL2.taxi, p = _c2playerPos(); if (!p) return;
  const s = C2_SPOTS[CL2.idx];
  if (t.stage === 'wait' && _c2d2(p.x, p.z, s.taxi[0], s.taxi[1]) < 16) {
    t.stage = 'ride';
    try { if (t.pax && t.pax.parent) t.pax.parent.remove(t.pax); } catch (e) {}
    t.pax = null;
    _c2setWaypoint(t.dest[0], t.dest[1]);
    _c2setChip('🚕 🧍 → 🏁');
    _c2toast(_c2T('c2.paxIn'));
    _c2click();
  } else if (t.stage === 'ride' && _c2d2(p.x, p.z, t.dest[0], t.dest[1]) < 16) {
    const dist = Math.hypot(t.dest[0] - s.taxi[0], t.dest[1] - s.taxi[1]);
    const pay = 12 + Math.round(dist * 0.6);
    _c2earn(pay); _c2coin();
    _c2burst(t.dest[0], 2, t.dest[1], [0xffe95e, 0x00e5ff], 18, 5);
    _c2toast(_c2T('c2.fare') + ' +' + pay + ' 🪙');
    CL2.taxi = { stage: 'idle', dest: null, pax: null };
    _c2clearWaypoint(); _c2setChip('');
  }
}
function _c2updateJobs(dt) {
  const p = _c2playerPos();
  const s = C2_SPOTS[CL2.idx];
  if (!p || !s || !_c2onFoot()) return;
  const d = CL2.del, t = CL2.taxi;
  if (d.stage === 'goA' && _c2d2(p.x, p.z, d.a[0], d.a[1]) < 16)
    _c2proposeAct(_c2T('c2.pickup'), _c2delAction);
  else if (d.stage === 'goB' && _c2d2(p.x, p.z, d.b[0], d.b[1]) < 16)
    _c2proposeAct(_c2T('c2.deliver'), _c2delAction);
  else if (t.stage === 'wait' && _c2d2(p.x, p.z, s.taxi[0], s.taxi[1]) < 16)
    _c2proposeAct(_c2T('c2.pickupPax'), _c2taxiAction);
  else if (t.stage === 'ride' && _c2d2(p.x, p.z, t.dest[0], t.dest[1]) < 16)
    _c2proposeAct(_c2T('c2.dropoff'), _c2taxiAction);
}

/* ============================== c) 🚤 AIRBOAT (solo Immokalee) ============================== */
function _c2buildAirboatMesh(color) {
  const g = new THREE.Group();
  _c2box(g, 2.2, 0.7, 4.6, color, 0, 0.55, 0);                       // casco
  _c2box(g, 1.8, 0.25, 3.6, 0x8a5a33, 0, 0.95, 0.2);                  // cubierta madera
  _c2box(g, 1.6, 0.5, 0.5, 0x5a3a1e, 0, 1.25, 0.9);                   // banca delantera
  _c2box(g, 1.6, 0.5, 0.5, 0x5a3a1e, 0, 1.25, -0.6);                  // banca trasera
  // abanico gigante atrás (diseño propio)
  const cage = new THREE.Mesh(_c2geo('fancage', () => new THREE.TorusGeometry(1.1, 0.12, 8, 18)), _c2mat(0x2b2f3a));
  cage.position.set(0, 1.9, -2.2); g.add(cage);
  const fan = new THREE.Group(); fan.position.set(0, 1.9, -2.2);
  for (let i = 0; i < 3; i++) {
    const bl = _c2box(fan, 0.28, 1.9, 0.08, 0xffd23f, 0, 0, 0);
    bl.rotation.z = (i / 3) * Math.PI * 2;
  }
  g.add(fan);
  g.userData.fan = fan;
  _c2box(g, 0.9, 0.9, 0.5, 0x2b2f3a, 0, 1.1, -2.2);                   // motor
  return g;
}
function _c2registerAirboat() {
  try {
    if (typeof VEHICLE_TYPES !== 'undefined' && !VEHICLE_TYPES['geayi-airboat']) {
      VEHICLE_TYPES['geayi-airboat'] = { name: 'GEAYI Airboat 🌬️', emoji: '🚤', maxSpeed: 13, accel: 11, seatY: 0.62 };
      VEHICLE_BUILDERS['geayi-airboat'] = _c2buildAirboatMesh;
    }
  } catch (e) {}
}
function _c2tourPanel() {
  let html = '<h2>🚤 ' + _c2T('c2.tour') + '</h2>';
  html += '<div class="c2-card">' + _c2T('c2.tourD') + '<br>💰 ' + SAVE.coins + ' 🪙</div>';
  html += '<div class="menu-buttons">';
  html += '<button class="btn btn-big" data-t="free">' + _c2T('c2.tourFree') + '</button>';
  html += '<button class="btn" data-t="paid">' + _c2T('c2.tourPaid') + '</button>';
  html += '<button class="btn" data-c2close>✕ ' + _c2T('c2.close') + '</button></div>';
  _c2openPanel(html);
  try {
    CL2.panel.querySelector('[data-t="free"]').addEventListener('click', () => { _c2closePanel(); _c2startTour(false); });
    CL2.panel.querySelector('[data-t="paid"]').addEventListener('click', () => { _c2closePanel(); _c2startTour(true); });
  } catch (e) {}
}
function _c2startTour(paid) {
  const s = C2_SPOTS[3];
  if (CL2.idx !== 3 || !s || !s.dock || CL2.tour) return;
  if (paid) {
    if ((SAVE.coins || 0) < 20) { _c2toast(_c2T('c2.noMoney')); try { Audio2.deny(); } catch (e) {} return; }
    _c2earn(-20);
  }
  CL2.tour = { stop: 0, paid: paid };
  const st = s.tourStops[0];
  _c2setWaypoint(st[0], st[1]);
  _c2setChip('🚤 1/4');
  _c2banner('🚤 ' + _c2T('c2.tour'), _c2T('c2.tourStart'));
  _c2click();
}
function _c2updateTour(dt) {
  const t = CL2.tour; if (!t) return;
  const s = C2_SPOTS[3];
  const p = _c2playerPos(); if (!p || !s) return;
  const st = s.tourStops[t.stop];
  if (_c2d2(p.x, p.z, st[0], st[1]) < 100) { // < 10 m
    const fact = C2_TOUR_FACTS[t.stop];
    _c2banner(fact[0], fact[1], 5200);
    _c2burst(st[0], 3, st[1], [0x00e5ff, 0xffffff, 0xffe95e], 20, 6);
    try { Audio2.check(); } catch (e) {}
    t.stop++;
    if (t.stop >= s.tourStops.length) {
      if (t.paid) { _c2earn(40); _c2toast(_c2T('c2.souvenir') + ' 🎁'); }
      _c2toast(_c2T('c2.tourEnd'));
      CL2.tour = null;
      _c2clearWaypoint(); _c2setChip('');
    } else {
      const nx = s.tourStops[t.stop];
      _c2setWaypoint(nx[0], nx[1]);
      _c2setChip('🚤 ' + (t.stop + 1) + '/4');
    }
  }
}

/* ============================== d) 🎡 FERIA GEAYI ============================== */
function _c2buildFair(x, z) {
  const g = new THREE.Group();
  // noria decorativa (diseño propio): aro + 8 cabinas + soportes
  const wheel = new THREE.Group();
  const rim = new THREE.Mesh(_c2geo('fwrim', () => new THREE.TorusGeometry(6, 0.3, 8, 24)), _c2mat(0xff2fd6, 0xff2fd6, 0.7));
  wheel.add(rim);
  CL2.fair.cabins = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const cab = _c2box(wheel, 1.4, 1.2, 1.4, [0xffd23f, 0x00e5ff, 0x59d867, 0xff6f00][i % 4],
      Math.cos(a) * 6, Math.sin(a) * 6, 0);
    cab.userData.fairCab = true;
    cab.userData.ang = a; // ángulo base (para saber cuál cabina está abajo)
    CL2.fair.cabins.push(cab);
  }
  for (let i = 0; i < 8; i++) { // rayos
    const a = (i / 8) * Math.PI * 2;
    const sp = _c2box(wheel, 0.18, 11.6, 0.18, 0xffffff, 0, 0, 0);
    sp.rotation.z = a;
  }
  wheel.position.set(x, 8.2, z);
  g.add(wheel);
  _c2box(g, 0.8, 8.4, 0.8, 0x8a8f9a, x - 2.2, 4.2, z); // soportes
  _c2box(g, 0.8, 8.4, 0.8, 0x8a8f9a, x + 2.2, 4.2, z);
  // 3 puestos con toldo a rayas y premios
  for (let i = 0; i < 3; i++) {
    const px = x - 10 + i * 10, pz = z + 12;
    _c2box(g, 4, 1.1, 2, 0x8a5a33, px, 1.35, pz);                    // mostrador
    for (let k = 0; k < 5; k++)                                      // toldo a rayas
      _c2box(g, 0.85, 0.12, 2.6, k % 2 ? 0xffffff : 0xff3d5e, px - 1.7 + k * 0.85, 2.9, pz);
    _c2cyl(g, 0.09, 0.09, 2.4, 0x6b4a2a, px - 1.9, 1.7, pz - 1.1);
    _c2cyl(g, 0.09, 0.09, 2.4, 0x6b4a2a, px + 1.9, 1.7, pz - 1.1);
    _c2box(g, 0.7, 0.7, 0.7, 0xffe95e, px - 1, 2.25, pz, 0, 0xffe95e, 0.6); // premios
    _c2box(g, 0.7, 0.7, 0.7, 0x00e5ff, px + 1, 2.25, pz, 0, 0x00e5ff, 0.6);
    const stall = { x: px, z: pz };
    (CL2.fair.stalls = CL2.fair.stalls || []).push(stall);
  }
  // puesto de aros
  const rp = { x: x + 12, z: z + 12 };
  for (let i = 0; i < 3; i++)
    _c2cyl(g, 0.12, 0.16, 1.2, 0x00a2ff, rp.x - 1.2 + i * 1.2, 0.6, rp.z);
  CL2.fair.ringSpot = rp;
  _c2postSign(g, _c2signTex(['🎡', 'FERIA GEAYI'], '#7b2fff', '#ffffff'), x, z - 10, 6, 2.2, 0);
  // --- extensión: juegos subibles y puestos con minijuegos (todo a nivel del suelo) ---
  CL2.fair.boardSpot = { x: x, z: z + 8 };       // punto de abordaje de la noria
  _c2buildCarousel(g, x - 18, z);                 // 🐴 carrusel subible
  _c2buildSwings(g, x + 18, z);                   // 🎠 sillas voladoras (decoración giratoria)
  _c2buildCansStall(g, x + 20, z + 12);           // 🥫 tumba-latas
  _c2buildDartsStall(g, x - 20, z + 12);          // 🎈 globos con dardos
  CL2.group.add(g);
  CL2.fair.group = g;
  CL2.fair.wheel = wheel;
  CL2.fair.stalls = CL2.fair.stalls || [];
}
function _c2clearFair() {
  try {
    const f = CL2.fair;
    // bajar al jugador de forma segura si estaba en un juego (sin caídas)
    if (f.ride) {
      f.ride = null;
      if (f.boardSpot) _c2tp(f.boardSpot.x, f.boardSpot.z);
    }
    if (f.car && f.car.rider) {
      f.car.rider = null;
      _c2tp(f.car.boardSpot.x, f.car.boardSpot.z);
    }
  } catch (e) {}
  try { if (CL2.fair.group && CL2.fair.group.parent) CL2.fair.group.parent.remove(CL2.fair.group); } catch (e) {}
  CL2.fair.group = null; CL2.fair.wheel = null; CL2.fair.stalls = [];
  CL2.fair.ringSpot = null; CL2.fair.active = false; CL2.fair.prizeTaken = false;
  CL2.fair.cabins = []; CL2.fair.boardSpot = null; CL2.fair.ride = null;
  CL2.fair.car = null; CL2.fair.swings = null; CL2.fair.cans = null; CL2.fair.darts = null;
  CL2.ring = { active: false, att: 0, hits: 0 };
}
function _c2updateFair(dt) {
  const f = CL2.fair;
  if (!f.active) {
    f.next -= dt;
    if (f.next <= 0) {
      const s = C2_SPOTS[CL2.idx];
      f.active = true; f.t = 150; f.prizeTaken = false;
      f.next = 240 + Math.random() * 120;
      _c2buildFair(s.fair[0], s.fair[1]);
      _c2banner(_c2T('c2.fair'), _c2T('c2.fairSub'), 6000);
      try { Audio2.win(); } catch (e) {}
    }
    return;
  }
  f.t -= dt;
  if (f.wheel) {
    f.wheel.rotation.z += dt * 0.25; // noria girando despacio
    // cabinas se mantienen verticales
    f.wheel.children.forEach(c => { if (c.userData && c.userData.fairCab) c.rotation.z = -f.wheel.rotation.z; });
  }
  _c2updateWheelRide(dt);  // 🎡 paseo en la noria
  _c2updateCarousel(dt);   // 🐴 carrusel
  _c2updateSwings(dt);     // 🎠 sillas voladoras (decoración)
  if (f.t <= 0) { _c2clearFair(); _c2toast('🎡 …'); }
}
function _c2stallPrize(sx, sz) {
  if (CL2.fair.prizeTaken) { _c2toast(_c2T('c2.stallOnce')); return; }
  CL2.fair.prizeTaken = true;
  const prize = 10 + ((Math.random() * 21) | 0);
  _c2earn(prize); _c2coin();
  _c2burst(sx, 2.5, sz, [0xffd23f, 0xff2fd6, 0x00e5ff, 0x59d867, 0xffffff], 30, 7);
  _c2toast(_c2T('c2.prize') + ' +' + prize + ' 🪙');
}
/* mini-juego: atrapa el aro (3 intentos) */
function _c2ringPanel() {
  CL2.ring = { active: true, att: 0, hits: 0 };
  _c2renderRing();
}
function _c2renderRing() {
  const r = CL2.ring;
  let row = '';
  for (let i = 0; i < 3; i++) row += (i < r.att ? (r._res[i] ? '🟢' : '🔴') : '⚪') + ' ';
  let html = '<h2>🎯 ' + _c2T('c2.ring') + '</h2>';
  html += '<div class="c2-card" style="font-size:30px">' + row + '</div>';
  html += '<div class="c2-card">' + _c2T('c2.throw') + ': ' + (3 - r.att) + '</div>';
  html += '<div class="menu-buttons">';
  if (r.att < 3) html += '<button class="btn btn-big" data-r="go">🎯 ' + _c2T('c2.throw') + '</button>';
  html += '<button class="btn" data-c2close>✕ ' + _c2T('c2.close') + '</button></div>';
  _c2openPanel(html);
  try {
    const b = CL2.panel.querySelector('[data-r="go"]');
    if (b) b.addEventListener('click', () => _c2ringThrow());
  } catch (e) {}
}
function _c2ringThrow() {
  const r = CL2.ring;
  if (!r.active || r.att >= 3) return;
  r._res = r._res || [];
  const hit = Math.random() < 0.45;
  r._res.push(hit);
  if (hit) r.hits++;
  r.att++;
  _c2click();
  if (r.att >= 3) {
    r.active = false;
    const prize = r.hits * 10 + (r.hits === 3 ? 20 : 0);
    if (prize > 0) { _c2earn(prize); _c2coin(); _c2toast(_c2T('c2.ringWin') + ' +' + prize + ' 🪙'); }
    else _c2toast('🎯 …');
  }
  _c2renderRing();
}

/* ============================== d2) 🎡 JUEGOS SUBIBLES + MINIJUEGOS ==============================
   Extensión de la Feria GEAYI (dentro de citylife2.js, sin duplicar la feria):
   - noria SUBIBLE: cabina segura que gira con el jugador (2 vueltas, ~30 s)
   - 🐴 carrusel subible con caballitos de bloques (diseño original)
   - 🎠 sillas voladoras: solo decoración giratoria
   - 🥫 tumba-latas y 🎈 globos: puestos con minijuegos y premio en monedas
   Todo a nivel del suelo, geometrías/materiales cacheados (Android). */
const C2_WHEEL_R = 6, C2_WHEEL_CY = 8.2; // radio y altura del centro de la noria
const C2_RIDE_TURNS = 2, C2_RIDE_MAXT = 60; // vueltas del paseo / tope de seguridad
const C2_CAR_SECS = 20;                       // duración del carrusel
function _c2normAng(a) {
  const T = Math.PI * 2;
  return ((a % T) + T * 1.5) % T - Math.PI;
}
/* ---- 🎡 noria subible ---- */
/* índice de la cabina que está abajo (o -1 si ninguna está en la zona de abordaje) */
function _c2wheelBoardIdx() {
  const f = CL2.fair;
  if (!f.active || !f.wheel || !f.cabins || !f.cabins.length || f.ride) return -1;
  const th = f.wheel.rotation.z;
  let best = -1, bd = 0.35;
  for (let i = 0; i < f.cabins.length; i++) {
    const rel = Math.abs(_c2normAng(f.cabins[i].userData.ang + th + Math.PI / 2));
    if (rel < bd) { bd = rel; best = i; }
  }
  return best;
}
function _c2wheelBoard(idx) {
  const f = CL2.fair;
  if (!f.active || f.ride || idx == null || idx < 0 || !f.cabins[idx]) return;
  f.ride = { cab: idx, t: 0, ang0: f.wheel.rotation.z, stage: 'riding' };
  _c2click();
  _c2toast('🎡 ' + _c2T('c2.board'));
}
function _c2wheelExit() {
  const f = CL2.fair, r = f.ride;
  if (!r || r.stage !== 'done') return;
  f.ride = null;
  const bs = f.boardSpot;
  if (bs) _c2tp(bs.x, bs.z); // de vuelta al suelo, al punto de abordaje
  _c2click();
}
function _c2updateWheelRide(dt) {
  const f = CL2.fair, r = f.ride;
  if (!r || !f.wheel) return;
  const P = _c2playerPos();
  r.t += dt;
  const wp = f.wheel.position;
  if (r.stage === 'riding') {
    // cabina = plataforma segura: el jugador viaja sentado en ella
    const a = f.cabins[r.cab].userData.ang + f.wheel.rotation.z;
    if (P) {
      P.set(wp.x + Math.cos(a) * C2_WHEEL_R, wp.y + Math.sin(a) * C2_WHEEL_R + 0.9, wp.z);
      try { if (Player.vel) Player.vel.set(0, 0, 0); } catch (e) {}
    }
    const turns = (f.wheel.rotation.z - r.ang0) / (Math.PI * 2);
    const rel = Math.abs(_c2normAng(f.cabins[r.cab].userData.ang + f.wheel.rotation.z + Math.PI / 2));
    if ((turns >= C2_RIDE_TURNS && rel < 0.2) || r.t >= C2_RIDE_MAXT) {
      r.stage = 'done'; // la cabina volvió abajo: se sostiene al jugador ahí hasta BAJAR
      if (P) {
        P.set(wp.x, wp.y - C2_WHEEL_R + 0.9, wp.z);
        try { if (Player.vel) Player.vel.set(0, 0, 0); } catch (e) {}
      }
      _c2toast('⬇️ ' + _c2T('c2.exit'));
    }
  } else if (r.stage === 'done') {
    // espera segura abajo (la noria sigue girando para los demás)
    if (P) {
      P.set(wp.x, wp.y - C2_WHEEL_R + 0.9, wp.z);
      try { if (Player.vel) Player.vel.set(0, 0, 0); } catch (e) {}
    }
  }
}
/* ---- 🐴 carrusel subible (diseño original: plataforma, dosel y caballitos de bloques) ---- */
function _c2horseMesh(color) {
  const g = new THREE.Group();
  _c2box(g, 0.5, 0.7, 1.2, color, 0, 0.95, 0);      // cuerpo
  _c2box(g, 0.34, 0.8, 0.4, color, 0, 1.5, 0.55);   // cuello
  _c2box(g, 0.32, 0.36, 0.62, color, 0, 1.85, 0.82); // cabeza
  _c2box(g, 0.36, 0.22, 0.3, 0x3a2a1a, 0, 2.02, 0.6); // crin
  _c2box(g, 0.5, 0.5, 0.5, 0xffffff, 0, 0.95, 0.35, 0, 0xffffff, 0.25); // silla
  const legs = [[-0.16, 0.4], [0.16, 0.4], [-0.16, -0.4], [0.16, -0.4]];
  for (let i = 0; i < 4; i++) _c2box(g, 0.16, 0.7, 0.16, color, legs[i][0], 0.35, legs[i][1]);
  _c2cyl(g, 0.05, 0.05, 1.7, 0xd9d9d9, 0, 1.2, -0.1); // barra vertical del poste
  return g;
}
function _c2buildCarousel(g, cx, cz) {
  const grp = new THREE.Group(); grp.position.set(cx, 0, cz);
  const base = new THREE.Mesh(_c2geo('carbase', () => new THREE.CylinderGeometry(4.4, 4.6, 0.5, 14)),
    _c2mat(0x8a5a33));
  base.position.y = 0.25; grp.add(base);
  _c2cyl(grp, 0.4, 0.4, 5.2, 0xffd23f, 0, 2.8, 0); // poste central
  const roof = new THREE.Mesh(_c2geo('carroof', () => new THREE.ConeGeometry(5.2, 2.2, 12)),
    _c2mat(0xff2fd6, 0xff2fd6, 0.5));
  roof.position.y = 6.4; grp.add(roof);
  _c2cyl(grp, 0.06, 0.06, 1.2, 0xd9d9d9, 0, 8, 0); // mástil de la bandera
  _c2box(grp, 0.9, 0.5, 0.06, 0x00e5ff, 0.48, 8.2, 0, 0, 0x00e5ff, 0.4); // banderín
  for (let i = 0; i < 10; i++) { // lucecitas del borde del dosel
    const a = (i / 10) * Math.PI * 2;
    _c2box(grp, 0.22, 0.22, 0.22, i % 2 ? 0xffe95e : 0x00e5ff,
      Math.cos(a) * 5.1, 5.45, Math.sin(a) * 5.1, 0,
      i % 2 ? 0xffe95e : 0x00e5ff, 0.9);
  }
  const spin = new THREE.Group(); spin.position.y = 0; grp.add(spin);
  const horses = [];
  const cols = [0xff6f00, 0x00e5ff, 0x59d867, 0xffd23f, 0xff2fd6, 0xffffff];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const h = _c2horseMesh(cols[i % cols.length]);
    h.position.set(Math.cos(a) * 3, 0.55, Math.sin(a) * 3);
    h.rotation.y = -a + Math.PI / 2; // mirando en dirección de giro
    h.userData.ang = a; h.userData.baseY = 0.55;
    spin.add(h); horses.push(h);
  }
  g.add(grp);
  CL2.fair.car = {
    grp: grp, spin: spin, cx: cx, cz: cz, horses: horses, t: 0,
    rider: null, boardSpot: { x: cx + 5.8, z: cz },
  };
  _c2postSign(g, _c2signTex(['🐴', 'CARRUSEL'], '#00a2ff', '#ffffff'), cx, cz + 6.4, 5, 2, 0);
}
function _c2carBoard() {
  const c = CL2.fair.car;
  if (!c || c.rider) return;
  c.rider = { t: 0, horse: (Math.random() * c.horses.length) | 0 };
  _c2click();
  _c2toast('🐴 ' + _c2T('c2.board'));
}
function _c2carExit() {
  const c = CL2.fair.car;
  if (!c || !c.rider) return;
  c.rider = null;
  _c2tp(c.boardSpot.x, c.boardSpot.z);
  _c2click();
}
function _c2updateCarousel(dt) {
  const c = CL2.fair.car;
  if (!c) return;
  c.t += dt;
  c.spin.rotation.y += dt * 0.9;
  for (let i = 0; i < c.horses.length; i++) { // caballitos suben y bajan
    const h = c.horses[i];
    h.position.y = h.userData.baseY + Math.sin(c.t * 2.6 + i * 1.13) * 0.3;
  }
  const r = c.rider;
  if (!r) return;
  r.t += dt;
  const h = c.horses[r.horse % c.horses.length];
  const a = h.userData.ang + c.spin.rotation.y;
  const P = _c2playerPos();
  if (P) { // el jugador viaja sentado en su caballito
    P.set(c.cx + Math.cos(a) * 3, h.position.y + 1.55, c.cz + Math.sin(a) * 3);
    try { if (Player.vel) Player.vel.set(0, 0, 0); } catch (e) {}
  }
  if (r.t >= C2_CAR_SECS) { // fin del paseo: baja solo, en el suelo
    c.rider = null;
    _c2tp(c.boardSpot.x, c.boardSpot.z);
    _c2toast('🐴 …');
  }
}
/* ---- 🎠 sillas voladoras: decoración giratoria (no subible) ---- */
function _c2buildSwings(g, sx, sz) {
  const grp = new THREE.Group(); grp.position.set(sx, 0, sz);
  _c2cyl(grp, 0.5, 0.7, 7, 0x00a2ff, 0, 3.5, 0); // torre
  const disc = new THREE.Group(); disc.position.y = 6.6; grp.add(disc);
  const plate = new THREE.Mesh(_c2geo('swdisc', () => new THREE.CylinderGeometry(3.4, 3.4, 0.4, 12)),
    _c2mat(0xffd23f));
  disc.add(plate);
  const chairs = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const pivot = new THREE.Group();
    pivot.position.set(Math.cos(a) * 3.1, -0.2, Math.sin(a) * 3.1);
    _c2cyl(pivot, 0.04, 0.04, 1.8, 0xcccccc, 0, -0.9, 0); // cadena
    _c2box(pivot, 0.7, 0.12, 0.7, [0xff2fd6, 0x00e5ff, 0x59d867][i % 3], 0, -1.9, 0); // asiento
    _c2box(pivot, 0.7, 0.6, 0.12, 0x3a2a1a, 0, -1.55, -0.32); // respaldo
    pivot.userData.ang = a;
    disc.add(pivot); chairs.push(pivot);
  }
  g.add(grp);
  CL2.fair.swings = { disc: disc, chairs: chairs, t: 0 };
  _c2postSign(g, _c2signTex(['🎠', _c2T('c2.swings')], '#7b2fff', '#ffffff'), sx, sz + 5.6, 5.4, 2, 0);
}
function _c2updateSwings(dt) {
  const s = CL2.fair.swings;
  if (!s) return;
  s.t += dt;
  s.disc.rotation.y += dt * 1.1;
  const tilt = 0.5; // las sillas se inclinan hacia afuera con el giro
  for (let i = 0; i < s.chairs.length; i++) {
    const ch = s.chairs[i], a = ch.userData.ang;
    ch.rotation.x = Math.sin(a) * tilt;
    ch.rotation.z = -Math.cos(a) * tilt;
  }
}
/* ---- puestos con minijuego: estructura compartida ---- */
function _c2buildGameStall(g, px, pz, signLines, accent) {
  _c2box(g, 4, 1.1, 2, 0x8a5a33, px, 1.35, pz); // mostrador
  for (let k = 0; k < 5; k++)                   // toldo a rayas
    _c2box(g, 0.85, 0.12, 2.6, k % 2 ? 0xffffff : accent, px - 1.7 + k * 0.85, 2.9, pz);
  _c2cyl(g, 0.09, 0.09, 2.4, 0x6b4a2a, px - 1.9, 1.7, pz - 1.1);
  _c2cyl(g, 0.09, 0.09, 2.4, 0x6b4a2a, px + 1.9, 1.7, pz - 1.1);
  _c2postSign(g, _c2signTex(signLines, '#ffffff', accent), px, pz + 3.4, 5, 2, 0);
}
/* ---- 🥫 tumba-latas: 3 niveles (3-2-1), lanzar pelota, premio +15..30 🪙 ---- */
function _c2buildCansStall(g, px, pz) {
  _c2buildGameStall(g, px, pz, ['🥫', 'TUMBA-LATAS'], 0xff6f00);
  _c2box(g, 3.4, 0.18, 1.2, 0x5a3a1e, px, 1.95, pz - 0.6); // estante
  const cans = [];
  const rows = [[3, 2.32], [2, 2.97], [1, 3.62]];
  const cols = [0xff3d5e, 0x00e5ff, 0xffe95e];
  for (let r = 0; r < rows.length; r++) {
    const n = rows[r][0], y = rows[r][1];
    for (let i = 0; i < n; i++) {
      const can = _c2cyl(g, 0.2, 0.2, 0.55, cols[(r + i) % 3], px + (i - (n - 1) / 2) * 0.55, y, pz - 0.6, 8);
      cans.push(can);
    }
  }
  CL2.fair.cans = { x: px, z: pz, list: cans, att: 0, done: false };
}
function _c2cansPanel() {
  const c = CL2.fair.cans;
  if (!c || c.done) return;
  let row = '';
  for (let i = 0; i < c.list.length; i++) row += c.list[i].visible ? '🥫' : '⬜';
  let html = '<h2>🥫 ' + _c2T('c2.cans') + '</h2>';
  html += '<div class="c2-card" style="font-size:26px">' + row + '</div>';
  html += '<div class="c2-card">' + _c2T('c2.cansLeft') + ': ' +
    c.list.filter(k => k.visible).length + '</div>';
  html += '<div class="menu-buttons"><button class="btn btn-big" data-c="go">🥎 ' +
    _c2T('c2.throwCan') + '</button>';
  html += '<button class="btn" data-c2close>✕ ' + _c2T('c2.close') + '</button></div>';
  _c2openPanel(html);
  try {
    CL2.panel.querySelector('[data-c="go"]').addEventListener('click', () => _c2cansThrow());
  } catch (e) {}
}
function _c2cansThrow() {
  const c = CL2.fair.cans;
  if (!c || c.done) return;
  const up = c.list.filter(k => k.visible);
  if (!up.length) return;
  const n = 1 + ((Math.random() * 3) | 0); // cada pelota tumba 1-3 latas
  for (let i = 0; i < n && up.length; i++) {
    const k = up.splice((Math.random() * up.length) | 0, 1)[0];
    k.visible = false;
    _c2burst(k.position.x, k.position.y, k.position.z, [0xffd23f, 0xffffff], 8, 4);
  }
  c.att++;
  _c2click();
  if (!c.list.some(k => k.visible)) {
    c.done = true;
    const prize = 15 + ((Math.random() * 16) | 0); // +15..30 🪙
    _c2earn(prize); _c2coin();
    _c2burst(c.x, 3, c.z, [0xffd23f, 0xff2fd6, 0x59d867, 0xffffff], 30, 7);
    _c2toast(_c2T('c2.fullHit') + ' +' + prize + ' 🪙');
    _c2closePanel();
    return;
  }
  _c2cansPanel();
}
/* ---- 🎈 globos con dardos: 6 globos, un dardo revienta 1, premio +15..30 🪙 ---- */
function _c2buildDartsStall(g, px, pz) {
  _c2buildGameStall(g, px, pz, ['🎈', 'GLOBOS'], 0x00a2ff);
  _c2box(g, 3.6, 2.6, 0.25, 0x3a2a1a, px, 2.4, pz - 0.75); // tablero
  const darts = [];
  const cols = [0xff2fd6, 0x00e5ff, 0xffe95e, 0x59d867, 0xff6f00, 0xff3d5e];
  for (let i = 0; i < 6; i++) {
    const bx = px - 1.2 + (i % 3) * 1.2, by = 2.1 + ((i / 3) | 0) * 1.1;
    const b = new THREE.Mesh(_c2geo('balloon', () => new THREE.SphereGeometry(0.36, 10, 10)),
      _c2mat(cols[i % cols.length], cols[i % cols.length], 0.4));
    b.position.set(bx, by, pz - 0.55);
    g.add(b);
    darts.push(b);
  }
  CL2.fair.darts = { x: px, z: pz, list: darts, att: 0, done: false };
}
function _c2dartsPanel() {
  const d = CL2.fair.darts;
  if (!d || d.done) return;
  let row = '';
  for (let i = 0; i < d.list.length; i++) row += d.list[i].visible ? '🎈' : '💥';
  let html = '<h2>🎈 ' + _c2T('c2.darts') + '</h2>';
  html += '<div class="c2-card" style="font-size:26px">' + row + '</div>';
  html += '<div class="c2-card">' + _c2T('c2.dartsLeft') + ': ' +
    d.list.filter(k => k.visible).length + '</div>';
  html += '<div class="menu-buttons"><button class="btn btn-big" data-d="go">🎯 ' +
    _c2T('c2.throwDart') + '</button>';
  html += '<button class="btn" data-c2close>✕ ' + _c2T('c2.close') + '</button></div>';
  _c2openPanel(html);
  try {
    CL2.panel.querySelector('[data-d="go"]').addEventListener('click', () => _c2dartsThrow());
  } catch (e) {}
}
function _c2dartsThrow() {
  const d = CL2.fair.darts;
  if (!d || d.done) return;
  const up = d.list.filter(k => k.visible);
  if (!up.length) return;
  const k = up[(Math.random() * up.length) | 0];
  k.visible = false;
  _c2burst(k.position.x, k.position.y, k.position.z, [0xff2fd6, 0xffffff, 0xffe95e], 10, 4);
  d.att++;
  _c2click();
  if (!d.list.some(kk => kk.visible)) {
    d.done = true;
    const prize = 15 + ((Math.random() * 16) | 0); // +15..30 🪙
    _c2earn(prize); _c2coin();
    _c2burst(d.x, 3, d.z, [0xff2fd6, 0x00e5ff, 0xffe95e, 0xffffff], 30, 7);
    _c2toast(_c2T('c2.fullPop') + ' +' + prize + ' 🪙');
    _c2closePanel();
    return;
  }
  _c2dartsPanel();
}

/* ============================== e) ⛪ IGLESIA y 🏥 HOSPITAL ============================== */
function _c2buildCivic(ext, int, kind) {
  // exterior
  const g = new THREE.Group();
  const wallC = kind === 'church' ? 0xf5f0e6 : 0xe8f4ff;
  _c2box(g, 9, 0.25, 8, 0xcfc4ae, 0, 0.12, 0);
  _c2box(g, 9, 4.2, 0.4, wallC, 0, 2.1, -3.8);
  _c2box(g, 0.4, 4.2, 8, wallC, -4.3, 2.1, 0);
  _c2box(g, 0.4, 4.2, 8, wallC, 4.3, 2.1, 0);
  _c2box(g, 3.2, 4.2, 0.4, wallC, -2.9, 2.1, 3.8);  // frente con hueco de puerta
  _c2box(g, 3.2, 4.2, 0.4, wallC, 2.9, 2.1, 3.8);
  _c2box(g, 9.6, 0.5, 8.6, kind === 'church' ? 0x8e2a5c : 0xc23b2e, 0, 4.45, 0); // techo plano
  if (kind === 'church') { // campanario + cruz (símbolo religioso, diseño propio)
    _c2box(g, 1.6, 3.2, 1.6, wallC, 0, 6, -2);
    _c2box(g, 0.25, 1.6, 0.25, 0xffd23f, 0, 8.2, -2, 0, 0xffd23f, 0.5);
    _c2box(g, 0.9, 0.25, 0.25, 0xffd23f, 0, 8.3, -2, 0, 0xffd23f, 0.5);
  }
  const tex = _c2signTex(kind === 'church' ? ['⛪', _c2T('c2.church')] : ['🏥', _c2T('c2.hospital')],
    kind === 'church' ? '#fff7e0' : '#ffffff', kind === 'church' ? '#8e2a5c' : '#c23b2e');
  _c2postSign(g, tex, 0, 6.4, 5, 2, 0);
  g.position.set(ext[0], 0, ext[1]);
  CL2.group.add(g);
  // interior (cuarto cerrado en otra zona del mapa, a nivel del suelo)
  const gi = new THREE.Group();
  _c2box(gi, 12, 0.25, 10, 0xb09a7a, 0, 0.12, 0);
  _c2box(gi, 12, 4, 0.4, wallC, 0, 2, -4.8);
  _c2box(gi, 0.4, 4, 10, wallC, -5.8, 2, 0);
  _c2box(gi, 0.4, 4, 10, wallC, 5.8, 2, 0);
  _c2box(gi, 4.4, 4, 0.4, wallC, -3.8, 2, 4.8);
  _c2box(gi, 4.4, 4, 0.4, wallC, 3.8, 2, 4.8);
  _c2box(gi, 12.6, 0.4, 10.6, 0x6b5a44, 0, 4.2, 0); // techo
  _c2box(gi, 2, 0.3, 1, 0xfff6b0, -2, 3.9, 0, 0, 0xfff6b0, 0.9); // lámparas
  _c2box(gi, 2, 0.3, 1, 0xfff6b0, 2, 3.9, 0, 0, 0xfff6b0, 0.9);
  if (kind === 'church') {
    for (let i = 0; i < 3; i++) { // bancas
      _c2box(gi, 3.4, 0.5, 0.9, 0x7a4a21, -2.4, 0.7, -1 + i * 1.8);
      _c2box(gi, 3.4, 0.5, 0.9, 0x7a4a21, 2.4, 0.7, -1 + i * 1.8);
    }
    _c2box(gi, 2, 1, 1, 0xfff7e0, 0, 0.75, -3.6); // altar
    _c2box(gi, 0.25, 1.6, 0.25, 0xffd23f, 0, 2.2, -3.6, 0, 0xffd23f, 0.5);
    _c2box(gi, 0.9, 0.25, 0.25, 0xffd23f, 0, 2.3, -3.6, 0, 0xffd23f, 0.5);
  } else {
    for (let i = 0; i < 2; i++) { // camillas
      _c2box(gi, 1.2, 0.5, 2.6, 0xffffff, -3 + i * 6, 0.6, -2);
      _c2box(gi, 1.1, 0.25, 0.7, 0x9fd8ff, -3 + i * 6, 1.0, -2.9);
    }
    _c2box(gi, 3, 1.1, 1.4, 0xd6dbe2, 3, 0.8, 3); // recepción
    const cross = _c2signTex(['＋'], '#ffffff', '#c23b2e');
    try { const cm = doubleFaceSign(2.4, 2.4, cross, 0, 2.6, -4.5, 0); gi.add(cm); } catch (e) {}
  }
  gi.position.set(int[0], 0, int[1]);
  CL2.group.add(gi);
  // triggers de puerta: exterior → interior y viceversa
  CL2.doors.push({ x: ext[0], z: ext[1] + 5.2, tx: int[0], tz: int[1] + 3.4, name: _c2T(kind === 'church' ? 'c2.church' : 'c2.hospital'), kind: kind });
  CL2.doors.push({ x: int[0], z: int[1] + 5.6, tx: ext[0], tz: ext[1] + 6.4, name: _c2T(kind === 'church' ? 'c2.church' : 'c2.hospital'), kind: kind, back: true });
  if (kind === 'hospital') CL2.hospDoor = { x: ext[0], z: ext[1] + 5.2 }; // puerta exterior (rescates)
}
function _c2tp(x, z) {
  try {
    Player.pos.set(x, 1, z);
    if (Player.vel) Player.vel.set(0, 0, 0);
  } catch (e) {}
}
function _c2updateDoors(dt) {
  if (CL2.tpCd > 0) { CL2.tpCd -= dt; return; }
  const p = _c2playerPos(); if (!p || !_c2onFoot()) return;
  for (const d of CL2.doors) {
    if (_c2d2(p.x, p.z, d.x, d.z) < 5) { // < ~2.2 m
      _c2tp(d.tx, d.tz);
      CL2.tpCd = 1.2;
      CL2.inside = d.back ? null : d.kind;
      _c2toast(d.name + ' ' + _c2T('c2.entered'));
      _c2click();
      break;
    }
  }
}
function _c2heal() {
  if (CL2.inside !== 'hospital') return;
  if ((SAVE.coins || 0) < 10) { _c2toast(_c2T('c2.noMoney')); try { Audio2.deny(); } catch (e) {} return; }
  _c2earn(-10);
  const p = _c2playerPos();
  if (p) _c2burst(p.x, 2, p.z, [0x59ff7a, 0xffffff, 0x9dff6e], 26, 5);
  try { Audio2.good(); } catch (e) {}
  _c2toast(_c2T('c2.healed'));
}

/* ============================== j) 👨‍⚕️ HOSPITAL INTERACTIVO: trabajo de doctor ==============================
   Turno de doctor/paramédico dentro del hospital (botón "👨‍⚕️ TRABAJAR"):
   llegan pacientes NPC (muñecos de bloques originales) con síntomas visibles
   (🤒 fiebre/cara roja, 🤕 herida/venda, 🤧 tos/nubecita). Minijuego en 2 pasos:
   1) diagnosticar con la herramienta correcta (🌡️/🩹/💊): +10 🪙;
   2) aplicar tratamiento: paciente curado, +15 🪙 + propina + reputación.
   SAVE.doctorRep (0..100): +4 por curado, -3 si un paciente se va molesto.
   A más reputación, más pacientes (hasta 4) y mejor propina (+2 por cada 25).
   Durante el turno llegan llamadas de emergencia: la ambulancia de citylife1.js
   (abordable con SUBIR) recoge al paciente del 📍 y lo lleva al hospital (+25 🪙). */
const C2_DOC_SYMPTOMS = ['fever', 'wound', 'cough'];
const C2_DOC_TOOL = { fever: 'thermo', wound: 'bandage', cough: 'med' };
const C2_DOC_TOOLKEY = { thermo: 'c2.toolThermo', bandage: 'c2.toolBandage', med: 'c2.toolMed' };
const C2_DOC_SYMKEY = { fever: 'c2.symptomFever', wound: 'c2.symptomWound', cough: 'c2.symptomCough' };
const C2_DOC_SYMEMOJI = { fever: '🤒', wound: '🤕', cough: '🤧' };
const C2_DOC_DIAG_PAY = 10, C2_DOC_CURE_PAY = 15;
function _c2docShift() { return !!(CL2.doc && CL2.doc.shift); }
function _c2docWaiting() {
  const pts = (CL2.doc && CL2.doc.patients) || [];
  let n = 0;
  for (const p of pts) if (p.state === 'wait') n++;
  return n;
}
function _c2docMaxPatients() {
  const r = _c2docRepGet();
  return r >= 75 ? 4 : r >= 50 ? 3 : r >= 25 ? 2 : 1;
}
/* origen del interior del hospital (de la puerta trasera registrada) */
function _c2docInterior() {
  try {
    for (const d of CL2.doors) {
      if (d.kind === 'hospital' && d.back) return { x: d.x, z: d.z - 5.6 };
    }
  } catch (e) {}
  return null;
}
/* paciente NPC: muñeco de bloques original con síntoma visible */
function _c2buildPatientMesh(symptom) {
  const g = new THREE.Group();
  const shirt = [0x2fa9ff, 0xff9f2f, 0x59d668, 0xff6b9d][(Math.random() * 4) | 0];
  _c2cyl(g, 0.13, 0.15, 0.5, 0x2b2f3a, -0.15, 0.25, 0);   // piernas
  _c2cyl(g, 0.13, 0.15, 0.5, 0x2b2f3a, 0.15, 0.25, 0);
  _c2cyl(g, 0.32, 0.38, 1.1, shirt, 0, 0.85, 0);          // cuerpo
  const head = new THREE.Mesh(_c2geo('hd', () => new THREE.SphereGeometry(0.3, 10, 10)),
    _c2mat(symptom === 'fever' ? 0xe0342b : 0xf2c89b));   // 🤒 cara roja con fiebre
  head.position.y = 1.68; g.add(head);
  if (symptom === 'wound') {                              // 🤕 venda en la cabeza
    _c2box(g, 0.68, 0.16, 0.68, 0xffffff, 0, 1.8, 0);
  } else if (symptom === 'cough') {                       // 🤧 nubecita de tos
    const cloud = new THREE.Group();
    _c2box(cloud, 0.5, 0.3, 0.3, 0xffffff, 0, 0, 0);
    _c2box(cloud, 0.3, 0.24, 0.3, 0xf2f4f8, 0.32, 0.12, 0);
    _c2box(cloud, 0.3, 0.24, 0.3, 0xf2f4f8, -0.32, 0.12, 0);
    cloud.position.set(0.6, 1.8, 0);
    g.add(cloud); g.userData.cloud = cloud;
  }
  try { // emoji flotante del síntoma (ayuda visual táctil)
    const spr = _c2emojiSprite(C2_DOC_SYMEMOJI[symptom]);
    if (spr) { spr.position.y = 2.6; g.add(spr); g.userData.emo = spr; }
  } catch (e) {}
  return g;
}
const _c2emojiCache = {};
function _c2emojiSprite(emoji) {
  if (_c2emojiCache[emoji]) return _c2emojiCache[emoji].clone();
  try {
    const tex = canvasTex(128, 128, function (g) {
      g.font = '96px serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(emoji, 64, 70);
    });
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    spr.scale.set(1.7, 1.7, 1);
    _c2emojiCache[emoji] = spr;
    return spr.clone();
  } catch (e) { return null; }
}
/* crea un paciente en un lugar libre del interior (symptom opcional: para pruebas) */
function _c2docSpawn(forceSymptom) {
  try {
    if (!_c2inCity() || !CL2.group) return null;
    if (!CL2.doc) CL2.doc = { shift: false, patients: [], spawnT: 6, rescueCd: 90 };
    const org = _c2docInterior();
    if (!org) return null;
    const spots = [[-4.5, 0.5], [-4.5, -1.5], [4.5, 0.5], [0, -3.8]];
    const used = {};
    for (const p of CL2.doc.patients) if (p.spot != null) used[p.spot] = true;
    let si = -1;
    for (let i = 0; i < spots.length; i++) if (!used[i]) { si = i; break; }
    if (si < 0) return null;
    const sym = forceSymptom || C2_DOC_SYMPTOMS[(Math.random() * 3) | 0];
    const mesh = _c2buildPatientMesh(sym);
    mesh.position.set(org.x + spots[si][0], 0, org.z + spots[si][1]);
    mesh.rotation.y = (Math.random() - 0.5) * 1.2;
    CL2.group.add(mesh);
    const pt = { mesh: mesh, symptom: sym, diag: false, wait: 0, maxWait: 80, spot: si, state: 'wait', leaveT: 0, happy: false, anim: Math.random() * 6 };
    CL2.doc.patients.push(pt);
    return pt;
  } catch (e) { return null; }
}
function _c2docRemove(pt) {
  try {
    if (pt.mesh && pt.mesh.parent) pt.mesh.parent.remove(pt.mesh);
  } catch (e) {}
  try {
    const i = CL2.doc.patients.indexOf(pt);
    if (i >= 0) CL2.doc.patients.splice(i, 1);
  } catch (e) {}
}
/* alternar turno de doctor (solo dentro del hospital) */
function _c2docToggle() {
  try {
    if (CL2.inside !== 'hospital') return false;
    if (_c2docShift()) { _c2docEndShift(false); return true; }
    _c2docRepGet();
    CL2.doc = { shift: true, patients: [], spawnT: 2.5, rescueCd: 75 + Math.random() * 60 };
    _c2toast(_c2T('c2.docStart'));
    _c2banner(_c2T('c2.docWork'), _c2T('c2.docStart'), 3500);
    _c2click();
    return true;
  } catch (e) { return false; }
}
/* termina el turno (silent: sin mensajes, para cambios de nivel) */
function _c2docEndShift(silent) {
  try {
    if (CL2.doc) {
      for (const p of CL2.doc.patients.slice()) _c2docRemove(p);
      CL2.doc.patients = [];
      CL2.doc.shift = false;
    }
    try { if (typeof CityLife1 !== 'undefined' && CityLife1.cancelRescue) CityLife1.cancelRescue(); } catch (e) {}
    if (!silent && typeof toast === 'function') {
      _c2toast(_c2T('c2.docEndT'));
      _c2setChip('');
    }
    try { _c2closePanel(); } catch (e) {}
  } catch (e) {}
}
/* panel del paciente: 1) diagnosticar con herramienta 2) tratar */
function _c2docPanel(pt) {
  if (!pt || pt.state !== 'wait') return;
  let html = '<h2>🧍 ' + _c2T('c2.patient') + '</h2>';
  html += '<div class="c2-card" style="font-size:16px">' + _c2T(C2_DOC_SYMKEY[pt.symptom]) + '</div>';
  const big = 'style="min-height:52px;min-width:52px;font-size:19px;font-weight:900;margin:4px;padding:14px 18px;"';
  if (!pt.diag) {
    html += '<div style="font-size:15px;margin:6px 0">' + _c2T('c2.diagQ') + '</div><div class="c2-row">';
    ['thermo', 'bandage', 'med'].forEach(function (tool) {
      html += '<button class="btn" data-doc="' + tool + '" ' + big + '>' + _c2T(C2_DOC_TOOLKEY[tool]) + '</button>';
    });
    html += '</div>';
  } else {
    html += '<div class="c2-card">✅ ' + _c2T(C2_DOC_TOOLKEY[C2_DOC_TOOL[pt.symptom]]) + '</div>';
    html += '<div class="c2-row"><button class="btn" data-doc="treat" ' + big + '>' + _c2T('c2.treat') + '</button></div>';
  }
  html += '<div class="menu-buttons"><button class="btn" data-c2close>✕ ' + _c2T('c2.close') + '</button></div>';
  _c2openPanel(html);
  try {
    const btns = CL2.panel.querySelectorAll('[data-doc]');
    Array.prototype.forEach.call(btns, function (b) {
      b.addEventListener('click', function () {
        const k = b.getAttribute('data-doc');
        if (k === 'treat') _c2docTreat(pt);
        else _c2docDiagnose(pt, k);
      });
    });
  } catch (e) {}
}
/* paso 1: diagnosticar — herramienta correcta +10 🪙, incorrecta sin castigo */
function _c2docDiagnose(pt, tool) {
  try {
    if (!pt || pt.state !== 'wait' || pt.diag) return false;
    if (C2_DOC_TOOL[pt.symptom] === tool) {
      pt.diag = true;
      _c2earn(C2_DOC_DIAG_PAY);
      _c2coin();
      _c2toast(_c2T('c2.diagOk'));
      _c2docPanel(pt); // refresca: ahora muestra el botón de tratar
      return true;
    }
    _c2toast(_c2T('c2.diagNo'));
    try { if (typeof Audio2 !== 'undefined' && Audio2.deny) Audio2.deny(); } catch (e) {}
    return false;
  } catch (e) { return false; }
}
/* paso 2: tratar — requiere diagnóstico; cura: +15 🪙 + propina + reputación */
function _c2docTreat(pt) {
  try {
    if (!pt || pt.state !== 'wait') return false;
    if (!pt.diag) { _c2toast(_c2T('c2.needDiag')); return false; }
    const rep = _c2docRepGet();
    const tip = Math.floor(rep / 25) * 2; // +2 por cada 25 de reputación
    _c2earn(C2_DOC_CURE_PAY + tip);
    _c2coin();
    const rep2 = _c2docRepAdd(4);
    pt.state = 'leaving'; pt.happy = true; pt.leaveT = 0;
    try {
      if (pt.mesh) {
        _c2burst(pt.mesh.position.x, 2, pt.mesh.position.z, [0x59ff7a, 0xffffff, 0xffe95e], 26, 5);
        if (pt.mesh.userData.emo) pt.mesh.userData.emo.visible = false;
      }
    } catch (e) {}
    try { if (typeof Audio2 !== 'undefined' && Audio2.good) Audio2.good(); } catch (e) {}
    _c2toast(_c2T('c2.cured') + (tip > 0 ? ' · ' + _c2T('c2.tip') + tip + ' 🪙' : '') + ' · ' + _c2T('c2.rep') + ' ' + rep2);
    _c2closePanel();
    return true;
  } catch (e) { return false; }
}
/* llamadas de emergencia → rescate en ambulancia (citylife1.js) */
function _c2docDispatchRescue() {
  try {
    if (typeof CityLife1 === 'undefined' || !CityLife1.startRescue) return false;
    const door = _c2hospitalDoor();
    if (!door) return false;
    if (CityLife1.rescueInfo && CityLife1.rescueInfo()) return false; // ya hay un rescate
    if (CityLife1.startRescue(door.x, door.z)) {
      _c2banner('🚑', _c2T('c2.rescue'), 4500);
      return true;
    }
    return false;
  } catch (e) { return false; }
}
/* update del turno: llegada de pacientes, paciencia, animaciones y rescates */
function _c2updateDoc(dt) {
  try {
    if (!_c2docShift() || !_c2inCity()) return;
    const d = CL2.doc;
    // llegada de pacientes (más con más reputación, hasta 4)
    d.spawnT -= dt;
    if (d.spawnT <= 0) {
      d.spawnT = 12 + Math.random() * 9;
      if (_c2docWaiting() < _c2docMaxPatients()) {
        const pt = _c2docSpawn();
        if (pt) _c2toast('🧍 ' + _c2T('c2.patient') + ' ' + _c2T(C2_DOC_SYMKEY[pt.symptom]));
      }
    }
    // paciencia: si espera demasiado se va molesto (-3 reputación)
    for (const pt of d.patients.slice()) {
      if (pt.state === 'wait') {
        pt.wait += dt;
        pt.anim += dt;
        // la nubecita de tos flota
        try {
          if (pt.mesh && pt.mesh.userData.cloud)
            pt.mesh.userData.cloud.position.y = 1.8 + Math.sin(pt.anim * 4) * 0.12;
        } catch (e) {}
        if (pt.wait >= pt.maxWait) {
          pt.state = 'leaving'; pt.happy = false; pt.leaveT = 0;
          _c2docRepAdd(-3);
          _c2toast(_c2T('c2.angry') + ' · ' + _c2T('c2.rep') + ' ' + _c2docRepGet());
          try { if (typeof Audio2 !== 'undefined' && Audio2.deny) Audio2.deny(); } catch (e) {}
        }
      } else if (pt.state === 'leaving') {
        pt.leaveT += dt;
        try {
          if (pt.mesh) {
            if (pt.happy) { // curado: salta de alegría y se va
              pt.mesh.position.y = Math.abs(Math.sin(pt.leaveT * 7)) * 0.45;
              pt.mesh.rotation.y += dt * 3;
            } else { // molesto: se aleja caminando hacia la puerta
              pt.mesh.position.z += dt * 2.2;
              pt.mesh.rotation.y = Math.sin(pt.leaveT * 9) * 0.15;
            }
            if (pt.mesh.userData.emo) pt.mesh.userData.emo.visible = false;
          }
        } catch (e) {}
        if (pt.leaveT > 2.6) _c2docRemove(pt);
      }
    }
    // llamada de emergencia cada tanto (si no hay rescate activo)
    d.rescueCd -= dt;
    if (d.rescueCd <= 0) {
      d.rescueCd = 110 + Math.random() * 70;
      _c2docDispatchRescue();
    }
  } catch (e) {}
}
/* puerta exterior del hospital (para que citylife1.js ubique el rescate) */
function _c2hospitalDoor() {
  try {
    if (!_c2inCity() || !CL2.hospDoor) return null;
    return { x: CL2.hospDoor.x, z: CL2.hospDoor.z };
  } catch (e) { return null; }
}
/* instantánea del turno para pruebas */
function _c2docState() {
  try {
    return {
      shift: _c2docShift(), rep: _c2docRepGet(),
      patients: ((CL2.doc && CL2.doc.patients) || []).map(function (p) {
        return { symptom: p.symptom, diag: p.diag, wait: Math.round(p.wait), state: p.state };
      }),
    };
  } catch (e) { return { shift: false, rep: 0, patients: [] }; }
}

/* ============================== i) 🕹️ ARCADE ============================== */
function _c2buildArcade(x, z) {
  const g = new THREE.Group();
  _c2box(g, 12, 0.25, 9, 0x3a3f52, 0, 0.12, 0);
  _c2box(g, 12, 3.6, 0.4, 0x2b2f3a, 0, 1.8, -4.3);
  _c2box(g, 0.4, 3.6, 9, 0x2b2f3a, -5.8, 1.8, 0);
  _c2box(g, 0.4, 3.6, 9, 0x2b2f3a, 5.8, 1.8, 0);
  _c2box(g, 12.6, 0.4, 9.6, 0x7b2fff, 0, 3.8, 0); // techo neón
  const cols = [0xff2fd6, 0x00e5ff, 0xffe95e];
  for (let i = 0; i < 3; i++) { // 3 maquinitas (diseño propio)
    const mx = -3.4 + i * 3.4;
    _c2box(g, 1.6, 2.4, 1.1, 0x1c1c22, mx, 1.45, -2.6);
    _c2box(g, 1.3, 0.9, 0.12, cols[i], mx, 1.95, -2.0, 0, cols[i], 0.9); // pantalla
    _c2box(g, 1.4, 0.5, 0.9, 0x2b2f3a, mx, 0.95, -2.35); // panel botones
    _c2cyl(g, 0.09, 0.09, 0.1, 0xff3d5e, mx - 0.3, 1.25, -2.3);
    _c2cyl(g, 0.09, 0.09, 0.1, 0x59ff7a, mx + 0.3, 1.25, -2.3);
  }
  _c2postSign(g, _c2signTex(['🕹️', 'ARCADIA'], '#14141c', '#00e5ff'), 0, 6.2, 5, 2, 0);
  g.position.set(x, 0, z);
  CL2.group.add(g);
  CL2.arcadeSpot = { x: x, z: z + 6.4 };
}
/* memoria: 3 pares, $5 la partida, premio +$20 */
const C2_MEM_EMOJI = ['🍒', '⭐', '🔔'];
function _c2memStart() {
  if ((SAVE.coins || 0) < 5) { _c2toast(_c2T('c2.noMoney')); try { Audio2.deny(); } catch (e) {} return; }
  _c2earn(-5);
  const deck = [0, 0, 1, 1, 2, 2];
  for (let i = deck.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const t = deck[i]; deck[i] = deck[j]; deck[j] = t; }
  CL2.mem = { cards: deck.map(v => ({ v: v, open: false, done: false })), first: -1, lock: false };
  _c2renderMem();
  _c2click();
}
function _c2renderMem() {
  const m = CL2.mem; if (!m) return;
  let html = '<h2>' + _c2T('c2.memTitle') + '</h2><div class="c2-mem">';
  m.cards.forEach((c, i) => {
    html += '<button data-m="' + i + '">' + (c.open || c.done ? C2_MEM_EMOJI[c.v] : _c2T('c2.cardBack')) + '</button>';
  });
  html += '</div><div class="menu-buttons"><button class="btn" data-c2close>✕ ' + _c2T('c2.close') + '</button></div>';
  _c2openPanel(html);
  try {
    Array.prototype.forEach.call(CL2.panel.querySelectorAll('[data-m]'), b => {
      b.addEventListener('click', () => _c2memFlip(parseInt(b.getAttribute('data-m'), 10)));
    });
  } catch (e) {}
}
function _c2memFlip(i) {
  const m = CL2.mem; if (!m || m.lock) return;
  const c = m.cards[i]; if (!c || c.open || c.done) return;
  c.open = true; _c2click();
  if (m.first < 0) { m.first = i; }
  else {
    const a = m.cards[m.first];
    m.lock = true;
    if (a.v === c.v) {
      a.done = true; c.done = true; m.first = -1; m.lock = false;
      try { Audio2.good(); } catch (e) {}
      if (m.cards.every(k => k.done)) {
        _c2earn(20); _c2coin();
        _c2toast(_c2T('c2.memWin'));
        CL2.mem = null; _c2closePanel();
        return;
      }
    } else {
      const f = m.first; m.first = -1;
      setTimeout(() => { // voltear de nuevo tras verlas
        try { a.open = false; c.open = false; } catch (e) {}
        m.lock = false;
        if (CL2.mem) _c2renderMem();
      }, 700);
    }
  }
  _c2renderMem();
}

/* ============================== f) 📻 RADIO EN CARROS ============================== */
/* 3 melodías originales (notas inventadas), WebAudio, volumen bajo */
const C2_STATIONS = [
  { key: 'c2.st1', seq: [523, 659, 784, 659, 880, 784, 659, 587] },
  { key: 'c2.st2', seq: [196, 262, 294, 262, 196, 174, 196, 147] },
  { key: 'c2.st3', seq: [440, 523, 587, 523, 659, 587, 523, 440] },
];
function _c2radioTick() {
  const r = CL2.radio;
  if (r.st < 0) return;
  const st = C2_STATIONS[r.st]; if (!st) return;
  const f = st.seq[r.step % st.seq.length];
  r.step++;
  try {
    if (!r.muted && typeof Audio2 !== 'undefined' && Audio2.ctx) Audio2.tone(f, 0.22, 'triangle', 0.05);
  } catch (e) {}
}
function _c2radioPlay(i) {
  _c2radioStop();
  CL2.radio.st = i; CL2.radio.step = 0;
  try { SAVE.cl2.radio.st = i; persist(); } catch (e) {}
  try { CL2.radio.timer = setInterval(_c2radioTick, 260); } catch (e) {}
  _c2click();
  _c2radioPanel();
}
function _c2radioStop() {
  const r = CL2.radio;
  try { if (r.timer) clearInterval(r.timer); } catch (e) {}
  r.timer = null; r.st = -1;
}
function _c2radioMute() {
  CL2.radio.muted = !CL2.radio.muted;
  try { SAVE.cl2.radio.muted = CL2.radio.muted; persist(); } catch (e) {}
  _c2click();
  _c2radioPanel();
}
function _c2radioPanel() {
  let html = '<h2>📻 ' + _c2T('c2.radio') + '</h2>';
  C2_STATIONS.forEach((st, i) => {
    html += '<div class="menu-buttons"><button class="btn' + (CL2.radio.st === i ? ' btn-big' : '') +
      '" data-s="' + i + '">' + (CL2.radio.st === i ? '▶ ' : '') + _c2T(st.key) + '</button></div>';
  });
  html += '<div class="menu-buttons">';
  html += '<button class="btn" data-s="mute">' + _c2T(CL2.radio.muted ? 'c2.unmute' : 'c2.mute') + '</button>';
  html += '<button class="btn" data-s="off">' + _c2T('c2.stop') + '</button>';
  html += '<button class="btn" data-c2close>✕ ' + _c2T('c2.close') + '</button></div>';
  _c2openPanel(html);
  try {
    Array.prototype.forEach.call(CL2.panel.querySelectorAll('[data-s]'), b => {
      b.addEventListener('click', () => {
        const v = b.getAttribute('data-s');
        if (v === 'mute') _c2radioMute();
        else if (v === 'off') { _c2radioStop(); _c2closePanel(); }
        else _c2radioPlay(parseInt(v, 10));
      });
    });
  } catch (e) {}
}
function _c2updateRadio() {
  let show = false;
  try {
    show = _c2inCity() && (typeof MODE !== 'undefined' && MODE === 'play') &&
      (typeof Vehicle !== 'undefined' && Vehicle.mode === 'car');
  } catch (e) {}
  try { if (CL2.radioBtn) CL2.radioBtn.style.display = show ? '' : 'none'; } catch (e) {}
  if (!show && CL2.radio.st >= 0) _c2radioStop(); // bajar del carro apaga la radio
}

/* ============================== g/h) ⛈️ TORMENTA y 🌀 HURACÁN ============================== */
/* ⛈️ opcional: el jugador las activa en Ajustes (SAVE.storms). Apagadas = nunca arrancan solas. */
function _c2stormsEnabled() {
  try { return !!(typeof SAVE !== 'undefined' && SAVE.storms); } catch (e) { return false; }
}
function _c2makeRain() {
  if (CL2.rain) return;
  try {
    const N = 260, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 36;
      pos[i * 3 + 1] = Math.random() * 22;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 36;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: 0x9fc8ff, size: 0.18, transparent: true, opacity: 0.7, depthWrite: false });
    const pts = new THREE.Points(geo, mat);
    pts.visible = false; pts.frustumCulled = false;
    scene.add(pts);
    CL2.rain = { pts: pts, pos: pos, geo: geo, n: N, heavy: false };
  } catch (e) {}
}
function _c2rainOn(heavy) {
  _c2makeRain();
  try { if (CL2.rain) { CL2.rain.pts.visible = true; CL2.rain.heavy = !!heavy; } } catch (e) {}
}
function _c2rainOff() {
  try { if (CL2.rain) CL2.rain.pts.visible = false; } catch (e) {}
}
function _c2updateRain(dt) {
  const r = CL2.rain;
  if (!r || !r.pts.visible) return;
  const p = _c2playerPos();
  const vy = (r.heavy ? 46 : 30) * dt, vx = (r.heavy ? 6 : 1.5) * dt;
  for (let i = 0; i < r.n; i++) {
    const j = i * 3;
    r.pos[j + 1] -= vy;
    r.pos[j] += vx;
    if (r.pos[j + 1] < 0) {
      r.pos[j + 1] = 22;
      r.pos[j] = (Math.random() - 0.5) * 36;
      r.pos[j + 2] = (Math.random() - 0.5) * 36;
    }
    if (r.pos[j] > 18) r.pos[j] -= 36;
  }
  r.geo.attributes.position.needsUpdate = true;
  if (p) r.pts.position.set(p.x, p.y - 4, p.z);
}
function _c2showStormOv(op) {
  try {
    if (!CL2.stormOv) return;
    CL2.stormOv.style.display = op > 0 ? 'block' : 'none';
    CL2.stormOv.style.background = 'rgba(8,12,38,' + op + ')';
  } catch (e) {}
}
function _c2lightning() {
  try {
    const f = CL2.flashOv;
    if (f) {
      f.style.display = 'block'; f.style.opacity = '0.85';
      setTimeout(() => {
        try { f.style.opacity = '0'; } catch (e) {}
        setTimeout(() => { try { f.style.display = 'none'; } catch (e) {} }, 160);
      }, 110);
    }
  } catch (e) {}
  try { Audio2.noise(0.9, 0.5); Audio2.tone(55, 1.4, 'sine', 0.35, 0.05, 38); } catch (e) {} // trueno
  const p = _c2playerPos();
  if (p) _c2burst(p.x + (Math.random() - 0.5) * 30, 12, p.z + (Math.random() - 0.5) * 30, [0xffffff, 0x9fc8ff], 10, 8);
}
function _c2startStorm() {
  const s = CL2.storm;
  s.active = true; s.t = 0; s.bolt = 1.5; s.next = 90 + Math.random() * 90;
  _c2showStormOv(0.5); _c2rainOn(false);
  _c2banner(_c2T('c2.storm'), '⛈️🌧️');
}
function _c2endStorm() {
  CL2.storm.active = false;
  if (!CL2.hurr.active) { _c2showStormOv(0); _c2rainOff(); }
}
function _c2updateStorm(dt) {
  const s = CL2.storm;
  if (!_c2stormsEnabled()) { if (s.active) _c2endStorm(); return; } // ⛈️ apagadas: no arrancan solas
  if (!s.active) {
    if (!CL2.hurr.active) { s.next -= dt; if (s.next <= 0) _c2startStorm(); }
    return;
  }
  s.t += dt; s.bolt -= dt;
  if (s.bolt <= 0) { _c2lightning(); s.bolt = 3 + Math.random() * 5; }
  if (s.t >= 45) _c2endStorm();
}
/* sirena del huracán (oscilador propio, se apaga al terminar) */
function _c2sirenStart() {
  try {
    if (typeof Audio2 === 'undefined' || !Audio2.ctx || CL2.siren) return;
    Audio2.init();
    const ctx = Audio2.ctx;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = 650; g.gain.value = 0.045;
    const lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.type = 'sine'; lfo.frequency.value = 0.4; lg.gain.value = 250;
    lfo.connect(lg); lg.connect(o.frequency);
    o.connect(g); g.connect(ctx.destination);
    o.start(); lfo.start();
    CL2.siren = { o: o, g: g, lfo: lfo };
  } catch (e) {}
}
function _c2sirenStop() {
  try {
    if (CL2.siren) {
      try { CL2.siren.o.stop(); } catch (e) {}
      try { CL2.siren.lfo.stop(); } catch (e) {}
      try { CL2.siren.o.disconnect(); CL2.siren.g.disconnect(); } catch (e) {}
    }
  } catch (e) {}
  CL2.siren = null;
}
function _c2startHurr() {
  const h = CL2.hurr;
  h.active = true; h.t = 0; h.next = 320 + Math.random() * 200;
  if (CL2.storm.active) _c2endStorm();
  _c2showStormOv(0.62); _c2rainOn(true); _c2sirenStart();
  _c2banner(_c2T('c2.hurr'), _c2T('c2.hurrSub'), 6000);
}
function _c2endHurr() {
  CL2.hurr.active = false;
  _c2sirenStop(); _c2showStormOv(0); _c2rainOff();
  _c2banner(_c2T('c2.calm'), '☀️');
}
function _c2updateHurr(dt) {
  const h = CL2.hurr;
  if (!_c2stormsEnabled()) { if (h.active) _c2endHurr(); return; } // 🌀 apagado: no arranca solo
  if (!h.active) { h.next -= dt; if (h.next <= 0) _c2startHurr(); return; }
  h.t += dt;
  const p = _c2playerPos();
  if (p) {
    try {
      if (typeof Vehicle === 'undefined' || Vehicle.mode === 'none') {
        const w = Math.sin(h.t * 1.7) * 0.9 + 0.7; // ráfagas
        p.x += w * dt * 0.9;                        // el viento empuja leve
        p.z += Math.cos(h.t * 1.3) * dt * 0.5;
      }
    } catch (e) {}
    if (Math.random() < 0.3) _c2lightning();
  }
  try { // sacudida leve de cámara (se aplica sobre el follow del jugador)
    if (typeof camera !== 'undefined') {
      camera.position.x += (Math.random() - 0.5) * 0.22;
      camera.position.y += (Math.random() - 0.5) * 0.14;
    }
  } catch (e) {}
  if (h.t >= 60) _c2endHurr();
}

/* ============================== proximidad (botón contextual) ============================== */
function _c2proposeAct(label, fn) {
  if (!CL2._actSet) { _c2setAct(label, fn); CL2._actSet = true; }
}
function _c2updateProximity() {
  const p = _c2playerPos();
  const s = C2_SPOTS[CL2.idx];
  if (!p || !s || !_c2onFoot()) return;
  // tour en el muelle
  if (s.dock && !CL2.tour && _c2d2(p.x, p.z, s.dock[0], s.dock[1]) < 25)
    _c2proposeAct('🚤 ' + _c2T('c2.tour'), _c2tourPanel);
  // casas
  for (let i = 0; i < CL2.houses.length; i++) {
    const h = CL2.houses[i];
    if (_c2d2(p.x, p.z, h.x, h.z + 4.6) < 20) { _c2proposeAct('🏠 ' + _c2T('c2.house'), (function (id) { return function () { _c2housePanel(id); }; })(i)); break; }
  }
  // arcade
  if (CL2.arcadeSpot && _c2d2(p.x, p.z, CL2.arcadeSpot.x, CL2.arcadeSpot.z) < 20)
    _c2proposeAct(_c2T('c2.play'), _c2memStart);
  // feria: puestos y aros
  if (CL2.fair.active) {
    // 🎡 noria subible: abordaje solo cuando hay cabina abajo
    const fr = CL2.fair.ride;
    if (!fr) {
      const bi = _c2wheelBoardIdx();
      const bs = CL2.fair.boardSpot;
      if (bi >= 0 && bs && _c2d2(p.x, p.z, bs.x, bs.z) < 16)
        _c2proposeAct('🎡 ' + _c2T('c2.board'), (function (i) { return function () { _c2wheelBoard(i); }; })(bi));
    } else if (fr.stage === 'done') {
      _c2proposeAct('⬇️ ' + _c2T('c2.exit'), _c2wheelExit);
    }
    // 🐴 carrusel subible
    const car = CL2.fair.car;
    if (car && !car.rider && _c2d2(p.x, p.z, car.boardSpot.x, car.boardSpot.z) < 16)
      _c2proposeAct('🐴 ' + _c2T('c2.board'), _c2carBoard);
    // 🥫 tumba-latas y 🎈 globos
    const cn = CL2.fair.cans;
    if (cn && !cn.done && _c2d2(p.x, p.z, cn.x, cn.z) < 16)
      _c2proposeAct('🥫 ' + _c2T('c2.cans'), _c2cansPanel);
    const da = CL2.fair.darts;
    if (da && !da.done && _c2d2(p.x, p.z, da.x, da.z) < 16)
      _c2proposeAct('🎯 ' + _c2T('c2.darts'), _c2dartsPanel);
    const stalls = CL2.fair.stalls || [];
    for (const st of stalls) {
      if (_c2d2(p.x, p.z, st.x, st.z) < 16) {
        _c2proposeAct('🎁 ' + _c2T('c2.prize'), (function (sx, sz) { return function () { _c2stallPrize(sx, sz); }; })(st.x, st.z));
        break;
      }
    }
    const rp = CL2.fair.ringSpot;
    if (rp && _c2d2(p.x, p.z, rp.x, rp.z) < 16)
      _c2proposeAct('🎯 ' + _c2T('c2.ring'), _c2ringPanel);
  }
  // trabajos (cuando no hay trabajo activo)
  if (CL2.del.stage === 'idle' && CL2.taxi.stage === 'idle') {
    if (_c2d2(p.x, p.z, s.depot[0], s.depot[1]) < 25 || _c2d2(p.x, p.z, s.taxi[0], s.taxi[1]) < 25)
      _c2proposeAct('💼 ' + _c2T('c2.jobs'), _c2jobsPanel);
  }
  // 👨‍⚕️ atender pacientes (dentro del hospital, turno activo)
  if (CL2.inside === 'hospital' && _c2docShift()) {
    const pts = (CL2.doc && CL2.doc.patients) || [];
    for (const pt of pts) {
      if (pt.state !== 'wait' || !pt.mesh) continue;
      if (_c2d2(p.x, p.z, pt.mesh.position.x, pt.mesh.position.z) < 12) {
        _c2proposeAct('🧍 ' + _c2T('c2.attend'), (function (pp) { return function () { _c2docPanel(pp); }; })(pt));
        break;
      }
    }
  }
}
function _c2updateMisc(dt) {
  // flecha guía flotante
  if (CL2.wp && CL2.wp.mesh) {
    CL2.wp.t += dt;
    CL2.wp.mesh.position.y = 4.5 + Math.sin(CL2.wp.t * 3) * 0.5;
    CL2.wp.mesh.rotation.y += dt * 1.2;
  }
  // abanico del airboat girando cuando se maneja
  try {
    if (typeof Vehicle !== 'undefined' && Vehicle.mode === 'car' && Vehicle.def &&
        Vehicle.def.vtype === 'geayi-airboat' && Vehicle.def.mesh && Vehicle.def.mesh.userData.fan) {
      Vehicle.def.mesh.userData.fan.rotation.z += dt * 14;
    }
  } catch (e) {}
  // botón 💚 curar solo dentro del hospital
  try { if (CL2.healBtn) CL2.healBtn.style.display = (CL2.inside === 'hospital') ? '' : 'none'; } catch (e) {}
  if (CL2.healBtn && CL2.inside === 'hospital') {
    try { CL2.healBtn.textContent = _c2T('c2.heal'); } catch (e) {}
  }
  // botón 👨‍⚕️ TRABAJAR / ⏹️ TERMINAR TURNO solo dentro del hospital
  try {
    if (CL2.docBtn) {
      const show = (CL2.inside === 'hospital');
      CL2.docBtn.style.display = show ? '' : 'none';
      if (show) CL2.docBtn.textContent = _c2T((_c2docShift() ? 'c2.docEnd' : 'c2.docWork'));
    }
  } catch (e) {}
  // chip del turno de doctor (solo cuando hay turno activo)
  try {
    if (_c2docShift()) {
      const n = _c2docWaiting();
      _c2setChip(_c2T('c2.docChip') + ' · ' + _c2T('c2.rep') + ' ' + _c2docRepGet() + ' · 🧍 ' + n);
    }
  } catch (e) {}
}

/* ============================== construir / limpiar ============================== */
function _c2buildCity() {
  const s = C2_SPOTS[CL2.idx];
  if (!s) return;
  CL2.group = new THREE.Group();
  try { LEVEL.group.add(CL2.group); } catch (e) { return; }
  s.houses.forEach((hp, i) => _c2buildHouse(hp[0], hp[1], C2_HOUSE_DEFS[i], i));
  _c2syncRenters();
  _c2buildCivic(s.church, s.churchIn, 'church');
  _c2buildCivic(s.hospital, s.hospitalIn, 'hospital');
  _c2buildArcade(s.arcade[0], s.arcade[1]);
  _c2postSign(CL2.group, _c2signTex(['📦', 'DEPÓSITO'], '#ff6f00', '#ffffff'), s.depot[0], s.depot[1], 4.4, 1.7, 0);
  _c2postSign(CL2.group, _c2signTex(['🚕', 'TAXI'], '#00a2ff', '#ffffff'), s.taxi[0], s.taxi[1], 4.4, 1.7, 0);
  _c2registerAirboat();
  if (s.dock && s.boat) {
    _c2postSign(CL2.group, _c2signTex(['🚤', 'TOUR'], '#00c2a8', '#ffffff'), s.dock[0], s.dock[1], 4.4, 1.7, 0);
    try {
      if (typeof addVehicle === 'function')
        addVehicle(LEVEL, 'geayi-airboat', s.boat[0], 0.15, s.boat[1], 0xff5533, true, 0.6);
    } catch (e) {}
  }
}
function _c2clearCity() {
  _c2clearWaypoint(); _c2clearFair();
  try { if (CL2.group && CL2.group.parent) CL2.group.parent.remove(CL2.group); } catch (e) {}
  CL2.group = null; CL2.houses = []; CL2.doors = []; CL2.renters = [];
  CL2.arcadeSpot = null;
  CL2.hospDoor = null;
  try { // retirar el airboat de este módulo
    const lvl = (typeof LEVEL !== 'undefined') ? LEVEL : null;
    if (lvl && lvl.cars) {
      for (let i = lvl.cars.length - 1; i >= 0; i--) {
        const c = lvl.cars[i];
        if (c.vtype === 'geayi-airboat') {
          if (c.mesh && c.mesh.parent) c.mesh.parent.remove(c.mesh);
          lvl.cars.splice(i, 1);
          if (typeof Vehicle !== 'undefined' && Vehicle.near && Vehicle.near.def === c) Vehicle.near = null;
        }
      }
    }
  } catch (e) {}
}
function _c2resetRun() {
  CL2.del = { stage: 'idle', a: null, b: null };
  CL2.taxi = { stage: 'idle', dest: null, pax: null };
  CL2.tour = null;
  CL2.inside = null; CL2.tpCd = 0;
  CL2.ring = { active: false, att: 0, hits: 0 };
  CL2.mem = null;
  CL2._actSet = false;
  _c2docEndShift(true); // 👨‍⚕️ termina el turno de doctor (silencioso)
  _c2clearWaypoint(); _c2clearFair();
  _c2radioStop(); _c2sirenStop();
  _c2showStormOv(0); _c2rainOff();
  CL2.storm = { active: false, t: 0, next: 80 + Math.random() * 60, bolt: 3 };
  CL2.hurr = { active: false, t: 0, next: 320 + Math.random() * 200 };
  CL2.fair.next = 200 + Math.random() * 120;
  _c2setAct(null, null); _c2setChip('');
  _c2closePanel();
}

/* ============================== módulo público ============================== */
const CityLife2 = {
  hospitalDoor: function () { return _c2hospitalDoor(); }, // puerta exterior del hospital (rescates)
  docState: function () { return _c2docState(); },         // instantánea del turno (pruebas)
  init: function () {
    try {
      _c2registerAirboat();
      _c2ensureUI();
      _c2makeRain();
      if (SAVE.cl2 && SAVE.cl2.radio) CL2.radio.muted = !!SAVE.cl2.radio.muted;
    } catch (e) {}
  },
  onLevelStart: function (idx) {
    CL2.idx = (typeof idx === 'number') ? idx : -1;
    try {
      _c2ensureUI();
      _c2resetRun();
      _c2clearCity();
      if (_c2inCity()) _c2buildCity();
    } catch (e) {}
  },
  onLevelEnd: function () {
    try {
      _c2resetRun();
      _c2clearCity();
      CL2.idx = -1;
      try { persist(); } catch (e) {}
    } catch (e) {}
  },
  update: function (dt) {
    try {
      _c2ensureUI();
      if (typeof MODE === 'undefined' || MODE !== 'play') {
        _c2setAct(null, null);
        try { if (CL2.radioBtn) CL2.radioBtn.style.display = 'none'; } catch (e) {}
        try { if (CL2.healBtn) CL2.healBtn.style.display = 'none'; } catch (e) {}
        try { if (CL2.docBtn) CL2.docBtn.style.display = 'none'; } catch (e) {}
        return;
      }
      CL2._actSet = false;
      if (!_c2inCity()) {
        _c2setAct(null, null); _c2setChip('');
        try { if (CL2.radioBtn) CL2.radioBtn.style.display = 'none'; } catch (e) {}
        try { if (CL2.healBtn) CL2.healBtn.style.display = 'none'; } catch (e) {}
        try { if (CL2.docBtn) CL2.docBtn.style.display = 'none'; } catch (e) {}
        return;
      }
      _c2rentTick(dt);
      _c2updateJobs(dt);
      _c2updateProximity();
      _c2updateDoc(dt); // 👨‍⚕️ turno de doctor en el hospital
      _c2updateTour(dt);
      _c2updateFair(dt);
      _c2updateDoors(dt);
      _c2updateRadio();
      _c2updateStorm(dt);
      _c2updateHurr(dt);
      _c2updateRain(dt);
      _c2updateMisc(dt);
    } catch (e) {}
  },
};

/* alias estilo game.js (como updateJobs) para el hook del loop */
function updateCityLife2(dt) { try { CityLife2.update(dt); } catch (e) {} }
function cityLife2LevelStart(idx) { try { CityLife2.onLevelStart(idx); } catch (e) {} }

/* tecla E = acción contextual (igual que en jobs.js) */
try {
  if (typeof window !== 'undefined' && !window.__c2keys) {
    window.__c2keys = true;
    window.addEventListener('keydown', function (e) {
      if (e.repeat) return;
      if (e.code === 'KeyE') _c2doAct();
    });
  }
} catch (e) {}

if (typeof window !== 'undefined') {
  window.CityLife2 = CityLife2;
  window.updateCityLife2 = updateCityLife2;
  window.cityLife2LevelStart = cityLife2LevelStart;
}
