/* game.js — orquestador: entrada, pantallas, HUD, tienda y loop principal */
'use strict';

/* NOTA MULTIJUGADOR (roadmap): la arquitectura ya está separada por módulos —
   state.js (estado + guardado), player.js (avatar y física local),
   world.js (niveles) y audio.js. Para multijugador real bastaría con:
   1) un NetPlayer en player.js que replique la física con datos de red,
   2) sincronizar state.js (posición, monedas, checkpoint) vía WebSocket,
   sin reescribir el juego. */

const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

/* ================= ENTRADA: TECLADO ================= */
const Input = { keys: {} };
function setupKeyboard() {
  const map = { KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right' };
  window.addEventListener('keydown', e => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return; // escribiendo en un campo
    if (e.code === 'Space') { e.preventDefault(); Audio2.init(); tryJump(); return; }
    if (e.code === 'KeyE') { Audio2.init(); if (typeof vehicleInteract === 'function') vehicleInteract(); return; } // FASE 2: subir/bajar de vehículos
    const d = map[e.code];
    if (d) { Input.keys[d] = true; e.preventDefault(); }
  });
  window.addEventListener('keyup', e => {
    const d = map[e.code];
    if (d) Input.keys[d] = false;
  });
}

/* ================= ENTRADA: JOYSTICK TÁCTIL ================= */
const Joy = { active: false, id: null, ox: 0, oy: 0, x: 0, z: 0 };
const JoyS = { x: 0, z: 0 }; // joystick suavizado (evita que el personaje dé vueltas al caminar)
/* 🚗 botón ACELERAR (carro/bici): el joystick sigue para girar */
const Drive = { gas: false };
function setupDriveButtons() {
  const hold = (id, key) => {
    const b = $(id);
    if (!b) return;
    const on = (e) => { e.preventDefault(); Drive[key] = true; b.classList.add('held'); };
    const off = (e) => { if (e) e.preventDefault(); Drive[key] = false; b.classList.remove('held'); };
    b.addEventListener('touchstart', on, { passive: false });
    b.addEventListener('touchend', off, { passive: false });
    b.addEventListener('touchcancel', off, { passive: false });
    b.addEventListener('mousedown', on);
    b.addEventListener('mouseup', off);
    b.addEventListener('mouseleave', () => { Drive[key] = false; b.classList.remove('held'); });
  };
  hold('btn-gas', 'gas');
}
/* muestra el botón ACELERAR y oculta SALTAR (el joystick sigue para girar) */
function setDriveUI(on) {
  const dui = $('drive-ui'), bj = $('btn-jump');
  if (dui) dui.classList.toggle('hidden', !on);
  if (bj) bj.style.display = on ? 'none' : '';
  if (!on) Drive.gas = false;
}
function setupTouch() {
  if (isTouch) document.body.classList.add('touch');
  const zone = $('joy-zone'), base = $('joy-base'), knob = $('joy-knob');
  const R = 52;
  zone.addEventListener('touchstart', e => {
    e.preventDefault(); Audio2.init();
    const t = e.changedTouches[0];
    const r = zone.getBoundingClientRect();
    Joy.active = true; Joy.id = t.identifier; Joy.ox = t.clientX; Joy.oy = t.clientY;
    base.style.display = 'block';
    base.style.left = (t.clientX - r.left - 60) + 'px';
    base.style.top = (t.clientY - r.top - 60) + 'px';
    knob.style.transform = 'translate(0px,0px)';
  }, { passive: false });
  zone.addEventListener('touchmove', e => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier !== Joy.id) continue;
      let dx = t.clientX - Joy.ox, dy = t.clientY - Joy.oy;
      const m = Math.hypot(dx, dy);
      if (m > R) { dx = dx / m * R; dy = dy / m * R; }
      Joy.x = dx / R; Joy.z = -dy / R;
      knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    }
  }, { passive: false });
  const end = e => {
    for (const t of e.changedTouches) {
      if (t.identifier !== Joy.id) continue;
      Joy.active = false; Joy.id = null; Joy.x = 0; Joy.z = 0;
      base.style.display = 'none';
    }
  };
  zone.addEventListener('touchend', end);
  zone.addEventListener('touchcancel', end);
  $('btn-jump').addEventListener('touchstart', e => { e.preventDefault(); Audio2.init(); tryJump(); }, { passive: false });
  // también permitir clic con mouse en el botón de salto (por si acaso)
  $('btn-jump').addEventListener('mousedown', e => { e.preventDefault(); Audio2.init(); tryJump(); });
}

/* ================= CÁMARA LIBRE ESTILO ROBLOX =================
   Arrastra con un dedo sobre el mundo para ver en 360° (no interfiere
   con el joystick ni los botones). Pellizca para acercar/alejar.
   En computadora: arrastra con el mouse y usa la rueda para zoom. */
const CamDrag = { id: null, lx: 0, ly: 0, pinch: 0, mDown: false, mlx: 0, mly: 0 };
function setupCamDrag() {
  const el = $('game');
  if (!el) return;
  const rot = (dx, dy) => {
    if (typeof Player === 'undefined' || !Player.pos) return;
    Player.camYaw -= dx * 0.0052;
    Player.camPitch = clamp((Player.camPitch != null ? Player.camPitch : 0.34) + dy * 0.0042, -0.05, 1.15);
  };
  const zoom = f => {
    if (typeof Player === 'undefined') return;
    Player.camDist = clamp((Player.camDist || 8.5) * f, 3, 16);
  };
  const joyTouchId = () => (typeof Joy !== 'undefined' && Joy.active) ? Joy.id : null; // el joystick NO es dedo de cámara
  el.addEventListener('touchstart', e => {
    if (MODE !== 'play') return;
    CamDrag.pinch = 0;
    const ji = joyTouchId();
    let newCam = 0;
    for (const t of e.changedTouches) {
      if (t.identifier === ji) continue; // ignorar el dedo del joystick
      newCam++;
      if (CamDrag.id === null) {
        CamDrag.id = t.identifier; CamDrag.lx = t.clientX; CamDrag.ly = t.clientY;
        noteTapStart(t.clientX, t.clientY); // 🖐️ posible tap para tocar cosas
      }
    }
    if (newCam !== 1) _tapStart = null;
  }, { passive: true });
  el.addEventListener('touchmove', e => {
    if (MODE !== 'play') return;
    e.preventDefault();
    const ji = joyTouchId();
    const ct = [];
    for (const t of e.touches) if (t.identifier !== ji) ct.push(t); // solo dedos de cámara
    if (ct.length === 2) {
      const d = Math.hypot(ct[0].clientX - ct[1].clientX, ct[0].clientY - ct[1].clientY);
      if (CamDrag.pinch > 0 && d > 0) zoom(CamDrag.pinch / d);
      CamDrag.pinch = d; CamDrag.id = null;
    } else if (ct.length === 1) {
      const t = ct[0];
      if (CamDrag.id === null) { CamDrag.id = t.identifier; CamDrag.lx = t.clientX; CamDrag.ly = t.clientY; }
      else if (t.identifier === CamDrag.id) {
        rot(t.clientX - CamDrag.lx, t.clientY - CamDrag.ly);
        CamDrag.lx = t.clientX; CamDrag.ly = t.clientY;
      }
    } else { CamDrag.pinch = 0; }
  }, { passive: false });
  const endT = e => {
    const ji = joyTouchId();
    for (const t of e.changedTouches) if (t.identifier === CamDrag.id) CamDrag.id = null;
    let camLeft = 0;
    for (const t of e.touches) if (t.identifier !== ji) camLeft++;
    if (camLeft < 2) CamDrag.pinch = 0;
    if (camLeft === 0) { // último dedo de cámara levantado → ¿fue tap?
      for (const t of e.changedTouches) {
        if (t.identifier !== ji) { noteTapEnd(t.clientX, t.clientY); break; }
      }
    }
  };
  el.addEventListener('touchend', endT);
  el.addEventListener('touchcancel', endT);
  el.addEventListener('mousedown', e => {
    if (MODE !== 'play') return;
    CamDrag.mDown = true; CamDrag.mlx = e.clientX; CamDrag.mly = e.clientY;
    noteTapStart(e.clientX, e.clientY); // 🖐️ posible clic para tocar cosas (PC)
  });
  window.addEventListener('mousemove', e => {
    if (!CamDrag.mDown || MODE !== 'play') return;
    rot(e.clientX - CamDrag.mlx, e.clientY - CamDrag.mly);
    CamDrag.mlx = e.clientX; CamDrag.mly = e.clientY;
  });
  window.addEventListener('mouseup', () => { CamDrag.mDown = false; });
  el.addEventListener('mouseup', e => { noteTapEnd(e.clientX, e.clientY); }); // 🖐️ clic para tocar cosas (PC)
  el.addEventListener('wheel', e => {
    if (MODE !== 'play') return;
    e.preventDefault();
    zoom(1 + e.deltaY * 0.001);
  }, { passive: false });
}

function readInput() {
  let x = 0, z = 0;
  if (Input.keys.left) x -= 1;
  if (Input.keys.right) x += 1;
  if (Input.keys.up) z += 1;
  if (Input.keys.down) z -= 1;
  if (Joy.active) {
    // zona muerta: ignora temblores cerca del centro + reescala el resto a 0..1
    const DEAD = 0.22;
    let jx = Joy.x, jz = Joy.z;
    const m = Math.hypot(jx, jz);
    if (m < DEAD) { jx = 0; jz = 0; }
    else { const s = Math.min(1, (m - DEAD) / (1 - DEAD)) / m; jx *= s; jz *= s; }
    // suavizado pasa-bajos: el personaje camina estable en vez de girar brusco
    const k = 0.35;
    JoyS.x += (jx - JoyS.x) * k;
    JoyS.z += (jz - JoyS.z) * k;
    if (Math.hypot(JoyS.x, JoyS.z) < 0.04) { JoyS.x = 0; JoyS.z = 0; }
    x = JoyS.x; z = JoyS.z;
  } else { JoyS.x = 0; JoyS.z = 0; }
  // 🚗 botón ACELERAR: acelera sin quitar el dedo del joystick (que sigue girando)
  if (Drive.gas) z = 1;
  const m2 = Math.hypot(x, z);
  if (m2 > 1) { x /= m2; z /= m2; }
  return { x, z };
}

/* ================= PANTALLAS ================= */
const MAIN_SCREENS = ['screen-menu', 'screen-levels', 'screen-worlds', 'screen-custom', 'screen-trophies', 'screen-support',
  'screen-auth', 'screen-signup', 'screen-login', 'screen-verify', 'screen-setup', 'screen-online'];
function showMain(id) {
  MAIN_SCREENS.forEach(s => $(s).classList.toggle('hidden', s !== id));
}
function hideOverlays() {
  ['screen-howto', 'screen-pause', 'screen-win', 'screen-settings'].forEach(s => $(s).classList.add('hidden'));
}

/* ================= SELECCIÓN DE NIVEL ================= */
function renderLevels() {
  const grid = $('levels-grid');
  grid.innerHTML = '';
  WORLD_ORDER.forEach((idx, p) => {
    const lv = LEVELS[idx];
    const unlocked = true; /* GEAYI: todos los mundos siempre abiertos */
    const card = document.createElement('div');
    card.className = 'level-card theme' + (idx + 1) + (unlocked ? ' unlocked' : ' locked');
    card.innerHTML =
      '<span class="lock">' + (unlocked ? '' : '🔒') + '</span>' +
      '<span class="emoji">' + lv.emoji + '</span>' +
      '<div class="lname">' + (p + 1) + '. ' + wname(idx) + '</div>' +
      '<div class="lbest">' + (unlocked ? wdesc(idx) : T('menu.lockedTail')) + '</div>';
    if (unlocked) card.addEventListener('click', () => { try { Audio2.init(); Audio2.click(); startLevel(idx); } catch (e) {} });
    else card.addEventListener('click', () => { Audio2.init(); Audio2.deny(); toast('🔒 Termina el mundo anterior'); });
    grid.appendChild(card);
  });
  /* 🧱 tarjeta Mis Mundos: entra a la pantalla de mundos del jugador */
  const wc = document.createElement('div');
  wc.className = 'level-card theme9 unlocked';
  wc.innerHTML =
    '<span class="emoji">🧱</span>' +
    '<div class="lname">Mis Mundos</div>' +
    '<div class="lbest">Crea y visita tus mundos 🌍</div>';
  wc.addEventListener('click', () => {
    try { Audio2.init(); Audio2.click(); } catch (e) {}
    renderWorlds(); showMain('screen-worlds'); MODE = 'worlds';
  });
  grid.appendChild(wc);
}

/* ================= 🌍 MIS MUNDOS ================= */
function _wesc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function renderWorlds() {
  const list = $('worlds-list');
  const earnBox = $('worlds-earnings');
  if (!list) return;
  list.innerHTML = '';
  const worlds = (typeof SAVE !== 'undefined' && SAVE.worlds && typeof SAVE.worlds === 'object') ? SAVE.worlds : {};
  const keys = Object.keys(worlds);
  const earn = (typeof SAVE !== 'undefined' && typeof SAVE.creatorEarnings === 'number') ? SAVE.creatorEarnings : 0;
  if (earnBox) earnBox.textContent = '💰 Ganancias de creador: ' + earn + '🪙';
  if (!keys.length) {
    const d = document.createElement('div');
    d.className = 'worlds-info';
    d.textContent = 'Aún no tienes mundos. Entra a un nivel, compra tu lote 🪧 y crea el primero 🔨.';
    list.appendChild(d);
  }
  keys.forEach(k => {
    const w = worlds[k] || {};
    const d = document.createElement('div');
    d.className = 'level-card theme9 unlocked';
    d.innerHTML =
      '<span class="emoji">🌍</span>' +
      '<div class="lname">' + _wesc(w.name || 'Mi mundo') + '</div>' +
      '<div class="lbest">👀 ' + (w.visits || 0) + ' visitas · ▶️ Ir a mi mundo</div>';
    d.addEventListener('click', () => {
      try { Audio2.init(); Audio2.click(); } catch (e) {}
      if (typeof WorldEconomy !== 'undefined' && typeof WorldEconomy.enterWorld === 'function') WorldEconomy.enterWorld(k);
    });
    list.appendChild(d);
  });
  /* 🏠 Mis lotes: ve a visitar tus construcciones */
  try {
    const lots = (typeof LotSystem !== 'undefined' && typeof LotSystem.ownedWithBlocks === 'function') ? LotSystem.ownedWithBlocks() : [];
    if (lots.length) {
      const h = document.createElement('div');
      h.className = 'worlds-info';
      h.textContent = '🏠 Mis lotes — ve a visitar tus construcciones';
      list.appendChild(h);
      lots.forEach(l => {
        const d = document.createElement('div');
        d.className = 'level-card theme9 unlocked';
        d.innerHTML =
          '<span class="emoji">🏠</span>' +
          '<div class="lname">' + _wesc(l.name) + '</div>' +
          '<div class="lbest">🌍 ' + _wesc(wname(l.worldIdx)) + ' · 🧱 ' + l.n + ' bloques · 👀 ' + l.visits + ' visitas · ▶️ Ir</div>';
        d.addEventListener('click', () => {
          try { Audio2.init(); Audio2.click(); } catch (e) {}
          visitLot(l.worldIdx, l.lotId);
        });
        list.appendChild(d);
      });
    }
  } catch (e) {}
}

/* 🏠 visitar tu lote construido: carga el mundo y te lleva a la puerta */
function visitLot(worldIdx, lotId) {
  try {
    if (typeof LotSystem === 'undefined') return;
    const rec = LotSystem.getSave(worldIdx, lotId);
    if (!rec) { toast('🏠 Ese lote ya no existe'); return; }
    startLevel(worldIdx);
    const gy = rec.groundY || 0;
    const px = rec.x, pz = rec.z + rec.d / 2 + 4;
    try { Player.reset(px, gy + 1, pz); } catch (e) {}
    respawn = { x: px, y: gy + 1, z: pz };
    rec.visits = (rec.visits || 0) + 1;
    try { persist(); } catch (e) {}
    setTimeout(() => { try { showBanner('🏠 ' + (rec.name || 'Mi lote'), '👀 ¡Ven a ver tu construcción!'); } catch (e) {} }, 2000);
  } catch (e) {}
}

/* ================= PERSONALIZAR / TIENDA ================= */
/* elige un personaje (familia o animal) y reconstruye el avatar */
function selectCharacter(id) {
  Audio2.init(); Audio2.click();
  SAVE.familyChar = id; persist();
  Avatar.build();
  if (typeof refreshPresence === 'function') refreshPresence();
  renderCustom();
}
function renderCustom() {
  $('custom-coins').textContent = SAVE.coins;
  // ⭐ personajes de la familia
  const fg = $('family-grid');
  fg.innerHTML = '';
  const free = document.createElement('div');
  free.className = 'shop-item' + (!SAVE.familyChar ? ' equipped' : '');
  free.innerHTML = '<span class="emoji">🎨</span><div class="pname">Personaje libre</div>' +
    '<div class="price">' + (!SAVE.familyChar ? '✅ Elegido' : 'El de colores') + '</div>';
  free.addEventListener('click', () => {
    Audio2.init(); Audio2.click();
    SAVE.familyChar = null; persist();
    Avatar.build();
    if (typeof refreshPresence === 'function') refreshPresence();
    renderCustom();
  });
  fg.appendChild(free);
  FAMILY.forEach(f => {
    const sel = SAVE.familyChar === f.id;
    const d = document.createElement('div');
    d.className = 'shop-item' + (sel ? ' equipped' : '');
    d.innerHTML = '<img class="fportrait" src="' + f.portrait + '" alt="' + f.name + '">' +
      '<div class="pname">' + f.name + '</div>' +
      '<div class="price">' + (sel ? '✅ Elegido' : 'Elegir') + '</div>';
    d.addEventListener('click', () => selectCharacter(f.id));
    fg.appendChild(d);
  });
  // 🐾 animales genéricos
  const ag = $('animals-grid');
  ag.innerHTML = '';
  ANIMALS.forEach(a => {
    const sel = SAVE.familyChar === a.id;
    const d = document.createElement('div');
    d.className = 'shop-item' + (sel ? ' equipped' : '');
    d.innerHTML = '<img class="fportrait" src="' + a.portrait + '" alt="' + a.name + '">' +
      '<div class="pname">' + a.name + '</div>' +
      '<div class="price">' + (sel ? '✅ Elegido' : 'Elegir') + '</div>';
    d.addEventListener('click', () => selectCharacter(a.id));
    ag.appendChild(d);
  });
  // colores
  const sw = $('custom-body');
  sw.innerHTML = '';
  BODY_COLORS.forEach(c => {
    const d = document.createElement('div');
    d.className = 'swatch' + (SAVE.body === c ? ' sel' : '');
    d.style.background = c;
    d.addEventListener('click', () => {
      Audio2.init(); Audio2.click();
      SAVE.body = c; persist();
      Avatar.build();
      if (typeof syncProfileToCloud === 'function') syncProfileToCloud();
      renderCustom();
    });
    sw.appendChild(d);
  });
  // sombreros
  const hg = $('hats-grid');
  hg.innerHTML = '';
  HATS.forEach(h => {
    const owned = SAVE.ownedHats.includes(h.id);
    const eq = SAVE.hat === h.id;
    const d = document.createElement('div');
    d.className = 'shop-item' + (owned ? ' owned' : '') + (eq ? ' equipped' : '');
    d.innerHTML = '<span class="emoji">' + h.emoji + '</span><div class="pname">' + h.name + '</div>' +
      '<div class="price">' + (owned ? (eq ? '✅ Puesto' : 'Poner') : '🪙 ' + h.price) + '</div>';
    d.addEventListener('click', () => buyItem('hat', h));
    hg.appendChild(d);
  });
  // estelas
  const tg = $('trails-grid');
  tg.innerHTML = '';
  TRAILS.forEach(t => {
    const owned = SAVE.ownedTrails.includes(t.id);
    const eq = SAVE.trail === t.id;
    const d = document.createElement('div');
    d.className = 'shop-item' + (owned ? ' owned' : '') + (eq ? ' equipped' : '');
    d.innerHTML = '<span class="emoji">' + t.emoji + '</span><div class="pname">' + t.name + '</div>' +
      '<div class="price">' + (owned ? (eq ? '✅ Puesta' : 'Poner') : '🪙 ' + t.price) + '</div>';
    d.addEventListener('click', () => buyItem('trail', t));
    tg.appendChild(d);
  });
  // FASE 2: 🪂 paracaídas (gratis) — se abre solo al caer desde lo alto
  const cg = $('chute-grid');
  cg.innerHTML = '';
  const on = !!SAVE.chute;
  const cd = document.createElement('div');
  cd.className = 'shop-item' + (on ? ' equipped' : '');
  cd.innerHTML = '<span class="emoji">🪂</span><div class="pname">Paracaídas</div>' +
    '<div class="price">' + (on ? '✅ Puesto' : 'Poner (gratis)') + '</div>';
  cd.addEventListener('click', () => {
    Audio2.init(); Audio2.click();
    SAVE.chute = !SAVE.chute; persist();
    renderCustom();
  });
  cg.appendChild(cd);
  if (typeof renderPetSection === 'function') renderPetSection(); // 🐾 mascotas seguidoras
}
function buyItem(kind, item) {
  Audio2.init();
  const ownedList = kind === 'hat' ? SAVE.ownedHats : SAVE.ownedTrails;
  if (ownedList.includes(item.id)) {
    if (kind === 'hat') { SAVE.hat = item.id; Avatar.setHat(item.id); }
    else SAVE.trail = item.id;
    Audio2.click(); persist(); renderCustom();
    if (typeof syncProfileToCloud === 'function') syncProfileToCloud();
    return;
  }
  if (SAVE.coins < item.price) {
    Audio2.deny(); toast('🪙 Te faltan monedas: juega niveles');
    return;
  }
  SAVE.coins -= item.price;
  ownedList.push(item.id);
  if (kind === 'hat') { SAVE.hat = item.id; Avatar.setHat(item.id); }
  else SAVE.trail = item.id;
  persist(); Audio2.buy();
  toast('🎉 ¡Comprado: ' + item.name + '!');
  $('menu-coins').textContent = SAVE.coins;
  if (typeof syncProfileToCloud === 'function') syncProfileToCloud();
  renderCustom();
}

/* ================= MENÚ LATERAL (Tienda · Mundos · Personaje) ================= */
let sideReturn = false; // true cuando el menú lateral pausó el juego
function openSideScreen(which) {
  if (typeof Net !== 'undefined' && Net.active) { toast('🌐 Sal de la sala para usar el menú'); return; }
  if (typeof MODE === 'undefined' || MODE !== 'play') return;
  Audio2.click();
  pauseGame();
  $('screen-pause').classList.add('hidden'); // pausar sin mostrar la pantalla de pausa
  $('side-menu').classList.add('hidden');
  sideReturn = true;
  if (which === 'worlds') { renderLevels(); showMain('screen-levels'); MODE = 'levels'; }
  else {
    renderCustom(); showMain('screen-custom'); MODE = 'custom';
    const tgt = which === 'store' ? 'custom-hats' : 'custom-family';
    setTimeout(() => { const h = $(tgt); if (h && h.scrollIntoView) h.scrollIntoView(); }, 80);
  }
}
function closeSideScreen() {
  Audio2.click();
  sideReturn = false;
  showMain(null); hideOverlays();
  MODE = 'play';
  $('side-menu').classList.remove('hidden');
  if (SAVE.music) Audio2.startMusic();
  Avatar.build(); // aplicar cambios de personaje/sombrero + etiqueta flotante
}

/* ================= FLUJO DE JUEGO ================= */
function startLevel(i) {
  Audio2.init(); Audio2.click();
  try { if (typeof Voz !== 'undefined') Voz.callar(); } catch (e) {} // 🔇 callar narración al entrar al mundo
  if (typeof stopJob === 'function') stopJob(true); // 🧰 trabajos: limpiar al cambiar de mundo
  if (typeof CityLife3 !== 'undefined' && typeof CityLife3.onLevelEnd === 'function') CityLife3.onLevelEnd();
  if (typeof CityLife1 !== 'undefined' && typeof CityLife1.onLevelEnd === 'function') CityLife1.onLevelEnd();
  if (typeof CityLife2 !== 'undefined' && typeof CityLife2.onLevelEnd === 'function') CityLife2.onLevelEnd();
  if (typeof FunPark !== 'undefined' && typeof FunPark.onLevelEnd === 'function') FunPark.onLevelEnd();
  if (typeof Zoo !== 'undefined' && typeof Zoo.onLevelEnd === 'function') Zoo.onLevelEnd();
  if (typeof ThemePark !== 'undefined' && typeof ThemePark.onLevelEnd === 'function') ThemePark.onLevelEnd(); // 🎢 bajar de la rusa al cambiar de mundo
  if (typeof DayNight !== 'undefined' && typeof DayNight.onLevelEnd === 'function') DayNight.onLevelEnd(); // 🌞🌙
  if (typeof LiveEvents !== 'undefined' && typeof LiveEvents.onLevelEnd === 'function') LiveEvents.onLevelEnd(); // 🎪
  if (menuGroup) { scene.remove(menuGroup); menuGroup = null; } // quitar podio/anillos del menú al entrar al nivel
  LEVEL = buildLevel(i);
  if (typeof InfiniteStreets !== 'undefined') InfiniteStreets.init(); // 🌆 calles infinitas (fase 3)
  if (typeof LotSystem !== 'undefined') LotSystem.buildForLevel(i, LEVEL.group); // 🪧 lotes en venta (fase 2)
  if (typeof ThemePark !== 'undefined') ThemePark.buildForLevel(i, LEVEL.group); // 🎢 parque GEAYI (visión Roblox)
  if (typeof Aquarium !== 'undefined') Aquarium.buildForLevel(i, LEVEL.group); // 🐠 acuario
  if (typeof Furniture !== 'undefined') Furniture.buildForLevel(i, LEVEL.group); // 🪑 muebles en lotes
  if (typeof BizSim !== 'undefined') BizSim.buildForLevel(i, LEVEL.group); // 💰 negocios propios
  if (typeof Bank !== 'undefined') Bank.buildForLevel(i, LEVEL.group); // 🏦 banco GEAYI
  if (typeof MotoBoat !== 'undefined') MotoBoat.buildForLevel(i, LEVEL.group); // 🏍️🚚🛥️ motos, camiones, lanchas
  if (typeof ChatFriends !== 'undefined') ChatFriends.buildShowcaseForLevel(i, LEVEL.group); // 🧳 lotes modelo
  if (typeof Weapons !== 'undefined') Weapons.buildForLevel(i, LEVEL.group); // 🔫 blancos de tiro al blanco
  if (typeof DayNight !== 'undefined' && typeof DayNight.buildForLevel === 'function') DayNight.buildForLevel(i, LEVEL.group); // 🌞🌙 día/noche
  if (typeof LiveEvents !== 'undefined' && typeof LiveEvents.buildForLevel === 'function') LiveEvents.buildForLevel(i, LEVEL.group); // 🎪 eventos en vivo
  try { window.__carried = null; window.__nearKeeper = null; } catch (e) {} // 🖐️ soltar lo que llevaba al cambiar de mundo
  if (typeof CarWash !== 'undefined') CarWash.buildForLevel(i, LEVEL.group); // 🧽 autolavado en Immokalee
  if (typeof Zoo !== 'undefined' && typeof Zoo.buildForLevel === 'function') Zoo.buildForLevel(i, LEVEL.group); // 🦁 zoológico en Immokalee
  if (typeof Dealership !== 'undefined') Dealership.buildForLevel(i, LEVEL.group); // 🚗 lote en Immokalee
  if (typeof Vet !== 'undefined') Vet.buildForLevel(i, LEVEL.group); // 🏥 veterinaria en Immokalee
  if (typeof WaterPark !== 'undefined') WaterPark.buildForLevel(i, LEVEL.group); // 🌊 parque acuático en Immokalee
  if (typeof Train !== 'undefined') Train.buildForLevel(i, LEVEL.group); // 🚂 tren solo en Ciudad Neón
  if (typeof Concerts !== 'undefined') Concerts.buildForLevel(i, LEVEL.group); // 🎤 escenario en Ciudad Neón
  if (typeof Candy !== 'undefined') Candy.apply(LEVEL.group); // 🍬 materiales glossy caramelo
  if (typeof CityLife1 !== 'undefined') CityLife1.onLevelStart(i); // 🏙️ vida de ciudad T1
  if (typeof CityLife2 !== 'undefined') CityLife2.onLevelStart(i); // 🏙️ vida de ciudad T2
  if (typeof Bridges !== 'undefined') Bridges.buildForLevel(i, LEVEL.group); // 🌉 puentes peatonales
  if (typeof Castle !== 'undefined') Castle.buildForLevel(i, LEVEL.group); // 🏰 castillo en España
  if (typeof resetVehiclesForLevel === 'function') resetVehiclesForLevel(); // FASE 2
  if (typeof Sled !== 'undefined') Sled.reset(); // FASE 3: trineo
  if (typeof Pets !== 'undefined' && typeof Pets.onLevelStart === 'function') Pets.onLevelStart(); // 🐾 mascota seguidora
  if (typeof CityLife3 !== 'undefined') CityLife3.onLevelStart(i); // 🎉 tanda 3
  if (typeof FunPark !== 'undefined') FunPark.onLevelStart(i); // 🏟️ diversión nueva
  if (typeof Powers !== 'undefined' && typeof Powers.buildForLevel === 'function') Powers.buildForLevel(i, LEVEL.group); // ⚡ superpoderes
  if (typeof Minigames !== 'undefined' && typeof Minigames.onLevelEnter === 'function') Minigames.onLevelEnter(); // 🎮 minijuegos
  if (typeof Zoo !== 'undefined' && typeof Zoo.onLevelStart === 'function') Zoo.onLevelStart(i); // 🦁 zoológico
  if (typeof Bowling !== 'undefined') Bowling.buildForLevel(i, LEVEL.group); // 🎳 bolera solo en Immokalee (idx 3)
  Particles.clear();
  Avatar.build();
  const s = LEVEL.start;
  respawn = { x: s.x, y: s.y, z: s.z };
  Player.reset(s.x, s.y, s.z);
  coinsRun = 0;
  shakeT = 0; shakeMag = 0;
  $('hud-level').textContent = LEVELS[i].emoji + ' ' + wname(i);
  $('hud-coins').textContent = SAVE.coins;
  $('speedlines').style.opacity = 0;
  showMain(null); hideOverlays();
  $('hud').classList.remove('hidden');
  $('side-menu').classList.remove('hidden');
  if (isTouch) $('touch').classList.remove('hidden');
  MODE = 'play';
  if (SAVE.music) Audio2.startMusic();
  showStageCard(worldPos(i), i); // 🎬 tarjeta cinematográfica de etapa (se oculta sola)
  if (stageBannerTO) clearTimeout(stageBannerTO);
  stageBannerTO = setTimeout(() => { // el banner de bienvenida entra tras la tarjeta
    const isNew = (typeof discoverWorld === 'function') ? discoverWorld(i) : false;
    if (isNew) showBanner('🌍 ¡Descubriste ' + wname(i) + '!', '+50 🪙 bono de explorador · este mundo es tuyo, sin niveles');
    else showBanner('¡Bienvenido a ' + wname(i) + '!', (wdesc(i) ? wdesc(i) + ' · ' : '') + '🌍 Explora libre, sin prisa');
  }, 1500);
}

/* ============ TARJETA CINEMATOGRÁFICA DE ETAPA (diseño original GEAYI) ============ */
let stageCardTO = null, stageBannerTO = null, stageSeq = 0;
function showStageCard(pos, i) {
  const c = $('stage-card'); if (!c) return;
  const seq = ++stageSeq;
  $('stage-kicker').textContent = 'MUNDO ' + (pos + 1);
  $('stage-emoji').textContent = (typeof LEVELS !== 'undefined' && LEVELS[i] && LEVELS[i].emoji) || '🌟';
  $('stage-name').textContent = (wname(i) || '').toUpperCase();
  c.classList.remove('hidden', 'hide');
  void c.offsetWidth; // reiniciar animación
  c.classList.add('show');
  if (stageCardTO) clearTimeout(stageCardTO);
  // Se oculta sola; el temporizador arranca tras pintar para no perderse en la carga.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (seq !== stageSeq) return;
    stageCardTO = setTimeout(() => {
      c.classList.remove('show'); c.classList.add('hide');
      setTimeout(() => c.classList.add('hidden'), 320);
    }, 2100);
  }));
}

/* ============ MUNDO LIBRE (estilo Roblox): aquí no hay niveles ============ */
// GEAYI es un mundo libre: nunca dice "pasaste de nivel". Al visitar un mundo
// por primera vez se celebra el descubrimiento (trofeo + poder + bono) y listo.
function discoverWorld(idx) {
  try {
    SAVE.visited = SAVE.visited || {};
    if (SAVE.visited[idx]) return false;
    SAVE.visited[idx] = Date.now();
    if (typeof Trophy !== 'undefined') Trophy.unlock('w' + (idx + 1)); // 🏆 trofeo del mundo
    if (typeof Powers !== 'undefined' && typeof Powers.onWorldComplete === 'function') Powers.onWorldComplete(idx); // ⚡ poder gratis por mundo
    try { // bono de explorador
      if (typeof Shop2 !== 'undefined' && Shop2 && typeof Shop2.addCoins === 'function') Shop2.addCoins(50);
      else SAVE.coins += 50;
      const h = $('hud-coins'); if (h) h.textContent = SAVE.coins;
    } catch (e) {}
    persist();
    for (let k = 0; k < 4; k++) {
      setTimeout(() => {
        try {
          const s = (typeof LEVEL !== 'undefined' && LEVEL.start) || { x: 0, y: 2, z: 0 };
          Particles.burst(s.x + (Math.random() - 0.5) * 5, s.y + 2.5 + Math.random() * 2.5, s.z,
            [0xffd23f, 0xff2fd6, 0x00e5ff, 0x59d867, 0xffffff], 22, 8);
        } catch (e) {}
      }, k * 170);
    }
    return true;
  } catch (e) { return false; }
}

/* ============ MENÚ AJUSTES ============ */
function refreshSettings() {
  const on = v => (v ? 'ON' : 'OFF');
  $('set-music').textContent = '🎵 Música: ' + on(SAVE.music);
  $('set-sfx').textContent = '🔊 Efectos: ' + on(sfxOn());
  $('set-ui').textContent = '🔘 Botones: ' + on(uiOn());
  $('set-notifs').textContent = '🔔 Avisos: ' + on(notifsOn());
  $('set-voice').textContent = '🗣️ Voz: ' + on(typeof Voz !== 'undefined' && Voz.on);
  $('set-storms').textContent = '⛈️ Tormentas: ' + on(!!SAVE.storms);
  $('set-fast').textContent = '🚀 Modo rápido: ' + on(SAVE.fastMode !== false);
}
/* 📤📥 Pasar progreso entre enlaces: exporta tu SAVE como código */
function exportSave() {
  try {
    Audio2.click();
    const code = btoa(unescape(encodeURIComponent(JSON.stringify(SAVE))));
    const done = (val) => {
      if (val) {
        try {
          const data = JSON.parse(decodeURIComponent(escape(atob(val.trim()))));
          if (data && typeof data === 'object') {
            SAVE = data; persist();
            if (typeof toast === 'function') toast('✅ Progreso recuperado. Reiniciando…');
            setTimeout(() => location.reload(), 1200);
            return;
          }
        } catch (e) {}
        if (typeof toast === 'function') toast('⚠️ Código inválido');
      }
    };
    // Mostrar código para copiar + opción de pegar uno
    const prev = prompt('📤 TU CÓDIGO (cópialo):\n\n' + code + '\n\nSi tienes un código de otro enlace, bórralo y pega el tuyo aquí:', code);
    if (prev != null && prev.trim() !== code) done(prev);
    else if (prev != null) { if (typeof toast === 'function') toast('📋 Código copiado en el texto de arriba'); }
  } catch (e) {}
}
/* 🚀 Modo rápido: sin sombras + menos resolución = juego más fluido en teléfonos */
function applyFastMode() {
  try {
    // Por defecto ACTIVADO (true) para que no se pegue; el usuario puede apagarlo en Ajustes
    const fast = (typeof SAVE !== 'undefined' && SAVE.fastMode !== false);
    if (typeof renderer !== 'undefined' && renderer) {
      if (renderer.shadowMap) renderer.shadowMap.enabled = !fast;
      renderer.setPixelRatio(fast ? 1 : Math.min(window.devicePixelRatio || 1, 2));
      if (typeof scene !== 'undefined' && scene) scene.traverse(o => { if (o.material) o.material.needsUpdate = true; });
    }
  } catch (e) {}
}
function openSettings() { Audio2.click(); refreshSettings(); $('screen-settings').classList.remove('hidden'); }
function closeSettings() { $('screen-settings').classList.add('hidden'); }

function pauseGame() {
  if (MODE !== 'play') return;
  MODE = 'pause';
  Audio2.stopMusic();
  if (typeof Audio2.engineStop === 'function') Audio2.engineStop(); // FASE 2: callar el motor en pausa
  $('btn-leave-room').classList.toggle('hidden', !(typeof Net !== 'undefined' && Net.active));
  $('side-menu').classList.add('hidden');
  $('screen-pause').classList.remove('hidden');
}
function resumeGame() {
  $('screen-pause').classList.add('hidden');
  MODE = 'play';
  $('side-menu').classList.remove('hidden');
  if (SAVE.music) Audio2.startMusic();
  // FASE 2: reanudar el motor si seguía en un vehículo
  if (typeof Vehicle !== 'undefined' && Vehicle.mode !== 'none' && typeof Audio2.engineStart === 'function') Audio2.engineStart();
}

let menuGroup = null;
function buildMenuScene() {
  clearLevel();
  if (menuGroup) { scene.remove(menuGroup); menuGroup = null; }
  scene.background = new THREE.Color(0x05010f);
  scene.fog = new THREE.Fog(0x0a0620, 30, 130);
  menuGroup = new THREE.Group();
  scene.add(menuGroup);
  const podium = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.2, 1, 24),
    new THREE.MeshStandardMaterial({ color: 0x1a1440, emissive: 0x7b2fff, emissiveIntensity: 0.55, roughness: 0.5 }));
  podium.position.y = -0.5;
  menuGroup.add(podium);
  const ringM = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.6 + i * 0.9, 0.09, 8, 40), ringM);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.4 + i * 0.9;
    ring.userData.spin = 0.5 + i * 0.25;
    (menuGroup.userData.spinners = menuGroup.userData.spinners || []).push(ring);
    menuGroup.add(ring);
  }
  const grid = new THREE.GridHelper(140, 46, 0x00e5ff, 0x7b2fff);
  grid.position.y = -1;
  grid.material.transparent = true; grid.material.opacity = 0.4;
  menuGroup.add(grid);
  Avatar.build();
  Avatar.group.position.set(0, 0, 0);
  Avatar.group.rotation.y = 0;
  Avatar.blob.position.set(0, 0.03, 0);
}

function toMenu() {
  if (typeof stopJob === 'function') stopJob(true); // 🧰 trabajos: limpiar al salir al menú
  if (typeof CityLife3 !== 'undefined' && typeof CityLife3.onLevelEnd === 'function') CityLife3.onLevelEnd();
  if (typeof CityLife1 !== 'undefined' && typeof CityLife1.onLevelEnd === 'function') CityLife1.onLevelEnd();
  if (typeof CityLife2 !== 'undefined' && typeof CityLife2.onLevelEnd === 'function') CityLife2.onLevelEnd();
  if (typeof FunPark !== 'undefined' && typeof FunPark.onLevelEnd === 'function') FunPark.onLevelEnd();
  if (typeof leaveRoom === 'function') leaveRoom(true); // salir de la sala online si aplica
  if (typeof resetVehiclesForLevel === 'function') resetVehiclesForLevel(); // FASE 2
  MODE = 'menu';
  hideOverlays();
  $('hud').classList.add('hidden');
  $('side-menu').classList.add('hidden');
  $('touch').classList.add('hidden');
  $('speedlines').style.opacity = 0;
  $('menu-coins').textContent = SAVE.coins;
  buildMenuScene();
  showMain('screen-menu');
  if (SAVE.music) Audio2.startMusic();
}

/* ================= LOOP ================= */
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  if (MODE === 'play') {
    levelTime += dt; // ⏱️ levelTime ahora es solo reloj de animación (sin cronómetro de nivel en el HUD)
    const inp = readInput();
    updatePlayer(dt, inp);
    if (typeof BuildMode !== 'undefined' && BuildMode.cullFar) BuildMode.cullFar(); // 🧱 sin límites: oculta bloques lejanos para no ponerse lento
    if (typeof Stream !== 'undefined' && Stream.update) Stream.update(); // 🌆 streaming estilo Roblox: solo muestra lo cercano
    if (typeof updateNPCs === 'function') updateNPCs(dt); // FASE 2: peatones
    if (typeof InfiniteStreets !== 'undefined') InfiniteStreets.update(dt); // 🌆 calles infinitas (fase 3)
    if (typeof LotSystem !== 'undefined') LotSystem.update(dt); // 🪧 lotes en venta (fase 2)
    if (typeof GeayiAgent !== 'undefined') GeayiAgent.update(dt); // 🤖 agente GEAYI: robot compañero
    if (typeof ThemePark !== 'undefined' && ThemePark.update) ThemePark.update(dt); // 🎢 parque GEAYI
    if (typeof Aquarium !== 'undefined' && Aquarium.update) Aquarium.update(dt); // 🐠 acuario
    if (typeof Furniture !== 'undefined') Furniture.update(dt); // 🪑 tienda de muebles
    if (typeof Weapons !== 'undefined') Weapons.update(dt); // 🔫 proyectiles y blancos
    if (typeof BizSim !== 'undefined') BizSim.update(dt); // 💰 ingreso pasivo + botón de proximidad
    if (typeof Bank !== 'undefined') Bank.update(dt); // 🏦 interés diario
    if (typeof DailyQuests !== 'undefined') DailyQuests.update(dt); // 📋 misiones diarias
    if (typeof updateWorldFx === 'function') updateWorldFx(dt); // GEAYI: drones, cohetes, disco
    if (typeof updateVehiclePrompt === 'function') updateVehiclePrompt(); // FASE 2: botón SUBIR/BAJAR
    if (typeof updateShopPrompt === 'function') updateShopPrompt(); // TIENDAS: botón 🛍️ cerca de tienda física
    if (typeof updateTalkPrompt === 'function') updateTalkPrompt(); // DEPENDIENTES: detecta al que atiende
    if (typeof updateContextButtons === 'function') updateContextButtons(); // un botón: PAGAR > SOLTAR > HABLAR > AGARRAR
    if (typeof updateFurnButtons === 'function') updateFurnButtons(); // 🪑🛏️✋✅ botones de muebles
    if (typeof updateWeaponButtons === 'function') updateWeaponButtons(); // 🔫🗡️ botones de armas de juguete
    try { // 🖐️ lo que llevas en la mano ya cuelga del brazo; si no tiene mano, flota al frente
      const c = window.__carried;
      if (c && c.t && c.t.o && typeof Player !== 'undefined' && Player.pos && !carriedInHand()) {
        const a = Player.heading || 0;
        c.t.o.position.set(Player.pos.x + Math.sin(a) * 0.85, Player.pos.y + 1.15, Player.pos.z + Math.cos(a) * 0.85);
        c.t.o.rotation.set(0, a, 0);
      }
    } catch (e) {}
    if (typeof _updateSmoke === 'function') _updateSmoke(dt); // FASE 3: humo de chimeneas (mundo 9)
    if (typeof _updateSled === 'function') _updateSled(dt); // FASE 3: botón del trineo (después del de vehículos)
    if (typeof updateAirportPrompt === 'function') updateAirportPrompt(); // VIAJES: botón ✈️ VIAJAR
    if (typeof updateCasa === 'function') updateCasa(dt); // 🏠 panel de decoración de la casa
    if (typeof updatePets === 'function') updatePets(dt); // 🐾 mascota seguidora
    if (typeof updateFishing === 'function') updateFishing(dt); // 🎣 pesca en Lake Trafford
    if (typeof updateRacing === 'function') updateRacing(dt); // 🏁 carreras GEAYI
    if (typeof updateObservatory === 'function') updateObservatory(dt); // 🔭 observatorio
    if (typeof updateRanch === 'function') updateRanch(dt); // 🤠 rancho y caballos
    if (typeof updateWeather === 'function') updateWeather(dt); // 🌦️ clima y ciclo día/noche
    if (typeof DayNight !== 'undefined' && typeof DayNight.update === 'function') DayNight.update(dt); // 🌞🌙 estrellas + persistencia de la hora
    if (typeof CityLife1 !== 'undefined') CityLife1.update(dt); // 🏙️ vida de ciudad T1 (después de weather: interruptor de lluvia)
    if (typeof updateJobs === 'function') updateJobs(dt); // 🧰 trabajos en Immokalee
    if (typeof Dealership !== 'undefined' && typeof Dealership.update === 'function') Dealership.update(dt); // 🚗 vitrina giratoria
    if (typeof Vet !== 'undefined' && typeof Vet.update === 'function') Vet.update(dt); // 🏥 veterinaria (mascota, clientes, stats)
    if (typeof Train !== 'undefined' && typeof Train.update === 'function') Train.update(dt); // 🚂 tren de Ciudad Neón
    if (typeof updateCityLife3 === 'function') updateCityLife3(dt); // 🎉 tanda 3 (temporadas, negocio, bomberos…)
    if (typeof CarWash !== 'undefined') CarWash.update(dt); // 🧽 autolavado propio
    if (typeof updateCityLife2 === 'function') updateCityLife2(dt); // 🏙️ tanda 2 (casas, feria, tormentas…)
    if (typeof FunPark !== 'undefined' && typeof FunPark.update === 'function') FunPark.update(dt); // 🏟️ estadio, playa, heli, cine
    if (typeof Castle !== 'undefined' && typeof Castle.update === 'function') Castle.update(dt); // 🏰 castillo: cofres y antorchas
    if (typeof WaterPark !== 'undefined' && typeof WaterPark.update === 'function') WaterPark.update(dt); // 🌊 toboganes, alberca, rampas
    if (typeof Zoo !== 'undefined' && typeof Zoo.update === 'function') Zoo.update(dt); // 🦁 animales y botón 🍎
    if (typeof Fireworks !== 'undefined') Fireworks.update(dt); // 🎆 fuegos artificiales
    if (typeof Community !== 'undefined' && typeof Community.tick === 'function') Community.tick(dt); // 👥 fantasmas, concurso, historia
    if (typeof Bowling !== 'undefined' && typeof Bowling.update === 'function') Bowling.update(dt); // 🎳 bolera: juego y física
    if (typeof netTick === 'function') netTick(dt); // multijugador: enviar/recibir posiciones
    if (typeof Concerts !== 'undefined' && typeof Concerts.update === 'function') Concerts.update(dt); // 🎤 conciertos en Ciudad Neón
    if (typeof LiveEvents !== 'undefined' && typeof LiveEvents.update === 'function') LiveEvents.update(dt); // 🎪 eventos en vivo en la plaza
    if (typeof Powers !== 'undefined' && typeof Powers.update === 'function') Powers.update(dt); // ⚡ superpoderes
    if (typeof Minigames !== 'undefined' && typeof Minigames.update === 'function') Minigames.update(dt); // 🎮 minijuegos
    if (typeof Roleplay !== 'undefined' && typeof Roleplay.update === 'function') Roleplay.update(dt); // 🏡 vida/rol
    if (typeof Sports !== 'undefined' && typeof Sports.update === 'function') Sports.update(dt); // 🏟️ olimpiadas
  } else if (MODE === 'build' && typeof BuildMode !== 'undefined') { BuildMode.update(dt); // 🧱 modo construir
  } else if (MODE !== 'pause' && MODE !== 'win') {
    const a = t * 0.35;
    camera.position.set(Math.sin(a) * 11, 5.2, Math.cos(a) * 11);
    camera.lookAt(0, 1.6, 0);
    if (Avatar.group) Avatar.group.rotation.y += dt * 0.9;
    Avatar.animate(dt, 0, true);
    if (menuGroup && menuGroup.userData.spinners)
      menuGroup.userData.spinners.forEach(r => { r.rotation.z += r.userData.spin * dt; });
  }
  Particles.update(dt);
  renderer.render(scene, camera);
}

/* ================= ARRANQUE ================= */
/* 🌐 selector de idioma en el menú (usa LANGS de i18n.js) */
function buildLangPicker() {
  const root = $('lang-picker');
  if (!root) return;
  root.innerHTML = '<span class="lang-label">' + T('app.lang') + ':</span>';
  LANGS.forEach(L => {
    const b = document.createElement('button');
    b.className = 'btn btn-small lang-btn' + (LANG === L.id ? ' lang-active' : '');
    b.textContent = L.flag + ' ' + L.id.toUpperCase();
    b.addEventListener('click', () => { Audio2.init(); Audio2.click(); setLang(L.id); });
    root.appendChild(b);
  });
}

function boot() {
  if (typeof THREE === 'undefined' || !webglOK()) {
    if (typeof THREE === 'undefined')
      $('glmsg').textContent = 'No se pudo cargar la librería 3D (Three.js). Revisa tu conexión a internet e inténtalo de nuevo.';
    $('nogl').classList.remove('hidden');
    return;
  }
  initThree();
  if (typeof applyFastMode === 'function') applyFastMode(); // 🚀 aplicar modo rápido guardado
  if (typeof Candy !== 'undefined') Candy.init(); // 🍬 colores caramelo: más luz
  Particles.init();
  if (typeof Train !== 'undefined') Train.init(); // 🚂 botones SUBIR/BAJAR del tren
  if (typeof Powers !== 'undefined' && typeof Powers.init === 'function') Powers.init(); // ⚡ superpoderes
  if (typeof Minigames !== 'undefined' && typeof Minigames.init === 'function') Minigames.init(); // 🎮 minijuegos
  if (typeof Roleplay !== 'undefined' && typeof Roleplay.init === 'function') Roleplay.init(); // 🏡 vida/rol
  if (typeof Sports !== 'undefined' && typeof Sports.init === 'function') Sports.init(); // 🏟️ olimpiadas
  setupKeyboard();
  setupTouch();
  setupDriveButtons(); // 🚗 botones de manejo (carro/bici)
  setupCamDrag(); // 📷 cámara libre estilo Roblox
  window.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('pointerdown', () => Audio2.init());

  // menú
  $('btn-play').addEventListener('click', () => { Audio2.init(); Audio2.click(); renderLevels(); showMain('screen-levels'); MODE = 'levels'; });
  $('btn-custom').addEventListener('click', () => { Audio2.init(); Audio2.click(); renderCustom(); showMain('screen-custom'); MODE = 'custom'; });
  $('btn-trophies').addEventListener('click', () => {
    Audio2.init(); Audio2.click();
    const root = $('trophies-root'); root.innerHTML = '';
    if (typeof renderTrophyPanel === 'function') root.appendChild(renderTrophyPanel());
    showMain('screen-trophies'); MODE = 'menu';
  });
  $('btn-trophies-back').addEventListener('click', () => { Audio2.click(); showMain('screen-menu'); });
  $('btn-howto').addEventListener('click', () => { Audio2.init(); Audio2.click(); $('screen-howto').classList.remove('hidden'); });
  $('btn-howto-close').addEventListener('click', () => { Audio2.click(); $('screen-howto').classList.add('hidden'); });
  $('btn-settings').addEventListener('click', openSettings);
  if (typeof ShareButtons !== 'undefined') ShareButtons.init(); // 📤 compartir en redes
  $('set-close').addEventListener('click', () => { Audio2.click(); closeSettings(); });
  $('set-music').addEventListener('click', () => { toggleMusic(); refreshSettings(); });
  $('set-sfx').addEventListener('click', () => { SAVE.sfx = !sfxOn(); persist(); Audio2.click(); refreshSettings(); });
  $('set-ui').addEventListener('click', () => { SAVE.ui = !uiOn(); persist(); Audio2.click(); refreshSettings(); });
  $('set-notifs').addEventListener('click', () => { SAVE.notifs = !notifsOn(); persist(); Audio2.click(); refreshSettings(); });
  $('set-voice').addEventListener('click', () => { if (typeof Voz !== 'undefined') Voz.toggle(); refreshSettings(); });
  $('set-storms').addEventListener('click', () => { SAVE.storms = !SAVE.storms; persist(); Audio2.click(); refreshSettings(); });
  $('set-fast').addEventListener('click', () => { SAVE.fastMode = !SAVE.fastMode; persist(); Audio2.click(); applyFastMode(); refreshSettings(); });
  $('set-export').addEventListener('click', () => { exportSave(); });
  // botón Google Play (se activa solo cuando el dueño pega el enlace en online.js)
  (function () {
    var b = $('btn-store');
    if (typeof isStoreConfigured === 'function' && isStoreConfigured() && typeof PLAY_STORE_URL !== 'undefined') {
      b.addEventListener('click', function () { Audio2.click(); window.open(PLAY_STORE_URL, '_blank'); });
    } else {
      b.classList.add('btn-disabled');
      b.textContent = '📲 PRÓXIMAMENTE EN GOOGLE PLAY';
    }
  })();
  $('btn-levels-back').addEventListener('click', () => {
    if (sideReturn) { closeSideScreen(); return; }
    Audio2.click(); showMain('screen-menu'); MODE = 'menu';
  });
  /* 🌍 Mis Mundos: volver y crear */
  $('btn-worlds-back').addEventListener('click', () => {
    Audio2.click(); renderLevels(); showMain('screen-levels'); MODE = 'levels';
  });
  $('btn-world-create').addEventListener('click', () => {
    Audio2.click();
    if (typeof MODE !== 'undefined' && MODE === 'play' &&
        typeof WorldEconomy !== 'undefined' && typeof WorldEconomy.createWorld === 'function') {
      WorldEconomy.createWorld();
      renderWorlds();
    } else {
      toast('🌍 Entra a un nivel, párate en tu lote 🪧 y crea tu mundo ahí (' + ((typeof WorldEconomy !== 'undefined' && WorldEconomy.priceText) ? WorldEconomy.priceText() : '100🪙') + ')');
    }
  });
  $('btn-custom-back').addEventListener('click', () => {
    if (sideReturn) { closeSideScreen(); return; }
    Audio2.click(); Avatar.build(); showMain('screen-menu'); MODE = 'menu';
  });
  // menú lateral (HUD): Tienda · Mundos · Personaje
  $('btn-side-store').addEventListener('click', () => openSideScreen('store'));
  $('btn-side-worlds').addEventListener('click', () => openSideScreen('worlds'));
  $('btn-side-char').addEventListener('click', () => openSideScreen('char'));
  $('btn-side-jobs').addEventListener('click', () => { if (typeof openJobsPanel === 'function') openJobsPanel(); });
  $('btn-side-powers').addEventListener('click', () => { if (typeof Powers !== 'undefined' && typeof Powers.openPanel === 'function') Powers.openPanel(); }); // ⚡ superpoderes
  $('btn-side-minigames').addEventListener('click', () => { if (typeof Minigames !== 'undefined' && typeof Minigames.openMenu === 'function') Minigames.openMenu(); }); // 🎮 minijuegos
  $('btn-side-vida').addEventListener('click', () => { if (typeof Roleplay !== 'undefined' && typeof Roleplay.openHub === 'function') Roleplay.openHub(); }); // 🏡 vida/rol

  // HUD y pausa
  $('btn-pause').addEventListener('click', () => { Audio2.click(); pauseGame(); });
  // FASE 2: botones de vehículos (táctil y mouse)
  $('btn-board').addEventListener('click', () => { Audio2.init(); if (typeof Sled !== 'undefined' && Sled.tryInteract && Sled.tryInteract()) return; if (typeof vehicleInteract === 'function') vehicleInteract(); });
  $('btn-exit').addEventListener('click', () => { Audio2.init(); if (typeof Sled !== 'undefined' && Sled.tryInteract && Sled.tryInteract()) return; if (typeof vehicleInteract === 'function') vehicleInteract(); });
  // TIENDAS FÍSICAS: botón 🛍️ cerca de la tienda abre la Tienda GEAYI; 🍔 abre el menú de comida
  $('btn-shopbuy').addEventListener('click', () => {
    Audio2.click();
    const foodName = (typeof window !== 'undefined' && window.__nearFood) || null;
    if (foodName) { openFoodPanel(foodName); return; }
    if (typeof Shop2 !== 'undefined' && Shop2.open) Shop2.open();
  });
  // DEPENDIENTE: botón 💬 habla con la persona que atiende la tienda
  $('btn-talk').addEventListener('click', () => {
    Audio2.click();
    const k = (typeof window !== 'undefined' && window.__nearKeeper) || null;
    if (!k) return;
    if (k.food) { openFoodPanel(k.shop); return; }
    if (typeof Shop2 !== 'undefined' && Shop2.open) Shop2.open();
  });
  // PAGAR: botón 💰 cuando llevas un producto a la caja
  $('btn-pay').addEventListener('click', () => { payForCarried(); });
  // AGARRAR/SOLTAR: botón 🖐️ agarra lo cercano o suelta lo que llevas en la mano
  $('btn-grab').addEventListener('click', () => {
    Audio2.click();
    if (window.__carried) {
      const a = (typeof Player !== 'undefined' && Player.pos) ? (Player.heading || 0) : 0;
      dropItem(Player.pos.x + Math.sin(a) * 1.2, Player.pos.z + Math.cos(a) * 1.2);
      return;
    }
    const t = window.__nearGrab;
    if (t) pickupItem(t);
  });
  // MUEBLES: 🪑 sentarse / 🛏️ acostarse / ✋ mover / ✅ colocar
  if ($('btn-sit')) $('btn-sit').addEventListener('click', () => {
    Audio2.click();
    const s = (typeof window !== 'undefined' && window.__nearSeat) || (typeof Furniture !== 'undefined' && Furniture.nearSeat());
    if (!s || typeof Furniture === 'undefined') return;
    const ref = Furniture.poseRefFor(s);
    if (ref && typeof Player !== 'undefined' && Player.sit(ref)) toast('🪑 ¡A descansar un rato!');
  });
  if ($('btn-lie')) $('btn-lie').addEventListener('click', () => {
    Audio2.click();
    const b = (typeof window !== 'undefined' && window.__nearBed) || (typeof Furniture !== 'undefined' && Furniture.nearBed());
    if (!b || typeof Furniture === 'undefined') return;
    const ref = Furniture.poseRefFor(b);
    if (ref && typeof Player !== 'undefined' && Player.lieDown(ref)) toast('🛏️ ¡A dormir la siesta!');
  });
  if ($('btn-move')) $('btn-move').addEventListener('click', () => {
    Audio2.click();
    const f = (typeof window !== 'undefined' && window.__nearFurn) || (typeof Furniture !== 'undefined' && Furniture.nearFurniture());
    if (!f || typeof Furniture === 'undefined') return;
    Furniture.startMove(f);
  });
  if ($('btn-place')) $('btn-place').addEventListener('click', () => {
    Audio2.click();
    if (typeof Furniture !== 'undefined') Furniture.placeMove();
  });
  if ($('btn-fire')) $('btn-fire').addEventListener('click', () => { // 🔫 disparar arma de juguete
    if (typeof Weapons !== 'undefined') Weapons.tryFire();
  });
  if ($('btn-swing')) $('btn-swing').addEventListener('click', () => { // 🗡️ golpe de espada de espuma
    if (typeof Weapons !== 'undefined') Weapons.swing();
  });


/* ============ MENÚ DE COMIDA (tiendas físicas food:true) ============ */
const FOOD_MENU = [
  { emoji: '🍔', name: 'Hamburguesa Tamps', price: 10, secs: 75, desc: 'La famosa de Los Hermanos Tamps' },
  { emoji: '🌮', name: 'Taco al Pastor', price: 5, secs: 45, desc: 'Directo de la carreta' },
  { emoji: '🍦', name: 'Paleta Michoacana', price: 8, secs: 60, desc: 'De Delicias Michoacanas' },
  { emoji: '🥤', name: 'Agua Fresca', price: 6, secs: 50, desc: 'Bien fría' },
];
function closeFoodPanel() {
  try { const ov = document.getElementById('food-ov'); if (ov && ov.parentNode) ov.parentNode.removeChild(ov); } catch (e) {}
}
function buyFoodItem(i) {
  const it = FOOD_MENU[i]; if (!it) return;
  try { if (typeof Audio2 !== 'undefined' && Audio2.click) Audio2.click(); } catch (e) {}
  if (typeof Shop2 !== 'undefined' && Shop2.spendCoins) {
    if (!Shop2.spendCoins(it.price)) { toast('🪙 Te faltan monedas (' + it.price + ' 🪙)'); return; }
  }
  try { if (typeof Player !== 'undefined' && Player.fx) Player.fx.speedT = Math.max(Player.fx.speedT || 0, it.secs); } catch (e) {}
  toast(it.emoji + ' ¡' + it.name + '! Velocidad ×1.45 por ' + it.secs + 's ⚡');
  closeFoodPanel();
}
function openFoodPanel(shopName) {
  closeFoodPanel();
  try {
    const ov = document.createElement('div');
    ov.id = 'food-ov'; ov.className = 'screen overlay';
    let html = '<div class="panel" style="max-width:430px;width:100%"><h2>🍔 ' + shopName + '</h2>' +
      '<div class="job-note">¡Come algo rico y corre más rápido! ⚡</div>';
    FOOD_MENU.forEach((it, i) => {
      html += '<div class="job-card"><div class="job-emoji">' + it.emoji + '</div>' +
        '<div class="job-info"><div class="job-name">' + it.name + '</div>' +
        '<div class="job-desc">' + it.desc + ' · Velocidad ×1.45 por ' + it.secs + 's</div></div>' +
        '<button class="btn job-go" data-food="' + i + '">🪙 ' + it.price + '</button></div>';
    });
    html += '<div class="menu-buttons"><button class="btn" data-act="close">✕ Cerrar</button></div></div>';
    ov.innerHTML = html;
    document.body.appendChild(ov);
    Array.prototype.forEach.call(ov.querySelectorAll('[data-food]'), b => {
      b.addEventListener('click', () => buyFoodItem(+b.getAttribute('data-food')));
    });
    Array.prototype.forEach.call(ov.querySelectorAll('[data-act="close"]'), b => {
      b.addEventListener('click', closeFoodPanel);
    });
    ov.addEventListener('click', e => { if (e.target === ov) closeFoodPanel(); });
  } catch (e) {}
}
  // VIAJES: aeropuerto → menú de destinos
  $('btn-travel').addEventListener('click', () => { Audio2.init(); if (typeof openTravelMenu === 'function') openTravelMenu(); });
  $('btn-travel-close').addEventListener('click', () => { Audio2.click(); if (typeof closeTravelMenu === 'function') closeTravelMenu(); });
  $('hud-music').addEventListener('click', toggleMusic);
  $('btn-resume').addEventListener('click', () => { Audio2.click(); resumeGame(); });
  $('btn-restart').addEventListener('click', () => { $('screen-pause').classList.add('hidden'); startLevel(LEVEL.idx); });
  $('btn-quit').addEventListener('click', () => { Audio2.click(); toMenu(); });

  // victoria
  $('btn-next').addEventListener('click', () => startLevel(worldIdx(worldPos(LEVEL.idx) + 1)));
  $('btn-replay').addEventListener('click', () => startLevel(LEVEL.idx));
  $('btn-winmenu').addEventListener('click', () => { Audio2.click(); toMenu(); });

  updateMusicBtns();
  $('menu-coins').textContent = SAVE.coins;
  if (typeof onlineInit === 'function') onlineInit(); // cuentas + multijugador (online.js)
  if (typeof ThemePark !== 'undefined' && ThemePark.init) ThemePark.init(); // 🎢 botón SUBIR de la montaña rusa
  if (typeof ChatFriends !== 'undefined') ChatFriends.init(); // 💬 chat y amigos
  if (typeof CityLife3 !== 'undefined') CityLife3.init(); // 🎉 temporadas, negocio, banco, karaoke, bomberos, mapa
  if (typeof CarWash !== 'undefined') CarWash.init(); // 🧽 autolavado propio
  if (typeof CityLife1 !== 'undefined') CityLife1.init(); // 🏙️ vida de ciudad T1 (tráfico, tiendas, gasolinera…)
  if (typeof CityLife2 !== 'undefined') CityLife2.init(); // 🏙️ vida de ciudad T2 (casas, feria, huracanes…)
  if (typeof FunPark !== 'undefined') FunPark.init(); // 🏟️ estadio, playa, helicóptero, cine
  if (typeof WaterPark !== 'undefined') WaterPark.init(); // 🌊 parque acuático (rampas + toboganes)
  if (typeof Zoo !== 'undefined' && typeof Zoo.init === 'function') Zoo.init(); // 🦁 zoológico: botón 🍎
  if (typeof Fireworks !== 'undefined') Fireworks.init(); // 🎆 fuegos artificiales
  if (typeof Shop2 !== 'undefined') Shop2.init(); // 🪙 tienda de monedas y premium
  if (typeof Promos !== 'undefined') Promos.init(); // 🎟️ códigos promocionales
  if (typeof Vet !== 'undefined') Vet.init(); // 🏥 veterinaria GEAYI
  if (typeof Dealership !== 'undefined') Dealership.init(); // 🚗 tienda de carros
  if (typeof Community !== 'undefined') Community.init(); // 👥 comunidad: historia, logros, regalos, voz
  if (typeof Bowling !== 'undefined') Bowling.init(); // 🎳 bolera GEAYI en Immokalee
  if (typeof Bridges !== 'undefined') Bridges.init(); // 🌉 puentes peatonales
  if (typeof Castle !== 'undefined') Castle.init(); // 🏰 castillo GEAYI (rampas caminables)
  if (typeof BuildMode !== 'undefined') BuildMode.init(); // 🧱 modo construir
  if (typeof GeayiAgent !== 'undefined') GeayiAgent.init(); // 🤖 agente GEAYI: compañero constructor
  if (typeof Concerts !== 'undefined') Concerts.init(); // 🎤 conciertos en Ciudad Neón
  if (typeof initLang === 'function') initLang();
  if (typeof applyI18n === 'function') applyI18n(); // pinta textos + selector de idioma
  buildMenuScene();
  MODE = 'menu';
  $('loading').classList.add('hidden'); // listo: ocultar pantalla de carga
  loop();
}
/* ============ TOCAR Y AGARRAR COSAS (tiendas y casas) ============ */
const _tapRC = (typeof THREE !== 'undefined' && THREE.Raycaster) ? new THREE.Raycaster() : null;
const _tapNDC = (typeof THREE !== 'undefined' && THREE.Vector2) ? new THREE.Vector2() : null;
const _tapV = (typeof THREE !== 'undefined' && THREE.Vector3) ? new THREE.Vector3() : null;
const _ctxV = (typeof THREE !== 'undefined' && THREE.Vector3) ? new THREE.Vector3() : null;
window.__carried = null; // {t} lo que llevas en la mano
window.__bagCount = 0; // cosas compradas
window.__nearGrab = null; // objeto agarrable más cercano
function updateContextButtons() { // un solo botón visible: PAGAR > SOLTAR > HABLAR > AGARRAR
  if (typeof MODE === 'undefined' || MODE !== 'play') return;
  const bt = (typeof $ === 'function') ? $('btn-talk') : null;
  const bp = (typeof $ === 'function') ? $('btn-pay') : null;
  const bg = (typeof $ === 'function') ? $('btn-grab') : null;
  if (!bt || !bp || !bg || typeof Player === 'undefined' || !Player.pos) return;
  const c = window.__carried, k = window.__nearKeeper || null;
  let grabT = null;
  if (!c && typeof TOUCHABLES !== 'undefined' && TOUCHABLES.length && _ctxV) {
    let bd = 3.5 * 3.5; // 🖐️ radio de agarre más generoso en el celular
    for (const t of TOUCHABLES) {
      if (!t || !t.o || !t.o.visible) continue;
      try { t.o.getWorldPosition(_ctxV); } catch (e) { continue; }
      const dx = Player.pos.x - _ctxV.x, dz = Player.pos.z - _ctxV.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < bd) { bd = d2; grabT = t; }
    }
  }
  window.__nearGrab = grabT;
  bt.classList.add('hidden'); bp.classList.add('hidden'); bg.classList.add('hidden');
  if (c && c.t && c.t.kind === 'product' && k) {
    bp.classList.remove('hidden'); bp.textContent = '💰 PAGAR ' + c.t.price + '🪙';
  } else if (c && c.t) {
    bg.classList.remove('hidden'); bg.textContent = '⬇️ SOLTAR';
  } else if (k) {
    bt.classList.remove('hidden'); bt.textContent = '💬 ' + k.name;
  } else if (grabT) {
    bg.classList.remove('hidden'); bg.textContent = '🖐️ ' + grabT.emoji + ' ' + grabT.name;
  }
}
/* ============ MUEBLES: sentarse / acostarse / mover ============ */
function updateFurnButtons() { // 🪑 Sentarse · 🛏️ Acostarse · ✋ Mover · ✅ Colocar
  if (typeof MODE === 'undefined' || MODE !== 'play') return;
  const bs = (typeof $ === 'function') ? $('btn-sit') : null;
  const bl = (typeof $ === 'function') ? $('btn-lie') : null;
  const bm = (typeof $ === 'function') ? $('btn-move') : null;
  const bp = (typeof $ === 'function') ? $('btn-place') : null;
  if (!bs || !bl || !bm || !bp || typeof Furniture === 'undefined') return;
  bs.classList.add('hidden'); bl.classList.add('hidden'); bm.classList.add('hidden'); bp.classList.add('hidden');
  try {
    if (Furniture.isMoving()) { bp.classList.remove('hidden'); return; } // ✅ Colocar mientras se mueve
    const P = (typeof Player !== 'undefined') ? Player : null;
    if (!P || !P.pos || (P.pose && P.pose !== 'stand')) return; // sentado/acostado: sin botones
    const seat = Furniture.nearSeat(), bed = Furniture.nearBed(), furn = Furniture.nearFurniture();
    if (seat) { window.__nearSeat = seat; bs.classList.remove('hidden'); } else window.__nearSeat = null;
    if (bed) { window.__nearBed = bed; bl.classList.remove('hidden'); } else window.__nearBed = null;
    if (furn) { window.__nearFurn = furn; bm.classList.remove('hidden'); } else window.__nearFurn = null;
  } catch (e) {}
}
function updateWeaponButtons() { // 🔫 DISPARAR · 🗡️ GOLPE (armas de juguete)
  const bf = (typeof $ === 'function') ? $('btn-fire') : null;
  const bs = (typeof $ === 'function') ? $('btn-swing') : null;
  if (!bf || !bs) return;
  bf.classList.add('hidden'); bs.classList.add('hidden');
  if (typeof MODE === 'undefined' || MODE !== 'play' || typeof Weapons === 'undefined') return;
  try {
    const eq = Weapons.equippedDef();
    if (!eq) return;
    if (eq.type === 'ranged') bf.classList.remove('hidden');
    else if (eq.type === 'melee') bs.classList.remove('hidden');
  } catch (e) {}
}
let _tapStart = null;
function noteTapStart(x, y) { _tapStart = { x: x, y: y, t: performance.now() }; }
function noteTapEnd(x, y) {
  const s = _tapStart; _tapStart = null;
  if (!s) return;
  if (performance.now() - s.t < 500 && Math.hypot(x - s.x, y - s.y) < 24) handleTap(x, y);
}
function touchableWorldPos(t, out) {
  try { return t.o.getWorldPosition(out || _tapV); } catch (e) { return null; }
}
function handleTap(cx, cy) {
  if (typeof MODE === 'undefined' || MODE !== 'play') return;
  if (!_tapRC || typeof camera === 'undefined' || !camera) return;
  if (typeof Player === 'undefined' || !Player.pos) return;
  _tapNDC.set((cx / window.innerWidth) * 2 - 1, -(cy / window.innerHeight) * 2 + 1);
  try { _tapRC.setFromCamera(_tapNDC, camera); } catch (e) { return; }
  const carriedT = (window.__carried && window.__carried.t) || null;
  // 1) ¿tocó un objeto agarrable cercano?
  if (typeof TOUCHABLES !== 'undefined' && TOUCHABLES.length) {
    const cands = [];
    for (const t of TOUCHABLES) {
      if (!t || !t.o || !t.o.visible || t === carriedT) continue;
      const wp = touchableWorldPos(t, _tapV);
      if (!wp) continue;
      if (Math.hypot(Player.pos.x - wp.x, Player.pos.z - wp.z) < 5.2) cands.push(t);
    }
    if (cands.length) {
      const meshes = [];
      cands.forEach(t => { try { t.o.traverse(o => { if (o.isMesh) { o.userData._tt = t; meshes.push(o); } }); } catch (e) {} });
      let found = null;
      try { const hs = _tapRC.intersectObjects(meshes, false); if (hs.length) found = hs[0].object.userData._tt || null; } catch (e) {}
      meshes.forEach(m => { try { delete m.userData._tt; } catch (e) {} });
      if (found) { pickupItem(found); return; }
    }
  }
  // 2) lleva algo en la mano y tocó el suelo → soltarlo ahí
  if (carriedT) {
    const o = _tapRC.ray.origin, d = _tapRC.ray.direction;
    if (d.y < -0.08) {
      const tt = -o.y / d.y;
      const px = o.x + d.x * tt, pz = o.z + d.z * tt;
      if (Math.hypot(px - Player.pos.x, pz - Player.pos.z) < 6) { dropItem(px, pz); return; }
    }
    const a = Player.heading || 0;
    dropItem(Player.pos.x + Math.sin(a) * 1.2, Player.pos.z + Math.cos(a) * 1.2);
  }
}
function handPivot() { // 🤚 pivote de la mano derecha del avatar (para llevar cosas)
  try {
    const g = (typeof Avatar !== 'undefined' && Avatar.group) || null;
    const p = g && g.userData && g.userData.parts;
    return (p && (p.armR || p.armL)) || null;
  } catch (e) { return null; }
}
function carriedInHand() { // ¿el objeto ya cuelga de la mano del avatar?
  try {
    const c = window.__carried; if (!c || !c.t || !c.t.o) return false;
    const g = (typeof Avatar !== 'undefined' && Avatar.group) || null;
    if (!g) return false;
    let p = c.t.o.parent;
    while (p) { if (p === g) return true; p = p.parent; }
    return false;
  } catch (e) { return false; }
}
function pickupItem(t) {
  if (window.__carried || !t || !t.o) return;
  try { if (typeof Audio2 !== 'undefined' && Audio2.click) Audio2.click(); } catch (e) {}
  window.__carried = { t: t };
  try { // el objeto va A LA MANO (no flotando): se mueve con el brazo al caminar
    const hand = handPivot();
    if (hand && hand.attach) {
      if (!t._heldScale) t._heldScale = t.o.scale.clone();
      hand.attach(t.o); // conserva su posición mundial al cambiar de padre
      t.o.position.set(0, -0.72, 0.14); // en la palma 🤚
      t.o.rotation.set(0.35, 0, 0);
      t.o.scale.setScalar(0.55); // tamaño de mano
    } else if (typeof LEVEL !== 'undefined' && LEVEL && LEVEL.group && LEVEL.group.attach) {
      LEVEL.group.attach(t.o);
    }
  } catch (e) {}
  toast('🖐️ ' + t.emoji + ' ' + t.name + (t.kind === 'product' ? ' — llévalo a la caja 💰' : ' — toca el suelo para soltarlo'));
}
function dropItem(px, pz) {
  const c = window.__carried; if (!c) return;
  window.__carried = null;
  try {
    const o = c.t.o;
    if (o.parent) o.parent.remove(o);
    if (typeof scene !== 'undefined' && scene) scene.add(o);
    else if (typeof LEVEL !== 'undefined' && LEVEL && LEVEL.group) LEVEL.group.add(o);
    if (c.t._heldScale) o.scale.copy(c.t._heldScale); // tamaño original del estante
    o.position.set(px, Math.max(0.2, (c.t.home && c.t.home.y) || 0.2), pz);
    o.rotation.set(0, Math.random() * 6.28, 0);
  } catch (e) {}
  toast('⬇️ Soltaste ' + c.t.emoji + ' ' + c.t.name);
}
function payForCarried() {
  const c = window.__carried;
  if (!c || !c.t || c.t.kind !== 'product') return;
  const k = (typeof window !== 'undefined' && window.__nearKeeper) || null;
  if (!k) return;
  try { if (typeof Audio2 !== 'undefined' && Audio2.click) Audio2.click(); } catch (e) {}
  if (typeof Shop2 !== 'undefined' && Shop2.spendCoins) {
    if (!Shop2.spendCoins(c.t.price)) { toast('🪙 Te faltan monedas (' + c.t.price + ' 🪙)'); return; }
  }
  const t = c.t;
  window.__carried = null;
  window.__bagCount = (window.__bagCount || 0) + 1;
  try {
    const wp = touchableWorldPos(t, _tapV);
    if (typeof Particles !== 'undefined' && Particles.burst && wp) Particles.burst(wp.x, wp.y + 0.8, wp.z, [0xffe95e, 0x59ff7a, 0xffffff], 16, 3);
  } catch (e) {}
  try { // el estante se vuelve a llenar a los 15 segundos
    if (t.o.parent) t.o.parent.remove(t.o); // despegar de la mano
    if (t._heldScale) t.o.scale.copy(t._heldScale); // tamaño original
    t.o.visible = false;
    setTimeout(() => {
      try {
        t.home.parent.add(t.o);
        t.o.position.set(t.home.x, t.home.y, t.home.z);
        t.o.rotation.set(0, 0, 0);
        t.o.visible = true;
      } catch (e) {}
    }, 15000);
  } catch (e) {}
  toast(t.emoji + ' ¡Compraste ' + t.name + '! 🛍️ Bolsa: ' + window.__bagCount);
}
boot();
