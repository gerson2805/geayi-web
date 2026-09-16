/* ============================================================
   🆘 SUPPORT — Ayuda, soporte y APELACIONES con datos verificados
   (GEAYI — Obby Xtreme 3D)
   ------------------------------------------------------------
   1. Pantalla "🆘 AYUDA" con preguntas frecuentes (respuestas
      automáticas) + contacto (WhatsApp / email del dueño).
   2. 🛡️ Mi estado: muestra el muteo del filtro SafeWords y,
      si la razón es LEVE (contacto/coqueteo/encuentro/financiero),
      permite APELAR el bloqueo en 2 NIVELES:
      - NIVEL 1 ⚡ automático e instantáneo (100% local, sin
        formularios ni email): la PRIMERA vez que silencian al
        jugador por motivo leve, el juego lo perdona al momento
        con un mensaje educativo. Solo se puede usar UNA vez
        en la vida (SAVE.appealAutoUsed).
      - NIVEL 2 🧑‍⚖️ manual con datos verificados: si ya usó su
        perdón o es reincidente, apela con email real (código de
        6 dígitos) y el dueño la revisa en lote cuando pueda.
   3. La apelación del nivel 2 EXIGE verificar datos reales: el
      worker manda un código de 6 dígitos al email REAL del usuario
      y solo con ese código la apelación queda registrada.
   4. Los bloqueos GRAVES (secuestro, sexual, violencia, fotos)
      NO se perdonan NI se apelan. Eso no se negocia.

   Sin dependencias nuevas. Todo con try/catch. ES5.
   ============================================================
   INTEGRACIÓN:
   1. index.html: <script src="support.js"></script> después de chat.js
   2. Botón #btn-support → showMain('screen-support')
   3. Support.init() se corre al cargar el documento.
   ============================================================ */
'use strict';

var Support = {
  /* ⚙️ CONFIGURACIÓN DEL DUEÑO */
  WORKER_URL: '', // ← el dueño pega aquí la URL de su worker de soporte (https://...)
  CONTACT: {
    whatsapp: '12396519974', // ← WhatsApp real del dueño
    email: '',               // ← opcional: si está vacío no se muestra el botón de email
  },

  /* ¿El soporte está conectado? (URL válida) */
  isConnected: function () {
    try {
      return typeof this.WORKER_URL === 'string' && this.WORKER_URL.indexOf('https://') === 0;
    } catch (e) { return false; }
  },

  /* ❓ Preguntas frecuentes (respuestas automáticas) */
  FAQ: [
    { q: '🔇 Me silenciaron, no puedo escribir', a: 'El filtro de seguridad te silenció 5 minutos porque un mensaje rompió las reglas (pedir datos, fotos, encuentros...). Espera a que pase el tiempo. Si crees que fue un error Y tu bloqueo es leve (contacto, coqueteo, encuentro o dinero), tócalo en 🛡️ Mi estado de aquí abajo: la primera vez te perdonamos al instante ⚡; si ya usaste tu perdón, apelas con tus datos reales y una persona lo revisa 🧑‍⚖️. Los bloqueos graves nunca se perdonan ni se apelan.' },
    { q: '🛡️ ¿Por qué mi mensaje no se envió?', a: 'El juego tiene un filtro que protege a los niños: bloquea mensajes que pidan tu número, tus redes, fotos, encuentros a escondidas o hablen de dinero. Escríbelo con otras palabras. Nunca compartas datos personales con nadie del juego.' },
    { q: '🚩 ¿Cómo reporto a un jugador que se porta mal?', a: 'Si alguien te escribe cosas raras (te pide fotos, tu número, que se vean a escondidas), NO le respondas, toma captura de pantalla y cuéntaselo enseguida a tu papá o tu mamá. También puedes escribirnos por WhatsApp en la sección 📞 Contacto.' },
    { q: '🧱 ¿Cómo creo un mundo?', a: 'Entra a un nivel, compra tu lote 🪧, párate en él y abre 🌍 Mis Mundos → ➕ Crear mundo. En demo cuesta 100🪙. Quien visite tu mundo y construya te paga 25🪙 por visita.' },
    { q: '🪙 ¿Cómo gano monedas?', a: 'Jugando niveles y recogiendo monedas, ganando carreras y torneos, visitando mundos y con los bonos diarios. Las monedas sirven para sombreros, estelas, lotes y pases.' },
    { q: '👑 ¿Qué son los pases?', a: 'VIP 👑 (corona 3D + 10% más monedas), Vuelo 🕊️ (botón para volar y bajar) y Constructor 🧱 (600 bloques en vez de 400 + robot más rápido). Se compran en la tienda con PIN de papá/mamá.' },
    { q: '🧰 ¿Cómo construyo?', a: 'Entra al modo Construir: toca el suelo para poner un bloque, usa 🖌️ para pintar y 🧽 para borrar. Tienes 8 formas (cubo, rampa, cilindro, esfera, escalera, arco, cuña, losa), 7 materiales y 8 objetos. Tu construcción se guarda sola.' },
    { q: '🌐 ¿Cómo juego con mis amigos?', a: 'Toca 🌐 MULTIJUGADOR ONLINE, crea o entra a una sala y comparte el código con tus amigos. En la sala hay chat con las mismas reglas de seguridad.' },
    { q: '🚪 No puedo entrar a una sala', a: 'Revisa tu conexión a internet y que el código de la sala esté bien escrito. Si el juego se quedó trabado, ciérralo por completo y vuelve a abrirlo.' },
  ],

  /* ---------- utilidades ---------- */
  _toast: function (msg) { try { if (typeof toast === 'function') toast(msg); } catch (e) {} },
  _persist: function () { try { if (typeof persist === 'function') persist(); } catch (e) {} },
  _esc: function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  },
  _ensureOutbox: function () {
    try { if (!Array.isArray(SAVE.appealOutbox)) SAVE.appealOutbox = []; } catch (e) {}
  },

  waLink: function () {
    var t = 'Hola, necesito ayuda con el juego GEAYI 🎮';
    try { return 'https://wa.me/' + this.CONTACT.whatsapp + '?text=' + encodeURIComponent(t); }
    catch (e) { return 'https://wa.me/' + this.CONTACT.whatsapp; }
  },
  _fmtTime: function (sec) {
    try {
      sec = Math.max(0, Math.floor(sec || 0));
      var m = Math.floor(sec / 60), s = sec % 60;
      return m + ':' + (s < 10 ? '0' : '') + s;
    } catch (e) { return '—'; }
  },

  /* mensaje grande en pantalla (para el perdón automático: que el niño lo lea) */
  _bigMsg: function (title, body) {
    try {
      if (typeof document === 'undefined') return;
      var old = document.getElementById('sup-bigmsg');
      if (old && old.parentNode) old.parentNode.removeChild(old);
      var ov = document.createElement('div');
      ov.id = 'sup-bigmsg';
      ov.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,40,80,.85);padding:20px;';
      var box = document.createElement('div');
      box.style.cssText = 'background:#fff;border-radius:20px;max-width:420px;width:100%;padding:26px 22px;text-align:center;';
      var t = document.createElement('div');
      t.style.cssText = 'font-size:22px;font-weight:900;margin-bottom:12px;';
      t.textContent = String(title == null ? '' : title);
      var b = document.createElement('div');
      b.style.cssText = 'font-size:15px;line-height:1.55;margin-bottom:18px;white-space:pre-line;';
      b.textContent = String(body == null ? '' : body);
      var btn = document.createElement('button');
      btn.className = 'btn btn-big';
      btn.textContent = '¡Entendido! 🎉';
      btn.addEventListener('click', function () {
        try { if (ov.parentNode) ov.parentNode.removeChild(ov); } catch (e) {}
      });
      box.appendChild(t); box.appendChild(b); box.appendChild(btn);
      ov.appendChild(box);
      (document.body || document.documentElement).appendChild(ov);
    } catch (e) {}
  },

  /* ---------- entrada ---------- */
  init: function () {
    try {
      var self = this;
      var b = (typeof document !== 'undefined') ? document.getElementById('btn-support') : null;
      if (b && b.addEventListener) {
        b.addEventListener('click', function () {
          try {
            if (typeof Audio2 !== 'undefined' && Audio2 && Audio2.click) Audio2.click();
            if (typeof showMain === 'function') showMain('screen-support');
            self.render();
            Appeals.checkStatus();
          } catch (e) {}
        });
      }
      var bb = (typeof document !== 'undefined') ? document.getElementById('btn-support-back') : null;
      if (bb && bb.addEventListener) {
        bb.addEventListener('click', function () {
          try {
            if (typeof Audio2 !== 'undefined' && Audio2 && Audio2.click) Audio2.click();
            if (typeof showMain === 'function') showMain('screen-menu');
          } catch (e) {}
        });
      }
      Appeals.checkStatus();
    } catch (e) {}
  },

  /* ---------- render de la pantalla ---------- */
  render: function () {
    try {
      var root = (typeof document !== 'undefined') ? document.getElementById('support-root') : null;
      if (!root) return;
      var html = '';
      /* ❓ FAQ */
      html += '<h3>❓ Preguntas frecuentes</h3><div class="faq-list">';
      for (var i = 0; i < this.FAQ.length; i++) {
        html += '<div class="faq-item">' +
          '<button class="faq-q" data-faq="' + i + '">' + this._esc(this.FAQ[i].q) + ' <span>▾</span></button>' +
          '<div class="faq-a hidden">' + this._esc(this.FAQ[i].a) + '</div></div>';
      }
      html += '</div>';
      /* 📞 Contacto */
      html += '<h3>📞 Contacto</h3><div class="sup-row">' +
        '<a class="btn btn-big" href="' + this._esc(this.waLink()) + '" target="_blank" rel="noopener">💬 WhatsApp</a>';
      if (this.CONTACT.email) {
        html += '<a class="btn btn-big" href="mailto:' + this._esc(this.CONTACT.email) + '?subject=' +
          encodeURIComponent('Ayuda con GEAYI 🎮') + '">📧 Email</a>';
      }
      html += '</div>';
      if (!this.isConnected()) {
        html += '<div class="sup-note">ℹ️ El sistema de apelaciones en línea estará disponible pronto. Mientras tanto puedes escribirnos por WhatsApp.</div>';
      }
      /* 🛡️ Mi estado */
      html += '<h3>🛡️ Mi estado</h3><div class="sup-status">' + this._statusHtml() + '</div>';
      root.innerHTML = html;
      /* acordeón */
      var qs = root.querySelectorAll ? root.querySelectorAll('.faq-q') : [];
      for (var j = 0; j < qs.length; j++) {
        (function (btn) {
          btn.addEventListener('click', function () {
            try {
              var ans = btn.parentNode ? btn.parentNode.querySelector('.faq-a') : null;
              if (ans) ans.classList.toggle('hidden');
            } catch (e) {}
          });
        })(qs[j]);
      }
      var ab = root.querySelector ? root.querySelector('#btn-appeal-open') : null;
      if (ab && ab.addEventListener) {
        ab.addEventListener('click', function () {
          try {
            /* NIVEL 1 ⚡ primero: perdón automático si aplica; si no, NIVEL 2 🧑‍⚖️ */
            var r = Appeals.tryInstantResolve();
            if (r && r.ok) { Support.render(); return; }
            Appeals.openForm();
          } catch (e) { try { Appeals.openForm(); } catch (e2) {} }
        });
      }
    } catch (e) {}
  },

  _statusHtml: function () {
    try {
      var muted = (typeof SafeWords !== 'undefined' && SafeWords && SafeWords.isMuted()) ? true : false;
      if (muted) {
        var sec = (SafeWords.muteRemainingSec) ? SafeWords.muteRemainingSec() : 0;
        var h = '<div class="appeal-card"><b>🔇 Estás silenciado por seguridad</b><br>' +
          'Podrás escribir de nuevo en <b>' + this._esc(this._fmtTime(sec)) + '</b> ⏳<br>';
        if (Appeals.canAppeal()) {
          h += '<button id="btn-appeal-open" class="btn btn-big" style="margin-top:10px">📝 Apelar (revisión rápida)</button>' +
            '<div class="sup-note">⚡ Primera vez: te perdonamos al instante, sin formularios.<br>' +
            '🧑‍⚖️ Si ya usaste tu perdón: apelas con tus datos reales y una persona lo revisa.</div>';
        } else {
          h += '<div class="sup-note">⚠️ Este tipo de bloqueo es <b>grave</b> y <b>no se puede apelar</b>. ' +
            'Es para proteger a los niños. Si necesitas ayuda, escríbenos por WhatsApp.</div>';
        }
        return h + '</div>';
      }
      if (typeof SAVE !== 'undefined' && SAVE.appeal && SAVE.appeal.status === 'pending') {
        return '<div class="appeal-card">⏳ <b>Tu apelación está en revisión.</b><br>' +
          '<span class="sup-note">Te avisaremos aquí mismo cuando haya respuesta.</span></div>';
      }
      if (typeof SAVE !== 'undefined' && SAVE.appeal && SAVE.appeal.status === 'approved') {
        return '<div class="appeal-card">✅ <b>Tu cuenta está en buen estado.</b><br>' +
          '<span class="sup-note">Tu última apelación fue aprobada 🎉</span></div>';
      }
      return '<div class="appeal-card">✅ <b>Tu cuenta está en buen estado.</b><br>' +
        '<span class="sup-note">Sin bloqueos activos. ¡A jugar! 🎮</span></div>';
    } catch (e) { return ''; }
  },
};

/* ============================================================
   📝 APPEALS — apelaciones en 2 NIVELES
   ------------------------------------------------------------
   NIVEL 1 ⚡ automático e instantáneo (100% local): si el muteo
   es por motivo LEVE y el jugador NUNCA usó su perdón
   (SAVE.appealAutoUsed), se perdona AL MOMENTO con mensaje
   educativo. Resuelve ~el 90% en segundos, sin esperar al dueño.
   NIVEL 2 🧑‍⚖️ manual con VERIFICACIÓN de datos reales: si ya
   usó su perdón o es reincidente, va al formulario + código de
   6 dígitos al email + cola (SAVE.appealOutbox o worker).
   - Solo razones LEVES: contacto, coqueteo, encuentro, financiero.
   - Los bloqueos GRAVES (secuestro, sexual, violencia, fotos)
     JAMÁS se perdonan ni se apelan.
   ============================================================ */
var Appeals = {
  APPEALABLE: ['contacto', 'coqueteo', 'encuentro', 'financiero'],
  REASON_LABEL: {
    contacto: '📞 Contacto (número / redes)',
    coqueteo: '💬 Coqueteo',
    encuentro: '📍 Encuentro',
    financiero: '💳 Dinero',
  },
  _pending: null, // {name, email, reason, blockedMsg} esperando código

  /* ¿se puede apelar el bloqueo actual? */
  canAppeal: function () {
    try {
      if (typeof SafeWords === 'undefined' || !SafeWords) return false;
      if (!SafeWords.isMuted()) return false;
      if (typeof SafeWords.appealableReason !== 'function') return false;
      if (typeof SafeWords.lastReason !== 'function') return false;
      return SafeWords.appealableReason(SafeWords.lastReason()) === true;
    } catch (e) { return false; }
  },

  /* ⚡ NIVEL 1 — perdón automático instantáneo (una sola vez en la vida).
     Solo aplica si hay muteo activo por motivo LEVE y el jugador nunca
     usó su perdón. Retorna {ok:true} si perdonó, {ok:false, why} si no. */
  tryInstantResolve: function () {
    try {
      if (typeof SafeWords === 'undefined' || !SafeWords) return { ok: false, why: 'nomod' };
      if (!SafeWords.isMuted()) return { ok: false, why: 'nomute' };
      if (typeof SafeWords.appealableReason !== 'function' || typeof SafeWords.lastReason !== 'function')
        return { ok: false, why: 'nomod' };
      var reason = SafeWords.lastReason();
      if (SafeWords.appealableReason(reason) !== true) return { ok: false, why: 'notappealable' };
      if (typeof SAVE !== 'undefined' && SAVE && SAVE.appealAutoUsed) return { ok: false, why: 'used' };
      /* perdonar: quitar el silencio y marcar el perdón como usado */
      if (typeof SafeWords._unmute === 'function') SafeWords._unmute();
      try {
        if (typeof SAVE !== 'undefined' && SAVE) {
          SAVE.appealAutoUsed = true;
          if (typeof persist === 'function') persist();
        }
      } catch (e2) {}
      var m = this._forgiveMsg(reason);
      Support._bigMsg(m.title, m.body);
      Support._toast('🎉 Te perdonamos esta vez. ¡Juega limpio! 🎮');
      return { ok: true };
    } catch (e) { return { ok: false, why: 'err' }; }
  },

  /* mensaje educativo del perdón: palabras simples, para niños */
  /* mensaje educativo del perdón: usa la MISMA explicación del
     silencio (SafeWords.muteWhy) para ser consistente 📢 */
  _forgiveMsg: function (reason) {
    try {
      var expl = '';
      try {
        if (typeof SafeWords !== 'undefined' && SafeWords && typeof SafeWords.muteWhy === 'function')
          expl = SafeWords.muteWhy(reason); // misma explicación del silencio 📢
      } catch (e2) {}
      if (!expl) expl = '🔇 Te habíamos silenciado por 5 minutos por seguridad.';
      return {
        title: '🎉 Te perdonamos esta vez',
        body: expl + '\n\n' +
          'Este fue tu perdón automático: solo se puede usar UNA vez ⚡.\n' +
          'La próxima vez, una persona va a revisar tu caso 🧑‍⚖️.\n\n' +
          '¡Juega limpio y diviértete! 🎮',
      };
    } catch (e) {
      return { title: '🎉 Te perdonamos esta vez', body: '¡Juega limpio y diviértete! 🎮' };
    }
  },

  validName: function (n) {
    try {
      var t = String(n == null ? '' : n).trim();
      var letters = t.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, '');
      return letters.length >= 3;
    } catch (e) { return false; }
  },
  validEmail: function (e) {
    try { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e == null ? '' : e).trim()); }
    catch (e2) { return false; }
  },
  validCode: function (c) {
    try { return /^\d{6}$/.test(String(c == null ? '' : c).trim()); }
    catch (e) { return false; }
  },

  /* valida los datos del formulario; {ok:true} | {ok:false, why} */
  validate: function (d) {
    try {
      d = d || {};
      if (!this.validName(d.name)) return { ok: false, why: 'name' };
      if (!this.validEmail(d.email)) return { ok: false, why: 'email' };
      if (this.APPEALABLE.indexOf(d.reason) === -1) return { ok: false, why: 'reason' };
      if (!d.consent) return { ok: false, why: 'consent' };
      return { ok: true };
    } catch (e) { return { ok: false, why: 'err' }; }
  },

  /* abre el formulario de apelación */
  openForm: function () {
    try {
      if (!this.canAppeal()) {
        Support._toast('⚠️ Este bloqueo no se puede apelar.');
        return false;
      }
      var root = (typeof document !== 'undefined') ? document.getElementById('support-root') : null;
      if (!root) return false;
      var opts = '';
      for (var i = 0; i < this.APPEALABLE.length; i++) {
        var r = this.APPEALABLE[i];
        opts += '<option value="' + r + '">' + Support._esc(this.REASON_LABEL[r] || r) + '</option>';
      }
      root.innerHTML =
        '<h3>📝 Apelar bloqueo</h3>' +
        '<div class="sup-note">🛡️ Para apelar debes verificar que tus <b>datos son reales</b>: ' +
        'te mandaremos un <b>código de 6 dígitos</b> a tu email.</div>' +
        '<div class="sup-form">' +
        '<label>👤 Tu nombre real</label>' +
        '<input id="ap-name" maxlength="60" placeholder="Escribe tu nombre" autocomplete="name">' +
        '<label>📧 Tu email real</label>' +
        '<input id="ap-email" type="email" maxlength="120" placeholder="tucorreo@ejemplo.com" autocomplete="email">' +
        '<label>❓ ¿Por qué te bloquearon?</label>' +
        '<select id="ap-reason">' + opts + '</select>' +
        '<label>💬 ¿Qué pasó? (cuéntalo con tus palabras)</label>' +
        '<textarea id="ap-msg" maxlength="500" placeholder="Ej: solo estaba saludando a mi amigo..."></textarea>' +
        '<label class="sup-check"><input type="checkbox" id="ap-consent"> ' +
        'Soy mayor de edad o tengo permiso de mi papá/mamá, y mis datos son reales. ✅</label>' +
        '<div class="sup-row">' +
        '<button id="ap-send" class="btn btn-big">📨 Enviar apelación</button>' +
        '<button id="ap-cancel" class="btn">↩️ Volver</button>' +
        '</div></div>';
      var self = this;
      var bs = root.querySelector('#ap-send');
      if (bs) bs.addEventListener('click', function () { self.submit(); });
      var bc = root.querySelector('#ap-cancel');
      if (bc) bc.addEventListener('click', function () { Support.render(); });
      return true;
    } catch (e) { return false; }
  },

  _readForm: function () {
    var g = function (id) {
      try { var el = document.getElementById(id); return el ? el.value : ''; }
      catch (e) { return ''; }
    };
    var consent = false;
    try { var c = document.getElementById('ap-consent'); consent = !!(c && c.checked); } catch (e) {}
    return { name: g('ap-name'), email: g('ap-email'), reason: g('ap-reason'), msg: g('ap-msg'), consent: consent };
  },

  /* envía la apelación (data opcional: si no viene, lee el formulario) */
  submit: function (data) {
    try {
      var d = data || this._readForm();
      var v = this.validate(d);
      if (!v.ok) {
        var msgs = {
          name: '✏️ Escribe tu nombre real (mínimo 3 letras).',
          email: '📧 Ese email no parece real. Revísalo.',
          reason: '❓ Ese motivo no se puede apelar.',
          consent: '✅ Marca la casilla confirmando que tus datos son reales.',
        };
        Support._toast(msgs[v.why] || '⚠️ Revisa los datos.');
        return { ok: false, why: v.why };
      }
      var clean = {
        name: String(d.name).trim().slice(0, 60),
        email: String(d.email).trim().toLowerCase().slice(0, 120),
        reason: d.reason,
        msg: String(d.msg || '').trim().slice(0, 500),
        ts: Date.now(),
      };
      /* sin worker: guardar en la bandeja de salida local */
      if (!Support.isConnected()) {
        Support._ensureOutbox();
        SAVE.appealOutbox.push(clean);
        Support._persist();
        Support._toast('📨 Apelación guardada: se enviará cuando el soporte esté conectado.');
        Support.render();
        return { ok: true, queued: true };
      }
      /* con worker: pedir el código de verificación */
      var self = this;
      var blockedMsg = '';
      try {
        if (typeof SafeWords !== 'undefined' && SafeWords && SafeWords.lastReason) {
          blockedMsg = SafeWords.warnFor ? String(SafeWords.warnFor(SafeWords.lastReason())) : String(SafeWords.lastReason());
        }
      } catch (e) {}
      this._post('/appeal/start', {
        name: clean.name, email: clean.email, reason: clean.reason, blockedMsg: blockedMsg.slice(0, 300),
      }).then(function (res) {
        if (res && res.ok) {
          self._pending = clean;
          self._codeScreen();
          Support._toast('📧 Te mandamos un código a tu email. Escríbelo aquí.');
        } else {
          Support._toast('⚠️ No se pudo enviar el código. Intenta de nuevo.' +
            (res && res.error ? ' (' + String(res.error).slice(0, 60) + ')' : ''));
        }
      });
      return { ok: true, sent: true };
    } catch (e) {
      Support._toast('⚠️ No se pudo enviar la apelación.');
      return { ok: false, why: 'err' };
    }
  },

  /* pantalla del código de 6 dígitos */
  _codeScreen: function () {
    try {
      var root = (typeof document !== 'undefined') ? document.getElementById('support-root') : null;
      if (!root) return;
      var mail = this._pending ? Support._esc(this._pending.email) : '';
      root.innerHTML =
        '<h3>🔐 Verifica tu email</h3>' +
        '<div class="sup-note">📧 Mandamos un código de <b>6 dígitos</b> a <b>' + mail + '</b>.<br>' +
        'Escríbelo aquí para confirmar que tus datos son reales. Vence en 10 minutos ⏳</div>' +
        '<div class="sup-form">' +
        '<label>🔢 Código</label>' +
        '<input id="ap-code" class="code-input" inputmode="numeric" maxlength="6" placeholder="••••••" autocomplete="one-time-code">' +
        '<div class="sup-row">' +
        '<button id="ap-verify" class="btn btn-big">✅ Verificar</button>' +
        '<button id="ap-cancel2" class="btn">↩️ Volver</button>' +
        '</div></div>';
      var self = this;
      var bv = root.querySelector('#ap-verify');
      if (bv) bv.addEventListener('click', function () { self.verifyCode(); });
      var bc = root.querySelector('#ap-cancel2');
      if (bc) bc.addEventListener('click', function () { self._pending = null; Support.render(); });
      var inp = root.querySelector('#ap-code');
      if (inp) setTimeout(function () { try { inp.focus(); } catch (e) {} }, 60);
    } catch (e) {}
  },

  /* verifica el código (code opcional: si no viene, lee el input) */
  verifyCode: function (code) {
    try {
      var c = (code != null) ? String(code) : '';
      if (!code) {
        try { var el = document.getElementById('ap-code'); c = el ? el.value : ''; } catch (e) {}
      }
      if (!this.validCode(c)) {
        Support._toast('🔢 El código tiene 6 dígitos. Revísalo.');
        return { ok: false, why: 'code' };
      }
      if (!this._pending || !this._pending.email) {
        Support._toast('⚠️ Primero pide el código de verificación.');
        return { ok: false, why: 'nopending' };
      }
      var self = this;
      var pend = this._pending;
      this._post('/appeal/verify', { email: pend.email, code: String(c).trim() }).then(function (res) {
        if (res && res.ok && res.id) {
          try {
            SAVE.appeal = { id: res.id, email: pend.email, name: pend.name, status: 'pending', ts: Date.now() };
            Support._persist();
          } catch (e) {}
          self._pending = null;
          Support._toast('✅ Datos verificados. Tu apelación está en revisión.');
          Support.render();
        } else {
          Support._toast('❌ Código incorrecto o vencido. Pide uno nuevo.');
        }
      });
      return { ok: true, sent: true };
    } catch (e) {
      Support._toast('⚠️ No se pudo verificar el código.');
      return { ok: false, why: 'err' };
    }
  },

  /* consulta el estado de una apelación pendiente */
  checkStatus: function () {
    try {
      if (!Support.isConnected()) return;
      if (typeof SAVE === 'undefined' || !SAVE.appeal || SAVE.appeal.status !== 'pending' || !SAVE.appeal.id) return;
      var id = SAVE.appeal.id;
      this._get('/appeal/status?id=' + encodeURIComponent(id)).then(function (res) {
        if (!res || !res.ok) return;
        if (res.status === 'approved') {
          try {
            if (typeof SafeWords !== 'undefined' && SafeWords && SafeWords._unmute) SafeWords._unmute();
            SAVE.appeal.status = 'approved';
            Support._persist();
          } catch (e) {}
          Support._toast('🎉 Apelación aprobada: ya puedes escribir.');
          Support.render();
        } else if (res.status === 'rejected') {
          try {
            SAVE.appeal.status = 'rejected';
            Support._persist();
          } catch (e) {}
          Support._toast('ℹ️ Tu apelación fue revisada y no se aprobó. Si necesitas ayuda, escríbenos por WhatsApp.');
          Support.render();
        }
      });
    } catch (e) {}
  },

  /* ---------- red ---------- */
  _url: function (path) {
    return String(Support.WORKER_URL).replace(/\/$/, '') + path;
  },
  _post: function (path, body) {
    return new Promise(function (resolve) {
      try {
        if (typeof fetch !== 'function') { resolve({ ok: false, error: 'sin conexión' }); return; }
        fetch(Support._url(path), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body || {}),
        }).then(function (r) { return r.json(); }).then(function (d) {
          resolve(d || { ok: false });
        }).catch(function () { resolve({ ok: false, error: 'red' }); });
      } catch (e) { resolve({ ok: false, error: 'err' }); }
    });
  },
  _get: function (path) {
    return new Promise(function (resolve) {
      try {
        if (typeof fetch !== 'function') { resolve({ ok: false, error: 'sin conexión' }); return; }
        fetch(Support._url(path), { method: 'GET' }).then(function (r) { return r.json(); }).then(function (d) {
          resolve(d || { ok: false });
        }).catch(function () { resolve({ ok: false, error: 'red' }); });
      } catch (e) { resolve({ ok: false, error: 'err' }); }
    });
  },
};

/* auto-init al cargar el documento (guardado: sin document no hace nada) */
try {
  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('DOMContentLoaded', function () {
      try { Support.init(); } catch (e) {}
    });
  }
} catch (e) {}

/* sin export: global por <script> (patrón del proyecto) */
