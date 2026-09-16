// outfittest.js — prendas por parte del cuerpo (combinables) + objeto en la mano
const fs = require('fs'), vm = require('vm');
require('./stubs.js');
const DIR = __dirname + '/../';
const FILES = ['state.js','i18n.js','audio.js','vehicles.js','world.js','neoncity.js','family.js','player.js','online.js','travel.js','phase3.js','powers.js','trophies.js','community.js','casa.js','pets.js','fishing.js','racing.js','weather.js','observatory.js','jobs.js','candy.js','citylife3.js','citylife1.js','citylife2.js','bridges.js','buildmode.js','funpark.js','bowling.js','train.js','monetiza.js','promos.js','dealership.js','waterpark.js','fireworks.js','zoo.js','concerts.js','carwash.js','castle.js','game.js','ranch.js'];
for (const f of FILES) vm.runInContext(fs.readFileSync(DIR + f, 'utf8'), global.sandbox, { filename: f });
let ok = 0, bad = 0;
const t = (name, cond) => { if (cond) { ok++; console.log('  ✅ ' + name); } else { bad++; console.log('  ❌ ' + name); } };
try {
  R('boot(); initThree(); Particles.init(); Avatar.build(); startLevel(0);');
  // el jugador usa un personaje familiar (con zapatos y manos)
  R('SAVE.familyChar = "ian"; Avatar.build();');
  // darle todas las prendas
  R('Shop2.ensureSave(); PREMIUM_OUTFITS.forEach(o => { if (!SAVE.ownedOutfits.includes(o.id)) SAVE.ownedOutfits.push(o.id); });');
  // 1) se pueden combinar: sombrero + chaqueta + botas + bufanda a la vez
  R('Shop2.equipOutfit("out_vaquero"); Shop2.equipOutfit("out_neon"); Shop2.equipOutfit("out_botas"); Shop2.equipOutfit("out_arco");');
  t('sombrero + chaqueta + botas + bufanda combinados',
    R('Shop2.equippedOutfit("out_vaquero")') && R('Shop2.equippedOutfit("out_neon")') &&
    R('Shop2.equippedOutfit("out_botas")') && R('Shop2.equippedOutfit("out_arco")'));
  // 2) misma parte reemplaza: otra gorra quita el sombrero pero NO la chaqueta ni las botas
  R('Shop2.equipOutfit("out_rayo");');
  t('la gorra reemplaza al sombrero', R('Shop2.equippedOutfit("out_rayo")') && !R('Shop2.equippedOutfit("out_vaquero")'));
  t('la chaqueta y las botas se conservan', R('Shop2.equippedOutfit("out_neon")') && R('Shop2.equippedOutfit("out_botas")'));
  t('SAVE.hat refleja el sombrero', R('SAVE.hat') === 'out_rayo');
  // 3) quitar una prenda no quita las demás
  R('Shop2.unequipOutfit("out_neon");');
  t('quitar la chaqueta deja las demás', !R('Shop2.equippedOutfit("out_neon")') && R('Shop2.equippedOutfit("out_botas")'));
  // 4) las botas cuelgan de las piernas (no del cuerpo) y ocultan los tenis base
  R('Shop2.equipOutfit("out_botas");');
  const bootsParentL = R('Avatar.group.userData.outfitMeshes.feet.groups[0].parent === Avatar.group.userData.parts.legL');
  const bootsParentR = R('Avatar.group.userData.outfitMeshes.feet.groups[1].parent === Avatar.group.userData.parts.legR');
  t('bota izquierda atada a la pierna', !!bootsParentL);
  t('bota derecha atada a la pierna', !!bootsParentR);
  const hiddenCount = R('Avatar.group.userData.outfitMeshes.feet.hidden.length');
  t('tenis base ocultos bajo las botas (' + hiddenCount + ' >= 4)', hiddenCount >= 4);
  R('Shop2.clearOutfitSlot(Avatar.group, "feet");');
  t('al quitar las botas vuelven los tenis', R('Avatar.group.userData.parts.legL.children.every(m => m.visible !== false)'));
  // 5) el objeto agarrado va A LA MANO (no flotando al frente)
  R('addShop(LEVEL.group, 0, 0, 0xff0000, "TIENDA", false); MODE="play";');
  R('var _t = TOUCHABLES[0]; Player.pos.set(_t.home.x, 0, _t.home.z); pickupItem(_t);');
  t('producto en la mano', !!R('window.__carried'));
  const inHand = R('carriedInHand()');
  t('el objeto cuelga de la mano del avatar', !!inHand);
  const sc = R('window.__carried.t.o.scale.x');
  t('tamaño de mano (0.55)', Math.abs(sc - 0.55) < 0.01);
  R('dropItem(5, 5);');
  t('al soltar recupera su tamaño', Math.abs(R('_t.o.scale.x') - 1) < 0.01);
  t('al soltar ya no cuelga del avatar', !R('carriedInHand()') && !R('window.__carried'));
  // 6) variedad de mercancía
  const nProd = R('PRODUCT_CATALOG.length');
  t('catálogo con variedad (' + nProd + ' >= 12)', nProd >= 12);
} catch (e) { bad++; console.log('  ❌ excepción: ' + (e && e.message)); }
console.log('OUTFITTEST: ' + ok + ' ✅ · ' + bad + ' ❌');
process.exit(bad ? 1 : 0);
