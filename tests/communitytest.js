/* Pruebas de community.js: comunidad y retención (stubs THREE/DOM). */
const fs = require('fs'), vm = require('vm');
require(__dirname + '/stubs.js');
const DIR = '/home/hatch/workspace/your_files/obby-3d/';
const FILES = ['state.js', 'i18n.js', 'audio.js', 'family.js',
  'online.js', 'trophies.js', 'community.js'];
for (const f of FILES) {
  try {
    vm.runInContext(fs.readFileSync(DIR + f, 'utf8'), global.sandbox, { filename: f });
  } catch (e) {
    console.log('  ✗ ERROR cargando ' + f + ': ' + e.message);
    process.exit(1);
  }
}
console.log('carga: 7 archivos sin errores');

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; } else { fail++; console.log('  ✗ FAIL:', name); }
}

/* ---------- base ---------- */
ok(R(`typeof Community !== 'undefined'`), 'Community existe');
ok(R(`typeof Voz !== 'undefined'`), 'Voz existe');
try { R(`Community.init()`); ok(true, 'Community.init() no falla'); }
catch (e) { ok(false, 'Community.init() → ' + e.message); }

/* ---------- Voz (sin speechSynthesis: no debe romper ni hablar) ---------- */
ok(R(`Voz.hablar('hola') === false`), 'Voz.hablar sin TTS ni interacción → false, sin error');
ok(R(`Voz._puede() === false`), 'Voz._puede() es false antes de interactuar');
ok(R(`Voz.narrarLogro('X') === false`), 'narrarLogro no falla sin TTS');
const v0 = R(`Voz.on`);
R(`Voz.toggle()`);
ok(R(`Voz.on === ${!v0}`), 'Voz.toggle() cambia el estado');
R(`Voz.toggle()`); // volver a ON → aquí se otorga el logro
ok(R(`Community.tieneLogro('voz')`), 'activar la voz otorga logro "voz"');

/* ---------- logros: delegación a Trophy + logros propios ---------- */
const c0 = R(`SAVE.coins`);
ok(R(`Community.grantLogro('w1') === true`), 'grantLogro delega trofeo nativo w1 a Trophy.unlock');
ok(R(`Trophy.has('w1')`), 'w1 quedó desbloqueado en Trophy');
ok(R(`Community.grantLogro('w1') === false`), 'trofeo nativo no se otorga dos veces');
ok(R(`Community.grantLogro('amigo1') === true`), 'grantLogro otorga logro de comunidad amigo1');
ok(R(`Community.tieneLogro('amigo1')`), 'tieneLogro(amigo1) es true');
ok(R(`Community.grantLogro('amigo1') === false`), 'logro de comunidad no se repite');
ok(R(`SAVE.coins === ${c0} + 25`), 'monedas sumadas por logro amigo1 (+25; voz +10 ya estaba en c0)');
ok(R(`Community.grantLogro('noexiste') === false`), 'id desconocido → false');
ok(R(`Community.listLogros().length >= 12`), '12+ logros en el catálogo');
ok(R(`Community.listLogros().every(l => l.medalla==='🥇'||l.medalla==='🥈'||l.medalla==='🥉')`), 'todos los logros tienen medalla 🥇🥈🥉');

/* ---------- regalos: código + canje ---------- */
R(`SAVE.ownedHats = ['none','cap']; SAVE.ownedTrails = ['none','fire']; SAVE.pet = 'dog';`);
ok(R(`Community.itemsRegalables().length === 3`), 'itemsRegalables: gorra + estela + mascota');
const code = R(`Community.crearCodigoRegalo('hat','cap')`);
ok(typeof code === 'string' && code.indexOf('GEAYI-') === 0, 'crearCodigoRegalo genera GEAYI-XXXX (' + code + ')');
ok(R(`Community.crearCodigoRegalo('hat','crown') === null`), 'no se puede regalar lo que no se posee');
const r1 = R(`JSON.stringify(Community.canjear(${JSON.stringify(code)}))`);
const p1 = JSON.parse(r1);
ok(p1.ok === true, 'canjear código válido → ok (' + p1.mensaje + ')');
ok(R(`SAVE.ownedHats.indexOf('cap') !== -1`), 'la gorra quedó en ownedHats');
ok(R(`Community.canjear('XYZ').ok === false`), 'código sin prefijo → inválido');
ok(R(`Community.canjear('GEAYI-!!!').ok === false`), 'código dañado → inválido');
ok(R(`Community.canjear('GEAYI-' + 'AAAA').ok === false`), 'payload inválido → inválido');
/* canjear un objeto NUEVO (construido a mano, válido pero no poseído) otorga regalo1 */
const codeNuevo = R(`'GEAYI-' + _b64encode(JSON.stringify({t:'hat',i:'tophat'}))`);
const r2 = R(`JSON.stringify(Community.canjear(${JSON.stringify(codeNuevo)}))`);
ok(JSON.parse(r2).ok === true, 'canjear objeto nuevo → ok');
ok(R(`SAVE.ownedHats.indexOf('tophat') !== -1`), 'la gorra nueva quedó en ownedHats');
ok(R(`Community.tieneLogro('regalo1')`), 'canjear otorga logro "regalo1"');
/* roundtrip base64 propio */
ok(R(`_b64decode(_b64encode('{"t":"pet","i":"dog"}')) === '{"t":"pet","i":"dog"}'`), 'base64 propio roundtrip OK');

/* ---------- concurso ---------- */
ok(R(`Community.iniciarConcurso('🏰 Castillo de prueba') === true`), 'iniciarConcurso arranca (10 min)');
ok(R(`Community.concurso.activo && Community.concurso.tema === '🏰 Castillo de prueba'`), 'tema guardado');
ok(R(`Community.tiempoRestante() > 9*60*1000`), 'temporizador ≈ 10 minutos');
R(`Community.registrarConstruccion('Mi torre')`);
ok(R(`Community.concurso.construcciones.length === 1`), 'registrarConstruccion guarda la obra');
ok(R(`Community.tieneLogro('constructor1')`), 'registrar otorga "constructor1"');
R(`Community.votarConstruccion(0)`);
ok(R(`Community.tieneLogro('jurado')`), 'votar otorga "jurado"');
R(`Community.concurso.fin = Date.now() - 1; Community.concursoTick();`);
ok(R(`Community.concurso.activo === false`), 'al vencer el tiempo se finaliza el concurso');
ok(R(`Community.tieneLogro('campeon')`), 'ganar el concurso otorga "campeon" (+150 🪙)');

/* ---------- historia: 5 capítulos, personajes FAMILY válidos ---------- */
ok(R(`Community.HISTORIA.length === 5`), 'la historia tiene 5 capítulos');
ok(R(`Community.HISTORIA.every(c => c.titulo && c.objetivo && c.dialogos.length >= 3 && typeof c.check === 'function')`),
  'capítulos con título, objetivo, 3+ diálogos y check()');
ok(R(`Community.HISTORIA.every(c => c.dialogos.every(d => getFamilyChar(d.q) !== null))`),
  'todos los diálogos usan ids válidos de FAMILY');
ok(R(`['gerson','esmeralda','ian','yael','audrey'].every(id => Community.HISTORIA.some(c => c.dialogos.some(d => d.q === id)))`),
  'aparecen Gerson, Esmeralda, Ian, Yael y Audrey');
/* checks de objetivos */
R(`Community.historia.vistos = 99`);
ok(R(`Community.HISTORIA[0].check() === true`), 'cap1: leer diálogos cumple el objetivo');
R(`SAVE.coins = 100; Community.historia.coinSnap = 90`);
ok(R(`Community.HISTORIA[1].check() === true`), 'cap2: 5 monedas sobre el snapshot');
ok(R(`Community.HISTORIA[2].check() === true`), 'cap3: trofeo w1 completado');
R(`LEVEL.idx = 3`);
ok(R(`Community.HISTORIA[3].check() === true`), 'cap4: estar en el mundo 4 (Immokalee)');
R(`Community.registrarConstruccion('Mi casa familiar')`);
ok(R(`Community.HISTORIA[4].check() === true`), 'cap5: construcción "Mi casa familiar" registrada');
/* completar capítulos */
ok(R(`Community.completarCapitulo(0) === true`), 'completarCapitulo(0) OK');
ok(R(`Community.tieneLogro('capitulo1')`), 'capítulo 1 otorga logro "capitulo1"');
ok(R(`SAVE.historia.done.indexOf(0) !== -1 && SAVE.historia.cap === 1`), 'progreso de historia persistido en SAVE');
R(`Community.historia.done = [0,1,2,3]; Community.historia.cap = 4;`);
ok(R(`Community.completarCapitulo(4) === true`), 'completarCapitulo(4) final OK');
ok(R(`Community.tieneLogro('historia')`), 'terminar otorga "historia" 🥇');

/* ---------- multijugador: salas, frases, fantasmas ---------- */
ok(R(`Community.nombreDeSala(0,1) === 'Sala 1 · La Plaza'`), 'nombreDeSala bonito y original');
ok(R(`Community.FRASES.length === 8 && Community.FRASES.every(f => typeof f === 'string')`), '8 frases rápidas en español');
ok(R(`Community.enviarFrase(0) === false`), 'enviarFrase sin sala online → false sin romper');
R(`Community.modoFantasma(true)`);
ok(R(`Community.fantasmasOn === true`), 'modoFantasma(true) activa');
try { R(`Community.tick(0.016)`); ok(true, 'Community.tick(0.016) sin sala no falla'); }
catch (e) { ok(false, 'Community.tick → ' + e.message); }
R(`Community.modoFantasma(false)`);
ok(R(`Community.fantasmasOn === false`), 'modoFantasma(false) desactiva');

/* ---------- paneles no rompen con stubs ---------- */
try {
  R(`Community.panelLogros(); Community.panelRegalo(); Community.mostrarConcurso(); Community.panelFrases(); Community.abrirHistoria();`);
  ok(true, 'paneles (logros, regalo, concurso, frases, historia) no fallan');
} catch (e) { ok(false, 'paneles → ' + e.message); }

console.log(`\nRESULTADO: ${pass} OK, ${fail} FALLOS`);
process.exit(fail ? 1 : 0);
