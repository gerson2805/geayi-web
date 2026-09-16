/* Pruebas de minigames.js + técnicas (powers.js kind 'tool'): menú, récords,
   préstamo de técnicas, conteo de puntos y utilería portátil (stubs THREE/DOM). */
const fs = require('fs'), vm = require('vm');
require(__dirname + '/stubs.js');
const DIR = '/home/hatch/workspace/your_files/obby-3d/';
const FILES = ['state.js', 'i18n.js', 'audio.js', 'powers.js', 'minigames.js'];
for (const f of FILES) {
  try {
    vm.runInContext(fs.readFileSync(DIR + f, 'utf8'), global.sandbox, { filename: f });
  } catch (e) {
    console.log('  ✗ ERROR cargando ' + f + ': ' + e.message);
    process.exit(1);
  }
}
console.log('carga: 5 archivos sin errores');

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; } else { fail++; console.log('  ✗ FAIL:', name); }
}
const R = (expr) => vm.runInContext(expr, global.sandbox);

/* ---------- base ---------- */
ok(R(`typeof Minigames !== 'undefined'`), 'Minigames existe');
ok(R(`typeof Powers !== 'undefined'`), 'Powers existe');
try { R(`Minigames.init()`); ok(true, 'Minigames.init() no falla'); }
catch (e) { ok(false, 'Minigames.init() → ' + e.message); }
try { R(`Powers.init()`); ok(true, 'Powers.init() no falla'); }
catch (e) { ok(false, 'Powers.init() → ' + e.message); }

/* ---------- técnicas registradas ---------- */
ok(R(`Powers.def('water') && Powers.def('water').kind === 'tool'`), 'técnica water es kind tool');
ok(R(`Powers.def('karate') && Powers.def('karate').kind === 'tool'`), 'técnica karate es kind tool');
ok(R(`Powers.def('water').emoji === '💦'`), 'water usa 💦 (no se confunde con el juguete de weapons.js)');
ok(R(`POWER_DEFS.length === 13`), 'POWER_DEFS tiene 13 poderes (5 + 8 técnicas)');

/* ---------- equipar / prestar ---------- */
R(`SAVE.powers = {water:false, karate:false}; SAVE.equippedTool = null;`);
ok(R(`Powers.equipTool('water') === false`), 'equipar water bloqueado sin desbloquear ni préstamo');
R(`Powers.loanTool('water')`);
ok(R(`Powers.isUsable('water') === true`), 'préstamo hace usable la técnica');
ok(R(`Powers.equippedToolDef() && Powers.equippedToolDef().id === 'water'`), 'préstamo equipa la técnica');
R(`Powers.unloan()`);
ok(R(`Powers.isUsable('water') === false`), 'unloan retira la técnica');

/* ---------- useTool con guards ---------- */
R(`Powers.loanTool('karate'); MODE = 'menu';`);
ok(R(`Powers.useTool() === false`), 'useTool bloqueado fuera de modo play');
R(`MODE = 'play';`);
ok(R(`Powers.useTool() === false`), 'useTool bloqueado sin Player');
R(`Player = { pos: {x:0,y:0,z:0}, heading: 0, vel: {x:0,y:0,z:0} };`);
const used = R(`Powers.useTool()`);
ok(used === true, 'useTool karate funciona con Player en play');
ok(R(`Powers._toolCd > 0`), 'karate deja cooldown');
R(`Powers._toolCd = 0; Powers.unloan(); SAVE.equippedTool = null;`);

/* ---------- Minigames: récords ---------- */
ok(R(`Minigames._fmtTime(65.25) === '1:05.2s'`), '_fmtTime 65.25 → 1:05.2s');
ok(R(`Minigames._fmtTime(9.05) === '9.0s'`), '_fmtTime 9.05 → 9.0s');
R(`SAVE.mg = {};`);
ok(R(`Minigames._setBest('tiro', 10, false) === true`), 'primer récord de tiro se guarda');
ok(R(`Minigames._setBest('tiro', 8, false) === false`), 'peor puntaje no supera récord (mayor gana)');
ok(R(`Minigames._setBest('tiro', 12, false) === true`), 'mejor puntaje sí supera récord');
ok(R(`Minigames._setBest('dash', 20, true) === true`), 'primer tiempo se guarda (menor gana)');
ok(R(`Minigames._setBest('dash', 25, true) === false`), 'peor tiempo no supera récord');
ok(R(`Minigames._setBest('dash', 18.5, true) === true`), 'mejor tiempo sí supera récord');

/* ---------- conteo de puntos ---------- */
R(`Minigames.game = { id:'tiro', phase:'run', t: 60, score: 0 };`);
R(`Minigames.onTargetHit({ tag:'mg' })`);
ok(R(`Minigames.game.score === 1`), 'onTargetHit cuenta diana mg');
R(`Minigames.onTargetHit({ tag:null })`);
ok(R(`Minigames.game.score === 1`), 'onTargetHit ignora diana de ciudad');
R(`Minigames.onTargetHit({ tag:'mg', gate:true })`);
ok(R(`Minigames.game.score === 1`), 'onTargetHit ignora arco de meta');
R(`Minigames.game = null;`);

R(`Minigames.game = { id:'karate', phase:'run', t: 0, score: 4, need: 5 };`);
let finished = false;
R(`var _f = Minigames._finish.bind(Minigames); Minigames._finish = function(s){ finished = s !== true ? true : 'silent'; };`);
R(`Minigames.onBoardBreak({ tag:'mg' })`);
ok(R(`Minigames.game === null || finished === true`), 'al romper la 5ª tabla termina el torneo');
R(`Minigames._finish = _f; Minigames.game = null;`);

/* ---------- spots portátiles ---------- */
R(`Player = { pos: {x:10,y:0,z:20}, heading: 0 };`);
const spots = R(`Minigames._spotsFront(5, 7, 2.6)`);
ok(Array.isArray(spots) && spots.length === 5, '_spotsFront devuelve 5 puntos');
ok(spots.every(s => s[2] === 'mg'), 'spots llevan tag mg');

/* ---------- menú: 6 tarjetas ---------- */
const cards = R(`Minigames._cards()`);
ok(Array.isArray(cards) && cards.length === 6, 'el menú tiene 6 tarjetas');
ok(R(`Minigames._cards().map(c=>c.id).join(',') === 'tiro,karate,dash,olimpiadas,rol,build'`),
  'tarjetas: tiro, karate, dash, olimpiadas, rol, build');

/* ---------- i18n ---------- */
try {
  R(`Minigames._strings()`);
  ok(R(`Minigames._t('mg.title') === '🎮 Minijuegos'`), 'título ES del menú');
} catch (e) { ok(false, 'i18n → ' + e.message); }

console.log(`\nminigamestest: ${pass} OK, ${fail} FALLOS`);
process.exit(fail ? 1 : 0);
