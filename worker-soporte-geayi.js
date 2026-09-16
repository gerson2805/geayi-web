/* worker-soporte-geayi.js — Worker de Cloudflare para SOPORTE y APELACIONES del juego GEAYI.
   -----------------------------------------------------------------------------------------
   QUÉ HACE: verifica datos reales de los jugadores con un código de 6 dígitos
   enviado a su email, y guarda las apelaciones de bloqueos LEVES para que el
   dueño las revise y apruebe o rechace.

   ⚠️ SEGURIDAD — LÉEME:
   - Los secretos se configuran como VARIABLES DE ENTORNO / SECRETOS en el
     panel de Cloudflare. JAMÁS van escritos en este archivo y JAMÁS se
     comparten por chat.
     · RESEND_API_KEY : clave de Resend (para mandar los códigos por email)
     · ADMIN_KEY      : clave que solo el dueño conoce (para ver/decidir apelaciones)
     · NOTIFY_EMAIL   : email del dueño (aquí llegan los avisos de apelaciones)
     · SUPPORT_FROM   : remitente, DEBE ser de un dominio verificado en Resend
                        (ej: soporte@elchulobeef.com)
   - KV binding: SOPORTE_KV (créalo en Cloudflare y pégalo en Settings → Bindings).
   - Este archivo NO se carga en el juego (no va en index.html); vive solo
     en Cloudflare. El juego solo conoce la URL pública del worker.

   Rutas:
   - GET  /health                        → {ok:true} para verificar que vive.
   - POST /appeal/start  {name,email,reason,blockedMsg}
                                          → manda código de 6 dígitos al email.
   - POST /appeal/verify {email,code}     → verifica el código; crea la apelación
                                            y avisa al dueño por email.
   - GET  /appeal/status?id=XXX          → {status: pending|approved|rejected}.
   - GET  /appeal/list?key=ADMIN_KEY      → lista de apelaciones (sin hashes).
   - POST /appeal/decide {id,decision,key}→ decision: approved|rejected.

   Solo razones LEVES se pueden apelar: contacto, coqueteo, encuentro,
   financiero. Lo GRAVE (secuestro, sexual, violencia, fotos) nunca llega aquí.
*/
'use strict';

const APPEALABLE = ['contacto', 'coqueteo', 'encuentro', 'financiero'];
const CODE_TTL = 600;        // el código vence en 10 minutos
const RL_EMAIL_MAX = 3;      // 3 códigos por hora por email
const RL_IP_MAX = 10;        // 10 inicios por hora por IP

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}
function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: Object.assign({ 'Content-Type': 'application/json' }, corsHeaders()),
  });
}
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function validEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e || '').trim());
}
function validName(n) {
  const letters = String(n || '').trim().replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, '');
  return letters.length >= 3;
}
async function sha256Hex(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(s)));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
function newCode() {
  // 6 dígitos aleatorios seguros
  const r = crypto.getRandomValues(new Uint32Array(1))[0];
  return String(100000 + (r % 900000));
}
function newId() {
  const r = crypto.getRandomValues(new Uint32Array(2));
  return 'ap' + Date.now().toString(36) + r[0].toString(36) + r[1].toString(36);
}
function clientIp(request) {
  return request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || '?';
}

/* Límite de intentos: max usos por hora para la clave dada */
async function rateOk(kv, key, max) {
  const k = 'rl:' + key;
  let n = 0;
  try { n = parseInt(await kv.get(k), 10) || 0; } catch (e) { n = 0; }
  if (n >= max) return false;
  try { await kv.put(k, String(n + 1), { expirationTtl: 3600 }); } catch (e) {}
  return true;
}

/* Manda un correo con Resend */
async function sendEmail(env, to, subject, html) {
  const key = env.RESEND_API_KEY;
  const from = env.SUPPORT_FROM;
  if (!key || !from) return { ok: false, error: 'worker sin configurar (faltan secrets)' };
  let res;
  try {
    res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: from, to: [to], subject: subject, html: html }),
    });
  } catch (e) {
    return { ok: false, error: 'no se pudo contactar a Resend' };
  }
  if (!res.ok) return { ok: false, error: 'no se pudo enviar el correo' };
  return { ok: true };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const kv = env.SOPORTE_KV;

    // Preflight CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    // Salud del worker
    if (url.pathname === '/health' && request.method === 'GET') {
      return json({ ok: true, service: 'geayi-soporte', ts: Date.now() });
    }

    if (!kv) {
      return json({ ok: false, error: 'worker sin configurar (falta KV SOPORTE_KV)' }, 500);
    }

    /* ---------- POST /appeal/start : pedir código ---------- */
    if (url.pathname === '/appeal/start' && request.method === 'POST') {
      let body = null;
      try { body = await request.json(); } catch (e) { body = null; }
      if (!body || typeof body !== 'object') return json({ ok: false, error: 'cuerpo inválido' }, 400);

      const name = String(body.name || '').trim().slice(0, 60);
      const email = String(body.email || '').trim().toLowerCase().slice(0, 120);
      const reason = String(body.reason || '').trim();
      const blockedMsg = String(body.blockedMsg || '').slice(0, 300);

      if (!validName(name)) return json({ ok: false, error: 'nombre inválido' }, 400);
      if (!validEmail(email)) return json({ ok: false, error: 'email inválido' }, 400);
      if (APPEALABLE.indexOf(reason) === -1) return json({ ok: false, error: 'motivo no apelable' }, 400);

      // límites: 3/h por email, 10/h por IP
      const emailKey = await sha256Hex('em:' + email);
      if (!(await rateOk(kv, 'e:' + emailKey, RL_EMAIL_MAX))) {
        return json({ ok: false, error: 'demasiados intentos, espera una hora' }, 429);
      }
      const ipKey = await sha256Hex('ip:' + clientIp(request));
      if (!(await rateOk(kv, 'i:' + ipKey, RL_IP_MAX))) {
        return json({ ok: false, error: 'demasiados intentos, espera una hora' }, 429);
      }

      // generar código y guardar su hash (10 minutos)
      const code = newCode();
      const hash = await sha256Hex('code:' + email + ':' + code);
      try {
        await kv.put('code:' + email,
          JSON.stringify({ hash: hash, name: name, reason: reason, blockedMsg: blockedMsg, ts: Date.now() }),
          { expirationTtl: CODE_TTL });
      } catch (e) {
        return json({ ok: false, error: 'no se pudo guardar el código' }, 500);
      }

      // mandar el código por email
      const mailHtml =
        '<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">' +
        '<h2>🆘 Soporte GEAYI</h2>' +
        '<p>Hola ' + esc(name) + ', tu código de verificación es:</p>' +
        '<p style="font-size:44px;font-weight:900;letter-spacing:10px;text-align:center;background:#f2f5ff;border-radius:12px;padding:16px;">' + esc(code) + '</p>' +
        '<p>Vence en <b>10 minutos</b>. Si no pediste este código, ignora este correo.</p></div>';
      const sent = await sendEmail(env, email, 'GEAYI — tu código de verificación: ' + code, mailHtml);
      if (!sent.ok) return json({ ok: false, error: sent.error }, 502);

      return json({ ok: true, ttlSec: CODE_TTL });
    }

    /* ---------- POST /appeal/verify : verificar código ---------- */
    if (url.pathname === '/appeal/verify' && request.method === 'POST') {
      let body = null;
      try { body = await request.json(); } catch (e) { body = null; }
      if (!body || typeof body !== 'object') return json({ ok: false, error: 'cuerpo inválido' }, 400);

      const email = String(body.email || '').trim().toLowerCase().slice(0, 120);
      const code = String(body.code || '').trim();
      if (!validEmail(email) || !/^\d{6}$/.test(code)) {
        return json({ ok: false, error: 'código inválido' }, 400);
      }

      let saved = null;
      try { saved = await kv.get('code:' + email, 'json'); } catch (e) { saved = null; }
      if (!saved || !saved.hash) return json({ ok: false, error: 'código vencido o no pedido' }, 400);

      const hash = await sha256Hex('code:' + email + ':' + code);
      if (hash !== saved.hash) return json({ ok: false, error: 'código incorrecto' }, 400);

      // código correcto: crear la apelación (sin guardar el código ni su hash)
      const id = newId();
      const appeal = {
        id: id,
        name: String(saved.name || '').slice(0, 60),
        email: email,
        verified: true,
        reason: String(saved.reason || ''),
        blockedMsg: String(saved.blockedMsg || '').slice(0, 300),
        ts: Date.now(),
        status: 'pending',
      };
      try {
        await kv.put('appeal:' + id, JSON.stringify(appeal));
        await kv.delete('code:' + email); // el código ya se usó
      } catch (e) {
        return json({ ok: false, error: 'no se pudo guardar la apelación' }, 500);
      }

      // avisar al dueño por email
      const notifyTo = env.NOTIFY_EMAIL;
      if (notifyTo) {
        const nHtml =
          '<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;">' +
          '<h2>📝 Nueva apelación GEAYI</h2>' +
          '<p><b>ID:</b> ' + esc(id) + '</p>' +
          '<p><b>Nombre:</b> ' + esc(appeal.name) + '</p>' +
          '<p><b>Email verificado:</b> ' + esc(email) + ' ✅</p>' +
          '<p><b>Motivo:</b> ' + esc(appeal.reason) + '</p>' +
          '<p><b>Aviso del filtro:</b> ' + esc(appeal.blockedMsg) + '</p>' +
          '<p>Revísala en tu panel de soporte (admin-soporte.html) para aprobarla o rechazarla.</p></div>';
        try { await sendEmail(env, notifyTo, '📝 Nueva apelación GEAYI: ' + appeal.name, nHtml); } catch (e) {}
      }

      return json({ ok: true, id: id });
    }

    /* ---------- GET /appeal/status?id= ---------- */
    if (url.pathname === '/appeal/status' && request.method === 'GET') {
      const id = String(url.searchParams.get('id') || '').slice(0, 64);
      if (!id) return json({ ok: false, error: 'falta id' }, 400);
      let a = null;
      try { a = await kv.get('appeal:' + id, 'json'); } catch (e) { a = null; }
      if (!a) return json({ ok: false, error: 'no encontrada' }, 404);
      return json({ ok: true, status: a.status || 'pending' });
    }

    /* ---------- GET /appeal/list?key= (solo dueño) ---------- */
    if (url.pathname === '/appeal/list' && request.method === 'GET') {
      const key = String(url.searchParams.get('key') || '');
      if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) {
        return json({ ok: false, error: 'no autorizado' }, 401);
      }
      let items = [];
      try {
        const listed = await kv.list({ prefix: 'appeal:' });
        const gets = (listed.keys || []).map(k => kv.get(k.name, 'json'));
        const vals = await Promise.all(gets);
        items = vals.filter(Boolean).map(a => ({
          id: a.id, name: a.name, email: a.email, verified: !!a.verified,
          reason: a.reason, blockedMsg: a.blockedMsg, ts: a.ts, status: a.status || 'pending',
        }));
        items.sort((x, y) => (y.ts || 0) - (x.ts || 0));
      } catch (e) { items = []; }
      return json({ ok: true, appeals: items });
    }

    /* ---------- POST /appeal/decide (solo dueño) ---------- */
    if (url.pathname === '/appeal/decide' && request.method === 'POST') {
      let body = null;
      try { body = await request.json(); } catch (e) { body = null; }
      if (!body || typeof body !== 'object') return json({ ok: false, error: 'cuerpo inválido' }, 400);
      const key = String(body.key || '');
      if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) {
        return json({ ok: false, error: 'no autorizado' }, 401);
      }
      const id = String(body.id || '').slice(0, 64);
      const decision = String(body.decision || '');
      if (!id) return json({ ok: false, error: 'falta id' }, 400);
      if (decision !== 'approved' && decision !== 'rejected') {
        return json({ ok: false, error: 'decisión inválida' }, 400);
      }
      let a = null;
      try { a = await kv.get('appeal:' + id, 'json'); } catch (e) { a = null; }
      if (!a) return json({ ok: false, error: 'no encontrada' }, 404);
      a.status = decision;
      a.decidedAt = Date.now();
      try { await kv.put('appeal:' + id, JSON.stringify(a)); } catch (e) {
        return json({ ok: false, error: 'no se pudo guardar' }, 500);
      }
      return json({ ok: true, status: decision });
    }

    return json({ ok: false, error: 'ruta no encontrada' }, 404);
  },
};
