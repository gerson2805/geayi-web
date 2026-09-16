/* player.js — avatar y física del jugador (+ constructor reutilizable para multijugador) */
'use strict';

/* ---------- constructor de avatar reutilizable ----------
   createAvatarMesh({ body, hat }) → THREE.Group listo para la escena.
   Lo usa el jugador local y también los jugadores remotos del modo online.
   Las partes animables quedan en group.userData.parts. */
/* ---------- texturas de cara (retratos de la familia) ----------
   La cara del bloque usa el retrato caricaturesco del personaje.
   Se cachean para no recargar la imagen por cada avatar. */
const _faceTexCache = {};
function loadFaceTexture(path) {
  if (!path) return null;
  if (_faceTexCache[path] !== undefined) return _faceTexCache[path];
  let tex = null;
  try {
    if (typeof THREE !== 'undefined' && THREE.TextureLoader) {
      tex = new THREE.TextureLoader().load(path);
      try { if (THREE.SRGBColorSpace !== undefined) tex.colorSpace = THREE.SRGBColorSpace; else if (THREE.sRGBEncoding !== undefined) tex.encoding = THREE.sRGBEncoding; } catch (e) {}
    }
  } catch (e) { tex = null; }
  _faceTexCache[path] = tex;
  return tex;
}

function createAvatarMesh(style) {
  style = style || {};
  if (style.species === 'dog') return createDogMesh(style);
  if (style.species === 'cuyo') return createCuyoMesh(style);
  if (style.species === 'bear') return createBearMesh(style);
  if (style.species === 'turtle') return createTurtleMesh(style);
  if (style.species === 'panther') return createPantherMesh(style);
  const body = style.body || '#ff5533';
  const fam = typeof style.skin === 'string';   // modo personaje familiar
  const g = new THREE.Group();
  const parts = {};
  const mat = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, metalness: 0.05 });
  const skinC = fam ? style.skin : shade(body, 26);
  const torsoC = fam ? style.shirt : body;
  const legC = fam ? style.pants : shade(body, -22);
  const shoeC = fam ? style.shoes : shade(body, -45);
  const outfit = style.outfit || (fam ? (style.kid ? 'hoodie' : 'jacket') : 'tee');
  const shadeCss = (c, f) => { // oscurece/aclara un '#rrggbb' sin depender de THREE.Color
    const n = parseInt(String(c).replace('#', ''), 16) || 0;
    const ch = v => Math.min(255, Math.max(0, Math.round(v * f)));
    return '#' + ((1 << 24) + (ch((n >> 16) & 255) << 16) + (ch((n >> 8) & 255) << 8) + ch(n & 255)).toString(16).slice(1);
  };
  const darkC = c => shadeCss(c, 0.68);   // tono oscuro del color
  const liteC = c => shadeCss(c, 1.22);   // tono claro del color
  const skinM = mat(skinC), shirtM = mat(torsoC), pantsM = mat(legC), shoeM = mat(shoeC);
  const darkShirtM = mat(darkC(torsoC)), darkPantsM = mat(darkC(legC));
  const hairM = fam && style.hair ? mat(style.hair) : null;
  const soleM = mat('#f4f4f4');

  // ---------- cuello ----------
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.115, 0.20, 10), skinM);
  neck.position.y = 1.78; g.add(neck);

  // ---------- torso con forma: pecho / cintura / cadera ----------
  const torsoG = new THREE.Group(); g.add(torsoG); parts.torso = torsoG;
  const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.345, 0.310, 0.36, 14), shirtM);
  chest.position.y = 1.54; torsoG.add(chest);
  const waist = new THREE.Mesh(new THREE.CylinderGeometry(0.310, 0.270, 0.32, 14), shirtM);
  waist.position.y = 1.22; torsoG.add(waist);
  const hips = new THREE.Mesh(new THREE.CylinderGeometry(0.270, 0.295, 0.30, 14), shirtM);
  hips.position.y = 0.93; torsoG.add(hips);
  // linea de cintura sutil
  const waistLine = new THREE.Mesh(new THREE.TorusGeometry(0.272, 0.02, 6, 16), darkShirtM);
  waistLine.position.y = 1.06; waistLine.rotation.x = Math.PI / 2; torsoG.add(waistLine);
  // sombra sutil en el dobladillo inferior
  const hemShade = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.022, 6, 16), darkShirtM);
  hemShade.position.y = 0.80; hemShade.rotation.x = Math.PI / 2; torsoG.add(hemShade);
  // hombros redondeados
  [-1, 1].forEach(sgn => {
    const sh = new THREE.Mesh(new THREE.SphereGeometry(0.145, 10, 8), outfit === 'jacket' ? darkShirtM : shirtM);
    sh.position.set(sgn * 0.325, 1.62, 0); g.add(sh);
    // sombra de axila
    const ax = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), darkShirtM);
    ax.position.set(sgn * 0.29, 1.56, -0.02); g.add(ax);
  });
  // pliegues sutiles al frente del torso
  [[-0.12, 0.12], [0.12, -0.12], [0.02, 0.05]].forEach(([x, rz]) => {
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.24, 0.02), darkShirtM);
    f.position.set(x, 1.15, 0.295); f.rotation.z = rz; g.add(f);
  });

  // ---------- detalles de ropa por estilo ----------
  if (outfit === 'hoodie') {
    // capucha descansando detrás del cuello
    const hood = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.08, 8, 14, Math.PI), shirtM);
    hood.position.set(0, 1.74, -0.18); g.add(hood);
    // bolsillo canguro al frente
    const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.19, 0.07), shirtM);
    pocket.position.set(0, 1.02, 0.295); g.add(pocket);
    const pocketHem = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.035, 0.075), darkShirtM);
    pocketHem.position.set(0, 1.125, 0.295); g.add(pocketHem);
    // cordones de la capucha
    [-0.085, 0.085].forEach(x => {
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.16, 6), soleM);
      cord.position.set(x, 1.48, 0.32); g.add(cord);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.024, 6, 5), soleM);
      tip.position.set(x, 1.395, 0.32); g.add(tip);
    });
  } else if (outfit === 'jacket') {
    // panel trasero de la chamarra
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.92, 0.13), darkShirtM);
    back.position.set(0, 1.25, -0.26); g.add(back);
    // paneles frontales abiertos (se ve la camisa)
    [-1, 1].forEach(sgn => {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.92, 0.13), darkShirtM);
      panel.position.set(sgn * 0.175, 1.25, 0.255); g.add(panel);
      // pliegue vertical en cada panel
      const pf = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.55, 0.02), mat(darkC(darkC(torsoC))));
      pf.position.set(sgn * 0.175, 1.19, 0.315); g.add(pf);
    });
    // cierre al centro
    const zip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.88, 0.03), mat(liteC(torsoC)));
    zip.position.set(0, 1.25, 0.305); g.add(zip);
    const zipPull = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.07, 0.025), soleM);
    zipPull.position.set(0, 1.52, 0.315); g.add(zipPull);
    // cuello de la chamarra
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.155, 0.05, 8, 14), darkShirtM);
    collar.position.set(0, 1.70, 0); collar.rotation.x = Math.PI / 2; g.add(collar);
  } else if (outfit === 'dress') {
    // falda del vestido
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.46, 0.55, 14), shirtM);
    skirt.position.set(0, 0.60, 0); g.add(skirt);
    const waistB = new THREE.Mesh(new THREE.CylinderGeometry(0.315, 0.315, 0.09, 14), darkShirtM);
    waistB.position.set(0, 0.90, 0); g.add(waistB);
    // pliegues de la falda
    [-0.16, 0, 0.16].forEach(x => {
      const sf = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.42, 0.02), darkShirtM);
      sf.position.set(x, 0.58, 0.36); g.add(sf);
    });
    const hemLine = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.02, 6, 16), darkShirtM);
    hemLine.position.y = 0.34; hemLine.rotation.x = Math.PI / 2; g.add(hemLine);
  } else {
    // playera: cuello simple
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.035, 8, 14), darkShirtM);
    collar.position.set(0, 1.68, 0); collar.rotation.x = Math.PI / 2; g.add(collar);
  }

  // ---------- cabeza redondeada (esfera) con la cara como calcomania curva ----------
  const hasFace = fam && !!style.face;
  const headG = new THREE.Group();
  const HEAD_Y = 2.08; // menos chibi: cabeza mas pequeña y cuerpo mas largo
  headG.position.y = HEAD_Y; g.add(headG); parts.head = headG;
  const HR = 0.205;
  const skull = new THREE.Mesh(new THREE.SphereGeometry(HR, 20, 16), mat(skinC));
  skull.scale.set(1.0, 0.97, 0.94); headG.add(skull);
  if (hasFace) {
    const faceTex = loadFaceTexture(style.face);
    const patch = new THREE.Mesh(
      new THREE.SphereGeometry(HR + 0.004, 14, 12, Math.PI / 2 - 0.62, 1.24, Math.PI / 2 - 0.52, 1.04),
      faceTex ? new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.55, metalness: 0.02 })
              : new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55 })
    );
    patch.scale.copy(skull.scale); headG.add(patch);
  } else {
    // ojos y sonrisa para el personaje libre
    const eyeM = new THREE.MeshBasicMaterial({ color: 0x111111 });
    [-0.11, 0.11].forEach(x => {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), eyeM);
      e.position.set(x, 0.04, 0.20); headG.add(e);
    });
    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.016, 6, 12, Math.PI), eyeM);
    smile.position.set(0, -0.08, 0.212); smile.rotation.z = Math.PI; headG.add(smile);
  }
  // orejas
  [-1, 1].forEach(sgn => {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.048, 8, 6), mat(skinC));
    ear.scale.set(0.6, 1, 0.8); ear.position.set(sgn * 0.20, 0, -0.01); headG.add(ear);
  });

  // ---------- pelo con volumen natural (solo personajes familiares) ----------
  // se escala 0.86 para acompañar la cabeza mas pequeña (caras intactas)
  if (fam && hairM) {
    const hairG = new THREE.Group(); hairG.scale.set(0.86, 0.86, 0.86); headG.add(hairG);
    const hs = style.hairStyle || 'short';
    const wearCap = !!style.cap3d;
    if (!wearCap) { // con gorra no hace falta la copa (la gorra la cubre)
      const top = new THREE.Mesh(new THREE.SphereGeometry(0.27, 14, 10), hairM);
      top.scale.set(1.02, 0.62, 1.02); top.position.set(0, 0.19, -0.02); hairG.add(top);
    }
    const nape = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.30, 0.13), hairM);
    nape.position.set(0, 0.06, -0.215); hairG.add(nape);
    if (hs === 'short' && !wearCap) {
      // flequillo asimetrico con forma
      const spikes = [
        [-0.17, 0.205, 0.175, 0.55, 0.00, 0.20],
        [-0.06, 0.225, 0.195, 0.45, 0.10, 0.24],
        [0.055, 0.215, 0.200, 0.50, -0.12, 0.22],
        [0.16, 0.195, 0.185, 0.60, -0.20, 0.19],
        [-0.005, 0.240, 0.130, 0.35, 0.05, 0.17]
      ];
      spikes.forEach(([x, y, z, rx, rz, h]) => {
        const sp = new THREE.Mesh(new THREE.ConeGeometry(0.082, h, 6), hairM);
        sp.position.set(x, y, z); sp.rotation.x = rx; sp.rotation.z = rz; hairG.add(sp);
      });
      // patillas asimetricas
      const sb1 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.20, 0.22), hairM);
      sb1.position.set(-0.235, 0.08, 0.01); hairG.add(sb1);
      const sb2 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.26, 0.22), hairM);
      sb2.position.set(0.235, 0.05, 0.01); hairG.add(sb2);
    }
    if (hs === 'long') {
      // flequillo
      [[-0.12, 0.21, 0.19], [0.0, 0.225, 0.20], [0.12, 0.21, 0.19]].forEach(([x, y, z]) => {
        const b = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.16, 6), hairM);
        b.position.set(x, y, z); b.rotation.x = 0.5; hairG.add(b);
      });
      // mechones laterales con caida (lados distintos: mas natural)
      const lockL = new THREE.Mesh(new THREE.CapsuleGeometry(0.078, 0.38, 4, 8), hairM);
      lockL.position.set(-0.25, -0.14, 0.03); lockL.rotation.z = 0.10; hairG.add(lockL);
      const lockR = new THREE.Mesh(new THREE.CapsuleGeometry(0.082, 0.44, 4, 8), hairM);
      lockR.position.set(0.25, -0.17, 0.03); lockR.rotation.z = -0.12; hairG.add(lockR);
      // melena trasera mas ancha abajo
      const mane = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.35, 0.60, 12), hairM);
      mane.position.set(0, -0.22, -0.20); hairG.add(mane);
      // hebras sueltas
      [-0.12, 0.10].forEach(x => {
        const st = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.30, 4, 6), hairM);
        st.position.set(x, -0.30, -0.30); st.rotation.x = 0.15; hairG.add(st);
      });
    }
    if (hs === 'bun') {
      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.145, 12, 10), hairM);
      bun.position.set(0, 0.30, -0.16); hairG.add(bun);
      const bun2 = new THREE.Mesh(new THREE.SphereGeometry(0.10, 10, 8), hairM);
      bun2.position.set(0.03, 0.36, -0.13); hairG.add(bun2);
      const tie = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.028, 6, 12), darkShirtM);
      tie.position.set(0, 0.235, -0.155); tie.rotation.x = 1.25; hairG.add(tie);
    }
  }

  // ---------- gorra 3D (Gerson: blanca · Roberto: verde olivo) ----------
  if (fam && style.cap3d) {
    const capM = mat(style.cap3d === 'olive-cap' ? 0x6b7a4f : 0xf5f0e6);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.235, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), capM);
    dome.position.set(0, HEAD_Y + 0.13, -0.02); dome.scale.set(1, 0.85, 1); g.add(dome);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.045, 0.26), capM);
    brim.position.set(0, HEAD_Y + 0.165, 0.28); brim.rotation.x = -0.06; g.add(brim);
    const btn = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 6), capM);
    btn.position.set(0, HEAD_Y + 0.385, -0.02); g.add(btn);
  }

  // barba / bigote 3D solo si la cara no los trae dibujados
  if (fam && style.beard && !hasFace) {
    const beardM = new THREE.MeshStandardMaterial({ color: style.hair || '#222222', roughness: 0.8 });
    const beard = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.17, 0.09), beardM);
    beard.position.set(0, -0.09, 0.165); headG.add(beard);
  }
  if (fam && style.mustache && !hasFace) {
    const moM = new THREE.MeshStandardMaterial({ color: style.hair || '#222222', roughness: 0.8 });
    const mo = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.055, 0.055), moM);
    mo.position.set(0, -0.02, 0.185); headG.add(mo);
  }

  // ---------- brazos con forma (pivote en el hombro) ----------
  const sleeveM = outfit === 'jacket' ? darkShirtM : shirtM;
  [-1, 1].forEach(sgn => {
    const piv = new THREE.Group(); piv.position.set(sgn * 0.43, 1.64, 0);
    // brazo superior mas grueso -> antebrazo mas fino
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.095, 0.34, 10), sleeveM);
    upper.position.y = -0.17; piv.add(upper);
    const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.092, 10, 8), sleeveM);
    elbow.position.y = -0.34; piv.add(elbow);
    const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.078, 0.32, 10), sleeveM);
    fore.position.y = -0.50; piv.add(fore);
    // sombra sutil en el interior del brazo (da volumen)
    const inShade = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.30, 0.11), darkShirtM);
    inShade.position.set(-sgn * 0.095, -0.18, 0); piv.add(inShade);
    // pliegue en el brazo
    const af = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.16, 0.02), darkShirtM);
    af.position.set(0.06 * sgn, -0.32, 0.085); af.rotation.z = 0.2 * sgn; piv.add(af);
    if (outfit === 'hoodie' || outfit === 'jacket') { // puño de la manga
      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.088, 0.09, 10), darkShirtM);
      cuff.position.y = -0.62; piv.add(cuff);
    }
    // mano con forma: palma + dedos sugeridos + pulgar
    const palm = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 8), skinM);
    palm.scale.set(0.95, 1.05, 0.72); palm.position.y = -0.74; piv.add(palm);
    [-0.045, 0, 0.045].forEach(fx => {
      const fin = new THREE.Mesh(new THREE.CapsuleGeometry(0.021, 0.05, 3, 6), skinM);
      fin.position.set(fx, -0.845, 0.015); fin.rotation.x = 0.1; piv.add(fin);
    });
    const thumb = new THREE.Mesh(new THREE.SphereGeometry(0.030, 8, 6), skinM);
    thumb.position.set(-sgn * 0.075, -0.71, 0.035); piv.add(thumb);
    g.add(piv);
    parts[sgn < 0 ? 'armL' : 'armR'] = piv;
  });

  // ---------- piernas con forma (pivote en la cadera) ----------
  [-1, 1].forEach(sgn => {
    const piv = new THREE.Group(); piv.position.set(sgn * 0.185, 0.82, 0);
    // muslo mas grueso -> pantorrilla mas fina, rodilla sugerida
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.150, 0.120, 0.42, 10), pantsM);
    thigh.position.y = -0.21; piv.add(thigh);
    const knee = new THREE.Mesh(new THREE.SphereGeometry(0.105, 10, 8), pantsM);
    knee.position.y = -0.42; piv.add(knee);
    const calf = new THREE.Mesh(new THREE.CylinderGeometry(0.120, 0.098, 0.36, 10), pantsM);
    calf.position.y = -0.60; piv.add(calf);
    // sombra sutil en la cara interna del muslo (da volumen)
    const legShade = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.30, 0.12), darkPantsM);
    legShade.position.set(-sgn * 0.135, -0.22, 0); piv.add(legShade);
    if (outfit !== 'dress') { // dobladillo del jean + bolsillo + costura
      const hem = new THREE.Mesh(new THREE.CylinderGeometry(0.108, 0.108, 0.09, 10), darkPantsM);
      hem.position.y = -0.70; piv.add(hem);
      const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.035), darkPantsM);
      pocket.position.set(0, -0.24, 0.125); piv.add(pocket);
      const seam = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.40, 0.02), darkPantsM);
      seam.position.set(0.13 * sgn, -0.45, 0); piv.add(seam);
    }
    if (fam && style.shoes) { // tenis con forma: punta redondeada + suela + agujetas
      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.12, 0.30), shoeM);
      shoe.name = 'shoeMain';
      shoe.position.set(0, -0.775, 0.04); piv.add(shoe);
      const toe = new THREE.Mesh(new THREE.SphereGeometry(0.105, 10, 8), shoeM);
      toe.name = 'shoeToe';
      toe.scale.set(1.05, 0.58, 1.0); toe.position.set(0, -0.775, 0.19); piv.add(toe);
      const sole = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.045, 0.42), soleM);
      sole.name = 'shoeSole';
      sole.position.set(0, -0.80, 0.06); piv.add(sole);
      const lace = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.10), soleM);
      lace.name = 'shoeLace';
      lace.position.set(0, -0.71, 0.10); piv.add(lace);
    }
    g.add(piv);
    parts[sgn < 0 ? 'legL' : 'legR'] = piv;
  });
  if (style.kid) g.scale.set(0.8, 0.8, 0.8); // niños un poco más pequeños
  g.userData.baseScale = style.kid ? 0.8 : 1; // escala base (se reduce al manejar carro)
  g.userData.parts = parts;
  g.userData.walkT = 0;
  g.userData.hatMesh = null;
  g.userData.species = 'humanoid';
  g.userData.nameLabelY = 2.95;
  setAvatarHat(g, style.hat || 'none');
  return g;
}

/* ---------- perro bloqueado (Mily, Kiara) ----------
   Misma física que el humanoide: solo cambia la malla visible.
   Las patas delanteras usan armL/armR y las traseras legL/legR
   para que la animación de caminata siga funcionando. */
function createDogMesh(style) {
  const g = new THREE.Group();
  const parts = {};
  const mat = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 });
  const bodyC = style.body || '#8a8f98';
  const lightC = style.light || '#ffffff';
  const darkC = style.dark || '#333333';
  const box = (w, h, d, c, x, y, z, parent) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c));
    mesh.position.set(x, y, z); mesh.castShadow = true;
    (parent || g).add(mesh); return mesh;
  };
  // cuerpo horizontal
  box(0.5, 0.5, 0.95, bodyC, 0, 0.85, -0.05);
  // cabeza
  box(0.48, 0.45, 0.45, bodyC, 0, 1.25, 0.5);
  // hocico y nariz
  box(0.3, 0.22, 0.18, lightC, 0, 1.18, 0.78);
  box(0.12, 0.1, 0.06, darkC, 0, 1.24, 0.88);
  // ojos
  const eyeM = new THREE.MeshBasicMaterial({ color: 0x111111 });
  [-0.13, 0.13].forEach(x => {
    const e = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.11, 0.03), eyeM);
    e.position.set(x, 1.32, 0.73); g.add(e);
  });
  // orejas paradas
  [-0.17, 0.17].forEach(x => box(0.13, 0.28, 0.09, darkC, x, 1.6, 0.42));
  // barba y cejas de schnauzer (Mily)
  if (style.beard) {
    [-0.12, 0.12].forEach(x => box(0.12, 0.28, 0.12, lightC, x, 1.02, 0.72));
    [-0.13, 0.13].forEach(x => box(0.14, 0.08, 0.06, lightC, x, 1.42, 0.72));
  }
  // manchas cafés (Kiara)
  if (style.patches) {
    box(0.2, 0.16, 0.06, style.patches, -0.14, 1.32, 0.68);
    box(0.3, 0.08, 0.4, style.patches, 0.08, 1.12, -0.15);
  }
  // collar rosa (Kiara)
  if (style.collar) box(0.54, 0.12, 0.54, style.collar, 0, 1.08, 0.28);
  // 4 patas cortas con pivote para animarlas
  const legGeo = new THREE.BoxGeometry(0.17, 0.5, 0.17);
  const mkLeg = (x, z, key) => {
    const piv = new THREE.Group(); piv.position.set(x, 0.55, z);
    const leg = new THREE.Mesh(legGeo, mat(lightC));
    leg.position.y = -0.25; leg.castShadow = true; piv.add(leg);
    g.add(piv); parts[key] = piv;
  };
  mkLeg(-0.17, 0.28, 'armL'); mkLeg(0.17, 0.28, 'armR');
  mkLeg(-0.17, -0.38, 'legL'); mkLeg(0.17, -0.38, 'legR');
  // cola corta parada
  const tail = box(0.1, 0.4, 0.1, darkC, 0, 1.05, -0.55);
  tail.rotation.x = -0.3;
  g.userData.parts = parts;
  g.userData.walkT = 0;
  g.userData.hatMesh = null;
  g.userData.species = 'dog';
  g.userData.nameLabelY = 2.0;
  setAvatarHat(g, style.hat || 'none');
  return g;
}

/* ---------- cuyo bloqueado y regordete (Gorda, Niña) ----------
   Sin cola, patitas muy cortas, nariz rosada. */
function createCuyoMesh(style) {
  const g = new THREE.Group();
  const parts = {};
  const mat = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 });
  const bodyC = style.body || '#f7f5f2';
  const darkC = style.dark || '#333333';
  const box = (w, h, d, c, x, y, z, parent) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c));
    mesh.position.set(x, y, z); mesh.castShadow = true;
    (parent || g).add(mesh); return mesh;
  };
  // cuerpo regordete
  box(0.62, 0.55, 0.85, bodyC, 0, 0.45, 0);
  // cabeza
  box(0.5, 0.45, 0.4, bodyC, 0, 0.85, 0.5);
  // manchas cafés
  if (style.patches) {
    box(0.24, 0.2, 0.06, style.patches, 0.16, 0.92, 0.62);
    box(0.34, 0.1, 0.4, style.patches, -0.08, 0.75, -0.1);
  }
  // orejitas redondas pequeñas
  [-0.2, 0.2].forEach(x => box(0.12, 0.14, 0.06, bodyC, x, 1.12, 0.45));
  // ojos y nariz rosada
  const eyeM = new THREE.MeshBasicMaterial({ color: 0x111111 });
  [-0.14, 0.14].forEach(x => {
    const e = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.11, 0.03), eyeM);
    e.position.set(x, 0.92, 0.71); g.add(e);
  });
  box(0.1, 0.08, 0.05, '#f2a3b3', 0, 0.82, 0.71);
  // patitas muy cortas con pivote
  const legGeo = new THREE.BoxGeometry(0.14, 0.24, 0.14);
  const mkLeg = (x, z, key) => {
    const piv = new THREE.Group(); piv.position.set(x, 0.24, z);
    const leg = new THREE.Mesh(legGeo, mat(bodyC));
    leg.position.y = -0.1; leg.castShadow = true; piv.add(leg);
    g.add(piv); parts[key] = piv;
  };
  mkLeg(-0.18, 0.25, 'armL'); mkLeg(0.18, 0.25, 'armR');
  mkLeg(-0.18, -0.28, 'legL'); mkLeg(0.18, -0.28, 'legR');
  g.userData.parts = parts;
  g.userData.walkT = 0;
  g.userData.hatMesh = null;
  g.userData.species = 'cuyo';
  g.userData.nameLabelY = 1.6;
  setAvatarHat(g, style.hat || 'none');
  return g;
}

/* ---------- oso pardo bloqueado (genérico) ---------- */
function createBearMesh(style) {
  const g = new THREE.Group();
  const parts = {};
  const mat = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 });
  const fur = '#7a5230', dark = '#5d3f24', snoutC = '#a07a4a';
  const box = (w, h, d, c, x, y, z, parent) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c));
    mesh.position.set(x, y, z); mesh.castShadow = true;
    (parent || g).add(mesh); return mesh;
  };
  // torso grande
  box(0.8, 0.85, 0.5, fur, 0, 1.1, 0);
  // cabeza
  box(0.55, 0.5, 0.5, fur, 0, 1.8, 0);
  // orejas redondas
  [-0.24, 0.24].forEach(x => box(0.18, 0.18, 0.12, dark, x, 2.1, 0));
  // hocico y nariz
  box(0.3, 0.22, 0.2, snoutC, 0, 1.72, 0.32);
  box(0.12, 0.1, 0.06, '#2b1d10', 0, 1.76, 0.43);
  // ojos
  const eyeM = new THREE.MeshBasicMaterial({ color: 0x111111 });
  [-0.13, 0.13].forEach(x => {
    const e = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.11, 0.03), eyeM);
    e.position.set(x, 1.86, 0.26); g.add(e);
  });
  // brazos y piernas con pivote
  const mkLimb = (x, y, w, h, key) => {
    const piv = new THREE.Group(); piv.position.set(x, y, 0);
    const limb = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.26), mat(fur));
    limb.position.y = -h / 2 + 0.02; limb.castShadow = true; piv.add(limb);
    g.add(piv); parts[key] = piv;
  };
  mkLimb(-0.52, 1.42, 0.24, 0.7, 'armL'); mkLimb(0.52, 1.42, 0.24, 0.7, 'armR');
  mkLimb(-0.2, 0.72, 0.28, 0.72, 'legL'); mkLimb(0.2, 0.72, 0.28, 0.72, 'legR');
  // colita
  box(0.14, 0.14, 0.14, dark, 0, 0.85, -0.3);
  g.userData.parts = parts;
  g.userData.walkT = 0;
  g.userData.hatMesh = null;
  g.userData.species = 'bear';
  g.userData.nameLabelY = 2.7;
  setAvatarHat(g, style.hat || 'none');
  return g;
}

/* ---------- tortuga verde con caparazón (genérico) ---------- */
function createTurtleMesh(style) {
  const g = new THREE.Group();
  const parts = {};
  const mat = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 });
  const green = '#4caf50', shellC = '#2e7d32';
  const box = (w, h, d, c, x, y, z, parent) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c));
    mesh.position.set(x, y, z); mesh.castShadow = true;
    (parent || g).add(mesh); return mesh;
  };
  // cuerpo
  box(0.55, 0.4, 0.8, green, 0, 0.55, 0);
  // caparazón en domo
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(0.38, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    mat(shellC));
  shell.position.set(0, 0.68, -0.05); shell.scale.set(1, 0.8, 1.15);
  shell.castShadow = true; g.add(shell);
  // cabecita
  box(0.3, 0.3, 0.3, green, 0, 0.65, 0.55);
  // ojos
  const eyeM = new THREE.MeshBasicMaterial({ color: 0x111111 });
  [-0.09, 0.09].forEach(x => {
    const e = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.03), eyeM);
    e.position.set(x, 0.7, 0.71); g.add(e);
  });
  // 4 aletas con pivote
  const mkFlipper = (x, z, key) => {
    const piv = new THREE.Group(); piv.position.set(x, 0.35, z);
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.32), mat(green));
    f.position.set(0, -0.12, z > 0 ? 0.06 : -0.06); f.castShadow = true; piv.add(f);
    g.add(piv); parts[key] = piv;
  };
  mkFlipper(-0.34, 0.28, 'armL'); mkFlipper(0.34, 0.28, 'armR');
  mkFlipper(-0.34, -0.3, 'legL'); mkFlipper(0.34, -0.3, 'legR');
  // colita
  box(0.1, 0.1, 0.14, green, 0, 0.5, -0.48);
  g.userData.parts = parts;
  g.userData.walkT = 0;
  g.userData.hatMesh = null;
  g.userData.species = 'turtle';
  g.userData.nameLabelY = 1.5;
  setAvatarHat(g, style.hat || 'none');
  return g;
}

/* ---------- pantera negra de ojos verdes (genérico) ---------- */
function createPantherMesh(style) {
  const g = new THREE.Group();
  const parts = {};
  const mat = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, metalness: 0.1 });
  const fur = '#1a1a1e';
  const box = (w, h, d, c, x, y, z, parent) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c));
    mesh.position.set(x, y, z); mesh.castShadow = true;
    (parent || g).add(mesh); return mesh;
  };
  // cuerpo esbelto horizontal
  box(0.45, 0.45, 1.0, fur, 0, 0.8, -0.05);
  // cabeza
  box(0.42, 0.4, 0.42, fur, 0, 1.15, 0.55);
  // orejas
  [-0.15, 0.15].forEach(x => box(0.12, 0.16, 0.08, fur, x, 1.42, 0.5));
  // hocico y nariz
  box(0.24, 0.18, 0.14, '#2c2c31', 0, 1.08, 0.78);
  box(0.1, 0.08, 0.05, '#0d0d0f', 0, 1.12, 0.86);
  // ojos verdes brillantes
  const eyeM = new THREE.MeshBasicMaterial({ color: 0x39ff6a });
  [-0.11, 0.11].forEach(x => {
    const e = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.03), eyeM);
    e.position.set(x, 1.2, 0.77); g.add(e);
  });
  // 4 patas con pivote
  const legGeo = new THREE.BoxGeometry(0.16, 0.55, 0.16);
  const mkLeg = (x, z, key) => {
    const piv = new THREE.Group(); piv.position.set(x, 0.6, z);
    const leg = new THREE.Mesh(legGeo, mat(fur));
    leg.position.y = -0.27; leg.castShadow = true; piv.add(leg);
    g.add(piv); parts[key] = piv;
  };
  mkLeg(-0.16, 0.3, 'armL'); mkLeg(0.16, 0.3, 'armR');
  mkLeg(-0.16, -0.4, 'legL'); mkLeg(0.16, -0.4, 'legR');
  // cola larga
  const tail = box(0.08, 0.08, 0.55, fur, 0, 0.92, -0.68);
  tail.rotation.x = 0.25;
  g.userData.parts = parts;
  g.userData.walkT = 0;
  g.userData.hatMesh = null;
  g.userData.species = 'panther';
  g.userData.nameLabelY = 1.9;
  setAvatarHat(g, style.hat || 'none');
  return g;
}

/* pone o cambia el sombrero de un avatar construido con createAvatarMesh */
function setAvatarHat(avatar, id) {
  const ud = avatar.userData;
  if (ud.hatMesh) { avatar.remove(ud.hatMesh); ud.hatMesh = null; }
  const g = new THREE.Group();
  const dark = new THREE.MeshStandardMaterial({ color: 0x222228, roughness: 0.5 });
  if (id === 'cap' || id === 'white-cap' || id === 'olive-cap') {
    const capColor = id === 'white-cap' ? 0xf5f0e6 : id === 'olive-cap' ? 0x6b7a4f : 0xe63b3b;
    const capM = new THREE.MeshStandardMaterial({ color: capColor, roughness: 0.5 });
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.22, 0.54), capM);
    top.position.y = 0.12; g.add(top);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.07, 0.34), capM);
    brim.position.set(0, 0.03, 0.42); g.add(brim);
  } else if (id === 'tophat') {
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.42, 14), dark);
    cyl.position.y = 0.3; g.add(cyl);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.07, 14), dark);
    brim.position.y = 0.1; g.add(brim);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.205, 0.205, 0.1, 14), new THREE.MeshStandardMaterial({ color: 0xffd23f }));
    band.position.y = 0.16; g.add(band);
  } else if (id === 'headphones') {
    const bandM = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.06, 8, 18, Math.PI), new THREE.MeshStandardMaterial({ color: 0x7b2fff }));
    bandM.position.y = 0.18; g.add(bandM);
    [-1, 1].forEach(sgn => {
      const cup = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.26, 0.26), new THREE.MeshStandardMaterial({ color: 0x7b2fff }));
      cup.position.set(sgn * 0.32, 0.02, 0); g.add(cup);
    });
  } else if (id === 'crown') {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.2, 8), new THREE.MeshStandardMaterial({ color: 0xffd23f, metalness: 0.7, roughness: 0.3 }));
    base.position.y = 0.16; g.add(base);
    for (let i = 0; i < 6; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 6), base.material);
      const a = (i / 6) * TAU;
      spike.position.set(Math.cos(a) * 0.24, 0.34, Math.sin(a) * 0.24);
      g.add(spike);
    }
    const gem = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.05), new THREE.MeshStandardMaterial({ color: 0xff2fd6, emissive: 0xff2fd6, emissiveIntensity: 0.8 }));
    gem.position.set(0, 0.16, 0.29); g.add(gem);
  }
  if (g.children.length) {
    // altura según la especie (los animales son más bajitos)
    const sp = avatar.userData.species;
    g.position.y = sp === 'dog' ? 1.62 : sp === 'cuyo' ? 1.28 : sp === 'turtle' ? 1.05 : sp === 'panther' ? 1.5 : 2.32;
    ud.hatMesh = g;
    avatar.add(g);
  }
}

/* animación de caminata para cualquier avatar de createAvatarMesh */
function animateAvatarMesh(g, dt, speed, grounded) {
  const parts = g.userData.parts;
  if (parts.torso) parts.torso.rotation.x = 0; // reset por si venía manejando
  g.userData.walkT += dt * (2 + speed * 1.6);
  const sw = grounded ? Math.sin(g.userData.walkT) * clamp(speed * 0.09, 0, 0.75) : 0;
  parts.legL.rotation.x = sw; parts.legR.rotation.x = -sw;
  parts.armL.rotation.x = -sw * 0.9; parts.armR.rotation.x = sw * 0.9;
  if (!grounded) { parts.armL.rotation.x = -0.7; parts.armR.rotation.x = -0.7; }
}

/* Pose de conductor: en bici PEDALEA, en carro maneja sentado (no parado) */
function animateRiderMesh(g, dt, speed, kind) {
  if (!g || !g.userData.parts) return;
  const parts = g.userData.parts;
  if (!parts.torso || !parts.legL) { // mascotas: animación normal sentada
    animateAvatarMesh(g, dt, speed * 0.3, true); return;
  }
  g.userData.walkT += dt * (3 + speed * 2.2);
  const t = g.userData.walkT;
  if (kind === 'bike') { // 🚲 pedaleando: piernas en círculos, manos al manubrio
    const amp = speed > 0.3 ? 0.55 : 0.12;
    parts.legL.rotation.x = -0.8 + Math.sin(t) * amp;
    parts.legR.rotation.x = -0.8 + Math.sin(t + Math.PI) * amp;
    parts.armL.rotation.x = -0.85; parts.armR.rotation.x = -0.85;
    parts.torso.rotation.x = 0.16; // inclinado hacia adelante
  } else { // 🚗 manejando: piernas al frente, manos al volante
    parts.legL.rotation.x = -1.05; parts.legR.rotation.x = -1.05;
    const steer = Math.sin(t * 0.6) * 0.07;
    parts.armL.rotation.x = -0.9 + steer; parts.armR.rotation.x = -0.9 - steer;
    parts.torso.rotation.x = -0.08; // recargado en el asiento
  }
}

/* ================= ETIQUETAS FLOTANTES (estilo GEAYI) =================
   Sprite con el nombre sobre el avatar. Diseño original: píldora oscura con
   borde de acento de la marca y texto blanco. */
function makeNameLabel(name, accent) {
  const label = String(name || 'Jugador').slice(0, 16);
  const ac = accent || '#00e5ff';
  const c = document.createElement('canvas');
  c.width = 256; c.height = 72;
  const g = c.getContext('2d');
  g.font = '700 30px "Fredoka", "Trebuchet MS", sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const tw = Math.min(216, g.measureText(label).width + 44);
  const x0 = (256 - tw) / 2, y0 = 10, h = 50, r = 25;
  // píldora
  g.fillStyle = 'rgba(8,6,24,0.72)';
  g.beginPath();
  g.moveTo(x0 + r, y0);
  g.arcTo(x0 + tw, y0, x0 + tw, y0 + h, r);
  g.arcTo(x0 + tw, y0 + h, x0, y0 + h, r);
  g.arcTo(x0, y0 + h, x0, y0, r);
  g.arcTo(x0, y0, x0 + tw, y0, r);
  g.closePath(); g.fill();
  // borde de acento
  g.lineWidth = 4; g.strokeStyle = ac; g.stroke();
  // punto decorativo
  g.fillStyle = ac;
  g.beginPath(); g.arc(x0 + 24, y0 + h / 2, 7, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#ffffff';
  g.fillText(label, 128 + 8, y0 + h / 2 + 1);
  const tex = new THREE.CanvasTexture(c);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sp.scale.set(2.4, 0.675, 1);
  sp.userData.isNameLabel = true;
  return sp;
}
/* (re)coloca la etiqueta del jugador local sobre su avatar */
function refreshLocalLabel() {
  if (!Avatar.group) return;
  const old = Avatar.group.children.find(o => o.userData && o.userData.isNameLabel);
  if (old) Avatar.group.remove(old);
  const nm = (typeof displayName === 'function') ? displayName() : 'Jugador';
  const label = makeNameLabel(nm, '#ffe95e');
  label.position.y = Avatar.group.userData.nameLabelY || 2.7;
  Avatar.group.add(label);
}

const Avatar = {
  group: null, parts: {}, walkT: 0, blob: null,
  build() {
    try { // si llevabas algo en la mano, despegarlo antes de reconstruir el cuerpo
      const c = (typeof window !== 'undefined' && window.__carried) || null;
      if (c && c.t && c.t.o && this.group && c.t.o.parent) {
        let p = c.t.o.parent, inside = false;
        while (p) { if (p === this.group) { inside = true; break; } p = p.parent; }
        if (inside && typeof scene !== 'undefined' && scene && scene.attach) scene.attach(c.t.o);
      }
    } catch (e) {}
    if (this.group) scene.remove(this.group);
    if (this.blob) scene.remove(this.blob);
    this.group = createAvatarMesh(avatarStyleForLocal());
    this.parts = this.group.userData.parts;
    this.group.traverse(o => { if (o.isMesh) o.castShadow = true; }); // el personaje proyecta sombra suave
    // sombra falsa (blob)
    const blobM = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false });
    this.blob = new THREE.Mesh(new THREE.CircleGeometry(0.55, 20), blobM);
    this.blob.rotation.x = -Math.PI / 2;
    scene.add(this.blob);
    scene.add(this.group);
    refreshLocalLabel(); // 🏷️ nombre flotante del jugador
    // re-aplica las prendas premium equipadas (cada una en su parte del cuerpo)
    try {
      if (typeof Shop2 !== 'undefined' && Shop2 && typeof Shop2.applyOutfits === 'function') Shop2.applyOutfits(this.group);
    } catch (e) {}
    // 🪑 si el avatar se reconstruyó sentado/acostado, re-aplica la pose al instante
    try { if (typeof Player !== 'undefined' && Player.pose !== 'stand') Player._applyAvatarPose(); } catch (e) {}
  },
  setHat(id) {
    if (!this.group) return;
    // el sombrero clásico reemplaza al sombrero premium (las demás prendas se conservan)
    try {
      if (typeof Shop2 !== 'undefined' && Shop2 && typeof Shop2.clearOutfitSlot === 'function') Shop2.clearOutfitSlot(this.group, 'hat');
    } catch (e) {}
    setAvatarHat(this.group, id);
  },
  /* Re-dibuja sombrero + prendas premium según lo equipado. */
  refreshOutfits() {
    if (!this.group) return;
    try {
      if (typeof Shop2 !== 'undefined' && Shop2 && typeof Shop2.applyOutfits === 'function') { Shop2.applyOutfits(this.group); return; }
    } catch (e) {}
    setAvatarHat(this.group, (typeof SAVE !== 'undefined' && SAVE.hat) || 'none');
  },
  animate(dt, speed, grounded) {
    if (!this.group) return;
    animateAvatarMesh(this.group, dt, speed, grounded);
    this.walkT = this.group.userData.walkT;
  }
};

/* estela del jugador */
const TRAIL_COLORS = {
  sparkle: [0xffffff, 0xfff3a0, 0x9be8ff],
  fire: [0xff6a00, 0xffb300, 0xff3d00],
  rainbow: [0xff2fd6, 0xffe95e, 0x00e5ff, 0x59d867, 0x7b2fff]
};
let trailAcc = 0;
function emitTrail(dt, speed) {
  if (SAVE.trail === 'none' || speed < 1.5) return;
  trailAcc += dt;
  if (trailAcc > 0.05) {
    trailAcc = 0;
    Particles.spawn(Player.pos.x, Player.pos.y + 0.9, Player.pos.z,
      { n: 2, colors: TRAIL_COLORS[SAVE.trail], speed: 1, up: 1.2, life: 0.55, size: 0.4, grav: 1 });
  }
}

/* =========================================================================
   JUGADOR — física y mecánicas
   ========================================================================= */
const Player = {
  pos: null, vel: null, grounded: false, groundPlat: null,
  heading: 0, camYaw: 0, camPitch: 0.34, camDist: 8.5, knockCd: 0, coyote: 0, jumpBuf: 0,
  pose: 'stand', poseRef: null, // 🪑 'stand' | 'sit' | 'lie' (sentarse/acostarse en muebles)
  reset(x, y, z) {
    this.pos = new THREE.Vector3(x, y + 0.02, z);
    this.vel = new THREE.Vector3();
    this.grounded = false; this.groundPlat = null;
    this.heading = 0; this.camYaw = Math.PI; this.camPitch = 0.34; this.camDist = 8.5; this.knockCd = 0;
    this.coyote = 0; this.jumpBuf = 0;
    this.pose = 'stand'; this.poseRef = null; // al reaparecer siempre de pie
    this.fx = { doubleT: 0, shield: false, speedT: 0 }; // FASE 3: power-ups
    this.doubleUsed = false;
    this.lastSafe = { x, y: y + 0.02, z }; this.safeT = 0;
    this.syncMesh();
  },
  syncMesh() {
    Avatar.group.position.copy(this.pos);
    Avatar.group.rotation.y = this.heading;
    Avatar.group.rotation.x = 0; Avatar.group.rotation.z = 0;
    if (this.pose === 'sit' && this.poseRef) { // 🪑 cadera a la altura del asiento
      Avatar.group.position.y = (this.poseRef.gy || 0) + (this.poseRef.useH || 0.5) - 0.82;
      Avatar.group.rotation.y = this.poseRef.ry || 0;
    } else if (this.pose === 'lie' && this.poseRef) { // 🛏️ cuerpo sobre la cama
      Avatar.group.position.y = (this.poseRef.gy || 0) + (this.poseRef.useH || 0.75) + 0.30;
      Avatar.group.rotation.y = this.poseRef.ry || 0;
    }
    Avatar.blob.position.set(this.pos.x, (this.groundY || 0) + 0.06, this.pos.z);
    this._applyAvatarPose();
  },
  /* 🪑 sentarse en silla/sofá. ref = Furniture.poseRefFor(found): {x,z,ry,useH,gy,front} */
  sit(ref) { return this._rest(ref, 'sit'); },
  /* 🛏️ acostarse en la cama. ref = Furniture.poseRefFor(found) */
  lieDown(ref) { return this._rest(ref, 'lie'); },
  _rest(ref, pose) {
    try {
      if (!ref || this.pose !== 'stand') return false;
      if (typeof MODE !== 'undefined' && MODE !== 'play') return false;
      if (typeof Vehicle !== 'undefined' && Vehicle.mode !== 'none') return false; // no en vehículo
      this.pos.x = ref.x; this.pos.z = ref.z;
      this.vel.set(0, 0, 0);
      this.heading = ref.ry || 0;
      this.pose = pose; this.poseRef = ref;
      this.syncMesh();
      return true;
    } catch (e) { return false; }
  },
  /* levantarse: vuelve a 'stand' y da un pasito al frente del mueble */
  standUp() {
    if (this.pose === 'stand') return false;
    const ref = this.poseRef;
    this.pose = 'stand'; this.poseRef = null;
    try {
      if (ref && this.pos) {
        const f = ref.front || 1.3, ry = ref.ry || 0;
        this.pos.x = ref.x + Math.sin(ry) * f;
        this.pos.z = ref.z + Math.cos(ry) * f;
      }
      this.syncMesh();
    } catch (e) {}
    return true;
  },
  /* aplica la pose sentada/acostada al avatar (piernas, brazos, torso).
     En 'stand' no hace nada: la animación de caminata/manejo manda. */
  _applyAvatarPose() {
    try {
      const g = (typeof Avatar !== 'undefined' && Avatar.group) || null;
      if (!g || this.pose === 'stand') return;
      const parts = g.userData.parts || {};
      const set = (k, x) => { if (parts[k]) parts[k].rotation.x = x; };
      try { g.rotation.order = (this.pose === 'lie') ? 'YXZ' : 'XYZ'; } catch (e) {}
      if (this.pose === 'sit') { // piernas dobladas al frente, manos en las piernas
        set('legL', -1.5); set('legR', -1.5);
        set('armL', -0.35); set('armR', -0.35);
        if (parts.torso) parts.torso.rotation.x = -0.06; // leve reclinado
        g.rotation.x = 0; g.rotation.z = 0;
      } else if (this.pose === 'lie') { // cuerpo estirado, horizontal
        set('legL', 0); set('legR', 0);
        set('armL', 0); set('armR', 0);
        if (parts.torso) parts.torso.rotation.x = 0;
        g.rotation.x = -Math.PI / 2; g.rotation.z = 0; // acostado, cabeza hacia -z local
      }
    } catch (e) {}
  }
};

const GRAV = 30, JUMP_V = 12, SPEED = 8.2, AIR_CTRL = 0.75;
const P_HALF = { x: 0.34, y: 0.95, z: 0.34 }; // medio-tamaño del jugador (pies en pos.y)



function screenShake(mag, dur) { shakeMag = Math.max(shakeMag, mag); shakeT = Math.max(shakeT, dur); }

function tryJump() {
  if (MODE !== 'play' || finished) return;
  // FASE 2: en vehículo no se salta (en avión/dron/heli SALTAR = turbo)
  if (typeof Vehicle !== 'undefined' && Vehicle.mode !== 'none') {
    if ((Vehicle.mode === 'plane' || Vehicle.mode === 'drone' || Vehicle.mode === 'heli') && typeof vehicleBoost === 'function') vehicleBoost();
    return;
  }
  Player.jumpBuf = 0.14;
}

/* FASE 2: dinámica del nivel (plataformas móviles, pisos fantasma, barredoras).
   Se ejecuta también en modo vehículo; withKnock=false no derriba al jugador. */
function updateLevelDynamics(dt, withKnock) {
  const P = Player;
  // --- plataformas móviles: mover primero su delta ---
  for (const p of LEVEL.platforms) {
    if (p.move && p.solid) {
      const off = Math.sin(levelTime * p.move.speed + p.phase) * p.move.range;
      const nx = p.baseX + (p.move.axis === 'x' ? off : 0);
      const nz = p.baseZ + (p.move.axis === 'z' ? off : 0);
      p.dx = nx - p.x; p.dz = nz - p.z;
      p.x = nx; p.z = nz;
      p.mesh.position.x = nx; p.mesh.position.z = nz;
    }
  }
  // --- ghost tiles ---
  for (const p of LEVEL.platforms) {
    if (p.kind !== 'ghost') continue;
    if (p.ghostState === 'fading') {
      p.ghostT -= dt;
      p.mesh.material.opacity = Math.max(0, p.ghostT / p.ghost.stay);
      if (p.ghostT <= 0) { p.ghostState = 'gone'; p.ghostT = p.ghost.respawn; p.solid = false; p.mesh.visible = false; }
    } else if (p.ghostState === 'gone') {
      p.ghostT -= dt;
      if (p.ghostT <= 0) { p.ghostState = 'solid'; p.solid = true; p.mesh.visible = true; p.mesh.material.opacity = 1; }
    }
  }
  // --- sweepers ---
  for (const s of LEVEL.sweepers) {
    s.angle += s.speed * dt;
    s.grp.rotation.y = -s.angle;
    if (withKnock && P.knockCd <= 0 && !finished) {
      const dx = P.pos.x - s.x, dz = P.pos.z - s.z;
      const dist = Math.hypot(dx, dz);
      if (dist < s.armLen + 0.5 && Math.abs((P.pos.y + 0.9) - s.armY) < 1.3) {
        // ¿está el jugador sobre la línea del brazo?
        const ax = Math.cos(s.angle), az = Math.sin(s.angle);
        const proj = Math.abs(dx * -az + dz * ax); // distancia perpendicular al brazo
        if (proj < 0.75 && dist > 0.4) {
          const n = 1 / Math.max(dist, 0.001);
          P.vel.x = dx * n * 11; P.vel.z = dz * n * 11; P.vel.y = 7;
          P.grounded = false; P.knockCd = 0.7;
          Audio2.fall(); screenShake(0.35, 0.35);
          Particles.burst(P.pos.x, P.pos.y + 1, P.pos.z, [0xff3d5e, 0xffffff], 12, 5);
        }
      }
    }
  }
  P.knockCd = Math.max(0, P.knockCd - dt);
}

/* FASE 2: monedas, checkpoints, meta y caída al vacío.
   Se comparte entre el modo a pie y el modo vehículo (avión/carro/bici). */
function levelTriggers(dt) {
  const P = Player;
  // --- monedas (con imán) ---
  const mR = (typeof Powers !== 'undefined' && typeof Powers.magnetRadius === 'function') ? Powers.magnetRadius() : 3.2; // 🧲 superpoder imán
  for (const c of LEVEL.coins) {
    if (c.taken) continue;
    c.mesh.rotation.y += dt * 3;
    c.mesh.position.y = c.y + Math.sin(levelTime * 3 + c.x) * 0.12;
    const dx = P.pos.x - c.mesh.position.x, dy = (P.pos.y + 1) - c.mesh.position.y, dz = P.pos.z - c.mesh.position.z;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (d < mR && d > 0.001) { // imán: la moneda vuela hacia ti
      const pull = (mR + 0.2 - d) * 16 * dt;
      c.mesh.position.x += (dx / d) * pull;
      c.mesh.position.y += (dy / d) * pull;
      c.mesh.position.z += (dz / d) * pull;
    }
    const ddx = P.pos.x - c.mesh.position.x, ddy = (P.pos.y + 1) - c.mesh.position.y, ddz = P.pos.z - c.mesh.position.z;
    if (ddx * ddx + ddy * ddy + ddz * ddz < 1.1) {
      c.taken = true; c.mesh.visible = false;
      coinsRun++; SAVE.coins++; persist();
      $('hud-coins').textContent = SAVE.coins;
      Audio2.coin();
      Particles.burst(c.mesh.position.x, c.mesh.position.y, c.mesh.position.z, [0xffd23f, 0xffe95e, 0xffffff], 10, 3.5);
    }
  }

  // --- checkpoints ---
  for (const cp of LEVEL.checkpoints) {
    if (cp.active) continue;
    const dx = P.pos.x - cp.x, dz = P.pos.z - cp.z;
    if (dx * dx + dz * dz < 4 && Math.abs(P.pos.y - cp.y) < 2.5) {
      cp.active = true;
      cp.flag.material.color.set(0x00e676); cp.flag.material.emissive.set(0x00e676);
      cp.ring.material.color.set(0x00e676);
      respawn = { x: cp.x, y: cp.y, z: cp.z };
      Audio2.check(); toast('🚩 ¡Punto de control!');
      Particles.burst(cp.x, cp.y + 2, cp.z, [0x00e676, 0xffffff], 18, 4);
    }
  }

  // --- mundo libre: sin meta ni "pasaste de nivel" (el arco es decorativo) ---

  // --- caída al vacío ---
  if (P.pos.y < LEVEL.killY && !finished) {
    if (typeof Vehicle !== 'undefined' && Vehicle.mode !== 'none' && typeof crashVehicle === 'function') crashVehicle();
    hitHazard(); // FASE 3: escudo o reaparición normal
  }
}

/* ============================================================
   🤖 AGENTE GEAYI: nado en zonas de agua (WATER_ZONES, agent.js).
   - Bajo el agua: sin gravedad, movimiento 3D con el joystick;
     el salto impulsa hacia arriba y la inclinación de la cámara guía.
   - Oxígeno ≈ 30 s (función pura swimOxygen en agent.js);
     en superficie se recarga; si llega a 0, subida automática.
   - Sin daño ni gore: todo tierno y seguro para niños.
   (No se toca el joystick ni readInput: solo se lee `input`.)
   ============================================================ */
var GeayiSwim = {
  MAX: 30, oxy: 30, under: false,
  _oxygen: function (dt, headAbove) {
    if (typeof swimOxygen === 'function') return swimOxygen(this.oxy, this.MAX, dt, headAbove);
    let o = (this.oxy == null || isNaN(this.oxy)) ? this.MAX : this.oxy; // respaldo sin agent.js
    o = headAbove ? Math.min(this.MAX, o + dt * 10) : o - dt;
    const rise = o <= 0;
    return { oxy: rise ? 6 : o, rise: rise };
  },
  _paintBar: function () {
    try {
      const el = $('oxybar'), fill = $('oxyfill');
      if (!el || !fill) return;
      if (this.under || this.oxy < this.MAX) {
        el.className = 'oxybar';
        fill.style.width = Math.max(0, Math.min(100, (this.oxy / this.MAX) * 100)) + '%';
      } else el.className = 'oxybar hidden';
    } catch (e) {}
  },
  /* tick: devuelve true si el nado tomó el control (física propia) */
  tick: function (dt, input) {
    const P = Player;
    let zn = null;
    try { zn = (typeof waterZoneAt === 'function') ? waterZoneAt(P.pos.x, P.pos.z) : null; } catch (e) {}
    if (!zn) { if (this.under || this.oxy < this.MAX) { this.under = false; this._paintBar(); } return false; }
    const headY = P.pos.y + 1.5;
    if (P.pos.y >= zn.y || headY >= zn.y - 0.1) { // pies fuera o cabeza fuera: recarga aire, física normal
      this.under = false;
      this.oxy = this._oxygen(dt, true).oxy;
      this._paintBar();
      return false;
    }
    this.under = true;
    // --- sin gravedad: movimiento 3D con el joystick (relativo a la cámara) ---
    const ix = (input && input.x) || 0, iz = (input && input.z) || 0;
    const SPD = 4.2;
    if (Math.hypot(ix, iz) > 0.12 && P.knockCd <= 0) {
      const a = Math.atan2(ix, iz);
      const wx = Math.sin(P.camYaw - a), wz = Math.cos(P.camYaw - a);
      const k = 1 - Math.pow(0.0001, dt);
      P.vel.x = lerp(P.vel.x, wx * SPD, k);
      P.vel.z = lerp(P.vel.z, wz * SPD, k);
      P.heading = lerpAngle(P.heading, Math.atan2(P.vel.x, P.vel.z), 1 - Math.pow(0.0001, dt * 8));
    } else {
      const d = Math.pow(0.001, dt);
      P.vel.x *= d; P.vel.z *= d;
    }
    // --- vertical: salto = impulso arriba; inclinación de cámara guía ---
    let vy = -Math.sin(P.camPitch || 0) * SPD;
    if (P.jumpBuf > 0) { vy = 4.6; P.jumpBuf = 0; }
    P.vel.y = lerp(P.vel.y, vy, 1 - Math.pow(0.0001, dt * 6));
    P.grounded = false; P.groundPlat = null;
    moveAxis('x', P.vel.x * dt);
    moveAxis('z', P.vel.z * dt);
    moveAxis('y', P.vel.y * dt);
    // --- oxígeno: si se acaba, subida automática con aviso tierno ---
    const r = this._oxygen(dt, false);
    this.oxy = r.oxy;
    this._paintBar();
    if (r.rise) {
      P.pos.y = zn.y; P.vel.y = 6;
      try { toast('¡Respira! 😮‍💨'); } catch (e) {}
    }
    return true;
  },
};

/* 🕊️ Vuelo del Pase de Vuelo: física simple y sana (sin gravedad, con techo).
   Joystick = moverse · botón de salto = subir · botón ⬇️ = bajar. */
function flyTick(dt, input) {
  const P = Player;
  try {
    const SPD = 11;
    const ix = (input && input.x) || 0, iz = (input && input.z) || 0;
    if (Math.hypot(ix, iz) > 0.12) {
      const a = Math.atan2(ix, iz);
      const wx = Math.sin(P.camYaw - a), wz = Math.cos(P.camYaw - a);
      P.vel.x = lerp(P.vel.x, wx * SPD, 1 - Math.pow(0.0001, dt * 6));
      P.vel.z = lerp(P.vel.z, wz * SPD, 1 - Math.pow(0.0001, dt * 6));
      P.heading = lerpAngle(P.heading, Math.atan2(P.vel.x, P.vel.z), 1 - Math.pow(0.0001, dt * 8));
    } else {
      P.vel.x *= Math.pow(0.001, dt); P.vel.z *= Math.pow(0.001, dt);
    }
    P.jumpBuf = Math.max(0, (P.jumpBuf || 0) - dt);
    if (P.jumpBuf > 0) { P.vel.y = 7.5; P.jumpBuf = 0; }        // salto = subir
    else if (P.flyDown) { P.vel.y = -7.5; }                     // ⬇️ = bajar
    else { P.vel.y *= Math.pow(0.001, dt); }                    // planear
    P.grounded = false;
    moveAxis('x', P.vel.x * dt);
    moveAxis('z', P.vel.z * dt);
    moveAxis('y', P.vel.y * dt);
    if (P.pos.y < 0.6) { P.pos.y = 0.6; if (P.vel.y < 0) P.vel.y = 0; }
    if (P.pos.y > 60) { P.pos.y = 60; if (P.vel.y > 0) P.vel.y = 0; }
  } catch (e) {}
}

function updatePlayer(dt, input) {
  const P = Player;
  // FASE 2: en avión/carro/bici la física la lleva updateVehicle (vehicles.js)
  if (typeof Vehicle !== 'undefined' && Vehicle.mode !== 'none') { updateVehicle(dt, input); return; }
  // FASE 3: montado en el trineo (mundo 9)
  if (typeof Sled !== 'undefined' && Sled.riding) { Sled.tick(dt); return; }
  // 🪑🛏️ sentado o acostado: la física se pausa; joystick o salto levantan al jugador
  if (P.pose !== 'stand') {
    const inp = input && Math.hypot(input.x || 0, input.z || 0) > 0.12;
    if (inp || P.jumpBuf > 0) { P.standUp(); P.jumpBuf = 0; }
    else {
      P.vel.set(0, 0, 0);
      P.syncMesh(); // coloca al avatar en la pose de la silla/cama
      updateCamera(dt, 0);
      if (typeof updateFxHud === 'function') updateFxHud();
      return;
    }
  }
  // 🤖 AGENTE GEAYI: nado en zonas de agua (física propia, sin gravedad)
  if (typeof GeayiSwim !== 'undefined' && GeayiSwim.tick(dt, input)) {
    P.syncMesh(); updateCamera(dt, Math.hypot(P.vel.x, P.vel.z));
    if (typeof updateFxHud === 'function') updateFxHud();
    return;
  }
  // 🕊️ Pase de Vuelo: volar (sin gravedad; requiere el pase + botón 🕊️)
  if (typeof Shop2 !== 'undefined' && typeof Shop2.canFly === 'function' && Shop2.canFly() && P.flyMode) {
    flyTick(dt, input);
    P.syncMesh(); updateCamera(dt, Math.hypot(P.vel.x, P.vel.z));
    if (typeof updateFxHud === 'function') updateFxHud();
    return;
  }
  updateLevelDynamics(dt, true);
  if (typeof updatePhase3 === 'function') updatePhase3(dt); // FASE 3: power-ups, puzzles, retos

  // --- FASE 3: temporizadores de power-ups + punto seguro ---
  P.fx.doubleT = Math.max(0, P.fx.doubleT - dt);
  P.fx.speedT = Math.max(0, P.fx.speedT - dt);
  if (P.grounded) {
    P.doubleUsed = false;
    P.safeT = (P.safeT || 0) + dt;
    if (P.safeT > 0.5 && P.groundPlat && !P.groundPlat.doorBlock) {
      P.lastSafe = { x: P.pos.x, y: P.pos.y, z: P.pos.z }; P.safeT = 0;
    }
  } else P.safeT = 0;
  const SPD = SPEED * (P.fx.speedT > 0 ? 1.45 : 1) * ((typeof Powers !== 'undefined' && typeof Powers.speedMult === 'function') ? Powers.speedMult() : 1); // ⚡ velocidad (+ superpoder)

  // --- entrada -> velocidad horizontal (relativa a la cámara) ---
  const ix = input.x, iz = input.z;
  const hasInput = Math.hypot(ix, iz) > 0.12;
  const ctrl = P.grounded ? 1 : AIR_CTRL;
  if (hasInput && P.knockCd <= 0) {
    const a = Math.atan2(ix, iz); // dirección deseada en espacio de cámara
    const wx = Math.sin(P.camYaw - a), wz = Math.cos(P.camYaw - a);
    P.vel.x = lerp(P.vel.x, wx * SPD, 1 - Math.pow(0.0001, dt * ctrl));
    P.vel.z = lerp(P.vel.z, wz * SPD, 1 - Math.pow(0.0001, dt * ctrl));
    P.heading = lerpAngle(P.heading, Math.atan2(P.vel.x, P.vel.z), 1 - Math.pow(0.0001, dt * 8));
    // GEAYI cámara libre estilo Roblox: el jugador gira la cámara arrastrando;
    // ya NO se auto-alinea sola (antes causaba el bug del joystick "solo da vueltas").
  } else if (P.grounded) {
    P.vel.x *= Math.pow(0.0001, dt); P.vel.z *= Math.pow(0.0001, dt);
  }

  // --- salto (con coyote time y buffer) ---
  P.coyote = P.grounded ? 0.12 : Math.max(0, P.coyote - dt);
  P.jumpBuf = Math.max(0, P.jumpBuf - dt);
  if (P.jumpBuf > 0 && P.coyote > 0) {
    P.vel.y = JUMP_V * ((typeof Powers !== 'undefined' && typeof Powers.jumpMult === 'function') ? Powers.jumpMult() : 1); P.grounded = false; P.coyote = 0; P.jumpBuf = 0; // 🐸 salto potenciado
    Audio2.jump();
    Particles.burst(P.pos.x, P.pos.y + 0.1, P.pos.z, [0xffffff, 0x9be8ff], 8, 2.5);
  } else if (P.jumpBuf > 0 && !P.grounded && P.fx.doubleT > 0 && !P.doubleUsed) {
    // 🌀 doble salto (power-up, 30 s): un salto extra en el aire
    P.vel.y = JUMP_V; P.doubleUsed = true; P.jumpBuf = 0;
    Audio2.jump();
    Particles.burst(P.pos.x, P.pos.y + 0.1, P.pos.z, [0x00e5ff, 0xffffff], 12, 3.5);
  }

  // --- gravedad ---
  P.vel.y -= GRAV * dt;
  if (P.vel.y < -26) P.vel.y = -26;

  // --- llevar con la plataforma móvil donde está parado ---
  if (P.groundPlat && P.groundPlat.move && P.groundPlat.solid) {
    P.pos.x += P.groundPlat.dx; P.pos.z += P.groundPlat.dz;
  }

  // --- integrar y colisionar por ejes ---
  const wasGrounded = P.grounded, fallV = P.vel.y;
  P.grounded = false;
  const prevGround = P.groundPlat; P.groundPlat = null;

  moveAxis('x', P.vel.x * dt);
  moveAxis('z', P.vel.z * dt);
  moveAxis('y', P.vel.y * dt);

  if (!wasGrounded && P.grounded) { // aterrizaje
    Audio2.land();
    Particles.burst(P.pos.x, P.pos.y + 0.08, P.pos.z, [0xffffff, 0xcccccc], 7, 2);
    if (P.groundPlat && P.groundPlat.kind === 'pad') {
      P.vel.y = P.groundPlat.pad.power; P.grounded = false;
      Audio2.pad(); screenShake(0.15, 0.2);
      Particles.burst(P.pos.x, P.pos.y + 0.3, P.pos.z, [0x59ff7a, 0xffffff], 16, 5);
    }
    if (P.groundPlat && P.groundPlat.kind === 'ghost' && P.groundPlat.ghostState === 'solid') {
      P.groundPlat.ghostState = 'fading'; P.groundPlat.ghostT = P.groundPlat.ghost.stay;
    }
  }
  // pararse sobre ghost que se está desvaneciendo también lo activa
  if (P.grounded && P.groundPlat && P.groundPlat.kind === 'ghost' && P.groundPlat.ghostState === 'solid') {
    P.groundPlat.ghostState = 'fading'; P.groundPlat.ghostT = P.groundPlat.ghost.stay;
  }

  levelTriggers(dt);
  if (typeof updateChute === 'function') updateChute(dt); // FASE 2: paracaídas

  // --- partículas ambiente del tema ---
  if (LEVEL.ambient) {
    LEVEL.ambAcc += dt;
    const a = LEVEL.ambient;
    if (LEVEL.ambAcc > 1 / a.rate) {
      LEVEL.ambAcc = 0;
      Particles.spawn(P.pos.x + (Math.random() - 0.5) * a.area, P.pos.y + Math.random() * 12 - 2, P.pos.z + (Math.random() - 0.5) * a.area,
        { n: 1, colors: a.colors, speed: 0.6, up: a.up, life: 2.4, size: a.size, grav: 0.4 });
    }
  }
  if (LEVEL.lavaTex) { LEVEL.lavaTex.offset.x += dt * 0.03; LEVEL.lavaTex.offset.y += dt * 0.015; }
  for (const r of LEVEL.decoSpinners || []) r.rotation.z += (r.userData.spin || 0.5) * dt;

  // --- animación, estela y cámara ---
  const hSpeed = Math.hypot(P.vel.x, P.vel.z);
  Avatar.animate(dt, hSpeed, P.grounded);
  if (Avatar.group) Avatar.group.scale.setScalar(Avatar.group.userData.baseScale || 1); // restaura tamaño al bajarse
  emitTrail(dt, hSpeed);
  P.groundY = P.grounded && P.groundPlat ? P.groundPlat.topY : (P.pos.y < 0 ? -13 : P.pos.y - 0.1);
  P.syncMesh();
  updateCamera(dt, hSpeed);
  $('speedlines').style.opacity = clamp((hSpeed - 7) / 7, 0, 0.85);
  if (typeof updateFxHud === 'function') updateFxHud(); // FASE 3: chips de power-ups
}

function moveAxis(axis, delta) {
  const P = Player;
  if (delta === 0) return;
  P.pos[axis] += delta;
  for (const p of LEVEL.platforms) {
    if (!p.solid) continue;
    const hw = p.w / 2, hd = p.d / 2;
    const minX = p.x - hw, maxX = p.x + hw, minZ = p.z - hd, maxZ = p.z + hd;
    const top = p.topY, bot = p.topY - p.h;
    const px0 = P.pos.x - P_HALF.x, px1 = P.pos.x + P_HALF.x;
    const pz0 = P.pos.z - P_HALF.z, pz1 = P.pos.z + P_HALF.z;
    let py0 = P.pos.y, py1 = P.pos.y + P_HALF.y * 2;
    if (px1 > minX && px0 < maxX && pz1 > minZ && pz0 < maxZ && py1 > bot && py0 < top) {
      if (axis === 'y') {
        if (delta < 0) { P.pos.y = top; P.vel.y = 0; P.grounded = true; P.groundPlat = p; }
        else { P.pos.y = bot - P_HALF.y * 2; P.vel.y = Math.min(P.vel.y, 0); }
      } else {
        // 🧱 auto-escalón: aceras y bordillos bajos (≤0.45) se suben caminando, sin saltar
        const STEP_H = 0.45;
        let stepped = false;
        if (top > P.pos.y && top - P.pos.y <= STEP_H) {
          let free = true; // ¿hay espacio libre para la cabeza sobre el escalón?
          for (const q of LEVEL.platforms) {
            if (q === p || !q.solid) continue;
            const qhw = q.w / 2, qhd = q.d / 2;
            if (px1 > q.x - qhw && px0 < q.x + qhw && pz1 > q.z - qhd && pz0 < q.z + qhd) {
              const qTop = q.topY, qBot = q.topY - q.h;
              if (top + P_HALF.y * 2 > qBot && top < qTop) { free = false; break; }
            }
          }
          if (free) {
            P.pos.y = top; P.grounded = true; P.groundPlat = p;
            py0 = top; py1 = top + P_HALF.y * 2;
            stepped = true;
          }
        }
        if (!stepped) {
          if (axis === 'x') {
            P.pos.x = delta > 0 ? minX - P_HALF.x : maxX + P_HALF.x;
            P.vel.x = 0;
          } else {
            P.pos.z = delta > 0 ? minZ - P_HALF.z : maxZ + P_HALF.z;
            P.vel.z = 0;
          }
        }
      }
    }
  }
}

function lerpAngle(a, b, t) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return a + d * t;
}

/* Cámara libre estilo Roblox: órbita 360° con arrastre + zoom con pellizco.
   Anti-obstrucción: si una pared/techo se interpone, la cámara se acerca sola. */
const _camRC = new THREE.Raycaster();
const _camHead = new THREE.Vector3(), _camDir = new THREE.Vector3();
const _cutRC = new THREE.Raycaster(), _cutDir = new THREE.Vector3(); // recorte de paredes/techos
let _hiddenCeil = null; // techo oculto mientras la cámara está adentro
function updateCamera(dt, hSpeed) {
  const P = Player;
  // 🏠 ¿está el jugador dentro de una tienda/casa? → la cámara entra con él
  let indoorZone = null;
  try {
    if (typeof INTERIORS !== 'undefined' && INTERIORS.length) {
      for (const zn of INTERIORS) {
        const dx = P.pos.x - zn.cx, dz = P.pos.z - zn.cz;
        const c0 = Math.cos(-zn.ry), s0 = Math.sin(-zn.ry);
        const lx = dx * c0 - dz * s0, lz = dx * s0 + dz * c0;
        if (Math.abs(lx) < zn.hw && Math.abs(lz) < zn.hd) { indoorZone = zn; break; }
      }
    }
  } catch (e) {}
  P.indoors = indoorZone || null;
  const dist = indoorZone ? Math.min(P.camDist || 8.5, 4.6) : (P.camDist || 8.5);
  const pitch = (P.camPitch != null ? P.camPitch : 0.34);
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  const lookY = P.pos.y + (P.pose === 'lie' ? 0.9 : (indoorZone ? 0.95 : 1.6)); // 🏠 adentro mira al centro del cuerpo para que se vean los pies
  _camHead.set(P.pos.x, lookY, P.pos.z);
  _camDir.set(-Math.sin(P.camYaw) * cp, sp, -Math.cos(P.camYaw) * cp);
  let useDist = dist;
  try {
    if (LEVEL && LEVEL.group) {
      _camRC.set(_camHead, _camDir);
      _camRC.far = dist;
      const hits = _camRC.intersectObjects(LEVEL.group.children, true);
      for (const h of hits) {
        if (h.object.visible === false) continue; // lo oculto por recorte no frena la cámara
        let o = h.object, isPlayer = false;
        while (o) { if (o === P.group) { isPlayer = true; break; } o = o.parent; }
        if (isPlayer) continue;
        useDist = Math.max(1.8, h.distance - 0.5);
        break;
      }
    }
  } catch (e) { useDist = dist; }
  const tx = _camHead.x + _camDir.x * useDist;
  const ty = _camHead.y + _camDir.y * useDist;
  const tz = _camHead.z + _camDir.z * useDist;
  // ✂️ recorte: oculta paredes/techos entre el jugador y la cámara para verlo siempre adentro
  try {
    if (typeof CUTAWAY !== 'undefined' && CUTAWAY.length) {
      _cutDir.set(tx - _camHead.x, ty - _camHead.y, tz - _camHead.z);
      const cd = _cutDir.length();
      let hitSet = null;
      if (cd > 0.01) {
        _cutDir.multiplyScalar(1 / cd);
        _cutRC.set(_camHead, _cutDir); _cutRC.far = cd + 0.5;
        const vis = CUTAWAY.filter(m => m.visible);
        hitSet = new Set(_cutRC.intersectObjects(vis, false).map(h => h.object));
      }
      for (const m of CUTAWAY) {
        const hide = hitSet ? hitSet.has(m) : false;
        if (hide && m.visible) m.visible = false;
        else if (!hide && !m.visible) m.visible = true;
      }
    }
  } catch (e) {}
  const k = 1 - Math.pow(0.0001, dt);
  let ctx = tx, cty = ty, ctz = tz;
  // 🏠 techo: se oculta solo el del cuarto donde está el jugador (vista de casita)
  try {
    let want = null;
    if (indoorZone && typeof CEILINGS !== 'undefined') {
      for (const cc of CEILINGS) if (cc.zone === indoorZone) { want = cc.m; break; }
    }
    if (_hiddenCeil && _hiddenCeil !== want) { _hiddenCeil.visible = true; _hiddenCeil = null; }
    if (want && want.visible) { want.visible = false; _hiddenCeil = want; }
  } catch (e) {}
  if (indoorZone) {
    // la cámara no atraviesa las paredes: se queda dentro del cuarto
    const c0 = Math.cos(-indoorZone.ry), s0 = Math.sin(-indoorZone.ry);
    let lx = (ctx - indoorZone.cx) * c0 - (ctz - indoorZone.cz) * s0;
    let lz = (ctx - indoorZone.cx) * s0 + (ctz - indoorZone.cz) * c0;
    lx = clamp(lx, -(indoorZone.hw - 0.6), indoorZone.hw - 0.6);
    lz = clamp(lz, -(indoorZone.hd - 0.6), indoorZone.hd - 0.6);
    const c1 = Math.cos(indoorZone.ry), s1 = Math.sin(indoorZone.ry);
    ctx = indoorZone.cx + lx * c1 - lz * s1;
    ctz = indoorZone.cz + lx * s1 + lz * c1;
    cty = clamp(cty, 1.1, indoorZone.h - 0.7);
  }
  camera.position.x = lerp(camera.position.x, ctx, k);
  camera.position.y = lerp(camera.position.y, cty, k);
  camera.position.z = lerp(camera.position.z, ctz, k);
  if (shakeT > 0) {
    shakeT -= dt;
    camera.position.x += (Math.random() - 0.5) * shakeMag;
    camera.position.y += (Math.random() - 0.5) * shakeMag;
    if (shakeT <= 0) shakeMag = 0;
  }
  camera.lookAt(P.pos.x, lookY, P.pos.z);
  // FOV dinámico con la velocidad
  const targetFov = 62 + clamp((hSpeed - SPEED) / 10, 0, 1) * 10;
  camera.fov = lerp(camera.fov, targetFov, dt * 4);
  camera.updateProjectionMatrix();
}

let toastTimer = null;
function toast(msg) {
  if (typeof notifsOn === 'function' && !notifsOn()) return; // 🔔 avisos apagados
  const el = $('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 1800);
}

/* ============ BANNER DE EVENTO (anuncios grandes estilo GEAYI) ============ */
let bannerTimer = null, bannerSeq = 0;
function showBanner(title, sub, ms) {
  if (typeof notifsOn === 'function' && !notifsOn()) return; // 🔔 avisos apagados
  const b = $('banner'); if (!b) return;
  const seq = ++bannerSeq;
  $('banner-title').textContent = title || '';
  $('banner-sub').textContent = sub || '';
  b.classList.remove('hidden', 'hide');
  void b.offsetWidth; // reiniciar animación
  b.classList.add('show');
  if (bannerTimer) clearTimeout(bannerTimer);
  // El temporizador arranca tras pintar 2 cuadros: el banner siempre se ve
  // aunque el primer render del nivel bloquee el hilo unos segundos.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (seq !== bannerSeq) return;
    bannerTimer = setTimeout(() => {
      b.classList.remove('show'); b.classList.add('hide');
      setTimeout(() => b.classList.add('hidden'), 320);
    }, ms || 2600);
  }));
}

/* FASE 3: chips de power-ups activos en el HUD */
function updateFxHud() {
  const box = $('hud-fx');
  if (!box) return;
  let html = '';
  const P = (typeof Player !== 'undefined') ? Player : null;
  if (P && P.fx) {
    if (P.fx.doubleT > 0) html += '<span class="hud-chip fx">🌀 ' + Math.ceil(P.fx.doubleT) + 's</span>';
    if (P.fx.shield) html += '<span class="hud-chip fx">🛡️</span>';
    if (P.fx.speedT > 0) html += '<span class="hud-chip fx">⚡ ' + Math.ceil(P.fx.speedT) + 's</span>';
  }
  if (typeof Powers !== 'undefined' && typeof Powers.hudChips === 'function') { try { html += Powers.hudChips(); } catch (e) {} } // ⚡ chips de superpoderes
  if (P && P.flyMode) html += '<span class="hud-chip fx">🕊️</span>'; // volando
  try { if (typeof Shop2 !== 'undefined' && typeof Shop2.refreshFlyBtns === 'function') Shop2.refreshFlyBtns(); } catch (e) {} // 🕊️ botones de vuelo
  if (box._html !== html) { box.innerHTML = html; box._html = html; }
}
