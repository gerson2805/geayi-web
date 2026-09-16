/* payments-live.js — Conexión de PAGOS REALES (Square) para GEAYI.
   ---------------------------------------------------------------------------
   🔴 APAGADO POR DEFECTO: LIVE = false. El juego sigue 100% en modo DEMO
   hasta que el dueño lo active a mano (PaymentsLive.setLive(true)).

   - NO contiene claves secretas. La clave secreta vive SOLO en el worker de
     Cloudflare (como variable de entorno configurada por el dueño,
     jamás por chat ni en este archivo).
   - SQUARE_APP_ID y LOCATION_ID son PÚBLICOS por diseño (van en el código).
   - Punto único de entrada: PaymentsLive.route(sku, cents, note).
     · Si isLive() → cobra de verdad con tarjeta (SDK de Square + worker).
     · Si no → delega al Billing demo existente (flujo intacto).
   - El PIN parental se verifica ANTES (en Shop2._withPin), en ambos modos.
*/
'use strict';

const PaymentsLive = {
  /* ⚙️ CONFIGURACIÓN DEL DUEÑO */
  LIVE: false,          // ← NO tocar: solo el dueño lo activa cuando ordene
  WORKER_URL: '',       // ← el dueño pega aquí la URL de su worker (https://...)
  SQUARE_APP_ID: 'sq0idp-edk63378_Fu8TzZWR0xQmQ', // público por diseño (Geayi Games)
  LOCATION_ID: 'LNBBVB583BP20',                  // público por diseño

  /* 💰 Precios en centavos decididos por el dueño (solo se cobran con LIVE=true) */
  PRICES: {
    'world-create': 299,   // crear un mundo: $2.99 (Gerson, 2026-09-14)
  },

  /* ¿Los pagos reales están efectivamente activos? (bandera + URL) */
  isLive() {
    try { return this.LIVE === true && typeof this.WORKER_URL === 'string' && this.WORKER_URL.indexOf('https://') === 0; }
    catch (e) { return false; }
  },

  /* Interruptor del dueño. Solo cambia la bandera en memoria; el valor por
     defecto del archivo siempre es false. */
  setLive(on) {
    this.LIVE = (on === true);
    return this.LIVE;
  },

  /* Etiqueta visible para la tienda. */
  label() { return this.isLive() ? '💳 PAGOS REALES' : '🧪 DEMO'; },

  /* Punto único de pago: lo usa monetiza.js en lugar de Billing.buy directo. */
  async route(sku, cents, note) {
    try {
      if (this.isLive()) return await this.buyReal({ sku: sku, cents: cents, note: note });
      if (typeof Billing !== 'undefined' && Billing && typeof Billing.buy === 'function') {
        return await Billing.buy(sku); // ← flujo demo intacto
      }
      return { ok: true, sku: sku, demo: true, ts: Date.now() };
    } catch (e) {
      return { ok: false, reason: 'err' };
    }
  },

  /* ---- pago REAL con tarjeta (solo cuando isLive()) ---- */
  async buyReal(opts) {
    const o = opts || {};
    const cents = Math.floor(Number(o.cents));
    if (!(cents > 0)) return { ok: false, reason: 'monto' };
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      return { ok: false, reason: 'nodom' };
    }
    try {
      const token = await this._tokenizeCard(cents, o.note || o.sku);
      if (!token) return { ok: false, reason: 'card' }; // usuario canceló o tarjeta inválida
      const url = String(this.WORKER_URL).replace(/\/$/, '') + '/pay';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nonce: token,
          amountCents: cents,
          currency: 'USD',
          idempotencyKey: 'geayi-' + Date.now() + '-' + Math.floor(Math.random() * 1e9),
          note: String(o.note || o.sku || 'GEAYI').slice(0, 200),
          sku: String(o.sku || ''),
        }),
      });
      let data = null;
      try { data = await res.json(); } catch (e) { data = null; }
      if (data && data.ok) {
        return { ok: true, sku: o.sku, demo: false, paymentId: data.paymentId || null, ts: Date.now() };
      }
      return { ok: false, reason: 'declined', detail: (data && data.error) || 'pago rechazado' };
    } catch (e) {
      return { ok: false, reason: 'err' };
    }
  },

  /* Carga dinámica del SDK de Square Web Payments (solo cuando se necesita). */
  _loadSquareSdk() {
    const self = this;
    return new Promise((resolve, reject) => {
      try {
        if (typeof window !== 'undefined' && window.Square) { resolve(window.Square); return; }
        const s = document.createElement('script');
        s.src = 'https://web.squarecdn.com/v1/square.js';
        s.onload = () => { try { resolve(window.Square); } catch (e) { reject(e); } };
        s.onerror = () => reject(new Error('sdk'));
        document.head.appendChild(s);
      } catch (e) { reject(e); }
    });
  },

  /* Formulario de tarjeta (botones grandes, español). Devuelve el nonce o null. */
  _tokenizeCard(cents, note) {
    const self = this;
    return new Promise((resolve) => {
      const done = (token) => {
        try { if (ov.parentNode) ov.parentNode.removeChild(ov); } catch (e) {}
        resolve(token || null);
      };
      try {
        const amount = '$' + (cents / 100).toFixed(2);
        const ov = document.createElement('div');
        ov.className = 'shop2-ov';
        ov.style.zIndex = '99990';
        ov.innerHTML =
          '<div class="shop2-card shop2-dlg">' +
          '<div class="shop2-dlgtitle">💳 PAGO REAL</div>' +
          '<div class="shop2-dlgbody">' +
          '<div class="shop2-demobig" style="background:#1b5e20">💳 Se cobrará <b>' + amount + '</b> a tu tarjeta</div>' +
          '<div class="pdesc" style="margin:6px 0">' + String(note || '').slice(0, 120) + '</div>' +
          '<div id="pl-card" style="min-height:120px"></div>' +
          '<div id="pl-msg" style="min-height:22px;color:#ff8a80;font-size:14px"></div>' +
          '</div>' +
          '<div class="shop2-dlgbtns">' +
          '<button class="shop2-btn shop2-btn-ok" id="pl-pay" style="min-height:64px;font-size:20px">Pagar ' + amount + '</button>' +
          '<button class="shop2-btn shop2-btn-no" id="pl-cancel" style="min-height:64px;font-size:20px">✕ Cancelar</button>' +
          '</div></div>';
        document.body.appendChild(ov);
        ov.querySelector('#pl-cancel').addEventListener('click', () => done(null));

        let card = null, busy = false;
        self._loadSquareSdk().then(async (Square) => {
          try {
            const payments = Square.payments(self.SQUARE_APP_ID, self.LOCATION_ID);
            card = await payments.card();
            await card.attach('#pl-card');
          } catch (e) {
            const m = ov.querySelector('#pl-msg');
            if (m) m.textContent = '❌ No se pudo abrir el pago. Revisa tu conexión.';
          }
        }).catch(() => {
          const m = ov.querySelector('#pl-msg');
          if (m) m.textContent = '❌ No se pudo abrir el pago. Revisa tu conexión.';
        });

        ov.querySelector('#pl-pay').addEventListener('click', async () => {
          if (busy) return;
          busy = true;
          const m = ov.querySelector('#pl-msg');
          try {
            if (!card) { if (m) m.textContent = '⏳ Espera a que cargue el formulario…'; busy = false; return; }
            const res = await card.tokenize();
            if (res && res.status === 'OK' && res.token) { done(res.token); return; }
            let msg = 'Tarjeta inválida. Revisa los datos.';
            try {
              if (res && Array.isArray(res.errors) && res.errors[0] && res.errors[0].message) {
                msg = String(res.errors[0].message).slice(0, 160);
              }
            } catch (e2) {}
            if (m) m.textContent = '❌ ' + msg;
          } catch (e) {
            if (m) m.textContent = '❌ Error al procesar la tarjeta.';
          }
          busy = false;
        });
      } catch (e) { resolve(null); }
    });
  },
};
