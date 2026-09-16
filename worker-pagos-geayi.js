/* worker-pagos-geayi.js — Worker de Cloudflare para cobros REALES del juego GEAYI.
   ---------------------------------------------------------------------------
   QUÉ HACE: recibe el "nonce" de la tarjeta (generado en el juego con el SDK
   público de Square) y cobra con la API de Square usando la clave SECRETA.

   ⚠️ SEGURIDAD — LÉEME:
   - La clave secreta SQUARE_ACCESS_TOKEN se configura como VARIABLE DE
     ENTORNO / SECRETO en el panel de Cloudflare. JAMÁS va escrita en este
     archivo y JAMÁS se comparte por chat.
   - Este archivo NO se carga en el juego (no va en index.html); vive solo
     en Cloudflare.
   - El juego solo conoce la URL pública del worker (WORKER_URL).

   Rutas:
   - GET  /health → {ok:true} para verificar que el worker vive.
   - POST /pay    → {nonce, amountCents, currency, idempotencyKey, note, sku}
                    cobra con Square y devuelve {ok:true, paymentId} o
                    {ok:false, error}.
*/
'use strict';

const SQUARE_API = 'https://connect.squareup.com/v2/payments';
const SQUARE_VERSION = '2024-12-18';
const MAX_CENTS = 20000; // tope de seguridad: $200 USD por compra

function corsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}
function json(data, status, env) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: Object.assign({ 'Content-Type': 'application/json' }, corsHeaders(env)),
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Preflight CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(env) });
    }

    // Salud del worker
    if (url.pathname === '/health') {
      return json({ ok: true, service: 'geayi-pagos', ts: Date.now() }, 200, env);
    }

    // Cobro real con Square
    if (url.pathname === '/pay' && request.method === 'POST') {
      let body = null;
      try { body = await request.json(); } catch (e) { body = null; }
      if (!body || typeof body !== 'object') {
        return json({ ok: false, error: 'cuerpo inválido' }, 400, env);
      }

      const nonce = String(body.nonce || '').trim();
      const amountCents = Math.floor(Number(body.amountCents));
      const currency = String(body.currency || 'USD').toUpperCase().slice(0, 3);
      const note = String(body.note || 'GEAYI').slice(0, 500);

      if (!nonce) return json({ ok: false, error: 'falta nonce de tarjeta' }, 400, env);
      if (!(amountCents > 0)) return json({ ok: false, error: 'monto inválido' }, 400, env);
      if (amountCents > MAX_CENTS) return json({ ok: false, error: 'monto excede el tope' }, 400, env);

      const secret = env.SQUARE_ACCESS_TOKEN;
      if (!secret) {
        return json({ ok: false, error: 'worker sin configurar (falta secreto)' }, 500, env);
      }

      const idempotencyKey = String(body.idempotencyKey || '').trim() ||
        ('geayi-' + Date.now() + '-' + Math.floor(Math.random() * 1e9));

      let sqRes;
      try {
        sqRes = await fetch(SQUARE_API, {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + secret,
            'Content-Type': 'application/json',
            'Square-Version': SQUARE_VERSION,
          },
          body: JSON.stringify({
            source_id: nonce,
            idempotency_key: idempotencyKey,
            amount_money: { amount: amountCents, currency: currency },
            note: note,
          }),
        });
      } catch (e) {
        return json({ ok: false, error: 'no se pudo contactar a Square' }, 502, env);
      }

      let data = null;
      try { data = await sqRes.json(); } catch (e) { data = null; }

      if (!sqRes.ok || !data || !data.payment) {
        let msg = 'pago rechazado';
        try {
          if (data && Array.isArray(data.errors) && data.errors[0]) {
            msg = data.errors[0].detail || data.errors[0].code || msg;
          }
        } catch (e2) {}
        return json({ ok: false, error: String(msg).slice(0, 300) }, 402, env);
      }

      return json({
        ok: true,
        demo: false,
        paymentId: data.payment.id || null,
        amountCents: amountCents,
        currency: currency,
      }, 200, env);
    }

    return json({ ok: false, error: 'ruta no encontrada' }, 404, env);
  },
};
