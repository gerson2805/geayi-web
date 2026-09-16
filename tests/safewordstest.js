/* Prueba de safewords.js (filtro anti-grooming):
   - API pública: check / censor / noteBlocked / isMuted / warnFor
   - cada categoría se bloquea (encuentro, fotos, contacto, sexual)
   - evasiones: mayúsculas, tildes, leet, letras separadas, sin espacios
   - teléfonos (7+ dígitos) se bloquean
   - texto normal pasa (incluye "felicitaciones", que contiene "cita")
   - 3 intentos en 10 min -> muteo de 5 min
   - censor enmascara con ***
   - integración: ChatFriends.send() rechaza texto bloqueado
   Sigue el patrón de chattest.js (stubs THREE/DOM). */
const fs = require('fs'), vm = require('vm');
require(__dirname + '/stubs.js');
const DIR = '/home/hatch/workspace/your_files/obby-3d/';
const FILES = ['state.js', 'safewords.js', 'chat.js'];
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
const C = (t) => R(`SafeWords.check(${JSON.stringify(t)}).ok`);
const CR = (t) => R(`SafeWords.check(${JSON.stringify(t)}).reason`);
const Z = (t) => R(`SafeWords.censor(${JSON.stringify(t)})`);

/* ================= API ================= */
ok(R(`typeof SafeWords==='object'`), 'api: SafeWords existe');
ok(R(`['check','censor','noteBlocked','isMuted','warnFor','muteRemainingSec'].every(k=>typeof SafeWords[k]==='function')`),
  'api: funciones públicas existen');
R(`SafeWords._reset()`);

/* ================= categorías ================= */
ok(C('¿nos vemos en el parque mañana?') === true, 'suave sin riesgo: "nos vemos en el parque" pasa');
ok(CR('te paso a buscar a las 5') === 'encuentro', 'bloqueo: encuentro "te paso a buscar"');
ok(CR('que sea secreto entre nosotros') === 'encuentro', 'bloqueo: encuentro "secreto entre nosotros"');
ok(CR('sin que sepan tus papas') === 'encuentro', 'bloqueo: encuentro "sin que sepan tus papas"');
ok(CR('mándame una foto tuya') === 'fotos', 'bloqueo: fotos "mándame una foto tuya"');
ok(CR('pasame pics') === 'fotos', 'bloqueo: fotos "pics"');
ok(CR('escríbeme a mi whatsapp') === 'contacto', 'bloqueo: contacto "whatsapp"');
ok(CR('agregame en instagram') === 'contacto', 'bloqueo: contacto "instagram"');
ok(CR('mi numero es 2396519974') === 'contacto', 'bloqueo: contacto + teléfono junto');
ok(CR('mira este porno') === 'sexual', 'bloqueo: sexual "porno"');
ok(CR('hablemos de sexo') === 'sexual', 'bloqueo: sexual "sexo"');

/* ================= evasiones ================= */
ok(C('MÁNDAME UNA FOTO') === false, 'evasión: mayúsculas');
ok(C('mándame una fóto') === false, 'evasión: tildes');
ok(C('m4nd4m3 f0t0') === false, 'evasión: leet f0t0');
ok(C('v3rn0s en el parque') === false, 'evasión: leet v3rn0s');
ok(C('m a n d a f o t o') === false, 'evasión: letras separadas');
ok(C('mandafoto') === false, 'evasión: frase sin espacios');
ok(C('nosvemos mañana') === false, 'evasión: "nosvemos" pegado');
ok(C('escribeme al wh4ts4pp') === false, 'evasión: leet en contacto');

/* ================= teléfonos ================= */
ok(C('llamame al 239 651 9974') === false, 'teléfono: con espacios');
ok(C('mi cel es 239-651-9974') === false, 'teléfono: con guiones');
ok(C('tengo 1234567') === false, 'teléfono: 7 dígitos seguidos');

/* ================= texto normal: pasa ================= */
ok(C('hola, ¿jugamos una carrera?') === true, 'normal: saludo pasa');
ok(C('felicitaciones, buena carrera') === true, 'normal: "felicitaciones" no dispara "cita"');
ok(C('¿dónde queda la tienda?') === true, 'normal: pregunta de tienda pasa');
ok(C('me gusta tu carro nuevo') === true, 'normal: charla del juego pasa');
R(`SafeWords._reset()`); // limpiar riesgo de pruebas anteriores: las frases suaves pasan
ok(C('nos vemos en el juego mañana') === true, 'suave sin riesgo: "nos vemos en el juego" pasa');
ok(C('nos vemos') === true, 'suave sin riesgo: "nos vemos" solo NO se bloquea');

/* ================= muteo anti-reincidencia ================= */
R(`SafeWords._reset()`);
ok(R(`SafeWords.isMuted()`) === false, 'muteo: empieza sin muteo');
R(`SafeWords.noteBlocked()`);
R(`SafeWords.noteBlocked()`);
ok(R(`SafeWords.isMuted()`) === false, 'muteo: 2 intentos aún no mutean');
R(`SafeWords.noteBlocked()`);
ok(R(`SafeWords.isMuted()`) === true, 'muteo: 3 intentos -> muteado');
ok(R(`SafeWords.muteRemainingSec()`) > 0, 'muteo: queda tiempo de muteo');
R(`SafeWords._reset()`);
ok(R(`SafeWords.isMuted()`) === false, 'muteo: _reset limpia');

/* ================= censor ================= */
ok(Z('hola manda foto amigo').includes('***'), 'censor: enmascara la frase');
ok(!Z('hola manda foto amigo').toLowerCase().includes('manda foto'), 'censor: no queda la frase original');
ok(Z('llamame 2396519974').includes('***') && !Z('llamame 2396519974').includes('2396519974'),
  'censor: enmascara teléfono');
ok(Z('m a n d a f o t o').includes('***'), 'censor: enmascara letras separadas');
ok(Z('hola, jugamos una carrera?') === 'hola, jugamos una carrera?', 'censor: texto sano intacto');
ok(Z('') === '', 'censor: vacío no rompe');

/* ================= warnFor ================= */
for (const r of ['encuentro', 'fotos', 'contacto', 'sexual', 'coqueteo', 'violencia']) {
  ok(R(`SafeWords.warnFor(${JSON.stringify(r)}).includes('adulto')`), 'warnFor[' + r + ']: pide contarlo a un adulto');
}

/* ================= nuevas categorías: coqueteo ================= */
ok(CR('eres linda') === 'coqueteo', 'bloqueo: coqueteo "eres linda"');
ok(CR('que guapa estas') === 'coqueteo', 'bloqueo: coqueteo "que guapa"');
ok(CR('quieres ser mi novia') === 'coqueteo', 'bloqueo: coqueteo "quieres ser mi novia"');
ok(CR('te amo mi amor') === 'coqueteo', 'bloqueo: coqueteo "te amo"/"mi amor"');
ok(CR('casate conmigo') === 'coqueteo', 'bloqueo: coqueteo "casate conmigo"');
ok(C('ERES HERMOSA') === false, 'coqueteo: mayúsculas');
ok(C('e r e s l i n d a') === false, 'coqueteo: letras separadas');
ok(C('t3 am0') === false, 'coqueteo: leet "te amo"');
ok(C('estas sola en casa?') === false, 'coqueteo: "estas sola"');
ok(Z('eres linda').includes('***'), 'censor: enmascara coqueteo');

/* ================= nueva categoría: secuestro ================= */
ok(CR('te voy a secuestrar') === 'secuestro', 'bloqueo: secuestro "te voy a secuestrar"');
ok(CR('súbete al carro') === 'secuestro', 'bloqueo: secuestro "súbete al carro"');
ok(CR('ven conmigo, nadie se va a enterar') === 'secuestro', 'bloqueo: secuestro "ven conmigo..."');
ok(CR('no se lo digas a tus papás') === 'secuestro', 'bloqueo: secuestro "no se lo digas a tus papás"');
ok(C('SECUÉSTRAME') === false, 'secuestro: mayúsculas y tilde');
ok(C('s u b e t e al c a r r o') === false, 'secuestro: letras separadas');
ok(C('te voy a s3cu3strar') === false, 'secuestro: leet');
ok(Z('te voy a llevar lejos').includes('***'), 'censor: enmascara secuestro');
ok(R(`SafeWords.warnFor('secuestro')`).includes('adulto'), 'warnFor secuestro menciona adulto');

/* ================= alerta GRANDE anti-secuestro ================= */
ok(CR('estoy cerca de tu casa, ya te conozco') === 'secuestro', 'bloqueo: "estoy cerca de tu casa, ya te conozco"');
ok(CR('sé dónde vives, te he visto') === 'secuestro', 'bloqueo: "sé dónde vives, te he visto"');
ok(CR('ESTOY AFUERA DE TU CASA') === 'secuestro', 'bloqueo: mayúsculas "estoy afuera de tu casa"');
ok(C('e s t o y c e r c a de tu c a s a') === false, 'secuestro: letras separadas');
ok(R(`SafeWords.isCritical('secuestro')`) === true, 'isCritical: secuestro es crítico');
ok(R(`SafeWords.isCritical('encuentro')`) === false, 'isCritical: encuentro no es crítico');
ok(R(`typeof SafeWords.showBigAlert`) === 'function', 'showBigAlert existe');

/* ================= filtro inteligente: memoria de conversación ================= */
R(`SafeWords._reset()`); // sin riesgo: las frases suaves pasan
ok(C('voy a tu casa') === true, 'riesgo: "voy a tu casa" solo NO se bloquea');
ok(C('vamos a tu casa') === true, 'riesgo: "vamos a tu casa" solo NO se bloquea');
ok(C('nos vemos') === true, 'riesgo: "nos vemos" solo NO se bloquea');
ok(C('vente, estoy aquí') === true, 'riesgo: "vente, estoy aquí" solo NO se bloquea');
ok(Z('voy a tu casa') === 'voy a tu casa', 'censor: sin riesgo no enmascara');
// simular: en la conversación pidieron redes y número -> modo estricto por 24h
ok(CR('pasa tu whats') === 'contacto', 'riesgo: pedir whats marca la conversación');
ok(R(`SafeWords.isRisky()`) === true, 'riesgo: isRisky() es true tras pedir datos');
ok(CR('voy a tu casa') === 'encuentro', 'riesgo: "voy a tu casa" SE bloquea si pidieron datos');
ok(CR('nos vemos') === 'encuentro', 'riesgo: "nos vemos" SE bloquea si pidieron datos');
ok(CR('vamos a tu casa en el juego') === 'encuentro', 'riesgo: con datos pedidos se bloquea AUN hablando del juego');
ok(Z('voy a tu casa').includes('***'), 'censor: con riesgo sí enmascara');
ok(R(`SafeWords.warnFor('encuentro')`).includes('ya te pidió tus datos'), 'warnFor: aviso especial con riesgo');
R(`SafeWords._reset()`); // limpiar para las siguientes pruebas
ok(R(`SafeWords.isRisky()`) === false, 'riesgo: _reset() limpia la marca');
/* lo duro SIEMPRE se bloquea, con o sin juego, con o sin riesgo */
ok(CR('estoy cerca de tu casa en el juego') === 'secuestro', 'duro: "estoy cerca de tu casa" se bloquea SIEMPRE');
ok(CR('mándame una foto en el juego') === 'fotos', 'duro: pedir fotos se bloquea SIEMPRE');

/* ================= filtro inteligente: datos personales y dinero ================= */
ok(CR('dame tu cuenta bancaria') === 'financiero', 'bloqueo: "dame tu cuenta bancaria"');
ok(CR('pásame tu número de cuenta') === 'financiero', 'bloqueo: "pásame tu número de cuenta"');
ok(CR('dame tu tarjeta') === 'financiero', 'bloqueo: "dame tu tarjeta"');
ok(CR('pasa tu whats') === 'contacto', 'bloqueo: "pasa tu whats"');
ok(CR('dame tus redes sociales') === 'contacto', 'bloqueo: "dame tus redes sociales"');
ok(CR('dame tu numero') === 'contacto', 'bloqueo: "dame tu numero"');
ok(CR('pásame tu dirección') === 'encuentro', 'bloqueo: "pásame tu dirección"');
ok(CR('mándame tu ubicación') === 'encuentro', 'bloqueo: "mándame tu ubicación"');
ok(CR('en qué calle vives') === 'encuentro', 'bloqueo: "en qué calle vives"');
ok(CR('dame tu instagram') === 'contacto', 'bloqueo: "dame tu instagram"');
ok(R(`SafeWords.warnFor('financiero')`).includes('dinero'), 'warnFor financiero habla de dinero');

/* ================= nuevas categorías: violencia ================= */ok(CR('te mato') === 'violencia', 'bloqueo: violencia "te mato"');
ok(CR('trae el cuchillo') === 'violencia', 'bloqueo: violencia "cuchillo"');
ok(CR('te voy a pegar') === 'violencia', 'bloqueo: violencia "te voy a pegar"');
ok(C('TE MATO') === false, 'violencia: mayúsculas');
ok(C('p i s t o l a') === false, 'violencia: letras separadas');
ok(C('cuch1ll0') === false, 'violencia: leet "cuchillo"');
ok(C('tengo una pistola') === false, 'violencia: "pistola" sola se bloquea');
ok(Z('te mato').includes('***'), 'censor: enmascara violencia');

/* ================= excepciones: armas de JUGUETE ================= */
ok(C('mi pistola de agua es azul') === true, 'juguete: "pistola de agua" pasa');
ok(C('el lanzadardos dispara dardos de espuma') === true, 'juguete: "dispara dardos de espuma" pasa');
ok(Z('mi pistola de agua') === 'mi pistola de agua', 'censor: frase de juguete intacta');

/* ================= violencia: hablando del juego no se bloquea ================= */
R(`SafeWords._reset()`);
ok(C('te voy a matar en el juego') === true, 'juego: "te voy a matar en el juego" pasa');
ok(C('te mato con mi lanzadardos') === true, 'juego: "te mato con mi lanzadardos" pasa');
ok(C('mata al monstruo en el juego') === true, 'juego: "mata al monstruo en el juego" pasa');
ok(C('te pego con mi pistola de agua') === true, 'juego: "te pego con mi pistola de agua" pasa');
ok(CR('te voy a matar') === 'violencia', 'sin juego: "te voy a matar" solo SÍ se bloquea');
ok(CR('jajaja te mato') === 'violencia', 'sin juego: "jajaja te mato" SÍ se bloquea');
ok(CR('te pego con un cuchillo en el juego') === 'violencia', 'duro: "cuchillo" se bloquea AUN jugando');
ok(CR('te disparo en el juego') === 'violencia', 'duro: "disparo" se bloquea AUN jugando');
ok(Z('te mato en el juego') === 'te mato en el juego', 'censor: jugando no enmascara violencia suave');
ok(Z('te mato').includes('***'), 'censor: sin juego sí enmascara');

/* ================= reglas del chat: los niños saben qué no está permitido ================= */
ok(R(`typeof SafeWords.rulesList`) === 'function', 'rulesList existe');
ok(R(`SafeWords.rulesList().length`) >= 6, 'rulesList: trae las reglas');
ok(R(`SafeWords.rulesList().join(' ')`).includes('WhatsApp'), 'rulesList: menciona WhatsApp');
ok(R(`SafeWords.rulesList().join(' ')`).includes('fotos'), 'rulesList: menciona fotos');
ok(R(`SafeWords.rulesList().join(' ')`).includes('dinero'), 'rulesList: menciona dinero');
ok(R(`typeof SafeWords.showRules`) === 'function', 'showRules existe');
ok(R(`typeof SafeWords.showBlocked`) === 'function', 'showBlocked existe');
ok(R(`SafeWords.showRules()`) === true, 'showRules: muestra el panel (DOM simulado)');
ok(R(`SafeWords.showBlocked('contacto','dame tu numero')`) === true, 'showBlocked: muestra el aviso (DOM simulado)');
ok(R(`document.getElementById('sw-blocked') != null`) === true, 'showBlocked: crea el overlay sw-blocked');

/* ================= integración con chat.js ================= */
R(`SafeWords._reset()`);
R(`SAVE.chatlog=[]`);
ok(R(`ChatFriends.send('mándame una foto tuya')`) === false, 'chat: send rechaza texto bloqueado');
ok(R(`SAVE.chatlog.length`) === 0, 'chat: bloqueado no entra al historial');
ok(R(`ChatFriends.send('hola, jugamos una carrera?')`) === true, 'chat: send acepta texto sano');
ok(R(`SAVE.chatlog.length`) === 1, 'chat: sano sí entra al historial');
// muteo también frena el envío
R(`SafeWords._reset(); SafeWords.noteBlocked(); SafeWords.noteBlocked(); SafeWords.noteBlocked();`);
ok(R(`ChatFriends.send('hola de nuevo')`) === false, 'chat: muteado no puede enviar');
R(`SafeWords._reset()`);

console.log(`\nsafewordstest: ${pass} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
