// gate.js — Puerta con contraseña de GEAYI (sitio estático)
// El juego NO se carga hasta ingresar la clave correcta.
(function () {
  'use strict';

  var SCRIPTS = [
  "https://unpkg.com/three@0.149.0/build/three.min.js",
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",
  "state.js",
  "audio.js",
  "i18n.js",
  "vehicles.js",
  "world.js",
  "neoncity.js",
  "candy.js",
  "family.js",
  "player.js",
  "online.js",
  "travel.js",
  "phase3.js",
  "powers.js",
  "minigames.js",
  "roleplay.js",
  "sports.js",
  "trophies.js",
  "community.js",
  "casa.js",
  "pets.js",
  "fishing.js",
  "racing.js",
  "weather.js",
  "observatory.js",
  "jobs.js",
  "citylife3.js",
  "citylife1.js",
  "citylife2.js",
  "bridges.js",
  "buildmode.js",
  "funpark.js",
  "bowling.js",
  "payments-live.js",
  "monetiza.js",
  "promos.js",
  "dealership.js",
  "vet.js",
  "fireworks.js",
  "zoo.js",
  "concerts.js",
  "carwash.js",
  "train.js",
  "waterpark.js",
  "castle.js",
  "infinite.js",
  "lots.js",
  "themepark.js",
  "aquarium.js",
  "furniture.js",
  "economy.js",
  "safewords.js",
  "agent.js",
  "chat.js",
  "support.js",
  "daynight.js",
  "liveevents.js",
  "motoboat.js",
  "share.js",
  "weapons.js",
  "game.js",
  "ranch.js",
  "vr.js"
];

  // SHA-256 de la clave de acceso (no se guarda en texto plano)
  var KEY_HASH = 'f962b1399b67b383f0f8837911638de4d3c1d27d7ca5b3c8c71678c35deab609';
  var SESSION_KEY = 'geayi_gate_ok';

  function hex(buf) {
    return Array.prototype.map.call(new Uint8Array(buf), function (b) {
      return ('0' + b.toString(16)).slice(-2);
    }).join('');
  }

  async function sha256(str) {
    var data = new TextEncoder().encode(str);
    var digest = await crypto.subtle.digest('SHA-256', data);
    return hex(digest);
  }

  // Carga los scripts del juego en orden (async=false conserva el orden)
  function loadGame() {
    var overlay = document.getElementById('geayi-gate');
    if (overlay) overlay.style.display = 'none';
    document.body.classList.remove('gate-locked');
    for (var i = 0; i < SCRIPTS.length; i++) {
      var s = document.createElement('script');
      s.src = SCRIPTS[i];
      s.async = false;
      document.body.appendChild(s);
    }
  }

  function unlock() {
    try { sessionStorage.setItem(SESSION_KEY, '1'); } catch (e) {}
    loadGame();
  }

  function showError(msg) {
    var err = document.getElementById('gate-error');
    if (err) {
      err.textContent = msg;
      err.style.display = 'block';
    }
    var inp = document.getElementById('gate-pass');
    if (inp) { inp.value = ''; inp.focus(); }
  }

  async function tryUnlock() {
    var inp = document.getElementById('gate-pass');
    var btn = document.getElementById('gate-btn');
    var val = inp ? inp.value : '';
    if (!val) { showError('Escribe la clave.'); return; }
    if (btn) btn.disabled = true;
    try {
      var h = await sha256(val);
      if (h === KEY_HASH) {
        unlock();
      } else {
        showError('Clave incorrecta. Intenta de nuevo.');
      }
    } catch (e) {
      showError('No se pudo verificar. Revisa tu conexión.');
    }
    if (btn) btn.disabled = false;
  }

  function init() {
    document.body.classList.add('gate-locked');
    var ok = false;
    try { ok = sessionStorage.getItem(SESSION_KEY) === '1'; } catch (e) {}
    if (ok) { loadGame(); return; }

    var btn = document.getElementById('gate-btn');
    var inp = document.getElementById('gate-pass');
    if (btn) btn.addEventListener('click', tryUnlock);
    if (inp) {
      inp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') tryUnlock();
      });
      setTimeout(function () { inp.focus(); }, 300);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
