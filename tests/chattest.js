/* Prueba de chat.js (chat + amigos + visitar lotes modelo):
   carga, API pública, historial SAVE.chatlog (máx 50) + persist(),
   modo offline sin Net ni red (respuestas NPC sin errores),
   agregar/quitar amigo con persistencia (recarga desde localStorage),
   visitar showcase teletransporta al jugador a las coordenadas
   documentadas, y construcción de showcases solo en mundo 0.
   Sigue el patrón de lotstest.js (stubs THREE/DOM). */
const fs = require('fs'), vm = require('vm');
require(__dirname + '/stubs.js');
const DIR = '/home/hatch/workspace/your_files/obby-3d/';
const FILES = ['state.js', 'chat.js'];
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

/* ================= API pública ================= */
ok(R(`typeof ChatFriends==='object'`), 'api: ChatFriends existe');
ok(R(`['send','history','clearHistory','addFriend','removeFriend','friends','showcaseById','visitShowcase','buildShowcaseForLevel','init','toggle','openTab','ensureSave','isOnline','myName'].every(k=>typeof ChatFriends[k]==='function')`),
  'api: todas las funciones públicas existen');
ok(R(`typeof ChatFriends.update`) === 'undefined', 'api: update NO se expone (no se necesita)');
ok(R(`Array.isArray(ChatFriends.SHOWCASES) && ChatFriends.SHOWCASES.length===3`), 'api: 3 showcases definidos');
ok(R(`ChatFriends.SHOWCASES.every(s=>s.id&&s.name&&s.worldIdx===0&&s.x!=null&&s.z!=null)`), 'api: showcases con {id,name,worldIdx:0,x,z}');

/* coordenadas documentadas (zonas libres verificadas en Ciudad Neón) */
const coords = R(`JSON.stringify(ChatFriends.SHOWCASES.map(s=>[s.id,s.x,s.z]))`);
ok(coords === '[["casa-sol",-132,131],["jardin-neon",38,-90],["torre-demo",132,131]]',
  'datos: coordenadas documentadas ' + coords);

/* ================= chat: historial ================= */
ok(R(`ChatFriends.ensureSave()`) === true, 'save: ensureSave crea chatlog/friends');
ok(R(`ChatFriends.send('Hola GEAYI')`) === true, 'chat: send devuelve true');
ok(R(`SAVE.chatlog.length`) === 1, 'chat: 1 mensaje en SAVE.chatlog');
ok(R(`SAVE.chatlog[0].text`) === 'Hola GEAYI' && R(`SAVE.chatlog[0].mine`) === true, 'chat: texto y mine correctos');
ok(R(`ChatFriends.send('   ')`) === false, 'chat: mensaje vacío no se envía');
ok(R(`SAVE.chatlog.length`) === 1, 'chat: vacío no crece el historial');
// tope de 50
R(`for(let i=0;i<60;i++) ChatFriends.send('m'+i);`);
ok(R(`SAVE.chatlog.length`) === 50, 'chat: historial topado en 50');
ok(R(`SAVE.chatlog[0].text`) === 'm10', 'chat: se conservan los 50 más recientes (m10..m59)');
// persistencia del historial (recarga desde localStorage)
R(`persist(); SAVE = loadSave(); ChatFriends.ensureSave();`);
ok(R(`SAVE.chatlog.length`) === 50 && R(`SAVE.chatlog[49].text`) === 'm59', 'chat: el historial sobrevive a recarga (persist)');

/* ================= modo offline: sin Net, sin red, sin errores ================= */
ok(R(`typeof Net`) === 'undefined', 'offline: Net no existe en este entorno');
ok(R(`ChatFriends.isOnline()`) === false, 'offline: isOnline() es false sin Supabase');
ok(R(`ChatFriends.send('¿alguien ahí?')`) === true, 'offline: send funciona sin Net ni red');
// el stub de setTimeout no ejecuta: se llama directo al cuerpo de la respuesta NPC
ok(R(`ChatFriends._npcSay()`) === true, 'offline: _npcSay() no lanza excepciones');
ok(R(`SAVE.chatlog[SAVE.chatlog.length-1].mine`) === false, 'offline: el vecino responde (mine=false)');
ok(R(`typeof SAVE.chatlog[SAVE.chatlog.length-1].name`) === 'string' && R(`SAVE.chatlog[SAVE.chatlog.length-1].text.length`) > 5,
  'offline: la respuesta NPC trae nombre y frase amable');
ok(R(`SAVE.chatlog.length`) <= 50, 'offline: la respuesta NPC respeta el tope de 50');

/* ================= amigos ================= */
R(`SAVE.friends=[];`);
ok(R(`ChatFriends.addFriend('Tino')`) === true, 'amigos: agregar por nombre');
ok(R(`SAVE.friends.length`) === 1 && R(`SAVE.friends[0].name`) === 'Tino', 'amigos: queda en SAVE.friends');
ok(R(`/^GEAYI-[A-Z0-9]{4}$/.test(SAVE.friends[0].code)`) === true, 'amigos: código auto GEAYI-XXXX');
ok(R(`ChatFriends.addFriend('Meche','GEAYI-AB12')`) === true, 'amigos: agregar con código propio');
ok(R(`ChatFriends.friends().length`) === 2, 'amigos: friends() lista 2');
ok(R(`ChatFriends.addFriend('tino')`) === false, 'amigos: no duplica (insensible a mayúsculas)');
ok(R(`ChatFriends.addFriend('')`) === false && R(`ChatFriends.addFriend('   ')`) === false, 'amigos: nombre vacío se rechaza');
ok(R(`ChatFriends.addFriend('NombreMuyLargoDeMas16x')`) === true, 'amigos: nombre largo se acepta');
ok(R(`SAVE.friends[2].name.length`) <= 16, 'amigos: el nombre se recorta a 16');
ok(R(`ChatFriends.removeFriend('Tino')`) === true, 'amigos: quitar por nombre');
ok(R(`SAVE.friends.length`) === 2, 'amigos: quitar deja 2');
ok(R(`ChatFriends.removeFriend('GEAYI-AB12')`) === true, 'amigos: quitar por código');
ok(R(`ChatFriends.removeFriend('Nadie')`) === false, 'amigos: quitar inexistente devuelve false');
// persistencia de amigos tras recarga
R(`persist(); SAVE = loadSave(); ChatFriends.ensureSave();`);
ok(R(`ChatFriends.friends().length`) === 1, 'amigos: la lista sobrevive a recarga (persist)');

/* ================= visitar showcase ================= */
// mundo distinto → viaja (startLevel) y luego Player.pos.set a las coordenadas documentadas
R(`LEVEL={idx:3,group:null,platforms:[]};
   Player={pos:{x:0,y:0,z:0,set:function(x,y,z){this.x=x;this.y=y;this.z=z;}}};
   startLevel=function(i){ LEVEL.idx=i; startLevel.last=i; }; startLevel.last=-1;`);
ok(R(`ChatFriends.showcaseById('casa-sol').x`) === -132, 'visita: showcaseById encuentra casa-sol');
ok(R(`ChatFriends.visitShowcase('casa-sol')`) === true, 'visita: visitShowcase devuelve true');
ok(R(`startLevel.last`) === 0, 'visita: viaja a Ciudad Neón (startLevel(0)) si estaba en otro mundo');
ok(R(`Player.pos.x`) === -132 && R(`Player.pos.z`) === 131, 'visita: Player.pos en (-132,131) documentadas');
ok(R(`Player.pos.y`) > 0, 'visita: Player.pos.y sobre el suelo (groundY+0.6)');
// ya en el mundo → no viaja de nuevo, solo teletransporta
R(`startLevel.last=-1; LEVEL.idx=0; ChatFriends.visitShowcase('jardin-neon');`);
ok(R(`startLevel.last`) === -1, 'visita: si ya está en el mundo no llama startLevel');
ok(R(`Player.pos.x`) === 38 && R(`Player.pos.z`) === -90, 'visita: jardín-neón en (38,-90)');
R(`ChatFriends.visitShowcase('torre-demo');`);
ok(R(`Player.pos.x`) === 132 && R(`Player.pos.z`) === 131, 'visita: torre-demo en (132,131)');
ok(R(`ChatFriends.visitShowcase('no-existe')`) === false, 'visita: id inválido devuelve false');

/* ================= construcción de showcases ================= */
R(`LEVEL={idx:0,group:new THREE.Group(),platforms:[]};`);
R(`ChatFriends.buildShowcaseForLevel(0, LEVEL.group);`);
const nGroups = R(`LEVEL.group.children.filter(o=>o.userData&&o.userData.showcaseId).length`);
ok(nGroups === 3, 'build: 3 grupos showcase en mundo 0 (hallados ' + nGroups + ')');
ok(R(`LEVEL.platforms.filter(p=>p.lotTag&&p.lotTag.indexOf('showcase:')===0).length`) >= 4,
  'build: colisionadores showcase registrados (tag showcase:*)');
ok(R(`LEVEL.platforms.filter(p=>p.lotTag==='showcase:casa-sol').every(p=>p.topY!=null&&p.solid===true)`),
  'build: colliders con topY y solid:true');
R(`const n0=LEVEL.group.children.length; ChatFriends.buildShowcaseForLevel(3, LEVEL.group);`);
ok(R(`LEVEL.group.children.length`) === R(`n0`), 'build: en mundo 3 no construye nada');
// sin canvasTex (como en este test) el letrero no rompe nada
ok(R(`LEVEL.group.children.filter(o=>o.userData&&o.userData.showcaseId==='jardin-neon').length`) === 1,
  'build: jardín-neón construido sin canvasTex disponible');

/* ================= UI por JS (sin DOM al cargar) ================= */
ok(R(`ChatFriends._inited`) === false, 'ui: nada de DOM al cargar (no auto-init)');
ok(R(`ChatFriends.init()`) === true, 'ui: init() crea botón y panel por JS');
ok(R(`ChatFriends._inited`) === true, 'ui: init marca _inited');
ok(R(`ChatFriends.init()`) === true, 'ui: init es idempotente');
ok(R(`!!(ChatFriends._ui && ChatFriends._ui.panel && ChatFriends._ui.btn)`), 'ui: panel y botón 💬 existen');
ok(R(`ChatFriends.toggle()`) === true || R(`ChatFriends.toggle()`) === false, 'ui: toggle no lanza excepciones');
ok(R(`(function(){ChatFriends.openTab('friends');ChatFriends.openTab('chat');return true;})()`), 'ui: openTab cambia de pestaña sin errores');
ok(R(`ChatFriends._ui.fList.children.length`) >= 1, 'ui: la pestaña amigos renderiza la lista');
ok(R(`ChatFriends._ui.visits.children.length`) === 3, 'ui: 3 tarjetas 🧳 Visitar en el panel de amigos');

console.log('\nchattest: ' + pass + ' OK, ' + fail + ' fallidas');
process.exit(fail ? 1 : 0);
