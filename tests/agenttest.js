/* ============================================================
   tests/agenttest.js — AGENTE GEAYI: reglas de oro, intenciones,
   economía de mundos y oxígeno del nado.
   Patrón: tests/stubs.js (vm + DOM/THREE falsos), como lotstest.js.
   ============================================================ */
const fs = require('fs'), vm = require('vm');
require(__dirname + '/stubs.js');
const DIR = '/home/hatch/workspace/your_files/obby-3d/';
const ASRC = fs.readFileSync(DIR + 'agent.js', 'utf8');

let pass = 0, fail = 0;
function ok(cond, name) { if (cond) { pass++; } else { fail++; console.log('  ✗ FAIL:', name); } }

console.log('1) regla de oro: agent.js sin APIs prohibidas');
const BAD = ['remove', 'delete', 'clear', 'destroy', 'eval', 'fetch', 'websocket', 'xmlhttprequest'];
const found = BAD.filter(w => ASRC.toLowerCase().indexOf(w) >= 0);
ok(found.length === 0, 'agent.js sin: ' + (found.join(',') || 'ninguna prohibida'));

console.log('2) carga de módulos con stubs');
const FILES = ['state.js', 'safewords.js', 'buildmode.js', 'lots.js', 'agent.js'];
let loaded = 0;
for (const f of FILES) {
  try { vm.runInContext(fs.readFileSync(DIR + f, 'utf8'), sandbox, { filename: f }); loaded++; }
  catch (e) { console.log('  ✗ ERROR cargando ' + f + ': ' + e.message); }
}
ok(loaded === FILES.length, 'cargan ' + loaded + '/' + FILES.length + ' archivos');

console.log('3) escenario: lote propio en Immokalee (idx 3)');
R(`SAVE.coins=0; SAVE.lots={}; SAVE.worlds={}; SAVE.creatorEarnings=0;`);
R(`LEVEL.idx=3; LEVEL.platforms=[]; LEVEL.group=null;`);
R(`var Player={pos:{x:65,y:0,z:-90},vel:{x:0,y:0,z:0},heading:0,camYaw:0,camPitch:0};`);
R(`MODE='play';`);
ok(R(`typeof GeayiAgent==='object'`) === true, 'global GeayiAgent existe');
ok(R(`typeof WorldEconomy==='object'`) === true, 'global WorldEconomy existe');
ok(R(`typeof waterZoneAt==='function'`) === true, 'waterZoneAt existe');
ok(R(`typeof swimOxygen==='function'`) === true, 'swimOxygen existe (pura, testeable)');

console.log('4) intenciones en español');
ok(R(`GeayiAgent._detect('hazme una casa').p`) === 'CASA', 'intención "hazme una casa" → CASA');
ok(R(`GeayiAgent._detect('QUIERO UN VOLCAN').p`) === 'VOLCAN', 'intención "quiero un volcan" → VOLCAN');
ok(R(`GeayiAgent._detect('hazme un lago').p`) === 'LAGO', 'intención "hazme un lago" → LAGO');
ok(R(`GeayiAgent._detect('un circuito de adrenalina').p`) === 'CIRCUITO', 'intención "circuito de adrenalina" → CIRCUITO');
ok(R(`GeayiAgent._detect('nadar').id`) === 'SWIM_INFO', 'intención "nadar" → info de agua');
ok(R(`GeayiAgent._detect('cuéntame un chiste').id`) === 'JOKE', 'intención "cuéntame un chiste" → JOKE');
ok(R(`GeayiAgent._detect('crear mundo').id`) === 'CREATE_WORLD', 'intención "crear mundo"');
ok(R(`GeayiAgent._detect('mis ganancias').id`) === 'EARNINGS', 'intención "mis ganancias"');
ok(R(`GeayiAgent._detect('llévame a mi lote').id`) === 'GUIDE', 'intención "llévame a mi lote"');

console.log('5) reglas de seguridad (nunca destruye, solo original)');
ok(R(`GeayiAgent._detect('destruye todo').id`) === 'ONLY_BUILD', 'regla: "destruye todo" → rechazo');
R(`GeayiAgent._runIntent({id:'ONLY_BUILD'});`);
ok(R(`GeayiAgent._last`) === 'Solo construyo, no destruyo 🔨. Dime qué quieres que te construya: ¿una casa, un parque, un volcán?', 'respuesta exacta: «Solo construyo, no destruyo 🔨»');
ok(R(`GeayiAgent._detect('hazme un mario').id`) === 'REFUSE_BRAND', 'regla: "hazme un mario" → rechazo original');
ok(R(`GeayiAgent._detect('quiero una torre ferrari').id`) === 'REFUSE_BRAND', 'regla: marcas copiadas → rechazo');

console.log('6) economía: crear mundo cuesta 100🪙');
R(`SAVE.coins=200; SAVE.worlds={}; SAVE.lots={3:{'immo-1':{x:65,z:-90,w:20,d:16,groundY:0,name:'Mi Lote',blocks:[]}}};`);
ok(R(`WorldEconomy.createWorld()`) === true, 'crear mundo con 200🪙 → ok');
ok(R(`SAVE.coins`) === 100, 'crear mundo descuenta 100🪙');
ok(R(`!!SAVE.worlds['3:immo-1']`) === true, 'el mundo queda registrado en SAVE.worlds');
R(`SAVE.coins=50; SAVE.worlds={};`);
ok(R(`WorldEconomy.createWorld()`) === false, 'crear mundo con 50🪙 → bloqueado');
ok(R(`SAVE.coins`) === 50, 'sin fondos no descuenta nada');
ok(R(`WorldEconomy.priceText()==='100🪙'`), 'precio demo: 100🪙 (pagos reales apagados)');
ok(R(`WorldEconomy.REAL_CREATE_CENTS===299`), 'precio real decidido: $2.99 (299¢)');
ok(R(`typeof PaymentsLive==='undefined'||PaymentsLive.isLive()===false`), 'pagos reales siguen APAGADOS');

console.log('7) chat movible');
ok(R(`typeof makePanelDraggable==='function'`), 'makePanelDraggable existe');
ok(R(`typeof restorePanelPos==='function'`), 'restorePanelPos existe');
ok(R(`(function(){try{makePanelDraggable('no-existe','.x','k');restorePanelPos('no-existe','k');return true;}catch(e){return false;}})()`), 'drag helpers no rompen sin DOM');

console.log('7) economía: visita a mundo ajeno = 25🪙 al creador');
R(`SAVE.lots={}; SAVE.coins=100; SAVE.creatorEarnings=0; SAVE.worlds={'3:immo-1':{name:'Mundo Ajeno',visits:0,lava:[],water:[]}};`);
ok(R(`(function(){var w=WorldEconomy.worldUnder();return w&&!w.mine;})()`) === true, 'detecta mundo ajeno bajo el jugador');
ok(R(`(function(){var w=WorldEconomy.worldUnder();return WorldEconomy.payVisit(w);})()`) === true, 'pagar visita → ok');
ok(R(`SAVE.coins`) === 75, 'la visita cobra 25🪙');
ok(R(`SAVE.worlds['3:immo-1'].visits`) === 1, 'la visita queda contada para el creador');
R(`GeayiAgent._runIntent({id:'EARNINGS'});`);
ok(R(`SAVE.creatorEarnings=175; GeayiAgent._runIntent({id:'EARNINGS'}); /175/.test(GeayiAgent._last)`) === true, '"mis ganancias" muestra las monedas');

console.log('8) construcción: el agente coloca bloques (solo suma, nunca quita)');
R(`SAVE.coins=500; SAVE.worlds={}; SAVE.lots={3:{'immo-1':{x:65,z:-90,w:20,d:16,groundY:0,name:'Mi Lote',blocks:[]}}};`);
ok(R(`(function(){WorldEconomy.createWorld();return GeayiAgent._build('CASA')>0;})()`) === true, 'el agente coloca bloques de la casa');
ok(R(`SAVE.lots[3]['immo-1'].blocks.length`) > 40, 'la casa tiene bloques guardados');
R(`SAVE.worlds={};`);
ok(R(`GeayiAgent._build('CASA')`) === 0, 'sin mundo registrado no construye');
ok(R(`GeayiAgent._last`).indexOf('crear mundo') >= 0, 'sin mundo sugiere crear uno');

console.log('9) volcán: la lava se registra (rebota, no daña)');
R(`WorldEconomy.createWorld();`);
ok(R(`(function(){GeayiAgent._build('VOLCAN');var r=SAVE.worlds['3:immo-1'];return r&&r.lava&&r.lava.length;})()`) > 0, 'el volcán registra su lava');

console.log('10) lago: registra zona de nado');
ok(R(`(function(){GeayiAgent._build('LAGO');return WATER_ZONES.length;})()`) > 0, 'el lago registra WATER_ZONES');
ok(R(`(function(){var z=waterZoneAt(65,-90);return !!z&&typeof z.y==='number';})()`) === true, 'waterZoneAt encuentra la zona con superficie');

console.log('11) oxígeno del nado (30 s, se recarga, sube solo)');
ok(R(`JSON.stringify(swimOxygen(30,30,1,false))`) === '{"oxy":29,"rise":false}', 'bajo el agua baja 1/s');
ok(R(`JSON.stringify(swimOxygen(0.5,30,1,false))`) === '{"oxy":6,"rise":true}', 'en 0 → rise=true (sube a respirar)');
ok(R(`swimOxygen(10,30,1,true).oxy`) === 20, 'en superficie se recarga +10/s');

console.log('12) prefabs: todos generan bloques con color');
ok(R(`Object.keys(PREFABS).length`) === 9, '9 prefabs: CASA, TIENDA, PARQUE, CALLE, PUENTE, TORRE, CIRCUITO, VOLCAN, LAGO');
ok(R(`Object.keys(PREFABS).every(function(k){var b=PREFABS[k]();return Array.isArray(b)&&b.length>0&&b.every(function(x){return typeof x.x==='number'&&typeof x.c==='string';});})`) === true, 'todos los prefabs generan bloques válidos');

console.log('13) update() no falla en el loop del juego');
let uok = true;
try { R(`GeayiAgent.update(0.016);`); } catch (e) { uok = false; console.log('  ✗ update tiró:', e.message); }
ok(uok, 'GeayiAgent.update(dt) corre sin errores');

console.log('14) robot ocultable (👁️) y persistente');
ok(R(`GeayiAgent.isRobotHidden()`) === false, 'por defecto el robot NO está oculto');
R(`SAVE.agentHidden=true;`);
ok(R(`GeayiAgent.isRobotHidden()`) === true, 'SAVE.agentHidden=true → oculto');
let tok = true;
try { R(`GeayiAgent.toggleRobot();`); } catch (e) { tok = false; console.log('  ✗ toggleRobot tiró:', e.message); }
ok(tok && R(`GeayiAgent.isRobotHidden()`) === false, 'toggleRobot() lo muestra de nuevo (sin DOM no falla)');
R(`SAVE.agentHidden=false;`);
ok(R(`(function(){GeayiAgent.update(0.016);return true;})()`) === true, 'update() con robot visible no falla');
R(`SAVE.agentHidden=true;`);
ok(R(`(function(){GeayiAgent.update(0.016);return true;})()`) === true, 'update() con robot oculto no falla');
R(`SAVE.agentHidden=false;`);

console.log('15) enterWorld: clave y teletransporte');
ok(R(`WorldEconomy.key(3,'immo-1')`) === '3:immo-1', 'key(worldIdx,lotId) = "3:immo-1"');
ok(R(`WorldEconomy.enterWorld('9:no-existe')`) === false, 'mundo inexistente → false sin romper');
ok(R(`(function(){SAVE.worlds={'3:immo-1':{name:'Mi mundo',visits:0}};return WorldEconomy.enterWorld('3:immo-1');})()`) === false, 'sin startLevel (node) → false elegante');

console.log('\n' + pass + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
