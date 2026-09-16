/* travel.js — sistema de viajes en avión entre mundos (aeropuertos) ✈️🌍
   El aeropuerto de Immokalee (mundo 1) abre el menú de destinos: los 4 países.
   Cada país tiene su aeropuerto para volver a Immokalee o ir a otro país. */
'use strict';

let traveling = false;   // transición de despegue en curso
let _travelBtnState = '';

/* destinos posibles según el mundo actual (índices de LEVELS) */
function travelDests() {
  const from = (typeof LEVEL !== 'undefined' && LEVEL) ? LEVEL.idx : 3;
  return [3, 4, 5, 6, 7, 8].filter(d => d !== from);
}

/* botón ✈️ VIAJAR cerca de un aeropuerto (se llama cada frame en modo play) */
function updateAirportPrompt() {
  const b = (typeof $ === 'function') ? $('btn-travel') : null;
  if (!b) return;
  let show = false;
  if (typeof MODE !== 'undefined' && MODE === 'play' && !traveling &&
      typeof Player !== 'undefined' && Player && Player.pos &&
      typeof LEVEL !== 'undefined' && LEVEL && LEVEL.airports && LEVEL.airports.length) {
    const inVehicle = (typeof Vehicle !== 'undefined' && Vehicle.mode !== 'none');
    if (!inVehicle) {
      for (const a of LEVEL.airports) {
        const d = Math.hypot(Player.pos.x - a.x, Player.pos.z - a.z);
        if (d < a.r && Math.abs(Player.pos.y - a.y) < 3.5) { show = true; break; }
      }
    }
  }
  const st = show ? 'on' : 'off';
  if (st !== _travelBtnState) {
    _travelBtnState = st;
    b.classList.toggle('hidden', !show);
  }
}

function openTravelMenu() {
  if (typeof Net !== 'undefined' && Net.active) {
    if (typeof toast === 'function') toast('🌐 Sal de la sala para viajar ✈️');
    return;
  }
  const box = $('travel-dests');
  if (!box) return;
  box.innerHTML = '';
  const dests = travelDests()
    .filter(d => (worldPos(d) + 1) <= ((typeof SAVE !== 'undefined' && SAVE.unlocked) || 1))
    .sort((a, b) => worldPos(a) - worldPos(b)); // orden de presentación (Immokalee primero)
  if (!dests.length) {
    const div = document.createElement('div');
    div.className = 'travel-empty';
    div.textContent = '🔒 Completa este mundo para desbloquear los viajes';
    box.appendChild(div);
  }
  dests.forEach(d => {
    const lv = LEVELS[d];
    const btn = document.createElement('button');
    btn.className = 'btn btn-big btn-play';
    btn.innerHTML = '<span>' + lv.emoji + ' ' + wname(d) + '</span>' +
      '<div class="ldest">' + wdesc(d) + '</div>';
    btn.addEventListener('click', () => { Audio2.init(); Audio2.click(); flyTo(d); });
    box.appendChild(btn);
  });
  $('btn-travel').classList.add('hidden');
  _travelBtnState = 'off';
  $('screen-travel').classList.remove('hidden');
}

function closeTravelMenu() {
  const s = $('screen-travel');
  if (s) s.classList.add('hidden');
  _travelBtnState = ''; // forzar re-evaluación del botón
}

/* despegue: transición con nubes y luego carga el mundo destino */
function flyTo(d) {
  if (traveling) return;
  traveling = true;
  closeTravelMenu();
  const lv = LEVELS[d];
  const destEl = $('takeoff-dest');
  if (destEl) destEl.textContent = lv.emoji + ' ' + lv.name;
  const ov = $('screen-takeoff');
  if (ov) ov.classList.remove('hidden');
  if (typeof Audio2 !== 'undefined') {
    try {
      if (typeof Audio2.engineStart === 'function') Audio2.engineStart();
      else Audio2.boost();
    } catch (e) {}
  }
  setTimeout(() => {
    if (ov) ov.classList.add('hidden');
    traveling = false;
    if (typeof Audio2 !== 'undefined' && typeof Audio2.engineStop === 'function') {
      try { Audio2.engineStop(); } catch (e) {}
    }
    if (typeof startLevel === 'function') startLevel(d);
  }, 2300);
}
