# 💳 Guía: activar pagos REALES en GEAYI

> Todo está preparado pero **APAGADO**. El juego sigue en modo DEMO
> (no se cobra dinero real) hasta que TÚ completes estos pasos y me
> digas que lo active.

## Lo que ya está listo en el juego
- Pases (VIP 👑 $4.99, Vuelo 🕊️ $2.99, Constructor 🧱 $3.99).
- Paquetes de monedas (500/$0.99, 1,200/$1.99, 3,000/$4.99, 10,000/$9.99).
- PIN parental obligatorio antes de cualquier compra.
- `payments-live.js` con interruptor `LIVE = false` (apagado).

## Pasos (los haces tú, a tu ritmo)

### 1. Crea el worker en Cloudflare
1. Entra a tu cuenta de Cloudflare (la misma de El Chulo).
2. Ve a **Workers** → **Create** → **Create Worker**.
3. Ponle nombre, por ejemplo: `pagos-geayi`.
4. Borra el código de ejemplo y pega TODO el contenido del archivo
   `worker-pagos-geayi.js` (está en la carpeta del juego).
5. Guarda (no despliegues todavía).

### 2. Agrega tu clave secreta (SOLO TÚ, jamás por chat)
1. En tu worker, entra a **Settings** → **Variables and Secrets**.
2. Agrega un secreto nuevo:
   - Nombre: `SQUARE_ACCESS_TOKEN`
   - Valor: tu **Access Token** de Square (el de Geayi Games, el que
     solo tú tienes — el mismo tipo de clave que usaste para El Chulo).
3. Opcional: agrega la variable `ALLOWED_ORIGIN` con la dirección fija
   de tu juego (ej. `https://geayi-obby.netlify.app`). Si la dejas vacía,
   el worker acepta cualquier origen.
4. **Deploy** el worker.
5. Copia la URL del worker (ej. `https://pagos-geayi.tu-cuenta.workers.dev`).

### 3. Prueba que el worker vive
Abre en el navegador: `https://TU-WORKER.workers.dev/health`
Debe decir: `{"ok":true,"service":"geayi-pagos",...}`

### 4. Aprueba el dominio fijo del juego en Square
1. Entra a tu panel de Square (Geayi Games).
2. Agrega la **dirección fija** del juego como dominio aprobado para
   pagos web (igual que hiciste con elchulobeef.com para El Chulo).
3. ⚠️ Los enlaces temporales de prueba NO sirven para cobrar de verdad:
   el juego necesita una dirección permanente.

### 5. Conecta el juego con el worker
1. Abre `payments-live.js` en la carpeta del juego.
2. En `WORKER_URL: ''` pega entre comillas la URL de tu worker.
3. **NO cambies `LIVE = false`.** Sigue apagado.

### 6. Haz una compra real pequeña de prueba
1. Sube el juego con el `WORKER_URL` ya puesto (te paso el enlace).
2. Compra el paquete más barato (500 🪙 por $0.99).
3. Verifica en tu panel de Square que el cobro aparece.
4. Verifica en el juego que las 500 monedas llegaron.

### 7. Activar (solo cuando TÚ lo ordenes)
Cuando me digas **"activa los pagos reales"**, cambio `LIVE` a `true`
y subo la versión. Ni un minuto antes.

## Reglas que no cambian
- 🔒 **PIN parental** sigue obligatorio para toda compra.
- 🔑 Tu clave secreta **nunca** va en el código del juego ni se manda por chat.
- 💵 Las monedas compradas **no** se pueden cambiar de vuelta a dólares.
- 📱 **Si el juego sale en Play Store**: dentro de la app los cobros
  deben usar **Google Play Billing** (Google se queda el 30%).
  Square es solo para la versión web.
- 🧾 Los cobros con tarjeta pagan **2.9% + $0.30** por venta (igual que El Chulo).
