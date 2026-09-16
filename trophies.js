/* trophies.js — 🏆 TROFEOS: logros del juego + galería de trofeos
   - Trophy.DEFS: catálogo de trofeos {id, emoji, nameKey, descKey}
   - Trophy.unlock(id): desbloquea, guarda, toast 🏆, confeti y sonido de victoria
   - Trophy.has(id) / Trophy.list(): consulta y catálogo con estado desbloqueado
   - renderTrophyPanel(): devuelve un elemento DOM con la galería de trofeos
   Los ids 'w1'..'w9', 'fish10', 'raceWin', 'horseWin', 'puzzle10', 'rider',
   'deco' y 'star' los usan otros módulos con Trophy.unlock(id).
   Todo el texto sale de T() / addStrings (ES/EN/PT/FR), nunca hardcodeado. */
'use strict';

/* ---- asegura el array de trofeos en el guardado (sin romper si SAVE no existe aún) ---- */
try {
  if (typeof SAVE !== 'undefined' && SAVE && !Array.isArray(SAVE.trophies)) {
    SAVE.trophies = [];
  }
} catch (e) {}

/* array de trofeos del SAVE, o null si el SAVE no está disponible todavía */
function _trophySave() {
  try {
    if (typeof SAVE === 'undefined' || !SAVE) return null;
    if (!Array.isArray(SAVE.trophies)) SAVE.trophies = [];
    return SAVE.trophies;
  } catch (e) { return null; }
}

const Trophy = {
  /* catálogo: los nombres/descripciones salen de T('trophy.<id>') y T('trophy.<id>.d') */
  DEFS: [
    { id: 'w1', emoji: '🏙️', nameKey: 'trophy.w1', descKey: 'trophy.w1.d' },
    { id: 'w2', emoji: '🌋', nameKey: 'trophy.w2', descKey: 'trophy.w2.d' },
    { id: 'w3', emoji: '🍬', nameKey: 'trophy.w3', descKey: 'trophy.w3.d' },
    { id: 'w4', emoji: '☀️', nameKey: 'trophy.w4', descKey: 'trophy.w4.d' },
    { id: 'w5', emoji: '🏝️', nameKey: 'trophy.w5', descKey: 'trophy.w5.d' },
    { id: 'w6', emoji: '🎉', nameKey: 'trophy.w6', descKey: 'trophy.w6.d' },
    { id: 'w7', emoji: '🗽', nameKey: 'trophy.w7', descKey: 'trophy.w7.d' },
    { id: 'w8', emoji: '⛪', nameKey: 'trophy.w8', descKey: 'trophy.w8.d' },
    { id: 'w9', emoji: '❄️', nameKey: 'trophy.w9', descKey: 'trophy.w9.d' },
    { id: 'fish10',  emoji: '🎣', nameKey: 'trophy.fish10',  descKey: 'trophy.fish10.d'  },
    { id: 'raceWin', emoji: '🏎️', nameKey: 'trophy.raceWin', descKey: 'trophy.raceWin.d' },
    { id: 'horseWin',emoji: '🐴', nameKey: 'trophy.horseWin',descKey: 'trophy.horseWin.d' },
    { id: 'puzzle10',emoji: '🧩', nameKey: 'trophy.puzzle10',descKey: 'trophy.puzzle10.d' },
    { id: 'rider',   emoji: '🚗', nameKey: 'trophy.rider',   descKey: 'trophy.rider.d'   },
    { id: 'deco',    emoji: '🏠', nameKey: 'trophy.deco',    descKey: 'trophy.deco.d'    },
    { id: 'star',    emoji: '🔭', nameKey: 'trophy.star',    descKey: 'trophy.star.d'    },
  ],

  /* ¿ya está desbloqueado este trofeo? */
  has(id) {
    const arr = _trophySave();
    return !!arr && arr.indexOf(id) !== -1;
  },

  /* desbloquea el trofeo (una sola vez): guarda, avisa con toast, confeti y fanfarria.
     Nunca rompe: funciona aunque SAVE/Particles/Audio2/Player aún no existan. */
  unlock(id) {
    if (!id) return false;
    const arr = _trophySave();
    if (!arr) return false;
    if (arr.indexOf(id) !== -1) return false; // ya lo tenía
    const def = this.DEFS.find(d => d.id === id);
    if (!def) return false; // id desconocido: no se guarda
    arr.push(id);
    try { if (typeof persist === 'function') persist(); } catch (e) {}
    const name = (typeof T === 'function') ? T(def.nameKey) : def.id;
    try { if (typeof toast === 'function') toast(tp('trophy.toast', { n: name })); } catch (e) {}
    try { if (typeof Audio2 !== 'undefined' && Audio2 && typeof Audio2.win === 'function') Audio2.win(); } catch (e) {}
    try {
      if (typeof Particles !== 'undefined' && Particles && typeof Particles.burst === 'function') {
        let px = 0, py = 2, pz = 0; // confeti en el jugador (con respaldo al origen)
        if (typeof Player !== 'undefined' && Player && Player.pos) {
          px = Player.pos.x; py = Player.pos.y + 2; pz = Player.pos.z;
        }
        Particles.burst(px, py, pz, [0xffd23f, 0xffffff, 0xff9d00, 0xffe95e], 46, 9);
      }
    } catch (e) {}
    return true;
  },

  /* catálogo completo con el estado de desbloqueo de cada trofeo */
  list() {
    return this.DEFS.map(d => ({
      id: d.id,
      emoji: d.emoji,
      name: (typeof T === 'function') ? T(d.nameKey) : d.id,
      desc: (typeof T === 'function') ? T(d.descKey) : '',
      unlocked: this.has(d.id),
    }));
  },
};

/* =========================================================================
   GALERÍA DE TROFEOS (DOM)
   renderTrophyPanel(): devuelve un <div> con la cuadrícula de todos los
   trofeos — desbloqueados en dorado con su emoji, bloqueados en gris con 🔒.
   El menú principal del juego le agregará un botón "🏆 TROFEOS" que muestre
   este panel. Los estilos van inline para no tocar styles.css. */
function renderTrophyPanel() {
  const root = document.createElement('div');
  root.className = 'trophy-panel';
  root.style.cssText = 'padding:18px;max-width:640px;margin:0 auto;text-align:center;';

  const title = document.createElement('h2');
  title.style.cssText = 'margin:0 0 4px;font-size:26px;';
  title.textContent = T('trophy.title');
  root.appendChild(title);

  const count = Trophy.DEFS.filter(d => Trophy.has(d.id)).length;
  const sub = document.createElement('div');
  sub.style.cssText = 'margin-bottom:14px;color:#ffe95e;font-weight:bold;';
  sub.textContent = tp('trophy.count', { n: count, t: Trophy.DEFS.length });
  root.appendChild(sub);

  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;';
  root.appendChild(grid);

  Trophy.list().forEach(t => {
    const card = document.createElement('div');
    const on = t.unlocked;
    card.style.cssText = on
      ? 'border:2px solid #ffd23f;border-radius:14px;padding:12px 8px;background:linear-gradient(160deg,#4a3800,#2a2000);box-shadow:0 0 12px rgba(255,210,63,.45);'
      : 'border:2px solid #555;border-radius:14px;padding:12px 8px;background:#1a1a1a;opacity:.55;filter:grayscale(1);';
    const em = document.createElement('div');
    em.style.cssText = 'font-size:40px;line-height:1.2;';
    em.textContent = on ? t.emoji : '🔒';
    card.appendChild(em);
    const nm = document.createElement('div');
    nm.style.cssText = 'font-weight:bold;margin-top:6px;font-size:14px;color:' + (on ? '#ffe95e' : '#999') + ';';
    nm.textContent = t.name;
    card.appendChild(nm);
    const ds = document.createElement('div');
    ds.style.cssText = 'font-size:12px;margin-top:4px;color:' + (on ? '#fff' : '#777') + ';';
    ds.textContent = t.desc;
    card.appendChild(ds);
    grid.appendChild(card);
  });

  return root;
}

/* ==================== TEXTOS (ES / EN / PT / FR) ==================== */
function _addStrings(lang, obj) { // registra textos sin romper si i18n aún no cargó
  try { if (typeof addStrings === 'function') addStrings(lang, obj); } catch (e) {}
}
_addStrings('es', {
  'trophy.title': '🏆 TROFEOS',
  'trophy.toast': '🏆 ¡Trofeo: {n}!',
  'trophy.count': '🏆 {n} de {t} trofeos',
  'trophy.w1': 'Mundo 1: La Ciudad', 'trophy.w1.d': 'Completa el mundo 1: la ciudad que nunca duerme 🏙️',
  'trophy.w2': 'Mundo 2: La Lava', 'trophy.w2.d': 'Completa el mundo 2: ¡no toques la lava! 🌋',
  'trophy.w3': 'Mundo 3: Dulces', 'trophy.w3.d': 'Completa el mundo 3: un mundo de caramelo 🍬',
  'trophy.w4': 'Mundo 4: Immokalee', 'trophy.w4.d': 'Completa el mundo 4: el pueblo del sol ☀️',
  'trophy.w5': 'Mundo 5: Honduras', 'trophy.w5.d': 'Completa el mundo 5: Copán y las playas de Roatán 🏝️',
  'trophy.w6': 'Mundo 6: México', 'trophy.w6.d': 'Completa el mundo 6: Chichén Itzá y mucha fiesta 🎉',
  'trophy.w7': 'Mundo 7: USA', 'trophy.w7.d': 'Completa el mundo 7: la Estatua de la Libertad 🗽',
  'trophy.w8': 'Mundo 8: España', 'trophy.w8.d': 'Completa el mundo 8: la Sagrada Familia ⛪',
  'trophy.w9': 'Mundo 9: Nieve', 'trophy.w9.d': 'Completa el mundo 9: la montaña de nieve ❄️',
  'trophy.fish10': 'Pescador Pro', 'trophy.fish10.d': 'Pesca 10 peces en el lago 🐟',
  'trophy.raceWin': 'Campeón de Carreras', 'trophy.raceWin.d': 'Gana una carrera de carros 🏎️',
  'trophy.horseWin': 'Jinete Veloz', 'trophy.horseWin.d': 'Gana una carrera de caballos 🐴',
  'trophy.puzzle10': 'Mente Maestra', 'trophy.puzzle10.d': 'Resuelve 10 rompecabezas 🧩',
  'trophy.rider': 'Piloto Total', 'trophy.rider.d': 'Maneja todos los tipos de vehículos 🚗',
  'trophy.deco': 'Decorador Estrella', 'trophy.deco.d': 'Decora tu casa por completo 🏠',
  'trophy.star': 'Mirador de Estrellas', 'trophy.star.d': 'Mira por el telescopio 🔭',
});
_addStrings('en', {
  'trophy.title': '🏆 TROPHIES',
  'trophy.toast': '🏆 Trophy: {n}!',
  'trophy.count': '🏆 {n} of {t} trophies',
  'trophy.w1': 'World 1: The City', 'trophy.w1.d': 'Finish world 1: the city that never sleeps 🏙️',
  'trophy.w2': 'World 2: The Lava', 'trophy.w2.d': "Finish world 2: don't touch the lava! 🌋",
  'trophy.w3': 'World 3: Candy', 'trophy.w3.d': 'Finish world 3: a candy world 🍬',
  'trophy.w4': 'World 4: Immokalee', 'trophy.w4.d': 'Finish world 4: the sunny town ☀️',
  'trophy.w5': 'World 5: Honduras', 'trophy.w5.d': 'Finish world 5: Copán and the beaches of Roatán 🏝️',
  'trophy.w6': 'World 6: Mexico', 'trophy.w6.d': 'Finish world 6: Chichén Itzá and lots of fun 🎉',
  'trophy.w7': 'World 7: USA', 'trophy.w7.d': 'Finish world 7: the Statue of Liberty 🗽',
  'trophy.w8': 'World 8: Spain', 'trophy.w8.d': 'Finish world 8: the Sagrada Familia ⛪',
  'trophy.w9': 'World 9: Snow', 'trophy.w9.d': 'Finish world 9: the snowy mountain ❄️',
  'trophy.fish10': 'Pro Fisher', 'trophy.fish10.d': 'Catch 10 fish in the lake 🐟',
  'trophy.raceWin': 'Race Champion', 'trophy.raceWin.d': 'Win a car race 🏎️',
  'trophy.horseWin': 'Fast Rider', 'trophy.horseWin.d': 'Win a horse race 🐴',
  'trophy.puzzle10': 'Master Mind', 'trophy.puzzle10.d': 'Solve 10 puzzles 🧩',
  'trophy.rider': 'Total Driver', 'trophy.rider.d': 'Ride every type of vehicle 🚗',
  'trophy.deco': 'Star Decorator', 'trophy.deco.d': 'Fully decorate your house 🏠',
  'trophy.star': 'Star Gazer', 'trophy.star.d': 'Look through the telescope 🔭',
});
_addStrings('pt', {
  'trophy.title': '🏆 TROFÉUS',
  'trophy.toast': '🏆 Troféu: {n}!',
  'trophy.count': '🏆 {n} de {t} troféus',
  'trophy.w1': 'Mundo 1: A Cidade', 'trophy.w1.d': 'Complete o mundo 1: a cidade que nunca dorme 🏙️',
  'trophy.w2': 'Mundo 2: A Lava', 'trophy.w2.d': 'Complete o mundo 2: não toque na lava! 🌋',
  'trophy.w3': 'Mundo 3: Doces', 'trophy.w3.d': 'Complete o mundo 3: um mundo de doces 🍬',
  'trophy.w4': 'Mundo 4: Immokalee', 'trophy.w4.d': 'Complete o mundo 4: a cidade do sol ☀️',
  'trophy.w5': 'Mundo 5: Honduras', 'trophy.w5.d': 'Complete o mundo 5: Copán e as praias de Roatán 🏝️',
  'trophy.w6': 'Mundo 6: México', 'trophy.w6.d': 'Complete o mundo 6: Chichén Itzá e muita festa 🎉',
  'trophy.w7': 'Mundo 7: EUA', 'trophy.w7.d': 'Complete o mundo 7: a Estátua da Liberdade 🗽',
  'trophy.w8': 'Mundo 8: Espanha', 'trophy.w8.d': 'Complete o mundo 8: a Sagrada Família ⛪',
  'trophy.w9': 'Mundo 9: Neve', 'trophy.w9.d': 'Complete o mundo 9: a montanha de neve ❄️',
  'trophy.fish10': 'Pescador Pro', 'trophy.fish10.d': 'Pesque 10 peixes no lago 🐟',
  'trophy.raceWin': 'Campeão de Corrida', 'trophy.raceWin.d': 'Vença uma corrida de carros 🏎️',
  'trophy.horseWin': 'Cavaleiro Veloz', 'trophy.horseWin.d': 'Vença uma corrida de cavalos 🐴',
  'trophy.puzzle10': 'Mente Brilhante', 'trophy.puzzle10.d': 'Resolva 10 quebra-cabeças 🧩',
  'trophy.rider': 'Piloto Total', 'trophy.rider.d': 'Dirija todos os tipos de veículos 🚗',
  'trophy.deco': 'Decorador Estrela', 'trophy.deco.d': 'Decore sua casa por completo 🏠',
  'trophy.star': 'Caçador de Estrelas', 'trophy.star.d': 'Olhe pelo telescópio 🔭',
});
_addStrings('fr', {
  'trophy.title': '🏆 TROPHÉES',
  'trophy.toast': '🏆 Trophée : {n} !',
  'trophy.count': '🏆 {n} sur {t} trophées',
  'trophy.w1': 'Monde 1 : La Ville', 'trophy.w1.d': 'Termine le monde 1 : la ville qui ne dort jamais 🏙️',
  'trophy.w2': 'Monde 2 : La Lave', 'trophy.w2.d': 'Termine le monde 2 : ne touche pas la lave ! 🌋',
  'trophy.w3': 'Monde 3 : Bonbons', 'trophy.w3.d': 'Termine le monde 3 : un monde en bonbons 🍬',
  'trophy.w4': 'Monde 4 : Immokalee', 'trophy.w4.d': 'Termine le monde 4 : la ville du soleil ☀️',
  'trophy.w5': 'Monde 5 : Honduras', 'trophy.w5.d': 'Termine le monde 5 : Copán et les plages de Roatán 🏝️',
  'trophy.w6': 'Monde 6 : Mexique', 'trophy.w6.d': 'Termine le monde 6 : Chichén Itzá et la fête 🎉',
  'trophy.w7': 'Monde 7 : USA', 'trophy.w7.d': 'Termine le monde 7 : la Statue de la Liberté 🗽',
  'trophy.w8': 'Monde 8 : Espagne', 'trophy.w8.d': 'Termine le monde 8 : la Sagrada Familia ⛪',
  'trophy.w9': 'Monde 9 : Neige', 'trophy.w9.d': 'Termine le monde 9 : la montagne de neige ❄️',
  'trophy.fish10': 'Pêcheur Pro', 'trophy.fish10.d': 'Pêche 10 poissons dans le lac 🐟',
  'trophy.raceWin': 'Champion de Course', 'trophy.raceWin.d': 'Gagne une course de voitures 🏎️',
  'trophy.horseWin': 'Cavalier Rapide', 'trophy.horseWin.d': 'Gagne une course de chevaux 🐴',
  'trophy.puzzle10': 'Génie des Puzzles', 'trophy.puzzle10.d': 'Résous 10 casse-têtes 🧩',
  'trophy.rider': 'Pilote Total', 'trophy.rider.d': 'Conduis tous les types de véhicules 🚗',
  'trophy.deco': 'Décorateur Star', 'trophy.deco.d': 'Décore ta maison entièrement 🏠',
  'trophy.star': 'Chasseur d’Étoiles', 'trophy.star.d': 'Regarde dans le télescope 🔭',
});
