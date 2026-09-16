/* vr.js — modo VR con lentes (WebXR). Diseño original GEAYI.
   - Botón "🥽 VR" visible solo si el navegador soporta sesiones 'immersive-vr'.
   - Al entrar: sesión WebXR, cámara en primera persona a la altura de los ojos
     del avatar (el visor controla la cabeza; un "rig" coloca el cuerpo del jugador).
   - Movimiento: stick izquierdo = avanzar/ladear, stick derecho = girar suave el
     cuerpo; gatillo = saltar. Sin controles: mirada libre + avance automático suave.
   - Todo suavizado para evitar mareos (sin aceleraciones bruscas).
   - Al salir: todo vuelve al modo normal sin recargar.
   Usa el WebXR que ya trae Three.js; sin dependencias nuevas. */
'use strict';

const VR = {
  active: false,      // true mientras la sesión VR está presentando
  supported: false,   // true si el navegador soporta 'immersive-vr'
  session: null,
  rig: null,          // grupo que coloca al jugador; la cámara cuelga de él en VR
  yaw: 0,             // giro del cuerpo (radianes), lo mueve el stick derecho
  smx: 0, smz: 0,    // entrada suavizada (anti-mareo)
  jumpPrev: false,
  _init: false,
  _wrapped: false,
  _raf: null,         // requestAnimationFrame original (se restaura al salir)
  _btns: [],          // botones VR (menú + HUD)
  _camParent: null,
};

/* Ajustes */
VR.TURN = 1.1;   // rad/s de giro con el stick (suave, sin mareo)
VR.AUTO = 0.32;  // avance automático (fracción) cuando no hay controles
VR.SMOOTH = 7;   // suavizado de la entrada (pasa-bajos)
VR.DEAD = 0.18;  // zona muerta de los sticks del visor

/* ---------- detección de soporte ---------- */
VR.checkSupport = async function () {
  VR.supported = false;
  try {
    if (typeof navigator !== 'undefined' && navigator.xr &&
        typeof navigator.xr.isSessionSupported === 'function') {
      VR.supported = !!(await navigator.xr.isSessionSupported('immersive-vr'));
    }
  } catch (e) { VR.supported = false; }
  VR.refreshButton();
  return VR.supported;
};

VR.refreshButton = function () {
  for (const b of VR._btns) {
    if (b && b.classList) b.classList.toggle('hidden', !VR.supported);
  }
};

/* ---------- envolver funciones del juego (sin editar sus archivos) ---------- */
VR._wrapFns = function () {
  if (VR._wrapped) return;
  VR._wrapped = true;
  // 1) En VR el visor controla la cámara: la cámara 3a persona se salta.
  if (typeof updateCamera === 'function') {
    const _uc = updateCamera;
    updateCamera = function (dt, hSpeed) { if (!VR.active) _uc(dt, hSpeed); };
  }
  // 2) Inyectar la entrada VR antes de la física del jugador.
  if (typeof updatePlayer === 'function') {
    const _up = updatePlayer;
    updatePlayer = function (dt, input) {
      if (VR.active) VR.preUpdate(dt, input);
      const r = _up(dt, input);
      if (VR.active) VR.postUpdate(dt);
      return r;
    };
  }
};

/* ---------- entrada/salida ---------- */
VR.toggle = function () {
  if (VR.active) { VR.exit(); return; }
  VR.start();
};

VR.start = function () {
  if (VR.active) return;
  if (typeof MODE !== 'undefined' && MODE !== 'play') {
    // Desde el menú: entrar a un mundo jugable primero (los menús HTML no se ven en el visor).
    if (typeof startLevel === 'function') { try { startLevel(0); } catch (e) {} }
  }
  if (typeof MODE !== 'undefined' && MODE !== 'play') {
    if (typeof toast === 'function') toast('🥽 Entra a un mundo para usar VR');
    return;
  }
  const xr = (typeof navigator !== 'undefined') ? navigator.xr : null;
  if (!xr || typeof xr.requestSession !== 'function') {
    if (typeof toast === 'function') toast('🥽 Tu navegador no tiene WebXR');
    return;
  }
  if (typeof Audio2 !== 'undefined' && Audio2.init) { try { Audio2.init(); } catch (e) {} }
  // IMPORTANTE: pedir la sesión dentro del gesto del usuario (sin awaits antes).
  xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor', 'bounded-floor'] })
    .then(VR._onSession, function () {
      if (typeof toast === 'function') toast('🥽 No se pudo iniciar VR');
    });
};

VR._onSession = async function (session) {
  VR.session = session;
  try {
    const R = (typeof renderer !== 'undefined') ? renderer : null;
    if (!R || !R.xr) throw new Error('sin WebXR');
    if (typeof R.xr.setReferenceSpaceType === 'function') R.xr.setReferenceSpaceType('local-floor');
    if (typeof R.xr.setSession === 'function') await R.xr.setSession(session);
    else throw new Error('sin setSession');
  } catch (e) {
    try { session.end(); } catch (_) {}
    VR.session = null;
    if (typeof toast === 'function') toast('🥽 VR no disponible en este dispositivo');
    return;
  }
  // Rig: el visor compone su pose con el padre de la cámara (Three r149).
  const P = (typeof Player !== 'undefined') ? Player : null;
  VR.rig = new THREE.Group();
  if (P) VR.rig.position.set(P.pos.x, P.pos.y, P.pos.z);
  if (typeof scene !== 'undefined' && scene && scene.add) scene.add(VR.rig);
  VR._camParent = (typeof camera !== 'undefined' && camera) ? (camera.parent || null) : null;
  if (typeof camera !== 'undefined' && camera && VR.rig.add) VR.rig.add(camera);
  VR.yaw = (P && typeof P.camYaw === 'number') ? P.camYaw : 0;
  VR.smx = 0; VR.smz = 0; VR.jumpPrev = false;
  // Primera persona: ocultar el avatar (y su sombra) mientras dura la sesión.
  if (typeof Avatar !== 'undefined') {
    if (Avatar.group) Avatar.group.visible = false;
    if (Avatar.blob) Avatar.blob.visible = false;
  }
  const touch = (typeof $ === 'function') ? $('touch') : null;
  if (touch && touch.classList) touch.classList.add('hidden');
  VR.active = true;
  // Detener la cadena rAF normal: el loop pasa a manos de la sesión XR.
  // (El requestAnimationFrame interno de loop() queda tragado y la cadena muere.)
  if (typeof window !== 'undefined' && !VR._raf) {
    VR._raf = window.requestAnimationFrame;
    window.requestAnimationFrame = function () { return 0; };
  }
  if (renderer.setAnimationLoop) renderer.setAnimationLoop(VR._xrTick);
  if (session.addEventListener) session.addEventListener('end', VR._onSessionEnd);
  if (typeof toast === 'function') toast('🥽 ¡VR activado! Sal con el gesto de tu visor');
};

VR._xrTick = function () {
  // Un frame XR: corre el loop original del juego (su rAF interno está tragado).
  if (typeof loop === 'function') loop();
};

VR.exit = function () {
  if (VR.session && typeof VR.session.end === 'function') {
    try { VR.session.end(); } catch (e) { VR._onSessionEnd(); }
  } else VR._onSessionEnd();
};

VR._onSessionEnd = function () {
  if (!VR.active && !VR.session) return;
  VR.active = false;
  try {
    const R = (typeof renderer !== 'undefined') ? renderer : null;
    if (R && R.setAnimationLoop) R.setAnimationLoop(null);
  } catch (e) {}
  if (VR._raf && typeof window !== 'undefined') {
    window.requestAnimationFrame = VR._raf; // restaurar la cadena normal
    VR._raf = null;
  }
  // Devolver la cámara a su sitio y quitar el rig.
  try {
    if (typeof camera !== 'undefined' && camera) {
      if (VR.rig && VR.rig.remove) VR.rig.remove(camera);
      camera.parent = null; // remove() ya lo hace en three real; explícito por seguridad
      if (VR._camParent && VR._camParent.add) VR._camParent.add(camera);
      else if (typeof scene !== 'undefined' && scene && scene.add) scene.add(camera);
    }
    if (VR.rig && typeof scene !== 'undefined' && scene && scene.remove) scene.remove(VR.rig);
  } catch (e) {}
  VR.rig = null; VR._camParent = null;
  if (typeof Avatar !== 'undefined') {
    if (Avatar.group) Avatar.group.visible = true;
    if (Avatar.blob) Avatar.blob.visible = true;
  }
  const touch = (typeof $ === 'function') ? $('touch') : null;
  if (touch && touch.classList && typeof isTouch !== 'undefined' && isTouch &&
      typeof MODE !== 'undefined' && MODE === 'play') touch.classList.remove('hidden');
  VR.session = null;
  VR.smx = 0; VR.smz = 0; VR.jumpPrev = false;
  // Reanudar el loop normal (sin recargar nada).
  if (typeof loop === 'function' && typeof window !== 'undefined') window.requestAnimationFrame(loop);
  if (typeof toast === 'function') toast('🥽 VR desactivado');
};

/* ---------- controles del visor ---------- */
VR.readGamepads = function () {
  const out = { hasPad: false, x: 0, z: 0, turn: 0, jump: false };
  let session = null;
  try {
    const R = (typeof renderer !== 'undefined') ? renderer : null;
    if (R && R.xr && typeof R.xr.getSession === 'function') session = R.xr.getSession();
  } catch (e) {}
  if (!session) session = VR.session;
  if (!session || !session.inputSources) return out;
  let moveSrc = null, turnSrc = null;
  for (const src of session.inputSources) {
    if (!src || !src.gamepad) continue;
    if (src.handedness === 'left' && !moveSrc) moveSrc = src;
    else if (src.handedness === 'right' && !turnSrc) turnSrc = src;
  }
  if (!moveSrc) {
    for (const src of session.inputSources) {
      if (src && src.gamepad) { moveSrc = src; break; }
    }
  }
  const dz = (v) => (Math.abs(v) < VR.DEAD ? 0 : v);
  const btnDown = (gp) => {
    const b = gp.buttons || [];
    return !!((b[0] && b[0].pressed) || (b[1] && b[1].pressed));
  };
  if (moveSrc) {
    out.hasPad = true;
    const ax = moveSrc.gamepad.axes || [];
    out.x = dz(ax[2] || 0);
    out.z = dz(-(ax[3] || 0)); // stick arriba = avanzar
    const m = Math.hypot(out.x, out.z);
    if (m > 1) { out.x /= m; out.z /= m; }
    out.jump = btnDown(moveSrc.gamepad);
  }
  if (turnSrc && turnSrc !== moveSrc) {
    const ax = turnSrc.gamepad.axes || [];
    out.turn = dz(ax[2] || 0);
    if (btnDown(turnSrc.gamepad)) out.jump = true;
  }
  return out;
};

/* ---------- integración con el loop del juego ---------- */
VR.preUpdate = function (dt, input) {
  const P = (typeof Player !== 'undefined') ? Player : null;
  const gp = VR.readGamepads();
  // Giro suave del cuerpo con el stick derecho (la cabeza mira libre siempre).
  if (gp.turn) VR.yaw -= gp.turn * VR.TURN * dt;
  // Movimiento: 1) sticks del visor, 2) joystick/teclado existente si se está usando,
  // 3) avance automático suave si no hay ningún control.
  let mx = 0, mz = 0;
  if (gp.hasPad) { mx = gp.x; mz = gp.z; }
  else if (input && Math.hypot(input.x || 0, input.z || 0) > 0.15) { mx = input.x; mz = input.z; }
  else { mz = VR.AUTO; }
  // Suavizado pasa-bajos: nada de arranques bruscos.
  const k = Math.min(1, dt * VR.SMOOTH);
  VR.smx += (mx - VR.smx) * k;
  VR.smz += (mz - VR.smz) * k;
  if (input) { input.x = VR.smx; input.z = VR.smz; }
  if (P) P.camYaw = VR.yaw; // moverse respecto al cuerpo
  if (gp.jump && !VR.jumpPrev && typeof tryJump === 'function') tryJump();
  VR.jumpPrev = !!gp.jump;
};

VR.postUpdate = function () {
  const P = (typeof Player !== 'undefined') ? Player : null;
  if (!P) return;
  P.camYaw = VR.yaw; // anular la deriva de la cámara en 3a persona
  if (VR.rig) {
    VR.rig.position.set(P.pos.x, P.pos.y, P.pos.z); // pies del jugador
    VR.rig.rotation.y = VR.yaw + Math.PI; // el visor mira por -Z
  }
};

/* ---------- arranque ---------- */
VR.init = function () {
  if (VR._init) return;
  VR._init = true;
  VR._wrapFns();
  try {
    const R = (typeof renderer !== 'undefined') ? renderer : null;
    if (R && R.xr) R.xr.enabled = true;
  } catch (e) {}
  const ids = ['btn-vr', 'btn-vr-menu'];
  for (const id of ids) {
    const btn = (typeof $ === 'function') ? $(id) : null;
    if (btn) {
      VR._btns.push(btn);
      if (btn.addEventListener) btn.addEventListener('click', function () { VR.toggle(); });
    }
  }
  VR.checkSupport();
};

if (typeof window !== 'undefined') {
  if (typeof document !== 'undefined' && document.readyState === 'loading' &&
      typeof document.addEventListener === 'function') {
    document.addEventListener('DOMContentLoaded', VR.init);
  } else {
    VR.init();
  }
}
