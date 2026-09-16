/* =========================================================================
   CANDY — "Colores Caramelo" para GEAYI Obby Xtreme 3D
   -------------------------------------------------------------------------
   Módulo global `Candy` (100% original, sin dependencias externas):
   - Candy.init()          → sube la iluminación global de forma segura
                              (intensifica las luces existentes; si no hay,
                              agrega las suyas). Idempotente.
   - Candy.apply(group)    → convierte MeshLambert/Standard a MeshPhong
                              glossy con colores ~35% más saturados.
                              Respeta material.userData.noCandy.
                              Cachea materiales por color (sin duplicados).
   - Candy.box(w,h,d,color)→ cubo caramelo: geometría compartida por
                              dimensiones + material glossy cacheado.
   - Candy.sign(text,opts) → letrero caramelo (CanvasTexture: texto grueso,
                              borde blanco, fondo degradado vivo).
   - Candy.css()           → string CSS para el menú (botones/paneles con
                              más saturación, brillo y glow de texto).
   - Candy.saturate(hex,amt) → util pública: sube la saturación de un color.
   Rendimiento: todo el trabajo es al construir; NADA por frame.
   NO ejecuta nada al cargar: el integrador llama a Candy.init() desde boot().
   ========================================================================= */
const Candy = (function () {
  'use strict';

  /* ---------- utilidades de color (puras, sin THREE) ---------- */
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const l = (mx + mn) / 2;
    let h = 0, s = 0;
    if (mx !== mn) {
      const d = mx - mn;
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h /= 6;
    }
    return [h, s, l];
  }
  function hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) { r = g = b = l; }
    else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      const hue = (t) => {
        if (t < 0) t += 1; if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      r = hue(h + 1 / 3); g = hue(h); b = hue(h - 1 / 3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }
  /* Sube la saturación de un color hex en `amt` (0.35 = +35%). */
  function saturate(hex, amt) {
    if (typeof hex !== 'number' || !isFinite(hex)) return 0xffffff;
    hex = hex & 0xffffff;
    if (amt == null) amt = 0.35;
    const hsl = rgbToHsl((hex >> 16) & 255, (hex >> 8) & 255, hex & 255);
    hsl[1] = Math.min(1, hsl[1] * (1 + amt));
    const rgb = hslToRgb(hsl[0], hsl[1], hsl[2]);
    return ((rgb[0] << 16) | (rgb[1] << 8) | rgb[2]) >>> 0;
  }
  /* Lee el color hex de un material (acepta THREE.Color o número crudo). */
  function colorHexOf(mat) {
    if (!mat || mat.color == null) return 0xffffff;
    const c = mat.color;
    if (typeof c === 'number') return c & 0xffffff;
    if (typeof c.getHex === 'function') { try { return c.getHex() & 0xffffff; } catch (e) { return 0xffffff; } }
    return 0xffffff;
  }

  /* ---------- cachés (geometrías y materiales compartidos) ---------- */
  const geoCache = {};   // "w|h|d" -> BoxGeometry
  const matCache = {};   // "hex|t|op" -> MeshPhongMaterial glossy
  function geoKey(w, h, d) {
    return w.toFixed(2) + '|' + h.toFixed(2) + '|' + d.toFixed(2);
  }
  function candyMaterial(hex, src) {
    hex = hex & 0xffffff;
    const hasMap = !!(src && src.map);
    const t = src && src.transparent ? 1 : 0;
    const op = src && typeof src.opacity === 'number' ? Math.round(src.opacity * 100) / 100 : 1;
    const key = hex.toString(16) + '|' + t + '|' + op;
    if (!hasMap && matCache[key]) return matCache[key];
    const sat = saturate(hex, 0.35);
    const m = new THREE.MeshPhongMaterial({
      color: sat,
      map: hasMap ? src.map : null,
      shininess: 95,                 // glossy caramelo (rango 80-110)
      specular: 0x99ddff,            // specular claro celeste
      emissive: sat,                 // toque de brillo propio
      emissiveIntensity: 0.07,
      transparent: t === 1,
      opacity: op
    });
    m.userData = m.userData || {};
    m.userData.candy = true;
    if (!hasMap) matCache[key] = m;
    return m;
  }
  function isConvertible(m) {
    if (!m || m.isMeshPhongMaterial) return false;
    if (m.isMeshStandardMaterial || m.isMeshLambertMaterial) return true;
    const n = m.constructor && m.constructor.name;
    return n === 'MeshStandardMaterial' || n === 'MeshLambertMaterial';
  }

  /* ---------- detección de luces (real + stubs de test) ---------- */
  function isLight(o) {
    if (!o) return false;
    if (o.isLight === true) return true;
    const n = o.constructor && o.constructor.name;
    return typeof n === 'string' && /Light$/.test(n);
  }
  function lightKind(l) {
    if (l.isHemisphereLight) return 'hemi';
    if (l.isAmbientLight) return 'amb';
    if (l.isDirectionalLight || l.isPointLight || l.isSpotLight) return 'dir';
    return 'unknown';
  }

  /* ---------- API pública ---------- */
  const api = {
    /* Expuesta para tests y para uso externo. */
    saturate: saturate,

    /* Sube la iluminación global de forma segura. Idempotente: no duplica
       luces ni re-sube intensidades en llamadas repetidas. */
    init: function () {
      if (typeof scene === 'undefined' || !scene || typeof scene.traverse !== 'function') return 0;
      if (typeof THREE === 'undefined') return 0;
      let found = 0;
      scene.traverse(function (o) {
        if (!isLight(o)) return;
        o.userData = o.userData || {};
        if (o.userData.candyBoosted) { found++; return; }
        const kind = lightKind(o);
        const base = (typeof o.intensity === 'number' && o.intensity > 0) ? o.intensity : 1;
        const mult = kind === 'hemi' ? 1.35 : kind === 'amb' ? 1.3 : 1.5;
        o.intensity = Math.min(base * mult, 3.2);
        o.userData.candyBoosted = true;
        found++;
      });
      if (found === 0) {
        /* No había luces: agregar las propias (no se repiten por el flag). */
        const hemi = new THREE.HemisphereLight(0xffffff, 0xffe6c8, 1.5);
        const sun = new THREE.DirectionalLight(0xffffff, 1.4);
        if (sun.position && sun.position.set) sun.position.set(38, 48, 24);
        hemi.userData = { candyBoosted: true, candyLight: true };
        sun.userData = { candyBoosted: true, candyLight: true };
        scene.add(hemi); scene.add(sun);
        found = 2;
      }
      return found;
    },

    /* Convierte materiales del grupo a caramelo glossy. Devuelve nº de
       materiales convertidos. Respeta material.userData.noCandy. */
    apply: function (group) {
      if (!group || typeof group.traverse !== 'function') return 0;
      if (typeof THREE === 'undefined') return 0;
      let n = 0;
      group.traverse(function (obj) {
        const m = obj.material;
        if (!m || isLight(obj)) return;
        if (Array.isArray(m)) {
          let changed = false;
          const out = m.map(function (mt) {
            if (mt && mt.userData && mt.userData.noCandy) return mt;
            if (!isConvertible(mt)) return mt;
            changed = true; n++;
            return candyMaterial(colorHexOf(mt), mt);
          });
          if (changed) obj.material = out;
        } else {
          if (m.userData && m.userData.noCandy) return;
          if (!isConvertible(m)) return;
          obj.material = candyMaterial(colorHexOf(m), m);
          n++;
        }
      });
      return n;
    },

    /* Cubo caramelo: geometría compartida por dimensiones + material
       glossy cacheado por color. Barato para Android. */
    box: function (w, h, d, color) {
      w = w || 1; h = h || 1; d = d || 1;
      const key = geoKey(w, h, d);
      let g = geoCache[key];
      if (!g) { g = new THREE.BoxGeometry(w, h, d); geoCache[key] = g; }
      const mesh = new THREE.Mesh(g, candyMaterial(color == null ? 0xffffff : color, null));
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.candyBox = true;
      return mesh;
    },

    /* Letrero caramelo: texto grueso con borde blanco sobre degradado vivo. */
    sign: function (text, opts) {
      opts = opts || {};
      const w = opts.w || 6, h = opts.h || 3;
      const cw = 512, ch = 256;
      const c = document.createElement('canvas');
      c.width = cw; c.height = ch;
      const g = c.getContext('2d');
      const bg = opts.bg || ['#ff4d9d', '#b04dff'];
      const grad = g.createLinearGradient(0, 0, cw, ch);
      grad.addColorStop(0, bg[0]);
      grad.addColorStop(1, bg.length > 1 ? bg[1] : bg[0]);
      g.fillStyle = grad;
      g.fillRect(0, 0, cw, ch);
      /* marco blanco grueso */
      g.lineWidth = 16;
      g.strokeStyle = opts.border || '#ffffff';
      g.strokeRect(14, 14, cw - 28, ch - 28);
      /* texto grueso: relleno vivo + contorno blanco */
      const lines = String(text == null ? '' : text).split('\n');
      let fs = opts.fontSize || 92;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      const family = opts.font || '"Arial Black", Arial, sans-serif';
      const fits = function () {
        g.font = '900 ' + fs + 'px ' + family;
        for (const ln of lines) {
          if (g.measureText(ln).width > cw - 70) return false;
        }
        return true;
      };
      while (fs > 24 && !fits()) fs -= 6;
      g.font = '900 ' + fs + 'px ' + family;
      const cy = ch / 2 - (lines.length - 1) * fs * 0.62;
      lines.forEach(function (ln, i) {
        const y = cy + i * fs * 1.24;
        g.lineWidth = Math.max(8, fs * 0.14);
        g.strokeStyle = '#ffffff';
        g.strokeText(ln, cw / 2, y);
        g.fillStyle = opts.fg || '#ffe600';
        g.fillText(ln, cw / 2, y);
      });
      const tex = new THREE.CanvasTexture(c);
      if (typeof maxAniso === 'function') { try { tex.anisotropy = maxAniso(); } catch (e) {} }
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide })
      );
      mesh.userData.isSign = true;
      mesh.userData.candy = true;
      return mesh;
    },

    /* CSS para el menú: botones y paneles con más saturación/brillo + glow.
       El integrador pega este string en styles.css (o lo inyecta en <style>). */
    css: function () {
      return [
        '/* ===== COLORES CARAMELO (módulo Candy) ===== */',
        '.candy-panel{',
        '  background:linear-gradient(135deg,#ff4d9d 0%,#b04dff 50%,#2fd7ff 100%);',
        '  border:3px solid #ffffff;border-radius:18px;',
        '  box-shadow:0 0 24px rgba(255,77,157,.55),0 6px 18px rgba(0,0,0,.35);',
        '  color:#fff;',
        '  text-shadow:0 0 12px rgba(255,255,255,.9),0 2px 4px rgba(0,0,0,.45);',
        '}',
        '.candy-btn{',
        '  min-height:52px;min-width:52px;padding:12px 22px;',
        '  font-size:20px;font-weight:900;color:#fff;',
        '  background:linear-gradient(180deg,#ff7ab8 0%,#ff2e88 55%,#d1006b 100%);',
        '  border:3px solid #fff;border-radius:16px;',
        '  text-shadow:0 0 10px rgba(255,255,255,.85),0 2px 3px rgba(0,0,0,.4);',
        '  box-shadow:0 0 18px rgba(255,46,136,.6),0 4px 0 rgba(0,0,0,.25);',
        '  cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;',
        '}',
        '.candy-btn:active{transform:scale(.96);}',
        '.candy-btn.alt{background:linear-gradient(180deg,#5ee7ff 0%,#1fa8ff 55%,#0b6fd6 100%);',
        '  box-shadow:0 0 18px rgba(31,168,255,.6),0 4px 0 rgba(0,0,0,.25);}',
        '.candy-title{',
        '  font-weight:900;color:#fff;',
        '  text-shadow:0 0 14px #ff2e88,0 0 30px #b04dff,0 3px 5px rgba(0,0,0,.5);',
        '}'
      ].join('\n');
    }
  };

  return api;
})();
/* `Candy` queda global (script plano, como el resto de módulos del juego). */
