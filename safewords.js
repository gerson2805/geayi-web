/* ============================================================
   🛡️ SAFETWORDS — filtro de seguridad infantil ANTI-GROOMING
   (GEAYI — Obby Xtreme 3D)
   ------------------------------------------------------------
   PROTECCIÓN A MENORES. Siempre activo: no hay botón ni opción
   en la UI para apagarlo. Los niños no deben poder desactivarlo.

   - SafeWords.check(text) -> { ok:true } | { ok:false, reason }
     reason: 'encuentro' | 'fotos' | 'contacto' | 'sexual' |
             'coqueteo' | 'violencia' | 'secuestro'
   - SafeWords.censor(text) -> texto con lo bloqueado como ***
   - SafeWords.noteBlocked() -> registra un intento; 3 intentos en
     10 min = muteo de 5 min. SafeWords.isMuted() lo consulta.
   - SafeWords.warnFor(reason) -> mensaje claro para un niño.

   Detección: insensible a mayúsculas/tildes, colapsa letras
   separadas ("m a n d a f o t o"), junta frases sin espacios
   ("mandafoto"), normaliza leet ("f0t0"->"foto") y bloquea
   números de teléfono (7+ dígitos seguidos, con o sin separadores).

   Todo 100% original GEAYI. Solo listas de palabras para bloquear,
   sin descripciones gráficas. Todo con try/catch.
   ============================================================
   INTEGRACIÓN:
   1. index.html, antes de chat.js:  <script src="safewords.js"></script>
   2. chat.js ChatFriends.send(): filtrar al enviar (ya cableado).
   3. chat.js ChatFriends._renderLine(): censor al mostrar (ya cableado).
   4. online.js sendChat(): filtrar al enviar (ya cableado).
   5. online.js onChatMsg(): censor al recibir (ya cableado).
   ============================================================ */
'use strict';

/* ---------- listas (ya normalizadas: minúsculas, sin tildes) ---------- */
var SW_LISTS = {
  encuentro: [
    'vernos', 'nos vemos', 'nos encontramos', 'encuentro', 'encontrarnos',
    'cita', 'quedar', 'quedamos', 'direccion', 'donde vives',
    'tu casa', 'mi casa', 'ven a', 'te paso a buscar', 'paso por ti',
    'te recojo', 'recogerte', 'escapate', 'a escondidas',
    'sin que sepan tus papas', 'secreto entre nosotros',
    'te espero en', 'verte en persona', 'sal de tu casa', 'ven solo',
    'vente', 'estoy aqui', 'estoy aca',
    /* pedir la dirección: siempre se bloquea (dato personal) */
    'pasa tu direccion', 'dame tu direccion', 'pasame tu direccion',
    'tu calle', 'en que calle vives', 'numero de tu casa',
    'donde queda tu casa', 'tu ubicacion', 'pasa tu ubicacion',
    'pasame tu ubicacion', 'comparte tu ubicacion',
  ],
  fotos: [
    'manda foto', 'manda fotos', 'mandame foto', 'mandame fotos',
    'mandame una foto', 'foto tuya', 'fotos tuyas', 'tus fotos',
    'pasame fotos', 'pic', 'pics', 'desnudo', 'desnuda',
    'sin ropa', 'en ropa interior', 'videollamada hot', 'cam',
    'foto hot', 'foto sexy', 'foto desnudo',
  ],
  contacto: [
    'whatsapp', 'whats', 'instagram', 'tiktok', 'facebook', 'messenger',
    'telegram', 'snapchat', 'discord', 'numero de telefono',
    'escribeme', 'agregame', 'mi numero es', 'mi numero',
    'dame tu numero', 'pasa tu numero', 'pasame tu numero',
    'pasa tu whats', 'dame tu whats', 'tu facebook', 'tu instagram',
    'tu tiktok', 'tus redes', 'pasa tus redes', 'dame tus redes',
    'redes sociales',
    'te doy mi numero', 'mi insta', 'mi face', 'llamame', 'te llamo',
    'mi contacto', 'agregame en',
  ],
  sexual: [
    'sexo', 'sexual', 'porno', 'pornografia', 'xxx',
    'erotico', 'erotica', 'hacer el amor',
    'pene', 'vagina', 'tetas', 'nalgas', 'cojer', 'follar',
  ],
  /* Nadie debe coquetearle a niños en el chat */
  coqueteo: [
    'eres linda', 'eres lindo', 'eres hermosa', 'eres hermoso',
    'que guapa', 'que guapo', 'mi amor', 'amor', 'bebe',
    'corazon', 'mi vida', 'quieres ser mi novia', 'quieres ser mi novio',
    'se mi papa', 'se mi mama', 'papi', 'mami', 'casate conmigo',
    'te amo', 'te quiero mucho', 'estas sola', 'estas solo',
  ],
  /* Amenazas y violencia */
  violencia: [
    'mata', 'matalo', 'matala', 'te mato', 'los mato',
    'te voy a matar', 'voy a matarte',
    'pegale', 'golpea', 'golpealo', 'te pego', 'te voy a pegar',
    'amenaza', 'cuchillo', 'pistola', 'disparo', 'sangre', 'morir',
  ],
  /* Secuestro / llevarse a un niño: cero tolerancia */
  secuestro: [
    'secuestro', 'secuestrar', 'secuestrado', 'secuestrada',
    'secuestrame', 'secuestralo', 'secuestrala',
    'te voy a secuestrar', 'te secuestro', 'rapto', 'te rapto',
    'te voy a llevar', 'me los llevo', 'te llevo conmigo',
    'ven conmigo', 'vamonos de aqui', 'nos vamos lejos',
    'te llevo lejos', 'subete al carro', 'subete al coche',
    'subete a mi carro', 'entra al carro', 'entra al coche',
    'no le digas a nadie', 'nadie se va a enterar',
    'no se lo digas a tus papas', 'no se lo cuentes a nadie',
    'te escondo', 'escondete conmigo', 'esto queda entre nosotros',
    /* "estoy cerca de tu casa, ya te conozco" (pedido del dueño) */
    'estoy cerca de tu casa', 'cerca de tu casa', 'ya te conozco',
    'se donde vives', 'te he visto', 'te vi en', 'paso por tu casa',
    'estoy afuera', 'afuera de tu casa', 'te estoy viendo',
    'te estoy mirando', 'conozco tu casa',
  ],
  /* Datos de dinero: nadie debe pedirle cuentas o tarjetas a un niño */
  financiero: [
    'cuenta bancaria', 'cuenta de banco', 'numero de cuenta',
    'dame tu cuenta', 'pasame tu cuenta', 'pasa tu cuenta',
    'tu tarjeta', 'numero de tarjeta', 'dame tu tarjeta',
    'pasame tu tarjeta', 'clave bancaria', 'pin de tu tarjeta',
    'codigo de tu tarjeta', 'codigo de seguridad', 'cvv',
    'datos bancarios', 'cuanto dinero tienes', 'dame dinero',
  ],
};
var SW_CAT_ORDER = ['sexual', 'secuestro', 'violencia', 'fotos', 'encuentro', 'coqueteo', 'financiero', 'contacto'];

/* Excepciones: frases de JUGUETE (armas de espuma GEAYI) que NO se bloquean
   aunque contengan "pistola" o "dispara". */
var SW_ALLOW = [
  'pistola de agua', 'pistola de juguete',
  'dardo de espuma', 'dardos de espuma', 'dispara dardos',
  'lanzadardos', 'canon de espuma', 'espada de espuma', 'espada sonica',
];

/* ---------- normalización ---------- */
function _swFold(s) {
  s = String(s == null ? '' : s).toLowerCase();
  s = s.replace(/[áàäâ]/g, 'a').replace(/[éèëê]/g, 'e')
       .replace(/[íìïî]/g, 'i').replace(/[óòöô]/g, 'o')
       .replace(/[úùüû]/g, 'u').replace(/ñ/g, 'n');
  // leet / trucos comunes
  s = s.replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e')
       .replace(/4/g, 'a').replace(/5/g, 's').replace(/6/g, 'g')
       .replace(/7/g, 't').replace(/8/g, 'b').replace(/9/g, 'g')
       .replace(/@/g, 'a').replace(/\$/g, 's');
  return s;
}
/* Devuelve { spaced, map }: spaced = minúsculas, solo [a-z0-9 ],
   letras sueltas separadas colapsadas ("m a n d a"->"manda");
   map[i] = índice en el texto ORIGINAL del carácter spaced[i]. */
function _swNormalize(text) {
  var raw = String(text == null ? '' : text);
  var folded = _swFold(raw);
  var spaced = '', smap = [], prevSpace = true;
  var i, ch, isAl;
  for (i = 0; i < folded.length; i++) {
    ch = folded[i];
    isAl = (ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9');
    if (isAl) { spaced += ch; smap.push(i); prevSpace = false; }
    else if (!prevSpace) { spaced += ' '; smap.push(i); prevSpace = true; }
  }
  if (prevSpace && spaced.length) { spaced = spaced.slice(0, -1); smap.pop(); }
  // colapsar secuencias de letras sueltas: "m a n d a" -> "manda"
  var out = '', omap = [], last = 0, m;
  var re = /\b[a-z](?: [a-z])+\b/g;
  while ((m = re.exec(spaced))) {
    for (var j = last; j < m.index; j++) { out += spaced[j]; omap.push(smap[j]); }
    var letters = m[0].replace(/ /g, '');
    for (var k = 0; k < letters.length; k++) {
      out += letters[k];
      omap.push(smap[m.index + k * 2]); // letras en offsets pares de "x y z"
    }
    last = m.index + m[0].length;
  }
  for (var j2 = last; j2 < spaced.length; j2++) { out += spaced[j2]; omap.push(smap[j2]); }
  return { spaced: out, map: omap, raw: raw };
}
function _swEsc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

/* construye el patrón \b(...)\b para una lista de palabras.
   Los espacios son opcionales ( ? ): atrapa "estoy cerca",
   "estoycerca" (colapso de letras separadas) y "estoy  cerca". */
function _swPat(words) {
  var alts = [], seen = {};
  for (var w = 0; w < words.length; w++) {
    var ph = String(words[w]).toLowerCase().replace(/\s+/g, ' ').trim();
    if (!ph || seen[ph]) continue;
    seen[ph] = 1;
    var flex = ph.split(' ').map(_swEsc).join(' ?');
    alts.push(flex);
  }
  // más largas primero (para que censor prefiera la frase completa)
  alts.sort(function (a, b) { return b.length - a.length; });
  return '\\b(' + alts.join('|') + ')\\b';
}
/* ---------- riesgo de la conversación (filtro inteligente) ----------
   Si en la conversación alguien pidió datos (redes, número, cuenta),
   el filtro se pone ESTRICTO por 24 horas: las frases suaves
   ("voy a tu casa") también se bloquean. Sin riesgo, esas frases pasan. */
var SW_RISK_KEY = 'geayi_swrisk_v1';
var _swRisk = { dataAskAt: 0 };
(function _swRiskLoad() {
  try {
    if (typeof localStorage !== 'undefined') {
      var raw = localStorage.getItem(SW_RISK_KEY);
      if (raw) { var o = JSON.parse(raw); if (o && o.dataAskAt) _swRisk.dataAskAt = o.dataAskAt; }
    }
  } catch (e) {}
})();
function _swRiskSave() {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(SW_RISK_KEY, JSON.stringify(_swRisk));
  } catch (e) {}
}
function _swRisky() {
  try { return (Date.now() - (_swRisk.dataAskAt || 0)) < 24 * 3600 * 1000; }
  catch (e) { return false; }
}
function _swNoteRisk(reason) {
  try {
    if (reason === 'contacto' || reason === 'financiero') {
      _swRisk.dataAskAt = Date.now();
      _swRiskSave();
    }
  } catch (e) {}
}

/* Frases "suaves" de encuentro: solas NO se bloquean; se bloquean SOLO si la
   conversación es riesgosa (antes pidieron redes, número o cuenta).
   Lo peligroso de verdad (secuestro, fotos, contacto...) SIEMPRE se bloquea. */
var SW_SOFT = [
  'vernos', 'nos vemos', 'nos encontramos', 'encuentro', 'encontrarnos',
  'cita', 'quedar', 'quedamos',
  'tu casa', 'mi casa', 'ven a', 'vente', 'estoy aqui', 'estoy aca',
  'vamos a tu casa', 'vamos a mi casa', 'voy a tu casa', 'voy a mi casa',
];
/* Violencia "suave" (de juego): se perdona si hablan jugando
   ("te mato en el juego", "con mi lanzadardos").
   Lo duro (cuchillo, pistola, disparo, sangre) SIEMPRE se bloquea. */
var SW_VIOLENCE_SOFT = [
  'mata', 'matalo', 'matala', 'te mato', 'los mato',
  'te voy a matar', 'voy a matarte',
  'pegale', 'golpea', 'golpealo', 'te pego', 'te voy a pegar',
  'morir', 'amenaza',
];
/* Marcadores de que están jugando (ya normalizados: sin tildes) */
var SW_PLAY_MARKERS = [
  'en el juego', 'del juego', 'geayi', 'obby',
  'juguete', 'de juguete', 'jugando',
  'lanzadardos', 'dardos', 'espuma', 'pistola de agua',
];
/* ¿el mensaje habla de estar jugando? */
function _swPlayCtx(spaced) {
  try {
    for (var i = 0; i < SW_PLAY_MARKERS.length; i++) {
      var re = new RegExp('\\b' + _swEsc(SW_PLAY_MARKERS[i]) + '\\b');
      if (re.test(spaced)) return true;
    }
    return false;
  } catch (e) { return false; }
}
/* categorías con versión "dura": { categoria: [frases suaves] } */
var SW_HARD_MAP = { encuentro: SW_SOFT, violencia: SW_VIOLENCE_SOFT };

/* ---------- patrones por categoría (se construyen una vez) ---------- */
var SW_CATS = [];
var SW_ALLOW_RE_G = null;
(function _swBuild() {
  try {
    for (var c = 0; c < SW_CAT_ORDER.length; c++) {
      var id = SW_CAT_ORDER[c];
      var pat = _swPat(SW_LISTS[id] || []);
      var entry = { id: id, re: new RegExp(pat), reG: new RegExp(pat, 'g') };
      if (SW_HARD_MAP[id]) {
        // versión "dura": sin las frases suaves (contexto de juego / conversación no riesgosa)
        var softList = SW_HARD_MAP[id];
        var hardWords = (SW_LISTS[id] || []).filter(function (w) {
          var ph = String(w).toLowerCase().replace(/\s+/g, ' ').trim();
          return softList.indexOf(ph) === -1;
        });
        var hpat = _swPat(hardWords);
        entry.reHard = new RegExp(hpat);
        entry.reGHard = new RegExp(hpat, 'g');
      }
      SW_CATS.push(entry);
    }
    // patrones de excepción (juguete): se revisan antes de bloquear
    var aAlts = [], aSeen = {};
    for (var a = 0; a < SW_ALLOW.length; a++) {
      var ap = String(SW_ALLOW[a]).toLowerCase().replace(/\s+/g, ' ').trim();
      if (!ap || aSeen[ap]) continue;
      aSeen[ap] = 1;
      aAlts.push(_swEsc(ap));
      var asq = ap.replace(/ /g, '');
      if (asq !== ap && !aSeen[asq]) { aSeen[asq] = 1; aAlts.push(_swEsc(asq)); }
    }
    aAlts.sort(function (x, y) { return y.length - x.length; });
    SW_ALLOW_RE_G = new RegExp('\\b(' + aAlts.join('|') + ')\\b', 'g');
  } catch (e) { SW_CATS = []; }
})();

/* rangos [inicio, fin) en n.spaced cubiertos por frases de juguete */
function _swAllowRanges(n) {
  var ranges = [];
  try {
    if (!SW_ALLOW_RE_G) return ranges;
    SW_ALLOW_RE_G.lastIndex = 0;
    var m;
    while ((m = SW_ALLOW_RE_G.exec(n.spaced))) ranges.push([m.index, m.index + m[0].length]);
  } catch (e) {}
  return ranges;
}

/* ---------- teléfonos: 7+ dígitos (con o sin separadores) ---------- */
function _swPhoneRanges(raw) {
  var ranges = [];
  try {
    var re = /\d(?:[\d\s.\-()]*\d)?/g, m;
    while ((m = re.exec(raw))) {
      var digits = m[0].replace(/\D/g, '');
      if (digits.length >= 7) ranges.push([m.index, m.index + m[0].length]);
    }
  } catch (e) {}
  return ranges;
}

/* ---------- anti-reincidencia ---------- */
var _swHits = [];      // timestamps de intentos bloqueados
var _swMuteUntil = 0;  // timestamp hasta el que dura el muteo
var _swLastReason = null; // última razón de bloqueo (para apelaciones 🆘)
var _swMuteReason = null;      // motivo que causó el silencio actual (para el AVISO del porqué 📢)
var _swMuteJustStarted = false; // true solo justo cuando se activa el silencio (aviso grande una vez)
var SW_HIT_WINDOW = 10 * 60 * 1000;  // 10 minutos
var SW_MUTE_MS = 5 * 60 * 1000;      // 5 minutos
var SW_HIT_LIMIT = 3;

var SafeWords = {
  /* { ok:true } | { ok:false, reason } */
  check: function (text) {
    try {
      var n = _swNormalize(text);
      // enmascarar frases de juguete antes de revisar (no se bloquean)
      var masked = n.spaced;
      var am = _swAllowRanges(n);
      if (am.length) {
        var chars = masked.split('');
        for (var a = 0; a < am.length; a++)
          for (var i = am[a][0]; i < am[a][1]; i++) chars[i] = ' ';
        masked = chars.join('');
      }
      var riskyNow = _swRisky(); // ¿pidieron datos en la conversación? -> modo estricto
      var playNow = _swPlayCtx(n.spaced); // ¿están jugando? -> violencia suave se perdona (sin enmascarar juguetes)
      for (var c = 0; c < SW_CATS.length; c++) {
        var cat = SW_CATS[c];
        var useRe = cat.re;
        // "encuentro": las frases suaves solo se bloquean si la conversación es riesgosa
        if (cat.id === 'encuentro' && cat.reHard && !riskyNow) useRe = cat.reHard;
        // "violencia": la violencia suave se perdona si están jugando
        else if (cat.id === 'violencia' && cat.reHard && playNow) useRe = cat.reHard;
        useRe.lastIndex = 0;
        if (useRe.test(masked)) {
          var rsn = cat.id;
          _swLastReason = rsn; // 🆘 guardar la razón (para saber si se puede apelar)
          _swNoteRisk(rsn); // aprender: si pidieron datos, marcar la conversación
          return { ok: false, reason: rsn };
        }
      }
      if (_swPhoneRanges(n.raw).length) { _swLastReason = 'contacto'; _swNoteRisk('contacto'); return { ok: false, reason: 'contacto' }; }
      return { ok: true };
    } catch (e) { return { ok: true }; }
  },

  /* texto con lo bloqueado reemplazado por *** */
  censor: function (text) {
    var raw = String(text == null ? '' : text);
    if (!raw) return raw;
    try {
      var n = _swNormalize(raw);
      var blocked = [];
      for (var i = 0; i < raw.length; i++) blocked.push(false);
      // caracteres cubiertos por frases de juguete: nunca se marcan
      var allowed = [];
      for (var ai = 0; ai < raw.length; ai++) allowed.push(false);
      var ar = _swAllowRanges(n);
      for (var q = 0; q < ar.length; q++)
        for (var mi = ar[q][0]; mi < ar[q][1]; mi++) {
          var oi = n.map[mi];
          if (oi != null && oi >= 0 && oi < raw.length) allowed[oi] = true;
        }
      var mark = function (a, b) {
        for (var k = a; k < b && k < raw.length; k++)
          if (k >= 0 && !allowed[k]) blocked[k] = true;
      };
      var c, re, m;
      var riskyNow2 = _swRisky(); // conversación riesgosa: enmascarar también las frases suaves
      var playNow2 = _swPlayCtx(n.spaced); // jugando: no enmascarar violencia suave
      for (c = 0; c < SW_CATS.length; c++) {
        var cat2 = SW_CATS[c];
        re = cat2.reG;
        if (cat2.id === 'encuentro' && cat2.reGHard && !riskyNow2) re = cat2.reGHard;
        else if (cat2.id === 'violencia' && cat2.reGHard && playNow2) re = cat2.reGHard;
        re.lastIndex = 0;
        re.lastIndex = 0;
        while ((m = re.exec(n.spaced))) {
          var a = n.map[m.index];
          var b = n.map[m.index + m[0].length - 1] + 1;
          mark(a, b);
        }
      }
      var pr = _swPhoneRanges(raw);
      for (var p = 0; p < pr.length; p++) mark(pr[p][0], pr[p][1]);
      // unir huecos de ≤2 no-alfanuméricos entre zonas bloqueadas
      // ("m a n d a f o t o" queda todo como ***)
      var AL = /[a-zA-Z0-9]/;
      for (var s = 0; s < raw.length; s++) {
        if (!blocked[s]) continue;
        for (var e = s + 1; e < raw.length && e - s <= 3; e++) {
          if (blocked[e]) {
            for (var g = s + 1; g < e; g++) if (!AL.test(raw[g])) blocked[g] = true;
            break;
          }
        }
      }
      // reconstruir
      var out = '', k = 0;
      while (k < raw.length) {
        if (!blocked[k]) { out += raw[k]; k++; }
        else { out += '***'; while (k < raw.length && blocked[k]) k++; }
      }
      return out;
    } catch (e) { return raw; }
  },

  /* registra un intento bloqueado; activa muteo si toca */
  noteBlocked: function () {
    try {
      var now = Date.now();
      _swHits.push(now);
      var cut = now - SW_HIT_WINDOW;
      _swHits = _swHits.filter(function (t) { return t >= cut; });
      if (_swHits.length >= SW_HIT_LIMIT) {
        _swMuteUntil = now + SW_MUTE_MS;
        _swMuteReason = _swLastReason; // 📢 guardar el PORQUÉ del silencio
        _swMuteJustStarted = true;     // 📢 aviso grande la próxima vez que intente escribir
        /* 🆘 contador persistente de muteos (informativo para el panel del dueño) */
        try {
          if (typeof SAVE !== 'undefined' && SAVE) {
            SAVE.swMutes = (SAVE.swMutes || 0) + 1;
            if (typeof persist === 'function') persist();
          }
        } catch (e2) {}
      }
      return this.isMuted();
    } catch (e) { return false; }
  },
  isMuted: function () {
    try { return Date.now() < _swMuteUntil; } catch (e) { return false; }
  },
  muteRemainingSec: function () {
    try {
      var ms = _swMuteUntil - Date.now();
      return ms > 0 ? Math.ceil(ms / 1000) : 0;
    } catch (e) { return 0; }
  },

  /* 🆘 última razón de bloqueo (para saber si se puede apelar) */
  lastReason: function () {
    try { return _swLastReason || null; } catch (e) { return null; }
  },

  /* 🆘 quita el silencio (lo usa el perdón automático ⚡ y una
     apelación APROBADA por el dueño) */
  _unmute: function () {
    try { _swMuteUntil = 0; _swHits = []; } catch (e) {}
  },

  /* 🆘 ¿este tipo de bloqueo se puede apelar? Solo los LEVES.
     Los graves (secuestro, sexual, violencia, fotos) NUNCA se apelan. */
  appealableReason: function (r) {
    try {
      return r === 'contacto' || r === 'coqueteo' || r === 'encuentro' || r === 'financiero';
    } catch (e) { return false; }
  },

  /* 📢 explica el PORQUÉ del silencio en palabras simples para un niño.
     Siempre incluye el consejo de avisar a un adulto de confianza.
     Sin argumento usa el motivo del silencio actual. */
  muteWhy: function (r) {
    try {
      var reason = r || _swMuteReason || _swLastReason;
      if (reason === 'sexual' || reason === 'secuestro')
        return 'Te silenciamos por 5 minutos. ' + this.warnFor(reason); // tono serio
      var why = {
        contacto: 'intentaste compartir tu número o tus redes sociales',
        fotos: 'pediste fotos o videollamadas',
        encuentro: 'invitaste a verse en otro lugar o a escondidas',
        coqueteo: 'dijiste cosas de coqueteo que no se permiten',
        financiero: 'pediste datos de dinero, cuentas o tarjetas',
        violencia: 'amenazaste o hablaste de violencia',
      }[reason] || 'rompiste una regla de seguridad';
      return 'Te silenciamos por 5 minutos porque ' + why + '. El juego protege a los niños 🛡️. ' +
        'Y recuerda: si alguien te pidió hacer eso, cuéntaselo a un adulto de confianza.';
    } catch (e) {
      return 'Te silenciamos por 5 minutos por tu seguridad 🛡️. ' +
        'Si alguien te pidió hacer algo raro, cuéntaselo a un adulto de confianza.';
    }
  },

  /* 📢 ¿el silencio ACABA de iniciar? true una sola vez (para el aviso grande) */
  muteJustStarted: function () {
    try {
      if (_swMuteJustStarted) { _swMuteJustStarted = false; return true; }
      return false;
    } catch (e) { return false; }
  },

  /* 📢 AVISO GRANDE del silencio: "Silenciado por 5 minutos" + el PORQUÉ
     + consejo. Se muestra UNA vez justo cuando inicia el silencio. */
  showMuteAlert: function () {
    try {
      if (typeof document === 'undefined') return false;
      var old = document.getElementById('sw-mutealert');
      if (old && old.parentNode) old.parentNode.removeChild(old);
      var ov = document.createElement('div');
      ov.id = 'sw-mutealert';
      ov.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.72);padding:20px;';
      var box = document.createElement('div');
      box.style.cssText = 'background:#fff;border:6px solid #f90;border-radius:20px;max-width:420px;padding:28px 22px;text-align:center;';
      var t1 = document.createElement('div');
      t1.style.cssText = 'font-size:52px;margin-bottom:8px;';
      t1.textContent = '🔇';
      var t2 = document.createElement('div');
      t2.style.cssText = 'font-size:26px;font-weight:900;color:#b36b00;margin-bottom:12px;';
      t2.textContent = 'Silenciado por 5 minutos';
      var t3 = document.createElement('div');
      t3.style.cssText = 'font-size:18px;font-weight:600;color:#222;line-height:1.45;margin-bottom:10px;';
      t3.textContent = this.muteWhy();
      var t4 = document.createElement('div');
      t4.style.cssText = 'font-size:16px;font-weight:700;color:#0a7;margin-bottom:18px;';
      t4.textContent = '⏳ Cuando pasen los 5 minutos podrás escribir de nuevo. ¡Juega limpio! 🎮';
      var btn = document.createElement('button');
      btn.style.cssText = 'font-size:20px;font-weight:900;padding:14px 26px;border:none;border-radius:14px;background:#0a0;color:#fff;cursor:pointer;';
      btn.textContent = '✅ ENTENDIDO';
      btn.addEventListener('click', function () {
        try { if (ov.parentNode) ov.parentNode.removeChild(ov); } catch (e) {}
      });
      box.appendChild(t1); box.appendChild(t2); box.appendChild(t3); box.appendChild(t4); box.appendChild(btn);
      ov.appendChild(box);
      document.body.appendChild(ov);
      return true;
    } catch (e) { return false; }
  },

  /* mensaje claro para un niño, según la razón del bloqueo */
  warnFor: function (reason) {
    if (reason === 'encuentro' && _swRisky())
      return '⚠️ Bloqueado por seguridad: esta persona ya te pidió tus datos antes. No le respondas y cuéntaselo a un adulto de confianza.';
    var msgs = {
      encuentro: '⚠️ Bloqueado por seguridad: nadie debe invitarte a verte en otro lugar ni a escondidas. Si alguien te lo pide, cuéntaselo a un adulto de confianza.',
      fotos: '⚠️ Bloqueado por seguridad: nadie debe pedirte fotos ni videollamadas. Cuéntaselo a un adulto de confianza.',
      contacto: '⚠️ Bloqueado por seguridad: no compartas tu número ni tus redes sociales con nadie del juego. Cuéntaselo a un adulto de confianza.',
      sexual: '⚠️ Bloqueado por seguridad: ese mensaje no está permitido en el juego. Cuéntaselo a un adulto de confianza.',
      coqueteo: '⚠️ Bloqueado por seguridad: nadie debe coquetearte ni decirte esas cosas en el juego. Cuéntaselo a un adulto de confianza.',
      violencia: '⚠️ Bloqueado por seguridad: las amenazas y la violencia no están permitidas en el juego. Cuéntaselo a un adulto de confianza.',
      secuestro: '⚠️ Bloqueado por seguridad: nadie debe intentar llevarte a ningún lado ni pedirte que te escondas. Cuéntaselo YA a un adulto de confianza.',
      financiero: '💳 Bloqueado por seguridad: nunca compartas datos de dinero, cuentas o tarjetas con nadie. Avísale a un adulto de confianza.',
    };
    return msgs[reason] || '⚠️ Bloqueado por seguridad: ese mensaje no está permitido. Cuéntaselo a un adulto de confianza.';
  },

  _reset: function () { // solo tests
    _swHits = []; _swMuteUntil = 0; _swLastReason = null;
    _swMuteReason = null; _swMuteJustStarted = false;
    _swRisk.dataAskAt = 0; _swRiskSave();
  },

  /* ¿la conversación está marcada como riesgosa? (pidieron datos) */
  isRisky: function () { return _swRisky(); },

  /* ¿Es una razón crítica? (secuestro: alerta GRANDE, no solo toast) */
  isCritical: function (reason) {
    try { return reason === 'secuestro'; } catch (e) { return false; }
  },

  /* Alerta grande en pantalla: "avísale a tus papás enseguida".
     Se muestra sola, con cooldown de 60s para no spamear. */
  _bigAlertAt: 0,
  showBigAlert: function () {
    try {
      if (typeof document === 'undefined') return false;
      var now = Date.now();
      if (now - this._bigAlertAt < 60000) return false; // cooldown 60s
      this._bigAlertAt = now;
      var old = document.getElementById('sw-bigalert');
      if (old && old.parentNode) old.parentNode.removeChild(old);
      var ov = document.createElement('div');
      ov.id = 'sw-bigalert';
      ov.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(120,0,0,.88);padding:20px;';
      var box = document.createElement('div');
      box.style.cssText = 'background:#fff;border:6px solid #d00;border-radius:20px;max-width:420px;padding:28px 22px;text-align:center;animation:swpulse 1s infinite;';
      var st = document.createElement('style');
      st.textContent = '@keyframes swpulse{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}';
      box.appendChild(st);
      var t1 = document.createElement('div');
      t1.style.cssText = 'font-size:52px;margin-bottom:8px;';
      t1.textContent = '🚨';
      var t2 = document.createElement('div');
      t2.style.cssText = 'font-size:30px;font-weight:900;color:#c00;margin-bottom:12px;';
      t2.textContent = '¡ALERTA!';
      var t3 = document.createElement('div');
      t3.style.cssText = 'font-size:19px;font-weight:700;color:#222;line-height:1.4;margin-bottom:8px;';
      t3.textContent = 'Si alguien dice que está cerca de tu casa o que te conoce, NO le respondas.';
      var t4 = document.createElement('div');
      t4.style.cssText = 'font-size:22px;font-weight:900;color:#c00;margin-bottom:18px;';
      t4.textContent = 'AVÍSALE A TUS PAPÁS ENSEGUIDA';
      var btn = document.createElement('button');
      btn.style.cssText = 'font-size:20px;font-weight:900;padding:14px 26px;border:none;border-radius:14px;background:#0a0;color:#fff;cursor:pointer;';
      btn.textContent = '✅ ENTENDIDO';
      btn.addEventListener('click', function () {
        try { if (ov.parentNode) ov.parentNode.removeChild(ov); } catch (e) {}
      });
      box.appendChild(t1); box.appendChild(t2); box.appendChild(t3); box.appendChild(t4); box.appendChild(btn);
      ov.appendChild(box);
      document.body.appendChild(ov);
      return true;
    } catch (e) { return false; }
  },
  /* ---------- overlay informativo genérico (azul, no alarmante) ---------- */
  _swInfoOverlay: function (id, emoji, title, bodyHtml, btnText) {
    try {
      if (typeof document === 'undefined') return false;
      var old = document.getElementById(id);
      if (old && old.parentNode) old.parentNode.removeChild(old);
      var ov = document.createElement('div');
      ov.id = id;
      ov.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(4,10,40,.82);padding:18px;';
      var box = document.createElement('div');
      box.style.cssText = 'background:#fff;border:5px solid #2456d6;border-radius:18px;max-width:400px;width:100%;max-height:84vh;overflow-y:auto;padding:22px 18px;text-align:center;';
      var e1 = document.createElement('div');
      e1.style.cssText = 'font-size:44px;margin-bottom:6px;';
      e1.textContent = emoji;
      var t = document.createElement('div');
      t.style.cssText = 'font-size:22px;font-weight:900;color:#123;margin-bottom:10px;';
      t.textContent = title;
      var body = document.createElement('div');
      body.style.cssText = 'font-size:15px;color:#333;line-height:1.5;margin-bottom:16px;text-align:left;';
      body.innerHTML = bodyHtml;
      var btn = document.createElement('button');
      btn.style.cssText = 'font-size:18px;font-weight:900;padding:12px 26px;border:none;border-radius:12px;background:#2456d6;color:#fff;cursor:pointer;';
      btn.textContent = btnText || '✅ ENTENDIDO';
      btn.addEventListener('click', function () {
        try { if (ov.parentNode) ov.parentNode.removeChild(ov); } catch (e) {}
      });
      ov.addEventListener('click', function (ev) {
        try { if (ev.target === ov && ov.parentNode) ov.parentNode.removeChild(ov); } catch (e) {}
      });
      box.appendChild(e1); box.appendChild(t); box.appendChild(body); box.appendChild(btn);
      ov.appendChild(box);
      document.body.appendChild(ov);
      return true;
    } catch (e) { return false; }
  },
  /* Reglas del chat en lenguaje de niño: para que sepan QUÉ no está permitido antes de escribir */
  rulesList: function () {
    return [
      '🚫 No des tu número de teléfono ni tu WhatsApp.',
      '🚫 No des tus redes sociales (Facebook, Instagram, TikTok).',
      '🏠 No digas dónde vives ni tu dirección.',
      '📸 No mandes fotos ni hagas videollamadas con desconocidos.',
      '💳 Nunca hables de dinero, cuentas bancarias o tarjetas.',
      '🙅 Si alguien te invita a verte a escondidas o te pide no contarle a tus papás, avísales ENSEGUIDA.',
      '❓ Si no sabes si algo está mal, pregúntale a un adulto de confianza.',
    ];
  },
  showRules: function () {
    try {
      var lis = this.rulesList().map(function (r) {
        return '<li style="margin-bottom:8px;">' + r.replace(/</g, '&lt;') + '</li>';
      }).join('');
      return this._swInfoOverlay('sw-rules', '🛡️', 'REGLAS DEL CHAT',
        '<ol style="margin:0;padding-left:20px;">' + lis + '</ol>' +
        '<p style="margin-top:10px;text-align:center;">💬 Si un mensaje no se envía, es porque rompió una regla.<br>¡Escríbelo de otra forma! ✏️</p>');
    } catch (e) { return false; }
  },
  /* El niño ve POR QUÉ no se envió su mensaje (con lo malo tapado con ***) */
  showBlocked: function (reason, text) {
    try {
      var masked = '';
      try { masked = this.censor(String(text == null ? '' : text)); } catch (e) { masked = '***'; }
      masked = masked.replace(/</g, '&lt;');
      var why = String(this.warnFor(reason) || '').replace(/</g, '&lt;');
      return this._swInfoOverlay('sw-blocked', '🛡️', 'TU MENSAJE NO SE ENVIÓ',
        '<p style="text-align:center;background:#f2f5ff;border-radius:10px;padding:10px;font-weight:700;">“' + masked + '”</p>' +
        '<p>' + why + '</p>' +
        '<p style="text-align:center;">💡 <b>Tip:</b> escribe tu mensaje con otras palabras. ✏️</p>');
    } catch (e) { return false; }
  },
};

/* sin export: global por <script> (patrón del proyecto) */
