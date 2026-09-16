# 🆘 Guía: Soporte técnico + Apelaciones de GEAYI

Cómo poner en marcha el sistema de soporte del juego: la pantalla de
**🆘 AYUDA** ya viene en el juego, pero las **apelaciones con verificación
de datos reales** necesitan un servidorcito (worker) como el de El Chulo.
Gratis en el plan free de Cloudflare.

---

## Los 2 niveles de resolución (nadie espera, nadie se va del juego)

- **Nivel 1 — automático ⚡:** si es la primera vez que silencian al jugador y el motivo es **leve** (contacto, coqueteo, encuentro, dinero), el juego lo **perdona al instante**, sin formularios ni email, con un mensaje educativo. Esto resuelve ~el 90% en segundos.
- **Nivel 2 — manual 🧑‍⚖️:** si ya usó su perdón o es reincidente, apela con **datos reales verificados** (código de 6 dígitos al email) y **tú la revisas en lote, cuando puedas**, desde tu teléfono. Sin prisa: el silencio dura solo **5 minutos** y ya pasó solo.
- **Tú solo atiendes el nivel 2.** El nivel 1 no te necesita.

---

## Parte 1 — Crear el worker (5 minutos)

1. Entra a **dash.cloudflare.com** → **Workers & Pages** → **Create** → **Create Worker** → ponle de nombre `soporte-geayi` → **Deploy**.
2. En el worker, toca **Edit code**, **borra todo** y pega el contenido completo del archivo **`worker-soporte-geayi.js`** (está en la carpeta del juego).
3. Toca **Deploy** (arriba a la derecha). Si no hay errores, el worker ya vive.

## Parte 2 — Crear el KV (la "memoria" del worker)

4. En el menú izquierdo de Cloudflare entra a **Workers & Pages** → **KV** → **Create a namespace** → nombre: `SOPORTE_KV` → **Add**.
5. Vuelve a tu worker `soporte-geayi` → pestaña **Settings** → **Bindings** → **Add binding** → **KV namespace** → variable name: `SOPORTE_KV` → namespace: el que acabas de crear → **Add binding**.

## Parte 3 — Poner los 4 secretos (tú, en Cloudflare, jamás por chat)

6. En tu worker → **Settings** → **Variables and Secrets** → **Add variable** (tipo **Secret**, no texto normal). Agrega estos 4, uno por uno:
   - `RESEND_API_KEY` → tu clave de Resend (la misma que usas para El Chulo sirve).
   - `ADMIN_KEY` → una clave que **tú inventes** (ej: una frase larga con números). Solo tú la sabrás; es la que abre el panel de apelaciones.
   - `NOTIFY_EMAIL` → tu correo (ej: el tuyo de Gmail). Aquí te llegará el aviso de cada apelación nueva.
   - `SUPPORT_FROM` → el remitente del código. **Debe ser de un dominio verificado en Resend.** Ya tienes `elchulobeef.com` verificado, así que puedes usar `soporte@elchulobeef.com`.
7. Después de agregar los 4, toca **Deploy** otra vez para que tomen efecto.

## Parte 4 — Probar que vive

8. Abre en tu teléfono: `https://soporte-geayi.TU-CUENTA.workers.dev/health` (cambia TU-CUENTA por tu subdominio de Cloudflare). Debe decir `{"ok":true,"service":"geayi-soporte",...}`.

## Parte 5 — Conectar el juego (me pasas la URL)

9. **Cópiame la URL del worker** (la del paso 8) y yo la pego en `support.js` en `Support.WORKER_URL`. A partir de ahí las apelaciones funcionarán de verdad.

## Parte 6 — Revisar apelaciones (tu panel)

10. Abre el archivo **`admin-soporte.html`** en tu teléfono (Chrome).
11. Escribe la URL del worker y tu `ADMIN_KEY` → **Guardar y cargar**. Se quedan guardadas solo en tu teléfono.
12. Verás la lista de apelaciones con **datos verificados ✅** (el email ya fue comprobado con el código). Toca **✅ Aprobar** o **❌ Rechazar**.
    - Si apruebas: al jugador se le quita el silencio y le sale "🎉 Apelación aprobada".
    - Si rechazas: el bloqueo sigue su curso normal.

---

## Reglas que ya quedaron en el código

- Solo se pueden apelar bloqueos **leves**: contacto, coqueteo, encuentro, dinero.
- Los bloqueos **graves** (secuestro, sexual, violencia, fotos) **nunca** se pueden apelar.
- El código de 6 dígitos vence en **10 minutos**.
- Límite anti-abuso: 3 códigos por hora por email, 10 por hora por IP.
- Sin el worker conectado, la apelación se **guarda en el teléfono** del jugador y le avisa que se enviará después.
