/* Prueba de support.js (Ayuda + Apelaciones con datos verificados):
   - FAQ con al menos 8 preguntas
   - SafeWords.lastReason() guarda la razón del bloqueo
   - appealableReason(): leves apelables / graves NO apelables
   - canAppeal(): true solo si hay muteo + razón leve
   - SafeWords._unmute() quita el muteo (apelación aprobada)
   - validaciones: email, código de 6 dígitos, nombre real
   - sin WORKER_URL la apelación va a SAVE.appealOutbox
   Sigue el patrón de safewordstest.js (stubs THREE/DOM). */
const fs = require('fs'), vm = require('vm');
require(__dirname + '/stubs.js');
const DIR = '/home/hatch/workspace/your_files/obby-3d/';
const FILES = ['state.js', 'safewords.js', 'support.js'];
for (const f of FILES) {
  try {
    vm.runInContext(fs.readFileSync(DIR + f, 'utf8'), sandbox, { filename: f });
  } catch (e) {
    console.log('  ✗ ERROR cargando ' + f + ': ' + e.message);
    process.exit(1);
  }
}
console.log('carga: ' + FILES.length + ' archivos sin errores');

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; } else { fail++; console.log('  ✗ FAIL:', name); }
}

/* ================= API ================= */
ok(R(`typeof Support==='object'`), 'api: Support existe');
ok(R(`typeof Appeals==='object'`), 'api: Appeals existe');
ok(R(`Support.FAQ.length >= 8`), 'faq: al menos 8 preguntas (' + R(`Support.FAQ.length`) + ')');
ok(R(`Support.FAQ.every(f => f.q && f.a)`), 'faq: todas tienen pregunta y respuesta');
ok(R(`Support.isConnected() === false`), 'config: sin WORKER_URL no hay conexión');
ok(R(`Support.CONTACT.whatsapp === '12396519974'`), 'config: whatsapp del dueño');

/* ================= lastReason ================= */
R(`SafeWords._reset()`);
ok(R(`SafeWords.lastReason() === null`), 'lastReason: null al inicio');
R(`SafeWords.check('mi numero es 2396519974')`);
ok(R(`SafeWords.lastReason() === 'contacto'`), 'lastReason: guarda la razón (teléfono -> contacto)');
R(`SafeWords.check('te voy a secuestrar')`);
ok(R(`SafeWords.lastReason() === 'secuestro'`), 'lastReason: se actualiza (secuestro)');
R(`SafeWords._reset()`);
ok(R(`SafeWords.lastReason() === null`), 'lastReason: _reset la limpia');

/* ================= appealableReason ================= */
ok(R(`SafeWords.appealableReason('contacto') === true`), 'apelable: contacto sí');
ok(R(`SafeWords.appealableReason('coqueteo') === true`), 'apelable: coqueteo sí');
ok(R(`SafeWords.appealableReason('encuentro') === true`), 'apelable: encuentro sí');
ok(R(`SafeWords.appealableReason('financiero') === true`), 'apelable: financiero sí');
ok(R(`SafeWords.appealableReason('secuestro') === false`), 'NO apelable: secuestro');
ok(R(`SafeWords.appealableReason('sexual') === false`), 'NO apelable: sexual');
ok(R(`SafeWords.appealableReason('violencia') === false`), 'NO apelable: violencia');
ok(R(`SafeWords.appealableReason('fotos') === false`), 'NO apelable: fotos');
ok(R(`SafeWords.appealableReason('otra') === false`), 'NO apelable: razón desconocida');

/* ================= canAppeal + muteo ================= */
R(`SafeWords._reset()`);
ok(R(`Appeals.canAppeal() === false`), 'canAppeal: false sin muteo');
R(`SafeWords.check('agregame en instagram'); SafeWords.noteBlocked()`);
R(`SafeWords.check('agregame en instagram'); SafeWords.noteBlocked()`);
R(`SafeWords.check('agregame en instagram'); SafeWords.noteBlocked()`);
ok(R(`SafeWords.isMuted() === true`), 'muteo: 3 intentos -> silenciado');
ok(R(`Appeals.canAppeal() === true`), 'canAppeal: true con muteo leve (contacto)');
R(`SafeWords._unmute()`);
ok(R(`SafeWords.isMuted() === false`), '_unmute: quita el silencio');
ok(R(`Appeals.canAppeal() === false`), 'canAppeal: false después de _unmute');

/* razón grave: muteado pero NO apelable */
R(`SafeWords._reset()`);
R(`SafeWords.check('te voy a secuestrar'); SafeWords.noteBlocked()`);
R(`SafeWords.check('te voy a secuestrar'); SafeWords.noteBlocked()`);
R(`SafeWords.check('te voy a secuestrar'); SafeWords.noteBlocked()`);
ok(R(`SafeWords.isMuted() === true`), 'muteo grave: también silencia');
ok(R(`Appeals.canAppeal() === false`), 'canAppeal: false con razón grave (secuestro)');
R(`SafeWords._reset()`);

/* ================= validaciones ================= */
ok(R(`Appeals.validEmail('juan@test.com') === true`), 'email válido pasa');
ok(R(`Appeals.validEmail('no-es-email') === false`), 'email sin @ se rechaza');
ok(R(`Appeals.validEmail('a@b') === false`), 'email sin dominio se rechaza');
ok(R(`Appeals.validEmail('') === false`), 'email vacío se rechaza');
ok(R(`Appeals.validName('Juan Lopez') === true`), 'nombre real pasa');
ok(R(`Appeals.validName('Al') === false`), 'nombre de 2 letras se rechaza');
ok(R(`Appeals.validCode('123456') === true`), 'código de 6 dígitos pasa');
ok(R(`Appeals.validCode('12345') === false`), 'código de 5 dígitos se rechaza');
ok(R(`Appeals.validCode('abcdef') === false`), 'código con letras se rechaza');

const GOOD = { name: 'Juan Lopez', email: 'juan@test.com', reason: 'contacto', msg: 'solo saludaba', consent: true };
ok(R(`Appeals.validate(${JSON.stringify(GOOD)}).ok === true`), 'validate: datos buenos pasan');
ok(R(`Appeals.validate(${JSON.stringify(Object.assign({}, GOOD, { name: 'Al' }))}).why === 'name'`), 'validate: nombre corto -> name');
ok(R(`Appeals.validate(${JSON.stringify(Object.assign({}, GOOD, { email: 'mal' }))}).why === 'email'`), 'validate: email malo -> email');
ok(R(`Appeals.validate(${JSON.stringify(Object.assign({}, GOOD, { reason: 'secuestro' }))}).why === 'reason'`), 'validate: razón grave -> reason');
ok(R(`Appeals.validate(${JSON.stringify(Object.assign({}, GOOD, { consent: false }))}).why === 'consent'`), 'validate: sin permiso -> consent');

/* ================= bandeja de salida (sin worker) ================= */
R(`SAVE.appealOutbox = []`);
const sub = R(`JSON.stringify(Appeals.submit(${JSON.stringify(GOOD)}))`);
ok(JSON.parse(sub).ok === true && JSON.parse(sub).queued === true, 'submit: sin WORKER_URL queda en cola');
ok(R(`SAVE.appealOutbox.length === 1`), 'outbox: la apelación se guardó en SAVE.appealOutbox');
ok(R(`SAVE.appealOutbox[0].email === 'juan@test.com'`), 'outbox: conserva el email');
const bad = R(`JSON.stringify(Appeals.submit(${JSON.stringify(Object.assign({}, GOOD, { email: 'mal' }))}))`);
ok(JSON.parse(bad).ok === false, 'submit: email inválido no se guarda');
ok(R(`SAVE.appealOutbox.length === 1`), 'outbox: no crece con datos inválidos');

/* ================= NIVEL 1: perdón automático instantáneo ⚡ ================= */
R(`SafeWords._reset(); SAVE.appealAutoUsed = false; SAVE.swMutes = 0;`);
ok(typeof R(`Appeals.tryInstantResolve`) === 'function', 'nivel1: tryInstantResolve existe');
ok(typeof R(`Appeals._forgiveMsg`) === 'function', 'nivel1: _forgiveMsg existe');

var rNoMute = JSON.parse(R(`JSON.stringify(Appeals.tryInstantResolve())`));
ok(rNoMute.ok === false && rNoMute.why === 'nomute', 'nivel1: sin muteo no perdona');

/* mute leve, primera vez -> perdón instantáneo */
R(`SafeWords.check('agregame en instagram'); SafeWords.noteBlocked()`);
R(`SafeWords.check('agregame en instagram'); SafeWords.noteBlocked()`);
R(`SafeWords.check('agregame en instagram'); SafeWords.noteBlocked()`);
ok(R(`SafeWords.isMuted() === true`), 'nivel1: hay muteo leve activo');
var rForgive = JSON.parse(R(`JSON.stringify(Appeals.tryInstantResolve())`));
ok(rForgive.ok === true, 'nivel1: perdón instantáneo en motivo leve, primera vez');
ok(R(`SafeWords.isMuted() === false`), 'nivel1: el perdón quita el silencio');
ok(R(`SAVE.appealAutoUsed === true`), 'nivel1: el perdón queda marcado como usado');
ok(R(`Appeals.canAppeal() === false`), 'nivel1: tras perdonar ya no hay nada que apelar');

/* segunda vez: ya usó su perdón -> va a manual (nivel 2) */
R(`SafeWords.check('agregame en instagram'); SafeWords.noteBlocked()`);
R(`SafeWords.check('agregame en instagram'); SafeWords.noteBlocked()`);
R(`SafeWords.check('agregame en instagram'); SafeWords.noteBlocked()`);
ok(R(`SafeWords.isMuted() === true`), 'nivel1: segundo muteo leve activo');
var rUsed = JSON.parse(R(`JSON.stringify(Appeals.tryInstantResolve())`));
ok(rUsed.ok === false && rUsed.why === 'used', 'nivel1: NO se perdona dos veces (va a manual)');
ok(R(`SafeWords.isMuted() === true`), 'nivel1: el silencio sigue hasta apelar manual');
R(`SafeWords._reset(); SAVE.appealAutoUsed = false;`);

/* motivos graves: jamás se perdonan */
var graves = ['te voy a secuestrar', 'porno', 'te mato', 'manda foto'];
var gravesOk = true;
for (var gi = 0; gi < graves.length; gi++) {
  R(`SafeWords._reset()`);
  R(`SafeWords.check('` + graves[gi] + `'); SafeWords.noteBlocked()`);
  R(`SafeWords.check('` + graves[gi] + `'); SafeWords.noteBlocked()`);
  R(`SafeWords.check('` + graves[gi] + `'); SafeWords.noteBlocked()`);
  var rg = JSON.parse(R(`JSON.stringify(Appeals.tryInstantResolve())`));
  if (!(rg.ok === false && rg.why === 'notappealable' && R(`SafeWords.isMuted() === true`))) gravesOk = false;
}
ok(gravesOk, 'nivel1: motivos graves jamás se perdonan (4/4)');
R(`SafeWords._reset();`);

/* contador persistente de muteos: cada activación suma 1 */
R(`SAVE.swMutes = 0; SafeWords._reset();`);
R(`SafeWords.check('agregame en instagram'); SafeWords.noteBlocked()`);
R(`SafeWords.check('agregame en instagram'); SafeWords.noteBlocked()`);
R(`SafeWords.check('agregame en instagram'); SafeWords.noteBlocked()`);
ok(R(`SAVE.swMutes === 1`), 'swMutes: un muteo cuenta 1');
R(`SafeWords._reset();`); /* limpia intentos, conserva el contador */
R(`SafeWords.check('agregame en instagram'); SafeWords.noteBlocked()`);
R(`SafeWords.check('agregame en instagram'); SafeWords.noteBlocked()`);
R(`SafeWords.check('agregame en instagram'); SafeWords.noteBlocked()`);
ok(R(`SAVE.swMutes === 2`), 'swMutes: dos muteos cuentan 2');
R(`SafeWords._reset(); SAVE.appealAutoUsed = false;`);

/* mensaje educativo: menciona la razón en palabras simples */
ok(R(`Appeals._forgiveMsg('contacto').body.indexOf('redes sociales') !== -1`), 'msg: contacto explica lo de las redes (consistente con muteWhy)');
ok(R(`Appeals._forgiveMsg('financiero').body.indexOf('dinero') !== -1`), 'msg: financiero explica lo del dinero');
ok(R(`Appeals._forgiveMsg('coqueteo').body.indexOf('coqueteo') !== -1`), 'msg: coqueteo se nombra claro');
ok(R(`Appeals._forgiveMsg('encuentro').body.indexOf('UNA vez') !== -1`), 'msg: avisa que el perdón es una sola vez');

/* ============ 📢 muteWhy(): AVISO DEL PORQUÉ ============ */
var _mwPhrases = {
  contacto: 'redes sociales',
  fotos: 'fotos o videollamadas',
  encuentro: 'a escondidas',
  coqueteo: 'coqueteo',
  financiero: 'dinero',
  violencia: 'violencia',
  sexual: 'adulto de confianza',
  secuestro: 'adulto de confianza',
};
var _mwProbes = {
  contacto: 'agregame en instagram',
  fotos: 'manda foto',
  encuentro: 'dame tu direccion',
  coqueteo: 'mi amor',
  financiero: 'dame tu tarjeta',
  violencia: 'te mato',
  sexual: 'porno',
  secuestro: 'secuestro',
};
var _mwOk = true;
Object.keys(_mwProbes).forEach(function (reason) {
  R(`SafeWords._reset();`);
  var chk = JSON.parse(R(`JSON.stringify(SafeWords.check('` + _mwProbes[reason] + `'))`));
  if (!chk || chk.ok !== false || chk.reason !== reason) {
    _mwOk = false; console.log('  ✗ FAIL: la sonda no bloquea como ' + reason + ': ' + _mwProbes[reason]); return;
  }
  R(`SafeWords.noteBlocked(); SafeWords.noteBlocked(); SafeWords.noteBlocked()`);
  var why = String(R(`SafeWords.muteWhy()`));
  if (!(why && why.length > 0)) { _mwOk = false; console.log('  ✗ FAIL: muteWhy(' + reason + ') vacío'); }
  else {
    if (why.indexOf(_mwPhrases[reason]) === -1) { _mwOk = false; console.log('  ✗ FAIL: muteWhy(' + reason + ') sin el porqué: ' + why.slice(0, 70)); }
    if (why.indexOf('5 minutos') === -1) { _mwOk = false; console.log('  ✗ FAIL: muteWhy(' + reason + ') sin "5 minutos"'); }
    if (why.indexOf('adulto de confianza') === -1) { _mwOk = false; console.log('  ✗ FAIL: muteWhy(' + reason + ') sin consejo de adulto'); }
  }
});
ok(_mwOk, 'muteWhy: porqué + 5 minutos + consejo para las 8 razones');
R(`SafeWords._reset();`);

/* al activarse el silencio queda registrado el motivo correcto */
R(`SafeWords._reset();`);
R(`SafeWords.check('manda foto'); SafeWords.noteBlocked()`);
R(`SafeWords.check('manda foto'); SafeWords.noteBlocked()`);
R(`SafeWords.check('manda foto'); SafeWords.noteBlocked()`);
ok(R(`SafeWords.isMuted() === true`), 'why: silencio activo tras 3 intentos');
ok(R(`SafeWords.muteWhy().indexOf('fotos o videollamadas') !== -1`), 'why: el motivo registrado es el correcto (fotos)');
R(`SafeWords._reset();`);

/* muteJustStarted: true una sola vez, justo al iniciar el silencio */
R(`SafeWords._reset();`);
R(`SafeWords.check('agregame en instagram'); SafeWords.noteBlocked()`);
R(`SafeWords.check('agregame en instagram'); SafeWords.noteBlocked()`);
ok(R(`SafeWords.muteJustStarted() === false`), 'justStarted: false antes de activar el silencio');
R(`SafeWords.check('agregame en instagram'); SafeWords.noteBlocked()`);
ok(R(`SafeWords.muteJustStarted() === true`), 'justStarted: true justo al iniciar el silencio');
ok(R(`SafeWords.muteJustStarted() === false`), 'justStarted: se consume (una sola vez)');
R(`SafeWords._reset();`);

/* showMuteAlert: aviso grande con el porqué (stubs DOM) */
R(`SafeWords._reset();`);
R(`SafeWords.check('manda foto'); SafeWords.noteBlocked(); SafeWords.noteBlocked(); SafeWords.noteBlocked()`);
ok(R(`SafeWords.showMuteAlert() === true`), 'aviso: showMuteAlert muestra el aviso grande');
ok(R(`SafeWords._reset(), true`), 'reset: limpia el estado del silencio');

console.log('\n' + pass + '/' + (pass + fail) + ' OK');
if (fail) process.exit(1);
