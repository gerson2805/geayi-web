// endlestest.js — MUNDO LIBRE estilo Roblox: sin "pasaste de nivel"
// Verifica: no existe winLevel, el descubrimiento premia una sola vez,
// el HUD ya no trae cronómetro y la meta no interrumpe el juego.
const fs = require('fs'), vm = require('vm');
require('./stubs.js');
const DIR = __dirname + '/../';
const FILES = ['state.js','i18n.js','audio.js','vehicles.js','world.js','neoncity.js','family.js','player.js','online.js','travel.js','phase3.js','powers.js','trophies.js','community.js','casa.js','pets.js','fishing.js','racing.js','weather.js','observatory.js','jobs.js','candy.js','citylife3.js','citylife1.js','citylife2.js','bridges.js','buildmode.js','funpark.js','bowling.js','train.js','monetiza.js','promos.js','dealership.js','waterpark.js','fireworks.js','zoo.js','concerts.js','carwash.js','castle.js','game.js','ranch.js'];
for (const f of FILES) vm.runInContext(fs.readFileSync(DIR + f, 'utf8'), global.sandbox, { filename: f });
let ok = 0, bad = 0;
const t = (name, cond) => { if (cond) { ok++; console.log('  ✅ ' + name); } else { bad++; console.log('  ❌ ' + name); } };
try {
  R('boot(); initThree();');
  t('winLevel() ya no existe (nada dice "pasaste de nivel")', R(`typeof winLevel`) === 'undefined');
  t('discoverWorld() existe', R(`typeof discoverWorld`) === 'function');
  // descubrimiento: una sola vez
  const coinsBefore = R('SAVE.coins');
  const first = R('discoverWorld(2)');
  const coinsAfter = R('SAVE.coins');
  t('primer descubrimiento devuelve true y da bono', first === true && coinsAfter > coinsBefore);
  const second = R('discoverWorld(2)');
  const coinsAfter2 = R('SAVE.coins');
  t('segunda visita no repite el bono', second === false && coinsAfter2 === coinsAfter);
  t('trofeo del mundo desbloqueado', R(`Trophy.has('w3')`) === true);
  t('mundo queda marcado como visitado', !!R('SAVE.visited && SAVE.visited[2]'));
  // HUD sin cronómetro
  const html = fs.readFileSync(DIR + 'index.html', 'utf8');
  t('HUD sin chip de cronómetro (hud-time)', !html.includes('hud-time'));
  t('pausa dice "Volver al inicio" (no "Reiniciar nivel")', html.includes('Volver al inicio') && !html.includes('Reiniciar nivel'));
  t('ayuda sin "cruza la meta"', !html.includes('Cruza la meta'));
  // game.js ya no actualiza cronómetro del HUD
  const gjs = fs.readFileSync(DIR + 'game.js', 'utf8');
  t('game.js no escribe hud-time', !gjs.includes('hud-time'));
  t('game.js no guarda best[] de nivel', !gjs.includes('SAVE.best['));
  // i18n: tagline sin meta
  t('tagline ES sin meta', !R(`T('app.tagline')`).includes('meta'));
  // el arco de bienvenida ya no usa cuadros de carrera
  const wjs = fs.readFileSync(DIR + 'world.js', 'utf8');
  t('arco usa letrero GEAYI (no cuadros)', wjs.includes('geayiArchTexture'));
  // player.js sin trigger de meta
  const pjs = fs.readFileSync(DIR + 'player.js', 'utf8');
  t('player.js sin llamada a winLevel', !pjs.includes('winLevel'));
} catch (e) { bad++; console.log('  ❌ excepción: ' + (e && e.message)); }
console.log('ENDLESSTEST: ' + ok + ' ✅ · ' + bad + ' ❌');
process.exit(bad ? 1 : 0);
