# Pruebas de GEAYI: Obby Xtreme 3D

Harness Node con stubs de THREE/DOM. Corren sin navegador:

- `p3test.js` — 147 pruebas: 9 mundos, ruta extrema (física), power-ups,
  retos de mate/colores, i18n, trineo, viajes, trofeos, vehículos/aeropuertos/NPCs,
  accesibilidad de botones/puertas.
- `modtest.js` — 11 pruebas: carga y updates de casa, pets, fishing, racing,
  weather, observatory, ranch.
- `boottest.js` — integración total: boot(), startLevel, cuadro completo,
  winLevel (trofeo), idiomas, personalizar, panel de trofeos.
- `boattest.js` — lanchas rápidas GEAYI 🚤 + mini-carreras en el Lago Trafford:
  38 pruebas (tipos registrados, circuito de boyas, SUBIR/manejar, 3 vueltas,
  récord en SAVE.bestBoatLap, premio +30 🪙, sin reinicio automático, i18n).
- `worldstress.js` — los 9 mundos: startLevel + 60 cuadros sin errores.
- `powerstest.js` — superpoderes GEAYI ⚡: 109 pruebas (carga limpia, i18n es/en,
  SAVE.powers/SAVE.activePowers, desbloqueo con monedas 200–500 🪙, desbloqueo
  gratis al pasar mundos 1/2/3/5/7, activación de ⚡🧲🐸🛡️💨, dash con cooldown,
  integración física en player.js, escudo real contra lava/caídas, FX y limpieza,
  panel de poderes, 120 cuadros sin errores).
- `chutetest.js` — el paracaídas se despliega y frena la caída.
- `traintest.js` — tren GEAYI EXPRESS 🚂 (Ciudad Neón): 41 pruebas
  (circuito continuo, construcción solo en idx 0, avance y paradas de ~8 s,
  SUBIR solo detenido y cerca, el jugador sigue al vagón al viajar,
  BAJAR deja en el andén, limpieza al cambiar de mundo, sintaxis).
- `planedir.js` — script auxiliar (dirección de cabeceo del avión).
- `outfittest.js` — 15 pruebas: prendas premium por parte del cuerpo
  (sombrero+chaqueta+botas+bufanda combinables, misma parte reemplaza,
  quitar no afecta las demás), botas atadas a las piernas (ocultan los tenis
  base y vuelven al quitarlas), objeto agarrado en la mano del avatar
  (tamaño de mano, se restaura al soltar) y catálogo con 12 productos.
- `camdragtest.js` — 8 pruebas: el 360° (arrastrar la cámara) funciona con el
  joystick activo (el dedo del joystick se ignora por su touch identifier),
  pellizco = zoom sin girar, tap para tocar cosas sigue vivo.
- `colortest.js` — 3 pruebas: manejo de color correcto activado
  (ColorManagement.legacyMode = false), renderer con salida sRGB y texturas
  de canvas marcadas sRGB (colores vivos, sin lavado pastel).
- `biketest.js` — 7 pruebas: la bici orientada a la marcha (faro y manillar al
  frente +z, asiento atrás), sin tablas planas de 1 m (sin "caparazón"),
  salpicaderas curvas sobre las ruedas, 2 ruedas con rayos y bielas/pedales.

Uso: `cd tests && node p3test.js` (requiere `stubs.js` en la misma carpeta;
los scripts usan rutas absolutas a `~/workspace/your_files/obby-3d/`).
