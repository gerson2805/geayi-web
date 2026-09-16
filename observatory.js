/* observatory.js — 🔭 OBSERVATORIO GEAYI (mundo 4: Immokalee, idx 3)
   - Colina elevada + observatorio (cúpula) + telescopio interactivo.
   - Cerca del telescopio (a pie) aparece el botón flotante "🔭 MIRAR".
   - Al activarlo: modo SKY-VIEW (overlay fullscreen con estrellas y planetas).
   - Trofeo 'star' la primera vez que se mira el cielo.
   - Contrato: solo usa addObservatoryContent(idx,lvl) y updateObservatory(dt);
     el padre (parent) conecta ambas. Textos vía T('sky.*') + addStrings.
   - Diseño original GEAYI (nada copiado de marcas).
*/
'use strict';

const OBS = {
  built: false,
  hx: 36, hz: 55,          // centro de la colina
  topY: 2,                 // superficie de la cima
  tel: { x: 32, y: 1, z: 52 }, // ancla de interacción del telescopio
  beaconMat: null, domeSpin: null, ringMat: null,
  t: 0, skyOpen: false, trophyDone: false,
  btn: null, sky: null, info: null, nightNote: null,
};

/* ---------------- i18n ---------------- */
addStrings('es', {
  'sky.look': '🔭 MIRAR', 'sky.sign': '🔭 OBSERVATORIO GEAYI', 'sky.close': '✖ BAJAR',
  'sky.moon': 'Luna', 'sky.mars': 'Marte', 'sky.jupiter': 'Júpiter', 'sky.saturn': 'Saturno',
  'sky.moonDist': '384,400 km de la Tierra', 'sky.moonFact': 'La Luna causa las mareas 🌊',
  'sky.marsDist': '~225 millones de km', 'sky.marsFact': 'El planeta rojo, con el volcán más grande ☀️',
  'sky.jupiterDist': '~778 millones de km del Sol', 'sky.jupiterFact': 'El planeta más grande: su Gran Mancha es una tormenta gigante 🌀',
  'sky.saturnDist': '~1,400 millones de km del Sol', 'sky.saturnFact': 'Famoso por sus anillos de hielo y roca 💍',
  'sky.nightBest': '🌙 ¡De noche se ve mejor!', 'sky.dayNote': '☀️ Vuelve de noche para ver más estrellas',
});
addStrings('en', {
  'sky.look': '🔭 LOOK', 'sky.sign': '🔭 GEAYI OBSERVATORY', 'sky.close': '✖ CLOSE',
  'sky.moon': 'Moon', 'sky.mars': 'Mars', 'sky.jupiter': 'Jupiter', 'sky.saturn': 'Saturn',
  'sky.moonDist': '384,400 km from Earth', 'sky.moonFact': 'The Moon causes the tides 🌊',
  'sky.marsDist': '~225 million km', 'sky.marsFact': 'The red planet, with the biggest volcano ☀️',
  'sky.jupiterDist': '~778 million km from the Sun', 'sky.jupiterFact': 'The biggest planet: its Great Spot is a giant storm 🌀',
  'sky.saturnDist': '~1,400 million km from the Sun', 'sky.saturnFact': 'Famous for its rings of ice and rock 💍',
  'sky.nightBest': '🌙 It looks best at night!', 'sky.dayNote': '☀️ Come back at night to see more stars',
});
addStrings('pt', {
  'sky.look': '🔭 OLHAR', 'sky.sign': '🔭 OBSERVATÓRIO GEAYI', 'sky.close': '✖ DESCER',
  'sky.moon': 'Lua', 'sky.mars': 'Marte', 'sky.jupiter': 'Júpiter', 'sky.saturn': 'Saturno',
  'sky.moonDist': '384.400 km da Terra', 'sky.moonFact': 'A Lua causa as marés 🌊',
  'sky.marsDist': '~225 milhões de km', 'sky.marsFact': 'O planeta vermelho, com o maior vulcão ☀️',
  'sky.jupiterDist': '~778 milhões de km do Sol', 'sky.jupiterFact': 'O maior planeta: sua Grande Mancha é uma tempestade gigante 🌀',
  'sky.saturnDist': '~1,4 bilhão de km do Sol', 'sky.saturnFact': 'Famoso por seus anéis de gelo e rocha 💍',
  'sky.nightBest': '🌙 À noite fica ainda melhor!', 'sky.dayNote': '☀️ Volte à noite para ver mais estrelas',
});
addStrings('fr', {
  'sky.look': '🔭 REGARDER', 'sky.sign': '🔭 OBSERVATOIRE GEAYI', 'sky.close': '✖ DESCENDRE',
  'sky.moon': 'Lune', 'sky.mars': 'Mars', 'sky.jupiter': 'Jupiter', 'sky.saturn': 'Saturne',
  'sky.moonDist': '384 400 km de la Terre', 'sky.moonFact': 'La Lune provoque les marées 🌊',
  'sky.marsDist': '~225 millions de km', 'sky.marsFact': 'La planète rouge, avec le plus grand volcan ☀️',
  'sky.jupiterDist': '~778 millions de km du Soleil', 'sky.jupiterFact': 'La plus grande planète : sa Grande Tache est une tempête géante 🌀',
  'sky.saturnDist': '~1,4 milliard de km du Soleil', 'sky.saturnFact': 'Célèbre pour ses anneaux de glace et de roche 💍',
  'sky.nightBest': '🌙 C’est encore mieux la nuit !', 'sky.dayNote': '☀️ Reviens la nuit pour voir plus d’étoiles',
});

/* ---------------- CSS del sky-view (inyectado una vez) ---------------- */
function skyCSS() {
  if (document.getElementById('sky-style')) return;
  const st = document.createElement('style');
  st.id = 'sky-style';
  st.textContent =
    '#sky-view{position:fixed;inset:0;z-index:9999;overflow:hidden;display:none;' +
    'background:linear-gradient(180deg,#02020c 0%,#0a0a33 45%,#1c1450 80%,#2a1a5e 100%);' +
    'font-family:"Trebuchet MS",sans-serif;touch-action:manipulation;user-select:none;}' +
    '#sky-view.open{display:block;}' +
    '.sky-star{position:absolute;border-radius:50%;background:#fff;' +
    'animation:skyTwinkle 2.6s ease-in-out infinite;pointer-events:none;}' +
    '@keyframes skyTwinkle{0%,100%{opacity:.25;transform:scale(.8);}50%{opacity:1;transform:scale(1.25);}}' +
    '#sky-night{position:absolute;inset:0;pointer-events:none;}' +
    '#sky-planets{position:absolute;left:0;right:0;bottom:110px;display:grid;' +
    'grid-template-columns:1fr 1fr;gap:14px;padding:0 26px;}' +
    '.sky-planet{border:2px solid rgba(255,255,255,.35);border-radius:18px;' +
    'background:rgba(255,255,255,.08);backdrop-filter:blur(3px);' +
    'padding:16px 6px 12px;cursor:pointer;color:#fff;text-align:center;}' +
    '.sky-planet:active{transform:scale(.94);background:rgba(255,255,255,.16);}' +
    '.sky-emoji{font-size:52px;line-height:1.2;display:inline-block;position:relative;}' +
    '.sky-name{display:block;margin-top:6px;font-weight:900;font-size:17px;color:#ffe95e;}' +
    '.saturn-ring{position:absolute;left:50%;top:50%;width:150%;height:52%;' +
    'border:4px solid #ffd23f;border-radius:50%;transform:translate(-50%,-50%) rotate(-18deg);' +
    'pointer-events:none;opacity:.95;}' +
    '#sky-note{position:absolute;top:14px;left:0;right:0;text-align:center;color:#fff;' +
    'font-weight:700;font-size:15px;text-shadow:0 2px 6px #000;pointer-events:none;padding:0 16px;}' +
    '#sky-close{position:absolute;left:50%;bottom:26px;transform:translateX(-50%);' +
    'background:linear-gradient(180deg,#ff7043,#e64a19);color:#fff;border:none;border-radius:999px;' +
    'padding:14px 44px;font-size:19px;font-weight:900;cursor:pointer;' +
    'box-shadow:0 4px 14px rgba(0,0,0,.5);}' +
    '#sky-close:active{transform:translateX(-50%) scale(.94);}' +
    '#sky-info{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);' +
    'width:min(86vw,360px);background:rgba(10,10,40,.96);border:2px solid #ffd23f;' +
    'border-radius:20px;padding:22px 20px;color:#fff;text-align:center;display:none;' +
    'box-shadow:0 8px 30px rgba(0,0,0,.6);}' +
    '#sky-info.open{display:block;}' +
    '#sky-info .i-emoji{font-size:64px;}' +
    '#sky-info .i-name{font-size:26px;font-weight:900;color:#ffe95e;margin:8px 0 4px;}' +
    '#sky-info .i-dist{font-size:15px;color:#9fd8ff;margin-bottom:10px;}' +
    '#sky-info .i-fact{font-size:16px;line-height:1.45;background:rgba(255,255,255,.07);' +
    'border-radius:12px;padding:12px;}' +
    '#sky-info .i-x{margin-top:14px;background:#3949ab;color:#fff;border:none;' +
    'border-radius:999px;padding:10px 34px;font-size:16px;font-weight:900;cursor:pointer;}' +
    '#btn-telescope{position:fixed;left:50%;bottom:96px;transform:translateX(-50%);z-index:9000;' +
    'background:linear-gradient(180deg,#283593,#101a5c);color:#fff;border:2px solid #7edbff;' +
    'border-radius:999px;padding:14px 34px;font-size:20px;font-weight:900;cursor:pointer;' +
    'box-shadow:0 4px 16px rgba(0,0,0,.55);display:none;touch-action:manipulation;}' +
    '#btn-telescope:active{transform:translateX(-50%) scale(.93);}';
  document.head.appendChild(st);
}

/* ---------------- letrero 3D ---------------- */
function observatorySignTexture() {
  return canvasTex(512, 128, (g, w, h) => {
    g.fillStyle = '#101a5c'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#ffd23f'; g.lineWidth = 8; g.strokeRect(6, 6, w - 12, h - 12);
    // estrellas decorativas
    g.fillStyle = '#ffffff';
    for (let i = 0; i < 26; i++) { g.beginPath(); g.arc(18 + Math.random() * (w - 36), 14 + Math.random() * (h - 28), 2, 0, TAU); g.fill(); }
    g.textAlign = 'center'; g.fillStyle = '#ffe95e';
    let fs = 44;
    g.font = '900 ' + fs + 'px "Trebuchet MS", sans-serif';
    const txt = T('sky.sign');
    while (g.measureText(txt).width > w - 60 && fs > 22) { fs -= 2; g.font = '900 ' + fs + 'px "Trebuchet MS", sans-serif'; }
    g.fillText(txt, w / 2, h / 2 + fs / 2.6);
  });
}

/* ---------------- construcción 3D ---------------- */
function addObservatoryContent(idx, lvl) {
  if (idx !== 3) return;          // solo mundo 4: Immokalee
  if (OBS.built) return;
  OBS.built = true;
  const g = lvl.group, HX = OBS.hx, HZ = OBS.hz;

  // colina: dos niveles escalonados de pasto (fuera de las zonas prohibidas)
  addPlatform(lvl, HX, 1, HZ, 16, 16, { h: 2, color: 0x3f9e4d, emissive: 0x1d5c2a });
  addPlatform(lvl, HX, 2, HZ, 9, 9, { h: 1, color: 0x53b464, emissive: 0x2a7a3a });

  // ---- observatorio (diseño original GEAYI) ----
  const obs = new THREE.Group(); obs.position.set(HX, 2, HZ); g.add(obs);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.6, 2.2, 20),
    new THREE.MeshStandardMaterial({ color: 0xf2f5f9, roughness: 0.5, metalness: 0.1 }));
  base.position.y = 1.1; obs.add(base);
  const trim = new THREE.Mesh(new THREE.TorusGeometry(2.45, 0.12, 10, 32),
    new THREE.MeshStandardMaterial({ color: 0x00c2a8, emissive: 0x00c2a8, emissiveIntensity: 0.8 }));
  trim.rotation.x = Math.PI / 2; trim.position.y = 2.2; obs.add(trim);
  // puerta
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.7, 0.15),
    new THREE.MeshStandardMaterial({ color: 0x263238, roughness: 0.6 }));
  door.position.set(0, 0.85, -2.52); obs.add(door);
  // cúpula (grupo que gira despacio)
  const spin = new THREE.Group(); spin.position.y = 2.2; obs.add(spin); OBS.domeSpin = spin;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(2.4, 24, 14, 0, TAU, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xdfe6ee, roughness: 0.35, metalness: 0.45 }));
  spin.add(dome);
  // ranura de observación (oscura, al frente)
  const slit = new THREE.Mesh(new THREE.BoxGeometry(0.85, 2.2, 0.25),
    new THREE.MeshStandardMaterial({ color: 0x0a0e22, roughness: 0.9 }));
  slit.position.set(0, 0.75, -2.05); slit.rotation.x = 0.28; spin.add(slit);
  // antena/luz roja parpadeante en la cima
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.1, 8),
    new THREE.MeshStandardMaterial({ color: 0x888899 }));
  mast.position.y = 2.9; spin.add(mast);
  OBS.beaconMat = new THREE.MeshStandardMaterial({ color: 0xff2f2f, emissive: 0xff2f2f, emissiveIntensity: 1 });
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), OBS.beaconMat);
  beacon.position.y = 3.55; spin.add(beacon);
  // letrero GEAYI al frente (mira hacia el telescopio, -z)
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(5, 1.25),
    new THREE.MeshBasicMaterial({ map: observatorySignTexture(), transparent: false }));
  sign.position.set(0, 1.35, -2.62); sign.rotation.y = Math.PI; obs.add(sign);

  // ---- telescopio (diseño original) sobre la colina baja, junto a la cima ----
  const TX = OBS.tel.x, TZ = OBS.tel.z, TY = OBS.tel.y;
  const scope = new THREE.Group(); scope.position.set(TX, TY, TZ); g.add(scope);
  const legMat = new THREE.MeshStandardMaterial({ color: 0x3949ab, roughness: 0.45, metalness: 0.4 });
  for (let i = 0; i < 3; i++) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 2.6, 8), legMat);
    const a = (i / 3) * TAU;
    leg.position.set(Math.cos(a) * 0.75, 1.15, Math.sin(a) * 0.75);
    leg.rotation.z = Math.cos(a) * 0.42; leg.rotation.x = -Math.sin(a) * 0.42;
    scope.add(leg);
  }
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0xffd23f, metalness: 0.6, roughness: 0.3 }));
  hub.position.y = 2.3; scope.add(hub);
  // tubo principal inclinado hacia el cielo
  const tubeGrp = new THREE.Group(); tubeGrp.position.y = 2.3; tubeGrp.rotation.x = -0.85; scope.add(tubeGrp);
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 3.0, 16),
    new THREE.MeshStandardMaterial({ color: 0x00a2a8, roughness: 0.4, metalness: 0.35 }));
  tube.position.y = 0.9; tubeGrp.add(tube);
  [0.15, 1.65].forEach(y => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.06, 8, 20),
      new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0xffb300, emissiveIntensity: 0.6 }));
    ring.rotation.x = Math.PI / 2; ring.position.y = y; tubeGrp.add(ring);
  });
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.3, 16),
    new THREE.MeshStandardMaterial({ color: 0x9fd8ff, emissive: 0x7edbff, emissiveIntensity: 0.9 }));
  lens.position.y = 2.41; lens.rotation.x = -Math.PI / 2; tubeGrp.add(lens);
  const eye = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.5, 8),
    new THREE.MeshStandardMaterial({ color: 0x263238 }));
  eye.position.y = -0.75; tubeGrp.add(eye);
  // buscador pequeño
  const finder = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.9, 8),
    new THREE.MeshStandardMaterial({ color: 0xff7043, roughness: 0.5 }));
  finder.position.set(0.35, 1.6, 0); tubeGrp.add(finder);
  // anillo brillante en el piso: "párate aquí"
  OBS.ringMat = new THREE.MeshBasicMaterial({ color: 0x7edbff, transparent: true, opacity: 0.55 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.1, 8, 32), OBS.ringMat);
  ring.rotation.x = Math.PI / 2; ring.position.set(TX, TY + 0.12, TZ); g.add(ring);
}

/* ---------------- botón flotante ---------------- */
function onFoot() {
  return (typeof Vehicle !== 'undefined') && Vehicle.mode === 'none' && !Vehicle.near;
}
function nearTelescope() {
  if (typeof Player === 'undefined' || !Player.pos) return false;
  const dx = Player.pos.x - OBS.tel.x, dz = Player.pos.z - OBS.tel.z;
  return (dx * dx + dz * dz) < 9 && Math.abs(Player.pos.y - OBS.tel.y) < 2.5;
}
function ensureBtn() {
  skyCSS();
  if (OBS.btn) return;
  const b = document.createElement('button');
  b.id = 'btn-telescope';
  b.setAttribute('data-i18n', 'sky.look');
  b.textContent = T('sky.look');
  b.addEventListener('click', e => { e.preventDefault(); tryOpenSky(); });
  document.body.appendChild(b);
  OBS.btn = b;
}

/* ---------------- sky-view ---------------- */
function isNight() {
  try { return (typeof Weather !== 'undefined') && Weather.isNight && Weather.isNight(); }
  catch (e) { return false; }
}
function ensureSky() {
  skyCSS();
  if (OBS.sky) return;
  const v = document.createElement('div');
  v.id = 'sky-view';
  const night = document.createElement('div'); night.id = 'sky-night'; v.appendChild(night);
  const note = document.createElement('div'); note.id = 'sky-note'; v.appendChild(note);
  const grid = document.createElement('div'); grid.id = 'sky-planets'; v.appendChild(grid);
  const close = document.createElement('button'); close.id = 'sky-close';
  close.setAttribute('data-i18n', 'sky.close'); close.textContent = T('sky.close');
  close.addEventListener('click', e => { e.preventDefault(); closeSky(); });
  v.appendChild(close);
  // tarjeta de info del planeta
  const info = document.createElement('div'); info.id = 'sky-info';
  const iEmoji = document.createElement('div'); iEmoji.className = 'i-emoji'; info.appendChild(iEmoji);
  const iName = document.createElement('div'); iName.className = 'i-name'; info.appendChild(iName);
  const iDist = document.createElement('div'); iDist.className = 'i-dist'; info.appendChild(iDist);
  const iFact = document.createElement('div'); iFact.className = 'i-fact'; info.appendChild(iFact);
  const iX = document.createElement('button'); iX.className = 'i-x'; iX.textContent = '✖';
  iX.addEventListener('click', e => { e.preventDefault(); info.classList.remove('open'); });
  info.appendChild(iX);
  v.appendChild(info);
  document.body.appendChild(v);
  OBS.sky = v; OBS.info = info; OBS.nightNote = note;
}
function makeStars(box, n) {
  for (let i = 0; i < n; i++) {
    const s = document.createElement('div');
    s.className = 'sky-star';
    const sz = 2 + Math.random() * 3.5;
    s.style.width = s.style.height = sz + 'px';
    s.style.left = (Math.random() * 100) + '%';
    s.style.top = (Math.random() * 62) + '%';
    s.style.animationDelay = (Math.random() * 2.6) + 's';
    s.style.animationDuration = (1.6 + Math.random() * 2.4) + 's';
    box.appendChild(s);
  }
}
const PLANETS = [
  { key: 'moon', emoji: '🌕' },
  { key: 'mars', emoji: '🔴' },
  { key: 'jupiter', emoji: '🟠' },
  { key: 'saturn', emoji: '🪐', ring: true },
];
function buildPlanetCards(grid) {
  grid.innerHTML = '';
  PLANETS.forEach(p => {
    const c = document.createElement('button');
    c.className = 'sky-planet';
    const em = document.createElement('span');
    em.className = 'sky-emoji'; em.textContent = p.emoji;
    if (p.ring) { const r = document.createElement('span'); r.className = 'saturn-ring'; em.appendChild(r); }
    const nm = document.createElement('span');
    nm.className = 'sky-name'; nm.textContent = T('sky.' + p.key);
    c.appendChild(em); c.appendChild(nm);
    c.addEventListener('click', e => { e.preventDefault(); showPlanet(p); });
    grid.appendChild(c);
  });
}
function showPlanet(p) {
  if (typeof Audio2 !== 'undefined') { try { Audio2.init(); Audio2.click(); } catch (e) {} }
  OBS.info.querySelector('.i-emoji').textContent = p.emoji;
  OBS.info.querySelector('.i-name').textContent = T('sky.' + p.key);
  OBS.info.querySelector('.i-dist').textContent = T('sky.' + p.key + 'Dist');
  OBS.info.querySelector('.i-fact').textContent = T('sky.' + p.key + 'Fact');
  OBS.info.classList.add('open');
}
function tryOpenSky() {
  if (OBS.skyOpen) return;
  if (!onFoot() || !nearTelescope()) return;
  openSky();
}
function openSky() {
  if (OBS.skyOpen) return;
  ensureSky();
  OBS.skyOpen = true;
  if (typeof Audio2 !== 'undefined') { try { Audio2.init(); Audio2.click(); } catch (e) {} }
  // trofeo la primera vez
  if (!OBS.trophyDone) {
    OBS.trophyDone = true;
    try { if (typeof Trophy !== 'undefined' && Trophy.unlock) Trophy.unlock('star'); } catch (e) {}
  }
  // estrellitas extra de celebración en el mundo
  try { if (typeof Particles !== 'undefined') Particles.burst(OBS.tel.x, OBS.tel.y + 2.5, OBS.tel.z, [0xffe95e, 0x7edbff, 0xffffff], 14, 5); } catch (e) {}
  // rellenar contenido con el idioma actual
  const nightBox = OBS.sky.querySelector('#sky-night');
  nightBox.innerHTML = '';
  const night = isNight();
  makeStars(nightBox, night ? 120 : 80);
  OBS.nightNote.textContent = T(night ? 'sky.nightBest' : 'sky.dayNote');
  buildPlanetCards(OBS.sky.querySelector('#sky-planets'));
  OBS.sky.querySelector('#sky-close').textContent = T('sky.close');
  OBS.info.classList.remove('open');
  OBS.sky.classList.add('open');
  if (OBS.btn) OBS.btn.style.display = 'none';
}
function closeSky() {
  if (!OBS.skyOpen) return;
  OBS.skyOpen = false;
  OBS.sky.classList.remove('open');
  if (typeof Audio2 !== 'undefined') { try { Audio2.deny(); } catch (e) {} }
}

/* ---------------- loop del padre ---------------- */
function updateObservatory(dt) {
  OBS.t += (dt || 0.016);
  if (!OBS.built) return;
  // luz de la cúpula parpadea y la cúpula gira muy despacio
  if (OBS.beaconMat) OBS.beaconMat.emissiveIntensity = 0.5 + 0.7 * (0.5 + 0.5 * Math.sin(OBS.t * 4));
  if (OBS.domeSpin) OBS.domeSpin.rotation.y += (dt || 0.016) * 0.08;
  if (OBS.ringMat) OBS.ringMat.opacity = 0.35 + 0.3 * (0.5 + 0.5 * Math.sin(OBS.t * 3));
  ensureBtn();
  const here = (typeof LEVEL !== 'undefined' && LEVEL && LEVEL.idx === 3) &&
    (typeof MODE !== 'undefined' ? MODE === 'play' : true) && !OBS.skyOpen;
  if (here && onFoot() && nearTelescope()) {
    OBS.btn.style.display = 'block';
  } else {
    OBS.btn.style.display = 'none';
    if (OBS.skyOpen && (typeof LEVEL === 'undefined' || !LEVEL || LEVEL.idx !== 3)) closeSky();
  }
}

/* export CommonJS (solo para pruebas node; en el navegador es un <script> clásico) */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { addObservatoryContent, updateObservatory, OBS };
}
/* Tecla E: mirar por el telescopio (con guardias de vehículo) */
document.addEventListener('keydown', e => {
  if (e.code !== 'KeyE' || OBS.skyOpen) return;
  if (!OBS.built) return;
  if ((typeof LEVEL === 'undefined' || !LEVEL || LEVEL.idx !== 3)) return;
  if (typeof Vehicle !== 'undefined' && (Vehicle.mode !== 'none' || Vehicle.near)) return;
  if (nearTelescope()) { if (typeof Audio2 !== 'undefined') { try { Audio2.init(); } catch (err) {} } openSky(); }
});

/* export CommonJS (solo para pruebas node; en el navegador es un <script> clásico) */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { addObservatoryContent, updateObservatory, OBS };
}
