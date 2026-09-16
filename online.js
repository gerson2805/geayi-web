/* online.js — cuentas y multijugador con Supabase (plan gratuito, sin tablas SQL) */
'use strict';

/* ============================================================
   🔧 CONFIGURACIÓN DEL DUEÑO — PEGA AQUÍ TUS 2 DATOS
   ------------------------------------------------------------
   1. Crea tu proyecto gratis en https://supabase.com
   2. Entra a tu proyecto → ⚙️ Settings → API
   3. Copia "Project URL" y pégala en url (abajo)
   4. Copia "anon public" y pégala en anonKey (abajo)
   5. En Authentication → URL Configuration agrega la dirección
      de tu juego (ej. https://tu-juego.netlify.app) en
      "Site URL" y "Redirect URLs", para que el correo de
      confirmación regrese al juego.
   La clave "anon" es PÚBLICA por diseño (puede ir en el código).
   ⚠️ NUNCA pegues aquí la clave "service_role": esa es secreta.
   ============================================================ */
const ONLINE_CONFIG = {
  url: "https://fcnvhacpnergqdqfdazn.supabase.co",
  anonKey: "sb_publishable_C-1Q79_DkiFfsDmfnNUoEw_XDh7jugo"
};

/* ============================================================
   📲 ENLACE DE GOOGLE PLAY (opcional, para después)
   Cuando publiques la app en Play Store ($25, pago único),
   pega aquí el enlace de tu app, por ejemplo:
   https://play.google.com/store/apps/details?id=com.tuempresa.obbyxtreme
   El botón "📲 DESCARGAR LA APP" del menú se activará solo.
   Mientras esté vacío mostrará "PRÓXIMAMENTE EN GOOGLE PLAY".
   ============================================================ */
const PLAY_STORE_URL = "";

function isStoreConfigured() {
  return typeof PLAY_STORE_URL === 'string' && PLAY_STORE_URL.indexOf('https://') === 0;
}

function isOnlineConfigured() {
  return typeof ONLINE_CONFIG.url === 'string' &&
    ONLINE_CONFIG.url.indexOf('PEGA_AQUI') !== 0 &&
    ONLINE_CONFIG.anonKey.indexOf('PEGA_AQUI') !== 0 &&
    ONLINE_CONFIG.url.indexOf('https://') === 0;
}

/* ---------------- cliente Supabase (solo si está configurado) ---------------- */
function sb() {
  if (!isOnlineConfigured()) return null;
  if (typeof window === 'undefined' || !window.supabase) return null;
  if (!sb.client) sb.client = window.supabase.createClient(ONLINE_CONFIG.url, ONLINE_CONFIG.anonKey);
  return sb.client;
}

/* ---------------- estado online ---------------- */
const Net = {
  me: null,            // usuario de Supabase Auth
  pendingEmail: '',    // correo esperando confirmación
  active: false,       // dentro de una sala
  channel: null,       // canal realtime de la sala (posiciones + chat)
  lobby: null,         // canal lobby (conteo de jugadores por sala)
  worldIdx: 0, roomId: 'sala1', onlineWorld: 0,
  players: {},         // remotos: key -> { group, name, tx, ty, tz, try_ }
  bAcc: 0,             // acumulador para enviar posición ~12Hz
  lastChat: 0          // anti-spam del chat (1 msg/seg)
};

/* ---------------- utilidades ---------------- */
function escHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function displayName() {
  const ch = (typeof activeCharacter === 'function') ? activeCharacter() : ((typeof activeFamilyChar === 'function') ? activeFamilyChar() : null);
  if (ch) return ch.name; // Ian, Mily, Oso… cuando está elegido
  if (Net.me && Net.me.user_metadata && Net.me.user_metadata.username)
    return String(Net.me.user_metadata.username).slice(0, 16);
  if (Net.me && Net.me.email) return Net.me.email.split('@')[0].slice(0, 16);
  return 'Jugador';
}
/* vuelve a publicar la presencia (nombre + apariencia) en la sala actual */
function refreshPresence() {
  if (!Net.active || !Net.channel) return;
  try {
    Net.channel.track({
      name: displayName(),
      fam: (typeof SAVE !== 'undefined' && SAVE.familyChar) || null,
      body: SAVE.body, hat: SAVE.hat,
      x: (typeof Player !== 'undefined' && Player.pos) ? +Player.pos.x.toFixed(2) : 0,
      y: (typeof Player !== 'undefined' && Player.pos) ? +Player.pos.y.toFixed(2) : 0,
      z: (typeof Player !== 'undefined' && Player.pos) ? +Player.pos.z.toFixed(2) : 0,
      ry: (typeof Player !== 'undefined') ? +Player.heading.toFixed(2) : 0
    });
  } catch (e) {}
}
function authErrorEs(msg) {
  const m = String(msg || '');
  if (/already registered|already exists|already been registered/i.test(m))
    return 'Ese correo ya está registrado. Toca "Ya tengo cuenta".';
  if (/at least 6 characters/i.test(m))
    return 'La contraseña debe tener al menos 6 caracteres.';
  if (/invalid email|validate email|email address/i.test(m))
    return 'Ese correo no parece válido.';
  if (/invalid login credentials/i.test(m))
    return 'Correo o contraseña incorrectos.';
  if (/email not confirmed/i.test(m))
    return 'Primero confirma tu cuenta con el enlace del correo.';
  if (/rate limit|too many/i.test(m))
    return 'Demasiados intentos. Espera un minuto e inténtalo de nuevo.';
  return 'Ocurrió un error. Inténtalo de nuevo.';
}

/* ---------------- UI de cuenta ---------------- */
function updateAuthUI() {
  const logged = !!Net.me;
  const lo = $('btn-logout'), mu = $('menu-user');
  if (lo) lo.classList.toggle('hidden', !logged);
  if (mu) {
    if (logged) { mu.textContent = '👤 ' + displayName(); mu.classList.remove('hidden'); }
    else mu.classList.add('hidden');
  }
}

function openMultiplayer() {
  Audio2.init(); Audio2.click();
  if (!isOnlineConfigured()) { showMain('screen-setup'); MODE = 'setup'; return; }
  if (!sb()) { toast('⚠️ No se pudo cargar el servicio online. Revisa tu internet.'); return; }
  if (!Net.me) { showMain('screen-auth'); MODE = 'auth'; return; }
  if (!Net.me.email_confirmed_at) {
    Net.pendingEmail = Net.me.email || '';
    $('verify-email').textContent = Net.pendingEmail || 'tu correo';
    showMain('screen-verify'); MODE = 'verify'; return;
  }
  enterOnlineLobby();
}

async function doSignup() {
  const name = $('su-name').value.trim();
  const email = $('su-email').value.trim();
  const p1 = $('su-pass').value, p2 = $('su-pass2').value;
  const err = $('su-error');
  err.textContent = '';
  if (!/^[A-Za-z0-9_]{3,16}$/.test(name)) { err.textContent = 'El nombre: 3 a 16 caracteres (letras, números o _).'; Audio2.deny(); return; }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { err.textContent = 'Escribe un correo válido.'; Audio2.deny(); return; }
  if (p1.length < 6) { err.textContent = 'La contraseña debe tener al menos 6 caracteres.'; Audio2.deny(); return; }
  if (p1 !== p2) { err.textContent = 'Las contraseñas no coinciden.'; Audio2.deny(); return; }
  const client = sb();
  if (!client) { err.textContent = 'Sin conexión. Revisa tu internet.'; return; }
  err.textContent = 'Creando tu cuenta… ⏳';
  let redirect;
  if (typeof location !== 'undefined' && location.protocol.indexOf('http') === 0)
    redirect = location.origin + location.pathname;
  const { data, error } = await client.auth.signUp({
    email, password: p1,
    options: Object.assign(
      { data: { username: name, body: SAVE.body, hat: SAVE.hat, trail: SAVE.trail } },
      redirect ? { emailRedirectTo: redirect } : {}
    )
  });
  if (error) { err.textContent = authErrorEs(error.message); Audio2.deny(); return; }
  Audio2.buy();
  Net.pendingEmail = email;
  $('verify-email').textContent = email;
  const u = (data && data.user) || (data && data.session && data.session.user);
  if (u && u.email_confirmed_at) { Net.me = u; updateAuthUI(); enterOnlineLobby(); }
  else { showMain('screen-verify'); MODE = 'verify'; }
}

async function doLogin() {
  const email = $('li-email').value.trim();
  const pass = $('li-pass').value;
  const err = $('li-error');
  err.textContent = '';
  if (!email || !pass) { err.textContent = 'Escribe tu correo y contraseña.'; Audio2.deny(); return; }
  const client = sb();
  if (!client) { err.textContent = 'Sin conexión. Revisa tu internet.'; return; }
  err.textContent = 'Entrando… ⏳';
  const { data, error } = await client.auth.signInWithPassword({ email, password: pass });
  if (error) { err.textContent = authErrorEs(error.message); Audio2.deny(); return; }
  Audio2.click();
  const u = data && data.user;
  if (u && !u.email_confirmed_at) {
    Net.pendingEmail = email;
    $('verify-email').textContent = email;
    showMain('screen-verify'); MODE = 'verify';
  } else {
    enterOnlineLobby();
  }
}

async function doResend() {
  Audio2.click();
  const client = sb();
  if (!client || !Net.pendingEmail) { toast('⚠️ No hay correo pendiente.'); return; }
  toast('📨 Enviando…');
  const { error } = await client.auth.resend({ type: 'signup', email: Net.pendingEmail });
  toast(error ? '⚠️ ' + authErrorEs(error.message) : '✉️ ¡Correo reenviado! Revisa tu bandeja y el spam.');
}

async function doLogout() {
  Audio2.click();
  await leaveRoom(true);
  lobbyLeave();
  const client = sb();
  if (client) { try { await client.auth.signOut(); } catch (e) {} }
  Net.me = null;
  updateAuthUI();
  showMain('screen-menu'); MODE = 'menu';
  toast('👋 Sesión cerrada.');
}

/* Guarda tu nombre y personalización en la nube (te sigue a donde entres) */
async function syncProfileToCloud() {
  const client = sb();
  if (!client || !Net.me) return;
  try {
    await client.auth.updateUser({ data: { username: displayName(), body: SAVE.body, hat: SAVE.hat, trail: SAVE.trail } });
  } catch (e) {}
}

/* ---------------- lobby y salas ---------------- */
function roomCounts() {
  const counts = {};
  if (!Net.lobby) return counts;
  try {
    const state = Net.lobby.presenceState();
    for (const key of Object.keys(state)) {
      const meta = (state[key] || [])[0] || {};
      if (meta.room) counts[meta.room] = (counts[meta.room] || 0) + 1;
    }
  } catch (e) {}
  return counts;
}

async function lobbyJoin() {
  const client = sb();
  if (!client || !Net.me) return;
  lobbyLeave();
  Net.lobby = client.channel('obby-lobby', { config: { presence: { key: Net.me.id } } });
  Net.lobby.on('presence', { event: 'sync' }, () => renderOnlineRooms());
  Net.lobby.subscribe(async status => {
    if (status === 'SUBSCRIBED') {
      try { await Net.lobby.track({ name: displayName(), room: null }); } catch (e) {}
      renderOnlineRooms();
    }
  });
}
function lobbyLeave() {
  if (Net.lobby) { try { Net.lobby.unsubscribe(); } catch (e) {} Net.lobby = null; }
}

function renderOnlineWorlds() {
  const grid = $('online-worlds');
  grid.innerHTML = '';
  WORLD_ORDER.forEach((i, p) => {
    const lv = LEVELS[i];
    const card = document.createElement('div');
    card.className = 'level-card theme' + (i + 1) + ' unlocked' + (Net.onlineWorld === i ? ' sel' : '');
    card.innerHTML = '<span class="emoji">' + lv.emoji + '</span>' +
      '<div class="lname">' + (p + 1) + '. ' + lv.name + '</div>';
    card.addEventListener('click', () => {
      Audio2.init(); Audio2.click();
      Net.onlineWorld = i;
      renderOnlineWorlds(); renderOnlineRooms();
    });
    grid.appendChild(card);
  });
}

function renderOnlineRooms() {
  const box = $('online-rooms');
  if (!box) return;
  const counts = roomCounts();
  box.innerHTML = '';
  for (let r = 1; r <= 3; r++) {
    const key = Net.onlineWorld + ':sala' + r;
    const n = counts[key] || 0;
    const full = n >= 10;
    const row = document.createElement('button');
    row.className = 'room-row' + (full ? ' full' : '');
    row.innerHTML = '<span class="rname">🚪 Sala ' + r + '</span>' +
      '<span class="rcount">👥 ' + n + '/10</span>' +
      '<span class="rjoin">' + (full ? 'Llena' : 'Entrar ➤') + '</span>';
    if (full) row.addEventListener('click', () => { Audio2.init(); Audio2.deny(); toast('🚫 Sala llena, prueba otra.'); });
    else row.addEventListener('click', () => { Audio2.init(); Audio2.click(); joinRoom(Net.onlineWorld, r); });
    box.appendChild(row);
  }
}

async function enterOnlineLobby() {
  $('online-user').textContent = displayName();
  Net.onlineWorld = 0;
  renderOnlineWorlds();
  renderOnlineRooms();
  showMain('screen-online');
  MODE = 'online';
  lobbyJoin();
}

function onlineBack() {
  Audio2.click();
  lobbyLeave();
  showMain('screen-menu'); MODE = 'menu';
}

/* ---------------- entrar / salir de sala ---------------- */
async function joinRoom(w, r) {
  const client = sb();
  if (!client || !Net.me) return;
  const key = w + ':sala' + r;
  if ((roomCounts()[key] || 0) >= 10) { toast('🚫 Sala llena, prueba otra.'); Audio2.deny(); return; }
  Net.worldIdx = w; Net.roomId = 'sala' + r;
  try { if (Net.lobby) await Net.lobby.track({ name: displayName(), room: key }); } catch (e) {}
  if (Net.channel) { try { await Net.channel.unsubscribe(); } catch (e) {} }
  Net.channel = client.channel('room:' + w + ':' + Net.roomId, { config: { presence: { key: Net.me.id } } });
  Net.channel.on('presence', { event: 'sync' }, syncRemotePlayers);
  Net.channel.on('presence', { event: 'join' }, ({ key: k, newPresences }) => {
    if (k !== Net.me.id && newPresences && newPresences[0])
      addChatSys('🟢 ' + String(newPresences[0].name || 'Alguien').slice(0, 16) + ' entró a la sala');
  });
  Net.channel.on('presence', { event: 'leave' }, ({ key: k, leftPresences }) => {
    if (k !== Net.me.id && leftPresences && leftPresences[0])
      addChatSys('🔴 ' + String(leftPresences[0].name || 'Alguien').slice(0, 16) + ' salió de la sala');
  });
  Net.channel.on('broadcast', { event: 'pos' }, ({ payload }) => onRemotePos(payload));
  Net.channel.on('broadcast', { event: 'chat' }, ({ payload }) => onChatMsg(payload));
  toast('🌐 Entrando a la sala…');
  Net.channel.subscribe(async status => {
    if (status === 'SUBSCRIBED') {
      try {
        await Net.channel.track({ name: displayName(), fam: SAVE.familyChar || null, body: SAVE.body, hat: SAVE.hat, x: 0, y: 0, z: 0, ry: 0 });
      } catch (e) {}
      Net.active = true;
      Net.bAcc = 0;
      startLevel(w);
      $('net-room').textContent = r;
      $('net-chip').classList.remove('hidden');
      $('btn-chat').classList.remove('hidden');
      updateNetChip();
      addChatSys('👋 ¡Entraste a la sala! Saluda en el chat 💬');
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      toast('⚠️ No se pudo entrar a la sala. Inténtalo de nuevo.');
    }
  });
}

async function leaveRoom(silent) {
  if (Net.channel) { try { await Net.channel.unsubscribe(); } catch (e) {} Net.channel = null; }
  if (typeof scene !== 'undefined' && scene) {
    for (const k of Object.keys(Net.players)) { try { scene.remove(Net.players[k].group); } catch (e) {} }
  }
  Net.players = {};
  Net.active = false;
  ['net-chip', 'btn-chat', 'chat-panel'].forEach(id => { const el = $(id); if (el) el.classList.add('hidden'); });
  const cm = $('chat-msgs'); if (cm) cm.innerHTML = '';
  if (Net.lobby && Net.me) { try { await Net.lobby.track({ name: displayName(), room: null }); } catch (e) {} }
  if (!silent) toast('🚪 Saliste de la sala.');
}

/* ---------------- jugadores remotos ---------------- */
/* makeNameLabel vive en player.js (versión GEAYI con acento); aquí solo se usa. */
function syncRemotePlayers() {
  if (!Net.channel) return;
  let state = {};
  try { state = Net.channel.presenceState(); } catch (e) {}
  const seen = {};
  for (const key of Object.keys(state)) {
    if (Net.me && key === Net.me.id) continue;
    seen[key] = true;
    const meta = (state[key] || [])[0] || {};
    if (!Net.players[key]) {
      const group = createAvatarMesh(avatarStyleForRemote(meta));
      const label0 = makeNameLabel(String(meta.name || 'Jugador').slice(0, 16));
      label0.position.y = group.userData.nameLabelY || 2.7;
      group.add(label0);
      group.position.set(+meta.x || 0, +meta.y || 0, +meta.z || 0);
      scene.add(group);
      Net.players[key] = {
        group, name: meta.name || 'Jugador', fam: meta.fam || null,
        tx: +meta.x || 0, ty: +meta.y || 0, tz: +meta.z || 0, try_: 0
      };
    } else if ((Net.players[key].fam || null) !== (meta.fam || null)) {
      // el otro jugador cambió de personaje: reconstruir su avatar
      const old = Net.players[key];
      const group = createAvatarMesh(avatarStyleForRemote(meta));
      const label1 = makeNameLabel(String(meta.name || 'Jugador').slice(0, 16));
      label1.position.y = group.userData.nameLabelY || 2.7;
      group.add(label1);
      group.position.copy(old.group.position);
      group.rotation.y = old.group.rotation.y;
      try { scene.remove(old.group); } catch (e) {}
      scene.add(group);
      old.group = group; old.name = meta.name || 'Jugador'; old.fam = meta.fam || null;
    }
  }
  for (const key of Object.keys(Net.players)) {
    if (!seen[key]) {
      try { scene.remove(Net.players[key].group); } catch (e) {}
      delete Net.players[key];
    }
  }
  updateNetChip();
}

function onRemotePos(p) {
  if (!p || !Net.active) return;
  if (Net.me && p.id === Net.me.id) return;
  const rp = Net.players[p.id];
  if (!rp) return;
  if (isFinite(p.x)) rp.tx = p.x;
  if (isFinite(p.y)) rp.ty = p.y;
  if (isFinite(p.z)) rp.tz = p.z;
  if (isFinite(p.ry)) rp.try_ = p.ry;
}

function updateNetChip() {
  const el = $('net-players');
  if (el) el.textContent = Object.keys(Net.players).length + 1;
}

/* llamado desde el loop principal (game.js) */
function netTick(dt) {
  if (!Net.active || !Net.channel || MODE !== 'play') return;
  Net.bAcc += dt;
  if (Net.bAcc >= 1 / 12) { // ~12Hz
    Net.bAcc = 0;
    try {
      Net.channel.send({
        type: 'broadcast', event: 'pos',
        payload: {
          id: Net.me.id,
          x: +Player.pos.x.toFixed(2), y: +Player.pos.y.toFixed(2), z: +Player.pos.z.toFixed(2),
          ry: +Player.heading.toFixed(2)
        }
      });
    } catch (e) {}
  }
  const k = 1 - Math.pow(0.001, dt);
  const kr = 1 - Math.pow(0.001, dt * 3);
  for (const key of Object.keys(Net.players)) {
    const rp = Net.players[key];
    const g = rp.group;
    const px = g.position.x, py = g.position.y, pz = g.position.z;
    g.position.x = lerp(px, rp.tx, k);
    g.position.y = lerp(py, rp.ty, k);
    g.position.z = lerp(pz, rp.tz, k);
    const moved = Math.hypot(g.position.x - px, g.position.y - py, g.position.z - pz);
    const speed = Math.min(moved / Math.max(dt, 0.001), 12);
    g.rotation.y = lerpAngle(g.rotation.y, rp.try_, kr);
    animateAvatarMesh(g, dt, speed, true);
  }
}

/* ---------------- chat de la sala ---------------- */
function trimChat(box) {
  while (box.children.length > 40) box.removeChild(box.firstChild);
  box.scrollTop = box.scrollHeight;
}
function addChatSys(text) {
  const box = $('chat-msgs');
  if (!box) return;
  const d = document.createElement('div');
  d.className = 'chat-line sys';
  d.textContent = text; // textContent = sin riesgo de HTML
  box.appendChild(d);
  trimChat(box);
}
function addChatLine(name, text, mine) {
  const box = $('chat-msgs');
  if (!box) return;
  const d = document.createElement('div');
  d.className = 'chat-line' + (mine ? ' mine' : '');
  const b = document.createElement('b');
  b.textContent = name + ': ';
  const s = document.createElement('span');
  s.textContent = text;
  d.appendChild(b); d.appendChild(s);
  box.appendChild(d);
  trimChat(box);
}
function toggleChat() {
  Audio2.click();
  const p = $('chat-panel');
  if (!p) return;
  p.classList.toggle('hidden');
  if (!p.classList.contains('hidden')) {
    if (typeof restorePanelPos === 'function') restorePanelPos('chat-panel', 'roomChatPos'); // 🖐️ vuelve donde lo dejaste
    $('chat-dot').classList.add('hidden');
    setTimeout(() => { const i = $('chat-input'); if (i) i.focus(); }, 60);
  }
}
function sendChat() {
  const inp = $('chat-input');
  if (!inp || !Net.active || !Net.channel) return;
  const text = inp.value.trim().slice(0, 120);
  if (!text) return;
  // 🛡️ SafeWords: filtro anti-grooming, siempre activo (sin apagador en la UI)
  if (typeof SafeWords !== 'undefined' && SafeWords) {
    if (SafeWords.isMuted()) {
      // 📢 si el silencio ACABA de iniciar: aviso GRANDE con el PORQUÉ
      try {
        if (typeof SafeWords.muteJustStarted === 'function' && SafeWords.muteJustStarted() &&
            typeof SafeWords.showMuteAlert === 'function' && SafeWords.showMuteAlert()) {
          return;
        }
      } catch (e) {}
      // 🆘 pista: si el bloqueo es leve, puede apelarse desde AYUDA
      var _swm2 = '🔇 Silenciado por seguridad: podrás escribir de nuevo en 5 minutos.';
      try {
        if (SafeWords.appealableReason(SafeWords.lastReason()))
          _swm2 += ' Si crees que fue un error, toca 🆘 AYUDA en el menú para apelar.';
        else
          _swm2 += ' Toca 🆘 AYUDA en el menú si necesitas ayuda.';
      } catch (e) {}
      toast(_swm2);
      return;
    }
    const swc = SafeWords.check(text);
    if (!swc.ok) {
      SafeWords.noteBlocked();
      if (SafeWords.isCritical(swc.reason)) SafeWords.showBigAlert(); // 🚨 alerta grande
      else SafeWords.showBlocked(swc.reason, text); // 🛡️ el niño ve POR QUÉ no se envió
      return;
    }
  }
  const now = Date.now();
  if (now - Net.lastChat < 1000) { toast('⏳ Espera un segundo para enviar otro mensaje.'); return; }
  Net.lastChat = now;
  try {
    Net.channel.send({ type: 'broadcast', event: 'chat', payload: { id: Net.me.id, name: displayName(), text } });
  } catch (e) { toast('⚠️ No se pudo enviar.'); return; }
  addChatLine(displayName(), text, true);
  inp.value = '';
}
function onChatMsg(p) {
  if (!p || !Net.active) return;
  if (Net.me && p.id === Net.me.id) return;
  let txt = String(p.text || '').slice(0, 120);
  // 🛡️ SafeWords: censurar mensajes recibidos antes de mostrarlos
  // 🚨 si es crítico (secuestro), alerta GRANDE además de censurar
  try {
    if (typeof SafeWords !== 'undefined' && SafeWords) {
      var _swr2 = SafeWords.check(txt);
      if (!_swr2.ok) {
        if (SafeWords.isCritical(_swr2.reason)) SafeWords.showBigAlert();
        else if (_swr2.reason === 'encuentro' && SafeWords.isRisky())
          toast('⚠️ Esta persona ya te pidió tus datos antes. No le respondas y avísale a un adulto.');
      }
      txt = SafeWords.censor(txt);
    }
  } catch (e) {}
  addChatLine(String(p.name || 'Jugador').slice(0, 16), txt, false);
  const panel = $('chat-panel');
  if (panel && panel.classList.contains('hidden')) $('chat-dot').classList.remove('hidden');
}

/* ---------------- arranque online (lo llama game.js en boot) ---------------- */
function onlineInit() {
  const on = (id, fn) => { const el = $(id); if (el) el.addEventListener('click', fn); };
  on('btn-multi', openMultiplayer);
  on('btn-logout', doLogout);
  on('btn-auth-signup', () => { Audio2.click(); showMain('screen-signup'); MODE = 'signup'; });
  on('btn-auth-login', () => { Audio2.click(); showMain('screen-login'); MODE = 'login'; });
  on('btn-auth-back', () => { Audio2.click(); showMain('screen-menu'); MODE = 'menu'; });
  on('btn-signup-go', doSignup);
  on('btn-login-go', doLogin);
  on('btn-signup-tologin', () => { Audio2.click(); showMain('screen-login'); MODE = 'login'; });
  on('btn-login-tosignup', () => { Audio2.click(); showMain('screen-signup'); MODE = 'signup'; });
  on('btn-signup-back', () => { Audio2.click(); showMain('screen-auth'); MODE = 'auth'; });
  on('btn-login-back', () => { Audio2.click(); showMain('screen-auth'); MODE = 'auth'; });
  on('btn-verify-resend', doResend);
  on('btn-verify-back', () => { Audio2.click(); showMain('screen-menu'); MODE = 'menu'; });
  on('btn-setup-back', () => { Audio2.click(); showMain('screen-menu'); MODE = 'menu'; });
  on('btn-online-back', onlineBack);
  on('btn-chat', toggleChat);
  on('btn-chat-close', toggleChat);
  on('btn-chat-rules', () => { try { if (typeof SafeWords !== 'undefined' && SafeWords) SafeWords.showRules(); } catch (e) {} });
  if (typeof makePanelDraggable === 'function') makePanelDraggable('chat-panel', '#chat-head', 'roomChatPos'); // 🖐️ el chat se puede mover
  on('btn-chat-send', sendChat);
  on('btn-leave-room', () => { leaveRoom().then(() => toMenu()); });
  const ci = $('chat-input');
  if (ci) ci.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); sendChat(); }
    e.stopPropagation();
  });
  const enterGo = (id, fn) => {
    const el = $(id);
    if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); fn(); } });
  };
  enterGo('su-pass2', doSignup);
  enterGo('li-pass', doLogin);

  // sesión guardada + regreso del enlace de confirmación (?code=)
  (async () => {
    const client = sb();
    if (!client) { updateAuthUI(); return; }
    try {
      const params = new URLSearchParams(location.search);
      const code = params.get('code');
      if (code) {
        const res = await client.auth.exchangeCodeForSession(code);
        try { history.replaceState(null, '', location.pathname); } catch (e2) {}
        toast(res.error ? '⚠️ No se pudo confirmar la cuenta.' : '✅ ¡Cuenta confirmada! Ya puedes jugar online.');
      }
    } catch (e) {}
    try {
      const { data } = await client.auth.getSession();
      Net.me = data.session ? data.session.user : null;
      client.auth.onAuthStateChange((_event, session) => {
        Net.me = session ? session.user : null;
        updateAuthUI();
        if (_event === 'SIGNED_OUT') leaveRoom(true);
      });
    } catch (e) {}
    updateAuthUI();
  })();
}
