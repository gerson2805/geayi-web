/* i18n.js — sistema multi-idioma 🌍 (ES / EN / PT / FR)
   - T(key): devuelve el texto en el idioma actual (respaldo: español, luego la clave)
   - addStrings(lang, obj): los módulos agregan sus propias claves
   - setLang(id): cambia el idioma, lo guarda y repinta la interfaz
   - Los letreros 3D usan el idioma vigente al construir el nivel.
*/
'use strict';

const LANGS = [
  { id: 'es', flag: '🇪🇸', name: 'Español' },
  { id: 'en', flag: '🇺🇸', name: 'English' },
  { id: 'pt', flag: '🇧🇷', name: 'Português' },
  { id: 'fr', flag: '🇫🇷', name: 'Français' },
];
let LANG = 'es';

const STRINGS = { es: {}, en: {}, pt: {}, fr: {} };
/* marca y título: iguales en los 4 idiomas */
addStrings('es', {
  'app.brand': 'GEAYI', 'app.subtitle': 'Obby Xtreme 3D',
  'app.pagetitle': 'GEAYI: Obby Xtreme 3D — ¡Salta, esquiva y gana!',
  'app.lang': '🌐 Idioma',
});
addStrings('en', {
  'app.brand': 'GEAYI', 'app.subtitle': 'Obby Xtreme 3D',
  'app.pagetitle': 'GEAYI: Obby Xtreme 3D — Jump, dodge and win!',
  'app.lang': '🌐 Language',
});
addStrings('pt', {
  'app.brand': 'GEAYI', 'app.subtitle': 'Obby Xtreme 3D',
  'app.pagetitle': 'GEAYI: Obby Xtreme 3D — Pule, desvie e vença!',
  'app.lang': '🌐 Idioma',
});
addStrings('fr', {
  'app.brand': 'GEAYI', 'app.subtitle': 'Obby Xtreme 3D',
  'app.pagetitle': 'GEAYI: Obby Xtreme 3D — Saute, esquive et gagne !',
  'app.lang': '🌐 Langue',
});

function T(key) {
  const L = STRINGS[LANG] || STRINGS.es;
  if (L[key] != null) return L[key];
  if (STRINGS.es[key] != null) return STRINGS.es[key];
  return key;
}
/* los módulos (fase 3, casa, pesca, etc.) registran aquí sus textos */
function addStrings(lang, obj) {
  if (!STRINGS[lang]) STRINGS[lang] = {};
  Object.assign(STRINGS[lang], obj);
}
function tp(key, vars) { // plantilla con {n}
  let s = T(key);
  if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
  return s;
}

function setLang(id, silent) {
  if (!STRINGS[id]) id = 'es';
  LANG = id;
  try { SAVE.lang = id; persist(); } catch (e) {}
  if (!silent) applyI18n();
}
function initLang() {
  try { if (SAVE.lang && STRINGS[SAVE.lang]) LANG = SAVE.lang; } catch (e) {}
}

/* repinta todo el DOM estático marcado con data-i18n */
function applyI18n() {
  try {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = T(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
      el.setAttribute('placeholder', T(el.getAttribute('data-i18n-ph')));
    });
    try { document.title = T('app.pagetitle'); } catch (e) {}
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      el.innerHTML = T(el.getAttribute('data-i18n-html'));
    });
    if (typeof updateMusicBtns === 'function') updateMusicBtns();
    if (typeof renderLevels === 'function' && $('screen-levels') && !$('screen-levels').classList.contains('hidden')) renderLevels();
    if (typeof renderCustom === 'function' && $('screen-custom') && !$('screen-custom').classList.contains('hidden')) renderCustom();
    if (typeof buildLangPicker === 'function') buildLangPicker();
    if (typeof updateFxHud === 'function') updateFxHud();
    if (typeof renderOnlineWorlds === 'function' && $('screen-online') && !$('screen-online').classList.contains('hidden')) renderOnlineWorlds();
  } catch (e) {}
}

/* banderitas en el menú principal */
function buildLangPicker() {
  const box = $('lang-picker');
  if (!box) return;
  box.innerHTML = '';
  const label = document.createElement('span');
  label.className = 'lang-label';
  label.textContent = T('menu.lang');
  box.appendChild(label);
  LANGS.forEach(L => {
    const b = document.createElement('button');
    b.className = 'lang-flag' + (L.id === LANG ? ' active' : '');
    b.textContent = L.flag;
    b.title = L.name;
    b.setAttribute('aria-label', L.name);
    b.addEventListener('click', () => {
      Audio2.init(); Audio2.click();
      setLang(L.id);
      toast(tp('menu.langSet', { n: L.name }));
    });
    box.appendChild(b);
  });
}

/* ==================== DICCIONARIO CENTRAL ==================== */
addStrings('es', {
  'app.tagline': '¡Explora, construye y vive en tu ciudad! 🌍',
  'menu.play': '🚀 JUGAR',
  'menu.chars': '🎨 PERSONAJES',
  'menu.online': '🌐 JUGAR EN LÍNEA',
  'menu.howto': '❓ CÓMO JUGAR',
  'menu.download': '📲 DESCARGAR LA APP',
  'menu.musicOn': '🎵 Música: ON',
  'menu.musicOff': '🎵 Música: OFF',
  'menu.logout': '🚪 Cerrar sesión',
  'menu.lang': '🌍 Idioma:',
  'menu.langSet': '🌍 Idioma: {n}',
  'menu.soon': '📲 PRÓXIMAMENTE EN GOOGLE PLAY',
  'menu.chooseWorld': 'Elige tu mundo 🌍',
  'menu.lockedTail': 'Termina el anterior',
  'hud.world': 'Mundo {n}',
  'pause.title': '⏸️ Pausa',
  'pause.resume': '▶ Seguir',
  'pause.restart': '📍 Volver al inicio',
  'pause.leaveRoom': '🚪 Salir de la sala',
  'pause.quit': '🏠 Salir al menú',
  'win.title': '🏆 ¡Nivel completado!',
  'win.gameDone': '🏆 ¡JUEGO COMPLETADO!',
  'win.newBest': '⭐ ¡NUEVO RÉCORD! ⭐',
  'win.time': '⏱️ Tiempo:',
  'win.best': '🥇 Mejor tiempo:',
  'win.coins': '🪙 Monedas del nivel:',
  'win.next': '➡ Siguiente mundo',
  'win.replay': '🔄 Jugar de nuevo',
  'win.menu': '🏠 Menú',
  'how.title': '❓ Cómo jugar',
  'how.close': '¡Entendido!',
  'toast.locked': '🔒 Termina el mundo anterior',
  'toast.go': '🏁 ¡A correr!',
  'toast.checkpoint': '🚩 ¡Punto de control!',
  'toast.fall': '💥 ¡Ups! De vuelta al control',
  'toast.needCoins': '🪙 Te faltan monedas: juega niveles',
  'toast.bought': '🎉 ¡Comprado: {n}!',
  'custom.myChars': '⭐ Mis personajes',
  'custom.free': 'Personaje libre',
  'custom.family': '👪 Familia',
  'custom.chute': '🪂 Paracaídas',
  'custom.chuteSub': '(gratis: se abre solo al caer desde lo alto)',
  'custom.hats': '🎩 Sombreros',
  'custom.trails': '✨ Estelas',
  'custom.body': '🎨 Color',
  'shop.hat.none': 'Sin nada',
  'shop.hat.cap': 'Gorra',
  'shop.hat.tophat': 'Sombrero',
  'shop.hat.headphones': 'Audífonos',
  'shop.hat.crown': 'Corona',
  'shop.trail.none': 'Sin estela',
  'shop.trail.sparkle': 'Destellos',
  'shop.trail.fire': 'Fuego',
  'shop.trail.rainbow': 'Arcoíris',
  'level.desc.1': 'La ciudad que nunca duerme',
  'level.desc.2': '¡No toques la lava!',
  'level.desc.3': 'Un mundo de caramelo',
  'level.desc.4': 'El pueblo del sol ☀️',
  'level.desc.5': 'Copán y las playas de Roatán',
  'level.desc.6': 'Chichén Itzá y mucha fiesta',
  'level.desc.7': 'La Estatua de la Libertad 🗽',
  'level.desc.8': 'La Sagrada Familia ⛪',
  'level.desc.9': 'Montaña de nieve ❄️🏔️',
  'veh.board': 'SUBIRSE',
  'veh.exit': 'BAJARSE',
  'veh.travel': '✈️ VIAJAR',
  'veh.electric': '⚡ ELÉCTRICO',
  'travel.title': '✈️ ¿A dónde volamos?',
  'travel.close': '✖ Cerrar',
  'travel.empty': '🔒 Completa este mundo para desbloquear los viajes',
  'travel.takeoff': '¡Despegando!',
  'travel.leaveRoom': '🌐 Sal de la sala para viajar ✈️',
  'sign.airport': '✈️ AEROPUERTO',
  'sign.welcome1': 'BIENVENIDOS A',
  'sign.welcome2': 'IMMOKALEE, FL',
  'online.room': '🚪 Sala',
  'online.join': 'Entrar ➤',
  'online.full': 'Llena',
  'online.roomFull': '🚫 Sala llena, prueba otra.',
  'touch.jump': 'SALTAR',
});
addStrings('en', {
  'app.tagline': 'Explore, build and live in your city! 🌍',
  'menu.play': '🚀 PLAY',
  'menu.chars': '🎨 CHARACTERS',
  'menu.online': '🌐 PLAY ONLINE',
  'menu.howto': '❓ HOW TO PLAY',
  'menu.download': '📲 GET THE APP',
  'menu.musicOn': '🎵 Music: ON',
  'menu.musicOff': '🎵 Music: OFF',
  'menu.logout': '🚪 Log out',
  'menu.lang': '🌍 Language:',
  'menu.langSet': '🌍 Language: {n}',
  'menu.soon': '📲 COMING SOON ON GOOGLE PLAY',
  'menu.chooseWorld': 'Choose your world 🌍',
  'menu.lockedTail': 'Finish the previous one',
  'hud.world': 'World {n}',
  'pause.title': '⏸️ Pause',
  'pause.resume': '▶ Resume',
  'pause.restart': '📍 Back to start',
  'pause.leaveRoom': '🚪 Leave room',
  'pause.quit': '🏠 Back to menu',
  'win.title': '🏆 Level complete!',
  'win.gameDone': '🏆 GAME COMPLETE!',
  'win.newBest': '⭐ NEW RECORD! ⭐',
  'win.time': '⏱️ Time:',
  'win.best': '🥇 Best time:',
  'win.coins': '🪙 Level coins:',
  'win.next': '➡ Next world',
  'win.replay': '🔄 Play again',
  'win.menu': '🏠 Menu',
  'how.title': '❓ How to play',
  'how.close': 'Got it!',
  'toast.locked': '🔒 Finish the previous world',
  'toast.go': '🏁 Go!',
  'toast.checkpoint': '🚩 Checkpoint!',
  'toast.fall': '💥 Oops! Back to the checkpoint',
  'toast.needCoins': '🪙 Not enough coins: play levels',
  'toast.bought': '🎉 Bought: {n}!',
  'custom.myChars': '⭐ My characters',
  'custom.free': 'Free character',
  'custom.family': '👪 Family',
  'custom.chute': '🪂 Parachute',
  'custom.chuteSub': '(free: opens by itself when you fall from high up)',
  'custom.hats': '🎩 Hats',
  'custom.trails': '✨ Trails',
  'custom.body': '🎨 Color',
  'shop.hat.none': 'Nothing',
  'shop.hat.cap': 'Cap',
  'shop.hat.tophat': 'Top hat',
  'shop.hat.headphones': 'Headphones',
  'shop.hat.crown': 'Crown',
  'shop.trail.none': 'No trail',
  'shop.trail.sparkle': 'Sparkles',
  'shop.trail.fire': 'Fire',
  'shop.trail.rainbow': 'Rainbow',
  'level.desc.1': 'The city that never sleeps',
  'level.desc.2': "Don't touch the lava!",
  'level.desc.3': 'A candy world',
  'level.desc.4': 'The sunny town ☀️',
  'level.desc.5': 'Copán and the beaches of Roatán',
  'level.desc.6': 'Chichén Itzá and lots of fun',
  'level.desc.7': 'The Statue of Liberty 🗽',
  'level.desc.8': 'The Sagrada Familia ⛪',
  'level.desc.9': 'Snowy mountain ❄️🏔️',
  'veh.board': 'RIDE',
  'veh.exit': 'GET OFF',
  'veh.travel': '✈️ TRAVEL',
  'veh.electric': '⚡ ELECTRIC',
  'travel.title': '✈️ Where are we flying?',
  'travel.close': '✖ Close',
  'travel.empty': '🔒 Finish this world to unlock travel',
  'travel.takeoff': 'Taking off!',
  'travel.leaveRoom': '🌐 Leave the room to travel ✈️',
  'sign.airport': '✈️ AIRPORT',
  'sign.welcome1': 'WELCOME TO',
  'sign.welcome2': 'IMMOKALEE, FL',
  'online.room': '🚪 Room',
  'online.join': 'Join ➤',
  'online.full': 'Full',
  'online.roomFull': '🚫 Room is full, try another.',
  'touch.jump': 'JUMP',
});
addStrings('pt', {
  'app.tagline': 'Explore, construa e viva na sua cidade! 🌍',
  'menu.play': '🚀 JOGAR',
  'menu.chars': '🎨 PERSONAGENS',
  'menu.online': '🌐 JOGAR ONLINE',
  'menu.howto': '❓ COMO JOGAR',
  'menu.download': '📲 BAIXAR O APP',
  'menu.musicOn': '🎵 Música: ON',
  'menu.musicOff': '🎵 Música: OFF',
  'menu.logout': '🚪 Sair da conta',
  'menu.lang': '🌍 Idioma:',
  'menu.langSet': '🌍 Idioma: {n}',
  'menu.soon': '📲 EM BREVE NO GOOGLE PLAY',
  'menu.chooseWorld': 'Escolha seu mundo 🌍',
  'menu.lockedTail': 'Termine o anterior',
  'hud.world': 'Mundo {n}',
  'pause.title': '⏸️ Pausa',
  'pause.resume': '▶ Continuar',
  'pause.restart': '📍 Voltar ao início',
  'pause.leaveRoom': '🚪 Sair da sala',
  'pause.quit': '🏠 Voltar ao menu',
  'win.title': '🏆 Fase completa!',
  'win.gameDone': '🏆 JOGO COMPLETO!',
  'win.newBest': '⭐ NOVO RECORDE! ⭐',
  'win.time': '⏱️ Tempo:',
  'win.best': '🥇 Melhor tempo:',
  'win.coins': '🪙 Moedas da fase:',
  'win.next': '➡ Próximo mundo',
  'win.replay': '🔄 Jogar de novo',
  'win.menu': '🏠 Menu',
  'how.title': '❓ Como jogar',
  'how.close': 'Entendi!',
  'toast.locked': '🔒 Termine o mundo anterior',
  'toast.go': '🏁 Vai!',
  'toast.checkpoint': '🚩 Ponto de controle!',
  'toast.fall': '💥 Opa! De volta ao controle',
  'toast.needCoins': '🪙 Moedas insuficientes: jogue as fases',
  'toast.bought': '🎉 Comprado: {n}!',
  'custom.myChars': '⭐ Meus personagens',
  'custom.free': 'Personagem livre',
  'custom.family': '👪 Família',
  'custom.chute': '🪂 Paraquedas',
  'custom.chuteSub': '(grátis: abre sozinho ao cair de muito alto)',
  'custom.hats': '🎩 Chapéus',
  'custom.trails': '✨ Rastros',
  'custom.body': '🎨 Cor',
  'shop.hat.none': 'Nada',
  'shop.hat.cap': 'Boné',
  'shop.hat.tophat': 'Cartola',
  'shop.hat.headphones': 'Fones de ouvido',
  'shop.hat.crown': 'Coroa',
  'shop.trail.none': 'Sem rastro',
  'shop.trail.sparkle': 'Faíscas',
  'shop.trail.fire': 'Fogo',
  'shop.trail.rainbow': 'Arco-íris',
  'level.desc.1': 'A cidade que nunca dorme',
  'level.desc.2': 'Não toque na lava!',
  'level.desc.3': 'Um mundo de doces',
  'level.desc.4': 'A cidade do sol ☀️',
  'level.desc.5': 'Copán e as praias de Roatán',
  'level.desc.6': 'Chichén Itzá e muita festa',
  'level.desc.7': 'A Estátua da Liberdade 🗽',
  'level.desc.8': 'A Sagrada Família ⛪',
  'level.desc.9': 'Montanha de neve ❄️🏔️',
  'veh.board': 'SUBIR',
  'veh.exit': 'DESCER',
  'veh.travel': '✈️ VIAJAR',
  'veh.electric': '⚡ ELÉTRICO',
  'travel.title': '✈️ Para onde vamos voar?',
  'travel.close': '✖ Fechar',
  'travel.empty': '🔒 Termine este mundo para desbloquear as viagens',
  'travel.takeoff': 'Decolando!',
  'travel.leaveRoom': '🌐 Saia da sala para viajar ✈️',
  'sign.airport': '✈️ AEROPORTO',
  'sign.welcome1': 'BEM-VINDO A',
  'sign.welcome2': 'IMMOKALEE, FL',
  'online.room': '🚪 Sala',
  'online.join': 'Entrar ➤',
  'online.full': 'Cheia',
  'online.roomFull': '🚫 Sala cheia, tente outra.',
  'touch.jump': 'PULAR',
});
addStrings('fr', {
  'app.tagline': "Explore, construis et vis dans ta ville ! 🌍",
  'menu.play': '🚀 JOUER',
  'menu.chars': '🎨 PERSONNAGES',
  'menu.online': '🌐 JOUER EN LIGNE',
  'menu.howto': '❓ COMMENT JOUER',
  'menu.download': "📲 TÉLÉCHARGER L'APP",
  'menu.musicOn': '🎵 Musique : ON',
  'menu.musicOff': '🎵 Musique : OFF',
  'menu.logout': '🚪 Se déconnecter',
  'menu.lang': '🌍 Langue :',
  'menu.langSet': '🌍 Langue : {n}',
  'menu.soon': '📲 BIENTÔT SUR GOOGLE PLAY',
  'menu.chooseWorld': 'Choisis ton monde 🌍',
  'menu.lockedTail': 'Termine le précédent',
  'hud.world': 'Monde {n}',
  'pause.title': '⏸️ Pause',
  'pause.resume': '▶ Continuer',
  'pause.restart': '📍 Retour au départ',
  'pause.leaveRoom': '🚪 Quitter la salle',
  'pause.quit': '🏠 Retour au menu',
  'win.title': '🏆 Niveau terminé !',
  'win.gameDone': '🏆 JEU TERMINÉ !',
  'win.newBest': '⭐ NOUVEAU RECORD ! ⭐',
  'win.time': '⏱️ Temps :',
  'win.best': '🥇 Meilleur temps :',
  'win.coins': '🪙 Pièces du niveau :',
  'win.next': '➡ Monde suivant',
  'win.replay': '🔄 Rejouer',
  'win.menu': '🏠 Menu',
  'how.title': '❓ Comment jouer',
  'how.close': 'Compris !',
  'toast.locked': '🔒 Termine le monde précédent',
  'toast.go': '🏁 C’est parti !',
  'toast.checkpoint': '🚩 Point de contrôle !',
  'toast.fall': '💥 Oups ! Retour au contrôle',
  'toast.needCoins': '🪙 Pas assez de pièces : joue aux niveaux',
  'toast.bought': '🎉 Acheté : {n} !',
  'custom.myChars': '⭐ Mes personnages',
  'custom.free': 'Personnage libre',
  'custom.family': '👪 Famille',
  'custom.chute': '🪂 Parachute',
  'custom.chuteSub': '(gratuit : s’ouvre tout seul en cas de grande chute)',
  'custom.hats': '🎩 Chapeaux',
  'custom.trails': '✨ Traînées',
  'custom.body': '🎨 Couleur',
  'shop.hat.none': 'Rien',
  'shop.hat.cap': 'Casquette',
  'shop.hat.tophat': 'Haut-de-forme',
  'shop.hat.headphones': 'Casque audio',
  'shop.hat.crown': 'Couronne',
  'shop.trail.none': 'Aucune',
  'shop.trail.sparkle': 'Étincelles',
  'shop.trail.fire': 'Feu',
  'shop.trail.rainbow': 'Arc-en-ciel',
  'level.desc.1': 'La ville qui ne dort jamais',
  'level.desc.2': 'Ne touche pas la lave !',
  'level.desc.3': 'Un monde en bonbons',
  'level.desc.4': 'La ville du soleil ☀️',
  'level.desc.5': 'Copán et les plages de Roatán',
  'level.desc.6': 'Chichén Itzá et la fête',
  'level.desc.7': 'La Statue de la Liberté 🗽',
  'level.desc.8': 'La Sagrada Familia ⛪',
  'level.desc.9': 'Montagne de neige ❄️🏔️',
  'veh.board': 'MONTER',
  'veh.exit': 'DESCENDRE',
  'veh.travel': '✈️ VOYAGER',
  'veh.electric': '⚡ ÉLECTRIQUE',
  'travel.title': '✈️ Où volons-nous ?',
  'travel.close': '✖ Fermer',
  'travel.empty': '🔒 Termine ce monde pour débloquer les voyages',
  'travel.takeoff': 'Décollage !',
  'travel.leaveRoom': '🌐 Quitte la salle pour voyager ✈️',
  'sign.airport': '✈️ AÉROPORT',
  'sign.welcome1': 'BIENVENUE À',
  'sign.welcome2': 'IMMOKALEE, FL',
  'online.room': '🚪 Salle',
  'online.join': 'Entrer ➤',
  'online.full': 'Pleine',
  'online.roomFull': '🚫 Salle pleine, essaie une autre.',
  'touch.jump': 'SAUTER',
});

/* ---- nombres y descripciones de mundos (4 idiomas) ---- */
addStrings('es', {
  'world.n0': 'Ciudad Neón', 'world.d0': 'La ciudad que nunca duerme',
  'world.n1': 'Volcán de Lava', 'world.d1': '¡No toques la lava!',
  'world.n2': 'Dulce Hielo', 'world.d2': 'Un mundo de caramelo',
  'world.n3': 'Immokalee, FL', 'world.d3': 'El pueblo del sol ☀️',
  'world.n4': 'Honduras', 'world.d4': 'Copán y las playas de Roatán',
  'world.n5': 'México', 'world.d5': 'Chichén Itzá y mucha fiesta',
  'world.n6': 'USA', 'world.d6': 'La Estatua de la Libertad 🗽',
  'world.n7': 'España', 'world.d7': 'La Sagrada Familia ⛪',
  'world.n8': 'Montaña Nevada', 'world.d8': '¡Nieve, esquí y trineo! 🏔️',
});
addStrings('en', {
  'world.n0': 'Neon City', 'world.d0': 'The city that never sleeps',
  'world.n1': 'Lava Volcano', 'world.d1': "Don't touch the lava!",
  'world.n2': 'Sweet Ice', 'world.d2': 'A candy world',
  'world.n3': 'Immokalee, FL', 'world.d3': 'The sunny town ☀️',
  'world.n4': 'Honduras', 'world.d4': 'Copán and the beaches of Roatán',
  'world.n5': 'Mexico', 'world.d5': 'Chichén Itzá and lots of fun',
  'world.n6': 'USA', 'world.d6': 'The Statue of Liberty 🗽',
  'world.n7': 'Spain', 'world.d7': 'La Sagrada Familia ⛪',
  'world.n8': 'Snowy Mountain', 'world.d8': 'Snow, skiing and sledding! 🏔️',
});
addStrings('pt', {
  'world.n0': 'Cidade Neon', 'world.d0': 'A cidade que nunca dorme',
  'world.n1': 'Vulcão de Lava', 'world.d1': 'Não toque na lava!',
  'world.n2': 'Doce Gelo', 'world.d2': 'Um mundo de doces',
  'world.n3': 'Immokalee, FL', 'world.d3': 'A cidade do sol ☀️',
  'world.n4': 'Honduras', 'world.d4': 'Copán e as praias de Roatán',
  'world.n5': 'México', 'world.d5': 'Chichén Itzá e muita festa',
  'world.n6': 'EUA', 'world.d6': 'A Estátua da Liberdade 🗽',
  'world.n7': 'Espanha', 'world.d7': 'A Sagrada Família ⛪',
  'world.n8': 'Montanha Nevada', 'world.d8': 'Neve, esqui e trenó! 🏔️',
});
addStrings('fr', {
  'world.n0': 'Cité Néon', 'world.d0': 'La ville qui ne dort jamais',
  'world.n1': 'Volcan de Lave', 'world.d1': 'Ne touche pas la lave !',
  'world.n2': 'Glace Sucrée', 'world.d2': 'Un monde de bonbons',
  'world.n3': 'Immokalee, FL', 'world.d3': 'La ville du soleil ☀️',
  'world.n4': 'Honduras', 'world.d4': 'Copán et les plages de Roatán',
  'world.n5': 'Mexique', 'world.d5': 'Chichén Itzá et la fête',
  'world.n6': 'USA', 'world.d6': 'La Statue de la Liberté 🗽',
  'world.n7': 'Espagne', 'world.d7': 'La Sagrada Familia ⛪',
  'world.n8': 'Montagne Enneigée', 'world.d8': 'Neige, ski et luge ! 🏔️',
});
/* nombres/descripciones de mundos (con fallback a los textos fijos) */
function wname(idx) { const l = (typeof LEVELS !== 'undefined') ? LEVELS[idx] : null; return l ? (l.nameKey ? T(l.nameKey) : l.name) : ''; }
function wdesc(idx) { const l = (typeof LEVELS !== 'undefined') ? LEVELS[idx] : null; return l ? (l.descKey ? T(l.descKey) : l.desc) : ''; }
